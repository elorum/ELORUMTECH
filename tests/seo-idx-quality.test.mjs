// SEO-IDX-QUALITY-01 (ELORUMTECH-SEO-IDXQUALITY-20261023-01): the 9 crawled-not-indexed URLs.
// Visible Updated + "By ELORUMTECH" byline (organisation) + Last reviewed 2026-10-23, JSON-LD dateModified and
// author/publisher Organization, sitemap lastmod + release gate, frozen SEO fields (title, meta, H1, canonical,
// FAQ JSON-LD, visible FAQ) hashed against main 275cdd8, and on the four thin guides a sourced table: every figure
// sits next to its [ID] and appears in that source's verbatim quote in docs/sources/<page>.json (mutants below).
// Plus hub → guide links (cards + reference-table anchors that exist), one theme link, .tablewrap convention.
// REM01 (ELORUMTECH-SEO-IDXQUALITY-20261023-01-REM01, owner-approved fix of QA-01 F1–F4): the MacBook lead + FAQ
// (visible and JSON-LD) no longer say most MacBooks lack HDMI, the A2119 60 Hz row lists every MacBook Apple names,
// the adapter page's FAQ JSON-LD equals its visible answers, and the hub's reference block links only table sections.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const BASE = 'https://elorumtech.elorum.world/';
const DATE = '2026-10-23';
const THEME = '<link rel="stylesheet" href="/assets/elorum-theme.css">';
const C = (id) => `<a class="srcs" href="#src-${id}">[${id}]</a>`;
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', rsquo: '’', ldquo: '“', rdquo: '”', '#x27': "'", '#39': "'" };
const txt = (s) => s.replace(/<[^>]+>/g, '').replace(/&(#?[a-z0-9]+);/g, (m, n) => ENT[n] ?? m).replace(/\s+/g, ' ').trim();
const main = (html) => (html.match(/<main>[\s\S]*?(?=<section class="sources")/) || [''])[0];
const lds = (html) => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));

// sha256 of title, meta description, H1, canonical, FAQPage JSON-LD and the visible FAQ section, computed on
// main 275cdd8fb68251587a728d924c6287f6f4efbc18. These must not change in this job.
const frozen = (h) => {
  const g = (re) => (h.match(re) || [, ''])[1];
  const faqLd = [...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]).filter((x) => /"FAQPage"/.test(x));
  const faq = (h.match(/<section class="faq"[\s\S]*?<\/section>/) || [''])[0];
  return crypto.createHash('sha256').update([g(/<title>([^<]*)<\/title>/), g(/<meta name="description" content="([^"]*)">/), g(/<h1[^>]*>([\s\S]*?)<\/h1>/), g(/rel="canonical" href="([^"]*)"/), faqLd.join('\n'), faq].join('\u0000')).digest('hex');
};
const FROZEN = {
  'guides/display-connection-solver.html': 'f5eb5cc53801b5bb2ddb0e604c5dd372ec8fa5ffb51064c305b64e4f3c69e830',
  'guides/external-monitor-not-detected.html': '556437be15ad16fd023ba43589443c6ec3580cf1785ada0e949f2eeafd61209f',
  'guides/thunderbolt-dock-one-cable-4k-120.html': '6795304a91b1fdfe34dc1d6a7d0aa07891ee0f7dc880b0c2eeba9540c99fa212',
  'guides/displayport-monitor-connection-path.html': '2b75fbc16af643e2f778d3d932107d8f1e277c14ce24a4830f8cf7a79d2d3aff',
  'guides/usb-c-hub-vs-dock.html': 'a66720b6f8d1760b875ee5267ed941140c77824ae270e357b04c9d7637f5d445',
  'guides/usb-c-to-hdmi-adapter-path.html': '2c3e964a6e375dfc7d099ee67aaec16734060d9d0403300905d2dabc81de68ea',
  'guides/macbook-to-hdmi-display.html': '9bb6478959fe8b813cb6dbe56dd7fb84a30698ee325b509956f8a04e021767d7',
  'guides/bios-fast-boot-troubleshooter.html': '720edb2a13ef433e0a2a407094bd5ac455f32211c42e70d278b9ed154061f219',
  'guides/index.html': '5824f9d90aaa22901d3cdcdb3a52065385c7d7259158ff69472d9b1af58c0edd',
};
const PAGES = Object.keys(FROZEN);
// REM01 deliberately changes the FAQ on these two pages; their title, meta description, H1 and canonical stay frozen
// (sha256 of those four fields only, computed on main 275cdd8) and the FAQ is pinned by text in the REM01 tests below.
const frozenHead = (h) => {
  const g = (re) => (h.match(re) || [, ''])[1];
  return crypto.createHash('sha256').update([g(/<title>([^<]*)<\/title>/), g(/<meta name="description" content="([^"]*)">/), g(/<h1[^>]*>([\s\S]*?)<\/h1>/), g(/rel="canonical" href="([^"]*)"/)].join('\u0000')).digest('hex');
};
const REM01_FAQ = {
  'guides/macbook-to-hdmi-display.html': 'f64c9db82f0c34c05553441da081368103f91798c3e46b3135424b37d6722973',
  'guides/usb-c-to-hdmi-adapter-path.html': '7ac9bd90c27d0d921de5ae0607a344b4a52ab290933ebbcfa23a6447586d6389',
};
// Pages this job edits (the other two already shipped the same treatment in SEO-NOSIGNAL-01 / SEO-TBDOCK-01).
const EDITED = PAGES.filter((f) => !/external-monitor-not-detected|thunderbolt-dock-one-cable/.test(f));
const urlOf = (f) => BASE + (f === 'guides/index.html' ? 'guides/' : f);

// Standards bodies (HDMI Forum, HDMI LA, VESA, USB-IF), Intel and device-maker pages only.
const PRIMARY = /^https:\/\/(hdmiforum\.org|www\.hdmi\.org|vesa\.org|www\.displayport\.org|www\.usb\.org|www\.thunderbolttechnology\.net\/sites\/default\/files|www\.intel\.com\/content\/dam|support\.apple\.com|www\.xbox\.com\/en-US\/consoles)\//;

// MacBook models Apple names for the A2119 adapter (AP2), in Apple's order (REM01 F2: quoted in full, none dropped).
const A2119_60 = ['16-inch MacBook Pro introduced in 2019 or later', '15-inch MacBook Pro introduced in 2017 or later', '14-inch MacBook Pro introduced in 2021 or later', '13-inch MacBook Pro with Apple silicon introduced in 2020 or later', '13-inch MacBook Pro with four Thunderbolt 3 ports introduced in 2020', 'MacBook Air introduced in 2020 or later'];
const A2119_30 = ['13-inch MacBook Pro introduced in 2016 or later', 'MacBook introduced in 2015 or later'];

// [value on page, source id cited in the same element, value as it appears in the source quote]
const SOURCED = {
  'guides/displayport-monitor-connection-path.html': {
    ids: ['V1', 'V2', 'V3', 'V4', 'VA1', 'IN1', 'XB1'],
    rows: ['DisplayPort 1.4 (HBR3)', 'DisplayPort 2.1 UHBR10 (DP40 cable)', 'DisplayPort 2.1 UHBR13.5 (DP80 cable)', 'DisplayPort 2.1 UHBR20 (DP80 cable)', 'USB-C DP Alt Mode, all 4 lanes at 5.4 Gbps', 'USB-C DP Alt Mode, 2 lanes at 8.1 Gbps + USB data', 'Thunderbolt 4 host', 'Xbox Series X'],
    figures: [
      ['8.1 Gbps per lane, 32.4 Gbps over 4 lanes', 'V1', 'Up to 8.1 Gbps per lane–32.4 Gbps over 4 lanes'],
      ['25.92 Gbps after overhead', 'V1', '25.92 Gbps over 4 lanes'],
      ['8K at 60 Hz with 24-bit colour', 'V4', '8K video at 60Hz and 24-bit color'],
      ['2:1 compression', 'V4', 'using a low 2:1 compression ratio'],
      ['10 Gbps per lane, 40 Gbps over 4 lanes', 'V2', 'UHBR10 link rate (10 Gbps), with four lanes, providing a maximum throughput of 40 Gbps'],
      ['13.5 Gbps per lane', 'V3', 'UHBR13.5 link rate (13.5 Gbps)'],
      ['20 Gbps per lane, 80 Gbps over 4 lanes', 'V2', 'UHBR20 link rate (20 Gbps), with four lanes, providing a maximum throughput of 80 Gbps'],
      ['DP 2.1 mandates DSC support', 'V2', 'mandated support for VESA’s visually lossless Display Stream Compression (DSC) codec'],
      ['5.4 Gbps on each of the four high-speed lanes', 'VA1', 'Using 5.4 Gbps across all four high-speed lanes'],
      ['Up to 4K (4096 × 2160) at 60 Hz, up to 30-bit colour', 'VA1', 'up to 4K (4096 x 2160) display resolutions at a 60Hz frame rate with up to 30-bit color'],
      ['8.1 Gbps per lane on two lanes, plus SuperSpeed USB up to 10 Gbps each way', 'VA1', 'two lanes for DisplayPort at 8.1 Gbps per lane would allow simultaneous transfer of SuperSpeed USB data (up to 10 Gbps in each direction)'],
      ['One 4K UHD (3840 × 2160) monitor', 'VA1', 'a 4K UHD (3840 x 2160) DisplayPort monitor'],
      ['40Gb/s', 'IN1', '40Gb/s performance'],
      ['two 4K displays or one 8K display', 'IN1', 'Support for two 4K displays or one 8K display'],
      ['1x HDMI 2.1 port', 'XB1', '1x HDMI 2.1 port'],
      ['uncompressed 8K 60Hz HDR, 4K 240Hz HDR, two 4K 120Hz HDR or four 4K 60Hz HDR', 'V3', 'uncompressed 8K 60Hz HDR, 4K 240Hz HDR, two 4K 120Hz HDR or four 4K 60Hz HDR displays through a single cable'],
      ['a DP certified adapter cable is best', 'V4', 'it is best to use a DP certified adapter cable'],
      ['poor picture quality, intermittent operation or no video', 'V4', 'poor picture quality, intermittent operation, or no video display'],
      ['full-feature passive USB-C cables already support UHBR speeds', 'V3', 'full-feature passive USB-C cables already support UHBR bit rate speeds'],
    ],
  },
  'guides/usb-c-hub-vs-dock.html': {
    ids: ['VA1', 'V4', 'U1', 'IN1', 'IN2', 'U2'],
    rows: ['USB-C DP Alt Mode, all 4 lanes for video', 'USB-C DP Alt Mode, 2 lanes video + 2 lanes USB', 'USB4', 'Thunderbolt 4', 'Thunderbolt 5', 'USB Power Delivery (on any of the above)'],
    figures: [
      ['5.4 Gbps on each of the four high-speed lanes', 'VA1', 'Using 5.4 Gbps across all four high-speed lanes'],
      ['USB data falls back to USB 2.0 on separate pins', 'VA1', 'USB 2.0 data can still be carried across the USB Type-C connection using separate pins'],
      ['Up to 4K (4096 × 2160) at 60 Hz at 5.4 Gbps per lane', 'VA1', 'up to 4K (4096 x 2160) display resolutions at a 60Hz frame rate'],
      ['a monitor up to 5K (5120 × 2880) with all four lanes', 'VA1', 'When using all four lanes for DisplayPort Alt Mode, which could drive a monitor with up to 5K (5120 x 2880) resolution'],
      ['8.1 Gbps per lane on two lanes, plus SuperSpeed USB up to 10 Gbps each way', 'VA1', 'two lanes for DisplayPort at 8.1 Gbps per lane would allow simultaneous transfer of SuperSpeed USB data (up to 10 Gbps in each direction)'],
      ['One 4K UHD (3840 × 2160) monitor', 'VA1', 'a 4K UHD (3840 x 2160) DisplayPort monitor'],
      ['DisplayPort, USB data and USB Power Delivery can share one USB-C cable', 'V4', 'DisplayPort, USB data, and USB Power Delivery can all be carried simultaneously through the same USB Type-C connector and cable'],
      ['Up to 80 Gbps over 80 Gbps certified cables', 'U1', 'up to 80 Gbps operation over 80 Gbps certified cables'],
      ['one link is shared dynamically between device types', 'U1', 'dynamically share a single high-speed link with multiple end device types'],
      ['Multiple simultaneous data and display protocols', 'U1', 'multiple simultaneous data and display protocols'],
      ['40Gb/s', 'IN1', '40Gb/s performance'],
      ['two 4K displays or one 8K display', 'IN1', 'Support for two 4K displays or one 8K display'],
      ['PC charging required on at least one port, for thin and light notebooks that need less than 100W', 'IN1', 'For thin and light notebooks that require less than 100W to charge'],
      ['80 Gbps both ways', 'IN2', 'delivers 80 Gbps of bidirectional bandwidth'],
      ['120 Gbps transmit with 40 Gbps receive', 'IN2', 'dedicating 120 Gbps for transmit traffic while providing 40 Gbps for receive'],
      ['Up to 240W {IN2}', 'IN2', 'deliver up to 240W of power'],
      ['28V, 36V and 48V give 140W, 180W and 240W', 'U2', 'New 28V, 36V, and 48V fixed voltages enable up to 140W, 180W and 240W power levels'],
      ['Up to 240W; 28V', 'U2', 'Increased power levels from existing USB standards up to 240W.'],
    ],
  },
  'guides/usb-c-to-hdmi-adapter-path.html': {
    ids: ['VA1', 'HL2', 'HF1', 'HF2', 'HL1', 'AP2'],
    rows: ['Host USB-C, DP Alt Mode on all 4 lanes at 5.4 Gbps', 'Adapter with HDMI 1.4b output', 'Adapter with HDMI 2.0 output', 'Adapter with HDMI 2.1 output'],
    figures: [
      ['5.4 Gbps on each of the four high-speed lanes', 'VA1', 'Using 5.4 Gbps across all four high-speed lanes'],
      ['Up to 4K (4096 × 2160) at 60 Hz, up to 30-bit colour', 'VA1', 'up to 4K (4096 x 2160) display resolutions at a 60Hz frame rate with up to 30-bit color'],
      ['drives an HDMI display', 'VA1', 'can use an appropriate adaptor to drive an HDMI, DVI or VGA display'],
      ['3840×2160 at 24, 25 and 30 Hz', 'HL2', '3840×2160 at 24, 25, and 30 Hz'],
      ['4096×2160 at 24 Hz', 'HL2', '4096×2160 at 24 Hz'],
      ['1920×1080 at 120 Hz', 'HL2', '1920×1080 at 120 Hz'],
      ['High Speed HDMI Cable {HL2}', 'HL2', 'can be support with the High Speed HDMI Cable'],
      ['Up to 18 Gbps', 'HF1', 'up to 18Gbps'],
      ['4K at 50/60 Hz (2160p)', 'HF1', '4K@50/60 (2160p)'],
      ['Existing High Speed (category 2) cables', 'HF1', 'Current High Speed cables (category 2 cables) are capable of carrying the increased bandwidth'],
      ['Up to 48 Gbps', 'HF2', 'increased up to 48Gbps'],
      ['4K120 and 8K60', 'HF2', '8K60 and 4K120'],
      ['Ultra High Speed HDMI Cable, for up to 48Gbps', 'HL1', 'supporting up to 48Gbps maximum bandwidth'],
      ['model A1621 supports 3840 x 2160 at 30Hz and up to 1080p at 60Hz', 'AP2', 'Model A1621 supports these resolutions and refresh rates when used with macOS Sierra 10.12 or later or iOS 12 or later: 3840 x 2160 at 30Hz Up to 1080p at 60Hz'],
      ['model A2119 supports 3840 x 2160 at 60Hz', 'AP2', '3840 x 2160 at 60Hz with these devices'],
    ],
  },
  'guides/macbook-to-hdmi-display.html': {
    ids: ['AP1', 'AP2', 'HL1'],
    rows: ['MacBook Pro introduced in 2021 or later, built-in HDMI port', 'MacBook Pro introduced in 2012 through 2015, built-in HDMI port', 'USB-C Mac with the older adapter (macOS Sierra 10.12 or later)', `${A2119_60.join(', ')}; over USB-C`, `${A2119_30.join(', ')}; over USB-C`],
    figures: [
      ['MacBook Pro models introduced in 2021 or later have their own HDMI port', 'AP1', 'to the HDMI port on these Mac models: Mac Studio introduced in 2022 or later Mac mini introduced in 2018 or later Mac Pro introduced in 2019 or later MacBook Pro introduced in 2021 or later'],
      ['connect directly with an HDMI cable', 'AP1', 'Connect directly to HDMI with an HDMI cable'],
      ['Up to 8K at 60Hz, or up to 4K at 240Hz', 'AP1', 'up to 8K at 60Hz to the HDMI port on these Mac models: MacBook Pro with M4, M5, M2 Pro, M3 Pro, M4 Pro, M5 Pro, M2 Max, M3 Max, M4 Max, or M5 Max introduced in 2023 or later'],
      ['or up to 4K at 240Hz', 'AP1', 'up to 4K at 240Hz to the HDMI port on these Mac models: MacBook Pro with M4, M5, M2 Pro, M3 Pro, M4 Pro, M5 Pro, M2 Max, M3 Max, M4 Max, or M5 Max introduced in 2023 or later'],
      ['Ultra High Speed 48 Gbps HDMI cable for 8K', 'AP1', 'For 8K connections, use an Ultra High Speed 48 Gbps HDMI cable'],
      ['adapters aren’t supported for these modes', 'AP1', "Adapters aren't supported for these resolutions and refresh rates."],
      ['Up to 4K at 60Hz', 'AP1', 'up to 4K at 60Hz to the HDMI port on these Mac models'],
      ['Up to 4K at 30Hz', 'AP1', 'up to 4K at 30Hz to the HDMI port on these Mac models: Mac mini introduced in 2012 through 2014 Mac Pro introduced in 2013 MacBook Pro introduced in 2012 through 2015'],
      ['3840 x 2160 at 60Hz', 'AP2', '3840 x 2160 at 60Hz with these devices: 16-inch MacBook Pro introduced in 2019 or later'],
      ['macOS Mojave 10.14.6 or later', 'AP2', 'when used with macOS Mojave 10.14.6 or later'],
      ['3840 x 2160 at 30Hz {AP2}', 'AP2', '3840 x 2160 at 30Hz with these devices: 13-inch MacBook Pro introduced in 2016 or later MacBook introduced in 2015 or later'],
      ['3840 x 2160 at 30Hz; up to 1080p at 60Hz', 'AP2', 'iOS 12 or later: 3840 x 2160 at 30Hz Up to 1080p at 60Hz'],
      ['model A1621', 'AP2', 'Model A1621 supports these resolutions'],
      ['the cable class for systems up to 48Gbps', 'HL1', 'applicable for system configurations supporting up to 48Gbps maximum bandwidth'],
      ['Apple lists a built-in HDMI port on MacBook Pro models introduced in 2021 or later', 'AP1', 'MacBook Pro introduced in 2021 or later'],
      ['and in 2012 through 2015; those connect directly with an HDMI cable', 'AP1', 'MacBook Pro introduced in 2012 through 2015'],
      ['HDMI adapter (or dock HDMI out) → HDMI cable → TV or monitor', 'AP1', 'USB-C port: Connect to HDMI with an adapter'],
    ],
  },
};
const srcOf = (file) => JSON.parse(read('docs/sources/' + path.basename(file).replace('.html', '.json')));

// Every smallest <li>/<td>/<p> in the article body that contains the value must also cite the source, and the
// source's recorded verbatim quote must contain the value as the source words it. "X {ID}" means the value must be
// immediately followed by the citation (used where the same words also appear next to a different source).
function figureOk(html, json, [onPage, id, inSource]) {
  const s = json.sources.find((x) => x.id === id);
  const m = onPage.match(/^(.*) \{([A-Z0-9]+)\}$/);
  if (m) return html.includes(`${m[1]} ${C(m[2])}`) && main(html).includes(`${m[1]} ${C(m[2])}`) && !!s && s.quotes.some((q) => q.includes(inSource));
  const blocks = [...main(html).matchAll(/<(li|td|p)\b[^>]*>([\s\S]*?)<\/\1>/g)].map((x) => x[2]);
  const hit = blocks.filter((b) => txt(b).includes(onPage));
  if (!hit.length) return false;
  return hit.every((b) => b.includes(C(id))) && !!s && s.quotes.some((q) => q.includes(inSource));
}

test('idxq: titles, meta descriptions, H1, canonical, FAQ JSON-LD and visible FAQ are unchanged from main 275cdd8', () => {
  for (const f of PAGES) {
    if (REM01_FAQ[f]) assert.equal(frozenHead(read(f)), REM01_FAQ[f], `${f}: title/meta/H1/canonical`);
    else assert.equal(frozen(read(f)), FROZEN[f], f);
  }
});

test('idxq: frozen-field guard catches mutants (title, meta, H1, FAQ answer, FAQ JSON-LD)', () => {
  const f = 'guides/usb-c-hub-vs-dock.html';
  const h = read(f);
  const muts = [
    h.replace(/<title>([^<]*)<\/title>/, '<title>$1 2026</title>'),
    h.replace(/(<meta name="description" content=")/, '$1Updated: '),
    h.replace('<h1>USB-C hub vs docking station</h1>', '<h1>USB-C hub vs dock</h1>'),
    h.replace('<p>Often no. Many hubs use DisplayPort Alt Mode.', '<p>Often no. Most hubs use DisplayPort Alt Mode.'),
    h.replace('"name": "Do I need Thunderbolt for a hub?"', '"name": "Do I need Thunderbolt for a USB-C hub?"'),
  ];
  for (const m of muts) {
    assert.notEqual(m, h, 'mutation must change the page');
    assert.notEqual(frozen(m), FROZEN[f]);
  }
});

test('idxq: every page shows Updated 2026-10-23 once, a "By ELORUMTECH" byline to methodology and Last reviewed 2026-10-23', () => {
  for (const f of PAGES) {
    const h = read(f);
    assert.deepEqual([...h.matchAll(/Updated: (\d{4}-\d{2}-\d{2})/g)].map((m) => m[1]), [DATE], f);
    assert.match(h, /<p class="updated"[^>]*>Updated: 2026-10-23<\/p>/, f);
    assert.equal((h.match(/Last reviewed: \d{4}-\d{2}-\d{2}/g) || []).length, 1, f);
    assert.ok(h.includes(`Last reviewed: ${DATE}`), f);
    if (EDITED.includes(f)) {
      const by = (h.match(/<p class="byline"[^>]*>[\s\S]*?<\/p>/g) || []);
      assert.equal(by.length, 1, f);
      assert.ok(by[0].includes('By <a href="../methodology.html">ELORUMTECH</a> (organisation, not a single author) · Last reviewed: 2026-10-23'), f);
      assert.ok(h.indexOf(by[0]) > h.indexOf('</h1>') && h.indexOf(by[0]) < h.indexOf('</section>', h.indexOf('</h1>')), `${f}: byline in hero`);
      assert.ok(fs.existsSync(path.join(root, 'methodology.html')));
    } else {
      assert.ok(h.includes(`Last reviewed: ${DATE} by ELORUMTECH`) && h.includes('<a href="../methodology.html">How we check compatibility</a>'), f);
    }
  }
});

test('idxq: JSON-LD has exactly one dateModified = 2026-10-23 and author + publisher Organization ELORUMTECH', () => {
  for (const f of PAGES) {
    const h = read(f);
    assert.equal((h.match(/"dateModified"/g) || []).length, 1, f);
    const e = lds(h).find((o) => o.dateModified);
    assert.ok(['TechArticle', 'WebApplication', 'CollectionPage'].includes(e['@type']), f);
    assert.equal(e.dateModified, DATE, f);
    assert.deepEqual(e.author, { '@type': 'Organization', name: 'ELORUMTECH' }, `${f} author`);
    assert.deepEqual(e.publisher, { '@type': 'Organization', name: 'ELORUMTECH' }, `${f} publisher`);
    assert.equal(e.datePublished, undefined, `${f}: no invented datePublished`);
  }
});

test('idxq: sitemap lastmod and docs/release-date-gate.json declare 2026-10-23 for all 9 URLs', () => {
  const sm = read('sitemap.xml');
  const gate = JSON.parse(read('docs/release-date-gate.json')).pages;
  for (const f of PAGES) {
    const u = urlOf(f);
    const e = [...sm.matchAll(new RegExp(`<loc>${u.replace(/[.\/]/g, '\\$&')}</loc>\\s*<lastmod>([^<]+)</lastmod>`, 'g'))];
    assert.equal(e.length, 1, u);
    assert.equal(e[0][1], DATE, u);
    assert.deepEqual(gate.filter((p) => p.file === f), [{ file: f, url: u, visibleUpdated: true, intendedReleaseDate: DATE }], f);
  }
});

test('idxq: thin guides have one sourced .tablewrap table with the expected rows', () => {
  for (const [f, cfg] of Object.entries(SOURCED)) {
    const h = read(f);
    const tables = [...h.matchAll(/<div class="tablewrap" role="region" aria-label="([^"]+)" tabindex="0"><table><caption>[\s\S]*?<\/table><\/div>/g)];
    assert.equal(tables.length, 1, f);
    assert.equal((h.match(/<table>/g) || []).length, 1, `${f}: every table is inside .tablewrap`);
    const h2 = h.match(/<h2 id="([a-z-]+)">([^<]+)<\/h2>\n<p>[^\n]*\n<div class="tablewrap"/);
    assert.ok(h2 && h2[2] === tables[0][1], `${f}: table labelled by its heading`);
    for (const r of cfg.rows) assert.ok(tables[0][0].includes(`<th scope="row">${r}</th>`), `${f}: row ${r}`);
    assert.ok(h.includes('.tablewrap{overflow-x:auto;scroll-padding-inline:40px;'), `${f}: scroll-padding-inline`);
    assert.ok(h.includes('[tabindex]:focus-visible{outline:3px solid #ffd166'), `${f}: focus ring`);
  }
});

test('idxq: sources are primary, unique, quoted, cited; every citation resolves; list matches the JSON', () => {
  let total = 0;
  for (const [f, cfg] of Object.entries(SOURCED)) {
    const h = read(f);
    const json = srcOf(f);
    assert.equal(json.schema, 'elorumtech-guide-sources/1');
    assert.equal(json.job, 'ELORUMTECH-SEO-IDXQUALITY-20261023-01');
    assert.equal(json.page, f);
    const sec = (h.match(/<section class="sources" aria-labelledby="sources-heading">[\s\S]*?<\/section>/g) || []);
    assert.equal(sec.length, 1, f);
    assert.equal((h.match(/<section class="sources"/g) || []).length, 1, `${f}: one Sources section`);
    const ids = [...sec[0].matchAll(/<li id="src-([A-Z0-9]+)"><a href="([^"]+)" rel="noopener">[^<]+<\/a> — [^,]+, checked 2026-10-23 (\d{2}:\d{2}) CEST<\/li>/g)];
    assert.equal(ids.length, (h.match(/<li id="src-/g) || []).length, `${f}: standard entry format`);
    assert.deepEqual(ids.map((m) => m[1]), cfg.ids, f);
    assert.deepEqual(json.sources.map((s) => s.id), cfg.ids, f);
    for (const [, id, href, hhmm] of ids) {
      const s = json.sources.find((x) => x.id === id);
      assert.match(href, PRIMARY, `${f} src-${id} not primary: ${href}`);
      assert.equal(href, s.url);
      assert.match(s.checked_at, /^2026-10-23T\d{2}:\d{2}:\d{2}\+02:00$/);
      assert.equal(s.checked_at.slice(11, 16), hhmm);
      assert.ok(s.quotes.length >= 1 && s.kind && s.publisher && s.title);
      assert.ok(main(h).includes(C(id)), `${f}: src-${id} never cited in the body`);
    }
    const cites = [...h.matchAll(/<a class="srcs" href="#src-([A-Z0-9]+)">\[([A-Z0-9]+)\]<\/a>/g)];
    for (const m of cites) {
      assert.equal(m[1], m[2]);
      assert.ok(cfg.ids.includes(m[1]), `${f}: citation ${m[1]} has no source entry`);
    }
    assert.equal((h.match(/class="srcs"/g) || []).length, cites.length, `${f}: no malformed citation links`);
    total += ids.length;
  }
  assert.equal(total, 22);
});

test('idxq: cited figures match the page text, the [ID] next to them, and the source quote', () => {
  for (const [f, cfg] of Object.entries(SOURCED)) {
    const h = read(f);
    const json = srcOf(f);
    for (const fig of cfg.figures) assert.ok(figureOk(h, json, fig), `${f}: figure not backed: ${fig[0]} [${fig[1]}]`);
  }
});

test('idxq: figure checks catch mutants (48→40, 25.92→26.92, 4K60→4K120, 240W→200W, A2119 30Hz→60Hz, swapped IDs, dropped [ID], bad quote)', () => {
  const dp = 'guides/displayport-monitor-connection-path.html', hub = 'guides/usb-c-hub-vs-dock.html', adp = 'guides/usb-c-to-hdmi-adapter-path.html', mac = 'guides/macbook-to-hdmi-display.html';
  const H = Object.fromEntries([dp, hub, adp, mac].map((f) => [f, read(f)]));
  const fig = (f, i) => SOURCED[f].figures[i];
  const muts = [
    [adp, H[adp].replaceAll('Up to 48 Gbps', 'Up to 40 Gbps'), fig(adp, 10)],
    [dp, H[dp].replaceAll('25.92 Gbps after overhead', '26.92 Gbps after overhead'), fig(dp, 1)],
    [dp, H[dp].replaceAll('at 60 Hz, up to 30-bit colour', 'at 120 Hz, up to 30-bit colour'), fig(dp, 9)],
    [hub, H[hub].replaceAll('Up to 240W', 'Up to 200W'), fig(hub, 15)],
    [hub, H[hub].replace('80 Gbps both ways', '120 Gbps both ways'), fig(hub, 13)],
    [mac, H[mac].replace(`3840 x 2160 at 30Hz ${C('AP2')}`, `3840 x 2160 at 60Hz ${C('AP2')}`), fig(mac, 10)],
    [mac, H[mac].replaceAll('Up to 4K at 30Hz', 'Up to 4K at 60Hz'), fig(mac, 7)],
    [dp, H[dp].replace(`10 Gbps per lane, 40 Gbps over 4 lanes ${C('V2')}`, `10 Gbps per lane, 40 Gbps over 4 lanes ${C('V1')}`), fig(dp, 4)],
    [adp, H[adp].replace(`Up to 18 Gbps ${C('HF1')}`, `Up to 18 Gbps ${C('HF2')}`), fig(adp, 7)],
    [dp, H[dp].replace(`13.5 Gbps per lane ${C('V3')}`, '13.5 Gbps per lane'), fig(dp, 5)],
    [hub, H[hub].replace(`40Gb/s ${C('IN1')}`, '40Gb/s'), fig(hub, 10)],
  ];
  for (const [f, m, fg] of muts) {
    assert.notEqual(m, H[f], 'mutation must change the page');
    assert.equal(figureOk(m, srcOf(f), fg), false, `mutant survived: ${f} ${fg[0]}`);
  }
  // A figure whose source quote does not contain it must fail even when the [ID] is right next to it.
  assert.equal(figureOk(H[adp], srcOf(adp), ['Up to 18 Gbps', 'HF1', 'up to 24Gbps']), false);
  // A stored quote that was edited (not verbatim) must fail the figure.
  const j = srcOf(mac);
  j.sources.find((s) => s.id === 'AP1').quotes = j.sources.find((s) => s.id === 'AP1').quotes.map((q) => q.replace('4K at 30Hz', '4K at 60Hz'));
  assert.equal(figureOk(H[mac], j, fig(mac, 7)), false);
  // UHBR modes are VESA's family-level examples: they must not be pinned on UHBR20 alone.
  assert.doesNotMatch(H[dp], /UHBR20[^<]*(8K 60Hz HDR|4K 240Hz HDR)/);
});

test('idxq: guides hub links every guide in scope, and each reference-table link hits an existing anchor', () => {
  const hub = read('guides/index.html');
  for (const f of PAGES.filter((x) => x !== 'guides/index.html')) assert.match(hub, new RegExp(`<div class="card"><a href="${path.basename(f).replace(/\./g, '\\.')}"><strong>`), f);
  const sec = (hub.match(/<section class="cta" aria-labelledby="ref-tables-heading">[\s\S]*?<\/section>/) || [''])[0];
  const links = [...sec.matchAll(/<li><a href="([^"#]+)(?:#([^"]+))?">([^<]+)<\/a><\/li>/g)];
  assert.ok(links.length >= 8);
  const want = ['displayport-monitor-connection-path.html#dp-paths', 'usb-c-hub-vs-dock.html#link-table', 'usb-c-to-hdmi-adapter-path.html#hdmi-levels', 'macbook-to-hdmi-display.html#mac-hdmi', 'thunderbolt-dock-one-cable-4k-120.html#choose', 'external-monitor-not-detected.html#no-signal', 'display-connection-solver.html#table'];
  const got = links.map((m) => m[1] + (m[2] ? '#' + m[2] : ''));
  for (const w of want) assert.ok(got.includes(w), w);
  for (const [, file, anchor] of links) {
    const target = read('guides/' + file);
    if (anchor) assert.ok(target.includes(`id="${anchor}"`), `${file}#${anchor} missing`);
  }
  for (const card of ['usb-c-hub-vs-dock.html', 'usb-c-to-hdmi-adapter-path.html', 'macbook-to-hdmi-display.html', 'displayport-monitor-connection-path.html', 'thunderbolt-dock-one-cable-4k-120.html']) {
    const c = hub.match(new RegExp(`<div class="card"><a href="${card.replace(/\./g, '\\.')}"><strong>[^<]+</strong><p>([^<]+)</p>`));
    assert.ok(c && c[1].length >= 60, `${card}: hub card describes the guide`);
  }
});

test('idxq: exactly one theme stylesheet right before </head>; internal links resolve; no prices or affiliate links', () => {
  for (const f of PAGES) {
    const h = read(f);
    assert.equal(h.split(THEME).length - 1, 1, f);
    assert.equal((h.match(/<link rel="stylesheet"/g) || []).length, 1, f);
    assert.ok(h.includes(`${THEME}</head>`), f);
    for (const m of (h.match(/<main>[\s\S]*?<\/main>/) || [''])[0].matchAll(/<a [^>]*href="([^"#?]+)[^"]*"/g)) {
      const r = m[1];
      if (/^https?:|^mailto:/.test(r)) continue;
      assert.ok(!r.startsWith('/'), `${f}: root-absolute ${r}`);
      const p = path.join(root, path.dirname(f), r);
      assert.ok(fs.existsSync(r.endsWith('/') ? path.join(p, 'index.html') : p), `${f}: broken link ${r}`);
    }
    if (SOURCED[f]) {
      assert.doesNotMatch(txt(h), /[$€£]\s?\d|\d\s?(USD|EUR|kr\.?)\b/, f);
      assert.doesNotMatch(h, /amazon\.|amzn\.|[?&]tag=|affiliate|rel="sponsored"/i, f);
    }
  }
  // DisplayPort guide keeps exactly one link to the DP vs HDMI guide in Related (SEO-DPVSHDMI-01).
  const rel = (read('guides/displayport-monitor-connection-path.html').match(/<section class="related"[\s\S]*?<\/section>/) || [''])[0];
  assert.equal((rel.match(/href="displayport-vs-hdmi\.html"/g) || []).length, 1);
});

// ---- REM01 (ELORUMTECH-SEO-IDXQUALITY-20261023-01-REM01) ----
const MAC = 'guides/macbook-to-hdmi-display.html', ADP = 'guides/usb-c-to-hdmi-adapter-path.html';
const MAC_FAQ_Q = 'Do MacBooks need a USB-C to HDMI adapter?';
const MAC_FAQ_A = 'Not always. Apple lists a built-in HDMI port on MacBook Pro models introduced in 2021 or later and in 2012 through 2015; those connect directly with an HDMI cable. Other MacBooks need an adapter for HDMI TVs/monitors (USB-C/Thunderbolt to HDMI on USB-C Macs)—unless you use a dock with HDMI out or a USB-C/Thunderbolt display instead.';
const visFaq = (h) => [...((h.match(/<section class="faq"[\s\S]*?<\/section>/) || [''])[0]).matchAll(/<summary>([\s\S]*?)<\/summary><p>([\s\S]*?)<\/p>/g)].map((m) => [txt(m[1]), txt(m[2])]);
const ldFaq = (h) => (lds(h).find((o) => o['@type'] === 'FAQPage') || { mainEntity: [] }).mainEntity.map((q) => [q.name, q.acceptedAnswer.text]);
const AP1q = (j) => j.sources.find((s) => s.id === 'AP1').quotes.join('\n');
const AP2q = (j) => j.sources.find((s) => s.id === 'AP2').quotes.join('\n');
// Every MacBook claim in the FAQ answer must be in Apple's stored AP1 quotes (the FAQ carries no inline [ID]; the lead does).
function macFaqOk(h, j) {
  const v = visFaq(h), l = ldFaq(h);
  if (JSON.stringify(v) !== JSON.stringify(l)) return false;
  const a = (v.find((x) => x[0] === MAC_FAQ_Q) || [])[1];
  if (a !== MAC_FAQ_A) return false;
  const q = AP1q(j);
  return /MacBook Pro introduced in 2021 or later/.test(q) && /MacBook Pro introduced in 2012 through 2015/.test(q) && /Connect directly to HDMI with an HDMI cable/.test(q) && /USB-C port: Connect to HDMI with an adapter/.test(q);
}
function leadOk(h, j) {
  const lead = (h.match(/<p class="lead">([\s\S]*?)<\/p>/) || [, ''])[1];
  if (/Most (modern|recent) MacBooks/.test(lead)) return false;
  const first = lead.split('. ')[0];
  return first.includes('MacBook Pro models introduced in 2021 or later and in 2012 through 2015') && lead.includes(`connect directly with an HDMI cable ${C('AP1')}`) && /MacBook Pro introduced in 2021 or later/.test(AP1q(j)) && /MacBook Pro introduced in 2012 through 2015/.test(AP1q(j));
}
function a2119Ok(h, j) {
  const row = (re) => ((h.match(re) || [, ''])[1]);
  const r60 = row(/<tr><th scope="row">([^<]*)<\/th><td>3840 x 2160 at 60Hz /), r30 = row(/<tr><th scope="row">([^<]*)<\/th><td>3840 x 2160 at 30Hz <a class="srcs" href="#src-AP2">/);
  const models = (r) => r.replace(/; over USB-C$/, '').split(', ');
  const q = AP2q(j);
  const q60 = q.match(/3840 x 2160 at 60Hz with these devices: ([^\n]*)/)[1], q30 = q.match(/3840 x 2160 at 30Hz with these devices: ([^\n]*)/)[1];
  // Apple's lists, cut to MacBooks: the on-page row must be exactly that list, in Apple's order.
  const macs = (s, all) => all.filter((m) => s.includes(m)).sort((x, y) => s.indexOf(x) - s.indexOf(y));
  return JSON.stringify(models(r60)) === JSON.stringify(macs(q60, A2119_60)) && macs(q60, A2119_60).length === A2119_60.length
    && JSON.stringify(models(r30)) === JSON.stringify(macs(q30, A2119_30)) && macs(q30, A2119_30).length === A2119_30.length;
}

test('rem01 F1: MacBook FAQ (visible = JSON-LD, verbatim) and lead say MacBook Pro 2021+ / 2012–2015 have HDMI, backed by AP1', () => {
  const h = read(MAC), j = srcOf(MAC);
  assert.ok(macFaqOk(h, j));
  assert.ok(leadOk(h, j));
  assert.doesNotMatch(h, /Most recent MacBooks lack HDMI|Most modern MacBooks/);
  assert.deepEqual(ldFaq(h).map((x) => x[0]), ['Do MacBooks need a USB-C to HDMI adapter?', 'Will I get 4K at 60 Hz or 120 Hz?', 'When should I use a Thunderbolt dock instead of a dongle?', 'Should I replace a working HDMI cable?']);
  assert.equal(j.job, 'ELORUMTECH-SEO-IDXQUALITY-20261023-01');
  assert.match(j.amended_by, /^ELORUMTECH-SEO-IDXQUALITY-20261023-01-REM01:/);
});

test('rem01 F1 mutants: old wording, JSON-LD drift, 2021→2019, dropped [AP1], edited AP1 quote all fail', () => {
  const h = read(MAC), j = srcOf(MAC);
  const ldOnly = h.replace(`"text": "${MAC_FAQ_A}"`, `"text": "${MAC_FAQ_A.replace('Not always. ', '')}"`);
  assert.notEqual(ldOnly, h);
  assert.equal(macFaqOk(ldOnly, j), false, 'JSON-LD answer drifted from visible');
  const both = h.replaceAll(MAC_FAQ_A, 'Most recent MacBooks lack HDMI, so yes for HDMI TVs/monitors—unless you use a dock with HDMI out or a USB-C/Thunderbolt display instead.');
  assert.equal(macFaqOk(both, j), false, 'old FAQ wording');
  assert.equal(macFaqOk(h.replaceAll(MAC_FAQ_A, MAC_FAQ_A.replace('2021 or later', '2019 or later')), j), false, 'year changed');
  assert.equal(leadOk(h.replace('<p class="lead">Apple lists a built-in HDMI port on MacBook Pro models introduced in 2021 or later', '<p class="lead">Apple lists a built-in HDMI port on MacBook Pro models introduced in 2019 or later'), j), false);
  assert.equal(leadOk(h.replace(`connect directly with an HDMI cable ${C('AP1')}`, 'connect directly with an HDMI cable'), j), false);
  assert.equal(leadOk(h.replace(/<p class="lead">/, '<p class="lead">Most modern MacBooks have no HDMI. '), j), false);
  const bad = JSON.parse(JSON.stringify(j));
  bad.sources.find((s) => s.id === 'AP1').quotes = bad.sources.find((s) => s.id === 'AP1').quotes.map((q) => q.replace('MacBook Pro introduced in 2021 or later', 'MacBook Pro introduced in 2019 or later'));
  assert.equal(macFaqOk(h, bad), false);
  assert.equal(leadOk(h, bad), false);
  assert.equal(figureOk(h, bad, SOURCED[MAC].figures.find((f) => f[0].startsWith('Apple lists a built-in HDMI port'))), false);
});

test('rem01 F2: A2119 60 Hz and 30 Hz rows list exactly the MacBooks Apple names in AP2, in Apple order (incl. 15-inch 2017+)', () => {
  const h = read(MAC), j = srcOf(MAC);
  assert.ok(a2119Ok(h, j));
  assert.ok(h.includes('15-inch MacBook Pro introduced in 2017 or later'));
  for (const m of [...A2119_60, ...A2119_30]) assert.ok(AP2q(j).includes(m), m);
  // mutants: drop 15-inch, drop four-TB3 2020, reorder, paraphrase, and a stored quote missing the 15-inch model
  const r = `${A2119_60.join(', ')}; over USB-C`;
  const muts = [
    h.replace(r, r.replace('15-inch MacBook Pro introduced in 2017 or later, ', '')),
    h.replace(r, r.replace('13-inch MacBook Pro with four Thunderbolt 3 ports introduced in 2020, ', '')),
    h.replace(r, [A2119_60[5], ...A2119_60.slice(0, 5)].join(', ') + '; over USB-C'),
    h.replace(r, r.replace('15-inch MacBook Pro introduced in 2017 or later', '15-inch MacBook Pro (2017 or later)')),
    h.replace('MacBook introduced in 2015 or later; over USB-C', 'MacBook introduced in 2016 or later; over USB-C'),
  ];
  for (const m of muts) { assert.notEqual(m, h); assert.equal(a2119Ok(m, j), false); }
  const bad = JSON.parse(JSON.stringify(j));
  bad.sources.find((s) => s.id === 'AP2').quotes = bad.sources.find((s) => s.id === 'AP2').quotes.map((q) => q.replace('15-inch MacBook Pro introduced in 2017 or later ', ''));
  assert.equal(a2119Ok(h, bad), false);
});

test('rem01 F4: adapter page FAQ JSON-LD answers are the visible answers verbatim', () => {
  const h = read(ADP);
  assert.equal(visFaq(h).length, 4);
  assert.deepEqual(ldFaq(h), visFaq(h));
  const m = h.replace('"text":"Only if host, adapter, cable and display all support 4K/120.', '"text":"Only if the host, adapter, cable and display all support 4K/120.');
  assert.notEqual(m, h);
  assert.notDeepEqual(ldFaq(m), visFaq(m));
});

test('rem01 F3: hub reference block links only sections with tables; solver → #table; BIOS stays a hub card', () => {
  const hub = read('guides/index.html');
  const sec = (hub.match(/<section class="cta" aria-labelledby="ref-tables-heading">[\s\S]*?<\/section>/) || [''])[0];
  assert.ok(sec.includes('<li><a href="display-connection-solver.html#table">'));
  assert.ok(read('guides/display-connection-solver.html').includes('<h2 id="table">'));
  assert.doesNotMatch(sec, /bios-fast-boot-troubleshooter/);
  assert.match(hub, /<div class="card"><a href="bios-fast-boot-troubleshooter\.html"><strong>/);
  for (const [, file, anchor] of sec.matchAll(/<li><a href="([^"#]+)#([^"]+)">/g)) assert.match(read('guides/' + file), new RegExp(`<table|id="${anchor}"`));
  assert.equal([...sec.matchAll(/<li><a href="[^"#]+">/g)].length, 0, 'every reference link is a deep link');
});
