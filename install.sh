#!/bin/sh
set -eu
DEST="/usr/share/cockpit/timeshift"
SRC="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT HUP INT TERM

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root: sudo ./install.sh"
  exit 1
fi

# Production manifest: identify the tool as "Timeshift", not "Timeshift Dev".
sed \
  -e 's/"timeshift-dev"/"timeshift"/' \
  -e 's/"Timeshift Dev"/"Timeshift"/' \
  "$SRC/manifest.json" > "$TMP/manifest.json"

# Production index.html: strip the DEV badge and DEV title.
sed \
  -e 's/Timeshift · Cockpit · DEV/Timeshift · Cockpit/' \
  -e 's/Timeshift <span class="dev-badge">DEV<\/span>/Timeshift/' \
  "$SRC/index.html" > "$TMP/index.html"

# Production stylesheet: drop the DEV-only .dev-badge rule.
awk '
/^\.dev-badge/ { inblock=1; next }
{ if (inblock) { if ($0 ~ /^}/) inblock=0; next } }
{ print }
' "$SRC/timeshift.css" > "$TMP/timeshift.css"

mkdir -p "$DEST"
install -o root -g root -m 0644 "$TMP/manifest.json" "$DEST/manifest.json"
install -o root -g root -m 0644 "$TMP/index.html" "$DEST/index.html"
install -o root -g root -m 0644 "$SRC/timeshift.js" "$DEST/timeshift.js"
install -o root -g root -m 0644 "$TMP/timeshift.css" "$DEST/timeshift.css"

echo "Installed Timeshift Cockpit package in $DEST"
echo
echo "Files:"
find "$DEST" -maxdepth 1 -type f -printf '%M %u:%g %p\n' | sort
echo
echo "No symlink is required."
echo "Reload Cockpit in the browser (hard refresh if necessary)."
