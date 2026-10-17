/**
 * ELORUMTECH BIOS & Fast Boot troubleshooter — pure decision logic (no DOM).
 * Rules: unknown never becomes compatible; the Windows-based utility is never offered
 * for no-POST / no-Windows symptoms; nothing here runs, restarts, flashes or changes anything.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.ElorumBiosFastBoot = api;
  }
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  var VERDICTS = Object.freeze({
    TESTED_CONFIG: 'TESTED_CONFIG',
    LISTED_BY_GIGABYTE: 'LISTED_BY_GIGABYTE',
    UNKNOWN: 'UNKNOWN',
    UNSUPPORTED: 'UNSUPPORTED',
    NO_POST: 'NO_POST',
    NO_WINDOWS: 'NO_WINDOWS',
    STOP_SIGNATURE: 'STOP_SIGNATURE'
  });

  // compatible / unknown / unsupported / other-problem / stop
  var GROUP = Object.freeze({
    TESTED_CONFIG: 'compatible',
    LISTED_BY_GIGABYTE: 'compatible',
    UNKNOWN: 'unknown',
    UNSUPPORTED: 'unsupported',
    NO_POST: 'different-problem',
    NO_WINDOWS: 'different-problem',
    STOP_SIGNATURE: 'stop'
  });

  var TESTED_CASE = Object.freeze({
    board: 'Gigabyte B550I AORUS PRO AX',
    revision: '1.0',
    symptom: 'Windows starts, but BIOS setup cannot be opened',
    triedWithoutSuccess: ['Delete / F2 at startup', 'Windows restart to UEFI Firmware Settings', 'CMOS reset'],
    workedInThisTest: 'Gigabyte Fast Boot utility B20.0420.1, option "Enter BIOS Setup Now"',
    archiveName: 'mb_utility_fast_boot_B20.0420.1.zip',
    windowsVersion: null, // not recorded in the user's report
    biosVersion: null, // not recorded in the user's report
    evidence: 'user testimony, not an ELORUMTECH lab reproduction'
  });

  var FILE_IDENTITY = Object.freeze({
    archiveSha256: '94132e02338782d709ff7080220c82288dca0541a879a76383e47f2b657f5bff',
    archiveBytes: 9016029,
    setupExeSha256: '28af64f437ef2a6488c3f8fefb469b2d64f1f7c122f709aa87b1ccef4e3e81d0',
    setupExeBytes: 9669472,
    setupIssSha256: 'a6e99c25a119a4bc63554d8835440c080af0049204c9b19cecc082d476cd8958',
    productName: 'Fast Boot',
    fileVersion: '1.20.0420.1',
    signer: 'GIGA-BYTE TECHNOLOGY CO., LTD.'
  });

  var ALLOWED = Object.freeze({
    symptom: ['win-no-bios', 'no-post', 'no-windows'],
    vendor: ['gigabyte', 'other', 'unknown'],
    model: ['b550i-aorus-pro-ax', 'other-gigabyte', 'unknown'],
    revision: ['1.0', 'other', 'unknown'],
    os: ['win10-64', 'win11-64', 'other', 'unknown'],
    listing: ['listed', 'not-listed', 'not-checked'],
    signature: ['valid-gigabyte', 'invalid-or-other', 'not-checked']
  });

  var DEFAULTS = Object.freeze({
    symptom: 'win-no-bios', vendor: 'unknown', model: 'unknown', revision: 'unknown',
    os: 'unknown', listing: 'not-checked', signature: 'not-checked'
  });

  // Unrecognised values fall back to the most cautious default (never to a compatible value).
  function normalize(input) {
    var src = input || {};
    var out = {};
    Object.keys(DEFAULTS).forEach(function (k) {
      out[k] = ALLOWED[k].indexOf(src[k]) >= 0 ? src[k] : DEFAULTS[k];
    });
    return out;
  }

  var DOWNLOAD_STEP = 'Download the Fast Boot utility only from a source you have verified for your exact board and revision; Gigabyte\'s own support page for your board (Utility section) is the reference. Read any prerequisite note shown there (Gigabyte\'s Fast Boot listings note that APP Center must be installed first).';

  var VERIFY_STEPS = [
    'Before running anything: right-click the setup file → Properties → Digital Signatures and confirm the signer is GIGA-BYTE TECHNOLOGY CO., LTD. and the signature is OK.',
    'Scan the downloaded file with your antivirus (for example Microsoft Defender) before running it.',
    'If Windows SmartScreen, User Account Control or your antivirus warns about the file or shows an unknown publisher, stop. Do not disable security or click past the warning.'
  ];

  var RUN_STEPS = [
    'Save your work and close apps: entering BIOS setup restarts the PC, and the installer may also ask to restart.',
    'If BitLocker or device encryption is on, make sure you can find your recovery key before changing anything in BIOS setup.',
    'Install and open the utility yourself, then choose its option to enter BIOS setup (in the tested version: "Enter BIOS Setup Now") when you are ready. Nothing on this page runs, restarts or changes your PC.'
  ];

  function diagnose(input) {
    var s = normalize(input);
    var r = { input: s, verdict: null, group: null, title: '', summary: '', steps: [], cautions: [], readyToRun: false };

    function finish(verdict, title, summary, steps, cautions) {
      r.verdict = verdict; r.group = GROUP[verdict]; r.title = title; r.summary = summary;
      r.steps = steps || []; r.cautions = cautions || [];
      return r;
    }

    if (s.symptom === 'no-post') {
      return finish(VERDICTS.NO_POST, 'No POST: this is a hardware/firmware start problem, not a BIOS-access problem',
        'If there is no firmware logo, no display output and no Windows, a Windows utility cannot run. Fast Boot settings are not the first suspect.',
        ['Check power cables (24-pin and CPU power), display cable on the correct output, and any debug LEDs on the board.',
          'Follow your motherboard manual\'s no-POST / debug LED section.',
          'Clear CMOS only as described in your board manual, with the PC unplugged.',
          'Contact the motherboard manufacturer\'s support if the board still does not POST.'],
        ['Do not install or run boot utilities for this symptom.']);
    }
    if (s.symptom === 'no-windows') {
      return finish(VERDICTS.NO_WINDOWS, 'Firmware starts but Windows does not: use firmware keys or Windows recovery',
        'The Fast Boot utility runs inside Windows, so it cannot help when Windows does not start.',
        ['Watch for the setup or boot-menu key on the startup screen and press it repeatedly right after power-on (your manual lists the key).',
          'If Windows fails to start repeatedly, Windows Recovery may open; from there: Troubleshoot → Advanced options → UEFI Firmware Settings.',
          'Try a wired USB keyboard on a rear USB port if keys seem to be ignored.'],
        ['If the drive is encrypted, some recovery tools ask for the BitLocker recovery key.']);
    }

    // Windows starts, but BIOS setup cannot be opened.
    if (s.vendor === 'other') {
      return finish(VERDICTS.UNSUPPORTED, 'Not a Gigabyte board: the Gigabyte Fast Boot utility does not apply',
        'Use your board or PC maker\'s documented way into firmware setup. A different vendor\'s utility is not a fix for your board.',
        ['Try Windows: Settings → System → Recovery → Advanced startup → Restart now → Troubleshoot → Advanced options → UEFI Firmware Settings.',
          'Check your manufacturer\'s support page for a firmware-access tool for your exact model.'], []);
    }
    if (s.vendor === 'unknown') {
      return finish(VERDICTS.UNKNOWN, 'Unknown board: identify it before choosing any utility',
        'Compatibility is unknown until the exact motherboard maker, model and revision are confirmed.',
        ['Open System Information (msinfo32) and read BaseBoard Manufacturer and BaseBoard Product, or read the model and "REV" printed on the board.',
          'Then run this check again.'], ['Unknown is not a pass: do not install a utility for an unidentified board.']);
    }
    if (s.os === 'other') {
      return finish(VERDICTS.UNSUPPORTED, 'Not 64-bit Windows 10/11: the Windows utility does not apply',
        'Gigabyte\'s Fast Boot utility is a Windows program. Use your board manual\'s firmware key or your OS\'s firmware-restart option.', [], []);
    }
    if (s.os === 'unknown') {
      return finish(VERDICTS.UNKNOWN, 'Windows version unknown: confirm it first',
        'Open Settings → System → About and note the Windows edition and "System type" (64-bit). Then run this check again.', [],
        ['Unknown is not a pass.']);
    }

    var exactTested = s.model === 'b550i-aorus-pro-ax' && s.revision === '1.0';
    var verdict;
    if (exactTested) verdict = VERDICTS.TESTED_CONFIG;
    else if (s.model === 'unknown' || s.revision === 'unknown') verdict = VERDICTS.UNKNOWN;
    else if (s.listing === 'listed') verdict = VERDICTS.LISTED_BY_GIGABYTE;
    else if (s.listing === 'not-listed') verdict = VERDICTS.UNSUPPORTED;
    else verdict = VERDICTS.UNKNOWN;

    if (verdict === VERDICTS.UNSUPPORTED) {
      return finish(verdict, 'Gigabyte does not list Fast Boot for your exact board',
        'Do not use a utility that is not listed for your exact board and revision.',
        ['Use the Windows UEFI Firmware Settings restart or the setup key from your manual.', 'Ask Gigabyte support for your exact model and revision.'], []);
    }
    if (verdict === VERDICTS.UNKNOWN) {
      return finish(verdict, 'Compatibility unknown: check Gigabyte\'s page for your exact board and revision',
        (s.model === 'b550i-aorus-pro-ax' ? 'Same model as the tested board, but the revision is not confirmed as 1.0. ' : '') +
          'Open Gigabyte\'s support page for your exact board and revision, look in the Utility section for Fast Boot and your Windows version, then answer the "listed" question.',
        ['Confirm the exact model (System Information → BaseBoard Product) and the revision printed on the board (for example "REV 1.0") or on the box.'],
        ['Unknown is not a pass: the tested case does not cover other models or revisions.']);
    }

    if (s.signature === 'invalid-or-other') {
      return finish(VERDICTS.STOP_SIGNATURE, 'Stop: the file is not validly signed by GIGA-BYTE',
        'Do not run it. Delete the download and get the utility again from Gigabyte\'s support page for your exact board.', [],
        ['Do not disable security or bypass the warning.']);
    }

    var steps = [DOWNLOAD_STEP].concat(VERIFY_STEPS, RUN_STEPS);
    r.readyToRun = s.signature === 'valid-gigabyte';
    if (!r.readyToRun) steps.splice(1, 0, 'Not ready yet: you have not confirmed the digital signature. Do that before running anything.');

    if (verdict === VERDICTS.TESTED_CONFIG) {
      return finish(verdict, 'Matches the tested board: Gigabyte B550I AORUS PRO AX rev 1.0',
        'On this configuration, one user\'s only working fix was Gigabyte Fast Boot utility B20.0420.1 → "Enter BIOS Setup Now" (testet på denne konfiguration). This is user testimony, not a guarantee: the Windows and BIOS versions in that test were not recorded.',
        steps, ['Results can differ with other BIOS versions, Windows versions or settings.']);
    }
    return finish(verdict, 'Listed by Gigabyte for your board, but not tested by ELORUMTECH',
      'Gigabyte lists Fast Boot for your exact board. Use the version Gigabyte lists for your board and Windows version; the tested archive (B20.0420.1) is only confirmed by one user on the B550I AORUS PRO AX rev 1.0.',
      steps, ['Not tested on your configuration.']);
  }

  return { VERDICTS: VERDICTS, GROUP: GROUP, TESTED_CASE: TESTED_CASE, FILE_IDENTITY: FILE_IDENTITY, ALLOWED: ALLOWED, normalize: normalize, diagnose: diagnose };
});
