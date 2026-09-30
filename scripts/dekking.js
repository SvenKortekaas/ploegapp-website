'use strict';

/**
 * Staat elke functie van de app op de site? Leest de kopjes onder "Wat kan het?" in de README van de
 * app (alleen die lijst, niets anders) en vergelijkt ze met inhoud/dekking.json.
 *
 * Ontbreekt er iets, dan schrijft dit script .tmp/dekking.md (voor een GitHub-issue) en geeft het een
 * waarschuwing. De site wordt dan gewoon gepubliceerd: nieuwe screenshots zijn belangrijker dan
 * wachten op nieuwe tekst.
 */

const fs = require('node:fs');
const path = require('node:path');
const { APP_PAD } = require('./voorbeeld');

const WORTEL = path.join(__dirname, '..');
const readme = fs.readFileSync(path.join(APP_PAD, 'README.md'), 'utf8');
const sectie = readme.split(/^## Wat kan het\?\s*$/m)[1]?.split(/^## /m)[0];
if (!sectie) {
  console.log('::warning::Geen "## Wat kan het?" in de README van de app gevonden; dekking niet gecontroleerd.');
  process.exit(0);
}

const functies = [...sectie.matchAll(/^- \*\*(.+?)\*\*/gm)].map((m) => m[1].replace(/:$/, '').trim());
const dekking = JSON.parse(fs.readFileSync(path.join(WORTEL, 'inhoud', 'dekking.json'), 'utf8'));
const ontbreekt = functies.filter((f) => !dekking[f]);

// Wijst elke verwijzing naar een bestaande pagina en een bestaand anker?
const kapot = Object.entries(dekking).filter(([k]) => !k.startsWith('_')).filter(([, doel]) => {
  const [bestand, anker] = doel.split('#');
  const pagina = path.join(WORTEL, 'inhoud', bestand);
  return !fs.existsSync(pagina) || (anker && !fs.readFileSync(pagina, 'utf8').includes(`id="${anker}"`));
});

fs.mkdirSync(path.join(WORTEL, '.tmp'), { recursive: true });
const rapport = path.join(WORTEL, '.tmp', 'dekking.md');
fs.rmSync(rapport, { force: true });

if (kapot.length) {
  for (const [f, doel] of kapot) console.error(`::error::dekking.json: "${f}" wijst naar ${doel}, maar die pagina of dat anker bestaat niet`);
  process.exit(1);
}
if (ontbreekt.length) {
  for (const f of ontbreekt) console.log(`::warning::Nieuwe functie in de app zonder uitleg op de site: ${f}`);
  fs.writeFileSync(rapport, [
    'De app heeft functies die nog niet op de site worden uitgelegd:',
    '',
    ...ontbreekt.map((f) => `- [ ] **${f}**`),
    '',
    'Voeg uitleg toe (meestal in `inhoud/functies.html`) en zet de functie in `inhoud/dekking.json`.',
  ].join('\n'));
} else {
  console.log(`Dekking: alle ${functies.length} functies uit de README staan op de site.`);
}
