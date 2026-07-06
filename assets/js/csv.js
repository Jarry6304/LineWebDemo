/* 資料載入 v2：SWR + 降級鏈（online → 過期快取 → repo 基準版 data/*.csv）
 *
 *  對外介面不變：TBCSV.loadAll() → { config, classes, dates, ... }
 *
 *  狀態機（loadAll）：
 *    快取新鮮（now − t < TTL）  → 立即回快取；背景 fetch 成功則靜默覆寫快取
 *    快取過期 / 無快取           → await 線上，成功寫快取後回傳
 *    線上失敗、有快取（含過期）   → 回快取
 *    線上失敗、無快取            → 抓 repo data/*.csv 基準版（不寫快取）
 *    基準版也失敗                → throw → 各頁 handleLoadError → error.html
 *    回應以 < 開頭                → 視同失敗（gviz 權限/分頁名錯時回 200+HTML）
 *    config 或 classes 為空       → 視同失敗，不寫入快取
 */
(function () {
  'use strict';

  // host 物件只解析一次；fetch / localStorage / SITE_CONFIG 每次呼叫「即時」讀取，
  // 讓 node 測試能在載入後替換 mock。瀏覽器中 root === window === globalThis。
  var root =
    (typeof globalThis !== 'undefined' && globalThis) ||
    (typeof self !== 'undefined' && self) ||
    (typeof window !== 'undefined' && window) ||
    this;

  function _fetch()  { return root.fetch; }
  function _ls()     { return root.localStorage; }
  function _config() { return root.SITE_CONFIG; }

  var CACHE_KEY = 'tb-data-v1';       // 資料結構變更時升版，使全體訪客舊快取失效
  var CACHE_TTL = 10 * 60 * 1000;     // 10 分鐘：維護者改表後回站驗收時必過期

  var SHEETS = [
    'config', 'classes', 'course_dates', 'faqs',
    'series', 'keywords', 'about', 'refund', 'privacy', 'exp_hints',
  ];

  // ============================================================
  // CSV parser（支援雙引號包字串、欄位內逗號、欄位內換行）
  // ============================================================
  function parseCSV(text) {
    var rows = [];
    var cur = [''];
    var inQuotes = false;
    var i = 0;
    var len = text.length;

    while (i < len) {
      var ch = text[i];
      if (inQuotes) {
        if (ch === '"') {
          if (text[i + 1] === '"') { cur[cur.length - 1] += '"'; i += 2; continue; }
          inQuotes = false; i++; continue;
        }
        cur[cur.length - 1] += ch; i++;
      } else {
        if (ch === '"') { inQuotes = true; i++; }
        else if (ch === ',') { cur.push(''); i++; }
        else if (ch === '\n' || ch === '\r') {
          if (ch === '\r' && text[i + 1] === '\n') i++;
          rows.push(cur); cur = ['']; i++;
        } else { cur[cur.length - 1] += ch; i++; }
      }
    }
    if (cur.length > 1 || cur[0] !== '') rows.push(cur);

    if (rows.length === 0) return [];
    var headers = rows[0].map(function (h) { return h.trim(); });
    return rows.slice(1)
      .filter(function (r) { return r.some(function (c) { return c !== ''; }); })
      .map(function (r) {
        var obj = {};
        headers.forEach(function (h, idx) {
          obj[h] = (r[idx] != null ? String(r[idx]) : '').trim();
        });
        return obj;
      });
  }

  // ============================================================
  // 來源路由
  // ============================================================
  //   sourceUrl：有 GOOGLE_SHEETS_ID 走 gviz，否則 data/*.csv（開發/離線）
  function sourceUrl(sheetName) {
    var cfg = _config();
    var sid = ((cfg && cfg.GOOGLE_SHEETS_ID) || '').trim();
    if (sid) {
      return 'https://docs.google.com/spreadsheets/d/' + encodeURIComponent(sid) +
             '/gviz/tq?tqx=out:csv&sheet=' + encodeURIComponent(sheetName);
    }
    return 'data/' + sheetName + '.csv';
  }
  //   localUrl：基準版恆走 repo 本地，忽略 GOOGLE_SHEETS_ID
  function localUrl(sheetName) {
    return 'data/' + sheetName + '.csv';
  }

  // gviz 於權限 / 分頁名錯誤時回 200 + HTML；去 BOM/前導空白後首字為 < 即視同失敗
  function looksLikeHTML(text) {
    return String(text).replace(/^﻿/, '').replace(/^\s+/, '').charAt(0) === '<';
  }

  async function fetchSheet(sheetName, resolve) {
    var url = resolve(sheetName);
    var res = await _fetch()(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to load ' + sheetName + ': ' + res.status);
    var text = await res.text();
    if (looksLikeHTML(text)) throw new Error('HTML response for ' + sheetName);
    return parseCSV(text);
  }

  // 對外保留：單表載入（走 sourceUrl，含 HTML 防呆）
  function loadSheet(sheetName) {
    return fetchSheet(sheetName, sourceUrl);
  }

  // ============================================================
  // 組裝 + 驗證
  // ============================================================
  function buildData(results) {
    var byName = {};
    SHEETS.forEach(function (name, i) { byName[name] = results[i]; });

    var config = {};
    (byName.config || []).forEach(function (r) { if (r.key) config[r.key] = r.value; });

    return {
      config: config,
      classes:    byName.classes     || [],
      dates:      byName.course_dates || [],   // course_dates → dates
      faqs:       byName.faqs        || [],
      series:     byName.series      || [],
      keywords:   byName.keywords    || [],
      about:      byName.about       || [],
      refund:     byName.refund      || [],
      privacy:    byName.privacy     || [],
      exp_hints:  byName.exp_hints   || [],
    };
  }

  // config 或 classes 為空 → 視同壞資料，不得寫入快取
  function isValidData(data) {
    return !!(data &&
      data.config && Object.keys(data.config).length > 0 &&
      Array.isArray(data.classes) && data.classes.length > 0);
  }

  // 一組完整載入：任一表非 ok / HTML / 空表 → throw，供 loadAll 降級
  async function fetchGroup(resolve) {
    var results = await Promise.all(SHEETS.map(function (n) {
      return fetchSheet(n, resolve);
    }));
    var data = buildData(results);
    if (!isValidData(data)) throw new Error('invalid data (empty config/classes)');
    return data;
  }

  // ============================================================
  // 快取（localStorage，全程 try/catch；無痕/配額失敗靜默略過）
  // ============================================================
  function readCache() {
    try {
      var ls = _ls();
      if (!ls) return null;
      var raw = ls.getItem(CACHE_KEY);
      if (!raw) return null;
      var obj = JSON.parse(raw);
      if (!obj || typeof obj.t !== 'number' || !obj.data) return null;
      return obj;   // { t: <ms>, data: <dataObject> }
    } catch (e) { return null; }
  }

  function writeCache(data) {
    try {
      var ls = _ls();
      if (!ls) return;
      ls.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), data: data }));
    } catch (e) { /* 無痕 / 配額：靜默略過，行為等同無快取 */ }
  }

  // ============================================================
  // SWR 背景更新
  // ============================================================
  function startBackground() {
    var p = fetchGroup(sourceUrl)
      .then(function (data) { writeCache(data); return data; })  // 靜默覆寫
      .catch(function () { return null; });                      // 永不 reject
    api._bg = p;   // 曝露 in-flight promise 供測試 await
    return p;
  }

  // ============================================================
  // 載入全部資料
  // ============================================================
  async function loadAll() {
    var cached = readCache();
    var now = Date.now();

    // 快取新鮮 → 立即回，背景 revalidate（SWR）
    if (cached && (now - cached.t) < CACHE_TTL) {
      startBackground();
      return cached.data;
    }

    // 過期 / 無快取 → await 線上
    try {
      var data = await fetchGroup(sourceUrl);
      writeCache(data);          // 唯一寫快取的線上成功點
      return data;
    } catch (onlineErr) {
      if (cached) return cached.data;      // 線上失敗，回過期快取
      return await fetchGroup(localUrl);   // 無快取 → repo 基準版（不寫快取）
    }
  }

  function handleLoadError(err) {
    (root.console || console).error('[Data Load Error]', err);
    if (root.location) root.location.href = 'error.html?reason=csv';
  }

  // ============================================================
  // 對外 API
  // ============================================================
  var api = {
    parseCSV: parseCSV,
    loadSheet: loadSheet,
    loadAll: loadAll,
    handleLoadError: handleLoadError,
    sourceUrl: sourceUrl,
    SHEETS: SHEETS,
    CACHE_KEY: CACHE_KEY,
    CACHE_TTL: CACHE_TTL,
    // 測試 hook
    _bg: null,
    _readCache: readCache,
    _writeCache: writeCache,
    _isValidData: isValidData,
    _buildData: buildData,
    _fetchGroup: fetchGroup,
    _localUrl: localUrl,
  };

  if (typeof window !== 'undefined') window.TBCSV = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
