import React, { useState } from 'react';
import { router } from 'expo-router';
import { Button, Card, Header, Runner, Screen, Section, Segments, T } from '../ui';
import { leaderboard } from '../data';
import { colors } from '../theme';
import { useDemo } from '../state';

export function RankingScreen() {
  const [scope, setScope] = useState('전체');
  const [distance, setDistance] = useState('5km 기록');
  const { name, saved } = useDemo();
  const rows = scope === '친구' ? leaderboard.filter(item => ['1,283', '1,284', '1,285'].includes(item.rank)) : scope === '성동구' ? leaderboard.filter(item => item.me || item.name === '오세린') : leaderboard;
  return <Screen testID="screen-ranking"><Header title="순위" back={false} /><Segments options={['전체', '친구', '성동구']} value={scope} onChange={setScope} /><Segments options={['5km 기록', '이번 달 거리']} value={distance} onChange={setDistance} />
    <Card tone="dark"><T size={11} color="white">{distance} · {scope === '전체' ? '전체 10,620명' : scope === '친구' ? '친구 3명' : '서울 성동구 328명'}</T><T size={44} weight="black" color="white">{scope === '전체' ? '1,284' : scope === '친구' ? '2' : '32'}위</T><T size={11} color="white">상위 12% · 지난주보다 46계단 올랐어요.</T><Button tone="white" onPress={() => router.push('/run')}>순위 올리러 달리기</Button></Card>
    <Section title={distance === '5km 기록' ? '5km 리더보드' : '월간 거리 리더보드'} />
    <Card>{rows.map((item, index) => <React.Fragment key={item.rank}>{scope === '전체' && index === 3 && <T color={colors.muted}>···</T>}<Runner rank={scope === '전체' ? item.rank : String(index + 1)} name={item.me ? name : item.name} subtitle={item.me ? '내 기록' : item.location} value={distance === '5km 기록' ? item.me && saved ? '27:20' : item.record : `${[128.4, 112.6, 96.2, 84.1, 82.6, 80.2][leaderboard.indexOf(item)]}km`} me={item.me} onPress={item.me ? undefined : () => router.push('/duel')} /></React.Fragment>)}</Card>
    <Button tone="soft" onPress={() => router.push('/duel')}>친구와 1:1 대결 보기</Button>
  </Screen>;
}
