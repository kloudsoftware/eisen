const assert = require('assert');
const {JSDOM} = require('jsdom');
const {VApp, Renderer, Component, Props, reactive, jsx, Show, For} = require('../dist/index.cjs');

function setup(html) {
    const dom = new JSDOM(html || '<div id="root"></div>', {url: 'http://localhost'});
    global.window = dom.window;
    global.document = dom.window.document;
    global.localStorage = dom.window.localStorage;
    global.navigator = dom.window.navigator;
    global.HTMLElement = dom.window.HTMLElement;
    global.HTMLInputElement = dom.window.HTMLInputElement;
    global.HTMLTextAreaElement = dom.window.HTMLTextAreaElement;
    global.HTMLSelectElement = dom.window.HTMLSelectElement;
    return dom;
}

function render(app) {
    const patch = app.renderer.diffAgainstLatest(app);
    patch(app.rootNode.htmlElement);
}

function tick() {
    return new Promise(resolve => setTimeout(resolve, 0));
}

describe('bind:value', () => {
    it('sets initial value from reactive property', () => {
        const dom = setup();
        const app = new VApp('root', new Renderer());
        app.saveSnapshot();

        class Form extends Component {
            constructor(app) {
                super(app);
                this.name = 'Alice';
            }
            render() {
                return jsx('input', { type: 'text', 'bind:value': [this, 'name'] });
            }
            lifeCycle() { return {}; }
        }
        reactive()(Form.prototype, 'name');

        const comp = new Form(app);
        app.mountComponent(comp, app.rootNode, new Props(app));
        render(app);

        const root = dom.window.document.getElementById('root');
        const input = root.querySelector('input');
        assert.strictEqual(input.value, 'Alice');
    });

    it('updates DOM when model changes', () => {
        const dom = setup();
        const app = new VApp('root', new Renderer());
        app.saveSnapshot();

        class Form extends Component {
            constructor(app) {
                super(app);
                this.name = 'Alice';
            }
            render() {
                return jsx('input', { type: 'text', 'bind:value': [this, 'name'] });
            }
            lifeCycle() { return {}; }
        }
        reactive()(Form.prototype, 'name');

        const comp = new Form(app);
        app.mountComponent(comp, app.rootNode, new Props(app));
        render(app);

        const root = dom.window.document.getElementById('root');
        const input = root.querySelector('input');
        assert.strictEqual(input.value, 'Alice');

        // Model → DOM
        comp.name = 'Bob';
        assert.strictEqual(input.value, 'Bob');
    });

    it('updates model when DOM input fires', () => {
        const dom = setup();
        const app = new VApp('root', new Renderer());
        app.saveSnapshot();

        class Form extends Component {
            constructor(app) {
                super(app);
                this.name = 'Alice';
            }
            render() {
                return jsx('input', { type: 'text', 'bind:value': [this, 'name'] });
            }
            lifeCycle() { return {}; }
        }
        reactive()(Form.prototype, 'name');

        const comp = new Form(app);
        app.mountComponent(comp, app.rootNode, new Props(app));
        render(app);

        const root = dom.window.document.getElementById('root');
        const input = root.querySelector('input');

        // Simulate user typing
        input.value = 'Charlie';
        const inputEvent = new dom.window.Event('input', { bubbles: true });
        input.dispatchEvent(inputEvent);

        assert.strictEqual(comp.name, 'Charlie');
    });

    it('survives a rerender cycle', () => {
        const dom = setup();
        const app = new VApp('root', new Renderer());
        app.saveSnapshot();

        class Form extends Component {
            constructor(app) {
                super(app);
                this.name = 'start';
                this.label = 'Name:';
            }
            render() {
                return jsx('div', null,
                    jsx('label', null, this.label),
                    jsx('input', { type: 'text', 'bind:value': [this, 'name'] })
                );
            }
            lifeCycle() { return {}; }
        }
        reactive()(Form.prototype, 'name');
        reactive()(Form.prototype, 'label');

        const comp = new Form(app);
        app.mountComponent(comp, app.rootNode, new Props(app));
        render(app);

        const root = dom.window.document.getElementById('root');
        let input = root.querySelector('input');
        assert.strictEqual(input.value, 'start');

        // Change a different property to trigger rerender
        comp.label = 'Updated:';
        render(app);

        // Input value should survive the rerender
        input = root.querySelector('input');
        assert.strictEqual(input.value, 'start');
    });
});

describe('bind:checked', () => {
    it('binds checkbox checked state from model', () => {
        const dom = setup();
        const app = new VApp('root', new Renderer());
        app.saveSnapshot();

        class Form extends Component {
            constructor(app) {
                super(app);
                this.agreed = true;
            }
            render() {
                return jsx('input', { type: 'checkbox', 'bind:checked': [this, 'agreed'] });
            }
            lifeCycle() { return {}; }
        }
        reactive()(Form.prototype, 'agreed');

        const comp = new Form(app);
        app.mountComponent(comp, app.rootNode, new Props(app));
        render(app);

        const root = dom.window.document.getElementById('root');
        const cb = root.querySelector('input[type="checkbox"]');
        assert.ok(cb.hasAttribute('checked'));
    });

    it('updates checkbox when model changes', () => {
        const dom = setup();
        const app = new VApp('root', new Renderer());
        app.saveSnapshot();

        class Form extends Component {
            constructor(app) {
                super(app);
                this.agreed = false;
            }
            render() {
                return jsx('input', { type: 'checkbox', 'bind:checked': [this, 'agreed'] });
            }
            lifeCycle() { return {}; }
        }
        reactive()(Form.prototype, 'agreed');

        const comp = new Form(app);
        app.mountComponent(comp, app.rootNode, new Props(app));
        render(app);

        const root = dom.window.document.getElementById('root');
        const cb = root.querySelector('input[type="checkbox"]');
        assert.strictEqual(cb.checked, false);

        // Model → DOM
        comp.agreed = true;
        assert.strictEqual(cb.checked, true);
    });

    it('updates model when checkbox is toggled', () => {
        const dom = setup();
        const app = new VApp('root', new Renderer());
        app.saveSnapshot();

        class Form extends Component {
            constructor(app) {
                super(app);
                this.agreed = false;
            }
            render() {
                return jsx('input', { type: 'checkbox', 'bind:checked': [this, 'agreed'] });
            }
            lifeCycle() { return {}; }
        }
        reactive()(Form.prototype, 'agreed');

        const comp = new Form(app);
        app.mountComponent(comp, app.rootNode, new Props(app));
        render(app);

        const root = dom.window.document.getElementById('root');
        const cb = root.querySelector('input[type="checkbox"]');

        // Simulate user toggle
        cb.checked = true;
        const changeEvent = new dom.window.Event('change', { bubbles: true });
        cb.dispatchEvent(changeEvent);

        assert.strictEqual(comp.agreed, true);
    });
});

describe('Show component', () => {
    it('renders children when condition is truthy', () => {
        const dom = setup();
        const app = new VApp('root', new Renderer());
        app.saveSnapshot();

        const node = jsx(Show, { when: true },
            jsx('span', null, 'visible')
        );
        app.rootNode.appendChild(node);
        render(app);

        const root = dom.window.document.getElementById('root');
        assert.strictEqual(root.querySelector('span').textContent, 'visible');
    });

    it('renders nothing when condition is falsy', () => {
        const dom = setup();
        const app = new VApp('root', new Renderer());
        app.saveSnapshot();

        const node = jsx(Show, { when: false },
            jsx('span', null, 'hidden')
        );
        assert.strictEqual(node, null);
    });

    it('renders fallback when condition is falsy', () => {
        const dom = setup();
        const app = new VApp('root', new Renderer());
        app.saveSnapshot();

        const node = jsx(Show, { when: false, fallback: jsx('span', null, 'fallback') },
            jsx('span', null, 'hidden')
        );
        app.rootNode.appendChild(node);
        render(app);

        const root = dom.window.document.getElementById('root');
        assert.strictEqual(root.querySelector('span').textContent, 'fallback');
    });

    it('returns single child unwrapped', () => {
        const dom = setup();
        const app = new VApp('root', new Renderer());
        app.saveSnapshot();

        const node = jsx(Show, { when: true },
            jsx('p', null, 'only child')
        );
        // Single child should not be wrapped in display:contents div
        assert.strictEqual(node.nodeName, 'p');
    });

    it('works reactively in a component', () => {
        const dom = setup();
        const app = new VApp('root', new Renderer());
        app.saveSnapshot();

        class Toggle extends Component {
            constructor(app) {
                super(app);
                this.visible = true;
            }
            render() {
                return jsx('div', null,
                    jsx(Show, { when: this.visible, fallback: jsx('span', null, 'hidden') },
                        jsx('span', null, 'shown')
                    )
                );
            }
            lifeCycle() { return {}; }
        }
        reactive()(Toggle.prototype, 'visible');

        const comp = new Toggle(app);
        app.mountComponent(comp, app.rootNode, new Props(app));
        render(app);

        const root = dom.window.document.getElementById('root');
        assert.strictEqual(root.querySelector('span').textContent, 'shown');

        comp.visible = false;
        render(app);
        assert.strictEqual(root.querySelector('span').textContent, 'hidden');
    });
});

describe('For component', () => {
    it('renders a list of items', () => {
        const dom = setup();
        const app = new VApp('root', new Renderer());
        app.saveSnapshot();

        const items = ['apple', 'banana', 'cherry'];
        const node = jsx(For, { each: items },
            (item) => jsx('li', null, item)
        );
        app.rootNode.appendChild(node);
        render(app);

        const root = dom.window.document.getElementById('root');
        const lis = root.querySelectorAll('li');
        assert.strictEqual(lis.length, 3);
        assert.strictEqual(lis[0].textContent, 'apple');
        assert.strictEqual(lis[1].textContent, 'banana');
        assert.strictEqual(lis[2].textContent, 'cherry');
    });

    it('assigns keys from key function', () => {
        const dom = setup();
        const app = new VApp('root', new Renderer());
        app.saveSnapshot();

        const items = [
            { id: 'a', name: 'Alice' },
            { id: 'b', name: 'Bob' },
        ];
        const node = jsx(For, { each: items, key: item => item.id },
            (item) => jsx('span', null, item.name)
        );

        // Check that keys are assigned
        const children = node.$getChildren();
        assert.strictEqual(children[0].key, 'a');
        assert.strictEqual(children[1].key, 'b');
    });

    it('returns null for empty array', () => {
        const dom = setup();
        const app = new VApp('root', new Renderer());
        app.saveSnapshot();

        const node = jsx(For, { each: [] },
            (item) => jsx('li', null, item)
        );
        assert.strictEqual(node, null);
    });

    it('passes index to render function', () => {
        const dom = setup();
        const app = new VApp('root', new Renderer());
        app.saveSnapshot();

        const items = ['a', 'b', 'c'];
        const node = jsx(For, { each: items },
            (item, i) => jsx('span', null, `${i}:${item}`)
        );
        app.rootNode.appendChild(node);
        render(app);

        const root = dom.window.document.getElementById('root');
        const spans = root.querySelectorAll('span');
        assert.strictEqual(spans[0].textContent, '0:a');
        assert.strictEqual(spans[1].textContent, '1:b');
        assert.strictEqual(spans[2].textContent, '2:c');
    });

    it('works reactively with component state', () => {
        const dom = setup();
        const app = new VApp('root', new Renderer());
        app.saveSnapshot();

        class TodoList extends Component {
            constructor(app) {
                super(app);
                this.items = ['one', 'two'];
            }
            render() {
                return jsx('ul', null,
                    jsx(For, { each: this.items },
                        (item) => jsx('li', null, item)
                    )
                );
            }
            lifeCycle() { return {}; }
        }
        reactive()(TodoList.prototype, 'items');

        const comp = new TodoList(app);
        app.mountComponent(comp, app.rootNode, new Props(app));
        render(app);

        const root = dom.window.document.getElementById('root');
        assert.strictEqual(root.querySelectorAll('li').length, 2);

        comp.items = ['one', 'two', 'three'];
        render(app);
        assert.strictEqual(root.querySelectorAll('li').length, 3);
        assert.strictEqual(root.querySelectorAll('li')[2].textContent, 'three');
    });
});
