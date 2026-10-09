#!/usr/bin/env python3
"""Run every check in one go.

    python3 tests/run.py

Four things are checked, in the order that fails fastest:

  1. PHP syntax, across the plugin.
  2. The build: the shipped HTML must be exactly what src/ produces. This is the
     one that catches a change made to the generated file instead of the source.
  3. The engine: reading a customer's words into a job, and turning that into an
     item number. Every case is a bug that reached someone.
  4. The browser: the page as a person meets it, with the site's AI endpoint
     mocked so nothing is sent anywhere.

A missing php or playwright is reported as skipped rather than failed, so the
suite still says something useful on a bare machine.
"""

import pathlib
import shutil
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
results = []


def run(name, argv, cwd=ROOT, skip_if_missing=None):
    if skip_if_missing and not shutil.which(skip_if_missing):
        print(f'\n=== {name}: skipped, {skip_if_missing} is not installed')
        results.append((name, None))
        return
    print(f'\n=== {name}')
    p = subprocess.run(argv, cwd=str(cwd))
    results.append((name, p.returncode == 0))


def php_syntax():
    if not shutil.which('php'):
        print('\n=== PHP syntax: skipped, php is not installed')
        results.append(('PHP syntax', None))
        return
    print('\n=== PHP syntax')
    bad = 0
    for f in sorted(ROOT.glob('**/*.php')):
        if 'vendor' in f.parts:
            continue
        p = subprocess.run(['php', '-l', str(f)], capture_output=True, text=True)
        if p.returncode:
            bad += 1
            print(p.stdout.strip() or p.stderr.strip())
    print(f'{"no syntax errors" if not bad else str(bad) + " files failed"}')
    results.append(('PHP syntax', bad == 0))


php_syntax()
run('Build matches the sources', [sys.executable, 'src/build.py', '--check'])
run('Engine and reading', ['node', 'tests/engine.test.js'], skip_if_missing='node')
run('Settings and the API key', ['php', 'tests/key.test.php'], skip_if_missing='php')
run('AI spend accounting', ['php', 'tests/spend.test.php'], skip_if_missing='php')
run('Browser', [sys.executable, 'tests/browser.test.py'])

print('\n' + '=' * 52)
failed = [n for n, r in results if r is False]
skipped = [n for n, r in results if r is None]
for name, r in results:
    print(f'  {"skip" if r is None else "ok  " if r else "FAIL"}  {name}')
if skipped:
    print(f'\n{len(skipped)} skipped.')
print('\nAll checks passed.' if not failed else f'\n{len(failed)} failed: ' + ', '.join(failed))
sys.exit(1 if failed else 0)
