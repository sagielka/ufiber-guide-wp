/* ============================================================
   UFIBER Guide — UI part 2: home, Ask, wizard, result
   ============================================================ */
const EXAMPLES = [
  'I have a Ø12 mm drilled hole intersecting a Ø30 mm bore in stainless steel and need to remove the burr from the intersection.',
  'Light burrs on milled edges of a 6061 aluminum housing, BT40 machining center, 12,000 rpm.',
  'Remove tool marks on a 40 mm wide 316 sealing face, target Ra 0.2.',
  'Fuzzy burrs in a 3 mm O-ring groove, 7075.',
];
const TASK_HINT = {
  deburr_mill: 'Edges and faces after milling or turning', deburr_drill: 'Entry burrs around drilled holes', crosshole: 'Where a drilled hole meets a bore',
  edge: 'Small, even radius on sharp edges', marks: 'Cutter marks, scallops, Ra targets', polish: 'Uniform finish on a face or form',
  id_finish: 'Polish or clean the inside of a bore', hard: 'Diamond stones for carbide, >55 HRC, EDM',
};
const FEATURE_GLYPH = { face: 'face', edge: 'edge2', hole: 'hole', cross: 'cross', bore: 'bore', groove: 'groove', radius: 'radius', small: 'small', thread: 'thread' };
const SUGGEST_FEATURE = { deburr_mill: 'edge', edge: 'edge', marks: 'face', polish: 'face', hard: 'small' };

function home() {
  const recent = store.get('ufg_recent', []);
  return `<section class="hero">
    <div>
      <h1 class="h1">Tell us the part. Get the tool and how to run it.</h1>
      <p class="lead" style="margin-top:12px">Describe the burr or finish problem in your own words, or answer a few quick questions. You'll get a UFIBER tool, item number and starting parameters.</p>
      <div class="ask" id="askBox">
        <label for="askT" class="sr">Describe your application</label>
        <textarea id="askT" placeholder="e.g. ${esc(EXAMPLES[0])}">${esc(APP.askText || '')}</textarea>
        <div class="dropzone" aria-hidden="true"><div>${I.clip}<b>Drop the customer's email or drawing</b><span>.eml · .msg · .txt · PDF · PNG · JPG</span></div></div>
        <div class="ask-bar"><label class="btn ghost small att-btn" for="askFile">${I.clip} Attach email or drawing</label><input type="file" id="askFile" class="sr" multiple accept=".eml,.msg,.txt,.htm,.html,.pdf,image/*,message/rfc822">
          <button class="btn primary" id="askGo">${I.find} Read my application</button></div>
      </div>
      <p class="tiny" style="margin:8px 2px 0" id="askTip">${APP.sample ? 'Type it in any language, paste it, or drag in a customer email or drawing. Claude reads it and asks only what\'s missing.' : 'Type it, paste it, or drag in a customer email or drawing. Screenshots can be pasted straight into the box.'}</p>
      <div class="examples" aria-label="Examples">${EXAMPLES.slice(1).map((e, i) => `<button class="chip" data-ex="${i + 1}">${esc(e.length > 54 ? e.slice(0, 52) + '…' : e)}</button>`).join('')}</div>
      <div id="attach"></div>
      <div id="understood"></div>
    </div>
    <div class="hero-art" aria-hidden="true">${heroArt()}</div>
  </section>
  <div class="section-t"><h2 class="h2">Or choose what you need to do</h2></div>
  <div class="tiles">${Object.entries(TASKS).map(([k, t]) => `<button class="tile" data-task="${k}"><span class="ic">${GLYPH[k]}</span><span>${t.name}<small>${TASK_HINT[k]}</small></span></button>`).join('')}</div>
  ${recent.length ? `<div class="section-t"><h2 class="h2">Your recent setups</h2><button class="btn ghost small" id="clrRecent">Clear</button></div><div class="recent">${recent.map((r, i) => `<button data-recent="${i}"><span><b class="num" style="font-size:18px">${esc(r.sku)}</b> <span class="muted small">${esc(r.label)}</span></span>${I.arrow.replace('<svg', '<svg width="18" height="18"')}</button>`).join('')}</div>` : ''}
  <div class="section-t"><h2 class="h2">Already running a brush?</h2></div>
  <div class="tiles" style="max-width:740px"><a class="tile" href="#/fix" style="text-decoration:none;color:inherit"><span class="ic">${I.fix}</span><span>Something isn't right<small>Burrs remain, fast wear, rounded edges, broken fibers — fix it step by step</small></span></a>
  <a class="tile" href="#/replace" style="text-decoration:none;color:inherit"><span class="ic">${I.swap}</span><span>Switching from XEBEC?<small>Convert XEBEC item codes to UFIBER and check your program</small></span></a></div>`;
}
function heroArt() {
  const shots = [
    ['surface', 'Surface brush', 'Flat faces and edges'],
    ['crosshole', 'Cross-hole brush', 'Inside the bore, where holes meet'],
    ['point', 'Point brush', 'Small features, tight corners'],
    ['end', 'End brush', 'Hand-held and robot finishing'],
  ];
  return `<div class="shots">${shots.map(([k, t, d]) => `<figure class="shot">
      <img src="data:image/jpeg;base64,${HERO_IMG[k]}" alt="UFIBER ${esc(t)} working on a part" width="420" height="420" loading="lazy" decoding="async">
      <figcaption><b>${esc(t)}</b><span>${esc(d)}</span></figcaption>
    </figure>`).join('')}
    <p class="shots-note">Ten grits, #150 to #6000 — the fiber color tells you which.</p></div>`;
}

/* ---------- Ask → understood panel ---------- */
function labelOf(k, st) {
  if (k === 'task') return TASKS[st.task]?.short;
  if (k === 'feature') return FEATURES[st.feature];
  if (k === 'material') { const m = MATERIALS[st.material]; return m ? m.name + (st.sub && m.subs && m.subs[st.sub] ? ` (${m.subs[st.sub].split(' (')[0]})` : '') : null; }
  return null;
}
function renderUnderstood() {
  const el = $('#understood'); if (!el || !APP.parsed) return;
  const st = APP.ws;
  const chips = [];
  const add = (key, label, val, miss) => chips.push(`<button class="u-chip${miss ? ' miss' : ''}" data-edit="${key}">${label}: <b>${esc(val || 'not found')}</b></button>`);
  add('task', 'Task', labelOf('task', st), !st.task);
  if (!(TASKS[st.task]?.feature)) add('feature', 'Feature', labelOf('feature', st), !st.feature);
  add('material', 'Material', labelOf('material', st), !st.material);
  const d = st.dims || {};
  if (d.main) chips.push(`<span class="u-chip">Bore <b>${diaOut(d.main)}</b></span>`);
  if (d.cross) chips.push(`<span class="u-chip">Cross hole <b>${diaOut(d.cross)}</b></span>`);
  if (d.width) chips.push(`<span class="u-chip">Width <b>${lenOut(d.width)} ${lenU()}</b></span>`);
  if (d.groove) chips.push(`<span class="u-chip">Groove <b>${lenOut(d.groove)} ${lenU()}</b></span>`);
  if (d.hole) chips.push(`<span class="u-chip">Hole <b>${diaOut(d.hole)}</b></span>`);
  if (APP.parsed.burr) chips.push(`<span class="u-chip">Burr <b>${st.burr}</b></span>`);
  if (APP.parsed.machine) chips.push(`<span class="u-chip">Machine <b>${esc(MACHINES[st.machine.type] || '')}${st.machine.maxRpm ? ', ' + fmtN(st.machine.maxRpm) + ' RPM' : ''}${st.machine.iface ? ', ' + st.machine.iface : ''}</b></span>`);
  if (APP.parsed.ra) chips.push(`<span class="u-chip">Ra <b>${APP.parsed.ra} µm</b></span>`);
  const missing = !st.task ? 'task' : (!st.material ? 'material' : (!st.feature && !TASKS[st.task]?.feature ? 'feature' : null));
  const aiCovers = APP.smart.questions.some(q => q.field === missing) || (APP.smart.busy && missing);
  const picker = APP.editKey || (aiCovers ? null : missing);
  let pick = '';
  if (picker === 'task') pick = `<p class="small" style="margin:12px 0 0"><b>What do you need to do?</b></p><div class="mini-tiles">${Object.entries(TASKS).map(([k, t]) => `<button class="chip${st.task === k ? ' on' : ''}" data-set="task" data-v="${k}">${t.short}</button>`).join('')}</div>`;
  if (picker === 'material') pick = `<p class="small" style="margin:12px 0 0"><b>Which material?</b></p><div class="mini-tiles">${Object.entries(MATERIALS).map(([k, m]) => `<button class="chip${st.material === k ? ' on' : ''}" data-set="material" data-v="${k}">${m.name}</button>`).join('')}</div>`;
  if (picker === 'feature') pick = `<p class="small" style="margin:12px 0 0"><b>Where is the feature?</b></p><div class="mini-tiles">${Object.entries(FEATURES).filter(([k]) => k !== 'cross' && k !== 'bore').map(([k, f]) => `<button class="chip${st.feature === k ? ' on' : ''}" data-set="feature" data-v="${k}">${f}</button>`).join('')}</div>`;
  el.innerHTML = `<div class="understood fade-in"><b>${APP.doc?.ai ? 'Here\'s what Claude read' : 'Here\'s what I understood'}</b> <span class="tiny">— tap anything to change it</span>
    <div class="u-list">${chips.join('')}</div>${smartBlock()}${pick}
    <div class="row" style="margin-top:12px">${missing ? `<span class="small muted">${APP.smart.busy ? 'Claude is filling in the gaps…' : 'One more answer and you\'re set.'}</span>` : `<button class="btn primary" id="goRes">Show my setup ${I.arrow}</button>`}
    <button class="btn ghost small" id="goWiz">Refine step by step</button>
    <button class="btn ghost small" id="goClear" title="Empty the box and forget everything read so far">Clear</button></div></div>`;
}
function doAsk(text, opt = {}) {
  APP.askText = text;
  APP.smart.ctl?.abort(); APP.smart = { busy: false, err: null, summary: '', questions: [], checked: false, snap: null, ctl: null };
  const p = parseText(text); APP.parsed = p; APP.editKey = null;
  const st = newState();
  Object.assign(st, { task: p.task || null, feature: p.feature || (p.task && SUGGEST_FEATURE[p.task]) || null, material: p.material || null, sub: p.sub || null, burr: p.burr || 'light' });
  st.dims = p.dims || {};
  if (p.machine) Object.assign(st.machine, p.machine);
  if (p.ra) st.dims.ra = p.ra;
  // Offline domain model fills whatever the keyword rules did not catch.
  if (NLU.ready) {
    try {
      const before = JSON.stringify(smartFields(st));
      const r = NLU.toState(text, st);
      dedupeDims(st);
      if (r) {
        APP.nlu = r.pred;
        if (JSON.stringify(smartFields(st)) !== before) APP.parsed = { ...(APP.parsed || {}), nlu: true };
      }
    } catch (e) { }
  }
  APP.ws = st; renderUnderstood();
  if (opt.ai !== false) smartRead(text);
}

/* ---------- wizard ---------- */
function wizSteps(st) { const s = ['task']; if (!TASKS[st.task]?.feature) s.push('feature'); s.push('material', 'dims', 'machine'); return s; }
function wizard() {
  const st = APP.ws; const steps = wizSteps(st); const k = Math.min(APP.wizI || 0, steps.length - 1); const step = steps[k];
  const crumbs = [];
  if (st.task && step !== 'task') crumbs.push(`<button class="chip" data-goto="task">${TASKS[st.task].short}</button>`);
  if (st.feature && steps.indexOf('feature') > -1 && steps.indexOf(step) > steps.indexOf('feature')) crumbs.push(`<button class="chip" data-goto="feature">${FEATURES[st.feature]}</button>`);
  if (st.material && steps.indexOf(step) > steps.indexOf('material')) crumbs.push(`<button class="chip" data-goto="material">${MATERIALS[st.material].name}</button>`);
  let body = '';
  if (step === 'task') body = `<h1 class="wiz-q">What are you trying to do?</h1><div class="tiles" style="margin-top:14px">${Object.entries(TASKS).map(([key, t]) => `<button class="tile" data-pick="task" data-v="${key}" aria-pressed="${st.task === key}"><span class="ic">${GLYPH[key]}</span><span>${t.name}<small>${TASK_HINT[key]}</small></span></button>`).join('')}</div>`;
  if (step === 'feature') { const sug = st.feature || SUGGEST_FEATURE[st.task]; body = `<h1 class="wiz-q">Where is the feature?</h1><div class="tiles" style="margin-top:14px">${Object.entries(FEATURES).map(([key, f]) => `<button class="tile" data-pick="feature" data-v="${key}" aria-pressed="${sug === key}"><span class="ic">${GLYPH[FEATURE_GLYPH[key]]}</span><span>${f}</span></button>`).join('')}</div>`; }
  if (step === 'material') {
    const m = MATERIALS[st.material];
    body = `<h1 class="wiz-q">Workpiece material</h1><div class="tiles" style="margin-top:14px">${Object.entries(MATERIALS).map(([key, mm]) => `<button class="tile" data-pick="material" data-v="${key}" aria-pressed="${st.material === key}"><span class="ic">${matIc(key)}</span><span>${mm.name}${mm.iso !== '?' ? `<small>ISO ${mm.iso}</small>` : ''}</span></button>`).join('')}</div>
    ${m && m.subs ? `<div class="field" style="max-width:760px"><label>Which kind? <span class="muted small">(optional — sharpens the grit choice)</span></label><div class="seg">${Object.entries(m.subs).map(([sk, sv]) => `<button data-sub="${sk}" aria-pressed="${st.sub === sk}">${sv}</button>`).join('')}</div></div>
    <div class="wiz-foot"><button class="btn ghost" data-nav="back">${I.back} Back</button><button class="btn primary" data-nav="next">Continue ${I.arrow}</button></div>` : ''}`;
  }
  if (step === 'dims') body = dimsStep(st);
  if (step === 'machine') body = machineStep(st);
  const showFoot = !(step === 'material' && MATERIALS[st.material]?.subs) && (step === 'dims' || step === 'machine' || k > 0);
  return `<div class="wiz-head"><button class="btn ghost small" data-nav="back" aria-label="Back">${I.back}</button><div class="steps" aria-label="Step ${k + 1} of ${steps.length}">${steps.map((s, i) => `<span class="${i < k ? 'done' : i === k ? 'cur' : ''}"></span>`).join('')}</div><span class="tiny">${k + 1} / ${steps.length}</span></div>
    ${crumbs.length ? `<div class="crumbs">${crumbs.join('')}</div>` : ''}
    <div class="fade-in">${body}</div>
    ${showFoot && step !== 'dims' && step !== 'machine' && !(step === 'material' && MATERIALS[st.material]?.subs) ? `<div class="wiz-foot"><button class="btn ghost" data-nav="back">${I.back} Back</button>${(step === 'feature' && (st.feature || SUGGEST_FEATURE[st.task])) || (step === 'task' && st.task) || (step === 'material' && st.material) ? `<button class="btn" data-nav="next">Keep my choice ${I.arrow}</button>` : ''}</div>` : ''}`;
}
const BURR_SVG = {
  light: '<svg viewBox="0 0 120 44"><rect x="6" y="22" width="80" height="18" fill="var(--line)"/><path d="M86 22l5-3-3 3z" fill="var(--bad)"/></svg>',
  medium: '<svg viewBox="0 0 120 44"><rect x="6" y="22" width="80" height="18" fill="var(--line)"/><path d="M86 22l9-7-2 7z" fill="var(--bad)"/></svg>',
  heavy: '<svg viewBox="0 0 120 44"><rect x="6" y="22" width="80" height="18" fill="var(--line)"/><path d="M86 22l14-14 1 6-6 8z" fill="var(--bad)"/></svg>',
};
function numField(id, label, val, hint, unit = lenU()) { return `<div class="field"><label for="${id}">${label}</label><div class="inp"><input id="${id}" inputmode="decimal" type="number" step="any" min="0" value="${val}" placeholder="—"/><span>${unit}</span></div>${hint ? `<span class="hint">${hint}</span>` : ''}</div>`; }
function dimsStep(st) {
  const f = TASKS[st.task]?.feature || st.feature; const d = st.dims || {}; const mode = TASKS[st.task]?.mode;
  let h = `<h1 class="wiz-q">Feature size</h1><p class="muted">Rough numbers are fine. Leave blank if you don't know — the guide will assume a typical size and tell you.</p>`;
  if (f === 'cross') h += numField('dMain', 'Main bore diameter (the hole the brush enters)', lenVal(d.main), 'Sets the brush size. Cross-hole brushes cover Ø3.5–20 mm bores.') + numField('dCross', 'Cross-hole diameter', lenVal(d.cross), 'Should be smaller than the main bore.') + numField('dDepth', 'Depth from entry to the intersection (optional)', lenVal(d.depth), 'Checks that the brush can reach.');
  else if (f === 'bore') h += numField('dMain', 'Bore diameter', lenVal(d.main), '') + numField('dDepth', 'Bore depth (optional)', lenVal(d.depth), '');
  else if (f === 'hole') h += numField('dHole', 'Hole diameter', lenVal(d.hole), '') + numField('dW', 'Width of the area with holes (optional)', lenVal(d.width), 'For a field of holes, the brush covers them in passes.');
  else if (f === 'groove') h += numField('dG', 'Groove or slot width', lenVal(d.groove), 'The tool must be narrower than this.') + numField('dDepth', 'Groove depth (optional)', lenVal(d.depth), '');
  else if (f === 'small') h += numField('dW', 'Feature width', lenVal(d.width), 'Under 5 mm → Point brush; 5 mm and up → End brush.');
  else h += numField('dW', f === 'edge' ? 'Width of the edge band or wall (optional)' : 'Width of the surface to treat', lenVal(d.width), 'Brush diameter ≈ 1.5–2× this width.');
  if (mode === 'deburr') h += `<div class="field" style="max-width:640px"><label>How big is the burr?</label><div class="burr-pick">${[['light', 'Light', 'Bends with a fingernail'], ['medium', 'Medium', 'Visible, a bit stiff'], ['heavy', 'Heavy', 'Thick, >0.2 mm at the root']].map(([k, t, s]) => `<button data-burr="${k}" aria-pressed="${st.burr === k}">${BURR_SVG[k]}<span><b>${t}</b><br><span class="small muted">${s}</span></span></button>`).join('')}</div></div>`;
  else h += numField('dRa', 'Target Ra (optional)', d.ra ?? '', 'Below ~Ra 0.1 µm needs a fine-grit sequence and more passes.', 'µm');
  h += `<div class="wiz-foot"><button class="btn ghost" data-nav="back">${I.back} Back</button><div class="row"><button class="btn ghost" data-nav="next">Skip</button><button class="btn primary" data-nav="next" data-save="dims">Continue ${I.arrow}</button></div></div>`;
  return h;
}
function machineStep(st) {
  const m = st.machine;
  return `<h1 class="wiz-q">Machine</h1><div class="tiles" style="margin-top:14px">${Object.entries(MACHINES).map(([k, v]) => `<button class="tile" data-mach="${k}" aria-pressed="${m.type === k}"><span class="ic">${GLYPH[k]}</span><span>${v}</span></button>`).join('')}</div>
  ${m.type !== 'hand' ? numField('mRpm', 'Maximum spindle RPM (optional)', m.maxRpm ?? '', 'If the brush needs more than your spindle gives, the guide adjusts.', 'RPM') : ''}
  ${m.type === 'mc' ? `<div class="field"><label>Spindle taper <span class="muted small">(for a floating damper)</span></label><div class="seg">${['BT30', 'BT40', 'other'].map(x => `<button data-iface="${x}" aria-pressed="${m.iface === x}">${x === 'other' ? 'Other / not sure' : x}</button>`).join('')}</div></div>` : ''}
  ${m.type !== 'hand' ? `<div class="field"><label>Cast, uneven or long-run part?</label><div class="seg"><button data-uneven="1" aria-pressed="${!!m.uneven}">Yes — add a floating damper</button><button data-uneven="0" aria-pressed="${!m.uneven}">No</button></div><span class="hint">A damper keeps contact pressure constant as the surface varies or the brush wears.</span></div>` : ''}
  <div class="wiz-foot"><button class="btn ghost" data-nav="back">${I.back} Back</button><button class="btn primary" data-nav="result" data-save="machine">Show my setup ${I.arrow}</button></div>`;
}
function saveDims() {
  const st = APP.ws; const d = st.dims = st.dims || {};
  const g = id => $('#' + id) ? lenIn($('#' + id).value) : undefined;
  [['dMain', 'main'], ['dCross', 'cross'], ['dDepth', 'depth'], ['dHole', 'hole'], ['dW', 'width'], ['dG', 'groove']].forEach(([id, k]) => { const v = g(id); if (v !== undefined) d[k] = v; });
  if ($('#dRa')) d.ra = parseFloat($('#dRa').value) || null;
}
function saveMachine() { if ($('#mRpm')) APP.ws.machine.maxRpm = parseFloat($('#mRpm').value) || null; }

/* ---------- result ---------- */
function shareText() {
  const st = APP.ws, r = APP.rec;
  const d = st.dims || {};
  const dims = Object.entries(d).filter(([, v]) => v != null).map(([k, v]) => `${k} ${v} mm`).join(', ');
  return [
    APP.askText ? `What I described: ${APP.askText}` : '',
    `Job: ${st.task ? (TASKS[st.task]?.name || st.task) : 'not set'}${st.material ? ' in ' + (MATERIALS[st.material]?.name || st.material) : ''}`,
    dims ? `Sizes: ${dims}` : '',
    r ? `The guide suggested: ${r.sku} ${r.desc || ''}` : '',
    '', 'What actually happened (please fill in):', '- Tool used:', '- Speed / feed:', '- Result:',
  ].filter(Boolean).join('\n');
}
function openShare() {
  const pre = shareText();
  $('#shareBox').innerHTML = `
    <div class="panel" style="padding:14px;margin-top:6px">
      <b>This is exactly what will be sent</b>
      <p class="tiny mu" style="margin:4px 0 8px">Nothing is sent until you press Send. Edit or delete anything you do not want to share — remove customer names and part numbers if they are confidential.</p>
      <textarea id="shareT" class="inp" rows="9" style="width:100%;font-family:inherit">${esc(pre)}</textarea>
      <input id="shareC" class="inp" style="width:100%;margin-top:8px" placeholder="Your name or e-mail, only if you want a reply (optional)">
      <div style="margin-top:10px;display:flex;gap:8px;align-items:center">
        <button class="btn" id="shareGo">Send to NOGA</button>
        <button class="btn small" id="shareCancel">Cancel</button>
        <span class="tiny mu" id="shareMsg"></span>
      </div>
    </div>`;
  $('#shareGo').onclick = async () => {
    const body = $('#shareT').value.trim();
    if (!body) { $('#shareMsg').textContent = 'Nothing to send.'; return; }
    $('#shareGo').disabled = true; $('#shareMsg').textContent = 'Sending…';
    const ok = await USAGE.share(body, $('#shareC').value, APP.ws, APP.rec);
    $('#shareBox').innerHTML = ok
      ? '<p class="small">Sent — thank you. Real applications are what make the guide better.</p>'
      : '<p class="small">That did not go through. Nothing was sent; you can copy the text and e-mail it instead.</p>';
  };
  $('#shareCancel').onclick = () => renderRec();
}
/* Start again. Everything read from the text, the attachments and the AI goes;
   the machine and the unit setting stay, because those describe the shop rather
   than this one job. */
function clearAsk() {
  APP.smart.ctl?.abort();
  const machine = APP.ws?.machine;
  APP.ws = newState();
  if (machine) APP.ws.machine = machine;
  APP.askText = ''; APP.parsed = null; APP.editKey = null; APP.rec = null; APP.matches = [];
  APP.nlu = null; APP.doc = null;
  APP.smart = { busy: false, err: null, summary: '', questions: [], checked: false, snap: null, ctl: null };
  const ta = $('#askT'); if (ta) { ta.value = ''; }
  rerender();
  const again = $('#askT'); if (again) again.focus();
}
function computeRec() { dedupeDims(APP.ws); APP.rec = recommend(APP.ws); APP.matches = matchCases(APP.rec, APP.ws, CASES);
  try { USAGE.track('recommendation', APP.ws, APP.rec); } catch (e) { }
  return APP.rec; }
function saveRecent(R) {
  const st = APP.ws; const label = `${TASKS[st.task]?.short || ''} · ${MATERIALS[st.material]?.name || ''}`.replace(' · ', ', ');
  let list = store.get('ufg_recent', []).filter(x => x.sku !== R.sku || x.label !== label);
  list.unshift({ sku: R.sku, label, st: JSON.parse(JSON.stringify(st)) }); store.set('ufg_recent', list.slice(0, 5));
}
function result() {
  const st = APP.ws; if (!st || !st.task) return `<h1 class="h2" style="font-size:34px">No setup yet</h1><p class="muted">Describe your application or pick a task first.</p><a class="btn primary" href="#/">Find a tool ${I.arrow}</a>`;
  const R = computeRec(); saveRecent(R);
  const p = R.params; const adj = st.override && Object.keys(st.override).length;
  const mMax = st.machine?.maxRpm;
  const engageV = typeof p.engage.value === 'number' ? (p.engage.unit === 'mm' ? lenOut(p.engage.value) : p.engage.value) : esc(p.engage.value);
  const engageU = typeof p.engage.value === 'number' && p.engage.unit === 'mm' ? lenU() : esc(p.engage.unit || '');
  const est = p.est ? '<span class="est" title="Starting estimate — NOGA has not published this value">EST</span>' : '';
  const summary = `${R.familyName}, ${diaOut(R.dia)}, #${R.grit.grit} for ${(MATERIALS[st.material]?.name || 'your material').toLowerCase()}.`;
  const gritsAvail = R.family === 'diamond' ? STONE_GRITS : (R.family === 'disc' ? GRITS.filter(g => g.grit <= 1000) : (R.family === 'crosshole' && R.dia === 11 ? GRITS.filter(g => [600, 800, 1000].includes(g.grit)) : GRITS));
  const diasAvail = R.family === 'surface' || R.family === 'shank' ? [6, 15, 25, 40, 60, 100] : R.family === 'crosshole' ? [1.5, 3, 5, 7, 11] : R.family === 'point' ? [1, 1.5, 2, 2.5, 3] : R.family === 'disc' ? [13, 19, 22, 25, 30] : [];
  return `<div class="res-top">
    <div><p class="tiny" style="margin:0"><a href="#/find" data-nav="edit">← Edit answers</a></p><h1 class="h2" style="font-size:34px;margin-top:4px">Your starting setup</h1><p class="muted" style="margin:4px 0 0">${esc(summary)}</p></div>
    <div class="row"><span class="badge ${R.conf.level}" title="${esc(R.conf.reasons.join(' '))}">${R.conf.level === 'high' ? I.check.replace('<svg', '<svg width="14" height="14"') : I.info.replace('<svg', '<svg width="14" height="14"')} ${R.conf.level === 'high' ? 'High' : R.conf.level === 'medium' ? 'Medium' : 'Low'} confidence</span>${st.fromX ? `<span class="badge adj">${I.swap.replace('<svg', '<svg width="14" height="14"')} Replacing XEBEC ${esc(st.fromX)}</span>` : (adj ? '<span class="badge adj">Adjusted by you</span>' : '')}</div>
  </div>
  ${R.warnings.map(w => `<div class="callout warn">${I.warn}<div><b>${esc(w.t)}</b>${esc(w.d)}</div></div>`).join('')}
  <div class="grid2" style="margin-top:14px">
    <div>
      <section class="panel" aria-labelledby="tTool">
        <div class="panel-t"><h2 id="tTool">Recommended tool</h2></div>
        <div class="toolcard">
          <div class="toolart">${brushArt(R.family, R.grit.hex, { label: R.familyName })}</div>
          <div>
            <div class="fam">${esc(R.familyName)}</div>
            <div class="sku num">${esc(R.sku)}</div>
            <div class="desc">${esc(R.desc)}</div>
            <dl class="spec"><dt>Diameter</dt><dd class="num" style="font-size:18px">${diaOut(R.dia)} ${isIn() ? '' : 'mm'}</dd><dt>Grit</dt><dd><span class="gdot" style="background:${R.grit.hex}"></span>#${R.grit.grit} ${esc(R.grit.color.toLowerCase())}</dd>${p.sequence ? `<dt>Sequence</dt><dd>${p.sequence.map(g => '#' + g).join(' → ')}</dd>` : ''}</dl>
          </div>
        </div>
        <div class="holders">${R.holders.map(h => `<div><span class="role">${esc(h.role)}</span><span>${h.sku !== '—' ? `<b>${esc(h.sku)}</b> ` : ''}<span class="small">${esc(h.desc)}</span></span></div>`).join('')}</div>
      </section>
      <section class="panel" aria-labelledby="tPar">
        <div class="panel-t"><h2 id="tPar">Starting parameters</h2><span class="tiny">Start here, then optimize</span></div>
        <div class="readouts">
          <div class="ro wide"><div class="k">Spindle speed${est}</div><div class="v">${fmtN(p.rpm)}<small>RPM</small></div>${p.vc ? `<div class="n">≈ ${fmtN(isIn() ? p.vc * 3.281 : p.vc)} ${isIn() ? 'SFM' : 'm/min'} at the brush tip</div>` : ''}<div class="gauge">${gauge(p, mMax)}</div><div class="n">Green band: working window for this tool. Raise speed toward the top if burrs remain; lower it to save the brush.</div></div>
          <div class="ro"><div class="k">Feed</div><div class="v">${p.feed ? feedOut(p.feed) : (p.feedNote ? 'Not set' : 'By hand')}${p.feed ? `<small>${feedU()}</small>` : ''}</div>${p.feedMax ? `<div class="n">Catalogue max ${feedOut(p.feedMax)} ${feedU()}</div>` : (p.feedNote ? `<div class="n">${esc(p.feedNote)}</div>` : '')}</div>
          <div class="ro"><div class="k">${esc(p.engage.label)}</div><div class="v">${engageV}<small>${engageU}</small></div><div class="n">${esc(p.engage.note || '')}</div></div>
          <div class="ro"><div class="k">Passes</div><div class="v">${esc(p.passes)}</div></div>
          <div class="ro txt"><div class="k">Direction</div><div class="v">${esc(p.direction)}</div></div>
          ${p.projection ? `<div class="ro txt"><div class="k">Brush projection</div><div class="v">${isIn() ? '0.394 in (max) from the sleeve' : esc(p.projection)}</div></div>` : ''}
          <div class="ro txt"><div class="k">Coolant</div><div class="v">${esc(p.coolant)}</div></div>
        </div>
        ${R.notes.map(n => `<div class="callout note">${I.info}<div>${esc(n)}</div></div>`).join('')}
        ${R.dataChecks && R.dataChecks.length ? `<div class="callout warn">${I.warn}<div><b>Data check</b>${R.dataChecks.map(c => `<p style="margin:4px 0 0">${esc(c)}</p>`).join('')}</div></div>` : ''}
        ${['surface', 'shank', 'crosshole', 'point', 'end', 'endAngled', 'disc'].includes(R.family) ? `<p style="margin:12px 0 0"><button class="btn small" id="toSF">${I.gauge} Full speeds & feeds for this tool</button></p>` : ''}
        <p class="disclaim">These are <b>starting parameters</b>. Run a test part, then adjust one setting at a time. Never exceed the tool's maximum RPM.</p>
      </section>
    </div>
    <div>
      <section class="panel" aria-labelledby="tHow">
        <div class="panel-t"><h2 id="tHow">How to run it</h2></div>
        <div class="diagram" id="dgWrap">${diagramFor(R)}</div>
        ${R.diagram === 'crosshole' ? `<div class="dg-ctl"><div class="row"><button class="btn small" id="cbPrev" aria-label="Previous step">${I.back}</button><button class="btn small primary" id="cbPlay">${I.play} Play</button><button class="btn small" id="cbNext" aria-label="Next step">${I.arrow}</button></div></div><div class="dg-cap" id="dgCap" aria-live="polite"></div>` : ''}
        <ol class="stepsol" id="stepList">${R.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>
      </section>
    </div>
  </div>
  <section class="panel" aria-labelledby="tWhy" style="margin-top:16px"><div class="panel-t"><h2 id="tWhy">Why this tool?</h2></div><div class="why">${R.why.map(w => `<div><b>${esc(w.t)}</b>${esc(w.d)}</div>`).join('')}</div></section>
  <div id="chatSlot" class="no-print"></div>
  <div class="grid2" style="margin-top:16px">
    <section class="panel" aria-labelledby="tWatch"><div class="panel-t"><h2 id="tWatch">Common mistakes to avoid</h2></div><ul class="watch">${R.watch.map(w => `<li>${I.x}<span>${esc(w)}</span></li>`).join('')}</ul></section>
    <section class="panel" aria-labelledby="tCase"><div class="panel-t"><h2 id="tCase">Similar applications</h2></div>
      ${(() => {
        const g = APP.rec?.grit?.grit;
        const tried = [...new Set((APP.matches || []).flatMap(c => c.grits || []).filter(x => x && x !== g))];
        return (g && tried.length) ? `<div class="callout note" style="margin-bottom:10px">${I.info}<div><b>Tested applications used ${tried.map(x => '#' + x).join(' and ')}, not #${g}.</b><span class="small">#${g} is where the tables start you. A grit that has been proven on a part like yours is the better bet — cut a test part and let the result decide.</span></div></div>` : '';
      })()}
      ${APP.matches.length ? `<div class="match">${APP.matches.map(c => `<div class="casemini"><div><span class="tested">${I.check} Similar application successfully tested</span><div style="font-weight:600;margin-top:2px">${esc(c.part)} <span class="muted small">· ${esc(c.mat)}</span></div><div class="small muted">${esc(c.tool.split(',')[0])}${c.rpm ? ` · ${fmtN(c.rpm)} RPM` : ''}${c.feed && c.feed > 1 ? ` · ${feedOut(c.feed)} ${feedU()}` : ''}</div>${c.after ? `<div class="small" style="margin-top:2px">${esc(c.after)}</div>` : ''}</div></div>`).join('')}</div>` : `<p class="muted small">No close match yet. That's normal for new applications.</p>`}
      ${USAGE.available ? `<div id="shareBox" style="margin-top:12px">
        <button class="btn small" id="shareOpen">Send this application to NOGA</button>
        <span class="tiny mu" style="margin-left:8px">Helps NOGA improve the guide. You see exactly what is sent.</span>
      </div>` : ''}
    </section>
  </div>
  <section class="panel adjust-panel" aria-labelledby="tAdj" style="margin-top:16px"><div class="panel-t"><h2 id="tAdj">Adjust the recommendation</h2>${adj ? '<button class="btn small" id="resetOv">Back to recommended</button>' : ''}</div>
    <div class="adjust">
      <div><div class="small muted" style="margin-bottom:6px">Grit</div><div class="gritrow">${gritsAvail.map(g => `<button data-ovgrit="${g.grit}" aria-pressed="${R.grit.grit === g.grit}"><span class="gdot" style="background:${g.hex}"></span>#${g.grit}</button>`).join('')}</div></div>
      ${diasAvail.length ? `<div><div class="small muted" style="margin-bottom:6px">Diameter</div><div class="gritrow">${diasAvail.map(dd => `<button data-ovdia="${dd}" aria-pressed="${R.dia === dd}">${diaOut(dd)}</button>`).join('')}</div></div>` : ''}
    </div>
    ${R.alts.length ? `<div style="margin-top:14px" class="alts-panel"><div class="small muted" style="margin-bottom:6px">Alternatives</div><div class="alts">${R.alts.map((a, i) => a.ext ? `<a class="alt" style="text-decoration:none;color:inherit" href="https://www.noga.com/nogamt/uburr-cnc-deburring-tool/" target="_blank" rel="noopener"><b>${esc(a.label)} ↗</b><span>${esc(a.note)}</span></a>` : `<button class="alt" data-alt="${i}"><b>${esc(a.label)}</b><span>${esc(a.note)}</span></button>`).join('')}</div></div>` : ''}
  </section>
  <div class="actions"><a class="btn primary" href="#/fix" id="toFix">${I.fix} Not working? Troubleshoot this setup</a><button class="btn" id="copySheet">${I.copy} Copy setup sheet</button><button class="btn" id="copyLink">${I.link} Copy link to this setup</button>${inFrame() && !EMB ? '' : `<button class="btn" id="printSheet">${I.print} Print</button>`}<button class="btn" id="mailEng">${I.mail} Ask a NOGA engineer</button></div><div id="mailSlot"></div><div id="copySlot"></div>`;
}
function setupText(R, extra = '') {
  const st = APP.ws, p = R.params, d = st.dims || {};
  const L = [];
  L.push('UFIBER SETUP SHEET'); L.push('');
  L.push(`Task: ${TASKS[st.task]?.name || ''}`); L.push(`Feature: ${FEATURES[R.inputs.feature] || ''}`);
  L.push(`Material: ${MATERIALS[st.material]?.name || ''}${st.sub && MATERIALS[st.material]?.subs ? ' — ' + MATERIALS[st.material].subs[st.sub] : ''}`);
  const dims = Object.entries(d).filter(([, v]) => v).map(([k, v]) => `${k} ${v}${k === 'ra' ? ' µm' : ' mm'}`).join(', '); if (dims) L.push(`Dimensions: ${dims}`);
  if (TASKS[st.task]?.mode === 'deburr') L.push(`Burr: ${st.burr}`);
  L.push(`Machine: ${MACHINES[st.machine.type]}${st.machine.maxRpm ? ', max ' + st.machine.maxRpm + ' RPM' : ''}${st.machine.iface ? ', ' + st.machine.iface : ''}`);
  L.push(''); L.push(`TOOL: ${R.sku}  ${R.desc}  (${R.familyName}, Ø${R.dia} mm, #${R.grit.grit} ${R.grit.color})`);
  R.holders.forEach(h => L.push(`${h.role}: ${h.sku !== '—' ? h.sku + ' ' : ''}${h.desc}`));
  L.push(''); L.push(`RPM: ${p.rpm} (window ${p.rpmLo}–${p.rpmHi}, max ${p.rpmMax})${p.est ? ' [estimate]' : ''}`);
  L.push(`Feed: ${p.feed ? p.feed + ' mm/min' : 'by hand'}`); L.push(`${p.engage.label}: ${p.engage.value} ${p.engage.unit || ''}`);
  L.push(`Passes: ${p.passes}`); L.push(`Direction: ${p.direction}`); if (p.projection) L.push(`Projection: ${p.projection}`); L.push(`Coolant: ${p.coolant}`);
  if (p.sequence) L.push(`Grit sequence: ${p.sequence.map(g => '#' + g).join(' > ')}`);
  L.push(''); L.push('STEPS'); R.steps.forEach((s, i) => L.push(`${i + 1}. ${s}`));
  if (R.warnings.length) { L.push(''); L.push('CHECK'); R.warnings.forEach(w => L.push(`- ${w.t}: ${w.d}`)); }
  if (st.fromX) { L.push(''); L.push(`Replacing XEBEC ${st.fromX}`); }
  const doc = typeof docSummaryText === 'function' ? docSummaryText() : ''; if (doc) { L.push(''); L.push(doc); }
  if (extra) { L.push(''); L.push(extra); }
  L.push(''); L.push('Starting parameters only — validate on a test part.');
  return L.join('\n');
}
function mailParts(R, extra = '') {
  const st = APP.ws;
  const subject = `UFIBER application review: ${TASKS[st.task]?.short || ''}, ${MATERIALS[st.material]?.name || ''}`;
  const body = `Hello NOGA MT team,\n\nPlease review this application. Volume, current process and photos can be attached.\n\n${setupText(R, extra)}\n\nCompany:\nAnnual volume:\nCurrent process / tool:\nFinish requirement:\n`;
  return { subject, body };
}
function mailPanel(subject, body) {
  const href = `mailto:noga@noga.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  APP.mailText = `To: noga@noga.com\nSubject: ${subject}\n\n${body}`;
  return `<section class="panel fade-in" style="margin-top:14px" aria-labelledby="mailT"><div class="panel-t"><h2 id="mailT">Message for a NOGA application engineer</h2></div>
    <p class="small muted" style="margin-top:0">Send to <b>noga@noga.com</b>. Add a photo of the burr and your annual volume if you can.</p>
    <textarea class="mailbox" readonly aria-label="Email message">${esc(APP.mailText)}</textarea>
    <div class="row" style="margin-top:10px"><button class="btn primary" id="copyMail">${I.copy} Copy message</button><a class="btn" href="${href}" target="_blank" rel="noopener">${I.mail} Open in email app</a></div></section>`;
}
function mailtoFor(R, extra = '') {
  const st = APP.ws;
  const subj = `UFIBER application review: ${TASKS[st.task]?.short || ''}, ${MATERIALS[st.material]?.name || ''}`;
  const body = `Hello NOGA MT team,\n\nPlease review this application. Volume, current process and photos can be attached.\n\n${setupText(R, extra)}\n\nCompany:\nAnnual volume:\nCurrent process / tool:\nFinish requirement:\n`;
  return `mailto:noga@noga.com?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}`;
}

