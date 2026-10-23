// ELORUMTECH-BING-KEYWORD-PULL-20261023-01: offline safety checks for the manual Bing keyword pull workflow.
// Same small block-YAML subset parser as tests/bing-key-test-workflow.test.mjs (copied so this file stays standalone).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WF = fs.readFileSync(path.join(root, '.github/workflows/bing-keyword-pull.yml'), 'utf8');

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

export const KEYWORDS = ['hdmi', 'displayport', 'hdmi 2.1', 'displayport vs hdmi', 'monitor stuck at 60hz', 'monitor not showing 144hz', '165hz monitor only 60hz', '120hz hdmi', 'monitor no signal', 'hdmi no signal', 'displayport no signal', 'hdr not working', 'hdr washed out', 'vrr', 'freesync not working', 'g-sync compatible', 'dsc display stream compression', 'usb c to hdmi not working', 'usb c monitor', 'thunderbolt dock', 'docking station not detecting monitor', 'usb c hub vs dock', 'macbook external monitor', 'bios fast boot', 'fast boot no display', 'no display after bios update', '4k 120hz hdmi', 'ps5 120hz monitor'];
const ARTIFACT = 'actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02';

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
  if (!(job['timeout-minutes'] > 0 && job['timeout-minutes'] <= 10)) v.push('timeout-minutes <= 10');
  if (job.permissions !== undefined) v.push('no job-level permissions');
  const env = job.env || {};
  if (env.KEY !== '${{ secrets.BING_WEBMASTER_API_KEY }}') v.push('KEY must come from secrets.BING_WEBMASTER_API_KEY');
  const steps = job.steps || [];
  for (const e of [env, ...steps.map((s) => s.env)].filter(Boolean)) for (const [k, val] of Object.entries(e)) {
    if (/secrets\./.test(String(val)) && !(k === 'KEY' && e === env)) v.push(`unexpected secret use in env ${k}`);
  }
  if (/secrets\.(?!BING_WEBMASTER_API_KEY\b)/.test(text)) v.push('only BING_WEBMASTER_API_KEY secret allowed');
  if (env.API !== 'https://ssl.bing.com/webmaster/api.svc/json') v.push('API base');
  if (env.START_DATE !== '2026-07-23' || env.END_DATE !== '2026-10-23') v.push('dates must be 2026-07-23..2026-10-23');
  const kws = String(env.KEYWORDS || '').split('\n').map((s) => s.trim()).filter(Boolean);
  if (JSON.stringify(kws) !== JSON.stringify(KEYWORDS)) v.push('KEYWORDS must be exactly the 28 approved keywords');
  if ((text.match(/KEYWORDS:/g) || []).length !== 1) v.push('single keyword list');
  // uses: only the pinned upload-artifact, as the last step
  const uses = steps.filter((s) => 'uses' in s);
  if (/actions\/checkout|actions\/cache/.test(text)) v.push('no checkout/cache');
  if (uses.length !== 1) v.push('exactly one uses: step (upload-artifact)');
  for (const s of uses) {
    if (!String(s.uses).startsWith(ARTIFACT + ' ') && s.uses !== ARTIFACT) v.push('upload-artifact must be pinned to full SHA');
    if (!s.with || s.with['retention-days'] !== 30) v.push('retention-days 30');
    if (!s.with || s.with['if-no-files-found'] !== 'error') v.push('if-no-files-found error');
  }
  const upI = steps.findIndex((s) => 'uses' in s);
  if (upI >= 0 && upI !== steps.length - 1) v.push('upload must be last step');
  // leak guard step before upload
  const gI = steps.findIndex((s) => /grep -qF -- "\$KEY" keywords\.csv keyword_stats\.csv/.test(s.run || ''));
  if (gI < 0) v.push('key leak guard missing');
  else {
    if (upI >= 0 && gI > upI) v.push('leak guard must precede upload');
    if (!/grep -qF -- "\$KEY"[^\n]*; then\n\s*echo[^\n]*\n\s*exit 1/.test(steps[gI].run)) v.push('leak guard must exit 1');
    if (steps[gI].if !== undefined) v.push('leak guard must not be conditional');
  }
  if (upI >= 0 && steps[upI].if !== undefined) v.push('upload must not be conditional');
  const script = steps.map((s) => s.run || '').join('\n');
  const sl = script.split('\n');
  const idxOf = (re) => sl.findIndex((l) => re.test(l));
  const guard = script.match(/if \[ -z "\$KEY" \]; then\n([\s\S]*?)\nfi/);
  if (!guard || !/^\s*exit [1-9]\d*\s*$/m.test(guard[1])) v.push('empty-secret check must exit non-zero');
  const mask = idxOf(/^\s*echo "::add-mask::\$KEY"\s*$/);
  const CURL = /\$\(curl\b|^\s*curl\b|[;&|]\s*curl\b/;
  const firstCurl = idxOf(CURL);
  const firstKey = idxOf(/\$\{?KEY\b/);
  if (mask < 0) v.push('add-mask missing');
  else {
    if (firstCurl >= 0 && mask > firstCurl) v.push('add-mask must precede first curl');
    const uses2 = sl.findIndex((l, i) => i !== mask && /\$\{?KEY\b/.test(l) && !/-z "\$KEY"/.test(l));
    if (uses2 >= 0 && uses2 < mask) v.push('add-mask must precede first use of KEY');
  }
  void firstKey;
  const tmpVars = [...script.matchAll(/^\s*(\w+)="\$\(mktemp\)"/gm)].map((m) => m[1]);
  const trapI = idxOf(/^\s*trap '.*' EXIT\s*$/);
  if (!tmpVars.length) v.push('expected mktemp temp files');
  if (trapI < 0) v.push('EXIT trap missing');
  else {
    for (const t of tmpVars) if (!sl[trapI].includes(`"$${t}"`)) v.push(`trap must remove $${t}`);
    const lastMk = Math.max(...tmpVars.map((t) => idxOf(new RegExp(`^\\s*${t}="\\$\\(mktemp\\)"`))));
    if (trapI < lastMk) v.push('trap must follow mktemp');
    if (firstCurl >= 0 && trapI > firstCurl) v.push('trap must precede curl');
  }
  if (!/^\s*umask 077\s*$/m.test(script)) v.push('umask 077 required');
  if (/set -[a-z]*x|set -o xtrace/.test(script)) v.push('no set -x');
  const curls = script.replace(/\\\n\s*/g, ' ').split('\n').filter((l) => CURL.test(l));
  if (curls.length !== 2) v.push('exactly two curl calls');
  const methods = [];
  for (const c of curls) {
    if (!/curl -sS -G /.test(c)) v.push('curl must use -sS -G');
    if (/\s(-v|--verbose|--trace\S*|-i|--include|-D|--dump-header)(\s|$)/.test(c)) v.push('no verbose/trace/header dump');
    if (/\s(-X|--request)\s+(?!GET\b)/.test(c) || /\s(-d|--data|--data-raw|--data-binary|-F|--form|-T|--upload-file)(\s|=)/.test(c)) v.push('GET only: no body/method override');
    if (!/2>"\$ERR"/.test(c)) v.push('curl stderr must be captured');
    const params = [...c.matchAll(/\s(--\S+|-\S+)\s+"([^"]*)"/g)].filter((m) => /^[a-zA-Z]+=/.test(m[2]));
    for (const p of params) if (p[1] !== '--data-urlencode') v.push(`param ${p[2]} must use --data-urlencode`);
    const m = c.match(/"\$API\/(\w+)"/);
    methods.push(m ? m[1] : '?');
    const need = ['q=$KW', 'country=us', 'language=en-US', 'apikey=$KEY'];
    if (m && m[1] === 'GetKeyword') need.push('startDate=$START_DATE', 'endDate=$END_DATE');
    for (const p of need) if (!c.includes(`--data-urlencode "${p}"`)) v.push(`${m && m[1]} param ${p}`);
  }
  if (JSON.stringify(methods.sort()) !== '["GetKeyword","GetKeywordStats"]') v.push('only GetKeyword and GetKeywordStats');
  if (/\b(Submit|Add|Remove|Update)[A-Z]\w*/.test(script)) v.push('no write methods');
  if (!/^\s*sleep [0-9]/m.test(script)) v.push('polite sleep between calls');
  if (!/if \[ "\$OK" = "0" \]; then\n[^\n]*\n\s*exit 1/.test(script)) v.push('must fail when all calls fail');
  // Actions runs bash with -e by default; the pull step must switch it off so one failing keyword cannot abort the rest.
  const pull = steps.find((s) => /curl /.test(s.run || ''));
  if (!pull || !/^set \+e\n/.test(pull.run) || /^\s*set -[a-z]*e/m.test(pull.run)) v.push('pull step must start with set +e and never set -e');
  if (/\.Message|\.ErrorCode|\.ExceptionType/.test(script)) v.push('no error-body fields in output');
  if (/\bsed\b/.test(script)) v.push('no sed redaction');
  for (const l of sl.filter((l) => /\b(echo|printf|cat|head|tail|tee)\b/.test(l))) {
    if (/apikey/i.test(l)) v.push(`key param in output line: ${l.trim()}`);
    if (/\$\{?KEY\b/.test(l) && !/::add-mask::/.test(l)) v.push(`KEY in output line: ${l.trim()}`);
    if (/\$\{?(BODY|ERR)\b/.test(l)) v.push(`raw body/stderr output: ${l.trim()}`);
    if (/\$\{?API\b|\$\(curl/.test(l)) v.push(`URL in output line: ${l.trim()}`);
  }
  if (/\b(cat|head|tail|tee|less|more|base64|xxd|od)\b[^\n]*\$\{?(BODY|ERR)\b|<\s*"\$(BODY|ERR)"/.test(script)) v.push('no read of body or stderr except jq');
  for (const l of sl.filter((l) => /\$\{?(BODY|ERR)\b/.test(l) && !/mktemp|trap |curl /.test(l))) {
    if (!/\bjq\b/.test(l)) v.push(`body used outside jq: ${l.trim()}`);
    else if (!/2>\/dev\/null/.test(l)) v.push(`jq stderr must be suppressed: ${l.trim()}`);
  }
  return v;
}

test('bing-keyword-pull: real workflow passes every check', () => {
  assert.deepEqual(checkWorkflow(WF), []);
});

test('bing-keyword-pull: structure, 28 keywords, dates', () => {
  const y = parseYaml(WF);
  assert.deepEqual(Object.keys(y.on), ['workflow_dispatch']);
  assert.deepEqual(y.permissions, { contents: 'read' });
  const job = y.jobs['bing-keyword-pull'];
  assert.equal(job.steps.length, 4);
  const kws = job.env.KEYWORDS.split('\n').filter(Boolean);
  assert.equal(kws.length, 28);
  assert.equal(new Set(kws).size, 28);
  assert.deepEqual(kws, KEYWORDS);
  assert.equal(job.env.START_DATE, '2026-07-23');
  assert.equal(job.env.END_DATE, '2026-10-23');
});

test('bing-key-test.yml is unchanged by this job (still 2 run steps, no uses)', () => {
  const y = parseYaml(fs.readFileSync(path.join(root, '.github/workflows/bing-key-test.yml'), 'utf8'));
  assert.ok(y.jobs['bing-key-test'].steps.every((s) => !('uses' in s)));
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
  'timeout 60': swap('timeout-minutes: 10', 'timeout-minutes: 60'),
  'checkout step': swap('    steps:\n', '    steps:\n      - uses: actions/checkout@v4\n'),
  'unpinned artifact': swap(ARTIFACT, 'actions/upload-artifact@v4'),
  'retention 90': swap('retention-days: 30', 'retention-days: 90'),
  'key from vars': swap('KEY: ${{ secrets.BING_WEBMASTER_API_KEY }}', 'KEY: ${{ vars.BING_KEY }}'),
  'other secret': swap('      API: https', '      TOK: ${{ secrets.GITHUB_TOKEN }}\n      API: https'),
  'empty check exit 0': swap('            exit 1\n          fi\n          echo "::add-mask', '            exit 0\n          fi\n          echo "::add-mask'),
  'remove add-mask': swap('          echo "::add-mask::$KEY"\n', ''),
  'set -x': swap('set -uo pipefail', 'set -uxo pipefail'),
  'set -e aborts on first failure': swap('set -uo pipefail', 'set -euo pipefail'),
  'set +e removed': swap('          set +e\n', ''),
  'POST': swap('"$API/GetKeyword" --data-urlencode', '"$API/GetKeyword" -X POST --data-urlencode'),
  'raw -d': swap('"$API/GetKeywordStats" --data-urlencode', '"$API/GetKeywordStats" -d x=1 --data-urlencode'),
  'verbose curl': swap('curl -sS -G --max-time 30 -o "$BODY" -w \'%{http_code}\' "$API/GetKeyword"', 'curl -v -sS -G --max-time 30 -o "$BODY" -w \'%{http_code}\' "$API/GetKeyword"'),
  'param not urlencoded': swap('--data-urlencode "country=us" --data-urlencode "language=en-US" --data-urlencode "startDate', '--data "country=us" --data-urlencode "language=en-US" --data-urlencode "startDate'),
  'write method': swap('"$API/GetKeywordStats"', '"$API/SubmitUrl"'),
  'third curl': swap('            sleep 1\n            RC=0\n', '            sleep 1\n            curl -sS -G -o "$BODY" "$API/GetUserSites" 2>"$ERR"\n            RC=0\n'),
  'curl stderr uncaptured': swap('--data-urlencode "apikey=$KEY" 2>"$ERR") || RC=$?\n            if [ "$RC" != "0" ]; then\n              printf \'"%s",,,000', '--data-urlencode "apikey=$KEY") || RC=$?\n            if [ "$RC" != "0" ]; then\n              printf \'"%s",,,000'),
  'echo key': swap('echo "GetKeyword \\"$KW\\": HTTP 200"', 'echo "GetKeyword \\"$KW\\": HTTP 200 $KEY"'),
  'echo URL': swap('echo "GetKeyword \\"$KW\\": HTTP 200"', 'echo "$API/GetKeyword?apikey=x"'),
  'print body on error': swap('echo "GetKeyword \\"$KW\\": HTTP $CODE (request failed; response body not shown)"', 'cat "$BODY"'),
  'print .Message': swap('echo "GetKeyword \\"$KW\\": HTTP $CODE (request failed; response body not shown)"', 'echo "$(jq -r .Message "$BODY" 2>/dev/null)"'),
  'print stderr': swap('echo "GetKeyword \\"$KW\\": transport error (curl exit $RC)"', 'echo "err: $(head -c 200 "$ERR")"'),
  'sed redaction': swap('tr -d \'"\'', 'sed s/a/b/'),
  'jq stderr shown': swap('"$KW_JQ" "$BODY" 2>/dev/null) || ROW=""', '"$KW_JQ" "$BODY") || ROW=""'),
  'remove trap': swap('          trap \'rm -f "$BODY" "$ERR"\' EXIT\n', ''),
  'trap misses ERR': swap('trap \'rm -f "$BODY" "$ERR"\' EXIT', 'trap \'rm -f "$BODY"\' EXIT'),
  'no umask': swap('          umask 077\n', ''),
  'keyword dropped': swap('        vrr\n', ''),
  'keyword altered': swap('        g-sync compatible\n', '        gsync compatible\n'),
  'keyword added': swap('        ps5 120hz monitor\n', '        ps5 120hz monitor\n        extra\n'),
  'wrong start date': swap('START_DATE: 2026-07-23', 'START_DATE: 2026-01-01'),
  'wrong country': swap('--data-urlencode "country=us" --data-urlencode "language=en-US" --data-urlencode "startDate', '--data-urlencode "country=de" --data-urlencode "language=en-US" --data-urlencode "startDate'),
  'no all-fail exit': swap('            echo "::error::All Bing API calls failed."\n            exit 1\n', '            echo "::error::All Bing API calls failed."\n            true\n'),
  'remove leak guard': swap('          if grep -qF -- "$KEY" keywords.csv keyword_stats.csv; then', '          if false; then'),
  'leak guard no exit': swap('refusing to upload."\n            exit 1', 'refusing to upload."\n            true'),
  'leak guard conditional': swap('      - name: Key leak guard\n', '      - name: Key leak guard\n        if: false\n'),
  'upload before guard': (() => {
    const up = WF.slice(WF.indexOf('      - name: Upload CSVs'));
    const rest = WF.slice(0, WF.indexOf('      - name: Upload CSVs'));
    const g = rest.indexOf('      - name: Key leak guard');
    return rest.slice(0, g) + up + rest.slice(g);
  })(),
  'no sleep': WF.replace(/^\s*sleep 1\n/gm, ''),
};

for (const [name, mutated] of Object.entries(MUTATIONS)) {
  test(`bing-keyword-pull mutation is rejected: ${name}`, () => {
    assert.notEqual(mutated, WF);
    assert.ok(checkWorkflow(mutated).length > 0, `checker accepted unsafe mutation: ${name}`);
  });
}

// REM01 (BINGKW-QA-001): execute the real jq filters from the workflow against fixtures.
const HAS_JQ = spawnSync('jq', ['--version']).status === 0;
const JOBENV = parseYaml(WF).jobs['bing-keyword-pull'].env;
const runJq = (filter, k, body) => execFileSync('jq', ['-r', '--arg', k ? 'k' : 'k', k, filter], { input: typeof body === 'string' ? body : JSON.stringify(body) }).toString();
const jqTest = (name, fn) => test(name, { skip: HAS_JQ ? false : 'jq not installed; executable jq fixture tests skipped' }, fn);

test('workflow uses the env jq filters (no inline jq programs)', () => {
  assert.match(WF, /jq -r --arg k "\$KW" "\$KW_JQ" "\$BODY" 2>\/dev\/null/);
  assert.match(WF, /jq -r --arg k "\$KW" "\$STATS_JQ" "\$BODY" 2>\/dev\/null/);
  assert.equal((WF.match(/jq -r/g) || []).length, 2);
});

const KW_CASES = {
  'object': [{ d: { Query: 'hdmi', Impressions: 12, BroadImpressions: 34 } }, '"hdmi","12","34","200",""\n'],
  'array picks matching Query': [{ d: [{ Query: 'other', Impressions: 1, BroadImpressions: 2 }, { Query: 'hdmi', Impressions: 0, BroadImpressions: 5 }] }, '"hdmi","0","5","200",""\n'],
  'array without match picks first object': [{ d: [7, { Query: 'x', Impressions: 3 }] }, '"hdmi","3","","200",""\n'],
  'empty array': [{ d: [] }, '"hdmi","","","200","no data"\n'],
  'null d': [{ d: null }, '"hdmi","","","200","no data"\n'],
  'missing d': [{}, '"hdmi","","","200","no data"\n'],
};
for (const [n, [body, want]] of Object.entries(KW_CASES)) {
  jqTest(`KW_JQ fixture: ${n}`, () => assert.equal(runJq(JOBENV.KW_JQ, 'hdmi', body), want));
}

const STATS_CASES = {
  'object with ISO date': [{ d: { Date: '2026-10-19T00:00:00', Impressions: 4, BroadImpressions: 8 } }, '"vrr","2026-10-19T00:00:00","4","8","200",""\n'],
  'plain date kept': [{ d: [{ Date: '2026-10-19', Impressions: 1, BroadImpressions: 2 }] }, '"vrr","2026-10-19","1","2","200",""\n'],
  '/Date(ms)/': [{ d: [{ Date: '/Date(1729468800000)/', Impressions: 5, BroadImpressions: 9 }] }, '"vrr","2024-10-21","5","9","200",""\n'],
  '/Date(ms+0000)/ and -0700': [{ d: [{ Date: '/Date(1729468800000+0000)/', Impressions: 5 }, { Date: '/Date(1730073600000-0700)/', BroadImpressions: 10 }] }, '"vrr","2024-10-21","5","","200",""\n"vrr","2024-10-28","","10","200",""\n'],
  'missing and null date -> empty': [{ d: [{ Impressions: 2 }, { Date: null, Impressions: 3 }] }, '"vrr","","2","","200",""\n"vrr","","3","","200",""\n'],
  'multiple rows mixed formats': [{ d: [{ Date: '/Date(1729468800000)/', Impressions: 1, BroadImpressions: 1 }, { Date: '2024-10-28', Impressions: 2, BroadImpressions: 2 }, { Date: '/Date(1730678400000)/', Impressions: 3, BroadImpressions: 3 }] }, '"vrr","2024-10-21","1","1","200",""\n"vrr","2024-10-28","2","2","200",""\n"vrr","2024-11-04","3","3","200",""\n'],
  'null d -> no rows': [{ d: null }, ''],
  'empty array -> no rows': [{ d: [] }, ''],
  'non-object entries skipped': [{ d: [null, 'x', { Date: '2026-01-05', Impressions: 1 }] }, '"vrr","2026-01-05","1","","200",""\n'],
};
for (const [n, [body, want]] of Object.entries(STATS_CASES)) {
  jqTest(`STATS_JQ fixture: ${n}`, () => assert.equal(runJq(JOBENV.STATS_JQ, 'vrr', body), want));
}

jqTest('jq filters fail (non-zero) on non-JSON body so the workflow writes its fallback row', () => {
  assert.throws(() => execFileSync('jq', ['-r', '--arg', 'k', 'x', JOBENV.KW_JQ], { input: '<html>', stdio: ['pipe', 'pipe', 'ignore'] }));
  assert.throws(() => execFileSync('jq', ['-r', '--arg', 'k', 'x', JOBENV.STATS_JQ], { input: '<html>', stdio: ['pipe', 'pipe', 'ignore'] }));
});

jqTest('regression BINGKW-QA-001: unconditional capture would drop ISO dates', () => {
  const broken = JOBENV.STATS_JQ.replace(/\(if \(\$d \| test\([^)]*\)\) then (\(.*?\)) else \$d end\)/, '$1');
  assert.notEqual(broken, JOBENV.STATS_JQ);
  let out = '';
  try { out = runJq(broken, 'vrr', { d: [{ Date: '2026-10-19', Impressions: 1 }] }); } catch { out = 'ERROR'; }
  assert.notEqual(out, '"vrr","2026-10-19","1","","200",""\n');
});
