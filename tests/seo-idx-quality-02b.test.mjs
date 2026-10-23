// IDX-QUALITY-02B (ELORUMTECH-IDX-QUALITY-02B-20261024-01): the IDX-QUALITY-02A quality package on the 6 existing
// console / handheld / receiver pages. Same checks as tests/seo-idx-quality-02a.test.mjs: one distinct table per page,
// every figure in a cited cell sits in the cited source's verbatim quotes (docs/sources/<page>.json), resolution@rate
// pairs are not recombined, uncited cells carry no unit figures; byline + Last reviewed; dates on exactly these pages
// (plus the 5 IDX-QUALITY-02A pages, also shipped 2026-10-24); frozen title/meta/H1/canonical/FAQ (hashed on main
// 366f37d); visible FAQ == FAQ JSON-LD; hub + sibling links; MI-SOLV-043..052 console items excluded
// (PS5/Xbox FRL link speeds, Switch 2 dock HDMI version, Switch 2 TV-mode VRR, Steam Deck OLED DP version). 10 mutants.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const BASE = 'https://elorumtech.elorum.world/';
const DATE = '2026-10-24';
const JOB = 'ELORUMTECH-IDX-QUALITY-02B-20261024-01';
const THEME = '<link rel="stylesheet" href="/assets/elorum-theme.css">';
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', rsquo: '’', ldquo: '“', rdquo: '”', '#x27': "'", '#39': "'" };
const txt = (s) => s.replace(/<[^>]+>/g, ' ').replace(/&(#?[a-z0-9]+);/g, (m, n) => ENT[n] ?? m).replace(/\s+/g, ' ').trim();
const norm = (s) => s.replace(/×/g, 'x').replace(/\u2011/g, '-').replace(/\s+/g, ' ').trim();
const lds = (h) => [...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
const UNK = 'UNKNOWN — check the manual';

const HUB = 'console-handheld-display-hub.html';
// Switch 2: no dock HDMI version (MI-SOLV-044) and no TV-mode VRR (043). PS5/Xbox: no FRL link speeds (045/046).
const NO_FRL = [/FRL/i, /\b(?:24|32|40) ?Gbps\b/];
const PAGES = {
  'guides/ps5-hdmi-2-1-cable-path.html': { h2: 'ps5-4k120-checks', label: 'PS5 4K 120 Hz checks', ids: ['SNY3', 'SNY1', 'HDM1'], hub: HUB, sib: 'console-hdmi-avr-passthrough-path.html', rows: 7, block: NO_FRL },
  'guides/ps5-to-1440p-monitor.html': { h2: 'ps5-1440p-settings', label: 'PS5 1440p settings and monitor needs', ids: ['SNY2', 'SNY3'], hub: HUB, sib: 'ps5-hdmi-2-1-cable-path.html', rows: 5, block: NO_FRL },
  'guides/xbox-series-display-compatibility.html': { h2: 'xbox-spec-side-by-side', label: 'Xbox Series X vs Series S display specs', ids: ['XBX2', 'XBX1', 'HDM1'], hub: HUB, sib: 'ps5-hdmi-2-1-cable-path.html', rows: 7, block: NO_FRL },
  'guides/nintendo-switch-2-display-path.html': { h2: 'switch-2-tv-mode-parts', label: 'Switch 2 TV mode parts', ids: ['NIN1', 'NIN2', 'NIN4'], hub: HUB, sib: 'steam-deck-external-display.html', rows: 5, block: [/HDMI ?\d\.\d/, /VRR/i] },
  'guides/steam-deck-external-display.html': { h2: 'deck-port-vs-dock', label: 'Steam Deck port vs Docking Station video limits', ids: ['VLV1', 'VLV2', 'VLV3'], hub: HUB, sib: 'nintendo-switch-2-display-path.html', rows: 4, oledRow: true },
  'guides/console-hdmi-avr-passthrough-path.html': { h2: 'avr-signal-format', label: 'Denon 4K/8K Signal Format worked example', ids: ['DEN1', 'SNY3', 'HDM1'], hub: HUB, sib: 'ps5-hdmi-2-1-cable-path.html', rows: 5, block: NO_FRL },
};
const FILES = Object.keys(PAGES);
// IDX-QUALITY-02A shipped these on the same date; they are not "bumped" by this job.
const ALSO_TODAY = ['guides/usb-c-laptop-to-4k-monitor.html', 'guides/usb4-vs-thunderbolt-4-monitor.html', 'guides/laptop-to-docking-station.html', 'guides/dual-monitor-dock-mst-vs-thunderbolt.html', 'guides/monitor-stuck-at-60hz.html'];

// sha256 of title, meta description, H1, canonical, FAQPage JSON-LD and the visible FAQ section on main 366f37d.
const frozen = (h) => {
  const g = (re) => (h.match(re) || [, ''])[1];
  const faqLd = [...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]).filter((x) => /"FAQPage"/.test(x));
  const faq = (h.match(/<section class="faq"[\s\S]*?<\/section>/) || [''])[0];
  return crypto.createHash('sha256').update([g(/<title>([^<]*)<\/title>/), g(/<meta name="description" content="([^"]*)">/), g(/<h1[^>]*>([\s\S]*?)<\/h1>/), g(/rel="canonical" href="([^"]*)"/), faqLd.join('\n'), faq].join('\u0000')).digest('hex');
};
const FROZEN = {
  'guides/ps5-hdmi-2-1-cable-path.html': '46a1e9450f4ae889d69fc4a3103542e4b4656f4362279e921ab3c613deb66d62',
  'guides/ps5-to-1440p-monitor.html': '1f718f500e06f39dc95fa1fc977c912731ecbea3503a3e5842849fdbb6bb9ca3',
  'guides/xbox-series-display-compatibility.html': '92a90623690b5111d121424ce6849f92ab4ab8ee316215cdbbeca2ed8a215178',
  'guides/nintendo-switch-2-display-path.html': 'bfa3cfc2dac26b299341c787defe02ce76a85d643449c61c351f8d4d0852ecb9',
  'guides/steam-deck-external-display.html': '8a4d2932ea16e3b40ca736ca767bb42928b691d09cc8f07a4270a414d953a798',
  'guides/console-hdmi-avr-passthrough-path.html': '7b5b5dcb9179134d74dff360e3b21630b4c478f8108b504fd2dd426d2ed86a31',
};

// Console, handheld and receiver makers plus the HDMI cable certification body only. No vendor claims in this job.
const PRIMARY = /^https:\/\/(www\.playstation\.com|www\.xbox\.com|www\.nintendo\.com|support\.nintendo\.com|en-americas-support\.nintendo\.com|www\.steamdeck\.com|manuals\.denon\.com|www\.hdmi\.org)\//;
const VENDOR = /^$/;
const KINDS = ['standard_body', 'manufacturer_spec', 'manufacturer_support', 'manufacturer_manual'];
const MI_TABLE = [/Steam Deck OLED[^.]*DisplayPort 1\.4/i, /gadgetdatabase/i];

const srcJson = (f) => JSON.parse(read('docs/sources/' + path.basename(f, '.html') + '.json'));
const tableOf = (h, label) => {
  const i = h.indexOf(`<div class="tablewrap" role="region" aria-label="${label}" tabindex="0">`);
  if (i < 0) return '';
  const j = h.indexOf('</table></div>', i);
  return j < 0 ? '' : h.slice(i, j + 14);
};
const cites = (cell) => [...cell.matchAll(/<a class="srcs" href="#src-([A-Z0-9]+)">\[\1\]<\/a>/g)].map((m) => m[1]);
const stripCites = (cell) => cell.replace(/<a class="srcs" href="#src-[A-Z0-9]+">\[[A-Z0-9]+\]<\/a>/g, '');
const nums = (s) => new Set(norm(s).match(/\d+(?:\.\d+)?/g) || []);
const RES = String.raw`\d+K|\d{3,4} ?x ?\d{3,4}`;
const FILL = String.raw`(?:(?!\d+ ?Hz)[^;.]){0,45}?`;
const pairs = (s) => [...norm(s).matchAll(new RegExp(`(${RES})${FILL}(\\d+) ?Hz`, 'g'))].map((m) => [m[1], m[2]]);
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, ' ?');
const UNIT = /\d+(?:\.\d+)? ?(?:Gbps|Gb\/s|Hz|W\b|K\b)|\d{3,4} ?[x×] ?\d{3,4}/;

// Problems in one page's table + sources (empty array = OK).
function tableProblems(f, h, j) {
  const P = PAGES[f]; const out = [];
  const t = tableOf(h, P.label);
  if (!t) return ['table missing'];
  if (!h.includes(`<h2 id="${P.h2}">`)) out.push('heading id');
  if (!/<caption>[^<]{20,}/.test(t)) out.push('caption');
  if (!/<th scope="col">/.test(t)) out.push('th scope=col');
  const rows = [...t.matchAll(/<tr><th scope="row">([\s\S]*?)<\/th>([\s\S]*?)<\/tr>/g)];
  if (rows.length !== P.rows) out.push(`rows ${rows.length}`);
  const byId = Object.fromEntries((j.sources || []).map((s) => [s.id, s]));
  if (j.schema !== 'elorumtech-guide-sources/1' || j.job !== JOB || j.page !== f) out.push('json header');
  if (JSON.stringify((j.sources || []).map((s) => s.id)) !== JSON.stringify(P.ids)) out.push('json ids');
  for (const s of j.sources || []) {
    const vend = VENDOR.test(s.url);
    if (!PRIMARY.test(s.url) && !vend) out.push(`host ${s.id} ${s.url}`);
    if (!!s.vendor_claim !== vend) out.push(`vendor_claim flag ${s.id}`);
    if (!KINDS.includes(s.kind)) out.push(`kind ${s.id}`);
    if (!new RegExp(`^${DATE}T\\d\\d:\\d\\d:\\d\\d\\+02:00$`).test(s.checked_at || '')) out.push(`checked_at ${s.id}`);
    if (!Array.isArray(s.quotes) || !s.quotes.length || s.quotes.some((q) => typeof q !== 'string' || q.length < 4)) out.push(`quotes ${s.id}`);
    const li = (h.match(new RegExp(`<li id="src-${s.id}">([\\s\\S]*?)</li>`)) || [])[1];
    if (!li) { out.push(`li missing ${s.id}`); continue; }
    if (!li.includes(`href="${s.url}"`)) out.push(`li url ${s.id}`);
    if (!(P.gen || []).includes(s.id) && vend !== li.includes('(vendor claim)')) out.push(`li vendor label ${s.id}`);
    if (!/checked 2026-10-\d\d \d\d:\d\d CEST/.test(li)) out.push(`li checked ${s.id}`);
  }
  for (const id of new Set(cites(h))) if (!h.includes(`<li id="src-${id}">`)) out.push(`dangling citation ${id}`);
  for (const [, , rest] of rows) {
    for (const [, cell] of rest.matchAll(/<td>([\s\S]*?)<\/td>/g)) {
      const ids = cites(cell); const body = txt(stripCites(cell));
      if (!ids.length) {
        if (UNIT.test(body)) out.push(`uncited figure: ${body}`);
        continue;
      }
      for (const id of ids) {
        if (!byId[id]) { out.push(`cell cites ${id} not in json`); continue; }
        if (byId[id].vendor_claim && !body.includes('(vendor claim)')) out.push(`unlabelled vendor claim ${id}`);
      }
      const quotes = ids.filter((id) => byId[id]).flatMap((id) => byId[id].quotes).map(norm).join(' \u2016 ');
      const have = nums(quotes);
      for (const n of nums(body)) if (!have.has(n)) out.push(`figure ${n} not in [${ids}]: ${body}`);
      for (const [r, hz] of pairs(body)) if (!new RegExp(`${esc(r)}${FILL}${hz} ?Hz`).test(quotes)) out.push(`pair ${r}@${hz}Hz not in [${ids}]`);
    }
  }
  return out;
}

// [text in a cell, the id that cell must cite, text the source's quote must contain]
const FIGURES = {
  'guides/ps5-hdmi-2-1-cable-path.html': [
    ['Support of 4K 120Hz TVs, 8K TVs and VRR, specified by HDMI ver.2.1', 'SNY1', 'Support of 4K 120Hz TVs, 8K TVs, VRR (specified by HDMI ver.2.1)'],
    ['appropriate HDMI port (2.1)', 'SNY3', 'appropriate HDMI port (2.1) on the TV'],
    ['up to 48Gbps maximum bandwidth', 'HDM1', 'up to 48Gbps maximum bandwidth'],
    ['-1 or -2 limit output', 'SNY3', 'try selecting -1 or -2 to limit output'],
  ],
  'guides/ps5-to-1440p-monitor.html': [
    ['1440p/60Hz, or 1440p/60Hz and 120Hz', 'SNY2', 'supports 1440p/60Hz, or 1440p/60Hz and 120Hz'],
    ['SDR/HDR 60 Hz/120 Hz and VRR', 'SNY3', 'SDR/HDR 60 Hz/120 Hz and VRR video output'],
    ['HDMI 2.1 VRR-compatible TV or PC monitor', 'SNY2', 'HDMI 2.1 VRR-compatible TVs and PC monitors'],
  ],
  'guides/xbox-series-display-compatibility.html': [
    ['True 4K', 'XBX2', 'Gaming Resolution. True 4K'],
    ['Up to 8K HDR', 'XBX2', 'High Dynamic Range. Up to 8K HDR'],
    ['up to 48Gbps maximum bandwidth', 'HDM1', 'up to 48Gbps maximum bandwidth'],
  ],
  'guides/nintendo-switch-2-display-path.html': [
    ['3840x2160 (4K) at 60 fps', 'NIN1', 'Maximum of 3840x2160 (4K) resolution at 60 fps (TV mode)'],
    ['120 fps when 1920x1080/2560x1440', 'NIN1', 'Supports 120 fps when 1920x1080/2560x1440 resolutions are selected'],
    ['model no. NGN-01', 'NIN4', 'A Nintendo Switch 2 AC Adapter (model no. NGN-01)'],
  ],
  'guides/steam-deck-external-display.html': [
    ['DisplayPort 1.4 Alt-mode', 'VLV1', 'USB-C with DisplayPort 1.4 Alt-mode support'],
    ['Up to 4k 60hz, or 1440p 120hz', 'VLV3', 'Supports up to 4k 60hz, or 1440p 120hz'],
    ['HDMI 2.0', 'VLV3', 'HDMI 2.0'],
  ],
  'guides/console-hdmi-avr-passthrough-path.html': [
    ['4K 60Hz 4:2:0 8 bit', 'DEN1', 'support 4K 60Hz 4:2:0 8 bit video signals'],
    ['8K 60Hz or 4K 120Hz', 'DEN1', 'high quality 8K 60Hz or 4K 120Hz video signals'],
    ['up to 48Gbps maximum bandwidth', 'HDM1', 'up to 48Gbps maximum bandwidth'],
  ],
};
// Negations and limits that must survive verbatim (case-insensitive) in the cell and in the cited source quote.
const NEGATIONS = {
  'guides/ps5-hdmi-2-1-cable-path.html': [['VRR is disabled during 8K output', 'SNY3']],
  'guides/ps5-to-1440p-monitor.html': [['turn off this setting', 'SNY3']],
  'guides/xbox-series-display-compatibility.html': [['Up to 120 FPS: Requires supported content and display', 'XBX1']],
  'guides/nintendo-switch-2-display-path.html': [['is not Ultra High Speed and cannot be used', 'NIN4'], ['Switch dock cannot be used', 'NIN2'], ['no video output to the TV', 'NIN2']],
  'guides/steam-deck-external-display.html': [['requires both the HDMI and DisplayPort ports to be in use', 'VLV3']],
  'guides/console-hdmi-avr-passthrough-path.html': [['may not be output correctly', 'DEN1']],
};
function figureProblems(f, h, j) {
  const out = []; const t = tableOf(h, PAGES[f].label);
  const cells = [...t.matchAll(/<td>([\s\S]*?)<\/td>/g)].map((m) => m[1]);
  const byId = Object.fromEntries((j.sources || []).map((s) => [s.id, s]));
  for (const [onPage, id, inSource] of FIGURES[f]) {
    const hit = cells.filter((c) => norm(txt(c)).includes(norm(onPage)));
    if (!hit.length) out.push(`figure missing: ${onPage}`);
    else if (!hit.every((c) => cites(c).includes(id))) out.push(`figure ${onPage} not cited [${id}]`);
    if (!byId[id] || !byId[id].quotes.some((q) => norm(q).includes(norm(inSource)))) out.push(`quote missing ${id}: ${inSource}`);
  }
  for (const [neg, id] of NEGATIONS[f]) {
    const hit = cells.filter((c) => txt(c).toLowerCase().includes(neg.toLowerCase()));
    if (!hit.length || !hit.every((c) => cites(c).includes(id))) out.push(`negation lost: ${neg}`);
    if (!byId[id] || !byId[id].quotes.some((q) => q.toLowerCase().includes(neg.toLowerCase()))) out.push(`negation not in ${id}: ${neg}`);
  }
  return out;
}

const PUBLISHED = JSON.parse(read('docs/date-published.json')).pages;
const urlOf = (f) => BASE + f;
const lastmod = (sm, f) => (sm.match(new RegExp(`<loc>${urlOf(f).replace(/[.\/]/g, '\\$&')}</loc>\\s*<lastmod>([^<]+)</lastmod>`)) || [])[1];
function dateProblems(files, read2, sm, gate) {
  const out = [];
  if (gate.intendedReleaseDate !== DATE) out.push('gate top-level');
  for (const f of files) {
    const h = read2(f);
    if ((h.match(/<p class="updated"[^>]*>Updated: (\d{4}-\d\d-\d\d)<\/p>/) || [])[1] !== DATE) out.push(`Updated ${f}`);
    const dm = [...h.matchAll(/"dateModified":"([^"]+)"/g)].map((m) => m[1]);
    if (JSON.stringify(dm) !== JSON.stringify([DATE])) out.push(`dateModified ${f}`);
    const art = lds(h).find((d) => d['@type'] === 'TechArticle');
    if (!art || art.datePublished !== PUBLISHED[f].datePublished) out.push(`datePublished ${f}`);
    if (lastmod(sm, f) !== DATE) out.push(`lastmod ${f}`);
    const g = gate.pages.filter((p) => p.file === f);
    if (JSON.stringify(g) !== JSON.stringify([{ file: f, url: urlOf(f), visibleUpdated: true, intendedReleaseDate: DATE }])) out.push(`gate ${f}`);
  }
  // Untouched pages are not bumped to this job's date.
  for (const p of gate.pages) if (p.intendedReleaseDate === DATE && !files.includes(p.file) && !ALSO_TODAY.includes(p.file)) out.push(`gate bumped ${p.file}`);
  for (const m of sm.matchAll(/<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g)) if (m[2] === DATE && !files.map(urlOf).includes(m[1]) && !ALSO_TODAY.map(urlOf).includes(m[1])) out.push(`lastmod bumped ${m[1]}`);
  return out;
}
const allHtml = () => {
  const out = [];
  const walk = (d) => { for (const e of fs.readdirSync(path.join(root, d), { withFileTypes: true })) { if (['node_modules', '.git', 'tests', 'docs', 'display', 'tools', 'assets'].includes(e.name)) continue; const r = d ? `${d}/${e.name}` : e.name; if (e.isDirectory()) walk(r); else if (r.endsWith('.html')) out.push(r); } };
  walk(''); return out.sort();
};
function untouchedDateProblems(files) {
  const out = [];
  for (const f of allHtml()) if (!files.includes(f) && !ALSO_TODAY.includes(f) && /"dateModified":"2026-10-24"|Updated: 2026-10-24/.test(read(f))) out.push(`bumped ${f}`);
  return out;
}

const BYLINE = `<p class="byline" style="color:#738094;font-size:13px">By <a href="../about.html#editor">Nicki A.</a> · Last reviewed: ${DATE} against the primary sources listed below</p>`;
function signalProblems(f, h) {
  const out = []; const P = PAGES[f];
  if (frozen(h) !== FROZEN[f]) out.push('frozen fields changed');
  if (h.split(BYLINE).length !== 2) out.push('byline / Last reviewed');
  const art = lds(h).find((d) => d['@type'] === 'TechArticle') || {};
  if (JSON.stringify(art.author) !== JSON.stringify({ '@type': 'Person', name: 'Nicki A.' }) || JSON.stringify(art.publisher) !== JSON.stringify({ '@type': 'Organization', name: 'ELORUMTECH' })) out.push('author/publisher');
  if (h.split(THEME).length !== 2) out.push('theme link count');
  const body = (h.match(/<main[^>]*>([\s\S]*?)<section class="related"/) || [, ''])[1];
  for (const l of [P.hub, P.sib]) {
    if (!body.includes(`href="${l}"`)) out.push(`body link ${l}`);
    if (!fs.existsSync(path.join(root, 'guides', l))) out.push(`link target ${l}`);
  }
  const t = tableOf(h, P.label);
  const css = (h.match(/<style>([\s\S]*?)<\/style>/) || [, ''])[1];
  if (!/\.tablewrap\{overflow-x:auto/.test(css)) out.push('tablewrap overflow css');
  if (!t.includes('<caption>')) out.push('tablewrap caption');
  if (!h.includes(`<h2 id="${P.h2}">`) || h.indexOf(`<h2 id="${P.h2}">`) > h.indexOf(t)) out.push('table heading order');
  for (const re of [...MI_TABLE, ...(P.block || [])]) if (re.test(txt(t))) out.push(`MI-SOLV blocked in table: ${re}`);
  if (P.oledRow) { const r = (t.match(/<tr><th scope="row">Steam Deck OLED[\s\S]*?<\/tr>/) || [''])[0]; if (!r || /DisplayPort \d|DP ?\d/.test(txt(r))) out.push('Steam Deck OLED DP version stated'); }
  const sec = (h.match(/<section class="sources"[\s\S]*?<\/section>/) || [''])[0];
  if (!sec || !P.ids.every((id) => sec.includes(`<li id="src-${id}">`))) out.push('sources section');
  return out;
}
const faqPairs = (h) => {
  const vis = [...(h.match(/<section class="faq"[\s\S]*?<\/section>/) || [''])[0].matchAll(/<summary>([\s\S]*?)<\/summary>\s*<p>([\s\S]*?)<\/p>/g)].map((m) => [txt(m[1]), txt(m[2])]);
  const ld = (lds(h).find((d) => d['@type'] === 'FAQPage') || { mainEntity: [] }).mainEntity.map((q) => [q.name, q.acceptedAnswer.text]);
  return [vis, ld];
};
const shingles = (h, sel) => {
  const s = sel(h).replace(/<(script|style)[\s\S]*?<\/\1>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/g, ' ').toLowerCase().replace(/’/g, "'");
  const w = s.match(/[a-z0-9&']+/g) || []; const out = new Set();
  for (let i = 0; i + 5 <= w.length; i++) out.add(w.slice(i, i + 5).join(' '));
  return out;
};
const jac = (a, b) => { let n = 0; for (const x of a) if (b.has(x)) n++; const u = a.size + b.size - n; return u ? n / u : 0; };
const mainOf = (h) => (h.match(/<main[^>]*>([\s\S]*?)<\/main>/) || [, ''])[1];


// ---------------- tests ----------------
test('02b: every table cell is sourced, figures and resolution@rate pairs sit in the cited quotes', () => {
  for (const f of FILES) assert.deepEqual(tableProblems(f, read(f), srcJson(f)), [], f);
});
test('02b: key figures and negations are cited and verbatim in docs/sources/<page>.json', () => {
  for (const f of FILES) assert.deepEqual(figureProblems(f, read(f), srcJson(f)), [], f);
});
test('02b: frozen fields, byline + Last reviewed, author, one theme link, hub + sibling links, tablewrap, MI-SOLV-043..052 excluded', () => {
  for (const f of FILES) assert.deepEqual(signalProblems(f, read(f)), [], f);
});
test('02b: visible FAQ equals FAQPage JSON-LD on all 6 pages', () => {
  for (const f of FILES) { const [vis, ld] = faqPairs(read(f)); assert.ok(vis.length >= 3, f); assert.deepEqual(vis, ld, f); }
});
test('02b: Updated, dateModified, sitemap, gate = 2026-10-24 on exactly these 6 (+ the 5 02A) pages; datePublished unchanged', () => {
  assert.deepEqual(dateProblems(FILES, read, read('sitemap.xml'), JSON.parse(read('docs/release-date-gate.json'))), []);
  assert.deepEqual(untouchedDateProblems(FILES), []);
});
test('02b: sources JSON: no unverified MI-SOLV console values, no forum/blog hosts', () => {
  for (const f of FILES) {
    const raw = read('docs/sources/' + path.basename(f, '.html') + '.json');
    for (const re of PAGES[f].block || []) assert.doesNotMatch(raw, re, f);
    assert.doesNotMatch(raw, /reddit|\/\/(www\.)?forums?\.|medium\.com|blogspot|wordpress|tomshardware|rtings|displayspecifications/i, f);
  }
});
test('02b: tables are distinct (5-gram Jaccard <= 0.20 between the 6 tables and between any two site pages)', () => {
  const T = FILES.map((f) => shingles(read(f), (h) => tableOf(h, PAGES[f].label)));
  for (let i = 0; i < T.length; i++) for (let k = i + 1; k < T.length; k++) assert.ok(jac(T[i], T[k]) <= 0.2, `${FILES[i]} vs ${FILES[k]}`);
  const all = allHtml(); const S = all.map((f) => shingles(read(f), mainOf));
  let max = 0;
  for (let i = 0; i < S.length; i++) for (let k = i + 1; k < S.length; k++) max = Math.max(max, jac(S[i], S[k]));
  assert.ok(max <= 0.2, `max ${max}`);
});

// ---------------- mutants (10, per the owner's usage rule) ----------------
const [P1, P2, X, N, D, A] = FILES;
const TBL = (f, h, j) => [...tableProblems(f, h, j), ...figureProblems(f, h, j)];
const SIG = (f, h) => signalProblems(f, h);
const MUTANTS = [
  ['figure 48Gbps -> 96Gbps', X, (h) => h.replace('Ultra High Speed HDMI Cable: up to 48Gbps', 'Ultra High Speed HDMI Cable: up to 96Gbps'), TBL],
  ['recombine Switch 2 4K at 60 fps -> 4K at 120 fps', N, (h) => h.replace('3840x2160 (4K) at 60 fps', '3840x2160 (4K) at 120 fps'), TBL],
  ['recombine Denon 8K 60Hz -> 8K 120Hz', A, (h) => h.replace('<td>8K 60Hz or 4K 120Hz', '<td>8K 120Hz or 4K 120Hz'), TBL],
  ['delete negation "VRR is disabled during 8K output"', P1, (h) => h.replace('VRR is disabled during 8K output', 'VRR is enabled during 8K output'), TBL],
  ['dangling citation [ZZ9]', P2, (h) => h.replace('<a class="srcs" href="#src-SNY2">[SNY2]</a>', '<a class="srcs" href="#src-ZZ9">[ZZ9]</a>'), TBL],
  ['uncited figure in a Test-next cell', D, (h) => h.replace('the direct USB-C path', 'the direct USB-C path').replace('<td>USB 3.2 Gen 2 <a', '<td>USB 3.2 Gen 2 at 15W <a'), TBL],
  ['MI-SOLV-045: PS5 FRL link speed added', P1, (h) => h.replace('Nothing to change on the console side', 'Console link up to FRL 6'), SIG],
  ['MI-SOLV-044: Switch 2 dock HDMI version added', N, (h) => h.replace('HDMI port, AC adapter port', 'HDMI 2.1 port, AC adapter port'), SIG],
  ['MI-SOLV-052: Steam Deck OLED DP version stated', D, (h) => h.replace('Display port over Type C; version', 'DisplayPort 1.4 over Type C; version'), SIG],
  ['change H1 (frozen)', X, (h) => h.replace(/<h1([^>]*)>/, '<h1$1>New: '), SIG],
];
test('02b mutants: all 10 are killed', () => {
  assert.equal(MUTANTS.length, 10);
  for (const [name, f, hm, check] of MUTANTS) {
    const h0 = read(f); const h = hm(h0);
    assert.ok(h !== h0, `mutant did not change page: ${name}`);
    assert.ok(check(f, h, srcJson(f)).length > 0, `mutant survived: ${name}`);
  }
});
