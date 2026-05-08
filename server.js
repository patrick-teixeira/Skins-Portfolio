const http = require("http");
const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const { DatabaseSync } = require("node:sqlite");

const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;
const DB_PATH = path.join(ROOT, "portfolio.sqlite");
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
const db = new DatabaseSync(DB_PATH);
setupDatabase();

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname === "/api/auth/me") {
      const user = getCurrentUser(req);
      return sendJson(res, { user: user ? publicUser(user) : null });
    }

    if (url.pathname === "/api/auth/register" && req.method === "POST") {
      const body = await readJsonBody(req);
      return registerUser(body, res);
    }

    if (url.pathname === "/api/auth/login" && req.method === "POST") {
      const body = await readJsonBody(req);
      return loginUser(body, res);
    }

    if (url.pathname === "/api/auth/logout" && req.method === "POST") {
      const sessionId = getCookie(req, "session_id");
      if (sessionId) {
        db.prepare("DELETE FROM sessions WHERE id = ?").run(sessionId);
      }

      clearSessionCookie(res);
      return sendJson(res, { ok: true });
    }

    if (url.pathname === "/api/transactions") {
      const user = requireUser(req, res);
      if (!user) return;

      if (req.method === "GET") {
        return sendJson(res, listTransactions(user.id));
      }

      if (req.method === "POST") {
        const body = await readJsonBody(req);
        const transaction = createTransaction(user.id, body);
        return sendJson(res, transaction, 201);
      }
    }

    if (url.pathname.startsWith("/api/transactions/")) {
      const user = requireUser(req, res);
      if (!user) return;

      const parts = url.pathname.split("/").filter(Boolean);
      const transactionId = decodeURIComponent(parts[2] ?? "");

      if (req.method === "DELETE" && transactionId) {
        db.prepare("DELETE FROM transactions WHERE id = ? AND user_id = ?").run(transactionId, user.id);
        return sendJson(res, { ok: true });
      }

      if (req.method === "PUT" && parts[3] === "sale" && transactionId) {
        const body = await readJsonBody(req);
        const transaction = updateSale(user.id, transactionId, body);

        if (!transaction) {
          return sendJson(res, { error: "Transacao nao encontrada" }, 404);
        }

        return sendJson(res, transaction);
      }
    }

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

function setupDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      skin_id TEXT,
      skin_name TEXT NOT NULL,
      skin_rarity TEXT,
      skin_rarity_color TEXT,
      skin_image TEXT,
      buy_price REAL NOT NULL DEFAULT 0,
      purchase_date TEXT NOT NULL,
      sale_price REAL,
      sale_fee REAL,
      sale_date TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
}

function registerUser(body, res) {
  const username = String(body.username ?? "").trim();
  const password = String(body.password ?? "");

  if (username.length < 3 || password.length < 6) {
    return sendJson(res, { error: "Use usuario com 3+ caracteres e senha com 6+ caracteres" }, 400);
  }

  const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(username);
  if (existing) {
    return sendJson(res, { error: "Usuario ja existe" }, 409);
  }

  const id = crypto.randomUUID();
  const salt = crypto.randomBytes(16).toString("hex");
  const passwordHash = hashPassword(password, salt);

  db.prepare(`
    INSERT INTO users (id, username, password_hash, salt, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, username, passwordHash, salt, new Date().toISOString());

  const user = { id, username };
  createSession(res, user.id);
  return sendJson(res, { user });
}

function loginUser(body, res) {
  const username = String(body.username ?? "").trim();
  const password = String(body.password ?? "");
  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username);

  if (!user || hashPassword(password, user.salt) !== user.password_hash) {
    return sendJson(res, { error: "Usuario ou senha invalidos" }, 401);
  }

  createSession(res, user.id);
  return sendJson(res, { user: publicUser(user) });
}

function createSession(res, userId) {
  const id = crypto.randomUUID();
  const maxAgeSeconds = 60 * 60 * 24 * 30;
  const expiresAt = Date.now() + maxAgeSeconds * 1000;

  db.prepare(`
    INSERT INTO sessions (id, user_id, expires_at, created_at)
    VALUES (?, ?, ?, ?)
  `).run(id, userId, expiresAt, new Date().toISOString());

  res.setHeader(
    "Set-Cookie",
    `session_id=${id}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAgeSeconds}`,
  );
}

function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", "session_id=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0");
}

function getCurrentUser(req) {
  const sessionId = getCookie(req, "session_id");
  if (!sessionId) return null;

  const session = db
    .prepare(
      `SELECT users.id, users.username
       FROM sessions
       JOIN users ON users.id = sessions.user_id
       WHERE sessions.id = ? AND sessions.expires_at > ?`,
    )
    .get(sessionId, Date.now());

  return session ?? null;
}

function requireUser(req, res) {
  const user = getCurrentUser(req);
  if (!user) {
    sendJson(res, { error: "Login necessario" }, 401);
    return null;
  }

  return user;
}

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
  };
}

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 120000, 64, "sha512").toString("hex");
}

function listTransactions(userId) {
  return db
    .prepare(
      `SELECT *
       FROM transactions
       WHERE user_id = ?
       ORDER BY created_at DESC`,
    )
    .all(userId)
    .map(rowToTransaction);
}

function createTransaction(userId, body) {
  const transaction = normalizeTransactionBody(body);
  transaction.id = crypto.randomUUID();

  db.prepare(`
    INSERT INTO transactions (
      id, user_id, skin_id, skin_name, skin_rarity, skin_rarity_color, skin_image,
      buy_price, purchase_date, notes, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    transaction.id,
    userId,
    transaction.skinId,
    transaction.skinName,
    transaction.skinRarity,
    transaction.skinRarityColor,
    transaction.skinImage,
    transaction.buyPrice,
    transaction.purchaseDate,
    transaction.notes,
    new Date().toISOString(),
  );

  return getTransaction(userId, transaction.id);
}

function updateSale(userId, transactionId, body) {
  db.prepare(`
    UPDATE transactions
    SET sale_price = ?, sale_fee = ?, sale_date = ?
    WHERE id = ? AND user_id = ?
  `).run(
    Number(body.salePrice) || 0,
    Number(body.saleFee) || 0,
    body.saleDate || new Date().toISOString().slice(0, 10),
    transactionId,
    userId,
  );

  return getTransaction(userId, transactionId);
}

function getTransaction(userId, transactionId) {
  const row = db
    .prepare("SELECT * FROM transactions WHERE id = ? AND user_id = ?")
    .get(transactionId, userId);

  return row ? rowToTransaction(row) : null;
}

function normalizeTransactionBody(body) {
  return {
    skinId: String(body.skinId ?? ""),
    skinName: String(body.skinName ?? "").trim(),
    skinRarity: String(body.skinRarity ?? ""),
    skinRarityColor: String(body.skinRarityColor ?? ""),
    skinImage: String(body.skinImage ?? ""),
    buyPrice: Number(body.buyPrice) || 0,
    purchaseDate: body.purchaseDate || new Date().toISOString().slice(0, 10),
    notes: String(body.notes ?? "").trim(),
  };
}

function rowToTransaction(row) {
  return {
    id: row.id,
    skinId: row.skin_id,
    skinName: row.skin_name,
    skinRarity: row.skin_rarity,
    skinRarityColor: row.skin_rarity_color,
    skinImage: row.skin_image,
    buyPrice: row.buy_price,
    purchaseDate: row.purchase_date,
    salePrice: row.sale_price,
    saleFee: row.sale_fee,
    saleDate: row.sale_date,
    notes: row.notes,
  };
}

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

async function readJsonBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) return {};

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return {};
  }
}

function getCookie(req, name) {
  const cookieHeader = req.headers.cookie ?? "";
  const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());
  const cookie = cookies.find((item) => item.startsWith(`${name}=`));

  if (!cookie) return "";
  return decodeURIComponent(cookie.slice(name.length + 1));
}
