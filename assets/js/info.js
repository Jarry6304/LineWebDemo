/* info 頁邏輯：FAQ / 退費 / 個資 / 聯絡綁定 */
(async function(){
  'use strict';

  try {
    const data = await TBCSV.loadAll();
    TB.injectHeader(data.config);
    TB.injectFooter(data.config);
    TB.applyText(data.config);

    renderFAQ(data.faqs);
    renderRefund(data.refund);
    renderPrivacy(data.privacy);
    bindContacts(data.config);

    TB.handleAnchorScroll();
  } catch (err) {
    TBCSV.handleLoadError(err);
  }

  // ----------------------------------------------------------
  // FAQ Accordion
  // ----------------------------------------------------------
  function renderFAQ(faqs) {
    const container = document.querySelector('[data-faq-list]');
    if (!container || !faqs) return;
    container.innerHTML = '<div data-accordion></div>';
    const accordion = container.querySelector('[data-accordion]');

    const sorted = faqs.slice().sort((a, b) => Number(a.order) - Number(b.order));
    accordion.innerHTML = sorted.map(f => `
      <details class="accordion__item">
        <summary>
          <span>
            <span class="accordion__category">${TB.escapeHTML(f.category)}</span>
            ${TB.escapeHTML(f.question)}
          </span>
        </summary>
        <div class="accordion__body">${formatMultiline(f.answer)}</div>
      </details>
    `).join('');

    TB.singleOpenAccordion('[data-accordion]');
  }

  // ----------------------------------------------------------
  // 退費規定 → <tbody> 內生成 <tr>
  // ----------------------------------------------------------
  function renderRefund(rows) {
    const tbody = document.querySelector('[data-refund-rows]');
    if (!tbody) return;
    if (!rows || rows.length === 0) {
      tbody.innerHTML = '';
      return;
    }
    const sorted = rows.slice().sort((a, b) => Number(a.display_order) - Number(b.display_order));
    tbody.innerHTML = sorted.map(r => `
      <tr><td>${TB.escapeHTML(r.stage)}</td><td>${TB.escapeHTML(r.ratio)}</td></tr>
    `).join('');
  }

  // ----------------------------------------------------------
  // 個資聲明 → 每段一個 <h3> + <p>
  // ----------------------------------------------------------
  function renderPrivacy(rows) {
    const container = document.querySelector('[data-privacy-list]');
    if (!container) return;
    if (!rows || rows.length === 0) {
      container.innerHTML = '';
      return;
    }
    const sorted = rows.slice().sort((a, b) => Number(a.display_order) - Number(b.display_order));
    container.innerHTML = sorted.map((r, idx) => {
      const marginTop = idx === 0 ? '' : 'margin-top:24px;';
      return `
        <h3 style="font-size:18px;${marginTop}">${TB.escapeHTML(r.heading)}</h3>
        <p>${formatMultiline(r.body)}</p>
      `;
    }).join('');
  }

  function formatMultiline(text) {
    return TB.escapeHTML(text || '')
      .replace(/\\n/g, '\n')   // 向後相容舊資料的 \n 字面值
      .replace(/\n/g, '<br>');
  }

  function bindContacts(config) {
    const lineCta = document.getElementById('line-cta');
    if (lineCta) {
      lineCta.href = config.line_oa_url || '#';
      const idEl = lineCta.querySelector('[data-line-id]');
      if (idEl && config.line_oa_id) {
        idEl.textContent = config.line_oa_id;
        idEl.style.marginLeft = '8px';
        idEl.style.fontSize = '14px';
        idEl.style.opacity = '0.8';
      }
    }
    const emailCta = document.getElementById('email-cta');
    if (emailCta && config.contact_email) {
      emailCta.href = 'mailto:' + config.contact_email;
      const eEl = emailCta.querySelector('[data-email]');
      if (eEl) {
        eEl.textContent = config.contact_email;
        eEl.style.display = 'block';
        eEl.style.fontSize = '14px';
        eEl.style.opacity = '0.7';
        eEl.style.marginTop = '4px';
      }
    }
    const pdfCard = document.getElementById('pdf-card');
    if (pdfCard && config.pdf_url) {
      pdfCard.href = config.pdf_url;
    }
  }
})();
