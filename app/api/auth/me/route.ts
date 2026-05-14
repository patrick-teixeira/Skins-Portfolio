import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getDb, queryOne } from "@/lib/db";

export async function GET() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("session_id")?.value;

  if (!sessionId) {
    return NextResponse.json({ user: null });
  }

  try {
    const db = await getDb();
    const session = queryOne(
      db,
      `SELECT users.id, users.username
       FROM sessions
       JOIN users ON users.id = sessions.user_id
       WHERE sessions.id = ? AND sessions.expires_at > ?`,
      [sessionId, Date.now()]
    ) as { id: string; username: string } | null;

    if (!session) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({
      user: { id: session.id, username: session.username },
    });
  } catch {
    return NextResponse.json({ user: null });
  }
}
