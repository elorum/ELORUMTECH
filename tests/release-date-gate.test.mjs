import test from 'node:test';
import assert from 'node:assert/strict';
import {
  checkConsistency, checkRelease, isRealIsoDate, loadDeclaration, readRepoFile,
} from './release-date-gate.mjs';

const decl = loadDeclaration();

test('release-date gate: declared date is a real date, not a placeholder', () => {
  assert.equal(isRealIsoDate(decl.intendedReleaseDate), true);
  for (const bad of ['', 'YYYY-MM-DD', 'TBD', '0000-00-00', '2026-02-30', '2026-10-7', null, undefined]) {
    assert.equal(isRealIsoDate(bad), false, String(bad));
  }
});

test('release-date gate: dateModified, visible Updated and sitemap lastmod equal the declared date', () => {
  assert.deepEqual(checkConsistency(decl, readRepoFile), []);
});

test('release-date gate: detects divergence in any of the three signals', () => {
  const other = '2026-10-20';
  const p = decl.pages.find((x) => x.visibleUpdated);
  const q = decl.pages.find((x) => !x.visibleUpdated);
  const swap = (target, from, to) => (rel) => {
    const body = readRepoFile(rel);
    return rel === target ? body.split(from).join(to) : body;
  };
  const d = decl.intendedReleaseDate;
  const jsonLd = swap(q.file, `"dateModified":"${d}"`, `"dateModified":"${other}"`);
  assert.ok(checkConsistency(decl, jsonLd).some((m) => m.includes('dateModified')));
  const visible = swap(p.file, `Updated: ${d}`, `Updated: ${other}`);
  assert.ok(checkConsistency(decl, visible).some((m) => m.includes('visible Updated')));
  const sitemap = (rel) => {
    const body = readRepoFile(rel);
    return rel === 'sitemap.xml' ? body.replace(`<loc>${q.url}</loc>\n    <lastmod>${d}</lastmod>`, `<loc>${q.url}</loc>\n    <lastmod>${other}</lastmod>`) : body;
  };
  assert.notEqual(sitemap('sitemap.xml'), readRepoFile('sitemap.xml'));
  assert.ok(checkConsistency(decl, sitemap).some((m) => m.includes('sitemap.xml: lastmod')));
});

test('release-date gate: unset or placeholder declared date fails', () => {
  for (const bad of [undefined, '', 'YYYY-MM-DD']) {
    assert.ok(checkConsistency({ ...decl, intendedReleaseDate: bad }, readRepoFile).some((m) => m.includes('placeholder')));
  }
});

test('release-date gate: release mode blocks until owner-confirmed and date = ship date', () => {
  // A not-yet-owner-confirmed declaration must be blocked by release mode.
  const pending = { ...decl, status: 'TO_BE_CONFIRMED_BY_OWNER', confirmedBy: null };
  assert.ok(checkRelease(pending, decl.intendedReleaseDate).length > 0);
  const confirmed = { ...pending, status: 'CONFIRMED', confirmedBy: 'Nicki' };
  assert.deepEqual(checkRelease(confirmed, decl.intendedReleaseDate), []);
  assert.ok(checkRelease(confirmed, '2026-10-20').some((m) => m.includes('ship date')));
  assert.ok(checkRelease({ ...confirmed, confirmedBy: '' }, decl.intendedReleaseDate).some((m) => m.includes('confirmedBy')));
});
