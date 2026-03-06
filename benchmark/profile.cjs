#!/usr/bin/env node
'use strict';

const { JSDOM } = require('jsdom');
const { VApp, Renderer, Component, Props, reactive, jsx, createMemo } = require('../dist/index.cjs');

function _random(max) { return Math.round(Math.random() * 1000) % max; }
const adjectives = ["pretty","large","big","small","tall","short","long","handsome","plain","quaint","clean","elegant","easy","angry","crazy","helpful","mushy","odd","unsightly","adorable","important","inexpensive","cheap","expensive","fancy"];
const colours = ["red","yellow","blue","green","pink","brown","purple","brown","white","black","orange"];
const nouns = ["table","chair","house","bbq","desk","car","pony","cookie","sandwich","burger","pizza","mouse","keyboard"];
let nextId = 1;
function buildData(count = 1000) {
    const data = [];
    for (let i = 0; i < count; i++) {
        data.push({ id: nextId++, label: adjectives[_random(adjectives.length)] + " " + colours[_random(colours.length)] + " " + nouns[_random(nouns.length)] });
    }
    return data;
}

const dom = new JSDOM('<div id="main"></div>', { url: 'http://localhost' });
global.window = dom.window;
global.document = dom.window.document;
global.localStorage = dom.window.localStorage;
Object.defineProperty(global, 'navigator', { value: dom.window.navigator, writable: true, configurable: true });
global.HTMLElement = dom.window.HTMLElement;
global.requestAnimationFrame = (cb) => { cb(0); return 0; };

class BenchApp extends Component {
    constructor(app) { super(app); this.data = []; this.selected = undefined; this._memo = createMemo(); }
    lifeCycle() { return {}; }
    render() {
        const memo = this._memo;
        const rows = this.data.map(d => {
            const sel = d.id === this.selected;
            return memo(`${d.id}|${d.label}|${sel}`, () => {
                const row = jsx('tr', { key: String(d.id), className: sel ? 'danger' : '' },
                    jsx('td', { className: 'col-md-1' }, String(d.id)),
                    jsx('td', { className: 'col-md-4' }, jsx('a', null, d.label)),
                    jsx('td', { className: 'col-md-1' }, jsx('a', null, jsx('span', { className: 'glyphicon glyphicon-remove' }))),
                    jsx('td', { className: 'col-md-6' })
                );
                row.key = String(d.id);
                return row;
            });
        });
        memo.sweep();
        return jsx('div', { className: 'container' },
            jsx('table', { className: 'table table-hover table-striped test-data' },
                jsx('tbody', null, ...rows)
            )
        );
    }
}
reactive()(BenchApp.prototype, 'data');
reactive()(BenchApp.prototype, 'selected');

function flush(app) {
    const patch = app.renderer.diffAgainstLatest(app);
    patch(app.rootNode.htmlElement);
}

const app = new VApp('main', new Renderer());
app.init();
const comp = new BenchApp(app);
app.mountComponent(comp, app.rootNode, new Props(app));
flush(app);
comp.data = buildData(1000);
flush(app);

// Profile: swap rows
console.log('\n--- SWAP ROWS ---');
{
    const t0 = performance.now();
    const newData = comp.data.slice();
    const tmp = newData[1]; newData[1] = newData[998]; newData[998] = tmp;
    const t1 = performance.now();
    comp.data = newData;
    const t2 = performance.now();
    // flushDirtyComponents calls render()
    app.flushDirtyComponents();
    const t3 = performance.now();
    // Now do the diff
    const latest = app.getLatestSnapshot();
    const patch = app.renderer.diff(latest, app);
    const t4 = performance.now();
    // Apply the patch
    patch(app.rootNode.htmlElement);
    const t5 = performance.now();
    app.saveSnapshot();
    console.log(`  data swap:     ${(t1-t0).toFixed(2)}ms`);
    console.log(`  reactive set:  ${(t2-t1).toFixed(2)}ms`);
    console.log(`  render():      ${(t3-t2).toFixed(2)}ms`);
    console.log(`  diff:          ${(t4-t3).toFixed(2)}ms`);
    console.log(`  patch:         ${(t5-t4).toFixed(2)}ms`);
    console.log(`  total:         ${(t5-t0).toFixed(2)}ms`);
}

// Profile: saveSnapshot cost
console.log('\n--- SNAPSHOT COST ---');
{
    const t0 = performance.now();
    app.saveSnapshot();
    const t1 = performance.now();
    console.log(`  saveSnapshot:  ${(t1-t0).toFixed(2)}ms`);
}

// Profile: targeted diff path (new optimized path via diffAgainstLatest)
console.log('\n--- SWAP ROWS (targeted diff, no snapshot) ---');
{
    const newData = comp.data.slice();
    const tmp = newData[1]; newData[1] = newData[998]; newData[998] = tmp;
    const t0 = performance.now();
    comp.data = newData;
    const t1 = performance.now();
    // diffAgainstLatest will call flushDirtyComponents which populates _pendingDiffs
    const patch = app.renderer.diffAgainstLatest(app);
    const t2 = performance.now();
    patch(app.rootNode.htmlElement);
    const t3 = performance.now();
    console.log(`  reactive set:  ${(t1-t0).toFixed(2)}ms`);
    console.log(`  diff:          ${(t2-t1).toFixed(2)}ms`);
    console.log(`  patch:         ${(t3-t2).toFixed(2)}ms`);
    console.log(`  total:         ${(t3-t0).toFixed(2)}ms`);
}

// Profile: select row (targeted)
console.log('\n--- SELECT ROW (targeted) ---');
{
    const t0 = performance.now();
    comp.selected = 5;
    const t1 = performance.now();
    const patch = app.renderer.diffAgainstLatest(app);
    const t2 = performance.now();
    patch(app.rootNode.htmlElement);
    const t3 = performance.now();
    console.log(`  reactive set:  ${(t1-t0).toFixed(2)}ms`);
    console.log(`  render+diff:   ${(t2-t1).toFixed(2)}ms`);
    console.log(`  patch:         ${(t3-t2).toFixed(2)}ms`);
    console.log(`  total:         ${(t3-t0).toFixed(2)}ms`);
}

// Profile: remove row (targeted)
console.log('\n--- REMOVE ROW (targeted) ---');
{
    const t0 = performance.now();
    const newData = comp.data.slice();
    newData.splice(0, 1);
    comp.data = newData;
    const t1 = performance.now();
    const patch = app.renderer.diffAgainstLatest(app);
    const t2 = performance.now();
    patch(app.rootNode.htmlElement);
    const t3 = performance.now();
    console.log(`  reactive+data: ${(t1-t0).toFixed(2)}ms`);
    console.log(`  render+diff:   ${(t2-t1).toFixed(2)}ms`);
    console.log(`  patch:         ${(t3-t2).toFixed(2)}ms`);
    console.log(`  total:         ${(t3-t0).toFixed(2)}ms`);
}
