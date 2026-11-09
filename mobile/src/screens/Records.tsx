import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Card, Header, Metrics, Row, Screen, Section, Segments, Stack, T } from '../ui';
import { periods, recentRuns } from '../data';
import { colors } from '../theme';
import { useDemo } from '../state';

export function RecordsScreen() {
  const [period, setPeriod] = useState<keyof typeof periods>('7일');
  const data = periods[period];
  const { saved } = useDemo();
  const max = Math.max(...data.bars, 1);
  const openResult = () => router.push('/result');
  return <Screen testID="screen-records"><Header title="기록" back={false} />
    <Segments options={['7일', '월', '연'] as const} value={period} onChange={setPeriod} />
    <Stack gap={0}><T size={48} weight="black">{data.distance}<T size={22} weight="bold"> km</T></T><T size={12} color={colors.muted}>{data.caption}</T></Stack>
    <Row style={{ height: 180, alignItems: 'flex-end', gap: period === '연' ? 4 : 10 }}>{data.bars.map((value, index) => <Stack key={index} gap={6} style={{ flex: 1, alignItems: 'center' }}><T size={period === '연' ? 8 : 10} weight="bold" color={colors.muted}>{value ? String(value) : ' '}</T><View accessibilityLabel={`${data.labels[index]} ${value}km`} style={{ width: '72%', maxWidth: 36, height: Math.max(3, value / max * 114), backgroundColor: value ? colors.ink : colors.line, borderRadius: 8 }} /><T size={10} color={colors.muted}>{data.labels[index]}</T></Stack>)}</Row>
    <Card><Metrics items={[[data.count, '달린 횟수'], [data.time, '달린 시간'], [data.pace, '평균 페이스']]} /></Card>
    <Section title="최고 기록" /><Card onPress={openResult} label="최고 기록 상세"><Metrics items={ [['4:51', '1km · 10/18'], [saved ? '27:20' : '27:42', '5km · 최고 기록'], ['–', '10km · 목표']] } /></Card>
    <Section title="최근 달리기" />
    {saved && <Card tone="soft" onPress={openResult} label="저장한 데모 달리기"><Row><Stack gap={4}><T size={13} weight="bold">어제의 나를 앞지른 러닝</T><T size={10} color={colors.muted}>방금 저장 · 반포 한강공원</T></Stack><T size={14} weight="bold" color={colors.blue}>5.0km</T></Row><T size={11} color={colors.blue}>데모 기록 · 27:20</T></Card>}
    {recentRuns.map(run => <Card key={run.id} onPress={openResult} label={`${run.title} 결과 보기`}><Row style={{ gap: 12 }}><Stack gap={4} style={{ flex: 1 }}><T size={13} weight="bold">{run.title}</T><T size={10} color={colors.muted}>{run.date}</T></Stack><T size={14} weight="bold" color={colors.blue}>{run.distance}</T></Row><Row><T size={11} color={colors.muted}>평균 페이스 {run.pace}</T><T size={10} weight="medium" color={colors.blue}>{run.tag}</T></Row></Card>)}
  </Screen>;
}
