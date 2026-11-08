CREATE TABLE IF NOT EXISTS escolta.wave_analysis(
  wave_id TEXT PRIMARY KEY REFERENCES escolta.waves(id),
  revision INTEGER NOT NULL CHECK (revision > 0),
  data JSONB NOT NULL
);
ALTER TABLE escolta.wave_analysis ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE escolta.wave_analysis FROM PUBLIC;
