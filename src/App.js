import React, { Component } from 'react';
import './App.css';
import {arraysEqual, setsEqual, reversed, iterMapSorted, enumerate} from './utils';
import {filterCompiler, parseExpr} from './filter';
import {Checkbox, TextInput, Select, SelectMultiple} from './form';

const TASK_INDEX_BASE = "https://index.taskcluster.net/v1/task";
const TASK_QUEUE_BASE = "https://queue.taskcluster.net/v1/task";

const WPT_FYI_BASE = "https://wpt.fyi";

const passStatuses = new Set(["PASS", "OK"]);

const browsers = ["chrome", "firefox", "safari"];

const LOADING_STATE = Object.freeze({
    NONE: 0,
    LOADING: 1,
    COMPLETE: 2
});

function makeWptFyiUrl(path, params={}) {
    let url = new URL(`${WPT_FYI_BASE}/${path}`);
    let defaults = [["label", "master"],
                    ["product", "chrome[experimental]"],
                    ["product", "firefox[experimental]"],
                    ["product", "safari[experimental]"]];
    params = new Map(Object.entries(params));
    for (let [key, value] of defaults) {
        if (!params.has(key)) {
            url.searchParams.append(key, value);
        }
    }
    for (let [key, value] of params) {
        if (value === null || value === undefined) {
            continue;
        }
        if (Array.isArray(value)) {
            value.forEach(x => url.searchParams.append(key, x));
        } else {
            url.searchParams.append(key, value);
        }
    }
    return url;
}

function capitalize(str) {
    return str && str[0].toUpperCase() + str.slice(1);
}

class FetchError extends Error {
    constructor(resp, message=null) {
        if (!message) {
            message = `Fetch for ${resp.url} returned status ${resp.status} ${resp.statusText}`;
        }
        super(message);
        this.resp = resp;
        this.name = "FetchError";
    }
}

async function fetchJson(url, options) {
    let resp = await fetch(url, options);
    if (!resp.ok) {
        throw new FetchError(resp);
    }
    return await resp.json();
}

class UrlParams {
    constructor() {
        this.url = new URL(window.location);
        this.params = this.url.searchParams;
    }

    _update() {
        window.history.replaceState({}, document.title, this.url.href);
    }

    get(name) {
        return this.params.get(name);
    }

    has(name) {
        return this.params.has(name);
    }

    set(name, value) {
        this.params.set(name, value);
        this._update();
    }

    delete(name) {
        this.params.delete(name);
        this._update();
    }

    append(name, value) {
        this.params.append(name, value);
        this._update();
    }
}

const anyRe = /^(.*\.any)(:?\..*)\.html$/;
const workerRe = /^(.*\.(:?worker|window))\.html$/;

function testToPath(test) {
    let url = new URL(`https://web-platform.test${test}`);
    let path = url.pathname;
    let match = anyRe.exec(path);
    if (match === null) {
        match = workerRe.exec(path);
    }
    if (match !== null) {
        path = match[1] + '.js';
    }
    return path;
}

const urlParams = new UrlParams();

let makeError = (() => {
    let id = -1;
    return (err, options) => {
        id++;
        return {id, err, options};
    };
})();

class App extends Component {
    constructor(props) {
        super(props);
        this.state = {
            bugComponents: [],
            bugComponentsMap: new Map(),
            currentBugComponent: null,
            selectedPaths: new Set(),
            runSha: null,
            wptRuns: null,
            geckoMetadata: {},
            geckoMetadataForPaths: {},
            errors: [],
            loading_state: LOADING_STATE.NONE,
            filter: null,
            filterFunc: null,
        };
    }

    onError = (err, options={}) => {
        let error = makeError(err, options);
        this.setState(state => {return {errors: state.errors.concat(error)};});
    }

    onDismissError = (id) => {
        let errors = Array.from(this.state.errors);
        let idx = errors.findIndex(x => x.id === id);
        if (idx === undefined) {
            return;
        }
        errors.splice(idx, 1);
        this.setState({errors});
    }

    onFilterChange = (filterFunc) => {
        this.setState({filterFunc});
    }

    onRunChange = (runSha) => {
        this.setState({runSha});
    }

    async fetchData(url, retry, options={}) {
        if (!options.hasOwnProperty("redirect")) {
            options.redirect = "follow";
        }
        try {
            return await fetchJson(url, options);
        } catch(e) {
            this.onError(e, {retry});
            throw e;
        }
    }

    async loadTaskClusterData(indexName, artifactName) {
        let retry = async () => await this.loadTaskClusterData(indexName, artifactName);
        let taskData = await this.fetchData(`${TASK_INDEX_BASE}/${indexName}`,
                                            retry);
        let taskId = taskData.taskId;
        let taskStatus = await this.fetchData(`${TASK_QUEUE_BASE}/${taskId}/status`,
                                              retry);
        let runId;
        for (let run of reversed(taskStatus.status.runs)) {
            if (run.state === "completed") {
                runId = run.runId;
                break;
            }
        }
        let artifacts = await this.fetchData(`${TASK_QUEUE_BASE}/${taskId}/runs/${runId}/artifacts`,
                                             retry);
        let artifactData = artifacts.artifacts.find(artifact => artifact.name.endsWith(artifactName));
        return this.fetchData(`${TASK_QUEUE_BASE}/${taskId}/runs/${runId}/artifacts/${artifactData.name}`,
                              retry);
    }

    async loadBugComponentData() {
        // TODO - Error handling
        let componentData = await this.loadTaskClusterData("gecko.v2.mozilla-central.latest.source.source-bugzilla-info",
                                                           "components-normalized.json");

        let [components, componentsMap] = this.processComponentData(componentData);
        components = Array.from(components).sort();
        components.push("Any");

        this.setState({
            "bugComponentsMap": componentsMap,
            "bugComponents": components
        });

        //TODO set paths from URL

        let currentBugComponent = this.state.currentBugComponent;

        if (!currentBugComponent && urlParams.has("bugComponent")) {
            let bugComponent = urlParams.get("bugComponent");
            if (componentsMap.has(bugComponent)) {
                currentBugComponent = bugComponent;
            }
        }
        if (!currentBugComponent) {
            currentBugComponent = components[0].toLowerCase();
        }

        let selectedPaths = new Set(componentsMap.get(currentBugComponent));
        if (urlParams.has("paths")) {
            let urlPaths = new Set(urlParams.get("paths").split(","));
            selectedPaths = new Set(Array.from(selectedPaths).filter(x => urlPaths.has(x)));
        }
        this.setState({selectedPaths, currentBugComponent});
    }

    async loadWptRunData() {
        let params = {aligned: ""};
        if (this.state.runSha) {
            params["sha"] = this.state.runSha;
        }
        let runsUrl = makeWptFyiUrl("api/runs", params);
        let runs = await this.fetchData(runsUrl, async () => this.loadWptRunData());
        let runSha = runs[0].full_revision_hash;
        this.setState({wptRuns: runs, runSha});
    }

    async loadGeckoMetadata() {
//        let metadata = await this.loadTaskClusterData("index.gecko.v2.try.latest.source.source-wpt-metadata-summary",
//                                                      "summary.json");
        let metadata = await this.fetchData(`https://queue.taskcluster.net/v1/task/YtpxIfHTR5CKgd4EfpkAQg/runs/0/artifacts/public/summary.json`,
                                            async () => this.loadGeckoMetadata());
        this.setState({geckoMetadata: metadata});
    }

    async componentDidMount() {
        this.setState({loading_state: LOADING_STATE.LOADING});
        let bugComponentPromise = this.loadBugComponentData();
        let wptRunDataPromise = this.loadWptRunData();
        let geckoMetadataPromise = this.loadGeckoMetadata();

        await Promise.all([bugComponentPromise, wptRunDataPromise, geckoMetadataPromise]);
        this.setState({loading_state: LOADING_STATE.COMPLETE});
    }

    filterGeckoMetadata() {
        if (!this.state.selectedPaths.size || !Object.keys(this.state.geckoMetadata).length) {
            return;
        }
        function makeRe(pathPrefixes) {
            if (!pathPrefixes.length) {
                return null;
            }
            return new RegExp(`^(?:${pathPrefixes.join("|")})(?:$|/)`);
        }
        let pathRe = makeRe(Array.from(this.state.selectedPaths).map(x => x.slice(1)));

        let notPaths = [];
        for (let path of this.state.bugComponentsMap.values()) {
            if (!this.state.selectedPaths.has(path) &&
                pathRe.test(path.slice(1))) {
                notPaths.push(path);
            }
        }
        let notPathRe = makeRe(notPaths);
        let data = {};
        let allMetadata = this.state.geckoMetadata;
        for (let key of Object.keys(allMetadata)) {
            if (pathRe.test(key) && (notPathRe === null || !notPathRe.test(key))) {
                data[key] = allMetadata[key];
            }
        }

        this.setState({pathMetadata: data});
    }

    processComponentData(componentData) {
        let componentsMap = componentData.components;
        let paths = componentData.paths;
        let pathToComponent = new Map();
        let componentToPath = new Map();
        let wptRoot = "testing/web-platform/tests";
        let stack = [[wptRoot, paths.testing["web-platform"].tests]];
        let pathTrimRe = /(.*)\/[^/]*$/;
        let components = [];

        componentToPath.set("any", []);

        while (stack.length) {
            let [basePath, obj] = stack.pop();
            let found = false;
            for (let filename of Object.keys(obj)) {
                let value = obj[filename];
                if (typeof value === "object") {
                    let path = `${basePath}/${filename}`;
                    stack.push([path, value]);
                } else {
                    if (found || basePath === wptRoot) {
                        continue;
                    }
                    let path = basePath;
                    let component = componentsMap[value].join("::");
                    let canonicalComponent = component.toLowerCase();
                    while (path !== wptRoot) {
                        if (pathToComponent.has(path) && pathToComponent.get(path) === canonicalComponent) {
                            found = true;
                            break;
                        }
                        path = pathTrimRe.exec(path)[1];
                    }
                    if (!found) {
                        pathToComponent.set(basePath, canonicalComponent);
                        if (!componentToPath.has(canonicalComponent)) {
                            componentToPath.set(canonicalComponent, []);
                            components.push(component);
                        };
                        let relPath = basePath.slice(wptRoot.length);
                        componentToPath.get(canonicalComponent).push(relPath);
                        componentToPath.get("any").push(relPath);
                        found = true;
                    }
                }
            }
        }
        return [components, componentToPath];
    }

    onComponentChange = (component) => {
        let canonicalComponent = component.toLowerCase();
        let selectedPaths = new Set(this.state.bugComponentsMap.get(canonicalComponent));
        urlParams.set("bugComponent", component);
        urlParams.delete("paths");
        this.setState({currentBugComponent: canonicalComponent, selectedPaths});
    }

    onPathsChange = (selectedPaths) => {
        let pathsArray = Array.from(selectedPaths);
        pathsArray.sort();
        if (!arraysEqual(pathsArray, this.state.bugComponentsMap.get(this.state.currentBugComponent))) {
            urlParams.set("paths", pathsArray.join(","));
        } else {
            urlParams.delete("paths");
        }
        this.setState({selectedPaths});
    }

    async componentDidUpdate(prevProps, prevState) {
        if (prevState.geckoMetadata !== this.state.geckoMetadata ||
            !arraysEqual(prevState.selectedPaths, this.state.selectedPaths)) {
            this.filterGeckoMetadata();
        }
        if (prevState.runSha !== this.state.runSha) {
            this.setState({loading_state: LOADING_STATE.LOADING});
            await this.loadWptRunData();
            this.setState({loading_state: LOADING_STATE.COMPLETE});
        }
    }

    render() {
        let paths = this.state.bugComponentsMap.get(this.state.currentBugComponent);
        let body = [];
        if (this.state.runSha) {
            body.push(<section id="selector" key="selector">
                        <RunInfo runSha={this.state.runSha}
                                   onChange={this.onRunChange} />
                        <BugComponentSelector onComponentChange={this.onComponentChange}
                                              components={this.state.bugComponents}
                                              value={this.state.currentBugComponent} />
                          <Filter onChange={this.onFilterChange} />
                          <TestPaths
                            paths={paths}
                            selectedPaths={this.state.selectedPaths}
                            onChange={this.onPathsChange} />
                        </section>);
        }
        if (this.state.loading_state !== LOADING_STATE.COMPLETE) {
            body.push(<section id="details" key="details">
                        <p>Loading…</p>
                      </section>);
        } else {
            body.push(
                <section id="details" key="details">
                  <Tabs>
                    <ResultsView label="Interop Comparison"
                                 runs={this.state.wptRuns}
                                 paths={Array.from(this.state.selectedPaths)}
                                 geckoMetadata={this.state.pathMetadata}
                                 onError={this.onError}
                                 filter={this.state.filterFunc}>
                      <h2>Interop Comparison</h2>
                    </ResultsView>
                    <GeckoData label="Gecko Data"
                               data={this.state.pathMetadata}
                               paths={Array.from(this.state.selectedPaths)}
                               onError={this.onError}>
                      <h2>Gecko metadata</h2>
                      <p>Gecko metadata in <code>testing/web-platform/meta</code> taken from latest mozilla-central.</p>
                      <p>Note: this data is currently not kept up to date</p>
                    </GeckoData>
                  </Tabs>
                </section>);
        }
        return (
            <div id="app">
              <ErrorArea errors={this.state.errors}
                         onDismissError={this.onDismissError}/>
              <header>
                <h1>wpt interop dashboard</h1>
              </header>
              {body}
            </div>
        );
    }
}

class ErrorArea extends Component {
    onDismiss = (id) => {
        this.props.onDismissError(id);
    }

    render() {
        if (!this.props.errors.length) {
            return null;
        }
        let errorLines = [];
        for (let [idx, error] of enumerate(this.props.errors)) {
            errorLines.push(<ErrorLine
                              key={`error-${error.id}`}
                              error={error}
                              onDismiss={() => this.onDismiss(idx)}/>);
        }
        return (<ul className="errors">
                  {errorLines}
                </ul>);
    }
}

class ErrorLine extends Component {
    render() {
        let {id, err, options} = this.props.error;
        let extraControls = [];
        if (options.retry) {
            let retry = () => {
                this.props.onDismiss(id);
                options.retry();
            };
            extraControls.push(<button onClick={retry} key="retry">Retry</button>);
        }
        return (<li>
                  {err.message || "Unknown Error"}
                  <button onClick={() => this.props.onDismiss(id)}>Close</button>
                  {extraControls}
                </li>);
    }
}

class RunInfo extends Component {
    constructor(props) {
        super(props);
        this.state = {
            editable: false,
            newSha: null,
            runShas: []
        };
    }

    onInputChange = (value) => {
        this.setState({newSha: value});
    }

    onEditClick = () => {
        this.setState({editable: true});
    }

    onUpdateClick = () => {
        this.props.onChange(this.state.newSha);
        this.setState({editable: false});
    }

    async componentDidMount() {
        let url = makeWptFyiUrl("/api/runs", {"max-count": "100"});
        let runs = await fetchJson(url);
        let browserRuns = new Map();
        for (let run of runs) {
            if (!browserRuns.has(run.revision)) {
                browserRuns.set(run.revision, new Set());
            }
            browserRuns.get(run.revision).add(run.browser_name);
        }
        let runShas = [];
        for (let run of runs) {
            if (browserRuns.has(run.revision) && browserRuns.get(run.revision).size === 3) {
                runShas.push(run.revision);
            }
            browserRuns.delete(run.revision);
        }
        this.setState({runShas});
    }

    render() {
        if (!this.props.runSha && !this.state.editable) {
            return null;
        }
        let url = makeWptFyiUrl("", {sha: this.props.runSha});
        return (<dl>
                  <dt>wpt SHA1:</dt>
                  {this.state.editable ?
                   (<dd>
                      {this.state.runShas ?
                       (<datalist id="runShasData">
                          {this.state.runShas.map(x => <option key={x} value={x}/>)}
                        </datalist>) : null}
                      <TextInput defaultValue={this.props.runSha}
                                 onChange={this.onInputChange}
                                 list="runShasData"/>
                       <button onClick={this.onUpdateClick}>
                         Update
                       </button>
                    </dd>):
                    (<dd>
                       <a href={url}>{this.props.runSha.slice(0,12)}</a>
                       <button onClick={this.onEditClick}>
                         Edit
                       </button>
                     </dd>)}
        </dl>);
    }
}

class BugComponentSelector extends Component {
    handleChange = (value) => {
        this.props.onComponentChange(value);
    }

    render() {
        let options = this.props.components.map(component => {
            return {value:component.toLowerCase(), name:component};
        });
        if (!this.props.value) {
            return null;
        }
        return (<section>
                  <label>Bug Component: </label>
                  <Select
                    onChange={this.handleChange}
                    value={this.props.value}
                    options={options}/>
                </section>);
    }
}

class Filter extends Component {
    types = new Map(Object.entries({none: {name: "None", filter: null},
                                    untriaged: {name: "Untriaged", filter: "not has _geckoMetadata.bug"},
                                    triaged: {name: "Triaged", filter: "has _geckoMetadata.bug"},
                                    custom: {name: "Custom…", filter: null}}));

    constructor(props) {
        super(props);
        let [type, expr] = this.getType();
        this.state = {type, expr};
        this.afterFilterUpdate();
    }

    componentDidUpdate(prevProps, prevState) {
        if (prevState.type !== this.state.type ||
            prevState.expr !== this.state.expr) {
            this.afterFilterUpdate();
        }
    }

    getType() {
        // TODO: Maybe this should be in the parent
        let [type, expr] = ["none", null];
        let urlValue = urlParams.get("filter");
        if (urlValue) {
            let parts = urlValue.split(":");
            type = parts[0];
            expr = parts.slice(1).join(":");
        }
        if (!this.types.has(type)) {
            type = "none";
            expr = null;
        }
        if (type !== "custom") {
            expr = this.types.get(type).filter;
        }
        return [type, expr];
    }

    onTypeChange = (type) => {
        if (!this.types.has(type)) {
            return;
        }
        this.setState({type: type});
        let expr;
        if (type === "custom") {
            expr = this.state.expr;
        } else {
            expr = this.types.get(type).filter;
        }
        if (expr) {
            this.props.onChange(filterCompiler(parseExpr(expr)));
        }
    }

    onExprChange = (expr) => {
        let ast;
        clearTimeout(this.timer);
        try {
            ast = expr ? parseExpr(expr) : null;
        } catch (e) {
            this.timer = setTimeout(() => {
                //TODO: Add UI errors for things that won't compile
                console.log(e);
            }, 1000);
            return;
        }
        this.timer = setTimeout(() => {
            let filter;
            try {
                filter = ast ? filterCompiler(ast) : null;
            } catch(e) {
                console.error(e);
                return;
            }
            this.props.onChange(filter);
            this.setState({expr});
        }, 1000);
    }

    afterFilterUpdate() {
        let type = this.state.type;
        if (type === "none") {
            urlParams.delete("filter");
        } else if(type === "custom") {
            let expr = this.state.expr;
            urlParams.set("filter", `custom:${expr}`);
        } else {
            urlParams.set("filter", type);
        }
    }

    render() {
        let triageText = <p className="note">
                           Triaged status is currently derived from a bug: annotation in
the gecko metadata on the test file (not on subtests). In the future this will change to
include external annotations accessible to wpt.fyi.
                         </p>;
        let optionText = {
            "triaged": triageText,
            "untriaged": triageText,
            "custom": (<div className="note">
                         <p>
                           Custom filters are boolean expressions with logical operators
                           &nbsp;<code>and</code>, <code>or</code>, and <code>not</code>`,
                           equality operators <code>{"=="}</code>, and <code>!=</code>
                           and custom operators <code>in</code> for text substrings
                           and <code>has</code> for testing if a field exists.
                         </p>
                         <p>
                           Available fields are <code>test</code> for the test title and
                           <code>_geckoMetadata</code> for fields set from gecko metadata
                           Gecko metadata fields include <code>bug</code> and
                           <code>lsan-allowed</code>
                         </p>
                         <p>
                           The <code>:</code> operator performs a default operation depending
                           on the selected field</p>
                         <p>
                           Examples:
                         </p>
                         <ul>
                           <li><code>historical in test</code> - The test name contains
                             the substring "historical"</li>
                           <li><code>test:historical</code> - The test name contains
                             the substring "historical"</li>
                           <li><code>not has _geckoMetadata.bug</code> - Gecko metadata doesn't
                             specify a bug field for the test</li>
                           <li><code>not has _geckoMetadata.bug</code> - Gecko metadata doesn't
                             specify a bug field for the test</li>
                         </ul>
                        </div>)
        };
        let options = Array.from(this.types).map(([value, {name}]) => ({value, name}));
        return (<section>
                  <label>Filter:</label>
                  <Select options={options}
                          value={this.state.type}
                          onChange={this.onTypeChange}/>
                  {this.state.type === "custom" ? <TextInput onChange={this.onExprChange}
                                                             defaultValue={this.state.expr}/> : null}
                  {optionText.hasOwnProperty(this.state.type) ?
                   optionText[this.state.type] : null}
                </section>);
    }
}

class TestPaths extends Component {
    constructor(props) {
        super(props);
        this.state = {
            paths: new Set(this.props.paths)
        };
    }

    onCheckboxChange = (path, checked) => {
        let paths = new Set(this.state.paths);
        if (checked) {
            paths.add(path);
        } else {
            paths.delete(path);
        }
        this.setState({paths});
    }

    onUpdateClick = () => {
        this.props.onChange(this.state.paths);
    }

    componentDidUpdate(prevProps) {
        if (prevProps.selectedPaths !== this.props.selectedPaths) {
            this.setState({paths: new Set(this.props.selectedPaths)});
        }
    }

    render() {
        if (!this.props.paths) {
            return null;
        }
        let listItems = this.props.paths.sort().map(path => (
            <li key={path}>
              <Checkbox
                checked={this.props.selectedPaths.has(path)}
                value={path}
                onCheckboxChange={this.onCheckboxChange} />
              {path}
            </li>));
        return (<section>
                  <h2>Test Paths</h2>
                  <button
                    onClick={this.onUpdateClick}
                    disabled={setsEqual(this.state.paths, this.props.selectedPaths)}>
                    Update
                  </button>
                  <ul id="test-paths">
                    {listItems}
                  </ul>
                </section>);
    }
}


class ResultsView extends Component {
    constructor(props) {
        super(props);
        this.defaultBrowsers = {
            failsIn: ["firefox"],
            passesIn: ["chrome", "safari"]
        };
        let comparison = this.getComparison();
        this.state = {
            loading_state: LOADING_STATE.NONE,
            results: [],
            filter: null,
            filteredResults: null,
            passesIn: comparison.passesIn,
            failsIn: comparison.failsIn,
        };
    }

    getComparison() {
        let rv = {};
        for (let [key, value] of Object.entries(this.defaultBrowsers)) {
            rv[key] = value.slice();
        }
        for (let key of Object.keys(rv)) {
            if (urlParams.has(key)) {
                let value = urlParams.get(key).split(",").filter(x => browsers.includes(x));
                if (value.length) {
                    rv[key] = value;
                }
            }
        }
        return rv;
    }

    buildQuery() {
        let query = {
            run_ids: this.props.runs.map(item => item.id),
            query: {
                and: []
            }
        };
        let topAndClause = query.query.and;

        for (let browser of this.state.failsIn) {
            for (let status of passStatuses) {
                topAndClause.push({not : {
                    browser_name: browser,
                    status: status
                }});
            }
        }

        for (let browser of this.state.passesIn) {
            let target;
            if (passStatuses.size > 1) {
                let orClause = {or: []};
                topAndClause.push(orClause);
                target = orClause.or;
            } else {
                target = topAndClause;
            }

            for (let status of passStatuses) {
                target.push({
                    browser_name: browser,
                    status: status
                });
            }
        }

        if (this.props.paths.length > 1) {
            topAndClause.push({"or": this.props.paths.map(path => {return {pattern: path + "/"};})});
        } else {
            topAndClause.push({pattern: this.props.paths[0]});
        }
        return query;
    }

    async fetchResults() {
        let searchQuery = this.buildQuery();

        let results;
        try {
            results = await fetchJson(makeWptFyiUrl("api/search", {}), {
                method: "POST",
                body: JSON.stringify(searchQuery),
                headers:{
                    'Content-Type': 'application/json'
                }
            });
        } catch(e) {
            this.props.onError(e, {retry: async () => this.fetchResults()});
            this.setState({loading_state: LOADING_STATE.COMPLETE});
            throw e;
        }

        // The search for paths is "contains" so filter to only paths that start with the relevant
        // directories

        let pathRe = new RegExp(this.props.paths.map(path => `^${path}/`).join("|"));
        results.results = results.results.filter(result => pathRe.test(result.test));

        // TODO: should be able to do this more efficiently
        results.results.forEach(result => result._geckoMetadata = this.getMetadata(result.test));

        this.setState({results, loading_state: LOADING_STATE.COMPLETE});
    }

    getMetadata(test) {
        let metadata = new Map();
        let dirParts = test.split("/");
        let testName = dirParts[dirParts.length - 1];
        dirParts = dirParts.slice(1, dirParts.length - 1);
        let dirPath = "";

        function copyMeta(src) {
            for (let [key, value] of Object.entries(src)) {
                if (key[0] !== "_") {
                    metadata.set(key, value);
                }
            }
        }

        for (let part of dirParts) {
            if (dirPath.length) {
                dirPath += "/";
            }
            dirPath += part;
            let dirMeta = this.props.geckoMetadata[dirPath];
            if (dirMeta) {
                copyMeta(dirMeta);
            }
        }

        let dirMetadata = this.props.geckoMetadata[dirPath];
        if (dirMetadata && dirMetadata._tests && dirMetadata._tests[testName]) {
            let testMetadata = dirMetadata._tests[testName];
            copyMeta(testMetadata);
            if (testMetadata._subtests) {
                metadata._subtests = new Map();
                for (let [key, value] of Object.entries(testMetadata._subtests)) {
                    metadata._subtests.set(key, new Map(Object.entries(value)));
                }
            }
        }
        return metadata;
    }

    updateFilteredResults() {
        let filteredResults;
        if (!this.state.results) {
            filteredResults = this.state.results;
        } else if (!this.props.filter) {
            filteredResults = this.state.results.results;
        } else {
            filteredResults = this.state.results.results.filter(x => this.props.filter(x));
        }
        this.setState({filteredResults});
    }

    onBrowserChange = (passesIn, failsIn) => {
        this.setState({passesIn, failsIn});
        for (let [key, values] of [["passesIn", passesIn],
                                   ["failsIn", failsIn]]) {
            values = values.sort();
            if (!arraysEqual(values, this.defaultBrowsers[key])) {
                urlParams.set(key, values.join(","));
            } else {
                urlParams.delete(key);
            }
        }
    }

    render() {
        let data;
        if (this.state.loading_state !== LOADING_STATE.COMPLETE) {
           data = (<div>
                      <p>Loading…</p>
                    </div>);
        } else if (this.state.results === null) {
            data = (<div>
                      <p>Load failed</p>
                    </div>);
        } else if (!this.state.results.results.length) {
            data = (<div>
                      <p>No results</p>
                    </div>);
        } else {
            let results = this.state.filteredResults ? this.state.filteredResults : [];
            let testItems = results.map(result => (<TestItem
                                                     failsIn={this.state.failsIn}
                                                     passesIn={this.state.passesIn}
                                                     runs={this.props.runs}
                                                     result={result}
                                                     key={result.test}
                                                     geckoMetadata={result.test._geckoMetadata || new Map()}
                                                     onError={this.props.onError}/>));
            testItems.sort((a,b) => (a.key > b.key ? 1 : (a.key === b.key ? 0 : -1)));
            data = [(<p>{results.length} top-level tests with
                       &nbsp;{results
                              .map(x => x.legacy_status[0].total)
                              .reduce((x,y) => x+y, 0)} subtests</p>),
                    <ul>{testItems}</ul>];
        }
        return (<div>
                  {this.props.children}
                  <ResultsViewSummary failsIn={this.state.failsIn}
                                      passesIn={this.state.passesIn}
                                      onChange={this.onBrowserChange}/>
                  {data}
                </div>);
    }

    async componentDidMount() {
        await this.fetchIfPossible({}, {});
    }

    async componentDidUpdate(prevProps, prevState) {
        await this.fetchIfPossible(prevProps, prevState);
        if (prevState.filter !== this.state.filter) {
            this.updateFilteredResults();
        }
    }

    async fetchIfPossible(prevProps, prevState) {
        if (this.state.loading_state === LOADING_STATE.LOADING) {
            return;
        }
        if (this.props.runs === null) {
            return;
        }
        if (!this.props.paths) {
            return;
        }
        if (this.state.loading_state === LOADING_STATE.COMPLETE &&
            this.props.paths === prevProps.paths &&
            this.state.failsIn === prevState.failsIn &&
            this.state.passesIn === prevState.passesIn) {
            return;
        }
        if (!this.props.paths.length) {
            this.setState({results: {results: []},
                           loading_state: LOADING_STATE.COMPLETE});
            return;
        }
        this.setState({results: null,
                       loading_state: LOADING_STATE.LOADING});
        await this.fetchResults();
        this.updateFilteredResults();
    }
}

class ResultsViewSummary extends Component {
    constructor(props) {
        super(props);
        this.state = {
            editable: false,
            newPassesIn: this.props.passesIn,
            newFailsIn: this.props.failsIn,
        };
    }

    joinList(items) {
        if (!items.length) {
            return "";
        }
        if (items.length === 1) {
            return items[0];
        }
        let commaSeparated = items.slice(0, items.length - 1).join(", ");
        return `${commaSeparated}, and ${items[items.length - 1]}`;
    }

    onEditClick = () => {
        this.setState({editable: true});
    }

    onSelectChange = (data, type) => {
        let key;
        let state = {};
        if (type === "passesIn") {
            key = "newPassesIn";
        } else if (type === "failsIn") {
            key = "newFailsIn";
        } else {
            console.error(`Unknown key ${type}`);
        }
        console.log(type, key, data);
        state[key] = data;
        this.setState(state);
    }

    onUpdateClick = () => {
        console.log(this.state.newPassesIn, this.state.newFailsIn);
        this.props.onChange(this.state.newPassesIn, this.state.newFailsIn);
        this.setState({editable: false});
    }

    render() {
        if (!this.state.editable) {
            return (<p>
                      Tests that pass in {this.joinList(this.props.passesIn.map(x => capitalize(x)))}
                      &nbsp;but not in {this.joinList(this.props.failsIn.map(x => capitalize(x)))}
                      &nbsp;
                      <button onClick={this.onEditClick}>
                        Edit
                      </button>
                    </p>);
        } else {
            let passInOptions = browsers.map(x => {return {
                value: x,
                name: capitalize(x),
                selected: this.props.passesIn.includes(x)
            };});
            let failInOptions = browsers.map(x => {return {
                value: x,
                name: capitalize(x),
                selected: this.props.failsIn.includes(x)
            };});
            return (<p>Tests that
                      &nbsp;<label>pass in&nbsp;
                        <SelectMultiple
                          onChange={(data) => this.onSelectChange(data, "passesIn")}
                          options={passInOptions}/>
                      </label>
                      &nbsp;but
                      <label>
                        &nbsp;not in&nbsp;
                        <SelectMultiple
                          onChange={(data) => this.onSelectChange(data, "failsIn")}
                          options={failInOptions}/>
                      </label>
                      &nbsp;
                      <button
                        onClick={this.onUpdateClick}
                        disabled={this.state.newPassesIn.length === 0 || this.state.newFailsIn.length === 0}>
                        Update
                      </button>
                    </p>);
        }
    }
}

class TreeRow extends Component {
    constructor(props) {
        super(props);
        this.state = {
            showDetails: false
        };
    }

    handleClick = () => {
        this.setState({showDetails: !this.state.showDetails});
    }

    render() {
        return (<li className={"tree-row" + (this.state.showDetails ? " tree-row-expanded" : "")}>
                  <span onClick={this.handleClick}>
                    {this.state.showDetails ? "\u25BC " : "\u25B6 "}
                    {this.props.rowTitle}
                  </span>
                  {this.props.rowExtra}
                  {this.state.showDetails ? (<div className="tree-row">
                                               {this.props.children}
                                             </div>) : ""}
               </li>);
    }

}

class TestItem extends Component {
    render() {
        // TODO: Difference between test path and file path
        let rowTitle = `${this.props.result.test} [${this.props.result.legacy_status[0].total} subtests]`;
        return (
                <TreeRow rowTitle={<code>{rowTitle}</code>}
                  rowExtra={null}>
                  <TestDetails
                    runs={this.props.runs}
                    test={this.props.result.test}
                    passesIn={this.props.passesIn}
                    failsIn={this.props.failsIn}
                    geckoMetadata={this.props.geckoMetadata}
                    onError={this.props.onError} />
            </TreeRow>
        );
    }
}

class TestDetails extends Component {
    constructor(props) {
        super(props);
        this.state = {
            loaded: false,
            results: null
        };
    }

    processResultData(results) {
        let resultBySubtest = new Map();
        for (let [browser, browserResults] of results) {
            if (!resultBySubtest.has(null)) {
                resultBySubtest.set(null, new Map());
            }
            resultBySubtest.get(null).set(browser, {status: browserResults.status,
                                                    message: browserResults.message});
            for (let subtest of browserResults.subtests) {
                if (!resultBySubtest.has(subtest.name)) {
                    resultBySubtest.set(subtest.name, new Map());
                }
                resultBySubtest.get(subtest.name).set(browser, {status: subtest.status,
                                                                message: subtest.message});
            }
        }

        for (let resultByBrowser of resultBySubtest.values()) {
            for (let run of this.props.runs) {
                let browser = run.browser_name;
                if (!resultByBrowser.has(browser)) {
                    resultByBrowser.set(browser, {status: "MISSING",
                                                  message: null});
                }
            }
        }

        let filteredResultBySubtest = new Map();
        // Filter out subtest results that don't match the current filters
        for (let [subtest, resultByBrowser] of resultBySubtest) {
            if (this.props.passesIn.every(browser => passStatuses.has(resultByBrowser.get(browser).status)) &&
                this.props.failsIn.every(browser => !passStatuses.has(resultByBrowser.get(browser).status))) {
                filteredResultBySubtest.set(subtest, resultByBrowser);
            }
        }

        let rv = [];
        if (filteredResultBySubtest.has(null)) {
            rv.push([null, filteredResultBySubtest.get(null)]);
            filteredResultBySubtest.delete(null);
        }

        return rv.concat(Array.from(filteredResultBySubtest));
    }

    async fetchData() {
        let resultData = new Map();
        let browsers = [];
        let promises = [];
        for (let run of this.props.runs) {
            let browser = run.browser_name;
            let summaryUrl = run.results_url;
            let parts = summaryUrl.split('-');
            // Remove the part of the url after the last -
            parts.pop();
            let url = `${parts.join('-')}${this.props.test}`;
            let promise = fetchJson(url)
                .then(x => {return {success: true, value:x};})
                .catch(e => {return {success: false, value:e};});
            browsers.push(browser);
            promises.push(promise);
        }
        let resolved = await Promise.all(promises);
        for (let [idx, data] of enumerate(resolved)) {
            if (data.success) {
                let browser = browsers[idx];
                resultData.set(browser, data.value);
            }
        }
        let filteredResults = this.processResultData(resultData);
        this.setState({results: filteredResults,
                       loaded: true});

    }

    async componentDidMount() {
        await this.fetchData();
    }

    render() {
        if (!this.state.loaded) {
            return <p>Loading</p>;
        }
        let headerRow = this.props.runs.map(run => <th key={run.browser_name}>{run.browser_name}</th>);
        headerRow.push(<th key="metadata"></th>);
        let subtestMetadata = this.props.geckoMetadata.get("_subtests") || new Map();
        let resultRows = this.state.results.map(([subtest, results]) => (<ResultRow
                                                                           key={subtest}
                                                                           runs={this.props.runs}
                                                                           subtest={subtest}
                                                                           results={results}
                                                                           geckoMetadata={subtestMetadata.get(subtest)} />));
        return (<div>
                  <ul>
                    <li><a href={`http://w3c-test.org${this.props.test}`}>Live test</a></li>
                    <li><a href={makeWptFyiUrl(`results/${this.props.test}`)}>wpt.fyi</a></li>
                    <li><a href={`http://searchfox.org/mozilla-central/source/testing/web-platform/meta${testToPath(this.props.test)}.ini`}>Gecko Metadata</a></li>
                  </ul>
                  <MetaSummary
                    test={this.props.test}
                    data={this.props.geckoMetadata}/>
                  <section>
                    <h3>Results</h3>
                    <table className="results">
                      <thead>
                        <tr>
                          <th></th>
                          {headerRow}
                        </tr>
                      </thead>
                      <tbody>
                        {resultRows}
                      </tbody>
                    </table>
                  </section>
                </div>);
    }
}

class MetaSummary extends Component {
    render() {
        let renderBug = value => <MaybeBugLink value={value} />;
        let items;
        if (this.props.data) {
            let metaProps = [{name: "disabled", render: renderBug},
                             {name: "bug", render: renderBug},
                             {name: "crash", title: "Crashes", render: renderBug}];
            items = metaProps
                .map(item => {
                    if (this.props.data.has(item.name)) {
                        return (<InlineOrTreeMetadata
                                  key={item.name}
                                  title={item.title ? item.title : capitalize(item.name)}
                                  values={this.props.data.get(item.name)}
                                  render={item.render}/>);
                    }
                    return null;
                })
                .filter(x => x !== null);
        } else {
            items = [];
        }
        if (items.length === 0) {
            return null;
        }
        return (<section>
                  <h3>Gecko Metadata</h3>
                  <ul>
                    {items}
                  </ul>
                </section>);
    }
}

class InlineOrTreeMetadata extends Component {
    render() {
        if (!this.props.values) {
            return null;
        }
        if (this.props.values.length === 1 && this.props.values[0][0] === null) {
            // We have a single unconditional value for the property so render inline
            return (<li>
                      {this.props.title}: {this.props.render(this.props.values[0])}
                    </li>);
        } else {
            return (<GeckoMetadataLine
                      title={this.props.title}
                      values={this.props.values}
                      render={this.props.render}/>);
        }
    }
}

class ResultRow extends Component {
    render() {
        let cells = this.props.runs.map(run => {
            let result = this.props.results.get(run.browser_name);
            return <ResultCell result={result} key={run.browser_name}/>;
        });
        cells.push(<td key="metadata">
                     <MetaSummary
                       data={this.props.geckoMetadata} />
                   </td>);
        return (<tr>
                  <th>{this.props.subtest ? this.props.subtest : "<parent>"}</th>
                  {cells}
                </tr>);
    }
}

class ResultCell extends Component {
    render() {
        return (<td
                  className={`result result-${this.props.result.status.toLowerCase()}`}
                  title={this.props.result.message}>
                  {this.props.result.status}
                </td>);
    }
}

class GeckoData extends Component {
    groupData() {
        let disabled = new Map();
        let lsan = new Map();
        let crashes = new Map();

        for (let [dir, dirData] of Object.entries(this.props.data)) {
            if (dirData.disabled) {
                disabled.set(dir, dirData.disabled);
            }
            if (dirData['lsan-allowed']) {
                lsan.set(dir, dirData['lsan-allowed']);
            }
            if (dirData.expected_CRASH) {
                crashes.set(dir, dirData.expected_CRASH.map(cond => [cond, null]));
            }
            if (!dirData._tests) {
                continue;
            }
            for (let [test, testData] of Object.entries(dirData._tests)) {
                let testKey = `${dir}/${test}`;
                if (testData.disabled) {
                    disabled.set(testKey, testData.disabled);
                }
                if (testData.expected_CRASH) {
                    crashes.set(testKey, testData.expected_CRASH.map(cond => [cond, null]));
                }
                if (!testData._subtests) {
                    continue;
                }
                for (let [subtest, subtestData] of Object.entries(testData._subtests)) {
                    let subtestKey = `${dir}/${test} | ${subtest}`;
                    if (subtestData.disabled) {
                        disabled.set(subtestKey, subtestData.disabled);
                    }
                    if (subtestData.expected_CRASH) {
                        crashes.set(subtestKey, subtestData.expected_CRASH.map(cond => [cond, null]));
                    }
                }
            }
        }
        return {disabled, lsan, crashes};
    }

    render() {
        let content;
        if (this.props.data === null) {
            content = <p>Loading</p>;
        } else {
            content = [];
            let byType = this.groupData();
            if (byType.crashes) {
                let items = [];
                for (let [test, values] of iterMapSorted(byType.crashes)) {
                    items.push(<GeckoMetadataLine
                                 key={test}
                                 title={test}
                                 values={values}
                                 render={value => null}/>);
                }
                if (items.length) {
                    content.push(<section key="crashes">
                                   <h2>Crashes</h2>
                                   <p>{items.length} tests crash in some configurations</p>
                                   <ul>{items}</ul>
                                 </section>);
                }
            }
            if (byType.disabled) {
                let items = [];
                for (let [test, values] of iterMapSorted(byType.disabled)) {
                    items.push(<GeckoMetadataLine
                                 key={test}
                                 title={test}
                                 values={values}
                                 render={value => <MaybeBugLink value={value} />}/>);
                }
                if (items.length) {
                    content.push(<section key="disabled">
                                   <h2>Disabled</h2>
                                   <p>{items.length} tests are disabled in some configurations</p>
                                   <ul>{items}</ul>
                                 </section>);
                }
            }
            if (byType.lsan) {
                let items = [];
                for (let [test, values] of iterMapSorted(byType.lsan)) {
                    items.push(<GeckoMetadataLine
                                 key={test}
                                 title={test}
                                 values={values}
                                 render={value => <LsanListValue value={value}/>} />);
                }
                if (items.length) {
                    content.push(<section key="lsan">
                                   <h2>LSAN Failures</h2>
                                   <p>{items.length} directories have LSAN failures</p>
                                   <ul>{items}</ul>
                                 </section>);
                }
            }
            return (<section>
                      {this.props.children}
                      {content.length ? content : <p>No metadata available</p>}
                    </section>);
        }
        return (<section>
                  <h2>Gecko metadata</h2>
                  <p>None</p>
                </section>);
    }
}

class GeckoMetadataLine extends Component {
    render() {
        let values = [];
        for (let [condition, value] of this.props.values) {
            let conditionStr = condition ? `if ${condition}${value ? ": " : " "}` : "";
            values.push(<li
                          key={condition ? condition : "None"}>
                          <code>{conditionStr}</code>{value ? this.props.render(value): null}
                        </li>);
        }
        let valueList = null;
        if (values.length) {
            valueList = <ul className="tree-row">{values}</ul>;
        }
        return (<TreeRow
                  rowTitle={this.props.title}
                  rowExtra={null}>
                  {valueList}
                </TreeRow>);
    }
}

class MaybeBugLink extends Component {
    render() {
        const bugLinkRe = /https?:\/\/bugzilla\.mozilla\.org\/show_bug\.cgi\?id=(\d+)/;
        const bugNumberRe = /(?:bug\s+)?(\d+)/i;
        for (let re of [bugLinkRe, bugNumberRe]) {
            let match = re.exec(this.props.value);
            if (match !== null) {
                return <a href={`https://bugzilla.mozilla.org/show_bug.cgi?id=${match[1]}`}>Bug {match[1]}</a>;
            }
        }
        return this.props.value;
    }
}

class LsanListValue extends Component {
    render() {
        if (Array.isArray(this.props.value)) {
            let frames = this.props.value.map(x => <li key={x}><code>{x}</code></li>);
            return (<ul>{frames}</ul>);
        }
        return this.props.value;
    }
}


class Tabs extends Component {
    constructor(props) {
        super(props);
        this.state = {
            activeTab: urlParams.get('tab') || this.props.children[0].props.label
        };
    }

    handleClickTab = (label) => {
        this.setState({activeTab: label});
        urlParams.set('tab', label);
    }

    render() {
        let tabItems = this.props.children.map(child => {
            let label = child.props.label;
            return (<Tab
                      active = {this.state.activeTab === label}
                      label = {label}
                      key = {label}
                      onClick = {this.handleClickTab}
                    />);
        });
        let activeTabContent = this.props.children.find(child => child.props.label === this.state.activeTab);
        return (<div className="tab-view">
                  <ol className="tab-strip">
                    {tabItems}
                  </ol>
                  <div className="tab-content">
                    {activeTabContent}
                  </div>
                </div>);
    }
}

class Tab extends Component {
    onClick = () => {
        this.props.onClick(this.props.label);
    }

    render() {
        return (<li
                  className={"tab-label " + (this.props.active ? "tab-active" : "")}
                  onClick={this.onClick}>
                  {this.props.label}
                </li>);
    }
}

export default App;
