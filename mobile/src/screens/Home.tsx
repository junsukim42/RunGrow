import React, { useState } from 'react';
import { Pressable } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, CourseMap, Icon, Legend, Metrics, Row, Screen, Section, Segments, Stack, T, Week } from '../ui';
import { colors } from '../theme';
import { useDemo } from '../state';
import { useMyRecords } from '../hooks/useMyRecords';
import { formatDuration } from '../core/run/geo';
import { RecoveryCard } from '../components/RecoveryCard';
import { LiveTrack } from '../components/LiveTrack';

const DISTANCES = [1, 5, 10] as const;
type Distance = (typeof DISTANCES)[number];
const bestKey = { 1: 'km1', 5: 'km5', 10: 'km10' } as const;

export function HomeScreen() {
  const { name } = useDemo();
  const { runs, bests } = useMyRecords();
  const { setDistance } = useDemo();
  const [km, setKm] = useState<Distance>(5);
  const best = bests[bestKey[km]];
  const latest = runs[0];
  const goalM = km * 1000;
  // 최근 러닝 vs 최고 기록: 같은 시간 동안 최고 기록 페이스로 갔다면 어디쯤인지
  const trackMe = latest ? Math.min(latest.distanceM, goalM) : 0;
  const trackGhost = latest && best ? Math.min((latest.movingSec / best.sec) * goalM, goalM) : 0;
  const bestDate = best ? new Date(best.startedAt) : null;
  const challenge = () => {
    if (km !== 1) setDistance(km);
    router.push('/run');
  };
  return <Screen testID="screen-home">
    <RecoveryCard />
    <Row><Stack gap={4} style={{ flex: 1 }}><T size={11} weight="medium" color={colors.muted}>11월 2일 월요일 · 맑음 14°</T><T size={25} weight="bold">좋은 아침이에요,{`\n`}{name}님</T></Stack><Pressable accessibilityLabel="알림 보기" accessibilityRole="button" onPress={() => router.push({ pathname: '/settings', params: { section: 'notifications' } })} style={{ width: 44, height: 44, backgroundColor: 'white', borderRadius: 22, alignItems: 'center', justifyContent: 'center' }}><Icon name="bell" size={20} /></Pressable></Row>
    <Card tone="dark" style={{ padding: 18 }}>
      <Segments options={DISTANCES.map(d => `${d}km`)} value={`${km}km`} onChange={value => setKm(parseInt(value) as Distance)} />
      <T size={12} weight="medium" color="white">{km}km 최고 기록</T>
      {best && bestDate ? <>
        <T size={58} weight="black" color="white">{formatDuration(best.sec * 1000)}</T>
        <T size={12} color="white">{bestDate.getMonth() + 1}월 {bestDate.getDate()}일에 세운 기록이에요. 다시 도전해 볼까요?</T>
        {latest && <><LiveTrack meM={trackMe} ghostM={trackGhost} goalM={goalM} /><Legend onHistory={() => router.push('/records')} /></>}
        <Button tone="white" onPress={challenge}>내 기록에 도전하기</Button>
      </> : <>
        <T size={22} weight="bold" color="white">아직 데이터가 없어요</T>
        <T size={12} color="white">{km}km를 완주하면 최고 기록이 여기에 표시돼요.</T>
        <Button tone="white" onPress={challenge}>달리러 가기</Button>
      </>}
    </Card>
    <Section title="오늘의 코칭" action="자세히 보기" onPress={() => router.push('/coaching')} />
    <Card onPress={() => router.push('/coaching')} label="오늘의 6km 코칭 자세히 보기"><Row><T size={10} weight="bold" color={colors.blue}>10km 완주 플랜</T><T size={10} color={colors.muted}>4주 차</T></Row><T size={23} weight="bold">오늘은 가볍게{`\n`}6km만 뛰어요</T><T size={12} color={colors.muted}>어제 인터벌로 다리가 무거울 수 있어요.{`\n`}심박 145 아래, 6:20 페이스로 달려 보세요.</T><Week /></Card>
    <Section title={`${name}님께 맞는 코스`} action="전체 보기" onPress={() => router.push('/courses')} />
    <Card onPress={() => router.push('/courses')} label="반포 한강공원 왕복 코스 상세"><T size={15} weight="bold">반포 한강공원 왕복</T><CourseMap /><Metrics items={[['6.0', '거리 km'], ['38', '예상 시간 분']]} /></Card>
    <T size={10} color={colors.muted} style={{ textAlign: 'center' }}>화면 속 기록·날씨·추천은 시연용 데이터예요.</T>
  </Screen>;
}
