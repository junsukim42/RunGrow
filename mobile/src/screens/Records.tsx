import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Card, Header, Metrics, Row, Screen, Section, Segments, Stack, T } from '../ui';
import { recentRuns } from '../data';
import { colors } from '../theme';
import { useLocalRuns } from '../hooks/useMyRecords';
import type { LocalRun } from '../core/db/localDb';
import { formatDuration, formatKm, formatPace } from '../core/run/geo';
import { findBests, summarizePeriod, type Best, type Period } from '../core/run/stats';
import { runKindLabel } from '../core/run/session';

export const syncLabel: Record<LocalRun['syncStatus'], string> = { pending: '업로드 대기', synced: '업로드 완료', failed: '업로드 재시도 예정' };

export const openRecord = (id: string) => router.push({ pathname: '/record/[id]', params: { id } });

const shortDate = (iso: string) => { const date = new Date(iso); return `${date.getMonth() + 1}/${date.getDate()}`; };
const bestItem = (best: Best, label: string): [string, string] => [best ? formatDuration(best.sec * 1000) : '–', best ? `${label} · ${shortDate(best.startedAt)}` : `${label} · 기록 없음`];

export function RecordsScreen() {
  const [period, setPeriod] = useState<Period>('7일');
  const runs = useLocalRuns();
  const data = useMemo(() => summarizePeriod(runs, period), [runs, period]);
  const bests = useMemo(() => findBests(runs), [runs]);
  const max = Math.max(...data.bars, 1);
  const bestRun = bests.km5 ?? bests.km1;
  return <Screen testID="screen-records"><Header title="기록" back={false} />
    <Segments options={['7일', '월', '연'] as const} value={period} onChange={setPeriod} />
    <Stack gap={0}><T testID="period-distance" size={48} weight="black">{formatKm(data.distanceM)}<T size={22} weight="bold"> km</T></T><T size={12} color={colors.muted}>{data.caption}</T></Stack>
    <Row style={{ height: 180, alignItems: 'flex-end', gap: period === '연' ? 4 : 10 }}>{data.bars.map((value, index) => <Stack key={index} gap={6} style={{ flex: 1, alignItems: 'center' }}><T size={period === '연' ? 8 : 10} weight="bold" color={colors.muted}>{value ? String(value) : ' '}</T><View accessibilityLabel={`${data.labels[index]} ${value}km`} style={{ width: '72%', maxWidth: 36, height: Math.max(3, value / max * 114), backgroundColor: value ? colors.ink : colors.line, borderRadius: 8 }} /><T size={10} color={colors.muted}>{data.labels[index]}</T></Stack>)}</Row>
    <Card><Metrics items={[[String(data.count), '달린 횟수'], [formatDuration(data.movingSec * 1000), '달린 시간'], [formatPace(data.avgPaceSecKm), '평균 페이스']]} /></Card>
    <Section title="최고 기록" />
    <Card onPress={bestRun ? () => openRecord(bestRun.runId) : undefined} label="최고 기록 상세"><Metrics items={[bestItem(bests.km1, '1km'), bestItem(bests.km5, '5km'), bestItem(bests.km10, '10km')]} /></Card>
    <Section title="최근 달리기" />
    {runs.length === 0 && <T size={12} color={colors.muted}>아직 저장한 달리기가 없어요. 달리기를 마치면 여기에 쌓여요.</T>}
    {runs.map(run => { const started = new Date(run.startedAt); return <Card key={run.id} tone="soft" onPress={() => openRecord(run.id)} label={`${shortDate(run.startedAt)} 러닝 상세 보기`}><Row style={{ gap: 12 }}><Stack gap={4} style={{ flex: 1 }}><T size={13} weight="bold">{started.getMonth() + 1}.{started.getDate()} {started.getHours().toString().padStart(2, '0')}:{started.getMinutes().toString().padStart(2, '0')} 러닝</T><T size={10} color={colors.muted}>{formatDuration(run.movingSec * 1000)} · {syncLabel[run.syncStatus]}</T></Stack><T size={14} weight="bold" color={colors.blue}>{formatKm(run.distanceM)}km</T></Row><Row><T size={11} color={colors.muted}>평균 페이스 {formatPace(run.avgPaceSecKm || null)}</T><T size={10} weight="medium" color={colors.blue}>{runKindLabel[run.kind]}</T></Row></Card>; })}
    <Section title="예시 기록" />
    {recentRuns.map(run => <Card key={run.id} onPress={() => openRecord(`demo-${run.id}`)} label={`${run.title} 상세 보기`}><Row style={{ gap: 12 }}><Stack gap={4} style={{ flex: 1 }}><T size={13} weight="bold">{run.title}</T><T size={10} color={colors.muted}>{run.date}</T></Stack><T size={14} weight="bold" color={colors.blue}>{run.distance}</T></Row><Row><T size={11} color={colors.muted}>평균 페이스 {run.pace}</T><T size={10} weight="medium" color={colors.blue}>{run.tag}</T></Row></Card>)}
  </Screen>;
}
