import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("session_id")?.value;

  if (sessionId) {
    try {
      const db = getDb();
      db.prepare("DELETE FROM sessions WHERE id = ?").run(sessionId);
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
