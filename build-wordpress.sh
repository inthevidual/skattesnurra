#!/usr/bin/env bash
set -euo pipefail

# Load nvm if available (needed for Node 20+)
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

ROOT="$(cd "$(dirname "$0")" && pwd)"
DIST="$ROOT/dist-wordpress"

echo "=== skattesnurra WordPress widget build ==="
echo ""

# ── Step 1: ensure esbuild is installed ────────────────────────────
if ! npx esbuild --version &>/dev/null; then
  echo "Installing esbuild…"
  npm install --save-dev esbuild
fi

# ── Step 2: prep temp dir, strip cache-busters ─────────────────────
TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

cp -r "$ROOT/js"        "$TMPDIR/js"
cp -r "$ROOT/data"       "$TMPDIR/data"
cp -r "$ROOT/wordpress"  "$TMPDIR/wordpress"

# Strip ?v=… query params from import paths
find "$TMPDIR" -name '*.js' -exec sed -i "s/\?v=[0-9.]*//g" {} +

rm -rf "$DIST"
mkdir -p "$DIST"

# ── Step 3: bundle JS as IIFE ─────────────────────────────────────
npx esbuild "$TMPDIR/wordpress/entry.js" \
  --bundle \
  --format=iife \
  --minify \
  --outfile="$DIST/skattesnurra.js"

echo "  ✓ skattesnurra.js"

# ── Step 4: build Tailwind CSS (skip base/preflight to avoid global resets) ─
TMPCSS="$ROOT/.build-wp-input.css"
cat > "$TMPCSS" <<CSS
@import "tailwindcss/theme" layer(theme);
@import "tailwindcss/utilities" layer(utilities);
@source "./wordpress/entry.js";
@source "./js/**/*.js";
CSS

npx @tailwindcss/cli \
  -i "$TMPCSS" \
  --cwd "$ROOT" \
  --minify \
  -o "$DIST/tw-raw.css"

rm -f "$TMPCSS"

# Prefix every selector with #skattesnurra (utilities, :root tokens, property
# resets) so the widget's Tailwind cannot override the theme's own utilities.
node "$ROOT/scripts/scope-css.mjs" "$DIST/tw-raw.css" "skattesnurra"

echo "  ✓ tailwind generated (no base/preflight — scoped under #skattesnurra)"

# ── Step 5: scope CSS under #skattesnurra ──────────────────────────
# Build scoped CSS file with:
#   1. Google Fonts import
#   2. Container base styles (scoped reset + typography)
#   3. Tailwind theme + utilities (global but class-based, no conflicts)
#   4. Widget-specific component styles (tabs, sliders)

cat > "$DIST/skattesnurra.css" <<'CSSHEADER'
/* Skattesnurra WordPress Widget — scoped styles */
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400&family=Inter:wght@300;400;600;700&display=swap');

/* Container reset — prevents WordPress theme interference */
#skattesnurra {
  font-family: 'Inter', sans-serif;
  font-size: 16px;
  line-height: 1.6;
  color: #111827;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
  letter-spacing: 0.01em;
}

#skattesnurra *,
#skattesnurra *::before,
#skattesnurra *::after {
  box-sizing: border-box;
}

#skattesnurra img,
#skattesnurra svg {
  max-width: 100%;
  height: auto;
}

/* Prevent WordPress from styling our elements */
#skattesnurra table {
  border-collapse: collapse;
  border-spacing: 0;
  width: 100%;
}

#skattesnurra th,
#skattesnurra td {
  padding: 0;
  text-align: left;
  border: none;
  background: transparent;
}

#skattesnurra input[type="text"],
#skattesnurra input[type="number"],
#skattesnurra select {
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
  color: inherit;
}

#skattesnurra fieldset {
  border: none;
  margin: 0;
  padding: 0;
  min-inline-size: auto;
}

#skattesnurra legend {
  padding: 0;
}

#skattesnurra button {
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
  color: inherit;
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
}

#skattesnurra h2, #skattesnurra h3 {
  margin: 0;
  padding: 0;
}

#skattesnurra p {
  margin: 0;
  padding: 0;
}

#skattesnurra ul {
  list-style: none;
  margin: 0;
  padding: 0;
}

CSSHEADER

# Append Tailwind theme + utilities (class-based selectors, no global resets)
cat "$DIST/tw-raw.css" >> "$DIST/skattesnurra.css"
echo '' >> "$DIST/skattesnurra.css"

# Append widget component styles (tabs, sliders, etc.)
cat >> "$DIST/skattesnurra.css" <<'CSSCOMPONENTS'

/* CSS custom properties */
#skattesnurra {
  --brand-blue-500: #0072CE;
  --brand-red-500: #F9423A;
  --brand-violet-500: #7B5EA7;
  --brand-amber-500: #F5A623;
  --brand-green-500: #2BA784;
  --brand-slate-500: #5C5D6E;
}

/* Range slider */
#skattesnurra input[type="range"].skatt-slider {
  -webkit-appearance: none;
  appearance: none;
  height: 10px;
  border-radius: 5px;
  background: #0072CE;
  outline: none;
  cursor: pointer;
  width: 100%;
  margin: 0;
  padding: 0;
}

#skattesnurra input[type="range"].skatt-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 22px;
  height: 28px;
  border-radius: 4px;
  background: #f5f5f5;
  border: 1px solid #ccc;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  cursor: grab;
}

#skattesnurra input[type="range"].skatt-slider::-webkit-slider-thumb:active {
  cursor: grabbing;
  background: #e8e8e8;
}

#skattesnurra input[type="range"].skatt-slider::-moz-range-thumb {
  width: 22px;
  height: 28px;
  border-radius: 4px;
  background: #f5f5f5;
  border: 1px solid #ccc;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  cursor: grab;
}

#skattesnurra input[type="range"].skatt-slider::-moz-range-thumb:active {
  cursor: grabbing;
  background: #e8e8e8;
}

#skattesnurra input[type="range"].skatt-slider::-moz-range-track {
  height: 10px;
  border-radius: 5px;
  background: #0072CE;
  border: none;
}

/* Tabs */
#skattesnurra .skatt-tab-bar {
  display: flex;
  border-bottom: 2px solid #e5e7eb;
}

#skattesnurra .skatt-tab-bar button {
  padding: 0.5rem 1.25rem;
  font-weight: 600;
  font-size: 1rem;
  color: #6b7280;
  background: transparent;
  border: 2px solid transparent;
  border-bottom: none;
  border-radius: 0.5rem 0.5rem 0 0;
  margin-bottom: -2px;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
}

#skattesnurra .skatt-tab-bar button:hover {
  color: #374151;
}

#skattesnurra .skatt-tab-bar button[aria-selected="true"] {
  color: #0072CE;
  border-color: #e5e7eb;
  background: #f3f4f6;
  border-bottom-color: #f3f4f6;
}

CSSCOMPONENTS

rm -f "$DIST/tw-raw.css"

echo "  ✓ skattesnurra.css (scoped)"

# ── Step 6: create plugin PHP ──────────────────────────────────────
PLUGIN_DIR="$DIST/skattesnurra"
mkdir -p "$PLUGIN_DIR"

mv "$DIST/skattesnurra.js"  "$PLUGIN_DIR/"
mv "$DIST/skattesnurra.css" "$PLUGIN_DIR/"

cat > "$PLUGIN_DIR/skattesnurra.php" <<'PHP'
<?php
/**
 * Plugin Name: Skattesnurra
 * Description: Bädda in skatteberäknaren med shortcode [skattesnurra]
 * Version: 1.3
 * Author: Skattebetalarna
 */

add_shortcode('skattesnurra', function () {
    // filemtime as version → new asset URL on every deploy, busts the
    // 30-day Loopia/browser cache on static files
    $dir = plugin_dir_path(__FILE__);
    wp_enqueue_style(
        'skattesnurra',
        plugin_dir_url(__FILE__) . 'skattesnurra.css',
        [],
        (string) filemtime($dir . 'skattesnurra.css')
    );
    wp_enqueue_script(
        'skattesnurra',
        plugin_dir_url(__FILE__) . 'skattesnurra.js',
        [],
        (string) filemtime($dir . 'skattesnurra.js'),
        true
    );
    return '<div id="skattesnurra"></div>';
});
PHP

echo "  ✓ skattesnurra.php"

# ── Step 7: create installable zip ─────────────────────────────────
if command -v zip &>/dev/null; then
  (cd "$DIST" && zip -rq skattesnurra.zip skattesnurra/)
else
  python3 -c "
import zipfile, os
with zipfile.ZipFile('$DIST/skattesnurra.zip', 'w', zipfile.ZIP_DEFLATED) as zf:
    for root, dirs, files in os.walk('$DIST/skattesnurra'):
        for f in files:
            full = os.path.join(root, f)
            arc = os.path.relpath(full, '$DIST')
            zf.write(full, arc)
"
fi

echo "  ✓ skattesnurra.zip"

# ── Step 8: report ─────────────────────────────────────────────────
echo ""
echo "── Build complete ──────────────────────────────────"
echo ""

JS_SIZE=$(wc -c < "$PLUGIN_DIR/skattesnurra.js")
CSS_SIZE=$(wc -c < "$PLUGIN_DIR/skattesnurra.css")
ZIP_SIZE=$(wc -c < "$DIST/skattesnurra.zip")

printf "  JS  : %s\n" "$(numfmt --to=iec "$JS_SIZE" 2>/dev/null || echo "${JS_SIZE}B")"
printf "  CSS : %s\n" "$(numfmt --to=iec "$CSS_SIZE" 2>/dev/null || echo "${CSS_SIZE}B")"
printf "  ZIP : %s\n" "$(numfmt --to=iec "$ZIP_SIZE" 2>/dev/null || echo "${ZIP_SIZE}B")"

echo ""
echo "  Output: $DIST/skattesnurra.zip"
echo ""
echo "  Install:"
echo "    1. WordPress Admin → Plugins → Add New → Upload Plugin"
echo "    2. Upload skattesnurra.zip"
echo "    3. Activate"
echo "    4. Add [skattesnurra] shortcode to any page/post"
