// T3 part 2: cable path is the primary HDMI 2.1 / 4K120 / VRR / cable hub;
// Dell U2725QE stays model-specific and links to it. SEO fields + FAQ unchanged.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const CABLE = 'guides/ps5-hdmi-2-1-cable-path.html';
const DELL = 'compatibility/ps5-dell-u2725qe.html';
const P1440 = 'guides/ps5-to-1440p-monitor.html';
const BASE = 'https://elorumtech.elorum.world/';
const faqBlock = (h) => (h.match(/<script type="application\/ld\+json">[^<]*"FAQPage"[\s\S]*?<\/script>/) || [''])[0];
const meta = (h) => (h.match(/name="description" content="([^"]*)"/) || [])[1];
const hrefs = (h) => [...h.matchAll(/<a [^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/g)].map((m) => ({ href: m[1], text: m[2] }));

const SEO = {
  [CABLE]: { title: 'PS5 HDMI 2.1 Cable: Bandwidth, 4K120, VRR | ELORUMTECH', h1: 'PS5 HDMI 2.1 cable path', faq: 4 },
  [DELL]: { title: 'PS5 + Dell U2725QE: 4K 120Hz Compatibility | ELORUMTECH', h1: 'PlayStation 5 → Dell U2725QE', faq: 4 },
};

for (const [file, s] of Object.entries(SEO)) {
  test(`t3p2 ${file}: title/H1/canonical/meta/FAQ invariant`, () => {
    const h = read(file);
    assert.ok(h.includes(`<title>${s.title.replace('&', '&amp;')}</title>`) || h.includes(`<title>${s.title}</title>`));
    assert.ok(h.includes(`<h1>${s.h1}</h1>`));
    assert.ok(h.includes(`rel="canonical" href="${BASE}${file}"`));
    assert.ok(meta(h) && meta(h).length > 50);
    assert.doesNotMatch(h, /noindex/i);
    assert.equal((h.match(/"@type":"FAQPage"/g) || []).length, 1);
    assert.equal((faqBlock(h).match(/"@type":"Question"/g) || []).length, s.faq);
    assert.match(h, /"dateModified":"2026-10-23"/);
  });
}

test('t3p2 cable hub: descriptive links to 1440p, Dell, console hub and Display Solver', () => {
  const links = hrefs(read(CABLE));
  const want = ['ps5-to-1440p-monitor.html', '../compatibility/ps5-dell-u2725qe.html', 'console-handheld-display-hub.html', 'display-connection-solver.html'];
  for (const w of want) {
    const l = links.find((x) => x.href === w && x.text.trim().split(/\s+/).length >= 3);
    assert.ok(l, `descriptive link to ${w}`);
  }
  assert.match(read(CABLE), /Updated: 2026-10-23/);
});

test('t3p2 Dell: generic cable section collapsed into link to primary cable page + 1440p link', () => {
  const h = read(DELL);
  assert.doesNotMatch(h, /<h2>Keep yours<\/h2>/);
  const links = hrefs(h);
  assert.ok(links.some((l) => l.href === '../guides/ps5-hdmi-2-1-cable-path.html' && /cable path/i.test(l.text) && l.text.length > 25));
  assert.ok(links.some((l) => l.href === '../guides/ps5-to-1440p-monitor.html' && /1440p/.test(l.text) && l.text.length > 25));
  assert.match(h, /Dell U2725QE tech specs/);
});

test('t3p2 sitemap lastmod 2026-10-23 exactly for changed URLs', () => {
  const sm = read('sitemap.xml');
  const at = [...sm.matchAll(/<loc>([^<]+)<\/loc>\s*<lastmod>2026-10-23<\/lastmod>/g)].map((m) => m[1]).sort();
  // SEO-TBDOCK-01 also ships the Thunderbolt dock guide on 2026-10-23 (registered in docs/release-date-gate.json).
  // SEO-NOSIGNAL-01 also ships the external-monitor / no-signal guide on 2026-10-23 (registered in docs/release-date-gate.json).
  assert.deepEqual(at, [BASE + DELL, BASE + CABLE, BASE + 'guides/thunderbolt-dock-one-cable-4k-120.html', BASE + 'guides/external-monitor-not-detected.html'].sort());
  assert.match(sm, new RegExp(`<loc>${BASE}${P1440}</loc>\\s*<lastmod>2026-10-17</lastmod>`));
});

test('t3p2 Dell: visible Updated 2026-10-23 (T3P2-QA-001)', () => {
  const h = read(DELL);
  assert.equal((h.match(/Updated: \d{4}-\d{2}-\d{2}/g) || []).length, 1);
  assert.match(h, /<h1>PlayStation 5 → Dell U2725QE<\/h1>\n<p class="updated"[^>]*>Updated: 2026-10-23<\/p>/);
  const g = JSON.parse(read('docs/release-date-gate.json'));
  assert.equal(g.pages.find((p) => p.file === DELL).visibleUpdated, true);
});
