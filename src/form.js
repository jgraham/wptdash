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

export class SelectMultiple extends Component {
    handleChange = (event) => {
        let selectedOptions = event.target.selectedOptions;
        this.props.onChange([].map.call(selectedOptions, x => x.value));
    }

    render() {
        let selectItems = this.props.options.map(option => (
            <option value={option.value}
                    key={option.value}
                    selected={option.selected}>
              {option.name}
            </option>));
        return (<select
                  size="3"
                  multiple
                  onChange={this.handleChange}>
                  {selectItems}
                </select>);
    }
}

export class CheckboxMultiple extends Component {
    constructor(props) {
        super(props);
        this.state = {
            selected: new Map()
        };
    }

    handleChange = (name, is_selected) => {
        let selected = new Map(this.state.selected.entries());
        selected.set(name, is_selected);
        this.setState({selected});
        this.props.onChange(Array.from(selected.entries()));
    }

    componentDidUpdate(prevProps, prevState) {
        if (this.props === prevProps) {
            return;
        }
        let selected = new Map(this.props.options.map(option => [option.name,
                                                                 option.selected]));
        this.setState({selected});
    }

    render() {
        return this.props.options.map(option => (
            <label>
              <Checkbox name={option.value}
                        key={option.value}
                        checked={option.selected}
                        onCheckboxChange={this.handleChange} />
              {option.value}
            </label>));
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
