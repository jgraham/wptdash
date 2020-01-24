import React, { Component } from 'react';
import {TextInput, Select} from './form';
import {urlParams} from './urlparams';
import {filterCompiler, parseExpr} from './filter';

export class Filter extends Component {
    types = new Map(Object.entries({none: {name: "None", filter: null},
                                    untriaged: {name: "Untriaged", filter: null,
                                                queryTerms: [{not: {link: "bugzilla.mozilla.org"}}]},
                                    triaged: {name: "Triaged", filter: null,
                                              queryTerms: [{link: "bugzilla.mozilla.org"}]},
                                    custom: {name: "Custom…", filter: null, queryTerms: []}}));

    constructor(props) {
        super(props);
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
        this.state = {type, expr};
        this.afterTypeChange(type);
        if (expr) {
            this.onExprChange(expr);
        }
    }

    componentDidUpdate(prevProps, prevState) {
        if (prevState.type !== this.state.type ||
            prevState.expr !== this.state.expr) {
            this.afterFilterUpdate();
        }
    }

    onTypeChange = (type) => {
        if (!this.types.has(type)) {
            return;
        }
        this.setState({type: type});
        this.afterTypeChange(type);
    }

    afterTypeChange(type) {
        let expr;
        let queryTerms = [];
        if (type === "custom") {
            expr = this.state.expr;
        } else {
            let typeData = this.types.get(type);
            expr = typeData.filter;
            queryTerms = typeData.queryTerms || [];
        }
        let filter;
        if (expr) {
            filter = filterCompiler(parseExpr(expr));
        }
        this.props.onChange(filter, queryTerms);
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
            this.props.onChange(filter, []);
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
                           Triaged status is determined by a bugzilla link for the test in the&nbsp;
                           <a href="https://github.com/web-platform-tests/wpt-metadata">wpt-metadata</a> repository.
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
        return [<dt key="term">Filter:</dt>,
                (<dd key="value">
                   <Select options={options}
                           value={this.state.type}
                           onChange={this.onTypeChange}/>
                   {this.state.type === "custom" ? <TextInput onChange={this.onExprChange}
                                                              defaultValue={this.state.expr}/> : null}
                   {optionText.hasOwnProperty(this.state.type) ?
                    optionText[this.state.type] : null}
                 </dd>)];
    }
}
