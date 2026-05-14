import { NextResponse } from "next/server";
import { getDb, runQuery, saveDb } from "@/lib/db";

const DEFAULT_USER_ID = "demo-user";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDb();

    runQuery(db, "DELETE FROM transactions WHERE id = ? AND user_id = ?", [id, DEFAULT_USER_ID]);
    saveDb();

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.log("[v0] DELETE transaction error:", error);
    return NextResponse.json({ error: "Erro ao deletar" }, { status: 500 });
  }
}
