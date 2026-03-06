const assert = require('assert');
const {JSDOM} = require('jsdom');
const {VApp, Renderer, Component, Props, reactive, jsx, enableDevWarnings, disableDevWarnings, Show, For} = require('../dist/index.cjs');

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

function render(app) {
    const patch = app.renderer.diffAgainstLatest(app);
    patch(app.rootNode.htmlElement);
}

function captureWarnings(fn) {
    const warnings = [];
    const origWarn = console.warn;
    console.warn = (msg) => warnings.push(msg);
    try {
        fn();
    } finally {
        console.warn = origWarn;
    }
    return warnings;
}

describe('dev warnings', () => {
    beforeEach(() => enableDevWarnings());
    afterEach(() => disableDevWarnings());

    describe('duplicate keys', () => {
        it('warns on duplicate keys among siblings', () => {
            const dom = setup();
            const app = new VApp('root', new Renderer());

            const warnings = captureWarnings(() => {
                jsx('ul', null,
                    jsx('li', { key: 'a' }, 'one'),
                    jsx('li', { key: 'a' }, 'two'),
                    jsx('li', { key: 'b' }, 'three')
                );
            });

            assert.ok(warnings.some(w => w.includes('duplicate keys') && w.includes('a')),
                'should warn about duplicate key "a"');
        });
    });

    describe('mixed keys', () => {
        it('warns when some children have keys and some do not', () => {
            const dom = setup();
            const app = new VApp('root', new Renderer());

            const warnings = captureWarnings(() => {
                jsx('ul', null,
                    jsx('li', { key: 'a' }, 'keyed'),
                    jsx('li', null, 'unkeyed')
                );
            });

            assert.ok(warnings.some(w => w.includes('only') && w.includes('have keys')),
                'should warn about mixed keys');
        });
    });

    describe('unkeyed list', () => {
        it('warns when multiple children have no keys', () => {
            const dom = setup();
            const app = new VApp('root', new Renderer());

            const warnings = captureWarnings(() => {
                jsx('ul', null,
                    jsx('li', null, 'a'),
                    jsx('li', null, 'b'),
                    jsx('li', null, 'c')
                );
            });

            assert.ok(warnings.some(w => w.includes('without keys')),
                'should warn about unkeyed list');
        });
    });

    describe('render returns undefined', () => {
        it('warns when class component render returns undefined', () => {
            const dom = setup();
            const app = new VApp('root', new Renderer());
            app.saveSnapshot();

            class Bad extends Component {
                constructor(app) { super(app); }
                render() { /* no return */ }
                lifeCycle() { return {}; }
            }

            const warnings = captureWarnings(() => {
                try {
                    app.mountComponent(new Bad(app), app.rootNode, new Props(app));
                } catch (e) { /* may crash, that's ok */ }
            });

            assert.ok(warnings.some(w => w.includes('returned undefined') && w.includes('Bad')),
                'should warn about undefined render');
        });
    });

    describe('functional component returns undefined', () => {
        it('warns when functional component returns undefined', () => {
            const dom = setup();
            const app = new VApp('root', new Renderer());

            function Broken(props) {
                // forgot return
            }

            const warnings = captureWarnings(() => {
                jsx(Broken, {});
            });

            assert.ok(warnings.some(w => w.includes('Broken') && w.includes('returned undefined')),
                'should warn about undefined functional component');
        });
    });

    describe('undefined child', () => {
        it('warns when a child is undefined (missing return in map)', () => {
            const dom = setup();
            const app = new VApp('root', new Renderer());

            const items = [1, 2, 3];
            const warnings = captureWarnings(() => {
                jsx('ul', null,
                    ...items.map(i => {
                        if (i === 2) return undefined; // oops, forgot return
                        return jsx('li', null, String(i));
                    })
                );
            });

            assert.ok(warnings.some(w => w.includes('undefined child')),
                'should warn about undefined child');
        });
    });

    describe('bind on non-input', () => {
        it('warns when bind:value is used on a div', () => {
            const dom = setup();
            const app = new VApp('root', new Renderer());

            const obj = { name: 'test' };
            const warnings = captureWarnings(() => {
                jsx('div', { 'bind:value': [obj, 'name'] });
            });

            assert.ok(warnings.some(w => w.includes('bind:value') && w.includes('<div>')),
                'should warn about bind on non-input');
        });
    });

    describe('update after unmount', () => {
        it('warns when reactive property is set on unmounted component', () => {
            const dom = setup();
            const app = new VApp('root', new Renderer());
            app.saveSnapshot();

            class Counter extends Component {
                constructor(app) {
                    super(app);
                    this.count = 0;
                }
                render() {
                    return jsx('span', null, String(this.count));
                }
                lifeCycle() { return {}; }
            }
            reactive()(Counter.prototype, 'count');

            const comp = new Counter(app);
            const mount = app.mountComponent(comp, app.rootNode, new Props(app));
            render(app);

            // Mark as mounted so unmount is allowed
            const holder = app.compProps.find(h => h.component === comp);
            holder.mounted[0] = true;

            // Unmount
            app.unmountComponent(mount);
            render(app);

            const warnings = captureWarnings(() => {
                comp.count = 99;
            });

            assert.ok(warnings.some(w => w.includes('unmounted') && w.includes('Counter')),
                'should warn about update after unmount');
        });
    });

    describe('no warnings when disabled', () => {
        it('produces no warnings when dev mode is off', () => {
            disableDevWarnings();
            const dom = setup();
            const app = new VApp('root', new Renderer());

            const warnings = captureWarnings(() => {
                jsx('ul', null,
                    jsx('li', { key: 'a' }, 'one'),
                    jsx('li', { key: 'a' }, 'two')
                );
            });

            assert.strictEqual(warnings.length, 0, 'no warnings when dev mode is off');
        });
    });

    describe('deduplication', () => {
        it('does not repeat the same warning', () => {
            const dom = setup();
            const app = new VApp('root', new Renderer());

            const warnings = captureWarnings(() => {
                // Same duplicate key pattern twice
                jsx('ul', null,
                    jsx('li', { key: 'x' }, 'a'),
                    jsx('li', { key: 'x' }, 'b')
                );
                jsx('ul', null,
                    jsx('li', { key: 'x' }, 'c'),
                    jsx('li', { key: 'x' }, 'd')
                );
            });

            const dupWarnings = warnings.filter(w => w.includes('duplicate keys'));
            assert.strictEqual(dupWarnings.length, 1, 'should only warn once for same pattern');
        });
    });
});
