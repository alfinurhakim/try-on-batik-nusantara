# Try On Batik Nusantara

Pilih provinsi di peta 3D Indonesia, terbang ke kotanya, lalu nyalakan kamera. Motif batik khas daerah menempel di baju Anda secara real-time, diiringi gamelan setempat. Hasil fotonya bisa diunduh atau dibagikan.

Proyek portofolio. Versi 0.1 masih kasar: semua layar sudah tersambung, dan isinya baru 6 provinsi di Pulau Jawa.

## Menjalankan

Butuh Node.js 18+ (disarankan 20/22) dan laptop dengan webcam.

```bash
cd try-on-batik-nusantara
npm install      # sekaligus mengunduh peta batas provinsi ke public/geo/
npm run dev      # buka http://localhost:5173
```

Kamera hanya bisa dipakai lewat `http://localhost` atau `https`. Model AI (MediaPipe) diunduh dari internet saat pertama kali membuka layar try-on.

Kalau peta tampil sebagai lingkaran-lingkaran sederhana, berarti data provinsi gagal terunduh. Jalankan `npm run fetch-geo`.

## Alur

Intro → peta Indonesia (provinsi Jawa menyala, provinsi lain "segera hadir") → kamera menukik ke provinsi → pilih kota (bangunan kota tumbuh) → pilih batik → tirai batik → try-on kamera → geser untuk ganti motif → foto (hitung mundur 3 detik) → unduh/bagikan.

Pintasan di layar try-on: `←` `→` ganti motif, `Spasi` foto, `D` mode developer, `Esc` kembali.

## Efek & perjalanan (v0.2)

| Tahap | Efek |
|---|---|
| Pembuka | Awan Mega Mendung tersibak, gong + angin saat mulai |
| Peta | Cahaya senja (golden hour), debu emas melayang, laut berkilau, perahu pinisi berlayar, awan berbayang yang bisa "ditembus" kamera |
| Provinsi | Motif batik "tercelup" menyebar di permukaan provinsi saat disorot/dipilih; terbang menembus awan + gong saat mendarat |
| Kota | Bangunan kota tumbuh + landmark ikonik low-poly (Monas, Tugu Jogja, Suramadu, Kawah Ijen api biru, dll.), kenong berbunyi |
| Kartu motif | Miring 3D mengikuti kursor, kain berkibar, kilau menyapu |
| Ke kamera | Transisi gunungan wayang kulit: bayangan di kelir → wayang berwarna → diputar dalang |
| Try-on | Motif baru menyebar dari dada dengan tepi berkilau emas; lambaian tangan untuk ganti motif; kacak pinggang / angkat kedua tangan untuk foto otomatis |
| Foto | Kilat kamera, foto "tercetak" seperti polaroid, konfeti warna motif |
| Paspor Batik | Stempel per provinsi yang batiknya sudah dicoba (disimpan di browser) |

Model AI dipra-muat saat pengguna masih di peta, jadi layar kamera langsung siap.

### Tambahan v0.3

- **Latar kota virtual:** dinding di belakang Anda diganti pemandangan senja kota asal motif (Monas, Tugu Jogja, Suramadu, jemuran batik Pekalongan, awan Mega Mendung Cirebon, dll.), dengan cahaya tepi hangat.
- **Debu emas di jari:** partikel keluar dari ujung telunjuk; makin cepat tangan bergerak, makin banyak.
- **Mode berdua (sarimbit):** dua orang di depan kamera, keduanya memakai kemeja bermotif sama.
- **Slider sebelum/sesudah:** garis yang bisa digeser untuk membandingkan baju asli dan batik.
- **Narasi suara:** tombol "Dengarkan makna" membacakan filosofi motif (Web Speech API, suara Bahasa Indonesia bila tersedia di perangkat).
- **Halaman "Di balik layar":** studi kasus portofolio dengan diagram alur, demo shader interaktif memakai manekin sintetis (tanpa kamera), dan kredit.
- **Kemeja:** kerah melingkari leher (bisa digeser naik/turun), kain menutup penuh, lengan panjang, manset.

## Online-kan di Vercel

1. Unggah folder ini ke repositori GitHub (folder `node_modules` dan `dist` tidak perlu, sudah diabaikan `.gitignore`).
2. Buka [vercel.com/new](https://vercel.com/new), pilih repositori tersebut. Vercel otomatis membaca `vercel.json` (framework Vite, output `dist`).
3. Klik **Deploy**. Saat build, `npm install` otomatis mengunduh peta provinsi.
4. Setelah dapat domain (mis. `tryon-batik.vercel.app`), ubah `og:image` di `index.html` menjadi URL lengkap, misalnya `https://tryon-batik.vercel.app/og-image.png`, supaya pratinjau link di WhatsApp/LinkedIn muncul.

Alternatif lewat terminal: `npm i -g vercel` lalu jalankan `vercel` di folder ini.

Kamera hanya jalan di HTTPS, dan Vercel sudah otomatis HTTPS. `npm run typecheck` tersedia untuk pengecekan tipe sebelum deploy.

## Teknologi

| Bagian | Isi |
|---|---|
| Kerangka | Vite + React 18 + TypeScript |
| Peta 3D | Three.js via React Three Fiber; provinsi diekstrusi dari GeoJSON, kamera sinematik custom |
| Try-on | MediaPipe Tasks Vision: *Selfie Multiclass Segmentation* (kelas pakaian) + *Pose Landmarker lite*; komposit WebGL2 sendiri |
| Musik | Web Audio: gamelan sintetis (saron, bonang, gong, kendang, bedug, suling, tehyan, saronen) per provinsi |
| Motif | Placeholder prosedural di Canvas 2D (16 jenis pola); akan diganti foto motif dari dataset |

### Cara kerja try-on

1. Segmentasi menghasilkan *confidence mask* piksel pakaian (256×256) setiap frame.
2. Pose landmark bahu kiri/kanan memberi titik jangkar, sudut, dan skala tubuh, lalu dihaluskan antar-frame.
3. Shader WebGL2 menghitung koordinat motif relatif terhadap tubuh, sehingga motif ikut bergeser, miring, dan membesar/mengecil saat Anda bergerak.
4. Lipatan dan bayangan baju asli dipertahankan: warna motif dikalikan rasio luminansi piksel terhadap rata-rata luminansi pakaian.
5. Ganti motif memakai transisi "kain turun" di shader.

Mode developer menampilkan mask, kerangka pose, jangkar motif, dan FPS.

## Struktur

```
src/
  data/regions.ts        provinsi, kota, motif, makna (ubah di sini untuk menambah konten)
  motifs/patterns.ts     generator motif prosedural
  motifs/textures.ts     cache ubin & thumbnail (titik ganti ke gambar dataset)
  geo/geo.ts             memuat & mencocokkan GeoJSON provinsi
  map/MapScene.tsx       peta 3D, kamera, pin kota, bangunan
  map/MapOverlay.tsx     panel UI peta
  tryon/vision.ts        model MediaPipe
  tryon/renderer.ts      kompositor WebGL2 (shader try-on)
  tryon/TryOnView.tsx    layar kamera, swipe, hitung mundur
  tryon/shareCard.ts     kartu foto untuk dibagikan
  audio/gamelan.ts       mesin gamelan sintetis
```

## Langkah berikutnya

- Ganti motif placeholder dengan foto dari dataset (Batik Nitik 960 untuk Yogyakarta, Batik-Indonesia, koleksi Batik Lasem). Cukup ubah `getMotifTile` agar memuat gambar.
- Tambah kota & motif lain di `data/regions.ts`.
- Relief/terrain untuk peta, provinsi luar Jawa.
- Opsional: ganti gamelan sintetis dengan rekaman asli bebas royalti.
