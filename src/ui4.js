/* ============================================================
   UFIBER Guide — Replace XEBEC with UFIBER
   XEBEC grades brushes by color (no grit numbers). The color →
   grit mapping below follows NOGA MT's own case-study workbook
   (Pink→#2000, Red→#1200, White→#1000, Blue→#800). XEBEC grinding
   power ratio (XEBEC FAQ): Pink 30 : Red 100 : White 200 : Blue 600.
   XEBEC sizes / sleeves / max RPM from XEBEC & MISUMI listings.
   ============================================================ */
const XCOLOR = {
  A13: { c: 'Pink',  hex: '#F4A6C6', p: 30,  uf: 2000 },
  A11: { c: 'Red',   hex: '#D7263D', p: 100, uf: 1200 },
  A12: { c: 'Red',   hex: '#D7263D', p: 100, uf: 1200 },
  A21: { c: 'White', hex: '#F3F0E6', p: 200, uf: 1000 },
  A31: { c: 'Blue',  hex: '#2A6FDB', p: 600, uf: 800 },
  A32: { c: 'Blue',  hex: '#2A6FDB', p: 600, uf: 800 },
  A33: { c: 'Blue',  hex: '#2A6FDB', p: 600, uf: 800 },
};
const XSLEEVE = { 6: ['S06M', 6], 15: ['S15M-P', 6], 25: ['S25M', 8], 40: ['S40M-SD10', 10], 60: ['S60M', 12], 100: ['S100M', 16] };
const XSURF_MAX = { 6: 10000, 15: 6000, 25: 5000, 40: 3000, 60: 2000, 100: 1200 };
const XCH = { 1.5: { pilot: [3.5, 5] }, 3: { pilot: [5, 8] }, 5: { pilot: [8, 10] }, 7: { pilot: [10, 20] }, 11: { pilot: [14, 20] } };
const X_EXAMPLES = ['A21-CB25M', 'A32-CB40M', 'CH-A12-5M', 'CH-A33-7L', 'A11-EB06M', 'S25M', 'W-A11-75'];

function xParse(raw) {
  const s = raw.toUpperCase().replace(/XEBEC/g, '').replace(/[\s_]+/g, '').replace(/—|–/g, '-').trim();
  if (!s) return null;
  let m;
  if ((m = s.match(/^(A\d{2})-?CB(\d{2,3})M?$/))) return { raw, code: s, kind: 'surface', color: m[1], dia: parseInt(m[2], 10) };
  if ((m = s.match(/^(A\d{2})-?EB(\d{2,3})([MS])?$/))) { const d = { '06': 5, '05': 5, '03': 3, '025': 2.5, '02': 2, '015': 1.5, '01': 1 }[m[2]] ?? parseFloat(m[2]) / 10; return { raw, code: s, kind: 'end', color: m[1], dia: d }; }
  if ((m = s.match(/^CH-?(A\d{2})-?(\d+(?:\.\d+)?)([MLF])?(?:-TL)?$/))) return { raw, code: s, kind: 'cross', color: m[1], dia: parseFloat(m[2]), len: m[3] || 'M' };
  if ((m = s.match(/^W-?(A\d{2})-?(\d+)/))) return { raw, code: s, kind: 'wheel', color: m[1], dia: +m[2] };
  if ((m = s.match(/^S(\d{2,3})M(?:-[A-Z0-9]+)?$/))) return { raw, code: s, kind: 'sleeve', dia: parseInt(m[1], 10) };
  if (/^XP-?AUT/.test(s)) return { raw, code: s, kind: 'selfadj' };
  if (/^XP-?EZ/.test(s)) return { raw, code: s, kind: 'setter' };
  if (/^FH-?/.test(s) || /FLOATING/.test(s)) return { raw, code: s, kind: 'floating' };
  if (/^(A\d{2})-?TB/.test(s) || /TURNING/.test(s)) return { raw, code: s, kind: 'turning' };
  if (/^XC-?\d/.test(s) || /BACKBURR|BBC/.test(s)) return { raw, code: s, kind: 'backburr' };
  if (/^AX|STONE|MOUNTEDPOINT|PENCIL/.test(s)) return { raw, code: s, kind: 'stone' };
  if (/MICROMOTOR|MOBILE/.test(s)) return { raw, code: s, kind: 'motor' };
  return { raw, code: s, kind: 'unknown' };
}

function xConvert(p) {
  const out = { p, status: 'direct', uf: null, holders: [], notes: [], alts: [], xdesc: '' };
  const col = XCOLOR[p.color];
  const colTxt = col ? `${col.c} (${p.color})` : (p.color ? p.color : '');
  if (p.color && !col) out.notes.push(`Color code ${p.color} isn't in the cross-reference — pick the color manually below.`);
  const grit = col ? col.uf : 1000;
  if (p.kind === 'surface') {
    out.xdesc = `XEBEC Brush Surface, Ø${p.dia}, ${colTxt}`;
    let d = p.dia; if (!SURFACE[d]) { d = 100; out.status = 'close'; out.notes.push(`Ø${p.dia} is an Extra-Large XEBEC size. UFIBER surface brushes go up to Ø100 — run Ø100 with overlapping passes, or ask NOGA about a large-diameter option.`); }
    const k = skuSurface(d, grit); out.uf = { family: 'surface', fam: 'Surface Brush', dia: d, grit, ...k };
    const S = SURFACE[d]; out.holders.push({ role: 'Sleeve', sku: S.sleeve[0], desc: `${S.sleeve[1]}, Ø${S.ds} shank` });
    const xs = XSLEEVE[p.dia];
    if (xs && xs[1] !== S.ds) out.notes.push(`Collet change: XEBEC sleeve ${xs[0]} has a Ø${xs[1]} shank; UFIBER sleeve ${S.sleeve[0]} has Ø${S.ds}.`);
    if (XSURF_MAX[p.dia]) out.notes.push(`Speed: XEBEC lists ${fmtN(XSURF_MAX[p.dia])} RPM max for Ø${p.dia}; the UFIBER Ø${d} window is ${fmtN(S.rpm[0])}–${fmtN(S.rpm[1])} RPM.`);
    out.notes.push(p.dia >= 25 ? 'Projection: UFIBER sleeves allow 10 mm max (XEBEC allows up to 15 mm at this size). Re-set it when you switch.' : 'Projection: 10 mm max from the UFIBER sleeve — same as XEBEC at this size.');
    gritAlts(out, grit, (g) => skuSurface(d, g));
  } else if (p.kind === 'cross') {
    out.xdesc = `XEBEC Brush Crosshole, Ø${p.dia}, ${colTxt}${p.len === 'L' ? ', long' : p.len === 'F' ? ', extra-long' : ''}`;
    let d = p.dia; if (!CROSS[d]) { out.status = 'none'; out.notes.push(`Ø${p.dia} cross-hole brushes are outside the UFIBER range (Ø1.5–11). For bores over Ø20, use a UFIBER surface brush on a shank — the Find tool sizes it for you.`); return out; }
    let g = grit;
    if (d === 11 && g > 1000) { g = 1000; out.status = 'close'; out.notes.push('UFIBER Ø11 cross-hole brushes come in #600, #800 and #1000; #1000 is the nearest to red.'); }
    const k = skuCross(d, g); out.uf = { family: 'crosshole', fam: 'Cross-Hole Brush', dia: d, grit: g, ...k };
    const C = CROSS[d]; const r = g >= 1200 && C.pilotFine ? C.pilotFine : C.pilot; const xr = XCH[d]?.pilot;
    out.holders.push({ role: 'Holding', sku: '—', desc: `Ø${C.ds} mm shank, grip at least 30 mm` });
    if (xr && (xr[0] !== r[0] || xr[1] !== r[1])) out.notes.push(`Bore range: XEBEC Ø${d} covers Ø${xr[0]}–${xr[1]}; this UFIBER brush covers Ø${r[0]}–${r[1]}. Check your bore is inside it.`);
    else if (xr) out.notes.push(`Same bore range as the XEBEC brush: Ø${r[0]}–${r[1]}.`);
    if (p.len === 'L') { out.status = 'close'; out.notes.push('XEBEC "L" brushes are about 170 mm long; UFIBER cross-hole brushes are about 120–130 mm overall (Ø11: 180 mm). Check reach to the intersection.'); }
    if (p.len === 'F') { out.status = 'close'; out.notes.push('XEBEC Extra-Long (F) reaches deep bores. UFIBER has no extra-long standard brush — ask NOGA for a long version.'); }
    out.notes.push(`Speed: UFIBER Ø${d} max ${fmtN(C.max)} RPM. Keep your proven XEBEC speed if it is below that.`);
    gritAlts(out, g, (x) => (d === 11 && ![600, 800, 1000].includes(x)) ? null : skuCross(d, x));
  } else if (p.kind === 'end') {
    out.xdesc = `XEBEC Brush End Type, Ø${p.dia}, ${colTxt}`;
    if (p.dia >= 4.5) { const k = skuEnd(grit, false); out.uf = { family: 'end', fam: 'End Brush, flat', dia: 5, grit, ...k }; out.alts.push({ label: '90° angled tip', sku: skuEnd(grit, true).sku, note: 'For corners and tight recesses.' }); }
    else { const d = [1, 1.5, 2, 2.5, 3].reduce((a, b) => Math.abs(b - p.dia) < Math.abs(a - p.dia) ? b : a); if (d !== p.dia) out.status = 'close'; const k = skuPoint(d, grit); out.uf = { family: 'point', fam: 'Point Brush', dia: d, grit, ...k }; }
    out.holders.push({ role: 'Drive', sku: 'UF9999', desc: 'Portable E-Pack for hand use (or any electric spindle; not air tools)' });
    out.notes.push('UFIBER end and point brushes are rated to 12,000 RPM.');
    gritAlts(out, grit, (g) => out.uf.family === 'end' ? skuEnd(g, false) : skuPoint(out.uf.dia, g));
  } else if (p.kind === 'sleeve') {
    out.xdesc = `XEBEC sleeve for Ø${p.dia} surface brush`;
    const S = SURFACE[p.dia]; if (!S) { out.status = 'none'; out.notes.push('No matching UFIBER sleeve size.'); return out; }
    out.uf = { family: 'sleeve', fam: 'Surface Brush Sleeve', dia: p.dia, sku: S.sleeve[0], desc: S.sleeve[1] };
    const xs = XSLEEVE[p.dia]; if (xs && xs[1] !== S.ds) out.notes.push(`Shank changes from Ø${xs[1]} to Ø${S.ds} — use a Ø${S.ds} collet.`); else out.notes.push(`Same Ø${S.ds} shank.`);
    out.notes.push('Use UFIBER brushes in UFIBER sleeves.');
  } else if (p.kind === 'floating') {
    out.xdesc = 'XEBEC Floating Holder'; out.status = 'close';
    out.uf = { family: 'damper', fam: 'UFIBER Floating Damper', sku: 'UF8853–UF8860 / UF8851–UF8852', desc: 'BT30 or BT40 (5 mm float, ~50 N, 6,000 RPM max) or end type (4 mm float, ~20 N, 12,000 RPM max)' };
    out.notes.push('Pick by spindle taper and the brush sleeve shank: Ø6 → UF8853 (BT30) / UF8857 (BT40) / UF8851 (end type); Ø10 → UF8854 / UF8858 / UF8852; Ø12 → UF8855 / UF8859; Ø16 → UF8856 / UF8860.');
  } else if (p.kind === 'selfadj' || p.kind === 'setter') {
    out.xdesc = p.kind === 'selfadj' ? 'XEBEC Self-Adjusting Sleeve' : 'XEBEC brush length setter'; out.status = 'none';
    out.notes.push('No direct UFIBER equivalent. A UFIBER Floating Damper compensates for brush wear automatically, which removes most of the need for projection re-setting.');
  } else if (p.kind === 'wheel') {
    out.xdesc = `XEBEC Brush Wheel Type Ø${p.dia}`; out.status = 'none';
    out.notes.push('UFIBER has no wheel-type brush. For thread and side-wall burrs, try a Ø15 or Ø25 surface brush on a contouring path, or the 0.8 mm ceramic fiber disc for narrow walls — then validate with NOGA.');
  } else if (p.kind === 'turning') {
    out.xdesc = 'XEBEC Brush Turning'; out.status = 'none';
    out.notes.push('No UFIBER lathe-holder equivalent. On a lathe with live tooling, use cross-hole or surface brushes in a driven tool.');
  } else if (p.kind === 'backburr') {
    out.xdesc = 'XEBEC Back Burr Cutter'; out.status = 'none';
    out.notes.push('Not a brush, so no UFIBER equivalent. NOGA\'s own solution for front and back hole-edge deburring is UBURR.');
  } else if (p.kind === 'stone') {
    out.xdesc = 'XEBEC Stone / Ceramic Stone'; out.status = 'close';
    out.uf = { family: 'diamond', fam: 'UFIBER Ceramic Diamond Stone', sku: 'UF9xxx', desc: 'Ø1–3 mm, #200 / #400 / #600 / #800 — for carbide, hardened steel, EDM surfaces' };
    out.notes.push('For non-hardened materials a UFIBER Point or End brush is often the better replacement.');
  } else if (p.kind === 'motor') {
    out.xdesc = 'XEBEC mobile micromotor'; out.status = 'close';
    out.uf = { family: 'epack', fam: 'UFIBER Portable E-Pack', sku: 'UF9999', desc: '30,000 RPM, forward/reverse, RPM display, battery' };
  } else { out.xdesc = 'Not recognised'; out.status = 'unknown'; }
  return out;
}
function gritAlts(out, grit, skuFn) {
  const c = gritStep(grit, -1), f = gritStep(grit, 1);
  const kc = skuFn(c), kf = skuFn(f);
  if (kc) out.alts.push({ label: `More cutting power: #${c}`, sku: kc.sku, note: 'If burrs remain after the switch.' });
  if (kf && f !== grit) out.alts.push({ label: `Finer edge: #${f}`, sku: kf.sku, note: 'If burrs come off easily and you want a smaller edge break.' });
  if (out.p.color && XCOLOR[out.p.color]?.c === 'Blue') out.notes.push('XEBEC blue is its most aggressive grade (about 3× white). If the blue was chosen for tough burrs or titanium/heat-resistant alloys, also test #600 or #400.');
}

function replaceView() {
  const R = APP.xr || (APP.xr = { text: '', items: [] });
  return `<h1 class="h2" style="font-size:34px">Replace XEBEC with UFIBER</h1>
  <p class="muted" style="margin:4px 0 0;max-width:68ch">Paste one or many XEBEC item codes — from a quote, a tool list or the label on the brush. You get the UFIBER item, the holder, and what to change in the program.</p>
  <div class="ask" style="max-width:860px"><label for="xIn" class="sr">XEBEC item codes</label>
    <textarea id="xIn" placeholder="One code per line, e.g.\nA21-CB25M\nCH-A12-5M\nS25M">${esc(R.text)}</textarea>
    <div class="ask-bar"><div class="examples" style="margin:0">${X_EXAMPLES.map(x => `<button class="chip" data-xex="${x}">${x}</button>`).join('')}</div><button class="btn primary" id="xGo">${I.swap} Convert</button></div></div>
  <details class="acc" style="max-width:860px;margin-top:12px"${R.pickOpen ? ' open' : ''}><summary><span class="ic">${GLYPH.small}</span>Don't know the code? Pick it</summary><div class="body">${xPicker()}</div></details>
  <div id="xOut">${R.items.length ? xResults(R.items) : ''}</div>
  ${R.items.length ? '' : `<section class="panel" style="max-width:860px;margin-top:16px"><div class="panel-t"><h2>What changes when you switch</h2></div><ul class="watch">${[
    'Same sizes: surface brushes Ø6–100 and cross-hole brushes Ø1.5–11 exist in both ranges, so toolpaths usually carry over.',
    'Colors become grits: XEBEC has 4 color grades; UFIBER has 10 grits (#150–#6000), so you can fine-tune cutting power and edge break.',
    'Sleeve shanks differ on Ø25 and Ø40 — check your collets.',
    'UFIBER surface brushes: projection max 10 mm, feed max 2,000 mm/min, depth max 1.2 mm. Programs running faster than that need adjusting.',
    'Validate on the first part, then lock in the program.'].map(t => `<li>${I.check.replace('<svg', '<svg style="color:var(--ok)"')}<span>${t}</span></li>`).join('')}</ul></section>`}`;
}
function xPicker() {
  const P = APP.xpick || (APP.xpick = { kind: 'surface', dia: 25, color: 'A21' });
  const dias = P.kind === 'surface' ? [6, 15, 25, 40, 60, 100] : P.kind === 'cross' ? [1.5, 3, 5, 7, 11] : [1, 2.5, 3, 5];
  const cols = P.kind === 'cross' ? ['A12', 'A33'] : P.kind === 'surface' ? ['A13', 'A11', 'A21', 'A32'] : ['A13', 'A11', 'A21', 'A31'];
  return `<div class="field" style="margin-top:4px"><label>Type</label><div class="seg">${[['surface', 'Surface (cup) brush'], ['cross', 'Crosshole brush'], ['end', 'End type brush']].map(([k, l]) => `<button data-xpk="${k}" aria-pressed="${P.kind === k}">${l}</button>`).join('')}</div></div>
    <div class="field"><label>Brush diameter</label><div class="seg">${dias.map(d => `<button data-xpd="${d}" aria-pressed="${P.dia === d}">Ø${d}</button>`).join('')}</div></div>
    <div class="field"><label>Bristle color</label><div class="gritrow">${cols.map(c => `<button data-xpc="${c}" aria-pressed="${P.color === c}"><span class="gdot" style="background:${XCOLOR[c].hex}"></span>${XCOLOR[c].c}</button>`).join('')}</div></div>
    <div class="row" style="margin-top:14px"><button class="btn" id="xPickAdd">Add to list</button><span class="small muted">→ ${esc(xCodeFromPick(P))}</span></div>`;
}
function xCodeFromPick(P) {
  if (P.kind === 'surface') return `${P.color}-CB${String(P.dia).padStart(2, '0')}M`;
  if (P.kind === 'cross') return `CH-${P.color}-${P.dia}M`;
  return `${P.color}-EB${{ 5: '06', 3: '03', 2.5: '025', 1: '01' }[P.dia] || '06'}${P.dia >= 3 ? 'M' : 'S'}`;
}
const XSTAT = { direct: ['high', 'Direct replacement'], close: ['medium', 'Close replacement — check notes'], none: ['low', 'No direct UFIBER equivalent'], unknown: ['low', 'Code not recognised'] };
function xResults(items) {
  const multi = items.length > 1;
  return `<div class="section-t"><h2 class="h2">${items.length} item${multi ? 's' : ''} converted</h2><div class="row">${multi ? `<button class="btn small" id="xCopy">${I.copy} Copy list</button>` : ''}<button class="btn small" id="xMail">${I.mail} Request a quote</button></div></div>
  <div id="mailSlot"></div><div id="copySlot"></div>
  <div class="xlist">${items.map((o, i) => xCard(o, i)).join('')}</div>`;
}
function xCard(o, i) {
  const st = XSTAT[o.status]; const col = XCOLOR[o.p.color]; const ufG = o.uf?.grit ? G(o.uf.grit) : null;
  const canSetup = o.uf && ['surface', 'crosshole', 'end', 'point'].includes(o.uf.family);
  return `<article class="xcard">
    <div class="xside"><div class="tiny">XEBEC</div><div class="xcode num">${esc(o.p.code)}</div><div class="small muted">${esc(o.xdesc)}</div>${col ? `<div class="small" style="margin-top:4px"><span class="gdot" style="background:${col.hex}"></span>${col.c} — grinding power ${col.p} on XEBEC's scale (red = 100)</div>` : ''}</div>
    <div class="xarrow" aria-hidden="true">${I.arrow}</div>
    <div class="xside"><div class="row" style="justify-content:space-between"><span class="tiny">UFIBER</span><span class="badge ${st[0]}">${st[1]}</span></div>
      ${o.uf ? `<div class="xcode num">${esc(o.uf.sku)}</div><div class="small muted">${esc(o.uf.fam)}${o.uf.dia ? `, Ø${o.uf.dia}` : ''} · ${esc(o.uf.desc)}</div>${ufG ? `<div class="small" style="margin-top:4px"><span class="gdot" style="background:${ufG.hex}"></span>#${ufG.grit} ${ufG.color.toLowerCase()} — ${ufG.action.toLowerCase()}</div>` : ''}${o.holders.map(h => `<div class="small" style="margin-top:4px"><b>${esc(h.role)}:</b> ${h.sku !== '—' ? `<b class="num">${esc(h.sku)}</b> ` : ''}${esc(h.desc)}</div>`).join('')}` : `<div class="small muted" style="margin-top:6px">See notes.</div>`}
    </div>
    ${o.notes.length ? `<ul class="xnotes">${o.notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}
    ${o.alts.length ? `<div class="row" style="grid-column:1/-1">${o.alts.map(a => `<span class="chip" style="cursor:default">${esc(a.label)} <b class="num">${esc(a.sku)}</b></span>`).join('')}</div>` : ''}
    ${canSetup ? `<details class="xprog" style="grid-column:1/-1"${o.progOpen ? ' open' : ''}><summary>Check my XEBEC program</summary>${xProgForm(o, i)}</details>` : ''}
  </article>`;
}
function xProgForm(o, i) {
  const pr = o.prog || {};
  const cross = o.uf.family === 'crosshole';
  return `<div class="xprog-grid">
    ${numField(`xpR${i}`, 'RPM', pr.rpm ?? '', '', 'RPM')}
    ${numField(`xpF${i}`, 'Feed', pr.feed != null ? (isIn() ? +(pr.feed / 25.4).toFixed(1) : pr.feed) : '', '', feedU())}
    ${cross ? '' : numField(`xpD${i}`, 'Depth of cut', lenVal(pr.doc), '', lenU())}
    ${cross ? '' : numField(`xpP${i}`, 'Projection', lenVal(pr.proj), '', lenU())}
    <div class="field"><label for="xpM${i}">Material (optional)</label><div class="inp"><select id="xpM${i}"><option value="">—</option>${Object.entries(MATERIALS).map(([k, m]) => `<option value="${k}"${pr.mat === k ? ' selected' : ''}>${m.name}</option>`).join('')}</select></div></div>
  </div>
  <div class="row" style="margin-top:10px"><button class="btn primary small" data-xcheck="${i}">Check against UFIBER limits</button>${o.uf.family !== 'sleeve' ? `<button class="btn small" data-xsetup="${i}">Open full UFIBER setup ${I.arrow}</button>` : ''}</div>
  <div id="xpOut${i}">${o.check ? o.check : ''}</div>`;
}
function xCheck(o) {
  const pr = o.prog || {}; const rows = [];
  if (o.uf.family === 'surface') {
    const S = SURFACE[o.uf.dia];
    if (pr.rpm) rows.push(['Speed', `${fmtN(pr.rpm)} RPM`, pr.rpm > S.rpm[1] ? `${fmtN(S.rpm[1])} RPM` : `${fmtN(pr.rpm)} RPM`, pr.rpm > S.rpm[1] ? `Above the UFIBER Ø${o.uf.dia} window (${fmtN(S.rpm[0])}–${fmtN(S.rpm[1])}). Start at the top of the window.` : pr.rpm < S.rpm[0] ? `Below the UFIBER window — fine to start at your proven speed; raise toward ${fmtN(S.rpm[0])} if burrs remain.` : 'Inside the UFIBER window. Keep it.']);
    if (pr.feed) rows.push(['Feed', `${feedOut(pr.feed)} ${feedU()}`, `${feedOut(Math.min(pr.feed, 2000))} ${feedU()}`, pr.feed > 2000 ? 'UFIBER catalogue maximum for surface brushes is 2,000 mm/min. Start there and add a pass if needed.' : 'Within the UFIBER limit. Keep it.']);
    if (pr.doc) rows.push(['Depth of cut', `${lenOut(pr.doc)} ${lenU()}`, `${lenOut(Math.min(pr.doc, 1.2))} ${lenU()}`, pr.doc > 1.2 ? 'Above the 1.2 mm UFIBER maximum. Prefer 0.5 mm for deburring.' : pr.doc > 0.5 ? 'Allowed, but above the 0.5 mm deburring reference — watch wear.' : 'Fine. Keep it.']);
    if (pr.proj) rows.push(['Projection', `${lenOut(pr.proj)} ${lenU()}`, `${lenOut(Math.min(pr.proj, 10))} ${lenU()}`, pr.proj > 10 ? 'UFIBER sleeves allow 10 mm max. Shorter projection is stiffer, so check edge break on the first part.' : 'Fine. Keep it.']);
  } else if (o.uf.family === 'crosshole') {
    const C = CROSS[o.uf.dia];
    if (pr.rpm) rows.push(['Speed', `${fmtN(pr.rpm)} RPM`, `${fmtN(Math.min(pr.rpm, C.max))} RPM`, pr.rpm > C.max ? `Above the UFIBER maximum of ${fmtN(C.max)} RPM.` : 'Below the UFIBER maximum. Keep it.']);
    if (pr.feed) rows.push(['Feed', `${feedOut(pr.feed)} ${feedU()}`, `${feedOut(pr.feed)} ${feedU()}`, 'Keep it. Same stroke rule: 5 mm past each side of the intersection.']);
  } else {
    if (pr.rpm) rows.push(['Speed', `${fmtN(pr.rpm)} RPM`, `${fmtN(Math.min(pr.rpm, 12000))} RPM`, pr.rpm > 12000 ? 'UFIBER end and point brushes are rated to 12,000 RPM.' : 'Within the 12,000 RPM rating. Keep it.']);
    if (pr.feed) rows.push(['Feed', `${feedOut(pr.feed)} ${feedU()}`, `${feedOut(pr.feed)} ${feedU()}`, 'Keep it.']);
  }
  if (!rows.length) return `<p class="small muted">Enter at least one value.</p>`;
  return `<div class="scroll-x" style="margin-top:10px"><table class="tbl"><tr><th>Parameter</th><th>XEBEC now</th><th>UFIBER start</th><th>Why</th></tr>${rows.map(r => `<tr><td>${r[0]}</td><td class="num">${r[1]}</td><td class="num"><b>${r[2]}</b></td><td class="small">${esc(r[3])}</td></tr>`).join('')}</table></div>`;
}
function xConvertAll(text) {
  const codes = text.split(/[\n,;\t]+/).map(s => s.trim()).filter(Boolean).slice(0, 60);
  return codes.map(c => xConvert(xParse(c))).filter(Boolean);
}
function xListText(items) {
  return ['XEBEC code\tXEBEC item\tUFIBER SKU\tUFIBER description\tHolder\tStatus', ...items.map(o => [o.p.code, o.xdesc, o.uf?.sku || '—', o.uf ? `${o.uf.fam}${o.uf.dia ? ' Ø' + o.uf.dia : ''} ${o.uf.desc}` : '—', o.holders.map(h => h.sku !== '—' ? h.sku : '').filter(Boolean).join(' ') || '—', XSTAT[o.status][1]].join('\t'))].join('\n');
}
function xSetupState(o) {
  const st = newState();
  const fam = o.uf.family;
  st.task = fam === 'crosshole' ? 'crosshole' : 'deburr_mill';
  st.feature = fam === 'crosshole' ? 'cross' : fam === 'point' ? 'small' : 'edge';
  st.material = o.prog?.mat || 'other';
  st.override = { family: fam === 'end' ? 'end' : fam, grit: o.uf.grit, dia: fam === 'end' ? undefined : o.uf.dia };
  if (fam === 'crosshole') { const C = CROSS[o.uf.dia]; const r = o.uf.grit >= 1200 && C.pilotFine ? C.pilotFine : C.pilot; st.dims = { main: +((r[0] + r[1]) / 2).toFixed(1) }; }
  if (o.prog?.rpm) st.machine.maxRpm = null;
  st.fromX = o.p.code;
  return st;
}

