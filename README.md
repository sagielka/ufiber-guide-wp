# NOGA MT – UFIBER Guide for Elementor

WordPress plugin: the UFIBER Guide as an Elementor widget and a `[ufiber_guide]` shortcode.
Tool selector, speeds & feeds, troubleshooter, XEBEC converter, product builder, and a
built-in offline model that reads a job description in 13 languages — all on the device,
with no API.

**This repository is the plugin.** The files at the root are what gets installed.

| Path | What it is |
|---|---|
| `noga-ufiber-guide.php` | main plugin file (version lives here) |
| `includes/` | widget, settings screen, updater |
| `assets/app/ufiber-guide.html` | the guide itself, model included |
| `vendor/plugin-update-checker/` | update library (MIT, Janis Elsts) |
| `tools/build_release.py` | builds the installable zip |
| `tools/push_release.py` | publishes a release via the GitHub API |
| `CHANGELOG.md` | edited by hand; feeds the plugin readme |

## Installing

Download the zip from the latest [release](../../releases) and upload it in
WordPress under **Plugins → Add New → Upload Plugin**. Then open
**Settings → UFIBER Guide**.

Updates come from this repository automatically — the URL is compiled into the plugin,
so there is nothing to configure.

## Releasing a new version

1. Make the change and add a line at the top of `CHANGELOG.md`.
2. Build the zip:

       python3 tools/build_release.py --version 1.1.4

   This writes `dist/noga-ufiber-guide-1.1.4.zip` and sets the version in the plugin
   header, the constant, the readme and the app's footer, so they cannot drift apart.
3. Publish it: **Releases → Draft a new release**, tag `v1.1.4`, **attach the zip**,
   Publish.

   With `.github/workflows/release.yml` in place, pushing the tag does steps 2 and 3
   for you: `git tag v1.1.4 && git push --tags`.

### Three things that silently stop updates

* A **draft** or **pre-release** — the plugin skips both.
* A tag that is **not higher** than the installed version.
* **No zip attached.** WordPress would fall back to GitHub's source archive, whose
  folder name is wrong, and the install would break.

## Notes

* The version number must only ever go up.
* The guide runs in a sandboxed frame, so it cannot clash with a theme, and it sends
  nothing anywhere.
* Removing the plugin deletes its settings (`uninstall.php`).
