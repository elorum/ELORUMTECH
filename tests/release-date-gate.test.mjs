import test from 'node:test';
import assert from 'node:assert/strict';
import {
  checkConsistency, checkRelease, isRealIsoDate, loadDeclaration, pageDeclaredDate, readRepoFile,
} from './release-date-gate.mjs';

const decl = loadDeclaration();

test('release-date gate: declared date is a real date, not a placeholder', () => {
  assert.equal(isRealIsoDate(decl.intendedReleaseDate), true);
  for (const p of decl.pages) {
    assert.equal(isRealIsoDate(pageDeclaredDate(decl, p)), true, p.file);
  }
  for (const bad of ['', 'YYYY-MM-DD', 'TBD', '0000-00-00', '2026-02-30', '2026-10-7', null, undefined]) {
    assert.equal(isRealIsoDate(bad), false, String(bad));
  }
});

test('release-date gate: dateModified, visible Updated and sitemap lastmod equal each page declared date', () => {
  assert.deepEqual(checkConsistency(decl, readRepoFile), []);
});

test('release-date gate: detects divergence in any of the three signals', () => {
  const other = '2026-10-20';
  const p = decl.pages.find((x) => x.visibleUpdated);
  const q = decl.pages.find((x) => !x.visibleUpdated) ?? p; // all pages may carry visible Updated (T3P2-QA-001)
  const pd = pageDeclaredDate(decl, p);
  const qd = pageDeclaredDate(decl, q);
  const swap = (target, from, to) => (rel) => {
    const body = readRepoFile(rel);
    return rel === target ? body.split(from).join(to) : body;
  };
  const jsonLd = swap(q.file, `"dateModified":"${qd}"`, `"dateModified":"${other}"`);
  assert.ok(checkConsistency(decl, jsonLd).some((m) => m.includes('dateModified')));
  const visible = swap(p.file, `Updated: ${pd}`, `Updated: ${other}`);
  assert.ok(checkConsistency(decl, visible).some((m) => m.includes('visible Updated')));
  const sitemap = (rel) => {
    const body = readRepoFile(rel);
    return rel === 'sitemap.xml'
      ? body.replace(`<loc>${q.url}</loc>\n    <lastmod>${qd}</lastmod>`, `<loc>${q.url}</loc>\n    <lastmod>${other}</lastmod>`)
      : body;
  };
  assert.notEqual(sitemap('sitemap.xml'), readRepoFile('sitemap.xml'));
  assert.ok(checkConsistency(decl, sitemap).some((m) => m.includes('sitemap.xml: lastmod')));
});

test('release-date gate: mismatched BIOS page date fails consistency', () => {
  const bios = decl.pages.find((x) => /bios-fast-boot/.test(x.file));
  assert.ok(bios, 'BIOS page declared');
  const d = pageDeclaredDate(decl, bios);
  const other = d === '2026-10-18' ? '2026-10-17' : '2026-10-20';
  const swap = (rel) => {
    const body = readRepoFile(rel);
    return rel === bios.file ? body.split(`"dateModified":"${d}"`).join(`"dateModified":"${other}"`) : body;
  };
  const problems = checkConsistency(decl, swap);
  assert.ok(problems.some((m) => m.includes(bios.file) && m.includes('dateModified')), JSON.stringify(problems));
});

test('release-date gate: unset or placeholder declared date fails', () => {
  for (const bad of [undefined, '', 'YYYY-MM-DD']) {
    assert.ok(checkConsistency({ ...decl, intendedReleaseDate: bad }, readRepoFile).some((m) => m.includes('placeholder')));
  }
});

test('release-date gate: release mode blocks until owner-confirmed and date = ship date', () => {
  const pending = { ...decl, status: 'TO_BE_CONFIRMED_BY_OWNER', confirmedBy: null };
  assert.ok(checkRelease(pending, decl.intendedReleaseDate).length > 0);
  const confirmed = { ...pending, status: 'CONFIRMED', confirmedBy: 'Nicki' };
  assert.deepEqual(checkRelease(confirmed, decl.intendedReleaseDate), []);
  assert.ok(checkRelease(confirmed, '2026-10-20').some((m) => m.includes('ship date')));
  assert.ok(checkRelease({ ...confirmed, confirmedBy: '' }, decl.intendedReleaseDate).some((m) => m.includes('confirmedBy')));
});

test('release-date gate: null page intendedReleaseDate fails (no top-level fallback) — QA F2', () => {
  const p = decl.pages[0];
  const withNull = {
    ...decl,
    pages: decl.pages.map((x) => x === p ? { ...x, intendedReleaseDate: null } : x),
  };
  // pageDeclaredDate must return null, not the top-level date
  assert.equal(pageDeclaredDate(withNull, withNull.pages.find((x) => x.file === p.file)), null);
  const problems = checkConsistency(withNull, readRepoFile);
  assert.ok(
    problems.some((m) => m.includes(p.file) && m.includes('intendedReleaseDate')),
    JSON.stringify(problems),
  );
});

test('release-date gate: per-page date after ship date fails release mode — QA F1', () => {
  const p = decl.pages[0];
  const future = '2099-01-01';
  const withFuture = {
    ...decl,
    status: 'CONFIRMED',
    confirmedBy: 'Nicki',
    pages: decl.pages.map((x) => x === p ? { ...x, intendedReleaseDate: future } : x),
  };
  const problems = checkRelease(withFuture, decl.intendedReleaseDate);
  assert.ok(
    problems.some((m) => m.includes(p.file) && m.includes('after ship date')),
    JSON.stringify(problems),
  );
  // equal-to-ship and earlier still OK
  assert.deepEqual(
    checkRelease({ ...decl, status: 'CONFIRMED', confirmedBy: 'Nicki' }, decl.intendedReleaseDate).filter((m) => m.includes('after ship date')),
    [],
  );
});
