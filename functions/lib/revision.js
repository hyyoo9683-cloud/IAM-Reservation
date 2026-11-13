// 예약 변경 이력(reservationRevisions) 기록용 비교 유틸.
// 예약이 수정·삭제될 때 "변경 전 값"을 남겨 두고, 관리자가 화면에서 되돌릴 수 있게 한다.

// 바뀌어도 이력을 남기지 않는 필드(처리 로그·처리 시각처럼 매번 같이 바뀌는 것들)
const IGNORED_FIELDS = ['history', 'processedAt', 'updatedAt'];

// 이력 화면에 보여줄 요약 필드(삭제된 예약 목록에서도 무엇이었는지 알 수 있게)
const SUMMARY_FIELDS = ['room', 'date', 'start', 'end', 'purpose', 'type', 'status', 'managerName', 'stewardName', 'recurGroup', 'recurType'];

function norm(v) {
  if (v === undefined) return '__undef__';
  if (v && typeof v.toMillis === 'function') return { __ts: v.toMillis() };
  if (Array.isArray(v)) return v.map(norm);
  if (v && typeof v === 'object') {
    const o = {};
    Object.keys(v).sort().forEach((k) => { o[k] = norm(v[k]); });
    return o;
  }
  return v;
}
const same = (a, b) => JSON.stringify(norm(a)) === JSON.stringify(norm(b));

// 수정 전·후 데이터에서 바뀐 필드만 [{k, from, to, fromMissing, toMissing}]로 돌려줌
function diffReservation(before, after) {
  const keys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
  const out = [];
  keys.forEach((k) => {
    if (IGNORED_FIELDS.includes(k)) return;
    const b = (before || {})[k], a = (after || {})[k];
    if (same(b, a)) return;
    out.push({
      k,
      from: b === undefined ? null : b,
      to: a === undefined ? null : a,
      fromMissing: b === undefined,
      toMissing: a === undefined,
    });
  });
  return out;
}

function summarize(data) {
  const out = {};
  SUMMARY_FIELDS.forEach((k) => { if (data && data[k] !== undefined) out[k] = data[k]; });
  return out;
}

module.exports = { IGNORED_FIELDS, diffReservation, summarize };
