/* Build reproducibility: rebuilds the site from source/ and compares it with the files committed at the repository root
   (index.html, sw.js, manifest.webmanifest), ignoring only the build id. Exit 1 when the committed build is stale.
   The minified output depends on the terser/lightningcss versions: a mismatch can also mean different tool versions. */
const fs = require("fs"), path = require("path"), H = require("./lib/harness");
const norm = (s, f) => f === "sw.js" ? s.replace(/engine-\d{12}/g, "engine-BUILD") : s.replace(/(name="engine-build" content=")\d{12}/, "$1BUILD");
const FILES = ["index.html", "sw.js", "manifest.webmanifest"], out = H.build(H.tmp("check-build"), { min: true });
let stale = 0, checked = 0;
for (const f of FILES) {
  const a = norm(fs.readFileSync(path.join(out, f), "utf8"), f), b = norm(fs.readFileSync(path.join(H.ROOT, f), "utf8"), f); checked++;
  if (a === b) { console.log("ok    ", f, "matches source"); continue; }
  stale++; let i = 0; while (i < a.length && a[i] === b[i]) i++;
  console.log("STALE ", f, `differs from a fresh build (first difference at byte ${i}; sizes built ${a.length} / committed ${b.length})`);
}
if (checked !== FILES.length) { console.error("check-build did not compare every file"); process.exit(2); }   // an empty or truncated script must never look like a pass
process.exit(stale ? 1 : 0);
