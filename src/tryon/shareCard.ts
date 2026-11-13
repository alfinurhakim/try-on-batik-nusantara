import type { City, Motif, Province } from '../types';
import { getMotifTile } from '../motifs/textures';

const W = 1080;
const H = 1350;

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxW: number, maxLines: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = w;
      if (lines.length === maxLines) break;
    } else line = test;
  }
  if (lines.length < maxLines && line) lines.push(line);
  if (lines.length === maxLines && words.join(' ') !== lines.join(' ')) {
    let last = lines[maxLines - 1];
    while (ctx.measureText(`${last}…`).width > maxW && last.length) last = last.slice(0, -1);
    lines[maxLines - 1] = `${last.trimEnd()}…`;
  }
  return lines;
}

export interface ShareCard {
  blob: Blob;
  url: string;
  fileName: string;
  text: string;
}

/** Bingkai foto try-on: foto + nama motif, asal kota, dan makna singkatnya. */
export async function buildShareCard(photo: HTMLCanvasElement, motif: Motif, city: City, province: Province): Promise<ShareCard> {
  try {
    await document.fonts?.ready;
  } catch {
    /* abaikan */
  }
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#f6efe2';
  ctx.fillRect(0, 0, W, H);

  // pita motif atas & bawah
  const tile = getMotifTile(motif);
  const band = document.createElement('canvas');
  band.width = 128;
  band.height = 128;
  band.getContext('2d')!.drawImage(tile, 0, 0, 128, 128);
  const pattern = ctx.createPattern(band, 'repeat');
  if (pattern) {
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, W, 30);
    ctx.fillRect(0, H - 30, W, 30);
  }

  ctx.fillStyle = '#3b2a1e';
  ctx.font = '600 40px Fraunces, Georgia, serif';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('Try On Batik Nusantara', 60, 100);
  ctx.font = '600 22px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillStyle = '#b5542c';
  ctx.textAlign = 'right';
  ctx.fillText(province.name.toUpperCase(), W - 60, 96);
  ctx.textAlign = 'left';

  // foto (crop "cover")
  const px = 60;
  const py = 130;
  const pw = W - 120;
  const ph = 840;
  ctx.save();
  roundRect(ctx, px, py, pw, ph, 28);
  ctx.clip();
  const sr = photo.width / photo.height;
  const dr = pw / ph;
  let sw = photo.width;
  let sh = photo.height;
  if (sr > dr) sw = sh * dr;
  else sh = sw / dr;
  ctx.drawImage(photo, (photo.width - sw) / 2, (photo.height - sh) / 2, sw, sh, px, py, pw, ph);
  ctx.restore();
  roundRect(ctx, px, py, pw, ph, 28);
  ctx.strokeStyle = 'rgba(59,42,30,0.15)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // teks motif
  ctx.fillStyle = '#3b2a1e';
  ctx.font = '700 64px Fraunces, Georgia, serif';
  ctx.fillText(motif.name, 60, 1058);
  ctx.fillStyle = '#b5542c';
  ctx.font = '600 28px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText(`${city.name}, ${province.name}`, 60, 1102);
  ctx.fillStyle = '#5a4636';
  ctx.font = '400 26px "Plus Jakarta Sans", system-ui, sans-serif';
  wrapLines(ctx, motif.meaning, W - 120, 4).forEach((l, i) => ctx.fillText(l, 60, 1150 + i * 38));

  const blob: Blob = await new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('gagal membuat gambar'))), 'image/png'));
  return {
    blob,
    url: URL.createObjectURL(blob),
    fileName: `batik-${motif.id}.png`,
    text: `Saya mencoba batik ${motif.name} dari ${city.name}, ${province.name}, lewat Try On Batik Nusantara.`,
  };
}
