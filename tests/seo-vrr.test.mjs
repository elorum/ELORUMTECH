// SEO-VRR-01: new guide guides/vrr-gsync-freesync-compatibility.html ("vrr", "g-sync compatible", "freesync"; Bing 2026-10-23).
// Title/og:title/headline/H1, meta length, dates + sitemap + release gate, FAQPage JSON-LD == visible FAQ,
// primary-domain sources only, every citation resolves, and the cited figures/labels: each value must sit next to
// its [ID] on the page AND appear in that source's verbatim quote in docs/sources/vrr-gsync-freesync-compatibility.json.
// Lessons from #36 F1 and #37 F2/F3: step counts are pinned, repeated figures are checked per occurrence, and
// claims that only one source makes (NVIDIA HDMI GPU generation, Intel 11th-gen DP-only, undocumented dock/adapter/MST
// paths) must stay scoped to that source. Mutants are checked below.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const FILE = 'guides/vrr-gsync-freesync-compatibility.html';
const URL_ = `https://elorumtech.elorum.world/${FILE}`;
const DATE = '2026-10-23';
const HEADLINE = 'VRR Explained: G-Sync, FreeSync & HDMI 2.1 VRR';
const TITLE = `${HEADLINE} | ELORUMTECH`;
const TITLE_HTML = TITLE.replace('&', '&amp;');
const H1 = 'VRR, G-Sync and FreeSync: what works with what';
const DESC = 'Which ports, cables, docks and adapters carry VRR: HDMI 2.1 VRR, FreeSync and Adaptive-Sync on PS5, Xbox Series, NVIDIA, AMD, Intel and Mac, with sources.';
// Standards bodies (HDMI Forum, HDMI LA, VESA) and device-maker support/spec/newsroom pages only.
const PRIMARY = /^https:\/\/(hdmiforum\.org|www\.hdmi\.org|www\.displayport\.org|www\.adaptivesync\.org|www\.nvidia\.com\/(en-us\/geforce|content\/Control-Panel-Help)|nvidia\.custhelp\.com|www\.amd\.com\/en\/(products|resources\/support-articles)|www\.intel\.com\/content\/www\/us\/en\/(support|developer)|www\.playstation\.com\/en-us\/support|blog\.playstation\.com|www\.xbox\.com\/en-US\/consoles|news\.xbox\.com|support\.apple\.com)\//;
// [value on page, source id(s) cited in the same element, value as it appears in the source quote]
const FIGURES = [
  ['first supported in DisplayPort 1.2a', 'V1', 'first supported by DisplayPort 1.2a'],
  ['Yes, DisplayPort 1.2a and later', 'V1', 'first supported by DisplayPort 1.2a'],
  ['GTX 10 series and higher', 'NV3', 'GTX 10 series (Pascal) and higher GPUs supports VESA Adaptive-Sync variable refresh rate over the DisplayPort 1.2a'],
  ['DisplayPort 1.2a or higher', 'NV4', 'DisplayPort 1.2a or higher'],
  ['DisplayPort: GeForce 10 series and higher', 'NV2', 'GeForce 10 series and higher GPUs on Display Port'],
  ['GeForce 30 series and higher', 'NV2', 'GeForce 30 series and higher GPUs on HDMI 2.1'],
  ['GeForce GTX 16 series/RTX 20 series and higher', 'NV3', 'GTX 16 series/RTX 20 series (Turing) and higher'],
  ['more than 50 test criteria', 'V2', 'more than 50 test criteria'],
  ['1x HDMI 2.1 port', ['XB1', 'XB2'], '1x HDMI 2.1 port'],
  ['HDMI Variable Refresh Rate and AMD FreeSync', ['XB1', 'XB2'], 'HDMI Variable Refresh Rate. AMD FreeSync.'],
  ['Always On, Gaming Only or Off', 'XB4', '“Always On,” “Gaming Only,” or “Off.”'],
  ['VRR is disabled during 8K output', 'PS1', 'VRR is disabled during 8K output'],
  ['HDMI 2.1 VRR-compatible TV', 'PS2', 'HDMI 2.1 VRR-compatible TV'],
  ['macOS Monterey 12 or later', 'AP1', 'macOS Monterey 12 or later'],
  ['Ryzen AI 400 Series', 'AMD1', 'AI 400 Series'],
  ['three tiers', 'AMD1', 'three tiers'],
  ['mandatory LFC', 'AMD1', 'mandatory LFC requirements'],
  ['HDMI 2.1 standard', 'IN1', 'HDMI input on the Display is HDMI 2.1 standard'],
  ['not an HDMI adapter', 'AP1', 'Do not use an HDMI cable or adapter.'],
  ['do not use an HDMI cable or adapter', 'AP1', 'Do not use an HDMI cable or adapter.'],
  ['connected natively via DisplayPort', 'NV4', 'connected natively via DisplayPort v1.2'],
  ['even if the display does not support HDMI 2.1', 'AMD1', 'even if the display does not support HDMI 2.1'],
  ['lag, judder and frame tearing', 'HL1', 'lag, judder and frame tearing'],
  // REM01 F1: the AP2 HDMI exception for the Mac models Apple lists.
  ['Ultra High Speed 48 Gbps HDMI cable', 'AP2', 'Use an Ultra High Speed 48 Gbps HDMI cable'],
  ['MacBook Pro with M2 Pro, M3 Pro, M2 Max or M3 Max introduced in 2023 or later', 'AP2', 'MacBook Pro with M2 Pro, M3 Pro, M2 Max or M3 Max introduced in 2023 or later'],
  ['Mac mini (2023 with M2 Pro)', 'AP2', 'Mac mini (2023 with M2 Pro)'],
  ['don’t use an adapter with the HDMI cable', 'AP2', 'don’t use an adapter with the HDMI cable'],
  // REM01 F2: Intel Arc's VRR over HDMI is VESA Adaptive Sync on an HDMI 2.1 input.
  ['the display must also support VESA Adaptive Sync', 'IN1', 'The display must also support VESA Adaptive Sync since this is the VRR supported by Intel Arc A-Series / B-Series GPUs.'],
];
// Repeated figures: every element that contains the token must cite one of the listed sources (per occurrence).
const REPEATED = [
  ['1.2a', ['V1', 'NV3', 'NV4']],
  ['GeForce 30 series', ['NV2']],
  ['RTX 20 series', ['NV3']],
  ['10 series', ['NV2', 'NV3']],
  ['8K output', ['PS1']],
  ['50 test criteria', ['V2']],
  ['Monterey 12', ['AP1']],
  ['11th-generation', ['IN2']],
  ['AI 400', ['AMD1']],
  ['Gaming Only', ['XB4']],
  ['48 Gbps', ['AP2']],
];
const FIX_STEPS = 8;
const BUY_STEPS = 4;
const h = read(FILE);
const SRC = JSON.parse(read('docs/sources/vrr-gsync-freesync-compatibility.json'));
const src = (id) => SRC.sources.find((s) => s.id === id);
const ldOf = (html) => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
const ld = ldOf(h);
const article = ld.find((o) => o['@type'] === 'TechArticle');
const faqLd = ld.find((o) => o['@type'] === 'FAQPage');
const crumbs = ld.find((o) => o['@type'] === 'BreadcrumbList');
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', rsquo: '’', ldquo: '“', rdquo: '”', '#x27': "'", '#39': "'" };
const txt = (s) => s.replace(/<[^>]+>/g, '').replace(/&(#?[a-z0-9]+);/g, (m, n) => ENT[n] ?? m).replace(/\s+/g, ' ').trim();
const main = (html) => (html.match(/<main>[\s\S]*?(?=<section class="sources")/) || [''])[0];
const cite = (id) => `<a class="srcs" href="#src-${id}">[${id}]</a>`;
// Smallest claim elements in the article body: li, td, p and the answer box.
const blocksOf = (html) => [...main(html).matchAll(/<(li|td|p|div(?= class="answer"))\b[^>]*>([\s\S]*?)<\/(?:li|td|p|div)>/g)].map((m) => m[2]);
const faqTexts = (html) => { const f = ldOf(html).find((o) => o['@type'] === 'FAQPage'); return f ? f.mainEntity.map((q) => q.acceptedAnswer.text) : []; };

// Claim-level adjacency: split each element at its citation runs; every text segment that contains the value must be
// followed directly by a citation run that includes the expected [ID] (a citation elsewhere in the same cell is not enough).
const CITE_RUN = /((?:<a class="srcs" href="#src-[A-Z0-9]+">\[[A-Z0-9]+\]<\/a>)+)/;
function claimSegments(html, value) {
  const out = [];
  for (const b of blocksOf(html)) {
    const parts = b.split(CITE_RUN);
    for (let i = 0; i < parts.length; i += 2) if (txt(parts[i]).includes(value)) out.push(parts[i + 1] || '');
  }
  return out; // the citation run following each occurrence ('' when none)
}
function figureOk(html, [onPage, ids, inSource]) {
  const list = [].concat(ids);
  const runs = claimSegments(html, onPage);
  if (!runs.length) return false;
  return runs.every((r) => list.some((id) => r.includes(cite(id)))) && list.every((id) => src(id) && src(id).quotes.some((q) => q.includes(inSource)));
}
function repeatedOk(html, [token, ids]) {
  const runs = claimSegments(html, token);
  return runs.length > 0 && runs.every((r) => ids.some((id) => r.includes(cite(id))));
}
function stepCounts(html) {
  const fix = (html.match(/<ol id="fix-steps">([\s\S]*?)<\/ol>/) || ['', ''])[1];
  const buy = (html.match(/<div class="check"><h3>Before you buy anything<\/h3><ol>([\s\S]*?)<\/ol>/) || ['', ''])[1];
  return [(fix.match(/<li>/g) || []).length, (buy.match(/<li>/g) || []).length];
}
// Scope rules (#37 F2/F3 lesson): single-source claims stay attributed wherever they appear, incl. FAQ JSON-LD.
function scopeProblems(html) {
  const out = [];
  const blocks = blocksOf(html);
  const faq = faqTexts(html);
  for (const b of blocks) {
    const t = txt(b);
    if (/GeForce 30 series/.test(t) || /RTX 20 series/.test(t)) {
      if (!(/GeForce 30 series/.test(t) && /RTX 20 series/.test(t))) out.push(`NVIDIA HDMI generation shown one-sided: ${t.slice(0, 60)}`);
      if (/GeForce 30 series/.test(t) && !b.includes(cite('NV2'))) out.push('GeForce 30 series without [NV2]');
      if (/RTX 20 series/.test(t) && !b.includes(cite('NV3'))) out.push('RTX 20 series without [NV3]');
    }
    if (/HDMI is not (currently )?supported|DisplayPort cable only/.test(t) && !(/11th-generation/.test(t) && b.includes(cite('IN2')))) out.push(`Intel DP-only not scoped to 11th-gen [IN2]: ${t.slice(0, 60)}`);
  }
  for (const q of faq) if ((/GeForce 30 series/.test(q) || /RTX 20 series/.test(q)) && !(/GeForce 30 series/.test(q) && /RTX 20 series/.test(q) && /2021/.test(q))) out.push('FAQ NVIDIA HDMI generation one-sided or undated');
  if (!faq.some((q) => /GeForce 30 series/.test(q))) out.push('FAQ lost the NVIDIA HDMI answer');
  const paths = (html.match(/<div class="tablewrap" role="region" aria-label="Which connection paths carry VRR"[\s\S]*?<\/table><\/div>/) || [''])[0];
  for (const row of ['Thunderbolt / USB-C dock', 'DisplayPort or USB-C → HDMI adapter', 'MST hub or daisy-chain']) {
    const r = (paths.match(new RegExp(`<tr><th scope="row">${row.replace(/[/.]/g, '\\$&')}</th><td>([\\s\\S]*?)</td>`)) || [])[1];
    if (!r || !r.includes('<strong>Not documented</strong>')) out.push(`path row not labelled Not documented: ${row}`);
  }
  if (faq.some((q) => /dock|adapter/.test(q) && /always|guaranteed/i.test(q))) out.push('FAQ promises VRR through docks/adapters');
  const plain = txt(main(html)) + ' ' + faq.join(' ');
  if (/Xbox One/.test(plain)) out.push('Xbox One claim (not in scope of the cited sources)');
  if (/Premium( Pro)?[^.]{0,80}\b\d{2,3}\s?Hz/.test(plain)) out.push('AMD tier refresh figure (conflicting AMD sources; left out)');
  return out;
}

test('vrr: title, og:title, headline, H1, meta, canonical and breadcrumb are consistent', () => {
  assert.equal((h.match(/<title>([^<]*)<\/title>/) || [])[1], TITLE_HTML);
  assert.ok(TITLE.length >= 50 && TITLE.length <= 65, `title length ${TITLE.length}`);
  assert.ok(h.includes(`<meta property="og:title" content="${TITLE_HTML}">`));
  assert.equal(article.headline, HEADLINE);
  assert.equal((h.match(/<h1[\s>]/g) || []).length, 1);
  assert.ok(h.includes(`<h1>${H1}</h1>`));
  assert.ok(DESC.length <= 160, `meta length ${DESC.length}`);
  assert.ok(h.includes(`<meta name="description" content="${DESC}">`));
  assert.ok(h.includes(`<meta property="og:description" content="${DESC}">`));
  assert.equal(article.description, DESC);
  assert.ok(h.includes(`rel="canonical" href="${URL_}"`));
  assert.ok(h.includes(`<meta property="og:url" content="${URL_}">`));
  assert.equal(article.mainEntityOfPage, URL_);
  assert.deepEqual(crumbs.itemListElement.map((i) => i.item), ['https://elorumtech.elorum.world/', 'https://elorumtech.elorum.world/guides/', URL_]);
  assert.ok(h.includes('<script src="/analytics.js" defer></script>'));
  assert.ok(h.includes('<nav><a class="brand" href="../">ELORUMTECH</a><a href="../">Compatibility Engine</a></nav>'));
});

test('vrr: answer box, required sections, path matrix and console-vs-PC table', () => {
  assert.equal((h.match(/<div class="answer"><strong>Short answer:<\/strong>/g) || []).length, 1);
  for (const id of ['what', 'names', 'paths', 'devices', 'fixes']) assert.equal((h.match(new RegExp(`<h2 id="${id}">`, 'g')) || []).length, 1, id);
  const tables = [...h.matchAll(/<div class="tablewrap" role="region" aria-label="[^"]+" tabindex="0"><table><caption>[\s\S]*?<\/table><\/div>/g)].map((m) => m[0]);
  assert.equal(tables.length, 2);
  assert.equal((h.match(/<table>/g) || []).length, 2, 'every table is inside .tablewrap');
  const rows = (t) => [...t.matchAll(/<tr><th scope="row">([^<]+)<\/th>/g)].map((m) => txt(m[1]));
  assert.deepEqual(rows(tables[0]), ['HDMI 2.1 → HDMI 2.1 (HDMI Forum VRR)', 'HDMI 2.1 input → VESA Adaptive Sync (Intel Arc)', 'FreeSync over HDMI (displays without HDMI 2.1)', 'DisplayPort → DisplayPort (VESA Adaptive-Sync)', 'USB-C / Thunderbolt carrying DisplayPort, direct', 'Thunderbolt / USB-C dock', 'DisplayPort or USB-C → HDMI adapter', 'MST hub or daisy-chain']);
  assert.deepEqual(rows(tables[1]), ['PS5 / PS5 Pro', 'Xbox Series X', 'Xbox Series S', 'NVIDIA GeForce (G-SYNC Compatible)', 'AMD Radeon (FreeSync)', 'Intel Arc A-Series / B-Series', 'Intel 11th-generation integrated graphics', 'Mac']);
  assert.ok(h.includes('.tablewrap{overflow-x:auto;scroll-padding-inline:40px;'), 'tablewrap scroll-padding (page-local)');
  assert.ok(h.includes('<section class="cta" aria-labelledby="cta-heading">'));
  assert.equal((h.match(/<a class="btn" href="display-connection-solver.html">Open the Display &amp; Connection Solver →<\/a>/g) || []).length, 1);
});

test('vrr: step counts are pinned (8 fixes, 4 pre-purchase checks) and the page states no step count of its own', () => {
  assert.deepEqual(stepCounts(h), [FIX_STEPS, BUY_STEPS]);
  assert.doesNotMatch(txt(main(h)), /\b\d+ (steps|fixes|checks)\b/i);
  const plus = h.replace('<ol id="fix-steps">', '<ol id="fix-steps"><li>extra</li>');
  const minus = h.replace(/(<ol id="fix-steps">)<li>[\s\S]*?<\/li>/, '$1');
  for (const m of [plus, minus]) { assert.notEqual(m, h); assert.notDeepEqual(stepCounts(m), [FIX_STEPS, BUY_STEPS]); }
});

test('vrr: FAQPage JSON-LD equals the visible FAQ (5–7 entries)', () => {
  const sec = (h.match(/<section class="faq"[\s\S]*?<\/section>/) || [''])[0];
  const vis = [...sec.matchAll(/<details><summary>([\s\S]*?)<\/summary><p>([\s\S]*?)<\/p><\/details>/g)].map((m) => [txt(m[1]), txt(m[2])]);
  assert.ok(vis.length >= 5 && vis.length <= 7, `FAQ count ${vis.length}`);
  assert.equal((sec.match(/<details>/g) || []).length, vis.length);
  assert.deepEqual(faqLd.mainEntity.map((q) => [q.name, q.acceptedAnswer.text]), vis);
});

test('vrr: Updated, Last reviewed, datePublished/dateModified, sitemap lastmod and gate all 2026-10-23', () => {
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

test('vrr: sources are primary, unique, quoted, cited; every citation resolves; list matches the JSON', () => {
  assert.equal(SRC.schema, 'elorumtech-guide-sources/1');
  assert.equal(SRC.page, FILE);
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
    assert.ok(main(h).includes(cite(id)), `src-${id} never cited in the body`);
  }
  const cites = [...h.matchAll(/<a class="srcs" href="#src-([A-Z0-9]+)">\[([A-Z0-9]+)\]<\/a>/g)];
  assert.ok(cites.length >= 80, `citations ${cites.length}`);
  for (const m of cites) {
    assert.equal(m[1], m[2]);
    assert.ok(set.has(m[1]), `citation ${m[1]} has no source entry`);
  }
  assert.equal((h.match(/class="srcs"/g) || []).length, cites.length, 'no malformed citation links');
});

test('vrr: cited figures and labels match the page text, the [ID] next to them, and the source quote', () => {
  for (const f of FIGURES) assert.ok(figureOk(h, f), `figure not backed: ${f[0]} [${f[1]}]`);
});

test('vrr: repeated figures are cited at every occurrence', () => {
  for (const r of REPEATED) assert.ok(repeatedOk(h, r), `repeated figure not cited everywhere: ${r[0]}`);
});

test('vrr: figure checks catch mutants (1.2a→1.4, 30→40 series, 50→60 criteria, 8K→4K, Monterey 12→11, swapped IDs, one occurrence uncited)', () => {
  const F = (k) => FIGURES.find((f) => f[0] === k);
  const muts = [
    [h.replaceAll('first supported in DisplayPort 1.2a', 'first supported in DisplayPort 1.4'), F('first supported in DisplayPort 1.2a')],
    [h.replaceAll('GeForce 30 series and higher', 'GeForce 40 series and higher'), F('GeForce 30 series and higher')],
    [h.replaceAll('more than 50 test criteria', 'more than 60 test criteria'), F('more than 50 test criteria')],
    [h.replaceAll('VRR is disabled during 8K output', 'VRR is disabled during 4K output'), F('VRR is disabled during 8K output')],
    [h.replaceAll('macOS Monterey 12 or later', 'macOS Big Sur 11 or later'), F('macOS Monterey 12 or later')],
    [h.replaceAll('GeForce GTX 16 series/RTX 20 series and higher', 'GeForce RTX 20 series and higher'), F('GeForce GTX 16 series/RTX 20 series and higher')],
    [h.replace(`GeForce 30 series and higher per NVIDIA’s monitor list ${cite('NV2')}`, `GeForce 30 series and higher per NVIDIA’s monitor list ${cite('NV3')}`), F('GeForce 30 series and higher')],
    [h.replace(`1x HDMI 2.1 port ${cite('XB2')}`, '1x HDMI 2.1 port'), F('1x HDMI 2.1 port')],
    [h.replace(`Yes, DisplayPort 1.2a and later ${cite('V1')}`, 'Yes, DisplayPort 1.2a and later'), F('Yes, DisplayPort 1.2a and later')],
  ];
  for (const [m, f] of muts) {
    assert.notEqual(m, h, `mutation must change the page: ${f[0]}`);
    assert.equal(figureOk(m, f), false, `mutant survived: ${f[0]}`);
  }
  // A repeated figure losing its [ID] in one element fails even though other occurrences keep theirs.
  const once = h.replace(`set the monitor to DisplayPort 1.2a or higher in its menu ${cite('NV4')}`, 'set the monitor to DisplayPort 1.2a or higher in its menu');
  assert.notEqual(once, h);
  assert.equal(repeatedOk(once, REPEATED[0]), false);
  const once8k = h.replace(`On PS5, VRR is disabled during 8K output ${cite('PS1')}`, 'On PS5, VRR is disabled during 8K output');
  assert.notEqual(once8k, h);
  assert.equal(repeatedOk(once8k, REPEATED.find((r) => r[0] === '8K output')), false);
  // A figure whose source quote does not contain it must fail even when the [ID] is right next to it.
  assert.equal(figureOk(h, ['more than 50 test criteria', 'V2', 'more than 60 test criteria']), false);
});

test('vrr: single-source claims stay scoped (NVIDIA HDMI generation, Intel 11th-gen DP-only, Not documented paths, no tier Hz)', () => {
  assert.deepEqual(scopeProblems(h), []);
});

test('vrr: scope checks catch mutants', () => {
  const muts = [
    h.replace(`; GeForce GTX 16 series/RTX 20 series and higher per a 2021 NVIDIA support article ${cite('NV3')}`, ''),
    h.replaceAll('An older NVIDIA support article, last updated in 2021, says GeForce GTX 16 series/RTX 20 series and higher on HDMI 2.1 displays. ', ''),
    h.replace(`DisplayPort cable only; Intel’s 11th-generation developer article says HDMI is not supported ${cite('IN2')}`, `DisplayPort cable only; Intel says HDMI is not supported ${cite('IN2')}`),
    h.replace('<tr><th scope="row">Thunderbolt / USB-C dock</th><td><strong>Not documented</strong> in general</td>', '<tr><th scope="row">Thunderbolt / USB-C dock</th><td>Yes</td>'),
    h.replace('<tr><th scope="row">MST hub or daisy-chain</th><td><strong>Not documented</strong></td>', '<tr><th scope="row">MST hub or daisy-chain</th><td>Usually</td>'),
    h.replace('<tr><th scope="row">DisplayPort or USB-C → HDMI adapter</th><td><strong>Not documented</strong>; avoid for VRR</td>', '<tr><th scope="row">DisplayPort or USB-C → HDMI adapter</th><td>Yes with HDMI 2.1 adapters</td>'),
    h.replace('Premium and Premium Pro displays are certified for mandatory LFC', 'FreeSync Premium needs at least 120 Hz; Premium and Premium Pro displays are certified for mandatory LFC'),
    h.replace('Same VRR options as Series X', 'Same VRR options as Series X; Xbox One also supports FreeSync'),
  ];
  for (const [i, m] of muts.entries()) {
    assert.notEqual(m, h, `mutation ${i} must change the page`);
    assert.ok(scopeProblems(m).length > 0, `mutant ${i} survived`);
  }
});

test('vrr: internal links resolve; hub card and Related links from PS5, Xbox and Thunderbolt dock guides (exactly once)', () => {
  const hrefs = [...(h.match(/<main>[\s\S]*?<\/main>/) || [''])[0].matchAll(/<a [^>]*href="([^"#]+)"/g)].map((m) => m[1]).filter((x) => !/^https?:/.test(x));
  for (const r of ['display-connection-solver.html', 'ps5-hdmi-2-1-cable-path.html', 'xbox-series-display-compatibility.html', 'thunderbolt-dock-one-cable-4k-120.html', 'displayport-vs-hdmi.html', 'monitor-stuck-at-60hz.html']) assert.ok(hrefs.includes(r), r);
  for (const r of hrefs) {
    const p = path.join(root, 'guides', r);
    assert.ok(fs.existsSync(p.endsWith('/') ? path.join(p, 'index.html') : p), `broken link ${r}`);
  }
  const hub = read('guides/index.html');
  assert.equal((hub.match(/<div class="card"><a href="vrr-gsync-freesync-compatibility\.html"><strong>VRR, G-Sync and FreeSync: what works with what<\/strong>/g) || []).length, 1);
  for (const f of ['guides/ps5-hdmi-2-1-cable-path.html', 'guides/xbox-series-display-compatibility.html', 'guides/thunderbolt-dock-one-cable-4k-120.html']) {
    const g = read(f);
    const rel = (g.match(/<section class="related"[\s\S]*?<\/section>/) || [''])[0];
    assert.equal((rel.match(/href="vrr-gsync-freesync-compatibility\.html"/g) || []).length, 1, f);
    assert.equal((g.match(/href="vrr-gsync-freesync-compatibility\.html"/g) || []).length, 1, `${f}: link only in Related`);
  }
});

test('vrr: exactly one theme stylesheet right before </head>; no prices or affiliate links', () => {
  const THEME = '<link rel="stylesheet" href="/assets/elorum-theme.css">';
  assert.equal(h.split(THEME).length - 1, 1);
  assert.equal((h.match(/<link rel="stylesheet"/g) || []).length, 1);
  assert.ok(h.includes(`${THEME}</head>`));
  assert.doesNotMatch(txt(h), /[$€£]\s?\d|\d\s?(USD|EUR|kr\.?)\b/);
  assert.doesNotMatch(h, /amazon\.|amzn\.|[?&]tag=|affiliate|rel="sponsored"/i);
});

// REM01 (QA-01 PR #38 F1–F4): Mac HDMI exception [AP2], Intel Arc = VESA Adaptive Sync over HDMI 2.1 [IN1],
// FAQ 5 does not contradict AMD's dock list, and no uncited editorial tips.
const pathRow = (html, row) => {
  const paths = (html.match(/<div class="tablewrap" role="region" aria-label="Which connection paths carry VRR"[\s\S]*?<\/table><\/div>/) || [''])[0];
  const m = paths.match(new RegExp(`<tr><th scope="row">${row.replace(/[/.()|]/g, '\\$&')}</th>([\\s\\S]*?)</tr>`));
  return m ? m[1] : null;
};
function remProblems(html) {
  const out = [];
  const blocks = blocksOf(html);
  const faq = faqTexts(html);
  const answer = (html.match(/<div class="answer">([\s\S]*?)<\/div>/) || ['', ''])[1];
  // F1: wherever Apple's AP1 HDMI warning appears, the AP2 built-in-HDMI exception sits in the same element.
  for (const b of blocks) {
    const t = txt(b);
    if (/HDMI cable or adapter|not an HDMI adapter/.test(t) && !(b.includes(cite('AP2')) && /HDMI/.test(t.split(/HDMI cable or adapter|not an HDMI adapter/).slice(1).join(' ')))) out.push(`AP1 HDMI warning without the AP2 exception: ${t.slice(0, 70)}`);
    if (/HDMI[^.]{0,40}(never|does not|doesn’t|won’t) work[^.]{0,20}Mac|Mac[^.]{0,40}(never|cannot|can’t)[^.]{0,30}HDMI/.test(t)) out.push(`Mac HDMI VRR stated as impossible: ${t.slice(0, 70)}`);
  }
  if (!/own HDMI port with an Ultra High Speed 48 Gbps HDMI cable/.test(txt(answer)) || !answer.includes(cite('AP2'))) out.push('short answer lost the AP2 Mac HDMI exception');
  const fix5 = blocks.find((b) => /Remove adapters, docks and hubs/.test(b)) || '';
  if (!(/Mac’s HDMI port/.test(txt(fix5)) && fix5.includes(cite('AP2')))) out.push('fix step lost the AP2 Mac HDMI exception');
  const mac = blocks.find((b) => /^Adaptive Sync: Thunderbolt/.test(txt(b))) || '';
  if (!(/own HDMI port/.test(txt(mac)) && mac.includes(cite('AP2')))) out.push('Mac row lost the AP2 HDMI exception');
  for (const q of faq) if (/not an HDMI cable or adapter/.test(q) && !/Mac’s HDMI port/.test(q)) out.push('FAQ AP1 warning without the AP2 exception');
  // F2: Arc is VESA Adaptive Sync over an HDMI 2.1 input, never listed as HDMI Forum VRR.
  const forum = pathRow(html, 'HDMI 2.1 → HDMI 2.1 (HDMI Forum VRR)') || '';
  for (const seg of txt(forum).split(/(?<=\.)\s/)) if (/Intel Arc/.test(seg) && !/VESA Adaptive Sync/.test(seg)) out.push(`Intel Arc in the HDMI Forum VRR row: ${seg.slice(0, 60)}`);
  const arc = pathRow(html, 'HDMI 2.1 input → VESA Adaptive Sync (Intel Arc)');
  if (!arc || !arc.includes(cite('IN1')) || !/VESA Adaptive Sync/.test(txt(arc)) || !/HDMI 2\.1 standard/.test(txt(arc))) out.push('Intel Arc VESA-over-HDMI row missing or uncited');
  for (const b of blocks) { const t = txt(b); if (/Intel Arc( and NVIDIA)? (describe|needs?|uses?) HDMI (VRR|2\.1)/.test(t)) out.push(`Arc described as HDMI VRR: ${t.slice(0, 60)}`); }
  if (!/Intel Arc uses VESA Adaptive Sync, also over an HDMI 2\.1 input/.test(txt(answer))) out.push('short answer: Arc HDMI path not scoped to VESA Adaptive Sync');
  // F3: FAQ 5 must not deny dock VRR outright next to AMD's FreeSync dock list.
  const f5 = faq.find((q) => /MST hub/.test(q)) || '';
  if (/promise VRR through a dock\b/.test(f5) || !/docks in general/.test(f5) || !/FreeSync compatible docks/.test(f5)) out.push('FAQ 5 dock wording contradicts AMD1 dock list');
  // F4: the three uncited tips are gone.
  const plain = txt(main(html)) + ' ' + faq.join(' ');
  for (const tip of ['test directly first', 'Connect the VRR display directly to the graphics card for gaming', 'check the display maker’s firmware and settings']) if (plain.includes(tip)) out.push(`uncited tip: ${tip}`);
  return out;
}

test('vrr REM01: Mac HDMI exception [AP2], Intel Arc VESA-over-HDMI [IN1], FAQ 5 dock scope, no uncited tips', () => {
  assert.deepEqual(remProblems(h), []);
  const ap2 = src('AP2');
  assert.match(ap2.checked_at, /^2026-10-23T16:30:20\+02:00$/);
  for (const q of ['Use an Ultra High Speed 48 Gbps HDMI cable', 'Connect the HDMI cable directly from the HDMI port on your Mac to your display.']) assert.ok(ap2.quotes.includes(q), q);
});

test('vrr REM01: checks catch the old wording (mutants)', () => {
  const muts = [
    // F1: old short answer, fix step, Mac row and FAQ 5 (AP1 warning alone)
    h.replace(/Mac: for Adaptive Sync use a Thunderbolt or USB-C cable, not an HDMI adapter (<a class="srcs" href="#src-AP1">\[AP1\]<\/a>); the Mac models Apple lists also get VRR from their own HDMI port with an Ultra High Speed 48 Gbps HDMI cable, no adapter <a class="srcs" href="#src-AP2">\[AP2\]<\/a>\./, 'Mac: Thunderbolt or USB-C cable, not an HDMI adapter $1.'),
    h.replace(/For Adaptive Sync, Apple says not to use an HDMI cable or adapter (<a class="srcs" href="#src-AP1">\[AP1\]<\/a>); on the Mac models Apple lists for HDMI VRR, connect the HDMI cable directly from the Mac’s HDMI port with no adapter <a class="srcs" href="#src-AP2">\[AP2\]<\/a>\./, 'Apple says not to use an HDMI cable or adapter $1, and'),
    h.replace(/ HDMI: the Mac models Apple lists \([\s\S]*?connected directly without an adapter <a class="srcs" href="#src-AP2">\[AP2\]<\/a>/, ''),
    h.replaceAll('; on the Mac models Apple lists for HDMI VRR, connect the HDMI cable directly from the Mac’s HDMI port and don’t use an adapter with it.', '.'),
    h.replace('</p><p class="reviewed"', ' HDMI VRR never works on a Mac.</p><p class="reviewed"').replace('<h2 id="what">What VRR does</h2><p>', '<h2 id="what">What VRR does</h2><p>On a Mac, HDMI VRR does not work at all. '),
    // F2: Arc back in the HDMI Forum VRR row / old FreeSync-row sentence / Arc row removed / old answer
    h.replace(/Intel Arc is not in this row: its VRR over HDMI is VESA Adaptive Sync, shown in the next row (<a class="srcs" href="#src-IN1">\[IN1\]<\/a>)\./, 'Intel Arc needs an HDMI input that is HDMI 2.1 standard $1.'),
    h.replace(/NVIDIA describes VRR over HDMI on displays that support it over HDMI 2\.1 (<a class="srcs" href="#src-NV3">\[NV3\]<\/a>)\./, `Intel Arc and NVIDIA describe HDMI VRR on HDMI 2.1 displays ${cite('IN1')}$1.`),
    h.replace(/<tr><th scope="row">HDMI 2\.1 input → VESA Adaptive Sync \(Intel Arc\)<\/th>[\s\S]*?<\/tr>/, ''),
    h.replace('Intel Arc uses VESA Adaptive Sync, also over an HDMI 2.1 input', 'Intel Arc uses VESA Adaptive Sync'),
    // F3: old FAQ 5 dock wording
    h.replaceAll('promise VRR through docks in general, through a DisplayPort-to-HDMI adapter or through an MST hub', 'promise VRR through a dock, a DisplayPort-to-HDMI adapter or an MST hub'),
    // F4: uncited tips back
    h.replace('Check the hub maker’s documentation.', 'Connect the VRR display directly to the graphics card for gaming.'),
    h.replaceAll('or use a setting such as Gaming Only on Xbox. Apple also says to make sure the display is using the latest firmware from the manufacturer.', 'or use a setting such as Gaming Only on Xbox, and check the display maker’s firmware and settings.'),
  ];
  for (const [i, m] of muts.entries()) {
    assert.notEqual(m, h, `REM01 mutation ${i} must change the page`);
    assert.ok(remProblems(m).length > 0, `REM01 mutant ${i} survived`);
  }
  // Figure mutants: 48 Gbps -> 18 Gbps, AP2 swapped for AP1 next to the HDMI exception.
  const F = (k) => FIGURES.find((f) => f[0] === k);
  const g18 = h.replaceAll('Ultra High Speed 48 Gbps HDMI cable', 'Ultra High Speed 18 Gbps HDMI cable');
  assert.notEqual(g18, h);
  assert.equal(figureOk(g18, F('Ultra High Speed 48 Gbps HDMI cable')), false);
  const swap = h.replace(`own HDMI port with an Ultra High Speed 48 Gbps HDMI cable, no adapter ${cite('AP2')}`, `own HDMI port with an Ultra High Speed 48 Gbps HDMI cable, no adapter ${cite('AP1')}`);
  assert.notEqual(swap, h);
  assert.equal(figureOk(swap, F('Ultra High Speed 48 Gbps HDMI cable')), false);
  assert.equal(repeatedOk(swap, ['48 Gbps', ['AP2']]), false);
});
