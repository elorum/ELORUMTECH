import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const originDoc = JSON.parse(fs.readFileSync(path.join(root, 'docs/site-origin.json'), 'utf8'));
const ORIGIN = originDoc.origin;
// Build the retired project-pages origin without embedding it as a searchable literal in this file's body checks.
const OLD = ['https://', 'elorum.github.io', '/', 'ELORUMTECH'].join('');

test('site-origin.json declares a https origin without a trailing slash', () => {
  assert.match(ORIGIN, /^https:\/\/[a-z0-9.-]+$/i);
  assert.equal(ORIGIN.endsWith('/'), false);
});

test('no tracked source still uses the previous github.io origin (except site-origin.json)', () => {
  const skip = new Set(['docs/site-origin.json', 'tests/site-origin.test.mjs']);
  const hits = [];
  const walk = (dir) => {
    for (const name of fs.readdirSync(dir)) {
      if (name === 'node_modules' || name === '.git') continue;
      const p = path.join(dir, name);
      const st = fs.statSync(p);
      if (st.isDirectory()) walk(p);
      else if (/\.(html|xml|txt|md|json|mjs|js|css)$/.test(name)) {
        const rel = path.relative(root, p);
        if (skip.has(rel)) continue;
        const body = fs.readFileSync(p, 'utf8');
        if (body.includes(OLD)) hits.push(rel);
      }
    }
  };
  walk(root);
  assert.deepEqual(hits, [], 'stale github.io origin in: ' + hits.join(', '));
});

test('no hard-coded project-pages base path remains in HTML', () => {
  const base = ['/', 'ELORUMTECH', '/'].join('');
  const hits = [];
  for (const rel of [
    ...fs.readdirSync(root).filter((n) => n.endsWith('.html')).map((n) => n),
    ...['guides', 'compatibility'].flatMap((d) =>
      fs.readdirSync(path.join(root, d)).filter((n) => n.endsWith('.html')).map((n) => path.join(d, n))
    ),
  ]) {
    const body = fs.readFileSync(path.join(root, rel), 'utf8');
    if (body.includes(base)) hits.push(rel);
  }
  assert.deepEqual(hits, [], 'stale project-pages base in: ' + hits.join(', '));
});

test('sitemap.xml locs all use the declared origin', () => {
  const xml = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  assert.ok(locs.length > 0);
  for (const loc of locs) assert.ok(loc.startsWith(ORIGIN + '/') || loc === ORIGIN + '/' || loc === ORIGIN, loc);
});

test('analytics script uses root-absolute /analytics.js', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(html, /src="\/analytics\.js"/);
  assert.doesNotMatch(html, /src="\/ELORUMTECH\/analytics\.js"/);
});
