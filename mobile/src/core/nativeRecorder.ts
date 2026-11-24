// TODO: 네이티브에 prepare/이벤트/랩/포인트/복구 API가 생기면 교체. 지금은 1초 폴링.
import { gps, requestGpsPermission, type GpsSnapshot } from '../gps';
import { emptySnapshot, type RecorderEvent, type RecorderSnapshot, type RunRecorder } from './contracts/recorder';

const POLL_MS = 1000;
const PACE_WINDOW_MS = 30_000;
const PACE_MIN_DISTANCE_M = 5;

type PaceSample = { movingMs: number; distanceM: number };

// 최근 30초 이동 거리·시간으로 지금 페이스 계산. 일시정지 시간은 movingMs에 빠져 있다.
function currentPace(history: PaceSample[], now: PaceSample): number | null {
  const oldest = history.find(sample => sample.movingMs >= now.movingMs - PACE_WINDOW_MS);
  if (!oldest) return null;
  const meters = now.distanceM - oldest.distanceM;
  const seconds = (now.movingMs - oldest.movingMs) / 1000;
  return meters >= PACE_MIN_DISTANCE_M && seconds > 0 ? (seconds / meters) * 1000 : null;
}

export function createNativeRecorder(): RunRecorder | null {
  if (!gps) return null;
  const module = gps;
  const listeners = new Set<(event: RecorderEvent) => void>();
  let runId: string | null = null;
  let preparing = false;
  let timer: ReturnType<typeof setInterval> | null = null;
  let paceHistory: PaceSample[] = [];

  const read = async (): Promise<RecorderSnapshot> => {
    const snapshot = toSnapshot(await module.getSnapshot(), runId);
    if (preparing) return { ...snapshot, status: 'preparing', movingMs: 0, distanceM: 0, avgPaceSecPerKm: null };
    if (snapshot.status !== 'recording') return snapshot;
    const now = { movingMs: snapshot.movingMs, distanceM: snapshot.distanceM };
    // 새 측정이 시작돼 시간이 거꾸로 가면 기록을 비운다.
    if (paceHistory.length > 0 && now.movingMs < paceHistory[paceHistory.length - 1].movingMs) paceHistory = [];
    paceHistory.push(now);
    paceHistory = paceHistory.filter(sample => sample.movingMs >= now.movingMs - PACE_WINDOW_MS - 5_000);
    return { ...snapshot, currentPaceSecPerKm: currentPace(paceHistory, now) };
  };
  const poll = async () => {
    try {
      const snapshot = await read();
      listeners.forEach(listener => listener({ type: 'snapshot', snapshot }));
    } catch (error) {
      listeners.forEach(listener => listener({ type: 'error', message: error instanceof Error ? error.message : String(error) }));
    }
  };

  return {
    isReal: true,
    requestPermission: requestGpsPermission,
    async prepare() {
      if (preparing) return;
      preparing = true;
      await module.start();
    },
    async start(options) {
      runId = options.runId;
      paceHistory = [];
      if (preparing) { preparing = false; await module.stop(); }
      await module.start();
    },
    pause: () => module.pause(),
    resume: () => module.resume(),
    async stop() {
      const wasPreparing = preparing;
      preparing = false;
      await module.stop();
      return wasPreparing ? { ...emptySnapshot } : read();
    },
    getSnapshot: read,
    async getPoints(id) { return id === runId ? module.getPoints() : []; },
    // 강제 종료 복구는 runStore가 DB 체크포인트로 처리한다. 네이티브는 프로세스가 죽으면 상태가 사라진다.
    async getUnfinishedSession() { return null; },
    subscribe(listener) {
      listeners.add(listener);
      timer ??= setInterval(poll, POLL_MS);
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && timer) { clearInterval(timer); timer = null; }
      };
    },
  };
}

function toSnapshot(native: GpsSnapshot, runId: string | null): RecorderSnapshot {
  const { status, movingMs, distanceMeters, sampleCount, acceptedCount, accuracyMeters, firstFixMs } = native;
  return {
    ...emptySnapshot,
    runId,
    status,
    movingMs,
    distanceM: distanceMeters,
    sampleCount,
    acceptedCount,
    accuracyM: accuracyMeters,
    firstFixMs,
    avgPaceSecPerKm: distanceMeters > 0 ? (movingMs / 1000 / distanceMeters) * 1000 : null,
  };
}
