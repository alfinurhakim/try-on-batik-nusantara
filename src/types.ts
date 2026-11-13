export type ProvinceId = 'banten' | 'jakarta' | 'jabar' | 'jateng' | 'diy' | 'jatim';

export type MusicStyleId =
  | 'ambient'
  | 'rampak-bedug'
  | 'gambang-kromong'
  | 'degung'
  | 'gamelan-jateng'
  | 'gamelan-jogja'
  | 'gamelan-jatim';

export type PatternKind =
  | 'kawung'
  | 'parang'
  | 'megamendung'
  | 'truntum'
  | 'ceplok'
  | 'nitik'
  | 'sidomukti'
  | 'jlamprang'
  | 'latohan'
  | 'kricak'
  | 'gentongan'
  | 'gedog'
  | 'gajaholing'
  | 'tumpal'
  | 'lereng'
  | 'floral';

export interface Palette {
  bg: string;
  primary: string;
  secondary: string;
  accent: string;
}

export interface Motif {
  id: string;
  name: string;
  cityId: string;
  kind: PatternKind;
  palette: Palette;
  meaning: string;
  /** Jumlah pengulangan motif selebar bahu; makin besar makin rapat. */
  density?: number;
}

export interface City {
  id: string;
  name: string;
  provinceId: ProvinceId;
  lon: number;
  lat: number;
  blurb: string;
}

export interface Province {
  id: ProvinceId;
  name: string;
  blurb: string;
  music: MusicStyleId;
  musicLabel: string;
  color: string;
  /** Titik tengah kamera & ukuran (derajat) saat menukik ke provinsi. */
  center: [number, number];
  span: number;
}
