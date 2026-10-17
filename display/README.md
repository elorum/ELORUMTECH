# Display & Connection Solver (ELORUMTECH Issue #10)

One tool for three problems: no signal or monitor not detected, refresh rate capped (for example stuck at 60 Hz), and USB-C / DisplayPort / HDMI / dock limits.
Spec: the REV-passed Issue #10 plan REM-01 (PLAN.md `8c6d3e45…`, EVIDENCE-SCHEMA.json `2ee68bf0…`, ACCEPTANCE-MATRIX.md `a6ca7e87…`, OVERLAP.md `a0d96fbb…`), with REV's REM-02 non-blocking items folded in (below).

## Files
| File | Role |
|---|---|
| `standards.json` | Primary sources (URL, publisher, `checked_at` with offset, quotes) and the link-rate table. Every number is VERIFIED with source ids or DERIVED with `derived_from`. |
| `engine-display.src.js` | UMD engine source (`ElorumDisplay`). Standards are embedded at `/*@@STANDARDS@@*/`. |
| `build-engine.mjs` | Writes `engine-display.js` (source + embedded standards). Run after editing either file. |
| `build-pages.mjs` | Regenerates the tables and source lists between `<!-- @@GEN:name -->…<!-- @@END -->` in the four guide pages. |
| `solver-ui.js` | Progressive enhancement for `guides/display-connection-solver.html` (textContent only, aria-live result, query-string preselect). |
| `schema/evidence.schema.json` | Evidence schema, `0.2.0-impl` = REM-01 + REM-02 constraints. |
| `spec/ACCEPTANCE-MATRIX.rem01.md` | Byte-exact copy of the REV-passed matrix; `tests/display-evidence.test.mjs` checks the hash and that every row id has a named test. |

## Verdict rules
- Verdicts: PASS, CONDITIONAL, FAIL, UNKNOWN. Combination precedence FAIL > UNKNOWN > CONDITIONAL > PASS. UNKNOWN is never shown as PASS.
- PASS needs the exact mode in a manufacturer verified-mode list (`max_verified_mode.status = VERIFIED`) plus VERIFIED capability on every segment.
- Bandwidth arithmetic is an active-pixel **lower bound** (h × v × Hz × bits per pixel). It can prove FAIL; it never proves PASS by itself. Blanking needs a documented timing.
- Retailer/marketing text ("8K 60Hz", "dual 4K") is evidence of a label only, never of a VERIFIED field.
- The page quick check (`quickSolve`) works on port classes, never returns PASS, and treats a user-entered pixel clock as DERIVED (CONDITIONAL at most).
- No search-volume or traffic figures anywhere.

## REM-02 notes (REV comment 6241707273 on Elorum-site #76)
- NEW-M1: PASS allows `LOWER_BOUND_ONLY` only with a VERIFIED mode; `EXCEEDS` only with `dsc_required: true` (schema + lint L6).
- NEW-M2: with `accept_dsc=true` the DSC sub-result replaces the uncompressed one for the requested mode.
- NEW-M3: `VerifiedMode.status` is VERIFIED|UNKNOWN; PASS requires `max_verified_mode` VERIFIED.
- NEW-L2: UC-01, UC-02, UC-04, CB-01, AD-01, AD-03, AD-04 tested as single-verdict rows.
- NEW-L3: VERIFIED/MARKETING values must be non-null (schema) and payload ≤ raw (lint L7).
- NEW-L1, NEW-L4: wording items in plan/matrix text; not code. The pages use the corrected wording. The matrix copy stays byte-exact.
- INFO-C: `derived_from` pointers are required but not resolved by lint (documented limitation).

## REM-01 notes (REV FAIL TO DEV, comment 6242097510 on Elorum-site #76)
- HIGH-1: the "Can't see the BIOS screen?" related link is removed from `display-connection-solver.html` and `external-monitor-not-detected.html`, so this branch no longer depends on PR #14. A follow-up adds it back after #14 merges. `tests/display-pages.test.mjs` checks that every relative `href`/`src` in the four pages resolves to a file in the tree (`/ELORUMTECH/…` maps to the repo root).
- HIGH-2: PLAN §4 makes the cable element mandatory. A path with no `cable` segment gets the non-replaceable unknown `path.cable`, so it can never reach PASS.
- MEDIUM-1..3: named regression tests (`REM01-*`) kill the mutants E25, E30, E31, E37, E40, E41, E42, E45 and E46.
- MEDIUM-4: exact-model identity is now required for `source_output`, `sink_input`, `active_converter`, `dock` and `mst_hub`. Excluded by design:
  - cables (certification, rated link and certified length decide instead);
  - passive adapters (the source's DP++ and the adapter's HDMI-side link decide);
  - `usb_c_alt_mode` / `usb4_tunnel` (a mode of a port whose device identity is already checked).
- LOW-2 (X5): when a verified mode is the basis but a non-VERIFIED item makes the result CONDITIONAL, the reason says so. A DERIVED link rate adds a "confirm the documented link rate and lane count" prerequisite.
- LOW-3 (sitemap `lastmod`): deferred on purpose. A `lastmod` must be the real ship date, which the owner confirms through `docs/release-date-gate.json`. These pages are not shipped yet and two of them change in REM-01, so `2026-10-17` would be an unconfirmed date claim.

## Overlaps (OVERLAP.md)
Shared files touched minimally: `guides/index.html` (one new section after the hero), `sitemap.xml` (four `<url>` entries after `guides/`, no `lastmod`), `tests/engine.test.mjs` (sitemap count 26 → 30). The parallel BIOS job edits the same count line (→ 27). Whichever of #14/#15 merges second rebases and sets the count to 31 (both merged).

## Commands
`npm test` runs everything. There are no build or lint scripts in `package.json`; regenerate with `node display/build-engine.mjs && node display/build-pages.mjs`.
