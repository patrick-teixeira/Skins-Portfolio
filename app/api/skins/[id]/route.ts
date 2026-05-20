import { type NextRequest } from "next/server";
import { errorJson, json } from "@/lib/server/http";
import { getSkins } from "@/lib/server/skins-service";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const skins = await getSkins();
  const skin = skins.find((item) => item.id === id);

  if (!skin) return errorJson("Skin nao encontrada", 404);
  return json(skin);
}
