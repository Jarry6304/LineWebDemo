/* info 頁邏輯：FAQ Accordion、聯絡資訊綁定 */
(async function(){
  'use strict';

  try {
    const data = await TBCSV.loadAll();
    TB.injectHeader(data.config);
    TB.injectFooter(data.config);
    TB.injectEarlyBirdBanner(data.config);

    renderFAQ(data.faqs);
    bindContacts(data.config);
    TB.injectDemoSwitcher();

    // 處理 hash 跳轉（避開 sticky header）
    if (location.hash) {
      const target = document.querySelector(location.hash);
      if (target) {
        setTimeout(() => {
          const y = target.getBoundingClientRect().top + window.scrollY - 72;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }, 100);
      }
    }
  } catch (err) {
    TBCSV.handleLoadError(err);
  }

  function renderFAQ(faqs) {
    const container = document.querySelector('[data-faq-list]');
    if (!container) return;
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
        <div class="accordion__body">${formatAnswer(f.answer)}</div>
      </details>
    `).join('');

    TB.singleOpenAccordion('[data-accordion]');
  }

  function formatAnswer(text) {
    // 將 CSV 裡的 \n 轉成換行
    return TB.escapeHTML(text).replace(/\\n/g, '\n');
  }

  function bindContacts(config) {
    const lineCta = document.getElementById('line-cta');
    if (lineCta) {
      lineCta.href = config.line_oa_url || 'https://lin.ee/TPOEska';
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

    // 說明會資訊
    const briefingBox = document.querySelector('[data-briefing]');
    if (briefingBox && config.briefing_date) {
      const dt = config.briefing_date;
      const expired = TB.isExpired(dt.split(' ')[0]);
      if (expired) {
        briefingBox.innerHTML = '<p class="muted">本期說明會已結束，請加 LINE 諮詢以了解最新場次。</p>';
      } else {
        briefingBox.innerHTML = `
          <p style="font-size:18px;">${TB.escapeHTML(dt)}</p>
          <p>於 Google Meet 進行，會議連結將於前三日發布於官方 LINE。</p>
          <p class="muted small">內容：課程理念介紹、行前安全教育、問答環節</p>
        `;
      }
    }
  }
})();
