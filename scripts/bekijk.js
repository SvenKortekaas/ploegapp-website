'use strict';

// Bekijk de gebouwde site lokaal: npm run bekijk, daarna http://localhost:8080
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');

const UIT = path.join(__dirname, '..', 'uit');
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp',
  '.svg': 'image/svg+xml', '.txt': 'text/plain', '.xml': 'application/xml',
};
const poort = +process.env.PORT || 8080;

http.createServer((req, res) => {
  const pad = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/\/$/, '/index.html');
  const vol = path.join(UIT, path.normalize(pad));
  const bestaat = vol.startsWith(UIT) && fs.existsSync(vol) && !fs.statSync(vol).isDirectory();
  const bestand = bestaat ? vol : path.join(UIT, '404.html');
  res.writeHead(bestaat ? 200 : 404, { 'Content-Type': TYPES[path.extname(bestand)] || 'application/octet-stream' });
  fs.createReadStream(bestand).pipe(res);
}).listen(poort, () => console.log(`Site op http://localhost:${poort}`));
