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
  const K = { task: 't', feature: 'f', material: 'm', sub: 's', burr: 'b', dims: 'd', machine: 'c', override: 'o', sfRow: 'r', fromX: 'x' };

  function encode(st) {
    if (!st || !st.task) return '';
    const out = {};
    for (const [long, short] of Object.entries(K)) {
      const v = st[long];
      if (v === null || v === undefined || v === '') continue;
      if (typeof v === 'object' && !Object.keys(v).length) continue;
      out[short] = v;
    }
    try { return b64e(JSON.stringify(out)); } catch (e) { return ''; }
  }
  function decode(token) {
    if (!token) return null;
    let raw;
    try { raw = JSON.parse(b64d(token)); } catch (e) { return null; }
    if (!raw || typeof raw !== 'object') return null;
    const st = newState();
    for (const [long, short] of Object.entries(K)) if (raw[short] !== undefined) st[long] = raw[short];
    // validate everything that came from outside before it reaches the engine
    if (!TASKS[st.task]) return null;
    if (st.feature && !FEATURES[st.feature]) st.feature = null;
    if (st.material && !MATERIALS[st.material]) st.material = null;
    if (st.material && st.sub && !(MATERIALS[st.material].subs || {})[st.sub]) st.sub = null;
    if (!['light', 'medium', 'heavy'].includes(st.burr)) st.burr = 'light';
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

