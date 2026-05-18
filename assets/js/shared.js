/* 共用元件：Header / Footer / 早鳥橫幅 / 工具 / Demo 切換器 */
(function(global){
  'use strict';

  // ============================================================
  // 工具函式
  // ============================================================
  function formatPrice(n) {
    const num = Number(n);
    if (isNaN(num)) return n;
    return 'NT$ ' + num.toLocaleString('en-US');
  }

  function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '/' + m + '/' + day;
  }

  function weekdayOf(iso) {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return ['日','一','二','三','四','五','六'][d.getDay()];
  }

  function isExpired(dateStr) {
    if (!dateStr) return false;
    const target = new Date(dateStr);
    const today = new Date();
    today.setHours(0,0,0,0);
    return target < today;
  }

  function escapeHTML(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, ch => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[ch]));
  }

  // ============================================================
  // Header 注入
  // ============================================================
  function injectHeader(config) {
    const lineUrl = (config && config.line_oa_url) || 'https://lin.ee/TPOEska';
    const header = document.createElement('header');
    header.className = 'site-header';
    header.innerHTML = `
      <div class="site-header__inner">
        <a href="index.html" class="site-header__logo">
          <svg class="site-header__logo-mark" viewBox="0 0 32 32" aria-hidden="true">
            <ellipse cx="16" cy="20" rx="9" ry="11" fill="#2D5F3F"/>
            <ellipse cx="13" cy="15" rx="2" ry="3" fill="#A4C763"/>
            <ellipse cx="19" cy="15" rx="2" ry="3" fill="#A4C763"/>
            <circle cx="13" cy="14" r="1" fill="#fff"/>
            <circle cx="19" cy="14" r="1" fill="#fff"/>
            <path d="M11 8 L13 11 M21 8 L19 11" stroke="#2D5F3F" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <span>虎甲自然</span>
        </a>
        <a href="${escapeHTML(lineUrl)}" class="site-header__back" target="_blank" rel="noopener">返回 LINE</a>
      </div>
    `;
    document.body.insertBefore(header, document.body.firstChild);
  }

  // ============================================================
  // Footer 注入
  // ============================================================
  function injectFooter(config) {
    const cfg = config || {};
    const lineUrl = cfg.line_oa_url || 'https://lin.ee/TPOEska';
    const lineId = cfg.line_oa_id || '@821lvzed';
    const email = cfg.contact_email || 'bill541328@tbnature.com.tw';
    const pdfUrl = cfg.pdf_url || 'assets/tiger-beetle-2026.pdf';

    const footer = document.createElement('footer');
    footer.className = 'site-footer';
    footer.innerHTML = `
      <div class="site-footer__inner">
        <div class="site-footer__row">
          <a href="${escapeHTML(lineUrl)}" target="_blank" rel="noopener">LINE 諮詢 ${escapeHTML(lineId)}</a>
          <a href="mailto:${escapeHTML(email)}">${escapeHTML(email)}</a>
          <a href="${escapeHTML(pdfUrl)}" target="_blank" rel="noopener">下載 PDF 簡章</a>
          <a href="info.html">FAQ / 退費 / 個資</a>
        </div>
        <div class="site-footer__copyright">
          © 2026 虎甲自然 Tiger Beetle Nature · 城市與自然的引路者
        </div>
      </div>
    `;
    document.body.appendChild(footer);
  }

  // ============================================================
  // 早鳥橫幅
  // ============================================================
  function injectEarlyBirdBanner(config, targetSelector) {
    if (!config || !config.early_bird_deadline) return;
    if (isExpired(config.early_bird_deadline)) return;
    if (sessionStorage.getItem('tb_banner_closed') === '1') return;

    const target = targetSelector ? document.querySelector(targetSelector) : null;
    const deadline = formatDate(config.early_bird_deadline);
    const discount = Math.round(Number(config.early_bird_discount || 0) * 100);

    const banner = document.createElement('div');
    banner.className = 'banner';
    banner.setAttribute('role', 'status');
    banner.innerHTML = `
      <span>🌱 早鳥優惠：${deadline} 前報名享 ${discount}% 折扣</span>
      <button class="banner__action" data-banner-action>看說明會</button>
      <button class="banner__close" aria-label="關閉橫幅">×</button>
    `;
    banner.querySelector('.banner__close').addEventListener('click', () => {
      sessionStorage.setItem('tb_banner_closed', '1');
      banner.remove();
    });
    banner.querySelector('[data-banner-action]').addEventListener('click', () => {
      showBriefingModal(config);
    });
    if (target) {
      target.appendChild(banner);
    } else {
      const c = document.createElement('div');
      c.className = 'container';
      c.style.padding = '16px 24px 0';
      c.appendChild(banner);
      const header = document.querySelector('.site-header');
      if (header) header.insertAdjacentElement('afterend', c);
      else document.body.insertBefore(c, document.body.firstChild);
    }
  }

  // ============================================================
  // 說明會 Modal
  // ============================================================
  function showBriefingModal(config) {
    if (isExpired(config.briefing_date && config.briefing_date.split(' ')[0])) {
      openModal('線上說明會', '<p>本期說明會已結束，請加 LINE 諮詢以了解最新場次。</p>');
      return;
    }
    const date = (config.briefing_date || '').replace(' ', ' ｜ ');
    const url = config.briefing_url || '';
    openModal('2026 線上說明會', `
      <p style="font-size:18px;">時間：${escapeHTML(date)}</p>
      <p>於 Google Meet 進行，會議連結將於前三日發布於官方 LINE。</p>
      <p class="muted small">內容：課程理念介紹、行前安全教育、問答環節</p>
      ${url ? `<a href="${escapeHTML(url)}" target="_blank" rel="noopener" class="btn btn--primary btn--block" style="margin-top:24px;">查看會議連結</a>` : ''}
    `);
  }

  // ============================================================
  // 通用 Modal
  // ============================================================
  let modalEl = null;
  function ensureModal() {
    if (modalEl) return modalEl;
    modalEl = document.createElement('div');
    modalEl.className = 'modal';
    modalEl.setAttribute('aria-modal', 'true');
    modalEl.setAttribute('role', 'dialog');
    modalEl.innerHTML = `
      <div class="modal__sheet" role="document">
        <div class="modal__handle"></div>
        <button class="modal__close" aria-label="關閉">×</button>
        <h2 class="modal__title" data-modal-title></h2>
        <div data-modal-body></div>
      </div>
    `;
    document.body.appendChild(modalEl);
    modalEl.addEventListener('click', (e) => {
      if (e.target === modalEl) closeModal();
    });
    modalEl.querySelector('.modal__close').addEventListener('click', closeModal);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modalEl.hasAttribute('open')) closeModal();
    });
    return modalEl;
  }
  function openModal(title, bodyHTML) {
    const m = ensureModal();
    m.querySelector('[data-modal-title]').textContent = title || '';
    m.querySelector('[data-modal-body]').innerHTML = bodyHTML || '';
    m.setAttribute('open', '');
    document.body.classList.add('modal-open');
  }
  function closeModal() {
    if (!modalEl) return;
    modalEl.removeAttribute('open');
    document.body.classList.remove('modal-open');
  }

  // ============================================================
  // Accordion：同時只展開一項
  // ============================================================
  function singleOpenAccordion(containerSelector) {
    const container = document.querySelector(containerSelector);
    if (!container) return;
    container.addEventListener('toggle', (e) => {
      const target = e.target;
      if (target.tagName !== 'DETAILS' || !target.open) return;
      container.querySelectorAll('details[open]').forEach(d => {
        if (d !== target) d.open = false;
      });
    }, true);
  }

  // ============================================================
  // Demo Switcher（測試錯誤狀態用）
  // ============================================================
  function injectDemoSwitcher() {
    const path = location.pathname.split('/').pop() || 'index.html';
    const params = new URLSearchParams(location.search);
    const currentSim = params.get('simulate') || '';

    const states = [
      { key: '', label: '✓ 正常模式' },
      { key: 'fail', label: '報名 API 失敗' },
      { key: 'duplicate', label: '重複報名' },
      { key: 'network', label: '網路斷線' },
      { key: 'full', label: '班級剛好滿班' },
      { key: 'csv', label: 'CSV 載入失敗' },
    ];

    const wrapper = document.createElement('div');
    wrapper.className = 'demo-switcher';
    wrapper.innerHTML = `
      <button class="demo-switcher__toggle" aria-label="Demo 模式切換">⚙</button>
      <div class="demo-switcher__panel">
        <div class="demo-switcher__title">Demo 模式（測試用）</div>
        <ul class="demo-switcher__list">
          ${states.map(s => {
            const isActive = s.key === currentSim;
            const url = s.key ? `${path}?simulate=${s.key}` : path;
            return `<li><a href="${url}" data-active="${isActive}">${s.label}</a></li>`;
          }).join('')}
          <li style="margin-top:8px;border-top:1px solid #eee;padding-top:8px;">
            <a href="404.html">查看 404 頁</a>
          </li>
          <li><a href="error.html?reason=csv">查看錯誤頁</a></li>
        </ul>
      </div>
    `;
    document.body.appendChild(wrapper);
    const toggle = wrapper.querySelector('.demo-switcher__toggle');
    toggle.addEventListener('click', () => {
      const open = wrapper.getAttribute('data-open') === 'true';
      wrapper.setAttribute('data-open', open ? 'false' : 'true');
    });
    document.addEventListener('click', (e) => {
      if (!wrapper.contains(e.target)) wrapper.setAttribute('data-open', 'false');
    });
  }

  // ============================================================
  // 對外 API
  // ============================================================
  global.TB = {
    formatPrice, formatDate, weekdayOf, isExpired, escapeHTML,
    injectHeader, injectFooter, injectEarlyBirdBanner,
    openModal, closeModal,
    singleOpenAccordion,
    injectDemoSwitcher,
    showBriefingModal,
  };
})(window);
