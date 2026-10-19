#!/bin/sh
# SessionStart-hook: toont de open punten uit docs/STATUS.md, sectie "Audit (Ponytail)".
cd "$(git rev-parse --show-toplevel 2>/dev/null)" || exit 0
if ! grep -q '^## Audit (Ponytail' docs/STATUS.md 2>/dev/null; then
  echo "Ponytail: nog geen audit (docs/STATUS.md, sectie \"Audit (Ponytail)\"). Draai /ponytail-audit."
  exit 0
fi
# Open punten (- [ ]) met hun ingesprongen vervolgregels, alleen binnen de auditsectie
punten=$(awk '
  /^## / { s = /^## Audit \(Ponytail/ }
  s && /^- \[/ { p = /^- \[ \]/ }
  s && !/^- \[/ && !/^  / { p = 0 }
  s && p' docs/STATUS.md)
if [ -n "$punten" ]; then
  echo "Ponytail: open punten uit de audit (docs/STATUS.md):"
  echo "$punten"
else
  echo "Ponytail: geen open punten uit de audit."
fi
