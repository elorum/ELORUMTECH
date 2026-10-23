// INDEX-SIGNALS-01 REM01 (ELORUMTECH-INDEX-SIGNALS-20261023-01-REM01, QA-01 F1):
// homepage visible "Updated:" date == WebApplication JSON-LD dateModified == sitemap.xml lastmod == release-gate
// declaration, all 2026-10-18. Grounded in git: the last content change to index.html on main is #28 / #24
// (2026-10-18); #33 (2026-10-23) only added the shared theme <link>. Mutants for each check.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkConsistency, dateModifiedValues, visibleUpdatedValues, sitemapLastmod } from './release-date-gate.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const FILE = 'index.html';
const URL_ = 'https://elorumtech.elorum.world/';
const DATE = '2026-10-18';
const GATE = JSON.parse(read('docs/release-date-gate.json'));

function homeProblems(html, sitemap, gate) {
  const p = [];
  const lds = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
  const app = lds.filter((x) => x['@type'] === 'WebApplication');
  if (app.length !== 1) p.push(`WebApplication count ${app.length}`);
  else if (app[0].dateModified !== DATE) p.push(`WebApplication dateModified ${app[0].dateModified}`);
  const dm = dateModifiedValues(html);
  if (dm.length !== 1 || dm[0] !== DATE) p.push(`dateModified values ${JSON.stringify(dm)}`);
  if (lds.some((x) => x['@type'] === 'FAQPage' && 'dateModified' in x)) p.push('dateModified on FAQPage');
  const vis = visibleUpdatedValues(html);
  if (vis.length !== 1 || vis[0] !== DATE) p.push(`visible Updated ${JSON.stringify(vis)}`);
  if (html.indexOf('Updated: ') > html.indexOf('<h1>')) p.push('visible Updated not in hero above H1');
  const lm = sitemapLastmod(sitemap, URL_);
  if (lm.length !== 1 || lm[0] !== DATE) p.push(`sitemap lastmod ${JSON.stringify(lm)}`);
  const g = gate.pages.filter((x) => x.file === FILE);
  if (JSON.stringify(g) !== JSON.stringify([{ file: FILE, url: URL_, visibleUpdated: true, intendedReleaseDate: DATE }])) p.push('gate entry');
  // Equality across all three must also hold via the shared gate logic.
  p.push(...checkConsistency({ ...gate, pages: g }, (rel) => (rel === 'sitemap.xml' ? sitemap : html)));
  return p;
}

test('home-date: visible Updated == WebApplication dateModified == sitemap lastmod == gate (2026-10-18)', () => {
  assert.deepEqual(homeProblems(read(FILE), read('sitemap.xml'), GATE), []);
});

test('home-date-MUT: rejects drift in any of the four sources, duplicates and misplacement', () => {
  const h = read(FILE), sm = read('sitemap.xml');
  const reGate = (fn) => ({ ...GATE, pages: GATE.pages.map((x) => (x.file === FILE ? fn({ ...x }) : x)) });
  const muts = [
    [h.replace('Updated: 2026-10-18', 'Updated: 2026-09-19'), sm, GATE],
    [h.replace('Updated: 2026-10-18', 'Updated: 2026-10-23'), sm, GATE],
    [h.replace('"dateModified":"2026-10-18"', '"dateModified":"2026-10-23"'), sm, GATE],
    [h.replace(',"dateModified":"2026-10-18"', ''), sm, GATE],
    [h.replace('"@type":"FAQPage",', '"@type":"FAQPage","dateModified":"2026-10-18",'), sm, GATE],
    [h.replace('</main>', '<p>Updated: 2026-10-18</p></main>'), sm, GATE],
    [h.replace(/<p style="[^"]*">Updated: 2026-10-18<\/p>\n/, '').replace('</main>', '<p>Updated: 2026-10-18</p></main>'), sm, GATE],
    [h, sm.replace(`<loc>${URL_}</loc>\n    <lastmod>2026-10-18</lastmod>`, `<loc>${URL_}</loc>\n    <lastmod>2026-10-23</lastmod>`), GATE],
    [h, sm.replace(/<url>\s*<loc>https:\/\/elorumtech\.elorum\.world\/<\/loc>[\s\S]*?<\/url>\s*/, ''), GATE],
    [h, sm, reGate((x) => ({ ...x, intendedReleaseDate: '2026-10-23' }))],
    [h, sm, reGate((x) => ({ ...x, visibleUpdated: false }))],
    [h, sm, { ...GATE, pages: GATE.pages.filter((x) => x.file !== FILE) }],
  ];
  for (const [mh, msm, mg] of muts) {
    assert.ok((mh !== h) + (msm !== sm) + (mg !== GATE) === 1, 'each mutant changes exactly one source');
    assert.notDeepEqual(homeProblems(mh, msm, mg), []);
  }
});
