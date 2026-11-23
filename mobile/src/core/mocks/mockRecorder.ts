// 가짜 GPS: 1.5초 뒤 fix, 3m/s로 이동
import { haversineM } from '../run/geo';
import {
  emptySnapshot,
  type GpsPoint,
  type Lap,
  type RecorderEvent,
  type RecorderSnapshot,
  type RunRecorder,
  type StartOptions,
} from '../contracts/recorder';

const START = { lat: 37.5444, lng: 127.0374 };
const TICK_MS = 1000;
const FIX_DELAY_MS = 1500;
const SPEED_MPS = 3;

export function createMockRecorder(options: { speedMps?: number; tickMs?: number; fixDelayMs?: number } = {}): RunRecorder {
  const speed = options.speedMps ?? SPEED_MPS;
  const tickMs = options.tickMs ?? TICK_MS;
  const fixDelayMs = options.fixDelayMs ?? FIX_DELAY_MS;
  const listeners = new Set<(event: RecorderEvent) => void>();
  const pointsByRun = new Map<string, GpsPoint[]>();
  let snapshot: RecorderSnapshot = emptySnapshot;
  let timer: ReturnType<typeof setInterval> | null = null;
  let preparedAt = 0;
  let heading = 0;
  let position = START;
  let lapStartMs = 0;

  const emit = (event: RecorderEvent) => listeners.forEach(listener => listener(event));
  const publish = (next: RecorderSnapshot) => { snapshot = next; emit({ type: 'snapshot', snapshot }); };
  const ensureTimer = () => { timer ??= setInterval(tick, tickMs); };
  const clearTimer = () => { if (timer) clearInterval(timer); timer = null; };

  function tickPreparing() {
    const waited = Date.now() - preparedAt;
    const firstFixMs = snapshot.firstFixMs ?? (waited >= fixDelayMs ? waited : undefined);
    const accuracyM = firstFixMs !== undefined ? 5 : Math.max(21, 35 - Math.round((waited / fixDelayMs) * 14));
    publish({ ...snapshot, accuracyM, firstFixMs, sampleCount: snapshot.sampleCount + 1 });
  }

  function tickRecording() {
    if (!snapshot.runId) return;
    const now = Date.now();
    const points = pointsByRun.get(snapshot.runId)!;
    heading += (Math.random() - 0.5) * 0.3;
    const step = speed * (tickMs / 1000);
    const next = {
      lat: position.lat + (step * Math.cos(heading)) / 111_320,
      lng: position.lng + (step * Math.sin(heading)) / (111_320 * Math.cos((position.lat * Math.PI) / 180)),
    };
    const previous = points.at(-1);
    const added = previous ? haversineM(previous, next) : 0;
    position = next;
    points.push({ t: now, ...next, acc: 5, speed, accepted: true });

    const movingMs = snapshot.movingMs + tickMs;
    const distanceM = snapshot.distanceM + added;
    const laps: Lap[] = [...snapshot.laps];
    if (Math.floor(distanceM / 1000) > laps.length) {
      const lap = { lapNo: laps.length + 1, distanceM: 1000, durationSec: Math.round((movingMs - lapStartMs) / 1000) };
      laps.push(lap);
      lapStartMs = movingMs;
      emit({ type: 'lap', lap });
    }
    const recent = points.filter(point => point.t >= now - 30_000);
    const recentDistance = recent.reduce((sum, point, i) => (i === 0 ? 0 : sum + haversineM(recent[i - 1], point)), 0);
    const recentSec = recent.length > 1 ? (recent.at(-1)!.t - recent[0].t) / 1000 : 0;

    publish({
      ...snapshot,
      movingMs,
      distanceM,
      laps,
      accuracyM: 5,
      sampleCount: snapshot.sampleCount + 1,
      acceptedCount: snapshot.acceptedCount + 1,
      currentPaceSecPerKm: recentDistance >= 5 && recentSec > 0 ? (recentSec / recentDistance) * 1000 : null,
      avgPaceSecPerKm: distanceM > 0 ? (movingMs / 1000 / distanceM) * 1000 : null,
    });
  }

  function tick() {
    if (snapshot.status === 'preparing') tickPreparing();
    else if (snapshot.status === 'recording') tickRecording();
  }

  return {
    isReal: false,
    async requestPermission() { return true; },
    async prepare() {
      if (snapshot.status === 'preparing' || snapshot.status === 'recording' || snapshot.status === 'paused') return;
      preparedAt = Date.now();
      publish({ ...emptySnapshot, status: 'preparing', accuracyM: 35 });
      ensureTimer();
    },
    async start({ runId }: StartOptions) {
      if (snapshot.status === 'recording' || snapshot.status === 'paused') return;
      const firstFixMs = snapshot.firstFixMs ?? 0;
      heading = Math.random() * Math.PI * 2;
      position = START;
      lapStartMs = 0;
      pointsByRun.set(runId, []);
      publish({ ...emptySnapshot, runId, status: 'recording', accuracyM: 5, firstFixMs });
      ensureTimer();
    },
    async pause() {
      if (snapshot.status === 'recording') publish({ ...snapshot, status: 'paused', pauseReason: 'manual' });
    },
    async resume() {
      if (snapshot.status === 'paused') publish({ ...snapshot, status: 'recording', pauseReason: undefined });
    },
    async stop() {
      clearTimer();
      if (snapshot.status === 'preparing') publish({ ...emptySnapshot });
      else if (snapshot.status === 'recording' || snapshot.status === 'paused') publish({ ...snapshot, status: 'stopped' });
      return snapshot;
    },
    async getSnapshot() { return snapshot; },
    async getPoints(runId) { return [...(pointsByRun.get(runId) ?? [])]; },
    async getUnfinishedSession() { return null; },
    subscribe(listener) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
  };
}
