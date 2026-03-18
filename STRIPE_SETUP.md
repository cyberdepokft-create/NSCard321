# Stripe beállítás – NS Card

A projektben a Stripe fizetés már be van építve. A vásárló a webshopból egy Netlify Functionön keresztül jut át a Stripe Checkout oldalára.

## Kötelező fájlok

- `functions/create-checkout-session.js`
- `functions/checkout-session.js`
- `netlify.toml`

## Amit neked kell megadnod

Netlifyban hozz létre egy környezeti változót:

- `STRIPE_SECRET_KEY`

Ide a Stripe **secret key** kerül.

## Bekötés lépésről lépésre

1. Csomagold ki a ZIP-et.
2. GitHubon töltsd fel **az összes fájlt** és a **`functions/` mappát** is a repo gyökerébe.
3. Netlifyban importáld a GitHub repót.
4. A site beállításainál add hozzá a `STRIPE_SECRET_KEY` környezeti változót.
5. Indíts új deployt.
6. Nyisd meg az oldalt, tegyél legalább egy megvásárolható terméket a kosárba.
7. Töltsd ki a pénztár kötelező mezőit.
8. Kattints a **Tovább a fizetéshez** gombra.
9. A rendszer létrehoz egy Stripe Checkout Sessiont, majd átirányít a Stripe fizetési oldalára.

## Mit ellenőriz a szerveroldal

A function a `catalog.json` alapján újraellenőrzi:

- létezik-e a termék
- helyes-e az ár
- van-e készlet
- a termék nem `hamarosan` státuszú-e

## Fontos biztonság

A secret key ne kerüljön:
- GitHub repóba
- HTML-be
- kliensoldali JavaScriptbe

Ha a kulcs korábban képen vagy chatben látszott, vond vissza és készíts újat.

## Végpontok

- `POST /api/create-checkout-session`
- `GET /api/checkout-session?session_id=...`
