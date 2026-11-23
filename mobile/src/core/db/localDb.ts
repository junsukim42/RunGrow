import type { RouteCoordinates, RunSummary } from '../contracts/backend';
import type { GpsPoint, Lap } from '../contracts/recorder';
import type { RunKind } from '../run/session';

export type SyncStatus = 'pending' | 'synced' | 'failed';

export type LocalRun = RunSummary & {
  kind: RunKind; // TODO: 서버 runs 칼럼 추가
  laps: Lap[];
  route: RouteCoordinates;
  rawPointsPath: string | null;
  syncStatus: SyncStatus;
  summarySynced: boolean; // upsert_run 성공 여부
  syncAttempts: number;
  nextSyncAt: number | null;
  lastSyncError: string | null;
};

export type SyncUpdate = Pick<LocalRun, 'syncStatus' | 'summarySynced' | 'syncAttempts' | 'nextSyncAt' | 'lastSyncError'>
  & Partial<Pick<LocalRun, 'rawPointsPath'>>;

export interface LocalDb {
  saveRun(run: LocalRun, points: GpsPoint[]): Promise<void>;
  getRun(id: string): Promise<LocalRun | null>;
  listRuns(options?: { before?: string; limit?: number }): Promise<LocalRun[]>;
  getPoints(runId: string): Promise<GpsPoint[]>;
  softDeleteRun(id: string, at: string): Promise<void>;
  listDueForSync(now: number): Promise<LocalRun[]>;
  updateSync(id: string, update: SyncUpdate): Promise<void>;
}
