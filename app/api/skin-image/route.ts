import { NextResponse } from "next/server";
import { getSkins, findSkinByName } from "@/lib/skins";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const name = url.searchParams.get("name") ?? "";

    const skins = await getSkins();
    const skin = findSkinByName(skins, name);

    if (!skin) {
      return NextResponse.json({ error: "Skin nao encontrada" }, { status: 404 });
    }

    return NextResponse.json({
      id: skin.id,
      name: skin.name,
      image: skin.image,
      rarity: skin.rarity,
      rarityColor: skin.rarityColor,
    });
  } catch {
    return NextResponse.json({ error: "Erro ao buscar skin" }, { status: 500 });
  }
}
