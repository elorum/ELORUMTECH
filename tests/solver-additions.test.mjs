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
// REM01 F1: whitespace is the only normalisation (\s covers U+00A0); no hyphen, quote or case folding.
const norm = (s) => s.replace(/\s+/g, ' ').trim();
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
    ['lane_count', 'encoding', 'raw_bitrate', 'usable_payload'].forEach((k) => { if (p.link[k].status !== 'UNKNOWN') errs.push(w + ': ' + k + ' is not stated by any source'); });
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
    if (m[1] !== '<th scope="row">' + esc(f.device) + '</th><td>' + esc(f.port) + '</td><td>' + esc(f.claim) + ' <a class="srcs" href="#src-' + f.source + '">[' + f.source + ']</a></td>') errs.push(f.id + ': row text is not exactly device / port / claim [ID]');
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

// ---------------------------------------------------------------- REM01 (QA-01 F1-F5 on #42)
// F1: quotes and context strings are byte-faithful to the live page except whitespace. Every non-ASCII code point they
//     contain must be declared on the source (non_ascii, recorded at the live re-fetch), so a folded or swapped character
//     (e.g. U+2011 for "-") cannot slip in.
// F3: every number/version token, port/protocol token and count word in a row's device, port and claim text must be a
//     token of the fact's quotes or context, or be listed in derived[] with a machine-checked rule (spelling | synonym |
//     absent = the row says the source does not state it, and no stored text names it).
// F2/F4/F5: every non-UNKNOWN value in a Device record must be supported by the quotes linked to it.
const ws = (s) => String(s).replace(/\s+/g, ' ').trim();
const codepoints = (s) => [...s].filter((c) => c.codePointAt(0) > 127).map((c) => 'U+' + c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0'));
const RX_NUM = /[A-Za-z0-9]*\d[A-Za-z0-9]*(?:\.\d+[A-Za-z]*)*/g;
const RX_KW = /\b(?:HDMI|DisplayPort|DP|USB-C|USB Type-C|Type-C|Type C|Thunderbolt|USB4|HBR\d?|UHBR|DSC|VRR|ALLM|MST|FreeSync|G-SYNC|Alt Mode|Alt-mode|alternate mode|Adaptive-Sync|AdaptiveSync|MediaSync|HDR10|HDR|Power Delivery|PD)\b/gi;
const RX_COUNT = /\b(?:one|two|three|four|dual|triple|single)\b/gi;
export const rowTokens = (s) => new Set([...(String(s).match(RX_NUM) || []), ...(String(s).match(RX_KW) || []), ...(String(s).match(RX_COUNT) || [])]);
const fold = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const reWord = (v) => new RegExp('(?:^|[^A-Za-z0-9])' + v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![A-Za-z0-9])', 'i');
// synonym rule: the token may stand for any of these quoted spellings (matched as a whole word, case-insensitive)
export const SYNONYMS = {
  'USB-C': ['Type-C', 'Type C', 'USB Type-C'],
  DisplayPort: ['DP', 'Display port', 'Displayport'],
  DP: ['DisplayPort'],
  'Alt Mode': ['alternate mode', 'Alt-mode'],
  VRR: ['variable refresh rate']
};
const factSupport = (f) => [...f.quotes, ...(f.context || [])];

export function checkBytes(d) {
  const errs = [];
  d.sources.forEach((s) => {
    const strs = [...s.quotes, ...d.facts.filter((f) => f.source === s.id).flatMap((f) => [...f.quotes, ...(f.context || [])])];
    const actual = [...new Set(strs.flatMap(codepoints))].sort();
    if (!Array.isArray(s.non_ascii)) { errs.push(s.id + ': non_ascii missing'); return; }
    if (JSON.stringify(s.non_ascii) !== JSON.stringify(actual)) errs.push(s.id + ': non-ASCII code points ' + JSON.stringify(actual) + ' but declared ' + JSON.stringify(s.non_ascii));
    strs.forEach((q) => { if (/[\u0000-\u001f\u007f\u200b-\u200d\ufeff]/.test(q)) errs.push(s.id + ': control or zero-width character in ' + JSON.stringify(q)); if (q !== q.trim()) errs.push(s.id + ': untrimmed string'); });
  });
  d.facts.forEach((f) => (f.context || []).forEach((c) => {
    if (!c) errs.push(f.id + ': empty context');
    if (f.quotes.includes(c)) errs.push(f.id + ': context duplicates a quote');
  }));
  return errs;
}

export function checkTokens(d) {
  const errs = [];
  d.facts.forEach((f) => {
    const sup = factSupport(f), have = new Set(sup.flatMap((q) => [...rowTokens(q)]));
    const der = f.derived || [];
    ['claim', 'port', 'device'].forEach((field) => rowTokens(f[field]).forEach((t) => {
      if (have.has(t)) return;
      if (!der.some((x) => x.field === field && x.token === t)) errs.push(f.id + ' ' + field + ': "' + t + '" is in no quote or context and not marked DERIVED');
    }));
    der.forEach((x, i) => {
      const w = f.id + ' derived[' + i + '] ' + x.token;
      if (!['claim', 'port', 'device'].includes(x.field)) errs.push(w + ': field');
      else if (!rowTokens(f[x.field]).has(x.token)) errs.push(w + ': token not in ' + x.field);
      if (have.has(x.token)) errs.push(w + ': not needed, the token is quoted');
      if (!x.rule || !x.rule.trim()) errs.push(w + ': rule missing');
      if (!sup.some((q) => q.includes(x.from))) errs.push(w + ': from is not a stored quote or context substring');
      if (x.kind === 'spelling') { if (!fold(x.from).includes(fold(x.token))) errs.push(w + ': spelling rule does not hold for "' + x.from + '"'); }
      else if (x.kind === 'synonym') { if (!(SYNONYMS[x.token] || []).some((v) => reWord(v).test(x.from))) errs.push(w + ': synonym rule does not hold for "' + x.from + '"'); }
      else if (x.kind === 'absent') { if (sup.some((q) => fold(q).includes(fold(x.token))) || !new RegExp('does not state an? [^.]*\\b' + x.token + '\\b').test(f[x.field])) errs.push(w + ': absent rule needs "does not state … ' + x.token + '" and no stored text naming it'); }
      else errs.push(w + ': kind must be spelling, synonym or absent');
    });
  });
  return errs;
}

const PROTOCOL_RULES = {
  DisplayPort: { connector: 'DP', re: /\b(?:DisplayPort|Displayport|Display port|DP)\b/ },
  'USB-C_DP_AltMode': { connector: 'USB-C', re: /\b(?:Alt-mode|Alt Mode|Alternate Mode|alternate mode|DP alt\.)/ },
  HDMI_TMDS: { connector: 'HDMI', re: /\bHDMI\b/ }
};
const COUNT_WORD = { 1: 'one', 2: 'two', 3: 'three', 4: 'four' };
const words = (s) => String(s).split(/[^A-Za-z0-9]+/).filter(Boolean);

export function checkRecords(lib, d) {
  const errs = [];
  const fact = Object.fromEntries(d.facts.map((f) => ['EV-' + f.id, f]));
  const srcOf = Object.fromEntries(d.sources.map((s) => [s.id, s]));
  const evOf = Object.fromEntries(lib.evidence.map((e) => [e.id, e]));
  const sup = (ids) => (ids || []).flatMap((id) => fact[id] ? [evOf[id].relevant_evidence, ...factSupport(fact[id])] : []);
  const txt = (ids) => ws(sup(ids).join(' \u2016 '));
  const needIds = (w, v) => { if (!v.evidence_ids || !v.evidence_ids.length || v.evidence_ids.some((id) => !fact[id])) { errs.push(w + ': VERIFIED value must cite EV-DF evidence'); return false; } return true; };
  const idsIn = (o) => JSON.stringify(o).match(/EV-DF\d\d/g) || [];
  lib.devices.forEach((dv) => {
    const W = dv.device_id;
    const m = dv.identity.manufacturer, md = dv.identity.model;
    if (m.status !== 'UNKNOWN' && needIds(W + ' manufacturer', m) && m.evidence_ids.some((id) => srcOf[fact[id].source].publisher !== m.value)) errs.push(W + ': manufacturer is not the publisher of the cited page');
    if (md.status !== 'UNKNOWN' && needIds(W + ' model', md)) { const have = new Set(words(txt(md.evidence_ids))); words(md.value).forEach((x) => { if (!have.has(x)) errs.push(W + ': model word "' + x + '" not on the cited page'); }); }
    if (dv.identity.revision.status !== 'UNKNOWN') errs.push(W + ': revision is not stated by any source');
    if (dv.max_displays && dv.max_displays.status !== 'UNKNOWN' && needIds(W + ' max_displays', dv.max_displays)) {
      const n = dv.max_displays.value, t = txt(dv.max_displays.evidence_ids);
      if (!(reWord(String(n)).test(t) || (COUNT_WORD[n] && reWord(COUNT_WORD[n]).test(t)))) errs.push(W + ': max_displays ' + n + ' not in its quote');
    }
    (dv.ports || []).forEach((p) => {
      const w = W + '/' + p.port_id, L = p.link;
      if (L.protocol !== 'UNKNOWN') {
        const r = PROTOCOL_RULES[L.protocol], ids = idsIn(p);
        if (!r) errs.push(w + ': no support rule for protocol ' + L.protocol);
        else {
          if (p.physical_connector !== r.connector) errs.push(w + ': protocol ' + L.protocol + ' does not fit connector ' + p.physical_connector);
          if (!ids.length || !r.re.test(txt(ids))) errs.push(w + ': protocol ' + L.protocol + ' is not supported by a linked quote');
        }
      }
      if (L.version_label.status !== 'UNKNOWN' && needIds(w + ' version_label', L.version_label) && !sup(L.version_label.evidence_ids).some((q) => ws(q).includes(ws(L.version_label.value)))) errs.push(w + ': version_label "' + L.version_label.value + '" not in a linked quote');
      if (L.dsc.status !== 'UNKNOWN' && needIds(w + ' dsc', L.dsc)) {
        const t = txt(L.dsc.evidence_ids);
        if (typeof L.dsc.value !== 'boolean' || !/\bDSC\b/.test(t) || (L.dsc.value === false && !/\b(?:not|no|without)\b/i.test(t))) errs.push(w + ': dsc ' + L.dsc.value + ' not supported by a linked quote');
      }
      const rate = L.max_link_rate_per_lane;
      if (rate.status === 'DERIVED') rate.derived_from.forEach((x) => { const mm = /^(EV-DF\d\d) "([^"]+)"/.exec(x); if (mm && !txt([mm[1]]).includes(mm[2])) errs.push(w + ': derived_from text "' + mm[2] + '" not in ' + mm[1]); });
      (p.verified_operating_modes || []).forEach((mo, i) => {
        const wm = w + ' mode ' + i;
        if (!mo.evidence_ids || !mo.evidence_ids.length) { errs.push(wm + ': no evidence'); return; }
        const t = txt(mo.evidence_ids);
        if (mo.bit_depth_bpc != null && !new RegExp('\\b' + mo.bit_depth_bpc + '[- ]?(?:bit|bpc)', 'i').test(t)) errs.push(wm + ': bit_depth_bpc not in its quote');
        ['chroma', 'hdr', 'vrr'].forEach((k) => { if (mo[k] != null && !reWord(String(mo[k])).test(t)) errs.push(wm + ': ' + k + ' ' + mo[k] + ' not in its quote'); });
        if (mo.dsc_required != null && !/\bDSC\b/.test(t)) errs.push(wm + ': dsc_required not in its quote');
      });
    });
  });
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

test('SOLV-ADD REM01 F1: quotes and context are byte-faithful; every non-ASCII code point is declared per source', () => assert.deepEqual(checkBytes(DATA), []));
test('SOLV-ADD REM01 F1: APL2 stores ASCII "USB-C" as on the live page; APL1 keeps its live U+2011', () => {
  const s = Object.fromEntries(DATA.sources.map((x) => [x.id, x]));
  assert.deepEqual(s.APL2.non_ascii, []); assert.ok(s.APL2.quotes.every((q) => q.includes('(USB-C)')));
  assert.deepEqual(s.APL1.non_ascii, ['U+2011']);
});
test('SOLV-ADD REM01 F3: every number, version, port token and count in device, port and claim is quoted or DERIVED with a rule', () => assert.deepEqual(checkTokens(DATA), []));
test('SOLV-ADD REM01 F2: every DSC, protocol, version, mode, count and identity value in the device records is supported by a linked quote', () => assert.deepEqual(checkRecords(LIB, DATA), []));
test('SOLV-ADD REM01 F4: Steam Deck OLED protocol stays UNKNOWN ("Display port over Type C" does not name Alt Mode)', () => {
  assert.equal(LIB.devices.find((x) => x.device_id === 'VALVE-STEAM-DECK-OLED').ports[0].link.protocol, 'UNKNOWN');
});
test('SOLV-ADD REM01 F6: the page does not imply the checker offers these devices', () => {
  assert.ok(!HTML.includes('the solver treats the matching rate as DERIVED'));
  assert.match(HTML, /the device records behind these rows store the matching rate as DERIVED, not VERIFIED\. The checker above does not offer these devices as choices\./);
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

// ---------------------------------------------------------------- REM01 mutants (F1-F4)
// MUTR: the mutant must be caught for the stated reason, not by accident.
const MUTR = (name, target, fn, check, why) => test('SOLV-ADD mutant caught: ' + name, () => { const x = clone(target); fn(x); const e = check(x); assert.ok(e.some((m) => why.test(m)), name + ' -> ' + JSON.stringify(e)); });
const port0 = (l, id) => dev(l, id).ports[0];
const UH = (s) => s.replace('(USB-C)', '(USB\u2011C)');
// F1
MUTR('F1: DF17 quote stored with U+2011 again (fact, source and EV consistent)', DATA, (d) => { const s = d.sources.find((x) => x.id === 'APL2'); s.quotes[0] = UH(s.quotes[0]); fact(d, 'DF17').quotes[0] = UH(fact(d, 'DF17').quotes[0]); }, checkBytes, /non-ASCII code points/);
MUTR('F1: non_ascii declaration padded', DATA, (d) => { d.sources.find((x) => x.id === 'APL1').non_ascii.push('U+2010'); }, checkBytes, /but declared/);
MUTR('F1: context string with a folded character (U+2011 on LGE1)', DATA, (d) => { fact(d, 'DF33').context[0] = '32GS95UE\u2011B'; }, checkBytes, /LGE1: non-ASCII/);
MUTR('F1: non-breaking space smuggled into a quote', DATA, (d) => { const s = d.sources.find((x) => x.id === 'APL2'); s.quotes[1] = s.quotes[1].replace('native ', 'native\u00a0'); fact(d, 'DF18').quotes[0] = s.quotes[1]; }, checkBytes, /U\+00A0/);
MUTR('F1: figure only matches after hyphen folding', DATA, (d) => { fact(d, 'DF15').figures.push(['Thunderbolt 4 (USB-C)', 'Thunderbolt 4 (USB-C)']); }, checkFacts, /figure not in a quote/);
// F3
MUTR('F3: unquoted "Up to 480Hz" appended to DF33 claim', DATA, (d) => { fact(d, 'DF33').claim += ' Up to 480Hz.'; }, checkTokens, /not marked DERIVED/);
MUTR('F3: unquoted port token added to a claim (DF05 + Thunderbolt 4)', DATA, (d) => { fact(d, 'DF05').claim += ' Also over Thunderbolt 4.'; }, checkTokens, /not marked DERIVED/);
MUTR('F3: unquoted count word in a claim (DF22 two -> three)', DATA, (d) => { fact(d, 'DF22').claim = fact(d, 'DF22').claim.replace('two', 'three'); }, checkTokens, /not marked DERIVED/);
MUTR('F3: device column names another model (MacBook Air M4)', DATA, (d) => { fact(d, 'DF15').device = 'Apple MacBook Air (M4)'; }, checkTokens, /not marked DERIVED/);
MUTR('F3: port column token not on the page (DF07 DisplayPort 2.1)', DATA, (d) => { fact(d, 'DF07').port = 'DisplayPort 2.1 and HDMI 2.0 outputs'; }, checkTokens, /not marked DERIVED/);
MUTR('F3: DERIVED entry whose from is not stored text', DATA, (d) => { fact(d, 'DF34').derived[0].from = 'VRR on GeForce GPUs'; }, checkTokens, /from is not a stored/);
MUTR('F3: DERIVED synonym that does not hold (VRR from "up to 240Hz")', DATA, (d) => { const f = fact(d, 'DF33'); f.claim += ' VRR.'; f.derived = [{ field: 'claim', token: 'VRR', from: 'up to 240Hz', kind: 'synonym', rule: 'x' }]; }, checkTokens, /synonym rule does not hold/);
MUTR('F3: DERIVED spelling that does not hold (480Hz from 240Hz)', DATA, (d) => { const f = fact(d, 'DF33'); f.claim += ' Up to 480Hz.'; f.derived = [{ field: 'claim', token: '480Hz', from: 'up to 240Hz', kind: 'spelling', rule: 'x' }]; }, checkTokens, /spelling rule does not hold/);
MUTR('F3: absent rule on a token the quote does name (DF37 HDMI)', DATA, (d) => { const f = fact(d, 'DF37'); f.claim += ' AMD does not state a HDMI version.'; f.derived.push({ field: 'claim', token: 'HDMI', from: f.quotes[0], kind: 'absent', rule: 'x' }); }, checkTokens, /absent rule needs/);
MUTR('F3: absent rule without the "does not state" wording', DATA, (d) => { const f = fact(d, 'DF37'); f.claim = f.claim.replace('AMD does not state a UHBR tier on this page.', 'Up to UHBR 20.'); }, checkTokens, /UHBR: absent rule needs/);
MUTR('F3: DERIVED entry without a rule', DATA, (d) => { fact(d, 'DF36').derived[0].rule = ''; }, checkTokens, /rule missing/);
MUTR('F3: DERIVED entry for a token that is already quoted', DATA, (d) => { fact(d, 'DF01').derived = [{ field: 'claim', token: '60', from: '60 fps', kind: 'spelling', rule: 'x' }]; }, checkTokens, /not needed/);
MUTR('F3: context removed, so a device token is unsupported (DF15 M5)', DATA, (d) => { fact(d, 'DF15').context = fact(d, 'DF15').context.filter((c) => !c.includes('M5')); }, checkTokens, /not marked DERIVED/);
MUTR('F3: page row carries text the fact does not have', HTML, () => {}, () => checkPage(HTML.replace('Thunderbolt 4 (USB-C) ports support native DisplayPort 1.4 speeds. <a', 'Thunderbolt 4 (USB-C) ports support native DisplayPort 1.4 speeds. Up to 8K. <a'), DATA), /row text is not exactly/);
// F2 (the three QA-01 survivors first), F4, F5
MUTR('F2: Steam Deck OLED dsc VERIFIED true', LIB, (l) => { port0(l, 'VALVE-STEAM-DECK-OLED').link.dsc = { value: true, status: 'VERIFIED', evidence_ids: ['EV-DF06'] }; }, (l) => checkRecords(l, DATA), /dsc true not supported/);
MUTR('F2: MacBook Air protocol UNKNOWN -> DisplayPort on a USB-C port', LIB, (l) => { port0(l, 'APPLE-MACBOOK-AIR-M5').link.protocol = 'DisplayPort'; }, (l) => checkRecords(l, DATA), /does not fit connector/);
MUTR('F2: MSI USB-C mode bit depth 8 / RGB invented', LIB, (l) => { Object.assign(port0(l, 'MSI-MPG-321URX-QD-OLED').verified_operating_modes[0], { bit_depth_bpc: 8, chroma: 'RGB' }); }, (l) => checkRecords(l, DATA), /bit_depth_bpc not in/);
MUTR('F2: MSI USB-C mode chroma 4:4:4 invented', LIB, (l) => { port0(l, 'MSI-MPG-321URX-QD-OLED').verified_operating_modes[0].chroma = '4:4:4'; }, (l) => checkRecords(l, DATA), /chroma 4:4:4/);
MUTR('F2: MSI USB-C mode HDR10 invented', LIB, (l) => { port0(l, 'MSI-MPG-321URX-QD-OLED').verified_operating_modes[0].hdr = 'HDR10'; }, (l) => checkRecords(l, DATA), /hdr HDR10/);
MUTR('F2: MSI USB-C mode dsc_required invented', LIB, (l) => { port0(l, 'MSI-MPG-321URX-QD-OLED').verified_operating_modes[0].dsc_required = true; }, (l) => checkRecords(l, DATA), /dsc_required not in/);
MUTR('F2: MacBook Air DSC flipped to false (quote says "with DSC capability")', LIB, (l) => { port0(l, 'APPLE-MACBOOK-AIR-M5').link.dsc.value = false; }, (l) => checkRecords(l, DATA), /dsc false not supported/);
MUTR('F2: MacBook Pro DSC VERIFIED from a quote without DSC', LIB, (l) => { port0(l, 'APPLE-MACBOOK-PRO-M5').link.dsc = { value: true, status: 'VERIFIED', evidence_ids: ['EV-DF18'] }; }, (l) => checkRecords(l, DATA), /dsc true not supported/);
MUTR('F2: version label invented (Steam Deck LCD DisplayPort 2.1)', LIB, (l) => { port0(l, 'VALVE-STEAM-DECK-LCD').link.version_label.value = 'DisplayPort 2.1 Alt-mode'; }, (l) => checkRecords(l, DATA), /version_label/);
MUTR('F2: HDMI protocol invented on the dock DisplayPort output', LIB, (l) => { dev(l, 'VALVE-STEAM-DECK-DOCK').ports[2].link.protocol = 'HDMI_TMDS'; }, (l) => checkRecords(l, DATA), /does not fit connector/);
MUTR('F2: tunnel protocol with no support rule', LIB, (l) => { port0(l, 'APPLE-MACBOOK-PRO-M5-MAX').link.protocol = 'Thunderbolt_DP_Tunnel'; }, (l) => checkRecords(l, DATA), /no support rule/);
MUTR('F2: DERIVED rate cites a tier its quote does not name', LIB, (l) => { port0(l, 'APPLE-MACBOOK-AIR-M5').link.max_link_rate_per_lane.derived_from[0] = 'EV-DF15 "up to UHBR 20"'; }, (l) => checkRecords(l, DATA), /derived_from text/);
MUTR('F2: max_displays 2 -> 3 with the same evidence', LIB, (l) => { dev(l, 'APPLE-MACBOOK-AIR-M5').max_displays.value = 3; }, (l) => checkRecords(l, DATA), /max_displays 3 not in/);
MUTR('F2: encoding invented', LIB, (l) => { port0(l, 'GIGABYTE-AORUS-FO32U2P').link.encoding = { value: '128b/132b', status: 'VERIFIED', evidence_ids: ['EV-DF36'] }; }, (l) => checkEvidence(l, DATA), /encoding is not stated/);
MUTR('F4: Steam Deck OLED protocol back to USB-C_DP_AltMode', LIB, (l) => { port0(l, 'VALVE-STEAM-DECK-OLED').link.protocol = 'USB-C_DP_AltMode'; }, (l) => checkRecords(l, DATA), /not supported by a linked quote/);
MUTR('F5: model names a chip the cited page does not', LIB, (l) => { dev(l, 'APPLE-MACBOOK-AIR-M5').identity.model.value = 'MacBook Air (M4)'; }, (l) => checkRecords(l, DATA), /model word/);
MUTR('F5: manufacturer is not the page publisher', LIB, (l) => { dev(l, 'MSI-MPG-321URX-QD-OLED').identity.manufacturer.value = 'LG'; }, (l) => checkRecords(l, DATA), /not the publisher/);
MUTR('F5: identity cites no evidence', LIB, (l) => { dev(l, 'GIGABYTE-AORUS-FO32U2P').identity.model.evidence_ids = []; }, (l) => checkRecords(l, DATA), /must cite EV-DF/);
