import {Component, _getHookComponent, _setHookComponent} from './Component';

type Listener = () => void;
type SetState<T> = (partial: Partial<T> | ((state: T) => Partial<T>)) => void;
type GetState<T> = () => T;

export interface Store<T> {
    getState: GetState<T>;
    setState: SetState<T>;
    subscribe: (listener: Listener) => () => void;
}

/**
 * Creates a Zustand-style global store.
 *
 * Usage:
 *   const useCounter = createStore((set) => ({
 *       count: 0,
 *       increment: () => set(s => ({ count: s.count + 1 })),
 *   }));
 *
 *   // In a component render():
 *   const { count, increment } = useCounter();
 *
 * When any component calls the store hook during render, it subscribes
 * to updates. When `setState` is called, all subscribed components re-render.
 */
export function createStore<T extends object>(
    initializer: (set: SetState<T>, get: GetState<T>) => T
): (() => T) & Store<T> {
    const listeners = new Set<Listener>();
    let state: T;

    const getState: GetState<T> = () => state;

    const setState: SetState<T> = (partial) => {
        const next = typeof partial === 'function'
            ? (partial as (s: T) => Partial<T>)(state)
            : partial;
        const prev = state;
        state = Object.assign({}, state, next);
        if (state !== prev) {
            listeners.forEach(l => l());
        }
    };

    const subscribe = (listener: Listener): (() => void) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
    };

    state = initializer(setState, getState);

    // Component subscriptions tracked per component instance
    const subscribedComponents = new WeakSet<Component>();

    const useStore = (): T => {
        const comp = _getHookComponent();
        if (comp && !subscribedComponents.has(comp)) {
            subscribedComponents.add(comp);
            const unsub = subscribe(() => {
                if (comp._unmounted) {
                    unsub();
                    subscribedComponents.delete(comp);
                    return;
                }
                if (comp.app) {
                    comp.app.markComponentDirty(comp);
                }
            });
        }
        return state;
    };

    useStore.getState = getState;
    useStore.setState = setState;
    useStore.subscribe = subscribe;

    return useStore as (() => T) & Store<T>;
}
