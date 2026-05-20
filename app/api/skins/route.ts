import { type NextRequest } from "next/server";
import { json } from "@/lib/server/http";
import { filterSkins, getSkins } from "@/lib/server/skins-service";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q") ?? "";
  const limit = Number(req.nextUrl.searchParams.get("limit")) || 50;
  const skins = await getSkins();
  const filtered = filterSkins(skins, query).slice(0, Math.min(limit, 1000));

  return json(filtered);
}
