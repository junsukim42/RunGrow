import { useEffect, useRef, useState } from 'react';
import { AppState, Linking } from 'react-native';
import { router } from 'expo-router';
import { gps, requestGpsPermission, type GpsCommand, type GpsSnapshot } from '../gps';
import { colors } from '../theme';
import { Button, Card, Header, Metrics, Row, Screen, T } from '../ui';

const labels: Record<GpsSnapshot['status'], string> = {
  idle: '측정 준비',
  recording: '측정 중',
  paused: '일시정지',
  stopped: '측정 종료',
  interrupted: '측정 중단',
};

const initial: GpsSnapshot = {
  status: 'idle', movingMs: 0, distanceMeters: 0, sampleCount: 0, acceptedCount: 0,
};

function formatElapsed(ms: number) {
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
}

export function GpsScreen() {
  const [snapshot, setSnapshot] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [error, setError] = useState<string>();
  const mounted = useRef(false);
  const pendingCommand = useRef(false);
  const revision = useRef(0);

  useEffect(() => {
    if (!gps) return;
    const recorder = gps;
    mounted.current = true;
    revision.current++;
    let refreshing = false;
    const refresh = async () => {
      if (refreshing || pendingCommand.current) return;
      const currentRevision = revision.current;
      refreshing = true;
      try {
        const next = await recorder.getSnapshot();
        if (mounted.current && revision.current === currentRevision) setSnapshot(next);
      } catch {
        if (mounted.current && revision.current === currentRevision) setError('GPS 상태를 읽지 못했어요.');
      } finally {
        refreshing = false;
      }
    };
    void refresh();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') void refresh();
    });
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') void refresh();
    }, 1000);
    return () => {
      mounted.current = false;
      subscription.remove();
      clearInterval(timer);
      void recorder.stop().catch(() => undefined);
    };
  }, []);

  const runCommand = async (command: GpsCommand) => {
    if (!gps || pendingCommand.current) return;
    const currentRevision = ++revision.current;
    const isCurrent = () => mounted.current && revision.current === currentRevision;
    pendingCommand.current = true;
    setBusy(true);
    setError(undefined);
    setPermissionDenied(false);
    try {
      if (command === 'start' && !(await requestGpsPermission())) {
        if (isCurrent()) setPermissionDenied(true);
        return;
      }
      if (!isCurrent()) return;
      await gps[command]();
      const next = await gps.getSnapshot();
      if (isCurrent()) setSnapshot(next);
    } catch {
      if (isCurrent()) setError('GPS 명령을 처리하지 못했어요. 다시 시도해 주세요.');
    } finally {
      pendingCommand.current = false;
      if (isCurrent()) setBusy(false);
    }
  };

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/run');
  };
  const running = snapshot.status === 'recording';
  const active = running || snapshot.status === 'paused';
  const footer = active ? (
    <Row style={{ gap: 12 }}>
      <Button tone="soft" disabled={busy} onPress={() => void runCommand(running ? 'pause' : 'resume')} style={{ flex: 1 }}>
        {running ? '일시정지' : '계속 측정'}
      </Button>
      <Button disabled={busy} onPress={() => void runCommand('stop')} style={{ flex: 1 }}>측정 종료</Button>
    </Row>
  ) : (
    <Button testID="start-gps" disabled={busy} onPress={() => void runCommand('start')}>
      {busy ? '권한 확인 중' : snapshot.status === 'idle' ? 'GPS 측정 시작' : '새로 측정'}
    </Button>
  );

  return (
    <Screen testID="screen-gps" footer={gps ? footer : undefined}>
      <Header title="GPS 프로토타입" onBack={goBack} />
      {gps ? (
        <>
          <Card tone="dark">
            <T size={13} color="white">
              {running && snapshot.firstFixMs === undefined ? '정확도 20m 이내 신호를 찾는 중' : labels[snapshot.status]}
            </T>
            <T testID="gps-distance" size={44} weight="black" color="white">{snapshot.distanceMeters.toFixed(1)} m</T>
            <T size={14} color="white">측정 시간 {formatElapsed(snapshot.movingMs)}</T>
          </Card>
          <Card>
            <Metrics items={[
              [snapshot.accuracyMeters === undefined ? '—' : snapshot.accuracyMeters.toFixed(1), '최근 정확도 m'],
              [snapshot.firstFixMs === undefined ? '—' : (snapshot.firstFixMs / 1000).toFixed(1), '첫 고정 초'],
              [`${snapshot.acceptedCount}/${snapshot.sampleCount}`, '사용/수신 좌표'],
            ]} />
          </Card>
          {permissionDenied && (
            <Card tone="soft">
              <T>앱 설정에서 위치 접근과 정확한 위치를 허용해 주세요.</T>
              <Button tone="soft" onPress={() => void Linking.openSettings().catch(() => setError('기기 설정을 직접 열어 주세요.'))}>
                앱 설정 열기
              </Button>
            </Card>
          )}
          {(error || snapshot.message) && <T color={colors.ink}>{error || snapshot.message}</T>}
          <T size={12} color={colors.muted}>측정 중에는 화면을 잠가도 위치를 수집해요. 이 화면을 나가면 측정이 종료돼요.</T>
        </>
      ) : (
        <Card><T>GPS 측정은 네이티브 모듈이 포함된 Android 또는 iOS 빌드에서 사용할 수 있어요.</T></Card>
      )}
    </Screen>
  );
}
