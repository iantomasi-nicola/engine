/* M21 spike (docs/PRODUCT_REQUIREMENTS.md L217, docs/SCALE_LIVE.md): the standalone page scale-live.html decrypts the
   MiBeacon v5 broadcasts of the Xiaomi S400 scale with its own AES-128 + CCM (WebCrypto has no CCM).
   Only invented keys and MACs, plus the public test frames of the open-source xiaomi-ble library; no real device, no network. */
const { test, before, after } = require("node:test"), assert = require("node:assert/strict"), fs = require("fs"), path = require("path"), crypto = require("crypto");
const H = require("./lib/harness");

const KEY = "00112233445566778899aabbccddeeff", MAC = "A4:C1:38:0B:1E:7D";   // invented
let dir, br, pg, errs = [], logs = [];
const open = async ({ noBluetooth = false, fakeBluetooth = false } = {}) => {
  const ctx = await br.newContext({ viewport: H.VIEWPORTS.phone }); const p = await ctx.newPage();
  errs = []; logs = []; p.on("pageerror", e => errs.push(String(e))); p.on("console", m => logs.push(m.text())); p.setDefaultTimeout(5000);
  if (noBluetooth) await p.addInitScript(() => { Object.defineProperty(Navigator.prototype, "bluetooth", { get: () => undefined, configurable: true }); });
  if (fakeBluetooth) await p.addInitScript(() => {
    const dev = new EventTarget(); dev.name = "Fake scale"; dev.watchAdvertisements = async () => { window.__watching = true; };
    window.__fakeDev = dev; window.BluetoothDevice = function () {}; BluetoothDevice.prototype.watchAdvertisements = function () {};
    Object.defineProperty(Navigator.prototype, "bluetooth", { get: () => ({ requestDevice: async o => { window.__opts = o; return dev; } }), configurable: true });
  });
  await p.goto("file://" + path.join(dir, "scale-live.html")); return p;
};
const ev = (p, f, a) => p.evaluate(f, a);

/* a MiBeacon v5 frame as the S400 sends it (structure of xiaomi-ble parser.py _parse_xiaomi / decrypt_mibeacon_v4_v5):
   frctrl 0x5948 LE (v5, object, encrypted, no MAC) | product id 0x3BD5 LE | counter | AES-CCM(object) | 3-byte ext counter | 4-byte tag
   nonce = MAC reversed (6) + product id + counter (3) + ext counter (3); associated data = 0x11. Encrypted here with Node's own OpenSSL CCM. */
function frame(obj, { key = KEY, mac = MAC, counter = 7, ext = [0x01, 0x00, 0x00] } = {}) {
  const head = Buffer.from([0x48, 0x59, 0xd5, 0x3b, counter]), extB = Buffer.from(ext);
  const nonce = Buffer.concat([Buffer.from(mac.replace(/:/g, ""), "hex").reverse(), head.subarray(2, 5), extB]);
  const c = crypto.createCipheriv("aes-128-ccm", Buffer.from(key, "hex"), nonce, { authTagLength: 4 }); c.setAAD(Buffer.from([0x11]), { plaintextLength: obj.length });
  const ct = Buffer.concat([c.update(obj), c.final()]); return Buffer.concat([head, ct, extB, c.getAuthTag()]).toString("hex");
}
/* object 0x6E16, 9 bytes: profile, uint32 LE = mass/0.1 kg | (bpm − 50) << 11 | impedance/0.1 Ω << 18, 4 more bytes */
const obj6e16 = (profile, mass, hr, imp) => { const b = Buffer.alloc(12); b.writeUInt16LE(0x6e16, 0); b[2] = 9; b[3] = profile; b.writeUInt32LE(((mass | hr << 11) + imp * 2 ** 18) >>> 0, 4); b.writeUInt32LE(0xdeadbeef, 8); return b; };

before(async () => { dir = H.build(H.tmp("scale")); br = await H.loadPlaywright().chromium.launch(); pg = await open(); });
after(async () => { await br?.close(); });

test("the build copies the page; its script runs by hash and the page cannot reach the network", () => {
  const html = fs.readFileSync(path.join(dir, "scale-live.html"), "utf8");
  assert.doesNotMatch(html, /unsafe-inline'[^;]*;\s*style/, "script-src no longer has 'unsafe-inline'");
  assert.match(html, /script-src 'sha256-[A-Za-z0-9+/=]+'/); assert.match(html, /connect-src 'none'/);
  assert.deepEqual(errs, [], "the hash matches: the script ran without a CSP error");
});

test("AES-128 and CCM match the official vectors (FIPS-197 C.1, NIST SP 800-38C C.1/C.2, RFC 3610 packets 1/2)", async () => {
  /* FIPS-197 Appendix C.1: key 000102…0f, plaintext 00112233…ff → 69c4e0d86a7b0430d8cdb78070b4c55a */
  assert.equal(await ev(pg, () => S400.hex(S400.aes(S400.unhex("000102030405060708090a0b0c0d0e0f"), S400.unhex("00112233445566778899aabbccddeeff")))), "69c4e0d86a7b0430d8cdb78070b4c55a");
  /* [key, nonce, associated data, payload, tag length, ciphertext‖tag] */
  const V = [
    ["404142434445464748494a4b4c4d4e4f", "10111213141516", "0001020304050607", "20212223", 4, "7162015b4dac255d"],   // NIST SP 800-38C, Example 1 (4-byte tag, as MiBeacon)
    ["404142434445464748494a4b4c4d4e4f", "1011121314151617", "000102030405060708090a0b0c0d0e0f", "202122232425262728292a2b2c2d2e2f", 6, "d2a1f0e051ea5f62081a7792073d593d1fc64fbfaccd"],   // NIST SP 800-38C, Example 2
    ["c0c1c2c3c4c5c6c7c8c9cacbcccdcecf", "00000003020100a0a1a2a3a4a5", "0001020304050607", "08090a0b0c0d0e0f101112131415161718191a1b1c1d1e", 8, "588c979a61c663d2f066d0c2c0f989806d5f6b61dac38417e8d12cfdf926e0"],   // RFC 3610, Packet Vector #1
    ["c0c1c2c3c4c5c6c7c8c9cacbcccdcecf", "00000004030201a0a1a2a3a4a5", "0001020304050607", "08090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f", 8, "72c91a36e135f8cf291ca894085c87e3cc15c439c9e43a3ba091d56e10400916"],   // RFC 3610, Packet Vector #2
  ];
  for (const [k, n, a, p, m, out] of V) {
    const got = await ev(pg, ([k, n, a, p, m]) => { const u = S400.unhex, e = S400.ccmEncrypt(u(k), u(n), u(a), u(p), m), c = e.subarray(0, e.length - m);
      return { enc: S400.hex(e), dec: S400.hex(S400.ccmDecrypt(u(k), u(n), u(a), c, e.subarray(e.length - m)) || []) }; }, [k, n, a, p, m]);
    assert.equal(got.enc, out, "vector with nonce " + n); assert.equal(got.dec, p);
  }
});

test("CCM agrees with Node's OpenSSL on random inputs of every length up to 40 bytes (12-byte nonce, 4-byte tag)", async () => {
  for (let len = 0; len <= 40; len++) {
    const k = crypto.randomBytes(16), n = crypto.randomBytes(12), a = crypto.randomBytes(1 + (len % 20)), p = crypto.randomBytes(len);
    const c = crypto.createCipheriv("aes-128-ccm", k, n, { authTagLength: 4 }); c.setAAD(a, { plaintextLength: p.length });
    const want = Buffer.concat([c.update(p), c.final(), c.getAuthTag()]).toString("hex");
    const got = await ev(pg, ([k, n, a, p]) => S400.hex(S400.ccmEncrypt(S400.unhex(k), S400.unhex(n), S400.unhex(a), S400.unhex(p), 4)), [k, n, a, p].map(b => b.toString("hex")));
    assert.equal(got, want, "length " + len);
  }
});

test("synthetic S400 frames: weight packet then impedance packet decode to the values put in", async () => {
  /* packet 1: mass 813 → 81.3 kg, hr field 20 → 70 bpm, impedance 5123 → 512.3 Ω (50 kHz, the packet that has a weight)
     packet 2: mass 0, hr 0, impedance 4987 → 498.7 Ω (250 kHz, the last packet) */
  const f1 = frame(obj6e16(1, 813, 20, 5123), { counter: 7 }), f2 = frame(obj6e16(1, 0, 0, 4987), { counter: 8 });
  const r = await ev(pg, ([f1, f2, k, m]) => [f1, f2].map(f => S400.parseFrame(S400.unhex(f), S400.macBytes(m), S400.unhex(k))), [f1, f2, KEY, MAC]);
  assert.equal(r[0].ok, true, r[0].why); assert.equal(r[0].version, 5); assert.equal(r[0].product, 0x3bd5);
  assert.equal(r[0].counter, 7 + 1 * 256, "counter byte + 256 × extended counter");
  assert.equal(r[0].plain, obj6e16(1, 813, 20, 5123).toString("hex"), "the decrypted payload is shown in hex as it is");
  assert.deepEqual(r[0].objects[0].scale, { profile: 1, kg: 81.3, bpm: 70, imp50: 512.3, rest: "efbeadde" });
  assert.deepEqual(r[1].objects[0].scale, { profile: 1, imp250: 498.7, rest: "efbeadde" });
  const off = await ev(pg, ([f, k, m]) => S400.parseFrame(S400.unhex(f), S400.macBytes(m), S400.unhex(k)).objects[0].scale, [frame(obj6e16(1, 0, 0, 0)), KEY, MAC]);
  assert.equal(off.off, true, "all zero = stepped off");
});

test("the public S400 frames of the xiaomi-ble test suite decode to the same values as that library", async () => {
  /* tests/test_parser.py of github.com/Bluetooth-Devices/xiaomi-ble, test_Xiaomi_Scale_S400_MJTZC01YM and …_packet_2:
     key and MAC published there (not a user's); expected 69.9 kg, 543.2 Ω low, 92 bpm, profile 1; then 497.6 Ω high */
  const K = "0728974d657a4b60964c1b1677f35f7c", M = "8C:D0:B2:F6:BE:EF";
  const F = ["4859d53b0abc078ff2348c844138e930220000009e538599", "4859d53b0bd6ef0b25db72785e7e2f46d6000000d8642df6"];
  const r = await ev(pg, ([F, k, m]) => F.map(f => S400.parseFrame(S400.unhex(f), S400.macBytes(m), S400.unhex(k))), [F, K, M]);
  assert.equal(r[0].nonce, "efbef6b2d08cd53b0a000000"); assert.equal(r[0].plain, "166e0901bb52e154ed26f767");
  assert.deepEqual(r[0].objects[0].scale, { profile: 1, kg: 69.9, bpm: 92, imp50: 543.2, rest: "ed26f767" });
  assert.deepEqual(r[1].objects[0].scale, { profile: 1, imp250: 497.6, rest: "ed26f767" });
});

test("a wrong tag, key or MAC drops the frame and says why, without an exception", async () => {
  const f = frame(obj6e16(1, 813, 20, 5123)), bad = f.slice(0, -2) + (f.slice(-2) === "00" ? "01" : "00");
  const r = await ev(pg, ([f, bad, k, m]) => {
    const p = (x, mac, key) => S400.parseFrame(S400.unhex(x), mac && S400.macBytes(mac), key && S400.unhex(key));
    return [p(bad, m, k), p(f, m, "ffeeddccbbaa99887766554433221100"), p(f, "A4:C1:38:0B:1E:7E", k), p(f, null, k), p(f, m, null), p("4859d5", m, k)];
  }, [f, bad, KEY, MAC]);
  for (const x of r) { assert.equal(x.ok, false); assert.equal(x.objects, undefined); assert.ok(x.why); }
  assert.match(r[0].why, /tag does not match.*24 bytes.*nonce tried [0-9a-f]{24}/); assert.match(r[1].why, /tag/); assert.match(r[2].why, /tag/);
  assert.match(r[3].why, /MAC/); assert.match(r[4].why, /bind key/); assert.match(r[5].why, /too short/);
  assert.deepEqual(errs, []);
});

test("bind key: checked, kept only in this device's storage, never in the DOM, the log, the URL or the console; Forget removes it", async () => {
  const p = await open();
  await p.fill("#key", "12345"); await p.click("#save");
  assert.match(await p.textContent("#keyst"), /32 characters/); assert.equal(await ev(p, () => localStorage.getItem("engine.s400.bindkey")), null);
  await p.fill("#key", KEY.toUpperCase()); await p.fill("#mac", MAC); await p.click("#save");
  assert.equal(await ev(p, () => localStorage.getItem("engine.s400.bindkey")), KEY); assert.equal(await p.inputValue("#key"), "", "the field is emptied after saving");
  assert.match(await p.textContent("#keyst"), /saved on this device/);
  for (const f of [frame(obj6e16(1, 813, 20, 5123), { counter: 9 }), frame(obj6e16(1, 0, 0, 4987), { counter: 10 }), frame(obj6e16(1, 813, 20, 5123), { counter: 9 })]) { await p.fill("#paste", f); await p.click("#dec"); }
  assert.match(await p.textContent("#w"), /81\.3/); assert.equal(await p.textContent("#i50"), "512.3 Ω"); assert.equal(await p.textContent("#i250"), "498.7 Ω"); assert.equal(await p.textContent("#hr"), "70 bpm");
  assert.match(await p.textContent("#phase"), /complete/);
  const csv = await p.inputValue("#log"), lines = csv.trim().split("\n");
  assert.equal(lines.length, 3, "header + two distinct frames (the repeat is not logged twice)");
  assert.match(lines[1], /,ok,166e0901[0-9a-f]+,81\.3,512\.3,,70,1$/);
  const dom = await ev(p, () => document.documentElement.outerHTML + [...document.querySelectorAll("input,textarea")].map(e => e.value).join("|"));
  for (const k of [KEY, KEY.toUpperCase()]) {
    assert.ok(!dom.includes(k), "key not in the DOM"); assert.ok(!csv.includes(k), "key not in the CSV"); assert.ok(!p.url().includes(k), "key not in the URL");
    assert.ok(!logs.join("\n").includes(k), "key not in the console");
  }
  await p.click("#forget"); assert.equal(await ev(p, () => localStorage.getItem("engine.s400.bindkey")), null);
  await p.fill("#paste", frame(obj6e16(1, 813, 20, 5123), { counter: 11 })); await p.click("#dec"); assert.match(await p.textContent("#why"), /no bind key/);
  assert.deepEqual(errs, []); await p.context().close();
});

test("without Web Bluetooth the page opens, says so and Connect explains instead of failing", async () => {
  const p = await open({ noBluetooth: true });
  assert.match(await p.textContent("#sup"), /Web BluetoothNo/); await p.click("#go");
  assert.match(await p.textContent("#st"), /no Web Bluetooth/); assert.equal(await p.isHidden("#scan"), true);
  assert.deepEqual(errs, []); await p.context().close();
});

test("with a stubbed Web Bluetooth, broadcasts of service 0xFE95 reach the live values", async () => {
  const p = await open({ fakeBluetooth: true });
  await ev(p, ([k, m]) => { localStorage.setItem("engine.s400.bindkey", k); localStorage.setItem("engine.s400.mac", m); }, [KEY, MAC]);
  await p.click("#go"); assert.equal(await ev(p, () => window.__watching), true);
  assert.deepEqual(await ev(p, () => window.__opts), { acceptAllDevices: true, optionalServices: [0xfe95] });
  await ev(p, f => { const b = new Uint8Array(f.match(/../g).map(h => parseInt(h, 16))), e = new Event("advertisementreceived"); e.serviceData = new Map([["0000fe95-0000-1000-8000-00805f9b34fb", new DataView(b.buffer)]]); e.rssi = -61; e.device = window.__fakeDev; window.__fakeDev.dispatchEvent(e); }, frame(obj6e16(2, 702, 25, 5000)));
  assert.match(await p.textContent("#w"), /70\.2/); assert.equal(await p.textContent("#hr"), "75 bpm"); assert.equal(await p.textContent("#rssi"), "-61 dBm"); assert.equal(await p.textContent("#prof"), "2");
  assert.match(await p.textContent("#st"), /Listening to Fake scale/); await p.click("#stop"); assert.match(await p.textContent("#st"), /Not listening/);
  assert.deepEqual(errs, []); await p.context().close();
});
