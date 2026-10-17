import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

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

test('CH-2 JSON-LD + dates: no unconfirmed release date (no dateModified, no Updated label, no hub lastmod); sources-checked date shown; Breadcrumb ends at page', () => {
  const blocks = ldBlocks();
  const art = blocks.find((b) => b['@type'] === 'TechArticle');
  const bc = blocks.find((b) => b['@type'] === 'BreadcrumbList');
  assert.ok(art && bc);
  assert.equal(art.mainEntityOfPage, URL_);
  assert.ok(!('dateModified' in art), 'dateModified is set at release');
  assert.ok(!/Updated:/.test(html), 'Updated label is set at release');
  assert.ok(html.includes('Sources checked: 2026-10-18'));
  const xml = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  const entry = xml.match(new RegExp('<url>\\s*<loc>' + URL_.replace(/[.]/g, '\\.') + '</loc>([\\s\\S]*?)</url>'));
  assert.ok(entry, 'hub in sitemap');
  assert.ok(!/<lastmod>/.test(entry[1]), 'hub lastmod is set at release');
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

test('CH-13 HIGH-1: Microsoft disagreement on 120 Hz shown, each statement with its own article', () => {
  const tv = 'https://support.xbox.com/en-US/help/hardware-network/display-sound/change-tv-display-resolution';
  const k4 = 'https://support.xbox.com/en-US/help/hardware-network/display-sound/4k-gaming-at-120hz';
  const refresh = decode(html.match(/<h2 id="refresh">[\s\S]*?<\/table>/)[0]);
  for (const hay of [html, refresh]) {
    assert.ok(decode(hay).includes('120Hz is only available for 1080p and 1440p'));
    assert.ok(/If you own an Xbox Series S and wish to game in 4K@120Hz, you.ll need to acquire a certified Ultra High Speed HDMI cable/.test(decode(hay)));
    assert.ok(hay.includes(tv) && hay.includes(k4));
  }
  assert.ok(!/4K (at )?120 Hz needs (a |an )?(Xbox )?Series X/i.test(html), 'Series X requirement not stated as settled');
  for (const d of ['xbox-x', 'xbox-s']) {
    assert.ok(/120Hz is only available for 1080p and 1440p/.test(hub.PORT_FACTS[d].maxMode), d);
    assert.deepEqual(hub.PORT_FACTS[d].src, ['xb-120', 'xb-tv']);
    const steps = hub.plan(d, 'no-120').steps;
    const tvStep = steps.find((x) => x.sources.some((s) => s.url === tv) && /120Hz is only available for 1080p and 1440p/.test(x.text));
    const k4Step = steps.find((x) => x.sources.some((s) => s.url === k4) && /4K/.test(x.text));
    assert.ok(tvStep && k4Step, d);
    assert.ok(!/4K at 120 Hz needs/.test(steps.map((x) => x.text).join(' ')));
  }
  assert.match(hub.plan('xbox-s', 'no-120').steps.map((x) => x.text).join(' '), /If you own an Xbox Series S and wish to game in 4K@120Hz/);
  const faq = ldBlocks().find((b) => b['@type'] === 'FAQPage').mainEntity.find((q) => q.name === 'Can Xbox run 120 Hz without HDMI 2.1?');
  assert.match(faq.acceptedAnswer.text, /120Hz is only available for 1080p and 1440p/);
  assert.match(faq.acceptedAnswer.text, /certified Ultra High Speed HDMI cable/);
});

test('CH-14 M2: exactly these 7 cells are PARTIAL (sourced + UNKNOWN steps)', () => {
  const partial = [];
  for (const d of Object.keys(hub.DEVICES)) for (const s of Object.keys(hub.SYMPTOMS)) {
    const p = hub.plan(d, s);
    if (p.verdict === 'PARTIAL') {
      partial.push(d + '/' + s);
      assert.ok(p.steps.some((x) => x.status === 'SOURCED') && p.steps.some((x) => x.status === 'UNKNOWN'), d + '/' + s);
    }
  }
  assert.deepEqual(partial.sort(), ['ally-x/no-120', 'ally-x/no-signal', 'ally/no-signal', 'legion-go/no-120', 'legion-go/no-signal', 'switch2/chain', 'switch2/no-signal'].sort());
});

function renderPicker(device, symptom) {
  const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).find((s) => s.includes('ElorumConsoleHub'));
  assert.ok(script, 'inline picker script');
  const listeners = {};
  const el = (v) => ({ value: v, innerHTML: '', addEventListener: (ev, fn) => { (listeners[ev] = listeners[ev] || []).push(fn); } });
  const els = { hubDevice: el(device), hubSymptom: el(symptom), hubResult: el('') };
  const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const document = {
    getElementById: (id) => els[id] || null,
    createElement: () => { const o = { textContent: '' }; Object.defineProperty(o, 'innerHTML', { get() { return esc(o.textContent); } }); return o; }
  };
  const window = { ElorumConsoleHub: hub };
  vm.runInNewContext(script, { window, document, location: { href: 'https://elorum.github.io/ELORUMTECH/' + PAGE, search: '' }, URL, URLSearchParams, history: { replaceState() {} } });
  return els.hubResult.innerHTML;
}

test('CH-15 M2: inline picker renders UNKNOWN badge for UNKNOWN steps and for null maxMode', () => {
  const out = renderPicker('ally-x', 'wrong-res');
  assert.ok(out.includes('<li><span class="unk">UNKNOWN</span> '), 'UNKNOWN step badge');
  assert.ok(out.includes('Stated modes: <span class="unk">UNKNOWN</span>'), 'null maxMode renders UNKNOWN');
  assert.ok(out.includes('<span class="pill">UNKNOWN</span>'));
  const ok = renderPicker('ps5', 'no-signal');
  assert.ok(ok.includes('<span class="pill">SOURCED</span>') && !ok.includes('class="unk"'));
  assert.ok(!/\bPASS\b/.test(out + ok));
});

test('CH-16 L1: plan() rejects prototype keys', () => {
  for (const [d, s] of [['__proto__', 'no-signal'], ['constructor', 'no-signal'], ['ps5', '__proto__'], ['ps5', 'constructor'], ['toString', 'hasOwnProperty']]) {
    assert.deepEqual(hub.plan(d, s), { ok: false, error: 'UNKNOWN_INPUT', steps: [] }, d + '/' + s);
  }
});

test('CH-17 L2-L4 wording: reset myth, HDMI-only scope, Legion Go controller ports', () => {
  assert.ok(html.includes('It is not the first step.'));
  assert.ok(!/PS5, Xbox and the Switch 2 dock output HDMI only/.test(html));
  assert.ok(!/Consoles send video over HDMI/.test(html));
  assert.match(hub.PORT_FACTS['legion-go'].output, /on the controllers/);
  assert.ok(html.includes('charging only are on the controllers'));
});
