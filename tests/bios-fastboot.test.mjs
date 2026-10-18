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
const { diagnose, normalize, VERDICTS, GROUP, ALLOWED, FILE_IDENTITY, TESTED_CASE, LINKS } = bios;
const SP_B550I = 'https://drivers.softpedia.com/get/MOTHERBOARD/GIGABYTE/Gigabyte-B550I-AORUS-PRO-AX-rev-1-0-Fast-Boot-Utility-B20-0420-1-for-Windows-10-64-bit.shtml';
const GDC = 'https://www.gigabyte.com/Support/Consumer/Download';
const SP_LIST = 'https://drivers.softpedia.com/get/MOTHERBOARD/GIGABYTE';
const WV = 'Per its URL, the Softpedia page is for Windows 10 64-bit; the tested PC’s Windows version was not recorded.';
const GB_B550I = 'https://www.gigabyte.com/Motherboard/B550I-AORUS-PRO-AX-rev-10/support';

const SITE_ORIGIN = JSON.parse(fs.readFileSync(path.join(root, 'docs/site-origin.json'), 'utf8')).origin;
const PAGE_REL = 'guides/bios-fast-boot-troubleshooter.html';
const PAGE_URL = SITE_ORIGIN.replace(/\/$/, '') + '/' + PAGE_REL;
const SITE_HOST = new URL(SITE_ORIGIN).host.replace(/\./g, '\\.');
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

test('BF-17 page: owner-provided source — one exact-board Softpedia link, scoped, nofollow; no hosting, no internal status jargon (REM01 F6)', () => {
  assert.doesNotMatch(visible, /SOURCE_UNVERIFIED/);
  assert.doesNotMatch(visible, /OWNER_PROVIDED_SOURCE|Status:/);
  assert.match(visible, /The owner of the tested PC confirmed on 2026-10-18 that this Softpedia page has the same program version for her board\./);
  assert.doesNotMatch(page, /identified[^.]*Softpedia|Softpedia page the owner of the tested PC used|identified as the page used/);
  const spLinks = [...page.matchAll(/<a [^>]*href="(https:\/\/drivers\.softpedia\.com[^"]*)"[^>]*>/g)];
  for (const m of spLinks) {
    assert.equal(m[1], SP_B550I, 'unexpected softpedia url ' + m[1]);
    assert.match(m[0], /rel="nofollow noopener"/);
  }
  assert.ok(spLinks.some((m) => m[1] === SP_B550I));
  const box = page.match(/<p class="dlbox">(<a href="https:\/\/drivers\.softpedia\.com[\s\S]*?)<\/p>/)[1];
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
  assert.equal(LINKS.TESTED_BOARD.sourceStatus, 'OWNER_CONFIRMED');
  assert.doesNotMatch(visible, /OWNER_CONFIRMED/);
  assert.equal(LINKS.TESTED_BOARD.rel, 'nofollow noopener');
  assert.deepEqual(LINKS.ALL_BOARDS.map((l) => l.url), [GDC]);
  assert.ok(!page.includes('href="' + SP_LIST + '"'), 'generic Softpedia listing removed (B11)');
  assert.ok(LINKS.TESTED_BOARD.scope.includes('Windows version was not recorded'));
  assert.equal(LINKS.TESTED_BOARD_OFFICIAL.url, GB_B550I);
  for (const l of [LINKS.TESTED_BOARD, LINKS.TESTED_BOARD_OFFICIAL, ...LINKS.ALL_BOARDS]) {
    assert.ok(page.includes('href="' + l.url + '"'), 'page lacks ' + l.url);
    if (/softpedia/.test(l.url)) assert.equal(l.rel, 'nofollow noopener');
  }
});

test('BF-17d logic: only the exact tested-board branch shows the B550I link; unknown/other-board branches show all-boards link', () => {
  const t = diagnose({ ...TESTED, os: 'win10-64' });
  assert.deepEqual(t.links.map((l) => l.url), [GDC, GB_B550I, SP_B550I]);
  assert.match(t.steps[0], /owner of the tested PC confirmed on 2026-10-18/);
  const w11 = diagnose(TESTED);
  assert.ok(w11.cautions.some((c) => /Per its URL, the Softpedia page is for Windows 10 64-bit/.test(c)), 'win11 input gets the Win10-URL caution');
  assert.ok(!t.cautions.some((c) => /Per its URL/.test(c)));
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
    assert.match(m[1], new RegExp('^https://(' + SITE_HOST + '|support\\.microsoft\\.com|learn\\.microsoft\\.com|www\\.gigabyte\\.com|www\\.dell\\.com|drivers\\.softpedia\\.com)/'), 'unexpected external host ' + m[1]);
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

// ---- REM01 (REV FAIL 76/6242108067) ----
const pageNoStyle = page.replace(/<style[\s\S]*?<\/style>/g, ' ');
const jsSrc = fs.readFileSync(path.join(root, 'bios-fastboot.js'), 'utf8');
const sec = (re) => { const m = page.match(re); assert.ok(m, 'section missing ' + re); return m[1]; };

test('REM01-F1 unread Softpedia page: no "titled" / "Its title" / "we verified" wording anywhere (page incl. JSON-LD, logic strings)', () => {
  const allText = pageNoStyle + '\n' + jsSrc + '\n' + JSON.stringify(LINKS) + '\n' + allInputsText();
  assert.doesNotMatch(allText, /\b[Tt]itled\b/);
  assert.doesNotMatch(allText, /\bIts title\b/);
  assert.doesNotMatch(allText, /\b[Ww]e (have )?(verified|checked|confirmed) (the|that|this) (Softpedia )?(page|listing)\b|\b[Ww]e verified\b/);
  assert.doesNotMatch(allText, /file name and version match/);
  const box = sec(/<section class="dl" aria-labelledby="source-heading">([\s\S]*?)<\/section>/);
  assert.ok(box.includes('Its web address names the Gigabyte B550I AORUS PRO AX rev 1.0, Fast Boot Utility B20.0420.1 for Windows 10 64-bit'));
  assert.ok(box.includes('We could not open the page, so its title, version, file name and supported OS are not verified by us.'));
  assert.ok(box.includes('The tested archive’s file name matches the browser’s download record from Softpedia.'));
  assert.match(LINKS.TESTED_BOARD.label, /per its URL/);
  assert.match(LINKS.TESTED_BOARD.scope, /Per its URL/);
  assert.match(sec(/<h2 id="sources">Sources<\/h2>([\s\S]*?)<\/ul>/), /per its URL[\s\S]*could not open the page/);
  assert.match(diagnose({ ...TESTED, os: 'win10-64' }).steps[0], /We could not open the page, so its title, version, file name and supported OS are not verified by us\. Per its URL, that page is for Windows 10 64-bit\./);
});
function allInputsText() { let t = ''; for (const inp of allInputs()) { const r = diagnose(inp); t += [r.title, r.summary, r.badgeLabel || '', ...r.steps, ...r.cautions, ...r.links.map((l) => l.label + ' ' + (l.scope || ''))].join('\n'); } return t; }

test('REM01-F3 tested board + Windows 11: GIGABYTE page leads, Softpedia secondary, no "Compatible branch" badge', () => {
  for (const os of ['win11-64']) {
    for (const signature of ['not-checked', 'valid-gigabyte']) {
      const r = diagnose({ ...TESTED, os, signature });
      assert.equal(r.verdict, VERDICTS.TESTED_CONFIG);
      assert.deepEqual(r.links.map((l) => l.url), [GDC, GB_B550I, SP_B550I], 'Download Center, GIGABYTE B550I page, Softpedia reference');
      assert.equal(r.links.at(-1).url, SP_B550I, 'Softpedia must be last (secondary)');
      assert.ok(r.links.some((l) => l.url === GDC));
      assert.match(r.steps[0], /^Windows 11 on the tested board: start with GIGABYTE: search your exact motherboard and revision in the GIGABYTE Download Center \(first link below\)/);
      assert.match(r.steps[0], /check GIGABYTE's page for a Windows 11 version/);
      assert.doesNotMatch(r.steps[0] + r.cautions.join(' '), /B2[1-9]\.\d{4}\.\d/, 'no unverified Windows 11 version number');
      assert.ok(r.badgeLabel && r.badgeLabel !== 'Compatible branch');
      assert.equal(r.badgeTone, 'unknown');
      assert.doesNotMatch(r.title, /^Matches the tested board/);
    }
  }
  const w10 = diagnose({ ...TESTED, os: 'win10-64' });
  assert.equal(w10.links[0].url, GDC);
  assert.equal(w10.badgeLabel, null);
  assert.match(page, /r\.badgeLabel \|\| GROUP_LABEL\[r\.group\]/);
  assert.match(page, /'badge g-' \+ \(r\.badgeTone \|\| r\.group\)/);
  const box = sec(/<section class="dl" aria-labelledby="source-heading">([\s\S]*?)<\/section>/);
  const iGb = box.indexOf('On Windows 11:'); const iLink = box.indexOf('href="' + GB_B550I + '"');
  assert.ok(iGb >= 0 && iLink > iGb, 'static page: Windows 11 note links GIGABYTE B550I page');
  // exhaustive: any non-win10 tested-board result never leads with Softpedia
  for (const inp of allInputs()) { const r = diagnose(inp); if (r.verdict === VERDICTS.TESTED_CONFIG && inp.os !== 'win10-64') assert.notEqual(r.links[0].url, SP_B550I, JSON.stringify(inp)); }
});

test('REM01-F4 setup.exe hash/version/signature rows are labelled as static inspection, not a malware scan or SmartScreen evaluation', () => {
  const t = sec(/<h2 id="file-identity">[\s\S]*?<table><tbody>([\s\S]*?)<\/tbody><\/table>/);
  const LBL = 'From our static inspection of the owner’s archive (not a malware scan or Windows/SmartScreen evaluation).';
  for (const row of ['setup.exe SHA-256', 'Version info in setup.exe', 'Digital signature']) {
    const m = t.match(new RegExp('<th scope="row">' + row.replace(/\./g, '\\.') + '</th><td>([\\s\\S]*?)</td>'));
    assert.ok(m, row); assert.ok(m[1].includes(LBL), row + ' lacks static-inspection label');
  }
  assert.doesNotMatch(t, /signature checked offline/);
  assert.ok(fs.existsSync(path.join(root, 'tools/inspect-fastboot-archive.py')), 'reproducible inspection script for QA');
  const tool = fs.readFileSync(path.join(root, 'tools/inspect-fastboot-archive.py'), 'utf8');
  for (const v of [FILE_IDENTITY.archiveSha256, FILE_IDENTITY.setupExeSha256, FILE_IDENTITY.setupIssSha256, FILE_IDENTITY.fileVersion, String(FILE_IDENTITY.archiveBytes), String(FILE_IDENTITY.setupExeBytes)]) assert.ok(tool.includes(v), 'tool constant drift ' + v);
});

test('REM01-F5a garbage / missing inputs never give compatible, readyToRun or TESTED_CONFIG', () => {
  const base = { ...TESTED, signature: 'valid-gigabyte' };
  const junk = [null, undefined, '', ' ', 0, 1, true, false, NaN, '1.1', 'rev 1.0', 'REV 1.0', '1.0 ', ' 1.0', 'Rev. 1.0', ['1.0'], { value: '1.0' }, { toString() { return '1.0'; } }, 'B550I AORUS PRO AX', 'b550i-aorus-pro-ax ', 'GIGABYTE', 'Gigabyte', 'win11', 'Windows 11', 'WIN11-64', 'win10', 'valid', 'VALID-GIGABYTE'];
  let n = 0;
  for (const key of ['vendor', 'model', 'revision', 'os']) {
    for (const v of junk) {
      const r = diagnose({ ...base, [key]: v }); n++;
      assert.notEqual(r.group, 'compatible', key + '=' + String(v));
      assert.notEqual(r.verdict, VERDICTS.TESTED_CONFIG, key + '=' + String(v));
      assert.equal(r.readyToRun, false, key + '=' + String(v));
      assert.ok(!r.links.some((l) => l.url === SP_B550I), key + '=' + String(v));
      assert.equal(normalize({ [key]: v })[key], 'unknown', 'normalize ' + key + '=' + String(v));
    }
  }
  for (const v of junk) { assert.equal(diagnose({ ...base, signature: v }).readyToRun, false, 'signature=' + String(v)); assert.equal(normalize({ signature: v }).signature, 'not-checked'); }
  for (const v of junk) assert.equal(normalize({ symptom: v }).symptom, 'win-no-bios');
  const { os, ...noOs } = base;
  for (const inp of [noOs, null, undefined, '', 'win-no-bios', 42, [], {}, { ...base, os: undefined }]) {
    const r = diagnose(inp); n++;
    assert.notEqual(r.group, 'compatible', JSON.stringify(inp)); assert.equal(r.readyToRun, false); assert.notEqual(r.verdict, VERDICTS.TESTED_CONFIG);
  }
  assert.equal(diagnose(noOs).verdict, VERDICTS.UNKNOWN);
  assert.ok(n > 100);
});

test('REM01-F5b general safety list keeps SmartScreen/UAC/antivirus "stop" and the BitLocker recovery-key item; no bypass', () => {
  const list = sec(/<h2 id="safety">[^<]*<\/h2>\s*<ul>([\s\S]*?)<\/ul>/);
  const items = [...list.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => m[1]);
  assert.ok(items.some((i) => /Windows SmartScreen/.test(i) && /User Account Control/.test(i) && /antivirus/.test(i) && /\bstop\b/.test(i) && /Do not disable security or click past the warning/.test(i)), 'SmartScreen/UAC/AV stop item');
  assert.ok(items.some((i) => /BitLocker/.test(i) && /recovery key/.test(i)), 'BitLocker recovery-key item');
  assert.ok(items.some((i) => /Save your work/.test(i)));
  assert.doesNotMatch(list, /Run anyway|More info|turn off|disable (SmartScreen|UAC|User Account Control|Defender|antivirus)/i);
  assert.doesNotMatch(visible, /Run anyway/i);
});

test('REM01-F5c failed-methods framing sentence stays; no prevalence and no scan/safety claims on the page', () => {
  assert.ok(visible.includes('The methods that failed here are this user’s history, not proof they fail for everyone.'));
  const txt = pageNoStyle.replace(/<[^>]+>/g, ' ');
  assert.doesNotMatch(txt, /\b\d+\s*(out\s+)?of\s+(every\s+)?\d+\b/i);
  assert.doesNotMatch(txt, /\d\s*%|\bpercent\b/i);
  assert.doesNotMatch(txt, /\bmost\b|\bmajority\b|\busually\b|\btypically\b|\bmany (PCs|users|people|boards|cases)\b|\bcommon (suspect|cause)\b/i);
  assert.doesNotMatch(txt, /\bscanned\b|ClamAV|YARA|VirusTotal|virus-free|malware-free|\bis safe\b(?<!does not prove the file is safe)|\bverified safe\b|\bsafe to (run|use|install)\b/i);
});

test('REM01-F6 softened lead and failed-methods wording; plain-language source note', () => {
  assert.doesNotMatch(visible, /common suspect/);
  assert.doesNotMatch(visible, /They work on many PCs/);
  assert.match(visible, /one possible cause is the board’s firmware Fast Boot setting/);
  assert.match(visible, /Tested-case reference:/);
});

// ---- REM02 (REV FAIL round 2, 76/6242260091) ----
const OC = 'The owner of the tested PC confirmed on 2026-10-18 that this Softpedia page has the same program version for her board. We could not open the page, so its title, version, file name and supported OS are not verified by us.';
const SEARCH_LABEL = 'Search for your exact motherboard and revision (GIGABYTE Download Center)';

test('REM02-R1a page: first button CTA is the GIGABYTE Download Center search, before the tested-board section; Softpedia is a plain reference link', () => {
  const body = page.slice(page.indexOf('<main>'));
  const dlinks = [...body.matchAll(/<a class="dlink" href="([^"]+)"([^>]*)>([\s\S]*?)<\/a>/g)];
  assert.equal(dlinks.length, 1, 'exactly one button-styled CTA');
  assert.equal(dlinks[0][1], GDC);
  assert.match(dlinks[0][2], /rel="noopener"/);
  assert.ok(dlinks[0][3].startsWith(SEARCH_LABEL), 'CTA label');
  assert.match(dlinks[0][3], /<span class="ext" aria-hidden="true">↗<\/span><span class="sr-only"> \(external site\)<\/span>/);
  const iCta = body.indexOf('<a class="dlink" href="' + GDC + '"'); const iTested = body.indexOf('Download for the tested board only');
  assert.ok(iCta > 0 && iCta < iTested, 'search CTA precedes the tested-board section');
  const search = sec(/<section class="dl" aria-labelledby="search-heading">([\s\S]*?)<\/section>/);
  for (const re of [/Enter your model/, /revision printed on the board/, /Utility<\/em> → Fast Boot for your Windows version/]) assert.match(search, re);
  assert.doesNotMatch(search, /softpedia/i);
  const spAnchors = [...page.matchAll(/<a [^>]*href="https:\/\/drivers\.softpedia\.com[^"]*"[^>]*>/g)].map((m) => m[0]);
  assert.ok(spAnchors.length >= 1);
  for (const a of spAnchors) { assert.doesNotMatch(a, /class="[^"]*dlink/); assert.match(a, /rel="nofollow noopener"/); }
  const box = sec(/<p class="dlbox"><a href="https:\/\/drivers\.softpedia\.com[^"]*" rel="nofollow noopener">([\s\S]*?)<\/a>/);
  assert.ok(box.startsWith('Tested-case reference (B550I AORUS PRO AX rev 1.0 only): Softpedia page, B20.0420.1 per its URL'));
  // no Softpedia search/listing URL anywhere
  for (const m of (page + jsSrc).matchAll(/https:\/\/[a-z.]*softpedia\.com[^"'\s)<]*/g)) assert.equal(m[0], SP_B550I, 'only the owner-confirmed Softpedia URL is allowed: ' + m[0]);
});

test('REM02-R1b logic: Download Center search is links[0] for every input with links (exhaustive); Softpedia TESTED_CONFIG-only and last', () => {
  assert.ok(LINKS.ALL_BOARDS[0].label.startsWith('Search for your exact motherboard and revision (GIGABYTE Download Center)'));
  assert.equal(LINKS.ALL_BOARDS[0].url, GDC);
  let withLinks = 0, tested = 0;
  for (const inp of allInputs()) {
    const r = diagnose(inp);
    if (r.links.length) { withLinks++; assert.equal(r.links[0].url, GDC, JSON.stringify(inp)); }
    const iSp = r.links.findIndex((l) => l.url === SP_B550I);
    assert.equal(iSp >= 0, r.verdict === VERDICTS.TESTED_CONFIG, JSON.stringify(inp));
    if (iSp >= 0) { tested++; assert.equal(iSp, r.links.length - 1, 'Softpedia reference last'); assert.deepEqual(r.links.map((l) => l.url), [GDC, GB_B550I, SP_B550I]); }
    assert.ok(!r.links.some((l) => /softpedia/.test(l.url) && l.url !== SP_B550I));
  }
  assert.ok(withLinks > 0 && tested > 0);
  for (const v of [null, undefined, {}, { ...TESTED, revision: 'rev 1.0' }]) { const r = diagnose(v); if (r.links.length) assert.equal(r.links[0].url, GDC); }
});

test('REM02-R2 owner-confirmed source wording in download box, FAQ (visible = JSON-LD), TESTED_DOWNLOAD_STEP and Sources; sourceStatus OWNER_CONFIRMED', () => {
  const box = sec(/<section class="dl" aria-labelledby="source-heading">([\s\S]*?)<\/section>/);
  assert.ok(box.includes(OC));
  const faqVis = page.match(/<summary>Where should I download the Fast Boot utility\?<\/summary><p>([\s\S]*?)<\/p>/)[1];
  assert.ok(faqVis.includes(OC));
  const faq = [...page.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1])).find((b) => b['@type'] === 'FAQPage');
  const q = faq.mainEntity.find((e) => e.name === 'Where should I download the Fast Boot utility?');
  assert.equal(q.acceptedAnswer.text, faqVis);
  assert.ok(diagnose({ ...TESTED, os: 'win10-64' }).steps[0].includes(OC.replace(/’/g, "'")));
  for (const os of ['win10-64', 'win11-64']) { const st = diagnose({ ...TESTED, os }).steps[0]; assert.match(st, /tested-case reference/); assert.doesNotMatch(st, /\bidentified\b|came from the Softpedia page/); }
  assert.doesNotMatch(page.replace(/unidentified board/g, ''), /\bidentified\b/);
  assert.ok(sec(/<h2 id="sources">Sources<\/h2>([\s\S]*?)<\/ul>/).includes(OC));
  assert.equal(LINKS.TESTED_BOARD.sourceStatus, 'OWNER_CONFIRMED');
  assert.doesNotMatch(page + jsSrc, /identified as the page used|as the page the tested archive was downloaded from|identified the Softpedia page/);
});

test('REM02-R3 failed-methods sentence: sources cover only setup keys and the Windows UEFI Firmware Settings restart, not CMOS reset', () => {
  const t = sec(/<section class="testimony"[\s\S]*?<\/table>\s*<p>([\s\S]*?)<\/p>/);
  assert.ok(t.includes('Microsoft and Dell document the setup keys and the Windows restart to UEFI Firmware Settings as standard ways into firmware setup (see Sources).'));
  assert.doesNotMatch(t, /document them\b/);
  assert.doesNotMatch(t.slice(t.indexOf('Microsoft and Dell')), /CMOS/);
});

test('REM02-R4 inspection tool runs osslsigncode offline (-ignore-crl) and keeps its scope disclaimers', () => {
  const tool = fs.readFileSync(path.join(root, 'tools/inspect-fastboot-archive.py'), 'utf8');
  assert.match(tool, /\[tool, 'verify', '-ignore-crl', '-in', p\]/);
  assert.match(tool, /Not a malware scan or Windows\/SmartScreen evaluation/);
  assert.match(tool, /certificate chain: not evaluated/);
  assert.doesNotMatch(tool, /\bimport (urllib|requests|http|socket)\b|from (urllib|http|socket)/);
});
