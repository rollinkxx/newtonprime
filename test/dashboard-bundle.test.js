import test from "node:test";
import assert from "node:assert/strict";
import worker from "../dist/newton-prime-worker.js";

const request = (path, method = "GET", headers = {}) =>
  new Request(`https://newton-prime.test${path}`, { method, headers });

test("dashboard bundle serves its HTML shell", async () => {
  const response = await worker.fetch(request("/", "GET", { accept: "text/html" }));
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /text\/html/);
  assert.match(html, /Newton Prime/);
});

test("dashboard bundle serves CSS, JavaScript, icon and the 110-item catalog", async () => {
  const css = await worker.fetch(request("/styles.css"));
  const js = await worker.fetch(request("/app.js"));
  const icon = await worker.fetch(request("/assets/newton-prime-icon.png"));
  const catalog = await worker.fetch(request("/data/trading-assets.json"));
  assert.equal(css.status, 200);
  assert.equal(js.status, 200);
  assert.equal(icon.status, 200);
  assert.match(icon.headers.get("content-type"), /image\/png/);
  assert.equal((await icon.arrayBuffer()).byteLength, 20838);
  assert.equal((await catalog.json()).length, 110);
});

test("dashboard bundle health and order lock are active", async () => {
  const health = await worker.fetch(request("/api/health"));
  assert.equal((await health.json()).liveTradingEnabled, false);
  const order = await worker.fetch(request("/api/orders", "POST"));
  assert.equal(order.status, 423);
  assert.equal((await order.json()).code, "LIVE_TRADING_LOCKED");
});

test("dashboard bundle returns JSON 404 for unknown API routes", async () => {
  const response = await worker.fetch(request("/api/private"));
  assert.equal(response.status, 404);
  assert.match(response.headers.get("content-type"), /application\/json/);
});
