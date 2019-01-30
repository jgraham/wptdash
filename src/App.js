import React, { Component } from 'react';
import './App.css';

const BUGZILLA_TASK_URL = "https://index.taskcluster.net/v1/task/gecko.v2.mozilla-central.latest.source.source-bugzilla-info";
const TASK_QUEUE_BASE = "https://queue.taskcluster.net/v1/task";

const WPT_FYI_BASE = "http://flitwick:8010/proxy/api";

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

function getUrlParams() {
    return new URL(window.location).searchParams;
}

function setUrlParams(items) {
    let url = new URL(window.location);
    let params = url.searchParams;
    for (let key of Object.keys(items)) {
        params.set(key, items[key]);
    }
    window.history.replaceState({}, document.title, url.href);
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

class App extends Component {
    constructor(props) {
        super(props);
        this.state = {
            bugComponents: [],
            bugComponentsMap: new Map(),
            currentBugComponent: getUrlParams().get("bugComponent"),
            wptRuns: null
        };
    }

    async loadBugComponentData() {
        // TODO - Error handling
        let taskResp = await fetch(BUGZILLA_TASK_URL);
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
        let artifactData = artifacts.artifacts.find(artifact => artifact.name.endsWith("components-normalized.json"));
        let artifactResp = await fetch(`${TASK_QUEUE_BASE}/${taskId}/runs/${runId}/artifacts/${artifactData.name}`);
        let componentData = await artifactResp.json();

        let [components, componentsMap] = this.processComponentData(componentData);
        components = Array.from(components).sort();

        this.setState({
            "bugComponentsMap": componentsMap,
            "bugComponents": components
        });

        if (!this.state.currentBugComponent || !componentsMap.has(this.state.currentBugComponent)) {
            this.setState({currentBugComponent: components[0]});
        }
    }

    async loadWptRunData() {
        let runsUrl = makeWptFyiUrl("runs", {aligned: ""});
        let runsResp = await fetch(runsUrl);

        let runsJson = await runsResp.json();

        this.setState({wptRuns: runsJson});
    }

    async componentDidMount() {
        let bugComponentPromise = this.loadBugComponentData();
        let wptRunDataPromise = this.loadWptRunData();

        await Promise.all([bugComponentPromise, wptRunDataPromise]);
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
                        componentToPath.get(canonicalComponent).push(basePath.slice(wptRoot.length));
                        found = true;
                    }
                }
            }
        }
        return [components, componentToPath];
    }

    onComponentChange = (component) => {
        this.setState({currentBugComponent: component.toLowerCase()});
        setUrlParams({"bugComponent": component.toLowerCase()});
    }

    render() {
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
                <TestPaths paths={this.state.bugComponentsMap.get(this.state.currentBugComponent)}/>
              </section>
              <section id="details">
                <Tabs>
                  <ResultsView label="Firefox-only Failures"
                               failsIn={["firefox"]}
                               passesIn={["safari", "chrome"]}
                               runs={this.state.wptRuns}
                               paths={this.state.bugComponentsMap.get(this.state.currentBugComponent)}>
                    <h2>Firefox-only Failures</h2>
                    <p>Tests that pass in Chrome and Safari but fail in Firefox.</p>
                  </ResultsView>
                  <ResultsView label="All Firefox Failures"
                               failsIn={["firefox"]}
                               passesIn={[]}
                               runs={this.state.wptRuns}
                               paths={this.state.bugComponentsMap.get(this.state.currentBugComponent)}>
                    <h2>All Firefox Failures</h2>
                    <p>Tests that fail in Firefox</p>
                  </ResultsView>
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
                  <select onChange={this.handleChange} value={this.props.value}>
                    {selectItems}
                  </select>
                </section>
               );
    }
}

class TestPaths extends Component {
    render() {
        let paths = this.props.paths || [];
        let listItems = paths.sort().map(path => <li key={path}>{path}</li>);
        return (<section>
                  <h2>Test Paths</h2>
                  <ul id="test-paths">
                    {listItems}
                  </ul>
                </section>);
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

        let searchResp = await fetch(makeWptFyiUrl("search", {}), {
            method: "POST",
            body: JSON.stringify(searchQuery),
            headers:{
                  'Content-Type': 'application/json'
            }
        });
        let searchData = await searchResp.json();

        return searchData;

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
                                                                  key={result.test}/>));
        testItems.sort((a,b) => (a.key > b.key ? 1 : (a.key === b.key ? 0 : -1)));
        return (<div>
                  {this.props.children}
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
        if (this.runs === null) {
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
        let results = await this.fetchResults();
        this.setState({results: results,
                       loaded: true});
    }
}

class TestItem extends Component {
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
        // TODO: Difference between test path and file path
        let testUrl = `http://w3c-test.org${this.props.result.test}`;
        let resultUrl = makeWptFyiUrl(`results/${this.props.result.test}`);
        let metaUrl = `http://searchfox.org/mozilla-central/source/testing/web-platform/meta${this.props.result.test}.ini`;
        return (
            <li className={"tree-row" + (this.state.showDetails ? " tree-row-expanded" : "")}>
              <span onClick={this.handleClick}>
                {this.state.showDetails ? "\u25BC" : "\u25B6"}
                <code>{this.props.result.test}</code>
              </span>
              [<a href={testUrl}>test</a>]
              [<a href={resultUrl}>{this.props.result.legacy_status[0].total} subtests</a>]
              [<a href={metaUrl}>gecko metadata</a>]
              {this.state.showDetails ? (<div className="tree-row">
                                           <TestDetails
                                             runs={this.props.runs}
                                             visible={this.state.showDetails}
                                             test={this.props.result.test}
                                             passesIn={this.props.passesIn}
                                             failsIn={this.props.failsIn}/>
                                         </div>) : ""}
            </li>
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
        if (!this.props.visible) {
            return null;
        }
        if (!this.state.loaded) {
            return <p>Loading</p>;
        }
        let headerRow = this.props.runs.map(run => <th key={run.browser_name}>{run.browser_name}</th>);
        let resultRows = this.state.results.map(([subtest, results]) => (<ResultRow
                                                                           key={subtest}
                                                                           runs={this.props.runs}
                                                                           subtest={subtest}
                                                                           results={results}/>));
        return (<table className="results">
                  <thead>
                    <tr>
                      <th></th>
                      {headerRow}
                    </tr>
                  </thead>
                  <tbody>
                    {resultRows}
                  </tbody>
                </table>);
    }
}


class ResultRow extends Component {
    render() {
        let cells = this.props.runs.map(run => {
            let result = this.props.results.get(run.browser_name);
            return <ResultCell result={result} key={run.browser_name}/>;
        });
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

class Tabs extends Component {
    constructor(props) {
        super(props);
        this.state = {
            activeTab: getUrlParams().get('tab') || this.props.children[0].props.label
        };
    }

    handleClickTab = (label) => {
        this.setState({activeTab: label});
        setUrlParams({'tab': label});
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
