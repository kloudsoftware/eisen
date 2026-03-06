var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { createApp, Component, reactive, computed, jsx, Show, For, enableDevWarnings } from '../dist/index.mjs';
enableDevWarnings();
const STORAGE_KEY = 'eisen-todomvc';
function loadTodos() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    }
    catch (_a) {
        return [];
    }
}
function routeToFilter() {
    const hash = location.hash.replace('#/', '');
    if (hash === 'active')
        return 'active';
    if (hash === 'completed')
        return 'completed';
    return 'all';
}
// --- App ---
class TodoApp extends Component {
    constructor(app) {
        super(app);
        this.todos = loadTodos();
        this.filter = routeToFilter();
        this.editingId = null;
        this.editText = '';
        this.nextId = this.todos.reduce((max, t) => Math.max(max, t.id), 0) + 1;
        window.addEventListener('hashchange', () => {
            this.filter = routeToFilter();
        });
    }
    get filtered() {
        if (this.filter === 'active')
            return this.todos.filter(t => !t.completed);
        if (this.filter === 'completed')
            return this.todos.filter(t => t.completed);
        return this.todos;
    }
    get activeCount() {
        return this.todos.filter(t => !t.completed).length;
    }
    get completedCount() {
        return this.todos.filter(t => t.completed).length;
    }
    get allCompleted() {
        return this.todos.length > 0 && this.todos.every(t => t.completed);
    }
    persist() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.todos));
    }
    addTodo(title) {
        const text = title.trim();
        if (!text)
            return;
        this.todos = [...this.todos, { id: this.nextId++, title: text, completed: false }];
        this.persist();
    }
    removeTodo(id) {
        this.todos = this.todos.filter(t => t.id !== id);
        this.persist();
    }
    toggleTodo(id) {
        this.todos = this.todos.map(t => t.id === id ? Object.assign(Object.assign({}, t), { completed: !t.completed }) : t);
        this.persist();
    }
    toggleAll() {
        const allDone = this.allCompleted;
        this.todos = this.todos.map(t => (Object.assign(Object.assign({}, t), { completed: !allDone })));
        this.persist();
    }
    clearCompleted() {
        this.todos = this.todos.filter(t => !t.completed);
        this.persist();
    }
    startEditing(todo) {
        this.editingId = todo.id;
        this.editText = todo.title;
    }
    commitEdit(id) {
        if (this.editingId === null)
            return;
        const text = this.editText.trim();
        if (!text) {
            this.removeTodo(id);
        }
        else {
            this.todos = this.todos.map(t => t.id === id ? Object.assign(Object.assign({}, t), { title: text }) : t);
            this.persist();
        }
        this.editingId = null;
    }
    cancelEdit() {
        this.editingId = null;
    }
    render() {
        return (jsx("section", { className: "todoapp" },
            jsx("header", { className: "header" },
                jsx("h1", null, "todos"),
                jsx("input", { className: "new-todo", placeholder: "What needs to be done?", autofocus: true, onKeyDown: (e) => {
                        if (e.key === 'Enter') {
                            const input = e.target;
                            this.addTodo(input.value);
                            input.value = '';
                        }
                    } })),
            jsx(Show, { when: this.todos.length > 0 },
                jsx("section", { className: "main" },
                    jsx("input", { id: "toggle-all", className: "toggle-all", type: "checkbox", checked: this.allCompleted, onChange: () => this.toggleAll() }),
                    jsx("label", { htmlFor: "toggle-all" }, "Mark all as complete"),
                    jsx("ul", { className: "todo-list" },
                        jsx(For, { each: this.filtered, keyFn: (t) => String(t.id) }, (todo) => {
                            const editing = this.editingId === todo.id;
                            return (jsx("li", { className: [
                                    todo.completed && 'completed',
                                    editing && 'editing'
                                ] },
                                jsx("div", { className: "view" },
                                    jsx("input", { className: "toggle", type: "checkbox", checked: todo.completed, onChange: () => this.toggleTodo(todo.id) }),
                                    jsx("label", { onDblClick: () => this.startEditing(todo) }, todo.title),
                                    jsx("button", { className: "destroy", onClick: () => this.removeTodo(todo.id) })),
                                jsx(Show, { when: editing },
                                    jsx("input", { className: "edit", value: this.editText, ref: (node) => {
                                            queueMicrotask(() => {
                                                const el = node.htmlElement;
                                                if (el) {
                                                    el.focus();
                                                    el.setSelectionRange(el.value.length, el.value.length);
                                                }
                                            });
                                        }, onInput: (e) => {
                                            this.editText = e.target.value;
                                        }, onBlur: () => this.commitEdit(todo.id), onKeyDown: (e) => {
                                            if (e.key === 'Enter')
                                                this.commitEdit(todo.id);
                                            if (e.key === 'Escape')
                                                this.cancelEdit();
                                        } }))));
                        }))),
                jsx("footer", { className: "footer" },
                    jsx("span", { className: "todo-count" },
                        jsx("strong", null, this.activeCount),
                        this.activeCount === 1 ? ' item left' : ' items left'),
                    jsx("ul", { className: "filters" },
                        jsx("li", null,
                            jsx("a", { className: this.filter === 'all' ? 'selected' : '', href: "#/" }, "All")),
                        jsx("li", null,
                            jsx("a", { className: this.filter === 'active' ? 'selected' : '', href: "#/active" }, "Active")),
                        jsx("li", null,
                            jsx("a", { className: this.filter === 'completed' ? 'selected' : '', href: "#/completed" }, "Completed"))),
                    jsx(Show, { when: this.completedCount > 0 },
                        jsx("button", { className: "clear-completed", onClick: () => this.clearCompleted() }, "Clear completed"))))));
    }
}
__decorate([
    reactive()
], TodoApp.prototype, "todos", void 0);
__decorate([
    reactive()
], TodoApp.prototype, "filter", void 0);
__decorate([
    reactive()
], TodoApp.prototype, "editingId", void 0);
__decorate([
    reactive()
], TodoApp.prototype, "editText", void 0);
__decorate([
    computed('todos', 'filter')
], TodoApp.prototype, "filtered", null);
__decorate([
    computed('todos')
], TodoApp.prototype, "activeCount", null);
__decorate([
    computed('todos')
], TodoApp.prototype, "completedCount", null);
__decorate([
    computed('todos')
], TodoApp.prototype, "allCompleted", null);
// --- Boot ---
createApp(TodoApp, '#app');
//# sourceMappingURL=app.js.map