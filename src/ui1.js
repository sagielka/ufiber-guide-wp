/* ============================================================
   UFIBER Guide — UI part 1: helpers, icons, art and diagrams
   ============================================================ */
const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
/* Embed mode: the WordPress / Elementor plugin loads this file in an iframe with ?embed=1 */
const EMB = (() => { try { const q = new URLSearchParams(location.search); if (!q.get('embed')) return null; return { fit: q.get('fit') !== '0', units: /^(in|inch)$/i.test(q.get('units') || '') ? 'in' : (/^mm$/i.test(q.get('units') || '') ? 'mm' : null), brand: q.get('brand') !== '0' }; } catch (e) { return null; } })();
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } },
};
const APP = {
  units: store.get('ufg_units', (EMB && EMB.units) || 'mm'),
  ws: null, rec: null, 
  fx: null, fixCtx: null, parsed: null, cbStep: 0, cbTimer: null,
};
const APP_VERSION = '1.3.7';      /* kept in step with the WordPress plugin by build_release.py */
const APP_BUILT = '2026-10-04';
const newState = () => ({ task: null, feature: null, material: null, sub: null, burr: 'light', dims: {}, machine: { type: 'mc', maxRpm: null, iface: null, coolant: true, uneven: false }, override: {} });

/* ---------- units ---------- */
const isIn = () => APP.units === 'in';
const fmtN = (v, dp = 0) => (v == null || v === '' || isNaN(v)) ? '—' : Number(v).toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
const lenOut = (mm, dpmm = 2) => isIn() ? fmtN(mm / 25.4, mm < 2 ? 4 : 3) : fmtN(mm, Number.isInteger(mm) ? 0 : dpmm);
const lenU = () => isIn() ? 'in' : 'mm';
const feedOut = v => v == null ? '—' : (isIn() ? fmtN(v / 25.4, 1) : fmtN(v));
const feedU = () => isIn() ? 'in/min' : 'mm/min';
const diaOut = mm => isIn() ? `Ø${fmtN(mm / 25.4, 3)}″` : `Ø${mm}`;
const lenIn = v => v === '' || v == null || isNaN(parseFloat(v)) ? null : (isIn() ? parseFloat(v) * 25.4 : parseFloat(v));
const lenVal = mm => mm == null ? '' : (isIn() ? +(mm / 25.4).toFixed(3) : mm);

/* ---------- icons ---------- */
const I = {
  logo: '<svg viewBox="0 0 24 24" fill="none"><path d="M5 3v10a7 7 0 0 0 14 0V3" stroke="#E8571A" stroke-width="2.6" stroke-linecap="round"/><path d="M9 3v9M12 3v10M15 3v9" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/></svg>',
  find: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>',
  fix: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/></svg>',
  cases: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M8 13h8M8 16h5"/></svg>',
  learn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 8l10-5 10 5-10 5z"/><path d="M6 10v5c3 3 9 3 12 0v-5"/></svg>',
  prod: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="7" rx="1"/><path d="M8 9h8v4H8zM9 13v8M12 13v8M15 13v8"/></svg>',
  warn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17v.5"/></svg>',
  info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5 9-10"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h16M14 6l6 6-6 6"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12H4M10 6l-6 6 6 6"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4v16l13-8z"/></svg>',
  pause: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>',
  copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg>',
  mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
  link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg>',
  gauge: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 17a8 8 0 1 1 16 0"/><path d="M12 17l4-6"/><circle cx="12" cy="17" r="1.2" fill="currentColor"/></svg>',
  more: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>',
  swap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h13l-3-3M20 16H7l3 3"/></svg>',
  clip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5 12.5 20a5 5 0 0 1-7-7L14 4.5a3.3 3.3 0 0 1 4.7 4.7L10.2 17.7a1.7 1.7 0 0 1-2.4-2.4L15.5 7.6"/></svg>',
  print: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M6 9V3h12v6M6 18H4v-7h16v7h-2M7 14h10v7H7z"/></svg>',
};
// task / feature / material glyphs (simple line drawings)
const G_ = (p) => `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const GLYPH = {
  deburr_mill: G_('<path d="M4 22h18v6H4z"/><path d="M22 22l4-3-2 3"/><path d="M8 18l3-10M14 18l3-10"/>'),
  deburr_drill: G_('<path d="M4 18h24v8H4z"/><path d="M12 18v8M20 18v8"/><path d="M11 18l-1.5-2.5M21 18l1.5-2.5"/><path d="M16 4v10"/>'),
  crosshole: G_('<path d="M10 3v26M18 3v26"/><path d="M18 13h11M18 19h11"/><path d="M18 13l-2 1.5M18 19l-2-1.5"/>'),
  edge: G_('<path d="M4 26V12h10a10 10 0 0 1 10 10v4"/><path d="M4 26h20"/>'),
  marks: G_('<path d="M4 22h24"/><path d="M5 17c2-3 4 3 6 0s4 3 6 0 4 3 6 0 4 3 5 0"/><path d="M8 9l4 4M14 7l4 4"/>'),
  polish: G_('<path d="M4 24h24"/><path d="M16 4v6M13 7h6M24 10v4M22 12h4M8 12v3M6.5 13.5h3"/>'),
  id_finish: G_('<circle cx="16" cy="16" r="11"/><circle cx="16" cy="16" r="5"/><path d="M16 5v6M16 21v6"/>'),
  hard: G_('<path d="M16 3l10 9-10 17L6 12z"/><path d="M6 12h20M12 12l4 17 4-17"/>'),
  face: G_('<path d="M3 20l8-6h18l-8 6z"/><path d="M3 20v5h18v-5M21 25l8-6v-5"/>'),
  edge2: G_('<path d="M4 26h16a6 6 0 0 0 6-6V8"/><path d="M26 8l-3 3M26 8l3 3"/>'),
  hole: G_('<ellipse cx="16" cy="12" rx="8" ry="3"/><path d="M8 12v12a8 3 0 0 0 16 0V12"/>'),
  cross: G_('<path d="M10 3v26M18 3v26"/><path d="M18 13h11M18 19h11"/>'),
  bore: G_('<circle cx="16" cy="16" r="11"/><circle cx="16" cy="16" r="6"/>'),
  groove: G_('<path d="M3 10h9v12h8V10h9"/>'),
  radius: G_('<path d="M4 26c0-12 10-22 22-22"/><path d="M4 26h22V4"/>'),
  small: G_('<circle cx="16" cy="16" r="3"/><circle cx="16" cy="16" r="9" stroke-dasharray="2 3"/>'),
  thread: G_('<path d="M10 4v24M22 4v24"/><path d="M10 7l12 3M10 12l12 3M10 17l12 3M10 22l12 3"/>'),
  mc: G_('<rect x="4" y="4" width="24" height="24" rx="2"/><path d="M13 4v10h6V4M16 14v6"/><path d="M8 24h16"/>'),
  lathe: G_('<path d="M3 22h26"/><rect x="4" y="10" width="7" height="10"/><path d="M11 15h12"/><path d="M23 12v6l4-3z"/>'),
  lathe0: G_('<path d="M3 22h26"/><rect x="4" y="10" width="7" height="10"/><path d="M11 15h14"/>'),
  swiss: G_('<path d="M3 22h26"/><path d="M4 13h18v4H4z"/><path d="M22 11v8M26 9v12"/>'),
  robot: G_('<path d="M6 28h10M11 28v-6l6-8 6 4"/><circle cx="11" cy="22" r="2"/><circle cx="17" cy="14" r="2"/><path d="M23 18v6"/>'),
  hand: G_('<path d="M6 26l10-10"/><rect x="14" y="6" width="6" height="16" rx="3" transform="rotate(45 17 14)"/><path d="M24 5l3 3"/>'),
};
const MAT_GLYPH = { carbon: 'Fe', stainless: 'SS', hardened: 'HRC', castiron: 'GG', aluminum: 'Al', brass: 'CuZn', copper: 'Cu', titanium: 'Ti', hrsa: 'Ni', plastic: 'PL', carbide: 'WC', other: '?' };
const matIc = m => `<svg viewBox="0 0 32 32"><text x="16" y="20.5" text-anchor="middle" font-family="Barlow Condensed, Arial Narrow, sans-serif" font-weight="700" font-size="${MAT_GLYPH[m].length > 2 ? 11 : 15}" fill="currentColor">${MAT_GLYPH[m]}</text></svg>`;

/* ---------- product art ---------- */
function fiberLines(x0, x1, y0, y1, hex, step = 2.2, curve = 0) {
  let s = '';
  for (let x = x0; x <= x1; x += step) {
    const dx = curve ? (x - (x0 + x1) / 2) * curve : 0;
    s += `<path d="M${x.toFixed(1)} ${y0} Q ${(x + dx * .3).toFixed(1)} ${(y0 + y1) / 2} ${(x + dx).toFixed(1)} ${y1}" stroke="${hex}" stroke-width="1.6"/>`;
  }
  return s + `<path d="M${x0} ${y0} L${x0} ${y1} M${x1} ${y0} L${x1} ${y1}" stroke="rgba(0,0,0,.18)" stroke-width=".6"/>`;
}
function brushArt(fam, hex, opts = {}) {
  const metal = 'url(#mtl)', defs = `<defs><linearGradient id="mtl" x1="0" x2="1"><stop offset="0" stop-color="#7d868e"/><stop offset=".45" stop-color="#d9dee2"/><stop offset="1" stop-color="#6c747b"/></linearGradient></defs>`;
  const edge = 'stroke="rgba(0,0,0,.25)" stroke-width=".6"';
  let b = '';
  if (fam === 'surface') b = `<rect x="43" y="4" width="14" height="46" fill="${metal}" ${edge}/><rect x="28" y="48" width="44" height="62" rx="3" fill="${metal}" ${edge}/><rect x="28" y="96" width="44" height="3" fill="rgba(0,0,0,.15)"/><rect x="31" y="110" width="38" height="66" fill="${hex}" opacity=".35"/>${fiberLines(31, 69, 110, 176, hex)}`;
  else if (fam === 'shank') b = `<rect x="44" y="4" width="12" height="70" fill="${metal}" ${edge}/><rect x="40" y="70" width="20" height="18" fill="${metal}" ${edge}/><rect x="31" y="88" width="38" height="92" fill="${hex}" opacity=".35"/>${fiberLines(31, 69, 88, 180, hex, 2.2, .35)}`;
  else if (fam === 'crosshole') b = `<rect x="46" y="4" width="8" height="90" fill="${metal}" ${edge}/><path d="M50 94v86" stroke="#9aa1a7" stroke-width="2"/>${Array.from({ length: 26 }, (_, i) => { const y = 100 + i * 3.2; return `<path d="M50 ${y} L${36 + (i % 2) * 2} ${y + 2} M50 ${y} L${64 - (i % 2) * 2} ${y + 2}" stroke="${hex}" stroke-width="1.8"/>`; }).join('')}<path d="M36 100v84M64 100v84" stroke="rgba(0,0,0,.15)" stroke-width=".6"/>`;
  else if (fam === 'point') b = `<rect x="46" y="4" width="8" height="120" fill="${metal}" ${edge}/><rect x="45" y="120" width="10" height="10" fill="${metal}" ${edge}/><rect x="46.5" y="130" width="7" height="44" fill="${hex}" opacity=".4"/>${fiberLines(46.5, 53.5, 130, 174, hex, 1.6)}`;
  else if (fam === 'end' || fam === 'endAngled') b = `<rect x="46" y="4" width="8" height="110" fill="${metal}" ${edge}/><rect x="42" y="110" width="16" height="16" fill="${metal}" ${edge}/><rect x="43" y="126" width="14" height="${fam === 'end' ? 50 : 40}" fill="${hex}" opacity=".4"/>${fiberLines(43, 57, 126, fam === 'end' ? 176 : 166, hex, 1.7)}${fam === 'endAngled' ? `<path d="M43 166 L50 178 L57 166z" fill="${hex}" ${edge}/>` : ''}`;
  else if (fam === 'disc') b = `<rect x="46" y="4" width="8" height="120" fill="${metal}" ${edge}/><rect x="44" y="118" width="12" height="10" fill="${metal}" ${edge}/><ellipse cx="50" cy="132" rx="36" ry="6" fill="${hex}" ${edge}/><ellipse cx="50" cy="131" rx="36" ry="5" fill="${hex}" opacity=".7"/><rect x="47" y="128" width="6" height="8" fill="${metal}"/>`;
  else if (fam === 'diamond') b = `<rect x="46" y="4" width="8" height="120" fill="${metal}" ${edge}/><rect x="45.5" y="124" width="9" height="46" rx="2" fill="${hex}" ${edge}/><path d="M46 132h8M46 142h8M46 152h8M46 162h8" stroke="rgba(255,255,255,.25)" stroke-width="1"/>`;
  return `<svg viewBox="0 0 100 184" width="${opts.w || 92}" height="${opts.h || 170}" role="img" aria-label="${esc(opts.label || 'Brush')}">${defs}${b}</svg>`;
}

/* ---------- RPM gauge ---------- */
function gauge(p, machineMax) {
  const top = Math.max(p.rpmMax || p.rpmHi, machineMax || 0, p.rpm) * 1.08;
  const X = v => 10 + (v / top) * 580;
  const lo = X(p.rpmLo), hi = X(p.rpmHi), st = X(p.rpm), mx = X(p.rpmMax);
  let s = `<svg viewBox="0 0 600 64" role="img" aria-label="Speed window ${p.rpmLo} to ${p.rpmHi} RPM, start ${p.rpm}">`;
  s += `<rect x="10" y="26" width="580" height="10" rx="5" fill="var(--line-2)"/>`;
  s += `<rect x="${lo}" y="24" width="${Math.max(4, hi - lo)}" height="14" rx="4" fill="var(--ok-soft)" stroke="var(--ok)" stroke-width="1.5"/>`;
  if (p.rpmMax && p.rpmMax > p.rpmHi) s += `<line x1="${mx}" x2="${mx}" y1="18" y2="44" stroke="var(--bad)" stroke-width="2.5"/><text x="${Math.min(mx, 590)}" y="58" text-anchor="end" font-size="12" fill="var(--bad)" font-family="Barlow, sans-serif" font-weight="600">max ${fmtN(p.rpmMax)}</text>`;
  if (machineMax) { const m = X(machineMax); s += `<line x1="${m}" x2="${m}" y1="16" y2="46" stroke="var(--ink-2)" stroke-width="2" stroke-dasharray="3 3"/><text x="${m}" y="12" text-anchor="middle" font-size="11.5" fill="var(--ink-2)" font-family="Barlow, sans-serif">your spindle</text>`; }
  s += `<path d="M${st} 22 l-7 -10 h14 z" fill="var(--accent)"/><line x1="${st}" x2="${st}" y1="22" y2="40" stroke="var(--accent)" stroke-width="3"/>`;
  s += `<text x="${lo}" y="58" font-size="12" fill="var(--ok)" font-family="Barlow, sans-serif" font-weight="600" text-anchor="${lo < 60 ? 'start' : 'middle'}">${fmtN(p.rpmLo)}</text><text x="${hi}" y="58" font-size="12" fill="var(--ok)" font-family="Barlow, sans-serif" font-weight="600" text-anchor="middle">${fmtN(p.rpmHi)}</text>`;
  return s + '</svg>';
}

/* ---------- strategy diagrams ---------- */
function dgSurface(R) {
  const hex = R.grit.hex, doc = typeof R.params.engage.value === 'number' ? R.params.engage.value : 0.4;
  const dpx = 7;
  const fib = (x0, x1, y0, y1, bend) => { let s = ''; for (let x = x0; x <= x1; x += 2.6) { const b = bend ? (x - (x0 + x1) / 2) * 0.55 + 10 : 0; s += `<path d="M${x} ${y0} Q ${x + b * .2} ${(y0 + y1) / 2} ${x + b} ${y1}" stroke="${hex}" stroke-width="1.7" fill="none"/>`; } return s; };
  const fiberEdge = 'rgba(0,0,0,.3)';
  return `<svg viewBox="0 0 420 356" role="img" aria-label="Surface brush engagement diagram">
  <defs><marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 10 5 0 10z" fill="var(--accent)"/></marker></defs>
  <rect x="20" y="150" width="300" height="56" fill="var(--line)"/>
  <path d="M320 150 L331 141 L327 150 Z" fill="var(--bad)"/>
  <text x="336" y="146" font-size="12" fill="var(--bad)" font-family="Barlow,sans-serif" font-weight="600">burr</text>
  <line x1="60" x2="250" y1="26" y2="26" stroke="var(--accent)" stroke-width="2.5" marker-end="url(#ah)"/>
  <text x="62" y="18" font-size="13" fill="var(--ink-2)" font-family="Barlow,sans-serif" font-weight="600">Feed ${feedOut(R.params.feed)} ${feedU()}</text>
  <g class="brush-move">
    <rect x="66" y="36" width="14" height="30" fill="#9aa2a9"/>
    <rect x="50" y="62" width="46" height="46" rx="3" fill="#a9b0b6" stroke="rgba(0,0,0,.25)"/>
    <g>${fib(53, 93, 108, 150 + dpx, false)}</g>
    <path d="M53 108v${42 + dpx}M93 108v${42 + dpx}" stroke="${fiberEdge}" stroke-width=".6"/>
    <path d="M100 74 a 26 9 0 1 1 -54 0" fill="none" stroke="var(--ink-2)" stroke-width="1.8" marker-end="url(#ah)"/>
  </g>
  <line x1="350" x2="350" y1="150" y2="${150 + dpx}" stroke="var(--ink)" stroke-width="1.5"/><line x1="342" x2="358" y1="150" y2="150" stroke="var(--ink)"/><line x1="342" x2="358" y1="${150 + dpx}" y2="${150 + dpx}" stroke="var(--ink)"/>
  <text x="362" y="${158 + dpx / 2}" font-size="13" fill="var(--ink)" font-family="Barlow Condensed,sans-serif" font-weight="700">${R.params.engage.label === 'Depth of cut' ? lenOut(doc) + ' ' + lenU() : '~2 mm into damper'}</text>
  <text x="22" y="224" font-size="12.5" fill="var(--ink-2)" font-family="Barlow,sans-serif">Brush cuts with its tip. Fibers sweep the edge from below (up-cut).</text>
  <g transform="translate(20 240)">
    <rect width="182" height="104" rx="8" fill="var(--surface)" stroke="var(--ok)"/>
    <text x="12" y="20" font-size="12" fill="var(--ok)" font-family="Barlow,sans-serif" font-weight="700">Right</text>
    <text x="12" y="34" font-size="11" fill="var(--ink-2)" font-family="Barlow,sans-serif">fibers straight</text>
    <rect x="14" y="80" width="154" height="16" fill="var(--line)"/>
    <rect x="66" y="42" width="40" height="14" fill="#a9b0b6"/>${fib(70, 102, 56, 83, false)}
  </g>
  <g transform="translate(218 240)">
    <rect width="182" height="104" rx="8" fill="var(--surface)" stroke="var(--bad)"/>
    <text x="12" y="20" font-size="12" fill="var(--bad)" font-family="Barlow,sans-serif" font-weight="700">Too deep</text>
    <text x="12" y="34" font-size="11" fill="var(--ink-2)" font-family="Barlow,sans-serif">fibers bend, wear fast</text>
    <rect x="14" y="76" width="154" height="20" fill="var(--line)"/>
    <rect x="50" y="42" width="40" height="14" fill="#a9b0b6"/>${fib(54, 86, 56, 76, true)}
  </g></svg>`;
}

function dgCross(R) {
  const main = Number(APP.ws?.dims?.main) || 10, cross = Number(APP.ws?.dims?.cross) || main * 0.5;
  const bw = 84, h = Math.max(22, Math.min(72, bw * cross / main));
  const cy = 170, ct = cy - h / 2, cb = cy + h / 2, bx = 150, hex = R.grit.hex;
  const wide = R.family === 'shank' ? bw - 6 : bw - 8;
  const bundle = (w) => { let s = ''; const n = 22; for (let i = 0; i < n; i++) { const y = i * 3; s += `<path d="M0 ${y} L${-w / 2} ${y + 3} M0 ${y} L${w / 2} ${y + 3}" stroke="${hex}" stroke-width="1.8"/>`; } return s + `<path d="M${-w / 2} 0v66M${w / 2} 0v66" stroke="rgba(0,0,0,.2)" stroke-width=".6"/>`; };
  return `<svg viewBox="0 0 420 330" role="img" aria-label="Cross-hole brushing sequence">
  <rect x="60" y="40" width="330" height="270" fill="var(--line)"/>
  <rect x="${bx}" y="40" width="${bw}" height="270" fill="var(--surface)"/>
  <rect x="${bx + bw}" y="${ct}" width="${390 - bx - bw}" height="${h}" fill="var(--surface)"/>
  <g id="cbBurr" style="transition:opacity .6s"><path d="M${bx + bw} ${ct} l-9 4 9 3z M${bx + bw} ${cb} l-9 -4 9 -3z" fill="var(--bad)"/></g>
  <line x1="${bx - 30}" x2="${bx + bw + 30}" y1="${ct - 14}" y2="${ct - 14}" stroke="var(--accent)" stroke-dasharray="4 4"/>
  <line x1="${bx - 30}" x2="${bx + bw + 30}" y1="${cb + 14}" y2="${cb + 14}" stroke="var(--accent)" stroke-dasharray="4 4"/>
  <text x="${bx - 34}" y="${ct - 18}" font-size="13" text-anchor="end" fill="var(--accent)" font-family="Barlow,sans-serif" font-weight="600">5 mm before</text>
  <text x="${bx - 34}" y="${cb + 26}" font-size="13" text-anchor="end" fill="var(--accent)" font-family="Barlow,sans-serif" font-weight="600">5 mm past</text>
  <text x="${bx - 8}" y="20" text-anchor="end" font-size="13" fill="var(--ink-2)" font-family="Barlow,sans-serif" font-weight="600">Main bore ${diaOut(main)}</text>
  <text x="${bx - 8}" y="35" text-anchor="end" font-size="13" fill="var(--accent)" font-family="Barlow,sans-serif" font-weight="600">enter here ↓</text>
  <text x="${bx + bw + 10}" y="${cy + 5}" font-size="13" fill="var(--ink-2)" font-family="Barlow,sans-serif">Cross hole ${diaOut(cross)}</text>
  <g id="cbBrush" style="transition:transform .8s ease">
    <rect x="${bx + bw / 2 - 5}" y="-240" width="10" height="250" fill="#9aa2a9"/>
    <g id="cbN" style="transition:opacity .5s" transform="translate(${bx + bw / 2} 6)">${bundle(16)}</g>
    <g id="cbW" style="transition:opacity .5s;opacity:0" transform="translate(${bx + bw / 2} 6)">${bundle(wide)}</g>
  </g>
  <g id="cbRot" style="transition:opacity .4s;opacity:0"><circle cx="370" cy="26" r="15" fill="var(--accent-soft)"/><path id="cbArc" d="M361 26 a9 9 0 1 1 9 9" fill="none" stroke="var(--accent)" stroke-width="2.4"/><text id="cbDir" x="370" y="58" text-anchor="middle" font-size="13" font-weight="700" fill="var(--accent)" font-family="Barlow Condensed,sans-serif">CW</text></g>
  <g id="cbStop"><rect x="352" y="12" width="30" height="30" rx="6" fill="var(--surface)" stroke="var(--ink-3)"/><rect x="361" y="21" width="12" height="12" fill="var(--ink-3)"/></g>
  </svg>`;
}
const CB_FRAMES = [
  { pos: 'out', wide: 0, rot: 0, burr: 1 }, { pos: 'below', wide: 0, rot: 0, burr: 1 }, { pos: 'below', wide: 1, rot: 'CW', burr: 1 },
  { pos: 'above', wide: 1, rot: 'CW', burr: .5 }, { pos: 'below', wide: 1, rot: 'CW', burr: .2 }, { pos: 'below', wide: 0, rot: 0, burr: .2 },
  { pos: 'above', wide: 1, rot: 'CCW', burr: 0 }, { pos: 'out', wide: 0, rot: 0, burr: 0 },
];
/* Step 7 ("switch to CCW and repeat the pull-back and push-forward strokes") is two
   movements, so it gets two ticks — the same up-then-down the clockwise phase does. */
const CB_PLAY = [
  { f: 0 }, { f: 1 }, { f: 2 }, { f: 3 }, { f: 4 }, { f: 5 },
  { f: 6, pos: 'above' }, { f: 6, pos: 'below' },
  { f: 7 },
];
function cbApply(k) {
  const svg = $('#dgWrap svg'); if (!svg) return;
  const main = Number(APP.ws?.dims?.main) || 10, cross = Number(APP.ws?.dims?.cross) || main * .5;
  const h = Math.max(22, Math.min(72, 84 * cross / main)), ct = 170 - h / 2, cb = 170 + h / 2;
  const e = CB_PLAY[k] || CB_PLAY[0], f = CB_FRAMES[e.f], pos = e.pos || f.pos;
  const yBottomBelow = cb + 14, yBottomAbove = ct - 14, len = 72;
  const y = pos === 'out' ? -30 : pos === 'below' ? yBottomBelow - len : yBottomAbove - len;
  $('#cbBrush', svg).style.transform = `translateY(${y}px)`;
  $('#cbN', svg).style.opacity = f.wide ? 0 : 1; $('#cbW', svg).style.opacity = f.wide ? 1 : 0;
  $('#cbRot', svg).style.opacity = f.rot ? 1 : 0; $('#cbStop', svg).style.opacity = f.rot ? 0 : 1;
  if (f.rot) { $('#cbDir', svg).textContent = f.rot; $('#cbArc', svg).setAttribute('d', f.rot === 'CW' ? 'M361 26 a9 9 0 1 1 9 9' : 'M379 26 a9 9 0 1 0 -9 9'); }
  $('#cbBurr', svg).style.opacity = f.burr;
  document.querySelectorAll('#stepList li').forEach((li, j) => li.classList.toggle('on', j === e.f));
  const cap = $('#dgCap'); if (cap) cap.textContent = `Step ${e.f + 1} of ${CB_FRAMES.length} — ${APP.rec.steps[e.f]}`;
}

function dgGroove(R) {
  const w = Number(APP.ws?.dims?.groove) || 6, hex = R.grit.hex;
  const gw = Math.min(140, Math.max(40, w * 14)), d = Math.min(gw * .9, 18 * 2.5), bw = Math.min(gw - 10, R.dia * 14);
  const gx = 210 - gw / 2;
  let fib = ''; for (let x = -bw / 2; x <= bw / 2; x += 2.2) fib += `<path d="M${x} 0v${d + 34}" stroke="${hex}" stroke-width="1.6"/>`;
  return `<svg viewBox="0 0 420 240" role="img" aria-label="Groove brushing diagram">
  <path d="M20 90 H${gx} V${90 + d + 28} H${gx + gw} V90 H400 V220 H20 Z" fill="var(--line)"/>
  <g class="spin-none" transform="translate(210 40)"><rect x="${-Math.max(6, bw / 2 + 2)}" y="-36" width="${Math.max(12, bw + 4)}" height="20" fill="#9aa2a9"/><g transform="translate(0 -16)">${fib}<path d="M${-bw / 2} 0v${d + 34}M${bw / 2} 0v${d + 34}" stroke="rgba(0,0,0,.25)" stroke-width=".6"/></g></g>
  <line x1="${gx}" x2="${gx + gw}" y1="${90 + d + 44}" y2="${90 + d + 44}" stroke="var(--ink)"/><text x="210" y="${90 + d + 60}" text-anchor="middle" font-size="13" font-weight="700" font-family="Barlow Condensed,sans-serif" fill="var(--ink)">groove ${lenOut(w)} ${lenU()}</text>
  <text x="24" y="30" font-size="12.5" fill="var(--ink-2)" font-family="Barlow,sans-serif">Keep the brush narrower than the groove.</text>
  <text x="24" y="48" font-size="12.5" fill="var(--ink-2)" font-family="Barlow,sans-serif">Work with the tip; don't rub the side walls.</text></svg>`;
}
function dgPoint(R) {
  const hex = R.grit.hex; let fib = ''; for (let x = -10; x <= 10; x += 2.2) fib += `<path d="M${x} 0v54" stroke="${hex}" stroke-width="1.7"/>`;
  return `<svg viewBox="0 0 420 220" role="img" aria-label="Point or end brush on an edge">
  <defs><marker id="ah2" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 10 5 0 10z" fill="var(--accent)"/></marker></defs>
  <path d="M20 140 H260 L270 130 L270 200 H20 Z" fill="var(--line)"/><path d="M260 140 L270 130 L266 140z" fill="var(--bad)"/>
  <g transform="translate(220 30)"><rect x="-5" y="-30" width="10" height="44" fill="#9aa2a9"/><rect x="-12" y="10" width="24" height="12" fill="#9aa2a9"/><g transform="translate(0 22)">${fib}</g></g>
  <line x1="120" x2="210" y1="70" y2="70" stroke="var(--accent)" stroke-width="2.4" marker-end="url(#ah2)"/>
  <text x="300" y="120" font-size="12.5" fill="var(--ink-2)" font-family="Barlow,sans-serif">Light tip contact</text><text x="300" y="138" font-size="12.5" fill="var(--ink-2)" font-family="Barlow,sans-serif">Keep it moving</text><text x="300" y="156" font-size="12.5" fill="var(--ink-2)" font-family="Barlow,sans-serif">No side loading</text></svg>`;
}
function dgDisc(R) {
  return `<svg viewBox="0 0 420 220" role="img" aria-label="Radial disc in a narrow slot">
  <path d="M20 60 H190 V190 H200 V60 H400 V210 H20 Z" fill="var(--line)"/>
  <rect x="80" y="104" width="112" height="8" rx="4" fill="${R.grit.hex}" stroke="rgba(0,0,0,.3)"/><rect x="20" y="105" width="64" height="6" fill="#9aa2a9"/>
  <text x="214" y="98" font-size="12.5" fill="var(--ink-2)" font-family="Barlow,sans-serif">0.8 mm disc: rim contact only</text>
  <text x="214" y="116" font-size="12.5" fill="var(--ink-2)" font-family="Barlow,sans-serif">6,000–8,000 RPM · never above 9,000</text>
  <text x="214" y="134" font-size="12.5" fill="var(--ink-2)" font-family="Barlow,sans-serif">Never side-load the disc</text></svg>`;
}
function diagramFor(R) {
  if (R.diagram === 'crosshole') return dgCross(R);
  if (R.diagram === 'groove') return dgGroove(R);
  if (R.diagram === 'disc') return dgDisc(R);
  if (R.diagram === 'point') return dgPoint(R);
  return dgSurface(R);
}

