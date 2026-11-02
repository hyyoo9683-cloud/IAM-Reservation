// 아이엠센터 홈페이지 — Firebase 공통 초기화 (예약 시스템과 같은 프로젝트·로그인·데이터 사용)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js';
import {
  getFirestore, collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js';

export const app = initializeApp({
  apiKey:            'AIzaSyCSHQFknw_hsxNMCvrBDer3z0cB4mG347w',
  authDomain:        'iamreservation.firebaseapp.com',
  projectId:         'iamreservation',
  storageBucket:     'iamreservation.firebasestorage.app',
  messagingSenderId: '634977833386',
  appId:             '1:634977833386:web:043a9acab5b2b229f75bd3',
});
export const db = getFirestore(app);
export {
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, serverTimestamp,
};

// 관리자 = 주 관리자 이메일 또는 Firestore admins 컬렉션 등록 계정 (firestore.rules isAdmin()과 동일)
export const ADMIN_EMAILS = ['hyyoo9683@gmail.com'];
export async function isAdminAccount(email) {
  if (!email) return false;
  if (ADMIN_EMAILS.includes(email)) return true;
  try { return (await getDoc(doc(db, 'admins', email))).exists(); } catch (_) { return false; }
}

// 로그인·사진 업로드는 관리자만 쓰므로 필요할 때만 불러온다 (방문자 페이지를 가볍게 유지)
let _auth = null;
export async function authApi() {
  if (_auth) return _auth;
  const m = await import('https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js');
  _auth = { ...m, auth: m.getAuth(app) };
  return _auth;
}
let _st = null;
export async function storageApi() {
  if (_st) return _st;
  const m = await import('https://www.gstatic.com/firebasejs/11.0.0/firebase-storage.js');
  _st = { ...m, storage: m.getStorage(app) };
  return _st;
}

// 이미지 업로드: 긴 변 1920px 이하 JPEG로 줄여서 site/homepage/ 아래에 저장 → 공개 URL 반환
// 파일 이름이 매번 새로 생기므로(같은 주소의 내용이 바뀌는 일 없음) 브라우저가 1년 동안 저장해 두고 다시 받지 않게 함
export const LONG_CACHE = 'public, max-age=31536000, immutable';
export async function uploadImage(file, folder = 'site/homepage') {
  const blob = await shrinkImage(file, 1920, 0.82);
  const { storage, ref, uploadBytes, getDownloadURL } = await storageApi();
  const path = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
  const snap = await uploadBytes(ref(storage, path), blob, { contentType: 'image/jpeg', cacheControl: LONG_CACHE });
  return getDownloadURL(snap.ref);
}
// 예전에 올린 사진(저장 안 함 설정)에 '1년 저장' 설정을 붙임 — 사진 파일 자체는 그대로, 설정만 바꿈.
// 관리자가 편집 모드를 열 때 한 번씩 실행(이미 바꾼 주소는 이 브라우저에 기억해 두고 건너뜀). 권한이 없는 사진은 조용히 넘어감
export async function fixImageCache(urls) {
  let done = [];
  try { done = JSON.parse(localStorage.getItem('iamImgCacheFixed') || '[]'); } catch (_) { /* 무시 */ }
  const todo = [...new Set(urls)].filter(u => /^https:\/\/firebasestorage\.googleapis\.com\//.test(u) && !done.includes(u));
  if (!todo.length) return 0;
  const { storage, ref, getMetadata, updateMetadata } = await storageApi();
  let n = 0;
  for (const u of todo) {
    try {
      const r = ref(storage, u);
      const md = await getMetadata(r);
      if (md.cacheControl !== LONG_CACHE) { await updateMetadata(r, { cacheControl: LONG_CACHE }); n++; }
      done.push(u);
    } catch (e) { console.warn('사진 저장 설정 실패', u, e?.code || e); }
  }
  try { localStorage.setItem('iamImgCacheFixed', JSON.stringify(done.slice(-500))); } catch (_) { /* 무시 */ }
  return n;
}
function shrinkImage(file, maxSide, quality) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, maxSide / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob(b => b ? resolve(b) : reject(new Error('이미지 변환 실패')), 'image/jpeg', quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('이미지를 읽을 수 없습니다')); };
    img.src = url;
  });
}
