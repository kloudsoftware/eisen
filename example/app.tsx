import {
    createApp, VApp, Component, reactive, computed,
    jsx, Show, For, enableDevWarnings
} from '../dist/index.mjs';

enableDevWarnings();

// --- Types ---

interface Todo {
    id: number;
    title: string;
    completed: boolean;
}

type Filter = 'all' | 'active' | 'completed';

const STORAGE_KEY = 'eisen-todomvc';

function loadTodos(): Todo[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch { return []; }
}

function routeToFilter(): Filter {
    const hash = location.hash.replace('#/', '');
    if (hash === 'active') return 'active';
    if (hash === 'completed') return 'completed';
    return 'all';
}

// --- App ---

class TodoApp extends Component {
    @reactive() todos: Todo[] = loadTodos();
    @reactive() filter: Filter = routeToFilter();
    @reactive() editingId: number | null = null;
    @reactive() editText = '';
    private nextId = this.todos.reduce((max, t) => Math.max(max, t.id), 0) + 1;

    constructor(app: VApp) {
        super(app);
        window.addEventListener('hashchange', () => {
            this.filter = routeToFilter();
        });
    }

    @computed('todos', 'filter')
    get filtered(): Todo[] {
        if (this.filter === 'active') return this.todos.filter(t => !t.completed);
        if (this.filter === 'completed') return this.todos.filter(t => t.completed);
        return this.todos;
    }

    @computed('todos')
    get activeCount(): number {
        return this.todos.filter(t => !t.completed).length;
    }

    @computed('todos')
    get completedCount(): number {
        return this.todos.filter(t => t.completed).length;
    }

    @computed('todos')
    get allCompleted(): boolean {
        return this.todos.length > 0 && this.todos.every(t => t.completed);
    }

    private persist() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.todos));
    }

    private addTodo(title: string) {
        const text = title.trim();
        if (!text) return;
        this.todos = [...this.todos, { id: this.nextId++, title: text, completed: false }];
        this.persist();
    }

    private removeTodo(id: number) {
        this.todos = this.todos.filter(t => t.id !== id);
        this.persist();
    }

    private toggleTodo(id: number) {
        this.todos = this.todos.map(t =>
            t.id === id ? { ...t, completed: !t.completed } : t
        );
        this.persist();
    }

    private toggleAll() {
        const allDone = this.allCompleted;
        this.todos = this.todos.map(t => ({ ...t, completed: !allDone }));
        this.persist();
    }

    private clearCompleted() {
        this.todos = this.todos.filter(t => !t.completed);
        this.persist();
    }

    private startEditing(todo: Todo) {
        this.editingId = todo.id;
        this.editText = todo.title;
    }

    private commitEdit(id: number) {
        if (this.editingId === null) return;
        const text = this.editText.trim();
        if (!text) {
            this.removeTodo(id);
        } else {
            this.todos = this.todos.map(t =>
                t.id === id ? { ...t, title: text } : t
            );
            this.persist();
        }
        this.editingId = null;
    }

    private cancelEdit() {
        this.editingId = null;
    }

    render() {
        return (
            <section className="todoapp">
                <header className="header">
                    <h1>todos</h1>
                    <input
                        className="new-todo"
                        placeholder="What needs to be done?"
                        autofocus={true}
                        onKeyDown={(e: KeyboardEvent) => {
                            if (e.key === 'Enter') {
                                const input = (e.target as HTMLInputElement);
                                this.addTodo(input.value);
                                input.value = '';
                            }
                        }}
                    />
                </header>

                <Show when={this.todos.length > 0}>
                    <section className="main">
                        <input
                            id="toggle-all"
                            className="toggle-all"
                            type="checkbox"
                            checked={this.allCompleted}
                            onChange={() => this.toggleAll()}
                        />
                        <label htmlFor="toggle-all">Mark all as complete</label>

                        <ul className="todo-list">
                            <For each={this.filtered} keyFn={(t: Todo) => String(t.id)}>
                                {(todo: Todo) => {
                                    const editing = this.editingId === todo.id;
                                    return (
                                        <li className={[
                                            todo.completed && 'completed',
                                            editing && 'editing'
                                        ]}>
                                            <div className="view">
                                                <input
                                                    className="toggle"
                                                    type="checkbox"
                                                    checked={todo.completed}
                                                    onChange={() => this.toggleTodo(todo.id)}
                                                />
                                                <label onDblClick={() => this.startEditing(todo)}>
                                                    {todo.title}
                                                </label>
                                                <button
                                                    className="destroy"
                                                    onClick={() => this.removeTodo(todo.id)}
                                                />
                                            </div>
                                            <Show when={editing}>
                                                <input
                                                    className="edit"
                                                    value={this.editText}
                                                    ref={(node: any) => {
                                                        queueMicrotask(() => {
                                                            const el = node.htmlElement as HTMLInputElement;
                                                            if (el) {
                                                                el.focus();
                                                                el.setSelectionRange(el.value.length, el.value.length);
                                                            }
                                                        });
                                                    }}
                                                    onInput={(e: Event) => {
                                                        this.editText = (e.target as HTMLInputElement).value;
                                                    }}
                                                    onBlur={() => this.commitEdit(todo.id)}
                                                    onKeyDown={(e: KeyboardEvent) => {
                                                        if (e.key === 'Enter') this.commitEdit(todo.id);
                                                        if (e.key === 'Escape') this.cancelEdit();
                                                    }}
                                                />
                                            </Show>
                                        </li>
                                    );
                                }}
                            </For>
                        </ul>
                    </section>

                    <footer className="footer">
                        <span className="todo-count">
                            <strong>{this.activeCount}</strong>
                            {this.activeCount === 1 ? ' item left' : ' items left'}
                        </span>

                        <ul className="filters">
                            <li>
                                <a className={this.filter === 'all' ? 'selected' : ''} href="#/">All</a>
                            </li>
                            <li>
                                <a className={this.filter === 'active' ? 'selected' : ''} href="#/active">Active</a>
                            </li>
                            <li>
                                <a className={this.filter === 'completed' ? 'selected' : ''} href="#/completed">Completed</a>
                            </li>
                        </ul>

                        <Show when={this.completedCount > 0}>
                            <button className="clear-completed" onClick={() => this.clearCompleted()}>
                                Clear completed
                            </button>
                        </Show>
                    </footer>
                </Show>
            </section>
        );
    }
}

// --- Boot ---

createApp(TodoApp, '#app');
