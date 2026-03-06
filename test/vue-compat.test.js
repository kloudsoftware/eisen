const assert = require('assert');
const {JSDOM} = require('jsdom');
const {
    createApp, Component, jsx, reactive, useState,
    watch, watchEffect, nextTick,
    Toggle, Dynamic, Slot, createKeepAlive
} = require('../dist/index.cjs');

let dom;
function setup() {
    dom = new JSDOM('<div id="root"></div>', {url: 'http://localhost'});
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

describe('Vue compatibility features', () => {
    describe('watch', () => {
        it('fires callback when watched value changes', (done) => {
            let value = 1;
            const stop = watch(
                () => value,
                (newVal, oldVal) => {
                    assert.strictEqual(newVal, 2);
                    assert.strictEqual(oldVal, 1);
                    stop();
                    done();
                }
            );
            value = 2;
            // Trigger the check via microtask
            queueMicrotask(() => {});
        });

        it('supports immediate option', () => {
            let called = false;
            const stop = watch(
                () => 42,
                (newVal) => { called = true; assert.strictEqual(newVal, 42); },
                { immediate: true }
            );
            assert.strictEqual(called, true);
            stop();
        });

        it('stop function prevents further callbacks', (done) => {
            let value = 1;
            let callCount = 0;
            const stop = watch(
                () => value,
                () => { callCount++; }
            );
            stop();
            value = 2;
            queueMicrotask(() => {
                assert.strictEqual(callCount, 0);
                done();
            });
        });
    });

    describe('watchEffect', () => {
        it('runs immediately', () => {
            let ran = false;
            const stop = watchEffect(() => { ran = true; });
            assert.strictEqual(ran, true);
            stop();
        });

        it('cleanup runs on stop', () => {
            let cleaned = false;
            const stop = watchEffect(() => {
                return () => { cleaned = true; };
            });
            assert.strictEqual(cleaned, false);
            stop();
            assert.strictEqual(cleaned, true);
        });
    });

    describe('nextTick', () => {
        it('resolves after microtask', async () => {
            let resolved = false;
            const p = nextTick().then(() => { resolved = true; });
            assert.strictEqual(resolved, false);
            await p;
            assert.strictEqual(resolved, true);
        });
    });

    describe('event modifiers', () => {
        it('onClick_prevent calls preventDefault', () => {
            setup();
            let clicked = false;
            let defaultPrevented = false;

            class App extends Component {
                render() {
                    return jsx('button', {
                        className: 'btn',
                        onClick_prevent: () => { clicked = true; }
                    }, 'Click');
                }
            }

            const {app} = createApp(App, '#root');
            flush(app);

            const btn = document.querySelector('.btn');
            const event = new dom.window.Event('click', {bubbles: true});
            const origPreventDefault = event.preventDefault.bind(event);
            event.preventDefault = () => { defaultPrevented = true; origPreventDefault(); };
            btn.dispatchEvent(event);

            assert.strictEqual(clicked, true, 'handler should fire');
            assert.strictEqual(defaultPrevented, true, 'preventDefault should be called');
        });

        it('onClick_stop calls stopPropagation', () => {
            setup();
            let stopped = false;

            class App extends Component {
                render() {
                    return jsx('div', null,
                        jsx('button', {
                            className: 'inner',
                            onClick_stop: () => {}
                        }, 'Click')
                    );
                }
            }

            const {app} = createApp(App, '#root');
            flush(app);

            const btn = document.querySelector('.inner');
            const event = new dom.window.Event('click', {bubbles: true});
            const origStop = event.stopPropagation.bind(event);
            event.stopPropagation = () => { stopped = true; origStop(); };
            btn.dispatchEvent(event);

            assert.strictEqual(stopped, true, 'stopPropagation should be called');
        });

        it('onClick_once fires only once', () => {
            setup();
            let count = 0;

            class App extends Component {
                render() {
                    return jsx('button', {
                        className: 'once-btn',
                        onClick_once: () => { count++; }
                    }, 'Click');
                }
            }

            const {app} = createApp(App, '#root');
            flush(app);

            const btn = document.querySelector('.once-btn');
            btn.dispatchEvent(new dom.window.Event('click', {bubbles: true}));
            btn.dispatchEvent(new dom.window.Event('click', {bubbles: true}));
            btn.dispatchEvent(new dom.window.Event('click', {bubbles: true}));

            assert.strictEqual(count, 1, 'should only fire once');
        });
    });

    describe('Toggle (v-show)', () => {
        it('hides element with display:none when false', () => {
            setup();

            function App() {
                return jsx(Toggle, {when: false},
                    jsx('div', {className: 'panel'}, 'hidden')
                );
            }

            const {app} = createApp(App, '#root');
            flush(app);

            const panel = document.querySelector('.panel');
            assert(panel, 'element should exist in DOM');
            assert(panel.getAttribute('style').includes('display:none'), 'should have display:none');
        });

        it('shows element normally when true', () => {
            setup();

            function App() {
                return jsx(Toggle, {when: true},
                    jsx('div', {className: 'visible'}, 'shown')
                );
            }

            const {app} = createApp(App, '#root');
            flush(app);

            const el = document.querySelector('.visible');
            assert(el, 'element should exist');
            const style = el.getAttribute('style') || '';
            assert(!style.includes('display:none'), 'should not have display:none');
        });
    });

    describe('Dynamic component', () => {
        it('renders different tags based on is prop', () => {
            setup();

            function App() {
                return jsx('div', null,
                    jsx(Dynamic, {is: 'h1', className: 'dynamic'}, 'Title'),
                    jsx(Dynamic, {is: 'p', className: 'dynamic'}, 'Paragraph')
                );
            }

            const {app} = createApp(App, '#root');
            flush(app);

            assert.strictEqual(document.querySelector('h1.dynamic').textContent, 'Title');
            assert.strictEqual(document.querySelector('p.dynamic').textContent, 'Paragraph');
        });

        it('renders functional components via is', () => {
            setup();

            function Greeting(props) {
                return jsx('span', {className: 'greet'}, `Hi ${props.name}`);
            }

            function App() {
                return jsx(Dynamic, {is: Greeting, name: 'World'});
            }

            const {app} = createApp(App, '#root');
            flush(app);

            assert.strictEqual(document.querySelector('.greet').textContent, 'Hi World');
        });
    });

    describe('Slot', () => {
        it('renders default slot from children', () => {
            setup();

            function Card(props, children) {
                return jsx('div', {className: 'card'},
                    jsx(Slot, {of: props})
                );
            }

            function App() {
                return jsx(Card, null, jsx('p', null, 'body content'));
            }

            const {app} = createApp(App, '#root');
            flush(app);

            assert(document.querySelector('.card p'), 'should render children');
            assert.strictEqual(document.querySelector('.card p').textContent, 'body content');
        });

        it('renders named slots from props', () => {
            setup();

            function Layout(props, children) {
                return jsx('div', {className: 'layout'},
                    jsx('header', null, jsx(Slot, {of: props, name: 'header', fallback: jsx('span', null, 'default header')})),
                    jsx('main', null, jsx(Slot, {of: props})),
                    jsx('footer', null, jsx(Slot, {of: props, name: 'footer'}))
                );
            }

            function App() {
                return jsx(Layout, {
                    header: jsx('h1', null, 'Custom Header'),
                    footer: jsx('small', null, 'Custom Footer')
                }, jsx('p', null, 'Main content'));
            }

            const {app} = createApp(App, '#root');
            flush(app);

            assert.strictEqual(document.querySelector('header h1').textContent, 'Custom Header');
            assert.strictEqual(document.querySelector('main p').textContent, 'Main content');
            assert.strictEqual(document.querySelector('footer small').textContent, 'Custom Footer');
        });

        it('renders fallback when slot is not provided', () => {
            setup();

            function Card(props, children) {
                return jsx('div', null,
                    jsx(Slot, {of: props, name: 'header', fallback: jsx('span', {className: 'fb'}, 'fallback')})
                );
            }

            function App() {
                return jsx(Card, null);
            }

            const {app} = createApp(App, '#root');
            flush(app);

            assert.strictEqual(document.querySelector('.fb').textContent, 'fallback');
        });
    });

    describe('createKeepAlive', () => {
        it('caches and returns the same VNode for the same key', () => {
            setup();
            const cache = createKeepAlive();

            const node1 = cache.render('tab1', () => jsx('div', null, 'Tab 1'));
            const node2 = cache.render('tab2', () => jsx('div', null, 'Tab 2'));
            const node1again = cache.render('tab1', () => jsx('div', null, 'Should not create'));

            assert.strictEqual(node1, node1again, 'should return cached VNode');
            assert.notStrictEqual(node1, node2, 'different keys should be different');
        });

        it('drop removes a cached entry', () => {
            setup();
            const cache = createKeepAlive();

            const node1 = cache.render('a', () => jsx('div', null, 'A'));
            cache.drop('a');
            const node2 = cache.render('a', () => jsx('div', null, 'A2'));

            assert.notStrictEqual(node1, node2, 'should create new VNode after drop');
        });

        it('clear removes all entries', () => {
            setup();
            const cache = createKeepAlive();

            const n1 = cache.render('x', () => jsx('div', null, 'X'));
            const n2 = cache.render('y', () => jsx('div', null, 'Y'));
            cache.clear();

            const n1b = cache.render('x', () => jsx('div', null, 'X2'));
            assert.notStrictEqual(n1, n1b, 'should create fresh after clear');
        });
    });
});
