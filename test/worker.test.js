import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/index.js";

const env = {
  ASSETS: {
    fetch: async () => new Response("asset placeholder", { status: 200 }),
  },
};

const request = (path, method = "GET") =>
  new Request(`https://newton-prime.test${path}`, { method });

test("health reports local simulation and no live broker connection", async () => {
  const response = await worker.fetch(request("/api/health"), env);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.executionMode, "local-simulation");
  assert.equal(body.liveTradingEnabled, false);
  assert.equal(body.brokerConnected, false);
});

test("integration status remains locked without a verified official API", async () => {
  const response = await worker.fetch(request("/api/integration"), env);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.state, "locked");
  assert.equal(body.officialApiVerified, false);
  assert.equal(body.liveTradingEnabled, false);
});

test("order POST is rejected with 423 and cannot reach a broker", async () => {
  const response = await worker.fetch(request("/api/orders", "POST"), env);
  const body = await response.json();
  assert.equal(response.status, 423);
  assert.equal(body.code, "LIVE_TRADING_LOCKED");
  assert.equal(body.liveTradingEnabled, false);
});

test("unknown API paths return JSON 404", async () => {
  const response = await worker.fetch(request("/api/not-a-route"), env);
  assert.equal(response.status, 404);
  assert.match(response.headers.get("content-type"), /application\/json/);
});
