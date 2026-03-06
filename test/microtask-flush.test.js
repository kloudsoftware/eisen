const assert = require('assert');
const {JSDOM} = require('jsdom');
const {VApp, Renderer, Component, Props, reactive} = require('../dist/index.cjs');

function setup() {
    const dom = new JSDOM('<div id="root"></div>', {url: 'http://localhost'});
    global.window = dom.window;
    global.document = dom.window.document;
    global.localStorage = dom.window.localStorage;
    global.navigator = dom.window.navigator;
    global.HTMLElement = dom.window.HTMLElement;
    return dom;
}

// Drain all pending microtasks
function tick() {
    return new Promise(resolve => setTimeout(resolve, 0));
}

describe('microtask-based flush', () => {
    it('auto-renders when component is mounted after init()', async () => {
        const dom = setup();
        const app = new VApp('root', new Renderer());
        app.init();

        class Counter extends Component {
            constructor(app) {
                super(app);
                this.count = 0;
            }
            render() {
                return jsx('span', null, String(this.count));
            }
            lifeCycle() { return {}; }
        }
        reactive()(Counter.prototype, 'count');

        const comp = new Counter(app);
        app.mountComponent(comp, app.rootNode, new Props(app));

        // mountComponent calls notifyDirty which schedules a flush
        await tick();

        const root = dom.window.document.getElementById('root');
        assert.strictEqual(root.querySelector('span').textContent, '0');

        // Reactive change triggers auto-flush
        comp.count = 42;
        await tick();

        assert.strictEqual(root.querySelector('span').textContent, '42');
    });

    it('batches multiple synchronous state changes into one DOM update', async () => {
        const dom = setup();
        const app = new VApp('root', new Renderer());
        app.init();

        class Multi extends Component {
            constructor(app) {
                super(app);
                this.a = 0;
                this.b = 0;
            }
            render() {
                return jsx('span', null, this.a + ':' + this.b);
            }
            lifeCycle() { return {}; }
        }
        reactive()(Multi.prototype, 'a');
        reactive()(Multi.prototype, 'b');

        const comp = new Multi(app);
        app.mountComponent(comp, app.rootNode, new Props(app));
        await tick();

        // Two synchronous state changes — only one DOM flush
        comp.a = 1;
        comp.b = 2;
        await tick();

        const root = dom.window.document.getElementById('root');
        assert.strictEqual(root.querySelector('span').textContent, '1:2');
    });

    it('does not auto-flush before init() is called', async () => {
        const dom = setup();
        const app = new VApp('root', new Renderer());

        // Build tree before init
        app.createElement('p', 'hello');
        await tick();

        const root = dom.window.document.getElementById('root');
        // No auto-render — init() hasn't been called
        assert.strictEqual(root.querySelector('p'), null);
    });

    it('auto-flushes tree built after init()', async () => {
        const dom = setup();
        const app = new VApp('root', new Renderer());
        app.init();

        app.createElement('p', 'hello');
        await tick();

        const root = dom.window.document.getElementById('root');
        assert.strictEqual(root.querySelector('p').textContent, 'hello');
    });
});
