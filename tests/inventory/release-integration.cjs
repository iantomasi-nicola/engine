const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const url = process.env.ENGINE_TEST_URL || 'http://localhost:8017';
assert.equal(new URL(url).hostname, 'localhost');
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.route('**/*', r => new URL(r.request().url()).origin === new URL(url).origin ? r.continue() : r.abort());
    await page.goto(url);
    await page.getByText('Use on this device only', { exact: true }).click();
    await page.waitForFunction(() => Sync.ready);
    await page.evaluate(() => {
      S.settings.onboarded = true;
      S.foods = { rice: { ...blankFood('Rice fixture'), id: 'rice', cat: 'pantry', brand: 'ExampleBrand', alias: 'synthetic-alias' } };
      S.shop = { pantry: { rice: { g: 100 } }, checked: {}, extras: [], prices: {}, buys: [] };
      S.days = {}; UI.tab = UI.fuelTab = 'pantry'; saveLocal(); scheduleRender();
    });
    await page.locator('[aria-label="Sort pantry"]').selectOption('cat');
    await page.locator('#pantry-search').fill('ExampleBrand');
    await page.waitForFunction(() => S.shop.view.q === 'ExampleBrand');
    assert.equal(await page.locator('.pan-row').count(), 1);
    await page.locator('#pantry-search').fill('synthetic-alias');
    await page.waitForFunction(() => S.shop.view.q === 'synthetic-alias');
    assert.equal(await page.locator('.pan-row').count(), 1);
    await page.reload(); await page.waitForFunction(() => Sync.ready);
    assert.deepEqual(await page.evaluate(() => S.shop.view), { sort: 'cat', q: 'synthetic-alias' });
    console.log('PASS: upstream brand/alias search and category sorting retained and persisted');
    const sidebar = await page.evaluate(() => { const before = UI.sideOpen; ACT['side-toggle'](); return before; });
    await page.reload(); await page.waitForFunction(() => Sync.ready);
    assert.equal(await page.evaluate(() => UI.sideOpen), !sidebar);
    console.log('PASS: upstream sidebar preference survives reload');
    const result = await page.evaluate(() => {
      openSheet('qty', { kind: 'food', ref: 'rice', qty: 100, date: UI.date, meal: 'lunch' });
      const old = document.querySelector('.sheet'); closeSheet();
      openSheet('qty', { kind: 'food', ref: 'rice', qty: 200, date: UI.date, meal: 'lunch' });
      old.dispatchEvent(new Event('animationend'));
      return { value: document.querySelector('#qty-in')?.value, open: UI.sheet?.type };
    });
    assert.deepEqual(result, { value: '200', open: 'qty' });
    assert.deepEqual(errors, []);
    console.log('PASS: closing animation cannot remove a newly opened sheet');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
