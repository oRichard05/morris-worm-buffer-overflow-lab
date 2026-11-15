import http from 'node:http';
import { execFile } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(root, 'web');
const port = Number(process.env.PORT || 4173);
const host = '127.0.0.1';
const binaries = {
  vulnerable: path.join(root, 'lab', 'vulnerable'),
  patched: path.join(root, 'lab', 'patched')
};

function respond(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(JSON.stringify(data));
}

function parseOutput(stdout, mode) {
  const lines = Object.fromEntries(stdout.trim().split(/\r?\n/).map(line => {
    const pos = line.indexOf(':');
    return pos === -1 ? [line, ''] : [line.slice(0, pos), line.slice(pos + 1).trim()];
  }));
  const memory = (lines.MEMORY || '').split(' ').filter(Boolean);
  if (memory.length !== 24 || memory.some(byte => !/^[0-9A-F]{2}$/.test(byte))) {
    throw new Error('Unexpected output from the C program.');
  }
  return {
    mode,
    status: lines.STATUS || 'ACCEPTED',
    name: lines.NAME || '',
    next: lines.NEXT || '',
    flow: lines.FLOW || '',
    memory,
    stdout: stdout.trim()
  };
}

function executeDemo(mode, name) {
  return new Promise((resolve, reject) => {
    execFile(binaries[mode], [name], {
      cwd: path.join(root, 'lab'),
      timeout: 1500,
      maxBuffer: 16 * 1024,
      windowsHide: true
    }, (error, stdout, stderr) => {
      if (error) {
        const reason = stderr.trim() || (error.signal
          ? `process stopped with signal ${error.signal}`
          : `process exited with code ${error.code}`);
        return reject(new Error(`C demonstration stopped: ${reason}`));
      }
      try { resolve(parseOutput(stdout, mode)); }
      catch (parseError) { reject(parseError); }
    });
  });
}

const pages = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']]
]);

const server = http.createServer(async (req, res) => {
  res.setHeader('Content-Security-Policy', "default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
  if (req.method === 'GET' && req.url === '/api/health') {
    respond(res, 200, { ready: Object.values(binaries).every(existsSync) });
    return;
  }

  if (req.method === 'POST' && req.url === '/api/run') {
    let body = '';
    try {
      for await (const chunk of req) {
        body += chunk;
        if (body.length > 1024) {
          respond(res, 413, { error: 'Request is too large.' });
          return;
        }
      }
      const input = JSON.parse(body);
      if (!input || !Object.hasOwn(binaries, input.mode) ||
          typeof input.name !== 'string' || !/^[A-Za-z0-9_-]{1,22}$/.test(input.name)) {
        respond(res, 400, { error: 'Use 1–22 ASCII letters, numbers, _ or -.' });
        return;
      }
      if (!existsSync(binaries[input.mode])) {
        respond(res, 503, { error: 'C programs are not compiled. Run npm run build:lab first.' });
        return;
      }
      respond(res, 200, await executeDemo(input.mode, input.name));
    } catch (error) {
      respond(res, error instanceof SyntaxError ? 400 : 500, { error: error.message });
    }
    return;
  }

  if (req.method === 'GET' && pages.has(req.url)) {
    const [filename, type] = pages.get(req.url);
    try {
      const bytes = readFileSync(path.join(publicDir, filename));
      res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache' });
      res.end(bytes);
    } catch {
      respond(res, 500, { error: 'Failed to load a page resource.' });
    }
    return;
  }
  respond(res, 404, { error: 'Not found.' });
});

server.listen(port, host, () => {
  console.log(`Morris Lab ready at http://${host}:${port}`);
  if (!Object.values(binaries).every(existsSync)) {
    console.log('Compile the C programs first: npm run build:lab');
  }
});
