const assert = require('assert');
const {JSDOM} = require('jsdom');
const {createApp, createStore, Component, jsx, useState} = require('../dist/index.cjs');

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

describe('createStore', () => {
    it('provides initial state', () => {
        const useStore = createStore((set) => ({
            count: 0,
            increment: () => set(s => ({ count: s.count + 1 })),
        }));

        const state = useStore.getState();
        assert.strictEqual(state.count, 0);
        assert.strictEqual(typeof state.increment, 'function');
    });

    it('updates state via setState', () => {
        const useStore = createStore((set) => ({
            count: 0,
            increment: () => set(s => ({ count: s.count + 1 })),
        }));

        useStore.getState().increment();
        assert.strictEqual(useStore.getState().count, 1);

        useStore.getState().increment();
        assert.strictEqual(useStore.getState().count, 2);
    });

    it('accepts partial object in setState', () => {
        const useStore = createStore(() => ({
            name: 'Alice',
            age: 30,
        }));

        useStore.setState({ name: 'Bob' });
        assert.strictEqual(useStore.getState().name, 'Bob');
        assert.strictEqual(useStore.getState().age, 30);
    });

    it('notifies subscribers on state change', () => {
        const useStore = createStore((set) => ({
            value: 'a',
            update: (v) => set({ value: v }),
        }));

        let notified = 0;
        useStore.subscribe(() => notified++);

        useStore.getState().update('b');
        assert.strictEqual(notified, 1);

        useStore.getState().update('c');
        assert.strictEqual(notified, 2);
    });

    it('unsubscribe stops notifications', () => {
        const useStore = createStore((set) => ({
            value: 0,
        }));

        let notified = 0;
        const unsub = useStore.subscribe(() => notified++);

        useStore.setState({ value: 1 });
        assert.strictEqual(notified, 1);

        unsub();
        useStore.setState({ value: 2 });
        assert.strictEqual(notified, 1);
    });

    it('re-renders component when store changes', () => {
        setup();

        const useCounter = createStore((set) => ({
            count: 0,
            increment: () => set(s => ({ count: s.count + 1 })),
        }));

        function Counter() {
            const { count } = useCounter();
            return jsx('span', { className: 'count' }, String(count));
        }

        class App extends Component {
            render() { return jsx(Counter); }
        }

        const { app } = createApp(App, '#root');
        flush(app);
        assert.strictEqual(document.querySelector('.count').textContent, '0');

        useCounter.getState().increment();
        flush(app);
        assert.strictEqual(document.querySelector('.count').textContent, '1');
    });
});
