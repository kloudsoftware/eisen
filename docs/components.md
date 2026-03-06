# Class Components

For complex components with many reactive properties, class components provide decorators and lifecycle hooks.

## Basic Structure

```tsx
import { createApp, Component, reactive } from '@kloudsoftware/eisen';

class App extends Component {
    @reactive() name = 'world';

    render() {
        return <h1>Hello {this.name}</h1>;
    }
}

createApp(App, '#app');
```

Only `render()` is required. `lifeCycle()` is optional.

## `@reactive()`

Marks a property as reactive. Changing it triggers a re-render.

```tsx
class App extends Component {
    @reactive() count = 0;
    @reactive() items: string[] = [];

    increment() {
        this.count++;  // re-renders
    }

    addItem() {
        this.items.push('new');  // deep tracking -- also re-renders
    }
}
```

**Deep mutation tracking**: Objects and arrays are wrapped in a Proxy. Mutations at any depth trigger a re-render:

```tsx
@reactive() user = { name: 'Alice', address: { city: 'NYC' } };

// All of these trigger re-render:
this.user.name = 'Bob';
this.user.address.city = 'LA';
```

**Deduplication**: Assigning the same value (by `===`) is a no-op.

**Custom equality**:
```tsx
@reactive((a, b) => a.id === b.id)
selected = { id: 1 };
```

## `@computed(...deps)`

Cached getter that recalculates only when dependencies change:

```tsx
class App extends Component {
    @reactive() items = [];
    @reactive() filter = 'all';

    @computed('items', 'filter')
    get visible() {
        if (this.filter === 'done') return this.items.filter(i => i.done);
        return this.items;
    }

    @computed('items')
    get total() {
        return this.items.length;
    }
}
```

Dependencies are names of `@reactive()` properties on the same class.

## Lifecycle

Override `lifeCycle()` to hook into mount/unmount/rerender:

```tsx
class App extends Component {
    lifeCycle() {
        return {
            mounted: (comp) => {
                // DOM is ready, comp.$mount.htmlElement exists
            },
            unmounted: () => {
                // component removed from DOM
            },
            beforererender: () => {
                // about to re-render
            },
            afterrerender: () => {
                // re-render complete
            },
        };
    }
}
```

All callbacks are optional. If you don't need any, don't override `lifeCycle()` at all.

## `shouldUpdate()`

Skip re-renders conditionally:

```tsx
class Expensive extends Component {
    shouldUpdate() {
        return this.data.length > 0;  // skip render when empty
    }
}
```

## Sub-Components

Mount child components inside a parent:

```tsx
class Parent extends Component {
    render() {
        const mount = <div />;
        this.mount(ChildComponent, this.app, mount, 'child-key');
        return <div>{mount}</div>;
    }
}
```

The key (`'child-key'`) ensures the sub-component is only created once. Subsequent renders reuse the existing instance.

## Functional Components

Plain functions also work as components. See [Hooks](./hooks.md) for stateful functional components.

```tsx
function Badge({ text }: { text: string }) {
    return <span className="badge">{text}</span>;
}

// Use in JSX:
<Badge text="new" />
```
