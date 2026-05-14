import { NextResponse } from "next/server";
import { getSkins, filterSkins } from "@/lib/skins";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get("q") ?? "";
    const limit = Number(url.searchParams.get("limit")) || 50;

    const skins = await getSkins();
    const filtered = filterSkins(skins, query).slice(0, Math.min(limit, 1000));

    return NextResponse.json(filtered);
  } catch {
    return NextResponse.json({ error: "Erro ao carregar skins" }, { status: 500 });
  }
}
