// 네이티브 GPS 모듈 인터페이스

export type GpsPoint = {
  t: number; // ms
  lat: number;
  lng: number;
  acc: number; // m
  alt?: number;
  speed?: number; // m/s
  accepted: boolean; // 필터 통과 여부
};

export type Lap = {
  lapNo: number;
  distanceM: number;
  durationSec: number;
};

// preparing: 위치만 받는 중 (거리/시간 X)
export type RecorderStatus = 'idle' | 'preparing' | 'recording' | 'paused' | 'stopped' | 'interrupted';

export type PauseReason = 'manual' | 'auto';

export type RecorderSnapshot = {
  runId: string | null;
  status: RecorderStatus;
  pauseReason?: PauseReason;
  movingMs: number;
  distanceM: number;
  currentPaceSecPerKm: number | null; // 최근 30초 기준
  avgPaceSecPerKm: number | null;
  laps: Lap[];
  accuracyM?: number;
  firstFixMs?: number;
  sampleCount: number;
  acceptedCount: number;
};

export type RecorderEvent =
  | { type: 'snapshot'; snapshot: RecorderSnapshot }
  | { type: 'lap'; lap: Lap }
  | { type: 'error'; message: string };

export type UnfinishedSession = {
  runId: string;
  startedAt: number;
  snapshot: RecorderSnapshot;
};

export type StartOptions = {
  runId: string;
  autoPause: boolean;
};

export interface RunRecorder {
  readonly isReal: boolean;
  requestPermission(): Promise<boolean>;
  // GPS만 미리 잡음. 취소는 stop()
  prepare(): Promise<void>;
  start(options: StartOptions): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  stop(): Promise<RecorderSnapshot>;
  getSnapshot(): Promise<RecorderSnapshot>;
  getPoints(runId: string): Promise<GpsPoint[]>;
  getUnfinishedSession(): Promise<UnfinishedSession | null>;
  subscribe(listener: (event: RecorderEvent) => void): () => void;
}

export const emptySnapshot: RecorderSnapshot = {
  runId: null,
  status: 'idle',
  movingMs: 0,
  distanceM: 0,
  currentPaceSecPerKm: null,
  avgPaceSecPerKm: null,
  laps: [],
  sampleCount: 0,
  acceptedCount: 0,
};
