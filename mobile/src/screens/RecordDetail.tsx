import React, { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Card, Header, Metrics, Row, Screen, Stack, T } from '../ui';
import { colors } from '../theme';
import { recentRuns } from '../data';
import { services } from '../core/services';
import type { LocalRun } from '../core/db/localDb';
import { formatDuration, formatKm, formatPace } from '../core/run/geo';
import { syncLabel } from './Records';
import { RouteSketch } from '../components/RouteSketch';
import { PaceChart } from '../components/PaceChart';
import { runKindLabel } from '../core/run/session';

const DEMO_PREFIX = 'demo-';

export function RecordDetailScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  return id.startsWith(DEMO_PREFIX) ? <DemoDetail id={id.slice(DEMO_PREFIX.length)} /> : <LocalDetail id={id} />;
}

function LocalDetail({ id }: { id: string }) {
  const [run, setRun] = useState<LocalRun | null | undefined>(undefined);
  useEffect(() => {
    let active = true;
    services.db.getRun(id).then(result => { if (active) setRun(result); }).catch(() => { if (active) setRun(null); });
    return () => { active = false; };
  }, [id]);

  if (run === undefined) return <Screen testID="screen-record-loading"><StatusBar style="dark" /><Header title="기록 상세" /><T color={colors.muted}>기록을 불러오는 중이에요.</T></Screen>;
  if (run === null) return <Screen testID="screen-record-missing"><StatusBar style="dark" /><Header title="기록 상세" /><T size={18} weight="bold">기록을 찾을 수 없어요</T><T size={12} color={colors.muted}>앱을 다시 켜면 이 기기에 임시로 저장한 기록은 사라져요.</T></Screen>;

  const started = new Date(run.startedAt);
  const time = `${started.getFullYear()}년 ${started.getMonth() + 1}월 ${started.getDate()}일 ${started.getHours().toString().padStart(2, '0')}:${started.getMinutes().toString().padStart(2, '0')}`;
  return <Screen testID="screen-record-detail"><StatusBar style="dark" /><Header title="기록 상세" />
    <T size={11} color={colors.muted}>{time} · {syncLabel[run.syncStatus]}</T>
    <T size={9} weight="bold" color={colors.blue} style={{ alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: colors.soft }}>{runKindLabel[run.kind]}</T>
    <Stack gap={0}><T testID="detail-distance" size={48} weight="black">{formatKm(run.distanceM)}<T size={22} weight="bold"> km</T></T><T size={12} color={colors.muted}>달린 거리</T></Stack>
    <Card><Metrics items={[[formatDuration(run.movingSec * 1000), '달린 시간'], [formatPace(run.avgPaceSecKm || null), '평균 페이스'], [String(run.laps.length), '완주 구간(1km)']]} /></Card>
    <Card><Row><T size={14} weight="bold">달린 경로</T><Row style={{ gap: 10 }}><T size={10} color={colors.green}>● 출발</T><T size={10} color={colors.pink}>● 도착</T></Row></Row><RouteSketch route={run.route} /><T size={10} color={colors.muted}>지도 없이 경로 모양만 보여줘요. 네이버 지도는 지도 키를 받은 뒤 연결해요.</T></Card>
    <Card><T size={14} weight="bold">구간별 페이스</T><PaceChart laps={run.laps} /></Card>
    {!services.recorder.isReal && <T size={10} color={colors.muted}>가상 GPS로 기록한 달리기예요.</T>}
  </Screen>;
}

function DemoDetail({ id }: { id: string }) {
  const run = recentRuns.find(item => item.id === id);
  if (!run) return <Screen testID="screen-record-missing"><StatusBar style="dark" /><Header title="기록 상세" /><T size={18} weight="bold">기록을 찾을 수 없어요</T></Screen>;
  const [date, place] = run.date.split(' · ');
  return <Screen testID="screen-record-detail"><StatusBar style="dark" /><Header title="기록 상세" />
    <T size={11} color={colors.muted}>{date} · {place}</T>
    <T size={9} weight="bold" color={colors.blue} style={{ alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: colors.soft }}>{run.tag}</T>
    <T size={26} weight="bold">{run.title}</T>
    <Card><Metrics items={[[run.distance.replace('km', ''), '거리 km'], [run.pace, '평균 페이스'], [run.tag, '종류']]} /></Card>
    <T size={10} color={colors.muted}>화면 확인을 위한 예시 기록이에요. 실제 운동 기록이 아니에요.</T>
  </Screen>;
}
