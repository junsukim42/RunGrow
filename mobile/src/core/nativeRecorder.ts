// TODO: 네이티브에 prepare/이벤트/랩/포인트/복구 API가 생기면 교체. 지금은 1초 폴링.
import { gps, requestGpsPermission, type GpsSnapshot } from '../gps';
import { emptySnapshot, type RecorderEvent, type RecorderSnapshot, type RunRecorder } from './contracts/recorder';

const POLL_MS = 1000;

export function createNativeRecorder(): RunRecorder | null {
  if (!gps) return null;
  const module = gps;
  const listeners = new Set<(event: RecorderEvent) => void>();
  let runId: string | null = null;
  let preparing = false;
  let timer: ReturnType<typeof setInterval> | null = null;

  const read = async (): Promise<RecorderSnapshot> => {
    const snapshot = toSnapshot(await module.getSnapshot(), runId);
    return preparing ? { ...snapshot, status: 'preparing', movingMs: 0, distanceM: 0, avgPaceSecPerKm: null } : snapshot;
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
    async getPoints() { return []; },
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
