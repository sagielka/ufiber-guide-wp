/* ============================================================
   UFIBER Guide — offline answers

   Each intent the model recognises maps to a composer that builds its
   answer out of the current recommendation and the NOGA tables. No number
   is ever written by the model itself. Anything the model is unsure about
   gets an honest "ask a NOGA engineer" instead of a guess.
   ============================================================ */
const A = {
  n: (v) => fmtN(v),
  feed: (v) => v == null ? null : `${feedOut(v)} ${feedU()}`,
  len: (v) => v == null ? null : `${lenOut(v)} ${lenU()}`,
  rec: () => APP.rec,
  st: () => APP.ws,
  row: () => APP.rec?.sfRow ? sfRow(APP.rec.sfRow) : (APP.ws ? sfRowOf(APP.ws) : null),
  fam: () => APP.rec?.family,
  isCross: () => ['crosshole', 'shank'].includes(APP.rec?.family),
  mode: () => TASKS[APP.ws?.task]?.mode === 'polish' ? 'polish' : 'deburr',
};
const NOGA_ASK = 'Ask a NOGA engineer';

function variantAnswer(changes, label) {
  try {
    const R2 = recommend(variantState(changes));
    return { R2, line: `${R2.sku} (${diaOut(R2.dia)} #${R2.grit.grit}) at ${fmtN(R2.params.rpm)} RPM${R2.params.feed ? `, ${A.feed(R2.params.feed)}` : ''}`, label };
  } catch (e) { return null; }
}

/* ---------- per-intent composers: return {md, props, ask} ---------- */
const ANSWERS = {
  burr_remains: () => {
    const R = A.rec(), p = R.params;
    const coarser = gritStep(R.grit.grit, -1);
    const props = [];
    if (coarser !== R.grit.grit) props.push({ label: `Switch to #${coarser}`, changes: { grit: coarser } });
    const hi = Math.min(p.rpmHi, p.rpmMax);
    return {
      md: `Change one thing at a time and re-cut a test part.\n` +
        `- **Raise the speed** toward ${A.n(hi)} RPM (you are at ${A.n(p.rpm)}).\n` +
        (p.feed ? `- **Slow the feed** by about 10%, to roughly ${A.feed(Math.round(p.feed * 0.9))}.\n` : '') +
        `- **Add one pass** (now ${p.passes}).\n` +
        (A.isCross() ? `- In a bore the order matters: take the **speed to its maximum first**, in steps of about 1,000 RPM, then **add passes**. Slowing the feed helps less here than on a face.\n` +
          `- The stroke must clear the intersection by 5 mm on **both** sides, CW then CCW: the pull-back keeps burrs off the bore wall, the push-forward takes the ones pointing the other way.\n`
          : `- **Go slightly deeper**, up to the table maximum${p.engage?.max ? ` of ${A.len(p.engage.max)}` : ''}.\n`) +
        `- If it still will not cut, step one grit coarser to **#${coarser}**.\n\n` +
        `If the burr is thick or you cannot bend it with a fingernail, no brush will remove it. Cut it first with a chamfer pass or NOGA UBURR.`,
      props,
    };
  },
  too_aggressive: () => {
    const R = A.rec(), p = R.params;
    const finer = gritStep(R.grit.grit, 1);
    return {
      md: `Back the process off one step at a time.\n` +
        `- **Lower the speed** by about 10%, to roughly ${A.n(Math.round(p.rpm * 0.9))} RPM.\n` +
        (p.feed ? `- **Feed faster**, about ${A.feed(Math.round(p.feed * 1.1))} — less time in contact means less rounding.\n` : '') +
        (p.engage && typeof p.engage.value === 'number' ? `- **Lighter engagement**: ${A.len(p.engage.value)} is the current value; the table low end is the safest start.\n` : '') +
        `- **Fewer passes** (now ${p.passes}).\n` +
        `- Go one grit finer to **#${finer}**.\n\n` +
        `Brushing always leaves some edge radius. If the drawing allows almost none, say so and NOGA can advise on a cutter instead.`,
      props: finer !== R.grit.grit ? [{ label: `Switch to #${finer}`, changes: { grit: finer } }] : [],
    };
  },
  wear_fast: () => {
    const R = A.rec(), p = R.params;
    return {
      md: `Short brush life almost always comes from too much contact, not too little.\n` +
        `- Stay at or below the table ${p.engage?.label?.toLowerCase() || 'engagement'}${p.engage && typeof p.engage.value === 'number' ? ` (${A.len(p.engage.value)})` : ''}.\n` +
        (p.feed ? `- Use the **fastest feed** that still removes the burr — ${A.feed(p.feed)} is your starting value.\n` : '') +
        `- Do not exceed ${A.n(p.rpmMax)} RPM for this tool.\n` +
        `- Never side-load the brush or rub it along a wall.\n` +
        (A.isCross() ? `- In a bore, trade speed for life: drop the RPM about 10%, or raise the feed about 10%, as long as the burr still comes off.\n` : '') +
        (p.projection ? `- Keep the projection short: ${p.projection}.\n` : '') +
        `- Wet machining improves both finish and life where your machine allows it.\n` +
        `- A floating damper keeps contact constant on uneven parts and stops the brush digging in.`,
      props: [{ label: 'Add a floating damper', changes: { uneven_or_long_run: true } }],
    };
  },
  fiber_break: () => ({
    md: `Fibre breakage points at mechanical overload rather than wear.\n` +
      `- Check that the brush is **not side-loaded**: it must contact with the tips, not the side.\n` +
      `- Reduce engagement and make sure it is not dropping into a pocket or hitting a protruding feature.\n` +
      `- Check runout and that the shank is gripped at least 20 mm.\n` +
      `- Finer grits (#1200 and above) are more prone to breakage than coarse ones.\n` +
      `- Insert and remove cross-hole brushes **only while stopped**.`,
    props: [],
  }),
  marks_left: () => {
    const R = A.rec(), finer = gritStep(R.grit.grit, 1);
    return {
      md: `Marks usually mean the grit is too coarse for the finish you want, or the brush is dwelling.\n` +
        `- Step to **#${finer}** for the final pass; you can keep #${R.grit.grit} for the first.\n` +
        `- Keep the tool moving — never pause in one spot. A dwell mark is different from a coarse finish.\n` +
        `- For a finer finish NOGA goes the other way to deburring: **lower feed, lighter engagement, higher speed**. Its polishing feed is below the deburring feed in all 41 material rows.\n` +
        `- Wet machining gives a visibly better finish than dry.`,
      props: finer !== R.grit.grit ? [{ label: `Finish with #${finer}`, changes: { grit: finer } }] : [],
    };
  },
  ra_not_met: () => {
    const row = A.row(), R = A.rec();
    const seq = row ? row.gP : null;
    return {
      md: `To reach a tighter Ra:\n` +
        (seq ? `- NOGA's polishing sequence for ${sfLabel(row).toLowerCase()} is ${seq.map(g => '#' + g).join(' → ')}. Work through it rather than jumping straight to the finest.\n` : '') +
        `- Use the low end of the feed and the lightest engagement.\n` +
        `- Two or three light passes beat one heavy one.\n` +
        `- Run wet if you can.\n\n` +
        `Ceramic fibre improves Ra but does not produce a mirror. If the print needs a mirror finish, that is a different process.`,
      props: seq && seq[seq.length - 1] !== R.grit.grit ? [{ label: `Finish with #${seq[seq.length - 1]}`, changes: { grit: seq[seq.length - 1] } }] : [],
    };
  },
  spindle_limit: (slots) => {
    const rpm = slots.rpm;
    const R = A.rec();
    if (!rpm) return { md: `Tell me the maximum spindle speed and I will re-run the numbers. The current setup starts at ${A.n(R.params.rpm)} RPM.`, props: [] };
    const v = variantAnswer({ max_rpm: rpm });
    if (!v) return { md: `I could not re-run that. Try entering ${A.n(rpm)} RPM in the machine step.`, props: [] };
    const low = rpm < R.params.rpmLo;
    return {
      md: `At ${A.n(rpm)} RPM the engine gives **${v.line}**.\n\n` +
        (low ? `That is below NOGA's window for this brush, so it will cut more slowly. Options: use a **larger diameter** (the rim speed rises with size), add a pass, or step one grit coarser.`
          : `That is inside the working window, so the setup stands.`),
      props: [{ label: `Use ${A.n(rpm)} RPM`, changes: { max_rpm: rpm } }],
    };
  },
  coolant_q: () => {
    const R = A.rec();
    return { md: `NOGA's coolant recommendation for this material is **${R.params.coolant}**.\n\n` +
      `Wet machining improves surface finish and tool life. Air with extraction is acceptable where the table allows it; dust from ceramic fibre should always be extracted. Floating dampers must **not** be used with through-spindle coolant.`, props: [] };
  },
  grit_which: (slots) => {
    const row = A.row(), R = A.rec();
    if (!row) return { md: `Pick the task and material first and I will give you NOGA's grit.`, props: [] };
    const deb = row.gD, pol = row.gP;
    return {
      md: `For ${sfLabel(row).toLowerCase()}, NOGA's table gives:\n` +
        `- **Deburring:** ${deb.list.map(g => '#' + g).join(' / ')}${deb.fine ? ` · #${deb.fine} for fine burrs` : ''}${deb.note ? ` — ${deb.note}` : ''}\n` +
        `- **Polishing:** ${pol.map(g => '#' + g).join(' → ')}\n\n` +
        `Your current setup uses **#${R.grit.grit} ${R.grit.color.toLowerCase()}**. Coarser cuts faster and leaves a bigger edge radius; finer is gentler and lasts differently.`,
      props: [],
    };
  },
  grit_compare: (slots) => {
    const gs = (slots.grits || []).filter(g => GRITS.some(x => x.grit === g));
    if (gs.length < 2) return ANSWERS.grit_which(slots);
    const a = variantAnswer({ grit: gs[0] }), b = variantAnswer({ grit: gs[1] });
    if (!a || !b) return ANSWERS.grit_which(slots);
    return {
      md: `Run through the engine:\n` +
        `- **#${gs[0]}** → ${a.line}\n` +
        `- **#${gs[1]}** → ${b.line}\n\n` +
        `The coarser of the two cuts harder and leaves a larger edge break; the finer one is more flexible, expands a little more and leaves a better finish.`,
      props: [{ label: `Use #${gs[0]}`, changes: { grit: gs[0] } }, { label: `Use #${gs[1]}`, changes: { grit: gs[1] } }],
    };
  },
  size_which: () => {
    const R = A.rec();
    const alts = (R.family === 'surface' ? [6, 15, 25, 40, 60, 100] : R.family === 'point' ? [1, 1.5, 2, 2.5, 3] : []).filter(d => d !== R.dia);
    return {
      md: `You are on ${diaOut(R.dia)}. ` +
        (R.family === 'crosshole' ? `Cross-hole brush size follows the bore: the largest brush whose range covers your bore is the recommendation, and smaller ones also work with more passes.`
          : R.family === 'surface' ? `A larger brush covers more surface per pass and reaches a higher rim speed at a given RPM, but needs more clearance and a slower spindle. A smaller one reaches into tighter areas.`
            : `This family comes in one working size for your feature.`),
      props: alts.slice(0, 3).map(d => ({ label: `Try ${diaOut(d)}`, changes: { diameter_mm: d } })),
    };
  },
  holder_which: () => {
    const R = A.rec();
    return { md: `For **${R.sku}** you need:\n` + R.holders.map(h => `- **${h.role}:** ${h.sku !== '—' ? h.sku + ' — ' : ''}${h.desc}`).join('\n'), props: [] };
  },
  projection_q: () => {
    const R = A.rec();
    return { md: R.params.projection ? `Projection: **${R.params.projection}**. A shorter projection is stiffer, cuts better and lasts longer; a longer one is more forgiving on uneven surfaces but wears faster.`
      : `This tool has no sleeve projection to set. Grip the shank at least 20 mm and keep runout low.`, props: [] };
  },
  doc_q: () => {
    const R = A.rec(), e = R.params.engage;
    return { md: `${e.label}: **${typeof e.value === 'number' ? A.len(e.value) : e.value}**${e.note ? `\n\n${e.note}` : ''}` +
      (R.params.feedRange ? `\n\nStart at the low end and only increase if burrs remain.` : ''), props: [] };
  },
  feed_q: () => {
    const R = A.rec(), p = R.params;
    return { md: p.feed ? `Feed: **${A.feed(p.feed)}**${p.feedRange ? ` (NOGA's table range ${A.feed(p.feedRange[0])}–${feedOut(p.feedRange[1])})` : ''}${p.feedMax ? `. Catalogue maximum ${A.feed(p.feedMax)}.` : '.'}`
      : `This setup has no programmed feed — it is hand-fed. Keep the tool moving and never dwell.`, props: [] };
  },
  rpm_q: () => {
    const R = A.rec(), p = R.params;
    return { md: `Spindle speed: **${A.n(p.rpm)} RPM**, working range ${A.n(p.rpmLo)}–${A.n(p.rpmHi)}, absolute maximum ${A.n(p.rpmMax)}.` +
      (p.vc ? `\n\nThat is about ${p.vc} m/min at the brush rim.` : ''), props: [] };
  },
  passes_q: () => {
    const R = A.rec();
    return { md: `Passes: **${R.params.passes}**${A.isCross() ? `, running clockwise then counter-clockwise with a full stop between.` : '.'}\n\nAdd a pass before you add depth — it is gentler on the brush and on the edge.`, props: [] };
  },
  direction_q: () => {
    const R = A.rec();
    return { md: `Direction: **${R.params.direction}**.` + (A.isCross() ? `\n\nBoth rotation directions matter in a cross hole: a burr bent over by one direction is removed by the other.` : `\n\nAgainst the burr (up-cut) lifts side burrs instead of folding them over.`), props: [] };
  },
  stroke_q: () => (A.isCross()
    ? { md: `Stroke: pass **5 mm beyond the intersection on both sides**, with the brush already turning inside the bore. Insert and withdraw only while stopped. Adjust the number of passes, not the stroke length.`, props: [] }
    : { md: `Stroke applies to cross-hole work. For this setup the controlling value is ${A.rec().params.engage.label.toLowerCase()}: ${typeof A.rec().params.engage.value === 'number' ? A.len(A.rec().params.engage.value) : A.rec().params.engage.value}.`, props: [] }),
  life_q: () => ({
    md: `NOGA does not publish a tool-life figure — it depends on material, engagement, speed and whether you run wet.\n\n` +
      `What is in your hands: stay at or under the table engagement, use the fastest feed that still works, avoid side loading, and consider a floating damper for long runs. The case studies in this app list the parts-per-tool their users reached.\n\n` +
      `For a figure you can quote, ask NOGA with your part and volume.`,
    ask: true, props: [],
  }),
  time_q: () => ({ md: `Cycle time depends on your path length, feed and passes — the engine gives feed and passes, so your CAM will give the time.\n\nFor this setup: ${A.rec().params.feed ? A.feed(A.rec().params.feed) : 'hand-fed'}, ${A.rec().params.passes} passes.\n\nNOGA's published cases report figures such as 180 s of manual deburring replaced by an 18 s in-cycle operation.`, props: [] }),
  cost_q: () => ({ md: `I do not have prices — they vary by country and distributor.`, ask: true, props: [] }),
  buy_q: () => ({ md: `UFIBER tools are sold through NOGA MT and its distributors.`, ask: true, props: [] }),
  air_tool_q: () => ({
    md: A.fam() === 'diamond'
      ? `Ceramic Diamond Stones **are** suitable for pneumatic tools, as long as the speed is controlled and stays under 60,000 RPM, with about 1 N of contact force.`
      : `No. NOGA does not recommend pneumatic tools for UFIBER end, point or disc tools because the speed is not controlled. Use an electric handpiece such as the **UF9999 E-Pack** (30,000 RPM, forward/reverse), or run it in the machine.`,
    props: [{ label: 'Switch to hand-held', changes: { machine_type: 'hand' } }],
  }),
  robot_q: () => ({
    md: `Yes — UFIBER is used in robotic finishing. On a robot the path accuracy is lower than a CNC, so NOGA recommends a **floating damper** to keep contact constant: End-type for straight shanks (4 mm float, about 20 N, 12,000 RPM max).\n\nApproach vertically or with an arc entry and exit, preload the spring before feeding, and keep side loads off the brush.`,
    props: [{ label: 'Set up for a robot', changes: { machine_type: 'robot' } }],
  }),
  damper_q: () => ({
    md: `A floating damper holds the brush on a spring so contact pressure stays constant as the surface varies and the brush wears.\n\n` +
      `- **BT30 / BT40:** 5 mm float, about 50 N, **6,000 RPM maximum**, ER25UM (BT30) or ER32UM (BT40) collet.\n` +
      `- **End type:** 4 mm float, about 20 N, 12,000 RPM maximum.\n` +
      `- Preload before feeding, no through-spindle coolant, never drop into pockets.\n\n` +
      `Worth it for robots, cast or uneven surfaces, and long unattended runs.`,
    props: [{ label: 'Add a floating damper', changes: { uneven_or_long_run: true } }],
  }),
  epack_q: () => ({
    md: `Yes, for the small families. The **UF9999 Portable E-Pack** is a battery power pack with a handpiece: 30,000 RPM, 3.0 Ncm, forward/reverse, 10 h working time.\n\n` +
      `It takes **End and Point brushes, ceramic fibre discs and diamond stones** — not surface or cross-hole brushes, which need controlled depth and speed in a machine. Hand-held brushing runs 1,000–3,000 RPM.`,
    props: [{ label: 'Switch to hand-held', changes: { machine_type: 'hand' } }],
  }),
  xebec_q: () => ({ md: `The **Replace XEBEC** tab converts XEBEC codes to UFIBER items and checks your existing program against the UFIBER limits. Paste your codes there.`, props: [], go: 'replace' }),
  material_change: (slots) => {
    if (!slots.material) return { md: `Which material should I try? I can re-run the same job on any material in NOGA's table.`, props: [] };
    const v = variantAnswer({ material: slots.material });
    if (!v) return { md: `I could not re-run that one.`, props: [] };
    return { md: `Same job in **${MATERIALS[slots.material].name}** → ${v.line}.`, props: [{ label: `Switch to ${MATERIALS[slots.material].name}`, changes: { material: slots.material } }] };
  },
  dim_change: (slots) => {
    const d = slots.main;
    if (!d) return { md: `Give me the new size and I will re-run it.`, props: [] };
    const v = variantAnswer({ main_bore_mm: d });
    if (!v) return { md: `I could not re-run that size.`, props: [] };
    return { md: `With a ${lenOut(d)} ${lenU()} bore → ${v.line}.`, props: [{ label: `Use ${lenOut(d)} ${lenU()} bore`, changes: { main_bore_mm: d } }] };
  },
  thread_safe: () => ({
    md: `Ceramic fibre removes the burr without cutting into the thread profile the way a rigid tool can — NOGA's 17-4 PH case study was specifically about deburring a cross hole through an M3 thread, and reported zero thread damage.\n\n` +
      `Keep to the table engagement, do not dwell at the thread, and run a test part before production.`,
    props: [],
  }),
  edge_radius: () => ({
    md: `Brushing always leaves a small, even edge radius — that is what makes it repeatable, but it means you cannot keep a perfectly sharp corner.\n\n` +
      `The radius grows with coarser grit, higher engagement, slower feed and more passes. To keep it small: finer grit, light engagement, faster feed, fewer passes.\n\n` +
      `For a specified edge break with a tolerance, run a test part and measure — NOGA does not publish a radius per setting.`,
    ask: true, props: [],
  }),
  mirror_q: () => ({ md: `No. Ceramic fibre improves Ra and removes tool marks but it does not produce a mirror finish. NOGA's own cases report results like Ra 0.135 µm, which is a good machined finish, not a polish.\n\nIf you need a mirror, that is a separate lapping or polishing process.`, props: [] }),
  thick_burr: () => ({
    md: `If the burr is thick — over about 0.2 mm at the root, or you cannot bend it with a fingernail — a brush is the wrong first tool. It will wear quickly and may not remove it at all.\n\n` +
      `Cut the bulk off first with a chamfer pass or a NOGA UBURR hole-deburring tool, then use the brush to finish the edge.`,
    props: [{ label: 'Treat as a heavy burr', changes: { burr: 'heavy' } }],
  }),
  hard_material: (slots) => {
    const hrc = slots.hrc;
    if (hrc && hrc > 55) {
      const v = variantAnswer({ material: 'hardened', material_sub: 'gt55' });
      return { md: `Above 55 HRC → ${v ? v.line : 'use the hardened-steel row'}. For tungsten carbide, ceramics, glass or EDM surfaces, ceramic fibre alone is not enough and NOGA uses **Ceramic Diamond Stones** (Ø1–3 mm, up to 60,000 RPM, about 1 N contact force).`,
        props: [{ label: 'Above 55 HRC', changes: { material: 'hardened', material_sub: 'gt55' } }, { label: 'Use a diamond stone', changes: { family: 'diamond' } }] };
    }
    return { md: `Hardened steel up to about 55 HRC works with ceramic fibre at a coarser grit. Carbide, ceramics, glass and EDM recast need **Ceramic Diamond Stones** instead.`,
      props: [{ label: 'Use a diamond stone', changes: { family: 'diamond' } }] };
  },
  safety_q: () => ({
    md: `- Wear eye protection; fibre and particles can eject.\n` +
      `- Use extraction — processing dust may be harmful.\n` +
      `- Do a short test run and stop on vibration or runout.\n` +
      `- Never exceed the tool's maximum speed (${A.n(A.rec().params.rpmMax)} RPM here).\n` +
      `- Check the collet and shank are tight; grip the shank at least 20 mm.\n` +
      `- Insert and remove cross-hole brushes only while stopped.`,
    props: [],
  }),
  why_this: () => {
    const R = A.rec();
    return { md: R.why.map(w => `**${w.t}** — ${w.d}`).join('\n\n'), props: [] };
  },
  alternative_q: () => {
    const R = A.rec();
    if (!R.alts?.length) return { md: `No standard alternative for this one. A NOGA engineer can look at the part.`, ask: true, props: [] };
    return { md: R.alts.map(a => `**${a.label}** — ${a.note}`).join('\n\n'),
      props: R.alts.filter(a => a.ov).slice(0, 3).map(a => ({ label: a.label, changes: { family: a.ov.family, grit: a.ov.grit, diameter_mm: a.ov.dia } })) };
  },
  case_q: () => {
    const m = APP.matches || [];
    if (!m.length) return { md: `No close match in the reference applications for this setup. That is normal for a new application — NOGA can review the part.`, ask: true, props: [] };
    return { md: `Closest reference applications:\n` + m.map(c => `- **${c.part}** · ${c.mat} · ${c.tool.split(',')[0]}${c.rpm ? ` · ${fmtN(c.rpm)} RPM` : ''}${c.feed && c.feed > 1 ? ` · ${feedOut(c.feed)} ${feedU()}` : ''}${c.after ? `\n  ${c.after}` : ''}`).join('\n'), props: [] };
  },
  operator_note: () => {
    const R = A.rec(), st = A.st(), p = R.params;
    return { md: `**UFIBER setup — ${MATERIALS[st.material]?.name || ''} ${TASKS[st.task]?.short || ''}**\n` +
      `- Tool: ${R.sku} (${R.desc})\n` +
      R.holders.map(h => `- ${h.role}: ${h.sku !== '—' ? h.sku + ' ' : ''}${h.desc}`).join('\n') + '\n' +
      `- Speed: ${A.n(p.rpm)} RPM (never above ${A.n(p.rpmMax)})\n` +
      (p.feed ? `- Feed: ${A.feed(p.feed)}\n` : '') +
      `- ${p.engage.label}: ${typeof p.engage.value === 'number' ? A.len(p.engage.value) : p.engage.value}\n` +
      `- Passes: ${p.passes} · Direction: ${p.direction}\n` +
      `- Coolant: ${p.coolant}\n` +
      `- Run a test part first. Change one setting at a time.\n\n` +
      `Use **Copy setup sheet** on the result for the full version with the step-by-step.`, props: [] };
  },
  program_q: () => ({
    md: `I cannot write a post-processed program — the code depends on your control and path. What goes into it:\n\n` +
      `- S${A.rec().params.rpm}${A.rec().params.feed ? ` F${A.rec().params.feed}` : ''}\n` +
      `- ${A.rec().params.passes} passes, ${A.rec().params.direction.toLowerCase()}\n` +
      `- ${A.rec().params.engage.label}: ${typeof A.rec().params.engage.value === 'number' ? A.len(A.rec().params.engage.value) : A.rec().params.engage.value}\n` +
      (A.isCross() ? `- Start rotation inside the bore, stroke 5 mm past both sides, stop before withdrawing.\n` : '') +
      `\nThe step-by-step on the result page is written in the order you would program it.`,
    props: [],
  }),
  units_q: () => ({ md: `Use the **mm / inch** switch at the top right — every value in the app converts, including this chat.`, props: [] }),
  vibration_q: () => ({
    md: `Chatter with a brush is nearly always setup, not speed:\n` +
      `- Check runout and that the shank is gripped at least 20 mm.\n` +
      `- Shorten the projection${A.rec().params.projection ? ` (now ${A.rec().params.projection})` : ''}.\n` +
      `- Reduce engagement, and make sure the brush is not catching a protruding feature.\n` +
      `- Lower the speed 10% to ${A.n(Math.round(A.rec().params.rpm * 0.9))} RPM and see if it settles.\n` +
      `- Stop immediately if it does not — fibres can break.`,
    props: [],
  }),
  greeting: () => ({ md: `Hello. Ask me anything about this setup — speeds, feeds, grit, holders, what to change when it is not working.`, props: [] }),
  thanks: () => ({ md: `You are welcome. Run a test part before production, and change one setting at a time.`, props: [] }),
  out_of_scope: () => ({ md: `That is outside what I can help with. I only know UFIBER tooling, speeds and feeds, and this setup.`, props: [] }),
};

/* ---------- entry point used by the chat ---------- */
function offlineAnswer(question) {
  const p = NLU.predict(question);
  if (!p) return { md: `The offline model did not load, so I cannot answer here.`, ask: true, props: [] };
  const slots = { grits: [], material: p.material };
  for (const n of p.nums) {
    if (n.role === 'grit') slots.grits.push(n.value);
    else if (n.role === 'rpm') slots.rpm = n.value;
    else if (n.role === 'main') slots.main = n.value;
    else if (n.role === 'hrc') slots.hrc = n.value;
  }
  // numbers that look like grits even when the model called them something else
  if (!slots.grits.length) {
    const g = p.nums.filter(n => GRITS.some(x => x.grit === n.value)).map(n => n.value);
    if (g.length >= 2) slots.grits = g;
  }
  const intent = p.intent;
  const conf = p.conf.intent;
  if (!intent || intent === 'describe' || !ANSWERS[intent] || conf < NLU.TH.intent) {
    return {
      md: `I am not sure what you are asking. I can answer questions about **this setup**: speeds, feeds, grit, size, holders, coolant, passes, what to change when the burr stays or the brush wears, robots, dampers, the E-Pack, XEBEC replacement and safety.\n\nFor anything else, a NOGA engineer is the right next step.`,
      ask: true, props: [], unsure: true, conf,
    };
  }
  if (!APP.rec && !['greeting', 'thanks', 'out_of_scope', 'cost_q', 'buy_q', 'xebec_q', 'air_tool_q', 'epack_q', 'damper_q', 'safety_q'].includes(intent)) {
    return { md: `Work out a setup first (Find a tool), then I can answer that against real numbers.`, props: [] };
  }
  let out;
  try { out = ANSWERS[intent](slots); } catch (e) { out = { md: `Something went wrong building that answer.`, ask: true, props: [] }; }
  out.intent = intent; out.conf = conf;
  return out;
}
