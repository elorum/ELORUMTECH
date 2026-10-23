// ELORUMTECH-BING-KEY-TEST-20261020-01 (REM01): offline safety checks for the manual Bing key test workflow.
// No YAML dependency in the repo, so a small block-YAML subset parser is used (mappings, `- ` lists, `|` scalars).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WF = fs.readFileSync(path.join(root, '.github/workflows/bing-key-test.yml'), 'utf8');

export function parseYaml(text) {
  const lines = text.split('\n').map((raw) => raw.replace(/\s+$/, ''));
  let i = 0;
  const ind = (l) => l.match(/^ */)[0].length;
  const skip = () => { while (i < lines.length && (/^\s*$/.test(lines[i]) || /^\s*#/.test(lines[i]))) i++; };
  const scalar = (v) => {
    v = v.trim();
    if (v === '') return null;
    if (/^-?\d+$/.test(v)) return Number(v);
    if (/^(['"]).*\1$/.test(v)) return v.slice(1, -1);
    return v;
  };
  function block(min) {
    const out = [];
    while (i < lines.length && (/^\s*$/.test(lines[i]) || ind(lines[i]) >= min)) { out.push(lines[i].slice(min)); i++; }
    while (out.length && out[out.length - 1] === '') out.pop();
    return out.join('\n') + '\n';
  }
  function value(key, rest, level) {
    if (rest === '|') { skip(); return block(i < lines.length ? ind(lines[i]) : level + 2); }
    if (rest !== '') return scalar(rest);
    skip();
    if (i < lines.length && ind(lines[i]) > level) return node(ind(lines[i]));
    if (i < lines.length && ind(lines[i]) === level && /^\s*- /.test(lines[i])) return node(level);
    return null;
  }
  function node(level) {
    skip();
    if (/^\s*- /.test(lines[i])) {
      const arr = [];
      while (i < lines.length) {
        skip();
        if (i >= lines.length || ind(lines[i]) !== level || !/^\s*- /.test(lines[i])) break;
        lines[i] = ' '.repeat(level + 2) + lines[i].slice(level + 2);
        arr.push(node(level + 2));
      }
      return arr;
    }
    const obj = {};
    while (i < lines.length) {
      skip();
      if (i >= lines.length || ind(lines[i]) !== level) break;
      const m = lines[i].slice(level).match(/^([^:\s][^:]*):(?:\s+(.*))?$/);
      if (!m) throw new Error(`yaml: cannot parse line ${i + 1}: ${lines[i]}`);
      i++;
      if (m[1] in obj) throw new Error(`yaml: duplicate key ${m[1]}`);
      obj[m[1]] = value(m[1], (m[2] || '').trim(), level);
    }
    return obj;
  }
  const doc = node(0);
  skip();
  if (i < lines.length) throw new Error(`yaml: unparsed line ${i + 1}: ${lines[i]}`);
  return doc;
}

// Returns a list of violations (empty = safe).
export function checkWorkflow(text) {
  const v = [];
  let y;
  try { y = parseYaml(text); } catch (e) { return [String(e.message)]; }
  const keys = (o) => (o && typeof o === 'object' ? Object.keys(o) : []);
  if (JSON.stringify(keys(y.on)) !== '["workflow_dispatch"]') v.push('trigger must be workflow_dispatch only');
  if (JSON.stringify(y.permissions) !== '{"contents":"read"}') v.push('permissions must be exactly contents: read');
  const jobs = keys(y.jobs);
  if (jobs.length !== 1) { v.push('exactly one job'); return v; }
  const job = y.jobs[jobs[0]];
  if (job['runs-on'] !== 'ubuntu-latest') v.push('runs-on ubuntu-latest');
  if (job['timeout-minutes'] !== 5) v.push('timeout-minutes 5');
  if (job.permissions !== undefined) v.push('no job-level permissions');
  const envs = [job.env, ...(job.steps || []).map((s) => s.env)].filter(Boolean);
  if (!job.env || job.env.KEY !== '${{ secrets.BING_WEBMASTER_API_KEY }}') v.push('KEY must come from secrets.BING_WEBMASTER_API_KEY');
  for (const e of envs) for (const [k, val] of Object.entries(e)) {
    if (/secrets\./.test(String(val)) && !(k === 'KEY' && e === job.env)) v.push(`unexpected secret use in env ${k}`);
  }
  if (/secrets\.(?!BING_WEBMASTER_API_KEY\b)/.test(text)) v.push('only BING_WEBMASTER_API_KEY secret allowed');
  const steps = job.steps || [];
  if (steps.some((s) => 'uses' in s)) v.push('no uses: steps (no checkout/artifact/cache)');
  if (/upload-artifact|actions\/cache|actions\/checkout/.test(text)) v.push('no artifact/cache/checkout');
  const script = steps.map((s) => s.run || '').join('\n');
  const sl = script.split('\n');
  const idxOf = (re) => sl.findIndex((l) => re.test(l));
  // empty-secret guard exits non-zero, before mask
  const guard = script.match(/if \[ -z "\$KEY" \]; then\n([\s\S]*?)\nfi/);
  if (!guard || !/^\s*exit [1-9]\d*\s*$/m.test(guard[1])) v.push('empty-secret check must exit non-zero');
  const mask = idxOf(/^\s*echo "::add-mask::\$KEY"\s*$/);
  const CURL = /\$\(curl\b|^\s*curl\b|[;&|]\s*curl\b/;
  const firstCurl = idxOf(CURL);
  if (mask < 0) v.push('add-mask missing');
  else if (firstCurl >= 0 && mask > firstCurl) v.push('add-mask must precede first curl');
  // temp files: every mktemp followed by an EXIT trap removing it, with umask 077
  const tmpVars = [...script.matchAll(/^\s*(\w+)="\$\(mktemp\)"/gm)].map((m) => m[1]);
  const trapI = idxOf(/^\s*trap '.*' EXIT\s*$/);
  if (!tmpVars.length) v.push('expected mktemp temp files');
  if (trapI < 0) v.push('EXIT trap missing');
  else {
    const trap = sl[trapI];
    for (const t of tmpVars) if (!trap.includes(`"$${t}"`)) v.push(`trap must remove $${t}`);
    const lastMk = Math.max(...tmpVars.map((t) => idxOf(new RegExp(`^\\s*${t}="\\$\\(mktemp\\)"`))));
    if (trapI < lastMk) v.push('trap must follow mktemp');
    if (firstCurl >= 0 && trapI > firstCurl) v.push('trap must precede curl');
  }
  if (!/^\s*umask 077\s*$/m.test(script) && !/chmod 600/.test(script)) v.push('umask 077 or chmod 600 required');
  if (/set -[a-z]*x|set -o xtrace/.test(script)) v.push('no set -x');
  // curl calls (join continuation lines)
  const joined = script.replace(/\\\n\s*/g, ' ');
  const curls = joined.split('\n').filter((l) => CURL.test(l));
  if (curls.length !== 2) v.push('exactly two curl calls');
  const methods = [];
  for (const c of curls) {
    if (!/curl -sS -G /.test(c)) v.push('curl must use -sS -G');
    if (/\s(-v|--verbose|--trace\S*|-i|--include|-D|--dump-header)(\s|$)/.test(c)) v.push('no verbose/trace/header dump');
    if (/\s(-X|--request)\s+(?!GET\b)/.test(c) || /\s(-d|--data|--data-raw|--data-binary|-F|--form|-T|--upload-file)(\s|=)/.test(c)) v.push('GET only: no body/method override');
    if (!/2>"\$ERR"|2>\/dev\/null/.test(c)) v.push('curl stderr must be captured, not printed');
    const m = c.match(/"\$API\/(\w+)"/);
    methods.push(m ? m[1] : '?');
    if (m && m[1] === 'GetKeyword') {
      for (const p of ['q=hdmi', 'country=us', 'language=en-US', 'startDate=$START', 'endDate=$END']) {
        if (!c.includes(`--data-urlencode "${p}"`)) v.push(`GetKeyword param ${p}`);
      }
    }
  }
  if (JSON.stringify(methods.sort()) !== '["GetKeyword","GetUserSites"]') v.push('only GetUserSites and GetKeyword');
  if (/\b(Submit|Add|Remove|Update)[A-Z]\w*/.test(script)) v.push('no write methods');
  if (!/^\s*API: https:\/\/ssl\.bing\.com\/webmaster\/api\.svc\/json\s*$/m.test(text)) v.push('API base');
  // output hygiene
  if (/\.Message|\.ErrorCode|\.ExceptionType/.test(script)) v.push('no error-body fields in output');
  if (/\bsed\b/.test(script)) v.push('no sed redaction');
  for (const l of sl.filter((l) => /\b(echo|printf|out|cat|head|tail)\b/.test(l) && !/^\s*out\(\) \{/.test(l))) {
    if (/apikey/i.test(l)) v.push(`key param in output line: ${l.trim()}`);
    if (/\$\{?KEY\b/.test(l) && !/::add-mask::/.test(l)) v.push(`KEY in output line: ${l.trim()}`);
    if (/\$\{?(BODY|ERR)\b/.test(l) && !/\bjq\b/.test(l)) v.push(`raw body/stderr output: ${l.trim()}`);
    if (/\$\{?API\b|\$\(curl/.test(l)) v.push(`URL in output line: ${l.trim()}`);
  }
  if (/\bcat\b[^\n]*\$\{?(BODY|ERR)\b|<\s*"\$(BODY|ERR)"/.test(script)) v.push('no cat/read of body or stderr');
  for (const l of sl.filter((l) => /\bjq\b/.test(l))) if (!/2>\/dev\/null|2>&1/.test(l)) v.push(`jq stderr must be suppressed: ${l.trim()}`);
  return v;
}

test('bing-key-test: real workflow passes every check', () => {
  assert.deepEqual(checkWorkflow(WF), []);
});

test('bing-key-test: parser reads expected structure', () => {
  const y = parseYaml(WF);
  assert.deepEqual(Object.keys(y.on), ['workflow_dispatch']);
  assert.deepEqual(y.permissions, { contents: 'read' });
  const job = y.jobs['bing-key-test'];
  assert.equal(job['runs-on'], 'ubuntu-latest');
  assert.equal(job['timeout-minutes'], 5);
  assert.equal(job.steps.length, 2);
  assert.ok(job.steps.every((s) => typeof s.run === 'string' && !('uses' in s)));
});

const swap = (from, to) => {
  assert.ok(WF.includes(from), `mutation anchor missing: ${from}`);
  return WF.replace(from, to);
};
const MUTATIONS = {
  'push trigger': swap('  workflow_dispatch:\n', '  workflow_dispatch:\n  push:\n'),
  'schedule trigger': swap('  workflow_dispatch:\n', '  workflow_dispatch:\n  schedule:\n    - cron: "0 0 * * *"\n'),
  'contents: write': swap('  contents: read', '  contents: write'),
  'extra permission': swap('  contents: read', '  contents: read\n  actions: write'),
  'second job': WF + '  other:\n    runs-on: ubuntu-latest\n    steps:\n      - run: true\n',
  'timeout 30': swap('timeout-minutes: 5', 'timeout-minutes: 30'),
  'checkout step': swap('    steps:\n', '    steps:\n      - uses: actions/checkout@v4\n'),
  'upload artifact': WF + '      - uses: actions/upload-artifact@v4\n        with:\n          path: x\n',
  'key from other source': swap('KEY: ${{ secrets.BING_WEBMASTER_API_KEY }}', 'KEY: ${{ vars.BING_KEY }}'),
  'other secret': swap('      API: https', '      TOK: ${{ secrets.GITHUB_TOKEN }}\n      API: https'),
  'empty check no exit': swap('            exit 1\n', '            true\n'),
  'empty check exit 0': swap('            exit 1\n', '            exit 0\n'),
  'remove add-mask': swap('          echo "::add-mask::$KEY"\n', ''),
  'add-mask after curl': swap('          echo "::add-mask::$KEY"\n', '').replace(/(--data-urlencode "apikey=\$KEY" 2>"\$ERR"\) \|\| RC=\$\?\n)/, '$1          echo "::add-mask::$KEY"\n'),
  'verbose curl': swap('curl -sS -G -o "$BODY" -w \'%{http_code}\' "$API/GetUserSites"', 'curl -v -sS -G -o "$BODY" -w \'%{http_code}\' "$API/GetUserSites"'),
  'trace curl': swap('"$API/GetUserSites" --data-urlencode', '"$API/GetUserSites" --trace - --data-urlencode'),
  'set -x': swap('set -euo pipefail', 'set -euxo pipefail'),
  'POST': swap('"$API/GetUserSites" --data-urlencode', '"$API/GetUserSites" -X POST --data-urlencode'),
  'raw --data': swap('"$API/GetUserSites" --data-urlencode', '"$API/GetUserSites" --data x=1 --data-urlencode'),
  'write method': swap('"$API/GetUserSites"', '"$API/SubmitUrl"'),
  'third curl': swap('          END=$(date', '          curl -sS -G -o "$BODY" "$API/GetUserSites" 2>"$ERR"\n          END=$(date'),
  'print .Message': swap('out "GetKeyword HTTP $CODE (request failed; response body not shown)"', 'out "GetKeyword error: $(jq -r .Message "$BODY" 2>/dev/null)"'),
  'sed redaction': swap('out "GetKeyword HTTP $CODE (request failed; response body not shown)"', 'out "$(jq -r .x "$BODY" 2>/dev/null | sed s/a/b/)"'),
  'cat body': swap('out "GetKeyword HTTP $CODE (request failed; response body not shown)"', 'cat "$BODY"'),
  'print stderr': swap('out "GetKeyword transport error (curl exit $RC)"', 'out "GetKeyword transport error: $(head -c 200 "$ERR")"'),
  'curl stderr uncaptured': swap('--data-urlencode "apikey=$KEY" 2>"$ERR") || RC=$?\n          if [ "$RC" != "0" ]; then\n            out "GetUserSites', '--data-urlencode "apikey=$KEY") || RC=$?\n          if [ "$RC" != "0" ]; then\n            out "GetUserSites'),
  'echo key': swap('out "## Bing key test"', 'out "## Bing key test $KEY"'),
  'echo URL': swap('out "## Bing key test"', 'out "## $API/GetUserSites?apikey=x"'),
  'remove trap': swap('          trap \'rm -f "$BODY" "$ERR"\' EXIT\n', ''),
  'trap misses ERR': swap('trap \'rm -f "$BODY" "$ERR"\' EXIT', 'trap \'rm -f "$BODY"\' EXIT'),
  'no umask': swap('          umask 077\n', ''),
  'wrong keyword param': swap('--data-urlencode "country=us"', '--data-urlencode "country=de"'),
  'jq stderr shown': swap('"$BODY" 2>/dev/null | while IFS= read -r l; do out "$l"; done || out "GetKeyword', '"$BODY" | while IFS= read -r l; do out "$l"; done || out "GetKeyword'),
};

for (const [name, mutated] of Object.entries(MUTATIONS)) {
  test(`bing-key-test mutation is rejected: ${name}`, () => {
    assert.notEqual(mutated, WF);
    assert.ok(checkWorkflow(mutated).length > 0, `checker accepted unsafe mutation: ${name}`);
  });
}
