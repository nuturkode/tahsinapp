import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';

const ROOT = resolve('dist');
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.md': 'text/markdown; charset=utf-8'
};

if (!existsSync(join(ROOT, 'index.html'))) {
  console.error('dist/index.html tidak ditemukan. Jalankan `npm run build` dulu.');
  process.exit(1);
}

createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  let pathname = decodeURIComponent(url.pathname);
  if (pathname.endsWith('/')) pathname += 'index.html';
  const file = normalize(join(ROOT, pathname));
  if (!file.startsWith(ROOT)) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  let target = file;
  if (!existsSync(target) || statSync(target).isDirectory()) target = join(ROOT, 'index.html');
  res.writeHead(200, {
    'Content-Type': MIME[extname(target)] || 'application/octet-stream',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  createReadStream(target).pipe(res);
}).listen(PORT, HOST, () => {
  console.log(`IbadahKu dev server → http://${HOST}:${PORT} (root: ${ROOT})`);
});
