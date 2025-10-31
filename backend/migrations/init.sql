CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  barcode TEXT NOT NULL,
  device_id TEXT,
  raw TEXT,
  timestamp TEXT NOT NULL
);
