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

每頁右下角有齒輪按鈕，可一鍵切換以下情境。提交相關情境（fail / duplicate / network / full）會自動導向 `register.html`，並在頁面載入時即時顯示對應錯誤畫面，不需要把表單填完才看得到。

| URL 參數 | 演示內容 | 觸發位置 |
|---|---|---|
| `?simulate=fail` | 報名 API 模擬伺服器錯誤（紅色面板） | 自動導 register.html |
| `?simulate=duplicate` | 模擬「您已報名過此班級」（黃色面板） | 自動導 register.html |
| `?simulate=network` | 模擬網路斷線 + 草稿已保存提示 | 自動導 register.html |
| `?simulate=full` | 模擬班級剛好額滿（警告面板） | 自動導 register.html |
| `?simulate=csv` | 模擬 CSV 資料載入失敗 | 跳轉 error.html |

也可直接訪問 `404.html` / `error.html?reason=csv` 看單獨畫面。

## 維護指南（給朋友）

只需編輯 `data/` 目錄下的 4 個 CSV：

- **修改班級**：`classes.csv`（含費用、人數、年齡、狀態 open/full/cancelled）
- **修改日期**：`course_dates.csv`（每堂課的日期、時段、備註）
- **修改 FAQ**：`faqs.csv`（順序、分類、問題、答案）
- **修改設定**：`config.csv`（早鳥截止日、LINE 連結、Email、PDF 路徑等）

改完後重新部署即可，**不需要動到任何 HTML/CSS/JS**。

## 部署（GitHub Pages 自動部署）

本專案使用 GitHub Actions 部署到 GitHub Pages。每次 push 到 `main` 分支即自動上線。

Workflow 已設定 `enablement: true`，第一次跑時會自動啟用 Pages，不需要去 Settings 手動開（前提：repo 是 public）。

```
push to main
  ↓
.github/workflows/deploy.yml 觸發
  ↓
1–2 分鐘後網站更新
  ↓
https://jarry6304.github.io/LineWebDemo/
```

### 朋友維護流程（瀏覽器內完成）

朋友只需要在 GitHub 網頁上編輯 `data/*.csv` → commit → 自動部署：

1. 在 GitHub repo 找到要改的 CSV（例：`data/classes.csv`）
2. 點右上鉛筆 icon 編輯
3. 改完底下寫 commit message → **Commit changes**
4. 等 1–2 分鐘，網站自動更新

完全不需要 git 或命令列。

### 手動觸發部署

在 repo Actions tab → "Deploy to GitHub Pages" → **Run workflow** 可立即重 deploy。

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
- 表單草稿暫存於 `localStorage`（key: `tb_draft_v1`），7 天後失效

## 後續討論議題

- **CSV 上傳機制**：目前是 GitHub 網頁編輯 → commit → 自動 deploy。如果朋友嫌 GitHub 介面不友善，可考慮 Google Sheet 即時源、表單式 admin 工具、或 Issue 留言觸發 Actions 等替代方案。
