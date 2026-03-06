import {VNode} from './VNode';
import {AppEvent, ComponentFunctionHolder, VApp} from './VApp';
import {Props} from "./Props";
import {ComponentEventPipeline} from "./GlobalEvent";
import {warnUpdateAfterUnmount} from "./dev";

// --- Context ---

export interface Context<T> {
    defaultValue: T;
    id: symbol;
}

export function createContext<T>(defaultValue: T): Context<T> {
    return { defaultValue, id: Symbol('context') };
}

// --- Component ---

export abstract class Component {
    public app: VApp;
    public $mount: VNode;
    public props: Props;
    public subComponents: Map<string, Component> = new Map<string, Component>();
    public componentEvent: ComponentEventPipeline = new ComponentEventPipeline();
    public _parentComponent?: Component;
    public _unmounted = false;
    private _providers?: Map<symbol, any>;

    abstract render(props: Props): VNode;

    lifeCycle(): ComponentProps { return {}; }

    public mount<T extends Component>(ctor: { new(app: VApp): T }, app: VApp, node: VNode, key: string): T {
        if (this.subComponents.has(key)) {
            // @ts-ignore
            return this.subComponents.get(key);
        }

        const val = new ctor(app);
        this.subComponents.set(key, val);
        this.app.mountSubComponent(val, node, this.props, this);
        return val;
    }


    public mountArgs<T extends Component>(ctor: { new(app: VApp, ...args: any[]): T }, app: VApp, node: VNode, key: string, ...args:any[]): T {
        if (this.subComponents.has(key)) {
            // @ts-ignore
            return this.subComponents.get(key);
        }

        const val = new ctor(app, ...args);
        this.subComponents.set(key, val);
        this.app.mountSubComponent(val, node, this.props, this);
        return val;
    }


    shouldUpdate(): boolean {
        return true;
    }

    rerender = () => {
        if (!this.shouldUpdate()) {
            return;
        }
        this.lifeCycle().beforererender?.();
        this.forcedUpdate();
        this.subComponents.forEach(comp => comp.rerender());
        this.lifeCycle().afterrerender?.();
    }


    private forcedUpdate = () => {
        this.app.rerenderComponent(this, this.props);
    };

    // lifeCycle() has a default implementation above — override to hook into mount/unmount/rerender

    emit = (name: string, data?: any) => {
        this.componentEvent.callEventComponent(name, data)
    };

    public constructor(app: VApp) {
        this.app = app;
    }

    // --- Context: provide/inject ---

    public provide<T>(context: Context<T>, value: T) {
        if (!this._providers) this._providers = new Map();
        this._providers.set(context.id, value);
    }

    public inject<T>(context: Context<T>): T {
        let current: Component | undefined = this;
        while (current) {
            if (current._providers?.has(context.id)) {
                return current._providers.get(context.id);
            }
            current = current._parentComponent;
        }
        return context.defaultValue;
    }
}

export const reactiveWatchersKey = Symbol("reactiveWatchers");

// --- Hooks runtime ---
// Tracks the currently rendering Component so hooks (useState, useEffect) know
// where to store their state.

let _currentHookComponent: Component | null = null;
let _hookIndex = 0;
const _hookStates = new WeakMap<Component, any[]>();
const _hookEffects = new WeakMap<Component, Array<{ deps: any[] | undefined; cleanup?: () => void; fn: () => (() => void) | void }>>();

export function _setHookComponent(comp: Component | null) {
    _currentHookComponent = comp;
    _hookIndex = 0;
}

export function _getHookComponent(): Component | null {
    return _currentHookComponent;
}

function getHookState(comp: Component): any[] {
    let arr = _hookStates.get(comp);
    if (!arr) {
        arr = [];
        _hookStates.set(comp, arr);
    }
    return arr;
}

function getHookEffects(comp: Component) {
    let arr = _hookEffects.get(comp);
    if (!arr) {
        arr = [];
        _hookEffects.set(comp, arr);
    }
    return arr;
}

/**
 * React-style state hook for functional components (and class component render methods).
 *
 * Usage:
 *   function Counter() {
 *       const [count, setCount] = useState(0);
 *       return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
 *   }
 */
export function useState<T>(initial: T): [T, (v: T | ((prev: T) => T)) => void] {
    const comp = _currentHookComponent;
    if (!comp) {
        throw new Error('useState must be called during a component render');
    }

    const states = getHookState(comp);
    const idx = _hookIndex++;

    if (idx >= states.length) {
        states.push(initial);
    }

    const value = states[idx] as T;
    const setter = (v: T | ((prev: T) => T)) => {
        const current = states[idx] as T;
        const next = typeof v === 'function' ? (v as (prev: T) => T)(current) : v;
        if (next === current) return;
        states[idx] = next;
        if (comp.app) {
            comp.app.markComponentDirty(comp);
        }
    };

    return [value, setter];
}

/**
 * Side-effect hook. Runs after render when dependencies change.
 * Return a cleanup function to run before the next effect or on unmount.
 *
 * Usage:
 *   useEffect(() => {
 *       const id = setInterval(tick, 1000);
 *       return () => clearInterval(id);
 *   }, [delay]);
 *
 * Pass `[]` to run only once on mount. Omit deps to run after every render.
 */
export function useEffect(fn: () => (() => void) | void, deps?: any[]): void {
    const comp = _currentHookComponent;
    if (!comp) {
        throw new Error('useEffect must be called during a component render');
    }

    const effects = getHookEffects(comp);
    const idx = _hookIndex++;

    const prev = effects[idx];

    // Check if deps changed
    let changed = !prev || deps === undefined;
    if (!changed && deps && prev.deps) {
        for (let i = 0; i < deps.length; i++) {
            if (deps[i] !== prev.deps[i]) { changed = true; break; }
        }
    }

    if (changed) {
        effects[idx] = { deps: deps ? [...deps] : undefined, fn, cleanup: prev?.cleanup };
        // Schedule effect to run after DOM update
        const entry = effects[idx];
        queueMicrotask(() => {
            if (entry.cleanup) entry.cleanup();
            const cleanup = entry.fn();
            entry.cleanup = typeof cleanup === 'function' ? cleanup : undefined;
        });
    } else {
        effects[idx] = prev;
    }
}

/**
 * Ref hook — returns a ref object whose `.current` is set after mount.
 * `.el` is a convenience getter for the underlying DOM element.
 *
 * Usage:
 *   const input = useRef<HTMLInputElement>();
 *   <input ref={input} />
 *   // After mount: input.el.focus()
 */
export interface DOMRef<T extends HTMLElement = HTMLElement> {
    current: VNode | null;
    /** Shorthand for current.htmlElement, cast to T */
    readonly el: T | null;
}

export function useRef<T extends HTMLElement = HTMLElement>(): DOMRef<T> {
    const ref = { current: null as VNode | null };
    Object.defineProperty(ref, 'el', {
        get() { return ref.current?.htmlElement as T | null; },
        enumerable: true,
    });
    return ref as DOMRef<T>;
}

/**
 * Access a context value from a functional component.
 *
 * Usage:
 *   const theme = useContext(ThemeCtx);
 */
export function useContext<T>(context: Context<T>): T {
    const comp = _currentHookComponent;
    if (!comp) {
        throw new Error('useContext must be called during a component render');
    }
    return comp.inject(context);
}

/**
 * Memoize an expensive computation. Re-runs only when deps change.
 *
 * Usage:
 *   const sorted = useMemo(() => items.sort(compareFn), [items]);
 */
export function useMemo<T>(factory: () => T, deps: any[]): T {
    const comp = _currentHookComponent;
    if (!comp) {
        throw new Error('useMemo must be called during a component render');
    }

    const states = getHookState(comp);
    const idx = _hookIndex++;

    const prev = states[idx] as { value: T; deps: any[] } | undefined;
    if (prev) {
        let same = prev.deps.length === deps.length;
        if (same) {
            for (let i = 0; i < deps.length; i++) {
                if (deps[i] !== prev.deps[i]) { same = false; break; }
            }
        }
        if (same) return prev.value;
    }

    const value = factory();
    states[idx] = { value, deps: [...deps] };
    return value;
}

/**
 * Memoize a callback. Returns the same function reference when deps haven't changed.
 *
 * Usage:
 *   const handleClick = useCallback(() => doSomething(id), [id]);
 */
export function useCallback<T extends (...args: any[]) => any>(fn: T, deps: any[]): T {
    return useMemo(() => fn, deps);
}

/**
 * Watch a getter function and run a callback when its return value changes.
 * Returns a stop function to cancel the watcher.
 *
 * Usage:
 *   const stop = watch(
 *       () => this.items.length,
 *       (newVal, oldVal) => console.log(`changed from ${oldVal} to ${newVal}`)
 *   );
 *   // Later: stop();
 *
 * Works both inside and outside component renders.
 */
export function watch<T>(
    getter: () => T,
    callback: (newValue: T, oldValue: T) => void,
    options?: { immediate?: boolean }
): () => void {
    let oldValue = getter();
    let stopped = false;

    if (options?.immediate) {
        callback(oldValue, oldValue);
    }

    const comp = _currentHookComponent;

    const check = () => {
        if (stopped) return;
        const newValue = getter();
        if (newValue !== oldValue) {
            const prev = oldValue;
            oldValue = newValue;
            callback(newValue, prev);
        }
    };

    // If inside a component render, hook into the render cycle
    if (comp) {
        const effects = getHookEffects(comp);
        const idx = _hookIndex++;
        effects[idx] = {
            deps: undefined, // runs every render
            fn: () => { check(); return undefined; },
            cleanup: undefined,
        };
        // Schedule initial check
        queueMicrotask(check);
    } else {
        // Standalone: poll via microtask after each state change
        // The caller is responsible for triggering checks, or use watchEffect
        queueMicrotask(check);
    }

    return () => { stopped = true; };
}

/**
 * Runs a function immediately, and re-runs it whenever any reactive
 * dependency it reads changes. Returns a stop function.
 *
 * Usage:
 *   const stop = watchEffect(() => {
 *       document.title = `Count: ${count()}`;
 *   });
 *
 * Unlike watch(), you don't specify dependencies — they're tracked automatically.
 * Works as a hook inside render, or standalone.
 */
export function watchEffect(fn: () => (() => void) | void): () => void {
    const comp = _currentHookComponent;
    if (comp) {
        // Inside a component — behaves like useEffect with no deps (runs every render)
        useEffect(fn);
        // Return a no-op stop since the effect lifecycle is managed by the component
        return () => {};
    }

    // Standalone — run immediately
    let cleanup: (() => void) | void;
    let stopped = false;

    const run = () => {
        if (stopped) return;
        if (cleanup) cleanup();
        cleanup = fn();
    };

    run();

    return () => {
        stopped = true;
        if (cleanup) cleanup();
    };
}

/**
 * Returns a promise that resolves after the next DOM update flush.
 *
 * Usage:
 *   this.count++;
 *   await nextTick();
 *   // DOM is now updated
 *   console.log(document.querySelector('.count').textContent);
 */
export function nextTick(): Promise<void> {
    return new Promise(resolve => queueMicrotask(resolve));
}

/** Clean up all effects for a component (called on unmount). */
export function _cleanupHooks(comp: Component) {
    const effects = _hookEffects.get(comp);
    if (effects) {
        for (const e of effects) {
            if (e?.cleanup) e.cleanup();
        }
        _hookEffects.delete(comp);
    }
    _hookStates.delete(comp);
}

const hasBeenSetKey = Symbol("reactiveHasBeenSet");
const REACTIVE_PROXY = Symbol("reactiveProxy");

export type EqualsFn = (a: any, b: any) => boolean;

function wrapProxy(value: any, comp: Component): any {
    if (value === null || typeof value !== 'object') return value;
    if (value[REACTIVE_PROXY]) return value;

    return new Proxy(value, {
        get(target, prop, receiver) {
            if (prop === REACTIVE_PROXY) return true;
            const val = Reflect.get(target, prop, receiver);
            // Lazily wrap nested objects/arrays so deep mutations are tracked
            if (val !== null && typeof val === 'object' && typeof prop !== 'symbol') {
                return wrapProxy(val, comp);
            }
            return val;
        },
        set(target, prop, newValue, receiver) {
            const result = Reflect.set(target, prop, newValue, receiver);
            if (comp.$mount && comp.app) {
                comp.app.markComponentDirty(comp);
            }
            return result;
        },
        deleteProperty(target, prop) {
            const result = Reflect.deleteProperty(target, prop);
            if (comp.$mount && comp.app) {
                comp.app.markComponentDirty(comp);
            }
            return result;
        }
    });
}

export function reactive(equals?: EqualsFn) {
    const cachedValueKey = Symbol();

    return (target: any, key: PropertyKey) => {
        Object.defineProperty(target, key, {
            set: function (value) {
                const self = this as any;
                const comp = this as unknown as Component;
                const hadValue = self[hasBeenSetKey]?.[key] === true;

                // Skip if value hasn't changed (after first assignment)
                if (hadValue) {
                    const same = equals
                        ? equals(self[cachedValueKey], value)
                        : self[cachedValueKey] === value;
                    if (same) return;
                }

                // Mark as set
                if (!self[hasBeenSetKey]) self[hasBeenSetKey] = {};
                self[hasBeenSetKey][key] = true;

                // Wrap objects/arrays in a Proxy for mutation tracking
                self[cachedValueKey] = wrapProxy(value, comp);

                // Notify watchers (synchronous — input bindings depend on this)
                const watchers = self[reactiveWatchersKey]?.[key];
                if (watchers) {
                    watchers.forEach((f: (v: any) => void) => f(value));
                }

                // Defer rerender via batched flush — skip if not mounted
                if (comp._unmounted) {
                    warnUpdateAfterUnmount(comp.constructor.name);
                } else if (comp.$mount && comp.app) {
                    comp.app.markComponentDirty(comp);
                }
            },
            get: function () {
                return this[cachedValueKey];
            },

            configurable: true
        });
    };
}

// --- Computed decorator ---

export function computed(...deps: string[]) {
    return (target: any, key: string, descriptor: PropertyDescriptor) => {
        const originalGetter = descriptor.get!;
        const cacheSymbol = Symbol(`computed_cache_${key}`);
        const validSymbol = Symbol(`computed_valid_${key}`);
        const setupSymbol = Symbol(`computed_setup_${key}`);

        descriptor.get = function () {
            const self = this as any;

            // Setup dependency watchers once
            if (!self[setupSymbol]) {
                self[setupSymbol] = true;
                deps.forEach(dep => {
                    if (!self[reactiveWatchersKey]) self[reactiveWatchersKey] = {};
                    if (!self[reactiveWatchersKey][dep]) self[reactiveWatchersKey][dep] = [];
                    self[reactiveWatchersKey][dep].push(() => {
                        self[validSymbol] = false;
                    });
                });
            }

            if (!self[validSymbol]) {
                self[cacheSymbol] = originalGetter.call(this);
                self[validSymbol] = true;
            }
            return self[cacheSymbol];
        };

        return descriptor;
    };
}

// --- Lifecycle ---

export abstract class ComponentProps {
    mounted?(comp: Component): void;

    remount?(comp: Component): void;

    unmounted?(): void;

    beforererender?(): void;

    afterrerender?(): void;
}


export class ComponentHolder {
    mounted: ComponentFunctionHolder;
    remount: ComponentFunctionHolder;
    unmounted: AppEvent;
    component: Component;

    constructor(props: ComponentProps, component: Component) {
        this.mounted = [false, props.mounted];
        this.remount = [true, props.remount];
        this.unmounted = props.unmounted;
        this.component = component;
    }
}
