const { Resend } = require('resend');

// 도메인 인증 전까지는 Resend 테스트 발신 주소 사용. suwoncca.org(서브도메인) 인증 완료 후
// RESEND_FROM_EMAIL 환경변수로 교체 (예: "IAM Center 예약시스템 <noreply@mail.suwoncca.org>").
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'IAM Center 예약시스템 <onboarding@resend.dev>';

async function sendEmail({ to, subject, html, text }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY가 설정되지 않았습니다.');

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({ from: FROM_EMAIL, to, subject, html, text });
  if (error) throw new Error(typeof error === 'string' ? error : (error.message || JSON.stringify(error)));
  return data; // { id: providerMessageId }
}

module.exports = { sendEmail };
