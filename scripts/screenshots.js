'use strict';

/**
 * Maakt screenshots van de echte, nieuwste Ploegapp met fictieve gegevens (zie voorbeeld.js).
 * Resultaat: .beelden/*.png (staat in .gitignore; bouw.js zet ze in de site).
 *
 * Elk screenshot faalt hard bij een fout (JavaScript-fout, foutmelding in beeld, onbekend scherm).
 * Dan wordt er niets gepubliceerd en blijft de vorige versie van de site online.
 */

const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');
const { startApp, vul, controleerFictief } = require('./voorbeeld');

const UIT = path.join(__dirname, '..', '.beelden');
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

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

async function main() {
  fs.rmSync(UIT, { recursive: true, force: true });
  fs.mkdirSync(UIT, { recursive: true });

  const app = await startApp();
  // Nederlandse datumvelden (dd-mm-jjjj) in plaats van de Amerikaanse notatie
  const browser = await chromium.launch({ ...browserOpties(), args: ['--lang=nl-NL'], env: { ...process.env, LANG: 'nl_NL.UTF-8', LANGUAGE: 'nl' } });
  const gemaakt = [];
  try {
    const g = await vul(app.basis, app.token);
    await controleerFictief(app.basis, app.token);

    /** Telefoon van een (fictief) lid. Zonder naam: niet ingelogd. */
    async function telefoon(naam, { iphone = false, donker = false, breed = false, opslag = {} } = {}) {
      const context = await browser.newContext({
        locale: 'nl-NL',
        timezoneId: 'Europe/Amsterdam',
        // Telefoon (390 breed, scherp op retina) of een groot scherm (laptop/tv)
        viewport: breed ? { width: 1280, height: 800 } : { width: 390, height: 844 },
        deviceScaleFactor: breed ? 1 : 2,
        isMobile: !breed,
        hasTouch: !breed,
        colorScheme: donker ? 'dark' : 'light',
        userAgent: iphone ? IPHONE : undefined,
        serviceWorkers: 'block',
      });
      const p = await context.newPage();
      const fouten = [];
      p.on('pageerror', (e) => fouten.push(`JS-fout: ${e.message}`));
      p.on('response', (r) => r.status() >= 500 && fouten.push(`Serverfout ${r.status()}`));
      p.on('dialog', (d) => d.dismiss());
      p.fouten = fouten;
      if (naam) {
        // Installatievraag al "gezien", behalve waar we hem juist willen laten zien
        if (!iphone) await context.addInitScript(() => { try { localStorage.setItem('geinstalleerd', '1'); } catch {} });
        // Voorkeuren die de app op het toestel onthoudt (bijv. de weergave van het indelen)
        await context.addInitScript((o) => { try { for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v); } catch {} }, opslag);
        await p.goto(`${app.basis}/?t=${g.leden[naam].token}`);
        await p.waitForSelector('#tabbalk:not([hidden])');
        await p.waitForLoadState('networkidle');
        if (!iphone) await p.evaluate(() => document.getElementById('installeer')?.remove());
      }
      return p;
    }

    async function ga(p, hash, wachtOp) {
      await p.evaluate((h) => (location.hash = h), hash);
      await p.waitForTimeout(150);
      await p.waitForLoadState('networkidle');
      if (wachtOp) await p.waitForSelector(wachtOp, { state: 'attached' });
    }

    /** Screenshot van wat er op het scherm staat; optioneel eerst naar een element scrollen. */
    async function foto(p, naam, { scroll } = {}) {
      if (scroll) {
        await p.$eval(scroll, (el) => el.scrollIntoView({ block: 'start' }));
        await p.waitForTimeout(100);
      }
      await p.evaluate(() => { const m = document.getElementById('melding'); if (m) m.hidden = true; });
      const fout = await p.$('#melding.fout:not([hidden])');
      if (fout) throw new Error(`${naam}: foutmelding in beeld`);
      if (p.fouten.length) throw new Error(`${naam}: ${p.fouten.join('; ')}`);
      await p.screenshot({ path: path.join(UIT, `${naam}.png`), animations: 'disabled', caret: 'hide' });
      gemaakt.push(naam);
    }

    const { komend, varen } = g.avonden;
    const kaartMet = (tekst) => `.kaart:has-text("${tekst}")`;

    // --- Lid (Bas, chauffeur)
    {
      const p = await telefoon('Bas');
      await p.waitForSelector(`.stem[data-avond="${varen}"]`);
      await foto(p, 'lid-overzicht');
      await ga(p, `#/avond/${komend}`, '.kaart.uitgelicht');
      await foto(p, 'lid-indeling');
      await ga(p, `#/avond/${varen}`, '.stem');
      await foto(p, 'lid-avond-reageren');
      // De maand met de meeste oefenavonden en afwezigheid in beeld
      await ga(p, `#/rooster/${g.maand}`, '#app');
      await foto(p, 'lid-rooster');
      await ga(p, '#/ik', '#app .kaart');
      await foto(p, 'lid-ik');
      await foto(p, 'lid-mijn-oefeningen', { scroll: kaartMet('Mijn oefeningen') });
      await ga(p, '#/meldingen', '#app');
      await foto(p, 'lid-meldingen');
      await p.context().close();
    }

    // --- Lid in donkere modus
    {
      const p = await telefoon('Eva', { donker: true });
      await p.waitForSelector('.kaart');
      await foto(p, 'lid-donker');
      await p.context().close();
    }

    // --- Installatievraag op een iPhone
    {
      const p = await telefoon('Fleur', { iphone: true });
      await p.waitForSelector('#installeer');
      await foto(p, 'installeren');
      await p.context().close();
    }

    // --- Oefenleider (Gijs) bij de vaaroefening
    {
      const p = await telefoon('Gijs');
      await ga(p, `#/avond/${varen}`, '.leider-regel');
      await foto(p, 'oefenleider', { scroll: '.oefening' });
      await p.context().close();
    }

    // --- Planner (Jeroen)
    {
      const p = await telefoon('Jeroen');
      await p.waitForSelector('.kaart');
      await ga(p, `#/avond/${varen}`, '.oefening');
      await foto(p, 'planner-bezetting');
      await ga(p, `#/avond/${komend}/indeling`, '#auto');
      await foto(p, 'planner-indeling');
      await ga(p, `#/avond/${komend}`, '.oefening');
      await foto(p, 'planner-voorbereiding', { scroll: '.voorbereiding' });
      await ga(p, '#/beheer/plannen', '#avond-form');
      // Half ingevuld, zoals een planner hem ziet tijdens het plannen
      await p.fill('input[name="datum"]', g.nieuweDatum);
      await p.fill('.oef-blok input[name="onderwerp"]', 'Brand in een schuur');
      await p.locator('.oef-blok label', { hasText: '99-4531' }).locator('input[name="voertuig"]').check();
      await foto(p, 'planner-plannen');
      await ga(p, '#/eerder', '.kaart');
      const vorige = await p.$eval('a[href$="/presentie"], a[href^="#/avond/"]', (a) => a.getAttribute('href').match(/\d+/)[0]);
      await ga(p, `#/avond/${vorige}/presentie`, '#opslaan');
      await foto(p, 'planner-presentie');
      await ga(p, '#/beheer/onderwerpen', '#onderwerp-lijsten .onderwerp-rij');
      await foto(p, 'planner-onderwerpen');
      // Als laatste: na het aanvinken vraagt de app bij weggaan of je je invoer kwijt wilt
      await ga(p, '#/beheer/importeren', '#sjabloon');
      await p.check('#sjabloon input[name="vakantie"]');
      await p.waitForLoadState('networkidle');
      await foto(p, 'planner-jaarplanning');
      await p.context().close();
    }

    // --- Indeelbord op een groot scherm
    {
      const p = await telefoon('Jeroen', { breed: true, opslag: { 'indeling-weergave': 'bord' } });
      await ga(p, `#/avond/${komend}/indeling`, '.bord-samenvatting');
      await foto(p, 'planner-bord');
      await p.context().close();
    }

    // --- Beheerder (Karin)
    {
      const p = await telefoon('Karin');
      await ga(p, '#/beheer/presentie', '#jaar');
      await foto(p, 'beheer-oefenuren');
      await ga(p, '#/beheer/voertuigen', '#beheer form');
      await foto(p, 'beheer-voertuigen');
      await ga(p, '#/beheer/functies', '#beheer');
      await foto(p, 'beheer-functies');
      await ga(p, '#/beheer/leden', '#nieuw-lid');
      // Links versturen: wie heeft zijn link al, wie is ingelogd
      // Twee links "op een andere manier gegeven" afvinken, zodat alle drie de standen te zien zijn
      for (const naam of ['Anouk', 'Chris']) {
        await p.locator('#links-versturen li', { hasText: naam }).locator('[data-verstuurd]').check();
        await p.waitForLoadState('networkidle');
      }
      await foto(p, 'beheer-links', { scroll: '#links-versturen' });
      // Leden uit Excel plakken (verzonnen namen), eerst controleren
      await p.locator('#leden-import summary').click();
      await p.fill('#leden-plak', 'Roepnaam\tPloeg\tFuncties\tRol\nTom\tPloeg 1\tCH\t\nWillem\tPloeg 2\t\t\nYara\tPloeg 2\tBV, CH\tplanner');
      await p.click('#leden-controleer');
      await p.waitForSelector('#leden-controle :is(table, .kaart, ul, p)');
      await foto(p, 'beheer-leden-import', { scroll: '#leden-import' });
      await ga(p, '#/beheer/instellingen', '#inst');
      await foto(p, 'beheer-instellingen');
      await p.context().close();
    }

    // --- Kazernescherm (tv): vanavond groot in beeld, en het overzicht van de komende avonden
    for (const [naam, weergave] of [['kazernescherm', ''], ['kazernescherm-overzicht', 'overzicht']]) {
      const context = await browser.newContext({ locale: 'nl-NL', timezoneId: 'Europe/Amsterdam', viewport: { width: 1280, height: 720 } });
      const p = await context.newPage();
      p.fouten = [];
      p.on('pageerror', (e) => p.fouten.push(e.message));
      await p.goto(`${app.basis}/kazerne?k=${encodeURIComponent(g.kazerneSleutel)}${weergave ? `&weergave=${weergave}` : ''}`);
      await p.waitForLoadState('networkidle');
      await p.waitForTimeout(300);
      if (p.fouten.length) throw new Error(`${naam}: ${p.fouten.join('; ')}`);
      await p.screenshot({ path: path.join(UIT, `${naam}.png`), animations: 'disabled' });
      gemaakt.push(naam);
      await context.close();
    }

    fs.writeFileSync(path.join(UIT, 'gemaakt.json'), JSON.stringify({ datum: new Date().toISOString(), beelden: gemaakt }, null, 2));
    console.log(`${gemaakt.length} screenshots gemaakt.`);
  } finally {
    await browser.close();
    app.stop();
  }
}

main().catch((e) => {
  // Alleen de melding; geen app-log of broncode in het (publieke) CI-log
  console.error(`::error::Screenshots mislukt: ${e.message.split('\n')[0]}`);
  if (process.env.DEBUG) console.error(e);
  process.exit(1);
});
