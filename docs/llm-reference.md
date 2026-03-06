# Eisen Framework — LLM Reference

> Drop this file into your LLM context to enable it to write eisen applications.

## Overview

Eisen is a zero-dependency TypeScript VDOM framework. It uses JSX, supports both React-style hooks and Vue-style reactive decorators, and weighs ~15KB gzipped.

**Install**: `npm install @kloudsoftware/eisen`

## TSX Config

```json
// tsconfig.json
{
    "compilerOptions": {
        "jsx": "react",
        "jsxFactory": "jsx",
        "jsxFragmentFactory": "Fragment",
        "experimentalDecorators": true
    }
}
```

Or use the Vite plugin (auto-configures everything):
```ts
// vite.config.ts
import { eisenPlugin } from '@kloudsoftware/eisen/vite-plugin';
export default { plugins: [eisenPlugin()] };
```

## Bootstrap

```tsx
import { createApp } from '@kloudsoftware/eisen';
createApp(App, '#app');  // '#' is optional
```

Returns `{ app, component }`.

## Two Paradigms

### 1. Functional Components + Hooks (React-style)

```tsx
import { useState, useEffect, useRef, useMemo, useCallback, useContext } from '@kloudsoftware/eisen';

function Counter() {
    const [count, setCount] = useState(0);
    return <button onClick={() => setCount(c => c + 1)}>Count: {count}</button>;
}
```

**Hooks** (same rules as React — top-level, same order every render):
- `useState<T>(initial): [T, setter]` — setter accepts value or `prev => next`
- `useEffect(fn, deps?)` — runs after render, optional cleanup return
- `useRef<T>()` — returns `{ current: VNode, el: T }` (el is the DOM element)
- `useMemo(factory, deps)` — memoize expensive computations
- `useCallback(fn, deps)` — stable function reference
- `useContext(ctx)` — read context value

### 2. Class Components + Decorators (Vue-style)

```tsx
import { Component, reactive, computed } from '@kloudsoftware/eisen';

class TodoApp extends Component {
    @reactive() items: string[] = [];
    @reactive() input = '';

    @computed('items')
    get count() { return this.items.length; }

    render() {
        return (
            <div>
                <input value={this.input}
                       onInput={e => this.input = (e.target as HTMLInputElement).value} />
                <button onClick={() => { this.items = [...this.items, this.input]; this.input = ''; }}>
                    Add ({this.count})
                </button>
                <ul>{...this.items.map(i => <li>{i}</li>)}</ul>
            </div>
        );
    }
}
```

- `@reactive()` — marks property as reactive, triggers re-render on change. Deep proxy tracking for objects/arrays.
- `@reactive(equalsFn)` — custom equality check
- `@computed(...deps)` — cached getter, deps are names of `@reactive` properties
- `lifeCycle()` — return `{ mounted, unmounted, beforererender, afterrerender }`
- `shouldUpdate()` — return false to skip re-render

## JSX Details

**Elements**: Standard HTML. Use `className` (or `class`), `onClick`, `onInput`, etc.

**Children**: Pass as additional arguments or use spread `{...array}` for arrays.

**className**: Accepts string, array (falsy filtered), or object `{ active: bool }`.

**style**: Accepts string or object `{ fontSize: '16px', color: 'red' }`.

**Boolean attrs**: `disabled`, `checked`, `readonly`, `hidden`, etc. — false omits the attribute.

**Refs**: `<input ref={myRef} />` — works with useRef() or createRef().

**SVG**: Auto-detects namespace.

**dangerouslySetInnerHTML**: `<div dangerouslySetInnerHTML={{ __html: html }} />`

## Event Modifiers

Append modifiers to event handler names with `_`:

```tsx
<button onClick_prevent={() => submit()}>Submit</button>
<div onClick_stop_once={() => handle()}>Click</div>
```

Modifiers: `prevent` (preventDefault), `stop` (stopPropagation), `once` (fire once), `self` (only if target matches element).

## Two-Way Binding

```tsx
<input bind:value={[this, 'propertyName']} />
<input type="checkbox" bind:checked={[this, 'boolProp']} />
<select bind:value={[this, 'selected']}>...</select>
<textarea bind:value={[this, 'text']} />
```

Only works with `@reactive()` properties in class components.

## Built-in Components

### Show / For / Fragment / Transition

```tsx
import { Show, For, Fragment, Transition } from '@kloudsoftware/eisen';

<Show when={condition} fallback={<p>Empty</p>}>
    <Content />
</Show>

<For each={items} keyFn={i => String(i.id)}>
    {(item, index) => <li key={String(item.id)}>{item.name}</li>}
</For>

<Transition name="fade" when={visible}>
    <div>animated</div>
</Transition>
```

### Toggle (v-show equivalent)

```tsx
import { Toggle } from '@kloudsoftware/eisen';

<Toggle when={visible}>
    <div>Hidden with display:none, not removed from DOM</div>
</Toggle>
```

### Dynamic

```tsx
import { Dynamic } from '@kloudsoftware/eisen';

<Dynamic is="h1" className="title">Heading</Dynamic>
<Dynamic is={MyComponent} someProp="value" />
```

### Slot

```tsx
import { Slot } from '@kloudsoftware/eisen';

function Card(props) {
    return (
        <div className="card">
            <header><Slot of={props} name="header" fallback={<span>Default</span>} /></header>
            <main><Slot of={props} /></main>
        </div>
    );
}

// Usage:
<Card header={<h2>Title</h2>}>
    <p>Body content (default slot)</p>
</Card>
```

### ErrorBoundary / Suspense

```tsx
import { ErrorBoundary, Suspense, lazy } from '@kloudsoftware/eisen';

<ErrorBoundary fallback={err => <p>Error: {err.message}</p>}>
    {() => <RiskyComponent />}
</ErrorBoundary>

const LazyPage = lazy(() => import('./Page'));
<Suspense fallback={<div>Loading...</div>}>
    <LazyPage />
</Suspense>
```

## Context

```tsx
import { createContext, useContext } from '@kloudsoftware/eisen';

const ThemeCtx = createContext<'light' | 'dark'>('light');

// Provide (class component):
class App extends Component {
    constructor(app) { super(app); this.provide(ThemeCtx, 'dark'); }
}

// Consume (functional):
function Button() {
    const theme = useContext(ThemeCtx);
    return <button className={theme}>Click</button>;
}

// Consume (class):
class Panel extends Component {
    render() { return <div className={this.inject(ThemeCtx)}>...</div>; }
}
```

## Global Store

```tsx
import { createStore } from '@kloudsoftware/eisen';

const useAuth = createStore((set, get) => ({
    user: null,
    login: (user) => set({ user }),
    logout: () => set({ user: null }),
    isLoggedIn: () => get().user !== null,
}));

// In components — auto-subscribes:
function Navbar() {
    const { user, logout } = useAuth();
    return user ? <button onClick={logout}>{user.name}</button> : <a href="/login">Login</a>;
}

// Outside components:
useAuth.getState().login({ name: 'Alice' });
useAuth.subscribe(() => console.log(useAuth.getState()));
```

## Router

```tsx
import { createApp, registerRoutes, Route } from '@kloudsoftware/eisen';

class App extends Component {
    render() {
        const mount = <div />;
        const router = this.app.useRouter(mount);
        registerRoutes(router, this.app, [
            Route('/', HomePage),
            Route('/about', AboutPage),
            Route('/user/:id', UserPage),
        ]);
        router.resolveRoute(location.pathname);
        return <div>{mount}</div>;
    }
}
```

Navigate: `router.resolve('/about')` or `<a href="/about">About</a>` (intercepted automatically).

## Watchers

```tsx
import { watch, watchEffect, nextTick } from '@kloudsoftware/eisen';

// Watch a getter:
const stop = watch(
    () => someValue,
    (newVal, oldVal) => console.log(newVal),
    { immediate: false }
);
stop(); // cleanup

// Run immediately, auto-track:
const stop2 = watchEffect(() => {
    document.title = `Count: ${count}`;
    return () => { /* cleanup */ };
});

// Wait for DOM update:
await nextTick();
```

## Memoization

```tsx
import { createMemo } from '@kloudsoftware/eisen';

class BigList extends Component {
    _memo = createMemo();

    render() {
        const rows = this.items.map(item =>
            this._memo(`${item.id}|${item.label}`, () => <li key={String(item.id)}>{item.label}</li>)
        );
        this._memo.sweep();
        return <ul>{...rows}</ul>;
    }
}
```

## KeepAlive

```tsx
import { createKeepAlive } from '@kloudsoftware/eisen';

const cache = createKeepAlive();

function TabView({ active }) {
    return cache.render(active, () => {
        if (active === 'home') return <HomePage />;
        if (active === 'settings') return <SettingsPage />;
    });
}

// cache.drop('home')  — remove one entry
// cache.clear()       — remove all
```

## SSR

**Server** (no DOM needed):
```tsx
import { renderPage } from '@kloudsoftware/eisen';
const html = renderPage(App, { title: 'My App', scripts: ['/client.js'] });
```

**Client** (auto-hydrates if server HTML exists):
```tsx
import { createApp } from '@kloudsoftware/eisen';
createApp(App, '#app');
```

## Common Patterns

**Conditional class**:
```tsx
<div className={['card', isActive && 'active', isError && 'error']} />
```

**List rendering**:
```tsx
<ul>{...items.map(i => <li key={String(i.id)}>{i.name}</li>)}</ul>
```

**Spread children**: Always use `{...array}` not `{array}` for arrays.

**Event handlers**: `onClick`, `onInput`, `onChange`, `onSubmit`, `onKeyDown`, etc.

**Prevent default on form**:
```tsx
<form onSubmit_prevent={() => handleSubmit()}>
```

**Portal**:
```tsx
import { createPortal } from '@kloudsoftware/eisen';
createPortal(<Modal />, 'modal-root');
```

## Key Differences from React

1. `jsx` factory (not `React.createElement`) — configured in tsconfig or Vite plugin
2. Array children must use spread: `{...items.map(...)}` not `{items.map(...)}`
3. `useRef().el` gives typed DOM element directly (no `.current` for DOM)
4. Has `@reactive` / `@computed` decorators for class components
5. Has `bind:value` for two-way binding
6. Event modifiers: `onClick_prevent_stop`
7. `createApp(Component, '#app')` not `ReactDOM.createRoot(...).render(...)`

## Key Differences from Vue

1. JSX not SFC templates
2. No `ref()` / `reactive()` composition API — uses React hooks or `@reactive` decorator
3. `Show` not `v-if`, `Toggle` not `v-show`, `For` not `v-for`
4. Slots via `<Slot of={props} name="x">` not `<slot name="x">`
5. No `defineEmits` / `defineProps` — just function parameters or class properties
