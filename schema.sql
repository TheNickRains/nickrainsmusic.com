CREATE TABLE IF NOT EXISTS requests (
  id TEXT PRIMARY KEY,
  song TEXT NOT NULL,
  artist TEXT DEFAULT '',
  name TEXT DEFAULT '',
  status TEXT DEFAULT 'queued',
  paid INTEGER DEFAULT 0,
  amount_cents INTEGER DEFAULT 0,
  ip TEXT DEFAULT '',
  created_at INTEGER NOT NULL,
  played_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_requests_status_order
  ON requests (status, paid, amount_cents, created_at);

CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY,
  song TEXT NOT NULL,
  artist TEXT DEFAULT '',
  goal_cents INTEGER NOT NULL,
  current_cents INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1,
  unlocked INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  unlocked_at INTEGER
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tips (
  id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL,
  amount_cents INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tips_device ON tips (device_id, created_at);

CREATE TABLE IF NOT EXISTS tickets (
  ticket_id TEXT PRIMARY KEY,
  show_id TEXT NOT NULL,
  buyer_email TEXT DEFAULT '',
  buyer_name TEXT DEFAULT '',
  stripe_session_id TEXT DEFAULT '',
  used INTEGER DEFAULT 0,
  used_at INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tickets_show ON tickets (show_id, used);
CREATE INDEX IF NOT EXISTS idx_tickets_session ON tickets (stripe_session_id);

CREATE TABLE IF NOT EXISTS fans (
  id TEXT PRIMARY KEY,
  first_name TEXT DEFAULT '',
  last_name TEXT DEFAULT '',
  email TEXT NOT NULL UNIQUE,
  phone TEXT DEFAULT '',
  phone_opt_in INTEGER DEFAULT 0,
  geo_opt_in INTEGER DEFAULT 0,
  zip TEXT DEFAULT '',
  source TEXT DEFAULT 'Website',
  device_id TEXT DEFAULT '',
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_fans_zip ON fans (zip);
