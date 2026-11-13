const { onDocumentCreated, onDocumentUpdated, onDocumentWritten } = require('firebase-functions/v2/firestore');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const { renderReservationEmail } = require('./lib/templates');
const {
  summarizeReservationGroup,
  renderNewReservationEmail, renderChangeRequestEmail, renderVenueRequestEmail,
  renderNewReservationPushText, renderChangeRequestPushText, renderVenueRequestPushText,
} = require('./lib/adminNotify');
const { sendEmail } = require('./lib/resendClient');
const { claimEmailEvent, markSent, markFailed, markSkipped } = require('./lib/emailLog');
const { toPublicReservation, PUBLIC_MIRROR_VERSION } = require('./lib/publicReservation');
const { diffReservation, summarize } = require('./lib/revision');
const { savePushToken, removePushToken, countPushTokens, sendPushToAdmins, splitPushText } = require('./lib/pushClient');

initializeApp();

// index.html의 ADMIN_EMAILS와 동일 (클라이언트에도 공개된 값이라 그대로 복제해도 안전)
const ADMIN_EMAILS = ['hyyoo9683@gmail.com'];
// 새 신청 접수 알림(아래 onReservationCreated 등)을 받을 주소 — 필요하면 GitHub Secret
// ADMIN_NOTIFY_EMAIL로 다른 주소를 지정할 수 있고, 지정하지 않으면 주 관리자 이메일로 감
const ADMIN_NOTIFY_EMAIL = process.env.ADMIN_NOTIFY_EMAIL || ADMIN_EMAILS[0];

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
// 이메일·웹 푸시 두 채널을 서로 독립적으로 시도 — 한쪽이 실패해도 다른 쪽 발송에는 영향 없음.
// eventKey가 claimEmailEvent로 멱등 처리되어 재시도로 인한 중복 발송은 자동으로 막힘
// (채널마다 별도 키를 써서 독립적으로 멱등 처리).
async function notifyAdmin({ eventKey, emailType, content, pushText }) {
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

  // 웹 푸시 — push.html에서 알림을 켠 기기가 있을 때만 의미 있음(없으면 발송 없이 끝남)
  if (pushText && pushText.text) {
    const pushLogRef = await claimEmailEvent(`${eventKey}_push`, {
      reservationId: null, emailType: `${emailType}_push`, recipient: 'push:admin', recipientType: 'admin',
    });
    if (pushLogRef) {
      try {
        const { title, body } = splitPushText(pushText.text);
        const r = await sendPushToAdmins({ title, body, link: pushText.linkUrl });
        if (r.total === 0) await markSkipped(pushLogRef, '푸시를 켠 기기 없음');
        else await markSent(pushLogRef, null);
      } catch (err) {
        console.error(`${emailType} 푸시 알림 발송 실패:`, err.message || err);
        await markFailed(pushLogRef, err);
      }
    }
  }
}

// 새 예약 신청('대기' 상태로 생성)이 들어오면 관리자에게 즉시 알림.
// 관리자가 "+ 예약 추가"로 직접 등록한 건(보통 바로 '확정')은 신청이 아니라 제외.
// 정기 예약처럼 한 번의 신청으로 회차마다 문서가 여러 개 생성되는 경우 회차 수만큼 알림이
// 가는 것은 onReservationUpdated의 승인 메일과 같은 알려진 범위 제한(시리즈 단위 묶음 미구현).
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 같은 recurGroup 문서가 더 늘지 않을 때까지(4초 간격으로 2번 연속 같은 개수) 기다렸다가 전부 읽음 —
// 클라이언트가 회차마다 문서를 하나씩 순서대로 만들기 때문에 첫 문서가 생긴 직후엔 아직 일부만 있음(최대 약 48초)
async function collectSettledGroup(recurGroup) {
  const col = getFirestore().collection('reservations');
  let prev = -1, stable = 0, docs = [];
  for (let i = 0; i < 12; i++) {
    const snap = await col.where('recurGroup', '==', recurGroup).get();
    docs = snap.docs.map((d) => d.data());
    if (docs.length === prev) { stable += 1; if (stable >= 2) break; } else { stable = 0; prev = docs.length; }
    await sleep(4000);
  }
  return docs;
}

exports.onReservationCreated = onDocumentCreated({ document: 'reservations/{id}', timeoutSeconds: 120 }, async (event) => {
  const data = event.data.data();
  if (data.status !== '대기') return;

  const reservationId = event.params.id;

  // 정기·비정기 예약은 신청 한 번에 회차마다 문서가 만들어지므로, 가장 먼저 잠금을 잡은 문서 하나만
  // 알림을 맡고(나머지는 그냥 종료) 전체 회차를 모아서 신청 단위로 한 번만 알림 — 이메일·푸시 공통
  if (data.recurGroup) {
    const lock = await claimEmailEvent(`reservation_group_${data.recurGroup}_lock`, {
      reservationId, emailType: 'new_reservation_group_lock', recipient: '-', recipientType: 'admin',
    });
    if (!lock) return;
    try {
      const summary = summarizeReservationGroup(await collectSettledGroup(data.recurGroup));
      await notifyAdmin({
        eventKey: `reservation_group_${data.recurGroup}_new`, emailType: 'new_reservation',
        content: renderNewReservationEmail(summary), pushText: renderNewReservationPushText(summary),
      });
      await markSent(lock, null);
    } catch (err) {
      console.error('정기 예약 묶음 알림 실패:', err.message || err);
      await markFailed(lock, err);
    }
    return;
  }
  const eventKey = `reservation_${reservationId}_new_${event.id}`;
  await notifyAdmin({
    eventKey, emailType: 'new_reservation',
    content: renderNewReservationEmail(data), pushText: renderNewReservationPushText(data),
  });
});

// 예약 변경·취소 신청(reservation-change.html)이 접수되면 관리자에게 즉시 알림.
exports.onChangeRequestCreated = onDocumentCreated('changeRequests/{id}', async (event) => {
  const data = event.data.data();
  const eventKey = `changereq_${event.params.id}_new_${event.id}`;
  await notifyAdmin({
    eventKey, emailType: 'new_change_request',
    content: renderChangeRequestEmail(data), pushText: renderChangeRequestPushText(data),
  });
});

// 대관 신청(venue-apply.html)이 접수되면 관리자에게 즉시 알림.
exports.onVenueRequestCreated = onDocumentCreated('venue_requests/{id}', async (event) => {
  const data = event.data.data();
  const eventKey = `venuereq_${event.params.id}_new_${event.id}`;
  await notifyAdmin({
    eventKey, emailType: 'new_venue_request',
    content: renderVenueRequestEmail(data), pushText: renderVenueRequestPushText(data),
  });
});

// push.html(알림 설정)의 "테스트 메일 보내기" — 실제 알림과 같은 경로(ADMIN_NOTIFY_EMAIL)로 보내 보고
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

// ─────────────────────────────────────────────────────────────
// 웹 푸시(FCM) 관리자 알림 — push.html에서 기기별로 켜고 끔
// ─────────────────────────────────────────────────────────────
async function requireAdminCaller(request) {
  const callerEmail = request.auth && request.auth.token && request.auth.token.email;
  if (!(await isAdminEmail(callerEmail))) {
    throw new HttpsError('permission-denied', '관리자만 사용할 수 있습니다.');
  }
  return callerEmail;
}

exports.registerAdminPushToken = onCall(async (request) => {
  const email = await requireAdminCaller(request);
  const token = request.data && request.data.token;
  if (typeof token !== 'string' || token.length < 20 || token.length > 4096) {
    throw new HttpsError('invalid-argument', '알림 토큰이 올바르지 않습니다.');
  }
  await savePushToken(token, { email, userAgent: request.data.userAgent });
  return { ok: true };
});

exports.unregisterAdminPushToken = onCall(async (request) => {
  await requireAdminCaller(request);
  const token = request.data && request.data.token;
  if (typeof token !== 'string' || !token) throw new HttpsError('invalid-argument', '알림 토큰이 없습니다.');
  await removePushToken(token);
  return { ok: true };
});

exports.sendTestPush = onCall(async (request) => {
  await requireAdminCaller(request);
  try {
    const r = await sendPushToAdmins({
      title: '[테스트] 웹 푸시 알림', body: '알림이 정상적으로 도착했습니다.', link: `${process.env.APP_BASE_URL || 'https://iamreservation.web.app'}/push.html`,
    });
    if (r.total === 0) throw new HttpsError('failed-precondition', '알림을 켠 기기가 없습니다. 먼저 이 기기에서 "알림 켜기"를 눌러 주시기 바랍니다.');
    // 실패한 기기가 있으면 사유(오류 코드)를 함께 돌려줘서 push.html에서 원인을 바로 볼 수 있게 함
    return { ok: true, ...r, devices: await countPushTokens() };
  } catch (err) {
    if (err instanceof HttpsError) throw err;
    console.error('테스트 푸시 발송 실패:', err.message || err);
    throw new HttpsError('internal', '푸시 발송에 실패했습니다: ' + (err.message || err));
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

// ─────────────────────────────────────────────────────────────
// 예약 변경 이력 (reservationRevisions) — 잘못 수정·삭제했을 때 되돌리기 위한 기록
// 예약이 수정되거나 삭제될 때마다 "변경 전 값"을 남긴다(어느 화면·경로에서 바꿨든 서버가 기록).
//  · 수정: 바뀐 필드만 changes[]에 {k, from, to, fromMissing, toMissing}로 기록 (history·processedAt만 바뀐 건 제외)
//  · 삭제: 문서 전체(before)를 기록 → 화면에서 같은 id로 다시 만들 수 있음
// 클라이언트는 관리자만 읽을 수 있고 쓸 수 없다(firestore.rules). 이력은 지우지 않는다.
// ─────────────────────────────────────────────────────────────
exports.recordReservationRevision = onDocumentWritten('reservations/{id}', async (event) => {
  const before = event.data && event.data.before;
  if (!before || !before.exists) return; // 새로 만든 예약은 기록하지 않음
  const after = event.data.after;
  const isDelete = !after || !after.exists;
  const b = before.data();
  const changes = isDelete ? [] : diffReservation(b, after.data());
  if (!isDelete && !changes.length) return;
  await getFirestore().collection('reservationRevisions').doc(event.id).set({
    reservationId: event.params.id,
    kind: isDelete ? '삭제' : '수정',
    changedAt: FieldValue.serverTimestamp(),
    summary: summarize(b),
    recurGroup: b.recurGroup || '',
    ...(isDelete ? { before: b } : { changes }),
  });
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
