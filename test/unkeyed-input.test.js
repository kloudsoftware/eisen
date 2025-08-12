const assert = require('assert');
const {JSDOM} = require('jsdom');
const {VApp, Renderer, Component, Props, reactive} = require('../lib/index.modern.js.js');

describe('unkeyed input binding', () => {
    it('keeps typed text and focus across rerenders', () => {
        const dom = new JSDOM('<div id="root"></div>', {url: 'http://localhost'});
        global.window = dom.window;
        global.document = dom.window.document;
        global.localStorage = dom.window.localStorage;
        global.navigator = dom.window.navigator;
        global.HTMLElement = dom.window.HTMLElement;
        global.HTMLInputElement = dom.window.HTMLInputElement;

        const app = new VApp('root', new Renderer());
        app.snapshots.push(app.clone());

        class DraftComp extends Component {
            constructor(app) { super(app); }
            render() {
                return jsx('div', null,
                    jsx('input', {
                        value: this.draft,
                        ref: el => el.bindObject(this, 'draft')
                    })
                );
            }
            lifeCycle() { return {}; }
        }
        reactive()(DraftComp.prototype, 'draft');

        const comp = new DraftComp(app);
        app.mountComponent(comp, app.rootNode, new Props(app));
        let patch = app.renderer.diffAgainstLatest(app);
        patch(app.rootNode.htmlElement);

        const input = dom.window.document.querySelector('input');
        input.focus();
        input.value = 'hello';
        input.dispatchEvent(new dom.window.Event('input', {bubbles: true}));

        patch = app.renderer.diffAgainstLatest(app);
        patch(app.rootNode.htmlElement);

        const updated = dom.window.document.querySelector('input');
        assert.strictEqual(updated.value, 'hello');
        assert.strictEqual(dom.window.document.activeElement, updated);
    });
});
