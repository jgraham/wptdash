import React, { Component } from 'react';
import {enumerate} from './utils';

export class NotificationArea extends Component {
    onDismiss = (id) => {
        this.props.onDismissNotification(id);
    }

    render() {
        if (!this.props.entries.length) {
            return null;
        }
        let notifications = [];
        for (let [idx, notification] of enumerate(this.props.entries)) {
            notifications.push(<Notification
                                 key={`notification-${notification.id}`}
                                 id={notification.id}
                                 level={notification.level}
                                 content={notification.content}
                                 options={notification.options}
                                 onDismiss={() => this.onDismiss(idx)}/>);
        }
        return (<ul className="notifications">
                  {notifications}
                </ul>);
    }
}

class Notification extends Component {
    constructor(props) {
        super(props);
        this.timer = null;
    }

    onDismiss = () => {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        this.props.onDismiss(this.props.id);
    }

    render() {
        let extraControls = [];
        if (this.props.options.retry) {
            let retry = () => {
                this.props.onDismiss(this.props.id);
                this.props.options.retry();
            };
            extraControls.push(<button onClick={retry} key="retry">Retry</button>);
        }
        if (this.props.options.timeout) {
            this.timer = setTimeout(this.onDismiss, this.props.options.timeout);
        }
        return (<li className={this.props.level}>
                  {this.props.content}
                  <button onClick={this.onDismiss}>Close</button>
                  {extraControls}
                </li>);
    }
}
