'use strict';

// Bewaakt de afspraken voor de workflows (README, "Beveiliging"): acties vast op een commit, bovenaan
// alleen leesrechten, checkout houdt geen token vast, en publiceren wacht op de beveiligingsscans.
// Draait met npm test (ook in de workflow).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const map = path.join(__dirname, '..', '.github', 'workflows');
const workflows = fs.readdirSync(map).filter((f) => /\.ya?ml$/.test(f))
  .map((f) => ({ naam: f, regels: fs.readFileSync(path.join(map, f), 'utf8').split(/\r?\n/) }));

test('elke action staat vast op een commit (40 tekens), niet op een tak of tag', () => {
  for (const { naam, regels } of workflows) {
    regels.forEach((r, i) => {
      const m = r.match(/^\s*-?\s*uses:\s*([^\s#]+)/);
      if (!m || m[1].startsWith('./')) return;
      assert.match(m[1], /@[0-9a-f]{40}$/, `${naam}:${i + 1}: ${m[1]} staat niet vast op een commit`);
    });
  }
});

test('elke workflow beperkt het token bovenaan tot lezen; checkout bewaart het token niet', () => {
  for (const { naam, regels } of workflows) {
    assert.match(regels.join('\n'), /^permissions:\s*\n\s+contents: read\s*$/m, `${naam}: zet bovenaan permissions: contents: read`);
    regels.forEach((r, i) => {
      if (!/uses:\s*actions\/checkout@/.test(r)) return;
      // De opties van deze stap: de regels tot de volgende stap
      const eind = regels.findIndex((s, k) => k > i && /^\s*- /.test(s));
      const stap = regels.slice(i, eind < 0 ? undefined : eind);
      assert.ok(stap.some((s) => /persist-credentials: false/.test(s)), `${naam}:${i + 1}: checkout zonder persist-credentials: false`);
    });
  }
});

test('publiceren wacht op de beveiligingsscans', () => {
  const site = workflows.find((w) => w.naam === 'site.yml').regels.join('\n');
  assert.match(site, /uses: \.\/\.github\/workflows\/beveiliging\.yml/);
  assert.match(site, /publiceren:[\s\S]*?needs: \[[^\]]*\bbeveiliging\b[^\]]*\]/);
});
