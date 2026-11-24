// 기기 SQLite 저장소. 앱을 껐다 켜도 기록이 남는다.
import * as SQLite from 'expo-sqlite';
import type { RouteCoordinates } from '../contracts/backend';
import type { GpsPoint, Lap } from '../contracts/recorder';
import type { RunKind } from '../run/session';
import type { LocalDb, LocalRun, SessionCheckpoint, SyncStatus } from './localDb';
import { LOCAL_SCHEMA_SQL, LOCAL_SCHEMA_VERSION } from './schema';

type RunRow = {
  id: string; started_at: string; ended_at: string; moving_sec: number; distance_m: number;
  avg_pace_sec_km: number; calories: number | null; route_json: string; raw_points_path: string | null;
  source: LocalRun['source']; kind: RunKind; updated_at: string; deleted_at: string | null;
  sync_status: SyncStatus; summary_synced: number; sync_attempts: number; next_sync_at: number | null;
  last_sync_error: string | null;
};
type LapRow = { run_id: string; lap_no: number; distance_m: number; duration_sec: number };
type PointRow = { t: number; lat: number; lng: number; acc: number; alt: number | null; speed: number | null; accepted: number };
type CheckpointRow = { run_id: string; started_at: number; kind: RunKind; snapshot_json: string; updated_at: number };

const POINT_SQL = 'INSERT OR REPLACE INTO points (run_id, t, lat, lng, acc, alt, speed, accepted) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';

async function migrate(db: SQLite.SQLiteDatabase) {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  if (current > LOCAL_SCHEMA_VERSION) throw new Error(`더 새로운 앱에서 만든 데이터베이스예요 (v${current}).`);
  if (current === LOCAL_SCHEMA_VERSION) return;
  await db.withTransactionAsync(async () => {
    await db.execAsync(LOCAL_SCHEMA_SQL);
    // v2 이상이 생기면 여기서 current < N 단계별 ALTER를 추가한다.
    await db.execAsync(`PRAGMA user_version = ${LOCAL_SCHEMA_VERSION}`);
  });
}

async function insertPoints(db: SQLite.SQLiteDatabase, runId: string, points: GpsPoint[]) {
  if (points.length === 0) return;
  const statement = await db.prepareAsync(POINT_SQL);
  try {
    for (const p of points) {
      await statement.executeAsync(runId, Math.round(p.t), p.lat, p.lng, p.acc, p.alt ?? null, p.speed ?? null, p.accepted ? 1 : 0);
    }
  } finally {
    await statement.finalizeAsync();
  }
}

function toRun(row: RunRow, laps: Lap[]): LocalRun {
  return {
    id: row.id, startedAt: row.started_at, endedAt: row.ended_at, movingSec: row.moving_sec, distanceM: row.distance_m,
    avgPaceSecKm: row.avg_pace_sec_km, calories: row.calories, source: row.source, kind: row.kind,
    updatedAt: row.updated_at, deletedAt: row.deleted_at, laps, route: JSON.parse(row.route_json) as RouteCoordinates,
    rawPointsPath: row.raw_points_path, syncStatus: row.sync_status, summarySynced: row.summary_synced === 1,
    syncAttempts: row.sync_attempts, nextSyncAt: row.next_sync_at, lastSyncError: row.last_sync_error,
  };
}

export function createSqliteDb(name = 'rungrow.db'): LocalDb {
  let opened: Promise<SQLite.SQLiteDatabase> | null = null;
  const open = () => opened ??= (async () => {
    const db = await SQLite.openDatabaseAsync(name);
    await migrate(db);
    return db;
  })().catch(error => { opened = null; throw error; });

  async function hydrate(db: SQLite.SQLiteDatabase, rows: RunRow[]): Promise<LocalRun[]> {
    if (rows.length === 0) return [];
    const marks = rows.map(() => '?').join(',');
    const laps = await db.getAllAsync<LapRow>(`SELECT * FROM run_laps WHERE run_id IN (${marks}) ORDER BY lap_no`, rows.map(row => row.id));
    return rows.map(row => toRun(row, laps.filter(lap => lap.run_id === row.id)
      .map(lap => ({ lapNo: lap.lap_no, distanceM: lap.distance_m, durationSec: lap.duration_sec }))));
  }

  return {
    async saveRun(run, points) {
      const db = await open();
      await db.withTransactionAsync(async () => {
        await db.runAsync(
          `INSERT OR REPLACE INTO runs (id, started_at, ended_at, moving_sec, distance_m, avg_pace_sec_km, calories, route_json,
             raw_points_path, source, kind, updated_at, deleted_at, sync_status, summary_synced, sync_attempts, next_sync_at, last_sync_error)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          run.id, run.startedAt, run.endedAt, run.movingSec, run.distanceM, run.avgPaceSecKm, run.calories, JSON.stringify(run.route),
          run.rawPointsPath, run.source, run.kind, run.updatedAt, run.deletedAt, run.syncStatus, run.summarySynced ? 1 : 0,
          run.syncAttempts, run.nextSyncAt, run.lastSyncError,
        );
        await db.runAsync('DELETE FROM run_laps WHERE run_id = ?', run.id);
        for (const lap of run.laps) {
          await db.runAsync('INSERT INTO run_laps (run_id, lap_no, distance_m, duration_sec) VALUES (?, ?, ?, ?)', run.id, lap.lapNo, lap.distanceM, lap.durationSec);
        }
        await db.runAsync('DELETE FROM points WHERE run_id = ?', run.id);
        await insertPoints(db, run.id, points);
      });
    },
    async getRun(id) {
      const db = await open();
      const row = await db.getFirstAsync<RunRow>('SELECT * FROM runs WHERE id = ?', id);
      return row ? (await hydrate(db, [row]))[0] : null;
    },
    async listRuns({ before, limit = 20 } = {}) {
      const db = await open();
      const rows = await db.getAllAsync<RunRow>(
        `SELECT * FROM runs WHERE deleted_at IS NULL ${before === undefined ? '' : 'AND started_at < ?'} ORDER BY started_at DESC LIMIT ?`,
        ...(before === undefined ? [limit] : [before, limit]),
      );
      return hydrate(db, rows);
    },
    async getPoints(runId) {
      const db = await open();
      const rows = await db.getAllAsync<PointRow>('SELECT t, lat, lng, acc, alt, speed, accepted FROM points WHERE run_id = ? ORDER BY t', runId);
      return rows.map(row => ({
        t: row.t, lat: row.lat, lng: row.lng, acc: row.acc, accepted: row.accepted === 1,
        ...(row.alt !== null && { alt: row.alt }), ...(row.speed !== null && { speed: row.speed }),
      }));
    },
    async softDeleteRun(id, at) {
      const db = await open();
      await db.runAsync(
        `UPDATE runs SET deleted_at = ?, updated_at = ?, sync_status = 'pending', summary_synced = 0, next_sync_at = NULL WHERE id = ?`, at, at, id);
    },
    async listDueForSync(now) {
      const db = await open();
      const rows = await db.getAllAsync<RunRow>(
        `SELECT * FROM runs WHERE sync_status != 'synced' AND (next_sync_at IS NULL OR next_sync_at <= ?) ORDER BY started_at`, now);
      return hydrate(db, rows);
    },
    async updateSync(id, update) {
      const db = await open();
      const setRawPath = 'rawPointsPath' in update;
      await db.runAsync(
        `UPDATE runs SET sync_status = ?, summary_synced = ?, sync_attempts = ?, next_sync_at = ?, last_sync_error = ?${setRawPath ? ', raw_points_path = ?' : ''} WHERE id = ?`,
        ...[update.syncStatus, update.summarySynced ? 1 : 0, update.syncAttempts, update.nextSyncAt, update.lastSyncError,
          ...(setRawPath ? [update.rawPointsPath ?? null] : []), id],
      );
    },
    async saveCheckpoint(checkpoint, newPoints) {
      const db = await open();
      await db.withTransactionAsync(async () => {
        await insertPoints(db, checkpoint.runId, newPoints);
        await db.runAsync(
          `INSERT OR REPLACE INTO active_session (id, run_id, started_at, kind, snapshot_json, updated_at) VALUES (1, ?, ?, ?, ?, ?)`,
          checkpoint.runId, checkpoint.startedAt, checkpoint.kind, JSON.stringify(checkpoint.snapshot), checkpoint.updatedAt,
        );
      });
    },
    async loadCheckpoint(): Promise<SessionCheckpoint | null> {
      const db = await open();
      const row = await db.getFirstAsync<CheckpointRow>('SELECT * FROM active_session WHERE id = 1');
      if (!row) return null;
      try {
        return { runId: row.run_id, startedAt: row.started_at, kind: row.kind, snapshot: JSON.parse(row.snapshot_json), updatedAt: row.updated_at };
      } catch {
        return null; // 깨진 체크포인트는 복구하지 않는다
      }
    },
    async clearCheckpoint({ keepPoints = false } = {}) {
      const db = await open();
      await db.withTransactionAsync(async () => {
        if (!keepPoints) {
          await db.runAsync('DELETE FROM points WHERE run_id = (SELECT run_id FROM active_session WHERE id = 1) AND run_id NOT IN (SELECT id FROM runs)');
        }
        await db.runAsync('DELETE FROM active_session WHERE id = 1');
      });
    },
  };
}
