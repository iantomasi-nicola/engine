const H = require("/home/user/engine/tests/lib/harness"), F = require("/home/user/engine/tests/fixtures/synthetic");
const dir = "/tmp/claude-0/-home-user-engine/6816350e-9d20-5f6c-bcb6-ee628e7104f5/scratchpad/build";
async function run(fn, opts = {}) {
  const app = await H.startApp({ dir, seed: F.seed({ withPlan: false, withPantry: true, ...opts.seed }), viewport: opts.vp || H.VIEWPORTS.desktop });
  try { const r = await fn(app.page, app); console.log(JSON.stringify(r, null, 1)); console.log("ERRORS", JSON.stringify(app.errors)); } finally { await app.close(); }
}
module.exports = { run, H, F };
