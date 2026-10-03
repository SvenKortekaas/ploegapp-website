'use strict';

/**
 * Controleert de gebouwde site (uit/) vóór publicatie. Faalt er iets, dan wordt er niet gepubliceerd.
 *
 * 1. Alleen toegestane bestandssoorten: html, css, png, webp, svg, txt, xml (sitemap). Geen .js, .json, .map enz.,
 *    zodat er nooit code of data van de app in de publieke site terechtkomt.
 * 2. Geen verwijzingen naar andere websites in src, href, url() of @import (behalve mailto:).
 * 3. Elke pagina in Chromium laden: nul verzoeken naar een ander domein, nul cookies, geen
 *    JavaScript-fouten, geen kapotte interne links of afbeeldingen.
 * 4. Geen verboden woorden (bv. echte namen). De lijst komt uit de omgevingsvariabele
 *    VERBODEN_WOORDEN (komma-gescheiden, in CI een GitHub-secret), zodat hij zelf niet publiek is.
 * 5. Elke pagina heeft de Content-Security-Policy en het referrer-beleid uit het sjabloon, en geen
 *    on...=-, style=-attributen, <base> of doorverwijzing. Het enige <script> dat mag, is
 *    gestructureerde gegevens voor zoekmachines (type application/ld+json, geldige JSON).
 * 6. Vindbaarheid (SEO): titel en beschrijving van de goede lengte en uniek, precies één h1, een
 *    canonical-adres, deelgegevens (Open Graph) met een deelafbeelding van 1200×630, elke pagina in
 *    de sitemap, robots.txt verwijst naar de sitemap, de 404-pagina niet in zoekmachines, en
 *    afbeeldingen niet groter dan 250 kB.
 */

const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright-core');

const UIT = path.join(__dirname, '..', 'uit');
const TOEGESTAAN = new Set(['.html', '.css', '.png', '.webp', '.svg', '.txt', '.xml']);
const TOEGESTANE_NAMEN = new Set(['.nojekyll']);
const CSP = "default-src 'none'; img-src 'self'; style-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'";
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp',
  '.svg': 'image/svg+xml', '.txt': 'text/plain', '.xml': 'application/xml',
};
const SITE = 'https://ploegapp.nl/';
const MAX_BEELD = 250 * 1024;

const fouten = [];
const fout = (m) => fouten.push(m);

function alleBestanden(map, basis = map) {
  return fs.readdirSync(map, { withFileTypes: true }).flatMap((e) => {
    const vol = path.join(map, e.name);
    return e.isDirectory() ? alleBestanden(vol, basis) : [path.relative(basis, vol)];
  });
}

function browserOpties() {
  if (process.env.CHROMIUM_PAD) return { executablePath: process.env.CHROMIUM_PAD };
  const lokaal = '/opt/pw-browsers';
  if (fs.existsSync(lokaal)) {
    const map = fs.readdirSync(lokaal).filter((m) => /^chromium-\d+$/.test(m)).sort().pop();
    const exe = map && path.join(lokaal, map, 'chrome-linux', 'chrome');
    if (exe && fs.existsSync(exe)) return { executablePath: exe };
  }
  return { channel: 'chrome' };
}

/** 6. Vindbaarheid (SEO). Lengtes volgens wat Google in de zoekresultaten toont. */
function vindbaarheid(bestanden) {
  const lees = (f) => fs.readFileSync(path.join(UIT, f), 'utf8');
  const meta = (html, sleutel) => html.match(new RegExp(`<meta (?:name|property)="${sleutel.replace(/[.:]/g, '\\$&')}" content="([^"]*)"`))?.[1];
  const decode = (t) => t.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  const sitemap = bestanden.includes('sitemap.xml') ? lees('sitemap.xml') : '';
  if (!sitemap) fout('sitemap.xml ontbreekt');
  if (!/^Sitemap: https:\/\/ploegapp\.nl\/sitemap\.xml$/m.test(bestanden.includes('robots.txt') ? lees('robots.txt') : '')) {
    fout('robots.txt verwijst niet naar de sitemap');
  }
  const gezien = { titel: new Map(), beschrijving: new Map() };
  for (const f of bestanden.filter((x) => x.endsWith('.html'))) {
    const html = lees(f);
    const adres = SITE + (f === 'index.html' ? '' : f);
    if (!/<html lang="nl">/.test(html)) fout(`${f}: <html lang="nl"> ontbreekt`);
    if ((html.match(/<h1[\s>]/g) || []).length !== 1) fout(`${f}: moet precies één <h1> hebben`);
    if (f === '404.html') {
      if (meta(html, 'robots') !== 'noindex') fout(`${f}: moet noindex hebben`);
      if (sitemap.includes(adres)) fout(`${f}: hoort niet in de sitemap`);
      continue;
    }
    const titel = decode(html.match(/<title>([^<]*)<\/title>/)?.[1] || '');
    const beschrijving = decode(meta(html, 'description') || '');
    if (titel.length < 20 || titel.length > 60) fout(`${f}: titel is ${titel.length} tekens (20 tot 60): "${titel}"`);
    if (beschrijving.length < 110 || beschrijving.length > 160) fout(`${f}: beschrijving is ${beschrijving.length} tekens (110 tot 160)`);
    for (const [soort, waarde] of [['titel', titel], ['beschrijving', beschrijving]]) {
      if (gezien[soort].has(waarde)) fout(`${f}: zelfde ${soort} als ${gezien[soort].get(waarde)}`);
      gezien[soort].set(waarde, f);
    }
    if (!html.includes(`<link rel="canonical" href="${adres}">`)) fout(`${f}: canonical moet ${adres} zijn`);
    if (/name="robots" content="[^"]*noindex/.test(html)) fout(`${f}: staat op noindex`);
    if (!sitemap.includes(`<loc>${adres}</loc>`)) fout(`${f}: staat niet in de sitemap`);
    for (const sleutel of ['og:title', 'og:description', 'og:image', 'og:image:alt', 'twitter:card']) {
      if (!meta(html, sleutel)) fout(`${f}: ${sleutel} ontbreekt`);
    }
    const beeld = meta(html, 'og:image') || '';
    const lokaal = beeld.startsWith(SITE) && beeld.slice(SITE.length);
    if (!lokaal || !bestanden.includes(lokaal)) fout(`${f}: deelafbeelding ${beeld} bestaat niet`);
    else {
      const png = fs.readFileSync(path.join(UIT, lokaal));
      if (png.readUInt32BE(16) !== 1200 || png.readUInt32BE(20) !== 630) fout(`${f}: deelafbeelding is niet 1200×630`);
    }
    for (const img of html.match(/<img\b[^>]*>/g) || []) {
      if (!/\swidth="\d+"/.test(img) || !/\sheight="\d+"/.test(img)) fout(`${f}: afbeelding zonder width en height: ${img.slice(0, 80)}`);
    }
  }
  for (const f of bestanden.filter((x) => /\.(png|webp)$/.test(x))) {
    const grootte = fs.statSync(path.join(UIT, f)).size;
    if (grootte > MAX_BEELD) fout(`${f}: ${Math.round(grootte / 1024)} kB, meer dan ${MAX_BEELD / 1024} kB`);
  }
}

async function main() {
  if (!fs.existsSync(UIT)) throw new Error('uit/ bestaat niet: draai eerst `npm run bouw`.');
  const bestanden = alleBestanden(UIT);

  // 1. Bestandssoorten
  for (const f of bestanden) {
    const ext = path.extname(f).toLowerCase();
    if (!TOEGESTAAN.has(ext) && !TOEGESTANE_NAMEN.has(path.basename(f))) fout(`Niet toegestaan bestand: ${f}`);
  }

  // 2. Verwijzingen naar buiten, en 4. verboden woorden
  const verboden = (process.env.VERBODEN_WOORDEN || '').split(',').map((w) => w.trim().toLowerCase()).filter(Boolean);
  for (const f of bestanden.filter((x) => /\.(html|css|svg|txt|xml)$/.test(x))) {
    const tekst = fs.readFileSync(path.join(UIT, f), 'utf8');
    for (const m of tekst.matchAll(/(?:src|href|action|poster|srcset)\s*=\s*["']?([^"'\s>]+)/gi)) {
      const url = m[1];
      if (/^mailto:/i.test(url) || url.startsWith('#')) continue;
      if (/rel="canonical"/.test(m.input.slice(m.index - 30, m.index)) && url.startsWith(SITE)) continue; // eigen adres
      if (/^[a-z][a-z0-9+.-]*:|^\/\//i.test(url)) fout(`${f}: verwijzing naar buiten: ${url}`);
    }
    for (const m of tekst.matchAll(/url\(\s*["']?([^"')]+)|@import\s+["']?([^"';\s]+)/gi)) {
      const url = m[1] || m[2];
      if (/^[a-z][a-z0-9+.-]*:|^\/\//i.test(url) && !url.startsWith('data:')) fout(`${f}: externe bron in CSS: ${url}`);
    }
    // Alleen gestructureerde gegevens (JSON, wordt niet uitgevoerd); elk ander <script> is fout
    const zonderGegevens = tekst.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g, (_, json) => {
      try {
        if (JSON.parse(json)['@context'] !== 'https://schema.org') fout(`${f}: gestructureerde gegevens zonder schema.org`);
      } catch {
        fout(`${f}: gestructureerde gegevens zijn geen geldige JSON`);
      }
      return '';
    });
    if (/<script\b/i.test(zonderGegevens)) fout(`${f}: bevat een <script>`);
    if (/<(iframe|form|object|embed)\b/i.test(tekst)) fout(`${f}: bevat een iframe, formulier of embed`);
    if (f.endsWith('.html')) {
      // De beveiligingsregels uit het sjabloon moeten op elke pagina staan, precies zo
      if (!tekst.includes(`<meta http-equiv="Content-Security-Policy" content="${CSP}">`)) fout(`${f}: Content-Security-Policy ontbreekt of is veranderd`);
      if (!tekst.includes('<meta name="referrer" content="no-referrer">')) fout(`${f}: referrer-beleid ontbreekt`);
      if (/\son[a-z]+\s*=/i.test(tekst)) fout(`${f}: bevat een on...=-attribuut (JavaScript)`);
      if (/\sstyle\s*=/i.test(tekst)) fout(`${f}: bevat een style=-attribuut`);
      if (/<base\b|http-equiv\s*=\s*["']?refresh/i.test(tekst)) fout(`${f}: bevat <base> of een doorverwijzing`);
    }
    const klein = tekst.toLowerCase();
    for (const w of verboden) if (klein.includes(w)) fout(`${f}: bevat een verboden woord (${verboden.indexOf(w) + 1}e uit VERBODEN_WOORDEN)`);
  }

  // 6. Vindbaarheid
  vindbaarheid(bestanden);

  // 3. In de browser
  const server = http.createServer((req, res) => {
    const pad = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/\/$/, '/index.html');
    const vol = path.join(UIT, path.normalize(pad));
    if (!vol.startsWith(UIT) || !fs.existsSync(vol) || fs.statSync(vol).isDirectory()) {
      res.writeHead(404);
      return res.end();
    }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(vol)] || 'application/octet-stream' });
    fs.createReadStream(vol).pipe(res);
  });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  const basis = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch(browserOpties());
  try {
    const paginas = bestanden.filter((f) => f.endsWith('.html'));
    const bezocht = new Set();
    for (const donker of [false, true]) {
      for (const breedte of [390, 1280]) {
        const context = await browser.newContext({ viewport: { width: breedte, height: 900 }, colorScheme: donker ? 'dark' : 'light' });
        for (const f of paginas) {
          const p = await context.newPage();
          const buiten = [];
          p.on('request', (r) => { if (!r.url().startsWith(basis)) buiten.push(r.url()); });
          p.on('response', (r) => { if (r.status() >= 400) fout(`${f}: ${r.status()} voor ${r.url().replace(basis, '')}`); });
          p.on('pageerror', (e) => fout(`${f}: JS-fout ${e.message}`));
          p.on('console', (m) => m.type() === 'error' && fout(`${f}: console ${m.text()}`));
          await p.goto(`${basis}/${f}`, { waitUntil: 'networkidle' });
          // Alle afbeeldingen laden (ook lazy) en controleren
          await p.evaluate(() => document.querySelectorAll('img').forEach((i) => (i.loading = 'eager')));
          await p.waitForLoadState('networkidle');
          // Wachten tot elke afbeelding klaar is (geladen of mislukt), hooguit 10 seconden
          await p.waitForFunction(() => [...document.images].every((i) => i.complete), null, { timeout: 10000 }).catch(() => {});
          const kapot = await p.$$eval('img', (imgs) => imgs.filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.getAttribute('src')));
          for (const k of kapot) fout(`${f}: afbeelding laadt niet: ${k}`);
          const zonderAlt = await p.$$eval('img:not([alt])', (x) => x.length);
          if (zonderAlt) fout(`${f}: ${zonderAlt} afbeelding(en) zonder alt-tekst`);
          // Horizontaal scrollen op de telefoon is een opmaakfout
          if (breedte === 390) {
            const te = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
            if (te > 1) fout(`${f}: ${te}px te breed op een telefoon`);
          }
          if (buiten.length) fout(`${f}: verzoek(en) naar buiten: ${[...new Set(buiten)].join(', ')}`);
          if (await p.evaluate(() => document.cookie)) fout(`${f}: document.cookie is niet leeg`);
          // Interne links bestaan
          if (!bezocht.has(f)) {
            bezocht.add(f);
            const links = await p.$$eval('a[href]', (a) => a.map((x) => x.getAttribute('href')));
            for (const l of links) {
              if (/^(mailto:|#)/.test(l)) continue;
              const doel = l.split('#')[0];
              if (doel && !bestanden.includes(doel)) fout(`${f}: link naar ontbrekende pagina ${l}`);
              const anker = l.split('#')[1];
              if (anker && doel && (await (await fetch(`${basis}/${doel}`)).text()).indexOf(`id="${anker}"`) === -1) fout(`${f}: anker bestaat niet: ${l}`);
            }
          }
          await p.close();
        }
        const koekjes = await context.cookies();
        if (koekjes.length) fout(`Cookies gezet: ${koekjes.map((c) => c.name).join(', ')}`);
        await context.close();
      }
    }
  } finally {
    await browser.close();
    server.close();
  }

  if (fouten.length) {
    for (const f of [...new Set(fouten)]) console.error(`::error::${f}`);
    process.exit(1);
  }
  console.log(`Controle geslaagd: ${bestanden.length} bestanden, geen cookies, geen externe verzoeken, geen scripts.`);
}

main().catch((e) => {
  console.error(`::error::Controle mislukt: ${e.message}`);
  process.exit(1);
});
