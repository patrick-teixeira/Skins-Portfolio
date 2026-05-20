import { type NextRequest } from "next/server";
import { errorJson, json } from "@/lib/server/http";
import { registerUser, ServiceError, setSessionCookie } from "@/lib/server/portfolio-service";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const payload = await registerUser(await req.json().catch(() => ({})));
    const res = json({ user: payload.user });
    setSessionCookie(res, payload.sessionId);
    return res;
  } catch (error) {
    if (error instanceof ServiceError) return errorJson(error.message, error.status);
    throw error;
  }
}
