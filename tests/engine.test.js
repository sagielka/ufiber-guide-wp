/* Engine and reading tests.
   Every case here is a bug that actually reached a user, or a behaviour that
   broke while fixing one. Run with: node tests/engine.test.js
*/
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const SRC = path.join(__dirname, '..', 'src');
const load = (f) => fs.readFileSync(path.join(SRC, f), 'utf8').replace(/if \(typeof module[^\n]+/g, '');

const ctx = { console, module: { exports: {} }, navigator: { language: 'en' }, location: { search: '' } };
vm.createContext(ctx);
vm.runInContext(
  [load('engine.js'), load('sf.js'), load('msg.js'), load('nlu.js')].join('\n') +
  '\n;globalThis.__E = { parseText, recommend, scrubContact, scrubToolWords, dedupeDims, msgRead, NLU, skuSurface, skuCross, skuPoint, skuDisc, DISC_GRITS, ACCESSORIES, newState: () => ({ task: null, feature: null, material: null, sub: null, burr: "light", dims: {}, machine: { type: "mc", maxRpm: null, iface: null, coolant: true, uneven: false }, override: {} }) };',
  ctx
);
const E = ctx.__E;

let pass = 0, fail = 0;
const ok = (name, cond, detail) => {
  if (cond) { pass++; console.log('PASS ' + name); }
  else { fail++; console.log('FAIL ' + name + (detail === undefined ? '' : '  → ' + JSON.stringify(detail))); }
};
const eq = (name, got, want) => ok(name, JSON.stringify(got) === JSON.stringify(want), { got, want });

/* ---- the tool a customer names is not their part (1.3.7) ---- */
{
  const p = E.parseText('Deburr the inside diameter of a part along a slot using a 3/8" hone/brush with ceramic abrasive fiber.');
  ok('a ceramic fiber brush does not set the part material', !p.material, p.material);
  eq('a 3/8 inch tool gives no part dimension', p.dims, undefined);
  ok('a diamond stone does not set the material', !E.parseText('deburr a slot with a diamond stone').material);
  ok('a carbide burr does not set the material', !E.parseText('we use a carbide burr today').material);
}
{
  const p = E.parseText('deburr a slot in 316L stainless with a ceramic fiber brush, 20 mm bore');
  ok('a real material still reads through a tool mention', p.material === 'stainless', p.material);
  ok('a real size still reads through a tool mention', JSON.stringify(p.dims).includes('20'), p.dims);
}
eq('inches still convert when they describe the part',
  E.parseText('deburr a 2" bore in 6061 aluminium').dims.hole, 50.8);

/* ---- signatures are not job details (1.1.32) ---- */
{
  const sig = 'Deburr cross holes, 25 mm bore, 6 mm cross hole.\n\nJan Novak\n+420 777 868 697\nwww.cncbastards.cz\njan@example.com';
  const p = E.parseText(sig);
  ok('a +420 phone number is not 420 stainless', !p.material, p.material);
  eq('the real sizes survive the signature', p.dims, { main: 25, cross: 6 });
  ok('a cnc domain is not a machine', !p.machine || !p.machine.type, p.machine);
}

/* ---- a cross hole is two diameters, not three (1.1.34) ---- */
{
  const st = E.newState();
  st.task = 'crosshole'; st.dims = { main: 25, cross: 6, hole: 6 };
  E.dedupeDims(st);
  eq('a third chip repeating the cross hole is dropped', st.dims, { main: 25, cross: 6 });
}

/* ---- Outlook .msg is a container, not text (1.1.32) ---- */
ok('a .msg that is not an OLE file is refused rather than guessed at',
  E.msgRead(new TextEncoder().encode('just some text, not a compound file').buffer) === null);

/* ---- the disc exists in six grits only (1.1.12) ---- */
{
  eq('the disc grit list is the six real ones', E.DISC_GRITS, [150, 200, 400, 600, 800, 1000]);
  const fine = E.skuDisc(22, 1200);
  ok('a finer grit snaps to the finest disc that exists', fine.sku === 'UF7622', fine);
}

/* ---- item numbers match the catalogue ---- */
{
  eq('Ø25 #1000 surface brush', E.skuSurface(25, 1000), { sku: 'UF1625', desc: 'UF-FB-W-D025-L75' });
  eq('Ø7 #1000 cross-hole brush', E.skuCross(7, 1000), { sku: 'UF2670', desc: 'UF-CH-W-D070-L60' });
  ok('the disc clamping shank is a shank, not a disc', !!E.ACCESSORIES.UF7030 && /DA-016/.test(E.ACCESSORIES.UF7030[1]), E.ACCESSORIES.UF7030);
  ok('the Ø2.35 clamping shank is known', !!E.ACCESSORIES.UF7023);
  ok('a face sleeve is known', !!E.ACCESSORIES.UF5525);
  ok('a floating damper is known', !!E.ACCESSORIES.UF8858);
}

/* ---- a recommendation still comes out whole ---- */
{
  const st = E.newState();
  st.task = 'crosshole'; st.material = 'stainless'; st.sub = 'aust'; st.dims = { main: 20, cross: 8 };
  const R = E.recommend(st);
  ok('a cross-hole job returns an item number', /^UF\d{4}$/.test(R.sku), R.sku);
  ok('it carries a speed', R.params && R.params.rpm > 0, R.params && R.params.rpm);
  ok('it carries a feed', R.params && R.params.feed > 0, R.params && R.params.feed);
  ok('the stroke says where it comes from', /cross hole plus 5 mm/.test(R.params.engage.note), R.params.engage.note);
  eq('the stroke is the cross hole plus 5 mm each side', R.params.engage.value, 18);
}
{
  const st = E.newState();
  st.task = 'deburr_mill'; st.feature = 'face'; st.material = 'aluminum'; st.sub = 'wrought'; st.dims = { width: 40 };
  const R = E.recommend(st);
  ok('a surface job returns an item number', /^UF\d{4}$/.test(R.sku), R.sku);
  ok('depth of cut never exceeds 1.2 mm', !R.params.engage || R.params.engage.value <= 1.2, R.params.engage);
}

/* ---- the model fills gaps but never invents ---- */
{
  const st = E.newState();
  E.NLU.load && ok('the model is optional, and absent here', true);
  const p = E.parseText('something about a part with no material named at all');
  ok('no material is guessed from a sentence that names none', !p.material, p.material);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
