const json = (payload, status = 200, extraHeaders = {}) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
      ...extraHeaders,
    },
  });

const locked = () =>
  json(
    {
      ok: false,
      code: "LIVE_TRADING_LOCKED",
      message:
        "Live order execution is disabled. No broker adapter or trading credentials are configured.",
      liveTradingEnabled: false,
    },
    423,
    { allow: "GET, HEAD" },
  );

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/health" && (request.method === "GET" || request.method === "HEAD")) {
      return json({
        ok: true,
        application: "Newton Prime Web",
        executionMode: "local-simulation",
        liveTradingEnabled: false,
        brokerConnected: false,
        dataStorage: "browser-local-only",
      });
    }

    if (url.pathname === "/api/integration" && (request.method === "GET" || request.method === "HEAD")) {
      return json({
        provider: "Stockity",
        state: "locked",
        officialApiVerified: false,
        liveTradingEnabled: false,
        reason: "No public official developer API contract was verified for this build.",
      });
    }

    if (url.pathname === "/api/orders") {
      if (request.method === "POST") return locked();
      return json({ ok: false, message: "Order execution is disabled." }, 405, { allow: "GET, HEAD" });
    }

    if (url.pathname.startsWith("/api/")) {
      return json({ ok: false, message: "API route not found." }, 404);
    }

    return env.ASSETS.fetch(request);
  },
};
