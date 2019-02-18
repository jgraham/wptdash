export function* reversed(array) {
    let index = array.length;
    while (index > 0) {
        index--;
        yield array[index];
    }
};

export function arraysEqual(a, b) {
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

export function setsEqual(a, b) {
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

export function* iterMapSorted(map, cmp) {
    let keys = Array.from(map.keys());
    keys.sort();
    for (let key of keys) {
        yield [key, map.get(key)];
    }
}

export function *enumerate(iter) {
    let count = 0;
    for (let item of iter) {
        yield [count, item];
        count++;
    }
}
