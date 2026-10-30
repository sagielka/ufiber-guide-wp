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

            # --- a two-job email with four pictures (1.6.6): whole pictures, in email order, before zooms ---
            pic = await page.evaluate("""async () => {
                const mk = (n) => new Blob([new Uint8Array(n)], { type: 'image/png' });
                let got = null; const keep = APP.sample, keepI = APP.sampleImages;
                APP.sample = { json: async (prompt, opt) => { got = { prompt, sizes: (opt.images || []).map(b => b.size) }; return { summary: 'x' }; } };
                APP.sampleImages = { maxCount: 3 };
                APP.doc = { files: [], text: 'Case 1.\\nMaterial : NPP\\nCase 2\\nMaterial : PET-P', images: [mk(101), mk(102), mk(103), mk(104)], crops: [mk(901)], cases: 2 };
                await aiRead();
                APP.sample = keep; APP.sampleImages = keepI; APP.doc = null; renderAttach();
                return JSON.stringify({ sizes: got.sizes, first: /Extract ONLY job 1/.test(got.prompt), inch: /leading dot/.test(got.prompt) }); }""")
            ok('the first three pictures go to Claude in email order, zooms last', '"sizes":[101,102,103]' in pic, pic)
            ok('a two-job email asks Claude for the first job only', '"first":true' in pic, pic)
            ok('Claude is told how American drawings write inches', '"inch":true' in pic, pic)

            # --- a failed request with pictures falls back to the text (1.6.7) ---
            await page.evaluate("() => go('')")
            await page.wait_for_timeout(400)
            fb = await page.evaluate("""async () => {
                const c = document.createElement('canvas'); c.width = 3000; c.height = 2000;
                const x = c.getContext('2d'); for (let i = 0; i < 4000; i++) { x.fillStyle = `rgb(${i % 255},${(i * 7) % 255},${(i * 13) % 255})`; x.fillRect((i * 37) % 3000, (i * 53) % 2000, 40, 40); }
                const big = await new Promise(r => c.toBlob(r, 'image/jpeg', .95));
                const calls = []; const keep = APP.sample, keepI = APP.sampleImages;
                APP.sample = { json: async (prompt, opt) => {
                    const sizes = []; for (const b of (opt.images || [])) { const bm = await createImageBitmap(b); sizes.push([bm.width, b.size]); }
                    calls.push(sizes);
                    if (sizes.length) { const e = new Error('unreachable'); e.code = 'unreachable'; throw e; }
                    return { summary: 'text only' }; } };
                APP.sampleImages = { maxCount: 3 };
                APP.doc = { files: [{ name: 'job.msg', kind: 'msg', status: 'Email read' }], text: 'Material : PP, cross hole', images: [big], crops: [], cases: 0 };
                await aiRead();
                const out = { calls, imgFail: APP.doc.imgFail, summary: APP.doc.ai && APP.doc.ai.summary, err: APP.doc.aiErr,
                  note: document.querySelector('#attach') ? document.querySelector('#attach').innerText : '' };
                APP.sample = keep; APP.sampleImages = keepI; APP.doc = null; renderAttach();
                return JSON.stringify(out); }""")
            fbj = json.loads(fb)
            ok('pictures are shrunk to what Claude reads before sending', fbj['calls'] and fbj['calls'][0] and fbj['calls'][0][0][0] <= 1568 and fbj['calls'][0][0][1] <= 900000, fb[:200])
            ok('when every request with pictures fails, one picture is tried, then the text alone', len(fbj['calls']) == 3 and len(fbj['calls'][1]) == 1 and fbj['calls'][2] == [] and fbj['summary'] == 'text only' and not fbj['err'], fb[:200])
            ok('and the page says the drawings were not seen', 'Only the email text was read' in fbj['note'], fbj['note'][:200])

            # --- three big pictures stay under the site's request budget; one picture is the next try (1.6.9) ---
            bud = await page.evaluate("""async () => {
                const mkBig = async (seed) => { const c = document.createElement('canvas'); c.width = 3000; c.height = 2000;
                  const x = c.getContext('2d'); for (let i = 0; i < 6000; i++) { x.fillStyle = `rgb(${(i * seed) % 255},${(i * 7) % 255},${(i * 13) % 255})`; x.fillRect((i * 37) % 3000, (i * 53) % 2000, 30, 30); }
                  return new Promise(r => c.toBlob(r, 'image/jpeg', .95)); };
                const calls = []; const keep = APP.sample, keepI = APP.sampleImages;
                APP.sample = { json: async (prompt, opt) => { const im = opt.images || []; calls.push(im.map(b => b.size));
                    if (im.length > 1) { const e = new Error('too_large'); e.code = 'too_large'; throw e; } return { summary: 'one' }; } };
                APP.sampleImages = { maxCount: 3 };
                APP.doc = { files: [{ name: 'job.msg', kind: 'msg', status: 'Email read' }], text: 'Material : PP, cross hole', images: [await mkBig(3), await mkBig(5), await mkBig(11)], crops: [], cases: 0 };
                await aiRead();
                const out = { calls, imgFail: APP.doc.imgFail, note: document.querySelector('#attach') ? document.querySelector('#attach').innerText : '' };
                APP.sample = keep; APP.sampleImages = keepI; APP.doc = null; renderAttach();
                return JSON.stringify(out); }""")
            budj = json.loads(bud)
            ok('three big pictures together stay under about 1.1 MB', budj['calls'] and sum(budj['calls'][0]) <= 1100000, budj['calls'][:1])
            ok('if the set is refused, the first picture alone is read', len(budj['calls']) == 2 and len(budj['calls'][1]) == 1 and budj['imgFail'] == 'part' and 'Read with one picture' in budj['note'], bud[:200])

            # --- an answer that isn't clean JSON is asked for once more, shorter (1.6.11) ---
            bj = await page.evaluate("""async () => {
                const calls = []; const keep = APP.sample, keepI = APP.sampleImages;
                APP.sample = { json: async (prompt, opt) => { calls.push({ firm: /exactly ONE JSON object/.test(prompt), n: (opt.images || []).length, mt: opt.max_tokens });
                    if (calls.length === 1) { const e = new Error('bad_json'); e.code = 'bad_json'; throw e; } return { summary: 'second try' }; } };
                APP.sampleImages = { maxCount: 3 };
                APP.doc = { files: [{ name: 'job.msg', kind: 'msg', status: 'Email read' }], text: 'Material : PP, cross hole', images: [new Blob([new Uint8Array(500)], { type: 'image/png' })], crops: [], cases: 0 };
                await aiRead();
                const out = { calls, summary: APP.doc.ai && APP.doc.ai.summary, err: APP.doc.aiErr };
                APP.sample = keep; APP.sampleImages = keepI; APP.doc = null; renderAttach();
                return JSON.stringify(out); }""")
            bjj = json.loads(bj)
            ok('a reply that is not clean JSON is asked again, firmer, with the same pictures', len(bjj['calls']) == 2 and bjj['calls'][1]['firm'] and bjj['calls'][1]['n'] == 1 and bjj['summary'] == 'second try' and not bjj['err'], bj[:200])

            # --- only the first request of a reading counts; the hourly limit is named (1.6.14) ---
            rl = await page.evaluate("""async () => {
                const calls = []; const keep = APP.sample, keepI = APP.sampleImages;
                APP.sample = { json: async (prompt, opt) => { calls.push(!!opt.retry);
                    if (calls.length === 1) { const e = new Error('bad_json'); e.code = 'bad_json'; throw e; } return { summary: 'ok' }; } };
                APP.sampleImages = { maxCount: 3 };
                APP.doc = { files: [{ name: 'job.msg', kind: 'msg', status: 'Email read' }], text: 'Material : PP, cross hole', images: [], crops: [], cases: 0 };
                await aiRead();
                APP.sample = { json: async () => { const e = new Error('visitor_limit'); e.code = 'visitor_limit'; e.limit = 20; e.wait = 37; throw e; } };
                await aiRead();
                const out = { calls, err: APP.doc.aiErr };
                APP.sample = keep; APP.sampleImages = keepI; APP.doc = null; renderAttach();
                return JSON.stringify(out); }""")
            rlj = json.loads(rl)
            ok('the first request is a new reading, the retry is marked as a retry', rlj['calls'] == [False, True], rl)
            ok('the hourly limit says how many and how long to wait', '20 readings an hour' in rlj['err'] and '37 minutes' in rlj['err'], rlj['err'])

            # --- a two-job email: Case 2 gets its own setup and its own pictures (1.6.8) ---
            await page.evaluate("() => go('')")
            await page.wait_for_timeout(400)
            jb = await page.evaluate("""async () => {
                const mk = (n, job) => { const b = new Blob([new Uint8Array(n)], { type: 'image/png' }); b.job = job; return b; };
                const html = '<p>Case 1.</p><p>Material : NPP</p><img src="cid:image001.png@01DC"><p>Case 2</p><p>Material : PET-P</p><img src="cid:image003.png@01DC">';
                const map = picJobs(html, ['image001.png@01DC', 'image003.png@01DC', '']);
                let got = null; const keep = APP.sample, keepI = APP.sampleImages;
                APP.sample = { json: async (prompt, opt) => { got = { prompt, sizes: (opt.images || []).map(b => b.size) }; return { summary: 'case 2' }; } };
                APP.sampleImages = { maxCount: 3 };
                const text = 'Case 1.\\nPart Name : Adapter\\nMaterial : NPP\\nBurr inside at cross hole.\\n\\nCase 2\\nPart Name : Membrane family\\nMaterial : PET-P\\nLay pattern and roughness\\n\\nNotes:\\nBT40 machines\\n\\nRgds';
                APP.doc = { files: [{ name: 'job.msg', kind: 'msg', status: 'Email read' }], text, images: [mk(101, 1), mk(102, 1), mk(201, 2), mk(202, 2)], crops: [], cases: 2 };
                APP.doc.jobs = splitJobs(text); APP.doc.job = 1; renderAttach();
                const btn = document.querySelector('[data-job="2"]'); const label = btn ? btn.innerText : '';
                btn.click(); await new Promise(r => setTimeout(r, 300));
                const out = { map, label, box: document.querySelector('#askT').value, sizes: got && got.sizes, only2: got && /Extract ONLY job 2/.test(got.prompt),
                  now: /Now:\\s*Case 2/.test(document.querySelector('#attach').innerText), mat: APP.ws && APP.ws.material };
                APP.sample = keep; APP.sampleImages = keepI; APP.doc = null; renderAttach();
                return JSON.stringify(out); }""")
            jbj = json.loads(jb)
            ok('pasted pictures are matched to their case from the email body', jbj['map'] == [1, 2, None], jb[:160])
            ok('a button offers Case 2 by name', 'Set up Case 2' in jbj['label'] and 'PET-P' in jbj['label'], jbj['label'])
            ok('Case 2 puts its own text in the box, with the shared notes', 'PET-P' in jbj['box'] and 'NPP' not in jbj['box'] and 'BT40' in jbj['box'], jbj['box'][:160])
            ok('Case 2 sends its own pictures to Claude first', jbj['sizes'] == [201, 202, 101], jbj['sizes'])
            ok('Claude is asked for job 2 only', jbj['only2'] and jbj['now'], {k: jbj[k] for k in ('only2', 'now')})
            ok('Case 2 is set up as plastic', jbj['mat'] == 'plastic', jbj['mat'])

            # --- from a setup: back to the email keeps it, New application forgets it (1.6.13) ---
            await page.evaluate("() => go('')")
            await page.wait_for_timeout(300)
            nav = await page.evaluate("""async () => {
                const wait = (ms) => new Promise(r => setTimeout(r, ms));
                const text = 'Case 1.\\nMaterial : NPP\\ncross hole main bore 3.96 mm cross hole 3.05 mm\\n\\nCase 2\\nPart Name : Membrane family\\nMaterial : PET-P\\n\\nNotes:\\nBT40';
                APP.doc = { files: [{ name: 'job.msg', kind: 'msg', status: 'Email read' }], text, images: [], crops: [], cases: 2 };
                APP.doc.jobs = splitJobs(text); APP.doc.job = 1;
                doAsk(jobText(APP.doc.jobs, 1), { ai: false }); go('result'); await wait(400);
                const res = document.querySelector('#view').innerText;
                const out = { back: !!document.querySelector('[data-nav="home"]'), next: /Set up Case 2/.test(res), newBtn: !!document.querySelector('#newApp') };
                document.querySelector('[data-nav="home"]').click(); await wait(400);
                out.backKeeps = APP.view === '' && !!APP.doc && /Set up Case 2/.test(document.querySelector('#attach').innerText);
                go('result'); await wait(400);
                document.querySelector('#newApp').click(); await wait(400);
                out.cleared = APP.view === '' && !APP.doc && !document.querySelector('#askT').value && APP.ws.machine.iface === 'BT40';
                return JSON.stringify(out); }""")
            navj = json.loads(nav)
            ok('the setup has Back, New application and the next case', navj['back'] and navj['newBtn'] and navj['next'], nav)
            ok('Back returns to the email with its cases', navj['backKeeps'], nav)
            ok('New application forgets the job but keeps the machine', navj['cleared'], nav)

            # --- every tab renders ---
            for tab in ['sf', 'fix', 'competitor', 'learn', 'products']:
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
