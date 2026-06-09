#!/usr/bin/env bash
set -euo pipefail

# Load nvm if available
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

ROOT="$(cd "$(dirname "$0")" && pwd)"
DIST="$ROOT/dist-wordpress"

# Ensure esbuild is installed
if ! npx esbuild --version &>/dev/null; then
  echo "Installing esbuild…"
  npm install --save-dev esbuild
fi

# ── Generic plugin builder ─────────────────────────────────────────
# Usage: build_plugin <name> <entry_dir> <container_id> <shortcode> <description>

build_plugin() {
  local NAME="$1"
  local ENTRY_DIR="$2"
  local CONTAINER_ID="$3"
  local SHORTCODE="$4"
  local DESCRIPTION="$5"
  local PLUGIN_DIR="$DIST/$NAME"

  echo ""
  echo "=== Building $NAME ==="

  rm -rf "$PLUGIN_DIR"
  mkdir -p "$PLUGIN_DIR"

  # ── Bundle JS as IIFE ──────────────────────────────────────────
  npx esbuild "$ROOT/$ENTRY_DIR/entry.js" \
    --bundle \
    --format=iife \
    --minify \
    --outfile="$PLUGIN_DIR/$NAME.js"

  echo "  ✓ $NAME.js"

  # ── Build Tailwind CSS (no base/preflight) ─────────────────────
  local TMPCSS="$ROOT/.build-${NAME}-input.css"
  cat > "$TMPCSS" <<CSS
@import "tailwindcss/theme" layer(theme);
@import "tailwindcss/utilities" layer(utilities);
@source "./$ENTRY_DIR/entry.js";
CSS

  npx @tailwindcss/cli \
    -i "$TMPCSS" \
    --cwd "$ROOT" \
    --minify \
    -o "$PLUGIN_DIR/tw-raw.css"

  rm -f "$TMPCSS"

  # ── Assemble scoped CSS ────────────────────────────────────────
  cat > "$PLUGIN_DIR/$NAME.css" <<CSSHEADER
/* $NAME WordPress Plugin — scoped styles */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap');

#${CONTAINER_ID} {
  font-family: 'Inter', sans-serif;
  font-size: 16px;
  line-height: 1.6;
  color: #111827;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
  letter-spacing: 0.01em;
}

#${CONTAINER_ID} *,
#${CONTAINER_ID} *::before,
#${CONTAINER_ID} *::after {
  box-sizing: border-box;
}

#${CONTAINER_ID} img,
#${CONTAINER_ID} svg {
  max-width: 100%;
  height: auto;
  display: block;
}

#${CONTAINER_ID} fieldset {
  border: none;
  margin: 0;
  padding: 0;
  min-inline-size: auto;
}

#${CONTAINER_ID} button {
  font-family: inherit;
  cursor: pointer;
}

#${CONTAINER_ID} h2, #${CONTAINER_ID} h3 {
  margin: 0;
  padding: 0;
}

#${CONTAINER_ID} p {
  margin: 0;
  padding: 0;
}

#${CONTAINER_ID} input[type="text"] {
  font-family: inherit;
  font-size: inherit;
  color: inherit;
}

CSSHEADER

  # Append Tailwind theme + utilities
  cat "$PLUGIN_DIR/tw-raw.css" >> "$PLUGIN_DIR/$NAME.css"
  echo '' >> "$PLUGIN_DIR/$NAME.css"
  rm -f "$PLUGIN_DIR/tw-raw.css"

  echo "  ✓ $NAME.css"

  # ── Create plugin PHP ──────────────────────────────────────────
  if [ -f "$ROOT/$ENTRY_DIR/$NAME.php" ]; then
    cp "$ROOT/$ENTRY_DIR/$NAME.php" "$PLUGIN_DIR/$NAME.php"
  else
    cat > "$PLUGIN_DIR/$NAME.php" <<PHP
<?php
/**
 * Plugin Name: ${DESCRIPTION}
 * Description: Bädda in räknesnurran med shortcode [${SHORTCODE}]
 * Version: 1.1
 * Author: Skattebetalarna
 */

add_shortcode('${SHORTCODE}', function () {
    wp_enqueue_style(
        '${NAME}',
        plugin_dir_url(__FILE__) . '${NAME}.css',
        [],
        '1.1'
    );
    wp_enqueue_script(
        '${NAME}',
        plugin_dir_url(__FILE__) . '${NAME}.js',
        [],
        '1.1',
        true
    );
    return '<div id="${CONTAINER_ID}"></div>';
});
PHP
  fi

  echo "  ✓ $NAME.php"

  # ── Copy images if present ────────────────────────────────────
  if [ -d "$ROOT/$ENTRY_DIR/img" ]; then
    cp -r "$ROOT/$ENTRY_DIR/img" "$PLUGIN_DIR/img"
    echo "  ✓ img/ ($(ls "$PLUGIN_DIR/img" | wc -l) files)"
  fi

  # ── Zip ────────────────────────────────────────────────────────
  if command -v zip &>/dev/null; then
    (cd "$DIST" && zip -rq "$NAME.zip" "$NAME/")
  else
    python3 -c "
import zipfile, os
with zipfile.ZipFile('$DIST/$NAME.zip', 'w', zipfile.ZIP_DEFLATED) as zf:
    for root, dirs, files in os.walk('$PLUGIN_DIR'):
        for f in files:
            full = os.path.join(root, f)
            arc = os.path.relpath(full, '$DIST')
            zf.write(full, arc)
"
  fi

  local JS_SIZE=$(wc -c < "$PLUGIN_DIR/$NAME.js")
  local CSS_SIZE=$(wc -c < "$PLUGIN_DIR/$NAME.css")
  local ZIP_SIZE=$(wc -c < "$DIST/$NAME.zip")

  printf "  ✓ %s.zip  (JS %s · CSS %s · ZIP %s)\n" \
    "$NAME" \
    "$(numfmt --to=iec "$JS_SIZE" 2>/dev/null || echo "${JS_SIZE}B")" \
    "$(numfmt --to=iec "$CSS_SIZE" 2>/dev/null || echo "${CSS_SIZE}B")" \
    "$(numfmt --to=iec "$ZIP_SIZE" 2>/dev/null || echo "${ZIP_SIZE}B")"
}

# ── Build all plugins ──────────────────────────────────────────────

build_plugin "fastighetsskatt" "fastighetsskatt" "fastighetsskatt" "fastighetsskatt" "Fastighetsskatt"
build_plugin "drivmedelsskatt" "drivmedelsskatt" "drivmedelsskatt" "drivmedelsskatt" "Drivmedelsskatt"
build_plugin "skattebetalardagen" "skattebetalardagen" "skattebetalardagen" "skattebetalardagen" "Skattebetalardagen"
build_plugin "lonekostnad" "lonekostnad" "lonekostnad" "lonekostnad" "Vad kostar en anställd?"
build_plugin "utdelning312" "utdelning312" "utdelning312" "utdelning312" "Räkna ut 3:12-utdelning"

echo ""
echo "── All plugins built ─────────────────────────────────"
echo ""
echo "  Install: WordPress Admin → Plugins → Add New → Upload Plugin"
echo "  Shortcodes: [fastighetsskatt]  [drivmedelsskatt]  [skattebetalardagen]  [lonekostnad]  [utdelning312]"
echo ""
echo "  Output: $DIST/"
ls -1 "$DIST"/*.zip 2>/dev/null | sed 's/^/    /'
