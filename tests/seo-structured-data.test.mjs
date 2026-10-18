// SEO structured-data / crawl invariants (ELORUMTECH-SEO-EXECUTION-20261017-01).
// Static checks over every sitemap URL: canonical, JSON-LD validity, FAQPage markup == visible FAQ,
// visible "Updated" date == JSON-LD dateModified == sitemap lastmod, internal links resolve.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/site-origin.json'), 'utf8')).origin.replace(/\/$/, '') + '/';
// Pages whose FAQ/date lines overlap open PR #11 (or are rewritten by it). Re-check after PR #11 is resolved.
const DEFERRED = new Set(['index.html', 'compatibility/ps5-dell-u2725qe.html', 'guides/ps5-hdmi-2-1-cable-path.html',
  'guides/usb-c-laptop-to-4k-monitor.html', 'guides/usb-c-to-hdmi-adapter-path.html']);
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rarr: '→', larr: '←', mdash: '—', ndash: '–', hellip: '…',
  rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', times: '×', middot: '·', ge: '≥', le: '≤', asymp: '≈', ne: '≠', deg: '°', trade: '™', reg: '®', copy: '©' };
const dec = (s) => s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d)).replace(/&([a-z]+);/gi, (m, n) => ENT[n] ?? m);
const txt = (s) => dec(s.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();

const sitemap = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
const entries = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g)].map(([, loc, lastmod]) => {
  const rel = loc.slice(BASE.length);
  return { loc, lastmod, file: rel === '' ? 'index.html' : rel.endsWith('/') ? rel + 'index.html' : rel };
});
const ld = (h) => [...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]))
  .flatMap((j) => [].concat(j['@graph'] || j));

test('sitemap is non-empty, unique, and every loc maps to a file', () => {
  assert.ok(entries.length > 0);
  assert.equal(new Set(entries.map((e) => e.loc)).size, entries.length);
  for (const e of entries) assert.ok(fs.existsSync(path.join(ROOT, e.file)), e.loc);
});

for (const e of entries) {
  const html = fs.readFileSync(path.join(ROOT, e.file), 'utf8');
  test(`${e.file}: one self-canonical, indexable, valid JSON-LD`, () => {
    const canon = [...html.matchAll(/<link\s+rel="canonical"\s+href="([^"]+)"/gi)].map((m) => m[1]);
    assert.deepEqual(canon, [e.loc]);
    const og = html.match(/property="og:url"\s+content="([^"]+)"/i)?.[1];
    if (og) assert.equal(og, e.loc);
    assert.doesNotMatch(html.match(/<meta\s+name="robots"\s+content="([^"]*)"/i)?.[1] ?? '', /noindex/i);
    assert.doesNotThrow(() => ld(html));
  });
  test(`${e.file}: internal links resolve`, () => {
    for (const [, href] of html.matchAll(/<a\s[^>]*href="([^"]+)"/gi)) {
      if (/^(https?:|mailto:|#|javascript:)/.test(href) && !href.startsWith(BASE)) continue;
      if (href.includes("'")) continue; // inline-script string templates, not markup
      const clean = href.split('#')[0].split('?')[0];
      if (clean === '') continue;
      assert.ok(!clean.startsWith('/'), `${e.file}: root-absolute href ${href}`);
      let t = href.startsWith(BASE) ? clean.slice(BASE.length) : path.posix.normalize(path.posix.join(path.posix.dirname(e.file), clean));
      if (t === '.' || t === './' || t === '') t = 'index.html';
      else if (t.endsWith('/')) t += 'index.html';
      assert.ok(!t.startsWith('..') && fs.existsSync(path.join(ROOT, t)), `${e.file}: broken link ${href}`);
    }
  });
  if (DEFERRED.has(e.file)) continue;
  test(`${e.file}: FAQPage markup equals the visible FAQ`, () => {
    const faq = ld(html).filter((x) => x['@type'] === 'FAQPage').flatMap((x) => x.mainEntity);
    if (!faq.length) return;
    const sec = html.match(/<section class="faq"[\s\S]*?<\/section>/)?.[0] ?? '';
    const vis = [...sec.matchAll(/<details[^>]*>\s*<summary[^>]*>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/g)].map((m) => [txt(m[1]), txt(m[2])]);
    const marked = faq.map((q) => [txt(q.name), txt(q.acceptedAnswer.text)]);
    for (const pair of marked) assert.ok(vis.some((v) => v[0] === pair[0] && v[1] === pair[1]), `${e.file}: not visible: ${pair[0]}`);
  });
  test(`${e.file}: visible Updated date, dateModified and sitemap lastmod agree`, () => {
    const vis = html.match(/<p class="updated"[^>]*>Updated: (\d{4}-\d{2}-\d{2})<\/p>/)?.[1];
    const dm = [...new Set(ld(html).map((x) => x.dateModified).filter(Boolean))];
    if (dm.length) assert.deepEqual(dm, [e.lastmod]);
    if (vis) assert.equal(vis, e.lastmod);
  });
}
