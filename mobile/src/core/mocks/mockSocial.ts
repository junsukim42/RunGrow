import type { LeaderboardEntry, SocialService } from '../contracts/social';

const sample: LeaderboardEntry[] = [
  { rank: 1, nickname: '박도윤', location: '서울 송파구', recordSec: 1188, isMe: false },
  { rank: 2, nickname: '이서연', location: '경기 성남시', recordSec: 1205, isMe: false },
  { rank: 3, nickname: '최하늘', location: '부산 수영구', recordSec: 1211, isMe: false },
  { rank: 1283, nickname: '정유진', location: '서울 성동구', recordSec: 1660, isMe: false },
  { rank: 1284, nickname: '지호', location: '서울 성동구', recordSec: 1662, isMe: true },
  { rank: 1285, nickname: '오세린', location: '서울 성동구', recordSec: 1665, isMe: false },
];

export function createMockSocial(): SocialService {
  return {
    isReal: false,
    async getLeaderboard(scope) {
      if (scope === 'all') return sample;
      return sample.filter(entry => entry.rank > 1000);
    },
  };
}
