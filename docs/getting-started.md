# Getting Started

## Install

```bash
npm install @kloudsoftware/eisen
```

## TSX Configuration

**tsconfig.json**
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

`experimentalDecorators` is only needed if using `@reactive()` or `@computed()`.

## Minimal App

**app.tsx**
```tsx
import { createApp } from '@kloudsoftware/eisen';

createApp(() => <h1>Hello world</h1>, '#app');
```

**index.html**
```html
<div id="app"></div>
<script type="module" src="./app.tsx"></script>
```

## Stateful App

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

## Class-Based App

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

## `createApp` Return Value

```tsx
const { app, component } = createApp(App, '#app');
```

The `#` is optional -- `createApp(App, 'app')` works too.

## Build Tools

Eisen works with any bundler that supports TSX:

- **Vite**: Use the eisen plugin for zero-config JSX + HMR:
  ```ts
  // vite.config.ts
  import { eisenPlugin } from '@kloudsoftware/eisen/vite-plugin';
  export default { plugins: [eisenPlugin()] };
  ```
  Or configure manually with `esbuild.jsxFactory: 'jsx'` in vite.config
- **esbuild**: `--jsx-factory=jsx --jsx-fragment=Fragment`
- **webpack + ts-loader**: Uses tsconfig.json settings
- **tsc**: Compiles TSX to `jsx()` calls per tsconfig

## Next Steps

- [Hooks](./hooks.md) -- useState, useEffect, useRef
- [Components](./components.md) -- Class components with @reactive and @computed
- [Templates](./templates.md) -- Show, For, Transition, Fragment
- [Forms](./forms.md) -- Two-way binding
- [Advanced](./advanced.md) -- Memoization, context, portals
