/* csv.js v2 行為驗證：node 零依賴，mock fetch / localStorage / SITE_CONFIG
 *
 *   執行：node tests/csv.spec.js
 *
 *   5 情境共 8 斷言：
 *     S1 首訪         無快取、線上 ok        → 回線上 + 寫快取           (2)
 *     S2 SWR          快取新鮮、線上較新      → 立即回舊快取 + 背景覆寫    (2)
 *     S3 過期降級     快取過期、線上失敗      → 回過期快取                (1)
 *     S4 HTML→本地    線上回 HTML、基準版 ok  → 回基準版 + 未寫快取        (2)
 *     S5 空表攔截     線上 classes 空         → 快取仍 null              (1)
 */
'use strict';

const TBCSV = require('../assets/js/csv.js');
const { CACHE_KEY, CACHE_TTL } = TBCSV;

let pass = 0, fail = 0;
function assert(cond, msg) {
  if (cond) { pass++; console.log('ok   - ' + msg); }
  else      { fail++; console.error('FAIL - ' + msg); }
}

// ---- in-memory localStorage mock ----
function makeLS(opts) {
  opts = opts || {};
  const store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { if (opts.throwOnSet) throw new Error('incognito'); store.set(k, String(v)); },
    removeItem: (k) => store.delete(k),
    _store: store,
  };
}

// ---- fetch mock：route(url) → csv 字串 | HTML 字串 | 拋錯（網路失敗）| {__nonOk} ----
function makeFetch(route) {
  return async function (url) {
    const r = route(url);   // 可能 throw 代表網路層失敗
    if (r && r.__nonOk) return { ok: false, status: r.status || 500, text: async () => '' };
    return { ok: true, status: 200, text: async () => r };
  };
}

const isOnline = (u) => u.indexOf('docs.google.com') !== -1;
const sheetOf = (u) => decodeURIComponent(
  (u.match(/[?&]sheet=([^&]+)/) || [])[1] || (u.match(/data\/([^.]+)\.csv/) || [])[1] || ''
);

// tag 用來區分 ONLINE / BASELINE / CACHED 三種來源
function csvFor(name, tag, opts) {
  opts = opts || {};
  if (name === 'config')  return 'key,value\nline_oa_url,https://x\nregister_url,' + tag + '\n';
  if (name === 'classes') return opts.emptyClasses ? 'class_id,title\n' : 'class_id,title\nc1,A\n';
  return 'col\nx\n';   // 其餘 8 表：無害佔位
}

function seedCache(ls, tag, tMs) {
  const results = TBCSV.SHEETS.map((n) => TBCSV.parseCSV(csvFor(n, tag)));
  const data = TBCSV._buildData(results);
  ls._store.set(CACHE_KEY, JSON.stringify({ t: tMs, data }));
}

function reset() {
  globalThis.SITE_CONFIG = { GOOGLE_SHEETS_ID: 'SHEET123' };  // → sourceUrl 走 gviz
  globalThis.localStorage = makeLS();
  TBCSV._bg = null;
}

async function S1_firstVisit() {
  reset();
  globalThis.fetch = makeFetch((u) => csvFor(sheetOf(u), 'ONLINE'));

  const data = await TBCSV.loadAll();
  assert(data.config.register_url === 'ONLINE', 'S1 首訪回傳線上抓取的資料');            // #1
  const w = JSON.parse(globalThis.localStorage.getItem(CACHE_KEY));
  assert(w && w.data.config.register_url === 'ONLINE', 'S1 線上資料寫入快取');            // #2
}

async function S2_swrBackground() {
  reset();
  seedCache(globalThis.localStorage, 'CACHED', Date.now());        // 新鮮快取
  globalThis.fetch = makeFetch((u) => csvFor(sheetOf(u), 'ONLINE'));

  const data = await TBCSV.loadAll();
  assert(data.config.register_url === 'CACHED', 'S2 新鮮快取立即回傳（不等線上）');       // #3
  await TBCSV._bg;                                                 // 等背景 revalidate 落地
  const w = JSON.parse(globalThis.localStorage.getItem(CACHE_KEY));
  assert(w.data.config.register_url === 'ONLINE', 'S2 背景靜默以線上資料覆寫快取');        // #4
}

async function S3_expiredFallback() {
  reset();
  seedCache(globalThis.localStorage, 'CACHED', Date.now() - CACHE_TTL - 5000);  // 過期
  globalThis.fetch = makeFetch((u) => {
    if (isOnline(u)) throw new Error('network');
    return csvFor(sheetOf(u), 'X');
  });

  const data = await TBCSV.loadAll();
  assert(data.config.register_url === 'CACHED', 'S3 線上失敗時回傳過期快取');             // #5
}

async function S4_htmlToBaseline() {
  reset();
  globalThis.fetch = makeFetch((u) =>
    isOnline(u) ? '<!doctype html><html>nope' : csvFor(sheetOf(u), 'BASELINE'));

  const data = await TBCSV.loadAll();
  assert(data.config.register_url === 'BASELINE', 'S4 線上回 HTML → 降級至 repo 基準版');  // #6
  assert(globalThis.localStorage.getItem(CACHE_KEY) === null, 'S4 基準版不寫入快取');       // #7
}

async function S5_emptyTableGuard() {
  reset();
  globalThis.fetch = makeFetch((u) =>
    isOnline(u) ? csvFor(sheetOf(u), 'ONLINE', { emptyClasses: true })
                : csvFor(sheetOf(u), 'BASELINE'));

  await TBCSV.loadAll();   // 線上 classes 空 → 視同失敗 → 降級基準版
  assert(globalThis.localStorage.getItem(CACHE_KEY) === null, 'S5 空 classes → 不寫快取');  // #8
}

(async function run() {
  await S1_firstVisit();
  await S2_swrBackground();
  await S3_expiredFallback();
  await S4_htmlToBaseline();
  await S5_emptyTableGuard();

  console.log('\n' + pass + ' passed, ' + fail + ' failed  (' + (pass + fail) + ' assertions)');
  process.exit(fail ? 1 : 0);
})();
