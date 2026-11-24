import React, { useCallback } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Button, Card, Row, Stack, T } from '../ui';
import { colors } from '../theme';
import { formatDuration, formatKm } from '../core/run/geo';
import { runStore, useRunStore } from '../stores/runStore';

// 앱이 기록 중에 강제 종료됐다면 마지막으로 저장된 기록을 저장할지 버릴지 묻는다.
export function RecoveryCard() {
  useFocusEffect(useCallback(() => { void runStore.getState().checkRecovery(); }, []));
  const phase = useRunStore(state => state.phase);
  const snapshot = useRunStore(state => state.snapshot);
  const recoveredAt = useRunStore(state => state.recoveredAt);
  if (phase !== 'recoverable') return null;

  const save = async () => {
    await runStore.getState().saveRecovered();
    const next = runStore.getState().phase;
    if (next === 'finished') router.push('/result');
    else if (next === 'confirmDiscard') router.push('/active');
  };
  const when = recoveredAt ? new Date(recoveredAt) : null;
  return <Card tone="dark" style={{ padding: 18, gap: 12 }}>
    <Stack gap={4}>
      <T size={11} weight="bold" color={colors.pink}>● 끝나지 않은 기록이 있어요</T>
      <T size={18} weight="bold" color="white">{formatKm(snapshot.distanceM)}km · {formatDuration(snapshot.movingMs)}</T>
      <T size={12} color="#BCC6E1">{when ? `${when.getMonth() + 1}월 ${when.getDate()}일 ${String(when.getHours()).padStart(2, '0')}:${String(when.getMinutes()).padStart(2, '0')}까지 기록됐어요. ` : ''}앱이 달리는 중에 꺼져서 이어 달릴 수는 없어요.</T>
    </Stack>
    <Row style={{ gap: 12 }}>
      <Button testID="recovery-discard" tone="soft" onPress={() => void runStore.getState().discard()} style={{ flex: 1 }}>버리기</Button>
      <Button testID="recovery-save" tone="white" onPress={() => void save()} style={{ flex: 1 }}>저장하기</Button>
    </Row>
  </Card>;
}
