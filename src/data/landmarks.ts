/** Landmark ikonik tiap kota (dipakai peta 3D & latar kota virtual). */
export type LandmarkKind = 'monas' | 'tugu' | 'joglo' | 'menara' | 'candiBentar' | 'volcano' | 'ijen' | 'payung' | 'klenteng' | 'suramadu' | 'masjid' | 'canting' | 'rumahSunda' | 'megamendung';

export const CITY_LANDMARK: Record<string, { kind: LandmarkKind; name: string }> = {
  serang: { kind: 'menara', name: 'Menara Masjid Agung Banten' },
  jakarta: { kind: 'monas', name: 'Monumen Nasional (Monas)' },
  cirebon: { kind: 'megamendung', name: 'Awan Mega Mendung' },
  garut: { kind: 'volcano', name: 'Gunung Papandayan' },
  tasikmalaya: { kind: 'payung', name: 'Payung Geulis' },
  ciamis: { kind: 'rumahSunda', name: 'Rumah adat Sunda' },
  solo: { kind: 'joglo', name: 'Pendopo Keraton' },
  pekalongan: { kind: 'canting', name: 'Canting, alat membatik' },
  lasem: { kind: 'klenteng', name: 'Klenteng Lasem' },
  yogyakarta: { kind: 'tugu', name: 'Tugu Yogyakarta' },
  bantul: { kind: 'candiBentar', name: 'Gapura Makam Imogiri' },
  madura: { kind: 'suramadu', name: 'Jembatan Suramadu' },
  tuban: { kind: 'masjid', name: 'Masjid Agung Tuban' },
  banyuwangi: { kind: 'ijen', name: 'Kawah Ijen & api biru' },
};

