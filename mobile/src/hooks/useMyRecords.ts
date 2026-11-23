import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { services } from '../core/services';
import type { LocalRun } from '../core/db/localDb';
import { findBests, type Bests } from '../core/run/stats';

export const EXAMPLE_5K_SEC = 1662; // 27:42 (기록 없을 때)

export type GhostTarget = {
  recordSec: number;
  paceSecKm: number;
  isExample: boolean;
  startedAt: string | null;
};

export function useLocalRuns(): LocalRun[] {
  const [runs, setRuns] = useState<LocalRun[]>([]);
  useFocusEffect(useCallback(() => {
    let active = true;
    services.db.listRuns({ limit: 1000 }).then(result => { if (active) setRuns(result); }).catch(() => {});
    return () => { active = false; };
  }, []));
  return runs;
}

export function useMyRecords(): { runs: LocalRun[]; bests: Bests; ghost: GhostTarget } {
  const runs = useLocalRuns();
  return useMemo(() => {
    const bests = findBests(runs);
    const ghost: GhostTarget = bests.km5
      ? { recordSec: bests.km5.sec, paceSecKm: bests.km5.sec / 5, isExample: false, startedAt: bests.km5.startedAt }
      : { recordSec: EXAMPLE_5K_SEC, paceSecKm: EXAMPLE_5K_SEC / 5, isExample: true, startedAt: null };
    return { runs, bests, ghost };
  }, [runs]);
}
