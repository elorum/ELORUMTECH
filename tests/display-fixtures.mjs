// Synthetic FIXTURE-* devices for the Display & Connection Solver acceptance tests.
// No fixture is a real device fact. RW-* rows use only Issue #10 text facts plus synthetic
// evidence records that stand in for the evidence the plan names (ACCEPTANCE-MATRIX criterion 2).
export const EV_MFR = { id: 'EV-FIXTURE-MFR', source_url: 'https://example.invalid/fixture/manufacturer-spec', source_title: 'FIXTURE manufacturer specification (synthetic)', source_kind: 'manufacturer_spec', relevant_evidence: 'FIXTURE: synthetic quoted row', checked_at: '2026-10-17T23:00:00+02:00', confidence: 'VERIFIED' };
export const EV_CERT = { id: 'EV-FIXTURE-CERT', source_url: 'https://example.invalid/fixture/certification', source_title: 'FIXTURE certification database entry (synthetic)', source_kind: 'certification_database', relevant_evidence: 'FIXTURE: synthetic certification listing', checked_at: '2026-10-17T23:00:00+02:00', confidence: 'VERIFIED' };
export const EV_RETAIL = { id: 'EV-FIXTURE-RETAIL', source_url: 'https://example.invalid/fixture/retailer-listing', source_title: 'FIXTURE retailer listing (synthetic)', source_kind: 'retailer_listing', relevant_evidence: 'FIXTURE: listing text', checked_at: '2026-10-17T23:00:00+02:00', confidence: 'MARKETING' };
export const EV_ISSUE10 = { id: 'EV-ISSUE10', source_url: 'https://github.com/elorum/ELORUMTECH/issues/10', source_title: 'ELORUMTECH Issue #10 (user report)', source_kind: 'other', relevant_evidence: 'DUTZO ultrawide 3440×1440, advertised 165Hz; GPU: NVIDIA RTX 3080 with DP 1.4a; a cable marketed "8K 60 Hz"', checked_at: '2026-10-17T23:58:00+02:00', confidence: 'MARKETING' };

export const V = (value, unit, ev = 'EV-FIXTURE-MFR') => ({ value, status: 'VERIFIED', evidence_ids: [ev], ...(unit ? { unit } : {}) });
export const D = (value, from = 'FIXTURE formula') => ({ value, status: 'DERIVED', derived_from: [from] });
export const U = () => ({ value: null, status: 'UNKNOWN' });
export const MK = (value, ev = 'EV-FIXTURE-RETAIL') => ({ value, status: 'MARKETING', evidence_ids: [ev] });

export const mode = (h, v, hz, bpc = 8, chroma = 'RGB', extra = {}) => ({ h_active: h, v_active: v, refresh_hz: hz, bit_depth_bpc: bpc, chroma, hdr: 'SDR', vrr: 'none', dsc_required: false, ...extra });
export const vmode = (h, v, hz, bpc = 8, chroma = 'RGB', extra = {}, ev = 'EV-FIXTURE-MFR') => ({ ...mode(h, v, hz, bpc, chroma, extra), status: 'VERIFIED', evidence_ids: [ev] });
export const timing = (ht, vt, st = 'VERIFIED', source = 'manufacturer_timing_table') => ({ h_total: st === 'VERIFIED' ? V(ht) : D(ht, 'CVT-RBv2 (FIXTURE, DERIVED)'), v_total: st === 'VERIFIED' ? V(vt) : D(vt, 'CVT-RBv2 (FIXTURE, DERIVED)'), pixel_clock_khz: U(), source: st === 'VERIFIED' ? source : 'CVT_RBv2' });

export const FULL = () => ({ hdr: V(true), max_bit_depth_bpc: V(10), chroma_formats: V(['RGB', 'YCbCr444', 'YCbCr422', 'YCbCr420']), vrr: V(true) });
export const link = (protocol, rate, lanes, o = {}) => ({
  protocol,
  version_label: o.version_label || U(),
  max_link_rate_per_lane: rate === null ? U() : (typeof rate === 'object' ? rate : V(rate, 'Gbit/s per lane')),
  lane_count: lanes === null ? U() : (typeof lanes === 'object' ? lanes : V(lanes)),
  encoding: U(), raw_bitrate: o.raw_bitrate || U(), usable_payload: o.usable_payload || U(),
  dsc: o.dsc || V(false),
  ...(o.frl_support ? { frl_support: o.frl_support } : {}),
  ...(o.dsc_documented_modes ? { dsc_documented_modes: o.dsc_documented_modes } : {})
});
export const ident = (model, owned = true, mfr = 'FIXTURE') => ({ manufacturer: V(mfr), model: model === null ? U() : V(model), revision: V('A'), user_owned: owned });
export const port = (id, connector, dir, lk, o = {}) => ({ port_id: id, physical_connector: connector, direction: dir, link: lk, features: o.features === undefined ? FULL() : o.features, ...(o.dpp ? { dual_mode_dp_plus_plus: o.dpp } : {}), ...(o.modes ? { verified_operating_modes: o.modes } : {}) });

export const DP = (rate = 8.1, lanes = 4, o) => link('DisplayPort', rate, lanes, o);
export const TMDS = (o) => link('HDMI_TMDS', 6, 3, o);
export const FRL = (o) => link('HDMI_FRL', 12, 4, o);

export function source(lk, o = {}) {
  return { device_id: 'FIXTURE-SRC', role: 'source', identity: o.identity || ident('FIXTURE-GPU-1'), ports: [port(o.port || 'DP 1', o.connector || 'DP', 'output', lk, o)], max_displays: o.max_displays || V(4) };
}
export function sink(lk, o = {}) {
  const ports = [port(o.port || 'DP IN', o.connector || 'DP', 'input', lk, { ...o, modes: o.modes || [] })];
  (o.extraPorts || []).forEach((p) => ports.push(p));
  return { device_id: 'FIXTURE-SINK', role: 'sink', identity: o.identity || ident('FIXTURE-MON-1'), ports };
}
export function cable(o = {}) {
  const c = {
    certification_program: 'cert' in o ? o.cert : V('VESA certified (FIXTURE)', undefined, 'EV-FIXTURE-CERT'),
    rated_link: 'rated' in o ? o.rated : V(8.1, 'Gbit/s per lane', 'EV-FIXTURE-CERT'),
    length_m: o.length_m || V(2), certified_length_m: o.certified_length_m || V(3),
    active_or_passive: o.aop || V('passive'), directional: o.directional || V(false)
  };
  if (o.marketing) c.marketing_claims = o.marketing.map((t) => ({ text: t, evidence_ids: [o.marketingEv || 'EV-FIXTURE-RETAIL'] }));
  return { device_id: 'FIXTURE-CABLE', role: 'cable', identity: o.identity || ident('FIXTURE-CABLE-1'), ports: [], cable: c };
}
export function mid(id, role, inLk, outLk, o = {}) {
  return { device_id: id, role, identity: o.identity || ident(id), ports: [port('IN', o.inConn || 'DP', 'input', inLk, o), port('OUT', o.outConn || 'DP', 'output', outLk, o)] };
}

// Assemble a document. mids: [{device, kind}]
export function doc({ src, cab = cable(), mids = [], snk, request, env, groups, sinkPort, cab2 }) {
  const devices = [src, ...(cab ? [cab] : []), ...mids.map((m) => m.device), ...(cab2 ? [cab2] : []), snk];
  const segments = [{ segment_id: 'S1', device_id: src.device_id, in_port_id: null, out_port_id: src.ports[0].port_id, kind: 'source_output' }];
  let n = 2;
  if (cab) segments.push({ segment_id: 'S' + n++, device_id: cab.device_id, in_port_id: null, out_port_id: null, kind: 'cable' });
  mids.forEach((m) => segments.push({ segment_id: 'S' + n++, device_id: m.device.device_id, in_port_id: 'IN', out_port_id: 'OUT', kind: m.kind }));
  if (cab2) segments.push({ segment_id: 'S' + n++, device_id: cab2.device_id, in_port_id: null, out_port_id: null, kind: 'cable' });
  segments.push({ segment_id: 'S' + n++, device_id: snk.device_id, in_port_id: sinkPort || snk.ports[0].port_id, out_port_id: null, kind: 'sink_input' });
  const d = {
    schema_version: '0.2.0-impl',
    evidence: [EV_MFR, EV_CERT, EV_RETAIL, EV_ISSUE10],
    devices,
    request: { display_count: 1, require_hdr: false, require_vrr: false, accept_dsc: true, accept_chroma_subsampling: false, ...request },
    path: { segments, ...(groups ? { shared_bandwidth_groups: groups } : {}) }
  };
  if (env) d.environment = env;
  return d;
}

// Common modes
export const UW165 = () => mode(3440, 1440, 165);                 // 19.62 Gbit/s active @ 8 bpc RGB
export const UW165_T = (st = 'VERIFIED') => ({ ...UW165(), timing: timing(3520, 1500, st) }); // 20.91 Gbit/s @ 8 bpc
export const K4_120 = () => mode(3840, 2160, 120);                // 23.89 Gbit/s active @ 8 bpc
export const K4_60 = () => mode(3840, 2160, 60);                  // 11.94 Gbit/s active @ 8 bpc
