// Author-run browser evidence for PR #33. Usage:
//   node run-browser-evidence.mjs <headBaseUrl> <mainBaseUrl> <siteRootDir> <outDir>
// Requires playwright-core and a Chromium/Chrome at $CHROME (default /usr/bin/google-chrome).
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
const [HEAD, MAIN, ROOT, OUT] = process.argv.slice(2);
const CHROME = process.env.CHROME || '/usr/bin/google-chrome';
const KEY = ['index.html', 'guides/ps5-to-1440p-monitor.html', 'compatibility/ps5-dell-u2725qe.html', 'guides/display-connection-solver.html', 'guides/thunderbolt-dock-one-cable-4k-120.html'];
const MAIN_SHA = process.env.MAIN_SHA || 'main';
const walk = (d, o = []) => { for (const n of fs.readdirSync(d)) { if (['.git', 'node_modules', 'qa-evidence'].includes(n)) continue; const p = path.join(d, n); if (fs.statSync(p).isDirectory()) walk(p, o); else if (n.endsWith('.html') && !n.startsWith('google')) o.push(path.relative(d === ROOT ? ROOT : ROOT, p)); } return o; };
const pages = walk(ROOT).sort();
fs.mkdirSync(path.join(OUT, 'screens'), { recursive: true });
const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
const urlFor = (base, rel) => base + '/' + rel.replace(/index\.html$/, '');

const AUDIT = () => {
  const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return [0, 0, 0, 0]; const v = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return [v[0], v[1], v[2], v[3] ?? 1]; };
  const lum = ([r, g, b]) => { const f = (x) => { x /= 255; return x <= .03928 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4; }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
  const blend = (top, bot) => { const a = top[3]; return [top[0] * a + bot[0] * (1 - a), top[1] * a + bot[1] * (1 - a), top[2] * a + bot[2] * (1 - a), 1]; };
  const effBg = (el) => { const stack = []; for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c[3] > 0) stack.push(c); if (c[3] >= 1) break; } let bg = [255, 255, 255, 1]; for (let i = stack.length - 1; i >= 0; i--) bg = blend(stack[i], bg); return bg; };
  const out = [];
  for (const el of document.querySelectorAll('body *')) {
    if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'OPTION', 'OPTGROUP'].includes(el.tagName)) continue;
    const own = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim()).map((n) => n.textContent.trim()).join(' ');
    const isCtl = ['SELECT', 'INPUT', 'BUTTON', 'TEXTAREA'].includes(el.tagName);
    if (!own && !isCtl) continue;
    const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
    if (cs.visibility === 'hidden' || cs.display === 'none' || r.width === 0 || r.height === 0 || +cs.opacity === 0) continue;
    if (el.closest('.sr-only') || (r.width <= 1 && r.height <= 1)) continue;
    if (r.right < 0 || r.left > innerWidth + 1) continue; // off-screen (e.g. skip link until focused)
    const bg = effBg(el); const fg = blend(parse(cs.color), bg);
    const L1 = lum(fg), L2 = lum(bg); const ratio = (Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05);
    const px = parseFloat(cs.fontSize), w = +cs.fontWeight || 400; const large = px >= 24 || (px >= 18.66 && w >= 700);
    const min = large ? 3 : 4.5;
    out.push({ tag: el.tagName.toLowerCase(), cls: el.className && String(el.className).slice(0, 40), text: (own || el.value || '').slice(0, 60), fg: cs.color, bg: `rgb(${bg.slice(0, 3).map(Math.round).join(',')})`, fontPx: px, weight: w, large, ratio: +ratio.toFixed(2), min, pass: ratio >= min });
  }
  return out;
};

const result = { generated: new Date().toISOString(), chrome: browser.version(), head: HEAD, pages: {}, totals: {}, interactions: {} };
let failCount = 0, consoleErr = 0, overflowCount = 0, focusMissing = 0, motionOn = 0, checked = 0;
for (const rel of (process.env.QUICK ? [] : pages)) {
  const rec = {};
  for (const [w, h] of [[1280, 800], [375, 812]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const page = await ctx.newPage(); const errs = [];
    page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
    page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
    await page.goto(urlFor(HEAD, rel), { waitUntil: 'load' }); await page.waitForTimeout(300);
    const tag = `${rel.replace(/[\/.]/g, '_')}-${w}`;
    if (w === 1280 || KEY.includes(rel)) await page.screenshot({ path: path.join(OUT, 'screens', tag + '.png'), fullPage: true });
    const audit = await page.evaluate(AUDIT);
    const fails = audit.filter((a) => !a.pass);
    const overflow = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
    const r = { consoleErrors: errs, contrastChecked: audit.length, contrastFailures: fails, minRatio: Math.min(...audit.map((a) => a.ratio)), overflow, horizontalOverflow: overflow.scrollWidth > overflow.clientWidth };
    checked += audit.length; failCount += fails.length; consoleErr += errs.length; if (w === 375 && r.horizontalOverflow) overflowCount++;
    if (w === 1280) {
      const focus = [];
      for (let i = 0; i < 25; i++) {
        await page.keyboard.press('Tab');
        const f = await page.evaluate(() => { const e = document.activeElement; if (!e || e === document.body) return null; const cs = getComputedStyle(e); return { tag: e.tagName.toLowerCase(), type: e.type || null, text: (e.innerText || e.value || e.getAttribute('aria-label') || '').trim().slice(0, 40), focusVisible: e.matches(':focus-visible'), outlineStyle: cs.outlineStyle, outlineWidth: cs.outlineWidth, outlineColor: cs.outlineColor, outlineOffset: cs.outlineOffset, boxShadow: cs.boxShadow }; });
        if (!f) continue; f.visible = f.outlineStyle !== 'none' && parseFloat(f.outlineWidth) > 0 || f.boxShadow !== 'none'; if (!f.visible) focusMissing++; focus.push(f);
      }
      r.focus = focus;
      r.focusTagsCovered = [...new Set(focus.map((f) => f.tag))];
    }
    rec[w] = r; await ctx.close();
  }
  // reduced motion
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage(); await page.goto(urlFor(HEAD, rel), { waitUntil: 'load' });
  const motion = await page.evaluate(() => { const bad = []; const all = [...document.querySelectorAll('*')]; for (const e of all) { const cs = getComputedStyle(e); const t = cs.transitionDuration.split(',').some((d) => parseFloat(d) > 0); const a = cs.animationName !== 'none' && cs.animationDuration.split(',').some((d) => parseFloat(d) > 0); if (t || a) bad.push({ tag: e.tagName, cls: String(e.className).slice(0, 30), transition: cs.transitionDuration, animation: cs.animationName }); } return { matchesReduce: matchMedia('(prefers-reduced-motion: reduce)').matches, elements: all.length, animatedOrTransitioning: bad, scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior }; });
  motionOn += motion.animatedOrTransitioning.length; rec.reducedMotion = motion; await ctx.close();
  result.pages[rel] = rec; console.log(rel, 'fails', rec[1280].contrastFailures.length + rec[375].contrastFailures.length, 'err', rec[1280].consoleErrors.length + rec[375].consoleErrors.length, 'ovf375', rec[375].horizontalOverflow);
}
result.totals = { pages: pages.length, contrastElementsChecked: checked, contrastFailures: failCount, consoleErrors: consoleErr, pagesWithHorizontalOverflowAt375: overflowCount, focusStopsWithoutVisibleIndicator: focusMissing, elementsAnimatingUnderReducedMotion: motionOn };


// Interactions: identical scripted steps on HEAD and MAIN, at 1280 and 375.
// REM02: on HEAD, the full contrast AUDIT is re-run AFTER every interaction (dynamically rendered state).
let postChecked = 0, postFails = 0; const postFailList = [];
const postAudit = async (page, label, w) => {
  const a = await page.evaluate(AUDIT); const f = a.filter((x) => !x.pass);
  postChecked += a.length; postFails += f.length; f.forEach((x) => postFailList.push({ label, w, ...x }));
  return { checked: a.length, failures: f, minRatio: Math.min(...a.map((x) => x.ratio)) };
};
async function interact(base, w, audit) {
  const ctx = await browser.newContext({ viewport: { width: w, height: w === 1280 ? 800 : 812 } }); const page = await ctx.newPage(); const runs = [];
  const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  const combos = [['MacBook / USB-C laptop', '4K USB-C monitor', []], ['PlayStation 5', '4K / 120 Hz HDMI display', []], ['Windows USB-C laptop', 'USB-C / Thunderbolt dock', ['charging', 'oneCable']], ['Nintendo Switch 2', '1440p / 165 Hz HDMI monitor', ['capture']]];
  for (const [a, b, extra] of combos) {
    await page.goto(base + '/', { waitUntil: 'load' });
    await page.selectOption('#a', { label: a }); await page.selectOption('#b', { label: b });
    for (const k of extra) await page.click(`button.chip[data-intent="${k}"]`);
    await page.click('#solveBtn'); await page.waitForSelector('#r.show');
    const run = { engine: 'home', steps: [`select #a = ${a}`, `select #b = ${b}`, ...extra.map((k) => `click chip ${k}`), 'click #solveBtn', 'wait #r.show'], resultVisible: await page.isVisible('#r'), outcome: await page.textContent('#outcomeBadge'), text: (await page.innerText('#r')).trim(), domText: (await page.textContent('#r')).replace(/\s+/g, ' ').trim() };
    if (audit) run.postContrast = await postAudit(page, `home:${a}|${b}|${extra.join('+')}`, w);
    runs.push(run);
  }
  const solverSteps = [{ id: 'plan', symptom: 'plan', sel: {} }, { id: 'refresh-4k120', symptom: 'refresh', sel: { res: '3840x2160' }, fill: { hz: '120' } }, { id: 'nosignal-5120x1440-240', symptom: 'no-signal', sel: { res: '5120x1440' }, fill: { hz: '240' } }, { id: 'high-pclk', symptom: 'refresh', sel: { res: '3840x2160' }, fill: { hz: '240', pclk: '2200' } }, { id: 'pass-dp14-1080p60', symptom: 'plan', sel: { source: 'dp-hbr3', sink: 'dp-hbr3', res: '1920x1080' }, fill: { hz: '60' } }, { id: 'unknown-source', symptom: 'plan', sel: { source: 'unknown', res: '1920x1080' }, fill: { hz: '60' } }, { id: 'hdmi21-label-4k120', symptom: 'refresh', sel: { source: 'hdmi-21-label', sink: 'hdmi-21-label', res: '3840x2160' }, fill: { hz: '120' } }, { id: 'input-error-hz0', symptom: 'plan', sel: { res: '3840x2160' }, fill: { hz: '0' } }];
  for (const s of solverSteps) {
    await page.goto(base + '/guides/display-connection-solver.html', { waitUntil: 'load' });
    const steps = [`check symptom=${s.symptom}`];
    await page.check(`input[name="symptom"][value="${s.symptom}"]`);
    for (const id of ['source', 'sink']) { const v = await page.$eval('#' + id, (e) => e.options[Math.min(1, e.options.length - 1)].value); await page.selectOption('#' + id, v); steps.push(`select #${id} = ${v} (option index 1)`); }
    for (const [k, v] of Object.entries(s.sel)) { await page.selectOption('#' + k, v); steps.push(`select #${k} = ${v}`); }
    for (const [k, v] of Object.entries(s.fill || {})) { await page.fill('#' + k, v); steps.push(`fill #${k} = ${v}`); }
    await page.click('form button.btn[type="submit"]'); steps.push('click submit'); await page.waitForTimeout(300);
    const txt = (await page.innerText('#solver-result')).trim();
    const domText = (await page.textContent('#solver-result')).replace(/\s+/g, ' ').trim();
    const run = { engine: 'solver', id: s.id, steps, domText, resultVisible: await page.isVisible('#solver-result') && txt.length > 0, text: txt, classes: await page.$$eval('#solver-result [class]', (es) => [...new Set(es.map((e) => e.className))]) };
    if (audit) { run.postContrast = await postAudit(page, `solver:${s.id}`, w); await page.locator('#solver-result').screenshot({ path: path.join(OUT, 'screens', `post-solver-${s.id}-${w}.png`) }); }
    runs.push(run);
  }
  // Generic exercise of the other interactive pages: every select option, every radio, every submit, all <details> opened.
  for (const rel of ['guides/bios-fast-boot-troubleshooter.html', 'guides/console-handheld-display-hub.html']) {
    await page.goto(base + '/' + rel, { waitUntil: 'load' });
    const sels = await page.$$eval('main select, form select, select', (es) => es.map((e) => ({ id: e.id, n: e.options.length })));
    const radios = await page.$$eval('input[type=radio]', (es) => es.map((e, i) => i));
    const rounds = Math.max(8, ...sels.map((s) => s.n));
    for (let r = 0; r < rounds; r++) {
      for (const s of sels) if (s.id) await page.selectOption('#' + s.id, { index: r % s.n }).catch(() => {});
      const groups = await page.$$eval('input[type=radio]', (es) => [...new Set(es.map((e) => e.name))]);
      for (const g of groups) { const n = await page.locator(`input[type=radio][name="${g}"]`).count(); await page.locator(`input[type=radio][name="${g}"]`).nth(r % n).check({ force: true }).catch(() => {}); }
      for (const b of await page.$$('form button[type=submit], form button:not([type])')) await b.click().catch(() => {});
      await page.waitForTimeout(150);
      const dom = (await page.textContent('main').catch(() => '') || '').replace(/\s+/g, ' ').trim();
      const run = { engine: rel.includes('bios') ? 'bios' : 'hub', round: r, domText: dom, resultVisible: true, text: dom };
      if (audit) run.postContrast = await postAudit(page, `${run.engine}:round${r}`, w);
      runs.push(run);
    }
  }
  // Toggled/expanded content: open every <details> on every page, then audit.
  for (const rel of pages) {
    await page.goto(urlFor(base, rel), { waitUntil: 'load' });
    const n = await page.$$eval('details', (ds) => { ds.forEach((d) => d.open = true); return ds.length; });
    if (!n) continue;
    const run = { engine: 'details-open', page: rel, details: n, domText: '', resultVisible: true, text: 'x' };
    if (audit) run.postContrast = await postAudit(page, `details:${rel}`, w);
    runs.push(run);
  }
  if (w === 1280) await page.screenshot({ path: path.join(OUT, 'screens', `solver-result-${base === HEAD ? 'head' : 'main'}.png`), fullPage: true });
  await ctx.close(); runs.pageErrors = errs; return runs;
}
// Consent banner focus ring contrast (LOW-1): Tab into the banner, measure outline vs banner bg.
async function consentFocus(base) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } }); const page = await ctx.newPage();
  await page.goto(base + '/', { waitUntil: 'load' }); await page.waitForTimeout(400);
  const out = [];
  const btns = await page.$$('#elorumtech-analytics-consent button, #elorumtech-analytics-consent a');
  for (const b of btns) { await b.focus(); await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Tab');
    out.push(await page.evaluate(() => { const e = document.activeElement; const cs = getComputedStyle(e); const box = document.getElementById('elorumtech-analytics-consent'); const p = (c) => c.match(/[\d.]+/g).slice(0, 3).map(Number); const L = ([r, g, b]) => { const f = (x) => { x /= 255; return x <= .03928 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4; }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); }; const a = L(p(cs.outlineColor)), bg = L(p(getComputedStyle(box).backgroundColor)); return { text: e.innerText.trim(), focusVisible: e.matches(':focus-visible'), outline: `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor}`, bannerBg: getComputedStyle(box).backgroundColor, ratio: +((Math.max(a, bg) + .05) / (Math.min(a, bg) + .05)).toFixed(2) }; })); }
  await page.locator('#elorumtech-analytics-consent').screenshot({ path: path.join(OUT, 'screens', 'consent-focus-head.png') }).catch(() => {});
  await ctx.close(); return out;
}
// Breadcrumb focus clipping (INFO-A): is the focused breadcrumb link's outline box inside the nav's clip?
async function breadcrumbFocus(base) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } }); const page = await ctx.newPage(); const out = [];
  for (const rel of pages) {
    await page.goto(urlFor(base, rel), { waitUntil: 'load' });
    const has = await page.$('nav[aria-label*="readcrumb" i] a, nav.crumbs a, nav.breadcrumb a'); if (!has) continue;
    await has.focus(); await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Tab');
    out.push({ page: rel, ...(await page.evaluate(() => { const e = document.activeElement, n = e.closest('nav'); const cs = getComputedStyle(e), ns = getComputedStyle(n); const r = e.getBoundingClientRect(), nr = n.getBoundingClientRect(); const ext = parseFloat(cs.outlineWidth) + parseFloat(cs.outlineOffset); const m = ns.clipPath.match(/inset\(([-\d.]+)px/); const clipTop = m ? -parseFloat(m[1]) : 0; return { text: e.innerText.trim(), outline: `${cs.outlineWidth} off ${cs.outlineOffset} ${cs.outlineColor}`, navClipPath: ns.clipPath, navOverflow: ns.overflow, outlineTop: +(r.top - ext).toFixed(1), outlineBottom: +(r.bottom + ext).toFixed(1), clipTop: +(nr.top - clipTop).toFixed(1), clipBottom: +(nr.bottom + clipTop).toFixed(1), clipped: (r.top - ext) < (nr.top - clipTop) - .5 || (r.bottom + ext) > (nr.bottom + clipTop) + .5 }; })) });
    if (out.length === 1) await page.locator('nav').filter({ has: page.locator(':focus') }).screenshot({ path: path.join(OUT, 'screens', 'breadcrumb-focus-head.png') }).catch(() => {});
  }
  await ctx.close(); return out;
}
const inter = {};
for (const w of [1280, 375]) { const h = await interact(HEAD, w, true), m = await interact(MAIN, w, false);
  inter[w] = { head: h, main: m, headPageErrors: h.pageErrors, identicalDomText: h.map((r, i) => r.domText === m[i]?.domText), allDomTextIdentical: h.length === m.length && h.every((r, i) => r.domText === m[i].domText), allRendered: h.every((r) => r.resultVisible && r.text.length > 0) }; }
result.interactions = { note: 'domText = DOM textContent (what the engines wrote), compared HEAD vs MAIN ' + MAIN_SHA + ' for identical scripted steps. postContrast = full AA audit re-run on HEAD after each interaction.', ...inter };
result.postInteraction = { snapshots: [1280, 375].reduce((s, w) => s + inter[w].head.filter((r) => r.postContrast).length, 0), elementsChecked: postChecked, contrastFailures: postFails, failures: postFailList, minRatio: Math.min(...[1280, 375].flatMap((w) => inter[w].head.filter((r) => r.postContrast).map((r) => r.postContrast.minRatio))), byEngine: Object.fromEntries(['home', 'solver', 'bios', 'hub', 'details-open'].map((e) => [e, [1280, 375].reduce((s, w) => s + inter[w].head.filter((r) => r.engine === e).length, 0)])) };
result.consentFocus = await consentFocus(HEAD);
// REBASE01: Thunderbolt dock guide (#35) new sections/table under the theme, HEAD vs MAIN.
async function tbdock() {
  const REL = 'guides/thunderbolt-dock-one-cable-4k-120.html'; const out = {};
  for (const [w, hh] of [[1280, 800], [375, 812]]) {
    const r = {};
    for (const [lbl, base] of [['head', HEAD], ['main', MAIN]]) {
      const ctx = await browser.newContext({ viewport: { width: w, height: hh } }); const page = await ctx.newPage(); const errs = [];
      page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); }); page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
      await page.goto(urlFor(base, REL), { waitUntil: 'load' }); await page.waitForTimeout(300);
      const info = await page.evaluate(() => {
        const q = (s) => document.querySelector(s);
        const sec = (s) => { const e = q(s); return e ? (e.closest('section') || e) : null; };
        const tw = q('.tablewrap'); const tbl = tw && tw.querySelector('table');
        return {
          themeLinks: document.querySelectorAll('link[href="/assets/elorum-theme.css"]').length,
          title: document.title, h1: [...document.querySelectorAll('h1')].map((e) => e.textContent),
          hasChoose: !!q('#choose'), hasUsbCMonitor: !!q('#usb-c-monitor'), hasSources: !!q('section.sources'),
          tableRows: tbl ? [...tbl.querySelectorAll('tbody th[scope=row]')].map((e) => e.textContent) : [],
          tablewrap: tw ? { clientWidth: tw.clientWidth, scrollWidth: tw.scrollWidth, overflowX: getComputedStyle(tw).overflowX, scrollableInside: tw.scrollWidth > tw.clientWidth } : null,
          pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
          sourceItems: document.querySelectorAll('section.sources li[id^="src-"]').length,
          citations: document.querySelectorAll('a.srcs').length,
          mainText: (document.querySelector('main') || document.body).textContent.replace(/\s+/g, ' ').trim(),
        };
      });
      if (lbl === 'head') {
        const a = await page.evaluate(AUDIT);
        // region audit: re-run AUDIT and keep only elements inside the new regions
        const region = await page.evaluate(() => { const sel = ['#choose', '.tablewrap', '#usb-c-monitor', 'section.sources']; const els = new Set(); for (const s of sel) { const e = document.querySelector(s); const root = e && (s.startsWith('#') ? (e.closest('section') || e.parentElement) : e); if (root) root.querySelectorAll('*').forEach((x) => els.add(x)); } let i = 0; document.querySelectorAll('body *').forEach((x) => { if (els.has(x)) x.setAttribute('data-rb01', '1'); }); return els.size; });
        const RSRC = AUDIT.toString().replace("document.querySelectorAll('body *')", "document.querySelectorAll('[data-rb01]')");
        if (RSRC === AUDIT.toString()) throw new Error('region audit patch failed');
        const regionAudit = await page.evaluate(`(${RSRC})()`);
        info.regionAudit = { checked: regionAudit.length, failures: regionAudit.filter((x) => !x.pass), minRatio: Math.min(...regionAudit.map((x) => x.ratio)) };
        const marked = await page.$$eval('[data-rb01]', (es) => es.length);
        info.audit = { checked: a.length, failures: a.filter((x) => !x.pass), minRatio: Math.min(...a.map((x) => x.ratio)) };
        // focus: Tab to first link inside the table wrapper and a source link; check ring inside wrapper
        const ring = await page.evaluate(() => { const res = []; for (const s of ['.tablewrap a', 'section.sources a', '#choose ~ * a.srcs, a.srcs']) { const e = document.querySelector(s); if (!e) continue; e.focus(); const cs = getComputedStyle(e); res.push({ sel: s, focusVisibleRule: `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor} off ${cs.outlineOffset}` }); } return res; });
        info.focus = ring; info.regionElements = marked;
        await page.locator('.tablewrap').screenshot({ path: path.join(OUT, 'screens', `tbdock-table-head-${w}.png`) }).catch(() => {});
      } else if (w === 1280) await page.screenshot({ path: path.join(OUT, 'screens', `tbdock-main-1280.png`), fullPage: true });
      info.consoleErrors = errs; r[lbl] = info; await ctx.close();
    }
    r.mainTextIdentical = r.head.mainText === r.main.mainText;
    r.rowsIdentical = JSON.stringify(r.head.tableRows) === JSON.stringify(r.main.tableRows);
    out[w] = r;
  }
  return out;
}
result.tbdock = await tbdock();
result.breadcrumbFocus = await breadcrumbFocus(HEAD);
fs.writeFileSync(path.join(OUT, 'browser-evidence.json'), JSON.stringify(result, null, 1));
console.log(JSON.stringify({ totals: result.totals, post: { ...result.postInteraction, failures: postFailList.slice(0, 12).map((f) => `${f.label}@${f.w} ${f.tag}.${f.cls} ${f.fg}/${f.bg} ${f.ratio}`) }, parity: [1280, 375].map((w) => [w, inter[w].allDomTextIdentical, inter[w].allRendered, inter[w].head.length, inter[w].headPageErrors.length]), consent: result.consentFocus, crumbs: result.breadcrumbFocus.map((b) => `${b.page} clipped=${b.clipped} ${b.navClipPath}`), tbdock: Object.fromEntries([1280, 375].map((w) => { const t = result.tbdock[w]; return [w, { themeLinksHead: t.head.themeLinks, themeLinksMain: t.main.themeLinks, title: t.head.title, h1: t.head.h1, rows: t.head.tableRows, tablewrap: t.head.tablewrap, pageOverflow: t.head.pageOverflow, sources: t.head.sourceItems, citations: t.head.citations, auditChecked: t.head.audit.checked, auditFailures: t.head.audit.failures.length, minRatio: t.head.audit.minRatio, regionChecked: t.head.regionAudit.checked, regionFailures: t.head.regionAudit.failures.length, regionMin: t.head.regionAudit.minRatio, focus: t.head.focus, consoleErrorsHead: t.head.consoleErrors.length, mainTextIdentical: t.mainTextIdentical, rowsIdentical: t.rowsIdentical }]; })) }, null, 1));
await browser.close();
