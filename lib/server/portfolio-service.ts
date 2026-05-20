import crypto from "crypto";
import type { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/server/db";

interface DbUser {
  id: string;
  username: string;
  password_hash: string;
  salt: string;
}

interface TransactionRow {
  id: string;
  skin_id: string | null;
  skin_name: string;
  skin_rarity: string | null;
  skin_rarity_color: string | null;
  skin_image: string | null;
  buy_price: number;
  marketplace: string | null;
  purchase_date: string;
  sale_price: number | null;
  sale_fee: number | null;
  sale_date: string | null;
  notes: string | null;
}

export interface PublicUser {
  id: string;
  username: string;
}

export function publicUser(user: Pick<DbUser, "id" | "username">): PublicUser {
  return {
    id: user.id,
    username: user.username,
  };
}

export async function getCurrentUser(req: NextRequest) {
  const sessionId = req.cookies.get("session_id")?.value;
  if (!sessionId) return null;

  const result = await query<PublicUser>(
    `SELECT users.id, users.username
     FROM sessions
     JOIN users ON users.id = sessions.user_id
     WHERE sessions.id = $1 AND sessions.expires_at > $2`,
    [sessionId, Date.now()],
  );

  return result.rows[0] ?? null;
}

export async function requireUser(req: NextRequest) {
  return getCurrentUser(req);
}

export async function registerUser(body: unknown) {
  const credentials = parseCredentials(body);

  if (credentials.username.length < 3 || credentials.password.length < 6) {
    throw new ServiceError("Use usuario com 3+ caracteres e senha com 6+ caracteres", 400);
  }

  const existing = await query<{ id: string }>("SELECT id FROM users WHERE username = $1", [
    credentials.username,
  ]);

  if (existing.rows[0]) {
    throw new ServiceError("Usuario ja existe", 409);
  }

  const id = crypto.randomUUID();
  const salt = crypto.randomBytes(16).toString("hex");
  const passwordHash = hashPassword(credentials.password, salt);

  await query(
    `INSERT INTO users (id, username, password_hash, salt, created_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [id, credentials.username, passwordHash, salt, new Date().toISOString()],
  );

  const user = { id, username: credentials.username };
  const sessionId = await createSession(user.id);

  return { user, sessionId };
}

export async function loginUser(body: unknown) {
  const credentials = parseCredentials(body);
  const result = await query<DbUser>("SELECT * FROM users WHERE username = $1", [
    credentials.username,
  ]);
  const user = result.rows[0];

  if (!user || hashPassword(credentials.password, user.salt) !== user.password_hash) {
    throw new ServiceError("Usuario ou senha invalidos", 401);
  }

  const sessionId = await createSession(user.id);
  return { user: publicUser(user), sessionId };
}

export async function logoutUser(req: NextRequest) {
  const sessionId = req.cookies.get("session_id")?.value;
  if (sessionId) {
    await query("DELETE FROM sessions WHERE id = $1", [sessionId]);
  }
}

export function setSessionCookie(res: NextResponse, sessionId: string) {
  res.cookies.set("session_id", sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set("session_id", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function listTransactions(userId: string) {
  const result = await query<TransactionRow>(
    `SELECT *
     FROM transactions
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId],
  );

  return result.rows.map(rowToTransaction);
}

export async function createTransaction(userId: string, body: unknown) {
  const transaction = normalizeTransactionBody(body);
  const id = crypto.randomUUID();

  await query(
    `INSERT INTO transactions (
      id, user_id, skin_id, skin_name, skin_rarity, skin_rarity_color, skin_image,
      buy_price, marketplace, purchase_date, notes, created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [
      id,
      userId,
      transaction.skinId,
      transaction.skinName,
      transaction.skinRarity,
      transaction.skinRarityColor,
      transaction.skinImage,
      transaction.buyPrice,
      transaction.marketplace,
      transaction.purchaseDate,
      transaction.notes,
      new Date().toISOString(),
    ],
  );

  return getTransaction(userId, id);
}

export async function updateTransaction(userId: string, transactionId: string, body: unknown) {
  const transaction = normalizeTransactionBody(body);

  const result = await query(
    `UPDATE transactions
     SET skin_id = $1,
         skin_name = $2,
         skin_rarity = $3,
         skin_rarity_color = $4,
         skin_image = $5,
         buy_price = $6,
         marketplace = $7,
         purchase_date = $8,
         notes = $9
     WHERE id = $10 AND user_id = $11`,
    [
      transaction.skinId,
      transaction.skinName,
      transaction.skinRarity,
      transaction.skinRarityColor,
      transaction.skinImage,
      transaction.buyPrice,
      transaction.marketplace,
      transaction.purchaseDate,
      transaction.notes,
      transactionId,
      userId,
    ],
  );

  if (result.rowCount === 0) return null;
  return getTransaction(userId, transactionId);
}

export async function updateSale(userId: string, transactionId: string, body: unknown) {
  const sale = parseRecord(body);

  const result = await query(
    `UPDATE transactions
     SET sale_price = $1, sale_fee = $2, sale_date = $3
     WHERE id = $4 AND user_id = $5`,
    [
      Number(sale.salePrice) || 0,
      Number(sale.saleFee) || 0,
      String(sale.saleDate || new Date().toISOString().slice(0, 10)),
      transactionId,
      userId,
    ],
  );

  if (result.rowCount === 0) return null;
  return getTransaction(userId, transactionId);
}

export async function deleteTransaction(userId: string, transactionId: string) {
  await query("DELETE FROM transactions WHERE id = $1 AND user_id = $2", [transactionId, userId]);
}

export class ServiceError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

async function createSession(userId: string) {
  const id = crypto.randomUUID();
  const maxAgeSeconds = 60 * 60 * 24 * 30;
  const expiresAt = Date.now() + maxAgeSeconds * 1000;

  await query(
    `INSERT INTO sessions (id, user_id, expires_at, created_at)
     VALUES ($1, $2, $3, $4)`,
    [id, userId, expiresAt, new Date().toISOString()],
  );

  return id;
}

async function getTransaction(userId: string, transactionId: string) {
  const result = await query<TransactionRow>(
    "SELECT * FROM transactions WHERE id = $1 AND user_id = $2",
    [transactionId, userId],
  );

  const row = result.rows[0];
  return row ? rowToTransaction(row) : null;
}

function normalizeTransactionBody(body: unknown) {
  const data = parseRecord(body);
  const skinName = String(data.skinName ?? "").trim();

  if (!skinName) {
    throw new ServiceError("Nome da skin e obrigatorio", 400);
  }

  return {
    skinId: String(data.skinId ?? ""),
    skinName,
    skinRarity: String(data.skinRarity ?? ""),
    skinRarityColor: String(data.skinRarityColor ?? ""),
    skinImage: String(data.skinImage ?? ""),
    buyPrice: Number(data.buyPrice) || 0,
    marketplace: String(data.marketplace ?? "").trim(),
    purchaseDate: String(data.purchaseDate || new Date().toISOString().slice(0, 10)),
    notes: String(data.notes ?? "").trim(),
  };
}

function rowToTransaction(row: TransactionRow) {
  return {
    id: row.id,
    skinId: row.skin_id ?? "",
    skinName: row.skin_name,
    skinRarity: row.skin_rarity ?? "",
    skinRarityColor: row.skin_rarity_color ?? "",
    skinImage: row.skin_image ?? "",
    buyPrice: Number(row.buy_price) || 0,
    marketplace: row.marketplace ?? "",
    purchaseDate: row.purchase_date,
    salePrice: row.sale_price,
    saleFee: row.sale_fee,
    saleDate: row.sale_date,
    notes: row.notes ?? "",
  };
}

function parseCredentials(body: unknown) {
  const data = parseRecord(body);

  return {
    username: String(data.username ?? "").trim(),
    password: String(data.password ?? ""),
  };
}

function parseRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function hashPassword(password: string, salt: string) {
  return crypto.pbkdf2Sync(password, salt, 120000, 64, "sha512").toString("hex");
}
