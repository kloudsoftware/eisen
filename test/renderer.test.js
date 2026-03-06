const assert = require('assert');
const {JSDOM} = require('jsdom');
const {VApp, Renderer, Attribute} = require('../dist/index.cjs');

function setup() {
    const dom = new JSDOM('<div id="root"></div>', {url: 'http://localhost'});
    global.window = dom.window;
    global.document = dom.window.document;
    global.localStorage = dom.window.localStorage;
    global.navigator = dom.window.navigator;
    return dom;
}

describe('Renderer diffing', () => {
    describe('node type replacement', () => {
        it('replaces element when node name changes', () => {
            const dom = setup();
            const app = new VApp('root', new Renderer());
            app.saveSnapshot();

            // Initial render: a <div>
            app.createElement('div', 'hello');
            let patch = app.renderer.diffAgainstLatest(app);
            patch(app.rootNode.htmlElement);

            const root = dom.window.document.getElementById('root');
            assert.strictEqual(root.children.length, 1);
            assert.strictEqual(root.children[0].tagName.toLowerCase(), 'div');
            assert.strictEqual(root.children[0].innerHTML, 'hello');

            // Replace with a <span> by swapping the child
            const children = app.rootNode.$getChildren();
            const oldChild = children[0];
            const newChild = app.k('span', {value: 'world'});
            newChild.id = oldChild.id;
            children[0] = newChild;

            patch = app.renderer.diffAgainstLatest(app);
            patch(app.rootNode.htmlElement);

            assert.strictEqual(root.children.length, 1);
            assert.strictEqual(root.children[0].tagName.toLowerCase(), 'span');
            assert.strictEqual(root.children[0].innerHTML, 'world');
        });
    });

    describe('adding new children', () => {
        it('appends a new child to an existing parent', () => {
            const dom = setup();
            const app = new VApp('root', new Renderer());
            app.saveSnapshot();

            const list = app.createElement('ul');
            let patch = app.renderer.diffAgainstLatest(app);
            patch(app.rootNode.htmlElement);

            // Add two items after initial render
            const li1 = app.k('li', {value: 'first'});
            const li2 = app.k('li', {value: 'second'});
            list.appendChild(li1);
            list.appendChild(li2);

            patch = app.renderer.diffAgainstLatest(app);
            patch(app.rootNode.htmlElement);

            const items = dom.window.document.querySelectorAll('li');
            assert.strictEqual(items.length, 2);
            assert.strictEqual(items[0].innerHTML, 'first');
            assert.strictEqual(items[1].innerHTML, 'second');
        });
    });

    describe('removing children', () => {
        it('removes a child that no longer exists in the new tree', () => {
            const dom = setup();
            const app = new VApp('root', new Renderer());
            app.saveSnapshot();

            const list = app.createElement('ul');
            const li1 = app.k('li', {value: 'a'});
            const li2 = app.k('li', {value: 'b'});
            list.appendChild(li1);
            list.appendChild(li2);

            let patch = app.renderer.diffAgainstLatest(app);
            patch(app.rootNode.htmlElement);
            assert.strictEqual(dom.window.document.querySelectorAll('li').length, 2);

            list.removeChild(li1);
            patch = app.renderer.diffAgainstLatest(app);
            patch(app.rootNode.htmlElement);

            const items = dom.window.document.querySelectorAll('li');
            assert.strictEqual(items.length, 1);
            assert.strictEqual(items[0].innerHTML, 'b');
        });
    });

    describe('attribute diffing', () => {
        it('adds new attributes', () => {
            const dom = setup();
            const app = new VApp('root', new Renderer());
            app.saveSnapshot();

            const div = app.k('div');
            app.rootNode.appendChild(div);

            let patch = app.renderer.diffAgainstLatest(app);
            patch(app.rootNode.htmlElement);

            div.addClass('active');
            patch = app.renderer.diffAgainstLatest(app);
            patch(app.rootNode.htmlElement);

            const el = dom.window.document.querySelector('div#root > div');
            assert.strictEqual(el.getAttribute('class'), 'active');
        });

        it('updates changed attribute values', () => {
            const dom = setup();
            const app = new VApp('root', new Renderer());
            // Track the class attribute so the renderer knows about it
            app.renderer.$knownAttributes.add('class');
            app.saveSnapshot();

            const div = app.k('div', {attrs: [new Attribute('class', 'old')]});
            app.rootNode.appendChild(div);

            let patch = app.renderer.diffAgainstLatest(app);
            patch(app.rootNode.htmlElement);

            const el = dom.window.document.querySelector('div#root > div');
            assert.strictEqual(el.getAttribute('class'), 'old');

            // Change attribute value
            div.$getAttrs()[0].attrValue = 'new';
            patch = app.renderer.diffAgainstLatest(app);
            patch(app.rootNode.htmlElement);

            assert.strictEqual(el.getAttribute('class'), 'new');
        });

        it('removes attributes no longer present', () => {
            const dom = setup();
            const app = new VApp('root', new Renderer());
            app.renderer.$knownAttributes.add('data-x');
            app.saveSnapshot();

            const div = app.k('div', {attrs: [new Attribute('data-x', '1')]});
            app.rootNode.appendChild(div);

            let patch = app.renderer.diffAgainstLatest(app);
            patch(app.rootNode.htmlElement);

            const el = dom.window.document.querySelector('div#root > div');
            assert.strictEqual(el.getAttribute('data-x'), '1');

            // Remove all attrs
            div.$getAttrs().length = 0;
            patch = app.renderer.diffAgainstLatest(app);
            patch(app.rootNode.htmlElement);

            assert.strictEqual(el.getAttribute('data-x'), null);
        });
    });

    describe('innerHTML diffing', () => {
        it('updates innerHTML when content changes', () => {
            const dom = setup();
            const app = new VApp('root', new Renderer());
            app.saveSnapshot();

            const p = app.k('p', {value: 'before'});
            app.rootNode.appendChild(p);

            let patch = app.renderer.diffAgainstLatest(app);
            patch(app.rootNode.htmlElement);

            const el = dom.window.document.querySelector('p');
            assert.strictEqual(el.innerHTML, 'before');

            // Replace with new node that has different content but same id
            const children = app.rootNode.$getChildren();
            const newP = app.k('p', {value: 'after'});
            newP.id = children[0].id;
            children[0] = newP;

            patch = app.renderer.diffAgainstLatest(app);
            patch(app.rootNode.htmlElement);

            assert.strictEqual(el.innerHTML, 'after');
        });
    });

    describe('unmanaged nodes', () => {
        it('skips diffing for unmanaged node subtrees', () => {
            const dom = setup();
            const app = new VApp('root', new Renderer());
            app.saveSnapshot();

            const managed = app.k('p', {value: 'managed'});
            app.rootNode.appendChild(managed);
            const unmanaged = app.createUnmanagedNode(app.rootNode);

            let patch = app.renderer.diffAgainstLatest(app);
            patch(app.rootNode.htmlElement);

            const root = dom.window.document.getElementById('root');
            // Unmanaged node renders as a div
            assert.strictEqual(root.children.length, 2);
            assert.strictEqual(root.children[0].tagName.toLowerCase(), 'p');
            assert.strictEqual(root.children[1].tagName.toLowerCase(), 'div');

            // Mutate the managed node — should be picked up
            const children = app.rootNode.$getChildren();
            const newP = app.k('p', {value: 'updated'});
            newP.id = managed.id;
            children[0] = newP;

            patch = app.renderer.diffAgainstLatest(app);
            patch(app.rootNode.htmlElement);

            assert.strictEqual(root.children[0].innerHTML, 'updated');
            // Unmanaged node still present, untouched
            assert.strictEqual(root.children.length, 2);
        });
    });
});
