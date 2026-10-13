// 아이엠센터 홈페이지 렌더링 — 콘텐츠(siteContent/homepage) + 공연·행사(programs) + 공지(notices)
import { db, doc, getDoc, getDocs, collection, query, where, orderBy, limit } from './fb.js';
import { DEFAULT_CONTENT, mergeContent, getPath } from './content.js';

export const state = {
  content: structuredClone(DEFAULT_CONTENT),
  programs: [],
  notices: [],
  editing: false,      // 편집 모드 여부 (editor.js가 켬)
};

export const PROGRAM_CATS = ['공연', '예배·집회', '세미나·교육', '가족·어린이', '전시', '기타'];

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ml = s => esc(s).replace(/\n/g, '<br>');            // 여러 줄 문구
const safeUrl = u => {
  const s = String(u || '').trim();
  return /^(https?:|mailto:|tel:|#|\.\.?\/|\/)/i.test(s) ? s : '#';
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
    <h1>${t('hero.title1')}<br><em>${t('hero.title2')}</em> ${t('hero.title3')}</h1>
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
    </div>` : `<p class="empty rv" data-k="whatson.empty">${esc(c('whatson.empty'))}</p>`}
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
    ${m('about.statement', 'p', 'big rv')}
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
    const ns = state.notices.slice(0, 3);
    return `
<section id="notice" data-sec="notice">
  <div class="wrap split">
    <div class="rv">
      <div class="sec-hd"><h2>${t('notice.title')}<span class="h2sub" data-k="notice.sub">${esc(c('notice.sub'))}</span></h2><a ${href('notice.moreLink')} class="more" data-k="notice.moreText">${esc(c('notice.moreText'))}</a></div>
      <div class="list">
        ${ns.length ? ns.map(n => `<a href="${esc(safeUrl(c('notice.moreLink')))}"><span class="c">${esc(n.category || '공지')}</span><span class="ti">${esc(n.title)}</span><time>${esc(fmtDate(n.createdAt))}</time></a>`).join('')
          : '<p class="empty">등록된 공지가 없습니다.</p>'}
      </div>
      ${state.editing ? '<p class="edit-hint">공지 목록은 인트라넷 <a href="../notice.html">공지사항 관리</a>에서 작성합니다.</p>' : ''}
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
    <a ${href('visit.mapLink')} target="_blank" rel="noopener" class="ph map rv" data-img="visit.mapImg" ${bg('visit.mapImg')} aria-label="지도에서 보기">
      ${c('visit.mapImg') ? '' : '<span class="pin"></span>'}<span class="tag"><b>지도 보기</b> · 클릭하면 카카오맵으로 이동</span>
    </a>
  </div>
</section>`;
  },
};

function footerHtml() {
  return `
<footer class="ft">
  <div class="wrap">
    <div class="top">
      <div><div class="logo">I AM <small>CENTER</small></div>${m('footer.desc')}</div>
      <div><h4>MENU</h4><ul><li><a href="#whatson">공연·행사</a></li><li><a href="#about">아이엠센터</a></li><li><a href="#spaces">공간</a></li><li><a href="#notice">대관 안내</a></li></ul></div>
      <div><h4>INFO</h4><ul><li><a href="#visit">오시는 길</a></li><li><a href="../notices-public.html">공지사항</a></li><li><a href="../index.html">공간 예약</a></li></ul></div>
      <div><h4>FOLLOW</h4><ul><li><a ${href('footer.instagram')} target="_blank" rel="noopener">Instagram</a></li><li><a ${href('footer.youtube')} target="_blank" rel="noopener">YouTube</a></li></ul></div>
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
function fmtDate(ts) {
  const d = ts?.toDate ? ts.toDate() : (ts ? new Date(ts) : null);
  if (!d || isNaN(d)) return '';
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}
// 포스터가 없을 때 쓰는 임시 배경 (순서대로 돌아가며 색을 바꿔 카드가 구분되게)
function posterGradient(i) {
  const g = ['#1d2b3a,#0a0f15', '#c9a24a,#6e4f1c', '#47584a,#1a221c', '#3a1e1e,#120909', '#3b3552,#15121f', '#2c2c2c,#050505'];
  return `linear-gradient(160deg,${g[i % g.length]})`;
}

// ── 렌더링 ────────────────────────────────────────────────────
export function render() {
  const main = document.getElementById('main');
  const secs = state.content.sections || [];
  main.innerHTML = secs.map((s, i) => {
    if (s.hidden && !state.editing) return '';
    const html = SECTIONS[s.id] ? SECTIONS[s.id]() : '';
    if (!state.editing) return html;
    // 편집 모드: 섹션마다 순서·숨기기 조작 막대를 붙임 (editor.js가 동작 연결)
    return html.replace(/(<section[^>]*?)>/, `$1 data-idx="${i}"${s.hidden ? ' data-hidden="1"' : ''}>`);
  }).join('');
  document.getElementById('footer-slot').innerHTML = footerHtml();
  document.body.classList.toggle('editing', state.editing);
  setupBehaviors();
  document.dispatchEvent(new CustomEvent('home:rendered'));
}

// ── 데이터 불러오기 ───────────────────────────────────────────
export async function loadAll() {
  const today = new Date().toISOString().slice(0, 10);
  const [contentSnap, progSnap, noticeSnap] = await Promise.allSettled([
    getDoc(doc(db, 'siteContent', 'homepage')),
    getDocs(query(collection(db, 'programs'), where('published', '==', true))),
    getDocs(query(collection(db, 'notices'), orderBy('createdAt', 'desc'), limit(10))),
  ]);
  if (contentSnap.status === 'fulfilled' && contentSnap.value.exists()) {
    state.content = mergeContent(contentSnap.value.data());
  }
  if (progSnap.status === 'fulfilled') {
    state.programs = progSnap.value.docs.map(d => ({ id: d.id, ...d.data() }))
      .filter(p => (p.endDate || p.startDate || '') >= today)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || String(a.startDate).localeCompare(String(b.startDate)));
  }
  if (noticeSnap.status === 'fulfilled') {
    const all = noticeSnap.value.docs.map(d => ({ id: d.id, ...d.data() }));
    state.notices = [...all.filter(n => n.pinned), ...all.filter(n => !n.pinned)];
  }
  [contentSnap, progSnap, noticeSnap].forEach(r => { if (r.status === 'rejected') console.warn('홈페이지 데이터 불러오기 실패', r.reason); });
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
  document.querySelectorAll('.mnav a').forEach(a => a.addEventListener('click', () => { document.body.classList.remove('menu-open'); burger.setAttribute('aria-expanded', 'false'); }));
  document.getElementById('top').onclick = () => scrollTo({ top: 0, behavior: 'smooth' });
}
