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

            # --- one main button (1.6.1): it reads, then it becomes "Show my setup" under the chips ---
            label = (await page.locator('#askGo').inner_text()).strip()
            ok('after reading, the one button offers the setup', label.startswith('Show my setup'), label)
            ok('the button sits under what was understood',
               await page.evaluate("() => !!document.querySelector('#understood #askGo')"))
            ok('there is no second setup button', await page.locator('#goRes').count() == 0)
            await page.type('#askT', ' x')
            label = (await page.locator('#askGo').inner_text()).strip()
            ok('editing the text asks for a new reading', label.startswith('Read my application'), label)
            await page.click('#askGo')
            await page.wait_for_timeout(500)

            await page.click('#askGo')
            await page.wait_for_timeout(900)
            sku = (await page.locator('.sku').first.inner_text()).strip()
            ok('a recommendation is produced', sku.startswith('UF'), sku)
            ok('the setup can be shared from the top', await page.locator('#shareTop').count() == 1)

            # --- sizes (1.6.1): the offline model must not overwrite what the keywords read ---
            await page.evaluate("() => go('')")
            await page.wait_for_timeout(400)
            dims = await page.evaluate(
                "() => { doAsk('Light burrs on cross hole Ø10 into Ø16.5 bore, 4140 steel', {ai:false});"
                " return JSON.stringify(APP.ws.dims); }")
            ok('cross hole Ø10 into a Ø16.5 bore keeps the bore', '"main":16.5' in dims and '"cross":10' in dims, dims)
            st = await page.evaluate(
                "() => { doAsk('Main hole diameter: Ø16.5 mm\\nCross hole diameter: Ø10 mm\\nBurr height: Approx. 1 mm\\nWorkpiece material: S45C', {ai:false});"
                " return JSON.stringify({d: APP.ws.dims, b: APP.ws.burr, h: APP.ws.burrMm}); }")
            ok('a stated burr height is the burr, not a width (1.6.2)', '"width"' not in st and '"h":1' in st and '"b":"heavy"' in st, st)

            # --- Clear (1.4.0) ---
            await page.evaluate("() => go('')")
            await page.wait_for_timeout(400)
            await page.evaluate("() => doAsk('deburr cross holes in 316L, 20 mm bore, 8 mm cross hole', {ai:false})")
            await page.evaluate("() => { APP.ws.machine.type = 'lathe'; APP.ws.machine.maxRpm = 8000; }")
            await page.click('#understood .ask-clear')
            await page.wait_for_timeout(500)
            after = await page.evaluate(
                "() => JSON.stringify({m: APP.ws.material, d: APP.ws.dims,"
                " box: document.getElementById('askT').value, mach: APP.ws.machine.type, rpm: APP.ws.machine.maxRpm})")
            ok('Clear forgets the job', '"m":null' in after and '"d":{}' in after, after)
            ok('Clear empties the box', '"box":""' in after, after)
            ok('Clear keeps the machine', '"mach":"lathe"' in after and '"rpm":8000' in after, after)

            # --- two aluminium grades and a stainless in one email (1.6.4) ---
            await page.evaluate("() => go('')")
            await page.wait_for_timeout(400)
            await page.evaluate("() => doAsk('Our customer needs to polish the surface of plates\\nAW5083\\nAW7075\\nStainless steel 1.4301', {ai:false})")
            chip = await page.locator('#understood [data-edit=material]').inner_text()
            ok('the material chip names both grades', 'AW-5083 + AW-7075' in chip, chip)
            also = await page.locator('#understood').inner_text()
            ok('the stainless is shown as its own setup, not dropped', 'Also in this job' in also and '1.4301' in also, also[:200])
            # the AI reading of the same email: grades kept, and no question about the stainless
            q = await page.evaluate("""() => {
                APP.doc = { files: [{ name: 'Re_ Offer.msg', kind: 'msg', status: '' }], images: [], text: 'x' };
                applyAi({ task: 'polish', feature: 'face', material: 'aluminum', sub: 'wrought', grades: ['AW5083', 'AW7075'],
                  later: [{ material: 'stainless', sub: 'aust', grades: ['1.4301'] }], summary: 'Polish plates.',
                  callouts: [], questions: ['Will the stainless 1.4301 plates also be polished with this setup?'] });
                return JSON.stringify({ q: APP.doc.ai.questions, g: APP.ws.grades, l: APP.ws.later }); }""")
            ok('the AI grades are written one way', '"g":["AW-5083","AW-7075"]' in q, q)
            ok('no question about a material that already has its own setup', '"q":[]' in q, q)
            await page.evaluate("() => { APP.doc = null; renderAttach(); go('result'); }")
            await page.wait_for_timeout(700)
            res = await page.locator('#view').inner_text()
            ok('the setup says which plates it is for', 'aluminum AW-5083 + AW-7075' in res, res[:160])
            ok('the setup notes the two NOGA rows', "two rows in NOGA's table" in res)
            await page.click('[data-later="0"]')
            await page.wait_for_timeout(700)
            sw = await page.evaluate("() => JSON.stringify({ m: APP.ws.material, s: APP.ws.sub, g: APP.ws.grades, l: APP.ws.later.map(x => x.material) })")
            ok('one tap sets up the stainless, and the aluminium waits its turn',
               '"m":"stainless"' in sw and '"g":["1.4301"]' in sw and '"l":["aluminum"]' in sw, sw)
            ok('the stainless setup is on screen', 'stainless steel 1.4301' in (await page.locator('#view').inner_text()).lower())

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
