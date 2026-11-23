import type { BackendClient } from '../contracts/backend';
import type { LocalDb, LocalRun } from '../db/localDb';

export const BACKOFF_MS = [30_000, 120_000, 600_000, 3_600_000] as const; // 30s, 2m, 10m, 1h

export function nextBackoffMs(attempts: number): number {
  return BACKOFF_MS[Math.min(Math.max(attempts, 1), BACKOFF_MS.length) - 1];
}

export type SyncResult = { synced: string[]; failed: string[] };

export function createSyncQueue(db: LocalDb, backend: BackendClient, clock: () => number = Date.now) {
  let running: Promise<SyncResult> | null = null;
  let requestedAgain = false;

  async function syncOne(run: LocalRun): Promise<boolean> {
    let summarySynced = run.summarySynced;
    try {
      if (!summarySynced) {
        await backend.upsertRun({ run: toSummary(run), laps: run.laps, route: run.route });
        summarySynced = true;
      }
      let rawPointsPath = run.rawPointsPath;
      if (run.deletedAt === null && rawPointsPath === null) {
        rawPointsPath = await backend.uploadRawPoints(run.id, await db.getPoints(run.id));
      }
      await db.updateSync(run.id, {
        syncStatus: 'synced', summarySynced, rawPointsPath, syncAttempts: 0, nextSyncAt: null, lastSyncError: null,
      });
      return true;
    } catch (error) {
      const syncAttempts = run.syncAttempts + 1;
      await db.updateSync(run.id, {
        syncStatus: 'failed',
        summarySynced,
        syncAttempts,
        nextSyncAt: clock() + nextBackoffMs(syncAttempts),
        lastSyncError: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  async function drain(): Promise<SyncResult> {
    const result: SyncResult = { synced: [], failed: [] };
    do {
      requestedAgain = false;
      for (const run of await db.listDueForSync(clock())) {
        if (result.synced.includes(run.id) || result.failed.includes(run.id)) continue;
        (await syncOne(run) ? result.synced : result.failed).push(run.id);
      }
    } while (requestedAgain);
    return result;
  }

  return {
    flush(): Promise<SyncResult> {
      if (running) requestedAgain = true;
      else running = drain().finally(() => { running = null; });
      return running;
    },
  };
}

export type SyncQueue = ReturnType<typeof createSyncQueue>;

function toSummary(run: LocalRun) {
  const { id, startedAt, endedAt, movingSec, distanceM, avgPaceSecKm, calories, source, updatedAt, deletedAt } = run;
  return { id, startedAt, endedAt, movingSec, distanceM, avgPaceSecKm, calories, source, updatedAt, deletedAt };
}
