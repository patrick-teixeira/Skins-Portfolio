import { Pool, type QueryResultRow } from "pg";

declare global {
  var postgresPool: Pool | undefined;
  var postgresReady: Promise<void> | undefined;
}

function createPool() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL nao configurada");
  }

  const useSsl = process.env.POSTGRES_SSL !== "false";

  return new Pool({
    connectionString: normalizeConnectionString(connectionString, useSsl),
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  });
}

function normalizeConnectionString(connectionString: string, useSsl: boolean) {
  if (!useSsl) return connectionString;

  try {
    const url = new URL(connectionString);

    // node-postgres can let sslmode from the URL override the explicit ssl object.
    // Keeping SSL controlled here avoids SELF_SIGNED_CERT_IN_CHAIN on hosted Postgres.
    url.searchParams.delete("sslmode");
    url.searchParams.delete("sslcert");
    url.searchParams.delete("sslkey");
    url.searchParams.delete("sslrootcert");

    return url.toString();
  } catch {
    return connectionString;
  }
}

export function getPool() {
  if (!globalThis.postgresPool) {
    globalThis.postgresPool = createPool();
  }

  return globalThis.postgresPool;
}

export async function setupDatabase() {
  if (!globalThis.postgresReady) {
    globalThis.postgresReady = getPool().query(`
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
    `).then(() => undefined);
  }

  return globalThis.postgresReady;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
) {
  await setupDatabase();
  return getPool().query<T>(text, params);
}
