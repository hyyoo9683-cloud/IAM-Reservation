// 홈페이지 기본 문구·구성 — Firestore siteContent/homepage 문서가 없거나 항목이 비어 있을 때 사용.
// 편집 모드에서 게시하면 이 구조 그대로 siteContent/homepage 에 저장된다.
// 사진(img)은 비어 있으면 그라데이션 임시 이미지 + 촬영 가이드(tag)가 표시된다.
export const PAGE_IDS = ['about', 'guide', 'schedule', 'aaron', 'sharon', 'hall', 'rental'];
export const SECTION_IDS = ['hero', 'whatson', 'about', 'spaces', 'notice', 'visit'];
export const SECTION_LABELS = {
  hero: '메인 비주얼', whatson: '공연·행사', about: '센터 소개(숫자)',
  spaces: '공간 소개', notice: '공지·대관 안내', visit: '오시는 길',
};

export const DEFAULT_CONTENT = {
  schema: 1,
  sections: SECTION_IDS.map(id => ({ id, hidden: false })),
  // 상단 메뉴의 세부 메뉴(드롭다운) — 편집 모드에서 이름·링크 수정 가능
  nav: {
    center: [
      { label: '아이엠센터 소개', link: './?page=about' },
      { label: '방문가이드', link: './?page=guide' },
    ],
    seminar: [
      { label: '아론홀(2F)', link: './?page=aaron' },
      { label: '샤론홀(6F)', link: './?page=sharon' },
      { label: '대관 일정', link: './?page=schedule' },
    ],
  },
  // 세부 페이지(주소 ./?page=아이디) — 편집 모드에서 제목·소개·사진·본문 블록을 고칠 수 있음
  // space: 공간 관리(spaces 컬렉션)의 이름 — 사진·정원·비품을 그곳에서 그대로 가져와 보여줌
  pages: {
    about: {
      eyebrow: 'About I AM Center', title: '아이엠센터 소개',
      lead: 'THE GREAT I AM 되신 예수님을 만나는 곳.\n공연장·세미나실·상업시설이 한 자리에서 “통합”의 가치로 이어집니다.',
      img: '',
      // 비전 문구 — **이렇게** 감싼 부분은 굵게 표시 (편집 모드에서는 ** 표시가 그대로 보임)
      vision: '아이엠센터의 비전은 이곳에 머무는 존재들이\n**‘THE GREAT I AM’ 되신 예수님**을 만나고\n그분을 통해 **하나님 자녀의 정체성이 회복되는**\n**기적의 장소**가 되는 것 입니다.\n\n또한 작은 자 하나에게 베푸는 것이\n**‘THE GREAT I AM’ 되신 예수님**을 섬기는\n것임을 기억하는 공간이 되길 원합니다.',
      // 중심 가치(줄글) — 메인의 WHY I AM CENTER(숫자) 대신 소개 페이지에 표시. 자세한 내용은 편집 모드에서 작성
      valuesEyebrow: 'Core Values', valuesTitle: '아이엠센터의 중심 가치',
      values: '아이엠센터가 소중히 여기는 중심 가치를 소개합니다.\n(자세한 내용은 준비 중입니다.)',
      // 세 개의 원(벤 다이어그램)에는 가치 이름(t), 그 아래에 가치별 세부 설명(d, 여러 줄·굵게 가능), 가운데 겹치는 곳 문구(valuesCenter)
      valuesCenter: 'I AM',
      valueItems: [
        { t: '가치 하나', d: '세부 설명을 입력하세요' },
        { t: '가치 둘', d: '세부 설명을 입력하세요' },
        { t: '가치 셋', d: '세부 설명을 입력하세요' },
      ],
      floorsTitle: 'Floors', floorsSub: '층별 안내',
      // 층별 바로가기 버튼(키 = 층 번호, 지하는 -1): [{label, link}] — 편집 모드에서 추가·수정·삭제.
      // 아직 홈페이지에서 손대지 않은 층은 예약 시스템 관리자 '층별 안내'의 links를 보여주고, 편집 모드를 열면 그 링크를 복사해 와서 고칠 수 있음
      // floorLinks는 홈페이지 페이지로 가는 기본 버튼(아론홀·샤론홀) — 손대지 않은 층은 floorLinks + 관리자 links를 함께 보여줌
      floorBtns: {},
      // 층별 글(키 = 층 번호): {name, mainTitle, desc} — 편집 모드를 열면 관리자 층별 안내의 내용을 복사해 와서 고칠 수 있음
      floorText: {},
      // 관리자 층별 안내에 없는 층을 홈페이지에서만 추가(층 번호 순서대로 함께 정렬) — 이름·공간 이름·설명은 편집 모드에서 수정
      extraFloors: [
        { name: 'B3–B5', mainTitle: '주차장', body: '' },
      ],
      floorLinks: {
        '6': [{ label: '샤론홀', link: './?page=sharon' }],
        '2': [{ label: '아론홀', link: './?page=aaron' }],
      },
      blocks: [],
    },
    guide: {
      eyebrow: 'Visitor Guide', title: '방문가이드',
      lead: '아이엠센터를 찾아오시는 길과 이용 안내입니다.',
      img: '',
      // 예전 임시 블록(주차·편의 시설·대중교통)은 아래 탭 내용으로 옮김 — 손대지 않은 예전 기본값은 LEGACY_DEFAULTS가 비움
      blocks: [],
      // 탭 4개(오시는 길·주차안내·편의시설·휠체어 이용안내) — 주소 ./?page=guide&tab=parking 처럼 바로 열 수 있음
      tabs: { way: '오시는 길', parking: '주차안내', amenity: '편의시설', wheel: '휠체어 이용안내' },
      way: {
        mapImg: '',   // 약도 사진(비어 있으면 방문자 화면에서 숨김)
        kakaoLabel: '카카오채널 ‘아이엠센터’', kakaoLink: '',
        transportEn: 'Getting Here', transportTitle: '교통 안내',
        qrImg: '', qrNote: 'QR 코드를 스캔하여 아이엠센터 카카오채널을 추가해 주세요.',
        // 교통 안내 상자: h 제목, rows[{label 구분(비워도 됨), tone 'blue'|'yellow'|'red'|'' 구분 글자색, text 내용(굵게 가능)}]
        transport: [
          { h: '지하철', rows: [
            { label: '', tone: '', text: '**신분당선** 광교중앙역 1번 출구\n도보 이동 (약 30분 소요)\n또는 광교중앙.경기도청.아주대역 환승센터(지하 1층)에서 버스 마을1, 마을7 이용' },
          ] },
          { h: '버스', rows: [
            { label: '일반 버스', tone: 'blue', text: '3, 10, 10-2, 10-5, 15-1, 27, 37, 65, 66, 66-4, 720-1, 720-3, 201, 999' },
            { label: '마을 버스', tone: 'yellow', text: '마을1, 마을7' },
            { label: '좌석 버스', tone: 'red', text: '1007-1' },
          ] },
          { h: '자동차', rows: [
            { label: '', tone: '', text: '경부고속도로(수원 I.C.) → 수원 진입 → 광교호수공원 → 아이엠센터' },
            { label: '', tone: '', text: '영동고속도로(동수원 I.C.) → 월드컵경기장 → 아주대학교 → 국토지리원' },
          ] },
        ],
      },
      parking: {
        mapImg: '',   // 주차 지도 사진
        noticeEn: 'Parking', noticeTitle: '주차안내',
        notice: [
          '주차장이 협소하여 상시 만차되오니,\n가급적 대중교통을 이용해 주시기 바랍니다.',
          '**아이엠센터 건물 지하 주차장**과 **에덴 주차타워**를 이용할 수 있습니다.',
          '**학교 건물 내 지하주차장은 이용 불가**합니다.',
        ],
        feeEn: 'Fees', feeTitle: '주차 요금',
        cols: { a: '아이엠센터 지하주차장', b: '에덴 주차타워' },
        fees: [
          { k: '기본 요금', a: '평일 기본 30분 무료\n토·일 기본 3시간 무료\n*매장 2곳 이용 시 합산 가능, 최대 4시간 무료', b: '평일·일요일 기본 3시간 무료\n토요일 기본 8시간 무료' },
          { k: '초과 10분당', a: '300원', b: '300원' },
          { k: '1일 최대요금', a: '20,000원', b: '20,000원' },
        ],
      },
      amenity: {
        en: 'Amenities', title: '편의시설',
        // 입점 시설: 사진·이름·설명·연락(label 문의/예약 + contact 번호 — 번호가 비어 있으면 그 줄은 숨김)
        stores: [
          { name: '이마트24', img: '', label: '문의', contact: '',
            desc: '발달장애인과 비장애인이 함께 근무하는,\n모두가 이용할 수 있는 쾌적한 편의점입니다.' },
          { name: '여유 앤 미', img: '', label: '예약', contact: '',
            desc: '기독 서적과 말씀 묵상에 도움이 되는 소품을 판매하며,\n꽃으로 예수님의 사랑과 축복을 전합니다.\n꽃다발 구매를 원하실 경우, 일주일 전 전화로 예약하실 수 있습니다.' },
          { name: '차폰팩토리', img: '', label: '예약', contact: '',
            desc: '사골 육수 베이스의 짬뽕과 건강한 맛의 짜장,\n기존의 중식과는 다른 고급스러운 맛을 고객에게 선물합니다.' },
          { name: '반석한의원', img: '', label: '문의', contact: '',
            desc: '비염, 알러지, 통증 클리닉,\n아토피 등을 전문으로 치료합니다.' },
          { name: '조스테이블', img: '', label: '문의', contact: '',
            desc: '장애인 표준사업장으로 운영되는 조스테이블은\n커피와 파이를 통해 모두가 함께 살아가는 사회를 만들어 갑니다.' },
        ],
      },
      wheel: {
        en: 'Accessibility', title: '휠체어 이용안내',
        img: '',   // 장애인 주차구역 사진
        text: '아이엠센터 지하에 장애인 전용주차구역이 배정되어 있습니다.',
      },
    },
    // 아론홀·샤론홀: 사진·층은 공간 관리(spaces)에서, 소개·시설 안내 표·이용 안내는 홈페이지 전용(아래)으로 보여줌
    // facts: 시설 안내 표 [{k, v}] — 값이 비어 있는 줄은 방문자 화면에서 숨김 / usage: 이용 안내 목록(굵게 가능)
    aaron: {
      eyebrow: 'Seminar Room · 2F', title: '아론홀', lead: '세미나 · 강의 · 소모임',
      img: '', space: '아론홀', blocks: [],
      headline: '케이터링이 가능한 **소규모 세미나실**',
      intro: '아이엠센터 2층에 자리한 아론홀은 공동체 안에서\n영적인 기쁨을 나누고 교제하는 특별한 기독교 문화 공간입니다.\n세미나 · 강의 · 소규모 모임에 적합한 공간으로 케이터링 이용이 가능합니다.',
      ctaText: '대관하기', ctaLink: './?page=rental&tab=seminar',
      factsEn: 'Facilities', factsTitle: '시설 안내',
      facts: [
        { k: '면적', v: '174.5㎡' },
        { k: '수용 인원', v: '최소 15명 ~ 최대 50명' },
        { k: '테이블·의자', v: '의자 48개\n책상 8개\n미니 단상 1대' },
        { k: '음향·영상', v: '무선마이크 2대\n마이크 스탠드 1개\n스피커 2대\nTV 1대 (위치 고정, HDMI 선 제공)' },
      ],
      usageEn: 'Guidelines', usageTitle: '이용 안내',
      usage: [
        '**09:00 ~ 22:00 (월~토) · 일요일은 이용 불가**',
        '기본 부속시설 세팅은 관리자에 의해 제공되며,\n이후 장비 조작 및 변경은 사전 협의 없이 불가합니다.',
        '테이블 및 의자는 간단한 위치 조정만 가능하며, 기본 배치를 벗어나는\n대규모 이동 및 재배치는 제한되오니 양해 부탁드립니다.',
        '공간 특성상 소음이 큰 행사는 제한됩니다.\n(악기 연주, 개인 스피커 등 사용이 어렵습니다.)',
        '발생한 음식물 쓰레기는 직접 수거 및 반출을 원칙으로 합니다.',
        '공간 및 장비 훼손 발생 시 별도 비용이 청구됩니다.',
      ],
    },
    sharon: {
      eyebrow: 'Seminar Room · 6F', title: '샤론홀', lead: '세미나 · 워크숍 · 모임',
      img: '', space: '샤론홀', blocks: [],
      headline: '**소규모 세미나실**',
      intro: '아이엠센터 6층에 자리한 샤론홀은 공동체 안에서\n영적인 기쁨을 나누고 교제하는 특별한 기독교 문화 공간입니다.\n세미나 · 강의 · 소규모 모임에 적합한 공간으로 케이터링 이용이 가능합니다.\n단, 카펫이 설치된 공간으로 홀 내부에는 생수를 제외한 음식·음료 반입이 제한됩니다.',
      ctaText: '대관하기', ctaLink: './?page=rental&tab=seminar',
      factsEn: 'Facilities', factsTitle: '시설 안내',
      facts: [
        { k: '면적', v: '' },
        { k: '수용 인원', v: '최소 50명 ~ 최대 140명' },
        { k: '테이블·의자', v: '의자 80개 (60개 추가 가능)\n라이프타임 원형 테이블 10개\n미니 단상 1대' },
        { k: '음향·영상', v: '무선마이크 2대\n유선마이크 2대\n마이크 스탠드 1개\n스피커 2대\nTV 62인치 2대 (위치 고정, HDMI 선 제공)' },
        { k: '악기', v: '키보드 1대 (YAMAHA CK88)\n보면대 6개' },
      ],
      usageEn: 'Guidelines', usageTitle: '이용 안내',
      usage: [
        '**09:00 ~ 22:00 (월~토) · 일요일은 이용 불가**',
        '샤론홀은 카펫이 설치된 공간으로,\n**생수를 제외한 모든 음식 및 음료 반입이 제한**됩니다.',
        '기본 부속시설 세팅은 관리자에 의해 제공되며, 장비 조작 및 변경은 사전 협의 후 진행 가능합니다.',
        '의자, 테이블 세팅은 세미나의 형태에 따라 변경할 수 있습니다.',
        '이용 후 공간 및 장비는 원상 복구해 주시기 바랍니다.',
        '공간 특성상 소음이 큰 행사는 제한됩니다.\n(음악이 중심되는 행사는 진행이 어렵습니다.)',
        '**음식물 섭취 및 고의·부주의로 인한 시설물 훼손을 엄격히 금지합니다.**',
        '시설물을 훼손하거나 파손할 경우 원상 복구 및 수리·교체에 소요되는 비용이 청구될 수 있으며,\n시설물 훼손으로 인한 모든 책임은 행위자에게 있음을 알려드립니다.',
      ],
    },
    // 아이엠홀 세부 페이지(./?page=hall)
    // specs: 시설 안내·무대 안내 표 [{h 제목, rows[{k, v}]}] — 값이 비어 있는 줄은 방문자 화면에서 숨김
    hall: {
      eyebrow: 'Performance Hall · B1–B2', title: '아이엠홀', lead: '785석 규모의 다목적 공연장',
      imgs: [], blocks: [],
      headline: '다양한 장르의 공연을 아우르는 **785석 규모의 전문 공연장**',
      intro: '세미나부터 오케스트라, 뮤지컬, 연극, 무용, 콘서트까지 다양한 장르의\n공연과 행사를 선보일 수 있는 785석 규모의 다목적 공연장입니다.\n\n지하 2층은 평면형 객석, 지하 1층은 계단식 객석으로 구성되어 있으며,\n지하 1층에는 휠체어석이 구비되어 있어\n관객의 편안하고 안전한 관람을 지원합니다.',
      // 숫자 띠(어두운 배경) — 메인 'WHY I AM CENTER'의 숫자 칸과 같은 모양
      stats: [
        { n: '785', unit: '석', title: '총 객석', desc: '일반 747 · 휠체어 12 · Z석 26' },
        { n: '1,014', unit: 'm²', title: '홀 면적', desc: '객석 면적 922m²' },
        { n: '91.67', unit: 'm²', title: '무대 면적', desc: 'LED 앞 제외 · 무대 높이 0.6m' },
        { n: '8.5', unit: 'm', title: '천정 높이', desc: '백스테이지 천정 높이 2.2m' },
      ],
      seatEn: 'Seating', seatTitle: '좌석안내', seatImg: '',
      stageEn: 'Stage Plan', stageTitle: '무대 도면',
      specs: [
        { en: 'Facilities', h: '시설 안내', rows: [
          { k: '일반 객석 수', v: '747석' },
          { k: '휠체어석 수', v: '12석' },
          { k: 'Z석 수', v: '26석' },
          { k: '홀 면적', v: '1,014m²' },
          { k: '객석 면적', v: '922m²' },
        ] },
        { en: 'Stage', h: '무대 안내', rows: [
          { k: '무대 면적', v: '91.67m² (LED 앞 제외)' },
          { k: '무대 높이', v: '0.6m' },
          { k: '천정 높이', v: '8.5m' },
          { k: '백스테이지 천정 높이', v: '2.2m' },
          { k: '프로젝터', v: '1920*1080 (16:9)' },
          { k: 'LED', v: '1920*1080 (16:9)' },
        ] },
      ],
      stageImg: '',   // 무대 도면
      note: '*음향, 조명, 영상 장비 목록을 제공하고 있습니다.\n필요하신 경우 요청해 주시기 바랍니다.',
      ctaText: '대관하기', ctaLink: './?page=rental&tab=hall',
    },
    // 대관신청 페이지(./?page=rental) — 탭 2개(아이엠홀·세미나실), ./?page=rental&tab=seminar 로 바로 열기
    // 대관 규약·환불 규정은 확정 전이라 rulesHidden: true(방문자에게 숨김) — 편집 모드에서 ‘방문자에게 보이기’로 켬
    // 대관 일정 페이지(./?page=schedule) — 아론홀·샤론홀 탭, 월간 달력은 예약 시스템의 공개 사본(publicReservations, 확정만)·차단일(blockedDates)을 읽어 그림
    // 개인정보 보호를 위해 시간만 보여주고 행사명·단체명은 보여주지 않음(예약 시스템 공개 캘린더와 같은 기준)
    schedule: {
      eyebrow: 'Schedule', title: '대관 일정', lead: '아론홀·샤론홀의 예약 현황입니다. 날짜를 누르면 그날 예약된 시간을 볼 수 있어요.',
      blocks: [],
      tabs: { aaron: '아론홀', sharon: '샤론홀' },
      note: '표시된 시간은 확정된 예약입니다. 비어 있는 시간도 사정에 따라 대관이 어려울 수 있으니 신청 전 문의해 주세요.',
      ctaText: '대관 신청하기', ctaLink: './?page=rental&tab=seminar',
    },
    rental: {
      eyebrow: 'Rental', title: '대관신청', lead: '아이엠홀과 세미나실의 대관 절차와 이용료를 안내합니다.',
      img: '', blocks: [],
      tabs: { hall: '아이엠홀', seminar: '세미나실', apply: '온라인 신청' },
      stepsEn: 'Process', stepsTitle: '대관 절차',
      contactEn: 'Contact', contactTitle: '대관 문의',
      email: 'iamspace@suwoncca.org', tel: '070-7018-1439',
      applyText: '온라인 신청하기', applyLink: './?page=rental&tab=apply',
      formsTitle: '양식 다운로드',
      // 온라인 신청 탭(./?page=rental&tab=apply) — 예약 시스템 venue-apply.html과 같은 내용을 venue_requests에 저장(인트라넷 '대관 신청 관리'에서 처리)
      apply: {
        en: 'Application', title: '온라인 대관 신청',
        intro: '외부 단체·기관의 세미나실(아론홀·샤론홀) 대관 신청서입니다.\n신청서를 보내 주시면 담당자가 확인 후 연락드립니다. **신청서 제출만으로 예약이 확정되지는 않습니다.**',
        hallNote: '아이엠홀 대관은 공연 계획 등 협의가 필요해 전화·이메일로 먼저 문의해 주세요.',
        doneTitle: '대관 신청이 접수되었습니다',
        doneText: '신청해 주셔서 감사합니다.\n담당자가 내용을 확인한 뒤 연락드리겠습니다.',
      },
      rulesHidden: true,
      hall: {
        steps: [
          { t: '대관 문의', d: '대관 현황 확인(온라인, 전화 문의)' },
          { t: '신청서 작성', d: '온라인(이메일, 사이트)\n제출 서류: 예약 신청서, 공연 계획서' },
          { t: '대관 심의', d: '대관 현황 확인' },
          { t: '대관 승인서 발송', d: '계약서 작성 및 계약금 납부' },
          { t: '스태프 미팅', d: '기술 감독 및 하우스매니저 현장 미팅\n잔금 및 부대시설료 납부' },
          { t: '공연 진행', d: '사용자 준수 사항 확인' },
        ],
        // 양식 파일 버튼 — 링크가 비어 있으면 방문자 화면에서 숨김(편집 모드 🔗로 파일 주소 입력)
        forms: [{ label: '예약신청서 양식', link: '' }, { label: '공연계획서 양식', link: '' }],
        feeEn: 'Fees', feeTitle: '대관료', feeUnit: '(단위: 원 / 부가세 별도)',
        cols: { r: '리허설', p: '공연' },
        // g 구분(같은 구분이 이어지면 한 칸으로 합쳐 보임), k 항목, r 리허설, p 공연 — one: true면 리허설·공연을 한 칸으로
        // 금액이 비어 있으면 방문자 화면에 ‘별도 문의’로 표시
        fees: [
          { g: '기본시설', k: '세미나', r: '-', p: '2,500,000~ (회당)' },
          { g: '기본시설', k: '대중공연, 밴드', r: '-', p: '5,000,000~ (회당)' },
          { g: '기본시설', k: '댄스', r: '-', p: '3,500,000~ (회당)' },
          { g: '기타대관', k: '촬영 대관 (3시간 기준)', one: true, p: '' },
          { g: '기타대관', k: '촬영 대관 (3시간 초과 시 시간당)', one: true, p: '' },
          { g: '기타대관', k: '녹음 대관 (3시간 기준)', one: true, p: '' },
          { g: '기타대관', k: '영화 상영 (회당)', one: true, p: '' },
          { g: '기타 시설', k: '지하 1층 로비 사용 (회당)', one: true, p: '' },
          { g: '기타 시설', k: '지하 2층 로비 사용 (회당)', one: true, p: '' },
          { g: '기타 시설', k: '세미나실(2F) 사용', one: true, p: '200,000 (3시간 기준)' },
          { g: '기타 시설', k: '세미나실(6F) 사용', one: true, p: '300,000 (3시간 기준)' },
        ],
        remarksTitle: '비고',
        remarks: [
          '**사용료 포함 내역**\n기본 무대 및 조명, 객석, 전기료\n공연장 냉난방비, 기술감독 1인 인건비, 대기실 2개실 기본 제공\n무대 전환 및 객석 안내 등 공연에 필요한 인원은 주최사 준비 인원\n※ 공연대관: 공연 시작 1시간 전 ~ 공연 종료',
          '**사용 시간**\n(월~토) 09:00~22:00',
          '개별 기준에서 정하고 있는 각 기본 사용시간 미만 사용 시 기본시간 적용',
          '**초과시간 이용료 산정 기준**\n1시간 미만: 해당 회차 사용료의 30%\n1시간 이상: 다음 회차 사용료 전액\n※ 22시 이후 초과 사용은 사전 협의 시에만 가능(초과 1시간당 적용, 1시간 미만은 1시간으로 산정)',
          '**각 대기실별 면적**\nVIP대기실(4인)\n니고데모홀(20인): 37.7m²',
          '로비 사용의 경우 허가하는 사항에 대해서만 설치 운영 가능하며, 설치/철수에 따른 시설물 파손 시 변상해야 함.',
        ],
        notes: [
          '*사용 인원 250명 이상부터 예약 가능합니다. (스태프 및 관객 포함)',
          '*추가 대기 장소 및 음식물 섭취 공간이 필요하신 경우 세미나실(2F, 6F)을 예약하실 수 있습니다.',
        ],
        rulesEn: 'Terms', rulesTitle: '대관 규약',
        rules: [
          '예약은 계약금(이용료의 30%) 입금 시 확정됩니다.',
          '잔금은 이용일 30일 전까지 납부해 주시기 바랍니다.',
          '예약은 결제 완료 순으로 확정되며,\n일정은 상황에 따라 선착순으로 마감될 수 있습니다.',
          '평일 17:00 이후 또는 주말 · 공휴일 이용 시\n운영 인력 배치에 따라 추가 비용이 발생할 수 있습니다.',
          '추가 비용이 필요한 경우 예약 확정 전 사전 안내 및 협의 후 진행됩니다.',
        ],
        refundEn: 'Refund Policy', refundTitle: '취소 및 환불규정',
        refund: [
          '이용일 30일 이전 취소: 50% 환불',
          '이용일 30일 전 ~ 당일 취소: 환불 불가',
        ],
      },
      seminar: {
        steps: [
          { t: '대관 문의', d: '대관 현황 확인(온라인, 전화 문의)' },
          { t: '신청서 작성', d: '온라인(이메일, 사이트)\n제출 서류: 예약 신청서' },
          { t: '대관 심의', d: '대관 현황 확인' },
          { t: '대관 승인서 발송', d: '계약서 작성 및 계약금 납부' },
          { t: '행사 진행', d: '사용자 준수사항 확인' },
        ],
        forms: [{ label: '예약신청서 양식', link: '' }],
        feeEn: 'Fees', feeTitle: '대관료', feeUnit: '',
        cols: { k: '구분', time: '기본시간', fee: '사용료' },
        cards: [
          { name: '아론홀(2F)', rows: [
            { k: '기본', time: '3시간', fee: '200,000\n(준비 및 철수 포함)' },
            { k: '단시간', time: '90분 이내', fee: '100,000\n(준비 및 철수 포함)' },
            { k: '추가', time: '1시간당', fee: '50,000' },
          ] },
          { name: '샤론홀(6F)', rows: [
            { k: '기본', time: '3시간', fee: '300,000\n(준비 및 철수 포함)' },
            { k: '단시간', time: '90분 이내', fee: '150,000\n(준비 및 철수 포함)' },
            { k: '추가', time: '1시간당', fee: '80,000' },
          ] },
        ],
        notes: [
          '* 90분 초과 시 기본 이용 요금을 적용',
          '* 이용 시간은 입실부터 퇴실까지 전체 기준으로 산정',
          '* 초과 시간이 1시간 미만인 경우에도 1시간 추가로 요금을 적용',
        ],
        rulesEn: 'Terms', rulesTitle: '대관 규약',
        rules: [
          '예약은 계약금(이용료의 30%) 입금 시 확정됩니다.',
          '잔금은 이용일 7일 전까지 납부해 주시기 바랍니다.',
          '예약은 결제 완료 순으로 확정되며,\n일정은 상황에 따라 선착순으로 마감될 수 있습니다.',
          '평일 17:00 이후 또는 주말 · 공휴일 이용 시\n운영 인력 배치에 따라 추가 비용이 발생할 수 있습니다.',
          '추가 비용이 필요한 경우 예약 확정 전 사전 안내 및 협의 후 진행됩니다.',
        ],
        refundEn: 'Refund Policy', refundTitle: '취소 및 환불규정',
        refund: [
          '이용일 15일 이전 취소: 100% 환불',
          '이용일 7일 ~ 14일 전 취소: 50% 환불',
          '이용일 2일 ~ 6일 전 취소: 20% 환불',
          '이용일 1일 전 ~ 당일 취소: 환불 불가',
        ],
      },
    },
  },
  hero: {
    eyebrow: 'Suwon · Gwanggyo — 복합문화공간',
    title1: 'THE GREAT',
    title2: 'I AM',
    title3: 'CENTER',
    lead: 'THE GREAT I AM 되신 예수님을 만나는 곳.\n공연장·세미나실·상업시설이 한 자리에서 “통합”의 가치로 이어집니다.',
    slides: [
      { img: '', caption: '아이엠홀 — 785석 다목적 공연장', tag: 'PHOTO 01 · 아이엠홀 객석에서 무대 방향 · 조명 ON · 가로 16:9',
        g: 'radial-gradient(60% 70% at 50% 18%,#6b5a43 0%,#2b241c 38%,#0b0a09 75%)' },
      { img: '', caption: '아이엠센터 전경', tag: 'PHOTO 02 · 건물 전경 · 해질녘(매직아워) · 가로 16:9',
        g: 'linear-gradient(180deg,#2f3a46 0%,#1b222a 55%,#0e1114 100%)' },
      { img: '', caption: '조스테이블 — 함께 일하는 카페', tag: 'PHOTO 03 · 조스테이블 내부 · 자연광 · 사람 있는 장면',
        g: 'radial-gradient(70% 80% at 30% 40%,#7a6448 0%,#3a2e22 45%,#14100c 100%)' },
    ],
  },
  whatson: {
    title: "What's On",
    sub: '아이엠센터에서 열리는 공연과 행사',
  },
  about: {
    eyebrow: 'Why I AM Center',
    statement: '서로 다른 공간이 하나의 정체성 안에서\n“통합”의 가치로 이어집니다. 무대와 일터, 배움과 쉼이 한 건물 안에서 만납니다.',
    // 큰 문구 아래 공간 소개 문구 + 버튼 두 개(대관하기·문의하기)
    intro: '아이엠센터는 다양한 장르의 공연이 가능한\n785석 규모의 공연장 아이엠홀과\n소규모 세미나가 가능한 세미나실\n아론홀과 샤론홀을 보유하고 있습니다.',
    cta1: '대관하기', cta1Link: './?page=rental',
    cta2: '문의하기', cta2Link: './?page=rental#contact',
    stats: [
      { n: '785', unit: '석', title: '다목적 공연장', desc: '세미나부터 콘서트까지 품는 아이엠홀' },
      { n: '함께', unit: '', title: '통합 고용', desc: '발달장애인과 비장애인이 함께 근무하는 조스테이블' },
      { n: '2', unit: '곳', title: '편리한 주차', desc: '아이엠센터 주차장 · 에덴 주차타워 이용 가능' },
      { n: '전 층', unit: '', title: '배리어프리', desc: '엘리베이터 이동, 장애인 화장실·휠체어석 완비' },
    ],
  },
  spaces: {
    title: 'Spaces',
    sub: '공연부터 모임까지, 아이엠센터의 공간',
    moreText: '공간 전체 보기',
    moreLink: 'https://iamreservation.web.app/venue-spaces.html',
    items: [
      { name: '아이엠홀', desc: '785석 · 공연 · 예배 · 컨퍼런스', img: '', link: './?page=hall', tag: 'PHOTO · 아이엠홀 무대→객석 와이드',
        g: 'radial-gradient(70% 70% at 50% 30%,#5d4a36,#1c1712 70%)' },
      { name: '아이엠센터', desc: '센터 소개 · 층별 안내', img: '', link: '#', tag: 'PHOTO · 건물 전경 세로컷',
        g: 'linear-gradient(180deg,#36424e,#151a20)' },
      { name: '아론홀', desc: '세미나 · 강의 · 소모임', img: '', link: 'https://iamreservation.web.app/venue-spaces.html', tag: 'PHOTO · 아론홀 세팅 컷',
        g: 'linear-gradient(160deg,#6d6a63,#2b2a27)' },
      { name: '샤론홀', desc: '세미나 · 워크숍 · 모임', img: '', link: 'https://iamreservation.web.app/venue-spaces.html', tag: 'PHOTO · 샤론홀 세팅 컷',
        g: 'linear-gradient(160deg,#58605a,#202421)' },
      { name: '조스테이블', desc: '함께 일하는 카페 · 통합 고용', img: '', link: '#', tag: 'PHOTO · 조스테이블 사람 있는 장면',
        g: 'radial-gradient(80% 80% at 30% 40%,#8a6f4e,#2e241a 75%)' },
    ],
    amenities: [
      { name: '여유앤미', note: '입점 시설', link: '#' },
      { name: '차폰팩토리', note: '입점 시설', link: '#' },
      { name: '반석한의원', note: '입점 시설', link: '#' },
      { name: '주차 안내', note: '에덴 주차타워', link: '#visit' },
    ],
  },
  notice: {
    title: 'Notice',
    sub: '대관 및 이용 안내',
    // 홈페이지 전용 공지 — 인트라넷 notices와 별개, 편집 모드에서 추가·수정·삭제 (최신 글을 위에)
    items: [
      { category: '대관', title: '아이엠홀 하반기 대관 일정 안내', date: '2026.09.08' },
      { category: '이용', title: '아론홀·샤론홀 이용 규정 안내', date: '2026.08.27' },
      { category: '안내', title: '아이엠센터 주차 안내 업데이트', date: '2026.07.30' },
    ],
    rentEyebrow: 'Rental',
    rentTitle: '공간이\n필요하신가요?',
    rentDesc: '아이엠홀 · 아론홀 · 샤론홀 대관 절차와 일정을 친절히 안내해 드립니다.',
    steps: ['일정·공간 확인', '대관 신청서 접수', '상담 및 승인', '계약 및 이용'],
    cta1: '대관 문의하기', cta1Link: 'https://iamreservation.web.app/venue-spaces.html',
    cta2: '대관 일정 보기', cta2Link: './?page=schedule',
  },
  visit: {
    title: 'Visit',
    sub: '오시는 길 · 이용 시간',
    address: '경기도 수원시 영통구 월드컵로 76 아이엠센터',
    hours: '매일 08:00 – 22:00 (공휴일 제외)',
    parking: '아이엠센터 주차장 · 에덴 주차타워',
    phone: '070-7018-1439',
    // 지도: 사진(mapImg)이 없으면 주소로 구글 지도를 바로 보여줌 — 추후 카카오/네이버 지도 API로 교체 가능
    // 지도 버튼·지도 사진 클릭 시 이동: 네이버 플레이스(스마트플레이스 등록 페이지)
    placeLink: 'https://naver.me/x9VaOiSS',
    placeLabel: '네이버 지도로 보기',
    mapImg: '',
  },
  footer: {
    desc: '경기도 수원시 영통구 월드컵로 76 아이엠센터\n매일 08:00 – 22:00 (공휴일 제외)',
    instagram: '#',
    youtube: '#',
    // 푸터 '유관기관' 버튼을 누르면 펼쳐지는 목록 — 링크가 비어 있으면 이름만 보임(편집 모드에서 🔗로 주소 입력)
    orgs: [
      { label: '마더와이즈', link: '' },
      { label: '원천침례교회', link: '' },
      { label: '브솔복지재단', link: 'https://www.besor.kr/' },
      { label: '중앙기독학교', link: '' },
    ],
    // 대표 전화·사업자등록번호(비어 있으면 숨김)·카카오채널 링크(비어 있으면 숨김)
    tel: '070-7018-1439', bizNo: '', kakaoLink: '',
    // INFO 링크 — FAQ·개인정보처리방침은 페이지가 준비되면 편집 모드 🔗로 주소 입력(비어 있으면 이름만 흐리게)
    faqLink: '', privacyLink: '',
    bottom: '',
  },
};

// 예전 기본값 그대로 게시된 칸(한 번도 고치지 않은 칸)만 새 기본값으로 바꿔 보여줌 — 직접 고친 글은 그대로 둠
// (게시하면 저장본 전체가 기록되므로, 예전 기본 문구가 저장본에 남아 있어도 새 안내가 보이게 하기 위함)
const LEGACY_DEFAULTS = [
  ['hero.slides.0.caption', '아이엠홀 — 760석 다목적 공연장'],
  ['about.stats.0.n', '760'],
  ['spaces.items.0.desc', '760석 · 공연 · 예배 · 컨퍼런스'],
  ['spaces.items.0.link', '#'],
  ['visit.phone', '대표 전화 안내 예정'],
  ['notice.cta2Link', 'https://iamreservation.web.app/cal-public.html'],
  ['pages.rental.applyLink', 'https://iamreservation.web.app/venue-apply.html'],
  ['nav.seminar', [{ label: '아론홀(2F)', link: './?page=aaron' }, { label: '샤론홀(6F)', link: './?page=sharon' }]],
  ['footer.bottom', '대표 전화 · 사업자등록번호 안내 예정'],
  ['pages.guide.blocks', [
    { h: '주차', p: '아이엠센터 주차장과 에덴 주차타워를 이용하실 수 있습니다.' },
    { h: '편의 시설', p: '전 층 엘리베이터로 이동할 수 있으며, 장애인 화장실과 휠체어석을 갖추고 있습니다.' },
    { h: '대중교통', p: '안내 예정입니다.' },
  ]],
  // 부속시설을 한 칸에 몰아 쓰던 예전 기본값 → 테이블·의자 / 음향·영상 / 악기로 나눈 새 기본값
  ['pages.aaron.facts', [
    { k: '면적', v: '174.5㎡' },
    { k: '수용 인원', v: '최소 15명 ~ 최대 50명' },
    { k: '부속시설', v: '의자 48개\n책상 8개\n미니 단상 1대\n무선마이크 2대\n마이크 스탠드 1개\n스피커 2대\nTV 1대 (위치 고정, HDMI 선 제공)' },
  ]],
  ['pages.sharon.facts', [
    { k: '면적', v: '' },
    { k: '수용 인원', v: '최소 50명 ~ 최대 140명' },
    { k: '부속시설', v: '의자 80개 (60개 추가 가능)\n라이프타임 원형 테이블 10개\n미니 단상 1대\n무선마이크 2대, 유선마이크 2대\n마이크 스탠드 1개\n보면대 6개\n스피커 2대\nTV 62인치 2대 (위치 고정, HDMI 선 제공)\n키보드 (모델명: YAMAHA CK88)' },
  ]],
];

// 저장된 문서에 빠진 항목은 기본값으로 채움 (새 항목을 추가해도 기존 저장본이 깨지지 않게)
export function mergeContent(saved) {
  const out = structuredClone(DEFAULT_CONTENT);
  if (!saved || typeof saved !== 'object') return out;
  const deep = (base, src) => {
    for (const k of Object.keys(src)) {
      const v = src[k];
      if (Array.isArray(v)) {
        if (Array.isArray(base[k]) && base[k].length && typeof base[k][0] === 'object' && !Array.isArray(base[k][0]) && k !== 'sections') {
          base[k] = v.map((item, i) => (item && typeof item === 'object') ? deep(structuredClone(base[k][i] || {}), item) : item);
        } else base[k] = structuredClone(v);
      } else if (v && typeof v === 'object' && !(v.toDate)) {
        base[k] = deep(base[k] && typeof base[k] === 'object' ? base[k] : {}, v);
      } else if (v !== undefined) base[k] = v;
    }
    return base;
  };
  deep(out, saved);
  // (Firestore는 객체의 키 순서를 바꿔 돌려주므로 키를 정렬해서 비교)
  const same = (x, y) => JSON.stringify(x, (k, v) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort()) : v)) ===
    JSON.stringify(y, (k, v) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort()) : v));
  for (const [path, old] of LEGACY_DEFAULTS) {
    if (same(getPath(out, path), old)) setPath(out, path, structuredClone(getPath(DEFAULT_CONTENT, path)));
  }
  // 조직도 페이지는 2026-10 삭제 — 예전에 게시된 메뉴에 남은 조직도 링크는 빼고 보여줌(다음 게시 때 저장본에서도 빠짐)
  if (Array.isArray(out.nav?.center)) out.nav.center = out.nav.center.filter(x => !/[?&]page=org\b/.test(String(x?.link || '')));
  // 섹션 목록: 저장 순서 유지 + 새로 생긴 섹션은 끝에 추가 + 없어진 섹션 제거
  const seen = new Set();
  out.sections = (out.sections || []).filter(s => SECTION_IDS.includes(s.id) && !seen.has(s.id) && seen.add(s.id));
  SECTION_IDS.forEach(id => { if (!seen.has(id)) out.sections.push({ id, hidden: false }); });
  return out;
}

// 'hero.slides.0.img' 같은 경로로 값 읽기/쓰기
export function getPath(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}
export function setPath(obj, path, value) {
  const ks = path.split('.');
  let o = obj;
  for (let i = 0; i < ks.length - 1; i++) {
    if (o[ks[i]] == null) o[ks[i]] = /^\d+$/.test(ks[i + 1]) ? [] : {};
    o = o[ks[i]];
  }
  o[ks[ks.length - 1]] = value;
}

// 링크 주소 다듬기: 'www.example.org'처럼 https:// 없이 적은 주소는 https://를 붙여 줌
// (편집 모드 링크 입력 + 이미 저장된 값 모두에 적용)
export function normalizeLink(u) {
  const s = String(u || '').trim();
  if (/^(www\.|[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}(:\d+)?([/?#]|$))/i.test(s) && !/^[a-z][a-z0-9+.-]*:/i.test(s)) return 'https://' + s;
  return s;
}
