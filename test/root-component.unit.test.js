const assert = require('assert');
const {JSDOM} = require('jsdom');
const {VApp, Renderer, Component, Props} = require('../dist/index.cjs');

describe('root-level component unit', () => {
    it('mounts components directly on the application root', () => {
        const dom = new JSDOM('<div id="root"></div>', {url: 'http://localhost'});
        global.window = dom.window;
        global.document = dom.window.document;
        global.localStorage = dom.window.localStorage;
        global.navigator = dom.window.navigator;
        global.HTMLElement = dom.window.HTMLElement;

        const app = new VApp('root', new Renderer());

        class RootProbe extends Component {
            constructor(app) {
                super(app);
                this.renderCount = 0;
            }

            render() {
                this.renderCount += 1;
                return this.app.k('section', {value: `render-${this.renderCount}`});
            }

            lifeCycle() {
                return {};
            }
        }

        const props = new Props(app);
        const comp = new RootProbe(app);
        const initialMount = app.mountComponent(comp, app.rootNode, props);

        assert.strictEqual(comp.app, app);
        assert.strictEqual(comp.props, props);
        assert.strictEqual(comp.$mount, initialMount);
        assert.strictEqual(initialMount.parent, app.rootNode);
        assert.strictEqual(app.rootNode.$getChildren().length, 1);
        assert.strictEqual(app.rootNode.$getChildren()[0], initialMount);
        assert.deepStrictEqual(app.getComponentsWithMountAs(initialMount), [comp]);

        comp.rerender();
        const updatedMount = comp.$mount;
        assert.notStrictEqual(updatedMount, initialMount);
        assert.strictEqual(updatedMount.parent, app.rootNode);
        assert.strictEqual(app.rootNode.$getChildren().length, 1);
        assert.strictEqual(app.rootNode.$getChildren()[0], updatedMount);
        assert.deepStrictEqual(app.getComponentsWithMountAs(updatedMount), [comp]);
    });
});
