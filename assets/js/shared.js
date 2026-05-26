/* 共用元件：Header / Footer / 工具 / Modal / Accordion */
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
          <span>虎甲自然</span>
        </a>
        <nav class="site-header__nav">
          <a href="index.html">企業概述</a>
          <a href="courses.html">課程介紹</a>
          <a href="info.html#contact">聯絡我們</a>
          <a href="info.html#download">檔案下載</a>
        </nav>
        <a href="${escapeHTML(lineUrl)}" class="site-header__back" target="_blank" rel="noopener">加 LINE</a>
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
          <a href="info.html">相關問題</a>
        </div>
        <div class="site-footer__copyright">
          © 虎甲自然 Tiger Beetle Nature · 城市與自然的引路者
        </div>
      </div>
    `;
    document.body.appendChild(footer);
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
  // 對外 API
  // ============================================================
  global.TB = {
    formatPrice, formatDate, weekdayOf, escapeHTML,
    injectHeader, injectFooter,
    openModal, closeModal,
    singleOpenAccordion,
  };
})(window);
