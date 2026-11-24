// 임시 저장소 (앱 재시작하면 초기화)
import type { GpsPoint } from '../contracts/recorder';
import type { LocalDb, LocalRun, SessionCheckpoint, SyncUpdate } from './localDb';

export function createMemoryDb(): LocalDb {
  const runs = new Map<string, LocalRun>();
  const points = new Map<string, GpsPoint[]>();
  let checkpoint: SessionCheckpoint | null = null;
  const copy = (run: LocalRun): LocalRun => ({ ...run, laps: [...run.laps], route: [...run.route] });

  return {
    async saveRun(run, runPoints) {
      runs.set(run.id, copy(run));
      points.set(run.id, [...runPoints]);
    },
    async getRun(id) {
      const run = runs.get(id);
      return run ? copy(run) : null;
    },
    async listRuns({ before, limit = 20 } = {}) {
      return [...runs.values()]
        .filter(run => run.deletedAt === null && (before === undefined || run.startedAt < before))
        .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
        .slice(0, limit)
        .map(copy);
    },
    async getPoints(runId) {
      return [...(points.get(runId) ?? [])];
    },
    async softDeleteRun(id, at) {
      const run = runs.get(id);
      if (!run) return;
      runs.set(id, { ...run, deletedAt: at, updatedAt: at, syncStatus: 'pending', summarySynced: false, nextSyncAt: null });
    },
    async listDueForSync(now) {
      return [...runs.values()]
        .filter(run => run.syncStatus !== 'synced' && (run.nextSyncAt === null || run.nextSyncAt <= now))
        .sort((a, b) => a.startedAt.localeCompare(b.startedAt))
        .map(copy);
    },
    async updateSync(id, update: SyncUpdate) {
      const run = runs.get(id);
      if (run) runs.set(id, { ...run, ...update });
    },
    async saveCheckpoint(next, newPoints) {
      checkpoint = { ...next };
      const byTime = new Map((points.get(next.runId) ?? []).map(point => [point.t, point]));
      newPoints.forEach(point => byTime.set(point.t, point));
      points.set(next.runId, [...byTime.values()].sort((a, b) => a.t - b.t));
    },
    async loadCheckpoint() {
      return checkpoint ? { ...checkpoint } : null;
    },
    async clearCheckpoint({ keepPoints = false } = {}) {
      if (checkpoint && !keepPoints && !runs.has(checkpoint.runId)) points.delete(checkpoint.runId);
      checkpoint = null;
    },
  };
}
