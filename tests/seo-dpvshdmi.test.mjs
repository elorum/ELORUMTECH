// SEO-DPVSHDMI-01: new guide guides/displayport-vs-hdmi.html ("displayport vs hdmi", Bing 2026-10-23).
// Title/og:title/headline/H1, meta length, dates + sitemap + release gate, FAQPage JSON-LD == visible FAQ,
// primary-domain sources only, every citation resolves, and the cited figures: each value must sit next to
// its [ID] on the page AND appear in that source's verbatim quote in docs/sources/displayport-vs-hdmi.json
// (mutants are checked below). Plus hub card, inbound links, single theme link, no prices/affiliate links.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const FILE = 'guides/displayport-vs-hdmi.html';
const URL_ = `https://elorumtech.elorum.world/${FILE}`;
const DATE = '2026-10-23';
const TITLE = 'DisplayPort vs HDMI 2.1: Which Should You Use? | ELORUMTECH';
const HEADLINE = 'DisplayPort vs HDMI 2.1: Which Should You Use?';
const H1 = 'DisplayPort vs HDMI: which should you use?';
const DESC = 'DisplayPort vs HDMI for monitors, TVs, consoles and laptops: HDMI 2.1 vs DP 1.4/2.1 bandwidth, 4K/120, 8K, DSC, VRR, eARC, MST and cables, with sources.';
// Standards bodies (HDMI Forum, HDMI LA, VESA) and device-maker support/spec pages only.
const PRIMARY = /^https:\/\/(hdmiforum\.org|www\.hdmi\.org|vesa\.org|www\.displayport\.org|www\.intel\.com\/content\/www\/us\/en\/support|nvidia\.custhelp\.com|www\.nvidia\.com\/en-us\/geforce|www\.amd\.com\/en\/products|support\.apple\.com|www\.dell\.com\/support|www\.playstation\.com\/en-us\/support|support\.xbox\.com)\//;
// [value on page, source id cited in the same element, value as it appears in the source quote]
const FIGURES = [
  ['Up to 18 Gbps', 'HF1', 'up to 18Gbps'],
  ['4K at 50/60 Hz (2160p)', 'HF1', '4K@50/60 (2160p)'],
  ['Up to 48 Gbps', 'HF2', 'increased up to 48Gbps'],
  ['4K120 and 8K60, resolutions up to 10K', 'HF2', '8K60 and 4K120, and resolutions up to 10K'],
  ['Ultra High Speed HDMI Cable, up to 48 Gbps', 'HL1', 'up to 48Gbps maximum bandwidth'],
  ['Up to 96 Gbps', 'HL2', 'Up to 96Gbps bandwidth'],
  ['4K240 and 8K60, uncompressed', 'HL2', '4K240 and 8K60, both uncompressed'],
  ['Ultra96 HDMI Cable, up to 96 Gbps', 'HL1', 'supports up to 96Gbps bandwidth'],
  ['8.1 Gbps per lane, 32.4 Gbps over 4 lanes', 'V1', 'Up to 8.1 Gbps per lane–32.4 Gbps over 4 lanes'],
  ['25.92 Gbps after overhead', 'V1', '25.92 Gbps over 4 lanes'],
  ['8K at 60 Hz, 24-bit colour, with 2:1 DSC', 'V4', '8K video at 60Hz and 24-bit color using a low 2:1 compression ratio'],
  ['10 Gbps per lane, 40 Gbps over 4 lanes', 'V2', 'UHBR10 link rate (10 Gbps), with four lanes, providing a maximum throughput of 40 Gbps'],
  ['13.5 Gbps per lane', 'V3', 'UHBR13.5 link rate (13.5 Gbps)'],
  ['20 Gbps per lane, 80 Gbps over 4 lanes', 'V2', 'UHBR20 link rate (20 Gbps), with four lanes, providing a maximum throughput of 80 Gbps'],
  ['maximum payload 77.37 Gbps', 'V1', 'maximum payload of 77.37 Gbps'],
  // CLEANUP-01 (QA-01 #37 R1): V3 gives these as examples for UHBR in general, so the UHBR20 cell says so.
  ['VESA’s examples for UHBR in general (not UHBR20 alone): uncompressed 8K 60Hz HDR or 4K 240Hz HDR', 'V3', 'The higher bandwidths enabled by UHBR support a variety of use cases such as uncompressed 8K 60Hz HDR, 4K 240Hz HDR'],
  ['4K @ 60 Hz maximum', 'DL2', '4K @ 60 Hz maximum'],
  ['up to 4K 480Hz', 'NV2', 'up to 4K 480Hz'],
  ['QHD (2560×1440) @120Hz', 'V4', 'Three QHD (2560×1440) @120Hz'],
  ['8K at 60Hz with Display Stream Compression', 'PS1', 'supports 8K at 60Hz with Display Stream compression'],
  ['from 1:1 to about 3:1', 'V4', 'from 1:1 to about 3:1'],
  ['GeForce RTX 20-series/GTX 16-series', 'NV1', 'GeForce RTX 20-series/GeForce GTX 16-series'],
  ['first supported in DisplayPort 1.2a', 'V4', 'first supported by DisplayPort 1.2a'],
  ['32-channel audio', 'HL3', '32-channel uncompressed audio'],
  ['up to three monitors', 'IN1', 'up to three monitors with daisy-chaining'],
  ['two 4K (3840×2160) displays @144Hz', 'V4', 'Two 4K (3840×2160) displays @144Hz'],
  ['beyond two meters for DP40 and beyond one meter for DP80', 'V2', 'beyond two meters for DP40 cables and beyond one meter for DP80 cables'],
  ['Ultra High Speed 48 Gbps HDMI cable', 'AP1', 'Ultra High Speed 48 Gbps HDMI cable'],
  ['3x DisplayPort, 1x HDMI', 'NV2', '3x DisplayPort'],
];
const h = read(FILE);
const SRC = JSON.parse(read('docs/sources/displayport-vs-hdmi.json'));
const src = (id) => SRC.sources.find((s) => s.id === id);
const ld = [...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
const article = ld.find((o) => o['@type'] === 'TechArticle');
const faqLd = ld.find((o) => o['@type'] === 'FAQPage');
const crumbs = ld.find((o) => o['@type'] === 'BreadcrumbList');
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', rsquo: '’', ldquo: '“', rdquo: '”', '#x27': "'", '#39': "'" };
const txt = (s) => s.replace(/<[^>]+>/g, '').replace(/&(#?[a-z0-9]+);/g, (m, n) => ENT[n] ?? m).replace(/\s+/g, ' ').trim();
const main = (html) => (html.match(/<main>[\s\S]*?(?=<section class="sources")/) || [''])[0];

// Every smallest <li>/<td>/<p> in the article body that contains the value must also cite the source,
// and the source's recorded verbatim quote must contain the value as the source words it.
function figureOk(html, [onPage, id, inSource]) {
  const blocks = [...main(html).matchAll(/<(li|td|p)\b[^>]*>([\s\S]*?)<\/\1>/g)].map((m) => m[2]);
  const hit = blocks.filter((b) => txt(b).includes(onPage));
  if (!hit.length) return false;
  const s = src(id);
  return hit.every((b) => b.includes(`<a class="srcs" href="#src-${id}">[${id}]</a>`)) && !!s && s.quotes.some((q) => q.includes(inSource));
}

test('dpvshdmi: title, og:title, headline, H1, meta, canonical and breadcrumb are consistent', () => {
  assert.equal((h.match(/<title>([^<]*)<\/title>/) || [])[1], TITLE);
  assert.ok(TITLE.length >= 50 && TITLE.length <= 62, `title length ${TITLE.length}`);
  assert.ok(h.includes(`<meta property="og:title" content="${TITLE}">`));
  assert.equal(article.headline, HEADLINE);
  assert.equal(TITLE, `${HEADLINE} | ELORUMTECH`);
  assert.equal((h.match(/<h1[\s>]/g) || []).length, 1);
  assert.ok(h.includes(`<h1>${H1}</h1>`));
  assert.ok(DESC.length <= 155, `meta length ${DESC.length}`);
  assert.ok(h.includes(`<meta name="description" content="${DESC}">`));
  assert.ok(h.includes(`<meta property="og:description" content="${DESC}">`));
  assert.ok(h.includes(`rel="canonical" href="${URL_}"`));
  assert.ok(h.includes(`<meta property="og:url" content="${URL_}">`));
  assert.equal(article.mainEntityOfPage, URL_);
  assert.deepEqual(crumbs.itemListElement.map((i) => i.item), ['https://elorumtech.elorum.world/', 'https://elorumtech.elorum.world/guides/', URL_]);
  assert.ok(h.includes('<script src="/analytics.js" defer></script>'));
  assert.ok(h.includes('<nav><a class="brand" href="../">ELORUMTECH</a><a href="../">Compatibility Engine</a></nav>'));
});

test('dpvshdmi: required sections, bandwidth table and recommendation table', () => {
  for (const id of ['versions', 'modes', 'dsc', 'vrr', 'audio', 'multi', 'usb-c', 'cables', 'recommend']) assert.equal((h.match(new RegExp(`<h2 id="${id}">`, 'g')) || []).length, 1, id);
  const tables = [...h.matchAll(/<div class="tablewrap" role="region" aria-label="[^"]+" tabindex="0"><table><caption>[\s\S]*?<\/table><\/div>/g)].map((m) => m[0]);
  assert.equal(tables.length, 2);
  assert.equal((h.match(/<table>/g) || []).length, 2, 'every table is inside .tablewrap');
  for (const k of ['HDMI 2.0', 'HDMI 2.1', 'HDMI 2.2', 'DisplayPort 1.4 (HBR3)', 'DisplayPort 2.1 UHBR10', 'DisplayPort 2.1 UHBR13.5', 'DisplayPort 2.1 UHBR20']) assert.ok(tables[0].includes(`<th scope="row">${k}</th>`), k);
  for (const k of ['Gaming PC → monitor', 'Console → TV', 'Laptop → monitor', 'Several monitors, one port']) assert.ok(tables[1].includes(`<th scope="row">${k}</th>`), k);
  assert.ok(h.includes('<a class="btn" href="display-connection-solver.html">'));
});

test('dpvshdmi: FAQPage JSON-LD equals the visible FAQ (4–6 entries)', () => {
  const sec = (h.match(/<section class="faq"[\s\S]*?<\/section>/) || [''])[0];
  const vis = [...sec.matchAll(/<details><summary>([\s\S]*?)<\/summary><p>([\s\S]*?)<\/p><\/details>/g)].map((m) => [txt(m[1]), txt(m[2])]);
  assert.ok(vis.length >= 4 && vis.length <= 6, `FAQ count ${vis.length}`);
  assert.deepEqual(faqLd.mainEntity.map((q) => [q.name, q.acceptedAnswer.text]), vis);
});

test('dpvshdmi: Updated, Last reviewed, datePublished/dateModified, sitemap lastmod and gate all 2026-10-23', () => {
  assert.equal((h.match(/<p class="updated"[^>]*>Updated: (\d{4}-\d{2}-\d{2})<\/p>/) || [])[1], DATE);
  assert.equal((h.match(/Updated:/g) || []).length, 1);
  assert.equal((h.match(/Last reviewed: \d{4}-\d{2}-\d{2}/g) || []).length, 1);
  assert.ok(h.includes(`Last reviewed: ${DATE} by ELORUMTECH`));
  assert.equal(article.datePublished, DATE);
  assert.equal(article.dateModified, DATE);
  const sm = read('sitemap.xml');
  const entries = [...sm.matchAll(new RegExp(`<loc>${URL_.replace(/[.\/]/g, '\\$&')}</loc>\\s*<lastmod>([^<]+)</lastmod>`, 'g'))];
  assert.equal(entries.length, 1, 'page is in sitemap.xml exactly once');
  assert.equal(entries[0][1], DATE);
  const g = JSON.parse(read('docs/release-date-gate.json')).pages.filter((p) => p.file === FILE);
  assert.deepEqual(g, [{ file: FILE, url: URL_, visibleUpdated: true, intendedReleaseDate: DATE }]);
});

test('dpvshdmi: sources are primary, unique, quoted, cited; every citation resolves; list matches the JSON', () => {
  const ids = [...h.matchAll(/<li id="src-([A-Z0-9]+)"><a href="([^"]+)" rel="noopener">[^<]+<\/a> — [^,]+, checked 2026-10-23 (\d{2}:\d{2}) CEST<\/li>/g)];
  const set = new Set(ids.map((m) => m[1]));
  assert.equal(set.size, ids.length);
  assert.equal(ids.length, (h.match(/<li id="src-/g) || []).length, 'every source entry has the standard format');
  assert.deepEqual(ids.map((m) => m[1]), SRC.sources.map((s) => s.id));
  for (const [, id, href, hhmm] of ids) {
    const s = src(id);
    assert.match(href.replace(/&amp;/g, '&'), PRIMARY, `src-${id} not primary: ${href}`);
    assert.equal(href.replace(/&amp;/g, '&'), s.url);
    assert.match(s.checked_at, /^2026-10-23T\d{2}:\d{2}:\d{2}\+02:00$/);
    assert.equal(s.checked_at.slice(11, 16), hhmm);
    assert.ok(s.quotes.length >= 1 && s.kind && s.publisher && s.title);
    assert.ok(main(h).includes(`<a class="srcs" href="#src-${id}">[${id}]</a>`), `src-${id} never cited in the body`);
  }
  const cites = [...h.matchAll(/<a class="srcs" href="#src-([A-Z0-9]+)">\[([A-Z0-9]+)\]<\/a>/g)];
  assert.ok(cites.length >= 60);
  for (const m of cites) {
    assert.equal(m[1], m[2]);
    assert.ok(set.has(m[1]), `citation ${m[1]} has no source entry`);
  }
  assert.equal((h.match(/class="srcs"/g) || []).length, cites.length, 'no malformed citation links');
});

test('dpvshdmi: cited figures match the page text, the [ID] next to them, and the source quote', () => {
  for (const f of FIGURES) assert.ok(figureOk(h, f), `figure not backed: ${f[0]} [${f[1]}]`);
});

test('dpvshdmi: figure checks catch mutants (48→40, 25.92→26.92, 77.37→80, 13.5→12.5, 480→500 Hz, swapped IDs)', () => {
  const muts = [
    [h.replaceAll('Up to 48 Gbps', 'Up to 40 Gbps'), FIGURES[2]],
    [h.replaceAll('25.92 Gbps after overhead', '26.92 Gbps after overhead'), FIGURES[9]],
    [h.replaceAll('maximum payload 77.37 Gbps', 'maximum payload 80 Gbps'), FIGURES[14]],
    [h.replaceAll('13.5 Gbps per lane', '12.5 Gbps per lane'), FIGURES[12]],
    [h.replaceAll('up to 4K 480Hz', 'up to 4K 500Hz'), FIGURES[17]],
    [h.replace('10 Gbps per lane, 40 Gbps over 4 lanes <a class="srcs" href="#src-V2">[V2]</a>', '10 Gbps per lane, 40 Gbps over 4 lanes <a class="srcs" href="#src-V1">[V1]</a>'), FIGURES[11]],
    [h.replace('Ultra96 HDMI Cable, up to 96 Gbps <a class="srcs" href="#src-HL1">[HL1]</a>', 'Ultra96 HDMI Cable, up to 96 Gbps <a class="srcs" href="#src-HL2">[HL2]</a>'), FIGURES[7]],
    [h.replaceAll('from 1:1 to about 3:1', 'from 1:1 to about 4:1'), FIGURES[20]],
  ];
  for (const [m, f] of muts) {
    assert.notEqual(m, h, 'mutation must change the page');
    assert.equal(figureOk(m, f), false, `mutant survived: ${f[0]}`);
  }
  // One occurrence of a figure losing its [ID] must fail even if another occurrence keeps it.
  const once = h.replace('25.92 Gbps after overhead <a class="srcs" href="#src-V1">[V1]</a>', '25.92 Gbps after overhead');
  assert.notEqual(once, h);
  assert.equal(figureOk(once, FIGURES[9]), false);
  // A figure whose source quote does not contain it must fail even when the [ID] is right next to it.
  assert.equal(figureOk(h, ['Up to 18 Gbps', 'HF1', 'up to 24Gbps']), false);
});

test('dpvshdmi: internal links resolve; hub card and inbound links from existing guides', () => {
  const hrefs = [...(h.match(/<main>[\s\S]*?<\/main>/) || [''])[0].matchAll(/<a [^>]*href="([^"#]+)"/g)].map((m) => m[1]).filter((x) => !/^https?:/.test(x));
  for (const r of ['display-connection-solver.html', 'thunderbolt-dock-one-cable-4k-120.html', 'usb-c-laptop-to-4k-monitor.html', 'external-monitor-not-detected.html', 'ps5-hdmi-2-1-cable-path.html', 'displayport-monitor-connection-path.html']) assert.ok(hrefs.includes(r), r);
  for (const r of hrefs) {
    const p = path.join(root, 'guides', r);
    assert.ok(fs.existsSync(p.endsWith('/') ? path.join(p, 'index.html') : p), `broken link ${r}`);
  }
  assert.ok(read('guides/index.html').includes('<div class="card"><a href="displayport-vs-hdmi.html"><strong>DisplayPort vs HDMI: which should you use?</strong>'));
  for (const f of ['guides/displayport-monitor-connection-path.html', 'guides/ps5-hdmi-2-1-cable-path.html']) {
    const rel = (read(f).match(/<section class="related"[\s\S]*?<\/section>/) || [''])[0];
    assert.equal((rel.match(/href="displayport-vs-hdmi\.html"/g) || []).length, 1, f);
  }
});

test('dpvshdmi: exactly one theme stylesheet right before </head>; no prices or affiliate links', () => {
  const THEME = '<link rel="stylesheet" href="/assets/elorum-theme.css">';
  assert.equal(h.split(THEME).length - 1, 1);
  assert.equal((h.match(/<link rel="stylesheet"/g) || []).length, 1);
  assert.ok(h.includes(`${THEME}</head>`));
  assert.doesNotMatch(txt(h), /[$€£]\s?\d|\d\s?(USD|EUR|kr\.?)\b/);
  assert.doesNotMatch(h, /amazon\.|amzn\.|[?&]tag=|affiliate|rel="sponsored"/i);
});

// REM01 (QA-01 F4/F5 on PR #37): VESA's example configurations carry the version label VESA gives them,
// and the macOS/MST statement is attributed to its source (Dell [DL1]) wherever it appears, incl. FAQ JSON-LD.
const VESA_EXAMPLES = [
  // [label + example as on the page, label as VESA words it in the V4 quote]
  ['Among its example configurations for DisplayPort 2.0 and 2.1, VESA lists two 4K (3840×2160) displays @144Hz without compression', 'important features of DisplayPort 2.0 and 2.1'],
  ['VESA’s own example for DP 2.0 using only two lanes of a USB-C connector (DP Alt Mode): three QHD (2560×1440) @120Hz displays without compression', 'DP 2.0 can enable such configurations as'],
];
function scopeProblems(html) {
  const out = [];
  const body = html.replace(/<section class="sources"[\s\S]*?<\/section>/, ''); // source titles are not claims
  const blocks = [...body.matchAll(/<(li|td|p|div(?= class="answer"))\b[^>]*>([\s\S]*?)<\/(?:li|td|p|div)>/g)].map((m) => m[2]);
  for (const [onPage, inSource] of VESA_EXAMPLES) {
    const hit = blocks.filter((b) => txt(b).includes(onPage));
    if (hit.length !== 1 || !hit[0].includes('<a class="srcs" href="#src-V4">[V4]</a>')) out.push(`VESA example not labelled/cited: ${onPage.slice(0, 40)}`);
    if (!src('V4').quotes.some((q) => q.includes(inSource))) out.push(`V4 quote missing: ${inSource}`);
  }
  if (/DisplayPort 2\.1 bandwidth|over DisplayPort 2\.1 using only two USB-C lanes/.test(html)) out.push('VESA DP 2.0 example labelled DP 2.1');
  const plain = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]).join(' ');
  if (/macOS does not support MST/.test(html) || /macOS does not support MST/.test(plain)) out.push('unscoped macOS MST claim');
  for (const b of blocks) {
    const t = txt(b);
    if (/macOS/.test(t) && /\bMST\b|Multi-Stream/.test(t)) {
      if (!/Dell’s (dock )?documentation/.test(t)) out.push(`macOS MST not attributed to Dell: ${t.slice(0, 60)}`);
      if (b.includes('class="srcs"') && !b.includes('<a class="srcs" href="#src-DL1">[DL1]</a>')) out.push(`macOS MST without [DL1]: ${t.slice(0, 60)}`);
    }
  }
  const faqHits = faqLdOf(html).filter((q) => /macOS/.test(q) && /MST|Multi-Stream/.test(q));
  if (!faqHits.length || faqHits.some((q) => !/Dell’s (dock )?documentation/.test(q))) out.push('FAQ JSON-LD macOS MST not attributed to Dell');
  if (!src('DL1').quotes.some((q) => q.includes('lack of support for Multi-Stream Transport in macOS'))) out.push('DL1 quote missing');
  return out;
}
function faqLdOf(html) {
  const lds = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
  const f = lds.find((o) => o['@type'] === 'FAQPage');
  return f ? f.mainEntity.map((q) => q.acceptedAnswer.text) : [];
}

test('dpvshdmi REM01: VESA examples labelled DP 2.0 / 2.0 and 2.1 as the source gives them; macOS MST scoped to Dell [DL1]', () => {
  assert.deepEqual(scopeProblems(h), []);
  // Every place that mentions macOS + MST (answer box, MST section, recommendation table, FAQ) is attributed.
  const n = [...h.replace(/<section class="sources"[\s\S]*?<\/section>/, '').matchAll(/<(li|td|p|div(?= class="answer"))\b[^>]*>([\s\S]*?)<\/(?:li|td|p|div)>/g)].filter((m) => /macOS/.test(txt(m[2])) && /\bMST\b|Multi-Stream/.test(txt(m[2]))).length;
  assert.ok(n >= 4, `macOS/MST mentions found: ${n}`);
  // F1 (375 px): page-local scroll-padding so keyboard focus scrolls end-of-row table links fully into view.
  assert.ok(h.includes('.tablewrap{overflow-x:auto;scroll-padding-inline:40px;'), 'tablewrap scroll-padding (page-local)');
});

test('dpvshdmi REM01: scope checks catch mutants (old DP 2.1 labels, unscoped macOS claim in body, table, FAQ visible+JSON-LD)', () => {
  const muts = [
    h.replace('Among its example configurations for DisplayPort 2.0 and 2.1, VESA lists two 4K', 'With DisplayPort 2.1 bandwidth, VESA’s example is two 4K'),
    h.replace('VESA’s own example for DP 2.0 using only two lanes of a USB-C connector (DP Alt Mode): three QHD (2560×1440) @120Hz displays without compression', 'VESA’s own example: three QHD (2560×1440) @120Hz displays without compression over DisplayPort 2.1 using only two USB-C lanes'),
    h.replace('<p>Dell’s documentation for its Thunderbolt docks on Apple USB-C hosts points to “a lack of support for Multi-Stream Transport in macOS”', '<p>macOS does not support MST'),
    h.replace('<td>On a Mac, Dell’s dock documentation states that macOS lacks MST support', '<td>macOS does not support MST'),
    h.replace('; on a Mac, Dell’s dock documentation states that macOS lacks MST support <a class="srcs" href="#src-DL1">[DL1]</a>', '; macOS lacks MST support <a class="srcs" href="#src-DL1">[DL1]</a>'),
    h.replaceAll('Dell’s dock documentation states that macOS lacks support for Multi-Stream Transport, so Macs', 'macOS does not support MST, so Macs'),
    h.replace('macOS lacks MST support <a class="srcs" href="#src-DL1">[DL1]</a>;', 'macOS lacks MST support <a class="srcs" href="#src-IN1">[IN1]</a>;'),
  ];
  for (const [i, m] of muts.entries()) {
    assert.notEqual(m, h, `mutation ${i} must change the page`);
    assert.ok(scopeProblems(m).length > 0, `mutant ${i} survived`);
  }
});

// ---------- CLEANUP-01 (ELORUMTECH-CLEANUP-20261023-01): QA-01 #37 R1, F2, F3 ----------
// F2: figureOk passes when *some* block holds the value, so changing one of two occurrences slipped through. Pin how
// many smallest blocks carry each figure; a changed occurrence drops the count.
const blocksWith = (html, v) => [...main(html).matchAll(/<(li|td|p)\b[^>]*>([\s\S]*?)<\/\1>/g)].filter((m) => txt(m[2]).includes(v)).length;
const COUNTS = {
  "Up to 18 Gbps": 1,
  "4K at 50/60 Hz (2160p)": 1,
  "Up to 48 Gbps": 1,
  "4K120 and 8K60, resolutions up to 10K": 1,
  "Ultra High Speed HDMI Cable, up to 48 Gbps": 1,
  "Up to 96 Gbps": 1,
  "4K240 and 8K60, uncompressed": 1,
  "Ultra96 HDMI Cable, up to 96 Gbps": 1,
  "8.1 Gbps per lane, 32.4 Gbps over 4 lanes": 1,
  "25.92 Gbps after overhead": 2,
  "8K at 60 Hz, 24-bit colour, with 2:1 DSC": 1,
  "10 Gbps per lane, 40 Gbps over 4 lanes": 1,
  "13.5 Gbps per lane": 1,
  "20 Gbps per lane, 80 Gbps over 4 lanes": 1,
  "maximum payload 77.37 Gbps": 1,
  "VESA’s examples for UHBR in general (not UHBR20 alone): uncompressed 8K 60Hz HDR or 4K 240Hz HDR": 1,
  "4K @ 60 Hz maximum": 1,
  "up to 4K 480Hz": 1,
  "QHD (2560×1440) @120Hz": 1,
  "8K at 60Hz with Display Stream Compression": 1,
  "from 1:1 to about 3:1": 1,
  "GeForce RTX 20-series/GTX 16-series": 1,
  "first supported in DisplayPort 1.2a": 1,
  "32-channel audio": 1,
  "up to three monitors": 2,
  "two 4K (3840×2160) displays @144Hz": 1,
  "beyond two meters for DP40 and beyond one meter for DP80": 1,
  "Ultra High Speed 48 Gbps HDMI cable": 2,
  "3x DisplayPort, 1x HDMI": 1,
};
const countsOk = (html) => FIGURES.every((f) => COUNTS[f[0]] >= 1 && blocksWith(html, f[0]) === COUNTS[f[0]]);
// F3: the 4K 480Hz claim names both ports, so each port needs its own NV2 quote (one quote can't back the other).
const NV2_PORTS = [
  ['up to 4K 480Hz on both DisplayPort 2.1b with UHBR20', 'NV2', 'DisplayPort 2.1b with UHBR20: up to 4K 480Hz'],
  ['and HDMI 2.1b', 'NV2', 'As specified in HDMI 2.1b: up to 4K 480Hz'],
];
const r1Ok = (html) => {
  const row = (main(html).match(/<tr><th scope="row">DisplayPort 2\.1 UHBR20<\/th>[\s\S]*?<\/tr>/) || [''])[0];
  return /VESA’s examples for UHBR in general \(not UHBR20 alone\)/.test(txt(row)) && !/<td>Uncompressed 8K 60Hz HDR/.test(row) && row.includes('<a class="srcs" href="#src-V3">[V3]</a>');
};

test('dpvshdmi CLEANUP-01: UHBR20 row scopes V3’s examples to UHBR in general; V3 full sentence stored (#37 R1)', () => {
  assert.ok(r1Ok(h));
  assert.ok(src('V3').quotes.includes('The higher bandwidths enabled by UHBR support a variety of use cases such as uncompressed 8K 60Hz HDR, 4K 240Hz HDR, two 4K 120Hz HDR or four 4K 60Hz HDR displays through a single cable.'));
  assert.equal(src('V3').checked_at, '2026-10-23T22:48:00+02:00');
  assert.ok(h.includes('DP40/DP80 cables</a> — VESA, checked 2026-10-23 22:48 CEST</li>'));
});

test('dpvshdmi CLEANUP-01: per-figure occurrence counts and per-port NV2 quotes (#37 F2, F3)', () => {
  assert.ok(countsOk(h));
  for (const f of NV2_PORTS) assert.ok(figureOk(h, f), f[0]);
});

test('dpvshdmi CLEANUP-01: mutants (old UHBR20 wording, one-occurrence change, NV2 DP quote drift)', () => {
  const old = h.replace('<td>VESA’s examples for UHBR in general (not UHBR20 alone): uncompressed 8K 60Hz HDR or 4K 240Hz HDR', '<td>Uncompressed 8K 60Hz HDR or 4K 240Hz HDR');
  assert.notEqual(old, h); assert.equal(r1Ok(old), false);
  // the old figure (any occurrence) would still pass on this mutant; the count pin catches it
  const once = h.replace('25.92 Gbps after overhead', '26.92 Gbps after overhead');
  assert.notEqual(once, h); assert.equal(countsOk(once), false);
  const u48 = h.replace('Ultra High Speed 48 Gbps HDMI cable', 'Ultra High Speed 18 Gbps HDMI cable');
  assert.notEqual(u48, h); assert.equal(countsOk(u48), false);
  const dup = h.replace('</ul></div>', '<li>Up to 48 Gbps <a class="srcs" href="#src-HF2">[HF2]</a></li></ul></div>');
  assert.notEqual(dup, h); assert.equal(countsOk(dup), false);
  const nv2 = src('NV2');
  const saved = nv2.quotes;
  try {
    nv2.quotes = saved.map((q) => q.replace('DisplayPort 2.1b with UHBR20: up to 4K 480Hz', 'DisplayPort 2.1b with UHBR20: up to 4K 360Hz'));
    assert.equal(figureOk(h, ['up to 4K 480Hz', 'NV2', 'up to 4K 480Hz']), true, 'old check is blind to DP-quote drift');
    assert.equal(figureOk(h, NV2_PORTS[0]), false);
    nv2.quotes = saved.filter((q) => !q.startsWith('As specified in HDMI 2.1b'));
    assert.equal(figureOk(h, NV2_PORTS[1]), false);
  } finally { nv2.quotes = saved; }
  const v3 = src('V3'); const sv = v3.quotes;
  try { v3.quotes = sv.filter((q) => !q.startsWith('The higher bandwidths')); assert.equal(figureOk(h, FIGURES.find((f) => f[1] === 'V3' && f[0].startsWith('VESA’s examples'))), false); } finally { v3.quotes = sv; }
});
