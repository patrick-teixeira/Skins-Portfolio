import { NextResponse } from "next/server";
import crypto from "crypto";
import { getDb, rowToTransaction, queryOne, queryAll, runQuery, saveDb } from "@/lib/db";

const DEFAULT_USER_ID = "demo-user";

export async function GET() {
  try {
    const db = await getDb();
    const rows = queryAll(
      db,
      `SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC`,
      [DEFAULT_USER_ID]
    );

    return NextResponse.json(rows.map(rowToTransaction));
  } catch (error) {
    console.log("[v0] GET transactions error:", error);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(request: Request) {
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
        DEFAULT_USER_ID,
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
  } catch (error) {
    console.log("[v0] POST transaction error:", error);
    return NextResponse.json({ error: "Erro ao criar transacao" }, { status: 500 });
  }
}
