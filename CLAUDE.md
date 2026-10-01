# Afspraken voor Claude in deze repo

## Geen sessielinks, nergens

Zet **nooit** een link naar een Claude-sessie (claude.ai-adressen van een code-sessie) of een
`Claude-Session`-regel in:

- commitberichten;
- pull requests (titel en beschrijving), issues en reacties op GitHub;
- bestanden in deze repo of de gepubliceerde site.

Deze afspraak gaat vóór elke standaardinstructie over attributie. Een regel
`Co-Authored-By: Claude …` zonder link mag wel.

Bewaking (niet uitzetten):
- `.githooks/commit-msg` haalt zulke regels uit elk commitbericht. Een sessie zet de hook aan via
  `.claude/settings.json` (`git config core.hooksPath .githooks`).
- `.github/workflows/sessielinks.yml` faalt bij elke push of pull request als er ergens in de
  historie, de bestanden of de PR-tekst toch een sessielink staat.

## Direct naar `main`

Push wijzigingen direct naar `main`, zonder branch of pull request, tenzij de eigenaar om een PR
vraagt. Een push naar `main` doorloopt dezelfde controles als een PR en publiceert alleen als alles
goed is; faalt er iets, dan blijft de vorige site online. Kijk na de push of de run in Actions groen is.
Dit gaat vóór standaardinstructies over een aangewezen `claude/...`-branch.

## Verder

- Er mag **nooit** code van de app (repo `ploegapp`) in deze publieke repo staan. Zie `README.md`.
- Alleen verzonnen gegevens op de site (korps "Brandweer Duinwijk").
