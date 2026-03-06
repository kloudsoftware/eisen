const assert = require('assert');
const {JSDOM} = require('jsdom');
const {createApp, Component, reactive, jsx} = require('../dist/index.cjs');

describe('createApp', () => {
    beforeEach(() => {
        const dom = new JSDOM('<div id="app"></div>', {url: 'http://localhost'});
        global.window = dom.window;
        global.document = dom.window.document;
        global.localStorage = dom.window.localStorage;
        global.navigator = dom.window.navigator;
        global.HTMLElement = dom.window.HTMLElement;
    });

    it('boots an app with one line', () => {
        class Hello extends Component {
            render() {
                return jsx('h1', null, 'Hello');
            }
        }

        const {app, component} = createApp(Hello, '#app');
        assert(app);
        assert(component instanceof Hello);
        assert.strictEqual(component.app, app);
        assert(component.$mount);
    });

    it('accepts selector without #', () => {
        class Hello extends Component {
            render() {
                return jsx('h1', null, 'Hello');
            }
        }

        const {app} = createApp(Hello, 'app');
        assert(app);
    });

    it('does not require lifeCycle override', () => {
        class Minimal extends Component {
            render() {
                return jsx('div', null, 'minimal');
            }
            // no lifeCycle() override
        }

        const {component} = createApp(Minimal, '#app');
        assert(component.$mount);
        // lifeCycle returns default empty object
        const lc = component.lifeCycle();
        assert.deepStrictEqual(lc, {});
    });

    it('renders to DOM after flush', () => {
        class Greeter extends Component {
            render() {
                return jsx('p', {className: 'greeting'}, 'hi');
            }
        }

        const {app} = createApp(Greeter, '#app');
        const patch = app.renderer.diffAgainstLatest(app);
        patch(app.rootNode.htmlElement);

        const el = document.querySelector('.greeting');
        assert(el);
        assert.strictEqual(el.textContent, 'hi');
    });
});
