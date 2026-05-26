/* 資料載入：本地 CSV 或 Google Sheets（依 site-config.js 切換） */
(function(global){
  'use strict';

  // ============================================================
  // CSV parser（支援雙引號包字串、欄位內逗號、欄位內換行）
  // ============================================================
  function parseCSV(text) {
    const rows = [];
    let cur = [''];
    let inQuotes = false;
    let i = 0;
    const len = text.length;

    while (i < len) {
      const ch = text[i];
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
    const headers = rows[0].map(h => h.trim());
    return rows.slice(1)
      .filter(r => r.some(c => c !== ''))
      .map(r => {
        const obj = {};
        headers.forEach((h, idx) => { obj[h] = (r[idx] != null ? String(r[idx]) : '').trim(); });
        return obj;
      });
  }

  // ============================================================
  // 來源路由：sheet 名 → URL
  // ============================================================
  function sourceUrl(sheetName) {
    const sid = (global.SITE_CONFIG && global.SITE_CONFIG.GOOGLE_SHEETS_ID || '').trim();
    if (sid) {
      return `https://docs.google.com/spreadsheets/d/${encodeURIComponent(sid)}/gviz/tq` +
             `?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
    }
    return `data/${sheetName}.csv`;
  }

  async function loadSheet(sheetName) {
    const url = sourceUrl(sheetName);
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Failed to load ${sheetName}: ${res.status}`);
    const text = await res.text();
    return parseCSV(text);
  }

  // ============================================================
  // 載入全部資料（10 個 sheet 並行）
  // ============================================================
  const SHEETS = [
    'config', 'classes', 'course_dates', 'faqs',
    'series', 'keywords', 'about', 'refund', 'privacy', 'exp_hints',
  ];

  async function loadAll() {
    const results = await Promise.all(SHEETS.map(loadSheet));
    const byName = {};
    SHEETS.forEach((name, idx) => { byName[name] = results[idx]; });

    // config 表轉為 { key: value } 物件
    const config = {};
    (byName.config || []).forEach(r => { if (r.key) config[r.key] = r.value; });

    return {
      config,
      classes:    byName.classes    || [],
      dates:      byName.course_dates || [],
      faqs:       byName.faqs       || [],
      series:     byName.series     || [],
      keywords:   byName.keywords   || [],
      about:      byName.about      || [],
      refund:     byName.refund     || [],
      privacy:    byName.privacy    || [],
      exp_hints:  byName.exp_hints  || [],
    };
  }

  function handleLoadError(err) {
    console.error('[Data Load Error]', err);
    global.location.href = 'error.html?reason=csv';
  }

  global.TBCSV = {
    parseCSV, loadSheet, loadAll, handleLoadError, sourceUrl, SHEETS,
  };
})(window);
