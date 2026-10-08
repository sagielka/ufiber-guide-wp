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
function msgText(buf) {
  // A .msg is an OLE compound file. Parse the container and take the real
  // subject and body; scraping the raw bytes invents numbers that are not in
  // the message, which is worse than reading nothing.
  try {
    const m = msgRead(buf);
    if (m && (m.body || m.subject)) return ((m.subject ? 'Subject: ' + m.subject + '\n\n' : '') + m.body).slice(0, 8000);
  } catch (e) { }
  return '';
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
  let text = ''; const images = []; let thumb = null;
  for (let p = 1; p <= Math.min(pdf.numPages, 4); p++) {
    const page = await pdf.getPage(p);
    const tc = await page.getTextContent(); text += tc.items.map(i => i.str).join(' ') + '\n';
    if (p <= 2) {
      const vp0 = page.getViewport({ scale: 1 }); const scale = Math.min(3, 2200 / Math.max(vp0.width, vp0.height));
      const vp = page.getViewport({ scale }); const c = document.createElement('canvas'); c.width = Math.floor(vp.width); c.height = Math.floor(vp.height);
      const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
      await page.render({ canvasContext: ctx, viewport: vp }).promise;
      images.push(await canvasBlob(c)); if (p === 1) { images.push(await cropBR(c)); thumb = c.toDataURL('image/jpeg', .6); }
    }
  }
  return { text: text.replace(/\s+/g, ' ').trim(), images, thumb, pages: pdf.numPages };
}
async function readImage(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = bad; i.src = url; });
    const sc = Math.min(1, 2400 / Math.max(img.width, img.height));
    const c = document.createElement('canvas'); c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
    const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height);
    const full = await canvasBlob(c); const imgs = [full]; if (img.width > 1200 || img.height > 1200) imgs.push(await cropBR(c));
    return { images: imgs, thumb: c.toDataURL('image/jpeg', .6) };
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
        const t = msgText(await f.arrayBuffer()); D.text += `EMAIL (Outlook .msg)\n${t}\n\n`;
        entry.status = t ? 'Email text extracted. Attachments inside .msg aren\'t opened — drop the drawing file too.'
          : 'This .msg could not be read. Paste the email text into the box instead — guessing from the file would invent numbers.';
      } else if (entry.kind === 'html') { D.text += htmlText(await f.text()) + '\n\n'; entry.status = 'Text read'; }
      else if (entry.kind === 'text') { D.text += (await f.text()).slice(0, 20000) + '\n\n'; entry.status = 'Text read'; }
      else if (entry.kind === 'pdf') {
        const r = await readPdf(f); entry.thumb = r.thumb; D.images.push(...r.images);
        if (r.text) D.text += `DRAWING / PDF TEXT (${f.name})\n${r.text.slice(0, 6000)}\n\n`;
        entry.status = `${r.pages} page${r.pages > 1 ? 's' : ''}${r.text ? ', text layer read' : ', no text layer (scanned)'}`;
      } else if (entry.kind === 'image') { const r = await readImage(f); entry.thumb = r.thumb; D.images.push(...r.images); entry.status = 'Image ready'; }
      else entry.status = 'This file type can\'t be read. Use .eml, .msg, .txt, PDF or an image.';
    } catch (err) { entry.status = entry.kind === 'pdf' ? 'Couldn\'t open this PDF here. Try a screenshot of the drawing instead.' : 'Couldn\'t read this file.'; entry.err = true; }
    renderAttach();
  }
  // local reading straight away — free and instant
  if (D.text.trim()) { const ex = excerpt(D); const ta = $('#askT'); if (ta) ta.value = ex; doAsk(ex, { ai: false }); }
  renderAttach();
}
function excerpt(D) { return D.text.replace(/\n{3,}/g, '\n\n').trim().slice(0, 1800); }

/* ---------- Claude reading ---------- */
let aiCtl = null;
async function aiRead() {
  const D = APP.doc; if (!D || !APP.sample) return;
  aiCtl = new AbortController(); D.aiBusy = true; D.aiErr = null; renderAttach();
  const enumList = (o) => Object.keys(o).join(' | ');
  const maxImg = APP.sampleImages ? APP.sampleImages.maxCount : 0;
  const imgs = maxImg ? D.images.slice(0, maxImg) : [];
  const prompt = `You are a NOGA MT application engineer for UFIBER ceramic fiber deburring and finishing tools.
A customer sent the material below${imgs.length ? ' plus ' + imgs.length + ' image(s) of their drawing or part (a full page, and a zoom of the bottom-right title block)' : ''}.
Extract the deburring / finishing application. Reply with ONLY one JSON object with these fields:
${extractionSpec()}
plus "callouts": ["up to 6 short requirements from the email/drawing that affect deburring or finish: edge-break limits, Ra, 'burr-free' notes, hardness, coatings, tolerances near edges, quantities"].
For this customer material, "questions" are what is still unknown and worth asking the customer.

CUSTOMER MATERIAL:
"""
${D.text.slice(0, 14000) || '(no text — images only)'}
"""`;
  try {
    const r = await APP.sample.json(prompt, { images: imgs.length ? imgs : undefined, signal: aiCtl.signal });
    applyAi(r);
  } catch (e) {
    const msg = { cancelled: null, not_granted: 'Reading with Claude was not allowed in this view. The local reading above still works.', rate_limited: 'Too many requests right now — try again in a minute.', image_rejected: 'One of the images couldn\'t be used. Try a smaller screenshot.', images_unavailable: 'Images can\'t be sent from this view — only the email text was read.', invalid_json: 'Claude\'s answer couldn\'t be read. Try again.', refused: 'Claude couldn\'t process this content.', session_expired: 'Your session expired — sign in again.' }[e && e.code];
    D.aiErr = msg === undefined ? 'Something went wrong reading the document. Try again.' : msg;
    if (['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled'].includes(e && e.code)) APP.sample = null;
  } finally { D.aiBusy = false; renderAttach(); }
}
function applyAi(r) {
  const D = APP.doc; if (!r || typeof r !== 'object') { D.aiErr = 'No usable answer. Try again.'; return; }
  applyExtraction(r, null);
  D.ai = { summary: String(r.summary || '').slice(0, 300), callouts: (Array.isArray(r.callouts) ? r.callouts : []).map(String).slice(0, 6), questions: (Array.isArray(r.questions) ? r.questions : []).map(q => typeof q === 'string' ? q : q && q.ask).filter(Boolean).slice(0, 3) };
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
  const el = $('#attach'); if (!el) return;
  const D = APP.doc; if (!D || !D.files.length) { el.innerHTML = ''; return; }
  const canAi = !!APP.sample; const hasImg = D.images.length > 0; const imgOk = !!APP.sampleImages;
  const busy = D.aiBusy;
  el.innerHTML = `<div class="attach fade-in">
    <div class="att-files">${D.files.map(f => `<div class="att-file${f.err ? ' err' : ''}">${f.thumb ? `<img src="${f.thumb}" alt="">` : `<span class="att-ic">${f.kind === 'eml' || f.kind === 'msg' ? I.mail : I.cases}</span>`}<div><b>${esc(f.name)}</b><div class="tiny">${esc(f.status)}</div></div></div>`).join('')}<button class="btn ghost small" id="attClear">Remove all</button></div>
    ${canAi ? `<div class="att-ai">${busy ? `<div class="row"><span class="spinner" aria-hidden="true"></span><span><b>Claude is reading ${hasImg && imgOk ? 'the email and drawing' : 'the document'}…</b><br><span class="tiny">Usually 20–60 seconds.</span></span><button class="btn small" id="aiStop">Stop</button></div>`
      : `<div class="row" style="justify-content:space-between"><span class="small">${D.ai ? 'Read by Claude — check the details below.' : (hasImg && !D.text.trim() ? 'Drawings and photos need Claude to read them.' : 'Quick local reading done. Claude can read the full email' + (hasImg ? ' and the drawing' : '') + ' for more detail.')}</span><button class="btn ${D.ai ? '' : 'primary'} small" id="aiGo">${I.find} ${D.ai ? 'Read again' : 'Read with Claude'}</button></div>${hasImg && !imgOk ? '<p class="tiny" style="margin:6px 0 0">This view can\'t send images to Claude — only the text will be read.</p>' : ''}`}
      ${D.aiErr ? `<div class="callout warn">${I.warn}<div>${esc(D.aiErr)}</div></div>` : ''}</div>`
      : (hasImg && !D.text.trim() ? `<div class="callout note">${I.info}<div><b>Reading drawings needs Claude</b>Open this page in the Claude viewer to read images and scanned PDFs, or type the key details (material, sizes, feature) above.</div></div>` : '')}
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

