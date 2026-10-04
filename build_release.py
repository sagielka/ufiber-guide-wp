#!/usr/bin/env python3
"""
Build an installable, updatable release of the NOGA MT UFIBER Guide plugin.

  python3 build_release.py --version 1.1.0 --base-url https://www.example.com/updates/ufiber-guide \
        --app ../ufiber-guide.html --changelog "Updated speeds & feeds tables."
  python3 build_release.py --version 1.1.0            # zip only (GitHub releases)

Writes into ./dist:
  noga-ufiber-guide-<version>.zip   upload this to your server (or attach it to a GitHub release)
  update.json                       the manifest the plugin checks; upload it next to the zip (only with --base-url)
Nothing is uploaded for you. See README.md.
"""
import argparse, datetime, hashlib, html, json, pathlib, re, shutil, sys, tempfile, zipfile

SLUG = "noga-ufiber-guide"
HERE = pathlib.Path(__file__).resolve().parent

def die(msg):
    sys.exit("error: " + msg)

def parse_args():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--version", required=True, help="new version, e.g. 1.1.0 (must be higher than the installed one)")
    p.add_argument("--base-url", default="", help="public folder URL where the zip will be uploaded (no trailing slash). Omit for GitHub-only setups: only the zip is built")
    p.add_argument("--app", help="new ufiber-guide.html to ship (default: the one already in the plugin)")
    p.add_argument("--changelog", default="", help="one-line description of what changed (added to CHANGELOG.md)")
    p.add_argument("--src", default=str(HERE / SLUG), help="plugin source folder")
    p.add_argument("--out", default=str(HERE / "dist"), help="output folder")
    p.add_argument("--default-update-url", default="https://github.com/sagielka/ufiber-guide-wp",
                   help="update source baked into the build; defaults to the GitHub repo releases are published to. Pass \'\' to build without one.")
    p.add_argument("--tested", default="6.8", help="WordPress version tested up to")
    return p.parse_args()

def sub_once(text, pattern, repl, what):
    new, n = re.subn(pattern, repl, text, count=1, flags=re.M)
    if n != 1:
        die("could not find %s in the plugin source" % what)
    return new

def changelog_html(md):
    out, in_list = [], False
    for line in md.splitlines():
        m = re.match(r"^##\s+(.+)$", line)
        if m:
            if in_list: out.append("</ul>"); in_list = False
            out.append("<h4>%s</h4>" % html.escape(m.group(1)))
        elif re.match(r"^\s*[-*]\s+", line):
            if not in_list: out.append("<ul>"); in_list = True
            out.append("<li>%s</li>" % html.escape(re.sub(r"^\s*[-*]\s+", "", line)))
    if in_list: out.append("</ul>")
    return "".join(out)

def main():
    a = parse_args()
    if not re.fullmatch(r"\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.]+)?", a.version):
        die("version must look like 1.2.3")
    base = a.base_url.rstrip("/")
    src, out = pathlib.Path(a.src), pathlib.Path(a.out)
    if not (src / (SLUG + ".php")).exists():
        die("plugin source not found at %s" % src)

    out.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        work = pathlib.Path(tmp) / SLUG
        shutil.copytree(src, work, ignore=shutil.ignore_patterns(".DS_Store", "*.zip", "__pycache__", ".git*"))

        # 1. new app
        if a.app:
            app = pathlib.Path(a.app)
            if not app.exists(): die("app file not found: %s" % app)
            text = app.read_text(encoding="utf-8")
            if "<title>" not in text or "UFIBER" not in text: die("that file does not look like the UFIBER Guide")
            shutil.copyfile(app, work / "assets" / "app" / "ufiber-guide.html")

        # 1b. keep the app's displayed version in step with the plugin
        app_file = work / "assets" / "app" / "ufiber-guide.html"
        if app_file.exists():
            txt = app_file.read_text(encoding="utf-8")
            new, n = re.subn(r"(const APP_VERSION = ')[^']*(')", r"\g<1>%s\g<2>" % a.version, txt, count=1)
            if n:
                new = re.sub(r"(const APP_BUILT = ')[^']*(')",
                             r"\g<1>%s\g<2>" % datetime.date.today().isoformat(), new, count=1)
                app_file.write_text(new, encoding="utf-8")
            else:
                print("warning: APP_VERSION not found in the app; its footer will show the old version")

        # 2. version numbers
        main_php = work / (SLUG + ".php")
        t = main_php.read_text(encoding="utf-8")
        t = sub_once(t, r"^(\s*\*\s*Version:\s*).+$", r"\g<1>%s" % a.version, "the Version header")
        t = sub_once(t, r"(define\(\s*'NUFG_VERSION',\s*')[^']+('\s*\);)", r"\g<1>%s\g<2>" % a.version, "NUFG_VERSION")
        if a.default_update_url:
            t = sub_once(t, r"(define\(\s*'NUFG_DEFAULT_UPDATE_URL',\s*')[^']*('\s*\);)", r"\g<1>%s\g<2>" % a.default_update_url.replace("\\", ""), "NUFG_DEFAULT_UPDATE_URL")
        main_php.write_text(t, encoding="utf-8")

        # 3. changelog (kept in CHANGELOG.md next to this script and in readme.txt)
        cl_path = HERE / "CHANGELOG.md"
        cl = cl_path.read_text(encoding="utf-8") if cl_path.exists() else "# Changelog\n"
        today = datetime.date.today().isoformat()
        if a.changelog and ("## %s " % a.version) not in cl and ("## %s\n" % a.version) not in cl:
            head, _, rest = cl.partition("\n")
            cl = head + "\n\n## %s – %s\n- %s\n" % (a.version, today, a.changelog.strip()) + rest
            cl_path.write_text(cl, encoding="utf-8")
        readme = work / "readme.txt"
        r = readme.read_text(encoding="utf-8")
        r = sub_once(r, r"^Stable tag:.*$", "Stable tag: %s" % a.version, "Stable tag")
        r = r.split("== Changelog ==")[0] + "== Changelog ==\n" + "\n".join(
            ("= %s =" % m.group(1)) if (m := re.match(r"^##\s+(\S+)", l)) else ("* " + re.sub(r"^\s*[-*]\s+", "", l)) if re.match(r"^\s*[-*]\s+", l) else ""
            for l in cl.splitlines() if l.startswith("##") or re.match(r"^\s*[-*]\s+", l)) + "\n"
        readme.write_text(r, encoding="utf-8")

        # 4. zip, top folder = slug
        zip_name = "%s-%s.zip" % (SLUG, a.version)
        zip_path = out / zip_name
        if zip_path.exists(): zip_path.unlink()
        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
            for f in sorted(work.rglob("*")):
                if f.is_file():
                    z.write(f, pathlib.PurePosixPath(SLUG, *f.relative_to(work).parts))

    digest = hashlib.sha256(zip_path.read_bytes()).hexdigest()
    print("Built %s (%.0f KB)\n  sha256 %s" % (zip_name, zip_path.stat().st_size / 1024, digest))
    if not base:
        print("\nNo --base-url given, so no update.json was written (fine for GitHub releases: attach the zip to the release).")
        return
    manifest = {
        "name": "NOGA MT – UFIBER Guide for Elementor",
        "slug": SLUG,
        "version": a.version,
        "download_url": "%s/%s" % (base, zip_name),
        "homepage": "https://www.noga.com/nogamt/ufiber-ceramic-brush/",
        "author": "NOGA MT",
        "requires": "5.8",
        "tested": a.tested,
        "requires_php": "7.4",
        "last_updated": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
        "sections": {
            "description": "<p>The UFIBER Guide as an Elementor widget and shortcode: tool selector, speeds &amp; feeds, troubleshooter, XEBEC converter and product builder.</p>",
            "changelog": changelog_html(cl),
        },
    }
    (out / "update.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print("  manifest: %s/update.json" % base)
    print("\nUpload %s and update.json to %s/ and sites will see version %s." % (zip_name, base, a.version))

if __name__ == "__main__":
    main()
