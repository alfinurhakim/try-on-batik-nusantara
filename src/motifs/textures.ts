import type { Motif } from '../types';
import { DEFAULT_DENSITY, TILE, drawMotif, drawOrnament, trimColor } from './patterns';

export { trimColor };

const tileCache = new Map<string, HTMLCanvasElement>();
const thumbCache = new Map<string, string>();
const ornamentCache = new Map<string, HTMLCanvasElement>();

/** Ubin motif 512×512 (di-cache). Nanti bisa diganti gambar dari dataset. */
export function getMotifTile(motif: Motif): HTMLCanvasElement {
  let c = tileCache.get(motif.id);
  if (!c) {
    c = document.createElement('canvas');
    c.width = TILE;
    c.height = TILE;
    const ctx = c.getContext('2d');
    if (ctx) drawMotif(ctx, motif);
    tileCache.set(motif.id, c);
  }
  return c;
}

/** Gambar mini motif (data URL) untuk kartu & carousel. */
export function getMotifThumb(motif: Motif, size = 160): string {
  const key = `${motif.id}@${size}`;
  let url = thumbCache.get(key);
  if (!url) {
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const ctx = c.getContext('2d');
    if (ctx) {
      const tile = getMotifTile(motif);
      const half = size / 1.6;
      for (let y = 0; y < size; y += half) {
        for (let x = 0; x < size; x += half) ctx.drawImage(tile, x, y, half, half);
      }
    }
    url = c.toDataURL('image/png');
    thumbCache.set(key, url);
  }
  return url;
}

/** Ornamen dada (transparan) untuk tampilan kemeja. */
export function getOrnament(motif: Motif): HTMLCanvasElement {
  let c = ornamentCache.get(motif.id);
  if (!c) {
    c = document.createElement('canvas');
    c.width = TILE;
    c.height = TILE;
    const ctx = c.getContext('2d');
    if (ctx) drawOrnament(ctx, motif);
    ornamentCache.set(motif.id, c);
  }
  return c;
}

/** Berapa kali ubin motif diulang selebar bahu (dikali 3 supaya pola rapat seperti kemeja asli). */
export function motifDensity(motif: Motif) {
  return (motif.density ?? DEFAULT_DENSITY[motif.kind]) * 3;
}
