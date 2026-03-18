# GitHub feltöltés lépésről lépésre

## Amit feltöltesz

A repó gyökerébe mennek ezek:

- `index.html`
- `products.html`
- `checkout.html`
- `admin.html`
- `app.js`
- `admin.js`
- `data.js`
- `styles.css`
- `catalog.json`
- `netlify.toml`
- `_redirects`
- `404.html`
- minden kép és svg fájl
- plusz a `functions/` mappa

## Webes GitHub feltöltés

### 1. Új repó vagy meglévő repó
Nyisd meg a repót GitHubon.

### 2. Upload
Kattints: **Add file** → **Upload files**

### 3. Húzd be a fájlokat
A kicsomagolt mappából húzd be:
- az összes fájlt
- és a `functions` mappát is

### 4. Commit
Írj commit üzenetet, például:
`Stripe integráció feltöltése`

### 5. Netlify
Netlifyban ellenőrizd, hogy a repo csatlakoztatva van, majd állítsd be a `STRIPE_SECRET_KEY` környezeti változót, és indíts új deployt.

## Miért kell az egy darab mappa

A Stripe secret key nem lehet kliensoldalon. Emiatt kell szerveroldali function, amit a Netlify külön function directoryból futtat.
