// Generates the static (crawlable, no-JavaScript) tables and source lists in the Display & Connection pages
// from display/engine-display.js and display/standards.json, so page numbers cannot drift from the engine.
// Usage: node display/build-pages.mjs        (tests/display-pages.test.mjs asserts the pages are up to date)
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
export const root = path.resolve(dir, '..');
const E = createRequire(import.meta.url)(path.join(dir, 'engine-display.js'));

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const COLS = [
  ['HDMI-TMDS-18', 'HDMI 2.0 class<br>18 Gbit/s'],
  ['HDMI-FRL-48', 'HDMI 2.1 FRL<br>48 Gbit/s'],
  ['DP-HBR2-x2', 'USB-C Alt Mode<br>2 lanes, DP 1.2'],
  ['DP-HBR3-x2', 'USB-C Alt Mode<br>2 lanes, DP 1.4'],
  ['DP-HBR2-x4', 'DP 1.2 HBR2<br>(4 lanes)'],
  ['DP-HBR3-x4', 'DP 1.4 HBR3<br>(4 lanes)'],
  ['DP-UHBR20-x4', 'DP 2.x UHBR20']
];
const MODES = [[1920, 1080, 144], [1920, 1080, 240], [2560, 1440, 144], [2560, 1440, 165], [2560, 1440, 240], [3440, 1440, 100], [3440, 1440, 144], [3440, 1440, 165], [3840, 2160, 60], [3840, 2160, 120], [3840, 2160, 144]];
const RES = [[1920, 1080], [2560, 1440], [3440, 1440], [3840, 2160], [5120, 1440]];
const fmt = (x) => (Math.round(x * 100) / 100).toFixed(2);
const cell = (a) => a.verdict === 'FAIL' ? 'FAIL: exceeds' : a.assessment === 'EXCEEDS' ? 'UNKNOWN: over DERIVED payload' : 'Not ruled out';

function head(title) {
  return '<thead><tr><th scope="col">' + title + '</th>' + COLS.map(([, l]) => '<th scope="col">' + l + '</th>').join('') + '</tr></thead>';
}
const payloadRow = () => '<tr class="payload"><th scope="row">Usable payload, Gbit/s</th>' + COLS.map(([id]) => { const r = E.STANDARDS.links.find((x) => x.id === id); return '<td>' + fmt(r.payload_gbps) + (r.status === 'DERIVED' ? ' (DERIVED)' : '') + '</td>'; }).join('') + '</tr>';

export function linkTable(bpc = 8) {
  const rows = MODES.map(([w, h, hz]) => {
    const m = { h_active: w, v_active: h, refresh_hz: hz, bit_depth_bpc: bpc, chroma: 'RGB' };
    const need = E.requiredBitrate(m, 'DP').value;
    return '<tr><th scope="row">' + w + '×' + h + ' @ ' + hz + ' Hz<br><span class="sub">needs ≥ ' + fmt(need) + ' Gbit/s</span></th>' + COLS.map(([id]) => '<td>' + cell(E.assessLink(m, id)) + '</td>').join('') + '</tr>';
  }).join('\n');
  return '<div class="tablewrap" role="region" aria-label="Which links can carry common modes, ' + bpc + '-bit RGB" tabindex="0"><table>\n<caption>' + bpc + '-bit RGB, active pixels only (blanking adds more). “FAIL: exceeds” is definite; “Not ruled out” still needs the monitor’s timing or a verified mode.</caption>\n' + head('Mode') + '\n<tbody>\n' + payloadRow() + '\n' + rows + '\n</tbody></table></div>';
}
export function maxRefreshTable(bpc = 8) {
  const rows = RES.map(([w, h]) => '<tr><th scope="row">' + w + '×' + h + '</th>' + COLS.map(([id]) => '<td>' + E.assessLink({ h_active: w, v_active: h, refresh_hz: 60, bit_depth_bpc: bpc, chroma: 'RGB' }, id).max_refresh_upper_bound_hz + ' Hz</td>').join('') + '</tr>').join('\n');
  return '<div class="tablewrap" role="region" aria-label="Calculated refresh ceilings, ' + bpc + '-bit RGB" tabindex="0"><table>\n<caption>Calculated ceiling before blanking, ' + bpc + '-bit RGB. The real maximum is lower once blanking is added, and only a verified mode on your monitor’s input proves a rate.</caption>\n' + head('Resolution') + '\n<tbody>\n' + rows + '\n</tbody></table></div>';
}
export function sourcesList(ids) {
  return '<ul class="srclist">\n' + ids.map((id) => {
    const s = E.source(id);
    return '<li id="src-' + id + '"><a href="' + esc(s.url) + '" rel="noopener">' + esc(s.title) + '</a> — ' + esc(s.publisher) + ', checked ' + s.checked_at.replace('T', ' ').slice(0, 16) + ' CEST' + (s.page_date ? ' (page updated ' + s.page_date + ')' : '') + '</li>';
  }).join('\n') + '\n</ul>';
}

export const GENERATORS = {
  'link-table-8': () => linkTable(8),
  'link-table-10': () => linkTable(10),
  'max-refresh-8': () => maxRefreshTable(8),
  'max-refresh-10': () => maxRefreshTable(10),
  'sources-solver': () => sourcesList(['V1', 'V2', 'V3', 'V4', 'A1', 'A2', 'H1', 'H2', 'MS1', 'MS2', 'MS3', 'MS4', 'MS5', 'PL1', 'PL2', 'PL3', 'PL4', 'PL5']),
  'sources-nosignal': () => sourcesList(['MS1', 'MS5', 'MS2', 'MS4', 'PL1', 'PL2', 'PL3', 'PL4', 'DL1', 'DL2', 'DL3', 'DL4', 'HP1', 'IN1', 'IN2', 'NV1', 'NV2', 'HL1']),
  'sources-usbc': () => sourcesList(['A1', 'A2', 'V2', 'V3', 'MS2', 'PL1', 'PL2', 'PL3', 'PL5']),
  'sources-60hz': () => sourcesList(['MS3', 'PL1', 'PL2', 'PL4', 'PL5', 'V1', 'V3', 'H1', 'H2', 'V4'])
};
export const PAGES = ['guides/display-connection-solver.html', 'guides/external-monitor-not-detected.html', 'guides/usb-c-dock-display-limits.html', 'guides/monitor-stuck-at-60hz.html'];
const RE = /(<!-- @@GEN:([a-z0-9-]+) -->)[\s\S]*?(<!-- @@END -->)/g;
export function render(html) {
  return html.replace(RE, (_, open, name, close) => {
    if (!GENERATORS[name]) throw new Error('unknown generator ' + name);
    return open + '\n' + GENERATORS[name]() + '\n' + close;
  });
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  for (const p of PAGES) {
    const f = path.join(root, p);
    if (!fs.existsSync(f)) continue;
    fs.writeFileSync(f, render(fs.readFileSync(f, 'utf8')));
    console.log('rendered', p);
  }
}
