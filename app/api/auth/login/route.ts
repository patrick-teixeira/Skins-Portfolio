import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import crypto from "crypto";
import { getDb, hashPassword, queryOne, runQuery, saveDb } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const username = String(body.username ?? "").trim();
    const password = String(body.password ?? "");

    const db = await getDb();
    const user = queryOne(db, "SELECT * FROM users WHERE username = ?", [username]) as
      | { id: string; username: string; password_hash: string; salt: string }
      | null;

    if (!user || hashPassword(password, user.salt) !== user.password_hash) {
      return NextResponse.json({ error: "Usuario ou senha invalidos" }, { status: 401 });
    }

    // Create session
    const sessionId = crypto.randomUUID();
    const maxAgeSeconds = 60 * 60 * 24 * 30;
    const expiresAt = Date.now() + maxAgeSeconds * 1000;

    runQuery(
      db,
      `INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)`,
      [sessionId, user.id, expiresAt, new Date().toISOString()]
    );
    saveDb();

    const cookieStore = await cookies();
    cookieStore.set("session_id", sessionId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: maxAgeSeconds,
    });

    return NextResponse.json({
      user: { id: user.id, username: user.username },
    });
  } catch {
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
