/* ============================================================
   UFIBER Guide — data + recommendation engine
   Sources: UFIBER Catalogue (CA..07/26), noga.com UFIBER Technical
   Center (surface / cross-hole / disc pages, Sep–Oct 2026),
   UFIBER case-study workbook. Values marked EST are engineering
   estimates where NOGA has not published a number — replace them
   when official data is available.
   ============================================================ */

const GRITS = [
  { code: 'G', grit: 150,  color: 'Green',        hex: '#93D29B', i: 1, action: 'Very aggressive' },
  { code: 'P', grit: 200,  color: 'Pink',         hex: '#EF836B', i: 2, action: 'Aggressive' },
  { code: 'V', grit: 400,  color: 'Violet',       hex: '#97728F', i: 3, action: 'Medium-coarse' },
  { code: 'O', grit: 600,  color: 'Orange',       hex: '#F79158', i: 4, action: 'General deburring' },
  { code: 'B', grit: 800,  color: 'Blue',         hex: '#2FAB9F', i: 5, action: 'Fine deburring' },
  { code: 'W', grit: 1000, color: 'White',        hex: '#E5C295', i: 6, action: 'Fine finishing' },
  { code: 'R', grit: 1200, color: 'Red',          hex: '#F04D80', i: 7, action: 'Fine polishing' },
  { code: 'M', grit: 2000, color: 'Dark green',   hex: '#9A8859', i: 8, action: 'Very fine' },
  { code: 'Z', grit: 3000, color: 'Dark pink',    hex: '#C94788', i: 9, action: 'Ultra-fine' },
  { code: 'A', grit: 6000, color: 'Light violet', hex: '#B99DCE', i: 0, action: 'Micro-finish' },
];
const G = g => GRITS.find(x => x.grit === g);
const gritStep = (g, n) => { const k = GRITS.findIndex(x => x.grit === g); return GRITS[Math.max(0, Math.min(GRITS.length - 1, k + n))].grit; };

const STONE_GRITS = [
  { code: 'B', grit: 200, color: 'Black',        hex: '#2A2A2A', i: 1, use: 'Heavy removal / EDM scale' },
  { code: 'S', grit: 400, color: 'Silver',       hex: '#B9C0C6', i: 2, use: 'Pre-finishing' },
  { code: 'F', grit: 600, color: 'Forest green', hex: '#2F5E3A', i: 3, use: 'Fine finishing' },
  { code: 'G', grit: 800, color: 'Green',        hex: '#4CAF50', i: 4, use: 'Precision polishing / lapping' },
];

/* ---------- Product families ---------- */
const SURFACE = {
  6:   { dd: '06', dc: 'D006', L: 30, rpm: [9000, 12000], sleeve: ['UF5506', 'UF-FS-6-C06-L70'],    ds: 6,  shanks: [] },
  15:  { dd: '15', dc: 'D015', L: 50, rpm: [5700, 7200],  sleeve: ['UF5515', 'UF-FS-15-C06-L90'],   ds: 6,  shanks: [['UF5001', 'UF-S-L045-DS06-C06', 'Ø6 chuck']] },
  25:  { dd: '25', dc: 'D025', L: 75, rpm: [5000, 6000],  sleeve: ['UF5525', 'UF-FS-25-C10-L140'],  ds: 10, shanks: [['UF5003', 'UF-S-L050-DS09-C10', 'Ø10 chuck'], ['UF5007', 'UF-S-L120-DS09-C10', 'Ø10 chuck, 120 mm reach'], ['UF5002', 'UF-S-L050-DS09-C06', 'Ø6 chuck']] },
  40:  { dd: '40', dc: 'D040', L: 75, rpm: [2700, 3600],  sleeve: ['UF5540', 'UF-FS-40-C12-L140'],  ds: 12, shanks: [['UF5004', 'UF-S-L050-DS12-C12', 'Ø12 chuck'], ['UF5008', 'UF-S-L120-DS12-C12', 'Ø12 chuck, 120 mm reach']] },
  60:  { dd: '60', dc: 'D060', L: 75, rpm: [1800, 2400],  sleeve: ['UF5560', 'UF-FS-60-C12-L145'],  ds: 12, shanks: [['UF5005', 'UF-S-L050-DS13-C12', 'Ø12 chuck']] },
  100: { dd: '00', dc: 'D100', L: 75, rpm: [1000, 1400],  sleeve: ['UF5500', 'UF-FS-100-C16-L155'], ds: 16, shanks: [['UF5006', 'UF-S-L050-DS16-C16', 'Ø16 chuck']] },
};
/* Speed ceilings that live outside the per-diameter tables. Named once so the
   engine and the facts handed to the AI cannot disagree about them. */
const MAX_RPM = { point: 12000, end: 12000, disc: 9000, discRun: [6000, 8000], stone: 60000, stoneTypical: 30000, epack: 30000 };
const SURFACE_LIMITS = { docPolish: 0.2, docDeburr: 0.5, docMax: 1.2, feedMax: 2000, projMax: 10 };

const CROSS = {
  1.5: { dd: '15', dc: 'D015', ds: 3,  max: 20000, pilot: [3.5, 5],  pilotFine: [3.5, 5],  base: 10000, reach: 120 },
  3:   { dd: '30', dc: 'D030', ds: 3,  max: 14000, pilot: [5, 7],    pilotFine: [5, 7],    base: 9000,  reach: 130 },
  5:   { dd: '50', dc: 'D050', ds: 6,  max: 14000, pilot: [7, 9],    pilotFine: [8, 10],   base: 9000,  reach: 130 },
  7:   { dd: '70', dc: 'D070', ds: 6,  max: 14000, pilot: [9, 14],   pilotFine: [10, 20],  base: 8000,  reach: 130 },
  11:  { dd: '11', dc: 'D110', ds: 12, max: 14000, pilot: [14, 20],  pilotFine: null,      base: 7000,  reach: 180, grits: [600, 800, 1000] },
};
// base RPM = EST starting value per brush size (NOGA publishes an RPM calculator but not the table)

const POINT = { 1: '10', 1.5: '15', 2: '20', 2.5: '25', 3: '30' };
const DISC = { 13: '13', 19: '19', 22: '22', 25: '25', 30: '30' };
const DAMPER = {
  BT30: { 6: 'UF8853', 10: 'UF8854', 12: 'UF8855', 16: 'UF8856' },
  BT40: { 6: 'UF8857', 10: 'UF8858', 12: 'UF8859', 16: 'UF8860' },
  END:  { 6: 'UF8851', 10: 'UF8852' },
};

function skuSurface(d, g) { const s = SURFACE[d], q = G(g); return { sku: 'UF1' + q.i + s.dd, desc: `UF-FB-${q.code}-${s.dc}-L${s.L}` }; }
function skuCross(d, g) { const c = CROSS[d], q = G(g); const L = (d === 1.5) ? 50 : (d === 11 ? 60 : (g <= 1000 ? 60 : 50)); return { sku: 'UF2' + q.i + c.dd, desc: `UF-CH-${q.code}-${c.dc}-L${L}` }; }
function skuPoint(d, g) { const q = G(g); return { sku: 'UF3' + q.i + POINT[d], desc: `UF-PB-${q.code}-D${d}-L20` }; }
function skuEnd(g, angled) { const q = G(g); return angled ? { sku: 'UF6' + q.i + '50', desc: `UF-EB45-${q.code}-D5-L20` } : { sku: 'UF4' + q.i + '50', desc: `UF-EB-${q.code}-D5-L20` }; }
/* Items that are not brushes. Verified against the NOGA MT catalogue and the
   ceramic fiber disc page. The decoder checks these before anything else, so a
   holder is never mistaken for a brush. */
const ACCESSORIES = {
  UF5506: ['Face sleeve for Ø6 surface brush', 'UF-FS-6-C06-L70', 'Ø6 collet · sets projection, 10 mm max'],
  UF5515: ['Face sleeve for Ø15 surface brush', 'UF-FS-15-C06-L90', 'Ø6 collet'],
  UF5525: ['Face sleeve for Ø25 surface brush', 'UF-FS-25-C10-L140', 'Ø10 collet'],
  UF5540: ['Face sleeve for Ø40 surface brush', 'UF-FS-40-C12-L140', 'Ø12 collet'],
  UF5560: ['Face sleeve for Ø60 surface brush', 'UF-FS-60-C12-L145', 'Ø12 collet'],
  UF5500: ['Face sleeve for Ø100 surface brush', 'UF-FS-100-C16-L155', 'Ø16 collet'],
  UF5001: ['Shank for Ø15 surface brush', 'UF-S-L045-DS06-C06', 'Ø6 connection · L 45 mm · bore work, no sleeve'],
  UF5002: ['Shank for Ø25 surface brush', 'UF-S-L050-DS09-C06', 'Ø6 connection · L 50 mm'],
  UF5003: ['Shank for Ø25 surface brush', 'UF-S-L050-DS09-C10', 'Ø10 connection · L 50 mm'],
  UF5004: ['Shank for Ø40 surface brush', 'UF-S-L050-DS12-C12', 'Ø12 connection · L 50 mm'],
  UF5005: ['Shank for Ø60 surface brush', 'UF-S-L050-DS13-C12', 'Ø12 connection · L 50 mm'],
  UF5006: ['Shank for Ø100 surface brush', 'UF-S-L050-DS16-C16', 'Ø16 connection · L 50 mm'],
  UF5007: ['Long-reach shank for Ø25 surface brush', 'UF-S-L120-DS09-C10', 'Ø10 connection · L 120 mm'],
  UF5008: ['Long-reach shank for Ø40 surface brush', 'UF-S-L120-DS12-C12', 'Ø12 connection · L 120 mm'],
  UF7023: ['Clamping shank for ceramic fiber disc', 'UF-DA-016-C023-L45', 'Ø2.35 shank · M1.6×0.35 screw and washer'],
  UF7030: ['Clamping shank for ceramic fiber disc', 'UF-DA-016-C030-L45', 'Ø3 shank · M1.6×0.35 screw and washer'],
  UF8851: ['Floating damper, end type', 'UF-FD-DS06-C06', 'Ø6 tool · 4 mm float · about 20 N · 12,000 RPM max'],
  UF8852: ['Floating damper, end type', 'UF-FD-DS10-C10', 'Ø10 tool · 4 mm float · about 20 N · 12,000 RPM max'],
  UF8853: ['Floating damper, BT30', 'UF-FD-DS06-BT30', 'Ø6 tool · 5 mm float · about 50 N · 6,000 RPM max · ER25UM'],
  UF8854: ['Floating damper, BT30', 'UF-FD-DS10-BT30', 'Ø10 tool · 5 mm float · about 50 N · 6,000 RPM max · ER25UM'],
  UF8855: ['Floating damper, BT30', 'UF-FD-DS12-BT30', 'Ø12 tool · 5 mm float · about 50 N · 6,000 RPM max · ER25UM'],
  UF8856: ['Floating damper, BT30', 'UF-FD-DS16-BT30', 'Ø16 tool · 5 mm float · about 50 N · 6,000 RPM max · ER25UM'],
  UF8857: ['Floating damper, BT40', 'UF-FD-DS06-BT40', 'Ø6 tool · 5 mm float · about 50 N · 6,000 RPM max · ER32UM'],
  UF8858: ['Floating damper, BT40', 'UF-FD-DS10-BT40', 'Ø10 tool · 5 mm float · about 50 N · 6,000 RPM max · ER32UM'],
  UF8859: ['Floating damper, BT40', 'UF-FD-DS12-BT40', 'Ø12 tool · 5 mm float · about 50 N · 6,000 RPM max · ER32UM'],
  UF8860: ['Floating damper, BT40', 'UF-FD-DS16-BT40', 'Ø16 tool · 5 mm float · about 50 N · 6,000 RPM max · ER32UM'],
  UF9999: ['Portable E-Pack', 'UF-EP-9999', 'Battery pack and handpiece · 30,000 RPM · 3.0 Ncm · End and Point brushes, discs and diamond stones only'],
};
const DISC_GRITS = [150, 200, 400, 600, 800, 1000];   // NOGA lists no finer disc
function discGrit(g) { return DISC_GRITS.includes(g) ? g : DISC_GRITS.reduce((b, x) => Math.abs(x - g) < Math.abs(b - g) ? x : b, 1000); }
function skuDisc(d, g) { const q = G(discGrit(g)); return { sku: 'UF7' + q.i + DISC[d], desc: `UF-GD-${q.code}-D0${d}-L008` }; }
function skuStone(d, g) { const q = STONE_GRITS.find(x => x.grit === g); const dd = { 1: '10', 1.5: '15', 2: '20', 2.5: '25', 3: '30' }[d]; let sku = 'UF9' + q.i + dd; if (d === 2 && (q.i === 3 || q.i === 4)) sku = 'UF9' + q.i + '21'; return { sku, desc: `UF-DS-${q.code}-D${d}-L20` }; }

/* ---------- Materials ---------- */
// pos: where the start RPM sits inside the catalogue window for a surface brush (0 = low end, 1 = high end)
// feed/doc/grit values condensed from the noga.com UFIBER Surface & Cross-Hole machining tables
const MATERIALS = {
  carbon:   { name: 'Carbon / alloy steel', iso: 'P', pos: 0.5,  vcDisc: [150, 250],
              subs: { annealed: 'Annealed / as-machined', treated: 'Quenched & tempered' },
              grit: { light: 800, medium: 600, heavy: 400 }, gritT: { light: 400, medium: 200, heavy: 150 },
              polish: [800, 1200], polishT: [400, 800, 1200],
              feedD: 1500, feedP: 1000, docD: 0.4, docP: 0.15, chFeed: 340, chFeedT: 290, coolant: 'Air or wet' },
  stainless:{ name: 'Stainless steel', iso: 'M', pos: 0.35, vcDisc: [100, 180],
              subs: { aust: '304 / 316 (austenitic, duplex)', mart: '420 / 17-4 (martensitic, ferritic)' },
              grit: { light: 800, medium: 600, heavy: 400 }, gritT: { light: 400, medium: 200, heavy: 150 },
              polish: [800, 1200], polishT: [400, 800, 1200],
              feedD: 1150, feedP: 900, docD: 0.3, docP: 0.12, chFeed: 300, chFeedT: 285, coolant: 'Wet recommended' },
  hardened: { name: 'Hardened / tool steel', iso: 'H', pos: 0.2, vcDisc: [50, 120],
              subs: { le55: 'Up to 55 HRC (incl. pre-hardened mold steel)', gt55: 'Above 55 HRC' },
              grit: { light: 400, medium: 200, heavy: 150 }, polish: [400, 800, 1000],
              feedD: 650, feedP: 500, docD: 0.2, docP: 0.1, chFeed: 300, coolant: 'Wet preferred' },
  castiron: { name: 'Cast iron', iso: 'K', pos: 0.5, vcDisc: [150, 300],
              subs: { grey: 'Grey / ferritic nodular', pearl: 'Pearlitic / hard grades' },
              grit: { light: 600, medium: 400, heavy: 200 }, gritT: { light: 400, medium: 200, heavy: 150 },
              polish: [600, 1000], polishT: [400, 800, 1000],
              feedD: 1250, feedP: 850, docD: 0.35, docP: 0.13, chFeed: 300, coolant: 'Air preferred' },
  aluminum: { name: 'Aluminum', iso: 'N', pos: 0.9, vcDisc: [200, 400],
              subs: { wrought: 'Wrought (6061, 7075…)', cast: 'Cast ≤12% Si (ADC12, A356…)', hisi: 'Cast >12% Si (390…)' },
              grit: { light: 1200, medium: 800, heavy: 600 }, gritHiSi: { light: 800, medium: 600, heavy: 600 },
              polish: [1200, 2000], polishHiSi: [1000, 1200],
              feedD: 1600, feedP: 1400, docD: 0.35, docP: 0.12, chFeed: 425, coolant: 'Wet or MQL' },
  brass:    { name: 'Brass / bronze', iso: 'N', pos: 0.8, vcDisc: [200, 350],
              grit: { light: 1200, medium: 800, heavy: 600 }, polish: [1200, 2000],
              feedD: 1400, feedP: 1200, docD: 0.3, docP: 0.12, chFeed: 375, coolant: 'Wet or MQL' },
  copper:   { name: 'Copper', iso: 'N', pos: 0.75, vcDisc: [200, 350],
              grit: { light: 1200, medium: 800, heavy: 600 }, polish: [1200, 2000],
              feedD: 1400, feedP: 1200, docD: 0.3, docP: 0.12, chFeed: 375, coolant: 'Wet or MQL' },
  titanium: { name: 'Titanium', iso: 'S', pos: 0.1, vcDisc: [60, 120],
              grit: { light: 400, medium: 200, heavy: 150 }, polish: [400, 800, 1000],
              feedD: 750, feedP: 600, docD: 0.2, docP: 0.1, chFeed: 250, coolant: 'Wet recommended' },
  hrsa:     { name: 'Inconel / heat-resistant alloy', iso: 'S', pos: 0.0, vcDisc: [60, 120],
              subs: { ni: 'Inconel, Hastelloy, Waspaloy', co: 'Cobalt-chrome (incl. medical CoCr)', fe: 'Fe-based heat-resistant' },
              grit: { light: 400, medium: 200, heavy: 150 }, polish: [400, 800, 1000],
              feedD: 650, feedP: 550, docD: 0.2, docP: 0.1, chFeed: 250, coolant: 'Wet recommended' },
  plastic:  { name: 'Plastics / composites', iso: 'N', pos: 0.0, rpmScale: 0.6, vcDisc: [150, 250],
              grit: { light: 3000, medium: 2000, heavy: 2000 }, polish: [3000, 6000],
              feedD: 1200, feedP: 1000, docD: 0.2, docP: 0.1, chFeed: 300, coolant: 'Dry air with extraction' },
  carbide:  { name: 'Carbide / ceramic / glass', iso: 'H', pos: 0, vcDisc: [40, 100],
              grit: { light: 400, medium: 200, heavy: 150 }, polish: [400, 800],
              feedD: 300, feedP: 300, docD: 0.05, docP: 0.03, chFeed: 250, coolant: 'Wet preferred' },
  other:    { name: 'Other / not sure', iso: '?', pos: 0.4, vcDisc: [100, 180],
              grit: { light: 800, medium: 600, heavy: 400 }, polish: [800, 1200],
              feedD: 1000, feedP: 800, docD: 0.3, docP: 0.12, chFeed: 300, coolant: 'Wet recommended' },
};

const TASKS = {
  deburr_mill: { name: 'Remove burrs after milling', short: 'Deburr edges', mode: 'deburr' },
  deburr_drill:{ name: 'Remove burrs at drilled holes', short: 'Hole-edge burrs', mode: 'deburr', feature: 'hole' },
  crosshole:   { name: 'Deburr a cross-hole intersection', short: 'Cross-hole', mode: 'deburr', feature: 'cross' },
  edge:        { name: 'Break or round an edge', short: 'Edge break', mode: 'deburr' },
  marks:       { name: 'Remove tool marks / improve Ra', short: 'Tool marks', mode: 'polish' },
  polish:      { name: 'Polish a surface', short: 'Polishing', mode: 'polish' },
  id_finish:   { name: 'Finish an internal bore', short: 'Bore finish', mode: 'polish', feature: 'bore' },
  hard:        { name: 'Finish carbide, hardened steel or EDM surfaces', short: 'Hard / EDM', mode: 'polish' },
};
const FEATURES = {
  face:   'Flat surface / face',
  edge:   'External edge or contour',
  hole:   'Hole edge on a face',
  cross:  'Cross hole / intersecting bore',
  bore:   'Internal bore (ID)',
  groove: 'Groove, slot or pocket',
  radius: 'Radius or curved surface',
  small:  'Small precision feature',
  thread: 'Thread',
};
const MACHINES = {
  mc:     'CNC machining center',
  lathe:  'CNC lathe with live tooling',
  lathe0: 'CNC lathe without live tooling',
  dedicated: 'Dedicated / special-purpose machine',
  air:    'Air-powered hand tool',
  swiss:  'Swiss-type machine',
  robot:  'Robot',
  hand:   'Hand tool / E-Pack',
};

/* ---------- helpers ---------- */
const round = (v, step) => parseFloat((Math.round(v / step) * step).toFixed(3));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const nearestUp = (arr, v) => arr.find(x => x >= v) ?? arr[arr.length - 1];

function materialGrit(st) {
  const m = MATERIALS[st.material] || MATERIALS.other;
  const burr = st.burr || 'light';
  let table = m.grit;
  if ((st.material === 'carbon' && st.sub === 'treated') || (st.material === 'stainless' && st.sub === 'mart') || (st.material === 'castiron' && st.sub === 'pearl')) table = m.gritT || table;
  if (st.material === 'aluminum' && st.sub === 'hisi') table = m.gritHiSi;
  let polish = m.polish;
  if ((st.material === 'carbon' && st.sub === 'treated') || (st.material === 'stainless' && st.sub === 'mart') || (st.material === 'castiron' && st.sub === 'pearl')) polish = m.polishT || polish;
  if (st.material === 'aluminum' && st.sub === 'hisi') polish = m.polishHiSi;
  return { deburr: table[burr], polish, table };
}

/* ============================================================
   recommend(state) → recommendation object
   ============================================================ */
function recommend(st) {
  const task = TASKS[st.task] || TASKS.deburr_mill;
  const mode = task.mode;
  const feature = task.feature || st.feature || 'edge';
  const mat = MATERIALS[st.material] || MATERIALS.other;
  const machine0 = st.machine?.type || 'mc';
  const machine = machine0 === 'air' ? 'hand' : machine0 === 'dedicated' ? 'mc' : machine0;
  const airTool = machine0 === 'air';
  const maxRpm = Number(st.machine?.maxRpm) || null;
  const d = st.dims || {};
  const burr = st.burr || 'light';
  const ov = st.override || {};
  const R = { warnings: [], notes: [], holders: [], alts: [], why: [], watch: [], steps: [], conf: { level: 'high', reasons: [] }, inputs: { task: st.task, feature, material: st.material, mode } };
  const lower = (lvl, why) => { const order = { high: 3, medium: 2, low: 1 }; if (order[lvl] < order[R.conf.level]) R.conf.level = lvl; R.conf.reasons.push(why); };
  R.lower = lower;
  const gsel = materialGrit(st);

  /* ---- hard blockers / out-of-scope signals ---- */
  if (machine === 'lathe0') R.warnings.push({ t: 'This needs a rotating tool', d: 'UFIBER brushes cut only while they spin. On a lathe without live tooling, use a driven tool station, a dedicated spindle, or deburr off-line with the E-Pack.' });
  if (burr === 'heavy' && st.burrMm) {
    const x = st.burrMm / 0.2;
    R.warnings.push({ t: `A ${fmtMm(st.burrMm)} mm burr is too large for brushing alone`, d: `Ceramic fiber is built for small burrs, roughly ≤0.2 mm at the root${x >= 1.5 ? ` — this one is about ${Math.round(x)}× that` : ''}. Brushing it as it is will wear the brush fast and leave the burr folded over instead of removed. Remove most of it first (pre-machining, a back-chamfer or a deburring cutter such as NOGA UBURR), then use the brush for the final edge. If nothing else fits, test on one part and check the edge and brush wear before running a batch.` });
    lower('low', `Burr height ${fmtMm(st.burrMm)} mm is above the ~0.2 mm brushes are built for.`);
  } else if (burr === 'heavy') R.warnings.push({ t: 'Large burr — check first', d: 'Ceramic fiber is built for small burrs (roughly ≤0.2 mm root, the kind you can bend with a fingernail). If yours is thicker, remove most of it with a chamfer cutter or NOGA UBURR first, then brush.' });

  /* ---- family selection ---- */
  let fam;
  if (st.task === 'hard' || st.material === 'carbide' || (st.material === 'hardened' && st.sub === 'gt55' && mode === 'polish')) fam = 'diamond';
  else if (feature === 'cross' || feature === 'bore') fam = 'crossOrShank';
  else if (feature === 'groove') fam = 'groove';
  else if (feature === 'small') fam = 'small';
  else fam = 'surface';
  if (machine === 'hand') {
    if (fam === 'surface') { fam = 'end'; R.notes.push('Surface and cross-hole brushes need controlled RPM and depth on a machine. By hand, use End or Point brushes on the UFIBER E-Pack.'); }
    if (fam === 'crossOrShank') { fam = 'small'; lower('low', 'Hand-held cross-hole work is operator-dependent.'); }
  }
  if (ov.family) fam = ov.family;
  if (airTool && fam !== 'diamond') R.warnings.push({ t: 'Air-powered tool', d: 'NOGA does not recommend pneumatic-powered hand tools for UFIBER End brushes, Point brushes or discs because the speed is not controlled. Use an electric handpiece such as the E-Pack. Ceramic Diamond Stones are the exception: they suit pneumatic tools at controlled high speed.' });

  /* ======================================================
     CROSS HOLE / INTERNAL BORE
     ====================================================== */
  if (fam === 'crossOrShank' || fam === 'crosshole' || fam === 'shank') {
    const main = Number(d.main) || null, cross = Number(d.cross) || null;
    let grit = mode === 'polish' ? gsel.polish[0] : gsel.deburr;
    if (feature === 'cross' && mode === 'deburr' && burr === 'light' && ['aluminum', 'brass', 'copper'].includes(st.material)) grit = 1200;
    if (ov.grit) grit = ov.grit;
    if (!main) { R.warnings.push({ t: 'Bore diameter needed', d: 'Brush size is chosen from the bore you insert into. Showing a mid-size Ø5 brush until you enter it.' }); lower('medium', 'Bore diameter not given.'); }
    if (feature === 'cross' && main && cross) {
      if (cross >= main) R.warnings.push({ t: 'Insert from the larger bore', d: `The brush must enter the main (larger) bore. Your cross hole (Ø${cross}) is not smaller than the bore (Ø${main}) — swap them, or if they are equal, a cross-hole brush is not the right tool; ask NOGA about UBURR.` });
      else if (cross > 0.7 * main) {
        const pct = Math.round(cross / main * 100);
        if (st.through) {
          R.warnings.push({ t: `Through cross hole is ${pct}% of the bore`, d: `When the cross hole goes through both walls, NOGA keeps it at or below 70% of the main bore. Above that the expanded fibers flare out into both openings and can catch the far edge, which breaks fibers. Start at the low end of the RPM window, keep the feed steady through the intersection, and check the brush after the first part.` });
          lower('medium', 'Through cross hole above NOGA\'s 70% limit.');
        } else R.notes.push(`Cross hole is ${pct}% of the main bore. That's fine for a T-junction (one side only). If it goes through both walls, NOGA's limit is 70%.`);
      }
    }
    // choose size
    let size = null, shank = false;
    if (ov.dia) { if (CROSS[ov.dia]) size = ov.dia; else { shank = true; size = ov.dia; } }
    else if (!main) size = 5;
    else if (main < 3.5) { size = main >= 2.5 ? 1.5 : null; }
    else if (main > 20) { shank = true; const f = sfShankFits(main, ov.grit || 1200); size = f.length ? f[f.length - 1].d : 15; }
    else {
      const fine = grit >= 1200;
      const fits = Object.keys(CROSS).map(Number).filter(k => { const c = CROSS[k]; const r = fine ? c.pilotFine : c.pilot; return r && main >= r[0] && main <= r[1] && (!c.grits || c.grits.includes(grit)); });
      size = fits.length ? fits[fits.length - 1] : null;
      if (!size) { // try neighbouring grit availability
        const any = Object.keys(CROSS).map(Number).filter(k => { const c = CROSS[k]; return main >= c.pilot[0] && main <= c.pilot[1]; });
        size = any.length ? any[any.length - 1] : 7;
        if (CROSS[size].grits && !CROSS[size].grits.includes(grit)) { R.notes.push(`Ø11 cross-hole brushes come in #600, #800 and #1000 only — grit adjusted.`); grit = nearestUp(CROSS[size].grits, Math.min(grit, 1000)); }
        else if (grit >= 1200 && !(main >= CROSS[size].pilotFine?.[0] && main <= CROSS[size].pilotFine?.[1])) { R.notes.push(`For a Ø${main} bore the fine-grit (#1200+) brushes don't fit this size range, so a #1000 version is used.`); grit = 1000; }
      }
    }
    if (main && main >= 2.5 && main < 3.5 && size === 1.5) {
      R.warnings.push({ t: 'Bore below the standard Ø3.5 mm range', d: 'The catalogue range for the Ø1.5 cross-hole brush starts at Ø3.5 mm. NOGA\'s own 17-4 PH case study ran this brush in a Ø2.6 mm hole (7,000 RPM, 100 mm/min, dry), so it is used here with that case as the reference. Run a test part and ask NOGA to confirm. A field trial in a Ø3.1 mm bore in L605 cobalt alloy on a sliding-head lathe did not clear the burr with a Ø1.5 #600 brush at 6,000 RPM and about 120 mm/min, and a Ø3 brush broke on entry: reach the full RPM, use #400 or coarser in hard alloys, and never put a Ø3 brush into a bore of about Ø3.' });
      lower('medium', 'Bore is below the catalogue range; based on one NOGA case study.');
    }
    if (main && main < 2.5 && !ov.dia) {
      R.warnings.push({ t: 'Bore below Ø2.5 mm', d: 'No cross-hole brush fits a bore this small. Try a Point brush (Ø1–3) from the open side, or contact NOGA for a custom solution.' });
      lower('low', 'Bore smaller than the cross-hole range.');
      return finishPoint(R, st, Math.min(3, Math.max(1, Math.floor(main * 2) / 2 - 0.5)), grit, mat, mode, machine, maxRpm);
    }
    if (shank) return finishShank(R, st, size, grit, mat, mode, machine, maxRpm, main, cross);
    return finishCross(R, st, size, grit, mat, mode, machine, maxRpm, main, cross, feature);
  }

  /* ======================================================
     DIAMOND STONE
     ====================================================== */
  if (fam === 'diamond') {
    const w = Number(d.width) || Number(d.groove) || 3;
    const size = [1, 1.5, 2, 2.5, 3].filter(x => x <= w).pop() || 1;
    let g = ov.grit && [200, 400, 600, 800].includes(ov.grit) ? ov.grit : (mode === 'deburr' || burr === 'heavy' ? 200 : (st.task === 'hard' && /edm/i.test(st.note || '') ? 200 : 400));
    const s = skuStone(size, g), sg = STONE_GRITS.find(x => x.grit === g);
    R.family = 'diamond'; R.familyName = 'Ceramic Diamond Stone (point type)'; R.dia = size; R.grit = { grit: g, color: sg.color, hex: sg.hex, code: sg.code }; R.sku = s.sku; R.desc = s.desc;
    R.holders.push(airTool ? { role: 'Drive', sku: '—', desc: 'Pneumatic high-speed handpiece with Ø3 mm collet (controlled speed, no runout)' } : machine === 'hand' ? { role: 'Drive', sku: 'UF9999', desc: 'Portable E-Pack (30,000 RPM max)' } : { role: 'Holder', sku: '—', desc: 'Ø3 mm shank collet (electric spindle / high-speed attachment). Grip at least 20 mm.' });
    const rpm = clamp(maxRpm || 30000, 1000, 30000);
    R.params = { rpm, rpmLo: 30000, rpmHi: 30000, rpmMax: 60000, feed: null, feedNote: 'Not prescribed by NOGA — tune on the part', engage: { label: 'Contact force', value: '≈1 N', unit: '', note: 'Keep the applied force below 5 N.' }, passes: g === 200 ? '1–2 then step to #400' : '2–3', direction: 'Keep moving; do not dwell', projection: null, coolant: 'Not specified by NOGA' };
    R.params.sequence = g === 200 ? [200, 400, 600, 800] : [400, 600, 800];
    R.dataChecks = ['NOGA\'s product tables list 30,000 RPM as the minimum spindle speed for every stone size, while its FAQ says no minimum is specified and that up to 30,000 RPM is sufficient for most work. The app starts at 30,000 RPM, which satisfies both.'];
    if (maxRpm && maxRpm < 30000) R.warnings.push({ t: 'Below NOGA\'s tabulated speed', d: `Your ${maxRpm.toLocaleString()} RPM limit is under the 30,000 RPM NOGA lists as the minimum for these stones. The stone will cut more slowly; expect longer process time.` });
    R.steps = ['Do a test run off the part first: stop if you see runout, vibration or anything abnormal.', 'Dress the stone tip to the feature shape with a diamond tool if needed.', 'Start rotation off the part, then touch on with light pressure — about 1 N, never more than 5 N.', 'Keep the stone moving along the feature — dwelling burns the surface and glazes the stone.', `Work through the grits in order: ${R.params.sequence.map(x => '#' + x).join(' → ')}.`, 'NOGA gives no fixed feed or depth: adjust feed, contact and process time on the real material and finish.'];
    R.why = [
      { t: 'Why a diamond stone', d: 'Tungsten carbide, hardened steels, ceramics, glass and EDM surfaces are too hard for ceramic fiber alone. Diamond abrasive in a ceramic-fiber body cuts them and keeps exposing fresh abrasive.' },
      { t: `Why Ø${size}`, d: `The largest standard stone that fits your feature width (${w} mm).` },
      { t: `Why #${g} (${sg.color.toLowerCase()})`, d: sg.use + '. Step to finer stones for the final finish. The grit number is the diamond grain size.' },
      { t: 'Why these speeds', d: 'NOGA: 60,000 RPM is the maximum; up to 30,000 RPM is enough for most applications because of the high grinding performance. Target contact force is about 1 N, with a hard limit of 5 N.' },
    ];
    R.watch = ['Never exceed 60,000 RPM.', 'Keep contact force below 5 N (aim for about 1 N).', 'Confirm runout and vibration with a test run before touching the part.', 'The bond is epoxy resin; a harder bond is not available.', 'Wear eye protection; stone fragments can eject.'];
    R.alts.push({ label: 'Point brush for softer areas', note: 'Where the material is below ~55 HRC, a Point brush is gentler on edges.', ov: { family: 'small' } });
    R.diagram = 'point';
    return finalize(R, st);
  }

  /* ======================================================
     GROOVE / SLOT
     ====================================================== */
  if (fam === 'groove' || fam === 'disc') {
    const w = Number(d.groove) || Number(d.width) || null;
    let grit = mode === 'polish' ? gsel.polish[0] : gsel.deburr;
    if (ov.grit) grit = ov.grit;
    if (fam === 'disc' || (w && w < 1.2)) return finishDisc(R, st, grit, mat, mode, machine, maxRpm);
    if (!w) { lower('medium', 'Groove width not given — assumed 6 mm or wider.'); }
    if (!w || w >= 6.5) return finishSurface(R, st, 6, grit, mat, mode, machine, maxRpm, { groove: w });
    if (w >= 5.5) return finishEnd(R, st, grit, mat, mode, machine, maxRpm, false, { groove: w });
    const size = [1, 1.5, 2, 2.5, 3].filter(x => x <= w - 0.3).pop() || 1;
    return finishPoint(R, st, size, grit, mat, mode, machine, maxRpm, { groove: w });
  }

  /* ======================================================
     SMALL FEATURE / END / POINT
     ====================================================== */
  if (fam === 'small' || fam === 'end' || fam === 'endAngled' || fam === 'point') {
    let grit = mode === 'polish' ? gsel.polish[0] : gsel.deburr;
    if (ov.grit) grit = ov.grit;
    const w = Number(d.width) || null;
    if (fam === 'point' || (fam === 'small' && w && w < 5)) {
      const size = ov.dia && POINT[ov.dia] ? ov.dia : ([1, 1.5, 2, 2.5, 3].filter(x => x <= (w || 3)).pop() || 1);
      return finishPoint(R, st, size, grit, mat, mode, machine, maxRpm);
    }
    return finishEnd(R, st, grit, mat, mode, machine, maxRpm, fam === 'endAngled');
  }

  /* ======================================================
     SURFACE BRUSH (face, edge, hole edge, radius, thread)
     ====================================================== */
  let grit = mode === 'polish' ? gsel.polish[0] : gsel.deburr;
  if (ov.grit) grit = ov.grit;
  const sizes = [6, 15, 25, 40, 60, 100];
  let dia;
  const W = Number(d.width) || null;
  if (ov.dia && SURFACE[ov.dia]) dia = ov.dia;
  else if (feature === 'hole') {
    const hole = Number(d.hole) || null;
    const span = W || (hole ? hole * 2 : null);
    dia = span ? nearestUp(sizes, Math.max(6, span * 1.5)) : 25;
    if (!span) lower('medium', 'Hole size not given — Ø25 assumed.');
  } else if (feature === 'radius' || feature === 'small') {
    dia = W && W > 10 ? 15 : 6;
  } else if (feature === 'thread') {
    dia = 25; lower('medium', 'Thread deburring depends heavily on thread form and access.');
  } else if (W) {
    dia = nearestUp(sizes, W * 1.5);
    if (W * 1.5 > 100) R.notes.push(`The surface is wider than one Ø100 pass can cover. Program parallel passes with ~30% overlap.`);
  } else {
    dia = feature === 'face' ? 40 : 25;
    if (feature !== 'edge') lower('medium', 'Surface width not given — size assumed.');
  }
  // machine RPM check: if the machine can't reach the low end of the window, step to a larger diameter where geometry allows
  if (maxRpm && !ov.dia) {
    let k = sizes.indexOf(dia);
    while (k < sizes.length - 1 && maxRpm < SURFACE[sizes[k]].rpm[0] * 0.8 && ['face', 'edge', 'hole'].includes(feature)) k++;
    if (sizes[k] !== dia) { R.notes.push(`Your spindle tops out at ${maxRpm.toLocaleString()} RPM, below what a Ø${dia} brush needs. Switched to Ø${sizes[k]}, which runs slower.`); dia = sizes[k]; }
  }
  return finishSurface(R, st, dia, grit, mat, mode, machine, maxRpm, { feature, W });
}

/* ---------------- finishers ---------------- */
function finishSurface(R, st, dia, grit, mat, mode, machine, maxRpm, ctx = {}) {
  const S = SURFACE[dia];
  const q = G(grit);
  const k = skuSurface(dia, grit);
  const burr = st.burr || 'light';
  R.family = 'surface'; R.familyName = 'Surface Brush'; R.dia = dia; R.grit = q; R.sku = k.sku; R.desc = k.desc;
  // holders
  const robot = machine === 'robot';
  const damper = robot || st.machine?.uneven;
  R.holders.push({ role: 'Sleeve', sku: S.sleeve[0], desc: `${S.sleeve[1]} — sets projection, Ø${S.ds} shank` });
  // RPM
  const row = sfRowOf(st); R.sfRow = row.id;
  const SFp = sfSurface({ row, dia, grit, mode });
  // a brush wider than the surface covers it in one path and wears evenly
  const face = Number(st.dims?.width) || 0;
  if (face > 0) {
    const want = [Math.round(face * 1.5), Math.round(face * 2)];
    if (dia < face * 1.5) R.notes.push(`A brush about ${want[0]}\u2013${want[1]} mm wide would cover a ${face} mm surface in one path. Ø${dia} will need overlapping passes, and the overlap is where uneven wear starts.`);
  }
  R.dataChecks = SFp.checks.filter(c => !c.startsWith("NOGA's material table"));
  let [lo, hi] = SF_SURF_WIN[dia];
  let rpm = SFp.rpm;
  if (maxRpm && rpm > maxRpm) { R.warnings.push({ t: 'Spindle below recommended speed', d: `Running at your ${maxRpm.toLocaleString()} RPM limit instead of ${rpm.toLocaleString()}. Compensate with one grit coarser or an extra pass.` }); rpm = maxRpm; }
  // feed, DOC
  let feed = SFp.feedRange[0];
  const dr = SFp.engRange; let doc = dr[0];
  if (mode === 'deburr') { if (burr === 'medium') doc = (dr[0] + dr[1]) / 2; if (burr === 'heavy') doc = dr[1]; }
  if (st.task === 'edge') { doc = Math.max(doc, 0.4); }
  doc = Math.min(round(doc, 0.01), SURFACE_LIMITS.docMax);
  feed = Math.min(feed, SURFACE_LIMITS.feedMax);
  let passes = mode === 'polish' ? (st.task === 'marks' ? '2–3' : '3') : (burr === 'light' ? '1–2' : burr === 'medium' ? '2' : '2–3');
  const seq = mode === 'polish' ? materialGrit(st).polish : null;
  const vc = Math.round(Math.PI * dia * rpm / 1000);
  R.params = {
    rpm, rpmLo: lo, rpmHi: hi, rpmMax: hi, vc, feed, feedMax: SURFACE_LIMITS.feedMax,
    engage: { label: 'Depth of cut', value: doc, unit: 'mm', max: SURFACE_LIMITS.docMax, note: `NOGA table ${dr[0]}–${dr[1]} mm for this material · 1.2 mm absolute max` },
    feedRange: SFp.feedRange,
    passes, direction: mode === 'deburr' ? 'Up-cut against the burr' : 'Either; alternate between passes',
    projection: `${SURFACE_LIMITS.projMax} mm (max) from the sleeve`, coolant: mat.coolant, sequence: seq && seq.length > 1 ? seq : null,
  };
  if (damper) {
    const iface = st.machine?.iface;
    if (robot || !iface || iface === 'other') {
      if (DAMPER.END[S.ds]) R.holders.push({ role: 'Floating damper', sku: DAMPER.END[S.ds], desc: `UF-FD-DS${String(S.ds).padStart(2, '0')} end type · 4 mm float · ~20 N · 12,000 RPM max` });
      else R.notes.push(`End-type floating dampers fit Ø6 and Ø10 shanks. This brush's sleeve has a Ø${S.ds} shank, so for a robot ask NOGA for a matching compliant holder or use a smaller brush.`);
    } else {
      R.holders.push({ role: 'Floating damper', sku: DAMPER[iface][S.ds], desc: `UF-FD-DS${String(S.ds).padStart(2, '0')}-${iface} · 5 mm float · ~50 N · 6,000 RPM max` });
      if (rpm > 6000) R.warnings.push({ t: 'Damper speed limit', d: 'BT floating dampers are rated to 6,000 RPM. Keep the spindle at or below 6,000.' });
    }
    R.params.engage = { label: 'Damper compression', value: 2, unit: 'mm', max: 5, note: 'NOGA gives no fixed value: preload the spring before feeding, within the float range (5 mm BT, 4 mm end-type). The 2 mm start is an estimate; reference cases ran 3–4 mm.' };
    R.notes.push('Floating damper: approach vertically (or with an arc entry and exit, "ramping", for smoother edges), preload before feeding, never drop into pockets or touch protruding features, and keep side loads off the brush. No through-spindle coolant. After long use the spring weakens, so check that it floats freely. BT30 holders take an ER25UM collet and BT40 an ER32UM (runout ≤5 µm).');
  }
  // steps
  const isEdge = ['edge', 'hole', 'thread'].includes(ctx.feature) || st.task === 'edge' || st.task === 'deburr_mill' || st.task === 'deburr_drill';
  R.steps = [
    `Set brush projection to ${SURFACE_LIMITS.projMax} mm from the sleeve and touch off the length at the brush tip.`,
    'Start the spindle with the brush clear of the part.',
    ctx.groove ? 'Lower into the groove without rotation if the brush would hit a step, then start the spindle.' : `Approach from outside the part and ramp to depth (about 5°) instead of plunging straight down.`,
    isEdge ? `Run along the edge with the brush center ${dia >= 25 ? 'inboard of' : 'on'} the edge so fibers sweep across it — the brush cuts with its tip, not its side.` : `Cover the surface in parallel passes with ~30% overlap.`,
    mode === 'deburr' ? 'Choose the spindle direction so fibers hit the burr from underneath (up-cut). For burrs pushed into slots, run a second pass in the opposite direction.' : 'Alternate the path direction between passes for an even scratch pattern.',
    'Exit past the end of the feature before retracting.',
  ];
  if (seq && seq.length > 1) R.steps.push(`For finer Ra, repeat with the next grit: ${seq.map(x => '#' + x).join(' → ')}.`);
  // why
  const widthTxt = ctx.W ? `Your ${ctx.W} mm wide area × 1.5 rounds up to Ø${dia}` : (ctx.groove ? `Ø6 is the smallest surface brush and fits your groove` : `Ø${dia} is the most-tested size for this kind of feature`);
  R.why = [
    { t: 'Why a Surface brush', d: 'It cuts with the fiber tips, so it deburrs and polishes faces and edges with controlled depth on a CNC or robot — repeatable, unlike hand tools.' },
    { t: `Why Ø${dia}`, d: `${widthTxt}. A brush 1.5–2× the width meets the edge squarely for the most cutting power and fewest passes.` },
    { t: `Why #${grit} (${q.color.toLowerCase()})`, d: gritWhy(st, grit, mode) },
    { t: 'Which way to rotate', d: 'Up-cut matters most for burrs lying along the surface: the fiber tips lift them instead of folding them flat. For burrs standing up off the top face the rotation direction makes little difference.' },
    { t: 'Why these parameters', d: `Speed follows NOGA's RPM Advisor: the low end of the Ø${dia} window (${lo.toLocaleString()}–${hi.toLocaleString()} RPM), adjusted for grit #${grit}. Feed and depth start at the low end of NOGA's table for ${sfLabel(row).toLowerCase()} — raise them only if burrs remain.` },
  ];
  R.watch = [
    'Never cut with the side of the brush — side loading snaps fibers.',
    'Don\'t exceed 1.2 mm depth of cut; more depth bends fibers and wears them fast.',
    `Re-set projection back to ${SURFACE_LIMITS.projMax} mm as the brush wears; shorter fibers cut harder.`,
    mode === 'polish' ? 'More passes improves Ra more than slowing the feed.' : 'Burr thicker than a fingernail can bend? Remove it first with a cutter.',
  ];
  if (st.material === 'plastic') R.watch.unshift('Plastics can melt or discolor — keep RPM low and use air with extraction.');
  if (st.material === 'aluminum') R.watch.push('On diamond-machined aluminum, brushing can leave a slightly dull look.');
  // alternatives
  const coarser = gritStep(grit, -1), finer = gritStep(grit, 1);
  R.alts.push({ label: `One grit coarser — #${coarser}`, note: 'More cutting power if burrs remain. Expect more edge rounding.', ov: { grit: coarser, dia, family: 'surface' } });
  R.alts.push({ label: `One grit finer — #${finer}`, note: 'Smaller edge break and better finish if burrs come off easily.', ov: { grit: finer, dia, family: 'surface' } });
  const sizes = [6, 15, 25, 40, 60, 100], k2 = sizes.indexOf(dia);
  if (k2 < sizes.length - 1 && !ctx.groove) R.alts.push({ label: `Larger brush — Ø${sizes[k2 + 1]}`, note: 'Fewer passes and shorter cycle; needs more clearance.', ov: { dia: sizes[k2 + 1], grit, family: 'surface' } });
  if (machine !== 'robot' && !damper) R.alts.push({ label: 'Add a floating damper', note: 'For cast, uneven or long-run parts: constant pressure and automatic wear compensation.', ov: { grit, dia, family: 'surface' }, setUneven: true });
  if (ctx.feature === 'hole' || st.task === 'deburr_drill') R.alts.push({ label: 'NOGA UBURR for both hole edges', note: 'If the burr is on the back side of a through-hole or too large for a brush, UBURR deburrs front and back in one cycle.', ext: true });
  R.diagram = ctx.groove ? 'groove' : 'surface';
  return finalize(R, st);
}

/* Live tools on lathes are slower than machining-centre spindles. The figures are
   makers' published maxima for the end-working / driven-tool stations. */
const LIVE_TOOL = { typical: [6000, 8000], examples: '7,500 RPM max on a Citizen L20 front tool, 8,000 on a Star SR-20R IV, 6,000 on a Tornos Swiss GT 13' };
const isLathe = machine => machine === 'swiss' || machine === 'lathe';
/* Checks the live-tool speed against what the brush needs and returns the RPM to run. */
function liveToolSpeed(R, machine, maxRpm, need, what) {
  if (!isLathe(machine)) {
    if (maxRpm && need > maxRpm) { R.warnings.push({ t: 'Spindle below recommended speed', d: `The brush expands less at ${maxRpm.toLocaleString()} RPM. Use the larger brush size that fits the bore, add passes, or step one grit coarser.` }); return maxRpm; }
    return need;
  }
  const min = r100(need * 0.85);
  if (!maxRpm) {
    if (need > LIVE_TOOL.typical[0]) {
      R.warnings.push({ t: 'Check the live-tool speed', d: `${what} needs ${need.toLocaleString()} RPM. Live tools on sliding-head and turn-mill lathes are often limited to ${LIVE_TOOL.typical[0].toLocaleString()}–${LIVE_TOOL.typical[1].toLocaleString()} RPM (${LIVE_TOOL.examples}). Enter the station's maximum RPM under Machine. Below about ${min.toLocaleString()} RPM, fit a speed increaser on that station.` });
      R.lower('medium', 'Live-tool maximum RPM not given.');
    }
    return need;
  }
  if (maxRpm >= need) return need;
  if (maxRpm >= min) R.warnings.push({ t: 'Live tool slightly below the target speed', d: `Your live tool gives ${maxRpm.toLocaleString()} RPM, a little under the ${need.toLocaleString()} RPM ${what.toLowerCase()} needs. Run at ${maxRpm.toLocaleString()}, add a pass, and step one grit coarser if burrs remain.` });
  else { R.warnings.push({ t: 'Live tool too slow for this brush', d: `Your live tool gives ${maxRpm.toLocaleString()} RPM, more than 15% under the ${need.toLocaleString()} RPM ${what.toLowerCase()} needs. The fibers will not expand fully to the bore wall. Fit a speed increaser on the live-tool station (a 1:3 or 1:4 ratio covers it), or run the brush in a machine that reaches the speed.` }); R.lower('low', `Live tool ${maxRpm.toLocaleString()} RPM is well below the ${need.toLocaleString()} RPM the brush needs.`); }
  return maxRpm;
}

function finishCross(R, st, size, grit, mat, mode, machine, maxRpm, main, cross, feature) {
  const C = CROSS[size]; const q = G(grit); const k = skuCross(size, grit);
  const lathe = isLathe(machine);
  R.family = 'crosshole'; R.familyName = 'Cross-Hole Brush'; R.dia = size; R.grit = q; R.sku = k.sku; R.desc = k.desc;
  R.holders.push({ role: 'Holding', sku: '—', desc: lathe ? `Ø${C.ds} mm shank in the collet of an axial (end-working) live tool, on the bore axis. Grip at least 30 mm of shank and keep runout under 0.02 mm.` : `Ø${C.ds} mm shank in a collet or shrink chuck. Grip at least 30 mm of shank.` });
  const row = sfRowOf(st); R.sfRow = row.id;
  const SFc = sfCross({ row, bore: main || (r0 => (r0[0] + r0[1]) / 2)((grit >= 1200 && C.pilotFine) ? C.pilotFine : C.pilot), grit, mode, size });
  R.dataChecks = SFc.checks || [];
  const r = (grit >= 1200 && C.pilotFine) ? C.pilotFine : C.pilot;
  const below = SFc.method === 'small';
  const need = SFc.rpm || C.base;
  const rpm = liveToolSpeed(R, machine, maxRpm, need, `The Ø${size} cross-hole brush`);
  const feed = SFc.feedRange ? SFc.feedRange[0] : 300;
  const passes = String(SFc.passes || '2–3').replace('-', '–');
  const slotW = Number(st.dims?.slotW) || null, slotL = Number(st.dims?.slotL) || null;
  const span = Math.max(cross || 0, slotL || 0) || null;
  const stroke = span ? +(span + 10).toFixed(2) : null;
  const both = cross && slotL;
  R.params = {
    rpm, rpmLo: SFc.newRpm || rpm, rpmHi: Math.min(round((SFc.newRpm || rpm) * 1.25, 100), C.max), rpmMax: C.max, feed, feedRange: SFc.feedRange,
    engage: { label: 'Stroke', value: stroke ? stroke : 'Ø + 10', unit: 'mm', note: both ? `Axial travel past every opening: 5 mm before the first (cross hole or slot) to 5 mm past the last. ${stroke} mm covers them only if they sit at the same position along the bore; if not, add the distance between them. There is no depth of cut — the fibers expand outward by centrifugal force.` : stroke ? `Axial travel through the intersection: the ${span} mm ${cross ? 'cross hole' : 'slot'} plus 5 mm clear on each side. There is no depth of cut — the fibers expand outward by centrifugal force.` : 'Axial travel: the cross hole plus 5 mm clear on each side. No depth of cut — the fibers expand outward by centrifugal force.' },
    passes, direction: 'CW, then CCW (stop between)', projection: null, coolant: SFc.cool || mat.coolant,
  };
  const depth = Number(st.dims?.depth) || null;
  if (depth && depth > C.reach - 30 - (cross || 0) / 2) R.warnings.push({ t: 'Check reach', d: `The intersection is ${depth} mm deep. This brush is about ${C.reach} mm long overall and needs 30 mm of shank in the holder. Confirm reach in CAM, or ask NOGA about extended lengths.` });
  if (lathe) R.notes.push(`NOGA's machine list names machining centres, dedicated machines and robots for cross-hole brushes, not lathes. NOGA's own 17-4 PH case ran a Ø1.5 cross-hole brush on a Star SR-20 sliding-head lathe, so it works with the main spindle stopped and the brush in an axial live tool on the bore axis.`);
  if (slotW) R.notes.push(`The ${slotW}${slotL ? ` × ${slotL}` : ''} mm slot${st.through ? 's open' : ' opens'} into the bore as well. The same strokes deburr ${st.through ? 'them' : 'it'}, as long as each stroke runs 5 mm past every opening.`);
  const where = both ? 'the cross hole and slot' : slotW && !cross ? 'the slot' : 'the intersection';
  R.steps = [
    lathe ? `Stop the main spindle and lock it (C-axis clamp). Bring the axial live tool onto the ${main ? 'Ø' + main + ' ' : ''}bore axis.` : `Position above the ${main ? 'Ø' + main + ' ' : ''}main bore with the spindle stopped.`,
    `Insert the brush without rotation until its tip is 5 mm past the far side of ${both ? 'the last opening' : where}.`,
    `Start rotation (${rpm.toLocaleString()} RPM, clockwise) inside the bore.${lathe ? ` Program the feed in mm/min (G98), not mm/rev: ${feed} mm/min.` : ''}`,
    `Pull back through ${where} to 5 mm before ${both ? 'the first opening' : 'it'}${stroke ? ` (stroke ${stroke} mm${both ? ' or more' : ''})` : ''} — pulling back keeps burrs from being laid flat against the bore wall.`,
    `Push forward through ${where} to 5 mm past the ${both ? 'last opening' : 'far side'} — this pass takes the burrs pointing the other way.`,
    lathe ? 'Stop the live tool completely.' : 'Stop the spindle completely.',
    'Switch to counter-clockwise and repeat the pull-back and push-forward strokes.',
    'Stop rotation and withdraw the brush while stationary.',
  ];
  const sizeWhy = !main ? 'Mid-size default until the bore diameter is known.'
    : below ? `Ø${size} is the smallest cross-hole brush. Your Ø${main} bore is below its Ø${r[0]}–${r[1]} catalogue range, so this choice rests on NOGA's 17-4 PH case in a Ø2.6 mm hole rather than on the catalogue range.`
    : `Your Ø${main} bore is inside this brush's working range (Ø${r[0]}–${r[1]} for #${grit}). Larger bores need a larger brush to expand far enough.`;
  const speedWhy = below
    ? `RPM is scaled from NOGA's 17-4 PH case (7,000 RPM with #1000) by grit (#${grit} ×${SF_GRITX[grit] || 1}). The 100 mm/min feed also comes from that case, below the table's ${(mode === 'polish' ? row.C.feedP : row.C.feedD).join('–')} mm/min for bores in the catalogue range. Run both rotation directions so burrs are removed instead of bent over.`
    : `RPM follows NOGA's RPM Advisor formula: it rises with bore size inside the brush's range and with coarser grit (#${grit} ×${SF_GRITX[grit] || 1}). Feed is the low end of NOGA's cross-hole table for ${sfLabel(row).toLowerCase()}. Run both rotation directions so burrs are removed instead of bent over.`;
  R.why = [
    { t: 'Why a Cross-Hole brush', d: 'Spinning makes the fibers fan out and press into the bore wall, so they reach the burr at the intersection without a complex 3D toolpath.' },
    { t: `Why Ø${size}`, d: sizeWhy },
    { t: `Why #${grit} (${q.color.toLowerCase()})`, d: gritWhy(st, grit, mode) + (grit >= 1200 ? ' Fine grits are more flexible and expand more.' : '') },
    { t: 'Why this speed and feed', d: speedWhy },
  ];
  R.watch = [
    'Never start rotation outside the bore — fibers fly out and break.',
    'Always enter from the main (larger) bore. From the small hole the brush can\'t reach the burr.',
    'Keep the stroke past the intersection; fix results with passes, not shorter strokes.',
    'Not suited to off-center or steeply angled cross holes.',
  ];
  if (grit >= 1200) R.watch.push('#1200 and finer are more flexible and more likely to break if misused.');
  const coarser = gritStep(grit, -1), finer = gritStep(grit, 1);
  const okG = g => !C.grits || C.grits.includes(g);
  if (okG(coarser)) R.alts.push({ label: `One grit coarser — #${coarser}`, note: 'If burrs remain after extra passes. Needs slightly higher RPM to expand.', ov: { grit: coarser, dia: size, family: 'crosshole' } });
  if (okG(finer) && finer <= 6000) R.alts.push({ label: `One grit finer — #${finer}`, note: 'Less edge rounding, better internal finish.', ov: { grit: finer, dia: size, family: 'crosshole' } });
  if (main && main >= SF_SPREAD15.bore) R.alts.push({ label: 'Surface brush on a shank', note: `A Ø15 surface brush without its sleeve spreads by centrifugal force: at ${SF_SPREAD15.rpm.toLocaleString()} RPM it reaches Ø${SF_SPREAD15.mid} mid-length and deburred a Ø${SF_SPREAD15.bore} cross hole in maker's test.`, ov: { family: 'shank', dia: 15, grit: 1200 } });
  R.alts.push({ label: 'NOGA UBURR', note: 'If the burr is too heavy for a brush or the hole edges need a defined chamfer.', ext: true });
  R.diagram = 'crosshole';
  if (!main) R.lower('medium', 'RPM depends on the bore diameter — enter it for an exact value.');
  return finalize(R, st);
}

function finishShank(R, st, size, grit, mat, mode, machine, maxRpm, main, cross) {
  if (!SURFACE[size]) size = 25;
  if (!ov(st).grit) grit = Math.max(grit, 1000) === grit ? grit : 1200;
  if (!ov(st).grit && grit < 1000) grit = 1200;
  const S = SURFACE[size]; const q = G(grit); const k = skuSurface(size, grit);
  R.family = 'shank'; R.familyName = 'Surface Brush on shank (no sleeve)'; R.dia = size; R.grit = q; R.sku = k.sku; R.desc = k.desc;
  const deep = (Number(st.dims?.depth) || 0) > 40;
  const rowS = sfRowOf(st); const SFs = main ? sfShank({ row: rowS, bore: main, grit, mode, size, deep }) : null;
  const sh = SFs && SFs.shank ? SFs.shank : (S.shanks.find(s => deep ? s[2].includes('120') : !s[2].includes('120')) || S.shanks[0]);
  if (sh) R.holders.push({ role: 'Shank', sku: sh[0], desc: `${sh[1]} — ${sh[2]}` });
  if (SFs && SFs.clearance >= 1) R.notes.push(`The Ø${size} brush leaves about ${SFs.clearance} mm radial clearance in the Ø${main} bore. Use a circular-interpolated or offset toolpath so the fiber tips reach the cross-hole edge.`);
  const row = sfRowOf(st); R.sfRow = row.id;
  let rpm = sfSurface({ row, dia: size, grit, mode }).rpm;
  if (isLathe(machine)) rpm = liveToolSpeed(R, machine, maxRpm, rpm, `The Ø${size} surface brush on a shank`);
  else if (maxRpm && rpm > maxRpm) { rpm = maxRpm; R.warnings.push({ t: 'Lower spindle speed', d: 'The brush will expand less. Add passes or try #1000 for more bite.' }); }
  const stroke = cross ? cross + 10 : null;
  R.params = { rpm, rpmLo: S.rpm[0], rpmHi: S.rpm[1], rpmMax: S.rpm[1], feed: (mode === 'polish' ? row.C.feedP : row.C.feedD)[0], engage: { label: 'Stroke', value: stroke || 'Ø + 10', unit: 'mm', note: stroke ? `Axial travel through the intersection: the ${cross} mm cross hole plus 5 mm clear on each side. The fibers expand outward by centrifugal force, so there is no depth of cut.` : 'Axial travel: the cross hole plus 5 mm clear on each side. The fibers expand outward by centrifugal force, so there is no depth of cut.' }, passes: mode === 'polish' ? row.C.passP.replace('-', '–') : row.C.passD.replace('-', '–'), direction: 'CW, then CCW (stop between)', coolant: SF_COOL[row.C.cool] };
  R.steps = [
    `Remove the sleeve, mount the brush on the shank with its two set screws, and position above the ${main ? 'Ø' + main + ' ' : ''}bore with the spindle stopped.`,
    'Insert without rotation until the brush tip is 5 mm past the far side of the intersection.',
    `Start rotation (${rpm.toLocaleString()} RPM, clockwise) inside the bore.`,
    `Pull back through the intersection to 5 mm before it${stroke ? ` (stroke ${stroke} mm)` : ''}.`,
    'Push forward through the intersection to 5 mm past the far side.',
    'Stop the spindle completely.',
    'Switch to counter-clockwise and repeat the pull-back and push-forward strokes.',
    'Stop rotation completely, then withdraw the brush.',
  ];
  R.why = [
    { t: 'Why a surface brush on a shank', d: main && main <= 20 ? `Your Ø${main} bore is at the top of the cross-hole range (up to Ø20), where a Ø15 surface brush without its sleeve also works: it fans out by centrifugal force and reaches the bore wall.` : `Your Ø${main} bore is above the Ø20 cross-hole range. Without its sleeve, a surface brush fans out by centrifugal force and reaches the bore wall.` },
    { t: `Why Ø${size}`, d: `NOGA's surface-brush method uses the largest brush that fits the bore (Ø15 needs Ø19+ at #1000 and finer, Ø20+ when coarser; Ø25 needs Ø27–28+; Ø40/60/100 need at least their own diameter). Smaller brushes also work with an adapted toolpath.` },
    ...(size === 15 ? [{ t: 'How far a Ø15 spreads', d: sfSpread15Note(rpm) }] : []),
    { t: `Why #${grit}`, d: grit === 1200 ? 'NOGA recommends starting this method with #1200 — it is more flexible and expands more. If burrs remain, switch to #1000.' : grit > 1200 ? `#${grit} is finer than NOGA's #1200 starting grit for this method — gentler, for finishing rather than burr removal.` : `#${grit} cuts harder than NOGA's #1200 starting grit for this method. It is stiffer, so it expands a little less; use it when #1200/#1000 leave burrs.` },
    { t: 'Why this RPM', d: 'NOGA\'s RPM Advisor surface-brush method: low end of the brush window, adjusted for grit. Speed also controls how far the fibers spread — raise it gradually if the brush doesn\'t reach the burr.' },
  ];
  R.watch = ['Insert before starting rotation and stop before removing — same rule as cross-hole brushes.', '#1200 is more prone to fiber breakage than coarser grits.', 'Check that the expanded brush doesn\'t hit the bore bottom or a shoulder.'];
  R.alts.push({ label: 'Switch to #1000', note: 'Stiffer, more cutting power if #1200 leaves burrs.', ov: { family: 'shank', dia: size, grit: 1000 } });
  R.diagram = 'crosshole';
  // Ø15 #1000+ between Ø19 and the measured tip spread is backed by maker's test; elsewhere it is still an estimate
  const measured = size === 15 && grit >= SF_SPREAD15.grit && main && main >= SF_SPREAD15.bore && main <= SF_SPREAD15.tip;
  if (!measured) R.lower('medium', 'Bore-size to brush-size matching for this method is an estimate — verify expansion at your RPM.');
  else if (rpm < SF_SPREAD15.rpm * 0.9) R.lower('medium', `The Ø15 spread was measured at ${SF_SPREAD15.rpm.toLocaleString()} RPM; this setup runs slower, so the fibers spread less.`);
  return finalize(R, st);
}
function ov(st) { return st.override || {}; }

function finishPoint(R, st, size, grit, mat, mode, machine, maxRpm, ctx = {}) {
  const q = G(grit); const k = skuPoint(size, grit);
  R.family = 'point'; R.familyName = 'Point Brush'; R.dia = size; R.grit = q; R.sku = k.sku; R.desc = k.desc;
  const hand = machine === 'hand';
  R.holders.push(hand ? { role: 'Drive', sku: 'UF9999', desc: 'Portable E-Pack, 30,000 RPM max, forward/reverse' } : { role: 'Holding', sku: '—', desc: 'Ø3 mm shank collet or high-speed attachment' });
  const row = sfRowOf(st); R.sfRow = row.id;
  const SFq = sfPoint({ row, dia: size, mode, hand, maxRpm });
  R.notes.push(...SFq.notes);
  R.params = { rpm: SFq.rpm, rpmLo: SFq.rpmRange[0], rpmHi: SFq.rpmRange[1], rpmMax: MAX_RPM.point, feed: SFq.feed, feedRange: SFq.feedRange, engage: { label: hand ? 'Contact' : 'Engagement', value: hand ? 'Light' : SFq.eng, unit: hand ? '' : 'mm', note: hand ? 'Light, controlled contact. Never force the fibers sideways.' : `NOGA table ${SFq.engRange[0]}–${SFq.engRange[1]} mm — fiber deflection, not material removed.` }, passes: SFq.passes, direction: 'Either; reverse for burrs pushed into a slot', coolant: SFq.cool };
  R.steps = [hand ? 'Set the E-Pack speed and start rotation before touching the part.' : 'Start rotation clear of the part.', 'Touch on lightly with the brush tip, perpendicular to the surface where possible.', ctx.groove ? `Follow the groove centerline; the Ø${size} brush leaves clearance in your ${ctx.groove} mm groove.` : 'Follow the edge or feature with steady motion.', 'Make a return pass in the opposite direction.', 'Lift off before stopping.'];
  R.why = [
    { t: 'Why a Point brush', d: 'Ø1–3 mm fiber bundles reach narrow slots, small holes and fine details that larger brushes can\'t.' },
    { t: `Why Ø${size}`, d: ctx.groove ? `Largest point brush that fits your ${ctx.groove} mm groove with clearance.` : 'Matched to the feature size.' },
    { t: `Why #${grit}`, d: gritWhy(st, grit, mode) },
    { t: 'Why these speeds', d: hand ? 'NOGA limits hand-held point brushes to 1,000–3,000 RPM: start low and increase only once you have stable control.' : `Low end of NOGA's Point Brush table for ${sfLabel(row).toLowerCase()}. 12,000 RPM is the absolute maximum, not a target.` },
  ];
  R.watch = ['Max 12,000 RPM.', 'Not recommended with pneumatic (air) tools — use an electric spindle or the E-Pack.', 'Work with the tip; side loading breaks fine fibers.'];
  R.alts.push({ label: 'End brush Ø5', note: 'More contact area where space allows.', ov: { family: 'end', grit } });
  R.alts.push({ label: 'Ceramic fiber disc (0.8 mm)', note: 'For narrow grooves, rib bottoms and side walls.', ov: { family: 'disc', grit: Math.min(grit, 1000) } });
  R.diagram = ctx.groove ? 'groove' : 'point';

  return finalize(R, st);
}

function finishEnd(R, st, grit, mat, mode, machine, maxRpm, angled, ctx = {}) {
  const q = G(grit); const k = skuEnd(grit, angled);
  R.family = angled ? 'endAngled' : 'end'; R.familyName = angled ? 'End Brush, 45° tip' : 'End Brush, flat'; R.dia = 5; R.grit = q; R.sku = k.sku; R.desc = k.desc;
  const hand = machine === 'hand';
  R.holders.push(hand ? { role: 'Drive', sku: 'UF9999', desc: 'Portable E-Pack, 30,000 RPM max, forward/reverse' } : { role: 'Holding', sku: '—', desc: 'Ø3 mm shank collet; for robots add end-type floating damper UF8851' });
  const row = sfRowOf(st); R.sfRow = row.id;
  const SFe = sfEnd({ row, mode, hand, maxRpm });
  R.notes.push(...SFe.notes); R.dataChecks = SFe.checks;
  R.params = { rpm: SFe.rpm, rpmLo: SFe.rpmRange[0], rpmHi: SFe.rpmRange[1], rpmMax: MAX_RPM.end, feed: SFe.feed, feedRange: SFe.feedRange, engage: { label: hand ? 'Contact' : 'Engagement', value: hand ? 'Light' : SFe.eng, unit: hand ? '' : 'mm', note: hand ? 'Light, controlled contact.' : `NOGA table ${SFe.engRange[0]}–${SFe.engRange[1]} mm — start at the low end.` }, passes: SFe.passes, direction: 'Either', coolant: SFe.cool };
  R.steps = ['Start rotation clear of the part.', 'Bring the brush face onto the surface with light contact.', angled ? 'Use the pointed tip to reach into corners and along sharp edges.' : 'Move steadily along the edge or across the area.', 'Return pass in the opposite direction.', 'Lift off before stopping.'];
  R.why = [
    { t: `Why an End brush${angled ? ' (angled)' : ''}`, d: angled ? 'The 90° pointed tip gets into corners and tight recesses for selective deburring.' : 'Ø5 flat face gives even contact on small faces and edges — the go-to hand tool, also usable on CNC.' },
    { t: 'Why Ø5', d: ctx.groove ? `Fits your ${ctx.groove} mm groove.` : 'End brushes come in one Ø5 size with high bending strength.' },
    { t: `Why #${grit}`, d: gritWhy(st, grit, mode) },
    { t: 'Why these speeds', d: hand ? 'NOGA limits hand-held end brushes to 1,000–3,000 RPM.' : `Low end of NOGA's End Brush table for ${sfLabel(row).toLowerCase()}. 12,000 RPM is the absolute maximum.` },
  ];
  R.watch = ['Max 12,000 RPM.', 'Not recommended with pneumatic tools.', 'The tip can be re-angled with a diamond disc on a lathe or spindle.'];
  R.alts.push({ label: angled ? 'Flat end brush' : '90° angled end brush', note: angled ? 'For broader flat areas.' : 'For corners and hard-to-reach spots.', ov: { family: angled ? 'end' : 'endAngled', grit } });
  R.alts.push({ label: 'Point brush', note: 'For features under 5 mm.', ov: { family: 'point', grit, dia: 2 } });
  R.diagram = 'point';
  if (!hand) R.lower('medium', 'NOGA\'s End Brush feed and engagement values look copied from the Surface Brush table — confirm with NOGA.');
  return finalize(R, st);
}

function finishDisc(R, st, grit, mat, mode, machine, maxRpm) {
  grit = Math.min(Math.max(grit, 150), 1000); if (!G(grit) || grit > 1000) grit = 1000;
  const depth = Number(st.dims?.depth) || 5;
  const size = (DISC[ov(st).dia] ? ov(st).dia : null) || [13, 19, 22, 25, 30].find(D => D / 2 - 2.5 >= depth) || 30;   // a chosen disc size (e.g. from a competitor conversion) wins
  grit = discGrit(grit);
  const q = G(grit); const k = skuDisc(size, grit);
  R.family = 'disc'; R.familyName = 'Ceramic Fiber Disc (0.8 mm, radial)'; R.dia = size; R.grit = q; R.sku = k.sku; R.desc = k.desc;
  R.holders.push({ role: 'Clamping shank', sku: 'UF7030', desc: 'UF-DA-016-C030-L45, Ø3 shank (UF7023 for Ø2.35)' });
  if (machine === 'hand') R.holders.push({ role: 'Drive', sku: 'UF9999', desc: 'Portable E-Pack' });
  const row = sfRowOf(st); R.sfRow = row.id;
  const SFd = sfDisc({ row, dia: size, mode, maxRpm });
  R.dataChecks = SFd.checks;
  if (SFd.error) { R.warnings.push({ t: 'Not in NOGA\'s disc table', d: SFd.error }); R.params = { rpm: 6000, rpmLo: 6000, rpmHi: 8000, rpmMax: 9000, feed: 250, engage: { label: 'Radial engagement', value: 0.03, unit: 'mm', note: 'Very light contact.' }, passes: '2–3', direction: 'Either', coolant: mat.coolant }; }
  else R.params = { rpm: SFd.rpm, rpmLo: SFd.rpmRange[0], rpmHi: SFd.rpmRange[1], rpmMax: 9000, vc: Math.round(Math.PI * size * SFd.rpm / 1000), feed: SFd.feed, feedRange: SFd.feedRange, engage: { label: 'Radial engagement', value: SFd.eng, unit: 'mm', note: `NOGA table ${SFd.engRange[0]}–${SFd.engRange[1]} mm. Cut with the outer rim only.` }, passes: '2–3', direction: 'Either', coolant: SFd.cool };
  R.steps = ['Inspect the disc, screw and washer; confirm it runs true.', 'Start the spindle clear of the part (6,000–8,000 RPM, never above 9,000).', 'Approach radially so only the rim touches the wall or groove bottom.', 'Move along the feature with light, constant contact — never side-load the disc.', 'Retract radially and stop.'];
  R.why = [
    { t: 'Why a ceramic fiber disc', d: 'At 0.8 mm thick it fits narrow grooves, slots, rib bottoms and side walls that brushes can\'t enter.' },
    { t: `Why Ø${size}`, d: `Smallest disc whose radius clears your ${depth} mm feature depth plus the shank.` },
    { t: `Why #${grit}`, d: 'Discs come in #150–#1000. ' + gritWhy(st, grit, mode) },
    { t: 'Why these parameters', d: 'From NOGA\'s disc table: start at the low end of feed and engagement, keep 6,000–8,000 RPM.' },
  ];
  R.watch = [
      'Max 9,000 RPM, and never above the lowest rating of disc, adapter, spindle or machine. A broken disc ejects fragments.',
      'Keep the enclosure or guards closed, and wear eye protection with side shields.',
      'No air tools. Use a rigid, correctly guarded electric spindle or rotary tool.',
      'Inspect the disc, adapter, clamping screw and washer before every use; do not run a cracked, chipped or deformed part.',
      'Check it runs true before touching the workpiece. Stop at once on vibration, overheating or unusual noise.',
      'Light, controlled contact. Do not force, jam or side-load the disc.',
      'Use dust extraction or a dust collector: abrasive powder reaches guideways, bearings and seals and wears them. Do not blow it deeper in with compressed air.',
      'Dress or reshape the disc only with a diamond dressing tool, then re-check mounting and true running.',
      'Stop the spindle completely before touching, adjusting or changing the disc.',
    ];
  R.alts.push({ label: 'Point brush', note: 'For groove bottoms where a brush tip is enough.', ov: { family: 'point', grit, dia: 2 } });
  R.diagram = 'disc';
  return finalize(R, st);
}

function gritWhy(st, grit, mode) {
  const m = MATERIALS[st.material] || MATERIALS.other;
  const q = G(grit);
  if (mode === 'polish') return `${q.action}. For ${m.name.toLowerCase()} polishing, NOGA starts at #${materialGrit(st).polish[0]} and moves finer for the final finish.`;
  const burr = st.burr || 'light';
  return `${q.action}. For ${burr} burrs in ${m.name.toLowerCase()}, NOGA's table points here: coarser for heavier burrs and harder material, finer to keep edges crisp.`;
}

/* ---------- case matching ---------- */
const CASE_GROUP = { steel: 'carbon', tool: 'hardened', stainless: 'stainless', aluminum: 'aluminum', hrsa: 'hrsa', titanium: 'titanium', plastic: 'plastic' };
function matchCases(R, st, cases) {
  const fam = R.family === 'shank' ? 'surface' : (R.family === 'endAngled' ? 'end' : R.family);
  const task = R.family === 'crosshole' || R.family === 'shank' ? 'crosshole' : (R.inputs.mode === 'polish' ? 'polishing' : 'deburring');
  return cases.map(c => {
    let s = 0;
    if (c.fam === fam) s += 3;
    if (c.task === task) s += 2;
    if ((CASE_GROUP[c.grp] || c.grp) === st.material) s += 3;
    if (c.dia && R.dia && Math.abs(c.dia - R.dia) / R.dia < 0.3) s += 1;
    if (c.grits.includes(R.grit?.grit)) s += 1;
    if (c.src === 'noga') s += 0.5;
    return { c, s };
  }).filter(x => x.s >= 6).sort((a, b) => b.s - a.s).slice(0, 3).map(x => x.c);
}

function finalize(R, st) {
  // live tools on lathes rarely reach machining-centre speeds; cross-hole and shank set-ups check this themselves
  const mt = st.machine?.type;
  if (isLathe(mt) && !st.machine?.maxRpm && !['crosshole', 'shank', 'diamond'].includes(R.family) && R.params?.rpm > LIVE_TOOL.typical[0])
    R.notes.push(`This runs at ${R.params.rpm.toLocaleString()} RPM. Live tools on lathes are often limited to ${LIVE_TOOL.typical[0].toLocaleString()}–${LIVE_TOOL.typical[1].toLocaleString()} RPM; enter the station's maximum under Machine to check.`);
  // grades of one material that sit in different NOGA rows (5083 not hardenable, 7075 hardenable)
  const gRows = st.sfRow ? [] : gradeRows(st.material, st.sub, st.grades);
  if (gRows.length > 1) {
    const used = sfRow(R.sfRow || sfRowOf(st).id), pol = TASKS[st.task]?.mode === 'polish';
    const byRow = gRows.map(id => ({ row: sfRow(id), gs: st.grades.filter(g => gradeInfo(g)?.row === id) }));
    const vc = byRow.map(x => pol ? x.row.S.vcP : x.row.S.vcD), lo = Math.max(...vc.map(v => v[0])), hi = Math.min(...vc.map(v => v[1]));
    R.notes.push(byRow.map(x => `${x.gs.join(', ')} is ${(x.row.details || '').toLowerCase()}`).join('; ') + ` — two rows in NOGA's table. ` +
      (R.family === 'surface' || R.family === 'shank' ? (hi > lo ? `Their ${pol ? 'polishing' : 'deburring'} speeds overlap at Vc ${lo}–${hi} m/min, so one setup covers both. ` : '') : '') +
      `This setup follows the ${(used.details || '').toLowerCase()} row (${used.grade}), the slower of the two.`);
  }
  // sizes Claude worked out from other drawing dimensions: say so, and keep it at Medium
  const estK = (st.est || []).filter(k => st.dims && st.dims[k] != null);
  if (estK.length) {
    const nm = { main: 'main bore', cross: 'cross hole', width: 'working width', depth: 'depth', groove: 'groove', hole: 'hole' };
    R.notes.push(`Estimated from the drawing: ${estK.map(k => `${nm[k] || k} ≈ ${+Number(st.dims[k]).toFixed(1)} mm`).join(', ')}. The size was worked out from other dimensions, not read directly — confirm it before quoting.`);
    if (R.conf.level === 'high') R.conf.level = 'medium';
    R.conf.reasons.push('A size was estimated from the drawing.');
  }
  // a "main bore" several times the cross hole is usually an entry counterbore or
  // a port, not the bore that meets the cross hole
  const dm = st.dims || {};
  if (R.family === 'crosshole' && dm.main && dm.cross && dm.main / dm.cross > 3) {
    R.warnings.push({ t: 'Check the main bore size', d: `Ø${+dm.main.toFixed(2)} is more than three times the Ø${+dm.cross.toFixed(2)} cross hole. On many parts that number is an entry counterbore, a port or a thread, not the bore that meets the cross hole. The brush is chosen from the bore at the intersection — if that is smaller, change the size and the brush changes with it.` });
    if (R.conf.level === 'high') R.conf.level = 'medium';
    R.conf.reasons.push('The main bore is much larger than the cross hole — check it is the bore at the intersection.');
  }
  delete R.lower;
  if (R.conf.level === 'high' && !R.conf.reasons.length) R.conf.reasons.push('Selection follows the catalogue rules directly.');
  return R;
}

/* ---------- natural-language parsing ---------- */
const MAT_WORDS = [
  [/\b(inconel|hastelloy|waspaloy|nimonic|rene|718|625|superalloy|heat[- ]resistant|hrsa)\b/i, 'hrsa', 'ni'],
  [/\b(cobalt|co-?cr|cocr|stellite|l-?605|haynes ?25|mp35n)\b/i, 'hrsa', 'co'],
  [/\b(titanium|ti-?6al|ti6al4v|grade ?5|ti\b)/i, 'titanium'],
  [/\b(carbide|tungsten|ceramic|glass|sapphire)\b/i, 'carbide'],
  [/\b(17-?4(ph)?|15-?5(ph)?|420|410|416|440c?|martensitic|ferritic)\b/i, 'stainless', 'mart'],
  [/\b(stainless|inox|sus ?3\d\dl?|304l?|316l?|321|duplex|sus|1\.4404|1\.4301|a2|a4)\b/i, 'stainless', 'aust'],
  [/\b(adc ?12|a356|a380|a383|cast alumin\w*|die[- ]cast)\b/i, 'aluminum', 'cast'],
  [/\b(390|high[- ]silicon)\b/i, 'aluminum', 'hisi'],
  [/\b(alu\w*|6061|6082|7075|2024|5083|al ?alloy)\b/i, 'aluminum', 'wrought'],
  [/\b(brass|bronze|c360|cuzn)\b/i, 'brass'],
  [/\b(copper|cu\b|c110)\b/i, 'copper'],
  [/\b(cast iron|grey iron|gray iron|ductile|nodular|gg25|ggg)\b/i, 'castiron'],
  [/\b(hardened|hrc|tool steel|d2|h13|skd|nak|m2|hss)\b/i, 'hardened'],
  [/\b(peek|delrin|pom(-?c)?|nylon|pa6|abs|(engineering |thermo)?plastics?|composites?|cfrp|gfrp|resins?|acetal|ptfe|n?pp|pp-?[hc]|polypropylene|polyethylene|polyester|polycarbonate|polymers?|pet(-?p)?|pbt|hdpe|ldpe|uhmw(-?pe)?|pvdf|pfa|fep|pvc|cpvc|pps|pei|ultem|pai|torlon|ertalyte|ketron|techtron|duratron|fluorosint|semitron|vespel|polyimide)\b/i, 'plastic'],
  [/\b(steel|4140|1045|s45c|scm|en8|en24|1018|a36|carbon)\b/i, 'carbon'],
];
/* Email signatures are full of numbers that look like material grades: a phone
   number +420 777 868 697 reads as 420 stainless. Strip the parts of a message
   that never describe a job before any grade matching happens. */
function scrubContact(s) {
  return String(s)
    .replace(/[\w.+-]+@[\w.-]+\.\w+/g, ' ')                       // e-mail addresses
    .replace(/\b(?:https?:\/\/|www\.)\S+/gi, ' ')                  // links
    .replace(/(?:^|\n)\s*(?:tel|phone|mobil|mobile|fax|cell|t|m|p)\s*[:.]?\s*[+\d][\d\s().\-]{6,}/gi, ' ')
    .replace(/\+\d[\d\s().\-]{6,}/g, ' ')                          // +420 777 868 697
    .replace(/\b\d{3}[\s.\-]\d{3}[\s.\-]\d{3,4}\b/g, ' ')          // 777 868 697
    .replace(/\b\d{4,}\b(?=\s*(?:street|st\.|ave|road|rd\.|zip|postal))/gi, ' ');
}
/* A cross-hole job is described by two diameters. A third chip repeating one of
   them is noise, whichever reader produced it. */
function dedupeDims(st) {
  const d = st && st.dims;
  if (!d) return st;
  if (st.task === 'crosshole' && d.hole != null && (d.hole === d.cross || d.hole === d.main)) delete d.hole;
  return st;
}
/* A customer naming the tool they want is not describing their part. "ceramic
   fiber brush", "diamond stone", "carbide burr" all used to set the workpiece
   material, so a stainless part became carbide because of the brush. Take those
   phrases out before anything looks for a material. */
function scrubToolWords(s) {
  return String(s)
    // "we need fine grits type ceramic", "ceramic grit": the brush again, not the part
    .replace(/\b(?:fine|coarse|medium)?\s*grits?\s*(?:type\s*)?(?:of\s*)?(?:ceramic|diamond|carbide)\b/gi, ' ')
    .replace(/\b(?:ceramic|diamond|carbide)\s*(?:type|grits?|abrasive|media)\b/gi, ' ')
    .replace(/\b(ceramic|diamond|carbide|abrasive|nylon|aluminium oxide|aluminum oxide|silicon carbide|cbn)[\w\s-]{0,24}?(fib(?:er|re)s?|brush(?:es)?|hone|stone|burr|wheel|disc|disk|pad|tool|bristle)/gi, ' ')
    .replace(/\b(brush(?:es)?|hone|stone|burr|wheel|disc|disk|pad|bristle)\s+(?:of|made of|with)?\s*(ceramic|diamond|carbide|abrasive|nylon)/gi, ' ');
}
/* "Case 1 … Case 2 …": one email, several jobs. The guide sets up one at a time. */
const JOB_HEAD = /(?:^|\n)[ \t]*(?:case|part|application|job)[ \t]*(?:no\.?|#)?[ \t]*(\d{1,2})\b[^\n]*/gi;
function caseCount(text) {
  const n = new Set([...String(text || '').matchAll(JOB_HEAD)].map(m => +m[1]));
  return n.size;
}
/* Each job's own text, plus the notes that apply to all of them ("Notes: all
   parts are plastics, BT40 machines"), which customers put after the last case. */
function splitJobs(text) {
  const t = String(text || ''), heads = [], seen = new Set();
  for (const m of t.matchAll(JOB_HEAD)) { const n = +m[1]; if (!seen.has(n)) { seen.add(n); heads.push({ n, at: m.index }); } }
  if (heads.length < 2) return null;
  const jobs = heads.map((h, i) => ({ n: h.n, at: h.at, text: t.slice(h.at, i + 1 < heads.length ? heads[i + 1].at : t.length) }));
  const last = jobs[jobs.length - 1];
  const tail = last.text.search(/\n[ \t]*(?:general\s+)?(?:notes?|remarks?|general|for all (?:parts|cases))\b\s*:?|\n[ \t]*(?:rgds|regards|best regards|kind regards|thanks|thank you|br)\b/i);
  let shared = '';
  if (tail > 0) {
    shared = last.text.slice(tail);
    last.text = last.text.slice(0, tail);
    const sig = shared.search(/\n[ \t]*(?:rgds|regards|best regards|kind regards|thanks|thank you|br)\b/i);
    if (sig >= 0) shared = shared.slice(0, sig);
  }
  // short, cut at a word: "15-430509-00 Adapter, APT, Chemical, 1/4" Port…"
  const field = (s, re) => { const m = s.match(re); if (!m) return ''; const v = m[1].trim(); return v.length <= 44 ? v : v.slice(0, 44).replace(/[\s,;(]+\S*$/, '') + '…'; };
  return {
    shared: shared.trim(),
    jobs: jobs.map(j => {
      const name = field(j.text, /part\s*name\s*[:=]\s*([^\n]+)/i), mat = field(j.text, /material\s*[:=]\s*([^\n]+)/i);
      return { n: j.n, text: j.text.trim(), label: [name, mat].filter(Boolean).join(', ') };
    }),
  };
}
function jobText(split, n) {
  const j = split && split.jobs.find(x => x.n === n); if (!j) return '';
  return j.text + (split.shared ? '\n\n' + split.shared : '');
}
const BURR_BEFORE = /burrs?\s*(height|thickness|size|root|thick|high)?\s*[:=]?\s*(approx\.?|approximately|about|ca\.?|~|≈|around|up to|max\.?|of|is|are)?\s*$/i;
function burrSize(t) {
  const m = t.match(/burrs?\s*(?:height|thickness|size|root|thick|high)?\s*[:=]?\s*(?:approx\.?|approximately|about|ca\.?|~|≈|around|up to|max\.?|of|is|are)?\s*(\d+(?:\.\d+)?)\s*(mm|µm|um|")/i)
    || t.match(/(\d+(?:\.\d+)?)\s*(mm|µm|um)\s*(?:high|thick|tall|large)?\s*burr/i);
  if (!m) return null;
  let v = parseFloat(m[1]); if (/µm|um/i.test(m[2])) v /= 1000; else if (m[2] === '"') v *= 25.4;
  return isFinite(v) && v > 0 && v < 20 ? Math.round(v * 1000) / 1000 : null;
}
const fmtMm = v => String(+Number(v).toFixed(3));
const burrLevel = mm => mm > 0.2 ? 'heavy' : mm > 0.1 ? 'medium' : 'light';
function parseText(text) {
  // American drawings write inches with a leading dot and no unit: Ø.156 is 0.156 in.
  const t = (' ' + scrubToolWords(scrubContact(text)).replace(/,/g, '.') + ' ')
    .replace(/([øØ⌀]|\bdia(?:meter)?\.?)\s*\.(\d{2,4})(?!\s*(?:mm|"|in\b|\d))/gi, '$10.$2"');
  const out = { understood: [] };
  // material. A labelled line ("Material : PET-P", "all part materials are
  // engineering plastics") says what the part is made of; other mentions can be
  // anything ("they use sandpaper on stainless and plastic"), so the label wins.
  const labelled = [...t.matchAll(/\bmaterials?\b[^\n:=]{0,20}?(?:[:=]|\bis\b|\bare\b)\s*([^\n;]{1,60})/gi)].map(x => ' ' + x[1].split(/\.(?:\s|$)/)[0] + ' ');
  for (const seg of labelled) {
    for (const [re, m, sub] of MAT_WORDS) { if (re.test(seg)) { out.material = m; if (sub) out.sub = sub; break; } }
    if (out.material) break;
  }
  if (!out.material) for (const [re, m, sub] of MAT_WORDS) { if (re.test(t)) { out.material = m; if (sub) out.sub = sub; break; } }
  const hrc = t.match(/(\d{2})\s*hrc/i); if (hrc) { if (!out.material || out.material === 'carbon') out.material = 'hardened'; out.sub = Number(hrc[1]) > 55 ? 'gt55' : 'le55'; }
  if (out.material === 'carbon' && /(quench|tempered|heat[- ]treat|through[- ]hard)/i.test(t)) out.sub = 'treated';
  // named grades pick the NOGA row; a second material named by grade is a second setup.
  // A bare "2024" is only an alloy when the text is already about aluminium.
  const hits = gradesIn(t).filter((g, _, all) => !g.bare || out.material === 'aluminum' || all.some(x => x.mat === 'aluminum' && !x.bare));
  if (hits.length) {
    const groups = []; hits.forEach(g => { if (!groups.some(x => x.mat === g.mat && x.sub === g.sub)) groups.push(g); });
    // the first material the customer lists is set up first, unless every grade is the material already read
    if (!(out.material && groups.every(g => g.mat === out.material))) { out.material = groups[0].mat; out.sub = groups[0].sub; }
    out.grades = hits.filter(g => g.mat === out.material).map(g => g.g);
    out.also = groups.filter(g => g.mat !== out.material).map(g => ({ material: g.mat, sub: g.sub, grades: hits.filter(h => h.mat === g.mat && h.sub === g.sub).map(h => h.g) }));
    if (!out.also.length) delete out.also;
  }
  // task / feature
  const isCross = /(cross|intersect|crossing|t-?junction|side hole|radial hole|meets? (a|the) bore|opens? (in|into) the (?:[^.\n]|\.\d){0,30}(hole|bore)|(hole|drill\w*)(?:[^.\n]|\.\d){0,25}\bon the (od|o\.d\.|outer diameter|diameter))/i.test(t);
  if (isCross) { out.task = 'crosshole'; out.feature = 'cross'; }
  else if (/(?<!\p{L})(edm|wire[- ]?cut|recast)(?!\p{L})/iu.test(t) || out.material === 'carbide') out.task = 'hard';   // \b is ASCII-only: Czech "Předmět" (Subject:) read as EDM
  else if (/(tool ?marks?|cutter ?marks?|mill(ing)? marks|\bra\b|roughness|scallop)/i.test(t)) out.task = 'marks';
  else if (/(polish|mirror|shine|lustre|luster|finish(ing)? the surface)/i.test(t)) out.task = 'polish';
  else if (/(edge break|break the edge|round(ing)? (the )?edge|radius the edge|blend)/i.test(t)) out.task = 'edge';
  else if (/(inner|internal|inside) (diameter|bore|surface)|\bid\b/i.test(t) && !/burr/i.test(t)) { out.task = 'id_finish'; out.feature = 'bore'; }
  else if (/(drill(ed|ing)?|hole)/i.test(t) && /burr/i.test(t)) { out.task = 'deburr_drill'; out.feature = 'hole'; }
  else if (/burr|deburr/i.test(t)) out.task = 'deburr_mill';
  if (!out.feature) {
    if (/(groove|slot|o-?ring|channel|keyway|dovetail|pocket)/i.test(t)) out.feature = 'groove';
    else if (/(thread|tapped)/i.test(t)) out.feature = 'thread';
    else if (/(radius|curved|convex|concave|blend|3d surface|freeform)/i.test(t)) out.feature = 'radius';
    else if (/(face|flat|surface|plane|sealing|flange)/i.test(t)) out.feature = 'face';
    else if (/(edge|contour|profile|outline|perimeter)/i.test(t)) out.feature = 'edge';
    else if (/(small|tiny|micro|precision|narrow)/i.test(t)) out.feature = 'small';
  }
  // a slot that opens into the bore: "1.016 slot with length of 1.5 mm", "slot 1 x 1.5"
  const NUM = '(\\d+(?:\\.\\d+)?)';
  let slotW = null, slotL = null;
  if (isCross && /\bslot/i.test(t)) {
    const sx = t.match(new RegExp('slot[^.\\n]{0,20}?' + NUM + '\\s*(?:mm)?\\s*[x×]\\s*' + NUM, 'i'));
    if (sx) { slotW = +sx[1]; slotL = +sx[2]; }
    else {
      const w = t.match(new RegExp(NUM + '\\s*(?:mm)?\\s*(?:wide\\s+)?(?:milled\\s+)?slot', 'i')) || t.match(new RegExp('slot\\s*(?:width|wide|w)\\s*(?:of|[:=])?\\s*' + NUM, 'i'));
      const l = t.match(new RegExp('slot[^\\n]{0,40}?(?:length|long)\\s*(?:of|[:=])?\\s*' + NUM, 'i')) || t.match(new RegExp('slot[^\\n]{0,30}?' + NUM + '\\s*(?:mm)?\\s*long', 'i'));
      if (w) slotW = +w[1]; if (l) slotL = +l[1];
    }
    if (slotW && slotL && slotW > slotL) [slotW, slotL] = [slotL, slotW];
  }
  // a cross hole drilled across the part goes through both walls of the bore
  if (isCross && /(both (sides|walls)|on the (od|o\.d\.|outer diameter|diameter)|through both|thru both|drilled (right |all the way )?through|goes (right )?through|across the (part|diameter))/i.test(t)) out.through = true;
  // dimensions
  const nums = [];
  const re = /(?:[øØ⌀]|dia(?:meter)?\.?\s*|d\s*=\s*)?\s*(\d+(?:\.\d+)?)\s*(mm|")?/g;
  let m;
  while ((m = re.exec(t))) {
    const raw = m[0]; const v = parseFloat(m[1]);
    const after = t.slice(m.index + raw.length, m.index + raw.length + 40).toLowerCase();
    const before = t.slice(Math.max(0, m.index - 30), m.index).toLowerCase();
    if (/^\s*(rpm|min|hrc|%|µ|um|x)/.test(after) || /(ra\s*$|rz\s*$)/.test(before)) continue;
    // 3/8" is one fractional size, not the number 8. Reading the denominator as
    // inches turned a 3/8 inch brush into a 203 mm feature.
    if (/\d\s*\/\s*$/.test(before)) continue;
    if (/\b(304|316|6061|7075|2024|4140|1045|718|625|420|410|440|390|12)\b/.test(String(v)) && !/[øØ⌀]|mm|dia/.test(raw + after.slice(0, 4))) { if (!/mm/.test(after.slice(0, 4))) continue; }
    const hasMark = /[øØ⌀]|dia|mm|"/.test(raw) || /^\s*mm/.test(after);
    if (!hasMark) continue;
    // "burr height: approx. 1 mm" / "a 0.3 mm burr" is the burr, not a size of the part
    if (!/[øØ⌀]|dia/i.test(raw) && (BURR_BEFORE.test(before) || /^\s*(mm)?\s*(high|thick|tall|large)?\s*burr/i.test(after))) continue;
    let mm = m[2] === '"' ? v * 25.4 : v;
    if ((slotW && mm === slotW) || (slotL && mm === slotL)) { if (/slot|length|long|wide|width/i.test(before.slice(-25) + after.slice(0, 25))) continue; }
    nums.push({ v: mm, before, after });
  }
  const tag = (n, words) => words.test(n.after.slice(0, 30)) || words.test(n.before.slice(-25));
  if (isCross && nums.length >= 2) {
    const mainN = nums.find(n => tag(n, /main|bore|primary|large|entry|reamed/)); const crossN = nums.find(n => n !== mainN && n.v !== mainN?.v && tag(n, /cross|drill|side|small|intersect|radial/));
    let a = mainN?.v, b = crossN?.v;
    // the same diameter is often repeated ("entry dia 3.1 … the dia 3.1 mm reamed hole"): pick two different sizes
    if (!a || !b) { const s = [...new Set(nums.map(n => n.v))].sort((x, y) => y - x); if (!a) a = s[0]; if (!b) b = s.find(x => x !== a); }
    if (b != null && b > a) [a, b] = [b, a];
    out.dims = b != null ? { main: a, cross: b } : { main: a };
  } else if (nums.length) {
    out.dims = {};
    for (const n of nums) {
      if (tag(n, /groove|slot|o-?ring|channel/)) out.dims.groove = n.v;
      else if (tag(n, /hole|bore|drill/)) { if (out.feature === 'bore' || out.task === 'id_finish' || isCross) out.dims.main = n.v; else out.dims.hole = n.v; }
      else if (tag(n, /wide|width|face|flange|surface/)) out.dims.width = n.v;
      else if (tag(n, /deep|depth/)) out.dims.depth = n.v;
      else if (!out.dims.width) out.dims.width = n.v;
    }
  }
  const ra = t.match(/ra\s*([\d.]+)/i); if (ra) out.ra = Number(ra[1]);
  // burr
  if (/(heavy|large|big|thick|rolled|significant) burr/i.test(t)) out.burr = 'heavy';
  else if (/(medium|moderate) burr/i.test(t)) out.burr = 'medium';
  else if (/(small|light|fine|tiny|micro|feather|thin) burr|fuzz/i.test(t)) out.burr = 'light';
  // a measured burr beats the adjectives: >0.2 mm at the root is more than fiber should take on
  const bmm = burrSize(t);
  if (bmm != null) { out.burrMm = bmm; out.burr = burrLevel(bmm); }
  // machine
  const mc = {};
  // explicit machines first; "today we deburr by hand" describes the current process, not the target machine
  if (/swiss|citizen|tsugami|star sr|star sb/i.test(t)) mc.type = 'swiss';
  else if (/robot|fanuc m-|kuka|abb irb|ur\d+e?\b|cobot/i.test(t)) mc.type = 'robot';
  else if (/(machining cent|vmc|hmc|\bmill\b|\bmill(?:ing)? (?:machine|cent(?:er|re))|cnc mill|5-?axis|bt ?40|bt ?30|cat ?40|hsk|haas|mazak|dmg|okuma|doosan|hermle|robodrill|speedio|makino|vf-?\d)/i.test(t) && !/(lathe|turning cent)/i.test(t)) mc.type = 'mc';
  else if (/(lathe|turning)/i.test(t)) mc.type = /(no live|without live|no driven)/i.test(t) ? 'lathe0' : 'lathe';
  else if (/(pneumatic|air[- ]?(powered|tool|grinder|die grinder|driven))/i.test(t)) mc.type = 'air';
  else if (/(dedicated machine|special[- ]purpose machine|transfer machine)/i.test(t)) mc.type = 'dedicated';
  else if (/(hand[- ]?held|hand tool|handpiece|e-?pack|dremel|micromotor|rotary tool)/i.test(t)) mc.type = 'hand';
  const bt = t.match(/bt ?(30|40)/i); if (bt) mc.iface = 'BT' + bt[1];
  const rpm = t.match(/(\d[\d.]*)\s*(k)?\s*rpm/i); if (rpm) { let v = parseFloat(rpm[1].replace(/\.(?=\d{3})/g, '')); if (rpm[2]) v *= 1000; mc.maxRpm = Math.round(v); }
  if (/(uneven|cast surface|as[- ]cast|warp|runout)/i.test(t)) mc.uneven = true;
  if (Object.keys(mc).length) out.machine = mc;
  if (slotW || slotL) { out.dims = out.dims || {}; if (slotW) out.dims.slotW = slotW; if (slotL) out.dims.slotL = slotL; }
  // a cross-hole job states two diameters; a third chip repeating one of them is noise
  if (out.dims && out.task === 'crosshole' && out.dims.hole != null &&
      (out.dims.hole === out.dims.cross || out.dims.hole === out.dims.main)) delete out.dims.hole;
  return out;
}

if (typeof module !== 'undefined') module.exports = { recommend, parseText, MAX_RPM, scrubContact, scrubToolWords, dedupeDims, matchCases, GRITS, SURFACE, CROSS, MATERIALS, TASKS, FEATURES, MACHINES, skuSurface, skuCross, skuPoint, skuEnd, skuDisc, DISC_GRITS, discGrit, ACCESSORIES, skuStone, STONE_GRITS, DAMPER };

