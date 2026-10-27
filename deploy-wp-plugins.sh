#!/usr/bin/env bash
# Deploy the built calculator plugins in dist-wordpress/ to skattebetalarna.se
# (Loopia) — and, where the plugin already exists there, to dev.skattebetalarna.se.
#
# Run ./build-wordpress.sh && ./build-wp-plugins.sh first (in that order —
# build-wordpress.sh wipes dist-wordpress/). Usage:
#   ./deploy-wp-plugins.sh            # all plugins
#   ./deploy-wp-plugins.sh isk skattehojningar
#
# The SSH key has a passphrase — make sure it is loaded (ssh-add -l).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
DIST="$ROOT/dist-wordpress"
HOST="99iv5v@ssh.loopia.se"
ACCOUNT="/www/webvol40/96/9zs8cj9113y8xht"   # webvolNN can drift — see MEMORY.md
PROD="$ACCOUNT/skattebetalarna.se/public_html/wp-content/plugins"
DEV="$ACCOUNT/dev.skattebetalarna.se/public_html/wp-content/plugins"
SSH_OPTS="-o BatchMode=yes -o StrictHostKeyChecking=accept-new"

ALL=(fastighetsskatt drivmedelsskatt skattebetalardagen lonekostnad utdelning312 isk skattehojningar skattesnurra)
PLUGINS=("${@:-${ALL[@]}}")

for p in "${PLUGINS[@]}"; do
  [ -d "$DIST/$p" ] || { echo "!! $DIST/$p missing — build first"; exit 1; }
done

# rsync without -t: files get a fresh mtime on the server, and the plugin PHP
# uses filemtime() as the asset ?ver=, so the 30-day static cache is busted.
for p in "${PLUGINS[@]}"; do
  echo "== $p → prod"
  rsync -rl --itemize-changes -e "ssh $SSH_OPTS" "$DIST/$p/" "$HOST:$PROD/$p/" | grep -v '^\.d' || true
  if ssh $SSH_OPTS "$HOST" "test -d '$DEV/$p'"; then
    echo "== $p → dev"
    rsync -rl --itemize-changes -e "ssh $SSH_OPTS" "$DIST/$p/" "$HOST:$DEV/$p/" | grep -v '^\.d' || true
  fi
done

# Cached HTML embeds the old ?ver= — flush the FastCGI page cache so pages
# pick up the new asset URLs.
echo "== purge page cache"
ssh $SSH_OPTS "$HOST" "cd '$ACCOUNT/skattebetalarna.se/public_html' && wp nginx-helper purge-all" || echo "!! purge failed — run 'wp nginx-helper purge-all' on prod manually"
echo "done"
