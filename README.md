# NOGA MT – UFIBER Guide for Elementor: release kit

This folder contains the WordPress plugin (`noga-ufiber-guide/`) and the tool that builds updatable releases.

## 1. Install the plugin (first time)
1. Build the zip: `python3 build_release.py --version 1.0.0` -> `dist/noga-ufiber-guide-1.0.0.zip`
   (or use the ready-made `noga-ufiber-guide-1.0.0.zip` shipped next to this kit).
2. WordPress admin -> Plugins -> Add New -> Upload Plugin -> choose the zip -> Activate.
3. Elementor: drag the **UFIBER Guide** widget (category **NOGA MT**) onto a page.
   Without Elementor: `[ufiber_guide]`, `[ufiber_guide tab="speeds" units="inch"]`, `[ufiber_guide height="900"]`, `[ufiber_guide brand="no"]`.
4. Settings -> UFIBER Guide: set defaults and the **update source** (see below).

Shortcode options: `tab` = find, speeds, fix, replace, learn, products - `units` = mm, inch - `height` = auto, 900, 90vh - `brand` = yes/no - `min_height` = 560.

## 2. Choose how sites get updates
Pick one. Sites check every 12 hours; the update then appears under Dashboard -> Updates and Plugins, where
"Enable auto-updates" can be switched on. Settings are kept.

### A. A file on your own server (simplest)
1. Choose a public https folder, for example `https://www.noga.com/wp-content/uploads/ufiber-guide-updates`.
2. Build: `python3 build_release.py --version 1.1.0 --base-url <that folder> --app path/to/ufiber-guide.html --changelog "What changed"`
3. Upload **both** `dist/noga-ufiber-guide-1.1.0.zip` and `dist/update.json` to that folder.
4. On each site: Settings -> UFIBER Guide -> *Update manifest* -> `<that folder>/update.json`.
   To pre-set it for every build, add `--default-update-url <that folder>/update.json`
   (or put `define('NUFG_DEFAULT_UPDATE_URL', '...');` in wp-config.php).

### B. GitHub releases
1. Put this kit in a GitHub repository (the workflow in `.github/workflows/release.yml` is included).
2. Update the app/plugin, commit, then tag: `git tag v1.1.0 && git push --tags`.
   GitHub builds the zip and attaches it to the release.
3. On each site: Settings -> UFIBER Guide -> *GitHub releases* -> `owner/repo`. A private repository needs an access token (read-only "Contents" permission).

## 3. Shipping a new version of the guide
Export the new `ufiber-guide.html`, then run `build_release.py --version <higher number> --app <file> --changelog "..."` and publish as above.
The version must be higher than the one installed, otherwise WordPress ignores it.
The browser cache is refreshed automatically because the version number is part of the guide's address.

## Things to know
* The guide runs inside a sandboxed frame. It sends nothing to NOGA or to WordPress.
* The AI reading of descriptions/emails and the "Ask about this setup" chat need Claude's runtime and are hidden on a WordPress site. Everything else works.
* Printing the setup sheet works from the frame; the page header is not part of the printout.
* Removing the plugin deletes its settings (uninstall.php).
* Bundled library: Plugin Update Checker 5.6 by Janis Elsts (MIT) in `vendor/plugin-update-checker/`.
