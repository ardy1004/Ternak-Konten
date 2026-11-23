# Ternak Konten

Ruang kendali satu operator untuk menjalankan banyak channel video pendek
(YouTube Shorts, TikTok, Instagram Reels, Facebook Pages, Threads) demi menguji
**niche mana yang menang**. Setiap channel = satu eksperimen. Tujuan produk dan
daftar layar: `docs/PRODUK.md`.

## Status

- **Fondasi frontend selesai (2026-11-23).** Semua layar jalan dengan DATA CONTOH
  dari `src/lib/mock.ts`. Belum ada backend, belum ada login sungguhan
  (sesi sementara di `sessionStorage`).
- Berikutnya: backend di Vercel — lihat "Rencana backend" di bawah.

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
                           Shell, modals, ChannelWizard, UploadSheet
  pages/                   satu file per route
  styles/index.css         token warna & komponen dasar
```

Route: `/` Ringkasan · `/channel` · `/channel/:id` ruang kerja · `/unggah` ·
`/kalender` · `/bandingkan` · `/pengaturan` · `/masuk`.

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
