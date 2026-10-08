/* ============================================================
   UFIBER Guide — Speeds & feeds tab
   ============================================================ */
APP.sf = { fam: 'surface', dia: 25, bore: 8, csize: null, pdia: 2, angled: false, ddia: 22, row: 2, iso: 'P', mode: 'deburr', grit: null, hand: false, worn: false, maxRpm: null };
const SF_FAMS = [['surface', 'Surface'], ['crosshole', 'Cross-hole'], ['point', 'Point'], ['end', 'End'], ['disc', 'Disc']];
const SF_ISO = { P: 'Steel', M: 'Stainless', K: 'Cast iron', N: 'Non-ferrous & plastics', S: 'Heat-resistant & titanium', H: 'Hardened' };
const SF_ROW_TO_MAT = id => id <= 2 || id === 4 || id === 6 ? ['carbon', 'annealed'] : [3, 5, 7, 8, 9].includes(id) ? ['carbon', 'treated'] : [10, 11, 38, 40, 41].includes(id) ? ['hardened', 'le55'] : id === 39 ? ['hardened', 'gt55'] : [12, 13].includes(id) ? ['stainless', 'mart'] : id === 14 ? ['stainless', 'aust'] : [15, 17, 19].includes(id) ? ['castiron', 'grey'] : [16, 18, 20].includes(id) ? ['castiron', 'pearl'] : [21, 22].includes(id) ? ['aluminum', 'wrought'] : [23, 24].includes(id) ? ['aluminum', 'cast'] : id === 25 ? ['aluminum', 'hisi'] : [26, 27].includes(id) ? ['brass', null] : id === 28 ? ['copper', null] : [29, 30].includes(id) ? ['plastic', null] : [31, 32].includes(id) ? ['hrsa', 'fe'] : [33, 34, 35].includes(id) ? ['hrsa', 'ni'] : ['titanium', null];
const fmtR = (a, u = '') => a ? (a[0] === a[1] ? fmtN(a[0]) : `${fmtN(a[0])}–${fmtN(a[1])}`) + u : '—';
const fmtFR = a => a ? (a[0] === a[1] ? feedOut(a[0]) : `${feedOut(a[0])}–${feedOut(a[1])}`) : '—';
const fmtLR = a => a ? (a[0] === a[1] ? lenOut(a[0]) : `${lenOut(a[0])}–${lenOut(a[1])}`) : '—';

function sfGritOptions(S, row) {
  if (S.fam === 'disc') { const k = SF_DISC_OF[row.id]; return k ? (S.mode === 'polish' ? SF_DISC[k].gP : SF_DISC[k].gD) : [150, 200, 400, 600, 800, 1000]; }
  return GRITS.map(g => g.grit);
}
function sfTableGrits(S, row) {
  if (S.fam === 'disc') { const k = SF_DISC_OF[row.id]; return k ? (S.mode === 'polish' ? SF_DISC[k].gP : SF_DISC[k].gD) : []; }
  return S.mode === 'polish' ? row.gP : row.gD.list.concat(row.gD.fine ? [row.gD.fine] : []);
}
function sfAutoGrit(S, row) {
  if (S.fam === 'disc') { const l = sfTableGrits(S, row); return l.length ? l[0] : 600; }
  if (S.mode === 'polish') return row.gP[0];
  return row.gKey === 'G2' ? 200 : row.gD.list[0];
}
function sfCompute() {
  const S = APP.sf, row = sfRow(S.row);
  const grit = S.grit || sfAutoGrit(S, row);
  const mx = Number(S.maxRpm) || null;
  let r, sku, holder;
  if (S.fam === 'surface') { r = sfSurface({ row, dia: S.dia, grit, mode: S.mode, worn: S.worn, maxRpm: mx }); r.grit = grit; sku = skuSurface(S.dia, grit); holder = `Sleeve ${SURFACE[S.dia].sleeve[0]} (${SURFACE[S.dia].sleeve[1]})`; r.size = S.dia; }
  else if (S.fam === 'crosshole') {
    r = sfCross({ row, bore: Number(S.bore) || 0, grit, mode: S.mode, worn: S.worn, maxRpm: mx, size: S.csize });
    if (r.method === 'shank' && !r.error) { sku = skuSurface(r.size, r.grit); holder = `Shank ${r.shank[0]} (${r.shank[1]}) — ${r.shank[2]}. No sleeve.`; }
    else if (r.method === 'point') { sku = skuPoint(r.size, r.grit); holder = 'Collet for the brush shank — grip at least 20 mm'; }
    else if (!r.error) { sku = skuCross(r.size, r.grit); holder = `Ø${CROSS[r.size].ds} mm shank — grip at least 30 mm`; }
  }
  else if (S.fam === 'point') { r = sfPoint({ row, dia: S.pdia, mode: S.mode, hand: S.hand, maxRpm: mx }); r.grit = grit; sku = skuPoint(S.pdia, grit); holder = S.hand ? 'Portable E-Pack UF9999 or electric handpiece' : 'Collet for the brush shank — grip at least 20 mm'; r.size = S.pdia; }
  else if (S.fam === 'end') { r = sfEnd({ row, mode: S.mode, hand: S.hand, maxRpm: mx }); r.grit = grit; sku = skuEnd(grit, S.angled); holder = S.hand ? 'Portable E-Pack UF9999 or electric handpiece' : 'Collet for the brush shank — grip at least 20 mm'; r.size = 5; }
  else { const g = Math.min(Math.max(grit, 150), 1000); r = sfDisc({ row, dia: S.ddia, mode: S.mode, maxRpm: mx }); r.grit = sfGritOptions(S, row).includes(g) ? g : (sfTableGrits(S, row)[0] || 600); sku = skuDisc(S.ddia, r.grit); holder = 'Clamping shank UF7030 (Ø3) or UF7023 (Ø2.35)'; r.size = S.ddia; }
  return { r, row, sku, holder };
}
function sfView() {
  const S = APP.sf; const { r, row, sku, holder } = sfCompute();
  const rowsIso = SF_ROWS.filter(x => x.iso === S.iso);
  const gOpts = sfGritOptions(S, row); const tGr = sfTableGrits(S, row); const gNow = r.grit || S.grit || sfAutoGrit(S, row);
  const famPick = SF_FAMS.map(([k, l]) => `<button data-sffam="${k}" aria-pressed="${S.fam === k}">${l}</button>`).join('');
  let size = '';
  if (S.fam === 'surface') size = `<div class="field"><label>Brush diameter</label><div class="seg">${[6, 15, 25, 40, 60, 100].map(d => `<button data-sfdia="${d}" aria-pressed="${S.dia === d}">${diaOut(d)}</button>`).join('')}</div></div>`;
  if (S.fam === 'crosshole') size = numField('sfBore', 'Bore (pilot hole) diameter — the hole the brush enters', lenVal(S.bore), 'Ø3.5–20 mm: cross-hole brush (Ø2.5–3.5: Ø1.5 brush, based on a NOGA case). Above Ø20: surface brush on a shank. Below Ø2.5: point brush.') + (r.fits && r.fits.length > 1 ? `<div class="field"><label>${r.method === 'shank' ? 'Surface brushes that fit this bore' : 'Brushes that fit this bore'}</label><div class="seg">${r.fits.map(f => `<button data-sfcs="${f.d}" aria-pressed="${r.size === f.d}">Ø${f.d} <span class="tiny">${f.r ? `(Ø${f.r[0]}–${f.r[1]})` : `(bore ≥ Ø${f.min})`}</span></button>`).join('')}</div><span class="hint">The largest fitting brush is recommended; smaller ones also work${r.method === 'shank' ? ' with a circular toolpath' : ''}.</span></div>` : '');
  if (S.fam === 'point') size = `<div class="field"><label>Brush diameter</label><div class="seg">${[1, 1.5, 2, 2.5, 3].map(d => `<button data-sfpd="${d}" aria-pressed="${S.pdia === d}">${diaOut(d)}</button>`).join('')}</div></div>`;
  if (S.fam === 'end') size = `<div class="field"><label>Tip</label><div class="seg"><button data-sfang="0" aria-pressed="${!S.angled}">Flat (UF4…50)</button><button data-sfang="1" aria-pressed="${S.angled}">45° (UF6…50)</button></div></div>`;
  if (S.fam === 'disc') size = `<div class="field"><label>Disc diameter</label><div class="seg">${[13, 19, 22, 25, 30].map(d => `<button data-sfdd="${d}" aria-pressed="${S.ddia === d}">${diaOut(d)}</button>`).join('')}</div></div>`;
  const opTog = ['point', 'end'].includes(S.fam) ? `<div class="field"><label>Operation</label><div class="seg"><button data-sfhand="0" aria-pressed="${!S.hand}">CNC / robot</button><button data-sfhand="1" aria-pressed="${S.hand}">Hand-held</button></div></div>` : ['surface', 'crosshole'].includes(S.fam) ? `<div class="field"><label>Brush condition</label><div class="seg"><button data-sfworn="0" aria-pressed="${!S.worn}">New</button><button data-sfworn="1" aria-pressed="${S.worn}">Worn (+10% RPM)</button></div></div>` : '';
  const engV = r.eng != null ? `${lenOut(r.eng)}<small>${lenU()}</small>` : (r.family === 'crosshole' ? `${r.size ? '' : '—'}` : 'Light');
  const out = r.error ? `<div class="callout warn">${I.warn}<div><b>No standard recommendation</b>${esc(r.error)}</div></div>` : `
    ${r.method ? `<div class="callout note" style="margin-top:0;margin-bottom:12px">${I.info}<div><b>${r.method === 'shank' ? 'Bore above Ø20 mm — surface-brush method' : r.method === 'small' ? 'Bore below Ø3.5 mm — outside the catalogue range' : 'Bore below Ø2.5 mm — point-brush fallback'}</b>${r.method === 'shank' ? 'Cross-hole brushes stop at Ø20 mm, so NOGA uses a surface brush on a shank, without its sleeve.' : r.method === 'small' ? 'The Ø1.5 brush has been used successfully in a Ø2.6 mm hole by NOGA; the numbers come from that case study.' : 'No cross-hole brush fits this small a bore.'}</div></div>` : ''}
    <div class="sf-tool"><div><div class="fam">${esc(r.method === 'shank' ? 'Surface Brush on shank' : r.method === 'point' ? 'Point Brush' : { surface: 'Surface Brush', crosshole: 'Cross-Hole Brush', point: 'Point Brush', end: S.angled ? 'End Brush, 45°' : 'End Brush, flat', disc: 'Ceramic Fiber Disc' }[S.fam])} ${diaOut(r.size)} · <span class="gdot" style="background:${G(r.grit)?.hex}"></span>#${r.grit}</div><div class="sku num">${esc(sku.sku)}</div><div class="desc">${esc(sku.desc)}</div><div class="small muted" style="margin-top:4px">${esc(holder)}</div></div></div>
    <div class="readouts" style="margin-top:12px">
      <div class="ro wide"><div class="k">Starting spindle speed</div><div class="v">${fmtN(r.rpm)}<small>RPM</small></div><div class="n">${S.hand ? 'Hand-held range' : 'Range'} ${fmtR(r.rpmRange)} RPM · max ${fmtN(r.rpmMax)}${r.vcRange ? ` · table cutting speed ${r.vcRange[0]}–${r.vcRange[1]} m/min` : ''}</div><div class="gauge">${gauge({ rpm: r.rpm, rpmLo: r.rpmRange[0], rpmHi: r.rpmRange[1], rpmMax: r.rpmMax }, Number(S.maxRpm) || null)}</div></div>
      <div class="ro"><div class="k">Feed</div><div class="v">${r.feed != null ? feedOut(r.feed) + `<small>${feedU()}</small>` : 'By hand'}</div><div class="n">${r.feedRange ? `Table ${fmtFR(r.feedRange)} ${feedU()}` : 'Keep the brush moving'}</div></div>
      <div class="ro"><div class="k">${esc(r.engLabel)}</div><div class="v">${['crosshole', 'shank'].includes(r.family) ? '5 mm past<small>each side</small>' : engV}</div><div class="n">${r.family === 'shank' ? `Radial clearance ${lenOut(r.clearance)} ${lenU()} — ${r.clearance >= 1 ? 'circular toolpath' : 'brush fills the bore'}` : r.family === 'crosshole' ? 'No depth of cut — the fibers expand into the bore' : r.engRange ? `Table ${fmtLR(r.engRange)} ${lenU()}${r.engMax ? ' · 1.2 mm max' : ''}` : 'Light, controlled contact'}</div></div>
      <div class="ro"><div class="k">Passes</div><div class="v">${esc(String(r.passes).replace('-', '–'))}</div>${r.family === 'crosshole' ? '<div class="n">Pull back and push forward; CW then CCW</div>' : ''}</div>
      <div class="ro txt"><div class="k">Coolant</div><div class="v">${esc(r.cool || '—')}</div></div>
      <div class="ro wide txt"><div class="k">NOGA table grits for this material</div><div class="v" style="font-size:16px">${S.mode === 'polish' ? (S.fam === 'disc' ? tGr.map(g => '#' + g).join(' / ') : row.gP.map(g => '#' + g).join(' → ') + ' final') : (S.fam === 'disc' ? tGr.map(g => '#' + g).join(' / ') : row.gD.list.map(g => '#' + g).join(' / ') + (row.gD.fine ? ` · #${row.gD.fine} for fine burrs` : '') + (row.gD.note ? ` · ${row.gD.note}` : ''))}</div></div>
    </div>
    ${r.family === 'shank' ? `<details class="sf-det"><summary>How this RPM was calculated</summary><div class="small"><p>NOGA's surface-brush method: start at the low end of the Ø${r.size} brush window (${fmtN(r.rpmRange[0])}–${fmtN(r.rpmRange[1])} RPM) × grit #${r.grit} multiplier ×${SF_GRITX[r.grit]}, kept inside the window → <b>${fmtN(r.rpm)} RPM</b>${S.worn ? ' (worn brush +10%)' : ''}. Feed comes from NOGA's cross-hole table for this material.</p><p class="tiny">Compatible shanks: ${r.shanks.map(x => `${x[0]} (${x[2]})`).join(' · ')}</p></div></details>` : ''}
    ${r.family === 'crosshole' && !r.method ? `<details class="sf-det"><summary>How this RPM was calculated</summary><div class="small"><p>Brush Ø${r.size} covers Ø${r.pilot[0]}–${r.pilot[1]} mm bores at #${r.grit}. Your Ø${S.bore} mm bore sets the base speed between ${fmtN(SF_CH_BASE[r.size][0])} and ${fmtN(SF_CH_BASE[r.size][1])} RPM → <b>${fmtN(r.baseRpm)}</b>. Grit #${r.grit} multiplier ×${r.gritX} → new brush <b>${fmtN(r.newRpm)}</b>, worn brush <b>${fmtN(r.wornRpm)}</b> (+10%), never above ${fmtN(r.rpmMax)}.</p><p class="tiny">Method: NOGA UFIBER Cross-Hole RPM Advisor. Brush sizing: UFIBER catalogue bore ranges.</p></div></details>` : ''}
    ${r.notes.map(n => `<div class="callout note">${I.info}<div>${esc(n)}</div></div>`).join('')}
    ${r.checks.length ? `<div class="callout warn">${I.warn}<div><b>Data check</b>${r.checks.map(c => `<p style="margin:4px 0 0">${esc(c)}</p>`).join('')}</div></div>` : ''}
    <div class="sf-adj"><div><b>${I.check.replace('<svg', '<svg style="color:var(--ok)"')} Need more cutting action?</b><ul><li>Raise RPM gradually toward the top of the range</li><li>Reduce feed in 10% steps</li><li>Add one controlled pass</li><li>Go one grit coarser</li>${r.family === 'surface' ? '<li>Increase depth slightly (max 1.2 mm)</li>' : ''}</ul></div><div><b>${I.x.replace('<svg', '<svg style="color:var(--bad)"')} Too aggressive or wearing fast?</b><ul><li>Reduce RPM in 10% steps</li><li>Increase feed in 10% steps</li><li>Drop unnecessary passes</li><li>Go one grit finer</li>${r.family !== 'crosshole' ? '<li>Lighter engagement</li>' : ''}</ul></div></div>
    <p class="tiny" style="margin:10px 0 0">Source: ${esc(r.source)}. Starting values — validate on the actual component.</p>
    <div class="actions" style="margin-top:12px"><button class="btn primary small" id="sfSetup">Open full setup ${I.arrow}</button><button class="btn small" id="sfCopy">${I.copy} Copy parameters</button><button class="btn small" id="sfMail">${I.mail} Ask a NOGA engineer</button></div><div id="mailSlot"></div><div id="copySlot"></div>`;
  return `<h1 class="h2" style="font-size:34px">Speeds & feeds</h1><p class="muted" style="margin:4px 0 14px;max-width:70ch">NOGA's starting parameters for every UFIBER brush, by material. Pick the brush and the material — the numbers update as you go.</p>
  <div class="sf-grid">
    <section class="panel sf-in" aria-label="Inputs">
      <div class="field" style="margin-top:0"><label>Brush</label><div class="seg">${famPick}</div></div>
      ${size}
      <div class="field"><label>Material group</label><div class="seg">${Object.entries(SF_ISO).map(([k, l]) => `<button data-sfiso="${k}" aria-pressed="${S.iso === k}" title="${l}"><b>${k}</b> <span class="small">${l}</span></button>`).join('')}</div></div>
      <div class="field"><label for="sfRowSel">Material and condition</label><div class="inp"><select id="sfRowSel">${rowsIso.map(x => `<option value="${x.id}"${x.id === S.row ? ' selected' : ''}>${esc(sfLabel(x))}</option>`).join('')}</select></div></div>
      <div class="field"><label>Process</label><div class="seg"><button data-sfmode="deburr" aria-pressed="${S.mode === 'deburr'}">Deburring</button><button data-sfmode="polish" aria-pressed="${S.mode === 'polish'}">Polishing</button></div></div>
      <div class="field"><label>Grit ${S.grit ? '<button class="btn ghost small" id="sfGritAuto" style="min-height:0;padding:0 6px">use table grit</button>' : '<span class="tiny">(from NOGA table — tap to change)</span>'}</label><div class="gritrow">${gOpts.map(g => `<button data-sfgrit="${g}" aria-pressed="${gNow === g}" class="${tGr.includes(g) ? 'tab-g' : ''}"><span class="gdot" style="background:${G(g)?.hex}"></span>#${g}</button>`).join('')}</div><span class="hint">Underlined grits are NOGA's table choices for this material.</span></div>
      ${opTog}
      ${S.hand ? '' : numField('sfMax', 'Your maximum spindle RPM (optional)', S.maxRpm ?? '', '', 'RPM')}
    </section>
    <section class="panel sf-out" aria-live="polite" aria-label="Recommendation">${out}</section>
  </div>
  <section class="panel" style="margin-top:16px"><div class="panel-t"><h2>NOGA ${esc({ surface: 'Surface Brush', crosshole: 'Cross-Hole Brush', point: 'Point Brush', end: 'End Brush', disc: 'Ceramic Fiber Disc' }[S.fam])} table — ISO ${S.iso}</h2><span class="tiny">Tap a row to select it</span></div>${sfTable(S, rowsIso)}</section>
  ${r.error ? '' : `<button class="sf-sticky" id="sfJump" aria-label="Jump to the recommendation"><span><b class="num">${esc(sku.sku)}</b> · <b class="num">${fmtN(r.rpm)}</b> RPM${r.feed != null ? ` · <b class="num">${feedOut(r.feed)}</b> ${feedU()}` : ''}</span><span class="small">Details ↑</span></button>`}
  <details class="acc" style="margin-top:12px"><summary><span class="ic">${I.warn}</span>Issues found in the source data</summary><div class="body">${SF_DATA_NOTES}</div></details>`;
}
function sfTable(S, rows) {
  const cols = {
    surface: [['Material', r => sfLabel(r)], [`Deburr Vc m/min → RPM @Ø${S.dia}`, r => `${fmtR(r.S.vcD)} → ${fmtR(r.S.vcD.map(v => Math.round(vc2rpm(v, S.dia) / 100) * 100))}`], ['Feed', r => fmtFR(r.S.feedD)], ['DOC', r => fmtLR(r.S.docD)], ['Polish Vc', r => fmtR(r.S.vcP)], ['Feed', r => fmtFR(r.S.feedP)], ['DOC', r => fmtLR(r.S.docP)], ['Coolant', r => SF_COOL[r.S.cool]]],
    crosshole: [['Material', r => sfLabel(r)], ['Deburr feed', r => fmtFR(r.C.feedD)], ['Passes', r => r.C.passD], ['Polish feed', r => fmtFR(r.C.feedP)], ['Passes', r => r.C.passP], ['Coolant', r => SF_COOL[r.C.cool]]],
    point: [['Material', r => sfLabel(r)], ['Deburr RPM', r => fmtR(r.P.rpmD)], ['Feed', r => fmtFR(r.P.feedD)], ['Engagement', r => fmtLR(r.P.engD)], ['Polish RPM', r => fmtR(r.P.rpmP)], ['Feed', r => fmtFR(r.P.feedP)], ['Engagement', r => fmtLR(r.P.engP)], ['Coolant', r => SF_COOL[r.P.cool]]],
    end: [['Material', r => sfLabel(r)], ['Deburr RPM', r => fmtR(r.E.rpmD)], ['Feed', r => fmtFR(r.E.feedD)], ['Engagement', r => fmtLR(r.E.engD)], ['Polish RPM', r => r.E.rpmP[0] === 12000 ? '12,000 max.' : fmtR(r.E.rpmP)], ['Feed', r => fmtFR(r.E.feedP)], ['Engagement', r => fmtLR(r.E.engP)], ['Coolant', r => SF_COOL[r.E.cool]]],
    disc: [['Material', r => sfLabel(r)], ['Deburr Vc', r => SF_DISC_OF[r.id] ? fmtR(SF_DISC[SF_DISC_OF[r.id]].vcD) : 'not listed'], ['Feed', r => SF_DISC_OF[r.id] ? fmtFR(SF_DISC[SF_DISC_OF[r.id]].feedD) : '—'], ['Engagement', r => SF_DISC_OF[r.id] ? fmtLR(SF_DISC[SF_DISC_OF[r.id]].engD) : '—'], ['Polish Vc', r => SF_DISC_OF[r.id] ? fmtR(SF_DISC[SF_DISC_OF[r.id]].vcP) : '—'], ['Coolant', r => SF_DISC_OF[r.id] ? SF_COOL[SF_DISC[SF_DISC_OF[r.id]].cool] : '—']],
  }[S.fam];
  return `<div class="scroll-x"><table class="tbl sf-tbl"><tr>${cols.map(c => `<th>${esc(c[0])}</th>`).join('')}</tr>${rows.map(r => `<tr data-sfrow="${r.id}" class="${r.id === S.row ? 'sel' : ''}" tabindex="0">${cols.map(c => `<td>${esc(c[1](r))}</td>`).join('')}</tr>`).join('')}</table></div><p class="tiny" style="margin:6px 0 0">Units: ${feedU()} and ${lenU()}. ${S.fam === 'crosshole' ? 'Cross-hole RPM depends on bore and grit — use the calculator above.' : ''}</p>`;
}
const SF_DATA_NOTES = `<p>Checked against the UFIBER catalogue, the four noga.com technical pages and the NOGA Cross-Hole RPM Advisor. Each item below is flagged in the results where it applies.</p><ul>
<li><b>End Brush feed and engagement are a copy of the Surface Brush table.</b> All 41 rows match the Ø25–100 Surface Brush values exactly (e.g. 1,200–2,000 mm/min, 0.3–0.5 mm), while the Ø1–3 Point Brush table uses 250–500 mm/min and 0.03–0.10 mm. End Brush RPMs are the Surface Brush cutting speeds recalculated for Ø5.</li>
<li><b>Polishing speeds for tool and hardened steels look inverted.</b> The Surface table gives H13 polishing 350–400 m/min vs 60–150 deburring, and HARDOX 500 200–320 vs 35–80. Every other row has similar or lower polishing speeds. This is also why the End Brush table shows "12,000 max." for those rows.</li>
<li><b>Surface Brush page contradicts itself on RPM.</b> Its product table recommends 5,000–6,000 RPM for Ø25, but its own material cutting speeds give 2,200–4,000 RPM for steel and 380–890 RPM for Inconel. NOGA's catalogue tests ran Ø25 at 6,000 RPM on Inconel, titanium and steel.</li>
<li><b>Cross-hole bore ranges differ between NOGA sources.</b> The catalogue and website give Ø3: 5–7, Ø5: 7–9 (coarse) / 8–10 (fine), Ø7: 9–14 / 10–20 mm. The RPM Advisor uses Ø3: 5–8, Ø5: 8–10, Ø7: 10–14 for all grits, so for a Ø7 or Ø9 bore it picks a different brush.</li>
<li><b>RPM Advisor material grits disagree with the website tables</b> for plastics (#1000/#2000 vs #2000–#3000 / #3000–#6000) and aluminium finishing (#1000 vs #1200→#2000). It also offers cross-hole brushes for ceramics, glass and carbide, which the catalogue assigns to Ceramic Diamond Stones.</li>
<li><b>RPM Advisor uses 300 mm/min feed for every material</b>; the website cross-hole table ranges from 200 (heat-resistant alloys) to 550 mm/min (aluminium polishing).</li>
<li><b>Disc page:</b> the cutting-speed table gives about 2,500–4,200 RPM for a Ø19 disc in steel, while the safety section recommends 6,000–8,000 RPM.</li>
<li><b>Diamond stone page contradicts itself on speed.</b> Every size table lists a 30,000 RPM minimum spindle speed, while the FAQ says no minimum is specified and that up to 30,000 RPM is enough for most work. It also describes the stone as stronger than resin-bond tools, yet the FAQ says the bond is epoxy resin.</li>
<li><b>Floating damper page:</b> the BT40 holder uses an ER32UM collet (BT30: ER25UM), but the End-type spec lists a Ø6 mm tool shank capacity while UF8852 is listed with a Ø10 mm shank.</li>
<li><b>NOGA's own case studies run outside the tables.</b> A Ø1.5 cross-hole brush ran in a Ø2.6 mm hole (catalogue minimum Ø3.5 mm) at 100 mm/min, and a Ø7 brush in 303 stainless ran 500 mm/min against a 250–350 mm/min table value. The app uses the tables, except in the Ø2.5–3.5 mm bore range where the case study is the only data.</li>
<li><b>UFIBER AI Assistant:</b> its NOGA page is only a link to a separate site, which could not be opened from here, so nothing from it is used.</li>
<li><b>Smaller page errors:</b> End Brush page calls the angled brush "45°" while the catalogue calls it "90° angled" (code UF-EB45); its 3D-model link is labelled "Point Type Brushes"; imperial values stop after row 3 of its table. Surface page lists the Ø40 clamping screw as M6×1.0×16 (UF0017); the catalogue says M6×1.0×8 (PC0044). The Surface table's unexplained asterisks (*) on some polishing speeds have no footnote.</li></ul>
<p class="tiny">How this app resolves them: surface and cross-hole RPM follow the NOGA RPM Advisor method; cross-hole brush sizing follows the catalogue; feeds, depths, engagement and grits come from the website tables; hand-held point and end brushes run 1,000–3,000 RPM.</p>`;
function sfText() {
  const S = APP.sf; const { r, row, sku, holder } = sfCompute(); if (r.error) return r.error;
  return [`UFIBER SPEEDS & FEEDS`, `Material: ${sfLabel(row)} (ISO ${row.iso})`, `Process: ${S.mode === 'polish' ? 'Polishing' : 'Deburring'}`, `Tool: ${sku.sku}  ${sku.desc}`, `Holder: ${holder}`, ``, `Start RPM: ${r.rpm} (range ${fmtR(r.rpmRange)}, max ${r.rpmMax})`, `Feed: ${r.feed != null ? r.feed + ' mm/min (table ' + fmtR(r.feedRange) + ')' : 'by hand'}`, `${r.engLabel}: ${r.family === 'crosshole' ? '5 mm past each side of the intersection' : r.eng != null ? r.eng + ' mm (table ' + fmtR(r.engRange) + ')' : 'light contact'}`, `Passes: ${r.passes}`, `Coolant: ${r.cool}`, ...(r.checks.length ? ['', 'DATA CHECK', ...r.checks.map(c => '- ' + c)] : []), '', `Source: ${r.source}. Starting values — validate on the actual component.`].join('\n');
}
function sfToState() {
  const S = APP.sf; const { r } = sfCompute(); const [m, sub] = SF_ROW_TO_MAT(S.row);
  const st = newState(); st.material = m; st.sub = sub; st.sfRow = S.row; st.burr = 'light';
  const pol = S.mode === 'polish';
  if (S.fam === 'surface') { st.task = pol ? 'marks' : 'deburr_mill'; st.feature = pol ? 'face' : 'edge'; st.override = { family: 'surface', dia: S.dia, grit: r.grit }; }
  if (S.fam === 'crosshole') { st.task = 'crosshole'; st.feature = 'cross'; st.dims = { main: Number(S.bore) }; st.override = r.error ? {} : { family: r.method === 'shank' ? 'shank' : r.method === 'point' ? 'point' : 'crosshole', dia: r.size, grit: r.grit }; }
  if (S.fam === 'point') { st.task = pol ? 'polish' : 'deburr_mill'; st.feature = 'small'; st.override = { family: 'point', dia: S.pdia, grit: r.grit }; }
  if (S.fam === 'end') { st.task = pol ? 'polish' : 'deburr_mill'; st.feature = 'small'; st.override = { family: S.angled ? 'endAngled' : 'end', grit: r.grit }; }
  if (S.fam === 'disc') { st.task = pol ? 'polish' : 'deburr_mill'; st.feature = 'groove'; st.dims = { groove: 1, depth: S.ddia / 2 - 3 }; st.override = { family: 'disc', grit: r.grit }; }
  if (S.hand) st.machine.type = 'hand';
  if (S.maxRpm) st.machine.maxRpm = Number(S.maxRpm);
  return st;
}
function sfFromRec(R, st) {
  const S = APP.sf; const famMap = { surface: 'surface', shank: 'crosshole', crosshole: 'crosshole', point: 'point', end: 'end', endAngled: 'end', disc: 'disc' };
  if (!famMap[R.family]) return false;
  S.fam = famMap[R.family]; S.mode = TASKS[st.task]?.mode === 'polish' ? 'polish' : 'deburr';
  const id = R.sfRow || sfRowFor(st.material, st.sub).id; S.row = id; S.iso = sfRow(id).iso;
  S.grit = R.grit.grit; S.hand = st.machine?.type === 'hand'; S.maxRpm = st.machine?.maxRpm || null; S.worn = false;
  if (S.fam === 'surface') S.dia = R.dia; if (S.fam === 'point') S.pdia = R.dia; if (S.fam === 'disc') S.ddia = R.dia; if (S.fam === 'end') S.angled = R.family === 'endAngled';
  if (S.fam === 'crosshole') { S.bore = Number(st.dims?.main) || (R.family === 'shank' ? Math.max(30, R.dia + 5) : S.bore); S.csize = R.dia; }
  return true;
}

