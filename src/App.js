import React, { Component } from 'react';
import './App.css';
import {arraysEqual, setsEqual, reversed, iterMapSorted, enumerate} from './utils';
import {Checkbox, TextInput, Select, SelectMultiple} from './form';
import {MetadataEditor} from './metaeditor';
import {Filter} from './filterselector';
import {urlParams} from './urlparams';

const TASK_INDEX_BASE = "https://firefox-ci-tc.services.mozilla.com/api/index/v1";
const TASK_QUEUE_BASE = "https://firefox-ci-tc.services.mozilla.com/api/queue/v1";

const WPT_FYI_BASE = "https://wpt.fyi";
const WPT_FYI_STAGING_BASE = "https://staging.wpt.fyi";

const passStatuses = new Set(["PASS", "OK"]);

const browsers = ["chrome", "firefox", "safari"];

const LOADING_STATE = Object.freeze({
    NONE: 0,
    LOADING: 1,
    COMPLETE: 2
});

const bugLinkRe = /https?:\/\/bugzilla\.mozilla\.org\/show_bug\.cgi\?id=(\d+)/;

function makeWptFyiUrl(path, params={}, staging=false) {
    let base = staging ? WPT_FYI_STAGING_BASE : WPT_FYI_BASE;
    let url = new URL(`${base}/${path}`);
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
    if (str) {
        return str && str[0].toUpperCase() + str.slice(1);
    } else {
        return "";
    }
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
            wptMetadata: null,
            geckoMetadata: {},
            pathGeckoMetadata: {},
            errors: [],
            haveData: {
                bugComponent: false,
                geckoMetadata: false,
                wptMetadata: false,
                wptRun: false,
            },
            filter: null,
            filterFunc: null,
            queryTerms: [],
            metadataPendingChanges: new Map(),
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

    onFilterChange = (filterFunc, queryTerms) => {
        this.setState({filterFunc, queryTerms});
    }

    onRunChange = (runSha) => {
        this.setState({runSha});
    }

    onMetadataPendingSubmit = async () => {
        let isMatch = (item, change) => (item.product === "firefox" &&
                                         item.url === change.url &&
                                         item.subtest === change.subtest &&
                                         item.status === change.status);


        console.log(this.state.metadataPendingChanges);
        let changedMeta = {};
        for (let [test, changes] of this.state.metadataPendingChanges) {
            // Flatten out the metadata
            let meta = [];
            let prevMetadata = this.state.wptMetadata[test];
            if (prevMetadata) {
                for (let item of prevMetadata) {
                    if (item.results) {
                        for (let result of item.results) {
                            meta.push({...item, ...result});
                        }
                    } else {
                        meta.push({...item});
                    }
                }
            }

            for (let change of changes) {
                if (change.change === "REMOVE") {
                    meta = meta.filter(item => !isMatch(item, change));
                } else if (change.change === "ADD") {
                    if (!meta.some(item => isMatch(item, change))) {
                        let newMeta = {product: "firefox",
                                       url: change.url};
                        if (change.subtest) {
                            newMeta.subtest = change.subtest;
                        }
                        if (change.status) {
                            newMeta.status = change.status;
                        }
                        meta.push(newMeta);
                    }
                }
            }
            console.log("meta", meta);
            changedMeta[test] = [];
            // Now unflatten the metadata
            let index = new Map();
            for (let newMeta of meta) {
                let key = [newMeta.product, newMeta.url].join(",");
                if (!index.has(key)) {
                    index.set(key, changedMeta[test].length);
                    changedMeta[test].push({product: newMeta.product, url:newMeta.url});
                }
                if (newMeta.subtest || newMeta.status) {
                    let item = changedMeta[test][index.get(key)];
                    if (!item.results) {
                        item.results = [];
                    }
                    let result = {};
                    if (newMeta.subtest) {
                        result.subtest = {};
                    }
                    if (newMeta.status) {
                        result.status = newMeta.status;
                    }
                    item.results.push(result);
                }
            }
        }
        await this.patchMetadata(changedMeta);
        this.setState({metadataPendingChanges: new Map()});
    }

    onMetadataPendingCancel = () => {
        this.setState({metadataPendingChanges: new Map()});
    }

    onMetadataChange = (change) => {
        console.log("onMetadataChange", change);
        let metadataPendingChanges = new Map(this.state.metadataPendingChanges);
        if (!metadataPendingChanges.has(change.test)) {
            metadataPendingChanges.set(change.test, []);
        }
        // TODO: consolidate changes
        metadataPendingChanges.get(change.test).push(change);
        this.setState({metadataPendingChanges});
    }

    async patchMetadata(data) {
        let body = JSON.stringify(data);
        if (window.location.hostname !== "jgraham.github.io") {
            this.onError(new Error(`Unable to submit data from ${window.location.hostname}`), {});
            console.error(data);
            return null;
        }
        let url = makeWptFyiUrl("api/metadata", {"product": "firefox"}, true);
        const response = await fetch(url, {
            method: 'PATCH',
            mode: 'cors',
            cache: 'no-cache',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body
        });
        return await response.json();
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
        let taskData = await this.fetchData(`${TASK_INDEX_BASE}/task/${indexName}`,
                                            retry);
        let taskId = taskData.taskId;
        let taskStatus = await this.fetchData(`${TASK_QUEUE_BASE}/task/${taskId}/status`,
                                              retry);
        let runId;
        for (let run of reversed(taskStatus.status.runs)) {
            if (run.state === "completed") {
                runId = run.runId;
                break;
            }
        }
        let artifacts = await this.fetchData(`${TASK_QUEUE_BASE}/task/${taskId}/runs/${runId}/artifacts`,
                                             retry);
        let artifactData = artifacts.artifacts.find(artifact => artifact.name.endsWith(artifactName));
        return this.fetchData(`${TASK_QUEUE_BASE}/task/${taskId}/runs/${runId}/artifacts/${artifactData.name}`,
                              retry);
    }

    async loadBugComponentData() {
        // TODO - Error handling
        this.setState({haveData: {...this.state.haveData, bugComponent: false}});
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
        this.setState({haveData: {...this.state.haveData, bugComponent: true}});
    }

    async loadWptRunData() {
        this.setState({haveData: {...this.state.haveData, wptRun: false}});
        let params = {aligned: ""};
        if (this.state.runSha) {
            params["sha"] = this.state.runSha;
        }
        let runsUrl = makeWptFyiUrl("api/runs", params);
        let runs = await this.fetchData(runsUrl, async () => this.loadWptRunData());
        let runSha = runs[0].full_revision_hash;
        this.setState({wptRuns: runs, runSha});
        this.setState({haveData: {...this.state.haveData, wptRun: true}});
    }

    async loadWptMetadata() {
        this.setState({haveData: {...this.state.haveData, wptMetadata: false}});
        let params = {"product": ["firefox"]};
        let metaUrl = makeWptFyiUrl("api/metadata", params);
        let metadata = await this.fetchData(metaUrl, async () => this.loadWptMetadata());
        this.setState({wptMetadata: metadata});
        this.setState({haveData: {...this.state.haveData, wptMetadata: true}});
    }

    async loadGeckoMetadata() {
        this.setState({haveData: {...this.state.haveData, geckoMetadata: false}});
        let metadata = await this.loadTaskClusterData("gecko.v2.mozilla-central.latest.source.source-wpt-metadata-summary",
                                                      "summary.json");
        this.setState({geckoMetadata: metadata});
        this.setState({haveData: {...this.state.haveData, geckoMetadata: true}});
    }

    async componentDidMount() {
        await Promise.all([this.loadBugComponentData(),
                           this.loadWptRunData(),
                           this.loadWptMetadata(),
                           this.loadGeckoMetadata()]);
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

        this.setState({pathGeckoMetadata: data});
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
            await this.loadWptRunData();
        }
    }

    render() {
        let paths = this.state.bugComponentsMap.get(this.state.currentBugComponent);
        let body = [];
        if (this.state.runSha) {
            body.push(<section id="selector" key="selector">
                        <dl>
                          <RunInfo runSha={this.state.runSha}
                                   onChange={this.onRunChange} />
                          <BrowserInfo runs={this.state.wptRuns} />
                          <BugComponentSelector onComponentChange={this.onComponentChange}
                                                components={this.state.bugComponents}
                                                value={this.state.currentBugComponent} />
                          <Filter onChange={this.onFilterChange} />
                          <TestPaths
                            paths={paths}
                            selectedPaths={this.state.selectedPaths}
                            onChange={this.onPathsChange} />
                        </dl>
                        </section>);
        }
        if (Object.values(this.state.haveData).includes(false)) {
            body.push(<section id="details" key="details">
                        <p>Loading…</p>
                      </section>);
        } else {
            body.push(
                <section id="details" key="details">
                  <Tabs>
                    <ResultsView label="Interop Comparison"
                                 runs={this.state.wptRuns}
                                 paths={this.state.selectedPaths}
                                 geckoMetadata={this.state.pathGeckoMetadata}
                                 wptMetadata={this.state.wptMetadata}
                                 onError={this.onError}
                                 filter={this.state.filterFunc}
                                 queryTerms={this.state.queryTerms}
                                 onMetadataChange={this.onMetadataChange}>
                      <h2>Interop Comparison</h2>
                    </ResultsView>
                    <GeckoData label="Gecko Data"
                               data={this.state.pathGeckoMetadata}
                               paths={this.state.selectedPaths}
                               onError={this.onError}>
                      <h2>Gecko metadata</h2>
                      <p>Gecko metadata in <code>testing/web-platform/meta</code> taken from latest mozilla-central.</p>
                      <p>Note: this data is currently not kept up to date</p>
                    </GeckoData>
                  </Tabs>
                  <MetadataEditor changes={this.state.metadataPendingChanges}
                                  onSubmit={this.onMetadataPendingSubmit}
                                  onCancel={this.onMetadataPendingCancel} />
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
            console.log(error);
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
        return [<dt key="term">wpt SHA1:</dt>,
                this.state.editable ?
                 (<dd key="value">
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
                 (<dd key="value">
                    <a href={url}>{this.props.runSha.slice(0,12)}</a>
                    &nbsp;&nbsp;
                    <button onClick={this.onEditClick}>
                      Edit
                    </button>
                  </dd>
                 )];
    }
}

class BrowserInfo extends Component {
    render() {
        if (!this.props.runs) {
            return null;
        }
        let browsers = this.props.runs.map(run => {
            return (<li key={run.browser_name}>
               {capitalize(run.browser_name)} {run.browser_version} ({run.os_name})
             </li>);
        });
        return [<dt key="term">Browsers:</dt>,
                (<dd key="value">
                   <ul>{browsers}</ul>
                 </dd>)];
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
        return [<dt key="term">Bug Component:</dt>,
                (<dd key="value">
                   <Select
                     onChange={this.handleChange}
                     value={this.props.value}
                     options={options}/>
                 </dd>)];
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
              <label>
                <Checkbox
                  checked={this.props.selectedPaths.has(path)}
                  value={path}
                  onCheckboxChange={this.onCheckboxChange} />
                {path}
              </label>
            </li>));
        return [<dt key="term">Test Paths</dt>,
                (<dd key="value">
                   <button
                     onClick={this.onUpdateClick}
                     disabled={setsEqual(this.state.paths, this.props.selectedPaths)}>
                     Update
                   </button>
                   <ul id="test-paths">
                     {listItems}
                   </ul>
                </dd>)];
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
                let value = urlParams.get(key);
                let listValue = value.split(",").filter(x => browsers.includes(x));
                if (!value.length || listValue.length) {
                    rv[key] = listValue;
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

        let paths = Array.from(this.props.paths);
        if (paths.length > 1) {
            topAndClause.push({"or": paths.map(path => {return {pattern: path + "/"};})});
        } else {
            topAndClause.push({pattern: paths[0]});
        }

        for (let term of this.props.queryTerms) {
            topAndClause.push(term);
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

        let pathRe = new RegExp(Array.from(this.props.paths).map(path => `^${path}/`).join("|"));
        results.results = results.results.filter(result => pathRe.test(result.test));

        // TODO: should be able to do this more efficiently
        results.results.forEach(result => {
            result._wptMetadata = this.getWptMetadata(result.test);
            result._geckoMetadata = this.getGeckoMetadata(result.test);
        });

        this.setState({results, loading_state: LOADING_STATE.COMPLETE});
    }

    getWptMetadata(test) {
        let metadata = new Map();
        if (this.props.wptMetadata[test]) {
            for (let meta of this.props.wptMetadata[test]) {
                let metaEntry = {...meta};
                let product = metaEntry.product;
                delete metaEntry.product;
                if (!metadata.has(product)) {
                    metadata.set(product, []);
                }
                metadata.get(product).push(metaEntry);
            }
        }
        return metadata;
    }

    getGeckoMetadata(test) {
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
                                                     geckoMetadata={result._geckoMetadata || new Map()}
                                                     wptMetadata={result._wptMetadata}
                                                     onMetadataChange={this.props.onMetadataChange}
                                                     onError={this.props.onError}/>));
            testItems.sort((a,b) => (a.key > b.key ? 1 : (a.key === b.key ? 0 : -1)));
            data = [(<p key="desc">{results.length} top-level tests with
                       &nbsp;{results
                              .map(x => x.legacy_status[0].total)
                              .reduce((x,y) => x+y, 0)} subtests</p>),
                    <ul key="data">{testItems}</ul>];
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
            this.state.passesIn === prevState.passesIn &&
            this.props.queryTerms === prevProps.queryTerms) {
            return;
        }
        if (!this.props.paths.size) {
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
        state[key] = data;
        this.setState(state);
    }

    onUpdateClick = () => {
        this.props.onChange(this.state.newPassesIn, this.state.newFailsIn);
        this.setState({editable: false});
    }

    render() {
        if (!this.state.editable) {
            let text;
            if (this.props.passesIn.length && this.props.failsIn.length) {
                text = `Tests that pass in ${this.joinList(this.props.passesIn.map(x => capitalize(x)))}
but not in ${this.joinList(this.props.failsIn.map(x => capitalize(x)))}`;
            } else if (this.props.passesIn.length) {
                text = `Tests that pass in ${this.joinList(this.props.passesIn.map(x => capitalize(x)))}`;
            } else {
                text = `Tests that don't pass in ${this.joinList(this.props.failsIn.map(x => capitalize(x)))}`;
            }
            return (<p>
                      {text}
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
                        disabled={this.state.newPassesIn.length === 0 && this.state.newFailsIn.length === 0}>
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
                    wptMetadata={this.props.wptMetadata}
                    onError={this.props.onError}
                    onMetadataChange={this.props.onMetadataChange} />
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
                                                                           test={this.props.test}
                                                                           subtest={subtest}
                                                                           results={results}
                                                                           geckoMetadata={subtestMetadata.get(subtest)}
                                                                           wptMetadata={this.props.wptMetadata}
                                                                           onMetadataChange={this.props.onMetadataChange} />));
        return (<div>
                  <section>
                    <ul className="links">
                      <li><a href={`http://wpt.live${this.props.test}`}>View Test</a></li>
                      <li><a href={makeWptFyiUrl(`results/${this.props.test}`)}>All Results</a></li>
                      <li><a href={`http://searchfox.org/mozilla-central/source/testing/web-platform/meta${testToPath(this.props.test)}.ini`}>Gecko Metadata</a></li>
                      <li>
                        <WptTestMetadata
                          test={this.props.test}
                          subtest={null}
                          wptMetadata={this.props.wptMetadata}
                          onChange={this.props.onMetadataChange} />
                      </li>
                    </ul>
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
                    <GeckoMetaSummary test={this.props.test}
                                      geckoMetadata={this.props.geckoMetadata} />
                  </section>
                </div>);
    }
}

class WptTestMetadata extends Component {
    constructor(props) {
        super(props);
        this.state = {
            testMetadata: [],
            addLink: false,
            newLinkValue: null
        };
    }

    componentDidMount() {
        this.filterBugLinks();
    }

    onInputChange = (value) => {
        this.setState({newLinkValue: value});
    }

    onAddLink = () => {
        let bugUrl = `https://bugzilla.mozilla.org/show_bug.cgi?id=${this.state.newLinkValue}`;
        this.props.onChange({test: this.props.test,
                             subtest: this.props.subtest,
                             change: "ADD",
                             url: bugUrl});
        let testMetadata = this.state.testMetadata.concat([{url: bugUrl}]);
        this.setState({addLink: false, newLinkValue: null, testMetadata});
    }

    onRemoveLink = (url) => {
        this.props.onChange({test: this.props.test,
                             subtest: this.props.subtest,
                             change: "REMOVE",
                             url: url});
        let testMetadata = this.state.testMetadata.filter(item => item.url !== url);
        this.setState({testMetadata});
    }

    render() {
        let bugLinks;
        if (this.state.testMetadata.length) {
            bugLinks = this.state.testMetadata.map(item => {
                return <MetadataBugLink key={item.url}
                                        url={item.url}
                                        onRemove={this.onRemoveLink} />;
            });
        } else {
            bugLinks = <span>None</span>;
        }
        let controlElements;
        if (this.state.addLink) {
            controlElements = (<div>
                                 <TextInput
                                   onChange={this.onInputChange}/>
                                 <button onClick={this.onAddLink}>Add</button>
                                 <button onClick={() => this.setState({addLink: false, newLinkValue: null})}>Cancel</button>
                             </div>);
        } else {
            controlElements = <button onClick={() => this.setState({addLink: true})}>+</button>;
        }
        return (<div>
                Gecko Bugs: {bugLinks}
                  {controlElements}
                </div>);
    }

    filterBugLinks() {
        let fxMetadata = this.props.wptMetadata.get("firefox");
        if (!fxMetadata) {
            return;
        }
        let testMetadata = [];
        for (let meta of fxMetadata) {
            if (!bugLinkRe.exec(meta.url)) {
                continue;
            }
            if (!meta.results) {
                if (!this.props.subtest) {
                    testMetadata.push(meta);
                }
            } else {
                let relevantResults = meta.results.filter(result => (!result.subtest && !this.props.subtest) ||
                                                          (result.subtest === this.props.subtest));
                if (relevantResults.length) {
                    testMetadata.push({...meta, results: relevantResults});
                }
            }
        }
        this.setState({testMetadata});
    }
}

class MetadataBugLink extends Component {
    render() {
        return (<span>
                <MaybeBugLink value={this.props.url} />
                <button onClick={() => this.props.onRemove(this.props.url)}>-</button>
                </span>);
    }
}

class GeckoMetaSummary extends Component {
    render() {
        let renderBug = value => <MaybeBugLink value={value} />;
        let items = [];
        if (this.props.geckoMetadata) {
            let metaProps = [{name: "disabled", render: renderBug},
                             {name: "bug", render: renderBug},
                             {name: "crash", title: "Crashes", render: renderBug},
                             {name: "intermittent", render: value => JSON.stringify(value)}];
            for (let prop of metaProps) {
                if (this.props.geckoMetadata.has(prop.name)) {
                    items.push(<InlineOrTreeMetadata
                                 key={prop.name}
                                 title={prop.title ? prop.title : capitalize(prop.name)}
                                 values={this.props.geckoMetadata.get(prop.name)}
                                 render={prop.render}/>);
                }
            }
        };
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
                     <WptTestMetadata
                       test={this.props.test}
                       subtest={this.props.subtest}
                       wptMetadata={this.props.wptMetadata}
                       onChange={this.props.onMetadataChange} />
                     <GeckoMetaSummary
                       geckoMetadata={this.props.geckoMetadata} />
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
        let disabled = {unconditional: new Map(), conditional: new Map()};
        let intermittent = {unconditional: new Map(), conditional: new Map()};
        let lsan = {unconditional: new Map(), conditional: new Map()};
        let crashes = {unconditional: new Map(), conditional: new Map()};
        let set = (key, data, dest, mapFn) => {
            let destKey;
            if (!data || !data.length) {
                return;
            }
            destKey = (data.length === 1 && (data[0] === null || data[0][0] === null)) ? "unconditional": "conditional";
            if (mapFn) {
                data = data.map(mapFn);
            }
            dest[destKey].set(key, data);
        };
        for (let [dir, dirData] of Object.entries(this.props.data)) {
            set(dir, dirData.disabled, disabled);
            set(dir, dirData['lsan-allowed'], lsan);
            set(dir, dirData.expected_CRASH, crashes, cond => [cond, null]);
            if (!dirData._tests) {
                continue;
            }
            for (let [test, testData] of Object.entries(dirData._tests)) {
                let testKey = `${dir}/${test}`;
                set(testKey, testData.disabled, disabled);
                set(testKey, testData.intermittent, intermittent);
                set(testKey, testData.expected_CRASH, crashes, cond => [cond, null]);
                if (!testData._subtests) {
                    continue;
                }
                for (let [subtest, subtestData] of Object.entries(testData._subtests)) {
                    let subtestKey = `${dir}/${test} | ${subtest}`;
                    set(subtestKey, subtestData.disabled, disabled);
                    set(subtestKey, subtestData.intermittent, intermittent);
                    set(subtestKey, subtestData.expected_CRASH, crashes, cond => [cond, null]);
                }
            }
        }
        return {disabled, intermittent, lsan, crashes};
    }

    render() {
        if (!this.props.data) {
            return <p>Loading</p>;
        }
        let byType = this.groupData();
        if (byType === null ||
            !Object.values(byType).some(typeValues => Object.values(typeValues).some(x => x.size > 0))) {
            return (<section>
                      <h2>Gecko metadata</h2>
                      <p>None</p>
                      </section>);
        }
        return (<section>
                  <h2>Gecko metadata</h2>
                  <GeckoDataSection
                    key="crashes"
                    data={byType.crashes}
                    render={value => null}
                    title="Crashes"
                    desc="tests crash" />
                  <GeckoDataSection
                    key="disabled"
                    data={byType.disabled}
                    render={value => <MaybeBugLink value={value} />}
                    title="Disabled"
                    desc="tests are disabled" />
                  <GeckoDataSection
                    key="intermittent"
                    data={byType.intermittent}
                    render={value => <StatusListValue value={value} />}
                    title="Intermittent"
                    desc="tests are intermittent" />
                  <GeckoDataSection
                    key="lsan"
                    data={byType.lsan}
                    render={value => <LsanListValue value={value} />}
                    title="LSAN Failures"
                    desc="directories have LSAN failures"/>
                </section>);
    }
}


class GeckoDataSection extends Component {
    render() {
        let {conditional, unconditional} = this.props.data;
        if (!conditional.size && !unconditional.size) {
            return null;
        }
        let count = 0;
        let items = [];
        for (let [type, typeData] of [["In all configurations", unconditional],
                                      ["In some configurations", conditional]]) {
            if (!typeData.size) {
                continue;
            }
            items.push(<h4 key={type}>{type}</h4>);
            for (let [test, values] of iterMapSorted(typeData)) {
                count++;
                items.push(<GeckoMetadataLine
                             key={test}
                             title={test}
                             values={values}
                             render={this.props.render}/>);
            }
        }
        return (<section>
                  <h3>{this.props.title}</h3>
                  <p>{count} {this.props.desc}</p>
                  <ul>{items}</ul>
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

class StatusListValue extends Component {
    render() {
        if (Array.isArray(this.props.value)) {
            let statuses = this.props.value.map(x => <code>{x}</code>)
                .reduce((prev, current) => prev.length ? prev.concat([", ", current]) : [current], []);
            return (<code>{statuses}</code>);
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
