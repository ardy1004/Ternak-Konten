# Ternak Konten — Produk

## Tujuan

Punya banyak channel di semua medsos untuk **menguji niche mana yang menang**.
Setiap channel adalah eksperimen: satu niche + satu format, dengan masa uji dan
target lulus. Yang menang diberi konten lebih banyak; yang kalah dipangkas.

Pertanyaan yang harus terjawab sekali lihat:

> **Niche mana yang menang, mana yang perlu dipangkas, dan mana yang kehabisan konten?**

## Pengguna

Satu operator. Konten dibuat di luar aplikasi (generator video AI, editor video);
aplikasi ini mengurus **distribusi, penjadwalan, dan pengukuran**.

## Tahap eksperimen

| Tahap | Glyph | Arti |
|---|---|---|
| Bibit | lingkaran kosong | masa uji berjalan |
| Tumbuh | setengah terisi | lulus target awal, terus diberi konten |
| Panen | penuh, tomat | pemenang terbukti |
| Dipangkas | lingkaran silang | dihentikan; data & akun disimpan |

Masa uji selesai bila hari **dan** jumlah video tercapai (bawaan 30 hari / 30
video). Saat itu muncul keputusan: **Lanjutkan / Ubah format / Pangkas**.

## Metrik utama

- **ROI = pendapatan ÷ biaya** — ukuran menang yang sesungguhnya. Pendapatan dari
  afiliasi (Shopee Affiliate, TikTok Shop) dan monetisasi platform.
- **Jalan ke monetisasi** — kemajuan tiap channel menuju syarat program monetisasi
  platform (syaratnya bisa diatur).
- **Views per post (median)** dan **followers per hari** — sinyal awal sebelum uang datang.
- **Stok antrean (hari)** — berapa lama channel bisa terus posting.
- **Biaya per niche** — Buffer menagih per channel, 10 niche × 5 platform = 50 channel.
- Perbandingan antar niche selalu **pada umur akun yang sama**.

## Layar

| Route | Layar | Isi utama |
|---|---|---|
| `/` | Ringkasan | Kalimat pembuka ("2 niche siap panen…"), keputusan menunggu, Papan Niche, perlu tindakan, stok antrean, post berikutnya, kesehatan akun |
| `/channel` | Channel | Papan per tahap / tabel; wizard Tambah Channel (Identitas → Eksperimen → Storage → Scheduler → Jadwal) |
| `/channel/:id` | Ruang kerja | Rapor eksperimen, slot hari ini, antrean (geser urutan, pilih rentang, aksi massal, menu klik kanan), Terjadwal, Tayang, Sampah |
| `/unggah` | Unggah Massal | Unggah sekali, bagi ke banyak channel; peringatan otomatis (dipakai ulang, durasi, rasio, panjang caption) |
| `/kalender` | Kalender | Minggu / Hari / Daftar; penanda bentrok akun; kapasitas slot per hari |
| `/bandingkan` | Bandingkan Niche | Kurva kohort per hari ke-N, titik periksa H+7/14/30/60, biaya per 1.000 views, pola, video teratas |
| `/pendapatan` | Pendapatan | Pendapatan bulan ini & ROI per channel, link afiliasi + halaman link-in-bio, catat pendapatan manual (Rp/USD), impor komisi CSV, program monetisasi yang paling dekat |
| `/koneksi` | Koneksi | Bank kredensial: akun Buffer, Zernio, Cloudinary; status tes, akun media sosial tertaut, pemakaian kuota, peringatan akun dipakai dua channel |
| `/pengaturan` | Pengaturan | Mode akun, masa uji bawaan, biaya & kurs, syarat monetisasi, jendela primetime, otomasi, storage global, notifikasi, log |
| `/l/:channel` | Link-in-bio (publik) | Daftar produk afiliasi satu channel untuk penonton; setiap klik lewat `/r/:kode` |

## Integrasi

Semua kredensial didaftarkan sekali di **Koneksi**; channel hanya memilih.

- **Cloudinary** — tempat file video & poster. Bisa beberapa akun untuk membagi kuota.
- **Buffer / Zernio** — pengirim post ke platform. Bisa beberapa akun; provider dipilih
  per platform per channel (mis. YouTube lewat Buffer, Instagram lewat Zernio).
- **Program afiliasi** — komisi diimpor dari laporan CSV, dicocokkan lewat Sub ID.
- Metrik ditarik dari Buffer & Zernio, bukan dari API platform langsung.
