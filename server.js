const http = require("http");
const fs = require("fs/promises");
const path = require("path");

const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;
const SKIN_FILES = [
  path.join(ROOT, "utils", "skins_info.json"),
  path.join(ROOT, "utils", "skin_info.json"),
];

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
};

let skinCache = null;

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname === "/api/skins") {
      const query = url.searchParams.get("q") ?? "";
      const limit = Number(url.searchParams.get("limit")) || 50;
      const skins = await getSkins();
      const filtered = filterSkins(skins, query).slice(0, Math.min(limit, 1000));
      return sendJson(res, filtered);
    }

    if (url.pathname === "/api/skin-image") {
      const name = url.searchParams.get("name") ?? "";
      const skins = await getSkins();
      const skin = findSkinByName(skins, name);

      if (!skin) {
        return sendJson(res, { error: "Skin nao encontrada" }, 404);
      }

      return sendJson(res, {
        id: skin.id,
        name: skin.name,
        image: skin.image,
        rarity: skin.rarity,
        rarityColor: skin.rarityColor,
      });
    }

    if (url.pathname.startsWith("/api/skins/")) {
      const id = decodeURIComponent(url.pathname.replace("/api/skins/", ""));
      const skins = await getSkins();
      const skin = skins.find((item) => item.id === id);

      if (!skin) {
        return sendJson(res, { error: "Skin nao encontrada" }, 404);
      }

      return sendJson(res, skin);
    }

    return serveStatic(url.pathname, res);
  } catch (error) {
    console.error(error);
    return sendJson(res, { error: "Erro interno do servidor" }, 500);
  }
});

server.listen(PORT, () => {
  console.log(`CS Skins Portfolio rodando em http://localhost:${PORT}`);
});

async function getSkins() {
  if (skinCache) return skinCache;

  const filePath = await findSkinFile();
  const raw = await fs.readFile(filePath, "utf8");
  const data = JSON.parse(raw);

  skinCache = collectSkins(data)
    .filter((skin, index, all) => all.findIndex((item) => item.name === skin.name) === index)
    .sort((a, b) => a.name.localeCompare(b.name));

  return skinCache;
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

function collectSkins(value, result = []) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectSkins(item, result));
    return result;
  }

  if (!value || typeof value !== "object") return result;

  if (typeof value.name === "string" && value.name.includes("|")) {
    result.push({
      id: value.id ?? createSlug(value.name),
      name: value.name,
      image: value.image ?? "",
      rarity: value.rarity?.name ?? "",
      rarityColor: value.rarity?.color ?? "",
    });
  }

  Object.values(value).forEach((item) => collectSkins(item, result));
  return result;
}

function filterSkins(skins, query) {
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

function findSkinByName(skins, name) {
  const normalizedName = normalize(name);
  const queryTokens = tokenize(name);
  if (!normalizedName && queryTokens.length === 0) return null;

  return (
    skins.find((skin) => normalize(skin.name) === normalizedName) ??
    filterSkins(skins, name)[0] ??
    null
  );
}

function getSearchScore(skin, queryTokens) {
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

function normalize(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokenize(value) {
  return normalize(value).split(/\s+/).filter(Boolean);
}

function createSlug(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function serveStatic(pathname, res) {
  const requestedPath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.normalize(path.join(ROOT, requestedPath));

  if (!filePath.startsWith(ROOT)) {
    return sendText(res, "Forbidden", 403);
  }

  try {
    const content = await fs.readFile(filePath);
    const extension = path.extname(filePath);
    res.writeHead(200, {
      "Content-Type": CONTENT_TYPES[extension] ?? "application/octet-stream",
    });
    return res.end(content);
  } catch {
    return sendText(res, "Not found", 404);
  }
}

function sendJson(res, payload, statusCode = 200) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(JSON.stringify(payload));
}

function sendText(res, payload, statusCode = 200) {
  res.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8",
  });
  res.end(payload);
}
