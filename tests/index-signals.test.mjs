// INDEX-SIGNALS-01 (ELORUMTECH-INDEX-SIGNALS-20261023-01): indexing-signal fixes from ELORUM-INDEX-DIAG-20261023-01.
// 1) About links once to https://elorum.world/ (ELORUM) and names Nicki A. as editor (#editor).
// 2) Contextual Related links to low-linked guides + a Quick fixes line on /guides/; ps5-dell-u2725qe nav no longer links /index.html.
// 3) TechArticle datePublished = git first-commit-on-main date (docs/date-published.json).
// 4) Homepage sitemap lastmod corrected to 2026-10-18 (last content change on main; 2026-10-23 #33 was theme-only).
// 5) Author: Person "Nicki A." (owner-confirmed) from docs/site-author.json in JSON-LD + visible byline; publisher stays Organization.
// Title, meta description, H1 and canonical of all 35 pages are pinned to main 9a609f95 (hash below). Mutants for each check.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { extract } from './seo-freeze-extract.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const AUTHOR = JSON.parse(read('docs/site-author.json'));
const PUB = JSON.parse(read('docs/date-published.json')).pages;
const BASE = 'https://elorumtech.elorum.world/';
const lds = (h) => [...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1])).flatMap((j) => [].concat(j['@graph'] || j));
function htmlFiles(dir = root, out = []) {
  for (const n of fs.readdirSync(dir)) {
    if (n === '.git' || n === 'node_modules') continue;
    const p = path.join(dir, n);
    if (fs.statSync(p).isDirectory()) htmlFiles(p, out); else if (n.endsWith('.html')) out.push(path.relative(root, p).split(path.sep).join('/'));
  }
  return out.sort();
}
const ALL = htmlFiles();
const ARTICLES = ALL.filter((f) => lds(read(f)).some((x) => x['@type'] === 'TechArticle'));

// ---------- 0. frozen head fields (title, meta description, H1, canonical) vs main 9a609f95 ----------
const HEAD = {
 "about.html": "dca2725cc7ff6496",
 "compatibility/macbook-air-m5-dell-u2725qe.html": "7e811c9783f1fda9",
 "compatibility/ps5-dell-u2725qe.html": "9a08f0ac41bf02a2",
 "disclosure.html": "4017f5d27b49baaa",
 "google387f44b87908ecac.html": "210e130878aabaf4",
 "guides/bios-fast-boot-troubleshooter.html": "4bdcce42a3c04f21",
 "guides/console-handheld-display-hub.html": "d038fd5385544602",
 "guides/console-hdmi-avr-passthrough-path.html": "e149ba7923b4b82d",
 "guides/display-connection-solver.html": "99fc361ffb1afd74",
 "guides/displayport-monitor-connection-path.html": "16a6195a361464b8",
 "guides/displayport-vs-hdmi.html": "2bad5c3f2ec558db",
 "guides/dual-monitor-dock-mst-vs-thunderbolt.html": "9b27ccc0f87eb801",
 "guides/external-monitor-not-detected.html": "d3cc7256be29d4e9",
 "guides/hdmi-capture-passthrough-path.html": "5105399d77bd5731",
 "guides/index.html": "b8f0742940ff3a98",
 "guides/ipad-usbc-to-monitor-hdmi.html": "241f4ee49746f17e",
 "guides/laptop-to-docking-station.html": "b77179de242d076c",
 "guides/macbook-to-hdmi-display.html": "1e765f61c4f46af9",
 "guides/monitor-stuck-at-60hz.html": "6cb7e9347a405812",
 "guides/nintendo-switch-2-display-path.html": "370d71b3cf8b2cdd",
 "guides/ps5-hdmi-2-1-cable-path.html": "1a49428257682087",
 "guides/ps5-to-1440p-monitor.html": "b37fdddbc3c61f29",
 "guides/steam-deck-external-display.html": "80c00c294fa33087",
 "guides/thunderbolt-dock-one-cable-4k-120.html": "a71170f86fab18a9",
 "guides/usb-c-dock-display-limits.html": "3226d89d87510ae0",
 "guides/usb-c-hub-vs-dock.html": "d17d8450b56b09eb",
 "guides/usb-c-laptop-to-4k-monitor.html": "c68fce06823598eb",
 "guides/usb-c-pd-charger-compatibility.html": "8abfc95f8b9f509f",
 "guides/usb-c-phone-to-monitor.html": "d3a2c528b4f88d14",
 "guides/usb-c-to-hdmi-adapter-path.html": "e1e136df499531ad",
 "guides/usb4-vs-thunderbolt-4-monitor.html": "529f5bb2eec840ee",
 "guides/vrr-gsync-freesync-compatibility.html": "5df198e0e8ba8658",
 "guides/xbox-series-display-compatibility.html": "e9fa94e291c96121",
 "index.html": "51ba56438b551f0a",
 "methodology.html": "7b22b0a01d01b32f"
};
const headHash = (h) => { const e = extract(h); return crypto.createHash('sha256').update(JSON.stringify([e.title, e.metaDescription, e.h1, e.canonical])).digest('hex').slice(0, 16); };
test('IS-0 title, meta description, H1 and canonical unchanged on all 35 pages (main 9a609f95)', () => {
  assert.deepEqual(ALL, Object.keys(HEAD).sort());
  for (const f of ALL) assert.equal(headHash(read(f)), HEAD[f], f);
});
test('IS-0-MUT head pin detects title, H1, canonical and meta changes', () => {
  const h = read('guides/bios-fast-boot-troubleshooter.html');
  for (const m of [h.replace('<title>', '<title>X'), h.replace('</h1>', ' 2026</h1>'), h.replace('rel="canonical" href="https://', 'rel="canonical" href="http://'), h.replace('<meta name="description" content="', '<meta name="description" content="X')]) {
    assert.notEqual(m, h); assert.notEqual(headHash(m), HEAD['guides/bios-fast-boot-troubleshooter.html']);
  }
});

// ---------- 1. elorum.world link + editor line on About ----------
function aboutProblems(h) {
  const p = [];
  const card = (h.match(/<div class="card" id="editor">[\s\S]*?<\/div>/) || [''])[0];
  if (!card) p.push('no #editor card');
  if ((h.match(/href="https:\/\/elorum\.world\/"/g) || []).length !== 1) p.push('need exactly one elorum.world link');
  if (!card.includes('<a href="https://elorum.world/">ELORUM</a>')) p.push('elorum.world link not in editor card');
  if (/<a[^>]*elorum\.world\/"[^>]*rel=/.test(h)) p.push('elorum.world link must be a plain followed link');
  if (!card.includes(`<p>ELORUMTECH is edited by ${AUTHOR.name} It is part of`)) p.push('editor line');
  const ap = lds(h).find((x) => x['@type'] === 'AboutPage');
  if (!ap || JSON.stringify(ap.editor) !== JSON.stringify(AUTHOR.jsonLd)) p.push('AboutPage editor');
  if (!ap || ap.dateModified !== '2026-10-23') p.push('AboutPage dateModified');
  return p;
}
test('IS-1 About names Nicki A. as editor and links once to https://elorum.world/', () => {
  assert.deepEqual(aboutProblems(read('about.html')), []);
  for (const f of ALL.filter((x) => x !== 'about.html')) assert.doesNotMatch(read(f), /href="https:\/\/elorum\.world\//, f);
});
test('IS-1-MUT About check rejects missing, duplicated, nofollow and wrong-URL links and a changed name', () => {
  const h = read('about.html');
  const muts = [
    h.replace('<a href="https://elorum.world/">ELORUM</a>', 'ELORUM'),
    h.replace('<a href="https://elorum.world/">ELORUM</a>', '<a href="http://elorum.world/">ELORUM</a>'),
    h.replace('<a href="https://elorum.world/">ELORUM</a>', '<a href="https://elorum.world/" rel="nofollow">ELORUM</a>'),
    h.replace('</footer>', '<a href="https://elorum.world/">x</a></footer>'),
    h.replace('edited by Nicki A.', 'edited by Nicki'),
    h.replace('"editor":{"@type":"Person","name":"Nicki A."}', '"editor":{"@type":"Organization","name":"ELORUMTECH"}'),
  ];
  for (const m of muts) { assert.notEqual(m, h); assert.notDeepEqual(aboutProblems(m), []); }
});

// ---------- 5. author Person + visible byline ----------
function authorProblems(f, h) {
  const p = [];
  for (const x of lds(h)) {
    if (!('author' in x)) continue;
    if (JSON.stringify(x.author) !== JSON.stringify(AUTHOR.jsonLd)) p.push(`${x['@type']} author`);
    if (JSON.stringify(x.publisher) !== JSON.stringify(AUTHOR.publisher)) p.push(`${x['@type']} publisher`);
  }
  if (/"author":\{"@type":"Organization"/.test(h)) p.push('Organization author left');
  if (h.includes('(organisation, not a single author)')) p.push('old org byline left');
  if (ARTICLES.includes(f)) {
    if (!lds(h).some((x) => x['@type'] === 'TechArticle' && x.author)) p.push('TechArticle without author');
    const by = h.match(/<p class="byline"[^>]*>[\s\S]*?<\/p>/g) || [];
    if (by.length !== 1) p.push(`byline count ${by.length}`);
    else {
      if (!by[0].includes(AUTHOR.bylineHtml)) p.push('byline text');
      if (h.indexOf(by[0]) < h.indexOf('</h1>')) p.push('byline before H1');
    }
  }
  return p;
}
test('IS-5 every JSON-LD author is Person "Nicki A." (publisher Organization) and every article shows one "By Nicki A." byline', () => {
  assert.equal(ARTICLES.length, 28);
  assert.deepEqual(AUTHOR.jsonLd, { '@type': 'Person', name: 'Nicki A.' }, 'no invented biographical fields');
  let n = 0;
  for (const f of ALL) { const h = read(f); assert.deepEqual(authorProblems(f, h), [], f); n += lds(h).filter((x) => x.author).length; }
  assert.equal(n, 30, '28 TechArticle + Solver WebApplication + guides CollectionPage');
  assert.ok(fs.existsSync(path.join(root, 'about.html')) && read('about.html').includes('id="editor"'), 'byline target #editor exists');
});
test('IS-5-MUT author check rejects Organization author, extra Person fields, a second/missing byline and the old byline', () => {
  const f = 'guides/usb-c-phone-to-monitor.html';
  const h = read(f);
  const muts = [
    h.replace('"author":{"@type":"Person","name":"Nicki A."}', '"author":{"@type":"Organization","name":"ELORUMTECH"}'),
    h.replace('"author":{"@type":"Person","name":"Nicki A."}', '"author":{"@type":"Person","name":"Nicki A.","jobTitle":"Editor"}'),
    h.replace('"author":{"@type":"Person","name":"Nicki A."}', '"author":{"@type":"Person","name":"Nicki"}'),
    h.replace('"publisher":{"@type":"Organization","name":"ELORUMTECH"}', '"publisher":{"@type":"Person","name":"Nicki A."}'),
    h.replace(/<p class="byline"[^>]*>[\s\S]*?<\/p>/, ''),
    h.replace('</main>', '<p class="byline">By x</p></main>'),
    h.replace(AUTHOR.bylineHtml, 'By <a href="../methodology.html">ELORUMTECH</a> (organisation, not a single author)'),
  ];
  for (const m of muts) { assert.notEqual(m, h); assert.notDeepEqual(authorProblems(f, m), []); }
});

// ---------- 3. datePublished ----------
function pubProblems(f, h) {
  const p = [];
  const n = (h.match(/"datePublished"/g) || []).length;
  for (const x of lds(h)) {
    if (x['@type'] === 'TechArticle') {
      if (x.datePublished !== PUB[f]?.datePublished) p.push(`datePublished ${x.datePublished} != ${PUB[f]?.datePublished}`);
      if (!(x.datePublished <= x.dateModified)) p.push('datePublished after dateModified');
    } else if ('datePublished' in x) p.push(`datePublished on ${x['@type']}`);
  }
  if (ARTICLES.includes(f) && n !== 1) p.push(`datePublished count ${n}`);
  return p;
}
test('IS-3 every TechArticle has exactly one datePublished from docs/date-published.json, <= dateModified', () => {
  assert.deepEqual(Object.keys(PUB).sort(), ARTICLES);
  for (const f of ALL) assert.deepEqual(pubProblems(f, read(f)), [], f);
});
// CLEANUP-01 (QA-01 #40 F3): a shallow clone or a missing origin/main used to skip IS-3-GIT silently, so the suite
// could pass without ever checking datePublished against git. Now it fails loudly; the only way to skip is the
// explicit opt-out ELORUMTECH_SKIP_GIT_HISTORY=1 (e.g. for a tarball checkout), which is reported as a skip.
export function gitHistoryDecision({ hasOriginMain, shallow, env = {} }) {
  if (hasOriginMain && !shallow) return { action: 'run' };
  const why = !hasOriginMain ? 'origin/main is missing' : 'the clone is shallow';
  if (env.ELORUMTECH_SKIP_GIT_HISTORY === '1') return { action: 'skip', reason: `${why}; skipped by ELORUMTECH_SKIP_GIT_HISTORY=1` };
  return { action: 'fail', reason: `${why}: IS-3-GIT needs full history (git fetch --unshallow origin main) or set ELORUMTECH_SKIP_GIT_HISTORY=1 to skip explicitly` };
}
test('IS-3-GIT-DECISION full history runs; shallow or missing origin/main fails unless explicitly skipped', () => {
  assert.equal(gitHistoryDecision({ hasOriginMain: true, shallow: false }).action, 'run');
  assert.equal(gitHistoryDecision({ hasOriginMain: true, shallow: false, env: { ELORUMTECH_SKIP_GIT_HISTORY: '1' } }).action, 'run');
  assert.equal(gitHistoryDecision({ hasOriginMain: false, shallow: false }).action, 'fail');
  assert.equal(gitHistoryDecision({ hasOriginMain: true, shallow: true }).action, 'fail');
  assert.equal(gitHistoryDecision({ hasOriginMain: false, shallow: true }).action, 'fail');
  for (const v of ['', '0', 'true', 'yes']) assert.equal(gitHistoryDecision({ hasOriginMain: true, shallow: true, env: { ELORUMTECH_SKIP_GIT_HISTORY: v } }).action, 'fail', v);
  const s = gitHistoryDecision({ hasOriginMain: true, shallow: true, env: { ELORUMTECH_SKIP_GIT_HISTORY: '1' } });
  assert.equal(s.action, 'skip'); assert.match(s.reason, /shallow/);
  assert.match(gitHistoryDecision({ hasOriginMain: false, shallow: false }).reason, /origin\/main is missing/);
});
test('IS-3-GIT docs/date-published.json equals the first-parent commit on main that added each file (Europe/Copenhagen)', (t) => {
  let hasOriginMain = true, shallow = true;
  try { execFileSync('git', ['rev-parse', '--verify', 'origin/main'], { cwd: root, stdio: 'ignore' }); } catch { hasOriginMain = false; }
  try { shallow = execFileSync('git', ['rev-parse', '--is-shallow-repository'], { cwd: root, encoding: 'utf8' }).trim() === 'true'; } catch { hasOriginMain = false; }
  const d0 = gitHistoryDecision({ hasOriginMain, shallow, env: process.env });
  if (d0.action === 'skip') return t.skip(d0.reason);
  assert.equal(d0.action, 'run', d0.reason);
  for (const [f, v] of Object.entries(PUB)) {
    const lines = execFileSync('git', ['log', 'origin/main', '--first-parent', '--diff-filter=A', '--format=%H %cd', '--date=format-local:%Y-%m-%d', '--', f], { cwd: root, encoding: 'utf8', env: { ...process.env, TZ: 'Europe/Copenhagen' } }).trim().split('\n');
    const [sha, d] = lines.at(-1).split(' ');
    assert.equal(sha, v.firstMainCommit, f); assert.equal(d, v.datePublished, f);
  }
});
test('IS-3-MUT datePublished check rejects a changed, missing, duplicated or misplaced date', () => {
  const f = 'guides/ps5-to-1440p-monitor.html';
  const h = read(f);
  const muts = [
    h.replace('"datePublished":"2026-09-15"', '"datePublished":"2026-09-14"'),
    h.replace('"datePublished":"2026-09-15",', ''),
    h.replace('"datePublished":"2026-09-15"', '"datePublished":"2026-12-01"'),
    h.replace('"@type": "BreadcrumbList"', '"@type": "BreadcrumbList", "datePublished": "2026-09-15"'),
  ];
  for (const m of muts) { assert.notEqual(m, h); assert.notDeepEqual(pubProblems(f, m), []); }
  const s = read('guides/display-connection-solver.html');
  assert.notDeepEqual(pubProblems('guides/display-connection-solver.html', s.replace('"dateModified":"2026-10-23"', '"datePublished":"2026-10-18","dateModified":"2026-10-23"')), []);
});

// ---------- 2. internal links ----------
const LINKS = [
  ['guides/displayport-monitor-connection-path.html', 'bios-fast-boot-troubleshooter.html'],
  ['guides/usb-c-dock-display-limits.html', 'bios-fast-boot-troubleshooter.html'],
  ['guides/xbox-series-display-compatibility.html', 'console-handheld-display-hub.html'],
  ['guides/nintendo-switch-2-display-path.html', 'console-handheld-display-hub.html'],
  ['guides/steam-deck-external-display.html', 'console-handheld-display-hub.html'],
  ['guides/console-hdmi-avr-passthrough-path.html', 'console-handheld-display-hub.html'],
  ['guides/hdmi-capture-passthrough-path.html', 'console-handheld-display-hub.html'],
  ['guides/usb-c-to-hdmi-adapter-path.html', 'displayport-vs-hdmi.html'],
  ['guides/monitor-stuck-at-60hz.html', 'displayport-vs-hdmi.html'],
  ['guides/usb4-vs-thunderbolt-4-monitor.html', 'displayport-vs-hdmi.html'],
  ['guides/ps5-to-1440p-monitor.html', 'displayport-vs-hdmi.html'],
  ['guides/displayport-vs-hdmi.html', 'vrr-gsync-freesync-compatibility.html'],
  ['guides/ps5-to-1440p-monitor.html', 'vrr-gsync-freesync-compatibility.html'],
  ['guides/monitor-stuck-at-60hz.html', 'vrr-gsync-freesync-compatibility.html'],
  ['guides/console-handheld-display-hub.html', 'vrr-gsync-freesync-compatibility.html'],
  ['compatibility/ps5-dell-u2725qe.html', '../guides/vrr-gsync-freesync-compatibility.html'],
  ['guides/laptop-to-docking-station.html', 'usb-c-dock-display-limits.html'],
  ['guides/dual-monitor-dock-mst-vs-thunderbolt.html', 'usb-c-dock-display-limits.html'],
  ['guides/usb-c-hub-vs-dock.html', 'usb-c-dock-display-limits.html'],
  ['guides/usb-c-laptop-to-4k-monitor.html', 'external-monitor-not-detected.html'],
  ['guides/macbook-to-hdmi-display.html', 'external-monitor-not-detected.html'],
  ['guides/laptop-to-docking-station.html', 'external-monitor-not-detected.html'],
  ['guides/usb-c-laptop-to-4k-monitor.html', 'monitor-stuck-at-60hz.html'],
  ['guides/usb-c-to-hdmi-adapter-path.html', 'monitor-stuck-at-60hz.html'],
  ['guides/thunderbolt-dock-one-cable-4k-120.html', 'monitor-stuck-at-60hz.html'],
  ['guides/ps5-hdmi-2-1-cable-path.html', 'hdmi-capture-passthrough-path.html'],
  ['guides/ps5-to-1440p-monitor.html', 'hdmi-capture-passthrough-path.html'],
  ['guides/usb-c-phone-to-monitor.html', 'steam-deck-external-display.html'],
  ['guides/ipad-usbc-to-monitor-hdmi.html', 'steam-deck-external-display.html'],
  ['guides/usb-c-hub-vs-dock.html', 'steam-deck-external-display.html'],
];
const related = (h) => { let i = h.indexOf('<section class="related"'); if (i < 0) i = h.indexOf('<div class="related"'); return i < 0 ? '' : h.slice(i, h.indexOf('</ul>', i)); };
function linkProblems(src, href, h) {
  const r = related(h);
  if (!new RegExp(`<li><a href="${href.replace(/[.]/g, '\\.')}">[^<]{8,}</a></li>`).test(r)) return [`${src} Related lacks ${href}`];
  const t = path.posix.normalize(path.posix.join(path.posix.dirname(src), href));
  return fs.existsSync(path.join(root, t)) ? [] : [`${src}: ${href} -> ${t} missing`];
}
const QUICK = ['bios-fast-boot-troubleshooter.html', 'console-handheld-display-hub.html', 'external-monitor-not-detected.html', 'monitor-stuck-at-60hz.html', 'usb-c-dock-display-limits.html'];
const quickProblems = (h) => { const q = (h.match(/<p class="quickfix">[\s\S]*?<\/p><\/section>/) || [''])[0]; return QUICK.filter((x) => !q.includes(`<a href="${x}">`)); };
test('IS-2 the 30 new Related links exist, have descriptive anchors and resolve; /guides/ Quick fixes line in the hero', () => {
  assert.equal(LINKS.length, 30);
  assert.equal(new Set(LINKS.map((l) => l.join(' '))).size, 30);
  for (const [s, href] of LINKS) assert.deepEqual(linkProblems(s, href, read(s)), []);
  assert.deepEqual(quickProblems(read('guides/index.html')), []);
});
function inlinks() {
  const c = {};
  for (const f of ALL) {
    const body = (read(f).split(/<body[^>]*>/)[1] || '').replace(/<script\b[\s\S]*?<\/script>/g, '');
    for (const [, href] of body.matchAll(/<a\s[^>]*href="([^"#?]+)/g)) {
      if (/^(https?:|mailto:)/.test(href)) continue;
      let t = href.startsWith('/') ? href.slice(1) : path.posix.normalize(path.posix.join(path.posix.dirname(f), href));
      if (t === '.' || t === '') t = 'index.html'; else if (href.endsWith('/')) t = t + '/index.html';
      t = t.replace(/^\.\/|\/\/+/g, '/').replace(/^\//, '');
      if (t !== f) (c[t] ||= new Set()).add(f);
    }
  }
  return c;
}
test('IS-2b in-links (distinct linking pages) now meet the floor for the low-linked pages', () => {
  const c = inlinks();
  const FLOOR = { 'guides/bios-fast-boot-troubleshooter.html': 5, 'guides/console-handheld-display-hub.html': 9, 'guides/displayport-vs-hdmi.html': 8,
    'guides/vrr-gsync-freesync-compatibility.html': 9, 'guides/usb-c-dock-display-limits.html': 8, 'guides/external-monitor-not-detected.html': 9,
    'guides/monitor-stuck-at-60hz.html': 9, 'guides/hdmi-capture-passthrough-path.html': 8, 'guides/steam-deck-external-display.html': 9 };
  for (const [f, n] of Object.entries(FLOOR)) assert.ok((c[f]?.size ?? 0) >= n, `${f}: ${c[f]?.size} < ${n}`);
});
test('IS-2-MUT link checks reject a removed, renamed, empty-anchor or out-of-Related link and a missing Quick fix', () => {
  const [s, href] = LINKS[0];
  const h = read(s);
  const li = h.match(new RegExp(`<li><a href="${href.replace(/[.]/g, '\\.')}">[^<]*</a></li>`))[0];
  const muts = [h.replace(li, ''), h.replace(li, li.replace(href, href.replace('.html', '-x.html'))), h.replace(li, `<li><a href="${href}">BIOS</a></li>`), h.replace(li, '').replace('</main>', li + '</main>')];
  for (const m of muts) { assert.notEqual(m, h); assert.notDeepEqual(linkProblems(s, href, m) , []); }
  const g = read('guides/index.html');
  assert.notDeepEqual(quickProblems(g.replace('<a href="monitor-stuck-at-60hz.html">monitor stuck at 60 Hz</a> · ', '')), []);
});

// ---------- 2c. no /index.html home links; 4. sitemap ----------
const indexHrefs = (h) => [...h.matchAll(/<a\s[^>]*href="([^"]*)"/g)].map((m) => m[1]).filter((x) => !/^https?:/.test(x) && /(^|\/)index\.html$/.test(x));
test('IS-4 no page links to index.html (home is "../" or "./"); homepage lastmod 2026-10-18, About 2026-10-23', () => {
  for (const f of ALL) assert.deepEqual(indexHrefs(read(f)), [], f);
  assert.ok(read('compatibility/ps5-dell-u2725qe.html').includes('<nav><b>ELORUMTECH</b> · <a href="../">Compatibility Engine</a></nav>'));
  const sm = read('sitemap.xml');
  assert.match(sm, new RegExp(`<loc>${BASE.replace(/\./g, '\\.')}</loc>\\s*<lastmod>2026-10-18</lastmod>`));
  assert.match(sm, new RegExp(`<loc>${BASE.replace(/\./g, '\\.')}about\\.html</loc>\\s*<lastmod>2026-10-23</lastmod>`));
  const gate = JSON.parse(read('docs/release-date-gate.json')).pages.find((p) => p.file === 'about.html');
  assert.deepEqual(gate, { file: 'about.html', url: BASE + 'about.html', visibleUpdated: true, intendedReleaseDate: '2026-10-23' });
});
test('IS-4-MUT index.html link check rejects ../index.html and ./index.html', () => {
  const h = read('compatibility/ps5-dell-u2725qe.html');
  assert.notDeepEqual(indexHrefs(h.replace('<a href="../">Compatibility Engine</a>', '<a href="../index.html">Compatibility Engine</a>')), []);
  assert.notDeepEqual(indexHrefs('<a href="./index.html">x</a>'), []);
  assert.deepEqual(indexHrefs('<a href="https://support.nintendo.com/x/index.html">x</a>'), []);
});
