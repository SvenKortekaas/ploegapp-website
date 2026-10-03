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
- [ ] Controleren dat de geplande runs draaien. In twee nachten (1 en 2 oktober, 03:17 UTC) is er
      geen run op tijd gestart; één geplande run kwam op 1 oktober om 10:14 UTC, ruim zeven uur te
      laat. Sinds 2 oktober drie tijdstippen per dag (03:17, 09:41 en 15:23 UTC), zodat er ook bij een
      overgeslagen run elke dag verse screenshots komen. Kijk na een paar dagen in Actions (filter
      "event: schedule") of er elke dag minstens één is.
- [ ] Secret `PLOEGAPP_LEES_TOKEN` ook als **Dependabot-secret** zetten (eigenaar; README stap 1).
      Daarna de open pull requests van Dependabot laten hercontroleren en mergen als ze groen zijn.
- [ ] Beveiligingsinstellingen van de repo en het account zetten (eigenaar; README, "Eenmalig instellen" stap 5).
- [ ] DNSSEC aanzetten bij Cloud86 en het domein verifiëren in GitHub (eigenaar; stap 6). Stand
      1 oktober: geen DNSSEC, en `_github-pages-challenge-svenkortekaas.ploegapp.nl` heeft geen TXT-record.
- [ ] Mail van `ploegapp.nl` nakijken (eigenaar; hoort bij de app, niet bij de site): het MX-record
      wijst naar `ploegapp.nl` zelf, dus naar GitHub Pages, en het SPF-record (`+a +mx`) staat daardoor
      de servers van GitHub toe als afzender. Waarschijnlijk hoort er alleen `ip4:45.82.189.150` in.

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

## Besloten

- Teksten worden **niet** automatisch bijgewerkt bij een nieuwe README van de app (geen automatische
  pagina, geen Claude in Actions). Het issue "Nieuwe functie(s) in de app zonder uitleg op de site"
  blijft het signaal; de tekst wordt met de hand (of in een Claude-sessie) aangevuld. Zo komt er geen
  tekst uit de privé-repo ongezien op de publieke site.
