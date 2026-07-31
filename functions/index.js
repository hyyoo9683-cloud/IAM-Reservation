const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { initializeApp } = require('firebase-admin/app');
const { Resend } = require('resend');

initializeApp();

// 도메인 인증 전까지는 Resend 테스트 발신 주소 사용. suwoncca.org 인증 완료 후
// RESEND_FROM_EMAIL 환경변수로 교체 (예: "IAM Center 예약시스템 <noreply@suwoncca.org>").
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'IAM Center 예약시스템 <onboarding@resend.dev>';

function buildMailContent(status, data) {
  const room = data.room || '';
  const date = data.date || '';
  const time = (data.start && data.end) ? `${data.start} ~ ${data.end}` : '';
  const manager = data.managerName || data.stewardName || '';

  if (status === '확정') {
    return {
      subject: `[IAM Center] 예약이 확정되었습니다 (${room} ${date})`,
      html: `
        <p>안녕하세요, ${manager}님.</p>
        <p>신청하신 예약이 <strong>확정</strong>되었습니다.</p>
        <ul>
          <li>공간: ${room}</li>
          <li>날짜: ${date}</li>
          <li>시간: ${time}</li>
        </ul>
        <p>문의사항은 IAM Center로 연락 주세요.</p>
      `,
    };
  }
  if (status === '취소') {
    return {
      subject: `[IAM Center] 예약이 취소되었습니다 (${room} ${date})`,
      html: `
        <p>안녕하세요, ${manager}님.</p>
        <p>신청하신 예약이 <strong>취소</strong>되었습니다.</p>
        <ul>
          <li>공간: ${room}</li>
          <li>날짜: ${date}</li>
          <li>시간: ${time}</li>
          ${data.rejectReason ? `<li>사유: ${data.rejectReason}</li>` : ''}
        </ul>
      `,
    };
  }
  return null;
}

async function sendStatusEmail(status, data) {
  const to = (data.userEmail || '').trim();
  if (!to || !to.includes('@')) return;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('RESEND_API_KEY가 설정되지 않아 이메일을 보낼 수 없습니다.');
    return;
  }

  const content = buildMailContent(status, data);
  if (!content) return;

  const resend = new Resend(apiKey);
  try {
    await resend.emails.send({ from: FROM_EMAIL, to, subject: content.subject, html: content.html });
  } catch (err) {
    console.error('resend send error:', err);
  }
}

// 예약 상태가 대기/기타 → 확정 또는 취소로 바뀔 때 이메일 발송
exports.onReservationUpdated = onDocumentUpdated('reservations/{id}', async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();
  if (before.status === after.status) return;
  if (after.status === '확정' || after.status === '취소') {
    await sendStatusEmail(after.status, after);
  }
});

// CSV 가져오기·표 직접 입력 등으로 처음부터 '확정' 상태로 생성되는 경우 이메일 발송
exports.onReservationCreated = onDocumentCreated('reservations/{id}', async (event) => {
  const data = event.data.data();
  if (data.status === '확정') {
    await sendStatusEmail('확정', data);
  }
});
