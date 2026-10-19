# Stand van zaken

Overdracht voor wie (mens of Claude) verder werkt aan ploegapp.nl. Lees eerst `CLAUDE.md` en `README.md`.

## Wat er staat

- **Live**: https://ploegapp.nl (GitHub Pages, eigen domein, HTTPS afgedwongen). `www` en `http`
  sturen door.
- **Elke dag** (03:17, 09:41 en 15:23 UTC) en bij elke push naar `main`: nieuwste app ophalen, screenshots met
  verzonnen gegevens (Brandweer Duinwijk), bouwen, controleren, publiceren. Handmatig: Actions →
  "Site bouwen en publiceren" → Run workflow.
- **Secrets** in deze repo: `PLOEGAPP_LEES_TOKEN` (alleen-lezen op de app-repo, Contents: read).
  Optioneel `VERBODEN_WOORDEN`. Het token verloopt: vernieuwen voor de vervaldatum.
- **Pages-omgeving** `github-pages`: alleen `main` mag publiceren.
- **Dekking**: `inhoud/dekking.json` koppelt elke functie uit "Wat kan de app?" in de README van de
  app aan een plek op de site. Ontbreekt er iets, dan komt er een issue.
- **Sessielinks**: nergens toegestaan; bewaakt door `.githooks/commit-msg` en
  `.github/workflows/sessielinks.yml` (zie `CLAUDE.md`).

## Afspraken met de eigenaar

- Alleen in deze repo werken; **niets veranderen in de repo `ploegapp`** (de app). Die alleen lezen.
- Nooit code van de app in deze publieke repo; alleen verzonnen namen en gegevens.
- Geen cookies, trackers, scripts of externe bronnen op de site.

## Open punten

- [x] Oude branch `claude/pensive-darwin-579y9z` verwijderen (eigenaar, via GitHub).
- [x] Oude workflowruns 1 t/m 6 verwijderen (bevatten oude commitberichten).
- [x] GitHub Support vragen om cached views en losse oude commits van deze repo te wissen.
- [x] Geplande runs draaien. Sinds 2 oktober elke dag 3 geplande runs, alle geslaagd (nagekeken op
      5 oktober). GitHub start ze wel 3 tot 6 uur later dan gepland: de run van 03:17 UTC komt rond
      09:00-10:00, die van 09:41 rond 14:00-16:00, die van 15:23 rond 18:30-20:00. Dat is normaal bij
      GitHub en geen probleem: de site krijgt elke dag verse screenshots.
- [ ] Secret `PLOEGAPP_LEES_TOKEN` ook als **Dependabot-secret** zetten (eigenaar; README stap 1).
      Daarna de open pull requests van Dependabot laten hercontroleren en mergen als ze groen zijn.
- [ ] Beveiligingsinstellingen van de repo en het account zetten (eigenaar; README, "Eenmalig instellen" stap 5).
- [ ] DNSSEC aanzetten bij Cloud86 en het domein verifiëren in GitHub (eigenaar; stap 6). Stand
      1 oktober: geen DNSSEC, en `_github-pages-challenge-svenkortekaas.ploegapp.nl` heeft geen TXT-record.
- [ ] Mail van `ploegapp.nl` nakijken (eigenaar; hoort bij de app, niet bij de site): het MX-record
      wijst naar `ploegapp.nl` zelf, dus naar GitHub Pages, en het SPF-record (`+a +mx`) staat daardoor
      de servers van GitHub toe als afzender. Waarschijnlijk hoort er alleen `ip4:45.82.189.150` in.

## Cookies, tracking en toestemming (16 oktober nagekeken, nog uit te voeren)

Getoetst aan de Telecommunicatiewet art. 11.7a (ePrivacy) en de AVG. Uitkomst voor de site: **in
orde, geen banner nodig.** Geen cookies, geen `localStorage`/`sessionStorage`/IndexedDB, geen
service worker, geen JavaScript (alleen gestructureerde gegevens die niet worden uitgevoerd), geen
scripts, fonts, iframes of verzoeken naar derden (CSP `'self'`); contact via een mailto-link.
GitHub Pages ziet als webserver het IP-adres; dat staat al op *Over deze site*. Niets eerder
verzameld dat verwijderd moet worden. (De app is apart getoetst: ook geen banner nodig.)

Goedgekeurd om nog te doen (alleen deze repo):
- [ ] `CLAUDE.md`: sectie "Privacy en toestemming": geen cookies, opslag op het apparaat,
      tracking, analytics of iets van derden (scripts, fonts, iframes, embeds, pixels, CDN's);
      CSP blijft `'self'`. Komt er ooit iets bij, dan eerst toetsen aan de cookieregels; een
      banner alleen als hij aan alle regels voldoet (weigeren even makkelijk als accepteren,
      niets laden vóór de keuze, keuzes per doel, intrekken altijd mogelijk, nee is nee, geen
      cookiemuur, toestemming vastleggen, B1-taal, Sec-GPC respecteren). Let op: een eerdere
      wijziging aan `CLAUDE.md` werd door de toestemmingscontrole van de sessie geweigerd; zo
      nodig voegt de eigenaar de tekst zelf toe.
- [ ] `scripts/controleer.js`: naast cookies en verzoeken naar buiten ook afkeuren als na het
      laden `localStorage`, `sessionStorage` of IndexedDB iets bevat, of als er een service worker
      is. Zo is de testregel "bij gewoon gebruik geen verzoeken naar derden of onnodige opslag"
      bij elke build afgedwongen.
- [ ] Privacytekst op *Privacy* en *Over deze site* (B1): "Ploegapp gebruikt geen cookies en
      volgt je niet. Op je telefoon bewaart de app alleen wat nodig is om te werken: je
      inlogsleutel en een paar keuzes die je zelf maakt, zoals welke ploeg je in het rooster
      ziet. Daarom vragen we geen toestemming en zie je geen cookiemelding. Er gaat niets naar
      advertentie- of analysebedrijven." Voor de site zelf: "Deze website bewaart niets op je
      apparaat."

Voor de app (andere repo, hier alleen genoteerd): `CLAUDE.md`-sectie, een e2e-test met een vaste
lijst toegestane opslagsleutels en alleen verzoeken naar de eigen server, bij de meldingenvraag
"Niet meer vragen" even zichtbaar als "Later", en verwerkersovereenkomsten met Fly.io en de
back-upopslag nagaan (AVG).

## Vindbaarheid (3 oktober)

Canonical, Open Graph met deelafbeelding, gestructureerde gegevens, sitemap, WebP-afbeeldingen;
titels en beschrijvingen herschreven. Lighthouse lokaal: 100 op vindbaarheid, toegankelijkheid,
goede praktijken en snelheid, op alle pagina's. Bewaakt door `controleer.js` en wekelijks Lighthouse
(README, "Vindbaarheid").

## Beveiliging (1 oktober nagekeken)

Statische site zonder scripts, cookies of formulieren; HTTPS afgedwongen, `http` en `www` sturen
door, geen `.git` of andere verborgen bestanden gepubliceerd. Workflows aangescherpt (minimale
rechten, acties vastgepind, geen installatiescripts) en bewaakt door CodeQL en Dependabot; zie
README, "Beveiliging". Bij een wijziging aan workflows of sjabloon: deze maatregelen niet verzwakken.
- [ ] Mail voor `info@ploegapp.nl` regelen bij Cloud86 (eigenaar). Het adres staat op de site, maar
      het MX-record van `ploegapp.nl` wijst naar `ploegapp.nl` zelf (GitHub Pages): mail komt nu nergens aan.
- [ ] Google Search Console en Bing Webmaster Tools: domein `ploegapp.nl` toevoegen (verifiëren met een
      TXT-record bij Cloud86) en `https://ploegapp.nl/sitemap.xml` insturen (eigenaar).

## Audit (Ponytail)

Eerste audit op 19 oktober (hele repo). Beveiligingspunten staan hier bewust niet (publieke repo).
Vink een punt af na de fix. Volgorde: must, should, nice.

- [ ] **must** `.github/workflows/claude-code-review.yml`: draait op elke pull request, ook die van
      Dependabot. Dependabot-runs krijgen alleen Dependabot-secrets, dus `CLAUDE_CODE_OAUTH_TOKEN`
      ontbreekt en elke Dependabot-PR krijgt een rode check. Fix: `if: github.actor != 'dependabot[bot]'`
      op de job, of de workflow weghalen (verder komen er geen PR's; alles gaat direct naar `main`).
- [ ] **should** `scripts/controleer.js`: de privacycontrole heeft zelf geen test. Breekt er een regel
      (bijvoorbeeld de scriptcontrole), dan merkt niemand het en gaat een pagina met een script gewoon
      live. Fix: de map `uit/` instelbaar maken en één test die een mini-site met `<script src>`,
      `style=` en een cookie controleert en verwacht dat de controle faalt.
- [ ] **should** `scripts/screenshots.js:43-52` en `scripts/controleer.js:48-57`: `browserOpties()` staat
      twee keer, precies gelijk; een wijziging moet op twee plekken. Fix: één keer, in een klein gedeeld bestand.
- [ ] **should** `scripts/bekijk.js` en `scripts/controleer.js:31-34,162-171`: dezelfde lijst
      bestandstypes en hetzelfde mini-webservertje. Fix: één functie die beide gebruiken.
- [ ] **nice** `scripts/bouw.js:131-140`: `replaceAll` met gewone tekst; een titel of beschrijving met
      `$&` of `$'` wordt vervangen door stukken van het sjabloon. Fix: de functievorm `() => tekst`,
      zoals al bij `{{inhoud}}`.
- [ ] **nice** `scripts/bouw.js:85`: `menu: 3 (uitleg)` zoals in het voorbeeld in de README wordt `NaN`,
      en dan staat het menu stil in de verkeerde volgorde. Fix: fout geven als `menu` geen getal is.
- [ ] **nice** `.claude/hooks/ponytail-start.sh`: draait tegelijk met de hook die `origin/main` ophaalt
      en kan dus de punten van vóór de update tonen. Fix: achter de fetch-hook zetten (`&& sh ...`).
- [ ] **nice** `.claude/hooks/ponytail-pushcontrole.sh`: kijkt naar de hele invoer, dus ook een commando
      dat alleen de tekst "git push" bevat (bijvoorbeeld in een commitbericht) wordt geblokkeerd. Fix:
      alleen als het hindert; dan het `command`-veld apart lezen.
- [ ] **nice** `scripts/voorbeeld.js:181`: `const allePloegen = ploegen;` is alleen een tweede naam.
      Fix: `ploegen` gebruiken.

## Besloten

- Teksten worden **niet** automatisch bijgewerkt bij een nieuwe README van de app (geen automatische
  pagina, geen Claude in Actions). Het issue "Nieuwe functie(s) in de app zonder uitleg op de site"
  blijft het signaal; de tekst wordt met de hand (of in een Claude-sessie) aangevuld. Zo komt er geen
  tekst uit de privé-repo ongezien op de publieke site.
