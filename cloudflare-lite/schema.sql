PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'USER',
  status TEXT NOT NULL DEFAULT 'PENDING',
  display_name TEXT NOT NULL,
  slogan TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  battle_tag TEXT,
  main_role TEXT,
  main_heroes TEXT NOT NULL DEFAULT '[]',
  rank TEXT,
  online_time TEXT,
  contact TEXT,
  extra_note TEXT,
  review_status TEXT NOT NULL DEFAULT 'PENDING',
  review_note TEXT,
  auto_review TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'FUN',
  start_time TEXT NOT NULL,
  signup_deadline TEXT,
  max_participants INTEGER NOT NULL,
  requirements TEXT,
  voice_channel TEXT,
  status TEXT NOT NULL DEFAULT 'OPEN',
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS events_status_start_idx ON events(status, start_time);

CREATE TABLE IF NOT EXISTS registrations (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  preferred_role TEXT,
  rank TEXT,
  heroes TEXT NOT NULL DEFAULT '[]',
  voice_available INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',
  reviewed_by TEXT,
  reviewed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(event_id, user_id)
);

CREATE INDEX IF NOT EXISTS registrations_event_idx ON registrations(event_id);
CREATE INDEX IF NOT EXISTS registrations_user_idx ON registrations(user_id);
CREATE INDEX IF NOT EXISTS registrations_status_idx ON registrations(status);
