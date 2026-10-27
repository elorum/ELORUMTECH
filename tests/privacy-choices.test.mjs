// COMPANY-DETAILS (Nicki "ja til 3"): visible "Privacy choices" link reopens the analytics consent banner.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
function htmlFiles(dir = root, out = []) {
  for (const n of fs.readdirSync(dir)) {
    if (n === '.git' || n === 'node_modules') continue;
    const p = path.join(dir, n);
    if (fs.statSync(p).isDirectory()) htmlFiles(p, out); else if (n.endsWith('.html')) out.push(path.relative(root, p).split(path.sep).join('/'));
  }
  return out.sort();
}
const LINK = '<a href="#" data-analytics-choices>Privacy choices</a>';
test('PC-1 every page with a footer has Privacy then Privacy choices in the footer link row', () => {
  const pages = htmlFiles().filter((f) => read(f).includes('<footer>'));
  assert.equal(pages.length, 35);
  for (const f of pages) {
    const foot = read(f).split('<footer>')[1];
    assert.match(foot, /privacy\.html">Privacy<\/a> · <a href="#" data-analytics-choices>Privacy choices<\/a><\/div>/, f);
    assert.equal(foot.split(LINK).length, 2, f);
  }
});
test('PC-2 privacy.html points to Privacy choices and no longer says to clear browser data to be asked again', () => {
  const h = read('privacy.html');
  assert.ok(h.split('data-analytics-choices').length >= 3);
  assert.doesNotMatch(h, /clear this site’s stored data/);
  assert.match(h, /Cookies Google Analytics already set are not deleted by this choice/);
});

// Minimal DOM to run analytics.js and click the link / banner buttons.
function makeEnv(stored) {
  const store = new Map(stored ? [['elorumtech-analytics-consent', stored]] : []);
  const listeners = {}; const body = [];
  const el = (tag) => ({ tag, children: [], style: {}, attrs: {}, listeners: {}, id: '',
    setAttribute(k, v) { this.attrs[k] = v; }, getAttribute(k) { return this.attrs[k] ?? null; },
    appendChild(c) { this.children.push(c); c.parent = this; return c; },
    addEventListener(t, f) { this.listeners[t] = f; },
    remove() { const i = body.indexOf(this); if (i >= 0) body.splice(i, 1); },
    contains() { return false; }, getBoundingClientRect: () => ({ top: 0, bottom: 0, height: 0 }) });
  const find = (id) => body.find((n) => n.id === id) || null;
  const document = { readyState: 'complete', createElement: el, getElementById: find,
    head: { appendChild() {} }, documentElement: { style: {} },
    body: { style: {}, appendChild(n) { body.push(n); } },
    addEventListener(t, f) { (listeners[t] ||= []).push(f); }, removeEventListener() {} };
  const window = { innerHeight: 800, addEventListener() {}, removeEventListener() {}, scrollBy() {} };
  const ctx = { window, document, localStorage: { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) }, location: { pathname: '/' } };
  vm.runInNewContext(read('analytics.js'), ctx);
  const click = (target) => { let prevented = false; for (const f of listeners.click || []) f({ target, preventDefault() { prevented = true; } }); return prevented; };
  const link = { closest: (s) => (s === '[data-analytics-choices]' ? link : null) };
  const buttons = () => find('elorumtech-analytics-consent').children[1].children;
  return { store, window, find, click, link, buttons };
}
test('PC-3 analytics.js: Privacy choices reopens the banner after a stored choice; Necessary only after Allow disables the loaded tag', () => {
  const e = makeEnv('granted');
  assert.equal(e.find('elorumtech-analytics-consent'), null);
  assert.equal(typeof e.window.gtag, 'function');
  assert.equal(e.click(e.link), true);
  assert.ok(e.find('elorumtech-analytics-consent'), 'banner reopened');
  e.buttons()[1].listeners.click();
  assert.equal(e.store.get('elorumtech-analytics-consent'), 'denied');
  assert.equal(e.window['ga-disable-G-NBJBV3XERH'], true);
  assert.equal(e.find('elorumtech-analytics-consent'), null);
  e.click(e.link); e.buttons()[0].listeners.click();
  assert.equal(e.store.get('elorumtech-analytics-consent'), 'granted');
  assert.equal(e.window['ga-disable-G-NBJBV3XERH'], false);
});
test('PC-3-MUT a page without consent stored still shows the banner once; denied never loads gtag', () => {
  const d = makeEnv('denied');
  assert.equal(d.window.gtag, undefined);
  assert.equal(d.find('elorumtech-analytics-consent'), null);
  d.click(d.link); assert.ok(d.find('elorumtech-analytics-consent'));
  const n = makeEnv(null); assert.ok(n.find('elorumtech-analytics-consent'));
  assert.equal(n.click({ closest: () => null }), false);
});
