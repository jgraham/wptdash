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

    not: data => {
        return operators.not(filterCompiler(data));
    },

    contains: (data) => {
        return operators.contains(data);
    },

    has: data => {
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

    not: (arg) => {
        return (ctx) => !arg(ctx);
    },

    contains: (arg) => {
        let key = Object.keys(arg)[0];
        let value = arg[key];
        return (ctx) => {
            let ctxValue = getValue(ctx, key);
            if (typeof ctxValue !== "string") {
                throw new FilterError();
            }
            return ctxValue.includes(value);
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
        throw new FilterError("Can't handle an input with multiple keys");
    }
    let op = keys[0];
    if (!handlers.hasOwnProperty(op)) {
        throw new FilterError(`Unknown operator ${op}`);
    }
    return handlers[op](input[op]);
}

