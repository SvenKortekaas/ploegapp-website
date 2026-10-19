'use strict';

// Welke Chromium Playwright start; gebruikt door screenshots.js en controleer.js.
const fs = require('node:fs');
const path = require('node:path');

/** CHROMIUM_PAD, anders de browsers van een Claude-sessie (/opt/pw-browsers), anders Chrome. */
function browserOpties() {
  if (process.env.CHROMIUM_PAD) return { executablePath: process.env.CHROMIUM_PAD };
  const lokaal = '/opt/pw-browsers';
  if (fs.existsSync(lokaal)) {
    const map = fs.readdirSync(lokaal).filter((m) => /^chromium-\d+$/.test(m)).sort().pop();
    const exe = map && path.join(lokaal, map, 'chrome-linux', 'chrome');
    if (exe && fs.existsSync(exe)) return { executablePath: exe };
  }
  return { channel: 'chrome' }; // staat standaard op de GitHub-runners
}

module.exports = { browserOpties };
