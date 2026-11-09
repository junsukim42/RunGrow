export const courses = [
  { id: 'banpo', title: '반포 한강공원 왕복', location: '서울 서초구', distance: '6.0', elevation: '+8', minutes: '38', tags: '평지 · 강변 · 초보 추천', reason: '평지라서 오늘 가벼운 조깅에 알맞아요.' },
  { id: 'forest', title: '서울숲 순환', location: '서울 성동구', distance: '6.4', elevation: '+14', minutes: '41', tags: '평지 · 숲길 · 아침 추천', reason: '나무 그늘이 많아 아침에 달리기 좋아요.' },
  { id: 'namsan', title: '남산 북측순환로', location: '서울 중구', distance: '7.1', elevation: '+96', minutes: '49', tags: '언덕 · 숲길 · 중급 추천', reason: '가벼운 언덕으로 새로운 자극을 더해요.' },
] as const;
export type Course = (typeof courses)[number];
export type RunMode = 'ghost' | 'friend' | 'solo';
export const runModes: { id: RunMode; title: string; description: string }[] = [
  { id: 'ghost', title: '기록 속의 나', description: '5km 최고 기록 27:42의 내가 함께 달려요' },
  { id: 'friend', title: '부산의 서윤님', description: '거리 대결 중 · 지금 1.2km 앞서고 있어요' },
  { id: 'solo', title: '혼자 자유롭게', description: '경쟁 없이 내 기록만 남겨요' },
];
export const leaderboard = [
  { rank: '1', name: '박도윤', location: '서울 송파구', record: '19:48' },
  { rank: '2', name: '이서연', location: '경기 성남시', record: '20:05' },
  { rank: '3', name: '최하늘', location: '부산 수영구', record: '20:11' },
  { rank: '1,283', name: '정유진', location: '내 바로 앞 · 2초 차이', record: '27:40' },
  { rank: '1,284', name: '지호', location: '나', record: '27:42', me: true },
  { rank: '1,285', name: '오세린', location: '서울 성동구', record: '27:45' },
];
export const recentRuns = [
  { id: 'interval', title: '인터벌 400m × 6회', date: '11.01 · 성수 체육공원 트랙', distance: '6.2km', pace: '5′50″', tag: '코칭' },
  { id: 'ghost', title: '기록 속의 나와 5km', date: '10.29 · 반포 한강공원', distance: '5.0km', pace: '5′37″', tag: '고스트' },
  { id: 'duel', title: '서윤님과 거리 대결', date: '10.27 · 중랑천 살곶이길', distance: '4.1km', pace: '6′00″', tag: '대결' },
];
export const periods = {
  '7일': { distance: '18.4', caption: '최근 7일 동안 달린 거리', count: '4', time: '1:49:14', pace: '5′56″', bars: [4.1, 0, 5, 0, 3.1, 6.2, 0], labels: ['화', '수', '목', '금', '토', '일', '월'] },
  '월': { distance: '82.6', caption: '이번 달 달린 거리', count: '16', time: '8:12:36', pace: '5′58″', bars: [18.4, 22.1, 19.6, 22.5], labels: ['1주', '2주', '3주', '4주'] },
  '연': { distance: '186', caption: '올해 달린 거리', count: '41', time: '18:36:20', pace: '6′00″', bars: [0, 0, 0, 0, 0, 0, 0, 35.2, 68.2, 82.6, 0, 0], labels: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'] },
};
