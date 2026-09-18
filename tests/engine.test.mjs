import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const require = createRequire(import.meta.url);
const engine = require(path.join(root, 'engine.js'));
const { classifyOutcome, buildResult, OUTCOMES, normalizeIntents } = engine;

test('index.html has interactive intent chips (button + data-intent + aria-pressed)', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(html, /class="chips"/);
  assert.match(html, /<button type="button" class="chip" data-intent="video"/);
  assert.match(html, /data-intent="refresh"/);
  assert.match(html, /data-intent="charging"/);
  assert.match(html, /data-intent="data"/);
  assert.match(html, /data-intent="oneCable"/);
  assert.match(html, /data-intent="capture"/);
  assert.match(html, /aria-pressed="true"/);
  assert.match(html, /aria-pressed="false"/);
  assert.match(html, /MAKE IT WORK/);
  assert.match(html, /src="engine\.js"/);
  // non-interactive span chips must be gone
  assert.doesNotMatch(html, /<div class="chips"><span>/);
});

test('new sources and destinations present', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  for (const s of ['iPad (USB-C)', 'Steam Deck / handheld', 'Xbox Series X|S']) {
    assert.ok(html.includes(s), 'missing source ' + s);
  }
  assert.ok(html.includes('DisplayPort monitor'));
});

test('normalizeIntents defaults', () => {
  const i = normalizeIntents();
  assert.equal(i.video, true);
  assert.equal(i.refresh, true);
  assert.equal(i.charging, false);
  assert.equal(i.capture, false);
});

test('PS5 → HDMI play-only never CAPTURE', () => {
  const intents = { video: true, refresh: true, charging: false, data: false, oneCable: false, capture: false };
  const o = classifyOutcome('PlayStation 5', '4K / 120 Hz HDMI display', intents);
  assert.notEqual(o, OUTCOMES.CAPTURE);
  assert.ok([OUTCOMES.KEEP, OUTCOMES.DIRECT].includes(o), o);
});

test('Xbox → HDMI play-only never CAPTURE', () => {
  const o = classifyOutcome('Xbox Series X|S', '1440p / 165 Hz HDMI monitor', {
    video: true, refresh: true, charging: false, data: false, oneCable: false, capture: false
  });
  assert.notEqual(o, OUTCOMES.CAPTURE);
});

test('capture intent forces CAPTURE', () => {
  const o = classifyOutcome('PlayStation 5', '4K / 120 Hz HDMI display', {
    video: true, refresh: true, charging: false, data: false, oneCable: false, capture: true
  });
  assert.equal(o, OUTCOMES.CAPTURE);
  const r = buildResult('PlayStation 5', '4K / 120 Hz HDMI display', { capture: true, video: true });
  assert.equal(r.outcome, OUTCOMES.CAPTURE);
  assert.ok(r.path.toLowerCase().includes('capture'));
});

test('laptop → TB/USB-C monitor one-cable → DIRECT or KEEP', () => {
  const o = classifyOutcome('MacBook / USB-C laptop', '4K USB-C monitor', {
    video: true, refresh: true, charging: true, data: false, oneCable: true, capture: false
  });
  assert.ok([OUTCOMES.DIRECT, OUTCOMES.KEEP].includes(o), o);
});

test('phone → HDMI → ADAPTER', () => {
  const o = classifyOutcome('USB-C phone', '4K / 120 Hz HDMI display', {
    video: true, refresh: false, charging: false, data: false, oneCable: false, capture: false
  });
  assert.equal(o, OUTCOMES.ADAPTER);
});

test('laptop → dock destination → DOCK', () => {
  const o = classifyOutcome('Windows USB-C laptop', 'USB-C / Thunderbolt dock', {
    video: true, refresh: true, charging: true, data: true, oneCable: true, capture: false
  });
  assert.equal(o, OUTCOMES.DOCK);
});

test('laptop → PD charger → KEEP YOURS', () => {
  const o = classifyOutcome('MacBook / USB-C laptop', 'USB-C PD charger', {
    video: false, refresh: false, charging: true, data: false, oneCable: false, capture: false
  });
  assert.equal(o, OUTCOMES.KEEP);
});

test('buildResult always has outcome, path, spec, keepYours, guides≤2', () => {
  const r = buildResult('iPad (USB-C)', '4K / 120 Hz HDMI display', {
    video: true, refresh: true, charging: false, data: false, oneCable: false, capture: false
  });
  assert.ok(Object.values(OUTCOMES).includes(r.outcome));
  assert.ok(r.path.length > 10);
  assert.ok(r.spec.length > 20);
  assert.ok(typeof r.keepYours === 'string');
  assert.ok(r.guides.length <= 2);
});

test('Steam Deck → HDMI classifies without inventing capture', () => {
  const r = buildResult('Steam Deck / handheld', '4K / 120 Hz HDMI display', {
    video: true, refresh: true, charging: false, data: false, oneCable: false, capture: false
  });
  assert.notEqual(r.outcome, OUTCOMES.CAPTURE);
  assert.equal(r.outcome, OUTCOMES.ADAPTER);
});

test('selected intents influence copy (charging / oneCable / refresh / data)', () => {
  const base = buildResult('MacBook / USB-C laptop', '4K USB-C monitor', {
    video: true, refresh: false, charging: false, data: false, oneCable: false, capture: false
  });
  const charged = buildResult('MacBook / USB-C laptop', '4K USB-C monitor', {
    video: true, refresh: false, charging: true, data: false, oneCable: false, capture: false
  });
  assert.ok(/Power Delivery|USB PD|PD/i.test(charged.spec));
  const one = buildResult('MacBook / USB-C laptop', '4K USB-C monitor', {
    video: true, refresh: false, charging: false, data: false, oneCable: true, capture: false
  });
  assert.ok(/one-cable|skip a dock|Thunderbolt/i.test(one.spec + ' ' + one.keepYours));
  const refresh = buildResult('PlayStation 5', '4K / 120 Hz HDMI display', {
    video: true, refresh: true, charging: false, data: false, oneCable: false, capture: false
  });
  assert.ok(/Ultra High Speed|bandwidth|refresh/i.test(refresh.spec));
  const data = buildResult('Windows USB-C laptop', 'USB-C / Thunderbolt dock', {
    video: true, refresh: false, charging: false, data: true, oneCable: false, capture: false
  });
  assert.ok(/bandwidth|hub\/dock|Data intent/i.test(data.spec));
});

test('no awin / sca_ref affiliate patterns in repo HTML', () => {
  function walk(dir) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      if (ent.name === '.git' || ent.name === 'node_modules') continue;
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(p);
      else if (ent.name.endsWith('.html')) {
        const t = fs.readFileSync(p, 'utf8');
        assert.doesNotMatch(t, /awin/i, p);
        assert.doesNotMatch(t, /sca_ref/i, p);
        assert.doesNotMatch(t, /amazon\.com.*tag=/i, p);
      }
    }
  }
  walk(root);
});

test('sitemap has 21 locs and every loc file exists', () => {
  const xml = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  assert.equal(locs.length, 21, 'expected 21 locs, got ' + locs.length);
  for (const loc of locs) {
    const rel = loc.replace('https://elorum.github.io/ELORUMTECH/', '').replace(/\/$/, '');
    const file = rel === '' ? path.join(root, 'index.html') : path.join(root, rel);
    assert.ok(fs.existsSync(file), 'missing file for ' + loc + ' -> ' + file);
  }
});
