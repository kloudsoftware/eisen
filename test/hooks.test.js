const assert = require('assert');
const {JSDOM} = require('jsdom');
const {createApp, Component, reactive, jsx, useState, useEffect, useRef, useMemo, useCallback, useContext, createContext} = require('../dist/index.cjs');

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

describe('hooks', () => {
    describe('useState', () => {
        it('provides initial state on first render', () => {
            setup();
            let capturedCount;

            function Counter() {
                const [count] = useState(42);
                capturedCount = count;
                return jsx('span', null, String(count));
            }

            class App extends Component {
                render() { return jsx(Counter); }
            }

            const {app} = createApp(App, '#root');
            flush(app);
            assert.strictEqual(capturedCount, 42);
        });

        it('updates state and re-renders', () => {
            setup();
            let setter;
            let renderCount = 0;

            function Counter() {
                const [count, setCount] = useState(0);
                setter = setCount;
                renderCount++;
                return jsx('span', {className: 'count'}, String(count));
            }

            class App extends Component {
                render() { return jsx(Counter); }
            }

            const {app} = createApp(App, '#root');
            flush(app);
            assert.strictEqual(document.querySelector('.count').textContent, '0');

            setter(5);
            flush(app);
            assert.strictEqual(document.querySelector('.count').textContent, '5');
        });

        it('supports updater function', () => {
            setup();
            let increment;

            function Counter() {
                const [count, setCount] = useState(0);
                increment = () => setCount(c => c + 1);
                return jsx('span', {className: 'val'}, String(count));
            }

            class App extends Component {
                render() { return jsx(Counter); }
            }

            const {app} = createApp(App, '#root');
            flush(app);
            assert.strictEqual(document.querySelector('.val').textContent, '0');

            increment();
            flush(app);
            assert.strictEqual(document.querySelector('.val').textContent, '1');

            increment();
            flush(app);
            assert.strictEqual(document.querySelector('.val').textContent, '2');
        });

        it('skips re-render when setting same value', () => {
            setup();
            let setter;
            let renderCount = 0;

            function Counter() {
                const [count, setCount] = useState(10);
                setter = setCount;
                renderCount++;
                return jsx('span', null, String(count));
            }

            class App extends Component {
                render() { return jsx(Counter); }
            }

            createApp(App, '#root');
            const after1 = renderCount;

            setter(10); // same value
            // should not have triggered a dirty mark
            assert.strictEqual(renderCount, after1);
        });

        it('supports multiple useState calls', () => {
            setup();
            let setName, setAge;

            function Profile() {
                const [name, _setName] = useState('Alice');
                const [age, _setAge] = useState(30);
                setName = _setName;
                setAge = _setAge;
                return jsx('div', null,
                    jsx('span', {className: 'name'}, name),
                    jsx('span', {className: 'age'}, String(age))
                );
            }

            class App extends Component {
                render() { return jsx(Profile); }
            }

            const {app} = createApp(App, '#root');
            flush(app);
            assert.strictEqual(document.querySelector('.name').textContent, 'Alice');
            assert.strictEqual(document.querySelector('.age').textContent, '30');

            setName('Bob');
            flush(app);
            assert.strictEqual(document.querySelector('.name').textContent, 'Bob');
            assert.strictEqual(document.querySelector('.age').textContent, '30');

            setAge(25);
            flush(app);
            assert.strictEqual(document.querySelector('.age').textContent, '25');
        });
    });

    describe('useEffect', () => {
        it('runs effect after render', (done) => {
            setup();

            function Effectful() {
                useEffect(() => {
                    done();
                }, []);
                return jsx('div', null, 'hi');
            }

            class App extends Component {
                render() { return jsx(Effectful); }
            }

            const {app} = createApp(App, '#root');
            flush(app);
        });

        it('runs cleanup on re-effect', (done) => {
            setup();
            let setter;
            let cleanupCalled = false;

            function Effectful() {
                const [count, setCount] = useState(0);
                setter = setCount;
                useEffect(() => {
                    return () => { cleanupCalled = true; };
                }, [count]);
                return jsx('span', null, String(count));
            }

            class App extends Component {
                render() { return jsx(Effectful); }
            }

            const {app} = createApp(App, '#root');
            flush(app);

            // Let the first effect's microtask fire
            queueMicrotask(() => {
                setter(1);
                flush(app);
                // Let the cleanup + new effect microtask fire
                queueMicrotask(() => {
                    assert.strictEqual(cleanupCalled, true);
                    done();
                });
            });
        });

        it('skips effect when deps unchanged', (done) => {
            setup();
            let effectCount = 0;
            let setter;

            function Effectful() {
                const [count, setCount] = useState(0);
                const [other] = useState('stable');
                setter = setCount;
                useEffect(() => { effectCount++; }, [other]); // dep never changes
                return jsx('span', null, String(count));
            }

            class App extends Component {
                render() { return jsx(Effectful); }
            }

            const {app} = createApp(App, '#root');
            flush(app);

            // Let initial effect fire
            queueMicrotask(() => {
                const afterMount = effectCount;
                setter(1);
                flush(app);

                // Effect should not re-run since 'other' didn't change
                queueMicrotask(() => {
                    assert.strictEqual(effectCount, afterMount);
                    done();
                });
            });
        });
    });

    describe('useRef', () => {
        it('provides .el shorthand for DOM element', () => {
            setup();
            let ref;

            function WithRef() {
                ref = useRef();
                return jsx('input', {ref: ref, type: 'text', className: 'my-input'});
            }

            class App extends Component {
                render() { return jsx(WithRef); }
            }

            const {app} = createApp(App, '#root');
            flush(app);

            assert(ref.current, 'ref.current should be set');
            assert(ref.el instanceof HTMLInputElement, 'ref.el should be an HTMLInputElement');
        });
    });

    describe('useMemo', () => {
        it('returns cached value when deps unchanged', () => {
            setup();
            let setter;
            let factoryCount = 0;

            function App() {
                const [count, setCount] = useState(0);
                const [label] = useState('hello');
                setter = setCount;
                const upper = useMemo(() => { factoryCount++; return label.toUpperCase(); }, [label]);
                return jsx('div', null,
                    jsx('span', {className: 'memo'}, upper),
                    jsx('span', {className: 'count'}, String(count))
                );
            }

            const {app} = createApp(App, '#root');
            flush(app);
            assert.strictEqual(document.querySelector('.memo').textContent, 'HELLO');
            assert.strictEqual(factoryCount, 1);

            setter(1); // changes count, not label
            flush(app);
            assert.strictEqual(document.querySelector('.memo').textContent, 'HELLO');
            assert.strictEqual(factoryCount, 1); // factory should NOT re-run
        });

        it('recomputes when deps change', () => {
            setup();
            let setItems;
            let factoryCount = 0;

            function App() {
                const [items, _setItems] = useState([3, 1, 2]);
                setItems = _setItems;
                const sorted = useMemo(() => { factoryCount++; return [...items].sort(); }, [items]);
                return jsx('span', {className: 'sorted'}, sorted.join(','));
            }

            const {app} = createApp(App, '#root');
            flush(app);
            assert.strictEqual(factoryCount, 1);

            const newItems = [5, 4];
            setItems(newItems);
            flush(app);
            assert.strictEqual(factoryCount, 2);
            assert.strictEqual(document.querySelector('.sorted').textContent, '4,5');
        });
    });

    describe('useCallback', () => {
        it('returns same function reference when deps unchanged', () => {
            setup();
            let setter;
            let callbacks = [];

            function App() {
                const [count, setCount] = useState(0);
                setter = setCount;
                const cb = useCallback(() => 'hi', []);
                callbacks.push(cb);
                return jsx('span', null, String(count));
            }

            const {app} = createApp(App, '#root');
            flush(app);

            setter(1);
            flush(app);

            assert.strictEqual(callbacks.length, 2);
            assert.strictEqual(callbacks[0], callbacks[1], 'should return same reference');
        });
    });

    describe('useContext', () => {
        it('returns default value when no provider', () => {
            setup();
            const ThemeCtx = createContext('light');
            let captured;

            function Child() {
                captured = useContext(ThemeCtx);
                return jsx('span', null, captured);
            }

            class App extends Component {
                render() { return jsx(Child); }
            }

            const {app} = createApp(App, '#root');
            flush(app);
            assert.strictEqual(captured, 'light');
        });

        it('reads value from parent provider', () => {
            setup();
            const ThemeCtx = createContext('light');
            let captured;

            function Child() {
                captured = useContext(ThemeCtx);
                return jsx('span', {className: 'theme'}, captured);
            }

            class App extends Component {
                constructor(app) {
                    super(app);
                    this.provide(ThemeCtx, 'dark');
                }
                render() { return jsx(Child); }
            }

            const {app} = createApp(App, '#root');
            flush(app);
            assert.strictEqual(captured, 'dark');
        });
    });

    describe('createApp with render function', () => {
        it('accepts a plain function instead of a class', () => {
            setup();

            function MyApp() {
                return jsx('h1', {className: 'title'}, 'Hello');
            }

            const {app} = createApp(MyApp, '#root');
            flush(app);
            assert.strictEqual(document.querySelector('.title').textContent, 'Hello');
        });

        it('supports useState in a function-based createApp', () => {
            setup();
            let setter;

            function MyApp() {
                const [count, setCount] = useState(0);
                setter = setCount;
                return jsx('span', {className: 'c'}, String(count));
            }

            const {app} = createApp(MyApp, '#root');
            flush(app);
            assert.strictEqual(document.querySelector('.c').textContent, '0');

            setter(99);
            flush(app);
            assert.strictEqual(document.querySelector('.c').textContent, '99');
        });
    });
});
