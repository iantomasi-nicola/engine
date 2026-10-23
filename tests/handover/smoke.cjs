const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const testUrl = process.env.ENGINE_TEST_URL || 'http://localhost:8011';
assert.equal(new URL(testUrl).hostname, 'localhost', 'Use a disposable local server only');
(async () => {
 const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
 try {
  const context = await browser.newContext();
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.route('**/*', r => new URL(r.request().url()).origin === new URL(testUrl).origin ? r.continue() : r.abort());
  await page.goto(testUrl);
  await page.getByText('Use on this device only', { exact: true }).click();
  await page.locator('[data-act="open-checkin"]').first().click();
  await page.locator('#ci-weight').fill('72.5');
  await page.locator('#ci-weight').dispatchEvent('change');
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.reload();
  await page.locator('[data-act="open-checkin"]').first().click();
  assert.equal(await page.locator('#ci-weight').inputValue(), '72.5');
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  for (const tab of ['train', 'plan', 'progress', 'settings', 'today']) {
   await page.locator(`[data-act="tab"][data-tab="${tab}"]`).first().click();
   await page.waitForFunction(expected => UI.tab === expected, tab);
   assert.ok((await page.locator('body').innerText()).length > 100);
  }
  console.log('Persistence and navigation passed; checking service worker');
  await page.waitForFunction(async () => !!(await navigator.serviceWorker.getRegistration())?.active, null, { timeout: 15000 });
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await context.setOffline(true);
  await page.reload();
  await page.locator('[data-act="open-checkin"]').first().waitFor();
  assert.deepEqual(errors, []);
  console.log('PASS: local-only startup, weigh-in persistence after reload, five navigation tabs, service worker registration, offline reload, no uncaught JavaScript errors.');
 } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
