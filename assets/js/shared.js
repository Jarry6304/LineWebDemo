/* 共用元件：Header / Footer / 工具 / Modal / Accordion / applyText */
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
  // applyText：把 config 表內容套到頁面上
  //   [data-cfg="key"]    → textContent
  //   [data-cfg-ml="key"] → innerHTML（escape 後把 \n 變 <br>）
  // 若 config 中沒有對應 key，保留 HTML 內原文字當 fallback
  // ============================================================
  function applyText(config, root) {
    const scope = root || document;
    if (!config) return;

    scope.querySelectorAll('[data-cfg]').forEach(el => {
      const key = el.getAttribute('data-cfg');
      const v = config[key];
      if (v != null && v !== '') el.textContent = v;
    });

    scope.querySelectorAll('[data-cfg-ml]').forEach(el => {
      const key = el.getAttribute('data-cfg-ml');
      const v = config[key];
      if (v != null && v !== '') {
        el.innerHTML = escapeHTML(v).replace(/\n/g, '<br>');
      }
    });
  }

  // ============================================================
  // Header 注入（樣板用 data-cfg；applyText 會在外面負責覆寫）
  // ============================================================
  function injectHeader(config) {
    const lineUrl = (config && config.line_oa_url) || '#';
    const header = document.createElement('header');
    header.className = 'site-header';
    header.innerHTML = `
      <div class="site-header__inner">
        <a href="index.html" class="site-header__logo">
          <img src="assets/img/logo-mark.png" alt="" class="site-header__logo-mark">
          <span class="site-header__logo-text" data-cfg="site_name">虎甲自然</span>
        </a>
        <nav class="site-header__nav">
          <a href="index.html"           data-cfg="nav_home">企業概述</a>
          <a href="courses.html"         data-cfg="nav_courses">課程介紹</a>
          <a href="info.html#contact"    data-cfg="nav_contact">聯絡我們</a>
          <a href="info.html#download"   data-cfg="nav_download">檔案下載</a>
        </nav>
        <a href="${escapeHTML(lineUrl)}" class="site-header__back" target="_blank" rel="noopener" data-cfg="nav_line">加 LINE</a>
      </div>
    `;
    document.body.insertBefore(header, document.body.firstChild);
  }

  // ============================================================
  // Footer 注入
  // ============================================================
  function injectFooter(config) {
    const cfg = config || {};
    const lineUrl = cfg.line_oa_url || '#';
    const lineId = cfg.line_oa_id || '';
    const email = cfg.contact_email || '';
    const pdfUrl = cfg.pdf_url || '#';
    const lineLabel = (cfg.footer_line_label || 'LINE 諮詢') + (lineId ? ' ' + lineId : '');

    const footer = document.createElement('footer');
    footer.className = 'site-footer';
    footer.innerHTML = `
      <div class="site-footer__inner">
        <div class="site-footer__row">
          <a href="${escapeHTML(lineUrl)}" target="_blank" rel="noopener">${escapeHTML(lineLabel)}</a>
          <a href="mailto:${escapeHTML(email)}">${escapeHTML(email)}</a>
          <a href="${escapeHTML(pdfUrl)}" target="_blank" rel="noopener" data-cfg="footer_pdf_label">下載 PDF 簡章</a>
        </div>
        <div class="site-footer__copyright" data-cfg="footer_copyright">
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
  // anchor scroll（避開 sticky header）
  // ============================================================
  function handleAnchorScroll(offset) {
    if (!location.hash) return;
    const target = document.querySelector(location.hash);
    if (!target) return;
    setTimeout(() => {
      const y = target.getBoundingClientRect().top + window.scrollY - (offset || 72);
      window.scrollTo({ top: y, behavior: 'smooth' });
    }, 100);
  }

  // ============================================================
  // 對外 API
  // ============================================================
  global.TB = {
    formatPrice, formatDate, weekdayOf, escapeHTML,
    applyText,
    injectHeader, injectFooter,
    openModal, closeModal,
    singleOpenAccordion,
    handleAnchorScroll,
  };
})(window);
