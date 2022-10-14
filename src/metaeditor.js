import React, { Component } from 'react';

export class MetadataEditor extends Component {
    render() {
        if (!this.props.changes.size) {
            return null;
        }
        let loginUrl = `https://staging.wpt.fyi/login`;
        return (<section id="metadata">
                  <h3>Metadata Changes</h3>
                  <p>Submitting MetaData requires first signing in to <a href={loginUrl} target="_blank" rel="noopener noreferrer">staging.wpt.fyi</a></p>
                  <MetadataPendingChanges
                    changes={this.props.changes}
                    onSubmit={this.props.onSubmit}
                    onCancel={this.props.onCancel} />
                </section>);
    };
}


class MetadataPendingChanges extends Component {
    render() {
        let listItems = [];
        for (let [test, changes] of this.props.changes.entries()) {
            for (let change of changes) {
                listItems.push(<li key={change.test + change.url}>{test} | {change.subtest} | {change.change} | {change.url}</li>);
            }
        }
        return (<div>
                  <details>
                  <summary>Pending Changes</summary>
                    <ol>
                      {listItems}
                    </ol>
                  </details>
                  <div>
                    <button onClick={this.props.onSubmit}>Sumbit Changes</button>
                    <button onClick={this.props.onCancel}>Cancel</button>
                  </div>
                </div>);
    }
}
