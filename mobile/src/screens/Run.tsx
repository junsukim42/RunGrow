import React from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Header, Preference, Row, Screen, Section, Segments, T } from '../ui';
import { colors } from '../theme';
import { runModes } from '../data';
import { useCourse, useDemo } from '../state';

export function RunScreen() {
  const { mode, setMode, distance, setDistance, preferences, toggle } = useDemo();
  const course = useCourse();
  const selectedTitle = runModes.find(item => item.id === mode)!.title;
  return <Screen testID="screen-run" footer={<Button testID="start-run" onPress={() => router.push('/active')}>{mode === 'solo' ? '자유롭게 출발' : `${selectedTitle}와 출발`}</Button>}>
    <Header title="달리기 준비" onBack={() => router.replace('/')} />
    <T size={22} weight="bold">누구와 달릴까요?</T>
    <View accessibilityRole="radiogroup" style={{ gap: 12 }}>{runModes.map(item => <Pressable key={item.id} accessibilityRole="radio" accessibilityLabel={item.title} accessibilityState={{ checked: mode === item.id }} onPress={() => setMode(item.id)}><Card tone={mode === item.id ? 'soft' : 'white'} style={{ padding: 16 }}><Row><T weight="bold" color={mode === item.id ? colors.blue : colors.ink}>{item.title}</T><T size={20} color={mode === item.id ? colors.blue : '#BCC4D8'}>{mode === item.id ? '●' : '○'}</T></Row><T size={11} color={colors.muted}>{item.description}</T></Card></Pressable>)}</View>
    <Section title="얼마나 달릴까요?" /><Segments options={['3km', '5km', '6km', '10km']} value={`${distance}km`} onChange={value => setDistance(parseInt(value))} />
    <T size={11} color={colors.muted}>{distance === 6 ? '오늘의 코칭에 맞는 거리예요.' : '최고 기록 페이스 5′32″로 함께 달려요.'}</T>
    <Section title="코스" action="바꾸기" onPress={() => router.push({ pathname: '/courses', params: { select: 'true' } })} />
    <Card onPress={() => router.push({ pathname: '/courses', params: { select: 'true' } })} label="러닝 코스 변경" style={{ padding: 16 }}><T weight="bold">{course.title}</T><T size={11} color={colors.muted}>{course.distance}km · 고도 {course.elevation}m · {course.location}</T></Card>
    <Section title="달리는 동안" /><Card style={{ padding: 16, gap: 4 }}><Preference title="음성 코칭" description="페이스가 흔들리면 알려 드려요" value={preferences.voice} onChange={() => toggle('voice')} /><Preference title="1km마다 구간 기록 알림" value={preferences.splits} onChange={() => toggle('splits')} /><Preference title="상대와의 차이 알림" value={preferences.opponent} onChange={() => toggle('opponent')} /></Card>
    <T size={10} color={colors.muted}>시연용 러닝이에요. 위치·마이크 권한을 요청하지 않아요.</T>
  </Screen>;
}
