# 半導體槓桿踩踏框架圖解

這是一個把 Franktradinglog ID `2063321681683460265` 及其上一帖中提到的交易方法論視覺化的開源小項目。

核心命題：

> 半導體下跌的主因不是基本面突然崩壞，而是期權市場中極端擁擠與槓桿堆積造成的結構性踩踏。

## 內容

- `VIXEQ`：觀察單股期權隱含波動率是否相對指數波動率過度昂貴。
- `COR1M`：觀察隱含相關性是否被壓到極低，從而形成「看似分散、實際同向」的脆弱結構。
- `Call/Put Ratio`：確認看漲投機是否擁擠，並觀察大跌後槓桿是否出清。
- `Sentiment Indicators`：輔助判斷市場是否進入共識交易。
- `Individual Stock Skew`：捕捉單股左尾風險是否快速升溫。
- `HVL 7495`：作為 Gamma 翻轉與加倉執行的關鍵位置。

## 方法論摘要

1. 核心結構：`高 VIXEQ + 極低 COR1M`。
2. 輔助確認：`Call/Put 偏高 + 情緒過熱 + 左尾 Skew 急升`。
3. 觸發器：財報、宏觀數據、負面評論、融資消息等只是點火因素。
4. 執行：先用小倉位建立 `SMH put spread`，等跌破 `HVL 7495`、Gamma 結構翻負後再加倉。

## 使用方式

直接打開 `index.html` 即可查看：

```bash
open index.html
```

或使用任意靜態服務器：

```bash
python3 -m http.server 8000
```

然後訪問 `http://localhost:8000`。

## 發布到 GitHub Pages

創建一個新的 GitHub 倉庫後，在本地執行：

```bash
git remote add origin https://github.com/<your-user>/<your-repo>.git
git push -u origin main
```

如果要啟用 GitHub Pages：

1. 打開倉庫的 `Settings`。
2. 進入 `Pages`。
3. Source 選擇 `Deploy from a branch`。
4. Branch 選擇 `main`，目錄選擇 `/root`。

## 免責聲明

本項目是教育性圖解整理，不構成投資建議。頁面中的圖形為框架示意，不是實時行情，也不是可直接交易的信號。

## License

MIT
