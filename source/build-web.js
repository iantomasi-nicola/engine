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
  R('<script src="web/inventory.js"></script>\n', "");
  R("Saved to your Claude account and synced on every device where you open this page.", "Saved to your Engine account and synced on every device where you sign in.");
  R("Saved in this browser only. Open the page inside Claude while signed in to sync.", "Saved on this device only. Sign in (Settings → Account) to sync phone and computer.");
  R('"https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js"', 'new URL("vendor/tesseract.min.js", location.href).href');
  s = s.replace(/\bClaude's\b/g, "the AI's").replace(/\bClaude\b(?! Code Remote)/g, "AI").replace(/Ask AI/g, "Ask the AI").replace(/Amounts are AI/g, "Amounts are the AI");
  // main script + css (minified)
  const a = s.indexOf("<style>", 200), b = s.indexOf("</style>", a);
  if (MIN) { const cm = css.transform({ filename: "a.css", code: Buffer.from(s.slice(a + 7, b)), minify: true, errorRecovery: true }); s = s.slice(0, a + 7) + cm.code.toString() + s.slice(b); }
  const j = s.indexOf("<script>"), k = s.lastIndexOf("</script>");
  let main = s.slice(j + 8, k);
  const pre = fs.readFileSync(W + "/inventory.js", "utf8") + "\n" + fs.readFileSync(W + "/shim.js", "utf8"), post = fs.readFileSync(W + "/icu-direct.js", "utf8") + "\n" + fs.readFileSync(W + "/after.js", "utf8");
  const mz = async c => MIN ? (await minify(c, { compress: { passes: 1, keep_fnames: true, keep_classnames: true }, mangle: { toplevel: false }, format: { comments: false }, ecma: 2020 })).code : c;
  main = await mz(main);
  s = s.slice(0, j) + `<script>${await mz(pre)}</script>\n<script>` + main + `</script>\n<script>${await mz(post)}</script>` + s.slice(k + 9);
  const build = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 12);
  const head = `<meta name="theme-color" content="#18181B"><link rel="manifest" href="manifest.webmanifest"><link rel="icon" href="icons/favicon-32.png"><link rel="apple-touch-icon" href="icons/apple-180.png"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"><meta name="apple-mobile-web-app-title" content="Engine"><meta name="engine-build" content="${build}"><script src="config.js"></script><script src="vendor/supabase.js"></script>`;
  s = s.replace("<head>", "<head>" + head);
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(OUT + "/index.html", s);
  fs.writeFileSync(OUT + "/sw.js", fs.readFileSync(W + "/sw.js", "utf8").replace("__BUILD__", build));
  cp(W + "/manifest.webmanifest", OUT + "/manifest.webmanifest");
  /* static assets (icons, libraries, label reader, schema) live at the repository root; copy them for other outputs */
  if (OUT !== ROOT) for (const d of ["icons", "vendor", "ocr", "supabase"]) cpdir(path.join(ROOT, d), path.join(OUT, d));
  if (!fs.existsSync(OUT + "/config.js")) fs.copyFileSync(W + "/config.js", OUT + "/config.js");
  fs.writeFileSync(OUT + "/.nojekyll", "");
  console.log("built", OUT, "index", s.length, "build", build);
})();
