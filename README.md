# Poradatel Embed Admin

Next.js app pro spravu verejnych slug odkazu na domene `poradatel.ofiko.eu`.

## Co umi

- `/admin` prihlaseni pres admin ucet
- ulozeni dvojice `slug -> URL`
- verejna stranka `/<slug>` s full-page iframe
- fallback tlacitko pro pripady, kdy cilovy web blokuje embed
- uloziste pres private Vercel Blob nebo lokalni JSON fallback pro vyvoj

## Lokalni spusteni

```bash
cp .env.example .env.local
npm install
npm run dev
```

Pak otevri `http://localhost:3000/admin`.

## Promenne prostredi

- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `ADMIN_SESSION_SECRET`
- `BLOB_READ_WRITE_TOKEN`

Kdyz `BLOB_READ_WRITE_TOKEN` nenastavis, appka zapisuje do lokalniho souboru `data/embeds.json`.
Na Vercelu je pro produkcni persistenci potreba Blob storage pripojit.

## Nasazeni na Vercel

1. Importni repo do Vercelu.
2. V projektu vytvor Blob store a pridej `BLOB_READ_WRITE_TOKEN`.
3. Nastav `ADMIN_USERNAME`, `ADMIN_PASSWORD` a `ADMIN_SESSION_SECRET`.
4. V Domains pridej `poradatel.ofiko.eu`.
5. U DNS nastav CNAME podle instrukci z Vercelu.

Pokud cilovy web zakazuje iframe pres `X-Frame-Options` nebo CSP, zobrazi se fallback odkaz misto fungujiciho embedu.
