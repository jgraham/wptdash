import React, { Component } from 'react';

export class Checkbox extends Component {
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
                  name={this.props.name}
                  type="checkbox"
                  checked={this.state.checked}
                  onChange={this.handleChange} />);
    }
}

export class TextInput extends Component {
    handleChange = (event) => {
        let value = event.target.value;
        this.props.onChange(value);
    }

    render() {
        return (<input
                  name={this.props.name}
                  onChange={this.handleChange}
                  defaultValue={this.props.defaultValue}
                  list={this.props.list}/>);
    }
}


export class Select extends Component {
    handleChange = (event) => {
        this.props.onChange(event.target.value);
    }

    render() {
        let selectItems = this.props.options.map(option => <option value={option.value} key={option.value}>{option.name}</option>);
        return (<select
                  onChange={this.handleChange}
                  value={this.props.value}>
                  {selectItems}
                </select>);
    }
}

export class DataList extends Component {
    render() {
        let items = this.props.options.map(option => <option value={option} key={option}/>);
        return (<datalist id={this.props.id}>
                  {items}
                </datalist>);
    }
}
