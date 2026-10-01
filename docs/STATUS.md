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

- [ ] Oude branch `claude/pensive-darwin-579y9z` verwijderen (eigenaar, via GitHub).
- [ ] Oude workflowruns 1 t/m 6 verwijderen (bevatten oude commitberichten).
- [ ] GitHub Support vragen om cached views en losse oude commits van deze repo te wissen.
- [ ] Keuze automatisch bijwerken van teksten bij een nieuwe README van de app:
      1. automatische pagina "Alles op een rij" uit de README, en/of
      2. Claude in GitHub Actions die een pull request maakt (Anthropic API-sleutel nodig).
- [ ] Controleren dat de geplande nachtelijke run echt draait (de eerste nacht draaide hij niet).
