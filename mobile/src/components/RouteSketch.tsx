// TODO: 네이버 지도 (키 발급 후)
import React, { useMemo, useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';
import type { RouteCoordinates } from '../core/contracts/backend';
import { colors } from '../theme';
import { T } from '../ui';

const HEIGHT = 200;
const PADDING = 20;

export function RouteSketch({ route }: { route: RouteCoordinates }) {
  const [width, setWidth] = useState(0);
  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

  const points = useMemo(() => {
    if (route.length < 2 || width === 0) return null;
    const lat0 = (route[0][1] * Math.PI) / 180;
    const xy = route.map(([lng, lat]) => [lng * Math.cos(lat0), -lat] as const);
    const xs = xy.map(p => p[0]);
    const ys = xy.map(p => p[1]);
    const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const scale = Math.min((width - PADDING * 2) / (maxX - minX || 1e-9), (HEIGHT - PADDING * 2) / (maxY - minY || 1e-9));
    const offsetX = (width - (maxX - minX) * scale) / 2;
    const offsetY = (HEIGHT - (maxY - minY) * scale) / 2;
    return xy.map(([x, y]) => [offsetX + (x - minX) * scale, offsetY + (y - minY) * scale] as const);
  }, [route, width]);

  return <View onLayout={onLayout} accessibilityLabel="달린 경로 그림" style={{ height: HEIGHT, borderRadius: 18, backgroundColor: colors.soft, overflow: 'hidden', justifyContent: 'center' }}>
    {points ? <Svg width={width} height={HEIGHT}>
      <Polyline points={points.map(([x, y]) => `${x},${y}`).join(' ')} fill="none" stroke={colors.blue} strokeWidth={4} strokeLinejoin="round" strokeLinecap="round" />
      <Circle cx={points[0][0]} cy={points[0][1]} r={6} fill={colors.green} stroke="white" strokeWidth={2} />
      <Circle cx={points.at(-1)![0]} cy={points.at(-1)![1]} r={6} fill={colors.pink} stroke="white" strokeWidth={2} />
    </Svg> : <T size={12} color={colors.muted} style={{ textAlign: 'center' }}>{route.length < 2 ? '경로를 그릴 위치 기록이 없어요.' : ' '}</T>}
  </View>;
}
