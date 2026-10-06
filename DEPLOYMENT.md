# BeeJourney Event Organizer

Aplikasi pendaftaran event berbasis Vinext untuk Cloudflare Workers. Form publik tersedia di `/event/:slug` dan dashboard admin di `/admin`.

## Penyimpanan eksternal

- Supabase Postgres menyimpan event dan data peserta melalui Data API/PostgREST.
- Bucket privat Supabase Storage bernama `payments` menyimpan bukti transfer.
- Upload menggunakan signed upload URL sehingga file dikirim langsung dari browser ke Supabase, tidak melewati worker aplikasi.
- Preview admin menggunakan signed URL sementara; service-role key tidak pernah dikirim ke browser.

Variabel server yang wajib tersedia:

```dotenv
SUPABASE_URL=https://PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
ADMIN_USERNAME=...
ADMIN_PASSWORD_HASH=...
ADMIN_SESSION_SECRET=...
```

`SUPABASE_DB_URL` hanya diperlukan untuk Drizzle Kit/migrasi, bukan untuk request aplikasi.

## Menjalankan lokal

```bash
npm ci
npm run dev
```

## Pemeriksaan

```bash
./node_modules/.bin/tsc --noEmit
npm run build
```

Dashboard, API peserta, dan URL bukti transfer dilindungi oleh sesi admin aplikasi.
