const assert = require('assert');
const {JSDOM} = require('jsdom');
const {VApp, Renderer, Component, Props, reactive, jsx, Transition} = require('../dist/index.cjs');

function setup() {
    const dom = new JSDOM('<div id="root"></div>', {url: 'http://localhost'});
    global.window = dom.window;
    global.document = dom.window.document;
    global.localStorage = dom.window.localStorage;
    global.navigator = dom.window.navigator;
    global.HTMLElement = dom.window.HTMLElement;

    // Polyfill requestAnimationFrame for jsdom
    let rafId = 0;
    const rafCallbacks = [];
    global.requestAnimationFrame = (cb) => {
        const id = ++rafId;
        rafCallbacks.push({ id, cb });
        return id;
    };

    // Helper to flush all pending rAF callbacks (including nested ones)
    dom._flushRAF = () => {
        let safety = 20;
        while (rafCallbacks.length > 0 && safety-- > 0) {
            const batch = rafCallbacks.splice(0);
            batch.forEach(({ cb }) => cb(performance.now()));
        }
    };

    return dom;
}

function render(app) {
    const patch = app.renderer.diffAgainstLatest(app);
    patch(app.rootNode.htmlElement);
}

// Transition classes are applied to the first child of the display:contents
// wrapper (since display:contents elements don't generate a box).
function getTarget(root) {
    const wrapper = root.querySelector('[style="display:contents"]');
    return wrapper && wrapper.firstElementChild ? wrapper.firstElementChild : wrapper;
}

describe('Transition', () => {
    describe('enter', () => {
        it('adds enter-from and enter-active classes on mount', () => {
            const dom = setup();
            const app = new VApp('root', new Renderer());
            app.saveSnapshot();

            const node = jsx(Transition, { when: true, name: 'fade' },
                jsx('span', null, 'hello')
            );
            app.rootNode.appendChild(node);
            render(app);

            const root = dom.window.document.getElementById('root');
            const target = getTarget(root);

            assert.ok(target.classList.contains('fade-enter-from'), 'should have enter-from');
            assert.ok(target.classList.contains('fade-enter-active'), 'should have enter-active');
        });

        it('transitions to enter-to after rAF flush', () => {
            const dom = setup();
            const app = new VApp('root', new Renderer());
            app.saveSnapshot();

            const node = jsx(Transition, { when: true, name: 'fade' },
                jsx('span', null, 'hello')
            );
            app.rootNode.appendChild(node);
            render(app);

            const root = dom.window.document.getElementById('root');
            const target = getTarget(root);

            dom._flushRAF();

            assert.ok(!target.classList.contains('fade-enter-from'), 'enter-from should be removed');
            assert.ok(target.classList.contains('fade-enter-active'), 'enter-active should still be present');
            assert.ok(target.classList.contains('fade-enter-to'), 'enter-to should be added');
        });

        it('cleans up classes after transitionend', () => {
            const dom = setup();
            const app = new VApp('root', new Renderer());
            app.saveSnapshot();

            const node = jsx(Transition, { when: true, name: 'slide' },
                jsx('span', null, 'hello')
            );
            app.rootNode.appendChild(node);
            render(app);

            const root = dom.window.document.getElementById('root');
            const target = getTarget(root);

            dom._flushRAF();

            const event = new dom.window.Event('transitionend');
            target.dispatchEvent(event);

            assert.ok(!target.classList.contains('slide-enter-active'), 'enter-active should be removed');
            assert.ok(!target.classList.contains('slide-enter-to'), 'enter-to should be removed');
        });

        it('does not re-trigger enter on re-render', () => {
            const dom = setup();
            const app = new VApp('root', new Renderer());
            app.saveSnapshot();

            class Box extends Component {
                constructor(app) {
                    super(app);
                    this.visible = true;
                    this.label = 'v1';
                }
                render() {
                    return jsx('div', null,
                        jsx(Transition, { when: this.visible, name: 'fade' },
                            jsx('span', null, this.label)
                        )
                    );
                }
                lifeCycle() { return {}; }
            }
            reactive()(Box.prototype, 'visible');
            reactive()(Box.prototype, 'label');

            const comp = new Box(app);
            app.mountComponent(comp, app.rootNode, new Props(app));
            render(app);

            const root = dom.window.document.getElementById('root');
            let target = getTarget(root);

            // Complete enter transition
            dom._flushRAF();
            target.dispatchEvent(new dom.window.Event('transitionend'));

            assert.ok(!target.classList.contains('fade-enter-from'));
            assert.ok(!target.classList.contains('fade-enter-active'));

            // Re-render with different label
            comp.label = 'v2';
            render(app);

            target = getTarget(root);
            assert.ok(!target.classList.contains('fade-enter-from'), 'should not re-trigger enter');
            assert.ok(!target.classList.contains('fade-enter-active'), 'should not re-trigger enter');
        });
    });

    describe('leave', () => {
        it('delays removal and adds leave classes', () => {
            const dom = setup();
            const app = new VApp('root', new Renderer());
            app.saveSnapshot();

            class Box extends Component {
                constructor(app) {
                    super(app);
                    this.visible = true;
                }
                render() {
                    return jsx('div', null,
                        jsx(Transition, { when: this.visible, name: 'fade' },
                            jsx('span', null, 'content')
                        )
                    );
                }
                lifeCycle() { return {}; }
            }
            reactive()(Box.prototype, 'visible');

            const comp = new Box(app);
            app.mountComponent(comp, app.rootNode, new Props(app));
            render(app);

            const root = dom.window.document.getElementById('root');

            // Complete enter
            dom._flushRAF();
            const target = getTarget(root);
            target.dispatchEvent(new dom.window.Event('transitionend'));

            // Now hide — trigger leave
            comp.visible = false;
            render(app);

            // Element should still be in DOM (delayed removal)
            assert.ok(root.querySelector('[style="display:contents"]'), 'wrapper should still be in DOM during leave');

            // Leave classes should be applied to the target
            const leavingTarget = getTarget(root);
            assert.ok(leavingTarget.classList.contains('fade-leave-from'), 'should have leave-from');
            assert.ok(leavingTarget.classList.contains('fade-leave-active'), 'should have leave-active');
        });

        it('transitions to leave-to after rAF flush', () => {
            const dom = setup();
            const app = new VApp('root', new Renderer());
            app.saveSnapshot();

            class Box extends Component {
                constructor(app) {
                    super(app);
                    this.visible = true;
                }
                render() {
                    return jsx('div', null,
                        jsx(Transition, { when: this.visible, name: 'fade' },
                            jsx('span', null, 'content')
                        )
                    );
                }
                lifeCycle() { return {}; }
            }
            reactive()(Box.prototype, 'visible');

            const comp = new Box(app);
            app.mountComponent(comp, app.rootNode, new Props(app));
            render(app);

            const root = dom.window.document.getElementById('root');
            dom._flushRAF();
            getTarget(root).dispatchEvent(new dom.window.Event('transitionend'));

            comp.visible = false;
            render(app);

            // Flush the leave rAFs
            dom._flushRAF();

            const leavingTarget = getTarget(root);
            assert.ok(!leavingTarget.classList.contains('fade-leave-from'), 'leave-from should be removed');
            assert.ok(leavingTarget.classList.contains('fade-leave-active'), 'leave-active should be present');
            assert.ok(leavingTarget.classList.contains('fade-leave-to'), 'leave-to should be added');
        });

        it('removes element after transitionend', () => {
            const dom = setup();
            const app = new VApp('root', new Renderer());
            app.saveSnapshot();

            class Box extends Component {
                constructor(app) {
                    super(app);
                    this.visible = true;
                }
                render() {
                    return jsx('div', null,
                        jsx(Transition, { when: this.visible, name: 'fade' },
                            jsx('span', null, 'bye')
                        )
                    );
                }
                lifeCycle() { return {}; }
            }
            reactive()(Box.prototype, 'visible');

            const comp = new Box(app);
            app.mountComponent(comp, app.rootNode, new Props(app));
            render(app);

            const root = dom.window.document.getElementById('root');
            dom._flushRAF();
            getTarget(root).dispatchEvent(new dom.window.Event('transitionend'));

            comp.visible = false;
            render(app);
            dom._flushRAF();

            // Fire transitionend on the leaving target
            const leavingTarget = getTarget(root);
            leavingTarget.dispatchEvent(new dom.window.Event('transitionend'));

            // Element should be removed from DOM after a microtask (Promise.then)
            return new Promise(resolve => setTimeout(resolve, 0)).then(() => {
                assert.ok(!root.querySelector('[style="display:contents"]'), 'wrapper should be removed from DOM');
            });
        });

        it('removes element after fallback timeout', () => {
            const dom = setup();
            const app = new VApp('root', new Renderer());
            app.saveSnapshot();

            class Box extends Component {
                constructor(app) {
                    super(app);
                    this.visible = true;
                }
                render() {
                    return jsx('div', null,
                        jsx(Transition, { when: this.visible, name: 'fade', duration: 50 },
                            jsx('span', null, 'timeout')
                        )
                    );
                }
                lifeCycle() { return {}; }
            }
            reactive()(Box.prototype, 'visible');

            const comp = new Box(app);
            app.mountComponent(comp, app.rootNode, new Props(app));
            render(app);

            const root = dom.window.document.getElementById('root');
            dom._flushRAF();
            getTarget(root).dispatchEvent(new dom.window.Event('transitionend'));

            comp.visible = false;
            render(app);
            dom._flushRAF();

            // Don't fire transitionend — let the fallback timeout handle it
            return new Promise(resolve => setTimeout(resolve, 100)).then(() => {
                assert.ok(!root.querySelector('[style="display:contents"]'), 'wrapper should be removed after timeout');
            });
        });
    });

    describe('returns null when not visible', () => {
        it('returns null when when=false', () => {
            const dom = setup();
            const app = new VApp('root', new Renderer());

            const result = jsx(Transition, { when: false, name: 'fade' },
                jsx('span', null, 'hidden')
            );
            assert.strictEqual(result, null);
        });
    });

    describe('defaults', () => {
        it('uses "v" as default name prefix', () => {
            const dom = setup();
            const app = new VApp('root', new Renderer());
            app.saveSnapshot();

            const node = jsx(Transition, { when: true },
                jsx('span', null, 'hello')
            );
            app.rootNode.appendChild(node);
            render(app);

            const root = dom.window.document.getElementById('root');
            const target = getTarget(root);
            assert.ok(target.classList.contains('v-enter-from'));
            assert.ok(target.classList.contains('v-enter-active'));
        });
    });
});
