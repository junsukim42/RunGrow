// expo-sqlite 로컬 스키마. 바꿀 때는 버전을 올리고 sqliteDb.ts의 migrate에 단계를 추가한다.
export const LOCAL_SCHEMA_VERSION = 1;

export const LOCAL_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS runs (
  id               TEXT PRIMARY KEY,
  started_at       TEXT NOT NULL,
  ended_at         TEXT NOT NULL,
  moving_sec       INTEGER NOT NULL,
  distance_m       INTEGER NOT NULL,
  avg_pace_sec_km  INTEGER NOT NULL,
  calories         INTEGER,
  route_json       TEXT NOT NULL,          -- [[lng, lat], ...]
  raw_points_path  TEXT,
  source           TEXT NOT NULL,
  kind             TEXT NOT NULL DEFAULT 'solo',  -- ghost | friend | solo | coaching
  updated_at       TEXT NOT NULL,
  deleted_at       TEXT,
  sync_status      TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'failed')),
  summary_synced   INTEGER NOT NULL DEFAULT 0,
  sync_attempts    INTEGER NOT NULL DEFAULT 0,
  next_sync_at     INTEGER,
  last_sync_error  TEXT
);
CREATE INDEX IF NOT EXISTS runs_started ON runs (started_at DESC);
CREATE INDEX IF NOT EXISTS runs_sync ON runs (sync_status, next_sync_at);

CREATE TABLE IF NOT EXISTS run_laps (
  run_id       TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  lap_no       INTEGER NOT NULL,
  distance_m   INTEGER NOT NULL,
  duration_sec INTEGER NOT NULL,
  PRIMARY KEY (run_id, lap_no)
);

CREATE TABLE IF NOT EXISTS points (
  run_id   TEXT NOT NULL,
  t        INTEGER NOT NULL,
  lat      REAL NOT NULL,
  lng      REAL NOT NULL,
  acc      REAL NOT NULL,
  alt      REAL,
  speed    REAL,
  accepted INTEGER NOT NULL,
  PRIMARY KEY (run_id, t)
);

-- 기록 중인 세션 체크포인트(한 줄). 앱이 강제 종료돼도 복구할 수 있게 주기적으로 저장한다.
CREATE TABLE IF NOT EXISTS active_session (
  id            INTEGER PRIMARY KEY CHECK (id = 1),
  run_id        TEXT NOT NULL,
  started_at    INTEGER NOT NULL,
  kind          TEXT NOT NULL,
  snapshot_json TEXT NOT NULL,
  updated_at    INTEGER NOT NULL
);
`;
