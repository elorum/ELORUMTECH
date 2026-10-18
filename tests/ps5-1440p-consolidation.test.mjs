// T3 P1: guides/ps5-to-1440p-monitor.html keeps SEO fields, unique 1440p answer,
// and descriptive links to cable path, Dell exact-model, and Display Solver / console hub.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PAGE = 'guides/ps5-to-1440p-monitor.html';

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

test('ps5-1440p T3 P1: SEO fields unchanged shape', () => {
  const html = read(PAGE);
  assert.match(html, /<title>PS5 to 1440p Monitor: HDMI Refresh, VRR & Cable Path \| ELORUMTECH<\/title>/);
  assert.match(html, /<h1>PS5 to a 1440p monitor<\/h1>/);
  assert.match(html, /rel="canonical" href="https:\/\/elorumtech\.elorum\.world\/guides\/ps5-to-1440p-monitor\.html"/);
  assert.match(html, /name="description" content="Check what must match when connecting a PS5 to a 1440p monitor/);
  assert.doesNotMatch(html, /noindex/i);
  const faqs = [...html.matchAll(/"@type":"FAQPage"/g)];
  assert.equal(faqs.length, 1);
  assert.match(html, /Will any 1440p monitor work with a PS5\?/);
  assert.match(html, /Do I need HDMI 2\.1 for 1440p on PS5\?/);
});

test('ps5-1440p T3 P1: unique 1440p answer cites PlayStation 1440p setting', () => {
  const html = read(PAGE);
  const answer = html.match(/<div class="answer">([\s\S]*?)<\/div>/);
  assert.ok(answer, 'missing answer box');
  const a = answer[1];
  assert.match(a, /1440p/);
  assert.match(a, /Test 1440p Output|Resolution/);
  assert.match(a, /120/);
  assert.doesNotMatch(a, /verify the monitor's HDMI input capabilities, the target refresh rate, any VRR requirement and the cable path/);
  assert.match(html, /playstation\.com\/en-us\/support\/hardware\/ps5-4k-resolution-guide\//);
});

test('ps5-1440p T3 P1: descriptive links to cable, Dell, Display Solver console branch', () => {
  const html = read(PAGE);
  assert.match(html, /href="ps5-hdmi-2-1-cable-path\.html"[^>]*>[^<]*Ultra High Speed/);
  assert.match(html, /href="\.\.\/compatibility\/ps5-dell-u2725qe\.html"[^>]*>[^<]*4K 120Hz/);
  assert.match(html, /href="display-connection-solver\.html"/);
  assert.match(html, /href="console-handheld-display-hub\.html"/);
  for (const rel of [
    'guides/ps5-hdmi-2-1-cable-path.html',
    'compatibility/ps5-dell-u2725qe.html',
    'guides/display-connection-solver.html',
    'guides/console-handheld-display-hub.html',
  ]) {
    assert.ok(fs.existsSync(path.join(root, rel)), `missing ${rel}`);
  }
});
