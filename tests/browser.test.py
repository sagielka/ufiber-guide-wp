"""Browser tests for the built guide.

These exercise the page as a person meets it: the offline reading, the Clear
button, the tabs, and the AI path with the site endpoint mocked. Run through
tests/run.py, or directly:

    python3 tests/browser.test.py
"""

import asyncio
import http.server
import json
import pathlib
import socketserver
import sys
import threading

ROOT = pathlib.Path(__file__).resolve().parent.parent
APP = ROOT / 'assets' / 'app' / 'ufiber-guide.html'
PORT = 8123

results = {'pass': 0, 'fail': 0}


def ok(name, cond, detail=''):
    if cond:
        results['pass'] += 1
        print('PASS ' + name)
    else:
        results['fail'] += 1
        print('FAIL ' + name + ('  → ' + str(detail)[:140] if detail else ''))


def serve(directory):
    handler = lambda *a, **k: http.server.SimpleHTTPRequestHandler(*a, directory=str(directory), **k)
    socketserver.TCPServer.allow_reuse_address = True
    httpd = socketserver.TCPServer(('127.0.0.1', PORT), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


async def main():
    if not APP.exists():
        sys.exit('build it first: python3 src/build.py')
    from playwright.async_api import async_playwright

    httpd = serve(APP.parent)
    url = f'http://127.0.0.1:{PORT}/{APP.name}'
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch()
            ctx = await browser.new_context(viewport={'width': 1280, 'height': 1000})
            await ctx.route('https://fonts.googleapis.com/**', lambda r: r.abort())

            sent = []

            async def ai(route):
                sent.append(json.loads(route.request.post_data or '{}'))
                await route.fulfill(status=200, content_type='application/json', body=json.dumps({
                    'ok': True,
                    'text': json.dumps({'task': 'crosshole', 'summary': 'Deburr the intersection.', 'questions': []}),
                }))

            await ctx.route('**/nufg/v1/ai', ai)
            await ctx.route('**/nufg/v1/usage', lambda r: r.fulfill(
                status=200, content_type='application/json', body='{"ok":true}'))

            page = await ctx.new_page()
            errors = []
            page.on('pageerror', lambda e: errors.append(str(e)[:120]))

            # --- the page on its own: no network, no AI, nothing sent ---
            await page.goto(url)
            await page.wait_for_timeout(1600)
            ok('the guide loads with no AI configured', await page.locator('#askT').count() == 1)
            ok('nothing is sent when nothing is configured', not sent)
            ok('no AI object without an endpoint', await page.evaluate("() => !APP.sample"))

            await page.fill('#askT', 'deburr cross holes in 316L stainless, 20 mm bore, 8 mm cross hole')
            await page.click('#askGo')
            await page.wait_for_timeout(800)
            state = await page.evaluate("() => JSON.stringify({m: APP.ws.material, t: APP.ws.task, d: APP.ws.dims})")
            ok('the offline model reads a job', '"m":"stainless"' in state and '"t":"crosshole"' in state, state)

            await page.click('#goRes')
            await page.wait_for_timeout(900)
            sku = (await page.locator('.sku').first.inner_text()).strip()
            ok('a recommendation is produced', sku.startswith('UF'), sku)

            # --- Clear (1.4.0) ---
            await page.evaluate("() => go('')")
            await page.wait_for_timeout(400)
            await page.evaluate("() => { APP.ws.machine.type = 'lathe'; APP.ws.machine.maxRpm = 8000; }")
            await page.click('#goClear')
            await page.wait_for_timeout(500)
            after = await page.evaluate(
                "() => JSON.stringify({m: APP.ws.material, d: APP.ws.dims,"
                " box: document.getElementById('askT').value, mach: APP.ws.machine.type, rpm: APP.ws.machine.maxRpm})")
            ok('Clear forgets the job', '"m":null' in after and '"d":{}' in after, after)
            ok('Clear empties the box', '"box":""' in after, after)
            ok('Clear keeps the machine', '"mach":"lathe"' in after and '"rpm":8000' in after, after)

            # --- every tab renders ---
            for tab in ['sf', 'fix', 'xebec', 'learn', 'products']:
                await page.evaluate(f"() => go('{tab}')")
                await page.wait_for_timeout(350)
                ok(f'the {tab} tab renders', len(await page.locator('#view').inner_html()) > 1500)

            # --- the item decoder (1.1.14) ---
            await page.evaluate("() => go('products')")
            await page.wait_for_timeout(400)
            for code, expect in [('uf7030', 'shank'), ('uf1625', 'Surface'), ('uf9999', 'E-Pack')]:
                await page.fill('#decIn', code)
                await page.click('#decGo')
                await page.wait_for_timeout(300)
                text = await page.locator('#decOut').inner_text()
                ok(f'{code} decodes to a {expect}', expect.lower() in text.lower(), text[:70])
            await page.fill('#decIn', 'uf7722')
            await page.click('#decGo')
            await page.wait_for_timeout(300)
            ok('a code that does not exist is refused',
               'not a recognised' in (await page.locator('#decOut').inner_text()).lower())

            # --- the AI path, with the site endpoint mocked (1.3.0) ---
            page2 = await ctx.new_page()
            page2.on('pageerror', lambda e: errors.append(str(e)[:120]))
            await page2.goto(url + '?api=https%3A%2F%2Fexample.com%2Fwp-json%2Fnufg%2Fv1%2F&ai=1&k=TESTTOKEN')
            await page2.wait_for_timeout(1700)
            ok('the AI object appears when the site offers one', await page2.evaluate("() => !!APP.sample"))
            got = await page2.evaluate("""async () => {
                try { return { ok: true, j: await APP.sample.json('extract this job') }; }
                catch (e) { return { ok: false, code: e.code }; }
            }""")
            ok('a reading goes through the site endpoint', got.get('ok') and got['j'].get('task') == 'crosshole', got)
            ok('the request carries the site token', sent and sent[-1].get('k') == 'TESTTOKEN', sent[-1] if sent else None)

            ok('no page errors anywhere', not errors, errors[:2])
            await browser.close()
    finally:
        httpd.shutdown()

    print(f"\n{results['pass']} passed, {results['fail']} failed")
    sys.exit(1 if results['fail'] else 0)


asyncio.run(main())
