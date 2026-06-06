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
  checks: document.querySelector("#checks"),
  quotes: document.querySelector("#quotes"),
  quoteTime: document.querySelector("#quoteTime"),
};

function formatNumber(value, digits = 2) {
  return value === null || value === undefined ? "--" : Number(value).toFixed(digits);
}

function formatTime(value) {
  if (!value) return "--";
  return new Intl.DateTimeFormat("zh-Hant", {
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

function updateRisk(evaluation, provider) {
  const labels = {
    fragile: ["結構脆弱", "多個槓桿踩踏條件同時成立，重點等待 HVL/Gamma 執行確認。"],
    watch: ["進入觀察", "核心條件部分成立，需等待更多期權與相關性信號共振。"],
    normal: ["結構正常", "目前未形成足夠共振，避免只靠單一故事交易。"],
  };
  const [title, text] = labels[evaluation.state] || labels.normal;
  elements.riskPanel.className = `risk-panel ${evaluation.state}`;
  elements.riskTitle.textContent = title;
  elements.riskText.textContent = `${text} Data provider: ${provider}.`;
  elements.riskScore.textContent = `${evaluation.score}/4`;
}

function updateIndicators(structure) {
  const { indicators } = structure;
  const premium =
    indicators.vixeq.value !== null && indicators.vix.value !== null && indicators.vix.value > 0
      ? indicators.vixeq.value / indicators.vix.value
      : null;

  elements.vixeq.textContent = formatNumber(indicators.vixeq.value);
  elements.vixeqSource.textContent = indicators.vixeq.source;
  elements.vix.textContent = formatNumber(indicators.vix.value);
  elements.vixSource.textContent = indicators.vix.source;
  elements.premium.textContent = premium === null ? "--" : `${premium.toFixed(2)}x`;
  elements.cor1m.textContent = formatNumber(indicators.cor1m.value);
  elements.cor1mSource.textContent = indicators.cor1m.source;
  elements.callPut.textContent = formatNumber(indicators.callPut.value);
  elements.callPutSource.textContent = indicators.callPut.source;
  elements.skew.textContent = indicators.leftTailSkew.value === null ? "--" : `${formatNumber(indicators.leftTailSkew.value, 0)}/100`;
  elements.skewSource.textContent = indicators.leftTailSkew.source;
  elements.hvl.textContent = formatNumber(indicators.hvl.value, 0);
}

function updateChecks(checks) {
  elements.checks.replaceChildren(
    ...checks.map((check) => {
      const row = document.createElement("div");
      row.className = `check ${check.active ? "active" : ""}`;

      const label = document.createElement("b");
      label.textContent = check.label;

      const detail = document.createElement("small");
      detail.textContent = check.detail;

      row.append(label, detail);
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
    setStatus("ok", "已連線", formatTime(data.timestamp));
  } catch (error) {
    setStatus("error", "連線失敗", error.message);
  }
}

loadSnapshot();
setInterval(loadSnapshot, POLL_MS);
