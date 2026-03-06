#!/usr/bin/env node
'use strict';

const { JSDOM } = require('jsdom');
const { VApp, Renderer, Component, Props, reactive, jsx } = require('../dist/index.cjs');

// --- Data generator (same as js-framework-benchmark) ---
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

// --- Setup ---
function setup() {
    const dom = new JSDOM('<div id="main"></div>', { url: 'http://localhost' });
    global.window = dom.window;
    global.document = dom.window.document;
    global.localStorage = dom.window.localStorage;
    Object.defineProperty(global, 'navigator', { value: dom.window.navigator, writable: true, configurable: true });
    global.HTMLElement = dom.window.HTMLElement;
    global.requestAnimationFrame = (cb) => { cb(0); return 0; };
    return dom;
}

// --- Eisen benchmark app ---
class BenchApp extends Component {
    constructor(app) {
        super(app);
        this.data = [];
        this.selected = undefined;
    }
    lifeCycle() { return {}; }
    render() {
        const rows = this.data.map(d => {
            const row = jsx('tr', { key: String(d.id), className: d.id === this.selected ? 'danger' : '' },
                jsx('td', { className: 'col-md-1' }, String(d.id)),
                jsx('td', { className: 'col-md-4' },
                    jsx('a', null, d.label)
                ),
                jsx('td', { className: 'col-md-1' },
                    jsx('a', null, jsx('span', { className: 'glyphicon glyphicon-remove' }))
                ),
                jsx('td', { className: 'col-md-6' })
            );
            row.key = String(d.id);
            return row;
        });

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

// --- Timing helper ---
function bench(name, fn, runs = 5) {
    // Warmup
    for (let i = 0; i < 2; i++) fn();

    const times = [];
    for (let i = 0; i < runs; i++) {
        const start = performance.now();
        fn();
        times.push(performance.now() - start);
    }
    times.sort((a, b) => a - b);
    const median = times[Math.floor(times.length / 2)];
    const mean = times.reduce((a, b) => a + b, 0) / times.length;
    const min = times[0];
    return { name, median, mean, min, times };
}

// --- Run ---
console.log('js-framework-benchmark operations (jsdom, median of 5 runs)\n');
console.log('Op                         Median     Mean      Min');
console.log('─'.repeat(55));

const results = [];

// 1. Create 1,000 rows
results.push(bench('create 1,000 rows', () => {
    nextId = 1;
    setup();
    const app = new VApp('main', new Renderer());
    app.init();
    const comp = new BenchApp(app);
    app.mountComponent(comp, app.rootNode, new Props(app));
    flush(app);
    comp.data = buildData(1000);
    flush(app);
}));

// 2. Replace 1,000 rows
{
    setup();
    const app = new VApp('main', new Renderer());
    app.init();
    const comp = new BenchApp(app);
    app.mountComponent(comp, app.rootNode, new Props(app));
    flush(app);
    comp.data = buildData(1000);
    flush(app);
    results.push(bench('replace 1,000 rows', () => {
        comp.data = buildData(1000);
        flush(app);
    }));
}

// 3. Partial update (every 10th row)
{
    nextId = 1;
    setup();
    const app = new VApp('main', new Renderer());
    app.init();
    const comp = new BenchApp(app);
    app.mountComponent(comp, app.rootNode, new Props(app));
    flush(app);
    comp.data = buildData(1000);
    flush(app);
    results.push(bench('update every 10th row', () => {
        const newData = comp.data.slice();
        for (let i = 0; i < newData.length; i += 10) {
            const item = newData[i];
            newData[i] = { id: item.id, label: item.label + ' !!!' };
        }
        comp.data = newData;
        flush(app);
    }));
}

// 4. Select row
{
    nextId = 1;
    setup();
    const app = new VApp('main', new Renderer());
    app.init();
    const comp = new BenchApp(app);
    app.mountComponent(comp, app.rootNode, new Props(app));
    flush(app);
    comp.data = buildData(1000);
    flush(app);
    let sel = 1;
    results.push(bench('select row', () => {
        comp.selected = sel++;
        if (sel > 1000) sel = 1;
        flush(app);
    }));
}

// 5. Swap rows
{
    nextId = 1;
    setup();
    const app = new VApp('main', new Renderer());
    app.init();
    const comp = new BenchApp(app);
    app.mountComponent(comp, app.rootNode, new Props(app));
    flush(app);
    comp.data = buildData(1000);
    flush(app);
    results.push(bench('swap rows', () => {
        const newData = comp.data.slice();
        const tmp = newData[1];
        newData[1] = newData[998];
        newData[998] = tmp;
        comp.data = newData;
        flush(app);
    }));
}

// 6. Remove row
{
    nextId = 1;
    setup();
    const app = new VApp('main', new Renderer());
    app.init();
    const comp = new BenchApp(app);
    app.mountComponent(comp, app.rootNode, new Props(app));
    flush(app);
    comp.data = buildData(1000);
    flush(app);
    results.push(bench('remove row', () => {
        const newData = comp.data.slice();
        newData.splice(0, 1);
        comp.data = newData;
        flush(app);
    }));
}

// 7. Create 10,000 rows
results.push(bench('create 10,000 rows', () => {
    nextId = 1;
    setup();
    const app = new VApp('main', new Renderer());
    app.init();
    const comp = new BenchApp(app);
    app.mountComponent(comp, app.rootNode, new Props(app));
    flush(app);
    comp.data = buildData(10000);
    flush(app);
}, 3));

// 8. Append 1,000 rows
{
    nextId = 1;
    setup();
    const app = new VApp('main', new Renderer());
    app.init();
    const comp = new BenchApp(app);
    app.mountComponent(comp, app.rootNode, new Props(app));
    flush(app);
    comp.data = buildData(1000);
    flush(app);
    results.push(bench('append 1,000 rows', () => {
        comp.data = comp.data.concat(buildData(1000));
        flush(app);
    }, 3));
}

// 9. Clear
{
    nextId = 1;
    setup();
    const app = new VApp('main', new Renderer());
    app.init();
    const comp = new BenchApp(app);
    app.mountComponent(comp, app.rootNode, new Props(app));
    flush(app);
    comp.data = buildData(1000);
    flush(app);
    results.push(bench('clear rows', () => {
        comp.data = [];
        flush(app);
        // Repopulate for next run
        comp.data = buildData(1000);
        flush(app);
    }));
}

for (const r of results) {
    console.log(`${r.name.padEnd(27)} ${r.median.toFixed(1).padStart(7)}ms  ${r.mean.toFixed(1).padStart(7)}ms  ${r.min.toFixed(1).padStart(7)}ms`);
}

// --- Vanilla JS baseline ---
console.log('\n\nVanilla JS baseline (same ops, raw DOM)\n');
console.log('Op                         Median     Mean      Min');
console.log('─'.repeat(55));

// Single shared JSDOM for all vanilla tests
const vDom = new JSDOM('<div id="main"><table class="table"><tbody id="tbody"></tbody></table></div>', { url: 'http://localhost' });
global.window = vDom.window;
global.document = vDom.window.document;
global.localStorage = vDom.window.localStorage;
Object.defineProperty(global, 'navigator', { value: vDom.window.navigator, writable: true, configurable: true });
global.HTMLElement = vDom.window.HTMLElement;
const vTbody = vDom.window.document.getElementById('tbody');

function vanillaClear() { vTbody.textContent = ''; }

function vanillaRenderRow(d) {
    const tr = document.createElement('tr');
    tr.dataset.id = d.id;
    const td1 = document.createElement('td'); td1.className = 'col-md-1'; td1.textContent = String(d.id);
    const td2 = document.createElement('td'); td2.className = 'col-md-4';
    const a = document.createElement('a'); a.textContent = d.label; td2.appendChild(a);
    const td3 = document.createElement('td'); td3.className = 'col-md-1';
    const a2 = document.createElement('a'); const span = document.createElement('span');
    span.className = 'glyphicon glyphicon-remove'; a2.appendChild(span); td3.appendChild(a2);
    const td4 = document.createElement('td'); td4.className = 'col-md-6';
    tr.appendChild(td1); tr.appendChild(td2); tr.appendChild(td3); tr.appendChild(td4);
    vTbody.appendChild(tr);
}

const vanillaResults = [];

// V1. Create 1,000 rows
vanillaResults.push(bench('create 1,000 rows', () => {
    vanillaClear();
    nextId = 1;
    const data = buildData(1000);
    for (const d of data) vanillaRenderRow(d);
}));

// V2. Replace 1,000 rows
{
    vanillaClear();
    const data = buildData(1000);
    for (const d of data) vanillaRenderRow(d);
    vanillaResults.push(bench('replace 1,000 rows', () => {
        vanillaClear();
        const newData = buildData(1000);
        for (const d of newData) vanillaRenderRow(d);
    }));
}

// V3. Update every 10th row
{
    vanillaClear();
    const data = buildData(1000);
    for (const d of data) vanillaRenderRow(d);
    vanillaResults.push(bench('update every 10th row', () => {
        const rows = vTbody.children;
        for (let i = 0; i < rows.length; i += 10) {
            const a = rows[i].children[1].firstChild;
            a.textContent = a.textContent + ' !!!';
        }
    }));
}

// V4. Select row
{
    vanillaClear();
    const data = buildData(1000);
    for (const d of data) vanillaRenderRow(d);
    let sel = 0;
    vanillaResults.push(bench('select row', () => {
        const rows = vTbody.children;
        if (sel > 0 && sel <= rows.length) rows[sel - 1].className = '';
        sel = (sel % 1000) + 1;
        rows[sel - 1].className = 'danger';
    }));
}

// V5. Swap rows
{
    vanillaClear();
    const data = buildData(1000);
    for (const d of data) vanillaRenderRow(d);
    vanillaResults.push(bench('swap rows', () => {
        const rows = vTbody.children;
        const row1 = rows[1];
        const row998 = rows[998];
        vTbody.insertBefore(row998, row1);
        vTbody.insertBefore(row1, rows[999]);
    }));
}

// V6. Remove row
{
    vanillaClear();
    const data = buildData(1000);
    for (const d of data) vanillaRenderRow(d);
    vanillaResults.push(bench('remove row', () => {
        if (vTbody.firstChild) vTbody.removeChild(vTbody.firstChild);
    }));
}

// V7. Create 10,000 rows
vanillaResults.push(bench('create 10,000 rows', () => {
    vanillaClear();
    nextId = 1;
    const data = buildData(10000);
    for (const d of data) vanillaRenderRow(d);
}, 3));

// V8. Append 1,000 rows
{
    vanillaClear();
    const data = buildData(1000);
    for (const d of data) vanillaRenderRow(d);
    vanillaResults.push(bench('append 1,000 rows', () => {
        const newData = buildData(1000);
        for (const d of newData) vanillaRenderRow(d);
    }, 3));
}

// V9. Clear
{
    vanillaClear();
    let data = buildData(1000);
    for (const d of data) vanillaRenderRow(d);
    vanillaResults.push(bench('clear rows', () => {
        vanillaClear();
        data = buildData(1000);
        for (const d of data) vanillaRenderRow(d);
    }));
}

for (const r of vanillaResults) {
    console.log(`${r.name.padEnd(27)} ${r.median.toFixed(1).padStart(7)}ms  ${r.mean.toFixed(1).padStart(7)}ms  ${r.min.toFixed(1).padStart(7)}ms`);
}

// --- Comparison ---
console.log('\n\nEisen vs Vanilla (slowdown factor, lower = better)\n');
console.log('Op                         Slowdown');
console.log('─'.repeat(40));
for (let i = 0; i < results.length; i++) {
    const factor = results[i].median / vanillaResults[i].median;
    const bar = '█'.repeat(Math.min(Math.round(factor * 2), 40));
    console.log(`${results[i].name.padEnd(27)} ${factor.toFixed(1).padStart(5)}x  ${bar}`);
}
console.log('\nNote: jsdom overhead is constant; the ratio reflects VDOM overhead.\n');
