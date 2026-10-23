// ELORUMTECH-SOLVER-ADDITIONS-20261023-01: verified device facts for the Display & Connection Solver.
// Facts DF01-DF42 = MI-01 items MI-SOLV-001..042 (VERIFIED); MI-SOLV-043..052 (UNVERIFIED) are excluded.
// Every fact is tied to its stored verbatim quote (docs/sources/display-connection-solver.json), every page row to
// its fact and [ID], every EV-DF* evidence record (display/devices.json) to the same quote, and the real-device
// records are run through the fail-closed engine: they can FAIL on a documented limit but never PASS alone.
// Each check is a pure function; the mutants at the end prove the checks catch the faults they guard against.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { extract } from './seo-freeze-extract.mjs';
import { render, deviceFacts } from '../display/build-pages.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const E = createRequire(import.meta.url)(path.join(root, 'display/engine-display.js'));
const PAGE = 'guides/display-connection-solver.html';
const DATA = JSON.parse(read('docs/sources/display-connection-solver.json'));
const LIB = JSON.parse(read('display/devices.json'));
const HTML = read(PAGE);
const clone = (x) => structuredClone(x);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const norm = (s) => s.replace(/[\u2010\u2011]/g, '-').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
const MI_IN = Array.from({ length: 42 }, (_, i) => 'MI-SOLV-' + String(i + 1).padStart(3, '0'));
const MI_OUT = Array.from({ length: 10 }, (_, i) => 'MI-SOLV-' + String(i + 43).padStart(3, '0'));
const KINDS = ['manufacturer_spec', 'manufacturer_support', 'standard_body'];
const GROUPS = ['consoles', 'mac', 'docks', 'monitors', 'gpus', 'standards'];

export function checkFacts(d) {
  const errs = [];
  const src = Object.fromEntries(d.sources.map((s) => [s.id, s]));
  if (d.schema !== 'elorumtech-guide-sources/1') errs.push('schema');
  if (d.page !== PAGE) errs.push('page');
  if (d.facts.length !== 42) errs.push('expected 42 facts, got ' + d.facts.length);
  if (JSON.stringify(d.facts.map((f) => f.mi_item)) !== JSON.stringify(MI_IN)) errs.push('facts must be exactly MI-SOLV-001..042 in order');
  d.facts.forEach((f, i) => {
    const w = f.id;
    if (f.id !== 'DF' + String(i + 1).padStart(2, '0')) errs.push(w + ': id out of sequence');
    if (!GROUPS.includes(f.group)) errs.push(w + ': group');
    if (!f.device || !f.port || !f.claim) errs.push(w + ': device/port/claim missing');
    const s = src[f.source];
    if (!s) { errs.push(w + ': source ' + f.source + ' missing'); return; }
    if (!f.quotes.length) errs.push(w + ': no quotes');
    f.quotes.forEach((q) => { if (!s.quotes.includes(q)) errs.push(w + ': quote not stored on ' + s.id + ': ' + q); });
    if (!f.figures.length) errs.push(w + ': no figures');
    f.figures.forEach(([pg, qt]) => {
      if (!f.claim.includes(pg)) errs.push(w + ': figure not in claim: ' + pg);
      if (!f.quotes.some((q) => norm(q).includes(norm(qt)))) errs.push(w + ': figure not in a quote: ' + qt);
    });
  });
  const used = new Set(d.facts.map((f) => f.source));
  d.sources.forEach((s) => {
    if (!/^[A-Z]{3}\d$/.test(s.id)) errs.push(s.id + ': id pattern');
    if (!/^https:\/\//.test(s.url)) errs.push(s.id + ': url');
    if (!KINDS.includes(s.kind)) errs.push(s.id + ': kind');
    if (!/^2026-10-23T\d\d:\d\d:\d\d\+02:00$/.test(s.checked_at)) errs.push(s.id + ': checked_at');
    if (!s.quotes.length) errs.push(s.id + ': no quotes');
    if (!used.has(s.id)) errs.push(s.id + ': unused source');
    s.quotes.forEach((q) => { if (!d.facts.some((f) => f.source === s.id && f.quotes.includes(q))) errs.push(s.id + ': quote not used by a fact: ' + q); });
  });
  if (new Set(d.sources.map((s) => s.id)).size !== d.sources.length) errs.push('duplicate source id');
  if (JSON.stringify((d.excluded || []).map((x) => x.mi_item)) !== JSON.stringify(MI_OUT)) errs.push('excluded must list MI-SOLV-043..052');
  (d.excluded || []).forEach((x) => { if (d.facts.some((f) => f.mi_item === x.mi_item)) errs.push('excluded item added: ' + x.mi_item); });
  return errs;
}

export function checkEvidence(lib, d) {
  const errs = [];
  const src = Object.fromEntries(d.sources.map((s) => [s.id, s]));
  const ev = Object.fromEntries(lib.evidence.map((e) => [e.id, e]));
  if (lib.evidence.length !== d.facts.length) errs.push('one EV-DF record per fact');
  d.facts.forEach((f) => {
    const e = ev['EV-' + f.id], s = src[f.source];
    if (!e) { errs.push('EV-' + f.id + ' missing'); return; }
    if (!f.quotes.includes(e.relevant_evidence)) errs.push(e.id + ': relevant_evidence is not a stored quote of ' + f.id);
    if (e.source_url !== s.url) errs.push(e.id + ': source_url');
    if (e.checked_at !== s.checked_at) errs.push(e.id + ': checked_at');
    if (e.source_kind !== s.kind) errs.push(e.id + ': source_kind');
    if (e.confidence !== 'VERIFIED') errs.push(e.id + ': confidence');
    if (!e.notes.startsWith(f.mi_item)) errs.push(e.id + ': notes must start with ' + f.mi_item);
  });
  errs.push(...E.validateDocument(lib), ...E.lint(lib));
  // No version label or named tier may be stated as a VERIFIED rate; tier -> number is DERIVED and cites its EV.
  lib.devices.forEach((dv) => (dv.ports || []).forEach((p) => {
    const w = dv.device_id + '/' + p.port_id, r = p.link.max_link_rate_per_lane;
    if (r.status === 'VERIFIED') errs.push(w + ': max_link_rate_per_lane must not be VERIFIED from a label or tier name');
    if (r.status === 'DERIVED' && !r.derived_from.some((x) => /^EV-DF\d\d /.test(x))) errs.push(w + ': DERIVED rate must cite its EV-DF record');
    ['lane_count', 'raw_bitrate', 'usable_payload'].forEach((k) => { if (p.link[k].status !== 'UNKNOWN') errs.push(w + ': ' + k + ' is not stated by any source'); });
    Object.entries(p.features || {}).forEach(([k, v]) => { if (v.status !== 'UNKNOWN') errs.push(w + ': feature ' + k + ' is not stated for this exact port'); });
    (p.verified_operating_modes || []).forEach((m, i) => (m.evidence_ids || []).forEach((id) => {
      const e = ev[id]; const t = e && norm(e.relevant_evidence);
      if (!e || !t.includes(String(m.h_active)) || !t.includes(String(m.v_active)) || !t.includes(String(m.refresh_hz))) errs.push(w + ': verified mode ' + i + ' not in the quote of ' + id);
    }));
  }));
  return errs;
}

export function checkPage(html, d) {
  const errs = [];
  d.facts.forEach((f) => {
    const m = html.match(new RegExp('<tr id="' + f.id.toLowerCase() + '">([\\s\\S]*?)</tr>'));
    if (!m) { errs.push(f.id + ': row missing'); return; }
    if (!m[1].includes(esc(f.claim))) errs.push(f.id + ': claim not shown');
    if (!m[1].includes(esc(f.device))) errs.push(f.id + ': device not shown');
    if (!m[1].includes('<a class="srcs" href="#src-' + f.source + '">[' + f.source + ']</a>')) errs.push(f.id + ': [' + f.source + '] citation missing');
  });
  const rows = html.match(/<tr id="df\d\d">/g) || [];
  if (rows.length !== d.facts.length) errs.push('page shows ' + rows.length + ' fact rows');
  d.sources.forEach((s) => {
    const li = html.match(new RegExp('<li id="src-' + s.id + '"><a href="([^"]+)"', 'g')) || [];
    if (li.length !== 1) errs.push(s.id + ': source list entry count ' + li.length);
    else if (!li[0].includes('href="' + esc(s.url) + '"')) errs.push(s.id + ': source url on page');
  });
  (html.match(/href="#src-([A-Za-z0-9]+)"/g) || []).forEach((h) => { const id = h.slice(11, -1); if (!html.includes('<li id="src-' + id + '">')) errs.push('citation ' + id + ' does not resolve'); });
  return errs;
}

// ---------------------------------------------------------------- the real data
test('SOLV-ADD facts: 42 VERIFIED MI items, each tied to stored verbatim quotes and figures', () => assert.deepEqual(checkFacts(DATA), []));
test('SOLV-ADD evidence: EV-DF01..42 carry the same quotes; devices validate and lint clean; no rate is VERIFIED from a label', () => assert.deepEqual(checkEvidence(LIB, DATA), []));
test('SOLV-ADD page: every fact row shows its claim and [ID]; every source listed once; every citation resolves', () => assert.deepEqual(checkPage(HTML, DATA), []));
test('SOLV-ADD page: generated block is up to date and lives under "Verified device facts"', () => {
  assert.equal(render(HTML), HTML);
  assert.ok(HTML.includes('<h2 id="devices">Verified device facts</h2>'));
  assert.ok(HTML.includes(deviceFacts()));
  assert.match(HTML, /never makes a result PASS on its own/);
  assert.ok(!HTML.includes('No exact product is rated on this page.'));
  assert.match(HTML, /\.tablewrap\{overflow-x:auto;scroll-padding-inline:40px;/);
});
test('SOLV-ADD page: title, meta, H1, canonical and JSON-LD unchanged (frozen)', () => {
  const e = extract(HTML), b = JSON.parse(read('docs/seo-freeze-baseline.json')).pages[PAGE];
  assert.deepEqual(e.title, ['<title>Monitor No Signal or Stuck at 60Hz? Display Connection Solver</title>']);
  assert.deepEqual(e.h1, ['<h1>No signal, wrong resolution or stuck at 60 Hz? Find the limiting link</h1>']);
  assert.deepEqual(e.canonical, ['<link rel="canonical" href="https://elorumtech.elorum.world/guides/display-connection-solver.html">']);
  for (const k of ['title', 'meta', 'h1', 'canonical', 'jsonLd']) assert.deepEqual(e[k], b[k], k);
});
test('SOLV-ADD scope: claims stay inside their sources', () => {
  const f = Object.fromEntries(DATA.facts.map((x) => [x.id, x]));
  assert.match(f.DF04.claim, /built-in 7\.9 inch LCD screen only; it is not a TV-mode claim/); // VRR is handheld-screen only
  assert.match(f.DF06.claim, /does not state a DisplayPort version/);                           // MI-SOLV-052 excluded
  assert.match(f.DF37.claim, /does not state a UHBR tier/);                                     // MI-SOLV-051 excluded
  assert.match(f.DF39.claim, /RTX 5080 page only/);
  assert.match(f.DF17.device, /M5 Max/); assert.match(f.DF18.device, /\(M5\)/);
  assert.match(f.DF23.device, /M5 Pro/);
  assert.ok(!DATA.facts.some((x) => /FRL|HDMI 2\.1 VRR in TV mode|WD25TB5|SD25TB5|PG32UCDM|G80SD/.test(x.claim + x.device)), 'excluded UNVERIFIED claims');
});

// ---------------------------------------------------------------- solver outcomes for representative real devices
const U = () => ({ value: null, status: 'UNKNOWN' });
const CABLE = { device_id: 'USER-CABLE', role: 'cable', identity: { manufacturer: U(), model: U(), revision: U() }, ports: [], cable: { certification_program: U(), rated_link: U(), length_m: U(), active_or_passive: U(), directional: U() } };
const M = (h, v, hz) => ({ h_active: h, v_active: v, refresh_hz: hz, bit_depth_bpc: 8, chroma: 'RGB', hdr: 'SDR', vrr: 'none', dsc_required: false });
function solve(lib, src, sp, mids, snk, kp, mode, n = 1) {
  const dev = (id) => clone(lib.devices.find((x) => x.device_id === id));
  const segs = [{ segment_id: 'S1', device_id: src, in_port_id: null, out_port_id: sp, kind: 'source_output' }, { segment_id: 'S2', device_id: 'USER-CABLE', in_port_id: null, out_port_id: null, kind: 'cable' }];
  mids.forEach(([id, i, o], k) => segs.push({ segment_id: 'S' + (k + 3), device_id: id, in_port_id: i, out_port_id: o, kind: 'dock' }));
  segs.push({ segment_id: 'SX', device_id: snk, in_port_id: kp, out_port_id: null, kind: 'sink_input' });
  const doc = { schema_version: '0.2.0-impl', evidence: lib.evidence, devices: [src, ...mids.map((m) => m[0]), snk].map(dev).concat([clone(CABLE)]), request: { mode, display_count: n, require_hdr: false, require_vrr: false, accept_dsc: true, accept_chroma_subsampling: false }, path: { segments: segs } };
  assert.deepEqual(E.lint(doc), []);
  return E.evaluate(doc);
}
const MBA = ['APPLE-MACBOOK-AIR-M5', 'Thunderbolt 4 (USB-C)'], AORUS = ['GIGABYTE-AORUS-FO32U2P', 'DisplayPort 2.1 (UHBR 20) in'], MSI_C = ['MSI-MPG-321URX-QD-OLED', 'Type-C (DP alt.)'];
test('SOLV-ADD outcome: MacBook Air (M5) with three displays FAILs on the documented maximum of two [APL1]', () => {
  const r = solve(LIB, ...MBA, [], ...AORUS, M(3840, 2160, 60), 3);
  assert.equal(r.verdict, 'FAIL'); assert.match(r.reason, /maximum of 2/); assert.ok(r.sources.includes('EV-DF16'));
});
test('SOLV-ADD outcome: MacBook Air (M5) with two displays is UNKNOWN, not PASS (cable, lanes, timing not documented)', () => {
  const r = solve(LIB, ...MBA, [], ...AORUS, M(3840, 2160, 60), 2);
  assert.equal(r.verdict, 'UNKNOWN'); assert.ok(r.unknowns.length > 0);
});
test('SOLV-ADD outcome: Steam Deck LCD -> Steam Deck Dock DP 1.4 -> monitor at 4K 120 Hz is UNKNOWN, not PASS', () => {
  const r = solve(LIB, 'VALVE-STEAM-DECK-LCD', 'USB-C', [['VALVE-STEAM-DECK-DOCK', 'USB-C (to Steam Deck)', 'DisplayPort 1.4']], ...AORUS, M(3840, 2160, 120));
  assert.equal(r.verdict, 'UNKNOWN'); assert.ok(r.unknowns.some((u) => /S1\.link/.test(u.field || u.path || JSON.stringify(u))));
});
test('SOLV-ADD outcome: MSI 321URX USB-C "3840 x 2160 (Up to 240Hz)" has no bit depth/chroma, so 4K 240 8-bit RGB is not PASS', () => {
  const r = solve(LIB, 'VALVE-STEAM-DECK-OLED', 'USB-C', [], ...MSI_C, M(3840, 2160, 240));
  assert.notEqual(r.verdict, 'PASS'); assert.equal(r.verdict, 'UNKNOWN');
});
test('SOLV-ADD outcome: no real-device source/sink pairing in the library yields PASS', () => {
  const srcs = LIB.devices.filter((d) => d.role === 'source'), snks = LIB.devices.filter((d) => d.role === 'sink');
  let n = 0;
  for (const s of srcs) for (const k of snks) for (const kp of k.ports) for (const mode of [M(1920, 1080, 60), M(3840, 2160, 60), M(3840, 2160, 120), M(3840, 2160, 240)]) {
    const r = solve(LIB, s.device_id, s.ports[0].port_id, [], k.device_id, kp.port_id, mode); n++;
    assert.notEqual(r.verdict, 'PASS', s.device_id + ' -> ' + k.device_id + '/' + kp.port_id);
  }
  assert.equal(n, srcs.length * 3 * 4);
});

// ---------------------------------------------------------------- mutants
const MUT = (name, target, fn, check) => test('SOLV-ADD mutant caught: ' + name, () => { const x = clone(target); fn(x); assert.ok(check(x).length > 0, name); });
const fact = (d, id) => d.facts.find((f) => f.id === id);
const dev = (l, id) => l.devices.find((d) => d.device_id === id);
MUT('a quote edited in a fact', DATA, (d) => { fact(d, 'DF01').quotes[0] = fact(d, 'DF01').quotes[0].replace('60 fps', '120 fps'); }, checkFacts);
MUT('a stored source quote edited', DATA, (d) => { d.sources[0].quotes[0] += ' and 8K'; }, checkFacts);
MUT('claim overstates its figure (4K 120 for Switch 2 TV mode)', DATA, (d) => { fact(d, 'DF01').claim = 'Maximum of 3840x2160 (4K) at 120 fps in TV mode.'; }, checkFacts);
MUT('figure no longer in any quote', DATA, (d) => { fact(d, 'DF33').figures[1][1] = 'up to 480Hz'; }, checkFacts);
MUT('fact dropped', DATA, (d) => { d.facts.pop(); }, checkFacts);
MUT('UNVERIFIED MI-SOLV-045 added as a fact', DATA, (d) => { d.facts.push({ ...clone(d.facts[0]), id: 'DF43', mi_item: 'MI-SOLV-045' }); }, checkFacts);
MUT('fact cites a missing source', DATA, (d) => { fact(d, 'DF10').source = 'SNY9'; }, checkFacts);
MUT('source checked_at without offset', DATA, (d) => { d.sources[3].checked_at = '2026-10-23T23:07:04'; }, checkFacts);
MUT('excluded list emptied', DATA, (d) => { d.excluded = []; }, checkFacts);
MUT('EV relevant_evidence not a stored quote', LIB, (l) => { l.evidence[4].relevant_evidence = 'up to 8K @120Hz'; }, (l) => checkEvidence(l, DATA));
MUT('EV source_url swapped', LIB, (l) => { l.evidence[0].source_url = l.evidence[40].source_url; }, (l) => checkEvidence(l, DATA));
MUT('HBR3 rate promoted to VERIFIED', LIB, (l) => { const r = dev(l, 'APPLE-MACBOOK-AIR-M5').ports[0].link; r.max_link_rate_per_lane = { value: 8.1, status: 'VERIFIED', evidence_ids: ['EV-DF15'], unit: 'Gbit/s per lane' }; }, (l) => checkEvidence(l, DATA));
MUT('lane count invented', LIB, (l) => { dev(l, 'GIGABYTE-AORUS-FO32U2P').ports[0].link.lane_count = { value: 4, status: 'VERIFIED', evidence_ids: ['EV-DF36'] }; }, (l) => checkEvidence(l, DATA));
MUT('feature invented (VRR on Steam Deck LCD port)', LIB, (l) => { dev(l, 'VALVE-STEAM-DECK-LCD').ports[0].features.vrr = { value: true, status: 'VERIFIED', evidence_ids: ['EV-DF09'] }; }, (l) => checkEvidence(l, DATA));
MUT('verified mode not in its quote (MSI 4K 480)', LIB, (l) => { dev(l, 'MSI-MPG-321URX-QD-OLED').ports[0].verified_operating_modes[0].refresh_hz = 480; }, (l) => checkEvidence(l, DATA));
MUT('VERIFIED field cites an unknown evidence id', LIB, (l) => { dev(l, 'VALVE-STEAM-DECK-DOCK').ports[1].link.version_label.evidence_ids = ['EV-DF99']; }, (l) => checkEvidence(l, DATA));
MUT('UNKNOWN field carrying a value', LIB, (l) => { dev(l, 'VALVE-STEAM-DECK-OLED').ports[0].link.dsc = { value: true, status: 'UNKNOWN' }; }, (l) => checkEvidence(l, DATA));
MUT('page row claim edited', HTML, () => {}, () => checkPage(HTML.replace('Maximum of 3840x2160 (4K) at 60 fps in TV mode.', 'Maximum of 3840x2160 (4K) at 120 fps in TV mode.'), DATA));
MUT('page [ID] citation removed', HTML, () => {}, () => checkPage(HTML.replace('<a class="srcs" href="#src-APL3">[APL3]</a>', ''), DATA));
MUT('page source list entry removed', HTML, () => {}, () => checkPage(HTML.replace(/<li id="src-VAS1">.*?<\/li>\n/, ''), DATA));
MUT('page fact row removed', HTML, () => {}, () => checkPage(HTML.replace(/<tr id="df42">[\s\S]*?<\/tr>\n?/, ''), DATA));
test('SOLV-ADD mutant caught: max_displays removed -> three-display MacBook Air no longer FAILs (the FAIL rests on APL1)', () => {
  const l = clone(LIB); dev(l, 'APPLE-MACBOOK-AIR-M5').max_displays = U();
  assert.notEqual(solve(l, ...MBA, [], ...AORUS, M(3840, 2160, 60), 3).verdict, 'FAIL');
});
test('SOLV-ADD outcome: even if the MSI USB-C mode were 8-bit RGB, the undocumented cable and source rate keep 4K 240 from PASS', () => {
  const l = clone(LIB); Object.assign(dev(l, 'MSI-MPG-321URX-QD-OLED').ports[0].verified_operating_modes[0], { bit_depth_bpc: 8, chroma: 'RGB', hdr: 'SDR', vrr: 'none', dsc_required: false });
  assert.notEqual(solve(l, 'VALVE-STEAM-DECK-OLED', 'USB-C', [], ...MSI_C, M(3840, 2160, 240)).verdict, 'PASS');
});
