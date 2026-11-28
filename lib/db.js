/* NS Card – D1 adatbázis (a Cloudflare-en "DB" néven kell a projekthez kötni).
 * A táblákat a kód hozza létre az első kéréskor, kézi SQL nem kell. */
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY, created_at TEXT NOT NULL, updated_at TEXT, status TEXT NOT NULL,
    pay TEXT, paid INTEGER DEFAULT 0, ship TEXT, email TEXT, name TEXT, phone TEXT, total INTEGER DEFAULT 0,
    data TEXT NOT NULL, stripe_session TEXT, invoice TEXT, tracking TEXT, carrier TEXT, note TEXT
  )`,
  "CREATE INDEX IF NOT EXISTS orders_created ON orders(created_at)",
  "CREATE INDEX IF NOT EXISTS orders_status ON orders(status)",
  `CREATE TABLE IF NOT EXISTS order_items (
    order_id TEXT NOT NULL, product_id INTEGER NOT NULL, qty INTEGER NOT NULL, created_at TEXT NOT NULL, active INTEGER DEFAULT 1
  )`,
  "CREATE INDEX IF NOT EXISTS order_items_created ON order_items(created_at)",
  "CREATE INDEX IF NOT EXISTS order_items_order ON order_items(order_id)",
  `CREATE TABLE IF NOT EXISTS subscribers (
    email TEXT PRIMARY KEY, created_at TEXT NOT NULL, confirmed INTEGER DEFAULT 0, token TEXT NOT NULL,
    source TEXT, unsubscribed INTEGER DEFAULT 0, confirmed_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS stock_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL, product_id INTEGER NOT NULL,
    created_at TEXT NOT NULL, notified_at TEXT, UNIQUE(email, product_id)
  )`,
  `CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER NOT NULL, name TEXT NOT NULL, rating INTEGER NOT NULL,
    title TEXT, body TEXT, email TEXT, order_id TEXT, verified INTEGER DEFAULT 0, status TEXT DEFAULT 'pending',
    created_at TEXT NOT NULL, reply TEXT
  )`,
  "CREATE INDEX IF NOT EXISTS reviews_product ON reviews(product_id, status)",
  "CREATE TABLE IF NOT EXISTS rate (k TEXT PRIMARY KEY, n INTEGER NOT NULL, reset INTEGER NOT NULL)",
  "CREATE TABLE IF NOT EXISTS newsletter_sends (campaign TEXT NOT NULL, email TEXT NOT NULL, sent_at TEXT NOT NULL, PRIMARY KEY (campaign, email))",
  `CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT NOT NULL, name TEXT, email TEXT NOT NULL, subject TEXT,
    body TEXT NOT NULL, product_id INTEGER, status TEXT DEFAULT 'new'
  )`
];

let schemaReady = false;
export async function getDb(env) {
  if (!env?.DB) return null;
  if (!schemaReady) {
    await env.DB.batch(SCHEMA.map(sql => env.DB.prepare(sql)));
    schemaReady = true;
  }
  return env.DB;
}

/* Egyszerű, adatbázis alapú korlátozás (pl. 10 rendelés / 10 perc / IP). true = mehet. */
export async function rateLimit(DB, key, limit, windowSec) {
  const now = Math.floor(Date.now() / 1000);
  try {
    if (Math.random() < 0.02) await DB.prepare("DELETE FROM rate WHERE reset < ?").bind(now).run();
    const row = await DB.prepare("SELECT n, reset FROM rate WHERE k = ?").bind(key).first();
    if (!row || row.reset < now) {
      await DB.prepare("INSERT OR REPLACE INTO rate (k, n, reset) VALUES (?, 1, ?)").bind(key, now + windowSec).run();
      return true;
    }
    if (row.n >= limit) return false;
    await DB.prepare("UPDATE rate SET n = n + 1 WHERE k = ?").bind(key).run();
    return true;
  } catch { return true; }
}

/* A fizetésre váró kártyás rendelés ennyi ideig foglalja a készletet (a Stripe oldal 31 perc után lejár). */
export const PENDING_HOLD_MIN = 45;

/* A legutóbbi készlet-szinkron óta eladott darabok termékenként. */
export async function soldSince(DB, since) {
  if (!DB) return {};
  const from = /^\d{4}-\d{2}-\d{2}T/.test(String(since || "")) ? String(since) : "1970-01-01T00:00:00.000Z";
  const holdFrom = new Date(Date.now() - PENDING_HOLD_MIN * 60000).toISOString();
  const { results } = await DB.prepare(
    `SELECT oi.product_id AS id, SUM(oi.qty) AS qty FROM order_items oi JOIN orders o ON o.id = oi.order_id
     WHERE oi.active = 1 AND oi.created_at > ? AND o.status != 'cancelled' AND (o.status != 'pending_payment' OR o.created_at > ?)
     GROUP BY oi.product_id`
  ).bind(from, holdFrom).all();
  const out = {};
  for (const r of results || []) out[r.id] = Number(r.qty) || 0;
  return out;
}

export async function ratingSummary(DB) {
  if (!DB) return {};
  const { results } = await DB.prepare("SELECT product_id AS id, ROUND(AVG(rating), 2) AS avg, COUNT(*) AS n FROM reviews WHERE status = 'approved' GROUP BY product_id").all();
  const out = {};
  for (const r of results || []) out[r.id] = [Number(r.avg) || 0, Number(r.n) || 0];
  return out;
}
