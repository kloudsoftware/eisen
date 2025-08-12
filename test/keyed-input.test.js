const assert = require('assert');
const {JSDOM} = require('jsdom');
const {VApp, Renderer, Component, Props, reactive} = require('../lib/index.modern.js.js');

describe('keyed input binding', () => {
    it('retains typed text across rerenders', () => {
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
                        key: 'todo-item-input',
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
        input.value = 'hello';
        input.dispatchEvent(new dom.window.Event('input', {bubbles: true}));

        patch = app.renderer.diffAgainstLatest(app);
        patch(app.rootNode.htmlElement);

        assert.strictEqual(dom.window.document.querySelector('input').value, 'hello');
    });
});
