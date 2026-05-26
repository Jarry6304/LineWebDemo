# 虎甲自然網站

完全規格驅動的靜態網站。HTML 不寫文案、JS 不寫商業邏輯，所有內容都從一份試算表來。維護者只在 `data/site.xlsx`（建議上傳成 Google Sheets 線上協作）編輯，網站就跟著變動。

## 規格驅動的核心

| 想做的事 | 改哪裡 |
|---|---|
| 換首頁 hero 標題、新增 nav 連結文字、改聯絡按鈕字 | `config` 表，找對應 `key` 改 `value` |
| 新增／修改班級、退費階段、FAQ、品牌故事段落 | 對應資料表加列／改欄 |
| 新增整個系列 | `series` 表加一列 + `classes` 對應的 `series` 欄填同名，首頁/課程頁自動長出 |
| 改顏色、字體、間距 | `assets/css/main.css` 的 `:root` token |

**不需要動 HTML 或 JS。** HTML 內容是 fallback（試算表漏鍵時不會空白）；JS 只負責把資料渲染到頁面。

---

## 快速啟動（本地預覽）

```bash
python3 -m http.server 8000
# 打開 http://localhost:8000/
```

預設讀本地 `data/*.csv`。要切到 Google Sheets 線上協作，編輯 `assets/js/site-config.js` 的 `GOOGLE_SHEETS_ID`（步驟見下方）。

## 切換到 Google Sheets 線上協作版

### 一次性設定（約 5 分鐘）

1. **上傳模板到 Google Drive**：把 `data/site.xlsx` 拖到 Drive，右鍵「Open with → Google Sheets」
2. **設定分享**：右上 Share → 「Anyone with the link → Viewer」（不要可編輯，否則任何人都能改）
3. **複製試算表 ID**：從網址列 `https://docs.google.com/spreadsheets/d/【這段就是 ID】/edit`
4. **貼到網站**：在 GitHub 上編輯 `assets/js/site-config.js`，把 ID 填進 `GOOGLE_SHEETS_ID: ''` 的引號內 → Commit
5. **之後**：直接在 Google Sheets 編輯，**完全不用碰 GitHub**。約 5 分鐘內網站自動更新（Google CDN 快取）

切回本地 CSV：把 `GOOGLE_SHEETS_ID` 改回空字串再 push。

---

## 試算表結構（11 個 sheet）

| Sheet | 內容 | 程式讀取 |
|---|---|---|
| `說明` | 給維護者看的規範 | ❌ |
| `config` | 站台設定 + 全站文字（key/value/note，共 60 鍵） | ✅ |
| `classes` | 班級清單（一列一班） | ✅ |
| `course_dates` | 課程日期（一列一堂） | ✅ |
| `faqs` | 常見問題 | ✅ |
| `series` | 三大系列（首頁卡片 + 課程頁分區） | ✅ |
| `keywords` | 首頁四宮格 | ✅ |
| `about` | 首頁品牌故事段落 | ✅ |
| `refund` | 退費規定表 | ✅ |
| `privacy` | 個資聲明段落 | ✅ |
| `exp_hints` | 經驗代號對照 | ✅ |

**每張表第 1 列是欄位名**，程式依賴，不可改名、刪欄、插欄。把滑鼠移到欄位名上會看到該欄的說明 comment。

詳細欄位定義見 `dataspec.md`（或 `說明` sheet）。

---

## 文字注入慣例

HTML 標籤上：
- `data-cfg="鍵"` → 純文字注入，從 `config` 表對應 `value` 填入 `textContent`
- `data-cfg-ml="鍵"` → 多行注入，escape 後把 `\n` 變 `<br>` 填入 `innerHTML`

HTML 內保留原文字當 fallback，config 漏鍵時不會空白：

```html
<h1 data-cfg-ml="home_hero_title">城市與自然的<br>引路者</h1>
```

容器類則由各頁 JS 從資料表渲染（`<div data-about>`、`<div data-series-preview>`、`<div data-keywords>`、`<div data-series-anchors>`、`<div data-series-sections>`、`<div data-calendar>`、`<div data-faq-list>`、`<tbody data-refund-rows>`、`<div data-privacy-list>`）。

---

## 常見地雷

- **`class_id`、`series_id` 必須英數小寫**，中文會壞，不可重複
- **跨表關聯要一致**：
  - `classes.series` ↔ `series.name`
  - `course_dates.class_id` ↔ `classes.class_id`
  - `classes.experience_requirement` ↔ `exp_hints.code`
- **日期欄一定要純文字格式**：Google Sheets 預設會把 `2026-09-05` 自動辨識成日期，輸出時會變成 `9/5/2026`。預防方法：
  - 選取欄 → 格式 → 數字 → 純文字
  - 或在日期前面加一個半形單引號 `'2026-09-05`
- **多行文字**：在試算表用 `Alt+Enter`（Mac：`Option+Enter`）換行
- **不可刪欄、插欄**：要新增欄位請先聯絡開發者
- **新增 sheet 沒關係**：程式只讀指定的 10 個 sheet，其他會被忽略

---

## ⚠️ 資安守則

**核心原則**：網站試算表（與這個 repo）只放對外資訊；內部資料用「另一份完全分開的」試算表，**永遠不被網站讀取、永遠不放 ID 到 repo**。

### 為什麼？

GitHub Pages = 網站必須公開。不管 repo 是 public 或 private，部署出去的所有檔案（CSV、xlsx、PDF、JS）任何人都能直接抓。Google Sheets 一旦設「擁有連結者可檢視」、ID 又寫進網站，**整份試算表所有 sheet** 都會曝光（即使 csv.js 沒列那個 sheet 名，用 gviz URL 也能拿到）。

### 能放／不能放對照表

| 類型 | 放網站試算表 | 放另開的內部試算表 |
|---|---|---|
| 班級名稱、價格、地區、簡介 | ✅ | |
| 課程日期、行事曆 | ✅ | |
| FAQ、退費規定、個資聲明、品牌故事 | ✅ | |
| LINE OA URL、Email、PDF 連結 | ✅ | |
| 班級實際報名人數差距 | ❌（會被對手分析） | ✅ |
| 講師全名、講師費、私人事由 | ❌ | ✅ |
| 學員／家長個資（姓名、電話、身分證、緊急聯絡） | ❌ 絕不 | ✅（且最好用 Google Form 私人 sheet） |
| 信用卡、銀行帳號、轉帳記錄 | ❌ 絕不 | ❌（用第三方金流，如綠界） |
| 內部成本、毛利、營收 | ❌ 絕不 | ✅ |
| API token、密碼、Channel Token | ❌ 絕不 | ❌（用 OS keychain 或 password manager） |

### 雙軌制架構

```
┌────────────────────────────────────────────────────┐
│  公開區（網站讀取）                                  │
│   • GitHub repo: Jarry6304/LineWebDemo            │
│   • Pages:       jarry6304.github.io/LineWebDemo/ │
│   • Google Sheets「網站用試算表」                  │
│       分享 = 擁有連結者可檢視                       │
│       ID 寫在 assets/js/site-config.js            │
└────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│  內部區（網站絕不讀取）                              │
│   • Google Drive 私人資料夾                       │
│       ├── 學員名冊.xlsx                           │
│       ├── 講師排程.xlsx                           │
│       ├── 內部成本.xlsx                           │
│       └── 報名表單回收（Google Form → 私人 sheet） │
│       分享 = 「指定 email 邀請」（絕非「擁有連結者」）│
│       ID 永遠不放進 repo / site-config.js          │
└────────────────────────────────────────────────────┘
```

### 新增資料前的 3 題自我檢查

1. 「這資料如果今天被截圖貼到 Facebook 社團，我會困擾嗎？」
   - 會 → 不要放網站試算表
2. 「這資料涉及第三方（學員、家長、講師、合作場地）嗎？」
   - 涉及 → 不要放網站試算表
3. 「這資料更新後必須讓全網看到嗎？」
   - 不必 → 不需要放網站試算表

### 補強防線（已內建）

- `.gitignore` 已主動擋掉 `data/internal-*`、`data/private-*`、`data/staff-*`、`*.private.*`、`INTERNAL.md`、`.env` 等檔名 pattern。即使誤拖到 repo 資料夾，`git add` / `git status` 也看不到。
- `assets/js/site-config.js` 檔頭詳細說明 ID 暴露風險，**修改前請先讀**。

### 未來要做會員區、線上報名、收款怎麼辦？

**GitHub Pages 完全不夠用**，需要：
- 收個資 → Google Form 寫入私人 Sheet（**絕不嵌進網站讀取**）
- 線上付款 → 第三方金流（綠界、藍新、Stripe），**絕對不要自己收信用卡**
- 會員登入 → 後端服務（Cloudflare Workers / Vercel + serverless / 自架）

短期可以繼續用 LINE 一對一處理（敏感互動丟給 LINE 平台，網站只導流）。

---

## 重新生成 XLSX 模板

XLSX 是一次性模板，平常不用動。但如果欄位規範有更動，想產生新版本給其他維護者：

```bash
pip install openpyxl
python3 scripts/build_site_xlsx.py
# 產生 data/site.xlsx（含 11 個 sheet、表頭樣式、欄位說明 comment、資安守則段）
```

---

## 檔案結構

```
.
├── index.html               首頁
├── courses.html             課程介紹
├── info.html                相關問題、聯絡、檔案下載
├── 404.html / error.html    例外頁
├── assets/
│   ├── css/main.css         設計系統 token 集中在 :root
│   ├── js/
│   │   ├── site-config.js   ★ Google Sheets ID 設定點
│   │   ├── csv.js           載入 10 個 sheet
│   │   ├── shared.js        header / footer / Modal / applyText
│   │   ├── home.js          首頁：about / series-preview / keywords
│   │   ├── courses.js       課程頁：series 分區 / 班級卡 / Modal / 行事曆
│   │   └── info.js          相關問題頁：FAQ / 退費 / 個資 / 聯絡
│   ├── img/                 favicon、logo-mark
│   └── tiger-beetle-2026.pdf
├── data/
│   ├── site.xlsx            ★ 上傳到 Google Sheets 的模板（11 sheet）
│   └── *.csv                本地 fallback（10 張）
├── scripts/
│   └── build_site_xlsx.py   從 CSV 重新生成 site.xlsx
├── dataspec.md              資料規格（簡要版）
└── .github/workflows/
    └── deploy.yml           推到 main 自動部署到 GitHub Pages
```

---

## 設計系統摘要

| 色相 | Token | 用途 |
|---|---|---|
| 森林綠（主） | `--c-primary` / `--c-primary-dark` / `--c-primary-light` / `--c-accent` | Hero 標題、CTA、accent 徽章 |
| 大地棕（副） | `--c-earth` / `--c-earth-dark` / `--c-earth-light` / `--c-cream` | 區域標籤、FAQ 分類、卡片頂緣 |
| 泥土深棕（footer） | `--c-soil` (#3D2E1F) | Footer 背景，視覺上代表地面 |

**Footer 互補配色**：深土棕背景 + 暖米文字 + 嫩葉綠連結（split-complementary，對應「土壤孕育植物」意象）。

**字體**：Noto Sans TC（Google Fonts，`font-display: swap`）。

---

## 部署

每次 push 到 `main` → GitHub Actions 自動部署到 GitHub Pages（1–2 分鐘）。

```
https://jarry6304.github.io/LineWebDemo/
```
