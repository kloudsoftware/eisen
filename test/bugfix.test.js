const assert = require('assert');
const {JSDOM} = require('jsdom');
const {VApp, Renderer, Attribute, Component, Props} = require('../dist/index.cjs');

function setup() {
    const dom = new JSDOM('<div id="root"></div>', {url: 'http://localhost'});
    global.window = dom.window;
    global.document = dom.window.document;
    global.localStorage = dom.window.localStorage;
    global.navigator = dom.window.navigator;
    global.HTMLElement = dom.window.HTMLElement;
    return dom;
}

describe('bug fixes', () => {
    describe('VNode.removeAttribute', () => {
        it('removes only the targeted attribute, not subsequent ones', () => {
            const dom = setup();
            const app = new VApp('root', new Renderer());

            const div = app.k('div', {
                attrs: [
                    new Attribute('class', 'foo'),
                    new Attribute('data-x', '1'),
                    new Attribute('data-y', '2'),
                ],
            });

            div.removeAttribute('data-x');

            const names = div.$getAttrs().map(a => a.attrName);
            assert.deepStrictEqual(names, ['class', 'data-y']);
        });
    });

    describe('Component.mountArgs', () => {
        it('spreads arguments to the subcomponent constructor', () => {
            const dom = setup();
            const app = new VApp('root', new Renderer());
            app.saveSnapshot();

            const received = [];

            class Child extends Component {
                constructor(app, a, b) {
                    super(app);
                    received.push(a, b);
                }
                render() { return app.k('span'); }
                lifeCycle() { return {}; }
            }

            class Parent extends Component {
                constructor(app) { super(app); }
                render() {
                    const mount = app.k('div');
                    this.mountArgs(Child, app, mount, 'child-key', 'hello', 42);
                    return mount;
                }
                lifeCycle() { return {}; }
            }

            const parent = new Parent(app);
            app.mountComponent(parent, app.rootNode, new Props(app));

            assert.deepStrictEqual(received, ['hello', 42]);
        });
    });

    describe('Props.registerCallback', () => {
        it('registers callback only once for non-exclusive mode', () => {
            const dom = setup();
            const app = new VApp('root', new Renderer());
            const props = new Props(app);

            const calls = [];
            props.registerCallback('key', v => calls.push(v));
            props.setPropSilent('key', 'val');

            assert.deepStrictEqual(calls, ['val']);
        });
    });
});
