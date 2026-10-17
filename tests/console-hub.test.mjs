import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const require = createRequire(import.meta.url);
const hub = require(path.join(root, 'console-hub.js'));
const PAGE = 'guides/console-handheld-display-hub.html';
const URL_ = 'https://elorum.github.io/ELORUMTECH/' + PAGE;
const html = fs.readFileSync(path.join(root, PAGE), 'utf8');

const ALLOWED_HOSTS = [
  'www.playstation.com', 'support.xbox.com', 'en-americas-support.nintendo.com', 'www.nintendo.com',
  'help.steampowered.com', 'www.steamdeck.com', 'rog.asus.com', 'psref.lenovo.com', 'www.hdmi.org'
];
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&#39;/g, "'");
const ldBlocks = () => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));

test('CH-1 hub page meta: canonical, title, description, robots, og, analytics', () => {
  assert.ok(html.includes(`<link rel="canonical" href="${URL_}">`));
  assert.ok(html.includes(`<meta property="og:url" content="${URL_}">`));
  const title = decode(html.match(/<title>([^<]+)<\/title>/)[1]);
  assert.ok(title.endsWith('| ELORUMTECH') && title.length <= 75, title);
  const desc = decode(html.match(/<meta name="description" content="([^"]+)">/)[1]);
  assert.ok(desc.length >= 120 && desc.length <= 170, 'description length ' + desc.length);
  assert.ok(html.includes('<meta name="robots" content="index,follow,max-image-preview:large">'));
  assert.ok(html.includes('/ELORUMTECH/analytics.js'));
  assert.equal((html.match(/<h1>/g) || []).length, 1);
});

test('CH-2 JSON-LD: TechArticle date = visible Updated = sitemap lastmod; Breadcrumb ends at page', () => {
  const blocks = ldBlocks();
  const art = blocks.find((b) => b['@type'] === 'TechArticle');
  const bc = blocks.find((b) => b['@type'] === 'BreadcrumbList');
  assert.ok(art && bc);
  assert.equal(art.mainEntityOfPage, URL_);
  const visible = html.match(/Updated: (\d{4}-\d{2}-\d{2})/)[1];
  assert.equal(art.dateModified, visible);
  const xml = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  const m = xml.match(new RegExp('<loc>' + URL_.replace(/[.]/g, '\\.') + '</loc>\\s*<lastmod>([^<]+)</lastmod>'));
  assert.ok(m, 'hub in sitemap');
  assert.equal(m[1], visible);
  const last = bc.itemListElement[bc.itemListElement.length - 1];
  assert.equal(last.item, URL_);
  assert.equal(bc.itemListElement[1].item, 'https://elorum.github.io/ELORUMTECH/guides/');
});

test('CH-3 FAQPage JSON-LD equals the visible FAQ exactly', () => {
  const faq = ldBlocks().find((b) => b['@type'] === 'FAQPage');
  const section = html.match(/<section class="faq"[\s\S]*?<\/section>/)[0];
  const visible = [...section.matchAll(/<details><summary>([\s\S]*?)<\/summary><p>([\s\S]*?)<\/p><\/details>/g)].map((m) => [decode(m[1]), decode(m[2])]);
  assert.ok(visible.length >= 4);
  assert.deepEqual(faq.mainEntity.map((q) => [q.name, q.acceptedAnswer.text]), visible);
});

test('CH-4 every relative link on the hub resolves to a file on this branch', () => {
  const noScript = html.replace(/<script[\s\S]*?<\/script>/g, '');
  const hrefs = [...noScript.matchAll(/href="([^"#]+)(#[^"]*)?"/g)].map((m) => m[1]).filter((h) => !/^https?:/.test(h) && !h.startsWith('/'));
  assert.ok(hrefs.length > 10);
  for (const h of hrefs) {
    const clean = decode(h).split('?')[0];
    let p = path.resolve(path.join(root, 'guides'), clean);
    if (clean === '' || clean.endsWith('/')) p = path.join(p, 'index.html');
    assert.ok(fs.existsSync(p), 'missing ' + h);
  }
  assert.ok(fs.existsSync(path.join(root, 'console-hub.js')));
  assert.ok(html.includes('<script src="../console-hub.js"></script>'));
});

test('CH-5 external links on the hub are OEM / standards bodies only', () => {
  const ext = [...html.matchAll(/href="(https?:\/\/[^"]+)"/g)].map((m) => new URL(decode(m[1])));
  const offsite = ext.filter((u) => u.host !== 'elorum.github.io');
  assert.ok(offsite.length >= 10);
  for (const u of offsite) assert.ok(ALLOWED_HOSTS.includes(u.host), 'non-primary source ' + u.href);
});

test('CH-6 every SOURCE is a primary host, has a checked date, and is listed on the page', () => {
  for (const [id, s] of Object.entries(hub.SOURCES)) {
    assert.ok(ALLOWED_HOSTS.includes(new URL(s.url).host), id);
    assert.match(s.checked, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(html.includes(s.url.replace(/&/g, '&amp;')), 'source not on page: ' + id);
  }
});

test('CH-7 planner covers every device x symptom; SOURCED steps cite, UNKNOWN never passes', () => {
  const devs = Object.keys(hub.DEVICES);
  const syms = Object.keys(hub.SYMPTOMS);
  assert.equal(devs.length, 8);
  assert.equal(syms.length, 5);
  for (const d of devs) for (const s of syms) {
    const p = hub.plan(d, s);
    assert.ok(p.ok, d + '/' + s);
    assert.ok(['SOURCED', 'PARTIAL', 'UNKNOWN'].includes(p.verdict), p.verdict);
    assert.ok(p.steps.length >= 1);
    for (const st of p.steps) {
      assert.ok(['SOURCED', 'UNKNOWN', 'ROUTE'].includes(st.status), st.status);
      if (st.status === 'SOURCED') assert.ok(st.sources.length >= 1 && st.sources.every(Boolean), d + '/' + s + ': ' + st.text);
      if (st.status === 'UNKNOWN') { assert.equal(st.sources.length, 0); assert.match(st.text, /UNKNOWN/); }
      if (st.status === 'ROUTE') assert.ok(st.link && fs.existsSync(path.join(root, 'guides', st.link)), 'route link ' + st.link);
      assert.ok(!/\bPASS\b/.test(st.text));
    }
    if (p.steps.every((x) => x.status !== 'SOURCED')) assert.equal(p.verdict, 'UNKNOWN');
  }
  assert.deepEqual(hub.plan('nope', 'no-signal'), { ok: false, error: 'UNKNOWN_INPUT', steps: [] });
});

test('CH-8 recovery routes: Xbox X/S, PS5, Deck sourced; Switch 2 recovery UNKNOWN', () => {
  const rec = (d) => hub.plan(d, 'no-signal').steps.filter((x) => x.recovery);
  assert.match(rec('xbox-x')[0].text, /Power \+ Eject/);
  assert.match(rec('xbox-s')[0].text, /Pair/);
  assert.match(rec('ps5')[0].text, /Change Video Output/);
  assert.match(rec('deck')[0].text, /External display safe mode/);
  for (const d of ['xbox-x', 'xbox-s', 'ps5', 'deck']) assert.ok(rec(d)[0].sources.length >= 1);
  assert.equal(rec('switch2').length, 0);
  assert.ok(hub.plan('switch2', 'no-signal').steps.some((x) => x.status === 'UNKNOWN' && /Low-resolution recovery/.test(x.text)));
});

test('CH-9 handheld max external modes stay UNKNOWN (null) and render as UNKNOWN on the page', () => {
  for (const d of ['ally-x', 'ally', 'legion-go']) {
    assert.equal(hub.PORT_FACTS[d].maxMode, null, d);
    assert.equal(hub.plan(d, 'wrong-res').verdict, 'UNKNOWN');
  }
  const refresh = html.match(/<h2 id="refresh">[\s\S]*?<\/table>/)[0];
  assert.ok((refresh.match(/class="unk">UNKNOWN</g) || []).length >= 3);
});

test('CH-10 no invented demand, no affiliate patterns, no PASS claims on the hub', () => {
  assert.ok(!/searches? (per|a) month|search volume of|\d[\d,.]*\s*(monthly )?searches/i.test(html));
  assert.ok(!/awin|sca_ref|amzn\.to|tag=/i.test(html));
  assert.ok(!/\bPASS\b/.test(html));
});

test('CH-11 hub is linked from the guides directory and links every existing console page', () => {
  const idx = fs.readFileSync(path.join(root, 'guides/index.html'), 'utf8');
  assert.ok(idx.includes('href="console-handheld-display-hub.html"'));
  for (const f of ['ps5-hdmi-2-1-cable-path.html', 'ps5-to-1440p-monitor.html', '../compatibility/ps5-dell-u2725qe.html', 'xbox-series-display-compatibility.html', 'nintendo-switch-2-display-path.html', 'steam-deck-external-display.html', 'console-hdmi-avr-passthrough-path.html']) {
    assert.ok(html.includes(`href="${f}"`), f);
  }
});

test('CH-12 Engine CTAs use exact Engine source/destination labels', () => {
  const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const ctas = [...html.matchAll(/href="\.\.\/\?src=([^&"]+)&amp;dst=([^&"]+)&amp;intents=([^"]+)"/g)];
  assert.equal(ctas.length, 4);
  for (const m of ctas) {
    assert.ok(index.includes('<option>' + decodeURIComponent(m[1]) + '</option>'), m[1]);
    assert.ok(index.includes('<option>' + decodeURIComponent(m[2]) + '</option>'), m[2]);
  }
});
