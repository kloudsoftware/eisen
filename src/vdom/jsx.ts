import {VApp} from './VApp';
import {Attribute, textVNode, VInputNode, VNode, VNodeType} from './VNode';
import {Props} from './Props';
import {Renderer} from './render';
import {EvtHandlerFunc, EvtType} from "./EventHandler";
import {Component, ComponentHolder, _setHookComponent, reactiveWatchersKey} from "./Component";
import {warnBindOnNonInput, warnFnComponentUndefined, warnUndefinedChild, isDevMode, warnDuplicateKeys, warnMixedKeys, warnUnkeyedList} from "./dev";

let currentApp: VApp | undefined;

// --- Content hash for fast diff skipping ---
// Simple FNV-1a-inspired hash. 0 means "not computed / dynamic".
function hashStr(h: number, s: string): number {
    for (let i = 0; i < s.length; i++) {
        h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
    }
    return h;
}

function computeContentHash(nodeName: string, attrs: Attribute[], innerHtml: string, children: VNode[], hasBind: boolean, hasEventHandlers: boolean): number {
    // Don't hash nodes with bindings or event handlers — they carry mutable state
    if (hasBind) return 0;

    let h = 0x811c9dc5; // FNV offset basis
    h = hashStr(h, nodeName);
    for (let i = 0; i < attrs.length; i++) {
        h = hashStr(h, attrs[i].attrName);
        h = hashStr(h, attrs[i].attrValue);
    }
    if (innerHtml) h = hashStr(h, innerHtml);
    for (let i = 0; i < children.length; i++) {
        // If any child has no hash (dynamic), the parent can't be hashed either
        if (children[i].contentHash === 0) return 0;
        h = Math.imul(h ^ children[i].contentHash, 0x01000193);
    }
    // Ensure non-zero (0 is our sentinel for "no hash")
    return h === 0 ? 1 : h;
}

export interface Ref<T = VNode> {
    current: T | null;
}

export function createRef<T = VNode>(): Ref<T> {
    return { current: null };
}

// --- Boolean attributes that should be set/removed, not stringified ---

const BOOLEAN_ATTRS = new Set([
    'disabled', 'checked', 'readonly', 'hidden', 'selected', 'required',
    'multiple', 'autofocus', 'autoplay', 'controls', 'loop', 'muted',
    'open', 'novalidate', 'formnovalidate', 'defer', 'async',
    'allowfullscreen', 'default', 'reversed', 'scoped', 'nomodule',
]);

// --- className helper ---

function resolveClassName(value: any): string {
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) {
        return value.filter(Boolean).map(resolveClassName).join(' ');
    }
    if (value && typeof value === 'object') {
        return Object.entries(value)
            .filter(([, v]) => v)
            .map(([k]) => k)
            .join(' ');
    }
    return '';
}

// --- Style object helper ---

function camelToKebab(str: string): string {
    return str.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
}

function resolveStyle(value: any): string {
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object') {
        return Object.entries(value)
            .filter(([, v]) => v != null && v !== false)
            .map(([k, v]) => `${camelToKebab(k)}:${v}`)
            .join(';');
    }
    return '';
}

// --- Functional component lifecycle ---

interface FnComponentContext {
    onMount: Array<() => (() => void) | void>;
    onCleanup: Array<() => void>;
}

let currentFnContext: FnComponentContext | null = null;

export function onMount(fn: () => (() => void) | void): void {
    if (currentFnContext) {
        currentFnContext.onMount.push(fn);
    }
}

export function onCleanup(fn: () => void): void {
    if (currentFnContext) {
        currentFnContext.onCleanup.push(fn);
    }
}

/**
 * JSX factory function converting TSX to eisen `k` calls.
 */
export type FunctionalComponent = (props: Record<string, any>, children: any[]) => VNode;

export const Fragment = Symbol('Fragment');

export function jsx(nodeName: VNodeType | FunctionalComponent | typeof Fragment, config?: any, ...children: any[]): VNode | null {
    if (!currentApp) {
        throw new Error('No VApp configured for JSX. Call setJSXApp first.');
    }

    // Fragment: since eisen maps VNodes 1:1 to DOM elements,
    // we use a div with display:contents to be layout-invisible
    if (nodeName === Fragment) {
        return jsx('div' as VNodeType, { style: 'display:contents' }, ...children);
    }

    // Functional component: call the function with props and children
    if (typeof nodeName === 'function') {
        const props = config ? { ...config } : {};
        props.children = children;

        // Set up lifecycle context for hooks
        const ctx: FnComponentContext = { onMount: [], onCleanup: [] };
        currentFnContext = ctx;
        const result = (nodeName as FunctionalComponent)(props, children);
        currentFnContext = null;

        if (result === undefined) {
            warnFnComponentUndefined((nodeName as Function).name || '<anonymous>');
        }

        // Attach lifecycle callbacks to the returned VNode
        if (result && (ctx.onMount.length > 0 || ctx.onCleanup.length > 0)) {
            result.addOnDomEventOrExecute(() => {
                const cleanups: Array<() => void> = [...ctx.onCleanup];
                ctx.onMount.forEach(fn => {
                    const cleanup = fn();
                    if (typeof cleanup === 'function') cleanups.push(cleanup);
                });
                // Store cleanups for later teardown
                if (cleanups.length > 0) {
                    (result as any)._fnCleanups = cleanups;
                }
            });
        }

        return result;
    }

    const attrs: Attribute[] = [];
    const eventHandlers: Array<[EvtType, EvtHandlerFunc]> = [];
    let props: Props = currentApp.defaultProps;
    let value = '';
    let refCallback: ((node: VNode) => void) | undefined = undefined;
    let keyOverride: string | undefined = undefined;
    let dangerousHtml: string | undefined = undefined;
    let bindDirective: { obj: any; key: string; prop: string } | undefined = undefined;

    if (config) {
        for (const k in config) {
            const v = config[k];

            // bind:value / bind:checked — two-way binding to reactive property
            // Usage: <input bind:value={[obj, 'propName']} />
            if (k.charCodeAt(0) === 98 /*b*/ && k.startsWith('bind:') && Array.isArray(v) && v.length === 2) {
                const boundProp = k.substring(5); // 'value', 'checked', etc.
                bindDirective = { obj: v[0], key: v[1], prop: boundProp };
                continue;
            }

            // Skip false/undefined/null for non-boolean attributes too
            if (v === false || v === undefined || v === null) {
                continue;
            }

            // Ref handling
            if (k === "ref") {
                if (typeof v === 'function') {
                    refCallback = v;
                } else if (v && typeof v === 'object' && 'current' in v) {
                    refCallback = (node: VNode) => { v.current = node; };
                }
                continue;
            }

            // Key handling
            if (k === 'key') {
                keyOverride = String(v);
                continue;
            }

            // className / class — supports strings, arrays, objects
            if (k === 'className' || k === 'class') {
                const classValue = resolveClassName(v);
                if (classValue) attrs.push(new Attribute('class', classValue));
                continue;
            }

            // Style — supports strings and objects
            if (k === 'style') {
                const styleValue = resolveStyle(v);
                if (styleValue) attrs.push(new Attribute('style', styleValue));
                continue;
            }

            // dangerouslySetInnerHTML
            if (k === 'dangerouslySetInnerHTML') {
                if (v && typeof v === 'object' && '__html' in v) {
                    dangerousHtml = v.__html;
                }
                continue;
            }

            // Boolean attributes
            if (BOOLEAN_ATTRS.has(k)) {
                if (v === true) attrs.push(new Attribute(k, ''));
                continue;
            }

            // Event handlers with optional modifiers
            // Supports: onClick, onClick_stop, onClick_prevent, onClick_once,
            //           onClick_stop_prevent, onSubmit_prevent, etc.
            if (k.charCodeAt(0) === 111 /*o*/ && k.charCodeAt(1) === 110 /*n*/ && typeof v === 'function') {
                const rest = k.substring(2);
                const parts = rest.split('_');
                let evt = parts[0].toLowerCase() as EvtType;
                // Remap non-bubbling events to their bubbling equivalents for delegation
                if (evt === 'blur' as any) evt = 'focusout' as EvtType;
                else if (evt === 'focus' as any) evt = 'focusin' as EvtType;
                const modifiers = new Set(parts.slice(1));

                let handler: EvtHandlerFunc = v;

                if (modifiers.size > 0) {
                    const origFn = v as EvtHandlerFunc;
                    let fired = false;
                    handler = (event: Event, node?: VNode, bubble?: boolean) => {
                        if (modifiers.has('once') && fired) return;
                        if (modifiers.has('self') && event.target !== node?.htmlElement) return;
                        if (modifiers.has('stop')) event.stopPropagation();
                        if (modifiers.has('prevent')) event.preventDefault();
                        fired = true;
                        return origFn(event, node, bubble);
                    };
                }

                eventHandlers.push([evt, handler]);
                continue;
            }

            // htmlFor → for
            if (k === 'htmlFor') {
                attrs.push(new Attribute('for', String(v)));
                continue;
            }

            // props instance
            if (k === 'props' && v instanceof Props) {
                props = v;
                continue;
            }

            // value
            if (k === 'value' && typeof v === 'string') {
                value = v;
                continue;
            }

            attrs.push(new Attribute(k, String(v)));
        }

    }

    // When dangerouslySetInnerHTML is used, ignore children
    const childNodes: VNode[] = [];
    if (dangerousHtml === undefined) {
        function pushChild(c: any) {
            if (c === undefined) {
                warnUndefinedChild(nodeName as string);
                return;
            }
            if (c === null || c === false) return;
            if (typeof c === 'string' || typeof c === 'number') {
                childNodes.push(textVNode(currentApp, String(c)));
            } else if (Array.isArray(c)) {
                c.forEach(pushChild);
            } else {
                childNodes.push(c);
            }
        }
        for (let i = 0; i < children.length; i++) pushChild(children[i]);
    }

    // Dev-mode key warnings
    if (isDevMode() && childNodes.length > 1) {
        const keyedCount = childNodes.filter(c => c.key !== undefined).length;
        warnMixedKeys(nodeName as string, childNodes.length, keyedCount);
        if (keyedCount === 0) {
            warnUnkeyedList(nodeName as string, childNodes.length);
        }
        if (keyedCount > 0) {
            const keys = childNodes.filter(c => c.key !== undefined).map(c => c.key);
            const seen = new Set<string>();
            const dupes: string[] = [];
            keys.forEach(k => {
                if (seen.has(k!)) dupes.push(k!);
                seen.add(k!);
            });
            warnDuplicateKeys(nodeName as string, dupes);
        }
    }

    // Direct VNode construction — bypass k() to avoid options object allocation
    let node: VNode;
    if (nodeName === 'input' || nodeName === 'textarea' || nodeName === 'select') {
        node = new VInputNode(currentApp, nodeName as VNodeType, childNodes, value, props, attrs, undefined, undefined, value);
    } else {
        node = new VNode(currentApp, nodeName as VNodeType, childNodes, value, props, attrs);
    }
    for (let i = 0; i < childNodes.length; i++) {
        childNodes[i].parent = node;
    }
    if (keyOverride !== undefined) {
        node.id = keyOverride;
        node.key = keyOverride;
    }
    if (dangerousHtml !== undefined) {
        node.dangerousHtml = dangerousHtml;
    }
    for (let i = 0; i < eventHandlers.length; i++) {
        node.addEventlistener(eventHandlers[i][0], eventHandlers[i][1]);
    }

    // Compute content hash for fast diff skipping
    node.contentHash = computeContentHash(
        nodeName as string, attrs, dangerousHtml || value || '',
        childNodes, !!bindDirective, eventHandlers.length > 0
    );

    // Two-way binding
    if (bindDirective) {
        const bindable = nodeName === 'input' || nodeName === 'textarea' || nodeName === 'select';
        if (!bindable) {
            warnBindOnNonInput(nodeName as string);
        }
        applyBind(node, bindDirective.obj, bindDirective.key, bindDirective.prop);
    }

    if (refCallback) {
        refCallback(node);
    }

    return node;
}

// --- Two-way binding ---

function applyBind(node: VNode, obj: any, key: string, prop: string) {
    const app = node.app;

    // Set initial value from model
    const currentVal = obj[key];
    if (prop === 'checked') {
        // For checkboxes: set the checked attribute
        if (currentVal) {
            node.$setAttribute('checked', '');
        }
    } else {
        // For value-based inputs (text, textarea, select)
        node.value = currentVal != null ? String(currentVal) : '';
    }

    // Model → DOM: watch the reactive property for changes
    if (!obj[reactiveWatchersKey]) obj[reactiveWatchersKey] = {};
    if (!obj[reactiveWatchersKey][key]) obj[reactiveWatchersKey][key] = [];
    obj[reactiveWatchersKey][key].push((newVal: any) => {
        if (prop === 'checked') {
            if (node.htmlElement) {
                (node.htmlElement as HTMLInputElement).checked = !!newVal;
            }
        } else {
            node.value = newVal != null ? String(newVal) : '';
            if (node.htmlElement) {
                (node.htmlElement as HTMLInputElement).value = node.value;
            }
        }
    });

    // DOM → Model: listen for user input
    if (prop === 'checked') {
        app.eventHandler.registerEventListener('change', (_ev, n) => {
            if (n.htmlElement) {
                obj[key] = (n.htmlElement as HTMLInputElement).checked;
            }
        }, node);
    } else {
        app.eventHandler.registerEventListener('input', (_ev, n) => {
            if (n.htmlElement) {
                const domVal = (n.htmlElement as HTMLInputElement).value;
                node.value = domVal;
                obj[key] = domVal;
            }
        }, node);
    }
}

// --- ErrorBoundary ---

/**
 * Catches errors thrown by its children and renders a fallback.
 *
 * Because JSX children are eagerly evaluated, pass a render function as
 * the child to catch errors during rendering:
 *
 *   <ErrorBoundary fallback={(err) => <p>Error: {err.message}</p>}>
 *     {() => <RiskyComponent />}
 *   </ErrorBoundary>
 *
 * Or with pre-rendered children (catches errors in their sub-renders):
 *
 *   <ErrorBoundary fallback={<p>Something went wrong</p>}>
 *     <SafeWrapper />
 *   </ErrorBoundary>
 */
export function ErrorBoundary(
    props: { fallback: VNode | ((error: Error) => VNode); children?: any[] },
    children: any[]
): VNode | null {
    try {
        // If the first child is a render function, call it to catch errors lazily
        if (children.length === 1 && typeof children[0] === 'function') {
            const result = children[0]();
            return result;
        }
        if (children.length === 1) return children[0];
        return jsx('div' as VNodeType, { style: 'display:contents' }, ...children);
    } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error('[eisen] ErrorBoundary caught:', err);
        if (typeof props.fallback === 'function') {
            return (props.fallback as (e: Error) => VNode)(err);
        }
        return props.fallback;
    }
}

// --- Suspense ---

/**
 * Displays a fallback while async children are loading.
 *
 * Works with `lazy()` components and async render functions:
 *
 *   const LazyPage = lazy(() => import('./Page'));
 *
 *   <Suspense fallback={<div>Loading...</div>}>
 *     <LazyPage />
 *   </Suspense>
 */
export function Suspense(
    props: { fallback: VNode; children?: any[] },
    children: any[]
): VNode | null {
    // Check if any child is a lazy placeholder (has class lazy-loading)
    for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (child && child.hasClass && child.hasClass('lazy-loading')) {
            return props.fallback;
        }
    }

    if (children.length === 1) return children[0];
    return jsx('div' as VNodeType, { style: 'display:contents' }, ...children);
}

// --- Show / For helpers ---

/**
 * Conditionally renders children. Returns children when `when` is truthy,
 * otherwise returns the `fallback` or nothing.
 *
 * Usage: <Show when={condition} fallback={<span>loading...</span>}>content</Show>
 */
export function Show(props: { when: any; fallback?: VNode; children?: any[] }, children: any[]): VNode | null {
    if (props.when) {
        // Render children
        if (children.length === 1) return children[0];
        return jsx('div' as VNodeType, { style: 'display:contents' }, ...children);
    }
    return props.fallback || null;
}

/**
 * Toggles visibility via CSS display (like Vue's v-show).
 * Unlike <Show>, the element stays in the DOM — just hidden.
 * Cheaper for frequent toggles since no DOM insertion/removal.
 *
 * Usage:
 *   <Toggle when={this.visible}>
 *       <div class="panel">Always in DOM, just hidden</div>
 *   </Toggle>
 */
export function Toggle(props: { when: any; children?: any[] }, children: any[]): VNode | null {
    const child = children.length === 1
        ? children[0]
        : jsx('div' as VNodeType, { style: 'display:contents' }, ...children);
    if (!child) return null;

    if (!props.when) {
        // Merge display:none into existing style
        const existing = child.$getAttrs().find((a: any) => a.attrName === 'style');
        if (existing) {
            if (!existing.attrValue.includes('display:none')) {
                existing.attrValue = existing.attrValue + ';display:none';
            }
        } else {
            child.$getAttrs().push(new Attribute('style', 'display:none'));
        }
    }
    return child;
}

/**
 * Caches component VNode trees when toggling between views.
 * Preserves DOM and component state instead of destroying/recreating.
 * Similar to Vue's <KeepAlive>.
 *
 * Usage:
 *   const cache = createKeepAlive();
 *
 *   // In render:
 *   cache.render(currentTab, () => {
 *       if (currentTab === 'home') return <Home />;
 *       if (currentTab === 'about') return <About />;
 *   });
 */
export interface KeepAliveCache {
    render(key: string, factory: () => VNode): VNode;
    clear(): void;
    drop(key: string): void;
}

export function createKeepAlive(): KeepAliveCache {
    const cache = new Map<string, VNode>();

    return {
        render(key: string, factory: () => VNode): VNode {
            const cached = cache.get(key);
            if (cached) return cached;
            const node = factory();
            cache.set(key, node);
            return node;
        },
        clear() {
            cache.clear();
        },
        drop(key: string) {
            cache.delete(key);
        },
    };
}

/**
 * Dynamic component — renders a different component based on a value.
 * Similar to Vue's <component :is="...">.
 *
 * Usage:
 *   <Dynamic is={currentView} props={{ title: 'Hello' }} />
 *
 * Where `is` can be a functional component or a string tag name.
 */
export function Dynamic(
    props: { is: VNodeType | FunctionalComponent; [key: string]: any },
    children: any[]
): VNode | null {
    const { is: tag, ...rest } = props;
    // Remove the 'children' prop that jsx() adds
    delete rest.children;
    return jsx(tag, rest, ...children);
}

/**
 * Named slots for layout components. Pass named content via props:
 *
 *   // Define a layout:
 *   function Card(props) {
 *       return (
 *           <div class="card">
 *               <div class="header"><Slot of={props} name="header" /></div>
 *               <div class="body"><Slot of={props} /></div>
 *               <div class="footer"><Slot of={props} name="footer" fallback={<span>default footer</span>} /></div>
 *           </div>
 *       );
 *   }
 *
 *   // Use it:
 *   <Card header={<h2>Title</h2>} footer={<button>OK</button>}>
 *       <p>Card body content</p>
 *   </Card>
 */
export function Slot(
    props: { of: Record<string, any>; name?: string; fallback?: VNode; children?: any[] },
    _children: any[]
): VNode | null {
    const name = props.name;
    if (!name || name === 'default') {
        // Default slot = children
        const children = props.of?.children;
        if (Array.isArray(children) && children.length > 0) {
            if (children.length === 1) return children[0];
            return jsx('div' as VNodeType, { style: 'display:contents' }, ...children);
        }
        return props.fallback || null;
    }
    // Named slot
    const content = props.of?.[name];
    if (content) return content;
    return props.fallback || null;
}

/**
 * Renders a list with automatic keying.
 *
 * Usage:
 *   <For each={items} keyFn={item => item.id}>
 *     {item => <li>{item.name}</li>}
 *   </For>
 */
export function For<T>(props: { each: T[]; key?: (item: T, index: number) => string; keyFn?: (item: T, index: number) => string; children?: any[] }, children: any[]): VNode | null {
    const renderFn = children[0];
    if (typeof renderFn !== 'function' || !Array.isArray(props.each)) {
        return null;
    }

    const keyFn = props.keyFn || props.key;
    const items = props.each.map((item, i) => {
        const node = renderFn(item, i) as VNode;
        if (node && keyFn) {
            const k = keyFn(item, i);
            node.id = k;
            node.key = k;
        }
        return node;
    }).filter(Boolean);

    if (items.length === 0) return null;

    return jsx('div' as VNodeType, { style: 'display:contents' }, ...items);
}

// --- Transition ---

const ENTERED_FLAG = Symbol('eisenEntered');

/**
 * Vue/Svelte-style CSS transitions. Applies enter/leave CSS classes
 * with automatic timing. CSS does the actual animation.
 *
 * Usage:
 *   <Transition name="fade" when={this.visible}>
 *       <div class="modal">content</div>
 *   </Transition>
 *
 * CSS classes applied:
 *   Enter: {name}-enter-from → {name}-enter-active + {name}-enter-to → cleanup
 *   Leave: {name}-leave-from → {name}-leave-active + {name}-leave-to → remove
 *
 * @param name CSS class prefix (default: 'v')
 * @param when Controls visibility
 * @param duration Fallback timeout in ms (default: 300) in case transitionend doesn't fire
 */
export function Transition(
    props: { when: any; name?: string; duration?: number; children?: any[] },
    children: any[]
): VNode | null {
    if (!props.when) {
        return null;
    }

    const name = props.name || 'v';
    const duration = props.duration || 300;
    const enterFrom = `${name}-enter-from`;
    const enterActive = `${name}-enter-active`;
    const enterTo = `${name}-enter-to`;
    const leaveFrom = `${name}-leave-from`;
    const leaveActive = `${name}-leave-active`;
    const leaveTo = `${name}-leave-to`;

    // Wrap in a real div so transition classes have a box to animate
    const wrapper = jsx('div' as VNodeType, { style: 'display:contents' }, ...children);
    if (!wrapper) return null;

    // Resolve the target element: prefer the first child (display:contents
    // wrappers don't generate a box, so transitionend never fires on them).
    const getTarget = (el: HTMLElement): HTMLElement =>
        (el.style.display === 'contents' && el.firstElementChild instanceof HTMLElement)
            ? el.firstElementChild
            : el;

    // Enter animation — guarded against re-trigger on re-render
    wrapper.addOnDomEventOrExecute((el: HTMLElement) => {
        if ((el as any)[ENTERED_FLAG]) return;
        (el as any)[ENTERED_FLAG] = true;
        const t = getTarget(el);

        t.classList.add(enterFrom, enterActive);
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                t.classList.remove(enterFrom);
                t.classList.add(enterTo);
                const onEnd = () => {
                    t.classList.remove(enterActive, enterTo);
                    t.removeEventListener('transitionend', onEnd);
                    t.removeEventListener('animationend', onEnd);
                };
                t.addEventListener('transitionend', onEnd, { once: true });
                t.addEventListener('animationend', onEnd, { once: true });
                setTimeout(onEnd, duration);
            });
        });
    });

    // Leave animation — delayed removal via beforeRemove hook
    wrapper.beforeRemove = (el: HTMLElement) => {
        return new Promise<void>(resolve => {
            const t = getTarget(el);
            t.classList.add(leaveFrom, leaveActive);
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    t.classList.remove(leaveFrom);
                    t.classList.add(leaveTo);
                    const onEnd = () => {
                        t.classList.remove(leaveActive, leaveTo);
                        t.removeEventListener('transitionend', onEnd);
                        t.removeEventListener('animationend', onEnd);
                        resolve();
                    };
                    t.addEventListener('transitionend', onEnd, { once: true });
                    t.addEventListener('animationend', onEnd, { once: true });
                    setTimeout(() => {
                        onEnd();
                    }, duration);
                });
            });
        });
    };

    return wrapper;
}

// --- Portal ---

export function createPortal(child: VNode, targetSelector: string): VNode {
    if (!currentApp) {
        throw new Error('No VApp configured. Call setJSXApp first.');
    }
    const placeholder = currentApp.k('div' as VNodeType, {
        attrs: [new Attribute('style', 'display:none')],
    }, []);
    placeholder.portalTarget = targetSelector;
    // Store the child to render into the portal target
    (placeholder as any)._portalChild = child;
    return placeholder;
}

// --- Lazy ---

export function lazy(loader: () => Promise<{ default: FunctionalComponent }>): FunctionalComponent {
    let cached: FunctionalComponent | null = null;
    let loading = false;
    let pending: Array<() => void> = [];

    return (props, children) => {
        if (cached) {
            return cached(props, children);
        }

        if (!loading) {
            loading = true;
            loader().then(mod => {
                cached = mod.default;
                pending.forEach(fn => fn());
                pending = [];
            });
        }

        // Return a placeholder while loading
        const placeholder = jsx('div' as VNodeType, { class: 'lazy-loading' }, 'Loading...');
        if (placeholder) {
            pending.push(() => {
                // Trigger re-render by marking app dirty
                if (currentApp) {
                    currentApp.notifyDirty();
                }
            });
        }
        return placeholder!;
    };
}

/**
 * Memoizes a VNode-producing function by a cache key.
 * Returns the exact same VNode reference when the key matches — the diff
 * engine detects `oldVNode === newVNode` and skips the subtree entirely
 * (zero allocation, zero DOM work).
 *
 * Include all data that affects the output in the cache key:
 *   const memo = createMemo();
 *   // In render():
 *   items.map(item => memo(
 *     `${item.id}|${item.label}|${item.id === selected}`,
 *     () => jsx('tr', { key: String(item.id) }, ...)
 *   ))
 *
 * Call memo.sweep() at the end of render() to evict entries for
 * removed items (prevents unbounded cache growth).
 */
export interface MemoCache {
    (key: string, factory: () => VNode): VNode;
    /** Remove cache entries that were not accessed since the last sweep. */
    sweep(): void;
}

export function createMemo(): MemoCache {
    const cache = new Map<string, VNode>();
    const accessed = new Set<string>();

    const memo = ((key: string, factory: () => VNode): VNode => {
        accessed.add(key);
        const cached = cache.get(key);
        if (cached) return cached;
        const node = factory();
        cache.set(key, node);
        return node;
    }) as MemoCache;

    memo.sweep = () => {
        if (accessed.size < cache.size) {
            for (const k of cache.keys()) {
                if (!accessed.has(k)) cache.delete(k);
            }
        }
        accessed.clear();
    };

    return memo;
}

/**
 * Sets the active {@link VApp} instance used by the JSX factory.
 * This must be called before evaluating code produced from TSX.
 */
export function setJSXApp(app: VApp) {
    currentApp = app;
    // Expose jsx globally so compiled TSX can resolve it at runtime
    if (typeof globalThis !== 'undefined') {
        (globalThis as any).jsx = jsx;
    }
}

/**
 * One-liner app bootstrap. Creates a VApp, mounts a root component, and
 * returns both the app and component instance.
 *
 * Usage:
 *   const { app, component } = createApp(MyApp, '#app');
 *   // or just:
 *   createApp(MyApp, '#app');
 *
 * The selector can be an element ID with or without '#'.
 */
export function createApp<T extends Component>(
    ComponentClass: { new(app: VApp, ...args: any[]): T },
    selector: string,
    ...args: any[]
): { app: VApp; component: T };
export function createApp(
    renderFn: () => VNode,
    selector: string,
): { app: VApp; component: Component };
export function createApp(
    target: ((...a: any[]) => any) | { new(app: VApp, ...args: any[]): Component },
    selector: string,
    ...args: any[]
): { app: VApp; component: Component } {
    const id = selector.startsWith('#') ? selector.slice(1) : selector;
    const renderer = new Renderer();
    const app = new VApp(id, renderer);

    // If target is a plain function (not a class), wrap it in an anonymous Component
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

    // Auto-hydrate: if the mount target already has children (SSR),
    // hydrate instead of rendering from scratch
    const rootEl = app.rootNode.htmlElement;
    if (rootEl && rootEl.firstElementChild) {
        // Hydration path — attach VNodes to existing DOM
        component.app = app;
        component.props = app.defaultProps;
        _setHookComponent(component);
        const vnode = component.render(app.defaultProps);
        _setHookComponent(null);
        component.$mount = vnode;
        app.rootNode.children.push(vnode);
        vnode.parent = app.rootNode;
        renderer.hydrate(vnode, rootEl.firstElementChild as HTMLElement);
        app.compProps.push(new ComponentHolder(component.lifeCycle ? component.lifeCycle() : {}, component));
        app.init();
    } else {
        // Fresh render path
        app.init();
        app.mountComponent(component, app.rootNode, app.defaultProps);
    }

    return { app, component };
}

// Expose the factory globally so compiled TSX can find it at runtime.
// Deferred to setJSXApp() to avoid side effects on import (enables tree-shaking).

declare global {
    namespace JSX {
        type Element = VNode;

        interface IntrinsicAttributes {
            key?: string | number;
            ref?: Ref | ((node: VNode) => void);
            props?: Props;
        }

        // --- Base attributes shared by all elements ---

        interface HTMLAttributes extends IntrinsicAttributes {
            class?: string | string[] | Record<string, boolean>;
            className?: string | string[] | Record<string, boolean>;
            style?: string | Record<string, string | number>;
            id?: string;
            title?: string;
            tabIndex?: number;
            role?: string;
            slot?: string;
            hidden?: boolean;
            [key: `data-${string}`]: string;
            [key: `aria-${string}`]: string;

            // Events
            onClick?: EvtHandlerFunc;
            onChange?: EvtHandlerFunc;
            onInput?: EvtHandlerFunc;
            onSubmit?: EvtHandlerFunc;
            onKeyDown?: EvtHandlerFunc;
            onKeyUp?: EvtHandlerFunc;
            onKeyPress?: EvtHandlerFunc;
            onFocus?: EvtHandlerFunc;
            onBlur?: EvtHandlerFunc;
            onMouseDown?: EvtHandlerFunc;
            onMouseUp?: EvtHandlerFunc;
            onMouseEnter?: EvtHandlerFunc;
            onMouseLeave?: EvtHandlerFunc;
            onScroll?: EvtHandlerFunc;
            onDragStart?: EvtHandlerFunc;
            onDragEnd?: EvtHandlerFunc;
            onDrop?: EvtHandlerFunc;

            dangerouslySetInnerHTML?: { __html: string };

            // Catch-all for custom/unknown attributes
            [key: string]: any;
        }

        // --- Per-element attribute interfaces ---

        interface InputAttributes extends HTMLAttributes {
            type?: 'text' | 'password' | 'email' | 'number' | 'tel' | 'url' | 'search'
                 | 'date' | 'time' | 'datetime-local' | 'month' | 'week' | 'color'
                 | 'checkbox' | 'radio' | 'range' | 'file' | 'hidden' | 'submit'
                 | 'reset' | 'button' | 'image' | (string & {});
            value?: string;
            checked?: boolean;
            placeholder?: string;
            name?: string;
            disabled?: boolean;
            readonly?: boolean;
            required?: boolean;
            autofocus?: boolean;
            autocomplete?: string;
            min?: string | number;
            max?: string | number;
            step?: string | number;
            pattern?: string;
            maxlength?: number;
            minlength?: number;
            multiple?: boolean;
            accept?: string;
            'bind:value'?: [any, string];
            'bind:checked'?: [any, string];
        }

        interface TextareaAttributes extends HTMLAttributes {
            value?: string;
            placeholder?: string;
            name?: string;
            disabled?: boolean;
            readonly?: boolean;
            required?: boolean;
            autofocus?: boolean;
            rows?: number;
            cols?: number;
            maxlength?: number;
            minlength?: number;
            wrap?: 'hard' | 'soft';
            'bind:value'?: [any, string];
        }

        interface SelectAttributes extends HTMLAttributes {
            value?: string;
            name?: string;
            disabled?: boolean;
            required?: boolean;
            multiple?: boolean;
            autofocus?: boolean;
            'bind:value'?: [any, string];
        }

        interface ButtonAttributes extends HTMLAttributes {
            type?: 'button' | 'submit' | 'reset';
            disabled?: boolean;
            name?: string;
            value?: string;
            autofocus?: boolean;
            formnovalidate?: boolean;
        }

        interface AnchorAttributes extends HTMLAttributes {
            href?: string;
            target?: '_blank' | '_self' | '_parent' | '_top' | (string & {});
            rel?: string;
            download?: string | boolean;
            hreflang?: string;
            type?: string;
        }

        interface ImgAttributes extends HTMLAttributes {
            src?: string;
            alt?: string;
            width?: string | number;
            height?: string | number;
            loading?: 'lazy' | 'eager';
            decoding?: 'async' | 'auto' | 'sync';
            crossorigin?: 'anonymous' | 'use-credentials';
            srcset?: string;
            sizes?: string;
        }

        interface FormAttributes extends HTMLAttributes {
            action?: string;
            method?: 'get' | 'post' | 'dialog' | (string & {});
            enctype?: string;
            target?: string;
            novalidate?: boolean;
            autocomplete?: 'on' | 'off';
            name?: string;
        }

        interface LabelAttributes extends HTMLAttributes {
            htmlFor?: string;
        }

        interface OptionAttributes extends HTMLAttributes {
            value?: string;
            selected?: boolean;
            disabled?: boolean;
            label?: string;
        }

        interface OptgroupAttributes extends HTMLAttributes {
            label?: string;
            disabled?: boolean;
        }

        interface IframeAttributes extends HTMLAttributes {
            src?: string;
            srcdoc?: string;
            name?: string;
            width?: string | number;
            height?: string | number;
            sandbox?: string;
            allow?: string;
            allowfullscreen?: boolean;
            loading?: 'lazy' | 'eager';
            referrerpolicy?: string;
        }

        interface VideoAttributes extends HTMLAttributes {
            src?: string;
            width?: string | number;
            height?: string | number;
            autoplay?: boolean;
            controls?: boolean;
            loop?: boolean;
            muted?: boolean;
            poster?: string;
            preload?: 'auto' | 'metadata' | 'none';
            crossorigin?: 'anonymous' | 'use-credentials';
        }

        interface AudioAttributes extends HTMLAttributes {
            src?: string;
            autoplay?: boolean;
            controls?: boolean;
            loop?: boolean;
            muted?: boolean;
            preload?: 'auto' | 'metadata' | 'none';
            crossorigin?: 'anonymous' | 'use-credentials';
        }

        interface SourceAttributes extends HTMLAttributes {
            src?: string;
            srcset?: string;
            sizes?: string;
            type?: string;
            media?: string;
        }

        interface CanvasAttributes extends HTMLAttributes {
            width?: string | number;
            height?: string | number;
        }

        interface TableCellAttributes extends HTMLAttributes {
            colspan?: number;
            rowspan?: number;
            headers?: string;
        }

        interface ThAttributes extends TableCellAttributes {
            scope?: 'col' | 'row' | 'colgroup' | 'rowgroup';
            abbr?: string;
        }

        interface MetaAttributes extends HTMLAttributes {
            name?: string;
            content?: string;
            charset?: string;
            'http-equiv'?: string;
        }

        interface LinkAttributes extends HTMLAttributes {
            href?: string;
            rel?: string;
            type?: string;
            media?: string;
            crossorigin?: 'anonymous' | 'use-credentials';
            integrity?: string;
            as?: string;
        }

        interface ScriptAttributes extends HTMLAttributes {
            src?: string;
            type?: string;
            async?: boolean;
            defer?: boolean;
            crossorigin?: 'anonymous' | 'use-credentials';
            integrity?: string;
            nomodule?: boolean;
        }

        interface DialogAttributes extends HTMLAttributes {
            open?: boolean;
        }

        interface DetailsAttributes extends HTMLAttributes {
            open?: boolean;
        }

        interface OlAttributes extends HTMLAttributes {
            reversed?: boolean;
            start?: number;
            type?: '1' | 'a' | 'A' | 'i' | 'I';
        }

        interface ColAttributes extends HTMLAttributes {
            span?: number;
        }

        interface MeterAttributes extends HTMLAttributes {
            value?: number;
            min?: number;
            max?: number;
            low?: number;
            high?: number;
            optimum?: number;
        }

        interface ProgressAttributes extends HTMLAttributes {
            value?: number;
            max?: number;
        }

        interface TimeAttributes extends HTMLAttributes {
            datetime?: string;
        }

        interface SvgAttributes extends HTMLAttributes {
            viewBox?: string;
            xmlns?: string;
            fill?: string;
            stroke?: string;
            'stroke-width'?: string | number;
            width?: string | number;
            height?: string | number;
            d?: string;
            cx?: string | number;
            cy?: string | number;
            r?: string | number;
            x?: string | number;
            y?: string | number;
            x1?: string | number;
            y1?: string | number;
            x2?: string | number;
            y2?: string | number;
            rx?: string | number;
            ry?: string | number;
            points?: string;
            transform?: string;
            opacity?: string | number;
            'fill-opacity'?: string | number;
            'stroke-opacity'?: string | number;
            'stroke-linecap'?: 'butt' | 'round' | 'square';
            'stroke-linejoin'?: 'miter' | 'round' | 'bevel';
            'stroke-dasharray'?: string;
            'clip-path'?: string;
        }

        interface IntrinsicElements {
            // Elements with specific attribute types
            a: AnchorAttributes;
            audio: AudioAttributes;
            button: ButtonAttributes;
            canvas: CanvasAttributes;
            col: ColAttributes;
            colgroup: ColAttributes;
            details: DetailsAttributes;
            dialog: DialogAttributes;
            form: FormAttributes;
            iframe: IframeAttributes;
            img: ImgAttributes;
            input: InputAttributes;
            label: LabelAttributes;
            link: LinkAttributes;
            meta: MetaAttributes;
            meter: MeterAttributes;
            ol: OlAttributes;
            optgroup: OptgroupAttributes;
            option: OptionAttributes;
            progress: ProgressAttributes;
            script: ScriptAttributes;
            select: SelectAttributes;
            source: SourceAttributes;
            svg: SvgAttributes;
            circle: SvgAttributes;
            path: SvgAttributes;
            rect: SvgAttributes;
            line: SvgAttributes;
            polyline: SvgAttributes;
            polygon: SvgAttributes;
            ellipse: SvgAttributes;
            g: SvgAttributes;
            text: SvgAttributes;
            defs: SvgAttributes;
            use: SvgAttributes;
            td: TableCellAttributes;
            th: ThAttributes;
            textarea: TextareaAttributes;
            time: TimeAttributes;
            video: VideoAttributes;

            // All other elements use base HTMLAttributes
            abbr: HTMLAttributes;
            address: HTMLAttributes;
            article: HTMLAttributes;
            aside: HTMLAttributes;
            b: HTMLAttributes;
            blockquote: HTMLAttributes;
            body: HTMLAttributes;
            br: HTMLAttributes;
            caption: HTMLAttributes;
            cite: HTMLAttributes;
            code: HTMLAttributes;
            data: HTMLAttributes;
            dd: HTMLAttributes;
            del: HTMLAttributes;
            dfn: HTMLAttributes;
            div: HTMLAttributes;
            dl: HTMLAttributes;
            dt: HTMLAttributes;
            em: HTMLAttributes;
            embed: HTMLAttributes;
            fieldset: HTMLAttributes;
            figcaption: HTMLAttributes;
            figure: HTMLAttributes;
            footer: HTMLAttributes;
            h1: HTMLAttributes;
            h2: HTMLAttributes;
            h3: HTMLAttributes;
            h4: HTMLAttributes;
            h5: HTMLAttributes;
            h6: HTMLAttributes;
            head: HTMLAttributes;
            header: HTMLAttributes;
            hr: HTMLAttributes;
            html: HTMLAttributes;
            i: HTMLAttributes;
            ins: HTMLAttributes;
            kbd: HTMLAttributes;
            legend: HTMLAttributes;
            li: HTMLAttributes;
            main: HTMLAttributes;
            map: HTMLAttributes;
            mark: HTMLAttributes;
            nav: HTMLAttributes;
            object: HTMLAttributes;
            output: HTMLAttributes;
            p: HTMLAttributes;
            picture: HTMLAttributes;
            pre: HTMLAttributes;
            q: HTMLAttributes;
            rp: HTMLAttributes;
            rt: HTMLAttributes;
            ruby: HTMLAttributes;
            s: HTMLAttributes;
            samp: HTMLAttributes;
            section: HTMLAttributes;
            small: HTMLAttributes;
            span: HTMLAttributes;
            strong: HTMLAttributes;
            style: HTMLAttributes;
            sub: HTMLAttributes;
            summary: HTMLAttributes;
            sup: HTMLAttributes;
            table: HTMLAttributes;
            tbody: HTMLAttributes;
            template: HTMLAttributes;
            tfoot: HTMLAttributes;
            thead: HTMLAttributes;
            title: HTMLAttributes;
            tr: HTMLAttributes;
            track: HTMLAttributes;
            u: HTMLAttributes;
            ul: HTMLAttributes;
            var: HTMLAttributes;
            wbr: HTMLAttributes;
            [elemName: string]: HTMLAttributes;
        }
    }
}
