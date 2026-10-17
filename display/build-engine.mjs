// Embeds display/standards.json into display/engine-display.js (no runtime fetch; works from file:// and GitHub Pages).
// Usage: node display/build-engine.mjs   (tests assert the embedded copy equals standards.json)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(dir, 'engine-display.src.js'), 'utf8');
const std = JSON.stringify(JSON.parse(fs.readFileSync(path.join(dir, 'standards.json'), 'utf8')));
fs.writeFileSync(path.join(dir, 'engine-display.js'), src.replace('/*@@STANDARDS@@*/ null', std));
console.log('engine-display.js written');
