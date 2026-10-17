# ELORUMTECH Issue #10 — Acceptance / test matrix

JOB_ID: ELORUMTECH-ISSUE10-PLAN-20261017-01 · MISSION_ID: ELORUMTECH-ISSUE10-20261017
Planning artifact. Tests are to be implemented later with synthetic `FIXTURE-*` devices only; no real device fact is asserted here. Standards rates referenced are the values in PLAN.md section 5, each cited there or labelled DERIVED; DERIVED rows are never used as VERIFIED caps. "Expected verdict" is what the module must return for the stated evidence situation. Each row (and each lettered variant) has exactly one expected verdict; combination and precedence follow PLAN.md §7a.

Columns: ID · Scenario · Evidence present in fixture · Expected verdict · Limiting segment / reason the module must report.

## A. DisplayPort generations

| ID | Scenario | Evidence present | Expected verdict | Must report |
|---|---|---|---|---|
| DP-01 | DP 1.2 (HBR2 x4, 17.28 Gbit/s payload) source, request whose documented timing needs more | Source rate VERIFIED HBR2; sink timing VERIFIED; cable VERIFIED HBR2+ | FAIL | Source output; required vs payload; max verified mode on path |
| DP-02 | DP 1.4 HBR3 x4 source + HBR3-certified cable + sink DP input with this exact mode in its verified mode list | All VERIFIED | PASS | No limiting segment; sources listed |
| DP-03 | Same as DP-02 but sink timing only CVT-RBv2-derived (no documented timing) | Sink timing DERIVED | CONDITIONAL | Prerequisite "confirm monitor DP input supports this timing" |
| DP-04 | Version label "DP 1.4" only, no documented link rate | version_label MARKETING/VERIFIED, rate UNKNOWN | UNKNOWN | Field max_link_rate_per_lane unknown; label does not prove HBR3 |
| DP-05a | HBR3 x4 path, 10 bpc RGB request where active-pixel lower bound already exceeds 25.92 Gbit/s; DSC documented as unsupported on one segment | Rates VERIFIED; timing UNKNOWN; DSC VERIFIED false on a segment | FAIL (uncompressed FAIL, DSC FAIL) | LOWER_BOUND_ONLY exceeds payload; segment with DSC VERIFIED false |
| DP-05b | As DP-05a but DSC UNKNOWN on a segment (not VERIFIED false anywhere); request accept_dsc=true | Rates VERIFIED; timing UNKNOWN; DSC UNKNOWN | UNKNOWN (uncompressed sub-result FAIL; DSC sub-result UNKNOWN) | DSC UNKNOWN is not "DSC VERIFIED false"; needed evidence: DSC support on each segment |
| DP-05c | As DP-05b but request accept_dsc=false | Rates VERIFIED; timing UNKNOWN; DSC UNKNOWN | FAIL (uncompressed sub-result FAIL; DSC sub-result UNKNOWN, not accepted) | accept_dsc=false; uncompressed lower bound exceeds payload |
| DP-06 | HBR3 x4 path, request whose active lower bound fits but timing unknown | Timing UNKNOWN | UNKNOWN (never PASS) | LOWER_BOUND_ONLY; needs documented timing |

## B. HDMI generations

| ID | Scenario | Evidence present | Expected verdict | Must report |
|---|---|---|---|---|
| HD-01 | HDMI 2.0 TMDS (14.4 Gbit/s payload) sink input, request exceeding it | Sink TMDS max VERIFIED | FAIL | Sink input; HDMI input limit even though DP input may support more |
| HD-02 | HDMI 2.1 label, FRL rate documented (e.g. FRL 4x12) on source and sink, UHS-certified cable | All VERIFIED, mode in sink HDMI list | PASS | Sources |
| HD-03 | HDMI 2.1 label but actual FRL rate not documented on one end | FRL rate UNKNOWN | UNKNOWN | "HDMI 2.1 label does not prove FRL or rate" |
| HD-04a | Sink HDMI 2.1 documents only TMDS-level modes; request is an FRL-only mode | Sink `frl_support` VERIFIED false | FAIL | Sink input |
| HD-04b | As HD-04a; request is a TMDS-level mode in the sink HDMI input's verified mode list; source, cable and features VERIFIED | Sink `frl_support` VERIFIED false; mode VERIFIED; all segments VERIFIED | PASS | Sink input; sources |
| HD-04c | As HD-04a; request is a TMDS-level mode not in the verified list, sink timing only DERIVED, arithmetic FITS | Sink `frl_support` VERIFIED false; timing DERIVED | CONDITIONAL | Prerequisite "confirm monitor HDMI input supports this timing" |
| HD-05a | Monitor reaches requested refresh on DP but its HDMI input list tops out lower; user on DP; mode in DP input's verified list; source and cable VERIFIED | Per-port verified modes; all segments VERIFIED | PASS | Actual input port, not headline Hz |
| HD-05b | As HD-05a, user on DP, but the DP input's timing is only DERIVED (mode not in verified list), arithmetic FITS | DP timing DERIVED | CONDITIONAL | Prerequisite "confirm monitor DP input supports this timing" |
| HD-05c | As HD-05a, user on HDMI | HDMI input verified mode list tops out lower | FAIL | HDMI input limit; actual input port |

| HD-06 | HDMI YCbCr 4:2:2 request (any bpc), timing documented, all segments VERIFIED | Link HDMI; chroma 4:2:2 | UNKNOWN (arithmetic assessment UNKNOWN) | bits_per_pixel for HDMI 4:2:2 not cited (PLAN §6); needed evidence: licensed HDMI spec section for the 4:2:2 container |

## C. Cables and backward compatibility

| ID | Scenario | Evidence present | Expected verdict | Must report |
|---|---|---|---|---|
| CB-01 | DP 2.x / UHBR-certified cable on DP 1.4 HBR3 source | Cable VERIFIED UHBR; source VERIFIED HBR3 | Path rate = HBR3 (not UHBR); verdict per HBR3 math | Source output is limiting; no upgraded bandwidth; newer cable not needed |
| CB-02 | Passive cable with no certification, only listing text "8K 60Hz"; every other segment VERIFIED; documented sink timing; arithmetic FITS | Cable marketing_claims only; others VERIFIED | CONDITIONAL with prerequisite "use certified cable" (PLAN §7a rule 3) | Cable segment UNKNOWN; marketing is neither cap nor proof |
| CB-03 | "8K 60Hz" label vs 3440x1440 165 Hz request | Marketing only | Must not output "60 Hz limit"; must not output PASS from the label | Explanation text present |
| CB-04 | "4K 120Hz" label used to claim support for a different mode | Marketing only | UNKNOWN for that mode | Label applies to one mode/standard |
| CB-05 | Misleading label: "HDMI 2.1" cable without Ultra High Speed certification; sink timing UNKNOWN | Certification UNKNOWN / not found; sink timing UNKNOWN | UNKNOWN (PLAN §7a rule 3 not met: arithmetic not from a documented/DERIVED timing) | Cable segment UNKNOWN; certification must be verifiable |
| CB-06a | Certified passive cable but `length_m` exceeds `certified_length_m`; every other segment VERIFIED; documented timing; arithmetic FITS | length_m and certified_length_m VERIFIED, length > certified | CONDITIONAL with prerequisite "use a certified cable within its certified length" | Cable; certification scope |
| CB-06b | As CB-06a but the sink timing is UNKNOWN (LOWER_BOUND_ONLY) | length > certified; timing UNKNOWN | UNKNOWN | Cable; certification scope; needed timing evidence |
| CB-07 | Directional/active cable plugged in reverse (documented directional) | directional VERIFIED true | CONDITIONAL with prerequisite "orient source end correctly" | Cable |

## D. USB-C, USB4/Thunderbolt and docks

| ID | Scenario | Evidence present | Expected verdict | Must report |
|---|---|---|---|---|
| UC-01 | USB-C DP Alt Mode, 4 lanes documented | Lane count VERIFIED 4 | Per DP math | Lane count |
| UC-02 | USB-C DP Alt Mode where USB 3 data shares the port, 2 lanes | Lane count VERIFIED 2 | Per halved payload; FAIL if exceeds | Alt Mode lane config as limit; prerequisite option "4-lane mode if dock supports disabling USB 3" only if documented |
| UC-03 | USB-C port with no documented video support | DP Alt Mode UNKNOWN | UNKNOWN | Connector shape does not prove video |
| UC-04 | USB4/Thunderbolt dock, two displays sharing tunnel payload | Shared group payload VERIFIED | Joint verdict per display; FAIL/CONDITIONAL if sum exceeds | shared_bandwidth_group as limit |
| UC-05 | Dock with documented per-port maximum modes | Dock ports VERIFIED | Dock port caps applied even when host is faster | Dock output port |
| UC-06 | Dock with only marketing "dual 4K" claim | Marketing | UNKNOWN for specific modes | Dock |

## E. Multi-display and MST

| ID | Scenario | Evidence present | Expected verdict | Must report |
|---|---|---|---|---|
| MD-01a | MST hub, two displays, sum of required bitrates within one HBR3 link; both modes in their sinks' verified lists; hub, source, cables and OS MST support VERIFIED | All VERIFIED + documented timings | PASS | Shared group shown with sum |
| MD-01b | As MD-01a but one sink's timing is only DERIVED, arithmetic FITS | Timing DERIVED on one sink | CONDITIONAL | Shared group shown with sum; prerequisite "confirm timing" |
| MD-02 | MST, sum exceeds link payload | VERIFIED | FAIL for joint request; may show each alone PASS | Shared group |
| MD-03 | macOS host with MST hub where OS MST support is not documented | `environment.os_mst_support` UNKNOWN | UNKNOWN | Environment constraint |
| MD-04 | display_count > documented maximum displays of source | Source `max_displays` VERIFIED | FAIL | Source |

## F. Adapters

| ID | Scenario | Evidence present | Expected verdict | Must report |
|---|---|---|---|---|
| AD-01 | Passive DP-to-HDMI, source DP++ VERIFIED | DP++ VERIFIED | Path limited to the dual-mode TMDS level documented | Adapter + DP++ |
| AD-02 | Passive DP-to-HDMI, source DP++ VERIFIED false | VERIFIED false | FAIL | Source / adapter mismatch |
| AD-03 | Active DP-to-HDMI 2.1 converter with documented output modes | Converter VERIFIED | Converter caps applied; DSC pass-through only if documented | Converter |
| AD-04 | Active converter with unknown HDR/VRR pass-through | HDR/VRR UNKNOWN | SDR sub-result per math; HDR/VRR sub-results UNKNOWN | Converter |

## G. Bit depth, chroma, HDR, VRR, DSC trade-offs

| ID | Scenario | Evidence present | Expected verdict | Must report |
|---|---|---|---|---|
| BT-01a | DP path; 8-bit SDR RGB request is in the sink input's verified mode list; source, segments and features VERIFIED; DSC VERIFIED false somewhere | Rates + timing VERIFIED; mode VERIFIED | PASS | Sources |
| BT-01b | As BT-01a but the 8-bit SDR RGB mode is not in the verified list; timing VERIFIED, arithmetic FITS | Mode not listed; timing VERIFIED | CONDITIONAL | Prerequisite "confirm monitor input supports this mode" |
| BT-01c | As BT-01a; 10-bit HDR RGB request whose documented timing EXCEEDS uncompressed payload | DSC VERIFIED false on a segment | FAIL | Joint and separate sub_results |
| BT-01d | As BT-01a; DP link; 10-bit HDR YCbCr 4:2:2 request, sink documents 4:2:2 and HDR on that input, timing documented, arithmetic FITS, mode not in verified list; accept_chroma_subsampling=true | Sink chroma_formats + hdr VERIFIED; timing VERIFIED | CONDITIONAL | Prerequisite "select 4:2:2"; HDMI 4:2:2 is HD-06 (UNKNOWN) |
| BT-02 | DSC documented on source and sink, active adapter in between with DSC UNKNOWN | DSC UNKNOWN on adapter | DSC-dependent modes UNKNOWN | Adapter |
| BT-03 | DSC documented on every segment and the mode is in sink's documented DSC modes | All VERIFIED | PASS for that mode | Sources; no compression ratio assumed |
| BT-04a | DSC documented on both ends and every segment; documented timing EXCEEDS uncompressed payload; requested mode not in any documented DSC mode list; accept_dsc=true | DSC VERIFIED, mode not listed | UNKNOWN (uncompressed FAIL; DSC sub-result UNKNOWN) | No assumed ratio |
| BT-04b | As BT-04a with accept_dsc=false | DSC VERIFIED, mode not listed | FAIL | accept_dsc=false; uncompressed exceeds |
| BT-05 | Bandwidth fits but sink HDR support UNKNOWN | HDR UNKNOWN | HDR sub-result UNKNOWN; SDR independent | Bandwidth does not imply HDR |
| BT-06a | VRR requested; VRR documented on sink only for DP input, user on HDMI | Per-port VRR VERIFIED (HDMI false) | VRR sub-result FAIL | Port |
| BT-06b | As BT-06a, user on DP; VRR VERIFIED on the source output, every segment and the sink DP input's verified mode | VRR VERIFIED on all segments | VRR sub-result PASS | Port; sources |
| BT-06c | As BT-06b but VRR UNKNOWN on the source output | VRR UNKNOWN on source | VRR sub-result UNKNOWN | Source output; PLAN §7 PASS feature rule |
| BT-07 | Chroma subsampling needed but request has accept_chroma_subsampling=false | — | FAIL for RGB/4:4:4; alternative shown as option only | Request constraint |

## H. Missing data and invalid input

| ID | Scenario | Evidence present | Expected verdict | Must report |
|---|---|---|---|---|
| MS-01 | Exact monitor model unknown (family name only) | Identity UNKNOWN | UNKNOWN; full report still produced | unknowns[] lists model, per-input timings |
| MS-02a | Monitor known but per-input timings missing; active lower bound already exceeds path payload | Timing UNKNOWN | FAIL | LOWER_BOUND_ONLY exceeds payload |
| MS-02b | Monitor known but per-input timings missing; active lower bound does not exceed path payload | Timing UNKNOWN | UNKNOWN | needed_evidence: EDID or manufacturer timing table |
| MS-03 | VERIFIED or MARKETING field has a value but no evidence id, or DERIVED field with empty/missing `derived_from` | Schema violation | Rejected by schema validation (test fails) | No invented values; DERIVED needs derived_from |
| MS-04 | Retailer listing is the only source for a "verified" mode | MARKETING only | Not PASS | Source kind |
| MS-05 | checked_at without time zone | Schema violation | Rejected | Timezone required |
| MS-06 | Request with zero/negative refresh or unknown chroma string | Invalid input | Input rejected with explicit error, no verdict | Input validation (module-local; PR #11 handles the existing engine's invalid input) |

## I. Owned-first and recommendation

| ID | Scenario | Evidence present | Expected verdict | Must report |
|---|---|---|---|---|
| OW-01 | User-owned cable is VERIFIED adequate | Owned VERIFIED | PASS, purchase_needed NO | Keep yours |
| OW-02 | Owned passive cable UNKNOWN, cheaper certified class adequate; every other segment VERIFIED; documented timing; arithmetic FITS | Owned cable UNKNOWN; others VERIFIED | CONDITIONAL (PLAN §7a rule 3); recommend adequate class, not the newest standard | Cheapest verified adequate |
| OW-03 | Affiliate price data present for a more expensive item | Price data | Verdict and adequacy order unchanged | Price secondary |

## J. Real-world acceptance case (DUTZO + RTX 3080)

| ID | Scenario | Evidence present | Expected verdict | Must report |
|---|---|---|---|---|
| RW-01 | DUTZO 3440x1440 "165 Hz", RTX 3080 "DP 1.4a", cable unknown — as given in Issue #10 | Only issue-text facts; DUTZO exact model, per-input timings, HDR/10-bit/DSC/VRR UNKNOWN; RTX 3080 board/output list to verify | Overall UNKNOWN; sub-result "165 Hz 8-bit RGB SDR over DP" UNKNOWN (lower bound does not exceed nominal HBR3 x4 payload; feasibility UNKNOWN); HDR 10-bit RGB 165 Hz UNKNOWN; VRR UNKNOWN; HDMI input UNKNOWN | No blanket 165 Hz/HDR/10-bit/RGB/VRR guarantee; no "likely achievable" wording; needed evidence for the 8-bit sub-result: exact DUTZO model/revision, the DP input with 165 Hz in its verified mode list or EDID, the RTX 3080 board output spec, the cable certification; a certified HBR3-capable cable appears only as a named recommendation, not as a verdict basis; explanation that "8K 60Hz" marketing is neither a 60 Hz ceiling nor proof of lower-resolution modes |
| RW-02 | RW-01 after all of: exact DUTZO model/revision; 3440×1440 165 Hz 8 bpc RGB SDR listed as a manufacturer/certification-verified operating mode on that specific DP input; the exact RTX 3080 board's DP output documented with HBR3 x4 (or a verified mode list covering this mode); a certified cable (e.g. VESA DP8K) within its certified length; no other segment | Sink identity + DP-input verified mode VERIFIED; source board output VERIFIED; cable certification and certified length VERIFIED | PASS for that mode only | Max verified mode; sources |
| RW-02b | RW-01 after DP-input timing and cable certification are VERIFIED, but the RTX 3080 board/output spec is still UNKNOWN | Timing + cable VERIFIED; source board UNKNOWN | UNKNOWN (not PASS) | Source output segment; needed evidence: exact board DP output spec |
| RW-02c | RW-01 after the DP-input timing is documented and the arithmetic FITS, but no verified-mode/EDID listing of 165 Hz at that input exists; source board and cable VERIFIED | Timing documented; no verified-mode listing | CONDITIONAL (never PASS) | Prerequisite "confirm 165 Hz is a supported mode on this DP input" |

## K. Evidence integrity, lint and result invariants (PLAN §11 L1–L6)

| ID | Scenario | Evidence present | Expected verdict | Must report |
|---|---|---|---|---|
| LN-01 | Field or mode cites an evidence id that is not in `evidence[]` | Dangling id | Rejected by lint L2 | Unresolved id |
| LN-02 | Two evidence records share one id | Duplicate id | Rejected by lint L2 | Duplicate id |
| LN-03 | VERIFIED field cites evidence whose confidence is not VERIFIED or whose source_kind is `retailer_listing` | Inconsistent source kind/confidence | Rejected by lint L3 | Field and evidence id |
| LN-04 | VERIFIED operating mode cites a non-manufacturer, non-certification source | Wrong source kind | Rejected by lint L3 | Mode and evidence id |
| LN-05 | Segment `device_id`, `in_port_id` or `out_port_id` does not resolve | Unresolved path reference | Rejected by lint L4 | Segment id |
| LN-06 | Verified operating mode (or DSC documented mode) without `status`, or status ≠ UNKNOWN with no evidence id | Schema violation | Rejected by schema (L5) | Mode |
| LN-07 | Result PASS with `max_verified_mode` null | Schema violation | Rejected by schema (L6) | Result invariant |
| LN-08 | Result PASS with `sources` empty or citing an unresolved id | Schema violation / lint | Rejected (schema L6 for empty; lint L2/L6 for unresolved) | Result invariant |
| LN-09 | Result PASS with arithmetic assessment LOWER_BOUND_ONLY, UNKNOWN or EXCEEDS | Schema violation | Rejected by schema (L6) | Result invariant |
| LN-10 | Result UNKNOWN with empty `unknowns` | Schema violation | Rejected by schema (L6) | Result invariant |
| LN-11 | DERIVED field with empty or missing `derived_from` | Schema violation | Rejected by schema (L1) | Field |

## Pass criteria for the implementation phase

1. Every row above (each lettered variant separately) exists as a named test with a synthetic fixture and exactly one expected verdict.
2. No test fixture uses a real product name except RW-01/RW-02/RW-02b/RW-02c, which assert only the issue-text facts and UNKNOWN for everything else (RW-02 variants use synthetic evidence records standing in for the named evidence).
3. Existing `tests/engine.test.mjs` passes unchanged.
4. Schema validation plus evidence lint reject any VERIFIED/MARKETING field without evidence ids, any DERIVED field without a non-empty `derived_from`, any `checked_at` without an offset, and every case in section K.
