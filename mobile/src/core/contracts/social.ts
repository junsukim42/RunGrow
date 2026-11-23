// TODO: 순위/대결 범위 미정. 지금은 mock만 사용
export type LeaderboardScope = 'all' | 'friends' | 'region';

export type LeaderboardEntry = {
  rank: number;
  nickname: string;
  location: string;
  recordSec: number;
  isMe: boolean;
};

export interface SocialService {
  readonly isReal: boolean;
  getLeaderboard(scope: LeaderboardScope, distanceKm: number): Promise<LeaderboardEntry[]>;
}
