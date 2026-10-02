import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(root, "dist/newton-prime-worker.js");
const specs = [
  ["/", "public/index.html", "text/html; charset=utf-8"],
  ["/index.html", "public/index.html", "text/html; charset=utf-8"],
  ["/styles.css", "public/styles.css", "text/css; charset=utf-8"],
  ["/app.js", "public/app.js", "text/javascript; charset=utf-8"],
  ["/data/trading-assets.json", "public/data/trading-assets.json", "application/json; charset=utf-8"],
  ["/assets/newton-prime-icon.png", "public/assets/newton-prime-icon.png", "image/png"],
];
const files = {};
for (const [route, relativePath, contentType] of specs) {
  const bytes = await readFile(resolve(root, relativePath));
  const binary = contentType.startsWith("image/");
  files[route] = {
    contentType,
    encoding: binary ? "base64" : "utf8",
    body: binary ? bytes.toString("base64") : bytes.toString("utf8"),
  };
}

const runtime = `
const FILES = ${JSON.stringify(files)};
const SECURITY = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "x-frame-options": "DENY",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
};
const json = (body, status = 200, extra = {}) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...SECURITY, ...extra },
});
export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/api/health" && ["GET", "HEAD"].includes(request.method)) {
      return json({ ok: true, application: "Newton Prime Web", executionMode: "local-simulation", liveTradingEnabled: false, brokerConnected: false, dataStorage: "browser-local-only" });
    }
    if (url.pathname === "/api/integration" && ["GET", "HEAD"].includes(request.method)) {
      return json({ provider: "Stockity", state: "locked", officialApiVerified: false, liveTradingEnabled: false, reason: "No public official developer API contract was verified for this build." });
    }
    if (url.pathname === "/api/orders") {
      if (request.method === "POST") return json({ ok: false, code: "LIVE_TRADING_LOCKED", message: "Live order execution is disabled. No broker adapter or trading credentials are configured.", liveTradingEnabled: false }, 423, { allow: "GET, HEAD" });
      return json({ ok: false, message: "Order execution is disabled." }, 405, { allow: "GET, HEAD" });
    }
    if (url.pathname.startsWith("/api/")) return json({ ok: false, message: "API route not found." }, 404);
    const file = FILES[url.pathname] || (request.headers.get("accept")?.includes("text/html") ? FILES["/index.html"] : null);
    if (!file) return new Response("Not found", { status: 404, headers: SECURITY });
    const body = file.encoding === "base64" ? Uint8Array.from(atob(file.body), (char) => char.charCodeAt(0)) : file.body;
    const cache = file.contentType.startsWith("text/html") ? "no-store" : "public, max-age=3600";
    return new Response(request.method === "HEAD" ? null : body, {
      status: 200,
      headers: { "content-type": file.contentType, "cache-control": cache, ...SECURITY },
    });
  },
};
`;
await mkdir(dirname(output), { recursive: true });
await writeFile(output, runtime.trimStart(), "utf8");
console.log(`Built ${output} (${Buffer.byteLength(runtime)} bytes; ${Object.keys(files).length} embedded routes).`);
