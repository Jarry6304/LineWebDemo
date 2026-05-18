/* CSV 載入與解析工具
   支援兩種資料來源：
   1. 本地 CSV（data/*.csv）— 預設
   2. Google Sheet（朋友編輯後即時生效）— 由 GOOGLE_SHEET.enabled 或 ?source=sheet 啟用 */
(function(global){
  'use strict';

  // ============================================================
  // 朋友改這裡就好（一次性設定）
  // ============================================================
  const GOOGLE_SHEET = {
    // 改成 true 啟用 Google Sheet 作為資料來源
    enabled: false,
    // 從 Google Sheet 網址複製這段：https://docs.google.com/spreadsheets/d/【這裡】/edit
    sheet_id: '',
    // 各分頁的 gid（瀏覽器網址列裡的 #gid=xxx）
    gids: {
      classes: 0,
      course_dates: 1,
      faqs: 2,
      config: 3,
    },
  };

  function sheetMode() {
    const params = new URLSearchParams(global.location.search);
    // 優先看 URL（demo 切換器用），其次看 sources 內設定
    if (params.get('source') === 'sheet') return true;
    if (params.get('source') === 'local') return false;
    return GOOGLE_SHEET.enabled && GOOGLE_SHEET.sheet_id;
  }

  function sheetUrl(tabKey) {
    const gid = GOOGLE_SHEET.gids[tabKey];
    return `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET.sheet_id}/export?format=csv&gid=${gid}`;
  }

  function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

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
    const params = new URLSearchParams(global.location.search);
    if (params.get('simulate') === 'csv') {
      throw new Error('Simulated CSV load failure');
    }
    const res = await fetch(path, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
    const text = await res.text();
    return parseCSV(text);
  }

  // ============================================================
  // 載入全部資料（4 個 CSV 並行）
  // ============================================================
  async function loadAll() {
    const useSheet = sheetMode();
    const params = new URLSearchParams(global.location.search);
    const isSimulatedSheet = params.get('source') === 'sheet' && !GOOGLE_SHEET.sheet_id;

    if (useSheet && !isSimulatedSheet) {
      // 真實 Google Sheet 模式：直接從 docs.google.com fetch
      return loadFromSheet();
    }

    if (isSimulatedSheet) {
      // 模擬 Google Sheet 流程：顯示 banner、加延遲，實際從 local CSV 載入
      showSourceBanner('正在從 Google Sheet 取得最新資料…', 'sheet');
      await sleep(900); // 假裝有網路延遲
    }

    const [classes, dates, faqs, configRows] = await Promise.all([
      loadCSV('data/classes.csv'),
      loadCSV('data/course_dates.csv'),
      loadCSV('data/faqs.csv'),
      loadCSV('data/config.csv'),
    ]);

    const config = {};
    configRows.forEach(r => { config[r.key] = r.value; });

    if (isSimulatedSheet) {
      setSourceBanner('資料源：Google Sheet（模擬模式）', 'sheet', 2200);
    }

    return { classes, dates, faqs, config };
  }

  async function loadFromSheet() {
    showSourceBanner('正在從 Google Sheet 取得最新資料…', 'sheet');
    try {
      const [classes, dates, faqs, configRows] = await Promise.all([
        loadCSVRemote(sheetUrl('classes')),
        loadCSVRemote(sheetUrl('course_dates')),
        loadCSVRemote(sheetUrl('faqs')),
        loadCSVRemote(sheetUrl('config')),
      ]);
      const config = {};
      configRows.forEach(r => { config[r.key] = r.value; });
      setSourceBanner('資料源：Google Sheet', 'sheet', 2200);
      return { classes, dates, faqs, config };
    } catch (err) {
      // Sheet 載入失敗 → 退回 local
      console.warn('[Sheet load failed, fallback to local CSV]', err);
      setSourceBanner('Google Sheet 取得失敗，已切回本地備援資料', 'sheet', 4000);
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
  }

  async function loadCSVRemote(url) {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Failed to load remote CSV: ${res.status}`);
    return parseCSV(await res.text());
  }

  // ============================================================
  // 資料來源浮動 banner
  // ============================================================
  function ensureBanner() {
    let el = document.querySelector('.source-banner');
    if (!el) {
      el = document.createElement('div');
      el.className = 'source-banner';
      el.innerHTML = '<span class="source-banner__dot"></span><span data-banner-text></span>';
      document.body.appendChild(el);
    }
    return el;
  }
  function showSourceBanner(text) {
    const el = ensureBanner();
    el.querySelector('[data-banner-text]').textContent = text;
    el.setAttribute('data-show', 'true');
  }
  function setSourceBanner(text, _kind, hideAfterMs) {
    showSourceBanner(text);
    if (hideAfterMs) {
      setTimeout(() => {
        const el = document.querySelector('.source-banner');
        if (el) el.setAttribute('data-show', 'false');
      }, hideAfterMs);
    }
  }

  function handleLoadError(err) {
    console.error('[CSV Load Error]', err);
    const reason = err && err.message && err.message.includes('Simulated') ? 'simulated' : 'csv';
    global.location.href = 'error.html?reason=' + reason;
  }

  function activeSource() {
    return sheetMode() ? 'sheet' : 'local';
  }

  global.TBCSV = {
    parseCSV, loadCSV, loadAll, handleLoadError,
    sheetMode, activeSource,
    GOOGLE_SHEET, // 暴露給維護者參考
  };
})(window);
