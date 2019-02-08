import React, { Component } from 'react';
import './App.css';

const TASK_INDEX_BASE = "https://index.taskcluster.net/v1/task";
const TASK_QUEUE_BASE = "https://queue.taskcluster.net/v1/task";

const WPT_FYI_BASE = "https://staging.wpt.fyi";

const passStatuses = new Set(["PASS", "OK"]);

function* reversed(array) {
    let index = array.length;
    while (index > 0) {
        index--;
        yield array[index];
    }
};

function arraysEqual(a, b) {
    if (a === b) {
        return true;
    }
    if (!Array.isArray(a) || !Array.isArray(b)) {
        return false;
    }
    if (a.length !== b.length) {
        return false;
    }
    return a.every((a_value, i) => a_value === b[i]);
}

function setsEqual(a, b) {
    if (a.size !== b.size) {
        return false;
    }
    for(let elem of a) {
        if (!b.has(elem)) {
            return false;
        }
    }
    return true;
}

function* iterMapSorted(map, cmp) {
    let keys = Array.from(map.keys());
    keys.sort();
    for (let key of keys) {
        yield [key, map.get(key)];
    }
}

function makeWptFyiUrl(path, params={}) {
    let url = new URL(`${WPT_FYI_BASE}/${path}`);
    let defaults = [["label", "master"],
                    ["product", "chrome[experimental]"],
                    ["product", "firefox[experimental]"],
                    ["product", "safari[experimental]"]];
    for (let [key, value] of defaults) {
        url.searchParams.append(key, value);
    }
    for (let key of Object.keys(params)) {
        let value = params[key];
        if (Array.isArray(value)) {
            value.forEach(x => url.searchParams.append(key, x));
        } else {
            url.searchParams.append(key, value);
        }
    }
    return url;
}

class UrlParams {
    constructor() {
        this.url = new URL(window.location)
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

const urlParams = new UrlParams();

class App extends Component {
    constructor(props) {
        super(props);
        this.state = {
            bugComponents: [],
            bugComponentsMap: new Map(),
            currentBugComponent: null,
            selectedPaths: new Set(),
            wptRuns: null,
            geckoMetadata: {},
            geckoMetadataForPaths: {},
        };
    }

    async loadTaskClusterData(indexName, artifactName) {
        let taskResp = await fetch(`${TASK_INDEX_BASE}/${indexName}`);
        let taskData = await taskResp.json();
        let taskId = taskData.taskId;
        let taskStatusResp = await fetch(`${TASK_QUEUE_BASE}/${taskId}/status`);
        let taskStatus = await taskStatusResp.json();
        let runId;
        for (let run of reversed(taskStatus.status.runs)) {
            if (run.state === "completed") {
                runId = run.runId;
                break;
            }
        }
        let artifactsResp = await fetch(`${TASK_QUEUE_BASE}/${taskId}/runs/${runId}/artifacts`);
        let artifacts = await artifactsResp.json();
        let artifactData = artifacts.artifacts.find(artifact => artifact.name.endsWith(artifactName));
        let artifactResp = await fetch(`${TASK_QUEUE_BASE}/${taskId}/runs/${runId}/artifacts/${artifactData.name}`);
        return artifactResp.json();
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
        let runsUrl = makeWptFyiUrl("api/runs", {aligned: ""});
        let runsResp = await fetch(runsUrl);

        let runsJson = await runsResp.json();

        this.setState({wptRuns: runsJson});
    }

    async loadGeckoMetadata() {
//        let metadata = await this.loadTaskClusterData("index.gecko.v2.try.latest.source.source-wpt-metadata-summary",
//                                                      "summary.json");
        let dataResp = await fetch(`https://queue.taskcluster.net/v1/task/Ik2tnR1KQzi26GfvTQ2WHw/runs/0/artifacts/public/summary.json`,
                                  {redirect: "follow"});
        let metadata = await dataResp.json();
        this.setState({geckoMetadata: metadata});
    }

    async componentDidMount() {
        let bugComponentPromise = this.loadBugComponentData();
        let wptRunDataPromise = this.loadWptRunData();
        let geckoMetadataPromise = this.loadGeckoMetadata();

        await Promise.all([bugComponentPromise, wptRunDataPromise, geckoMetadataPromise]);
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

    componentDidUpdate(prevProps, prevState) {
        if (prevState.geckoMetadata !== this.state.geckoMetadata ||
            !arraysEqual(prevState.selectedPaths, this.state.selectedPaths)) {
            this.filterGeckoMetadata();
        }
    }

    render() {
        let paths = this.state.bugComponentsMap.get(this.state.currentBugComponent);
        return (
            <div id="app">
              <header>
                <h1>wpt interop dashboard</h1>
              </header>
              <section id="selector">
                <RunInfo runs={this.state.wptRuns}/>
                <BugComponentSelector onComponentChange={this.onComponentChange}
                                      components={this.state.bugComponents}
                                      value={this.state.currentBugComponent} />
                <TestPaths
                  paths={paths}
                  selectedPaths={this.state.selectedPaths}
                  onChange={this.onPathsChange} />
              </section>
              <section id="details">
                <Tabs>
                  <ResultsView label="Firefox-only Failures"
                               failsIn={["firefox"]}
                               passesIn={["safari", "chrome"]}
                               runs={this.state.wptRuns}
                               paths={Array.from(this.state.selectedPaths)}
                               geckoMetadata={this.state.pathMetadata}>
                    <h2>Firefox-only Failures</h2>
                    <p>Tests that pass in Chrome and Safari but fail in Firefox.</p>
                  </ResultsView>
                  <ResultsView label="All Firefox Failures"
                               failsIn={["firefox"]}
                               passesIn={[]}
                               runs={this.state.wptRuns}
                               paths={Array.from(this.state.selectedPaths)}
                               geckoMetadata={this.state.pathMetadata}>
                    <h2>All Firefox Failures</h2>
                    <p>Tests that fail in Firefox</p>
                  </ResultsView>
                <GeckoData label="Gecko Data"
                           data={this.state.pathMetadata}
                           paths={Array.from(this.state.selectedPaths)}>
                  <h2>Gecko metadata</h2>
                  <p>Gecko metadata in <code>testing/web-platform/meta</code> taken from latest mozilla-central.</p>
                  <p>Note: this data is currently not kept up to date</p>
                </GeckoData>
                </Tabs>
              </section>
            </div>
        );
    }
}

class RunInfo extends Component {
    render() {
        if (!this.props.runs) {
            return null;
        }
        let shortRev = this.props.runs[0].revision;
        let longRev = this.props.runs[0].full_revision_hash;
        let url = makeWptFyiUrl("", {sha: longRev});
        return (<dl>
          <dt>wpt SHA1:</dt>
          <dd><a href={url}>{shortRev}</a></dd>
        </dl>);
    }
}

class BugComponentSelector extends Component {
    handleChange = (event) => {
        this.props.onComponentChange(event.target.value);
    }

    render() {
        let selectItems = this.props.components.map(component => <option value={component.toLowerCase()} key={component.toLowerCase()}>{component}</option>);
        if (!this.props.value) {
            return null;
        }
        return (<section>
                  <label>Bug Component: </label>
                  <select
                    onChange={this.handleChange}
                    value={this.props.value}>
                    {selectItems}
                  </select>
                </section>
               );
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

class Checkbox extends Component {
    constructor(props) {
        super(props);
        this.state = {
            checked: this.props.checked
        };
    }

    handleChange = (event) => {
        this.setState({checked: event.target.checked ? true : false});
        this.props.onCheckboxChange(this.props.value, event.target.checked);
    }

    render() {
        return (<input
                  name={this.props.path}
                  type="checkbox"
                  checked={this.state.checked}
                  onChange={this.handleChange} />);
    }
}

class ResultsView extends Component {
    constructor(props) {
        super(props);
        this.state = {
            loaded: false,
            results: [],
        };
    }

    buildQuery() {
        let query = {
            run_ids: this.props.runs.map(item => item.id),
            query: {
                and: []
            }
        };
        let topAndClause = query.query.and;

        for (let browser of this.props.failsIn) {
            for (let status of passStatuses) {
                topAndClause.push({not : {
                    browser_name: browser,
                    status: status
                }});
            }
        }

        for (let browser of this.props.passesIn) {
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
            topAndClause.push({"or": this.props.paths.map(path => {return {pattern: path};})});
        } else {
            topAndClause.push({pattern: this.props.paths[0]});
        }
        return query;
    }

    async fetchResults() {
        let searchQuery = this.buildQuery();

        let searchResp = await fetch(makeWptFyiUrl("api/search", {}), {
            method: "POST",
            body: JSON.stringify(searchQuery),
            headers:{
                  'Content-Type': 'application/json'
            }
        });
        let searchData = await searchResp.json();

        return searchData;

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

    render() {
        if (!this.props.runs || !this.state.loaded) {
            return (<div>
                      {this.props.children}
                      <p>Loading…</p>
                    </div>);
        }
        if (this.state.results.results === null) {
            return (<div>
                      {this.props.children}
                      <p>Load failed</p>
                    </div>);
        }
        if (!this.state.results.results.length) {
            return (<div>
                      {this.props.children}
                      <p>No results</p>
                    </div>);
        }
        let testItems = this.state.results.results.map(result => (<TestItem
                                                                  failsIn={this.props.failsIn}
                                                                  passesIn={this.props.passesIn}
                                                                  runs={this.props.runs}
                                                                  result={result}
                                                                  key={result.test}
                                                                  geckoMetadata={this.getMetadata(result.test)}
/>));
        testItems.sort((a,b) => (a.key > b.key ? 1 : (a.key === b.key ? 0 : -1)));
        return (<div>
                  {this.props.children}
                  <p>{this.state.results.results.length} top-level tests with
                    &nbsp;{this.state.results.results
                     .map(x => x.legacy_status[0].total)
                     .reduce((x,y) => x+y, 0)} subtests</p>
                  <ul>{testItems}</ul>
                </div>);
    }

    async componentDidMount() {
        await this.fetchIfPossible({});
    }

    async componentDidUpdate(prevProps) {
        await this.fetchIfPossible(prevProps);
    }

    async fetchIfPossible(prevProps) {
        if (this.props.runs === null) {
            return;
        }
        if (!this.props.paths) {
            return;
        }
        if (this.state.loaded &&
            arraysEqual(this.props.paths, prevProps.paths) &&
            arraysEqual(this.props.failsIn, prevProps.failsIn) &&
            arraysEqual(this.props.passesIn, prevProps.passesIn)) {
            return;
        }
        if (!this.props.paths.length) {
            this.setState({results: {results: []},
                           loaded: true});
            return;
        }
        let results = await this.fetchResults();
        this.setState({results, loaded: true});
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
                    {this.state.showDetails ? "\u25BC" : "\u25B6"}
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
        let testUrl = `http://w3c-test.org${this.props.result.test}`;
        let resultUrl = makeWptFyiUrl(`results/${this.props.result.test}`);
        let metaUrl = `http://searchfox.org/mozilla-central/source/testing/web-platform/meta${this.props.result.test}.ini`;
        let rowExtra = (<span>
                         [<a href={testUrl}>test</a>]
                         [<a href={resultUrl}>{this.props.result.legacy_status[0].total} subtests</a>]
                         [<a href={metaUrl}>gecko metadata</a>]</span>);
        return (
                <TreeRow rowTitle={<code>{this.props.result.test}</code>}
                  rowExtra={rowExtra}>
                  <TestDetails
                    runs={this.props.runs}
                    test={this.props.result.test}
                    passesIn={this.props.passesIn}
                    failsIn={this.props.failsIn}
                    geckoMetadata={this.props.geckoMetadata} />
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
            for (let browser of results.keys()) {
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

    async componentDidMount() {
        let resultData = new Map();
        for (let run of this.props.runs) {
            let browser = run.browser_name;
            let summaryUrl = run.results_url;
            let parts = summaryUrl.split('-');
            // Remove the part of the url after the last -
            parts.pop();
            let url = `${parts.join('-')}${this.props.test}`;
            resultData.set(browser, fetch(url).then(resp => resp.json()));
        }
        await Promise.all(Array.from(resultData.values()));
        for (let [browser, promise] of resultData) {
            resultData.set(browser, await promise);
        }
        let filteredResults = this.processResultData(resultData);
        this.setState({results: filteredResults,
                       loaded: true});
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
                  <MetaSummary data={this.props.geckoMetadata} />
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
               </div>);
    }
}

class MetaSummary extends Component {
    render() {
        if (!this.props.data) {
            return null;
        }
        let items = [];
        if (this.props.data.has("disabled")) {
            items.push(<p key="disabled">Disabled in (some) gecko configurations</p>);
        }
        if (this.props.data.has("bug")) {
            let bugValue = this.props.data.get("bug");
            let unconditionalValue;
            for (let [cond, value] of bugValue) {
                if (cond === null) {
                    unconditionalValue = value;
                }
            }
            if (unconditionalValue) {
                items.push(<MaybeBugLink key="bug" value={unconditionalValue}/>);
            }
        }
        return items;
    }
}


class ResultRow extends Component {
    render() {
        let cells = this.props.runs.map(run => {
            let result = this.props.results.get(run.browser_name);
            return <ResultCell result={result} key={run.browser_name}/>;
        });
        cells.push(<td key="metadata">
                     <MetaSummary data={this.props.geckoMetadata}/>
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
        console.log(this.props.data);
        let content;
        if (this.props.data === null) {
            content = <p>Loading</p>;
        } else {
            content = [];
            let byType = this.groupData();
            console.log(byType);
            if (byType.crashes) {
                let items = [];
                for (let [test, values] of iterMapSorted(byType.crashes)) {
                    items.push(<GeckoMetadataLine
                                 key={test}
                                 test={test}
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
                                 test={test}
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
                                 test={test}
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
                  rowTitle={this.props.test}
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
