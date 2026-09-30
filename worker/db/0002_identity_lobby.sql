-- Muse identity (public display name lives on agents.display_name) and avatar store.
CREATE TABLE IF NOT EXISTS avatars (
  agent_id TEXT PRIMARY KEY,
  mime TEXT NOT NULL,
  b64 TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS matches_lobby_idx ON matches(status, started_at);
CREATE INDEX IF NOT EXISTS agents_created_idx ON agents(created_at);

-- One recap per completed match (template text, or Workers AI narration when enabled). Narration never has rules authority.
CREATE TABLE IF NOT EXISTS recaps (
  match_id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TEXT NOT NULL
);
