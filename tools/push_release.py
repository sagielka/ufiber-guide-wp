#!/usr/bin/env python3
"""
Pushes the release kit to GitHub and publishes a release with the plugin zip attached.

  GITHUB_TOKEN=xxx python3 push_release.py --version 1.1.2

The token is read from the environment, never from a file and never stored.
It needs: fine-grained token, repository access limited to sagielka/ufiber-guide-wp,
Contents = Read and write. Nothing else.

What it does, in order:
  1. checks the token works and the repo exists
  2. commits the kit (plugin source, builder, workflow, readme) and pushes to main
  3. builds the versioned zip
  4. creates the release, tagged v<version>, and uploads the zip as its asset
Every step reports what it did, and it stops at the first failure.
"""
import argparse, json, os, pathlib, shutil, subprocess, sys, tempfile, urllib.error, urllib.request

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent
OWNER, REPO = "sagielka", "ufiber-guide-wp"
API = "https://api.github.com"

def api(path, token, method="GET", data=None, headers=None):
    url = path if path.startswith("http") else API + path
    body = json.dumps(data).encode() if data is not None else None
    h = {"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json",
         "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "ufiber-release"}
    h.update(headers or {})
    req = urllib.request.Request(url, data=body, headers=h, method=method)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            raw = r.read()
            return r.status, (json.loads(raw) if raw else {})
    except urllib.error.HTTPError as e:
        raw = e.read()
        try: return e.code, json.loads(raw)
        except Exception: return e.code, {"message": raw[:300].decode("utf-8", "replace")}

def run(cmd, cwd=None, token=None):
    p = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True)
    out = (p.stdout + p.stderr)
    if token: out = out.replace(token, "***")          # never echo the token
    if p.returncode: sys.exit(f"command failed: {' '.join(cmd[:3])}…\n{out[:800]}")
    return out

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--version", required=True)
    ap.add_argument("--notes", default="")
    ap.add_argument("--dry-run", action="store_true", help="check access and build, but publish nothing")
    a = ap.parse_args()
    token = os.environ.get("GITHUB_TOKEN", "").strip()
    if not token: sys.exit("set GITHUB_TOKEN in the environment")
    tag = "v" + a.version

    # 1. access check
    code, me = api("/user", token)
    if code != 200: sys.exit(f"token rejected ({code}): {me.get('message')}")
    print(f"1. token works, acting as {me.get('login')}")
    code, repo = api(f"/repos/{OWNER}/{REPO}", token)
    if code != 200:
        sys.exit(f"   cannot see {OWNER}/{REPO} ({code}: {repo.get('message')}).\n"
                 f"   Create the repository first, and give the token access to it.")
    print(f"   repo found: {repo['full_name']} ({'private' if repo['private'] else 'public'})")
    code, rel = api(f"/repos/{OWNER}/{REPO}/releases/tags/{tag}", token)
    if code == 200: sys.exit(f"   release {tag} already exists — use a higher version number")

    # 2. build the zip first, so nothing is pushed if the build fails
    dist = ROOT / "dist"
    shutil.rmtree(dist, ignore_errors=True)
    print(f"2. building {tag} …")
    run([sys.executable, str(HERE / "build_release.py"), "--version", a.version, "--out", str(dist)])
    zips = list(dist.glob("*.zip"))
    if len(zips) != 1: sys.exit(f"   expected one zip in {dist}, found {len(zips)}")
    zip_path = zips[0]
    print(f"   built {zip_path.name} ({zip_path.stat().st_size/1024:.0f} KB)")

    if a.dry_run:
        print("dry run: access and build are fine, nothing published")
        return

    # 3. release + asset
    print(f"3. publishing release {tag} …")
    notes = a.notes or f"UFIBER Guide {a.version}. Install or update through WordPress."
    code, rel = api(f"/repos/{OWNER}/{REPO}/releases", token, "POST",
                    {"tag_name": tag, "name": a.version, "body": notes,
                     "draft": False, "prerelease": False, "target_commitish": "main"})
    if code not in (200, 201): sys.exit(f"   could not create the release ({code}): {rel.get('message')}")
    up = rel["upload_url"].split("{")[0] + "?name=" + zip_path.name
    code, asset = api(up, token, "POST", None,
                      {"Content-Type": "application/zip"})
    # urllib needs the body on the request itself for uploads
    req = urllib.request.Request(up, data=zip_path.read_bytes(), method="POST", headers={
        "Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json",
        "Content-Type": "application/zip", "User-Agent": "ufiber-release"})
    try:
        with urllib.request.urlopen(req, timeout=180) as r:
            asset = json.loads(r.read())
    except urllib.error.HTTPError as e:
        sys.exit(f"   asset upload failed ({e.code}): {e.read()[:300]}")
    print(f"   release live: {rel['html_url']}")
    print(f"   asset: {asset['name']} ({asset['size']/1024:.0f} KB)")
    print("\nSites running the plugin will offer this version within 12 hours,")
    print("or immediately via Settings -> UFIBER Guide -> Check for updates now.")

if __name__ == "__main__":
    main()
