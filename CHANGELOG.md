# Changelog

## 1.6.21 – 2026-10-31
- No competitor brand or maker name appears anywhere in the app any more:
  not on screen, in notes, in the copied list, in the quote email, in the
  page source or in what the AI writes. Results are labelled "Your item",
  and the "Pick it" panel chooses by code type ("Codes like A21-CB25M" or
  "Codes like CN-CB25MS"). The AI is told never to name a competitor brand,
  even when the customer does.
- A code typed with a brand word in front of it still converts.
- Questions such as "what is your equivalent?" or "convert competitor
  brush codes" now open the Replace page from the offline model.
- A test checks that the shipped page contains no competitor or maker name.

## 1.6.20 – 2026-10-31
- "Don't know the code? Pick it" on the Replace page covers both code
  types: surface brush + sleeve, cross-hole (Ø1.5–11, including Ø9),
  micro-hole (Ø1–3) and side brushes for CN- codes. End-brush choices list
  only sizes that exist (Ø3 and Ø5). Every picker combination (80) is tested.

## 1.6.19 – 2026-10-31
- Wheel and side brushes (W-A11-50/75, SD-…M) now map to the UFIBER radial
  ceramic fiber disc (Ø13–30 × 0.8 mm, UF7…), per NOGA: the nearest disc
  that is not larger, shank UF7030, 6,000–8,000 RPM, never above 9,000.
- "Open full UFIBER setup" keeps the converted disc size, and the program
  check uses the disc speed range.

## 1.6.18 – 2026-10-31
- CN- code grades map the same way as A- codes (NOGA): A12 / pink → #1200,
  A33 / blue → #800. CN-A33-5M and CH-A33-5M both give UF2550.

## 1.6.17 – 2026-10-30
- Competitor cross-reference re-checked against the makers' own data.
- Fixed: the blue Ø7 cross-hole brush (CH-A33-7) covers bores Ø10–14, not
  Ø10–20. Only the red Ø7 (CH-A12-7) goes to Ø20.
- Long (L) cross-hole brushes flag a shank change (Ø4/6/8/12) and the right
  length per colour (170 / 180 mm).
- New: extra-large cross-hole CH-A34-15/20/25 (bores Ø20–35) becomes a
  UFIBER surface brush on a shank; CH-SH-6/8 shanks, CH-P… stones and TM-SH
  lathe holders are recognised.
- New: CN- codes — surface sets CN-CB…MS/HS, cross-hole CN-A12/A33 Ø1.5–11
  (Ø9 → Ø7 or Ø11), micro-hole CB31R/B-S Ø1–3, oil-stone heads
  CN-PB/PO/PM, and the PD, CPD and BD lines. CB31M-01550 → UF1615.
- Competitor codes in what a customer types or drops in (ask box, email,
  drawing text) are found and converted under "Here's what I understood".
  The AI gets those conversions and a convert_competitor_codes lookup.

## 1.6.16 – 2026-10-30
- A Ø15 surface brush on a shank now fits from a Ø19 bore (#1000 and finer),
  instead of Ø20. Source: a spread test of the UF1615 brush (Ø15 #1000). Spinning free at 6,000 RPM without its sleeve, it flared to Ø20
  at mid-length and Ø28.9 at the tips, and it deburred a Ø19 cross hole.
  Coarser grits keep Ø20.
- The setup for a Ø15 brush on a shank shows those measured figures. Between
  Ø19 and Ø28.9 it is no longer marked as an estimate. If the speed is more
  than 10% below 6,000 RPM, the setup says the fibers spread less.
- "Surface brush on a shank" is offered as an alternative from Ø19 only. It
  used to appear from Ø14, where there is no data.

## 1.6.15 – 2026-10-30
- When a face, seal or polishing job states no width, Claude now works it out
  from the drawing's other dimensions instead of leaving it empty: for a round
  seal or face around a port, hole Ø + 2 × each land and groove dimensioned
  "all around" (Ø.250 hole, .060 land, .115 groove → about Ø15 mm). The brush
  is sized from that, as from a stated width. On the MCAM membrane this gives
  Ø25 instead of the Ø40 default.
- An estimated size is shown as one: "Width (est. from drawing) ≈15 mm" on the
  chip, a note on the setup, and Medium confidence until someone confirms it.
- Size chips can be edited in place: tap Bore, Cross hole or Width, type the
  size, OK. A typed size replaces an estimate. A face job with no width shows
  "Width: not found" to tap, instead of quietly assuming Ø40.

## 1.6.14 – 2026-10-30
- The AI allowance per visitor is a setting: Settings → UFIBER Guide →
  "Readings per visitor per hour" (default 20, 5–500).
- Only the first request of a reading counts. Its retries (a lighter picture
  set, a firmer question) have their own, looser allowance, so one difficult
  email no longer uses up three or four readings.
- The hour is a fixed window. Every request used to restart it, so someone
  who kept trying stayed locked out.
- When the site's allowance is used up, the message says so, with the limit
  and how many minutes are left, instead of "Too many requests". Claude being
  overloaded (529) is reported as such.

## 1.6.13 – 2026-10-30
- The setup page has a way out. "← Back to the email" returns to the reading
  with the attachments and the case buttons still there; "+ New application"
  forgets the job and starts clean (the machine and units are kept), the same
  as Clear on the first page.
- A setup made from a multi-case email says which case it is for, with a
  button to set up the next one straight from the setup page.

## 1.6.12 – 2026-10-30
- Claude is told where cross-hole sizes come from: the two holes that meet at
  the burr. Entry counterbores, port and fitting bores, threads, outside
  diameters and flanges are not the main bore, and a size stated in words for
  the burr area outranks a number picked off the drawing. On the MCAM adapter
  it had taken the Ø.685" flare port (Ø17.4) as the main bore.
- A main bore more than three times the cross hole gets a warning ("Check the
  main bore size"), drops to Medium confidence, and the reading asks whether it
  is really the bore at the intersection.

## 1.6.11 – 2026-10-30
- A reading that came back as not-quite-JSON ("bad_json") is read anyway when
  it can be: the first complete object is taken, past a code fence, a
  sentence around it, a trailing comma, or one object per case.
- If it still can't be read, or was cut off by the length limit, Claude is
  asked once more, with the same pictures, for exactly one short object for
  the job being set up. Readings may use up to 2,000 tokens.
- Case names in a multi-case email are cut at a word, not mid-size.

## 1.6.10 – 2026-10-30
- The competitor page is now called "Replace competitor": the menu, the
  mobile tab bar, the home tile ("Switching from a competitor?"), the page
  heading, the Elementor widget and the settings screen.

## 1.6.9 – 2026-10-30
- The pictures sent with a reading now share one size budget (about 1.1 MB
  together, about 1.5 MB as sent). Many hosts drop any request over 2 MB
  without a word (PHP post_max_size); the endpoint then saw an empty request
  and the reading came back "empty".
- The endpoint now says "too_large" when a request was dropped for its size,
  instead of "empty".
- If the pictures together are still refused, the guide tries again with the
  job's first picture alone before falling back to the text, and says so.
- Settings → UFIBER Guide shows the server's request limit (post_max_size),
  with a note to raise it to 8M if readings with pictures fail.
- No stray full stop under the case name in a multi-case email.

## 1.6.8 – 2026-10-30
- An email with several jobs ("Case 1 … Case 2 …") now offers each one. The
  guide starts with Case 1 and shows a button per remaining case, named by
  its part and material ("Set up Case 2 — Membrane family, PET-P"). One tap
  puts that case's text in the box, with the notes that apply to every case
  ("all parts are plastics, BT40 machines") and without the signature, and
  reads it with Claude.
- Pictures pasted into an Outlook email are matched to their case from where
  they sit in the email body. The case being set up sends its own pictures
  to Claude first.

## 1.6.7 – 2026-10-30
- Pictures are shrunk to what Claude actually reads (1568 px on the long edge,
  under 0.9 MB) before they are sent. Three full-size drawings in one request
  made the site's AI endpoint fail with "unreachable".
- If a reading with pictures still fails on the way, the email text is read on
  its own and the page says the drawings were not seen, instead of showing
  only an error.
- The error says what actually happened: no connection, a timeout, a web-server
  status (e.g. 413 too large) or the endpoint's own reason, instead of
  "unreachable" for all of them.
- The site endpoint allows the PHP request to run past the host's default 30 s
  while it waits up to 45 s for Claude.

## 1.6.6 – 2026-10-30
- Pictures from an Outlook email keep the email's order. They were sorted by
  file size, so with four pictures and room for three, the first job's drawing
  could be the one left out.
- Whole pictures go to Claude before the title-block zooms. Each large picture
  used to bring its own zoom, so three slots held one drawing and its zoom plus
  one more picture.
- An email with several jobs ("Case 1 … Case 2 …") asks Claude for the first
  job only, from its own text and pictures, so Case 2's material or drawing
  can't fill in Case 1.
- Inch sizes written the American way read correctly: "Ø.156" is 0.156 in
  (3.96 mm), in typed text and in what Claude is told to look for on drawings.

## 1.6.5 – 2026-10-30
- Outlook .msg files now give up their pictures. A drawing pasted into the
  email body is stored as an attachment inside the .msg; it is read out and
  passed on like a dropped image or PDF. Pictures under 12 kB (signature logos)
  are left out and the four largest are kept. The status line says how many
  drawings were found instead of asking for the file to be dropped again.
- A labelled material wins. "Material : NPP" and "all part materials are
  engineering plastics" set the material, even when the email also mentions
  stainless or ceramic in passing.
- "We need fine grits type ceramic" is the brush, not the part. It used to make
  a plastic part "Carbide / ceramic / glass".
- Plastics read: PP, NPP, PET / PET-P, PVDF, PFA, PPS, PEI, PAI, UHMW, PVC,
  polypropylene, Ertalyte, Ketron, Techtron and plural "plastics".
- Sizes have to look like sizes. With no diameters in the email, the offline
  model filled a cross-hole job with any two numbers — "BT40" and the part number
  "15-430509-00" became a Ø40 bore and a Ø15 cross hole. Now only numbers it
  places as a size, or that carry Ø, dia, mm or ", count.
- An email describing several jobs ("Case 1 … Case 2 …") gets a note that the
  guide sets up the first and how to set up the next.
- When reading with Claude fails, the message says why instead of only
  "Something went wrong".

## 1.6.4 – 2026-10-19
- Workpiece grades are read and kept. "AW5083, AW7075" shows as
  "Aluminum (Wrought) · AW-5083 + AW-7075" on the chip, in the setup summary,
  in shared links and in the text sent to the AI chat.
- The grade picks NOGA's row. Wrought aluminium is two rows: 5083 (and other
  1xxx/3xxx/5xxx grades) now runs on the not-hardenable row, 7075 (2xxx/6xxx/
  7xxx) on the hardenable one. A mix stays on the slower hardenable row and
  says so, with the speed overlap taken from the table (Vc 165–320 m/min for
  5083 + 7075 polishing).
- A second material in the same job is no longer dropped. "AW5083, AW7075 and
  stainless 1.4301" sets up the aluminium and keeps the stainless as "Also in
  this job". One tap sets it up next, and the aluminium waits its turn.
- The AI reading picks the material the customer said to start with, quoted
  replies included, and no longer asks whether another material shares the
  setup. A question about a material that already has its own setup is dropped.
- Offline reading: the Czech "Předmět:" (Subject) header read as EDM and made
  the job "Hard / EDM"; "CNC milling center" now reads as a machining centre;
  a bare 2024 is a year unless it carries a temper or an AW.
- A link to a polishing setup no longer carries a burr level.

## 1.6.3 – 2026-10-16
- Cross-hole jobs on a lathe or Swiss-type machine get their own setup. The
  steps stop and lock the main spindle, put the brush in an axial live tool on
  the bore axis and program the feed in mm/min (G98), instead of "position
  above the bore".
- The live-tool speed is checked. With no maximum entered, a brush that needs
  more than 6,000 RPM is flagged, with makers' figures (Citizen L20 front tool
  7,500, Star SR-20R IV 8,000, Tornos Swiss GT 13 6,000). Within 15% of the
  target it can be trialled; further below, the guide asks for a speed
  increaser and drops confidence to Low. Shank set-ups get the same check;
  other brushes get a note.
- The cross-hole drawing follows the part: a bar lying on its side with the
  brush coming in from the end on a lathe, openings on both walls for a hole
  drilled through, and the slot drawn and labelled next to the cross hole.
- New inputs: "goes through both walls" and a slot that opens into the bore
  (width and length). They are read from an email ("on the diameter", "both
  sides", "1.016 slot with length of 1.5 mm"), shown as chips, kept in shared
  links and used for the stroke.
- A through cross hole over 70% of the bore is now a warning, not a note.
- Below the Ø3.5 range the Ø1.5 brush no longer says the bore is "inside this
  brush's working range"; it says the choice rests on NOGA's Ø2.6 mm case. The
  failed field trial in a Ø3.1 L605 bore is passed on in the warning.
- Reading: "a hole … opens in the reamed hole" is a cross-hole job, a repeated
  bore size no longer becomes the cross hole as well, and L605, Haynes 25 and
  MP35N read as cobalt alloys.

## 1.6.2 – 2026-10-16
- A stated burr height is now read as the burr. "Burr height: approx. 1 mm" in
  a customer email used to become "Width 1 mm" with the burr left as light, so
  a burr five times what fiber is built for got no warning at all.
- The measured height sets the burr size (over 0.2 mm is heavy), shows on the
  Burr chip ("heavy · 1 mm"), travels in a shared link, and on the setup gives
  a named warning with how far over it is, and Low confidence.
- The offline model could write into the sizes the keyword reading had found;
  it now works on a copy, so a burr height it mistakes for a width is removed.
- Picking a burr size by hand replaces a measured one.

## 1.6.1 – 2026-10-16
- One main button on Find a tool. It reads the description or the attached
  email, then turns into "Show my setup" once nothing is missing. The separate
  "Read with Claude" and "Show my setup" buttons are gone.
- Once the job is read, the button and Clear move under "Here's what I
  understood", next to the chips they act on. Clear is now a real button
  instead of faint text.
- No more "Claude is reading…" or "Read by Claude" lines; the button shows
  "Reading…" while it works.
- A Share link button at the top of "Your starting setup": it copies a link to
  the exact setup, or opens the share menu on a phone.
- "Cross hole Ø10 into Ø16.5 bore" read the bore as Ø10: the offline model
  overwrote the sizes the keyword reading had right. The keyword sizes now win.
  The app's own first example had the same fault.

## 1.6.0 – 2026-10-09
- Settings now shows what the AI has cost: requests this month, split between
  document readings and chat replies, the exact token counts Anthropic reported,
  and an estimated cost at published list prices.
- A month-by-month table appears once there is more than one month, and the last
  thirteen are kept.
- The tokens are exact; the money is an estimate and says so, with a link to the
  console, which is the only place that knows what was actually billed. A model
  whose rate is not known still has its tokens counted but is never given an
  invented price.

## 1.5.1 – 2026-10-08
- The AI now sees all 67 tested applications, not only the few the matcher put
  on screen, so it can answer from a real result in a material the tables alone
  would only reason about.
- It is told plainly that a measured result outranks the tables, and to name the
  case when the two disagree.

## 1.5.0 – 2026-10-08
- The AI now works from the product data itself. Every diameter, grit, speed
  window, limit and accessory it is allowed to state is generated from the same
  tables the recommendation uses, so the two cannot disagree. Written out by
  hand, a figure quietly survives the table that produced it being changed.
- Speed ceilings for the point brush, end brush, disc, diamond stone and E-Pack
  are named once and read from there by both the engine and the AI.

## 1.4.0 – 2026-10-08
- A Clear button on Find a tool. Until now the only way to start a different job
  was to reload the page, and anything read from the last one quietly stayed.
- It empties the box and forgets the job, the attachments and the AI reading,
  but keeps the machine and the unit setting: those describe the shop, not the
  job in front of you.

## 1.3.8 – 2026-10-08
- Removing the saved API key is a checkbox now, instead of typing __clear__ into
  the key box. Typing a magic word was never a reasonable way to ask for that.

## 1.3.7 – 2026-10-08
- The tool a customer names is no longer read as their part. "a 3/8 inch hone
  with ceramic abrasive fiber" was setting the workpiece material to carbide and
  the bore to 203 mm, because 3/8 was read as 8 inches and the brush's ceramic
  as the part's material. Both now stay empty and are asked about instead.
- Fractions are no longer split: the denominator of 3/8 is not a measurement.
- The AI is told the same thing: a named brush, hone or stone describes the
  tool, and its size and material never belong to the part.

## 1.3.6 – 2026-10-08
- The key box checks one thing again: that a key starting sk-ant- is present,
  which is what Anthropic's documentation states. 1.3.4 removed every check
  after two releases had refused valid keys, and the result was that the error
  message displayed above the box could itself be saved as the key.
- The rejection message no longer reads like something to paste back in.

## 1.3.5 – 2026-10-08
- A rejected key now reports how long the key it sent was, and its first and
  last characters, so it can be compared with the console. A key that arrived
  incomplete looks identical to one that is simply wrong, until you can see it.
- Added an optional Workspace ID, which Anthropic requires for a key that spans
  more than one workspace.
- The test request and the live one now build their headers the same way, so a
  passing test means the real calls will work too.

## 1.3.4 – 2026-10-08
- The key box no longer judges what a key should look like. Two releases spent
  refusing valid keys on the strength of a guessed format; the format is not
  ours to guess. The paste is cleaned and kept.
- A "Test the API key" button sends one tiny request and reports exactly what
  Anthropic answers — key rejected, wrong model name, out of credit, or working.
  That is the only check that means anything.

## 1.3.3 – 2026-10-08
- Fixed properly: a single byte that is not valid UTF-8 anywhere in the pasted
  text made the key search return nothing, so a perfectly good key was refused.
  The search is now byte-wise, ignores line breaks, and the error says how many
  characters actually arrived — 0 means the box was empty when you saved.
- The key box now asks browsers not to autofill it with a saved password.

## 1.3.2 – 2026-10-08
- Fixed: a pasted API key was rejected when it carried an invisible character,
  a smart quote, or the whole define(...) line from the instructions. The key is
  now taken out of whatever was pasted, and a key already saved survives a bad
  paste instead of being wiped.

## 1.3.1 – 2026-10-08
- The API key can now be entered on the settings screen, for sites where
  wp-config.php cannot be edited. It is stored encrypted with this site's own
  salts, so a stolen database alone cannot read it, and it is never shown back
  in the page — only the last four characters.
- wp-config.php still wins where it is set, and is still the safer place.

## 1.3.0 – 2026-10-08
- The guide's AI features now work on your own site. Until now the summary, the
  follow-up questions and reading a customer e-mail or drawing only ran inside
  the claude.ai preview; on a real site that code returned immediately and
  visitors saw none of it. A new endpoint in the plugin is that missing bridge.
- Switch it on under Settings -> UFIBER Guide, once an API key is set in
  wp-config.php. The key is never read from the database.
- Without a key, over the hourly cap, or with the network down, the guide falls
  back to its offline model and the visitor sees no error.
- The model reads language and explains. Speeds, feeds and item numbers still
  come from the guide's own tables, and it is given no way to change them.
- The app source is now in the repository under src/, with a build that
  reproduces the shipped file byte for byte.

## 1.2.1 – 2026-10-05
- Usage rows are deleted automatically after one year, by a daily scheduled job. The admin screen says so, so export anything worth keeping.
- The write endpoints now require a token this site issues for its own embedded guide, and are rate limited per visitor: 120 usage events and 10 shared applications an hour.

## 1.2.0 – 2026-10-05
- Usage data, stored in your own site and nowhere else. Settings → UFIBER usage.
- Structured usage events (task, material, tool family, item number) are written only when you switch collection on. They never contain anything a visitor typed.
- A "Send this application to NOGA" button lets someone share a description deliberately: the exact text is shown first and can be edited, and nothing is sent until they press Send.
- The standalone and offline copies send nothing at all.

## 1.1.35 – 2026-10-05
- The stroke figure now says where it comes from: the cross hole plus 5 mm clear on each side.

## 1.1.34 – 2026-10-05
- Clarifying questions now follow the language of the job description. A Czech e-mail signature under an English request was switching the questions to Czech while the rest stayed English.
- A cross-hole reading no longer shows a third diameter chip that just repeats the cross hole.

## 1.1.32 – 2026-10-05
- Outlook .msg files are now parsed properly. They were read as raw bytes, which produced bore diameters that were not in the message at all.
- Phone numbers, e-mail addresses and web domains in a signature no longer count as job details: +420 was being read as 420 stainless, and a cncbastards.cz address as a CNC machine.
- The model no longer supplies a material or machine unless the text actually mentions one. An empty chip you can tap beats a wrong value that changes every speed.

## 1.1.30 – 2026-10-05
- The grit chart is now presented as a starting point, and a result proven on a part takes precedence over it.
- When a tested application in the same material used a different grit from the recommendation, the result says so.

## 1.1.29 – 2026-10-05
- Added the UF2670 aluminum cross-hole application: Ø7 #1000 through a Ø12.4 mm bore, 68 mm deep, at 6,000 RPM and 480 mm/min.

## 1.1.28 – 2026-10-05
- Reverts 1.1.27. The app content is identical to 1.1.26; the case-study additions have been removed.

## 1.1.27 – 2026-10-04
- Case matches now show the grit one step coarser and one step finer, with the parameter change each needs, from the NOGA test records.

## 1.1.26 – 2026-10-04
- Learn gained a section on reducing burr size at source: cutter condition, edge angle, cutter style, rotation direction, order of operations, and the effect of feed and depth.

## 1.1.25 – 2026-10-04
- Learn gained a technique section: sizing the brush to the surface, why more passes beat a slower feed, which way to rotate, and working a heavy burr down in stages.
- Surface jobs now say when the chosen brush is narrower than the face.
- Cross-hole advice is specific: take the speed to maximum first, then add passes, and the two stroke directions are explained.

## 1.1.24 – 2026-10-04
- Corrected the finish advice: a faster feed does not give a finer finish. NOGA's polishing feed is below the deburring feed in every material row.
- Learn gained the four ways to turn the process up or down, with the limits that cap each one.

## 1.1.23 – 2026-10-04
- Fixed: the "Right / Too deep" captions on the engagement diagram ran past the edge and were cut off. They now sit above each illustration and fit.

## 1.1.22 – 2026-10-04
- Ceramic fiber disc: the safety and maintenance guidance from NOGA MT is now carried in the app — guarding, inspection before use, run-out check, dust extraction to protect guideways, and dressing only with a diamond dressing tool. Learn gained a disc section.

## 1.1.19 – 2026-10-04
- On the Products page the photo now shows the fibers in the colour of the grit you pick, so the picture matches the item number.

## 1.1.18 – 2026-10-04
- Ceramic fiber disc photo restored to its upright orientation; the sleeve is presented at a gentler angle.

## 1.1.17 – 2026-10-04
- Grit swatches now use the real fiber colors rather than the catalogue colour names, so #800 reads teal, #1000 cream and #2000 khaki as the product actually looks.
- Products page shows the official grit progression graphic, and the sleeve and disc photos are angled to match the other product shots.

## 1.1.16 – 2026-10-04
- Photos added for the face sleeve and the BT-type floating damper. Every card on the Products page now shows a real NOGA MT product photo.

## 1.1.15 – 2026-10-04
- Official NOGA MT photos for the 90° angled end brush, ceramic fiber disc, ceramic diamond stone and the Portable E-Pack. Every product card now shows a real photo.

## 1.1.14 – 2026-10-04
- The item decoder now recognises sleeves, shanks, disc clamping shanks, floating dampers and the E-Pack, and no longer reads a disc shank (UF7030) as a disc. Codes outside the disc grit range are rejected.

## 1.1.13 – 2026-10-04
- Products page now shows the correct isolated product photo for each family, with nothing cropped; the two end-brush cards no longer share one picture. Grit scale caption no longer clipped.

## 1.1.12 – 2026-10-04
- Fixed: the ceramic fiber disc could be offered in grits finer than #1000, which NOGA does not make. It now stays within #150–#1000.

## 1.1.11 – 2026-10-04
- The offline cache name is stamped with the release version again, so an installed copy no longer keeps serving an older build.

## 1.1.10 – 2026-10-04
- Fixed: the offline cache name was not being updated on release, so an installed copy could keep serving the previous build.

## 1.1.9 – 2026-10-04
- Releases can now be published from the Actions tab with nothing to edit or upload.

## 1.1.8 – 2026-10-04
- Products page now shows the NOGA MT application photos and the catalogue grit scale.
- "Copy link to this setup" shares a recommendation; the link reopens it, on the site or standalone.
- The guide can be installed and used with no connection when opened as its own page.

## 1.1.7 – 2026-10-04
- Pressing "Read my application" with an empty box now says what to type instead of doing nothing.
- Added a skip-to-content link and keyboard focus handling, so the guide can be used without a mouse.

## 1.1.6 – 2026-10-04
- The settings screen now installs an available update directly, instead of only linking to the Plugins screen.

## 1.1.5 – 2026-10-04
- Fixed: a release could stay invisible to sites if the version in the repository was not bumped before tagging. The release builder now stamps the version into the source, and the update check falls back to the release tag.

## 1.1.4 – 2026-10-04
- Home page now shows the four NOGA MT application photos from the UFIBER catalogue instead of drawn tools, and they also appear on phones.

## 1.1.3 – 2026-10-04
- Update check no longer reports a failure when a release was found but a side request to GitHub failed.

## 1.1.2 – 2026-10-04
- Version and build date shown in a footer, on screen and on printed setup sheets.

## 1.1.1 – 2026-10-04
- Cross-hole animation: the counter-clockwise phase now runs both strokes, matching the clockwise phase.

## 1.1.0 – 2026-10-04
- Built-in offline UFIBER model: reads a job description in 13 languages and answers questions about the setup on the device, with no API.

## 1.0.0 – 2026-10-04
- First release.
