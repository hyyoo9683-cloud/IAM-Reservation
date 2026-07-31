# IAM Center 공간 예약 시스템

## 프로젝트 개요
수원 아이엠센터(IAM Center)의 공간 예약·관리 시스템. 단일 HTML 파일 기반 SPA + Firebase.

- **라이브 사이트**: https://iamreservation.web.app/
- **Firebase 프로젝트**: `iamreservation`
- **GitHub 레포**: `hyyoo9683-cloud/IAM-Reservation`
- **개발 브랜치**: `claude/space-reservation-system-N6xIM`

## 배포
코드를 브랜치에 push하면 **GitHub Actions가 자동으로 Firebase Hosting + Firestore 규칙 + Cloud Functions에 배포**함 (30~40초 소요).
수동 배포 명령어는 더 이상 필요 없음.

## 파일 구조
| 파일 | 역할 |
|------|------|
| `index.html` | 메인 앱 (4500줄+, 관리자+일반 사용자 SPA) |
| `cal.html` | 내부용 예약 현황 캘린더 |
| `cal-public.html` | 공개 예약 현황 캘린더 |
| `checkout.html` | 퇴실 체크리스트 (누구나 제출 가능) |
| `checkouts.html` | 퇴실 체크 이력 (로그인 필요) |
| `notice.html` | 공지사항 관리 (로그인 필요) |
| `notices-public.html` | 공지사항 공개 페이지 |
| `portal.html` | 인트라넷 포털 |
| `quotation.html` | 견적서 발급 |
| `venue.html` | 대관 신청 관리 |
| `event-checklist.html` | 행사 체크리스트 작성·관리 (로그인 필요) |
| `checklist-view.html` | 체크리스트 단건 보기/체크 (대시보드에서 연결, 로그인 필요) |
| `weekly-calendar.html` | 전체 예약 현황 (일간: 5층 소그룹실/아론홀/샤론홀/아이엠홀/지혜홀 분류 후 시간순 / 주간: 아론홀·샤론홀·아이엠홀만 요일별 목록, 클릭 시 상세) |
| `weekly-manager.html` | 예약현황(예약책임자별) — `?admin=1` 파라미터로 접속해야 관리자 전체 표/저장 노출. 파라미터 없이(공유용 링크) 접속 시 이름 검색 전에는 아무 예약도 안 보임 (본인 이름 검색 시에만 해당 예약 표시) |
| `jihye-apply.html` | 지혜홀(숙박) 신청 페이지 (셀프 신청 아님, 상담 후 관리자가 링크 개별 전달) |
| `firestore.rules` | Firestore 보안 규칙 |
| `functions/index.js` | Cloud Functions — 예약 상태 변경(확정/취소) 시 Resend로 이메일 발송 |
| `.github/workflows/deploy.yml` | 자동 배포 워크플로우 (hosting + firestore rules + functions) |

## Firebase SDK
CDN ES Module 방식 (v11). `index.html` 첫 번째 `<script type="module">` 에서 초기화 후 `window._fb`에 저장.
두 번째 스크립트에서 `const fb = window._fb; const { auth, db, ... } = fb;` 로 사용.

## Firestore 컬렉션
| 컬렉션 | 내용 |
|--------|------|
| `reservations` | 예약 데이터 (주요) |
| `spaces` | 공간 정보 |
| `blockedDates` | 차단일 |
| `orgs` | 기관 분류 (부모/자식 구조, `parentId` 필드) |
| `adminNotes` | 관리자 메모 |
| `notices` | 공지사항 |
| `quotations` | 견적서 |
| `venue_requests` | 대관 신청 |
| `checkouts` | 퇴실 체크 기록 |
| `allowedUsers` | 외부 허용 사용자 |

## 예약 데이터 구조 (`reservations`)
```
{
  type: '기관명',           // 기관 분류
  subOrg: '세부기관',       // 세부 기관 (선택)
  managerName: '담당자',    // 예약 담당자
  stewardName: '청지기',    // 실사용자
  stewardTel: '연락처',
  room: '505호',            // 공간명
  date: '2025-01-15',       // YYYY-MM-DD
  start: '09:00',
  end: '11:00',
  people: 10,
  purpose: '소그룹 모임',   // 사용 목적 (자유 텍스트)
  status: '확정',           // '대기' | '확정' | '반려' | '취소'
  recurGroup: 'uuid',       // 정기 예약 그룹 ID (단일 예약은 없음)
  recurType: '매주',        // 정기 유형
  history: [{time, msg}],   // 처리 이력

  // room === '아이엠홀'일 때만 사용하는 공연장 전용 세부사항 (선택)
  showName: '공연명',
  rehearsalStart: '13:00', rehearsalEnd: '14:00',
  audienceCount: 200,       // 예상 관객 수 (people과 별개 — people은 신청 폼의 예상 인원)
  roomsUsed: '대기실, 분장실',
  parking: '차량 3대',
  etcNote: '기타 특이사항',
}
```

## 주요 함수 위치 (index.html)
- `noConflict(room, date, start, end, skipId, confirmedOnly)` — 충돌 체크
- `classifyPurpose(purpose, room, org)` — 사용 목적 자동 분류
- `renderPubCal()` — 공개 캘린더 렌더링
- `renderReport()` — 리포트 페이지 렌더링
- `openEditModal(id)` — 예약 수정 모달 열기
- `openDetail(id)` — 예약 상세 팝업
- `submitEdit()` — 예약 수정 저장 (allSeries 모드 포함)
- `go(page)` — SPA 페이지 이동
- `renderMemo()` — 관리자 메모 페이지 렌더링

## 정기 예약 (allSeries) 처리
- `recurGroup` 필드로 같은 시리즈 예약들이 연결됨
- 수정 모달에서 "전체 N회 모두 수정" 체크박스(`e-all-series`) 선택 시 allSeries 모드
- "적용 시작일"(`e-series-from-date`, 기본값 현재 수정 중인 회차의 날짜)을 지정하면 그 이전 회차는 그대로 두고 이후 회차만 수정됨 (예: 6/6~10/17 시리즈에서 7/25부터만 공간·시간 변경)
- `dateDeltaMs`로 날짜 이동 delta 계산, `getEffDate(x)`로 각 건의 이동된 날짜 반환
- 충돌되는 건은 제외하고 가능한 건만 업데이트, 충돌 건은 모달로 안내
- 대안 공간 추천 기능 포함

## 접근 제어
- `ADMIN_EMAILS = ["hyyoo9683@gmail.com"]` — 관리자
- `ALLOWED_DOMAIN = "suwoncca.org"` — 허용 도메인
- `allowedUsers` 컬렉션 — 외부 허용 계정
- `curUser` (로그인 객체), `isAdmin` (관리자 여부) — 전역 변수

## 셀프 예약 불가 공간 (아이엠홀·지혜홀)
- `index.html`의 `SELF_SERVICE_EXCLUDED_ROOMS = ['아이엠홀', '지혜홀']` — 일반 사용자 예약 신청 칩(`buildRoomChips()`)에서 제외됨
- 관리자 전용 예약 등록·수정 모달(`editChipsHtml()`)에는 모든 공간이 그대로 노출되므로, 관리자가 대관 신청·상담 이후 받은 예약을 수동으로 등록 가능
- 아이엠홀: 대관 신청 후 관리자가 직접 예약 등록 (venue.html 연동은 금액/항목 미확정으로 보류)
- 지혜홀(숙박): `jihye-apply.html`에서 신청서 접수 → `venue_requests` 컬렉션에 저장 (venue.html 숙박 항목과 동일한 필드 구조: `dateIn`, `nights`, `rooms`, `eventDate`, `eventName`)
- 두 공간 모두 `spaces` 컬렉션에 문서로 등록되어 있어야 예약 등록이 가능 — **공간 관리(관리자) 페이지에서 관리자가 직접 추가해야 함**
- 예약 목록 페이지의 **"📥 CSV 가져오기"**로 구글 시트 붙여넣기 일괄 등록 가능 (`detectCols()`가 헤더 텍스트로 컬럼 자동 인식). 아이엠홀 세부사항(공연명/행사명, 리허설 시작·종료, 관객 수, 사용하는 실, 주차, 기타) 컬럼도 헤더에 해당 단어가 포함되면 자동 인식되어 함께 저장됨

## 예약 상태 변경 이메일 알림 (Cloud Functions)
- `functions/index.js` — Firestore `reservations` 컬렉션 트리거 (Cloud Functions 2세대)
  - `onReservationUpdated`: 예약 문서 `status`가 `확정` 또는 `취소`로 바뀔 때 `userEmail`로 발송
  - `onReservationCreated`: CSV 가져오기·표 직접 입력 등으로 처음부터 `확정` 상태로 생성되는 경우 발송
  - 발송 대상은 예약 데이터의 `userEmail` 필드 (셀프 예약은 로그인 계정 이메일이 자동 저장됨)
  - 관리자가 CSV 가져오기/표 직접 입력으로 등록하는 예약은 `userEmail`이 비어있으면 발송 건너뜀 — 표 직접 입력의 `이메일` 칸(선택 입력)에 채워야 발송됨
- 이메일 발송: [Resend](https://resend.com) 사용, `functions/index.js`의 `RESEND_API_KEY` 환경변수로 인증
  - GitHub Secret `RESEND_API_KEY`에 저장 → 배포 워크플로우가 매 배포 시 `functions/.env`로 기록 후 배포
  - 발신 주소(`FROM_EMAIL`)는 기본값이 Resend 테스트 도메인(`onboarding@resend.dev`) — `suwoncca.org` 도메인 인증 완료 후 GitHub Secret `RESEND_FROM_EMAIL`로 교체 가능
  - Firestore 보안 규칙과 무관 (Admin SDK로 서버 측에서만 동작, 클라이언트는 이메일 발송 로직을 전혀 모름)

## 공개 페이지 개인정보 정책
- 비로그인 상태의 공개 캘린더: 담당자/청지기 이름·연락처 숨김
- `curUser` 가 null이면 상세 팝업에서도 개인정보 미표시

## 주의사항
- **데이터 절대 삭제 금지** — Firestore 실제 운영 데이터
- index.html 수정 시 문법 오류 주의 (4500줄+ 단일 파일)
- Firebase CI 토큰은 GitHub Secret `FIREBASE_TOKEN`에 저장됨 (채팅/코드에 노출 금지)
