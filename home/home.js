// 아이엠센터 홈페이지 렌더링 — 콘텐츠(siteContent/homepage, 홈페이지 공지 포함) + 공연·행사(programs)
import { db, doc, getDoc, getDocs, collection, query, where } from './fb.js';
import { DEFAULT_CONTENT, mergeContent, getPath, PAGE_IDS, normalizeLink } from './content.js';

export const state = {
  content: structuredClone(DEFAULT_CONTENT),
  programs: [],
  editing: false,      // 편집 모드 여부 (editor.js가 켬)
  // 세부 페이지: 주소 ./?page=about 처럼 열면 메인 섹션 대신 그 페이지를 그림 (없거나 모르는 값이면 메인)
  page: (p => (PAGE_IDS.includes(p) ? p : null))(new URLSearchParams(location.search).get('page')),
  space: null,         // 공간 페이지(아론홀·샤론홀)일 때 spaces 컬렉션에서 가져온 문서
  floors: [],         // 소개 페이지의 층별 안내 — 예약 시스템 관리자 '아이엠센터 소개 > 층별 안내'(siteContent/floors) 데이터
};

export const PROGRAM_CATS = ['공연', '예배·집회', '세미나·교육', '가족·어린이', '전시', '기타'];

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ml = s => esc(s).replace(/\n/g, '<br>');            // 여러 줄 문구
// 센터 소개 큰 문구: “ ” 따옴표로 감싼 말은 굵게 (시안 v4의 <b>“통합”</b>) — 편집 때는 글자만 저장되므로 따옴표만 지키면 유지됨
// 지도 검색어: 주소에서 도로명+번지까지만(뒤에 붙은 건물 이름은 빼야 구글이 위치를 정확히 찾음)
const mapQuery = a => { const s = String(a || '').trim(); const m = s.match(/^.*?\d+(?:-\d+)?(?=\s|$)/); return m ? m[0] : s; };
// **굵게** 표시: 방문자 화면에서는 굵은 글씨로, 편집 모드에서는 ** 표시를 그대로 보여 고칠 수 있게
const mlStrong = s => ml(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
// 굵기 조절이 되는 여러 줄 글 (편집 모드에서 글자 선택 → 'B 굵게' 또는 Ctrl+B)
const rich = (path, tag = 'p', cls = '') => `<${tag}${cls ? ` class="${cls}"` : ''} data-k="${path}" data-ml="1" data-rich="1">${mlStrong(c(path))}</${tag}>`;
const mlQuoteBold = s => ml(s).replace(/“[^”<]*”/g, '<b>$&</b>');
// 홈페이지는 iamcenter.web.app(별도 사이트)에서도 열리므로, 예전에 저장된 '../x'·'/x' 같은
// 예약 시스템 쪽 상대 주소는 예약 시스템 전체 주소로 바꿔서 연결함
const MAIN_SITE = 'https://iamreservation.web.app/';
const safeUrl = u => {
  const s = normalizeLink(u);
  if (!/^(https?:|mailto:|tel:|#|\.\.?\/|\/)/i.test(s)) return '#';
  return s.replace(/^(\.\.\/)+|^\/(?!\/)/, MAIN_SITE);
};
const c = path => getPath(state.content, path);
// CSS url('...') 안에 넣을 주소: 따옴표·괄호·공백을 인코딩해 속성/스타일 탈출을 막음
const cssUrl = u => esc(safeUrl(u).replace(/['"()\s\\]/g, ch => encodeURIComponent(ch)));

// ── 편집 가능한 요소 표시 헬퍼 ─────────────────────────────────
// t: 한 줄 문구, m: 여러 줄 문구, lnk: 링크 주소 편집 대상
const t = (path, tag = 'span', cls = '') => `<${tag}${cls ? ` class="${cls}"` : ''} data-k="${path}">${esc(c(path))}</${tag}>`;
const m = (path, tag = 'p', cls = '') => `<${tag}${cls ? ` class="${cls}"` : ''} data-k="${path}" data-ml="1">${ml(c(path))}</${tag}>`;
const href = path => `href="${esc(safeUrl(c(path)))}" data-link="${path}"`;
const bg = (imgPath, gPath) => {
  const img = c(imgPath);
  if (img) return `style="--img:url('${cssUrl(img)}')" data-hasimg="1"`;
  const g = gPath ? c(gPath) : '';
  return g ? `style="--g:${esc(g)}"` : '';
};
const ARROW = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 11 11 3M5 3h6v6"/></svg>';
const CHEV_L = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 2 4 7l5 5"/></svg>';
const CHEV_R = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5"><path d="m5 2 5 5-5 5"/></svg>';

// 등록된 공연·행사가 없을 때 보여주는 예시 카드 (디자인 시안 v4 그대로) — 관리자 페이지에서
// 공개 항목을 하나라도 등록하면 이 예시는 사라지고 실제 목록으로 바뀜
const SAMPLE_TABS = ['공연', '예배·집회', '세미나·교육', '가족·어린이'];
const SAMPLE_PROGRAMS = [
  { c: '공연', k: 'CONCERT', t: '가을,<br>찬양의 밤', g: 'linear-gradient(160deg,#1d2b3a,#0a0f15)', st: '예매중', cat: '공연 · 아이엠홀', title: '가을, 찬양의 밤', date: '2026.11.07 (토) 19:30' },
  { c: '가족·어린이', k: 'FAMILY', t: '어린이<br>뮤지컬<br>‘작은 등불’', g: 'linear-gradient(160deg,#c9a24a,#6e4f1c)', st: '예매중', cat: '가족·어린이 · 아이엠홀', title: '어린이 뮤지컬 ‘작은 등불’', date: '2026.11.14 – 11.15' },
  { c: '세미나·교육', k: 'SEMINAR', t: '함께 일하는<br>공동체', g: 'linear-gradient(160deg,#d9d6cf,#9c978d)', dark: true, cat: '세미나·교육 · 아론홀', title: '통합 고용 세미나 ‘함께 일하는 공동체’', date: '2026.11.20 (금) 14:00' },
  { c: '예배·집회', k: 'GATHERING', t: '연합<br>성탄 예배', g: 'linear-gradient(160deg,#3a1e1e,#120909)', cat: '예배·집회 · 아이엠홀', title: '연합 성탄 예배', date: '2026.12.24 (목) 20:00' },
  { c: '공연', k: 'CLASSIC', t: '송년<br>클래식<br>콘서트', g: 'linear-gradient(160deg,#2c2c2c,#050505)', cat: '공연 · 아이엠홀', title: '송년 클래식 콘서트', date: '2026.12.27 (일) 17:00' },
  { c: '세미나·교육', k: 'CLASS', t: '부모<br>아카데미', g: 'linear-gradient(160deg,#47584a,#1a221c)', cat: '세미나·교육 · 샤론홀', title: '부모 아카데미 (4주 과정)', date: '2027.01 매주 화 10:00' },
];
const sampleRail = () => `
    <div class="tabs rv" role="group" aria-label="분류">
      <button aria-pressed="true" data-f="all">전체</button>
      ${SAMPLE_TABS.map(k => `<button aria-pressed="false" data-f="${k}">${k}</button>`).join('')}
    </div>
    <div class="rail rv">
      ${SAMPLE_PROGRAMS.map(p => `
      <a href="#whatson" class="card" data-c="${p.c}">
        <div class="ph" style="--g:${p.g}"><div class="poster"${p.dark ? ' style="color:#111"' : ''}><span class="k">${p.k}</span><span class="t">${p.t}</span></div></div>
        <div class="meta"><div class="cat">${p.st ? `<span class="st">${p.st}</span>` : ''}${p.cat}</div><h3>${p.title}</h3><p>${p.date}</p></div>
      </a>`).join('')}
    </div>
    <p class="sample">※ 위 공연·행사는 레이아웃 확인용 <b>예시</b>입니다. 실제 운영 시 관리자 페이지에서 등록한 프로그램이 자동으로 표시됩니다.</p>`;

// ── 섹션 템플릿 ────────────────────────────────────────────────
const SECTIONS = {
  hero() {
    const slides = c('hero.slides') || [];
    return `
<section class="hero" data-sec="hero" aria-label="메인 비주얼">
  ${slides.map((s, i) => `
  <div class="slide${i === 0 ? ' on' : ''}" data-cap="${esc(s.caption)}">
    <div class="ph" data-img="hero.slides.${i}.img" ${bg(`hero.slides.${i}.img`, `hero.slides.${i}.g`)}><span class="tag">${esc(s.tag)}</span></div>
  </div>`).join('')}
  <div class="hero-copy"><div class="wrap">
    ${t('hero.eyebrow', 'p', 'eyebrow')}
    <h1>${t('hero.title1', 'span', 'h1-pre')}<br><em>${t('hero.title2')}</em> ${t('hero.title3')}</h1>
    ${m('hero.lead', 'p', 'lead')}
  </div></div>
  <div class="hero-bar"><div class="wrap">
    <span class="cur">01</span><div class="prog"><i></i></div><span>${String(slides.length).padStart(2, '0')}</span>
    <div class="nav"><button class="prev" aria-label="이전 슬라이드">${CHEV_L}</button><button class="next" aria-label="다음 슬라이드">${CHEV_R}</button></div>
    <span class="cap">${esc(slides[0]?.caption || '')}</span>
  </div></div>
  ${state.editing ? `<div class="cap-edit">${slides.map((s, i) => `<label>슬라이드 ${i + 1} 설명 ${t(`hero.slides.${i}.caption`)}</label>`).join('')}</div>` : ''}
</section>`;
  },

  whatson() {
    const today = new Date().toISOString().slice(0, 10);
    const list = state.programs.filter(p => (p.endDate || p.startDate || '') >= today);
    const cats = PROGRAM_CATS.filter(k => list.some(p => p.category === k));
    return `
<section id="whatson" data-sec="whatson">
  <div class="wrap">
    <div class="sec-hd rv">
      <h2>${t('whatson.title')}<span class="h2sub" data-k="whatson.sub">${esc(c('whatson.sub'))}</span></h2>
      <div class="rail-ctl"><button class="rl" aria-label="이전">${CHEV_L}</button><button class="rr" aria-label="다음">${CHEV_R}</button></div>
    </div>
    ${list.length ? `
    <div class="tabs rv" role="group" aria-label="분류">
      <button aria-pressed="true" data-f="all">전체</button>
      ${cats.map(k => `<button aria-pressed="false" data-f="${esc(k)}">${esc(k)}</button>`).join('')}
    </div>
    <div class="rail rv">
      ${list.map((p, pi) => `
      <a ${p.link ? `href="${esc(safeUrl(p.link))}" target="_blank" rel="noopener"` : 'href="#whatson"'} class="card" data-c="${esc(p.category)}">
        <div class="ph poster-ph" ${p.posterUrl ? `style="--img:url('${cssUrl(p.posterUrl)}')" data-hasimg="1"` : `style="--g:${esc(posterGradient(pi))}"`}>
          ${p.posterUrl ? '' : `<div class="poster"><span class="k">${esc(p.category || '')}</span><span class="t">${esc(p.title)}</span></div>`}
        </div>
        <div class="meta">
          <div class="cat">${p.badge ? `<span class="st">${esc(p.badge)}</span>` : ''}${esc([p.category, p.venue].filter(Boolean).join(' · '))}</div>
          <h3>${esc(p.title)}</h3>
          <p>${esc(p.dateText || fmtRange(p.startDate, p.endDate))}</p>
        </div>
      </a>`).join('')}
    </div>` : sampleRail()}
    ${state.editing ? `<p class="edit-hint">공연·행사 목록은 <a href="admin.html#programs">관리자 페이지 › 공연·행사</a>에서 등록·수정합니다.</p>` : ''}
  </div>
</section>`;
  },

  about() {
    const stats = c('about.stats') || [];
    return `
<section class="statement" id="about" data-sec="about">
  <div class="wrap">
    ${t('about.eyebrow', 'p', 'eyebrow rv')}
    <p class="big rv" data-k="about.statement" data-ml="1">${mlQuoteBold(c('about.statement'))}</p>
    <div class="stats">
      ${stats.map((s, i) => `
      <div class="stat rv">
        <div class="n">${t(`about.stats.${i}.n`)}<small data-k="about.stats.${i}.unit">${esc(s.unit)}</small></div>
        ${t(`about.stats.${i}.title`, 'h3')}
        ${t(`about.stats.${i}.desc`, 'p')}
      </div>`).join('')}
    </div>
  </div>
</section>`;
  },

  spaces() {
    const items = c('spaces.items') || [];
    const am = c('spaces.amenities') || [];
    const cls = ['sp-a', 'sp-b', 'sp-c', 'sp-d', 'sp-e'];
    return `
<section id="spaces" data-sec="spaces">
  <div class="wrap">
    <div class="sec-hd rv">
      <h2>${t('spaces.title')}<span class="h2sub" data-k="spaces.sub">${esc(c('spaces.sub'))}</span></h2>
      <a ${href('spaces.moreLink')} class="more" data-k="spaces.moreText">${esc(c('spaces.moreText'))}</a>
    </div>
    <div class="spaces">
      ${items.map((s, i) => `
      <a ${href(`spaces.items.${i}.link`)} class="sp ${cls[i] || 'sp-c'} rv">
        <div class="ph" data-img="spaces.items.${i}.img" ${bg(`spaces.items.${i}.img`, `spaces.items.${i}.g`)}><span class="tag">${esc(s.tag || '')}</span></div>
        <div class="lab"><div>${t(`spaces.items.${i}.name`, 'h3')}${t(`spaces.items.${i}.desc`, 'p')}</div>${i < 2 ? `<span class="arw">${ARROW}</span>` : ''}</div>
      </a>`).join('')}
    </div>
    <div class="amen rv">
      ${am.map((a, i) => `<a ${href(`spaces.amenities.${i}.link`)}>${t(`spaces.amenities.${i}.name`)} <span data-k="spaces.amenities.${i}.note">${esc(a.note)}</span></a>`).join('')}
    </div>
  </div>
</section>`;
  },

  notice() {
    const steps = c('notice.steps') || [];
    const items = c('notice.items') || [];
    return `
<section id="notice" data-sec="notice">
  <div class="wrap split">
    <div class="rv">
      <div class="sec-hd"><h2>${t('notice.title')}<span class="h2sub" data-k="notice.sub">${esc(c('notice.sub'))}</span></h2></div>
      <div class="list">
        ${items.length ? items.map((n, i) => `<div class="row">${t(`notice.items.${i}.category`, 'span', 'c')}${t(`notice.items.${i}.title`, 'span', 'ti')}${t(`notice.items.${i}.date`, 'time')}${state.editing ? `<button type="button" class="ed-chip ghost" data-notice-del="${i}">삭제</button>` : ''}</div>`).join('')
          : '<p class="empty">등록된 공지가 없습니다.</p>'}
      </div>
      ${state.editing ? '<p class="edit-hint">공지는 글자를 눌러 바로 고치고, <button type="button" class="ed-chip" data-notice-add>+ 공지 추가</button> 로 맨 위에 새 공지를 넣습니다. 게시해야 방문자에게 보입니다.</p>' : ''}
    </div>
    <aside class="rent rv">
      ${t('notice.rentEyebrow', 'p', 'eyebrow rent-eb')}
      ${m('notice.rentTitle', 'h3')}
      ${m('notice.rentDesc', 'p')}
      <ol>${steps.map((s, i) => `<li data-k="notice.steps.${i}">${esc(s)}</li>`).join('')}</ol>
      <div class="btns">
        <a ${href('notice.cta1Link')} class="btn"><span class="dot"></span><span data-k="notice.cta1">${esc(c('notice.cta1'))}</span> <span aria-hidden="true">→</span></a>
        <a ${href('notice.cta2Link')} class="btn line" data-k="notice.cta2">${esc(c('notice.cta2'))}</a>
      </div>
    </aside>
  </div>
</section>`;
  },

  visit() {
    return `
<section class="visit" id="visit" data-sec="visit">
  <div class="wrap grid">
    <div class="rv">
      <div class="sec-hd"><h2>${t('visit.title')}<span class="h2sub" data-k="visit.sub">${esc(c('visit.sub'))}</span></h2></div>
      <dl class="info">
        <dt>주소</dt>${t('visit.address', 'dd')}
        <dt>운영 시간</dt>${t('visit.hours', 'dd')}
        <dt>주차</dt>${t('visit.parking', 'dd')}
        <dt>문의</dt>${t('visit.phone', 'dd')}
      </dl>
    </div>
    ${c('visit.mapImg') ? `
    <a ${href('visit.placeLink')} target="_blank" rel="noopener" class="ph map rv" data-img="visit.mapImg" ${bg('visit.mapImg')} aria-label="지도에서 보기"></a>` : `
    <div class="ph map gmap rv" data-img="visit.mapImg">
      <iframe src="https://www.google.com/maps?q=${encodeURIComponent(mapQuery(c('visit.address')))}&hl=ko&z=16&output=embed" title="아이엠센터 위치 지도" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>
      <a ${href('visit.placeLink')} target="_blank" rel="noopener" class="map-open"><span data-k="visit.placeLabel">${esc(c('visit.placeLabel'))}</span> ↗</a>
    </div>`}
  </div>
</section>`;
  },
};

// ── 세부 페이지 (메뉴 > 아이엠센터·세미나실의 세부 메뉴) ─────────────
// 공통 구성: 머리(작은 제목·큰 제목·소개) → 페이지별 내용 → 본문 블록(제목+글, 편집 모드에서 추가·삭제)
function pageHead(id) {
  return `
<section class="page-hd" data-sec="page">
  <div class="wrap">
    ${t(`pages.${id}.eyebrow`, 'p', 'eyebrow')}
    ${t(`pages.${id}.title`, 'h1')}
    ${m(`pages.${id}.lead`, 'p', 'lead')}
  </div>
</section>`;
}
function pageImg(id, tag) {
  const has = c(`pages.${id}.img`);
  if (!has && !state.editing) return '';
  return `<div class="wrap"><div class="ph page-img" data-img="pages.${id}.img" ${bg(`pages.${id}.img`)}><span class="tag"><b>PHOTO</b> · ${esc(tag)}</span></div></div>`;
}
// ── 사진 묶음: 1장이면 한 장, 2장 이상이면 넘겨 보는 슬라이드(캐러셀) ─────────
// path = 사진 주소 배열 경로, legacyPath = 예전 한 장짜리 사진 경로(있으면 첫 장으로 취급)
// fixed: 한 장일 때도 16:9로 꽉 채움(대표 사진용), ph: 사진이 없을 때 임시 배경(그라데이션)
function photoSet(path, legacyPath, { fixed = false, ph = '' } = {}) {
  let urls = (c(path) || []).filter(Boolean);
  if (!urls.length && legacyPath && c(legacyPath)) urls = [c(legacyPath)];
  const img = (u, cls = '') => `<img${cls ? ` class="${cls}"` : ''} src="${esc(safeUrl(u))}" alt="" loading="lazy">`;
  let view = '';
  if (!urls.length) {
    if (state.editing || ph) view = `<div class="ph ps-ph"${ph ? ` style="--g:${esc(ph)}"` : ''}><span class="tag"><b>PHOTO</b> · 사진을 올려 주세요</span></div>`;
  } else if (urls.length === 1) {
    view = fixed ? `<div class="ps-fixed">${img(urls[0])}</div>` : img(urls[0], 'ps-one');
  } else {
    view = `<div class="car">
      <div class="car-track">${urls.map(u => `<div class="car-slide">${img(u)}</div>`).join('')}</div>
      <button type="button" class="car-prev" aria-label="이전 사진">${CHEV_L}</button>
      <button type="button" class="car-next" aria-label="다음 사진">${CHEV_R}</button>
      <div class="car-dots">${urls.map((_, i) => `<i${i ? '' : ' class="on"'}></i>`).join('')}</div>
    </div>`;
  }
  const edit = state.editing ? `
    <div class="ps-edit" data-ps-path="${path}" data-ps-legacy="${legacyPath || ''}">
      ${urls.map((u, i) => `<div class="ps-th">${img(u)}<span>
        <button type="button" data-ps="left" data-i="${i}" ${i === 0 ? 'disabled' : ''} title="앞으로">◀</button>
        <button type="button" data-ps="right" data-i="${i}" ${i === urls.length - 1 ? 'disabled' : ''} title="뒤로">▶</button>
        <button type="button" data-ps="del" data-i="${i}" title="이 사진 빼기">✕</button></span></div>`).join('')}
      <div class="ed-img-add"><button type="button" class="ed-chip" data-ps-add>+ 사진 추가</button></div>
      <span class="ps-note">1장은 한 장으로, 2장 이상은 넘겨 보는 슬라이드로 보여요</span>
    </div>` : '';
  return `<div class="pset${fixed ? ' fixed' : ''}">${view}${edit}</div>`;
}

// 아이엠센터 소개: 대표 사진(항상 자리 표시) → ••• → 가운데 정렬 비전 문구
function aboutVision() {
  return `
<section class="page-vision" data-sec="page">
  <div class="wrap">
    <div class="vision-photo rv">${photoSet('pages.about.imgs', 'pages.about.img', { fixed: true, ph: 'linear-gradient(180deg,#9fb6c8 0%,#d7dde2 55%,#bdb6aa 100%)' })}</div>
    <div class="dots" aria-hidden="true"><i></i><i></i><i></i></div>
    ${rich('pages.about.vision', 'p', 'vision rv')}
  </div>
</section>`;
}
// 본문 블록: 텍스트 칸(type 'text': h 제목·p 글·align) / 사진 칸(type 'image': img·caption)
// 편집 모드에서 '+ 텍스트'·'+ 사진'으로 추가, 블록마다 ↑↓·정렬·삭제 (editor.js)
// 소개 페이지 층별 간략 안내: 층 · 공간 이름 · 소개 첫 문장 (내용은 예약 시스템 관리자에서 관리)
function floorSummary(body) {
  const txt = String(body || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
  const first = (txt.split(/\n/)[0] || '').split(/(?<=[.!?])\s+/)[0].trim();
  return first.length > 90 ? first.slice(0, 88) + '…' : first;
}
// 소개 페이지 중심 가치: 밝은 배경 + 제목 + 세 개의 원이 겹치는 다이어그램 + 굵기 조절 줄글
function valuesHtml() {
  const items = (c('pages.about.valueItems') || []).slice(0, 3);
  return `
<section class="values" data-sec="page">
  <div class="wrap">
    ${t('pages.about.valuesEyebrow', 'p', 'eyebrow rv')}
    ${t('pages.about.valuesTitle', 'h2', 'v-title rv')}
    <div class="venn rv" role="img" aria-label="${esc(items.map(v => v.t).join(', '))}">
      ${items.map((v, i) => `
      <div class="vc vc${i + 1}"><div class="vc-in">${t(`pages.about.valueItems.${i}.t`, 'strong')}${t(`pages.about.valueItems.${i}.d`, 'span')}</div></div>`).join('')}
      ${t('pages.about.valuesCenter', 'div', 'v-center')}
    </div>
    ${rich('pages.about.values', 'p', 'vtext rv')}
  </div>
</section>`;
}
// 층 이름 → 정렬용 숫자 (B1/B2층 → -1, 5층 → 5) — 건물처럼 위층이 위로 오게
export function floorRank(name) {
  const n = String(name || '').trim();
  const b = n.match(/^B(\d+)/i);
  if (b) return -Number(b[1]);
  const m = n.match(/\d+/);
  return m ? Number(m[0]) : 0;
}
// 층별 바로가기 버튼: 홈페이지 페이지(pages.about.floorLinks[층]) + 관리자 층별 안내에 등록된 사업장 링크(f.links)
// 손대지 않은 층의 기본 버튼: 홈페이지 페이지 버튼(floorLinks, 예: 아론홀·샤론홀) + 관리자 층별 안내의 사업장 링크
export function defaultFloorBtns(f, floorLinks) {
  const k = String(floorRank(f.name));
  const own = Array.isArray(floorLinks?.[k]) ? floorLinks[k].filter(l => l && l.label).map(l => ({ label: l.label, link: l.link || '' })) : [];
  return own.concat((f.links || []).filter(l => l && l.url).map(l => ({ label: l.label || '바로가기', link: l.url })));
}
function floorLinksHtml(f) {
  const key = String(f.rank), path = `pages.about.floorBtns.${key}`;
  const own = c(path);
  const editable = Array.isArray(own) && state.editing;
  const list = Array.isArray(own) ? own : defaultFloorBtns(f, c('pages.about.floorLinks'));
  const isIn = u => /^(\.\/|#)/.test(String(u || '').trim());
  // 화면 순서: 홈페이지 안 페이지 버튼(아론홀·샤론홀 등)은 저장 순서대로 맨 앞, 나머지 바깥 사이트는 이름 가나다순
  // — 편집 경로는 원래 순번(i) 그대로
  const btns = list.map((l, i) => [l, i]).sort((a, b) => {
    const ia = isIn(a[0].link), ib = isIn(b[0].link);
    if (ia !== ib) return ia ? -1 : 1;
    return ia ? a[1] - b[1] : String(a[0].label || '').localeCompare(String(b[0].label || ''), 'ko');
  }).map(([l, i]) => {
    const inner = isIn(l.link);
    const attrs = editable ? href(`${path}.${i}.link`) : `href="${esc(safeUrl(l.link))}"`;
    const label = editable ? t(`${path}.${i}.label`) : esc(l.label || '바로가기');
    return `<a ${attrs}${inner ? '' : ' target="_blank" rel="noopener"'} class="fl-link${inner ? ' in' : ''}">${label} <span aria-hidden="true">${inner ? '→' : '↗'}</span>${editable ? `<button type="button" class="fb-del" data-fb-del="${key}|${i}" title="이 버튼 빼기">✕</button>` : ''}</a>`;
  });
  if (editable) btns.push(`<button type="button" class="ed-chip" data-fb-add="${key}">+ 버튼</button>`);
  return btns.length ? `<div class="fl-links">${btns.join('')}</div>` : '';
}
// 층 목록 = 관리자 층별 안내(siteContent/floors) + 홈페이지에서만 추가한 층(pages.about.extraFloors, 예: B3–B5 주차장)
// — 같은 층 번호가 관리자 쪽에 이미 있으면 홈페이지 추가분은 숨김
export function allFloors(content) {
  const base = (state.floors || []).filter(f => f && (f.name || f.mainTitle));
  const ranks = new Set(base.map(f => floorRank(f.name)));
  const extra = (getPath(content, 'pages.about.extraFloors') || []).map((f, ex) => ({ ...f, ex }))
    .filter(f => f && (f.name || f.mainTitle) && !ranks.has(floorRank(f.name)));
  return base.concat(extra);
}
function floorsHtml() {
  const fl = allFloors(state.content).map(f => ({ ...f, rank: floorRank(f.name) })).sort((a, b) => b.rank - a.rank);
  if (!fl.length && !state.editing) return '';
  return `
<section class="page-floors" data-sec="page">
  <div class="wrap">
    <div class="sec-hd rv"><h2>${t('pages.about.floorsTitle')}<span class="h2sub" data-k="pages.about.floorsSub">${esc(c('pages.about.floorsSub'))}</span></h2></div>
    <div class="bld rv">
      ${fl.map((f, i) => `
      <div class="fl-row">
        <div class="fl-n">${f.ex != null ? `<span data-k="pages.about.extraFloors.${f.ex}.name">${esc(String(f.name || '').trim())}</span>` : esc(String(f.name || '').trim().replace(/층$/, ''))}<small>F</small></div>
        <div class="fl-t">${f.ex != null ? t(`pages.about.extraFloors.${f.ex}.mainTitle`) : esc(f.mainTitle || '')}</div>
        <div class="fl-d">${f.ex != null ? (f.body || state.editing ? t(`pages.about.extraFloors.${f.ex}.body`, 'p') : '') : `<p>${esc(floorSummary(f.body))}</p>`}${floorLinksHtml(f)}</div>
      </div>`).join('') || '<p class="empty">등록된 층별 안내가 없습니다.</p>'}
    </div>
    ${state.editing ? '<p class="edit-hint">층 이름·소개 문장은 예약 시스템 관리자 › 아이엠센터 소개 › 층별 안내에서 수정합니다. 층마다 바로가기 버튼은 여기서 “+ 버튼”으로 추가하고, 이름·🔗링크를 고치거나 ✕로 뺄 수 있어요. (홈페이지 안 주소 ./?page=… 는 옅은 회색 버튼, 바깥 사이트는 테두리 버튼으로 새 창)</p>' : ''}
  </div>
</section>`;
}
function pageBlocks(id) {
  const path = `pages.${id}.blocks`;
  const blocks = c(path) || [];
  if (!blocks.length && !state.editing) return '';
  const ctl = (b, i) => state.editing ? `
        <div class="blk-ctl">
          <button type="button" data-blk="up" data-path="${path}" data-i="${i}" ${i === 0 ? 'disabled' : ''}>↑</button>
          <button type="button" data-blk="down" data-path="${path}" data-i="${i}" ${i === blocks.length - 1 ? 'disabled' : ''}>↓</button>
          ${b.type === 'image' ? '' : `<button type="button" data-blk="align" data-path="${path}" data-i="${i}">${b.align === 'center' ? '왼쪽 정렬' : '가운데 정렬'}</button>`}
          <button type="button" data-blk="del" data-path="${path}" data-i="${i}">삭제</button>
        </div>` : '';
  return `
<section class="page-blocks" data-sec="page">
  <div class="wrap">
    <div class="blocks">
      ${blocks.map((b, i) => b.type === 'image' ? `
      <figure class="blk blk-img rv">${ctl(b, i)}
        ${photoSet(`${path}.${i}.imgs`, `${path}.${i}.img`)}
        ${b.caption || state.editing ? t(`${path}.${i}.caption`, 'figcaption') : ''}
      </figure>` : `
      <div class="blk blk-text${b.align === 'center' ? ' center' : ''} rv">${ctl(b, i)}
        ${b.h || state.editing ? t(`${path}.${i}.h`, 'h3') : ''}
        ${rich(`${path}.${i}.p`)}
      </div>`).join('')}
    </div>
    ${state.editing ? `<p class="edit-hint blk-add">
      <button type="button" class="ed-chip" data-blk-add="text" data-path="${path}">+ 텍스트</button>
      <button type="button" class="ed-chip" data-blk-add="image" data-path="${path}">+ 사진</button>
      칸을 맨 아래에 추가합니다. 글자를 선택하고 아래 막대의 <b>B 굵게</b>(또는 Ctrl+B)로 굵기를 바꿀 수 있어요. 게시해야 방문자에게 보입니다.</p>` : ''}
  </div>
</section>`;
}
// 공간 페이지: 공간 관리(spaces)에 등록된 층·정원·비품·사진을 그대로 보여줌
function spaceBody(id) {
  const sp = state.space;
  const photos = (sp?.photos || []).filter(Boolean);
  const facts = [
    ['위치', sp?.floor],
    ['정원', sp?.cap ? `${sp.cap}명` : ''],
    ['비품', (sp?.amenities || []).join(' · ')],
  ].filter(([, v]) => v);
  const main = c(`pages.${id}.img`) || photos[0] || '';
  return `
<section class="page-space" data-sec="page">
  <div class="wrap split">
    <div class="ph space-main rv" data-img="pages.${id}.img" ${main ? `style="--img:url('${cssUrl(main)}')" data-hasimg="1"` : ''}><span class="tag"><b>PHOTO</b> · ${esc(c(`pages.${id}.title`))} 대표 사진</span></div>
    <div class="rv">
      ${facts.length ? `<dl class="info">${facts.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>` : '<p class="empty">공간 정보를 불러오는 중이거나 아직 등록되지 않았습니다.</p>'}
      <div class="btns" style="margin-top:32px">
        <a ${href('notice.cta1Link')} class="btn"><span class="dot"></span><span data-k="notice.cta1">${esc(c('notice.cta1'))}</span> <span aria-hidden="true">→</span></a>
        <a ${href('notice.cta2Link')} class="btn line" data-k="notice.cta2">${esc(c('notice.cta2'))}</a>
      </div>
    </div>
  </div>
  ${photos.length > 1 ? `<div class="wrap"><div class="gallery">${photos.slice(0, 9).map(u => `<a class="ph rv" href="${esc(safeUrl(u))}" target="_blank" rel="noopener" style="--img:url('${cssUrl(u)}')" data-hasimg="1" aria-label="사진 크게 보기"></a>`).join('')}</div></div>` : ''}
</section>`;
}
function orgBody() {
  const img = c('pages.org.img');
  return `
<section class="page-org" data-sec="page">
  <div class="wrap">
    <div class="org-box rv" data-img="pages.org.img">${img ? `<img src="${esc(safeUrl(img))}" alt="아이엠센터 조직도">` : '<p class="empty">조직도를 준비 중입니다.</p>'}</div>
  </div>
</section>`;
}
const PAGES = {
  about: () => pageHead('about') + aboutVision() + pageBlocks('about') + valuesHtml() + floorsHtml(),
  org: () => pageHead('org') + orgBody() + pageBlocks('org'),
  guide: () => pageHead('guide') + pageImg('guide', '건물 입구·주차장 등 · 가로 21:9') + pageBlocks('guide') + SECTIONS.visit(),
  aaron: () => pageHead('aaron') + spaceBody('aaron') + pageBlocks('aaron'),
  sharon: () => pageHead('sharon') + spaceBody('sharon') + pageBlocks('sharon'),
};

function footerHtml() {
  return `
<footer class="ft">
  <div class="wrap">
    <div class="top">
      <div><div class="logo"><span class="logo-mark" role="img" aria-label="I AM"></span></div>${m('footer.desc')}</div>
      <div><h4>MENU</h4><ul><li><a href="./#whatson">공연·행사</a></li><li><a href="./?page=about">아이엠센터</a></li><li><a href="./#spaces">아이엠홀</a></li><li><a href="./#spaces">세미나실</a></li></ul></div>
      <div><h4>INFO</h4><ul><li><a href="./#notice">대관 안내</a></li><li><a href="./?page=guide">오시는 길</a></li><li><a href="#">개인정보처리방침</a></li></ul></div>
      <div><h4>RELATED</h4>
        <div class="orgs${state.editing ? ' open' : ''}">
          <button type="button" class="orgs-btn" aria-expanded="${state.editing}">유관기관 <span aria-hidden="true">▾</span></button>
          <ul class="orgs-list">${(c('footer.orgs') || []).map((o, i) => [o, i]).sort((a, b) => String(a[0].label || '').localeCompare(String(b[0].label || ''), 'ko')).map(([o, i]) => `<li>${o.link || state.editing
            ? `<a ${href(`footer.orgs.${i}.link`)} target="_blank" rel="noopener">${t(`footer.orgs.${i}.label`)} <span aria-hidden="true">↗</span></a>`
            : `<span class="o-na">${esc(o.label)}</span>`}${state.editing ? `<button type="button" class="org-del" data-org-del="${i}" title="이 기관 빼기">✕</button>` : ''}</li>`).join('')}${state.editing ? '<li class="org-add-li"><button type="button" class="ed-chip" data-org-add>+ 기관 추가</button></li>' : ''}</ul>
        </div>
      </div>
    </div>
    <div class="bot"><span>© ${new Date().getFullYear()} I AM CENTER. All rights reserved.</span><span>${t('footer.bottom')} · <button type="button" class="admin-link" id="admin-link">관리자</button></span></div>
  </div>
</footer>`;
}

// ── 날짜 표시 ─────────────────────────────────────────────────
const DOW = ['일', '월', '화', '수', '목', '금', '토'];
function fmtOne(d) {
  if (!d) return '';
  const x = new Date(d + 'T00:00:00');
  return `${d.replace(/-/g, '.')} (${DOW[x.getDay()]})`;
}
function fmtRange(s, e) {
  if (!s) return '';
  if (!e || e === s) return fmtOne(s);
  return `${s.replace(/-/g, '.')} – ${e.slice(5).replace('-', '.')}`;
}
// 포스터가 없을 때 쓰는 임시 배경 (순서대로 돌아가며 색을 바꿔 카드가 구분되게)
function posterGradient(i) {
  const g = ['#1d2b3a,#0a0f15', '#c9a24a,#6e4f1c', '#47584a,#1a221c', '#3a1e1e,#120909', '#3b3552,#15121f', '#2c2c2c,#050505'];
  return `linear-gradient(160deg,${g[i % g.length]})`;
}

// ── 상단 메뉴의 세부 메뉴 (아이엠센터·세미나실) ───────────────────
function renderNav() {
  for (const key of ['center', 'seminar']) {
    const items = c(`nav.${key}`) || [];
    const links = items.map((it, i) => `<a ${href(`nav.${key}.${i}.link`)}>${t(`nav.${key}.${i}.label`)}</a>`).join('');
    const dd = document.getElementById(`dd-${key}`);
    if (dd) dd.innerHTML = items.length ? `<div class="dd-in">${links}</div>` : '';
    const m = document.getElementById(`mdd-${key}`);
    if (m) m.innerHTML = items.map((it, i) => `<a href="${esc(safeUrl(it.link))}">${esc(it.label)}</a>`).join('');
  }
}

// ── 렌더링 ────────────────────────────────────────────────────
export function render() {
  const main = document.getElementById('main');
  const secs = state.content.sections || [];
  if (state.page) {
    main.innerHTML = PAGES[state.page]();
    document.title = `${c(`pages.${state.page}.title`)} — 아이엠센터`;
  } else main.innerHTML = secs.map((s, i) => {
    if (s.hidden && !state.editing) return '';
    const html = SECTIONS[s.id] ? SECTIONS[s.id]() : '';
    if (!state.editing) return html;
    // 편집 모드: 섹션마다 순서·숨기기 조작 막대를 붙임 (editor.js가 동작 연결)
    return html.replace(/(<section[^>]*?)>/, `$1 data-idx="${i}"${s.hidden ? ' data-hidden="1"' : ''}>`);
  }).join('');
  document.getElementById('footer-slot').innerHTML = footerHtml();
  renderNav();
  document.body.classList.toggle('editing', state.editing);
  setupBehaviors();
  document.dispatchEvent(new CustomEvent('home:rendered'));
}

// ── 데이터 불러오기 ───────────────────────────────────────────
export async function loadAll() {
  const today = new Date().toISOString().slice(0, 10);
  const [contentSnap, progSnap] = await Promise.allSettled([
    getDoc(doc(db, 'siteContent', 'homepage')),
    getDocs(query(collection(db, 'programs'), where('published', '==', true))),
  ]);
  if (contentSnap.status === 'fulfilled' && contentSnap.value.exists()) {
    state.content = mergeContent(contentSnap.value.data());
  }
  // 공간 페이지면 공간 관리(spaces)의 해당 공간 문서도 가져옴 (사진·정원·비품)
  const spaceName = state.page && c(`pages.${state.page}.space`);
  if (spaceName) {
    try {
      const sn = await getDocs(query(collection(db, 'spaces'), where('name', '==', spaceName)));
      state.space = sn.docs[0] ? sn.docs[0].data() : null;
    } catch (e) { console.warn('공간 정보 불러오기 실패', e); }
  }
  if (state.page === 'about') {
    try {
      const fs = await getDoc(doc(db, 'siteContent', 'floors'));
      state.floors = fs.exists() ? (fs.data().floors || []) : [];
    } catch (e) { console.warn('층별 안내 불러오기 실패', e); }
  }
  if (progSnap.status === 'fulfilled') {
    state.programs = progSnap.value.docs.map(d => ({ id: d.id, ...d.data() }))
      .filter(p => (p.endDate || p.startDate || '') >= today)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || String(a.startDate).localeCompare(String(b.startDate)));
  }
  [contentSnap, progSnap].forEach(r => { if (r.status === 'rejected') console.warn('홈페이지 데이터 불러오기 실패', r.reason); });
}

// ── 화면 동작 (슬라이더, 레일, 탭, 등장 효과) ─────────────────────
let timers = [];
function setupBehaviors() {
  timers.forEach(fn => fn()); timers = [];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 히어로 슬라이더
  const hero = document.querySelector('.hero');
  if (hero) {
    const slides = [...hero.querySelectorAll('.slide')];
    const prog = hero.querySelector('.prog i'), cur = hero.querySelector('.cur'), cap = hero.querySelector('.cap');
    const DUR = 6000; let i = 0, t0 = performance.now(), raf = 0, paused = state.editing;
    const go = n => {
      if (!slides.length) return;
      slides[i].classList.remove('on'); i = (n + slides.length) % slides.length; slides[i].classList.add('on');
      cur.textContent = String(i + 1).padStart(2, '0'); cap.textContent = slides[i].dataset.cap; t0 = performance.now();
    };
    const tick = now => {
      const p = paused ? 0 : Math.min((now - t0) / DUR, 1);
      prog.style.transform = `scaleX(${p})`;
      if (p >= 1 && !reduce) go(i + 1);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    hero.querySelector('.prev').onclick = () => go(i - 1);
    hero.querySelector('.next').onclick = () => go(i + 1);
    timers.push(() => cancelAnimationFrame(raf));
  }

  // 공연·행사 레일 + 분류 탭
  const rail = document.querySelector('.rail');
  if (rail) {
    const step = () => (rail.querySelector('.card:not([hidden])')?.offsetWidth || 280) + 24;
    document.querySelector('.rl').onclick = () => rail.scrollBy({ left: -step(), behavior: 'smooth' });
    document.querySelector('.rr').onclick = () => rail.scrollBy({ left: step(), behavior: 'smooth' });
    document.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => {
      document.querySelectorAll('.tabs button').forEach(x => x.setAttribute('aria-pressed', x === b));
      const f = b.dataset.f;
      rail.querySelectorAll('.card').forEach(cd => { cd.hidden = !(f === 'all' || cd.dataset.c === f); });
      rail.scrollTo({ left: 0 });
    }));
  } else {
    document.querySelector('.rail-ctl')?.remove();
  }

  // 푸터 '유관기관': 버튼을 누르면 목록이 위로 펼쳐짐, 바깥을 누르면 닫힘 (편집 중에는 항상 펼침)
  const orgs = document.querySelector('.orgs');
  if (orgs && !state.editing) {
    const btn = orgs.querySelector('.orgs-btn');
    btn.onclick = e => { e.stopPropagation(); const o = orgs.classList.toggle('open'); btn.setAttribute('aria-expanded', o); };
    const close = e => { if (!orgs.contains(e.target)) { orgs.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); } };
    document.addEventListener('click', close);
    timers.push(() => document.removeEventListener('click', close));
  }

  // 사진 슬라이드(캐러셀): 좌우 버튼·점 표시, 손가락으로 넘기기는 스크롤 스냅
  document.querySelectorAll('.car').forEach(car => {
    const track = car.querySelector('.car-track'), dots = [...car.querySelectorAll('.car-dots i')];
    const go = d => track.scrollBy({ left: d * track.clientWidth, behavior: 'smooth' });
    car.querySelector('.car-prev').onclick = e => { e.preventDefault(); go(-1); };
    car.querySelector('.car-next').onclick = e => { e.preventDefault(); go(1); };
    track.addEventListener('scroll', () => {
      const k = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
      dots.forEach((d, i) => d.classList.toggle('on', i === k));
    }, { passive: true });
  });

  // 스크롤 등장 효과 (편집 중에는 바로 보이게)
  const els = document.querySelectorAll('.rv');
  if (state.editing || reduce || !('IntersectionObserver' in window)) {
    els.forEach(el => el.classList.add('in'));
  } else {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }),
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    els.forEach(el => {
      const p = el.parentElement;
      if (p && (p.classList.contains('stats') || p.classList.contains('spaces'))) el.style.transitionDelay = [...p.children].indexOf(el) * 90 + 'ms';
      io.observe(el);
    });
    timers.push(() => io.disconnect());
  }
}

// 헤더·퀵바·모바일 메뉴 (한 번만 연결)
export function setupChrome() {
  const hd = document.getElementById('hd'), quick = document.getElementById('quick');
  const onScroll = () => {
    const y = scrollY;
    hd.classList.toggle('solid', y > innerHeight * 0.75 || !document.querySelector('.hero'));
    quick.classList.toggle('show', y > innerHeight * 0.5);
  };
  addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('home:rendered', onScroll);
  const burger = document.getElementById('burger');
  burger.addEventListener('click', () => { const o = document.body.classList.toggle('menu-open'); burger.setAttribute('aria-expanded', o); });
  // 모바일 메뉴: 세부 메뉴 링크는 나중에 그려지므로 위임 방식으로 닫기 처리
  document.querySelector('.mnav').addEventListener('click', e => { if (e.target.closest('a')) { document.body.classList.remove('menu-open'); burger.setAttribute('aria-expanded', 'false'); } });
  document.getElementById('top').onclick = () => scrollTo({ top: 0, behavior: 'smooth' });
}
