# 아이엠센터 공간 예약 시스템

단일 HTML 파일로 동작하는 Firebase 기반 공간 예약 시스템입니다.  
별도 빌드 없이 `index.html`을 Firebase Hosting 또는 정적 웹 호스팅에 배포하면 됩니다.

---

## 기능

| 구분 | 기능 |
|------|------|
| 공개 | 예약 현황 주별 캘린더 (로그인 없이 조회) |
| 사용자 | Google 로그인, 공간 안내, 예약 신청, 내 예약 조회·수정·취소 |
| 관리자 | 대시보드, 예약 목록 (검색·필터), 승인/반려, 공간 관리, 리포트 |

---

## 빠른 시작

### 1. Firebase 프로젝트 생성

1. [Firebase Console](https://console.firebase.google.com) → **프로젝트 추가**
2. **Authentication** → 로그인 방법 → **Google** 활성화
3. **Firestore Database** → 데이터베이스 만들기 (프로덕션 모드)
4. **Storage** → 시작하기
5. **프로젝트 설정** → 웹 앱 추가 → 구성 값 복사

### 2. Firebase 설정 입력

`index.html` 상단의 `firebaseConfig` 객체에 복사한 값을 붙여넣습니다.

```js
const firebaseConfig = {
  apiKey:            "AIzaSy...",
  authDomain:        "my-project.firebaseapp.com",
  projectId:         "my-project",
  storageBucket:     "my-project.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123456789:web:abc123"
};
```

### 3. 도메인 및 관리자 설정

같은 파일 안의 두 상수를 수정합니다.

```js
// 이 도메인의 Google 계정만 로그인 허용
const ALLOWED_DOMAIN = "suwoncca.org";

// 관리자 권한을 부여할 이메일 목록
const ADMIN_EMAILS = ["admin@suwoncca.org"];
```

### 4. Firestore 보안 규칙 설정

Firebase Console → Firestore → **규칙** 탭에 아래 규칙을 적용합니다.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // 공간 정보: 누구나 읽기, 관리자만 쓰기
    match /spaces/{id} {
      allow read: if true;
      allow write: if request.auth != null
                   && request.auth.token.email in ["admin@suwoncca.org"];
    }

    // 예약: 인증된 도메인 사용자만 읽기/생성
    //       본인 예약 또는 관리자만 수정/삭제
    match /reservations/{id} {
      allow read: if request.auth != null
                  && request.auth.token.email.matches(".*@suwoncca\\.org");
      allow create: if request.auth != null
                    && request.auth.token.email.matches(".*@suwoncca\\.org");
      allow update, delete: if request.auth != null
                    && (request.auth.token.email == resource.data.userEmail
                        || request.auth.token.email in ["admin@suwoncca.org"]);
    }
  }
}
```

### 5. Storage 보안 규칙 설정

Firebase Console → Storage → **규칙** 탭:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /spaces/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null
                   && request.auth.token.email in ["admin@suwoncca.org"];
    }
  }
}
```

### 6. 배포

```bash
# Firebase Hosting 사용 시
npm install -g firebase-tools
firebase login
firebase init hosting   # public 디렉터리: . (현재 폴더)
firebase deploy
```

또는 Nginx, Apache, Vercel, Netlify 등 정적 파일 서버에 `index.html`만 올리면 됩니다.

---

## 파일 구조

```
IAM-Reservation/
└── index.html    # 앱 전체 (HTML + CSS + JS)
```

---

## 기본 제공 공간

초기 실행 시 Firestore가 비어있으면 아래 8개 공간이 자동 생성됩니다.

| 공간 | 층 | 수용 인원 |
|------|----|----------|
| 아론홀 | 2층 | 200명 |
| 505호 | 5층 | 25명 |
| 506호 | 5층 | 25명 |
| 507호 | 5층 | 25명 |
| 508호 | 5층 | 25명 |
| 509호 | 5층 | 25명 |
| 510호 | 5층 | 25명 |
| 511호 | 5층 | 25명 |

공간은 관리자 → **공간 관리** 메뉴에서 추가·편집·삭제할 수 있습니다.

---

## 사용 흐름

```
로그인 (Google, @suwoncca.org 계정)
  ├─ 일반 사용자
  │    ├─ 공간 안내 → 공간 상세 확인
  │    ├─ 예약 현황 → 주별 캘린더
  │    ├─ 예약 신청 → 작성 → 제출 (상태: 대기)
  │    └─ 내 예약  → 수정 / 취소 (대기 상태만)
  └─ 관리자
       ├─ 대시보드 → 대기 예약 원클릭 승인/반려
       ├─ 예약 목록 → 검색·필터·수정·삭제
       ├─ 공간 관리 → 추가·편집·사진 업로드·삭제
       └─ 리포트   → 연·월별 공간·기관 통계
```
