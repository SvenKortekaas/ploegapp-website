#!/bin/sh
# PreToolUse-hook: blokkeert "git push" zolang de wijzigingen ten opzichte van origin/main niet met
# /ponytail-review zijn nagekeken en gemarkeerd (ponytail-markeer.sh). Zie CLAUDE.md, "Ponytail".
# De invoer is JSON van Claude Code. Zonder jq: het veld "command" eruit halen en alleen reageren als
# git push daarin als commando staat (aan het begin, of na ; & | ( of een nieuwe regel), niet als
# tekst in bijvoorbeeld een commitbericht of de beschrijving.
commando=$(sed -E 's/.*"command"[[:space:]]*:[[:space:]]*"(([^"\\]|\\.)*)".*/\1/')
printf '%s\n' "$commando" | grep -Eq '(^|[;&|(]|\\n)[[:space:]]*git[[:space:]]+push' || exit 0
cd "$(git rev-parse --show-toplevel 2>/dev/null)" || exit 0
if ! git rev-parse --verify -q origin/main >/dev/null; then
  echo "origin/main ontbreekt: eerst git fetch origin main." >&2
  exit 2
fi
id=$(git diff origin/main...HEAD | git patch-id --stable | cut -d' ' -f1)
[ -z "$id" ] && exit 0
[ "$id" = "$(cat .claude/.ponytail-reviewed 2>/dev/null)" ] && exit 0
echo "Eerst /ponytail-review branch draaien, must fix-punten oplossen en .claude/hooks/ponytail-markeer.sh uitvoeren." >&2
exit 2
