/* Mock 後端：模擬 GAS 報名送出
   由 ?simulate= 控制行為 */
(function(global){
  'use strict';

  function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  // 取得當前 simulate 模式
  function getSimMode() {
    const params = new URLSearchParams(location.search);
    return params.get('simulate') || '';
  }

  async function submit(formData) {
    const sim = getSimMode();
    await sleep(900); // 模擬網路延遲

    switch (sim) {
      case 'fail':
        throw makeError('SERVER_ERROR', '伺服器暫時無法處理您的報名，請稍後再試。');
      case 'duplicate':
        throw makeError('DUPLICATE', '您已使用此手機號碼報名過此班級。如有疑問請加 LINE 諮詢。');
      case 'network':
        throw makeError('NETWORK', '網路連線異常，您的報名草稿已自動保存，請確認網路後重試。');
      default:
        return {
          ok: true,
          registration_id: 'TB' + Date.now().toString(36).toUpperCase(),
          summary: {
            class_name: formData.class_name,
            student_name: formData.student_name,
            total: formData.total,
          },
        };
    }
  }

  function makeError(code, message) {
    const e = new Error(message);
    e.code = code;
    return e;
  }

  // 班級是否在報名期間「剛好滿班」（給 register.js 用）
  function classBecameFull(classId) {
    return getSimMode() === 'full';
  }

  global.TBMock = { submit, classBecameFull, getSimMode };
})(window);
