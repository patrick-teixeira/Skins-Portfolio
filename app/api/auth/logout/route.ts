import { type NextRequest } from "next/server";
import { clearSessionCookie, logoutUser } from "@/lib/server/portfolio-service";
import { json } from "@/lib/server/http";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  await logoutUser(req);
  const res = json({ ok: true });
  clearSessionCookie(res);
  return res;
}
