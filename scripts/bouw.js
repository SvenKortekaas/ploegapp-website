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
 *   [[breed naam | onderschrift]]      screenshot van een groot scherm (kazernescherm, indeelbord)
 */

const fs = require('node:fs');
const path = require('node:path');

const WORTEL = path.join(__dirname, '..');
const INHOUD = path.join(WORTEL, 'inhoud');
const SJABLOON = path.join(WORTEL, 'sjabloon');
const BEELDEN = path.join(WORTEL, '.beelden');
const UIT = path.join(WORTEL, 'uit');

const SITE = 'https://ploegapp.nl/';
const CONTACT = 'info@ploegapp.nl';
const adres = (bestand) => SITE + (bestand === 'index.html' ? '' : bestand);
const kaal = (html) => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

/** Gestructureerde gegevens (JSON-LD) voor zoekmachines. Data, geen code: de browser voert het niet uit. */
function gegevens(p, inhoud) {
  const blokken = [];
  if (p.bestand === 'index.html') {
    blokken.push({
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'Ploegapp',
      url: SITE,
      description: p.beschrijving,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web, iOS, Android',
      inLanguage: 'nl',
      image: SITE + 'deelbeeld.png',
      audience: { '@type': 'Audience', audienceType: 'Brandweerploegen en hun planners' },
    }, {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Ploegapp',
      url: SITE,
      email: CONTACT,
      contactPoint: { '@type': 'ContactPoint', email: CONTACT, contactType: 'customer support', availableLanguage: 'nl' },
    });
  }
  // Vragenpagina: elke <details> met <summary> wordt een vraag met antwoord
  const vragen = [...inhoud.matchAll(/<details>\s*<summary>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/g)];
  if (p.bestand === 'vragen.html' && vragen.length) {
    blokken.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: vragen.map(([, v, a]) => ({ '@type': 'Question', name: kaal(v), acceptedAnswer: { '@type': 'Answer', text: kaal(a) } })),
    });
  }
  // < escapen, zodat de tekst nooit het blok kan afsluiten
  return blokken.map((b) => `<script type="application/ld+json">${JSON.stringify(b).replace(/</g, '\\u003c')}</script>\n`).join('');
}

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
    // Afmetingen uit de PNG zelf; telefoonbeelden zijn op dubbele resolutie gemaakt
    const png = fs.readFileSync(bron);
    const schaal = soort === 'telefoon' ? 2 : 1;
    const [b, h] = [png.readUInt32BE(16) / schaal, png.readUInt32BE(20) / schaal];
    const alt = onderschrift || naam;
    return `<figure class="${soort === 'telefoon' ? 'telefoon' : 'tv'}"><div class="scherm"><img src="beelden/${naam}.webp" width="${b}" height="${h}" alt="Screenshot: ${esc(alt)}" loading="lazy" decoding="async"></div>${onderschrift ? `<figcaption>${esc(onderschrift)}</figcaption>` : ''}</figure>`;
  }

  for (const p of paginas) {
    const inhoud = p.tekst.replace(/\[\[(telefoon|breed)\s+([\w-]+)\s*(?:\|\s*([^\]]*?))?\s*\]\]/g, (_, soort, naam, ond) => beeld(soort, naam, ond));
    if (/\[\[/.test(inhoud)) throw new Error(`${p.bestand}: onbekende [[...]]-code`);
    const menuHtml = menu
      .map((m) => `        <li><a href="${m.bestand}"${m.bestand === p.bestand ? ' aria-current="page"' : ''}>${esc(m.menutekst || m.titel)}</a></li>`)
      .join('\n');
    const titel = p.bestand === 'index.html' ? `Ploegapp – ${p.titel}` : `${p.titel} – Ploegapp`;
    const fout404 = p.bestand === '404.html';
    const html = sjabloon
      .replaceAll('{{paginatitel}}', esc(titel))
      .replaceAll('{{deeltitel}}', esc(p.bestand === 'index.html' ? titel : p.titel))
      // De 404-pagina niet in zoekmachines; alle andere pagina's met hun vaste adres
      .replace('{{zoekmachine}}', fout404 ? '<meta name="robots" content="noindex">\n' : `<link rel="canonical" href="${adres(p.bestand)}">\n`)
      .replace('{{gegevens}}', () => gegevens(p, inhoud))
      .replaceAll('{{beschrijving}}', esc(p.beschrijving))
      .replaceAll('{{menu}}', menuHtml)
      .replaceAll('{{bijgewerkt}}', esc(bijgewerkt))
      .replaceAll('{{pad}}', '')
      .replace('{{inhoud}}', () => inhoud.trim());
    fs.writeFileSync(path.join(UIT, p.bestand), html);
  }

  for (const naam of gebruikt) fs.copyFileSync(path.join(BEELDEN, `${naam}.webp`), path.join(UIT, 'beelden', `${naam}.webp`));
  fs.copyFileSync(path.join(BEELDEN, 'deelbeeld.png'), path.join(UIT, 'deelbeeld.png'));

  // Sitemap: alle pagina's behalve de 404
  const urls = paginas.filter((p) => p.bestand !== '404.html').map((p) => `  <url><loc>${adres(p.bestand)}</loc></url>`);
  fs.writeFileSync(path.join(UIT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);
  const ongebruikt = info.beelden.filter((n) => !gebruikt.has(n));
  if (ongebruikt.length) console.log(`Let op: screenshots niet gebruikt op de site: ${ongebruikt.join(', ')}`);

  fs.copyFileSync(path.join(SJABLOON, 'style.css'), path.join(UIT, 'style.css'));
  fs.copyFileSync(path.join(SJABLOON, 'favicon.svg'), path.join(UIT, 'favicon.svg'));
  // Alle zoekmachines en AI-zoekdiensten mogen alles lezen (er staan alleen verzonnen gegevens op)
  fs.writeFileSync(path.join(UIT, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}sitemap.xml\n`);
  fs.writeFileSync(path.join(UIT, '.nojekyll'), '');

  console.log(`Site gebouwd: ${paginas.length} pagina's, ${gebruikt.size} screenshots (bijgewerkt ${bijgewerkt}).`);
}

try {
  main();
} catch (e) {
  console.error(`::error::Bouwen mislukt: ${e.message}`);
  process.exit(1);
}
