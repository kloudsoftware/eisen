# eisen

declarative and expressive TypeScript framework for building modern web applications.

## What is eisen?

eisen [ˈaizən] is a dependency‑free frontend framework written entirely in TypeScript. It ships with type definitions, a lean
~1200 LoC core and first class support for routing and internationalization. Features include:

- Virtual DOM with a diffing renderer
- Component model with lifecycle hooks
- Reactive state via the `reactive` decorator
- Two‑way data binding using `Props`
- Built‑in router and i18n helpers

## Why use eisen?

- Written in TypeScript – excellent editor integration and type safety
- Dependency free – the full source is easy to understand and extend
- Lightweight – focuses on essentials without sacrificing features

## Installing

Install the package from npm:

```bash
npm install @kloudsoftware/eisen
```

## Using eisen

### Hello world

**index.ts**
```typescript
import { VApp, Renderer } from '@kloudsoftware/eisen';

const renderer = new Renderer();
const app = new VApp('target', renderer);
app.init();

app.createElement('h1', 'Hello world!', app.rootNode);
```

**index.html**
```html
<body>
  <div id="target"></div>
  <script type="module" src="./index.ts"></script>
  or
  <script type="module" src="./index.tsx"></script>
</body>
```

## Components

To encapsulate and reuse logic, extend `Component` and implement `render` and `lifeCycle`:

```tsx
import {Component, Props, reactive, VNode} from '@kloudsoftware/eisen';

export class Counter extends Component {
    @reactive() count = 0;

    render(props: Props): VNode {
        //tsx version
        return <div>
            <button onclick={() => {
                this.count++;
            }}>
                Click me
            </button>
            <strong e-if={() => this.count > 0}>Count: {this.count}</strong>
        </div>;
    }

    lifeCycle() {
        return {
            mounted: () => console.log('mounted'),
            unmounted: () => console.log('unmounted'),
        };
    }
}
```

Mount the component:

```typescript
import { VApp, Renderer, Props } from '@kloudsoftware/eisen';

const renderer = new Renderer();
const app = new VApp('target', renderer);
app.init();
app.mountComponent(new Counter(app), app.rootNode, new Props(app));
```

### Props and two‑way binding

`Props` provide a simple way to pass data and react to changes.

```typescript
const props = new Props(app);
props.setProp('name', 'World');

const heading = app.k('h1', { value: 'Hello {{ name }}!' }, undefined, undefined, props);
props.registerCallback('name', val => console.log('name changed to', val));
```

### Input binding and validation

```typescript
import { VInputNode } from '@kloudsoftware/eisen';
const user = { name: '' };
const input = app.k('input') as VInputNode;
input.bindObj(user, 'name');
input.validate(() => user.name.length > 3, 'error');
app.rootNode.appendChild(input);
```

## Router & i18n

```typescript
const router = app.useRouter(app.rootNode);
// register your routes ...

app.useTranslationResolver(key => translations[key]);
```

## Build

Use microbundle to compile the source:

```bash
npm run build
```

## Maintainers

Eisen is written and maintained by [kloudsoftware](https://github.com/orgs/kloudsoftware/people).

