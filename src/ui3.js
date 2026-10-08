/* ============================================================
   UFIBER Guide — UI part 3: troubleshooter, learn,
   products, router and event wiring
   ============================================================ */

/* ---------- troubleshooter ---------- */
const SYMPTOMS = [
  { id: 'burr', t: 'Burr is still there', s: 'Partly removed, folded over, or untouched', q: { t: 'Where is the burr left?', o: [['side', 'Folded over the edge'], ['top', 'Standing up on top of the edge'], ['cross', 'Inside a cross hole'], ['big', "It's thick — a fingernail can't bend it"]] } },
  { id: 'wear', t: 'Brush wears too quickly', s: 'Getting short fast, or wearing unevenly', q: { t: 'How is it wearing?', o: [['even', 'Shortening evenly, just fast'], ['uneven', 'Unevenly — one side or a step'], ['broken', 'Fibers breaking or splaying at the tip']] } },
  { id: 'rounded', t: 'Edge too rounded or too polished', s: 'Bigger radius than wanted, surface too shiny' },
  { id: 'rough', t: 'Finish not good enough', s: 'Ra too high, brush marks, scratches, dull look' },
  { id: 'break', t: 'Fibers break, fuse or splay', s: 'Broken bristles, melted tips, mushrooming', q: { t: 'When does it happen?', o: [['start', 'Right at the start or on entry'], ['during', 'During the cut'], ['cross', 'With a cross-hole brush'], ['hand', 'Using it by hand']] } },
  { id: 'vib', t: 'Vibration, chatter or noise', s: 'Rough running, uneven contact' },
  { id: 'plastic', t: 'Plastic part melts or discolors', s: 'Smearing, gloss change, heat marks' },
];
function fixList(sym, ans, c) {
  // c = context from a recommendation (may be null)
  const has = !!c;
  const rpmUp = has ? { from: `${fmtN(c.rpm)} RPM`, to: `${fmtN(Math.min(c.rpmHi > c.rpm ? c.rpmHi : c.rpm + 1000, c.rpmMax))} RPM` } : { to: '+1,000 RPM, up to the tool maximum' };
  const rpmDn = has ? { from: `${fmtN(c.rpm)} RPM`, to: `${fmtN(Math.round(c.rpm * 0.85 / 100) * 100)} RPM` } : { to: '−10 to 20%' };
  const feedDn = has && c.feed ? { from: `${feedOut(c.feed)} ${feedU()}`, to: `${feedOut(Math.round(c.feed * 0.8 / 10) * 10)} ${feedU()}` } : { to: '−20%' };
  const feedUp = has && c.feed ? { from: `${feedOut(c.feed)} ${feedU()}`, to: `${feedOut(Math.min(Math.round(c.feed * 1.25 / 10) * 10, c.family === 'surface' ? 2000 : 99999))} ${feedU()}` } : { to: '+20 to 25% (surface brushes max 2,000 mm/min)' };
  const docV = has && typeof c.doc === 'number' && c.engLabel === 'Depth of cut';
  const docUp = docV ? { from: `${lenOut(c.doc)} ${lenU()}`, to: `${lenOut(Math.min(+(c.doc + 0.2).toFixed(2), 1.2))} ${lenU()}` } : { to: '+0.2 mm, never above 1.2 mm' };
  const docDn = docV ? { from: `${lenOut(c.doc)} ${lenU()}`, to: `${lenOut(Math.max(+(c.doc - 0.1).toFixed(2), 0.1))} ${lenU()}` } : { to: 'back to 0.5 mm deburring / 0.2 mm polishing' };
  const gC = has ? { from: `#${c.grit}`, to: `#${gritStep(c.grit, -1)}` } : { to: 'one grit coarser' };
  const gF = has ? { from: `#${c.grit}`, to: `#${gritStep(c.grit, 1)}` } : { to: 'one grit finer' };
  const passUp = has ? { from: `${c.passes} passes`, to: `${c.passes} + 2 passes` } : { to: '+1 to 2 passes' };
  const X = [];
  const add = (t, d, change) => X.push({ t, d, change });
  if (sym === 'burr') {
    if (ans === 'big') add('Take most of the burr off with a cutter first', 'Ceramic fiber removes burrs you can bend with a fingernail (about 0.2 mm at the root). Add a light chamfer pass, or use NOGA UBURR on hole edges, then brush what remains.');
    if (ans === 'cross' || (c && c.family === 'crosshole')) {
      add('Enter from the main (larger) bore', 'From the small hole, the fibers can\'t reach the burr at the intersection.');
      add('Stroke fully past the intersection', 'Travel 5 mm before and 5 mm past it. Change the number of passes, not the stroke length.');
      add('Run both rotation directions', 'Stop, switch CW to CCW, repeat the pull/push strokes. Each direction attacks the burr from a different side.');
      add('Raise the speed', 'More RPM spreads the fibers further into the bore and adds cutting force.', rpmUp);
      add('Add passes', 'Two extra pull/push strokes often finish a stubborn burr.', passUp);
      add('Check brush size against the bore', 'If your bore is near the top of the brush\'s range, the fibers may not reach. Use the next size up.');
      add('Go one grit coarser', 'Coarser fibers cut harder. They also need a little more RPM to expand the same amount.', gC);
      add('Check the hole geometry', 'Cross-hole brushes work when the cross hole is smaller than the bore (≤70% for a full cross), centered and roughly square. Off-center or angled holes need another method.');
    } else {
      if (ans === 'side' || !ans) add('Check the rotation direction', 'For a burr folded sideways, fibers must hit it from underneath (up-cut). Swap M03/M04 or reverse the path direction.');
      if (ans === 'side') add('Add a pass in the opposite direction', 'A burr pushed into a slot or over an edge comes off when the fibers face it head-on.');
      add('Raise the speed toward the top of the window', 'This is the first lever: more cutting action without touching depth.', rpmUp);
      add('Slow the feed', 'More fiber contacts per millimeter of edge.', feedDn);
      add('Increase depth of cut slightly', 'More engagement means more force — but past 1.2 mm the fibers bend instead of cutting.', docUp);
      add('Go one grit coarser', 'Thicker, stiffer fibers for tougher burrs. Expect a slightly larger edge break.', gC);
      add('Shorten the brush projection', 'Shorter fibers are stiffer and cut harder. Try 7–8 mm instead of 10 mm from the sleeve.');
    }
  }
  if (sym === 'wear') {
    if (ans === 'broken') return fixList('break', 'during', c);
    if (ans === 'uneven') {
      add('Stop contact with walls and steps', 'Side contact wears one side of the brush. Keep a clearance to walls and let only the tip cut.');
      add('Lower onto steps without rotation', 'Where the brush would hit a step, position it first, then start the spindle.');
      add('Keep depth within limits', 'Over-engagement bends fibers to one side.', docDn);
      add('Reset the projection to 10 mm max', 'Longer projection than recommended lets fibers fold and wear unevenly.');
      add('Re-square the tip', 'Trim an unevenly worn brush with a thin diamond cut-off disc while it rotates slowly.');
    } else {
      add('Reduce depth of cut', 'The most common cause of fast wear. The brush cuts with its tip, not by being pushed in.', docDn);
      add('Increase the feed', 'Less time in contact per edge, and usually still enough to remove the burr.', feedUp);
      add('Reduce speed', 'Lower RPM means less heat and slower wear.', rpmDn);
      add('Use coolant', 'Wet machining (oil or water-based) extends brush life and improves finish.');
      add('Go one grit finer if burrs allow', 'Finer brushes wear less on small burrs.', gF);
      add('Add a floating damper', 'For uneven or long-run parts, a damper keeps pressure constant and compensates for wear automatically.');
    }
  }
  if (sym === 'rounded') {
    add('Increase the feed', 'Faster feed shortens contact time and keeps the edge crisper — as long as burrs still come off.', feedUp);
    add('Reduce speed', 'Less cutting action per pass.', rpmDn);
    add('Reduce passes', 'Each pass removes a few microns. Drop one and check.');
    add('Reduce depth of cut', 'Less engagement, less edge break.', docDn);
    add('Go one grit finer', 'Finer fibers remove less and leave a smaller radius.', gF);
  }
  if (sym === 'rough') {
    add('Move to the next finer grit', 'Finish with a finer brush after the burr is gone.', gF);
    add('Add passes rather than slowing down', 'For the same cycle time, more passes improve Ra more than a slower feed.', passUp);
    add('Switch to wet machining', 'Coolant improves surface finish and reduces loading.');
    add('Use polishing depth', 'Polishing works best with light engagement, around 0.1–0.2 mm.', docDn);
    add('Alternate path direction between passes', 'Crossing the scratch pattern evens out the surface.');
    add('Know the limits', 'Ceramic fiber reaches roughly Ra 0.03–0.1 µm on steel with a grit sequence, but not a mirror finish. On diamond-machined aluminum it can leave a slightly dull look.');
  }
  if (sym === 'break') {
    if (ans === 'cross') { add('Insert and remove only when stopped', 'Spinning outside the bore throws the fibers outward and snaps them.'); add('Grip at least 30 mm of shank', 'Short grip lets the brush whip.'); }
    if (ans === 'hand') add('Use an electric tool, not an air tool', 'End and point brushes are not recommended with pneumatic tools. Use the E-Pack or an electric handpiece.');
    add('Check you are under the maximum RPM', `Surface brushes: per-size limits; cross-hole Ø1.5 20,000, others 14,000; point/end 12,000; discs 9,000.${has ? ' This tool: ' + fmtN(c.rpmMax) + ' RPM.' : ''}`);
    add('Never cut with the side of the brush', 'Side loading and wall contact are the main causes of snapped fibers.');
    add('Ramp in instead of plunging', 'Approach from outside the part, or ramp about 5° to depth.');
    add('Keep depth of cut at or below 1.2 mm', 'Excess engagement folds fibers over.', docDn);
    add('Keep projection at 10 mm or less', 'Too much free fiber length lets the bristles whip and break.');
    add('Fused or glazed tips mean heat', 'Use coolant and reduce speed, especially on titanium, heat-resistant alloys and plastics.', rpmDn);
    add('Fine grits are more fragile', '#1200 and finer bend more and break more easily. If breakage persists, try one grit coarser.', gC);
  }
  if (sym === 'vib') {
    add('Stop and inspect', 'Check for loose sleeve screws, a damaged brush or a loose holder before running again.');
    add('Check clamping and overhang', 'Full shank engagement in the collet, minimal overhang. Cross-hole brushes need at least 30 mm grip.');
    add('Bring speed into the window', 'Running above the recommended range on large brushes causes vibration.', rpmDn);
    add('Check runout', 'Large runout gives uneven contact and chatter. Re-seat the sleeve and holder.');
  }
  if (sym === 'plastic') {
    add('Cut the speed sharply', 'Heat softens plastics. Try well under the metal starting speed — even a fraction of it.', has ? { from: `${fmtN(c.rpm)} RPM`, to: `${fmtN(Math.round(c.rpm * 0.4 / 100) * 100)} RPM` } : { to: '−50% or more' });
    add('Increase feed', 'Less dwell, less heat.', feedUp);
    add('Use air with extraction', 'Dry air blast keeps the cut cool and clears dust.');
    add('Lighten the engagement', 'Polishing-level depth is often enough on plastics.', docDn);
  }
  return X;
}
function fixView() {
  const fx = APP.fx || (APP.fx = { sym: null, ans: null, i: 0, tried: [] });
  const c = APP.fixCtx;
  const ctx = c ? `<div class="ctxbar"><span>For your setup:</span><b>${esc(c.sku)}</b><span>${diaOut(c.dia)} · #${c.grit}</span><span><b>${fmtN(c.rpm)}</b> RPM</span>${c.feed ? `<span><b>${feedOut(c.feed)}</b> ${feedU()}</span>` : ''}${typeof c.doc === 'number' ? `<span>${esc(c.engLabel)} <b>${c.engUnit === 'mm' ? lenOut(c.doc) : c.doc}</b> ${c.engUnit === 'mm' ? lenU() : esc(c.engUnit || '')}</span>` : ''}<button class="btn ghost small" id="clrCtx">Clear</button></div>` : `<p class="muted small" style="margin-top:-4px">Tip: open this from a recommendation and every fix shows your exact new numbers.</p>`;
  if (!fx.sym) return `<h1 class="h2" style="font-size:34px">What's going wrong?</h1>${ctx}<div class="tiles" style="margin-top:12px">${SYMPTOMS.map(s => `<button class="tile" data-sym="${s.id}"><span class="ic">${I.fix}</span><span>${s.t}<small>${s.s}</small></span></button>`).join('')}</div>`;
  const S = SYMPTOMS.find(s => s.id === fx.sym);
  if (S.q && !fx.ans) return `<button class="btn ghost small" data-fx="restart">${I.back} Symptoms</button><h1 class="h2" style="font-size:34px;margin-top:6px">${S.q.t}</h1>${ctx}<div class="tiles" style="margin-top:12px">${S.q.o.map(([k, v]) => `<button class="tile" data-ans="${k}"><span>${v}</span></button>`).join('')}</div>`;
  const list = fixList(fx.sym, fx.ans, c);
  if (fx.done || fx.i >= list.length) {
    const solved = fx.done === 'solved';
    return `<button class="btn ghost small" data-fx="restart">${I.back} Start over</button><h1 class="h2" style="font-size:34px;margin-top:6px">${solved ? 'Nice — note what worked' : "Let's get an engineer on it"}</h1>${ctx}
      <div class="fixcard"><p style="margin-top:0">${solved ? `Fixed by: <b>${esc(list[fx.fixedAt]?.t || '')}</b>. Keep the change and record it on your setup sheet so the next shift starts there.` : 'You worked through every standard fix. Send the details — NOGA application engineers can review your part, burr photos and parameters.'}</p>
      <div class="row"><button class="btn primary" id="fxMail">${I.mail} Send to NOGA engineer</button>${c ? `<a class="btn" href="#/result">Back to my setup</a>` : ''}</div></div>
      <div id="mailSlot" style="max-width:720px"></div><div id="copySlot"></div><div class="tried">${fx.tried.map(t => `<div>${t.ok ? I.check : I.x}<span>${esc(t.t)}${t.change ? ` (${esc(t.change)})` : ''}</span></div>`).join('')}</div>`;
  }
  const f = list[fx.i];
  return `<button class="btn ghost small" data-fx="restart">${I.back} Symptoms</button><h1 class="h2" style="font-size:30px;margin-top:6px">${esc(S.t)}</h1>${ctx}
  <div class="fixcard fade-in"><div class="tag">${fx.i === 0 ? 'Try this first' : `Next fix — ${fx.i + 1} of ${list.length}`}</div><h3>${esc(f.t)}</h3>
    ${f.change ? `<div class="change">${f.change.from ? `<span class="from">${esc(f.change.from)}</span>${I.arrow}` : ''}<span>${esc(f.change.to)}</span></div>` : ''}
    <p class="muted" style="margin:12px 0 16px">${esc(f.d)}</p>
    <p class="tiny" style="margin:-6px 0 14px">Change one thing at a time, then run a test part.</p>
    <div class="row"><button class="btn primary" data-fx="ok">${I.check} That fixed it</button><button class="btn" data-fx="next">Still a problem — next</button></div></div>
  ${fx.tried.length ? `<div class="tried"><div class="tiny">Already tried</div>${fx.tried.map(t => `<div>${I.x}<span>${esc(t.t)}</span></div>`).join('')}</div>` : ''}`;
}

const LEARN = [
  { t: 'What a ceramic fiber tool is', ic: GLYPH.small, b: () => `<svg viewBox="0 0 620 170"><g transform="translate(30 20)">${Array.from({ length: 9 }, (_, i) => `<rect x="${i * 12}" y="0" width="9" height="130" rx="2" fill="${GRITS[6].hex}" opacity="${0.55 + (i % 3) * .15}"/>`).join('')}</g><path d="M150 80h60" stroke="var(--ink-3)" stroke-dasharray="3 3"/><g transform="translate(230 20)"><rect width="150" height="130" rx="8" fill="var(--surface)" stroke="var(--line)"/>${Array.from({ length: 140 }, (_, i) => `<circle cx="${12 + (i % 14) * 9.5}" cy="${12 + Math.floor(i / 14) * 11.5}" r="3.2" fill="${GRITS[6].hex}" opacity=".85"/>`).join('')}</g><text x="400" y="60" font-family="Barlow,sans-serif" font-size="14" fill="var(--ink)">One bristle = hundreds of</text><text x="400" y="80" font-family="Barlow,sans-serif" font-size="14" fill="var(--ink)">continuous ceramic fibers.</text><text x="400" y="108" font-family="Barlow,sans-serif" font-size="13" fill="var(--ink-2)">Each fiber end is a cutting edge.</text></svg>
      Each bristle is a rod of bundled ceramic fibers — the fiber itself is the abrasive. There's no grit glued onto nylon. That's why the brush <b>cuts like a tool</b> and holds its shape, so it can run inside a CNC program with fixed depth and feed.` },
  { t: 'Why the fibers are self-sharpening', ic: GLYPH.hard, b: () => `<svg viewBox="0 0 620 150">${[0, 1, 2].map(k => `<g transform="translate(${40 + k * 190} 20)">${Array.from({ length: 6 }, (_, i) => `<rect x="${i * 14}" y="${k * 18}" width="10" height="${100 - k * 18}" fill="${GRITS[4].hex}" opacity=".85"/>`).join('')}${Array.from({ length: 6 }, (_, i) => `<path d="M${i * 14} ${100} l5 6 5 -6" fill="var(--ink)" opacity=".6"/>`).join('')}<text x="0" y="125" font-family="Barlow,sans-serif" font-size="13" fill="var(--ink-2)">${['New', 'Worn 1/3', 'Worn 2/3'][k]} — still sharp</text></g>`).join('')}</svg>
      As the tips wear, fresh fiber ends are exposed all the way down. Cutting power stays consistent across the brush life — but <b>shorter fibers are stiffer and cut harder</b>. Reset the projection from the sleeve as the brush wears, or let a floating damper compensate.` },
  { t: 'UFIBER vs nylon and wire brushes', ic: GLYPH.deburr_mill, b: () => `<div class="scroll-x"><table class="ctl-table"><tr><th></th><th>UFIBER ceramic fiber</th><th>Abrasive nylon</th><th>Wire</th></tr><tr><td>Cutting material</td><td>The fiber itself</td><td>Grit in a soft filament</td><td>Steel or brass wire</td></tr><tr><td>Shape over time</td><td>Stays straight</td><td>Splays, deforms</td><td>Bends, sheds</td></tr><tr><td>Result in CNC</td><td>Repeatable with fixed depth</td><td>Drifts as it deforms</td><td>Can leave scratches, secondary burrs</td></tr><tr><td>Also polishes</td><td>Yes, to ~Ra 0.03–0.1 µm</td><td>Limited</td><td>No</td></tr></table></div><p>In the case library, nylon and wire brushes repeatedly failed on burrs that ceramic fiber removed in one process.</p>` },
  { t: 'How grit affects cutting and finish', ic: GLYPH.polish, b: () => `<div class="gritbar" id="gritbar">${GRITS.map((g, i) => `<button data-gb="${i}" style="background:${g.hex};color:${[5, 9].includes(i) ? '#333' : '#fff'}" aria-label="Grit ${g.grit}">${g.grit}</button>`).join('')}</div><div class="row tiny" style="justify-content:space-between"><span>Coarse — more cutting, larger edge break</span><span>Fine — smoother, gentler</span></div><p id="gbInfo" style="margin-top:10px">Tap a grit to see where it fits.</p><p>Rule of thumb: <b>harder material or bigger burr → coarser</b>. Softer material or finer finish → finer. For polishing, work through a sequence, e.g. #800 → #1200.</p>` },
  { t: 'How RPM, depth and feed work together', ic: GLYPH.marks, b: () => `<p>Four goals, four recipes — straight from NOGA's performance-control guidance:</p><div class="scroll-x"><table class="ctl-table"><tr><th>Goal</th><th>Feed</th><th>Speed</th><th>Depth</th><th>What happens</th></tr>
      <tr><td>More deburring power</td><td class="a down">↓</td><td class="a up">↑</td><td class="a up">↑</td><td>Removes tougher burrs; more wear and heat</td></tr>
      <tr><td>Longer brush life</td><td class="a up">↑</td><td class="a down">↓</td><td class="a down">↓</td><td>Softer contact, less removal</td></tr>
      <tr><td>Better finish</td><td class="a down">↓</td><td class="a up">↑</td><td class="a down">↓</td><td>Finer surface, light pressure</td></tr>
      <tr><td>Keep edges sharp</td><td class="a up">↑</td><td class="a down">↓</td><td class="a down">↓</td><td>Minimal removal and edge rounding</td></tr></table></div>
      <p><b>Speed</b> sets cutting energy (and, for cross-hole brushes, how far the fibers fan out). <b>Depth</b> sets force — the catalogue limit is 1.2 mm for surface brushes. <b>Feed</b> sets contact time per millimeter of edge. Change one at a time.</p>` },
  { t: 'Engagement: right vs too deep', ic: GLYPH.face, b: () => dgSurface({ grit: GRITS[6], params: { feed: 1500, engage: { label: 'Depth of cut', value: 0.5 } } }) + `The brush cuts with its <b>tip</b>. Typical depth: 0.2 mm polishing, 0.5 mm deburring, 1.2 mm absolute maximum. Deeper doesn't cut more — it bends the fibers sideways, wears them fast and can snap them.` },
  { t: 'How to maximize tool life', ic: GLYPH.fix || '', b: () => `<ul><li>Stay at or below the catalogue depth (0.5 mm deburring).</li><li>Use the fastest feed that still removes the burr.</li><li>Use coolant — wet machining improves life and finish.</li><li>Never let the side of the brush rub a wall or step.</li><li>Reset projection as it wears (max 10 mm from the sleeve).</li><li>For uneven or long runs, a floating damper keeps pressure constant.</li><li>Clean the brush: rinse and blow off sludge.</li></ul>` },
  { t: 'When to use a floating damper', ic: GLYPH.robot, b: () => `<p>A floating damper holds the brush on a spring so contact pressure stays constant.</p><ul><li><b>Robots</b> — path accuracy is lower than a machine tool.</li><li><b>Cast or uneven surfaces</b>, runout on gears and rings.</li><li><b>Long production runs</b> — it absorbs wear so you don't keep re-offsetting.</li></ul><p>BT30/BT40 types: 5 mm float, about 50 N, max 6,000 RPM. End types (Ø6 / Ø10 shank): 4 mm float, about 20 N, max 12,000 RPM.</p>` },
  { t: 'Point and End brush contact', ic: GLYPH.small, b: () => `<ul><li><b>Tip contact (axial)</b> — recess bottoms, small flat areas.</li><li><b>Side contact (radial)</b> — groove walls and bore walls, with light lateral pressure.</li><li><b>Angled contact</b> — corners and transitions; the 45° end brush reaches chamfers and recesses.</li><li><b>Avoid</b> forcing the fibers sideways against an edge: it bends them, lowers stability and wears the brush faster.</li><li>Grip the shank at least 20 mm, match the collet to the shank, keep runout low and never dwell at one point.</li><li>As the fibers wear and shorten, stiffness changes: re-check the process, reduce engagement, raise feed or go one grit finer. Clean off debris and coolant residue, and inspect tip, shank and runout before production.</li><li>Hand-held: start near 1,000 RPM and go up to 3,000 RPM at most. Electric drives only, no air tools.</li></ul>` },
  { t: 'Making the burr smaller before you deburr', ic: GLYPH.edge || I.check, b: () => `<p>A brush removes a small burr quickly and a heavy one slowly, if at all. Most of the fight is won upstream, in the cutting process that made the burr.</p><ul>
    <li><b>Change a worn cutter.</b> A sharp edge leaves fewer and smaller burrs. This is the cheapest change available and the one most often skipped.</li>
    <li><b>Open the edge angle.</b> Sharp, acute corners throw the biggest burrs. A chamfer, a corner radius or an edge break before the burr forms makes what is left far easier to take off.</li>
    <li><b>Change the cutter style.</b> Geometry matters as much as condition — a flat drill, for instance, can leave a smaller burr than a conventional point in the same material.</li>
    <li><b>Think about rotation direction before you cut</b>, not after. Which way the cutter turns decides which way the burr lies, and a burr standing up is far easier to remove than one folded flat.</li>
    <li><b>Reorder the operations.</b> Burrs standing off a face come off more easily than burrs lying along it, so end mill before face milling where you can. With intersecting holes, put the burr where a tool can reach it: it is easier to work inside the larger bore than the small one.</li>
    <li><b>Feed and depth decide burr size.</b> Feeding harder generally makes a bigger burr. A lighter feed when drilling, or a lighter depth when milling, leaves a smaller burr — often a secondary one that brushes away easily. The balance that minimises total time is usually not the fastest cut.</li></ul>
    <p class="small muted">If the burr is already too thick to bend with a fingernail, no brush will fix it. Either cut it smaller upstream or remove the bulk with a chamfer pass or a hole-deburring tool first.</p>` },
  { t: 'Technique that makes the difference', ic: GLYPH.face || I.check, b: () => `<ul>
    <li><b>Pick a brush wider than the surface.</b> About 1.5 to 2 times the width of the face you are working lets one path cover it. Overlapping passes with a narrow brush wear it unevenly.</li>
    <li><b>For the same cycle time, more passes beat a slower feed.</b> If the finish is not good enough, add a pass before you slow down — each pass takes the roughness down again, and two quick passes usually beat one slow one.</li>
    <li><b>Rotation direction matters for side burrs.</b> Up-cut lifts a burr lying along the surface; down-cut can fold it flat against the part so it survives. For burrs standing off the top face it makes little difference.</li>
    <li><b>Feed is the coarse adjustment.</b> To keep an edge sharper or to stretch tool life, raise the feed in large steps — hundreds of mm/min at a time — staying inside the range where the burr still comes off. Speed is the fine adjustment, in 10 to 20% steps.</li>
    <li><b>Heavy burrs come off in stages.</b> Work toward the burr root over two or three passes rather than taking it in one. One deep pass wears the brush hard and can break fibers without removing the burr.</li>
    <li><b>A worn brush is a different tool.</b> As the fibers shorten they get stiffer: more grinding power, less ability to follow a surface. Drop the depth, and the speed if needed, rather than pressing harder.</li>
    <li><b>Wet beats dry</b> for both finish and tool life, where the machine allows it.</li></ul>` },
  { t: 'Turning the process up or down', ic: GLYPH.gauge || I.gauge, b: () => `<p>Four directions NOGA gives for a surface brush. Change one at a time and re-cut a test part.</p>
    <div class="scroll-x"><table class="tbl"><tr><th>Goal</th><th>Feed</th><th>Speed</th><th>Depth</th><th>What you get</th></tr>
    <tr><td><b>More deburring power</b></td><td>↓ lower</td><td>↑ higher</td><td>↑ deeper</td><td>More cutting action and burr removal, at the cost of brush wear and heat.</td></tr>
    <tr><td><b>Less deburring power</b></td><td>↑ higher</td><td>↓ lower</td><td>↓ lighter</td><td>Softer contact, less material removed, longer tool life.</td></tr>
    <tr><td><b>Better polish</b></td><td>↓ lower</td><td>↑ higher</td><td>↓ lighter</td><td>Finer finish with less scratching: light pressure, more fiber passes over the same spot.</td></tr>
    <tr><td><b>Gentle polish</b></td><td>↑ higher</td><td>↓ lower</td><td>↓ lighter</td><td>Minimal stock removal and less risk of over-rounding the edge.</td></tr></table></div>
    <ul><li>Depth never goes past <b>1.2 mm</b>, whatever the goal.</li><li>Speed can only go up while the brush is below its maximum — a Ø100 is capped at 1,400 RPM, so there is little headroom.</li><li>Lower feed means longer contact: watch for heat and glazing on aluminium and plastics, and keep the tool moving.</li></ul>` },
  { t: 'Ceramic fiber disc', ic: GLYPH.groove, b: () => `<ul><li>0.8 mm thick radial disc, Ø13–30 mm, six grits #150–#1000. It cuts with its outer rim, which is what gets into grooves, slots, rib bottoms and side walls.</li><li><b>9,000 RPM maximum</b>; NOGA recommends running 6,000–8,000. Never exceed the lowest rating of the disc, adapter, spindle or machine.</li><li>Mount on clamping shank UF7030 (Ø3) or UF7023 (Ø2.35) with its screw and washer. Electric spindle only — <b>not air tools</b>.</li><li>Inspect the disc and mounting before every use, and confirm it runs true before contact. Stop immediately on vibration, overheating or odd noise.</li><li>A broken disc throws fragments: keep guards or the enclosure closed and wear eye protection.</li><li>Grinding dust is abrasive and reaches guideways, bearings and seals. Extract it; do not blow it deeper in with compressed air.</li><li>Dress it only with a diamond dressing tool, then re-check mounting and run-out.</li></ul>` },
  { t: 'Ceramic diamond stones', ic: GLYPH.hard, b: () => `<ul><li>Diamond abrasive in a ceramic-fiber body for tungsten carbide, hardened steel, ceramics, glass and EDM surfaces. Ø1–3 mm, #200 black, #400 silver, #600 forest green, #800 green.</li><li>Up to <b>60,000 RPM</b>, but about <b>30,000 RPM</b> or less is enough for most jobs.</li><li>Light contact: aim for about <b>1 N</b>, never above <b>5 N</b>.</li><li>Test-run first and stop on any runout or vibration. NOGA prescribes no feed or depth: tune on the part.</li><li>The grit number is the diamond grain size. The bond is epoxy resin; a harder bond is not offered. Stones can be dressed to custom shapes and work with pneumatic tools at controlled speed.</li></ul>` },
  { t: 'When UFIBER is not the right tool', ic: I.warn, b: () => `<ul><li><b>Thick burrs</b> — more than ~0.2 mm at the root, or a fingernail can't bend them. Cut them off first (chamfer pass or NOGA UBURR).</li><li><b>Sharp edge required</b> — brushing always leaves a small radius (roughly 0.1–0.3 mm).</li><li><b>Mirror finish</b> — brushes reach fine Ra but leave a directional pattern.</li><li><b>Off-center or steeply angled cross holes</b> — the brush can't reach evenly.</li><li><b>No rotating spindle</b> — a lathe without live tooling can't drive the brush.</li><li><b>Carbide, ceramics, glass, >55 HRC finishing</b> — use Ceramic Diamond Stones.</li><li><b>Air tools</b> for end and point brushes — use an electric drive like the E-Pack.</li></ul>` },
];

/* ---------- products ---------- */
const PRODS = [
  { k: 'surface', t: 'Surface Brush', d: 'Deburring, edge finishing and polishing of faces and edges on CNC and robots. Can also expand into large bores on a shank.', spec: 'Ø6 · 15 · 25 · 40 · 60 · 100 mm · #150–#6000 · DOC 0.2 / 0.5 / 1.2 max · feed ≤2,000 mm/min', dias: [6, 15, 25, 40, 60, 100], grits: GRITS.map(g => g.grit), sku: (d, g) => skuSurface(d, g), acc: d => `Sleeve ${SURFACE[d].sleeve[0]} (${SURFACE[d].sleeve[1]}) · ${fmtN(SURFACE[d].rpm[0])}–${fmtN(SURFACE[d].rpm[1])} RPM` },
  { k: 'crosshole', t: 'Cross-Hole Brush', d: 'Expands in the bore to deburr cross-hole intersections and finish internal diameters.', spec: 'Ø1.5 · 3 · 5 · 7 · 11 mm · bores Ø3.5–20 · 14,000 RPM max (Ø1.5: 20,000)', dias: [1.5, 3, 5, 7, 11], grits: GRITS.map(g => g.grit), sku: (d, g) => (d === 11 && ![600, 800, 1000].includes(g)) ? null : skuCross(d, g), acc: (d, g) => { const c = CROSS[d]; const r = g >= 1200 && c.pilotFine ? c.pilotFine : c.pilot; return `Bore Ø${r[0]}–${r[1]} mm · Ø${c.ds} shank · max ${fmtN(c.max)} RPM`; } },
  { k: 'point', t: 'Point Brush', d: 'Small and narrow features, cutter marks in tight spots. CNC, robot or hand.', spec: 'Ø1 · 1.5 · 2 · 2.5 · 3 mm · 12,000 RPM max', dias: [1, 1.5, 2, 2.5, 3], grits: GRITS.map(g => g.grit), sku: (d, g) => skuPoint(d, g), acc: () => 'Ø3 shank · E-Pack compatible' },
  { k: 'end', t: 'End Brush — flat', d: 'Ø5 flat face for small faces and edges. The go-to hand tool, also for CNC.', spec: 'Ø5 mm · 12,000 RPM max · not for air tools', dias: [5], grits: GRITS.map(g => g.grit), sku: (d, g) => skuEnd(g, false), acc: () => 'E-Pack compatible' },
  { k: 'endAngled', t: 'End Brush — 90° angled', d: 'Pointed tip for corners and selective deburring of complex shapes.', spec: 'Ø5 mm · 12,000 RPM max', dias: [5], grits: GRITS.map(g => g.grit), sku: (d, g) => skuEnd(g, true), acc: () => 'E-Pack compatible' },
  { k: 'disc', t: 'Ceramic Fiber Disc', d: '0.8 mm radial disc for narrow grooves, slots, rib bottoms and side walls.', spec: 'Ø13 · 19 · 22 · 25 · 30 mm · #150–#1000 · max 9,000 RPM (run 6,000–8,000)', dias: [13, 19, 22, 25, 30], grits: [150, 200, 400, 600, 800, 1000], sku: (d, g) => skuDisc(d, g), acc: () => 'Shank UF7030 (Ø3) or UF7023 (Ø2.35)' },
  { k: 'diamond', t: 'Ceramic Diamond Stone', d: 'Carbide, hardened steel, ceramics, glass and EDM surfaces.', spec: 'Ø1–3 mm · #200 black · #400 silver · #600 forest green · #800 green · 60,000 RPM max', dias: [1, 1.5, 2, 2.5, 3], grits: [200, 400, 600, 800], stone: true, sku: (d, g) => skuStone(d, g), acc: () => 'Ø3 shank · E-Pack compatible' },
];
function productsView() {
  return `<h1 class="h2" style="font-size:34px">UFIBER products</h1><p class="muted" style="margin:4px 0 0">Most people start from the problem — <a href="#/">find a tool by application</a>. This page is for checking a code or building an item number.</p>
  <div class="decoder"><div class="inp"><input id="decIn" placeholder="Decode an item: UF1625 or UF-CH-R-D050-L50" aria-label="Item number to decode" style="font-family:var(--f-body);font-size:16px"/></div><button class="btn" id="decGo">Decode</button></div><div id="decOut"></div>
  <figure class="gritscale"><img src="data:image/jpeg;base64,${HERO_IMG.grit}" alt="UFIBER grit range from #150 to #6000, hard to soft, with the fiber color of each grit" loading="lazy" decoding="async">
    <figcaption>A <b>starting point</b> for choosing a grit by material and burr: #150 is hardest, #6000 softest. From the NOGA MT catalogue. A grit proven on your own part beats this chart — if a tested result says otherwise, follow the result.</figcaption></figure>
  <div class="products">${PRODS.map((p, i) => { const g0 = p.stone ? STONE_GRITS[1] : GRITS[5]; const shot = { surface: 'p_surface', crosshole: 'p_crosshole', point: 'p_point', end: 'p_end', endAngled: 'p_end45', disc: 'p_disc', diamond: 'p_stone' }[p.k];
    return `<article class="prod">${shot ? `<img class="prod-shot" src="data:image/jpeg;base64,${HERO_IMG[shot]}" alt="UFIBER ${esc(p.t)} in use" loading="lazy" decoding="async">` : ''}<div class="prod-h">${shot ? '' : brushArt(p.k === 'diamond' ? 'diamond' : p.k, g0.hex, { w: 56, h: 72 })}<div><h3>${p.t}</h3><div class="tiny">${p.spec}</div></div></div><p class="small muted" style="margin:0">${p.d}</p>
    <div class="builder"><div class="row">${p.dias.length > 1 ? `<select data-pb="${i}" data-pk="d" aria-label="Diameter" class="inp" style="min-height:40px;padding:0 8px;width:auto">${p.dias.map(d => `<option value="${d}">Ø${d}</option>`).join('')}</select>` : ''}<select data-pb="${i}" data-pk="g" aria-label="Grit" class="inp" style="min-height:40px;padding:0 8px;width:auto">${p.grits.map(g => `<option value="${g}"${(p.stone ? g === 400 : g === 1000) ? ' selected' : ''}>#${g}</option>`).join('')}</select></div><div class="out" id="pbo${i}"></div></div></article>`; }).join('')}
    <article class="prod"><img class="prod-shot" src="data:image/jpeg;base64,${HERO_IMG.p_sleeve}" alt="UFIBER face sleeve for a surface brush" loading="lazy" decoding="async"><h3>Sleeves & shanks</h3><p class="small muted" style="margin:0">Sleeves hold surface brushes for CNC use and set projection (max 10 mm). Shanks mount a surface brush without a sleeve for bore work.</p><div class="scroll-x"><table class="tbl"><tr><th>Brush</th><th>Sleeve</th><th>Shank</th></tr>${Object.entries(SURFACE).map(([d, s]) => `<tr><td>Ø${d}</td><td>${s.sleeve[0]}<br><span class="tiny">${s.sleeve[1]}</span></td><td>${s.shanks.map(x => x[0]).join(', ') || '—'}</td></tr>`).join('')}</table></div></article>
    <article class="prod"><img class="prod-shot" src="data:image/jpeg;base64,${HERO_IMG.p_damper}" alt="UFIBER BT-type floating damper with an ER25UM collet" loading="lazy" decoding="async"><h3>Floating dampers</h3><p class="small muted" style="margin:0">Constant contact pressure for robots, cast surfaces and long runs.</p><div class="scroll-x"><table class="tbl"><tr><th>Shank</th><th>BT30</th><th>BT40</th><th>End type</th></tr>${[6, 10, 12, 16].map(d => `<tr><td>Ø${d}</td><td>${DAMPER.BT30[d]}</td><td>${DAMPER.BT40[d]}</td><td>${DAMPER.END[d] || '—'}</td></tr>`).join('')}</table></div><p class="tiny">BT: 5 mm float, ~50 N, max 6,000 RPM · End: 4 mm float, ~20 N, max 12,000 RPM</p></article>
    <article class="prod"><img class="prod-shot" src="data:image/jpeg;base64,${HERO_IMG.p_epack}" alt="UFIBER Portable E-Pack UF9999 power pack and handpiece" loading="lazy" decoding="async"><h3>Portable E-Pack UF9999</h3><p class="small muted" style="margin:0">Battery power pack and handpiece for End and Point brushes, discs and diamond stones only — not Surface or Cross-hole brushes. 30,000 RPM max, 3.0 Ncm max torque, forward/reverse, RPM display, 10 h working time, 2 h charge, runs while charging. Always stay within the installed tool's own maximum RPM.</p></article>
  </div>`;
}
function decode(s) {
  s = s.trim().toUpperCase().replace(/\s/g, '');
  if (ACCESSORIES[s]) { const [name, desc, note] = ACCESSORIES[s]; return { acc: true, name, desc, note }; }
  for (const k in ACCESSORIES) if (ACCESSORIES[k][1] === s) { const [name, desc, note] = ACCESSORIES[k]; return { acc: true, sku: k, name, desc, note }; }
  const famBy = { FB: 'Surface Brush', CH: 'Cross-Hole Brush', PB: 'Point Brush', EB: 'End Brush (flat)', EB45: 'End Brush (90° angled)', GD: 'Ceramic Fiber Disc', DS: 'Ceramic Diamond Stone' };
  let m = s.match(/^UF-(FB|CH|PB|EB45|EB|GD|DS)-([A-Z])-D0*([\d.]+)-L0*(\d+)$/);
  if (m) {
    const [, f, code, d] = m; const g = f === 'DS' ? STONE_GRITS.find(x => x.code === code) : GRITS.find(x => x.code === code);
    if (!g) return null;
    if (f === 'GD' && !DISC_GRITS.includes(g.grit)) return null;
    let dia = parseFloat(d); if (['FB', 'CH'].includes(f) && dia >= 10 && !(f === 'CH' && dia === 110)) dia = dia; if (f === 'CH') dia = { 15: 1.5, 30: 3, 50: 5, 70: 7, 110: 11 }[parseInt(d)] || dia; if (f === 'FB') dia = parseInt(d);
    return { fam: famBy[f], dia, grit: g };
  }
  m = s.match(/^UF(\d)(\d)(\d{2})$/);
  if (m) {
    const [, a, i, dd] = m; const famMap = { 1: 'Surface Brush', 2: 'Cross-Hole Brush', 3: 'Point Brush', 4: 'End Brush (flat)', 6: 'End Brush (90° angled)', 7: 'Ceramic Fiber Disc', 9: 'Ceramic Diamond Stone' };
    if (!famMap[a]) return null;
    const g = a === '9' ? STONE_GRITS.find(x => x.i === +i) : GRITS.find(x => x.i === +i); if (!g) return null;
    if (a === '7' && !DISC_GRITS.includes(g.grit)) return null;   // the disc is made in #150-#1000 only
    const dmap = { 1: { '06': 6, 15: 15, 25: 25, 40: 40, 60: 60, '00': 100 }, 2: { 15: 1.5, 30: 3, 50: 5, 70: 7, 11: 11 }, 3: { 10: 1, 15: 1.5, 20: 2, 25: 2.5, 30: 3 }, 4: { 50: 5 }, 6: { 50: 5 }, 7: { 13: 13, 19: 19, 22: 22, 25: 25, 30: 30 }, 9: { 10: 1, 15: 1.5, 20: 2, 21: 2, 25: 2.5, 30: 3 } };
    const dia = dmap[a][dd]; if (dia == null) return null;
    return { fam: famMap[a], dia, grit: g };
  }
  return null;
}

/* ---------- router ---------- */
const ROUTES = { '': 'home', find: 'wizard', result: 'result', fix: 'fix', learn: 'learn', products: 'products', replace: 'replace', speeds: 'speeds' };
function inFrame() { try { return window.self !== window.top; } catch (e) { return true; } }
function viewFromHash() { try { const r = (location.hash || '').replace(/^#\/?/, '').split('?')[0]; return ROUTES[r] !== undefined ? r : ''; } catch (e) { return ''; } }
APP.view = viewFromHash();
function go(v) {
  APP.view = ROUTES[v] !== undefined ? v : '';
  try { history.pushState({ v: APP.view }, '', location.href.split('#')[0] + '#/' + APP.view); } catch (e) { /* sandboxed viewer: in-memory routing only */ }
  route();
}
function focusView() {
  const m = $('#view'); if (!m) return;
  // only when the person is navigating with the keyboard, so a mouse click doesn't steal focus
  if (document.body.classList.contains('kb')) m.focus({ preventScroll: true });
}
function route(keepScroll) {
  clearInterval(APP.cbTimer); APP.cbTimer = null;
  const y = window.scrollY;
  const r = APP.view || '';
  const view = ROUTES[r] || 'home';
  const navKey = { home: 'find', wizard: 'find', result: 'find', fix: 'fix', learn: 'learn', products: 'products', replace: 'replace', speeds: 'speeds' }[view];
  const mm = document.getElementById('moreMenu'); if (mm) mm.hidden = true;
  document.querySelectorAll('[data-more]').forEach(b => b.setAttribute('aria-current', ['learn', 'products'].includes(navKey) ? 'page' : 'false'));
  document.querySelectorAll('[data-navk]').forEach(a => a.setAttribute('aria-current', a.dataset.navk === navKey ? 'page' : 'false'));
  const main = $('#view');
  if (view === 'home') main.innerHTML = home();
  if (view === 'wizard') { if (!APP.ws) APP.ws = newState(); main.innerHTML = wizard(); }
  if (view === 'result') { main.innerHTML = result(); afterResult(); }
  if (view === 'fix') main.innerHTML = fixView();
  if (view === 'learn') main.innerHTML = `<h1 class="h2" style="font-size:34px">Learn UFIBER</h1><p class="muted" style="margin:4px 0 14px">Short, visual answers to the questions machinists ask most.</p><div class="learn">${LEARN.map((l, i) => `<details class="acc"${i === 0 ? ' open' : ''}><summary><span class="ic">${l.ic}</span>${l.t}</summary><div class="body">${l.b()}</div></details>`).join('')}</div>`;
  if (view === 'products') { main.innerHTML = productsView(); PRODS.forEach((p, i) => updBuilder(i)); }
  if (view === 'replace') main.innerHTML = replaceView();
  if (view === 'speeds') main.innerHTML = sfView();
  if (!keepScroll) focusView();
  if (view === 'home') { bindDrop(); renderAttach(); }
  if (view === 'home' && APP.parsed) renderUnderstood();
  if (APP.scrollTo) { const el = document.getElementById(APP.scrollTo); APP.scrollTo = null; if (el) { el.scrollIntoView({ block: 'center' }); el.style.outline = '3px solid var(--accent)'; setTimeout(() => el.style.outline = '', 1800); } }
  else if (keepScroll) window.scrollTo(0, y); else window.scrollTo(0, 0);
}
function afterResult() {
  renderChat();
  try { SHARE.push(); } catch (e) { }
  if (APP.rec?.diagram === 'crosshole') { APP.cbStep = 0; requestAnimationFrame(() => cbApply(0)); }
}
/* Recolour the fibers in a product photo to the chosen grit.
   Only strongly coloured pixels are touched, so the steel shank, the printed
   NOGA MT mark and the white background are left exactly as they are. The
   shading of each strand is kept by preserving the pixel's own lightness. */
function hexToHsl(hex) {
  const n = parseInt(hex.slice(1), 16), r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  let h = 0, s = 0;
  if (mx !== mn) {
    const dd = mx - mn;
    s = l > 0.5 ? dd / (2 - mx - mn) : dd / (mx + mn);
    h = mx === r ? (g - b) / dd + (g < b ? 6 : 0) : mx === g ? (b - r) / dd + 2 : (r - g) / dd + 4;
    h /= 6;
  }
  return [h, s, l];
}
function hslToRgb(h, s, l) {
  if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = (t) => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  return [Math.round(f(h + 1 / 3) * 255), Math.round(f(h) * 255), Math.round(f(h - 1 / 3) * 255)];
}
function tintShot(img, hex) {
  if (!img || !img.complete || !img.naturalWidth) return;
  if (!img.dataset.base) img.dataset.base = img.src;
  const [th, ts, tl] = hexToHsl(hex);
  const src = new Image();
  src.onload = () => {
    try {
      const c = document.createElement('canvas'); c.width = src.naturalWidth; c.height = src.naturalHeight;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(src, 0, 0);
      const d = ctx.getImageData(0, 0, c.width, c.height), a = d.data;
      for (let k = 0; k < a.length; k += 4) {
        const r = a[k], g = a[k + 1], b = a[k + 2];
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
        if (mx < 40) continue;                       // the printed mark and deep shadow
        const sat = (mx - mn) / mx;
        if (sat < 0.25) continue;                    // steel, white background
        const l = (mx + mn) / 510;                   // this pixel's own lightness
        const nl = Math.min(0.97, Math.max(0.08, tl + (l - 0.55) * 0.85));
        const [nr, ng, nb] = hslToRgb(th, Math.max(ts, 0.15), nl);
        a[k] = nr; a[k + 1] = ng; a[k + 2] = nb;
      }
      ctx.putImageData(d, 0, 0);
      img.src = c.toDataURL('image/jpeg', 0.84);
    } catch (e) { }
  };
  src.src = img.dataset.base;
}
function updBuilder(i) {
  const p = PRODS[i]; const d = +($(`[data-pb="${i}"][data-pk="d"]`)?.value || p.dias[0]); const g = +$(`[data-pb="${i}"][data-pk="g"]`).value;
  const r = p.sku(d, g); const o = $('#pbo' + i);
  o.innerHTML = r ? `${r.sku}<small>${r.desc} · ${esc(p.acc(d, g))}</small>` : `<small>Ø11 cross-hole brushes come in #600, #800 and #1000 only.</small>`;
  const card = o.closest('.prod'); const shot = card && card.querySelector('.prod-shot');
  const colour = (p.stone ? STONE_GRITS : GRITS).find(x => x.grit === g);
  if (shot && colour) tintShot(shot, colour.hex);
}
function rerender() { route(true); }

/* ---------- events ---------- */
function copyText(txt, btn, label) {
  const ok = () => { if (btn) { btn.innerHTML = `${I.check} Copied`; setTimeout(() => btn.innerHTML = label, 1800); } };
  const fallback = () => {
    const ta = document.createElement('textarea'); ta.value = txt; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
    let done = false; try { done = document.execCommand('copy'); } catch (e) { } ta.remove();
    if (done) return ok();
    const slot = $('#copySlot'); if (slot) { slot.innerHTML = `<div class="callout note">${I.info}<div><b>Copy didn't run automatically here</b>Select the text below and copy it.<textarea class="mailbox" readonly style="margin-top:8px">${esc(txt)}</textarea></div></div>`; const t2 = $('#copySlot textarea'); t2.focus(); t2.select(); }
  };
  try { navigator.clipboard.writeText(txt).then(ok, fallback); } catch (e) { fallback(); }
}
document.addEventListener('click', e => {
  const link = e.target.closest('a[href^="#"]');
  let navTo = null;
  if (link) { e.preventDefault(); navTo = link.getAttribute('href').replace(/^#\/?/, '').split('?')[0]; }
  const t = e.target.closest('button, a'); if (!t) return;
  const d = t.dataset;
  // units
  if (d.unit) { APP.units = d.unit; store.set('ufg_units', APP.units); document.querySelectorAll('[data-unit]').forEach(b => b.setAttribute('aria-pressed', b.dataset.unit === APP.units)); rerender(); return; }
  // home
  if (t.id === 'askGo' && !($('#askT')?.value || '').trim()) {
    const el = $('#understood');
    if (el) el.innerHTML = `<div class="understood fade-in" role="status"><b>Tell me about the part first.</b> <span class="small">A few words is enough — the material, where the burr is, and the hole sizes if you know them. Or pick a task below.</span></div>`;
    $('#askT')?.focus();
    return;
  }
  if (t.id === 'askGo') { const v = $('#askT').value.trim(); if (!v) { $('#askT').focus(); return; } doAsk(v); return; }
  if (d.ex) { $('#askT').value = EXAMPLES[+d.ex]; doAsk(EXAMPLES[+d.ex], { ai: false }); return; }
  if (d.task && t.classList.contains('tile') && !d.pick) { APP.ws = newState(); APP.ws.task = d.task; if (TASKS[d.task].feature) APP.ws.feature = TASKS[d.task].feature; APP.wizI = 1; go('find'); return; }
  if (d.recent) { const r = store.get('ufg_recent', [])[+d.recent]; if (r) { APP.ws = r.st; go('result'); } return; }
  if (t.id === 'clrRecent') { store.set('ufg_recent', []); rerender(); return; }
  if (d.edit) { APP.editKey = APP.editKey === d.edit ? null : d.edit; renderUnderstood(); return; }
  if (d.set) { APP.ws[d.set] = d.v; if (d.set === 'material') APP.ws.sub = null; if (d.set === 'task') { if (TASKS[d.v].feature) APP.ws.feature = TASKS[d.v].feature; else if (!APP.ws.feature || ['cross', 'bore', 'hole'].includes(APP.ws.feature)) APP.ws.feature = SUGGEST_FEATURE[d.v] || null; } APP.editKey = null; renderUnderstood(); return; }
  if (t.id === 'goRes') { go('result'); return; }
  if (t.id === 'goWiz') { APP.wizI = 0; go('find'); return; }
  // wizard
  if (d.pick) {
    const st = APP.ws; st[d.pick] = d.v;
    if (d.pick === 'task') { st.feature = TASKS[d.v].feature || (['cross', 'bore'].includes(st.feature) ? null : st.feature); st.override = {}; }
    if (d.pick === 'feature' && d.v === 'cross') { st.task = 'crosshole'; }
    if (d.pick === 'feature' && d.v === 'bore') { st.task = 'id_finish'; }
    if (d.pick === 'material') { st.sub = null; if (MATERIALS[d.v].subs) { route(); return; } }
    APP.wizI = Math.min((APP.wizI || 0) + 1, wizSteps(st).length - 1); route(); return;
  }
  if (d.sub) { APP.ws.sub = APP.ws.sub === d.sub ? null : d.sub; document.querySelectorAll('[data-sub]').forEach(b => b.setAttribute('aria-pressed', b.dataset.sub === APP.ws.sub)); return; }
  if (d.burr) { APP.ws.burr = d.burr; document.querySelectorAll('[data-burr]').forEach(b => b.setAttribute('aria-pressed', b.dataset.burr === d.burr)); return; }
  if (d.mach) { saveMachine(); APP.ws.machine.type = d.mach; route(); return; }
  if (d.iface) { APP.ws.machine.iface = d.iface; document.querySelectorAll('[data-iface]').forEach(b => b.setAttribute('aria-pressed', b.dataset.iface === d.iface)); return; }
  if (d.uneven) { APP.ws.machine.uneven = d.uneven === '1'; document.querySelectorAll('[data-uneven]').forEach(b => b.setAttribute('aria-pressed', b.dataset.uneven === d.uneven)); return; }
  if (d.goto) { APP.wizI = wizSteps(APP.ws).indexOf(d.goto); route(); return; }
  if (d.nav) {
    e.preventDefault();
    if (d.save === 'dims') saveDims(); if (d.save === 'machine') saveMachine();
    if (d.nav === 'edit') { APP.wizI = 0; go('find'); return; }
    if (d.nav === 'back') { if ((APP.wizI || 0) === 0) { go(''); return; } if (APP.view === 'find') { APP.wizI--; route(); } return; }
    if (d.nav === 'next') {
      const st = APP.ws, step = wizSteps(st)[APP.wizI || 0];
      if (step === 'dims') saveDims();
      if (step === 'feature' && !st.feature) st.feature = SUGGEST_FEATURE[st.task];
      if (step === 'task' && !st.task) return;
      APP.wizI = Math.min((APP.wizI || 0) + 1, wizSteps(st).length - 1); route(); return;
    }
    if (d.nav === 'result') { APP.ws.override = APP.ws.override || {}; go('result'); return; }
  }
  // result
  if (d.ovgrit) { APP.ws.override = { ...APP.ws.override, grit: +d.ovgrit, family: APP.ws.override.family || APP.rec.family, dia: APP.ws.override.dia || APP.rec.dia }; rerender(); return; }
  if (d.ovdia) { APP.ws.override = { ...APP.ws.override, dia: +d.ovdia, family: APP.ws.override.family || APP.rec.family, grit: APP.ws.override.grit || (APP.rec.family === 'diamond' ? APP.rec.grit.grit : APP.rec.grit.grit) }; rerender(); return; }
  if (t.id === 'goClear') { clearAsk(); return; }
  if (t.id === 'shareOpen') { openShare(); return; }
  if (t.id === 'resetOv') { APP.ws.override = {}; APP.ws.machine.uneven = false; rerender(); return; }
  if (d.alt) { const a = APP.rec.alts[+d.alt]; if (a.ext) return; if (a.setUneven) APP.ws.machine.uneven = true; if (a.ov) APP.ws.override = { ...a.ov }; rerender(); return; }
  if (t.id === 'cbNext' || t.id === 'cbPrev') { clearInterval(APP.cbTimer); APP.cbTimer = null; $('#cbPlay').innerHTML = `${I.play} Play`; APP.cbStep = (APP.cbStep + (t.id === 'cbNext' ? 1 : CB_PLAY.length - 1)) % CB_PLAY.length; cbApply(APP.cbStep); return; }
  if (t.id === 'cbPlay') {
    if (APP.cbTimer) { clearInterval(APP.cbTimer); APP.cbTimer = null; t.innerHTML = `${I.play} Play`; return; }
    t.innerHTML = `${I.pause} Pause`; APP.cbStep = 0; cbApply(0);
    APP.cbTimer = setInterval(() => { APP.cbStep++; if (APP.cbStep > CB_PLAY.length - 1) { clearInterval(APP.cbTimer); APP.cbTimer = null; $('#cbPlay').innerHTML = `${I.play} Replay`; return; } cbApply(APP.cbStep); }, 1700); return;
  }
  if (t.id === 'copyLink') {
    const url = SHARE.link();
    if (!url) return;
    copyText(url, t, `${I.link} Copy link to this setup`);
    return;
  }
  if (t.id === 'copySheet') { copyText(setupText(APP.rec), t, `${I.copy} Copy setup sheet`); return; }
  if (t.id === 'mailEng') { const m = mailParts(APP.rec); $('#mailSlot').innerHTML = mailPanel(m.subject, m.body); $('#mailSlot').scrollIntoView({ block: 'nearest' }); return; }
  if (t.id === 'copyMail') { copyText(APP.mailText, t, `${I.copy} Copy message`); return; }
  if (t.id === 'printSheet') { try { window.print(); } catch (err) { } return; }
  if (t.id === 'toFix') { const R = APP.rec; APP.fixCtx = { sku: R.sku, dia: R.dia, grit: R.grit.grit, rpm: R.params.rpm, rpmHi: R.params.rpmHi, rpmMax: R.params.rpmMax, feed: R.params.feed, doc: R.params.engage.value, engLabel: R.params.engage.label, engUnit: R.params.engage.unit, passes: String(R.params.passes).split('–')[0], family: R.family }; APP.fx = null; go('fix'); return; }
  // fix
  if (d.sym) { APP.fx = { sym: d.sym, ans: null, i: 0, tried: [] }; route(); return; }
  if (d.ans) { APP.fx.ans = d.ans; route(); return; }
  if (d.fx) {
    const fx = APP.fx;
    if (d.fx === 'restart') { APP.fx = null; route(); return; }
    const list = fixList(fx.sym, fx.ans, APP.fixCtx); const f = list[fx.i];
    if (d.fx === 'ok') { fx.tried.push({ t: f.t, change: f.change ? (f.change.from ? f.change.from + ' → ' : '') + f.change.to : '', ok: true }); fx.done = 'solved'; fx.fixedAt = fx.i; route(); return; }
    if (d.fx === 'next') { fx.tried.push({ t: f.t, change: f.change ? (f.change.from ? f.change.from + ' → ' : '') + f.change.to : '' }); fx.i++; route(); return; }
  }
  if (t.id === 'fxMail') { const fx = APP.fx; const S = SYMPTOMS.find(s => s.id === fx.sym); const log = `TROUBLESHOOTING: ${S.t}${fx.ans ? ' — ' + S.q.o.find(o => o[0] === fx.ans)[1] : ''}\nTried:\n${fx.tried.map(x => `- ${x.t}${x.change ? ' (' + x.change + ')' : ''}${x.ok ? ' — FIXED' : ' — no change'}`).join('\n')}`; let m; if (APP.rec && APP.fixCtx) m = mailParts(APP.rec, log); else m = { subject: 'UFIBER troubleshooting: ' + S.t, body: log + '\n\nTool / grit:\nRPM / feed / depth:\nMaterial:\n' }; $('#mailSlot').innerHTML = mailPanel(m.subject, m.body); return; }
  if (t.id === 'clrCtx') { APP.fixCtx = null; route(); return; }
  // AI: clarifying questions + chat
  if (d.oq !== undefined) { answerOffline(+d.oq, d.v); return; }
  if (d.oqn !== undefined) { const v = $('#oqN' + d.oqn)?.value; if (v) answerOffline(+d.oqn, v); return; }
  if (d.asknoga) { $('#mailSlot') ? ($('#mailSlot').innerHTML = mailPanel('UFIBER application question', `Hello NOGA MT team,\n\n${APP.chat.turns.filter(x => x.role === 'user').slice(-1)[0]?.content || ''}\n\n${APP.rec ? setupText(APP.rec) : ''}`)) : null; return; }
  if (d.aiq !== undefined) { const q = APP.smart.questions[+d.aiq]; answerQuestion(+d.aiq, Q_NUM.includes(q?.field) ? d.v : d.v); return; }
  if (d.aiqn !== undefined) { const v = $('#aiqN' + d.aiqn)?.value; if (v) answerQuestion(+d.aiqn, v); return; }
  if (t.id === 'smartStop') { APP.smart.ctl?.abort(); APP.smart.busy = false; renderUnderstood(); return; }
  if (d.ask !== undefined) { askClaude(d.ask); return; }
  if (t.id === 'chatSend') { const v = $('#chatIn').value; if (v.trim()) askClaude(v); return; }
  if (t.id === 'chatStop') { APP.chat.ctl?.abort(); return; }
  if (d.prop) { const [ti, pi] = d.prop.split(':').map(Number); applyProposal(ti, pi); return; }
  // speeds & feeds
  const SFS = APP.sf;
  if (d.more !== undefined) { const mm = $('#moreMenu'); mm.hidden = !mm.hidden; return; }
  if (d.sffam) { SFS.fam = d.sffam; SFS.grit = null; SFS.csize = null; route(true); return; }
  if (d.sfdia) { SFS.dia = +d.sfdia; route(true); return; }
  if (d.sfpd) { SFS.pdia = +d.sfpd; route(true); return; }
  if (d.sfdd) { SFS.ddia = +d.sfdd; route(true); return; }
  if (d.sfang) { SFS.angled = d.sfang === '1'; route(true); return; }
  if (d.sfcs) { SFS.csize = +d.sfcs; route(true); return; }
  if (d.sfiso) { SFS.iso = d.sfiso; SFS.row = SF_ROWS.find(r => r.iso === d.sfiso).id; SFS.grit = null; route(true); return; }
  if (d.sfmode) { SFS.mode = d.sfmode; SFS.grit = null; route(true); return; }
  if (d.sfgrit) { SFS.grit = +d.sfgrit; route(true); return; }
  if (d.sfhand) { SFS.hand = d.sfhand === '1'; route(true); return; }
  if (d.sfworn) { SFS.worn = d.sfworn === '1'; route(true); return; }
  if (t.id === 'sfGritAuto') { SFS.grit = null; route(true); return; }
  if (t.id === 'sfJump') { $('.sf-out').scrollIntoView({ block: 'start', behavior: 'smooth' }); return; }
  if (t.id === 'sfSetup') { APP.ws = sfToState(); go('result'); return; }
  if (t.id === 'sfCopy') { copyText(sfText(), t, `${I.copy} Copy parameters`); return; }
  if (t.id === 'sfMail') { $('#mailSlot').innerHTML = mailPanel('UFIBER speeds & feeds review', `Hello NOGA MT team,\n\nPlease review these starting parameters.\n\n${sfText()}\n\nCompany:\nPart / drawing:\n`); return; }
  if (t.id === 'toSF') { if (sfFromRec(APP.rec, APP.ws)) go('speeds'); return; }
  // attachments
  if (t.id === 'attClear') { APP.doc = null; renderAttach(); return; }
  if (t.id === 'aiGo') { aiRead(); return; }
  if (t.id === 'aiStop') { aiCtl?.abort(); return; }
  if (t.id === 'copyQs') { copyText(APP.doc.ai.questions.map(q => '- ' + q).join('\n'), t, `${I.copy} Copy questions`); return; }
  // replace xebec
  if (d.xex) { const ta = $('#xIn'); ta.value = (ta.value.trim() ? ta.value.trim() + '\n' : '') + d.xex; return; }
  if (t.id === 'xGo') { const v = $('#xIn').value; APP.xr = { text: v, items: xConvertAll(v) }; route(true); if (APP.xr.items.length) $('#xOut').scrollIntoView({ block: 'start' }); return; }
  if (d.xpk) { APP.xpick.kind = d.xpk; APP.xpick.dia = d.xpk === 'surface' ? 25 : d.xpk === 'cross' ? 5 : 5; APP.xpick.color = d.xpk === 'cross' ? 'A12' : 'A21'; APP.xr.pickOpen = true; APP.xr.text = $('#xIn').value; route(true); return; }
  if (d.xpd) { APP.xpick.dia = +d.xpd; APP.xr.pickOpen = true; APP.xr.text = $('#xIn').value; route(true); return; }
  if (d.xpc) { APP.xpick.color = d.xpc; APP.xr.pickOpen = true; APP.xr.text = $('#xIn').value; route(true); return; }
  if (t.id === 'xPickAdd') { const ta = $('#xIn'); const code = xCodeFromPick(APP.xpick); ta.value = (ta.value.trim() ? ta.value.trim() + '\n' : '') + code; APP.xr = { text: ta.value, items: xConvertAll(ta.value), pickOpen: true }; route(true); return; }
  if (t.id === 'xCopy') { copyText(xListText(APP.xr.items), t, `${I.copy} Copy list`); return; }
  if (t.id === 'xMail') { const body = `Hello NOGA MT team,\n\nPlease quote UFIBER replacements for these XEBEC items.\n\n${xListText(APP.xr.items).replace(/\t/g, ' | ')}\n\nQuantities:\nCompany:\n`; $('#mailSlot').innerHTML = mailPanel('UFIBER quote: XEBEC replacement', body); return; }
  if (d.xcheck) { const i = +d.xcheck, o = APP.xr.items[i]; const num = id => { const el = $('#' + id); return el && el.value !== '' ? parseFloat(el.value) : null; };
    const f = num('xpF' + i); o.prog = { rpm: num('xpR' + i), feed: f == null ? null : (isIn() ? f * 25.4 : f), doc: $('#xpD' + i) ? lenIn($('#xpD' + i).value) : null, proj: $('#xpP' + i) ? lenIn($('#xpP' + i).value) : null, mat: $('#xpM' + i)?.value || '' };
    o.check = xCheck(o); o.progOpen = true; APP.xr.text = $('#xIn').value; route(true); return; }
  if (d.xsetup) { const o = APP.xr.items[+d.xsetup]; const m = $('#xpM' + d.xsetup); if (m) { o.prog = o.prog || {}; o.prog.mat = m.value; } APP.ws = xSetupState(o); go('result'); return; }
  // learn
  if (d.gb) { const g = GRITS[+d.gb]; document.querySelectorAll('[data-gb]').forEach(b => b.setAttribute('aria-pressed', b === t)); const uses = { 150: 'Heavy burrs, hardened materials', 200: 'Hardened steel and difficult burrs', 400: 'Steel, stainless and heat-resistant alloys', 600: 'General-purpose metal deburring', 800: 'Fine burr removal and pre-finish', 1000: 'Tool marks and controlled surface finishing', 1200: 'Non-ferrous metals and final finishing', 2000: 'Aluminum, plastics and delicate surfaces', 3000: 'Composites and high-finish work', 6000: 'Final polishing of composites and plastics' }; $('#gbInfo').innerHTML = `<b>#${g.grit} · ${g.color} · code ${g.code}</b> — ${g.action}. ${uses[g.grit]}.`; return; }
  // products
  if (t.id === 'decGo') { const r = decode($('#decIn').value); $('#decOut').innerHTML = r && r.acc ? `<div class="callout note">${I.info}<div><b>${esc(r.name)}</b><span class="small">${esc(r.desc)}${r.note ? ' · ' + esc(r.note) : ''}</span></div></div>` : r ? `<div class="callout note">${I.info}<div><b>${esc(r.fam)}, Ø${r.dia} mm</b><span class="gdot" style="background:${r.grit.hex};margin-left:4px"></span>#${r.grit.grit} ${esc(r.grit.color.toLowerCase())}${r.grit.action ? ' — ' + esc(r.grit.action.toLowerCase()) : ''}</div></div>` : `<div class="callout warn">${I.warn}<div><b>Not a recognised UFIBER code</b>Try a short SKU like UF1625 or a description like UF-FB-W-D025-L75.</div></div>`; return; }
  if (navTo !== null) go(navTo);
});
document.addEventListener('mousedown', () => document.body.classList.remove('kb'));
document.addEventListener('click', e => { const tr = e.target.closest('tr[data-sfrow]'); if (tr) { APP.sf.row = +tr.dataset.sfrow; APP.sf.grit = null; route(true); } });
document.addEventListener('change', e => {
  const t = e.target;
  if (t.id === 'sfRowSel') { APP.sf.row = +t.value; APP.sf.grit = null; route(true); return; }
  if (t.id === 'askFile') { if (t.files?.length) addFiles(t.files); t.value = ''; return; }
  if (t.dataset.pb) { updBuilder(+t.dataset.pb); return; }
});
let sfT; document.addEventListener('input', e => { const id = e.target.id; if (id === 'sfBore' || id === 'sfMax') { clearTimeout(sfT); sfT = setTimeout(() => { if (id === 'sfBore') { APP.sf.bore = lenIn(e.target.value) || 0; APP.sf.csize = null; } else APP.sf.maxRpm = parseFloat(e.target.value) || null; const pos = e.target.selectionStart; route(true); const el = $('#' + id); if (el) { el.focus(); try { el.setSelectionRange(pos, pos); } catch (x) { } } }, 350); } });
document.addEventListener('keydown', e => { if (e.key === 'Tab') document.body.classList.add('kb'); if (e.target.id === 'chatIn' && e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); const v = e.target.value; if (v.trim()) askClaude(v); return; }
  if (e.target.id && e.target.id.startsWith('aiqN') && e.key === 'Enter') { e.preventDefault(); answerQuestion(+e.target.id.slice(4), e.target.value); return; } const tr = e.target.closest && e.target.closest('tr[data-sfrow]'); if (tr && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); APP.sf.row = +tr.dataset.sfrow; APP.sf.grit = null; route(true); return; } if (e.target.id === 'askT' && e.key === 'Enter' && (e.metaKey || e.ctrlKey)) $('#askGo').click(); if (e.target.id === 'decIn' && e.key === 'Enter') $('#decGo').click(); });
const onUrl = () => { const v = viewFromHash(); if (v !== APP.view) { APP.view = v; route(); } };
window.addEventListener('hashchange', onUrl); window.addEventListener('popstate', onUrl);
document.addEventListener('DOMContentLoaded', () => { document.querySelectorAll('[data-unit]').forEach(b => b.setAttribute('aria-pressed', b.dataset.unit === APP.units)); route(); });

