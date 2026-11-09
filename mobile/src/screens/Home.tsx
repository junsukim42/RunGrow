import React, { useState } from 'react';
import { Pressable } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, CourseMap, Icon, Legend, Metrics, Row, Runner, Screen, Section, Segments, Stack, T, Track, Week } from '../ui';
import { colors } from '../theme';
import { useDemo } from '../state';

export function HomeScreen() {
  const { name, saved } = useDemo();
  const [competition, setCompetition] = useState('내 기록');
  const isFriend = competition === '친구와 1:1';
  const isRank = competition === '전체 순위';
  return <Screen testID="screen-home">
    <Row><Stack gap={4} style={{ flex: 1 }}><T size={11} weight="medium" color={colors.muted}>11월 2일 월요일 · 맑음 14°</T><T size={25} weight="bold">좋은 아침이에요,{`\n`}{name}님</T></Stack><Pressable accessibilityLabel="알림 보기" accessibilityRole="button" onPress={() => router.push({ pathname: '/settings', params: { section: 'notifications' } })} style={{ width: 44, height: 44, backgroundColor: 'white', borderRadius: 22, alignItems: 'center', justifyContent: 'center' }}><Icon name="bell" size={20} /></Pressable></Row>
    <Card tone="dark" style={{ padding: 18 }}>
      <Segments options={['내 기록', '친구와 1:1', '전체 순위']} value={competition} onChange={setCompetition} />
      <T size={12} weight="medium" color="white">{isFriend ? '이번 주 서윤님과 거리 대결' : isRank ? '5km 전체 순위' : '5km 최고 기록'}</T>
      <T size={isRank ? 48 : 58} weight="black" color="white">{isFriend ? '1.2km 앞' : isRank ? '1,284위' : saved ? '27:20' : '27:42'}</T>
      <T size={12} color="white">{isFriend ? '멀리 있어도 같은 목표를 향해 달려요.' : isRank ? '상위 12% · 지난주보다 46계단 올랐어요.' : saved ? '어제의 나보다 22초 빨라졌어요.' : '지난주 달리기는 22초 모자랐어요.'}</T>
      <Track /><Legend onHistory={() => router.push('/records')} />
      <Button tone="white" onPress={() => router.push(isFriend ? '/duel' : isRank ? '/ranking' : '/run')}>{isFriend ? '서윤님과 대결 보기' : isRank ? '전체 순위 보기' : '내 기록에 도전하기'}</Button>
    </Card>
    <Section title="오늘의 코칭" action="자세히 보기" onPress={() => router.push('/coaching')} />
    <Card onPress={() => router.push('/coaching')} label="오늘의 6km 코칭 자세히 보기"><Row><T size={10} weight="bold" color={colors.blue}>10km 완주 플랜</T><T size={10} color={colors.muted}>4주 차</T></Row><T size={23} weight="bold">오늘은 가볍게{`\n`}6km만 뛰어요</T><T size={12} color={colors.muted}>어제 인터벌로 다리가 무거울 수 있어요.{`\n`}심박 145 아래, 6:20 페이스로 달려 보세요.</T><Week /></Card>
    <Section title={`${name}님께 맞는 코스`} action="전체 보기" onPress={() => router.push('/courses')} />
    <T size={11} color={colors.muted}>설문에서 고른 평지 · 아침 · 5~7km 기준이에요.</T>
    <Card onPress={() => router.push('/courses')} label="반포 한강공원 왕복 코스 상세"><T size={15} weight="bold">반포 한강공원 왕복</T><CourseMap /><Metrics items={ [['6.0', '거리 km'], ['+8', '오르막 m'], ['38', '예상 시간 분']] } /></Card>
    <Section title="5km 전체 순위" action="더 보기" onPress={() => router.push('/ranking')} />
    <Card><Runner rank="1" name="박도윤" subtitle="서울 송파구" value="19:48" onPress={() => router.push('/duel')} /><Runner rank="1,284" name={name} subtitle="내 기록" value={saved ? '27:20' : '27:42'} me /></Card>
    <Button onPress={() => router.push('/duel')}>친구와 나란히 달리기</Button>
    <T size={10} color={colors.muted} style={{ textAlign: 'center' }}>화면 속 기록·날씨·추천은 시연용 데이터예요.</T>
  </Screen>;
}
