import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const base = path.resolve('work/web-preview');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json' };
http.createServer((req, res) => {
  try {
    const target = path.resolve(base, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
    if (target !== base && !target.startsWith(base + path.sep)) { res.writeHead(403); res.end(); return; }
    const file = fs.existsSync(target) && fs.statSync(target).isFile() ? target : path.join(base, 'index.html');
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] ?? 'application/octet-stream' });
    const stream = fs.createReadStream(file);
    stream.on('error', () => { res.end('Anteprima in aggiornamento. Ricarica la pagina.'); });
    stream.pipe(res);
  } catch { res.writeHead(400); res.end(); }
}).listen(8088, '127.0.0.1', () => process.stdout.write('Demo preview: http://127.0.0.1:8088\n'));
