class FilterError extends Error {};

let handlers = {
    and: (data) => {
        if (!Array.isArray(data)) {
            throw new FilterError("Argument to 'and' clause must be an array");
        }
        let args = [];
        for (let child of data) {
            args.push(filterCompiler(child));
        }
        return operators.and(...args);
    },

    or: (data) => {
        if (!Array.isArray(data)) {
            throw new FilterError("Argument to 'or' clause must be an array");
        }
        let args = [];
        for (let child of data) {
            args.push(filterCompiler(child));
        }
        return operators.or(...args);
    },

    "==": (data)  => {
        return operators["=="](data);
    },

    not: ([data]) => {
        return operators.not(filterCompiler(data));
    },

    in: (data) => {
        return operators.in(data);
    },

    has: ([data]) => {
        if (typeof data !== "string") {
            throw new FilterError("Argument to 'has' clause must be a string");
        }
        return operators.has(data);
    }
};

let operators = {
    and: (...args) => {
        return (ctx) => {
            return args.every(x => x(ctx));
        };
    },

    or: (...args) => {
        return (ctx) => args.some(x => x(ctx));
    },

    "==": ([lhs, rhs]) => {
        return lhs === rhs;
    },

    not: (arg) => {
        return (ctx) => !arg(ctx);
    },

    in: ([lhs, rhs]) => {
        return (ctx) => {
            let ctxValue = getValue(ctx, rhs);
            if (typeof ctxValue !== "string") {
                throw new FilterError();
            }
            return ctxValue.includes(lhs);
        };
    },

    has: (arg) => {
        return (ctx) => {
            let ctxValue = getValue(ctx, arg);
            return ctxValue !== undefined;
        };
    }
};

function getValue(ctx, key) {
    let keyParts = key.split(".");
    let target = ctx;
    for (let part of keyParts) {
        if (target instanceof Map) {
            target = target.get(part);
        } else {
            target = target[part];
        }
        if (target === undefined) {
            return undefined;
        }
    }
    return target;
}

export function filterCompiler(input) {
    let keys = Object.keys(input);
    if (keys.length !== 1) {
        console.error(input);
        throw new FilterError("Can't handle an input with multiple keys");
    }
    let op = keys[0];
    if (!handlers.hasOwnProperty(op)) {
        console.error(input);
        throw new FilterError(`Unknown operator ${op}`);
    }
    return handlers[op](input[op]);
}

class ParseError extends Error{};

function* tokenize(input) {
    let space = /\s*/;
    let term = /\w(?:\w|\d|\.|_|-|\+|\/)*|\d+|==|!=|\(|\)|:|".*?[^\\]"|'.*?[^\\]'/;

    let initialLength = input.length;

    while (input.length) {
        // Skip spaces
        let m = input.match(space);
        if (m[0].length) {
            let skip = m[0].length;
            input = input.slice(skip);
            if (!input.length) {
                break;
            }
        }

        //Match the next token
        m = input.match(term);
        if (!m) {
            throw new ParseError(`Invalid input at character ${initialLength - input.length}`);
        }
        let token = m[0];
        yield token;
        input = input.slice(token.length);
    }
}

const operatorTokens = new Set(["==", "!=", "in", "and", "or", "!", "not", ":", "has"]);
const unaryOperators = new Set(["!", "not", "has"]);

const precedenceGroups = [[":"], ["in", "==", "!=", "has"], ["not", "!"], ["and"], ["or"]];
const operatorPrecedence = new Map();

for (let [groupIdx, group] of precedenceGroups.map((x, i) => [i, x])) {
    for (let op of group) {
        operatorPrecedence.set(op, precedenceGroups.length - groupIdx);
    }
}

const operatorAliases = new Map(Object.entries({"!": "not"}));

const defaultOperator = new Map(Object.entries({test: "in"}));


class Node {
    constructor(name) {
        this.name = name;
    }

    to_object() {
        let obj = {};
        obj[this.name] = this.children().map(x => x.to_object());
        return obj;
    }
}

class UnaryOperatorNode extends Node {
    constructor(name) {
        if (!operatorTokens.has(name) || !unaryOperators.has(name)) {
            throw new Error();
        }
        if (operatorAliases.has(name)) {
            name = operatorAliases.get(name);
        }

        super(name);
        this.operand = null;
    }

    children() {
        return [this.operand];
    }
}

class BinaryOperatorNode extends Node {
    constructor(name) {
        if (!operatorTokens.has(name) || unaryOperators.has(name)) {
            throw new Error();
        }
        if (operatorAliases.has(name)) {
            name = operatorAliases.get(name);
        }

        super(name);
        this.lhs = null;
        this.rhs = null;
    }

    children() {
        return [this.lhs, this.rhs];
    }
}

class ValueNode extends Node {
    constructor(name) {
        if (name[0] === "'" || name[0] === '"') {
            name = name.slice(1, name.length - 1);
        }
        super(name);
    }
    to_object() {
        return this.name;
    }
}

function createOperatorNode(token) {
    if (unaryOperators.has(token)) {
        return new UnaryOperatorNode(token);
    }
    return new BinaryOperatorNode(token);
}

function transformDefaultOperator(operator) {
    // The default operator creates a different kind of relation depending on the arguments
    let op = "==";
    if (defaultOperator.has(operator.lhs.name)) {
        op = defaultOperator.get(operator.lhs.name);
    }
    operator.name = op;
    if (op === "in") {
        [operator.lhs, operator.rhs] = [operator.rhs, operator.lhs];
    }
    return operator;
}

class Parser {
    constructor() {
        this.operators = [];
        this.operands = [];
    }

    top() {
        return this.operators.length ? this.operators[this.operators.length - 1] : null;
    }

    parse(tokens) {
        for (let token of tokens) {
            if (token === "(") {
                this.operators.push(token);
            } else if (token === ")") {
                while(this.top() !== null && this.top() !== "(") {
                    this.apply();
                }
                if (!this.operators.length) {
                    throw new ParseError("Mismatched parens");
                }
                this.operators.pop();
            } else if (operatorTokens.has(token)) {
                while (this.top() !== null &&
                       this.top() !== ")" &&
                       this.precedence(this.top().name) >= this.precedence(token)) {
                    this.apply();
                }
                this.operators.push(createOperatorNode(token));
            } else {
                this.operands.push(new ValueNode(token));
            }
        }
        while (this.operators.length) {
            this.apply();
        }
        if (this.operands.length !== 1) {
            throw new ParseError("Operands remaining at end of input");
        }
        return this.operands[0];
    }

    precedence(token) {
        return operatorPrecedence.get(token);
    }

    apply() {
        let operator = this.operators.pop();
        if (unaryOperators.has(operator.name)) {
            let operand = this.operands.pop();
            if (!operand) {
                throw new Error();
            }
            operator.operand = operand;
        } else {
            let rhs = this.operands.pop();
            let lhs = this.operands.pop();
            if (!lhs || !rhs) {
                throw new Error();
            }
            operator.lhs = lhs;
            operator.rhs = rhs;
            if (operator.name === ":") {
                operator = transformDefaultOperator(operator);
            }
        }
        this.operands.push(operator);
    }
}


export function parseExpr(expr) {
    let parser = new Parser();
    return parser.parse(tokenize(expr)).to_object();
}
