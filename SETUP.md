# Menyambungkan database & login (sekali saja)

Tanpa langkah ini aplikasi tetap jalan dalam **mode demo** (penanda **DEMO** di
bar atas, data contoh). Setelah langkah ini selesai, penanda itu hilang dan semua
yang kamu simpan benar-benar tersimpan.

Perkiraan waktu: 15 menit.

## 1. Buat database Neon dari Vercel

1. Buka project **ternak-konten** di Vercel → tab **Storage** → **Create Database** → pilih **Neon**.
2. Region: **Singapore (ap-southeast-1)** — paling dekat ke Indonesia.
3. Saat ditanya environment, sambungkan ke **Production**.
   Vercel otomatis menambahkan variabel `DATABASE_URL`.

## 2. Buat secret login & enkripsi

Di komputer, di folder proyek:

```
pnpm install
pnpm env:siapkan
```

Isi email dan kata sandi untuk masuk ke aplikasi (minimal 12 karakter). Hasilnya
4 baris:

```
OPERATOR_EMAIL=…
OPERATOR_PASSWORD_HASH=scrypt:…
SESSION_SECRET=…
ENCRYPTION_KEY=…
```

Masukkan keempatnya di Vercel → **Settings → Environment Variables**, centang
**Production** saja.

> **Simpan `ENCRYPTION_KEY` di tempat aman** (password manager). Semua API key
> Buffer/Zernio/Cloudinary disimpan terenkripsi dengan kunci ini — kalau hilang,
> semua key harus diisi ulang.

Kenapa Production saja: deployment *preview* jadi tetap mode demo dan tidak
pernah menyentuh database sungguhan.

## 3. Buat tabel di database (migrasi)

1. Ambil nilai `DATABASE_URL` dari Vercel (Settings → Environment Variables → klik nilainya)
   atau dari dashboard Neon (**Connection string**).
2. Buat file `.env.local` di folder proyek berisi satu baris:
   ```
   DATABASE_URL=postgresql://…
   ```
   File ini tidak ikut ter-commit.
3. Jalankan:
   ```
   pnpm db:migrate
   ```
   Harus muncul **Migrasi selesai.** Aman dijalankan berulang.

## 4. Region fungsi & deploy ulang

1. Vercel → **Settings → Functions → Function Region** → **Singapore (sin1)**, supaya
   server dan database berdekatan.
2. **Deployments** → deployment terbaru → **Redeploy**.

## 5. Cek

- Buka `https://<domain-kamu>/api/health` — harus tampil
  `{"ok":true,"data":{"db":"ok","auth":true}}`.
- Buka aplikasinya: penanda **DEMO** hilang, halaman Masuk tidak lagi menampilkan
  catatan mode demo. Masuk dengan email & kata sandi dari langkah 2.

## 6. Isi Koneksi

Halaman **Koneksi** → **Tambah koneksi**:

| Layanan | Yang diisi | Diambil dari |
|---|---|---|
| Buffer | API key | Dashboard Buffer → bagian API / akses developer |
| Zernio | API key | Dashboard Zernio → bagian API |
| Cloudinary | Cloud name, API key, API secret | Dashboard Cloudinary → *Product environment* |

Tekan **Tes** sebelum menyimpan. Untuk Buffer/Zernio, tes juga mengambil daftar
akun media sosial yang tertaut — akun inilah yang nanti dipilih di setiap channel.
Lalu **Pengaturan → Storage global** → pilih akun Cloudinary bawaan.

## Kalau ada yang tidak beres

| Gejala | Penyebab paling mungkin |
|---|---|
| Masih **DEMO** | Arahkan kursor ke penanda DEMO — alasannya tertulis di sana. |
| "migrasi database belum dijalankan" | Langkah 3 belum dijalankan ke database yang sama dengan `DATABASE_URL` di Vercel. |
| "secret login belum diatur" | Salah satu dari 4 variabel di langkah 2 kosong atau tidak dicentang Production. Redeploy setelah menambah variabel. |
| `/api/health` 404 | Build tidak membuat `.vercel/output`. Di log build harus ada baris **Build Output siap**. Kirim log build-nya. |
| `/api/health` 500 | Buka Vercel → Logs, cari baris `[api]`, kirim isinya. |

## Pengembangan lokal (opsional)

```
pnpm dev:api   # terminal 1 — API + database lokal (PGlite di .data/)
pnpm dev       # terminal 2 — http://localhost:5173
```

Tanpa `.env.local`, server lokal memakai database lokal dan akun
`operator@lokal.test` / `lokal-ternak-konten`. Dengan `DATABASE_URL` di
`.env.local`, server lokal memakai database itu — **hati-hati, itu database produksi**.
