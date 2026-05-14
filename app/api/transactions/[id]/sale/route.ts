import { cookies } from "next/headers";
import { NextResponse } from "next/server";
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

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Login necessario" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const db = getDb();

    db.prepare(`
      UPDATE transactions
      SET sale_price = ?, sale_fee = ?, sale_date = ?
      WHERE id = ? AND user_id = ?
    `).run(
      Number(body.salePrice) || 0,
      Number(body.saleFee) || 0,
      body.saleDate || new Date().toISOString().slice(0, 10),
      id,
      user.id
    );

    const row = db
      .prepare("SELECT * FROM transactions WHERE id = ? AND user_id = ?")
      .get(id, user.id) as Record<string, unknown> | undefined;

    if (!row) {
      return NextResponse.json({ error: "Transacao nao encontrada" }, { status: 404 });
    }

    return NextResponse.json(rowToTransaction(row));
  } catch {
    return NextResponse.json({ error: "Erro ao atualizar venda" }, { status: 500 });
  }
}
