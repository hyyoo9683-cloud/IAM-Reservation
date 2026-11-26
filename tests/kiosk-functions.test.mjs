// kioskMeetings / kioskVerify 통합 테스트 — Firestore 에뮬레이터 필요: `cd tests && npm run test:kiosk`
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8085';
process.env.GCLOUD_PROJECT = 'demo-iam';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
// 시각 고정: 한국 시간 2026-11-25 19:30 (= UTC 10:30)
const FIXED = Date.UTC(2026, 10, 25, 10, 30);
const realNow = Date.now; Date.now = () => FIXED;
const fnRequire = createRequire(new URL('../functions/index.js', import.meta.url));
const { getFirestore } = fnRequire('firebase-admin/firestore');
const fns = require('../functions/index.js');
Date.now = realNow;
const db = getFirestore();

let pass = 0, fail = 0;
const ok = (name, c) => { if (c) { pass++; console.log('✅', name); } else { fail++; console.log('❌', name); } };
const call = async (fn, data) => { Date.now = () => FIXED; try { return { r: await fns[fn].run({ data, auth: null, rawRequest: {} }) }; } catch (e) { return { e }; } finally { Date.now = realNow; } };

const KEY = 'test-key-123';
await db.doc('system/kioskConfig').set({ key: KEY, parkingUrl: 'https://parking.example/discount/secret', mode: 'iframe', beforeMin: 30, afterMin: 30, failLimit: 3, lockMin: 5 });
const mk = (id, o) => db.doc('reservations/' + id).set({ status: '확정', room: '505호', date: '2026-11-25', start: '19:00', end: '21:00', purpose: '수요성경공부', stewardName: '김철수', stewardTel: '010-1234-5678', ...o });
await mk('r1', {});
await mk('r2', { room: '508호', purpose: '청년부', start: '14:00', end: '16:00', stewardTel: '010-9999-4821' });   // 시간 지남
await mk('r3', { room: '아론홀', purpose: '대기건', status: '대기' });
await mk('r4', { room: '샤론홀', purpose: '내일', date: '2026-11-26' });
await mk('r5', { room: '506호', purpose: '연락처없음', stewardTel: '' });
await mk('r7', { room: '아이엠홀', purpose: '공연', stewardTel: '010-0000-1111' });
await mk('r6', { room: '507호', purpose: '곧 시작', start: '19:55', end: '21:00', stewardTel: '010-0000-7777' });

await db.doc('spaces/s1').set({ name: '505호' }); await db.doc('spaces/s2').set({ name: '아론홀' }); await db.doc('spaces/s3').set({ name: '아이엠홀' });
await db.doc('spaces/s4').set({ name: '5층 탕비실' }); await db.doc('spaces/s5').set({ name: '지혜홀' }); await db.doc('spaces/s6').set({ name: '511호' });
await mk('r8', { room: '505호', purpose: '두 번째 모임', start: '20:00', end: '21:00', stewardTel: '010-0000-2222' });

let x = await call('kioskMeetings', { key: 'wrong', room: '505호' });
ok('잘못된 기기 키는 거부', x.e && x.e.code === 'permission-denied');
x = await call('kioskMeetings', { room: '505호' });
ok('키가 없으면 거부', x.e && x.e.code === 'permission-denied');
x = await call('kioskRooms', { key: 'wrong' });
ok('호실 목록도 키가 없으면 거부', x.e && x.e.code === 'permission-denied');
x = await call('kioskRooms', { key: KEY });
ok('호실 목록: 공간 관리 이름에서 제외 공간(아이엠홀·지혜홀·탕비실) 빼고 호수 순', x.r && JSON.stringify(x.r.rooms) === JSON.stringify(['505호', '511호', '아론홀']));
ok('호실 목록에 모임·사용 중 여부가 포함되지 않음', x.r && !JSON.stringify(x.r).includes('수요성경공부') && Object.keys(x.r).sort().join() === 'afterMin,rooms');
x = await call('kioskMeetings', { key: KEY });
ok('호실 없이 모임 목록 요청은 거부', x.e && x.e.code === 'invalid-argument');
x = await call('kioskMeetings', { key: KEY, room: '505호' });
ok('505호: 이 호실의 이용 가능 모임만(시간순 2건)', x.r && JSON.stringify(x.r.meetings.map(m => m.name)) === JSON.stringify(['수요성경공부', '두 번째 모임']));
ok('응답에 다른 호실의 모임·청지기 이름·연락처가 없음', x.r && !JSON.stringify(x.r).includes('연락처없음') && !JSON.stringify(x.r).includes('곧 시작') && !JSON.stringify(x.r).includes('김') && !JSON.stringify(x.r).includes('1234') && !JSON.stringify(x.r).includes('5678'));
ok('서버가 종료 후 허용 시간(afterMin)을 함께 내려줌', x.r.afterMin === 30);
x = await call('kioskMeetings', { key: KEY, room: '506호' });
ok('506호: 연락처 없는 예약도 목록에는 나옴', x.r && x.r.meetings.length === 1 && x.r.meetings[0].name === '연락처없음');
x = await call('kioskMeetings', { key: KEY, room: '508호' });
ok('508호: 시간이 지난 모임은 안 나옴', x.r && x.r.meetings.length === 0);
x = await call('kioskMeetings', { key: KEY, room: '아론홀' });
ok('아론홀: 대기 상태 예약은 안 나옴', x.r && x.r.meetings.length === 0);
x = await call('kioskMeetings', { key: KEY, room: '샤론홀' });
ok('샤론홀: 다른 날짜 예약은 안 나옴', x.r && x.r.meetings.length === 0);
x = await call('kioskMeetings', { key: KEY, room: '아이엠홀' });
ok('아이엠홀을 직접 요청해도 비어 있음', x.r && x.r.meetings.length === 0);
x = await call('kioskMeetings', { key: KEY, room: '지혜홀' });
ok('지혜홀을 직접 요청해도 비어 있음', x.r && x.r.meetings.length === 0);

x = await call('kioskVerify', { key: 'wrong', reservationId: 'r1', last4: '5678' });
ok('verify: 잘못된 키 거부', x.e && x.e.code === 'permission-denied');
x = await call('kioskVerify', { key: KEY, reservationId: 'r1', last4: '12' });
ok('verify: 4자리가 아니면 거부', x.e && x.e.code === 'invalid-argument');
x = await call('kioskVerify', { key: KEY, reservationId: 'r2', last4: '4821' });
ok('verify: 시간이 지난 모임은 맞는 번호여도 거부', x.e && x.e.code === 'failed-precondition');
x = await call('kioskVerify', { key: KEY, reservationId: 'r3', last4: '5678' });
ok('verify: 대기 상태 모임 거부', x.e && x.e.code === 'failed-precondition');
x = await call('kioskVerify', { key: KEY, reservationId: 'r4', last4: '5678' });
ok('verify: 다른 날짜 모임 거부', x.e && x.e.code === 'failed-precondition');
x = await call('kioskVerify', { key: KEY, reservationId: 'nope', last4: '5678' });
ok('verify: 없는 예약 거부', x.e && x.e.code === 'failed-precondition');
x = await call('kioskVerify', { key: KEY, reservationId: 'r7', last4: '1111' });
ok('verify: 아이엠홀 예약은 맞는 번호여도 거부', x.e && x.e.code === 'failed-precondition' && !x.r);
x = await call('kioskVerify', { key: KEY, reservationId: 'r5', last4: '0000' });
ok('verify: 청지기 연락처 없는 예약은 거부(링크 안 줌)', x.e && x.e.code === 'failed-precondition' && !x.r);

x = await call('kioskVerify', { key: KEY, reservationId: 'r1', last4: '0000' });
ok('verify: 틀린 번호 1회 → permission-denied(1/3)', x.e && x.e.code === 'permission-denied' && /1\/3/.test(x.e.message));
ok('verify: 틀렸을 때 링크가 응답·오류에 없음', !JSON.stringify(x).includes('parking.example'));
x = await call('kioskVerify', { key: KEY, reservationId: 'r1', last4: '1111' });
ok('verify: 틀린 번호 2회', x.e && x.e.code === 'permission-denied' && /2\/3/.test(x.e.message));
x = await call('kioskVerify', { key: KEY, reservationId: 'r1', last4: '2222' });
ok('verify: 3회째에 잠김(resource-exhausted)', x.e && x.e.code === 'resource-exhausted');
x = await call('kioskVerify', { key: KEY, reservationId: 'r1', last4: '5678' });
ok('verify: 잠긴 동안은 맞는 번호도 거부', x.e && x.e.code === 'resource-exhausted' && !x.r);
x = await call('kioskVerify', { key: KEY, reservationId: 'r6', last4: '7777' });
ok('verify: 다른 모임은 잠금 영향 없음 → 성공 + 링크', x.r && x.r.ok && x.r.url === 'https://parking.example/discount/secret' && x.r.mode === 'iframe');

await db.doc('kioskAttempts/r1').set({ fails: 0, lockUntil: 0 });
x = await call('kioskVerify', { key: KEY, reservationId: 'r1', last4: '5678' });
ok('verify: 맞는 번호 → 성공', x.r && x.r.ok === true);
const logs = (await db.collection('parkingLogs').get()).docs.map(d => d.data());
ok('기록: 열림 2건', logs.filter(l => l.result === '열림').length === 2);
ok('기록: 불일치·잠김·연락처 없음 남음', logs.some(l => /불일치/.test(l.result)) && logs.some(l => l.result === '잠김') && logs.some(l => l.result === '연락처 없음'));
ok('기록에 주차 링크·연락처 저장 안 됨', !JSON.stringify(logs).includes('parking.example') && !JSON.stringify(logs).includes('5678'));

await db.doc('system/kioskConfig').set({ enabled: false }, { merge: true });
x = await call('kioskMeetings', { key: KEY });
ok('끔 상태면 점검 안내(failed-precondition)', x.e && x.e.code === 'failed-precondition');
await db.doc('system/kioskConfig').set({ enabled: true, parkingUrl: 'http://insecure.example' }, { merge: true });
await db.doc('kioskAttempts/r6').set({ fails: 0, lockUntil: 0 });
x = await call('kioskVerify', { key: KEY, reservationId: 'r6', last4: '7777' });
ok('https가 아닌 링크는 내주지 않음', x.e && x.e.code === 'failed-precondition' && !JSON.stringify(x.e.message).includes('insecure'));

console.log(`\n결과: ${pass}개 통과, ${fail}개 실패`);
process.exit(fail ? 1 : 0);
