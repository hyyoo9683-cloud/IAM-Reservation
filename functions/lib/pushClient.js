// 관리자 웹 푸시 알림(FCM) — push.html에서 "이 기기로 알림 받기"를 켠 기기들에 보냄.
// 기기 토큰은 `adminPushTokens` 컬렉션에 저장(Admin SDK 전용 — firestore.rules에 없어서 클라이언트는 접근 불가).
const crypto = require('crypto');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');

const COLLECTION = 'adminPushTokens';
const BASE_URL = process.env.APP_BASE_URL || 'https://iamreservation.web.app';

const docIdFor = (token) => crypto.createHash('sha256').update(token).digest('hex').slice(0, 40);

async function savePushToken(token, { email, userAgent }) {
  const ref = getFirestore().collection(COLLECTION).doc(docIdFor(token));
  const snap = await ref.get();
  await ref.set({
    token,
    email: email || '',
    userAgent: String(userAgent || '').slice(0, 300),
    updatedAt: FieldValue.serverTimestamp(),
    ...(snap.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
  }, { merge: true });
}

async function removePushToken(token) {
  await getFirestore().collection(COLLECTION).doc(docIdFor(token)).delete();
}

async function countPushTokens() {
  const snap = await getFirestore().collection(COLLECTION).get();
  return snap.size;
}

// 등록된 모든 관리자 기기로 발송. 더 이상 유효하지 않은 토큰(앱 삭제·알림 해제 등)은 정리함.
// 반환: { sent, failed, total }  — 등록된 기기가 없으면 total 0
async function sendPushToAdmins({ title, body, link }) {
  const col = getFirestore().collection(COLLECTION);
  const snap = await col.get();
  if (snap.empty) return { sent: 0, failed: 0, total: 0 };

  const docs = snap.docs;
  const tokens = docs.map(d => d.data().token).filter(Boolean);
  const res = await getMessaging().sendEachForMulticast({
    tokens,
    notification: { title, body },
    webpush: {
      headers: { Urgency: 'high' },
      notification: { icon: `${BASE_URL}/push-icon.png`, badge: `${BASE_URL}/push-icon.png` },
      fcmOptions: { link: link || BASE_URL },
    },
  });

  const dead = [];
  const errors = [];
  res.responses.forEach((r, i) => {
    if (r.success) return;
    const code = r.error && r.error.code;
    errors.push({ code: code || 'unknown', message: (r.error && r.error.message) || '' });
    if (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token') {
      dead.push(docs[i].ref);
    } else {
      console.error('푸시 발송 실패:', code, r.error && r.error.message);
    }
  });
  await Promise.all(dead.map(ref => ref.delete().catch(() => {})));
  return { sent: res.successCount, failed: res.failureCount, total: tokens.length, removed: dead.length, errors };
}

// "[새 예약 신청]\n505호 · …\n신청자: …" 형식의 카카오 문구를 제목(첫 줄)+본문으로 나눔
function splitPushText(text) {
  const lines = String(text || '').split('\n');
  return { title: lines[0] || '아이엠센터 알림', body: lines.slice(1).join('\n') || ' ' };
}

module.exports = { savePushToken, removePushToken, countPushTokens, sendPushToAdmins, splitPushText };
