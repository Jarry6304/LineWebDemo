/* 報名表邏輯：5 步驟、驗證、草稿、總額計算、mock 送出 */
(async function(){
  'use strict';

  const TOTAL_STEPS = 5;
  const DRAFT_KEY = 'tb_draft_v1';

  let data = null;
  let currentStep = 1;
  let classMap = {};
  let formEl = null;

  try {
    data = await TBCSV.loadAll();
    TB.injectHeader(data.config);
    TB.injectFooter(data.config);
    TB.injectEarlyBirdBanner(data.config);

    data.classes.forEach(c => { classMap[c.class_id] = c; });

    formEl = document.getElementById('register-form');
    populateClassSelect();
    bindStepNav();
    bindFieldValidation();
    restoreDraft();
    bindAutoSaveDraft();
    bindSimulationAlerts();
    bindSubmit();
    TB.injectDemoSwitcher();

    // 從 URL query 預選班級
    const params = new URLSearchParams(location.search);
    const preselect = params.get('class');
    if (preselect) {
      const sel = document.getElementById('f-class');
      if (sel && sel.querySelector(`option[value="${preselect}"]`)) {
        sel.value = preselect;
      }
    }
    updateProgress();
  } catch (err) {
    TBCSV.handleLoadError(err);
  }

  function populateClassSelect() {
    const sel = document.getElementById('f-class');
    if (!sel) return;
    const sorted = data.classes.slice().sort((a, b) => Number(a.display_order) - Number(b.display_order));
    sorted.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.class_id;
      const fullSim = TBMock.classBecameFull(c.class_id) && c.status === 'open';
      const status = fullSim ? 'full' : c.status;
      const priceUnit = c.series === '自然探索' ? '／童' : '';
      let label = `${c.name}（${c.region} · ${TB.formatPrice(c.price)}${priceUnit}）`;
      if (status === 'full') label += '【已額滿】';
      else if (status === 'cancelled') label += '【已取消】';
      opt.textContent = label;
      if (status !== 'open') opt.disabled = true;
      sel.appendChild(opt);
    });

    sel.addEventListener('change', updateSummary);
  }

  function bindStepNav() {
    const prevBtn = formEl.querySelector('[data-prev]');
    const nextBtn = formEl.querySelector('[data-next]');
    const submitBtn = formEl.querySelector('[data-submit]');

    prevBtn.addEventListener('click', () => goToStep(currentStep - 1));
    nextBtn.addEventListener('click', () => {
      if (validateStep(currentStep)) {
        goToStep(currentStep + 1);
      }
    });
  }

  function goToStep(n) {
    if (n < 1 || n > TOTAL_STEPS) return;
    currentStep = n;
    formEl.querySelectorAll('.form-step').forEach(s => {
      s.setAttribute('data-active', s.getAttribute('data-step') === String(n) ? 'true' : 'false');
    });
    updateProgress();

    // 進到最後一步時，更新摘要、切換按鈕
    const prevBtn = formEl.querySelector('[data-prev]');
    const nextBtn = formEl.querySelector('[data-next]');
    const submitBtn = formEl.querySelector('[data-submit]');

    prevBtn.classList.toggle('hidden', n === 1);
    nextBtn.classList.toggle('hidden', n === TOTAL_STEPS);
    submitBtn.classList.toggle('hidden', n !== TOTAL_STEPS);

    if (n === TOTAL_STEPS) updateSummary();

    // 捲到頂
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function updateProgress() {
    const pct = (currentStep / TOTAL_STEPS) * 100;
    const fill = document.querySelector('[data-progress-fill]');
    const label = document.querySelector('[data-progress-label]');
    if (fill) fill.style.width = pct + '%';
    if (label) label.textContent = `${currentStep} / ${TOTAL_STEPS}`;
  }

  function validateStep(step) {
    const stepEl = formEl.querySelector(`.form-step[data-step="${step}"]`);
    if (!stepEl) return true;
    let ok = true;
    stepEl.querySelectorAll('[data-field]').forEach(field => {
      const valid = validateField(field);
      if (!valid) ok = false;
    });
    return ok;
  }

  function validateField(field) {
    const name = field.getAttribute('data-field');
    const inputs = field.querySelectorAll('input, select, textarea');
    let valid = true;

    if (name === 'gender') {
      valid = !!field.querySelector('input[name="gender"]:checked');
    } else if (name === 'agree') {
      const cb = field.querySelector('input[name="agree"]');
      valid = !!(cb && cb.checked);
    } else {
      inputs.forEach(input => {
        if (input.type === 'checkbox') return;
        if (input.required && !input.value.trim()) { valid = false; return; }
        if (input.type === 'email' && input.value) {
          valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value) && valid;
        }
        if (input.type === 'tel' && input.value) {
          valid = /^09\d{8}$/.test(input.value) && valid;
        }
        // class select：禁止選到 disabled
        if (input.id === 'f-class' && input.value) {
          const opt = input.querySelector(`option[value="${input.value}"]`);
          if (opt && opt.disabled) valid = false;
        }
      });
    }

    field.classList.toggle('field--invalid', !valid);
    return valid;
  }

  function bindFieldValidation() {
    formEl.querySelectorAll('[data-field]').forEach(field => {
      field.addEventListener('blur', () => {
        if (field.classList.contains('field--invalid')) validateField(field);
      }, true);
      field.addEventListener('change', () => {
        if (field.classList.contains('field--invalid')) validateField(field);
      });
    });
  }

  function getFormData() {
    const fd = new FormData(formEl);
    const data = {};
    for (const [k, v] of fd.entries()) data[k] = v;
    return data;
  }

  function updateSummary() {
    const fd = getFormData();
    const classId = fd.class;
    const cls = classMap[classId];

    document.querySelector('[data-sum-class]').textContent = cls ? `${cls.name}（${cls.region}）` : '—';
    document.querySelector('[data-sum-student]').textContent = fd.student_name || '—';
    document.querySelector('[data-sum-parent]').textContent = fd.parent_name ? `${fd.parent_name}（${fd.phone || ''}）` : '—';

    const totalEl = document.querySelector('[data-sum-total]');
    const noteEl = document.querySelector('[data-discount-note]');
    if (!cls) {
      totalEl.textContent = '—';
      noteEl.textContent = '';
      return;
    }

    const original = Number(cls.price);
    const discountRate = getActiveDiscount();
    if (discountRate > 0) {
      const discounted = Math.round(original * (1 - discountRate));
      totalEl.innerHTML = `<span class="price-original">${TB.formatPrice(original)}</span>${TB.formatPrice(discounted)}`;
      const pct = Math.round(discountRate * 100);
      noteEl.textContent = `已套用早鳥 ${pct}% 折扣（截止 ${TB.formatDate(data.config.early_bird_deadline)}）`;
    } else {
      totalEl.textContent = TB.formatPrice(original);
      noteEl.textContent = '';
    }
  }

  function getActiveDiscount() {
    if (!data || !data.config) return 0;
    const deadline = data.config.early_bird_deadline;
    if (!deadline) return 0;
    if (TB.isExpired(deadline)) return 0;
    return Number(data.config.early_bird_discount || 0);
  }

  function bindAutoSaveDraft() {
    let saveTimer = null;
    formEl.addEventListener('input', () => {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(saveDraft, 400);
    });
  }

  function saveDraft() {
    try {
      const fd = getFormData();
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ data: fd, step: currentStep, ts: Date.now() }));
    } catch {}
  }

  function restoreDraft() {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const obj = JSON.parse(raw);
      if (!obj || !obj.data) return;
      // 過期 7 天就忽略
      if (Date.now() - obj.ts > 7 * 86400 * 1000) {
        localStorage.removeItem(DRAFT_KEY);
        return;
      }
      Object.keys(obj.data).forEach(k => {
        const el = formEl.querySelector(`[name="${k}"]`);
        if (!el) return;
        if (el.type === 'radio') {
          const target = formEl.querySelector(`[name="${k}"][value="${obj.data[k]}"]`);
          if (target) target.checked = true;
        } else if (el.type === 'checkbox') {
          el.checked = obj.data[k] === 'on' || obj.data[k] === 'agree';
        } else {
          el.value = obj.data[k];
        }
      });
      showAlert('info', '已還原您先前的草稿，可繼續完成。');
    } catch {}
  }

  function clearDraft() {
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
  }

  function bindSubmit() {
    formEl.addEventListener('submit', async (e) => {
      e.preventDefault();
      // 驗證所有步驟
      for (let s = 1; s <= TOTAL_STEPS; s++) {
        if (!validateStep(s)) {
          goToStep(s);
          return;
        }
      }

      const submitBtn = formEl.querySelector('[data-submit]');
      const textEl = submitBtn.querySelector('[data-submit-text]');
      submitBtn.disabled = true;
      const originalText = textEl.textContent;
      textEl.innerHTML = '<span class="spinner" aria-hidden="true"></span> 送出中...';

      const fd = getFormData();
      const cls = classMap[fd.class];
      const discount = getActiveDiscount();
      const total = cls ? Math.round(Number(cls.price) * (1 - discount)) : 0;
      const payload = {
        ...fd,
        class_name: cls ? cls.name : '',
        total,
      };

      try {
        const result = await TBMock.submit(payload);
        clearDraft();
        const qs = new URLSearchParams({
          rid: result.registration_id,
          class: result.summary.class_name,
          student: result.summary.student_name,
          total: String(result.summary.total),
        });
        location.href = 'success.html?' + qs.toString();
      } catch (err) {
        submitBtn.disabled = false;
        textEl.textContent = originalText;
        showErrorAlert(err);
      }
    });
  }

  function bindSimulationAlerts() {
    // Demo 模式：點按鈕後立即顯示對應錯誤預覽，不需要填完表單才看得到
    const mode = TBMock.getSimMode();
    switch (mode) {
      case 'full':
        showAlert('warning', '⚠ 您選擇的班級在您填寫期間剛好額滿了。請選擇其他班級或加 LINE 等候候補名單。');
        break;
      case 'fail':
        showAlert('error', '❌ <strong>送出失敗</strong>：伺服器暫時無法處理您的報名，請稍後再試。<br><span class="caption muted">（Demo 預覽。填完表單按送出後，也會看到此錯誤畫面）</span>');
        break;
      case 'duplicate':
        showAlert('warning', '⚠ <strong>重複報名</strong>：您已使用此手機號碼報名過此班級。如有疑問請加 LINE 諮詢。<br><span class="caption muted">（Demo 預覽。填完表單按送出後，也會看到此錯誤畫面）</span>');
        break;
      case 'network':
        showAlert('error', '📡 <strong>網路連線異常</strong>：您的報名草稿已自動保存於本機，請確認網路後重試。<br><span class="caption muted">（Demo 預覽。填完表單按送出後，也會看到此錯誤畫面）</span>');
        break;
    }
  }

  function showErrorAlert(err) {
    const code = err && err.code;
    if (code === 'DUPLICATE') {
      showAlert('warning', '⚠ ' + err.message);
    } else if (code === 'NETWORK') {
      showAlert('error', '📡 ' + err.message + '（您的填寫內容已自動保存於本機）');
    } else {
      showAlert('error', '❌ ' + (err.message || '未知錯誤，請稍後再試。'));
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function showAlert(type, message) {
    const container = document.querySelector('[data-alert]');
    if (!container) return;
    const cls = type === 'warning' ? 'alert--warning'
              : type === 'error' ? 'alert--error'
              : type === 'success' ? 'alert--success'
              : 'alert--info';
    container.innerHTML = `
      <div class="alert ${cls}">
        <div class="alert__body">${message}</div>
        <button class="modal__close" style="position:static;width:32px;height:32px;font-size:18px;" aria-label="關閉" onclick="this.parentElement.remove()">×</button>
      </div>
    `;
  }
})();
