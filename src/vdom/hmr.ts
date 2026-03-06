import {Component} from './Component';

/**
 * HMR runtime for eisen. Tracks live component instances by constructor
 * so the Vite plugin can swap render methods on hot update.
 */

// constructor → Set of live instances
const registry = new Map<Function, Set<Component>>();

/**
 * Register a component instance for HMR tracking.
 * Called automatically from mountComponent.
 */
export function _hmrTrack(instance: Component): void {
    const ctor = instance.constructor;
    let set = registry.get(ctor);
    if (!set) {
        set = new Set();
        registry.set(ctor, set);
    }
    set.add(instance);
}

/**
 * Remove a component instance from HMR tracking.
 * Called on unmount.
 */
export function _hmrUntrack(instance: Component): void {
    const set = registry.get(instance.constructor);
    if (set) {
        set.delete(instance);
        if (set.size === 0) registry.delete(instance.constructor);
    }
}

/**
 * Hot-swap a class component. Finds all live instances whose constructor name
 * matches, copies the new render/lifecycle methods, and re-renders.
 *
 * Called by the Vite plugin's import.meta.hot.accept handler.
 */
export function _hmrAccept(moduleId: string, NewClass: any): void {
    const name = NewClass.name;
    if (!name) return;

    // Find the old constructor by name
    for (const [oldCtor, instances] of registry) {
        if (oldCtor.name !== name) continue;

        // Move instances to new constructor key
        registry.delete(oldCtor);
        registry.set(NewClass, instances);

        for (const instance of instances) {
            if (instance._unmounted) {
                instances.delete(instance);
                continue;
            }

            // Swap render from new prototype
            if (NewClass.prototype.render) {
                const boundRender = NewClass.prototype.render;
                instance.render = function(props: any) {
                    return boundRender.call(this, props);
                };
            }

            // Swap lifeCycle if overridden
            if (NewClass.prototype.lifeCycle && NewClass.prototype.lifeCycle !== Component.prototype.lifeCycle) {
                const boundLC = NewClass.prototype.lifeCycle;
                instance.lifeCycle = function() {
                    return boundLC.call(this);
                };
            }

            // Re-render (preserves @reactive state, hooks state, etc.)
            if (instance.app && !instance._unmounted) {
                instance.app.markComponentDirty(instance);
            }
        }
        break;
    }
}

/**
 * Hot-swap a functional component. Finds wrapper Component instances
 * and swaps the render function.
 */
const fnWrappers = new Map<string, Set<Component>>();

export function _hmrTrackFn(moduleId: string, instance: Component): void {
    let set = fnWrappers.get(moduleId);
    if (!set) {
        set = new Set();
        fnWrappers.set(moduleId, set);
    }
    set.add(instance);
}

export function _hmrAcceptFn(moduleId: string, newFn: Function): void {
    const instances = fnWrappers.get(moduleId);
    if (!instances) return;

    for (const instance of instances) {
        if (instance._unmounted) {
            instances.delete(instance);
            continue;
        }

        instance.render = function() { return (newFn as any)(); };

        if (instance.app) {
            instance.app.markComponentDirty(instance);
        }
    }
}
