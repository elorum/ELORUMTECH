// Assert the ELORUMTECH-INTERNAL-LINKS-20261018-01 mesh: homepage + key guides
// link to the Display Solver; Solver ↔ BIOS and Hub ↔ Solver exist and resolve.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function hrefs(html) {
  return [...html.matchAll(/\shref="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, '&'));
}

function resolvesFrom(pageRel, href) {
  const clean = href.split('#')[0].split('?')[0];
  if (!clean || /^(https?:|mailto:|javascript:)/i.test(clean)) return null;
  const baseDir = path.posix.dirname(pageRel.replace(/\\/g, '/'));
  let target;
  if (clean.startsWith('/')) {
    target = clean.slice(1) || 'index.html';
  } else {
    target = path.posix.normalize(path.posix.join(baseDir, clean));
  }
  if (target.endsWith('/')) target += 'index.html';
  if (target === '.' || target === '') target = 'index.html';
  return target;
}

const MESH = [
  {
    page: 'index.html',
    mustInclude: ['guides/display-connection-solver.html'],
  },
  {
    page: 'guides/usb-c-laptop-to-4k-monitor.html',
    mustInclude: ['display-connection-solver.html'],
  },
  {
    page: 'guides/usb-c-to-hdmi-adapter-path.html',
    mustInclude: ['display-connection-solver.html'],
  },
  {
    page: 'guides/displayport-monitor-connection-path.html',
    mustInclude: ['display-connection-solver.html'],
  },
  {
    page: 'guides/display-connection-solver.html',
    mustInclude: ['bios-fast-boot-troubleshooter.html', 'console-handheld-display-hub.html'],
  },
  {
    page: 'guides/bios-fast-boot-troubleshooter.html',
    mustInclude: ['display-connection-solver.html'],
  },
  {
    page: 'guides/console-handheld-display-hub.html',
    mustInclude: ['display-connection-solver.html'],
  },
];

test('internal-link mesh: required tool links exist and point at real files', () => {
  for (const { page, mustInclude } of MESH) {
    const html = read(page);
    const found = hrefs(html);
    for (const needle of mustInclude) {
      const hit = found.find((h) => h.split('#')[0].split('?')[0] === needle || h.includes(needle));
      assert.ok(hit, `${page} missing href to ${needle}`);
      const target = resolvesFrom(page, hit);
      assert.ok(target, `${page}: could not resolve ${hit}`);
      assert.ok(fs.existsSync(path.join(root, target)), `${page}: ${hit} -> ${target} missing`);
    }
  }
});

test('internal-link mesh: Solver guides CTA mentions no picture until Windows loads → BIOS', () => {
  const h = read('guides/display-connection-solver.html');
  assert.match(h, /bios-fast-boot-troubleshooter\.html/);
  assert.match(h, /no picture until Windows loads/i);
});
