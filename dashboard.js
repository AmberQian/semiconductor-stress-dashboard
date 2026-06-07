const POLL_MS = 15000;

const elements = {
  status: document.querySelector("#status"),
  riskPanel: document.querySelector("#riskPanel"),
  riskTitle: document.querySelector("#riskTitle"),
  riskText: document.querySelector("#riskText"),
  riskScore: document.querySelector("#riskScore"),
  vixeq: document.querySelector("#vixeq"),
  vixeqSource: document.querySelector("#vixeqSource"),
  vix: document.querySelector("#vix"),
  vixSource: document.querySelector("#vixSource"),
  premium: document.querySelector("#premium"),
  cor1m: document.querySelector("#cor1m"),
  cor1mSource: document.querySelector("#cor1mSource"),
  callPut: document.querySelector("#callPut"),
  callPutSource: document.querySelector("#callPutSource"),
  skew: document.querySelector("#skew"),
  skewSource: document.querySelector("#skewSource"),
  hvl: document.querySelector("#hvl"),
  hvlSource: document.querySelector("#hvlSource"),
  hvlDistance: document.querySelector("#hvlDistance"),
  spx: document.querySelector("#spx"),
  spxSource: document.querySelector("#spxSource"),
  sentiment: document.querySelector("#sentiment"),
  sentimentSource: document.querySelector("#sentimentSource"),
  checks: document.querySelector("#checks"),
  quotes: document.querySelector("#quotes"),
  quoteTime: document.querySelector("#quoteTime"),
  quoteNote: document.querySelector("#quoteNote"),
};

function formatNumber(value, digits = 2) {
  return value === null || value === undefined ? "--" : Number(value).toFixed(digits);
}

function formatTime(value) {
  if (!value) return "--";
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

function setStatus(kind, text, detail) {
  const dot = elements.status.querySelector(".dot");
  dot.className = `dot ${kind}`;
  elements.status.querySelector("b").textContent = text;
  elements.status.querySelector("small").textContent = detail;
}

function shortError(message) {
  if (!message) return "";
  return message.length > 90 ? `${message.slice(0, 87)}...` : message;
}

function updateRisk(evaluation, provider) {
  const labels = {
    fragile: ["结构脆弱", "多个杠杆踩踏条件同时成立，重点看是否已经跌破 HVL，并观察踩踏是否扩散。"],
    watch: ["进入观察", "核心条件部分成立，还需要更多期权与相关性信号共振，暂时不把单一指标当交易指令。"],
    normal: ["结构正常", "目前没有形成足够共振。价格可能波动，但还看不到完整的“拥挤杠杆踩踏”结构。"],
  };
  const [title, text] = labels[evaluation.state] || labels.normal;
  elements.riskPanel.className = `risk-panel ${evaluation.state}`;
  elements.riskTitle.textContent = title;
  elements.riskText.textContent = `${text} 数据源：${provider}。`;
  elements.riskScore.textContent = `${evaluation.score}/${evaluation.checks.length}`;
}

function translateSource(source) {
  const map = {
    "manual": "手动输入",
    "mock": "演示数据",
    "post reference": "帖子参考值",
    "provider/index feed": "等待指数数据源",
    "needs licensed Cboe/source feed": "需要 Cboe 或授权指数源",
    "requires options chain aggregation": "需要期权链聚合",
    "requires options IV/skew feed": "需要期权 IV/Skew 数据",
    "requires sentiment feed": "需要情绪数据源",
    "needs index feed": "需要指数行情源",
    "mock score 0-100": "演示分数 0-100",
  };
  return map[source] || source || "--";
}

function updateIndicators(structure) {
  const { indicators } = structure;
  const premium =
    indicators.vixeq.value !== null && indicators.vix.value !== null && indicators.vix.value > 0
      ? indicators.vixeq.value / indicators.vix.value
      : null;

  elements.vixeq.textContent = formatNumber(indicators.vixeq.value);
  elements.vixeqSource.textContent = translateSource(indicators.vixeq.source);
  elements.vix.textContent = formatNumber(indicators.vix.value);
  elements.vixSource.textContent = translateSource(indicators.vix.source);
  elements.premium.textContent = premium === null ? "--" : `${premium.toFixed(2)}x`;
  elements.cor1m.textContent = formatNumber(indicators.cor1m.value);
  elements.cor1mSource.textContent = translateSource(indicators.cor1m.source);
  elements.callPut.textContent = formatNumber(indicators.callPut.value);
  elements.callPutSource.textContent = translateSource(indicators.callPut.source);
  elements.skew.textContent = indicators.leftTailSkew.value === null ? "--" : `${formatNumber(indicators.leftTailSkew.value)} IV点`;
  elements.skewSource.textContent = translateSource(indicators.leftTailSkew.source);
  elements.hvl.textContent = formatNumber(indicators.hvl.value, 0);
  elements.hvlSource.textContent = indicators.hvl.source === "manual" || indicators.hvl.source === "post reference" ? "手动参考，非实时" : translateSource(indicators.hvl.source);
  if (elements.spx) {
    elements.spx.textContent = formatNumber(indicators.spx.value);
    elements.spxSource.textContent = translateSource(indicators.spx.source);
  }
  if (elements.sentiment) {
    elements.sentiment.textContent = indicators.sentiment.value === null ? "--" : `${formatNumber(indicators.sentiment.value, 0)}/100`;
    elements.sentimentSource.textContent = translateSource(indicators.sentiment.source);
  }
  if (elements.hvlDistance) {
    const spx = indicators.spx.value;
    const hvl = indicators.hvl.value;
    if (spx === null || hvl === null) {
      elements.hvlDistance.textContent = "等待 SPX 与 HVL 数据";
      elements.hvlDistance.className = "hvl-distance";
    } else {
      const distance = ((spx - hvl) / hvl) * 100;
      elements.hvlDistance.textContent =
        distance < 0
          ? `SPX 已低于 HVL ${Math.abs(distance).toFixed(2)}%，执行层进入负 Gamma 风险区`
          : `SPX 仍高于 HVL ${distance.toFixed(2)}%，执行层暂未跌破`;
      elements.hvlDistance.className = `hvl-distance ${distance < 0 ? "danger" : "safe"}`;
    }
  }
}

function translateCheckDetail(detail) {
  if (detail === "等待 IV/skew") return "等待 IV/Skew";
  return detail;
}

function updateChecks(checks) {
  const missingHints = {
    vixeqPremium: "缺 VIXEQ 和 VIX。VIXEQ/COR1M 来自 Cboe 指数源；VIX 可从 Cboe 或指数行情源获取。",
    lowCorrelation: "缺 COR1M。它是 Cboe 1个月隐含相关性指数，需要 Cboe 或授权数据商。",
    callHeavy: "缺期权链。需要拿 SMH/NVDA/AMD/MU 等期权成交量或未平仓量后聚合。",
    skewRising: "缺 IV/Greeks。需要期权链里的隐含波动率，再计算左尾 put 相对 call 的 IV 溢价。",
    hvlBreak: "缺 SPX 或 HVL。SPX 要指数行情，HVL 要 Gamma 模型或帖子参考值。",
    sentimentHot: "缺情绪指标。可以用 Fear & Greed、AAII、NAAIM 等作为辅助，不是核心触发。",
  };

  elements.checks.replaceChildren(
    ...checks.map((check) => {
      const row = document.createElement("div");
      row.className = `check ${check.active ? "active" : "waiting"}`;

      const text = document.createElement("div");
      text.className = "check-text";

      const label = document.createElement("b");
      label.textContent = check.label
        .replace("溢價", "溢价")
        .replace("極低", "极低")
        .replace("左尾 Skew 升溫", "左尾 Skew 升温");

      const hint = document.createElement("p");
      hint.textContent = check.active
        ? "信号已亮起，说明该结构条件成立。临时网页快照只用于展示表盘，不等于交易指令。"
        : missingHints[check.id] || "等待对应数据源。";

      const detail = document.createElement("small");
      detail.textContent = translateCheckDetail(check.detail);

      text.append(label, hint);
      row.append(text, detail);
      return row;
    }),
  );
}

function updateQuotes(quotes, timestamp) {
  elements.quoteTime.textContent = `更新：${formatTime(timestamp)}`;
  elements.quotes.replaceChildren(
    ...quotes.map((quote) => {
      const card = document.createElement("div");
      card.className = "quote";

      const symbol = document.createElement("b");
      symbol.textContent = quote.symbol;

      const price = document.createElement("strong");
      price.textContent = formatNumber(quote.price);

      const change = document.createElement("small");
      const changeValue = quote.changePercent;
      change.textContent = changeValue === null || changeValue === undefined ? "--" : `${changeValue > 0 ? "+" : ""}${changeValue.toFixed(2)}%`;
      change.className = changeValue >= 0 ? "up" : "down";

      card.append(symbol, price, change);
      return card;
    }),
  );
}

async function loadSnapshot() {
  try {
    const response = await fetch("/api/snapshot", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    updateRisk(data.evaluation, data.structure.provider);
    updateIndicators(data.structure);
    updateChecks(data.evaluation.checks);
    updateQuotes(data.quotes, data.timestamp);
    if (data.dataError) {
      setStatus("error", "降级数据", shortError(data.dataError));
      elements.quoteNote.textContent = "当前 Massive key 没有实时 Snapshot 权限，表盘已优先显示公开网页临时快照。";
    } else {
      setStatus("ok", "已连接", formatTime(data.timestamp));
      elements.quoteNote.textContent = "当前报价用于观察半导体风险资产的同步性。";
    }
  } catch (error) {
    try {
      const data = await loadManualSnapshot();
      updateRisk(data.evaluation, data.structure.provider);
      updateIndicators(data.structure);
      updateChecks(data.evaluation.checks);
      updateQuotes(data.quotes, data.timestamp);
      setStatus("ok", "静态快照", formatTime(data.timestamp));
      elements.quoteNote.textContent = "当前为 GitHub Pages 静态快照。实时数据需要在本地启动后端服务。";
    } catch (fallbackError) {
      setStatus("error", "连接失败", `${error.message}; ${fallbackError.message}`);
    }
  }
}

function buildEvaluation(structure) {
  const { vixeq, vix, cor1m, callPut, leftTailSkew, hvl, spx, sentiment } = structure.indicators;
  const checks = [
    {
      id: "vixeqPremium",
      label: "VIXEQ/VIX 溢价",
      active: vixeq.value !== null && vix.value !== null && vix.value > 0 && vixeq.value / vix.value >= 1.6,
      detail: vixeq.value !== null && vix.value !== null && vix.value > 0 ? `${(vixeq.value / vix.value).toFixed(2)}x` : "等待数据",
    },
    {
      id: "lowCorrelation",
      label: "COR1M 极低",
      active: cor1m.value !== null && cor1m.value <= 15,
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
      active: leftTailSkew.value !== null && leftTailSkew.value >= 8,
      detail: leftTailSkew.value === null ? "等待 IV/Skew" : `${leftTailSkew.value.toFixed(2)} IV点`,
    },
    {
      id: "hvlBreak",
      label: "跌破 HVL",
      active: spx.value !== null && hvl.value !== null && spx.value < hvl.value,
      detail: spx.value === null || hvl.value === null ? "等待 SPX/HVL" : `${spx.value.toFixed(2)} / ${hvl.value.toFixed(0)}`,
    },
    {
      id: "sentimentHot",
      label: "情绪过热",
      active: sentiment.value !== null && sentiment.value >= 70,
      detail: sentiment.value === null ? "等待情绪数据" : `${sentiment.value.toFixed(0)}/100`,
    },
  ];
  const score = checks.filter((check) => check.active).length;
  const state = score >= 4 ? "fragile" : score >= 2 ? "watch" : "normal";
  return { state, score, checks };
}

async function loadManualSnapshot() {
  const response = await fetch("manual_snapshot.json", { cache: "no-store" });
  if (!response.ok) throw new Error(`manual_snapshot.json HTTP ${response.status}`);
  const snapshot = await response.json();
  const indicators = {};
  for (const [key, item] of Object.entries(snapshot.indicators || {})) {
    indicators[key] = {
      label: key,
      value: item.value === null || item.value === undefined ? null : Number(item.value),
      source: item.source || "临时网页快照",
    };
  }
  const structure = {
    timestamp: snapshot.capturedAt || new Date().toISOString(),
    provider: "GitHub Pages 静态快照",
    indicators,
  };
  const quotes = (snapshot.quotes || []).map((quote) => ({
    symbol: quote.symbol,
    price: quote.price,
    changePercent: quote.changePercent,
    updatedAt: snapshot.capturedAt || new Date().toISOString(),
    source: quote.source || "临时网页快照",
  }));
  return {
    timestamp: structure.timestamp,
    structure,
    quotes,
    evaluation: buildEvaluation(structure),
  };
}

loadSnapshot();
setInterval(loadSnapshot, POLL_MS);
