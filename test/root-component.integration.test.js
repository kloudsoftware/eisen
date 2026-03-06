const assert = require('assert');
const {JSDOM} = require('jsdom');
const {VApp, Renderer, Component, Props, reactive} = require('../dist/index.cjs');

describe('root-level component integration', () => {
    it('updates the DOM when reactive state changes at the root mount', () => {
        const dom = new JSDOM('<div id="root"></div>', {url: 'http://localhost'});
        global.window = dom.window;
        global.document = dom.window.document;
        global.localStorage = dom.window.localStorage;
        global.navigator = dom.window.navigator;
        global.HTMLElement = dom.window.HTMLElement;

        const app = new VApp('root', new Renderer());
        app.saveSnapshot();

        class RootCounter extends Component {
            constructor(app) {
                super(app);
                this.count = 0;
            }

            increment = () => {
                this.count += 1;
            };

            render() {
                return jsx('button', {onClick: this.increment}, String(this.count));
            }

            lifeCycle() {
                return {};
            }
        }

        reactive()(RootCounter.prototype, 'count');

        const comp = new RootCounter(app);
        app.mountComponent(comp, app.rootNode, new Props(app));

        let patch = app.renderer.diffAgainstLatest(app);
        patch(app.rootNode.htmlElement);

        const root = dom.window.document.getElementById('root');
        const button = root.querySelector('button');
        assert(button);
        assert.strictEqual(button.textContent, '0');

        button.dispatchEvent(new dom.window.Event('click', {bubbles: true}));

        patch = app.renderer.diffAgainstLatest(app);
        patch(app.rootNode.htmlElement);

        const updatedButton = root.querySelector('button');
        assert(updatedButton);
        assert.strictEqual(updatedButton.textContent, '1');
        assert.strictEqual(root.children.length, 1);
        assert.strictEqual(root.children[0], updatedButton);
    });
});
