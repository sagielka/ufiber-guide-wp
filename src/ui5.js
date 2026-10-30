/* ============================================================
   UFIBER Guide — drop a customer email or drawing
   Local first: .eml/.msg/.txt/.html and PDF text are read in the
   browser and run through the same parser as typed text.
   With the viewer's consent, Claude reads the email + drawing
   images (sample capability) and returns structured JSON.
   ============================================================ */
const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
APP.doc = null; // { files:[{name,kind,status,thumb}], text, images:[Blob], subject, ai:{summary,callouts,questions} }
APP.sample = null; APP.sampleImages = null;
(async () => {
  try {
    // Inside the claude.ai preview Claude is reachable directly. On a real site
    // it is not, so the host page's own endpoint stands in. Neither available
    // means the guide runs on its offline model alone, with nothing to report.
    let s = null;
    if (window.claude && claude.use) s = await claude.use('sample').catch(() => null);
    if (!s && typeof AISERVER !== 'undefined' && AISERVER.ready) s = AISERVER.sample;
    if (!s) return;
    APP.sample = s;
    const lim = await s.limits().catch(() => null);
    APP.sampleImages = lim && lim.images ? lim.images : null;
    APP.sampleTools = lim && lim.tools ? lim.tools : null;
    if (APP.view === '') { if (APP.doc) renderAttach(); const tip = $('#askTip'); if (tip) tip.textContent = 'Type it in any language, paste it, or drag in a customer email or drawing. Claude reads it and asks only what\'s missing.'; }
    if (APP.view === 'result') renderChat();
  } catch (e) { /* no sampling in this view */ }
})();

/* ---------- decoding helpers ---------- */
const td = (bytes, cs = 'utf-8') => { try { return new TextDecoder(cs.toLowerCase().replace(/^(us-ascii|ascii)$/, 'utf-8'), { fatal: false }).decode(bytes); } catch (e) { return new TextDecoder('utf-8').decode(bytes); } };
function b64bytes(s) { const bin = atob(s.replace(/[^A-Za-z0-9+/=]/g, '')); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }
function qpBytes(s) { s = s.replace(/=\r?\n/g, ''); const out = []; for (let i = 0; i < s.length; i++) { if (s[i] === '=' && /^[0-9A-F]{2}$/i.test(s.substr(i + 1, 2))) { out.push(parseInt(s.substr(i + 1, 2), 16)); i += 2; } else out.push(s.charCodeAt(i) & 255); } return new Uint8Array(out); }
function mimeWords(s) { return (s || '').replace(/=\?([^?]+)\?([BQ])\?([^?]*)\?=/gi, (_, cs, enc, txt) => { try { return td(enc.toUpperCase() === 'B' ? b64bytes(txt) : qpBytes(txt.replace(/_/g, ' ')), cs); } catch (e) { return txt; } }); }
function htmlText(h) { const d = new DOMParser().parseFromString(h, 'text/html'); d.querySelectorAll('script,style,head').forEach(n => n.remove()); d.querySelectorAll('br,p,div,tr,li,h1,h2,h3').forEach(n => n.append('\n')); return (d.body?.textContent || '').replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').replace(/\n\s*\n\s*\n+/g, '\n\n').trim(); }
function headersOf(block) { const h = {}; block.replace(/\r?\n[ \t]+/g, ' ').split(/\r?\n/).forEach(l => { const m = l.match(/^([\w-]+):\s*(.*)$/); if (m) h[m[1].toLowerCase()] = m[2]; }); return h; }
function parseEml(raw) {
  const res = { subject: '', from: '', date: '', text: '', html: '', files: [] };
  const walk = (part) => {
    const i = part.search(/\r?\n\r?\n/); const head = i < 0 ? part : part.slice(0, i); const body = i < 0 ? '' : part.slice(i).replace(/^\r?\n\r?\n/, '');
    const h = headersOf(head);
    if (!res.subject && h.subject) { res.subject = mimeWords(h.subject); res.from = mimeWords(h.from || ''); res.date = h.date || ''; }
    const ct = (h['content-type'] || 'text/plain').toLowerCase();
    const enc = (h['content-transfer-encoding'] || '').toLowerCase();
    const cs = (ct.match(/charset="?([^";]+)/) || [])[1] || 'utf-8';
    if (ct.startsWith('multipart/')) { const b = (h['content-type'].match(/boundary="?([^";]+)"?/i) || [])[1]; if (!b) return; body.split('--' + b).slice(1).forEach(p => { if (!p.startsWith('--')) walk(p.replace(/^\r?\n/, '')); }); return; }
    const name = mimeWords(((h['content-disposition'] || '') + ';' + (h['content-type'] || '')).match(/(?:file)?name\*?="?([^";]+)/i)?.[1] || '');
    const bytes = enc === 'base64' ? b64bytes(body) : enc === 'quoted-printable' ? qpBytes(body) : new TextEncoder().encode(body);
    if (ct.startsWith('image/') || ct.includes('pdf') || /\.(pdf|png|jpe?g|webp|gif)$/i.test(name)) { res.files.push(new File([bytes], name || ('attachment' + (ct.includes('pdf') ? '.pdf' : '.png')), { type: ct.split(';')[0] })); return; }
    if (ct.startsWith('text/html') && !res.html) res.html = td(bytes, cs);
    else if (ct.startsWith('text/plain') && !res.text) res.text = td(bytes, cs);
  };
  walk(raw);
  let text = res.text || htmlText(res.html || '');
  text = text.split(/\r?\n/).filter(l => !/^>/.test(l)).join('\n'); // drop quoted reply lines
  res.body = text.replace(/\n{3,}/g, '\n\n').trim();
  return res;
}
function msgText(buf) { return msgOpen(buf).text; }
/* A .msg is an OLE compound file. Parse the container and take the real
   subject, body and attachments; scraping the raw bytes invents numbers that
   are not in the message, which is worse than reading nothing.
   Pictures pasted into an Outlook body are attachments too, and they are
   usually the drawing. Signature logos are small, so pictures under 12 kB are
   left out, and the first four in the email are kept. */
function msgOpen(buf) {
  let m = null;
  try { m = msgRead(buf); } catch (e) { }
  if (!m) return { text: '', files: [], skipped: 0 };
  const text = (m.subject || m.body) ? ((m.subject ? 'Subject: ' + m.subject + '\n\n' : '') + m.body).slice(0, 8000) : '';
  const useful = (m.files || []).filter(a => {
    const n = (a.name || '').toLowerCase();
    const pdf = a.mime.includes('pdf') || n.endsWith('.pdf');
    const img = a.mime.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp)$/.test(n);
    return pdf || (img && a.size >= 12000);
  });
  // Keep the email's own order: pictures pasted into the body are stored in the
  // order they appear, and the first job's drawing comes first. Sorting by size
  // once sent Case 2's drawings and left Case 1's out.
  const keep = useful.slice(0, 4);
  const jobOf = picJobs(m.html || '', keep.map(a => a.cid));
  const files = keep.map((a, i) => {
    const n = a.name || ('attachment-' + (i + 1) + (a.mime.includes('pdf') ? '.pdf' : a.mime.includes('jpeg') ? '.jpg' : '.png'));
    const type = a.mime || (/\.pdf$/i.test(n) ? 'application/pdf' : /\.jpe?g$/i.test(n) ? 'image/jpeg' : 'image/png');
    const f = new File([a.bytes], n, { type }); if (jobOf[i] != null) f.job = jobOf[i];
    return f;
  });
  return { text, files, skipped: useful.length - keep.length };
}
/* Which job each pasted picture belongs to: the last "Case N" heading before its
   <img src="cid:…"> in the HTML body. Unknown when the body has no such marks. */
function picJobs(html, cids) {
  const out = cids.map(() => null);
  if (!html || !cids.some(Boolean)) return out;
  const flat = html.replace(/<img\b[^>]*?src\s*=\s*["']?cid:([^"'\s>]+)[^>]*>/gi, ' \n[[IMG:$1]]\n ').replace(/<br\s*\/?>|<\/(?:p|div|tr|li|h\d)>/gi, '\n').replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
  const heads = [...flat.matchAll(JOB_HEAD)].map(m => ({ n: +m[1], at: m.index }));
  if (!heads.length) return out;
  const key = c => String(c || '').toLowerCase().split('@')[0];
  cids.forEach((c, i) => {
    if (!c) return;
    const mk = [...flat.matchAll(/\[\[IMG:([^\]]+)\]\]/g)].find(x => key(x[1]) === key(c));
    if (!mk) return;
    const before = heads.filter(h => h.at < mk.index);
    out[i] = before.length ? before[before.length - 1].n : heads[0].n;
  });
  return out;
}
function loadScript(src) { return new Promise((ok, bad) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => bad(new Error('load ' + src)); document.head.appendChild(s); }); }
async function pdfLib() {
  if (window.pdfjsLib) return window.pdfjsLib;
  await loadScript(PDFJS + 'pdf.worker.min.js'); // main-thread worker: avoids blocked web workers in sandboxed viewers
  await loadScript(PDFJS + 'pdf.min.js');
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.js';
  return window.pdfjsLib;
}
const canvasBlob = (c, type = 'image/jpeg', q = .9) => new Promise(r => c.toBlob(r, type, q));
async function cropBR(srcCanvas, frac = .5, maxW = 1400) {
  // bottom-right of a drawing usually holds the title block: material, finish, edge notes
  const sw = srcCanvas.width * frac, sh = srcCanvas.height * frac; const sc = Math.min(1, maxW / sw);
  const c = document.createElement('canvas'); c.width = Math.round(sw * sc); c.height = Math.round(sh * sc);
  c.getContext('2d').drawImage(srcCanvas, srcCanvas.width - sw, srcCanvas.height - sh, sw, sh, 0, 0, c.width, c.height);
  return canvasBlob(c);
}
async function readPdf(file) {
  const lib = await pdfLib();
  const pdf = await lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false }).promise;
  let text = ''; const images = [], crops = []; let thumb = null;
  for (let p = 1; p <= Math.min(pdf.numPages, 4); p++) {
    const page = await pdf.getPage(p);
    const tc = await page.getTextContent(); text += tc.items.map(i => i.str).join(' ') + '\n';
    if (p <= 2) {
      const vp0 = page.getViewport({ scale: 1 }); const scale = Math.min(3, 2200 / Math.max(vp0.width, vp0.height));
      const vp = page.getViewport({ scale }); const c = document.createElement('canvas'); c.width = Math.floor(vp.width); c.height = Math.floor(vp.height);
      const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
      await page.render({ canvasContext: ctx, viewport: vp }).promise;
      images.push(await canvasBlob(c)); if (p === 1) { crops.push(await cropBR(c)); thumb = c.toDataURL('image/jpeg', .6); }
    }
  }
  return { text: text.replace(/\s+/g, ' ').trim(), images, crops, thumb, pages: pdf.numPages };
}
async function readImage(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = bad; i.src = url; });
    const sc = Math.min(1, 2400 / Math.max(img.width, img.height));
    const c = document.createElement('canvas'); c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
    const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height);
    const full = await canvasBlob(c); const crops = []; if (img.width > 1200 || img.height > 1200) crops.push(await cropBR(c));
    return { images: [full], crops, thumb: c.toDataURL('image/jpeg', .6) };
  } finally { URL.revokeObjectURL(url); }
}
const kindOf = f => { const n = (f.name || '').toLowerCase(); const t = f.type || ''; if (n.endsWith('.eml') || t === 'message/rfc822') return 'eml'; if (n.endsWith('.msg')) return 'msg'; if (n.endsWith('.pdf') || t === 'application/pdf') return 'pdf'; if (t.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp)$/.test(n)) return 'image'; if (/\.(html?|htm)$/.test(n) || t === 'text/html') return 'html'; if (t.startsWith('text/') || /\.(txt|csv|md)$/.test(n)) return 'text'; return 'other'; };

/* ---------- intake ---------- */
async function addFiles(fileList) {
  const files = [...fileList].slice(0, 6); if (!files.length) return;
  const D = APP.doc || (APP.doc = { files: [], text: '', images: [], subject: '', ai: null });
  D.ai = null;
  for (const f of files) {
    const entry = { name: f.name || 'pasted image', kind: kindOf(f), status: 'Reading…', thumb: null };
    D.files.push(entry); renderAttach();
    try {
      if (entry.kind === 'eml') {
        const e = parseEml(await f.text()); D.subject = D.subject || e.subject;
        D.text += `EMAIL${e.from ? ' from ' + e.from : ''}\nSubject: ${e.subject}\n\n${e.body}\n\n`;
        entry.status = `Email read${e.files.length ? ` — ${e.files.length} attachment${e.files.length > 1 ? 's' : ''} found` : ''}`;
        if (e.files.length) { renderAttach(); await addFiles(e.files); }
      } else if (entry.kind === 'msg') {
        const o = msgOpen(await f.arrayBuffer()), t = o.text; D.text += `EMAIL (Outlook .msg)\n${t}\n\n`;
        const n = o.files.length;
        entry.status = !t && !n ? 'This .msg could not be read. Paste the email text into the box instead — guessing from the file would invent numbers.'
          : (t ? 'Email read' : 'No email text found') + (n ? ` — ${n} picture${n > 1 ? 's' : ''} / drawing${n > 1 ? 's' : ''} found${o.skipped ? ` (the first ${n})` : ''}` : ' — no drawings inside. If there is one, drop it too.');
        if (n) { renderAttach(); await addFiles(o.files); }
      } else if (entry.kind === 'html') { D.text += htmlText(await f.text()) + '\n\n'; entry.status = 'Text read'; }
      else if (entry.kind === 'text') { D.text += (await f.text()).slice(0, 20000) + '\n\n'; entry.status = 'Text read'; }
      else if (entry.kind === 'pdf') {
        const r = await readPdf(f); entry.thumb = r.thumb; tagJob(r, f.job); D.images.push(...r.images); (D.crops || (D.crops = [])).push(...r.crops);
        if (r.text) D.text += `DRAWING / PDF TEXT (${f.name})\n${r.text.slice(0, 6000)}\n\n`;
        entry.status = `${r.pages} page${r.pages > 1 ? 's' : ''}${r.text ? ', text layer read' : ', no text layer (scanned)'}`;
      } else if (entry.kind === 'image') { const r = await readImage(f); entry.thumb = r.thumb; tagJob(r, f.job); D.images.push(...r.images); (D.crops || (D.crops = [])).push(...r.crops); entry.status = 'Image ready'; }
      else entry.status = 'This file type can\'t be read. Use .eml, .msg, .txt, PDF or an image.';
    } catch (err) { entry.status = entry.kind === 'pdf' ? 'Couldn\'t open this PDF here. Try a screenshot of the drawing instead.' : 'Couldn\'t read this file.'; entry.err = true; }
    renderAttach();
  }
  D.cases = caseCount(D.text); D.jobs = D.cases > 1 ? splitJobs(D.text) : null; if (D.jobs && !D.job) D.job = D.jobs.jobs[0].n;
  // local reading straight away — free and instant
  if (D.text.trim()) { const ex = excerpt(D); const ta = $('#askT'); if (ta) ta.value = ex; doAsk(ex, { ai: false }); }
  renderAttach();
}
const tagJob = (r, job) => { if (job != null) [...r.images, ...r.crops].forEach(b => { try { b.job = job; } catch (e) { } }); };
function excerpt(D) {
  if (D.jobs) return jobText(D.jobs, D.job || D.jobs.jobs[0].n).replace(/\n{3,}/g, '\n\n').trim().slice(0, 1800);
  return D.text.replace(/\n{3,}/g, '\n\n').trim().slice(0, 1800);
}
/* Set up another job from the same email: its own text in the box, its own
   pictures first when Claude reads it. */
function setJob(n) {
  const D = APP.doc; if (!D || !D.jobs) return;
  D.job = n; D.ai = null; D.aiErr = null; D.imgFail = null;
  const ex = excerpt(D); const ta = $('#askT'); if (ta) ta.value = ex;
  doAsk(ex, { ai: false }); renderAttach();
  if (APP.sample) aiRead();
}

/* ---------- Claude reading ---------- */
/* Claude scales any picture down to about 1568 px on the long edge before it
   looks at it, so sending more only makes the request heavier. Three 2400 px
   drawings in one request were enough for the site's endpoint to give up. */
const AI_EDGE = 1568, AI_BYTES = 900000;
async function fitForAi(blob) {
  try {
    if (!blob || typeof createImageBitmap !== 'function') return blob;
    const bm = await createImageBitmap(blob);
    const sc = Math.min(1, AI_EDGE / Math.max(bm.width, bm.height));
    if (sc === 1 && blob.size <= AI_BYTES) return blob;
    const c = document.createElement('canvas'); c.width = Math.round(bm.width * sc); c.height = Math.round(bm.height * sc);
    const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(bm, 0, 0, c.width, c.height);
    for (const q of [.85, .7, .55]) { const b = await canvasBlob(c, 'image/jpeg', q); if (b && b.size <= AI_BYTES) return b; }
    return await canvasBlob(c, 'image/jpeg', .45);
  } catch (e) { return blob; }
}
let aiCtl = null;
async function aiRead() {
  const D = APP.doc; if (!D || !APP.sample) return;
  aiCtl = new AbortController(); D.aiBusy = true; D.aiErr = null; D.imgFail = null; renderAttach();
  const enumList = (o) => Object.keys(o).join(' | ');
  const maxImg = APP.sampleImages ? APP.sampleImages.maxCount : 0;
  // whole pictures first; title-block zooms only if the allowance has room left
  // this job's pictures first (and pictures not tied to any job), then the rest
  const sel = D.jobs ? (D.job || D.jobs.jobs[0].n) : null;
  const mine = b => sel == null || b.job == null || b.job === sel;
  const pool = [...D.images.filter(mine), ...(D.crops || []).filter(mine), ...D.images.filter(b => !mine(b))];
  const picked = maxImg ? pool.slice(0, maxImg) : [];
  const fulls = picked.filter(b => D.images.includes(b)).length;
  const imgs = await Promise.all(picked.map(fitForAi));
  const zooms = picked.length - fulls, others = picked.filter(b => sel != null && b.job != null && b.job !== sel).length;
  const prompt = `You are a NOGA MT application engineer for UFIBER ceramic fiber deburring and finishing tools.
A customer sent the material below${imgs.length ? ' plus ' + imgs.length + ' image(s) of their drawing or part, in the order they appear in the email' + (zooms ? ' (' + zooms + (zooms > 1 ? ' of them are zooms' : ' of them is a zoom') + ' of a drawing\'s bottom-right title block)' : '') : ''}.${D.cases > 1 ? `
The email describes ${D.cases} separate jobs (Case 1, Case 2…). Extract ONLY job ${sel || 1}${D.jobs ? ' (' + (D.jobs.jobs.find(j => j.n === sel)?.label || 'Case ' + sel) + ')' : ''}: its material, sizes and burr, read from its own text and the pictures that belong to it${others ? ` (the last ${others} picture${others > 1 ? 's belong' : ' belongs'} to another job — use only for context)` : ''}. Ignore the other jobs' materials, sizes and drawings; mention them in "summary" only.` : ''}
Extract the deburring / finishing application. Reply with ONLY one JSON object with these fields:
${extractionSpec()}
plus "callouts": ["up to 6 short requirements from the email/drawing that affect deburring or finish: edge-break limits, Ra, 'burr-free' notes, hardness, coatings, tolerances near edges, quantities"].
For this customer material, "questions" are what is still unknown and worth asking the customer.

CUSTOMER MATERIAL:
"""
${D.text.slice(0, 14000) || '(no text — images only)'}
"""${(() => { const u = ($('#askT')?.value || '').trim(); return u && u !== excerpt(D) ? `\n\nNOTES TYPED BY THE USER (take these as correct where they differ):\n"""\n${u.slice(0, 3000)}\n"""` : ''; })()}`;
  try {
    let r;
    try { r = await APP.sample.json(prompt, { images: imgs.length ? imgs : undefined, signal: aiCtl.signal }); }
    catch (e) {
      // the request with pictures failed on the way: read the email text alone
      // rather than nothing, and say the drawings were not seen
      if (!imgs.length || !/^(unreachable|network|http_|upstream_|image_|empty|timeout)/.test(String(e && e.code))) throw e;
      try { console.warn('UFIBER Guide: reading with pictures failed, retrying with text only', e); } catch (_) { }
      r = await APP.sample.json(prompt.replace(/ plus \d+ image\(s\)[^.]*\./, '. (Its pictures could not be sent; read the text only.)'), { signal: aiCtl.signal });
      D.imgFail = String(e && e.code || 'failed');
    }
    applyAi(r);
  } catch (e) {
    const msg = { cancelled: null, not_granted: 'Reading with Claude was not allowed in this view. The local reading above still works.', rate_limited: 'Too many requests right now — try again in a minute.', image_rejected: 'One of the images couldn\'t be used. Try a smaller screenshot.', images_unavailable: 'Images can\'t be sent from this view — only the email text was read.', invalid_json: 'Claude\'s answer couldn\'t be read. Try again.', refused: 'Claude couldn\'t process this content.', session_expired: 'Your session expired — sign in again.', timeout: 'Claude took too long to answer. Try again in a moment.', network: 'The site could not be reached. Check the connection and try again.' }[e && e.code];
    // say why: a bare "something went wrong" can't be acted on or reported
    const why = e && (e.code || e.message) ? String(e.code || e.message).replace(/\s+/g, ' ').slice(0, 140) : '';
    if (msg === undefined) try { console.warn('UFIBER Guide: reading with Claude failed', e); } catch (_) { }
    D.aiErr = msg === undefined ? `Something went wrong reading the document${why ? ` (${why})` : ''}. Try again.` : msg;
    if (['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled'].includes(e && e.code)) APP.sample = null;
  } finally { D.aiBusy = false; renderAttach(); updateGo(); }
}
function applyAi(r) {
  const D = APP.doc; if (!r || typeof r !== 'object') { D.aiErr = 'No usable answer. Try again.'; return; }
  applyExtraction(r, null);
  const later = (APP.ws?.later || []).flatMap(x => x.grades || []).map(g => g.toLowerCase());
  const aboutLater = q => later.some(g => q.toLowerCase().includes(g) || q.toLowerCase().replace(/[\s-]/g, '').includes(g.replace(/[\s-]/g, '')));
  D.ai = { summary: String(r.summary || '').slice(0, 300), callouts: (Array.isArray(r.callouts) ? r.callouts : []).map(String).slice(0, 6), questions: (Array.isArray(r.questions) ? r.questions : []).map(q => typeof q === 'string' ? q : q && q.ask).filter(Boolean).filter(q => !aboutLater(q)).slice(0, 3) };
  APP.parsed = { ...(APP.parsed || {}), fromDoc: true };
  renderUnderstood();
}
function docSummaryText() {
  const D = APP.doc; if (!D) return '';
  const L = [`SOURCE: ${D.files.map(f => f.name).join(', ')}`];
  if (D.ai?.summary) L.push(`Customer need: ${D.ai.summary}`);
  if (D.ai?.callouts?.length) L.push('Requirements from email/drawing:\n' + D.ai.callouts.map(c => '- ' + c).join('\n'));
  if (D.ai?.questions?.length) L.push('Open questions for the customer:\n' + D.ai.questions.map(c => '- ' + c).join('\n'));
  return L.join('\n');
}

/* ---------- UI ---------- */
function renderAttach() {
  const el = $('#attach'); if (!el) return; updateGo();
  const D = APP.doc; if (!D || !D.files.length) { el.innerHTML = ''; return; }
  const canAi = !!APP.sample; const hasImg = D.images.length > 0; const imgOk = !!APP.sampleImages;
  const busy = D.aiBusy;
  el.innerHTML = `<div class="attach fade-in">
    <div class="att-files">${D.files.map(f => `<div class="att-file${f.err ? ' err' : ''}">${f.thumb ? `<img src="${f.thumb}" alt="">` : `<span class="att-ic">${f.kind === 'eml' || f.kind === 'msg' ? I.mail : I.cases}</span>`}<div><b>${esc(f.name)}</b><div class="tiny">${esc(f.status)}</div></div></div>`).join('')}<button class="btn ghost small" id="attClear">Remove all</button></div>
    ${canAi && !busy && (D.aiErr || (hasImg && !imgOk)) ? `<div class="att-ai">${hasImg && !imgOk ? '<p class="tiny" style="margin:6px 0 0">This view can\'t send images to Claude — only the text will be read.</p>' : ''}
      ${D.aiErr ? `<div class="callout warn">${I.warn}<div>${esc(D.aiErr)}</div></div>` : ''}</div>`
      : (!canAi && hasImg && !D.text.trim() ? `<div class="callout note">${I.info}<div><b>Reading drawings needs Claude</b>Open this page in the Claude viewer to read images and scanned PDFs, or type the key details (material, sizes, feature) above.</div></div>` : '')}
    ${D.cases > 1 ? `<div class="callout note">${I.info}<div><b>This email describes ${D.cases} separate jobs</b>${D.jobs ? `The guide sets them up one at a time. Now: <b>Case ${D.job}${(() => { const l = D.jobs.jobs.find(j => j.n === D.job)?.label; return l ? ' — ' + esc(l) : ''; })()}</b>.<div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">${D.jobs.jobs.filter(j => j.n !== D.job).map(j => `<button class="btn small" data-job="${j.n}">Set up Case ${j.n}${j.label ? ' — ' + esc(j.label) : ''} ${I.arrow}</button>`).join('')}</div>` : `The guide sets up one job at a time and starts with the first. To set up another, paste just that job's text into the box.`}</div></div>` : ''}
    ${D.ai && D.imgFail ? `<div class="callout warn">${I.warn}<div><b>Only the email text was read</b>The pictures couldn't be sent to Claude (${esc(D.imgFail)}), so sizes on the drawing were not seen. Type them in the box, or try again.</div></div>` : ''}
    ${D.ai ? `<div class="att-res">${D.ai.summary ? `<p style="margin:0 0 8px"><b>Customer need:</b> ${esc(D.ai.summary)}</p>` : ''}
      ${D.ai.callouts.length ? `<div class="tiny" style="margin-top:6px">From the email / drawing</div><ul class="watch" style="margin-top:4px">${D.ai.callouts.map(c => `<li>${I.check.replace('<svg', '<svg style="color:var(--ok)"')}<span>${esc(c)}</span></li>`).join('')}</ul>` : ''}
      ${D.ai.questions.length ? `<div class="tiny" style="margin-top:10px">Still unknown — ask the customer</div><ul class="watch" style="margin-top:4px">${D.ai.questions.map(c => `<li>${I.info.replace('<svg', '<svg style="color:var(--warn)"')}<span>${esc(c)}</span></li>`).join('')}</ul><button class="btn ghost small" id="copyQs" style="margin-top:6px">${I.copy} Copy questions</button>` : ''}</div>` : ''}
  </div>`;
}
function bindDrop() {
  const box = $('#askBox'); if (!box || box.dataset.dz) return; box.dataset.dz = '1';
  let depth = 0;
  box.addEventListener('dragenter', e => { e.preventDefault(); depth++; box.classList.add('drag'); });
  box.addEventListener('dragover', e => { e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'; });
  box.addEventListener('dragleave', () => { depth = Math.max(0, depth - 1); if (!depth) box.classList.remove('drag'); });
  box.addEventListener('drop', e => {
    e.preventDefault(); depth = 0; box.classList.remove('drag');
    const dt = e.dataTransfer; if (!dt) return;
    if (dt.files && dt.files.length) { addFiles(dt.files); return; }
    const txt = dt.getData('text/plain') || (dt.getData('text/html') ? htmlText(dt.getData('text/html')) : '');
    if (txt) { $('#askT').value = txt.slice(0, 6000); doAsk(txt); }
  });
  $('#askT').addEventListener('paste', e => {
    const items = [...(e.clipboardData?.items || [])].filter(i => i.kind === 'file');
    if (items.length) { e.preventDefault(); addFiles(items.map(i => i.getAsFile()).filter(Boolean)); }
  });
}

