import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

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

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Login necessario" }, { status: 401 });
  }

  const { id } = await params;
  const db = getDb();

  db.prepare("DELETE FROM transactions WHERE id = ? AND user_id = ?").run(id, user.id);

  return NextResponse.json({ ok: true });
}
