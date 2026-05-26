# 虎甲自然網站

LINE 嵌入式靜態網站。資料來源支援兩種模式：

- **線上協作版（推薦正式環境）**：所有內容放在 Google Sheets，維護者只在試算表上編輯，網站約 5 分鐘自動更新
- **本地 CSV 版（開發/離線備援）**：讀取 `data/*.csv`

兩種模式同一份程式碼，靠 `assets/js/site-config.js` 一行設定切換。

---

## 快速啟動（本地預覽）

```bash
python3 -m http.server 8000
# 打開 http://localhost:8000/
```

只要 `site-config.js` 的 `GOOGLE_SHEETS_ID` 留空，就會讀本地 `data/*.csv`。

## 切換到 Google Sheets 線上協作版

### 一次性設定（約 5 分鐘）

1. **上傳模板到 Google Drive**
   - 把 `data/site.xlsx` 下載到電腦
   - 拖到 Google Drive，右鍵「Open with → Google Sheets」
   - Google 會自動轉成 Google Sheets 格式

2. **設定試算表分享**
   - 右上「Share」→ 改為「Anyone with the link → Viewer」
   - （注意：不要設成可編輯，否則任何人都能改）

3. **複製試算表 ID**
   - 從網址列：`https://docs.google.com/spreadsheets/d/【這段就是 ID】/edit`
   - ID 是一串約 40 個字元的英數混合字串

4. **貼到網站設定**
   - 在 GitHub 上編輯 `assets/js/site-config.js`
   - 把 ID 填進 `GOOGLE_SHEETS_ID: ''` 的引號內 → Commit
   - 1–2 分鐘後 GitHub Pages 重 deploy，網站開始抓 Google Sheets

5. **之後的維護**
   - 直接在 Google Sheets 編輯，**完全不用碰 GitHub**
   - 約 5 分鐘內網站自動更新（Google CDN 快取）
   - 想立刻看到改動？網址加 `?nocache=1` 強制刷新

### 想暫時切回本地 CSV

把 `GOOGLE_SHEETS_ID` 改回空字串 → push。1–2 分鐘後網站改讀 `data/*.csv`。

---

## 試算表的 5 個 sheet

| Sheet | 內容 | 列數 |
|---|---|---|
| `說明` | 給維護者看的使用規範（網站不會讀） | — |
| `config` | 站台設定（LINE 連結、Email、PDF 路徑） | 一列一設定 |
| `classes` | 班級資料 | 一列一班 |
| `course_dates` | 課程日期 | 一列一堂 |
| `faqs` | 常見問題 | 一列一題 |

每張表的第 1 列是欄位名稱（**程式依賴，請勿刪除或改名**）。把滑鼠移到欄位名上會看到該欄的說明 comment。

### `config`（站台設定）

| key | value | note |
|---|---|---|
| `line_oa_url` | LINE 加入連結 | 例：`https://lin.ee/TPOEska` |
| `line_oa_id` | LINE 官方帳號 ID | 例：`@821lvzed` |
| `contact_email` | 聯絡信箱 | |
| `pdf_url` | 簡章下載路徑 | |

新增設定鍵時：JS 要對應修改才會被使用，不要單方面加。

### `classes`（班級）

| 欄位 | 必填 | 範例 / 規則 |
|---|---|---|
| `class_id` | ✓ | 英數小寫，例：`shanshi`、`fengxiang_maple`。**不可重複、不可中文** |
| `name` | ✓ | 班級名稱，例：`山柿班` |
| `series` | ✓ | `山野成長` / `自然探索` / `原野觀察` |
| `level` | ✓ | `初階` / `中階` / `進階` / `挑戰` / `親子` / `探究` |
| `region` | ✓ | `台北` / `台中` / `宜蘭` ... |
| `price` | ✓ | 純數字，例：`8000` |
| `age_range` | ✓ | 例：`小一~小三` |
| `experience_requirement` | ✓ | `無` / `低頻率` / `中頻率` / `一定程度` |
| `duration_hours` | ✓ | 純數字，每堂時數 |
| `transport_note` | ✓ | 例：`大眾交通為主` |
| `activity_areas` | ✓ | 用、頓號或逗號分隔 |
| `description` | ✓ | 課程簡介（顯示在卡片上） |
| `display_order` | ✓ | 小到大排序（整數） |

### `course_dates`（日期）

| 欄位 | 必填 | 範例 / 規則 |
|---|---|---|
| `class_id` | ✓ | 必須與 `classes` 表的 `class_id` 完全一致 |
| `session_no` | ✓ | 第幾堂（整數） |
| `date` | ✓ | **`YYYY-MM-DD` 純文字格式**（見下方地雷） |
| `weekday` | ✓ | 單字：`一` / `二` / `六` / `日` |
| `time_period` | ✓ | `full_day` / `morning` / `afternoon` |
| `notes` |  | 可空，例：`含接駁包車` |

### `faqs`（常見問題）

| 欄位 | 必填 | 範例 / 規則 |
|---|---|---|
| `order` | ✓ | 顯示順序（小到大，整數） |
| `category` | ✓ | `退費` / `報名` / `安全` ... |
| `question` | ✓ | 問題 |
| `answer` | ✓ | 答案。**換行請按 `Alt+Enter`（Mac：`Option+Enter`）** |

---

## 常見地雷

- **`class_id` 必須英數小寫**：中文會壞，不可重複
- **日期欄一定要純文字格式**：Google Sheets 預設會把 `2026-09-05` 自動辨識成日期，輸出時會變成 `9/5/2026`。預防方法：
  - 選取 D 欄 → 格式 → 數字 → 純文字
  - 或在日期前面加一個半形單引號 `'2026-09-05`（單引號不會顯示）
- **第 1 列不可動**：欄位名稱是程式依賴的識別字串，改名或刪除會壞掉
- **不可刪欄、插欄**：要新增欄位請先聯絡開發者
- **新增 sheet 沒關係**：程式只讀指定的 4 個 sheet，其他 sheet 會被忽略
- **真要改 LINE 連結之類的 config**：到 `config` sheet 改 `value` 欄，**不要動 `key` 欄**

---

## 重新生成 XLSX 模板

XLSX 是一次性模板，平常不用動。但如果欄位規範有更動、想產生新版本給其他維護者：

```bash
pip install openpyxl
python3 scripts/build_site_xlsx.py
# 產生 data/site.xlsx
```

---

## 檔案結構

```
.
├── index.html               首頁：企業概述
├── courses.html             課程介紹與行事曆
├── info.html                相關問題、聯絡、檔案下載
├── 404.html / error.html    例外頁
├── assets/
│   ├── css/main.css
│   ├── js/
│   │   ├── site-config.js   ★ Google Sheets ID 設定點
│   │   ├── csv.js           資料載入（本地 CSV 或 Google Sheets）
│   │   ├── shared.js        Header / Footer / Modal
│   │   ├── courses.js       課程頁邏輯
│   │   └── info.js          相關問題頁邏輯
│   ├── img/                 logo-mark（header）/ logo-text（保留備用）/ favicon
│   └── tiger-beetle-2026.pdf
├── data/
│   ├── site.xlsx            ★ 上傳到 Google Sheets 的模板
│   ├── config.csv           本地備援
│   ├── classes.csv          本地備援
│   ├── course_dates.csv     本地備援
│   └── faqs.csv             本地備援
├── scripts/
│   └── build_site_xlsx.py   從 CSV 重新生成 site.xlsx
└── .github/workflows/
    └── deploy.yml           推到 main 自動部署到 GitHub Pages
```

## 部署

每次 push 到 `main` → GitHub Actions 自動部署到 GitHub Pages（1–2 分鐘）。

```
https://jarry6304.github.io/LineWebDemo/
```

---

## 設計系統摘要

色彩 token 集中於 `assets/css/main.css` 開頭的 `:root`。三組色相搭配自然品牌：

| 色相 | Token | 用途 |
|---|---|---|
| 森林綠（主） | `--c-primary` / `--c-primary-dark` / `--c-primary-light` / `--c-accent` | Hero 標題、CTA、accent 徽章 |
| 大地棕（副） | `--c-earth` / `--c-earth-dark` / `--c-earth-light` / `--c-cream` | 區域標籤、FAQ 分類、卡片頂緣 |
| 泥土深棕（footer） | `--c-soil` (#3D2E1F) | 網頁底部 footer 背景，視覺上代表地面 |

**Footer 互補配色：** 深土棕背景 + 暖米文字 + 嫩葉綠連結。lime green 是 soil brown 的 split-complementary，對應「土壤孕育植物」意象，比正互補（冷藍）更符合自然品牌。

**字體：** Noto Sans TC（Google Fonts，`font-display: swap`）— 統一全站。

