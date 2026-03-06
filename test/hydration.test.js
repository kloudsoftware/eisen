const assert = require('assert');
const {JSDOM} = require('jsdom');
const {VApp, Renderer, Component, jsx, Props} = require('../dist/index.cjs');

function setup(html) {
    const dom = new JSDOM(html || '<div id="root"></div>', {url: 'http://localhost'});
    global.window = dom.window;
    global.document = dom.window.document;
    global.localStorage = dom.window.localStorage;
    global.navigator = dom.window.navigator;
    global.HTMLElement = dom.window.HTMLElement;
    global.HTMLInputElement = dom.window.HTMLInputElement;
    return dom;
}

describe('hydration', () => {
    it('attaches VNode tree to existing DOM without creating new elements', () => {
        setup('<div id="root"><div class="app"><h1>Hello</h1><p>World</p></div></div>');

        const renderer = new Renderer();
        const app = new VApp('root', renderer);

        // Build a VNode tree matching the server-rendered HTML
        const h1 = jsx('h1', null, 'Hello');
        const p = jsx('p', null, 'World');
        const appDiv = jsx('div', {className: 'app'}, h1, p);

        app.rootNode.children.push(appDiv);
        appDiv.parent = app.rootNode;

        // Hydrate
        const rootEl = document.getElementById('root');
        renderer.hydrate(appDiv, rootEl.firstElementChild);

        // VNodes should point to existing DOM elements
        assert.strictEqual(appDiv.htmlElement, rootEl.firstElementChild);
        assert.strictEqual(appDiv.htmlElement.tagName, 'DIV');

        // Children should be linked too
        const h1El = rootEl.querySelector('h1');
        assert.strictEqual(h1.htmlElement, h1El);

        const pEl = rootEl.querySelector('p');
        assert.strictEqual(p.htmlElement, pEl);
    });

    it('preserves DOM elements — no new elements created', () => {
        setup('<div id="root"><span>existing</span></div>');

        const renderer = new Renderer();
        const app = new VApp('root', renderer);

        const span = jsx('span', null, 'existing');
        app.rootNode.children.push(span);
        span.parent = app.rootNode;

        const originalSpan = document.querySelector('span');
        renderer.hydrate(span, originalSpan);

        // Should be the exact same DOM node
        assert.strictEqual(span.htmlElement, originalSpan);
    });

    it('handles nested structures', () => {
        setup('<div id="root"><ul><li>One</li><li>Two</li></ul></div>');

        const renderer = new Renderer();
        const app = new VApp('root', renderer);

        const li1 = jsx('li', null, 'One');
        const li2 = jsx('li', null, 'Two');
        const ul = jsx('ul', null, li1, li2);

        app.rootNode.children.push(ul);
        ul.parent = app.rootNode;

        renderer.hydrate(ul, document.querySelector('ul'));

        assert.strictEqual(ul.htmlElement.tagName, 'UL');
        assert.strictEqual(li1.htmlElement.tagName, 'LI');
        assert.strictEqual(li2.htmlElement.tagName, 'LI');
        assert.strictEqual(li1.htmlElement.textContent, 'One');
        assert.strictEqual(li2.htmlElement.textContent, 'Two');
    });
});
