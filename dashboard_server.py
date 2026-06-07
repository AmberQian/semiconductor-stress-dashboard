#!/usr/bin/env python3
import json
import math
import os
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


def load_env():
    if not os.path.exists(".env"):
        return
    with open(".env", "r", encoding="utf-8") as env_file:
        for raw in env_file:
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            os.environ.setdefault(key, value)


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def number_or_none(value):
    if value is None or value == "":
        return None
    try:
        return float(value)
    except ValueError:
        return None


def load_manual_snapshot():
    if not os.path.exists("manual_snapshot.json"):
        return None
    with open("manual_snapshot.json", "r", encoding="utf-8") as snapshot_file:
        return json.load(snapshot_file)


def manual_quotes():
    manual = load_manual_snapshot()
    rows = []
    for item in (manual or {}).get("quotes") or []:
        rows.append(
            {
                "symbol": item.get("symbol"),
                "price": number_or_none(item.get("price")),
                "changePercent": number_or_none(item.get("changePercent")),
                "updatedAt": manual.get("capturedAt") or now_iso(),
                "source": item.get("source") or "临时网页快照",
            }
        )
    return [row for row in rows if row["symbol"]]


def watchlist():
    raw = os.environ.get("WATCHLIST", "SMH,NVDA,AMD,MU,AVGO,INTC,QQQ,SPY")
    return [symbol.strip().upper() for symbol in raw.split(",") if symbol.strip()]


def mock_quotes(symbols):
    base = {
        "SMH": 318.42,
        "NVDA": 182.31,
        "AMD": 247.88,
        "MU": 256.40,
        "AVGO": 397.20,
        "INTC": 42.14,
        "QQQ": 632.18,
        "SPY": 687.51,
    }
    rows = []
    for index, symbol in enumerate(symbols):
        seed = sum(ord(char) for char in symbol)
        wave = math.sin(time.time() / 45 + seed) * 0.9
        price = base.get(symbol, 100 + index * 13) * (1 + wave / 100)
        rows.append(
            {
                "symbol": symbol,
                "price": round(price, 2),
                "changePercent": round(wave + (-1.1 if index % 3 == 0 else 0.6), 2),
                "updatedAt": now_iso(),
            }
        )
    return rows


def massive_quotes(symbols):
    api_key = os.environ.get("MASSIVE_API_KEY") or os.environ.get("POLYGON_API_KEY")
    if not api_key:
        raise RuntimeError("MASSIVE_API_KEY is missing")

    rows = []
    for symbol in symbols:
        encoded_symbol = urllib.parse.quote(symbol)
        encoded_key = urllib.parse.quote(api_key)
        url = f"https://api.massive.com/v2/snapshot/locale/us/markets/stocks/tickers/{encoded_symbol}?apiKey={encoded_key}"
        try:
            with urllib.request.urlopen(url, timeout=12) as response:
                data = json.loads(response.read().decode("utf-8"))
        except Exception as error:
            raise RuntimeError(f"Massive quote request failed for {symbol}: {error}") from error
        ticker = data.get("ticker") or {}
        day = ticker.get("day") or {}
        previous = ticker.get("prevDay") or {}
        last_trade = ticker.get("lastTrade") or {}
        price = number_or_none(last_trade.get("p")) or number_or_none(day.get("c"))
        prior_close = number_or_none(previous.get("c"))
        change_percent = None
        if price is not None and prior_close:
            change_percent = round(((price - prior_close) / prior_close) * 100, 2)
        rows.append(
            {
                "symbol": symbol,
                "price": price,
                "changePercent": change_percent,
                "updatedAt": now_iso(),
            }
        )
    return rows


def massive_previous_close_quotes(symbols):
    api_key = os.environ.get("MASSIVE_API_KEY") or os.environ.get("POLYGON_API_KEY")
    if not api_key:
        raise RuntimeError("MASSIVE_API_KEY is missing")

    rows = []
    for symbol in symbols:
        encoded_symbol = urllib.parse.quote(symbol)
        encoded_key = urllib.parse.quote(api_key)
        url = f"https://api.massive.com/v2/aggs/ticker/{encoded_symbol}/prev?adjusted=true&apiKey={encoded_key}"
        try:
            with urllib.request.urlopen(url, timeout=12) as response:
                data = json.loads(response.read().decode("utf-8"))
        except Exception as error:
            raise RuntimeError(f"Massive previous-close request failed for {symbol}: {error}") from error

        result = (data.get("results") or [{}])[0]
        close = number_or_none(result.get("c"))
        open_price = number_or_none(result.get("o"))
        change_percent = None
        if close is not None and open_price:
            change_percent = round(((close - open_price) / open_price) * 100, 2)
        rows.append(
            {
                "symbol": symbol,
                "price": close,
                "changePercent": change_percent,
                "updatedAt": now_iso(),
            }
        )
    return rows


def structure_snapshot():
    provider = os.environ.get("DATA_PROVIDER", "mock").lower()
    mock = provider == "mock"
    structure = {
        "timestamp": now_iso(),
        "provider": provider,
        "indicators": {
            "vixeq": {
                "label": "VIXEQ",
                "value": number_or_none(os.environ.get("VIXEQ_VALUE")) or (41.8 if mock else None),
                "source": "manual" if os.environ.get("VIXEQ_VALUE") else ("mock" if mock else "needs licensed Cboe/source feed"),
            },
            "vix": {
                "label": "VIX",
                "value": number_or_none(os.environ.get("VIX_VALUE")) or (18.6 if mock else None),
                "source": "manual" if os.environ.get("VIX_VALUE") else ("mock" if mock else "provider/index feed"),
            },
            "cor1m": {
                "label": "COR1M",
                "value": number_or_none(os.environ.get("COR1M_VALUE")) or (6.33 if mock else None),
                "source": "manual" if os.environ.get("COR1M_VALUE") else ("mock" if mock else "needs licensed Cboe/source feed"),
            },
            "hvl": {
                "label": "HVL",
                "value": number_or_none(os.environ.get("HVL_VALUE")) or 7495,
                "source": "manual" if os.environ.get("HVL_VALUE") else "post reference",
            },
            "spx": {
                "label": "SPX",
                "value": number_or_none(os.environ.get("SPX_VALUE")),
                "source": "manual" if os.environ.get("SPX_VALUE") else "needs index feed",
            },
            "callPut": {
                "label": "Call/Put",
                "value": 2.7 if mock else None,
                "source": "mock" if mock else "requires options chain aggregation",
            },
            "leftTailSkew": {
                "label": "Left-tail Skew",
                "value": 72 if mock else None,
                "source": "mock score 0-100" if mock else "requires options IV/skew feed",
            },
            "sentiment": {
                "label": "Sentiment",
                "value": number_or_none(os.environ.get("SENTIMENT_VALUE")) or (78 if mock else None),
                "source": "manual" if os.environ.get("SENTIMENT_VALUE") else ("mock score 0-100" if mock else "requires sentiment feed"),
            },
        },
    }
    manual = load_manual_snapshot()
    if manual:
        structure["provider"] = "临时网页快照"
        structure["timestamp"] = manual.get("capturedAt") or structure["timestamp"]
        for key, item in (manual.get("indicators") or {}).items():
            if key in structure["indicators"]:
                structure["indicators"][key]["value"] = number_or_none(item.get("value"))
                structure["indicators"][key]["source"] = item.get("source") or "临时网页快照"
    return structure


def evaluate(snapshot):
    indicators = snapshot["indicators"]
    vixeq = indicators["vixeq"]["value"]
    vix = indicators["vix"]["value"]
    cor1m = indicators["cor1m"]["value"]
    hvl = indicators["hvl"]["value"]
    spx = indicators["spx"]["value"]
    call_put = indicators["callPut"]["value"]
    skew = indicators["leftTailSkew"]["value"]
    sentiment = indicators["sentiment"]["value"]
    checks = [
        {
            "id": "vixeqPremium",
            "label": "VIXEQ/VIX 溢价",
            "active": vixeq is not None and vix is not None and vix > 0 and vixeq / vix >= 1.6,
            "detail": f"{vixeq / vix:.2f}x" if vixeq is not None and vix else "等待数据",
        },
        {
            "id": "lowCorrelation",
            "label": "COR1M 极低",
            "active": cor1m is not None and cor1m <= 15,
            "detail": "等待数据" if cor1m is None else str(cor1m),
        },
        {
            "id": "callHeavy",
            "label": "Call heavy",
            "active": call_put is not None and call_put >= 2,
            "detail": "等待期权链" if call_put is None else f"{call_put:.2f}x",
        },
        {
            "id": "skewRising",
            "label": "左尾 Skew 升温",
            "active": skew is not None and skew >= 8,
            "detail": "等待 IV/Skew" if skew is None else f"{skew:.2f} IV点",
        },
        {
            "id": "hvlBreak",
            "label": "跌破 HVL",
            "active": spx is not None and hvl is not None and spx < hvl,
            "detail": "等待 SPX/HVL" if spx is None or hvl is None else f"{spx:.2f} / {hvl:.0f}",
        },
        {
            "id": "sentimentHot",
            "label": "情绪过热",
            "active": sentiment is not None and sentiment >= 70,
            "detail": "等待情绪数据" if sentiment is None else f"{sentiment:.0f}/100",
        },
    ]
    score = sum(1 for check in checks if check["active"])
    state = "fragile" if score >= 4 else "watch" if score >= 2 else "normal"
    return {"state": state, "score": score, "checks": checks}


class DashboardHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.startswith("/api/health"):
            self.write_json({"ok": True, "provider": os.environ.get("DATA_PROVIDER", "mock"), "watchlist": watchlist()})
            return
        if self.path.startswith("/api/snapshot"):
            try:
                provider = os.environ.get("DATA_PROVIDER", "mock").lower()
                symbols = watchlist()
                data_error = None
                manual_rows = manual_quotes()
                if manual_rows:
                    quotes = manual_rows
                else:
                    try:
                        quotes = massive_quotes(symbols) if provider == "massive" else mock_quotes(symbols)
                    except Exception as error:
                        if provider == "massive":
                            try:
                                quotes = massive_previous_close_quotes(symbols)
                                data_error = "Snapshot endpoint unavailable for this key; showing previous close data."
                            except Exception as fallback_error:
                                data_error = f"{error}; fallback failed: {fallback_error}"
                                quotes = mock_quotes(symbols)
                        else:
                            data_error = str(error)
                            quotes = mock_quotes(symbols)
                structure = structure_snapshot()
                self.write_json(
                    {
                        "timestamp": now_iso(),
                        "structure": structure,
                        "quotes": quotes,
                        "evaluation": evaluate(structure),
                        "dataError": data_error,
                    }
                )
            except Exception as error:
                self.write_json({"error": str(error), "provider": os.environ.get("DATA_PROVIDER", "mock")}, status=500)
            return
        super().do_GET()

    def write_json(self, payload, status=200):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("content-type", "application/json; charset=utf-8")
        self.send_header("cache-control", "no-store")
        self.send_header("content-length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    load_env()
    port = int(os.environ.get("PORT", "8000"))
    server = ThreadingHTTPServer(("127.0.0.1", port), DashboardHandler)
    print(f"Dashboard running at http://127.0.0.1:{port}/dashboard.html")
    server.serve_forever()
