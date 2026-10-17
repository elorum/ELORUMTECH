// Evidence, standards table and acceptance-matrix coverage for the display solver.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const E = require('../display/engine-display.js');
const STD = JSON.parse(read('display/standards.json'));

test('embedded standards equal display/standards.json (run display/build-engine.mjs)', () => {
  assert.deepEqual(JSON.parse(JSON.stringify(E.STANDARDS)), STD);
});

test('every source is primary-attributed, https, time-zoned and quoted', () => {
  const ids = new Set();
  for (const s of STD.sources) {
    assert.ok(!ids.has(s.id), 'duplicate ' + s.id); ids.add(s.id);
    assert.match(s.url, /^https:\/\//);
    assert.match(s.checked_at, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(Z|[+-]\d{2}:\d{2})$/, s.id);
    assert.ok(Array.isArray(s.quotes) && s.quotes.length > 0 && s.quotes.every((q) => q.length > 10), s.id);
    assert.ok(s.publisher && s.title && s.kind, s.id);
  }
  for (const l of STD.links) for (const f of ['raw_gbps', 'payload_gbps']) {
    const v = l[f];
    if (v.status === 'VERIFIED') { assert.ok(v.sources.length && v.sources.every((i) => ids.has(i)), `${l.id}.${f}`); assert.notEqual(v.value, null); }
    if (v.status === 'DERIVED') assert.ok(v.derived_from && v.derived_from.length, `${l.id}.${f} derived_from`);
  }
});

test('link table arithmetic: raw = rate × lanes; payload ≤ raw; 8b/10b payload = 0.8 × raw', () => {
  for (const l of STD.links) {
    const raw = l.raw_gbps.value, pay = l.payload_gbps.value;
    if (l.lane_rate_gbps != null && l.lanes != null && raw != null) assert.ok(Math.abs(l.lane_rate_gbps * l.lanes - raw) < 0.01, l.id);
    if (raw != null && pay != null) assert.ok(pay <= raw + 1e-9, l.id);
    if (l.encoding === '8b/10b' && raw != null && pay != null) assert.ok(Math.abs(pay - 0.8 * raw) < 0.01, l.id);
  }
});

test('schema copy parses and carries the REM-02 constraints', () => {
  const s = JSON.parse(read('display/schema/evidence.schema.json'));
  const str = JSON.stringify(s);
  assert.ok(str.includes('0.2.0-impl'));
  assert.ok(str.includes('path_payload_limiting_segment'));
  assert.ok(str.includes('explanations'));
});

test('acceptance matrix copy is byte-exact to REV-passed REM-01 (a6ca7e87…)', () => {
  const h = createHash('sha256').update(readFileSync(new URL('../display/spec/ACCEPTANCE-MATRIX.rem01.md', import.meta.url))).digest('hex');
  assert.ok(h.startsWith('a6ca7e87'), h);
});

test('every acceptance-matrix row id has a named engine test', () => {
  const ids = [...new Set([...read('display/spec/ACCEPTANCE-MATRIX.rem01.md').matchAll(/^\|\s*([A-Z]{2}-\d{2})/gm)].map((m) => m[1]))];
  assert.ok(ids.length >= 60, 'parsed ' + ids.length);
  const tests = read('tests/display-engine.test.mjs');
  const names = [...tests.matchAll(/test\(\s*'([A-Z]{2}-\d{2})[a-z]?\s/g)].map((m) => m[1]);
  const missing = ids.filter((i) => !names.includes(i));
  assert.deepEqual(missing, []);
});

test('quickSolve never returns PASS across the page option grid', () => {
  let n = 0;
  for (const symptom of ['plan', 'refresh', 'no-signal'])
    for (const src of Object.keys(E.PORT_CLASSES))
      for (const middle of E.MIDDLES)
        for (const sink of Object.keys(E.SINK_CLASSES))
          for (const hz of [60, 144, 240]) {
            const r = E.quickSolve({ symptom, source: src, middle, sinkInput: sink, h_active: 3440, v_active: 1440, refresh_hz: hz, bit_depth_bpc: 8, chroma: 'RGB', displays: 1 });
            assert.notEqual(r.verdict, 'PASS'); assert.ok(E.VERDICTS.includes(r.verdict)); n++;
          }
  assert.ok(n > 100);
});
