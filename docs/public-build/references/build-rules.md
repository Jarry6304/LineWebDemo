# build-rules — allowlist、轉換、Verify、Publish 契約

## 1. Allowlist（`dist/public/` 唯一合法內容）

| 路徑 | 處理 |
|---|---|
| `index.html` `courses.html` `info.html` `404.html` `error.html` | HTML 去註解（含 inline `<script>` 內 JS 註解） |
| `assets/css/main.css` | CSS 去註解 |
| `assets/js/csv.js` `shared.js` `home.js` `courses.js` `info.js` | JS 去註解 |
| `assets/js/site-config.js` | **不複製**，由 build 生成（§3） |
| `assets/img/**`、`assets/tiger-beetle-2026.pdf` | 原樣複製，byte-identical |
| `.github/workflows/deploy.yml`、`.nojekyll`、`LICENSE` | 原樣複製 |

明確排除：`README.md`、`dataspec.md`、`data/**`、`scripts/**`、`.gitignore`、`package*.json`、`node_modules/`、`dist/`、`docs/**`、任何 `*.md`。

規則：

| ❌ | ✅ |
|---|---|
| 「複製全部，再排除黑名單」 | 「只複製列舉檔案」；Verify 比對 dist 實際集合 == allowlist 展開集合 |
| 新增檔案自動進 dist | 新增檔案要進 dist 必須改 allowlist，否則 fail |

## 2. 轉換規則

| 副檔名 | 工具 | 參數 | 禁止 |
|---|---|---|---|
| `.js` | esbuild transform | 不 bundle、不 minify、`legalComments: 'none'`、`target: 'esnext'`、不指定 `format` | 改識別字、加 polyfill、改 IIFE / 全域行為 |
| `.css` | esbuild（loader css） | 同上 | 合併 / 重排 selector |
| `.html` | html-minifier-terser | 只開 `removeComments: true`；`minifyJS` 給自訂函式 → 交 esbuild transform（去 inline script 註解、不 minify） | 其他選項一律預設關閉：空白、屬性引號、大小寫、`<style>` 皆不動 |
| 二進位 | fs copy | — | — |

已實測（esbuild 0.28）：JS / CSS 去註解後語意不變、字串內 URL 不受影響、`:root` 18 個 CSS 變數原樣；HTML `removeComments` 前後行數相同。

## 3. site-config.js 生成

```js
window.SITE_CONFIG = {
  GOOGLE_SHEETS_ID: "<sheet-id>"
};
```

| 規則 | 說明 |
|---|---|
| 來源 | `--sheet-id` > `$env:LINEWEB_SHEET_ID`；都沒有 → exit 1，不產生 dist |
| 正規化 | 貼整段網址時擷取 `/spreadsheets/d/([A-Za-z0-9_-]+)`；最終值必須符合 `^[A-Za-z0-9_-]+$` |
| 產生方式 | 字串模板直接寫檔；**不對 `main` 的 `site-config.js` 做 regex 取代** |

## 4. Verify（Stage 3，全部通過才 exit 0）

| 檢查 | 方法 | 通過條件 |
|---|---|---|
| 檔案集合 | 遞迴列 dist 相對路徑（排除 `.git`）vs allowlist 展開（glob 展開以 `main` 實際檔案為準） | 兩集合相等；差集逐一列出 |
| 註解殘留 | `*.html`：`<!--`；`*.css` / `*.js` / HTML inline `<script>` 內文：`/*`、trim 後行首 `//` | 0 命中 |
| 禁用字 | 掃 dist 全部文字檔（`LICENSE` 除外），大小寫不分 | 0 命中 |
| ID 注入 | `assets/js/site-config.js` == §3 模板帶入 ID | 相等 |
| 語意等價 | 每個 `.js` / `.css`：`esbuild --minify`(main 版) vs `esbuild --minify`(dist 版)；`site-config.js` 以 ID 代入 main 版 | byte-identical |
| 資料檔 | dist 內不存在 `data/`、`*.csv`、`*.xlsx`、`*.md` | 不存在 |

禁用字表（大小寫不分；只抓開發產物用語，不含頁面文案常見詞）：

```text
README  dataspec  xlsx  openpyxl  build_site  LineWebDemo  Jarry
claude  anthropic  TODO  FIXME  HACK  資安守則  維護者  開發者
```

已在現行 `main` 實測：esbuild 去註解後上表對 JS / CSS / HTML 皆 0 命中（`Jarry` 只剩 `LICENSE`）；`sheet`、`csv` 為合法程式用詞，**不得**列入。

失敗輸出格式：每項一行 `FAIL <檢查名>: <檔案> [<行號>] <內容>`，全部列完再 exit 1。

## 5. publish.ps1（Stage 4）

```powershell
param(
  [Parameter(Mandatory)][string]$SheetId,
  [string]$Remote = "https://github.com/bill541328/LineWeb.git",
  [string]$Branch = "main",
  [string]$PublicBranch = "public",     # 推回 LineWebDemo 的分支；"" = 不推
  [switch]$DryRun
)
$ErrorActionPreference = "Stop"
Set-Location (git rev-parse --show-toplevel)
npm run build:public -- --sheet-id $SheetId
if ($LASTEXITCODE -ne 0) { throw "build/verify failed — nothing pushed" }
if ($DryRun) { Get-ChildItem dist/public -Recurse -File -Name; return }
$origin = git remote get-url origin
Push-Location dist/public
try {
  git init -q -b main
  git add -A
  git commit -q -m "Publish site"
  git push --force $Remote "HEAD:$Branch"
  if ($PublicBranch) { git push --force $origin "HEAD:$PublicBranch" }
} finally {
  Pop-Location
  Remove-Item dist/public/.git -Recurse -Force -ErrorAction SilentlyContinue
}
```

| 規則 | 說明 |
|---|---|
| commit 身分 | 用 git 全域設定，不在腳本寫死 |
| 冪等 | 每次都是新的 temp repo → 單一 commit → force；遠端永遠只有 1 筆 |
| 失敗 | 任何一步非 0 即中止；`finally` 一定清掉 `dist/public/.git` |
| Claude Code | 只執行 `-DryRun`；真正 push 由人執行（客戶需先重建 repo + 重加 collaborator） |

## 6. 目錄結果（`main` 新增部分）

```text
LineWebDemo/
├── package.json
├── package-lock.json
├── scripts/
│   ├── build_site_xlsx.py        # 既有
│   └── public/
│       ├── build.mjs             # Stage 1–3
│       └── publish.ps1           # Stage 4
├── docs/public-build/
│   ├── SPEC.md
│   └── references/build-rules.md
└── dist/public/                  # gitignored
```
