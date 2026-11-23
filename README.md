# NS Card webshop

Pokémon TCG webshop admin felülettel. A webshop a Cloudflare Pages-en fut, és ebből a repóból települ: minden új commit után a Cloudflare magától frissíti az oldalt.

## Felépítés

- `public/` – maga a weboldal (bolt, termékoldal, pénztár, admin)
- `public/store/catalog.json` – termékek és bolt beállítások. Ezt az admin írja.
- `public/store/images/` – az adminban feltöltött termékképek
- `functions/api/` – bankkártyás fizetés (Stripe) szerveroldali része

## Cloudflare Pages beállítás

- Framework preset: **None**
- Build command: *(üres)*
- Build output directory: `public`
- Bankkártyás fizetéshez: Settings → Variables and Secrets → `STRIPE_SECRET_KEY` (Secret), utána az adminban kapcsold be a Bankkártya fizetési módot.

## Admin

Cím: `/admin`. A publikáláshoz az admin Publikálás oldalán kell megadni egy GitHub tokent (Fine-grained token, csak erre a repóra, Contents: Read and write). A token csak abban a böngészőben tárolódik, ahol megadod.

Jelszócsere: az `public/assets/js/admin.js` fájlban az `AUTH.hash` értéke a `nscard-admin-v3|<felhasználónév>|<jelszó>` szöveg SHA-256 lenyomata.
