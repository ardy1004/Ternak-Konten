# Ternak Konten

Ruang kendali satu operator untuk menjalankan banyak channel video pendek
(YouTube Shorts, TikTok, Instagram Reels, Facebook Pages, Threads) demi menguji
**niche mana yang menang**. Setiap channel = satu eksperimen. Tujuan produk dan
daftar layar: `docs/PRODUK.md`.

## Status

- **Fondasi frontend selesai (2026-11-23).** Semua layar jalan dengan DATA CONTOH
  dari `src/lib/mock.ts`. Belum ada backend, belum ada login sungguhan
  (sesi sementara di `sessionStorage`).
- **Tahap 1 UI selesai (2026-11-23):** Koneksi (bank kredensial), Edit Channel,
  Pendapatan (afiliasi + monetisasi + ROI), link-in-bio publik, "Jalan ke monetisasi",
  syarat monetisasi & kurs di Pengaturan.
- Berikutnya: tahap 2 backend di Vercel — lihat "Rencana backend" di bawah.

Urutan tahap: (1) UI ✓ → (2) backend inti → (3) metrik & uang (potret H+1/H+7/H+30,
follower harian, pelacak klik /r, impor CSV komisi) → (4) label konten per video →
(5) server MCP khusus baca untuk analisa oleh Claude → (6) YouTube revenue API,
riset tren, alert Telegram.

## Stack

- React 19 + React Router 8 (SPA, `BrowserRouter`) + Vite 8 + Tailwind CSS 4, pnpm.
- Deploy: **Vercel**. `vercel.json` mengalihkan semua path non-`/api` ke `index.html`.
- Storage video: **Cloudinary** (per channel, atau akun global).
- Scheduler: **Buffer** dan **Zernio** — provider dipilih per platform, bukan per channel.

## Perintah

```
pnpm dev         # http://localhost:5173
pnpm typecheck   # wajib 0 error
pnpm build       # wajib 0 error
pnpm format      # oxfmt, gaya: tanpa titik koma, kutip tunggal, lebar 140
```

Sebelum menyerahkan pekerjaan: `typecheck` dan `build` keduanya exit 0. Jangan
menyambung gate dengan pipe (`pnpm typecheck | tail && …`) — pipe menelan exit code.

## Struktur

```
src/
  main.tsx, App.tsx        router, gerbang masuk, modal & sheet global
  app/context.tsx          toast, modal, auto-posting, mode malam
  lib/types.ts             tipe domain (Channel, Video, …)
  lib/format.ts            format angka/jam Indonesia — selalu pakai ini
  lib/mock.ts              DATA CONTOH + aturan bisnis sebagai fungsi murni
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

**Saat backend datang, cukup `src/lib/mock.ts` yang diganti** dengan pemanggilan
API. Halaman tidak boleh membuat data sendiri. Aturan bisnis di sana (stok,
rekomendasi, vonis, masa uji) dipindah ke server, bukan dihapus.

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

## Rencana backend (menunggu persetujuan)

- **API**: Vercel Functions di `api/` (Node.js, TypeScript).
- **Database**: Postgres lewat Neon (integrasi Vercel Marketplace) + Drizzle ORM.
- **Login**: satu operator; JWT di cookie `httpOnly; Secure; SameSite=Strict`,
  setiap token ber-`scope` dan diverifikasi dengan scope wajib.
- **Secret per channel**: dienkripsi AES-GCM dengan kunci di env Vercel.
- **Unggah**: browser → Cloudinary langsung (signed upload; tanda tangan dibuat
  API dengan secret channel). File tidak lewat Vercel Function.
- **Penjadwal**: Vercel Cron. Paket Hobby hanya **sekali sehari** (meleset ±59
  menit) dan fungsi maks **300 detik**. Karena itu cron mengirim semua post 24 jam
  ke depan ke Buffer/Zernio **lengkap dengan jamnya** — yang menahan jadwal adalah
  provider, bukan cron kita. Ditambah tombol "Proses sekarang" manual.
  Paket Pro mengizinkan cron per menit bila kelak dibutuhkan.
