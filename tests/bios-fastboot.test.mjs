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
const { diagnose, VERDICTS, GROUP, ALLOWED, FILE_IDENTITY, TESTED_CASE, LINKS } = bios;
const SP_B550I = 'https://drivers.softpedia.com/get/MOTHERBOARD/GIGABYTE/Gigabyte-B550I-AORUS-PRO-AX-rev-1-0-Fast-Boot-Utility-B20-0420-1-for-Windows-10-64-bit.shtml';
const GDC = 'https://www.gigabyte.com/Support/Consumer/Download';
const SP_LIST = 'https://drivers.softpedia.com/get/MOTHERBOARD/GIGABYTE';
const WV = 'The Softpedia listing is titled for Windows 10 64-bit; the tested PC’s Windows version was not recorded.';

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
  const T = 'Can’t Enter BIOS but Windows Starts? Fast Boot Troubleshooter';
  const D = 'Windows boots but Delete/F2 won’t open BIOS? Tell firmware Fast Boot from Windows Fast Startup and no-POST, then follow safe manual steps. One Gigabyte case.';
  assert.ok(page.includes('<title>' + T + '</title>'));
  assert.ok(page.includes('<meta property="og:title" content="' + T + '">'));
  assert.ok(page.includes('<meta name="description" content="' + D + '">'));
  assert.ok(page.includes('<meta property="og:description" content="' + D + '">'));
  assert.ok(T.length <= 65 && D.length <= 160);
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
  assert.ok(visible.includes('Windows version</th><td>' + WV + '</td>'));
  const faqDl = page.match(/<summary>Where should I download the Fast Boot utility\?<\/summary><p>([\s\S]*?)<\/p>/)[1];
  assert.ok(faqDl.includes(WV));
  assert.doesNotMatch(faqDl, /rev 1\.0 on Windows 10 64-bit/);
  assert.doesNotMatch(visible, /utility version and Windows edition as the tested case/);
  assert.match(visible, /BIOS version<\/th><td>Not recorded/);
  assert.match(visible, /not a universal fix/i);
  assert.doesNotMatch(visible, /guarantee(d|s)? to work|always works|works on all|100%|fixes every/i);
  assert.doesNotMatch(visible, /\bF\d{1,2}[a-z]?\b BIOS|BIOS (version )?F\d/);
  assert.doesNotMatch(visible, /Windows (10|11) (version )?\d{2}H\d/);
});

test('BF-17 page: OWNER_PROVIDED_SOURCE — one exact-board Softpedia link, scoped, nofollow; no hosting, no SOURCE_UNVERIFIED', () => {
  assert.doesNotMatch(visible, /SOURCE_UNVERIFIED/);
  assert.match(visible, /OWNER_PROVIDED_SOURCE/);
  const spLinks = [...page.matchAll(/<a [^>]*href="(https:\/\/drivers\.softpedia\.com[^"]*)"[^>]*>/g)];
  for (const m of spLinks) {
    assert.equal(m[1], SP_B550I, 'unexpected softpedia url ' + m[1]);
    assert.match(m[0], /rel="nofollow noopener"/);
  }
  assert.ok(spLinks.some((m) => m[1] === SP_B550I));
  const box = page.match(/<p class="dlbox">([\s\S]*?)<\/p>/)[1];
  assert.ok(box.includes('href="' + SP_B550I + '"'));
  assert.match(box, /class="ext" aria-hidden="true">↗/);
  assert.ok(box.includes('Only for: Gigabyte B550I AORUS PRO AX rev 1.0. ' + WV));
  assert.match(box, /testet på denne konfiguration/i);
  const section = page.match(/<section class="dl" aria-labelledby="source-heading">([\s\S]*?)<\/section>/)[1];
  for (const re of [/Digital Signatures/, /GIGA-BYTE TECHNOLOGY CO\., LTD\./, /antivirus/, /Stop on any warning/, /Do not disable security or click past the warning/, /do not claim[^.]*byte-for-byte/]) assert.match(section, re);
  assert.doesNotMatch(page, /href="[^"]*\.(zip|exe)"/i);
  assert.doesNotMatch(page, /\bdownload=/i);
  const offenders = [];
  const walk = (d) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { if (f.name === '.git' || f.name === 'node_modules') continue; const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else if (/\.(zip|exe|iss|msi)$/i.test(f.name)) offenders.push(p); } };
  walk(root);
  assert.deepEqual(offenders, []);
});

test('BF-17b page: all-boards section links GIGABYTE Download Center and warns against other boards\' files', () => {
  const section = page.match(/<section class="dl" aria-labelledby="allboards-heading">([\s\S]*?)<\/section>/)[1];
  assert.ok(section.includes('href="' + GDC + '"'));
  assert.match(section, /exact board and revision/);
  assert.match(section, /Don’t use another board’s file/);
  assert.match(section, /Utility/);
  assert.ok(!section.includes(SP_B550I), 'board-specific link must not be in the all-boards section');
});

test('BF-17c logic: LINKS constants match the page, owner-provided status, nofollow on third-party', () => {
  assert.equal(LINKS.TESTED_BOARD.url, SP_B550I);
  assert.equal(LINKS.TESTED_BOARD.sourceStatus, 'OWNER_PROVIDED_SOURCE');
  assert.equal(LINKS.TESTED_BOARD.rel, 'nofollow noopener');
  assert.deepEqual(LINKS.ALL_BOARDS.map((l) => l.url), [GDC]);
  assert.ok(!page.includes('href="' + SP_LIST + '"'), 'generic Softpedia listing removed (B11)');
  assert.ok(LINKS.TESTED_BOARD.scope.includes('Windows version was not recorded'));
  for (const l of [LINKS.TESTED_BOARD, ...LINKS.ALL_BOARDS]) {
    assert.ok(page.includes('href="' + l.url + '"'), 'page lacks ' + l.url);
    if (/softpedia/.test(l.url)) assert.equal(l.rel, 'nofollow noopener');
  }
});

test('BF-17d logic: only the exact tested-board branch shows the B550I link; unknown/other-board branches show all-boards link', () => {
  const t = diagnose(TESTED);
  assert.equal(t.links[0].url, SP_B550I);
  assert.ok(t.links.some((l) => l.url === GDC));
  assert.match(t.steps[0], /owner of the tested PC/);
  assert.ok(t.cautions.some((c) => /titled for Windows 10 64-bit/.test(c)), 'win11 input gets the Win10-title caution');
  assert.ok(!diagnose({ ...TESTED, os: 'win10-64' }).cautions.some((c) => /titled for Windows 10 64-bit/.test(c)));
  for (const inp of [{ ...OTHER_GB, listing: 'listed' }, { ...OTHER_GB, listing: 'not-checked' }, { ...TESTED, revision: 'other' }, { ...TESTED, revision: 'unknown' }, { ...TESTED, model: 'unknown' }, { ...TESTED, vendor: 'unknown' }, { ...TESTED, os: 'unknown' }, {}]) {
    const r = diagnose(inp);
    assert.ok(r.links.some((l) => l.url === GDC), 'all-boards link missing for ' + JSON.stringify(inp));
    assert.ok(!r.links.some((l) => l.url === SP_B550I), 'B550I link leaked for ' + JSON.stringify(inp));
    assert.match(r.steps.concat(r.cautions).join(' ') + ' ' + r.summary, /exact board|another board|other models or revisions|exact model|tested board's file|unidentified board/);
  }
  let n = 0;
  for (const inp of allInputs()) {
    const r = diagnose(inp);
    const hasB550I = r.links.some((l) => l.url === SP_B550I);
    assert.equal(hasB550I, r.verdict === VERDICTS.TESTED_CONFIG, JSON.stringify(inp));
    if (hasB550I) { n++; assert.equal(inp.model, 'b550i-aorus-pro-ax'); assert.equal(inp.revision, '1.0'); assert.equal(inp.vendor, 'gigabyte'); }
    if (r.group === 'different-problem') assert.equal(r.links.length, 0);
  }
  assert.ok(n > 0);
});

test('BF-17e default form state shows no B550I link (default stays Unknown)', () => {
  const form = page.match(/<form id="bios-form"[\s\S]*?<\/form>/)[0];
  const defaults = {};
  for (const m of form.matchAll(/name="([a-z]+)" value="([^"]+)" checked/g)) defaults[m[1]] = m[2];
  const r = diagnose(defaults);
  assert.equal(r.verdict, VERDICTS.UNKNOWN);
  assert.ok(!r.links.some((l) => l.url === SP_B550I));
  assert.match(page, /r\.links && r\.links\.length/);
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
    assert.match(m[1], /^https:\/\/(elorum\.github\.io|support\.microsoft\.com|learn\.microsoft\.com|www\.gigabyte\.com|www\.dell\.com|drivers\.softpedia\.com)\//, 'unexpected external host ' + m[1]);
  }
});

test('BF-24 page: UEFI Firmware Settings missing/restarts section cites Dell KB and Microsoft Learn (B14); Fast Startup wording matches source (B15)', () => {
  const i = page.indexOf('id="uefi-firmware-settings-missing"');
  assert.ok(i > 0);
  const sec = page.slice(i, page.indexOf('<section', i));
  for (const re of [/legacy boot mode/, /msinfo32/, /MBR partition style/, /GPT/, /Windows Recovery Environment is turned off or damaged/, /Restart rather than Shut down/, /Esc, Delete, F1, F2, F10, F11 and F12/, /neither source documents a specific cause/]) assert.match(sec, re);
  assert.ok(page.includes('href="https://www.dell.com/support/kbdoc/en-us/000126121"'));
  assert.ok(page.includes('href="https://learn.microsoft.com/en-us/windows-hardware/manufacture/desktop/boot-to-uefi-mode-or-legacy-bios-mode"'));
  assert.doesNotMatch(visible, /Microsoft does not recommend disabling Fast Startup/);
  assert.match(visible, /Fast Startup is enabled by default and that disabling it is not recommended/);
});
