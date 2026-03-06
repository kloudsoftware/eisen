# Templates

Built-in JSX components for conditional rendering, lists, transitions, and fragments.

## `<Show>`

Conditional rendering with an optional fallback:

```tsx
<Show when={this.loggedIn}>
    <Dashboard />
</Show>

<Show when={this.data} fallback={<span>Loading...</span>}>
    <DataTable data={this.data} />
</Show>
```

When `when` is falsy, renders nothing (or the fallback).

## `<For>`

List rendering with automatic keying:

```tsx
<For each={this.items} keyFn={item => String(item.id)}>
    {(item, index) => (
        <li>
            #{index}: {item.name}
            <button onClick={() => this.remove(item.id)}>x</button>
        </li>
    )}
</For>
```

The child must be a single render function `(item, index) => VNode`.

`keyFn` generates a stable key per item for efficient diffing. Without it, items are unkeyed and matched by position.

## `<Transition>`

CSS-based enter/leave animations:

```tsx
<Transition name="fade" when={this.visible}>
    <div className="modal">content</div>
</Transition>
```

**Classes applied**:

| Phase | Classes |
|-------|---------|
| Enter frame 1 | `fade-enter-from`, `fade-enter-active` |
| Enter frame 2 | `fade-enter-active`, `fade-enter-to` |
| Enter done | *(all removed)* |
| Leave frame 1 | `fade-leave-from`, `fade-leave-active` |
| Leave frame 2 | `fade-leave-active`, `fade-leave-to` |
| Leave done | *(element removed)* |

**Example CSS**:
```css
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
```

**Props**:
- `name` -- CSS class prefix (default: `'v'`)
- `when` -- show/hide toggle
- `duration` -- fallback timeout in ms (default: 300) if `transitionend` doesn't fire

## `<Fragment>`

Groups children without adding a DOM element. Uses a `<div style="display:contents">` under the hood since eisen maps VNodes 1:1 to DOM elements:

```tsx
<Fragment>
    <li>one</li>
    <li>two</li>
</Fragment>
```

## className

Accepts strings, arrays (falsy values filtered), and objects:

```tsx
<div className="static" />
<div className={['base', isActive && 'active', isHidden && 'hidden']} />
<div className={{ base: true, active: isActive, hidden: isHidden }} />
```

`class` is an alias for `className`.

## style

Accepts strings and objects. Object keys are camelCase, auto-converted to kebab-case:

```tsx
<div style="color: red; font-size: 16px" />
<div style={{ color: 'red', fontSize: '16px', opacity: visible ? 1 : 0 }} />
```

Null/false values in style objects are filtered out.

## Boolean Attributes

Set with `true`/`false`. When false, the attribute is omitted entirely:

```tsx
<button disabled={!this.valid}>Submit</button>
<input required={true} />
<details open={this.expanded} />
```

Supported: `disabled`, `checked`, `readonly`, `hidden`, `selected`, `required`, `multiple`, `autofocus`, `autoplay`, `controls`, `loop`, `muted`, `open`, and more.

## SVG

SVG elements are created with the correct XML namespace automatically:

```tsx
<svg viewBox="0 0 100 100" width="100" height="100">
    <circle cx="50" cy="50" r="40" fill="currentColor" />
    <path d="M10 80 Q 50 10 90 80" stroke="black" fill="none" />
</svg>
```

## dangerouslySetInnerHTML

Inject raw HTML. Children are ignored when this is set:

```tsx
<div dangerouslySetInnerHTML={{ __html: markdownToHtml(content) }} />
```
