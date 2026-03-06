const assert = require('assert');
const {JSDOM} = require('jsdom');
const {VApp, Renderer} = require('../dist/index.cjs');

function setup() {
    const dom = new JSDOM('<div id="root"></div>', {url: 'http://localhost'});
    global.window = dom.window;
    global.document = dom.window.document;
    global.localStorage = dom.window.localStorage;
    global.navigator = dom.window.navigator;
    return dom;
}

function renderApp(app) {
    const patch = app.renderer.diffAgainstLatest(app);
    patch(app.rootNode.htmlElement);
}

describe('EventHandler', () => {
    describe('bubble vs non-bubble', () => {
        it('skips handler registered with bubble=false when event bubbles from child', () => {
            const dom = setup();
            const app = new VApp('root', new Renderer());
            app.saveSnapshot();

            const wrapper = app.createElement('div');
            const child = app.k('button');
            wrapper.appendChild(child);

            const calls = [];
            wrapper.addEventlistener('click', () => calls.push('parent-nobubble'), false);
            child.addEventlistener('click', () => calls.push('child'));

            renderApp(app);

            const btn = dom.window.document.querySelector('button');
            btn.dispatchEvent(new dom.window.Event('click', {bubbles: true}));

            assert.deepStrictEqual(calls, ['child']);
        });

        it('fires handler registered with bubble=true when event bubbles from child', () => {
            const dom = setup();
            const app = new VApp('root', new Renderer());
            app.saveSnapshot();

            const wrapper = app.createElement('div');
            const child = app.k('button');
            wrapper.appendChild(child);

            const calls = [];
            wrapper.addEventlistener('click', () => calls.push('parent-bubble'), true);
            child.addEventlistener('click', () => calls.push('child'));

            renderApp(app);

            const btn = dom.window.document.querySelector('button');
            btn.dispatchEvent(new dom.window.Event('click', {bubbles: true}));

            assert.deepStrictEqual(calls, ['child', 'parent-bubble']);
        });
    });

    describe('multiple handlers on same node', () => {
        it('fires all handlers for the same event type', () => {
            const dom = setup();
            const app = new VApp('root', new Renderer());
            app.saveSnapshot();

            const btn = app.createElement('button');
            const calls = [];
            btn.addEventlistener('click', () => calls.push('first'));
            btn.addEventlistener('click', () => calls.push('second'));

            renderApp(app);

            const btnEl = dom.window.document.querySelector('button');
            btnEl.dispatchEvent(new dom.window.Event('click', {bubbles: true}));

            assert.deepStrictEqual(calls, ['first', 'second']);
        });
    });

    describe('preventDefault', () => {
        it('calls preventDefault when handler returns false', () => {
            const dom = setup();
            const app = new VApp('root', new Renderer());
            app.saveSnapshot();

            const btn = app.createElement('button');
            btn.addEventlistener('click', () => false);

            renderApp(app);

            const btnEl = dom.window.document.querySelector('button');
            let prevented = false;
            const origPreventDefault = dom.window.Event.prototype.preventDefault;
            dom.window.Event.prototype.preventDefault = function () {
                prevented = true;
                origPreventDefault.call(this);
            };

            btnEl.dispatchEvent(new dom.window.Event('click', {bubbles: true}));
            dom.window.Event.prototype.preventDefault = origPreventDefault;

            assert.strictEqual(prevented, true);
        });
    });

    describe('lazy attachment', () => {
        it('registers DOM listener on first handler registration for that event type', () => {
            const dom = setup();
            const app = new VApp('root', new Renderer());
            app.saveSnapshot();

            // Register click handler, then later mousedown
            const btn = app.createElement('button');
            const calls = [];
            btn.addEventlistener('click', () => calls.push('click'));

            renderApp(app);

            // Now register mousedown on a new element
            const span = app.createElement('span');
            span.addEventlistener('mousedown', () => calls.push('mousedown'));

            renderApp(app);

            const spanEl = dom.window.document.querySelector('span');
            spanEl.dispatchEvent(new dom.window.Event('mousedown', {bubbles: true}));

            assert.deepStrictEqual(calls, ['mousedown']);
        });
    });

    describe('purge deep', () => {
        it('removes handlers from entire subtree', () => {
            const dom = setup();
            const app = new VApp('root', new Renderer());
            app.saveSnapshot();

            const parent = app.createElement('div');
            const child = app.k('button');
            parent.appendChild(child);

            const calls = [];
            child.addEventlistener('click', () => calls.push('child'));

            renderApp(app);

            // Purge the parent deeply — should remove child handlers too
            app.eventHandler.purge(parent, true);

            const btnEl = dom.window.document.querySelector('button');
            btnEl.dispatchEvent(new dom.window.Event('click', {bubbles: true}));

            assert.deepStrictEqual(calls, []);
        });
    });

    describe('reassign', () => {
        it('moves handler to new ID so dispatch still finds it', () => {
            const dom = setup();
            const app = new VApp('root', new Renderer());
            app.saveSnapshot();

            const btn = app.createElement('button');
            const calls = [];
            btn.addEventlistener('click', () => calls.push('clicked'));

            renderApp(app);

            const oldId = btn.id;
            const newId = 'reassigned-id';
            app.eventHandler.reassign(btn, oldId, newId);
            btn.id = newId;

            const btnEl = dom.window.document.querySelector('button');
            btnEl.dispatchEvent(new dom.window.Event('click', {bubbles: true}));

            assert.deepStrictEqual(calls, ['clicked']);
        });

        it('is a no-op when previousId equals nextId', () => {
            const dom = setup();
            const app = new VApp('root', new Renderer());
            app.saveSnapshot();

            const btn = app.createElement('button');
            const calls = [];
            btn.addEventlistener('click', () => calls.push('clicked'));

            renderApp(app);

            app.eventHandler.reassign(btn, btn.id, btn.id);

            const btnEl = dom.window.document.querySelector('button');
            btnEl.dispatchEvent(new dom.window.Event('click', {bubbles: true}));

            assert.deepStrictEqual(calls, ['clicked']);
        });
    });

    describe('dispatch with no matching handlers', () => {
        it('does not throw when no handler is registered for the event', () => {
            const dom = setup();
            const app = new VApp('root', new Renderer());
            app.saveSnapshot();

            app.createElement('button');
            renderApp(app);

            // Register a click handler to ensure the listener is attached
            // but dispatch a different event on the button
            const btn2 = app.createElement('span');
            btn2.addEventlistener('click', () => {});
            renderApp(app);

            const btnEl = dom.window.document.querySelector('button');
            // Should not throw — click listener exists on root but no handler for this element
            btnEl.dispatchEvent(new dom.window.Event('click', {bubbles: true}));
        });
    });
});
