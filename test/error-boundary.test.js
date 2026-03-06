const assert = require('assert');
const {JSDOM} = require('jsdom');
const {createApp, Component, jsx, ErrorBoundary} = require('../dist/index.cjs');

function setup() {
    const dom = new JSDOM('<div id="root"></div>', {url: 'http://localhost'});
    global.window = dom.window;
    global.document = dom.window.document;
    global.localStorage = dom.window.localStorage;
    global.navigator = dom.window.navigator;
    global.HTMLElement = dom.window.HTMLElement;
    global.HTMLInputElement = dom.window.HTMLInputElement;
    return dom;
}

function flush(app) {
    const patch = app.renderer.diffAgainstLatest(app);
    patch(app.rootNode.htmlElement);
}

describe('ErrorBoundary', () => {
    it('renders children when no error', () => {
        setup();

        function App() {
            return jsx(ErrorBoundary, {
                fallback: jsx('span', null, 'error')
            }, jsx('div', {className: 'ok'}, 'Hello'));
        }

        const {app} = createApp(App, '#root');
        flush(app);
        assert.strictEqual(document.querySelector('.ok').textContent, 'Hello');
    });

    it('catches error from render function child', () => {
        setup();

        function App() {
            return jsx(ErrorBoundary, {
                fallback: (err) => jsx('span', {className: 'err'}, err.message)
            }, () => { throw new Error('boom'); });
        }

        const {app} = createApp(App, '#root');
        flush(app);
        assert.strictEqual(document.querySelector('.err').textContent, 'boom');
    });

    it('renders static fallback VNode', () => {
        setup();

        function App() {
            return jsx(ErrorBoundary, {
                fallback: jsx('span', {className: 'fallback'}, 'oops')
            }, () => { throw new Error('fail'); });
        }

        const {app} = createApp(App, '#root');
        flush(app);
        assert.strictEqual(document.querySelector('.fallback').textContent, 'oops');
    });
});
