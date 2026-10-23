// SEO-TBDOCK-01: Thunderbolt dock guide broadened for "thunderbolt dock" + "usb c monitor".
// Title/H1/date/JSON-LD/sitemap/gate consistency, and every cited figure links to a primary source.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const FILE = 'guides/thunderbolt-dock-one-cable-4k-120.html';
const URL_ = `https://elorumtech.elorum.world/${FILE}`;
const DATE = '2026-10-23';
const TITLE = 'Thunderbolt Dock Guide: TB4 vs TB5, Monitors, 4K/120 | ELORUMTECH';
const HEADLINE = 'Thunderbolt Dock Guide: TB4 vs TB5, Monitors, 4K/120';
const H1 = 'Thunderbolt dock guide: how to choose one for one-cable 4K/120';
const PRIMARY = /^https:\/\/(www\.intel\.com|www\.thunderbolttechnology\.net|(www\.)?usb\.org|vesa\.org|support\.apple\.com|learn\.microsoft\.com|www\.dell\.com)\//;
const h = read(FILE);
const ld = [...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
const article = ld.find((o) => o['@type'] === 'TechArticle');

test('tbdock: title, og:title, headline and single H1', () => {
  assert.equal((h.match(/<title>([^<]*)<\/title>/) || [])[1], TITLE);
  assert.ok(TITLE.length <= 75 && /thunderbolt dock/i.test(TITLE) && TITLE.includes('4K/120'));
  assert.ok(h.includes(`<meta property="og:title" content="${TITLE}">`));
  assert.equal(article.headline, HEADLINE);
  assert.equal((h.match(/<h1[\s>]/g) || []).length, 1);
  assert.ok(h.includes(`<h1>${H1}</h1>`));
  assert.ok(h.includes(`rel="canonical" href="${URL_}"`));
  assert.ok(h.includes(`<meta property="og:url" content="${URL_}">`));
});

test('tbdock: Updated, Last reviewed, dateModified, sitemap lastmod and gate agree', () => {
  assert.equal((h.match(/<p class="updated"[^>]*>Updated: (\d{4}-\d{2}-\d{2})<\/p>/) || [])[1], DATE);
  assert.equal((h.match(/Updated:/g) || []).length, 1);
  assert.equal((h.match(/Last reviewed: (\d{4}-\d{2}-\d{2})/g) || []).length, 1);
  assert.ok(h.includes(`Last reviewed: ${DATE}`));
  assert.equal(article.dateModified, DATE);
  const sm = read('sitemap.xml');
  const entry = sm.match(new RegExp(`<loc>${URL_.replace(/[.\/]/g, '\\$&')}</loc>\\s*<lastmod>([^<]+)</lastmod>`));
  assert.ok(entry);
  assert.equal(entry[1], DATE);
  const gate = JSON.parse(read('docs/release-date-gate.json'));
  const g = gate.pages.filter((p) => p.file === FILE);
  assert.equal(g.length, 1);
  assert.deepEqual(g[0], { file: FILE, url: URL_, visibleUpdated: true, intendedReleaseDate: DATE });
});

test('tbdock: every source is primary, listed once and cited; every citation resolves', () => {
  const ids = [...h.matchAll(/<li id="src-([A-Z0-9]+)"><a href="([^"]+)" rel="noopener">/g)];
  assert.ok(ids.length >= 10);
  const set = new Set(ids.map((m) => m[1]));
  assert.equal(set.size, ids.length);
  for (const [, id, href] of ids) {
    assert.match(href, PRIMARY, `src-${id} not primary: ${href}`);
    assert.ok(h.includes(`<a class="srcs" href="#src-${id}">[${id}]</a>`), `src-${id} never cited`);
  }
  for (const m of h.matchAll(/<a class="srcs" href="#src-([A-Z0-9]+)">\[([A-Z0-9]+)\]<\/a>/g)) {
    assert.equal(m[1], m[2]);
    assert.ok(set.has(m[1]), `citation ${m[1]} has no source entry`);
  }
  assert.ok(h.includes('<section class="sources" aria-labelledby="sources-heading">'));
});

test('tbdock: choosing section, capability table, USB-C monitor section and internal links', () => {
  assert.ok(h.includes('<h2 id="choose">Choosing a Thunderbolt dock</h2>'));
  const table = (h.match(/<div class="tablewrap"[\s\S]*?<\/table><\/div>/) || [''])[0];
  for (const row of ['Thunderbolt 3', 'Thunderbolt 4', 'Thunderbolt 5', 'USB4 (minimum)', 'USB4 Version 2.0']) {
    assert.ok(table.includes(`<th scope="row">${row}</th>`), row);
  }
  for (const k of ['MST: Windows vs macOS', 'DSC (Display Stream Compression)', 'Charging watts', 'When a hub is enough']) assert.ok(h.includes(k), k);
  assert.ok(h.includes('<h2 id="usb-c-monitor">'));
  for (const href of ['display-connection-solver.html', 'usb-c-dock-display-limits.html', 'usb-c-laptop-to-4k-monitor.html', 'usb-c-hub-vs-dock.html']) {
    assert.ok(h.includes(`href="${href}"`), href);
  }
});

test('tbdock: exactly one theme stylesheet (visual refresh) and no other stylesheet', () => {
  const THEME = '<link rel="stylesheet" href="/assets/elorum-theme.css">';
  assert.equal(h.split(THEME).length - 1, 1);
  assert.equal((h.match(/elorum-theme\.css/g) || []).length, 1);
  assert.equal((h.match(/<link rel="stylesheet"/g) || []).length, 1);
  assert.ok(h.includes(`${THEME}</head>`));
});
