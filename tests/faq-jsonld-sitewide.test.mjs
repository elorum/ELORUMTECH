// ELORUMTECH-CLEANUP-20261023-01-REM01: site-wide FAQPage JSON-LD == visible FAQ.
// For every tracked .html page that has a visible FAQ container (class="faq") or FAQPage JSON-LD:
// the FAQPage mainEntity must equal the visible <details><summary> FAQ exactly — same count, same
// order, same question and answer text after whitespace/entity normalisation. Bidirectional, no
// DEFERRED skips (seo-structured-data only checks marked ⊆ visible).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rarr: '→', larr: '←', mdash: '—', ndash: '–', hellip: '…',
  rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', times: '×', middot: '·', ge: '≥', le: '≤', asymp: '≈', ne: '≠', deg: '°', trade: '™', reg: '®', copy: '©' };
const dec = (s) => s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d)).replace(/&([a-z]+);/gi, (m, n) => ENT[n] ?? m);
export const norm = (s) => dec(String(s).replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();

// Balanced extraction of every element whose class list contains "faq".
export function faqContainers(html) {
  const out = [];
  const open = /<(section|div|aside)\b[^>]*\bclass="(?:[^"]*\s)?faq(?:\s[^"]*)?"[^>]*>/gi;
  let m;
  while ((m = open.exec(html))) {
    const tag = m[1].toLowerCase();
    const re = new RegExp(`<(/?)${tag}\\b[^>]*>`, 'gi');
    re.lastIndex = m.index + m[0].length;
    let depth = 1, t, end = -1;
    while ((t = re.exec(html))) {
      depth += t[1] ? -1 : 1;
      if (depth === 0) { end = t.index; break; }
    }
    assert.ok(end > 0, `unclosed faq <${tag}>`);
    out.push(html.slice(m.index, end));
  }
  return out;
}

export function visibleFaq(html) {
  return faqContainers(html).flatMap((c) => [...c.matchAll(/<details\b[^>]*>\s*<summary\b[^>]*>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/gi)]
    .map((x) => [norm(x[1]), norm(x[2])]));
}

export function ldFaq(html) {
  const nodes = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map((m) => JSON.parse(m[1])).flatMap((j) => [].concat(j['@graph'] || j));
  const faqs = nodes.filter((x) => x['@type'] === 'FAQPage');
  if (!faqs.length) return null;
  return faqs.flatMap((f) => f.mainEntity).map((q) => [norm(q.name), norm(q.acceptedAnswer?.text ?? '')]);
}

export function checkPage(html, label = 'page') {
  const vis = visibleFaq(html);
  const ld = ldFaq(html);
  if (!vis.length && !ld) return false;
  assert.ok(vis.length > 0, `${label}: FAQPage JSON-LD present but no visible FAQ`);
  assert.ok(ld, `${label}: visible FAQ present but no FAQPage JSON-LD`);
  assert.deepEqual(ld, vis, `${label}: FAQPage JSON-LD != visible FAQ`);
  return true;
}

const files = execFileSync('git', ['ls-files', '*.html'], { cwd: ROOT, encoding: 'utf8' }).trim().split('\n').filter(Boolean);
let checked = 0;
for (const f of files) {
  const html = fs.readFileSync(path.join(ROOT, f), 'utf8');
  if (!visibleFaq(html).length && !ldFaq(html)) continue;
  checked++;
  test(`${f}: FAQPage JSON-LD equals visible FAQ (count, order, Q and A)`, () => checkPage(html, f));
}

test('site-wide FAQ check covers the known FAQ pages (incl. homepage div.faq)', () => {
  assert.ok(checked >= 30, `only ${checked} FAQ pages found`);
  assert.equal(visibleFaq(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')).length, 3);
  assert.equal(visibleFaq(fs.readFileSync(path.join(ROOT, 'guides/usb-c-phone-to-monitor.html'), 'utf8')).length, 5);
});

// Mutants: the checker must fail on a dropped entry and on an altered answer.
const PHONE = fs.readFileSync(path.join(ROOT, 'guides/usb-c-phone-to-monitor.html'), 'utf8');
const mutate = (fn) => PHONE.replace(/(<script type="application\/ld\+json">)(\{[^<]*"FAQPage"[^<]*\})(<\/script>)/, (_, a, j, c) => {
  const o = JSON.parse(j); fn(o); return a + JSON.stringify(o) + c;
});

test('mutant: dropping a JSON-LD FAQ entry is caught', () => {
  assert.ok(checkPage(PHONE, 'orig'));
  assert.throws(() => checkPage(mutate((o) => o.mainEntity.pop()), 'm1'));
  assert.throws(() => checkPage(mutate((o) => o.mainEntity.shift()), 'm1b'));
});
test('mutant: altering a JSON-LD answer is caught', () => {
  assert.throws(() => checkPage(mutate((o) => { o.mainEntity[4].acceptedAnswer.text += ' Extra.'; }), 'm2'));
  assert.throws(() => checkPage(mutate((o) => { o.mainEntity[0].acceptedAnswer.text = o.mainEntity[0].acceptedAnswer.text.replace('charge-only', 'charge only'); }), 'm2b'));
});
test('mutant: altered question, reordered entries, dropped visible item, removed FAQPage are caught', () => {
  assert.throws(() => checkPage(mutate((o) => { o.mainEntity[1].name = 'Changed?'; }), 'm3'));
  assert.throws(() => checkPage(mutate((o) => o.mainEntity.reverse()), 'm4'));
  assert.throws(() => checkPage(PHONE.replace(/<details><summary>What if my phone[\s\S]*?<\/details>/, ''), 'm5'));
  assert.throws(() => checkPage(PHONE.replace(/"@type": "FAQPage"/, '"@type": "WebPage"'), 'm6'));
  // whitespace-only difference is NOT a mismatch
  assert.ok(checkPage(mutate((o) => { o.mainEntity[0].acceptedAnswer.text = '  ' + o.mainEntity[0].acceptedAnswer.text.replace(/ /g, '\n  ') + ' '; }), 'ws'));
});
