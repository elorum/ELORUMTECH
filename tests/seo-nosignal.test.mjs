// SEO-NOSIGNAL-01: "hdmi no signal" / "monitor no signal" section on the external-monitor guide.
// Section + table + HDMI/DP blocks, 2 appended FAQ entries (JSON-LD == visible), dates/sitemap/gate,
// primary-domain sources, and the actual cited figures: each value must sit next to its [ID] on the page
// AND appear in that source's recorded quote in display/standards.json (mutants are checked below).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const FILE = 'guides/external-monitor-not-detected.html';
const URL_ = `https://elorumtech.elorum.world/${FILE}`;
const DATE = '2026-10-23';
const TITLE = 'External Monitor Not Detected or No Signal: Fix It Step by Step | ELORUMTECH';
const H1 = 'External monitor not detected or “no signal”';
const NEW_IDS = ['DL1', 'DL2', 'DL3', 'DL4', 'HP1', 'IN1', 'IN2', 'NV1', 'NV2', 'HL1'];
// OEM / standards-body support domains only (Plugable = dock maker, kept from the 2026-10-18 page).
const PRIMARY = /^https:\/\/(support\.microsoft\.com|learn\.microsoft\.com|www\.dell\.com\/support|dl\.dell\.com\/Manuals|support\.hp\.com|www\.intel\.com\/content\/www\/us\/en\/support|nvidia\.custhelp\.com|www\.hdmi\.org|kb\.plugable\.com)\//;
const NEW_FAQ = [
  ['Why does my HDMI monitor say no signal?', 'Usually the monitor is on a different HDMI input than the port you used, Windows is not sending a picture to it, or the cable cannot carry the mode you picked. Select the matching input (HDMI 1, HDMI 2), press Windows logo key + P and choose Duplicate or Extend, and use an Ultra High Speed HDMI cable for 4K at 120 Hz. If Windows sees the display but it stays black, Dell lists HDCP issues as a cause: update the graphics driver.'],
  ['Why does my DisplayPort monitor show no signal after sleep?', 'Some monitors disable the DisplayPort input when the computer sleeps or loses the signal; HP documents this for its monitors. Wake the computer, then select the DisplayPort input again in the monitor’s menu. If the screen is blank only during boot with an older NVIDIA card and a DisplayPort 1.3 or 1.4 monitor, NVIDIA says the card may need a firmware update.'],
];
// [value on page, source id cited in the same element, value as it appears in the source quote]
const FIGURES = [
  ['up to 48 Gbps', 'HL1', 'up to 48Gbps maximum bandwidth'],
  ['4K at 120 Hz needs an Ultra High Speed HDMI cable', 'DL3', 'For 4K @ 120 Hz: Ultra High Speed HDMI cable required.'],
  ['under 5 m (15 ft)', 'DL3', 'Under 15 feet (5 meters) - All cable types work well'],
  ['beyond 15 m you need an active or fiber optic HDMI cable', 'DL3', 'Over 50 feet (15+ meters) - Requires active (powered) HDMI cables or fiber optic HDMI cables'],
  ['4K at 60 Hz at most', 'DL3', 'HDMI 2.0 performance (4K @ 60 Hz maximum)'],
  ['wait 10 seconds', 'DL3', 'Wait 10 seconds for the display to detect signal.'],
  ['hold the DP select key for 8 seconds', 'DL4', 'press and hold DP select key for 8 sec'],
  ['from DP 1.4 to DP 1.1a', 'DL4', 'from DP 1.4 to DP 1.1a'],
  ['3840x2160, 60Hz', 'DL4', 'change your input timing to 3840x2160, 60Hz'],
  ['including the GeForce 10 series', 'NV2', 'GeForce 10 Series: GeForce GT 1030'],
  ['DisplayPort 1.3/1.4 monitors', 'NV2', 'connected to a DisplayPort 1.3 / 1.4 monitor could experience blank screens on boot until the operating system loads'],
  ['USB-C must be selected manually', 'HP1', 'You must manually select USB Type-C input.'],
  ['after the computer exits Sleep or loses the signal', 'HP1', 'after the computer exits Sleep or loses the input signal'],
  ['amber, orange or blinking white power LED', 'DL2', 'Amber, orange, or blinking white light: The monitor has power but is not receiving a video signal'],
  ['Use the graphics card ports, usually lower on the back panel', 'DL2', 'usually located lower on the back panel'],
  ['Intel does not support cable splitting', 'IN2', 'Cable splitting is not supported.'],
];
const h = read(FILE);
const STD = JSON.parse(read('display/standards.json'));
const src = (id) => STD.sources.find((s) => s.id === id);
const ld = [...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
const article = ld.find((o) => o['@type'] === 'TechArticle');
const faqLd = ld.find((o) => o['@type'] === 'FAQPage');
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', rsquo: '’', ldquo: '“', rdquo: '”' };
const txt = (s) => s.replace(/<[^>]+>/g, '').replace(/&([a-z]+);/g, (m, n) => ENT[n] ?? m).replace(/\s+/g, ' ').trim();
const section = (html) => (html.match(/<h2 id="no-signal">[\s\S]*?(?=<h2 id="usb-c">)/) || [''])[0];

// Smallest <li>/<td>/<p> in the no-signal section that contains the value must also cite the source.
function figureOk(html, [onPage, id, inSource]) {
  const blocks = [...section(html).matchAll(/<(li|td|p)\b[^>]*>([\s\S]*?)<\/\1>/g)].map((m) => m[2]);
  const hit = blocks.filter((b) => txt(b).includes(onPage));
  if (!hit.length) return false;
  const s = src(id);
  return hit.some((b) => b.includes(`<a class="srcs" href="#src-${id}">[${id}]</a>`)) && !!s && s.quotes.some((q) => q.includes(inSource));
}

test('nosignal: URL, title, meta description and H1 unchanged; one H1', () => {
  assert.equal((h.match(/<title>([^<]*)<\/title>/) || [])[1], TITLE);
  assert.ok(h.includes(`<meta property="og:title" content="${TITLE}">`));
  assert.equal((h.match(/<h1[\s>]/g) || []).length, 1);
  assert.ok(h.includes(`<h1>${H1}</h1>`));
  assert.equal(article.headline, H1);
  assert.ok(h.includes(`rel="canonical" href="${URL_}"`));
  assert.ok(h.includes(`<meta property="og:url" content="${URL_}">`));
  assert.ok(h.includes('<meta name="description" content="External monitor not detected or showing no signal? Fix steps in the right order: input, Windows + P, cables, ports, USB-C “Display connection might be limited”, docks and drivers.">'));
});

test('nosignal: section, symptom table, HDMI + DisplayPort blocks, BIOS link', () => {
  const s = section(h);
  assert.ok(s.startsWith('<h2 id="no-signal">“No signal” on HDMI or DisplayPort</h2>'));
  assert.equal((h.match(/id="no-signal"/g) || []).length, 1);
  const table = (s.match(/<div class="tablewrap" role="region" aria-label="[^"]+" tabindex="0"><table>[\s\S]*?<\/table><\/div>/) || [''])[0];
  assert.ok(table);
  assert.equal((table.match(/<tr><th scope="row">/g) || []).length, 7);
  for (const k of ['Monitor is on a different input', 'Cable in the motherboard’s video port', 'Mode outside the monitor’s supported range', 'Protected content (HDCP) issue', 'Some monitors disable the DP input after sleep; HP documents this for its monitors', 'Older NVIDIA card with a DisplayPort 1.3/1.4 monitor', 'Graphics driver']) assert.ok(table.includes(k), k);
  assert.ok(s.includes('<h3>HDMI: no signal</h3>'));
  assert.ok(s.includes('<h3>DisplayPort: no signal</h3>'));
  assert.ok(s.includes('<a href="bios-fast-boot-troubleshooter.html">'));
  assert.ok(fs.existsSync(path.join(root, 'guides/bios-fast-boot-troubleshooter.html')));
});

test('nosignal: exactly 2 FAQ entries appended (7 total) and FAQPage JSON-LD equals the visible FAQ', () => {
  const vis = [...h.matchAll(/<details><summary>([\s\S]*?)<\/summary><p>([\s\S]*?)<\/p><\/details>/g)].map((m) => [txt(m[1]), txt(m[2])]);
  assert.equal(vis.length, 7);
  assert.equal(faqLd.mainEntity.length, 7);
  assert.deepEqual(faqLd.mainEntity.map((q) => [q.name, q.acceptedAnswer.text]), vis);
  assert.deepEqual(vis.slice(5), NEW_FAQ);
  assert.equal(vis[0][0], 'Why does my monitor say no signal when the PC is on?');
  assert.equal(vis[4][0], 'Why does the screen go black only at high refresh rates?');
});

test('nosignal: Updated, Last reviewed, dateModified, sitemap lastmod and gate all 2026-10-23', () => {
  assert.equal((h.match(/<p class="updated"[^>]*>Updated: (\d{4}-\d{2}-\d{2})<\/p>/) || [])[1], DATE);
  assert.equal((h.match(/Updated:/g) || []).length, 1);
  assert.equal((h.match(/Last reviewed: \d{4}-\d{2}-\d{2}/g) || []).length, 1);
  assert.ok(h.includes(`Last reviewed: ${DATE} by ELORUMTECH`));
  assert.equal(article.dateModified, DATE);
  const sm = read('sitemap.xml');
  const entry = sm.match(new RegExp(`<loc>${URL_.replace(/[.\/]/g, '\\$&')}</loc>\\s*<lastmod>([^<]+)</lastmod>`));
  assert.equal(entry && entry[1], DATE);
  const g = JSON.parse(read('docs/release-date-gate.json')).pages.filter((p) => p.file === FILE);
  assert.deepEqual(g, [{ file: FILE, url: URL_, visibleUpdated: true, intendedReleaseDate: DATE }]);
});

test('nosignal: every listed source is primary, unique and cited; new sources cited in the section and quoted', () => {
  const ids = [...h.matchAll(/<li id="src-([A-Z0-9]+)"><a href="([^"]+)" rel="noopener">/g)];
  const set = new Set(ids.map((m) => m[1]));
  assert.equal(set.size, ids.length);
  assert.equal(ids.length, 18);
  for (const [, id, href] of ids) {
    assert.match(href.replace(/&#39;/g, "'"), PRIMARY, `src-${id} not primary: ${href}`);
    assert.ok(h.includes(`<a class="srcs" href="#src-${id}">[${id}]</a>`), `src-${id} never cited`);
  }
  for (const m of h.matchAll(/<a class="srcs" href="#src-([A-Z0-9]+)">\[([A-Z0-9]+)\]<\/a>/g)) {
    assert.equal(m[1], m[2]);
    assert.ok(set.has(m[1]), `citation ${m[1]} has no source entry`);
  }
  for (const id of NEW_IDS) {
    assert.ok(set.has(id), id);
    assert.ok(section(h).includes(`href="#src-${id}"`), `${id} not cited in the no-signal section`);
    const s = src(id);
    assert.match(s.url, PRIMARY);
    assert.match(s.checked_at, /^2026-10-23T\d{2}:\d{2}:\d{2}\+02:00$/);
    assert.ok(s.quotes.length >= 2 && s.kind && s.publisher);
  }
});

test('nosignal: cited figures match the page text, the [ID] next to them, and the source quote', () => {
  for (const f of FIGURES) assert.ok(figureOk(h, f), `figure not backed: ${f[0]} [${f[1]}]`);
});

test('nosignal: figure checks catch mutants (48→40 Gbps, 5→10 m, 8→5 s, wrong source ID, DP 1.1a→1.2)', () => {
  const muts = [
    [h.replace('up to 48 Gbps', 'up to 40 Gbps'), FIGURES[0]],
    [h.replace('under 5 m (15 ft)', 'under 10 m (15 ft)'), FIGURES[2]],
    [h.replace('for 8 seconds', 'for 5 seconds'), FIGURES[6]],
    [h.replace('up to 48 Gbps and carries a certification label you can scan with a QR code app <a class="srcs" href="#src-HL1">[HL1]</a>', 'up to 48 Gbps and carries a certification label you can scan with a QR code app <a class="srcs" href="#src-DL3">[DL3]</a>'), FIGURES[0]],
    [h.replace('from DP 1.4 to DP 1.1a', 'from DP 1.4 to DP 1.2'), FIGURES[7]],
  ];
  for (const [m, f] of muts) {
    assert.notEqual(m, h, 'mutation must change the page');
    assert.equal(figureOk(m, f), false, `mutant survived: ${f[0]}`);
  }
});

test('nosignal: exactly one theme stylesheet and no other stylesheet', () => {
  const THEME = '<link rel="stylesheet" href="/assets/elorum-theme.css">';
  assert.equal(h.split(THEME).length - 1, 1);
  assert.equal((h.match(/<link rel="stylesheet"/g) || []).length, 1);
  assert.ok(h.includes(`${THEME}</head>`));
});

// ---------- CLEANUP-01 (ELORUMTECH-CLEANUP-20261023-01): QA-01 #36 F1, F2, F3 ----------
// F1: the freeze baseline is regenerated on every content change, so it is not a lasting content check. Pin the
// HDMI (7) and DisplayPort (4) steps and the table's "What to do" cells here, text and citations included.
const HDMI_STEPS = [
  "Set the monitor or TV to the HDMI input number that matches the port you used [DL3] [IN2].",
  "Press Windows logo key + P, select Duplicate or Extend, and wait 10 seconds for the display to detect the signal [DL3].",
  "Restart in this order: unplug the HDMI cable, shut down the computer, turn the display off and on, plug the cable back in, then start the computer [DL3].",
  "Check the cable. 4K at 120 Hz needs an Ultra High Speed HDMI cable [DL3], which is certified for up to 48 Gbps and carries a certification label you can scan with a QR code app [HL1]. Dell says all cable types work well under 5 m (15 ft); beyond 15 m you need an active or fiber optic HDMI cable [DL3].",
  "Remember the slowest part sets the limit: an HDMI 2.1 computer with an HDMI 2.0 cable and monitor gets HDMI 2.0 performance, 4K at 60 Hz at most [DL3].",
  "Take out HDMI splitters. Intel does not support cable splitting [IN2].",
  "Update the graphics driver and the HDMI and TV firmware. On Intel graphics, also check that the display is enabled in Intel Graphics Command Center [IN1].",
];
const DP_STEPS = [
  "After sleep, select the DisplayPort input again in the monitor menu. HP documents that its monitors can disable the DisplayPort input after the computer exits Sleep or loses the signal [HP1].",
  "Check the DisplayPort version setting. Some DP 1.1a graphics cards cannot drive DP 1.4 monitors; on the Dell U2720Q you hold the DP select key for 8 seconds in the input menu to switch from DP 1.4 to DP 1.1a [DL4].",
  "Blank only until Windows loads? NVIDIA lists Maxwell and desktop Pascal cards, including the GeForce 10 series, that may need a firmware update for DisplayPort 1.3/1.4 monitors [NV2].",
  "On a new monitor that needs DisplayPort 1.3 or 1.4, NVIDIA suggests trying an HDMI port or a different monitor temporarily; with several monitors, connect only one while you troubleshoot [NV1].",
];
const TODO = [
  "Select the exact input in the monitor menu (HDMI 1, HDMI 2, DisplayPort) [DL3]. HP monitors find most inputs automatically, but USB-C must be selected manually [HP1].",
  "Use the graphics card ports, usually lower on the back panel [DL2].",
  "Lower the resolution or try a different refresh rate [DL3]. The Dell U2720Q, for example, reports “The current input timing is not supported” and asks for 3840x2160, 60Hz or another listed timing [DL4].",
  "Update the graphics driver [DL3]. HDCP encrypts the stream between the transmitter and the receiver [IN2].",
  "Wake the computer (move the mouse or press a key) [DL1], then select the DisplayPort input again in the monitor menu [HP1].",
  "Run NVIDIA’s graphics firmware update for that card [NV2].",
  "Roll back the graphics driver in Device Manager [DL2].",
];
const olItems = (html, t) => [...((section(html).match(new RegExp(`<h3>${t}</h3><ol>([\\s\\S]*?)</ol>`)) || ['', ''])[1]).matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => txt(m[1]));
const todoCells = (html) => [...section(html).matchAll(/<tr><th scope="row">[\s\S]*?<\/td><td>([\s\S]*?)<\/td><\/tr>/g)].map((m) => txt(m[1]));
function cleanupProblems(html) {
  const out = [];
  const hd = olItems(html, 'HDMI: no signal'); const dp = olItems(html, 'DisplayPort: no signal'); const td = todoCells(html);
  if (hd.length !== 7) out.push(`HDMI steps ${hd.length}`);
  if (dp.length !== 4) out.push(`DP steps ${dp.length}`);
  if (JSON.stringify(hd) !== JSON.stringify(HDMI_STEPS)) out.push('HDMI step text');
  if (JSON.stringify(dp) !== JSON.stringify(DP_STEPS)) out.push('DP step text');
  if (JSON.stringify(td) !== JSON.stringify(TODO)) out.push('What to do cells');
  // F2: the sleep cause is scoped to what HP documents, and cites HP1 in the cause cell itself.
  const row = (section(html).match(/<tr><th scope="row">DisplayPort monitor dark after the PC sleeps<\/th><td>([\s\S]*?)<\/td>/) || ['', ''])[1];
  if (!/^Some monitors disable the DP input after sleep; HP documents this for its monitors \[HP1\]$/.test(txt(row)) || !row.includes('<a class="srcs" href="#src-HP1">[HP1]</a>')) out.push('sleep cause not scoped to HP1');
  // F3: NV1's HDMI/other-monitor advice keeps its condition (a new DP 1.3/1.4 monitor).
  const nv = dp.find((x) => /NV1/.test(x)) || '';
  if (!/^On a new monitor that needs DisplayPort 1\.3 or 1\.4, NVIDIA suggests trying an HDMI port or a different monitor temporarily/.test(nv)) out.push('NV1 advice lost its condition');
  const q = src('NV1').quotes;
  if (!q.some((x) => x.includes('new monitor that requires Display Port (DP 1.3 or 1.4) try using an HDMI port or a different monitor temporarily'))) out.push('NV1 condition quote');
  if (!q.some((x) => x.includes('try only connecting a single monitor'))) out.push('NV1 single-monitor quote');
  return out;
}

test('nosignal CLEANUP-01: 7 HDMI + 4 DP steps and What-to-do cells pinned; HP1 sleep scope; NV1 condition (#36 F1–F3)', () => {
  assert.deepEqual(cleanupProblems(h), []);
});

test('nosignal CLEANUP-01: mutants (dropped restart step, edited step, edited cell, old cause wording, unconditional NV1)', () => {
  const muts = [
    h.replace(/<li>Restart in this order:[\s\S]*?<\/li>\n?/, ''),
    h.replace('wait 10 seconds for the display', 'wait 30 seconds for the display'),
    h.replace('hold the DP select key for 8 seconds', 'hold the DP select key for 5 seconds'),
    h.replace('Roll back the graphics driver in Device Manager', 'Reinstall Windows'),
    h.replace('Use the graphics card ports, usually lower on the back panel <a class="srcs" href="#src-DL2">[DL2]</a>', 'Use the graphics card ports, usually lower on the back panel'),
    h.replace('<td>Some monitors disable the DP input after sleep; HP documents this for its monitors <a class="srcs" href="#src-HP1">[HP1]</a></td>', '<td>Monitor disabled the DP input after sleep</td>'),
    h.replace('On a new monitor that needs DisplayPort 1.3 or 1.4, NVIDIA suggests trying', 'While you test, NVIDIA suggests trying'),
    h.replace('</ol></div>\n<p>Black screen only', '<li>Try another cable.</li></ol></div>\n<p>Black screen only'),
  ];
  for (const [i, m] of muts.entries()) {
    assert.notEqual(m, h, `mutation ${i} must change the page`);
    assert.ok(cleanupProblems(m).length > 0, `mutant ${i} survived`);
  }
});
