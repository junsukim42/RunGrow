import type { RouteCoordinates, RunSummary } from '../contracts/backend';
import type { GpsPoint, Lap, RecorderSnapshot } from '../contracts/recorder';
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

// 기록 중인 세션의 마지막 저장 상태. 정상 종료·폐기 때 지운다.
export type SessionCheckpoint = {
  runId: string;
  startedAt: number; // ms
  kind: RunKind;
  snapshot: RecorderSnapshot;
  updatedAt: number; // ms
};

export interface LocalDb {
  saveRun(run: LocalRun, points: GpsPoint[]): Promise<void>;
  getRun(id: string): Promise<LocalRun | null>;
  listRuns(options?: { before?: string; limit?: number }): Promise<LocalRun[]>;
  getPoints(runId: string): Promise<GpsPoint[]>;
  softDeleteRun(id: string, at: string): Promise<void>;
  listDueForSync(now: number): Promise<LocalRun[]>;
  updateSync(id: string, update: SyncUpdate): Promise<void>;
  // newPoints는 이전 저장 이후 새로 쌓인 포인트만 넘긴다(같은 t는 덮어씀).
  saveCheckpoint(checkpoint: SessionCheckpoint, newPoints: GpsPoint[]): Promise<void>;
  loadCheckpoint(): Promise<SessionCheckpoint | null>;
  // 체크포인트와 그 포인트를 지운다. 이미 saveRun으로 옮겼다면 포인트는 남긴다.
  clearCheckpoint(options?: { keepPoints?: boolean }): Promise<void>;
}
