import type { ProvinceId } from '../types';
import { matchProvinceName } from '../data/regions';

/** Titik pusat proyeksi peta (kira-kira tengah Indonesia). */
export const ORIGIN_LON = 117.5;
export const ORIGIN_LAT = -2.5;

/** Bujur/lintang → koordinat dunia 3D (x ke timur, z ke selatan, 1 unit = 1 derajat). */
export function project(lon: number, lat: number): [number, number] {
  return [lon - ORIGIN_LON, -(lat - ORIGIN_LAT)];
}

export type Ring = [number, number][];
export type PolygonRings = Ring[];

export interface GeoProvince {
  key: string;
  name: string;
  provinceId: ProvinceId | null;
  polygons: PolygonRings[];
  bbox: [number, number, number, number];
}

const SOURCES = [
  `${import.meta.env.BASE_URL}geo/indonesia-provinces.geojson`,
  'https://cdn.jsdelivr.net/gh/ans-4175/peta-indonesia-geojson@master/indonesia-prov.geojson',
  'https://cdn.jsdelivr.net/gh/superpikar/indonesia-geojson@master/indonesia-province-simple.json',
];

const NAME_KEYS = ['Propinsi', 'PROVINSI', 'provinsi', 'Provinsi', 'PROPINSI', 'NAME_1', 'name', 'Name', 'NAMA', 'nama', 'state', 'WADMPR'];

function featureName(props: Record<string, unknown> | null | undefined): string {
  if (!props) return 'Provinsi';
  for (const k of NAME_KEYS) {
    const v = props[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  for (const v of Object.values(props)) {
    if (typeof v === 'string' && /[a-z]/i.test(v) && v.length > 3) return v.trim();
  }
  return 'Provinsi';
}

export function prettyName(raw: string) {
  const keepUpper = new Set(['DKI', 'DI', 'NTB', 'NTT']);
  return raw
    .replace(/\./g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (keepUpper.has(w.toUpperCase()) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
    .join(' ');
}

/** Buang titik yang terlalu rapat & pulau yang sangat kecil supaya ringan dirender. */
function simplifyRing(ring: number[][], tol: number): Ring {
  const out: Ring = [];
  let last: number[] | null = null;
  for (const pt of ring) {
    if (!last || Math.abs(pt[0] - last[0]) + Math.abs(pt[1] - last[1]) > tol) {
      out.push([pt[0], pt[1]]);
      last = pt;
    }
  }
  return out;
}

function ringArea(r: Ring) {
  let a = 0;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += (r[j][0] + r[i][0]) * (r[j][1] - r[i][1]);
  return Math.abs(a / 2);
}

interface RawFeature {
  properties?: Record<string, unknown> | null;
  geometry?: { type: string; coordinates: unknown } | null;
}

export function parseGeo(json: { features?: RawFeature[] }): GeoProvince[] {
  const result: GeoProvince[] = [];
  (json.features ?? []).forEach((f, idx) => {
    const g = f.geometry;
    if (!g) return;
    let polys: number[][][][] = [];
    if (g.type === 'Polygon') polys = [g.coordinates as number[][][]];
    else if (g.type === 'MultiPolygon') polys = g.coordinates as number[][][][];
    else return;
    const name = featureName(f.properties);
    const provinceId = matchProvinceName(name);
    const tol = provinceId ? 0.004 : 0.012;
    const minArea = provinceId ? 0.0004 : 0.004;
    const polygons: PolygonRings[] = [];
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const poly of polys) {
      if (!poly.length) continue;
      const outer = simplifyRing(poly[0], tol);
      if (outer.length < 4 || ringArea(outer) < minArea) continue;
      const holes = poly.slice(1).map((h) => simplifyRing(h, tol)).filter((h) => h.length >= 4);
      polygons.push([outer, ...holes]);
      for (const [x, y] of outer) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
    if (!polygons.length) return;
    result.push({ key: `${idx}-${name}`, name: prettyName(name), provinceId, polygons, bbox: [minX, minY, maxX, maxY] });
  });
  return result;
}

export async function loadGeo(): Promise<GeoProvince[] | null> {
  for (const url of SOURCES) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const json = await res.json();
      const parsed = parseGeo(json);
      if (parsed.length >= 20) return parsed;
    } catch {
      // coba sumber berikutnya
    }
  }
  return null;
}
