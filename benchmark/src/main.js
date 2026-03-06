'use strict';

import { VApp, Renderer, Component, Props, reactive, jsx, createMemo } from '@kloudsoftware/eisen';
import { buildData } from './store.js';

class Row extends Component {
    constructor(app, data, selected, onSelect, onDelete) {
        super(app);
        this.data = data;
        this.selected = selected;
        this.onSelect = onSelect;
        this.onDelete = onDelete;
    }

    lifeCycle() { return {}; }

    render() {
        return jsx('tr', { className: this.selected ? 'danger' : '' },
            jsx('td', { className: 'col-md-1' }, String(this.data.id)),
            jsx('td', { className: 'col-md-4' },
                jsx('a', { onClick: () => this.onSelect(this.data.id) }, this.data.label)
            ),
            jsx('td', { className: 'col-md-1' },
                jsx('a', { onClick: () => this.onDelete(this.data.id) },
                    jsx('span', { className: 'glyphicon glyphicon-remove', 'aria-hidden': 'true' })
                )
            ),
            jsx('td', { className: 'col-md-6' })
        );
    }
}

class Main extends Component {
    constructor(app) {
        super(app);
        this.data = [];
        this.selected = undefined;
        this._memo = createMemo();
    }

    run() {
        this.data = buildData();
        this.selected = undefined;
    }

    runLots() {
        this.data = buildData(10000);
        this.selected = undefined;
    }

    add() {
        this.data = this.data.concat(buildData(1000));
    }

    update() {
        const newData = this.data.slice();
        for (let i = 0; i < newData.length; i += 10) {
            const item = newData[i];
            newData[i] = { id: item.id, label: item.label + ' !!!' };
        }
        this.data = newData;
    }

    clear() {
        this.data = [];
        this.selected = undefined;
    }

    swapRows() {
        if (this.data.length > 998) {
            const newData = this.data.slice();
            const tmp = newData[1];
            newData[1] = newData[998];
            newData[998] = tmp;
            this.data = newData;
        }
    }

    select(id) {
        this.selected = id;
    }

    del(id) {
        this.data = this.data.filter(d => d.id !== id);
    }

    lifeCycle() { return {}; }

    render() {
        const memo = this._memo;
        const rows = this.data.map(d => {
            const sel = d.id === this.selected;
            return memo(`${d.id}|${d.label}|${sel}`, () => {
                const row = jsx('tr', {
                        key: String(d.id),
                        className: sel ? 'danger' : ''
                    },
                    jsx('td', { className: 'col-md-1' }, String(d.id)),
                    jsx('td', { className: 'col-md-4' },
                        jsx('a', { onClick: () => this.select(d.id) }, d.label)
                    ),
                    jsx('td', { className: 'col-md-1' },
                        jsx('a', { onClick: () => this.del(d.id) },
                            jsx('span', { className: 'glyphicon glyphicon-remove', 'aria-hidden': 'true' })
                        )
                    ),
                    jsx('td', { className: 'col-md-6' })
                );
                row.key = String(d.id);
                return row;
            });
        });
        memo.sweep();

        return jsx('div', { className: 'container' },
            jsx('div', { className: 'jumbotron' },
                jsx('div', { className: 'row' },
                    jsx('div', { className: 'col-md-6' },
                        jsx('h1', null, 'eisen')
                    ),
                    jsx('div', { className: 'col-md-6' },
                        jsx('div', { className: 'row' },
                            jsx('div', { className: 'col-sm-6 smallpad' },
                                jsx('button', { type: 'button', className: 'btn btn-primary btn-block', id: 'run', onClick: () => this.run() }, 'Create 1,000 rows')
                            ),
                            jsx('div', { className: 'col-sm-6 smallpad' },
                                jsx('button', { type: 'button', className: 'btn btn-primary btn-block', id: 'runlots', onClick: () => this.runLots() }, 'Create 10,000 rows')
                            ),
                            jsx('div', { className: 'col-sm-6 smallpad' },
                                jsx('button', { type: 'button', className: 'btn btn-primary btn-block', id: 'add', onClick: () => this.add() }, 'Append 1,000 rows')
                            ),
                            jsx('div', { className: 'col-sm-6 smallpad' },
                                jsx('button', { type: 'button', className: 'btn btn-primary btn-block', id: 'update', onClick: () => this.update() }, 'Update every 10th row')
                            ),
                            jsx('div', { className: 'col-sm-6 smallpad' },
                                jsx('button', { type: 'button', className: 'btn btn-primary btn-block', id: 'clear', onClick: () => this.clear() }, 'Clear')
                            ),
                            jsx('div', { className: 'col-sm-6 smallpad' },
                                jsx('button', { type: 'button', className: 'btn btn-primary btn-block', id: 'swaprows', onClick: () => this.swapRows() }, 'Swap Rows')
                            )
                        )
                    )
                )
            ),
            jsx('table', { className: 'table table-hover table-striped test-data' },
                jsx('tbody', null, ...rows)
            ),
            jsx('span', { className: 'preloadicon glyphicon glyphicon-remove', 'aria-hidden': 'true' })
        );
    }
}

reactive()(Main.prototype, 'data');
reactive()(Main.prototype, 'selected');

const app = new VApp('main', new Renderer());
app.init();
const main = new Main(app);
app.mountComponent(main, app.rootNode, new Props(app));
