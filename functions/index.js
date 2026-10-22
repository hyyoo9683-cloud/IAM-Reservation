const { onDocumentCreated, onDocumentUpdated, onDocumentWritten } = require('firebase-functions/v2/firestore');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const { renderReservationEmail } = require('./lib/templates');
const {
  renderNewReservationEmail, renderChangeRequestEmail, renderVenueRequestEmail,
  renderNewReservationKakaoText, renderChangeRequestKakaoText, renderVenueRequestKakaoText,
  renderNewReservationSmsText, renderChangeRequestSmsText, renderVenueRequestSmsText,
} = require('./lib/adminNotify');
const { sendEmail } = require('./lib/resendClient');
const { claimEmailEvent, markSent, markFailed, markSkipped } = require('./lib/emailLog');
const { toPublicReservation, PUBLIC_MIRROR_VERSION } = require('./lib/publicReservation');
const { exchangeCodeForTokens, sendKakaoMemoToMe, getKakaoAuthStatus } = require('./lib/kakaoClient');
const { sendSms, isSmsConfigured, digits } = require('./lib/smsClient');

initializeApp();

// index.html의 ADMIN_EMAILS와 동일 (클라이언트에도 공개된 값이라 그대로 복제해도 안전)
const ADMIN_EMAILS = ['hyyoo9683@gmail.com'];
// 새 신청 접수 알림(아래 onReservationCreated 등)을 받을 주소 — 필요하면 GitHub Secret
// ADMIN_NOTIFY_EMAIL로 다른 주소를 지정할 수 있고, 지정하지 않으면 주 관리자 이메일로 감
const ADMIN_NOTIFY_EMAIL = process.env.ADMIN_NOTIFY_EMAIL || ADMIN_EMAILS[0];
// 문자(SMS) 알림을 받을 관리자 휴대폰 번호 — 비워두면 문자 알림은 보내지 않음(알리고 설정도 함께 있어야 동작)
const ADMIN_NOTIFY_PHONE = digits(process.env.ADMIN_NOTIFY_PHONE);

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

// 관리자에게 새 신청 접수(예약·변경취소·대관)를 알리는 공통 발송 로직.
// 이메일·카카오톡 두 채널을 서로 독립적으로 시도 — 한쪽이 실패(예: 카카오 미연동)해도
// 다른 쪽 발송에는 영향 없음. eventKey가 claimEmailEvent로 멱등 처리되어 재시도로 인한
// 중복 발송은 자동으로 막힘(채널마다 별도 키를 써서 독립적으로 멱등 처리).
async function notifyAdmin({ eventKey, emailType, content, kakaoText, smsText }) {
  const logRef = await claimEmailEvent(eventKey, {
    reservationId: null, emailType, recipient: ADMIN_NOTIFY_EMAIL, recipientType: 'admin',
  });
  if (logRef) {
    try {
      const result = await sendEmail({ to: ADMIN_NOTIFY_EMAIL, subject: content.subject, html: content.html, text: content.text });
      await markSent(logRef, result && result.id);
    } catch (err) {
      console.error(`${emailType} 알림 메일 발송 실패:`, err.message || err);
      await markFailed(logRef, err);
    }
  }

  if (kakaoText) {
    const kakaoLogRef = await claimEmailEvent(`${eventKey}_kakao`, {
      reservationId: null, emailType: `${emailType}_kakao`, recipient: 'kakao:self', recipientType: 'admin',
    });
    if (kakaoLogRef) {
      try {
        await sendKakaoMemoToMe(kakaoText);
        await markSent(kakaoLogRef, null);
      } catch (err) {
        // 카카오 미연동·토큰 만료 등으로 실패해도 로그만 남기고 조용히 넘어감 — 다른 채널은 별도로 처리됨
        console.error(`${emailType} 카카오 알림 발송 실패:`, err.message || err);
        await markFailed(kakaoLogRef, err);
      }
    }
  }

  // 문자는 번호와 알리고 설정이 모두 있을 때만 시도(설정 전에 실패 기록이 쌓이지 않게)
  if (smsText && ADMIN_NOTIFY_PHONE && isSmsConfigured()) {
    const smsLogRef = await claimEmailEvent(`${eventKey}_sms`, {
      reservationId: null, emailType: `${emailType}_sms`, recipient: 'sms:admin', recipientType: 'admin',
    });
    if (smsLogRef) {
      try {
        await sendSms({ to: ADMIN_NOTIFY_PHONE, text: smsText });
        await markSent(smsLogRef, null);
      } catch (err) {
        console.error(`${emailType} 문자 알림 발송 실패:`, err.message || err);
        await markFailed(smsLogRef, err);
      }
    }
  }
}

// 새 예약 신청('대기' 상태로 생성)이 들어오면 관리자에게 즉시 알림.
// 관리자가 "+ 예약 추가"로 직접 등록한 건(보통 바로 '확정')은 신청이 아니라 제외.
// 정기 예약처럼 한 번의 신청으로 회차마다 문서가 여러 개 생성되는 경우 회차 수만큼 알림이
// 가는 것은 onReservationUpdated의 승인 메일과 같은 알려진 범위 제한(시리즈 단위 묶음 미구현).
exports.onReservationCreated = onDocumentCreated('reservations/{id}', async (event) => {
  const data = event.data.data();
  if (data.status !== '대기') return;

  const reservationId = event.params.id;
  const eventKey = `reservation_${reservationId}_new_${event.id}`;
  await notifyAdmin({
    eventKey, emailType: 'new_reservation',
    content: renderNewReservationEmail(data), kakaoText: renderNewReservationKakaoText(data),
    smsText: renderNewReservationSmsText(data),
  });
});

// 예약 변경·취소 신청(reservation-change.html)이 접수되면 관리자에게 즉시 알림.
exports.onChangeRequestCreated = onDocumentCreated('changeRequests/{id}', async (event) => {
  const data = event.data.data();
  const eventKey = `changereq_${event.params.id}_new_${event.id}`;
  await notifyAdmin({
    eventKey, emailType: 'new_change_request',
    content: renderChangeRequestEmail(data), kakaoText: renderChangeRequestKakaoText(data),
    smsText: renderChangeRequestSmsText(data),
  });
});

// 대관 신청(venue-apply.html)이 접수되면 관리자에게 즉시 알림.
exports.onVenueRequestCreated = onDocumentCreated('venue_requests/{id}', async (event) => {
  const data = event.data.data();
  const eventKey = `venuereq_${event.params.id}_new_${event.id}`;
  await notifyAdmin({
    eventKey, emailType: 'new_venue_request',
    content: renderVenueRequestEmail(data), kakaoText: renderVenueRequestKakaoText(data),
    smsText: renderVenueRequestSmsText(data),
  });
});

// ─────────────────────────────────────────────────────────────
// 카카오톡 "나에게 보내기" 연동 (관리자 알림용)
// ─────────────────────────────────────────────────────────────

// kakao-auth-callback.html이 인가 코드를 받으면 호출 — 토큰으로 교환해 Firestore에 저장
exports.exchangeKakaoAuthCode = onCall(async (request) => {
  const callerEmail = request.auth && request.auth.token && request.auth.token.email;
  if (!(await isAdminEmail(callerEmail))) {
    throw new HttpsError('permission-denied', '관리자만 사용할 수 있습니다.');
  }
  const code = request.data && request.data.code;
  if (!code) throw new HttpsError('invalid-argument', '인가 코드(code)가 없습니다.');

  try {
    await exchangeCodeForTokens(code);
    return { ok: true };
  } catch (err) {
    console.error('카카오 인가 코드 교환 실패:', err.message || err);
    throw new HttpsError('internal', '카카오 연동에 실패했습니다: ' + (err.message || err));
  }
});

// kakao-auth.html이 연동 상태(연결 여부)를 표시할 때 호출
exports.getKakaoAuthStatusCallable = onCall(async (request) => {
  const callerEmail = request.auth && request.auth.token && request.auth.token.email;
  if (!(await isAdminEmail(callerEmail))) {
    throw new HttpsError('permission-denied', '관리자만 사용할 수 있습니다.');
  }
  return getKakaoAuthStatus();
});

// kakao-auth.html의 "테스트 메일 보내기" — 실제 알림과 같은 경로(ADMIN_NOTIFY_EMAIL)로 보내 보고
// 실패하면 Resend 오류 사유를 그대로 돌려줌 (API 키 누락·테스트 모드 수신자 제한 등 원인 파악용)
exports.sendTestAdminEmail = onCall(async (request) => {
  const callerEmail = request.auth && request.auth.token && request.auth.token.email;
  if (!(await isAdminEmail(callerEmail))) {
    throw new HttpsError('permission-denied', '관리자만 사용할 수 있습니다.');
  }
  const content = renderNewReservationEmail({
    type: '테스트 기관', room: '505호', date: '2026-11-01', start: '10:00', end: '12:00',
    purpose: '알림 메일 테스트', managerName: '테스트', stewardName: '테스트', stewardTel: '010-0000-0000',
  });
  try {
    await sendEmail({ to: ADMIN_NOTIFY_EMAIL, subject: `[테스트] ${content.subject}`, html: content.html, text: content.text });
    return { ok: true, to: ADMIN_NOTIFY_EMAIL };
  } catch (err) {
    console.error('관리자 테스트 메일 발송 실패:', err.message || err);
    throw new HttpsError('internal', `${ADMIN_NOTIFY_EMAIL} 로 발송 실패: ${err.message || err}`);
  }
});

// kakao-auth.html의 "테스트 문자 보내기" — 알리고 키·발신번호·서버 IP 등록이 제대로 됐는지 바로 확인
// (실제 문자 1건이 발송되어 요금이 부과됨. 실패하면 알리고 오류 사유를 그대로 돌려줌)
exports.sendTestSmsMessage = onCall(async (request) => {
  const callerEmail = request.auth && request.auth.token && request.auth.token.email;
  if (!(await isAdminEmail(callerEmail))) {
    throw new HttpsError('permission-denied', '관리자만 사용할 수 있습니다.');
  }
  if (!ADMIN_NOTIFY_PHONE) throw new HttpsError('failed-precondition', '수신 번호(ADMIN_NOTIFY_PHONE)가 설정되지 않았습니다.');
  if (!isSmsConfigured()) throw new HttpsError('failed-precondition', '알리고 설정(ALIGO_KEY·ALIGO_USER_ID·ALIGO_SENDER)이 설정되지 않았습니다.');
  try {
    await sendSms({ to: ADMIN_NOTIFY_PHONE, text: '[아이엠센터] 문자 알림 테스트입니다.' });
    return { ok: true, to: `${ADMIN_NOTIFY_PHONE.slice(0, 3)}-****-${ADMIN_NOTIFY_PHONE.slice(-4)}` };
  } catch (err) {
    console.error('테스트 문자 발송 실패:', err.message || err);
    throw new HttpsError('internal', err.message || String(err));
  }
});

// kakao-auth.html의 "테스트 메시지 보내기" — 실제 신청을 기다리지 않고 연동이 잘 됐는지 바로 확인
exports.sendTestKakaoMessage = onCall(async (request) => {
  const callerEmail = request.auth && request.auth.token && request.auth.token.email;
  if (!(await isAdminEmail(callerEmail))) {
    throw new HttpsError('permission-denied', '관리자만 사용할 수 있습니다.');
  }
  try {
    await sendKakaoMemoToMe({
      text: '[테스트] 카카오톡 알림 연동이 정상적으로 완료되었습니다.',
      linkUrl: 'https://iamreservation.web.app',
    });
    return { ok: true };
  } catch (err) {
    console.error('카카오 테스트 메시지 발송 실패:', err.message || err);
    throw new HttpsError('internal', '테스트 메시지 발송에 실패했습니다: ' + (err.message || err));
  }
});

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

// ─────────────────────────────────────────────────────────────
// 공개용 예약 사본 (publicReservations)
// 원본 reservations에는 이름·연락처·이메일이 들어 있어 관리자·본인만 읽을 수 있게 하고,
// 공개 캘린더·주간 현황 등은 개인정보를 뺀 이 사본을 읽는다. 문서 id는 원본과 동일.
// ─────────────────────────────────────────────────────────────
exports.mirrorPublicReservation = onDocumentWritten('reservations/{id}', async (event) => {
  const ref = getFirestore().collection('publicReservations').doc(event.params.id);
  const after = event.data && event.data.after;
  if (!after || !after.exists) {
    await ref.delete();
    return;
  }
  await ref.set(toPublicReservation(after.data()));
});

// 전체 재생성: 관리자가 system/publicMirrorRequest 문서를 쓰면 실행됨
// (index.html이 관리자 로그인 시 system/publicMirror 버전을 확인해 필요할 때만 자동 요청)
exports.rebuildPublicReservations = onDocumentWritten(
  { document: 'system/publicMirrorRequest', timeoutSeconds: 540, memory: '512MiB' },
  async (event) => {
    const after = event.data && event.data.after;
    if (!after || !after.exists) return;
    const db = getFirestore();
    const statusRef = db.collection('system').doc('publicMirror');
    await statusRef.set({ state: 'running', startedAt: FieldValue.serverTimestamp() }, { merge: true });

    const [src, pub] = await Promise.all([
      db.collection('reservations').get(),
      db.collection('publicReservations').select().get(),
    ]);
    const writer = db.bulkWriter();
    const ids = new Set();
    src.forEach((d) => {
      ids.add(d.id);
      writer.set(db.collection('publicReservations').doc(d.id), toPublicReservation(d.data()));
    });
    let removed = 0;
    pub.forEach((d) => {
      if (!ids.has(d.id)) { writer.delete(d.ref); removed++; }
    });
    await writer.close();

    await statusRef.set({
      state: 'done',
      version: PUBLIC_MIRROR_VERSION,
      count: ids.size,
      removed,
      finishedAt: FieldValue.serverTimestamp(),
      requestedBy: (after.data() || {}).by || '',
    }, { merge: true });
  }
);
