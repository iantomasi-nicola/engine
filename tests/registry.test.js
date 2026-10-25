/* A name registered twice in ACT, CHG or INP means the later definition silently replaces the earlier one: a button of one feature then runs the code of another
   (this hid a «+ Race» button and the ingredient remover of the recipe editor for several milestones). Wrappers that call the previous handler are fine. */
const test = require("node:test"), assert = require("node:assert/strict"), fs = require("fs"), path = require("path");
test("no ACT / CHG / INP handler is defined twice unless the later one wraps the earlier", () => {
  const lines = fs.readFileSync(path.join(__dirname, "..", "source", "engine.html"), "utf8").split("\n"), seen = {}, KNOWN = new Set(["ACT.export"]);   // KNOWN: an old export button replaced by the backup save; listed in docs/CLEANUP_REPORT.md
  lines.forEach((l, i) => { for (const kind of ["ACT", "CHG", "INP"]) { const re = new RegExp(kind + "(?:\\[\"([^\"]+)\"\\]|\\.([A-Za-z_]\\w*))\\s*=(?!=)", "g"); let m;
    while ((m = re.exec(l))) { const k = m[1] || m[2], ref = new RegExp(kind + "(?:\\[\"" + k.replace(/[-.]/g, "\\$&") + "\"\\]|\\." + k.replace(/[-.]/g, "\\$&") + "\\b)", "g"), near = (lines[i - 1] || "") + "\n" + l + "\n" + (lines[i + 1] || ""), n = (near.match(ref) || []).length; if (n >= 2) continue; (seen[kind + "." + k] = seen[kind + "." + k] || []).push(i + 1); } } });
  const dup = Object.entries(seen).filter(([k, v]) => v.length > 1 && !KNOWN.has(k)).map(([k, v]) => `${k} at lines ${v.join(", ")}`);
  assert.deepEqual(dup, [], "duplicate handler names: " + dup.join("; "));
});
