import type { Motif } from '../types';
import { getMotifTile } from '../motifs/textures';
import { CITY_LANDMARK, type LandmarkKind } from '../data/landmarks';

/** Gambar-gambar efek yang dibuat dengan kode (tanpa file aset). */

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

const cache = new Map<string, string>();

/** Gugusan awan Mega Mendung (latar transparan) untuk tirai pembuka. */
export function megaCloudArt(seed: number, flip = false): string {
  const key = `mm-${seed}-${flip}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const W = 1100;
  const H = 1100;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;
  const r = rng(seed);
  const shades = ['#1b3561', '#24467a', '#2f5a92', '#4f79ad', '#7aa0c9', '#a9c4e0', '#d9e6f2', '#f4f7fb'];
  const blobs: [number, number, number][] = [
    [0, 0, 1],
    [0.95, 0.15, 0.72],
    [-0.9, 0.2, 0.68],
    [0.4, -0.6, 0.62],
    [-0.42, -0.55, 0.6],
  ];
  // awan besar menutup sisi dalam, makin kecil ke luar
  const clouds = Array.from({ length: 26 }, (_, i) => ({
    x: (0.2 + Math.pow(r(), 0.6) * 0.9) * W,
    y: (i / 26) * H + (r() - 0.5) * 120,
    R: 110 + r() * 150,
    rot: (r() - 0.5) * 0.5,
  }));
  clouds.push({ x: W * 0.95, y: H * 0.5, R: 280, rot: 0 }, { x: W * 0.85, y: H * 0.15, R: 220, rot: 0.2 }, { x: W * 0.85, y: H * 0.85, R: 230, rot: -0.2 });
  ctx.save();
  if (flip) {
    ctx.translate(W, 0);
    ctx.scale(-1, 1);
  }
  for (const cl of clouds) {
    ctx.save();
    ctx.translate(cl.x, cl.y);
    ctx.rotate(cl.rot);
    shades.forEach((col, L) => {
      const s = 1 - L * 0.11;
      ctx.beginPath();
      for (const [dx, dy, rr] of blobs) {
        const cx = dx * cl.R * 0.55 * s;
        const cy = dy * cl.R * 0.55 * s;
        ctx.moveTo(cx + rr * cl.R * 0.6 * s, cy);
        ctx.arc(cx, cy, rr * cl.R * 0.6 * s, 0, Math.PI * 2);
      }
      ctx.fillStyle = col;
      ctx.fill();
    });
    ctx.restore();
  }
  ctx.restore();
  const url = c.toDataURL('image/png');
  cache.set(key, url);
  return url;
}

/** Gumpalan awan putih lembut untuk efek terbang menembus awan. */
export function puffArt(): string {
  const hit = cache.get('puff');
  if (hit) return hit;
  const S = 512;
  const c = document.createElement('canvas');
  c.width = S;
  c.height = S;
  const ctx = c.getContext('2d')!;
  const r = rng(11);
  for (let i = 0; i < 40; i++) {
    const x = S / 2 + (r() - 0.5) * S * 0.55;
    const y = S / 2 + (r() - 0.5) * S * 0.35;
    const rad = 60 + r() * 110;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, 'rgba(255,250,242,0.55)');
    g.addColorStop(0.6, 'rgba(255,240,222,0.22)');
    g.addColorStop(1, 'rgba(255,240,222,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
  }
  const url = c.toDataURL('image/png');
  cache.set('puff', url);
  return url;
}

/** Gunungan (kayon) wayang kulit, diisi motif batik yang sedang dipilih. */
export function gununganArt(motif: Motif): string {
  const key = `gunungan-${motif.id}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const W = 600;
  const H = 980;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;
  const cx = W / 2;

  const leaf = new Path2D();
  leaf.moveTo(cx, 40);
  leaf.bezierCurveTo(cx + 70, 190, cx + 270, 380, cx + 255, 580);
  leaf.bezierCurveTo(cx + 248, 660, cx + 200, 715, cx + 150, 735);
  leaf.lineTo(cx - 150, 735);
  leaf.bezierCurveTo(cx - 200, 715, cx - 248, 660, cx - 255, 580);
  leaf.bezierCurveTo(cx - 270, 380, cx - 70, 190, cx, 40);
  leaf.closePath();

  // gagang (gapit)
  ctx.fillStyle = '#5a3a22';
  ctx.fillRect(cx - 7, 780, 14, 190);
  ctx.beginPath();
  ctx.moveTo(cx - 7, 970);
  ctx.lineTo(cx, 980);
  ctx.lineTo(cx + 7, 970);
  ctx.fill();

  // badan daun: motif batik + gradasi merah-emas
  ctx.save();
  ctx.clip(leaf);
  const tile = getMotifTile(motif);
  const pat = ctx.createPattern(tile, 'repeat');
  if (pat) {
    pat.setTransform(new DOMMatrix().scale(0.32));
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, W, H);
  }
  const g = ctx.createRadialGradient(cx, 470, 40, cx, 470, 380);
  g.addColorStop(0, 'rgba(140,30,25,0.15)');
  g.addColorStop(0.7, 'rgba(120,25,20,0.55)');
  g.addColorStop(1, 'rgba(70,15,10,0.85)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // pohon hayat
  ctx.strokeStyle = '#e8c06a';
  ctx.lineCap = 'round';
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(cx, 720);
  ctx.lineTo(cx, 150);
  ctx.stroke();
  for (let i = 0; i < 7; i++) {
    const y = 640 - i * 72;
    const len = 190 - i * 22;
    for (const side of [-1, 1]) {
      ctx.lineWidth = 7 - i * 0.6;
      ctx.beginPath();
      ctx.moveTo(cx, y);
      ctx.bezierCurveTo(cx + side * len * 0.4, y - 40, cx + side * len * 0.9, y - 10, cx + side * len, y - 60);
      ctx.stroke();
      // ukel (spiral) di ujung cabang
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let t = 0; t < 1; t += 0.05) {
        const a = t * Math.PI * 3;
        const rr = 18 * (1 - t);
        const x = cx + side * len + side * Math.cos(a) * rr;
        const yy = y - 60 - Math.sin(a) * rr;
        if (t === 0) ctx.moveTo(x, yy);
        else ctx.lineTo(x, yy);
      }
      ctx.stroke();
      ctx.fillStyle = '#f3dca0';
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        ctx.ellipse(cx + side * len * (0.35 + k * 0.2), y - 30 - k * 8, 10, 4, side * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.restore();

  // tatahan (lubang ukiran) di sepanjang tepi
  for (const [sc, dash] of [[0.93, [3, 9]], [0.86, [2, 7]]] as const) {
    ctx.save();
    ctx.translate(cx, 470);
    ctx.scale(sc, sc);
    ctx.translate(-cx, -470);
    ctx.setLineDash([...dash]);
    ctx.strokeStyle = '#f6dc98';
    ctx.lineWidth = 5;
    ctx.stroke(leaf);
    ctx.restore();
  }
  ctx.setLineDash([]);
  ctx.lineWidth = 10;
  ctx.strokeStyle = '#3b1a10';
  ctx.stroke(leaf);
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#d9a441';
  ctx.stroke(leaf);

  // gapura di kaki gunungan
  ctx.fillStyle = '#b5542c';
  ctx.strokeStyle = '#d9a441';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.rect(cx - 150, 700, 300, 90);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - 175, 705);
  ctx.lineTo(cx, 660);
  ctx.lineTo(cx + 175, 705);
  ctx.closePath();
  ctx.fillStyle = '#7a2a18';
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#3b1a10';
  ctx.fillRect(cx - 32, 718, 30, 72);
  ctx.fillRect(cx + 2, 718, 30, 72);
  ctx.strokeRect(cx - 32, 718, 30, 72);
  ctx.strokeRect(cx + 2, 718, 30, 72);
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(cx + side * 100, 745, 18, 0, Math.PI * 2);
    ctx.fillStyle = '#d9a441';
    ctx.fill();
  }

  const url = c.toDataURL('image/png');
  cache.set(key, url);
  return url;
}

// ---------------- latar kota virtual ----------------

const backdropCache = new Map<string, HTMLCanvasElement>();

/**
 * Pemandangan kota saat senja untuk latar try-on: langit, matahari, bukit,
 * siluet kota, landmark ikonik, dan tanah bermotif batik. Ukuran 1280×720.
 */
export function cityBackdrop(cityId: string, motif: Motif): HTMLCanvasElement {
  const key = `${cityId}-${motif.id}`;
  const hit = backdropCache.get(key);
  if (hit) return hit;
  const W = 1280;
  const H = 720;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;
  const r = rng(cityId.split('').reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7) % 2147483646 || 1);
  const kind = CITY_LANDMARK[cityId]?.kind;

  // langit senja
  const sky = ctx.createLinearGradient(0, 0, 0, H * 0.75);
  sky.addColorStop(0, '#e9a46e');
  sky.addColorStop(0.45, '#f6c995');
  sky.addColorStop(1, '#fbe6c8');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  // matahari
  const sunX = W * 0.8;
  const sunY = H * 0.46;
  const glow = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 320);
  glow.addColorStop(0, 'rgba(255,244,214,0.95)');
  glow.addColorStop(0.15, 'rgba(255,226,170,0.7)');
  glow.addColorStop(1, 'rgba(255,210,150,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  ctx.beginPath();
  ctx.arc(sunX, sunY, 46, 0, Math.PI * 2);
  ctx.fillStyle = '#fff3d6';
  ctx.fill();

  // awan tipis bergaya Mega Mendung (Cirebon dibuat lebih tebal & biru)
  const mm = kind === 'megamendung';
  for (let i = 0; i < (mm ? 7 : 4); i++) {
    const cx = r() * W;
    const cy = 60 + r() * H * 0.3;
    const R = (mm ? 90 : 60) + r() * 60;
    const shades = mm ? ['#2f5a92', '#4f79ad', '#7aa0c9', '#a9c4e0', '#e6eef7'] : ['rgba(255,236,214,0.55)', 'rgba(255,244,230,0.6)', 'rgba(255,250,242,0.65)'];
    shades.forEach((col, L) => {
      const s = 1 - L * (mm ? 0.17 : 0.25);
      ctx.beginPath();
      for (const [dx, dy, rr] of [[0, 0, 1], [0.95, 0.15, 0.72], [-0.9, 0.2, 0.68], [0.4, -0.5, 0.6]]) {
        ctx.moveTo(cx + dx * R * 0.55 * s + rr * R * 0.6 * s, cy + dy * R * 0.4 * s);
        ctx.ellipse(cx + dx * R * 0.55 * s, cy + dy * R * 0.4 * s, rr * R * 0.6 * s, rr * R * 0.42 * s, 0, 0, Math.PI * 2);
      }
      ctx.fillStyle = col;
      ctx.fill();
    });
  }

  // bukit/gunung di kejauhan (sedikit kabur → kesan kedalaman)
  ctx.save();
  ctx.filter = 'blur(2px)';
  for (const [y0, col, amp] of [[H * 0.6, '#d9a789', 40], [H * 0.66, '#c48f78', 28]] as const) {
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 20) ctx.lineTo(x, y0 - Math.sin(x * 0.006 + y0) * amp - Math.sin(x * 0.017) * amp * 0.4);
    ctx.lineTo(W, H);
    ctx.fillStyle = col;
    ctx.fill();
  }
  ctx.restore();

  // siluet kota
  const skyline = '#9c6a5a';
  const base = H * 0.74;
  ctx.fillStyle = skyline;
  for (let x = -10; x < W; ) {
    const w = 26 + r() * 50;
    const h = 30 + r() * 90;
    ctx.fillRect(x, base - h, w - 4, h + 10);
    ctx.fillStyle = 'rgba(255,226,160,0.55)';
    for (let wy = base - h + 8; wy < base - 6; wy += 12) {
      for (let wx = x + 5; wx < x + w - 10; wx += 9) if (r() < 0.35) ctx.fillRect(wx, wy, 3, 5);
    }
    ctx.fillStyle = skyline;
    x += w;
  }

  // landmark ikonik (di sisi kiri, supaya tidak tertutup badan)
  drawLandmarkSilhouette(ctx, kind, W * 0.17, base + 4, motif);

  // tanah bermotif batik
  ctx.fillStyle = '#7d5240';
  ctx.fillRect(0, base, W, H - base);
  const tile = getMotifTile(motif);
  const pat = ctx.createPattern(tile, 'repeat');
  if (pat) {
    pat.setTransform(new DOMMatrix().scale(0.18));
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = pat;
    ctx.fillRect(0, base, W, H - base);
    ctx.globalAlpha = 1;
  }
  const fade = ctx.createLinearGradient(0, base, 0, H);
  fade.addColorStop(0, 'rgba(60,35,20,0.0)');
  fade.addColorStop(1, 'rgba(60,35,20,0.45)');
  ctx.fillStyle = fade;
  ctx.fillRect(0, base, W, H - base);

  // vinyet hangat
  const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, W * 0.75);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(70,30,10,0.35)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);

  backdropCache.set(key, c);
  return c;
}

function drawLandmarkSilhouette(ctx: CanvasRenderingContext2D, kind: LandmarkKind | undefined, x: number, ground: number, motif: Motif) {
  const dark = '#6b3f33';
  const gold = '#f2c46b';
  ctx.save();
  ctx.translate(x, ground);
  ctx.fillStyle = dark;
  ctx.strokeStyle = dark;
  const rect = (x0: number, y0: number, w: number, h: number) => ctx.fillRect(x0, y0, w, h);
  const poly = (pts: [number, number][]) => {
    ctx.beginPath();
    pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
    ctx.closePath();
    ctx.fill();
  };
  switch (kind) {
    case 'monas':
      rect(-90, -26, 180, 26);
      poly([[-70, -26], [70, -26], [40, -70], [-40, -70]]);
      poly([[-14, -70], [14, -70], [8, -360], [-8, -360]]);
      rect(-16, -372, 32, 12);
      ctx.fillStyle = gold;
      poly([[-11, -372], [11, -372], [0, -420]]);
      break;
    case 'tugu':
      rect(-30, -40, 60, 40);
      poly([[-14, -40], [14, -40], [10, -250], [-10, -250]]);
      rect(-16, -262, 32, 12);
      ctx.fillStyle = gold;
      poly([[-12, -262], [12, -262], [0, -330]]);
      break;
    case 'menara':
      poly([[-34, 0], [34, 0], [24, -280], [-24, -280]]);
      rect(-40, -120, 80, 10);
      rect(-36, -200, 72, 10);
      ctx.beginPath();
      ctx.arc(0, -290, 26, Math.PI, 0);
      ctx.fill();
      break;
    case 'joglo':
    case 'rumahSunda':
      rect(-120, -60, 240, 60);
      poly([[-170, -60], [170, -60], [70, -120], [-70, -120]]);
      poly([[-70, -120], [70, -120], [20, -200], [-20, -200]]);
      break;
    case 'candiBentar':
      for (const side of [-1, 1]) {
        for (let k = 0; k < 6; k++) rect(side * 30 + (side < 0 ? -(90 - k * 12) : 0), -(k + 1) * 40, 90 - k * 12, 40);
      }
      break;
    case 'volcano':
    case 'ijen':
      poly([[-260, 0], [260, 0], [60, -230], [-50, -235]]);
      if (kind === 'ijen') {
        const g = ctx.createRadialGradient(5, -238, 2, 5, -238, 70);
        g.addColorStop(0, 'rgba(120,200,255,0.95)');
        g.addColorStop(1, 'rgba(60,140,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(-80, -320, 170, 160);
      }
      break;
    case 'payung':
      rect(-4, -260, 8, 260);
      ctx.beginPath();
      ctx.moveTo(-150, -230);
      ctx.quadraticCurveTo(0, -330, 150, -230);
      ctx.closePath();
      ctx.fill();
      break;
    case 'klenteng':
      rect(-130, -90, 260, 90);
      ctx.beginPath();
      ctx.moveTo(-190, -80);
      ctx.quadraticCurveTo(-120, -110, -100, -140);
      ctx.lineTo(100, -140);
      ctx.quadraticCurveTo(120, -110, 190, -80);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#e0503a';
      for (const lx of [-70, 70]) {
        ctx.beginPath();
        ctx.ellipse(lx, -60, 12, 15, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case 'suramadu':
      ctx.translate(-x, 0);
      rect(0, -70, 1280, 12);
      for (const tx of [380, 900]) {
        rect(tx - 9, -260, 18, 260);
        ctx.lineWidth = 2;
        for (let k = 1; k <= 6; k++) {
          for (const dir of [-1, 1]) {
            ctx.beginPath();
            ctx.moveTo(tx, -250 + k * 6);
            ctx.lineTo(tx + dir * k * 40, -70);
            ctx.stroke();
          }
        }
      }
      break;
    case 'masjid':
      rect(-110, -90, 220, 90);
      ctx.beginPath();
      ctx.arc(0, -90, 70, Math.PI, 0);
      ctx.fill();
      rect(130, -230, 22, 230);
      ctx.beginPath();
      ctx.arc(141, -232, 16, Math.PI, 0);
      ctx.fill();
      break;
    case 'canting': {
      // jemuran kain batik khas Pekalongan
      ctx.lineWidth = 3;
      for (const [lx, ly] of [[-100, -230], [180, -200]]) {
        ctx.beginPath();
        ctx.moveTo(lx - 140, ly);
        ctx.lineTo(lx + 140, ly);
        ctx.stroke();
        rect(lx - 142, ly, 6, -ly);
        rect(lx + 136, ly, 6, -ly);
        const tile = getMotifTile(motif);
        for (let k = 0; k < 4; k++) {
          ctx.drawImage(tile, 0, 0, 256, 512, lx - 130 + k * 66, ly + 2, 58, 150 - (k % 2) * 20);
        }
      }
      break;
    }
    case 'megamendung':
    default:
      rect(-120, -60, 240, 60);
      poly([[-150, -60], [150, -60], [0, -140]]);
      break;
  }
  ctx.restore();
}
