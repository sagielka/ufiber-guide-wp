/* ============================================================
   Sharing a setup
   The whole setup is packed into a short token and put in the page
   address, so a link reopens exactly the same recommendation.
   Inside the WordPress embed the frame cannot change the page address
   itself, so it asks the host page to do it (see assets/js/embed.js).
   ============================================================ */
const SHARE = (() => {
  const b64e = (s) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const b64d = (s) => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));
  // short keys keep the link readable
  const K = { task: 't', feature: 'f', material: 'm', sub: 's', burr: 'b', burrMm: 'h', dims: 'd', machine: 'c', override: 'o', sfRow: 'r', fromX: 'x', through: 'w', grades: 'g' };

  /* Short links (1.6.26). The common setup is written as a few readable codes
     instead of base64 JSON — about 40 characters instead of 200:
       2_ch_cr_pl_h0p3_M3p96C3p05_mcR10000B4
     version · task · feature · material[-sub] · burr[size] · sizes · machine.
     Only the link-safe characters A–Z a–z 0–9 - _ are used ("p" is the decimal
     point). Setups with grades, overrides or a replaced competitor code still
     use the long form, and old links keep working. */
  const T2 = { deburr_mill: 'dm', deburr_drill: 'dd', crosshole: 'ch', edge: 'eb', marks: 'tm', polish: 'po', id_finish: 'id', hard: 'hd' };
  const F2 = { face: 'fa', edge: 'ed', hole: 'ho', cross: 'cr', bore: 'bo', groove: 'gr', radius: 'ra', small: 'sm', thread: 'th' };
  const M2 = { carbon: 'cs', stainless: 'ss', hardened: 'hs', castiron: 'ci', aluminum: 'al', brass: 'br', copper: 'cu', titanium: 'ti', hrsa: 'hr', plastic: 'pl', carbide: 'ca', other: 'ot' };
  const S2 = { annealed: 'a', treated: 't', aust: 'a', mart: 'm', le55: 'l', gt55: 'g', grey: 'g', pearl: 'p', wrought: 'w', cast: 'c', hisi: 'h', ni: 'n', co: 'c', fe: 'f' };
  const C2 = { mc: 'mc', lathe: 'la', lathe0: 'l0', dedicated: 'de', air: 'ai', swiss: 'sw', robot: 'ro', hand: 'ha' };
  const D2 = { main: 'M', cross: 'C', width: 'W', depth: 'D', groove: 'G', hole: 'H', ra: 'A', slotW: 'S', slotL: 'L' };
  const inv = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [v, k]));
  const num = v => String(+Number(v).toFixed(3)).replace('.', 'p');
  const unnum = s => parseFloat(String(s).replace('p', '.'));
  function encode2(st) {
    if (st.grades?.length || st.fromX || st.sfRow || (st.override && Object.keys(st.override).length)) return '';
    if (!T2[st.task] || (st.feature && !F2[st.feature]) || (st.material && !M2[st.material])) return '';
    const dims = Object.entries(st.dims || {}).filter(([k, v]) => D2[k] && v != null && isFinite(Number(v)) && Number(v) > 0).map(([k, v]) => D2[k] + num(v)).join('');
    const deburr = TASKS[st.task]?.mode === 'deburr';
    const burr = deburr ? ({ light: 'l', medium: 'm', heavy: 'h' }[st.burr] || '') + (st.burrMm ? num(st.burrMm) : '') : '';
    const m = st.machine || {};
    const mach = (C2[m.type] || 'mc') + (m.maxRpm ? 'R' + Math.round(m.maxRpm) : '') + (m.iface === 'BT40' ? 'B4' : m.iface === 'BT30' ? 'B3' : '') + (m.uneven ? 'U' : '') + (m.coolant === false ? 'N' : '');
    const mat = st.material ? M2[st.material] + (st.sub && S2[st.sub] ? '-' + S2[st.sub] : '') : '';
    return ['2', T2[st.task], st.feature ? F2[st.feature] : '', mat, burr, dims, mach + (st.through ? 'W' : '')].join('_');
  }
  function decode2(token) {
    const p = token.split('_'); if (p[0] !== '2' || p.length < 7) return null;
    const raw = { t: inv(T2)[p[1]], f: p[2] ? inv(F2)[p[2]] : null, d: {}, c: {} };
    if (p[3]) { const [mc, sc] = p[3].split('-'); raw.m = inv(M2)[mc]; if (sc && raw.m && MATERIALS[raw.m]?.subs) raw.s = Object.keys(MATERIALS[raw.m].subs).find(k => S2[k] === sc) || null; }
    if (p[4]) { raw.b = { l: 'light', m: 'medium', h: 'heavy' }[p[4][0]]; if (p[4].length > 1) raw.h = unnum(p[4].slice(1)); }
    for (const [, k, v] of p[5].matchAll(/([A-Z])([0-9p]+)/g)) if (inv(D2)[k]) raw.d[inv(D2)[k]] = unnum(v);
    const mm = p[6].match(/^([a-z0-9]{2})(?:R(\d+))?(B4|B3)?(U)?(N)?(W)?$/);
    if (mm) { raw.c = { type: inv(C2)[mm[1]] || 'mc', maxRpm: mm[2] ? +mm[2] : null, iface: mm[3] === 'B4' ? 'BT40' : mm[3] === 'B3' ? 'BT30' : null, uneven: !!mm[4], coolant: !mm[5] }; if (mm[6]) raw.w = true; }
    return raw;
  }
  function encode(st) {
    if (!st || !st.task) return '';
    const short = encode2(st);
    if (short) return short;
    const out = {};
    for (const [long, short] of Object.entries(K)) {
      const v = st[long];
      if (v === null || v === undefined || v === '') continue;
      if (typeof v === 'object' && !Object.keys(v).length) continue;
      if ((long === 'burr' || long === 'burrMm') && TASKS[st.task]?.mode !== 'deburr') continue;
      out[short] = v;
    }
    try { return b64e(JSON.stringify(out)); } catch (e) { return ''; }
  }
  function decode(token) {
    if (!token) return null;
    let raw;
    if (/^2_/.test(token)) raw = decode2(token);
    else { try { raw = JSON.parse(b64d(token)); } catch (e) { return null; } }
    if (!raw || typeof raw !== 'object') return null;
    const st = newState();
    for (const [long, short] of Object.entries(K)) if (raw[short] !== undefined) st[long] = raw[short];
    // validate everything that came from outside before it reaches the engine
    if (!TASKS[st.task]) return null;
    if (st.feature && !FEATURES[st.feature]) st.feature = null;
    if (st.material && !MATERIALS[st.material]) st.material = null;
    if (st.material && st.sub && !(MATERIALS[st.material].subs || {})[st.sub]) st.sub = null;
    if (!['light', 'medium', 'heavy'].includes(st.burr)) st.burr = 'light';
    if (st.burrMm != null) { const b = Number(st.burrMm); st.burrMm = isFinite(b) && b > 0 && b < 20 ? b : null; }
    st.dims = (st.dims && typeof st.dims === 'object') ? st.dims : {};
    for (const k of Object.keys(st.dims)) {
      const v = Number(st.dims[k]);
      if (!isFinite(v) || v <= 0 || v > 5000) delete st.dims[k]; else st.dims[k] = v;
    }
    st.machine = Object.assign(newState().machine, (st.machine && typeof st.machine === 'object') ? st.machine : {});
    if (!MACHINES[st.machine.type]) st.machine.type = 'mc';
    const mr = Number(st.machine.maxRpm); st.machine.maxRpm = (isFinite(mr) && mr > 0 && mr < 200000) ? mr : null;
    st.override = (st.override && typeof st.override === 'object') ? st.override : {};
    if (st.override.grit && !GRITS.some(g => g.grit === st.override.grit) && !STONE_GRITS.some(g => g.grit === st.override.grit)) delete st.override.grit;
    if (st.fromX && typeof st.fromX !== 'string') delete st.fromX;
    if (st.through !== undefined) st.through = st.through === true;
    st.grades = cleanGrades(st.grades);
    return st;
  }
  /** The address someone can paste to a colleague. */
  function link() {
    const token = encode(APP.ws);
    if (!token) return '';
    if (APP.hostUrl) {                    // inside WordPress: the host page told us its address
      const base = APP.hostUrl.split('#')[0];
      return base + '#ufiber=' + token;
    }
    if (inFrame() && !EMB) return 'https://www.noga.com/nogamt/ufiber/ai-assistant/#ufiber=' + token;
    return location.origin + location.pathname + '#setup=' + token;
  }
  /** Read a setup out of the address on startup. */
  function fromUrl() {
    try {
      const q = new URLSearchParams(location.search);
      const token = q.get('setup') || (location.hash.match(/[#&](?:setup|ufiber)=([A-Za-z0-9\-_]+)/) || [])[1];
      return token ? decode(token) : null;
    } catch (e) { return null; }
  }
  /** Keep the address in step as the setup changes. */
  function push() {
    const token = encode(APP.ws);
    if (!token) return;
    if (typeof EMB !== 'undefined' && EMB) {
      try { parent.postMessage({ source: 'ufiber-guide', type: 'setup', token }, '*'); } catch (e) { }
      return;
    }
    try { history.replaceState(null, '', location.pathname + '#setup=' + token); } catch (e) { }
  }
  return { encode, decode, link, fromUrl, push };
})();

