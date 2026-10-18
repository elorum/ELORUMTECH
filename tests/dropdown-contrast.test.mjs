import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function htmlPages() {
  const out = [];
  function walk(dir) {
    for (const name of fs.readdirSync(dir)) {
      if (name === 'node_modules' || name === '.git') continue;
      const p = path.join(dir, name);
      const st = fs.statSync(p);
      if (st.isDirectory()) walk(p);
      else if (name.endsWith('.html')) out.push(p);
    }
  }
  walk(root);
  return out;
}

test('DC-1 every page with <select> has dark color-scheme and option background/color', () => {
  const pages = htmlPages().filter((p) => /<select\b/i.test(fs.readFileSync(p, 'utf8')));
  assert.ok(pages.length >= 1, 'expected at least one page with <select>');
  for (const p of pages) {
    const html = fs.readFileSync(p, 'utf8');
    const rel = path.relative(root, p);
    assert.match(html, /color-scheme\s*:\s*dark/, `${rel}: missing color-scheme:dark on selects`);
    assert.match(
      html,
      /select\s+option[\s\S]{0,80}background\s*:\s*#[0-9a-fA-F]{3,8}/,
      `${rel}: missing select option background`,
    );
    assert.match(
      html,
      /select\s+option[\s\S]{0,120}color\s*:\s*#(?:fff|f6f8fb|ffffff)\b/i,
      `${rel}: missing select option light text color`,
    );
  }
});

test('DC-2 homepage select#a/#b keep transparent field but gain Windows-safe option styles', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(html, /<select id="a"/);
  assert.match(html, /<select id="b"/);
  assert.match(html, /select\{[^}]*background:transparent[^}]*color-scheme:dark\}/);
  assert.match(html, /select option,select optgroup\{background:#07090d;color:#fff\}/);
});
