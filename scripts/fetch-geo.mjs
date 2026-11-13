// Mengunduh batas provinsi Indonesia (GeoJSON) ke public/geo/.
// Dijalankan otomatis setelah `npm install`; ulangi manual dengan `npm run fetch-geo`.
// Kalau gagal, aplikasi tetap jalan: browser akan mencoba mengambil dari CDN,
// dan kalau itu juga gagal, peta memakai tampilan cadangan untuk Pulau Jawa.
import { mkdir, writeFile, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outFile = join(root, 'public', 'geo', 'indonesia-provinces.geojson');
const force = process.argv.includes('--force');

const SOURCES = [
  // MIT, 34 provinsi + kode provinsi
  'https://raw.githubusercontent.com/ans-4175/peta-indonesia-geojson/master/indonesia-prov.geojson',
  'https://cdn.jsdelivr.net/gh/ans-4175/peta-indonesia-geojson@master/indonesia-prov.geojson',
  'https://raw.githubusercontent.com/superpikar/indonesia-geojson/master/indonesia-province-simple.json',
  'https://cdn.jsdelivr.net/gh/superpikar/indonesia-geojson@master/indonesia-province-simple.json',
];

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  if (!force && (await exists(outFile))) {
    console.log('[fetch-geo] Peta sudah ada, dilewati. Pakai `npm run fetch-geo` untuk mengunduh ulang.');
    return;
  }
  await mkdir(dirname(outFile), { recursive: true });
  for (const url of SOURCES) {
    try {
      console.log(`[fetch-geo] Mengunduh ${url}`);
      const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      const json = JSON.parse(text);
      if (!Array.isArray(json.features) || json.features.length < 20) {
        throw new Error('format tidak dikenali');
      }
      await writeFile(outFile, text);
      console.log(`[fetch-geo] Tersimpan: ${outFile} (${json.features.length} provinsi)`);
      return;
    } catch (err) {
      console.warn(`[fetch-geo] Gagal: ${err.message}`);
    }
  }
  console.warn('[fetch-geo] Semua sumber gagal. Aplikasi akan mencoba lagi dari browser.');
}

main().catch((err) => {
  console.warn('[fetch-geo]', err);
}).finally(() => process.exit(0));
