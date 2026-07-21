CREATE TABLE IF NOT EXISTS bookmarks (
  device_id    TEXT NOT NULL,
  surah_id     INTEGER NOT NULL CHECK(surah_id BETWEEN 1 AND 114),
  ayah_number  INTEGER NOT NULL CHECK(ayah_number > 0),
  created_at   TEXT DEFAULT (datetime('now')),
  UNIQUE(device_id, surah_id, ayah_number)
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_device ON bookmarks(device_id);

CREATE TABLE IF NOT EXISTS reading_progress (
  device_id         TEXT NOT NULL,
  surah_id          INTEGER NOT NULL CHECK(surah_id BETWEEN 1 AND 114),
  last_ayah_number  INTEGER NOT NULL CHECK(last_ayah_number > 0),
  updated_at        TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (device_id, surah_id)
);
