/**
 * ELORUMTECH Console & Handheld Display Hub — pure data + planner (no DOM).
 * Every step cites an OEM or standards-body page with the date it was checked.
 * Where no OEM page was opened, the step says UNKNOWN. UNKNOWN is never shown as a pass.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.ElorumConsoleHub = api;
  }
  return api;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this), function () {
  'use strict';

  var CHECKED = '2026-10-18';

  var SOURCES = {
    'ps-res': { org: 'PlayStation', title: 'How to change PS5 console resolution (4K / HDMI / Video Transfer Rate)', url: 'https://www.playstation.com/en-us/support/hardware/ps5-4k-resolution-guide/', checked: CHECKED },
    'ps-safe': { org: 'PlayStation', title: 'How to use Safe Mode on PS5 consoles and PS4 consoles', url: 'https://www.playstation.com/en-us/support/hardware/safe-mode-playstation/', checked: CHECKED },
    'ps-pic': { org: 'PlayStation', title: 'How to troubleshoot picture and sound issues with your PS5 console', url: 'https://www.playstation.com/en-us/support/hardware/ps5-picture-sound-issues/', checked: CHECKED },
    'xb-120': { org: 'Xbox Support', title: 'Set up 4K gaming at 120 Hz on Xbox Series X', url: 'https://support.xbox.com/en-US/help/hardware-network/display-sound/4k-gaming-at-120hz', checked: CHECKED },
    'xb-blank': { org: 'Xbox Support', title: 'Troubleshooting a blank TV screen or monitor while your Xbox is on', url: 'https://support.xbox.com/en-US/help/hardware-network/display-sound/tv-or-monitor-screen-is-blank-while-connected', checked: CHECKED },
    'xb-tv': { org: 'Xbox Support', title: 'How to change the TV display settings on your Xbox', url: 'https://support.xbox.com/en-US/help/hardware-network/display-sound/change-tv-display-resolution', checked: CHECKED },
    'ns2-novideo': { org: 'Nintendo Support', title: 'No video output to TV in TV Mode on Nintendo Switch 2', url: 'https://en-americas-support.nintendo.com/app/answers/detail/a_id/68305/~/no-video-output-to-tv-in-tv-mode-on-nintendo-switch%26nbsp%3B2', checked: CHECKED },
    'ns2-specs': { org: 'Nintendo', title: 'Nintendo Switch 2 Tech Specs', url: 'https://www.nintendo.com/us/gaming-systems/switch-2/tech-specs/', checked: CHECKED },
    'valve-dock': { org: 'Steam Support (Valve)', title: 'Docking the Steam Deck', url: 'https://help.steampowered.com/en/faqs/view/4C18-08B5-DEC9-3AF4', checked: CHECKED },
    'valve-dockspec': { org: 'Valve', title: 'Steam Deck Docking Station tech specs', url: 'https://www.steamdeck.com/en/tech/dock', checked: CHECKED },
    'asus-allyx': { org: 'ASUS ROG', title: 'ROG Xbox Ally X (2025) tech specs', url: 'https://rog.asus.com/us/gaming-handhelds/rog-ally/rog-xbox-ally-x-2025/spec/', checked: CHECKED },
    'asus-ally': { org: 'ASUS ROG', title: 'ROG Xbox Ally (2025) tech specs', url: 'https://rog.asus.com/us/gaming-handhelds/rog-ally/rog-xbox-ally-2025/spec/', checked: CHECKED },
    'lenovo-8ahp2': { org: 'Lenovo PSREF', title: 'Legion Go 8AHP2 (AMD Ryzen Z2) specifications', url: 'https://psref.lenovo.com/Product/Legion/Legion_Go_8AHP2?MT=83N1', checked: CHECKED },
    'lenovo-8asp2': { org: 'Lenovo PSREF', title: 'Legion Go 8ASP2 (AMD Ryzen Z2 Extreme) specifications', url: 'https://psref.lenovo.com/Product/Legion/Legion_Go_8ASP2?MT=83N0', checked: CHECKED },
    'hdmi-uhs': { org: 'HDMI Licensing Administrator', title: 'Ultra High Speed HDMI Cable (certification label)', url: 'https://www.hdmi.org/spec21sub/ultrahighspeedcable', checked: CHECKED }
  };

  var DEVICES = {
    ps5: { label: 'PlayStation 5', kind: 'console', link: 'HDMI', guide: 'ps5-hdmi-2-1-cable-path.html' },
    'xbox-x': { label: 'Xbox Series X', kind: 'console', link: 'HDMI', guide: 'xbox-series-display-compatibility.html' },
    'xbox-s': { label: 'Xbox Series S', kind: 'console', link: 'HDMI', guide: 'xbox-series-display-compatibility.html' },
    switch2: { label: 'Nintendo Switch 2 (docked)', kind: 'console', link: 'Dock HDMI', guide: 'nintendo-switch-2-display-path.html' },
    deck: { label: 'Steam Deck', kind: 'handheld', link: 'USB-C (DisplayPort Alt Mode) or dock', guide: 'steam-deck-external-display.html' },
    'ally-x': { label: 'ROG Xbox Ally X (2025)', kind: 'handheld', link: 'USB-C / USB4', guide: 'usb-c-hub-vs-dock.html' },
    ally: { label: 'ROG Xbox Ally (2025)', kind: 'handheld', link: 'USB-C', guide: 'usb-c-hub-vs-dock.html' },
    'legion-go': { label: 'Lenovo Legion Go (PSREF 8AHP2 / 8ASP2)', kind: 'handheld', link: 'USB-C / USB4', guide: 'usb-c-hub-vs-dock.html' }
  };

  var SYMPTOMS = {
    'no-signal': 'No signal / black screen',
    'no-120': '120 Hz missing or greyed out',
    'wrong-res': 'Wrong or low resolution / 4K not offered',
    'chain': 'Works direct, fails through receiver, splitter, dock or adapter',
    flicker: 'Flicker, dropouts or picture cuts out'
  };

  // Port facts per device: what the OEM page states. null = not stated on the page we opened (UNKNOWN).
  var PORT_FACTS = {
    ps5: { output: 'HDMI (PS5 supports the HDMI 2.1 specification and 4K 120 Hz output)', maxMode: '4K 120 Hz (PlayStation); 8K 60 Hz needs a CFI-7000 model and a DSC-capable 8K display', src: ['ps-res'] },
    'xbox-x': { output: 'HDMI', maxMode: '4K 120 Hz needs Series X + Ultra High Speed HDMI cable + HDMI 2.1 TV (Xbox Support)', src: ['xb-120'] },
    'xbox-s': { output: 'HDMI', maxMode: '120 Hz at a lower resolution than 4K (Xbox Support, "Enable 120 Hz without 4K")', src: ['xb-120', 'xb-tv'] },
    switch2: { output: 'HDMI connector on the Switch 2 dock (TV mode)', maxMode: '3840x2160 at 60 fps; 120 fps when 1920x1080 or 2560x1440 is selected; HDR10; VRR up to 120 Hz', src: ['ns2-specs'] },
    deck: { output: 'USB-C; official Docking Station: DisplayPort 1.4 + HDMI 2.0', maxMode: 'Official dock: up to 4K 60 Hz or 1440p 120 Hz', src: ['valve-dockspec'] },
    'ally-x': { output: '1x USB4 Type-C (Thunderbolt 4 compliance, DisplayPort 1.4 with FreeSync, PD 3.0) + 1x USB 3.2 Gen 2 Type-C with DisplayPort', maxMode: null, src: ['asus-allyx'] },
    ally: { output: '2x USB 3.2 Gen 2 Type-C with DisplayPort and power delivery (DisplayPort version not stated)', maxMode: null, src: ['asus-ally'] },
    'legion-go': { output: '2x USB-C (USB4 40Gbps) with DisplayPort 1.4 on 8AHP2 and DisplayPort 2.1 on 8ASP2; the 2x charge-only USB-C ports carry no video', maxMode: null, src: ['lenovo-8ahp2', 'lenovo-8asp2'] }
  };

  function s(text, src, extra) {
    var o = { text: text, src: src || [], status: src && src.length ? 'SOURCED' : 'UNKNOWN' };
    if (extra) { for (var k in extra) { if (Object.prototype.hasOwnProperty.call(extra, k)) o[k] = extra[k]; } }
    return o;
  }
  function unknown(text) { return { text: text, src: [], status: 'UNKNOWN' }; }

  var COMMON_HANDHELD_UNKNOWN = 'UNKNOWN: we did not find an OEM no-signal or external-display troubleshooting page for this handheld. Check the maker\u2019s support site for your exact model.';

  var PLAYBOOK = {
    ps5: {
      'no-signal': [
        s('Connect the PS5 directly to the screen\u2019s HDMI port and remove sound bars, home theater or capture devices from the path. Check the HDMI input on the screen, try another HDMI cable and another HDMI port.', ['ps-pic']),
        s('Turn the screen and PS5 fully off, unplug both power cables, wait 20 minutes, reconnect and test. Update the screen firmware.', ['ps-pic']),
        s('Recovery: start in Safe Mode (hold power 3 s to turn off; then hold power until the second beep about 7 s later; connect the controller by USB; press PS). Choose option 2, Change Video Output, then Change Resolution or Change HDCP Mode. Avoid the reset options unless you have a backup; some delete data.', ['ps-safe'], { recovery: true })
      ],
      'no-120': [
        s('Settings > Screen and Video > Video Output: turn on 120 Hz Output. The game must also support 120 Hz.', ['ps-res']),
        s('For 4K 120 Hz: the screen must claim 4K 120 Hz, run its latest firmware, and the PS5 must be on the screen\u2019s HDMI 2.1 port (a TV setting may need to be enabled). Use the supplied cable or an Ultra High Speed cable rated for 4K 120 Hz.', ['ps-res']),
        s('On a 1440p monitor: set Resolution to 1440p and use Test 1440p Output to check SDR/HDR 60 Hz/120 Hz and VRR.', ['ps-res']),
        s('Resolution must be Automatic or 2160p and Video Transfer Rate must be Automatic for 4K 120 Hz; -1 and -2 limit 4K 120 Hz output.', ['ps-res'])
      ],
      'wrong-res': [
        s('4K needs a compatible 4K screen and Resolution set to 2160p (Settings > Screen and Video > Video Output). Automatic picks the highest resolution the screen reports.', ['ps-res']),
        s('If 4K 120 Hz shows as 1080p 120 Hz, run the PlayStation 4K 120 Hz checklist: screen firmware, HDMI 2.1 port, cable class, direct connection, Video Transfer Rate Automatic.', ['ps-res'])
      ],
      chain: [
        s('PlayStation asks whether the PS5 is directly connected or goes through a receiver or other equipment that could affect the signal. Test direct to the screen first.', ['ps-res', 'ps-pic']),
        s('If the direct path works, the receiver or splitter is the limit. See our AVR passthrough guide before buying anything.', [], { link: 'console-hdmi-avr-passthrough-path.html', status: 'ROUTE' })
      ],
      flicker: [
        s('Set Video Transfer Rate to -1 or -2. PlayStation says this may improve flicker; it limits 4K 120 Hz and 4K 50/60 Hz RGB/YUV444 output.', ['ps-res']),
        s('Try the supplied HDMI cable or an Ultra High Speed cable and another HDMI port.', ['ps-pic', 'ps-res'])
      ]
    },
    'xbox-x': {
      'no-signal': [
        s('Check connections: TV and console on, TV on the right HDMI input, cable secure and in the console\u2019s "out to TV" port. Try another HDMI port, another cable, another TV. Hold Power 10 s to power cycle.', ['xb-blank']),
        s('Recovery: eject any disc, hold Power 10 s to turn off, then hold Power + Eject until the second beep (about 10 s). The console starts at 640 \u00d7 480; then pick a resolution under TV & display options.', ['xb-blank'], { recovery: true }),
        s('With an AVR: power on TV, then AVR, then console; switch the AVR input away and back; restart the AVR; set Video fidelity & overscan > Display to HDMI.', ['xb-blank'])
      ],
      'no-120': [
        s('4K at 120 Hz needs all three: Xbox Series X, an Ultra High Speed HDMI cable that supports HDMI 2.1, and a TV that supports HDMI 2.1. Then set Resolution 4K UHD and Refresh rate 120 Hz.', ['xb-120']),
        s('No HDMI 2.1? You can still set Refresh rate to 120 Hz at a lower resolution; from 4K the console drops to the highest resolution your display supports at 120 Hz.', ['xb-120', 'xb-tv']),
        s('Your display must support 120 Hz over HDMI. Some monitors support 120 Hz over DisplayPort but not over HDMI.', ['xb-tv']),
        s('If a resolution both devices support is not listed, set Video fidelity & overscan > Overrides > TV connection to HDMI. If you pick an unsupported mode, wait 20 s and it reverts.', ['xb-tv'])
      ],
      'wrong-res': [
        s('Set TV connection to Auto detect if your TV\u2019s resolution is missing. 1440p and 4K UHD only appear when the TV reports them. Check 4K TV details under Setup.', ['xb-tv']),
        s('Allow 4K passes native 4K content even when the console resolution is set lower.', ['xb-tv'])
      ],
      chain: [
        s('Through an AVR, use the provided Ultra High Speed HDMI cable; if 4K 120 Hz still fails, consult the AVR maker. VRR may also cause display issues through an AVR: turn VRR off or connect direct.', ['xb-120', 'xb-tv']),
        s('Direct TV plus eARC is often the simpler path. See our AVR guide.', [], { link: 'console-hdmi-avr-passthrough-path.html', status: 'ROUTE' })
      ],
      flicker: [
        s('Toggle Allow YCC 4:2:2 (Microsoft: if it is off and you have HDMI video issues, turn it on; if on, turn it off).', ['xb-tv']),
        s('If the screen blanks when a Blu-ray starts, turn off Allow 24Hz in Video modes.', ['xb-blank'])
      ]
    },
    'xbox-s': {
      'no-signal': [
        s('Same connection checks as Series X: TV input, cable seated in "out to TV", another port, cable or TV, then a 10 s power cycle.', ['xb-blank']),
        s('Recovery: Series S has no Eject button. Hold the Xbox button + Pair button until the second beep to start at 640 \u00d7 480, then choose a resolution.', ['xb-blank'], { recovery: true })
      ],
      'no-120': [
        s('On Series S, set Refresh rate to 120 Hz; the console uses a lower resolution than 4K to reach 120 Hz.', ['xb-120']),
        s('Your display must support 120 Hz over HDMI, not only over DisplayPort.', ['xb-tv'])
      ],
      'wrong-res': [
        s('Set TV connection to Auto detect; 1440p only appears if the TV reports it.', ['xb-tv'])
      ],
      chain: [
        s('VRR may cause display issues through an AVR. Turn VRR off or connect the console directly to the display.', ['xb-tv'])
      ],
      flicker: [
        s('Toggle Allow YCC 4:2:2 and test again.', ['xb-tv'])
      ]
    },
    switch2: {
      'no-signal': [
        s('Use the Switch 2 AC adapter (NGN-01) or another adapter and cable with at least 54W on the dock. The original Switch adapter (HAC-002) cannot power the dock.', ['ns2-novideo']),
        s('Use an Ultra High Speed HDMI cable ("Ultra High Speed" is printed on the cable).', ['ns2-novideo']),
        s('Undock and check the console powers on and charges. Reset the AC adapter (unplug 20 s). Re-dock: the console screen should go black. If it stays on while docked to a powered TV, Nintendo says the dock needs service.', ['ns2-novideo']),
        s('Remove HDMI splitters, try another Ultra High Speed cable, and try turning VRR off in the TV settings.', ['ns2-novideo']),
        unknown('Low-resolution recovery mode: UNKNOWN. The Nintendo page we opened documents no 640 \u00d7 480-style safe mode for Switch 2.')
      ],
      'no-120': [
        s('Switch 2 outputs 120 fps only when 1920x1080 or 2560x1440 is selected; 4K is up to 60 fps. VRR up to 120 Hz.', ['ns2-specs']),
        s('Check the TV manual for which HDMI inputs accept 120 Hz, then see our Switch 2 display path guide.', [], { status: 'ROUTE', link: 'nintendo-switch-2-display-path.html' })
      ],
      'wrong-res': [
        s('Maximum TV-mode output is 3840x2160 at 60 fps. In handheld and tabletop mode output follows the 1920x1080 screen.', ['ns2-specs'])
      ],
      chain: [
        s('Nintendo: if an HDMI splitter or other external device is used, plug the dock HDMI cable into the TV directly.', ['ns2-novideo']),
        unknown('Third-party docks: UNKNOWN. Nintendo documents only the Switch 2 dock path. Verify any other dock with Nintendo and the dock maker.')
      ],
      flicker: [
        s('Try a different Ultra High Speed HDMI cable and turn VRR off in the TV settings.', ['ns2-novideo'])
      ]
    },
    deck: {
      'no-signal': [
        s('Select the TV input that matches the dock\u2019s HDMI or DisplayPort cable. Unplug and replug, try another input port, another cable.', ['valve-dock']),
        s('Passive DisplayPort-to-HDMI adapters are not supported. Use an active cable or adapter.', ['valve-dock']),
        s('Recovery: unplug the Deck, set External display safe mode to On in the Display menu, then plug the Deck back in. The Deck picks a low resolution and refresh rate.', ['valve-dock'], { recovery: true }),
        s('Reset the dock: unplug the Deck and the dock, including the power supply and display cables, then reconnect. The dock is powered by the Deck too, so unplug both.', ['valve-dock']),
        s('If no display or USB works and another USB-C device works on the same dock, Valve documents Battery storage mode (BIOS > Setup Utility > Power) as a reset.', ['valve-dock'])
      ],
      'no-120': [
        s('Official Docking Station: up to 4K 60 Hz or 1440p 120 Hz (DisplayPort 1.4, HDMI 2.0).', ['valve-dockspec']),
        s('Override resolution and refresh rate in Steam > Display. If a lower mode works, the dock, cable or display may not support the higher mode.', ['valve-dock'])
      ],
      'wrong-res': [
        s('Many TVs have 60 Hz limits on some inputs and 30 Hz on others. Check the display manual per input.', ['valve-dock']),
        s('Image does not fit: disable "Automatically Scale User Interface" in Steam > Display and adjust; check the TV\u2019s overscan setting.', ['valve-dock'])
      ],
      chain: [
        s('Most USB-C compliant hubs and docks work. Thunderbolt and DisplayLink docks may work but are not officially supported. Charging needs USB-C PD passthrough.', ['valve-dock']),
        s('Test the dock with another USB-C device that has display out, to see whether the dock or the Deck is the issue.', ['valve-dock'])
      ],
      flicker: [
        s('A "known good" cable on one setup may fail on another at a higher data rate. Valve recommends DP 1.4 and HDMI 2.0+ compliant cables.', ['valve-dock']),
        s('External display safe mode helps when the link cannot reach full speed (long, damaged cable or interference).', ['valve-dock'])
      ]
    },
    'ally-x': {
      'no-signal': [
        s('Use the USB4 Type-C port (ASUS: Thunderbolt 4 compliance, DisplayPort 1.4) or the USB 3.2 Gen 2 Type-C port (DisplayPort). Both are listed with DisplayPort.', ['asus-allyx']),
        unknown(COMMON_HANDHELD_UNKNOWN)
      ],
      'no-120': [
        s('ASUS lists DisplayPort 1.4 with FreeSync on the USB4 port.', ['asus-allyx']),
        unknown('Maximum external resolution and refresh rate: UNKNOWN (not stated on the ASUS spec page). Dock and display limits still apply.')
      ],
      'wrong-res': [unknown('Maximum external resolution: UNKNOWN (not stated on the ASUS spec page).')],
      chain: [s('The dock or adapter must carry DisplayPort Alt Mode video. See hub vs dock.', [], { status: 'ROUTE', link: 'usb-c-hub-vs-dock.html' })],
      flicker: [unknown(COMMON_HANDHELD_UNKNOWN)]
    },
    ally: {
      'no-signal': [
        s('Both USB 3.2 Gen 2 Type-C ports are listed with DisplayPort and power delivery.', ['asus-ally']),
        unknown(COMMON_HANDHELD_UNKNOWN)
      ],
      'no-120': [unknown('DisplayPort version and maximum external refresh rate: UNKNOWN (not stated on the ASUS spec page).')],
      'wrong-res': [unknown('Maximum external resolution: UNKNOWN (not stated on the ASUS spec page).')],
      chain: [s('The dock or adapter must carry DisplayPort Alt Mode video. See hub vs dock.', [], { status: 'ROUTE', link: 'usb-c-hub-vs-dock.html' })],
      flicker: [unknown(COMMON_HANDHELD_UNKNOWN)]
    },
    'legion-go': {
      'no-signal': [
        s('Use one of the two USB4 40Gbps USB-C ports. Lenovo PSREF lists 2 further USB-C ports as "support charging only": no video there.', ['lenovo-8ahp2', 'lenovo-8asp2']),
        unknown(COMMON_HANDHELD_UNKNOWN)
      ],
      'no-120': [
        s('PSREF lists DisplayPort 1.4 on 8AHP2 (Ryzen Z2) and DisplayPort 2.1 on 8ASP2 (Ryzen Z2 Extreme). Check the model on your label.', ['lenovo-8ahp2', 'lenovo-8asp2']),
        unknown('Maximum external resolution and refresh rate: UNKNOWN (not stated in PSREF). Dock and display limits still apply.')
      ],
      'wrong-res': [unknown('Maximum external resolution: UNKNOWN (not stated in PSREF).')],
      chain: [s('The dock or adapter must carry DisplayPort Alt Mode video. See hub vs dock.', [], { status: 'ROUTE', link: 'usb-c-hub-vs-dock.html' })],
      flicker: [unknown(COMMON_HANDHELD_UNKNOWN)]
    }
  };

  function plan(deviceId, symptomId) {
    var dev = DEVICES[deviceId];
    var sym = SYMPTOMS[symptomId];
    if (!dev || !sym) return { ok: false, error: 'UNKNOWN_INPUT', steps: [] };
    var steps = (PLAYBOOK[deviceId] && PLAYBOOK[deviceId][symptomId]) || [unknown('UNKNOWN: no sourced steps for this combination yet.')];
    var sourced = steps.filter(function (x) { return x.status === 'SOURCED'; }).length;
    var verdict = sourced === 0 ? 'UNKNOWN' : (steps.some(function (x) { return x.status === 'UNKNOWN'; }) ? 'PARTIAL' : 'SOURCED');
    return {
      ok: true,
      device: dev.label,
      symptom: sym,
      link: dev.link,
      guide: dev.guide,
      ports: PORT_FACTS[deviceId],
      verdict: verdict,
      steps: steps.map(function (x) {
        return {
          text: x.text,
          status: x.status,
          recovery: !!x.recovery,
          link: x.link || null,
          sources: x.src.map(function (id) { return SOURCES[id]; })
        };
      })
    };
  }

  return { CHECKED: CHECKED, SOURCES: SOURCES, DEVICES: DEVICES, SYMPTOMS: SYMPTOMS, PORT_FACTS: PORT_FACTS, PLAYBOOK: PLAYBOOK, plan: plan };
});
