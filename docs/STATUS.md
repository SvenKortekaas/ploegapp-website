# Stand van zaken

Overdracht voor wie (mens of Claude) verder werkt aan ploegapp.nl. Lees eerst `CLAUDE.md` en `README.md`.

## Wat er staat

- **Live**: https://ploegapp.nl (GitHub Pages, eigen domein, HTTPS afgedwongen). `www` en `http`
  sturen door.
- **Elke nacht** (03:17 UTC) en bij elke push naar `main`: nieuwste app ophalen, screenshots met
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
- [ ] Controleren dat de geplande nachtelijke run echt draait. Stand 1 oktober: de workflow staat
      op `active`, maar er is nog geen enkele run met gebeurtenis `schedule` geweest (ook niet in de
      nacht van 30 september op 1 oktober). GitHub slaat de eerste geplande runs van een nieuwe
      workflow vaker over. Kijk in Actions of er na 2 oktober 03:17 UTC een run "schedule" staat;
      zo niet, dan een tweede tijdstip toevoegen of het schema op `main` opnieuw opslaan.

## Besloten

- Teksten worden **niet** automatisch bijgewerkt bij een nieuwe README van de app (geen automatische
  pagina, geen Claude in Actions). Het issue "Nieuwe functie(s) in de app zonder uitleg op de site"
  blijft het signaal; de tekst wordt met de hand (of in een Claude-sessie) aangevuld. Zo komt er geen
  tekst uit de privé-repo ongezien op de publieke site.
