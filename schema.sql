-- Cloudflare D1 / SQLite
CREATE TABLE IF NOT EXISTS reservations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  reservation_date TEXT NOT NULL,
  reservation_time TEXT NOT NULL,
  persons INTEGER NOT NULL CHECK (persons BETWEEN 1 AND 8),
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','cancelled','completed','no_show')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_reservations_date_time ON reservations(reservation_date, reservation_time);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
