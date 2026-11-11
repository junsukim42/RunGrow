# 러닝 앱 기술 명세서

## 실행 가능한 모바일 UI 프로토타입

`mobile/`에 React Native + Expo로 구현한 **러닝앱** UI 앱이 있습니다. 홈·기록·달리기 준비·순위·내 정보와 코칭·코스·러닝·결과·친구 대결 화면을 눌러볼 수 있습니다.

저장소 루트에서 실행합니다.

```powershell
cd mobile
npm install
npm start
```

PC와 휴대폰을 같은 Wi-Fi에 연결한 뒤 Expo Go로 QR 코드를 스캔합니다. 브라우저 미리보기는 `npm run web`입니다.

현재 구현 범위는 **UI와 데모 상호작용**입니다. GPS·로그인·서버·건강 앱 연동은 아래 기술 명세의 후속 구현 범위이며, 현재 앱에는 연결하지 않았습니다.

- [앱 실행·검사 안내](mobile/README.md)
- [앱 화면 미리보기](mobile/preview.jpg)
- [Figma 디자인](https://www.figma.com/design/SC7ueYJZe8l1A0pMsW0qTP)

---

https://claude.ai/artifact/6owKePof1t67SM1GKqXq2M
Nov 3, 2026 · @wnstn

## 개요와 범위

캡스톤 디자인 프로젝트로 만드는 iOS·Android 러닝 앱 MVP의 기술 명세다. 스토어 출시와 위치정보사업자 신고는 범위에서 빼고, 실기기 시연과 사용자 테스트까지를 목표로 한다. GPS로 달리기를 기록하고, 실시간 거리·페이스를 보여주며, 기록을 서버와 건강 앱에 저장한다. 수치·인원·일정은 모두 제안값이며 팀 상황에 맞춰 확정한다.

**MVP 범위**

- GPS 러닝 기록: 시작·일시정지·재개·종료, 화면 꺼짐 상태에서도 기록 유지
- 실시간 지표: 거리, 경과 시간, 현재·평균 페이스, 1 km 구간 랩
- 음성 안내: 1 km마다 거리·페이스 알림
- 기록 화면: 경로 지도, 구간별 페이스 그래프, 히스토리 목록, 주간·월간 통계
- 계정: 이메일·Apple·Google 로그인, 오프라인 기록 후 자동 동기화
- 건강 앱 연동: Apple 건강(HealthKit), Health Connect에 운동 기록 쓰기

**MVP 제외 (다음 단계)**

- 소셜 피드, 친구, 챌린지
- 트레이닝 플랜·코칭
- 워치 단독 앱(Apple Watch, Wear OS)
- 심박 기반 지표(심박 존 등)

## 기술 스택

앱은 React Native(TypeScript) 하나로 iOS·Android를 만들되, 정확도와 배터리가 걸린 GPS 수집만 네이티브 모듈로 직접 짠다. 백엔드는 Supabase 하나로 DB·로그인·파일 저장·서버 함수를 해결해 서버를 직접 운영하지 않는다. Supabase 무료 플랜은 일정 기간 사용이 없으면 프로젝트가 일시정지되므로 시연 전에 상태를 확인한다.

| 레이어 | 선택 | 이유 |
| --- | --- | --- |
| 앱 프레임워크 | React Native 0.7x, TypeScript, Expo dev client | 한 코드베이스로 양 플랫폼, OTA 업데이트 가능 |
| GPS 수집 | 네이티브 모듈: iOS Swift(CoreLocation), Android Kotlin(FusedLocationProvider + Foreground Service) | 백그라운드 기록 안정성, 배터리 제어를 OS API로 직접 |
| 상태 관리 | Zustand(앱 상태), TanStack Query(서버 상태) | 러닝 세션 상태와 서버 캐시 분리 |
| 로컬 DB | SQLite(op-sqlite) | 오프라인 기록 저장, 좌표 수만 개 단위 빠른 쓰기 |
| 지도 | 네이버 지도 SDK | 국내 지도 품질·한글 지명 |
| 음성 안내 | iOS AVSpeechSynthesizer, Android TextToSpeech | 백그라운드 재생, 음악 위로 덕킹 |
| 차트 | Victory Native(Skia) | 구간 페이스 그래프 60 fps |
| 백엔드 | Supabase(호스티드) | DB·인증·파일·서버 함수를 한 서비스로, 인프라 셋업 거의 없음 |
| DB | Supabase Postgres + PostGIS 확장, RLS | 경로 공간 데이터 저장, 행 단위 권한으로 본인 데이터만 접근 |
| 인증 | Supabase Auth(이메일, Google). Apple 로그인은 여유 있을 때 추가 | 토큰 발급·갱신 기본 제공 |
| 파일 저장 | Supabase Storage(원본 GPS 포인트 gzip) | DB에는 요약·간소화 경로만 보관 |
| 서버 로직 | Postgres 함수(RPC), Supabase Edge Functions(TypeScript) | 멱등 업서트, 원본 후처리, 통계 집계 |
| 클라이언트 SDK | supabase-js(세션은 Expo SecureStore에 저장) | 앱에서 DB·Storage를 바로 호출, 별도 API 서버 불필요 |
| 관측 | Sentry(앱), Supabase 대시보드 로그 | 크래시·GPS 이상 추적 |
| CI/CD | GitHub Actions, EAS Build, Supabase CLI(마이그레이션) | 테스트 빌드 배포, 스키마 변경 이력 관리 |

## 아키텍처

&#91;embedded content: 시스템 아키텍처 · 외부 3, 앱 4, 백엔드 4\]

러닝 중에는 위치 모듈 → RN 앱 → 로컬 SQLite만 돌고, 동기화 큐가 종료 후 요약은 Postgres로(RPC 업서트), 원본 포인트는 Storage로 직접 올린다. 로그인 토큰은 Auth가 발급하고, Postgres는 RLS로 요청자를 식별한다. 원본 후처리와 통계 집계는 Edge Functions가 맡는다.

## 러닝 기록 엔진

러닝 기록은 전부 기기 안에서 끝난다. 서버는 종료 후 결과만 받으므로 네트워크가 없어도 기록·지표는 정상 동작한다.

**수집**

- 요청 정밀도: iOS `kCLLocationAccuracyBest`, `activityType = .fitness`, `distanceFilter = 3 m`. Android `PRIORITY_HIGH_ACCURACY`, 1초 간격.
- 백그라운드: iOS Background Modes(location) + `allowsBackgroundLocationUpdates`. Android Foreground Service(`foregroundServiceType=location`) + 상시 알림.
- 수집 포인트는 즉시 SQLite에 append. 앱이 강제 종료돼도 다음 실행 시 마지막 세션을 복구한다.

**필터링**

1. 수평 정확도 20 m 초과 포인트 버림
2. 직전 포인트 대비 속도 12 m/s(약 43 km/h) 초과면 튐으로 판정해 버림
3. 칼만 필터로 위치 평활화 후 거리 계산
4. 일시정지 중 포인트는 저장하되 거리 합산에서 제외

**지표 계산**

- 거리: 연속 포인트 간 Haversine 거리 합
- 현재 페이스: 최근 30초 이동 거리 기준(초/km). 15초 동안 이동 5 m 미만이면 "--" 표시
- 평균 페이스: 이동 시간 ÷ 거리(일시정지 시간 제외)
- 랩: 누적 거리가 1 km 배수를 넘는 순간 보간으로 정확한 랩 시각 계산
- 자동 일시정지(옵션): 10초간 속도 0.5 m/s 미만이면 일시정지

**종료 후 처리**

- 경로 간소화: Douglas-Peucker(허용 오차 3 m)로 지도 표시용 폴리라인 생성
- 원본 포인트는 gzip 압축해 업로드 큐에 넣고, 요약(거리·시간·페이스·랩)은 즉시 서버로 전송

## 러닝 세션 상태 머신

&#91;embedded content: 러닝 세션 상태 머신 · 상태 6개\]

- 일시정지는 수동(버튼)과 자동(10초간 0.5 m/s 미만) 둘 다 같은 상태로 들어간다.
- 앱이 기록 중에 강제 종료되면 다음 실행 때 미완료 세션을 찾아 복구 화면을 띄우고, 사용자가 이어가기를 고르면 기록 중으로 돌아간다.
- 종료 시 이동 거리가 100 m 미만이면 저장 전에 폐기 여부를 묻는다.
- 상태는 네이티브 모듈과 RN 양쪽이 공유하며, 기준은 네이티브 쪽(백그라운드에서도 살아 있음)이다.

## 데이터 모델

사용자 계정은 Supabase Auth의 `auth.users`가 갖고, 우리 테이블은 프로필, 러닝 요약, 랩, 통계 집계 네 개다. 원본 GPS 포인트는 DB가 아니라 Storage에 둔다. 모든 테이블에 RLS를 켜서 본인 행만 읽고 쓸 수 있게 한다.

```sql
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname   text NOT NULL,
  unit       text NOT NULL DEFAULT 'km',
  weight_kg  numeric(5,1),              -- 칼로리 계산용, 선택
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE runs (
  id               uuid PRIMARY KEY,    -- 기기에서 생성(UUID v7), 중복 업로드 방지
  user_id          uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  started_at       timestamptz NOT NULL,
  ended_at         timestamptz NOT NULL,
  moving_sec       int NOT NULL,
  distance_m       int NOT NULL,
  avg_pace_sec_km  int NOT NULL,
  calories         int,
  route            geography(LineString, 4326),  -- 간소화 경로
  raw_points_path  text,                -- Storage 경로, 업로드 완료 후 채움
  source           text NOT NULL,       -- 'ios' | 'android'
  updated_at       timestamptz NOT NULL DEFAULT now(),
  deleted_at       timestamptz
);
CREATE INDEX runs_user_started ON runs (user_id, started_at DESC);

CREATE TABLE run_laps (
  run_id       uuid REFERENCES runs(id) ON DELETE CASCADE,
  lap_no       int,
  distance_m   int NOT NULL,
  duration_sec int NOT NULL,
  PRIMARY KEY (run_id, lap_no)
);

CREATE TABLE weekly_stats (
  user_id    uuid REFERENCES profiles(id) ON DELETE CASCADE,
  week_start date,
  run_count  int NOT NULL,
  distance_m int NOT NULL,
  moving_sec int NOT NULL,
  PRIMARY KEY (user_id, week_start)
);

-- RLS: 본인 데이터만
ALTER TABLE runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_runs ON runs
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
-- profiles, run_laps(runs 조인), weekly_stats(읽기 전용)도 같은 방식
```

앱 로컬 SQLite는 위 `runs`·`run_laps`와 같은 구조에 `sync_status`('pending' | 'synced' | 'failed') 컬럼과, 세션 중 원본 포인트를 쌓는 `points(run_id, t, lat, lng, acc, alt, speed)` 테이블을 더 둔다.

## 데이터 접근과 동기화

별도 API 서버 없이 앱이 supabase-js로 DB·Storage를 직접 호출한다. 권한은 RLS가 막고, 여러 테이블을 한 번에 써야 하는 러닝 업로드만 Postgres 함수(RPC)로 묶는다. 러닝 업로드는 기기가 만든 `run.id`로 멱등 처리해 재전송해도 중복이 생기지 않는다.

| 작업 | 호출 | 비고 |
| --- | --- | --- |
| 로그인 | `auth.signInWithPassword`, `auth.signInWithIdToken({ provider: 'google' })` | 세션 자동 갱신 |
| 프로필 | `from('profiles').select()` / `.update()` | 단위·체중 수정 |
| 러닝 업로드 | `rpc('upsert_run', { run, laps, route })` | 요약·랩·경로를 한 트랜잭션으로 멱등 업서트 |
| 원본 업로드 | `storage.from('raw-points').upload('{uid}/{runId}.json.gz', file, { upsert: true })` | Storage 정책으로 본인 폴더만 쓰기 |
| 원본 후처리 | Storage 업로드 → Database Webhook → Edge Function `process-raw` | `raw_points_path` 기록, 통계 갱신 |
| 히스토리 | `from('runs').select().is('deleted_at', null).order('started_at', { ascending: false }).lt('started_at', cursor).limit(20)` | 커서 페이지네이션 |
| 상세 | `from('runs').select('*, run_laps(*)').eq('id', runId)` | 요약, 랩, 경로 |
| 삭제 | `from('runs').update({ deleted_at: now })` | 소프트 삭제 |
| 통계 | `from('weekly_stats').select()`, `rpc('monthly_stats', { from })` | 주간은 테이블, 월간은 함수 |
| 변경분 | `from('runs').select().gt('updated_at', since)` | 다른 기기에서 생긴 변경 내려받기 |

**동기화 규칙**

1. 러닝 종료 즉시 로컬에 `sync_status = 'pending'`으로 저장
2. 네트워크 연결 시 `rpc('upsert_run')` → 성공하면 원본 포인트를 Storage에 업로드
3. 실패 시 지수 백오프(30 s, 2 m, 10 m, 1 h) 재시도, 앱 실행·포그라운드 진입 때도 재시도
4. 충돌 정책: 러닝 기록은 생성 기기가 소유. `upsert_run`은 같은 id면 최신 `updated_at`만 반영(삭제가 우선)

## 외부 연동

건강 앱에는 쓰기만 하고 읽기는 MVP에서 하지 않는다. 권한은 첫 러닝 종료 직후에 요청해 거절률을 낮춘다.

| 대상 | 방식 | 쓰는 데이터 | 비고 |
| --- | --- | --- | --- |
| Apple 건강 | HealthKit, `HKWorkoutBuilder` | 운동(달리기), 거리, 활동 칼로리, 경로(`HKWorkoutRoute`) | 개발자 계정으로 실기기 테스트 가능 |
| Health Connect | `ExerciseSessionRecord`, `DistanceRecord`, `ExerciseRoute` | 같은 항목 | Android 14 미만은 Health Connect 앱 설치 필요 |
| 지도 | 네이버 지도 SDK | 경로 폴리라인 표시, 지도 스냅샷(공유 이미지) | 월 호출량 과금 확인 필요 |
| 워치(P1) | Apple Watch: WatchConnectivity로 실시간 지표 미러링 | 거리·페이스 표시만 | 워치 단독 기록은 MVP 제외 |

연동 실패는 러닝 저장에 영향을 주지 않는다. 실패 건은 로컬에 표시하고 설정 화면에서 수동 재시도할 수 있게 한다.

## 비기능 요구사항

기준 기기는 iPhone 12, Galaxy S21급 이상이며 수치는 출시 전 실측 후 확정할 목표안이다.

| 항목 | 목표 |
| --- | --- |
| 배터리 소모 | 1시간 러닝 시 화면 꺼짐 기준 10% 이하 |
| 거리 정확도 | 표준 400 m 트랙 10바퀴 기준 오차 ±2% 이내 |
| 첫 GPS 고정 | 시작 버튼 후 정확도 20 m 이내 도달까지 p75 10 s 이하 |
| 백그라운드 생존 | 화면 꺼짐 2시간 러닝 중 기록 끊김 0건(테스트 기기 전부) |
| 크래시 | 크래시 없는 세션 비율 99.5% 이상 |
| 앱 실행 | 콜드 스타트 p75 2 s 이하 |
| API 응답 | p95 300 ms 이하(업로드 제외) |
| 데이터 유실 | 강제 종료·배터리 방전 시 마지막 10초 이전 포인트 보존 |

**보안·개인정보**

- 위치정보는 위치정보법상 개인위치정보에 해당: 출시하지 않으므로 사업자 신고는 하지 않되, 사용자 테스트 참여자에게 위치정보 수집·이용 동의서를 받는다
- 전송 TLS 1.2+, DB·Storage 저장 시 암호화(Supabase 기본 제공), 모든 테이블 RLS 필수(AES-256)
- 시작·종료 지점 프라이버시 존: 공유 이미지에서 집 근처 200 m 경로 가림(옵션)
- 회원 탈퇴 시 30일 내 러닝·원본 포인트 영구 삭제
- 토큰은 iOS Keychain, Android Keystore(EncryptedSharedPreferences)에 저장

## 역할 분담과 일정

4명이 10주 안에 시연 가능한 완성본까지 간다. 코드 작성·테스트·리뷰는 Claude를 적극 활용해 구현 기간을 줄이고, 줄일 수 없는 실외 테스트와 사용자 테스트에 시간을 남긴다. 인원이 적어서 각자 두 영역씩 겸하고, 실외 러닝 테스트는 4명 모두 돌아가며 맡는다.

| 담당 | 맡는 영역 | 세부 범위 | 주요 산출물 |
| --- | --- | --- | --- |
| 1. 앱 리드 | RN 앱 + PM | 앱 화면, 상태 관리, 로컬 DB, 동기화 큐, 지도·차트, 음성 안내 / 범위·우선순위 | 앱 본체 |
| 2. 네이티브 | iOS + Android 네이티브 모듈 | CoreLocation·Foreground Service 위치 모듈, 기록 엔진(필터링·랩), 제조사별 배터리 최적화 대응 | 네이티브 모듈 2종, 기록 엔진 |
| 3. 백엔드 | Supabase 백엔드 | Supabase 설정(DB·PostGIS·RLS·Auth·Storage), Postgres 함수·Edge Functions(업서트·후처리·통계), CI/CD, HealthKit·Health Connect 연동(5주차\~) | DB 스키마·마이그레이션, Edge Functions |
| 4. 디자인·QA | 디자인 + 테스트 | 러닝 중 화면(큰 숫자·한 손 조작), 기록·통계 화면, 테스트 계획, 기기 매트릭스, 회귀 테스트 | 화면 시안, 테스트 리포트 |

**일정(제안)**

1. 1주: 설계 확정, GPS 네이티브 모듈 프로토타입(2), 화면 구조 시안(4), 실외 정확도·배터리 1차 측정(전원)
2. 2–4주: 기록 엔진 완성(2), Supabase 스키마·Auth·RLS 구축(3), 러닝 중 화면(1·4)
3. 5–6주: 기록·통계 화면(1·4), 동기화(1·3), 건강 앱 연동(3), 음성 안내(1), 기록 엔진 정확도 튜닝(2)
4. 7주: 통합 테스트, 백그라운드 기기 테스트(4 주도, 전원), 성능 튜닝
5. 8–9주: 사용자 테스트(팀원·지인 러너 대상, TestFlight·내부 테스트 트랙 배포), 버그 수정
6. 10주: 최종 시연 준비, 데모 영상, 발표 자료·결과 보고서

**Claude 활용 범위**

| 작업 | Claude가 맡는 부분 | 사람이 꼭 하는 부분 |
| --- | --- | --- |
| 앱·서버 코드 | 화면 컴포넌트, DB 함수·RLS 정책, 마이그레이션, 보일러플레이트 초안 | 구조 결정, 리뷰, 머지 |
| 네이티브 모듈 | CoreLocation·Foreground Service 코드 초안, 필터링·랩 계산 로직 | 실기기 동작 확인, 배터리 튜닝 |
| 테스트 | 단위 테스트, GPS 로그 재생 테스트 하네스, E2E 시나리오 작성 | 실외 러닝 실측, 기기별 백그라운드 확인 |
| 리뷰·문서 | PR 코드 리뷰, API 문서, 발표 자료·결과 보고서 초안 | 내용 검증, 최종 승인 |

Claude로 줄어드는 건 구현 시간이고, 실외 테스트(날씨·실제 거리)는 줄지 않는다. 일정이 밀리면 음성 안내와 월간 통계를 시연 범위에서 빼는 것을 1순위 컷으로 둔다. 7주차까지 기능 동결을 지켜 사용자 테스트 2주를 확보한다. 테스트 기기는 팀원 보유 기기 위주로 쓰고, 부족하면 클라우드 기기팜을 검토한다.

## 테스트 계획과 오픈 이슈

| 종류 | 대상 | 통과 기준 |
| --- | --- | --- |
| 단위 | 필터링, 거리·페이스·랩 계산, 동기화 큐 | 녹화된 GPS 로그 재생 시 기대값과 일치 |
| GPS 로그 재생 | 실제 러닝 로그 30종(도심·공원·트랙·터널) | 거리 오차 ±2%, 튐 제거 확인 |
| 실외 실측 | 400 m 트랙, 하프 코스 | 비기능 요구사항 정확도·배터리 목표 충족 |
| 백그라운드 | 팀원 보유 기기 전부(iOS·Android 각 2종 이상), 화면 꺼짐 2시간 | 기록 끊김 0건 |
| 오프라인 | 비행기 모드 러닝 후 복귀 | 자동 업로드, 중복 0건 |
| E2E | 가입 → 러닝 → 저장 → 히스토리 → 통계 | Detox(앱), pgTAP(RLS·DB 함수) 통과 |

**오픈 이슈**

- [ ] 지도: 네이버 지도로 갈지, 해외 확장 고려해 처음부터 Mapbox로 갈지
- [ ] 칼로리 계산식(MET 기반) 채택 여부와 체중 미입력 시 처리
- [ ] 공유 기능(경로 이미지)을 MVP에 넣을지
- [ ] 원본 GPS 포인트 보관 기간(영구 vs 1년)
- [ ] 워치 미러링을 P1에서 MVP로 올릴지
