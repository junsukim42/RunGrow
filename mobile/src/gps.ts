import { requireOptionalNativeModule } from 'expo';
import type { GpsPoint } from './core/contracts/recorder';
import { PermissionsAndroid, Platform } from 'react-native';

export type GpsSnapshot = {
  status: 'idle' | 'recording' | 'paused' | 'stopped' | 'interrupted';
  movingMs: number;
  distanceMeters: number;
  sampleCount: number;
  acceptedCount: number;
  accuracyMeters?: number;
  firstFixMs?: number;
  message?: string;
};

export type GpsCommand = 'start' | 'pause' | 'resume' | 'stop';

type GpsModule = Record<GpsCommand, () => Promise<void>> & {
  requestPermission?: () => Promise<boolean>;
  getSnapshot: () => Promise<GpsSnapshot>;
  getPoints: () => Promise<GpsPoint[]>;
};

export const gps = Platform.OS === 'ios' || Platform.OS === 'android'
  ? requireOptionalNativeModule<GpsModule>('RunGrowGps')
  : null;

export async function requestGpsPermission(): Promise<boolean> {
  if (Platform.OS === 'ios') return (await gps?.requestPermission?.()) ?? false;
  if (Platform.OS !== 'android') return false;

  const { ACCESS_FINE_LOCATION, ACCESS_COARSE_LOCATION, POST_NOTIFICATIONS } = PermissionsAndroid.PERMISSIONS;
  if (await PermissionsAndroid.check(ACCESS_FINE_LOCATION)) return true;

  const permissions = Number(Platform.Version) >= 33
    ? [ACCESS_FINE_LOCATION, ACCESS_COARSE_LOCATION, POST_NOTIFICATIONS]
    : [ACCESS_FINE_LOCATION, ACCESS_COARSE_LOCATION];
  const results = await PermissionsAndroid.requestMultiple(permissions);
  return results[ACCESS_FINE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED;
}
