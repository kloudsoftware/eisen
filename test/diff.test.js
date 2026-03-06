const assert = require('assert');
const {JSDOM} = require('jsdom');
const {VApp, Renderer, Attribute} = require('../dist/index.cjs');

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

function render(app) {
    const patch = app.renderer.diffAgainstLatest(app);
    patch(app.rootNode.htmlElement);
}

function childTags(parent) {
    return Array.from(parent.children).map(c => c.tagName.toLowerCase());
}

function childTexts(parent) {
    return Array.from(parent.children).map(c => c.innerHTML);
}

describe('diff: child reordering', () => {
    it('reorders keyed children to match new order', () => {
        const dom = setup();
        const app = new VApp('root', new Renderer());
        app.saveSnapshot();

        const list = app.createElement('ul');
        const a = app.k('li', {value: 'A'});
        a.id = 'key-a'; a.key = 'key-a';
        const b = app.k('li', {value: 'B'});
        b.id = 'key-b'; b.key = 'key-b';
        const c = app.k('li', {value: 'C'});
        c.id = 'key-c'; c.key = 'key-c';
        list.appendChild(a);
        list.appendChild(b);
        list.appendChild(c);

        render(app);

        const ul = dom.window.document.querySelector('ul');
        assert.deepStrictEqual(childTexts(ul), ['A', 'B', 'C']);

        // Reverse order: C, A, B
        list.children.length = 0;
        const c2 = app.k('li', {value: 'C'});
        c2.id = 'key-c'; c2.key = 'key-c';
        const a2 = app.k('li', {value: 'A'});
        a2.id = 'key-a'; a2.key = 'key-a';
        const b2 = app.k('li', {value: 'B'});
        b2.id = 'key-b'; b2.key = 'key-b';
        list.children.push(c2, a2, b2);

        render(app);

        assert.deepStrictEqual(childTexts(ul), ['C', 'A', 'B']);
    });

    it('moves a keyed child from end to beginning', () => {
        const dom = setup();
        const app = new VApp('root', new Renderer());
        app.saveSnapshot();

        const list = app.createElement('ul');
        const items = ['X', 'Y', 'Z'].map(t => {
            const li = app.k('li', {value: t});
            li.id = 'k-' + t; li.key = 'k-' + t;
            list.appendChild(li);
            return li;
        });

        render(app);

        const ul = dom.window.document.querySelector('ul');
        assert.deepStrictEqual(childTexts(ul), ['X', 'Y', 'Z']);

        // Move Z to front: Z, X, Y
        list.children.length = 0;
        ['Z', 'X', 'Y'].forEach(t => {
            const li = app.k('li', {value: t});
            li.id = 'k-' + t; li.key = 'k-' + t;
            list.children.push(li);
        });

        render(app);

        assert.deepStrictEqual(childTexts(ul), ['Z', 'X', 'Y']);
    });
});

describe('diff: insert into middle of keyed list', () => {
    it('inserts a new keyed child between existing ones', () => {
        const dom = setup();
        const app = new VApp('root', new Renderer());
        app.saveSnapshot();

        const list = app.createElement('ul');
        ['A', 'C'].forEach(t => {
            const li = app.k('li', {value: t});
            li.id = 'k-' + t; li.key = 'k-' + t;
            list.appendChild(li);
        });

        render(app);

        const ul = dom.window.document.querySelector('ul');
        assert.deepStrictEqual(childTexts(ul), ['A', 'C']);

        // Insert B between A and C
        list.children.length = 0;
        ['A', 'B', 'C'].forEach(t => {
            const li = app.k('li', {value: t});
            li.id = 'k-' + t; li.key = 'k-' + t;
            list.children.push(li);
        });

        render(app);

        assert.deepStrictEqual(childTexts(ul), ['A', 'B', 'C']);
    });
});

describe('diff: unkeyed ID reassignment with different child count', () => {
    it('handles growing the child list without keys', () => {
        const dom = setup();
        const app = new VApp('root', new Renderer());
        app.saveSnapshot();

        const parent = app.createElement('div');
        parent.appendChild(app.k('span', {value: 'one'}));

        render(app);

        const div = dom.window.document.querySelector('div#root > div');
        assert.strictEqual(div.children.length, 1);

        // Add a second unkeyed child
        parent.appendChild(app.k('span', {value: 'two'}));

        render(app);

        assert.strictEqual(div.children.length, 2);
        assert.strictEqual(div.children[0].innerHTML, 'one');
        assert.strictEqual(div.children[1].innerHTML, 'two');
    });

    it('handles shrinking the child list without keys', () => {
        const dom = setup();
        const app = new VApp('root', new Renderer());
        app.saveSnapshot();

        const parent = app.createElement('div');
        const c1 = app.k('span', {value: 'one'});
        const c2 = app.k('span', {value: 'two'});
        const c3 = app.k('span', {value: 'three'});
        parent.appendChild(c1);
        parent.appendChild(c2);
        parent.appendChild(c3);

        render(app);

        const div = dom.window.document.querySelector('div#root > div');
        assert.strictEqual(div.children.length, 3);

        // Remove middle child
        parent.removeChild(c2);

        render(app);

        assert.strictEqual(div.children.length, 2);
        assert.strictEqual(div.children[0].innerHTML, 'one');
        assert.strictEqual(div.children[1].innerHTML, 'three');
    });
});

describe('diff: mixed keyed and unkeyed children', () => {
    it('preserves keyed nodes when unkeyed siblings are added', () => {
        const dom = setup();
        const app = new VApp('root', new Renderer());
        app.saveSnapshot();

        const parent = app.createElement('div');
        const keyed = app.k('p', {value: 'keyed'});
        keyed.id = 'stable'; keyed.key = 'stable';
        parent.appendChild(keyed);

        render(app);

        const div = dom.window.document.querySelector('div#root > div');
        const keyedEl = div.children[0];
        assert.strictEqual(keyedEl.innerHTML, 'keyed');

        // Add unkeyed sibling after the keyed one
        list = parent.$getChildren();
        const unkeyed = app.k('span', {value: 'new'});
        parent.appendChild(unkeyed);

        // Also rebuild the keyed node with same key
        const keyed2 = app.k('p', {value: 'keyed-updated'});
        keyed2.id = 'stable'; keyed2.key = 'stable';
        list[0] = keyed2;

        render(app);

        assert.strictEqual(div.children.length, 2);
        // Keyed element should be the same DOM node, reused
        assert.strictEqual(div.children[0], keyedEl);
        assert.strictEqual(div.children[0].innerHTML, 'keyed-updated');
        assert.strictEqual(div.children[1].innerHTML, 'new');
    });
});

describe('diff: attribute diffing uses old element correctly', () => {
    it('removes an attribute that existed on old node but not new', () => {
        const dom = setup();
        const app = new VApp('root', new Renderer());
        app.renderer.$knownAttributes.add('data-v');
        app.saveSnapshot();

        const div = app.k('div', {attrs: [new Attribute('data-v', 'yes')]});
        app.rootNode.appendChild(div);

        render(app);

        const el = dom.window.document.querySelector('div#root > div');
        assert.strictEqual(el.getAttribute('data-v'), 'yes');

        // New tree: same node, no attribute
        const children = app.rootNode.$getChildren();
        const div2 = app.k('div');
        div2.id = children[0].id;
        children[0] = div2;

        render(app);

        assert.strictEqual(el.getAttribute('data-v'), null);
    });
});

describe('diff: replaceWith when child not found', () => {
    it('does not corrupt children array when removing non-existent child', () => {
        const dom = setup();
        const app = new VApp('root', new Renderer());

        const parent = app.k('div');
        const real = app.k('span', {value: 'real'});
        parent.appendChild(real);

        const ghost = app.k('p');
        // ghost was never appended — removing it should not corrupt the array
        parent.$replaceWith(ghost, undefined);

        // replaceIndex is -1, splice(-1, 1) removes the LAST element
        const names = parent.$getChildren().map(c => c.nodeName);
        assert.deepStrictEqual(names, ['span']);
    });
});

describe('diff: node type change preserves children', () => {
    it('replaces node type and renders new children correctly', () => {
        const dom = setup();
        const app = new VApp('root', new Renderer());
        app.saveSnapshot();

        const parent = app.createElement('div');
        const child = app.k('em', {value: 'text'});
        parent.appendChild(child);

        render(app);

        const div = dom.window.document.querySelector('div#root > div');
        assert.strictEqual(div.children[0].tagName.toLowerCase(), 'em');

        // Replace em with strong (different nodeName → equals returns false)
        const children = parent.$getChildren();
        const strong = app.k('strong', {value: 'bold'});
        strong.id = children[0].id;
        children[0] = strong;

        render(app);

        assert.strictEqual(div.children[0].tagName.toLowerCase(), 'strong');
        assert.strictEqual(div.children[0].innerHTML, 'bold');
    });
});

describe('diff: removeElement on already-removed DOM node', () => {
    it('handles removing all children in sequence', () => {
        const dom = setup();
        const app = new VApp('root', new Renderer());
        app.saveSnapshot();

        const list = app.createElement('ul');
        const li1 = app.k('li', {value: '1'});
        li1.id = 'k1'; li1.key = 'k1';
        const li2 = app.k('li', {value: '2'});
        li2.id = 'k2'; li2.key = 'k2';
        const li3 = app.k('li', {value: '3'});
        li3.id = 'k3'; li3.key = 'k3';
        list.appendChild(li1);
        list.appendChild(li2);
        list.appendChild(li3);

        render(app);

        const ul = dom.window.document.querySelector('ul');
        assert.strictEqual(ul.children.length, 3);

        // Remove all children at once
        list.children.length = 0;

        render(app);

        assert.strictEqual(ul.children.length, 0);
    });
});
