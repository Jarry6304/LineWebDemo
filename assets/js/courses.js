/* 課程頁邏輯：系列分區、班級卡、Modal、行事曆 */
(async function(){
  'use strict';

  try {
    const data = await TBCSV.loadAll();
    TB.injectHeader(data.config);
    TB.injectFooter(data.config);
    TB.applyText(data.config);

    bindLineCta(data.config);
    renderSeriesAnchors(data.series);
    renderSeriesSections(data);
    renderCalendar(data);
    TB.handleAnchorScroll();
  } catch (err) {
    TBCSV.handleLoadError(err);
  }

  function bindLineCta(config) {
    if (!config.line_oa_url) return;
    const line = document.getElementById('line-cta');
    if (line) line.href = config.line_oa_url;
  }

  // ----------------------------------------------------------
  // 上方系列錨點按鈕（從 series 表生成）
  // ----------------------------------------------------------
  function renderSeriesAnchors(series) {
    const container = document.querySelector('[data-series-anchors]');
    if (!container || !series) return;
    const sorted = series.slice().sort((a, b) => Number(a.display_order) - Number(b.display_order));
    container.innerHTML = sorted.map(s => `
      <a href="#${TB.escapeHTML(s.series_id)}" class="btn btn--secondary btn--lg">${TB.escapeHTML(s.name)}</a>
    `).join('');
  }

  // ----------------------------------------------------------
  // 系列分區（每個 series 一段，內含對應的班級卡）
  // ----------------------------------------------------------
  function renderSeriesSections(data) {
    const container = document.querySelector('[data-series-sections]');
    if (!container) return;

    const seriesSorted = (data.series || []).slice()
      .sort((a, b) => Number(a.display_order) - Number(b.display_order));

    const classesBySeries = {};
    (data.classes || []).slice()
      .sort((a, b) => Number(a.display_order) - Number(b.display_order))
      .forEach(c => {
        if (!classesBySeries[c.series]) classesBySeries[c.series] = [];
        classesBySeries[c.series].push(c);
      });

    const emptyLabel = data.config.class_list_empty || '本系列暫無班級';

    container.innerHTML = seriesSorted.map(s => {
      const list = classesBySeries[s.name] || [];
      const listHTML = list.length === 0
        ? `<p class="muted">${TB.escapeHTML(emptyLabel)}</p>`
        : list.map(c => renderClassCard(c, data)).join('');
      return `
        <section id="${TB.escapeHTML(s.series_id)}" class="container section">
          <div class="section-heading">
            <h2>${TB.escapeHTML(s.title)}</h2>
            <p>${TB.escapeHTML(s.tagline)}</p>
          </div>
          <div class="stack" data-series-classes="${TB.escapeHTML(s.name)}">${listHTML}</div>
        </section>
      `;
    }).join('');

    container.querySelectorAll('[data-class-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-class-id');
        const cls = data.classes.find(c => c.class_id === id);
        if (cls) openClassModal(cls, data);
      });
    });
  }

  function renderClassCard(c, data) {
    const sessionCount = (data.dates || []).filter(d => d.class_id === c.class_id).length;
    const priceUnit = c.price_unit
      ? `<span class="class-card__price-unit">${TB.escapeHTML(c.price_unit)}</span>`
      : '';
    const moreLabel = data.config.class_card_more || '看詳情';
    const sessionLabel = data.config.calendar_session_label || '堂';

    return `
      <article class="class-card">
        <div class="class-card__head">
          <h3 class="class-card__name">${TB.escapeHTML(c.name)}</h3>
          <div class="class-card__price">${TB.formatPrice(c.price)}${priceUnit}</div>
        </div>
        <div class="class-card__meta">
          <span class="badge badge--earth">${TB.escapeHTML(c.region)}</span>
          <span class="badge badge--accent">${TB.escapeHTML(c.level)}</span>
          <span class="badge badge--muted">${TB.escapeHTML(c.age_range)}</span>
        </div>
        <p class="class-card__desc">${TB.escapeHTML(c.description)}</p>
        <div class="caption muted">共 ${sessionCount} ${TB.escapeHTML(sessionLabel)} · 每堂 ${TB.escapeHTML(c.duration_hours)} 小時</div>
        <button data-class-id="${TB.escapeHTML(c.class_id)}" class="btn btn--secondary" style="margin-top:8px;">${TB.escapeHTML(moreLabel)}</button>
      </article>
    `;
  }

  function openClassModal(c, data) {
    const dates = (data.dates || [])
      .filter(d => d.class_id === c.class_id)
      .sort((a, b) => a.date.localeCompare(b.date));

    const dateEmpty = data.config.class_dates_empty || '尚未公布日期';
    const dateListHTML = dates.length === 0
      ? `<li class="muted">${TB.escapeHTML(dateEmpty)}</li>`
      : dates.map(d => `
          <li>
            <span class="calendar__date">${TB.formatDate(d.date)}（${TB.escapeHTML(d.weekday)}）</span>
            <span>第 ${TB.escapeHTML(d.session_no)} 堂${d.notes ? ' · <span class="date-list__note">' + TB.escapeHTML(d.notes) + '</span>' : ''}</span>
          </li>
        `).join('');

    const expHint = lookupExpHint(c.experience_requirement, data.exp_hints);
    const priceDisplay = TB.formatPrice(c.price) + (c.price_unit ? TB.escapeHTML(c.price_unit) : '');
    const feeSummary = data.config.class_modal_fee_summary || '費用包含項目';

    const feeBlock = c.fee_included
      ? `<details class="disclosure" style="margin-top:24px;">
           <summary>${TB.escapeHTML(feeSummary)}</summary>
           <div class="disclosure__body">${TB.escapeHTML(c.fee_included)}</div>
         </details>`
      : '';

    const modalSuffix = data.config.class_modal_title_suffix || ' · 詳細資訊';
    TB.openModal(c.name + modalSuffix, `
      <div class="card__meta" style="margin-bottom:16px;">
        <span class="badge badge--earth">${TB.escapeHTML(c.region)}</span>
        <span class="badge badge--accent">${TB.escapeHTML(c.level)}</span>
        <span class="badge badge--muted">${TB.escapeHTML(c.age_range)}</span>
      </div>
      <p>${TB.escapeHTML(c.description)}</p>

      <dl class="detail-grid">
        <dt>${TB.escapeHTML(data.config.class_modal_label_price || '費用')}</dt><dd>${priceDisplay}</dd>
        <dt>${TB.escapeHTML(data.config.class_modal_label_age || '年齡')}</dt><dd>${TB.escapeHTML(c.age_range)}</dd>
        <dt>${TB.escapeHTML(data.config.class_modal_label_exp || '經驗')}</dt><dd>${TB.escapeHTML(expHint)}</dd>
        <dt>${TB.escapeHTML(data.config.class_modal_label_duration || '時數')}</dt><dd>每堂 ${TB.escapeHTML(c.duration_hours)} 小時</dd>
        <dt>${TB.escapeHTML(data.config.class_modal_label_transport || '交通')}</dt><dd>${TB.escapeHTML(c.transport_note)}</dd>
        <dt>${TB.escapeHTML(data.config.class_modal_label_areas || '區域')}</dt><dd>${TB.escapeHTML(c.activity_areas)}</dd>
      </dl>

      <h3 style="font-size:18px;margin-top:24px;">${TB.escapeHTML(data.config.class_modal_dates_heading || '課程日期')}</h3>
      <ul class="date-list">${dateListHTML}</ul>

      ${feeBlock}
    `);
  }

  function lookupExpHint(code, expHints) {
    if (!code) return '';
    const row = (expHints || []).find(r => r.code === code);
    return row ? row.hint : code;
  }

  // ----------------------------------------------------------
  // 課程行事曆（依月份折疊）
  // ----------------------------------------------------------
  function renderCalendar(data) {
    const container = document.querySelector('[data-calendar]');
    if (!container) return;

    const classMap = {};
    (data.classes || []).forEach(c => { classMap[c.class_id] = c; });

    const grouped = {};
    (data.dates || []).slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .forEach(d => {
        const key = (d.date || '').slice(0, 7);
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(d);
      });

    const months = Object.keys(grouped).sort();
    if (months.length === 0) {
      const empty = data.config.calendar_empty || '尚未公布行事曆';
      container.innerHTML = `<p class="muted text-center">${TB.escapeHTML(empty)}</p>`;
      return;
    }

    const sessionLabel = data.config.calendar_session_label || '堂';

    container.innerHTML = months.map((m, idx) => {
      const [y, mm] = m.split('-');
      const monthLabel = `${y} 年 ${parseInt(mm, 10)} 月`;
      const list = grouped[m].map(d => {
        const cls = classMap[d.class_id];
        const className = cls ? cls.name : d.class_id;
        const noteHTML = d.notes ? `<span class="date-list__note">${TB.escapeHTML(d.notes)}</span>` : '';
        return `
          <li>
            <span class="calendar__date">${TB.formatDate(d.date)}（${TB.escapeHTML(d.weekday)}）</span>
            <span class="calendar__class">${TB.escapeHTML(className)} 第 ${TB.escapeHTML(d.session_no)} ${TB.escapeHTML(sessionLabel)} ${noteHTML}</span>
          </li>
        `;
      }).join('');
      return `
        <details class="calendar__month" ${idx === 0 ? 'open' : ''}>
          <summary>${monthLabel} · ${grouped[m].length} ${TB.escapeHTML(sessionLabel)}</summary>
          <ul class="calendar__list">${list}</ul>
        </details>
      `;
    }).join('');
  }
})();
