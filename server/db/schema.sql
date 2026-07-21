-- Admin users
CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Guides
CREATE TABLE IF NOT EXISTS guides (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guide_id TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  title_ru TEXT NOT NULL,
  title_en TEXT,
  cipher_code TEXT NOT NULL UNIQUE,
  description_ru TEXT,
  description_en TEXT,
  sections_json TEXT DEFAULT '[]',
  order_index INTEGER DEFAULT 0,
  is_published INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Translations cache
CREATE TABLE IF NOT EXISTS translations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guide_id INTEGER REFERENCES guides(id) ON DELETE CASCADE,
  lang TEXT NOT NULL,
  source_field TEXT NOT NULL,
  source_text TEXT NOT NULL,
  translated_text TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(guide_id, lang, source_field)
);

-- Uploaded images
CREATE TABLE IF NOT EXISTS images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guide_id INTEGER REFERENCES guides(id) ON DELETE SET NULL,
  filename TEXT NOT NULL,
  original_name TEXT,
  mime_type TEXT,
  size_bytes INTEGER,
  storage_path TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Cloud storage files
CREATE TABLE IF NOT EXISTS cloud_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes INTEGER,
  storage_path TEXT NOT NULL,
  description TEXT DEFAULT '',
  download_count INTEGER DEFAULT 0,
  is_public INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- UI labels
CREATE TABLE IF NOT EXISTS ui_labels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT UNIQUE NOT NULL,
  value_ru TEXT NOT NULL,
  value_en TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Analytics
CREATE TABLE IF NOT EXISTS analytics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,
  guide_id INTEGER,
  visitor_ip TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Daily stats
CREATE TABLE IF NOT EXISTS daily_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  page_views INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,
  guide_opens INTEGER DEFAULT 0,
  cipher_attempts INTEGER DEFAULT 0,
  cipher_successes INTEGER DEFAULT 0,
  UNIQUE(date)
);

CREATE INDEX IF NOT EXISTS idx_guides_guide_id ON guides(guide_id);
CREATE INDEX IF NOT EXISTS idx_translations_guide ON translations(guide_id);
CREATE INDEX IF NOT EXISTS idx_images_guide ON images(guide_id);
CREATE INDEX IF NOT EXISTS idx_analytics_date ON analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_stats(date);
