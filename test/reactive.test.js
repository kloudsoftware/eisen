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
    return dom;
}

function render(app) {
    const patch = app.renderer.diffAgainstLatest(app);
    patch(app.rootNode.htmlElement);
}

function tick() {
    return new Promise(resolve => setTimeout(resolve, 0));
}

describe('reactive decorator', () => {
    describe('batching', () => {
        it('calls render() only once when multiple reactive properties change', () => {
            const dom = setup();
            const app = new VApp('root', new Renderer());
            app.saveSnapshot();

            let renderCount = 0;

            class Multi extends Component {
                constructor(app) {
                    super(app);
                    this.x = 0;
                    this.y = 0;
                }
                render() {
                    renderCount++;
                    return jsx('span', null, this.x + ':' + this.y);
                }
                lifeCycle() { return {}; }
            }
            reactive()(Multi.prototype, 'x');
            reactive()(Multi.prototype, 'y');

            const comp = new Multi(app);
            app.mountComponent(comp, app.rootNode, new Props(app));
            render(app);
            const initialRenderCount = renderCount;

            // Change both properties synchronously
            comp.x = 1;
            comp.y = 2;

            // Trigger render — flushDirtyComponents should batch
            render(app);

            // render() should only have been called once for both changes
            assert.strictEqual(renderCount, initialRenderCount + 1);

            const root = dom.window.document.getElementById('root');
            assert.strictEqual(root.querySelector('span').textContent, '1:2');
        });

        it('batches via microtask flush too', async () => {
            const dom = setup();
            const app = new VApp('root', new Renderer());
            app.init();

            let renderCount = 0;

            class Multi extends Component {
                constructor(app) {
                    super(app);
                    this.a = 0;
                    this.b = 0;
                }
                render() {
                    renderCount++;
                    return jsx('span', null, this.a + ':' + this.b);
                }
                lifeCycle() { return {}; }
            }
            reactive()(Multi.prototype, 'a');
            reactive()(Multi.prototype, 'b');

            const comp = new Multi(app);
            app.mountComponent(comp, app.rootNode, new Props(app));
            await tick();
            const afterMount = renderCount;

            comp.a = 10;
            comp.b = 20;
            await tick();

            // Only one rerender for both changes
            assert.strictEqual(renderCount, afterMount + 1);

            const root = dom.window.document.getElementById('root');
            assert.strictEqual(root.querySelector('span').textContent, '10:20');
        });
    });

    describe('skip before mount', () => {
        it('does not call rerender during constructor property assignment', () => {
            const dom = setup();
            const app = new VApp('root', new Renderer());
            app.saveSnapshot();

            let renderCount = 0;

            class Counter extends Component {
                constructor(app) {
                    super(app);
                    this.count = 0; // This triggers the setter
                }
                render() {
                    renderCount++;
                    return jsx('span', null, String(this.count));
                }
                lifeCycle() { return {}; }
            }
            reactive()(Counter.prototype, 'count');

            // Constructor assignment should NOT trigger rerender
            const comp = new Counter(app);
            assert.strictEqual(renderCount, 0);

            app.mountComponent(comp, app.rootNode, new Props(app));
            render(app);
            assert.strictEqual(renderCount, 1);
        });
    });

    describe('deduplication', () => {
        it('skips rerender when setting the same value', () => {
            const dom = setup();
            const app = new VApp('root', new Renderer());
            app.saveSnapshot();

            let renderCount = 0;

            class Counter extends Component {
                constructor(app) {
                    super(app);
                    this.count = 5;
                }
                render() {
                    renderCount++;
                    return jsx('span', null, String(this.count));
                }
                lifeCycle() { return {}; }
            }
            reactive()(Counter.prototype, 'count');

            const comp = new Counter(app);
            app.mountComponent(comp, app.rootNode, new Props(app));
            render(app);
            const afterFirst = renderCount;

            // Set same value — should not trigger rerender
            comp.count = 5;
            render(app);
            assert.strictEqual(renderCount, afterFirst);
        });
    });

    describe('custom equality', () => {
        it('uses custom equals function to determine if value changed', () => {
            const dom = setup();
            const app = new VApp('root', new Renderer());
            app.saveSnapshot();

            let renderCount = 0;

            // Custom equality: compare arrays by length
            const sameLength = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length;

            class ListComp extends Component {
                constructor(app) {
                    super(app);
                    this.items = ['a', 'b'];
                }
                render() {
                    renderCount++;
                    return jsx('span', null, this.items.join(','));
                }
                lifeCycle() { return {}; }
            }
            reactive(sameLength)(ListComp.prototype, 'items');

            const comp = new ListComp(app);
            app.mountComponent(comp, app.rootNode, new Props(app));
            render(app);
            const afterFirst = renderCount;

            // Set different array with same length — custom equals says "same"
            comp.items = ['c', 'd'];
            render(app);
            assert.strictEqual(renderCount, afterFirst);

            // Set array with different length — custom equals says "different"
            comp.items = ['e', 'f', 'g'];
            render(app);
            assert.strictEqual(renderCount, afterFirst + 1);

            const root = dom.window.document.getElementById('root');
            assert.strictEqual(root.querySelector('span').textContent, 'e,f,g');
        });
    });

    describe('array mutation tracking', () => {
        it('triggers rerender on push', () => {
            const dom = setup();
            const app = new VApp('root', new Renderer());
            app.saveSnapshot();

            let renderCount = 0;

            class List extends Component {
                constructor(app) {
                    super(app);
                    this.items = ['a', 'b'];
                }
                render() {
                    renderCount++;
                    return jsx('span', null, this.items.join(','));
                }
                lifeCycle() { return {}; }
            }
            reactive()(List.prototype, 'items');

            const comp = new List(app);
            app.mountComponent(comp, app.rootNode, new Props(app));
            render(app);
            const afterFirst = renderCount;

            comp.items.push('c');
            render(app);

            assert.strictEqual(renderCount, afterFirst + 1);
            const root = dom.window.document.getElementById('root');
            assert.strictEqual(root.querySelector('span').textContent, 'a,b,c');
        });

        it('triggers rerender on splice', () => {
            const dom = setup();
            const app = new VApp('root', new Renderer());
            app.saveSnapshot();

            class List extends Component {
                constructor(app) {
                    super(app);
                    this.items = ['a', 'b', 'c'];
                }
                render() {
                    return jsx('span', null, this.items.join(','));
                }
                lifeCycle() { return {}; }
            }
            reactive()(List.prototype, 'items');

            const comp = new List(app);
            app.mountComponent(comp, app.rootNode, new Props(app));
            render(app);

            comp.items.splice(1, 1); // remove 'b'
            render(app);

            const root = dom.window.document.getElementById('root');
            assert.strictEqual(root.querySelector('span').textContent, 'a,c');
        });

        it('triggers rerender on index assignment', () => {
            const dom = setup();
            const app = new VApp('root', new Renderer());
            app.saveSnapshot();

            class List extends Component {
                constructor(app) {
                    super(app);
                    this.items = ['a', 'b', 'c'];
                }
                render() {
                    return jsx('span', null, this.items.join(','));
                }
                lifeCycle() { return {}; }
            }
            reactive()(List.prototype, 'items');

            const comp = new List(app);
            app.mountComponent(comp, app.rootNode, new Props(app));
            render(app);

            comp.items[1] = 'X';
            render(app);

            const root = dom.window.document.getElementById('root');
            assert.strictEqual(root.querySelector('span').textContent, 'a,X,c');
        });
    });

    describe('object mutation tracking', () => {
        it('triggers rerender on property set', () => {
            const dom = setup();
            const app = new VApp('root', new Renderer());
            app.saveSnapshot();

            let renderCount = 0;

            class Config extends Component {
                constructor(app) {
                    super(app);
                    this.config = { name: 'old' };
                }
                render() {
                    renderCount++;
                    return jsx('span', null, this.config.name);
                }
                lifeCycle() { return {}; }
            }
            reactive()(Config.prototype, 'config');

            const comp = new Config(app);
            app.mountComponent(comp, app.rootNode, new Props(app));
            render(app);
            const afterFirst = renderCount;

            comp.config.name = 'new';
            render(app);

            assert.strictEqual(renderCount, afterFirst + 1);
            const root = dom.window.document.getElementById('root');
            assert.strictEqual(root.querySelector('span').textContent, 'new');
        });

        it('triggers rerender on property delete', () => {
            const dom = setup();
            const app = new VApp('root', new Renderer());
            app.saveSnapshot();

            class Config extends Component {
                constructor(app) {
                    super(app);
                    this.config = { a: 1, b: 2 };
                }
                render() {
                    return jsx('span', null, Object.keys(this.config).join(','));
                }
                lifeCycle() { return {}; }
            }
            reactive()(Config.prototype, 'config');

            const comp = new Config(app);
            app.mountComponent(comp, app.rootNode, new Props(app));
            render(app);

            delete comp.config.b;
            render(app);

            const root = dom.window.document.getElementById('root');
            assert.strictEqual(root.querySelector('span').textContent, 'a');
        });

        it('triggers rerender on nested object mutation', () => {
            const dom = setup();
            const app = new VApp('root', new Renderer());
            app.saveSnapshot();

            class Deep extends Component {
                constructor(app) {
                    super(app);
                    this.data = { nested: { value: 'old' } };
                }
                render() {
                    return jsx('span', null, this.data.nested.value);
                }
                lifeCycle() { return {}; }
            }
            reactive()(Deep.prototype, 'data');

            const comp = new Deep(app);
            app.mountComponent(comp, app.rootNode, new Props(app));
            render(app);

            comp.data.nested.value = 'new';
            render(app);

            const root = dom.window.document.getElementById('root');
            assert.strictEqual(root.querySelector('span').textContent, 'new');
        });

        it('triggers rerender when mutating object inside array', () => {
            const dom = setup();
            const app = new VApp('root', new Renderer());
            app.saveSnapshot();

            class TodoList extends Component {
                constructor(app) {
                    super(app);
                    this.todos = [
                        { text: 'buy milk', done: false },
                        { text: 'write code', done: false }
                    ];
                }
                render() {
                    const summary = this.todos.map(t => `${t.text}:${t.done}`).join('|');
                    return jsx('span', null, summary);
                }
                lifeCycle() { return {}; }
            }
            reactive()(TodoList.prototype, 'todos');

            const comp = new TodoList(app);
            app.mountComponent(comp, app.rootNode, new Props(app));
            render(app);

            const root = dom.window.document.getElementById('root');
            assert.strictEqual(root.querySelector('span').textContent, 'buy milk:false|write code:false');

            // Mutate object inside array
            comp.todos[1].done = true;
            render(app);

            assert.strictEqual(root.querySelector('span').textContent, 'buy milk:false|write code:true');
        });

        it('does not double-wrap an already proxied value', () => {
            const dom = setup();
            const app = new VApp('root', new Renderer());
            app.saveSnapshot();

            class Config extends Component {
                constructor(app) {
                    super(app);
                    this.data = { x: 1 };
                }
                render() {
                    return jsx('span', null, String(this.data.x));
                }
                lifeCycle() { return {}; }
            }
            reactive()(Config.prototype, 'data');

            const comp = new Config(app);
            app.mountComponent(comp, app.rootNode, new Props(app));
            render(app);

            // Re-assign the same proxied object — should not double-wrap
            const ref = comp.data;
            comp.data = ref;
            comp.data.x = 99;
            render(app);

            const root = dom.window.document.getElementById('root');
            assert.strictEqual(root.querySelector('span').textContent, '99');
        });
    });

    describe('readable first-change detection', () => {
        it('allows first assignment of undefined value', () => {
            const dom = setup();
            const app = new VApp('root', new Renderer());
            app.saveSnapshot();

            class Comp extends Component {
                constructor(app) {
                    super(app);
                    this.val = undefined;
                }
                render() {
                    return jsx('span', null, String(this.val));
                }
                lifeCycle() { return {}; }
            }
            reactive()(Comp.prototype, 'val');

            const comp = new Comp(app);
            app.mountComponent(comp, app.rootNode, new Props(app));
            render(app);

            const root = dom.window.document.getElementById('root');
            assert.strictEqual(root.querySelector('span').textContent, 'undefined');

            // Setting undefined again should be a no-op (same value)
            comp.val = undefined;
            render(app);

            // Setting to a real value should work
            comp.val = 'hello';
            render(app);
            assert.strictEqual(root.querySelector('span').textContent, 'hello');
        });
    });
});
