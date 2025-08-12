const assert = require('assert');
const {JSDOM} = require('jsdom');
const {VApp, Renderer} = require('../lib/index.modern.js.js');

describe('keyed list diffing', () => {
    it('removes only the targeted item when deleting from the middle', () => {
        const dom = new JSDOM('<div id="root"></div>', {url: 'http://localhost'});
        global.window = dom.window;
        global.document = dom.window.document;
        global.localStorage = dom.window.localStorage;
        global.navigator = dom.window.navigator;

        const app = new VApp('root', new Renderer());
        app.snapshots.push(app.clone());
        const list = app.createElement('ul');
        const calls = [];

        function addItem(id) {
            const li = app.k('li');
            li.id = String(id);
            const btn = app.k('button');
            btn.addEventlistener('click', () => calls.push(id));
            li.appendChild(btn);
            list.appendChild(li);
        }

        addItem(1);
        addItem(2);
        addItem(3);
        let patch = app.renderer.diffAgainstLatest(app);
        patch(app.rootNode.htmlElement);

        // Remove middle item and re-render
        list.removeChild(list.$getChildren()[1]);
        patch = app.renderer.diffAgainstLatest(app);
        patch(app.rootNode.htmlElement);

        const btnEls = dom.window.document.querySelectorAll('button');
        assert.strictEqual(btnEls.length, 2);
        btnEls[1].dispatchEvent(new dom.window.Event('click', {bubbles: true}));
        assert.deepStrictEqual(calls, [3]);
    });
});
