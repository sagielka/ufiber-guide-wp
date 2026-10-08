/* Usage data.
   Two separate paths, deliberately different:

   (a) track() sends structured fields only — which task, material, tool family,
       which screen. It never sends anything the user typed. It only runs when
       the host page supplied an endpoint AND switched collection on, so the
       standalone app and the offline copy send nothing at all.

   (b) shareApplication() sends the description the user chose to send, after
       showing them exactly what will go and letting them edit it. Never automatic.

   Both post to the WordPress site that embeds the guide, not to us. */
const USAGE = (() => {
  let api = null, on = false, sent = 0, key = '';
  try {
    const q = new URLSearchParams(location.search);
    api = q.get('api') || null;
    on = q.get('usage') === '1';
    key = (q.get('k') || '').slice(0, 128);        // issued by the host site
    if (api && !/^https?:\/\//i.test(api)) api = null;        // only a real endpoint
  } catch (e) { }

  const post = (path, body) => {
    if (!api) return Promise.resolve(false);
    const url = api.replace(/\/$/, '') + '/' + path;
    const data = JSON.stringify(body);
    try {
      if (path === 'usage' && navigator.sendBeacon) {         // never blocks the page
        return Promise.resolve(navigator.sendBeacon(url, new Blob([data], { type: 'application/json' })));
      }
    } catch (e) { }
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: data, keepalive: true })
      .then(r => r.ok).catch(() => false);
  };

  // the structured shape of a recommendation — no free text ever enters here
  const fields = (st, rec) => ({
    task: st?.task || '', material: st?.material || '',
    family: rec?.family || '', sku: rec?.sku || '',
    grit: rec?.grit?.grit ? String(rec.grit.grit) : '',
    dims: st?.dims ? Object.entries(st.dims).filter(([, v]) => v != null).map(([k, v]) => k + ':' + v).join(' ') : '',
    lang: (navigator.language || '').slice(0, 8),
  });

  const track = (event, st, rec) => {
    if (!on || !api || sent > 200) return;                    // a cap, so a stuck page cannot flood
    sent++;
    post('usage', Object.assign({ event: String(event).slice(0, 40), k: key }, fields(st, rec)));
  };

  const share = (body, contact, st, rec) =>
    post('share', Object.assign({ body: String(body).slice(0, 4000), contact: String(contact || '').slice(0, 190), k: key }, fields(st, rec)));

  return { track, share, get available() { return !!api; }, get collecting() { return on && !!api; } };
})();
if (typeof module !== 'undefined') module.exports = { USAGE };

