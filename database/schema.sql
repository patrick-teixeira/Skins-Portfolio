CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skin_id TEXT,
  skin_name TEXT NOT NULL,
  skin_rarity TEXT,
  skin_rarity_color TEXT,
  skin_image TEXT,
  buy_price DOUBLE PRECISION NOT NULL DEFAULT 0,
  marketplace TEXT,
  purchase_date TEXT NOT NULL,
  sale_price DOUBLE PRECISION,
  sale_fee DOUBLE PRECISION,
  sale_date TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL
);
