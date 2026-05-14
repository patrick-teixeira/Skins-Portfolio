import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getDb, queryOne, runQuery, saveDb } from "@/lib/db";

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

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Login necessario" }, { status: 401 });
  }

  const { id } = await params;
  const db = await getDb();

  runQuery(db, "DELETE FROM transactions WHERE id = ? AND user_id = ?", [id, user.id]);
  saveDb();

  return NextResponse.json({ ok: true });
}
