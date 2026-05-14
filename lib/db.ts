import initSqlJs, { Database as SqlJsDatabase } from "sql.js";
import crypto from "crypto";

let db: SqlJsDatabase | null = null;
let initPromise: Promise<SqlJsDatabase> | null = null;

async function initDb(): Promise<SqlJsDatabase> {
  // Use dynamic import to ensure proper loading in serverless environment
  const SQL = await initSqlJs({
    // Use jsdelivr CDN which is more reliable
    locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/sql.js@1.12.0/dist/${file}`,
  });

  const database = new SQL.Database();
  setupDatabase(database);
  return database;
}

export async function getDb(): Promise<SqlJsDatabase> {
  if (db) return db;

  if (!initPromise) {
    initPromise = initDb().catch((error) => {
      initPromise = null; // Reset on error to allow retry
      throw error;
    });
  }

  db = await initPromise;
  return db;
}

// No-op since we're using in-memory database
export function saveDb() {
  // In-memory database - no persistence needed in serverless environment
}

function setupDatabase(database: SqlJsDatabase) {
  database.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      skin_id TEXT,
      skin_name TEXT NOT NULL,
      skin_rarity TEXT,
      skin_rarity_color TEXT,
      skin_image TEXT,
      buy_price REAL NOT NULL DEFAULT 0,
      purchase_date TEXT NOT NULL,
      sale_price REAL,
      sale_fee REAL,
      sale_date TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
}

export function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 120000, 64, "sha512").toString("hex");
}

export function generateSalt(): string {
  return crypto.randomBytes(16).toString("hex");
}

export function rowToTransaction(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    skinId: row.skin_id as string,
    skinName: row.skin_name as string,
    skinRarity: row.skin_rarity as string,
    skinRarityColor: row.skin_rarity_color as string,
    skinImage: row.skin_image as string,
    buyPrice: row.buy_price as number,
    purchaseDate: row.purchase_date as string,
    salePrice: row.sale_price as number | null,
    saleFee: row.sale_fee as number | null,
    saleDate: row.sale_date as string | null,
    notes: row.notes as string,
  };
}

// Helper to run queries and get results as objects
export function queryAll(database: SqlJsDatabase, sql: string, params: unknown[] = []): Record<string, unknown>[] {
  const stmt = database.prepare(sql);
  stmt.bind(params);

  const results: Record<string, unknown>[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    results.push(row as Record<string, unknown>);
  }
  stmt.free();

  return results;
}

export function queryOne(database: SqlJsDatabase, sql: string, params: unknown[] = []): Record<string, unknown> | null {
  const results = queryAll(database, sql, params);
  return results.length > 0 ? results[0] : null;
}

export function runQuery(database: SqlJsDatabase, sql: string, params: unknown[] = []): void {
  database.run(sql, params);
}
