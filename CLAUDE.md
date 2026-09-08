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
| `event-checklist.html` | 행사 준비 체크리스트(공통 항목, `eventChecklists` 컬렉션) 작성·관리 (로그인 필요, 아론홀·샤론홀·아이엠홀 확정 예약은 자동 생성) |
| `checklist-view.html` | `event-checklist.html`의 체크리스트 단건 보기/체크 (대시보드 "이번 주 체크리스트"에서 연결, 로그인 필요) |
| `manager-checklist.html` | 담당자별 개인 체크리스트(`managerChecklists` 컬렉션, 예약건마다 담당자 개인이 자유롭게 항목 작성) — `event-checklist.html`과는 별개 기능. 예약을 아론홀·샤론홀·아이엠홀·전체 탭으로 필터링해 선택 |
| `weekly-calendar.html` | 전체 예약 현황 (일간: 5층 소그룹실/아론홀/샤론홀/아이엠홀/지혜홀/로비 분류 후 시간순 / 주간: 요일 카드를 좌(5층 제외 전체 목록)·우(5층 소그룹실 목록) 2컬럼(1:1 비율)으로 분할, 각 컬럼 자체 스크롤(내용 많아도 안 잘림), 클릭 시 상세). 관리자 "콘텐츠 편집 > 주간 캘린더"에 등록한 목적 키워드(`siteContent/weeklyCalendar.mainKeywords`, 예: 수요성경공부)가 포함된 예약은 5층 소그룹실이어도 "메인 행사"로 간주되어 일간·주간 모두에서 해당 목록 맨 위 정렬 + 녹색 배경으로 강조 표시됨(단, 칸 자체는 원래 공간 기준 그대로 유지 — 5층 소그룹실이면 계속 5층 소그룹실 칸에 표시). 일간 보기 상단에는 그날 확정 예약 인원(`people`) 합계로 "예상 이용객 약 N명"을 표시하고, 클릭하면 1시간 단위로 겹치는 예약 인원을 합산한 대략적인 동시간대 이용객 추정치를 막대 그래프로 볼 수 있음(실제 집계가 아닌 러프한 추정치). 주간 보기의 각 요일 카드에도 같은 방식의 요약이 개별적으로 표시됨(요일마다 따로 펼치고 접을 수 있음) |
| `weekly-manager.html` | 예약현황(예약책임자별) — `?admin=1` 파라미터로 접속해야 관리자 전체 표/저장 노출. 파라미터 없이(공유용 링크) 접속 시 이름 검색 전에는 아무 예약도 안 보임 (본인 이름 검색 시에만 해당 예약 표시) |
| `jihye-apply.html` | 지혜홀(숙박) 신청 페이지 (셀프 신청 아님, 상담 후 관리자가 링크 개별 전달) |
| `guide.html` | 아이엠센터 이용 안내(예약 책임자·청지기 제도, 예약 방법, 아론홀·샤론홀 조건 등) — "예약 신청" 진입 시 거치는 동의 게이트 페이지(하단 체크박스 동의 후 `index.html?apply=1`로 이동, 로그인 안 되어 있으면 로그인 후 자동으로 신청 폼으로 이어짐). 직접 링크로도 공유 가능. 카카오톡 인앱 브라우저로 열면 페이지 진입 즉시 전체 화면 오버레이(`#kakao-overlay`)로 안내 내용 자체를 덮어서 Chrome/Safari로 나가기 전에는 아무것도 진행할 수 없게 막음(iOS는 자동 이동+실패 대비 수동 링크, Android는 "Chrome으로 열기" 버튼). 제목 바로 아래 접이식 안내(`<details class="first-time">`, 기본 닫힘)로 "예약이 처음이신가요?"를 두어 소속 외부 이용자를 `venue-spaces.html`로 안내(내부 이용자 평소 흐름에는 영향 없음). 05번 외부 대관 섹션에도 `venue-spaces.html` 링크 버튼 있음 |
| `reservation-change.html` | 예약 변경·취소 신청 페이지 (누구나 제출 가능, `changeRequests` 컬렉션에 저장) — 공간은 5층 소그룹실(505~511호)·아론홀·샤론홀 중 select로만 선택 가능 |
| `venue-spaces.html` | 외부 대관 가능 공간 소개 페이지 (로그인 불필요, 공개) — `spaces` 컬렉션을 실시간으로 불러와 용도별(01 세미나실: 아론홀·샤론홀 / 02 소그룹실: 5층, 정원 기준 소형 10~16인·중형 20인 이상 소제목 분리 / 그 외는 "기타 공간")로 그룹핑해 사진·정원·비품 태그를 카드로 표시(카드에는 실별 설명 없음). 아이엠홀(별도 사이트 예정)·지혜홀(숙박 전용)·이름에 "로비"가 들어간 공간은 목록에서 제외. 각 섹션(세미나실/소그룹실/아이엠홀) 제목 아래에는 실별이 아니라 구분당 하나씩만 작성하는 소개 문구가 표시됨 — 관리자 "콘텐츠 편집 > 공간 안내" 탭에서 편집(Firestore `siteContent/venueSpaces`: `seminarDesc`/`groupRoomDesc`/`imhallDesc`). 공간 자체(사진·정원·비품)는 여전히 "공간 관리" 페이지에서 편집. 마지막 "아이엠홀" 섹션은 목록에는 없지만 "아이엠센터 소개 > 층별 안내 > B1/B2층"에 등록된 사진을 캐러셀로 가져와 보여줌. 모든 공간 사진(카드·캐러셀)은 클릭하면 라이트박스로 확대 |
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
가능함. 대시보드 최상단 "오늘 준비물 확인(TV·마이크·탕비실)" 카드에서 오늘 확정 예약 중 TV·마이크 필요,
탕비실 이용 체크된 것만 모아서 보여줌(야외테라스는 이 카드에는 없음). "이번주 체크리스트" 카드는
아이엠홀 → 아론홀 → 샤론홀 → 그 외 순으로 그룹 정렬하고 아이엠홀만 보라색으로 강조하며, 이름에
"주일"이 포함된 항목(주일예배 등)은 배지 없이 한 줄로 축약 표시함.

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

이 모달로 등록하는 예약은 신청자 이메일 입력칸이 없어서
`userEmail`을 빈 문자열로 저장함 (예전에는 로그인한 관리자 자신의 이메일을 기본값으로 넣었는데,
그러면 실제 담당자와 무관하게 관리자 본인 "내 예약"에 전부 뜨고 상태가 확정으로 바뀔 때 관리자에게
잘못된 승인 메일이 갈 수 있었음). 커뮤니티 내 동명이인이 거의 없다는 전제로, 이런 수기 등록
예약은 이름 매칭만으로 해당 담당자의 "내 예약"에 잡히도록 함.

## 정기 예약 (allSeries) 처리
- `recurGroup` 필드로 같은 시리즈 예약들이 연결됨
- 수정 모달에서 "전체 N회 모두 수정" 체크박스(`e-all-series`) 선택 시 allSeries 모드
- "적용 시작일"(`e-series-from-date`, 기본값 현재 수정 중인 회차의 날짜)을 지정하면 그 이전 회차는 그대로 두고 이후 회차만 수정됨 (예: 6/6~10/17 시리즈에서 7/25부터만 공간·시간 변경)
- "시작 날짜 변경"(`e-series-start-date`)·"종료 날짜 변경"(`e-series-end-date`)으로 시리즈 자체의 기간을 앞/뒤로 늘리거나 줄일 수 있음 — 앞당기면/늘리면 회차 추가, 미루면/줄이면 회차 삭제. 시작일 앞당김은 `generatePriorAvailDates(anchorDate, targetStart, recur, weekdays)`로 계산하는데, 이때 반드시 시리즈의 **실제 첫 회차 날짜**를 기준점(anchor)으로 삼아 과거 방향으로 역산함 (사용자가 입력한 날짜를 기준점으로 앞으로 계산하면 매주/매달 패턴의 요일이 어긋날 수 있음) — 종료일 연장은 기존처럼 `generateAvailDates(lastDate, newEndDate, ...)`로 실제 마지막 회차 날짜를 기준점 삼아 정방향 계산
- `dateDeltaMs`로 날짜 이동 delta 계산, `getEffDate(x)`로 각 건의 이동된 날짜 반환
- 공간(`room`)은 수정 폼의 공간이 지금 열린 회차의 원래 공간과 같으면(`roomChanged = room !== r.room`이 false) 회차별 기존 공간을 그대로 유지(`getEffRoom(x)`) — 회차마다 공간이 다른 시리즈(예: 대부분 508호, 일부만 507호)에서 목적·담당자 등 다른 필드만 일괄 수정해도 공간이 한 곳으로 뭉개지지 않음. 공간을 실제로 다른 걸로 선택했다면 의도적인 일괄 변경으로 보고 전체 회차에 그 새 공간을 적용함
- 충돌되는 건은 제외하고 가능한 건만 업데이트, 충돌 건은 모달로 안내
- 대안 공간 추천 기능 포함

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

## 셀프 예약 불가 공간 (아이엠홀·지혜홀)
- `index.html`의 `SELF_SERVICE_EXCLUDED_ROOMS = ['아이엠홀', '지혜홀']` — 일반 사용자 예약 신청 칩(`buildRoomChips()`)에서 제외됨
- 관리자 전용 예약 등록·수정 모달(`editChipsHtml()`)에는 모든 공간이 그대로 노출되므로, 관리자가 대관 신청·상담 이후 받은 예약을 수동으로 등록 가능
- 아이엠홀: 대관 신청 후 관리자가 직접 예약 등록 (venue.html 연동은 금액/항목 미확정으로 보류)
- 지혜홀(숙박): `jihye-apply.html`에서 신청서 접수 → `venue_requests` 컬렉션에 저장 (venue.html 숙박 항목과 동일한 필드 구조: `dateIn`, `nights`, `rooms`, `eventDate`, `eventName`)
- 두 공간 모두 `spaces` 컬렉션에 문서로 등록되어 있어야 예약 등록이 가능 — **공간 관리(관리자) 페이지에서 관리자가 직접 추가해야 함**
- 예약 목록 페이지의 **"📥 CSV 가져오기"**로 구글 시트 붙여넣기 일괄 등록 가능 (`detectCols()`가 헤더 텍스트로 컬럼 자동 인식). 아이엠홀 세부사항(공연명/행사명, 리허설 시작·종료, 관객 수, 사용하는 실, 주차, 기타) 컬럼도 헤더에 해당 단어가 포함되면 자동 인식되어 함께 저장됨

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
- 환경변수(`functions/.env`, 로컬 전용 — `.env.example` 참고): `RESEND_API_KEY`, `RESEND_FROM_EMAIL`(선택), `APP_BASE_URL`(선택, 기본값 `https://iamreservation.web.app`)
  - GitHub Secret `RESEND_API_KEY`(필수) / `RESEND_FROM_EMAIL`(선택)에 저장 → 배포 워크플로우가 매 배포 시 `functions/.env`로 기록 후 배포
  - 발신 주소는 `suwoncca.org` 서브도메인(예: `mail.suwoncca.org`) 인증 완료 후 `RESEND_FROM_EMAIL`로 교체
- 아직 구현하지 않은 것: 예약 변경/취소 메일(3단계), 관리자·내부기관 주간 리포트(4·5단계), 관리자 화면(발송 로그 조회·재발송·수신자 관리), 정기예약 전체승인(`approveGroup`) 시 회차별로 개별 메일이 나가는 부분(시리즈 단위 묶음 발송 미구현), "+ 예약 추가"로 관리자가 직접 확정 상태 예약을 생성하는 경우(현재는 대상 아님)

## 공개 페이지 개인정보 정책
- 비로그인 상태의 공개 캘린더: 담당자/청지기 이름·연락처 숨김
- `curUser` 가 null이면 상세 팝업에서도 개인정보 미표시

## 주의사항
- **데이터 절대 삭제 금지** — Firestore 실제 운영 데이터 (예약(`reservations`) 등 핵심 운영 데이터 대상)
  - 예외: `checkouts`(퇴실 체크 기록)는 청소 체크리스트 성격이라 장기 보관 필요 없음 — checkouts.html에
    관리자가 직접 확인/삭제할 수 있는 버튼이 있음 (사용자 명시적 요청으로 추가된 예외)
- index.html 수정 시 문법 오류 주의 (4500줄+ 단일 파일)
- Firebase CI 토큰은 GitHub Secret `FIREBASE_TOKEN`에 저장됨 (채팅/코드에 노출 금지)
