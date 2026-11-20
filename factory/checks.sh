#!/usr/bin/env bash
# The repo's checks. Exit 0 only when the branch is fit to review.
#
# The gate runs this script from the main checkout with the job's worktree as
# the working directory. ZonePlanner is plain static HTML/CSS/JS with no build
# step, no dependencies and no test suite, so the checks are:
#   1. every .js file parses (node --check)
#   2. every local file index.html references (href/src) exists
#   3. styles.css has balanced braces and every url() it uses exists
#   4. the page has its required ids that app.js looks up
set -euo pipefail

fail=0

echo "== JS syntax"
while IFS= read -r f; do
  node --check "$f" || fail=1
done < <(git ls-files '*.js' ':!:factory/*' ':!:.claude/*')

echo "== Static references"
python3 -I - <<'PY' || fail=1
import os, re, sys
bad = []
html = open("index.html", encoding="utf-8").read()
for ref in re.findall(r'(?:href|src)="([^"#][^"]*)"', html):
    if re.match(r'^(?:[a-z]+:|//)', ref):
        continue
    path = ref.split("?")[0].split("#")[0]
    if path and not os.path.exists(path):
        bad.append(f"index.html -> {ref}")
css = open("styles.css", encoding="utf-8").read()
stripped = re.sub(r'/\*.*?\*/', '', css, flags=re.S)
if stripped.count("{") != stripped.count("}"):
    bad.append(f"styles.css: unbalanced braces ({stripped.count('{')} open, {stripped.count('}')} close)")
for ref in re.findall(r'url\(\s*["\']?([^"\')]+)["\']?\s*\)', stripped):
    if ref.startswith(("data:", "#", "http:", "https:")):
        continue
    if not os.path.exists(os.path.join(os.path.dirname("styles.css"), ref.split("?")[0])):
        bad.append(f"styles.css -> {ref}")
js = open("app.js", encoding="utf-8").read()
ids = set(re.findall(r'id="([^"]+)"', html))
for ident in sorted(set(re.findall(r'(?:getElementById|\$)\(\s*["\']([A-Za-z][\w-]*)["\']\s*\)', js))):
    if ident not in ids:
        bad.append(f"app.js looks up #{ident}, which index.html does not define")
for b in bad:
    print("FAIL", b, file=sys.stderr)
sys.exit(1 if bad else 0)
PY

if [ "$fail" -ne 0 ]; then
  echo "checks failed" >&2
  exit 1
fi
echo "all checks passed"
