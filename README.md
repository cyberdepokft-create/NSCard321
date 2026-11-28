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

### 4.3 újdonságok

- **Kategóriák**: képes csempék a kezdőlapon (az első kategória a nagy csempe – a sorrend az adminban állítható), színes fejléc a kategória oldalon, képes szűrő gombok, képes kategóriák a menüben és a keresőben. Adminban kategóriánként szín, borítókép, rövid leírás és elrejtés.
- **Kezdőlap**: „Folytasd, ahol abbahagytad” sáv, Gyakori kérdések (saját kérdések az Oldalak menüben, különben automatikus).
- **Termékoldal**: napi feladási határidő visszaszámlálással (Beállítások → Szállítás), alacsony készlet jelző, „Szólj, ha megérkezik” gomb.
- **Mobil**: rács / lista nézet váltó a terméklistán, „vissza a tetejére” gomb.
- **Alkalmazásként telepíthető** (service worker, `public/sw.js`), gyorsabb ismételt betöltés.
- **Admin**: kategóriák szerinti készlet-összesítő az Áttekintésben.

### 5.0 újdonságok
- **Rendeléskezelés** (admin → Rendelések): állapotok (új, fizetésre vár, fizetve, csomagolva, feladva, teljesítve, lemondva), csomagszám futárral, szállítólevél nyomtatás, CSV export, belső megjegyzés, történet.
- **Automatikus készlet**: minden rendelés lefoglalja a darabot (kártyás fizetésnél 45 percig, ha nem fizetnek, felszabadul); az admin és a bolt mindig az aktuális elérhető darabszámot mutatja.
- **E-mailek** (Resend): visszaigazolás utalási adatokkal, új rendelés értesítő a boltnak, feladási értesítő csomagkövetéssel, állapot e-mailek, hírlevél, „újra kapható” levelek.
- **Billingo számlázás**: egy kattintással vagy automatikusan fizetéskor (27% ÁFA vagy AAM, e-számla, kiküldés a vásárlónak).
- **Csomagautomata térkép** (Foxpost és Packeta Z-BOX), **irányítószám → település** kitöltés, számlázási adatok (cégnév, adószám).
- **Előrendelés** megjelenési dátummal, **single kártyák** (állapot NM–DMG, nyelv, kártyaszám, ritkaság, grading) szűrőkkel.
- **Vásárlói vélemények** moderálással és „ellenőrzött vásárlás” jelöléssel, csillagok a Google találatokban.
- **Megjelenési naptár**, **cikkek** (/blog), **hírlevél** feliratkozás dupla megerősítéssel.
- **Termék feedek**: `/feeds/google.xml`, `/feeds/arukereso.xml`, `/feeds/argep.xml`.

#### Bekötés (Cloudflare → nscard-webshop → Settings)
| Mi | Hol | Név |
|---|---|---|
| Adatbázis (kötelező a rendelésekhez) | Bindings → D1 database | `DB` |
| E-mail | Variables and Secrets (Secret) | `RESEND_API_KEY`, opcionális `MAIL_FROM`, `ADMIN_EMAIL` |
| Kártyás fizetés | Variables and Secrets (Secret) | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
| Számlázás | Variables and Secrets (Secret) | `SZAMLAZZ_AGENT_KEY` (Számlázz.hu) vagy `BILLINGO_API_KEY` |

Minden módosítás után: Deployments → Retry deployment. Adatbázis nélkül a bolt a korábbi, levelezős rendelésre vált. A szerver kód a `functions/` és `lib/` mappában van; a szerver tesztek Node alatt futnak (node:sqlite a D1 helyett).

### 5.1 újdonságok
- **Mobil admin**: kompakt publikálás gomb, felül megjelenő értesítések, ugrómenü a Beállításokban, a mentés sáv csak módosításkor jelenik meg, mobilon a cikk szerkesztő a kiválasztott cikkhez görget.
- **Rendelés követése** (`/rendeles`): a vásárló a rendelésszámmal és e-mail címmel (vagy a levélben kapott linkkel) látja az állapotot és a csomagkövetést.
- **Ajándékcsomagolás** üzenettel (Beállítások → Ajándék): az adminban külön jelölve, a nyomtatott lapon ilyenkor nincs ár és vásárlói e-mail.
- **Vásárlási limit** termékenként (`maxPerOrder`), a kosár és a szerver is betartja.
- **Kapcsolat űrlap** a szerveren át: az üzenetek az admin Közösség → Üzenetek fülön, automatikus válaszlevéllel.
- **Eladási grafikon** (30 nap) és toplista az Áttekintésben, **admin jelszó csere** (PBKDF2, a Publikálás oldalon).
- **Kereső szinonimák** (pl. „etb” ↔ „elite trainer box”, „tin” ↔ „fémdoboz”).
- **Cikkek**: 13 részletes útmutató, táblázatok (mobilon kártyákká rendeződnek), „> **Tipp:**” és „> **Fontos:**” kiemelő dobozok, lenyitható „Gyakori kérdések”, tartalomjegyzék, kapcsolódó termékek, olvasási csík. A termékoldalon az állapot, nyelv, ritkaság és grading mellett „Mit jelent?” link vezet a megfelelő cikkhez.

A cikkek a katalógus `settings.posts` listájában vannak, és az adminban (Cikkek és naptár) szerkeszthetők; a mintacikkek a `public/assets/data/starter-posts.json` fájlban is megvannak.

### 5.2: belépés és publikálás a szerveren (ajánlott)
Ha a Cloudflare-ben (nscard-webshop → Settings → Variables and Secrets, Production) beállítod:

| Név | Típus | Mi ez |
|---|---|---|
| `ADMIN_PASSWORD` | Secret | az admin jelszó (legalább 12 karakter) |
| `ADMIN_USER` | Text | felhasználónév (alapból `NSadmin`) |
| `GITHUB_TOKEN` | Secret | fine-grained token a repóhoz, *Contents: Read and write* (az admin Publikálás oldalán előre kitöltött gombbal készíthető) |

…majd Deployments → Retry deployment, akkor:
- a belépést a szerver ellenőrzi (IP-nként 10 hibás próbálkozás / 15 perc), a régi, kódba épített jelszó nem enged be;
- a publikálás a szerveren át megy (`/api/admin/github`), a token a böngészőbe nem kerül le, és csak a katalógus mappája (`public/store/`) írható;
- bármelyik eszközről belépve lehet publikálni, tokent sehol nem kell beírni;
- jelszócsere: az `ADMIN_PASSWORD` értékének cseréje + Retry deployment; ekkor minden munkamenet lejár.

Beállítás nélkül minden a régi módon működik (böngészőnként beillesztett GitHub token).

### 5.3: levelezés Gmailen (infonscard@gmail.com)
A webshop levelei a bolt Gmail címéről mennek (Gmail SMTP, `smtp.gmail.com:465`), így a feladó és a válaszcím is a Gmail cím, és az elküldött levelek a Gmail „Elküldött” mappájában is megjelennek.

| Név | Típus | Érték |
|---|---|---|
| `SMTP_USER` | Text | `infonscard@gmail.com` |
| `SMTP_PASS` | Secret | Gmail **alkalmazásjelszó** (Google-fiók → Biztonság → kétlépcsős azonosítás → Alkalmazásjelszavak) |

Levelek: rendelés visszaigazolás (utalási adatokkal, tételek képpel, szállítás/számlázás, „mi történik ezután”), új rendelés értesítő a boltnak, fizetés beérkezett, csomagolva, feladva (csomagkövetéssel), teljesítve (értékelés kérés), lemondva, újra kapható, feliratkozás megerősítés + üdvözlő levél, hírlevél (List-Unsubscribe), kapcsolat űrlap (értesítő + automatikus válasz), új vélemény. Mindegyik HTML + szöveges változatban.
A Gmail napi korlátja kb. 500 címzett: a hírlevél egyszerre legfeljebb 80 címzettnek megy ki, az újbóli Küldés a hátralévőknek folytatja.
Próbalevél: admin → Beállítások → Szolgáltatások → E-mail küldés → Próbalevél küldése.
Resend továbbra is használható (`RESEND_API_KEY`), ha nincs SMTP beállítva.

### 5.4: Számlázz.hu számlázás (Számla Agent)
A számlát a Számlázz.hu is kiállíthatja (a Billingo továbbra is választható). Fizetéskor automatikusan, vagy a rendelés adatlapján egy kattintással; a Számlázz.hu e-mailben elküldi a vásárlónak, és a NAV felé is onnan megy az adatszolgáltatás.

| Név | Típus | Érték |
|---|---|---|
| `SZAMLAZZ_AGENT_KEY` | Secret | Számla Agent kulcs: Számlázz.hu → [Vezérlőpult](https://www.szamlazz.hu/szamla/?page=dashboard) → Fiók hozzáférések → Számla Agent kulcsok → kulcs ikon |

Mentés után: Deployments → Retry deployment. Az adminban: Beállítások → Számlázás (számlázó, ÁFA, előtag, automatikus számla, e-számla, kiküldés), és a Szolgáltatások listában ellenőrizhető, hogy a kulcs működik-e.

- A tételek bruttó árból, a Számlázz.hu kerekítési szabálya szerint kerülnek a számlára (27% vagy AAM); a kupon negatív tétel, a szállítás, utánvét és ajándékcsomagolás külön sor.
- A rendelésszám a számla `rendelesSzam` mezőjébe kerül. Ha a Számlázz.hu-ban be van kapcsolva a „Rendelésszám ismétlődés tiltása” (Beállítások → Számlázás és nyugtázás beállítások), egy rendelésre biztosan nem készül két számla.
- Ha a csomag nem enged e-számlát (#free), a rendszer magától papír alapú számlát állít ki, ezt a rendelésnél jelzi.
- A Számlázz.hu számla PDF-je az admin rendelés adatlapjáról letölthető.
- A Számla Agent külön díjas szolgáltatás (a #free csomag mellett is használható), a havi díj az API-val kiállított számlák számától függ.
- Kód: `lib/szamlazz.js` (Számla Agent), `lib/invoicing.js` (számlázó választás). Teszt: `node tests/szamlazz.test.mjs`.
