import fs from "fs/promises";
import path from "path";
import type { Skin } from "./types";

const SKIN_FILES = [
  path.join(process.cwd(), "utils", "skins_info.json"),
  path.join(process.cwd(), "utils", "skin_info.json"),
];

let skinCache: Skin[] | null = null;

interface SkinData {
  id?: string;
  name?: string;
  image?: string;
  rarity?: { name?: string; color?: string };
  [key: string]: unknown;
}

export async function getSkins(): Promise<Skin[]> {
  if (skinCache) return skinCache;

  const filePath = await findSkinFile();
  const raw = await fs.readFile(filePath, "utf8");
  const data = JSON.parse(raw);

  skinCache = collectSkins(data)
    .filter((skin, index, all) => all.findIndex((item) => item.name === skin.name) === index)
    .sort((a, b) => a.name.localeCompare(b.name));

  return skinCache;
}

async function findSkinFile(): Promise<string> {
  for (const filePath of SKIN_FILES) {
    try {
      await fs.access(filePath);
      return filePath;
    } catch {
      // Try the next supported filename.
    }
  }
  throw new Error("Nenhum arquivo de skins encontrado em ./utils");
}

function collectSkins(value: unknown, result: Skin[] = []): Skin[] {
  if (Array.isArray(value)) {
    value.forEach((item) => collectSkins(item, result));
    return result;
  }

  if (!value || typeof value !== "object") return result;

  const obj = value as SkinData;
  if (typeof obj.name === "string" && obj.name.includes("|")) {
    result.push({
      id: obj.id ?? createSlug(obj.name),
      name: obj.name,
      image: obj.image ?? "",
      rarity: obj.rarity?.name ?? "",
      rarityColor: obj.rarity?.color ?? "",
    });
  }

  Object.values(obj).forEach((item) => collectSkins(item, result));
  return result;
}

function createSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokenize(value: string): string[] {
  return normalize(value).split(/\s+/).filter(Boolean);
}

export function filterSkins(skins: Skin[], query: string): Skin[] {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return skins;

  return skins
    .map((skin) => ({
      skin,
      score: getSearchScore(skin, queryTokens),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.skin.name.localeCompare(b.skin.name))
    .map((item) => item.skin);
}

function getSearchScore(skin: Skin, queryTokens: string[]): number {
  const normalizedName = normalize(skin.name);
  const skinTokens = tokenize(skin.name);

  if (queryTokens.every((token) => normalizedName.includes(token))) {
    return queryTokens.reduce((score, token) => {
      if (skinTokens.includes(token)) return score + 4;
      if (skinTokens.some((skinToken) => skinToken.startsWith(token))) return score + 3;
      return score + 1;
    }, 0);
  }

  return 0;
}

export function findSkinByName(skins: Skin[], name: string): Skin | null {
  const normalizedName = normalize(name);
  const queryTokens = tokenize(name);
  if (!normalizedName && queryTokens.length === 0) return null;

  return (
    skins.find((skin) => normalize(skin.name) === normalizedName) ?? filterSkins(skins, name)[0] ?? null
  );
}
