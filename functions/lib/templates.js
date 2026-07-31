const { formatKoreanDate, formatTimeRange } = require('./format');

const BASE_URL = process.env.APP_BASE_URL || 'https://iamreservation.web.app';
const CONTACT = 'iamspace@suwoncca.org';

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function recurLabel(r) {
  if (!r.recurType) return '1회성';
  return r.recurEndDate ? `${r.recurType} (종료일: ${formatKoreanDate(r.recurEndDate)})` : r.recurType;
}

// 승인·변경·취소 메일이 공유하는 예약 정보 표 — 상태·문구만 각 유형에서 다르게 채운다.
function factRows(r) {
  return [
    ['사용 기관/모임', r.type || r.subOrg || '-'],
    ['예약 공간', r.room || '-'],
    ['사용 날짜', formatKoreanDate(r.date)],
    ['이용 시간', formatTimeRange(r.start, r.end)],
    ['반복 여부', recurLabel(r)],
    ['이용 목적', r.purpose || '-'],
  ];
}

function factsHtml(rows) {
  return `<table style="width:100%;border-collapse:collapse;font-size:14px;margin:16px 0">
    ${rows.map(([label, value]) => `
      <tr>
        <td style="padding:5px 10px 5px 0;color:#666;white-space:nowrap;vertical-align:top">${esc(label)}</td>
        <td style="padding:5px 0;font-weight:600">${esc(value)}</td>
      </tr>`).join('')}
  </table>`;
}

function factsText(rows) {
  return rows.map(([label, value]) => `${label}: ${value}`).join('\n');
}

function baseLayout({ intro, bodyHtml, bodyText }) {
  const html = `
  <div style="font-family:-apple-system,'Malgun Gothic',sans-serif;max-width:560px;margin:0 auto;color:#222">
    <div style="padding:18px 0;border-bottom:2px solid #2F6FED">
      <h1 style="font-size:17px;margin:0;color:#2F6FED">IAM Center 예약시스템</h1>
    </div>
    <div style="padding:20px 0">
      <p style="font-size:15px;line-height:1.6;margin:0 0 4px">${intro}</p>
      ${bodyHtml}
      <div style="margin:22px 0">
        <a href="${BASE_URL}" style="display:inline-block;padding:10px 18px;background:#2F6FED;color:#fff;text-decoration:none;border-radius:6px;font-size:14px">
          예약 상세보기
        </a>
        <p style="font-size:12px;color:#999;margin:6px 0 0">로그인 후 '내 예약'에서 본인 예약 내역을 확인할 수 있습니다.</p>
      </div>
      <p style="font-size:13px;color:#666;margin:0">문의: ${CONTACT}</p>
    </div>
    <div style="padding:14px 0;border-top:1px solid #eee;font-size:11px;color:#999">
      이 메일은 IAM Center 예약시스템에서 자동 발송되었습니다.
    </div>
  </div>`;
  const text = `IAM Center 예약시스템\n\n${bodyText}\n\n상세보기: ${BASE_URL} (로그인 후 '내 예약'에서 확인)\n문의: ${CONTACT}\n\n(자동 발송 메일입니다)`;
  return { html, text };
}

// type: '확정' (승인) — '변경'·'취소'는 3단계 이후 구현 예정, 지금은 null 반환
function renderReservationEmail(type, r) {
  const manager = r.managerName || r.stewardName || '담당자';
  const roomDate = `${r.room || ''} / ${formatKoreanDate(r.date)}`;

  if (type === '확정') {
    const subject = `[아이엠센터] 예약이 승인되었습니다 – ${roomDate}`;
    const intro = `${esc(manager)}님, 신청하신 예약이 <strong style="color:#2F8F4E">승인</strong>되었습니다.`;
    const rows = [['예약 상태', '승인'], ...factRows(r)];
    const bodyHtml = factsHtml(rows);
    const bodyText = `${manager}님, 신청하신 예약이 승인되었습니다.\n\n${factsText(rows)}`;
    return { subject, ...baseLayout({ intro, bodyHtml, bodyText }) };
  }

  return null;
}

module.exports = { renderReservationEmail };
