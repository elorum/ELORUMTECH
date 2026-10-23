# QA evidence: ELORUMTECH-VISUAL-REFRESH-20261023-01 (PR #33), REBASE01 run

Everything here is **author-run evidence (DEV-01)** from the DEV-01 box. It is not independent QA.

This branch is `qa-evidence/visual-refresh-001`. It is the PR head plus one commit that adds only `qa-evidence/`. It is **not merged** into `visual-refresh-001`, so nothing here deploys.

- **PR head under review:** `03b9e5477f358668ec1ebede8c6eddb19be23733` (REBASE01).
- **Base:** main `41087ce8d41e0d3374f6e8d3d45b191b6e7c8bc0` (#35 SEO-TBDOCK-01 merged).
- **Previous head:** `f794346c4789145d5170e70fb346940b9094f6cd`, QA-01 PASS (FH #76 6357952021). Its evidence commit `311970e558fcc9309019593fb7109b9937b8ac5f` is kept in history; this branch was force-updated from it.
- **Generated:** 2026-10-23 07:21 CEST (Europe/Berlin).

## What the rebase changed (vs f794346c, beyond the base move)
| Commit | Content |
|---|---|
| `28c39c5` (was 3a33566) | Same intent. The only conflict was `guides/thunderbolt-dock-one-cable-4k-120.html`, resolved by taking main 41087ce8's page and adding only `<link rel="stylesheet" href="/assets/elorum-theme.css">` before `</head>`, like the other 31 pages. Removing that link gives exactly main's bytes. |
| `d8ba6df` (was b173ad8) | Identical patch: CSS only. |
| `9d0bc20` (was f794346) | Identical patch: CSS only. |
| `03b9e54` (new, REBASE01) | `docs/seo-freeze-baseline.json` regenerated at main 41087ce8. In `tests/seo-tbdock.test.mjs`, the test 'tbdock: no theme stylesheet from the visual refresh PR' was replaced by 'tbdock: exactly one theme stylesheet (visual refresh) and no other stylesheet'. The other four tbdock tests are unchanged. |

- The tree diff f794346c→03b9e54 covers 8 files: the 7 files #35 changed on main, plus `docs/seo-freeze-baseline.json`.
- `assets/elorum-theme.css`, `tests/visual-refresh-seo-freeze.test.mjs`, `tests/seo-freeze-extract.mjs` and `tools/make-seo-freeze-baseline.mjs` are the same blobs as at f794346c.
- `git range-diff`: commits 2 and 3 are `=`. Commit 1 is `!` only because of the tbdock page's context line.
- **Baseline diff:** only `guides/thunderbolt-dock-one-cable-4k-120.html` changed. Its fields title, metaDescription, h1, jsonLd, hrefs, anchors, bodyText and fullSha256 now match #35. The other 32 page entries are identical; only the top-level `sha` changed.
- **Byte check:** 33 HTML files. For each, the head with the theme link removed equals main 41087ce8 byte for byte. 32 pages carry exactly one link; the google verification stub has none.

## Baseline
- **Old** (main a38f5673): sha256 `073cf001561cff12cfc26aa259060deb3f799d1d4e02329018003cbd0166fa0b`.
- **New** (main 41087ce8): sha256 `1e13ef9759b5bd8ab41e5016c7b2b05e3550abfc3f1285b3503860b8dd3f87a5`.
- **Procedure:** fresh clone, then `git checkout -B main 41087ce8`. The generator and extractor were copied from the head, then `node tools/make-seo-freeze-baseline.mjs main` was run.
- The result is byte-identical to the committed file. See `baseline-regen.log` and `baseline-sha256.txt`.

## Tool versions
- Node 20: v20.19.2. Node 22: v22.20.0.
- Google Chrome 154.0.8037.97, headless, driven by playwright-core 1.64.1.
- Static server: `python3 -m http.server` (Python 3.13.5).
  - Port 8811 serves a worktree at the head.
  - Port 8812 serves a worktree at main 41087ce8.

## Commands
```
git worktree add ev-head 03b9e547   # + qa-evidence/
git worktree add --detach ev-main 41087ce8d41e0d3374f6e8d3d45b191b6e7c8bc0
(cd ev-head && python3 -m http.server 8811) & (cd ev-main && python3 -m http.server 8812) &
MAIN_SHA=41087ce8 node qa-evidence/run-browser-evidence.mjs http://localhost:8811 http://localhost:8812 <ev-head> <ev-head>/qa-evidence
npm test; npm run release-gate; node tests/release-date-gate.mjs --release --ship-date=2026-10-17   # Node 20 and Node 22
```

The script is REM02's, plus the REBASE01 additions:
- The tbdock page is a KEY page, so it also gets a 375 screenshot.
- A `tbdock` block runs on HEAD and MAIN at 1280 and 375. It records theme link count, title/H1, table rows, table-wrapper scroll vs page overflow, sources/citations count, a full audit and a region audit (#choose, .tablewrap, #usb-c-monitor, section.sources), focus ring styles in the table and sources, console errors, and main-text parity.
- The parity note names MAIN_SHA.

## Results (`browser-evidence.json`)
- **Static:** 32 pages at 1280 and 375.
  - 7256 elements checked, **0 contrast failures**, minimum ratio 6.24.
  - **0** console or page errors.
  - **0** pages with horizontal overflow at 375.
  - 789 focus stops, all visible.
  - **0** elements animating under reduced motion.
- **Post-interaction:** 112 snapshots (home 8, solver 16, bios 16, hub 16, details-open 56).
  - 22616 elements, **0 failures**, minimum ratio 5.34.
  - Solver states reached: v-fail and v-unknown, plus `.err` (input-error-hz0). v-pass and v-conditional were not reached by these inputs, the same as at REM02.
- **Parity vs main 41087ce8:** 56 of 56 runs at each width. DOM text is identical and a result rendered every time. **0** page errors.
- **Consent focus ring:** 7.55:1 on both buttons. Breadcrumb focus: clipped=false on all 5 pages.
- **Thunderbolt dock guide (#35 content under the theme):**
  - **Theme links:** exactly 1 on head and 0 on main. Title and H1 are #35's.
  - **Table:** 6 rows, identical to main (TB3, TB4, TB5, USB4 (minimum), USB4 Version 2.0, USB-C with USB 3 + DisplayPort).
  - **Sources:** 12 sources and 38 citations.
  - **Text parity:** main text identical to main at both widths.
  - **Contrast:** at 1280, 213 elements checked (region 202) with 0 failures. At 375, 180 checked (region 169) with 0 failures. Minimum ratio 6.24.
  - **Table at 375:** the `.tablewrap` scrolls inside itself (339 wide vs 640 content, overflow-x:auto). The page does not overflow.
  - **Focus:** the wine ring #792f45 is drawn inset (-2px) inside the table, and at 3px offset in the sources list.
  - **Console errors:** 0.
  - **Screenshots:** `screens/tbdock-table-head-{1280,375}.png`, `screens/guides_thunderbolt-dock-one-cable-4k-120_html-{1280,375}.png` and `screens/tbdock-main-1280.png`.
- **Tests:** 550/550 pass on Node 20 and 550/550 on Node 22.
  - Release gate PASS on both (2026-10-23, 13 pages, CONFIRMED).
  - The ship-date 2026-10-17 negative control FAILs on both (exit 1), as required.

## Not covered / limits
- Same limits as the REM02 run: no background images or gradients, and native `<option>` popups are not audited.
- The consent banner is styled by analytics.js, which is unchanged.
- The consent banner overlaps the lower part of the tbdock table screenshot, the same as on every page before consent.
