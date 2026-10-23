// ELORUMTECH-BING-KEY-TEST-20261020-01: offline safety checks for the manual Bing key test workflow.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const y = fs.readFileSync(path.join(root, '.github/workflows/bing-key-test.yml'), 'utf8');
const code = y.split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');

test('bing-key-test: only trigger is workflow_dispatch', () => {
  const on = code.match(/^on:\n((?:[ \t]+.*\n|\n)*?)(?=^\S)/m);
  assert.ok(on, 'on: block');
  const keys = [...on[1].matchAll(/^ {2}([A-Za-z_]+):/gm)].map((m) => m[1]);
  assert.deepEqual(keys, ['workflow_dispatch']);
  for (const t of ['schedule', 'push', 'pull_request', 'pull_request_target', 'workflow_run', 'repository_dispatch']) {
    assert.doesNotMatch(code, new RegExp(`^\\s*${t}:`, 'm'));
  }
});

test('bing-key-test: top-level permissions contents: read only', () => {
  assert.match(code, /^permissions:\n {2}contents: read\n(?! {2}\S)/m);
  assert.doesNotMatch(code, /: write\b/);
});

test('bing-key-test: only GetUserSites and GetKeyword methods', () => {
  const methods = [...code.matchAll(/\$API\/([A-Za-z]+)/g)].map((m) => m[1]);
  assert.deepEqual([...new Set(methods)].sort(), ['GetKeyword', 'GetUserSites']);
  assert.match(code, /https:\/\/ssl\.bing\.com\/webmaster\/api\.svc\/json/);
  assert.doesNotMatch(code, /\b(Submit|Add|Remove|Update)[A-Z][A-Za-z]*/);
  // every curl is a GET (-G); no method override or raw body
  const curls = code.match(/curl [^\n]*(?:\\\n[^\n]*)*/g) || [];
  assert.equal(curls.length, 2);
  for (const c of curls) {
    assert.match(c, /curl -sS -G /);
    assert.doesNotMatch(c, /-X\s|--request|--data(?!-urlencode)|\s-d\s|--form|-F\s/);
  }
});

test('bing-key-test: key masked, no verbose/trace, no artifacts, key not echoed', () => {
  assert.match(code, /echo "::add-mask::\$KEY"/);
  assert.match(code, /secrets\.BING_WEBMASTER_API_KEY/);
  assert.doesNotMatch(code, /curl[^\n]*\s(-v|--verbose|--trace\S*)\b/);
  assert.doesNotMatch(code, /set -[a-z]*x/);
  assert.doesNotMatch(code, /upload-artifact|actions\/cache|actions\/checkout|git (commit|push)/);
  for (const l of code.split('\n').filter((l) => /\b(echo|printf|out)\b/.test(l))) {
    assert.doesNotMatch(l, /apikey/i, l);
    if (!l.includes('::add-mask::')) assert.doesNotMatch(l, /\$\{?KEY\b/, l);
  }
});
