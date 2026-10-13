// 공개용 예약 사본(publicReservations)에 복사할 필드 목록.
// 이름·연락처·이메일·메모·처리 이력 같은 개인정보는 절대 넣지 않는다 (허용 목록 방식).
// 새 필드를 공개 화면에 보여줘야 할 때만 여기에 추가할 것.
const PUBLIC_FIELDS = [
  'room', 'date', 'start', 'end', 'status', 'purpose', 'people',
  'type', 'subOrg',
  'recurGroup', 'recurType', 'recurTotal', 'recurWeekdays',
  // 아이엠홀 행사 정보 (공연명·시간·관객 수 등, 개인정보 아님)
  'showName', 'rehearsalStart', 'rehearsalEnd', 'audienceCount', 'roomsUsed', 'parking',
  // 필요 시설
  'needTV', 'needMic', 'needPantry', 'needTerrace',
  // 지혜홀(숙박)
  'jihyeRooms', 'checkinTime', 'checkoutTime',
  'createdAt',
];

// 공개 사본 구조가 바뀌면 숫자를 올린다 → 관리자 로그인 시 전체 재생성이 자동 요청됨
const PUBLIC_MIRROR_VERSION = 1;

function toPublicReservation(data) {
  const out = {};
  for (const k of PUBLIC_FIELDS) {
    if (data[k] !== undefined) out[k] = data[k];
  }
  return out;
}

module.exports = { PUBLIC_FIELDS, PUBLIC_MIRROR_VERSION, toPublicReservation };
