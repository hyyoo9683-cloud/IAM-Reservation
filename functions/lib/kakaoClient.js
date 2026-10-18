const { getFirestore, FieldValue } = require('firebase-admin/firestore');

// 카카오 "나에게 보내기"(관리자 본인 카카오톡 알림) 연동.
// REST API 키는 OAuth client_id로 쓰이는 공개 값(카카오 로그인 공식 문서 기준 비밀값 아님).
// Client Secret은 앱에서 "보안 > Client Secret"을 켰을 때만 필요 — 켜지 않았으면 비워둬도 됨.
const REST_API_KEY = process.env.KAKAO_REST_API_KEY;
const CLIENT_SECRET = process.env.KAKAO_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.KAKAO_REDIRECT_URI || 'https://iamreservation.web.app/kakao-auth-callback.html';

// 토큰은 admins 등 다른 컬렉션과 달리 firestore.rules에 아무 규칙도 추가하지 않아
// 클라이언트에서는 읽기/쓰기 모두 기본 차단(default-deny)됨 — Admin SDK(Cloud Functions)만 접근 가능.
const authDocRef = () => getFirestore().collection('kakaoAuth').doc('admin');

function tokenRequestBody(extra) {
  const params = new URLSearchParams({ client_id: REST_API_KEY, ...extra });
  if (CLIENT_SECRET) params.set('client_secret', CLIENT_SECRET);
  return params;
}

async function requestToken(extra) {
  const res = await fetch('https://kauth.kakao.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
    body: tokenRequestBody(extra),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.error || '카카오 토큰 요청 실패');
  return data;
}

// kakao-auth-callback.html에서 받은 authorization code를 토큰으로 교환해 Firestore에 저장.
async function exchangeCodeForTokens(code) {
  const data = await requestToken({ grant_type: 'authorization_code', redirect_uri: REDIRECT_URI, code });
  await authDocRef().set({
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000, // 1분 여유를 두고 만료 처리
    refreshTokenExpiresAt: data.refresh_token_expires_in
      ? Date.now() + (data.refresh_token_expires_in - 60) * 1000 : null,
    connectedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
}

async function refreshAccessToken(refreshToken) {
  const data = await requestToken({ grant_type: 'refresh_token', refresh_token: refreshToken });
  const update = {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
  // 카카오는 리프레시 토큰을 함께 재발급하는 경우가 있어, 받았을 때만 갱신
  if (data.refresh_token) update.refreshToken = data.refresh_token;
  if (data.refresh_token_expires_in) update.refreshTokenExpiresAt = Date.now() + (data.refresh_token_expires_in - 60) * 1000;
  await authDocRef().set(update, { merge: true });
  return data.access_token;
}

async function getValidAccessToken() {
  const snap = await authDocRef().get();
  if (!snap.exists) throw new Error('카카오 계정이 연결되어 있지 않습니다. kakao-auth.html에서 먼저 연동해 주세요.');
  const d = snap.data();
  if (d.expiresAt && Date.now() < d.expiresAt) return d.accessToken;
  return refreshAccessToken(d.refreshToken);
}

// "나에게 보내기" — 관리자 본인 카카오톡으로 텍스트 템플릿 메시지 전송
async function sendKakaoMemoToMe({ text, linkUrl }) {
  const token = await getValidAccessToken();
  const templateObject = {
    object_type: 'text',
    text,
    link: { web_url: linkUrl, mobile_web_url: linkUrl },
    button_title: '확인하기',
  };
  const res = await fetch('https://kapi.kakao.com/v2/api/talk/memo/default/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
    },
    body: new URLSearchParams({ template_object: JSON.stringify(templateObject) }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.result_code !== 0) {
    throw new Error(data.msg || data.error_description || JSON.stringify(data) || '카카오톡 메시지 발송 실패');
  }
  return data;
}

async function getKakaoAuthStatus() {
  const snap = await authDocRef().get();
  if (!snap.exists) return { connected: false };
  const d = snap.data();
  return { connected: true, connectedAt: d.connectedAt ? d.connectedAt.toMillis() : null };
}

module.exports = { exchangeCodeForTokens, sendKakaoMemoToMe, getKakaoAuthStatus };
