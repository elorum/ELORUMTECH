import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
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

// Repo-relative path with POSIX separators, so the skip set matches on Windows too (CQ-TECH-02).
const posixRel = (from, to, p = path) => p.relative(from, to).split(p.sep).join('/');
const SKIP = new Set(['docs/site-origin.json', 'tests/site-origin.test.mjs']);
function staleOriginHits(base) {
  const hits = [];
  const walk = (dir) => {
    for (const name of fs.readdirSync(dir)) {
      if (name === 'node_modules' || name === '.git') continue;
      const p = path.join(dir, name);
      const st = fs.statSync(p);
      if (st.isDirectory()) walk(p);
      else if (/\.(html|xml|txt|md|json|mjs|js|css)$/.test(name)) {
        const rel = posixRel(base, p);
        if (SKIP.has(rel)) continue;
        const body = fs.readFileSync(p, 'utf8');
        if (body.includes(OLD)) hits.push(rel);
      }
    }
  };
  walk(base);
  return hits;
}

test('no tracked source still uses the previous github.io origin (except site-origin.json)', () => {
  const hits = staleOriginHits(root);
  assert.deepEqual(hits, [], 'stale github.io origin in: ' + hits.join(', '));
});

test('CQ-TECH-02 skip-set paths are separator-independent (Windows backslashes normalize to /)', () => {
  assert.equal(posixRel('C:\\repo', 'C:\\repo\\docs\\site-origin.json', path.win32), 'docs/site-origin.json');
  assert.equal(posixRel('C:\\repo', 'C:\\repo\\tests\\site-origin.test.mjs', path.win32), 'tests/site-origin.test.mjs');
  assert.ok(SKIP.has(posixRel('C:\\repo', 'C:\\repo\\docs\\site-origin.json', path.win32)));
  assert.equal(posixRel('/repo', '/repo/docs/site-origin.json', path.posix), 'docs/site-origin.json');
});

test('CQ-TECH-02 a retired origin in a runtime file is still detected; skipped files are not', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'elorumtech-origin-'));
  try {
    fs.mkdirSync(path.join(tmp, 'docs')); fs.mkdirSync(path.join(tmp, 'display'));
    fs.writeFileSync(path.join(tmp, 'docs', 'site-origin.json'), JSON.stringify({ previous: OLD }));
    fs.writeFileSync(path.join(tmp, 'display', 'runtime.js'), 'var u = "' + OLD + '/guides/";');
    fs.writeFileSync(path.join(tmp, 'clean.html'), '<a href="/guides/">ok</a>');
    assert.deepEqual(staleOriginHits(tmp), ['display/runtime.js']);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
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
