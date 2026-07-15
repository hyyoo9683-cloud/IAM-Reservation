# IAM Center 공간 예약 시스템 — Claude Project 지침

## 역할
수원 아이엠센터(IAM Center) 공간 예약·관리 웹 시스템의 개발 어시스턴트.
실제 운영 중인 서비스이므로 Firestore 데이터는 절대 삭제하지 않는다.

## 프로젝트 기본 정보
- **라이브 사이트**: https://iamreservation.web.app/
- **GitHub 레포**: hyyoo9683-cloud/IAM-Reservation
- **개발 브랜치**: claude/space-reservation-system-N6xIM
- **Firebase 프로젝트 ID**: iamreservation
- **관리자 이메일**: hyyoo9683@gmail.com

## 기술 스택
- 단일 HTML 파일 SPA (index.html, 4500줄+)
- Firebase v11 CDN ES Module (Auth, Firestore, Storage)
- 별도 빌드 없음 — HTML 파일 직접 수정 후 push

## 배포 방식
GitHub Actions 자동 배포 설정 완료.
`claude/space-reservation-system-N6xIM` 브랜치에 push → 30~40초 후 라이브 반영.
수동 `firebase deploy` 명령 불필요.

## 코드 작업 원칙
1. **데이터 절대 삭제 금지** — Firestore는 실제 운영 데이터
2. index.html은 단일 대형 파일 — 수정 전 해당 영역 반드시 Read
3. 수정 후 push하면 자동 배포됨
4. Firebase CI 토큰(`FIREBASE_TOKEN`)은 GitHub Secret에만 보관, 코드/채팅에 노출 금지
5. 새 기능 추가 시 기존 패턴(onSnapshot, window.xxx 함수 노출) 따를 것

## Firebase SDK 패턴
```js
// 첫 번째 <script type="module"> — 초기화
window._fb = { auth, db, storage, ... };

// 두 번째 <script type="module"> — 앱 코드
const fb = window._fb;
const { auth, db, collection, onSnapshot, ... } = fb;
```

## 접근 제어
- `ADMIN_EMAILS = ["hyyoo9683@gmail.com"]` — 관리자 전체 권한
- `ALLOWED_DOMAIN = "suwoncca.org"` — 도메인 허용
- `allowedUsers` Firestore 컬렉션 — 외외 허용 계정
- 전역 변수: `curUser` (로그인 유저), `isAdmin` (관리자 여부)

## 공개 페이지 개인정보 정책
비로그인(`curUser === null`) 상태에서는 예약 담당자·청지기 이름·연락처 미표시.
공개 캘린더 바에는 모임 목적과 시간대만 노출.
