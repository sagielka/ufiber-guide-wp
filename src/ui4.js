/* ============================================================
   UFIBER Guide — Replace a competitor brush (competitor, competitor, maker) with UFIBER

   competitor grades brushes by color (no grit numbers). The color → grit mapping
   follows NOGA MT's own case-study workbook (Pink→#2000, Red→#1200,
   White→#1000, Blue→#800; A32 blue = #800 confirmed by Sagi 24-Oct-2026).
   competitor grinding power ratio (competitor FAQ): Pink 30 : Red 100 : White 200 : Blue 600.
   competitor sizes, sleeves, bore ranges and max RPM checked 30-Oct-2026 against
   a distributor's competitor listings and a distributor (competitor distributor):
     surface A13 pink / A11 red / A21 white / A31, A32 blue; sleeves S06M Ø6,
     S15M-P Ø6, S25M Ø8, S40M-SD10 Ø10, S60M Ø12, S100M Ø16; max RPM
     10,000 / 6,000 / 5,000 / 3,000 / 2,000 / 1,200.
     crosshole A12 red: Ø1.5 3.5–5, Ø3 5–8, Ø5 8–10, Ø7 10–20, Ø11 14–20.
     crosshole A33 blue: Ø3 5–8, Ø5 8–10, Ø7 10–14, Ø11 14–20.
     M = 120 mm (A12) / 130 mm (A33); L = 170 / 180 mm, 12,000 RPM.
     Extra-Large A34 dark blue: CH-A34-15/20/25 for bores 20–25 / 25–30 / 30–35,
     9,000 RPM, shanks CH-SH-6 (Ø6) and CH-SH-8 (Ø8).
   competitor (a competitor, competitor) from competitor's own catalogue
   pages and "brush info" sheet sent to NOGA, Jun-2024: pink filament "about
   P1200" (aluminium, copper), blue "about P400" (steel, iron). Per Sagi
   (31-Oct-2026) competitor grades are similar to competitor's, so they map the same way:
   A12 / pink → #1200 (as competitor A12), A33 / blue → #800 (as competitor blue).
   maker CB31M-01550 = UF1615 (Ø15 #1000), confirmed by Sagi 30-Oct-2026.
   Wheel / side brushes (competitor W-A11-50/75, competitor SD-…M) → UFIBER radial ceramic
   fiber disc Ø13–30 × 0.8 mm (UF7…), per Sagi 31-Oct-2026.
   ============================================================ */
const XCOLOR = {
  A13: { c: 'Pink',      hex: '#F4A6C6', p: 30,  uf: 2000 },
  A11: { c: 'Red',       hex: '#D7263D', p: 100, uf: 1200 },
  A12: { c: 'Red',       hex: '#D7263D', p: 100, uf: 1200 },
  A21: { c: 'White',     hex: '#F3F0E6', p: 200, uf: 1000 },
  A31: { c: 'Blue',      hex: '#2A6FDB', p: 600, uf: 800 },
  A32: { c: 'Blue',      hex: '#2A6FDB', p: 600, uf: 800 },
  A33: { c: 'Blue',      hex: '#2A6FDB', p: 600, uf: 800 },
  A34: { c: 'Dark blue', hex: '#1B3F8B', p: null, uf: 800 },
};
const XSLEEVE = { 6: ['S06M', 6], 15: ['S15M-P', 6], 25: ['S25M', 8], 40: ['S40M-SD10', 10], 60: ['S60M', 12], 100: ['S100M', 16] };
const XSURF_MAX = { 6: 10000, 15: 6000, 25: 5000, 40: 3000, 60: 2000, 100: 1200 };
// competitor crosshole: target bore per color, shank Ø for M and L lengths
const XCH = {
  1.5: { A12: [3.5, 5], shank: { M: 3 } },
  3:   { A12: [5, 8],  A33: [5, 8],   shank: { M: 3, L: 4 } },
  5:   { A12: [8, 10], A33: [8, 10],  shank: { M: 6, L: 6 } },
  7:   { A12: [10, 20], A33: [10, 14], shank: { M: 6, L: 8 } },
  11:  { A12: [14, 20], A33: [14, 20], shank: { M: 12, L: 12 } },
};
const XCH_LEN = { A12: { M: 120, L: 170 }, A33: { M: 130, L: 180 } };
// competitor Extra-Large crosshole (A34): bore range per size, and the UFIBER surface brush on a shank that covers it
const XCH_XL = { 15: { bore: [20, 25], shank: 'CH-SH-6' }, 20: { bore: [25, 30], shank: 'CH-SH-8' }, 25: { bore: [30, 35], shank: 'CH-SH-8' } };

// competitor — colours and catalogue data
const VCOLOR = {
  pink: { c: 'Pink', hex: '#F4A6C6', uf: 1200, says: 'graded like competitor A12 (#1200), for aluminium and copper' },
  blue: { c: 'Blue', hex: '#2A6FDB', uf: 800,  says: 'graded like competitor blue (#800), for steel and iron' },
};
const VSURF = { 6: { ds: 6, rpm: 8000 }, 15: { ds: 6, rpm: 5000 }, 25: { ds: 8, rpm: 4000 }, 40: { ds: 10, rpm: 2500 }, 60: { ds: 12, rpm: 1500 }, 100: { ds: 14, rpm: 1000 } };
const VCH = { 1.5: { bore: [3, 5], ds: 4 }, 3: { bore: [5, 8], ds: 4 }, 5: { bore: [8, 10], ds: 6 }, 7: { bore: [10, 14], ds: 6 }, 9: { bore: [12, 18], ds: 10 }, 11: { bore: [14, 20], ds: 12 } };
const VMICRO = { 1: 3, 1.5: 3, 2: 3, 2.5: 4, 3: 4 };            // CB31 micro-hole brush: Ø → shank Ø (15 mm bristle, 55 mm long, 7,000 RPM)
const VSTONE = { B: { grit: 800, uf: 800 }, O: { grit: 400, uf: 400 }, M: { grit: 220, uf: 200 } };

const X_EXAMPLES = ['A21-CB25M', 'CH-A12-5M', 'CH-A33-7L', 'A11-EB06M', 'CN-CB25MS', 'CN-A12-7M', 'CB31R-S1.5'];

function xParse(raw) {
  const s = raw.toUpperCase().replace(/competitor|competitor|maker/g, '').replace(/[\s_]+/g, '').replace(/—|–/g, '-').replace(/^[:\-]+/, '').trim();
  if (!s) return null;
  let m;
  // ---- maker (confirmed equivalences only)
  if (s === 'CB31M-01550' || s === 'CB31M01550') return { raw, code: s, brand: 'maker', kind: 'maker15' };
  // ---- competitor
  if ((m = s.match(/^CN-?A(12|33)-?(\d+(?:\.\d+)?)([ML])?$/))) return { raw, code: s, brand: 'competitor', kind: 'cross', vcol: m[1] === '12' ? 'pink' : 'blue', dia: parseFloat(m[2]), len: m[3] || 'M' };
  if ((m = s.match(/^CN-?CB(\d{2,3})([MH])(S)?$/))) return { raw, code: s, brand: 'competitor', kind: 'surface', vcol: m[2] === 'H' ? 'blue' : 'pink', dia: parseInt(m[1], 10), set: !!m[3] };
  if ((m = s.match(/^CN-?(\d{2,3})([MH])$/))) return { raw, code: s, brand: 'competitor', kind: 'surface', vcol: m[2] === 'H' ? 'blue' : 'pink', dia: parseInt(m[1], 10), set: false };
  if ((m = s.match(/^CB31([RB])-?S(\d(?:\.\d)?)$/))) return { raw, code: s, brand: 'competitor', kind: 'micro', vcol: m[1] === 'B' ? 'blue' : 'pink', dia: parseFloat(m[2]) };
  if ((m = s.match(/^CN-?P([BOM])-?(\d)B?$/))) return { raw, code: s, brand: 'competitor', kind: 'vstone', stone: m[1], dia: +m[2] };
  if ((m = s.match(/^CPD-?(\d+)M?$/))) return { raw, code: s, brand: 'competitor', kind: 'vface', dia: +m[1] };
  if ((m = s.match(/^PD-?(\d+)M$/))) return { raw, code: s, brand: 'competitor', kind: 'vpd', dia: +m[1] };
  if ((m = s.match(/^BD-?(\d+)M$/))) return { raw, code: s, brand: 'competitor', kind: 'hone', dia: +m[1] };
  if ((m = s.match(/^SD-?(\d+)M$/))) return { raw, code: s, brand: 'competitor', kind: 'vside', dia: +m[1] };
  if (/^CH-?HG/.test(s)) return { raw, code: s, brand: 'competitor', kind: 'vpolish' };
  // ---- competitor
  if ((m = s.match(/^(A\d{2})-?CB(\d{2,3})M?$/))) return { raw, code: s, brand: 'competitor', kind: 'surface', color: m[1], dia: parseInt(m[2], 10) };
  if ((m = s.match(/^(A\d{2})-?EB(\d{2,3})([MS])?$/))) { const d = { '06': 5, '05': 5, '03': 3, '025': 2.5, '02': 2, '015': 1.5, '01': 1 }[m[2]] ?? parseFloat(m[2]) / 10; return { raw, code: s, brand: 'competitor', kind: 'end', color: m[1], dia: d }; }
  if ((m = s.match(/^CH-?A34-?(\d+)$/))) return { raw, code: s, brand: 'competitor', kind: 'crossXL', color: 'A34', dia: +m[1] };
  if ((m = s.match(/^CH-?(A\d{2})-?(\d+(?:\.\d+)?)([MLF])?(?:-TL)?$/))) return { raw, code: s, brand: 'competitor', kind: 'cross', color: m[1], dia: parseFloat(m[2]), len: m[3] || 'M' };
  if ((m = s.match(/^CH-?SH-?(\d+)$/))) return { raw, code: s, brand: 'competitor', kind: 'xlshank', ds: +m[1] };
  if (/^CH-?P[A-Z]/.test(s)) return { raw, code: s, brand: 'competitor', kind: 'stone' };
  if ((m = s.match(/^W-?(A\d{2})-?(\d+)/))) return { raw, code: s, brand: 'competitor', kind: 'wheel', color: m[1], dia: +m[2] };
  if ((m = s.match(/^S(\d{2,3})M(?:-[A-Z0-9]+)?$/))) return { raw, code: s, brand: 'competitor', kind: 'sleeve', dia: parseInt(m[1], 10) };
  if (/^XP-?AUT/.test(s)) return { raw, code: s, brand: 'competitor', kind: 'selfadj' };
  if (/^XP-?EZ/.test(s)) return { raw, code: s, brand: 'competitor', kind: 'setter' };
  if (/^FH-?/.test(s) || /FLOATING/.test(s)) return { raw, code: s, brand: 'competitor', kind: 'floating' };
  if (/^(A\d{2})-?TB/.test(s) || /^TM-?SH/.test(s) || /TURNING/.test(s)) return { raw, code: s, brand: 'competitor', kind: 'turning' };
  if (/^XC-?\d/.test(s) || /BACKBURR|BBC/.test(s)) return { raw, code: s, brand: 'competitor', kind: 'backburr' };
  if (/^AX|STONE|MOUNTEDPOINT|PENCIL/.test(s)) return { raw, code: s, brand: 'competitor', kind: 'stone' };
  if (/MICROMOTOR|MOBILE/.test(s)) return { raw, code: s, brand: 'competitor', kind: 'motor' };
  return { raw, code: s, brand: '', kind: 'unknown' };
}

/* Competitor codes inside free text (an ask, an email, a drawing note). Strict
   item-code shapes only, so ordinary words ("stone", "floating") never match. */
const X_SCAN = /\b(?:competitor\s*)?(?:A\d{2}-?CB\d{2,3}M?|A\d{2}-?EB\d{2,3}[MS]?|CH-A\d{2}-\d+(?:\.\d+)?[MLF]?(?:-TL)?|CH-SH-\d+|W-A\d{2}-\d+|S(?:06|15|25|40|60|100)M(?:-P|-SD10)?|CN-A(?:12|33)-\d+(?:\.\d+)?[ML]?|CN-CB\d{2,3}[MH]S?|CN-\d{2,3}[MH]|CB31[RB]-S\d(?:\.\d)?|CB31M-01550|CN-P[BOM]-\d+B|CPD-\d+M|SD-\d+M)(?!\w|\.\d)/gi;
function xFind(text) {
  const seen = new Set(), out = [];
  for (const m of String(text || '').matchAll(X_SCAN)) { const c = m[0].toUpperCase().replace(/^competitor\s*/, ''); if (!seen.has(c)) { seen.add(c); out.push(c); } }
  return out;
}

function xConvert(p) {
  if (!p) return null;
  if (p.brand === 'competitor') return vConvert(p);
  const out = { p, status: 'direct', uf: null, holders: [], notes: [], alts: [], xdesc: '' };
  if (p.kind === 'maker15') {
    out.xdesc = 'maker ceramic fiber surface brush Ø15, #1000 (white)';
    const k = skuSurface(15, 1000); out.uf = { family: 'surface', fam: 'Surface Brush', dia: 15, grit: 1000, ...k };
    out.holders.push({ role: 'Sleeve', sku: SURFACE[15].sleeve[0], desc: `${SURFACE[15].sleeve[1]}, Ø6 shank` });
    out.notes.push('Same brush as UF1615 (Ø15, #1000 white), confirmed by NOGA.');
    return out;
  }
  const col = XCOLOR[p.color];
  const colTxt = col ? `${col.c} (${p.color})` : (p.color ? p.color : '');
  if (p.color && !col) out.notes.push(`Color code ${p.color} isn't in the cross-reference — pick the color manually below.`);
  const grit = col ? col.uf : 1000;
  if (p.kind === 'surface') {
    out.xdesc = `competitor Brush Surface, Ø${p.dia}, ${colTxt}`;
    let d = p.dia; if (!SURFACE[d]) { d = 100; out.status = 'close'; out.notes.push(`Ø${p.dia} is an Extra-Large competitor size. UFIBER surface brushes go up to Ø100 — run Ø100 with overlapping passes, or ask NOGA about a large-diameter option.`); }
    const k = skuSurface(d, grit); out.uf = { family: 'surface', fam: 'Surface Brush', dia: d, grit, ...k };
    const S = SURFACE[d]; out.holders.push({ role: 'Sleeve', sku: S.sleeve[0], desc: `${S.sleeve[1]}, Ø${S.ds} shank` });
    const xs = XSLEEVE[p.dia];
    if (xs && xs[1] !== S.ds) out.notes.push(`Collet change: competitor sleeve ${xs[0]} has a Ø${xs[1]} shank; UFIBER sleeve ${S.sleeve[0]} has Ø${S.ds}.`);
    if (XSURF_MAX[p.dia]) out.notes.push(`Speed: competitor lists ${fmtN(XSURF_MAX[p.dia])} RPM max for Ø${p.dia}; the UFIBER Ø${d} window is ${fmtN(S.rpm[0])}–${fmtN(S.rpm[1])} RPM.`);
    out.notes.push(p.dia >= 25 ? 'Projection: UFIBER sleeves allow 10 mm max (competitor allows up to 15 mm at this size). Re-set it when you switch.' : 'Projection: 10 mm max from the UFIBER sleeve — same as competitor at this size.');
    gritAlts(out, grit, (g) => skuSurface(d, g));
  } else if (p.kind === 'cross') {
    out.xdesc = `competitor Brush Crosshole, Ø${p.dia}, ${colTxt}${p.len === 'L' ? ', long' : p.len === 'F' ? ', extra-long' : ''}`;
    let d = p.dia; if (!CROSS[d]) { out.status = 'none'; out.notes.push(`Ø${p.dia} cross-hole brushes are outside the UFIBER range (Ø1.5–11). For bores over Ø20, use a UFIBER surface brush on a shank — the Find tool sizes it for you.`); return out; }
    let g = grit;
    if (d === 11 && g > 1000) { g = 1000; out.status = 'close'; out.notes.push('UFIBER Ø11 cross-hole brushes come in #600, #800 and #1000; #1000 is the nearest to red.'); }
    crossOut(out, d, g, XCH[d]?.[p.color] || XCH[d]?.A12, 'competitor');
    const xds = XCH[d]?.shank?.[p.len === 'L' ? 'L' : 'M'];
    const C = CROSS[d];
    if (xds && xds !== C.ds) out.notes.push(`Collet change: this competitor brush has a Ø${xds} shank; the UFIBER Ø${d} brush has Ø${C.ds}.`);
    if (p.len === 'L') { out.status = 'close'; const xl = XCH_LEN[p.color]?.L || 170; out.notes.push(`competitor "L" brushes are ${xl} mm long; UFIBER cross-hole brushes are about 120–130 mm overall (Ø11: 180 mm). Check reach to the intersection, or ask NOGA for the 190 mm long version (Ø3 and Ø5 #1000).`); }
    if (p.len === 'F') { out.status = 'close'; out.notes.push('competitor Extra-Long (about 400 mm) reaches deep bores. UFIBER has no extra-long standard brush — ask NOGA for a long version.'); }
    out.notes.push(`Speed: UFIBER Ø${d} max ${fmtN(C.max)} RPM. Keep your proven competitor speed if it is below that.`);
    gritAlts(out, g, (x) => (d === 11 && ![600, 800, 1000].includes(x)) ? null : skuCross(d, x));
  } else if (p.kind === 'crossXL') {
    const xl = XCH_XL[p.dia];
    out.xdesc = `competitor Brush Crosshole Extra-Large, Ø${p.dia}, dark blue (A34)${xl ? `, bores Ø${xl.bore[0]}–${xl.bore[1]}` : ''}`;
    if (!xl) { out.status = 'unknown'; out.notes.push('Unknown Extra-Large size. competitor lists CH-A34-15, -20 and -25.'); return out; }
    shankOut(out, xl.bore, grit, 'competitor');
    out.notes.push('competitor runs these at 7,000 RPM (9,000 max). UFIBER surface brushes on a shank run in their own window — see the setup.');
  } else if (p.kind === 'xlshank') {
    out.xdesc = `competitor shank for Extra-Large crosshole brush, Ø${p.ds}`; out.status = 'close';
    const sh = p.ds <= 6 ? ['UF5001', 'UF-S-L045-DS06-C06', 'for the Ø15 surface brush, Ø6 connection'] : ['UF5003', 'UF-S-L050-DS09-C10', 'for the Ø25 surface brush, Ø10 connection'];
    out.uf = { family: 'shank', fam: 'Surface-brush shank', sku: sh[0], desc: `${sh[1]} — ${sh[2]}` };
    out.notes.push(p.ds <= 6 ? 'Same Ø6 connection as CH-SH-6.' : `CH-SH-8 has a Ø8 shank; UF5003 has Ø10 (UF5002 has Ø6) — use a matching collet.`);
  } else if (p.kind === 'end') {
    out.xdesc = `competitor Brush End Type, Ø${p.dia}, ${colTxt}`;
    endOut(out, p.dia, grit);
    if (p.color === 'A13') out.notes.push('competitor rates the pink Ø3 end brush to 6,000 RPM; keep your proven speed.');
  } else if (p.kind === 'sleeve') {
    out.xdesc = `competitor sleeve for Ø${p.dia} surface brush`;
    const S = SURFACE[p.dia]; if (!S) { out.status = 'none'; out.notes.push('No matching UFIBER sleeve size.'); return out; }
    out.uf = { family: 'sleeve', fam: 'Surface Brush Sleeve', dia: p.dia, sku: S.sleeve[0], desc: S.sleeve[1] };
    const xs = XSLEEVE[p.dia]; if (xs && xs[1] !== S.ds) out.notes.push(`Shank changes from Ø${xs[1]} to Ø${S.ds} — use a Ø${S.ds} collet.`); else out.notes.push(`Same Ø${S.ds} shank.`);
    out.notes.push('Use UFIBER brushes in UFIBER sleeves.');
  } else if (p.kind === 'floating') {
    out.xdesc = 'competitor Floating Holder'; out.status = 'close';
    out.uf = { family: 'damper', fam: 'UFIBER Floating Damper', sku: 'UF8853–UF8860 / UF8851–UF8852', desc: 'BT30 or BT40 (5 mm float, ~50 N, 6,000 RPM max) or end type (4 mm float, ~20 N, 12,000 RPM max)' };
    out.notes.push('Pick by spindle taper and the brush sleeve shank: Ø6 → UF8853 (BT30) / UF8857 (BT40) / UF8851 (end type); Ø10 → UF8854 / UF8858 / UF8852; Ø12 → UF8855 / UF8859; Ø16 → UF8856 / UF8860.');
  } else if (p.kind === 'selfadj' || p.kind === 'setter') {
    out.xdesc = p.kind === 'selfadj' ? 'competitor Self-Adjusting Sleeve' : 'competitor brush length setter'; out.status = 'none';
    out.notes.push('No direct UFIBER equivalent. A UFIBER Floating Damper compensates for brush wear automatically, which removes most of the need for projection re-setting.');
  } else if (p.kind === 'wheel') {
    out.xdesc = `competitor Brush Wheel Type Ø${p.dia}, ${colTxt}`;
    discOut(out, p.dia, grit, 'competitor wheel');
    out.notes.push('competitor wheel brushes work threads, side walls and the inside of cylinders over Ø50; the UFIBER disc works the same way, radially, with a smaller reach.');
  } else if (p.kind === 'turning') {
    out.xdesc = 'competitor Brush Turning (lathe holder or brush)'; out.status = 'none';
    out.notes.push('No UFIBER lathe-holder equivalent. On a lathe with live tooling, use cross-hole or surface brushes in a driven tool.');
  } else if (p.kind === 'backburr') {
    out.xdesc = 'competitor Back Burr Cutter'; out.status = 'none';
    out.notes.push('Not a brush, so no UFIBER equivalent. NOGA\'s own solution for front and back hole-edge deburring is UBURR.');
  } else if (p.kind === 'stone') {
    out.xdesc = 'competitor Stone / Ceramic Stone'; out.status = 'close';
    out.uf = { family: 'diamond', fam: 'UFIBER Ceramic Diamond Stone', sku: 'UF9xxx', desc: 'Ø1–3 mm, #200 / #400 / #600 / #800 — for carbide, hardened steel, EDM surfaces' };
    out.notes.push('For non-hardened materials a UFIBER Point or End brush is often the better replacement. For hole-edge burrs (front and back), NOGA\'s UBURR.');
  } else if (p.kind === 'motor') {
    out.xdesc = 'competitor mobile micromotor'; out.status = 'close';
    out.uf = { family: 'epack', fam: 'UFIBER Portable E-Pack', sku: 'UF9999', desc: '30,000 RPM, forward/reverse, RPM display, battery' };
  } else { out.xdesc = 'Not recognised'; out.status = 'unknown'; }
  return out;
}

/* ---- shared pieces ---- */
function crossOut(out, d, g, compBore, brand) {
  const k = skuCross(d, g); out.uf = { family: 'crosshole', fam: 'Cross-Hole Brush', dia: d, grit: g, ...k };
  const C = CROSS[d]; const r = g >= 1200 && C.pilotFine ? C.pilotFine : C.pilot;
  out.holders.push({ role: 'Holding', sku: '—', desc: `Ø${C.ds} mm shank, grip at least 30 mm` });
  if (compBore && (compBore[0] !== r[0] || compBore[1] !== r[1])) out.notes.push(`Bore range: the ${brand} Ø${d} brush covers Ø${compBore[0]}–${compBore[1]}; UFIBER Ø${d} #${g} covers Ø${r[0]}–${r[1]}. Check your bore is inside it.`);
  else if (compBore) out.notes.push(`Same bore range as the ${brand} brush: Ø${r[0]}–${r[1]}.`);
}
function shankOut(out, bore, grit, brand) {
  // NOGA surface-brush-on-shank method: largest brush that fits the smallest bore of the range
  const fits = sfShankFits(bore[0], grit); const d = fits.length ? fits[fits.length - 1].d : 15;
  const k = skuSurface(d, grit); out.uf = { family: 'shank', fam: 'Surface Brush on shank', dia: d, grit, ...k };
  const sh = (SF_SHANKS[d] || [])[0]; if (sh) out.holders.push({ role: 'Shank', sku: sh[0], desc: `${sh[1]} — ${sh[2]}. No sleeve.` });
  out.status = 'close';
  out.notes.push(`UFIBER cross-hole brushes stop at Ø20, so the ${brand} brush for Ø${bore[0]}–${bore[1]} bores is replaced by a Ø${d} surface brush without its sleeve, on a shank — NOGA's method for bores above Ø20.`);
  const up = sfShankFits(bore[1], grit).map(f => f.d).filter(x => x > d);
  if (up.length) out.notes.push(`In bores from Ø${SF_SHANK_MINBORE(up[up.length - 1], grit)} a Ø${up[up.length - 1]} brush also fits and reaches the wall with less overhang.`);
}
function endOut(out, dia, grit) {
  if (dia >= 4.5) { const k = skuEnd(grit, false); out.uf = { family: 'end', fam: 'End Brush, flat', dia: 5, grit, ...k }; out.alts.push({ label: '90° angled tip', sku: skuEnd(grit, true).sku, note: 'For corners and tight recesses.' }); }
  else { const d = [1, 1.5, 2, 2.5, 3].reduce((a, b) => Math.abs(b - dia) < Math.abs(a - dia) ? b : a); if (d !== dia) out.status = 'close'; const k = skuPoint(d, grit); out.uf = { family: 'point', fam: 'Point Brush', dia: d, grit, ...k }; }
  out.holders.push({ role: 'Drive', sku: 'UF9999', desc: 'Portable E-Pack for hand use (or any electric spindle; not air tools)' });
  out.notes.push('UFIBER end and point brushes are rated to 12,000 RPM.');
  gritAlts(out, grit, (g) => out.uf.family === 'end' ? skuEnd(g, false) : skuPoint(out.uf.dia, g));
}

function discOut(out, dia, grit, what) {
  // NOGA: keep the customer's diameter where UFIBER has it; otherwise the nearest disc that is not larger (Ø13–30)
  const sizes = [13, 19, 22, 25, 30];
  const d = sizes.filter(x => x <= dia).pop() || 13;
  const g = discGrit(Math.min(grit, 1000));
  const k = skuDisc(d, g); out.uf = { family: 'disc', fam: 'Radial Ceramic Fiber Disc', dia: d, grit: g, ...k };
  out.holders.push({ role: 'Clamping shank', sku: 'UF7030', desc: 'UF-DA-016-C030-L45, Ø3 shank, 45 mm (UF7023 for Ø2.35)' });
  out.status = d === dia && g === grit ? 'direct' : 'close';
  if (d !== dia) out.notes.push(`UFIBER radial discs are Ø13, 19, 22, 25 and 30 × 0.8 mm. The ${what} is Ø${dia}, so the nearest disc that is not larger is Ø${d}: it reaches less far into the feature — check access on the part.`);
  if (g !== grit) out.notes.push(`Discs come in #150–#1000; #${g} is the nearest to #${grit}.`);
  out.notes.push('Speed: 6,000–8,000 RPM recommended, never above 9,000. Electric spindle, CNC, robot or the UF9999 E-Pack — not air tools. Light radial contact, no side load.');
  const c = DISC_GRITS[DISC_GRITS.indexOf(g) - 1], f = DISC_GRITS[DISC_GRITS.indexOf(g) + 1];
  if (c) out.alts.push({ label: `More cutting power: #${c}`, sku: skuDisc(d, c).sku, note: '' });
  if (f) out.alts.push({ label: `Finer finish: #${f}`, sku: skuDisc(d, f).sku, note: '' });
}

/* ---- competitor ---- */
function vConvert(p) {
  const out = { p, status: 'direct', uf: null, holders: [], notes: [], alts: [], xdesc: '' };
  const vc = VCOLOR[p.vcol]; const grit = vc ? vc.uf : 1000;
  const colTxt = vc ? `${vc.c}` : '';
  if (p.kind === 'surface') {
    const V = VSURF[p.dia];
    out.xdesc = `competitor surface ceramic fiber brush${p.set ? ' with sleeve' : ''}, Ø${p.dia}, ${colTxt}`;
    let d = p.dia; if (!SURFACE[d]) { d = [6, 15, 25, 40, 60, 100].reduce((a, b) => Math.abs(b - p.dia) < Math.abs(a - p.dia) ? b : a); out.status = 'close'; out.notes.push(`No UFIBER Ø${p.dia} surface brush; Ø${d} is the nearest size.`); }
    const k = skuSurface(d, grit); out.uf = { family: 'surface', fam: 'Surface Brush', dia: d, grit, ...k };
    const S = SURFACE[d]; out.holders.push({ role: 'Sleeve', sku: S.sleeve[0], desc: `${S.sleeve[1]}, Ø${S.ds} shank` });
    if (V && V.ds !== S.ds) out.notes.push(`Collet change: the competitor Ø${p.dia} sleeve has a Ø${V.ds} shank; UFIBER sleeve ${S.sleeve[0]} has Ø${S.ds}.`);
    else if (V) out.notes.push(`Same Ø${S.ds} sleeve shank as competitor.`);
    if (V) out.notes.push(`Speed: competitor lists ${fmtN(V.rpm)} RPM for Ø${p.dia}; the UFIBER Ø${d} window is ${fmtN(S.rpm[0])}–${fmtN(S.rpm[1])} RPM.`);
    out.notes.push('competitor lists 1,000 mm/min feed and 0.2–1.0 mm cut — inside UFIBER limits (feed ≤2,000 mm/min, depth 0.5 mm deburring, 1.2 mm max). Projection ≤10 mm from the UFIBER sleeve.');
    gritAlts(out, grit, (g) => skuSurface(d, g));
  } else if (p.kind === 'cross') {
    const V = VCH[p.dia];
    out.xdesc = `competitor cross-hole ceramic fiber brush, Ø${p.dia}, ${colTxt}${p.len === 'L' ? ', long' : ''}${V ? `, bores Ø${V.bore[0]}–${V.bore[1]}` : ''}`;
    if (!V && !CROSS[p.dia]) { out.status = 'unknown'; out.notes.push(`competitor lists Ø1.5, 3, 5, 7, 9 and 11. Ø${p.dia} is not one of them — check the code.`); return out; }
    let d = p.dia, g = grit;
    if (p.dia === 9) {
      // UFIBER has no Ø9: competitor Ø9 covers bores Ø12–18
      out.status = 'close';
      if (g >= 1200) { d = 7; out.notes.push('UFIBER has no Ø9 cross-hole brush. competitor Ø9 covers bores Ø12–18; UFIBER Ø7 in #1200 covers Ø10–20, so it takes the whole range.'); }
      else { d = 7; out.notes.push(`UFIBER has no Ø9 cross-hole brush. competitor Ø9 covers bores Ø12–18. In #${g} the UFIBER Ø7 covers Ø9–14; for bores Ø14–18 use the Ø11 #${g} instead.`); out.alts.push({ label: `Bores Ø14–18: Ø11 #${g}`, sku: skuCross(11, g).sku, note: '' }); }
    }
    if (d === 11 && ![600, 800, 1000].includes(g)) { const ng = g > 1000 ? 1000 : 600; out.notes.push(`UFIBER Ø11 cross-hole brushes come in #600, #800 and #1000; #${ng} is the nearest to competitor ${colTxt.toLowerCase()} (${vc.says.split(',')[0]}).`); g = ng; out.status = 'close'; }
    crossOut(out, d, g, d === p.dia ? V?.bore : null, 'competitor');
    const C = CROSS[d];
    if (V && V.ds !== C.ds) out.notes.push(`Collet change: competitor Ø${p.dia} has a Ø${V.ds} shank; UFIBER Ø${d} has Ø${C.ds}.`);
    if (p.dia === 1.5) out.notes.push('competitor lists Ø3–5 bores for its Ø1.5; the UFIBER catalogue range starts at Ø3.5 (NOGA has used it down to Ø2.6).');
    if (p.len === 'L') { out.status = 'close'; out.notes.push('competitor "L" brushes are 170–180 mm long; UFIBER cross-hole brushes are about 120–130 mm overall (Ø11: 180 mm). Check reach, or ask NOGA for the 190 mm long version (Ø3 and Ø5 #1000).'); }
    if (p.vcol === 'blue') out.notes.push('competitor blue is graded like competitor blue (#800). If it was chosen for tough burrs or hard alloys, also test #600 or #400.');
    out.notes.push(`Speed: competitor recommends 6,000–12,000 RPM; UFIBER Ø${d} max ${fmtN(C.max)} RPM.`);
    gritAlts(out, g, (x) => (d === 11 && ![600, 800, 1000].includes(x)) ? null : skuCross(d, x));
  } else if (p.kind === 'micro') {
    out.xdesc = `competitor micro-hole ceramic fiber brush, Ø${p.dia}, ${colTxt} (15 mm bristle, 55 mm long)`;
    if (!VMICRO[p.dia]) { out.status = 'close'; out.notes.push('competitor lists Ø1.0, 1.5, 2.0, 2.5 and 3.0.'); }
    endOut(out, p.dia, grit);
    const ds = VMICRO[p.dia]; if (ds) out.notes.push(`competitor shank Ø${ds}. competitor runs these at 7,000 RPM.`);
    out.notes.push('Inside a bore of Ø3.5–5 mm, the Ø1.5 cross-hole brush (UF2' + G(grit).i + '15) reaches further and expands to the wall.');
  } else if (p.kind === 'vstone') {
    const S = VSTONE[p.stone];
    out.xdesc = `competitor oil-stone grinding head, Ø${p.dia} ball on a Ø1.5 elastic shaft, #${S.grit}`;
    out.status = 'close';
    const k = skuStone(3, S.uf); out.uf = { family: 'diamond', fam: 'UFIBER Ceramic Diamond Stone', dia: 3, grit: S.uf, ...k };
    out.notes.push(`Nearest UFIBER: the Ø3 ceramic diamond stone in #${S.uf}${S.uf !== S.grit ? ` (competitor #${S.grit})` : ''}. UFIBER stones are Ø1–3 point stones for hard materials, up to 60,000 RPM, about 1 N contact.`);
    if (p.dia > 3) out.notes.push(`The competitor head is Ø${p.dia}; UFIBER stones stop at Ø3.`);
    out.notes.push('For burrs on the front and back edge of a drilled hole, NOGA\'s UBURR is the better replacement.');
  } else if (p.kind === 'vface') {
    out.xdesc = `competitor face ceramic fiber brush CPD, Ø${p.dia} (ultra-fine filament, polishing and cutter marks)`;
    out.status = 'close';
    const d = SURFACE[p.dia] ? p.dia : 6; const g = 1200;
    const k = skuSurface(d, g); out.uf = { family: 'surface', fam: 'Surface Brush', dia: d, grit: g, ...k };
    out.holders.push({ role: 'Sleeve', sku: SURFACE[d].sleeve[0], desc: `${SURFACE[d].sleeve[1]}, Ø${SURFACE[d].ds} shank` });
    out.notes.push('competitor gives no grit for CPD; it is sold for polishing and cutter-mark removal on aluminium and copper. Start at #1200; for a finer finish #2000.');
    out.alts.push({ label: 'Finer finish: #2000', sku: skuSurface(d, 2000).sku, note: '' });
  } else if (p.kind === 'vpd') {
    out.xdesc = `competitor surface ceramic brush PD (white bristle on a shank, 3,000 RPM), Ø${p.dia}`;
    out.status = 'close';
    if (p.dia <= 3) endOut(out, p.dia, 1000);
    else if (p.dia < 6) endOut(out, 5, 1000);
    else { const d = [6, 15, 25, 40].filter(x => x <= p.dia).pop(); const k = skuSurface(d, 1000); out.uf = { family: 'surface', fam: 'Surface Brush', dia: d, grit: 1000, ...k }; out.holders.push({ role: 'Sleeve', sku: SURFACE[d].sleeve[0], desc: `${SURFACE[d].sleeve[1]}, Ø${SURFACE[d].ds} shank` }); }
    out.notes.push('Different bristle: competitor PD brushes are a white ceramic-bristle brush run at 3,000 RPM, not the fiber-tip type, and competitor gives no grit. #1000 is a neutral start — set the grit by material in the Find tool.');
  } else if (p.kind === 'vside') {
    out.xdesc = `competitor side ("flower head") brush, Ø${p.dia}, alumina filament, Ø6 shank, about 2,000 RPM`;
    discOut(out, p.dia, 400, 'competitor side brush');
    out.notes.push('competitor sells these in #240 and #320 and the code does not say which. #400 is the start; for heavier burrs use #200.');
  } else if (p.kind === 'hone') {
    out.xdesc = `competitor ball hone (silicon carbide), Ø${p.dia}, #320`; out.status = 'none';
    out.notes.push('No UFIBER ball hone. For burrs where a cross hole meets a Ø3.5–20 bore, a UFIBER cross-hole brush does the same job — the Find tool sizes it.');
  } else if (p.kind === 'vpolish') {
    out.xdesc = 'competitor blue polishing brush (CH-HG series)'; out.status = 'unknown';
    out.notes.push('competitor publishes no sizes or grit for this series. Send NOGA the brush diameter and what it is used on.');
  } else { out.xdesc = 'Not recognised'; out.status = 'unknown'; }
  return out;
}

function gritAlts(out, grit, skuFn) {
  const c = gritStep(grit, -1), f = gritStep(grit, 1);
  const kc = skuFn(c), kf = skuFn(f);
  if (kc && c !== grit) out.alts.push({ label: `More cutting power: #${c}`, sku: kc.sku, note: 'If burrs remain after the switch.' });
  if (kf && f !== grit) out.alts.push({ label: `Finer edge: #${f}`, sku: kf.sku, note: 'If burrs come off easily and you want a smaller edge break.' });
  if (out.p.color && XCOLOR[out.p.color]?.c === 'Blue') out.notes.push('competitor blue is its most aggressive grade (about 3× white). If the blue was chosen for tough burrs or titanium/heat-resistant alloys, also test #600 or #400.');
}
function xBrandOf(o) { return o?.p?.brand || 'competitor'; }
/* Compact form for the AI layer and for text found in an ask or email. */
function xCompact(o) {
  return { code: o.p.code, brand: xBrandOf(o), competitor_item: o.xdesc, ufiber_sku: o.uf?.sku || null, ufiber_item: o.uf ? `${o.uf.fam}${o.uf.dia ? ' Ø' + o.uf.dia : ''}${o.uf.grit ? ' #' + o.uf.grit : ''} ${o.uf.desc || ''}`.trim() : null, holders: o.holders.map(h => `${h.role}: ${h.sku !== '—' ? h.sku + ' ' : ''}${h.desc}`), status: XSTAT[o.status][1], notes: o.notes, alternatives: o.alts.map(a => `${a.label} ${a.sku}`) };
}

function replaceView() {
  const R = APP.xr || (APP.xr = { text: '', items: [] });
  return `<h1 class="h2" style="font-size:34px">Replace a competitor brush with UFIBER</h1>
  <p class="muted" style="margin:4px 0 0;max-width:68ch">Paste one or many competitor item codes (competitor, competitor, maker) — from a quote, a tool list or the label on the brush. You get the UFIBER item, the holder, and what to change in the program.</p>
  <div class="ask" style="max-width:860px"><label for="xIn" class="sr">Competitor item codes</label>
    <textarea id="xIn" placeholder="One code per line, e.g.\nA21-CB25M\nCH-A12-5M\nCN-CB25MS">${esc(R.text)}</textarea>
    <div class="ask-bar"><div class="examples" style="margin:0">${X_EXAMPLES.map(x => `<button class="chip" data-xex="${x}">${x}</button>`).join('')}</div><button class="btn primary" id="xGo">${I.swap} Convert</button></div></div>
  <details class="acc" style="max-width:860px;margin-top:12px"${R.pickOpen ? ' open' : ''}><summary><span class="ic">${GLYPH.small}</span>Don't know the code? Pick it</summary><div class="body">${xPicker()}</div></details>
  <div id="xOut">${R.items.length ? xResults(R.items) : ''}</div>
  ${R.items.length ? '' : `<section class="panel" style="max-width:860px;margin-top:16px"><div class="panel-t"><h2>What changes when you switch</h2></div><ul class="watch">${[
    'Same sizes: surface brushes Ø6–100 and cross-hole brushes Ø1.5–11 exist in competitor, competitor and UFIBER, so toolpaths usually carry over. competitor Ø9 cross-hole has no UFIBER size — the Ø7 or Ø11 covers its bores.',
    'Colors become grits: competitor has 4 color grades and competitor 2, graded like competitor (pink A12 → #1200, blue A33 → #800); UFIBER has 10 grits (#150–#6000), so you can fine-tune cutting power and edge break.',
    'Sleeve shanks differ on Ø25 and Ø40 (and Ø100 for competitor) — check your collets.',
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
  const st = XSTAT[o.status]; const col = o.p.brand === 'competitor' ? XCOLOR[o.p.color] : null; const vcol = VCOLOR[o.p.vcol]; const ufG = o.uf?.grit ? G(o.uf.grit) : null;
  const canSetup = o.uf && ['surface', 'crosshole', 'end', 'point', 'disc'].includes(o.uf.family);
  return `<article class="xcard">
    <div class="xside"><div class="tiny">${esc(xBrandOf(o))}</div><div class="xcode num">${esc(o.p.code)}</div><div class="small muted">${esc(o.xdesc)}</div>${col ? `<div class="small" style="margin-top:4px"><span class="gdot" style="background:${col.hex}"></span>${col.c}${col.p ? ` — grinding power ${col.p} on competitor's scale (red = 100)` : ''}</div>` : ''}${vcol ? `<div class="small" style="margin-top:4px"><span class="gdot" style="background:${vcol.hex}"></span>${vcol.c} — competitor: ${esc(vcol.says)}</div>` : ''}</div>
    <div class="xarrow" aria-hidden="true">${I.arrow}</div>
    <div class="xside"><div class="row" style="justify-content:space-between"><span class="tiny">UFIBER</span><span class="badge ${st[0]}">${st[1]}</span></div>
      ${o.uf ? `<div class="xcode num">${esc(o.uf.sku)}</div><div class="small muted">${esc(o.uf.fam)}${o.uf.dia ? `, Ø${o.uf.dia}` : ''} · ${esc(o.uf.desc)}</div>${ufG ? `<div class="small" style="margin-top:4px"><span class="gdot" style="background:${ufG.hex}"></span>#${ufG.grit} ${ufG.color.toLowerCase()} — ${ufG.action.toLowerCase()}</div>` : ''}${o.holders.map(h => `<div class="small" style="margin-top:4px"><b>${esc(h.role)}:</b> ${h.sku !== '—' ? `<b class="num">${esc(h.sku)}</b> ` : ''}${esc(h.desc)}</div>`).join('')}` : `<div class="small muted" style="margin-top:6px">See notes.</div>`}
    </div>
    ${o.notes.length ? `<ul class="xnotes">${o.notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}
    ${o.alts.length ? `<div class="row" style="grid-column:1/-1">${o.alts.map(a => `<span class="chip" style="cursor:default">${esc(a.label)} <b class="num">${esc(a.sku)}</b></span>`).join('')}</div>` : ''}
    ${canSetup ? `<details class="xprog" style="grid-column:1/-1"${o.progOpen ? ' open' : ''}><summary>Check my current program</summary>${xProgForm(o, i)}</details>` : ''}
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
  } else if (o.uf.family === 'disc') {
    if (pr.rpm) rows.push(['Speed', `${fmtN(pr.rpm)} RPM`, `${fmtN(Math.min(Math.max(pr.rpm, 6000), 8000))} RPM`, pr.rpm > 9000 ? 'Above the 9,000 RPM disc maximum.' : pr.rpm < 6000 ? 'Below the 6,000–8,000 RPM disc range — start at 6,000.' : 'Inside the disc range. Keep it.']);
    if (pr.feed) rows.push(['Feed', `${feedOut(pr.feed)} ${feedU()}`, `${feedOut(pr.feed)} ${feedU()}`, 'Keep it; NOGA disc feeds are 100–800 mm/min depending on material.']);
  } else {
    if (pr.rpm) rows.push(['Speed', `${fmtN(pr.rpm)} RPM`, `${fmtN(Math.min(pr.rpm, 12000))} RPM`, pr.rpm > 12000 ? 'UFIBER end and point brushes are rated to 12,000 RPM.' : 'Within the 12,000 RPM rating. Keep it.']);
    if (pr.feed) rows.push(['Feed', `${feedOut(pr.feed)} ${feedU()}`, `${feedOut(pr.feed)} ${feedU()}`, 'Keep it.']);
  }
  if (!rows.length) return `<p class="small muted">Enter at least one value.</p>`;
  return `<div class="scroll-x" style="margin-top:10px"><table class="tbl"><tr><th>Parameter</th><th>Now</th><th>UFIBER start</th><th>Why</th></tr>${rows.map(r => `<tr><td>${r[0]}</td><td class="num">${r[1]}</td><td class="num"><b>${r[2]}</b></td><td class="small">${esc(r[3])}</td></tr>`).join('')}</table></div>`;
}
function xConvertAll(text) {
  const codes = text.split(/[\n,;\t]+/).map(s => s.trim()).filter(Boolean).slice(0, 60);
  return codes.map(c => xConvert(xParse(c))).filter(Boolean);
}
function xListText(items) {
  return ['Competitor code\tCompetitor item\tUFIBER SKU\tUFIBER description\tHolder\tStatus', ...items.map(o => [`${xBrandOf(o)} ${o.p.code}`, o.xdesc, o.uf?.sku || '—', o.uf ? `${o.uf.fam}${o.uf.dia ? ' Ø' + o.uf.dia : ''} ${o.uf.desc}` : '—', o.holders.map(h => h.sku !== '—' ? h.sku : '').filter(Boolean).join(' ') || '—', XSTAT[o.status][1]].join('\t'))].join('\n');
}
function xSetupState(o) {
  const st = newState();
  const fam = o.uf.family;
  st.task = fam === 'crosshole' ? 'crosshole' : 'deburr_mill';
  st.feature = fam === 'crosshole' ? 'cross' : fam === 'point' ? 'small' : fam === 'disc' ? 'groove' : 'edge';
  st.material = o.prog?.mat || 'other';
  st.override = { family: fam === 'end' ? 'end' : fam, grit: o.uf.grit, dia: fam === 'end' ? undefined : o.uf.dia };
  if (fam === 'crosshole') { const C = CROSS[o.uf.dia]; const r = o.uf.grit >= 1200 && C.pilotFine ? C.pilotFine : C.pilot; st.dims = { main: +((r[0] + r[1]) / 2).toFixed(1) }; }
  if (o.prog?.rpm) st.machine.maxRpm = null;
  st.fromX = `${xBrandOf(o)} ${o.p.code}`;
  return st;
}


/* Competitor codes found in what the customer typed or dropped in (ask box,
   email, drawing text): converted on the spot, one tap to the full page. */
function xFoundCodes() { return xFind(`${APP.askText || ''} ${APP.doc?.text || ''}`); }
function xFoundBlock() {
  const codes = xFoundCodes(); if (!codes.length) return '';
  const items = codes.map(c => xConvert(xParse(c))).filter(Boolean);
  return `<div class="callout note" style="margin-top:12px">${I.swap}<div><b>Competitor item${items.length > 1 ? 's' : ''} in your text</b>
    <ul class="xnotes" style="margin:6px 0 0">${items.map(o => `<li><span><b class="num" style="display:inline">${esc(xBrandOf(o))} ${esc(o.p.code)}</b> → ${o.uf ? `<b class="num" style="display:inline">${esc(o.uf.sku)}</b> ${esc(o.uf.fam)}${o.uf.dia ? ' Ø' + o.uf.dia : ''}${o.uf.grit ? ' #' + o.uf.grit : ''}` : 'no direct UFIBER item'} <span class="tiny">(${esc(XSTAT[o.status][1])})</span></span></li>`).join('')}</ul>
    <button class="btn small" style="margin-top:8px" data-xopen="1">${I.swap} Open the full conversion</button></div></div>`;
}
