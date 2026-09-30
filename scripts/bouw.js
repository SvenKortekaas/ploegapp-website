'use strict';

/**
 * Bouwt de statische site in uit/ uit inhoud/*.html, sjabloon/ en de screenshots in .beelden/.
 * Geen afhankelijkheden, geen JavaScript in de site.
 *
 * Een inhoudspagina begint met een kopblok:
 *   <!--
 *   titel: Functies
 *   beschrijving: Eén zin voor zoekmachines
 *   menu: 3              (volgorde in het menu; weglaten = niet in het menu)
 *   menutekst: Functies  (optioneel, anders de titel)
 *   -->
 * In de tekst:
 *   [[telefoon naam | onderschrift]]   screenshot in een telefoonrand (.beelden/naam.png)
 *   [[tv naam | onderschrift]]         breed screenshot (kazernescherm)
 */

const fs = require('node:fs');
const path = require('node:path');

const WORTEL = path.join(__dirname, '..');
const INHOUD = path.join(WORTEL, 'inhoud');
const SJABLOON = path.join(WORTEL, 'sjabloon');
const BEELDEN = path.join(WORTEL, '.beelden');
const UIT = path.join(WORTEL, 'uit');

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function leesPagina(bestand) {
  const bron = fs.readFileSync(path.join(INHOUD, bestand), 'utf8');
  const m = bron.match(/^<!--([\s\S]*?)-->\s*/);
  if (!m) throw new Error(`${bestand}: kopblok ontbreekt`);
  const kop = Object.fromEntries(
    m[1].split('\n').map((r) => r.match(/^\s*([a-z]+):\s*(.*?)\s*$/)).filter(Boolean).map((r) => [r[1], r[2]])
  );
  if (!kop.titel || !kop.beschrijving) throw new Error(`${bestand}: titel en beschrijving zijn verplicht`);
  return { bestand, ...kop, menu: kop.menu ? +kop.menu : null, tekst: bron.slice(m[0].length) };
}

function main() {
  const gemaakt = path.join(BEELDEN, 'gemaakt.json');
  if (!fs.existsSync(gemaakt)) throw new Error('Geen screenshots gevonden: draai eerst `npm run screenshots`.');
  const info = JSON.parse(fs.readFileSync(gemaakt, 'utf8'));
  const bijgewerkt = new Date(info.datum).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Amsterdam' });

  fs.rmSync(UIT, { recursive: true, force: true });
  fs.mkdirSync(path.join(UIT, 'beelden'), { recursive: true });

  const sjabloon = fs.readFileSync(path.join(SJABLOON, 'pagina.html'), 'utf8');
  const paginas = fs.readdirSync(INHOUD).filter((f) => f.endsWith('.html')).sort().map(leesPagina);
  const menu = paginas.filter((p) => p.menu !== null).sort((a, b) => a.menu - b.menu);
  const gebruikt = new Set();

  function beeld(soort, naam, onderschrift) {
    const bron = path.join(BEELDEN, `${naam}.png`);
    if (!fs.existsSync(bron)) throw new Error(`Screenshot "${naam}" bestaat niet (wordt gemaakt in scripts/screenshots.js)`);
    gebruikt.add(naam);
    const [b, h] = soort === 'tv' ? [1280, 720] : [390, 844];
    const alt = onderschrift || naam;
    return `<figure class="${soort}"><div class="scherm"><img src="beelden/${naam}.png" width="${b}" height="${h}" alt="Screenshot: ${esc(alt)}" loading="lazy" decoding="async"></div>${onderschrift ? `<figcaption>${esc(onderschrift)}</figcaption>` : ''}</figure>`;
  }

  for (const p of paginas) {
    const inhoud = p.tekst.replace(/\[\[(telefoon|tv)\s+([\w-]+)\s*(?:\|\s*([^\]]*?))?\s*\]\]/g, (_, soort, naam, ond) => beeld(soort, naam, ond));
    if (/\[\[/.test(inhoud)) throw new Error(`${p.bestand}: onbekende [[...]]-code`);
    const menuHtml = menu
      .map((m) => `        <li><a href="${m.bestand}"${m.bestand === p.bestand ? ' aria-current="page"' : ''}>${esc(m.menutekst || m.titel)}</a></li>`)
      .join('\n');
    const titel = p.bestand === 'index.html' ? `Ploegapp – ${p.titel}` : `${p.titel} – Ploegapp`;
    const html = sjabloon
      .replaceAll('{{paginatitel}}', esc(titel))
      .replaceAll('{{beschrijving}}', esc(p.beschrijving))
      .replaceAll('{{menu}}', menuHtml)
      .replaceAll('{{bijgewerkt}}', esc(bijgewerkt))
      .replaceAll('{{pad}}', '')
      .replace('{{inhoud}}', () => inhoud.trim());
    fs.writeFileSync(path.join(UIT, p.bestand), html);
  }

  for (const naam of gebruikt) fs.copyFileSync(path.join(BEELDEN, `${naam}.png`), path.join(UIT, 'beelden', `${naam}.png`));
  const ongebruikt = info.beelden.filter((n) => !gebruikt.has(n));
  if (ongebruikt.length) console.log(`Let op: screenshots niet gebruikt op de site: ${ongebruikt.join(', ')}`);

  fs.copyFileSync(path.join(SJABLOON, 'style.css'), path.join(UIT, 'style.css'));
  fs.copyFileSync(path.join(SJABLOON, 'favicon.svg'), path.join(UIT, 'favicon.svg'));
  fs.writeFileSync(path.join(UIT, 'robots.txt'), 'User-agent: *\nAllow: /\n');
  fs.writeFileSync(path.join(UIT, '.nojekyll'), '');

  console.log(`Site gebouwd: ${paginas.length} pagina's, ${gebruikt.size} screenshots (bijgewerkt ${bijgewerkt}).`);
}

try {
  main();
} catch (e) {
  console.error(`::error::Bouwen mislukt: ${e.message}`);
  process.exit(1);
}
