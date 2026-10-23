// IDX-QUALITY-02A (ELORUMTECH-IDX-QUALITY-02A-20261024-01): sourced data tables + review signals on 5 PC/USB-C pages.
// Each page gets one distinct table (a different question per page). Every figure in a cited cell must appear in the
// verbatim quotes of the cited source in docs/sources/<page>.json, and every resolution + refresh-rate pair must
// appear as a pair in that source (no recombining "4K" from one sentence with "240Hz" from another). Sources are
// standards bodies or OEMs; CalDigit/Plugable only as labelled vendor claims. Uncited cells carry no unit figures
// (they say "UNKNOWN — check the manual" instead). Plus: byline + Last reviewed, dates (Updated, dateModified,
// sitemap, gate) on exactly these pages, datePublished from docs/date-published.json, frozen title/meta/H1/
// canonical/FAQ (hashed on main 67d616c), visible FAQ == FAQ JSON-LD, hub + sibling links in the body, one theme
// link, .tablewrap convention, MI-SOLV-043..052 excluded, 5-gram Jaccard <= 0.20. 10 targeted mutants at the end.
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
const JOB = 'ELORUMTECH-IDX-QUALITY-02A-20261024-01';
const THEME = '<link rel="stylesheet" href="/assets/elorum-theme.css">';
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', rsquo: '’', ldquo: '“', rdquo: '”', '#x27': "'", '#39': "'" };
const txt = (s) => s.replace(/<[^>]+>/g, ' ').replace(/&(#?[a-z0-9]+);/g, (m, n) => ENT[n] ?? m).replace(/\s+/g, ' ').trim();
const norm = (s) => s.replace(/×/g, 'x').replace(/\u2011/g, '-').replace(/\s+/g, ' ').trim();
const lds = (h) => [...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
const UNK = 'UNKNOWN — check the manual';

// One table per page; the question each answers is different (heading id + aria-label pinned).
const PAGES = {
  'guides/usb-c-laptop-to-4k-monitor.html': { h2: 'usb-c-monitor-match', label: 'USB-C monitor: what must match, part by part', ids: ['VA1', 'VES1', 'APL1', 'GIG1'], hub: 'display-connection-solver.html', sib: 'usb4-vs-thunderbolt-4-monitor.html', rows: 5 },
  'guides/usb4-vs-thunderbolt-4-monitor.html': { h2: 'minimum-guarantees', label: 'Minimum display guarantees: USB4, Thunderbolt 4, Thunderbolt 5', ids: ['U1', 'USB1', 'IN1', 'IN2'], hub: 'thunderbolt-dock-one-cable-4k-120.html', sib: 'laptop-to-docking-station.html', rows: 4 },
  'guides/laptop-to-docking-station.html': { h2: 'match-matrix', label: 'Host port × dock type: match matrix', ids: ['IN1', 'DEL1', 'APL3', 'CDG1', 'PL1', 'PL2'], hub: 'usb-c-hub-vs-dock.html', sib: 'dual-monitor-dock-mst-vs-thunderbolt.html', rows: 4 },
  'guides/dual-monitor-dock-mst-vs-thunderbolt.html': { h2: 'mst-vs-tunnelling', label: 'MST vs Thunderbolt tunnelling, side by side', ids: ['V4', 'IN1', 'IN3', 'DEL1', 'APL3', 'AP1'], hub: 'thunderbolt-dock-one-cable-4k-120.html', sib: 'laptop-to-docking-station.html', rows: 6 },
  'guides/monitor-stuck-at-60hz.html': { h2: 'all-causes', label: 'Every cause, and what to test next', ids: ['LG1', 'H1', 'PL2', 'MS3', 'CDG2', 'PS1'], hub: 'displayport-vs-hdmi.html', sib: 'usb-c-laptop-to-4k-monitor.html', rows: 6, gen: ['MS3', 'H1', 'PL2'] },
};
const FILES = Object.keys(PAGES);
// gen: ids whose <li> already exists in the generated @@GEN:sources-60hz block (display/standards.json, untouched by
// this job). Their li wording is the generator's; the table cell itself still has to carry the vendor label.

// sha256 of title, meta description, H1, canonical, FAQPage JSON-LD and the visible FAQ section, computed on
// main 67d616ce082d618c16d91561b16a8d3c350278f0. None may change in this job.
const frozen = (h) => {
  const g = (re) => (h.match(re) || [, ''])[1];
  const faqLd = [...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]).filter((x) => /"FAQPage"/.test(x));
  const faq = (h.match(/<section class="faq"[\s\S]*?<\/section>/) || [''])[0];
  return crypto.createHash('sha256').update([g(/<title>([^<]*)<\/title>/), g(/<meta name="description" content="([^"]*)">/), g(/<h1[^>]*>([\s\S]*?)<\/h1>/), g(/rel="canonical" href="([^"]*)"/), faqLd.join('\n'), faq].join('\u0000')).digest('hex');
};
const FROZEN = {
  'guides/usb-c-laptop-to-4k-monitor.html': 'b915809cd33c8ceceb9ce9ae8bc02532fabd783897c8c2e2e1e9926ca56f7dfc',
  'guides/usb4-vs-thunderbolt-4-monitor.html': 'd2aa22b22fffb644955cba3767bb2d62395f5652bac9c90216185792f49ca327',
  'guides/laptop-to-docking-station.html': '7151e7ee80de3a3e8b6bf2faef14a376a6c198c5afd58bcba70be7f0a45b6344',
  'guides/dual-monitor-dock-mst-vs-thunderbolt.html': '3810053d6d9215ae96cfd5902a69b52b698695fcb8ede9d012fba1e58838d37e',
  'guides/monitor-stuck-at-60hz.html': '871c8dd472e42a8b6a56af1709926834f56c1868a2fd72918527f84d6da827cb',
};

// Standards bodies, Intel and OEM pages only; CalDigit / Plugable allowed only as labelled vendor claims.
const PRIMARY = /^https:\/\/(vesa\.org|www\.displayport\.org|www\.usb\.org|hdmiforum\.org|www\.hdmi\.org|www\.intel\.com|www\.thunderbolttechnology\.net|www\.apple\.com|support\.apple\.com|support\.microsoft\.com|www\.dell\.com|www\.lg\.com|www\.gigabyte\.com|www\.playstation\.com)\//;
const VENDOR = /^https:\/\/(www\.caldigit\.com|kb\.plugable\.com)\//;
const KINDS = ['standard_body', 'manufacturer_spec', 'manufacturer_support'];
// MI-SOLV-043..052 (solver additions 2026-10-23) are excluded from this job.
// MI_BLOCK applies to the whole article body; MI_TABLE adds console FRL / tier terms and applies to the new table and
// the sources JSON (monitor-stuck already discusses HDMI 2.1 FRL in general terms on main).
const MI_BLOCK = [/VRR up to 120 Hz/i, /WD25TB5/, /SD25TB5/, /PG32UCDM/, /G80SD/, /thunderbolt-5-brief\.html/, /Steam Deck OLED/i, /RX 9070/, /M5 (Pro|Max)/, /gadgetdatabase/i, /Switch 2/i];
const MI_TABLE = [...MI_BLOCK, /FRL\b/, /PS5 Pro/i, /Xbox/i, /UHBR ?\d+ tier/i];

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

// Problems in one page's table + sources (empty array = OK). Used by the tests and by the mutants.
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
  'guides/usb-c-laptop-to-4k-monitor.html': [
    ['5.4 Gbps across all four high-speed lanes', 'VA1', 'Using 5.4 Gbps across all four high-speed lanes'],
    ['4K (4096 × 2160) at 60Hz', 'VA1', '4K (4096 x 2160) display resolutions at a 60Hz'],
    ['up to 10 Gbps in each direction', 'VA1', 'up to 10 Gbps in each direction'],
    ['4K UHD (3840 × 2160)', 'VA1', '4K UHD (3840 x 2160)'],
    ['Up to 80 Gbps', 'VES1', 'up to 80 Gigabits per second (Gbps)'],
    ['up to 40 Gbps alongside SuperSpeed USB data', 'VES1', 'up to 40 Gbps with simultaneous SuperSpeed USB data'],
    ['one display up to 4K at 240Hz', 'APL1', '4K at 240Hz'],
    ['6K at 60Hz or 4K at 144Hz', 'APL1', 'Two displays up to a native resolution of 6K at 60Hz or 4K at 144Hz'],
    ['with DSC capability', 'APL1', 'with DSC capability'],
    ['Power Delivery up to 65W', 'GIG1', 'Power Delivery up to 65W'],
    ['Displayport 2.1 (UHBR 20)', 'GIG1', 'Displayport 2.1 (UHBR 20) in'],
  ],
  'guides/usb4-vs-thunderbolt-4-monitor.html': [
    ['up to 80 Gbps over 80 Gbps certified cables', 'U1', 'up to 80 Gbps operation over 80 Gbps certified cables'],
    ['existing 40 Gbps USB Type-C passive cables', 'USB1', 'existing 40 Gbps USB Type-C passive cables'],
    ['40Gb/s', 'IN1', '40Gb/s performance'],
    ['two 4K displays or one 8K display', 'IN1', 'Support for two 4K displays or one 8K display'],
    ['less than 100W to charge', 'IN1', 'require less than 100W to charge'],
    ['80 Gbps of bidirectional bandwidth', 'IN2', '80 Gbps of bidirectional bandwidth'],
    ['120 Gbps', 'IN2', 'transmit speed to 120 Gbps'],
    ['Dual 6K, against Dual 4K', 'IN2', 'PC video requirements Dual 6K Dual 4K'],
    ['Required up to 140W, available up to 240W', 'IN2', 'Available up to 240W'],
  ],
  'guides/laptop-to-docking-station.html': [
    ['two 4K displays or one 8K display', 'IN1', 'Support for two 4K displays or one 8K display'],
    ['do not support triple displays', 'CDG1', 'do not support triple displays'],
    ['up to 3 displays over a single Thunderbolt port', 'APL3', 'up to 3 displays over a single Thunderbolt port'],
    ['limited to 60Hz refresh rate', 'PL1', 'limited to 60Hz refresh rate'],
    ['two or four of the USB SuperSpeed data lines', 'PL2', 'two or four of the USB SuperSpeed data lines'],
    ['(version 3 or higher)', 'DEL1', 'Thunderbolt (version 3 or higher)'],
  ],
  'guides/dual-monitor-dock-mst-vs-thunderbolt.html': [
    ['DisplayPort branch device', 'V4', 'DisplayPort branch device'],
    ['32.4 Gbps maximum, 25.92 Gbps effective', 'IN3', '1.3/1.4 32.4 Gbps 25.92 Gbps'],
    ['40 Gbps maximum, 34.56 Gbps effective', 'IN3', '3/4 40 Gbps 34.56 Gbps'],
    ['sum of your signals should be lower than the Max', 'IN3', 'the sum of your signals should be lower than the Max'],
    ['M3 Pro, or M3 Max', 'DEL1', 'M3 Pro, or M3 Max.'],
    ['Up to 3 displays over a single Thunderbolt port', 'APL3', 'up to 3 displays over a single Thunderbolt port'],
    ['two 4K displays or one 8K display', 'IN1', 'Support for two 4K displays or one 8K display'],
  ],
  'guides/monitor-stuck-at-60hz.html': [
    ['a DP 1.4 or HDMI 2.0 or higher cable is required', 'LG1', 'a DP 1.4 or HDMI 2.0 or higher cable is required'],
    ['up to 18Gbps', 'H1', 'up to 18Gbps'],
    ['4K@50/60', 'H1', '4K@50/60'],
    ['single 4K 60Hz display with USB 10Gbps data', 'PL2', 'a single 4K 60Hz display and USB 10Gbps data'],
    ['at least 120 Hz', 'MS3', 'a refresh rate of at least 120 Hz'],
    ['4K/144Hz', 'CDG2', 'Some 4K/144Hz monitors'],
    ['both settings limit 4K 120 Hz', 'PS1', 'the following output is limited: 4K 120 Hz'],
  ],
};
// Negations and limits that must survive verbatim (case-insensitive) in the cell and in the cited source quote.
const NEGATIONS = {
  'guides/usb-c-laptop-to-4k-monitor.html': [],
  'guides/usb4-vs-thunderbolt-4-monitor.html': [['require less than 100W', 'IN1']],
  'guides/laptop-to-docking-station.html': [['do not support triple displays', 'CDG1'], ['does not increase the maximum number of displays', 'APL3'], ['only support a single display', 'CDG1'], ['Duplicate mode only', 'DEL1'], ['daisy chaining is not supported', 'DEL1'], ['not all USB-C ports support video output', 'PL2'], ['limited to 60Hz refresh rate', 'PL1']],
  'guides/dual-monitor-dock-mst-vs-thunderbolt.html': [['Duplicate mode only', 'DEL1'], ['supported exclusively with', 'DEL1'], ['macOS only allows monitor daisy chaining via Thunderbolt', 'DEL1'], ['does not increase the maximum number of displays', 'APL3'], ['should be lower than the Max', 'IN3']],
  'guides/monitor-stuck-at-60hz.html': [['it can limit the maximum refresh rate of other games', 'MS3'], ['do not have DSC', 'CDG2'], ['turned on by default', 'CDG2'], ['to limit output', 'PS1']],
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

// sha256 of the three @@GEN blocks on main 67d616c (display/build-pages.mjs output; this job must not touch them).
const GEN_SHA = '9224649223cb94d73767f7f26cc9d1818cb2ae9f5c9ae0951f98ea83a6d4da77';
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
  for (const p of gate.pages) if (p.intendedReleaseDate === DATE && !files.includes(p.file)) out.push(`gate bumped ${p.file}`);
  for (const m of sm.matchAll(/<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g)) if (m[2] === DATE && !files.map(urlOf).includes(m[1])) out.push(`lastmod bumped ${m[1]}`);
  return out;
}
const allHtml = () => {
  const out = [];
  const walk = (d) => { for (const e of fs.readdirSync(path.join(root, d), { withFileTypes: true })) { if (['node_modules', '.git', 'tests', 'docs', 'display', 'tools', 'assets'].includes(e.name)) continue; const r = d ? `${d}/${e.name}` : e.name; if (e.isDirectory()) walk(r); else if (r.endsWith('.html')) out.push(r); } };
  walk(''); return out.sort();
};
function untouchedDateProblems(files) {
  const out = [];
  for (const f of allHtml()) if (!files.includes(f) && /"dateModified":"2026-10-24"|Updated: 2026-10-24/.test(read(f))) out.push(`bumped ${f}`);
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
  for (const re of MI_BLOCK) if (re.test(txt(body))) out.push(`MI-SOLV blocked: ${re}`);
  for (const re of MI_TABLE) if (re.test(txt(t))) out.push(`MI-SOLV blocked in table: ${re}`);
  if (!/<section class="sources" aria-labelledby="sources-heading">/.test(h)) out.push('sources section');
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
test('02a: every table cell is sourced, figures and resolution@rate pairs sit in the cited quotes, vendors labelled', () => {
  for (const f of FILES) assert.deepEqual(tableProblems(f, read(f), srcJson(f)), [], f);
});
test('02a: key figures and negations are cited and verbatim in docs/sources/<page>.json', () => {
  for (const f of FILES) assert.deepEqual(figureProblems(f, read(f), srcJson(f)), [], f);
});
test('02a: frozen fields, byline + Last reviewed, author, one theme link, hub + sibling links in the body, tablewrap, MI-SOLV-043..052 excluded', () => {
  for (const f of FILES) assert.deepEqual(signalProblems(f, read(f)), [], f);
});
test('02a: visible FAQ equals FAQPage JSON-LD on all 5 pages', () => {
  for (const f of FILES) { const [vis, ld] = faqPairs(read(f)); assert.ok(vis.length >= 3, f); assert.deepEqual(vis, ld, f); }
});
test('02a: Updated, dateModified, sitemap, gate = 2026-10-24 on exactly these 5 pages; datePublished from docs/date-published.json', () => {
  assert.deepEqual(dateProblems(FILES, read, read('sitemap.xml'), JSON.parse(read('docs/release-date-gate.json'))), []);
  assert.deepEqual(untouchedDateProblems(FILES), []);
});
test('02a: sources JSON files contain no MI-SOLV-043..052 values and no forum/blog hosts', () => {
  for (const f of FILES) {
    const raw = read('docs/sources/' + path.basename(f, '.html') + '.json');
    for (const re of MI_TABLE) assert.doesNotMatch(raw, re, f);
    assert.doesNotMatch(raw, /reddit|\/\/(www\.)?forums?\.|medium\.com|blogspot|wordpress|tomshardware|rtings|displayspecifications/i, f);
  }
});
test('02a: monitor-stuck generated blocks are byte-identical to main (table sits outside @@GEN)', () => {
  const h = read('guides/monitor-stuck-at-60hz.html');
  const gens = [...h.matchAll(/<!-- @@GEN:[\s\S]*?<!-- @@END -->/g)].map((m) => m[0]);
  assert.equal(gens.length, 3);
  assert.equal(crypto.createHash('sha256').update(gens.join('\n')).digest('hex'), GEN_SHA);
  const t = tableOf(h, PAGES['guides/monitor-stuck-at-60hz.html'].label);
  assert.ok(!gens.some((g) => g.includes(t)));
});
test('02a: tables are distinct (5-gram Jaccard <= 0.20 between the 5 tables and between any two site pages)', () => {
  const T = FILES.map((f) => shingles(read(f), (h) => tableOf(h, PAGES[f].label)));
  for (let i = 0; i < T.length; i++) for (let k = i + 1; k < T.length; k++) assert.ok(jac(T[i], T[k]) <= 0.2, `${FILES[i]} vs ${FILES[k]}`);
  const all = allHtml(); const S = all.map((f) => shingles(read(f), mainOf));
  let max = 0;
  for (let i = 0; i < S.length; i++) for (let k = i + 1; k < S.length; k++) max = Math.max(max, jac(S[i], S[k]));
  assert.ok(max <= 0.2, `max ${max}`);
});

// ---------------- mutants ----------------
const F1 = 'guides/usb-c-laptop-to-4k-monitor.html', F2 = 'guides/usb4-vs-thunderbolt-4-monitor.html', F3 = 'guides/laptop-to-docking-station.html', F4 = 'guides/dual-monitor-dock-mst-vs-thunderbolt.html', F5 = 'guides/monitor-stuck-at-60hz.html';
const clone = (o) => JSON.parse(JSON.stringify(o));
const jm = (f, fn) => { const j = clone(srcJson(f)); fn(j); return j; };
const src = (j, id) => j.sources.find((s) => s.id === id);
// [name, page, html transform, json transform, checker]
const TBL = (f, h, j) => [...tableProblems(f, h, j), ...figureProblems(f, h, j)];
const MUTANTS = [
  ['change a figure (65W -> 100W)', F1, (h) => h.replace('Power Delivery up to 65W', 'Power Delivery up to 100W'), null, TBL],
  ['recombine 4K at 240Hz -> 4K at 120Hz (120 is in the quote, pair is not)', F1, (h) => h.replace('one display up to 4K at 240Hz', 'one display up to 4K at 120Hz'), null, TBL],
  ['change TB4 40Gb/s -> 80Gb/s', F2, (h) => h.replace('<td>40Gb/s <a', '<td>80Gb/s <a'), null, TBL],
  ['delete negation "do not support triple displays"', F3, (h) => h.replace('do not support triple displays', 'support triple displays'), null, TBL],
  ['dangling citation [ZZ9]', F3, (h) => h.replace('(version 3 or higher) <a class="srcs" href="#src-DEL1">[DEL1]</a>', '(version 3 or higher) <a class="srcs" href="#src-ZZ9">[ZZ9]</a>'), null, TBL],
  ['IN3 effective 25.92 -> 28.80', F4, (h) => h.replace('25.92 Gbps effective', '28.80 Gbps effective'), null, TBL],
  ['PS5 4K 120 Hz -> 4K 60 Hz', F5, (h) => h.replace('both settings limit 4K 120 Hz', 'both settings limit 4K 60 Hz'), null, TBL],
  ['change H1 (frozen)', F1, (h) => h.replace(/<h1([^>]*)>/, '<h1$1>New: '), null, (f, h) => signalProblems(f, h)],
];
test('02a mutants: every mutant is killed', () => {
  assert.ok(MUTANTS.length >= 8);
  let killed = 0;
  for (const [name, f, hm, jmut, check] of MUTANTS) {
    const h0 = read(f); const h = hm ? hm(h0) : h0; const j = jmut ? jm(f, jmut) : srcJson(f);
    assert.ok(hm ? h !== h0 : true, `mutant did not change page: ${name}`);
    const p = check(f, h, j);
    assert.ok(p.length > 0, `mutant survived: ${name}`);
    killed++;
  }
  assert.equal(killed, MUTANTS.length);
});
test('02a mutants: date guard catches bumps and misses', () => {
  const sm = read('sitemap.xml'); const gate = JSON.parse(read('docs/release-date-gate.json'));
  const r = (over) => (f) => (over[f] ?? read(f));
  const muts = [
    dateProblems(FILES, r({ [F2]: read(F2).replace(`"dateModified":"${DATE}"`, '"dateModified":"2026-09-25"') }), sm, gate),
    // bump an untouched page
    dateProblems(FILES, read, sm.replace(/(<loc>https:\/\/elorumtech\.elorum\.world\/guides\/usb-c-hub-vs-dock\.html<\/loc>\s*<lastmod>)[^<]+/, `$1${DATE}`), gate),
  ];
  for (const [i, m] of muts.entries()) assert.notDeepEqual(m, [], `date mutant ${i} survived`);
});
