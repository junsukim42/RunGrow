// idle -> acquiring -> ready -> countdown -> recording <-> paused -> finished / confirmDiscard
// idle -> recoverable -> finished / confirmDiscard / idle (강제 종료된 기록을 저장하거나 버림)
import type { PauseReason } from '../contracts/recorder';

export type RunKind = 'ghost' | 'friend' | 'solo' | 'coaching';
export const runKindLabel: Record<RunKind, string> = { ghost: '고스트', friend: '대결', solo: '자유', coaching: '코칭' };

export const COACHING_PACE_SEC_KM = 380; // 6:20/km

export type RunPhase =
  | 'idle'
  | 'recoverable'
  | 'acquiring'
  | 'ready'
  | 'countdown'
  | 'recording'
  | 'paused'
  | 'confirmDiscard'
  | 'finished';

export type RunState = {
  phase: RunPhase;
  runId: string | null;
  pauseReason?: PauseReason;
};

export type RunEvent =
  | { type: 'PREPARE'; runId: string }
  | { type: 'FIX' }
  | { type: 'COUNTDOWN' }
  | { type: 'BACK' }
  | { type: 'START' }
  | { type: 'CANCEL' }
  | { type: 'PAUSE'; reason: PauseReason }
  | { type: 'RESUME' }
  | { type: 'STOP'; distanceM: number }
  | { type: 'KEEP' }
  | { type: 'DISCARD' }
  | { type: 'FOUND_UNFINISHED'; runId: string }
  | { type: 'RESET' };

export const MIN_SAVE_DISTANCE_M = 100;

export const initialRunState: RunState = { phase: 'idle', runId: null };

export function transition(state: RunState, event: RunEvent): RunState {
  const to = (phase: RunPhase): RunState => ({ phase, runId: state.runId });
  switch (state.phase) {
    case 'idle':
      if (event.type === 'PREPARE') return { phase: 'acquiring', runId: event.runId };
      if (event.type === 'FOUND_UNFINISHED') return { phase: 'recoverable', runId: event.runId };
      return state;
    case 'recoverable':
      if (event.type === 'STOP') return stopTo(state, event.distanceM);
      if (event.type === 'DISCARD') return initialRunState;
      return state;
    case 'acquiring':
      if (event.type === 'FIX') return to('ready');
      if (event.type === 'CANCEL') return initialRunState;
      return state;
    case 'ready':
      if (event.type === 'COUNTDOWN') return to('countdown');
      if (event.type === 'CANCEL') return initialRunState;
      return state;
    case 'countdown':
      if (event.type === 'START') return to('recording');
      if (event.type === 'BACK') return to('ready');
      if (event.type === 'CANCEL') return initialRunState;
      return state;
    case 'recording':
      if (event.type === 'PAUSE') return { phase: 'paused', runId: state.runId, pauseReason: event.reason };
      if (event.type === 'STOP') return stopTo(state, event.distanceM);
      return state;
    case 'paused':
      if (event.type === 'RESUME') return to('recording');
      if (event.type === 'STOP') return stopTo(state, event.distanceM);
      return state;
    case 'confirmDiscard':
      if (event.type === 'KEEP') return to('finished');
      if (event.type === 'DISCARD') return initialRunState;
      return state;
    case 'finished':
      if (event.type === 'RESET') return initialRunState;
      return state;
  }
}

function stopTo(state: RunState, distanceM: number): RunState {
  return { phase: distanceM < MIN_SAVE_DISTANCE_M ? 'confirmDiscard' : 'finished', runId: state.runId };
}
