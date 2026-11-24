import React, { useCallback } from 'react';
import { Alert, Platform, Pressable, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Button, Card, Header, Preference, Row, Screen, Section, Segments, T } from '../ui';
import { colors } from '../theme';
import { runModes } from '../data';
import { gps } from '../gps';
import { useCourse, useDemo } from '../state';
import { runStore, useRunStore } from '../stores/runStore';
import type { RunPhase } from '../core/run/session';
import { useMyRecords } from '../hooks/useMyRecords';
import { formatDuration, formatPace } from '../core/run/geo';

// 친구 기능은 아직 없다. 친구 목록이 생기면 실제 값으로 바꾼다.
const hasFriends = false;
const NO_FRIENDS_TITLE = '친구가 한 명도 없네요 😏';
const NO_FRIENDS_MESSAGE = '1:1 대결은 친구가 있어야 할 수 있어요.\n일단 기록 속의 나부터 이겨 보는 건 어때요?';

function showNoFriends() {
  if (Platform.OS === 'web') window.alert(`${NO_FRIENDS_TITLE}\n${NO_FRIENDS_MESSAGE}`);
  else Alert.alert(NO_FRIENDS_TITLE, NO_FRIENDS_MESSAGE, [{ text: '알겠어요' }]);
}

const gpsText: Partial<Record<RunPhase, string>> = { idle: 'GPS 준비 전', acquiring: 'GPS 신호를 찾고 있어요', ready: 'GPS 준비 완료', countdown: 'GPS 준비 완료' };

function useGpsWhilePreparing() {
  useFocusEffect(useCallback(() => {
    const { phase, reset, prepare } = runStore.getState();
    if (phase === 'finished') reset();
    if (phase === 'recoverable') { router.replace('/'); return; } // 복구 여부는 홈에서 먼저 묻는다
    void prepare();
    return () => {
      const current = runStore.getState().phase;
      if (current === 'acquiring' || current === 'ready') void runStore.getState().cancel();
    };
  }, []));
}

export function RunScreen() {
  const { mode, setMode, distance, setDistance, preferences, toggle } = useDemo();
  const course = useCourse();
  const selectedTitle = runModes.find(item => item.id === mode)!.title;
  const selectMode = (id: typeof mode) => {
    if (id === 'friend' && !hasFriends) return showNoFriends();
    setMode(id);
  };
  useGpsWhilePreparing();
  const { ghost } = useMyRecords();
  const ghostDescription = `5km 최고 기록 ${formatDuration(ghost.recordSec * 1000)}의 내가 함께 달려요${ghost.isExample ? ' (예시 기록)' : ''}`;
  const phase = useRunStore(state => state.phase);
  const accuracyM = useRunStore(state => state.snapshot.accuracyM);
  const error = useRunStore(state => state.error);
  const running = phase === 'recording' || phase === 'paused' || phase === 'countdown';
  const ready = phase === 'ready';
  const go = () => {
    if (ready) runStore.getState().beginCountdown();
    router.push('/active');
  };
  const startLabel = running ? '달리는 중 화면으로' : error ? '위치 권한이 필요해요' : !ready ? 'GPS를 찾는 중이에요' : mode === 'solo' ? '자유롭게 출발' : mode === 'coaching' ? '코칭 시작하기' : `${selectedTitle}와 출발`;
  const gpsLine = error ?? `${gpsText[phase] ?? ''}${!ready && accuracyM !== undefined ? ` · 정확도 ${Math.round(accuracyM)}m (20m 이내면 준비 완료)` : ''}`;
  return <Screen testID="screen-run" footer={<><T testID="gps-status" size={11} weight="medium" color={error ? colors.pink : ready ? colors.green : colors.muted} style={{ textAlign: 'center' }}>{running ? '달리기가 진행 중이에요' : `● ${gpsLine}`}</T><Button testID="start-run" disabled={!ready && !running} onPress={go}>{startLabel}</Button></>}>
    <Header title="달리기 준비" onBack={() => router.replace('/')} />
    <T size={22} weight="bold">누구와 달릴까요?</T>
    <View accessibilityRole="radiogroup" style={{ gap: 12 }}>{runModes.map(item => <Pressable key={item.id} accessibilityRole="radio" accessibilityLabel={item.title} accessibilityState={{ checked: mode === item.id }} onPress={() => selectMode(item.id)}><Card tone={mode === item.id ? 'soft' : 'white'} style={{ padding: 16 }}><Row><T weight="bold" color={mode === item.id ? colors.blue : colors.ink}>{item.title}</T><T size={20} color={mode === item.id ? colors.blue : '#BCC4D8'}>{mode === item.id ? '●' : '○'}</T></Row><T size={11} color={colors.muted}>{item.id === 'ghost' ? ghostDescription : item.description}</T></Card></Pressable>)}</View>
    <Section title="얼마나 달릴까요?" /><Segments options={['3km', '5km', '6km', '10km']} value={`${distance}km`} onChange={value => setDistance(parseInt(value))} />
    <T size={11} color={colors.muted}>{distance === 6 ? '오늘의 코칭에 맞는 거리예요.' : `최고 기록 페이스 ${formatPace(ghost.paceSecKm)}로 함께 달려요.`}</T>
    <Section title="코스" action="바꾸기" onPress={() => router.push({ pathname: '/courses', params: { select: 'true' } })} />
    <Card onPress={() => router.push({ pathname: '/courses', params: { select: 'true' } })} label="러닝 코스 변경" style={{ padding: 16 }}>{course ? <><T weight="bold">{course.title}</T><T size={11} color={colors.muted}>{course.distance}km · 고도 {course.elevation}m · {course.location}</T></> : <><T weight="bold">선택 없음</T><T size={11} color={colors.muted}>코스 없이 자유롭게 달려요</T></>}</Card>
    <Section title="달리는 동안" /><Card style={{ padding: 16, gap: 4 }}><Preference title="음성 코칭" description="페이스가 흔들리면 알려 드려요" value={preferences.voice} onChange={() => toggle('voice')} /><Preference title="1km마다 구간 기록 알림" value={preferences.splits} onChange={() => toggle('splits')} />{mode === 'ghost' && <Preference title="기록 속의 나와의 차이 알림" description="최고 기록보다 앞서는지 뒤처지는지 알려 드려요" value={preferences.opponent} onChange={() => toggle('opponent')} />}</Card>
    <T size={10} color={colors.muted}>{gps ? '출발하면 정확한 위치 권한을 요청해요.' : '이 환경에서는 가상 GPS로 기록해요. 실제 위치를 쓰지 않아요.'}</T>
    {gps && <Button tone="soft" onPress={() => router.navigate('/gps')}>GPS 프로토타입</Button>}
  </Screen>;
}
