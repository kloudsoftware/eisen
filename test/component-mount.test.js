const assert = require('assert');
const {JSDOM} = require('jsdom');
const {VApp, Renderer, Component, Props} = require('../lib/index.modern.js.js');

describe('component mounting', () => {
    it('does not wrap component root with an extra element', () => {
        const dom = new JSDOM('<div id="root"></div>', {url: 'http://localhost'});
        global.window = dom.window;
        global.document = dom.window.document;
        global.localStorage = dom.window.localStorage;
        global.navigator = dom.window.navigator;
        global.HTMLElement = dom.window.HTMLElement;

        const app = new VApp('root', new Renderer());
        app.snapshots.push(app.clone());

        class SimpleComp extends Component {
            constructor(app) { super(app); }
            render() {
                return jsx('span', null, 'hi');
            }
            lifeCycle() { return {}; }
        }

        const comp = new SimpleComp(app);
        app.mountComponent(comp, app.rootNode, new Props(app));
        let patch = app.renderer.diffAgainstLatest(app);
        patch(app.rootNode.htmlElement);

        const root = dom.window.document.getElementById('root');
        assert.strictEqual(root.children.length, 1);
        assert.strictEqual(root.children[0].tagName.toLowerCase(), 'span');

        // trigger rerender and ensure structure remains
        comp.rerender();
        patch = app.renderer.diffAgainstLatest(app);
        patch(app.rootNode.htmlElement);
        assert.strictEqual(root.children.length, 1);
        assert.strictEqual(root.children[0].tagName.toLowerCase(), 'span');
    });
});
