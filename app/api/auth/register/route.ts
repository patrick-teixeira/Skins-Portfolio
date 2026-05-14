import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import crypto from "crypto";
import { getDb, hashPassword, generateSalt, queryOne, runQuery, saveDb } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const username = String(body.username ?? "").trim();
    const password = String(body.password ?? "");

    if (username.length < 3 || password.length < 6) {
      return NextResponse.json(
        { error: "Use usuario com 3+ caracteres e senha com 6+ caracteres" },
        { status: 400 }
      );
    }

    const db = await getDb();

    const existing = queryOne(db, "SELECT id FROM users WHERE username = ?", [username]);
    if (existing) {
      return NextResponse.json({ error: "Usuario ja existe" }, { status: 409 });
    }

    const userId = crypto.randomUUID();
    const salt = generateSalt();
    const passwordHash = hashPassword(password, salt);

    runQuery(
      db,
      `INSERT INTO users (id, username, password_hash, salt, created_at) VALUES (?, ?, ?, ?, ?)`,
      [userId, username, passwordHash, salt, new Date().toISOString()]
    );

    // Create session
    const sessionId = crypto.randomUUID();
    const maxAgeSeconds = 60 * 60 * 24 * 30;
    const expiresAt = Date.now() + maxAgeSeconds * 1000;

    runQuery(
      db,
      `INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)`,
      [sessionId, userId, expiresAt, new Date().toISOString()]
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
      user: { id: userId, username },
    });
  } catch {
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
