/*
 * ELORUMTECH Display & Connection Solver — ElorumDisplay (pure UMD module, no DOM).
 * Job ELORUMTECH-DISPLAY-SOLVER-20261017-01 · Mission ELORUMTECH-ISSUE10-20261017 · Issue #10.
 * Spec: Issue #10 plan REM-01 (PLAN.md 8c6d3e45…, EVIDENCE-SCHEMA.json 2ee68bf0…, ACCEPTANCE-MATRIX.md a6ca7e87…)
 * plus REV REM-02 non-blocking items NEW-M1..M3 / NEW-L2 / NEW-L3 (see display/README.md).
 *
 * Verdicts: PASS | CONDITIONAL | FAIL | UNKNOWN. Precedence FAIL > UNKNOWN > CONDITIONAL > PASS.
 * UNKNOWN never becomes PASS. Device facts come only from evidence records; a missing record is UNKNOWN.
 * Standards constants are embedded from display/standards.json (a test asserts they are identical).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ElorumDisplay = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var STANDARDS = {"schema":"elorumtech-display-standards/1","job":"ELORUMTECH-DISPLAY-SOLVER-20261017-01","note":"Standards constants and troubleshooting sources for the Display & Connection Solver. Every number is VERIFIED against the cited primary source (quote included) or labelled DERIVED with derived_from. Check times are when DEV-01 fetched the page (HTTP 200, plain curl). No device-specific fact lives here; device facts are evidence records and stay UNKNOWN without one.","sources":[{"id":"V1","url":"https://vesa.org/displayport-developer/why-displayport/","title":"VESA — Why DisplayPort","publisher":"VESA","kind":"standard_body","checked_at":"2026-10-17T23:58:42+02:00","quotes":["Up to 5.4 Gbps per lane–21.6 Gbps over 4 lanes","Up to 8.1 Gbps per lane–32.4 Gbps over 4 lanes","Allowing for overhead — 25.92 Gbps over 4 lanes","Maximum link rate to up to 20 Gbps/lane and features more efficient 128b/132b channel coding, delivering a maximum payload of 77.37 Gbps"]},{"id":"V2","url":"https://vesa.org/featured-articles/vesa-rolls-out-early-certification-program-for-video-source-and-display-products-using-hbr3-high-bandwidth-link-rate/","title":"VESA — early certification program for HBR3","publisher":"VESA","kind":"standard_body","checked_at":"2026-10-17T23:58:42+02:00","quotes":["DisplayPort’s new HBR3 data rate supports a total bandwidth of 32.4 Gbps when using all four lanes in the DisplayPort or USB Type-C connector, at 8.1 Gbps per lane. This provides a combined audio/video payload data rate of 25.92 Gbps","By using the DisplayPort Multi-Stream feature, this bandwidth can also be shared among multiple monitors connected to a dock."]},{"id":"V3","url":"https://www.vesa.org/wp-content/uploads/2016/06/Display-Summit-USA-2016-AMD-VESA-SAH_Final_r1.pdf","title":"VESA / AMD — Display Summit USA 2016 (DisplayPort link-rate table)","publisher":"VESA","kind":"standard_body","checked_at":"2026-10-17T23:59:28+02:00","quotes":["Main Link Configuration | Raw Bit Rate (includes coding overhead) - Gbps | Application Bandwidth Throughput - Gbps","1 lane 1.62, 2.7, 5.4, 8.1 | 1.296, 2.16, 4.32, 6.48","2 lanes 3.24, 5.4, 10.8, 16.2 | 2.592, 4.32, 8.64, 12.96","4 lanes 6.48, 10.8, 21.6, 32.4 | 5.184, 8.64, 17.28, 25.92","Flexible lane configuration allows 1, 2, or 4 lanes to be enabled"]},{"id":"V4","url":"https://vesa.org/featured-articles/vesa-readies-displayport-uhbr-ultra-high-bit-rate-device-certification-and-begins-certification-of-uhbr-cables/","title":"VESA — UHBR device certification and DP40/DP80 cables","publisher":"VESA","kind":"standard_body","checked_at":"2026-10-17T23:58:42+02:00","quotes":["VESA certified DP40 cables must support up to the UHBR10 link rate","VESA certified DP80 cables must support up to the UHBR20 link rate (20 Gbps) defined by DisplayPort 2.0, with four lanes, providing a maximum throughput of 80 Gbps. VESA certified DP80 cables will also support the UHBR13.5 link rate (13.5 Gbps)"]},{"id":"A1","url":"https://vesa.org/featured-articles/vesa-brings-displayport-to-new-usb-type-c-connector/","title":"VESA — DisplayPort on the USB Type-C connector (DP Alt Mode)","publisher":"VESA","kind":"standard_body","checked_at":"2026-10-17T23:58:42+02:00","quotes":["The DisplayPort Alt Mode repurposes some or all of the four existing SuperSpeed USB lanes to deliver full DisplayPort performance"]},{"id":"A2","url":"https://www.vesa.org/wp-content/uploads/2014/09/DP-Alt-Mode-Overview-for-VESA-v1.pdf","title":"VESA — DisplayPort Alt Mode overview","publisher":"VESA","kind":"standard_body","checked_at":"2026-10-17T23:58:51+02:00","quotes":["A passive Full Feature USB Type-C to Type-C cable can carry up to four DisplayPort lanes","Implemented with two high speed pairs for DP (using two lane DP operation), and two high speed pairs for USB","USB 2.0 or 3.1 Data"]},{"id":"H1","url":"https://hdmiforum.org/hdmi-forum-releases-version-2-0-hdmi-specification/","title":"HDMI Forum — HDMI Specification 2.0 release","publisher":"HDMI Forum","kind":"standard_body","checked_at":"2026-10-17T23:58:42+02:00","quotes":["offers a significant increase in bandwidth (up to 18Gbps) to support new features such as 4K@50/60 (2160p)"]},{"id":"H2","url":"https://www.hdmi.org/spec/hdmi2_1","title":"HDMI Licensing Administrator — HDMI 2.1","publisher":"HDMI LA","kind":"standard_body","checked_at":"2026-10-17T23:58:44+02:00","quotes":["The Ultra High Speed HDMI Cable was introduced in the HDMI 2.1 Specification and entered the market in 2020. It is applicable for system configurations supporting up to 48Gbps maximum bandwidth."]},{"id":"MS1","url":"https://support.microsoft.com/en-us/windows/hardware/display-graphics/troubleshoot-external-monitor-connections-in-windows","title":"Microsoft Support — Troubleshoot external monitor connections in Windows","publisher":"Microsoft","kind":"manufacturer_support","checked_at":"2026-10-17T23:58:45+02:00","quotes":["press the Windows logo key + P to make sure that the Extend option is selected","Disconnect all accessories from your PC. Connected docks, dongles, adapters and other hardware can cause conflicts.","Try changing the cable connecting the external monitor. If the new one works, you know the previous cable was faulty.","If your system has more than one video output port, try plugging your external monitor into one of the other video output ports.","pressing Windows logo Key + Ctrl + Shift + B to reset your graphics driver may fix your issue. If this does not work, see if restarting helps.","If you are trying to use a display splitter to extend your display to more than one external monitor, you won't be able to. The splitter is duplicating the same signal instead of creating two independent signals."]},{"id":"MS2","url":"https://support.microsoft.com/en-us/windows/hardware/usb/fix-usb-c-problems-in-windows","title":"Microsoft Support — Fix USB-C problems in Windows","publisher":"Microsoft","kind":"manufacturer_support","checked_at":"2026-10-17T23:58:45+02:00","quotes":["Display connection might be limited","Make sure your PC, the external display, and the cable all support DisplayPort or MHL alternate modes. Make sure the device or dongle is connected directly to your PC.","The device or dongle is connected to your PC using an external hub or dock. There are too many other devices or dongles connected to your PC that use a USB-C connection."]},{"id":"MS3","url":"https://support.microsoft.com/en-us/windows/hardware/display-graphics/change-the-refresh-rate-on-your-monitor-in-windows","title":"Microsoft Support — Change the refresh rate on your monitor in Windows","publisher":"Microsoft","kind":"manufacturer_support","checked_at":"2026-10-17T23:58:45+02:00","quotes":["Select Start > Settings > System > Display > Advanced display","The Display information panel shows the current resolution and refresh rate for the selected display, and whether the display supports variable refresh rate (VRR).","The refresh rates that appear depend on your display and what it supports.","The refresh rate dropdown list shows an asterisk (*) next to refresh rates that don't support your current resolution."]},{"id":"MS4","url":"https://learn.microsoft.com/en-us/windows-hardware/drivers/usbcon/usb-type-c-troubleshooting-notifications","title":"Microsoft Learn — Windows USB Type-C troubleshooting notifications","publisher":"Microsoft","kind":"manufacturer_support","checked_at":"2026-10-17T23:58:45+02:00","quotes":["Display connection might be limited Make sure the DisplayPort device you're connecting to is supported by your PC.","DisplayPort Alternate Mode SVID 0xFF01 (or the MHL Alternate Mode SVID 0xFF02) is present in the wSVID field."]},{"id":"MS5","url":"https://support.microsoft.com/en-us/surface/accessories/external-display/connect-surface-to-an-external-display","title":"Microsoft Support — Connect Surface to an external display","publisher":"Microsoft","kind":"manufacturer_support","checked_at":"2026-10-18T00:07:07+02:00","quotes":["Make sure that your external display is turned on and its input source set to the port you are connecting to.","Use the shortest possible cable to connect your Surface to your monitor, as overly long cables can lead to connectivity problems"]},{"id":"PL1","url":"https://kb.plugable.com/docking-stations-and-video/can-i-connect-my-120-or-144hz-monitor-to-a-plugable-dock","title":"Plugable KB — Can I connect my high refresh rate monitor to a Plugable dock?","publisher":"Plugable","kind":"manufacturer_support","page_date":"2026-09-25","checked_at":"2026-10-17T23:58:45+02:00","quotes":["Most Plugable docks do not officially support monitors over 60Hz including 120Hz or 144Hz refresh rate unless otherwise specified on the Plugable product page or listing.","DisplayLink USB Graphics technology and Silicon Motion based docking stations and graphics adapters, like our USB 3.0 dual display and USB Type-C triple display docking stations, are limited to 60Hz refresh rate by the USB graphics controller hardware.","USB Type-C DisplayPort Alternate Mode docking station and ports on our USB Type-C Triple Display Docking Stations can support higher refresh rates, but may be limited by the computer's capability and available bandwidth to the docking station."]},{"id":"PL2","url":"https://kb.plugable.com/general-support-articles/how-to-determine-your-usb-c-port-video-capabilities","title":"Plugable KB — How to determine your USB-C port video capabilities","publisher":"Plugable","kind":"manufacturer_support","page_date":"2026-08-20","checked_at":"2026-10-17T23:58:46+02:00","quotes":["DisplayPort video data is transmitted directly from the USB-C port, taking up two or four of the USB SuperSpeed data lines.","DisplayPort 1.2 capable hosts can support a single 4K 60Hz display and USB 2.0 data, or single 4K 30Hz display and USB 10Gbps data (for example when using a docking station).","DisplayPort 1.4 capable hosts can support a single 8K 30Hz/4K 120Hz display and USB 2.0 data, or a single 4K 60Hz display and USB 10Gbps data.","Thunderbolt 4 & USB4 enables two DisplayPort 1.4 streams, supporting a single 8K display, or upto two 4K 60Hz displays","Not all USB-C ports support video output. Checking your laptop's documentation is crucial to confirm this capability."]},{"id":"PL3","url":"https://kb.plugable.com/when-i-connect-my-usb-c-dock-or-adapter-to-my-laptop-i-get-a-message-saying-display-connection-might-be-limited","title":"Plugable KB — \"Display connection might be limited\" with a USB-C dock or adapter","publisher":"Plugable","kind":"manufacturer_support","page_date":"2023-06-06","checked_at":"2026-10-17T23:58:46+02:00","quotes":["The USB-C port on the laptop itself does not support video out of its USB-C port. In other words, the USB-C port on the laptop supports data transfer only.","The USB-C cable being used to connect the USB-C device to the laptop is not a compatible cable, and may support data transfer/charging only (no video support).","There is a some kind of USB-C adapter in between the laptop and and USB-C device, and this adapter does not support USB-C video. Please remove the adapter and try connecting the device directly to the system."]},{"id":"PL4","url":"https://kb.plugable.com/docking-stations-and-video/how-to-set-the-display-refresh-rate-in-windows-11","title":"Plugable KB — How to set the display refresh rate in Windows 11","publisher":"Plugable","kind":"manufacturer_support","page_date":"2026-08-28","checked_at":"2026-10-17T23:58:47+02:00","quotes":["If the desired refresh rate is not available, confirm that the display, computer or graphics hardware, docking station or adapter, and video cable all support the desired resolution and refresh rate combination.","Some devices may support a higher refresh rate only at a lower display resolution."]},{"id":"PL5","url":"https://kb.plugable.com/usb-c-docks/will-my-ud-msth3-support-three-4k-displays","title":"Plugable KB — Will the UD-MSTH3 support three 4K displays?","publisher":"Plugable","kind":"manufacturer_support","page_date":"2026-08-03","checked_at":"2026-10-17T23:58:47+02:00","quotes":["DSC compression ratios are not set in stone, some computers enable 2.4:1","The operating system is not made aware of any of these settings, it won't report the DisplayPort Version (1.2, 1.4, 2.0 etc), nor will it report if DSC is available, or the DSC compression ratio."]}],"links":[{"id":"DP-RBR-x1","family":"DP","label":"DisplayPort RBR ×1","rate_gbps_per_lane":1.62,"lanes":1,"encoding":"8b/10b","raw_gbps":1.62,"payload_gbps":1.296,"status":"VERIFIED","sources":["V3"]},{"id":"DP-RBR-x2","family":"DP","label":"DisplayPort RBR ×2","rate_gbps_per_lane":1.62,"lanes":2,"encoding":"8b/10b","raw_gbps":3.24,"payload_gbps":2.592,"status":"VERIFIED","sources":["V3"]},{"id":"DP-RBR-x4","family":"DP","label":"DisplayPort RBR ×4","rate_gbps_per_lane":1.62,"lanes":4,"encoding":"8b/10b","raw_gbps":6.48,"payload_gbps":5.184,"status":"VERIFIED","sources":["V3"]},{"id":"DP-HBR-x1","family":"DP","label":"DisplayPort HBR ×1","rate_gbps_per_lane":2.7,"lanes":1,"encoding":"8b/10b","raw_gbps":2.7,"payload_gbps":2.16,"status":"VERIFIED","sources":["V3"]},{"id":"DP-HBR-x2","family":"DP","label":"DisplayPort HBR ×2","rate_gbps_per_lane":2.7,"lanes":2,"encoding":"8b/10b","raw_gbps":5.4,"payload_gbps":4.32,"status":"VERIFIED","sources":["V3"]},{"id":"DP-HBR-x4","family":"DP","label":"DisplayPort HBR ×4","rate_gbps_per_lane":2.7,"lanes":4,"encoding":"8b/10b","raw_gbps":10.8,"payload_gbps":8.64,"status":"VERIFIED","sources":["V3"]},{"id":"DP-HBR2-x1","family":"DP","label":"DisplayPort HBR2 ×1","rate_gbps_per_lane":5.4,"lanes":1,"encoding":"8b/10b","raw_gbps":5.4,"payload_gbps":4.32,"status":"VERIFIED","sources":["V3"]},{"id":"DP-HBR2-x2","family":"DP","label":"DisplayPort HBR2 ×2 (e.g. USB-C Alt Mode sharing the port with USB 3 data, DP 1.2 host)","rate_gbps_per_lane":5.4,"lanes":2,"encoding":"8b/10b","raw_gbps":10.8,"payload_gbps":8.64,"status":"VERIFIED","sources":["V3","A2"]},{"id":"DP-HBR2-x4","family":"DP","label":"DisplayPort HBR2 ×4 (DP 1.2 maximum)","rate_gbps_per_lane":5.4,"lanes":4,"encoding":"8b/10b","raw_gbps":21.6,"payload_gbps":17.28,"status":"VERIFIED","sources":["V1","V3"]},{"id":"DP-HBR3-x1","family":"DP","label":"DisplayPort HBR3 ×1","rate_gbps_per_lane":8.1,"lanes":1,"encoding":"8b/10b","raw_gbps":8.1,"payload_gbps":6.48,"status":"VERIFIED","sources":["V3"]},{"id":"DP-HBR3-x2","family":"DP","label":"DisplayPort HBR3 ×2 (e.g. USB-C Alt Mode sharing the port with USB 3 data, DP 1.4 host)","rate_gbps_per_lane":8.1,"lanes":2,"encoding":"8b/10b","raw_gbps":16.2,"payload_gbps":12.96,"status":"VERIFIED","sources":["V3","A2"]},{"id":"DP-HBR3-x4","family":"DP","label":"DisplayPort HBR3 ×4 (DP 1.3/1.4 maximum)","rate_gbps_per_lane":8.1,"lanes":4,"encoding":"8b/10b","raw_gbps":32.4,"payload_gbps":25.92,"status":"VERIFIED","sources":["V1","V2","V3"]},{"id":"DP-UHBR10-x4","family":"DP","label":"DisplayPort UHBR10 ×4","rate_gbps_per_lane":10,"lanes":4,"encoding":"128b/132b","raw_gbps":40,"payload_gbps":38.685,"status":"DERIVED","sources":["V1","V4"],"derived_from":["V4: DP40 = UHBR10 four lanes, 40 Gbps raw (VERIFIED)","payload = 40 × (77.37 / 80), scaling VESA's UHBR20 x4 payload ratio [V1]; DERIVED, not a VESA-published figure"]},{"id":"DP-UHBR13.5-x4","family":"DP","label":"DisplayPort UHBR13.5 ×4","rate_gbps_per_lane":13.5,"lanes":4,"encoding":"128b/132b","raw_gbps":54,"payload_gbps":52.225,"status":"DERIVED","sources":["V1","V4"],"derived_from":["V4: UHBR13.5 = 13.5 Gbps per lane (VERIFIED)","raw = 13.5 × 4","payload = 54 × (77.37 / 80) [V1 ratio]; DERIVED"]},{"id":"DP-UHBR20-x4","family":"DP","label":"DisplayPort UHBR20 ×4 (DP 2.x maximum)","rate_gbps_per_lane":20,"lanes":4,"encoding":"128b/132b","raw_gbps":80,"payload_gbps":77.37,"status":"VERIFIED","sources":["V1","V4"]},{"id":"HDMI-TMDS-18","family":"HDMI","label":"HDMI TMDS up to 18 Gbit/s (HDMI 2.0 class)","rate_gbps_per_lane":6,"lanes":3,"encoding":"8b/10b","raw_gbps":18,"raw_status":"VERIFIED","payload_gbps":14.4,"status":"DERIVED","sources":["H1"],"derived_from":["H1: up to 18Gbps (VERIFIED raw total)","3 TMDS data channels × 6 Gbit/s and 8b/10b → 14.4 Gbit/s; channel count and coding from secondary knowledge, DERIVED until a licensed HDMI spec section is cited"]},{"id":"HDMI-FRL-48","family":"HDMI","label":"HDMI FRL up to 48 Gbit/s (FRL 4×12, HDMI 2.1 class)","rate_gbps_per_lane":12,"lanes":4,"encoding":"16b/18b","raw_gbps":48,"raw_status":"VERIFIED","payload_gbps":42.667,"status":"DERIVED","sources":["H2"],"derived_from":["H2: up to 48Gbps maximum bandwidth (VERIFIED raw total)","48 × 16/18 = 42.667 Gbit/s before RS-FEC/packetization; lane mapping and 16b/18b DERIVED until a licensed HDMI spec section is cited"]}],"policy":{"fits_tight_threshold":0.95,"fits_tight_note":"Module policy, not a standard: required/payload above 0.95 is reported as FITS_TIGHT. It never changes PASS/CONDITIONAL/FAIL/UNKNOWN, only the label."}};

  var VERDICTS = ['PASS', 'CONDITIONAL', 'UNKNOWN', 'FAIL'];
  var RANK = { PASS: 0, CONDITIONAL: 1, UNKNOWN: 2, FAIL: 3 };
  function worst(a, b) { return RANK[a] >= RANK[b] ? a : b; }
  function worstOf(list) { return list.reduce(worst, 'PASS'); }

  var CHROMAS = ['RGB', 'YCbCr444', 'YCbCr422', 'YCbCr420'];
  var BPCS = [6, 8, 10, 12];
  var MANUFACTURER_KINDS = ['manufacturer_spec', 'manufacturer_manual', 'manufacturer_support', 'certification_database'];
  var TZ_RE = /(Z|[+-][0-9]{2}:[0-9]{2})$/;
  var DT_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;

  function round(x, d) { var p = Math.pow(10, d == null ? 3 : d); return Math.round(x * p) / p; }
  function isObj(x) { return x && typeof x === 'object' && !Array.isArray(x); }
  function known(f) { return !!(f && (f.status === 'VERIFIED' || f.status === 'DERIVED') && f.value !== null && f.value !== undefined); }
  function verified(f) { return !!(f && f.status === 'VERIFIED' && f.value !== null && f.value !== undefined); }
  function statusOf(f) { return f && f.status ? f.status : 'UNKNOWN'; }
  function confWorst(a, b) { var o = { VERIFIED: 0, DERIVED: 1, MARKETING: 2, UNKNOWN: 3 }; return o[a] >= o[b] ? a : b; }

  // ---------------------------------------------------------------- request validation (MS-06)
  function InvalidRequest(msg) { var e = new Error(msg); e.code = 'INVALID_REQUEST'; return e; }
  function validateMode(m, where) {
    if (!isObj(m)) throw InvalidRequest(where + ': mode missing');
    if (!Number.isInteger(m.h_active) || m.h_active < 1) throw InvalidRequest(where + ': h_active must be a positive integer');
    if (!Number.isInteger(m.v_active) || m.v_active < 1) throw InvalidRequest(where + ': v_active must be a positive integer');
    if (typeof m.refresh_hz !== 'number' || !isFinite(m.refresh_hz) || m.refresh_hz <= 0) throw InvalidRequest(where + ': refresh_hz must be a number > 0');
    if (BPCS.indexOf(m.bit_depth_bpc) < 0) throw InvalidRequest(where + ': bit_depth_bpc must be one of 6, 8, 10, 12');
    if (CHROMAS.indexOf(m.chroma) < 0) throw InvalidRequest(where + ': unknown chroma "' + m.chroma + '"');
  }
  function validateRequest(req) {
    if (!isObj(req)) throw InvalidRequest('request missing');
    validateMode(req.mode, 'request.mode');
    if (req.display_count != null && (!Number.isInteger(req.display_count) || req.display_count < 1)) throw InvalidRequest('request.display_count must be an integer >= 1');
    return true;
  }

  // ---------------------------------------------------------------- arithmetic (PLAN §6)
  function familyOf(protocol) {
    if (protocol === 'DisplayPort' || protocol === 'USB-C_DP_AltMode' || protocol === 'USB4_DP_Tunnel' || protocol === 'Thunderbolt_DP_Tunnel') return 'DP';
    if (protocol === 'HDMI_TMDS' || protocol === 'HDMI_FRL') return 'HDMI';
    return null;
  }
  // bits_per_pixel(link_type, bpc, chroma). HDMI 4:2:2 → null (UNKNOWN; 24-bit container not cited, PLAN §6 / HD-06).
  function bitsPerPixel(family, bpc, chroma) {
    if (chroma === 'RGB' || chroma === 'YCbCr444') return 3 * bpc;
    if (chroma === 'YCbCr420') return 1.5 * bpc;
    if (chroma === 'YCbCr422') return family === 'HDMI' ? null : 2 * bpc;
    return null;
  }
  function pixelRateActive(mode) { return mode.h_active * mode.v_active * mode.refresh_hz; }
  // Returns {value Gbit/s|null, kind: FULL_TIMING|LOWER_BOUND_ONLY, timing_status, derived_from[]}
  function requiredBitrate(mode, family, timing) {
    var bpp = bitsPerPixel(family, mode.bit_depth_bpc, mode.chroma);
    var t = timing || mode.timing;
    var full = null, tstatus = 'UNKNOWN', from = [];
    if (t) {
      if (known(t.pixel_clock_khz)) { full = t.pixel_clock_khz.value * 1000; tstatus = t.pixel_clock_khz.status; from.push('timing.pixel_clock_khz'); }
      else if (known(t.h_total) && known(t.v_total)) { full = t.h_total.value * t.v_total.value * mode.refresh_hz; tstatus = confWorst(t.h_total.status, t.v_total.status); from.push('timing.h_total × timing.v_total × refresh_hz'); }
      if (t.source && /^CVT|^CTA/.test(t.source) && tstatus === 'VERIFIED') tstatus = 'DERIVED';
    }
    if (bpp === null) return { value: null, kind: full ? 'FULL_TIMING' : 'LOWER_BOUND_ONLY', timing_status: tstatus, bpp: null, derived_from: ['bits_per_pixel(' + family + ', ' + mode.bit_depth_bpc + ' bpc, ' + mode.chroma + ') is UNKNOWN (PLAN §6)'] };
    if (full) return { value: round(full * bpp / 1e9, 4), kind: 'FULL_TIMING', timing_status: tstatus, bpp: bpp, derived_from: from.concat(['bits_per_pixel=' + bpp]) };
    return { value: round(pixelRateActive(mode) * bpp / 1e9, 4), kind: 'LOWER_BOUND_ONLY', timing_status: 'UNKNOWN', bpp: bpp, derived_from: ['h_active × v_active × refresh_hz (active pixels only, no blanking)', 'bits_per_pixel=' + bpp] };
  }

  function linkRow(family, rate, lanes) {
    var rows = STANDARDS.links;
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      if (r.family === family && Math.abs(r.rate_gbps_per_lane - rate) < 1e-9 && r.lanes === lanes) return r;
    }
    return null;
  }
  function rowRawStatus(r) { return r.raw_status || r.status; }

  // Capacity of one port's LinkCapability: {family, rate, lanes, payload:{value,status}, raw:{value,status}, rowId, missing[]}
  function portCapacity(link) {
    var out = { family: link ? familyOf(link.protocol) : null, payload: { value: null, status: 'UNKNOWN' }, raw: { value: null, status: 'UNKNOWN' }, missing: [], rowId: null, rate: null, lanes: null, inputStatus: 'UNKNOWN' };
    if (!link || !out.family) { out.missing.push('link.protocol (video output support on this port)'); return out; }
    var rate = link.max_link_rate_per_lane, lanes = link.lane_count;
    if (known(link.usable_payload)) out.payload = { value: link.usable_payload.value, status: link.usable_payload.status };
    if (known(link.raw_bitrate)) out.raw = { value: link.raw_bitrate.value, status: link.raw_bitrate.status };
    if (known(rate) && known(lanes)) {
      out.rate = rate.value; out.lanes = lanes.value;
      out.inputStatus = confWorst(rate.status, lanes.status);
      var row = linkRow(out.family, rate.value, lanes.value);
      if (row) {
        out.rowId = row.id;
        if (out.payload.value === null) out.payload = { value: row.payload_gbps, status: confWorst(out.inputStatus, row.status) };
        if (out.raw.value === null) out.raw = { value: row.raw_gbps, status: confWorst(out.inputStatus, rowRawStatus(row)) };
      } else if (out.raw.value === null) {
        out.raw = { value: round(rate.value * lanes.value, 4), status: 'DERIVED' };
      }
    } else {
      if (!known(rate)) out.missing.push('link.max_link_rate_per_lane');
      if (!known(lanes)) out.missing.push('link.lane_count');
    }
    return out;
  }

  // ---------------------------------------------------------------- document helpers
  function index(doc) {
    var ev = {}, dev = {};
    (doc.evidence || []).forEach(function (e) { ev[e.id] = e; });
    (doc.devices || []).forEach(function (d) { dev[d.device_id] = d; });
    return { ev: ev, dev: dev };
  }
  function portOf(device, id) {
    if (!device || id == null) return null;
    var ps = device.ports || [];
    for (var i = 0; i < ps.length; i++) if (ps[i].port_id === id) return ps[i];
    return null;
  }
  function modeKey(m) { return [m.h_active, m.v_active, m.refresh_hz].join('x'); }
  function sameBase(a, b) { return a.h_active === b.h_active && a.v_active === b.v_active && Math.abs(a.refresh_hz - b.refresh_hz) < 1e-6 && a.bit_depth_bpc === b.bit_depth_bpc && a.chroma === b.chroma; }
  function citesOnlyManufacturer(mode, idx) {
    var ids = mode.evidence_ids || [];
    if (!ids.length) return false;
    return ids.every(function (id) { var e = idx.ev[id]; return e && MANUFACTURER_KINDS.indexOf(e.source_kind) >= 0 && e.confidence === 'VERIFIED'; });
  }
  // A usable verified mode: status VERIFIED, cites only manufacturer/certification evidence (L3, MS-04).
  function findVerifiedMode(list, want, opts, idx) {
    list = list || [];
    for (var i = 0; i < list.length; i++) {
      var m = list[i];
      if (m.status !== 'VERIFIED' || !citesOnlyManufacturer(m, idx)) continue;
      if (!sameBase(m, want)) continue;
      if (opts.hdr && m.hdr !== want.hdr) continue;
      if (!opts.hdr && m.hdr && m.hdr !== 'SDR') continue;
      if (opts.vrr && (!m.vrr || m.vrr === 'none')) continue;
      if (!opts.dsc && m.dsc_required === true) continue;
      return m;
    }
    return null;
  }

  function resolvePath(doc, idx) {
    return (doc.path.segments || []).map(function (s) {
      var d = idx.dev[s.device_id];
      if (!d) throw InvalidRequest('segment ' + s.segment_id + ': device_id ' + s.device_id + ' does not resolve');
      var inP = s.in_port_id != null ? portOf(d, s.in_port_id) : null;
      var outP = s.out_port_id != null ? portOf(d, s.out_port_id) : null;
      if (s.in_port_id != null && !inP) throw InvalidRequest('segment ' + s.segment_id + ': in_port_id does not resolve');
      if (s.out_port_id != null && !outP) throw InvalidRequest('segment ' + s.segment_id + ': out_port_id does not resolve');
      return { seg: s, device: d, inPort: inP, outPort: outP };
    });
  }

  function devLabel(r) { return r.seg.segment_id; }

  // ---------------------------------------------------------------- core judgement of one sub-result
  // feats: {hdr:bool, vrr:bool}; dsc: evaluate the DSC variant
  function judge(doc, idx, path, mode, feats, dsc) {
    var req = doc.request, env = doc.environment || {};
    var F = [], U = [], C = [], prereq = [], sources = {}, explanations = [];
    var displayCount = req.display_count || 1;
    function addSrc(f) { (f && f.evidence_ids || []).forEach(function (id) { if (idx.ev[id]) sources[id] = true; }); }
    function unk(seg, field, needed, replaceable, pre) { U.push({ seg: seg, field: field, needed_evidence: needed, replaceable: !!replaceable, prereq: pre }); }

    var source = path[0], sink = path[path.length - 1];
    var srcPort = source.outPort, sinkPort = sink.inPort;

    // identity (MS-01)
    [source, sink].forEach(function (r) {
      var id = r.device.identity || {};
      if (!verified(id.model)) unk(devLabel(r), r.device.device_id + '.identity.model', 'exact ' + (r.device.role === 'sink' ? 'monitor' : 'source') + ' model number / SKU from the manufacturer');
      else addSrc(id.model);
    });

    // structural checks
    var passiveAfterSource = path.length > 2 && path.slice(1, -1).some(function (r) { return r.seg.kind === 'passive_adapter'; });
    if (passiveAfterSource) {
      var dpp = srcPort && srcPort.dual_mode_dp_plus_plus;
      if (dpp && dpp.status === 'VERIFIED' && dpp.value === false) F.push({ seg: devLabel(source), reason: 'passive DP→HDMI adapter needs a DP++ (dual-mode) source output, and this output is documented without DP++' });
      else if (!verified(dpp)) unk(devLabel(source), 'source.dual_mode_dp_plus_plus', 'manufacturer statement that this DP output supports DP++ (dual-mode)');
      else addSrc(dpp);
    }
    if (displayCount > 1) {
      var md = source.device.max_displays;
      if (verified(md)) { addSrc(md); if (displayCount > md.value) F.push({ seg: devLabel(source), reason: 'request needs ' + displayCount + ' displays; source documents a maximum of ' + md.value }); }
      else unk(devLabel(source), 'source.max_displays', 'documented maximum number of simultaneous displays for this source');
    }
    var hasMst = path.some(function (r) { return r.seg.kind === 'mst_hub'; });
    if (hasMst) {
      var om = env.os_mst_support;
      if (om && om.status === 'VERIFIED' && om.value === false) F.push({ seg: null, reason: 'the operating system is documented without DisplayPort MST support' });
      else if (!verified(om)) unk(null, 'environment.os_mst_support', 'OS/vendor documentation of DisplayPort MST support');
      else addSrc(om);
    }

    // capacities
    var caps = [];
    path.forEach(function (r, i) {
      var kind = r.seg.kind;
      if (kind === 'cable') return;
      if (kind === 'source_output' && passiveAfterSource) return; // signal leaves as TMDS via DP++; cap is the adapter's HDMI side
      var ports = [];
      if (kind === 'source_output') ports.push([r.outPort, 'out']);
      else if (kind === 'sink_input') ports.push([r.inPort, 'in']);
      else { if (r.inPort) ports.push([r.inPort, 'in']); if (r.outPort) ports.push([r.outPort, 'out']); }
      ports.forEach(function (pp) {
        var p = pp[0];
        if (!p) { unk(devLabel(r), 'port', 'port definition'); return; }
        var cap = portCapacity(p.link); cap.seg = devLabel(r); cap.kind = kind; cap.port = p.port_id; cap.pathIndex = i;
        // shared links carry every display; a sink input or a hub/dock output carries one
        cap.mult = (kind === 'sink_input' || (pp[1] === 'out' && (kind === 'mst_hub' || kind === 'dock'))) ? 1 : displayCount;
        cap.ev = [];
        [p.link && p.link.max_link_rate_per_lane, p.link && p.link.lane_count, p.link && p.link.usable_payload].forEach(function (f) { addSrc(f); (f && f.status === 'VERIFIED' && f.evidence_ids || []).forEach(function (id) { if (cap.ev.indexOf(id) < 0) cap.ev.push(id); }); });
        caps.push(cap);
      });
    });
    // HDMI 2.1 label without FRL/rate (HD-03), DP version label without rate (DP-04)
    caps.forEach(function (c) {
      var p = (function () { var r = path.filter(function (x) { return devLabel(x) === c.seg; })[0]; return r && (portOf(r.device, c.port)); })();
      var vl = p && p.link && p.link.version_label;
      if (vl && vl.value && c.missing.length) {
        if (/HDMI\s*2\.1/i.test(String(vl.value))) explanations.push('An “' + vl.value + '” label on ' + c.seg + ' does not prove FRL or any particular FRL rate.');
        else if (/DP|DisplayPort/i.test(String(vl.value))) explanations.push('A “' + vl.value + '” label on ' + c.seg + ' does not prove the maximum link rate (for example HBR3); the documented rate is what counts.');
      }
    });
    // cables: rate caps + certification
    var cableUnknown = false;
    path.forEach(function (r, i) {
      if (r.seg.kind !== 'cable') return;
      var c = r.device.cable || {};
      var prevCaps = caps.filter(function (x) { return x.family && x.pathIndex < i; });
      var fam = prevCaps.length ? prevCaps[prevCaps.length - 1].family : null;
      if (prevCaps.length) { var lastIdx = prevCaps[prevCaps.length - 1].pathIndex; prevCaps = prevCaps.filter(function (x) { return x.pathIndex === lastIdx; }); }
      var nextCaps = caps.filter(function (x) { return x.family && x.pathIndex > i; });
      if (!fam && nextCaps.length) { fam = nextCaps[0].family; prevCaps = [nextCaps[0]]; }
      (c.marketing_claims || []).forEach(function (mc) {
        explanations.push('Cable label “' + mc.text + '” describes one mode on one standard (often relying on DSC or chroma subsampling). It is neither a refresh-rate ceiling for other modes nor proof that ' + modeLabel(mode) + ' works.');
      });
      var passive = c.active_or_passive && c.active_or_passive.status !== 'UNKNOWN' && c.active_or_passive.value === 'passive';
      var certOk = verified(c.certification_program) && verified(c.rated_link);
      if (verified(c.directional) && c.directional.value === true) { addSrc(c.directional); C.push({ seg: devLabel(r), reason: 'directional cable' }); prereq.push('orient the cable’s source end toward the source (documented directional cable)'); }
      if (certOk && verified(c.length_m) && verified(c.certified_length_m) && c.length_m.value > c.certified_length_m.value) {
        cableUnknown = true;
        unk(devLabel(r), 'cable.length_m > cable.certified_length_m', 'a certified cable used within its certified length', passive, 'use a certified cable within its certified length');
        return;
      }
      if (!certOk) {
        cableUnknown = true;
        unk(devLabel(r), 'cable.certification_program / cable.rated_link', 'verifiable certification (e.g. a VESA-certified DisplayPort cable or a certified Ultra High Speed HDMI cable) and its rated link', passive, 'use a certified ' + (fam === 'HDMI' ? 'HDMI' : 'DisplayPort') + ' cable rated for this link, within its certified length');
        return;
      }
      addSrc(c.certification_program); addSrc(c.rated_link);
      var rated = c.rated_link.value, unit = c.rated_link.unit || 'Gbit/s per lane';
      var lanes = Math.min.apply(null, prevCaps.map(function (x) { return x.lanes || 4; }).concat([4]));
      if (fam && /per lane/.test(unit)) {
        var minRate = Math.min.apply(null, prevCaps.map(function (x) { return x.rate || Infinity; }));
        if (rated < minRate) {
          var row = linkRow(fam, rated, lanes);
          caps.push({ seg: devLabel(r), kind: 'cable', mult: displayCount, pathIndex: i, family: fam, payload: row ? { value: row.payload_gbps, status: row.status } : { value: null, status: 'UNKNOWN' }, raw: { value: round(rated * lanes, 4), status: 'VERIFIED' }, missing: row ? [] : ['standards row for rated cable link'], rate: rated, lanes: lanes, inputStatus: 'VERIFIED' });
        }
      } else if (fam && /total/.test(unit)) {
        caps.push({ seg: devLabel(r), kind: 'cable', mult: displayCount, pathIndex: i, family: fam, payload: { value: null, status: 'UNKNOWN' }, raw: { value: rated, status: 'VERIFIED' }, missing: [], rate: null, lanes: null, inputStatus: 'VERIFIED', rawOnly: true });
      }
    });

    // shared bandwidth groups
    var groups = (doc.path.shared_bandwidth_groups || []);

    // arithmetic per family
    var reqBy = {};
    ['DP', 'HDMI'].forEach(function (f) { reqBy[f] = requiredBitrate(mode, f, mode.timing); });
    var anyFam = caps.filter(function (c) { return c.family; }).map(function (c) { return c.family; });
    var primaryFam = sinkPort && sinkPort.link ? familyOf(sinkPort.link.protocol) : (anyFam[0] || 'DP');
    var minEv = [], exceedsVerified = null, exceedsDerived = null, minPayload = null, minSeg = null, minStatus = 'VERIFIED', margin = null, hdmi422 = false;
    caps.forEach(function (c) {
      if (!c.family) { unk(c.seg, c.seg + '.' + (c.missing[0] || 'link'), 'documented video protocol/link capability of this port (a connector shape does not prove video)'); return; }
      var rq = reqBy[c.family];
      if (rq.value === null) { hdmi422 = true; return; }
      var need = rq.value * (c.mult || 1);
      if (c.payload.value !== null) {
        if (minPayload === null || c.payload.value < minPayload) { minPayload = c.payload.value; minSeg = c.seg; minEv = c.ev || []; }
        minStatus = confWorst(minStatus, c.payload.status);
      }
      if (c.payload.status === 'VERIFIED' && c.payload.value !== null && need > c.payload.value) { exceedsVerified = exceedsVerified || c; return; }
      if (c.raw.status === 'VERIFIED' && c.raw.value !== null && need > c.raw.value) { exceedsVerified = exceedsVerified || c; return; }
      if (c.payload.value === null) {
        if (!c.rawOnly) unk(c.seg, c.seg + '.' + (c.missing.join(' + ') || 'usable_payload'), 'documented link rate and lane count (or usable payload) for ' + c.seg + (c.port ? ' port ' + c.port : ''));
        return;
      }
      if (c.payload.status === 'DERIVED' && need > c.payload.value) { exceedsDerived = exceedsDerived || c; return; }
      if (c.inputStatus === 'DERIVED') C.push({ seg: c.seg, reason: 'link rate/lanes only DERIVED' });
      var ratio = need / c.payload.value; margin = margin === null ? ratio : Math.max(margin, ratio);
    });
    groups.forEach(function (g) {
      var rq = reqBy[primaryFam]; if (rq.value === null) return;
      var need = rq.value * (g.members ? g.members.length : displayCount);
      if (verified(g.payload)) { addSrc(g.payload); if (need > g.payload.value) exceedsVerified = exceedsVerified || { seg: g.group_id, payload: g.payload, group: true }; else { margin = Math.max(margin || 0, need / g.payload.value); } }
      else if (known(g.payload)) { if (need > g.payload.value) exceedsDerived = exceedsDerived || { seg: g.group_id }; else C.push({ seg: g.group_id, reason: 'shared payload only DERIVED' }); }
      else unk(g.group_id, 'shared_bandwidth_groups.' + g.group_id + '.payload', 'documented shared payload of ' + g.group_id);
    });
    var rqP = reqBy[primaryFam];
    var assessment;
    if (hdmi422) assessment = 'UNKNOWN';
    else if (exceedsVerified) assessment = 'EXCEEDS';
    else if (rqP.kind === 'LOWER_BOUND_ONLY') assessment = 'LOWER_BOUND_ONLY';
    else if (minPayload === null) assessment = 'UNKNOWN';
    else assessment = (margin !== null && margin > STANDARDS.policy.fits_tight_threshold) ? 'FITS_TIGHT' : 'FITS_WITH_MARGIN';
    if (hdmi422) unk(null, 'bits_per_pixel(HDMI, ' + mode.bit_depth_bpc + ' bpc, YCbCr422)', 'licensed HDMI specification section for the YCbCr 4:2:2 container (not publicly available); arithmetic stays UNKNOWN');

    // DSC handling (rule 5)
    var dscState = null;
    if (exceedsVerified && dsc) {
      dscState = 'TRUE';
      path.forEach(function (r) {
        if (r.seg.kind === 'cable') return;
        var ps = r.seg.kind === 'source_output' ? [r.outPort] : r.seg.kind === 'sink_input' ? [r.inPort] : [r.inPort, r.outPort].filter(Boolean);
        ps.forEach(function (p) {
          var f = p && p.link && p.link.dsc;
          if (f && f.status === 'VERIFIED' && f.value === false) { if (dscState !== 'FALSE') dscState = 'FALSE'; F.push({ seg: devLabel(r), reason: 'DSC documented as unsupported on ' + devLabel(r) }); }
          else if (!verified(f) || f.value !== true) { if (dscState === 'TRUE') dscState = 'UNKNOWN'; unk(devLabel(r), devLabel(r) + '.link.dsc', 'documented DSC support on ' + devLabel(r)); }
          else addSrc(f);
        });
      });
    } else if (exceedsVerified) {
      F.push({ seg: exceedsVerified.seg, reason: (rqP.kind === 'LOWER_BOUND_ONLY' ? 'active-pixel lower bound ' : 'required bitrate ') + fmt(reqBy[exceedsVerified.family || primaryFam].value * (exceedsVerified.mult || displayCount)) + ' Gbit/s exceeds the documented ' + (exceedsVerified.group ? 'shared payload' : 'link capacity') + ' of ' + exceedsVerified.seg });
    }
    if (exceedsDerived && !exceedsVerified) unk(exceedsDerived.seg, exceedsDerived.seg + '.usable_payload', 'required bitrate exceeds a DERIVED payload but not a VERIFIED ceiling; needs a documented payload/rate for ' + exceedsDerived.seg);

    // features (PLAN §7 PASS feature rule; cables exempt)
    var featurePorts = [];
    path.forEach(function (r) {
      if (r.seg.kind === 'cable') return;
      if (r.seg.kind === 'source_output') featurePorts.push({ r: r, p: r.outPort });
      else if (r.seg.kind === 'sink_input') featurePorts.push({ r: r, p: r.inPort });
      else [r.inPort, r.outPort].filter(Boolean).forEach(function (p) { featurePorts.push({ r: r, p: p }); });
    });
    function checkFeature(name, ok, needed) {
      featurePorts.forEach(function (fp) {
        var f = fp.p && fp.p.features && fp.p.features[name];
        if (f && f.status === 'VERIFIED') { addSrc(f); if (!ok(f.value)) F.push({ seg: devLabel(fp.r), reason: name + ' documented as not supporting the request on ' + devLabel(fp.r) + (fp.p.port_id ? ' (' + fp.p.port_id + ')' : '') }); }
        else unk(devLabel(fp.r), devLabel(fp.r) + '.features.' + name, needed + ' on ' + devLabel(fp.r));
      });
    }
    checkFeature('max_bit_depth_bpc', function (v) { return v >= mode.bit_depth_bpc; }, 'documented maximum bit depth');
    checkFeature('chroma_formats', function (v) { return Array.isArray(v) && v.indexOf(mode.chroma) >= 0; }, 'documented chroma formats');
    if (mode.chroma !== 'RGB' && mode.chroma !== 'YCbCr444' && !req.accept_chroma_subsampling) F.push({ seg: null, reason: 'request does not accept chroma subsampling' });
    if (feats.hdr) checkFeature('hdr', function (v) { return v === true || (Array.isArray(v) && v.indexOf(mode.hdr) >= 0); }, 'documented HDR support');
    if (feats.vrr) checkFeature('vrr', function (v) { return v === true || (Array.isArray(v) && v.length > 0); }, 'documented VRR support');

    // sink verified mode
    var vm = null;
    if (sinkPort) {
      vm = dsc && exceedsVerified ? findVerifiedMode(sinkPort.link && sinkPort.link.dsc_documented_modes, mode, { hdr: feats.hdr, vrr: feats.vrr, dsc: true }, idx)
        : findVerifiedMode(sinkPort.verified_operating_modes, mode, { hdr: feats.hdr, vrr: feats.vrr, dsc: false }, idx);
      if (vm) addSrc(vm);
    }
    if (dsc && exceedsVerified && dscState === 'TRUE' && !vm) unk(devLabel(sink), devLabel(sink) + '.link.dsc_documented_modes', 'the requested mode in the sink input’s documented DSC modes (no compression ratio is assumed)');

    // decide
    var verdict, limiting = null, reasonParts = [];
    var timingFull = rqP.kind === 'FULL_TIMING';
    var fits = assessment === 'FITS_WITH_MARGIN' || assessment === 'FITS_TIGHT';
    if (F.length) {
      verdict = 'FAIL'; limiting = F[0].seg; reasonParts = F.map(function (x) { return x.reason; });
    } else if (U.length) {
      var allRepl = U.every(function (u) { return u.replaceable; });
      var othersKnown = allRepl; // rule 3(b): only the passive cable is unknown
      if (allRepl && othersKnown && timingFull && fits && rqP.timing_status !== 'UNKNOWN') {
        verdict = 'CONDITIONAL'; limiting = U[0].seg;
        U.forEach(function (u) { if (u.prereq && prereq.indexOf(u.prereq) < 0) prereq.push(u.prereq); });
        reasonParts.push('only the passive cable is unverified; replaced by a named prerequisite (PLAN §7a rule 3)');
        if (!vm) prereq.push('confirm the monitor’s ' + (sinkPort ? sinkPort.port_id : 'input') + ' supports this ' + (rqP.timing_status === 'DERIVED' ? 'timing' : 'mode'));
      } else {
        if (!vm && !timingFull && sinkPort) U.push({ seg: devLabel(sink), field: devLabel(sink) + '.timing', needed_evidence: 'EDID detailed timing or manufacturer timing table for ' + sinkPort.port_id + ' (or this mode in its verified mode list)' });
        verdict = 'UNKNOWN'; limiting = U[0].seg; reasonParts = ['missing evidence: ' + U.map(function (u) { return u.field; }).join(', ')];
      }
    } else if (vm && !dsc) {
      if (C.length) { verdict = 'CONDITIONAL'; limiting = C[0].seg; reasonParts = C.map(function (x) { return x.reason; }); }
      else { verdict = 'PASS'; reasonParts.push('requested mode is a manufacturer-verified mode on ' + (sinkPort ? sinkPort.port_id : 'the sink input') + ' and every segment documents the needed capability'); }
    } else if (vm && dsc) {
      verdict = C.length ? 'CONDITIONAL' : 'PASS'; reasonParts.push('requested mode is in the sink input’s documented DSC modes and DSC is documented on every active segment');
    } else if (timingFull && fits) {
      verdict = 'CONDITIONAL'; limiting = devLabel(sink);
      prereq.push('confirm the monitor’s ' + (sinkPort ? sinkPort.port_id : 'input') + ' supports this ' + (rqP.timing_status === 'DERIVED' ? 'timing' : 'mode'));
      reasonParts.push('arithmetic fits a ' + (rqP.timing_status === 'DERIVED' ? 'DERIVED' : 'documented') + ' full timing, but the mode is not in the sink input’s verified mode list');
    } else if (assessment === 'LOWER_BOUND_ONLY') {
      verdict = 'UNKNOWN'; limiting = devLabel(sink);
      U.push({ seg: devLabel(sink), field: devLabel(sink) + '.timing', needed_evidence: 'EDID detailed timing or manufacturer timing table for ' + (sinkPort ? sinkPort.port_id : 'the sink input') + ' (or this mode in its verified mode list)' });
      reasonParts.push('only the active-pixel lower bound is known (' + fmt(rqP.value * displayCount) + ' Gbit/s); it does not exceed the path payload, but feasibility is UNKNOWN until the timing is documented');
    } else {
      verdict = 'UNKNOWN'; U.push({ seg: null, field: 'arithmetic', needed_evidence: 'documented link capacities and timing' }); reasonParts.push('arithmetic UNKNOWN');
    }
    if (verdict === 'CONDITIONAL' && (mode.chroma === 'YCbCr422' || mode.chroma === 'YCbCr420')) prereq.push('select ' + (mode.chroma === 'YCbCr422' ? 'YCbCr 4:2:2' : 'YCbCr 4:2:0') + ' output in the graphics driver');
    if (verdict === 'PASS' && (assessment === 'UNKNOWN' || (assessment === 'EXCEEDS' && !(vm && vm.dsc_required === true) && !dsc))) { verdict = 'UNKNOWN'; U.push({ seg: null, field: 'arithmetic', needed_evidence: 'verified mode conflicts with arithmetic; needs documented timing' }); }

    return {
      verdict: verdict, limiting_segment: verdict === 'PASS' ? null : limiting, prerequisites: verdict === 'CONDITIONAL' ? uniq(prereq) : [],
      unknowns: verdict === 'UNKNOWN' ? U.map(function (u) { return { field: u.field, needed_evidence: u.needed_evidence }; }) : [],
      verified_mode: vm, reason: reasonParts.join('; '), sources: Object.keys(sources),
      explanations: uniq(explanations), dscState: dscState, exceeds: !!exceedsVerified,
      arithmetic: {
        required_bitrate: rqP.value === null ? { value: null, status: 'UNKNOWN' } : { value: rqP.value * displayCount, unit: 'Gbit/s', status: 'DERIVED', derived_from: rqP.derived_from.concat(displayCount > 1 ? ['× display_count ' + displayCount] : []) },
        path_usable_payload: minPayload === null ? { value: null, status: 'UNKNOWN' } : { value: minPayload, unit: 'Gbit/s', status: minStatus === 'VERIFIED' ? 'VERIFIED' : 'DERIVED', evidence_ids: minStatus === 'VERIFIED' && minEv.length ? minEv.slice() : undefined, derived_from: minStatus === 'VERIFIED' ? undefined : ['minimum usable payload across segments (standards.json rows)'] },
        assessment: assessment, max_arithmetic_mode: null, path_payload_limiting_segment: minSeg
      },
      caps: caps
    };
  }

  function uniq(a) { return a.filter(function (x, i) { return a.indexOf(x) === i; }); }
  function fmt(x) { return (Math.round(x * 100) / 100).toFixed(2); }
  function modeLabel(m) { return m.h_active + '×' + m.v_active + ' @ ' + m.refresh_hz + ' Hz ' + m.bit_depth_bpc + '-bit ' + m.chroma + (m.hdr && m.hdr !== 'SDR' ? ' ' + m.hdr : ''); }
  function stripMode(m) { var o = {}; ['h_active', 'v_active', 'refresh_hz', 'bit_depth_bpc', 'chroma', 'hdr', 'vrr', 'dsc_required'].forEach(function (k) { o[k] = m[k] === undefined ? null : m[k]; }); return o; }

  // ---------------------------------------------------------------- evaluate (full result, schema Result)
  function evaluate(doc, opts) {
    opts = opts || {};
    validateRequest(doc.request);
    var idx = index(doc);
    var path = resolvePath(doc, idx);
    if (path.length < 2) throw InvalidRequest('path needs at least a source output and a sink input');
    var req = doc.request, m = req.mode;
    var wantHdr = !!req.require_hdr || (m.hdr && m.hdr !== 'SDR' && m.hdr !== null);
    var wantVrr = !!req.require_vrr || (m.vrr && m.vrr !== 'none' && m.vrr !== null);
    var acceptDsc = req.accept_dsc !== false;
    var baseMode = Object.assign({}, m, { hdr: 'SDR', vrr: 'none' });

    var subs = [];
    function run(label, mode, feats, counted) {
      var u = judge(doc, idx, path, mode, feats, false);
      var entry = { label: label, mode: stripMode(mode), verdict: u.verdict, limiting_segment: u.limiting_segment, reason: u.reason };
      var counted_verdict = u.verdict, used = u;
      if (u.exceeds) {
        var d = judge(doc, idx, path, mode, feats, true);
        subs.push(entry);
        subs.push({ label: label + ' — with DSC', mode: stripMode(Object.assign({}, mode, { dsc_required: true })), verdict: d.verdict, limiting_segment: d.limiting_segment, reason: d.reason });
        // rule 5 + NEW-M2: with accept_dsc the DSC sub-result replaces the uncompressed one
        if (acceptDsc) { counted_verdict = d.verdict; used = d; }
        if (d.dscState === 'FALSE') counted_verdict = 'FAIL';
        if (counted_verdict === 'FAIL' && u.verdict === 'FAIL') used = u; // report the bandwidth root cause
      } else subs.push(entry);
      return { verdict: counted ? counted_verdict : null, detail: used, raw: u };
    }
    var parts = [];
    parts.push(run(wantHdr || wantVrr ? 'Base mode (SDR, no VRR)' : 'Requested mode', baseMode, { hdr: false, vrr: false }, true));
    if (wantHdr) parts.push(run('HDR (' + (m.hdr || 'HDR') + ')', Object.assign({}, baseMode, { hdr: m.hdr || 'HDR10' }), { hdr: true, vrr: false }, true));
    if (wantVrr) parts.push(run('VRR', Object.assign({}, baseMode, { vrr: m.vrr && m.vrr !== 'none' ? m.vrr : 'VESA_AdaptiveSync' }), { hdr: false, vrr: true }, true));
    if (wantHdr && wantVrr) parts.push(run('Joint (HDR + VRR)', Object.assign({}, m), { hdr: true, vrr: true }, true));
    // alternatives (reported, never counted — rule 4)
    if (m.bit_depth_bpc > 8) run('Alternative: 8-bit fallback (not requested)', Object.assign({}, baseMode, { bit_depth_bpc: 8 }), { hdr: false, vrr: false }, false);
    if ((m.chroma === 'RGB' || m.chroma === 'YCbCr444') && parts[0].raw.exceeds) {
      run('Alternative: YCbCr 4:2:0 (not requested' + (req.accept_chroma_subsampling ? '' : '; request does not accept subsampling') + ')', Object.assign({}, baseMode, { chroma: 'YCbCr420' }), { hdr: false, vrr: false }, false);
    }

    var overall = worstOf(parts.map(function (p) { return p.verdict; }));
    var decisive = parts.filter(function (p) { return p.verdict === overall; })[0].detail;

    // max verified mode on this path
    var maxVm = null;
    var sinkPort = path[path.length - 1].inPort;
    if (sinkPort) {
      var cands = (sinkPort.verified_operating_modes || []).filter(function (x) { return x.status === 'VERIFIED'; })
        .sort(function (a, b) { return pixelRateActive(b) * b.bit_depth_bpc - pixelRateActive(a) * a.bit_depth_bpc; });
      for (var i = 0; i < cands.length && !maxVm; i++) {
        var cm = cands[i];
        try { var t = judge(doc, idx, path, Object.assign({ timing: cm.timing }, cm), { hdr: cm.hdr && cm.hdr !== 'SDR', vrr: cm.vrr && cm.vrr !== 'none' }, false); if (t.verdict === 'PASS') maxVm = cm; } catch (e) { /* ignore */ }
      }
    }
    if (overall === 'PASS' && decisive.verified_mode) maxVm = maxVm && pixelRateActive(maxVm) * maxVm.bit_depth_bpc >= pixelRateActive(decisive.verified_mode) * decisive.verified_mode.bit_depth_bpc ? maxVm : decisive.verified_mode;

    var allSources = uniq([].concat.apply([], parts.map(function (p) { return p.detail.sources.concat(p.raw.sources); })));
    var unknowns = overall === 'UNKNOWN' ? uniqBy([].concat.apply([], parts.filter(function (p) { return p.verdict === 'UNKNOWN'; }).map(function (p) { return p.detail.unknowns; })), 'field') : [];
    var prerequisites = overall === 'CONDITIONAL' ? uniq([].concat.apply([], parts.map(function (p) { return p.detail.prerequisites; }))) : [];
    var explanations = uniq([].concat.apply([], parts.map(function (p) { return p.detail.explanations.concat(p.raw.explanations); })));

    var owned = (doc.devices || []).every(function (d) { return d.identity && d.identity.user_owned === true; });
    var rec = recommend(doc, path, decisive, opts);
    var purchase = overall === 'PASS' ? (owned ? 'NO' : 'YES') : (rec ? (overall === 'FAIL' ? 'YES' : 'UNKNOWN') : 'UNKNOWN');

    var result = {
      verdict: overall,
      limiting_segment: overall === 'PASS' ? null : decisive.limiting_segment,
      prerequisites: prerequisites,
      max_verified_mode: maxVm ? cleanMode(maxVm) : null,
      arithmetic: decisive.arithmetic,
      reason: decisive.reason,
      sources: allSources,
      unknowns: unknowns,
      sub_results: subs,
      purchase_needed: purchase,
      recommendation: rec,
      explanations: explanations
    };
    if (result.arithmetic.path_usable_payload.evidence_ids === undefined) delete result.arithmetic.path_usable_payload.evidence_ids;
    if (result.arithmetic.path_usable_payload.derived_from === undefined) delete result.arithmetic.path_usable_payload.derived_from;
    if (result.arithmetic.path_usable_payload.status === 'VERIFIED' && (!result.arithmetic.path_usable_payload.evidence_ids || !result.arithmetic.path_usable_payload.evidence_ids.length)) {
      result.arithmetic.path_usable_payload.status = 'DERIVED'; result.arithmetic.path_usable_payload.derived_from = ['standards.json']; delete result.arithmetic.path_usable_payload.evidence_ids;
    }
    return result;
  }
  function uniqBy(a, k) { var seen = {}; return a.filter(function (x) { if (seen[x[k]]) return false; seen[x[k]] = true; return true; }); }
  function cleanMode(m) { var o = stripMode(m); o.status = m.status; o.evidence_ids = (m.evidence_ids || []).slice(); if (m.timing) o.timing = m.timing; return o; }

  // ---------------------------------------------------------------- recommendation (PLAN §8; OW-02/OW-03)
  function recommend(doc, path, decisive, opts) {
    var cableSeg = path.filter(function (r) { return r.seg.kind === 'cable'; })[0];
    if (!cableSeg) return null;
    var c = cableSeg.device.cable || {};
    var certOk = verified(c.certification_program) && verified(c.rated_link) && !(verified(c.length_m) && verified(c.certified_length_m) && c.length_m.value > c.certified_length_m.value);
    if (certOk && decisive.verdict === 'PASS') return null;
    if (certOk) return null;
    var famCaps = decisive.caps.filter(function (x) { return x.family && x.rate; });
    if (!famCaps.length) {
      // No documented rate on the path: name the smallest VERIFIED standards class whose payload covers the active lower bound.
      var need = decisive.arithmetic.required_bitrate.value;
      if (need === null) return null;
      var dp = STANDARDS.links.filter(function (r) { return r.family === 'DP' && r.lanes === 4 && r.status === 'VERIFIED' && r.payload_gbps >= need; }).sort(function (a, b) { return a.payload_gbps - b.payload_gbps; })[0];
      if (!dp) return null;
      return { class: { family: 'DP', min_rate_gbps_per_lane: dp.rate_gbps_per_lane, label: 'VESA-certified DisplayPort cable rated for at least ' + dp.rate_gbps_per_lane + ' Gbit/s per lane (' + dp.label + ')', sources: dp.sources.slice() }, item: null, note: 'Named recommendation only, from the active-pixel lower bound; it is not a basis for the verdict. Price and affiliate data never change the verdict or the adequacy order.' };
    }
    var fam = famCaps[0].family;
    var rate = Math.min.apply(null, famCaps.map(function (x) { return x.rate; }));
    var cls;
    if (fam === 'DP') {
      cls = { family: 'DP', min_rate_gbps_per_lane: rate, label: 'VESA-certified DisplayPort cable rated for at least ' + rate + ' Gbit/s per lane' + (rate <= 8.1 ? ' (HBR3 class); a UHBR (DP40/DP80) cable adds no bandwidth on this path' : ''), sources: rate <= 8.1 ? ['V2', 'V4'] : ['V4'] };
    } else {
      var raw = Math.min.apply(null, famCaps.map(function (x) { return x.raw.value || Infinity; }));
      cls = raw > 18 ? { family: 'HDMI', min_raw_gbps: raw, label: 'certified Ultra High Speed HDMI Cable (48Gbps class)', sources: ['H2'] } : { family: 'HDMI', min_raw_gbps: raw, label: 'certified HDMI cable rated for at least ' + raw + ' Gbit/s', sources: ['H1'] };
    }
    var item = null;
    var cands = (opts && opts.candidates) || [];
    var adequate = cands.filter(function (x) { return x.family === cls.family && x.certified === true && (cls.family === 'DP' ? x.rated_gbps_per_lane >= cls.min_rate_gbps_per_lane : x.rated_raw_gbps >= cls.min_raw_gbps); });
    // cheapest adequate class first: lowest adequate rating, then price (price never reorders adequacy)
    adequate.sort(function (a, b) {
      var ra = cls.family === 'DP' ? a.rated_gbps_per_lane : a.rated_raw_gbps, rb = cls.family === 'DP' ? b.rated_gbps_per_lane : b.rated_raw_gbps;
      if (ra !== rb) return ra - rb;
      return (a.price == null ? Infinity : a.price) - (b.price == null ? Infinity : b.price);
    });
    if (adequate.length) item = adequate[0];
    return { class: cls, item: item, note: 'Class first, from the path’s documented link; price and affiliate data never change the verdict or the adequacy order.' };
  }

  // ---------------------------------------------------------------- schema validation subset + lint (PLAN §11 L1–L6, REM-02 NEW-L3 L7, NEW-M3)
  var FIELD_PATHS_PORT = ['version_label', 'max_link_rate_per_lane', 'lane_count', 'encoding', 'raw_bitrate', 'usable_payload', 'dsc', 'frl_support'];
  function eachField(doc, cb) {
    (doc.devices || []).forEach(function (d) {
      var base = 'devices[' + d.device_id + ']';
      if (d.identity) ['manufacturer', 'model', 'revision'].forEach(function (k) { if (d.identity[k]) cb(d.identity[k], base + '.identity.' + k); });
      if (d.max_displays) cb(d.max_displays, base + '.max_displays');
      if (d.cable) Object.keys(d.cable).forEach(function (k) { if (k !== 'marketing_claims' && isObj(d.cable[k])) cb(d.cable[k], base + '.cable.' + k); });
      (d.ports || []).forEach(function (p) {
        var pb = base + '.ports[' + p.port_id + ']';
        if (p.link) FIELD_PATHS_PORT.forEach(function (k) { if (p.link[k]) cb(p.link[k], pb + '.link.' + k); });
        if (p.dual_mode_dp_plus_plus) cb(p.dual_mode_dp_plus_plus, pb + '.dual_mode_dp_plus_plus');
        if (p.features) Object.keys(p.features).forEach(function (k) { cb(p.features[k], pb + '.features.' + k); });
        (p.verified_operating_modes || []).forEach(function (m, i) { if (m.timing) ['h_total', 'v_total', 'pixel_clock_khz', 'h_blank', 'v_blank'].forEach(function (k) { if (m.timing[k]) cb(m.timing[k], pb + '.verified_operating_modes[' + i + '].timing.' + k); }); });
      });
    });
    if (doc.environment) Object.keys(doc.environment).forEach(function (k) { var v = doc.environment[k]; if (isObj(v)) cb(v, 'environment.' + k); else if (Array.isArray(v)) v.forEach(function (x, i) { cb(x, 'environment.' + k + '[' + i + ']'); }); });
    if (doc.request && doc.request.mode && doc.request.mode.timing) ['h_total', 'v_total', 'pixel_clock_khz', 'h_blank', 'v_blank'].forEach(function (k) { var t = doc.request.mode.timing; if (t[k]) cb(t[k], 'request.mode.timing.' + k); });
    (doc.path && doc.path.shared_bandwidth_groups || []).forEach(function (g) { if (g.payload) cb(g.payload, 'path.shared_bandwidth_groups[' + g.group_id + '].payload'); });
  }
  function eachMode(doc, cb) {
    (doc.devices || []).forEach(function (d) {
      (d.ports || []).forEach(function (p) {
        var pb = 'devices[' + d.device_id + '].ports[' + p.port_id + ']';
        (p.verified_operating_modes || []).forEach(function (m, i) { cb(m, pb + '.verified_operating_modes[' + i + ']'); });
        (p.link && p.link.dsc_documented_modes || []).forEach(function (m, i) { cb(m, pb + '.link.dsc_documented_modes[' + i + ']'); });
      });
    });
  }
  function validateField(f, where, errs) {
    var st = f.status;
    if (['VERIFIED', 'DERIVED', 'MARKETING', 'UNKNOWN'].indexOf(st) < 0) { errs.push(where + ': status missing/invalid'); return; }
    if (st === 'UNKNOWN' && f.value !== null && f.value !== undefined) errs.push(where + ': UNKNOWN field must have value null');
    if (st === 'VERIFIED' || st === 'MARKETING') {
      if (f.value === null || f.value === undefined) errs.push(where + ': ' + st + ' field needs a non-null value (NEW-L3)');
      if (!Array.isArray(f.evidence_ids) || f.evidence_ids.length < 1) errs.push(where + ': ' + st + ' field needs at least one evidence id (L1)');
    }
    if (st === 'DERIVED') {
      if (f.value === undefined) errs.push(where + ': DERIVED field needs a value');
      if (!Array.isArray(f.derived_from) || f.derived_from.length < 1) errs.push(where + ': DERIVED field needs a non-empty derived_from (L1)');
    }
  }
  function validateResult(r, errs) {
    if (!r) return;
    if (VERDICTS.indexOf(r.verdict) < 0) errs.push('result.verdict invalid');
    if (r.verdict === 'PASS') {
      if (!r.max_verified_mode) errs.push('result: PASS requires max_verified_mode (L6)');
      else if (r.max_verified_mode.status !== 'VERIFIED') errs.push('result: PASS requires max_verified_mode.status VERIFIED (NEW-M3)');
      if (!Array.isArray(r.sources) || !r.sources.length) errs.push('result: PASS requires non-empty sources (L6)');
      var a = r.arithmetic && r.arithmetic.assessment;
      if (a === 'UNKNOWN') errs.push('result: PASS with arithmetic UNKNOWN (L6)');
      if (a === 'EXCEEDS' && !(r.max_verified_mode && r.max_verified_mode.dsc_required === true)) errs.push('result: PASS with arithmetic EXCEEDS outside a documented DSC mode (L6/NEW-M1)');
      if (a === 'LOWER_BOUND_ONLY' && !(r.max_verified_mode && r.max_verified_mode.status === 'VERIFIED')) errs.push('result: PASS with LOWER_BOUND_ONLY needs a VERIFIED mode (L6/NEW-M1)');
    }
    if (r.verdict === 'UNKNOWN' && (!Array.isArray(r.unknowns) || !r.unknowns.length)) errs.push('result: UNKNOWN requires non-empty unknowns (L6)');
  }
  // validateDocument: the schema-level rules the tests rely on (the JSON Schema file is the reference; see display/schema).
  function validateDocument(doc) {
    var errs = [];
    (doc.evidence || []).forEach(function (e, i) {
      ['id', 'source_url', 'source_title', 'source_kind', 'relevant_evidence', 'checked_at', 'confidence'].forEach(function (k) { if (e[k] === undefined || e[k] === '') errs.push('evidence[' + i + '].' + k + ' missing'); });
      if (e.id && !/^EV-[A-Za-z0-9._-]+$/.test(e.id)) errs.push('evidence[' + i + '].id pattern');
      if (typeof e.checked_at === 'string' && (!TZ_RE.test(e.checked_at) || !DT_RE.test(e.checked_at))) errs.push('evidence[' + i + '].checked_at needs an ISO date-time with an explicit time zone offset (MS-05)');
    });
    eachField(doc, function (f, w) { validateField(f, w, errs); });
    eachMode(doc, function (m, w) {
      if (!m.status) errs.push(w + ': verified mode needs status (L5)');
      else if (m.status !== 'VERIFIED' && m.status !== 'UNKNOWN') errs.push(w + ': verified mode status must be VERIFIED or UNKNOWN (NEW-M3)');
      if (m.status !== 'UNKNOWN' && (!Array.isArray(m.evidence_ids) || !m.evidence_ids.length)) errs.push(w + ': verified mode needs at least one evidence id unless UNKNOWN (L5)');
    });
    validateResult(doc.result, errs);
    return errs;
  }
  function lint(doc) {
    var errs = [], idx = index(doc), seen = {};
    (doc.evidence || []).forEach(function (e) { if (seen[e.id]) errs.push('L2: duplicate evidence id ' + e.id); seen[e.id] = true; });
    function resolve(ids, where) { (ids || []).forEach(function (id) { if (!idx.ev[id]) errs.push('L2: ' + where + ' cites unresolved evidence id ' + id); }); }
    eachField(doc, function (f, w) {
      resolve(f.evidence_ids, w);
      if (f.status === 'VERIFIED') (f.evidence_ids || []).forEach(function (id) { var e = idx.ev[id]; if (e && (e.confidence !== 'VERIFIED' || e.source_kind === 'retailer_listing')) errs.push('L3: VERIFIED field ' + w + ' cites ' + id + ' (confidence ' + e.confidence + ', ' + e.source_kind + ')'); });
    });
    eachMode(doc, function (m, w) {
      resolve(m.evidence_ids, w);
      if (m.status === 'VERIFIED') (m.evidence_ids || []).forEach(function (id) { var e = idx.ev[id]; if (e && (MANUFACTURER_KINDS.indexOf(e.source_kind) < 0 || e.confidence !== 'VERIFIED')) errs.push('L3: VERIFIED mode ' + w + ' cites non-manufacturer/non-certification source ' + id); });
    });
    (doc.devices || []).forEach(function (d) { if (d.cable && d.cable.marketing_claims) d.cable.marketing_claims.forEach(function (mc, i) { resolve(mc.evidence_ids, 'devices[' + d.device_id + '].cable.marketing_claims[' + i + ']'); }); });
    (doc.path && doc.path.segments || []).forEach(function (s) {
      var d = idx.dev[s.device_id];
      if (!d) { errs.push('L4: segment ' + s.segment_id + ' device_id ' + s.device_id + ' does not resolve'); return; }
      if (s.in_port_id != null && !portOf(d, s.in_port_id)) errs.push('L4: segment ' + s.segment_id + ' in_port_id ' + s.in_port_id + ' does not resolve');
      if (s.out_port_id != null && !portOf(d, s.out_port_id)) errs.push('L4: segment ' + s.segment_id + ' out_port_id ' + s.out_port_id + ' does not resolve');
    });
    if (doc.result) resolve(doc.result.sources, 'result.sources');
    // L7 (REM-02 NEW-L3): payload <= raw
    (doc.devices || []).forEach(function (d) { (d.ports || []).forEach(function (p) {
      var l = p.link; if (!l) return;
      if (known(l.usable_payload) && known(l.raw_bitrate) && l.usable_payload.value > l.raw_bitrate.value) errs.push('L7: devices[' + d.device_id + '].ports[' + p.port_id + '] usable_payload > raw_bitrate');
    }); });
    return errs;
  }

  // ---------------------------------------------------------------- category-level quick solver (public page)
  // Link classes the user can pick from a spec sheet. A class is a standards fact; whether a given port really
  // runs at that class is the user's spec-sheet reading, so the quick solver never returns PASS.
  var CLASS_ROWS = {
    'hdmi-18': 'HDMI-TMDS-18', 'hdmi-48': 'HDMI-FRL-48',
    'dp-hbr2': 'DP-HBR2-x4', 'dp-hbr3': 'DP-HBR3-x4', 'dp-uhbr10': 'DP-UHBR10-x4', 'dp-uhbr13.5': 'DP-UHBR13.5-x4', 'dp-uhbr20': 'DP-UHBR20-x4',
    'usbc-hbr2-x2': 'DP-HBR2-x2', 'usbc-hbr3-x2': 'DP-HBR3-x2', 'usbc-hbr2-x4': 'DP-HBR2-x4', 'usbc-hbr3-x4': 'DP-HBR3-x4'
  };
  function rowById(id) { for (var i = 0; i < STANDARDS.links.length; i++) if (STANDARDS.links[i].id === id) return STANDARDS.links[i]; return null; }
  // Assess one mode against one standards link row. timing: optional user-supplied full timing (treated as DERIVED).
  function assessLink(mode, rowId, timing) {
    var row = rowById(rowId); if (!row) throw InvalidRequest('unknown link row ' + rowId);
    var rq = requiredBitrate(mode, row.family, timing || null);
    var out = { link: row.id, label: row.label, family: row.family, payload_gbps: row.payload_gbps, payload_status: row.status, raw_gbps: row.raw_gbps, raw_status: rowRawStatus(row), sources: row.sources.slice(), required_gbps: rq.value, kind: rq.kind };
    if (rq.value === null) { out.assessment = 'UNKNOWN'; out.verdict = 'UNKNOWN'; out.why = 'HDMI 4:2:2 bits per pixel is not cited, so no arithmetic'; return out; }
    var exceedsV = (row.status === 'VERIFIED' && rq.value > row.payload_gbps) || (rowRawStatus(row) === 'VERIFIED' && rq.value > row.raw_gbps);
    if (exceedsV) { out.assessment = 'EXCEEDS'; out.verdict = 'FAIL'; out.why = (rq.kind === 'LOWER_BOUND_ONLY' ? 'even without blanking, ' : '') + fmt(rq.value) + ' Gbit/s is more than this link carries (' + (row.status === 'VERIFIED' ? fmt(row.payload_gbps) + ' Gbit/s payload' : fmt(row.raw_gbps) + ' Gbit/s raw') + ')'; }
    else if (rq.value > row.payload_gbps) { out.assessment = 'EXCEEDS'; out.verdict = 'UNKNOWN'; out.why = fmt(rq.value) + ' Gbit/s exceeds the DERIVED payload (' + fmt(row.payload_gbps) + ') but not the VERIFIED raw ceiling (' + fmt(row.raw_gbps) + ')'; }
    else if (rq.kind === 'LOWER_BOUND_ONLY') { out.assessment = 'LOWER_BOUND_ONLY'; out.verdict = 'UNKNOWN'; out.why = 'active pixels need ' + fmt(rq.value) + ' of ' + fmt(row.payload_gbps) + ' Gbit/s; blanking is not known, so it may or may not fit'; }
    else { out.assessment = rq.value / row.payload_gbps > STANDARDS.policy.fits_tight_threshold ? 'FITS_TIGHT' : 'FITS_WITH_MARGIN'; out.verdict = 'CONDITIONAL'; out.why = 'with your timing it needs ' + fmt(rq.value) + ' of ' + fmt(row.payload_gbps) + ' Gbit/s; every part must still support the mode'; }
    out.max_refresh_upper_bound_hz = rq.bpp ? Math.floor(row.payload_gbps * 1e9 / (mode.h_active * mode.v_active * rq.bpp) * 10) / 10 : null;
    return out;
  }
  function assessAllLinks(mode, timing) {
    validateMode(mode, 'mode');
    return STANDARDS.links.map(function (r) { return assessLink(mode, r.id, timing); });
  }

  var SRC = function (id) { for (var i = 0; i < STANDARDS.sources.length; i++) if (STANDARDS.sources[i].id === id) return STANDARDS.sources[i]; return null; };

  // Chain limitations (cited). chain: {source, middle, sinkInput, usbData, displays}
  function chainLimits(chain) {
    var L = [];
    var mid = chain.middle || 'none';
    if (/^usbc/.test(chain.source || '') || mid === 'usbc-dock' || mid === 'usbc-adapter') {
      L.push({ id: 'usbc-video', text: 'A USB-C connector does not prove video output. Video needs DisplayPort Alt Mode (or Thunderbolt/USB4 display) on that exact port.', sources: ['PL2', 'MS2'] });
      L.push({ id: 'usbc-lanes', text: 'DP Alt Mode uses four lanes, or two lanes when the same port also carries SuperSpeed USB 3 data (common on docks). Two lanes halve the DisplayPort bandwidth.', sources: ['A1', 'A2', 'PL2'] });
    }
    if (mid === 'usbc-dock') L.push({ id: 'dock-dp12-usb3', text: 'Plugable documents that a DisplayPort 1.2 host gives one 4K 60Hz display with USB 2.0 data, or 4K 30Hz with USB 10Gbps data through a dock; a DisplayPort 1.4 host gives 8K 30Hz/4K 120Hz with USB 2.0, or 4K 60Hz with USB 10Gbps.', sources: ['PL2'] });
    if (mid === 'displaylink-dock') L.push({ id: 'displaylink-60', text: 'Plugable documents that its DisplayLink and Silicon Motion docks are limited to 60Hz by the USB graphics controller hardware, and that most of its docks do not officially support monitors over 60Hz unless the product page says so. Other brands: check that dock’s own specification.', sources: ['PL1'] });
    if (mid === 'tb-dock') L.push({ id: 'tb-streams', text: 'Plugable documents that Thunderbolt 4 / USB4 carries two DisplayPort 1.4 streams (one 8K display or up to two 4K 60Hz displays); Thunderbolt 3 carries up to two DisplayPort 1.2 streams.', sources: ['PL2'] });
    if (mid === 'mst-hub') L.push({ id: 'mst-shared', text: 'With DisplayPort Multi-Stream (MST) one link’s bandwidth is shared among all monitors on the hub. Plugable also notes the OS does not report DP version, DSC or the DSC ratio, so the result per system is hard to predict.', sources: ['V2', 'PL5'] });
    if (mid === 'splitter') L.push({ id: 'splitter', text: 'A display splitter duplicates one signal; it cannot extend the desktop to more monitors.', sources: ['MS1'] });
    if (chain.source === 'hdmi-21-label' || chain.sinkInput === 'hdmi-21-label') L.push({ id: 'hdmi21-label', text: 'An “HDMI 2.1” label does not prove FRL or any FRL rate. HDMI 2.1 defines up to 48Gbps; many ports stay at TMDS (18Gbps class).', sources: ['H2', 'H1'] });
    if (chain.cable === 'marketing') L.push({ id: 'cable-label', text: 'A cable label like “8K 60Hz” describes one mode on one standard. It is neither a 60 Hz ceiling nor proof of your mode; certification (VESA DP40/DP80, Ultra High Speed HDMI) is what can be checked.', sources: ['V4', 'H2'] });
    L.push({ id: 'refresh-list', text: 'The refresh rates Windows offers depend on the display and what it supports; the graphics hardware, dock or adapter and cable must also support the combination. An asterisk (*) marks rates that need a different resolution.', sources: ['MS3', 'PL4'] });
    return L;
  }

  // No-signal / not-detected diagnosis. answers: {symptom, chain fields, message:'limited'|..., workedBefore:bool, windows:bool}
  function diagnoseNoSignal(a) {
    a = a || {};
    var steps = [];
    function s(id, text, sources, why) { steps.push({ id: id, text: text, sources: sources, why: why || null }); }
    s('input-power', 'Check the monitor is turned on and its input source is set to the port you plugged into.', ['MS5'], 'basic hardware check');
    if (a.windows !== false) s('win-p', 'On Windows, press Windows logo key + P and make sure Extend (or Duplicate) is selected, not “PC screen only”.', ['MS1']);
    if (a.message === 'limited') s('usbc-limited', 'Windows showed “Display connection might be limited”: the PC, the display and the cable must all support DisplayPort Alt Mode. Connect the dongle or dock directly to the PC (no hub in between) and use the USB-C port that supports DisplayPort Alt Mode.', ['MS2', 'MS4', 'PL3'], 'USB-C Alt Mode was not configured');
    if (/^usbc/.test(a.source || '') || a.middle === 'usbc-adapter' || a.middle === 'usbc-dock') {
      s('usbc-port', 'Confirm the laptop’s USB-C port does video (DisplayPort Alt Mode, Thunderbolt or USB4 display) in its manual or spec page; a data-only port gives no picture with any adapter.', ['PL2', 'PL3']);
      s('usbc-cable', 'Use the cable that came with the dock/monitor or a full-featured USB-C cable; charge-only cables carry no video.', ['PL3', 'MS2']);
    }
    s('isolate', 'Unplug other docks, dongles and adapters and test the simplest direct cable first; connected accessories can cause conflicts.', ['MS1']);
    s('swap-cable', 'Try a different cable. If the new one works, the old cable was faulty.', ['MS1']);
    s('other-port', 'If the computer has more than one video output (HDMI, DisplayPort, USB-C), try another one.', ['MS1']);
    s('other-system', 'Try the monitor with a different computer to see whether the monitor or the computer is the problem.', ['MS1']);
    if (a.middle === 'splitter') s('splitter', 'A splitter duplicates one signal; it cannot give you extra extended monitors.', ['MS1']);
    if (a.workedBefore) {
      s('reset-driver', 'It worked before: press Windows logo key + Ctrl + Shift + B to reset the graphics driver, then restart if needed.', ['MS1']);
      s('rollback', 'If it broke after an update, roll back the display driver in Device Manager.', ['MS1']);
    }
    if ((a.displays || 1) > 1) s('multi', 'For more than one external monitor: the graphics adapter must support that many displays (ask its manufacturer); one video port needs a dock or USB adapter for a second monitor.', ['MS1']);
    s('mode-too-high', 'If the screen goes black only at a high resolution or refresh rate, the connection may not carry that mode. Use the refresh check below.', ['PL4']);
    return steps;
  }


  // ---------------------------------------------------------------- quickSolve: one unified category-level check for the public page
  // It diagnoses no-signal, calculates what each link in the chain can carry, and names USB-C/DP/HDMI/dock limits.
  // It works from link classes the user reads off spec sheets, never from exact-model evidence, so it returns
  // FAIL, UNKNOWN or (only with a user-supplied full timing) CONDITIONAL. It never returns PASS.
  var PORT_CLASSES = {
    'hdmi-18': { row: 'HDMI-TMDS-18', label: 'HDMI 2.0 class (up to 18 Gbit/s)' },
    'hdmi-48': { row: 'HDMI-FRL-48', label: 'HDMI 2.1 with FRL 48 Gbit/s stated' },
    'hdmi-21-label': { row: null, label: 'HDMI 2.1 label (FRL rate not stated)', unknown: 'An “HDMI 2.1” label does not prove FRL or any FRL rate; look for the FRL rate or “48Gbps” in the spec.', sources: ['H2'] },
    'dp-hbr2': { row: 'DP-HBR2-x4', label: 'DisplayPort 1.2 / HBR2' },
    'dp-hbr3': { row: 'DP-HBR3-x4', label: 'DisplayPort 1.3/1.4 / HBR3' },
    'dp-uhbr10': { row: 'DP-UHBR10-x4', label: 'DisplayPort 2.x UHBR10' },
    'dp-uhbr13.5': { row: 'DP-UHBR13.5-x4', label: 'DisplayPort 2.x UHBR13.5' },
    'dp-uhbr20': { row: 'DP-UHBR20-x4', label: 'DisplayPort 2.x UHBR20' },
    'usbc-dp12': { row: 'DP-HBR2-x4', usbc: true, label: 'USB-C with DisplayPort Alt Mode (DP 1.2 / HBR2)' },
    'usbc-dp14': { row: 'DP-HBR3-x4', usbc: true, label: 'USB-C with DisplayPort Alt Mode (DP 1.4 / HBR3)' },
    'tb3': { row: 'DP-HBR2-x4', derived: true, label: 'Thunderbolt 3 port (DisplayPort 1.2 streams)', sources: ['PL2', 'V1', 'V3'] },
    'tb4': { row: 'DP-HBR3-x4', derived: true, label: 'Thunderbolt 4 / USB4 port (DisplayPort 1.4 streams)', sources: ['PL2', 'V2', 'V3'] },
    'usbc-unknown': { row: null, usbc: true, label: 'USB-C port, video support not confirmed', unknown: 'A USB-C connector does not prove video. Check the manual for DisplayPort Alt Mode, Thunderbolt or USB4 display output on this port.', sources: ['PL2', 'PL3'] },
    'unknown': { row: null, label: 'Not sure', unknown: 'Find the port’s DisplayPort version/link rate or HDMI bandwidth in the manual or spec page.', sources: [] }
  };
  var SINK_CLASSES = {
    'hdmi-18': PORT_CLASSES['hdmi-18'], 'hdmi-48': PORT_CLASSES['hdmi-48'], 'hdmi-21-label': PORT_CLASSES['hdmi-21-label'],
    'dp-hbr2': PORT_CLASSES['dp-hbr2'], 'dp-hbr3': PORT_CLASSES['dp-hbr3'], 'dp-uhbr10': PORT_CLASSES['dp-uhbr10'], 'dp-uhbr13.5': PORT_CLASSES['dp-uhbr13.5'], 'dp-uhbr20': PORT_CLASSES['dp-uhbr20'],
    'usbc-dp14': { row: 'DP-HBR3-x4', usbc: true, label: 'USB-C input with DisplayPort Alt Mode (DP 1.4 / HBR3)' },
    'unknown': PORT_CLASSES.unknown
  };
  var MIDDLES = ['none', 'usbc-adapter', 'usbc-dock', 'displaylink-dock', 'tb-dock', 'mst-hub', 'passive-dp-hdmi', 'splitter'];

  function lanesHalved(rowId) { return rowId === 'DP-HBR2-x4' ? 'DP-HBR2-x2' : rowId === 'DP-HBR3-x4' ? 'DP-HBR3-x2' : null; }

  function quickSolve(q) {
    q = q || {};
    var m = { h_active: q.h_active, v_active: q.v_active, refresh_hz: q.refresh_hz, bit_depth_bpc: q.bit_depth_bpc || 8, chroma: q.chroma || 'RGB' };
    validateMode(m, 'mode');
    var displays = q.displays || 1;
    if (!Number.isInteger(displays) || displays < 1 || displays > 4) throw InvalidRequest('displays must be 1–4');
    var src = PORT_CLASSES[q.source || 'unknown'], snk = SINK_CLASSES[q.sinkInput || 'unknown'];
    if (!src) throw InvalidRequest('unknown source class');
    if (!snk) throw InvalidRequest('unknown monitor input class');
    var middle = q.middle || 'none';
    if (MIDDLES.indexOf(middle) < 0) throw InvalidRequest('unknown middle device');
    var timing = null;
    if (typeof q.pixel_clock_mhz === 'number' && q.pixel_clock_mhz > 0) {
      if (q.pixel_clock_mhz * 1e6 < pixelRateActive(m)) throw InvalidRequest('pixel clock is lower than the active pixel rate; check the value (MHz)');
      timing = { pixel_clock_khz: { value: q.pixel_clock_mhz * 1000, status: 'DERIVED', derived_from: ['user-supplied pixel clock (EDID or manual), not verified by ELORUMTECH'] }, source: 'UNKNOWN' };
    }
    var els = [];
    function el(name, cls, rowId, mult, extra) {
      extra = extra || {};
      var e = { element: name, class_label: cls ? cls.label : extra.label, verdict: 'UNKNOWN', why: '', sources: (cls && cls.sources ? cls.sources.slice() : []).concat(extra.sources || []), link: null, required_gbps: null, carries_gbps: null, max_refresh_upper_bound_hz: null };
      if (extra.verdict) { e.verdict = extra.verdict; e.why = extra.why; return els.push(e); }
      if (!rowId) { e.verdict = 'UNKNOWN'; e.why = (cls && cls.unknown) || extra.why || 'capability not known'; return els.push(e); }
      var mm = Object.assign({}, m, { refresh_hz: m.refresh_hz * (mult || 1) });
      var a = assessLink(mm, rowId, timing ? { pixel_clock_khz: { value: timing.pixel_clock_khz.value * (mult || 1), status: 'DERIVED', derived_from: timing.pixel_clock_khz.derived_from }, source: 'UNKNOWN' } : null);
      e.link = a.label; e.required_gbps = a.required_gbps; e.carries_gbps = a.payload_gbps; e.payload_status = a.payload_status;
      e.max_refresh_upper_bound_hz = a.max_refresh_upper_bound_hz !== null ? Math.floor(a.max_refresh_upper_bound_hz / (mult || 1) * 10) / 10 : null;
      e.sources = uniq(e.sources.concat(a.sources));
      e.verdict = a.verdict; e.why = a.why + (mult > 1 ? ' (' + mult + ' displays share this link)' : '');
      if ((cls && cls.derived) || extra.derived) {
        if (e.verdict === 'FAIL') { e.verdict = 'UNKNOWN'; e.why = 'exceeds the DERIVED per-stream class (' + fmt(a.payload_gbps) + ' Gbit/s); confirm with the port/dock specification'; }
        else if (e.verdict === 'CONDITIONAL') e.why += '; the class is DERIVED from vendor documentation';
      }
      if (e.verdict === 'FAIL') e.why += ' — FAIL for this link class; if your port is a different class, pick that one';
      els.push(e);
    }
    // source output
    var srcRow = src.row, srcMult = (middle === 'mst-hub') ? displays : 1;
    var usbData = q.usb3_data !== false;
    if (src.usbc && srcRow && (middle === 'usbc-dock') && usbData) {
      srcRow = lanesHalved(srcRow);
      el('Computer USB-C port (2 DP lanes because the dock also carries USB 3 data)', { label: src.label + ', 2 lanes', sources: ['A2', 'PL2'] }, srcRow, srcMult);
    } else el('Computer output', src, srcRow, srcMult);
    // middle
    if (middle === 'usbc-adapter') el('USB-C adapter', null, null, 1, { label: 'USB-C → HDMI/DP adapter', why: 'Adapter output limits come from its own spec (e.g. 4K30 vs 4K60). Look up its maximum mode; the computer port must do DisplayPort Alt Mode.', sources: ['PL3', 'MS2'] });
    if (middle === 'usbc-dock') el('USB-C dock (DisplayPort Alt Mode)', null, null, 1, { label: 'USB-C Alt Mode dock', why: 'Dock output ports have their own limits; Plugable documents 4K 30Hz with USB 10Gbps data on a DP 1.2 host and 4K 60Hz with USB 10Gbps data on a DP 1.4 host.', sources: ['PL2'] });
    if (middle === 'displaylink-dock') el('DisplayLink / USB graphics dock', null, null, 1, m.refresh_hz > 60
      ? { label: 'DisplayLink or Silicon Motion dock', verdict: 'UNKNOWN', why: 'Plugable documents a 60Hz limit for its DisplayLink and Silicon Motion docks (USB graphics controller hardware). Above 60 Hz needs the computer’s own HDMI/DisplayPort or an Alt Mode/Thunderbolt dock output; check your dock’s own spec.', sources: ['PL1'] }
      : { label: 'DisplayLink or Silicon Motion dock', why: 'Needs the DisplayLink/Silicon Motion driver; check the dock’s maximum resolution per port.', sources: ['PL1'] });
    if (middle === 'tb-dock') el('Thunderbolt / USB4 dock output (per display)', { label: 'DisplayPort 1.4 stream per display (Thunderbolt 4 / USB4)', derived: true, sources: ['PL2', 'V2', 'V3'] }, 'DP-HBR3-x4', 1, { derived: true });
    if (middle === 'mst-hub') el('MST hub (displays share one link)', null, null, 1, { label: 'DisplayPort MST hub', why: 'All displays share the computer link (checked above with ' + displays + ' displays). The OS does not report DP version, DSC or the DSC ratio, so test before buying more monitors.', sources: ['V2', 'PL5'] });
    if (middle === 'splitter') el('Splitter', null, null, 1, displays > 1 ? { label: 'Display splitter', verdict: 'FAIL', why: 'A splitter duplicates one signal; it cannot extend the desktop to more monitors.', sources: ['MS1'] } : { label: 'Display splitter', why: 'A splitter duplicates one signal; its own maximum mode applies.', sources: ['MS1'] });
    if (middle === 'passive-dp-hdmi') el('Passive DisplayPort → HDMI adapter', null, null, 1, { label: 'Passive DP → HDMI', why: 'Works only if the computer’s DisplayPort output supports dual-mode (DP++); the HDMI side then sets the limit.', sources: [] });
    // cable
    var cab = q.cable || 'unknown';
    if (cab === 'certified') els.push({ element: 'Cable', class_label: 'Certified cable (VESA DP40/DP80 or similar, Ultra High Speed HDMI)', verdict: 'CONDITIONAL', why: 'Certified for its rated link within its certified length; confirm the rating covers the link above.', sources: ['V4', 'H2'] });
    else els.push({ element: 'Cable', class_label: cab === 'marketing' ? 'Label only (e.g. “8K 60Hz”)' : 'Not sure', verdict: 'UNKNOWN', why: 'A label like “8K 60Hz” describes one mode on one standard; it is neither a 60 Hz ceiling nor proof of your mode. A certified cable is the checkable option.', sources: ['V4', 'H2'] });
    // monitor input
    el('Monitor input', snk, snk.row, 1);

    var overall = worstOf(els.map(function (e) { return e.verdict; }));
    if (overall === 'PASS') overall = 'CONDITIONAL'; // the quick check never verifies exact models
    var limiting = els.filter(function (e) { return e.verdict === overall; })[0] || null;
    var withMax = els.filter(function (e) { return e.max_refresh_upper_bound_hz !== null; }).sort(function (a, b) { return a.max_refresh_upper_bound_hz - b.max_refresh_upper_bound_hz; })[0] || null;
    var limits = chainLimits({ source: src.usbc ? 'usbc' : q.source, middle: middle, sinkInput: q.sinkInput, cable: cab });
    var steps = (q.symptom === 'no-signal' || q.message === 'limited') ? diagnoseNoSignal({ source: src.usbc ? 'usbc' : q.source, middle: middle === 'usbc-adapter' || middle === 'usbc-dock' ? middle : (middle === 'splitter' ? 'splitter' : middle), message: q.message, workedBefore: !!q.workedBefore, displays: displays, windows: q.os !== 'mac' }) : [];
    var refreshSteps = q.symptom === 'refresh' ? [
      { id: 'advanced-display', text: 'Windows: Start > Settings > System > Display > Advanced display. The Display information panel shows the current resolution and refresh rate; pick the rate next to “Choose a refresh rate”.', sources: ['MS3'] },
      { id: 'asterisk', text: 'An asterisk (*) next to a rate means it does not support your current resolution; choosing it changes the resolution.', sources: ['MS3', 'PL4'] },
      { id: 'every-part', text: 'If the rate is missing, every part — computer/graphics, dock or adapter, cable and the monitor input — must support that resolution and refresh combination.', sources: ['PL4'] }
    ] : [];
    var toPass = [];
    if (overall !== 'FAIL') toPass.push('The monitor’s manual or spec page lists ' + modeLabel(m) + ' for the exact input you use (a verified mode for that port).');
    if (!timing) toPass.push('Optional: the timing (pixel clock) from the monitor’s manual or EDID turns the calculation from a lower bound into a full check.');
    if (cab !== 'certified') toPass.push('A certified cable (VESA-certified DisplayPort, or certified Ultra High Speed HDMI for 48 Gbit/s links) within its certified length.');
    return {
      verdict: overall, mode: m, displays: displays, elements: els, limiting_element: limiting ? limiting.element : null,
      lowest_max_refresh: withMax ? { element: withMax.element, hz: withMax.max_refresh_upper_bound_hz } : null,
      limits: limits, diagnosis: steps, refresh_steps: refreshSteps, to_confirm: toPass,
      note: 'Quick check from link classes, not exact models: it never returns PASS. Calculated values are upper bounds before blanking unless you give a pixel clock.'
    };
  }

  return {
    VERSION: '0.2.0',
    VERDICTS: VERDICTS.slice(), STANDARDS: STANDARDS,
    worst: worst, worstOf: worstOf,
    validateRequest: validateRequest, bitsPerPixel: bitsPerPixel, requiredBitrate: requiredBitrate, linkRow: linkRow, portCapacity: portCapacity,
    evaluate: evaluate, validateDocument: validateDocument, lint: lint,
    assessLink: assessLink, assessAllLinks: assessAllLinks, CLASS_ROWS: CLASS_ROWS, chainLimits: chainLimits, diagnoseNoSignal: diagnoseNoSignal,
    source: SRC, modeLabel: modeLabel, quickSolve: quickSolve, PORT_CLASSES: PORT_CLASSES, SINK_CLASSES: SINK_CLASSES, MIDDLES: MIDDLES
  };
});
