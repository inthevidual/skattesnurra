#!/usr/bin/env bash
set -euo pipefail

# Load nvm if available (needed for Node 20+)
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

ROOT="$(cd "$(dirname "$0")" && pwd)"
DIST="$ROOT/dist-lonefterskatt"

echo "=== lön efter skatt v0.666 production build ==="
echo ""

# ── Step 1: ensure esbuild is installed ──────────────────────────────
if ! npx esbuild --version &>/dev/null; then
  echo "Installing esbuild…"
  npm install --save-dev esbuild
fi

# ── Step 2: bundle JS with esbuild ──────────────────────────────────
# Source files use ?v=… cache-buster query params that esbuild can't
# resolve.  Copy to a temp dir and strip them before bundling.

TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

cp -r "$ROOT/js"             "$TMPDIR/js"
cp -r "$ROOT/data"           "$TMPDIR/data"
cp -r "$ROOT/lonefterskatt"  "$TMPDIR/lonefterskatt"

# Strip ?v=… query params from import paths
find "$TMPDIR" -name '*.js' -exec sed -i "s/\?v=[0-9.]*//g" {} +

rm -rf "$DIST"
mkdir -p "$DIST"

npx esbuild "$TMPDIR/lonefterskatt/main.js" \
  --bundle \
  --format=esm \
  --minify \
  --outfile="$DIST/bundle.js"

echo "  ✓ bundle.js"

# ── Step 3: build Tailwind CSS (static, not CDN) ────────────────────
TMPCSS="$ROOT/.build-les-input.css"
cat > "$TMPCSS" <<CSS
@import "tailwindcss";
@source "./lonefterskatt/index.html";
@source "./lonefterskatt/main.js";
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
  -e 's|<link rel="stylesheet" href="\.\./css/custom\.css(\?v=[0-9.]+)?">|<link rel="stylesheet" href="styles.css">|' \
  -e 's|<script type="module" src="main\.js(\?v=[0-9.]+)?">|<script type="module" src="bundle.js">|' \
  "$ROOT/lonefterskatt/index.html" > "$DIST/index.html"

echo "  ✓ index.html"

# ── Step 5: copy static assets ───────────────────────────────────────
echo "lonefterskatt.cptjanst.se" > "$DIST/CNAME"
cp "$ROOT/lonefterskatt/og.png" "$DIST/"
cp -r "$ROOT/lonefterskatt/fonts" "$DIST/fonts"

echo "  ✓ static assets (CNAME, og.png, fonts/)"

# ── Step 6: report ───────────────────────────────────────────────────
echo ""
echo "── Build complete ──────────────────────────────────"
echo ""

JS_PROD=$(wc -c < "$DIST/bundle.js")
CSS_PROD=$(wc -c < "$DIST/styles.css")
FONT_TOTAL=$(du -sb "$DIST/fonts" | cut -f1)

printf "  JS    : → 1 file (%s)\n" \
  "$(numfmt --to=iec "$JS_PROD" 2>/dev/null || echo "${JS_PROD}B")"

printf "  CSS   : → 1 file (%s)\n" \
  "$(numfmt --to=iec "$CSS_PROD" 2>/dev/null || echo "${CSS_PROD}B")"

printf "  Fonts : → %s\n" \
  "$(numfmt --to=iec "$FONT_TOTAL" 2>/dev/null || echo "${FONT_TOTAL}B")"

echo ""
echo "  Output: $DIST/"
echo ""
echo "  Test:  python3 -m http.server -d dist-lonefterskatt 8081"
echo "         → http://localhost:8081"
