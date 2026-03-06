import {VNode, VNodeType, Attribute} from './VNode';
import {VApp} from './VApp';
import {Renderer} from './render';
import {Props} from './Props';
import {Component, ComponentHolder, _setHookComponent} from './Component';
import {setJSXApp} from './jsx';

const VOID_ELEMENTS = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

function escapeHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Serializes a VNode tree to an HTML string.
 * Useful for testing and SSR.
 *
 * Usage:
 *   const html = renderToString(<App />);
 *   assert(html.includes('<h1>Hello</h1>'));
 */
export function renderToString(node: VNode | null): string {
    if (!node) return '';

    if (node.isTextNode) {
        return escapeHtml(node.getInnerHtml() || '');
    }

    const tag = node.nodeName;
    let html = `<${tag}`;

    // Attributes
    const attrs = node.$getAttrs();
    for (let i = 0; i < attrs.length; i++) {
        const a = attrs[i];
        if (a.attrValue === '') {
            html += ` ${a.attrName}`;
        } else {
            html += ` ${a.attrName}="${escapeHtml(a.attrValue)}"`;
        }
    }

    if (VOID_ELEMENTS.has(tag)) {
        return html + ' />';
    }

    html += '>';

    // dangerouslySetInnerHTML
    if (node.dangerousHtml !== undefined) {
        html += node.dangerousHtml;
    } else {
        // Inner text content
        const inner = node.getInnerHtml();
        if (inner) {
            html += escapeHtml(inner);
        }

        // Children
        const children = node.$getChildren();
        for (let i = 0; i < children.length; i++) {
            html += renderToString(children[i]);
        }
    }

    html += `</${tag}>`;
    return html;
}

/**
 * Server-side render. Creates a headless VApp (no DOM required), renders
 * a component or function, and returns the HTML string.
 *
 * Works in Node.js without jsdom.
 *
 * Usage (class component):
 *   const html = renderApp(MyApp, 'app');
 *   // => '<div id="app"><h1>Hello</h1></div>'
 *
 * Usage (function):
 *   const html = renderApp(() => <h1>Hello</h1>, 'app');
 */
export function renderApp(
    target: ((...a: any[]) => any) | { new(app: VApp, ...args: any[]): Component },
    targetId = 'app',
    ...args: any[]
): string {
    const renderer = new Renderer();
    const app = new VApp(targetId, renderer, undefined, false);
    setJSXApp(app);

    let ComponentClass: { new(app: VApp, ...a: any[]): Component };
    if (!target.prototype || !target.prototype.render) {
        const fn = target as () => VNode;
        ComponentClass = class extends Component {
            render() { return fn(); }
        };
    } else {
        ComponentClass = target as { new(app: VApp, ...a: any[]): Component };
    }

    const component = new ComponentClass(app, ...args);
    component.app = app;
    component.props = app.defaultProps;

    _setHookComponent(component);
    const vnode = component.render(app.defaultProps);
    _setHookComponent(null);

    app.rootNode.children.push(vnode);
    vnode.parent = app.rootNode;

    return renderToString(app.rootNode);
}

/**
 * Renders a complete HTML page. Convenience wrapper around renderApp
 * for SSR servers.
 *
 * Usage:
 *   const html = renderPage(App, {
 *       title: 'My App',
 *       scripts: ['/assets/client.js'],
 *       styles: ['/assets/style.css'],
 *   });
 *   res.send(html);
 *
 * On the client, just use createApp — it auto-detects SSR content
 * and hydrates instead of re-rendering.
 */
export interface PageOptions {
    title?: string;
    targetId?: string;
    scripts?: string[];
    styles?: string[];
    head?: string;
    lang?: string;
}

export function renderPage(
    target: ((...a: any[]) => any) | { new(app: VApp, ...args: any[]): Component },
    options: PageOptions = {},
    ...args: any[]
): string {
    const {
        title = '',
        targetId = 'app',
        scripts = [],
        styles = [],
        head = '',
        lang = 'en',
    } = options;

    const content = renderApp(target, targetId, ...args);

    const styleLinks = styles.map(s => `<link rel="stylesheet" href="${s}">`).join('\n    ');
    const scriptTags = scripts.map(s => `<script type="module" src="${s}"></script>`).join('\n    ');

    return `<!DOCTYPE html>
<html lang="${lang}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    ${styleLinks}
    ${head}
</head>
<body>
    ${content}
    ${scriptTags}
</body>
</html>`;
}

/**
 * Client-side hydration. Attaches a component to server-rendered DOM
 * without rebuilding it. Event listeners and reactivity activate immediately.
 *
 * Usage:
 *   // Server: const html = renderApp(App, 'app');
 *   // Client:
 *   const { app, component } = hydrateApp(App, '#app');
 *
 * The DOM under #app must match what renderApp produced.
 */
export function hydrateApp<T extends Component>(
    ComponentClass: { new(app: VApp, ...args: any[]): T },
    selector: string,
    ...args: any[]
): { app: VApp; component: T };
export function hydrateApp(
    renderFn: () => VNode,
    selector: string,
): { app: VApp; component: Component };
export function hydrateApp(
    target: ((...a: any[]) => any) | { new(app: VApp, ...args: any[]): Component },
    selector: string,
    ...args: any[]
): { app: VApp; component: Component } {
    const id = selector.startsWith('#') ? selector.slice(1) : selector;
    const renderer = new Renderer();
    const app = new VApp(id, renderer);

    let ComponentClass: { new(app: VApp, ...a: any[]): Component };
    if (!target.prototype || !target.prototype.render) {
        const fn = target as () => VNode;
        ComponentClass = class extends Component {
            render() { return fn(); }
        };
    } else {
        ComponentClass = target as { new(app: VApp, ...a: any[]): Component };
    }

    const component = new ComponentClass(app, ...args);
    component.app = app;
    component.props = app.defaultProps;

    _setHookComponent(component);
    const vnode = component.render(app.defaultProps);
    _setHookComponent(null);

    component.$mount = vnode;
    app.rootNode.children.push(vnode);
    vnode.parent = app.rootNode;

    // Hydrate: walk existing DOM and attach VNode references
    const rootEl = document.getElementById(id);
    if (!rootEl) {
        throw new Error(`hydrateApp: #${id} not found in DOM`);
    }
    if (rootEl.firstElementChild) {
        renderer.hydrate(vnode, rootEl.firstElementChild as HTMLElement);
    }

    // Register component for lifecycle/rerendering
    if (component.lifeCycle) {
        app.compProps.push(new ComponentHolder(component.lifeCycle(), component));
    } else {
        app.compProps.push(new ComponentHolder({}, component));
    }

    app.init();
    return { app, component };
}
