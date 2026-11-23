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

### Kezdő és Haladó mód

- **Kezdő**: termékek, kategóriák, szállítás, fizetés, készlet, publikálás.
- **Haladó**: ezen felül a *Megjelenés* menü élő előnézettel (asztali és mobil nézet): kész témák és saját színek, betűtípusok és címméret, formák (sarkok, gombok, kártyák), oszlopszám, animációk egyenként, a kezdőlap szekcióinak sorrendje és láthatósága, a bolt összes szövege, valamint saját CSS.

A Megjelenés beállításai a katalógus `settings.theme` és `settings.texts` mezőjébe kerülnek, publikáláskor élesednek.

A szövegek listája a `public/assets/js/texts.js` fájlban van (a forrás a fejlesztői `texts.json`, amiből a `build_pages.py` generálja a HTML-t is).

### 4.2 újdonságok

- **Kedvencek**: szív ikon a termékeken, „Kedvencek” szűrő a terméklistán (`/products?fav=1`).
- **Nemrég megnézett** termékek a termékoldalon, **képnagyító** (lapozható, teljes képernyős), **megosztás** gomb.
- **Kuponkódok** (Beállítások → Kuponkódok): százalékos, fix összegű vagy ingyenes szállítás, minimum rendelési értékkel. A kártyás fizetésnél a szerver is ellenőrzi.
- **Oldalak** menü: ÁSZF, adatkezelési tájékoztató, szállítás és elállás, rólunk (sablonnal), az impresszum a cégadatokból készül. Ha az ÁSZF vagy az adatkezelés ki van töltve, a pénztárban kötelező elfogadni.
- **Keresőoptimalizálás**: schema.org adatok, kanonikus címek, `/sitemap.xml` (Pages Function), a termékoldal címét és megosztási képét a szerver írja be (`functions/product.js`).
