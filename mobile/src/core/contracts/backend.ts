// Supabase: rpc upsert_run, storage raw-points
import type { GpsPoint, Lap } from './recorder';

export type RunSummary = {
  id: string; // UUID v7
  startedAt: string;
  endedAt: string;
  movingSec: number;
  distanceM: number;
  avgPaceSecKm: number;
  calories: number | null;
  source: 'ios' | 'android' | 'web';
  updatedAt: string;
  deletedAt: string | null;
};

// [lng, lat]
export type RouteCoordinates = [lng: number, lat: number][];

export type UpsertRunInput = {
  run: RunSummary;
  laps: Lap[];
  route: RouteCoordinates;
};

export interface BackendClient {
  upsertRun(input: UpsertRunInput): Promise<void>;
  uploadRawPoints(runId: string, points: GpsPoint[]): Promise<string>;
}
