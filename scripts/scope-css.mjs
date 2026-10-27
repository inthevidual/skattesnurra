#!/usr/bin/env node
// Scope a generated Tailwind stylesheet under a container selector so the
// utilities (.flex, .hidden, .container, …), the :root theme variables and the
// *,::before,::after property resets cannot leak into the host WordPress theme.
//
// Usage: node scripts/scope-css.mjs <file.css> <container-id>   (rewrites in place)
import { readFileSync, writeFileSync } from 'node:fs';
import postcss from 'postcss';
import prefixSelector from 'postcss-prefix-selector';

const [file, id] = process.argv.slice(2);
if (!file || !id) {
  console.error('usage: scope-css.mjs <file.css> <container-id>');
  process.exit(1);
}
const scope = `#${id}`;

const result = await postcss([
  prefixSelector({
    prefix: scope,
    transform(prefix, selector, prefixedSelector) {
      // Theme tokens live on :root/:host → put them on the container instead.
      if (selector === ':root' || selector === ':host') return prefix;
      // Never double-prefix hand-written scoped rules.
      if (selector.startsWith(prefix)) return selector;
      return prefixedSelector;
    },
  }),
]).process(readFileSync(file, 'utf8'), { from: file, to: file });

writeFileSync(file, result.css);
console.log(`  ✓ scoped ${result.root.nodes.length} top-level nodes under ${scope}`);
