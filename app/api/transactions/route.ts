import { type NextRequest } from "next/server";
import { errorJson, json } from "@/lib/server/http";
import {
  createTransaction,
  listTransactions,
  requireUser,
  ServiceError,
} from "@/lib/server/portfolio-service";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = await requireUser(req);
  if (!user) return errorJson("Login necessario", 401);

  return json(await listTransactions(user.id));
}

export async function POST(req: NextRequest) {
  const user = await requireUser(req);
  if (!user) return errorJson("Login necessario", 401);

  try {
    return json(await createTransaction(user.id, await req.json().catch(() => ({}))), 201);
  } catch (error) {
    if (error instanceof ServiceError) return errorJson(error.message, error.status);
    throw error;
  }
}
