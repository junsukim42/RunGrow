import type { LocalRun } from '../db/localDb';

export type Period = '7일' | '월' | '연';

export type PeriodSummary = {
  caption: string;
  distanceM: number;
  count: number;
  movingSec: number;
  avgPaceSecKm: number | null;
  bars: number[];
  labels: string[];
};

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const DAY_MS = 86_400_000;

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

export function summarizePeriod(runs: LocalRun[], period: Period, now: Date = new Date()): PeriodSummary {
  let from: Date;
  let to: Date;
  let labels: string[];
  let bucketOf: (date: Date) => number;
  let caption: string;

  if (period === '7일') {
    const today = startOfDay(now);
    from = new Date(today.getTime() - 6 * DAY_MS);
    to = new Date(today.getTime() + DAY_MS);
    labels = Array.from({ length: 7 }, (_, i) => WEEKDAYS[new Date(from.getTime() + i * DAY_MS).getDay()]);
    bucketOf = date => Math.round((startOfDay(date).getTime() - from.getTime()) / DAY_MS);
    caption = '최근 7일 동안 달린 거리';
  } else if (period === '월') {
    from = new Date(now.getFullYear(), now.getMonth(), 1);
    to = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    labels = Array.from({ length: Math.ceil(days / 7) }, (_, i) => `${i + 1}주`);
    bucketOf = date => Math.floor((date.getDate() - 1) / 7);
    caption = '이번 달 달린 거리';
  } else {
    from = new Date(now.getFullYear(), 0, 1);
    to = new Date(now.getFullYear() + 1, 0, 1);
    labels = Array.from({ length: 12 }, (_, i) => String(i + 1));
    bucketOf = date => date.getMonth();
    caption = '올해 달린 거리';
  }

  const barsM = labels.map(() => 0);
  let distanceM = 0;
  let movingSec = 0;
  let count = 0;
  for (const run of runs) {
    const started = new Date(run.startedAt);
    if (run.deletedAt !== null || started < from || started >= to) continue;
    count++;
    distanceM += run.distanceM;
    movingSec += run.movingSec;
    barsM[bucketOf(started)] += run.distanceM;
  }
  return {
    caption,
    distanceM,
    count,
    movingSec,
    avgPaceSecKm: distanceM > 0 ? (movingSec / distanceM) * 1000 : null,
    bars: barsM.map(m => Math.round(m / 100) / 10),
    labels,
  };
}

export type Best = { sec: number; runId: string; startedAt: string } | null;
export type Bests = { km1: Best; km5: Best; km10: Best };

// 5k/10k = 앞 5/10개 랩 합
export function findBests(runs: LocalRun[]): Bests {
  const best = (sec: number, run: LocalRun, current: Best): Best =>
    current === null || sec < current.sec ? { sec, runId: run.id, startedAt: run.startedAt } : current;
  let km1: Best = null;
  let km5: Best = null;
  let km10: Best = null;
  for (const run of runs) {
    if (run.deletedAt !== null) continue;
    const full = run.laps.filter(lap => lap.distanceM >= 1000);
    for (const lap of full) km1 = best(lap.durationSec, run, km1);
    if (full.length >= 5) km5 = best(full.slice(0, 5).reduce((sum, lap) => sum + lap.durationSec, 0), run, km5);
    if (full.length >= 10) km10 = best(full.slice(0, 10).reduce((sum, lap) => sum + lap.durationSec, 0), run, km10);
  }
  return { km1, km5, km10 };
}
