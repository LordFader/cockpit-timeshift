#!/bin/sh
set -eu
DEST="/usr/share/cockpit/timeshift"
SRC="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root: sudo ./install.sh"
  exit 1
fi

mkdir -p "$DEST"
install -o root -g root -m 0644 "$SRC/manifest.json" "$DEST/manifest.json"
install -o root -g root -m 0644 "$SRC/index.html" "$DEST/index.html"
install -o root -g root -m 0644 "$SRC/timeshift.js" "$DEST/timeshift.js"
install -o root -g root -m 0644 "$SRC/timeshift.css" "$DEST/timeshift.css"

echo "Installed Timeshift Cockpit package in $DEST"
echo
echo "Files:"
find "$DEST" -maxdepth 1 -type f -printf '%M %u:%g %p\n' | sort
echo
echo "No symlink is required."
echo "Reload Cockpit in the browser (hard refresh if necessary)."
