# 实时数据 API 申请与配置指南

这个表盘分成两类数据：

- 普通市场数据：`SMH`、`NVDA`、`AMD`、`MU`、`AVGO`、`INTC`、`QQQ`、`SPY` 的报价。
- 结构性期权/指数数据：`VIXEQ`、`COR1M`、`Call/Put`、左尾 `Skew`、`HVL`。

TradingView 可以嵌入图表，但它不是给本项目读取数据和计算指标的 API。要做真正可计算的实时表盘，需要市场数据 API。

## 推荐顺序

### 1. Tradier

适合先做这套表盘，因为它覆盖：

- 股票/ETF 实时报价
- 期权链
- 期权价格
- 期权 Greeks
- Paper/live token

申请步骤：

1. 打开 <https://developer.tradier.com/>
2. 登录或注册 Tradier 账号。
3. 进入账号里的 API 设置页。
4. 找到 token：
   - `Sandbox token`：测试/纸面账户，通常带延迟数据。
   - `Production token`：真实账户与实时市场数据。
5. 复制 token。

配置到项目：

```bash
cp .env.example .env
```

编辑 `.env`：

```bash
DATA_PROVIDER=tradier
TRADIER_TOKEN=你的_tradier_token
TRADIER_BASE_URL=https://api.tradier.com
WATCHLIST=SMH,NVDA,AMD,MU,AVGO,INTC,QQQ,SPY
HVL_VALUE=7495
```

启动：

```bash
node server.js
```

打开：

```text
http://127.0.0.1:8000/dashboard.html
```

注意：如果你只拿到 sandbox token，能跑通接口，但行情可能不是实时。要看生产实时数据，需要 production token 和对应市场数据权限。

### 2. Massive / Polygon

适合先接股票/ETF 快照。若要期权链、Greeks 或实时期权，需要确认你订阅的 Polygon 套餐包含这些权限。

Polygon.io 已改名为 Massive。旧的 `api.polygon.io` 仍可用一段时间，新的平台入口会显示为 Massive。

申请步骤：

1. 打开 <https://massive.com/>
2. 注册并登录。
3. 进入 Dashboard / API Keys。
4. 复制 API key。
5. 检查套餐是否覆盖：
   - Stocks
   - Options
   - Real-time 或 delayed data

配置到项目：

```bash
cp .env.example .env
```

编辑 `.env`：

```bash
DATA_PROVIDER=massive
MASSIVE_API_KEY=你的_massive_api_key
WATCHLIST=SMH,NVDA,AMD,MU,AVGO,INTC,QQQ,SPY
HVL_VALUE=7495
```

启动：

```bash
node server.js
```

### 3. Cboe Global Indices Feed

这是 `VIXEQ`、`COR1M`、`VIX` 等 Cboe 指数的更正统来源。它不是普通散户式 API key 流程，更像数据授权。

申请路径：

1. 打开 <https://www.cboe.com/us/indices/accessing-index-data/>
2. 选择：
   - Direct Feed
   - Cloud
   - Data Vendors
3. 如果只是个人项目，优先看 `Data Vendors`，因为直接接 Cboe Feed 通常更重。
4. 如果要直接申请，下载/填写 Cboe 的 Index Data License Request Form。

接入前的临时配置：

```bash
VIXEQ_VALUE=41.8
VIX_VALUE=18.6
COR1M_VALUE=6.33
HVL_VALUE=7495
```

这些值会作为手动覆盖进入表盘。等拿到正式数据源后，再把 `server.js` 里的结构性指标读取逻辑接到真实 feed。

## 当前表盘已经支持什么

已支持：

- `mock` 模式：不用 token，先看界面和判断逻辑。
- `tradier` 模式：读取 watchlist 报价。
- `polygon` / `massive` 模式：读取 watchlist 股票快照。
- 手动覆盖：`VIXEQ_VALUE`、`VIX_VALUE`、`COR1M_VALUE`、`HVL_VALUE`。

待接入：

- 真实 `Call/Put Ratio`：需要拉期权链后聚合 call/put 成交量或未平仓量。
- 真实左尾 `Skew`：需要期权 IV/Greeks，按 put/call 或不同 delta 的 IV 差计算。
- 自动 `HVL`：需要 Periscope / SpotGamma / 自建 Gamma Exposure 模型。
- 真实 `VIXEQ` / `COR1M`：需要 Cboe 或授权供应商数据。

## 安全规则

- 不要把真实 token 写进 `dashboard.js` 或 `dashboard.html`。
- 只把 token 放进 `.env`。
- `.env` 已经在 `.gitignore` 中，不会被提交。
- 如果未来推到 GitHub，确认仓库里只有 `.env.example`，没有 `.env`。

## 我建议你先申请哪个

先申请 `Tradier`。原因很朴素：这套框架的核心是期权结构，后面要算 `Call/Put` 和 `Skew`，Tradier 的路径更顺。

拿到 token 后，把 `.env` 贴成这个格式，token 可以只告诉我“已填好”，不用发给我：

```bash
DATA_PROVIDER=tradier
TRADIER_TOKEN=已填
TRADIER_BASE_URL=https://api.tradier.com
WATCHLIST=SMH,NVDA,AMD,MU,AVGO,INTC,QQQ,SPY
HVL_VALUE=7495
```

然后我可以继续帮你把真实 `Call/Put Ratio` 和左尾 `Skew` 计算接进去。
