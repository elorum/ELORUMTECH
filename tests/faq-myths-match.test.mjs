// ELORUMTECH-FAQ-MYTHS-20261018-01: FAQPage JSON-LD must match visible FAQ
// word-for-word on BIOS + Display Solver; BIOS myth section cites verified OEM/MS sources.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function text(s) {
  return s
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function visibleFaq(html) {
  return [...html.matchAll(/<details[^>]*>\s*<summary[^>]*>([\s\S]*?)<\/summary>\s*<p>([\s\S]*?)<\/p>/g)].map((m) => [
    text(m[1]),
    text(m[2]),
  ]);
}

function ldFaq(html) {
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    const j = JSON.parse(m[1]);
    if (j['@type'] === 'FAQPage') {
      return j.mainEntity.map((q) => [text(q.name), text(q.acceptedAnswer.text)]);
    }
  }
  return null;
}

const PAGES = [
  'guides/bios-fast-boot-troubleshooter.html',
  'guides/display-connection-solver.html',
];

for (const page of PAGES) {
  test(`${page}: FAQPage JSON-LD matches visible FAQ word for word`, () => {
    const html = read(page);
    const vis = visibleFaq(html);
    const ld = ldFaq(html);
    assert.ok(vis.length >= 3, `${page}: need visible FAQ`);
    assert.ok(ld, `${page}: missing FAQPage JSON-LD`);
    assert.deepEqual(ld, vis);
  });
}

test('BIOS common wrong advice cites Dell 000126121, ASUS 1008829/1044641, Microsoft shutdown', () => {
  const h = read('guides/bios-fast-boot-troubleshooter.html');
  assert.match(h, /Common wrong advice/);
  assert.match(h, /000126121/);
  assert.match(h, /1008829/);
  assert.match(h, /1044641/);
  assert.match(h, /windows-commands\/shutdown/);
  assert.match(h, /Fast Startup/);
  assert.match(h, /Fast Boot/);
  assert.match(h, /CMOS/i);
});
