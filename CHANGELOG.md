# Changelog

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
