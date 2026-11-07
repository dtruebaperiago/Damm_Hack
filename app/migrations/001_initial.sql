PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS migrations(version INTEGER PRIMARY KEY);
CREATE TABLE IF NOT EXISTS historical_calibrations(id TEXT PRIMARY KEY, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS waves(
  id TEXT PRIMARY KEY, parent_id TEXT UNIQUE REFERENCES waves(id), cycle TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'draft', version INTEGER NOT NULL DEFAULT 1,
  config TEXT NOT NULL, survey TEXT NOT NULL, approved_hash TEXT,
  form_id TEXT UNIQUE, form_url TEXT, publish_title TEXT, source TEXT NOT NULL,
  snapshot TEXT, proposals TEXT, selected_action TEXT, created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS revisions(wave_id TEXT REFERENCES waves(id), version INTEGER, survey TEXT, config TEXT, approved_hash TEXT, PRIMARY KEY(wave_id,version));
CREATE TABLE IF NOT EXISTS credentials(cycle TEXT, participant TEXT, shift TEXT NOT NULL, PRIMARY KEY(cycle,participant));
CREATE TABLE IF NOT EXISTS deliveries(
  token_hash TEXT PRIMARY KEY, wave_id TEXT NOT NULL REFERENCES waves(id), participant TEXT NOT NULL,
  shift TEXT NOT NULL, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, consumed INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS accepted(
  id INTEGER PRIMARY KEY, wave_id TEXT NOT NULL REFERENCES waves(id), form_id TEXT NOT NULL,
  external_id TEXT NOT NULL, source TEXT NOT NULL, answers TEXT NOT NULL, submitted_at INTEGER NOT NULL,
  UNIQUE(form_id,external_id)
);
CREATE TABLE IF NOT EXISTS response_links(
  wave_id TEXT REFERENCES waves(id), participant TEXT, response_id INTEGER UNIQUE REFERENCES accepted(id) ON DELETE CASCADE,
  shift TEXT NOT NULL, PRIMARY KEY(wave_id,participant)
);
CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY, expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS rate_limits(bucket TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL);
INSERT OR IGNORE INTO migrations VALUES(1);
