/**
 * ELORUMTECH Compatibility Engine — pure classification (no DOM).
 * Solve Before You Buy: prefer keep-yours / direct paths; never invent capture for play-only.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.ElorumEngine = api;
  }
  return api;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this), function () {
  'use strict';

  var OUTCOMES = {
    KEEP: 'KEEP YOURS',
    DIRECT: 'DIRECT CONNECTION',
    ADAPTER: 'ADAPTER/CABLE REQUIRED',
    DOCK: 'DOCK REQUIRED',
    CAPTURE: 'CAPTURE HARDWARE REQUIRED'
  };

  var DEFAULT_INTENTS = {
    video: true,
    refresh: true,
    charging: false,
    data: false,
    oneCable: false,
    capture: false
  };

  function normalizeIntents(raw) {
    var i = Object.assign({}, DEFAULT_INTENTS);
    if (!raw) return i;
    if (Array.isArray(raw)) {
      var map = {
        video: 'video',
        refresh: 'refresh',
        'highest refresh rate': 'refresh',
        charging: 'charging',
        data: 'data',
        'one cable': 'oneCable',
        onecable: 'oneCable',
        capture: 'capture',
        'record / capture': 'capture',
        'record/capture': 'capture'
      };
      Object.keys(i).forEach(function (k) { i[k] = false; });
      raw.forEach(function (label) {
        var key = map[String(label).toLowerCase().replace(/^✓\s*/, '').trim()];
        if (key) i[key] = true;
      });
      return i;
    }
    Object.keys(DEFAULT_INTENTS).forEach(function (k) {
      if (typeof raw[k] === 'boolean') i[k] = raw[k];
    });
    return i;
  }

  function flags(a, b) {
    return {
      isMac: /MacBook/i.test(a),
      isWin: /Windows/i.test(a),
      isPS5: /PlayStation/i.test(a),
      isPhone: /phone/i.test(a),
      isIpad: /iPad/i.test(a),
      isDeck: /Steam Deck|handheld/i.test(a),
      isXbox: /Xbox/i.test(a),
      isSwitch2: /Nintendo Switch 2/i.test(a),
      isLaptop: /MacBook|Windows/i.test(a),
      isConsole: /PlayStation|Xbox|Nintendo Switch 2/i.test(a),
      isUsbCHost: /MacBook|Windows|phone|iPad|Steam Deck|handheld/i.test(a),
      destCharger: /charger/i.test(b),
      destPortable: /Portable USB-C/i.test(b),
      destDock: /dock/i.test(b),
      dest1440: /1440p/i.test(b),
      destHdmi: /HDMI/i.test(b),
      destDp: /DisplayPort/i.test(b),
      destUsbCMon: /4K USB-C monitor/i.test(b) || (/USB-C monitor/i.test(b) && !/Portable/i.test(b) && !/dock/i.test(b) && !/charger/i.test(b) && !/DisplayPort/i.test(b) && !/HDMI/i.test(b))
    };
  }

  function intentNotes(intents, f) {
    var notes = [];
    if (intents.charging) {
      notes.push('Charging intent: emphasize USB Power Delivery (USB PD) profiles, cable wattage rating, and EPR where relevant—verify exact device wattage.');
    }
    if (intents.oneCable) {
      notes.push('One-cable intent: prefer a native Thunderbolt / USB-C DisplayPort Alt Mode path when source and display share it; skip a dock when a direct rated cable already carries video + PD.');
    }
    if (intents.refresh) {
      notes.push('Highest refresh intent: bandwidth matters—HDMI Ultra High Speed class for high HDMI modes; DisplayPort / USB-C Alt Mode / Thunderbolt link rates for USB-C and DP panels. Verify host, cable, and display input limits.');
    }
    if (intents.data) {
      notes.push('Data intent: hub/dock shared bandwidth can starve high-refresh video or fast storage—count ports and upstream link class (USB 3.x vs USB4 / Thunderbolt).');
    }
    if (intents.video) {
      notes.push('Video intent: every display path needs a video-capable link (Alt Mode, Thunderbolt/USB4 display, or HDMI)—not a charge-only cable.');
    }
    if (intents.capture) {
      notes.push('Record/capture intent: play-only console→TV paths do not need a capture card; capture requires HDMI (or similar) loop/in hardware when you record or stream from the source.');
    }
    /* N — port-capability honesty (not SKU explosion) */
    if ((f.isLaptop || f.isPhone || f.isIpad) && !f.destCharger) {
      notes.push('Port capability warn: Confirm DP Alt Mode / Thunderbolt / USB4 on this specific port—connector shape alone is not proof of video. See Methodology for how we frame unknowns.');
    }
    return notes;
  }

  function guideLinksFor(a, b, f, intents) {
    var guides = [];
    function add(href, label) {
      if (guides.length >= 2) return;
      if (guides.some(function (g) { return g[0] === href; })) return;
      guides.push([href, label]);
    }

    /* J/M — capture intent: capture guide first; never prefer play-only console→monitor guides */
    if (intents.capture) {
      add('guides/hdmi-capture-passthrough-path.html', 'HDMI capture / passthrough path');
      return guides.slice(0, 2);
    }

    /* A/M — laptop → dock + oneCable: prioritize Thunderbolt one-cable guide */
    if (f.isLaptop && f.destDock && intents.oneCable) {
      add('guides/thunderbolt-dock-one-cable-4k-120.html', 'Thunderbolt dock one-cable 4K/120');
      /* BN-1: dual-monitor can fill second slot when data; TB stays first */
      if (intents.data) {
        add('guides/dual-monitor-dock-mst-vs-thunderbolt.html', 'Dual-monitor: MST vs Thunderbolt');
      } else {
        add(intents.refresh ? 'guides/usb4-vs-thunderbolt-4-monitor.html' : 'guides/usb-c-hub-vs-dock.html',
            intents.refresh ? 'USB4 vs Thunderbolt 4 · monitors' : 'USB-C hub vs dock');
      }
      return guides.slice(0, 2);
    }

    /* BN-3 — Switch 2: HDMI-via-dock host (not Deck Alt Mode) */
    if (f.isSwitch2) {
      add('guides/nintendo-switch-2-display-path.html', 'Nintendo Switch 2 → display path');
      if (f.destHdmi || f.dest1440) add('guides/ps5-hdmi-2-1-cable-path.html', 'Ultra High Speed HDMI cable path');
    }
    if (f.isXbox) {
      add('guides/xbox-series-display-compatibility.html', 'Xbox Series display compatibility');
      if (f.destHdmi || f.dest1440) add('guides/ps5-hdmi-2-1-cable-path.html', 'Ultra High Speed HDMI cable path');
    }
    if (f.isDeck) {
      add('guides/steam-deck-external-display.html', 'Steam Deck external display');
      if (f.destHdmi) add('guides/usb-c-to-hdmi-adapter-path.html', 'USB-C → HDMI adapter path');
      if (f.destDock) add('guides/usb-c-hub-vs-dock.html', 'USB-C hub vs dock');
      if (f.destPortable) add('guides/usb-c-laptop-to-4k-monitor.html', 'USB-C → monitor / portable patterns');
    }
    if (f.isIpad) {
      add('guides/ipad-usbc-to-monitor-hdmi.html', 'iPad USB-C → monitor / HDMI');
      if (f.destCharger) add('guides/usb-c-pd-charger-compatibility.html', 'USB-C PD charger compatibility');
      if (f.destHdmi) add('guides/usb-c-to-hdmi-adapter-path.html', 'USB-C → HDMI adapter path');
    }
    if (f.destDp) {
      add('guides/displayport-monitor-connection-path.html', 'DisplayPort monitor connection path');
    }
    if (f.destCharger) {
      add('guides/usb-c-pd-charger-compatibility.html', 'USB-C PD charger compatibility');
      if (f.isPhone) add('guides/usb-c-phone-to-monitor.html', 'USB-C phone → monitor');
    } else if (f.destPortable) {
      if (f.isPhone) add('guides/usb-c-phone-to-monitor.html', 'USB-C phone → monitor');
      if (f.isPS5 || f.isXbox) {
        add('guides/ps5-to-1440p-monitor.html', 'Console → HDMI monitor path');
        add('guides/ps5-hdmi-2-1-cable-path.html', 'HDMI cable bandwidth path');
      }
      if (f.isDeck) add('guides/steam-deck-external-display.html', 'Steam Deck external display');
      if (f.isLaptop || f.isIpad) add('guides/usb-c-laptop-to-4k-monitor.html', 'USB-C laptop → 4K monitor');
    } else if (f.destDock) {
      if (f.isPhone || f.isIpad) {
        add('guides/usb-c-hub-vs-dock.html', 'USB-C hub vs dock');
        if (f.isPhone) add('guides/usb-c-phone-to-monitor.html', 'USB-C phone → monitor');
        if (f.isIpad) add('guides/ipad-usbc-to-monitor-hdmi.html', 'iPad USB-C → monitor / HDMI');
      } else if (f.isConsole) {
        add('guides/ps5-hdmi-2-1-cable-path.html', 'HDMI cable path (consoles)');
        if (f.isXbox) add('guides/xbox-series-display-compatibility.html', 'Xbox Series display compatibility');
        else add('guides/ps5-to-1440p-monitor.html', 'PS5 → 1440p monitor');
      } else if (f.isDeck) {
        add('guides/steam-deck-external-display.html', 'Steam Deck external display');
        add('guides/usb-c-hub-vs-dock.html', 'USB-C hub vs dock');
      } else {
        /* default laptop→dock without oneCable: hub + dual-monitor (data) or laptop-dock */
        add('guides/usb-c-hub-vs-dock.html', 'USB-C hub vs dock');
        if (intents.data) {
          add('guides/dual-monitor-dock-mst-vs-thunderbolt.html', 'Dual-monitor: MST vs Thunderbolt');
        } else {
          add('guides/laptop-to-docking-station.html', 'Laptop → docking station');
        }
      }
    } else if (f.dest1440 || f.destHdmi) {
      if (f.isPS5) {
        add('guides/ps5-hdmi-2-1-cable-path.html', 'PS5 HDMI 2.1 cable path');
        add('guides/ps5-to-1440p-monitor.html', 'PS5 → 1440p monitor');
      } else if (f.isXbox) {
        add('guides/xbox-series-display-compatibility.html', 'Xbox Series display compatibility');
        add('guides/ps5-hdmi-2-1-cable-path.html', 'Ultra High Speed HDMI cable path');
      } else if (f.isPhone) {
        add('guides/usb-c-phone-to-monitor.html', 'USB-C phone → monitor');
        add('guides/usb-c-to-hdmi-adapter-path.html', 'USB-C → HDMI adapter path');
      } else if (f.isIpad) {
        add('guides/ipad-usbc-to-monitor-hdmi.html', 'iPad USB-C → monitor / HDMI');
        add('guides/usb-c-to-hdmi-adapter-path.html', 'USB-C → HDMI adapter path');
      } else if (f.isDeck) {
        add('guides/steam-deck-external-display.html', 'Steam Deck external display');
        add('guides/usb-c-to-hdmi-adapter-path.html', 'USB-C → HDMI adapter path');
      } else if (f.isMac) {
        add('guides/macbook-to-hdmi-display.html', 'MacBook → HDMI display');
        add('guides/usb-c-to-hdmi-adapter-path.html', 'USB-C → HDMI adapter path');
      } else {
        add('guides/usb-c-to-hdmi-adapter-path.html', 'USB-C → HDMI adapter path');
        add('guides/macbook-to-hdmi-display.html', 'Laptop → HDMI display');
      }
    } else if (f.destDp) {
      if (f.isConsole) {
        add(f.isXbox ? 'guides/xbox-series-display-compatibility.html' : 'guides/ps5-to-1440p-monitor.html', 'Console display path (HDMI, not DP out)');
        add('guides/displayport-monitor-connection-path.html', 'DisplayPort monitor connection path');
      } else if (f.isDeck) {
        add('guides/steam-deck-external-display.html', 'Steam Deck external display');
        add('guides/displayport-monitor-connection-path.html', 'DisplayPort monitor connection path');
      } else if (f.isIpad) {
        add('guides/ipad-usbc-to-monitor-hdmi.html', 'iPad USB-C → monitor / HDMI');
        add('guides/displayport-monitor-connection-path.html', 'DisplayPort monitor connection path');
      } else {
        add('guides/displayport-monitor-connection-path.html', 'DisplayPort monitor connection path');
        add('guides/usb-c-laptop-to-4k-monitor.html', 'USB-C laptop → 4K monitor');
      }
    } else {
      /* USB-C monitor default */
      if (f.isPhone) {
        add('guides/usb-c-phone-to-monitor.html', 'USB-C phone → monitor');
        add('guides/usb-c-laptop-to-4k-monitor.html', 'USB-C laptop → 4K monitor');
      } else if (f.isPS5 || f.isXbox) {
        add(f.isXbox ? 'guides/xbox-series-display-compatibility.html' : 'guides/ps5-to-1440p-monitor.html', 'Console → display (use HDMI)');
        add('guides/ps5-hdmi-2-1-cable-path.html', 'HDMI cable path');
      } else if (f.isIpad) {
        add('guides/ipad-usbc-to-monitor-hdmi.html', 'iPad USB-C → monitor / HDMI');
        add('guides/usb-c-laptop-to-4k-monitor.html', 'USB-C → 4K monitor patterns');
      } else if (f.isDeck) {
        add('guides/steam-deck-external-display.html', 'Steam Deck external display');
        add('guides/usb-c-laptop-to-4k-monitor.html', 'USB-C → monitor patterns');
      } else {
        add('guides/usb-c-laptop-to-4k-monitor.html', 'USB-C laptop → 4K monitor');
        add('guides/usb4-vs-thunderbolt-4-monitor.html', 'USB4 vs Thunderbolt 4 · monitors');
      }
    }
    return guides.slice(0, 2);
  }


  /**
   * Classify outcome category from source, destination, intents.
   */
  function classifyOutcome(a, b, intentsRaw) {
    var intents = normalizeIntents(intentsRaw);
    var f = flags(a, b);

    if (intents.capture) {
      return OUTCOMES.CAPTURE;
    }

    /* Charger destinations */
    if (f.destCharger) {
      if (f.isConsole) {
        return OUTCOMES.ADAPTER; /* wrong primary path — redirect mentally to HDMI; accessory PD may need correct cable */
      }
      if (intents.charging || !intents.video) {
        return OUTCOMES.KEEP; /* OEM / existing PD often adequate — verify wattage */
      }
      return OUTCOMES.KEEP;
    }

    /* User explicitly chose a dock destination */
    if (f.destDock) {
      if (f.isConsole) {
        return OUTCOMES.DIRECT; /* consoles: HDMI direct, not laptop dock */
      }
      if (f.isPhone || f.isIpad) {
        return intents.data || intents.oneCable ? OUTCOMES.DOCK : OUTCOMES.ADAPTER;
      }
      if (intents.oneCable && !intents.data && (f.isLaptop || f.isDeck)) {
        /* one-cable alone often better as direct TB/USB-C monitor — but user picked dock */
        return OUTCOMES.DOCK;
      }
      return OUTCOMES.DOCK;
    }

    /* Consoles → non-HDMI / wrong inputs */
    if (f.isConsole) {
      if (f.destPortable || f.destUsbCMon || f.destDp) {
        return OUTCOMES.ADAPTER; /* need HDMI path / conversion warning — treat as cable/path correction */
      }
      if (f.destHdmi || f.dest1440) {
        if (intents.refresh) {
          return OUTCOMES.KEEP; /* supplied HDMI often enough; Ultra High Speed when high modes needed — keep-first */
        }
        return OUTCOMES.DIRECT;
      }
      return OUTCOMES.DIRECT;
    }

    /* Portable USB-C display */
    if (f.destPortable) {
      if (f.isPhone || f.isIpad) return OUTCOMES.ADAPTER;
      if (f.isDeck) return intents.oneCable ? OUTCOMES.DIRECT : OUTCOMES.ADAPTER;
      if (f.isLaptop) return intents.oneCable ? OUTCOMES.DIRECT : OUTCOMES.KEEP;
      return OUTCOMES.ADAPTER;
    }

    /* DisplayPort monitor */
    if (f.destDp) {
      if (f.isLaptop) {
        if (intents.oneCable) return OUTCOMES.DIRECT; /* USB-C/TB → DP Alt or TB cable */
        if (intents.data && intents.video) return OUTCOMES.DOCK;
        return OUTCOMES.ADAPTER; /* often USB-C→DP cable/adapter */
      }
      if (f.isDeck) return OUTCOMES.ADAPTER; /* Deck DP Alt via dock/cable — verify */
      if (f.isIpad || f.isPhone) return OUTCOMES.ADAPTER;
      return OUTCOMES.ADAPTER;
    }

    /* HDMI destinations for USB-C hosts */
    if (f.destHdmi || f.dest1440) {
      if (f.isLaptop || f.isIpad || f.isPhone || f.isDeck) {
        if (intents.oneCable && intents.charging && intents.data) return OUTCOMES.DOCK;
        if (intents.oneCable && !intents.data) {
          /* one cable to HDMI display usually still needs adapter or dock HDMI out */
          return intents.charging ? OUTCOMES.DOCK : OUTCOMES.ADAPTER;
        }
        return OUTCOMES.ADAPTER;
      }
      return OUTCOMES.ADAPTER;
    }

    /* USB-C / Thunderbolt monitor (default) */
    if (f.isPhone || f.isIpad) {
      return OUTCOMES.ADAPTER; /* video-rated cable / hub; not always charge cable */
    }
    if (f.isDeck) {
      return intents.oneCable ? OUTCOMES.DIRECT : OUTCOMES.ADAPTER;
    }
    if (f.isLaptop) {
      if (intents.oneCable) return OUTCOMES.DIRECT;
      if (intents.data && intents.charging && intents.video) {
        /* multi-function desk without one-cable monitor may need dock — but USB-C monitor can be direct */
        return OUTCOMES.DIRECT;
      }
      return OUTCOMES.KEEP; /* existing USB-C cable often adequate */
    }
    return OUTCOMES.DIRECT;
  }

  function buildResult(a, b, intentsRaw) {
    var intents = normalizeIntents(intentsRaw);
    var f = flags(a, b);
    var outcome = classifyOutcome(a, b, intents);
    var notes = intentNotes(intents, f);
    var path = '';
    var spec = '';
    var keepYours = '';

    if (outcome === OUTCOMES.CAPTURE) {
      path = a + ' → HDMI (or documented video out) → capture device IN → PC/stream software (display/TV optional via loop-out)';
      spec = 'Capture is separate from play-only viewing. A capture card or capture-capable device sits in the video path when you record or stream. Console→TV play does not require capture hardware. Verify HDMI version/bandwidth on capture IN and whether you need passthrough to a display. Standards-backed framing—verify exact capture device specs.';
      keepYours = 'Keep your existing display cable for play-only viewing; add capture hardware only if Record / capture is a real goal.';
      return finalize(outcome, path, spec, keepYours, notes, a, b, f, intents);
    }

    if (f.destCharger) {
      path = a + ' → USB-C PD charger (wattage + cable rating)';
      if (f.isPhone) {
        spec = 'USB-C PD path (phone): match charger PD profile to the phone’s documented fast-charge/PD requirement and use a cable rated for that wattage. Keep the OEM charger when it already meets the need.';
      } else if (f.isSwitch2) {
        spec = 'USB-C PD path (Nintendo Switch 2): TV Mode requires the Switch 2 dock with the Switch 2 AC adapter (NGN-01 class)—not a random laptop PD brick as the video path. Handheld charging can use documented USB-C PD; picture on a TV still needs the dock HDMI path.';
      } else if (f.isConsole) {
        spec = 'USB-C PD path (console accessory): the console picture path is HDMI, not a laptop-style PD charger destination. For controllers/accessories, match PD or USB power to accessory docs. For the TV/monitor, use HDMI.';
      } else if (f.isIpad) {
        spec = 'USB-C PD path (iPad): match Apple’s documented USB-C charging guidance for your iPad model, charger wattage, and cable rating. Many iPads accept a range of USB-C PD chargers—verify exact model. Keep a working OEM or PD charger that already sustains charge.';
      } else if (f.isDeck) {
        spec = 'USB-C PD path (Steam Deck / handheld): use a PD charger and cable within Valve’s documented power guidance for your Deck model. Prefer PD over random high-watt bricks with unknown profiles. Keep a working PD charger/cable that already charges reliably.';
      } else {
        spec = 'USB-C PD path (laptop): verify device power requirement, charger PD/EPR profile and cable wattage. A phone brick often under-powers a laptop. Keep a working OEM charger when it sustains load.';
      }
      keepYours = 'Keep your existing PD charger and cable when they already meet the device’s documented wattage and cable rating.';
      return finalize(outcome, path, spec, keepYours, notes, a, b, f, intents);
    }

    if (f.destDock) {
      path = a + ' → USB-C/Thunderbolt host link → dock → displays/PD/peripherals';
      if (f.isPhone) {
        spec = 'Dock path (phone): most phones do not implement full Thunderbolt dock matrices. Prefer a simple Alt Mode hub documented for phones, confirm wired video, and treat PD charging separately.';
        keepYours = 'Keep a hub that already mirrors; skip full Thunderbolt docks unless your phone docs support that matrix.';
      } else if (f.isIpad) {
        spec = 'Dock path (iPad): prefer hubs/docks documented for iPad USB-C video and PD. External display modes vary by iPad model (verify exact model / Stage Manager limits). A full Thunderbolt laptop dock is often overkill.';
        keepYours = 'Keep a working iPad-compatible hub if it already drives your display and charges within documented limits.';
      } else if (f.isSwitch2) {
        path = a + ' → Nintendo Switch 2 dock → HDMI OUT → display (laptop USB-C dock is not the TV path)';
        spec = 'Dock path (Nintendo Switch 2): TV Mode video goes through the Nintendo Switch 2 dock HDMI out—not a laptop Thunderbolt/USB-C dock and not a generic USB-C→monitor Alt Mode assumption. Keep the official Switch 2 dock, Switch 2 AC adapter (NGN-01 class), and Ultra High Speed HDMI. Original Switch dock/HDMI/AC are documented as unsuitable for Switch 2 TV mode.';
        keepYours = 'Keep your Nintendo Switch 2 dock, correct AC adapter, and Ultra High Speed HDMI when they already deliver TV Mode; do not buy a laptop dock for Switch 2 video.';
      } else if (f.isConsole) {
        path = a + ' → HDMI OUT → display (laptop-style USB-C dock is not the video path)';
        spec = 'Dock path (console): Xbox Series and PlayStation use HDMI OUT for video—not a USB-C/Thunderbolt laptop dock. Use HDMI to the display. “Console dock” marketing is a different category—verify HDMI claims separately.';
        keepYours = 'Keep your HDMI cable and display path; do not buy a laptop dock for console video.';
      } else if (f.isDeck) {
        spec = 'Dock path (Steam Deck): Valve documents USB-C DisplayPort Alt Mode patterns via official/compatible docks for external displays, PD and ports. Verify Deck model + dock compatibility. A direct video-rated USB-C cable to a USB-C/DP display can skip a full dock when you only need video (+ optional PD).';
        keepYours = 'Keep an official or known-good Deck dock if it already meets display + charge needs; otherwise prefer the simplest path that works.';
      } else {
        spec = 'Dock path (laptop): verify USB-C / USB4 / Thunderbolt host requirement, display support matrix and PD wattage. Decide hub vs dock by display count, PD and bandwidth. Keep a dock that already meets the desk load.';
        keepYours = 'Keep your current dock when it already drives your displays, PD wattage and peripherals.';
      }
      return finalize(outcome, path, spec, keepYours, notes, a, b, f, intents);
    }

    if (f.destPortable) {
      path = a + ' → video-rated USB-C cable → portable USB-C display';
      if (f.isPhone) {
        spec = 'Portable USB-C display (phone): requires phone DisplayPort Alt Mode (or documented wired desktop/video mode) plus a video-capable cable—not a charge-only phone cable. Expect modest resolutions vs laptop docks.';
        keepYours = 'Keep a working video-rated cable/hub; keep the charge cable for charging only.';
      } else if (f.isIpad) {
        spec = 'Portable USB-C display (iPad): many iPads can mirror/extend within model-specific external display limits—verify exact iPad model. Use a video-capable USB-C cable; charge-only cables fail.';
        keepYours = 'Keep a cable that already drives the portable panel; verify iPad external-display mode for your model.';
      } else if (f.isSwitch2) {
        path = a + ' → Nintendo Switch 2 dock → HDMI → HDMI display (not portable USB-C upstream)';
        spec = 'Portable USB-C display (Nintendo Switch 2): do not assume USB-C Alt Mode direct-to-monitor. Nintendo documents TV Mode via the Switch 2 dock HDMI path. Use an HDMI TV/monitor with the official dock + Ultra High Speed HDMI + correct AC; skip portable USB-C upstream for Switch 2 play.';
        keepYours = 'Keep the Switch 2 dock + HDMI display path; skip USB-C portable panels as a substitute for dock TV Mode.';
      } else if (f.isConsole) {
        path = a + ' → HDMI (not portable USB-C upstream) → suitable display';
        spec = 'Portable USB-C display (console): consoles are HDMI-out. A portable USB-C panel will not accept console video without an unsupported conversion path—use an HDMI monitor/TV and verify the HDMI input.';
        keepYours = 'Keep your HDMI cable and an HDMI-capable display; skip USB-C portable panels for console play.';
      } else if (f.isDeck) {
        spec = 'Portable USB-C display (Steam Deck): Deck USB-C supports DisplayPort Alt Mode patterns documented for docks/external display—verify your Deck model and whether the portable panel needs separate power. Use a video-rated cable.';
        keepYours = 'Keep a video-rated USB-C cable that already drives the panel; add a dock only for extra ports.';
      } else {
        spec = 'Portable USB-C display (laptop): verify host DP Alt Mode/Thunderbolt/USB4 display, portable panel USB-C video input, and whether the panel needs separate power.';
        keepYours = 'Keep a working video-rated cable when it already drives the panel.';
      }
      return finalize(outcome, path, spec, keepYours, notes, a, b, f, intents);
    }

    if (f.destDp) {
      path = a + ' → DisplayPort path → DisplayPort monitor';
      if (f.isSwitch2) {
        path = a + ' → Nintendo Switch 2 dock → HDMI OUT → display HDMI IN (no DisplayPort out)';
        spec = 'DisplayPort monitor (Nintendo Switch 2): Switch 2 TV Mode is HDMI via the dock—not DisplayPort out and not USB-C Alt Mode to a DP panel. Use the monitor’s HDMI input with Ultra High Speed HDMI from the Switch 2 dock.';
        keepYours = 'Keep the Switch 2 dock + HDMI-to-monitor path; do not assume DP-only peaks or Alt Mode success.';
      } else if (f.isConsole) {
        path = a + ' → HDMI OUT → display (consoles do not output DisplayPort)';
        spec = 'DisplayPort monitor (console): Xbox Series and PS5 output HDMI only. Use the monitor’s HDMI input (check HDMI refresh/VRR limits—often different from DP marketing peaks). An active DP conversion path is the wrong default for play.';
        keepYours = 'Keep an HDMI cable to the monitor’s HDMI input; do not assume DisplayPort-only peaks apply.';
      } else if (f.isLaptop) {
        spec = 'DisplayPort monitor (laptop): common paths are USB-C/Thunderbolt → DP Alt Mode cable, USB-C→DP adapter, or dock DP out. Thunderbolt 4 hosts often support one-cable video (+ PD on TB/USB-C displays). Match DP version/link rate to resolution and refresh. Standards-backed—verify exact GPU/port.';
        keepYours = intents.oneCable
          ? 'If a direct USB-C/Thunderbolt cable already drives the DP or USB-C monitor with the features you need, keep it and skip a dock.'
          : 'Keep a working USB-C→DP cable or adapter when it already hits your resolution and refresh.';
      } else if (f.isDeck) {
        spec = 'DisplayPort monitor (Steam Deck): external display typically uses USB-C DisplayPort Alt Mode via a dock or USB-C→DP/HDMI adapter—confirm Valve/support docs for your Deck and the adapter. Direct DP-out is not a Deck port.';
        keepYours = 'Keep a known-good Deck dock or adapter path that already shows a stable image.';
      } else if (f.isIpad || f.isPhone) {
        spec = 'DisplayPort monitor (tablet/phone): usually USB-C Alt Mode → USB-C→DP adapter or hub DP out. External modes vary widely by model—verify exact device docs. Charge-only cables will not carry video.';
        keepYours = 'Keep a video-rated adapter that already works; verify model-specific external display limits.';
      } else {
        spec = 'DisplayPort path: match source output, cable/adapter, and monitor DP input capabilities for resolution and refresh.';
        keepYours = 'Keep working DP cables/adapters when the mode already works.';
      }
      return finalize(outcome, path, spec, keepYours, notes, a, b, f, intents);
    }

    if (f.dest1440) {
      path = a + ' → HDMI path → 1440p high-refresh monitor';
      if (f.isSwitch2) {
        spec = 'HDMI path (Nintendo Switch 2 → 1440p/high refresh): TV Mode is Switch 2 dock → Ultra High Speed HDMI → monitor HDMI IN. Confirm the monitor’s HDMI timings (not DP marketing). Keep the official dock + correct AC; do not treat USB-C→monitor adapters as the documented path.';
        keepYours = 'Keep Switch 2 dock + Ultra High Speed HDMI when 1440p / refresh already works on the HDMI input.';
      } else if (f.isPS5 || f.isXbox) {
        spec = 'HDMI path (console → 1440p/high refresh): verify the monitor’s HDMI input timings (not DisplayPort marketing), VRR if needed, and cable bandwidth. ' + (f.isXbox ? 'Xbox Series outputs HDMI like other modern consoles—confirm HDMI features per Microsoft display docs for your model.' : 'Keep the supplied HDMI cable when it already delivers the mode.');
        keepYours = 'Keep the supplied or existing HDMI cable when it already delivers your 1440p / refresh / VRR target.';
      } else if (f.isPhone || f.isIpad) {
        spec = 'HDMI path (mobile → 1440p): only with Alt Mode (or documented wired video) plus a USB-C→HDMI adapter rated for the mode. Many mobile devices top out below laptop/console gaming refresh—verify exact model.';
        keepYours = 'Keep a working video-rated adapter; do not reuse a charge-only cable for HDMI.';
      } else if (f.isDeck) {
        spec = 'HDMI path (Steam Deck → 1440p): typically USB-C → dock or USB-C→HDMI adapter → HDMI monitor. Confirm adapter/dock bandwidth vs your refresh target; Deck dock patterns are documented by Valve for external displays—verify exact setup.';
        keepYours = 'Keep a dock/adapter that already reaches your HDMI mode; skip extras when direct enough.';
      } else {
        spec = 'HDMI path (laptop → 1440p/high refresh): use USB-C/Thunderbolt→HDMI adapter or dock HDMI out rated for the timing, plus an HDMI cable and monitor HDMI input that match.';
        keepYours = 'Keep working adapters; skip conversion if a USB-C/DP monitor path already works.';
      }
      return finalize(outcome, path, spec, keepYours, notes, a, b, f, intents);
    }

    if (f.destHdmi) {
      path = a + ' → HDMI path → display';
      if (f.isSwitch2) {
        path = a + ' → Nintendo Switch 2 dock → Ultra High Speed HDMI → display';
        spec = 'HDMI path (Nintendo Switch 2): Nintendo documents TV Mode via the Switch 2 dock HDMI connector with Ultra High Speed HDMI and the Switch 2 AC adapter. KEEP the official dock path when it already works. Play-only does not require capture hardware. Do not claim USB-C Alt Mode direct-to-monitor success for Switch 2.';
        keepYours = 'Keep the Nintendo Switch 2 dock, NGN-01-class AC adapter, and Ultra High Speed HDMI when TV Mode already works.';
      } else if (f.isPS5 || f.isXbox) {
        spec = 'HDMI path (console): verify source HDMI output, certified/Ultra High Speed cable bandwidth and display HDMI refresh capability (4K/120, VRR as needed). ' + (f.isXbox ? 'Xbox Series uses HDMI out—confirm features against Microsoft guidance and your display’s HDMI input (not DP-only marketing).' : 'Keep the supplied cable when it works.');
        keepYours = 'Keep the supplied HDMI cable when it already supports your resolution, refresh and features.';
      } else if (f.isPhone) {
        spec = 'HDMI path (phone): needs phone Alt Mode/desktop video + USB-C→HDMI adapter rated for the mode + HDMI cable/display. Charge-only cables fail.';
        keepYours = 'Keep a working video-rated adapter; keep the phone charger cable for charging.';
      } else if (f.isIpad) {
        spec = 'HDMI path (iPad): USB-C → HDMI adapter (or hub HDMI out) → cable → display. External display behaviour varies by iPad model—verify exact model (resolution, Stage Manager, mirrored vs extended). Standards/adapter path is clear; model limits need a check.';
        keepYours = 'Keep a working USB-C→HDMI adapter when it already mirrors at your needed mode.';
      } else if (f.isDeck) {
        spec = 'HDMI path (Steam Deck): USB-C → HDMI via dock or adapter. Prefer paths documented for Deck external display; match HDMI cable bandwidth to refresh targets.';
        keepYours = 'Keep a working Deck dock/adapter HDMI path; skip a second dock when one cable/adapter already works.';
      } else if (f.isMac) {
        spec = 'HDMI path (MacBook): USB-C/Thunderbolt → HDMI adapter or dock HDMI out → cable → display. Treat 4K/60 vs 4K/120 as separate requirements. A Thunderbolt dock helps when you also need PD and ports—not only TV mirroring.';
        keepYours = 'Keep a rated adapter and HDMI cable when 4K/60 (or your target) already works; add a dock only for PD + multi-port needs.';
      } else {
        spec = 'HDMI path (USB-C laptop): verify host DP Alt Mode/Thunderbolt display, adapter or dock HDMI rating, certified cable bandwidth and display refresh capability.';
        keepYours = 'Keep working hardware when the mode already works.';
      }
      return finalize(outcome, path, spec, keepYours, notes, a, b, f, intents);
    }

    /* Default: USB-C monitor */
    path = a + ' → USB-C video path → monitor';
    if (f.isPhone) {
      spec = 'USB-C monitor path (phone): verify phone Alt Mode or documented wired video/desktop mode, video-rated cable (not charge-only), and monitor USB-C video input.';
      keepYours = 'Keep the phone charger cable for charging; use a separate video-rated path for display when needed.';
    } else if (f.isIpad) {
      spec = 'USB-C monitor path (iPad): verify your iPad model’s external display support, use a video-capable USB-C cable to a USB-C monitor input, and confirm PD if you want charge + video. Limits vary by model—verify exact iPad.';
      keepYours = 'Keep a cable that already drives the monitor; verify model-specific external display modes before buying hubs.';
    } else if (f.isSwitch2) {
      path = a + ' → Nintendo Switch 2 dock → HDMI → monitor HDMI IN (not USB-C Alt Mode upstream)';
      spec = 'USB-C monitor path (Nintendo Switch 2): do not assume DisplayPort Alt Mode USB-C→monitor success. Nintendo documents video output in TV Mode via the Switch 2 dock HDMI path. Use the monitor’s HDMI input with the official dock + Ultra High Speed HDMI + correct AC.';
      keepYours = 'Keep the Switch 2 dock + HDMI path; skip buying a USB-C video cable as a substitute for dock TV Mode.';
    } else if (f.isConsole) {
      path = a + ' → HDMI OUT → monitor HDMI IN (not USB-C upstream)';
      spec = 'USB-C monitor path (console): consoles do not output display over USB-C. Use the monitor’s HDMI input with a suitable HDMI cable instead of the USB-C upstream port.';
      keepYours = 'Keep your HDMI cable; use the HDMI input on the monitor.';
    } else if (f.isDeck) {
      spec = 'USB-C monitor path (Steam Deck): use a video-rated USB-C cable or dock with DisplayPort Alt Mode to a USB-C/DP monitor. Confirm Deck + display docs; portable/USB-C panels may need extra power.';
      keepYours = 'Keep a direct video-rated cable when one-cable video already works; add a dock only for extra ports or PD needs.';
    } else {
      spec = 'USB-C monitor path (laptop): verify video Alt Mode/USB4/Thunderbolt support, display USB-C/Thunderbolt input and USB-PD requirement for one-cable charging. Thunderbolt 4 host↔display one-cable patterns are widely documented when both ends support them.';
      keepYours = intents.oneCable
        ? 'If your existing Thunderbolt/USB-C cable already carries video and PD to this monitor, keep it and skip a dock.'
        : 'Keep a rated USB-C/Thunderbolt cable when it already works.';
    }
    return finalize(outcome, path, spec, keepYours, notes, a, b, f, intents);
  }

  function finalize(outcome, path, spec, keepYours, notes, a, b, f, intents) {
    if (notes.length) {
      spec = spec + ' ' + notes.join(' ');
    }
    /* Always ensure keep-yours sentence for KEEP or DIRECT */
    if ((outcome === OUTCOMES.KEEP || outcome === OUTCOMES.DIRECT) && !keepYours) {
      keepYours = 'Keep your existing cable or direct path when it already meets the stated intents.';
    }
    if (outcome === OUTCOMES.KEEP && keepYours && path.indexOf('keep') === -1) {
      /* path stays technical; keepYours carries the sentence */
    }
    return {
      outcome: outcome,
      path: path,
      spec: spec,
      keepYours: keepYours,
      guides: guideLinksFor(a, b, f, intents),
      intents: intents
    };
  }

  return {
    OUTCOMES: OUTCOMES,
    DEFAULT_INTENTS: DEFAULT_INTENTS,
    normalizeIntents: normalizeIntents,
    classifyOutcome: classifyOutcome,
    buildResult: buildResult,
    guideLinksFor: function (a, b, intentsRaw) {
      return guideLinksFor(a, b, flags(a, b), normalizeIntents(intentsRaw));
    }
  };
});
