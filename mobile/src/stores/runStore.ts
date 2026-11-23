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
  continueRecovered(): void;
  reset(): void;
};

type Deps = Pick<Services, 'recorder' | 'db' | 'syncQueue'> & { source: RunSummary['source'] };

export function createRunStore(deps: Deps): StoreApi<RunStoreState> {
  const { recorder, db, syncQueue } = deps;
  let unsubscribe: (() => void) | null = null;

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
        }
      });
    };

    const stopListening = () => { unsubscribe?.(); unsubscribe = null; };

    const persist = async () => {
      const { runId, snapshot, startedAt } = get();
      if (!runId || startedAt === null) return;
      const points = await recorder.getPoints(runId);
      const now = new Date().toISOString();
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
      set({ savedRunId: runId });
      void syncQueue.flush();
    };

    return {
      ...initialRunState,
      snapshot: emptySnapshot,
      startedAt: null,
      savedRunId: null,
      kind: 'solo',
      error: null,

      async prepare() {
        if (get().phase !== 'idle') return;
        set({ error: null });
        if (!(await recorder.requestPermission())) return set({ error: '정확한 위치 권한이 필요해요.' });
        if (get().phase !== 'idle') return;
        send({ type: 'PREPARE', runId: uuidv7() });
        set({ snapshot: emptySnapshot, startedAt: null, savedRunId: null });
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
        if (get().phase === 'recoverable') await recorder.stop();
        send({ type: 'DISCARD' });
        set({ snapshot: emptySnapshot, startedAt: null });
      },
      async checkRecovery() {
        if (get().phase !== 'idle') return;
        const session = await recorder.getUnfinishedSession();
        if (!session) return;
        send({ type: 'FOUND_UNFINISHED', runId: session.runId });
        set({ snapshot: session.snapshot, startedAt: session.startedAt });
      },
      continueRecovered() {
        if (get().phase !== 'recoverable') return;
        listen();
        send({ type: 'CONTINUE' });
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
