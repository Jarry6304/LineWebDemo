/* CSV 載入與解析工具
   從 data/*.csv 載入網站內容 */
(function(global){
  'use strict';

  // ============================================================
  // CSV parser（支援雙引號包字串、欄位內逗號、換行）
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
        headers.forEach((h, idx) => { obj[h] = (r[idx] || '').trim(); });
        return obj;
      });
  }

  async function loadCSV(path) {
    const res = await fetch(path, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
    const text = await res.text();
    return parseCSV(text);
  }

  // ============================================================
  // 載入全部資料（4 個 CSV 並行）
  // ============================================================
  async function loadAll() {
    const [classes, dates, faqs, configRows] = await Promise.all([
      loadCSV('data/classes.csv'),
      loadCSV('data/course_dates.csv'),
      loadCSV('data/faqs.csv'),
      loadCSV('data/config.csv'),
    ]);

    const config = {};
    configRows.forEach(r => { config[r.key] = r.value; });

    return { classes, dates, faqs, config };
  }

  function handleLoadError(err) {
    console.error('[CSV Load Error]', err);
    global.location.href = 'error.html?reason=csv';
  }

  global.TBCSV = {
    parseCSV, loadCSV, loadAll, handleLoadError,
  };
})(window);
