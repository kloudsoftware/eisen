const assert = require('assert');
const {JSDOM} = require('jsdom');
const {createApp, Component, jsx, Suspense} = require('../dist/index.cjs');

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

describe('Suspense', () => {
    it('renders children when not loading', () => {
        setup();

        function App() {
            return jsx(Suspense, {
                fallback: jsx('span', null, 'Loading...')
            }, jsx('div', {className: 'content'}, 'Loaded'));
        }

        const {app} = createApp(App, '#root');
        flush(app);
        assert.strictEqual(document.querySelector('.content').textContent, 'Loaded');
    });

    it('renders fallback when child has lazy-loading class', () => {
        setup();

        function App() {
            return jsx(Suspense, {
                fallback: jsx('span', {className: 'loader'}, 'Loading...')
            }, jsx('div', {class: 'lazy-loading'}, 'placeholder'));
        }

        const {app} = createApp(App, '#root');
        flush(app);
        assert.strictEqual(document.querySelector('.loader').textContent, 'Loading...');
        assert.strictEqual(document.querySelector('.lazy-loading'), null);
    });
});
