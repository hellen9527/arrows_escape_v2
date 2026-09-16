CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY,
  feeling TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  context_json TEXT NOT NULL,
  version TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS feedback_created_at ON feedback(created_at);
