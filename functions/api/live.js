/* GET /api/live?since=… – élő adatok a bolthoz: a legutóbbi készlet-szinkron óta eladott darabok, értékelések, elérhető funkciók. */
import { json } from "../../lib/core.js";
import { getDb, soldSince, ratingSummary } from "../../lib/db.js";
import { mailReady } from "../../lib/mail.js";

export async function onRequestGet({ request, env }) {
  const features = { db: !!env.DB, mail: mailReady(env), card: !!env.STRIPE_SECRET_KEY };
  const DB = await getDb(env).catch(() => null);
  if (!DB) return json({ features, sold: {}, ratings: {} }, 200, { "Cache-Control": "public, max-age=60" });
  const since = new URL(request.url).searchParams.get("since") || "";
  try {
    const [sold, ratings] = await Promise.all([soldSince(DB, since), ratingSummary(DB)]);
    return json({ features, sold, ratings, now: new Date().toISOString() }, 200, { "Cache-Control": "public, max-age=15" });
  } catch (e) {
    return json({ features: { ...features, db: false }, sold: {}, ratings: {}, error: "Az adatbázis most nem érhető el." }, 200, { "Cache-Control": "no-store" });
  }
}
