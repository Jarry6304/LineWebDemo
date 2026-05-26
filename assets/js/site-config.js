/* 網站資料來源設定 ============================================
 *
 * 留空時：網站讀取 data/*.csv（本地 fallback / 開發用）
 * 填入 Google Sheets ID 後：網站改抓那份試算表的線上資料
 *
 * 從 Google Sheets ID：
 *   1. 把 data/site.xlsx 上傳到 Google Drive，右鍵「Open with → Google Sheets」
 *   2. 試算表分享：「擁有連結者 → 檢視者」
 *   3. 從網址列複製 ID：
 *      https://docs.google.com/spreadsheets/d/[← 這段就是 ID →]/edit
 *   4. 貼到下方 GOOGLE_SHEETS_ID 的引號內，commit & push
 *   5. 之後改 Google Sheets，網站約 5 分鐘內自動更新（Google CDN 快取）
 *
 * 想暫時切回本地 CSV：把 GOOGLE_SHEETS_ID 改回空字串再 push 即可
 * ========================================================== */
window.SITE_CONFIG = {
  GOOGLE_SHEETS_ID: '',
};
