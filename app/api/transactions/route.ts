import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import crypto from "crypto";
import { getDb, rowToTransaction } from "@/lib/db";

async function getCurrentUser() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("session_id")?.value;

  if (!sessionId) return null;

  const db = getDb();
  const session = db
    .prepare(
      `SELECT users.id, users.username
       FROM sessions
       JOIN users ON users.id = sessions.user_id
       WHERE sessions.id = ? AND sessions.expires_at > ?`
    )
    .get(sessionId, Date.now()) as { id: string; username: string } | undefined;

  return session ?? null;
}

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Login necessario" }, { status: 401 });
  }

  const db = getDb();
  const rows = db
    .prepare(
      `SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC`
    )
    .all(user.id) as Record<string, unknown>[];

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
    const db = getDb();

    db.prepare(`
      INSERT INTO transactions (
        id, user_id, skin_id, skin_name, skin_rarity, skin_rarity_color, skin_image,
        buy_price, purchase_date, notes, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
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
      new Date().toISOString()
    );

    const row = db
      .prepare("SELECT * FROM transactions WHERE id = ?")
      .get(transactionId) as Record<string, unknown>;

    return NextResponse.json(rowToTransaction(row), { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar transacao" }, { status: 500 });
  }
}
