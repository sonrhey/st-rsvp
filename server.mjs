import http from 'node:http';
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {resolve, sep} from 'node:path';
import api from './server/api.js';

const publicRoot = resolve('public');
const dataRoot = resolve(process.env.DATA_DIR || './data');
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.webp':'image/webp'};
const env = {
  RSVP_SHEETS_WEBHOOK: process.env.RSVP_SHEETS_WEBHOOK,
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
    const path = resolve(publicRoot, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
    if (!path.startsWith(publicRoot + sep)) {res.writeHead(403);res.end();return;}
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
