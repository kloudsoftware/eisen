/**
 * Dev-mode warnings. Enable with `enableDevWarnings()`, disable with
 * `disableDevWarnings()`. All warnings are no-ops when disabled (zero cost).
 */

let enabled = false;
const seenWarnings = new Set<string>();

export function enableDevWarnings() {
    enabled = true;
}

export function disableDevWarnings() {
    enabled = false;
    seenWarnings.clear();
}

export function isDevMode(): boolean {
    return enabled;
}

function warn(key: string, msg: string) {
    if (!enabled) return;
    // Deduplicate — don't spam the same warning
    if (key && seenWarnings.has(key)) return;
    if (key) seenWarnings.add(key);
    console.warn(`[eisen] ${msg}`);
}

// --- Warning functions called from framework internals ---

/** Warn when a list of children has some keyed and some unkeyed nodes */
export function warnMixedKeys(parentNodeName: string, childCount: number, keyedCount: number) {
    if (!enabled || keyedCount === 0 || keyedCount === childCount) return;
    warn(
        `mixed-keys:${parentNodeName}`,
        `<${parentNodeName}> has ${childCount} children but only ${keyedCount} have keys. ` +
        `Either key all children or none — mixing causes unpredictable reordering.`
    );
}

/** Warn when duplicate keys are found among siblings */
export function warnDuplicateKeys(parentNodeName: string, duplicates: string[]) {
    if (!enabled || duplicates.length === 0) return;
    warn(
        `dup-keys:${parentNodeName}:${duplicates.join(',')}`,
        `<${parentNodeName}> has duplicate keys: [${duplicates.join(', ')}]. ` +
        `Keys must be unique among siblings.`
    );
}

/** Warn when a list with >1 unkeyed children is detected */
export function warnUnkeyedList(parentNodeName: string, childCount: number) {
    if (!enabled || childCount <= 1) return;
    warn(
        `unkeyed-list:${parentNodeName}:${childCount}`,
        `<${parentNodeName}> has ${childCount} children without keys. ` +
        `Add a "key" prop to list items for stable identity across renders.`
    );
}

/** Warn when render() returns undefined */
export function warnRenderUndefined(componentName: string) {
    if (!enabled) return;
    warn(
        `render-undefined:${componentName}`,
        `${componentName}.render() returned undefined. Did you forget a return statement?`
    );
}

/** Warn when render() returns null (for class components, which should always return a VNode) */
export function warnRenderNull(componentName: string) {
    if (!enabled) return;
    warn(
        `render-null:${componentName}`,
        `${componentName}.render() returned null. Class components must return a VNode. ` +
        `Use <Show> for conditional rendering.`
    );
}

/** Warn when a functional component returns undefined */
export function warnFnComponentUndefined(fnName: string) {
    if (!enabled) return;
    warn(
        `fn-undefined:${fnName}`,
        `Functional component ${fnName || '<anonymous>'}() returned undefined. ` +
        `Did you forget a return statement?`
    );
}

/** Warn when setState/reactive is used on an unmounted component */
export function warnUpdateAfterUnmount(componentName: string) {
    if (!enabled) return;
    warn(
        `update-unmounted:${componentName}`,
        `State update on unmounted component ${componentName}. ` +
        `This is a no-op but indicates a memory leak (timer, subscription, etc.).`
    );
}

/** Warn when bind:value is used on a non-input element */
export function warnBindOnNonInput(nodeName: string) {
    if (!enabled) return;
    warn(
        `bind-non-input:${nodeName}`,
        `bind:value used on <${nodeName}>. Two-way binding only works on input, textarea, and select.`
    );
}

/** Warn when a VNode child is undefined (likely a missing return in map) */
export function warnUndefinedChild(parentNodeName: string) {
    if (!enabled) return;
    warn(
        `undefined-child:${parentNodeName}`,
        `<${parentNodeName}> received an undefined child. ` +
        `Check that all items in your list/map return a value.`
    );
}
