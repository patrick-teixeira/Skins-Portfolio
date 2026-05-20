import fs from "fs/promises";
import path from "path";

interface SkinRecord {
  id: string;
  name: string;
  image: string;
  rarity: string;
  rarityColor: string;
}

let skinCache: SkinRecord[] | null = null;

const ROOT = /* turbopackIgnore: true */ process.cwd();
const SKIN_FILES = [
  path.join(ROOT, "utils", "skins_info.json"),
  path.join(ROOT, "utils", "skin_info.json"),
];

export async function getSkins() {
  if (skinCache) return skinCache;

  const filePath = await findSkinFile();
  const raw = await fs.readFile(filePath, "utf8");
  const data: unknown = JSON.parse(raw);

  skinCache = collectSkins(data)
    .filter((skin, index, all) => all.findIndex((item) => item.name === skin.name) === index)
    .sort((a, b) => a.name.localeCompare(b.name));

  return skinCache;
}

export function filterSkins(skins: SkinRecord[], query: string) {
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

export function findSkinByName(skins: SkinRecord[], name: string) {
  const normalizedName = normalize(name);
  const queryTokens = tokenize(name);
  if (!normalizedName && queryTokens.length === 0) return null;

  return (
    skins.find((skin) => normalize(skin.name) === normalizedName) ??
    filterSkins(skins, name)[0] ??
    null
  );
}

async function findSkinFile() {
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

function collectSkins(value: unknown, result: SkinRecord[] = []) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectSkins(item, result));
    return result;
  }

  if (!value || typeof value !== "object") return result;

  const record = value as Record<string, unknown>;
  const rarity = record.rarity as Record<string, unknown> | undefined;

  if (typeof record.name === "string" && record.name.includes("|")) {
    result.push({
      id: typeof record.id === "string" ? record.id : createSlug(record.name),
      name: record.name,
      image: typeof record.image === "string" ? record.image : "",
      rarity: typeof rarity?.name === "string" ? rarity.name : "",
      rarityColor: typeof rarity?.color === "string" ? rarity.color : "",
    });
  }

  Object.values(record).forEach((item) => collectSkins(item, result));
  return result;
}

function getSearchScore(skin: SkinRecord, queryTokens: string[]) {
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

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokenize(value: string) {
  return normalize(value).split(/\s+/).filter(Boolean);
}

function createSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
