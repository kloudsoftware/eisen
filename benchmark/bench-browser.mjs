#!/usr/bin/env node
import puppeteer from 'puppeteer-core';
import http from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 8787;

// --- Simple static file server ---
const mimeTypes = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };

const server = http.createServer(async (req, res) => {
    let pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (pathname === '/') pathname = '/index.html';
    if (pathname.startsWith('/css/')) { res.writeHead(200, { 'Content-Type': 'text/css' }); res.end(''); return; }

    const filePath = path.join(__dirname, pathname);
    try {
        const data = await fs.readFile(filePath);
        const ext = path.extname(filePath);
        res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
        res.end(data);
    } catch {
        res.writeHead(404); res.end('Not Found');
    }
});

await new Promise(resolve => server.listen(PORT, resolve));
console.log(`Server on http://localhost:${PORT}`);

// --- Launch browser ---
const browser = await puppeteer.launch({
    executablePath: '/usr/bin/chromium',
    headless: true,
    args: [
        '--no-sandbox',
        '--disable-gpu',
        '--disable-extensions',
        '--disable-background-networking',
        '--disable-dev-shm-usage',
    ],
});

const page = await browser.newPage();
// Enable Performance API
await page.evaluateOnNewDocument(() => {
    window.__benchResults = {};
});

const WARMUP = 2;
const RUNS = 5;
const url = `http://localhost:${PORT}/`;

async function runBenchmark(name, setupFn, actionFn) {
    const times = [];
    for (let i = 0; i < WARMUP + RUNS; i++) {
        await page.goto(url, { waitUntil: 'networkidle0' });
        await page.waitForSelector('.container');

        if (setupFn) {
            await page.evaluate(setupFn);
            // Wait for microtask flush + paint
            await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0))));
        }

        // Measure: trigger action, then wait for microtask flush + rAF (= DOM fully updated)
        const time = await page.evaluate(async (actionSrc) => {
            const actionFn = new Function(`return (${actionSrc})`)();
            const t0 = performance.now();
            actionFn();
            // Wait for microtask flush (eisen uses queueMicrotask) + rAF
            await new Promise(resolve => {
                requestAnimationFrame(() => {
                    // After rAF, the DOM update is complete
                    resolve();
                });
            });
            return performance.now() - t0;
        }, actionFn.toString());

        if (i >= WARMUP) times.push(time);
    }

    times.sort((a, b) => a - b);
    const median = times[Math.floor(times.length / 2)];
    const mean = times.reduce((a, b) => a + b, 0) / times.length;
    const min = times[0];
    return { name, median, mean, min, times };
}

console.log('\nEisen benchmark (Chromium, median of 5 runs)\n');
console.log('Op                         Median     Mean      Min');
console.log('─'.repeat(55));

const results = [];

// 1. Create 1,000 rows
results.push(await runBenchmark('create 1,000 rows', null,
    () => { document.getElementById('run').click(); }
));

// 2. Replace 1,000 rows
results.push(await runBenchmark('replace 1,000 rows',
    () => document.getElementById('run').click(),
    () => { document.getElementById('run').click(); }
));

// 3. Update every 10th row
results.push(await runBenchmark('update every 10th',
    () => document.getElementById('run').click(),
    () => { document.getElementById('update').click(); }
));

// 4. Select row
results.push(await runBenchmark('select row',
    () => document.getElementById('run').click(),
    () => {
        const link = document.querySelectorAll('tbody tr')[3]?.querySelector('td:nth-child(2) a');
        if (link) link.click();
    }
));

// 5. Swap rows
results.push(await runBenchmark('swap rows',
    () => document.getElementById('run').click(),
    () => { document.getElementById('swaprows').click(); }
));

// 6. Remove row
results.push(await runBenchmark('remove row',
    () => document.getElementById('run').click(),
    () => {
        const btn = document.querySelectorAll('tbody tr')[3]?.querySelector('td:nth-child(3) a');
        if (btn) btn.click();
    }
));

// 7. Create 10,000 rows
results.push(await runBenchmark('create 10,000 rows', null,
    () => { document.getElementById('runlots').click(); }
));

// 8. Append 1,000 rows
results.push(await runBenchmark('append 1,000 rows',
    () => document.getElementById('run').click(),
    () => { document.getElementById('add').click(); }
));

// 9. Clear
results.push(await runBenchmark('clear rows',
    () => document.getElementById('run').click(),
    () => { document.getElementById('clear').click(); }
));

for (const r of results) {
    console.log(`${r.name.padEnd(27)} ${r.median.toFixed(1).padStart(7)}ms  ${r.mean.toFixed(1).padStart(7)}ms  ${r.min.toFixed(1).padStart(7)}ms`);
}

// --- Run vanilla baseline on same machine ---
console.log('\n\nVanilla JS baseline (same machine, Chromium)\n');
console.log('Op                         Median     Mean      Min');
console.log('─'.repeat(55));

const vanillaUrl = `http://localhost:${PORT}/vanilla.html`;
const vanillaResults = [];

async function runVanillaBench(name, setupFn, actionFn) {
    const times = [];
    for (let i = 0; i < WARMUP + RUNS; i++) {
        await page.goto(vanillaUrl, { waitUntil: 'networkidle0' });
        await page.waitForSelector('.container');

        if (setupFn) {
            await page.evaluate(setupFn);
            await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0))));
        }

        const time = await page.evaluate(async (actionSrc) => {
            const actionFn = new Function(`return (${actionSrc})`)();
            const t0 = performance.now();
            actionFn();
            await new Promise(resolve => requestAnimationFrame(() => resolve()));
            return performance.now() - t0;
        }, actionFn.toString());

        if (i >= WARMUP) times.push(time);
    }
    times.sort((a, b) => a - b);
    const median = times[Math.floor(times.length / 2)];
    const mean = times.reduce((a, b) => a + b, 0) / times.length;
    const min = times[0];
    return { name, median, mean, min, times };
}

vanillaResults.push(await runVanillaBench('create 1,000 rows', null,
    () => { document.getElementById('run').click(); }));
vanillaResults.push(await runVanillaBench('replace 1,000 rows',
    () => document.getElementById('run').click(),
    () => { document.getElementById('run').click(); }));
vanillaResults.push(await runVanillaBench('update every 10th',
    () => document.getElementById('run').click(),
    () => { document.getElementById('update').click(); }));
vanillaResults.push(await runVanillaBench('select row',
    () => document.getElementById('run').click(),
    () => { document.querySelectorAll('tbody tr')[3]?.querySelector('.lbl')?.click(); }));
vanillaResults.push(await runVanillaBench('swap rows',
    () => document.getElementById('run').click(),
    () => { document.getElementById('swaprows').click(); }));
vanillaResults.push(await runVanillaBench('remove row',
    () => document.getElementById('run').click(),
    () => { document.querySelectorAll('tbody tr')[3]?.querySelector('.remove')?.click(); }));
vanillaResults.push(await runVanillaBench('create 10,000 rows', null,
    () => { document.getElementById('runlots').click(); }));
vanillaResults.push(await runVanillaBench('append 1,000 rows',
    () => document.getElementById('run').click(),
    () => { document.getElementById('add').click(); }));
vanillaResults.push(await runVanillaBench('clear rows',
    () => document.getElementById('run').click(),
    () => { document.getElementById('clear').click(); }));

for (const r of vanillaResults) {
    console.log(`${r.name.padEnd(27)} ${r.median.toFixed(1).padStart(7)}ms  ${r.mean.toFixed(1).padStart(7)}ms  ${r.min.toFixed(1).padStart(7)}ms`);
}

// Comparison table
console.log('\n\nEisen vs Vanilla (same machine)\n');
console.log('Op                      Vanilla    Eisen    Slowdown');
console.log('─'.repeat(55));
for (let i = 0; i < results.length; i++) {
    const v = vanillaResults[i].median;
    const e = results[i].median;
    const ratio = v > 0.01 ? (e / v).toFixed(1) : 'N/A';
    const bar = typeof ratio === 'string' ? '' : '█'.repeat(Math.min(Math.round(parseFloat(ratio) * 3), 30));
    console.log(
        `${results[i].name.padEnd(24)}` +
        `${v.toFixed(1).padStart(7)}ms ` +
        `${e.toFixed(1).padStart(7)}ms ` +
        `${String(ratio + 'x').padStart(7)}  ${bar}`
    );
}

// Published median results from js-framework-benchmark (v2024-12)
// Source: https://krausest.github.io/js-framework-benchmark/
const published = {
    vanillajs:   { create1k: 38.1, replace1k: 42.3, update10th: 6.7, selectRow: 2.0,  swapRows: 16.2, removeRow: 13.1, create10k: 375.2, append1k: 54.7, clear: 11.1 },
    preact:      { create1k: 54.1, replace1k: 59.1, update10th: 14.3, selectRow: 4.3,  swapRows: 20.1, removeRow: 14.2, create10k: 630.7, append1k: 82.4, clear: 15.3 },
    vue:         { create1k: 53.8, replace1k: 57.1, update10th: 13.7, selectRow: 4.0,  swapRows: 19.9, removeRow: 14.0, create10k: 590.6, append1k: 68.2, clear: 14.3 },
    react:       { create1k: 58.3, replace1k: 73.1, update10th: 14.9, selectRow: 5.3,  swapRows: 21.3, removeRow: 16.4, create10k: 692.1, append1k: 93.2, clear: 16.9 },
    solid:       { create1k: 41.2, replace1k: 43.0, update10th: 6.9,  selectRow: 1.8,  swapRows: 16.2, removeRow: 13.3, create10k: 389.9, append1k: 57.3, clear: 11.7 },
};

console.log('\n\nPublished benchmark medians (for reference)\n');
console.log('Framework      create1k  replace  upd10th  select  swap    remove  create10k append  clear');
console.log('─'.repeat(100));
for (const [name, d] of Object.entries(published)) {
    console.log(
        `${name.padEnd(15)}` +
        `${d.create1k.toFixed(1).padStart(8)}  ` +
        `${d.replace1k.toFixed(1).padStart(7)}  ` +
        `${d.update10th.toFixed(1).padStart(7)}  ` +
        `${d.selectRow.toFixed(1).padStart(6)}  ` +
        `${d.swapRows.toFixed(1).padStart(6)}  ` +
        `${d.removeRow.toFixed(1).padStart(7)}  ` +
        `${d.create10k.toFixed(1).padStart(9)}  ` +
        `${d.append1k.toFixed(1).padStart(6)}  ` +
        `${d.clear.toFixed(1).padStart(5)}`
    );
}

// Normalized comparison: compute eisen's "standardized" scores using hardware calibration
// Our vanilla / published vanilla = hardware factor per operation
console.log('\n\nNormalized comparison (calibrated to published vanilla)\n');
console.log('Op                  Eisen*    Preact    Vue       React     Solid     (* = estimated)');
console.log('─'.repeat(85));

const opKeys = ['create1k', 'replace1k', 'update10th', 'selectRow', 'swapRows', 'removeRow', 'create10k', 'append1k', 'clear'];
const opLabels = ['create 1,000', 'replace 1,000', 'update 10th', 'select row', 'swap rows', 'remove row', 'create 10,000', 'append 1,000', 'clear'];

for (let i = 0; i < opKeys.length; i++) {
    const op = opKeys[i];
    const vLocal = vanillaResults[i].median;
    const vPub = published.vanillajs[op];
    // hardware factor: our machine vs published
    const hwFactor = vLocal / vPub;
    // eisen normalized = eisen_local / hwFactor
    const eisenNorm = results[i].median / hwFactor;
    console.log(
        `${opLabels[i].padEnd(20)}` +
        `${eisenNorm.toFixed(1).padStart(7)}  ` +
        `${published.preact[op].toFixed(1).padStart(7)}  ` +
        `${published.vue[op].toFixed(1).padStart(7)}  ` +
        `${published.react[op].toFixed(1).padStart(7)}  ` +
        `${published.solid[op].toFixed(1).padStart(7)}`
    );
}

console.log('\n* Eisen numbers are estimated by normalizing your hardware against published vanilla.\n');

await browser.close();
server.close();
