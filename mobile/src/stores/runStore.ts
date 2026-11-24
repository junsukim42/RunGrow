import { createStore, type StoreApi } from 'zustand/vanilla';
import { useStore } from 'zustand';
import { Platform } from 'react-native';
import type { RunSummary } from '../core/contracts/backend';
import { emptySnapshot, type RecorderSnapshot } from '../core/contracts/recorder';
import { uuidv7 } from '../core/id';
import { simplifyRoute } from '../core/run/geo';
import { initialRunState, transition, type RunEvent, type RunKind, type RunState } from '../core/run/session';
import type { LocalRun } from '../core/db/localDb';
import { services, type Services } from '../core/services';

export type RunStoreState = RunState & {
  snapshot: RecorderSnapshot;
  startedAt: number | null;
  savedRunId: string | null;
  recoveredAt: number | null; // 강제 종료에서 복구한 기록의 마지막 저장 시각(ms)
  kind: RunKind;
  error: string | null;
  prepare(): Promise<void>;
  beginCountdown(): void;
  cancelCountdown(): void;
  start(kind?: RunKind): Promise<void>;
  cancel(): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  stop(): Promise<void>;
  keep(): Promise<void>;
  discard(): Promise<void>;
  checkRecovery(): Promise<void>;
  saveRecovered(): Promise<void>;
  reset(): void;
};

const CHECKPOINT_MS = 10_000;

type Deps = Pick<Services, 'recorder' | 'db' | 'syncQueue'> & { source: RunSummary['source'] };

export function createRunStore(deps: Deps): StoreApi<RunStoreState> {
  const { recorder, db, syncQueue } = deps;
  let unsubscribe: (() => void) | null = null;
  let checkpointing: Promise<void> | null = null;
  let checkpointedAt = 0;
  let checkpointedPoints = 0;

  return createStore<RunStoreState>((set, get) => {
    const send = (event: RunEvent) => {
      const current = get();
      const next = transition(current, event);
      if (next !== current) set({ phase: next.phase, runId: next.runId, pauseReason: next.pauseReason });
      return next;
    };

    const listen = () => {
      unsubscribe?.();
      unsubscribe = recorder.subscribe(event => {
        if (event.type === 'error') return set({ error: event.message });
        if (event.type !== 'snapshot') return;
        const { snapshot } = event;
        set({ snapshot });
        const { phase } = get();
        if (phase === 'acquiring' && snapshot.firstFixMs !== undefined) send({ type: 'FIX' });
        if (phase === 'recording' || phase === 'paused') {
          if (phase === 'recording' && snapshot.status === 'paused') send({ type: 'PAUSE', reason: snapshot.pauseReason ?? 'auto' });
          if (phase === 'paused' && snapshot.status === 'recording') send({ type: 'RESUME' });
          void checkpoint();
        }
      });
    };

    const stopListening = () => { unsubscribe?.(); unsubscribe = null; };

    // 기록 중 주기적으로 스냅샷과 새 포인트를 저장해, 앱이 강제 종료돼도 복구할 수 있게 한다.
    const checkpoint = (force = false): Promise<void> => {
      const { runId, startedAt, snapshot, kind, phase } = get();
      if (checkpointing || !runId || startedAt === null || (phase !== 'recording' && phase !== 'paused')) return checkpointing ?? Promise.resolve();
      if (!force && Date.now() - checkpointedAt < CHECKPOINT_MS) return Promise.resolve();
      checkpointing = (async () => {
        try {
          const points = await recorder.getPoints(runId);
          await db.saveCheckpoint({ runId, startedAt, kind, snapshot, updatedAt: Date.now() }, points.slice(checkpointedPoints));
          checkpointedPoints = points.length;
          checkpointedAt = Date.now();
        } catch {
          // 저장 실패가 기록을 멈추면 안 된다. 다음 주기에 다시 시도한다.
        } finally {
          checkpointing = null;
        }
      })();
      return checkpointing;
    };

    const persist = async () => {
      const { runId, snapshot, startedAt, recoveredAt } = get();
      if (!runId || startedAt === null) return;
      await checkpointing; // 진행 중인 체크포인트가 지운 뒤에 다시 쓰지 않게 기다린다
      // 복구한 기록은 네이티브에 포인트가 없으므로 체크포인트로 저장해 둔 것을 쓴다.
      const live = recoveredAt === null ? await recorder.getPoints(runId) : [];
      const points = live.length > 0 ? live : await db.getPoints(runId);
      const now = new Date(recoveredAt ?? Date.now()).toISOString();
      const movingSec = Math.round(snapshot.movingMs / 1000);
      const distanceM = Math.round(snapshot.distanceM);
      const run: LocalRun = {
        id: runId,
        startedAt: new Date(startedAt).toISOString(),
        endedAt: now,
        movingSec,
        distanceM,
        avgPaceSecKm: distanceM > 0 ? Math.round((movingSec / distanceM) * 1000) : 0,
        calories: null, // TODO
        source: deps.source,
        kind: get().kind,
        updatedAt: now,
        deletedAt: null,
        laps: snapshot.laps,
        route: simplifyRoute(points),
        rawPointsPath: null,
        syncStatus: 'pending',
        summarySynced: false,
        syncAttempts: 0,
        nextSyncAt: null,
        lastSyncError: null,
      };
      await db.saveRun(run, points);
      await db.clearCheckpoint({ keepPoints: true });
      set({ savedRunId: runId });
      void syncQueue.flush();
    };

    return {
      ...initialRunState,
      snapshot: emptySnapshot,
      startedAt: null,
      savedRunId: null,
      recoveredAt: null,
      kind: 'solo',
      error: null,

      async prepare() {
        if (get().phase !== 'idle') return;
        set({ error: null });
        if (!(await recorder.requestPermission())) return set({ error: '정확한 위치 권한이 필요해요.' });
        if (get().phase !== 'idle') return;
        send({ type: 'PREPARE', runId: uuidv7() });
        set({ snapshot: emptySnapshot, startedAt: null, savedRunId: null, recoveredAt: null });
        checkpointedAt = 0;
        checkpointedPoints = 0;
        listen();
        try {
          await recorder.prepare();
        } catch (error) {
          stopListening();
          send({ type: 'CANCEL' });
          set({ error: error instanceof Error ? error.message : 'GPS를 켜지 못했어요.' });
        }
      },
      beginCountdown() { send({ type: 'COUNTDOWN' }); },
      cancelCountdown() { send({ type: 'BACK' }); },
      async start(kind = 'solo') {
        const { phase, runId } = get();
        if (phase !== 'countdown' || !runId) return;
        send({ type: 'START' });
        set({ kind, startedAt: Date.now(), snapshot: { ...emptySnapshot, runId, status: 'recording' } });
        try {
          await recorder.start({ runId, autoPause: false });
        } catch (error) {
          await recorder.stop().catch(() => undefined);
          stopListening();
          set({ ...initialRunState, snapshot: emptySnapshot, startedAt: null, error: error instanceof Error ? error.message : 'GPS 기록을 시작하지 못했어요.' });
        }
      },
      async cancel() {
        const { phase } = get();
        if (phase !== 'acquiring' && phase !== 'ready' && phase !== 'countdown') return;
        send({ type: 'CANCEL' });
        stopListening();
        set({ snapshot: emptySnapshot });
        await recorder.stop();
      },
      async pause() {
        if (get().phase !== 'recording') return;
        await recorder.pause();
        send({ type: 'PAUSE', reason: 'manual' });
        void checkpoint(true);
      },
      async resume() {
        if (get().phase !== 'paused') return;
        await recorder.resume();
        send({ type: 'RESUME' });
      },
      async stop() {
        const { phase } = get();
        if (phase !== 'recording' && phase !== 'paused') return;
        const snapshot = await recorder.stop();
        stopListening();
        set({ snapshot });
        if (send({ type: 'STOP', distanceM: snapshot.distanceM }).phase === 'finished') await persist();
      },
      async keep() {
        if (send({ type: 'KEEP' }).phase === 'finished') await persist();
      },
      async discard() {
        send({ type: 'DISCARD' });
        set({ snapshot: emptySnapshot, startedAt: null, recoveredAt: null });
        await checkpointing;
        await db.clearCheckpoint().catch(() => undefined);
      },
      async checkRecovery() {
        if (get().phase !== 'idle') return;
        const saved = await db.loadCheckpoint().catch(() => null);
        if (!saved) return;
        if (get().phase !== 'idle') return;
        send({ type: 'FOUND_UNFINISHED', runId: saved.runId });
        set({ snapshot: saved.snapshot, startedAt: saved.startedAt, kind: saved.kind, recoveredAt: saved.updatedAt });
      },
      async saveRecovered() {
        if (get().phase !== 'recoverable') return;
        if (send({ type: 'STOP', distanceM: get().snapshot.distanceM }).phase === 'finished') await persist();
      },
      reset() {
        stopListening();
        send({ type: 'RESET' });
        set({ snapshot: emptySnapshot, startedAt: null, error: null });
      },
    };
  });
}

const source: RunSummary['source'] = Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : 'web';
export const runStore = createRunStore({ ...services, source });

export function useRunStore<T>(selector: (state: RunStoreState) => T): T {
  return useStore(runStore, selector);
}
