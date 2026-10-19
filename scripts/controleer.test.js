'use strict';

// Werkt de privacycontrole zelf nog? Een mini-site met alles wat niet mag, moet worden afgekeurd.
// Draait met npm test (ook in de workflow, vóór de screenshots).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

test('controleer.js keurt script, style=, externe bron, cookie en verboden woord af', () => {
  const map = fs.mkdtempSync(path.join(os.tmpdir(), 'controle-'));
  try {
    fs.writeFileSync(path.join(map, 'index.html'), `<!doctype html><html lang="nl"><head><title>Test</title></head>
<body><h1 style="color:red">Testgeheim</h1><img src="https://ploegapp.invalid/x.png" alt="x">
<script>document.cookie = 'volg=1';</script></body></html>`);
    const r = spawnSync(process.execPath, [path.join(__dirname, 'controleer.js'), map], {
      encoding: 'utf8',
      env: { ...process.env, VERBODEN_WOORDEN: 'testgeheim' },
    });
    assert.equal(r.status, 1, r.stdout + r.stderr);
    for (const melding of [
      'bevat een <script>',
      'bevat een style=-attribuut',
      'verwijzing naar buiten: https://ploegapp.invalid/x.png',
      'Content-Security-Policy ontbreekt',
      'document.cookie is niet leeg',
      'verzoek(en) naar buiten',
      'bevat een verboden woord',
    ]) {
      assert.ok(r.stderr.includes(melding), `melding ontbreekt: "${melding}"\n${r.stderr}`);
    }
  } finally {
    fs.rmSync(map, { recursive: true, force: true });
  }
});
