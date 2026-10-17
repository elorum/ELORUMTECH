// Display & Connection Solver landing pages (ELORUMTECH Issue #10).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { render } from '../display/build-pages.mjs';

const BASE = 'https://elorum.github.io/ELORUMTECH/guides/';
const PAGES = [
  'display-connection-solver.html',
  'external-monitor-not-detected.html',
  'usb-c-dock-display-limits.html',
  'monitor-stuck-at-60hz.html',
];
const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const unesc = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
const text = (h) => unesc(h.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
const jsonld = (html) => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));

test('pages exist with matching canonical, title, description and lang', () => {
  for (const p of PAGES) {
    assert.ok(existsSync(new URL('../guides/' + p, import.meta.url)), p);
    const h = read('guides/' + p);
    assert.ok(h.includes(`<link rel="canonical" href="${BASE}${p}">`), 'canonical ' + p);
    assert.match(h, /<html lang="en">/);
    assert.match(h, /<title>[^<]{10,}<\/title>/);
    assert.match(h, /<meta name="description" content="[^"]{50,}">/);
    assert.match(h, /<meta name="viewport" content="width=device-width/);
    assert.equal((h.match(/<h1[\s>]/g) || []).length, 1, 'one h1 ' + p);
  }
});

test('pages are in sitemap.xml (with lastmod 2026-10-18) and linked from the guides hub', () => {
  const sm = read('sitemap.xml');
  const hub = read('guides/index.html');
  for (const p of PAGES) {
    const block = sm.match(new RegExp(`<url>\\s*<loc>${BASE.replace(/\./g, '\\.')}${p.replace(/\./g, '\\.')}</loc>[\\s\\S]*?</url>`));
    assert.ok(block, 'sitemap ' + p);
    assert.ok(block[0].includes('<lastmod>2026-10-18</lastmod>'), 'lastmod 2026-10-18 for ' + p);
    assert.ok(hub.includes(`href="${p}"`), 'hub link ' + p);
  }
});

test('JSON-LD parses; FAQPage questions/answers equal the visible FAQ', () => {
  for (const p of PAGES) {
    const h = read('guides/' + p);
    const docs = jsonld(h);
    assert.ok(docs.length >= 2, 'json-ld ' + p);
    const crumbs = docs.find((d) => d['@type'] === 'BreadcrumbList');
    assert.ok(crumbs, 'breadcrumbs ' + p);
    assert.equal(crumbs.itemListElement.at(-1).item, BASE + p);
    for (const d of docs) {
      if (d['@type'] === 'TechArticle' || d['@type'] === 'WebApplication') assert.equal(d.dateModified, '2026-10-18', p);
      assert.ok(!('datePublished' in d), 'no datePublished in ' + p);
    }
    const faq = docs.find((d) => d['@type'] === 'FAQPage');
    const visible = [...h.matchAll(/<details><summary>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/g)].map((m) => ({ q: text(m[1]), a: text(m[2]) }));
    if (p === 'display-connection-solver.html') {
      assert.ok(docs.find((d) => d['@type'] === 'WebApplication'));
      continue;
    }
    assert.ok(faq, 'faq ' + p);
    assert.equal(faq.mainEntity.length, visible.length);
    assert.ok(visible.length >= 3);
    faq.mainEntity.forEach((q, i) => {
      assert.equal(q.name, visible[i].q);
      assert.equal(q.acceptedAnswer.text.replace(/\s+/g, ' ').trim(), visible[i].a);
    });
  }
});

test('generated tables and source lists are up to date', () => {
  for (const p of PAGES) {
    const h = read('guides/' + p);
    assert.equal(render(h), h, 'run node display/build-pages.mjs: ' + p);
  }
});

test('every in-page source citation resolves to a listed source', () => {
  for (const p of PAGES) {
    const h = read('guides/' + p);
    for (const m of h.matchAll(/href="#(src-[A-Z0-9]+)"/g)) assert.ok(h.includes(`id="${m[1]}"`), `${m[1]} in ${p}`);
  }
});

test('REM01-HIGH-1 / REM02-NEW-L3 every relative href/src (any quoting) in the 4 new pages and guides/index.html resolves to a file in the tree', () => {
  const guidesDir = new URL('../guides/', import.meta.url);
  const repoRoot = new URL('../', import.meta.url);
  let checked = 0;
  for (const p of [...PAGES, 'index.html']) {
    const h = read('guides/' + p);
    for (const m of h.matchAll(/\s(?:href|src)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/gi)) {
      const ref = (m[1] ?? m[2] ?? m[3]).replace(/&amp;/g, '&');
      if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(ref)) continue; // absolute URL, protocol-relative or in-page anchor
      const clean = ref.split('#')[0].split('?')[0];
      assert.ok(clean.length > 0, `empty relative reference in ${p}`);
      // site-root paths: the site is served under /ELORUMTECH/ (GitHub Pages project site), i.e. the repo root
      if (clean.startsWith('/')) assert.ok(clean.startsWith('/ELORUMTECH/'), `${p}: root path outside the site base: ${ref}`);
      const target = clean.startsWith('/') ? new URL(clean.slice('/ELORUMTECH/'.length), repoRoot) : new URL(clean, guidesDir);
      const file = target.pathname.endsWith('/') ? new URL('index.html', target) : target;
      assert.ok(existsSync(file), `${p}: ${ref} -> ${file.pathname} does not exist`);
      checked++;
    }
  }
  assert.ok(checked >= 20, 'expected the related/footer/script links to be checked, got ' + checked);
});

test('no search-volume or traffic claims, no affiliate patterns', () => {
  for (const p of PAGES) {
    const h = read('guides/' + p).toLowerCase();
    for (const bad of ['search volume', 'searches per month', 'monthly searches', 'searches/month', 'awin', 'sca_ref']) assert.ok(!h.includes(bad), `${bad} in ${p}`);
  }
});

test('accessibility: skip link, labelled controls, no-JS fallback, live region', () => {
  for (const p of PAGES) {
    const h = read('guides/' + p);
    assert.match(h, /<a class="skip" href="#main">/);
    assert.match(h, /<main id="main"/);
    assert.match(h, /:focus-visible/);
    for (const m of h.matchAll(/<div class="table-wrap"[^>]*>/g)) {
      assert.match(m[0], /role="region"/); assert.match(m[0], /tabindex="0"/); assert.match(m[0], /aria-label="/);
    }
  }
  const h = read('guides/display-connection-solver.html');
  assert.match(h, /<form id="solver-form" hidden/);
  assert.match(h, /id="solver-nojs"/);
  assert.match(h, /aria-live="polite"/);
  for (const m of h.matchAll(/<(input|select)\b[^>]*>/g)) {
    const id = (m[0].match(/\bid="([^"]+)"/) || [])[1];
    const before = h.slice(0, m.index);
    const wrapped = before.lastIndexOf('<label') > before.lastIndexOf('</label>');
    assert.ok(wrapped || (id && h.includes(`<label for="${id}"`)), 'unlabelled control: ' + m[0]);
  }
  assert.match(h, /<script src="\.\.\/display\/engine-display\.js" defer><\/script>/);
  assert.match(h, /<script src="\.\.\/display\/solver-ui\.js" defer><\/script>/);
  const ui = read('display/solver-ui.js');
  assert.ok(!/innerHTML\s*=/.test(ui), 'UI writes textContent only');
});
