# ploegapp.nl

De voorlichtingssite van **Ploegapp**: wat de app is, wat hij kan en hoe je hem gebruikt, met
screenshots van de nieuwste versie.

- **Bijwerken op verzoek.** Bij elke push naar `main`, of handmatig (Actions → "Site bouwen en
  publiceren" → Run workflow), haalt GitHub Actions de nieuwste app op, start die met een lege
  database, vult hem met verzonnen gegevens en maakt nieuwe screenshots. Er zijn geen geplande runs
  (scheelt Actions-minuten).
- **Alleen verzonnen gegevens.** Het korps "Brandweer Duinwijk" en alle namen zijn verzonnen
  (`scripts/voorbeeld.js`). Het screenshotscript stopt als er iets anders in de database staat.
- **Geen app-code in deze repo.** De app is privé en blijft dat. Hij staat alleen tijdelijk op de
  runner (`app/`, in `.gitignore`), en de workflow faalt als er ooit app-bestanden in deze repo staan.
  De gepubliceerde site bevat alleen html, css, afbeeldingen (png, webp, svg), txt en de sitemap (xml).
- **Geen cookies, trackers of externe diensten.** Geen JavaScript op de site (alleen gestructureerde gegevens voor zoekmachines, die niet worden uitgevoerd). `scripts/controleer.js`
  laadt elke pagina in Chromium en keurt de site af bij een cookie, andere opslag op het apparaat
  (localStorage, sessionStorage, IndexedDB, service worker), script of verzoek naar buiten.

## Opbouw

| Map / bestand | Wat |
|---|---|
| `inhoud/*.html` | De tekst van de pagina's. `[[telefoon naam \| onderschrift]]` zet een screenshot in een telefoonrand. |
| `inhoud/dekking.json` | Welke functie van de app op welke pagina staat. |
| `sjabloon/` | Paginasjabloon, opmaak en icoon |
| `scripts/voorbeeld.js` | Start de app en vult hem met verzonnen gegevens (via de gewone API) |
| `scripts/screenshots.js` | Maakt de screenshots (Playwright) |
| `scripts/browser.js` | Welke Chromium de screenshots en de controle gebruiken |
| `scripts/bouw.js` | Bouwt de site in `uit/` |
| `scripts/controleer.js` | Privacy- en kwaliteitscontrole vóór publicatie |
| `scripts/controleer.test.js` | Test dat die controle echt afkeurt (`npm test`, ook in de workflow) |
| `scripts/workflows.test.js` | Test de beveiligingsregels van de workflows (`npm test`) |
| `scripts/dekking.js` | Nieuwe functie in de README van de app zonder uitleg hier? Dan komt er een issue. |

## Tekst aanpassen

Pas een bestand in `inhoud/` aan en push naar `main`; de site wordt binnen een paar minuten opnieuw
gepubliceerd. Een nieuw screenshot voeg je toe in `scripts/screenshots.js`.

Een pagina begint met een kopblok:

```html
<!--
titel: Functies
beschrijving: Eén zin voor zoekmachines
menu: 3          (volgorde in het menu; weglaten = niet in het menu)
menutekst: Functies
-->
```

Gebruik geen `style="..."` of `<script>`: de Content-Security-Policy blokkeert ze en de controle faalt.

## Lokaal draaien

Node.js 22.5 of nieuwer en een checkout van de app ernaast:

```bash
npm ci
APP_PAD=../ploegapp npm run alles   # screenshots, bouwen, controleren
npm test                            # werkt de privacycontrole zelf nog?
npm run bekijk                      # http://localhost:8080
```

De app zelf heeft zijn eigen afhankelijkheden nodig (`npm ci --omit=dev` in de app-map).

## Eenmalig instellen

1. **Alleen-lezen token voor de app.** GitHub → Settings → Developer settings → Personal access tokens →
   *Fine-grained tokens* → *Generate new token*:
   - Repository access: *Only select repositories* → `ploegapp`
   - Permissions → Repository permissions → **Contents: Read-only** (verder niets)
   - Vervaldatum: bijvoorbeeld een jaar. Twee weken voor de vervaldatum opent de workflow vanzelf
     een issue "Token PLOEGAPP_LEES_TOKEN vernieuwen".

   Zet hem in deze repo onder Settings → Secrets and variables → Actions → *New repository secret*,
   met de naam `PLOEGAPP_LEES_TOKEN`.
   Zet **hetzelfde token** ook onder Settings → Secrets and variables → **Dependabot**, met dezelfde
   naam. Runs van Dependabot krijgen de gewone secrets niet; zonder deze kopie falen de controles op
   de pull requests van Dependabot meteen bij "Token aanwezig?".
2. **Optioneel: verboden woorden.** Secret `VERBODEN_WOORDEN` met komma-gescheiden woorden die nooit
   op de site mogen staan (bijvoorbeeld echte namen of de echte korpsnaam). De controle keurt de site
   dan af als een van die woorden erin staat. Het staat in een secret, zodat de lijst zelf niet publiek is.
3. **GitHub Pages aanzetten.** Settings → Pages → Build and deployment → Source: **GitHub Actions**.
4. **Eigen domein.** Settings → Pages → Custom domain: `ploegapp.nl`, daarna *Enforce HTTPS* aanvinken
   zodra dat kan. DNS bij de domeinregistrar:

   | Naam | Type | Waarde |
   |---|---|---|
   | `@` | A | `185.199.108.153` |
   | `@` | A | `185.199.109.153` |
   | `@` | A | `185.199.110.153` |
   | `@` | A | `185.199.111.153` |
   | `@` | AAAA | `2606:50c0:8000::153` |
   | `@` | AAAA | `2606:50c0:8001::153` |
   | `@` | AAAA | `2606:50c0:8002::153` |
   | `@` | AAAA | `2606:50c0:8003::153` |
   | `www` | CNAME | `svenkortekaas.github.io` |

   Laat de records van de app (de subdomeinen van de korpsen) staan zoals ze zijn. Aanrader: verifieer het domein
   in je GitHub-account (Settings → Pages → *Add a domain*), zodat niemand anders het kan claimen.
5. **Beveiligingsinstellingen van de repo** (eenmalig):
   - Settings → Actions → General → *Workflow permissions*: **Read repository contents** en
     *Allow GitHub Actions to create and approve pull requests* uit.
   - Settings → Actions → General → *Actions permissions*: **Require actions to be pinned to a
     full-length commit SHA** aan.
   - Settings → Rules → Rulesets → *New branch ruleset* voor `main`: **Restrict deletions** en
     **Block force pushes** aan (direct pushen blijft mogelijk).
   - Settings → Advanced Security: **Dependabot alerts**, **Dependabot security updates**,
     **Secret Protection** met **Push protection**, en **Private vulnerability reporting** aan.
   - Je GitHub-account: tweestapsverificatie aan (met een passkey of app, niet sms).
6. **Domein beveiligen** (bij Cloud86, de DNS-beheerder):
   - **DNSSEC** aanzetten, zodat niemand valse DNS-antwoorden voor `ploegapp.nl` kan geven.
   - Het domein **verifiëren in GitHub** (stap 4), zodat niemand anders het op GitHub Pages kan
     gebruiken.

## Beveiliging

De site is statisch: geen server, geen database, geen formulieren, geen JavaScript, geen cookies.
Er valt op de site zelf niets in te breken of te stelen. Het risico zit in hoe hij gemaakt en
gepubliceerd wordt; daarvoor:

- **Op elke pagina** een Content-Security-Policy (alleen eigen afbeeldingen, opmaak en bestanden van de site zelf, verder niets)
  en `no-referrer`. `scripts/controleer.js` keurt de site af als die ontbreken of veranderd zijn, en
  bij `<script>`, `on...=`, `style=`, `<base>`, formulieren, iframes, externe bronnen, cookies of
  andere opslag op het apparaat.
- **Workflows met zo min mogelijk rechten.** De job die de app en npm-pakketten draait, mag alleen
  lezen en houdt geen token vast (`persist-credentials: false`). Een issue maken gebeurt in een
  aparte job zonder vreemde code. Alleen `main` mag publiceren.
- **Geen installatiescripts** van npm-pakketten (`npm ci --ignore-scripts`).
- **Acties vastgepind op een commit**, niet op een versienummer dat iemand kan verplaatsen.
  Dependabot (`.github/dependabot.yml`) houdt ze en `playwright-core` wekelijks actueel, met een
  week wachttijd na elke nieuwe versie.
- **CodeQL** (`.github/workflows/codeql.yml`) scant de workflows en scripts bij elke push en elke
  maandag; bevindingen staan onder Security → Code scanning.
- **Beveiligingsscans** (`.github/workflows/beveiliging.yml`) bij elke push en elke maandag:
  gitleaks zoekt geheimen in de hele git-historie, `npm audit` lekken met ernst hoog of kritiek in
  de npm-pakketten (ook die van Lighthouse). Publiceren wacht hierop. Rood door `npm audit`? Dan
  `npm audit fix` (voor Lighthouse met `--prefix .github/lighthouse`).
- **`scripts/workflows.test.js`** (`npm test`) bewaakt de regels hierboven: acties vast op een
  commit, bovenaan alleen leesrechten, geen token in checkout, publiceren wacht op de scans.
- **Nooit een controle uitzetten, overslaan of een melding wegmoffelen** om groen te worden. Een
  melding oplossen, of alleen bij een aangetoond vals alarm die ene melding onderdrukken, met de
  reden erbij.

Wat niet kan op GitHub Pages: eigen HTTP-headers (zoals HSTS en `frame-ancestors`). Zonder
formulieren of inlog is dat hier geen echt risico.

## Vindbaarheid (SEO)

`scripts/bouw.js` geeft elke pagina vanzelf wat zoekmachines en deelvoorbeelden nodig hebben:

- een vast adres (`canonical`), Open Graph-gegevens en een deelafbeelding van 1200×630
  (`deelbeeld.png`, elke build opnieuw gemaakt met het nieuwste screenshot);
- een favicon in de hoofdmap: `favicon.svg` (het logo van de app), `favicon-96.png` voor browsers
  zonder SVG en `apple-touch-icon.png` (180×180) voor het beginscherm van een iPhone. De PNG's staan
  in `sjabloon/` en zijn gemaakt uit `favicon.svg`; verandert het logo, maak ze dan opnieuw;
- gestructureerde gegevens (JSON-LD): de app en het contactadres op de voorpagina, en de vragen
  en antwoorden van `vragen.html` (elke `<details>` met `<summary>` wordt een vraag);
- `sitemap.xml` met alle pagina's, en `robots.txt` die ernaar verwijst. Alle zoekmachines en
  AI-zoekdiensten mogen de site lezen; de 404-pagina staat op `noindex`.

Screenshots staan als WebP op de site (ongeveer de helft van PNG).

**Zo blijft het goed:** `scripts/controleer.js` keurt de site af bij een titel van meer dan 60 of
een beschrijving van meer dan 160 tekens (of te kort, of dubbel), niet precies één `h1`, een
ontbrekend canonical-adres of Open Graph-gegeven, een pagina die niet in de sitemap staat, ongeldige
gestructureerde gegevens of een afbeelding boven 250 kB. Elke maandag meet
`.github/workflows/lighthouse.yml` de live site met Lighthouse: vindbaarheid, toegankelijkheid en
goede praktijken moeten 100 zijn, snelheid minimaal 90. Lukt dat niet, dan wordt de workflow rood en
krijg je een mail van GitHub.

Een nieuwe pagina: kies een titel (zonder " – Ploegapp", komt er vanzelf achter) van hooguit 49
tekens en een beschrijving van 120 tot 155 tekens met de woorden waarop mensen zoeken.

## Contact

Het contactadres `info@ploegapp.nl` staat in de voettekst van elke pagina, onder *Over deze site* en
bij de vragen. Het staat ook in `scripts/bouw.js` (gestructureerde gegevens).

## Privacy van deze site

GitHub Pages ontvangt bij een bezoek technisch het IP-adres van de bezoeker en bewaart dat tijdelijk
in logbestanden. Dat staat eerlijk op de pagina *Over deze site*. De site zelf verzamelt niets.
