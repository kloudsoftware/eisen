# Advanced

## Memoization

`createMemo()` caches VNode subtrees by key. When the key matches, it returns the exact same VNode reference. The diff engine detects `old === new` and skips the subtree entirely -- zero allocation, zero DOM work.

```tsx
import { createMemo, Component, reactive } from '@kloudsoftware/eisen';

class Table extends Component {
    _memo = createMemo();
    @reactive() data = [];
    @reactive() selected = null;

    render() {
        const rows = this.data.map(d => {
            const sel = d.id === this.selected;
            return this._memo(`${d.id}|${d.label}|${sel}`, () => (
                <tr key={String(d.id)} className={sel ? 'active' : ''}>
                    <td>{d.id}</td>
                    <td>{d.label}</td>
                </tr>
            ));
        });
        this._memo.sweep();  // evict removed items
        return <table><tbody>{...rows}</tbody></table>;
    }
}
```

**Key design**: Include every value that affects the output. When any part of the key changes, the factory re-runs. When it matches, the cached VNode is reused as-is.

**`sweep()`**: Call at the end of `render()` to remove cache entries for items no longer in the list. Without it, deleted items stay in the cache (minor memory leak, functionally harmless).

**Performance impact**: For a 1000-row list where 2 rows change, memoization skips VNode creation for 998 rows. On benchmarks this makes select-row and swap-rows faster than vanilla JS.

## Context

Share data across the component tree without passing props through every level:

```tsx
import { createContext, Component } from '@kloudsoftware/eisen';

// 1. Create a context with a default value
const ThemeCtx = createContext<'light' | 'dark'>('light');
const UserCtx = createContext<{ name: string } | null>(null);

// 2. Provide in a parent
class App extends Component {
    constructor(app) {
        super(app);
        this.provide(ThemeCtx, 'dark');
        this.provide(UserCtx, { name: 'Alice' });
    }
}

// 3. Inject in any descendant
class Sidebar extends Component {
    render() {
        const theme = this.inject(ThemeCtx);  // 'dark'
        const user = this.inject(UserCtx);    // { name: 'Alice' }
        return <aside className={theme}>{user?.name}</aside>;
    }
}
```

Injection walks up the component tree. The nearest provider wins. If none is found, the default value is returned.

## Portals

Render into a DOM element outside the component tree:

```tsx
import { createPortal } from '@kloudsoftware/eisen';

function Modal({ children }) {
    return createPortal(
        <div className="modal-overlay">
            <div className="modal-content">{...children}</div>
        </div>,
        'modal-root'  // ID of the target element
    );
}
```

The target element (`<div id="modal-root">`) must exist in the HTML. The portal's content is rendered there regardless of where the component lives in the tree.

## Refs

Three ref styles, all set after the element is mounted:

```tsx
// 1. useRef hook (functional components) -- typed .el access
const input = useRef<HTMLInputElement>();
<input ref={input} />
input.el.focus();

// 2. createRef (class components)
const ref = createRef();
<input ref={ref} />
ref.current.htmlElement  // untyped

// 3. Callback ref
<input ref={node => console.log(node.htmlElement)} />
```

## Router

```tsx
const { app } = createApp(App, '#app');
const router = app.useRouter(mountNode);

router.register('/home', HomeComponent);
router.register('/about', AboutComponent);
router.register('/user/:id', UserComponent);
```

Route components receive the matched params via props.

## i18n

```tsx
app.useTranslationResolver(resolver);
```

Template strings with `{{ key }}` are resolved through registered resolvers. Resolvers support strict locale matching (`en-US`) and fallback (`en`).

## Global Store

Zustand-style reactive store for shared state:

```tsx
import { createStore } from '@kloudsoftware/eisen';

const useCounter = createStore((set) => ({
    count: 0,
    increment: () => set(s => ({ count: s.count + 1 })),
    reset: () => set({ count: 0 }),
}));

// In any component:
function Display() {
    const { count, increment } = useCounter();
    return <button onClick={increment}>{count}</button>;
}
```

Components that call the store hook auto-subscribe to updates. `setState` accepts a partial object or an updater function.

**Outside components**:
```tsx
useCounter.getState().increment();
useCounter.setState({ count: 99 });
useCounter.subscribe(() => console.log(useCounter.getState()));
```

## SSR (Server-Side Rendering)

**Server** (Node.js, no DOM required):
```tsx
import { renderPage } from '@kloudsoftware/eisen';
import App from './App';

// Express / Hono / any server:
app.get('*', (req, res) => {
    res.send(renderPage(App, {
        title: 'My App',
        scripts: ['/assets/client.js'],
        styles: ['/assets/style.css'],
    }));
});
```

**Client** — same `createApp` you already use:
```tsx
import { createApp } from '@kloudsoftware/eisen';
import App from './App';

createApp(App, '#app');
// Auto-detects server content → hydrates instead of re-rendering
```

That's it. `createApp` checks if the mount target already has children. If yes, it hydrates (attaches VNodes to existing DOM). If no, it renders fresh. Same code works for both SSR and SPA.

**Lower-level API** (if you need more control):
```tsx
renderApp(App, 'app')          // → HTML string (just the component, no shell)
hydrateApp(App, '#app')        // → explicit hydration
```

## Testing

`renderToString` serializes a VNode tree to HTML:

```tsx
import { renderToString, jsx } from '@kloudsoftware/eisen';

const html = renderToString(<div className="app"><h1>Hello</h1></div>);
// '<div class="app"><h1>Hello</h1></div>'
```

`renderApp` also works for snapshot testing without browser setup.

## Vite Plugin

Zero-config JSX setup:

```ts
// vite.config.ts
import { eisenPlugin } from '@kloudsoftware/eisen/vite-plugin';
export default { plugins: [eisenPlugin()] };
```

Configures `jsx`/`Fragment` factory and auto-injects imports.

## Error Boundaries

Catch render errors without crashing the whole app. Pass a render function as child to catch errors lazily:

```tsx
import { ErrorBoundary } from '@kloudsoftware/eisen';

<ErrorBoundary fallback={(err) => <p>Error: {err.message}</p>}>
    {() => <RiskyComponent />}
</ErrorBoundary>
```

The `fallback` can be a VNode or a function `(error: Error) => VNode`.

## Suspense

Display a fallback while lazy-loaded components are resolving:

```tsx
import { Suspense, lazy } from '@kloudsoftware/eisen';

const LazyPage = lazy(() => import('./Page'));

<Suspense fallback={<div>Loading...</div>}>
    <LazyPage />
</Suspense>
```

## Hydration

Attach a VNode tree to server-rendered DOM without recreating elements:

```tsx
const { app } = createApp(App, '#app');
app.renderer.hydrate(app.rootNode.$getChildren()[0], document.getElementById('app')!.firstElementChild);
```

Use with `renderToString` for full SSR: render on the server, send HTML, then hydrate on the client. Event listeners and reactivity activate without a DOM rebuild.

## Declarative Routes

```tsx
import { registerRoutes, Route } from '@kloudsoftware/eisen';

const { app } = createApp(App, '#app');
const router = app.useRouter(mountNode);

registerRoutes(router, app, [
    Route('/home', HomePage),
    Route('/about', AboutPage),
    Route('/user/:id', UserPage),
]);

router.resolveRoute(location.pathname);
```

## Dev Warnings

Enable during development:

```tsx
import { enableDevWarnings } from '@kloudsoftware/eisen';
enableDevWarnings();
```

Catches:
- Duplicate keys among siblings
- Mixed keyed/unkeyed children
- `render()` returning `undefined`
- `bind:` on non-input elements
- Reactive property set after unmount
- Undefined children (missing return in `.map()`)

Warnings are deduped -- the same message only shows once.

## Unmanaged Nodes

Opt out of diffing for a subtree (useful for third-party widgets):

```tsx
const widget = app.createUnmanagedNode(mount);
widget.addOnDomEventOrExecute(el => {
    // el is the real DOM element -- do whatever you want
    thirdPartyLib.init(el);
});
```

The renderer ignores everything inside an unmanaged node.

## Performance Tips

1. **Use keys on lists** -- Without keys, eisen falls back to position-based matching. Keys enable efficient moves and removals.

2. **Use `createMemo`** for large lists -- Skips VNode creation for unchanged items. Especially impactful for partial updates (select, swap, update every Nth).

3. **Use `@computed`** for derived data -- Avoids recalculating on every render when dependencies haven't changed.

4. **Use `shouldUpdate()`** -- Skip re-renders for components whose inputs haven't changed.
