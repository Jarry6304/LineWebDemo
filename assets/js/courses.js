/* 課程頁邏輯：班級卡片、Modal 詳情、行事曆 */
(async function(){
  'use strict';

  try {
    const data = await TBCSV.loadAll();
    TB.injectHeader(data.config);
    TB.injectFooter(data.config);
    TB.injectEarlyBirdBanner(data.config);

    renderClassLists(data);
    renderCalendar(data);
    TB.injectDemoSwitcher();
    handleAnchorScroll();
  } catch (err) {
    TBCSV.handleLoadError(err);
  }

  function renderClassLists(data) {
    const grouped = {};
    data.classes
      .slice()
      .sort((a, b) => Number(a.display_order) - Number(b.display_order))
      .forEach(c => {
        if (!grouped[c.series]) grouped[c.series] = [];
        grouped[c.series].push(c);
      });

    document.querySelectorAll('[data-class-list]').forEach(container => {
      const series = container.getAttribute('data-class-list');
      const list = grouped[series] || [];
      if (list.length === 0) {
        container.innerHTML = '<p class="muted">本系列暫無班級</p>';
        return;
      }
      container.innerHTML = list.map(c => renderClassCard(c, data.dates)).join('');
      container.querySelectorAll('[data-class-id]').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-class-id');
          const cls = data.classes.find(c => c.class_id === id);
          if (cls) openClassModal(cls, data.dates);
        });
      });
    });
  }

  function renderClassCard(c, allDates) {
    const isFull = c.status === 'full';
    const isCancelled = c.status === 'cancelled';
    const disabled = isFull || isCancelled;
    const statusBadge = isFull
      ? '<span class="badge badge--danger">已額滿</span>'
      : isCancelled
        ? '<span class="badge badge--muted">已取消</span>'
        : '';

    const sessionCount = allDates.filter(d => d.class_id === c.class_id).length;
    const priceUnit = c.series === '自然探索' ? '<span class="class-card__price-unit">／每位小孩</span>' : '';

    return `
      <article class="class-card ${disabled ? 'class-card--disabled' : ''}">
        <div class="class-card__head">
          <h3 class="class-card__name">${TB.escapeHTML(c.name)}</h3>
          <div class="class-card__price">${TB.formatPrice(c.price)}${priceUnit}</div>
        </div>
        <div class="class-card__meta">
          <span class="badge">${TB.escapeHTML(c.region)}</span>
          <span class="badge badge--accent">${TB.escapeHTML(c.level)}</span>
          <span class="badge badge--muted">${TB.escapeHTML(c.age_range)}</span>
          ${statusBadge}
        </div>
        <p class="class-card__desc">${TB.escapeHTML(c.description)}</p>
        <div class="caption muted">共 ${sessionCount} 堂 · 每堂 ${TB.escapeHTML(c.duration_hours)} 小時</div>
        <button data-class-id="${TB.escapeHTML(c.class_id)}" class="btn btn--secondary" style="margin-top:8px;">看詳情</button>
      </article>
    `;
  }

  function openClassModal(c, allDates) {
    const dates = allDates
      .filter(d => d.class_id === c.class_id)
      .sort((a, b) => a.date.localeCompare(b.date));

    const dateListHTML = dates.length === 0
      ? '<li class="muted">尚未公布日期</li>'
      : dates.map(d => `
          <li>
            <span class="calendar__date">${TB.formatDate(d.date)}（${d.weekday}）</span>
            <span>第 ${d.session_no} 堂${d.notes ? ' · <span class="date-list__note">' + TB.escapeHTML(d.notes) + '</span>' : ''}</span>
          </li>
        `).join('');

    const ageRangeHints = {
      '無': '無戶外或爬山經驗',
      '低頻率': '低頻率戶外或爬山經驗',
      '中頻率': '中頻率戶外或爬山經驗',
      '一定程度': '一定程度戶外或爬山經驗',
    };
    const expHint = ageRangeHints[c.experience_requirement] || c.experience_requirement;

    const feeIncluded = c.series === '自然探索'
      ? '專業師資、器材設備、意外保險。行動糧、交通自理。'
      : c.series === '原野觀察'
        ? '專業師資、器材設備、意外保險。午餐、行動糧與大眾交通自理。'
        : `專業師資、器材設備、意外保險、接駁車（${c.name === '楓香班' ? '1 次' : c.name === '冷杉班' ? '1–2 次' : '視班別'}）。午餐、行動糧、大眾交通車資須自理。`;

    const peopleNote = c.series === '自然探索'
      ? `${c.min_students}–${c.max_students} 個家庭，總人數不超過 14 人`
      : `${c.min_students}–${c.max_students} 人`;

    TB.openModal(c.name + ' · 詳細資訊', `
      <div class="card__meta" style="margin-bottom:16px;">
        <span class="badge">${TB.escapeHTML(c.region)}</span>
        <span class="badge badge--accent">${TB.escapeHTML(c.level)}</span>
        <span class="badge badge--muted">${TB.escapeHTML(c.age_range)}</span>
      </div>
      <p>${TB.escapeHTML(c.description)}</p>

      <dl class="detail-grid">
        <dt>費用</dt><dd>${TB.formatPrice(c.price)}${c.series === '自然探索' ? '／每位小孩' : ''}</dd>
        <dt>人數</dt><dd>${peopleNote}</dd>
        <dt>年齡</dt><dd>${TB.escapeHTML(c.age_range)}</dd>
        <dt>經驗</dt><dd>${TB.escapeHTML(expHint)}</dd>
        <dt>時數</dt><dd>每堂 ${TB.escapeHTML(c.duration_hours)} 小時</dd>
        <dt>交通</dt><dd>${TB.escapeHTML(c.transport_note)}</dd>
        <dt>區域</dt><dd>${TB.escapeHTML(c.activity_areas)}</dd>
      </dl>

      <h3 style="font-size:18px;margin-top:24px;">課程日期</h3>
      <ul class="date-list">${dateListHTML}</ul>

      <details class="disclosure" style="margin-top:24px;">
        <summary>費用包含項目</summary>
        <div class="disclosure__body">${TB.escapeHTML(feeIncluded)}</div>
      </details>

      <a href="register.html?class=${encodeURIComponent(c.class_id)}" class="btn ${c.status === 'open' ? 'btn--primary' : 'btn--secondary'} btn--block btn--lg" style="margin-top:24px;" ${c.status !== 'open' ? 'aria-disabled="true"' : ''}>
        ${c.status === 'open' ? '報名此班' : c.status === 'full' ? '此班已額滿' : '此班已取消'}
      </a>
    `);
  }

  function renderCalendar(data) {
    const container = document.querySelector('[data-calendar]');
    if (!container) return;

    // 班級 lookup
    const classMap = {};
    data.classes.forEach(c => { classMap[c.class_id] = c; });

    // 依月份分組
    const grouped = {};
    data.dates
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .forEach(d => {
        const key = d.date.slice(0, 7); // YYYY-MM
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(d);
      });

    const months = Object.keys(grouped).sort();
    if (months.length === 0) {
      container.innerHTML = '<p class="muted text-center">尚未公布行事曆</p>';
      return;
    }

    container.innerHTML = months.map((m, idx) => {
      const [y, mm] = m.split('-');
      const monthLabel = `${y} 年 ${parseInt(mm, 10)} 月`;
      const list = grouped[m].map(d => {
        const cls = classMap[d.class_id];
        const className = cls ? cls.name : d.class_id;
        const noteHTML = d.notes ? `<span class="date-list__note">${TB.escapeHTML(d.notes)}</span>` : '';
        return `
          <li>
            <span class="calendar__date">${TB.formatDate(d.date)}（${d.weekday}）</span>
            <span class="calendar__class">${TB.escapeHTML(className)} 第 ${d.session_no} 堂 ${noteHTML}</span>
          </li>
        `;
      }).join('');
      return `
        <details class="calendar__month" ${idx === 0 ? 'open' : ''}>
          <summary>${monthLabel} · ${grouped[m].length} 堂</summary>
          <ul class="calendar__list">${list}</ul>
        </details>
      `;
    }).join('');
  }

  function handleAnchorScroll() {
    // sticky header 偏移補正
    if (location.hash) {
      const target = document.querySelector(location.hash);
      if (target) {
        setTimeout(() => {
          const y = target.getBoundingClientRect().top + window.scrollY - 72;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }, 100);
      }
    }
  }
})();
