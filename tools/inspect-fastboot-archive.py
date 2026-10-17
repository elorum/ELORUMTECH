#!/usr/bin/env python3
"""Reproducible static inspection of the tested Gigabyte Fast Boot archive (B550I AORUS PRO AX rev 1.0 case).

Usage:  python3 tools/inspect-fastboot-archive.py /path/to/mb_utility_fast_boot_B20.0420.1.zip

What it does (static only; nothing is executed):
  * SHA-256 and size of the archive, setup.exe and setup.iss
  * Version-info strings read from setup.exe (UTF-16LE VS_VERSIONINFO keys)
  * Authenticode via `osslsigncode verify` if installed: signer subject, issuer, timestamp, and whether the
    signed message digest equals the digest calculated from the file

What it is NOT: a malware scan, or a Windows / SmartScreen / certificate-chain evaluation. A box without the
GlobalSign intermediate certificate reports a chain error; that is expected and is not evaluated here.
Compares every value with the constants published in bios-fastboot.js (FILE_IDENTITY); exit code 1 on any mismatch.
The archive itself is never committed to this repository.
"""
import hashlib, os, re, shutil, subprocess, sys, tempfile, zipfile

EXPECTED = {
    'archive_sha256': '94132e02338782d709ff7080220c82288dca0541a879a76383e47f2b657f5bff',
    'archive_bytes': 9016029,
    'setup_exe_sha256': '28af64f437ef2a6488c3f8fefb469b2d64f1f7c122f709aa87b1ccef4e3e81d0',
    'setup_exe_bytes': 9669472,
    'setup_iss_sha256': 'a6e99c25a119a4bc63554d8835440c080af0049204c9b19cecc082d476cd8958',
    'ProductName': 'Fast Boot',
    'FileVersion': '1.20.0420.1',
    'CompanyName': 'GIGABYTE',
    'signer_org': 'GIGA-BYTE TECHNOLOGY CO., LTD.',
}

def sha256(data):
    return hashlib.sha256(data).hexdigest()

def version_string(blob, key):
    # Search only inside the VS_VERSION_INFO resource (last occurrence), not in arbitrary program strings.
    start = blob.rfind('VS_VERSION_INFO'.encode('utf-16-le'))
    if start < 0:
        return None
    pat = (key + '\0').encode('utf-16-le')
    i = blob.find(pat, start, start + 8192)
    if i < 0:
        return None
    j = i + len(pat)
    while j < len(blob) - 1 and blob[j:j + 2] == b'\0\0':  # padding to 32-bit boundary
        j += 2
    out = []
    while j < len(blob) - 1:
        ch = blob[j:j + 2]
        if ch == b'\0\0':
            break
        out.append(ch)
        j += 2
    return b''.join(out).decode('utf-16-le', 'replace').strip()

def main():
    if len(sys.argv) != 2:
        print(__doc__)
        return 2
    zpath = sys.argv[1]
    results = []
    def check(name, got, want):
        ok = got == want
        results.append(ok)
        print(f"{'MATCH   ' if ok else 'MISMATCH'} {name}: {got!r}" + ('' if ok else f' (expected {want!r})'))

    data = open(zpath, 'rb').read()
    check('archive sha256', sha256(data), EXPECTED['archive_sha256'])
    check('archive bytes', len(data), EXPECTED['archive_bytes'])
    with zipfile.ZipFile(zpath) as z:
        names = sorted(z.namelist())
        print('archive members:', names)
        exe = z.read('setup.exe')
        iss = z.read('setup.iss')
    check('setup.exe sha256', sha256(exe), EXPECTED['setup_exe_sha256'])
    check('setup.exe bytes', len(exe), EXPECTED['setup_exe_bytes'])
    check('setup.iss sha256', sha256(iss), EXPECTED['setup_iss_sha256'])
    for key in ('ProductName', 'FileVersion', 'CompanyName'):
        check('setup.exe ' + key, version_string(exe, key), EXPECTED[key])

    tool = shutil.which('osslsigncode')
    if not tool:
        print('SKIPPED  Authenticode: osslsigncode not installed (apt install osslsigncode)')
    else:
        tmp = tempfile.mkdtemp()
        try:
            p = os.path.join(tmp, 'setup.exe')
            open(p, 'wb').write(exe)
            r = subprocess.run([tool, 'verify', '-in', p], capture_output=True, text=True)
            txt = r.stdout + r.stderr
        finally:
            shutil.rmtree(tmp)
        cur = re.search(r'Current message digest\s*:\s*([0-9A-F]+)', txt)
        calc = re.search(r'Calculated message digest\s*:\s*([0-9A-F]+)', txt)
        subj = re.search(r'Signer #0:\s*\n\s*Subject:\s*(.+)', txt)
        issuer = re.search(r'Signer #0:\s*\n\s*Subject:.*\n\s*Issuer\s*:\s*(.+)', txt)
        ts = re.search(r'Timestamp time:\s*(.+)', txt)
        check('Authenticode signed digest == calculated digest', bool(cur and calc and cur.group(1) == calc.group(1)), True)
        check('Authenticode signer O=', bool(subj and ('O=' + EXPECTED['signer_org']) in subj.group(1)), True)
        print('INFO     signer subject:', subj.group(1).strip() if subj else None)
        print('INFO     signer issuer :', issuer.group(1).strip() if issuer else None)
        print('INFO     timestamp     :', ts.group(1).strip() if ts else None)
        print('INFO     certificate chain: not evaluated (static inspection only)')
    print('RESULT:', 'ALL MATCH' if all(results) else 'MISMATCH')
    print('Scope: static inspection of the archive. Not a malware scan or Windows/SmartScreen evaluation.')
    return 0 if all(results) else 1

if __name__ == '__main__':
    sys.exit(main())
