// Acceptance-matrix tests for the Display & Connection Solver (ElorumDisplay).
// One named test per ACCEPTANCE-MATRIX.md row (REM-01, a6ca7e87…), each lettered variant separately,
// exactly one expected verdict each (REM-02 NEW-L2 rows made single-verdict). Fixtures are synthetic FIXTURE-*.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import * as F from './display-fixtures.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const E = createRequire(import.meta.url)(path.join(root, 'display/engine-display.js'));
const { V, D, U, MK, mode, vmode, timing, DP, TMDS, FRL, link, source, sink, cable, mid, doc, port, ident, FULL } = F;

// Evaluate and check the result against the schema-level invariants and lint every time.
function ev(d, opts) {
  const r = E.evaluate(d, opts);
  const full = { ...d, result: r };
  assert.deepEqual(E.validateDocument(full), [], 'result violates schema invariants');
  assert.deepEqual(E.lint(full), [], 'result fails lint');
  return r;
}
const sub = (r, re) => r.sub_results.find((s) => re.test(s.label));
const base = (o = {}) => doc({ src: source(DP()), snk: sink(DP(), { modes: [vmode(3440, 1440, 165), vmode(3440, 1440, 100)] }), request: { mode: F.UW165() }, ...o });

// ---------------------------------------------------------------- A. DisplayPort generations
test('DP-01 DP 1.2 HBR2 x4 source, documented timing needs more → FAIL (source limiting)', () => {
  const r = ev(base({ src: source(DP(5.4)), request: { mode: F.UW165_T() } }));
  assert.equal(r.verdict, 'FAIL');
  assert.equal(r.limiting_segment, 'S1');
  assert.equal(r.arithmetic.assessment, 'EXCEEDS');
  assert.ok(r.arithmetic.required_bitrate.value > 17.28);
  assert.equal(r.arithmetic.path_usable_payload.value, 17.28);
  assert.equal(r.max_verified_mode.refresh_hz, 100, 'max verified mode on this path is reported');
});
test('DP-02 HBR3 x4 + certified cable + exact mode in sink DP verified list → PASS', () => {
  const r = ev(base());
  assert.equal(r.verdict, 'PASS');
  assert.equal(r.limiting_segment, null);
  assert.ok(r.sources.length > 0);
  assert.equal(r.max_verified_mode.refresh_hz, 165);
  assert.equal(r.arithmetic.assessment, 'LOWER_BOUND_ONLY', 'NEW-M1: verified-mode PASS without documented timing');
});
test('DP-03 sink timing only CVT-RBv2-derived, not in verified list → CONDITIONAL', () => {
  const r = ev(base({ snk: sink(DP()), request: { mode: F.UW165_T('DERIVED') } }));
  assert.equal(r.verdict, 'CONDITIONAL');
  assert.ok(r.prerequisites.some((p) => /confirm the monitor’s DP IN supports this timing/.test(p)), r.prerequisites.join('|'));
});
test('DP-04 version label "DP 1.4" only, rate UNKNOWN → UNKNOWN', () => {
  const r = ev(base({ src: source(DP(null, 4, { version_label: MK('DP 1.4') })) }));
  assert.equal(r.verdict, 'UNKNOWN');
  assert.ok(r.unknowns.some((u) => /max_link_rate_per_lane/.test(u.field)), JSON.stringify(r.unknowns));
  assert.ok(r.explanations.some((x) => /does not prove the maximum link rate/.test(x)));
});
const k4_120_10 = () => mode(3840, 2160, 120, 10); // active lower bound 29.86 > 25.92
test('DP-05a lower bound exceeds HBR3 payload, DSC VERIFIED false on a segment → FAIL', () => {
  const r = ev(base({ snk: sink(DP(8.1, 4, { dsc: V(false) })), request: { mode: k4_120_10() } }));
  assert.equal(r.verdict, 'FAIL');
  assert.equal(sub(r, /^Requested mode$/).verdict, 'FAIL');
  assert.equal(sub(r, /with DSC/).verdict, 'FAIL');
  assert.equal(r.arithmetic.assessment, 'EXCEEDS');
});
test('DP-05b DSC UNKNOWN on a segment, accept_dsc=true → UNKNOWN', () => {
  const r = ev(base({ src: source(DP(8.1, 4, { dsc: V(true) })), snk: sink(DP(8.1, 4, { dsc: U() })), request: { mode: k4_120_10(), accept_dsc: true } }));
  assert.equal(r.verdict, 'UNKNOWN');
  assert.equal(sub(r, /^Requested mode$/).verdict, 'FAIL');
  assert.equal(sub(r, /with DSC/).verdict, 'UNKNOWN');
  assert.ok(r.unknowns.some((u) => /dsc/.test(u.field)));
});
test('DP-05c DSC UNKNOWN, accept_dsc=false → FAIL', () => {
  const r = ev(base({ src: source(DP(8.1, 4, { dsc: V(true) })), snk: sink(DP(8.1, 4, { dsc: U() })), request: { mode: k4_120_10(), accept_dsc: false } }));
  assert.equal(r.verdict, 'FAIL');
  assert.equal(sub(r, /with DSC/).verdict, 'UNKNOWN');
});
test('DP-06 lower bound fits but timing unknown, no verified mode → UNKNOWN (never PASS)', () => {
  const r = ev(base({ snk: sink(DP()) }));
  assert.equal(r.verdict, 'UNKNOWN');
  assert.equal(r.arithmetic.assessment, 'LOWER_BOUND_ONLY');
  assert.ok(r.unknowns.some((u) => /timing/.test(u.field)));
});

// ---------------------------------------------------------------- B. HDMI generations
const hdmiCable = (o = {}) => cable({ cert: V('Ultra High Speed HDMI (FIXTURE)', undefined, 'EV-FIXTURE-CERT'), rated: V(48, 'Gbit/s total', 'EV-FIXTURE-CERT'), ...o });
const hsrc = (lk = FRL()) => source(lk, { port: 'HDMI 1', connector: 'HDMI' });
const hsnk = (lk, o = {}) => sink(lk, { port: 'HDMI IN', connector: 'HDMI', ...o });
test('HD-01 HDMI 2.0 TMDS sink input, request exceeding it → FAIL (sink input)', () => {
  const r = ev(doc({ src: hsrc(), cab: hdmiCable(), snk: hsnk(TMDS()), request: { mode: F.K4_120() } }));
  assert.equal(r.verdict, 'FAIL');
  assert.equal(r.limiting_segment, 'S3');
});
test('HD-02 FRL documented on source and sink, UHS cable, mode in sink HDMI list → PASS', () => {
  const r = ev(doc({ src: hsrc(), cab: hdmiCable(), snk: hsnk(FRL(), { modes: [vmode(3840, 2160, 120)] }), request: { mode: F.K4_120() } }));
  assert.equal(r.verdict, 'PASS');
});
test('HD-03 HDMI 2.1 label but FRL rate not documented on one end → UNKNOWN', () => {
  const r = ev(doc({ src: hsrc(), cab: hdmiCable(), snk: hsnk(link('HDMI_FRL', null, null, { version_label: V('HDMI 2.1') }), { modes: [vmode(3840, 2160, 120)] }), request: { mode: F.K4_120() } }));
  assert.equal(r.verdict, 'UNKNOWN');
  assert.ok(r.explanations.some((x) => /does not prove FRL/.test(x)));
});
test('HD-04a sink frl_support VERIFIED false, FRL-only request → FAIL', () => {
  const r = ev(doc({ src: hsrc(), cab: hdmiCable(), snk: hsnk(TMDS({ frl_support: V(false), version_label: V('HDMI 2.1') })), request: { mode: F.K4_120() } }));
  assert.equal(r.verdict, 'FAIL');
  assert.equal(r.limiting_segment, 'S3');
});
test('HD-04b TMDS-level mode in sink HDMI verified list → PASS', () => {
  const r = ev(doc({ src: hsrc(), cab: hdmiCable(), snk: hsnk(TMDS({ frl_support: V(false) }), { modes: [vmode(3840, 2160, 60)] }), request: { mode: F.K4_60() } }));
  assert.equal(r.verdict, 'PASS');
});
test('HD-04c TMDS-level mode not listed, DERIVED timing fits → CONDITIONAL', () => {
  const m = { ...mode(2560, 1440, 120), timing: timing(2640, 1525, 'DERIVED') }; // 11.59 Gbit/s
  const r = ev(doc({ src: hsrc(), cab: hdmiCable(), snk: hsnk(TMDS({ frl_support: V(false) })), request: { mode: m } }));
  assert.equal(r.verdict, 'CONDITIONAL');
  assert.ok(r.prerequisites.some((p) => /HDMI IN supports this timing/.test(p)));
});
const dualInputSink = (dpModes, hdmiModes) => sink(DP(), { modes: dpModes, extraPorts: [port('HDMI IN', 'HDMI', 'input', TMDS(), { modes: hdmiModes })] });
test('HD-05a monitor 165 Hz on DP, user on DP, mode in DP list → PASS', () => {
  const r = ev(base({ snk: dualInputSink([vmode(3440, 1440, 165)], [vmode(3440, 1440, 100)]) }));
  assert.equal(r.verdict, 'PASS');
});
test('HD-05b user on DP, DP timing only DERIVED, not listed → CONDITIONAL', () => {
  const r = ev(base({ snk: dualInputSink([], [vmode(3440, 1440, 100)]), request: { mode: F.UW165_T('DERIVED') } }));
  assert.equal(r.verdict, 'CONDITIONAL');
});
test('HD-05c same monitor, user on HDMI → FAIL (HDMI input limit, actual port)', () => {
  const r = ev(doc({ src: hsrc(), cab: hdmiCable(), snk: dualInputSink([vmode(3440, 1440, 165)], [vmode(3440, 1440, 100)]), sinkPort: 'HDMI IN', request: { mode: F.UW165() } }));
  assert.equal(r.verdict, 'FAIL');
  assert.equal(r.limiting_segment, 'S3');
});
test('HD-06 HDMI YCbCr 4:2:2 request → UNKNOWN (arithmetic assessment UNKNOWN)', () => {
  const m = { ...mode(3840, 2160, 60, 10, 'YCbCr422'), timing: timing(4400, 2250) };
  const r = ev(doc({ src: hsrc(), cab: hdmiCable(), snk: hsnk(FRL(), { modes: [vmode(3840, 2160, 60, 10, 'YCbCr422')] }), request: { mode: m, accept_chroma_subsampling: true } }));
  assert.equal(r.verdict, 'UNKNOWN');
  assert.equal(r.arithmetic.assessment, 'UNKNOWN');
  assert.ok(r.unknowns.some((u) => /YCbCr422/.test(u.field)));
});

// ---------------------------------------------------------------- C. Cables
test('CB-01 UHBR cable on DP 1.4 HBR3 source → path rate HBR3; PASS with source as bandwidth limit', () => {
  const r = ev(base({ cab: cable({ cert: V('VESA DP80 (FIXTURE)', undefined, 'EV-FIXTURE-CERT'), rated: V(20, 'Gbit/s per lane', 'EV-FIXTURE-CERT') }), snk: sink(DP(20), { modes: [vmode(3440, 1440, 165)] }) }));
  assert.equal(r.verdict, 'PASS');
  assert.equal(r.arithmetic.path_usable_payload.value, 25.92);
  assert.equal(r.arithmetic.path_payload_limiting_segment, 'S1');
  assert.equal(r.recommendation, null, 'no newer cable needed');
});
test('CB-02 passive cable with only "8K 60Hz" listing text, rest VERIFIED, documented timing fits → CONDITIONAL', () => {
  const r = ev(base({ cab: cable({ cert: U(), rated: U(), aop: MK('passive'), marketing: ['8K 60Hz'] }), snk: sink(DP()), request: { mode: F.UW165_T() } }));
  assert.equal(r.verdict, 'CONDITIONAL');
  assert.ok(r.prerequisites.some((p) => /certified DisplayPort cable/.test(p)));
});
test('CB-03 "8K 60Hz" label vs 3440x1440 165 Hz → not PASS, no "60 Hz limit", explanation present', () => {
  const r = ev(base({ cab: cable({ cert: U(), rated: U(), aop: MK('passive'), marketing: ['8K 60Hz'] }), snk: sink(DP()) }));
  assert.equal(r.verdict, 'UNKNOWN');
  assert.doesNotMatch(JSON.stringify(r), /60 ?Hz (limit|cap|maximum)/i);
  assert.ok(r.explanations.some((x) => /8K 60Hz/.test(x) && /neither a refresh-rate ceiling/.test(x)));
});
test('CB-04 "4K 120Hz" label used for a different mode → UNKNOWN', () => {
  const r = ev(base({ cab: cable({ cert: U(), rated: U(), aop: MK('passive'), marketing: ['4K 120Hz'] }), snk: sink(DP()), request: { mode: mode(2560, 1440, 240) } }));
  assert.equal(r.verdict, 'UNKNOWN');
});
test('CB-05 "HDMI 2.1" cable without UHS certification, sink timing UNKNOWN → UNKNOWN', () => {
  const r = ev(doc({ src: hsrc(), cab: cable({ cert: U(), rated: U(), aop: MK('passive'), marketing: ['HDMI 2.1'] }), snk: hsnk(FRL()), request: { mode: F.K4_120() } }));
  assert.equal(r.verdict, 'UNKNOWN');
  assert.ok(r.unknowns.some((u) => /certification/.test(u.field)));
});
test('CB-06a certified cable longer than certified length, documented timing fits → CONDITIONAL', () => {
  const r = ev(base({ cab: cable({ length_m: V(5), certified_length_m: V(3) }), snk: sink(DP()), request: { mode: F.UW165_T() } }));
  assert.equal(r.verdict, 'CONDITIONAL');
  assert.ok(r.prerequisites.includes('use a certified cable within its certified length'));
});
test('CB-06b same but sink timing UNKNOWN → UNKNOWN', () => {
  const r = ev(base({ cab: cable({ length_m: V(5), certified_length_m: V(3) }), snk: sink(DP()) }));
  assert.equal(r.verdict, 'UNKNOWN');
});
test('CB-07 documented directional cable → CONDITIONAL "orient source end"', () => {
  const r = ev(base({ cab: cable({ directional: V(true) }) }));
  assert.equal(r.verdict, 'CONDITIONAL');
  assert.ok(r.prerequisites.some((p) => /orient/.test(p)));
});

// ---------------------------------------------------------------- D. USB-C, USB4/Thunderbolt, docks
const usbc = (rate, lanes, o) => link('USB-C_DP_AltMode', rate, lanes, o);
const usbcSrc = (lk) => source(lk, { port: 'USB-C (left)', connector: 'USB-C' });
test('UC-01 USB-C DP Alt Mode with 4 lanes documented, mode verified → PASS (single verdict)', () => {
  const r = ev(doc({ src: usbcSrc(usbc(8.1, 4)), snk: sink(usbc(8.1, 4), { port: 'USB-C IN', connector: 'USB-C', modes: [vmode(3840, 2160, 60)] }), request: { mode: F.K4_60() } }));
  assert.equal(r.verdict, 'PASS');
});
test('UC-02 USB-C Alt Mode with USB 3 data sharing (2 lanes) exceeds halved payload → FAIL', () => {
  const r = ev(doc({ src: usbcSrc(usbc(8.1, 2)), snk: sink(usbc(8.1, 4), { port: 'USB-C IN', connector: 'USB-C', modes: [vmode(3840, 2160, 60, 10)] }), request: { mode: mode(3840, 2160, 60, 10) } }));
  assert.equal(r.verdict, 'FAIL');
  assert.equal(r.limiting_segment, 'S1');
  assert.equal(r.arithmetic.path_usable_payload.value, 12.96);
  assert.ok(!r.prerequisites.some((p) => /4-lane|disable USB/i.test(p)), 'no undocumented 4-lane option');
});
test('UC-03 USB-C port with no documented video support → UNKNOWN', () => {
  const r = ev(doc({ src: usbcSrc(link('UNKNOWN', null, null)), snk: sink(DP(), { modes: [vmode(3840, 2160, 60)] }), request: { mode: F.K4_60() } }));
  assert.equal(r.verdict, 'UNKNOWN');
  assert.ok(r.unknowns.some((u) => /video|protocol/.test(u.field + u.needed_evidence)));
});
test('UC-04 USB4/Thunderbolt dock, two displays exceed the shared tunnel payload → FAIL (single verdict)', () => {
  const dock = mid('FIXTURE-DOCK', 'dock', link('USB4_DP_Tunnel', 8.1, 4), DP());
  const m = { ...mode(3840, 2160, 60, 10), timing: timing(4400, 2250) }; // 17.82 per display
  const r = ev(doc({ src: source(link('USB4_DP_Tunnel', 8.1, 4), { connector: 'USB-C' }), mids: [{ device: dock, kind: 'dock' }], snk: sink(DP(), { modes: [vmode(3840, 2160, 60, 10)] }), request: { mode: m, display_count: 2 }, groups: [{ group_id: 'G-USB4', payload: V(30, 'Gbit/s'), members: ['D1', 'D2'] }] }));
  assert.equal(r.verdict, 'FAIL');
  assert.ok(['G-USB4', 'S1', 'S3'].includes(r.limiting_segment), r.limiting_segment);
});
test('UC-05 dock with documented per-port maximum applies even when host is faster → FAIL (dock port)', () => {
  const dock = mid('FIXTURE-DOCK', 'dock', link('Thunderbolt_DP_Tunnel', 20, 4), TMDS(), { outConn: 'HDMI' });
  const r = ev(doc({ src: source(link('Thunderbolt_DP_Tunnel', 20, 4), { connector: 'USB-C' }), mids: [{ device: dock, kind: 'dock' }], cab2: hdmiCable(), snk: hsnk(FRL(), { modes: [vmode(3840, 2160, 120)] }), request: { mode: F.K4_120() } }));
  assert.equal(r.verdict, 'FAIL');
  assert.equal(r.limiting_segment, 'S3');
});
test('UC-06 dock with only marketing "dual 4K" → UNKNOWN', () => {
  const dock = mid('FIXTURE-DOCK', 'dock', usbc(MK(8.1), MK(4)), DP(MK(8.1), MK(4)));
  const r = ev(doc({ src: usbcSrc(usbc(8.1, 4)), mids: [{ device: dock, kind: 'dock' }], snk: sink(DP(), { modes: [vmode(3840, 2160, 60)] }), request: { mode: F.K4_60() } }));
  assert.equal(r.verdict, 'UNKNOWN');
  assert.equal(r.limiting_segment, 'S3');
});

// ---------------------------------------------------------------- E. Multi-display and MST
const mst = () => mid('FIXTURE-MST', 'mst_hub', DP(), DP());
const q60 = (st = 'VERIFIED') => ({ ...mode(2560, 1440, 60), timing: timing(2720, 1481, st) }); // 5.80 per display
const mstDoc = (o = {}) => doc({ src: source(DP()), mids: [{ device: mst(), kind: 'mst_hub' }], snk: sink(DP(), { modes: [vmode(2560, 1440, 60)] }), request: { mode: q60(), display_count: 2 }, env: { os_mst_support: V(true) }, groups: [{ group_id: 'G-MST', payload: V(25.92, 'Gbit/s'), members: ['D1', 'D2'] }], ...o });
test('MD-01a MST hub, two displays within one HBR3 link, all VERIFIED → PASS', () => {
  const r = ev(mstDoc());
  assert.equal(r.verdict, 'PASS');
  assert.ok(Math.abs(r.arithmetic.required_bitrate.value - 2 * 2720 * 1481 * 60 * 24 / 1e9) < 1e-3, 'shared sum shown');
});
test('MD-01b one sink timing only DERIVED → CONDITIONAL', () => {
  const r = ev(mstDoc({ snk: sink(DP()), request: { mode: q60('DERIVED'), display_count: 2 } }));
  assert.equal(r.verdict, 'CONDITIONAL');
});
test('MD-02 MST sum exceeds link payload → FAIL for the joint request', () => {
  const m = { ...mode(3840, 2160, 60), timing: timing(4400, 2250) }; // 14.26 per display, 28.5 for two
  const r = ev(mstDoc({ snk: sink(DP(), { modes: [vmode(3840, 2160, 60)] }), request: { mode: m, display_count: 2 } }));
  assert.equal(r.verdict, 'FAIL');
});
test('MD-03 macOS host with MST hub, OS MST support not documented → UNKNOWN', () => {
  const r = ev(mstDoc({ env: { os: V('macOS'), os_mst_support: U() } }));
  assert.equal(r.verdict, 'UNKNOWN');
  assert.ok(r.unknowns.some((u) => u.field === 'environment.os_mst_support'));
});
test('MD-04 display_count above documented source max_displays → FAIL', () => {
  const r = ev(base({ src: source(DP(), { max_displays: V(2) }), request: { mode: mode(1920, 1080, 60), display_count: 3 }, snk: sink(DP(), { modes: [vmode(1920, 1080, 60)] }) }));
  assert.equal(r.verdict, 'FAIL');
  assert.equal(r.limiting_segment, 'S1');
});

// ---------------------------------------------------------------- F. Adapters
const passiveAd = () => mid('FIXTURE-PASSIVE', 'passive_adapter', DP(), TMDS(), { outConn: 'HDMI' });
const adDoc = (dpp, m = F.K4_60(), modes = [vmode(3840, 2160, 60)]) => doc({ src: source(DP(), { dpp }), mids: [{ device: passiveAd(), kind: 'passive_adapter' }], cab2: hdmiCable(), snk: hsnk(FRL(), { modes }), request: { mode: m } });
test('AD-01 passive DP-to-HDMI with DP++ VERIFIED → limited to the documented TMDS level → FAIL for 4K120', () => {
  const r = ev(adDoc(V(true), F.K4_120(), [vmode(3840, 2160, 120)]));
  assert.equal(r.verdict, 'FAIL');
  assert.equal(r.limiting_segment, 'S3', 'adapter HDMI side is the limit');
});
test('AD-02 passive DP-to-HDMI with DP++ VERIFIED false → FAIL', () => {
  const r = ev(adDoc(V(false)));
  assert.equal(r.verdict, 'FAIL');
  assert.match(r.reason, /DP\+\+/);
});
test('AD-03 active DP-to-HDMI 2.1 converter, DSC pass-through not documented, mode needs DSC → UNKNOWN', () => {
  const conv = mid('FIXTURE-CONV', 'active_adapter', DP(8.1, 4, { dsc: U() }), FRL({ dsc: U() }), { outConn: 'HDMI' });
  const r = ev(doc({ src: source(DP(8.1, 4, { dsc: V(true) })), mids: [{ device: conv, kind: 'active_converter' }], cab2: hdmiCable(), snk: hsnk(FRL({ dsc: V(true) })), request: { mode: mode(3840, 2160, 144, 10) } }));
  assert.equal(r.verdict, 'UNKNOWN');
  assert.ok(r.unknowns.some((u) => /S3\.link\.dsc/.test(u.field)), JSON.stringify(r.unknowns));
});
test('AD-04 active converter with unknown HDR/VRR pass-through → SDR PASS, HDR/VRR UNKNOWN, overall UNKNOWN', () => {
  const feats = { hdr: U(), max_bit_depth_bpc: V(10), chroma_formats: V(['RGB']), vrr: U() };
  const conv = mid('FIXTURE-CONV', 'active_adapter', DP(), FRL(), { outConn: 'HDMI', features: feats });
  const r = ev(doc({ src: source(DP()), mids: [{ device: conv, kind: 'active_converter' }], cab2: hdmiCable(), snk: hsnk(FRL(), { modes: [vmode(3840, 2160, 60), vmode(3840, 2160, 60, 8, 'RGB', { hdr: 'HDR10', vrr: 'HDMI_VRR' })] }), request: { mode: { ...F.K4_60(), hdr: 'HDR10', vrr: 'HDMI_VRR' }, require_hdr: true, require_vrr: true } }));
  assert.equal(r.verdict, 'UNKNOWN');
  assert.equal(sub(r, /^Base mode/).verdict, 'PASS');
  assert.equal(sub(r, /^HDR/).verdict, 'UNKNOWN');
  assert.equal(sub(r, /^VRR/).verdict, 'UNKNOWN');
});

// ---------------------------------------------------------------- G. Bit depth, chroma, HDR, VRR, DSC
test('BT-01a 8-bit SDR RGB in sink verified list, DSC false somewhere → PASS', () => {
  const r = ev(base({ src: source(DP(8.1, 4, { dsc: V(false) })) }));
  assert.equal(r.verdict, 'PASS');
});
test('BT-01b 8-bit mode not listed, timing VERIFIED, fits → CONDITIONAL', () => {
  const r = ev(base({ snk: sink(DP(), { modes: [vmode(3440, 1440, 100)] }), request: { mode: F.UW165_T() } }));
  assert.equal(r.verdict, 'CONDITIONAL');
  assert.ok(r.prerequisites.some((p) => /supports this mode/.test(p)));
});
test('BT-01c 10-bit HDR RGB with documented timing exceeding payload, DSC false → FAIL with joint and separate sub-results', () => {
  const m = { ...F.UW165_T(), bit_depth_bpc: 10, hdr: 'HDR10' }; // 26.14 > 25.92
  const r = ev(base({ request: { mode: m, require_hdr: true } }));
  assert.equal(r.verdict, 'FAIL');
  assert.ok(sub(r, /^Base mode/) && sub(r, /^HDR/));
  assert.ok(sub(r, /8-bit fallback/), '8-bit alternative reported');
});
test('BT-01d DP 10-bit HDR YCbCr 4:2:2, documented timing fits, not listed, subsampling accepted → CONDITIONAL', () => {
  const m = { ...F.UW165_T(), bit_depth_bpc: 10, chroma: 'YCbCr422', hdr: 'HDR10' };
  const r = ev(base({ snk: sink(DP()), request: { mode: m, require_hdr: true, accept_chroma_subsampling: true } }));
  assert.equal(r.verdict, 'CONDITIONAL');
  assert.ok(r.prerequisites.some((p) => /select YCbCr 4:2:2/.test(p)));
});
test('BT-02 DSC on source and sink, active adapter DSC UNKNOWN → DSC-dependent mode UNKNOWN', () => {
  const rep = mid('FIXTURE-REPEATER', 'active_adapter', DP(8.1, 4, { dsc: U() }), DP(8.1, 4, { dsc: U() }));
  const r = ev(doc({ src: source(DP(8.1, 4, { dsc: V(true) })), mids: [{ device: rep, kind: 'active_converter' }], snk: sink(DP(8.1, 4, { dsc: V(true) })), request: { mode: mode(3840, 2160, 144, 10) } }));
  assert.equal(r.verdict, 'UNKNOWN');
  assert.equal(sub(r, /with DSC/).verdict, 'UNKNOWN');
});
const dscMode = () => ({ ...vmode(3840, 2160, 144, 10), dsc_required: true });
test('BT-03 DSC documented on every segment and the mode is a documented DSC mode → PASS', () => {
  const r = ev(base({ src: source(DP(8.1, 4, { dsc: V(true) })), snk: sink(DP(8.1, 4, { dsc: V(true), dsc_documented_modes: [dscMode()] })), request: { mode: mode(3840, 2160, 144, 10) } }));
  assert.equal(r.verdict, 'PASS');
  assert.equal(r.max_verified_mode.dsc_required, true);
  assert.equal(r.arithmetic.assessment, 'EXCEEDS', 'NEW-M1: documented DSC mode exempt');
  assert.doesNotMatch(JSON.stringify(r), /ratio/i);
});
test('BT-04a DSC everywhere, exceeds, mode not in any DSC list, accept_dsc=true → UNKNOWN', () => {
  const r = ev(base({ src: source(DP(8.1, 4, { dsc: V(true) })), snk: sink(DP(8.1, 4, { dsc: V(true), dsc_documented_modes: [] })), request: { mode: mode(3840, 2160, 144, 10), accept_dsc: true } }));
  assert.equal(r.verdict, 'UNKNOWN', 'NEW-M2: DSC sub-result replaces the uncompressed FAIL');
  assert.equal(sub(r, /^Requested mode$/).verdict, 'FAIL');
});
test('BT-04b as BT-04a with accept_dsc=false → FAIL', () => {
  const r = ev(base({ src: source(DP(8.1, 4, { dsc: V(true) })), snk: sink(DP(8.1, 4, { dsc: V(true), dsc_documented_modes: [] })), request: { mode: mode(3840, 2160, 144, 10), accept_dsc: false } }));
  assert.equal(r.verdict, 'FAIL');
});
test('BT-05 bandwidth fits but sink HDR UNKNOWN → HDR sub-result UNKNOWN, SDR independent', () => {
  const feats = { ...FULL(), hdr: U() };
  const r = ev(base({ snk: sink(DP(), { features: feats, modes: [vmode(3440, 1440, 165)] }), request: { mode: { ...F.UW165(), hdr: 'HDR10' }, require_hdr: true } }));
  assert.equal(sub(r, /^HDR/).verdict, 'UNKNOWN');
  assert.equal(sub(r, /^Base mode/).verdict, 'PASS');
});
test('BT-06a VRR documented only on the DP input, user on HDMI → VRR sub-result FAIL', () => {
  const hdmiIn = port('HDMI IN', 'HDMI', 'input', TMDS(), { features: { ...FULL(), vrr: V(false) }, modes: [vmode(2560, 1440, 60)] });
  const snk = sink(DP(), { modes: [vmode(2560, 1440, 60, 8, 'RGB', { vrr: 'VESA_AdaptiveSync' })], extraPorts: [hdmiIn] });
  const r = ev(doc({ src: hsrc(), cab: hdmiCable(), snk, sinkPort: 'HDMI IN', request: { mode: { ...mode(2560, 1440, 60), vrr: 'HDMI_VRR' }, require_vrr: true } }));
  assert.equal(sub(r, /^VRR/).verdict, 'FAIL');
});
test('BT-06b user on DP, VRR VERIFIED everywhere and in the verified mode → VRR sub-result PASS', () => {
  const r = ev(base({ snk: sink(DP(), { modes: [vmode(3440, 1440, 165, 8, 'RGB', { vrr: 'VESA_AdaptiveSync' })] }), request: { mode: { ...F.UW165(), vrr: 'VESA_AdaptiveSync' }, require_vrr: true } }));
  assert.equal(sub(r, /^VRR/).verdict, 'PASS');
});
test('BT-06c VRR UNKNOWN on the source output → VRR sub-result UNKNOWN', () => {
  const r = ev(base({ src: source(DP(), { features: { ...FULL(), vrr: U() } }), snk: sink(DP(), { modes: [vmode(3440, 1440, 165, 8, 'RGB', { vrr: 'VESA_AdaptiveSync' })] }), request: { mode: { ...F.UW165(), vrr: 'VESA_AdaptiveSync' }, require_vrr: true } }));
  assert.equal(sub(r, /^VRR/).verdict, 'UNKNOWN');
});
test('BT-07 chroma subsampling needed but not accepted → FAIL for RGB; 4:2:0 shown only as an option', () => {
  const r = ev(base({ request: { mode: k4_120_10(), accept_chroma_subsampling: false } }));
  assert.equal(r.verdict, 'FAIL');
  const alt = sub(r, /4:2:0/);
  assert.ok(alt && /not requested/.test(alt.label));
});

// ---------------------------------------------------------------- H. Missing data and invalid input
test('MS-01 exact monitor model unknown → UNKNOWN with a full report', () => {
  const r = ev(base({ snk: sink(DP(), { identity: ident(null), modes: [] }) }));
  assert.equal(r.verdict, 'UNKNOWN');
  assert.ok(r.unknowns.some((u) => /identity\.model/.test(u.field)));
  assert.ok(r.unknowns.some((u) => /timing/.test(u.field)));
  assert.ok(r.sub_results.length >= 1 && r.arithmetic);
});
test('MS-02a per-input timings missing, lower bound exceeds payload → FAIL', () => {
  const r = ev(base({ snk: sink(DP()), request: { mode: k4_120_10() } }));
  assert.equal(r.verdict, 'FAIL');
  assert.equal(sub(r, /^Requested mode$/).verdict, 'FAIL');
});
test('MS-02b per-input timings missing, lower bound does not exceed → UNKNOWN (needs EDID/timing table)', () => {
  const r = ev(base({ snk: sink(DP()) }));
  assert.equal(r.verdict, 'UNKNOWN');
  assert.ok(r.unknowns.some((u) => /EDID/.test(u.needed_evidence)));
});
test('MS-03 VERIFIED field without evidence id, or DERIVED without derived_from → rejected', () => {
  const d1 = base(); d1.devices[0].ports[0].link.lane_count = { value: 4, status: 'VERIFIED' };
  assert.ok(E.validateDocument(d1).some((e) => /evidence id/.test(e)));
  const d2 = base(); d2.devices[0].ports[0].link.lane_count = { value: 4, status: 'DERIVED' };
  assert.ok(E.validateDocument(d2).some((e) => /derived_from/.test(e)));
});
test('MS-04 retailer listing is the only source for a "verified" mode → not PASS', () => {
  const r = E.evaluate(base({ snk: sink(DP(), { modes: [vmode(3440, 1440, 165, 8, 'RGB', {}, 'EV-FIXTURE-RETAIL')] }) }));
  assert.notEqual(r.verdict, 'PASS');
});
test('MS-05 checked_at without time zone → rejected', () => {
  const d = base(); d.evidence[0] = { ...d.evidence[0], checked_at: '2026-10-17T23:00:00' };
  assert.ok(E.validateDocument(d).some((e) => /time zone/.test(e)));
});
test('MS-06 zero/negative refresh or unknown chroma → input rejected, no verdict', () => {
  for (const bad of [{ refresh_hz: 0 }, { refresh_hz: -60 }, { chroma: 'YUV' }, { bit_depth_bpc: 9 }]) {
    assert.throws(() => E.evaluate(base({ request: { mode: { ...F.UW165(), ...bad } } })), (e) => e.code === 'INVALID_REQUEST');
  }
});

// ---------------------------------------------------------------- I. Owned-first and recommendation
test('OW-01 user-owned cable VERIFIED adequate → PASS, purchase_needed NO', () => {
  const r = ev(base());
  assert.equal(r.verdict, 'PASS');
  assert.equal(r.purchase_needed, 'NO');
});
test('OW-02 owned passive cable UNKNOWN → CONDITIONAL; recommends the adequate HBR3 class, not the newest standard', () => {
  const r = ev(base({ cab: cable({ cert: U(), rated: U(), aop: V('passive') }), snk: sink(DP()), request: { mode: F.UW165_T() } }));
  assert.equal(r.verdict, 'CONDITIONAL');
  assert.match(r.recommendation.class.label, /HBR3 class/);
  assert.match(r.recommendation.class.label, /adds no bandwidth/);
});
test('OW-03 affiliate price data for a more expensive item does not change verdict or adequacy order', () => {
  const d = base({ cab: cable({ cert: U(), rated: U(), aop: V('passive') }), snk: sink(DP()), request: { mode: F.UW165_T() } });
  const plain = ev(d);
  const cands = [
    { name: 'FIXTURE UHBR cable', family: 'DP', certified: true, rated_gbps_per_lane: 20, price: 59, affiliate: true },
    { name: 'FIXTURE HBR3 cable', family: 'DP', certified: true, rated_gbps_per_lane: 8.1, price: 25 },
    { name: 'FIXTURE uncertified', family: 'DP', certified: false, rated_gbps_per_lane: 20, price: 5 }
  ];
  const withPrice = ev(d, { candidates: cands });
  assert.equal(withPrice.verdict, plain.verdict);
  assert.equal(withPrice.recommendation.item.name, 'FIXTURE HBR3 cable');
  const pricier = ev(d, { candidates: [{ ...cands[1], price: 99 }, { ...cands[0], price: 10 }] });
  assert.equal(pricier.recommendation.item.name, 'FIXTURE HBR3 cable', 'price never reorders adequacy');
});

// ---------------------------------------------------------------- J. Real-world case (Issue #10 facts only)
const rtx = (o = {}) => ({ device_id: 'RTX3080', role: 'source', identity: { manufacturer: MK('NVIDIA', 'EV-ISSUE10'), model: o.model || U(), revision: U(), user_owned: true }, ports: [port('DP (unspecified)', 'DP', 'output', o.link || link('DisplayPort', null, null, { version_label: MK('DP 1.4a', 'EV-ISSUE10'), dsc: U() }), { features: o.features || { hdr: U(), max_bit_depth_bpc: U(), chroma_formats: U(), vrr: U() } })], max_displays: U() });
const dutzo = (o = {}) => ({ device_id: 'DUTZO', role: 'sink', identity: { manufacturer: MK('DUTZO', 'EV-ISSUE10'), model: o.model || U(), revision: U(), user_owned: true }, ports: o.ports || [port('DP (unspecified)', 'DP', 'input', link('DisplayPort', null, null, { dsc: U() }), { features: { hdr: U(), max_bit_depth_bpc: U(), chroma_formats: U(), vrr: U() }, modes: [] }), port('HDMI (unspecified)', 'HDMI', 'input', link('HDMI_TMDS', null, null, { dsc: U() }), { features: { hdr: U(), max_bit_depth_bpc: U(), chroma_formats: U(), vrr: U() }, modes: [] })] });
const issueCable = () => cable({ identity: { manufacturer: U(), model: U(), revision: U(), user_owned: true }, cert: U(), rated: U(), aop: U(), marketing: ['8K 60Hz'], marketingEv: 'EV-ISSUE10', length_m: U(), certified_length_m: U(), directional: U() });
const rwReq = () => ({ mode: { ...mode(3440, 1440, 165, 10), hdr: 'HDR10', vrr: 'G-SYNC_Compatible' }, require_hdr: true, require_vrr: true });
test('RW-01 DUTZO + RTX 3080 + unknown cable, issue-text facts only → overall UNKNOWN, every sub-result UNKNOWN', () => {
  const d = doc({ src: rtx(), cab: issueCable(), snk: dutzo(), request: rwReq() });
  const r = ev(d);
  assert.equal(r.verdict, 'UNKNOWN');
  for (const s of r.sub_results) assert.equal(s.verdict, 'UNKNOWN', s.label);
  const eight = sub(r, /8-bit fallback/);
  assert.ok(eight, '165 Hz 8-bit RGB SDR sub-result reported');
  assert.match(eight.reason, /missing evidence/);
  const fields = r.unknowns.map((u) => u.field).join(' ');
  for (const f of ['DUTZO.identity.model', 'RTX3080.identity.model', 'certification', 'timing']) assert.ok(fields.includes(f), 'unknown ' + f + ' in ' + fields);
  assert.doesNotMatch(JSON.stringify(r), /likely achievable/i);
  assert.match(r.recommendation.class.label, /8\.1 Gbit\/s per lane/, 'certified HBR3-capable cable only as a named recommendation');
  assert.match(r.recommendation.note, /not a basis for the verdict/);
  assert.ok(r.explanations.some((x) => /8K 60Hz/.test(x) && /neither a refresh-rate ceiling/.test(x)));
  const hd = ev(doc({ src: rtx(), cab: issueCable(), snk: dutzo(), sinkPort: 'HDMI (unspecified)', request: rwReq() }));
  assert.equal(hd.verdict, 'UNKNOWN', 'HDMI input UNKNOWN');
});
const rwDocumented = (o = {}) => {
  const dpIn = port('DP 1', 'DP', 'input', DP(), { features: FULL(), modes: o.modes === undefined ? [vmode(3440, 1440, 165)] : o.modes });
  return doc({
    src: o.src || rtx({ model: V('FIXTURE-RTX3080-BOARD'), link: DP(), features: FULL() }),
    cab: cable({ cert: V('VESA DP8K (FIXTURE stand-in)', undefined, 'EV-FIXTURE-CERT') }),
    snk: dutzo({ model: V('FIXTURE-DUTZO-MODEL'), ports: [dpIn] }),
    request: { mode: o.mode || F.UW165() }
  });
};
test('RW-02 all named evidence present → PASS for that mode only', () => {
  const r = ev(rwDocumented());
  assert.equal(r.verdict, 'PASS');
  assert.equal(r.max_verified_mode.refresh_hz, 165);
  assert.equal(r.max_verified_mode.bit_depth_bpc, 8);
});
test('RW-02b DP-input timing and cable VERIFIED but the RTX 3080 board/output spec UNKNOWN → UNKNOWN', () => {
  const r = ev(rwDocumented({ src: rtx(), mode: F.UW165_T() }));
  assert.equal(r.verdict, 'UNKNOWN');
  assert.equal(r.limiting_segment, 'S1');
});
test('RW-02c timing documented and fits, no verified-mode listing → CONDITIONAL (never PASS)', () => {
  const r = ev(rwDocumented({ modes: [], mode: F.UW165_T() }));
  assert.equal(r.verdict, 'CONDITIONAL');
  assert.ok(r.prerequisites.some((p) => /DP 1 supports this mode/.test(p)));
});

// ---------------------------------------------------------------- K. Evidence integrity, lint, result invariants
test('LN-01 dangling evidence id → rejected by lint L2', () => {
  const d = base(); d.devices[0].ports[0].link.lane_count = V(4, undefined, 'EV-NOPE');
  assert.ok(E.lint(d).some((e) => /^L2: .*EV-NOPE/.test(e)));
});
test('LN-02 duplicate evidence id → rejected by lint L2', () => {
  const d = base(); d.evidence.push({ ...d.evidence[0] });
  assert.ok(E.lint(d).some((e) => /duplicate evidence id/.test(e)));
});
test('LN-03 VERIFIED field citing MARKETING/retailer evidence → rejected by lint L3', () => {
  const d = base(); d.devices[0].ports[0].link.lane_count = V(4, undefined, 'EV-FIXTURE-RETAIL');
  assert.ok(E.lint(d).some((e) => /^L3: VERIFIED field/.test(e)));
});
test('LN-04 VERIFIED mode citing a non-manufacturer source → rejected by lint L3', () => {
  const d = base({ snk: sink(DP(), { modes: [vmode(3440, 1440, 165, 8, 'RGB', {}, 'EV-ISSUE10')] }) });
  assert.ok(E.lint(d).some((e) => /^L3: VERIFIED mode/.test(e)));
});
test('LN-05 unresolved segment device/port → rejected by lint L4', () => {
  const d = base(); d.path.segments[0].out_port_id = 'NOPE';
  assert.ok(E.lint(d).some((e) => /^L4: .*out_port_id/.test(e)));
  const d2 = base(); d2.path.segments[1].device_id = 'NOPE';
  assert.ok(E.lint(d2).some((e) => /^L4: .*device_id/.test(e)));
});
test('LN-06 verified mode without status, or non-UNKNOWN without evidence → rejected (L5)', () => {
  const d = base(); delete d.devices[2].ports[0].verified_operating_modes[0].status;
  assert.ok(E.validateDocument(d).some((e) => /needs status/.test(e)));
  const d2 = base(); d2.devices[2].ports[0].verified_operating_modes[0].evidence_ids = [];
  assert.ok(E.validateDocument(d2).some((e) => /at least one evidence id/.test(e)));
});
const withResult = (patch) => { const d = base(); const r = E.evaluate(d); return { ...d, result: { ...r, ...patch } }; };
test('LN-07 PASS with max_verified_mode null → rejected (L6)', () => {
  assert.ok(E.validateDocument(withResult({ max_verified_mode: null })).some((e) => /max_verified_mode/.test(e)));
});
test('LN-08 PASS with empty or unresolved sources → rejected (L6/L2)', () => {
  assert.ok(E.validateDocument(withResult({ sources: [] })).some((e) => /sources/.test(e)));
  assert.ok(E.lint(withResult({ sources: ['EV-NOPE'] })).some((e) => /result\.sources/.test(e)));
});
test('LN-09 PASS with arithmetic UNKNOWN or EXCEEDS (outside a documented DSC mode) → rejected (L6/NEW-M1)', () => {
  const r = E.evaluate(base());
  for (const a of ['UNKNOWN', 'EXCEEDS']) assert.ok(E.validateDocument(withResult({ arithmetic: { ...r.arithmetic, assessment: a } })).length > 0, a);
  assert.ok(E.validateDocument(withResult({ max_verified_mode: { ...r.max_verified_mode, status: 'UNKNOWN' } })).some((e) => /NEW-M3/.test(e)));
});
test('LN-10 UNKNOWN with empty unknowns → rejected (L6)', () => {
  assert.ok(E.validateDocument(withResult({ verdict: 'UNKNOWN', unknowns: [] })).some((e) => /unknowns/.test(e)));
});
test('LN-11 DERIVED field with empty derived_from → rejected (L1)', () => {
  const d = base(); d.devices[0].ports[0].link.lane_count = { value: 4, status: 'DERIVED', derived_from: [] };
  assert.ok(E.validateDocument(d).some((e) => /derived_from/.test(e)));
});

// ---------------------------------------------------------------- REM-02 additions (non-blocking items folded in)
test('REM02-NEW-L3 VERIFIED field with value null → rejected; lint L7 payload > raw → rejected', () => {
  const d = base(); d.devices[0].ports[0].link.lane_count = { value: null, status: 'VERIFIED', evidence_ids: ['EV-FIXTURE-MFR'] };
  assert.ok(E.validateDocument(d).some((e) => /non-null value/.test(e)));
  const d2 = base(); d2.devices[0].ports[0].link.raw_bitrate = V(20); d2.devices[0].ports[0].link.usable_payload = V(25);
  assert.ok(E.lint(d2).some((e) => /^L7/.test(e)));
});
test('REM02-NEW-M3 MARKETING status inside verified_operating_modes → rejected', () => {
  const d = base(); d.devices[2].ports[0].verified_operating_modes[0].status = 'MARKETING';
  assert.ok(E.validateDocument(d).some((e) => /NEW-M3/.test(e)));
});

// ---------------------------------------------------------------- unit checks (PLAN §11)
test('unit: bits_per_pixel per link type; HDMI 4:2:2 UNKNOWN', () => {
  assert.equal(E.bitsPerPixel('DP', 8, 'RGB'), 24);
  assert.equal(E.bitsPerPixel('DP', 10, 'YCbCr422'), 20);
  assert.equal(E.bitsPerPixel('DP', 10, 'YCbCr420'), 15);
  assert.equal(E.bitsPerPixel('HDMI', 10, 'YCbCr420'), 15);
  assert.equal(E.bitsPerPixel('HDMI', 10, 'YCbCr422'), null);
});
test('unit: PLAN §6 worked example 3440×1440×165 active lower bound 19.62 / 24.52 Gbit/s', () => {
  assert.equal(E.requiredBitrate(mode(3440, 1440, 165), 'DP').value.toFixed(2), '19.62');
  assert.equal(E.requiredBitrate(mode(3440, 1440, 165, 10), 'DP').value.toFixed(2), '24.52');
});
test('unit: precedence FAIL > UNKNOWN > CONDITIONAL > PASS', () => {
  assert.equal(E.worstOf(['PASS', 'CONDITIONAL']), 'CONDITIONAL');
  assert.equal(E.worstOf(['CONDITIONAL', 'UNKNOWN']), 'UNKNOWN');
  assert.equal(E.worstOf(['UNKNOWN', 'FAIL', 'PASS']), 'FAIL');
});

// ---------------------------------------------------------------- REM-01 (REV FAIL TO DEV 76/6242097510): named regression tests
// HIGH-2: PLAN §4 makes the CABLE element mandatory; a path with no cable segment must never reach PASS.
test('REM01-HIGH-2 all-VERIFIED path without a cable segment does not return PASS (UNKNOWN, PLAN §4)', () => {
  const withCable = ev(base());
  assert.equal(withCable.verdict, 'PASS', 'control: same path with the certified cable is PASS');
  const r = ev(base({ cab: null }));
  assert.notEqual(r.verdict, 'PASS');
  assert.equal(r.verdict, 'UNKNOWN');
  assert.ok(r.unknowns.some((u) => u.field === 'path.cable' && /PLAN §4/.test(u.needed_evidence) && /mandatory/.test(u.needed_evidence)), JSON.stringify(r.unknowns));
  assert.ok(r.sub_results.every((s) => s.verdict !== 'PASS'), 'no PASS sub-result');
  assert.equal(r.max_verified_mode, null, 'no verified mode is reported as reachable without a cable');
});
// MEDIUM-1: a VERIFIED mode only counts when bit depth, HDR and VRR match the request (kills E30, E46).
test('REM01-MEDIUM-1a VERIFIED 8-bit mode, request 10-bit → not PASS (E46)', () => {
  const r = ev(base({ snk: sink(DP(), { modes: [vmode(3440, 1440, 165)] }), request: { mode: mode(3440, 1440, 165, 10) } }));
  assert.notEqual(r.verdict, 'PASS');
  assert.equal(r.verdict, 'UNKNOWN');
  assert.notEqual(sub(r, /^Requested mode$/).verdict, 'PASS');
});
test('REM01-MEDIUM-1b VERIFIED SDR mode, request HDR10 with HDR documented on every port → HDR sub-result not PASS (E30)', () => {
  const r = ev(base({ snk: sink(DP(), { modes: [vmode(3440, 1440, 165)] }), request: { mode: { ...F.UW165(), hdr: 'HDR10' }, require_hdr: true } }));
  assert.equal(sub(r, /^Base mode/).verdict, 'PASS', 'SDR base mode is the verified mode');
  assert.notEqual(sub(r, /^HDR/).verdict, 'PASS');
  assert.notEqual(r.verdict, 'PASS');
});
test('REM01-MEDIUM-1c VERIFIED mode without VRR, request VRR with VRR documented on every port → VRR sub-result not PASS', () => {
  const r = ev(base({ snk: sink(DP(), { modes: [vmode(3440, 1440, 165)] }), request: { mode: { ...F.UW165(), vrr: 'VESA_AdaptiveSync' }, require_vrr: true } }));
  assert.equal(sub(r, /^Base mode/).verdict, 'PASS');
  assert.notEqual(sub(r, /^VRR/).verdict, 'PASS');
  assert.notEqual(r.verdict, 'PASS');
});
// MEDIUM-2: DERIVED payloads and DERIVED link rates never support PASS (kills E25, E45).
const hdmiCableR = () => cable({ cert: V('Ultra High Speed HDMI (FIXTURE)', undefined, 'EV-FIXTURE-CERT'), rated: V(48, 'Gbit/s total', 'EV-FIXTURE-CERT') });
test('REM01-MEDIUM-2a requirement above the DERIVED FRL payload (42.667) but below the VERIFIED raw 48 → UNKNOWN (E25)', () => {
  const m = { ...mode(3840, 2160, 165, 10), timing: timing(4000, 2222) }; // 4000×2222×165×30 = 43.99 Gbit/s (synthetic timing)
  const r = ev(doc({ src: source(FRL(), { port: 'HDMI 1', connector: 'HDMI' }), cab: hdmiCableR(), snk: sink(FRL(), { port: 'HDMI IN', connector: 'HDMI', modes: [vmode(3840, 2160, 165, 10)] }), request: { mode: m } }));
  assert.ok(r.arithmetic.required_bitrate.value > 42.667 && r.arithmetic.required_bitrate.value < 48, String(r.arithmetic.required_bitrate.value));
  assert.equal(r.verdict, 'UNKNOWN');
  assert.ok(r.unknowns.some((u) => /usable_payload/.test(u.field) && /DERIVED payload/.test(u.needed_evidence)), JSON.stringify(r.unknowns));
});
test('REM01-MEDIUM-2b DERIVED link rate with otherwise VERIFIED evidence and a verified mode → CONDITIONAL, not PASS (E45); explanation names the verified-mode basis (X5)', () => {
  const r = ev(base({ src: source(DP(D(8.1, 'FIXTURE: rate inferred from a version label (DERIVED)'), 4)) }));
  assert.notEqual(r.verdict, 'PASS');
  assert.equal(r.verdict, 'CONDITIONAL');
  assert.equal(r.limiting_segment, 'S1');
  assert.match(r.reason, /manufacturer-verified mode on DP IN \(the basis of this result; the arithmetic is only an active-pixel lower bound\)/);
  assert.match(r.reason, /CONDITIONAL because S1: link rate\/lanes only DERIVED/);
  assert.ok(r.prerequisites.some((p) => /confirm the documented link rate and lane count of S1/.test(p)), r.prerequisites.join('|'));
});
// MEDIUM-4: exact-model identity for active converters, docks and MST hubs.
test('REM01-MEDIUM-4a active converter with identity model UNKNOWN blocks PASS', () => {
  const mk = (id) => mid('FIXTURE-CONV', 'active_adapter', DP(), FRL(), { outConn: 'HDMI', identity: id });
  const mk2 = (conv) => doc({ src: source(DP()), mids: [{ device: conv, kind: 'active_converter' }], cab2: hdmiCableR(), snk: sink(FRL(), { port: 'HDMI IN', connector: 'HDMI', modes: [vmode(3840, 2160, 60)] }), request: { mode: F.K4_60() } });
  assert.equal(ev(mk2(mk(ident('FIXTURE-CONV')))).verdict, 'PASS', 'control');
  const r = ev(mk2(mk(ident(null))));
  assert.equal(r.verdict, 'UNKNOWN');
  assert.ok(r.unknowns.some((u) => u.field === 'FIXTURE-CONV.identity.model' && /active adapter\/converter/.test(u.needed_evidence)), JSON.stringify(r.unknowns));
});
test('REM01-MEDIUM-4b dock with identity model UNKNOWN blocks PASS', () => {
  const usbcL = (rate, lanes) => link('USB-C_DP_AltMode', rate, lanes);
  const mk = (id) => doc({ src: source(usbcL(8.1, 4), { port: 'USB-C (left)', connector: 'USB-C' }), mids: [{ device: mid('FIXTURE-DOCK', 'dock', usbcL(8.1, 4), DP(), { identity: id }), kind: 'dock' }], snk: sink(DP(), { modes: [vmode(3840, 2160, 60)] }), request: { mode: F.K4_60() } });
  assert.equal(ev(mk(ident('FIXTURE-DOCK'))).verdict, 'PASS', 'control');
  const r = ev(mk(ident(null)));
  assert.equal(r.verdict, 'UNKNOWN');
  assert.ok(r.unknowns.some((u) => u.field === 'FIXTURE-DOCK.identity.model'), JSON.stringify(r.unknowns));
});
// LOW-1: chroma acceptance (E31) and L4 on in_port_id (E37).
test('REM01-LOW-1a verified YCbCr 4:2:0 mode, request does not accept chroma subsampling → FAIL; accepted → PASS (E31)', () => {
  const m = mode(3440, 1440, 165, 8, 'YCbCr420');
  const snk = () => sink(DP(), { modes: [vmode(3440, 1440, 165, 8, 'YCbCr420')] });
  const r = ev(base({ snk: snk(), request: { mode: m, accept_chroma_subsampling: false } }));
  assert.equal(r.verdict, 'FAIL');
  assert.match(r.reason, /does not accept chroma subsampling/);
  assert.equal(ev(base({ snk: snk(), request: { mode: m, accept_chroma_subsampling: true } })).verdict, 'PASS');
});
test('REM01-LOW-1b unresolved segment in_port_id → rejected by lint L4 (E37)', () => {
  const d = base(); d.path.segments.at(-1).in_port_id = 'NOPE';
  assert.ok(E.lint(d).some((e) => /^L4: .*in_port_id NOPE does not resolve/.test(e)));
});
// MEDIUM-3: quickSolve lower bound, CONDITIONAL cap and USB 3 lane halving (kills E40, E41, E42).
test('REM01-MEDIUM-3a quickSolve without a pixel clock never returns CONDITIONAL, even with a certified cable (E40)', () => {
  for (const [src, snk] of [['dp-hbr3', 'dp-hbr3'], ['dp-hbr2', 'dp-hbr2'], ['hdmi-48', 'hdmi-48'], ['usbc-dp14', 'dp-hbr3']]) {
    const r = E.quickSolve({ source: src, sinkInput: snk, cable: 'certified', h_active: 1920, v_active: 1080, refresh_hz: 60, bit_depth_bpc: 8, chroma: 'RGB' });
    assert.equal(r.verdict, 'UNKNOWN', src);
    for (const e of r.elements.filter((x) => x.link)) assert.notEqual(e.verdict, 'CONDITIONAL', src + ' ' + e.element);
  }
});
test('REM01-MEDIUM-3b quickSolve with a user pixel clock that fits → exactly CONDITIONAL per link and overall (E41)', () => {
  const q = { source: 'dp-hbr3', sinkInput: 'dp-hbr3', cable: 'certified', h_active: 1920, v_active: 1080, refresh_hz: 60, bit_depth_bpc: 8, chroma: 'RGB', pixel_clock_mhz: 148.5 };
  const r = E.quickSolve(q);
  assert.equal(r.verdict, 'CONDITIONAL');
  const links = r.elements.filter((x) => x.link);
  assert.equal(links.length, 2);
  for (const e of links) assert.equal(e.verdict, 'CONDITIONAL', e.element);
  const a = E.assessLink(mode(1920, 1080, 60), 'DP-HBR3-x4', { pixel_clock_khz: D(148500), source: 'UNKNOWN' });
  assert.equal(a.verdict, 'CONDITIONAL');
  assert.equal(a.assessment, 'FITS_WITH_MARGIN');
});
test('REM01-MEDIUM-3c quickSolve USB-C dock with USB 3 data halves the DP lanes and changes the verdict (E42)', () => {
  const q = { source: 'usbc-dp14', middle: 'usbc-dock', sinkInput: 'dp-hbr3', cable: 'certified', h_active: 3840, v_active: 2160, refresh_hz: 60, bit_depth_bpc: 10, chroma: 'RGB' }; // 14.93 > 12.96 (2 lanes), < 25.92 (4 lanes)
  const halved = E.quickSolve(q);
  assert.equal(halved.verdict, 'FAIL');
  assert.match(halved.limiting_element, /2 DP lanes/);
  assert.equal(halved.elements[0].carries_gbps, 12.96);
  const full = E.quickSolve({ ...q, usb3_data: false });
  assert.notEqual(full.verdict, 'FAIL');
  assert.equal(full.elements[0].carries_gbps, 25.92);
});

// ---------------------------------------------------------------- REM-02 (QA FAIL 76/6242365621): fail-closed regression tests
// Raw evaluate (no validity assertion) for documents that are invalid on purpose.
const raw = (d) => E.evaluate(d);
const notPass = (r, field) => {
  assert.notEqual(r.verdict, 'PASS');
  assert.ok(r.sub_results.every((s) => s.verdict !== 'PASS'), 'no PASS sub-result');
  if (field) assert.ok(r.unknowns.some((u) => (field instanceof RegExp ? field.test(u.field) : u.field === field)), JSON.stringify(r.unknowns));
};
const seg = (d, kind) => d.path.segments.find((s) => s.kind === kind);
test('REM02-P0 control: source_output → certified cable → sink_input, all VERIFIED + verified mode → PASS', () => {
  assert.equal(ev(base()).verdict, 'PASS');
});
// B1: chain order and identity of every referenced device
test('REM02-B1-P14 path [cable, sink_input] with no source device → UNKNOWN', () => {
  const d = base(); d.devices = d.devices.slice(1); d.path.segments = d.path.segments.slice(1);
  const r = ev(d); assert.equal(r.verdict, 'UNKNOWN'); notPass(r, 'path.segments[0].kind');
  assert.notEqual(r.purchase_needed, 'NO');
});
for (const kind of ['usb_c_alt_mode', 'usb4_tunnel', 'passive_adapter', 'cable']) {
  test(`REM02-B1-P2 first segment kind=${kind} (not source_output) → UNKNOWN even with a VERIFIED source model`, () => {
    const d = base(); d.path.segments[0].kind = kind;
    notPass(raw(d), 'path.segments[0].kind');
  });
}
test('REM02-B1-P2c last segment kind=usb_c_alt_mode (not sink_input) → UNKNOWN', () => {
  const d = base(); d.path.segments.at(-1).kind = 'usb_c_alt_mode';
  notPass(raw(d), 'path.segments[2].kind');
});
test('REM02-B1 source_output / sink_input in the middle of the path → UNKNOWN', () => {
  const m = mid('FIXTURE-MID', 'other', DP(), DP());
  for (const kind of ['source_output', 'sink_input']) {
    const d = doc({ src: source(DP()), mids: [{ device: m, kind }], snk: sink(DP(), { modes: [vmode(3440, 1440, 165)] }), request: { mode: F.UW165() } });
    notPass(raw(d), /^path\.segments\[\d\]\.kind$/);
  }
});
for (const kind of ['usb_c_alt_mode', 'usb4_tunnel', 'passive_adapter', 'mst_hub']) {
  test(`REM02-B1-P1 ${kind} segment pointing at a separate device with model UNKNOWN → UNKNOWN (REV NEW-M1${kind === 'mst_hub' ? ', NEW-L2' : ''})`, () => {
    const mk = (id) => { const m = mid('FIXTURE-MID', 'other', DP(), DP(), { identity: id }); return doc({ src: source(DP(), { dpp: V(true) }), mids: [{ device: m, kind }], snk: sink(DP(), { modes: [vmode(2560, 1440, 60)] }), request: { mode: q60(), display_count: kind === 'mst_hub' ? 2 : 1 }, env: { os_mst_support: V(true) }, groups: kind === 'mst_hub' ? [{ group_id: 'G-MST', payload: V(25.92, 'Gbit/s'), members: ['D1', 'D2'] }] : undefined }); };
    const ctl = ev(mk(ident('FIXTURE-MID')));
    assert.ok(!ctl.unknowns.some((u) => u.field === 'FIXTURE-MID.identity.model'), 'control has no identity unknown');
    const r = ev(mk(ident(null)));
    notPass(r, 'FIXTURE-MID.identity.model');
    if (kind === 'mst_hub') assert.equal(ctl.verdict, 'PASS', 'NEW-L2 control: same MST path with a VERIFIED hub model is PASS');
    const r2 = mk(ident('FIXTURE-MID')); r2.devices.find((x) => x.device_id === 'FIXTURE-MID').identity = {};
    notPass(ev(r2), 'FIXTURE-MID.identity.model');
  });
}
test('REM02-M24 a DERIVED identity model is not VERIFIED → UNKNOWN', () => {
  const r = ev(base({ src: source(DP(), { identity: { ...ident('x'), model: D('FIXTURE-GPU-1', 'FIXTURE: inferred from a box photo') } }) }));
  notPass(r, 'FIXTURE-SRC.identity.model');
});
// B2: intermediate segments with missing ports are never skipped
test('REM02-B2-P3 dock segment with in/out port ids null → UNKNOWN', () => {
  const d = doc({ src: source(DP()), mids: [{ device: mid('FIXTURE-DOCK', 'dock', DP(), DP()), kind: 'dock' }], snk: sink(DP(), { modes: [vmode(3440, 1440, 165)] }), request: { mode: F.UW165() } });
  assert.equal(ev(d).verdict, 'PASS', 'control with ports set');
  const s = seg(d, 'dock'); s.in_port_id = null; s.out_port_id = null;
  const r = ev(d); notPass(r, 'S3.in_port_id'); notPass(r, 'S3.out_port_id');
});
test('REM02-B2-P3b converter out_port_id null does not drop its HBR (1.62×4) output limit → UNKNOWN; control FAIL', () => {
  const d = doc({ src: source(DP()), mids: [{ device: mid('FIXTURE-CONV', 'active_adapter', DP(), DP(1.62, 4)), kind: 'active_converter' }], snk: sink(DP(), { modes: [vmode(3440, 1440, 165)] }), request: { mode: F.UW165() } });
  assert.equal(ev(d).verdict, 'FAIL', 'control');
  seg(d, 'active_converter').out_port_id = null;
  notPass(ev(d), 'S3.out_port_id');
});
// High: cable family and rated_link unit
test('REM02-P6 HDMI Ultra High Speed cable (48 Gbit/s total) on a DisplayPort path → UNKNOWN; DP cable on an HDMI path → UNKNOWN', () => {
  const r = ev(base({ cab: cable({ cert: V('HDMI Ultra High Speed (FIXTURE)', undefined, 'EV-FIXTURE-CERT'), rated: V(48, 'Gbit/s total', 'EV-FIXTURE-CERT') }) }));
  notPass(r, 'cable family');
  const h = ev(doc({ src: source(FRL(), { port: 'HDMI 1', connector: 'HDMI' }), cab: cable({ rated: V(12, 'Gbit/s per lane', 'EV-FIXTURE-CERT') }), snk: sink(FRL(), { port: 'HDMI IN', connector: 'HDMI', modes: [vmode(3840, 2160, 120)] }), request: { mode: F.K4_120() } }));
  notPass(h, 'cable family');
  const t = ev(base({ cab: cable({ cert: V('HDMI Premium High Speed (FIXTURE)', undefined, 'EV-FIXTURE-CERT'), rated: V(8.1, 'Gbit/s per lane', 'EV-FIXTURE-CERT') }) }));
  notPass(t, 'cable family');
});
test('REM02-P7 cable rated_link with an unknown unit ("Gbps") or a missing unit → UNKNOWN, never uncapped; control per-lane → FAIL', () => {
  notPass(ev(base({ cab: cable({ rated: V(1, 'Gbps', 'EV-FIXTURE-CERT') }) })), 'cable.rated_link.unit');
  notPass(ev(base({ cab: cable({ rated: V(1, undefined, 'EV-FIXTURE-CERT') }) })), 'cable.rated_link.unit');
  assert.equal(ev(base({ cab: cable({ rated: V(1, 'Gbit/s per lane', 'EV-FIXTURE-CERT') }) })).verdict, 'FAIL');
});
test('REM02-M15 cable certification UNKNOWN (rated link VERIFIED) → not PASS', () => {
  notPass(ev(base({ cab: cable({ cert: U() }) })), /cable\.certification_program/);
});
// High: evaluate() enforces validateDocument() and lint(); duplicates are linted
test('REM02-P4 VERIFIED fields with evidence_ids [] (validateDocument errors) → UNKNOWN', () => {
  const d = base(); d.devices[0].ports[0].link.lane_count.evidence_ids = [];
  assert.ok(E.validateDocument(d).length > 0);
  notPass(raw(d), 'document');
});
test('REM02-P4b VERIFIED fields citing a retailer listing (lint L3 errors) → UNKNOWN', () => {
  const d = base(); d.devices[0].ports[0].link.max_link_rate_per_lane.evidence_ids = ['EV-FIXTURE-RETAIL'];
  assert.ok(E.lint(d).some((e) => /^L3/.test(e)));
  notPass(raw(d), 'document');
});
test('REM02-P11b duplicate device_id (first copy model UNKNOWN, last VERIFIED) → linted and UNKNOWN', () => {
  const d = base(); const dupe = JSON.parse(JSON.stringify(d.devices[0])); d.devices[0].identity = ident(null); d.devices.splice(1, 0, dupe);
  assert.ok(E.lint(d).some((e) => e === 'L4: duplicate device_id FIXTURE-SRC'));
  notPass(raw(d), 'devices.FIXTURE-SRC (duplicate device_id)');
  const d2 = base(); d2.path.segments[1].segment_id = 'S1';
  assert.ok(E.lint(d2).some((e) => e === 'L4: duplicate segment_id S1'));
});
test('REM02-P10 documented usable_payload above the standard for its rate × lanes → UNKNOWN (conflict), not a capability', () => {
  const d = base(); d.devices.at(-1).ports[0].link.usable_payload = V(1e9);
  notPass(ev(d), /conflicts with the standard/);
});
// Fail-open mutants that QA found surviving
test('REM02-NEW-L1 (M03) no cable, full VERIFIED timing that fits, no verified mode → UNKNOWN, not rule-3 CONDITIONAL', () => {
  const r = ev(base({ cab: null, snk: sink(DP()), request: { mode: F.UW165_T() } }));
  assert.equal(r.verdict, 'UNKNOWN');
  assert.ok(r.unknowns.some((u) => u.field === 'path.cable'));
  assert.equal(ev(base({ snk: sink(DP()), request: { mode: F.UW165_T() } })).verdict, 'CONDITIONAL', 'control with the cable');
});
test('REM02-M34 two displays exceed a VERIFIED shared tunnel payload while every per-port link fits → FAIL (shared group limit)', () => {
  const tun = () => link('USB4_DP_Tunnel', 20, 4);
  const m = { ...mode(3840, 2160, 60, 10), timing: timing(4400, 2250) }; // 17.82 per display, 35.64 for two
  const mk = (payload) => doc({ src: source(tun(), { connector: 'USB-C' }), cab: cable({ rated: V(20, 'Gbit/s per lane', 'EV-FIXTURE-CERT') }), mids: [{ device: mid('FIXTURE-DOCK', 'dock', tun(), DP()), kind: 'dock' }], snk: sink(DP(), { modes: [vmode(3840, 2160, 60, 10)] }), request: { mode: m, display_count: 2 }, groups: [{ group_id: 'G-USB4', payload: V(payload, 'Gbit/s'), members: ['D1', 'D2'] }] });
  const r = ev(mk(30));
  assert.equal(r.verdict, 'FAIL');
  assert.equal(r.limiting_segment, 'G-USB4');
  assert.equal(ev(mk(40)).verdict, 'PASS', 'control: the same path with a 40 Gbit/s shared payload');
});
test('REM02-M08 final PASS safety net: PASS with arithmetic UNKNOWN, or EXCEEDS outside a documented DSC mode, is refused', () => {
  const g = E._internal.passGuard;
  assert.equal(g('PASS', 'UNKNOWN', null, false), true);
  assert.equal(g('PASS', 'EXCEEDS', null, false), true);
  assert.equal(g('PASS', 'EXCEEDS', { dsc_required: false }, false), true);
  assert.equal(g('PASS', 'EXCEEDS', { dsc_required: true }, false), false);
  assert.equal(g('PASS', 'EXCEEDS', null, true), false);
  assert.equal(g('PASS', 'FITS_WITH_MARGIN', {}, false), false);
  assert.equal(g('CONDITIONAL', 'UNKNOWN', null, false), false);
});
test('REM02-M27 quickSolve cap: an overall PASS is reported as CONDITIONAL; other verdicts unchanged', () => {
  const c = E._internal.quickCap;
  assert.equal(c('PASS'), 'CONDITIONAL');
  for (const v of ['CONDITIONAL', 'UNKNOWN', 'FAIL']) assert.equal(c(v), v);
});
// Further fail-open / label mutants (QA M22, M26, M28, M32; REV E12, E13)
test('REM02-E13 verified_operating_modes entry with status UNKNOWN (manufacturer-cited) is not a verified mode → not PASS', () => {
  const r = ev(base({ snk: sink(DP(), { modes: [{ ...vmode(3440, 1440, 165), status: 'UNKNOWN' }] }) }));
  assert.notEqual(r.verdict, 'PASS');
  assert.equal(r.max_verified_mode, null);
});
test('REM02-M22 passive DP→HDMI adapter with source DP++ UNKNOWN → UNKNOWN (not PASS)', () => {
  const r = ev(adDoc(U()));
  assert.equal(r.verdict, 'UNKNOWN');
  assert.ok(r.unknowns.some((u) => u.field === 'source.dual_mode_dp_plus_plus'));
  assert.equal(ev(adDoc(V(true))).verdict, 'PASS', 'control: DP++ VERIFIED');
});
test('REM02-E12 two displays over one HBR2 source link without a shared group: the per-display sum exceeds the source → FAIL', () => {
  const m = { ...mode(3840, 2160, 60), timing: timing(4400, 2250) }; // 14.26 per display, 28.51 for two > 17.28
  const r = ev(doc({ src: source(DP(5.4)), mids: [{ device: mst(), kind: 'mst_hub' }], snk: sink(DP(), { modes: [vmode(3840, 2160, 60)] }), request: { mode: m, display_count: 2 }, env: { os_mst_support: V(true) } }));
  assert.equal(r.verdict, 'FAIL');
  assert.equal(r.limiting_segment, 'S1');
});
test('REM02-M26 timing labelled CVT/CTA counts as DERIVED even when its fields say VERIFIED (prerequisite names the timing)', () => {
  const t = { ...timing(3520, 1500), source: 'CVT-RBv2 table' };
  const r = ev(base({ snk: sink(DP()), request: { mode: { ...F.UW165(), timing: t } } }));
  assert.equal(r.verdict, 'CONDITIONAL');
  assert.ok(r.prerequisites.some((p) => /supports this timing/.test(p)), r.prerequisites.join('|'));
});
test('REM02-M28 quickSolve: a Thunderbolt 3 class (DERIVED) that the mode exceeds is UNKNOWN, not FAIL', () => {
  const r = E.quickSolve({ source: 'tb3', sinkInput: 'dp-hbr3', h_active: 3840, v_active: 2160, refresh_hz: 120, bit_depth_bpc: 8 });
  assert.equal(r.elements[0].verdict, 'UNKNOWN');
  assert.match(r.elements[0].why, /DERIVED per-stream class/);
});
test('REM02-M32 fits_tight label: required/payload above 0.95 is FITS_TIGHT, below is FITS_WITH_MARGIN', () => {
  assert.equal(E.assessLink(mode(3840, 2160, 120), 'DP-HBR3-x4', { pixel_clock_khz: D(1041667), source: 'UNKNOWN' }).assessment, 'FITS_TIGHT');
  assert.equal(E.assessLink(mode(3840, 2160, 60), 'DP-HBR3-x4', { pixel_clock_khz: D(594000), source: 'UNKNOWN' }).assessment, 'FITS_WITH_MARGIN');
});
test('REM02-M32 evaluate(): required/payload above 0.95 is labelled FITS_TIGHT (label only; verdict unchanged)', () => {
  const tight = ev(base({ snk: sink(DP()), request: { mode: { ...F.UW165(), timing: timing(4300, 1452) } } })); // 24.72 / 25.92 = 0.954
  assert.equal(tight.arithmetic.assessment, 'FITS_TIGHT');
  assert.equal(tight.verdict, 'CONDITIONAL');
  assert.equal(ev(base({ snk: sink(DP()), request: { mode: F.UW165_T() } })).arithmetic.assessment, 'FITS_WITH_MARGIN');
});
