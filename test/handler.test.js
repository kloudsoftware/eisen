const assert = require('assert');
const {JSDOM} = require('jsdom');
const {VApp, Renderer} = require('../lib/index.modern.js.js');

describe('event handler cleanup', () => {
    it('removes stale handlers when list items are deleted', () => {
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
            const btn = app.k('button');
            btn.addEventlistener('click', () => calls.push(id));
            li.appendChild(btn);
            list.appendChild(li);
        }

        addItem(1);
        addItem(2);
        let patch = app.renderer.diffAgainstLatest(app);
        patch(app.rootNode.htmlElement);

        // Remove first item and re-render
        list.removeChild(list.$getChildren()[0]);
        patch = app.renderer.diffAgainstLatest(app);
        patch(app.rootNode.htmlElement);

        // Click remaining button
        const btnEl = dom.window.document.querySelector('button');
        btnEl.dispatchEvent(new dom.window.Event('click', {bubbles: true}));

        assert.deepStrictEqual(calls, [2]);
    });
});
