/* Engine and reading tests.
   Every case here is a bug that actually reached a user, or a behaviour that
   broke while fixing one. Run with: node tests/engine.test.js
*/
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const SRC = path.join(__dirname, '..', 'src');
const load = (f) => fs.readFileSync(path.join(SRC, f), 'utf8').replace(/if \(typeof module[^\n]+/g, '');

const ctx = { console, module: { exports: {} }, navigator: { language: 'en' }, location: { search: '' }, btoa, atob, escape, unescape };
vm.createContext(ctx);
vm.runInContext(
  [fs.readFileSync(path.join(SRC, 'cases_block.txt'), 'utf8'),
   load('engine.js'), load('sf.js'), load('msg.js'), load('nlu.js'), load('ui1.js'), load('ui4.js'), load('ui7.js'), load('share.js')].join('\n') +
  '\n;globalThis.__F = typeof AI_FACTS === "function" ? AI_FACTS : null;\n;globalThis.__C = typeof AI_CASES === "function" ? AI_CASES : null;\n;globalThis.__CASES = typeof CASES !== "undefined" ? CASES : [];' +
  '\n;globalThis.__E = { parseText, recommend, gradesIn, gradeInfo, cleanGrades, SHARE, scrubContact, scrubToolWords, dedupeDims, msgRead, caseCount, splitJobs, jobText, NLU,' +
  ' xParse, xConvert, xFind, xCompact, skuSurface, skuCross, skuPoint, skuDisc, DISC_GRITS, ACCESSORIES, MAX_RPM, SURFACE, SURFACE_LIMITS, GRITS,' +
  ' newState: () => ({ task: null, feature: null, material: null, sub: null, burr: "light", dims: {},' +
  ' machine: { type: "mc", maxRpm: null, iface: null, coolant: true, uneven: false }, override: {} }) };',
  ctx
);
const E = ctx.__E;

let pass = 0, fail = 0;
const ok = (name, cond, detail) => {
  if (cond) { pass++; console.log('PASS ' + name); }
  else { fail++; console.log('FAIL ' + name + (detail === undefined ? '' : '  → ' + JSON.stringify(detail))); }
};
const eq = (name, got, want) => ok(name, JSON.stringify(got) === JSON.stringify(want), { got, want });

/* ---- a Swiss-type cross-hole job: lathe steps, live-tool speed, through hole and slot (1.6.3) ---- */
{
  const mail = `Machine : Swiss type lathe
Holding : Live tool
Entry dia : 3.1
Material : L-605 Cobalt alloy.
There is a hole of dia 2.3 on the diameter and a milled slot ( both sides ) as per below details which opens in the dia 3.1mm reamed hole.
he also has a 1.016 slot with length of 1.5mm.`;
  const p = E.parseText(mail);
  eq('a hole "on the diameter" that "opens in the reamed hole" is a cross-hole job', p.task, 'crosshole');
  ok('the bore and cross hole are two different sizes', p.dims && p.dims.main === 3.1 && p.dims.cross === 2.3, p.dims);
  ok('the slot is read as a slot', p.dims && p.dims.slotW === 1.016 && p.dims.slotL === 1.5, p.dims);
  eq('"on the diameter" / "both sides" means through both walls', p.through, true);
  eq('L-605 is a cobalt alloy', [p.material, p.sub], ['hrsa', 'co']);
  eq('the machine is a Swiss type', p.machine && p.machine.type, 'swiss');
  const st = Object.assign(E.newState(), { task: p.task, feature: p.feature, material: p.material, sub: p.sub, dims: p.dims, through: p.through });
  st.machine.type = 'swiss';
  const R = E.recommend(st);
  ok('lathe steps: spindle stopped, axial live tool', /C-axis/.test(R.steps[0]) && /axial live tool/.test(R.steps[0]), R.steps[0]);
  ok('lathe feed is programmed in mm/min', /G98/.test(R.steps[2]), R.steps[2]);
  ok('an unknown live-tool speed is flagged', R.warnings.some(w => /Check the live-tool speed/.test(w.t)), R.warnings.map(w => w.t));
  ok('a through cross hole over 70% is a warning, not a note', R.warnings.some(w => /Through cross hole is 74%/.test(w.t)), R.warnings.map(w => w.t));
  ok('the below-range bore is not called "inside the range"', !R.why.some(w => /inside this brush's working range/.test(w.d)), R.why.map(w => w.d));
  ok('the failed L605 field trial is passed on', R.warnings.some(w => /L605/.test(w.d)));
  ok('the slot is mentioned', R.notes.some(n => /slot/.test(n)), R.notes);
  st.machine.maxRpm = 6000;
  const R6 = E.recommend(st);
  ok('a 6,000 RPM live tool is too slow for 7,700', R6.warnings.some(w => /too slow/.test(w.t)) && R6.params.rpm === 6000, R6.warnings.map(w => w.t));
  eq('and drops the confidence to low', R6.conf.level, 'low');
  st.machine.maxRpm = 7000;
  ok('7,000 RPM is close enough to trial', E.recommend(st).warnings.some(w => /slightly below/.test(w.t)));
  st.machine.maxRpm = 10000;
  ok('a fast live tool raises no speed warning', !E.recommend(st).warnings.some(w => /live.tool/i.test(w.t)));
  const mc = Object.assign(E.newState(), { task: 'crosshole', feature: 'cross', material: 'carbon', dims: { main: 16.5, cross: 10 } });
  const Rm = E.recommend(mc);
  ok('a machining centre keeps the "position above" step', /Position above/.test(Rm.steps[0]), Rm.steps[0]);
  ok('and gets no live-tool warning', !Rm.warnings.some(w => /live.tool/i.test(w.t)));
}

/* ---- a stated burr height is the burr, not a width, and a big one is flagged (1.6.2) ---- */
{
  const mail = `Machining conditions:
* Main hole diameter: Ø16.5 mm
* Cross hole diameter: Ø10 mm
* Burr height: Approx. 1 mm
* Workpiece material: S45C
Proposed tooling: Brush: UF1315 (Ø15 #400), Shank: UF5001`;
  const p = E.parseText(mail);
  eq('the burr height is read', p.burrMm, 1);
  eq('a 1 mm burr is heavy', p.burr, 'heavy');
  ok('the burr height is not a width', !(p.dims && p.dims.width), p.dims);
  ok('the bore and cross hole are kept', p.dims && p.dims.main === 16.5 && p.dims.cross === 10, p.dims);
  const st = Object.assign(E.newState(), { task: p.task, feature: p.feature, material: p.material, burr: p.burr, burrMm: p.burrMm, dims: p.dims });
  const R = E.recommend(st);
  ok('a 1 mm burr gets a warning', R.warnings.some(w => /1 mm burr is too large/.test(w.t)), R.warnings.map(w => w.t));
  eq('and lowers the confidence', R.conf.level, 'low');
  eq('0.05 mm is a light burr', E.parseText('burr height 0.05 mm on a 6 mm hole edge').burr, 'light');
  eq('a "0.3 mm burr" is heavy', E.parseText('there is a 0.3 mm burr on the Ø8 hole').burr, 'heavy');
}

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

/* ---- three plate materials in one email: two aluminium grades and a stainless (1.6.4) ---- */
{
  // AFI / Dominika, Oct 2026: answered "aluminium, please"; the app showed one
  // "Aluminum (Wrought)" chip, used the 7075 row for 5083, dropped the 1.4301,
  // and asked whether the stainless shared the setup. The Czech "Předmět:"
  // header also read as EDM, so offline the job became "Hard / EDM".
  const mail = `Hello,
Which plate material should we start with: aluminium or stainless? -> aluminium, please
What machine will do the polishing? -> CNC milling center
Dominika Antlová
mobil: +420 722 924 747
Od: Sagi Elkayam <sagi@noga.com>
Předmět: RE: Offer
Our customer needs to polish the surface of plates
AW5083
AW7075
Stainless steel 1.4301
Can you suggest any tools and conditions for this?`;
  const p = E.parseText(mail);
  eq('a Czech "Předmět:" header is not EDM', p.task, 'polish');
  eq('a "CNC milling center" is a machining centre', p.machine && p.machine.type, 'mc');
  eq('the plates listed first are set up first', [p.material, p.sub], ['aluminum', 'wrought']);
  eq('both aluminium grades are kept', p.grades, ['AW-5083', 'AW-7075']);
  eq('the stainless is kept for its own setup', p.also, [{ material: 'stainless', sub: 'aust', grades: ['1.4301'] }]);
  const st = Object.assign(E.newState(), { task: 'polish', feature: 'face', material: p.material, sub: p.sub, grades: p.grades });
  const R = E.recommend(st);
  ok('a 5083 + 7075 mix says one setup covers both, with the overlap from the table',
    R.notes.some(n => /two rows in NOGA's table/.test(n) && /Vc 165–320 m\/min/.test(n)), R.notes);
  eq('the mix runs on the hardenable (slower) row', R.sfRow, 22);
  eq('5083 alone runs on the not-hardenable row', E.recommend(Object.assign({}, st, { grades: ['AW-5083'] })).sfRow, 21);
  eq('7075 alone runs on the hardenable row', E.recommend(Object.assign({}, st, { grades: ['EN AW-7075'] })).sfRow, 22);
  ok('one grade gives no two-row note', !E.recommend(Object.assign({}, st, { grades: ['AW-5083'] })).notes.some(n => /two rows/.test(n)));
}

/* ---- grades are read carefully ---- */
{
  eq('EN AW-6082-T6 is wrought aluminium', E.gradesIn('EN AW-6082-T6 bracket').map(g => g.g), ['AW-6082']);
  eq('a year is not a 2024 alloy', E.parseText('drawing rev October 2024, AW-6082 part').grades, ['AW-6082']);
  eq('1,4404 with a comma is a stainless grade', E.parseText('housing in 1,4404, deburr the ports').grades, ['1.4404']);
  eq('a +420 phone number is still not a grade', E.parseText('aluminium plate\nmobil: +420 722 924 747').grades, undefined);
  eq('grades the AI writes are cleaned and written one way', E.cleanGrades(['AW7075', 'EN AW-7075', '<b>', '1.4301']), ['AW-7075', '1.4301']);
}

/* ---- a shared link keeps the grades and leaves out what does not apply ---- */
{
  const st = Object.assign(E.newState(), { task: 'polish', feature: 'face', material: 'aluminum', sub: 'wrought', grades: ['AW-5083', 'AW-7075'], burr: 'light' });
  const back = E.SHARE.decode(E.SHARE.encode(st));
  eq('grades travel in a shared link', back.grades, ['AW-5083', 'AW-7075']);
  ok('a polishing link carries no burr level', !JSON.parse(Buffer.from(E.SHARE.encode(st).replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()).b);
}

/* ---- the facts handed to the AI are read from the tables, not written out ---- */
{
  const facts = ctx.__F ? ctx.__F() : null;
  if (facts) {
    ok('the facts quote the real Ø25 speed window',
      facts.includes(`${E.SURFACE[25].rpm[0].toLocaleString('en-US')}\u2013${E.SURFACE[25].rpm[1].toLocaleString('en-US')}`), facts.slice(0, 80));
    ok('the facts quote the real disc grits', facts.includes('#' + E.DISC_GRITS.join(', #')));
    ok('the facts quote the real depth limit', facts.includes(String(E.SURFACE_LIMITS.docMax)));
    ok('the facts name every accessory', E.ACCESSORIES && facts.includes('UF9999') && facts.includes('UF7023'));
    ok('a brush with no shank says so rather than trailing off', !/shanks ;/.test(facts));
    ok('the point and end ceilings come from one constant', facts.includes(E.MAX_RPM.point.toLocaleString('en-US')));
  }
}

/* ---- the tested library reaches the model whole ---- */
{
  const cases = ctx.__C ? ctx.__C() : null;
  const all = ctx.__CASES || [];
  if (cases && all.length) {
    ok('every tested application is listed', cases.split('\n').length - 1 === all.length, { lines: cases.split('\n').length - 1, cases: all.length });
    const withRpm = all.filter(c => c.rpm)[0];
    ok('a case keeps its measured speed', cases.includes(withRpm.rpm.toLocaleString('en-US') + ' rpm'), withRpm.rpm);
    ok('the model is told a tested result outranks the tables', /prefer the tested figure/.test(cases));
    ok('the index stays small enough to send every turn', cases.length < 20000, cases.length);
  }
}


/* ---- PTSC / MCAM email, 1.6.5: plastics, part numbers, pasted drawings ---- */
{
  const mail = `Subject: PTSC-MCAM_ First NogaMT Trials_ Information support Ceramic Brush solution to Improve Deburring and Surface Finish_

Customer is interested and request trials before purchase. Now customer is trying competitor.

Case 1.
Part Name : 15-430509-00 Adapter, APT, Chemical, 1/4" Port (Fitting)
Material : NPP
Problem is : Burr inside at cross hole.
Target : Break and Deburr all sharp corner and edges.

Case 2
Part Name : Membrane family
Material : PET-P
Problem is : Lay pattern direction and Roughness

Notes:
All part materials are engineering plastics. We will need fine grits type ceramic. (Customer informed that they use Sand papers to polish the surface finish of stainless steel and plastic materials, for these engineering plastic materials, they have to use a very fine sand paper to get required surface)
Customer will be using our ceramic brushes on BT40 spindle machines (So, pls select BT40 arbor if you recommend using our floatting arbor with our ceramic brush)`;
  const p = E.parseText(mail);
  ok('"fine grits type ceramic" is the brush, not a carbide part', p.material !== 'carbide', p.material);
  ok('"Material : NPP" reads as plastic, ahead of stainless named in passing', p.material === 'plastic', p.material);
  ok('PET-P, PP, PVDF and plurals read as plastic', ['Material: PET-P', 'material is PP', 'PVDF body', 'engineering plastics'].every(x => E.parseText(x).material === 'plastic'));
  ok('a ceramic part is still read as ceramic', E.parseText('alumina ceramic insulator, material: ceramic').material === 'carbide');
  ok('the job is the cross hole on a BT40 machining centre', p.task === 'crosshole' && p.machine?.type === 'mc' && p.machine?.iface === 'BT40', p);
  ok('neither BT40 nor the part number becomes a size', !p.dims || (!Object.values(p.dims).includes(40) && !Object.values(p.dims).includes(15)), p.dims);
  ok('two cases in one email are counted', E.caseCount(mail) === 2, E.caseCount(mail));
  ok('"Part Name" is not a case', E.caseCount('Part Name : X\nPart number 12') === 0);
  // the offline model must not invent the sizes either
  if (fs.existsSync(path.join(SRC, 'model_block.txt'))) {
    vm.runInContext(fs.readFileSync(path.join(SRC, 'model_block.txt'), 'utf8') + '\n;globalThis.__M = NLU_MODEL;', ctx);
    E.NLU.load(ctx.__M);
    const st = E.newState(); Object.assign(st, { task: p.task, feature: p.feature, material: p.material });
    if (p.machine) Object.assign(st.machine, p.machine);
    E.NLU.toState(mail, st);
    ok('the offline model does not turn BT40 and 15-430509 into Ø40 / Ø15', st.dims.main !== 40 && st.dims.cross !== 15, st.dims);
    const st2 = E.newState(); st2.task = 'crosshole'; st2.feature = 'cross';
    E.NLU.toState('cross hole deburring, main bore Ø3.96 mm, cross hole Ø3.05 mm', st2);
    ok('real marked sizes still fill a cross-hole job', st2.dims.main === 3.96 && st2.dims.cross === 3.05, st2.dims);
  }
}

/* ---- each job in a multi-case email gets its own text (1.6.8) ---- */
{
  const mail = `Dear Sagi\n\nCustomer picked 2 cases to test as below;\n\nCase 1.\nPart Name : 15-430509-00 Adapter\nMaterial : NPP\nProblem is : Burr inside at cross hole.\n\nCase 2\nPart Name : Membrane family\nMaterial : PET-P\nProblem is : Lay pattern direction and Roughness\n\nNotes:\nAll part materials are engineering plastics.\nCustomer will be using our ceramic brushes on BT40 spindle machines\n\nRgds\nNonGG`;
  const sp = E.splitJobs(mail);
  ok('two jobs are split out', sp && sp.jobs.length === 2 && sp.jobs[1].n === 2, sp && sp.jobs.map(j => j.n));
  ok('each job is labelled by its part and material', sp.jobs[1].label === 'Membrane family, PET-P', sp.jobs[1].label);
  ok('job 1 does not carry job 2', !/PET-P/.test(sp.jobs[0].text) && /NPP/.test(sp.jobs[0].text));
  ok('the closing notes go with every job, the signature with none', /BT40/.test(E.jobText(sp, 1)) && /BT40/.test(E.jobText(sp, 2)) && !/NonGG/.test(E.jobText(sp, 2)));
  const p2 = E.parseText(E.jobText(sp, 2));
  ok('job 2 reads as a plastic surface job, not a cross hole', p2.material === 'plastic' && p2.task !== 'crosshole', p2);
  ok('a single job is not split', E.splitJobs('Material : PP, cross hole burr') === null);
}

/* ---- a .msg carries its pictures as attachments (1.6.5) ---- */
{
  // a minimal compound file: root -> subject, body, two attachment storages
  const enc16 = (str) => { const b = new Uint8Array(str.length * 2); for (let i = 0; i < str.length; i++) { b[2 * i] = str.charCodeAt(i) & 255; b[2 * i + 1] = str.charCodeAt(i) >> 8; } return b; };
  const NOS = 0xffffffff, END = 0xfffffffe;
  const ents = [{ name: 'Root Entry', type: 5, kids: [] }];
  const add = (parent, name, type, data) => { const e = { name, type, data, kids: [] }; ents.push(e); ents[parent].kids.push(ents.length - 1); return ents.length - 1; };
  add(0, '__substg1.0_0037001F', 2, enc16('Drawing for the cross hole'));
  add(0, '__substg1.0_1000001F', 2, enc16('Material : PP\nPlease see the picture.'));
  const big = new Uint8Array(30000).map((_, i) => (i * 7) & 255), logo = new Uint8Array(3000).fill(9);
  const a0 = add(0, '__attach_version1.0_#00000000', 1);
  add(a0, '__substg1.0_37010102', 2, big); add(a0, '__substg1.0_3707001F', 2, enc16('image001.png')); add(a0, '__substg1.0_370E001F', 2, enc16('image/png'));
  const a1 = add(0, '__attach_version1.0_#00000001', 1);
  add(a1, '__substg1.0_37010102', 2, logo); add(a1, '__substg1.0_3707001F', 2, enc16('logo.jpg')); add(a1, '__substg1.0_370E001F', 2, enc16('image/jpeg'));
  // an attachment's own subject must not replace the message's
  add(a1, '__substg1.0_0037001F', 2, enc16('WRONG subject'));
  const S = 512, secs = [], fat = [];
  for (const e of ents) if (e.data) { e.start = secs.length; const n = Math.ceil(e.data.length / S); for (let i = 0; i < n; i++) { secs.push(e.data.subarray(i * S, i * S + S)); fat.push(i < n - 1 ? secs.length : END); } }
  const dirStart = secs.length, nDir = Math.ceil(ents.length / 4);
  const dir = new Uint8Array(nDir * S), dv = new DataView(dir.buffer);
  ents.forEach((e, i) => {
    const o = i * 128, nm = enc16(e.name); dir.set(nm, o); dv.setUint16(o + 0x40, nm.length + 2, true); dv.setUint8(o + 0x42, e.type); dv.setUint8(o + 0x43, 1);
    dv.setUint32(o + 0x44, NOS, true); dv.setUint32(o + 0x48, NOS, true);
    // children as a right-leaning chain: valid, and it exercises the sibling walk
    dv.setUint32(o + 0x4c, e.kids.length ? e.kids[0] : NOS, true);
    const parent = ents.find(x => x.kids.includes(i)); if (parent) { const k = parent.kids, j = k.indexOf(i); if (j + 1 < k.length) dv.setUint32(o + 0x48, k[j + 1], true); }
    dv.setUint32(o + 0x74, e.data ? e.start : END, true); dv.setUint32(o + 0x78, e.data ? e.data.length : 0, true);
  });
  for (let i = ents.length; i < nDir * 4; i++) { dv.setUint32(i * 128 + 0x44, NOS, true); dv.setUint32(i * 128 + 0x48, NOS, true); dv.setUint32(i * 128 + 0x4c, NOS, true); }
  for (let i = 0; i < nDir; i++) { secs.push(dir.subarray(i * S, i * S + S)); fat.push(i < nDir - 1 ? secs.length : END); }
  let nFat = 1; while (Math.ceil((secs.length + nFat) / 128) > nFat) nFat++;
  const fatStart = secs.length; for (let i = 0; i < nFat; i++) fat.push(0xfffffffd);
  while (fat.length < nFat * 128) fat.push(NOS);
  const out = new Uint8Array(S * (1 + secs.length + nFat)), hv = new DataView(out.buffer);
  out.set([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
  hv.setUint16(0x18, 0x3e, true); hv.setUint16(0x1a, 3, true); hv.setUint16(0x1c, 0xfffe, true); hv.setUint16(0x1e, 9, true); hv.setUint16(0x20, 6, true);
  hv.setUint32(0x2c, nFat, true); hv.setUint32(0x30, dirStart, true); hv.setUint32(0x38, 1, true); hv.setUint32(0x3c, END, true); hv.setUint32(0x44, END, true);
  for (let i = 0; i < 109; i++) hv.setUint32(0x4c + i * 4, i < nFat ? fatStart + i : NOS, true);
  secs.forEach((b, i) => out.set(b, S * (1 + i)));
  fat.forEach((v, i) => hv.setUint32(S * (1 + fatStart) + i * 4, v, true));
  const m = E.msgRead(out.buffer);
  ok('a .msg still gives its subject and body', m && m.subject === 'Drawing for the cross hole' && /Material : PP/.test(m.body), m && m.subject);
  ok('a picture pasted into a .msg is read out byte for byte', m && m.files.length === 2 && m.files[0].name === 'image001.png' && m.files[0].mime === 'image/png'
    && m.files[0].bytes.length === big.length && m.files[0].bytes.every((v, i) => v === big[i]), m && m.files.map(f => [f.name, f.size]));
}


/* ---- American drawings: Ø.156 is inches (1.6.6) ---- */
{
  const p = E.parseText('cross hole Ø.120 into main bore Ø.156');
  ok('Ø.156 / Ø.120 read as inches', p.dims && Math.abs(p.dims.main - 3.962) < 0.01 && Math.abs(p.dims.cross - 3.048) < 0.01, p.dims);
  const q = E.parseText('cross hole Ø3.05 mm into a Ø3.96 mm bore. Done.');
  ok('ordinary decimals are left alone', q.dims && q.dims.main === 3.96 && q.dims.cross === 3.05, q.dims);
}


/* ---- an answer that is almost one JSON object still reads (1.6.11) ---- */
{
  const { AISERVER_JSON: J } = require(path.join(SRC, 'aiserver.js'));
  ok('one object per case: the first is taken', J('{"task":"crosshole","summary":"Case 1"}\n{"task":"polish","summary":"Case 2"}')?.summary === 'Case 1');
  ok('a code fence and a sentence around it', J('Here is the JSON:\n```json\n{"a":1,"b":"x } y"}\n```\nHope this helps.')?.b === 'x } y');
  ok('a trailing comma', J('{"a":[1,2,],"b":2,}')?.b === 2);
  ok('nothing usable gives null', J('{"a": 1, "b": ') === null);
}


/* ---- a port read as the main bore is questioned (1.6.12) ---- */
{
  const mk = (main, cross) => { const st = E.newState(); Object.assign(st, { task: 'crosshole', feature: 'cross', material: 'plastic', burr: 'heavy', dims: { main, cross } }); return E.recommend(st); };
  const bad = mk(17.4, 3.96), good = mk(3.96, 3.05);
  ok('a Ø17.4 "bore" over a Ø3.96 cross hole is flagged and not High confidence', bad.warnings.some(w => /main bore size/.test(w.t)) && bad.conf.level !== 'high', bad.conf);
  ok('the real Ø3.96 / Ø3.05 pair is not flagged and picks the Ø1.5 brush', !good.warnings.some(w => /main bore size/.test(w.t)) && good.sku === 'UF2815', good.sku);
}


/* ---- a width estimated from the drawing sizes the brush, and says so (1.6.15) ---- */
{
  const st = E.newState(); Object.assign(st, { task: 'marks', feature: 'face', material: 'plastic', dims: { width: 15 }, est: ['width'] });
  const R = E.recommend(st);
  ok('an estimated 15 mm seal band gives the Ø25 brush', R.dia === 25 && R.sku === 'UF1925', R.sku);
  ok('and the setup says the width was estimated, at Medium confidence', R.notes.some(n => /Estimated from the drawing: working width ≈ 15/.test(n)) && R.conf.level !== 'high', R.conf);
  const st2 = E.newState(); Object.assign(st2, { task: 'marks', feature: 'face', material: 'plastic', dims: { width: 15 } });
  ok('a stated width is not called an estimate', !E.recommend(st2).notes.some(n => /Estimated from the drawing/.test(n)));
}

/* ---- Ø15 surface brush on a shank from Ø19, from maker's spread test (1.6.16) ---- */
{
  const job = (main, ov) => { const st = E.newState(); Object.assign(st, { task: 'crosshole', feature: 'cross', material: 'aluminum', sub: 'wrought', dims: { main, cross: 8 }, override: ov || {} }); return E.recommend(st); };
  const r19 = job(19);
  ok('a Ø19 bore still gets a cross-hole brush first', r19.family !== 'shank', r19.family);
  ok('and offers the Ø15 surface brush on a shank', r19.alts.some(a => /Surface brush on a shank/.test(a.label)), r19.alts.map(a => a.label));
  ok('a Ø16 bore does not offer it (no data below Ø19)', !job(16).alts.some(a => /Surface brush on a shank/.test(a.label)));
  const s19 = job(19, { family: 'shank', dia: 15, grit: 1000 });
  ok('the Ø15 #1000 on a shank is UF1615', s19.sku === 'UF1615', s19.sku);
  ok('it cites the measured spread', s19.why.some(w => /Ø28\.9 at the tips/.test(w.d) && /Ø19 cross hole/.test(w.d)), s19.why.map(w => w.t));
  ok('a #1000 Ø15 surface brush now fits a Ø19 bore, a #600 one does not', vm.runInContext('sfShankFits(19, 1000).some(f => f.d === 15) && !sfShankFits(19, 600).length', ctx));
}


/* ---- competitor cross-reference, checked row by row against the catalogues (1.6.17) ----
   competitor: a distributor listings + a distributor. competitor: competitor catalogue pages and brush-info sheet sent to NOGA, Jun-2024. */
{
  const X = (c) => E.xConvert(E.xParse(c));
  const sku = (c) => X(c).uf?.sku;
  // competitor surface: colour → grit (pink #2000, red #1200, white #1000, blue #800), every size
  const surf = { A13: [6, 15], A11: [6, 15, 25, 40, 60, 100], A21: [6, 15, 25, 40, 60, 100], A31: [6, 15, 25, 40, 60, 100], A32: [6, 15, 25, 40, 60, 100] };
  const g = { A13: 2000, A11: 1200, A21: 1000, A31: 800, A32: 800 };
  let bad = [];
  for (const [c, ds] of Object.entries(surf)) for (const d of ds) { const code = `${c}-CB${String(d).padStart(2, '0')}M`; const want = E.skuSurface(d, g[c]).sku; if (sku(code) !== want) bad.push([code, sku(code), want]); }
  ok('every competitor surface brush maps to the same size and its colour grit', !bad.length, bad);
  ok('A32-CB100M is UF1500 (confirmed by NOGA)', sku('A32-CB100M') === 'UF1500', sku('A32-CB100M'));
  // competitor crosshole: bore ranges per colour; blue Ø7 is 10–14, red Ø7 is 10–20
  ok('red Ø7 crosshole → UF2770 #1200, same Ø10–20 range', sku('CH-A12-7M') === 'UF2770' && X('CH-A12-7M').notes.some(n => /Same bore range.*10–20/.test(n)), X('CH-A12-7M').notes);
  ok('blue Ø7 crosshole is competitor Ø10–14, not 10–20', sku('CH-A33-7M') === 'UF2570' && X('CH-A33-7M').notes.some(n => /competitor Ø7 brush covers Ø10–14/.test(n)), X('CH-A33-7M').notes);
  ok('-TL suffix and Ø1.5 read', sku('CH-A12-5M-TL') === 'UF2750' && sku('CH-A12-1.5M') === 'UF2715');
  ok('competitor L brush: length and shank change are flagged', X('CH-A33-7L').status === 'close' && X('CH-A33-7L').notes.some(n => /180 mm/.test(n)) && X('CH-A33-7L').notes.some(n => /Ø8 shank/.test(n)), X('CH-A33-7L').notes);
  ok('red Ø11 crosshole → #1000 (Ø11 has no #1200)', sku('CH-A12-11M') === 'UF2611');
  // competitor Extra-Large A34: surface brush on a shank
  ok('CH-A34-15 (bores 20–25) → Ø15 surface brush on shank UF5001', X('CH-A34-15').uf?.dia === 15 && X('CH-A34-15').holders.some(h => h.sku === 'UF5001'), X('CH-A34-15'));
  ok('CH-A34-25 (bores 30–35) → Ø25 on shank UF5003', X('CH-A34-25').uf?.dia === 25 && X('CH-A34-25').holders.some(h => h.sku === 'UF5003'));
  ok('CH-SH-6 shank is understood', X('CH-SH-6').uf?.sku === 'UF5001');
  // competitor end, sleeves
  ok('A21-EB06M → flat end brush #1000, A13-EB03M → Ø3 point #2000', sku('A21-EB06M') === 'UF4650' && sku('A13-EB03M') === 'UF3830', [sku('A21-EB06M'), sku('A13-EB03M')]);
  ok('S25M sleeve → UF5525 with a collet change (Ø8 → Ø10)', sku('S25M') === 'UF5525' && X('S25M').notes.some(n => /Ø8 to Ø10/.test(n)));
  // competitor surface sets: graded like competitor (pink A12 → #1200, blue → #800); sleeve shanks Ø6/6/8/10/12/14
  const vs = [[6, 6], [15, 6], [25, 8], [40, 10], [60, 12], [100, 14]];
  bad = [];
  for (const [d, ds] of vs) { const code = `CN-CB${String(d).padStart(2, '0')}MS`; if (sku(code) !== E.skuSurface(d, 1200).sku) bad.push([code, sku(code)]); const o = X(code); const S = E.SURFACE[d]; if (ds !== S.ds && !o.notes.some(n => new RegExp(`Ø${ds} shank`).test(n))) bad.push([code, 'shank note']); }
  ok('every competitor pink surface set maps to the same size #1200, with shank changes noted', !bad.length, bad);
  ok('competitor blue (H) surface brush → #800, like competitor blue', sku('CN-CB15HS') === 'UF1515' && sku('CN-06H') === 'UF1506', [sku('CN-CB15HS'), sku('CN-06H')]);
  // competitor cross-hole: pink A12 ≈ P1200 (not competitor red A12 by name only), Ø9 has no UFIBER size
  ok('competitor CN-A12-7M (pink) → UF2770 #1200', sku('CN-A12-7M') === 'UF2770');
  ok('competitor CN-A12-1.5M → UF2715, Ø3–5 vs Ø3.5–5 flagged', sku('CN-A12-1.5M') === 'UF2715' && X('CN-A12-1.5M').notes.some(n => /Ø3–5/.test(n)));
  ok('competitor Ø9 pink → UFIBER Ø7 #1200 (covers Ø10–20)', sku('CN-A12-9M') === 'UF2770' && X('CN-A12-9M').status === 'close');
  ok('competitor Ø9 blue → Ø7 #800 plus Ø11 #800 for Ø14–18', sku('CN-A33-9M') === 'UF2570' && X('CN-A33-9M').alts.some(a => a.sku === 'UF2511'), X('CN-A33-9M').alts);
  ok('competitor blue Ø11 → Ø11 #800, a direct match', sku('CN-A33-11M') === 'UF2511' && X('CN-A33-11M').status === 'direct', [sku('CN-A33-11M'), X('CN-A33-11M').status]);
  ok('competitor blue cross-hole is the same as competitor blue: UF2550, direct', sku('CN-A33-5M') === 'UF2550' && sku('CN-A33-5M') === sku('CH-A33-5M') && X('CN-A33-5M').status === 'direct');
  ok('competitor pink A12 is the same as competitor A12', sku('CN-A12-5M') === sku('CH-A12-5M'));
  // competitor micro-hole, stones, others
  ok('CB31R-S1.5 → Ø1.5 point #1200, CB31B-S2.5 → Ø2.5 point #800', sku('CB31R-S1.5') === 'UF3715' && sku('CB31B-S2.5') === 'UF3525', [sku('CB31R-S1.5'), sku('CB31B-S2.5')]);
  ok('competitor oil stones → UFIBER Ø3 diamond stone by grit (#800, #400, #220→#200)', sku('CN-PB-3B') === 'UF9430' && sku('CN-PO-3B') === 'UF9230' && sku('CN-PM-3B') === 'UF9130', [sku('CN-PB-3B'), sku('CN-PO-3B'), sku('CN-PM-3B')]);
  ok('competitor ball hone has no UFIBER equivalent', X('BD-10M').status === 'none');
  ok('maker CB31M-01550 → UF1615', sku('CB31M-01550') === 'UF1615' && X('CB31M-01550').status === 'direct');
  ok('unknown code is reported, not guessed', X('ZZ-123').status === 'unknown' && !X('ZZ-123').uf);
  // finding codes in a customer's text
  const found = E.xFind('Hi, we use competitor A21-CB25M and CH-A33-7M on 4140, also competitor CN-A12-5M. A floating holder and a stone are on the bench. Ø25 brush, S25M sleeve.');
  ok('codes in an email are found, words are not', JSON.stringify(found) === JSON.stringify(['A21-CB25M', 'CH-A33-7M', 'CN-A12-5M', 'S25M']), found);
  ok('a plain size or grade is not taken for a code', E.xFind('Ø25 brush, 1.4301, #1000, 6000 rpm, M6x1').length === 0);
  ok('the compact form carries the SKU for the AI', E.xCompact(X('CN-CB25MS')).ufiber_sku === 'UF1725');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
