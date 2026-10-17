import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const require = createRequire(import.meta.url);
const bios = require(path.join(root, 'bios-fastboot.js'));
const { diagnose, VERDICTS, GROUP, ALLOWED, FILE_IDENTITY, TESTED_CASE } = bios;

const PAGE_REL = 'guides/bios-fast-boot-troubleshooter.html';
const PAGE_URL = 'https://elorum.github.io/ELORUMTECH/' + PAGE_REL;
const page = fs.readFileSync(path.join(root, PAGE_REL), 'utf8');
const visible = page.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ');

const TESTED = { symptom: 'win-no-bios', vendor: 'gigabyte', model: 'b550i-aorus-pro-ax', revision: '1.0', os: 'win11-64' };
const OTHER_GB = { symptom: 'win-no-bios', vendor: 'gigabyte', model: 'other-gigabyte', revision: 'other', os: 'win10-64' };

// Every combination of allowed inputs (4,320) for exhaustive invariants.
function* allInputs() {
  const keys = Object.keys(ALLOWED);
  function* rec(i, acc) {
    if (i === keys.length) { yield { ...acc }; return; }
    for (const v of ALLOWED[keys[i]]) yield* rec(i + 1, { ...acc, [keys[i]]: v });
  }
  yield* rec(0, {});
}

test('BF-1 no POST never offers the utility, regardless of other answers', () => {
  const r = diagnose({ ...TESTED, symptom: 'no-post', signature: 'valid-gigabyte' });
  assert.equal(r.verdict, VERDICTS.NO_POST);
  assert.equal(r.group, 'different-problem');
  assert.equal(r.readyToRun, false);
  assert.ok(!r.steps.some((s) => /Fast Boot utility|Enter BIOS Setup Now/.test(s)));
});

test('BF-2 firmware starts but no Windows → NO_WINDOWS, utility not offered', () => {
  const r = diagnose({ ...TESTED, symptom: 'no-windows', signature: 'valid-gigabyte' });
  assert.equal(r.verdict, VERDICTS.NO_WINDOWS);
  assert.equal(r.readyToRun, false);
  assert.ok(!r.steps.some((s) => /Enter BIOS Setup Now/.test(s)));
});

test('BF-3 exact tested board rev 1.0 → TESTED_CONFIG with testimony wording and unknown versions', () => {
  const r = diagnose(TESTED);
  assert.equal(r.verdict, VERDICTS.TESTED_CONFIG);
  assert.equal(r.group, 'compatible');
  assert.match(r.summary, /testet på denne konfiguration/);
  assert.match(r.summary, /not a guarantee/);
  assert.match(r.summary, /not recorded/);
  assert.equal(TESTED_CASE.windowsVersion, null);
  assert.equal(TESTED_CASE.biosVersion, null);
});

test('BF-4 signature not checked → not ready to run; valid GIGA-BYTE signature → ready', () => {
  assert.equal(diagnose(TESTED).readyToRun, false);
  assert.match(diagnose(TESTED).steps.join(' '), /Not ready yet/);
  assert.equal(diagnose({ ...TESTED, signature: 'valid-gigabyte' }).readyToRun, true);
});

test('BF-5 invalid or other signer → STOP_SIGNATURE, never ready', () => {
  for (const base of [TESTED, { ...OTHER_GB, listing: 'listed' }]) {
    const r = diagnose({ ...base, signature: 'invalid-or-other' });
    assert.equal(r.verdict, VERDICTS.STOP_SIGNATURE);
    assert.equal(r.group, 'stop');
    assert.equal(r.readyToRun, false);
    assert.match(r.cautions.join(' '), /Do not disable security or bypass/);
  }
});

test('BF-6 other Gigabyte board: listed → LISTED (not tested), not listed → UNSUPPORTED, not checked → UNKNOWN', () => {
  const listed = diagnose({ ...OTHER_GB, listing: 'listed' });
  assert.equal(listed.verdict, VERDICTS.LISTED_BY_GIGABYTE);
  assert.match(listed.cautions.join(' '), /Not tested on your configuration/);
  assert.doesNotMatch(listed.summary, /testet på denne konfiguration/);
  assert.equal(diagnose({ ...OTHER_GB, listing: 'not-listed' }).verdict, VERDICTS.UNSUPPORTED);
  assert.equal(diagnose({ ...OTHER_GB, listing: 'not-checked' }).verdict, VERDICTS.UNKNOWN);
});

test('BF-7 same model but revision other/unknown is NOT the tested config', () => {
  assert.equal(diagnose({ ...TESTED, revision: 'unknown', listing: 'listed' }).verdict, VERDICTS.UNKNOWN);
  assert.equal(diagnose({ ...TESTED, revision: 'other' }).verdict, VERDICTS.UNKNOWN);
  assert.equal(diagnose({ ...TESTED, revision: 'other', listing: 'listed' }).verdict, VERDICTS.LISTED_BY_GIGABYTE);
});

test('BF-8 unknown model with "listed" claim stays UNKNOWN', () => {
  assert.equal(diagnose({ ...OTHER_GB, model: 'unknown', listing: 'listed' }).verdict, VERDICTS.UNKNOWN);
});

test('BF-9 non-Gigabyte → UNSUPPORTED; unknown vendor → UNKNOWN', () => {
  assert.equal(diagnose({ ...TESTED, vendor: 'other' }).verdict, VERDICTS.UNSUPPORTED);
  assert.equal(diagnose({ ...TESTED, vendor: 'unknown' }).verdict, VERDICTS.UNKNOWN);
});

test('BF-10 OS: other → UNSUPPORTED; unknown → UNKNOWN', () => {
  assert.equal(diagnose({ ...TESTED, os: 'other' }).verdict, VERDICTS.UNSUPPORTED);
  assert.equal(diagnose({ ...TESTED, os: 'unknown' }).verdict, VERDICTS.UNKNOWN);
});

test('BF-11 empty / garbage input falls back to cautious defaults (never compatible)', () => {
  assert.equal(diagnose().verdict, VERDICTS.UNKNOWN);
  assert.equal(diagnose({ vendor: 'GIGABYTE', model: 'B550I', revision: 1, os: 'win11', signature: 'yes' }).verdict, VERDICTS.UNKNOWN);
});

test('BF-12 exhaustive: any "unknown"/"not-checked" identity answer never yields a compatible group', () => {
  let n = 0;
  for (const inp of allInputs()) {
    n++;
    const r = diagnose(inp);
    assert.ok(Object.values(VERDICTS).includes(r.verdict));
    assert.equal(r.group, GROUP[r.verdict]);
    if (r.group === 'compatible') {
      assert.equal(inp.symptom, 'win-no-bios');
      assert.equal(inp.vendor, 'gigabyte');
      assert.ok(inp.os === 'win10-64' || inp.os === 'win11-64');
      assert.notEqual(inp.model, 'unknown');
      assert.notEqual(inp.revision, 'unknown');
      assert.notEqual(inp.signature, 'invalid-or-other');
      if (r.verdict === VERDICTS.LISTED_BY_GIGABYTE) assert.equal(inp.listing, 'listed');
      if (r.verdict === VERDICTS.TESTED_CONFIG) { assert.equal(inp.model, 'b550i-aorus-pro-ax'); assert.equal(inp.revision, '1.0'); }
    }
    if (r.readyToRun) { assert.equal(r.group, 'compatible'); assert.equal(inp.signature, 'valid-gigabyte'); }
    if (inp.symptom !== 'win-no-bios') assert.equal(r.group, 'different-problem');
  }
  assert.equal(n, 3 * 3 * 3 * 3 * 4 * 3 * 3);
});

test('BF-13 compatible steps: download-verify-scan before run; save work, recovery key, manual action only', () => {
  const steps = diagnose({ ...TESTED, signature: 'valid-gigabyte' }).steps;
  const idx = (re) => steps.findIndex((s) => re.test(s));
  assert.ok(idx(/Digital Signatures/) >= 0 && idx(/antivirus/) >= 0 && idx(/Save your work/) >= 0 && idx(/recovery key/) >= 0);
  assert.ok(idx(/Digital Signatures/) < idx(/Install and open the utility yourself/));
  assert.ok(idx(/antivirus/) < idx(/Install and open the utility yourself/));
  assert.match(steps.join(' '), /Nothing on this page runs, restarts or changes your PC/);
  assert.doesNotMatch(steps.join(' '), /disable (Secure Boot|SmartScreen|antivirus|Defender)/i);
});

test('BF-14 page: crawlable SEO basics (title, description, canonical, single H1, og)', () => {
  assert.match(page, /<title>[^<]*BIOS[^<]*Fast Boot[^<]*\| ELORUMTECH<\/title>/);
  assert.match(page, /<meta name="description" content="[^"]{80,}">/);
  assert.match(page, new RegExp('<link rel="canonical" href="' + PAGE_URL.replace(/\./g, '\\.') + '">'));
  assert.equal((page.match(/<h1[\s>]/g) || []).length, 1);
  assert.match(page, /og:image.*assets\/og-default\.png/);
  assert.match(page, /name="robots" content="index,follow/);
});

test('BF-15 page: FAQPage JSON-LD questions/answers equal the visible FAQ exactly', () => {
  const blocks = [...page.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
  const faq = blocks.find((b) => b['@type'] === 'FAQPage');
  assert.ok(faq);
  const unesc = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  const vis = [...page.matchAll(/<details><summary>([\s\S]*?)<\/summary><p>([\s\S]*?)<\/p><\/details>/g)].map((m) => [unesc(m[1]), unesc(m[2])]);
  assert.equal(vis.length, faq.mainEntity.length);
  faq.mainEntity.forEach((q, i) => { assert.equal(q.name, vis[i][0]); assert.equal(q.acceptedAnswer.text, vis[i][1]); });
  const bc = blocks.find((b) => b['@type'] === 'BreadcrumbList');
  assert.equal(bc.itemListElement.at(-1).item, PAGE_URL);
  assert.ok(!blocks.some((b) => /HowTo|Product|SoftwareApplication|Review|AggregateRating/.test(b['@type'])));
});

test('BF-16 page: required testimony wording, unknown versions and no universal claims', () => {
  assert.match(visible, /testet på denne konfiguration/);
  assert.match(visible, /User testimony/);
  assert.match(visible, /Windows version<\/th><td>Not recorded/);
  assert.match(visible, /BIOS version<\/th><td>Not recorded/);
  assert.match(visible, /not a universal fix/i);
  assert.doesNotMatch(visible, /guarantee(d|s)? to work|always works|works on all|100%|fixes every/i);
  assert.doesNotMatch(visible, /\bF\d{1,2}[a-z]?\b BIOS|BIOS (version )?F\d/);
  assert.doesNotMatch(visible, /Windows (10|11) (version )?\d{2}H\d/);
});

test('BF-17 page: SOURCE_UNVERIFIED gate — no Softpedia link, no download CTA, no executable/archive hosting', () => {
  assert.match(visible, /SOURCE_UNVERIFIED/);
  assert.doesNotMatch(page, /href="[^"]*softpedia[^"]*"/i);
  assert.doesNotMatch(page, /href="[^"]*\.(zip|exe)"/i);
  assert.doesNotMatch(page, /\bdownload=|>\s*Download (now|here|the utility)/i);
  const offenders = [];
  const walk = (d) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { if (f.name === '.git' || f.name === 'node_modules') continue; const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else if (/\.(zip|exe|iss|msi)$/i.test(f.name)) offenders.push(p); } };
  walk(root);
  assert.deepEqual(offenders, []);
});

test('BF-18 page: safety guidance present and no security bypass advice', () => {
  for (const re of [/Save your work/, /recovery key/, /Digital Signatures/, /GIGA-BYTE TECHNOLOGY CO\., LTD\./, /antivirus/, /Do not disable security or click past the warning/, /never flashes BIOS, resets CMOS, restarts your PC or runs installers/]) assert.match(visible, re);
  assert.doesNotMatch(visible, /(turn off|disable) (Secure Boot|SmartScreen|Defender|your antivirus)/i);
});

test('BF-19 page: distinguishes no-BIOS / no-POST / no-Windows and Fast Boot vs Fast Startup', () => {
  assert.match(visible, /Windows starts, but BIOS setup won’t open/);
  assert.match(visible, /No POST/);
  assert.match(visible, /Firmware starts, but Windows doesn’t/);
  assert.match(visible, /Firmware Fast Boot<\/strong> is a motherboard setting/);
  assert.match(visible, /Windows Fast Startup<\/strong> is a Windows shutdown mode/);
  assert.match(visible, /does not apply to Restart/);
});

test('BF-20 page: file identity on page matches the logic module constants', () => {
  assert.ok(visible.includes(FILE_IDENTITY.archiveSha256));
  assert.ok(visible.includes(FILE_IDENTITY.setupExeSha256));
  assert.ok(visible.includes('9,016,029 bytes'));
  assert.ok(visible.includes('9,669,472 bytes'));
  assert.ok(visible.includes(FILE_IDENTITY.fileVersion));
  assert.match(visible, /proves identity only/);
});

test('BF-21 page: accessible interactive tool (fieldset/legend radios, live region, noscript, script wired)', () => {
  const form = page.match(/<form id="bios-form"[\s\S]*?<\/form>/)[0];
  const fieldsets = form.match(/<fieldset/g) || [];
  assert.equal(fieldsets.length, Object.keys(ALLOWED).length);
  assert.equal((form.match(/<legend>/g) || []).length, fieldsets.length);
  for (const [name, values] of Object.entries(ALLOWED)) {
    for (const v of values) assert.match(form, new RegExp('<label class="opt"><input type="radio" name="' + name + '" value="' + v.replace('.', '\\.') + '"'));
    assert.equal((form.match(new RegExp('name="' + name + '" value="[^"]+" checked')) || []).length, 1, name + ' default');
  }
  assert.match(page, /id="result" role="status" aria-live="polite"/);
  assert.match(page, /<noscript>/);
  assert.match(page, /<script src="\.\.\/bios-fastboot\.js"><\/script>/);
  assert.match(page, /addEventListener\('change', render\)/);
  assert.match(page, /focus-visible/);
  assert.doesNotMatch(form, /tabindex="[1-9]/);
});

test('BF-22 default form state renders UNKNOWN (no pass by default)', () => {
  const form = page.match(/<form id="bios-form"[\s\S]*?<\/form>/)[0];
  const defaults = {};
  for (const m of form.matchAll(/name="([a-z]+)" value="([^"]+)" checked/g)) defaults[m[1]] = m[2];
  assert.equal(diagnose(defaults).verdict, VERDICTS.UNKNOWN);
});

test('BF-23 sitemap entry, guides hub link and internal links resolve', () => {
  const xml = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  assert.equal((xml.match(new RegExp('<loc>' + PAGE_URL.replace(/\./g, '\\.') + '</loc>', 'g')) || []).length, 1);
  const hub = fs.readFileSync(path.join(root, 'guides/index.html'), 'utf8');
  assert.match(hub, /href="bios-fast-boot-troubleshooter\.html"/);
  for (const m of page.matchAll(/href="([^"#]+)(#[^"]*)?"/g)) {
    const href = m[1];
    if (/^https?:/.test(href) || href.startsWith('/')) continue;
    let target = path.resolve(path.join(root, 'guides'), href);
    if (href.endsWith('/') || href === './' || href === '../') target = path.join(target, 'index.html');
    assert.ok(fs.existsSync(target), 'broken internal link ' + href);
  }
  for (const m of page.matchAll(/href="(https?:[^"]+)"/g)) {
    assert.match(m[1], /^https:\/\/(elorum\.github\.io|support\.microsoft\.com|learn\.microsoft\.com|www\.gigabyte\.com)\//, 'unexpected external host ' + m[1]);
  }
});
