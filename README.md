# Newton Prime Web

A responsive Cloudflare Workers dashboard rebuilt from the supplied Newton Prime Android package. The current build includes a local-only trading simulator, strategy/risk configuration, signal queue, asset picker, and simulated trade journal.

## Safety and integration status

- The dashboard does **not** ask for or store Stockity passwords, OTP codes, cookies, or API tokens.
- Browser-side settings and simulated history are stored in that browser's `localStorage`; there is no account system or remote user-data database.
- The trading execution backend is deliberately locked. `POST /api/orders` returns HTTP `423 LIVE_TRADING_LOCKED` and cannot send an order.
- The binary contains undocumented Stockity endpoints, but the web build does not call those private routes. No public official Stockity developer API contract was verified. The live adapter must remain disabled until a supported, authorized API is provided and separately approved.
- Every simulated result is marked synthetic and is not market data, a backtest, a promise of profit, or financial advice.

## Local development

Requires Node.js 22+.

```bash
npm install
npm run check
npm test
npm run dev
```

Open `http://localhost:8787`. The Worker exposes `GET /api/health` and `GET /api/integration` while static assets are served from `public/`.

## Cloudflare Workers deployment

```bash
npx wrangler login
npm run deploy
```

The Worker uses Wrangler's `assets` configuration to deploy `public/` together with `src/index.js`. The API routes are routed through the Worker first; other requests fall back to the static asset binding. Choose the intended Cloudflare account explicitly when prompted. Do not add brokerage credentials as Worker secrets until an official integration contract and approval exist.

## Project layout

- `src/index.js` — Worker API routes and hard live-execution lock.
- `public/index.html`, `public/styles.css`, `public/app.js` — responsive console and local simulation.
- `public/data/trading-assets.json` — 110 instrument entries extracted from the user-supplied XAPK.
- `public/assets/newton-prime-icon.png` — app icon extracted from the user-supplied XAPK.
- `test/worker.test.js` — API lock and status tests.
- The detailed static APK audit is delivered separately and is intentionally excluded from this public source repository.

## References

- [Cloudflare Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/)
- [Cloudflare Workers SPA routing](https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/)
