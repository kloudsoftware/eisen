# eisen

Dependency-free TypeScript frontend framework with JSX, hooks, and a fast virtual DOM.

## Features

- Virtual DOM with content-hashed diffing and memoization
- JSX/TSX with `Show`, `For`, `Transition`, `Fragment`, portals
- React-style hooks: `useState`, `useEffect`, `useRef`
- `@reactive()` decorator with deep mutation tracking
- `@computed()` cached getters
- Two-way binding: `bind:value`, `bind:checked`
- Context (provide/inject), router, i18n
- Dev warnings for common mistakes

## Install

```bash
npm install @kloudsoftware/eisen
```

## Quick Start

```tsx
import { createApp, useState } from '@kloudsoftware/eisen';

function App() {
    const [count, setCount] = useState(0);
    return (
        <button onClick={() => setCount(c => c + 1)}>
            Clicked {count} times
        </button>
    );
}

createApp(App, '#app');
```

Or with a class component:

```tsx
import { createApp, Component, reactive } from '@kloudsoftware/eisen';

class App extends Component {
    @reactive() count = 0;

    render() {
        return (
            <button onClick={() => this.count++}>
                Clicked {this.count} times
            </button>
        );
    }
}

createApp(App, '#app');
```

Both styles can be mixed freely.

## Docs

- [Getting Started](./docs/getting-started.md) -- Install, TSX config, first app
- [Hooks](./docs/hooks.md) -- useState, useEffect, useRef
- [Components](./docs/components.md) -- @reactive, @computed, lifecycle, shouldUpdate
- [Templates](./docs/templates.md) -- Show, For, Transition, Fragment, className, style, SVG
- [Forms](./docs/forms.md) -- bind:value, bind:checked, validation
- [Advanced](./docs/advanced.md) -- Memoization, context, portals, router, i18n, performance tips

## TSX Config

```json
{
    "compilerOptions": {
        "jsx": "react",
        "jsxFactory": "jsx",
        "jsxFragmentFactory": "Fragment",
        "experimentalDecorators": true
    }
}
```

## Build

```bash
npm run build     # compile with tsup
npm run example   # serve example at http://localhost:5173
npm test          # run tests
```

## Maintainers

Written and maintained by [kloudsoftware](https://github.com/orgs/kloudsoftware/people).
