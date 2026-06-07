# 半导体杠杆踩踏监控表盘

这是一个把 Franktradinglog ID `2063321681683460265` 相关帖子中的交易框架做成可视化表盘的开源项目。

核心观点：

> 半导体下跌不一定先来自基本面突然崩坏，真正需要先看的，是期权市场里是否已经出现极端拥挤、相关性被压低、杠杆堆积和 Gamma 翻空风险。

## 当前版本

新版已经从“框架图解”升级为“表盘优先”：

- 第一屏直接显示结构状态、共振分数和关键指标。
- 核心指标包括 `VIXEQ`、`VIX`、`VIXEQ/VIX`、`COR1M`、`SPX`、`HVL`、`Call/Put`、`Left-tail Skew`、`Sentiment`。
- 信号灯从 4 个扩展为 6 个：`VIXEQ/VIX 溢价`、`COR1M 极低`、`Call heavy`、`左尾 Skew 升温`、`跌破 HVL`、`情绪过热`。
- 解释、数据来源、接入路线和计算方法都放在表盘后面，不挡住核心判断。
- GitHub Pages 上会读取 `manual_snapshot.json` 作为公开网页临时快照；本地运行时可以接 Massive、Tradier 或其他数据源。

## 在线查看

GitHub Pages 启用后，访问：

```text
https://amberqian.github.io/semiconductor-stress-dashboard/dashboard.html
```

如果只打开仓库首页，GitHub 默认展示的是这份 README。真正的表盘在 `dashboard.html`。

## 本地运行

推荐用这个脚本启动：

```bash
zsh start-dashboard.sh
```

然后打开：

```text
http://127.0.0.1:8000/dashboard.html
```

如果你的电脑有 Node.js，也可以运行：

```bash
npm start
```

## 配置 API Key

Massive API key 的小白配置方式：

```bash
zsh setup-key.sh
```

脚本会让你在本机粘贴 key，并自动生成 `.env`。不要把真实 key 发到聊天里，也不要提交到 GitHub。

`.env` 示例：

```bash
DATA_PROVIDER=massive
MASSIVE_API_KEY=你的_key
WATCHLIST=SMH,NVDA,AMD,MU,AVGO,INTC,QQQ,SPY
```

更多申请步骤见 [API_SETUP.zh-CN.md](API_SETUP.zh-CN.md)。

## 当前快照数据

`manual_snapshot.json` 是临时网页快照，用来让 GitHub Pages 和演示页面先完整显示表盘。它不是实时自动数据源。

当前快照包括：

- `VIXEQ`: S&P DJI 官方页面最新收盘。
- `VIX` / `SPX`: 公开网页收盘数据。
- `COR1M`: 公开网页显示值。
- `HVL`: 原帖/截图参考值，不是实时 Gamma 计算。
- `Call/Put`: SMH 期权链公开网页成交量代理。
- `Left-tail Skew`: SMH 近月期权 IV 代理。
- `Sentiment`: 情绪指标辅助值。

## 数据源说明

这套方法里的数据分成三类：

- 可以直接接股票/ETF 行情：SMH、NVDA、AMD、MU、AVGO、INTC、QQQ、SPY。
- 可以用期权链自己算：Call/Put、Left-tail Skew、近似 Gamma Flip。
- 需要授权指数源：VIXEQ、COR1M、VIX 的稳定实时版本。

VIXEQ 和 COR1M 属于 Cboe/S&P 相关指数，不是普通股票报价。要做生产级实时表盘，通常需要 Cboe Global Indices Feed、授权行情商，或能合法提供这些指数的供应商。

TradingView 可以嵌入图表，但不会把登录账号里的付费数据开放成后端 API，所以不能把 TradingView 当作本项目的数据源。

## 文件结构

```text
dashboard.html        表盘页面
dashboard.css         表盘样式
dashboard.js          表盘逻辑，本地 API 失败时会读取 manual_snapshot.json
dashboard_server.py   无 Node.js 时使用的 Python 本地服务
server.js             Node.js 本地服务
manual_snapshot.json  GitHub Pages 和演示用临时快照
setup-key.sh          Mac 小白配置 API key 脚本
start-dashboard.sh    Mac 小白启动脚本
API_SETUP.zh-CN.md    API 申请和配置教程
index.html            项目入口页
```

## 发布到 GitHub Pages

在仓库页面：

1. 打开 `Settings`。
2. 进入 `Pages`。
3. `Source` 选择 `Deploy from a branch`。
4. `Branch` 选择 `main`，目录选择 `/ (root)`。
5. 保存后等待 1 到 3 分钟。

线上表盘地址通常是：

```text
https://amberqian.github.io/semiconductor-stress-dashboard/dashboard.html
```

## 免责声明

本项目是教育性整理和数据可视化练习，不构成投资建议。页面中的信号灯和快照数据不是交易指令，也不能替代你自己的研究、风控和合规判断。

## License

MIT
