#!/usr/bin/env node
import http from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const port = 8080;

const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
};

const server = http.createServer(async (req, res) => {
    let pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (pathname === '/') pathname = '/index.html';

    // Serve /css/currentStyle.css as an empty file (we don't have the benchmark CSS locally)
    if (pathname.startsWith('/css/')) {
        res.writeHead(200, { 'Content-Type': 'text/css' });
        res.end('');
        return;
    }

    const filePath = path.join(__dirname, pathname);
    try {
        const data = await fs.readFile(filePath);
        const ext = path.extname(filePath);
        res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
        res.end(data);
    } catch {
        res.writeHead(404);
        res.end('Not Found');
    }
});

server.listen(port, () => console.log(`Benchmark at http://localhost:${port}`));
