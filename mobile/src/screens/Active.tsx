import React, { useEffect, useState } from 'react';
import { Share } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { Button, Card, Header, Legend, Metrics, Row, Screen, Stack, T } from '../ui';
import { LiveTrack } from '../components/LiveTrack';
import { colors } from '../theme';
import { useCourse, useDemo } from '../state';
import { runStore, useRunStore } from '../stores/runStore';
import { services } from '../core/services';
import { formatDuration, formatKm, formatPace } from '../core/run/geo';
import { useMyRecords } from '../hooks/useMyRecords';
import { COACHING_PACE_SEC_KM } from '../core/run/session';

const TRACK_GOAL_M = 5000; // 트랙 한 바퀴 = 목표 5km (기록 속의 나도 5km 기록 기준)
const gpsLabel = services.recorder.isReal ? '실제 GPS' : '가상 GPS';

export function ActiveScreen() {
  const { distance, mode, preferences, toggle } = useDemo();
  const course = useCourse();
  const phase = useRunStore(state => state.phase);
  const snapshot = useRunStore(state => state.snapshot);
  const error = useRunStore(state => state.error);
  const { ghost } = useMyRecords();
  const [countdown, setCountdown] = useState(() => (runStore.getState().phase === 'countdown' ? 3 : 0));

  const [startMode] = useState(mode);
  useEffect(() => {
    if (countdown <= 0) {
      if (runStore.getState().phase === 'countdown') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined); // 출발 신호
        void runStore.getState().start(startMode);
      }
      return;
    }
    const timer = setTimeout(() => setCountdown(value => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, startMode]);
  useEffect(() => {
    const initial = runStore.getState().phase;
    if (initial === 'idle' || initial === 'acquiring' || initial === 'ready') router.replace('/run');
  }, []);

  const cancelCountdown = () => { runStore.getState().cancelCountdown(); router.back(); };
  const stop = async () => {
    await runStore.getState().stop();
    if (runStore.getState().phase === 'finished') router.replace('/result');
  };
  const keep = async () => { await runStore.getState().keep(); router.replace('/result'); };
  const discard = async () => { await runStore.getState().discard(); router.back(); };

  if (countdown > 0) return <Screen dark testID="screen-countdown"><StatusBar style="light" /><Stack gap={24} style={{ minHeight: 540, alignItems: 'center', justifyContent: 'center' }}><T size={16} color="white">RunGrow와 함께 출발해요</T><T size={120} weight="black" color="white">{countdown}</T><T size={12} color="#BCC6E1">GPS 준비 완료 · {gpsLabel}로 기록해요.</T><Button tone="white" onPress={cancelCountdown}>취소</Button></Stack></Screen>;

  if (error && phase === 'idle') return <Screen dark testID="screen-run-error"><StatusBar style="light" /><Stack gap={20} style={{ minHeight: 540, justifyContent: 'center' }}><T size={22} weight="bold" color="white">러닝을 시작하지 못했어요</T><T size={13} color="#BCC6E1">{error}</T><Button tone="white" onPress={() => router.back()}>돌아가기</Button></Stack></Screen>;

  if (phase === 'idle' || phase === 'acquiring' || phase === 'ready') return <Screen dark testID="screen-redirect"><StatusBar style="light" /></Screen>;

  if (phase === 'confirmDiscard') return <Screen dark testID="screen-confirm-discard"><StatusBar style="light" /><Stack gap={20} style={{ minHeight: 540, justifyContent: 'center' }}><T size={22} weight="bold" color="white">기록이 너무 짧아요</T><T size={13} color="#BCC6E1">{formatKm(snapshot.distanceM)}km · {formatDuration(snapshot.movingMs)}{`\n`}100m보다 짧은 기록이에요. 저장할까요?</T><Row style={{ gap: 12 }}><Button tone="soft" onPress={discard} style={{ flex: 1 }}>버리기</Button><Button tone="white" onPress={keep} style={{ flex: 1 }}>저장하기</Button></Row></Stack></Screen>;

  const paused = phase === 'paused';
  const ghostM = (snapshot.movingMs / 1000 / ghost.paceSecKm) * 1000;
  const ghostGapM = Math.round(snapshot.distanceM - ghostM);
  const title = mode === 'ghost' ? '기록 속의 나와 경쟁 중' : mode === 'friend' ? '친구와 함께 달리는 중' : mode === 'coaching' ? '오늘의 코칭 진행 중' : '나만의 리듬으로 달리는 중';
  const lastLap = snapshot.laps.at(-1);
  return <Screen dark testID="screen-active" footer={<><Row style={{ gap: 12 }}><Button testID="pause-run" tone="soft" onPress={() => void (paused ? runStore.getState().resume() : runStore.getState().pause())} style={{ flex: 1 }}>{paused ? '계속 달리기' : '일시정지'}</Button><Button testID="stop-run" tone="white" onPress={stop} style={{ flex: 1 }}>러닝 종료</Button></Row><T size={10} color="#BCC6E1" style={{ textAlign: 'center' }}>{services.recorder.isReal ? `실제 GPS로 기록 중이에요.${snapshot.accuracyM !== undefined ? ` (정확도 ±${Math.round(snapshot.accuracyM)}m)` : ''}` : '가상 GPS로 기록 중이에요. 실제 위치가 아니에요.'}</T></>}>
    <StatusBar style="light" /><Row><T size={11} weight="bold" color="white">● {paused ? (snapshot.pauseReason === 'auto' ? '자동 일시정지' : '잠시 쉬는 중') : title}</T><T size={10} color={colors.pink}>{gpsLabel}</T></Row><T size={11} color="#BCC6E1">목표 {distance}km · {course?.title ?? '코스 없음'}</T><T testID="run-timer" size={64} weight="black" color="white">{formatDuration(snapshot.movingMs)}</T>
    <Metrics light items={[[formatKm(snapshot.distanceM), '거리 km'], [formatPace(snapshot.currentPaceSecPerKm), '지금 페이스'], [formatPace(snapshot.avgPaceSecPerKm), '평균 페이스']]} /><LiveTrack meM={snapshot.distanceM} ghostM={ghostM} goalM={TRACK_GOAL_M} /><Legend />
    <Card tone="darkCard">{mode === 'ghost'
      ? <><T size={12} color="white">기록 속의 나({formatPace(ghost.paceSecKm)} 페이스{ghost.isExample ? ', 예시' : ''})보다</T><T testID="ghost-gap" size={23} weight="bold" color="white">{ghostGapM >= 0 ? `${ghostGapM}m 앞서고 있어요` : `${-ghostGapM}m 뒤처져 있어요`}</T></>
      : mode === 'friend'
        ? <><T size={12} color="white">친구와의 거리 차이</T><T size={18} weight="bold" color="white">친구 대결은 준비 중이에요</T></>
        : mode === 'coaching'
        ? <><T size={12} color="white">코칭 목표 페이스 {formatPace(COACHING_PACE_SEC_KM)}</T><T size={23} weight="bold" color="white">{snapshot.currentPaceSecPerKm === null ? '페이스를 재는 중이에요' : snapshot.currentPaceSecPerKm < COACHING_PACE_SEC_KM - 15 ? '조금 천천히 달려 보세요' : snapshot.currentPaceSecPerKm > COACHING_PACE_SEC_KM + 15 ? '조금만 속도를 올려 보세요' : '목표 페이스를 지키고 있어요'}</T></>
        : <><T size={12} color="white">지금 나의 페이스</T><T size={23} weight="bold" color="white">{formatPace(snapshot.currentPaceSecPerKm)}/km</T></>}</Card>
    {lastLap && <Card tone="darkCard"><T size={12} color="white">{lastLap.lapNo}km 구간</T><T size={23} weight="bold" color="white">{formatPace(lastLap.durationSec)}</T></Card>}
    <Stack gap={8}><T size={10} weight="bold" color={colors.pink}>COACH</T><T size={16} weight="medium" color="white">좋은 페이스예요. 어깨에 힘을 빼고{`\n`}지금 리듬을 유지해 보세요.</T></Stack><Button tone="white" onPress={() => toggle('voice')}>음성 코칭 {preferences.voice ? '켜짐' : '꺼짐'}</Button>
  </Screen>;
}

export function ResultScreen() {
  const { name, toast } = useDemo();
  const course = useCourse();
  const phase = useRunStore(state => state.phase);
  const snapshot = useRunStore(state => state.snapshot);
  const startedAt = useRunStore(state => state.startedAt);
  const savedRunId = useRunStore(state => state.savedRunId);
  const home = () => { runStore.getState().reset(); router.dismissAll(); router.replace('/'); };

  if (phase !== 'finished' || startedAt === null) return <Screen testID="screen-result-empty"><StatusBar style="dark" /><Header title="달리기 결과" onBack={() => router.replace('/')} /><T size={18} weight="bold">방금 끝낸 달리기가 없어요</T><T size={12} color={colors.muted}>지난 기록은 기록 탭에서 볼 수 있어요.</T><Button onPress={() => router.replace('/records')}>기록 보기</Button></Screen>;

  const date = new Date(startedAt);
  const km = formatKm(snapshot.distanceM);
  const time = formatDuration(snapshot.movingMs);
  const share = async () => { try { await Share.share({ message: `RunGrow로 ${km}km 달렸어요! ${time}, 평균 페이스 ${formatPace(snapshot.avgPaceSecPerKm)} 🏃` }); } catch { toast('이 기기에서는 공유를 열 수 없어요.'); } };
  return <Screen testID="screen-result" footer={<Row style={{ gap: 12 }}><Button tone="soft" onPress={share} style={{ flex: 1 }}>공유</Button><Button onPress={home} style={{ flex: 2 }}>홈으로</Button></Row>}><StatusBar style="dark" /><Header title="달리기 결과" onBack={home} /><T size={11} color={colors.muted}>{date.getMonth() + 1}월 {date.getDate()}일 · {course?.title ?? '코스 없음'}{services.recorder.isReal ? '' : ' · 가상 GPS 기록'}</T><T size={30} weight="bold">{km}km를{`\n`}달렸어요!</T>
    <Card tone="dark"><T size={11} color="white">달린 시간</T><T testID="result-time" size={56} weight="black" color="white">{time}</T><T size={12} color="white">{savedRunId ? '기록을 기기에 저장했어요.' : '기록을 저장하는 중이에요.'}</T></Card>
    <Card><Metrics items={[[km, '거리 km'], [formatPace(snapshot.avgPaceSecPerKm), '평균 페이스'], [String(snapshot.laps.length), '완주 구간(1km)']]} /></Card>
    {snapshot.laps.length > 0 && <Card><T size={14} weight="bold">구간 기록</T>{snapshot.laps.map(lap => <Row key={lap.lapNo}><T size={12} color={colors.muted}>{lap.lapNo}km</T><T size={13} weight="bold">{formatPace(lap.durationSec)}</T></Row>)}</Card>}
    <Card tone="soft"><T size={16} weight="bold">잘 달렸어요, {name}님</T><T size={12} color={colors.muted}>오늘은 수분을 충분히 마시고 쉬어 주세요.</T></Card>
  </Screen>;
}
