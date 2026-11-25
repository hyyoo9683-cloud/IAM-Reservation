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

t('기본 설정값', () => { assert.equal(cfg.beforeMin, 30); assert.equal(cfg.afterMin, 30); assert.equal(cfg.failLimit, 5); assert.equal(cfg.lockMin, 5); assert.equal(cfg.mode, 'iframe'); assert.equal(cfg.enabled, true); });
t('설정값 범위 보정', () => { const c = k.normalizeConfig({ beforeMin: 9999, failLimit: 0, lockMin: 'x', mode: 'weird', enabled: false }); assert.equal(c.beforeMin, 240); assert.equal(c.failLimit, 1); assert.equal(c.lockMin, 5); assert.equal(c.mode, 'iframe'); assert.equal(c.enabled, false); });
t('시작 30분 전부터 가능', () => { assert.ok(k.isUsableNow(res(), now(18, 30), cfg)); assert.ok(!k.isUsableNow(res(), now(18, 29), cfg)); });
t('종료 30분 후까지 가능', () => { assert.ok(k.isUsableNow(res(), now(21, 30), cfg)); assert.ok(!k.isUsableNow(res(), now(21, 31), cfg)); });
t('확정이 아니면 불가', () => { for (const s of ['대기', '취소', '반려']) assert.ok(!k.isUsableNow(res({ status: s }), now(19, 30), cfg)); });
t('다른 날짜 예약은 불가', () => assert.ok(!k.isUsableNow(res({ date: '2026-11-26' }), now(19, 30), cfg)));
t('지혜홀(숙박)은 대상 제외', () => assert.ok(!k.isUsableNow(res({ room: '지혜홀', start: '00:00', end: '23:59' }), now(12, 0), cfg)));
t('시간 형식이 이상하면 불가', () => assert.ok(!k.isUsableNow(res({ start: '', end: 'x' }), now(19, 30), cfg)));
t('시간대 설정 변경 반영', () => { const c = k.normalizeConfig({ beforeMin: 0, afterMin: 0 }); assert.ok(!k.isUsableNow(res(), now(18, 59), c)); assert.ok(k.isUsableNow(res(), now(19, 0), c)); assert.ok(k.isUsableNow(res(), now(21, 0), c)); assert.ok(!k.isUsableNow(res(), now(21, 1), c)); });
t('한국 시간 변환(UTC 15:30 = 다음날 00:30)', () => { const n = k.kstNow(Date.UTC(2026, 10, 24, 15, 30)); assert.equal(n.date, '2026-11-25'); assert.equal(n.minutes, 30); });
t('한국 시간 변환(UTC 14:59 = 같은날 23:59)', () => { const n = k.kstNow(Date.UTC(2026, 10, 24, 14, 59)); assert.equal(n.date, '2026-11-24'); assert.equal(n.minutes, 23 * 60 + 59); });
t('연락처 뒤 4자리', () => { assert.equal(k.last4Digits('010-1234-5678'), '5678'); assert.equal(k.last4Digits('01012345678'), '5678'); assert.equal(k.last4Digits('12'), ''); assert.equal(k.last4Digits(''), ''); assert.equal(k.last4Digits(null), ''); });
t('이름 가리기', () => { assert.equal(k.maskName('김철수'), '김○○'); assert.equal(k.maskName('김'), '김○'); assert.equal(k.maskName(''), ''); });
t('모임 제목 우선순위', () => { assert.equal(k.meetingTitle({ showName: '공연', purpose: '목적', type: '기관' }), '공연'); assert.equal(k.meetingTitle({ purpose: '목적', type: '기관' }), '목적'); assert.equal(k.meetingTitle({ type: '기관' }), '기관'); assert.equal(k.meetingTitle({}), '모임'); });
t('기기 키 비교', () => { assert.ok(k.keyMatches('abc', 'abc')); assert.ok(!k.keyMatches('abd', 'abc')); assert.ok(!k.keyMatches('', '')); assert.ok(!k.keyMatches('abc', '')); assert.ok(!k.keyMatches(undefined, 'abc')); assert.ok(!k.keyMatches('abcd', 'abc')); });
t('주차 링크는 https만', () => { assert.ok(k.isSafeParkingUrl('https://a.example/x')); assert.ok(!k.isSafeParkingUrl('http://a.example')); assert.ok(!k.isSafeParkingUrl('javascript:alert(1)')); assert.ok(!k.isSafeParkingUrl('')); });
console.log(`\n${pass}개 통과`);
