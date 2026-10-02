const NAV = [
  { id: "dashboard", label: "Dashboard", icon: "grid" },
  { id: "strategy", label: "Strategi", icon: "sliders" },
  { id: "signals", label: "Sinyal", icon: "signal" },
  { id: "history", label: "Riwayat", icon: "history" },
  { id: "assets", label: "Aset", icon: "globe" },
  { id: "integration", label: "Integrasi", icon: "shield" },
];
const STORAGE_KEY = "newton-prime.web.v1";
const icons = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  sliders: '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="2" y1="14" x2="6" y2="14"/><line x1="10" y1="8" x2="14" y2="8"/><line x1="18" y1="16" x2="22" y2="16"/>',
  signal: '<polyline points="3 12 7 12 10 5 14 19 17 12 21 12"/>',
  history: '<path d="M3 12a9 9 0 1 0 2.6-6.4L3 8"/><polyline points="3 3 3 8 8 8"/><path d="M12 7v5l3 2"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  shield: '<path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/>',
  trend: '<polyline points="3 17 9 11 13 15 21 7"/><polyline points="15 7 21 7 21 13"/>',
  wallet: '<rect x="3" y="6" width="18" height="15" rx="2"/><path d="M3 6V4a2 2 0 0 1 2-2h14M17 14h.01"/>',
  bolt: '<path d="m13 2-3 8h7l-6 12 1-9H5l8-11Z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  search: '<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/>',
  refresh: '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.5 9a7 7 0 0 1 11.8-2L20 12M4 12l2.7 5a7 7 0 0 0 11.8-2"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
};
const icon = (name, cls = "") => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.grid}</svg>`;
const defaults = {
  view: "dashboard",
  active: false,
  config: {
    symbol: "AUD/CAD",
    strategy: "fast",
    amount: 5000,
    martingalePercent: 65,
    maxMartingale: 3,
    stopLoss: 50000,
    stopProfit: 75000,
    payout: 82,
    autoSwitchDemo: true,
  },
  signals: [],
  history: [],
  lossStreak: 0,
};
const clone = (value) => JSON.parse(JSON.stringify(value));
function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    return saved ? { ...clone(defaults), ...saved, config: { ...clone(defaults.config), ...(saved.config || {}) } } : clone(defaults);
  } catch {
    return clone(defaults);
  }
}
let state = loadState();
let currentView = "dashboard";
let assets = [];
let assetQuery = "";
let apiHealth = null;
let noticeTimer = null;
const root = document.getElementById("app");

const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const toNumber = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const formatIDR = (value) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(toNumber(value));
const localDate = (value) => new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
const localTime = (value) => new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
const todayKey = () => new Date().toISOString().slice(0, 10);
function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { showNotice("Penyimpanan browser penuh. Ekspor atau hapus sebagian data lokal."); }
}
function showNotice(message) {
  document.querySelector(".notice")?.remove();
  const node = document.createElement("div");
  node.className = "notice";
  node.setAttribute("role", "status");
  node.textContent = message;
  document.body.append(node);
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => node.remove(), 3600);
}
function pageTitle() { return NAV.find((item) => item.id === currentView)?.label || "Dashboard"; }
function navButton(item, mobile = false) {
  return `<button class="nav-button ${currentView === item.id ? "active" : ""}" data-nav="${item.id}" aria-current="${currentView === item.id ? "page" : "false"}"><span class="nav-icon">${icon(item.icon)}</span><span>${item.label}</span></button>`;
}
function layout(content) {
  return `<div class="app-shell">
    <aside class="sidebar">
      <div class="brand"><img src="/assets/newton-prime-icon.png" alt=""/><div><div class="brand-name">Newton Prime</div><span class="brand-sub">WEB CONSOLE</span></div></div>
      <div class="nav-label">Workspace</div>
      <nav class="side-nav" aria-label="Navigasi utama">${NAV.map((item) => navButton(item)).join("")}</nav>
      <div class="side-spacer"></div>
      <div class="sidebar-note"><strong>${icon("shield")} Mode aman aktif</strong>Order live dikunci. Data konfigurasi dan simulasi hanya tersimpan di browser ini.</div>
      <div class="sidebar-footer"><div class="avatar">NP</div><div class="user-meta"><b>Demo workspace</b><span>Tanpa akun broker</span></div></div>
    </aside>
    <div class="workspace">
      <header class="topbar">
        <div class="mobile-brand"><img src="/assets/newton-prime-icon.png" alt=""/><strong>Newton Prime</strong></div>
        <div class="page-eyebrow">Workspace / ${escapeHtml(pageTitle())}</div>
        <div class="top-actions"><span class="api-pill ${apiHealth?.ok ? "" : "offline"}"><span class="dot"></span>${apiHealth?.ok ? "Worker aktif" : "Worker lokal"}</span><span class="mode-pill"><span class="dot"></span>Simulasi saja</span><a class="external-link" href="https://stockity1.id" target="_blank" rel="noopener noreferrer">Buka Stockity ${icon("arrow")}</a></div>
      </header>
      <main class="page-wrap">${content}<p class="footer-note">Hasil simulasi sintetis · bukan data pasar, backtest, janji keuntungan, atau nasihat keuangan.</p></main>
    </div>
    <nav class="mobile-nav" aria-label="Navigasi mobile">${NAV.map((item) => navButton(item, true)).join("")}</nav>
  </div>`;
}
function heading(title, subtitle, tools = "") {
  return `<div class="page-heading"><div><h1>${title}</h1><p>${subtitle}</p></div>${tools ? `<div class="heading-tools">${tools}</div>` : ""}</div>`;
}
function noticeBanner() {
  return `<div class="banner"><span class="banner-icon">!</span><div><strong>Live trading dinonaktifkan.</strong> Build ini tidak terhubung ke broker dan tidak mengirim order. Gunakan kontrol hasil sintetis hanya untuk menguji alur website.</div></div>`;
}
function iconTile(name, color = "") { return `<span class="card-title-icon ${color}">${icon(name)}</span>`; }
function calcTodayPnl() {
  return state.history.filter((row) => row.dateKey === todayKey()).reduce((sum, row) => sum + row.pnl, 0);
}
function chartMarkup() {
  const points = "0,116 30,103 58,108 85,84 110,92 137,65 164,74 191,49 218,62 245,40 273,53 300,28 328,41 355,22";
  return `<div class="chart-box"><span class="chart-label">Demo line · sintetis</span><svg viewBox="0 0 355 160" preserveAspectRatio="none" aria-label="Grafik dekoratif simulasi"><defs><linearGradient id="area" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#8fb39b" stop-opacity=".25"/><stop offset="1" stop-color="#8fb39b" stop-opacity="0"/></linearGradient></defs><path d="M0 116 L30 103 58 108 85 84 110 92 137 65 164 74 191 49 218 62 245 40 273 53 300 28 328 41 355 22 V160 H0Z" fill="url(#area)"/><polyline points="${points}" fill="none" stroke="#6c9b7c" stroke-width="2.5" vector-effect="non-scaling-stroke"/><line x1="0" y1="133" x2="355" y2="133" stroke="#e9eee9" stroke-dasharray="4 5" vector-effect="non-scaling-stroke"/></svg></div><div class="chart-disclaimer">Ilustrasi visual statis. Tidak memakai quote atau candle pasar.</div>`;
}
function signalCard(signal, actions = true) {
  const direction = signal.direction === "UP" ? "up" : "down";
  const arrow = signal.direction === "UP" ? "↑" : "↓";
  return `<div class="signal-row"><span class="signal-direction ${direction}">${arrow}</span><div class="signal-main"><strong>${escapeHtml(signal.symbol)} <span class="outcome pending">${signal.direction === "UP" ? "CALL" : "PUT"}</span></strong><small>${escapeHtml(signal.source || "Input pengguna")} · ${localDate(signal.at)} ${localTime(signal.at)}</small></div>${actions ? `<div class="signal-actions"><button class="btn btn-small btn-secondary" data-outcome="win" data-id="${escapeHtml(signal.id)}">Simulasi win</button><button class="btn btn-small btn-ghost" data-outcome="loss" data-id="${escapeHtml(signal.id)}">Simulasi loss</button><button class="btn btn-small btn-ghost" aria-label="Hapus sinyal" data-remove-signal="${escapeHtml(signal.id)}">×</button></div>` : ""}</div>`;
}
function dashboardView() {
  const pnl = calcTodayPnl();
  const latest = state.signals.slice().sort((a, b) => new Date(a.at) - new Date(b.at)).slice(0, 3);
  return `${heading("Dashboard Trading", "Ringkasan workspace simulasi Newton Prime.", `<button class="btn btn-ghost btn-small" data-action="refresh">${icon("refresh")} Perbarui</button>`)}
    ${noticeBanner()}
    <div class="grid stats-grid">
      <article class="card stat-card"><div class="stat-top"><span>P/L simulasi hari ini</span><span class="stat-icon">${icon("trend")}</span></div><div class="stat-value ${pnl >= 0 ? "positive" : "negative"}">${formatIDR(pnl)}</div><div class="stat-foot">Hanya hasil mock yang Anda pilih</div></article>
      <article class="card stat-card"><div class="stat-top"><span>Antrean sinyal</span><span class="stat-icon blue">${icon("signal")}</span></div><div class="stat-value">${state.signals.length}</div><div class="stat-foot">Disimpan lokal di browser ini</div></article>
      <article class="card stat-card"><div class="stat-top"><span>Status simulator</span><span class="stat-icon ${state.active ? "" : "gray"}">${icon("bolt")}</span></div><div class="stat-value ${state.active ? "positive" : ""}">${state.active ? "Memantau" : "Siap"}</div><div class="stat-foot">Tidak ada koneksi broker</div></article>
      <article class="card stat-card"><div class="stat-top"><span>Instrumen lokal</span><span class="stat-icon gold">${icon("globe")}</span></div><div class="stat-value">${assets.length || 110}</div><div class="stat-foot">Currencies dan crypto dari paket</div></article>
    </div>
    <div class="grid main-grid">
      <div class="stack">
        <section class="card hero-card"><div class="hero-content"><div><div class="hero-label">Demo workspace · order live terkunci</div><h2>${state.active ? "Simulator sedang memantau" : "Strategi siap ditinjau"}</h2><p>${state.active ? "Simulator hanya memantau antrean lokal. Pilih hasil mock pada sinyal untuk menambahkan catatan sintetis." : "Uji konfigurasi, antrekan, dan pencatatan tanpa kredensial atau dana broker."}</p><div class="hero-controls"><button class="btn btn-hero" data-action="toggle-sim">${state.active ? "Hentikan pemantauan" : "Mulai simulasi"}</button><button class="btn btn-hero-outline" data-nav="signals">Kelola sinyal ${icon("arrow")}</button></div></div><span class="state-pill" style="background:rgba(255,255,255,.18);color:#fff">${state.active ? "SIMULATOR ON" : "SIMULATOR READY"}</span></div></section>
        <div class="status-row"><div class="status-tile"><span class="status-symbol">${icon("bolt")}</span><div class="status-copy"><span>Engine lokal</span><strong>${state.active ? "Aktif" : "Berhenti"}</strong><small>Tanpa order broker</small></div></div><div class="status-tile"><span class="status-symbol blue">${icon("shield")}</span><div class="status-copy"><span>Koneksi Stockity</span><strong>Terputus</strong><small>API resmi belum terpasang</small></div></div></div>
        <section class="card"><div class="card-header"><div><h2>Ringkasan hasil sintetis</h2><p>Grafik dekoratif; tidak memuat harga atau histori pasar.</p></div>${iconTile("trend")}</div>${chartMarkup()}</section>
      </div>
      <div class="stack">
        <section class="card"><div class="card-header"><div><h2>Konfigurasi strategi</h2><p>${escapeHtml(state.config.symbol)} · ${escapeHtml(strategyLabel(state.config.strategy))} · ${formatIDR(state.config.amount)} nominal simulasi</p></div><button class="card-link" data-nav="strategy">Ubah</button></div><div class="field-grid"><div class="field"><label>Mode eksekusi</label><div class="input" aria-label="Mode eksekusi">Simulasi lokal</div></div><div class="field"><label>Risk guard</label><div class="input" aria-label="Risk guard">Stop loss aktif</div></div></div><div class="content-note" style="margin-top:12px">Stop loss simulasi ${formatIDR(state.config.stopLoss)} · target ${formatIDR(state.config.stopProfit)}</div></section>
        <section class="card"><div class="card-header"><div><h2>Sinyal berikutnya</h2><p>Mock outcomes dipilih manual; tidak mengikuti pergerakan harga.</p></div><button class="card-link" data-nav="signals">Semua</button></div>${latest.length ? `<div class="signal-list">${latest.map((signal) => signalCard(signal)).join("")}</div>` : `<div class="empty-state"><b>Belum ada sinyal lokal</b>Tambahkan format seperti <code>AUD/USD BUY 12:30</code> di halaman Sinyal.</div>`}</section>
      </div>
    </div>`;
}
function strategyLabel(value) { return ({ fast: "Fast", bounce: "Bounce", momentum: "Momentum", flash5: "Flash 5st" })[value] || "Fast"; }
function martingaleRows() {
  const base = Math.max(1, toNumber(state.config.amount, defaults.config.amount));
  const rate = Math.max(0, toNumber(state.config.martingalePercent, 0)) / 100;
  const count = Math.min(8, Math.max(0, toNumber(state.config.maxMartingale, 0)));
  return Array.from({ length: count + 1 }, (_, index) => `<tr><td><span class="step-tag">K${index}</span></td><td>${formatIDR(Math.round(base * Math.pow(1 + rate, index)))}</td><td>${formatIDR(Math.round(base * Math.pow(1 + rate, index) * toNumber(state.config.payout, 82) / 100))}</td></tr>`).join("");
}
function strategyView() {
  return `${heading("Strategi & batas risiko", "Parameter ini hanya mengatur simulasi lokal; tidak dikirim ke broker.")}${noticeBanner()}
    <div class="grid main-grid"><section class="card"><div class="card-header"><div><h2>Konfigurasi simulasi</h2><p>Nilai disimpan di localStorage browser ini.</p></div>${iconTile("sliders")}</div>
      <form id="config-form"><div class="field-grid">
        <div class="field"><label for="cfg-symbol">Instrumen</label><select class="input" id="cfg-symbol" name="symbol">${optionAssets(state.config.symbol)}</select></div>
        <div class="field"><label for="cfg-strategy">Strategi</label><select class="input" id="cfg-strategy" name="strategy">${[["fast","Fast"],["bounce","Bounce"],["momentum","Momentum"],["flash5","Flash 5st"]].map(([v,l]) => `<option value="${v}" ${state.config.strategy === v ? "selected" : ""}>${l}</option>`).join("")}</select></div>
        <div class="field"><label for="cfg-amount">Nominal dasar</label><div class="input-with-unit"><input class="input" id="cfg-amount" name="amount" type="number" min="1" step="1000" value="${toNumber(state.config.amount)}" required/><span class="unit">IDR simulasi</span></div><small class="field-hint">Bukan order atau dana nyata.</small></div>
        <div class="field"><label for="cfg-payout">Asumsi payout</label><div class="input-with-unit"><input class="input" id="cfg-payout" name="payout" type="number" min="0" max="100" step="1" value="${toNumber(state.config.payout)}"/><span class="unit">% mock</span></div></div>
        <div class="field"><label for="cfg-martingale">Kenaikan tiap langkah</label><div class="input-with-unit"><input class="input" id="cfg-martingale" name="martingalePercent" type="number" min="0" max="300" step="1" value="${toNumber(state.config.martingalePercent)}"/><span class="unit">%</span></div></div>
        <div class="field"><label for="cfg-max">Maks. langkah kompensasi</label><input class="input" id="cfg-max" name="maxMartingale" type="number" min="0" max="8" step="1" value="${toNumber(state.config.maxMartingale)}"/></div>
        <div class="field"><label for="cfg-loss">Stop loss harian</label><div class="input-with-unit"><input class="input" id="cfg-loss" name="stopLoss" type="number" min="1" step="1000" value="${toNumber(state.config.stopLoss)}"/><span class="unit">IDR demo</span></div></div>
        <div class="field"><label for="cfg-profit">Target profit simulasi</label><div class="input-with-unit"><input class="input" id="cfg-profit" name="stopProfit" type="number" min="1" step="1000" value="${toNumber(state.config.stopProfit)}"/><span class="unit">IDR demo</span></div></div>
        <div class="field full"><label class="check-row"><input type="checkbox" name="autoSwitchDemo" ${state.config.autoSwitchDemo ? "checked" : ""}/><span><b>Simulasikan perlindungan berhenti ketika batas tercapai</b><small>Hanya menghentikan engine lokal. Tidak ada perpindahan akun broker Real/Demo.</small></span></label></div>
      </div><div class="form-actions"><button class="btn btn-primary" type="submit">${icon("check")} Simpan konfigurasi lokal</button></div></form>
    </section><div class="stack"><section class="card"><div class="card-header"><div><h2>Tabel kompensasi</h2><p>Perhitungan nominal simulasi per langkah.</p></div>${iconTile("trend")}</div><div class="table-wrap"><table class="risk-table"><thead><tr><th>Langkah</th><th>Nominal</th><th>Potensi mock</th></tr></thead><tbody>${martingaleRows()}</tbody></table></div><p class="content-note">Angka adalah kalkulasi aritmetika berdasarkan input, bukan rekomendasi trading atau hasil aktual.</p></section><section class="card"><div class="card-header"><div><h2>Guardrail</h2><p>Batas berjalan hanya pada catatan demo.</p></div>${iconTile("shield")}</div><div class="integration-lock"><span class="lock-icon">${icon("lock")}</span><div><h3>Eksekusi live tetap terkunci</h3><p>Tak ada kredensial broker, cookie, OTP, atau endpoint trading privat yang dikonfigurasi.</p></div></div></section></div></div>`;
}
function parseSignalLine(line) {
  const match = line.trim().match(/^(.+?)\s*(?:[,|;]\s*|\s+)(BUY|SELL|CALL|PUT|UP|DOWN|LONG|SHORT)\b(?:\s*(?:[,|;]\s*|\s+)(\d{1,2}:\d{2}(?::\d{2})?))?$/i);
  if (!match) return null;
  const symbol = match[1].trim().toUpperCase().replace(/\s+/g, "");
  const direction = /^(BUY|CALL|UP|LONG)$/i.test(match[2]) ? "UP" : "DOWN";
  const at = new Date();
  if (match[3]) {
    const [hour, minute, second = "0"] = match[3].split(":").map(Number);
    if (hour > 23 || minute > 59 || second > 59) return null;
    at.setHours(hour, minute, second, 0);
    if (at.getTime() < Date.now() - 30000) at.setDate(at.getDate() + 1);
  } else {
    at.setMinutes(at.getMinutes() + 1, 0, 0);
  }
  const known = assets.find((asset) => normalizeSymbol(asset.ric) === normalizeSymbol(symbol) || normalizeSymbol(asset.name) === normalizeSymbol(symbol));
  return { id: crypto.randomUUID(), symbol: known?.name || symbol, direction, at: at.toISOString(), source: "Input website", status: "queued" };
}
function normalizeSymbol(value) { return String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, ""); }
function signalsView() {
  const items = state.signals.slice().sort((a, b) => new Date(a.at) - new Date(b.at));
  return `${heading("Antrean sinyal", "Tempel atau masukkan sinyal. Hasil hanya dicatat sebagai simulasi manual.", `<button class="btn btn-ghost btn-small" data-nav="strategy">Atur strategi ${icon("arrow")}</button>`)}${noticeBanner()}
    <div class="grid main-grid"><section class="card"><div class="card-header"><div><h2>Tambah sinyal</h2><p>Satu sinyal per baris. Arah: BUY/SELL, CALL/PUT, UP/DOWN.</p></div>${iconTile("signal")}</div><form id="signal-form"><div class="field"><label for="signal-text">Format input website</label><textarea id="signal-text" name="signalText" class="input" placeholder="AUD/USD BUY 12:30&#10;BTCUSD-OTC | PUT | 13:05"></textarea><small class="field-hint">Waktu lokal 24 jam opsional. Baris yang tidak cocok akan ditampilkan sebagai error.</small></div><div class="form-actions"><button type="submit" class="btn btn-primary">Tambahkan ke antrean</button></div></form></section>
      <section class="card"><div class="card-header"><div><h2>Simulasi sinyal</h2><p>Pilih hasil mock secara manual; tidak dipicu oleh market data.</p></div>${iconTile("bolt")}</div><div class="banner banner-danger"><span class="banner-icon">!</span><div>Hasil win/loss di bawah adalah input simulasi, bukan sinyal atau performa aktual.</div></div><div class="signal-list">${items.length ? items.map((signal) => signalCard(signal)).join("") : `<div class="empty-state"><b>Antrean masih kosong</b>Contoh: AUD/USD BUY 12:30</div>`}</div></section></div>`;
}
function historyView() {
  const rows = state.history.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const actions = rows.length ? `<button class="btn btn-ghost btn-small" data-action="clear-history">Hapus riwayat lokal</button>` : "";
  return `${heading("Riwayat simulasi", "Jurnal hasil yang Anda tandai sendiri di browser ini.", actions)}${noticeBanner()}<section class="card"><div class="card-header"><div><h2>Catatan hasil</h2><p>${rows.length} hasil sintetis · tidak terhubung ke riwayat akun Stockity.</p></div>${iconTile("history")}</div>${rows.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Waktu</th><th>Aset</th><th>Arah</th><th>Strategi</th><th>Nominal mock</th><th>Hasil</th><th>P/L mock</th></tr></thead><tbody>${rows.map((row) => `<tr><td>${localDate(row.createdAt)} ${localTime(row.createdAt)}</td><td><b>${escapeHtml(row.symbol)}</b></td><td>${row.direction === "UP" ? "CALL" : "PUT"}</td><td>${escapeHtml(strategyLabel(row.strategy))}</td><td>${formatIDR(row.stake)}</td><td><span class="outcome ${row.outcome === "WIN" ? "win" : "loss"}">${row.outcome === "WIN" ? "SIM WIN" : "SIM LOSS"}</span></td><td class="${row.pnl >= 0 ? "positive" : "negative"}"><b>${formatIDR(row.pnl)}</b></td></tr>`).join("")}</tbody></table></div>` : `<div class="empty-state"><b>Belum ada catatan hasil</b>Gunakan tombol simulasi win/loss pada halaman Sinyal. Hasil masuk ke jurnal lokal, bukan ke broker.</div>`}</section>`;
}
function optionAssets(selected) {
  const list = assets.length ? assets : [{ ric: "AUD/CAD", name: "AUD/CAD", typeName: "Currencies" }];
  return list.map((asset) => `<option value="${escapeHtml(asset.name)}" ${selected === asset.name ? "selected" : ""}>${escapeHtml(asset.name)} · ${escapeHtml(asset.typeName)}</option>`).join("");
}
function assetsView() {
  const query = assetQuery.toLowerCase();
  const filtered = assets.filter((asset) => `${asset.name} ${asset.ric} ${asset.typeName}`.toLowerCase().includes(query)).slice(0, 90);
  return `${heading("Pilih instrumen", "Katalog lokal yang disertakan dalam paket Android; availability harga belum terhubung.")}${noticeBanner()}<section class="card"><div class="market-toolbar"><div class="search-wrap">${icon("search","search-icon")}<input class="input" id="asset-search" value="${escapeHtml(assetQuery)}" placeholder="Cari pasangan atau aset…" aria-label="Cari instrumen"/></div><span class="mode-pill">${assets.length} instrumen lokal</span></div><div class="asset-grid">${filtered.map((asset) => `<button class="asset-card ${state.config.symbol === asset.name ? "selected" : ""}" data-asset="${escapeHtml(asset.name)}"><span class="asset-mark">${escapeHtml((asset.name.match(/[A-Z]/g) || ["A"] ).slice(0,2).join(""))}</span><span class="asset-text"><strong>${escapeHtml(asset.name)}</strong><small>${escapeHtml(asset.typeName)} · ${escapeHtml(asset.ric)}</small></span></button>`).join("") || `<div class="empty-state">Tidak ada instrumen yang cocok.</div>`}</div><p class="content-note">Nama dan kode berasal dari katalog APK. Harga, payout, jadwal, dan status instrumen tidak diperbarui dari Stockity.</p></section>`;
}
function integrationView() {
  return `${heading("Integrasi & keselamatan", "Status koneksi Worker dan batas akses broker.")}
    <div class="banner"><span class="banner-icon">i</span><div><strong>Integrasi otomatis dipilih, tetapi belum dapat diaktifkan.</strong> Tidak ditemukan kontrak API developer Stockity resmi pada halaman publik yang ditinjau. Website tidak meniru endpoint privat binary.</div></div>
    <div class="grid main-grid"><section class="card"><div class="card-header"><div><h2>Status integrasi</h2><p>Konfigurasi saat ini tidak memiliki akses broker.</p></div>${iconTile("shield")}</div><div class="integration-lock"><span class="lock-icon">${icon("lock")}</span><div><h3>Live order execution: LOCKED</h3><p>Worker menolak request <code class="code-chip">POST /api/orders</code> dengan HTTP 423. Tidak ada username, password, OTP, cookie, API key, atau data transaksi yang dikirim ke server.</p></div></div><hr class="divider"/><div class="field-grid"><div class="field"><label>Worker API</label><div class="input">${apiHealth?.ok ? "Tersambung" : "Belum dicek"}</div></div><div class="field"><label>Broker</label><div class="input">Tidak terhubung</div></div><div class="field"><label>Kontrak API resmi</label><div class="input">Belum terverifikasi</div></div><div class="field"><label>Penyimpanan konfigurasi</label><div class="input">Browser lokal saja</div></div></div><div class="form-actions"><button class="btn btn-secondary" data-action="check-status">Periksa status Worker</button></div></section>
      <div class="stack"><section class="card"><div class="card-header"><div><h2>Untuk mengaktifkan di masa depan</h2><p>Integrasi baru hanya melalui kontrak API resmi.</p></div>${iconTile("lock")}</div><ol class="content-note"><li>Kontrak API resmi dari penyedia yang mengizinkan otomasi.</li><li>Otorisasi yang sesuai untuk akun dan lingkungan demo/live.</li><li>Secret disimpan sebagai Worker secret; jangan menaruhnya di chat atau frontend.</li><li>Tinjau guardrail risiko lalu beri persetujuan terpisah sebelum order diaktifkan.</li></ol><a class="external-link" href="https://stockity1.id" target="_blank" rel="noopener noreferrer">Kunjungi situs resmi Stockity ${icon("arrow")}</a></section><section class="card"><div class="card-header"><div><h2>Privasi data lokal</h2><p>Perilaku build ini.</p></div>${iconTile("shield")}</div><p class="content-note">Sinyal, konfigurasi, dan jurnal simulasi disimpan di localStorage browser saat ini. Gunakan tombol reset untuk menghapus semuanya dari browser ini. Jangan memasukkan password broker karena tidak ada login broker di versi ini.</p><div class="form-actions"><button class="btn btn-ghost" data-action="reset-local">Reset semua data lokal</button></div></section></div></div>`;
}
function render() {
  currentView = NAV.some((item) => item.id === state.view) ? state.view : "dashboard";
  const views = { dashboard: dashboardView, strategy: strategyView, signals: signalsView, history: historyView, assets: assetsView, integration: integrationView };
  root.innerHTML = layout(views[currentView]());
  const search = document.getElementById("asset-search");
  if (search) {
    search.addEventListener("input", (event) => {
      const cursor = event.target.selectionStart;
      assetQuery = event.target.value;
      render();
      const next = document.getElementById("asset-search");
      next?.focus();
      next?.setSelectionRange(cursor, cursor);
    });
  }
}
function go(view) { state.view = view; saveState(); render(); window.scrollTo({ top: 0, behavior: "smooth" }); }
function setConfig(form) {
  const data = new FormData(form);
  const next = {
    symbol: String(data.get("symbol") || "AUD/CAD"),
    strategy: String(data.get("strategy") || "fast"),
    amount: Math.max(1, toNumber(data.get("amount"), defaults.config.amount)),
    payout: Math.min(100, Math.max(0, toNumber(data.get("payout"), 82))),
    martingalePercent: Math.min(300, Math.max(0, toNumber(data.get("martingalePercent"), 65))),
    maxMartingale: Math.min(8, Math.max(0, Math.floor(toNumber(data.get("maxMartingale"), 3)))),
    stopLoss: Math.max(1, toNumber(data.get("stopLoss"), 50000)),
    stopProfit: Math.max(1, toNumber(data.get("stopProfit"), 75000)),
    autoSwitchDemo: data.get("autoSwitchDemo") === "on",
  };
  state.config = next;
  saveState();
  render();
  showNotice("Konfigurasi simulasi tersimpan di browser ini.");
}
function addSignals(raw) {
  const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) { showNotice("Masukkan minimal satu baris sinyal terlebih dahulu."); return; }
  const parsed = lines.map(parseSignalLine);
  const good = parsed.filter(Boolean);
  const badCount = parsed.length - good.length;
  if (good.length) {
    state.signals = [...good, ...state.signals].slice(0, 150);
    saveState();
    render();
  }
  showNotice(good.length ? `${good.length} sinyal ditambahkan${badCount ? `; ${badCount} baris tidak cocok` : ""}.` : "Format tidak cocok. Contoh: AUD/USD BUY 12:30.");
}
function simulateOutcome(id, result) {
  const index = state.signals.findIndex((signal) => signal.id === id);
  if (index < 0) return;
  const signal = state.signals[index];
  const stake = Math.round(toNumber(state.config.amount) * Math.pow(1 + toNumber(state.config.martingalePercent) / 100, Math.min(state.lossStreak, toNumber(state.config.maxMartingale))));
  const win = result === "win";
  const pnl = win ? Math.round(stake * toNumber(state.config.payout) / 100) : -stake;
  const row = {
    id: crypto.randomUUID(),
    symbol: signal.symbol,
    direction: signal.direction,
    strategy: state.config.strategy,
    stake,
    outcome: win ? "WIN" : "LOSS",
    pnl,
    createdAt: new Date().toISOString(),
    dateKey: todayKey(),
    synthetic: true,
  };
  state.history.unshift(row);
  state.history = state.history.slice(0, 500);
  state.signals.splice(index, 1);
  state.lossStreak = win ? 0 : Math.min(toNumber(state.config.maxMartingale), state.lossStreak + 1);
  const pnlToday = calcTodayPnl();
  if (state.config.autoSwitchDemo && (pnlToday <= -Math.abs(toNumber(state.config.stopLoss)) || pnlToday >= Math.abs(toNumber(state.config.stopProfit)))) state.active = false;
  saveState();
  render();
  showNotice(`Catatan ${win ? "SIM WIN" : "SIM LOSS"} dibuat secara lokal. Tidak ada order yang dikirim.`);
}
async function checkStatus() {
  try {
    const response = await fetch("/api/health", { headers: { accept: "application/json" }, cache: "no-store" });
    apiHealth = await response.json();
    const integration = await fetch("/api/integration", { headers: { accept: "application/json" }, cache: "no-store" }).then((res) => res.json());
    render();
    showNotice(`Worker ${apiHealth.ok ? "aktif" : "tidak tersedia"}; integrasi ${integration.state}. Live trading tetap terkunci.`);
  } catch {
    apiHealth = { ok: false };
    render();
    showNotice("Worker API tidak dapat dijangkau; simulator tetap berjalan di browser.");
  }
}
root.addEventListener("click", (event) => {
  const nav = event.target.closest("[data-nav]");
  if (nav) { go(nav.dataset.nav); return; }
  const asset = event.target.closest("[data-asset]");
  if (asset) { state.config.symbol = asset.dataset.asset; saveState(); go("strategy"); showNotice(`${asset.dataset.asset} dipilih untuk simulasi.`); return; }
  const outcome = event.target.closest("[data-outcome]");
  if (outcome) { simulateOutcome(outcome.dataset.id, outcome.dataset.outcome); return; }
  const remove = event.target.closest("[data-remove-signal]");
  if (remove) { state.signals = state.signals.filter((item) => item.id !== remove.dataset.removeSignal); saveState(); render(); showNotice("Sinyal dihapus dari antrean lokal."); return; }
  const button = event.target.closest("[data-action]");
  if (!button) return;
  switch (button.dataset.action) {
    case "toggle-sim": state.active = !state.active; saveState(); render(); showNotice(state.active ? "Simulator lokal mulai memantau antrean. Tidak ada order otomatis." : "Pemantauan simulasi dihentikan."); break;
    case "refresh": checkStatus(); break;
    case "check-status": checkStatus(); break;
    case "clear-history": if (window.confirm("Hapus semua catatan simulasi lokal? Tindakan ini tidak dapat dibatalkan.")) { state.history = []; state.lossStreak = 0; saveState(); render(); showNotice("Riwayat simulasi lokal dihapus."); } break;
    case "reset-local": if (window.confirm("Hapus konfigurasi, antrean, dan riwayat simulasi dari browser ini?")) { localStorage.removeItem(STORAGE_KEY); state = clone(defaults); saveState(); go("dashboard"); showNotice("Semua data lokal telah direset."); } break;
  }
});
root.addEventListener("submit", (event) => {
  if (event.target.id === "config-form") { event.preventDefault(); setConfig(event.target); }
  if (event.target.id === "signal-form") { event.preventDefault(); const text = new FormData(event.target).get("signalText"); addSignals(String(text || "")); }
});
async function boot() {
  render();
  try {
    const response = await fetch("/data/trading-assets.json", { cache: "force-cache" });
    if (response.ok) {
      const data = await response.json();
      assets = Array.isArray(data) ? data : [];
      if (assets.length && !assets.some((asset) => asset.name === state.config.symbol)) state.config.symbol = assets[0].name;
      render();
    }
  } catch { /* catalog fallback retains the default instrument */ }
  checkStatus();
}
boot();
