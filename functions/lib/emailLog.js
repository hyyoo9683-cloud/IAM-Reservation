const { getFirestore, FieldValue } = require('firebase-admin/firestore');

// emailLogs 문서 ID = eventKey로 고정해, 동일 이벤트가 재실행(Cloud Functions 재시도 등)되어도
// ref.create()가 두 번째 시도에서 ALREADY_EXISTS로 실패하며 자연스럽게 중복 발송을 막는다.
async function claimEmailEvent(eventKey, meta) {
  const ref = getFirestore().collection('emailLogs').doc(eventKey);
  try {
    await ref.create({
      eventKey,
      retryCount: 0,
      ...meta,
      status: 'pending',
      createdAt: FieldValue.serverTimestamp(),
    });
    return ref;
  } catch (err) {
    if (err.code === 6) return null; // ALREADY_EXISTS — 이미 처리(또는 처리 중)된 이벤트
    throw err;
  }
}

async function markSent(ref, providerMessageId) {
  await ref.update({
    status: 'sent',
    sentAt: FieldValue.serverTimestamp(),
    providerMessageId: providerMessageId || null,
  });
}

async function markFailed(ref, err) {
  await ref.update({
    status: 'failed',
    failedAt: FieldValue.serverTimestamp(),
    errorMessage: String((err && err.message) || err).slice(0, 500),
  });
}

async function markSkipped(ref, reason) {
  await ref.update({ status: 'skipped', errorMessage: reason });
}

module.exports = { claimEmailEvent, markSent, markFailed, markSkipped };
