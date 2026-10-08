/* ============================================================
   UFIBER speeds & feeds engine
   Data transcribed from noga.com UFIBER Technical Center
   (Surface / Cross-Hole / Point / End brush pages, Oct 2026) and
   the NOGA UFIBER Cross-Hole RPM Advisor (grit multipliers, base
   RPM per brush size, +10% worn-brush rule, surface-brush method).
   Brush sizing for cross-hole uses the catalogue / website pilot
   ranges (coarse #150–#1000 and fine #1200–#6000).
   Coolant: AW Air/Wet · WP Wet preferred · WR Wet recommended ·
   AP Air preferred · WM Wet/MQL · DA Dry air + extraction
   Columns per row:
   id|ISO|group|details|condition|grade|
   SURFACE vcD;feedD;docD;vcP;feedP;docP;cool|
   CROSS feedD;passD;feedP;passP;cool|
   POINT rpmD;feedD;engD;rpmP;feedP;engP;cool|
   END rpmD;feedD;engD;rpmP;feedP;engP;cool|gritD|gritP
   ============================================================ */
const SF_RAW = `
1|P|Non-alloy & cast steel, free-cutting|<0.25% C|Annealed|1020 / 1.0044|170-315;1200-2000;.3-.5;165-310;700-1400;.1-.2;AW|300-380;2-3;350-450;3-4;AW|8000-12000;250-500;.03-.1;8000-12000;180-400;.02-.06;AW|10800-12000;1200-2000;.3-.5;10500-12000;700-1400;.1-.2;AW|G1|Q1
2|P|Non-alloy & cast steel, free-cutting|≥0.25% C|Annealed|1035 / 1.0501|115-315;1200-2000;.3-.5;165-300;700-1400;.1-.2;AW|300-380;2-3;350-450;3-4;AW|8000-12000;250-500;.03-.1;8000-12000;180-400;.02-.06;AW|7300-12000;1200-2000;.3-.5;10500-12000;700-1400;.1-.2;AW|G1|Q1
3|P|Non-alloy & cast steel, free-cutting|<0.55% C|Quenched & tempered|1045 / 1.1201|100-270;1000-1700;.25-.45;140-260;600-1100;.08-.18;WP|250-320;2-4;300-380;3-5;WP|7000-10000;200-450;.03-.09;7000-10000;150-350;.02-.05;AW|6400-12000;1000-1700;.25-.45;8900-12000;600-1100;.08-.18;AW|G2|Q2
4|P|Non-alloy & cast steel, free-cutting|≥0.55% C|Annealed|1055 / 1.0535|95-270;1000-1700;.25-.45;150-280;600-1100;.08-.18;AW|300-380;2-3;350-450;3-4;AW|7000-10000;200-450;.03-.09;7000-10000;150-350;.02-.05;AW|6000-12000;1000-1700;.25-.45;9500-12000;600-1100;.08-.18;AW|G2|Q2
5|P|Non-alloy & cast steel, free-cutting|≥0.55% C|Quenched & tempered|1060 / 1.1221|80-230;1000-1700;.25-.45;120-230;600-1100;.08-.18;WP|250-320;2-4;300-380;3-5;WP|6000-9000;180-400;.03-.08;6000-9000;120-300;.02-.05;AW|5100-12000;1000-1700;.25-.45;7600-12000;600-1100;.08-.18;AW|G2|Q2
6|P|Low-alloy & cast steel (<5% alloy)|—|Annealed|G92600 / 1.5028|95-235;1000-1800;.25-.5;165-250;600-1200;.08-.2;AW|300-380;2-3;350-450;3-4;AW|7000-10000;200-450;.03-.09;7000-10000;150-350;.02-.06;AW|6000-12000;1000-1800;.25-.5;10500-12000;600-1200;.08-.2;AW|G3|Q1
7|P|Low-alloy & cast steel (<5% alloy)|—|Quenched & tempered|4130 / 1.7218|80-200;1000-1800;.25-.5;130-220;600-1200;.08-.2;WP|250-320;2-4;300-380;3-5;WP|6000-9000;180-400;.03-.08;6000-9000;120-300;.02-.05;AW|5100-12000;1000-1800;.25-.5;8300-12000;600-1200;.08-.2;AW|G2|Q2
8|P|Low-alloy & cast steel (<5% alloy)|—|Quenched & tempered|4142 / 1.2332|80-200;1000-1800;.25-.5;130-220;600-1200;.08-.2;WP|300-380;2-3;350-450;3-4;AW|6000-9000;180-400;.03-.08;6000-9000;120-300;.02-.05;AW|5100-12000;1000-1800;.25-.5;8300-12000;600-1200;.08-.2;AW|G2|Q2
9|P|Low-alloy & cast steel (<5% alloy)|—|Quenched & tempered|5045 / 1.7006|80-200;1000-1800;.25-.5;130-220;600-1200;.08-.2;WP|300-380;2-3;350-450;3-4;AW|6000-9000;180-400;.03-.08;6000-9000;120-300;.02-.05;AW|5100-12000;1000-1800;.25-.5;8300-12000;600-1200;.08-.2;AW|G2|Q2
10|P|High-alloy, cast & tool steel|—|Annealed|H13 / 1.2344|60-150;700-1400;.2-.4;350-400;400-800;.05-.2;WP|250-320;2-4;300-380;3-5;WP|5000-8000;150-350;.03-.07;5000-8000;120-280;.02-.05;WP|3800-9500;700-1400;.2-.4;12000-12000;400-800;.05-.2;WP|G2|Q2
11|P|High-alloy, cast & tool steel|—|Quenched & tempered|M33 / 1.3249|50-120;700-1400;.2-.4;250-350;400-800;.05-.2;WP|250-320;2-4;300-380;3-5;WP|5000-8000;150-350;.03-.07;5000-8000;120-280;.02-.05;WP|3200-7600;700-1400;.2-.4;12000-12000;400-800;.05-.2;WP|G2|Q2
12|P|Stainless & cast steel|Ferritic / martensitic|—|420 / 1.4021|60-140;800-1500;.2-.4;150-220;600-1200;.05-.2;WR|250-320;2-4;300-380;3-5;WP|6000-9000;180-400;.03-.08;6000-9000;150-320;.02-.05;WP|3800-8900;800-1500;.2-.4;9500-12000;600-1200;.05-.2;WP|G2|Q2
13|P|Stainless & cast steel|Martensitic|—|—|50-120;800-1500;.2-.4;120-200;600-1200;.05-.2;WR|250-320;2-4;300-380;3-5;WP|5000-8000;150-350;.03-.07;5000-8000;120-280;.02-.05;WP|3200-7600;800-1500;.2-.4;7600-12000;600-1200;.05-.2;WP|G2|Q2
14|M|Stainless steel|Austenitic, duplex|—|304L / 1.4306|50-120;800-1500;.2-.4;150-250;600-1200;.05-.2;WR|250-350;2-3;300-400;3-4;WR|7000-10000;180-400;.03-.08;7000-10000;150-350;.02-.06;WR|3200-7600;800-1500;.2-.4;9500-12000;600-1200;.05-.2;WR|G1|Q1
15|K|Grey cast iron (GG)|Ferritic / pearlitic|—|Class 25 / 0.6015|60-170;900-1600;.25-.45;120-220;600-1100;.08-.18;AP|250-350;2-4;300-400;3-5;AP|7000-10000;200-450;.03-.09;7000-10000;150-350;.02-.06;AP|3800-10800;900-1600;.25-.45;7600-12000;600-1100;.08-.18;AP|G4|Q3
16|K|Grey cast iron (GG)|Pearlitic / martensitic|—|Grade H20 / 36037|50-140;900-1600;.25-.45;100-180;600-1100;.08-.18;AP|250-350;2-4;300-400;3-5;AP|6000-9000;180-400;.03-.08;6000-9000;120-300;.02-.05;AP|3200-8900;900-1600;.25-.45;6400-11500;600-1100;.08-.18;AP|G2|Q2
17|K|Nodular cast iron (GGG)|Ferritic|—|60-40-18 / 0.7043|60-150;1100-1900;.3-.5;110-200;700-1300;.1-.2;AP|300-400;2-3;350-450;3-4;AP|7000-10000;220-480;.03-.1;7000-10000;160-350;.02-.06;AP|3800-9500;1100-1900;.3-.5;7000-12000;700-1300;.1-.2;AP|G3|Q1
18|K|Nodular cast iron (GGG)|Pearlitic|—|F33500 / 0.705|50-130;900-1600;.25-.45;90-170;600-1100;.08-.18;AP|250-350;2-4;300-400;3-5;AP|6000-9000;180-400;.03-.08;6000-9000;120-300;.02-.05;AP|3200-8300;900-1600;.25-.45;5700-10800;600-1100;.08-.18;AP|G2|Q2
19|K|Malleable cast iron|Ferritic|—|A47 / 0.8135|60-150;1100-1900;.3-.5;110-200;700-1300;.1-.2;AP|300-400;2-3;350-450;3-4;AP|7000-10000;220-480;.03-.1;7000-10000;160-350;.02-.06;AP|3800-9500;1100-1900;.3-.5;7000-12000;700-1300;.1-.2;AP|G3|Q1
20|K|Malleable cast iron|Pearlitic|—|A220 / 0.8155|50-130;900-1600;.25-.45;90-170;600-1100;.08-.18;AP|250-350;2-4;300-400;3-5;AP|6000-9000;180-400;.03-.08;6000-9000;120-300;.02-.05;AP|3200-8300;900-1600;.25-.45;5700-10800;600-1100;.08-.18;AP|G2|Q2
21|N|Aluminium, wrought|Not hardenable|—|5005 / 3.3315|180-425;1200-2000;.2-.5;165-350;1000-1800;.05-.2;WM|350-500;2;400-550;3-4;WM|9000-12000;300-600;.02-.08;9000-12000;250-500;.02-.05;WM|11500-12000;1200-2000;.2-.5;10500-12000;1000-1800;.05-.2;WM|G5|Q4
22|N|Aluminium, wrought|Hardenable|—|7075 / 3.4365|160-380;1200-2000;.2-.5;150-320;1000-1800;.05-.2;WM|350-500;2;400-550;3-4;WM|9000-12000;300-600;.02-.08;9000-12000;250-500;.02-.05;WM|10200-12000;1200-2000;.2-.5;9500-12000;1000-1800;.05-.2;WM|G5|Q4
23|N|Aluminium, cast ≤12% Si|Not hardenable|—|518 / 3.3292|155-425;1200-2000;.2-.5;140-300;1000-1800;.05-.2;WM|350-500;2;400-550;3-4;WM|9000-12000;300-600;.02-.08;9000-12000;250-500;.02-.05;WM|9900-12000;1200-2000;.2-.5;8900-12000;1000-1800;.05-.2;WM|G5|Q4
24|N|Aluminium, cast ≤12% Si|Hardenable|—|515 / 3.3241|145-380;1200-2000;.2-.5;130-280;1000-1800;.05-.2;WM|350-500;2;400-550;3-4;WM|8000-11000;280-550;.02-.08;8000-11000;220-450;.02-.05;WM|9200-12000;1200-2000;.2-.5;8300-12000;1000-1800;.05-.2;WM|G5|Q4
25|N|Aluminium, cast >12% Si|High temperature|—|390|130-360;800-1600;.2-.4;100-220;700-1400;.05-.15;WM|350-500;2;400-550;3-4;WM|8000-11000;220-450;.02-.07;7000-10000;180-400;.02-.05;WM|8300-12000;800-1600;.2-.4;6400-12000;700-1400;.05-.15;WM|G6|Q5
26|N|Copper alloys|>1% Pb, free-cutting|—|C36000 / 2.0375|130-320;1000-1800;.2-.4;120-260;800-1600;.05-.2;WM|300-450;2;350-500;3-4;AW|8000-12000;250-500;.02-.08;8000-12000;200-400;.02-.05;AW|8300-12000;1000-1800;.2-.4;7600-12000;800-1600;.05-.2;AW|G5|Q4
27|N|Copper alloys|Brass|—|C22000 / 2.023|140-330;1000-1800;.2-.4;140-280;800-1600;.05-.2;WM|300-450;2;350-500;3-4;AW|8000-12000;250-500;.02-.08;8000-12000;200-400;.02-.05;AW|8900-12000;1000-1800;.2-.4;8900-12000;800-1600;.05-.2;AW|G5|Q4
28|N|Copper alloys|Electrolytic copper|—|C63000 / 2.0966|110-280;1000-1800;.2-.4;100-220;800-1600;.05-.2;WM|300-450;2;350-500;3-4;AW|8000-11000;220-450;.02-.07;7000-10000;180-400;.02-.05;AW|7000-12000;1000-1800;.2-.4;6400-12000;800-1600;.05-.2;AW|G5|Q4
29|N|Non-metallic|Duroplastics, fibre plastics|—|Bakelite|80-220;800-1600;.1-.3;80-160;600-1400;.05-.15;DA|250-350;2;300-400;3-4;DA|6000-9000;200-450;.02-.07;5000-8000;150-350;.02-.05;DA|5100-12000;800-1600;.1-.3;5100-10200;600-1400;.05-.15;DA|G7|Q6
30|N|Non-metallic|Hard rubber|—|Ebonite|60-180;800-1600;.1-.3;60-120;600-1400;.05-.15;DA|250-350;2;300-400;3-4;DA|5000-8000;180-400;.02-.07;5000-8000;150-350;.02-.05;DA|3800-11500;800-1600;.1-.3;3800-7600;600-1400;.05-.15;DA|G7|Q6
31|S|Heat-resistant alloys|Fe-based|Annealed|330 / 1.4864|40-95;600-1200;.1-.3;80-160;500-1000;.05-.15;WR|200-300;2-4;250-350;3-5;WR|6000-9000;150-350;.03-.08;6000-9000;120-300;.02-.05;WR|2500-6000;600-1200;.1-.3;5100-10200;500-1000;.05-.15;WR|G2|Q2
32|S|Heat-resistant alloys|Fe-based|Hardened|S590 / 1.4977|35-80;600-1200;.1-.3;60-120;500-1000;.05-.15;WR|200-300;2-4;250-350;3-5;WR|5000-8000;130-300;.03-.07;5000-8000;100-250;.02-.05;WR|2200-5100;600-1200;.1-.3;3800-7600;500-1000;.05-.15;WR|G2|Q2
33|S|Heat-resistant alloys|Ni / Co-based|Annealed|Incoloy 825 / 2.4858|30-70;400-900;.1-.3;35-65;350-800;.05-.15;WR|200-300;2-4;250-350;3-5;WR|5000-8000;120-300;.03-.07;5000-8000;100-250;.02-.05;WR|1900-4500;400-900;.1-.3;2200-4100;350-800;.05-.15;WR|G2|Q2
34|S|Heat-resistant alloys|Ni / Co-based|Hardened|Inconel 718 / 2.4668|25-55;400-900;.1-.3;30-55;350-800;.05-.15;WR|200-300;2-4;250-350;3-5;WR|5000-8000;120-280;.03-.07;5000-8000;100-240;.02-.05;WR|1600-3500;400-900;.1-.3;1900-3500;350-800;.05-.15;WR|G2|Q2
35|S|Heat-resistant alloys|Ni / Co-based|Cast|Nimocast K24 / 2.4674|25-60;400-900;.1-.3;30-60;350-800;.05-.15;WR|200-300;2-4;250-350;3-5;WR|5000-8000;120-280;.03-.07;5000-8000;100-240;.02-.05;WR|1600-3800;400-900;.1-.3;1900-3800;350-800;.05-.15;WR|G2|Q2
36|S|Titanium alloys|Pure|—|Ti Gr.1 / 3.7024|35-80;500-1000;.1-.3;35-70;400-800;.05-.15;WR|200-300;2-4;250-350;3-5;WR|5000-8000;140-320;.03-.07;5000-8000;110-260;.02-.05;WR|2200-5100;500-1000;.1-.3;2200-4500;400-800;.05-.15;WR|G2|Q2
37|S|Titanium alloys|Alpha+beta, hardened|—|Ti Gr.5 / 3.7165|30-65;500-1000;.1-.3;30-60;400-800;.05-.15;WR|200-300;2-4;250-350;3-5;WR|5000-8000;120-280;.03-.07;5000-8000;100-240;.02-.05;WR|1900-4100;500-1000;.1-.3;1900-3800;400-800;.05-.15;WR|G2|Q2
38|H|Hardened steel|—|Hardened|HARDOX 500|35-80;400-900;.1-.3;200-320;300-700;.05-.15;WP|300-300;2+;300-300;3-4;WP|5000-8000;120-300;.03-.07;5000-8000;100-250;.02-.05;WP|2200-5100;400-900;.1-.3;12000-12000;300-700;.05-.15;WP|G2|Q2
39|H|Hardened steel|—|Hardened|HARDOX Extreme|30-60;400-900;.1-.3;150-250;300-700;.05-.15;WP|300-300;2+;300-300;3-4;WP|5000-8000;100-250;.03-.06;5000-8000;90-220;.02-.04;WP|1900-3800;400-900;.1-.3;9500-12000;300-700;.05-.15;WP|G2|Q2
40|H|Chilled cast iron|—|Cast|A532 IIIA 25% Cr|40-80;500-1000;.15-.3;100-180;400-800;.05-.15;WP|300-300;2+;300-300;3-4;WP|5000-8000;120-300;.03-.07;5000-8000;100-250;.02-.05;WP|2500-5100;500-1000;.15-.3;6400-11500;400-800;.05-.15;WP|G2|Q2
41|H|Hardened cast iron|—|Hardened|A532 IID 20% CrMo|35-70;500-1000;.15-.3;80-150;400-800;.05-.15;WP|300-300;2+;300-300;3-4;WP|5000-8000;100-250;.03-.06;5000-8000;90-220;.02-.04;WP|2200-4500;500-1000;.15-.3;5100-9500;400-800;.05-.15;WP|G2|Q2`;
const SF_COOL = { AW: 'Air or wet', WP: 'Wet preferred', WR: 'Wet recommended', AP: 'Air preferred', WM: 'Wet or MQL', DA: 'Dry air with extraction' };
const SF_GRIT = { G1: { list: [400, 600], fine: 800 }, G2: { list: [150, 200, 400], note: '#150 heavy burr · #200 general · #400 controlled edge' }, G3: { list: [400, 600] }, G4: { list: [200, 400], fine: 600 }, G5: { list: [800, 1200] }, G6: { list: [600, 800] }, G7: { list: [2000, 3000] } };
const SF_POL = { Q1: [800, 1200], Q2: [400, 800, 1000, 1200], Q3: [600, 1000], Q4: [1200, 2000], Q5: [1000, 1200], Q6: [3000, 6000] };
const rng = s => { const p = String(s).split('-').map(Number); return [p[0], p.length > 1 ? p[1] : p[0]]; };
const SF_ROWS = SF_RAW.trim().split('\n').map(l => {
  const f = l.split('|'); const sp = s => s.split(';');
  const S = sp(f[6]), C = sp(f[7]), P = sp(f[8]), E = sp(f[9]);
  return {
    id: +f[0], iso: f[1], group: f[2], details: f[3], cond: f[4], grade: f[5],
    S: { vcD: rng(S[0]), feedD: rng(S[1]), docD: rng(S[2]), vcP: rng(S[3]), feedP: rng(S[4]), docP: rng(S[5]), cool: S[6] },
    C: { feedD: rng(C[0]), passD: C[1], feedP: rng(C[2]), passP: C[3], cool: C[4] },
    P: { rpmD: rng(P[0]), feedD: rng(P[1]), engD: rng(P[2]), rpmP: rng(P[3]), feedP: rng(P[4]), engP: rng(P[5]), cool: P[6] },
    E: { rpmD: rng(E[0]), feedD: rng(E[1]), engD: rng(E[2]), rpmP: rng(E[3]), feedP: rng(E[4]), engP: rng(E[5]), cool: E[6] },
    gD: SF_GRIT[f[10]], gP: SF_POL[f[11]], gKey: f[10],
  };
});
const sfRow = id => SF_ROWS.find(r => r.id === +id) || SF_ROWS[1];
const sfLabel = r => [r.group, r.details !== '—' ? r.details : '', r.cond !== '—' ? r.cond : ''].filter(Boolean).join(', ') + (r.grade && r.grade !== '—' ? ` (${r.grade})` : '');

// app material → representative official row
const SF_MATROW = { carbon: { annealed: 2, treated: 7, _: 2 }, stainless: { aust: 14, mart: 12, _: 14 }, hardened: { le55: 38, gt55: 39, _: 38 }, castiron: { grey: 15, pearl: 16, _: 15 }, aluminum: { wrought: 22, cast: 23, hisi: 25, _: 22 }, brass: { _: 27 }, copper: { _: 28 }, titanium: { _: 37 }, hrsa: { ni: 34, co: 35, fe: 31, _: 34 }, plastic: { _: 29 }, other: { _: 2 }, carbide: { _: 39 } };
const sfRowOf = st => st.sfRow ? sfRow(st.sfRow) : sfRowFor(st.material, st.sub);
const sfRowFor = (mat, sub) => { const m = SF_MATROW[mat] || SF_MATROW.other; return sfRow(m[sub] || m._); };

// NOGA Cross-Hole RPM Advisor constants
const SF_GRITX = { 150: 1.15, 200: 1.12, 400: 1.08, 600: 1.04, 800: 1, 1000: .98, 1200: .96, 2000: .92, 3000: .88, 6000: .84 };
const SF_CH_BASE = { 1.5: [8500, 10500], 3: [7500, 9000], 5: [7500, 8000], 7: [6500, 8000], 11: [6500, 8000] };
const SF_CH_ADVISOR_PILOT = { 1.5: [3.5, 5], 3: [5, 8], 5: [8, 10], 7: [10, 14], 11: [14, 20] };
const SF_SURF_WIN = { 6: [9000, 12000], 15: [5700, 7200], 25: [5000, 6000], 40: [2700, 3600], 60: [1800, 2400], 100: [1000, 1400] };
// UFIBER radial disc table (noga.com disc page) by material class
const SF_DISC = {
  Pa: { vcD: [150, 250], feedD: [200, 500], engD: [.05, .15], vcP: [100, 180], feedP: [200, 450], engP: [.02, .08], gD: [150, 200, 400], gP: [600, 800, 1000], cool: 'AW' },
  Pq: { vcD: [100, 180], feedD: [150, 400], engD: [.04, .12], vcP: [80, 150], feedP: [150, 350], engP: [.02, .06], gD: [150, 200, 400], gP: [600, 800, 1000], cool: 'WP' },
  M: { vcD: [100, 180], feedD: [150, 400], engD: [.04, .12], vcP: [80, 150], feedP: [150, 350], engP: [.02, .06], gD: [200, 400], gP: [600, 800, 1000], cool: 'WR' },
  Kg: { vcD: [180, 300], feedD: [250, 600], engD: [.05, .15], vcP: [120, 200], feedP: [200, 500], engP: [.02, .08], gD: [150, 200, 400], gP: [600, 800], cool: 'AP' },
  Kn: { vcD: [150, 250], feedD: [200, 500], engD: [.05, .15], vcP: [100, 180], feedP: [200, 450], engP: [.02, .08], gD: [150, 200, 400], gP: [600, 800], cool: 'AP' },
  Nw: { vcD: [250, 400], feedD: [300, 800], engD: [.03, .10], vcP: [180, 300], feedP: [300, 700], engP: [.01, .05], gD: [400, 600], gP: [800, 1000], cool: 'WM' },
  Nh: { vcD: [200, 350], feedD: [250, 700], engD: [.03, .10], vcP: [150, 250], feedP: [250, 600], engP: [.01, .05], gD: [400, 600], gP: [800, 1000], cool: 'WM' },
  Sa: { vcD: [60, 120], feedD: [100, 300], engD: [.03, .10], vcP: [50, 100], feedP: [100, 250], engP: [.01, .05], gD: [150, 200, 400], gP: [600, 800, 1000], cool: 'WR' },
  Sh: { vcD: [50, 100], feedD: [100, 250], engD: [.03, .08], vcP: [40, 80], feedP: [100, 200], engP: [.01, .04], gD: [150, 200, 400], gP: [600, 800, 1000], cool: 'WR' },
  H1: { vcD: [50, 120], feedD: [100, 300], engD: [.03, .10], vcP: [50, 100], feedP: [100, 250], engP: [.01, .05], gD: [150, 200, 400], gP: [600, 800, 1000], cool: 'WP' },
  H2: { vcD: [40, 100], feedD: [100, 250], engD: [.02, .08], vcP: [40, 80], feedP: [100, 200], engP: [.01, .04], gD: [150, 200, 400], gP: [600, 800, 1000], cool: 'WP' },
};
const SF_DISC_OF = { 1: 'Pa', 2: 'Pa', 3: 'Pq', 4: 'Pa', 5: 'Pq', 6: 'Pa', 7: 'Pq', 8: 'Pq', 9: 'Pq', 10: 'Pa', 11: 'Pq', 12: 'M', 13: 'M', 14: 'M', 15: 'Kg', 16: 'Kg', 17: 'Kn', 18: 'Kn', 19: 'Kn', 20: 'Kn', 21: 'Nw', 22: 'Nh', 23: 'Nh', 24: 'Nh', 25: 'Nh', 26: 'Nh', 27: 'Nh', 28: 'Nh', 31: 'Sa', 32: 'Sh', 33: 'Sa', 34: 'Sh', 35: 'Sh', 36: 'Sa', 37: 'Sa', 38: 'H1', 39: 'H2', 40: 'H1', 41: 'H1' };

const r100 = v => Math.round(v / 100) * 100;
const vc2rpm = (vc, d) => vc * 1000 / (Math.PI * d);
const lowOf = (a) => a[0];
const sfPassesFor = (mode) => mode === 'polish' ? '2–3' : '1–2';

/* ---------- per-family calculators ---------- */
function sfSurface({ row, dia, grit, mode = 'deburr', worn = false, maxRpm = null }) {
  const W = SF_SURF_WIN[dia]; const S = row.S; const pol = mode === 'polish';
  let start = Math.min(Math.max(r100(W[0] * (SF_GRITX[grit] || 1)), W[0]), W[1]);
  if (worn) start = Math.min(r100(start * 1.1), W[1]);
  const vc = pol ? S.vcP : S.vcD; const vcRpm = [r100(vc2rpm(vc[0], dia)), r100(vc2rpm(vc[1], dia))];
  const out = { family: 'surface', rpm: start, rpmRange: W, rpmMax: W[1], vcRange: vc, vcRpm, feedRange: pol ? S.feedP : S.feedD, engRange: pol ? S.docP : S.docD, engLabel: 'Depth of cut', engMax: 1.2, passes: pol ? '2–3' : '1–2', cool: SF_COOL[S.cool], checks: [], notes: [], source: 'NOGA Surface Brush table + NOGA RPM Advisor surface method' };
  out.feed = out.feedRange[0]; out.eng = out.engRange[0];
  if (vcRpm[1] < W[0]) out.checks.push(`NOGA's material table (cutting speed ${vc[0]}–${vc[1]} m/min) works out to ${vcRpm[0].toLocaleString()}–${vcRpm[1].toLocaleString()} RPM for Ø${dia} — below the catalogue window for this brush (${W[0].toLocaleString()}–${W[1].toLocaleString()} RPM). NOGA's RPM Advisor and catalogue tests use the window, so this does too. If you see heat, glazing or fast wear, go lower.`);
  else if (vcRpm[0] > W[1]) out.checks.push(`NOGA's material table works out to ${vcRpm[0].toLocaleString()}+ RPM for Ø${dia}, above the catalogue window. Staying in the window.`);
  if (pol && S.vcP[0] > S.vcD[1] * 1.5) out.checks.push(`Possible data error: NOGA's table gives a polishing cutting speed (${S.vcP[0]}–${S.vcP[1]} m/min) far higher than for deburring (${S.vcD[0]}–${S.vcD[1]} m/min) on this hard material — the opposite of every other row.`);
  if (maxRpm && out.rpm > maxRpm) { out.notes.push(`Limited to your ${maxRpm.toLocaleString()} RPM spindle.`); out.rpm = maxRpm; }
  return out;
}
function sfCrossFits(bore, grit) {
  const res = [];
  for (const d of [1.5, 3, 5, 7, 11]) { const c = CROSS[d]; const r = grit >= 1200 && c.pilotFine ? c.pilotFine : c.pilot; if (c.grits && !c.grits.includes(grit)) continue; if (bore >= r[0] && bore <= r[1]) res.push({ d, r }); }
  return res;
}
// NOGA RPM Advisor surface-brush method: minimum bore per brush, compatible shanks
const SF_SHANK_MINBORE = (d, grit) => d === 25 ? (grit <= 1000 ? 27 : 28) : ({ 15: 20, 40: 40, 60: 60, 100: 100 }[d]);
const SF_SHANKS = { 15: [['UF5001', 'UF-S-L045-DS06-C06', 'standard, Ø6 connection, L 45 mm']], 25: [['UF5003', 'UF-S-L050-DS09-C10', 'standard, Ø10 connection, L 50 mm'], ['UF5002', 'UF-S-L050-DS09-C06', 'standard, Ø6 connection, L 50 mm'], ['UF5007', 'UF-S-L120-DS09-C10', 'long reach, Ø10 connection, L 120 mm']], 40: [['UF5004', 'UF-S-L050-DS12-C12', 'standard, Ø12 connection, L 50 mm'], ['UF5008', 'UF-S-L120-DS12-C12', 'long reach, Ø12 connection, L 120 mm']], 60: [['UF5005', 'UF-S-L050-DS13-C12', 'standard, Ø12 connection, L 50 mm']], 100: [['UF5006', 'UF-S-L050-DS16-C16', 'standard, Ø16 connection, L 50 mm']] };
function sfShankFits(bore, grit) { return [15, 25, 40, 60, 100].filter(d => bore >= SF_SHANK_MINBORE(d, grit)).map(d => ({ d, min: SF_SHANK_MINBORE(d, grit) })); }
function sfShank({ row, bore, grit, mode = 'deburr', worn = false, maxRpm = null, size = null, deep = false }) {
  const C = row.C; const pol = mode === 'polish';
  const fits = sfShankFits(bore, grit);
  const out = { family: 'shank', method: 'shank', checks: [], notes: [], cool: SF_COOL[C.cool], engLabel: 'Stroke', grit, source: 'NOGA RPM Advisor surface-brush method + NOGA Cross-Hole table (feed)' };
  if (!fits.length) { out.error = 'No surface brush fits this bore.'; return out; }
  const pick = size && fits.find(f => f.d === size) ? size : fits[fits.length - 1].d;
  const s = sfSurface({ row, dia: pick, grit, mode, worn, maxRpm });
  const shanks = SF_SHANKS[pick]; const shank = (deep && shanks.find(x => x[2].startsWith('long'))) || shanks[0];
  const clr = (bore - pick) / 2;
  Object.assign(out, { size: pick, fits, rpm: s.rpm, rpmRange: s.rpmRange, rpmMax: s.rpmMax, newRpm: s.rpm, feedRange: pol ? C.feedP : C.feedD, passes: pol ? C.passP : C.passD, shank, shanks, clearance: +clr.toFixed(1) });
  out.feed = out.feedRange[0];
  if (clr >= 1) out.notes.push(`The Ø${pick} brush leaves about ${out.clearance} mm radial clearance in a Ø${bore} bore. Use a circular-interpolated or offset toolpath so the fiber tips reach the cross-hole edge on the bore wall.`);
  out.notes.push('Insert the brush and start rotation inside the bore; stop rotation before withdrawing. Pass completely across the intersection and don\'t dwell over the cross hole.');
  if (grit < 1000) out.notes.push('NOGA\'s catalogue suggests starting this method at #1200 (it expands more), then #1000 if burrs remain. Your table grit is coarser — fine for heavier burrs.');
  return out;
}
function sfAdvisorSize(bore) { const f = Object.entries(SF_CH_ADVISOR_PILOT).filter(([, r]) => bore >= r[0] && bore <= r[1]).map(([d]) => +d); return f.length ? Math.max(...f) : null; }
function sfCross({ row, bore, grit, mode = 'deburr', worn = false, maxRpm = null, size = null }) {
  const C = row.C; const pol = mode === 'polish';
  const out = { family: 'crosshole', checks: [], notes: [], cool: SF_COOL[C.cool], source: 'NOGA Cross-Hole table + NOGA RPM Advisor formula', engLabel: 'Stroke' };
  let fits = sfCrossFits(bore, grit);
  let g = grit;
  if (!fits.length && grit >= 1200) { const alt = sfCrossFits(bore, 1000); if (alt.length) { fits = alt; g = 1000; out.notes.push(`No #${grit} brush fits a Ø${bore} bore (fine grits have their own bore ranges). Calculated with #1000.`); } }
  if (!fits.length) { const coarse = sfCrossFits(bore, 1000); if (coarse.length && bore >= 14) { fits = coarse; g = Math.min(Math.max(grit, 600), 1000); out.notes.push(`Ø11 brushes come in #600, #800 and #1000 only. Calculated with #${g}.`); } }
  out.fits = fits; out.grit = g;
  if (!fits.length && bore > 20) return sfShank({ row, bore, grit, mode, worn, maxRpm, size });
  if (!fits.length && bore >= 2.5 && bore < 3.5) {
    // NOGA case study: 17-4 PH, Ø2.6 hole across M3 thread, Ø1.5 #1000, 7,000 RPM, 100 mm/min, dry
    const rpmS = Math.min(CROSS[1.5].max, r100(7000 * (SF_GRITX[grit] || 1) / SF_GRITX[1000]));
    Object.assign(out, { method: 'small', size: 1.5, grit, pilot: [2.5, 3.5], fits: [], rpm: worn ? Math.min(CROSS[1.5].max, r100(rpmS * 1.1)) : rpmS, newRpm: rpmS, wornRpm: r100(rpmS * 1.1), rpmRange: [rpmS, r100(rpmS * 1.25)], rpmMax: CROSS[1.5].max, baseRpm: 7000, gritX: SF_GRITX[grit], feedRange: [100, 100], feed: 100, passes: pol ? C.passP : C.passD });
    out.source = 'NOGA case study (17-4 PH, Ø2.6 mm hole)';
    out.checks.push('Below the Ø3.5 mm catalogue range for the Ø1.5 cross-hole brush. NOGA\'s 17-4 PH medical connector case (Star SR-20, Ø2.6 mm hole across an M3 thread) ran this brush at 7,000 RPM and 100 mm/min, dry — far lower feed than the 300–380 mm/min table value. These numbers come from that single case; run a test part.');
    if (maxRpm && out.rpm > maxRpm) { out.rpm = maxRpm; out.notes.push(`Limited to your ${maxRpm.toLocaleString()} RPM spindle.`); }
    return out;
  }
  if (!fits.length && bore >= 1.2 && bore < 3.5) {
    const pd = [1, 1.5, 2, 2.5, 3].filter(x => x <= bore - 0.3).pop() || 1;
    const p = sfPoint({ row, dia: pd, mode, maxRpm });
    return Object.assign(p, { method: 'point', size: pd, grit, source: 'NOGA Point Brush table', notes: [`Below Ø3.5 mm no cross-hole brush fits. Closest standard option: a Ø${pd} point brush worked into the bore from the open side, with light engagement. Ask NOGA for an engineering review before production.`, ...p.notes] });
  }
  if (!fits.length) { out.error = bore < 1.2 ? 'Below Ø1.2 mm there is no standard UFIBER brush. Ask NOGA for an engineering review.' : 'No standard brush fits this bore.'; return out; }
  const pick = size && fits.find(f => f.d === size) ? fits.find(f => f.d === size) : fits[fits.length - 1];
  const d = pick.d, r = pick.r, base = SF_CH_BASE[d], mx = CROSS[d].max;
  const ar = SF_CH_ADVISOR_PILOT[d]; // interpolate exactly as NOGA's RPM Advisor does
  const pos = Math.min(1, Math.max(0, (bore - ar[0]) / (ar[1] - ar[0])));
  const b = base[0] + pos * (base[1] - base[0]);
  const newRpm = Math.min(mx, r100(b * (SF_GRITX[g] || 1))); const wornRpm = Math.min(mx, r100(newRpm * 1.1));
  Object.assign(out, { size: d, pilot: r, rpm: worn ? wornRpm : newRpm, newRpm, wornRpm, rpmRange: [newRpm, Math.min(mx, r100(newRpm * 1.25))], rpmMax: mx, baseRpm: r100(b), gritX: SF_GRITX[g], feedRange: pol ? C.feedP : C.feedD, passes: pol ? C.passP : C.passD });
  out.feed = out.feedRange[0];
  const adv = sfAdvisorSize(bore);
  if (adv && adv !== d) out.checks.push(`NOGA's RPM Advisor would pick a Ø${adv} brush for this bore — it uses bore ranges (Ø3: 5–8, Ø5: 8–10, Ø7: 10–14 mm) that differ from the UFIBER catalogue and website (Ø3: 5–7, Ø5: 7–9 / 8–10, Ø7: 9–14 / 10–20 mm). This uses the catalogue.`);
  if (maxRpm && out.rpm > maxRpm) { out.notes.push(`Limited to your ${maxRpm.toLocaleString()} RPM spindle — the brush will expand less; add passes.`); out.rpm = maxRpm; }
  return out;
}
function sfPoint({ row, dia = 2, mode = 'deburr', hand = false, maxRpm = null }) {
  const P = row.P; const pol = mode === 'polish';
  const out = { family: 'point', checks: [], notes: [], cool: SF_COOL[P.cool], source: 'NOGA Point Brush table', engLabel: 'Engagement', rpmMax: 12000, passes: pol ? '2–3' : '1–2' };
  if (hand) Object.assign(out, { rpm: 1000, rpmRange: [1000, 3000], feed: null, feedRange: null, eng: null, engRange: null, notes: ['Hand-held: start at about 1,000 RPM and increase to 3,000 RPM at most once you have stable control (NOGA). Electric drive only — no air tools.'] });
  else { Object.assign(out, { rpmRange: pol ? P.rpmP : P.rpmD, feedRange: pol ? P.feedP : P.feedD, engRange: pol ? P.engP : P.engD }); out.rpm = out.rpmRange[0]; out.feed = out.feedRange[0]; out.eng = out.engRange[0]; if (dia <= 1.5) out.notes.push('Ø1.0 and Ø1.5: stay at the low end of feed and engagement.'); }
  if (maxRpm && out.rpm > maxRpm) { out.rpm = maxRpm; out.notes.push(`Limited to your ${maxRpm.toLocaleString()} RPM spindle.`); }
  return out;
}
function sfEnd({ row, mode = 'deburr', hand = false, maxRpm = null }) {
  const E = row.E; const pol = mode === 'polish';
  const out = { family: 'end', checks: [], notes: [], cool: SF_COOL[E.cool], source: 'NOGA End Brush table', engLabel: 'Engagement', rpmMax: 12000, passes: pol ? '2–3' : '1–2' };
  if (hand) Object.assign(out, { rpm: 1000, rpmRange: [1000, 3000], feed: null, feedRange: null, eng: null, engRange: null, notes: ['Hand-held: start at about 1,000 RPM and increase to 3,000 RPM at most once you have stable control (NOGA). Electric drive only — no air tools.'] });
  else {
    Object.assign(out, { rpmRange: pol ? E.rpmP : E.rpmD, feedRange: pol ? E.feedP : E.feedD, engRange: pol ? E.engP : E.engD });
    out.rpm = out.rpmRange[0]; out.feed = out.feedRange[0]; out.eng = out.engRange[0];
    out.checks.push('Check with NOGA: the End Brush feed and engagement values are identical to the Ø25–100 Surface Brush table, while the Point Brush table (Ø1–3) uses about 5× lower feed and 5–10× lighter engagement. Start at the low end and watch edge rounding and wear.');
    if (out.rpmRange[0] === 12000 && out.rpmRange[1] === 12000) out.checks.push('NOGA lists only "12,000 max." here because its source cutting speed is above the brush limit. Start lower (around 9,000 RPM) and increase.');
  }
  if (maxRpm && out.rpm > maxRpm) { out.rpm = maxRpm; out.notes.push(`Limited to your ${maxRpm.toLocaleString()} RPM spindle.`); }
  return out;
}
function sfDisc({ row, dia = 22, mode = 'deburr', maxRpm = null }) {
  const k = SF_DISC_OF[row.id]; const pol = mode === 'polish';
  const out = { family: 'disc', checks: [], notes: [], source: 'NOGA Ceramic Fiber Disc table', engLabel: 'Radial engagement', rpmMax: 9000, passes: '2–3' };
  if (!k) { out.error = 'NOGA\'s disc table doesn\'t cover non-metallic materials. Ask NOGA for a recommendation.'; return out; }
  const D = SF_DISC[k]; const vc = pol ? D.vcP : D.vcD;
  const rr = [r100(vc2rpm(vc[0], dia)), Math.min(9000, r100(vc2rpm(vc[1], dia)))];
  Object.assign(out, { vcRange: vc, rpmRange: rr, rpm: rr[0], feedRange: pol ? D.feedP : D.feedD, engRange: pol ? D.engP : D.engD, cool: SF_COOL[D.cool], gList: pol ? D.gP : D.gD });
  out.feed = out.feedRange[0]; out.eng = out.engRange[0];
  if (rr[1] < 6000) out.checks.push(`The disc table's cutting speed gives ${rr[0].toLocaleString()}–${rr[1].toLocaleString()} RPM for Ø${dia}, while the same NOGA page recommends 6,000–8,000 RPM operation. Starting from the table value; raise carefully toward 6,000 if cutting is weak. Never exceed 9,000.`);
  if (maxRpm && out.rpm > maxRpm) { out.rpm = maxRpm; out.notes.push(`Limited to your ${maxRpm.toLocaleString()} RPM spindle.`); }
  return out;
}

if (typeof module !== 'undefined' && module.exports) module.exports = { sfShank, sfShankFits, SF_SHANKS, SF_ROWS, sfRow, sfRowFor, sfSurface, sfCross, sfPoint, sfEnd, sfDisc, sfLabel, SF_COOL, SF_GRITX, SF_SURF_WIN, SF_DISC, SF_DISC_OF, sfAdvisorSize, sfCrossFits };

