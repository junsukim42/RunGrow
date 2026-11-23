import type { RouteCoordinates } from '../contracts/backend';
import type { GpsPoint } from '../contracts/recorder';

const EARTH_RADIUS_M = 6371008.8;
const toRad = (deg: number) => (deg * Math.PI) / 180;

export function haversineM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Douglas-Peucker, 허용 오차 3m
export function simplifyRoute(points: GpsPoint[], toleranceM = 3): RouteCoordinates {
  const accepted = points.filter(point => point.accepted);
  if (accepted.length <= 2) return accepted.map(point => [point.lng, point.lat]);

  const lat0 = toRad(accepted[0].lat);
  const xy = accepted.map(point => ({
    x: toRad(point.lng) * Math.cos(lat0) * EARTH_RADIUS_M,
    y: toRad(point.lat) * EARTH_RADIUS_M,
  }));
  const keep = new Uint8Array(accepted.length);
  keep[0] = keep[accepted.length - 1] = 1;

  const stack: [number, number][] = [[0, accepted.length - 1]];
  while (stack.length) {
    const [start, end] = stack.pop()!;
    let maxDistance = 0;
    let index = -1;
    for (let i = start + 1; i < end; i++) {
      const distance = segmentDistance(xy[i], xy[start], xy[end]);
      if (distance > maxDistance) { maxDistance = distance; index = i; }
    }
    if (index !== -1 && maxDistance > toleranceM) {
      keep[index] = 1;
      stack.push([start, index], [index, end]);
    }
  }
  return accepted.filter((_, i) => keep[i]).map(point => [point.lng, point.lat]);
}

type XY = { x: number; y: number };
function segmentDistance(p: XY, a: XY, b: XY): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

// 340 -> 5′40″
export function formatPace(secPerKm: number | null): string {
  if (secPerKm === null || !Number.isFinite(secPerKm) || secPerKm <= 0) return '--';
  const rounded = Math.round(secPerKm);
  return `${Math.floor(rounded / 60)}′${(rounded % 60).toString().padStart(2, '0')}″`;
}

// 65000 -> 01:05
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mmss = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return h > 0 ? `${h}:${mmss}` : mmss;
}

export function formatKm(distanceM: number): string {
  return (Math.floor(distanceM / 10) / 100).toFixed(2);
}
