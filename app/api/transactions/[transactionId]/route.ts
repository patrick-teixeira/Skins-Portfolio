import { type NextRequest } from "next/server";
import { errorJson, json } from "@/lib/server/http";
import {
  deleteTransaction,
  requireUser,
  ServiceError,
  updateTransaction,
} from "@/lib/server/portfolio-service";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ transactionId: string }>;
}

export async function PUT(req: NextRequest, context: RouteContext) {
  const user = await requireUser(req);
  if (!user) return errorJson("Login necessario", 401);

  const { transactionId } = await context.params;

  try {
    const transaction = await updateTransaction(
      user.id,
      transactionId,
      await req.json().catch(() => ({})),
    );

    if (!transaction) return errorJson("Transacao nao encontrada", 404);
    return json(transaction);
  } catch (error) {
    if (error instanceof ServiceError) return errorJson(error.message, error.status);
    throw error;
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const user = await requireUser(req);
  if (!user) return errorJson("Login necessario", 401);

  const { transactionId } = await context.params;
  await deleteTransaction(user.id, transactionId);
  return json({ ok: true });
}
