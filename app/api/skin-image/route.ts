import { type NextRequest } from "next/server";
import { errorJson, json } from "@/lib/server/http";
import { findSkinByName, getSkins } from "@/lib/server/skins-service";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name") ?? "";
  const skins = await getSkins();
  const skin = findSkinByName(skins, name);

  if (!skin) return errorJson("Skin nao encontrada", 404);

  return json({
    id: skin.id,
    name: skin.name,
    image: skin.image,
    rarity: skin.rarity,
    rarityColor: skin.rarityColor,
  });
}
