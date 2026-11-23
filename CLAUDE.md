# Ternak Konten

Ruang kendali satu operator untuk menjalankan banyak channel video pendek
(YouTube Shorts, TikTok, Instagram Reels, Facebook Pages, Threads) demi menguji
**niche mana yang menang**. Setiap channel = satu eksperimen. Tujuan produk dan
daftar layar: `docs/PRODUK.md`.

## Status

- **Tahap 1 UI selesai (2026-11-23).**
- **Tahap 2a backend selesai (2026-11-23):** database, login operator, Koneksi
  (secret terenkripsi + tes ke API Buffer/Zernio/Cloudinary sungguhan + akun tertaut),
  Channel (tambah/edit/hapus + rute + storage), Pengaturan. Cara menyambungkan di
  Vercel: `SETUP.md`.
- **Mode demo vs sungguhan** ditentukan otomatis lewat `/api/health`: tanpa database
  siap DAN secret login, aplikasi jalan dengan data contoh + penanda DEMO.
- Berikutnya: 2b unggah video ke Cloudinary → 2c penjadwal (Buffer/Zernio + cron).

Urutan tahap: (1) UI ✓ → (2a) backend inti ✓ → (2b) unggah → (2c) penjadwal → (3) metrik & uang (potret H+1/H+7/H+30,
follower harian, pelacak klik /r, impor CSV komisi) → (4) label konten per video →
(5) server MCP khusus baca untuk analisa oleh Claude → (6) YouTube revenue API,
riset tren, alert Telegram.

## Stack

- React 19 + React Router 8 (SPA, `BrowserRouter`) + Vite 8 + Tailwind CSS 4, pnpm.
- Server: TypeScript di `server/`, Postgres **Neon** lewat driver HTTP + **Drizzle ORM**,
  JWT (`jose`), Node `crypto` (scrypt untuk kata sandi, AES-256-GCM untuk secret).
- Deploy: **Vercel** lewat **Build Output API** — lihat "Deploy" di bawah.
- Storage video: **Cloudinary** (per channel, atau akun global).
- Scheduler: **Buffer** dan **Zernio** — provider dipilih per platform, bukan per channel.

## Perintah

```
pnpm dev            # http://localhost:5173 (meneruskan /api ke :3001)
pnpm dev:api        # API lokal :3001; tanpa DATABASE_URL memakai PGlite di .data/
pnpm typecheck      # wajib 0 error (frontend + server sekaligus)
pnpm test           # tes API: Postgres sungguhan (PGlite) + API pihak ketiga dipalsukan
pnpm build          # bundel frontend
pnpm build:vercel   # frontend + bundel fungsi → .vercel/output (perintah build Vercel)
pnpm db:generate    # buat migrasi SQL dari server/db/schema.ts
pnpm db:migrate     # terapkan migrasi ke DATABASE_URL (.env.local)
pnpm env:siapkan    # buat secret login & enkripsi untuk Vercel
pnpm db:cek         # baca saja: tabel, jumlah migrasi, jumlah baris — tanpa mencetak alamat DB
pnpm format         # oxfmt, gaya: tanpa titik koma, kutip tunggal, lebar 140
```

`.env.local` berisi alamat database PRODUKSI. Claude tidak bisa membacanya (aturan izin),
dan memang tidak perlu: skrip `migrate`/`db-cek` memuatnya sendiri tanpa mencetaknya.

Sebelum menyerahkan pekerjaan: `typecheck`, `test`, dan `build:vercel` exit 0. Jangan
menyambung gate dengan pipe (`pnpm typecheck | tail && …`) — pipe menelan exit code.

## Struktur

```
shared/contract.ts         bentuk JSON API (DTO) + nilai bawaan — dipakai server DAN frontend
server/
  app.ts, router.ts        satu pintu masuk; route default WAJIB masuk, publik harus eksplisit
  routes/                  system (health, auth), connections, channels, settings
  db/schema.ts, client.ts  skema Drizzle; Neon di produksi, PGlite di tes & lokal (setDb)
  crypto.ts, session.ts    hash kata sandi, enkripsi secret, JWT ber-scope
  providers.ts             klien Buffer (GraphQL), Zernio (REST), Cloudinary (usage)
  node-handler.ts          jembatan Node req/res ↔ Request/Response (Vercel & lokal)
  vercel-entry.ts          titik masuk fungsi yang dibundel
  api.test.ts              tes API
drizzle/                   migrasi SQL (hasil db:generate) — di-commit
scripts/                   build-vercel, dev-api, migrate, siapkan-env
src/
  main.tsx, App.tsx        boot (deteksi mode), router, gerbang masuk, modal & sheet global
  app/context.tsx          toast, modal, mode, reload(), demoOnly(), signOut()
  app/hooks.ts             useChannelAuto
  lib/api.ts               klien API (amplop diperiksa, bukan dipercaya), detectMode, loadLive
  lib/store.ts             STORE: data hidup + aturan bisnis; loadSample() / hydrateLive()
  lib/sample.ts            data contoh mode demo — tidak pernah dipakai di mode sungguhan
  lib/types.ts             tipe domain (Channel, Video, …)
  lib/format.ts            format angka/jam Indonesia — selalu pakai ini
  components/              Icon, ui (primitif), domain (glyph tahap, poster, …),
                           Shell, modals, ChannelWizard (tambah & edit),
                           ConnectionSheet, UploadSheet
  pages/                   satu file per route
  styles/index.css         token warna & komponen dasar
```

Route operator (wajib masuk): `/` Ringkasan · `/channel` · `/channel/:id` ruang kerja ·
`/unggah` · `/kalender` · `/bandingkan` · `/pendapatan` · `/koneksi` · `/pengaturan` ·
`/lainnya` (menu ponsel) · `/masuk`.

Route **publik** (tanpa masuk, tanpa sidebar): `/l/:channelId` halaman link-in-bio ·
`/r/:code` pengalih link afiliasi (di backend: catat klik lalu 302). Halaman publik
tidak boleh menampilkan apa pun yang internal — hipotesis, tahap, angka, nama aplikasi.

Halaman membaca data HANYA dari `src/lib/store.ts`. Setelah mengubah data lewat API,
panggil `reload()` dari context — store diisi ulang dan semua halaman dirender ulang.
Daftar yang diturunkan dari store (mis. koneksi Cloudinary) WAJIB dihitung saat render,
bukan di tingkat modul: di mode sungguhan isinya datang dari server setelah modul dimuat.

Aksi yang belum punya backend memanggil `demoOnly(pesanDemo, namaFitur)`: di demo
menampilkan pesan contoh, di mode sungguhan berkata terus terang "belum tersambung".
Jangan pernah menampilkan "berhasil" untuk sesuatu yang tidak tersimpan.

## Bahasa visual "Papan Ladang" — wajib dijaga

- Kertas `--paper` + tinta `--ink` + **satu** aksen tomat. Warna datang dari poster video.
- Font: Bricolage Grotesque (judul), Geist (UI), **Geist Mono untuk setiap angka, jam, ID**.
- Kontainer dibentuk garis tinta 1,5px atau garis rambut, bukan bayangan.
- **Dilarang** (membuat tampilan seperti buatan AI): gradien, efek kaca, glow,
  ungu/indigo, emoji di UI, ikon ✨, deretan 4 kartu KPI identik, kartu bergaris
  kiri berwarna, sapaan "Welcome back", semua elemen jadi kartu bulat.
- Status selalu **ikon/glyph + label**, tidak pernah warna saja.
- Warna status dipakai sebagai teks kecil → **wajib kontras ≥ 4,5:1** di terang
  dan gelap. Amber, hijau, dan semua warna status mode malam sudah digeser
  karena gagal uji ini; ukur ulang bila mengubah token.
- Teks UI Bahasa Indonesia. Angka lewat `lib/format.ts` (1.284.300 · 1,8× · 19.05).
- Elemen `fixed` di dasar layar wajib `env(safe-area-inset-bottom, 0px)`.
  `viewport-fit=cover` di `index.html` adalah prasyaratnya.
- Lebar sidebar hanya lewat variabel `--sidebar-w` (diatur kelas `.shell`/`.rail`).
  Apa pun yang menempel ke tepi kiri konten (mis. bar aksi massal) membacanya.

## Aturan bisnis

- **Ukuran menang = uang.** Monetisasi lewat afiliasi (Shopee Affiliate, TikTok Shop)
  dan monetisasi platform (YouTube, TikTok Creator Rewards, Facebook).
  ROI = pendapatan bulan berjalan ÷ biaya per bulan.
- **Kredensial hidup di Koneksi, bukan di channel.** Channel menyimpan rujukan
  `routes[platform] = { connectionId, profileId }` dan `storageId`. Satu koneksi
  Buffer/Zernio/Cloudinary bisa dipakai banyak channel; koneksi yang masih dipakai
  tidak boleh dihapus.
- **Akun ganda dideteksi dari handle akun platform**, bukan ID provider — akun yang
  sama bisa tertaut di Buffer DAN Zernio dengan ID berbeda.
- **Syarat monetisasi tidak boleh ditanam di logika** — berubah dari waktu ke waktu dan
  berbeda per negara. Bawaan di `MONETIZATION_RULES`, diubah operator di Pengaturan.
- Kode link pendek (`/r/:code`) = Sub ID di program afiliasi, supaya laporan komisi
  CSV cocok otomatis ke channel.
- Pendapatan selalu disimpan dalam Rupiah; USD dikonversi saat dicatat dengan kurs
  yang diatur operator.
- Kata sandi akun media sosial tidak pernah disimpan — akun disambungkan di Buffer/Zernio.

- Masa uji selesai bila **hari DAN jumlah video** tercapai — channel yang jarang
  diisi tidak boleh "gagal" hanya karena kurang konten.
- Antar niche dibandingkan **pada umur akun yang sama** (hari ke-N sejak post
  pertama), bukan tanggal kalender.
- Indeks video = views hari ke-7 ÷ median channel + platform yang sama. Tidak ada skor AI.
- Kelompok dengan sampel < 5 ditandai "sampel kecil", tidak diberi peringkat.

## Aturan untuk backend — wajib sejak awal

- **"Belum pasti" ≠ "Gagal".** Timeout, 5xx, atau 409 dari Buffer/Zernio berarti
  post *mungkin* sudah dibuat. Dikonfirmasi operator, **tidak pernah diulang otomatis**.
- Video yang sudah dikirim ke scheduler tidak bisa kembali ke antrean atau
  dipindah channel — akan tayang dua kali.
- Tolak/peringatkan bila satu akun tujuan dipakai lebih dari satu channel.
- Poster video dibuat **di browser** saat unggah (frame dari `<video>` ke canvas),
  bukan transformasi Cloudinary — transformasi video ditagih per detik durasi.
- Hash file (SHA-256) dihitung di browser saat unggah, untuk mendeteksi video
  yang dipakai ulang di channel lain.
- Secret (API key Buffer/Zernio/Cloudinary) tidak pernah dikirim utuh ke browser;
  tampil ter-mask. Field secret yang dikosongkan saat edit = pertahankan nilai lama.
- Cron: anggaran waktu **disisihkan di awal** (bukan sekadar dicek), dan semua
  channel **bergiliran** tiap putaran. Urutan tetap per id = channel terakhir tak pernah kebagian.
- Slot diklaim per **(tanggal, jendela)**, bukan nomor urut.
- Kesehatan akun (gagal tayang, login kedaluwarsa, basi) ditarik rutin dan tampil
  di Ringkasan — post berstatus "terjadwal" belum tentu tayang.

## Backend — aturan yang sudah berlaku

- **Semua `/api/*` = SATU fungsi Vercel** (`server/vercel-entry.ts`). Router sendiri di
  `server/router.ts`. Paket Hobby menolak deploy berisi lebih dari 12 fungsi.
- **Deploy lewat Build Output API**: `pnpm build:vercel` menulis `.vercel/output/`
  (static dari `dist/`, fungsi dibundel esbuild jadi satu `index.mjs`, routing di
  `config.json`). Alasan: fungsi di folder `api/` yang mengimpor file di luar `api/`
  dilaporkan gagal di runtime (`ERR_MODULE_NOT_FOUND`) walau build sukses. Bundel satu
  file tidak punya impor relatif yang harus dipecahkan Vercel, dan bisa diuji lokal
  dari folder terisolasi tanpa `node_modules`. **Jangan membuat folder `api/`.**
- Impor relatif di `server/` & `shared/` memakai ekstensi `.js` (gaya ESM Node).
- **SETIAP JWT ber-`scope`, `verifyToken` WAJIB diberi scope.** Tiket jenis lain kelak
  ditandatangani secret yang sama — tanda tangan sah bukan bukti jenis token.
- CSRF: cookie `SameSite=Strict` + header `Origin` harus sama dengan host (dibaca juga
  dari `Host`/`X-Forwarded-Host`, karena di balik proxy URL fungsi bisa host internal).
  Proxy Vite WAJIB `changeOrigin: false`, kalau tidak semua POST lokal 403.
- Driver Neon HTTP **tidak punya transaksi interaktif**. Tulis banyak baris dengan
  urutan yang aman bila gagal di tengah (tambah/perbarui dulu, baru hapus).
- Respons API selalu amplop `{ ok, data } | { ok:false, error }`; pesan galat dalam
  bahasa operator. Galat tak terduga → 500 generik + `console.error('[api] …')`.
- Mengubah skema: edit `server/db/schema.ts` → `pnpm db:generate` → commit file di
  `drizzle/` → `pnpm db:migrate` ke database produksi SEBELUM deploy kode yang memakainya.
- Akun tertaut yang hilang dari provider tapi masih dipakai channel ditandai `missing`,
  tidak dihapus — menghapusnya mematahkan rute channel.

## Rencana tahap berikutnya

- **Unggah (2b)**: browser → Cloudinary langsung (signed upload; tanda tangan dibuat
  API dengan secret channel). File tidak lewat Vercel Function.
- **Penjadwal (2c)**: Vercel Cron (lewat `crons` di `.vercel/output/config.json`). Paket Hobby hanya **sekali sehari** (meleset ±59
  menit) dan fungsi maks **300 detik**. Karena itu cron mengirim semua post 24 jam
  ke depan ke Buffer/Zernio **lengkap dengan jamnya** — yang menahan jadwal adalah
  provider, bukan cron kita. Ditambah tombol "Proses sekarang" manual.
  Paket Pro mengizinkan cron per menit bila kelak dibutuhkan.
