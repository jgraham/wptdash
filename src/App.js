import React, { Component } from 'react';
import './App.css';

const BUGZILLA_TASK_URL = "https://index.taskcluster.net/v1/task/gecko.v2.mozilla-central.latest.source.source-bugzilla-info";
const TASK_QUEUE_BASE = "https://queue.taskcluster.net/v1/task";

const WPT_FYI_BASE = "http://localhost:8010/proxy/api";

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
    if (!a || !b) {
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

class App extends Component {
    constructor(props) {
        super(props);
        this.state = {
            components: [],
            componentsMap: new Map(),
            currentComponent: getUrlParams().get("component"),
        };
    }

    async componentDidMount() {
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

        let componentsMap = this.processComponentData(componentData);
        let components = Array.from(componentsMap.keys()).sort();

        this.setState({
            "componentsMap": componentsMap,
            "components": components
        });

        if (!this.state.currentComponent || !componentsMap.has(this.state.currentComponent)) {
            this.setState({currentComponent: components[0]});
        }
    }

    processComponentData(componentData) {
        let componentsMap = componentData.components;
        let paths = componentData.paths;
        let pathToComponent = new Map();
        let componentToPath = new Map();
        let wptRoot = "testing/web-platform/tests";
        let stack = [[wptRoot, paths.testing["web-platform"].tests]];
        let pathTrimRe = /(.*)\/[^/]*$/;
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
                    while (path !== wptRoot) {
                        if (pathToComponent.has(path) && pathToComponent.get(path) === component) {
                            found = true;
                            break;
                        }
                        path = pathTrimRe.exec(path)[1];
                    }
                    if (!found) {
                        pathToComponent.set(basePath, component);
                        if (!componentToPath.has(component)) {
                            componentToPath.set(component, []);
                        };
                        componentToPath.get(component).push(basePath.slice(wptRoot.length));
                        found = true;
                    }
                }
            }
        }
        return componentToPath;
    }

    onComponentChange = (component) => {
        this.setState({currentComponent: component});
        setUrlParams({"component": component});
    }

    render() {
        return (
            <div className="app">
              <h1>wpt dashboard</h1>
              <BugComponentSelector onComponentChange={this.onComponentChange} components={this.state.components} value={this.state.currentComponent} />
              <TestPaths paths={this.state.componentsMap.get(this.state.currentComponent)}/>
              <ResultsView paths={this.state.componentsMap.get(this.state.currentComponent)}/>
            </div>
        );
    }
}

class BugComponentSelector extends Component {
    handleChange = (event) => {
        this.props.onComponentChange(event.target.value);
    }

    render() {
        let selectItems = this.props.components.map(component => <option value={component} key={component}>{component}</option>);
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
                  <ul>
                    {listItems}
                  </ul>
                </section>);
    }
}

class ResultsView extends Component {
    constructor(props) {
        super(props);
        this.state = {
            runs: []
        };
    }

    async componentDidMount() {
        let runsUrl = new URL(`${WPT_FYI_BASE}/runs`);
        runsUrl.search = new URLSearchParams([["label", "master"],
                                              ["product", "chrome[experimental]"],
                                              ["product", "firefox[experimental]"],
                                              ["product", "safari[experimental]"],
                                              ["aligned", ""]]);
        let runsResp = await fetch(runsUrl);
        let runsJson = await runsResp.json();

        this.setState({runs: runsJson});
    }

    async fetchResults() {
        console.log("fetchResults");
        let runIds = this.state.runs.map(item => item.id);
        let searchQuery = {
            "run_ids": runIds,
            "query": {
                "and": [
                    {
                        "not": {
                            "browser_name": "firefox",
                            "status": "PASS"
                        }
                    },
                    {
                        "not": {
                            "browser_name": "firefox",
                            "status": "OK"
                        }
                    },
                    {
                        "or": [
                            {
                                "browser_name": "chrome",
                                "status": "PASS"
                            },
                            {
                                "browser_name": "chrome",
                                "status": "OK"
                            }
                        ]
                    },
                    {
                        "or": [
                            {
                                "browser_name": "safari",
                                "status": "PASS"
                            },
                            {
                                "browser_name": "safari",
                                "status": "OK"
                            }
                        ]
                    },
                ]
            }
        };
        if (this.props.paths) {
            let pathQuery;
            if (this.props.paths.length > 1) {
                pathQuery = {"or": this.props.paths.map(path => {return {pattern: path};})};
            } else {
                pathQuery = {pattern: this.props.paths[0]};
            }
            searchQuery.query.and.push(pathQuery);
        }

        let searchResp = await fetch(`${WPT_FYI_BASE}/search`, {
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
        console.log("render");
        console.log(this.state);
        if (this.state.results) {
            console.log(this.state.results.length);
        }
        if (!this.state.results || !this.state.results.results.length) {
            return <div>No results</div>;
        }
        let testItems = this.state.results.results.map(result => <TestItem runs={this.state.runs} result={result} key={result.test}/>);
        return (<div>
                  <h2>Firefox-only Failures</h2>
                  <p>Tests that pass in Chrome and Safari but fail in Firefox.</p>
                  <ul>{testItems}</ul>
                </div>);
    }

    async componentDidUpdate(prevProps) {
        console.log("componentDidUpdate");
        if (arraysEqual(prevProps.paths, this.props.paths)) {
            return;
        }

        let searchData = await this.fetchResults();
        this.setState({results: searchData});
    }
}

class TestItem extends Component {
    render() {
        // TODO: Difference between test path and file path
        let testUrl = `http://w3c-test.org${this.props.result.test}`;
        let resultUrl = `http://wpt.fyi/results/${this.props.result.test}?label=master&label=experimental&product=chrome&product=firefox&product=safari&aligned`;
        let metaUrl = `http://searchfox.org/mozilla-central/source/testing/web-platform/meta${this.props.result.test}.ini`;
        return (
            <li>
              {this.props.result.test} ({this.props.result.legacy_status[0].total} subtests) [<a href={resultUrl}>result</a>] [<a href={testUrl}>test</a>] [<a href={metaUrl}>gecko metadata</a>]
            </li>
        );
    }
}

export default App;
