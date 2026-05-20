import { type NextRequest } from "next/server";
import { errorJson, json } from "@/lib/server/http";
import { requireUser, updateSale } from "@/lib/server/portfolio-service";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ transactionId: string }>;
}

export async function PUT(req: NextRequest, context: RouteContext) {
  const user = await requireUser(req);
  if (!user) return errorJson("Login necessario", 401);

  const { transactionId } = await context.params;
  const transaction = await updateSale(user.id, transactionId, await req.json().catch(() => ({})));

  if (!transaction) return errorJson("Transacao nao encontrada", 404);
  return json(transaction);
}
