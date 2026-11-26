// 로비 키오스크(주차 등록) 판정 로직 — Firestore 없이 테스트할 수 있게 순수 함수로 분리
// 쓰는 곳: functions/index.js의 kioskMeetings / kioskVerify, tests/kiosk-logic.test.mjs
const crypto = require('crypto');

const KIOSK_DEFAULTS = {
  enabled: true,
  mode: 'iframe',      // 'iframe'(키오스크 화면 안에 열기) | 'redirect'(같은 창으로 이동)
  beforeMin: 30,       // 시작 몇 분 전부터
  afterMin: 120,       // 종료 몇 분 후까지 (주차 할인 적용 시간 — 종료 후 2시간)
  failLimit: 5,        // 연속 실패 몇 번에 잠글지
  lockMin: 5,          // 잠금 시간(분)
  counselEnabled: true, // 상담실(502~504호) 자유 등록 사용 여부
  counselDailyCap: 10,  // 상담실 호실마다 하루 등록 상한(0이면 제한 없음)
};
// 상담실 — 예약을 확인하지 않고 담당 목회자 성함만 적어 등록하는 공간(2026-11-26). 호실 선택 화면의 맨 아래 '상담실' 묶음
const COUNSEL_ROOMS = ['502호', '503호', '504호'];
function isCounselRoom(name) { return COUNSEL_ROOMS.includes(String(name || '').trim()); }
// 키오스크 대상에서 제외하는 공간 — 지혜홀(숙박 전용, 하루 종일 열려 있음), 아이엠홀(공연장, 2026-11-25 사용자 요청), 아론홀(2026-11-26 사용자 요청 — 세미나실은 샤론홀만)
const EXCLUDED_ROOMS = ['지혜홀', '아이엠홀', '아론홀'];

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
    counselEnabled: c.counselEnabled !== false,
    counselDailyCap: num(c.counselDailyCap, KIOSK_DEFAULTS.counselDailyCap, 0, 200),
    counselPastors: cleanPastorList(c.counselPastors),
    counselSpouses: cleanPastorList(c.counselSpouses),
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

// 지금 이용 가능한 확정 모임이 있는 호실 이름들 — 호실 선택 화면에서 예약이 없는 호실을 연하게 보여주기 위함(모임명·청지기는 포함하지 않음)
function activeRoomNames(reservations, now, cfg) {
  const set = new Set();
  (reservations || []).forEach((r) => { if (isKioskRoom(r.room) && isUsableNow(r, now, cfg)) set.add(String(r.room).trim()); });
  return Array.from(set).sort((a, b) => roomRank(a) - roomRank(b) || a.localeCompare(b, 'ko'));
}

function meetingTitle(res) {
  return String(res.showName || res.purpose || res.type || '모임').slice(0, 60);
}

// 청지기 이름은 앞 글자만 보이게(예: 김**) — 고른 호실의 모임 목록에만 내려감
function maskName(name) {
  const s = String(name || '').trim();
  if (!s) return '';
  return s.slice(0, 1) + '*'.repeat(Math.max(1, Math.min(3, s.length - 1)));
}

// 모임 목록 정렬 — 5층 소그룹실(505~511호)을 호수 순으로 먼저, 그 밖의 공간(아론홀·샤론홀 등)은 뒤에 이름순, 같은 공간이면 시작 시간순
function roomRank(room) {
  const m = /^(\d{3})호$/.exec(String(room || '').trim());
  return m ? Number(m[1]) : 100000;
}
function compareMeetings(a, b) {
  const ra = roomRank(a.room), rb = roomRank(b.room);
  if (ra !== rb) return ra - rb;
  if (ra === 100000) {
    const c = String(a.room || '').localeCompare(String(b.room || ''), 'ko');
    if (c) return c;
  }
  return String(a.start || '').localeCompare(String(b.start || '')) || String(a.name || '').localeCompare(String(b.name || ''), 'ko');
}

// 호실 선택 화면에 보일 수 있는 공간인지 — 제외 공간·로비·탕비실·테라스는 빼고, 호실 이름이 비어 있으면 뺌
function isKioskRoom(name) {
  const n = String(name || '').trim();
  return !!n && !EXCLUDED_ROOMS.includes(n) && !isCounselRoom(n) && !/로비|탕비실|테라스/.test(n);
}
// 공간 관리(spaces)에 등록된 이름이 없을 때 쓰는 기본 호실 목록
const FALLBACK_ROOMS = ['505호', '506호', '507호', '508호', '509호', '510호', '511호', '샤론홀'];
function roomChoices(names) {
  const set = new Set((names || []).map(n => String(n || '').trim()).filter(isKioskRoom));
  const list = set.size ? Array.from(set) : FALLBACK_ROOMS.slice();
  return list.sort((a, b) => roomRank(a) - roomRank(b) || a.localeCompare(b, 'ko'));
}

// 담당 목회자 성함 정리·검사 — 한글·영문·공백·점만, 2~20자(숫자·기호·태그는 거부)
function cleanPastorName(v) {
  const s = String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
  return /^[가-힣A-Za-z·. ]{2,20}$/.test(s) ? s : '';
}

// 관리자가 등록하는 상담실 담당 목회자 명단 — 배열 또는 줄바꿈·쉼표로 나눈 문자열, 잘못된 이름·중복은 버리고 최대 100명
function cleanPastorList(raw) {
  const arr = Array.isArray(raw) ? raw : String(raw == null ? '' : raw).split(/[\n,]/);
  const out = [];
  arr.forEach((v) => { const n = cleanPastorName(v); if (n && !out.includes(n)) out.push(n); });
  return out.slice(0, 100);
}

// 입력한 성함이 어느 명단에 있는지 — '목회자'·'사모님', 둘 다 비어 있으면 명단 검사를 안 함('' 반환, ok=true), 명단은 있는데 없으면 ok=false
function counselRoleOf(cfg, name) {
  const pastors = cfg.counselPastors || [], spouses = cfg.counselSpouses || [];
  if (!pastors.length && !spouses.length) return { ok: true, role: '' };
  if (pastors.includes(name)) return { ok: true, role: '목회자' };
  if (spouses.includes(name)) return { ok: true, role: '사모님' };
  return { ok: false, role: '' };
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
  meetingTitle, maskName, last4Digits, keyMatches, isSafeParkingUrl, roomRank, compareMeetings, isKioskRoom, activeRoomNames, roomChoices, FALLBACK_ROOMS, COUNSEL_ROOMS, isCounselRoom, cleanPastorName, cleanPastorList, counselRoleOf,
};
