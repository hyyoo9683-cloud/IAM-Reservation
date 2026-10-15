// 홈페이지 기본 문구·구성 — Firestore siteContent/homepage 문서가 없거나 항목이 비어 있을 때 사용.
// 편집 모드에서 게시하면 이 구조 그대로 siteContent/homepage 에 저장된다.
// 사진(img)은 비어 있으면 그라데이션 임시 이미지 + 촬영 가이드(tag)가 표시된다.
export const PAGE_IDS = ['about', 'org', 'guide', 'aaron', 'sharon'];
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
      { label: '조직도', link: './?page=org' },
      { label: '방문가이드', link: './?page=guide' },
    ],
    seminar: [
      { label: '아론홀(2F)', link: './?page=aaron' },
      { label: '샤론홀(6F)', link: './?page=sharon' },
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
      // 세 개의 원(벤 다이어그램) — 원마다 가치 이름(t)·짧은 설명(d), 가운데 겹치는 곳 문구(valuesCenter)
      valuesCenter: 'I AM',
      valueItems: [
        { t: '가치 하나', d: '설명을 입력하세요' },
        { t: '가치 둘', d: '설명을 입력하세요' },
        { t: '가치 셋', d: '설명을 입력하세요' },
      ],
      floorsTitle: 'Floors', floorsSub: '층별 안내',
      blocks: [],
    },
    org: {
      eyebrow: 'Organization', title: '조직도',
      lead: '아이엠센터를 섬기는 사람들을 소개합니다.',
      img: '',
      blocks: [],
    },
    guide: {
      eyebrow: 'Visitor Guide', title: '방문가이드',
      lead: '아이엠센터를 찾아오시는 길과 이용 안내입니다.',
      img: '',
      blocks: [
        { h: '주차', p: '아이엠센터 주차장과 에덴 주차타워를 이용하실 수 있습니다.' },
        { h: '편의 시설', p: '전 층 엘리베이터로 이동할 수 있으며, 장애인 화장실과 휠체어석을 갖추고 있습니다.' },
        { h: '대중교통', p: '안내 예정입니다.' },
      ],
    },
    aaron: {
      eyebrow: 'Seminar Room · 2F', title: '아론홀', lead: '세미나 · 강의 · 소모임',
      img: '', space: '아론홀', blocks: [],
    },
    sharon: {
      eyebrow: 'Seminar Room · 6F', title: '샤론홀', lead: '세미나 · 워크숍 · 모임',
      img: '', space: '샤론홀', blocks: [],
    },
  },
  hero: {
    eyebrow: 'Suwon · Gwanggyo — 복합문화공간',
    title1: 'THE GREAT',
    title2: 'I AM',
    title3: 'CENTER',
    lead: 'THE GREAT I AM 되신 예수님을 만나는 곳.\n공연장·세미나실·상업시설이 한 자리에서 “통합”의 가치로 이어집니다.',
    slides: [
      { img: '', caption: '아이엠홀 — 760석 다목적 공연장', tag: 'PHOTO 01 · 아이엠홀 객석에서 무대 방향 · 조명 ON · 가로 16:9',
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
    stats: [
      { n: '760', unit: '석', title: '다목적 공연장', desc: '세미나부터 콘서트까지 품는 아이엠홀' },
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
      { name: '아이엠홀', desc: '760석 · 공연 · 예배 · 컨퍼런스', img: '', link: '#', tag: 'PHOTO · 아이엠홀 무대→객석 와이드',
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
    cta2: '대관 일정 보기', cta2Link: 'https://iamreservation.web.app/cal-public.html',
  },
  visit: {
    title: 'Visit',
    sub: '오시는 길 · 이용 시간',
    address: '경기도 수원시 영통구 월드컵로 76 아이엠센터',
    hours: '매일 08:00 – 22:00 (공휴일 제외)',
    parking: '아이엠센터 주차장 · 에덴 주차타워',
    phone: '대표 전화 안내 예정',
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
    bottom: '대표 전화 · 사업자등록번호 안내 예정',
  },
};

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
