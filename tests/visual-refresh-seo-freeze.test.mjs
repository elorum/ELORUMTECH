// Guard: the visual refresh may only add the shared theme stylesheet link.
// Titles, meta descriptions, H1s, canonicals, JSON-LD, hrefs, anchors and visible
// body text must be byte-identical to the main baseline (docs/seo-freeze-baseline.json).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { extract, THEME_LINK } from './seo-freeze-extract.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = JSON.parse(fs.readFileSync(path.join(root, 'docs/seo-freeze-baseline.json'), 'utf8'));
function htmlFiles(dir = root, out = []) {
  for (const n of fs.readdirSync(dir)) {
    if (n === '.git' || n === 'node_modules') continue;
    const p = path.join(dir, n);
    if (fs.statSync(p).isDirectory()) htmlFiles(p, out); else if (n.endsWith('.html')) out.push(path.relative(root, p).split(path.sep).join('/'));
  }
  return out.sort();
}
const FIELDS = ['title', 'metaDescription', 'h1', 'canonical', 'jsonLd', 'hrefs', 'anchors', 'bodyText'];
test('VRF-0 same HTML page set as main baseline', () => {
  assert.deepEqual(htmlFiles(), Object.keys(base.pages).sort());
});
for (const rel of Object.keys(base.pages)) {
  test(`VRF ${rel}: SEO fields byte-identical to main and only the theme link added`, () => {
    const html = fs.readFileSync(path.join(root, rel), 'utf8');
    const e = extract(html);
    for (const k of FIELDS) assert.deepEqual(e[k], base.pages[rel][k], `${rel}: ${k} changed`);
    assert.equal(crypto.createHash('sha256').update(e.withoutThemeLink).digest('hex'), base.pages[rel].fullSha256, `${rel}: bytes differ beyond the theme <link>`);
    assert.ok(html.split(THEME_LINK).length <= 2, `${rel}: theme link duplicated`);
  });
}
test('VRF-CSS theme stylesheet is local, lightweight, no external fonts/CDNs/imports', () => {
  const css = fs.readFileSync(path.join(root, 'assets/elorum-theme.css'), 'utf8');
  assert.ok(css.length < 12000);
  assert.doesNotMatch(css, /@import|@font-face|url\(|https?:\/\//i);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(css, /:focus-visible/);
  for (const t of ['--ink:#161612', '--cream:#f2efe6', '--paper:#e7e1d3', '--gold:#b79055', "--serif:Georgia,'Times New Roman',serif", '--sans:Arial,Helvetica,sans-serif']) assert.ok(css.includes(t), t);
});
test('VRF-MUT guard detects a changed title, href and body copy', () => {
  const [rel] = Object.keys(base.pages).filter((r) => r === 'index.html');
  const html = fs.readFileSync(path.join(root, rel), 'utf8');
  const muts = [html.replace(/<title([^>]*)>/, '<title$1>X '), html.replace(/<a\b([^>]*?)href="/, '<a$1href="x'), html.replace(/<\/h1>/, ' extra</h1>'), html.replace('</head>', '<meta name="x" content="y"></head>')];
  for (const m of muts) {
    assert.notEqual(m, html, 'mutation must change the page');
    const e = extract(m);
    const same = FIELDS.every((k) => JSON.stringify(e[k]) === JSON.stringify(base.pages[rel][k])) && crypto.createHash('sha256').update(e.withoutThemeLink).digest('hex') === base.pages[rel].fullSha256;
    assert.equal(same, false);
  }
});
