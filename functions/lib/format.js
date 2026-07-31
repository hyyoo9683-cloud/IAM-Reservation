const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

// 예약 date는 'YYYY-MM-DD' 형태의 순수 달력 문자열(타임존 정보 없음)이라,
// 로컬 타임존에 영향받는 new Date(dateStr) 파싱 대신 Date.UTC로 요일만 뽑아낸다.
function formatKoreanDate(dateStr) {
  if (!dateStr) return '';
  const m = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return dateStr;
  const [, y, mo, d] = m;
  const weekday = WEEKDAYS[new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d))).getUTCDay()];
  return `${Number(y)}년 ${Number(mo)}월 ${Number(d)}일(${weekday})`;
}

function formatTimeRange(start, end) {
  if (!start && !end) return '';
  if (!end) return start;
  return `${start} ~ ${end}`;
}

module.exports = { formatKoreanDate, formatTimeRange };
