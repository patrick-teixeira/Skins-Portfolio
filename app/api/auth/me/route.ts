import { type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/server/portfolio-service";
import { json } from "@/lib/server/http";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req);
  return json({ user });
}
