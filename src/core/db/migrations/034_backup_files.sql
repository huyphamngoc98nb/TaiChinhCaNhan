CREATE TABLE IF NOT EXISTS backup_files (
  id TEXT PRIMARY KEY,
  file_name TEXT NOT NULL,
  uri TEXT,
  path TEXT,
  kind TEXT NOT NULL CHECK (kind IN ('auto', 'manual')),
  platform TEXT NOT NULL,
  encrypted INTEGER NOT NULL DEFAULT 0 CHECK (encrypted IN (0, 1)),
  created_at INTEGER NOT NULL,
  deleted_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_backup_files_kind_created
ON backup_files(kind, created_at DESC)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_backup_files_deleted_at
ON backup_files(deleted_at);
