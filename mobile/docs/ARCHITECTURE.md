# 앱 구조

## 폴더

```
src/
  app/              라우트 (Expo Router)
  screens/          화면
  components/       RouteSketch(경로), PaceChart(구간 페이스)
  hooks/            useMyRecords (저장된 기록, 최고 기록)
  stores/runStore   러닝 세션 상태 (Zustand)
  core/
    contracts/      recorder(GPS 모듈), backend(Supabase), social(순위)
    run/            session(상태 머신), geo(거리·경로 간소화·포맷), stats(기간 합계·최고 기록)
    db/             LocalDb 인터페이스, memoryDb, schema(op-sqlite)
    sync/           동기화 큐
    mocks/          가짜 GPS·백엔드·순위
    nativeRecorder  modules/rungrow-gps 어댑터
    services        구현체 연결
```

## 구현 상태

| 항목 | 현재 | 예정 |
| --- | --- | --- |
| GPS | 네이티브 모듈이 있으면 사용, 없으면(웹·Expo Go) 가짜 GPS | 네이티브 API 확장 후 어댑터 교체 |
| 로컬 저장 | 메모리 (앱 재시작 시 초기화) | op-sqlite |
| 서버 | 가짜 백엔드 | supabase-js |
| 순위·대결 | 예시 데이터 | 범위 미정 |
| 지도 | 경로 선 그림 (react-native-svg) | 네이버 지도 |

화면별 데이터

- 달리기 준비·달리는 중·결과·기록·기록 상세: 실제 기록
- 홈 5km 최고 기록, 기록 속의 나: 실제 5km 최고 기록. 없으면 예시 27:42
- 홈 날씨·코칭·순위, 친구 대결: 예시 데이터
- 기록 탭 '예시 기록': 예시 데이터

## 러닝 상태

```
idle -> acquiring(GPS 수신) -> ready(출발 가능) -> countdown(3·2·1) -> recording <-> paused
countdown -> ready (카운트다운 취소)
acquiring / ready -> idle (준비 화면 이탈 시 GPS 끔)
recording / paused -> 종료: 100m 미만이면 confirmDiscard, 아니면 finished
idle -> recoverable(미완료 세션) -> recording / idle
```

러닝 방식(`kind`): ghost(고스트), friend(대결), solo(자유), coaching(코칭). 기록과 함께 저장.

## GPS 모듈 인터페이스 (`core/contracts/recorder.ts`)

| 메서드 | 설명 | 현재 네이티브 모듈 |
| --- | --- | --- |
| `prepare()` | 위치만 수신 (거리·시간 미측정) | 없음. 측정을 미리 켜고 출발 시 재시작 |
| `start({ runId, autoPause })` | 기록 시작 | 인자 없는 `start()` |
| `subscribe(listener)` | 스냅샷·랩 이벤트 | 없음. 1초 폴링 |
| 스냅샷 `currentPaceSecPerKm`, `laps` | 현재 페이스, 1km 랩 | 없음 |
| `getPoints(runId)` | 원본 포인트 | 없음 |
| `getUnfinishedSession()` | 강제 종료 후 복구 | 없음 |
| 자동 일시정지 | `status: 'paused'`, `pauseReason: 'auto'` | 없음 |

원본 포인트는 종료 후 `getPoints`로 받아 앱이 로컬 DB에 저장하는 구조.

## 서버 인터페이스 (`core/contracts/backend.ts`)

- `upsert_run(run, laps, route)`: 요약·랩·경로 한 번에 업서트, `run.id`(UUID v7) 기준 멱등
- `route`: `[lng, lat]` 배열
- 삭제: `deletedAt` 채워서 업서트, `updatedAt` 최신만 반영
- 원본 포인트: `raw-points/{uid}/{runId}.json.gz`
- `kind`는 서버 `runs` 테이블에 칼럼 없음 (로컬에만 저장)

## 동기화

- 러닝 저장 직후 업로드 시도
- 실패 시 30s → 2m → 10m → 1h 간격 재시도
- 앱 실행·포그라운드·네트워크 재연결 시 재시도는 미구현 (netinfo 필요)

## 네이버 지도

`@mj-studio/react-native-naver-map` 2.11.0 기준.

- NCP Maps Client ID 필요
- app.json: `["@mj-studio/react-native-naver-map", { "client_id": "<키>" }]`
- 개발 빌드 필요 (Expo Go·웹 미지원)
- 경로: `NaverMapPathOverlay`, `coords: { latitude, longitude }[]`

## TODO

- op-sqlite 저장소 (개발 빌드 전환)
- 네이버 지도
- 동기화 재시도 트리거
- 네이티브 `interrupted` 상태 처리
- Hermes `crypto.getRandomValues` 확인 (`core/id.ts`)
- 칼로리 계산
