import http from 'node:http';
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {resolve, sep} from 'node:path';
import api from './server/api.js';

const publicRoot = resolve('public');
const musicRoot = resolve('music');
const dataRoot = resolve(process.env.DATA_DIR || './data');
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.webp':'image/webp','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.mp3':'audio/mpeg'};
const env = {
  RSVP_SHEETS_WEBHOOK: process.env.RSVP_SHEETS_WEBHOOK,
  TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY,
  BUCKET: { async put(key, value) {
    const path = resolve(dataRoot, key);
    if (!path.startsWith(dataRoot + sep)) throw Error('Invalid backup path');
    await mkdir(resolve(path, '..'), {recursive:true});
    await writeFile(path, value, {mode:0o600});
  }}
};

const server = http.createServer(async (req, res) => {
  try {
    const host = req.headers.host || 'localhost';
    const origin = process.env.PUBLIC_ORIGIN || 'http://' + host;
    const url = new URL(req.url, origin);
    if (url.pathname === '/api/rsvp' && req.method === 'POST') {
      const parts = []; let size = 0;
      for await (const part of req) {
        size += part.length;
        if (size > 10000) {res.writeHead(413); res.end('Too large'); return;}
        parts.push(part);
      }
      const request = new Request(url, {method:'POST', headers:req.headers, body:Buffer.concat(parts)});
      const response = await api.fetch(request, env);
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
      return;
    }
    if (!['GET','HEAD'].includes(req.method)) {res.writeHead(405);res.end();return;}
    const musicRequest = url.pathname.startsWith('/music/');
    const root = musicRequest ? musicRoot : publicRoot;
    const pathname = musicRequest ? url.pathname.slice('/music'.length) : (url.pathname === '/' ? '/index.html' : url.pathname);
    let decoded;
    try { decoded = decodeURIComponent(pathname); }
    catch { res.writeHead(400); res.end('Bad request'); return; }
    const path = resolve(root, '.' + decoded);
    if (path !== root && !path.startsWith(root + sep)) {res.writeHead(403);res.end();return;}
    const bytes = await readFile(path);
    const extension = path.slice(path.lastIndexOf('.'));
    res.writeHead(200, {'Content-Type':types[extension] || 'application/octet-stream', 'X-Content-Type-Options':'nosniff'});
    res.end(req.method === 'HEAD' ? undefined : bytes);
  } catch (error) {
    res.writeHead(error.code === 'ENOENT' ? 404 : 500);
    res.end(error.code === 'ENOENT' ? 'Not found' : 'Server error');
  }
});
server.listen(Number(process.env.PORT || 3000), '0.0.0.0', () => console.log('Wedding site listening on port ' + (process.env.PORT || 3000)));
