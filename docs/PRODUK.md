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

- **Views per post (median)** dan **followers per hari** — ukuran menang.
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
| `/pengaturan` | Pengaturan | Mode akun, masa uji bawaan, biaya alat, jendela primetime, otomasi, storage global, notifikasi, log |

## Integrasi

- **Cloudinary** — tempat file video & poster. Per channel atau akun global.
- **Buffer / Zernio** — pengirim post ke platform. Provider dipilih per platform
  per channel (mis. YouTube lewat Buffer, Instagram lewat Zernio).
- Metrik ditarik dari Buffer & Zernio, bukan dari API platform langsung.
