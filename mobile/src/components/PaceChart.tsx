import React from 'react';
import { View } from 'react-native';
import type { Lap } from '../core/contracts/recorder';
import { formatPace } from '../core/run/geo';
import { colors } from '../theme';
import { Row, Stack, T } from '../ui';

const BAR_MAX = 110;

export function PaceChart({ laps }: { laps: Lap[] }) {
  if (laps.length === 0) return <T size={12} color={colors.muted}>1km를 채운 구간이 없어요.</T>;
  const paces = laps.map(lap => (lap.durationSec / lap.distanceM) * 1000);
  const fastest = Math.min(...paces);
  const slowest = Math.max(...paces);
  const height = (pace: number) => BAR_MAX * (slowest === fastest ? 1 : 0.4 + (0.6 * (slowest - pace)) / (slowest - fastest));
  return <Row style={{ height: BAR_MAX + 44, alignItems: 'flex-end', gap: laps.length > 8 ? 4 : 10 }}>
    {laps.map((lap, i) => <Stack key={lap.lapNo} gap={6} style={{ flex: 1, alignItems: 'center' }}>
      <T size={laps.length > 8 ? 8 : 10} weight="bold" color={paces[i] === fastest ? colors.blue : colors.muted}>{formatPace(paces[i])}</T>
      <View accessibilityLabel={`${lap.lapNo}km 구간 ${formatPace(paces[i])}`} style={{ width: '72%', maxWidth: 36, height: height(paces[i]), backgroundColor: paces[i] === fastest ? colors.blue : colors.ink, borderRadius: 8 }} />
      <T size={10} color={colors.muted}>{lap.lapNo}km</T>
    </Stack>)}
  </Row>;
}
