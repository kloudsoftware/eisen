const assert = require('assert');
const {JSDOM} = require('jsdom');
const {createApp, Component, jsx, reactive, _hmrAccept, _hmrAcceptFn, _hmrTrackFn} = require('../dist/index.cjs');

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

describe('HMR', () => {
    describe('class components', () => {
        it('swaps render method and preserves reactive state', () => {
            setup();

            class HmrCounter extends Component {
                render() {
                    return jsx('span', {className: 'out'}, 'v1');
                }
            }

            const {app, component} = createApp(HmrCounter, '#root');
            flush(app);
            assert.strictEqual(document.querySelector('.out').textContent, 'v1');

            // Simulate HMR: new version with different render
            class HmrCounter2 extends Component {
                render() {
                    return jsx('span', {className: 'out'}, 'v2');
                }
            }
            // Make it look like the same class by using same name
            Object.defineProperty(HmrCounter2, 'name', {value: 'HmrCounter'});

            _hmrAccept('test-module', HmrCounter2);
            flush(app);
            assert.strictEqual(document.querySelector('.out').textContent, 'v2');

            // Same component instance — state preserved
            assert.strictEqual(component._unmounted, false);
        });

        it('does not affect unmounted components', () => {
            setup();

            class HmrWidget extends Component {
                render() {
                    return jsx('div', null, 'widget-v1');
                }
            }

            const {app, component} = createApp(HmrWidget, '#root');
            flush(app);

            // Simulate unmount
            component._unmounted = true;

            class HmrWidget2 extends Component {
                render() {
                    return jsx('div', null, 'widget-v2');
                }
            }
            Object.defineProperty(HmrWidget2, 'name', {value: 'HmrWidget'});

            // Should not crash
            _hmrAccept('test-module-2', HmrWidget2);
        });
    });

    describe('functional components', () => {
        it('swaps function and re-renders', () => {
            setup();

            function MyView() {
                return jsx('p', {className: 'view'}, 'fn-v1');
            }

            const {app, component} = createApp(MyView, '#root');
            flush(app);
            assert.strictEqual(document.querySelector('.view').textContent, 'fn-v1');

            // Register for HMR tracking
            _hmrTrackFn('fn-module', component);

            // Simulate hot update
            function MyView2() {
                return jsx('p', {className: 'view'}, 'fn-v2');
            }

            _hmrAcceptFn('fn-module', MyView2);
            flush(app);
            assert.strictEqual(document.querySelector('.view').textContent, 'fn-v2');
        });
    });
});
