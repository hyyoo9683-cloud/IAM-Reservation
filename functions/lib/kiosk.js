// 로비 키오스크(주차 등록) 판정 로직 — Firestore 없이 테스트할 수 있게 순수 함수로 분리
// 쓰는 곳: functions/index.js의 kioskMeetings / kioskVerify, tests/kiosk-logic.test.mjs
const crypto = require('crypto');

const KIOSK_DEFAULTS = {
  enabled: true,
  mode: 'iframe',      // 'iframe'(키오스크 화면 안에 열기) | 'redirect'(같은 창으로 이동)
  beforeMin: 30,       // 시작 몇 분 전부터
  afterMin: 30,        // 종료 몇 분 후까지
  failLimit: 5,        // 연속 실패 몇 번에 잠글지
  lockMin: 5,          // 잠금 시간(분)
};
// 숙박 전용이라 하루 종일 열려 있는 공간은 키오스크 대상에서 제외
const EXCLUDED_ROOMS = ['지혜홀'];

function num(v, def, min, max) {
  const n = Number(v);
  if (!Number.isFinite(n)) return def;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function normalizeConfig(raw) {
  const c = raw || {};
  return {
    enabled: c.enabled !== false,
    mode: c.mode === 'redirect' ? 'redirect' : 'iframe',
    beforeMin: num(c.beforeMin, KIOSK_DEFAULTS.beforeMin, 0, 240),
    afterMin: num(c.afterMin, KIOSK_DEFAULTS.afterMin, 0, 240),
    failLimit: num(c.failLimit, KIOSK_DEFAULTS.failLimit, 1, 20),
    lockMin: num(c.lockMin, KIOSK_DEFAULTS.lockMin, 1, 120),
    key: typeof c.key === 'string' ? c.key : '',
    parkingUrl: typeof c.parkingUrl === 'string' ? c.parkingUrl.trim() : '',
  };
}

// 한국 시간(UTC+9) 기준 오늘 날짜(YYYY-MM-DD)와 0시부터의 분
function kstNow(nowMs) {
  const d = new Date((nowMs == null ? Date.now() : nowMs) + 9 * 3600 * 1000);
  const p = (n) => String(n).padStart(2, '0');
  return {
    date: `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`,
    minutes: d.getUTCHours() * 60 + d.getUTCMinutes(),
  };
}

function toMin(t) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(t || ''));
  return m ? Number(m[1]) * 60 + Number(m[2]) : NaN;
}

// 지금 시각이 이 예약의 이용 가능 시간대(시작 N분 전 ~ 종료 N분 후)인지
function isUsableNow(res, now, cfg) {
  if (!res || res.status !== '확정') return false;
  if (EXCLUDED_ROOMS.includes(res.room)) return false;
  if (res.date !== now.date) return false;
  const s = toMin(res.start), e = toMin(res.end);
  if (Number.isNaN(s) || Number.isNaN(e)) return false;
  return now.minutes >= s - cfg.beforeMin && now.minutes <= e + cfg.afterMin;
}

function meetingTitle(res) {
  return String(res.showName || res.purpose || res.type || '모임').slice(0, 60);
}

// 청지기 이름은 앞 글자만 보이게(화면에서 다른 모임 청지기 이름이 그대로 노출되지 않도록)
function maskName(name) {
  const s = String(name || '').trim();
  if (!s) return '';
  return s.slice(0, 1) + '○'.repeat(Math.max(1, Math.min(3, s.length - 1)));
}

function last4Digits(tel) {
  const d = String(tel || '').replace(/\D/g, '');
  return d.length >= 4 ? d.slice(-4) : '';
}

// 키 비교 — 길이가 달라도 시간 차이가 나지 않게 해시 후 비교
function keyMatches(given, saved) {
  if (typeof given !== 'string' || typeof saved !== 'string' || !saved || !given) return false;
  const a = crypto.createHash('sha256').update(given).digest();
  const b = crypto.createHash('sha256').update(saved).digest();
  return crypto.timingSafeEqual(a, b);
}

// 주차 링크는 https 주소만 허용(관리자가 잘못 붙여 넣은 값이 그대로 이동에 쓰이는 것 방지)
function isSafeParkingUrl(u) {
  try { const x = new URL(u); return x.protocol === 'https:'; } catch (_) { return false; }
}

module.exports = {
  KIOSK_DEFAULTS, EXCLUDED_ROOMS, normalizeConfig, kstNow, toMin, isUsableNow,
  meetingTitle, maskName, last4Digits, keyMatches, isSafeParkingUrl,
};
