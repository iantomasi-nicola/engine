/* L195: the standalone Mi Scale 2 check page. The decoder is tested on frames built by hand; the page on a stubbed Bluetooth. Synthetic data only. */
const test = require("node:test"), assert = require("node:assert/strict"), fs = require("fs"), path = require("path"), H = require("./lib/harness");
const html = fs.readFileSync(path.join(__dirname, "../source/web/scale-test.html"), "utf8");
const decodeScale = new Function(html.split("/*DECODE*/")[1].split("/*END*/")[0] + "; return decodeScale;")();
const frame = (c0, c1, imp, raw, t = [2026, 10, 26, 9, 0, 0]) => Uint8Array.from([c0, c1, t[0] & 255, t[0] >> 8, t[1], t[2], t[3], t[4], t[5], imp & 255, imp >> 8, raw & 255, raw >> 8]);

test("decoder: 70.0 kg is raw 14000 (/200), impedance 500, flags read from the control bytes", () => {
  const d = decodeScale(frame(0x02, 0x26, 500, 14000));
  assert.equal(d.weightKg, 70); assert.equal(d.impedance, 500); assert.equal(d.unit, "kg"); assert.equal(d.stabilized, true); assert.equal(d.hasImpedance, true); assert.equal(d.removed, false);
  assert.equal(d.time, "2026-10-26 09:00:00");
});
test("decoder: pounds (raw 15432 /100 × 0.45359237 = 70.0 kg), catty (raw 14000 /100 × 0.5 = 70.0 kg), unsettled frame, too-short frame", () => {
  assert.equal(decodeScale(frame(0x03, 0x00, 0, 15432)).weightKg, 70); assert.equal(decodeScale(frame(0x03, 0x00, 0, 15432)).unit, "lb");
  assert.equal(decodeScale(frame(0x10, 0x00, 0, 14000)).weightKg, 70); assert.equal(decodeScale(frame(0x10, 0x00, 0, 14000)).unit, "catty");
  assert.equal(decodeScale(frame(0x02, 0x00, 0, 13840)).stabilized, false); assert.equal(decodeScale(frame(0x02, 0x00, 0, 13840)).weightKg, 69.2);
  assert.equal(decodeScale(new Uint8Array(5)), null);
});
test("the page lists what the browser supports and shows a frame it receives (stubbed Bluetooth, no real device)", async () => {
  const dir = H.build(H.tmp("scale-build")); assert.ok(fs.existsSync(path.join(dir, "scale-test.html")), "the build copies the page");
  const { chromium } = require("playwright"), br = await chromium.launch(), pg = await br.newPage(), errs = []; pg.on("pageerror", e => errs.push(String(e)));
  await pg.addInitScript(() => { navigator.bluetooth = new EventTarget(); navigator.bluetooth.requestLEScan = async () => ({ stop() {} }); });
  await pg.goto("file://" + path.join(dir, "scale-test.html"));
  assert.match(await pg.textContent("#sup"), /✓ Advertisement scanning/);
  await pg.click("#go");
  await pg.evaluate(f => { const sd = new Map([["0000181b-0000-1000-8000-00805f9b34fb", new DataView(Uint8Array.from(f).buffer)]]); navigator.bluetooth.dispatchEvent(Object.assign(new Event("advertisementreceived"), { serviceData: sd, rssi: -60, device: { name: "MIBFS" } })); }, [...frame(0x02, 0x26, 500, 14000)]);
  assert.equal(await pg.textContent("#w"), "70 kg"); assert.match(await pg.textContent("#d"), /impedance 500 ohm · stable/);
  assert.deepEqual(errs, []); await br.close();
});

test("without scanning support the page asks for any nearby device (no name filter), then listens to it and can probe the connection (stubbed)", async () => {
  const dir = H.build(H.tmp("scale-build2")); const { chromium } = require("playwright"), br = await chromium.launch(), pg = await br.newPage(), errs = []; pg.on("pageerror", e => errs.push(String(e)));
  await pg.addInitScript(() => { const dev = Object.assign(new EventTarget(), { name: "MIBFS", watchAdvertisements: async () => {}, gatt: { connect: async () => ({ getPrimaryServices: async () => [{ uuid: "0000181b-0000-1000-8000-00805f9b34fb", getCharacteristics: async () => [{ uuid: "00002a9c-0000-1000-8000-00805f9b34fb", properties: { indicate: true }, addEventListener() {}, startNotifications: async () => {} }] }] }) } });
    navigator.bluetooth = Object.assign(new EventTarget(), { requestDevice: async o => { window.__opts = o; return dev; } }); window.__dev = dev; });
  await pg.goto("file://" + path.join(dir, "scale-test.html"));
  await pg.click("#go"); await pg.waitForFunction(() => /Listening/.test(document.getElementById("log").textContent));
  assert.equal(await pg.evaluate(() => window.__opts.acceptAllDevices), true);
  await pg.click("#gatt"); await pg.waitForFunction(() => /Connected: 1 services/.test(document.getElementById("d").textContent));
  assert.match(await pg.textContent("#log"), /service 0000181b.*2a9c\[indicate\]/); assert.match(await pg.textContent("#log"), /subscribed to 2a9c/);
  assert.deepEqual(errs, []); await br.close();
});

test("Stop really stops (aborts the watch and ignores later frames); an encrypted Xiaomi frame (FE95) is shown as unreadable", async () => {
  const dir = H.build(H.tmp("scale-build3")); const { chromium } = require("playwright"), br = await chromium.launch(), pg = await br.newPage(), errs = []; pg.on("pageerror", e => errs.push(String(e)));
  await pg.addInitScript(() => { const dev = Object.assign(new EventTarget(), { name: "Xiaomi Scale S400 89B9", watchAdvertisements: async o => { window.__sig = o.signal; } });
    navigator.bluetooth = Object.assign(new EventTarget(), { requestDevice: async () => dev }); window.__dev = dev; });
  await pg.goto("file://" + path.join(dir, "scale-test.html"));
  await pg.click("#go"); await pg.waitForFunction(() => /Listening/.test(document.getElementById("log").textContent));
  const send = () => pg.evaluate(() => { const sd = new Map([["0000fe95-0000-1000-8000-00805f9b34fb", new DataView(Uint8Array.from([0x30, 0x58, 0x5b, 0x05, 0x01, 0x02, 0x03]).buffer)]]); __dev.dispatchEvent(Object.assign(new Event("advertisementreceived"), { serviceData: sd, rssi: -50, device: { name: "Xiaomi Scale S400 89B9" } })); });
  await send(); assert.match(await pg.textContent("#log"), /other service fe95[\s\S]*ENCRYPTED/);
  await pg.click("#stop"); assert.equal(await pg.evaluate(() => window.__sig.aborted), true); assert.equal(await pg.textContent("#d"), "Stopped.");
  const before = await pg.textContent("#log"); await pg.evaluate(() => { const sd = new Map([["0000fe95-0000-1000-8000-00805f9b34fb", new DataView(Uint8Array.from([9, 9, 9]).buffer)]]); __dev.dispatchEvent(Object.assign(new Event("advertisementreceived"), { serviceData: sd, rssi: -50, device: {} })); });
  assert.equal(await pg.textContent("#log"), before, "no frame is logged after Stop"); assert.equal(await pg.isDisabled("#go"), false);
  assert.deepEqual(errs, []); await br.close();
});
