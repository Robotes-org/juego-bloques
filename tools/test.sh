#!/bin/sh
# Runs both checks: the levels are solvable and the game itself behaves.
# Usage:  ./tools/test.sh
set -e

cd "$(dirname "$0")/.."

echo "== Niveles =="
node tools/check-levels.js

CHROME=""
for candidate in google-chrome chromium chromium-browser chrome; do
  if command -v "$candidate" > /dev/null 2>&1; then CHROME="$candidate"; break; fi
done

if [ -z "$CHROME" ]; then
  echo
  echo "No se encontró Chrome ni Chromium: abre tools/test.html a mano en el navegador."
  exit 0
fi

echo
echo "== Juego ($CHROME) =="
# --virtual-time-budget lets the runner's timers finish instantly instead of in real time.
OUTPUT=$("$CHROME" --headless=new --no-sandbox --disable-gpu \
  --virtual-time-budget=30000 --dump-dom "file://$(pwd)/tools/test.html" 2>/dev/null \
  | sed -n '/<pre id="out">/,/<\/pre>/p' | sed 's/<[^>]*>//g')

echo "$OUTPUT"

if ! echo "$OUTPUT" | grep -q "TESTS-DONE"; then
  echo "Las pruebas no llegaron al final."
  exit 1
fi

if echo "$OUTPUT" | grep -q "FALLARON"; then
  exit 1
fi
