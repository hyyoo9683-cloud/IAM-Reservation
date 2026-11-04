const { formatKoreanDate, formatTimeRange } = require('./format');

// 관리자에게 새 신청 접수를 알리는 알림 3종 (새 예약 신청·변경취소 신청·대관 신청) — 이메일 템플릿과
// 카카오톡 "나에게 보내기"용 짧은 텍스트(최대 약 200자 제한)를 함께 둠.
// 사용자에게 보내는 승인 메일(templates.js)과는 수신자·목적이 달라 별도 파일로 분리.

const BASE_URL = process.env.APP_BASE_URL || 'https://iamreservation.web.app';

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function factsHtml(rows) {
  return `<table style="width:100%;border-collapse:collapse;font-size:14px;margin:16px 0">
    ${rows.filter(([, v]) => v).map(([label, value]) => `
      <tr>
        <td style="padding:5px 10px 5px 0;color:#666;white-space:nowrap;vertical-align:top">${esc(label)}</td>
        <td style="padding:5px 0;font-weight:600;white-space:pre-wrap">${esc(value)}</td>
      </tr>`).join('')}
  </table>`;
}

function factsText(rows) {
  return rows.filter(([, v]) => v).map(([label, value]) => `${label}: ${value}`).join('\n');
}

function baseLayout({ title, intro, bodyHtml, bodyText, linkUrl, linkLabel }) {
  const html = `
  <div style="font-family:-apple-system,'Malgun Gothic',sans-serif;max-width:560px;margin:0 auto;color:#222">
    <div style="padding:18px 0;border-bottom:2px solid #2F6FED">
      <h1 style="font-size:17px;margin:0;color:#2F6FED">${esc(title)}</h1>
    </div>
    <div style="padding:20px 0">
      <p style="font-size:15px;line-height:1.6;margin:0 0 4px">${intro}</p>
      ${bodyHtml}
      <div style="margin:22px 0">
        <a href="${linkUrl}" style="display:inline-block;padding:10px 18px;background:#2F6FED;color:#fff;text-decoration:none;border-radius:6px;font-size:14px">
          ${esc(linkLabel)}
        </a>
      </div>
    </div>
    <div style="padding:14px 0;border-top:1px solid #eee;font-size:11px;color:#999">
      이 메일은 IAM Center 예약시스템에서 자동 발송되었습니다.
    </div>
  </div>`;
  const text = `${title}\n\n${bodyText}\n\n${linkLabel}: ${linkUrl}\n\n(자동 발송 메일입니다)`;
  return { html, text };
}

// 정기·비정기 예약은 신청 한 번에 회차(·공간)마다 문서가 여러 개 생기므로, 알림은 신청 단위로 한 번만 보내려고
// 같은 recurGroup 문서들을 하나의 요약 객체로 합침 — seriesDateCount가 2 이상이면 아래 렌더러가 묶음 형태로 표기함.
function summarizeReservationGroup(docs) {
  const sorted = [...docs].sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.start).localeCompare(String(b.start)));
  const first = sorted[0] || {};
  const rooms = [...new Set(sorted.map((d) => d.room).filter(Boolean))];
  const dates = [...new Set(sorted.map((d) => d.date).filter(Boolean))].sort();
  const timesUniform = sorted.every((d) => d.start === first.start && d.end === first.end);
  return {
    ...first,
    room: rooms.join(', '),
    seriesDocCount: sorted.length,
    seriesDateCount: dates.length,
    seriesFirstDate: dates[0] || first.date,
    seriesLastDate: dates[dates.length - 1] || first.date,
    seriesTimesUniform: timesUniform,
  };
}
const isSeries = (r) => (r.seriesDateCount || 0) > 1;
// "10월 5일(월) ~ 12월 28일(월) · 매 주 · 12회"
function seriesLabel(r) {
  const kind = r.recurType === '비정기' ? '비정기' : (r.recurType || '정기');
  return `${formatKoreanDate(r.seriesFirstDate)} ~ ${formatKoreanDate(r.seriesLastDate)} · ${kind} ${r.seriesDateCount}회`;
}

// 새 예약 신청(대기) — index.html 셀프 예약 신청
function renderNewReservationEmail(r) {
  const manager = r.managerName || r.stewardName || '신청자';
  const series = isSeries(r);
  const subject = series
    ? `[아이엠센터] 새 예약 신청 – ${r.room || ''} ${r.recurType === '비정기' ? '비정기' : '정기'} ${r.seriesDateCount}회`
    : `[아이엠센터] 새 예약 신청 – ${r.room || ''} ${formatKoreanDate(r.date)}`;
  const intro = `<strong>${esc(manager)}</strong>님이 새 예약을 신청했습니다. 확인 후 승인해 주시기 바랍니다.`;
  const rows = [
    ['신청 기관/모임', r.type || r.subOrg || '-'],
    ['예약 공간', r.room || '-'],
    ['사용 날짜', series ? seriesLabel(r) : formatKoreanDate(r.date)],
    ['이용 시간', series && !r.seriesTimesUniform ? '회차마다 다름 (목록에서 확인)' : formatTimeRange(r.start, r.end)],
    ['반복 여부', r.recurType || '1회성'],
    ['이용 목적', r.purpose || r.showName || '-'],
    ['담당자', manager],
    ['청지기', r.stewardName || '-'],
    ['연락처', r.stewardTel || '-'],
  ];
  return {
    subject,
    ...baseLayout({
      title: 'IAM Center 예약시스템 — 새 예약 신청',
      intro, bodyHtml: factsHtml(rows), bodyText: factsText(rows),
      linkUrl: BASE_URL, linkLabel: '관리자 로그인 후 예약 목록에서 확인',
    }),
  };
}

// 예약 변경·취소 신청 — reservation-change.html
function renderChangeRequestEmail(r) {
  const isCancel = r.requestType === '취소';
  const subject = `[아이엠센터] 예약 ${isCancel ? '취소' : '변경'} 신청 – ${r.room || ''} ${formatKoreanDate(r.date)}`;
  const intro = `<strong>${esc(r.requesterName || '신청자')}</strong>님이 예약 ${isCancel ? '취소' : '변경'}을 신청했습니다.`;
  const rows = [
    ['신청 유형', isCancel ? '취소' : '변경'],
    ['공간', r.room || '-'],
    ['날짜', formatKoreanDate(r.date)],
    ['시간', formatTimeRange(r.start, r.end)],
    ['모임명', r.purpose || '-'],
    ['희망 변경 내용', r.detail || '-'],
    ['신청자', r.requesterName || '-'],
    ['연락처', r.requesterTel || '-'],
  ];
  return {
    subject,
    ...baseLayout({
      title: 'IAM Center 예약시스템 — 변경·취소 신청',
      intro, bodyHtml: factsHtml(rows), bodyText: factsText(rows),
      linkUrl: BASE_URL, linkLabel: '관리자 로그인 후 \'예약 변경·취소 신청\'에서 확인',
    }),
  };
}

// 대관 신청 — venue-apply.html
function renderVenueRequestEmail(r) {
  const spaceLabel = (r.spaces && r.spaces.length ? r.spaces : [r.space]).filter(Boolean).join(', ');
  const dateLabel = r.eventDateEnd ? `${formatKoreanDate(r.eventDate)} ~ ${formatKoreanDate(r.eventDateEnd)}` : formatKoreanDate(r.eventDate);
  const subject = `[아이엠센터] 대관 신청 – ${spaceLabel || '공간 미정'}`;
  const intro = `<strong>${esc(r.orgName || '신청 기관')}</strong>에서 대관을 신청했습니다.`;
  const rows = [
    ['신청 기관', r.orgName || '-'],
    ['공간', spaceLabel || '-'],
    ['행사명', r.eventName || '-'],
    ['날짜', dateLabel],
    ['시간', formatTimeRange(r.timeStart, r.timeEnd)],
    ['인원', r.headcount ? `${r.headcount}명` : '-'],
    ['담당자', r.managerName || '-'],
    ['연락처', r.tel || '-'],
    ['이메일', r.email || '-'],
    ['요청사항', r.etcRequest || '-'],
  ];
  return {
    subject,
    ...baseLayout({
      title: 'IAM Center 예약시스템 — 대관 신청',
      intro, bodyHtml: factsHtml(rows), bodyText: factsText(rows),
      linkUrl: `${BASE_URL}/venue.html`, linkLabel: '관리자 로그인 후 대관 신청 관리에서 확인',
    }),
  };
}

// 카카오톡 "나에게 보내기"용 — object_type: 'text' 템플릿은 길이 제한이 있어 짧게만 요약
function renderNewReservationPushText(r) {
  const manager = r.managerName || r.stewardName || '신청자';
  const time = isSeries(r) && !r.seriesTimesUniform ? '' : ` ${formatTimeRange(r.start, r.end)}`;
  const when = isSeries(r) ? seriesLabel(r) : formatKoreanDate(r.date);
  const text = `[새 예약 신청${isSeries(r) ? ' · ' + (r.recurType === '비정기' ? '비정기' : '정기') : ''}]\n${r.room || ''} · ${when}${time}\n신청자: ${manager}`;
  return { text, linkUrl: BASE_URL };
}

function renderChangeRequestPushText(r) {
  const isCancel = r.requestType === '취소';
  const text = `[예약 ${isCancel ? '취소' : '변경'} 신청]\n${r.room || ''} · ${formatKoreanDate(r.date)}\n신청자: ${r.requesterName || '-'}`;
  return { text, linkUrl: BASE_URL };
}

function renderVenueRequestPushText(r) {
  const spaceLabel = (r.spaces && r.spaces.length ? r.spaces : [r.space]).filter(Boolean).join(', ');
  const text = `[대관 신청]\n${spaceLabel || '공간 미정'} · ${r.orgName || '-'}\n담당자: ${r.managerName || '-'}`;
  return { text, linkUrl: `${BASE_URL}/venue.html` };
}

module.exports = {
  summarizeReservationGroup,
  renderNewReservationEmail, renderChangeRequestEmail, renderVenueRequestEmail,
  renderNewReservationPushText, renderChangeRequestPushText, renderVenueRequestPushText,
};
