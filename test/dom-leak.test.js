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

function render(app) {
    const patch = app.renderer.diffAgainstLatest(app);
    patch(app.rootNode.htmlElement);
}

describe('DOM leaks', () => {
    describe('snapshots are constant size', () => {
        it('only retains the latest snapshot, not a growing history', () => {
            const dom = setup();
            const app = new VApp('root', new Renderer());
            app.saveSnapshot();

            app.createElement('p', 'v1');
            render(app);

            const first = app.getLatestSnapshot();

            // Trigger another diff
            render(app);

            const second = app.getLatestSnapshot();

            // Snapshot was replaced, not accumulated
            assert.notStrictEqual(first, second);
            // And the latest one reflects the current tree
            assert.strictEqual(
                second.rootNode.$getChildren().length,
                app.rootNode.$getChildren().length
            );
        });
    });

    describe('node replacement leaves no orphan DOM nodes', () => {
        it('old element is removed from DOM when node type changes', () => {
            const dom = setup();
            const app = new VApp('root', new Renderer());
            app.saveSnapshot();

            const div = app.createElement('div', 'old');
            render(app);

            const root = dom.window.document.getElementById('root');
            assert.strictEqual(root.children.length, 1);

            // Replace div with span
            const children = app.rootNode.$getChildren();
            const span = app.k('span', {value: 'new'});
            span.id = children[0].id;
            children[0] = span;
            render(app);

            // Only the new element should be in the DOM
            assert.strictEqual(root.children.length, 1);
            assert.strictEqual(root.children[0].tagName.toLowerCase(), 'span');
        });
    });

    describe('component rerender cleans up old DOM', () => {
        it('does not leave stale elements after component rerenders', () => {
            const dom = setup();
            const app = new VApp('root', new Renderer());
            app.saveSnapshot();

            class Counter extends Component {
                constructor(app) {
                    super(app);
                    this.count = 0;
                }
                render() {
                    return jsx('div', null,
                        jsx('span', null, 'count:' + String(this.count))
                    );
                }
                lifeCycle() { return {}; }
            }
            reactive()(Counter.prototype, 'count');

            const comp = new Counter(app);
            app.mountComponent(comp, app.rootNode, new Props(app));
            render(app);

            const root = dom.window.document.getElementById('root');
            assert.strictEqual(root.querySelectorAll('span').length, 1);

            // Rerender 5 times
            for (let i = 1; i <= 5; i++) {
                comp.count = i;
                render(app);
            }

            // Should still be exactly 1 span, not 6
            assert.strictEqual(root.querySelectorAll('span').length, 1);
            assert.strictEqual(root.querySelector('span').textContent, 'count:5');
        });
    });

    describe('removed keyed children are detached from DOM', () => {
        it('DOM element count matches VDOM after keyed removals', () => {
            const dom = setup();
            const app = new VApp('root', new Renderer());
            app.saveSnapshot();

            const list = app.createElement('ul');

            function addKeyed(text) {
                const li = app.k('li', {value: text});
                li.id = 'k-' + text; li.key = 'k-' + text;
                list.appendChild(li);
                return li;
            }

            const a = addKeyed('A');
            const b = addKeyed('B');
            const c = addKeyed('C');
            const d = addKeyed('D');

            render(app);

            const ul = dom.window.document.querySelector('ul');
            assert.strictEqual(ul.children.length, 4);

            // Remove B and D
            list.removeChild(b);
            list.removeChild(d);
            render(app);

            assert.strictEqual(ul.children.length, 2);
            assert.strictEqual(ul.children[0].innerHTML, 'A');
            assert.strictEqual(ul.children[1].innerHTML, 'C');

            // Verify removed elements are truly detached
            assert.strictEqual(b.htmlElement?.parentNode, null);
        });
    });

    describe('clone shares htmlElement references', () => {
        it('snapshot clones point to the same DOM elements as the live tree', () => {
            const dom = setup();
            const app = new VApp('root', new Renderer());
            app.saveSnapshot();

            app.createElement('p', 'text');
            render(app);

            const snapshot = app.getLatestSnapshot();
            const liveChild = app.rootNode.$getChildren()[0];
            const snapChild = snapshot.rootNode.$getChildren()[0];

            // Clone should share the same htmlElement
            assert.strictEqual(snapChild.htmlElement, liveChild.htmlElement);
        });
    });

    describe('innerHTML set clobbers child DOM nodes', () => {
        it('setting innerHTML on a node with children removes child elements', () => {
            const dom = setup();
            const app = new VApp('root', new Renderer());
            app.saveSnapshot();

            const parent = app.createElement('div');
            parent.appendChild(app.k('span', {value: 'child'}));
            render(app);

            const div = dom.window.document.querySelector('div#root > div');
            assert.strictEqual(div.children.length, 1);

            // Now change innerHTML on parent — the diff applies innerHTML patch
            // which clobbers the child DOM node, but the VDOM still has the child
            const children = app.rootNode.$getChildren();
            const newDiv = app.k('div', {value: 'replaced'});
            newDiv.id = children[0].id;
            // Give it NO children but innerHTML
            newDiv.children = [];
            children[0] = newDiv;

            render(app);

            // innerHTML should be set, children should be gone
            assert.strictEqual(div.innerHTML, 'replaced');
            assert.strictEqual(div.children.length, 0);
        });
    });
});
