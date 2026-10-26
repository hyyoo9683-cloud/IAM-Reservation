# IAM Center 공간 예약 시스템

## 프로젝트 개요
수원 아이엠센터(IAM Center)의 공간 예약·관리 시스템. 단일 HTML 파일 기반 SPA + Firebase.

- **라이브 사이트**: https://iamreservation.web.app/
- **Firebase 프로젝트**: `iamreservation`
- **GitHub 레포**: `hyyoo9683-cloud/IAM-Reservation`
- **개발·배포 브랜치**: `claude/merge-bundle-commits-5fgy0e` (push하면 바로 운영에 배포됨). 예전 `claude/space-reservation-system-N6xIM`은 더 이상 사용하지 않음

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
| `checkouts.html` | 퇴실 체크 이력 (로그인 필요) — 왼쪽 목록/오른쪽 상세 2단 레이아웃. "💬 의견 모아보기" 탭에서 특이사항·만족한 점·불편한 점이 있는 건만 제출 날짜별로 묶어서 한 번에 확인 가능 |
| `notice.html` | 공지사항 관리 (로그인 필요) |
| `notices-public.html` | 공지사항 공개 페이지 |
| `portal.html` | 인트라넷 포털 |
| `quotation.html` | 견적서 발급 — `?ref=venue_requests문서ID`로 열리면(venue.html에서 연결) 저장 시 그 값을 `quotations.refRequestId`로 함께 기록. `?id=견적서문서ID`로 열리면 발행 이력에서 그 견적서를 자동으로 불러와 보여줌(venue.html의 "견적서 보기" 링크가 이 방식 사용) |
| `venue.html` | 대관 신청 관리 (아론홀·샤론홀·아이엠홀·지혜홀 대상) — 공간 칩을 여러 개 함께 선택 가능(`selectedSpaces` 배열, 신청 문서에 `spaces` 필드로 저장, `space`는 대표/첫 번째 공간으로 하위 호환 유지). 지혜홀(숙박)은 날짜 모델이 달라 항상 단독 선택으로 강제됨. 신청 목록을 불러올 때 `quotations`도 함께 읽어 신청 건별 가장 최근 견적서를 매칭(`quotesByRef`). 카드에 "📄 견적 ○○○원 보기" 표시, 상세 패널 버튼도 이미 견적서가 있으면 "📄 견적서 보기"(quotation.html?id=...)로 바뀜 — 재발행이 필요하면 "+ 새 견적서"로 별도 작성(같은 신청에 여러 견적서가 쌓일 수 있고, 그중 issuedAt 기준 가장 최근 것만 카드에 연결됨). 신청 상태가 "승인"이면 상세 화면에 "📅 예약으로 등록" 버튼이 뜨며(`registerAsReservation()`), 누르면 신청서 내용을 바탕으로 실제 `reservations` 문서를 확정 상태로 생성함(공간이 여러 곳이면 공간마다 별도로 생성) — 자동 트리거가 아니라 관리자가 직접 눌러야 하는 수동 버튼(상태를 "승인"으로 바꾼다고 자동 생성되지 않음, 중복 생성 방지를 관리자가 통제하도록 의도적으로 설계). 상세 화면 "🗑 삭제"로 신청서 자체 삭제 가능(`deleteRequest()`, 이미 발행된 견적서·등록된 예약은 삭제되지 않고 남음). 아래 "대관 신청 → 예약 등록 연동" 참고 |
| `event-checklist.html` | 행사 준비 체크리스트(공통 항목, `eventChecklists` 컬렉션) 작성·관리 (로그인 필요, 아론홀·샤론홀·아이엠홀 확정 예약은 자동 생성) |
| `checklist-view.html` | `event-checklist.html`의 체크리스트 단건 보기/체크 (대시보드 "이번 주 체크리스트"에서 연결, 로그인 필요) |
| `manager-checklist.html` | 담당자별 개인 체크리스트(`managerChecklists` 컬렉션, 예약건마다 담당자 개인이 자유롭게 항목 작성) — `event-checklist.html`과는 별개 기능. 예약을 아론홀·샤론홀·아이엠홀·전체 탭으로 필터링해 선택 |
| `weekly-calendar.html` | 전체 예약 현황 (일간: 5층 소그룹실/아론홀/샤론홀/아이엠홀/지혜홀/로비 분류 후 시간순 / 주간: 요일 카드를 좌(5층 제외 전체 목록)·우(5층 소그룹실 목록) 2컬럼(1:1 비율)으로 분할, 각 컬럼 자체 스크롤(내용 많아도 안 잘림), 클릭 시 상세). 관리자 "콘텐츠 편집 > 주간 캘린더"에 등록한 목적 키워드(`siteContent/weeklyCalendar.mainKeywords`, 예: 수요성경공부)가 포함된 예약은 5층 소그룹실이어도 "메인 행사"로 간주되어 일간·주간 모두에서 해당 목록 맨 위 정렬 + 녹색 배경으로 강조 표시됨(단, 칸 자체는 원래 공간 기준 그대로 유지 — 5층 소그룹실이면 계속 5층 소그룹실 칸에 표시). 일간 보기 상단에는 그날 확정 예약 인원(`people`) 합계로 "예상 이용객 약 N명"을 표시하고, 클릭하면 1시간 단위로 겹치는 예약 인원을 합산한 대략적인 동시간대 이용객 추정치를 막대 그래프로 볼 수 있음(실제 집계가 아닌 러프한 추정치). 주간 보기의 각 요일 카드에도 같은 방식의 요약이 개별적으로 표시됨(요일마다 따로 펼치고 접을 수 있음) |
| `jihye-apply.html` | 지혜홀(숙박) 신청 페이지 (셀프 신청 아님, 상담 후 관리자가 링크 개별 전달) |
| `guide.html` | 아이엠센터 이용 안내(예약 책임자·청지기 제도, 예약 방법, 아론홀·샤론홀 조건 등) — "예약 신청" 진입 시 거치는 동의 게이트 페이지(하단 체크박스 동의 후 `index.html?apply=1`로 이동, 로그인 안 되어 있으면 로그인 후 자동으로 신청 폼으로 이어짐). 직접 링크로도 공유 가능. 카카오톡 인앱 브라우저로 열면 페이지 진입 즉시 전체 화면 오버레이(`#kakao-overlay`)로 안내 내용 자체를 덮어서 Chrome/Safari로 나가기 전에는 아무것도 진행할 수 없게 막음(iOS는 자동 이동+실패 대비 수동 링크, Android는 "Chrome으로 열기" 버튼). 제목 바로 아래 접이식 안내(`<details class="first-time">`, 기본 닫힘)로 "예약이 처음이신가요?"를 두어 소속 외부 이용자를 `venue-spaces.html`로 안내(내부 이용자 평소 흐름에는 영향 없음). 05번 외부 대관 섹션에도 `venue-spaces.html` 링크 버튼 있음 |
| `reservation-change.html` | 예약 변경·취소 신청 페이지 (누구나 제출 가능, `changeRequests` 컬렉션에 저장) — 공간은 5층 소그룹실(505~511호)·아론홀·샤론홀 중 select로만 선택 가능. 관리자 처리 화면은 `index.html`의 "예약 변경·취소 신청" 페이지(`renderChangeRequests()`) 참고 |
| `venue-spaces.html` | 외부 대관 가능 공간 소개 페이지 (로그인 불필요, 공개) — `spaces` 컬렉션을 실시간으로 불러와 용도별(01 세미나실: 아론홀·샤론홀 / 02 소그룹실: 5층, 정원 기준 소형 10~16인·중형 20인 이상 소제목 분리 / 그 외는 "기타 공간")로 그룹핑해 사진·정원·비품 태그를 카드로 표시(카드에는 실별 설명 없음). 아이엠홀(별도 사이트 예정)·지혜홀(숙박 전용)·이름에 "로비"가 들어간 공간은 목록에서 제외. 각 섹션(세미나실/소그룹실/아이엠홀) 제목 아래에는 실별이 아니라 구분당 하나씩만 작성하는 소개 문구가 표시됨 — 관리자 "콘텐츠 편집 > 공간 안내" 탭에서 편집(Firestore `siteContent/venueSpaces`: `seminarDesc`/`groupRoomDesc`/`imhallDesc`). 공간 자체(사진·정원·비품)는 여전히 "공간 관리" 페이지에서 편집. 마지막 "아이엠홀" 섹션은 목록에는 없지만 "아이엠센터 소개 > 층별 안내 > B1/B2층"에 등록된 사진을 캐러셀로 가져와 보여줌. 모든 공간 사진(카드·캐러셀)은 클릭하면 라이트박스로 확대 |
| `home/` | **센터 공개 홈페이지** (`/home/`) — 아래 "센터 홈페이지(home/)" 참고 |
| `firestore.rules` | Firestore 보안 규칙 |
| `functions/index.js`, `functions/lib/*.js` | Cloud Functions — 예약 승인 시 Resend로 이메일 발송 (아래 "예약 이메일 알림" 참고) |
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
| `eventChecklists` | 행사 체크리스트 (아론홀·샤론홀·아이엠홀 확정 예약은 `event-checklist.html` 접속 시 자동 생성, 문서 id `auto_<예약id>`, `reservationId`·`autoCreated` 필드로 구분) |
| `loginUsers` | 로그인 이력(예약 책임자 관리). 문서 id=이메일, `name`(실제 로그인 계정 이름)·`firstLoginAt`·`lastLoginAt`·`loginCount` 등 — `trackLoginUser()`가 로그인마다 기록, 예약 목록·상세의 신청자 이메일/실명 표시에도 사용됨(아래 참고) |

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
  showName: '공연명',              // 관리자 모달에서는 "사용 목적" 대신 이 필드가 purpose로 저장됨
  rehearsalStart: '13:00', rehearsalEnd: '14:00',  // 필드명은 유지되지만 UI 라벨은 "행사 시작/종료 시간" (실제 리허설이 아니라 행사 자체의 시작·종료 기록용)
  audienceCount: 200,       // 예상 관객 수 — 아이엠홀은 이 값이 people로도 저장됨 (관리자 모달에서 예상인원 입력칸 자체를 숨김)
  roomsUsed: '대기실, 분장실',
  parking: '차량 3대',
  etcNote: '기타 특이사항', // 아이엠홀은 "추가 요청사항" 대신 이 값이 memo로도 저장됨

  // room === '지혜홀'일 때만 사용 (선택) — start/end는 실제 예약 시간이 아니라 '00:00'~'23:59'
  // 전일 블록으로 고정 저장됨 (충돌 체크용). 실제 체크인/체크아웃 시간은 아래 필드에 별도 저장.
  jihyeRooms: ['Room 1 (3인실)', 'Room 2 (2인실)'],  // 신청서의 룸 선택 체크박스와 동일한 옵션
  checkinTime: '15:00', checkoutTime: '11:00',       // 선택 입력 (정보 표시용, 필수 아님)
}
```
지혜홀(숙박)은 관리자 모달에서 "박수"(nights, 체크아웃 날짜와 자동 상호 계산)를 입력하면 체크인
날짜부터 **체크아웃 당일까지** 매일 예약이 자동 생성되고 (N박이어도 체크아웃 당일도 실제 사용일로
보고 함께 차단하므로 항상 N+1일치 문서가 생성됨 — 1박이어도 체크인+체크아웃 최소 2일),
`recurType: '연박'`으로 recurGroup에 묶임 (기존 정기예약과 별개 개념, 지혜홀은 항상 recurGroup을
가짐). `recurTotal`은 이 실제 문서 수(N+1) 기준이라 "N박"을 표시할 때는 `문서 수 - 1`로 계산해야
함 (`groupOpsRows`의 "숙박(N박)" 라벨 참고). 시작/종료 시간 입력칸은 지혜홀에서는 "체크인/체크아웃
시간(선택)"으로 라벨이 바뀌며 비워둘 수 있음 — 실제 저장되는 `start`/`end`는 하루 전체를 막는
`00:00`~`23:59` 고정값이고, 입력한 시간은 `checkinTime`/`checkoutTime`에 정보용으로만 저장됨.

기존 지혜홀 예약을 **수정**할 때도 체크인 날짜·박수·체크아웃 날짜 입력칸이 그대로 노출되며
(신규 등록 때와 동일한 UI), 값을 바꾸면 `submitEdit()`이 (체크아웃 당일 포함해서 다시 계산한)
새 날짜 목록과 기존 문서들을 비교해 필요한 만큼 문서를 추가(`addDoc`)·삭제(`deleteDoc`)·유지
(해당 문서만 `updateDoc`)함 — 값이 실제로 바뀌지 않았으면(추가·삭제 대상 없음) 단순 필드 수정만
수행. 2026-08 이전에 만들어진 레거시 단건(체크아웃 당일 문서가 없는) 예약은 편집 시 자동으로
체크아웃 당일 문서가 추가되며 새 모델로 전환됨. `openEditModal()`은 열린 회차가 중간/마지막
날이어도 체크인 날짜를 항상 그 숙박의 **첫날**로 맞춰서 채움. 일반 정기예약(매주/격주/매달)의
"전체 N회 모두 수정"(`e-all-series`, 간격 기반 `generateAvailDates`)은 매일 간격인 연박에는
맞지 않아 `recurType==='연박'`인 경우 해당 UI 자체를 숨기고 위 체크인/박수/체크아웃 입력만 노출함.

## 필요 시설 (TV/마이크/탕비실/야외테라스)
`needTV`, `needMic`, `needPantry`, `needTerrace` 필드 — 원래 사용자 신청 폼에만 있던 체크박스였는데,
관리자 "+ 예약 추가/수정" 모달에도 동일한 체크박스가 있어 관리자가 직접 등록·수정할 때도 설정
가능함. 대시보드 최상단 "준비물 확인(TV·마이크·탕비실, 3일치)" 카드에서 오늘~모레(3일치) 확정 예약 중
TV·마이크 필요, 탕비실 이용 체크된 것만 모아서 날짜와 함께 보여줌(야외테라스는 이 카드에는 없음). "이번주 예약" 카드는
일주일 캘린더처럼 오늘~이번 주 일요일까지 요일별 칸(흰 배경+테두리)으로 나눠 행사 제목만 칩으로
보여주고(아이엠홀 → 아론홀 → 샤론홀 → 그 외 순 정렬, 아이엠홀만 보라색), 그 칸의 날짜가 실제
일요일이고 그날 예약이 여러 건이면 "주일예배 (N건)" 칩 하나로 축약함. `reservations`를 직접
필터링해서 만듦(과거엔 `eventChecklists` 자동생성 문서를 기준으로 만들었는데, 예약이 삭제돼도
연결된 체크리스트 문서가 안 지워져 목록에 남거나, 체크리스트가 아직 생성 안 된 새 예약이 누락되는
문제가 있어서 폐기함). 클릭하면 항상 연결된 예약 상세(`openDetail(r.id)`)가 바로 열림.

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

## 내 예약(mylist) 매칭 기준
`renderMyList()`는 `reservations.userEmail`이 로그인 계정과 같은 경우 외에, **로그인 계정의
실명(`curUser.displayName`)이 해당 예약의 `managerName` 또는 `stewardName`과 정확히 일치하는
경우도 내 예약으로 포함**함 (이메일이 비어있는 CSV 가져오기·수기 등록 예약, 또는 본인이
상급자 이름을 예약 책임자로 쓰고 자신은 청지기로 등록한 경우 대응). 이름 일치는 정확한
문자열 비교라 동명이인 오탐 가능성이 있어, "예약 책임자 관리"(`login-users`) 페이지에
계정별로 "이메일로는 확인 안 되고 이름만으로 매칭된 예약" 건수와 검증 모달
(`reviewNameMatches`/`reassignReservationName`)을 두어 관리자가 확인 후 필요하면
해당 예약의 이름을 바로잡을 수 있게 함. 이 검증 모달과 `renderMyList()` 둘 다 `recurGroup`이
같은 예약은 회차별로 나열하지 않고 하나로 묶어서 보여주며(날짜 범위 + "N건"), 이름 수정도
시리즈 전체에 한 번에 적용됨.

관리자 전용 "+ 예약 추가" 모달(`submitEdit()`)은 정기 예약(반복)뿐 아니라 비정기 예약(날짜별로
시간이 다른 여러 날짜를 한 번에 등록, `e-is-multi`/`editMultiDates`)도 지원함 — 사용자 신청 폼의
"복수 예약(비정기)"와 같은 개념이며, 신규 등록(`!editId`)에서만 노출됨.

신규 정기 예약 등록 시 `checkEditAvail()`이 종료 날짜·반복 유형까지 입력되면 시작일 하나만이
아니라 생성될 전체 회차의 가용성을 확인함. 충돌하는 회차가 있으면 그 날짜에 한해 다른 실로
개별 재지정할 수 있는 드롭다운을 보여주며, 선택한 내용은 `editRecurRoomOverrides`(날짜→실 이름)에
저장되어 `submitEdit()`에서 회차별로 다른 실을 적용함(회차마다 실이 달라야 하는 경우 대응, 현재는
신규 등록에서만 지원 — 기존 시리즈 수정은 기존 "전체 회차 수정" 방식 그대로).

**1회성 예약 → 정기 예약 전환 (관리자 전용)**: `recurGroup`이 없는 기존 예약(지혜홀 제외)을 수정 모달로
열면 "정기 예약 (반복)" 체크박스가 보임(`openEditModal()`의 `canConvertRecur`, 비정기 체크박스는 수정 모달에서
항상 숨김). 체크하면 신규 등록과 같은 반복 유형·종료 날짜 입력과 회차 미리보기·실 재지정
(`checkEditAvail()`의 `isNewRecur` 경로 — 지금 예약 자신은 충돌에서 제외하려고 `editId`를 skipId로 넘김)이
나오고, 저장(`submitEdit()`의 `_isConvert` 분기) 시 **지금 예약이 첫 회차**가 되어 `recurGroup`·`recurType`·
`recurTotal`이 붙고 나머지 회차는 새 문서(`addDoc`)로 추가됨. 저장 직전 모든 회차의 확정 예약 충돌을 다시
확인해 하나라도 걸리면 아무것도 바꾸지 않고 중단. 시작일을 앞당기는 전환은 지원하지 않음. 추가되는 회차는
`확정` 상태로 바로 생성되므로 승인 메일 트리거(상태 변경 시에만 발송)는 타지 않음 — 의도된 동작.

이 모달로 등록하는 예약은 신청자 이메일 입력칸이 없어서
`userEmail`을 빈 문자열로 저장함 (예전에는 로그인한 관리자 자신의 이메일을 기본값으로 넣었는데,
그러면 실제 담당자와 무관하게 관리자 본인 "내 예약"에 전부 뜨고 상태가 확정으로 바뀔 때 관리자에게
잘못된 승인 메일이 갈 수 있었음). 커뮤니티 내 동명이인이 거의 없다는 전제로, 이런 수기 등록
예약은 이름 매칭만으로 해당 담당자의 "내 예약"에 잡히도록 함.

## 예약 목록·상세의 신청자 이메일/실제 로그인 계정 표시
담당자·청지기 이름은 신청자가 자유롭게 입력하는 텍스트라 실제 신청 계정과 다를 수 있음(대필
신청 등) — 관리자가 이를 확인할 수 있도록 예약 목록(`renderList()`)의 담당자 칸 아래에 작은
글씨로 신청자 이메일(`r.userEmail`)을 함께 표시하고(`managerCellHtml()`), 예약 상세
(`openDetail()`)에는 "신청자 계정" 항목으로 이메일을 보여줌(`applicantAccountHtml()`, isAdmin
전용). `loginUsers` 컬렉션(문서 id=이메일, `trackLoginUser()`가 로그인마다 기록)에서 해당
이메일의 실제 로그인 계정 이름을 찾아(`findLoginUser()`) 담당자·청지기 이름과 다르면 주황색
"⚠ 실제 로그인 계정 이름: OOO"로 강조 표시. `loginUsers`는 `loadData()`에서 관리자 로그인 시
`loginUsersCache`로 실시간 구독됨(예약 목록 페이지에서만 재렌더링 트리거). `userEmail`이 빈
예약(관리자 수기 등록·CSV 가져오기)은 "(로그인 계정 없음 — 관리자 등록/CSV)"로 표시.

## 예약 변경·취소 신청 관리 (index.html)
"예약 변경·취소 신청" 페이지(`renderChangeRequests()`)는 왼쪽 목록(`#cr-list`, `.cr-row` — 공간·날짜·
신청자·처리 상태만 간단히)과 오른쪽 상세(`#cr-detail`, `renderChangeReqDetail()` — 모임명·요청 내용·
변경 장소 입력·처리 메모·신청자 연락처·문자/카카오 발송 등 전체 정보) 2단 레이아웃(`.cr-split`)으로
구성됨. 목록 행 클릭 시 `selectChangeReq(id)` → `selectedChangeReqId` 갱신 → 목록·상세 함께 재렌더링.
신청 후 24시간 이내(`isRecentChangeReq()`)인 건은 목록에서 다른 배경색 + "NEW" 표시로 강조됨. 처리
메모 textarea에 포커스가 가 있는 동안은 Firestore 실시간 갱신에 의한 재렌더링을 스킵함(입력 중인
내용 유실 방지) — 이 textarea가 `#cr-detail` 안으로 옮겨졌으므로 가드 조건도 `#cr-detail` 기준으로
확인함.

## 예약 목록 검색 (시간대 필터)
`renderList()`의 검색바에는 이름·공간·기관·기간(날짜 범위) 외에 **시간대 필터**(`#ftime-s`/`#ftime-e`,
전역 `SLOTS` 배열로 채워진 select, 07:00~22:00 30분 단위)가 있음 — 선택한 시간대와 겹치는 예약만
표시(`r.end > fts`, `r.start < fte`로 각각 필터링, `noConflict`의 겹침 판정과 동일한 방식). 하나만
선택해도 동작(그 이후/이전 전체로 열린 범위 취급). `resetListFilter()`도 함께 초기화함.

## 선택한 예약들의 연락처 일괄 복사
예약 목록에서 여러 건을 체크박스로 선택 후 "📨 선택 문자"/"💬 선택 카카오"(`openBulkSmsModal`)를
열면, 청지기 연락처(`stewardTel`)가 2명 이상이면 문자 작성 모달의 연락처 바에 "📋 번호 전체 복사"
버튼이 노출됨 — `smsBulkContacts`(중복 tel 제거된 `[tel, name]` 배열)를 쉼표로 이어붙여
클립보드에 복사(`copyAllSmsContacts()`), 문자 앱 수신자란에 붙여넣어 여러 명에게 한 번에 발송하기
위함. 단건 문자(`openSmsModal`)·변경요청 문자(`openChangeSmsModal`)에서는 이 버튼이 숨겨짐.

**5층 소그룹실 탕비실 안내 자동 첨부**: 확정·변경 안내 문자/카카오(`renderSmsBody()`, `renderBulkSmsBody()`,
`openChangeSmsModal()`) 맨 끝(푸터 뒤)에 5층 소그룹실(`/^5\d{2}호$/` — 505~511호) 예약일 때만
"예약 이용 시 5층 탕비실도 이용 가능합니다." + 탕비실 이용 링크(네이버 사이트 링크 https://m.site.naver.com/2jvWE)가 붙음(`PANTRY_NOTICE`/
`pantryNoticeFor(rooms)`). 정기 시리즈·일괄 선택은 포함된 공간 중 하나라도 5층 소그룹실이면 붙고, **취소 안내에는
붙이지 않음**. 링크를 바꿀 땐 `PANTRY_NOTICE` 한 곳만 수정.

## 정기 예약 날짜 생성 규칙 (`generateAvailDates`)
매주/격주/매달 회차 날짜는 **시작 날짜를 기준점으로 간격만큼(매주 7일·격주 14일) 앞으로
진행**하며 생성됨(`generateAvailDatesCore()`) — 입력한 종료 날짜에 맞춰 간격을 조정하거나
역산하지 않음. 종료 날짜가 그 간격에 정확히 맞아떨어지지 않아도(예: 격주 시작일 기준으로
종료 날짜가 짝이 안 맞는 날) **종료 날짜 자체는 항상 예외적인 마지막 회차로 포함됨** —
`generateAvailDates()`가 core 결과 끝에 종료 날짜가 없으면 그대로 덧붙임(마지막 회차만
직전 회차와의 간격이 14일이 아닐 수 있음, 반복 규칙에 억지로 맞추기 위해 사용자가 지정한
종료 날짜를 빼지 않음). 이 로직 하나로 신규 등록·시리즈 종료일 연장·CSV 가져오기·가용성
검색 등 정기예약 날짜를 만드는 모든 경로에 동일하게 적용됨. 신청 폼(`checkAvail()`)과 관리자
"+ 예약 추가" 모달(`checkEditAvail()`)의 정기 예약 미리보기에는 마지막 회차가 이런 예외
회차인지 참고용으로 안내하는 문구(`recurMismatchNote`, `generateAvailDatesCore()`로 판별)를
표시함.

## 정기 예약 (allSeries) 처리
- `recurGroup` 필드로 같은 시리즈 예약들이 연결됨
- 수정 모달에서 "전체 N회 모두 수정" 체크박스(`e-all-series`) 선택 시 allSeries 모드
- "적용 시작일"(`e-series-from-date`, 기본값 현재 수정 중인 회차의 날짜)을 지정하면 그 이전 회차는 그대로 두고 이후 회차만 수정됨 (예: 6/6~10/17 시리즈에서 7/25부터만 공간·시간 변경)
- "시작 날짜 변경"(`e-series-start-date`)·"종료 날짜 변경"(`e-series-end-date`)으로 시리즈 자체의 기간을 앞/뒤로 늘리거나 줄일 수 있음 — 앞당기면/늘리면 회차 추가, 미루면/줄이면 회차 삭제. 시작일 앞당김은 `generatePriorAvailDates(anchorDate, targetStart, recur, weekdays)`로 계산하는데, 이때 반드시 시리즈의 **실제 첫 회차 날짜**를 기준점(anchor)으로 삼아 과거 방향으로 역산함 (사용자가 입력한 날짜를 기준점으로 앞으로 계산하면 매주/매달 패턴의 요일이 어긋날 수 있음) — 종료일 연장은 기존처럼 `generateAvailDates(lastDate, newEndDate, ...)`로 실제 마지막 회차 날짜를 기준점 삼아 정방향 계산
- `dateDeltaMs`로 날짜 이동 delta 계산, `getEffDate(x)`로 각 건의 이동된 날짜 반환
- 공간(`room`)은 수정 폼의 공간이 지금 열린 회차의 원래 공간과 같으면(`roomChanged = room !== r.room`이 false) 회차별 기존 공간을 그대로 유지(`getEffRoom(x)`) — 회차마다 공간이 다른 시리즈(예: 대부분 508호, 일부만 507호)에서 목적·담당자 등 다른 필드만 일괄 수정해도 공간이 한 곳으로 뭉개지지 않음. 공간을 실제로 다른 걸로 선택했다면 의도적인 일괄 변경으로 보고 전체 회차에 그 새 공간을 적용함
- 충돌되는 건은 제외하고 가능한 건만 업데이트, 충돌 건은 모달로 안내
- 대안 공간 추천 기능 포함

### 선택 회차만 일괄 일정 변경 (개별 회차 예외)
"전체 N회 모두 수정"(시리즈 전체)과 별개로, 예약 목록에서 체크박스로 고른 **개별 회차들만** 요일·
시간·공간을 한꺼번에 바꾸는 기능(`openBulkRescheduleModal()`/`submitBulkReschedule()`, 일괄 선택
바의 "📅 선택 일정 변경")도 있음 — recurGroup 여부와 무관하게 선택된 문서들에 직접 적용됨. "요일
변경"은 각 건을 그 건이 속한 주(일~토) 안에서 지정한 요일로 옮기는 방식(`target - d.getDay()`만큼
날짜 이동)이라, 서로 다른 요일의 회차를 한 번에 선택해도 각자 자기 주 기준으로 이동함(예: 매주
화·목 시리즈에서 화요일 회차만 선택해 수요일로 변경). 시간·공간은 선택 시에만 해당 값으로
일괄 교체되고 비워두면 기존 값 유지. 저장 전 선택 항목 밖의 기존 확정 예약과의 충돌, 그리고
선택 항목끼리 이동 후 서로 겹치는지까지 모두 확인 후 하나라도 걸리면 전체 저장을 막음. 요일·
시간·공간 select를 바꿀 때마다 `checkBulkReschedule()`이 건별로 "날짜(요일) 시간 · 공간 — ✓ 가능/
✗ 충돌" 미리보기(`#br-preview`)를 바로 보여줘서 저장 전에 확인 가능 — 미리보기와 실제 저장
(`submitBulkReschedule()`) 모두 `computeBulkRescheduleTargets()`/`findBulkRescheduleConflicts()`를
공유해 같은 기준으로 판정함. 저장 성공 시 예약 승인 때와 같은 방식으로 "변경 안내 메시지를 바로
작성하시겠습니까?" 팝업(`#modal-reschedule-msg`)이 뜨고, 문자/카카오 선택 시 방금 변경된 건들
기준으로 `openBulkSmsModal(type, 'change', lastRescheduleIds)`가 열림 — `smsBulkMode`
(`'confirm'`|`'change'`)에 따라 `renderBulkSmsBody()`가 "[예약확정 알림]"/"[예약변경 알림]" 중
맞는 문구를 사용함.

## 예약 목록 체크박스 선택 (`getSelectedIds()`)
정기 예약 그룹은 헤더 체크박스(`.group-sel-btn`, 접힌 상태에서도 시리즈 전체를 한 번에 선택)와,
펼쳤을 때 회차별 체크박스(`.row-chk[data-group]`) 두 단계로 선택 가능. **그룹이 펼쳐져 있으면
개별 체크박스 상태가 항상 우선**함 — 헤더로 전체 선택 후 일부 회차만 체크 해제하면 그 회차는
선택에서 제외됨(`getSelectedIds()`가 `expandedGroups`를 확인해, 펼쳐진 그룹은 DOM의 개별 체크
상태 기준으로 다시 필터링). 그룹이 접혀 있으면 개별 체크박스가 없으므로 헤더 체크 = 시리즈
전체 선택으로 취급. `onRowCheck()`이 개별 체크박스를 누를 때마다 그 그룹의 헤더 체크박스를
전체/일부(indeterminate)/없음 상태로 동기화하고 `_selectedGroupIds`도 함께 갱신함 — 반대로
`toggleGroupSel()`은 헤더를 누르면 펼쳐진 개별 체크박스들도 그 상태로 맞춰줌.

**그룹이 접힌 상태에서 "시리즈 전체 선택"은 `reservations`를 recurGroup으로 다시 조회하는 게
아니라, 그룹 헤더 체크박스의 `data-ids`(현재 검색·날짜 필터에 걸려 실제 화면에 렌더링된 회차
id만 담김, `renderList()`의 `groupRows()`가 필터링된 `data` 기준으로 채움) 값을 그대로 사용함.**
recurGroup으로 다시 조회하면 날짜 필터 범위 밖(예: 시작 날짜를 10월로 좁혔는데 9월 회차까지)의
회차까지 선택에 딸려 들어가는 문제가 있었음 — 화면에 보이는 회차만 정확히 선택되도록 이 방식을
씀.

## 예약 목록의 "일정수정"(빠른 수정) 모달
정기 예약 그룹을 펼쳤을 때 각 회차 행의 "일정수정" 버튼(`openQuickEdit(id)` → `#modal-quick-edit`)은
그 회차 하나만 날짜·시간을 빠르게 바꾸는 용도 — 관리자 "+ 예약 추가/수정" 모달과는 별개의 경로임.
과거엔 이 경로가 다른 확정 예약과의 충돌 여부를 전혀 확인하지 않고 바로 저장돼서, 같은 실에 시간이
겹치는 확정 예약이 두 건 이상 쌓이는 실제 사고가 있었음(508호 등에서 발견) — 지금은 날짜·시간을
바꿀 때마다 `checkQuickEditAvail()`이 같은 실의 확정 예약과 겹치는지 미리 보여주고, `saveQuickEdit()`
저장 시에도 `noConflict(r.room, date, start, end, _quickEditId, true)`로 재확인해 충돌하면 막음.

### 정기 예약 복수 요일 (예: 매주 화·목)
- 신청 폼에서 반복 유형이 "매 주"일 때만 요일 체크박스(`m-recur-weekday-list`, 시작 날짜의 요일은 항상 포함되어 해제 불가)로 요일을 추가 선택 가능 — `recurSelectedWeekdays` 전역 Set으로 관리
- 2개 이상 선택 시에만 `generateAvailDates(sd, ed, recur, weekdays)`의 4번째 인자(`weekdays` 배열)를 사용해 선택된 요일 전체를 매주 반복 생성 — 1개(기존 단일 요일)면 `weekdays`를 넘기지 않아 기존 "시작일로부터 7일 간격" 로직 그대로 동작(하위 호환)
- 예약 문서에 `recurWeekdays: [2,4]`(0=일~6=토)와 `recurType: '매 주(화·목)'`처럼 사람이 읽을 수 있는 라벨을 저장 — `recurType` 문자열에 "격"/"달"이 없으므로 기존 `recurType?.includes('격')` 같은 판별 로직과 호환됨
- 관리자 수정 모달의 "전체 N회 모두 수정" 중 시리즈 **연장** 시에도 `r.recurWeekdays`를 `generateAvailDates`에 그대로 전달해 화·목 등 복수 요일 패턴이 깨지지 않게 함 (시리즈 단축은 단순 삭제라 영향 없음)
- 신청 폼의 "제외할 날짜" 기능(`renderRecurExcludeList`)과 함께 동작 — 복수 요일로 생성된 날짜 목록에서도 개별 회차를 체크 해제해 제외 가능

## 접근 제어
- `ADMIN_EMAILS = ["hyyoo9683@gmail.com"]` — 관리자
- `ALLOWED_DOMAIN = "suwoncca.org"` — 허용 도메인
- `allowedUsers` 컬렉션 — 외부 허용 계정
- `curUser` (로그인 객체), `isAdmin` (관리자 여부) — 전역 변수

### 서버 측 권한 (firestore.rules)
화면의 권한 확인과 별개로 Firestore 규칙에서 동일하게 강제함. 새 기능 추가 시 규칙도 함께 수정할 것.
- `isAdmin()` = 주 관리자 이메일 또는 `admins/{email}` 문서 존재
- `isMember()` = 관리자 또는 `@suwoncca.org` 계정 또는 `allowedUsers/{email}` 문서 존재 (예약 신청·내 예약)
- **인트라넷은 관리자 전용**: `portal.html`과 인트라넷 페이지(notice·venue·quotation·checkouts·event-checklist·manager-checklist·checklist-view)는 `isAdminAccount()`(주 관리자 또는 `admins` 문서)로 입장을 막고, 규칙도 공지 쓰기·대관 신청·퇴실 기록·견적서·체크리스트·변경 신청을 `isAdmin()`으로 제한. 일반 `@suwoncca.org` 직원은 예약 시스템(index.html)만 사용
- 예약: 사용자는 본인 이메일(`userEmail`)로 '대기' 상태 신청, 본인 예약만 수정·취소·삭제(상태는 유지 또는 '취소'만). 승인·반려·타인 예약은 관리자만
- `admins`, `allowedUsers`는 본인 문서만 `getDoc`으로 확인 가능 (목록 조회는 관리자) → 로그인 시 `getDocs` 대신 `getDoc` 사용
- `siteContent`(홈페이지·FAQ 등) 쓰기는 관리자만
- 규칙 테스트: `tests/` (`cd tests && npm install && npm test`, Java 필요). GitHub Actions `rules-test.yml`이 배포 브랜치 외 push·PR에서 자동 실행
- 배포 시 공개 제외: `firebase.json`의 hosting.ignore (숨김 파일, CLAUDE.md, firestore.rules, tests 등)

## 셀프 예약 불가 공간 (아이엠홀·지혜홀)
- `index.html`의 `SELF_SERVICE_EXCLUDED_ROOMS = ['아이엠홀', '지혜홀']` — 일반 사용자 예약 신청 칩(`buildRoomChips()`)에서 제외됨
- 관리자 전용 예약 등록·수정 모달(`editChipsHtml()`)에는 모든 공간이 그대로 노출되므로, 관리자가 대관 신청·상담 이후 받은 예약을 수동으로 등록 가능
- 아이엠홀: venue.html 대관 신청 대상에 포함됨(다른 시간제 공간과 함께 선택 가능) — "예약으로 등록"으로 실제 예약 생성 가능. quotation.html 견적 계산에는 아직 아이엠홀 항목이 없어, 견적서는 여전히 관리자가 별도로 작성
- 지혜홀(숙박): `jihye-apply.html`에서 신청서 접수 → `venue_requests` 컬렉션에 저장 (venue.html 숙박 항목과 동일한 필드 구조: `dateIn`, `nights`, `rooms`, `eventDate`, `eventName`)
- 두 공간 모두 `spaces` 컬렉션에 문서로 등록되어 있어야 예약 등록이 가능 — **공간 관리(관리자) 페이지에서 관리자가 직접 추가해야 함**
- 예약 목록 페이지의 **"📥 CSV 가져오기"**로 구글 시트 붙여넣기 일괄 등록 가능 (`detectCols()`가 헤더 텍스트로 컬럼 자동 인식). 아이엠홀 세부사항(공연명/행사명, 리허설 시작·종료, 관객 수, 사용하는 실, 주차, 기타) 컬럼도 헤더에 해당 단어가 포함되면 자동 인식되어 함께 저장됨

## 대관 신청 (venue.html) 공간 복수 선택
`selectSpace(space)`가 `selectedSpaces`(모듈 전역 배열)를 토글함 — 아론홀·샤론홀·아이엠홀(모두
hourly)은 몇 개든 함께 선택 가능하고, 선택된 공간들의 `stdEquip`/`paidServices`를 합쳐서
(`mergedVenueInfo()`, 중복 제거) 폼에 보여줌. 지혜홀(lodging)은 날짜 모델(`dateIn`/`nights`)이
hourly의 `dates[]`와 전혀 달라 **항상 단독 선택으로 강제**됨(지혜홀 선택 시 다른 선택 초기화,
반대로 hourly 공간 선택 시 지혜홀 선택 해제). 저장 시 `data.spaces`(선택된 전체 배열)와
`data.space`(spaces[0], 하위 호환용 대표 공간) 둘 다 기록. 목록 카드에는 `spaces`를 쉼표로
나열해서 표시.

## 대관 신청 → 예약 등록 연동 (venue.html)
`venue_requests` 문서의 상태가 "승인"이면 상세 화면에 "📅 예약으로 등록" 버튼이 뜨고, 누르면
`registerAsReservation(id)`가 신청서 내용으로 `reservations` 문서를 **확정** 상태로 직접 생성함:
- 아론홀·샤론홀·아이엠홀(hourly): `dates`(복수 날짜·시간 배열, 없으면 `eventDate`/`timeStart`/`timeEnd`)의
  각 항목마다 문서 하나씩 생성. 2건 이상이면 `recurGroup: venue_<timestamp>_<공간명>`, `recurType: '비정기'`로 묶음
- 지혜홀(lodging): `dateIn`부터 `nights`박 **+ 체크아웃 당일**까지 매일 문서를 생성(index.html
  지혜홀 규칙과 동일하게 항상 N+1일치), `start`/`end`는 `00:00`~`23:59` 고정, `recurType: '연박'`,
  `jihyeRooms`/`checkinTime`/`checkoutTime`도 함께 채움
- **공간이 여러 곳 선택된 신청**은 `spaces` 배열의 공간마다 위 로직을 반복해 공간별로 별도
  문서(공간별 별도 recurGroup)를 생성 — 예: 아론홀+아이엠홀 2곳 선택 시 같은 날짜·시간으로 두
  공간 각각에 예약이 생성됨
- 공통 매핑: `type: r.orgName`(내부 기관 분류 체계와 무관하게 외부 기관명을 그대로 씀),
  `managerName`/`stewardName` 모두 `r.managerName`, `stewardTel: r.tel`, `people: r.headcount`,
  `purpose: r.eventName`, `userEmail: ''`(관리자 대신 등록이라 신청자 이메일 없음 — index.html의
  "+ 예약 추가"와 같은 이유)
- 저장 전 `checkRoomConflicts()`로 **공간마다 각각** 기존 **확정** 예약과 겹치는지 확인, 하나라도
  겹치면 전체 등록을 막음(index.html의 `noConflict` 겹침 판정과 동일한 기준)
- 생성된 문서 id들을 `venue_requests.reservationIds` 배열에 기록해 이미 등록된 신청은 카드·상세에
  "✓ 예약 N건 등록됨"으로 표시됨. **자동으로 실행되지 않음** — 상태를 "승인"으로 바꾸는 것만으로는
  예약이 생성되지 않고, 관리자가 이 버튼을 직접 눌러야만 생성됨(중복 생성 여부를 관리자가 판단하고
  통제하도록 의도적으로 수동 트리거로 설계). 이미 등록된 신청도 "다시 등록"으로 추가 생성 가능(기존
  예약은 삭제되지 않고 그대로 남음)
- 신청서 자체는 상세 화면 "🗑 삭제"(`deleteRequest()`)로 삭제 가능 — `venue_requests` 문서만
  지워지고, 이미 발행된 `quotations`나 이미 생성된 `reservations`는 그대로 남음(연동만 끊어짐)

## 예약 이메일 알림 (Cloud Functions)
현재는 **1단계(기반 구조) + 2단계(예약 승인 이메일)**까지만 구현됨. 변경·취소 메일, 관리자용/내부기관용 주간 리포트는 아직 미구현 (구조만 고려, 아래 "다음 단계" 참고).

- `functions/index.js` — Firestore `reservations` 컬렉션 트리거 (Cloud Functions 2세대)
  - `onReservationUpdated`: `status`가 (확정이 아니었다가) **`확정`으로 바뀔 때만** 예약 책임자에게 승인 이메일 발송. 상태 외 필드만 바뀐 경우, 이미 확정 상태가 재저장된 경우는 무시
  - CSV 가져오기·표 직접 입력처럼 문서가 **생성 시점부터** `확정` 상태인 경우는 대상에서 제외 (대량 과거 데이터 이관 시 메일이 무더기로 나가는 걸 막기 위한 의도적 범위 제한)
  - `sendTestEmail`: 관리자 전용 콜러블 함수, 테스트 메일 발송용 (서버 측에서 `ADMIN_EMAILS` + Firestore `admins` 컬렉션으로 관리자 여부 재검증)
  - 발송 대상은 예약 데이터의 `userEmail` 필드 (셀프 예약은 로그인 계정 이메일이 자동 저장됨). 관리자가 표 직접 입력으로 등록할 때는 `이메일` 칸(선택 입력)에 채워야 발송 대상에 포함됨
- `functions/lib/templates.js` — 승인·변경·취소 이메일이 공유하는 공통 템플릿(`renderReservationEmail(type, reservation)`, HTML+텍스트 동시 생성). 현재는 `type === '확정'`만 실제 내용 반환, 그 외는 `null`
- `functions/lib/resendClient.js` — Resend 발송 래퍼. 발신 주소는 `RESEND_FROM_EMAIL` 환경변수(기본값: Resend 테스트 주소 `onboarding@resend.dev`, 본인 계정으로만 발송 가능)
- `functions/lib/emailLog.js` — **`emailLogs` 컬렉션**으로 중복 발송 방지 + 발송 이력 관리
  - 문서 ID = `eventKey` (예: `reservation_<id>_approved_<Cloud Functions event.id>`) — `event.id`는 동일 이벤트가 재전달돼도 값이 유지되므로, `ref.create()`가 두 번째 시도에서 실패하며 자연스럽게 중복 발송이 막힘
  - 필드: `eventKey, reservationId, emailType, recipient, recipientType, status(pending/sent/skipped/failed), createdAt, sentAt, failedAt, errorMessage, retryCount, providerMessageId`
  - Firestore 보안 규칙에 `emailLogs`가 없어 클라이언트는 읽기/쓰기 모두 기본 차단(default-deny) — Admin SDK(Cloud Functions)만 접근
  - 이메일 발송 실패는 `markFailed`로 로그만 남기고 예외를 던지지 않음 — 예약 승인(`updateDoc`) 자체는 이미 끝난 후에 실행되는 별도 트리거라 이메일 실패가 예약 처리에 영향을 주지 않음
- 환경변수(`functions/.env`, 로컬 전용 — `.env.example` 참고): `RESEND_API_KEY`, `RESEND_FROM_EMAIL`(선택), `APP_BASE_URL`(선택, 기본값 `https://iamreservation.web.app`), `ADMIN_NOTIFY_EMAIL`(선택, 아래 관리자 알림 수신 주소)
  - GitHub Secret `RESEND_API_KEY`(필수) / `RESEND_FROM_EMAIL`(선택)에 저장 → 배포 워크플로우가 매 배포 시 `functions/.env`로 기록 후 배포
  - 발신 주소는 `suwoncca.org` 서브도메인(예: `mail.suwoncca.org`) 인증 완료 후 `RESEND_FROM_EMAIL`로 교체
- 아직 구현하지 않은 것: 예약 변경/취소 메일(사용자 대상, 3단계), 관리자·내부기관 주간 리포트(4·5단계), 관리자 화면(발송 로그 조회·재발송·수신자 관리), 정기예약 전체승인(`approveGroup`) 시 회차별로 개별 메일이 나가는 부분(시리즈 단위 묶음 발송 미구현), "+ 예약 추가"로 관리자가 직접 확정 상태 예약을 생성하는 경우(현재는 대상 아님)

### 관리자 신규 신청 알림 (새 예약·변경취소·대관 신청)
사용자가 예약·변경취소·대관을 신청하는 즉시 관리자에게 이메일로 알림. 위 승인 메일(사용자 대상)과
반대 방향(관리자 대상) — 수신자·템플릿이 달라 `functions/lib/adminNotify.js`로 분리.
- `onReservationCreated`(`reservations` onCreate): `status === '대기'`로 생성된 문서만 대상(셀프 예약 신청) —
  관리자가 "+ 예약 추가"로 직접 등록한 건(보통 바로 `확정`)은 신청이 아니므로 제외
- `onChangeRequestCreated`(`changeRequests` onCreate): `reservation-change.html` 제출 시
- `onVenueRequestCreated`(`venue_requests` onCreate): `venue-apply.html` 제출 시
- 수신 주소: `ADMIN_NOTIFY_EMAIL` 환경변수, 없으면 주 관리자 이메일(`ADMIN_EMAILS[0]`)로 감
- `emailLogs`로 멱등 처리되는 것은 승인 메일과 동일(`eventKey` 접두사만 `reservation_..._new_`/`changereq_..._new_`/`venuereq_..._new_`로 구분)
- 알려진 범위 제한: 정기 예약처럼 한 번의 신청으로 회차마다 문서가 여러 개 생성되면 회차 수만큼
  알림이 감(시리즈 단위 묶음 미구현 — 위 승인 메일과 같은 제한)
- **알림 채널은 3개가 서로 독립**(`notifyAdmin()`): 이메일(Resend), 카카오톡 "나에게 보내기"(`lib/kakaoClient.js`,
  `kakao-auth.html`에서 1회 연동 — 알림음 없음), 문자(알리고, `lib/smsClient.js`). 한 채널 실패가 다른 채널에 영향 없고,
  채널마다 `emailLogs`에 `<eventKey>_kakao`/`_sms` 키로 따로 멱등 처리됨
- **문자(SMS)**: `ALIGO_KEY`·`ALIGO_USER_ID`·`ALIGO_SENDER`(사전 등록한 발신번호)·`ADMIN_NOTIFY_PHONE`(받을 번호)
  GitHub Secret이 **모두** 있을 때만 발송(없으면 조용히 건너뜀). 90바이트(한글 약 45자) 이하는 SMS, 넘으면 LMS(요금↑)로
  자동 전환. 알리고는 **호출 서버 IP를 미리 등록**해야 해서 고정 IP가 없는 Cloud Functions에서는 인증 오류가 날 수 있음 —
  `kakao-auth.html`의 "테스트 문자 보내기"(`sendTestSmsMessage`, 실제 1건 발송·요금 발생)로 확인하고, 막히면 고정 IP
  (VPC 커넥터+Cloud NAT) 또는 IP 제한 없는 다른 문자 업체를 검토

## 공개 페이지 개인정보 정책 (예약 원본/공개 사본 분리)
- 원본 `reservations`(이름·연락처·이메일·메모 포함)는 **관리자와 본인만 읽기 가능** (firestore.rules)
  - 본인 = `userEmail`이 로그인 이메일과 같거나, `managerName`/`stewardName`이 로그인 계정 실명(`token.name`)과 같은 구성원 — `renderMyList()` 기준과 동일
- 공개 화면은 **`publicReservations`**(같은 문서 id, 개인정보 없는 허용 필드만)를 읽음
  - Cloud Function `mirrorPublicReservation`이 예약이 바뀔 때마다 자동 갱신. 복사 필드는 `functions/lib/publicReservation.js`의 `PUBLIC_FIELDS` (허용 목록 방식 — 새 필드를 공개 화면에 보여줄 때만 추가)
  - 전체 재생성: 관리자 로그인 시 `ensurePublicMirror()`가 `system/publicMirror` 버전을 확인해 필요하면 `system/publicMirrorRequest`를 기록 → `rebuildPublicReservations` 실행. 사본 구조를 바꾸면 양쪽 `PUBLIC_MIRROR_VERSION`을 함께 올릴 것
- 읽는 곳: `index.html` 비로그인(`loadPublicData`)·일반 사용자(`listenReservationsForUser` — 공개 사본 + 본인 예약 원본 병합), `cal.html`, `cal-public.html`, `weekly-calendar.html`(관리자 로그인 시 원본으로 전환해 담당자·연락처 표시), `event-checklist.html`. `portal.html`·`manager-checklist.html`은 원본을 먼저 시도하고 권한이 없으면 공개 사본 사용
- 클라이언트는 `publicReservations`에 쓸 수 없음 (서버 함수 전용)
- `changeRequests`(변경·취소 신청, 신청자 연락처 포함) 열람·처리는 관리자만

## 센터 홈페이지 (home/)
예약 시스템과 같은 Firebase 프로젝트·로그인·데이터를 쓰는 공개 홈페이지. 주소 `https://iamcenter.web.app/` (같은 Firebase 프로젝트의 별도 Hosting 사이트, `home/` 폴더만 배포) — 기존 `https://iamreservation.web.app/home/`에서도 그대로 열림.
- Hosting 구성: `firebase.json`의 hosting 배열 — `main`(저장소 루트 → iamreservation 사이트), `home`(`home/` → iamcenter 사이트), 대상 연결은 `.firebaserc`의 `targets`. 배포 워크플로우가 예약 시스템을 먼저 배포한 뒤 iamcenter 사이트를 확인(없으면 `hosting:sites:create`로 생성)하고 `hosting:home`을 따로 배포함
- 링크 주소는 `content.js`의 `normalizeLink()`로 다듬음 — `www.example.org`·`naver.me/…`처럼 https:// 없이 적은 주소에 https://를 붙임(편집 모드 🔗 입력 시 저장 전에, 이미 저장된 값은 `safeUrl()`에서 화면에 그릴 때). 그 밖에 http(s)·mailto·tel·#·./·../·/ 로 시작하지 않는 값(javascript: 등)은 `#`으로 막힘
- 홈페이지에서 예약 시스템 페이지로 가는 링크는 `https://iamreservation.web.app/...` 전체 주소로 씀(별도 사이트에서는 `../index.html` 같은 상대 주소가 깨짐). 예전에 저장된 `../x`·`/x` 링크는 `home.js`의 `safeUrl()`이 자동으로 전체 주소로 바꿈
- 디자인 기준은 메인 시안 v4(`iamcenter-main-v4.html`, 저장소에는 없음) — 메뉴·푸터·여백을 시안과 동일하게 유지. 차이점은 Notice 목록이 링크 없는 일반 줄(`.list .row`, '공지 더보기' 없음)이라는 것뿐. 공개된 공연·행사가 하나도 없으면 What's On에 시안의 예시 카드 6개(`SAMPLE_PROGRAMS`)와 "※ 예시입니다" 안내가 보이고, 하나라도 등록하면 실제 목록으로 바뀜. 센터 소개 큰 문구는 “ ”로 감싼 말이 굵게 표시됨(`mlQuoteBold`). Spaces 카드에 실제 사진을 넣으면 CSS로 가장자리 비네팅이 자동 적용됨(`.sp .ph[data-hasimg]::after`, 원본 파일은 그대로). Visit 지도는 지도 사진(`visit.mapImg`)이 없으면 주소(`visit.address`, 건물 이름은 빼고 도로명+번지만 — `mapQuery()`)로 구글 지도 iframe(키 불필요)을 보여주고 지도 버튼("네이버 지도로 보기", `visit.placeLabel`)과 지도 사진 클릭은 네이버 스마트플레이스 링크(`visit.placeLink`, 기본 https://naver.me/x9VaOiSS)로 연결 — 예전 `visit.mapLink`(카카오 검색 링크가 게시본에 저장돼 있음)는 더 이상 쓰지 않음 — 추후 카카오맵 API(JavaScript 키 + 도메인 등록)로 교체 예정
- 푸터 4번째 칸은 SNS(FOLLOW) 대신 '유관기관 ▾' 버튼 — 누르면 목록이 위로 펼쳐지고 바깥을 누르면 닫힘(편집 중에는 항상 펼침). 목록은 `footer.orgs[{label, link}]`(마더와이즈·원천침례교회·브솔복지재단·중앙기독학교), 링크가 비어 있으면 이름만 흐리게 보임, 화면에는 항상 이름 가나다순으로 정렬(저장 순서와 무관) — 편집 모드에서 이름·🔗링크 수정, "+ 기관 추가"(이름·주소 입력)·기관별 ✕로 추가·삭제
- 로고: `home/logo-iam.png`("I AM •••", 투명 배경, 흰색 모양 틀) — CSS mask로 글자색을 칠해 히어로 위 흰색·스크롤 후 검정·푸터 흰색으로 자동 전환(`.logo-mark`). 로고를 바꿀 땐 같은 이름의 투명 PNG로 교체하고 `aspect-ratio`(가로/세로)만 맞추면 됨
- 상단 메뉴: 홈(`./`, 2026-10 '공연·행사'에서 이름 변경 — 공연·행사 상세 페이지는 추후 검토) / 아이엠센터(▾: 아이엠센터 소개·방문가이드) / 아이엠홀 / 세미나실(▾) + "대관신청" 버튼. 푸터 MENU도 '홈'(INFO의 중복 '홈페이지'는 뺌) ("대관 안내"는 대관 문의와 겹쳐서, "오시는 길"은 방문가이드 페이지에 들어가므로 2026-10 제거 — 푸터에는 남아 있음, 푸터 '오시는 길'은 방문가이드로 연결). 메인 섹션 링크는 `./#섹션`(세부 페이지에서도 메인으로 돌아가게). "아이엠센터"·"세미나실"의 세부 메뉴(드롭다운, PC는 마우스를 올리면 펼침, 모바일 메뉴에서는 하위 항목)는 `siteContent/homepage`의 `nav.center`·`nav.seminar` 배열(`{label, link}`)을 `renderNav()`가 그림 — 편집 모드에서 이름은 바로, 링크는 🔗로 수정
- **세부 페이지**: `./?page=about|guide|aaron|sharon|hall|rental`(아이엠센터 소개·방문가이드·아론홀·샤론홀·아이엠홀·대관신청 — 조직도(`org`)는 2026-10 삭제: `?page=org`는 메인으로, 예전 게시본 메뉴의 조직도 링크는 `mergeContent()`가 빼고 보여줌, 저장된 `pages.org` 데이터는 그대로 둠) — 별도 파일 없이 `home/index.html`이 `state.page`를 보고 메인 섹션 대신 `PAGES[id]()`를 그림(`content.js`의 `PAGE_IDS`, 내용은 `siteContent/homepage`의 `pages.<id>`: eyebrow·title·lead·img·blocks). 공통: 머리(작은 제목·큰 제목·소개) + 본문 블록 — 블록은 텍스트 칸(`{type:'text', h, p, align:'left'|'center'}`, type이 없는 예전 `{h,p}`도 텍스트로 처리)과 사진 칸(`{type:'image', imgs[], caption}` — 아래 '사진 묶음')이 위에서 아래로 쌓이고, 편집 모드에서 '+ 텍스트'·'+ 사진' 추가, 칸마다 ↑↓·정렬·삭제. 아이엠센터 소개는 머리 → 대표 사진 칸(`pages.about.img`, 비어 있으면 임시 배경) → ••• → 가운데 정렬 비전 문구(`pages.about.vision`) → 본문 블록 → 중심 가치(`valuesHtml()`, 밝은 배경 `--soft`에 제목 + 세 개의 원이 겹치는 다이어그램 `.venn`(원에는 가치 이름 `pages.about.valueItems[i].t`만, 가운데 `valuesCenter`) → 그 아래 가치별 세부 설명 3칸(`.v-details`, 제목은 같은 `t` — 편집 시 원과 함께 바뀜, 설명 `valueItems[i].d`는 엔터로 줄바꿈·굵게 가능, 모바일은 1칸) + 굵기 조절 줄글 `pages.about.values`, 숫자 통계 대신) → 층별 간략 안내(`floorsHtml()`) 순서. 층별 안내는 예약 시스템 관리자 '아이엠센터 소개 > 층별 안내'의 `siteContent/floors`(floors[]: name·mainTitle·body)를 그대로 읽어 층·공간 이름·소개 첫 문장(`floorSummary()`, HTML 태그 제거·90자 제한)만 건물 단면도 같은 표(`.bld`/`.fl-row`, 칸 사이 세로선, 위층이 위로 오게 `floorRank()`로 정렬, 지하층도 다른 층과 같은 모양)로 보여줌. 층마다 바로가기 버튼(`floorLinksHtml()`, 옅은 색의 작은 버튼 — 홈페이지 안 주소(./·#)는 옅은 회색 채움·→, 바깥 사이트는 테두리·↗·새 창, 화면 순서는 홈페이지 안 페이지 버튼(아론홀·샤론홀)이 저장 순서대로 맨 앞 + 나머지 이름 가나다순): `pages.about.floorBtns[층번호]`(지하는 '-1')가 있으면 그것만, 없으면 기본값 `defaultFloorBtns()` = `pages.about.floorLinks[층번호]`(6층 샤론홀·2층 아론홀) + 관리자 층별 안내의 `links`. 소개 페이지 편집 모드를 열면 `seedFloorBtns()`가 손대지 않은 층의 기본값을 floorBtns로 복사(기준본에도 같이 넣어 '변경 없음' 유지) → '+ 버튼'(이름·주소 입력)·이름 수정·🔗·✕로 층별 버튼 관리. 한 번 floorBtns가 생긴 층은 관리자 층별 안내의 links를 바꿔도 홈페이지에는 반영 안 됨(홈페이지 편집 모드에서 관리) — 내용 수정은 그쪽에서. Spaces 섹션은 소개 페이지에서 뺌.
- **아이엠홀·대관신청·방문가이드 탭(2026-10 대관 안내 PDF 반영)**: 아이엠홀 `./?page=hall`(`pages.hall`: 사진 묶음 `imgs` → 큰 문구 `headline`·소개 `intro` → 좌석배치도 `seatImg` → 시설·무대 안내 표 `specs[{h, rows[{k,v}]}]` → 무대 도면 `stageImg` → 안내 `note` → 대관하기 버튼). 대관신청 `./?page=rental`(`pages.rental`, 탭 hall/seminar — `tabbed()`, 주소 `&tab=`로 시작 탭 지정): 대관 절차 `steps[{t,d}]` → 연락 상자(이메일·전화·온라인 신청 `applyLink`=venue-apply.html, 양식 버튼 `forms[{label,link}]` — 링크 없으면 숨김) → 대관료(아이엠홀은 표 `fees[{g,k,r,p,one}]` — 같은 구분 g는 합쳐 보이고 빈 금액은 ‘별도 문의’, 비고 `remarks[]`·안내 `notes[]` / 세미나실은 카드 `cards[{name, rows[{k,time,fee}]}]`) → 대관 규약 `rules[]`·취소 및 환불규정 `refund[]`(확정 전이라 `rulesHidden: true`면 방문자에게 숨김, 편집 모드에서 ‘방문자에게 보이기’). `./?page=rental#contact`·`#terms`는 보이는 탭 안의 해당 위치로 스크롤(`scrollToHash()`). 방문가이드는 탭 4개(`pages.guide.tabs`): 오시는 길(기존 Visit 섹션 + 약도 `way.mapImg` + 카카오채널·QR + 교통 안내 상자 `way.transport[{h, rows[{label,tone,text}]}]`) / 주차안내(`parking`: 지도·안내 목록·요금 표) / 편의시설(`amenity.stores[]` 사진·글 좌우 번갈아 + 소개 페이지와 같은 층별 안내를 읽기 전용으로) / 휠체어 이용안내(`wheel`). 아론홀·샤론홀은 사진만 공간 관리(spaces)에서 가져오고 소개 `headline`·`intro`, 시설 안내 표 `facts[{k,v}]`, 이용 안내 `usage[]`는 홈페이지 전용. 공통 부품: `kvTable()`(왼쪽 제목 + 이름·값 표, 빈 값 줄 숨김), `textList()`(글 목록, 굵게 가능), `imgSlot()`(사진 한 장 칸 — 사진이 없으면 방문자에게 숨김). 편집 모드 목록 조작은 `data-arr-add`(data-tpl = 새 줄 기본값 JSON)·`data-arr-mv`·`data-arr-del`, 켜고 끄기는 `data-flag`. 사진 칸은 모두 비어 있는 상태로 시작 — 편집 모드에서 올림
- **세부 페이지 디자인 규칙은 `.claude-project/DESIGN_RULES.md`**(메인 시안 v4 기준 — 색·글자·여백·부품·하지 말 것). 2026-10-26 아이엠홀·대관신청·방문가이드·아론홀·샤론홀을 메인과 같은 모양으로 맞춤: 섹션 제목은 큰 영문 + 한글 부제(`secHd()`/`kvHead()`/`tf()` — 영문은 `…En`/`en` 필드, 값이 없으면 기본 영문), 아이엠홀 대표 사진 자리(그라데이션, `photoSet`의 `label`이 방문자용 표시)·숫자 띠 `pages.hall.stats`(`hallStats()`, 메인 WHY와 같은 `.statement .stats`), 대관 절차는 가로 단계 카드(5단계 이상 3칸씩), 문의는 어두운 띠(`.r-contact`), 표는 세로줄 없이, 편의시설은 사진이 없으면 사진 자리(`phBox()`), 방문가이드 맨 위 사진 자리도 방문자에게 표시. 도면·약도·QR 같은 정보 그림(`imgSlot()`)만 비어 있으면 숨김. 페이지 탭(`.ptabs`)은 검정 테두리 칸 + 작은 영문(`TAB_EN`, 편집 시 `pages.<id>.tabsEn.<키>`) + 한글, 선택 칸은 검정 채움. 시설 안내 표(`kvTable()`)는 방문자 화면에서 값을 굵은 제목처럼, 여러 줄 값은 2열 목록(이름 굵게 · 수량 오른쪽 회색 — 개·대·석·명 단위 앞 숫자부터를 수량으로, `.facts`/`.fact-items`)으로 보여주고 편집 모드에서는 일반 표. 아론홀·샤론홀 비품은 한 칸(부속시설) 대신 `테이블·의자`/`음향·영상`/`악기`(샤론홀만) 줄로 나눔 — 예전 기본값 그대로 게시된 경우 `LEGACY_DEFAULTS`가 새 묶음으로 바꿔 보여줌
- **캐시 주의(2026-10-26)**: 예전엔 no-cache 헤더가 `**/*.html`에만 걸려 있어 `/`·`/?page=…`로 열면 index.html(스타일 포함)이 브라우저에 최대 1시간 남고 home.js만 새것이 되어 화면이 깨졌음(탭·시설 표가 맨 글자로 보임) → `firebase.json` 두 사이트 모두 `"source": "**"` no-cache 추가. 그래도 남아 있는 옛 화면 대비로 `home.js`의 `CSS_VER`와 `index.html` `:root`의 `--css-ver`가 다르면 한 번만 새로고침(sessionStorage `iamCssReload`로 반복 방지). **`home/index.html` 스타일을 바꿀 때는 두 값을 함께 올릴 것**
- 푸터: 대표 전화 `footer.tel`(퀵바 전화 버튼도 이 번호로), 사업자등록번호 `footer.bizNo`·카카오채널 `footer.kakaoLink`(비어 있으면 숨김, 퀵바 카카오 버튼도 이 링크로), INFO의 FAQ `footer.faqLink`·개인정보처리방침 `footer.privacyLink`(비어 있으면 이름만 흐리게), 대관규약은 `rulesHidden`이면 흐리게
- 예전 기본값 자동 갱신: 게시하면 저장본 전체가 기록되므로, `content.js`의 `LEGACY_DEFAULTS`에 적힌 예전 기본 문구(760석·‘대표 전화 안내 예정’·방문가이드 임시 블록 등)와 **완전히 같은 값**만 `mergeContent()`에서 새 기본값으로 바꿔 보여줌 — 직접 고친 글은 그대로. 기본값을 바꿀 땐 예전 값을 이 목록에 추가
- 층별 안내의 글(층 이름·공간 이름·소개 글)도 홈페이지 편집 모드에서 바로 수정 가능: `pages.about.floorText[층번호]`(`{name, mainTitle, desc}`, desc는 굵게 가능) — 소개 페이지 편집 모드를 열면 `seedFloorBtns()`가 관리자 층별 안내 값(소개는 `floorSummary()` 첫 문장)으로 채워 둠(기준본에도 같이). floorText가 생긴 층은 관리자 층별 안내 글을 바꿔도 홈페이지에 반영 안 됨(`floorCells()`가 floorText 우선)
- 층별 안내에는 관리자 층별 안내에 없는 층을 홈페이지에서만 더할 수 있음: `pages.about.extraFloors[{name, mainTitle, body}]`(기본 B3–B5 주차장) — `allFloors()`가 관리자 층 목록과 합쳐 층 번호순으로 정렬(같은 층 번호가 관리자 쪽에 있으면 숨김), 편집 모드에서 층 이름·공간 이름·설명 수정
- **사진 묶음(`photoSet(path, legacyPath, {fixed, ph})`)**: 사진 주소 배열 — 1장이면 한 장(본문 사진 칸은 원본 비율, `fixed`면 16:9로 꽉 채움), 2장 이상이면 넘겨 보는 슬라이드(`.car`, 스크롤 스냅 + 좌우 버튼 + 점). 편집 모드에서 썸네일 줄(`.ps-edit`)로 '+ 사진 추가'(업로드)·◀▶ 순서·✕ 빼기. 예전 한 장짜리 값(`img`)은 첫 장으로 보여주고, 편집하면 배열로 옮겨 담음. 쓰는 곳: 소개 대표 사진(`pages.about.imgs`, 예전 `pages.about.img`), 본문 사진 칸(`blocks[i].imgs`, 예전 `blocks[i].img`)
- **굵기 조절 글(rich)**: 텍스트 칸 본문·소개 비전 문구는 `**글자**` 표시로 저장되고 화면에서는 굵게(`mlStrong()`/`rich()`, `data-rich`). 편집 모드에서 글자를 선택하고 하단 막대 'B 굵게'(또는 Ctrl+B)로 굵게/풀기 — `editor.js`의 `richToText()`가 화면의 굵은 글씨를 다시 `**` 표시로 바꿔 저장(그 밖의 글자 칸에서는 Ctrl+B 막음). 방문가이드는 Visit 섹션(같은 데이터)을 함께 보여줌. 아론홀·샤론홀은 `pages.<id>.space` 이름으로 `spaces` 컬렉션을 조회해 층·정원·비품·사진을 공간 관리 데이터 그대로 보여줌(대표 사진은 `pages.<id>.img`로 따로 지정 가능)
- `venue-spaces.html`의 공간 카드는 `id="space-공간이름"` — `venue-spaces.html#space-아론홀`로 열면 목록을 그린 뒤 그 카드로 스크롤 + 잠깐 강조(`focusHashCard()`)
- 편집 모드 로그인: `?edit=1`로 열면 클릭 없이 팝업을 띄우게 되어 브라우저가 막을 수 있음 → `auth/popup-blocked`면 하단에 'Google로 로그인' 버튼(`askLoginClick()`)을 보여주고 그 클릭으로 팝업을 띄움
- 새 주소에서 관리자 로그인(편집 모드)을 하려면 Firebase Authentication → 승인된 도메인에 `iamcenter.web.app`이 등록되어 있어야 함
- `home/index.html` 뼈대·스타일, `home/home.js` 렌더링(섹션 템플릿·슬라이더 등), `home/content.js` 기본 문구·구성(`DEFAULT_CONTENT`)과 병합(`mergeContent`), `home/fb.js` Firebase 초기화·관리자 확인·이미지 업로드(긴 변 2400px JPEG로 줄여 Storage `site/...`에 저장)
- 데이터: `siteContent/homepage`(문구·사진 URL·섹션 순서/숨김 `sections:[{id,hidden}]`) — 문서가 없거나 항목이 빠지면 `DEFAULT_CONTENT`로 채움. `programs`(공연·행사, `published==true`만 공개). 공지는 인트라넷 `notices`와 별개인 홈페이지 전용 공지(`siteContent/homepage`의 `notice.items: [{category,title,date}]`) — 편집 모드에서 글자 바로 수정, '+ 공지 추가'(맨 위에 오늘 날짜로 추가)·줄별 '삭제'로 관리
- **편집 모드**(`home/editor.js`, `home/editor.css`): 푸터 '관리자' 또는 `?edit=1` → 관리자(주 관리자·`admins`) 로그인 시 하단 막대 표시. 막대의 페이지 선택(`.ed-page`, `EDIT_PAGES`)으로 메인·세부 페이지를 오가며 편집(`?page=…&edit=1`로 이동, 게시 전 수정 내용은 sessionStorage `iamHomeDraft`에 담아 새 페이지에서 이어받음 — 그 사이 게시본이 바뀌었으면 버림). 편집은 저장된 내용을 다 불러온 뒤에 시작함(`openEditor()`가 `loaded`를 기다림 — 기본 문구로 편집·게시되는 사고 방지). 글자는 `data-k="경로"` 요소를 바로 수정, 사진은 `data-img`, 링크는 `data-link`, 섹션은 ↑↓·숨기기. '게시하기' 전에는 방문자에게 반영 안 됨
- 게시·되돌리기 때마다 직전 게시본을 `siteContentHistory`(doc:'homepage')에 보관 → `home/admin.html` '버전 기록'에서 복원
- `home/admin.html`: 공연·행사 등록·수정·공개 전환·포스터 업로드(`site/programs/`), 버전 기록
- 새 편집 항목을 추가할 때: `content.js`의 `DEFAULT_CONTENT`에 기본값 → `home.js` 템플릿에서 `t()/m()/href()/bg()`로 출력하면 편집 모드가 자동으로 붙음
- 규칙: `siteContent` 쓰기·`siteContentHistory`·`programs` 쓰기는 관리자만. Storage `site/` 경로에 관리자 쓰기가 허용되어 있어야 사진 업로드 가능(Storage 규칙은 콘솔에서 관리 중 — 저장소에 없음). 2026-10-13 확인: 비로그인 상태로 bucket 전체 목록 조회가 가능함(읽기는 공개), `site/`에는 아직 업로드된 파일이 없음 — 쓰기 허용 여부는 콘솔 규칙에서 직접 확인 필요

## 저장공간 정리 (관리자 전용 페이지, index.html `go('storage-cleanup')`)
- **오래된 사진·첨부파일 압축**: `spaces`(공간 사진)·`venue_requests`(큐시트) Storage 파일 중 6개월
  지난 이미지를 화질 낮춰 같은 경로에 재업로드(원본 URL 유지, 파일 자체는 삭제 안 함).
  `system/storageCleanup` 문서에 마지막 실행 기록
- **오래된 예약 처리 이력 축약**: `reservations`는 삭제·핵심 필드 변경이 금지된 대상이라, 예약
  날짜가 6개월 지난 문서의 `history`(처리 이력) 배열만 "N건 처리 이력 (6개월 경과, 축약됨)" 한
  줄로 요약(`runHistoryCleanup()`) — 공간·날짜·시간·담당자·상태 등 다른 필드는 전혀 안 건드림.
  이미 축약한 문서는 `historyCompacted: true`로 표시해 재실행 시 건너뜀. `system/historyCleanup`
  문서에 마지막 실행 기록

## 주의사항
- **데이터 절대 삭제 금지** — Firestore 실제 운영 데이터 (예약(`reservations`) 등 핵심 운영 데이터 대상)
  - 예외: `checkouts`(퇴실 체크 기록)는 청소 체크리스트 성격이라 장기 보관 필요 없음 — checkouts.html에
    관리자가 직접 확인/삭제할 수 있는 버튼이 있음 (사용자 명시적 요청으로 추가된 예외)
  - `reservations`의 `history` 필드만은 "저장공간 정리" 페이지에서 6개월 지난 문서에 한해 요약
    축약이 허용됨(위 참고) — 그 외 필드·문서 자체는 여전히 삭제·덮어쓰기 금지
- index.html 수정 시 문법 오류 주의 (4500줄+ 단일 파일)
- Firebase CI 토큰은 GitHub Secret `FIREBASE_TOKEN`에 저장됨 (채팅/코드에 노출 금지)
