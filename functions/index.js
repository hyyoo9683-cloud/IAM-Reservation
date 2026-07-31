const { onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const { renderReservationEmail } = require('./lib/templates');
const { sendEmail } = require('./lib/resendClient');
const { claimEmailEvent, markSent, markFailed, markSkipped } = require('./lib/emailLog');

initializeApp();

// index.html의 ADMIN_EMAILS와 동일 (클라이언트에도 공개된 값이라 그대로 복제해도 안전)
const ADMIN_EMAILS = ['hyyoo9683@gmail.com'];

async function isAdminEmail(email) {
  if (!email) return false;
  if (ADMIN_EMAILS.includes(email)) return true;
  const doc = await getFirestore().collection('admins').doc(email).get();
  return doc.exists;
}

function isValidEmail(v) {
  return typeof v === 'string' && /\S+@\S+\.\S+/.test(v.trim());
}

async function sendReservationStatusEmail({ eventKey, type, reservation, reservationId }) {
  const to = (reservation.userEmail || '').trim().toLowerCase();

  const logRef = await claimEmailEvent(eventKey, {
    reservationId,
    emailType: type === '확정' ? 'approved' : type,
    recipient: to,
    recipientType: 'reservation_manager',
  });
  if (!logRef) return; // 동일 이벤트 재실행 — 이미 처리됨

  if (!isValidEmail(to)) {
    await markSkipped(logRef, '예약자 이메일 주소 없음');
    return;
  }

  const content = renderReservationEmail(type, reservation);
  if (!content) {
    await markSkipped(logRef, `이메일 유형 미구현: ${type}`);
    return;
  }

  try {
    const result = await sendEmail({ to, subject: content.subject, html: content.html, text: content.text });
    await markSent(logRef, result && result.id);
  } catch (err) {
    // 이메일 발송 실패가 예약 승인 자체(updateDoc)에는 전혀 영향을 주지 않음 —
    // 이 트리거는 예약 문서가 이미 저장된 "이후"에 실행되는 별도 함수이기 때문.
    console.error('reservation email send error:', err.message || err);
    await markFailed(logRef, err);
  }
}

// 예약 상태가 '확정'으로 바뀔 때(관리자 승인)만 예약 책임자에게 승인 이메일 발송.
// - 상태 외 필드만 바뀐 경우, 이미 확정 상태인 문서가 다시 저장된 경우는 무시 (before.status === after.status)
// - CSV 가져오기·표 직접 입력처럼 문서가 "생성"부터 확정 상태인 경우는 대상에서 제외
//   (대량 과거 데이터 이관 시 메일이 무더기로 나가는 걸 막기 위한 의도적 범위 제한 — 필요해지면 별도 트리거로 확장)
exports.onReservationUpdated = onDocumentUpdated('reservations/{id}', async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();
  if (before.status === after.status) return;
  if (after.status !== '확정') return; // 변경/취소 메일은 3단계 이후 구현 예정

  const reservationId = event.params.id;
  // event.id는 동일 이벤트가 재전달(Cloud Functions at-least-once)되어도 같은 값을 유지하므로
  // 이를 eventKey에 포함시키면 "함수 재실행으로 같은 이벤트가 반복되는 경우"가 자동으로 걸러진다.
  const eventKey = `reservation_${reservationId}_approved_${event.id}`;

  await sendReservationStatusEmail({ eventKey, type: '확정', reservation: after, reservationId });
});

// 관리자 전용 테스트 이메일 발송 (관리자 화면에서 호출할 콜러블 함수)
exports.sendTestEmail = onCall(async (request) => {
  const callerEmail = request.auth && request.auth.token && request.auth.token.email;
  if (!(await isAdminEmail(callerEmail))) {
    throw new HttpsError('permission-denied', '관리자만 사용할 수 있습니다.');
  }

  const to = ((request.data && request.data.to) || callerEmail || '').trim().toLowerCase();
  if (!isValidEmail(to)) throw new HttpsError('invalid-argument', '올바른 이메일 주소가 아닙니다.');

  const sample = {
    managerName: '테스트 담당자', type: '테스트 기관', room: '505호', date: '2026-08-06',
    start: '10:00', end: '12:00', purpose: '이메일 발송 테스트', recurType: null,
  };
  const content = renderReservationEmail('확정', sample);
  const eventKey = `test_${request.auth.uid}_${Date.now()}`;
  const logRef = await claimEmailEvent(eventKey, {
    reservationId: null, emailType: 'test', recipient: to, recipientType: 'admin',
  });

  try {
    const result = await sendEmail({ to, subject: `[테스트] ${content.subject}`, html: content.html, text: content.text });
    if (logRef) await markSent(logRef, result && result.id);
    return { ok: true };
  } catch (err) {
    console.error('test email send error:', err.message || err);
    if (logRef) await markFailed(logRef, err);
    throw new HttpsError('internal', '이메일 발송에 실패했습니다: ' + (err.message || err));
  }
});
