import { NextResponse } from "next/server";
import { getDb, rowToTransaction, queryOne, runQuery, saveDb } from "@/lib/db";

const DEFAULT_USER_ID = "demo-user";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const db = await getDb();

    runQuery(
      db,
      `UPDATE transactions SET sale_price = ?, sale_fee = ?, sale_date = ? WHERE id = ? AND user_id = ?`,
      [
        Number(body.salePrice) || 0,
        Number(body.saleFee) || 0,
        body.saleDate || new Date().toISOString().slice(0, 10),
        id,
        DEFAULT_USER_ID,
      ]
    );
    saveDb();

    const row = queryOne(db, "SELECT * FROM transactions WHERE id = ? AND user_id = ?", [
      id,
      DEFAULT_USER_ID,
    ]) as Record<string, unknown> | null;

    if (!row) {
      return NextResponse.json({ error: "Transacao nao encontrada" }, { status: 404 });
    }

    return NextResponse.json(rowToTransaction(row));
  } catch (error) {
    console.log("[v0] PUT sale error:", error);
    return NextResponse.json({ error: "Erro ao atualizar venda" }, { status: 500 });
  }
}
