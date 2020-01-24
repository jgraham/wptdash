class UrlParams {
    constructor() {
        this.url = new URL(window.location);
        this.params = this.url.searchParams;
    }

    _update() {
        window.history.replaceState({}, document.title, this.url.href);
    }

    get(name) {
        return this.params.get(name);
    }

    has(name) {
        return this.params.has(name);
    }

    set(name, value) {
        this.params.set(name, value);
        this._update();
    }

    delete(name) {
        this.params.delete(name);
        this._update();
    }

    append(name, value) {
        this.params.append(name, value);
        this._update();
    }
}

export const urlParams = new UrlParams();
