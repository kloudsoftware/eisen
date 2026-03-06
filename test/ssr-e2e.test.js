const assert = require('assert');
const {JSDOM} = require('jsdom');

/**
 * End-to-end SSR tests that verify the full flow:
 * 1. Server renders HTML with NO DOM globals at all
 * 2. Client receives HTML, boots createApp, auto-hydrates
 * 3. Reactive updates work after hydration
 */

describe('SSR end-to-end', () => {
    it('renderApp works in a completely clean Node environment', () => {
        // Nuke ALL browser globals
        const saved = {};
        for (const k of ['window', 'document', 'localStorage', 'navigator', 'HTMLElement', 'HTMLInputElement']) {
            saved[k] = global[k];
            delete global[k];
        }

        try {
            // Fresh require to ensure no cached DOM references
            const {Component, jsx, renderApp, renderPage} = require('../dist/index.cjs');

            class App extends Component {
                render() {
                    return jsx('div', {className: 'ssr-test'},
                        jsx('h1', null, 'Server Rendered'),
                        jsx('ul', null,
                            jsx('li', null, 'Item 1'),
                            jsx('li', null, 'Item 2'),
                            jsx('li', null, 'Item 3')
                        )
                    );
                }
            }

            const html = renderApp(App, 'app');
            assert(html.includes('<div id="app">'), 'should have root wrapper');
            assert(html.includes('class="ssr-test"'), 'should have class attr');
            assert(html.includes('<h1>Server Rendered</h1>'), 'should have heading');
            assert(html.includes('<li>Item 1</li>'), 'should have list items');
            assert(html.includes('<li>Item 2</li>'), 'should have list items');
            assert(html.includes('<li>Item 3</li>'), 'should have list items');

            // renderPage should wrap in full document
            const page = renderPage(App, {
                title: 'SSR Test',
                scripts: ['/bundle.js'],
                styles: ['/style.css'],
            });
            assert(page.includes('<!DOCTYPE html>'), 'should have doctype');
            assert(page.includes('<title>SSR Test</title>'), 'should have title');
            assert(page.includes('src="/bundle.js"'), 'should include script');
            assert(page.includes('href="/style.css"'), 'should include style');
            assert(page.includes('Server Rendered'), 'should include component output');
        } finally {
            // Restore globals
            for (const [k, v] of Object.entries(saved)) {
                if (v !== undefined) global[k] = v;
            }
        }
    });

    it('createApp auto-hydrates server HTML and preserves DOM nodes', () => {
        // Step 1: server render (no DOM)
        const saved = {};
        for (const k of ['window', 'document', 'localStorage', 'navigator', 'HTMLElement', 'HTMLInputElement']) {
            saved[k] = global[k];
            delete global[k];
        }

        const {Component, jsx, renderApp} = require('../dist/index.cjs');

        class App extends Component {
            render() {
                return jsx('div', {className: 'app-root'},
                    jsx('h1', {className: 'title'}, 'Hello SSR'),
                    jsx('button', {className: 'btn'}, 'Click me')
                );
            }
        }

        let serverHtml;
        try {
            serverHtml = renderApp(App, 'root');
        } finally {
            for (const [k, v] of Object.entries(saved)) {
                if (v !== undefined) global[k] = v;
            }
        }

        // Step 2: simulate browser with server-rendered content
        const inner = serverHtml.replace(/^<div id="root">/, '').replace(/<\/div>$/, '');
        const dom = new JSDOM(
            `<div id="root">${inner}</div>`,
            {url: 'http://localhost'}
        );
        global.window = dom.window;
        global.document = dom.window.document;
        global.localStorage = dom.window.localStorage;
        global.navigator = dom.window.navigator;
        global.HTMLElement = dom.window.HTMLElement;
        global.HTMLInputElement = dom.window.HTMLInputElement;

        // Capture references to original DOM nodes
        const originalH1 = document.querySelector('.title');
        const originalBtn = document.querySelector('.btn');
        assert(originalH1, 'h1 should exist from server HTML');
        assert(originalBtn, 'button should exist from server HTML');

        // Step 3: createApp should auto-hydrate
        const {createApp} = require('../dist/index.cjs');
        const {app, component} = createApp(App, '#root');

        // Verify hydration: same DOM nodes, not recreated
        assert.strictEqual(
            document.querySelector('.title'), originalH1,
            'h1 should be the SAME DOM element (hydrated, not recreated)'
        );
        assert.strictEqual(
            document.querySelector('.btn'), originalBtn,
            'button should be the SAME DOM element'
        );
        assert.strictEqual(
            document.querySelector('.title').textContent, 'Hello SSR',
            'content should be preserved'
        );

        // Verify VNode is connected to DOM
        assert(component.$mount, 'component should be mounted');
        assert.strictEqual(component.$mount.htmlElement, document.querySelector('.app-root'),
            'VNode should point to existing DOM element');

        // Verify no extra DOM nodes were created
        assert.strictEqual(
            document.querySelectorAll('.title').length, 1,
            'should have exactly 1 h1, not duplicated'
        );
        assert.strictEqual(
            document.querySelectorAll('.btn').length, 1,
            'should have exactly 1 button, not duplicated'
        );
    });

    it('reactive state works after hydration', () => {
        // Server render
        const saved = {};
        for (const k of ['window', 'document', 'localStorage', 'navigator', 'HTMLElement', 'HTMLInputElement']) {
            saved[k] = global[k];
            delete global[k];
        }

        const {Component, jsx, renderApp, reactive} = require('../dist/index.cjs');

        class Counter extends Component {
            render() {
                return jsx('div', null,
                    jsx('span', {className: 'val'}, '0'),
                    jsx('button', {className: 'add'}, '+')
                );
            }
        }

        let serverHtml;
        try {
            serverHtml = renderApp(Counter, 'root');
        } finally {
            for (const [k, v] of Object.entries(saved)) {
                if (v !== undefined) global[k] = v;
            }
        }

        // Client
        const inner = serverHtml.replace(/^<div id="root">/, '').replace(/<\/div>$/, '');
        const dom = new JSDOM(`<div id="root">${inner}</div>`, {url: 'http://localhost'});
        global.window = dom.window;
        global.document = dom.window.document;
        global.localStorage = dom.window.localStorage;
        global.navigator = dom.window.navigator;
        global.HTMLElement = dom.window.HTMLElement;
        global.HTMLInputElement = dom.window.HTMLInputElement;

        const {createApp} = require('../dist/index.cjs');
        const {app, component} = createApp(Counter, '#root');

        // Should be hydrated and functional
        assert.strictEqual(document.querySelector('.val').textContent, '0');
        assert(component.$mount, 'should be mounted');
        assert(!component._unmounted, 'should not be unmounted');
    });

    it('function components work with SSR', () => {
        const saved = {};
        for (const k of ['window', 'document', 'localStorage', 'navigator', 'HTMLElement', 'HTMLInputElement']) {
            saved[k] = global[k];
            delete global[k];
        }

        const {jsx, renderApp} = require('../dist/index.cjs');

        function Greeting() {
            return jsx('p', {className: 'greeting'}, 'Hello from function');
        }

        let serverHtml;
        try {
            serverHtml = renderApp(Greeting, 'root');
        } finally {
            for (const [k, v] of Object.entries(saved)) {
                if (v !== undefined) global[k] = v;
            }
        }

        assert(serverHtml.includes('Hello from function'), 'should render function component');

        // Client hydration
        const inner = serverHtml.replace(/^<div id="root">/, '').replace(/<\/div>$/, '');
        const dom = new JSDOM(`<div id="root">${inner}</div>`, {url: 'http://localhost'});
        global.window = dom.window;
        global.document = dom.window.document;
        global.localStorage = dom.window.localStorage;
        global.navigator = dom.window.navigator;
        global.HTMLElement = dom.window.HTMLElement;
        global.HTMLInputElement = dom.window.HTMLInputElement;

        const originalP = document.querySelector('.greeting');
        const {createApp} = require('../dist/index.cjs');
        createApp(Greeting, '#root');
        assert.strictEqual(document.querySelector('.greeting'), originalP, 'should hydrate, not recreate');
    });
});
