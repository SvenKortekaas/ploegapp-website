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

## Werk op de actuele code

- Bij de start van elke sessie (lokaal, op de website of in de app) haalt een SessionStart-hook in
  `.claude/settings.json` `origin/main` op en werkt de branch bij als dat veilig kan. Meldt de hook
  "LET OP", zoek dat dan eerst uit voordat je iets wijzigt.
- Doe vlak vóór elke push `git pull --rebase origin main`; er kan tijdens de sessie iets bijgekomen
  zijn (geplande runs, andere sessies).

## Verder

- Er mag **nooit** code van de app (repo `ploegapp`) in deze publieke repo staan. Zie `README.md`.
- Alleen verzonnen gegevens op de site (korps "Brandweer Duinwijk").

## Ponytail

De plugin Ponytail staat aan via `.claude/settings.json`. Hij helpt, maar de afspraken hierboven en
in `README.md` gaan voor: privacy, geen scripts of externe bronnen op de site, de
Content-Security-Policy, acties vastgepind op een commit en minimale rechten in workflows.

- Geen `shortcut:`-comments in `inhoud/` en `sjabloon/` (die worden gepubliceerd); alleen in `scripts/`.
- Vóór elke push: `/ponytail-review branch`, de must fix-punten oplossen en daarna
  `.claude/hooks/ponytail-markeer.sh` uitvoeren. De pushhook (`.claude/hooks/ponytail-pushcontrole.sh`)
  blokkeert `git push` tot dat gebeurd is.
- Bevindingen gaan als checkbox naar `docs/STATUS.md`, sectie "Audit (Ponytail)". Vink een punt af
  na de fix. Bij de start van een sessie toont `.claude/hooks/ponytail-start.sh` de open punten.
- Beveiligingsbevindingen **nooit** in de repo, issues of commitberichten (dit is een publieke repo):
  alleen melden aan de eigenaar in de sessie.
