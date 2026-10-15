// 아이엠센터 홈페이지 — 관리자 편집 모드
// · 글자: 클릭해서 바로 수정  · 사진: '사진 바꾸기'로 업로드  · 링크: '링크' 버튼으로 주소 변경
// · 섹션: 순서 바꾸기 / 숨기기  · '게시하기'를 눌러야 방문자에게 반영 (이전 버전은 자동 보관)
import { db, doc, getDoc, setDoc, addDoc, collection, serverTimestamp, authApi, isAdminAccount, uploadImage } from './fb.js';
import { state, render } from './home.js';
import { getPath, setPath, SECTION_LABELS } from './content.js';

const DRAFT_KEY = 'iamHomeDraft';   // 편집 중 페이지를 옮길 때 게시 전 내용을 잠시 보관
// 편집 막대의 페이지 이동 목록 ([page 값, 이름] — '' = 메인)
const EDIT_PAGES = [['', '메인'], ['about', '아이엠센터 소개'], ['org', '조직도'], ['guide', '방문가이드'], ['aaron', '아론홀'], ['sharon', '샤론홀']];
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
  // 다른 페이지에서 옮겨 왔으면 게시 전 수정 내용을 이어받음 (그 사이 게시본이 바뀌었으면 버림)
  try {
    const kept = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || 'null');
    sessionStorage.removeItem(DRAFT_KEY);
    if (kept && kept.published === published && kept.draft) draft = kept.draft;
  } catch (_) { /* 저장소를 못 쓰면 그냥 새로 시작 */ }
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
    <select class="ed-page" aria-label="편집할 페이지">${EDIT_PAGES.map(([id, name]) => `<option value="${id}"${(state.page || '') === id ? ' selected' : ''}>${name}</option>`).join('')}</select>
    <button type="button" data-a="bold" title="선택한 글자 굵게 / 굵게 풀기 (Ctrl+B) — 본문 글에서 사용"><b>B</b> 굵게</button>
    <button type="button" data-a="toggle">미리보기</button>
    <button type="button" data-a="discard">변경 취소</button>
    <button type="button" data-a="publish" class="primary">게시하기</button>
    <a href="admin.html" target="_blank" rel="noopener">관리자 페이지 ↗</a>
    <button type="button" data-a="logout" class="ghost">로그아웃</button>`;
  document.body.appendChild(bar);
  // 다른 페이지 편집으로 이동 — 게시 전 수정 내용은 sessionStorage에 잠시 담아 새 페이지에서 이어받음
  bar.querySelector('.ed-page').addEventListener('change', e => {
    const id = e.target.value;
    try { if (isDirty()) sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ published, draft })); } catch (_) {
      if (isDirty() && !confirm('게시하지 않은 변경 내용이 사라집니다. 이동할까요?')) { e.target.value = state.page || ''; return; }
    }
    published = JSON.stringify(draft); // beforeunload 경고 방지
    location.href = `${location.pathname}?${id ? `page=${id}&` : ''}edit=1`;
  });
  // 'B 굵게'를 눌러도 글자 선택이 풀리지 않게
  bar.querySelector('[data-a=bold]').addEventListener('mousedown', e => e.preventDefault());
  bar.addEventListener('click', async e => {
    if (e.target.closest('[data-a]')?.dataset.a === 'bold') {
      const el = document.activeElement;
      if (!el || !el.matches('[data-rich]')) { toast('굵게는 본문 글(텍스트 칸·소개 글)에서 글자를 선택한 뒤 쓸 수 있어요.'); return; }
      document.execCommand('bold');
      return;
    }
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
// 굵기 조절 글: 화면의 굵은 글씨(<b>/<strong>/font-weight)를 **글자** 표시로 바꿔 저장
function richToText(el) {
  const segs = [];
  const walk = (n, bold) => {
    if (n.nodeType === 3) { segs.push([n.nodeValue.replace(/\u00a0/g, ' '), bold]); return; }
    if (n.nodeType !== 1 || n.matches('.ed-chip, .ed-img, .ed-link')) return;
    if (n.tagName === 'BR') { segs.push(['\n', false]); return; }
    let b = bold;
    if (n.tagName === 'B' || n.tagName === 'STRONG') b = true;
    const fw = n.style && n.style.fontWeight;
    if (fw) b = fw === 'bold' || fw === 'bolder' || parseInt(fw, 10) >= 600;
    const block = n.tagName === 'DIV' || n.tagName === 'P';
    if (block && segs.length && !segs[segs.length - 1][0].endsWith('\n')) segs.push(['\n', false]);
    n.childNodes.forEach(ch => walk(ch, b));
  };
  el.childNodes.forEach(ch => walk(ch, false));
  let out = '', cur = false;
  for (const [txt, b] of segs) {
    if (!txt) continue;
    for (const part of txt.split(/(\n)/)) {
      if (!part) continue;
      const want = part === '\n' ? false : b;
      if (want !== cur) { out += '**'; cur = want; }
      out += part;
    }
  }
  if (cur) out += '**';
  return out.replace(/\*\*\*\*/g, '').replace(/\*\*([ \t]*)\*\*/g, '$1').replace(/\n+$/, '');
}

function decorate() {
  if (!state.editing) return;

  // 1) 글자
  document.querySelectorAll('[data-k]').forEach(el => {
    el.contentEditable = 'true';
    el.spellcheck = false;
    const path = el.dataset.k;
    const multi = el.dataset.ml === '1';
    const isRich = el.dataset.rich === '1';
    el.addEventListener('input', () => {
      if (isRich) { setPath(draft, path, richToText(el)); updateStatus(); return; }
      let v = el.innerText.replace(/ /g, ' ');
      if (!multi) v = v.replace(/\s*\n\s*/g, ' ');
      v = v.replace(/\n$/, '');
      setPath(draft, path, v);
      updateStatus();
    });
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !multi) { e.preventDefault(); el.blur(); }
      if (e.key === 'Escape') el.blur();
      // Ctrl+B: 본문 글에서만 굵게(브라우저 기본 동작), 그 밖의 글자에서는 막음
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b' && !isRich) e.preventDefault();
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

  // 5) 세부 페이지 본문 블록: 텍스트·사진 칸 추가 / ↑↓ / 정렬 / 삭제 (pages.<id>.blocks)
  document.querySelectorAll('[data-blk-add]').forEach(b => b.addEventListener('click', e => {
    e.preventDefault();
    const path = b.dataset.path;
    const item = b.dataset.blkAdd === 'image' ? { type: 'image', img: '', caption: '' } : { type: 'text', h: '', p: '내용을 입력하세요.', align: 'left' };
    setPath(draft, path, [...(getPath(draft, path) || []), item]);
    render(); updateStatus();
  }));
  document.querySelectorAll('[data-blk]').forEach(b => b.addEventListener('click', e => {
    e.preventDefault(); e.stopPropagation();
    const arr = getPath(draft, b.dataset.path) || [];
    const i = Number(b.dataset.i), act = b.dataset.blk;
    if (act === 'up' && i > 0) [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
    else if (act === 'down' && i < arr.length - 1) [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]];
    else if (act === 'align') arr[i].align = arr[i].align === 'center' ? 'left' : 'center';
    else if (act === 'del') {
      const label = arr[i]?.type === 'image' ? '사진 칸' : (arr[i]?.h || String(arr[i]?.p || '').slice(0, 20));
      if (!confirm(`이 칸을 삭제할까요?\n${label}`)) return;
      arr.splice(i, 1);
    } else return;
    render(); updateStatus();
  }));

  // 6) 사진 묶음: 사진 추가(업로드) / ◀▶ 순서 / ✕ 빼기 — 예전 한 장짜리 사진은 첫 장으로 옮겨 담음
  const psArr = box => {
    const path = box.dataset.psPath, legacy = box.dataset.psLegacy;
    let arr = getPath(draft, path);
    if (!Array.isArray(arr)) arr = [];
    if (!arr.length && legacy && getPath(draft, legacy)) { arr = [getPath(draft, legacy)]; setPath(draft, legacy, ''); }
    setPath(draft, path, arr);
    return { arr, path };
  };
  document.querySelectorAll('.ps-edit').forEach(box => box.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    const { arr, path } = psArr(box);
    if (b.hasAttribute('data-ps-add')) { pickImage(`${path}.${arr.length}`, b.parentElement); return; }
    const i = Number(b.dataset.i);
    if (b.dataset.ps === 'left' && i > 0) [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
    else if (b.dataset.ps === 'right' && i < arr.length - 1) [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]];
    else if (b.dataset.ps === 'del') { if (!confirm('이 사진을 뺄까요? (게시해야 방문자 화면에 반영돼요)')) return; arr.splice(i, 1); }
    else return;
    render(); updateStatus();
  }));

  // 7) 섹션 조작 막대
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
      box.querySelector('.ed-chip').textContent = box.classList.contains('ed-img-add') ? '+ 사진 추가' : '📷 사진 바꾸기';
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
