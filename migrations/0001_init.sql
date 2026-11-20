CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY NOT NULL,
  pubkey TEXT NOT NULL CHECK(length(pubkey) = 64),
  created_at INTEGER NOT NULL,
  kind INTEGER NOT NULL CHECK(kind IN (0,1,2,3)),
  tags TEXT NOT NULL DEFAULT '[]',
  content TEXT NOT NULL,
  sig TEXT NOT NULL CHECK(length(sig) = 128)
);
CREATE INDEX IF NOT EXISTS idx_events_kind_created ON events(kind, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_pubkey_kind_created ON events(pubkey, kind, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at DESC);