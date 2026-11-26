// 키오스크 판정 로직 단위 테스트 — `node tests/kiosk-logic.test.mjs` (에뮬레이터 불필요)
import { createRequire } from 'module';
import assert from 'assert';
const require = createRequire(import.meta.url);
const k = require('../functions/lib/kiosk.js');

let pass = 0;
const t = (name, fn) => { try { fn(); pass++; console.log('✅', name); } catch (e) { console.log('❌', name, e.message); process.exitCode = 1; } };

const cfg = k.normalizeConfig({});
const now = (h, m, date = '2026-11-25') => ({ date, minutes: h * 60 + m });
const res = (o = {}) => ({ status: '확정', room: '505호', date: '2026-11-25', start: '19:00', end: '21:00', ...o });

t('기본 설정값', () => { assert.equal(cfg.beforeMin, 30); assert.equal(cfg.afterMin, 120); assert.equal(cfg.failLimit, 5); assert.equal(cfg.lockMin, 5); assert.equal(cfg.mode, 'iframe'); assert.equal(cfg.enabled, true); });
t('설정값 범위 보정', () => { const c = k.normalizeConfig({ beforeMin: 9999, failLimit: 0, lockMin: 'x', mode: 'weird', enabled: false }); assert.equal(c.beforeMin, 240); assert.equal(c.failLimit, 1); assert.equal(c.lockMin, 5); assert.equal(c.mode, 'iframe'); assert.equal(c.enabled, false); });
t('시작 30분 전부터 가능', () => { assert.ok(k.isUsableNow(res(), now(18, 30), cfg)); assert.ok(!k.isUsableNow(res(), now(18, 29), cfg)); });
t('종료 2시간 후까지 가능', () => { assert.ok(k.isUsableNow(res(), now(23, 0), cfg)); assert.ok(!k.isUsableNow(res(), now(23, 1), cfg)); });
t('확정이 아니면 불가', () => { for (const s of ['대기', '취소', '반려']) assert.ok(!k.isUsableNow(res({ status: s }), now(19, 30), cfg)); });
t('다른 날짜 예약은 불가', () => assert.ok(!k.isUsableNow(res({ date: '2026-11-26' }), now(19, 30), cfg)));
t('지혜홀(숙박)은 대상 제외', () => assert.ok(!k.isUsableNow(res({ room: '지혜홀', start: '00:00', end: '23:59' }), now(12, 0), cfg)));
t('아이엠홀·아론홀은 대상 제외', () => { assert.ok(!k.isUsableNow(res({ room: '아이엠홀' }), now(19, 30), cfg)); assert.ok(!k.isUsableNow(res({ room: '아론홀' }), now(19, 30), cfg)); assert.ok(k.isUsableNow(res({ room: '샤론홀' }), now(19, 30), cfg)); });
t('시간 형식이 이상하면 불가', () => assert.ok(!k.isUsableNow(res({ start: '', end: 'x' }), now(19, 30), cfg)));
t('시간대 설정 변경 반영', () => { const c = k.normalizeConfig({ beforeMin: 0, afterMin: 0 }); assert.ok(!k.isUsableNow(res(), now(18, 59), c)); assert.ok(k.isUsableNow(res(), now(19, 0), c)); assert.ok(k.isUsableNow(res(), now(21, 0), c)); assert.ok(!k.isUsableNow(res(), now(21, 1), c)); });
t('한국 시간 변환(UTC 15:30 = 다음날 00:30)', () => { const n = k.kstNow(Date.UTC(2026, 10, 24, 15, 30)); assert.equal(n.date, '2026-11-25'); assert.equal(n.minutes, 30); });
t('한국 시간 변환(UTC 14:59 = 같은날 23:59)', () => { const n = k.kstNow(Date.UTC(2026, 10, 24, 14, 59)); assert.equal(n.date, '2026-11-24'); assert.equal(n.minutes, 23 * 60 + 59); });
t('연락처 뒤 4자리', () => { assert.equal(k.last4Digits('010-1234-5678'), '5678'); assert.equal(k.last4Digits('01012345678'), '5678'); assert.equal(k.last4Digits('12'), ''); assert.equal(k.last4Digits(''), ''); assert.equal(k.last4Digits(null), ''); });
t('이름 가리기', () => { assert.equal(k.maskName('김철수'), '김**'); assert.equal(k.maskName('김'), '김*'); assert.equal(k.maskName(''), ''); });
t('모임 제목 우선순위', () => { assert.equal(k.meetingTitle({ showName: '공연', purpose: '목적', type: '기관' }), '공연'); assert.equal(k.meetingTitle({ purpose: '목적', type: '기관' }), '목적'); assert.equal(k.meetingTitle({ type: '기관' }), '기관'); assert.equal(k.meetingTitle({}), '모임'); });
t('기기 키 비교', () => { assert.ok(k.keyMatches('abc', 'abc')); assert.ok(!k.keyMatches('abd', 'abc')); assert.ok(!k.keyMatches('', '')); assert.ok(!k.keyMatches('abc', '')); assert.ok(!k.keyMatches(undefined, 'abc')); assert.ok(!k.keyMatches('abcd', 'abc')); });
t('주차 링크는 https만', () => { assert.ok(k.isSafeParkingUrl('https://a.example/x')); assert.ok(!k.isSafeParkingUrl('http://a.example')); assert.ok(!k.isSafeParkingUrl('javascript:alert(1)')); assert.ok(!k.isSafeParkingUrl('')); });
t('정렬: 505~511호 호수 순 → 그 밖의 공간은 뒤(이름순)', () => {
  const list = [{ room: '샤론홀', start: '10:00', name: 'a' }, { room: '511호', start: '09:00', name: 'a' }, { room: '505호', start: '19:00', name: 'a' }, { room: '아론홀', start: '10:00', name: 'a' }, { room: '508호', start: '10:00', name: 'a' }, { room: '506호', start: '10:00', name: 'a' }];
  assert.deepEqual(list.sort(k.compareMeetings).map(x => x.room), ['505호', '506호', '508호', '511호', '샤론홀', '아론홀'].sort((a, b) => k.roomRank(a) - k.roomRank(b) || a.localeCompare(b, 'ko')));
  assert.deepEqual(list.slice(0, 4).map(x => x.room), ['505호', '506호', '508호', '511호']);
});
t('정렬: 같은 호실은 시작 시간순', () => { const l = [{ room: '505호', start: '19:00', name: 'b' }, { room: '505호', start: '10:00', name: 'a' }]; assert.deepEqual(l.sort(k.compareMeetings).map(x => x.start), ['10:00', '19:00']); });
t('호실 목록: 제외 공간·로비·탕비실·테라스를 빼고 중복 없이 호수 순', () => assert.deepEqual(k.roomChoices(['아론홀', '샤론홀', '511호', '505호', '1층 로비', '5층 탕비실', '야외테라스', '지혜홀', '아이엠홀', '505호', '', null]), ['505호', '511호', '샤론홀']));
t('호실 목록: 등록된 이름이 없으면 기본 목록(505~511호·샤론홀)', () => assert.deepEqual(k.roomChoices([]), ['505호', '506호', '507호', '508호', '509호', '510호', '511호', '샤론홀']));
t('호실 목록: 제외 공간만 있어도 기본 목록', () => assert.equal(k.roomChoices(['아이엠홀', '지혜홀', '아론홀']).length, 8));
t('상담실: 502~504호만, 일반 호실 목록에서는 빠짐', () => { assert.ok(k.isCounselRoom('502호') && k.isCounselRoom('504호') && !k.isCounselRoom('505호')); assert.deepEqual(k.COUNSEL_ROOMS, ['502호', '503호', '504호']); assert.deepEqual(k.roomChoices(['502호', '503호', '505호', '샤론홀']), ['505호', '샤론홀']); assert.ok(!k.isKioskRoom('503호')); });
t('상담실: 기본 설정(켜짐·하루 10건)과 범위 보정', () => { assert.equal(cfg.counselEnabled, true); assert.equal(cfg.counselDailyCap, 10); const c = k.normalizeConfig({ counselEnabled: false, counselDailyCap: 9999 }); assert.equal(c.counselEnabled, false); assert.equal(c.counselDailyCap, 200); assert.equal(k.normalizeConfig({ counselDailyCap: 0 }).counselDailyCap, 0); });
t('목회자 성함 검사: 한글·영문 2~20자, 공백 정리, 숫자·기호·태그 거부', () => { assert.equal(k.cleanPastorName('  홍   길동 '), '홍 길동'); assert.equal(k.cleanPastorName('John Kim'), 'John Kim'); for (const bad of ['', '홍', '홍1', '<b>홍길동</b>', '홍길동; DROP', 'ㅋ'.repeat(21), null, undefined]) assert.equal(k.cleanPastorName(bad), '', String(bad)); });
t('지금 예약이 있는 호실: 이용 시간대·확정·대상 호실만, 중복 없이 호수 순', () => {
  const list = [res({ room: '506호' }), res({ room: '505호' }), res({ room: '505호', start: '20:00', end: '21:00' }), res({ room: '508호', start: '10:00', end: '11:00' }), res({ room: '샤론홀', status: '대기' }), res({ room: '아론홀' }), res({ room: '아이엠홀' }), res({ room: '502호' }), res({ room: '샤론홀' })];
  assert.deepEqual(k.activeRoomNames(list, now(19, 30), cfg), ['505호', '506호', '샤론홀']);
  assert.deepEqual(k.activeRoomNames([], now(19, 30), cfg), []);
  assert.deepEqual(k.activeRoomNames(null, now(19, 30), cfg), []);
});

t('상담실 명단: 배열·줄바꿈 문자열 모두 정리, 중복·잘못된 이름 제외, 최대 100명', () => { assert.deepEqual(k.cleanPastorList(['홍길동', ' 김  철수 ', '홍길동', '1', '<b>']), ['홍길동', '김 철수']); assert.deepEqual(k.cleanPastorList('홍길동\n김철수, 이영희'), ['홍길동', '김철수', '이영희']); assert.deepEqual(k.cleanPastorList(null), []); assert.equal(k.cleanPastorList(Array.from({ length: 150 }, (_, i) => '가나' + String.fromCharCode(0xAC00 + i))).length, 100); assert.deepEqual(k.normalizeConfig({}).counselPastors, []); assert.deepEqual(k.normalizeConfig({ counselPastors: ['홍길동'] }).counselPastors, ['홍길동']); });
t('상담실 명단: 목회자·사모님 구분 판정(둘 다 비면 검사 안 함)', () => { assert.deepEqual(k.counselRoleOf({}, '아무개'), { ok: true, role: '' }); const c = k.normalizeConfig({ counselPastors: ['홍길동'], counselSpouses: ['박순희'] }); assert.deepEqual(k.counselRoleOf(c, '홍길동'), { ok: true, role: '목회자' }); assert.deepEqual(k.counselRoleOf(c, '박순희'), { ok: true, role: '사모님' }); assert.equal(k.counselRoleOf(c, '이영희').ok, false); assert.deepEqual(k.counselRoleOf(k.normalizeConfig({ counselSpouses: ['박순희'] }), '홍길동'), { ok: false, role: '' }); });
console.log(`\n${pass}개 통과`);
