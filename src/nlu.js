/* ============================================================
   UFIBER Guide — offline domain model (no API, no network)

   A small multi-head classifier trained on UFIBER domain data:
     intent | task | feature | material | sub | burr | machine | numrole
   It understands what the person wrote. Every number it answers with
   still comes from the NOGA engine in engine.js / sf.js.

   The featuriser below must stay byte-identical to nlu/feat.py.
   ============================================================ */
const NLU = (() => {
  const DIM = 1 << 18;
  const NUMRE = /[0-9]+(?:[.,][0-9]+)?/g;
  const KEEP = /[^0-9a-z\u00c0-\u024f\u0370-\u03ff\u0400-\u04ff\u0590-\u05ff\u0600-\u06ff\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af#\u00d8]+/g;

  function normalize(s) {
    s = (s || '').normalize('NFKC').toLowerCase().replace(/\u00f8/g, '\u00d8');
    s = s.replace(/[0-9]+(?:[.,][0-9]+)?/g, '0').replace(KEEP, ' ');
    return s.split(' ').filter(Boolean).join(' ');
  }
  function fnv(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h = (h ^ s.charCodeAt(i)) >>> 0; h = Math.imul(h, 16777619) >>> 0; }
    return h;
  }
  function features(text) {
    const n = normalize(text), out = new Set();
    if (!n) return out;
    const toks = n.split(' ');
    for (let i = 0; i < toks.length; i++) {
      out.add(fnv('w:' + toks[i]) % DIM);
      if (i + 1 < toks.length) out.add(fnv('b:' + toks[i] + '_' + toks[i + 1]) % DIM);
    }
    const p = '^' + n + '$';
    for (const k of [2, 3, 4, 5]) for (let i = 0; i + k <= p.length; i++) out.add(fnv('c:' + p.substr(i, k)) % DIM);
    return out;
  }
  function numContext(text, a, b) {
    const before = text.slice(Math.max(0, a - 28), a), after = text.slice(b, b + 28), val = text.slice(a, b);
    const ids = new Set();
    const bt = normalize(before).split(' ').slice(-3), at = normalize(after).split(' ').slice(0, 3);
    const btr = bt.slice().reverse();
    for (let i = 0; i < btr.length; i++) if (btr[i]) ids.add(fnv('B' + i + ':' + btr[i]) % DIM);
    for (let i = 0; i < at.length; i++) if (at[i]) ids.add(fnv('A' + i + ':' + at[i]) % DIM);
    ids.add(fnv('BB:' + bt.join(' ')) % DIM);
    ids.add(fnv('AA:' + at.join(' ')) % DIM);
    const nb = normalize(before), na = normalize(after);
    for (const k of [2, 3, 4]) {
      const tail = nb.slice(-k), head = na.slice(0, k);
      if (tail) ids.add(fnv('b' + k + ':' + tail) % DIM);
      if (head) ids.add(fnv('a' + k + ':' + head) % DIM);
    }
    const v = parseFloat(val.replace(',', '.')) || 0;
    const mag = v < 1 ? 0 : v < 3.5 ? 1 : v < 12 ? 2 : v < 30 ? 3 : v < 100 ? 4 : v < 1500 ? 5 : v < 9000 ? 6 : 7;
    ids.add(fnv('M:' + mag) % DIM);
    ids.add(fnv('F:' + (/[.,]/.test(val) ? 'frac' : 'int')) % DIM);
    ids.add(fnv('L:' + val.length) % DIM);
    return ids;
  }

  /* ---------- model ---------- */
  const b64 = (s) => { const bin = atob(s), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; };
  function unvarint(bytes) {
    const ids = []; let cur = 0, shift = 0, prev = 0;
    for (const byte of bytes) {
      cur |= (byte & 0x7F) << shift;
      if (byte & 0x80) shift += 7; else { prev += cur; ids.push(prev); cur = 0; shift = 0; }
    }
    return ids;
  }
  let M = null;
  function load(raw) {
    if (!raw || !raw.heads) return null;
    const heads = {};
    for (const k in raw.heads) {
      const h = raw.heads[k], ids = unvarint(b64(h.ids)), index = new Map();
      ids.forEach((v, i) => index.set(v, i));
      heads[k] = {
        labels: h.labels, index, nf: h.nf,
        W: new Int8Array(b64(h.w).buffer),
        s: new Float32Array(b64(h.s).buffer),
        b: new Float32Array(b64(h.b).buffer),
      };
    }
    M = { heads };
    return M;
  }
  function scoreHead(h, fset) {
    const nc = h.labels.length, z = new Float32Array(nc);
    for (let c = 0; c < nc; c++) z[c] = h.b[c];
    fset.forEach(f => {
      const j = h.index.get(f);
      if (j === undefined) return;
      for (let c = 0; c < nc; c++) z[c] += h.W[c * h.nf + j] * h.s[c];
    });
    let mx = -Infinity;
    for (let c = 0; c < nc; c++) if (z[c] > mx) mx = z[c];
    let sum = 0;
    for (let c = 0; c < nc; c++) { z[c] = Math.exp(z[c] - mx); sum += z[c]; }
    let best = 0;
    for (let c = 0; c < nc; c++) { z[c] /= sum; if (z[c] > z[best]) best = c; }
    return { label: h.labels[best], p: z[best] };
  }
  const top = (name, fset) => (M && M.heads[name]) ? scoreHead(M.heads[name], fset) : { label: '_none', p: 0 };

  /* ---------- confidence floors (tuned on the dev split) ---------- */
  const TH = { intent: 0.30, task: 0.45, feature: 0.45, material: 0.45, sub: 0.55, burr: 0.50, machine: 0.50, numrole: 0.40 };
  // Material and machine change every number downstream, so the model only
  // supplies them when it is confident AND the text actually mentions one.
  const EVID = {
    material: /\b(steel|stainless|inox|sus\d|aisi|din|alumini?um|alu\b|ally?|cast iron|ductile|grey iron|gg\d|brass|bronze|copper|titanium|inconel|hastelloy|monel|nickel|super ?alloy|hardened|hrc|carbide|plastic|resin|composite|peek|abs\b|nylon)/i,
    machine: /\b(cnc|machining cent|mill|lathe|turning|robot|cobot|hand ?held|hand tool|grinder|spindle|vmc|hmc|swiss|live tool)/i,
  };
  const val = (r, h) => (r.p >= (TH[h] || 0) && r.label !== '_none') ? r.label : null;

  /* ---------- public: understand one message ---------- */
  function predict(text) {
    if (!M) return null;
    const f = features(text);
    const out = { conf: {} };
    for (const h of ['intent', 'task', 'feature', 'material', 'sub', 'burr', 'machine']) {
      const r = top(h, f);
      out[h] = val(r, h); out.conf[h] = r.p;
    }
    out.nums = [];
    let m;
    NUMRE.lastIndex = 0;
    while ((m = NUMRE.exec(text))) {
      const r = top('numrole', numContext(text, m.index, m.index + m[0].length));
      out.nums.push({ value: parseFloat(m[0].replace(',', '.')), raw: m[0], role: val(r, 'numrole'), p: r.p });
    }
    return out;
  }

  /* ---------- turn a prediction into app state ---------- */
  function toState(text, st) {
    // signatures carry phone numbers and domains like cncbastards.cz; they are
    // not a description of the job, so they must not count as evidence
    const ev = typeof scrubContact === 'function' ? scrubContact(text) : text;
    const p = predict(text);
    if (!p) return null;
    st = st || newState();
    st.dims = st.dims || {};
    // Fill only what the keyword rules left empty — they are the more precise of the two.
    if (!st.task && p.task && TASKS[p.task]) { st.task = p.task; if (TASKS[p.task].feature) st.feature = TASKS[p.task].feature; }
    if (!st.feature && p.feature && FEATURES[p.feature] && !TASKS[st.task]?.feature) st.feature = p.feature;
    if (!st.feature && st.task) st.feature = SUGGEST_FEATURE[st.task] || null;
    if (!st.material && p.material && MATERIALS[p.material] && EVID.material.test(ev)) { st.material = p.material; st.sub = null; }
    if (st.material && !st.sub && p.sub && MATERIALS[st.material].subs && MATERIALS[st.material].subs[p.sub]) st.sub = p.sub;
    if (st.sub && !(MATERIALS[st.material]?.subs || {})[st.sub]) st.sub = null;   // never leave a sub from another material
    if (p.burr && !APP.parsed?.burr) { st.burr = p.burr; APP.parsed = { ...(APP.parsed || {}), burr: p.burr }; }
    if (p.machine && MACHINES[p.machine] && !APP.parsed?.machine && EVID.machine.test(ev)) { st.machine.type = p.machine; APP.parsed = { ...(APP.parsed || {}), machine: { type: p.machine } }; }
    const dims = {};
    for (const n of p.nums) {
      if (!n.role || !isFinite(n.value) || n.value <= 0) continue;
      if (n.role === 'rpm') { if (n.value >= 500 && n.value <= 80000 && !st.machine.maxRpm) { st.machine.maxRpm = n.value; APP.parsed = { ...(APP.parsed || {}), machine: { ...(APP.parsed?.machine || {}), maxRpm: n.value } }; } }
      else if (n.role === 'hrc') { if (n.value > 55 && (!st.material || st.material === 'hardened')) { st.material = 'hardened'; st.sub = 'gt55'; } else if (n.value >= 40 && !st.material) { st.material = 'hardened'; st.sub = 'le55'; } }
      else if (n.role === 'ra') { dims.ra = n.value; APP.parsed = { ...(APP.parsed || {}), ra: n.value }; }
      else if (['main', 'cross', 'depth', 'width', 'groove', 'hole'].includes(n.role)) { if (dims[n.role] === undefined && n.value < 2000) dims[n.role] = n.value; }
    }
    Object.assign(st.dims, dims);
    // Cross-hole work needs two diameters. If the model only placed one, fall back to
    // the plain reading: the brush enters the larger hole, the smaller one crosses it.
    if (st.task === 'crosshole' && !(st.dims.main && st.dims.cross)) {
      const cand = p.nums.map(n => n.value).filter(v => v >= 0.5 && v <= 60 && !['rpm', 'hrc', 'qty', 'feed', 'ra', 'grit'].includes(p.nums.find(x => x.value === v)?.role));
      const uniq = [...new Set(cand)].sort((x, y) => y - x);
      if (uniq.length >= 2) { st.dims.main = uniq[0]; st.dims.cross = uniq[1]; }
    }
    // the brush always enters the larger hole
    if (st.dims.main && st.dims.cross && st.dims.cross > st.dims.main) { const t = st.dims.main; st.dims.main = st.dims.cross; st.dims.cross = t; }
    if (st.task === 'crosshole' && !st.dims.main && st.dims.hole) { st.dims.main = st.dims.hole; delete st.dims.hole; }
    // A single diameter is only "the bore the brush enters" when the job is inside a bore.
    // For hole-edge deburring on a face, the same number is the drilled hole size.
    const inBore = ['crosshole', 'id_finish'].includes(st.task) || ['cross', 'bore'].includes(st.feature);
    if (!inBore && st.dims.main && !st.dims.cross && (st.task === 'deburr_drill' || st.feature === 'hole')) {
      if (st.dims.hole === undefined) st.dims.hole = st.dims.main;
      delete st.dims.main;
    }
    return { state: st, pred: p };
  }

  /* ---------- what is still missing and worth asking ---------- */
  function gaps(st, pred) {
    const out = [];
    if (!st.task) out.push({ field: 'task', ask: 'What is the job?', options: Object.entries(TASKS).map(([k, v]) => ({ label: v.short, value: k })).slice(0, 4) });
    if (!st.material) out.push({ field: 'material', ask: 'Which material?', options: ['carbon', 'stainless', 'aluminum', 'hardened'].map(k => ({ label: MATERIALS[k].name, value: k })) });
    if (st.task === 'crosshole' && !st.dims?.main) out.push({ field: 'main', ask: 'How big is the bore the brush enters?', options: [] });
    if (!APP.parsed?.burr && ['deburr_mill', 'deburr_drill', 'crosshole', 'edge'].includes(st.task))
      out.push({ field: 'burr', ask: 'How big is the burr?', options: [{ label: 'Small / thin', value: 'light' }, { label: 'Medium', value: 'medium' }, { label: 'Thick, rolled over', value: 'heavy' }] });
    if (!APP.parsed?.machine && st.task) out.push({ field: 'machine', ask: 'Where does it run?', options: [{ label: 'Machining centre', value: 'mc' }, { label: 'Lathe', value: 'lathe' }, { label: 'Robot', value: 'robot' }, { label: 'By hand', value: 'hand' }] });
    return out.slice(0, 2);
  }

  return { load, predict, toState, gaps, features, normalize, numContext, get ready() { return !!M; }, TH };
})();

