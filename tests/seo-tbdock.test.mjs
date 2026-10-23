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

// ---------- CLEANUP-01 (ELORUMTECH-CLEANUP-20261023-01): QA-01 #35 F3, F5 ----------
// F3: the capability table's values were never asserted, so a wrong number passed. Pin every cell (value + [ID]).
const TB_CELLS = [
  ["Thunderbolt 3", "40 Gb/s [I3]", "One 4K display (minimum) [I3]", "Not listed as required [I3]", "15 W [I3]", "16 Gb/s [I3]"],
  ["Thunderbolt 4", "40 Gb/s [I2]", "Two 4K displays or one 8K display [I3]", "Required up to 100 W, available up to 140 W [I2]", "15 W [I2]", "32 Gb/s [I2]"],
  ["Thunderbolt 5", "80 Gb/s each way; up to 120 Gb/s transmit with Bandwidth Boost (40 Gb/s receive) [I1]", "Dual 6K required [I1]; up to two 8K 60 Hz monitors [I4]", "Required up to 140 W, available up to 240 W [I1]", "15 W [I1]", "64 Gb/s [I1]"],
  ["USB4 (minimum)", "20 Gb/s minimum, 40 Gb/s optional [I3]", "One display, no minimum bandwidth [I2]", "Not required [I4]", "7.5 W [I2]", "—"],
  ["USB4 Version 2.0", "Up to 80 Gb/s; optionally 120 Gb/s one way and 40 Gb/s the other for high-performance displays [U2]", "—", "—", "—", "—"],
  ["USB-C with USB 3 + DisplayPort", "10 Gb/s [I3]", "One display, no minimum [I3]", "—", "4.5 W [I3]", "—"],
];
const tbCells = (html) => {
  const tb = (html.match(/<table>[\s\S]*?<\/table>/) || [''])[0];
  return [...tb.matchAll(/<tr><th scope="row">([^<]+)<\/th>([\s\S]*?)<\/tr>/g)].map((m) => [m[1], ...[...m[2].matchAll(/<td>([\s\S]*?)<\/td>/g)].map((c) => c[1].replace(/<a class="srcs" href="#src-([A-Z0-9]+)">\[\1\]<\/a>/g, '[$1]'))]);
};
test('tbdock CLEANUP-01: capability table cells pinned (values and source IDs) (#35 F3)', () => {
  assert.deepEqual(tbCells(h), TB_CELLS);
});
test('tbdock CLEANUP-01: table mutants (TB4 PCIe 32→40, TB5 140→100 W, TB3 15→25 W, swapped ID, dropped row)', () => {
  const muts = [
    h.replace('32 Gb/s <a class="srcs" href="#src-I2">[I2]</a>', '40 Gb/s <a class="srcs" href="#src-I2">[I2]</a>'),
    h.replace('Required up to 140 W, available up to 240 W', 'Required up to 100 W, available up to 240 W'),
    h.replace('<td>15 W <a class="srcs" href="#src-I3">[I3]</a></td>', '<td>25 W <a class="srcs" href="#src-I3">[I3]</a></td>'),
    h.replace('64 Gb/s <a class="srcs" href="#src-I1">[I1]</a>', '64 Gb/s <a class="srcs" href="#src-I2">[I2]</a>'),
    h.replace(/<tr><th scope="row">USB4 Version 2\.0<\/th>[\s\S]*?<\/tr>/, ''),
  ];
  for (const [i, m] of muts.entries()) { assert.notEqual(m, h, `mutation ${i}`); assert.notDeepEqual(tbCells(m), TB_CELLS, `mutant ${i} survived`); }
});
// F5 (JSON-LD part only; title/meta stay frozen): the breadcrumb name matches the page's "Thunderbolt dock guide" H1.
test('tbdock CLEANUP-01: BreadcrumbList position 3 is "Thunderbolt dock guide" (#35 F5)', () => {
  const bc = ld.find((o) => o['@type'] === 'BreadcrumbList');
  assert.equal(bc.itemListElement[2].name, 'Thunderbolt dock guide');
  assert.equal(bc.itemListElement[2].item, URL_);
  assert.ok(H1.startsWith('Thunderbolt dock guide'));
  assert.doesNotMatch(h, /"name": ?"Thunderbolt dock one-cable 4K\/120"/);
});
