import type { BackendClient, UpsertRunInput } from '../contracts/backend';

export type MockBackend = BackendClient & {
  readonly runs: Map<string, UpsertRunInput>;
  offline: boolean;
};

export function createMockBackend(): MockBackend {
  const runs = new Map<string, UpsertRunInput>();
  const backend: MockBackend = {
    runs,
    offline: false,
    async upsertRun(input) {
      if (backend.offline) throw new Error('offline');
      const existing = runs.get(input.run.id);
      if (!existing || existing.run.updatedAt <= input.run.updatedAt) runs.set(input.run.id, input);
    },
    async uploadRawPoints(runId) {
      if (backend.offline) throw new Error('offline');
      return `mock-user/${runId}.json.gz`;
    },
  };
  return backend;
}
