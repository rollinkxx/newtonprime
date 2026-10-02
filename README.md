# Newton Prime Web

A responsive Cloudflare Workers dashboard rebuilt from the supplied Newton Prime Android package. The current build includes a local-only trading simulator, strategy/risk configuration, signal queue, asset picker, and simulated trade journal.

## Safety and integration status

- The dashboard does **not** ask for or store Stockity passwords, OTP codes, cookies, or API tokens.
- Browser-side settings and simulated history are stored in that browser's `localStorage`; there is no account system or remote user-data database.
- The trading execution backend is deliberately locked. `POST /api/orders` returns HTTP `423 LIVE_TRADING_LOCKED` and cannot send an order.
- The binary contains undocumented Stockity endpoints, but the web build does not call those private routes. No public official Stockity developer API contract was verified. The live adapter must remain disabled until a supported, authorized API is provided and separately approved.
- Every simulated result is marked synthetic and is not market data, a backtest, a promise of profit, or financial advice.

## Local development and tests

Requires Node.js 22+.

```bash
npm install
npm run check
npm test
npm run dev
```

`npm test` regenerates and tests both the Wrangler Worker and the single-file dashboard bundle. Open `http://localhost:8787` for local preview.

## Cloudflare Workers deployment

Preferred CLI route:

```bash
npx wrangler login
npm run deploy
```

The Wrangler configuration uploads `public/` with `src/index.js`. API requests are routed through the Worker; other requests use the static assets binding.

If Wrangler CLI authorization is blocked, generate a self-contained bundle for Cloudflare's dashboard editor:

```bash
npm run bundle:dashboard
```

This writes `dist/newton-prime-worker.js`, embedding the UI assets and API lock. In the chosen account, open **Workers & Pages → Create application → Start with Hello World**, choose `newton-prime-web`, replace the editor contents with the generated bundle, and deploy. Do not add brokerage credentials or enable live order execution without a supported official API contract and separate approval.

## Project layout

- `src/index.js` — Worker API routes and hard live-execution lock.
- `public/index.html`, `public/styles.css`, `public/app.js` — responsive console and local simulation.
- `public/data/trading-assets.json` — 110 instrument entries extracted from the user-supplied XAPK.
- `public/assets/newton-prime-icon.png` — app icon extracted from the user-supplied XAPK.
- `scripts/build-dashboard-worker.mjs` — creates the one-file dashboard bundle.
- `test/` — tests for API lock, static bundle, and catalog.
- The detailed static APK audit is delivered separately and intentionally excluded from this public source repository.

## References

- [Cloudflare Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/)
- [Cloudflare Workers SPA routing](https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/)
- [Cloudflare dashboard first Worker guide](https://developers.cloudflare.com/learning-paths/workers/get-started/first-worker/)
