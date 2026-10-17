// Release-date gate for pages edited by a release candidate.
// Checks that each declared page's JSON-LD dateModified, visible "Updated:" date
// (where declared) and sitemap.xml lastmod all equal that page's declared date
// (page.intendedReleaseDate, else the top-level intendedReleaseDate).
// Release mode (--release) additionally requires owner confirmation and that the
// top-level declared date equals the actual ship date.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DECLARATION = 'docs/release-date-gate.json';
const PLACEHOLDERS = new Set(['', 'YYYY-MM-DD', 'TBD', 'TODO', '0000-00-00', '1970-01-01']);

export function isRealIsoDate(value) {
  if (typeof value !== 'string' || PLACEHOLDERS.has(value.trim().toUpperCase())) return false;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}

export function pageDeclaredDate(decl, page) {
  if (page && page.intendedReleaseDate !== undefined && page.intendedReleaseDate !== null) {
    return page.intendedReleaseDate;
  }
  return decl && decl.intendedReleaseDate;
}

export function dateModifiedValues(html) {
  const out = [];
  for (const block of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    const walk = (node) => {
      if (Array.isArray(node)) return node.forEach(walk);
      if (node && typeof node === 'object') {
        if ('dateModified' in node) out.push(node.dateModified);
        Object.values(node).forEach(walk);
      }
    };
    walk(JSON.parse(block[1]));
  }
  return out;
}

export function visibleUpdatedValues(html) {
  return [...html.matchAll(/Updated:\s*([^<\s]*)/g)].map((m) => m[1]);
}

export function sitemapLastmod(xml, url) {
  const hits = [...xml.matchAll(/<url>\s*<loc>([^<]+)<\/loc>\s*<lastmod>([^<]*)<\/lastmod>/g)]
    .filter((m) => m[1].trim() === url)
    .map((m) => m[2].trim());
  return hits;
}

// Pure check: returns a list of problems (empty = pass).
export function checkConsistency(decl, readFile) {
  const problems = [];
  if (!isRealIsoDate(decl && decl.intendedReleaseDate)) {
    problems.push(`intendedReleaseDate is unset, a placeholder or not a real YYYY-MM-DD date: ${JSON.stringify(decl && decl.intendedReleaseDate)}`);
  }
  if (!decl || !Array.isArray(decl.pages) || decl.pages.length === 0) {
    problems.push('no pages declared');
    return problems;
  }
  const sitemap = readFile('sitemap.xml');
  for (const p of decl.pages) {
    const date = pageDeclaredDate(decl, p);
    if (!isRealIsoDate(date)) {
      problems.push(`${p.file}: page intendedReleaseDate is unset, a placeholder or not a real YYYY-MM-DD date: ${JSON.stringify(date)}`);
      continue;
    }
    const html = readFile(p.file);
    const dm = dateModifiedValues(html);
    if (dm.length !== 1) problems.push(`${p.file}: expected exactly 1 JSON-LD dateModified, found ${dm.length}`);
    for (const v of dm) if (v !== date) problems.push(`${p.file}: JSON-LD dateModified ${v} != declared ${date}`);
    const vis = visibleUpdatedValues(html);
    if (p.visibleUpdated) {
      if (vis.length !== 1) problems.push(`${p.file}: expected exactly 1 visible "Updated:" date, found ${vis.length}`);
      for (const v of vis) if (v !== date) problems.push(`${p.file}: visible Updated ${v} != declared ${date}`);
    } else if (vis.length !== 0) {
      problems.push(`${p.file}: has a visible "Updated:" date but the declaration says visibleUpdated=false`);
    }
    const lm = sitemapLastmod(sitemap, p.url);
    if (lm.length !== 1) problems.push(`sitemap.xml: expected exactly 1 entry for ${p.url}, found ${lm.length}`);
    for (const v of lm) if (v !== date) problems.push(`sitemap.xml: lastmod ${v} for ${p.url} != declared ${date}`);
  }
  return problems;
}

export function checkRelease(decl, shipDate) {
  const problems = [];
  if (!decl || decl.status !== 'CONFIRMED') problems.push(`status is ${JSON.stringify(decl && decl.status)}, must be "CONFIRMED" (owner-confirmed release date)`);
  if (!decl || typeof decl.confirmedBy !== 'string' || decl.confirmedBy.trim() === '') problems.push('confirmedBy is empty');
  if (!isRealIsoDate(shipDate)) problems.push(`ship date is not a real YYYY-MM-DD date: ${JSON.stringify(shipDate)}`);
  else if (decl && decl.intendedReleaseDate !== shipDate) problems.push(`declared date ${decl.intendedReleaseDate} != actual ship date ${shipDate}`);
  return problems;
}

export function todayCopenhagen(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Copenhagen', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function loadDeclaration() {
  return JSON.parse(fs.readFileSync(path.join(root, DECLARATION), 'utf8'));
}

export const readRepoFile = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const decl = loadDeclaration();
  const problems = checkConsistency(decl, readRepoFile);
  if (process.argv.includes('--release')) {
    const arg = process.argv.find((a) => a.startsWith('--ship-date='));
    problems.push(...checkRelease(decl, arg ? arg.slice('--ship-date='.length) : todayCopenhagen()));
  }
  if (problems.length) {
    console.error('RELEASE-DATE GATE: FAIL\n- ' + problems.join('\n- '));
    process.exit(1);
  }
  console.log(`RELEASE-DATE GATE: PASS (${decl.intendedReleaseDate}, ${decl.pages.length} pages, status ${decl.status})`);
}
