# BeeJourney Event Organizer

Aplikasi pendaftaran event berbasis Vinext untuk Cloudflare Workers. Form publik tersedia di `/event/:slug` dan dashboard admin di `/admin`.

## Penyimpanan

- Cloudflare D1 (`DB`) menyimpan event dan data peserta.
- Cloudflare R2 (`BUCKET`) menyimpan file bukti transfer.
- Migrasi SQLite tersedia di folder `drizzle/`.
- `ADMIN_EMAILS` berisi daftar email admin yang diizinkan, dipisahkan koma.

## Menjalankan lokal

```bash
npm ci
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_damp_morlun.sql
npm run dev
```

## Pemeriksaan

```bash
./node_modules/.bin/tsc --noEmit
npm run build
```

Dashboard, API peserta, dan bukti transfer dilindungi oleh Sign in with ChatGPT serta allowlist `ADMIN_EMAILS`.
