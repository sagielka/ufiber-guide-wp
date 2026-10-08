/* ============================================================
   UFIBER Guide — AI layer
   Claude interprets and explains; the UFIBER engine (NOGA data)
   computes every number. Claude reaches the engine only through
   page tools, so it cannot invent RPM, feed or item numbers.
   Everything degrades to the local parser when sampling is off.
   ============================================================ */
APP.smart = { busy: false, err: null, summary: '', questions: [], checked: false, snap: null, ctl: null };
APP.chat = { ws: null, turns: [], busy: false, ctl: null };

const Q_FIELDS = { task: TASKS, feature: FEATURES, material: MATERIALS, burr: { light: 1, medium: 1, heavy: 1 }, machine: MACHINES };
const Q_NUM = ['main', 'cross', 'depth', 'width', 'groove', 'hole'];
const enumKeys = o => Object.keys(o).join(' | ');
function extractionSpec() {
  return `{"task": ${enumKeys(TASKS)} | null,
 "feature": ${enumKeys(FEATURES)} | null,
 "material": ${enumKeys(MATERIALS)} | null,
 "sub": material sub-type key if clear (carbon: annealed|treated; stainless: aust|mart; hardened: le55|gt55; castiron: grey|pearl; aluminum: wrought|cast|hisi; hrsa: ni|co|fe) or null,
 "burr": "light" | "medium" | "heavy" | null,
 "dims": {"main": mm|null, "cross": mm|null, "depth": mm|null, "width": mm|null, "groove": mm|null, "hole": mm|null, "ra": µm|null},
 "machine": {"type": ${enumKeys(MACHINES)} | null, "maxRpm": number|null, "iface": "BT30"|"BT40"|null},
 "summary": "one short sentence restating the job, in the language of the job description itself",
 "questions": [up to 2 questions, ONLY for missing facts that would change the tool or its parameters, most important first:
   {"ask": "short question, in the SAME language as your summary above", "field": "task"|"feature"|"material"|"sub"|"burr"|"machine"|"main"|"cross"|"depth"|"width"|"groove"|"hole",
    "options": [2-5 {"label": "short answer text", "value": the matching enum key, or a number in mm for size fields}]}]}
Language: judge it from the description of the work only. Ignore e-mail signatures, job titles, company names, web addresses, legal footers and quoted replies — a Czech signature under an English request means the language is English. Summary and questions must be in the same language as each other.
Rules: lengths in mm (convert inches). "main" = the larger bore the brush enters; "cross" = the smaller intersecting hole. Use null when not stated — never invent numbers.
Materials: 304/316/A2/A4 → stainless aust; 17-4/420/410 → stainless mart; 6061/7075 → aluminum wrought; ADC12/A356 → aluminum cast; Ti-6Al-4V → titanium; Inconel/Hastelloy → hrsa ni; CoCr → hrsa co; 4140 Q&T → carbon treated; D2/H13 hardened → hardened; carbide/ceramic/glass → carbide.
Burr: light = thin, feathery, bends with a fingernail; heavy = thick, rolled, over ~0.2 mm at the root.
Phrases about the CURRENT process ("today we deburr by hand") are not the target machine.
THE TOOL IS NOT THE PART. A customer often names a tool they already have or want: a brush, hone, stone, 3/8" hone, "ceramic abrasive fiber", a grit number, an item code.
  - Its SIZE is never a part dimension. "a 3/8 inch hone" says nothing about the bore; leave "main" null and ask.
  - Its MATERIAL is never the part material. "ceramic fiber brush", "diamond stone", "carbide burr" describe the tool; leave "material" null and ask what the part is made of.
  - Only sizes and materials stated as belonging to the WORKPIECE go in "dims" and "material".
Do not put the same number in two fields. If only one diameter is stated, it is "main"; leave "cross" null unless a second, intersecting hole is actually described.
Task meanings: ${Object.entries(TASKS).map(([k, t]) => k + ' = ' + t.name).join('; ')}.
Feature meanings: ${Object.entries(FEATURES).map(([k, f]) => k + ' = ' + f).join('; ')}.`;
}
const smartFields = st => ({ task: st.task, feature: st.feature, material: st.material, sub: st.sub, burr: st.burr, main: st.dims?.main, cross: st.dims?.cross, depth: st.dims?.depth, width: st.dims?.width, groove: st.dims?.groove, hole: st.dims?.hole, ra: st.dims?.ra, mtype: st.machine?.type, maxRpm: st.machine?.maxRpm, iface: st.machine?.iface });

/* ---------- smart reading of typed text ---------- */
async function smartRead(text) {
  if (!APP.sample || !text || text.trim().length < 8) return;
  APP.smart.ctl?.abort();
  const ctl = new AbortController();
  APP.smart = { busy: true, err: null, summary: '', questions: [], checked: false, snap: JSON.stringify(smartFields(APP.ws)), ctl };
  renderUnderstood();
  const prompt = `You are a NOGA MT application engineer for UFIBER ceramic fiber deburring and finishing tools. A user described a job in their own words (any language). Extract it.
Reply with ONLY one JSON object:
${extractionSpec()}

USER TEXT:
"""
${text.slice(0, 6000)}
"""`;
  try {
    const r = await APP.sample.json(prompt, { modelTier: 'quick', signal: ctl.signal });
    if (APP.smart.ctl !== ctl) return;
    applyExtraction(r, APP.smart.snap);
  } catch (e) {
    if (e && e.code === 'cancelled') return;
    APP.smart.err = { not_granted: 'AI reading is off for this view — the quick reading above still works.', rate_limited: 'AI is busy — try again in a minute.' }[e && e.code] || 'AI reading didn\'t finish — the quick reading above still works.';
    if (['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled'].includes(e && e.code)) APP.sample = null;
  } finally { if (APP.smart.ctl === ctl) { APP.smart.busy = false; renderUnderstood(); } }
}
// Merge Claude's extraction; never overwrite a field the user changed while it was reading.
function applyExtraction(r, snapJson) {
  if (!r || typeof r !== 'object') return;
  const st = APP.ws || (APP.ws = newState());
  const snap = snapJson ? JSON.parse(snapJson) : smartFields(st); const now = smartFields(st);
  const free = k => JSON.stringify(now[k] ?? null) === JSON.stringify(snap[k] ?? null);
  const ok = (v, set) => (v && set[v] !== undefined ? v : null);
  const task = ok(r.task, TASKS), feature = ok(r.feature, FEATURES), material = ok(r.material, MATERIALS);
  if (task && free('task')) { st.task = task; if (TASKS[task].feature) st.feature = TASKS[task].feature; }
  if (feature && free('feature') && !TASKS[st.task]?.feature) st.feature = feature;
  if (!st.feature && st.task) st.feature = SUGGEST_FEATURE[st.task] || null;
  if (material && free('material')) { st.material = material; st.sub = MATERIALS[material].subs && MATERIALS[material].subs[r.sub] ? r.sub : null; }
  else if (st.material && r.sub && free('sub') && MATERIALS[st.material].subs?.[r.sub]) st.sub = r.sub;
  if (['light', 'medium', 'heavy'].includes(r.burr) && free('burr')) { st.burr = r.burr; APP.parsed = { ...(APP.parsed || {}), burr: r.burr }; }
  const d = r.dims || {}; st.dims = st.dims || {};
  ['main', 'cross', 'depth', 'width', 'groove', 'hole', 'ra'].forEach(k => { const v = Number(d[k]); if (d[k] != null && isFinite(v) && v > 0 && v < 5000 && free(k)) st.dims[k] = v; });
  if (st.dims.main && st.dims.cross && st.dims.cross > st.dims.main) [st.dims.main, st.dims.cross] = [st.dims.cross, st.dims.main];
  const m = r.machine || {};
  if (ok(m.type, MACHINES) && free('mtype')) st.machine.type = m.type;
  if (Number(m.maxRpm) > 0 && free('maxRpm')) st.machine.maxRpm = Number(m.maxRpm);
  if (['BT30', 'BT40'].includes(m.iface) && free('iface')) st.machine.iface = m.iface;
  if (m.type || m.maxRpm) APP.parsed = { ...(APP.parsed || {}), machine: m };
  if (st.dims.ra) APP.parsed = { ...(APP.parsed || {}), ra: st.dims.ra };
  APP.smart.summary = String(r.summary || '').slice(0, 280);
  APP.smart.questions = cleanQuestions(r.questions, st);
  APP.smart.checked = true; APP.editKey = null;
}
function cleanQuestions(qs, st) {
  if (!Array.isArray(qs)) return [];
  const has = f => f === 'burr' ? !!APP.parsed?.burr : f === 'machine' ? !!APP.parsed?.machine : Q_NUM.includes(f) ? st.dims?.[f] != null : st[f] != null;
  return qs.filter(q => q && typeof q.ask === 'string' && (Q_FIELDS[q.field] || Q_NUM.includes(q.field) || q.field === 'sub') && !has(q.field)).slice(0, 2).map(q => {
    let opts = Array.isArray(q.options) ? q.options : [];
    if (q.field === 'sub') opts = opts.filter(o => st.material && MATERIALS[st.material].subs?.[o.value]);
    else if (Q_FIELDS[q.field]) opts = opts.filter(o => Q_FIELDS[q.field][o.value] !== undefined);
    else opts = opts.filter(o => isFinite(Number(o.value)) && Number(o.value) > 0);
    return { ask: q.ask.slice(0, 160), field: q.field, options: opts.slice(0, 5).map(o => ({ label: String(o.label || o.value).slice(0, 40), value: o.value })) };
  }).filter(q => q.options.length || Q_NUM.includes(q.field));
}
function answerQuestion(i, value) {
  const q = APP.smart.questions[i]; if (!q) return; const st = APP.ws;
  if (q.field === 'task') { st.task = value; if (TASKS[value].feature) st.feature = TASKS[value].feature; else if (!st.feature) st.feature = SUGGEST_FEATURE[value] || null; }
  else if (q.field === 'feature') st.feature = value;
  else if (q.field === 'material') { st.material = value; st.sub = null; }
  else if (q.field === 'sub') st.sub = value;
  else if (q.field === 'burr') { st.burr = value; APP.parsed = { ...(APP.parsed || {}), burr: value }; }
  else if (q.field === 'machine') { st.machine.type = value; APP.parsed = { ...(APP.parsed || {}), machine: { type: value } }; }
  else if (Q_NUM.includes(q.field)) { const v = lenIn(value); if (!v) return; st.dims[q.field] = v; }
  APP.smart.questions.splice(i, 1); renderUnderstood();
}
function offlineQuestions() {
  if (APP.sample || !NLU.ready || !APP.ws || !APP.askText) return '';
  const g = NLU.gaps(APP.ws, APP.nlu);
  if (!g.length) return '';
  APP.oq = g;
  return `<div class="ai-box">${g.map((q, i) => `<div class="aiq"><div class="small" dir="auto"><b>${esc(q.ask)}</b></div><div class="mini-tiles">${q.options.map(o => `<button class="chip" data-oq="${i}" data-v="${esc(String(o.value))}">${esc(o.label)}</button>`).join('')}${q.options.length ? '' : `<span class="inp aiq-num"><input id="oqN${i}" type="number" step="any" min="0" inputmode="decimal" placeholder="${lenU()}"><button class="btn small" data-oqn="${i}">OK</button></span>`}</div></div>`).join('')}</div>`;
}
function answerOffline(i, value) {
  const q = APP.oq?.[i]; if (!q) return; const st = APP.ws;
  if (q.field === 'task') { st.task = value; if (TASKS[value].feature) st.feature = TASKS[value].feature; else if (!st.feature) st.feature = SUGGEST_FEATURE[value] || null; }
  else if (q.field === 'material') { st.material = value; st.sub = null; }
  else if (q.field === 'burr') { st.burr = value; APP.parsed = { ...(APP.parsed || {}), burr: value }; }
  else if (q.field === 'machine') { st.machine.type = value; APP.parsed = { ...(APP.parsed || {}), machine: { type: value } }; }
  else if (q.field === 'main') { const v = lenIn(value); if (!v) return; st.dims.main = v; }
  APP.oq.splice(i, 1); renderUnderstood();
}
function smartBlock() {
  const S = APP.smart; if (!APP.sample && !S.checked) return offlineQuestions();
  let h = '';
  if (S.busy) h += `<div class="ai-line"><span class="spinner sm" aria-hidden="true"></span><span class="small">Claude is checking your description…</span><button class="btn ghost small" id="smartStop">Stop</button></div>`;
  if (S.checked && S.summary) h += `<div class="ai-line"><span class="ai-badge">AI</span><span class="small" dir="auto">“${esc(S.summary)}”</span></div>`;
  if (S.err) h += `<p class="tiny" style="margin:6px 0 0">${esc(S.err)}</p>`;
  S.questions.forEach((q, i) => {
    h += `<div class="aiq"><div class="small" dir="auto"><b>${esc(q.ask)}</b></div><div class="mini-tiles">${q.options.map(o => `<button class="chip" data-aiq="${i}" data-v="${esc(String(o.value))}">${esc(o.label)}</button>`).join('')}${Q_NUM.includes(q.field) ? `<span class="inp aiq-num"><input id="aiqN${i}" type="number" step="any" min="0" inputmode="decimal" placeholder="${lenU()}"><button class="btn small" data-aiqn="${i}">OK</button></span>` : ''}</div></div>`;
  });
  return h ? `<div class="ai-box">${h}</div>` : '';
}

/* ---------- "Ask about this setup" ---------- */
function compactRec(R) {
  if (!R) return null; const p = R.params || {};
  return { tool: { family: R.familyName, sku: R.sku, description: R.desc, diameter_mm: R.dia, grit: R.grit?.grit, grit_color: R.grit?.color }, holders: R.holders.map(h => `${h.role}: ${h.sku !== '—' ? h.sku + ' ' : ''}${h.desc}`), rpm: p.rpm, rpm_window: [p.rpmLo, p.rpmHi], rpm_max: p.rpmMax, feed_mm_min: p.feed, feed_range: p.feedRange || null, engagement: p.engage ? `${p.engage.label}: ${p.engage.value} ${p.engage.unit || ''}`.trim() : null, passes: p.passes, direction: p.direction, coolant: p.coolant, projection: p.projection || null, grit_sequence: p.sequence || null, confidence: R.conf?.level, warnings: R.warnings.map(w => w.t + ': ' + w.d), notes: R.notes, data_checks: R.dataChecks || [] };
}
function aiContext() {
  const st = APP.ws, R = APP.rec; const row = R?.sfRow ? sfRow(R.sfRow) : null;
  const ctx = {
    job: { task: TASKS[st.task]?.name, feature: FEATURES[R?.inputs?.feature] || null, material: MATERIALS[st.material]?.name, material_subtype: st.sub && MATERIALS[st.material]?.subs ? MATERIALS[st.material].subs[st.sub] : null, noga_table_row: row ? `${row.id}: ${sfLabel(row)} (ISO ${row.iso})` : null, burr: TASKS[st.task]?.mode === 'deburr' ? st.burr : null, dims_mm: st.dims, machine: { type: MACHINES[st.machine.type], max_rpm: st.machine.maxRpm || null, taper: st.machine.iface || null, uneven_or_long_run: !!st.machine.uneven }, user_description: APP.askText || null, replacing_xebec: st.fromX || null },
    current_setup: compactRec(R),
    steps: R?.steps || [],
    similar_cases: (APP.matches || []).map(c => ({ id: c.id, source: c.src === 'noga' ? 'NOGA test' : 'reference application', part: c.part, material: c.mat, tool: c.tool, rpm: c.rpm, feed: c.feed, doc: c.doc, result: c.after, lesson: c.lesson })),
    customer_document: APP.doc?.ai ? { files: APP.doc.files.map(f => f.name), summary: APP.doc.ai.summary, requirements: APP.doc.ai.callouts } : null,
  };
  return JSON.stringify(ctx);
}
/* The hard facts the model is allowed to state, read straight out of the same
   tables the engine uses. Written by hand they drift: a table changes, the
   sentence describing it does not, and the model confidently quotes a figure
   the app no longer uses. Generated, that cannot happen. */
function productFacts() {
  const r = (a) => a[0] === a[1] ? String(a[0]) : a[0] + '\u2013' + a[1];
  const surf = Object.keys(SURFACE).map(Number).sort((x, y) => x - y);
  const cross = Object.keys(CROSS).map(Number).sort((x, y) => x - y);
  const point = Object.keys(POINT).map(Number).sort((x, y) => x - y);
  const disc = Object.keys(DISC).map(Number).sort((x, y) => x - y);
  const grits = GRITS.map(g => g.grit);
  const L = SURFACE_LIMITS;
  const lines = [];

  lines.push(`Surface brush: Ø${surf.join(', Ø')} mm. Grits #${grits.join(', #')}. Speed window per diameter: ` +
    surf.map(d => `Ø${d} ${fmtN(SURFACE[d].rpm[0])}\u2013${fmtN(SURFACE[d].rpm[1])}`).join(', ') + ' RPM.');
  lines.push(`Surface limits: depth of cut ${L.docPolish} polishing / ${L.docDeburr} deburring / ${L.docMax} mm absolute maximum; projection from the sleeve ${L.projMax} mm maximum; feed ${fmtN(L.feedMax)} mm/min maximum.`);
  lines.push('Each surface brush has one sleeve and its own shanks: ' +
    surf.map(d => `Ø${d} sleeve ${SURFACE[d].sleeve[0]}` + (SURFACE[d].shanks && SURFACE[d].shanks.length ? ', shanks ' + SURFACE[d].shanks.map(x => x[0]).join('/') : ', no shank')).join('; ') + '.');

  lines.push('Cross-hole brush: ' + cross.map(d => {
    const c = CROSS[d];
    const g = c.grits ? ` (grits #${c.grits.join(', #')} only)` : '';
    return `Ø${d} for bores Ø${r(c.pilot)}${c.pilotFine && String(c.pilotFine) !== String(c.pilot) ? ` coarse / Ø${r(c.pilotFine)} fine` : ''}, max ${fmtN(c.max)} RPM, Ø${c.ds} shank${g}`;
  }).join('; ') + '. Stroke = the cross hole plus 5 mm clear on each side. No depth of cut: the fibers expand by centrifugal force.');

  lines.push(`Point brush: Ø${point.join(', Ø')} mm, max ${fmtN(MAX_RPM.point)} RPM. End brush: Ø5 mm flat or 90° angled, max ${fmtN(MAX_RPM.end)} RPM. Neither is for air tools.`);
  lines.push(`Ceramic fiber disc: Ø${disc.join(', Ø')} mm, 0.8 mm thick, grits #${DISC_GRITS.join(', #')} only, max ${fmtN(MAX_RPM.disc)} RPM and run ${fmtN(MAX_RPM.discRun[0])}\u2013${fmtN(MAX_RPM.discRun[1])}. Mounts on shank UF7030 (Ø3) or UF7023 (Ø2.35). Electric spindle only, never an air tool; dress with a diamond dressing tool.`);
  lines.push('Ceramic diamond stone: Ø1\u20133 mm, grits ' + STONE_GRITS.map(g => '#' + g.grit + ' ' + g.color).join(', ') + ', max ' + fmtN(MAX_RPM.stone) + ' RPM.');
  lines.push('Fiber colour by grit: ' + GRITS.map(g => '#' + g.grit + ' ' + g.color).join(', ') + '.');

  const acc = Object.keys(ACCESSORIES);
  lines.push(`Item numbers that are not brushes (${acc.length}): ` + acc.map(k => k + ' ' + ACCESSORIES[k][0]).join('; ') + '.');
  return lines.join('\n- ');
}
/* The whole tested library, one line each. The matcher surfaces the closest few
   on screen; the model gets all of them, so it can answer "has anyone run this
   in cast iron?" from real results rather than from the tables alone. Kept to
   what was measured: tool, speed, feed, outcome. */
function caseIndex() {
  return CASES.map(c => {
    const bits = [c.part, c.mat, c.fam, String(c.tool || '').split('/')[0].trim()];
    if (c.grits && c.grits.length) bits.push('#' + c.grits.join('/#'));
    if (c.rpm) bits.push(fmtN(c.rpm) + ' rpm');
    if (c.feed && c.feed > 1) bits.push(fmtN(c.feed) + ' mm/min');
    if (c.doc) bits.push(c.doc + ' mm doc');
    return '- ' + bits.filter(Boolean).join(' | ');
  }).join('\n');
}
const AI_CASES = () => `Tested applications (${CASES.length}), from NOGA and reference work. These are measured results, not table values: when one of them disagrees with the tables, say so and prefer the tested figure, naming the case.\n` + caseIndex();

const AI_FACTS = () => 'UFIBER product data, taken from the app\'s own tables \u2014 these figures are authoritative:\n- ' + productFacts();

const AI_RULES = `UFIBER rules you can rely on:
- Surface brushes Ø6–100 cut with the fiber tips; depth of cut 0.2 polishing / 0.5 deburring / 1.2 mm absolute max; projection ≤10 mm from the sleeve; feed ≤2,000 mm/min; up-cut against side burrs; never side-load or rub walls.
- Cross-hole brushes Ø1.5–11 for bores Ø3.5–20: insert and remove only while stopped, start rotation inside the bore, stroke 5 mm past both sides of the intersection, run CW then CCW, adjust passes not stroke. Above Ø20 mm use a surface brush on a shank; below Ø3.5 a point brush.
- Point (Ø1–3) and End (Ø5) brushes: max 12,000 RPM on CNC; hand-held 1,000–3,000 RPM; electric drives only, no air tools.
- Ceramic fiber suits small burrs (≤~0.2 mm root, bendable with a fingernail); thicker burrs need a cutter first (e.g. NOGA UBURR for hole edges). Brushing always leaves a small edge radius; no mirror finish. Carbide/ceramic/glass/EDM need Ceramic Diamond Stones.
- Ceramic Diamond Stones Ø1–3 (#200 black, #400 silver, #600 forest green, #800 green): 60,000 RPM max, ≤30,000 RPM typical, contact force about 1 N and always below 5 N, no fixed feed or depth, test-run for runout first, epoxy-resin bond, pneumatic tools allowed at controlled speed.\n- Floating dampers: BT30/BT40 max 6,000 RPM, 5 mm float, about 50 N, ER25UM (BT30) or ER32UM (BT40) collet; End-type max 12,000 RPM, 4 mm float, about 20 N. Approach vertically or with arc entry/exit, preload before feed, no through-spindle coolant, don't drop into pockets.\n- Portable E-Pack UF9999: 30,000 RPM, 3.0 Ncm torque; only for End/Point brushes, discs and diamond stones; follow each tool's own max RPM.\n- NOGA case: Ø1.5 cross-hole brush #1000 in a Ø2.6 mm hole (17-4 PH) at 7,000 RPM, 100 mm/min, dry.\n- More cutting: raise RPM toward the top of the window, lower feed 10%, add a pass, coarser grit. Less aggressive / longer life: lower RPM 10%, raise feed 10%, fewer passes, finer grit, lighter engagement. Wet machining improves finish and life.
- Known NOGA data conflicts: End-brush feed/engagement appear copied from the Surface table; surface-brush material cutting speeds give lower RPM than the catalogue window (the app follows the window, as NOGA's RPM Advisor does); RPM Advisor bore ranges differ from the catalogue (the app follows the catalogue).`;
function aiTools(props) {
  const changeProps = {
    family: { type: 'string', enum: ['surface', 'shank', 'crosshole', 'point', 'end', 'endAngled', 'disc', 'diamond'] }, diameter_mm: { type: 'number' }, grit: { type: 'number', enum: GRITS.map(g => g.grit) },
    material: { type: 'string', enum: Object.keys(MATERIALS) }, material_sub: { type: 'string' }, task: { type: 'string', enum: Object.keys(TASKS) }, feature: { type: 'string', enum: Object.keys(FEATURES) },
    burr: { type: 'string', enum: ['light', 'medium', 'heavy'] }, machine_type: { type: 'string', enum: Object.keys(MACHINES) }, max_rpm: { type: 'number' }, uneven_or_long_run: { type: 'boolean' },
    main_bore_mm: { type: 'number' }, cross_hole_mm: { type: 'number' }, width_mm: { type: 'number' }, groove_mm: { type: 'number' }, depth_mm: { type: 'number' },
  };
  return [
    { name: 'try_setup', description: 'Run the UFIBER recommendation engine (NOGA data) on a variant of the current setup WITHOUT changing the page. Returns tool SKU, size, grit, RPM window, feed, engagement, passes and warnings. Use it to compare options or answer "what if" questions. Only pass the fields you want to change.', inputSchema: { type: 'object', properties: changeProps },
      execute: (input) => { const st = variantState(input); const R = recommend(st); return compactRec(R); } },
    { name: 'speeds_feeds', description: 'Look up NOGA\'s official speeds & feeds for any brush family and NOGA table material row (1–41, see material_rows in the context). Returns start RPM, ranges, feed, engagement, passes, coolant, table grits and data-check notes. For crosshole pass bore_mm.', inputSchema: { type: 'object', properties: { family: { type: 'string', enum: ['surface', 'crosshole', 'point', 'end', 'disc'] }, material_row: { type: 'number' }, grit: { type: 'number' }, size_mm: { type: 'number' }, bore_mm: { type: 'number' }, mode: { type: 'string', enum: ['deburr', 'polish'] }, hand_held: { type: 'boolean' }, worn_brush: { type: 'boolean' } }, required: ['family', 'material_row'] },
      execute: (i) => { const row = sfRow(Number(i.material_row) || 2); const mode = i.mode === 'polish' ? 'polish' : 'deburr'; const grit = Number(i.grit) || (mode === 'polish' ? row.gP[0] : row.gD.list[0]); const sz = Number(i.size_mm);
        let r; if (i.family === 'surface') r = sfSurface({ row, dia: SF_SURF_WIN[sz] ? sz : 25, grit, mode, worn: !!i.worn_brush }); else if (i.family === 'crosshole') r = sfCross({ row, bore: Number(i.bore_mm) || 8, grit, mode, worn: !!i.worn_brush }); else if (i.family === 'point') r = sfPoint({ row, dia: [1, 1.5, 2, 2.5, 3].includes(sz) ? sz : 2, mode, hand: !!i.hand_held }); else if (i.family === 'end') r = sfEnd({ row, mode, hand: !!i.hand_held }); else r = sfDisc({ row, dia: [13, 19, 22, 25, 30].includes(sz) ? sz : 22, mode });
        return { material: sfLabel(row), method: r.method || r.family, size_mm: r.size, rpm: r.rpm, rpm_range: r.rpmRange, rpm_max: r.rpmMax, feed: r.feed, feed_range: r.feedRange, engagement: r.eng, engagement_range: r.engRange, passes: r.passes, coolant: r.cool, table_grits_deburr: row.gD.list, table_grits_polish: row.gP, notes: r.notes, data_checks: r.checks, error: r.error || null }; } },
    { name: 'find_cases', description: 'Search the reference applications used for Similar applications (NOGA tests and customer-style references). Returns up to 5 with tool, parameters, result and lesson.', inputSchema: { type: 'object', properties: { text: { type: 'string' }, material: { type: 'string', enum: ['steel', 'tool', 'stainless', 'aluminum', 'hrsa', 'titanium', 'plastic'] }, family: { type: 'string', enum: ['surface', 'crosshole', 'end', 'point'] }, task: { type: 'string', enum: ['deburring', 'crosshole', 'polishing'] } } },
      execute: (i) => { const q = String(i.text || '').toLowerCase(); return CASES.filter(c => (!i.material || c.grp === i.material) && (!i.family || c.fam === i.family) && (!i.task || c.task === i.task) && (!q || JSON.stringify(c).toLowerCase().includes(q))).slice(0, 5).map(c => ({ id: c.id, source: c.src === 'noga' ? 'NOGA test' : 'reference application', part: c.part, material: c.mat, tool: c.tool, diameter: c.dia, grits: c.grits, rpm: c.rpm, feed: c.feed, doc: c.doc, result: c.after, lesson: c.lesson })); } },
    { name: 'propose_change', description: 'Show the user a one-tap button that applies a change to their setup (e.g. a different grit, size, family or machine limit). Use whenever you recommend changing the setup. The page does not change until the user taps it.', inputSchema: { type: 'object', properties: { label: { type: 'string', description: 'Button text, max 6 words, e.g. "Switch to #600"' }, changes: { type: 'object', properties: changeProps } }, required: ['label', 'changes'] },
      execute: (i) => { if (!i || !i.changes || typeof i.changes !== 'object') throw new Error('changes required'); props.push({ label: String(i.label || 'Apply change').slice(0, 40), changes: i.changes }); return 'Button shown to the user.'; } },
  ];
}
function variantState(ch = {}) {
  const st = JSON.parse(JSON.stringify(APP.ws)); st.override = { ...(st.override || {}) };
  if (ch.task && TASKS[ch.task]) { st.task = ch.task; if (TASKS[ch.task].feature) st.feature = TASKS[ch.task].feature; }
  if (ch.feature && FEATURES[ch.feature]) st.feature = ch.feature;
  if (ch.material && MATERIALS[ch.material]) { st.material = ch.material; st.sub = null; delete st.sfRow; }
  if (ch.material_sub && MATERIALS[st.material]?.subs?.[ch.material_sub]) { st.sub = ch.material_sub; delete st.sfRow; }
  if (['light', 'medium', 'heavy'].includes(ch.burr)) st.burr = ch.burr;
  if (ch.machine_type && MACHINES[ch.machine_type]) st.machine.type = ch.machine_type;
  if (Number(ch.max_rpm) > 0) st.machine.maxRpm = Number(ch.max_rpm);
  if (typeof ch.uneven_or_long_run === 'boolean') st.machine.uneven = ch.uneven_or_long_run;
  const dm = { main_bore_mm: 'main', cross_hole_mm: 'cross', width_mm: 'width', groove_mm: 'groove', depth_mm: 'depth' };
  Object.entries(dm).forEach(([k, f]) => { if (Number(ch[k]) > 0) st.dims[f] = Number(ch[k]); });
  if (ch.family) st.override.family = ch.family;
  if (Number(ch.diameter_mm) > 0) st.override.dia = Number(ch.diameter_mm);
  if (Number(ch.grit) > 0) st.override.grit = Number(ch.grit);
  if (ch.family || ch.diameter_mm || ch.grit) { const R = APP.rec; st.override.family = st.override.family || R?.family; st.override.grit = st.override.grit || R?.grit?.grit; if (!st.override.dia && R && !ch.family) st.override.dia = R.dia; }
  return st;
}
function chatSuggestions() {
  const R = APP.rec; if (!R) return [];
  const s = ['The burr is still there — what should I change first?'];
  const g = R.grit?.grit; if (g && R.family !== 'diamond') { const c = gritStep(g, -1); if (c !== g) s.push(`Compare #${c} with #${g} for this job`); }
  s.push(APP.ws.machine.maxRpm ? `Is my ${fmtN(APP.ws.machine.maxRpm)} RPM spindle enough?` : 'My spindle only reaches 6,000 RPM — does that work?');
  if (APP.doc?.ai) s.push('Does this setup meet the drawing requirements?');
  s.push('Write a short note for the machine operator');
  return s.slice(0, 4);
}
function mdLite(t) {
  let h = esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code>$1</code>');
  const lines = h.split('\n'); let out = '', inList = false;
  for (const l of lines) { const m = l.match(/^\s*(?:[-•*]|\d+[.)])\s+(.*)/); if (m) { if (!inList) { out += '<ul>'; inList = true; } out += `<li>${m[1]}</li>`; } else { if (inList) { out += '</ul>'; inList = false; } out += l.trim() ? `<p>${l}</p>` : ''; } }
  return out + (inList ? '</ul>' : '');
}
function chatPanel() {
  if (!APP.sample && !NLU.ready) return '';
  if (APP.chat.ws !== APP.ws) APP.chat = { ws: APP.ws, turns: [], busy: false, ctl: null };
  const C = APP.chat;
  const log = C.turns.map((t, ti) => t.role === 'user' ? `<div class="msg me" dir="auto">${esc(t.content)}</div>` : t.role === 'sys' ? `<div class="msg sys">${esc(t.content)}</div>` : `<div class="msg ai" dir="auto"${t.live ? ' id="chatLive"' : ''}>${t.live && !t.content ? '<span class="spinner sm"></span> Thinking…' : mdLite(t.content)}${(t.props || []).map((p, pi) => { const cur = !p.applied && propIsCurrent(p); return `<button class="btn small ${p.applied || cur ? '' : 'primary '}prop" data-prop="${ti}:${pi}"${p.applied || cur ? ' disabled' : ''}>${p.applied ? I.check + ' Applied' : cur ? I.check + ' Current setup' : 'Apply: ' + esc(p.label)}</button>`; }).join('')}${t.err ? `<div class="tiny" style="color:var(--bad)">${esc(t.err)}</div>` : ''}${t.askNoga ? `<button class="btn small" data-asknoga="1">${I.mail} ${esc('Ask a NOGA engineer')}</button>` : ''}${t.offline ? '<div class="tiny muted" style="margin-top:6px">Answered offline from the NOGA tables</div>' : ''}</div>`).join('');
  return `<section class="panel ask-panel" aria-labelledby="tAsk" style="margin-top:16px"><div class="panel-t"><h2 id="tAsk">Ask about this setup</h2><span class="tiny">${APP.sample ? 'Claude answers using this app\'s NOGA data · uses your Claude allowance' : 'Answered on your device by the built-in UFIBER model · nothing leaves this page'}</span></div>
    <div class="chat-log" id="chatLog" aria-live="polite">${log || `<p class="small muted" style="margin:0">${APP.sample ? 'Ask anything about this job, in any language — why this tool, what to change, what if your machine is different.' : 'Ask about this setup in any language — speeds, feeds, grit, holders, what to change when it is not working. Answers are built from the NOGA tables on your device.'} Suggested changes come with an Apply button.</p>`}</div>
    ${C.busy ? '' : `<div class="mini-tiles" style="margin-top:10px">${chatSuggestions().map(s => `<button class="chip" data-ask="${esc(s)}">${esc(s)}</button>`).join('')}</div>`}
    <div class="chat-in"><textarea id="chatIn" rows="1" dir="auto" placeholder="e.g. What if the burr is on the back side?"${C.busy ? ' disabled' : ''}></textarea>${C.busy ? `<button class="btn" id="chatStop">Stop</button>` : `<button class="btn primary" id="chatSend">${I.arrow}<span class="sr">Send</span></button>`}</div></section>`;
}
function renderChat() { const el = $('#chatSlot'); if (el) el.innerHTML = chatPanel(); const log = $('#chatLog'); if (log) log.scrollTop = log.scrollHeight; }
async function askClaude(question) {
  const C = APP.chat; if (C.busy || !question.trim()) return;
  if (!APP.sample) {                       // offline model answers locally
    C.turns.push({ role: 'user', content: question.trim() });
    const a = offlineAnswer(question.trim());
    const t = { role: 'assistant', content: a.md, props: a.props || [], offline: true, askNoga: !!a.ask };
    C.turns.push(t); renderChat();
    if (a.go) setTimeout(() => go(a.go), 400);
    return;
  }
  C.turns.push({ role: 'user', content: question.trim() });
  const turn = { role: 'assistant', content: '', live: true, props: [] }; C.turns.push(turn);
  C.busy = true; C.ctl = new AbortController(); renderChat();
  const history = C.turns.slice(0, -2).filter(t => t.role !== 'sys' && t.content && !t.err).slice(-6).map(t => ({ role: t.role, content: t.content }));
  const intro = `You are the UFIBER application-engineer assistant inside the NOGA MT "UFIBER Guide" app. The user is a machinist, application engineer or distributor.
Answer in the user's language. Be concise and practical (under 150 words unless asked for more), shop-floor tone, short bullets when listing steps.
NEVER invent RPM, feed, depth, item numbers or test results. Use only values in SETUP_CONTEXT or returned by your tools${APP.sampleTools ? '; call try_setup or speeds_feeds to get numbers for any alternative, and propose_change whenever you recommend changing the setup' : ''}. If something needs a NOGA engineering review, say so plainly. Mention known NOGA data conflicts only when relevant.
${AI_FACTS()}
${AI_CASES()}
${AI_RULES}
material_rows (NOGA table rows for speeds_feeds): ${SF_ROWS.map(r => r.id + '=' + r.iso + ' ' + sfLabel(r)).join('; ')}
SETUP_CONTEXT: ${aiContext()}`;
  const turns = [{ role: 'user', content: intro }, ...(history.length ? [{ role: 'assistant', content: 'Understood. I will use only the app data and tools.' }, ...history] : []), { role: 'user', content: question.trim() }];
  // turns must alternate sensibly; collapse to valid start/end on user
  const opts = { signal: C.ctl.signal, onText: ({ text }) => { turn.content = text; const el = $('#chatLive'); if (el) el.innerHTML = mdLite(text); const log = $('#chatLog'); if (log) log.scrollTop = log.scrollHeight; } };
  if (APP.sampleTools) opts.tools = aiTools(turn.props); else opts.cache = false;
  try { const r = await APP.sample(turns, opts); turn.content = r.text; if (r.truncated) turn.err = 'Answer cut short — ask for less at a time.'; }
  catch (e) {
    if (e && e.code === 'cancelled') { turn.content = e.text || turn.content || '(stopped)'; }
    else { turn.content = e && e.text ? e.text : ''; turn.err = { not_granted: 'Claude isn\'t allowed in this view.', rate_limited: 'Too many requests — try again in a minute.', refused: 'Claude couldn\'t answer that.', tools_unavailable: 'Tools are unavailable here.' }[e && e.code] || 'Something went wrong — try again.'; if (['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled'].includes(e && e.code)) APP.sample = null; if (e && e.code === 'tools_unavailable') APP.sampleTools = null; }
  } finally { turn.live = false; C.busy = false; C.ctl = null; renderChat(); }
}
function propIsCurrent(p) {
  try { const R = recommend(variantState(p.changes)); const a = APP.rec; return !!a && R.sku === a.sku && R.params.rpm === a.params.rpm && R.params.feed === a.params.feed && JSON.stringify(R.holders) === JSON.stringify(a.holders); } catch (e) { return false; }
}
function applyProposal(ti, pi) {
  const t = APP.chat.turns[ti]; const p = t?.props?.[pi]; if (!p || p.applied) return;
  const ns = variantState(p.changes); Object.keys(APP.ws).forEach(k => delete APP.ws[k]); Object.assign(APP.ws, ns);
  p.applied = true; APP.chat.turns.push({ role: 'sys', content: `Applied: ${p.label}` });
  route(true);
}

