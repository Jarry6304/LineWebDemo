/* 首頁邏輯：about / series preview / keywords / LINE CTA */
(async function(){
  'use strict';

  try {
    const data = await TBCSV.loadAll();
    TB.injectHeader(data.config);
    TB.injectFooter(data.config);
    TB.applyText(data.config);

    renderAbout(data.about, data.config);
    renderSeriesPreview(data.series, data.config);
    renderKeywords(data.keywords);
    bindKeywordToggle();
    bindRegisterCta(data.config);
  } catch (err) {
    TBCSV.handleLoadError(err);
  }

  // ----------------------------------------------------------
  // 品牌故事：lead / muted 常顯；body / emphasis 收進「閱讀完整故事」
  // ----------------------------------------------------------
  function renderAbout(rows, config) {
    const container = document.querySelector('[data-about]');
    if (!container) return;
    if (!rows || rows.length === 0) {
      container.innerHTML = '';
      return;
    }

    const sorted = rows.slice().sort((a, b) => Number(a.display_order) - Number(b.display_order));
    const summaryLabel = (config && config.home_about_more) || '閱讀完整故事';

    const visibleHTML = [];
    const detailsHTML = [];
    sorted.forEach(r => {
      const p = renderParagraph(r);
      if (r.style === 'lead' || r.style === 'muted') visibleHTML.push(p);
      else detailsHTML.push(p);
    });

    const detailsBlock = detailsHTML.length > 0
      ? `<details class="disclosure">
           <summary>${TB.escapeHTML(summaryLabel)}</summary>
           <div class="disclosure__body">${detailsHTML.join('')}</div>
         </details>`
      : '';

    container.innerHTML = visibleHTML.join('') + detailsBlock;
  }

  function renderParagraph(r) {
    const body = TB.escapeHTML(r.text || '').replace(/\n/g, '<br>');
    switch (r.style) {
      case 'lead':
        return `<p style="font-size:20px;line-height:1.8;">${body}</p>`;
      case 'muted':
        return `<p style="color:var(--c-text-muted);">${body}</p>`;
      case 'emphasis':
        return `<p style="color:var(--c-primary);font-weight:500;">${body}</p>`;
      case 'body':
      default:
        return `<p>${body}</p>`;
    }
  }

  // ----------------------------------------------------------
  // 三大系列預覽卡
  // ----------------------------------------------------------
  function renderSeriesPreview(rows, config) {
    const container = document.querySelector('[data-series-preview]');
    if (!container) return;
    if (!rows || rows.length === 0) {
      container.innerHTML = '';
      return;
    }
    const cta = (config && config.home_series_cta) || '看班級 →';
    const sorted = rows.slice().sort((a, b) => Number(a.display_order) - Number(b.display_order));
    container.innerHTML = sorted.map(s => `
      <a href="courses.html#${TB.escapeHTML(s.series_id)}" class="series-card">
        <h3 class="series-card__title">${TB.escapeHTML(s.title)}</h3>
        <p class="series-card__desc">${TB.escapeHTML(s.preview_desc)}</p>
        <span class="series-card__arrow">${TB.escapeHTML(cta)}</span>
      </a>
    `).join('');
  }

  // ----------------------------------------------------------
  // 四宮格關鍵字
  // ----------------------------------------------------------
  function renderKeywords(rows) {
    const container = document.querySelector('[data-keywords]');
    if (!container) return;
    if (!rows || rows.length === 0) {
      container.innerHTML = '';
      return;
    }
    const sorted = rows.slice().sort((a, b) => Number(a.display_order) - Number(b.display_order));
    container.innerHTML = sorted.map(k => `
      <button class="keyword" type="button" aria-expanded="false">
        <span class="keyword__name">${TB.escapeHTML(k.name)}</span>
        <span class="keyword__desc">${TB.escapeHTML(k.description)}</span>
      </button>
    `).join('');
  }

  function bindKeywordToggle() {
    document.querySelectorAll('.keyword').forEach(btn => {
      btn.addEventListener('click', () => {
        const expanded = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', expanded ? 'false' : 'true');
      });
    });
  }

  function bindRegisterCta(config) {
    if (!config.register_url) return;
    document.querySelectorAll('#register-cta-hero, #register-cta-home').forEach(el => {
      el.href = config.register_url;
    });
  }
})();
