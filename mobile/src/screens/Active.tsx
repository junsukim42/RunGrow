import React, { useEffect, useState } from 'react';
import { Share } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Button, Card, Header, Legend, Metrics, Row, Screen, Stack, T, Track } from '../ui';
import { colors } from '../theme';
import { useCourse, useDemo } from '../state';

const format = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
export function ActiveScreen() {
  const { distance, mode, preferences, toggle } = useDemo();
  const course = useCourse();
  const [countdown, setCountdown] = useState(3);
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => { if (countdown <= 0) return; const timer = setTimeout(() => setCountdown(value => value - 1), 1000); return () => clearTimeout(timer); }, [countdown]);
  useEffect(() => { if (countdown > 0 || paused) return; const timer = setInterval(() => setElapsed(value => value + 1), 1000); return () => clearInterval(timer); }, [countdown, paused]);
  const title = mode === 'ghost' ? '기록 속의 나와 경쟁 중' : mode === 'friend' ? '서윤님과 나란히 달리는 중' : '나만의 리듬으로 달리는 중';
  if (countdown > 0) return <Screen dark testID="screen-countdown"><StatusBar style="light" /><Stack gap={24} style={{ minHeight: 540, alignItems: 'center', justifyContent: 'center' }}><T size={16} color="white">나란히 출발해요</T><T size={120} weight="black" color="white">{countdown}</T><T size={12} color="#BCC6E1">시연용 러닝이 곧 시작돼요.</T><Button tone="white" onPress={() => router.back()}>취소</Button></Stack></Screen>;
  return <Screen dark testID="screen-active" footer={<><Row style={{ gap: 12 }}><Button tone="soft" onPress={() => setPaused(value => !value)} style={{ flex: 1 }}>{paused ? '계속 달리기' : '일시정지'}</Button><Button tone="white" onPress={() => router.replace('/result')} style={{ flex: 1 }}>러닝 종료</Button></Row><T size={10} color="#BCC6E1" style={{ textAlign: 'center' }}>실제 GPS·심박 측정 없이 동작하는 데모예요.</T></>}>
    <StatusBar style="light" /><Row><T size={11} weight="bold" color="white">● {paused ? '잠시 쉬는 중' : title}</T><T size={10} color={colors.pink}>데모 러닝</T></Row><T size={11} color="#BCC6E1">목표 {distance}km · {course.title}</T><T testID="run-timer" size={64} weight="black" color="white">{format(1122 + elapsed)}</T>
    <Metrics light items={[[Math.min(distance, 3.38 + elapsed / 332).toFixed(2), '거리 km'], ['5′32″', '지금 페이스'], ['142', '심박 예시 bpm']]} /><Track /><Legend />
    <Card tone="darkCard"><T size={12} color="white">{mode === 'solo' ? '지금 나의 페이스' : mode === 'friend' ? '서윤님과의 거리 차이' : '기록 속의 나보다'}</T><T size={23} weight="bold" color="white">{mode === 'solo' ? '편안한 리듬이에요' : '12m 앞서고 있어요'}</T></Card>
    <Stack gap={8}><T size={10} weight="bold" color={colors.pink}>COACH</T><T size={16} weight="medium" color="white">좋은 페이스예요. 어깨에 힘을 빼고{`\n`}지금 리듬을 유지해 보세요.</T></Stack><Button tone="white" onPress={() => toggle('voice')}>음성 코칭 {preferences.voice ? '켜짐' : '꺼짐'}</Button>
  </Screen>;
}

export function ResultScreen() {
  const { save, saved, name, toast } = useDemo();
  const course = useCourse();
  const share = async () => { try { await Share.share({ message: `나란히와 5km 완주! 27:20, 어제의 나보다 22초 빨라졌어요. 🏃 (데모 기록)` }); } catch { toast('이 기기에서는 공유를 열 수 없어요.'); } };
  return <Screen testID="screen-result" footer={<Row style={{ gap: 12 }}><Button tone="soft" onPress={share} style={{ flex: 1 }}>공유</Button><Button onPress={() => { save(); router.dismissAll(); router.replace('/'); }} style={{ flex: 2 }}>{saved ? '홈으로 돌아가기' : '저장하고 홈으로'}</Button></Row>}><StatusBar style="dark" /><Header title="달리기 결과" onBack={() => router.replace('/')} /><T size={11} color={colors.muted}>11월 2일 · {course.title} · 데모 결과</T><T size={9} weight="bold" color={colors.blue} style={{ alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: colors.soft }}>NEW PERSONAL BEST</T><T size={30} weight="bold">어제의 나를{`\n`}앞질렀어요!</T>
    <Card tone="dark"><T size={11} color="white">5km 완주 기록</T><T size={56} weight="black" color="white">27:20</T><T size={12} color="white">이전 최고 기록보다 22초 빨라요.</T><Track /><Row><T size={12} weight="bold" color="white">나 27:20</T><T size={11} color="white">기록 속의 나 27:42</T></Row></Card>
    <Card><Metrics items={ [['5.00', '거리 km'], ['5′28″', '평균 페이스'], ['148', '평균 심박']] } /></Card><Card tone="soft"><T size={16} weight="bold">잘 달렸어요, {name}님</T><T size={12} color={colors.muted}>후반에도 일정한 페이스를 지켰어요.{`\n`}오늘은 수분을 충분히 마시고 쉬어 주세요.</T></Card><T size={10} color={colors.muted}>UI 확인을 위한 완주 결과 예시예요. 실제 운동 기록이 아니에요.</T>
  </Screen>;
}
