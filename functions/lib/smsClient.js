// 알리고(Aligo) 문자 발송 — https://smartsms.aligo.in/smsapi.html
// 키·아이디·발신번호는 GitHub Secret(ALIGO_KEY / ALIGO_USER_ID / ALIGO_SENDER) → functions/.env 로 전달됨.
// 알리고는 호출 서버 IP를 미리 등록해야 하는 방식이라, 등록 안 된 IP에서는 인증 오류가 나올 수 있음.
const ALIGO_KEY = process.env.ALIGO_KEY;
const ALIGO_USER_ID = process.env.ALIGO_USER_ID;
const ALIGO_SENDER = process.env.ALIGO_SENDER;

const digits = (s) => String(s || '').replace(/\D/g, '');

function isSmsConfigured() {
  return !!(ALIGO_KEY && ALIGO_USER_ID && ALIGO_SENDER);
}

// SMS는 90바이트(한글 2바이트 기준)까지, 넘으면 LMS로 보냄
function byteLength(text) {
  let n = 0;
  for (const ch of String(text)) n += ch.charCodeAt(0) < 128 ? 1 : 2;
  return n;
}

async function sendSms({ to, text }) {
  if (!isSmsConfigured()) throw new Error('알리고 문자 설정(ALIGO_KEY·ALIGO_USER_ID·ALIGO_SENDER)이 없습니다.');
  const receiver = digits(to);
  if (receiver.length < 10) throw new Error('수신 번호가 올바르지 않습니다.');

  const isLong = byteLength(text) > 90;
  const params = new URLSearchParams({
    key: ALIGO_KEY,
    user_id: ALIGO_USER_ID,
    sender: digits(ALIGO_SENDER),
    receiver,
    msg: text,
    msg_type: isLong ? 'LMS' : 'SMS',
    testmode_yn: 'N',
  });
  if (isLong) params.set('title', '[아이엠센터]');

  const res = await fetch('https://apis.aligo.in/send/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
    body: params,
  });
  const data = await res.json().catch(() => ({}));
  // 알리고는 성공 시 result_code가 1
  if (String(data.result_code) !== '1') {
    throw new Error(`알리고 오류(${data.result_code ?? res.status}): ${data.message || '응답 없음'}`);
  }
  return data;
}

module.exports = { sendSms, isSmsConfigured, digits };
