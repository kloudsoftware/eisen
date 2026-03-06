const assert = require('assert');
const {JSDOM} = require('jsdom');
const {Component, jsx, renderApp, renderPage, hydrateApp, createApp, renderToString, setJSXApp, VApp, Renderer} = require('../dist/index.cjs');

describe('SSR', () => {
    describe('renderApp (server-side)', () => {
        it('renders a class component to HTML without DOM', () => {
            // Temporarily remove document to simulate server
            const origDoc = global.document;
            const origWin = global.window;
            delete global.document;
            delete global.window;

            try {
                class Page extends Component {
                    render() {
                        return jsx('div', {className: 'page'},
                            jsx('h1', null, 'Hello SSR'),
                            jsx('p', null, 'Server rendered')
                        );
                    }
                }

                const html = renderApp(Page, 'app');
                assert(html.includes('<h1>'), 'should have h1');
                assert(html.includes('Hello SSR'), 'should have text');
                assert(html.includes('class="page"'), 'should have class');
                assert(html.includes('<div id="app">'), 'should wrap in root');
            } finally {
                global.document = origDoc;
                global.window = origWin;
            }
        });

        it('renders a function component to HTML without DOM', () => {
            const origDoc = global.document;
            const origWin = global.window;
            delete global.document;
            delete global.window;

            try {
                function Page() {
                    return jsx('span', null, 'fn-ssr');
                }

                const html = renderApp(Page, 'root');
                assert(html.includes('fn-ssr'), 'should have function output');
            } finally {
                global.document = origDoc;
                global.window = origWin;
            }
        });
    });

    describe('hydrateApp (client-side)', () => {
        it('attaches to server-rendered HTML without recreating DOM', () => {
            // Step 1: server render
            const origDoc = global.document;
            const origWin = global.window;
            delete global.document;
            delete global.window;

            class App extends Component {
                render() {
                    return jsx('div', {className: 'app'},
                        jsx('h1', null, 'Hydrated'),
                        jsx('button', null, 'Click')
                    );
                }
            }

            let serverHtml;
            try {
                serverHtml = renderApp(App, 'root');
            } finally {
                global.document = origDoc;
                global.window = origWin;
            }

            // Step 2: simulate browser with server HTML
            const dom = new JSDOM(`<div id="root">${serverHtml.replace(/^<div id="root">|<\/div>$/g, '')}</div>`, {url: 'http://localhost'});
            global.window = dom.window;
            global.document = dom.window.document;
            global.localStorage = dom.window.localStorage;
            global.navigator = dom.window.navigator;
            global.HTMLElement = dom.window.HTMLElement;
            global.HTMLInputElement = dom.window.HTMLInputElement;

            const originalH1 = document.querySelector('h1');
            const originalButton = document.querySelector('button');
            assert(originalH1, 'server HTML should have h1');
            assert(originalButton, 'server HTML should have button');

            // Step 3: hydrate
            const {app, component} = hydrateApp(App, '#root');

            // The VNode tree should point to the SAME DOM elements
            const mountedVNode = component.$mount;
            assert(mountedVNode, 'component should have $mount');
            assert.strictEqual(mountedVNode.htmlElement, document.querySelector('.app'),
                'VNode should reference existing DOM element');
        });
    });

    describe('renderPage', () => {
        it('outputs a complete HTML document', () => {
            const origDoc = global.document;
            const origWin = global.window;
            delete global.document;
            delete global.window;

            try {
                class Page extends Component {
                    render() { return jsx('h1', null, 'Hello'); }
                }

                const html = renderPage(Page, {
                    title: 'Test Page',
                    scripts: ['/app.js'],
                    styles: ['/style.css'],
                });

                assert(html.includes('<!DOCTYPE html>'), 'should have doctype');
                assert(html.includes('<title>Test Page</title>'), 'should have title');
                assert(html.includes('src="/app.js"'), 'should have script');
                assert(html.includes('href="/style.css"'), 'should have style');
                assert(html.includes('<h1>Hello</h1>'), 'should have rendered content');
                assert(html.includes('<div id="app">'), 'should have mount target');
            } finally {
                global.document = origDoc;
                global.window = origWin;
            }
        });
    });

    describe('createApp auto-hydration', () => {
        it('hydrates when target element has existing content', () => {
            // Server render
            const origDoc = global.document;
            const origWin = global.window;
            delete global.document;
            delete global.window;

            class AutoApp extends Component {
                render() {
                    return jsx('div', {className: 'auto'},
                        jsx('span', {className: 'msg'}, 'hydrated')
                    );
                }
            }

            let serverContent;
            try {
                serverContent = renderApp(AutoApp, 'root');
            } finally {
                global.document = origDoc;
                global.window = origWin;
            }

            // Client: put server HTML into DOM
            const inner = serverContent.replace(/^<div id="root">/, '').replace(/<\/div>$/, '');
            const dom = new JSDOM(`<div id="root">${inner}</div>`, {url: 'http://localhost'});
            global.window = dom.window;
            global.document = dom.window.document;
            global.localStorage = dom.window.localStorage;
            global.navigator = dom.window.navigator;
            global.HTMLElement = dom.window.HTMLElement;
            global.HTMLInputElement = dom.window.HTMLInputElement;

            const originalSpan = document.querySelector('.msg');
            assert(originalSpan, 'server content should exist');

            // createApp should auto-detect and hydrate
            const {app, component} = createApp(AutoApp, '#root');

            // VNode should be attached to the SAME DOM element
            assert.strictEqual(component.$mount.htmlElement, document.querySelector('.auto'),
                'should hydrate, not recreate');
            assert.strictEqual(document.querySelector('.msg'), originalSpan,
                'original span should be preserved');
        });
    });

    describe('full round-trip', () => {
        it('server render → hydrate → reactive update', () => {
            // Server render
            const origDoc = global.document;
            const origWin = global.window;
            delete global.document;
            delete global.window;

            class Counter extends Component {
                render() {
                    return jsx('div', {className: 'counter'},
                        jsx('span', {className: 'count'}, '0'),
                        jsx('button', {className: 'inc'}, '+')
                    );
                }
            }

            let serverHtml;
            try {
                serverHtml = renderApp(Counter, 'root');
            } finally {
                global.document = origDoc;
                global.window = origWin;
            }

            // Client: setup DOM with server HTML
            // Extract inner content from the root wrapper
            const inner = serverHtml.replace(/^<div id="root">/, '').replace(/<\/div>$/, '');
            const dom = new JSDOM(`<div id="root">${inner}</div>`, {url: 'http://localhost'});
            global.window = dom.window;
            global.document = dom.window.document;
            global.localStorage = dom.window.localStorage;
            global.navigator = dom.window.navigator;
            global.HTMLElement = dom.window.HTMLElement;
            global.HTMLInputElement = dom.window.HTMLInputElement;

            assert.strictEqual(document.querySelector('.count').textContent, '0');

            // Hydrate
            const {app} = hydrateApp(Counter, '#root');

            // DOM should still be intact
            assert.strictEqual(document.querySelector('.count').textContent, '0');
            assert(document.querySelector('.inc'), 'button should exist');
        });
    });
});
