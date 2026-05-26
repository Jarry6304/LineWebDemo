# 虎甲自然網站

LINE 嵌入式靜態介紹網站。純 HTML/CSS/JS，無依賴、無 build step。
適合維護者透過編輯 `data/*.csv` 維護內容後重新部署。

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
  ├─ 企業概述 ─► index.html
  ├─ 課程介紹 ─► courses.html
  ├─ 聯絡我們 ─► info.html#contact（或直接 LINE 一對一）
  └─ 檔案下載 ─► info.html#download
```

## 檔案結構

```
.
├── index.html          首頁：企業概述（品牌介紹）
├── courses.html        課程介紹與行事曆
├── info.html           相關問題（FAQ / 退費 / 個資）+ 聯絡 + 檔案下載
├── 404.html            找不到頁面
├── error.html          通用錯誤頁（CSV 載入失敗）
├── assets/
│   ├── css/main.css
│   ├── js/             shared / csv / courses / info
│   ├── img/            favicon
│   └── tiger-beetle-2026.pdf
└── data/               ★ 維護者只需要動這個目錄
    ├── classes.csv     班級資料
    ├── course_dates.csv 課程日期
    ├── faqs.csv        FAQ 條目
    └── config.csv      LINE 連結、Email、PDF 路徑等
```

## 維護指南

只需編輯 `data/` 目錄下的 4 個 CSV：

- **修改班級**：`classes.csv`（含費用、年齡、區域等）
- **修改日期**：`course_dates.csv`（每堂課的日期、時段、備註）
- **修改 FAQ**：`faqs.csv`（順序、分類、問題、答案）
- **修改設定**：`config.csv`（LINE 連結、Email、PDF 路徑）

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

### 維護流程（瀏覽器內完成）

維護者只需要在 GitHub 網頁上編輯 `data/*.csv` → commit → 自動部署：

1. 在 GitHub repo 找到要改的 CSV（例：`data/classes.csv`）
2. 點右上鉛筆 icon 編輯
3. 改完底下寫 commit message → **Commit changes**
4. 等 1–2 分鐘，網站自動更新

完全不需要 git 或命令列。

### 手動觸發部署

在 repo Actions tab → "Deploy to GitHub Pages" → **Run workflow** 可立即重 deploy。

## 技術備註

- CSV 由瀏覽器 runtime fetch + 解析，不需要 build
- 設計系統 token 集中於 `assets/css/main.css` 開頭的 `:root`
- 字體：Noto Sans TC（Google Fonts，`font-display: swap`）
- 共用元件（header / footer / modal）由 `assets/js/shared.js` 注入
