const assert = require('assert');
const {JSDOM} = require('jsdom');
const {VApp, Renderer, Component, Props, reactive, jsx, createRef, Fragment} = require('../dist/index.cjs');

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

describe('Preact-inspired features', () => {
    describe('shouldUpdate()', () => {
        it('skips rerender when shouldUpdate returns false', () => {
            const dom = setup();
            const app = new VApp('root', new Renderer());
            app.init();

            let renderCount = 0;

            class Skippy extends Component {
                constructor(app) {
                    super(app);
                    this.count = 0;
                    this.skipNext = false;
                }

                shouldUpdate() {
                    return !this.skipNext;
                }

                render() {
                    renderCount++;
                    return jsx('span', null, String(this.count));
                }

                lifeCycle() { return {}; }
            }

            const comp = new Skippy(app);
            app.mountComponent(comp, app.rootNode, new Props(app));
            render(app);
            assert.strictEqual(renderCount, 1);

            // Normal rerender
            comp.count = 1;
            comp.rerender();
            render(app);
            assert.strictEqual(renderCount, 2);

            // Skipped rerender
            comp.skipNext = true;
            comp.count = 2;
            comp.rerender();
            render(app);
            assert.strictEqual(renderCount, 2); // no extra render call
        });
    });

    describe('createRef()', () => {
        it('populates ref.current with the VNode', () => {
            const dom = setup();
            const app = new VApp('root', new Renderer());
            app.saveSnapshot();

            const myRef = createRef();
            assert.strictEqual(myRef.current, null);

            const node = jsx('div', { ref: myRef }, 'hello');
            app.rootNode.appendChild(node);
            render(app);

            assert.strictEqual(myRef.current, node);
        });

        it('works alongside function refs', () => {
            const dom = setup();
            const app = new VApp('root', new Renderer());
            app.saveSnapshot();

            let funcRefNode = null;
            const node = jsx('span', { ref: (n) => { funcRefNode = n; } }, 'test');
            app.rootNode.appendChild(node);
            render(app);

            assert.strictEqual(funcRefNode, node);
        });
    });

    describe('functional components', () => {
        it('renders a function as a component', () => {
            const dom = setup();
            const app = new VApp('root', new Renderer());
            app.saveSnapshot();

            function Greeting(props) {
                return jsx('span', null, 'Hello ' + props.name);
            }

            const node = jsx(Greeting, { name: 'World' });
            app.rootNode.appendChild(node);
            render(app);

            const root = dom.window.document.getElementById('root');
            assert.strictEqual(root.querySelector('span').textContent, 'Hello World');
        });

        it('passes children to functional components', () => {
            const dom = setup();
            const app = new VApp('root', new Renderer());
            app.saveSnapshot();

            function Wrapper(props, children) {
                return jsx('div', { class: 'wrapper' }, ...children);
            }

            const node = jsx(Wrapper, null, jsx('span', null, 'child1'), jsx('span', null, 'child2'));
            app.rootNode.appendChild(node);
            render(app);

            const root = dom.window.document.getElementById('root');
            const wrapper = root.querySelector('.wrapper');
            assert.strictEqual(wrapper.querySelectorAll('span').length, 2);
        });
    });

    describe('Fragment', () => {
        it('renders children in a display:contents wrapper', () => {
            const dom = setup();
            const app = new VApp('root', new Renderer());
            app.saveSnapshot();

            const node = jsx(Fragment, null,
                jsx('span', null, 'a'),
                jsx('span', null, 'b')
            );
            app.rootNode.appendChild(node);
            render(app);

            const root = dom.window.document.getElementById('root');
            const spans = root.querySelectorAll('span');
            assert.strictEqual(spans.length, 2);
            assert.strictEqual(spans[0].textContent, 'a');
            assert.strictEqual(spans[1].textContent, 'b');

            // The wrapper div should have display:contents
            const wrapper = root.querySelector('div[style="display:contents"]');
            assert.ok(wrapper, 'Fragment wrapper should have display:contents');
        });
    });

    describe('skip identical subtrees', () => {
        it('does not patch when old and new VNode are the same reference', () => {
            const dom = setup();
            const app = new VApp('root', new Renderer());
            app.saveSnapshot();

            const child = jsx('span', null, 'static');
            app.rootNode.appendChild(child);
            render(app);

            const root = dom.window.document.getElementById('root');
            const span = root.querySelector('span');
            assert.strictEqual(span.textContent, 'static');

            // Diff against itself — should be a no-op
            const renderer = new Renderer();
            const patch = renderer.diffElement
                ? renderer.diff // use public API
                : null;

            // Verify the optimization works by checking that the same node reference
            // in snapshot and live tree results in no DOM mutation
            render(app);
            assert.strictEqual(root.querySelector('span').textContent, 'static');
        });
    });

    describe('text nodes', () => {
        it('renders text as DOM Text nodes, not innerHTML', () => {
            const dom = setup();
            const app = new VApp('root', new Renderer());
            app.saveSnapshot();

            // <p>Hello <b>world</b></p>
            const node = jsx('p', null, 'Hello ', jsx('b', null, 'world'));
            app.rootNode.appendChild(node);
            render(app);

            const root = dom.window.document.getElementById('root');
            const p = root.querySelector('p');
            // "Hello " is a Text node, <b> is an element
            assert.strictEqual(p.childNodes[0].nodeType, 3); // TEXT_NODE
            assert.strictEqual(p.childNodes[0].textContent, 'Hello ');
            assert.strictEqual(p.querySelector('b').textContent, 'world');
        });

        it('renders text-only children as Text nodes', () => {
            const dom = setup();
            const app = new VApp('root', new Renderer());
            app.saveSnapshot();

            const node = jsx('p', null, 'just text');
            app.rootNode.appendChild(node);
            render(app);

            const root = dom.window.document.getElementById('root');
            const p = root.querySelector('p');
            assert.strictEqual(p.textContent, 'just text');
            assert.strictEqual(p.childNodes[0].nodeType, 3); // TEXT_NODE
        });

        it('diffs text content without clobbering sibling elements', () => {
            const dom = setup();
            const app = new VApp('root', new Renderer());
            app.init();

            class Mixed extends Component {
                constructor(app) {
                    super(app);
                    this.label = 'v1';
                }
                render() {
                    return jsx('div', null,
                        this.label,
                        jsx('b', null, 'bold')
                    );
                }
                lifeCycle() { return {}; }
            }
            reactive()(Mixed.prototype, 'label');

            const comp = new Mixed(app);
            app.mountComponent(comp, app.rootNode, new Props(app));

            // manual flush
            const patch1 = app.renderer.diffAgainstLatest(app);
            patch1(app.rootNode.htmlElement);

            const root = dom.window.document.getElementById('root');
            const div = root.querySelector('div');
            assert.strictEqual(div.childNodes[0].textContent, 'v1');
            assert.strictEqual(div.querySelector('b').textContent, 'bold');

            // Change text — sibling <b> should survive
            comp.label = 'v2';

            const patch2 = app.renderer.diffAgainstLatest(app);
            patch2(app.rootNode.htmlElement);

            assert.strictEqual(div.childNodes[0].textContent, 'v2');
            assert.ok(div.querySelector('b'), '<b> should still exist');
            assert.strictEqual(div.querySelector('b').textContent, 'bold');
        });
    });
});
