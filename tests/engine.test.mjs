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
  for (const s of ['iPad (USB-C)', 'Steam Deck / handheld', 'Xbox Series X|S', 'Nintendo Switch 2']) {
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



test('TB one-cable guide for laptop→dock+oneCable', () => {
  const guides = engine.guideLinksFor('MacBook / USB-C laptop', 'USB-C / Thunderbolt dock', {
    video: true, refresh: true, charging: true, data: false, oneCable: true, capture: false
  });
  assert.ok(guides.some(g => g[0].includes('thunderbolt-dock-one-cable-4k-120.html')), JSON.stringify(guides));
});

test('default laptop→dock without oneCable still hub/laptop-dock', () => {
  const guides = engine.guideLinksFor('Windows USB-C laptop', 'USB-C / Thunderbolt dock', {
    video: true, refresh: true, charging: true, data: false, oneCable: false, capture: false
  });
  const hrefs = guides.map(g => g[0]);
  assert.ok(hrefs.some(h => h.includes('usb-c-hub-vs-dock.html')), hrefs.join(','));
  assert.ok(hrefs.some(h => h.includes('laptop-to-docking-station.html')), hrefs.join(','));
  assert.ok(!hrefs.some(h => h.includes('thunderbolt-dock-one-cable-4k-120.html')), 'TB should not replace default pair');
});

test('BN-1 laptop→dock+data surfaces dual-monitor guide', () => {
  const guides = engine.guideLinksFor('MacBook / USB-C laptop', 'USB-C / Thunderbolt dock', {
    video: true, refresh: true, charging: true, data: true, oneCable: false, capture: false
  });
  assert.ok(guides.some(g => g[0].includes('dual-monitor-dock-mst-vs-thunderbolt.html')), JSON.stringify(guides));
});

test('BN-1 laptop→dock+oneCable still prioritizes TB over dual-monitor', () => {
  const guides = engine.guideLinksFor('MacBook / USB-C laptop', 'USB-C / Thunderbolt dock', {
    video: true, refresh: true, charging: true, data: true, oneCable: true, capture: false
  });
  assert.equal(guides[0][0], 'guides/thunderbolt-dock-one-cable-4k-120.html');
  assert.ok(guides.some(g => g[0].includes('dual-monitor-dock-mst-vs-thunderbolt.html')), 'dual-monitor may fill slot 2');
});

test('capture intent returns capture guide not play-only primary', () => {
  const guides = engine.guideLinksFor('PlayStation 5', '4K / 120 Hz HDMI display', {
    video: true, refresh: true, charging: false, data: false, oneCable: false, capture: true
  });
  assert.equal(guides[0][0], 'guides/hdmi-capture-passthrough-path.html');
  assert.ok(!guides.some(g => g[0].includes('ps5-to-1440p-monitor.html')));
});

test('Xbox primary guide preference + neutral HDMI secondary label', () => {
  const guides = engine.guideLinksFor('Xbox Series X|S', '4K / 120 Hz HDMI display', {
    video: true, refresh: true, charging: false, data: false, oneCable: false, capture: false
  });
  assert.ok(guides[0][0].includes('xbox-series-display-compatibility.html'));
  if (guides[1]) {
    /* BC-1: AVR preferred 2nd for console×HDMI; must stay PS5-neutral */
    assert.match(guides[1][1], /Ultra High Speed HDMI|HDMI cable|AVR|passthrough/i);
    assert.doesNotMatch(guides[1][1], /^PS5/i);
  }
});

test('port capability warn appears for USB-C laptop paths in buildResult spec', () => {
  const r = buildResult('MacBook / USB-C laptop', '4K USB-C monitor', {
    video: true, refresh: true, charging: false, data: false, oneCable: false, capture: false
  });
  assert.match(r.spec, /Port capability warn|DP Alt Mode/i);
});

test('sitemap loc count updated and all files exist', () => {
  const xml = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  assert.equal(locs.length, 26, 'expected 26 locs, got ' + locs.length);
  for (const loc of locs) {
    const rel = loc.replace('https://elorum.github.io/ELORUMTECH/', '').replace(/\/$/, '');
    const file = rel === '' ? path.join(root, 'index.html')
      : rel === 'guides' ? path.join(root, 'guides', 'index.html')
      : path.join(root, rel);
    assert.ok(fs.existsSync(file), 'missing file for ' + loc + ' -> ' + file);
  }
});

test('new BUILD NOW pages exist', () => {
  for (const f of [
    'guides/hdmi-capture-passthrough-path.html',
    'guides/dual-monitor-dock-mst-vs-thunderbolt.html',
    'guides/nintendo-switch-2-display-path.html',
    'guides/console-hdmi-avr-passthrough-path.html',
    'guides/index.html',
    'assets/og-default.png'
  ]) {
    assert.ok(fs.existsSync(path.join(root, f)), f);
  }
});

test('og:image default present on homepage', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(html, /og:image.*assets\/og-default\.png/);
  assert.match(html, /twitter:image.*assets\/og-default\.png/);
});

test('index auto-solve helpers present (applyQueryPicks + replaceState)', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(html, /history\.replaceState/);
  assert.match(html, /matched\.src && matched\.dst/);
  assert.match(html, /optionExactMatch/);
});

test('DEF-B-001 DisplayPort guide Engine CTA includes src + dst + intents', () => {
  const html = fs.readFileSync(path.join(root, 'guides/displayport-monitor-connection-path.html'), 'utf8');
  const m = html.match(/href="\.\.\/\?([^"]+)"/);
  assert.ok(m, 'Engine CTA query href present');
  const q = m[1].replace(/&amp;/g, '&');
  assert.match(q, /src=MacBook%20%2F%20USB-C%20laptop/);
  assert.match(q, /dst=DisplayPort%20monitor/);
  assert.match(q, /intents=video,refresh/);
});

test('DEF-N-001 #portWarn element exists in homepage markup', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const markup = html.split(/function\s+solve/)[0];
  assert.match(markup, /id=["']portWarn["']/);
  assert.match(html, /getElementById\(['"]portWarn['"]\)/);
});

test('BN-2/3 Switch 2 × HDMI → KEEP/DIRECT + Switch guide', () => {
  const r = buildResult('Nintendo Switch 2', '4K / 120 Hz HDMI display', {
    video: true, refresh: true, charging: false, data: false, oneCable: false, capture: false
  });
  assert.ok([OUTCOMES.KEEP, OUTCOMES.DIRECT].includes(r.outcome), r.outcome);
  assert.ok(r.guides.some(g => g[0].includes('nintendo-switch-2-display-path.html')), JSON.stringify(r.guides));
  assert.match(r.spec + ' ' + r.keepYours, /dock|KEEP|Ultra High Speed/i);
  assert.doesNotMatch(r.spec, /Alt Mode success|direct Alt Mode/i);
});

test('BN-3 Switch 2 × USB-C monitor does not claim DIRECT Alt Mode', () => {
  const r = buildResult('Nintendo Switch 2', '4K USB-C monitor', {
    video: true, refresh: true, charging: false, data: false, oneCable: false, capture: false
  });
  assert.notEqual(r.outcome, OUTCOMES.DIRECT);
  assert.equal(r.outcome, OUTCOMES.ADAPTER);
  assert.match(r.spec, /dock|HDMI/i);
  assert.doesNotMatch(r.spec, /DisplayPort Alt Mode success|direct Alt Mode success/i);
  assert.ok(r.guides.some(g => g[0].includes('nintendo-switch-2-display-path.html')));
});

test('BN-3 Deck regression unchanged sample', () => {
  const r = buildResult('Steam Deck / handheld', '4K / 120 Hz HDMI display', {
    video: true, refresh: true, charging: false, data: false, oneCable: false, capture: false
  });
  assert.equal(r.outcome, OUTCOMES.ADAPTER);
  assert.ok(r.guides.some(g => g[0].includes('steam-deck-external-display.html')));
  assert.ok(!r.guides.some(g => g[0].includes('nintendo-switch-2')));
});

test('BN-3 capture early-return for Switch 2', () => {
  const guides = engine.guideLinksFor('Nintendo Switch 2', '4K / 120 Hz HDMI display', {
    video: true, refresh: true, charging: false, data: false, oneCable: false, capture: true
  });
  assert.equal(guides[0][0], 'guides/hdmi-capture-passthrough-path.html');
  const r = buildResult('Nintendo Switch 2', '4K USB-C monitor', { capture: true, video: true });
  assert.equal(r.outcome, OUTCOMES.CAPTURE);
});

test('BN-7 compat BreadcrumbList has no #verified', () => {
  for (const f of [
    'compatibility/macbook-air-m5-dell-u2725qe.html',
    'compatibility/ps5-dell-u2725qe.html'
  ]) {
    const html = fs.readFileSync(path.join(root, f), 'utf8');
    assert.doesNotMatch(html, /#verified/);
    assert.match(html, /ELORUMTECH\/guides\//);
    assert.match(html, /index,follow/);
  }
});

test('BN-2 Switch guide has Nintendo sources and no affiliate patterns', () => {
  const html = fs.readFileSync(path.join(root, 'guides/nintendo-switch-2-display-path.html'), 'utf8');
  assert.match(html, /tech-specs/i);
  assert.match(html, /68459|How to Connect a Nintendo Switch/i);
  assert.match(html, /KEEP|dock-required|official dock/i);
  assert.doesNotMatch(html, /amazon\.com|awin|sca_ref/i);
  assert.match(html, /src=Nintendo%20Switch%202/);
});

test('BN-6 AVR guide differentiated from capture', () => {
  const html = fs.readFileSync(path.join(root, 'guides/console-hdmi-avr-passthrough-path.html'), 'utf8');
  assert.match(html, /AVR|audio video receiver|feature passthrough/i);
  assert.match(html, /not.*capture|Not capture|not a capture/i);
  assert.doesNotMatch(html, /best AVR|amzn|tag=/i);
});

test('engine.js contains dual-monitor href (BN-1 orphan closed)', () => {
  const js = fs.readFileSync(path.join(root, 'engine.js'), 'utf8');
  assert.match(js, /dual-monitor-dock-mst-vs-thunderbolt\.html/);
  assert.match(js, /nintendo-switch-2-display-path\.html/);
  assert.match(js, /Nintendo Switch 2/);
});

test('BC-1 AVR guideLinksFor orphan closed for console×HDMI', () => {
  const cases = [
    ['PlayStation 5', '4K / 120 Hz HDMI display'],
    ['Xbox Series X|S', '1440p / 165 Hz HDMI monitor'],
    ['Nintendo Switch 2', '4K / 120 Hz HDMI display'],
  ];
  let hits = 0;
  for (const [src, dst] of cases) {
    const guides = engine.guideLinksFor(src, dst, {
      video: true, refresh: true, charging: false, data: false, oneCable: false, capture: false
    });
    if (guides.some(g => g[0].includes('console-hdmi-avr-passthrough-path.html'))) hits++;
  }
  assert.ok(hits >= 1, 'expected AVR in ≥1 console×HDMI case, hits=' + hits);
  assert.equal(hits, 3, 'AVR should wire for PS5, Xbox, Switch2 × HDMI');
});

test('BC-2 Switch2 never pairs laptop USB-C→4K guide', () => {
  const dests = [
    '4K USB-C monitor',
    'Portable USB-C display',
    'USB-C / Thunderbolt dock',
    '4K / 120 Hz HDMI display',
    'DisplayPort monitor',
  ];
  for (const dst of dests) {
    const guides = engine.guideLinksFor('Nintendo Switch 2', dst, {
      video: true, refresh: true, charging: false, data: false, oneCable: false, capture: false
    });
    assert.ok(!guides.some(g => g[0].includes('usb-c-laptop-to-4k-monitor.html')),
      'Switch2×' + dst + ' leaked laptop guide: ' + JSON.stringify(guides));
  }
});

test('BC-3 four siblings link to AVR guide', () => {
  for (const f of [
    'guides/ps5-hdmi-2-1-cable-path.html',
    'guides/xbox-series-display-compatibility.html',
    'guides/nintendo-switch-2-display-path.html',
    'guides/hdmi-capture-passthrough-path.html',
  ]) {
    const html = fs.readFileSync(path.join(root, f), 'utf8');
    assert.match(html, /console-hdmi-avr-passthrough-path\.html/, f);
  }
  const cap = fs.readFileSync(path.join(root, 'guides/hdmi-capture-passthrough-path.html'), 'utf8');
  assert.match(cap, /play-only|skip capture|contrast/i);
});

test('BC-4 iPad matrix cites Apple Support tiers', () => {
  const html = fs.readFileSync(path.join(root, 'guides/ipad-usbc-to-monitor-hdmi.html'), 'utf8');
  assert.match(html, /108894|support\.apple\.com\/en-us\/108894/);
  assert.match(html, /6K|5K|4K30|4K60/);
  assert.match(html, /Stage Manager/);
  assert.doesNotMatch(html, /amzn|tag=|best hub/i);
  assert.match(html, /src=iPad%20\(USB-C\)/);
});

test('BC-5 phone failure tree KEEP + OEM sources', () => {
  const html = fs.readFileSync(path.join(root, 'guides/usb-c-phone-to-monitor.html'), 'utf8');
  assert.match(html, /KEEP.*charg|charge cable for charging/i);
  assert.match(html, /NO PURCHASE|NO-PURCHASE/i);
  assert.match(html, /samsung\.com.*dex|DeX/i);
  assert.doesNotMatch(html, /amzn\.to|amazon\.com\/[^"']*tag=|sca_ref=/i);
  assert.doesNotMatch(html, /href=["'][^"']*(?:amzn|amazon\.com\/dp)/i);
  assert.match(html, /src=USB-C%20phone/);
});

test('BC-7 favicon present at repo root', () => {
  assert.ok(fs.existsSync(path.join(root, 'favicon.ico')), 'favicon.ico missing');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(html, /rel=["'](?:shortcut )?icon["']/i);
  assert.match(html, /index,follow/);
});

test('BC-6 charge-only diagnostic on methodology or ≥2 guides', () => {
  const meth = fs.readFileSync(path.join(root, 'methodology.html'), 'utf8');
  const phone = fs.readFileSync(path.join(root, 'guides/usb-c-phone-to-monitor.html'), 'utf8');
  const hdmi = fs.readFileSync(path.join(root, 'guides/usb-c-to-hdmi-adapter-path.html'), 'utf8');
  const hasMeth = /charge-only|charge only/i.test(meth) && /KEEP/i.test(meth);
  const hasPhone = /charge-only|KEEP the charge cable/i.test(phone);
  const hasHdmi = /charge-only/i.test(hdmi);
  assert.ok(hasMeth || (hasPhone && hasHdmi), 'need methodology section or ≥2 guide callouts');
  assert.ok(!fs.existsSync(path.join(root, 'guides/charge-only-cable-diagnostic.html')), 'no thin charge-only URL');
});


