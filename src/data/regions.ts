import type { City, Motif, Province, ProvinceId } from '../types';

/**
 * Data versi pertama: hanya 6 provinsi di Pulau Jawa yang aktif.
 * Motif masih placeholder buatan kode (lihat src/motifs/patterns.ts);
 * nanti diganti foto motif dari dataset publik.
 */

export const PROVINCES: Province[] = [
  {
    id: 'banten',
    name: 'Banten',
    blurb: 'Batik Banten menghidupkan kembali ragam hias dari artefak Kesultanan Banten Lama, dengan warna-warna lembut keabu-abuan.',
    music: 'rampak-bedug',
    musicLabel: 'Rampak bedug',
    color: '#c77b4a',
    center: [106.15, -6.45],
    span: 1.5,
  },
  {
    id: 'jakarta',
    name: 'DKI Jakarta',
    blurb: 'Batik Betawi tumbuh dari kota pelabuhan yang ramai: warnanya cerah, motifnya memadukan pengaruh Tionghoa, Arab, dan Eropa.',
    music: 'gambang-kromong',
    musicLabel: 'Gambang kromong',
    color: '#d9a441',
    center: [106.83, -6.2],
    span: 0.7,
  },
  {
    id: 'jabar',
    name: 'Jawa Barat',
    blurb: 'Dari awan Mega Mendung di Cirebon hingga warna gumading Garutan, batik Sunda terasa ringan dan terbuka.',
    music: 'degung',
    musicLabel: 'Degung Sunda',
    color: '#4f7a6a',
    center: [107.75, -6.95],
    span: 2.6,
  },
  {
    id: 'jateng',
    name: 'Jawa Tengah',
    blurb: 'Pusat batik keraton Solo bertemu batik pesisir Pekalongan dan Lasem yang berwarna berani.',
    music: 'gamelan-jateng',
    musicLabel: 'Gamelan Jawa Tengah',
    color: '#9b4a2c',
    center: [110.05, -7.15],
    span: 3.1,
  },
  {
    id: 'diy',
    name: 'DI Yogyakarta',
    blurb: 'Batik klasik keraton Yogyakarta: Kawung, Parang, dan Nitik dengan latar putih dan cokelat soga yang tegas.',
    music: 'gamelan-jogja',
    musicLabel: 'Gamelan Yogyakarta',
    color: '#6b4226',
    center: [110.42, -7.85],
    span: 0.9,
  },
  {
    id: 'jatim',
    name: 'Jawa Timur',
    blurb: 'Dari Gentongan Madura, Gedog Tuban, hingga Gajah Oling Banyuwangi: batik Jawa Timur kaya warna dan berkarakter kuat.',
    music: 'gamelan-jatim',
    musicLabel: 'Gamelan Jawa Timuran & saronen',
    color: '#2f4a6d',
    center: [112.85, -7.55],
    span: 4.0,
  },
];

export const CITIES: City[] = [
  { id: 'serang', name: 'Serang', provinceId: 'banten', lon: 106.15, lat: -6.12, blurb: 'Bekas pusat Kesultanan Banten.' },
  { id: 'jakarta', name: 'Jakarta', provinceId: 'jakarta', lon: 106.85, lat: -6.2, blurb: 'Tanah Betawi, kota pelabuhan Sunda Kelapa.' },
  { id: 'cirebon', name: 'Cirebon', provinceId: 'jabar', lon: 108.55, lat: -6.71, blurb: 'Kampung batik Trusmi, rumah Mega Mendung.' },
  { id: 'garut', name: 'Garut', provinceId: 'jabar', lon: 107.9, lat: -7.21, blurb: 'Batik Garutan dengan warna krem gumading yang lembut.' },
  { id: 'tasikmalaya', name: 'Tasikmalaya', provinceId: 'jabar', lon: 108.22, lat: -7.33, blurb: 'Batik Tasikan bermotif flora yang segar.' },
  { id: 'ciamis', name: 'Ciamis', provinceId: 'jabar', lon: 108.42, lat: -7.42, blurb: 'Batik Ciamisan yang sederhana dan bersahaja.' },
  { id: 'solo', name: 'Solo', provinceId: 'jateng', lon: 110.82, lat: -7.57, blurb: 'Kota keraton Surakarta dan Kampung Batik Laweyan.' },
  { id: 'pekalongan', name: 'Pekalongan', provinceId: 'jateng', lon: 109.68, lat: -6.89, blurb: 'Kota Batik di pesisir utara yang penuh warna.' },
  { id: 'lasem', name: 'Lasem', provinceId: 'jateng', lon: 111.45, lat: -6.69, blurb: 'Batik pesisir berakulturasi Tionghoa, terkenal dengan merah darah ayam.' },
  { id: 'yogyakarta', name: 'Yogyakarta', provinceId: 'diy', lon: 110.37, lat: -7.8, blurb: 'Kota keraton Ngayogyakarta Hadiningrat.' },
  { id: 'bantul', name: 'Bantul', provinceId: 'diy', lon: 110.33, lat: -7.93, blurb: 'Sentra batik tulis Giriloyo dan Imogiri.' },
  { id: 'madura', name: 'Bangkalan (Madura)', provinceId: 'jatim', lon: 112.95, lat: -6.95, blurb: 'Tanjung Bumi, kampung batik Gentongan.' },
  { id: 'tuban', name: 'Tuban', provinceId: 'jatim', lon: 112.05, lat: -6.9, blurb: 'Batik Gedog yang dibatik di atas kain tenun tangan.' },
  { id: 'banyuwangi', name: 'Banyuwangi', provinceId: 'jatim', lon: 114.37, lat: -8.22, blurb: 'Ujung timur Jawa, tanah Using dan Gajah Oling.' },
];

const P = (bg: string, primary: string, secondary: string, accent: string) => ({ bg, primary, secondary, accent });

export const MOTIFS: Motif[] = [
  // Banten
  { id: 'banten-datulaya', name: 'Datulaya', cityId: 'serang', kind: 'ceplok', palette: P('#e9e4dc', '#7d8fa3', '#b88f8a', '#5c6b7a'),
    meaning: 'Salah satu motif Batik Banten yang namanya diambil dari situs Banten Lama. Ragam hiasnya bersumber dari temuan arkeologi kesultanan.' },
  { id: 'banten-pasepen', name: 'Pasepen', cityId: 'serang', kind: 'floral', palette: P('#e4e0e8', '#8a7aa0', '#7f9c8a', '#5a4d6b'),
    meaning: 'Motif Batik Banten bernuansa flora dengan warna pastel keabu-abuan yang menjadi ciri khas batik daerah ini.' },
  // Jakarta
  { id: 'betawi-pucuk-rebung', name: 'Tumpal Pucuk Rebung', cityId: 'jakarta', kind: 'tumpal', palette: P('#fbf3e4', '#d2452f', '#2b8a7e', '#f2b134'),
    meaning: 'Deretan segitiga tumpal menyerupai pucuk rebung: lambang harapan tumbuh dan berkembang seperti bambu muda.' },
  { id: 'betawi-ondel', name: 'Ondel-ondel Ceria', cityId: 'jakarta', kind: 'floral', palette: P('#fff4e0', '#e0583a', '#3a7d44', '#f0b52f'),
    meaning: 'Warna-warna cerah khas Betawi yang terinspirasi kemeriahan ondel-ondel, boneka besar penjaga kampung.' },
  // Jawa Barat
  { id: 'cirebon-megamendung', name: 'Mega Mendung', cityId: 'cirebon', kind: 'megamendung', palette: P('#f5efe3', '#1f3c6e', '#7aa6d1', '#e6eef7'),
    meaning: 'Awan bergradasi yang membawa hujan dan kesejukan: lambang kesabaran dan kepala dingin dalam menghadapi masalah.' },
  { id: 'cirebon-megamendung-merah', name: 'Mega Mendung Merah', cityId: 'cirebon', kind: 'megamendung', palette: P('#a8322d', '#1f3c6e', '#7aa6d1', '#f3e7d3'),
    meaning: 'Varian Mega Mendung berlatar merah, sering dikaitkan dengan pengaruh budaya Tionghoa di pesisir Cirebon.' },
  { id: 'garut-lereng', name: 'Garutan Lereng', cityId: 'garut', kind: 'lereng', palette: P('#efe1bf', '#8a6a3b', '#c49a5a', '#5a4630'),
    meaning: 'Garis miring bergaya lereng dengan warna gumading (krem kekuningan) yang menjadi identitas batik Garutan.' },
  { id: 'tasik-flora', name: 'Tasikan Flora', cityId: 'tasikmalaya', kind: 'floral', palette: P('#f6efe2', '#b0413e', '#4f7a5a', '#e2a63b'),
    meaning: 'Batik Tasikmalaya gemar menampilkan bunga dan dedaunan dengan warna segar.' },
  { id: 'ciamis-ciamisan', name: 'Ciamisan', cityId: 'ciamis', kind: 'kricak', palette: P('#f4ead6', '#6b4a2b', '#a7835a', '#3b2a1e'),
    meaning: 'Batik Ciamisan dikenal sederhana dengan perpaduan cokelat soga dan putih yang tenang.' },
  // Jawa Tengah
  { id: 'solo-sidomukti', name: 'Sidomukti', cityId: 'solo', kind: 'sidomukti', palette: P('#efe2c8', '#6b4226', '#3b2a1e', '#b88a4a'),
    meaning: '"Sido" berarti jadi, "mukti" berarti mulia dan sejahtera. Sering dipakai pengantin sebagai doa bagi kehidupan yang bahagia.' },
  { id: 'solo-truntum', name: 'Truntum', cityId: 'solo', kind: 'truntum', palette: P('#3b2a1e', '#f1e3c4', '#c99a3b', '#8a5a33'),
    meaning: 'Bunga-bunga kecil seperti bintang: lambang cinta yang tumbuh kembali. Biasa dikenakan orang tua pengantin.' },
  { id: 'pekalongan-jlamprang', name: 'Jlamprang', cityId: 'pekalongan', kind: 'jlamprang', palette: P('#fbf1df', '#c2362f', '#2f6f8f', '#f0b52f'),
    meaning: 'Motif geometris khas Pekalongan yang dipengaruhi kain patola India, tersusun dari lingkaran dan bintang bersudut.' },
  { id: 'pekalongan-buketan', name: 'Buketan', cityId: 'pekalongan', kind: 'floral', palette: P('#f7f1e6', '#c94f6d', '#5b8c5a', '#7b5ea7'),
    meaning: 'Rangkaian bunga (dari kata "bouquet") hasil pengaruh Eropa pada batik pesisir Pekalongan.' },
  { id: 'lasem-latohan', name: 'Latohan', cityId: 'lasem', kind: 'latohan', palette: P('#b3282d', '#f3e3c3', '#2a4b3c', '#e8b04a'),
    meaning: 'Latoh adalah rumput laut yang banyak di pesisir Lasem. Dibatik di atas merah khas Lasem yang disebut "abang getih pitik".' },
  { id: 'lasem-kricak', name: 'Watu Pecah (Kricak)', cityId: 'lasem', kind: 'kricak', palette: P('#f1e4c8', '#9e2a2b', '#3a2b20', '#d9a441'),
    meaning: 'Batu-batu pecah yang mengingatkan pada kerja berat membangun Jalan Raya Pos di masa kolonial.' },
  // DI Yogyakarta
  { id: 'jogja-kawung', name: 'Kawung', cityId: 'yogyakarta', kind: 'kawung', palette: P('#f3e8d2', '#5a3a22', '#2d1f14', '#c99a3b'),
    meaning: 'Empat bulatan seperti buah aren yang dibelah: lambang kesucian, keadilan, dan hati yang bersih.' },
  { id: 'jogja-parang', name: 'Parang Rusak', cityId: 'yogyakarta', kind: 'parang', palette: P('#f3e6cc', '#3b2a1e', '#7a4a26', '#e8d5ae'),
    meaning: 'Garis miring seperti ombak yang tak pernah putus: semangat pantang menyerah dan perjuangan yang terus-menerus.' },
  { id: 'jogja-nitik', name: 'Nitik', cityId: 'yogyakarta', kind: 'nitik', palette: P('#f4ead6', '#4a2f1b', '#8a5a33', '#2d1f14'),
    meaning: 'Tersusun dari titik-titik kecil yang meniru anyaman kain tenun patola, dikerjakan dengan canting bercucuk khusus.' },
  { id: 'bantul-ceplok', name: 'Ceplok Kembang', cityId: 'bantul', kind: 'ceplok', palette: P('#efe2c8', '#5a3a22', '#a8743f', '#2d1f14'),
    meaning: 'Motif ceplok tersusun dari bunga-bunga simetris yang berulang, seperti yang banyak dibatik di sentra Giriloyo.' },
  // Jawa Timur
  { id: 'madura-gentongan', name: 'Gentongan', cityId: 'madura', kind: 'gentongan', palette: P('#1f3b5c', '#d43d32', '#3f8c5a', '#f2c14e'),
    meaning: 'Dinamai dari gentong tanah liat tempat kain direndam pewarna berbulan-bulan, menghasilkan warna yang sangat awet.' },
  { id: 'tuban-gedog', name: 'Gedog', cityId: 'tuban', kind: 'gedog', palette: P('#24395a', '#f1e7d2', '#7b9bc4', '#c94f3d'),
    meaning: 'Batik di atas kain tenun gedog, ditenun dengan alat yang berbunyi "dog-dog". Biru indigo menjadi warna khasnya.' },
  { id: 'banyuwangi-gajaholing', name: 'Gajah Oling', cityId: 'banyuwangi', kind: 'gajaholing', palette: P('#f4ecdc', '#2b2b2b', '#b5352d', '#3f7a4a'),
    meaning: 'Bentuk melengkung seperti tanda tanya, gabungan belalai gajah dan belut (oling): pengingat untuk selalu eling, ingat kepada Tuhan.' },
];

export const provinceById = (id: ProvinceId | null | undefined) => PROVINCES.find((p) => p.id === id) ?? null;
export const cityById = (id: string | null | undefined) => CITIES.find((c) => c.id === id) ?? null;
export const motifById = (id: string | null | undefined) => MOTIFS.find((m) => m.id === id) ?? null;
export const citiesOf = (provinceId: ProvinceId) => CITIES.filter((c) => c.provinceId === provinceId);
export const motifsOfCity = (cityId: string) => MOTIFS.filter((m) => m.cityId === cityId);
export const motifsOfProvince = (provinceId: ProvinceId) => {
  const cityIds = citiesOf(provinceId).map((c) => c.id);
  return MOTIFS.filter((m) => cityIds.includes(m.cityId));
};

/** Mencocokkan nama provinsi dari GeoJSON (format apa pun) ke id provinsi aktif. */
export function matchProvinceName(raw: string): ProvinceId | null {
  const n = raw
    .toUpperCase()
    .replace(/PROVINSI|PROPINSI|PROVINCE/g, '')
    .replace(/[^A-Z]/g, '');
  const exact: Record<string, ProvinceId> = {
    BANTEN: 'banten',
    JAWABARAT: 'jabar',
    WESTJAVA: 'jabar',
    JAWATENGAH: 'jateng',
    CENTRALJAVA: 'jateng',
    JAWATIMUR: 'jatim',
    EASTJAVA: 'jatim',
  };
  if (exact[n]) return exact[n];
  if (n.includes('YOGYAKARTA') || n === 'DIY') return 'diy';
  if (n.includes('JAKARTA')) return 'jakarta';
  return null;
}
