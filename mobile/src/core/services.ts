import { Platform } from 'react-native';
import { createMemoryDb } from './db/memoryDb';
import { createSqliteDb } from './db/sqliteDb';
import { createMockBackend } from './mocks/mockBackend';
import { createMockRecorder } from './mocks/mockRecorder';
import { createMockSocial } from './mocks/mockSocial';
import { createNativeRecorder } from './nativeRecorder';
import { createSyncQueue } from './sync/syncQueue';

const recorder = createNativeRecorder() ?? createMockRecorder();
// 웹의 SQLite는 아직 알파라서 메모리 저장소를 쓴다.
const db = Platform.OS === 'web' ? createMemoryDb() : createSqliteDb();
const backend = createMockBackend();
const syncQueue = createSyncQueue(db, backend);
const social = createMockSocial();

export const services = { recorder, db, backend, syncQueue, social };
export type Services = typeof services;
