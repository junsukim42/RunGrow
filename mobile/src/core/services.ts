import { createMemoryDb } from './db/memoryDb';
import { createMockBackend } from './mocks/mockBackend';
import { createMockRecorder } from './mocks/mockRecorder';
import { createMockSocial } from './mocks/mockSocial';
import { createNativeRecorder } from './nativeRecorder';
import { createSyncQueue } from './sync/syncQueue';

const recorder = createNativeRecorder() ?? createMockRecorder();
const db = createMemoryDb();
const backend = createMockBackend();
const syncQueue = createSyncQueue(db, backend);
const social = createMockSocial();

export const services = { recorder, db, backend, syncQueue, social };
export type Services = typeof services;
