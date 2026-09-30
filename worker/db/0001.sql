PRAGMA foreign_keys = ON;

CREATE TABLE agents (
  agent_id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE'
);

CREATE TABLE masks (
  mask_id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  profile_version INTEGER NOT NULL,
  compiler_version TEXT NOT NULL,
  ruleset_version TEXT NOT NULL,
  profile_hash TEXT NOT NULL,
  public_profile_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY(agent_id) REFERENCES agents(agent_id)
);

CREATE INDEX masks_agent_idx ON masks(agent_id);

CREATE TABLE matches (
  match_id TEXT PRIMARY KEY,
  ruleset_version TEXT NOT NULL,
  mode TEXT NOT NULL,
  status TEXT NOT NULL,
  agent_a TEXT,
  agent_b TEXT,
  mask_a TEXT,
  mask_b TEXT,
  started_at TEXT,
  completed_at TEXT,
  rounds INTEGER,
  winner_agent_id TEXT,
  terminal_reason TEXT,
  replay_root_hash TEXT
);

CREATE INDEX matches_status_idx ON matches(status);
CREATE INDEX matches_agents_idx ON matches(agent_a, agent_b);

CREATE TABLE ratings (
  subject_type TEXT NOT NULL, -- AGENT or MODEL
  subject_id TEXT NOT NULL,
  ruleset_version TEXT NOT NULL,
  season_id TEXT NOT NULL,
  rating REAL NOT NULL,
  rd REAL NOT NULL,
  volatility REAL NOT NULL,
  games INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  PRIMARY KEY(subject_type, subject_id, ruleset_version, season_id)
);

CREATE TABLE model_registry (
  model_id TEXT NOT NULL,
  route TEXT NOT NULL,
  model_version TEXT NOT NULL,
  ruleset_version TEXT NOT NULL,
  status TEXT NOT NULL,
  metrics_json TEXT NOT NULL,
  pricing_json TEXT NOT NULL,
  last_benchmarked TEXT,
  PRIMARY KEY(model_id, route, model_version, ruleset_version)
);

CREATE TABLE eval_jobs (
  eval_job_id TEXT PRIMARY KEY,
  ruleset_version TEXT NOT NULL,
  model_id TEXT NOT NULL,
  route TEXT NOT NULL,
  stage TEXT NOT NULL,
  status TEXT NOT NULL,
  requested_at TEXT NOT NULL,
  completed_at TEXT,
  budget_calls INTEGER NOT NULL,
  result_json TEXT
);

CREATE TABLE balance_daily (
  date TEXT NOT NULL,
  ruleset_version TEXT NOT NULL,
  metric_key TEXT NOT NULL,
  segment_key TEXT NOT NULL,
  metric_value REAL NOT NULL,
  sample_count INTEGER NOT NULL,
  PRIMARY KEY(date, ruleset_version, metric_key, segment_key)
);

CREATE TABLE request_limits(key TEXT NOT NULL, minute INTEGER NOT NULL,count INTEGER NOT NULL,PRIMARY KEY(key,minute));
