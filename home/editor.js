// 아이엠센터 홈페이지 — 관리자 편집 모드
// · 글자: 클릭해서 바로 수정  · 사진: '사진 바꾸기'로 업로드  · 링크: '링크' 버튼으로 주소 변경
// · 섹션: 순서 바꾸기 / 숨기기  · '게시하기'를 눌러야 방문자에게 반영 (이전 버전은 자동 보관)
import { db, doc, getDoc, setDoc, addDoc, collection, serverTimestamp, authApi, isAdminAccount, uploadImage } from './fb.js';
import { state, render } from './home.js';
import { getPath, setPath, SECTION_LABELS } from './content.js';

let draft = null;        // 편집 중인 내용
let published = '';      // 마지막으로 게시된 내용(JSON) — 변경 여부 비교용
let user = null;
let bar = null;

const clone = o => JSON.parse(JSON.stringify(o));
const isDirty = () => JSON.stringify(draft) !== published;

export async function start() {
  if (bar) { setEditing(true); return; }
  const { auth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } = await authApi();
  user = await new Promise(res => { const un = onAuthStateChanged(auth, u => { un(); res(u); }); });
  if (!user) {
    const p = new GoogleAuthProvider(); p.setCustomParameters({ prompt: 'select_account' });
    try {
      user = (await signInWithPopup(auth, p)).user;
    } catch (e) {
      // ?edit=1로 바로 열었을 때처럼 클릭 없이 띄운 팝업은 브라우저가 막음 → 로그인 버튼을 보여주고,
      // 그 버튼 클릭 안에서 바로 팝업을 띄움(클릭으로 연 팝업은 차단되지 않음)
      if (e.code === 'auth/popup-blocked' || e.code === 'auth/cancelled-popup-request') {
        user = await askLoginClick(() => signInWithPopup(auth, p));
        if (!user) return;
      } else {
        if (e.code !== 'auth/popup-closed-by-user') alert('로그인에 실패했습니다: ' + (e.message || e));
        return;
      }
    }
  }
  if (!(await isAdminAccount(user.email))) {
    alert('관리자로 등록된 계정만 편집할 수 있습니다.\n(' + user.email + ')');
    await signOut(auth);
    return;
  }
  draft = clone(state.content);
  published = JSON.stringify(draft);
  buildBar(signOut, auth);
  document.body.classList.add('has-editor');
  document.addEventListener('home:rendered', decorate);
  document.addEventListener('click', blockNavigation, true);
  addEventListener('beforeunload', e => { if (isDirty()) { e.preventDefault(); e.returnValue = ''; } });
  setEditing(true);
}

// 팝업이 막혔을 때 보여주는 '관리자 로그인' 버튼 — 로그인되면 사용자, 닫으면 null
function askLoginClick(signIn) {
  return new Promise(resolve => {
    const box = document.createElement('div');
    box.className = 'ed-login';
    box.innerHTML = `<p>편집 모드를 열려면 관리자 계정으로 로그인하세요.</p>
      <button type="button" class="primary" data-a="login">Google로 로그인</button>
      <button type="button" class="ghost" data-a="close">닫기</button>`;
    document.body.appendChild(box);
    box.addEventListener('click', async e => {
      const a = e.target.closest('button')?.dataset.a; if (!a) return;
      if (a === 'close') { box.remove(); resolve(null); return; }
      try { const r = await signIn(); box.remove(); resolve(r.user); }
      catch (err) {
        if (err.code === 'auth/popup-blocked') alert('브라우저가 로그인 팝업을 막았습니다. 주소창 오른쪽의 팝업 차단 표시에서 이 사이트의 팝업을 허용한 뒤 다시 눌러 주세요.');
        else if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') alert('로그인에 실패했습니다: ' + (err.message || err));
      }
    });
  });
}

// ── 하단 편집 도구 막대 ────────────────────────────────────────
function buildBar(signOut, auth) {
  bar = document.createElement('div');
  bar.className = 'ed-bar';
  bar.innerHTML = `
    <span class="ed-who" title="${esc(user.email)}">✎ 편집 모드</span>
    <span class="ed-status" id="ed-status">변경 없음</span>
    <button type="button" data-a="toggle">미리보기</button>
    <button type="button" data-a="discard">변경 취소</button>
    <button type="button" data-a="publish" class="primary">게시하기</button>
    <a href="admin.html" target="_blank" rel="noopener">관리자 페이지 ↗</a>
    <button type="button" data-a="logout" class="ghost">로그아웃</button>`;
  document.body.appendChild(bar);
  bar.addEventListener('click', async e => {
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'toggle') setEditing(!state.editing);
    if (a === 'discard') {
      if (!isDirty() || confirm('게시하지 않은 변경 내용을 모두 되돌릴까요?')) {
        draft = JSON.parse(published); state.content = draft; render(); updateStatus();
      }
    }
    if (a === 'publish') publish();
    if (a === 'logout') {
      if (isDirty() && !confirm('게시하지 않은 변경 내용이 사라집니다. 로그아웃할까요?')) return;
      published = JSON.stringify(draft); // beforeunload 경고 방지
      await signOut(auth); location.href = location.pathname;
    }
  });
}

function setEditing(on) {
  state.editing = on;
  state.content = draft;
  render();
  const btn = bar.querySelector('[data-a="toggle"]');
  btn.textContent = on ? '미리보기' : '편집 계속하기';
  bar.classList.toggle('preview', !on);
  updateStatus();
}

function updateStatus() {
  const el = document.getElementById('ed-status');
  if (!el) return;
  const d = isDirty();
  el.textContent = d ? (state.editing ? '게시 전 변경 있음' : '미리보기 중 · 게시 전') : '변경 없음';
  el.classList.toggle('dirty', d);
  bar.querySelector('[data-a="publish"]').disabled = !d;
  bar.querySelector('[data-a="discard"]').disabled = !d;
}

// ── 게시 ───────────────────────────────────────────────────────
async function publish() {
  if (!isDirty()) return;
  if (!confirm('지금 내용으로 홈페이지를 게시할까요?\n(현재 게시된 버전은 관리자 페이지 › 버전 기록에 보관됩니다)')) return;
  const btn = bar.querySelector('[data-a="publish"]');
  btn.disabled = true; btn.textContent = '게시 중…';
  try {
    const ref = doc(db, 'siteContent', 'homepage');
    const prev = await getDoc(ref);
    if (prev.exists()) {
      const { updatedAt, updatedBy, ...prevContent } = prev.data();
      await addDoc(collection(db, 'siteContentHistory'), {
        doc: 'homepage', content: prevContent,
        publishedAt: updatedAt || null, publishedBy: updatedBy || '',
        archivedAt: serverTimestamp(), archivedBy: user.email,
      });
    }
    const data = clone(draft);
    await setDoc(ref, { ...data, updatedAt: serverTimestamp(), updatedBy: user.email });
    published = JSON.stringify(draft);
    toast('게시했습니다. 방문자에게 바로 반영됩니다.');
  } catch (e) {
    console.error(e);
    alert('게시에 실패했습니다: ' + (e.message || e));
  } finally {
    btn.textContent = '게시하기';
    updateStatus();
  }
}

// ── 편집 가능한 요소 꾸미기 (렌더링될 때마다 실행) ───────────────
function decorate() {
  if (!state.editing) return;

  // 1) 글자
  document.querySelectorAll('[data-k]').forEach(el => {
    el.contentEditable = 'true';
    el.spellcheck = false;
    const path = el.dataset.k;
    const multi = el.dataset.ml === '1';
    el.addEventListener('input', () => {
      let v = el.innerText.replace(/ /g, ' ');
      if (!multi) v = v.replace(/\s*\n\s*/g, ' ');
      v = v.replace(/\n$/, '');
      setPath(draft, path, v);
      updateStatus();
    });
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !multi) { e.preventDefault(); el.blur(); }
      if (e.key === 'Escape') el.blur();
    });
    el.addEventListener('paste', e => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData('text/plain');
      document.execCommand('insertText', false, multi ? text : text.replace(/\s*\n\s*/g, ' '));
    });
  });

  // 2) 사진
  document.querySelectorAll('[data-img]').forEach(el => {
    const path = el.dataset.img;
    const box = document.createElement('div');
    box.className = 'ed-img';
    box.innerHTML = `<button type="button" class="ed-chip">📷 사진 바꾸기</button>${getPath(draft, path) ? '<button type="button" class="ed-chip ghost" data-clear>지우기</button>' : ''}`;
    box.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      if (e.target.closest('[data-clear]')) { setPath(draft, path, ''); render(); updateStatus(); return; }
      pickImage(path, box);
    });
    el.appendChild(box);
  });

  // 3) 링크
  document.querySelectorAll('[data-link]').forEach(el => {
    const path = el.dataset.link;
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'ed-chip ed-link';
    chip.textContent = '🔗 링크';
    chip.title = getPath(draft, path) || '';
    chip.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      const v = prompt('연결할 주소를 입력하세요.\n예) https://… , https://iamreservation.web.app/venue-spaces.html , #visit', getPath(draft, path) || '');
      if (v === null) return;
      setPath(draft, path, v.trim());
      render(); updateStatus();
    });
    el.appendChild(chip);
  });

  // 4) 홈페이지 공지 추가·삭제 (notice.items — 인트라넷 공지와 별개)
  document.querySelector('[data-notice-add]')?.addEventListener('click', e => {
    e.preventDefault();
    const d = new Date();
    const date = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
    draft.notice.items = [{ category: '안내', title: '새 공지 제목', date }, ...(draft.notice.items || [])];
    render(); updateStatus();
    document.querySelector('[data-k="notice.items.0.title"]')?.focus();
  });
  document.querySelectorAll('[data-notice-del]').forEach(b => b.addEventListener('click', e => {
    e.preventDefault();
    const i = Number(b.dataset.noticeDel);
    const n = draft.notice.items[i];
    if (!confirm(`이 공지를 삭제할까요?\n${n?.title || ''}`)) return;
    draft.notice.items.splice(i, 1);
    render(); updateStatus();
  }));

  // 5) 섹션 조작 막대
  const secs = draft.sections;
  document.querySelectorAll('section[data-sec]').forEach(sec => {
    const idx = Number(sec.dataset.idx);
    const s = secs[idx];
    if (!s) return;
    const ctl = document.createElement('div');
    ctl.className = 'ed-sec';
    ctl.innerHTML = `
      <span class="ed-sec-name">${esc(SECTION_LABELS[s.id] || s.id)}${s.hidden ? ' · 숨김' : ''}</span>
      <button type="button" data-m="-1" ${idx === 0 ? 'disabled' : ''} title="위로">↑</button>
      <button type="button" data-m="1" ${idx === secs.length - 1 ? 'disabled' : ''} title="아래로">↓</button>
      <button type="button" data-h>${s.hidden ? '보이기' : '숨기기'}</button>`;
    ctl.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      e.preventDefault(); e.stopPropagation();
      if (b.dataset.m) {
        const j = idx + Number(b.dataset.m);
        [secs[idx], secs[j]] = [secs[j], secs[idx]];
      } else if (b.hasAttribute('data-h')) {
        s.hidden = !s.hidden;
      }
      render(); updateStatus();
      document.querySelector(`section[data-sec="${s.id}"]`)?.scrollIntoView({ block: 'start' });
    });
    sec.prepend(ctl);
  });
}

// 편집 중에는 링크를 눌러도 이동하지 않게 (글자 편집을 위해) — 편집 도구·안내 링크는 예외
function blockNavigation(e) {
  if (!state.editing) return;
  const a = e.target.closest('a');
  if (!a || a.closest('.ed-bar') || a.closest('.edit-hint')) return;
  if (e.target.closest('.ed-chip, .ed-sec')) return;
  e.preventDefault();
}

function pickImage(path, box) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = async () => {
    const f = input.files[0];
    if (!f) return;
    if (f.size > 25 * 1024 * 1024) { alert('25MB 이하 사진만 올릴 수 있습니다.'); return; }
    box.classList.add('busy');
    box.querySelector('.ed-chip').textContent = '업로드 중…';
    try {
      const url = await uploadImage(f);
      setPath(draft, path, url);
      render(); updateStatus();
      toast('사진을 바꿨습니다. 게시해야 방문자에게 보입니다.');
    } catch (e) {
      console.error(e);
      alert('사진 업로드에 실패했습니다: ' + (e.message || e));
      box.classList.remove('busy');
      box.querySelector('.ed-chip').textContent = '📷 사진 바꾸기';
    }
  };
  input.click();
}

function toast(msg) {
  const t = document.createElement('div');
  t.className = 'ed-toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add('out'), 2600);
  setTimeout(() => t.remove(), 3200);
}

function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
