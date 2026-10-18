// CQ-TECH-01 regression (ELORUMTECH-CODEX-QA-20261018-01-REM01): the quick solver's "Calculated ceiling"
// must only ever use a finite, positive number. Parts without an estimate (cable, unknown ports) stay
// unavailable (null) and are never rendered as "undefined Hz", "NaN Hz" or "Infinity Hz".
// Checks both the engine object and the actual DOM text produced by display/solver-ui.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENGINE = fs.readFileSync(path.join(root, 'display/engine-display.js'), 'utf8');
const UI = fs.readFileSync(path.join(root, 'display/solver-ui.js'), 'utf8');
const BAD = /undefined|NaN|Infinity/;

function loadEngine() {
  const ctx = { window: {} };
  ctx.self = ctx.window;
  vm.createContext(ctx);
  vm.runInContext(ENGINE, ctx);
  return ctx.window.ElorumDisplay || ctx.ElorumDisplay;
}
const E = loadEngine();

// Minimal DOM: enough of document/element for solver-ui.js to render into #solver-result.
class Node {
  constructor(tag) { this.tag = tag; this.children = []; this.attrs = {}; this._text = null; this.listeners = {}; this.hidden = false; this.value = ''; this.checked = false; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  appendChild(c) { this.children.push(c); return c; }
  removeChild(c) { this.children = this.children.filter((x) => x !== c); return c; }
  get firstChild() { return this.children[0] || null; }
  set textContent(v) { this._text = String(v); this.children = []; }
  get textContent() { return (this._text || '') + this.children.map((c) => c.textContent).join(''); }
  addEventListener(t, f) { this.listeners[t] = f; }
  focus() {}
  querySelector() { return null; }
}
function renderSolver(values) {
  const byId = {};
  const mk = (id, value, extra) => { const n = new Node('x'); n.value = value; Object.assign(n, extra || {}); byId[id] = n; return n; };
  const defaults = { source: 'unknown', middle: 'none', sink: 'unknown', cable: 'unknown', res: '3440x1440', w: '2560', h: '1080', hz: '165', bpc: '8', chroma: 'RGB', displays: '1', os: 'windows', pclk: '' };
  const v = { ...defaults, ...values };
  for (const k of Object.keys(defaults)) mk(k, v[k]);
  mk('usb2mode', '', { checked: false }); mk('msg-limited', '', { checked: false }); mk('worked', '', { checked: false });
  mk('custom-res', ''); mk('solver-nojs', '');
  const out = mk('solver-result', '');
  const form = mk('solver-form', '');
  const symptom = { value: v.symptom || 'plan' };
  form.querySelector = (sel) => (sel.includes(':checked') ? symptom : null);
  const document = { getElementById: (id) => byId[id] || null, createElement: (t) => new Node(t), createTextNode: (t) => { const n = new Node('#text'); n.textContent = t; return n; } };
  const window = { ElorumDisplay: E };
  vm.runInNewContext(UI, { window, document, location: { search: '' }, URLSearchParams, isFinite, parseFloat, Math });
  form.listeners.submit({ preventDefault() {} });
  return out.textContent;
}

const BASE = { symptom: 'plan', h_active: 3440, v_active: 1440, refresh_hz: 165, bit_depth_bpc: 8, chroma: 'RGB', displays: 1 };

test('CQ-TECH-01a engine: default all-unknown chain has no ceiling (null) and stays UNKNOWN', () => {
  for (const cable of ['unknown', 'marketing', 'certified']) {
    const r = E.quickSolve({ ...BASE, source: 'unknown', middle: 'none', sinkInput: 'unknown', cable });
    assert.equal(r.verdict, 'UNKNOWN', cable);
    assert.equal(r.lowest_max_refresh, null, cable);
    for (const e of r.elements) assert.ok(e.max_refresh_upper_bound_hz === null || (Number.isFinite(e.max_refresh_upper_bound_hz) && e.max_refresh_upper_bound_hz > 0), e.element + ': ' + e.max_refresh_upper_bound_hz);
  }
});

test('CQ-TECH-01b engine: mixed known/unknown chain reports the finite known ceiling; verdict unchanged', () => {
  for (const cable of ['unknown', 'marketing', 'certified']) {
    const r = E.quickSolve({ ...BASE, source: 'hdmi-18', middle: 'none', sinkInput: 'unknown', cable });
    assert.ok(r.lowest_max_refresh, cable);
    assert.ok(Number.isFinite(r.lowest_max_refresh.hz) && r.lowest_max_refresh.hz > 0, String(r.lowest_max_refresh.hz));
    assert.equal(r.lowest_max_refresh.element, 'Computer output');
  }
  // HDMI 2.0 -> HDMI 2.0 at 3440x1440@165 8-bit: FAIL with the 121.1 Hz calculated ceiling (Codex live check).
  const both = E.quickSolve({ ...BASE, source: 'hdmi-18', middle: 'none', sinkInput: 'hdmi-18', cable: 'unknown' });
  assert.equal(both.verdict, 'FAIL');
  assert.equal(both.lowest_max_refresh.hz, 121.1);
});

test('CQ-TECH-01c engine: no element in any page option combination carries undefined/NaN/Infinity', () => {
  const srcs = ['unknown', 'hdmi-18', 'hdmi-21-label', 'hdmi-48', 'dp-hbr2', 'dp-hbr3', 'dp-uhbr10', 'dp-uhbr13.5', 'dp-uhbr20', 'usbc-dp12', 'usbc-dp14', 'tb3', 'tb4', 'usbc-unknown'];
  const mids = ['none', 'usbc-adapter', 'usbc-dock', 'displaylink-dock', 'tb-dock', 'mst-hub', 'passive-dp-hdmi', 'splitter'];
  const sinks = ['unknown', 'hdmi-18', 'hdmi-21-label', 'hdmi-48', 'dp-hbr2', 'dp-hbr3', 'dp-uhbr10', 'dp-uhbr13.5', 'dp-uhbr20', 'usbc-dp14'];
  for (const source of srcs) for (const middle of mids) for (const sinkInput of sinks) for (const cable of ['unknown', 'marketing', 'certified']) {
    const r = E.quickSolve({ ...BASE, source, middle, sinkInput, cable });
    const ok = (x) => x === null || (typeof x === 'number' && Number.isFinite(x) && x > 0);
    for (const e of r.elements) assert.ok(ok(e.max_refresh_upper_bound_hz), [source, middle, sinkInput, cable, e.element].join('/'));
    if (r.lowest_max_refresh) assert.ok(ok(r.lowest_max_refresh.hz), [source, middle, sinkInput, cable].join('/'));
  }
});

test('CQ-TECH-01d DOM: default page input (Not sure x3, 3440x1440@165, 8-bit RGB) renders UNKNOWN and no "undefined Hz"', () => {
  for (const cable of ['unknown', 'marketing', 'certified']) {
    const text = renderSolver({ cable });
    assert.match(text, /UNKNOWN — not ruled out/);
    assert.doesNotMatch(text, BAD, cable);
    assert.doesNotMatch(text, /Calculated ceiling/, cable);
  }
});

test('CQ-TECH-01e DOM: valid finite ceilings are still shown (mixed chain and HDMI 2.0 FAIL at 121.1 Hz)', () => {
  const mixed = renderSolver({ source: 'hdmi-18', cable: 'certified' });
  assert.match(mixed, /Calculated ceiling: the computer output can carry at most about \d+(\.\d)? Hz/);
  assert.doesNotMatch(mixed, BAD);
  const fail = renderSolver({ source: 'hdmi-18', sink: 'hdmi-18' });
  assert.match(fail, /FAIL — a documented limit rules this out/);
  assert.match(fail, /at most about 121\.1 Hz/);
  assert.doesNotMatch(fail, BAD);
});
