import Database from "better-sqlite3";
import path from "path";
import crypto from "crypto";

const DB_PATH = path.join(process.cwd(), "portfolio.sqlite");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    setupDatabase(db);
  }
  return db;
}

function setupDatabase(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

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
