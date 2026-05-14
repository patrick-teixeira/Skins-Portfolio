import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import crypto from "crypto";
import { getDb, rowToTransaction, queryOne, queryAll, runQuery, saveDb } from "@/lib/db";

async function getCurrentUser() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("session_id")?.value;

  if (!sessionId) return null;

  const db = await getDb();
  const session = queryOne(
    db,
    `SELECT users.id, users.username
     FROM sessions
     JOIN users ON users.id = sessions.user_id
     WHERE sessions.id = ? AND sessions.expires_at > ?`,
    [sessionId, Date.now()]
  ) as { id: string; username: string } | null;

  return session;
}

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Login necessario" }, { status: 401 });
  }

  const db = await getDb();
  const rows = queryAll(
    db,
    `SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC`,
    [user.id]
  );

  return NextResponse.json(rows.map(rowToTransaction));
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Login necessario" }, { status: 401 });
  }

  try {
    const body = await request.json();

    const transactionId = crypto.randomUUID();
    const db = await getDb();

    runQuery(
      db,
      `INSERT INTO transactions (
        id, user_id, skin_id, skin_name, skin_rarity, skin_rarity_color, skin_image,
        buy_price, purchase_date, notes, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        transactionId,
        user.id,
        String(body.skinId ?? ""),
        String(body.skinName ?? "").trim(),
        String(body.skinRarity ?? ""),
        String(body.skinRarityColor ?? ""),
        String(body.skinImage ?? ""),
        Number(body.buyPrice) || 0,
        body.purchaseDate || new Date().toISOString().slice(0, 10),
        String(body.notes ?? "").trim(),
        new Date().toISOString(),
      ]
    );
    saveDb();

    const row = queryOne(db, "SELECT * FROM transactions WHERE id = ?", [transactionId]) as Record<
      string,
      unknown
    >;

    return NextResponse.json(rowToTransaction(row), { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar transacao" }, { status: 500 });
  }
}
