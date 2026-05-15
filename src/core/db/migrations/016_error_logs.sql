CREATE TABLE IF NOT EXISTS error_logs (
  id TEXT PRIMARY KEY,
  level TEXT NOT NULL CHECK (level IN ('info', 'warn', 'error', 'debug')),
  message TEXT NOT NULL,
  context TEXT,
  stack TEXT,
  metadata_json TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_error_logs_created_at
  ON error_logs(created_at DESC);
