# 虎甲自然 2026 招生網站 Demo

LINE 嵌入式靜態招生網站。純 HTML/CSS/JS，無依賴、無 build step。
適合朋友透過編輯 `data/*.csv` 維護內容後重新部署。

## 快速啟動

任意靜態伺服器即可，例如：

```bash
# 方式 1：Python
python3 -m http.server 8000

# 方式 2：npx serve
npx serve .
```

打開 `http://localhost:8000/` 即可瀏覽。

## 頁面動線

```
LINE 圖文選單
  ├─ 品牌介紹 ─► index.html
  ├─ 課程資訊 ─► courses.html ─► register.html ─► success.html
  ├─ 立即報名 ─► register.html
  └─ 聯絡諮詢 ─► LINE 一對一

任何頁面 ─► info.html（FAQ / 退費 / 個資 / 聯絡 / PDF）
```

## 檔案結構

```
.
├── index.html          首頁：品牌介紹
├── courses.html        課程資訊與行事曆
├── register.html       5 步驟報名表
├── info.html           FAQ、退費、個資、聯絡、PDF
├── success.html        報名完成
├── 404.html            找不到頁面
├── error.html          通用錯誤頁（CSV 載入失敗）
├── assets/
│   ├── css/main.css
│   ├── js/             shared / csv / mock / index / courses / register / info
│   ├── img/            favicon
│   └── tiger-beetle-2026.pdf
└── data/               ★ 朋友只需要動這個目錄
    ├── classes.csv     8 個班級
    ├── course_dates.csv ~40 筆日期
    ├── faqs.csv        FAQ 條目
    └── config.csv      早鳥/說明會/LINE 連結等
```

## Demo 模式（測試錯誤狀態）

每頁右下角有齒輪按鈕，可一鍵切換以下狀態：

| URL 參數 | 演示內容 |
|---|---|
| `?simulate=fail` | 報名 API 模擬伺服器錯誤 |
| `?simulate=duplicate` | 模擬「您已報名過此班級」 |
| `?simulate=network` | 模擬網路斷線 + 草稿保存提示 |
| `?simulate=full` | 模擬班級剛好滿班 |
| `?simulate=csv` | 模擬 CSV 資料載入失敗（跳轉 error.html） |

也可直接訪問 `404.html` / `error.html?reason=csv` 看單獨畫面。

## 維護指南（給朋友）

只需編輯 `data/` 目錄下的 4 個 CSV：

- **修改班級**：`classes.csv`（含費用、人數、年齡、狀態 open/full/cancelled）
- **修改日期**：`course_dates.csv`（每堂課的日期、時段、備註）
- **修改 FAQ**：`faqs.csv`（順序、分類、問題、答案）
- **修改設定**：`config.csv`（早鳥截止日、LINE 連結、Email、PDF 路徑等）

改完後重新部署即可，**不需要動到任何 HTML/CSS/JS**。

## 範圍

這是 demo，**未接真實後端**：
- 表單送出走 mock，不會寫入 Google Sheet
- LINE 推播未實作
- 早鳥折扣計算僅前端執行（實作後需在 Apps Script 端二次驗證）

## 技術備註

- CSV 由瀏覽器 runtime fetch + 解析，不需要 build
- 設計系統 token 集中於 `assets/css/main.css` 開頭的 `:root`
- 字體：Noto Sans TC（Google Fonts，`font-display: swap`）
- 共用元件（header / footer / modal / banner）由 `assets/js/shared.js` 注入
