import React, { useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Card, CourseMap, Header, Metrics, Row, Runner, Screen, Section, Stack, T, Track } from '../ui';
import { colors } from '../theme';
import { courses } from '../data';
import { useCourse, useDemo } from '../state';

export function CoachingScreen() {
  const { setDistance, setMode } = useDemo();
  const start = () => { setDistance(6); setMode('solo'); router.push('/run'); };
  return <Screen testID="screen-coaching" footer={<Button onPress={start}>이 운동으로 달리기</Button>}><Header title="오늘의 코칭" /><T size={11} weight="medium" color={colors.blue}>10km 완주 플랜 · 4주 차 월요일</T><T size={30} weight="bold">가볍게 6km,{`\n`}1km당 6:20</T>
    <Card tone="soft"><T size={11} weight="bold" color={colors.blue}>회복을 위한 러닝</T><T size={20} weight="bold">어제는 강하게,{`\n`}오늘은 편안하게.</T><T size={12} color={colors.muted}>어제 인터벌 6.2km로 피로가 쌓였어요.{`\n`}대화할 수 있는 속도로 달려 보세요.</T><Metrics items={ [['높음', '어제 훈련 강도'], ['보통', '지금 피로도'], ['145↓', '권장 심박']] } /></Card>
    <Section title="오늘 할 운동" />{[['01', '워밍업', '빠르게 걷기 · 발목과 고관절 돌리기', '5분'], ['02', '편한 달리기 6km', '6:10~6:30/km · 심박 145 이하', '38분'], ['03', '마무리', '천천히 걷기 · 하체 스트레칭', '5분']].map(([number, title, desc, time]) => <Card key={number}><Row><T size={12} weight="bold" color={colors.blue}>{number}</T><T size={15} weight="bold">{title}</T><T size={12} color={colors.muted}>{time}</T></Row><T size={11} color={colors.muted}>{desc}</T></Card>)}
    <Card><T size={16} weight="bold">왜 가볍게 뛰나요?</T><T size={12} color={colors.muted}>강한 훈련 다음 날은 천천히 달려야 근육이 회복돼요. 토요일 9km 장거리를 위해 오늘은 편안하게 달려 보세요.</T></Card>
    <Button tone="soft" style={{ backgroundColor: '#E8DEF8', alignSelf: 'flex-start', minHeight: 44 }} onPress={() => router.push('/profile')}>12주 플랜 다시 보기</Button>
  </Screen>;
}

export function CourseScreen() {
  const currentCourse = useCourse();
  const { setCourseId, toast } = useDemo();
  const { select } = useLocalSearchParams<{ select?: string }>();
  const [preview, setPreview] = useState<string>(currentCourse.id);
  const course = courses.find(item => item.id === preview) ?? courses[0];
  const choose = () => { setCourseId(course.id); toast(`${course.title} 코스를 선택했어요.`); if (select === 'true' && router.canGoBack()) router.back(); else router.push('/run'); };
  return <Screen testID="screen-courses" footer={<Button onPress={choose}>{select === 'true' ? '이 코스 선택하기' : '이 코스로 달리기'}</Button>}><Header title="코스 상세" /><T size={11} weight="medium" color={colors.blue}>{course.location}</T><T size={28} weight="bold">{course.title.replace(' 왕복', '\n왕복 코스')}</T><T size={12} weight="bold" color={colors.green}>{course.tags}</T>
    <Card><CourseMap /><T size={10} color={colors.muted}>러닝 코스 개략도 · 실제 길 안내는 제공하지 않아요</T><Metrics items={[[course.distance, '거리 km'], [course.elevation, '오르막 m'], [course.minutes, '예상 시간 분']]} /></Card>
    <Section title="추천하는 이유" /><Card>{[course.reason, '1km마다 구간 페이스를 확인해 보세요.', '아침 시간대에 여유롭게 달려요.'].map(reason => <Row key={reason} style={{ gap: 10, justifyContent: 'flex-start' }}><T color={colors.green} weight="bold">✓</T><T size={12} style={{ flex: 1 }}>{reason}</T></Row>)}</Card>
    <Section title="다른 추천 코스" /><Stack>{courses.map(item => <Card key={item.id} tone={preview === item.id ? 'soft' : 'white'} onPress={() => setPreview(item.id)} label={`${item.title} 미리보기`} style={{ padding: 16 }}><Row><T size={13} weight="bold">{item.title}</T><T size={12} color={colors.blue}>{preview === item.id ? '선택됨' : `${item.distance}km`}</T></Row><T size={11} color={colors.muted}>{item.tags}</T></Card>)}</Stack>
    <Section title="이 코스 순위" /><Card><Runner rank="1" name="박도윤" subtitle="코스 최고 기록" value="22:51" /><Runner rank="18" name="지호" subtitle="내 기록" value="33:10" me /></Card>
  </Screen>;
}

export function DuelScreen() {
  const { name, setMode, toast } = useDemo();
  const [selected, setSelected] = useState('서윤');
  return <Screen testID="screen-duel" footer={<Button onPress={() => { setMode('friend'); router.push('/run'); }}>서윤님과 달리기</Button>}><Header title="친구와 1:1" /><T size={28} weight="bold">멀리 있어도,{`\n`}나란히 달려요.</T><T size={12} color={colors.muted}>이번 주 누가 더 멀리 달릴까요?</T>
    <Card tone="dark"><T size={11} color="white">이번 주 거리 대결 · D–3</T><Row><Stack gap={2}><T size={12} weight="bold" color="white">{name} · 서울</T><T size={34} weight="black" color="white">18.4</T></Stack><T size={12} weight="bold" color={colors.pink}>VS</T><Stack gap={2}><T size={12} weight="bold" color="white">서윤 · 부산</T><T size={34} weight="black" color="white">17.2</T></Stack></Row><Track /><T size={15} weight="bold" color="white">지금 1.2km 앞서고 있어요.</T></Card>
    <Section title="함께 달리는 친구" /><Card>{[['01', '서윤', '부산 수영구 · 거리 대결 중', '17.2km'], ['02', '정유진', '서울 마포구 · 5km 기록', '27:40'], ['03', '한지민', '광주 서구 · 5km 기록', '27:38']].map(([rank, friend, subtitle, value]) => <Runner key={friend} rank={rank} name={friend} subtitle={selected === friend ? '선택한 친구 · ' + subtitle : subtitle} value={value} onPress={() => { setSelected(friend); toast(`${friend}님을 선택했어요.`); }} />)}</Card>
    <Card tone="soft"><T size={16} weight="bold">서로의 오늘을 응원해요</T><T size={12} color={colors.muted}>다른 도시에서도 같은 목표로 달리며{`\n`}이번 주의 기록을 함께 쌓아 보세요.</T><Button tone="white" onPress={() => toast(`${selected}님에게 보낼 응원을 미리 봤어요. 실제로 전송되지는 않아요.`)}>응원 보내기</Button></Card><View />
  </Screen>;
}
