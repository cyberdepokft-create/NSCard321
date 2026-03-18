# NS Card – Netlify használat

1. Kösd össze a repót Netlify-jal.
2. Nyisd meg az `admin.html` oldalt.
3. Töltsd ki az adminban a GitHub kapcsolatot: owner, repo, branch (`main`), path (`catalog.json`), token.
4. Ments egy terméket.
5. A mentés automatikusan frissíti a `catalog.json` és `sync-config.json` fájlokat GitHubon.
6. A **„Netlify megnyitása előre kitöltve”** gomb továbbra is használható az első telepítéshez, ahol a `branch=main` és a `base=.` előre beállítható.

Ez a csomag teljesen lapos: a ZIP-ben minden fájl a gyökérben van, nincs benne almappa.
