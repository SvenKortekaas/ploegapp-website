'use strict';

/**
 * Start de echte Ploegapp op een tijdelijke, lege database en vult die via de gewone API met
 * FICTIEVE gegevens: een verzonnen korps, verzonnen roepnamen en verzonnen oefeningen.
 *
 * De app staat nooit in deze repo: hij wordt tijdens het bouwen opgehaald in APP_PAD (standaard
 * .app/, staat in .gitignore). Echte gegevens kunnen hier niet in terechtkomen: de database wordt
 * hier zelf aangemaakt in een tijdelijke map, en `controleerFictief` weigert door te gaan als er
 * iets anders in staat dan wat dit script zelf heeft toegevoegd.
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');

const APP_PAD = path.resolve(process.env.APP_PAD || path.join(__dirname, '..', '.app'));

// ---------- de fictieve gegevens ----------

const KORPS = 'Brandweer Duinwijk';
const BASE_URL = 'https://ploeg.duinwijk.example'; // .example is gereserveerd: bestaat gegarandeerd niet
const BEHEERDER = 'Karin';

// Alleen roepnamen, zoals de app ook aanraadt. [naam, ploeg, functies, rol]
const LEDEN = [
  ['Jeroen', 1, ['BV'], 'planner'],
  ['Anouk', 1, ['BV']],
  ['Bas', 1, ['CH']],
  ['Chris', 1, ['CH']],
  ['Dirk', 1, []],
  ['Eva', 1, []],
  ['Fleur', 1, []],
  ['Gijs', 1, ['SCH']],
  ['Hanna', 1, []],
  ['Ivo', 1, []],
  ['Jesse', 2, ['BV']],
  ['Kim', 2, ['CH']],
  ['Lars', 2, ['CH']],
  ['Mila', 2, ['SCH']],
  ['Niels', 2, []],
  ['Olga', 2, []],
  ['Pim', 2, []],
  ['Roos', 2, []],
  ['Sem', 2, []],
];
const ALLE_NAMEN = [BEHEERDER, ...LEDEN.map((l) => l[0])];

const dag = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString('sv-SE', { timeZone: 'Europe/Amsterdam' });
};

// ---------- de app starten ----------

function vrijePoort() {
  return new Promise((ok, fout) => {
    const s = net.createServer();
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => ok(port));
    });
    s.on('error', fout);
  });
}

/** Start de app. De uitvoer van de app gaat naar een logbestand, niet naar het (publieke) CI-log. */
async function startApp() {
  if (!fs.existsSync(path.join(APP_PAD, 'server.js'))) {
    throw new Error(`De app staat niet in ${APP_PAD}. Zet APP_PAD naar een checkout van ploegapp.`);
  }
  const map = fs.mkdtempSync(path.join(os.tmpdir(), 'ploegapp-voorbeeld-'));
  const dbPad = path.join(map, 'voorbeeld.db');
  const log = path.join(map, 'app.log');
  const poort = await vrijePoort();
  const uit = fs.openSync(log, 'w');
  const proces = spawn(process.execPath, ['--no-warnings', 'server.js'], {
    cwd: APP_PAD,
    env: {
      PATH: process.env.PATH,
      SCHOOLVAKANTIES_OFFLINE: '1', // geen verbinding naar buiten: de meegeleverde kopie
      HOME: map,
      TZ: 'Europe/Amsterdam',
      PORT: String(poort),
      BASE_URL,
      DB_PAD: dbPad,
      ORGANISATIE_NAAM: KORPS,
      BEHEERDER_NAAM: BEHEERDER,
      AANTAL_PLOEGEN: '2',
      SJABLOON: 'brandweer',
      VAPID_SUBJECT: 'mailto:beheer@duinwijk.example',
    },
    stdio: ['ignore', uit, uit],
  });
  const stop = () => {
    proces.kill();
    fs.rmSync(map, { recursive: true, force: true });
  };
  process.on('exit', () => proces.kill());

  // Wachten tot de inloglink van de eerste beheerder in het logbestand staat
  const basis = `http://127.0.0.1:${poort}`;
  for (let i = 0; i < 100; i++) {
    const m = fs.readFileSync(log, 'utf8').match(/\?t=([\w-]+)/);
    if (m) {
      const r = await fetch(`${basis}/gezond`).catch(() => null);
      if (r?.ok) return { basis, token: m[1], stop };
    }
    if (proces.exitCode !== null) break;
    await new Promise((r) => setTimeout(r, 100));
  }
  stop();
  throw new Error('De app startte niet. Draai lokaal met dezelfde APP_PAD om te zien waarom (het log blijft bewust uit het CI-log).');
}

// ---------- vullen via de API ----------

function apiVan(basis, token) {
  return async (pad, methode = 'GET', body) => {
    const r = await fetch(`${basis}/api${pad}`, {
      method: methode,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = r.status === 204 ? null : await r.json();
    if (!r.ok) throw new Error(`${methode} ${pad}: ${r.status} ${data?.fout || ''}`);
    return data;
  };
}

async function vul(basis, beheerToken) {
  const api = apiVan(basis, beheerToken);
  const ik = await api('/ik');
  const functie = Object.fromEntries(ik.functies.map((f) => [f.afkorting, f.id]));
  const ploegen = ik.ploegen.map((p) => p.id).sort((a, b) => a - b);

  // Leden
  const leden = { [BEHEERDER]: { id: ik.lid.id, token: beheerToken } };
  await api(`/leden/${ik.lid.id}`, 'PUT', { naam: BEHEERDER, ploeg_id: ploegen[0], rol: 'beheerder', actief: true, functie_ids: [functie.BV] });
  for (const [naam, ploeg, functies, rol = 'lid'] of LEDEN) {
    const l = await api('/leden', 'POST', { naam, ploeg_id: ploegen[ploeg - 1], rol, actief: true, functie_ids: functies.map((f) => functie[f]) });
    leden[naam] = { id: l.id, token: new URL(l.link).searchParams.get('t') };
  }
  const id = (naam) => leden[naam].id;

  // Voertuigen: de tankautospuit uit het sjabloon, plus een boot
  const voertuigen = await api('/voertuigen');
  const ts = voertuigen.find((v) => v.soort === 'voertuig');
  await api(`/voertuigen/${ts.id}`, 'PUT', { roepnummer: '99-4531', omschrijving: 'Eerste tankautospuit' });
  await api('/voertuigen', 'POST', {
    naam: 'Tankautospuit', roepnummer: '99-4532', omschrijving: 'Tweede tankautospuit',
    plaatsen: { [functie.BV]: 1, [functie.CH]: 1, [functie.MS]: 4 },
  });
  await api('/voertuigen', 'POST', {
    naam: 'Reddingsboot', roepnummer: 'RB-1', soort: 'vaartuig', vervoer: 'lopend',
    plaatsen: { [functie.SCH]: 1 }, overig: 2, omschrijving: 'Ligt in de haven naast de kazerne',
  });
  await api('/voertuigen', 'POST', {
    naam: 'Motorspuitaanhanger', roepnummer: 'MSA', soort: 'aanhanger', trekker_id: ts.id, omschrijving: 'Voor waterwinning op afstand',
  });
  const alle = await api('/voertuigen');
  const boot = alle.find((v) => v.roepnummer === 'RB-1');
  const ts2 = alle.find((v) => v.roepnummer === '99-4532');
  const msa = alle.find((v) => v.roepnummer === 'MSA');

  await api('/instellingen', 'PUT', {
    standaard_locatie: 'Kazerne Duinwijk',
    kazerne_aan: true,
    kazerne_namen: true,
    kazerne_kop: 'Oefenavond Duinwijk',
  });

  // Oefenavonden
  const allePloegen = ploegen;
  const plan = (datum, oefeningen, extra = {}) =>
    api('/avonden', 'POST', { titel: '', datum, start: '19:30', eind: '21:30', locatie: 'Kazerne Duinwijk', ploeg_ids: allePloegen, melden: false, oefeningen, ...extra });

  const ademlucht = (leider) => ({
    onderwerp: 'Ademlucht binnenbrand', voertuig_ids: [ts.id], oefenleider_ids: leider ? [id(leider)] : [],
    links: [{ titel: 'Draaiboek ademlucht', url: 'https://duinwijk.example/draaiboek-ademlucht.pdf' }],
  });
  const beknelling = (leider) => ({
    onderwerp: 'Hulpverlening beknelling', voertuig_ids: [ts2.id], oefenleider_ids: leider ? [id(leider)] : [],
  });

  // Iedereen die bij een avond hoort, antwoordt; zo zijn de bezettingskleuren voorspelbaar
  const antwoorden = async (avond, lijst) => {
    for (const [naam, status, opmerking] of lijst) {
      await api(`/avonden/${avond.id}/antwoord`, 'PUT', { lid_id: id(naam), status, opmerking });
    }
  };
  const ja = (namen) => namen.map((n) => [n, 'ja']);

  // Twee afgelopen avonden met indeling en presentie: oefenuren en eerlijke rotatie
  for (const [n, namen] of [
    [-21, ['Jeroen', 'Anouk', 'Bas', 'Chris', 'Dirk', 'Eva', 'Fleur', 'Gijs', 'Hanna', 'Jesse', 'Kim', 'Lars', 'Niels', 'Olga', 'Pim']],
    [-7, ['Karin', 'Anouk', 'Bas', 'Chris', 'Eva', 'Fleur', 'Gijs', 'Ivo', 'Jesse', 'Kim', 'Lars', 'Mila', 'Olga', 'Roos', 'Sem']],
  ]) {
    const a = await plan(dag(n), [ademlucht(), beknelling()]);
    await antwoorden(a, ja(namen));
    const ingedeeld = await api(`/avonden/${a.id}/indeling/automatisch`, 'POST', {});
    await api(`/avonden/${a.id}/publiceer`, 'POST', { melden: false });
    await api(`/avonden/${a.id}/presentie`, 'PUT', {
      // Iedereen die ja zei was er, behalve Olga (kwam toch niet)
      rijen: ingedeeld.deelnemers
        .filter((d) => d.status === 'ja')
        .map((d) => ({ lid_id: d.lid_id, aanwezig: d.lid_id !== id('Olga'), oefening_id: d.indeling?.oefening_id })),
    });
  }

  // Vanavond: ingedeeld en gepubliceerd (het kazernescherm toont dan de avond groot)
  const vanavond = await plan(dag(0), [
    { onderwerp: 'Binnenbrand woning', voertuig_ids: [ts.id], oefenleider_ids: [id('Jesse')] },
    { onderwerp: 'Verkeersongeval', voertuig_ids: [ts2.id] },
  ]);
  await antwoorden(vanavond, [
    ...ja(['Karin', 'Anouk', 'Chris', 'Dirk', 'Eva', 'Fleur', 'Gijs', 'Hanna', 'Ivo', 'Jeroen', 'Kim', 'Lars', 'Niels', 'Roos']),
    ['Bas', 'nee'], ['Mila', 'nee'],
  ]);
  await api(`/avonden/${vanavond.id}/indeling/automatisch`, 'POST', {});
  await api(`/avonden/${vanavond.id}/publiceer`, 'POST', { melden: false });

  // Over 4 dagen: goed bezet, ingedeeld en gepubliceerd (met melding: die staat op de meldingenpagina)
  const komend = await plan(dag(4), [ademlucht('Jeroen'), beknelling('Anouk')], { melden: true });
  await antwoorden(komend, [
    ...ja(['Karin', 'Bas', 'Chris', 'Dirk', 'Fleur', 'Gijs', 'Hanna', 'Ivo', 'Jesse', 'Kim', 'Lars', 'Niels', 'Pim', 'Sem']),
    ['Eva', 'ja', 'Iets later, rond 19:45'],
    ['Mila', 'misschien', 'Afhankelijk van mijn dienst'],
    ['Olga', 'nee'],
  ]);
  await api(`/avonden/${komend.id}/indeling/automatisch`, 'POST', {});
  await api(`/avonden/${komend.id}/publiceer`, 'POST', {});
  // Voorbereiding: twee van de standaardpunten afgevinkt, één eigen punt erbij
  {
    const a = await api(`/avonden/${komend.id}`);
    const oef = a.oefeningen.find((o) => o.naam === 'Ademlucht binnenbrand');
    for (const v of (oef.voorbereiding || []).slice(0, 2)) await api(`/voorbereiding/${v.id}`, 'PUT', { gedaan: true });
    await api(`/oefeningen/${oef.id}/voorbereiding`, 'POST', { tekst: 'Rookmachine lenen bij de buurpost' });
  }

  // Over 11 dagen: varen en pompen, nog niet iedereen heeft gereageerd (Bas nog niet)
  const varen = await plan(dag(11), [
    { onderwerp: 'Varen en redden uit het water', voertuig_ids: [boot.id], oefenleider_ids: [id('Gijs')] },
    { onderwerp: 'Pompbediening en waterwinning', voertuig_ids: [msa.id] }, // de TS trekt de MSA
  ], { melden: true });
  await antwoorden(varen, [
    ...ja(['Jeroen', 'Anouk', 'Chris', 'Gijs', 'Hanna', 'Ivo', 'Mila', 'Niels', 'Olga']),
    ['Fleur', 'misschien'], ['Lars', 'misschien'], ['Roos', 'misschien'],
    ['Eva', 'nee'], ['Pim', 'nee'],
  ]);

  // Over 18 dagen: net gepland, nog weinig reacties
  const gs = await plan(dag(18), [{ onderwerp: 'Gevaarlijke stoffen', voertuig_ids: [ts.id], oefenleider_ids: [id('Jesse')] }], { melden: true });
  await antwoorden(gs, [...ja(['Jesse', 'Anouk', 'Hanna']), ['Kim', 'misschien']]);

  // Afwezigheid (zonder reden: die vraagt de app bewust niet)
  await api('/afwezigheid', 'POST', { lid_id: id('Dirk'), van: dag(8), tot: dag(22) });
  await api('/afwezigheid', 'POST', { lid_id: id('Kim'), van: dag(10), tot: dag(13) });
  // Drukke dagen: vier leden van ploeg 1 tegelijk weg (de standaardgrens is drie)
  for (const naam of ['Eva', 'Hanna', 'Fleur']) await api('/afwezigheid', 'POST', { lid_id: id(naam), van: dag(15), tot: dag(17) });

  const inst = await api('/instellingen');
  return { maand: dag(11).slice(0, 7), nieuweDatum: dag(25), leden, avonden: { vanavond: vanavond.id, komend: komend.id, varen: varen.id, gs: gs.id }, kazerneSleutel: inst.kazerne_sleutel };
}

/** Vangnet: alleen doorgaan als er uitsluitend fictieve gegevens in de app staan. */
async function controleerFictief(basis, beheerToken) {
  const api = apiVan(basis, beheerToken);
  const namen = (await api('/leden')).map((l) => l.naam);
  const vreemd = namen.filter((n) => !ALLE_NAMEN.includes(n));
  if (vreemd.length || namen.length !== ALLE_NAMEN.length) {
    throw new Error(`Onverwachte leden in de voorbeelddatabase (${vreemd.length} onbekend); gestopt.`);
  }
  const ik = await api('/ik');
  if (ik.organisatie_naam !== KORPS) throw new Error('Onverwachte organisatienaam; gestopt.');
  if (!new URL(basis).hostname.match(/^(127\.0\.0\.1|localhost)$/)) throw new Error('Screenshots alleen van een lokaal gestarte app.');
}

module.exports = { startApp, vul, controleerFictief, KORPS, ALLE_NAMEN, BASE_URL, APP_PAD };
