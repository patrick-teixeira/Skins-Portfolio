import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getDb, runQuery, saveDb } from "@/lib/db";

export async function POST() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("session_id")?.value;

  if (sessionId) {
    try {
      const db = await getDb();
      runQuery(db, "DELETE FROM sessions WHERE id = ?", [sessionId]);
      saveDb();
    } catch {
      // Ignore errors during logout
    }
  }

  cookieStore.set("session_id", "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return NextResponse.json({ ok: true });
}
