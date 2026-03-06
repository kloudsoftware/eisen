# Hooks

Hooks let functional components hold state, run side effects, and access DOM elements. They follow the same rules as React hooks: call them at the top level, in the same order every render.

## `useState`

```tsx
import { useState } from '@kloudsoftware/eisen';

function Counter() {
    const [count, setCount] = useState(0);

    return (
        <div>
            <p>Count: {count}</p>
            <button onClick={() => setCount(count + 1)}>+1</button>
            <button onClick={() => setCount(c => c * 2)}>double</button>
        </div>
    );
}
```

**Setter** accepts a value or an updater function `(prev) => next`.

**Deduplication**: Setting the same value (by `===`) is a no-op.

**Multiple states**:
```tsx
function Form() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    // each call maps to its own slot
}
```

## `useEffect`

Runs after render. Returns an optional cleanup function.

```tsx
import { useEffect } from '@kloudsoftware/eisen';

function Clock() {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const id = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(id);  // cleanup
    }, []);  // [] = mount only

    return <span>{time.toLocaleTimeString()}</span>;
}
```

**Dependency array**:
```tsx
useEffect(fn, []);        // run once on mount
useEffect(fn, [a, b]);    // re-run when a or b changes
useEffect(fn);            // run after every render
```

**Cleanup** runs before re-running the effect and on component unmount.

## `useRef`

Returns a ref object with typed `.el` access to the DOM element:

```tsx
import { useRef } from '@kloudsoftware/eisen';

function AutoFocus() {
    const input = useRef<HTMLInputElement>();

    useEffect(() => {
        input.el?.focus();
    }, []);

    return <input ref={input} type="text" placeholder="auto-focused" />;
}
```

| Property | Type | Description |
|----------|------|-------------|
| `ref.current` | `VNode \| null` | The eisen VNode |
| `ref.el` | `T \| null` | Shorthand for `current.htmlElement`, typed |

## `useMemo`

Memoize an expensive computation. Re-runs only when deps change:

```tsx
import { useMemo } from '@kloudsoftware/eisen';

function FilteredList({ items, query }) {
    const filtered = useMemo(
        () => items.filter(i => i.name.includes(query)),
        [items, query]
    );
    return <ul>{...filtered.map(i => <li key={i.id}>{i.name}</li>)}</ul>;
}
```

## `useCallback`

Returns the same function reference when deps haven't changed:

```tsx
import { useCallback } from '@kloudsoftware/eisen';

function Parent() {
    const [count, setCount] = useState(0);
    const increment = useCallback(() => setCount(c => c + 1), []);
    return <button onClick={increment}>{count}</button>;
}
```

## `useContext`

Read a context value from a functional component:

```tsx
import { createContext, useContext } from '@kloudsoftware/eisen';

const ThemeCtx = createContext<'light' | 'dark'>('light');

function ThemedButton() {
    const theme = useContext(ThemeCtx);
    return <button className={theme}>Click</button>;
}
```

See [Advanced > Context](./advanced.md#context) for providing values.

## Rules

1. Call hooks at the top level of your function -- not inside conditionals, loops, or nested functions.
2. Hook call order must be identical across renders.
3. Hooks work inside functional components and inside `createApp(() => ...)` render functions.
