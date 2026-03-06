#!/usr/bin/env node
import http from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const exampleEntry = 'example/index.html';
const port = Number(process.env.PORT ?? 5173);

const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.map': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.ico': 'image/x-icon',
    '.wasm': 'application/wasm',
};

function resolveRequestPath(requestUrl) {
    const url = new URL(requestUrl, 'http://localhost');
    let pathname = decodeURIComponent(url.pathname);

    let normalized = pathname.replace(/^\/+/, '');
    if (normalized === '') {
        normalized = exampleEntry;
    } else if (!normalized.startsWith('example/') && !normalized.startsWith('dist/')) {
        normalized = path.posix.join('example', normalized);
    }

    const candidate = path.normalize(path.join(projectRoot, normalized));
    if (!candidate.startsWith(projectRoot)) {
        throw Object.assign(new Error('Forbidden'), { statusCode: 403 });
    }

    return candidate;
}

async function readFileSafely(filePath) {
    try {
        const stats = await fs.stat(filePath);
        if (stats.isDirectory()) {
            const indexPath = path.join(filePath, 'index.html');
            return readFileSafely(indexPath);
        }

        const data = await fs.readFile(filePath);
        return { data, filePath };
    } catch (error) {
        if (error.code === 'ENOENT') {
            throw Object.assign(new Error('Not Found'), { statusCode: 404 });
        }
        throw Object.assign(error, { statusCode: error.statusCode ?? 500 });
    }
}

const server = http.createServer(async (req, res) => {
    try {
        const filePath = resolveRequestPath(req.url ?? '/');
        const { data, filePath: resolvedPath } = await readFileSafely(filePath);
        const ext = path.extname(resolvedPath).toLowerCase();
        const type = mimeTypes[ext] ?? 'application/octet-stream';

        res.writeHead(200, {
            'Content-Type': type,
            'Cache-Control': 'no-store',
        });
        res.end(data);
    } catch (error) {
        const statusCode = error.statusCode ?? 500;
        if (statusCode >= 500) {
            console.error('[example-server] error serving request:', error);
        }
        res.statusCode = statusCode;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end(statusCode === 404 ? 'Not Found' : 'Internal Server Error');
    }
});

server.listen(port, () => {
    console.log(`Example server available at http://localhost:${port}`);
    console.log('Serving example/index.html with access to the local dist output. Press Ctrl+C to stop.');
});
