'use strict';

// Bekijk de gebouwde site lokaal: npm run bekijk, daarna http://localhost:8080
// De webserver gebruikt controleer.js ook.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp',
  '.svg': 'image/svg+xml', '.txt': 'text/plain', '.xml': 'application/xml',
};

/** Webserver voor de bestanden in map. Onbekend adres: 404, met 404.html als die er is. */
function webserver(map) {
  return http.createServer((req, res) => {
    const pad = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/\/$/, '/index.html');
    const vol = path.join(map, path.normalize(pad));
    const bestaat = vol.startsWith(map) && fs.existsSync(vol) && !fs.statSync(vol).isDirectory();
    const bestand = bestaat ? vol : path.join(map, '404.html');
    if (!fs.existsSync(bestand)) {
      res.writeHead(404);
      return res.end();
    }
    res.writeHead(bestaat ? 200 : 404, { 'Content-Type': TYPES[path.extname(bestand)] || 'application/octet-stream' });
    fs.createReadStream(bestand).pipe(res);
  });
}

if (require.main === module) {
  const poort = +process.env.PORT || 8080;
  webserver(path.join(__dirname, '..', 'uit')).listen(poort, () => console.log(`Site op http://localhost:${poort}`));
}

module.exports = { webserver };
