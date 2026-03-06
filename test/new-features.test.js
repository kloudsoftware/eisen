const assert = require('assert');
const {JSDOM} = require('jsdom');
const {VApp, Renderer, Component, Props, reactive, computed, createContext, jsx, createRef, Fragment, onMount, onCleanup, createPortal, lazy} = require('../dist/index.cjs');

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

describe('className support', () => {
    it('accepts a string className', () => {
        const dom = setup();
        const app = new VApp('root', new Renderer());
        app.saveSnapshot();

        const node = jsx('div', { className: 'card active' });
        app.rootNode.appendChild(node);
        render(app);

        const root = dom.window.document.getElementById('root');
        assert.strictEqual(root.querySelector('div').getAttribute('class'), 'card active');
    });

    it('accepts an array className', () => {
        const dom = setup();
        const app = new VApp('root', new Renderer());
        app.saveSnapshot();

        const node = jsx('div', { className: ['card', false, 'active', null, 'big'] });
        app.rootNode.appendChild(node);
        render(app);

        const root = dom.window.document.getElementById('root');
        assert.strictEqual(root.querySelector('div').getAttribute('class'), 'card active big');
    });

    it('accepts an object className', () => {
        const dom = setup();
        const app = new VApp('root', new Renderer());
        app.saveSnapshot();

        const node = jsx('div', { className: { card: true, active: true, hidden: false } });
        app.rootNode.appendChild(node);
        render(app);

        const root = dom.window.document.getElementById('root');
        const cls = root.querySelector('div').getAttribute('class');
        assert.ok(cls.includes('card'));
        assert.ok(cls.includes('active'));
        assert.ok(!cls.includes('hidden'));
    });

    it('accepts class as alias for className', () => {
        const dom = setup();
        const app = new VApp('root', new Renderer());
        app.saveSnapshot();

        const node = jsx('div', { class: ['a', 'b'] });
        app.rootNode.appendChild(node);
        render(app);

        const root = dom.window.document.getElementById('root');
        assert.strictEqual(root.querySelector('div').getAttribute('class'), 'a b');
    });
});

describe('style object support', () => {
    it('converts style object to CSS string', () => {
        const dom = setup();
        const app = new VApp('root', new Renderer());
        app.saveSnapshot();

        const node = jsx('div', { style: { color: 'red', fontSize: '14px', marginTop: '10px' } });
        app.rootNode.appendChild(node);
        render(app);

        const root = dom.window.document.getElementById('root');
        const style = root.querySelector('div').getAttribute('style');
        assert.ok(style.includes('color:red'));
        assert.ok(style.includes('font-size:14px'));
        assert.ok(style.includes('margin-top:10px'));
    });

    it('passes string styles through unchanged', () => {
        const dom = setup();
        const app = new VApp('root', new Renderer());
        app.saveSnapshot();

        const node = jsx('div', { style: 'color:blue' });
        app.rootNode.appendChild(node);
        render(app);

        const root = dom.window.document.getElementById('root');
        assert.strictEqual(root.querySelector('div').getAttribute('style'), 'color:blue');
    });

    it('filters null/false values from style object', () => {
        const dom = setup();
        const app = new VApp('root', new Renderer());
        app.saveSnapshot();

        const node = jsx('div', { style: { color: 'red', display: null, margin: false } });
        app.rootNode.appendChild(node);
        render(app);

        const root = dom.window.document.getElementById('root');
        const style = root.querySelector('div').getAttribute('style');
        assert.ok(style.includes('color:red'));
        assert.ok(!style.includes('display'));
        assert.ok(!style.includes('margin'));
    });
});

describe('boolean attributes', () => {
    it('sets boolean attribute as empty string when true', () => {
        const dom = setup();
        const app = new VApp('root', new Renderer());
        app.saveSnapshot();

        const node = jsx('input', { disabled: true, type: 'text' });
        app.rootNode.appendChild(node);
        render(app);

        const root = dom.window.document.getElementById('root');
        const input = root.querySelector('input');
        assert.ok(input.hasAttribute('disabled'));
    });

    it('omits boolean attribute when false', () => {
        const dom = setup();
        const app = new VApp('root', new Renderer());
        app.saveSnapshot();

        const node = jsx('input', { disabled: false, type: 'text' });
        app.rootNode.appendChild(node);
        render(app);

        const root = dom.window.document.getElementById('root');
        const input = root.querySelector('input');
        assert.ok(!input.hasAttribute('disabled'));
    });

    it('handles checked, required, hidden', () => {
        const dom = setup();
        const app = new VApp('root', new Renderer());
        app.saveSnapshot();

        const node = jsx('div', { hidden: true },
            jsx('input', { checked: true, required: true, type: 'checkbox' })
        );
        app.rootNode.appendChild(node);
        render(app);

        const root = dom.window.document.getElementById('root');
        assert.ok(root.querySelector('div').hasAttribute('hidden'));
        assert.ok(root.querySelector('input').hasAttribute('checked'));
        assert.ok(root.querySelector('input').hasAttribute('required'));
    });
});

describe('htmlFor support', () => {
    it('converts htmlFor to for attribute', () => {
        const dom = setup();
        const app = new VApp('root', new Renderer());
        app.saveSnapshot();

        const node = jsx('label', { htmlFor: 'email-input' }, 'Email');
        app.rootNode.appendChild(node);
        render(app);

        const root = dom.window.document.getElementById('root');
        assert.strictEqual(root.querySelector('label').getAttribute('for'), 'email-input');
    });
});

describe('dangerouslySetInnerHTML', () => {
    it('sets innerHTML directly', () => {
        const dom = setup();
        const app = new VApp('root', new Renderer());
        app.saveSnapshot();

        const node = jsx('div', { dangerouslySetInnerHTML: { __html: '<b>bold</b>' } });
        app.rootNode.appendChild(node);
        render(app);

        const root = dom.window.document.getElementById('root');
        assert.strictEqual(root.querySelector('div').innerHTML, '<b>bold</b>');
    });

    it('ignores children when dangerouslySetInnerHTML is set', () => {
        const dom = setup();
        const app = new VApp('root', new Renderer());
        app.saveSnapshot();

        const node = jsx('div', { dangerouslySetInnerHTML: { __html: '<i>italic</i>' } }, 'ignored');
        app.rootNode.appendChild(node);
        render(app);

        const root = dom.window.document.getElementById('root');
        assert.strictEqual(root.querySelector('div').innerHTML, '<i>italic</i>');
    });

    it('diffs dangerouslySetInnerHTML across renders', () => {
        const dom = setup();
        const app = new VApp('root', new Renderer());
        app.init();

        class HtmlComp extends Component {
            constructor(app) {
                super(app);
                this.content = '<b>v1</b>';
            }
            render() {
                return jsx('div', { dangerouslySetInnerHTML: { __html: this.content } });
            }
            lifeCycle() { return {}; }
        }
        reactive()(HtmlComp.prototype, 'content');

        const comp = new HtmlComp(app);
        app.mountComponent(comp, app.rootNode, new Props(app));
        render(app);

        const root = dom.window.document.getElementById('root');
        assert.strictEqual(root.querySelector('div').innerHTML, '<b>v1</b>');

        comp.content = '<i>v2</i>';
        render(app);
        assert.strictEqual(root.querySelector('div').innerHTML, '<i>v2</i>');
    });
});

describe('conditional rendering (null)', () => {
    it('null children are filtered out', () => {
        const dom = setup();
        const app = new VApp('root', new Renderer());
        app.saveSnapshot();

        const node = jsx('div', null,
            jsx('span', null, 'visible'),
            null,
            false,
            jsx('span', null, 'also visible')
        );
        app.rootNode.appendChild(node);
        render(app);

        const root = dom.window.document.getElementById('root');
        assert.strictEqual(root.querySelectorAll('span').length, 2);
    });
});

describe('error boundary', () => {
    it('does not crash the app when a component render throws', () => {
        const dom = setup();
        const app = new VApp('root', new Renderer());
        app.init();

        let throwOnRender = false;

        class Fragile extends Component {
            constructor(app) {
                super(app);
                this.count = 0;
            }
            render() {
                if (throwOnRender) throw new Error('render boom');
                return jsx('span', null, String(this.count));
            }
            lifeCycle() { return {}; }
        }
        reactive()(Fragile.prototype, 'count');

        const comp = new Fragile(app);
        app.mountComponent(comp, app.rootNode, new Props(app));
        render(app);

        const root = dom.window.document.getElementById('root');
        assert.strictEqual(root.querySelector('span').textContent, '0');

        // Trigger an error during rerender
        throwOnRender = true;
        const origError = console.error;
        let errorLogged = false;
        console.error = () => { errorLogged = true; };

        comp.count = 1;
        // Should not throw
        render(app);

        console.error = origError;
        assert.ok(errorLogged, 'Error should be logged');

        // DOM should still show old value (error kept old mount)
        assert.strictEqual(root.querySelector('span').textContent, '0');
    });
});

describe('context (provide/inject)', () => {
    it('injects default value when no provider', () => {
        const dom = setup();
        const app = new VApp('root', new Renderer());
        app.saveSnapshot();

        const ThemeCtx = createContext('light');

        class Child extends Component {
            constructor(app) {
                super(app);
            }
            render() {
                const theme = this.inject(ThemeCtx);
                return jsx('span', null, theme);
            }
            lifeCycle() { return {}; }
        }

        const comp = new Child(app);
        app.mountComponent(comp, app.rootNode, new Props(app));
        render(app);

        const root = dom.window.document.getElementById('root');
        assert.strictEqual(root.querySelector('span').textContent, 'light');
    });

    it('injects value from parent provider', () => {
        const dom = setup();
        const app = new VApp('root', new Renderer());
        app.saveSnapshot();

        const ThemeCtx = createContext('light');

        class Parent extends Component {
            constructor(app) {
                super(app);
                this.provide(ThemeCtx, 'dark');
            }
            render() {
                const container = jsx('div', null);
                this.mount(Child, this.app, container, 'child');
                return container;
            }
            lifeCycle() { return {}; }
        }

        class Child extends Component {
            constructor(app) {
                super(app);
            }
            render() {
                const theme = this.inject(ThemeCtx);
                return jsx('span', null, theme);
            }
            lifeCycle() { return {}; }
        }

        const comp = new Parent(app);
        app.mountComponent(comp, app.rootNode, new Props(app));
        render(app);

        const root = dom.window.document.getElementById('root');
        assert.strictEqual(root.querySelector('span').textContent, 'dark');
    });

    it('nearest provider wins', () => {
        const dom = setup();
        const app = new VApp('root', new Renderer());
        app.saveSnapshot();

        const Ctx = createContext(0);

        class GrandChild extends Component {
            constructor(app) { super(app); }
            render() {
                return jsx('span', null, String(this.inject(Ctx)));
            }
            lifeCycle() { return {}; }
        }

        class Middle extends Component {
            constructor(app) {
                super(app);
                this.provide(Ctx, 42);
            }
            render() {
                const container = jsx('div', null);
                this.mount(GrandChild, this.app, container, 'gc');
                return container;
            }
            lifeCycle() { return {}; }
        }

        class Top extends Component {
            constructor(app) {
                super(app);
                this.provide(Ctx, 1);
            }
            render() {
                const container = jsx('div', null);
                this.mount(Middle, this.app, container, 'mid');
                return container;
            }
            lifeCycle() { return {}; }
        }

        const comp = new Top(app);
        app.mountComponent(comp, app.rootNode, new Props(app));
        render(app);

        const root = dom.window.document.getElementById('root');
        assert.strictEqual(root.querySelector('span').textContent, '42');
    });
});

describe('computed decorator', () => {
    it('caches computed value and invalidates on dependency change', () => {
        const dom = setup();
        const app = new VApp('root', new Renderer());
        app.saveSnapshot();

        let computeCount = 0;

        class Person extends Component {
            constructor(app) {
                super(app);
                this.first = 'John';
                this.last = 'Doe';
            }
            get fullName() {
                computeCount++;
                return this.first + ' ' + this.last;
            }
            render() {
                return jsx('span', null, this.fullName);
            }
            lifeCycle() { return {}; }
        }
        reactive()(Person.prototype, 'first');
        reactive()(Person.prototype, 'last');
        const desc = Object.getOwnPropertyDescriptor(Person.prototype, 'fullName');
        const newDesc = computed('first', 'last')(Person.prototype, 'fullName', desc);
        Object.defineProperty(Person.prototype, 'fullName', newDesc);

        const comp = new Person(app);
        app.mountComponent(comp, app.rootNode, new Props(app));
        render(app);

        const root = dom.window.document.getElementById('root');
        assert.strictEqual(root.querySelector('span').textContent, 'John Doe');

        const countAfterFirst = computeCount;

        // Access again — should be cached
        const name = comp.fullName;
        assert.strictEqual(computeCount, countAfterFirst);

        // Change dependency — should invalidate
        comp.first = 'Jane';
        const name2 = comp.fullName;
        assert.strictEqual(name2, 'Jane Doe');
        assert.strictEqual(computeCount, countAfterFirst + 1);

        // Access again — cached
        comp.fullName;
        assert.strictEqual(computeCount, countAfterFirst + 1);
    });
});

describe('SVG support', () => {
    it('creates SVG elements with correct namespace', () => {
        const dom = setup();
        const app = new VApp('root', new Renderer());
        app.saveSnapshot();

        const node = jsx('svg', { width: '100', height: '100', viewBox: '0 0 100 100' },
            jsx('circle', { cx: '50', cy: '50', r: '40', fill: 'red' })
        );
        app.rootNode.appendChild(node);
        render(app);

        const root = dom.window.document.getElementById('root');
        const svg = root.querySelector('svg');
        assert.ok(svg, 'svg element should exist');
        assert.strictEqual(svg.namespaceURI, 'http://www.w3.org/2000/svg');

        const circle = svg.querySelector('circle');
        assert.ok(circle, 'circle element should exist');
        assert.strictEqual(circle.namespaceURI, 'http://www.w3.org/2000/svg');
        assert.strictEqual(circle.getAttribute('fill'), 'red');
    });
});

describe('functional component lifecycle', () => {
    it('calls onMount after DOM insertion', () => {
        const dom = setup();
        const app = new VApp('root', new Renderer());
        app.saveSnapshot();

        let mounted = false;

        function MyComp(props) {
            onMount(() => { mounted = true; });
            return jsx('span', null, 'hello');
        }

        const node = jsx(MyComp, {});
        app.rootNode.appendChild(node);
        render(app);

        assert.ok(mounted, 'onMount should have been called');
    });

    it('collects cleanup from onMount return', () => {
        const dom = setup();
        const app = new VApp('root', new Renderer());
        app.saveSnapshot();

        let cleanedUp = false;

        function MyComp(props) {
            onMount(() => {
                return () => { cleanedUp = true; };
            });
            return jsx('span', null, 'hello');
        }

        const node = jsx(MyComp, {});
        app.rootNode.appendChild(node);
        render(app);

        // Manually trigger cleanups
        const cleanups = node._fnCleanups;
        assert.ok(cleanups && cleanups.length > 0, 'should have cleanups');
        cleanups.forEach(fn => fn());
        assert.ok(cleanedUp, 'cleanup should have been called');
    });

    it('collects onCleanup callbacks', () => {
        const dom = setup();
        const app = new VApp('root', new Renderer());
        app.saveSnapshot();

        let cleaned = false;

        function MyComp(props) {
            onCleanup(() => { cleaned = true; });
            return jsx('span', null, 'hello');
        }

        const node = jsx(MyComp, {});
        app.rootNode.appendChild(node);
        render(app);

        const cleanups = node._fnCleanups;
        assert.ok(cleanups && cleanups.length > 0);
        cleanups.forEach(fn => fn());
        assert.ok(cleaned);
    });
});

describe('portal', () => {
    it('renders content into a different DOM target', () => {
        const dom = setup('<div id="root"></div><div id="modal-root"></div>');
        const app = new VApp('root', new Renderer());
        app.saveSnapshot();

        const portalContent = jsx('span', null, 'portal content');
        const portal = createPortal(portalContent, 'modal-root');
        app.rootNode.appendChild(portal);
        render(app);

        const modalRoot = dom.window.document.getElementById('modal-root');
        assert.ok(modalRoot.querySelector('span'), 'portal content should be in modal-root');
        assert.strictEqual(modalRoot.querySelector('span').textContent, 'portal content');

        // The placeholder should be in the main root
        const root = dom.window.document.getElementById('root');
        const placeholder = root.querySelector('div[style="display:none"]');
        assert.ok(placeholder, 'placeholder should exist in root');
    });
});

describe('VNode ID collision resistance', () => {
    it('generates unique IDs with counter', () => {
        const dom = setup();
        const app = new VApp('root', new Renderer());

        const ids = new Set();
        for (let i = 0; i < 1000; i++) {
            const node = jsx('div', null);
            ids.add(node.id);
        }
        assert.strictEqual(ids.size, 1000, 'all 1000 IDs should be unique');
    });
});

describe('$clone memory leak fix', () => {
    it('clone copies htmlElement directly without closure', () => {
        const dom = setup();
        const app = new VApp('root', new Renderer());
        app.saveSnapshot();

        const node = jsx('div', null, 'test');
        app.rootNode.appendChild(node);
        render(app);

        // Take a snapshot
        const snapshot = app.clone();

        // The cloned root's onDomEvenList should be empty (no closure)
        const clonedRoot = snapshot.rootNode;
        assert.strictEqual(clonedRoot.onDomEvenList.length, 0,
            'clone should not add closures to onDomEvenList');
    });
});
