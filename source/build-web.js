/* node source/build-web.js [out] [nomin]: builds the site from source/ (default out: the repository root).
   terser and lightningcss come from NODE_MODULES (a node_modules folder path) or the usual lookup. */
const fs = require("fs"), path = require("path");
const M = process.env.NODE_MODULES ? process.env.NODE_MODULES.replace(/\/?$/, "/") : "";
const { minify } = require(M + "terser"); const css = require(M + "lightningcss");
const ROOT = path.resolve(__dirname, ".."), SRC = __dirname, W = path.join(SRC, "web");
const OUT = path.resolve(process.argv[2] || ROOT), MIN = process.argv[3] !== "nomin";
const cp = (a, b) => { fs.mkdirSync(path.dirname(b), { recursive: true }); fs.copyFileSync(a, b); };
const cpdir = (a, b) => { for (const f of fs.readdirSync(a)) { const p = path.join(a, f), q = path.join(b, f); fs.statSync(p).isDirectory() ? cpdir(p, q) : cp(p, q); } };
(async () => {
  let s = fs.readFileSync(path.join(SRC, "engine.html"), "utf8");
  const R = (a, b) => { if (!s.includes(a)) throw new Error("missing: " + a.slice(0, 60)); s = s.split(a).join(b); };
  R('"https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js"', 'new URL("vendor/tesseract.min.js", location.href).href');
  // css (every <style> block before the main script is minified) and main script
  const first = s.indexOf("<script>");
  if (MIN) s = s.slice(0, first).replace(/<style>([\s\S]*?)<\/style>/g, (m, c) => "<style>" + css.transform({ filename: "a.css", code: Buffer.from(c), minify: true, errorRecovery: true }).code.toString() + "</style>") + s.slice(first);
  const j = s.indexOf("<script>"), k = s.lastIndexOf("</script>");
  let main = s.slice(j + 8, k);
  const pre = fs.readFileSync(W + "/shim.js", "utf8"), post = fs.readFileSync(W + "/icu-direct.js", "utf8") + "\n" + fs.readFileSync(W + "/after.js", "utf8");
  const mz = async c => MIN ? (await minify(c, { compress: { passes: 1, keep_fnames: true, keep_classnames: true }, mangle: { toplevel: false }, format: { comments: false }, ecma: 2020 })).code : c;
  main = await mz(main);
  s = s.slice(0, j) + `<script>${await mz(pre)}</script>\n<script>` + main + `</script>\n<script>${await mz(post)}</script>` + s.slice(k + 9);
  const build = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 12);
  const head = `<meta name="theme-color" content="#18181B"><link rel="manifest" href="manifest.webmanifest"><link rel="icon" href="icons/favicon-32.png"><link rel="apple-touch-icon" href="icons/apple-180.png"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"><meta name="apple-mobile-web-app-title" content="Engine"><meta name="engine-build" content="${build}"><script src="config.js"></script><script src="vendor/supabase.js"></script>`;
  s = s.replace("<head>", "<head>" + head);
  fs.mkdirSync(OUT, { recursive: true });
  /* the page runs its own inline scripts by hash instead of 'unsafe-inline': markup that slips in (an event attribute in a hostile id or name) cannot run code */
  const sha = c => "'sha256-" + require("crypto").createHash("sha256").update(c, "utf8").digest("base64") + "'";
  R("script-src 'self' 'unsafe-inline'", "script-src 'self' " + [...s.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => sha(m[1])).join(" "));
  fs.writeFileSync(OUT + "/index.html", s);
  /* the heavy caches (libraries, label reader, icons) are each named after what is in their folder: a changed file reaches installed copies, an unchanged group is not downloaded again (a new icon does not cost the ~9 MB label reader) */
  const groupHash = d => { const hash = require("crypto").createHash("sha1"), walk = x => { for (const f of fs.readdirSync(x).sort()) { const p = path.join(x, f); if (fs.statSync(p).isDirectory()) walk(p); else hash.update(path.relative(ROOT, p) + "\0").update(fs.readFileSync(p)); } }; walk(path.join(ROOT, d)); return hash.digest("hex").slice(0, 10); };
  fs.writeFileSync(OUT + "/sw.js", fs.readFileSync(W + "/sw.js", "utf8").replace("__BUILD__", build).replace("__LIB__", groupHash("vendor")).replace("__OCR__", groupHash("ocr")).replace("__ICO__", groupHash("icons")));
  cp(W + "/manifest.webmanifest", OUT + "/manifest.webmanifest");
  /* static assets (icons, libraries, label reader, schema) live at the repository root; copy them for other outputs */
  if (OUT !== ROOT) for (const d of ["icons", "vendor", "ocr", "supabase"]) cpdir(path.join(ROOT, d), path.join(OUT, d));
  if (!fs.existsSync(OUT + "/config.js")) fs.copyFileSync(W + "/config.js", OUT + "/config.js");
  fs.copyFileSync(W + "/pushup-test.html", OUT + "/pushup-test.html");   // standalone motion-sensor check for the push-up counter (docs/PRODUCT_REQUIREMENTS.md I4, L27)
  /* standalone live-weight check for the S400 scale (docs/SCALE_LIVE.md, L217): its one inline script runs by hash, and the page has no network access at all (connect-src 'none') */
  const scale = fs.readFileSync(W + "/scale-live.html", "utf8"), scaleJs = [...scale.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  if (scaleJs.length !== 1 || !scale.includes("script-src 'unsafe-inline'")) throw new Error("scale-live.html: expected one inline script and script-src 'unsafe-inline'");
  fs.writeFileSync(OUT + "/scale-live.html", scale.replace("script-src 'unsafe-inline'", "script-src " + sha(scaleJs[0][1])));
  fs.writeFileSync(OUT + "/.nojekyll", "");
  console.log("built", OUT, "index", s.length, "build", build);
})();
