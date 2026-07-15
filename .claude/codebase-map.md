# 코드베이스 맵 — IAM Center 예약 시스템

## 파일 목록
| 파일 | 설명 | 로그인 필요 |
|------|------|------------|
| index.html | 메인 SPA (관리자+사용자) | 일부 |
| cal.html | 내부 예약 현황 캘린더 | 불필요 |
| cal-public.html | 공개 예약 현황 캘린더 | 불필요 |
| checkout.html | 퇴실 체크리스트 제출 | 불필요 |
| checkouts.html | 퇴실 체크 이력 조회 | 필요 |
| notice.html | 공지사항 관리 | 필요 |
| notices-public.html | 공지사항 공개 페이지 | 불필요 |
| portal.html | 인트라넷 포털 | 필요 |
| quotation.html | 견적서 발급 | 필요 |
| venue.html | 대관 신청 관리 | 필요 |
| weekly-manager.html | 주간 예약 현황 | 불필요 |
| firestore.rules | Firestore 보안 규칙 | — |

## index.html SPA 페이지 구조
`go(page)` 함수로 전환. `id="p-{page}"` 형태의 div를 show/hide.

| page 키 | 대상 | 권한 |
|---------|------|------|
| spaces | 공간 안내 | 공개 |
| public | 공개 예약 캘린더 | 공개 |
| apply | 예약 신청 | 로그인 |
| mylist | 내 예약 | 로그인 |
| dashboard | 대시보드 | 관리자 |
| list | 예약 목록 | 관리자 |
| manage-spaces | 공간 관리 | 관리자 |
| report | 리포트/분석 | 관리자 |
| blocked | 차단일 관리 | 관리자 |
| orgs | 기관 관리 | 관리자 |
| weekly | 주간 현황 | 관리자 |
| checkouts-page | 퇴실 체크 이력 | 관리자 |
| memo | 관리자 메모 | 관리자 |
| allowed | 외부 사용자 관리 | 관리자 |

## Firestore 컬렉션 & 구조

### reservations (핵심)
```
type: string          // 기관 분류 (orgs.name)
subOrg: string        // 세부 기관 (선택)
managerName: string   // 예약 담당자
stewardName: string   // 실사용자 (공개 페이지에서 숨김)
stewardTel: string    // 연락처 (공개 페이지에서 숨김)
room: string          // 공간명
date: string          // YYYY-MM-DD
start: string         // HH:MM
end: string           // HH:MM
people: number
purpose: string       // 사용 목적 (자유 텍스트)
status: string        // '대기'|'확정'|'반려'|'취소'
recurGroup?: string   // 정기 예약 그룹 UUID
recurType?: string    // '매주'|'매월' 등
history: [{time, msg}]
```

### orgs
```
name: string
parentId?: string     // 없으면 최상위 기관, 있으면 세부 기관
```

### spaces
```
name: string
cap?: number          // 수용 인원
order?: number        // 정렬 순서
```

### adminNotes
```
content: string
tag?: string          // 공간 태그 (예: '505호')
createdAt: string     // ISO string
author: string        // 작성자 이메일
```

## 주요 함수 (index.html)

### 충돌 체크
```js
noConflict(room, date, start, end, skipId, confirmedOnly)
// → true이면 충돌 없음(예약 가능)
```

### 목적 분류
```js
classifyPurpose(purpose, room, org)
// purposeCats 배열(keywords/rooms/orgs 필터) 기반 자동 분류
// → '기도모임'|'예배·찬양'|'회의·소그룹'|... |'기타'
```

### 정기 예약 수정 (allSeries 모드)
```js
// submitEdit() 내부 allSeries 블록
const dateDeltaMs = new Date(newDate) - new Date(origDate);
const getEffDate = x => shiftDate(x.date, dateDeltaMs);
const toUpdate = series.filter(x => noConflict(room, getEffDate(x), ...));
const conflicted = series.filter(x => !noConflict(...));
// toUpdate만 updateDoc, conflicted는 클릭 가능 버튼으로 안내
// 대안 공간(allFit / 일부 가능) 추천 포함
```

### 페이지 이동
```js
go(page)  // SPA 페이지 전환, 필요 시 render 함수 호출
```

## 모달 시스템
`openModal(id)` / `closeModal(id)` 로 `.modal-bg` 요소 show/hide.
주요 모달: `modal-login`, `modal-apply`, `modal-edit`, `modal-detail`, `modal-info`, `modal-sms`

## 스타일 패턴
CSS 변수로 다크/라이트 테마 지원:
- `var(--blue)`, `var(--green)`, `var(--red)`, `var(--text)`, `var(--text2)`, `var(--text3)`
- `var(--bg)`, `var(--bg2)`, `var(--border)`, `var(--border2)`

## 구현 완료 기능 (최근)
- 정기 예약 allSeries 수정: 충돌 건 제외하고 가능한 건만 업데이트
- 날짜 이동 delta 적용 (전체 시리즈 동일 간격 이동)
- 충돌 항목 클릭 시 개별 수정 모달 바로 열기
- 대안 공간 추천 (전체 일정 가능 / 일부 가능)
- 관리자 메모 페이지 (adminNotes 컬렉션)
- 리포트: 기관별 모임 목적 분석 (카테고리 분류 + 실제 텍스트 상위 8개)
- 공개 캘린더: 비로그인 시 담당자·청지기 이름·연락처 숨김
- GitHub Actions 자동 배포 (FIREBASE_TOKEN secret 사용)
