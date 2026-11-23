/* GET /api/config – a pénztár ide nézi meg, mi érhető el (adatbázis, e-mail, kártya). Kulcsot soha nem ad ki. */
import { json } from "../../lib/core.js";
import { mailReady } from "../../lib/mail.js";
export const onRequestGet = ({ env }) => json({ db: !!env.DB, mail: mailReady(env), card: !!env.STRIPE_SECRET_KEY }, 200, { "Cache-Control": "public, max-age=60" });
