# NS Card – javított logóval és egységes termékkártyákkal

Ez a csomag a webshop teljes, GitHubra feltölthető verziója.

## Mi lett javítva

- új, vízszintesebb `logo-nscard.png`, hogy a fejlécben ne legyen összenyomva
- új favicon készlet a csatolt logó alapján
- a termékkártyák most fix méretűek, a képarány nem nyújtja vagy tolja szét őket
- mobilra optimalizált kosárnézet
- Stripe Checkout integráció `functions/` mappával

## Feltöltés GitHubra

A ZIP tartalmát csomagold ki, majd a benne lévő fájlokat és a `functions/` mappát együtt töltsd fel a repó gyökerébe.

## Fontos

A Stripe secret kulcsot ne tedd GitHubba. A kulcsot Netlify környezeti változóként add meg:

`STRIPE_SECRET_KEY`

Részletes leírás: `STRIPE_SETUP.md`

Frissítve: a projekt teljes zipje újragenerálva a csatolt NS Card logóval, valamint új tab/favicon ikonokkal.
Hamburger menü logó fix v2: a torzított teljes logó helyett ikon + wordmark mobil brand blokk került a menü fejlécébe.

Legutóbbi frissítés: a hamburger menü felső logóblokkja új, letisztult mobil brand megjelenést kapott külön symbol assettel (menu-mark.png).
