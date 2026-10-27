#!/usr/bin/env bash
set -euo pipefail

# Load nvm if available (needed for Node 20+)
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

ROOT="$(cd "$(dirname "$0")" && pwd)"
DIST="$ROOT/dist"

echo "=== timbroskatt production build ==="
echo ""

# ── Step 1: ensure esbuild is installed ──────────────────────────────
if ! npx esbuild --version &>/dev/null; then
  echo "Installing esbuild…"
  npm install --save-dev esbuild
fi

# ── Step 2: bundle JS with esbuild ──────────────────────────────────
# Source files use ?v=1.1 cache-buster query params that esbuild can't
# resolve.  Copy to a temp dir and strip them before bundling.

TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

cp -r "$ROOT/js"   "$TMPDIR/js"
cp -r "$ROOT/data"  "$TMPDIR/data"

# Strip ?v=… query params from import paths
find "$TMPDIR" -name '*.js' -exec sed -i "s/\?v=[0-9.]*//g" {} +

rm -rf "$DIST"
mkdir -p "$DIST"

npx esbuild "$TMPDIR/js/main.js" \
  --bundle \
  --format=esm \
  --minify \
  --outfile="$DIST/bundle.js"

echo "  ✓ bundle.js"

# ── Step 3: build Tailwind CSS (static, not CDN) ────────────────────
# Tailwind v4 uses CSS-based config with @import "tailwindcss".
# We also @source the HTML and JS files for class scanning.
TMPCSS="$ROOT/.build-input.css"
cat > "$TMPCSS" <<CSS
@import "tailwindcss";
@source "./index.html";
@source "./js/**/*.js";
CSS

npx @tailwindcss/cli \
  -i "$TMPCSS" \
  --cwd "$ROOT" \
  --minify \
  -o "$DIST/tw.css"

rm -f "$TMPCSS"

# Concatenate Tailwind output + custom.css into one file
cat "$DIST/tw.css" "$ROOT/css/custom.css" > "$DIST/styles.css"
rm -f "$DIST/tw.css"

echo "  ✓ styles.css"

# ── Step 4: production index.html ────────────────────────────────────
sed -E \
  -e 's|<script src="https://cdn.tailwindcss.com"></script>||' \
  -e 's|<link rel="stylesheet" href="css/custom\.css(\?v=[0-9.]+)?">|<link rel="stylesheet" href="styles.css">|' \
  -e 's|<script type="module" src="js/main\.js(\?v=[0-9.]+)?">|<script type="module" src="bundle.js">|' \
  "$ROOT/index.html" > "$DIST/index.html"

echo "  ✓ index.html"

# ── Step 5: copy static assets ───────────────────────────────────────
for asset in CNAME og.jpg og.png og.webp; do
  if [ -f "$ROOT/$asset" ]; then
    cp "$ROOT/$asset" "$DIST/"
  fi
done

# Copy directories if they exist
for dir in fonts img; do
  if [ -d "$ROOT/$dir" ]; then
    cp -r "$ROOT/$dir" "$DIST/"
  fi
done

echo "  ✓ static assets"

# ── Step 6: report ───────────────────────────────────────────────────
echo ""
echo "── Build complete ──────────────────────────────────"
echo ""

JS_DEV=$(find "$ROOT/js" "$ROOT/data" -name '*.js' | xargs cat | wc -c)
JS_PROD=$(wc -c < "$DIST/bundle.js")
CSS_PROD=$(wc -c < "$DIST/styles.css")
JS_COUNT_DEV=$(find "$ROOT/js" "$ROOT/data" -name '*.js' | wc -l)

printf "  JS  : %d files (%s) → 1 file (%s)\n" \
  "$JS_COUNT_DEV" \
  "$(numfmt --to=iec "$JS_DEV" 2>/dev/null || echo "${JS_DEV}B")" \
  "$(numfmt --to=iec "$JS_PROD" 2>/dev/null || echo "${JS_PROD}B")"

printf "  CSS : Tailwind CDN + custom.css → 1 file (%s)\n" \
  "$(numfmt --to=iec "$CSS_PROD" 2>/dev/null || echo "${CSS_PROD}B")"

echo ""
echo "  Output: $DIST/"
echo ""
echo "  Test:  python3 -m http.server -d dist 8080"
echo "         → http://localhost:8080"
