// Tiny static server for local preview: node scripts/serve.mjs [port]
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../site');
const port = +process.argv[2] || 4173;
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain', '.xml': 'application/xml' };
http.createServer((req, res) => {
  if (req.url.startsWith('/v1/') || req.url === '/health') { // preview: proxy to a local `wrangler dev` if running, else answer like an idle arena
    const pr = http.request({ host: '127.0.0.1', port: +process.env.API_PORT || 8787, path: req.url, method: req.method, headers: req.headers }, (r) => { res.writeHead(r.statusCode, r.headers); r.pipe(res); });
    pr.on('error', () => { res.writeHead(req.url.startsWith('/v1/public/lobby') ? 200 : 503, { 'content-type': 'application/json' }); res.end(req.url.startsWith('/v1/public/lobby') ? '{"live":[],"open":[],"recent":[],"preview":true}' : '{"error":"arena_offline_in_static_preview"}'); }); req.pipe(pr); return;
  }
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  let f = path.join(root, p);
  if (!f.startsWith(root)) { res.writeHead(403).end(); return; }
  if (!fs.existsSync(f) && fs.existsSync(f + '.html')) f += '.html';
  if (!fs.existsSync(f)) { res.writeHead(404, { 'content-type': types['.html'] }); res.end(fs.existsSync(path.join(root, '404.html')) ? fs.readFileSync(path.join(root, '404.html')) : 'Not found'); return; }
  res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
}).listen(port, () => console.log('http://localhost:' + port));
