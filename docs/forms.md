# Forms

## Two-Way Binding

The `bind:` directive syncs a reactive property with an input element in both directions:

```tsx
class Form extends Component {
    @reactive() name = '';
    @reactive() agreed = false;
    @reactive() bio = '';
    @reactive() role = 'user';

    render() {
        return (
            <form onSubmit={e => { e.preventDefault(); this.submit(); }}>
                <input bind:value={[this, 'name']} placeholder="Name" />
                <textarea bind:value={[this, 'bio']} />

                <select bind:value={[this, 'role']}>
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                </select>

                <label>
                    <input type="checkbox" bind:checked={[this, 'agreed']} />
                    I agree
                </label>

                <button disabled={!this.agreed}>Submit</button>
            </form>
        );
    }
}
```

**How it works**:
1. Sets the initial DOM value from the reactive property
2. Listens for `input`/`change` events to update the property
3. Watches the property for programmatic changes to update the DOM

**Supported elements**: `<input>`, `<textarea>`, `<select>`.

## Controlled Inputs (Without bind)

For one-way data flow, use `value` + `onInput`:

```tsx
<input
    value={this.query}
    onInput={e => { this.query = (e.target as HTMLInputElement).value; }}
/>
```

## Input Refs

Access the DOM input element directly via `useRef`:

```tsx
function SearchForm() {
    const input = useRef<HTMLInputElement>();

    useEffect(() => input.el?.focus(), []);

    return (
        <form onSubmit={e => {
            e.preventDefault();
            search(input.el.value);
            input.el.value = '';
        }}>
            <input ref={input} type="text" placeholder="Search..." />
        </form>
    );
}
```

## Validation (VInputNode API)

For the imperative `k()` API, `VInputNode` provides built-in validation:

```tsx
const input = app.k('input') as VInputNode;
input.bindObject(user, 'email');
input.validate(
    () => user.email.includes('@'),
    'input-error'  // CSS class added on failure
);
```

Validation runs on blur. Call `input.doValidation(true)` to trigger manually.
