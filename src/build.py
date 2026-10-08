#!/usr/bin/env python3
"""
Build assets/app/ufiber-guide.html from the sources in this folder.

The guide ships as one self-contained page: no build step on the server, no
external requests, works offline. This script is the only thing that produces
it, so the HTML in assets/app is generated — edit the sources here, never that
file.

    python3 src/build.py            # writes assets/app/ufiber-guide.html
    python3 src/build.py --check    # rebuilds and reports whether it matches

The JavaScript is concatenated in the order below. That order matters: engine
and speeds/feeds define the data the UI reads, and the UI files assume the
helpers in ui1 exist.
"""

import argparse
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent
OUT = ROOT / 'assets' / 'app' / 'ufiber-guide.html'

JS_ORDER = [
    'engine.js',   # data tables, item numbers, the recommendation itself
    'sf.js',       # speeds and feeds per material row
    'ui1.js',      # helpers, icons, the drawn diagrams
    'ui2.js',      # home, the ask box, the wizard, the result
    'ui3.js',      # troubleshooter, Learn, Products, the decoder
    'ui4.js',      # Replace XEBEC
    'usage.js',    # structured usage events and deliberate sharing
    'msg.js',      # Outlook .msg reader
    'ui5.js',      # dropping in a customer email or drawing
    'ui6.js',      # Speeds and feeds tab
    'ui7.js',      # the AI layer
    'share.js',    # packing a setup into a link
    'nlu.js',      # the offline domain model
    'ui8.js',      # offline answers
]

BOOT = {
    '@@BOOT_NLU@@': 'boot_nlu.js',
    '@@BOOT_SW@@': 'boot_sw.js',
    '@@BOOT_SHARE@@': 'boot_share.js',
    '@@BOOT_PRINT@@': 'boot_print.js',
}

DATA = {
    '@@HEROIMG_BLOCK@@': 'heroimg_block.txt',
    '@@CASES_BLOCK@@': 'cases_block.txt',
    '@@MODEL_BLOCK@@': 'model_block.txt',
}


def read(name):
    return (HERE / name).read_text(encoding='utf-8')


def build():
    page = read('shell.html')
    page = page.replace('@@STYLES@@', read('styles.css'))
    page = page.replace('@@JS@@', ''.join(read(n) for n in JS_ORDER))
    for token, name in BOOT.items():
        page = page.replace(token, read(name))
    for token, name in DATA.items():
        page = page.replace(token, read(name))
    page = page.replace('@@EMBED@@', read('embed.js'))
    left = [t for t in list(BOOT) + list(DATA) + ['@@STYLES@@', '@@JS@@', '@@EMBED@@'] if t in page]
    if left:
        sys.exit('placeholder left unfilled: ' + ', '.join(left))
    return page


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--check', action='store_true', help='compare against the file on disk instead of writing it')
    a = ap.parse_args()
    page = build()
    if a.check:
        if not OUT.exists():
            sys.exit('nothing to compare against: ' + str(OUT))
        current = OUT.read_text(encoding='utf-8')
        if current == page:
            print(f'identical to {OUT.relative_to(ROOT)} ({len(page) // 1024} KB)')
            return
        sys.exit(f'rebuild differs: on disk {len(current)} bytes, rebuilt {len(page)} bytes')
    OUT.write_text(page, encoding='utf-8')
    print(f'wrote {OUT.relative_to(ROOT)} ({len(page) // 1024} KB)')


if __name__ == '__main__':
    main()
