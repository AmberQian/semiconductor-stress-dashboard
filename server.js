import http from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8000);

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
};

async function loadEnv() {
  const envPath = path.join(__dirname, ".env");
  if (!existsSync(envPath)) return;

  const raw = await readFile(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [key, ...valueParts] = trimmed.split("=");
    if (!process.env[key]) {
      process.env[key] = valueParts.join("=").trim();
    }
  }
}

function json(res, status, payload) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(JSON.stringify(payload));
}

function numberOrNull(value) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getWatchlist() {
  return (process.env.WATCHLIST || "SMH,NVDA,AMD,MU,AVGO,INTC,QQQ,SPY")
    .split(",")
    .map((symbol) => symbol.trim().toUpperCase())
    .filter(Boolean);
}

function mockQuotes(symbols) {
  const base = {
    SMH: 318.42,
    NVDA: 182.31,
    AMD: 247.88,
    MU: 256.40,
    AVGO: 397.20,
    INTC: 42.14,
    QQQ: 632.18,
    SPY: 687.51,
  };

  return symbols.map((symbol, index) => {
    const seed = symbol.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const wave = Math.sin(Date.now() / 45000 + seed) * 0.9;
    const price = (base[symbol] || 100 + index * 13) * (1 + wave / 100);
    const changePercent = wave + (index % 3 === 0 ? -1.1 : 0.6);
    return {
      symbol,
      price: Number(price.toFixed(2)),
      changePercent: Number(changePercent.toFixed(2)),
      updatedAt: new Date().toISOString(),
    };
  });
}

async function tradierQuotes(symbols) {
  const token = process.env.TRADIER_TOKEN;
  if (!token) throw new Error("TRADIER_TOKEN is missing");

  const baseUrl = process.env.TRADIER_BASE_URL || "https://api.tradier.com";
  const url = `${baseUrl}/v1/markets/quotes?symbols=${encodeURIComponent(symbols.join(","))}&greeks=false`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Tradier quotes failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const raw = data?.quotes?.quote || [];
  const rows = Array.isArray(raw) ? raw : [raw];
  return rows.map((quote) => ({
    symbol: quote.symbol,
    price: numberOrNull(quote.last),
    changePercent: numberOrNull(quote.change_percentage),
    updatedAt: new Date().toISOString(),
  }));
}

async function polygonQuotes(symbols) {
  const apiKey = process.env.POLYGON_API_KEY || process.env.MASSIVE_API_KEY;
  if (!apiKey) throw new Error("POLYGON_API_KEY or MASSIVE_API_KEY is missing");
  const provider = (process.env.DATA_PROVIDER || "mock").toLowerCase();
  const apiBase = provider === "massive" ? "https://api.massive.com" : "https://api.polygon.io";

  const results = await Promise.all(
    symbols.map(async (symbol) => {
      const url = `${apiBase}/v2/snapshot/locale/us/markets/stocks/tickers/${encodeURIComponent(symbol)}?apiKey=${encodeURIComponent(apiKey)}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Polygon quote failed for ${symbol}: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      const ticker = data?.ticker || {};
      const day = ticker.day || {};
      const previous = ticker.prevDay || {};
      const price = numberOrNull(ticker.lastTrade?.p) ?? numberOrNull(day.c);
      const priorClose = numberOrNull(previous.c);
      const changePercent = price && priorClose ? ((price - priorClose) / priorClose) * 100 : null;
      return {
        symbol,
        price,
        changePercent: changePercent === null ? null : Number(changePercent.toFixed(2)),
        updatedAt: new Date().toISOString(),
      };
    }),
  );

  return results;
}

async function getQuotes() {
  const symbols = getWatchlist();
  const provider = (process.env.DATA_PROVIDER || "mock").toLowerCase();
  if (provider === "tradier") return tradierQuotes(symbols);
  if (provider === "polygon" || provider === "massive") return polygonQuotes(symbols);
  return mockQuotes(symbols);
}

function getStructureSnapshot() {
  const provider = (process.env.DATA_PROVIDER || "mock").toLowerCase();
  const mock = provider === "mock";
  const timestamp = new Date().toISOString();

  return {
    timestamp,
    provider,
    indicators: {
      vixeq: {
        label: "VIXEQ",
        value: numberOrNull(process.env.VIXEQ_VALUE) ?? (mock ? 41.8 : null),
        source: process.env.VIXEQ_VALUE ? "manual" : mock ? "mock" : "needs licensed Cboe/source feed",
      },
      vix: {
        label: "VIX",
        value: numberOrNull(process.env.VIX_VALUE) ?? (mock ? 18.6 : null),
        source: process.env.VIX_VALUE ? "manual" : mock ? "mock" : "provider/index feed",
      },
      cor1m: {
        label: "COR1M",
        value: numberOrNull(process.env.COR1M_VALUE) ?? (mock ? 6.33 : null),
        source: process.env.COR1M_VALUE ? "manual" : mock ? "mock" : "needs licensed Cboe/source feed",
      },
      hvl: {
        label: "HVL",
        value: numberOrNull(process.env.HVL_VALUE) ?? 7495,
        source: process.env.HVL_VALUE ? "manual" : "post reference",
      },
      callPut: {
        label: "Call/Put",
        value: mock ? 2.7 : null,
        source: mock ? "mock" : "requires options chain aggregation",
      },
      leftTailSkew: {
        label: "Left-tail Skew",
        value: mock ? 72 : null,
        source: mock ? "mock score 0-100" : "requires options IV/skew feed",
      },
    },
  };
}

function evaluate(snapshot) {
  const { vixeq, vix, cor1m, callPut, leftTailSkew } = snapshot.indicators;
  const checks = [
    {
      id: "vixeqPremium",
      label: "VIXEQ/VIX 溢价",
      active: vixeq.value !== null && vix.value !== null && vix.value > 0 && vixeq.value / vix.value >= 1.6,
      detail: vixeq.value !== null && vix.value !== null ? `${(vixeq.value / vix.value).toFixed(2)}x` : "等待数据",
    },
    {
      id: "lowCorrelation",
      label: "COR1M 极低",
      active: cor1m.value !== null && cor1m.value <= 10,
      detail: cor1m.value === null ? "等待数据" : String(cor1m.value),
    },
    {
      id: "callHeavy",
      label: "Call heavy",
      active: callPut.value !== null && callPut.value >= 2,
      detail: callPut.value === null ? "等待期权链" : `${callPut.value.toFixed(2)}x`,
    },
    {
      id: "skewRising",
      label: "左尾 Skew 升温",
      active: leftTailSkew.value !== null && leftTailSkew.value >= 65,
      detail: leftTailSkew.value === null ? "等待 IV/skew" : `${leftTailSkew.value}/100`,
    },
  ];

  const score = checks.filter((check) => check.active).length;
  const state = score >= 3 ? "fragile" : score >= 2 ? "watch" : "normal";
  return { state, score, checks };
}

async function serveStatic(req, res) {
  const parsed = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsed.pathname === "/" ? "/index.html" : decodeURIComponent(parsed.pathname);
  const filePath = path.normalize(path.join(__dirname, pathname));

  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const body = await readFile(filePath);
    const ext = path.extname(filePath);
    res.writeHead(200, {
      "content-type": MIME_TYPES[ext] || "application/octet-stream",
    });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}

await loadEnv();

const server = http.createServer(async (req, res) => {
  try {
    const parsed = new URL(req.url, `http://${req.headers.host}`);

    if (parsed.pathname === "/api/snapshot") {
      const structure = getStructureSnapshot();
      const quotes = await getQuotes();
      json(res, 200, {
        timestamp: new Date().toISOString(),
        structure,
        quotes,
        evaluation: evaluate(structure),
      });
      return;
    }

    if (parsed.pathname === "/api/health") {
      json(res, 200, {
        ok: true,
        provider: process.env.DATA_PROVIDER || "mock",
        watchlist: getWatchlist(),
      });
      return;
    }

    await serveStatic(req, res);
  } catch (error) {
    json(res, 500, {
      error: error.message,
      provider: process.env.DATA_PROVIDER || "mock",
    });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Dashboard running at http://127.0.0.1:${PORT}/dashboard.html`);
});
