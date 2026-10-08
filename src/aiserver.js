/* ============================================================
   UFIBER Guide — AI through the host site

   Inside the claude.ai preview the guide talks to Claude directly. On a real
   site that bridge does not exist, so this stands in for it: the same small
   interface, backed by the site's own /nufg/v1/ai endpoint.

   It is deliberately the same shape as the preview object, so ui5 and ui7 do
   not know or care which one they got:
       sample(turns, opts)        -> { text, truncated }
       sample.json(prompt, opts)  -> parsed JSON
       sample.limits()            -> { images } or null

   Tools (function calling) are not offered here. ui7 already handles their
   absence, and adding them would let the model reach the engine directly —
   which is exactly what must not happen. The engine owns the numbers.
   ============================================================ */
const AISERVER = (() => {
  let api = null, on = false, key = '';
  try {
    const q = new URLSearchParams(location.search);
    api = q.get('api') || null;
    on = q.get('ai') === '1';
    key = (q.get('k') || '').slice(0, 128);
    if (api && !/^https?:\/\//i.test(api)) api = null;
  } catch (e) { }

  const fail = (code, text) => { const e = new Error(code); e.code = code; e.text = text || ''; return e; };

  const blobToData = (b) => new Promise((res, rej) => {
    if (typeof b === 'string') return res(b);                 // already a data URL
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(fail('image_failed'));
    r.readAsDataURL(b);
  });

  async function call(body, signal) {
    let r;
    try {
      r = await fetch(api.replace(/\/$/, '') + '/ai', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.assign({ k: key }, body)), signal,
      });
    } catch (e) {
      if (e && e.name === 'AbortError') throw fail('cancelled');
      throw fail('unreachable');
    }
    let d = null;
    try { d = await r.json(); } catch (e) { throw fail('unreachable'); }
    if (!d || !d.ok) {
      const reason = (d && d.reason) || 'unreachable';
      // the guide knows these two by name; anything else is just "unavailable"
      throw fail(reason === 'rate_limited' ? 'rate_limited' : reason === 'unconfigured' ? 'not_granted' : 'unreachable');
    }
    return d;
  }

  // a conversation turn, as ui7 expects
  const sample = async (turns, opts = {}) => {
    const list = Array.isArray(turns) ? turns : [{ role: 'user', content: String(turns || '') }];
    const d = await call({
      turns: list.map(t => ({ role: t.role === 'assistant' ? 'assistant' : 'user', content: String(t.content || '') })),
      system: opts.system, max_tokens: opts.max_tokens,
    }, opts.signal);
    return { text: d.text, truncated: !!d.truncated };
  };

  // one prompt, JSON back. Models like to wrap JSON in a code fence, so take
  // the outermost object rather than trusting the whole reply to parse.
  sample.json = async (prompt, opts = {}) => {
    const images = [];
    for (const img of (opts.images || []).slice(0, 3)) {
      try { images.push(await blobToData(img)); } catch (e) { }
    }
    const d = await call({
      prompt: String(prompt || ''),
      images: images.length ? images : undefined,
      system: 'Reply with one JSON object and nothing else. No prose, no code fence.',
      max_tokens: opts.max_tokens || 1500,
    }, opts.signal);
    const t = String(d.text || '').trim();
    try { return JSON.parse(t); } catch (e) { }
    const a = t.indexOf('{'), b = t.lastIndexOf('}');
    if (a >= 0 && b > a) {
      try { return JSON.parse(t.slice(a, b + 1)); } catch (e) { }
    }
    throw fail('bad_json', t.slice(0, 200));
  };

  sample.limits = async () => ({ images: { maxCount: 3 }, tools: null });

  return { get ready() { return !!(api && on); }, sample };
})();
if (typeof module !== 'undefined') module.exports = { AISERVER };
