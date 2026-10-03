'use strict';

/**
 * Meet de live site met Lighthouse (het meetprogramma van Google), pagina voor pagina uit de sitemap.
 * Faalt als vindbaarheid (SEO), toegankelijkheid of goede praktijken onder de 100 komt, of snelheid
 * onder de 90. Draait elke week in .github/workflows/lighthouse.yml.
 *
 * Lokaal: LIGHTHOUSE=pad/naar/lighthouse node scripts/lighthouse.js [https://ploegapp.nl/]
 */

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const SITE = process.argv[2] || 'https://ploegapp.nl/';
const MINIMUM = { seo: 100, accessibility: 100, 'best-practices': 100, performance: 90 };
const NAAM = { seo: 'vindbaarheid', accessibility: 'toegankelijkheid', 'best-practices': 'goede praktijken', performance: 'snelheid' };

async function main() {
  const sitemap = await (await fetch(new URL('sitemap.xml', SITE))).text();
  const paginas = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace('https://ploegapp.nl/', SITE));
  if (!paginas.length) throw new Error('Geen pagina\'s in de sitemap gevonden.');
  const map = fs.mkdtempSync(path.join(os.tmpdir(), 'lighthouse-'));
  const fouten = [];
  for (const [i, url] of paginas.entries()) {
    for (const vorm of ['mobile', 'desktop']) {
      const uit = path.join(map, `${i}-${vorm}.json`);
      execFileSync(process.env.LIGHTHOUSE || 'lighthouse', [
        url, '--quiet', '--output=json', `--output-path=${uit}`, '--chrome-flags=--headless=new --no-sandbox',
        `--only-categories=${Object.keys(MINIMUM).join(',')}`, ...(vorm === 'desktop' ? ['--preset=desktop'] : []),
      ], { stdio: ['ignore', 'ignore', 'inherit'] });
      const r = JSON.parse(fs.readFileSync(uit, 'utf8'));
      const scores = Object.fromEntries(Object.keys(MINIMUM).map((c) => [c, Math.round((r.categories[c]?.score ?? 0) * 100)]));
      console.log(`${url} (${vorm}): ${Object.entries(scores).map(([c, s]) => `${NAAM[c]} ${s}`).join(', ')}`);
      for (const [c, s] of Object.entries(scores)) {
        if (s >= MINIMUM[c]) continue;
        // Welke onderdelen niet slaagden, zodat je weet wat je moet aanpassen
        const mis = r.categories[c].auditRefs.map((a) => r.audits[a.id])
          .filter((a) => a.score !== null && a.score < 1 && a.scoreDisplayMode !== 'informative' && a.scoreDisplayMode !== 'manual')
          .map((a) => a.title);
        fouten.push(`${url} (${vorm}): ${NAAM[c]} ${s}, minimaal ${MINIMUM[c]}. ${mis.slice(0, 5).join('; ')}`);
      }
    }
  }
  fs.rmSync(map, { recursive: true, force: true });
  if (fouten.length) {
    for (const f of fouten) console.error(`::error::${f}`);
    process.exit(1);
  }
  console.log(`Lighthouse geslaagd: ${paginas.length} pagina's, telefoon en computer.`);
}

main().catch((e) => {
  console.error(`::error::Lighthouse mislukt: ${e.message}`);
  process.exit(1);
});
