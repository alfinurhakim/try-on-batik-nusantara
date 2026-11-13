import type { ProvinceId } from '../types';

/**
 * Paspor Batik Nusantara: stempel per provinsi yang batiknya sudah dicoba.
 * Disimpan di localStorage browser (per perangkat).
 */

export interface Stamp {
  date: string;
  motifs: string[];
}

export type Passport = Partial<Record<ProvinceId, Stamp>>;

const KEY = 'tryon-batik-paspor-v1';

export function loadPassport(): Passport {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Passport) : {};
  } catch {
    return {};
  }
}

function savePassport(p: Passport) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* penyimpanan tidak tersedia: paspor hanya bertahan selama sesi */
  }
}

/** Catat motif yang dicoba. isNewStamp = provinsi ini baru pertama kali dicap. */
export function recordTry(prev: Passport, provinceId: ProvinceId, motifId: string): { passport: Passport; isNewStamp: boolean } {
  const existing = prev[provinceId];
  if (existing?.motifs.includes(motifId)) return { passport: prev, isNewStamp: false };
  const stamp: Stamp = existing
    ? { ...existing, motifs: [...existing.motifs, motifId] }
    : { date: new Date().toISOString(), motifs: [motifId] };
  const passport = { ...prev, [provinceId]: stamp };
  savePassport(passport);
  return { passport, isNewStamp: !existing };
}

export function resetPassport(): Passport {
  savePassport({});
  return {};
}
