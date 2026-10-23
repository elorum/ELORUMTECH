// CLEANUP-01 (ELORUMTECH-CLEANUP-20261023-01, owner-approved by Nicki): the open non-blocking QA-01 follow-ups that
// are not covered in the per-page suites (seo-nosignal, seo-dpvshdmi, seo-vrr, seo-tbdock, seo-idx-quality):
//  - #36 F4 / #38 R3: the fixed consent banner no longer hides a focused element (WCAG 2.4.11), run in a vm stub DOM;
//  - #33 NB-4 / #37 F1 pattern: .tablewrap scroll-padding-inline site-wide; #33 NB-1: room for the focus ring;
//  - #39 F5 / R1: inferences marked as ours, [AP1] scoped to the Mac path, Intel's 240W scoped to TB5 docks;
//  - #40 F4: FAQPage JSON-LD == visible FAQ on index, PS5 cable path, PS5 + Dell U2725QE and USB-C laptop → 4K;
//    usb-c-laptop dates follow its last visible text change (#24, 2026-10-18).
// Mutants for every check.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const C = (id) => `<a class="srcs" href="#src-${id}">[${id}]</a>`;
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', rsquo: '’', ldquo: '“', rdquo: '”', '#x27': "'", '#39': "'" };
const txt = (s) => s.replace(/<[^>]+>/g, '').replace(/&(#?[a-z0-9]+);/g, (m, n) => ENT[n] ?? m).replace(/\s+/g, ' ').trim();

// ---------- consent banner (#36 F4, #38 R3) ----------
const ANALYTICS = read('analytics.js');
function el(tag) {
  const e = { tagName: tag, style: {}, children: [], listeners: {}, attrs: {}, parent: null, rect: { top: 0, bottom: 0, height: 0 } };
  e.setAttribute = (k, v) => { e.attrs[k] = v; };
  e.getAttribute = (k) => e.attrs[k] ?? null;
  e.appendChild = (c) => { c.parent = e; e.children.push(c); return c; };
  e.addEventListener = (t, f) => { (e.listeners[t] ||= []).push(f); };
  e.removeEventListener = (t, f) => { e.listeners[t] = (e.listeners[t] || []).filter((x) => x !== f); };
  e.remove = () => { if (e.parent) e.parent.children = e.parent.children.filter((x) => x !== e); e.parent = null; };
  e.contains = (x) => { for (let n = x; n; n = n.parent) if (n === e) return true; return false; };
  e.getBoundingClientRect = () => e.rect;
  e.click = () => (e.listeners.click || []).forEach((f) => f({ target: e }));
  return e;
}
function run(src, { consent = null, innerHeight = 667, bannerHeight = 200, bodyPadding = '' } = {}) {
  const store = new Map(consent ? [['elorumtech-analytics-consent', consent]] : []);
  const html = el('html'); const body = el('body'); const head = el('head');
  body.style.paddingBottom = bodyPadding;
  const docListeners = {}; const winListeners = {}; const scrolls = [];
  const find = (n, id) => { if (n.id === id) return n; for (const c of n.children) { const r = find(c, id); if (r) return r; } return null; };
  const document = {
    readyState: 'complete', documentElement: html, body, head,
    createElement: (t) => { const e = el(t); if (t === 'section') e.rect = { top: innerHeight - 16 - bannerHeight, bottom: innerHeight - 16, height: bannerHeight }; return e; },
    getElementById: (id) => find(body, id),
    addEventListener: (t, f) => { (docListeners[t] ||= []).push(f); },
    removeEventListener: (t, f) => { docListeners[t] = (docListeners[t] || []).filter((x) => x !== f); },
  };
  const window = {
    innerHeight,
    addEventListener: (t, f) => { (winListeners[t] ||= []).push(f); },
    removeEventListener: (t, f) => { winListeners[t] = (winListeners[t] || []).filter((x) => x !== f); },
    scrollBy: (x, y) => scrolls.push(y),
  };
  const localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
  vm.runInNewContext(src, { window, document, localStorage, location: { pathname: '/' }, encodeURIComponent, Math, Date });
  const banner = () => document.getElementById('elorumtech-analytics-consent');
  const focus = (target) => (docListeners.focusin || []).forEach((f) => f({ target }));
  const link = (top, bottom) => { const a = el('a'); a.rect = { top, bottom, height: bottom - top }; body.appendChild(a); return a; };
  return { html, body, banner, focus, link, scrolls, docListeners, winListeners, store };
}
function consentProblems(src) {
  const out = [];
  const r = run(src);
  const b = r.banner();
  if (!b) return ['no banner'];
  // banner 200px tall, 16px from the bottom of a 667px viewport: reserve 200 + 16 + 16 = 232px
  if (r.body.style.paddingBottom !== '232px') out.push(`body padding ${r.body.style.paddingBottom}`);
  if (r.html.style.scrollPaddingBottom !== '232px') out.push(`scroll-padding ${r.html.style.scrollPaddingBottom}`);
  r.focus(r.link(500, 520)); // hidden under the banner (top 451)
  if (r.scrolls.at(-1) !== 85) out.push(`focused link under banner scrolled ${r.scrolls.at(-1)}`);
  const n = r.scrolls.length;
  r.focus(r.link(100, 120));
  const allow = b.children[1].children[0]; allow.rect = { top: 600, bottom: 640, height: 40 };
  r.focus(allow); // the Allow button sits inside the banner: never scroll for it
  if (r.scrolls.length !== n) out.push('scrolled for a visible link or a banner button');
  b.children[1].children[1].click(); // Necessary only
  if (r.banner()) out.push('banner not removed');
  if (r.body.style.paddingBottom !== '' || r.html.style.scrollPaddingBottom !== undefined && r.html.style.scrollPaddingBottom !== '') out.push('space not released');
  r.focus(r.link(500, 520));
  if (r.scrolls.length !== n) out.push('focusin still active after dismiss');
  if ((r.winListeners.resize || []).length) out.push('resize listener left behind');
  if ((r.docListeners.focusin || []).length) out.push('focusin listener left behind');
  if (r.store.get('elorumtech-analytics-consent') !== 'denied') out.push('consent not stored');
  // existing inline padding is restored, not wiped
  const p = run(src, { bodyPadding: '10px' });
  p.banner().children[1].children[0].click();
  if (p.body.style.paddingBottom !== '10px') out.push(`restored padding ${p.body.style.paddingBottom}`);
  // resize recomputes (taller banner on a narrow screen)
  const q = run(src);
  q.banner().rect = { top: 667 - 16 - 300, bottom: 651, height: 300 };
  (q.winListeners.resize || []).forEach((f) => f());
  if (q.body.style.paddingBottom !== '332px') out.push(`resize reserve ${q.body.style.paddingBottom}`);
  // a returning visitor who already chose sees no banner and no padding
  const g = run(src, { consent: 'denied' });
  if (g.banner() || g.body.style.paddingBottom) out.push('banner or padding with stored consent');
  return out;
}

test('CLEANUP-01 consent banner: reserves space, scrolls focus out from under it, releases on dismiss (#36 F4, #38 R3)', () => {
  assert.deepEqual(consentProblems(ANALYTICS), []);
});

test('CLEANUP-01 consent banner: mutants (no reserve, no release, no focusin, wrong offset, banner buttons scroll)', () => {
  const muts = [
    ANALYTICS.replace('    document.body.appendChild(banner);\n    reserveSpace(banner);', '    document.body.appendChild(banner);'),
    ANALYTICS.replace('    if (banner) banner.remove();\n    releaseSpace();', '    if (banner) banner.remove();'),
    ANALYTICS.replace('    document.addEventListener("focusin", onFocusIn);\n  }', '  }'),
    ANALYTICS.replace('Math.ceil(rect.bottom - top + 16)', 'Math.ceil(rect.bottom - top)'),
    ANALYTICS.replace(' || banner.contains(target)) return;', ') return;'),
    ANALYTICS.replace('    document.removeEventListener("focusin", onFocusIn);\n', ''),
    ANALYTICS.replace('    root.style.scrollPaddingBottom = px;\n', ''),
    ANALYTICS.replace('return Math.ceil(rect.height + bottomGap + 16);', 'return Math.ceil(rect.height);'),
  ];
  for (const [i, m] of muts.entries()) {
    assert.notEqual(m, ANALYTICS, `mutation ${i} must change analytics.js`);
    assert.ok(consentProblems(m).length > 0, `mutant ${i} survived`);
  }
});

// ---------- theme CSS (#33 NB-1, NB-4) ----------
const CSS = read('assets/elorum-theme.css');
const cssProblems = (css) => {
  const out = [];
  if (!css.includes('.tablewrap{scroll-padding-inline:40px}')) out.push('tablewrap scroll-padding-inline');
  if (!css.includes('nav[aria-label="Breadcrumb"] a:focus-visible,.tbl a:focus-visible,.tablewrap a:focus-visible{padding:3px 0}')) out.push('focus padding');
  if (css.length >= 12000 || /@import|url\(|http/.test(css)) out.push('theme budget');
  return out;
};
test('CLEANUP-01 theme: .tablewrap scroll-padding-inline site-wide, focus-ring room on small links, budget kept', () => {
  assert.deepEqual(cssProblems(CSS), []);
  // the pages that had no page-local rule (tbdock [I1]–[I4] among them) now get it from the theme
  for (const f of ['guides/thunderbolt-dock-one-cable-4k-120.html', 'guides/external-monitor-not-detected.html', 'guides/display-connection-solver.html', 'guides/monitor-stuck-at-60hz.html', 'guides/usb-c-dock-display-limits.html']) {
    const h = read(f);
    assert.ok(h.includes('class="tablewrap"'), f);
    assert.ok(h.includes('<link rel="stylesheet" href="/assets/elorum-theme.css"></head>'), f);
  }
});
test('CLEANUP-01 theme: mutants', () => {
  for (const m of [CSS.replace('.tablewrap{scroll-padding-inline:40px}', ''), CSS.replace('a:focus-visible{padding:3px 0}', 'a:focus-visible{padding:3px 2px}'), CSS + '@import "x.css";', CSS + 'x'.repeat(12000)]) {
    assert.notEqual(m, CSS); assert.ok(cssProblems(m).length > 0);
  }
});

// ---------- #39 F5 / R1: inferences marked, sources scoped ----------
const PAGES39 = {
  'guides/displayport-monitor-connection-path.html': (h) => h.includes('<td>Our reading: Xbox lists only an HDMI port for video, so use the monitor’s HDMI input</td>') && !h.includes('<td>No DisplayPort output: use the monitor’s HDMI input</td>'),
  'guides/usb-c-hub-vs-dock.html': (h) => h.includes(`<td>Up to 240W from Thunderbolt 5 docking solutions, per Intel’s brief ${C('IN2')}</td>`) && !h.includes(`<td>Up to 240W ${C('IN2')}</td>`)
    && JSON.parse(read('docs/sources/usb-c-hub-vs-dock.json')).sources.find((s) => s.id === 'IN2').quotes.some((q) => q.startsWith('Thunderbolt 5 offers the simplest, most reliable, and fastest docking solutions')),
  'guides/usb-c-to-hdmi-adapter-path.html': (h) => h.includes('Our reading: the result is capped by both the host’s Alt Mode link and the HDMI level the adapter outputs, whichever is lower.</p>') && !h.includes('The HDMI level the adapter outputs sets the ceiling.'),
  'guides/macbook-to-hdmi-display.html': (h) => {
    const lead = (h.match(/<p class="lead">([\s\S]*?)<\/p>/) || ['', ''])[1];
    const parts = lead.split(C('AP1'));
    // exactly two [AP1]; the Windows-laptop sentence comes after the last one and is marked as ours
    return parts.length === 3 && /Apple’s path is an adapter to HDMI, then an HDMI cable to the TV or monitor $/.test(parts[1]) && /Many USB-C Windows laptops also lack HDMI and use the same kind of adapter or a dock’s HDMI out \(our general guidance, not from Apple\)\./.test(parts[2]) && !/Windows/.test(parts[0] + parts[1]);
  },
};
test('CLEANUP-01 #39 F5/R1: Xbox and adapter-ceiling inferences marked, 240W scoped to TB5 docks, [AP1] only on the Mac path', () => {
  for (const [f, ok] of Object.entries(PAGES39)) assert.ok(ok(read(f)), f);
});
test('CLEANUP-01 #39 F5/R1: mutants (old wordings back)', () => {
  const muts = [
    ['guides/displayport-monitor-connection-path.html', (h) => h.replace('<td>Our reading: Xbox lists only an HDMI port for video, so use the monitor’s HDMI input</td>', '<td>No DisplayPort output: use the monitor’s HDMI input</td>')],
    ['guides/usb-c-hub-vs-dock.html', (h) => h.replace(`<td>Up to 240W from Thunderbolt 5 docking solutions, per Intel’s brief ${C('IN2')}</td>`, `<td>Up to 240W ${C('IN2')}</td>`)],
    ['guides/usb-c-to-hdmi-adapter-path.html', (h) => h.replace('Our reading: the result is capped by both the host’s Alt Mode link and the HDMI level the adapter outputs, whichever is lower.</p>', 'The HDMI level the adapter outputs sets the ceiling.</p>')],
    ['guides/macbook-to-hdmi-display.html', (h) => h.replace(' (our general guidance, not from Apple).', `. ${C('AP1')}`)],
    ['guides/macbook-to-hdmi-display.html', (h) => h.replace('Many USB-C Windows laptops also lack HDMI and use the same kind of adapter or a dock’s HDMI out (our general guidance, not from Apple).', 'Many USB-C Windows laptops also lack HDMI and use the same kind of adapter or a dock’s HDMI out.')],
  ];
  for (const [f, mut] of muts) { const h = read(f); const m = mut(h); assert.notEqual(m, h, f); assert.equal(PAGES39[f](m), false, f); }
});

// ---------- #40 F4: FAQPage JSON-LD == visible FAQ; usb-c-laptop dates ----------
const FAQ_PAGES = { 'index.html': 3, 'guides/ps5-hdmi-2-1-cable-path.html': 5, 'compatibility/ps5-dell-u2725qe.html': 4, 'guides/usb-c-laptop-to-4k-monitor.html': 4 };
const visFaq = (h) => [...h.matchAll(/<details[^>]*>\s*<summary[^>]*>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/g)].map((m) => [txt(m[1]), txt(m[2])]);
const ldFaq = (h) => { const m = h.match(/<script type="application\/ld\+json">([^<]*"FAQPage"[^<]*)<\/script>/); return m ? JSON.parse(m[1]).mainEntity.map((q) => [q.name, q.acceptedAnswer.text]) : null; };
const faqOk = (h, n) => { const v = visFaq(h); return v.length === n && JSON.stringify(ldFaq(h)) === JSON.stringify(v); };
test('CLEANUP-01 #40 F4: FAQPage JSON-LD equals the visible FAQ on the four pages QA-01 listed', () => {
  for (const [f, n] of Object.entries(FAQ_PAGES)) assert.ok(faqOk(read(f), n), f);
});
test('CLEANUP-01 #40 F4: FAQ mutants (paraphrased answer, dropped entry, trailing space, renamed question)', () => {
  const h = read('guides/ps5-hdmi-2-1-cable-path.html');
  const muts = [
    h.replace('"text":"Usually no. Keep it if it already delivers your target mode."', '"text":"Usually no. Keep the supplied cable if it already delivers your target mode."'),
    h.replace(/,\{"@type":"Question","name":"Does DisplayPort matter for a PS5 cable choice\?"[^\]]*?\}\}(?=\])/, ''),
    h.replace('"text":"Usually no. Keep it if it already delivers your target mode."', '"text":"Usually no. Keep it if it already delivers your target mode. "'),
    h.replace('"name":"Is HDMI 2.1 the same as Ultra High Speed HDMI?"', '"name":"Is HDMI 2.1 the same as Ultra High Speed?"'),
  ];
  for (const [i, m] of muts.entries()) { assert.notEqual(m, h, `mutation ${i}`); assert.equal(faqOk(m, 5), false, `mutant ${i} survived`); }
  const ix = read('index.html');
  const mi = ix.replace('"name":"Why is USB-C alone not enough?"', '"name":"Why is USB-C alone not enough for compatibility?"');
  assert.notEqual(mi, ix); assert.equal(faqOk(mi, 3), false);
});

const LAPTOP = 'guides/usb-c-laptop-to-4k-monitor.html';
const LAPTOP_URL = `https://elorumtech.elorum.world/${LAPTOP}`;
// Last visible text change on main: #24 (4597818, 2026-10-18, Solver paragraph). #8/#9 (09-25) only added links /
// bumped dateModified; #40 only added the byline; CLEANUP-01 only touches the FAQ JSON-LD.
const datesProblems = (h, sm, gate) => {
  const out = [];
  const v = (h.match(/<p class="updated"[^>]*>Updated: (\d{4}-\d{2}-\d{2})<\/p>/) || [])[1];
  const dm = (h.match(/"dateModified":"(\d{4}-\d{2}-\d{2})"/) || [])[1];
  const lm = (sm.match(new RegExp(`<loc>${LAPTOP_URL.replace(/[.\/]/g, '\\$&')}</loc>\\s*<lastmod>([^<]+)</lastmod>`)) || [])[1];
  const g = gate.pages.filter((p) => p.file === LAPTOP);
  for (const [k, x] of [['Updated', v], ['dateModified', dm], ['sitemap', lm]]) if (x !== '2026-10-18') out.push(`${k} ${x}`);
  if (JSON.stringify(g) !== JSON.stringify([{ file: LAPTOP, url: LAPTOP_URL, visibleUpdated: true, intendedReleaseDate: '2026-10-18' }])) out.push('gate entry');
  return out;
};
test('CLEANUP-01 #40 F4: usb-c-laptop Updated, dateModified, sitemap and gate all 2026-10-18 (last visible text change, #24)', () => {
  assert.deepEqual(datesProblems(read(LAPTOP), read('sitemap.xml'), JSON.parse(read('docs/release-date-gate.json'))), []);
});
test('CLEANUP-01 #40 F4: date mutants', () => {
  const h = read(LAPTOP); const sm = read('sitemap.xml'); const gate = JSON.parse(read('docs/release-date-gate.json'));
  assert.notDeepEqual(datesProblems(h.replace('>Updated: 2026-10-18<', '>Updated: 2026-09-19<'), sm, gate), []);
  assert.notDeepEqual(datesProblems(h.replace('"dateModified":"2026-10-18"', '"dateModified":"2026-09-25"'), sm, gate), []);
  assert.notDeepEqual(datesProblems(h, sm.replace(`${LAPTOP_URL}</loc>\n    <lastmod>2026-10-18`, `${LAPTOP_URL}</loc>\n    <lastmod>2026-09-25`), gate), []);
  assert.notDeepEqual(datesProblems(h, sm, { ...gate, pages: gate.pages.filter((p) => p.file !== LAPTOP) }), []);
  assert.notDeepEqual(datesProblems(h, sm, { ...gate, pages: gate.pages.map((p) => (p.file === LAPTOP ? { ...p, intendedReleaseDate: '2026-10-23' } : p)) }), []);
});
