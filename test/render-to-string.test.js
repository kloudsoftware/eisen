const assert = require('assert');
const {JSDOM} = require('jsdom');
const {createApp, Component, jsx, renderToString} = require('../dist/index.cjs');

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

describe('renderToString', () => {
    beforeEach(() => setup());

    it('renders a simple element', () => {
        class App extends Component {
            render() { return jsx('div', null); }
        }
        const { app } = createApp(App, '#root');
        const node = app.rootNode.$getChildren()[0];
        const html = renderToString(node);
        assert.strictEqual(html, '<div></div>');
    });

    it('renders nested elements with text', () => {
        class App extends Component {
            render() {
                return jsx('div', { className: 'wrapper' },
                    jsx('h1', null, 'Hello'),
                    jsx('p', null, 'World')
                );
            }
        }
        const { app } = createApp(App, '#root');
        const node = app.rootNode.$getChildren()[0];
        const html = renderToString(node);
        assert(html.includes('<h1>'), 'should have h1 tag');
        assert(html.includes('Hello'), 'should have text content');
        assert(html.includes('class="wrapper"'), 'should have class attribute');
    });

    it('renders void elements self-closing', () => {
        class App extends Component {
            render() {
                return jsx('div', null,
                    jsx('input', { type: 'text' }),
                    jsx('br', null)
                );
            }
        }
        const { app } = createApp(App, '#root');
        const node = app.rootNode.$getChildren()[0];
        const html = renderToString(node);
        assert(html.includes('<input'), 'should have input');
        assert(html.includes('/>'), 'void elements should self-close');
        assert(html.includes('<br />'), 'br should self-close');
    });

    it('escapes HTML in text content', () => {
        class App extends Component {
            render() {
                return jsx('span', null, '<script>alert("xss")</script>');
            }
        }
        const { app } = createApp(App, '#root');
        const node = app.rootNode.$getChildren()[0];
        const html = renderToString(node);
        assert(!html.includes('<script>'), 'should escape script tags');
        assert(html.includes('&lt;script&gt;'), 'should use HTML entities');
    });

    it('returns empty string for null', () => {
        assert.strictEqual(renderToString(null), '');
    });
});
