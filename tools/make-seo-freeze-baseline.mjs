// Usage: node tools/make-seo-freeze-baseline.mjs <git-ref>  -> docs/seo-freeze-baseline.json
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { extract } from '../tests/seo-freeze-extract.mjs';
const ref = process.argv[2] || 'main';
const files = execFileSync('git', ['ls-tree', '-r', '--name-only', ref], { encoding: 'utf8' }).split('\n').filter((f) => f.endsWith('.html'));
const sha = execFileSync('git', ['rev-parse', ref], { encoding: 'utf8' }).trim();
const pages = {};
for (const f of files) {
  const e = extract(execFileSync('git', ['show', `${ref}:${f}`], { encoding: 'utf8', maxBuffer: 1 << 26 }));
  const { withoutThemeLink, ...fields } = e;
  pages[f] = { ...fields, fullSha256: crypto.createHash('sha256').update(withoutThemeLink).digest('hex') };
}
fs.writeFileSync('docs/seo-freeze-baseline.json', JSON.stringify({ ref, sha, pages }, null, 1) + '\n');
console.log(files.length, 'pages from', sha);
