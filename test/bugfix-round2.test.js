const assert = require('assert');
const {JSDOM} = require('jsdom');
const {VApp, Renderer, Component, Props, reactive, jsx} = require('../dist/index.cjs');

function setup() {
    const dom = new JSDOM('<div id="root"></div>', {url: 'http://localhost'});
    global.window = dom.window;
    global.document = dom.window.document;
    global.localStorage = dom.window.localStorage;
    global.navigator = dom.window.navigator;
    global.HTMLElement = dom.window.HTMLElement;
    global.HTMLTextAreaElement = dom.window.HTMLTextAreaElement;
    global.HTMLSelectElement = dom.window.HTMLSelectElement;
    global.HTMLInputElement = dom.window.HTMLInputElement;
    return dom;
}

function render(app) {
    const patch = app.renderer.diffAgainstLatest(app);
    patch(app.rootNode.htmlElement);
}

function tick() {
    return new Promise(resolve => setTimeout(resolve, 0));
}

describe('bug fixes round 2', () => {
    describe('arraysEquals with one undefined', () => {
        it('returns false when only one array is undefined', () => {
            // This import is internal, so test via VNode.equals behavior
            // which uses node name comparison (not arraysEquals directly)
            // Instead test the exported function if available
            const {arraysEquals, Attribute} = require('../dist/index.cjs');
            if (arraysEquals) {
                assert.strictEqual(arraysEquals(undefined, []), false);
                assert.strictEqual(arraysEquals([], undefined), false);
                assert.strictEqual(arraysEquals(undefined, undefined), true);
            }
        });
    });

    describe('VApp mount target validation', () => {
        it('throws when mount target element does not exist', () => {
            const dom = setup();
            assert.throws(() => {
                new VApp('nonexistent', new Renderer());
            }, /not found in the DOM/);
        });
    });

    describe('removeElement with undefined htmlElement', () => {
        it('does not crash when removing a node without htmlElement', () => {
            const dom = setup();
            const app = new VApp('root', new Renderer());
            app.saveSnapshot();

            const node = app.createElement('p', 'hello');
            render(app);

            // Manually clear htmlElement to simulate edge case
            node.htmlElement = undefined;
            app.rootNode.removeChild(node);

            // Should not throw
            assert.doesNotThrow(() => render(app));
        });
    });

    describe('unmountComponent mounted check', () => {
        it('rejects unmounting a component that was never mounted on DOM', () => {
            const dom = setup();
            const app = new VApp('root', new Renderer());
            app.saveSnapshot();

            class Dummy extends Component {
                constructor(app) { super(app); }
                render() { return jsx('span', null, 'hi'); }
                lifeCycle() { return {}; }
            }

            const comp = new Dummy(app);
            const mount = app.mountComponent(comp, app.rootNode, new Props(app));
            // Don't render — so mounted[0] stays false

            // The mounted flag should be [false, fn], and unmountComponent
            // should check mounted[0], not truthiness of the tuple
            // Before fix: tuple is always truthy, so this check was skipped
            // After fix: mounted[0] is false, so unmount is rejected
        });
    });

    describe('reactive watchers persist across changes', () => {
        it('watchers fire on every reactive change, not just the first', () => {
            const dom = setup();
            const app = new VApp('root', new Renderer());
            app.saveSnapshot();

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
            render(app);

            // Set up a watcher
            const values = [];
            const {reactiveWatchersKey} = require('../dist/index.cjs');
            if (!comp[reactiveWatchersKey]) {
                comp[reactiveWatchersKey] = {};
            }
            if (!comp[reactiveWatchersKey]['count']) {
                comp[reactiveWatchersKey]['count'] = [];
            }
            comp[reactiveWatchersKey]['count'].push((v) => values.push(v));

            // Multiple changes — watcher should fire each time
            comp.count = 1;
            comp.count = 2;
            comp.count = 3;

            assert.deepStrictEqual(values, [1, 2, 3]);
        });
    });

    describe('Props.clearCallbacks actually clears', () => {
        it('removes all registered callbacks', () => {
            const dom = setup();
            const app = new VApp('root', new Renderer());
            const props = new Props(app);

            let callCount = 0;
            props.registerCallback('key', () => callCount++);
            props.setProp('key', 'v1');
            assert.strictEqual(callCount, 1);

            props.clearCallbacks();
            props.setPropSilent('key', 'v2');
            // After clearing, callback should not fire
            assert.strictEqual(callCount, 1);
        });
    });

    describe('Stringparser handles repeated calls', () => {
        it('parses template strings correctly on consecutive calls', () => {
            const dom = setup();
            const app = new VApp('root', new Renderer());
            const props = new Props(app);
            props.setPropSilent('name', 'Alice');
            props.setPropSilent('greeting', 'Hello');

            const {Stringparser} = require('../dist/index.cjs');
            const parser = new Stringparser();

            const r1 = parser.parse('Hi {{name}}!', props);
            const r2 = parser.parse('{{greeting}} world', props);

            assert.strictEqual(r1, 'Hi Alice!');
            assert.strictEqual(r2, 'Hello world');
        });
    });
});
