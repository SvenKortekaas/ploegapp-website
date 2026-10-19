#!/bin/sh
# Legt vast dat de wijzigingen ten opzichte van origin/main met /ponytail-review zijn nagekeken.
# De pushcontrole (ponytail-pushcontrole.sh) vergelijkt hiermee. Zie CLAUDE.md, "Ponytail".
cd "$(git rev-parse --show-toplevel)" || exit 1
if ! git rev-parse --verify -q origin/main >/dev/null; then
  echo "origin/main ontbreekt: eerst git fetch origin main." >&2
  exit 1
fi
# De patch-id hangt alleen af van de wijzigingen zelf, dus blijft gelijk na een rebase
id=$(git diff origin/main...HEAD | git patch-id --stable | cut -d' ' -f1)
if [ -z "$id" ]; then
  echo "Geen wijzigingen ten opzichte van origin/main; niets te markeren."
  exit 0
fi
echo "$id" > .claude/.ponytail-reviewed
echo "Nagekeken: $id"
