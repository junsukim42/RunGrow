import React, { useState } from 'react';
import { TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Card, Header, Metrics, Preference, Row, Screen, Section, Stack, T, TextAction } from '../ui';
import { colors, fonts } from '../theme';
import { useDemo } from '../state';

export function ProfileScreen() {
  const { name, preferences } = useDemo();
  return <Screen testID="screen-profile"><Header title="내 정보" back={false} /><Card><Row style={{ gap: 16 }}><View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center' }}><T size={24} weight="bold" color={colors.blue}>{name.slice(0, 1)}</T></View><Stack gap={3} style={{ flex: 1 }}><T size={21} weight="bold">{name}</T><T size={11} color={colors.muted}>서울 성동구 · 러닝 3개월 차</T></Stack><TextAction onPress={() => router.push({ pathname: '/settings', params: { section: 'profile' } })}>수정</TextAction></Row><Metrics items={ [['186', '누적 km'], ['41', '달린 횟수'], ['12', '최장 연속일']] } /></Card>
    <Section title="내 러닝 설정" action="설문 다시 하기" onPress={() => router.push({ pathname: '/settings', params: { section: 'running' } })} /><Card>{[['목표', '10km 완주 · 12주 플랜'], ['달리는 날', '주 4회 · 아침'], ['좋아하는 코스', '평지 · 강변 · 5~7km'], ['지금 페이스', '1km 5~6분']].map(([label, value]) => <Stack key={label} gap={4}><T size={10} color={colors.muted}>{label}</T><T size={13} weight="bold">{value}</T></Stack>)}</Card>
    <Section title="설정" /><Card>{[['워치 연결', '연결 안 됨', 'watch'], ['음성 코칭', preferences.voice ? '켜짐' : '꺼짐', 'running'], ['알림', '›', 'notifications'], ['친구 관리', '3명  ›', 'friends'], ['개인정보와 위치 공개', '›', 'privacy']].map(([title, value, section]) => <Row key={title}><T size={12} weight="medium">{title}</T><TextAction onPress={() => section === 'friends' ? router.push('/duel') : router.push({ pathname: '/settings', params: { section } })}>{value}</TextAction></Row>)}</Card>
    <T size={10} color={colors.muted} style={{ textAlign: 'center' }}>나란히 UI 프로토타입 · v1.0{`\n`}설정은 앱 실행 중에만 유지돼요.</T>
  </Screen>;
}

export function SettingsScreen() {
  const { section = 'running' } = useLocalSearchParams<{ section?: string }>();
  const { name, setName, preferences, toggle, toast } = useDemo();
  const [draft, setDraft] = useState(name);
  const [goal, setGoal] = useState('10km 완주');
  const [watch, setWatch] = useState(false);
  const title = ({ profile: '프로필 수정', notifications: '알림', privacy: '개인정보와 위치 공개', watch: '워치 연결', running: '내 러닝 설정' } as Record<string, string>)[section] ?? '설정';
  return <Screen testID="screen-settings"><Header title={title} />
    {section === 'profile' ? <><Card><T weight="bold">어떻게 불러 드릴까요?</T><TextInput accessibilityLabel="닉네임" value={draft} onChangeText={setDraft} maxLength={12} placeholder="닉네임" style={{ minHeight: 52, borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 14, color: colors.ink, fontFamily: fonts.medium, fontSize: 16 }} /><T size={11} color={colors.muted}>최대 12자까지 입력할 수 있어요.</T></Card><Button disabled={!draft.trim()} onPress={() => { setName(draft.trim()); router.back(); toast('프로필을 바꿨어요.'); }}>저장하기</Button></> : section === 'notifications' ? <><Card><Preference title="러닝 알림 받기" value={preferences.notifications} onChange={() => toggle('notifications')} /></Card><Card><T weight="bold">오늘의 새로운 소식</T><T size={12} color={colors.muted}>오늘은 가볍게 6km만 뛰어요. 회복 러닝으로 이번 주를 시작해 보세요.</T><Button tone="soft" onPress={() => router.push('/coaching')}>오늘의 코칭 보기</Button></Card><Card><T weight="bold">서윤님과의 대결이 진행 중이에요</T><T size={12} color={colors.muted}>지금 1.2km 앞서고 있어요. 함께 달려볼까요?</T><Button tone="soft" onPress={() => router.push('/duel')}>대결 보기</Button></Card></> : section === 'privacy' ? <Card><Preference title="프로필 공개" description="친구에게 러닝 기록 공개" value={preferences.publicProfile} onChange={() => toggle('publicProfile')} /><T size={12} color={colors.muted}>이 프로토타입은 실제 위치를 수집하거나 기록을 외부로 전송하지 않아요.</T></Card> : section === 'watch' ? <Card><T size={22} weight="bold">손목에서도 나란히</T><T size={12} color={colors.muted}>실제 워치 연동 없이 연결 화면을 미리 볼 수 있어요.</T><Preference title="데모 워치 연결" value={watch} onChange={() => setWatch(value => !value)} /><T color={watch ? colors.green : colors.muted}>{watch ? '데모 워치와 연결했어요' : '연결된 기기가 없어요'}</T></Card> : <><Card><T weight="bold">나의 러닝 목표</T>{['5km 꾸준히 달리기', '10km 완주', '하프 마라톤 도전'].map(value => <Button key={value} tone={goal === value ? 'blue' : 'soft'} onPress={() => setGoal(value)}>{value}</Button>)}<T size={11} color={colors.muted}>목표 선택 미리보기예요. 코칭 데이터는 예시로 제공돼요.</T></Card><Card><Preference title="음성 코칭" value={preferences.voice} onChange={() => toggle('voice')} /><Preference title="1km마다 구간 기록 알림" value={preferences.splits} onChange={() => toggle('splits')} /><Preference title="상대와의 차이 알림" value={preferences.opponent} onChange={() => toggle('opponent')} /></Card></>}
  </Screen>;
}
