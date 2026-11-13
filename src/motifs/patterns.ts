import type { Motif, Palette, PatternKind } from '../types';

/**
 * Generator motif batik prosedural (placeholder sampai dataset foto asli dipasang).
 * Setiap generator menggambar satu ubin 512×512 yang bisa diulang tanpa sambungan.
 */

export const TILE = 512;
const S = TILE;
type Ctx = CanvasRenderingContext2D;
type Draw = (ctx: Ctx, p: Palette, rand: () => number) => void;

// ---------- utilitas ----------

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function mix(a: string, b: string, t: number) {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const bl = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r},${g},${bl})`;
}

export function alpha(hex: string, a: number) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

/** Gambar fn 9 kali (geser ±S) supaya elemen di tepi ubin menyambung mulus. */
function tiled(ctx: Ctx, fn: () => void) {
  for (const ox of [-S, 0, S]) {
    for (const oy of [-S, 0, S]) {
      ctx.save();
      ctx.translate(ox, oy);
      fn();
      ctx.restore();
    }
  }
}

function fillBg(ctx: Ctx, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, S, S);
}

function ellipse(ctx: Ctx, x: number, y: number, rx: number, ry: number, rot: number) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
}

function circle(ctx: Ctx, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
}

/** Isen-isen cecek: titik-titik kecil pengisi latar. */
function cecek(ctx: Ctx, color: string, step = 24, r = 1.6, offset = 0) {
  ctx.fillStyle = color;
  for (let y = 0; y < S; y += step) {
    for (let x = 0; x < S; x += step) {
      const ox = ((y / step) % 2) * (step / 2) + offset;
      circle(ctx, (x + ox) % S, y + step / 2, r);
      ctx.fill();
    }
  }
}

function flower(ctx: Ctx, x: number, y: number, r: number, petals: number, petalColor: string, centerColor: string, rot = 0, stroke?: string) {
  for (let k = 0; k < petals; k++) {
    const a = rot + (k / petals) * Math.PI * 2;
    ellipse(ctx, x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, r * 0.5, r * 0.26, a);
    ctx.fillStyle = petalColor;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = Math.max(1, r * 0.06);
      ctx.stroke();
    }
  }
  circle(ctx, x, y, r * 0.22);
  ctx.fillStyle = centerColor;
  ctx.fill();
}

function leaf(ctx: Ctx, x: number, y: number, len: number, angle: number, color: string, vein?: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(len * 0.5, -len * 0.32, len, 0);
  ctx.quadraticCurveTo(len * 0.5, len * 0.32, 0, 0);
  ctx.fillStyle = color;
  ctx.fill();
  if (vein) {
    ctx.beginPath();
    ctx.moveTo(len * 0.1, 0);
    ctx.lineTo(len * 0.85, 0);
    ctx.strokeStyle = vein;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.restore();
}

// ---------- generator per jenis motif ----------

const kawung: Draw = (ctx, p) => {
  fillBg(ctx, p.bg);
  cecek(ctx, alpha(p.secondary, 0.35), 16, 1.3);
  const n = 4;
  const c = S / n;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const cx = (i + 0.5) * c;
      const cy = (j + 0.5) * c;
      for (let k = 0; k < 4; k++) {
        const a = k * (Math.PI / 2) + Math.PI / 4;
        const px = cx + Math.cos(a) * c * 0.27;
        const py = cy + Math.sin(a) * c * 0.27;
        ellipse(ctx, px, py, c * 0.25, c * 0.15, a);
        ctx.fillStyle = p.primary;
        ctx.fill();
        ctx.strokeStyle = p.secondary;
        ctx.lineWidth = 3;
        ctx.stroke();
        ellipse(ctx, px, py, c * 0.1, c * 0.035, a);
        ctx.fillStyle = p.bg;
        ctx.fill();
      }
      circle(ctx, cx, cy, c * 0.06);
      ctx.fillStyle = p.accent;
      ctx.fill();
    }
  }
  // bintang kecil di titik sudut sel
  for (let i = 0; i <= n; i++) {
    for (let j = 0; j <= n; j++) {
      const x = i * c;
      const y = j * c;
      ctx.beginPath();
      ctx.moveTo(x, y - c * 0.09);
      ctx.lineTo(x + c * 0.03, y);
      ctx.lineTo(x, y + c * 0.09);
      ctx.lineTo(x - c * 0.03, y);
      ctx.closePath();
      ctx.moveTo(x - c * 0.09, y);
      ctx.lineTo(x, y + c * 0.03);
      ctx.lineTo(x + c * 0.09, y);
      ctx.lineTo(x, y - c * 0.03);
      ctx.closePath();
      ctx.fillStyle = p.accent;
      ctx.fill();
    }
  }
};

/** Garis bergelombang sejajar x+y = k*d (diagonal "\"→ arah parang). */
function wavyDiagonal(ctx: Ctx, k: number, d: number, amp: number, waves: number, dir: 1 | -1) {
  const lambda = S / (Math.SQRT2 * waves);
  const ux = 1 / Math.SQRT2;
  const uy = -dir / Math.SQRT2;
  const nx = 1 / Math.SQRT2;
  const ny = dir / Math.SQRT2;
  const bx = (k * d) / 2;
  const by = dir === 1 ? (k * d) / 2 : -(k * d) / 2;
  ctx.beginPath();
  for (let t = -S * 1.6; t <= S * 1.6; t += 4) {
    const w = amp * Math.sin((2 * Math.PI * t) / lambda);
    const x = bx + ux * t + nx * w;
    const y = by + uy * t + ny * w;
    if (t === -S * 1.6) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
}

const parang: Draw = (ctx, p) => {
  fillBg(ctx, p.bg);
  const d = S / 4;
  ctx.lineCap = 'round';
  for (let k = -2; k <= 10; k++) {
    wavyDiagonal(ctx, k, d, d * 0.12, 2, 1);
    ctx.strokeStyle = p.secondary;
    ctx.lineWidth = d * 0.5;
    ctx.stroke();
    ctx.strokeStyle = p.primary;
    ctx.lineWidth = d * 0.4;
    ctx.stroke();
    ctx.strokeStyle = p.accent;
    ctx.lineWidth = d * 0.05;
    ctx.stroke();
  }
  // mlinjon: belah ketupat di antara pita
  const lambda = S / (Math.SQRT2 * 2);
  for (let k = -2; k <= 10; k++) {
    for (let j = -12; j <= 12; j++) {
      const t = j * (lambda / 2);
      const bx = ((k + 0.5) * d) / 2;
      const x = bx + t / Math.SQRT2;
      const y = bx - t / Math.SQRT2;
      if (x < -20 || x > S + 20 || y < -20 || y > S + 20) continue;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = p.secondary;
      ctx.fillRect(-d * 0.07, -d * 0.07, d * 0.14, d * 0.14);
      ctx.restore();
    }
  }
};

const megamendung: Draw = (ctx, p) => {
  fillBg(ctx, p.bg);
  const blobs: [number, number, number][] = [
    [0, 0, 1],
    [0.95, 0.15, 0.72],
    [-0.9, 0.2, 0.68],
    [0.4, -0.6, 0.62],
    [-0.42, -0.55, 0.6],
  ];
  const clouds: [number, number, number, number][] = [
    [120, 130, 118, 0],
    [380, 300, 128, 0.25],
    [110, 420, 84, -0.2],
    [420, 60, 80, 0.1],
    [260, 470, 60, 0.4],
  ];
  const layers = 7;
  tiled(ctx, () => {
    for (const [cx, cy, R, rot] of clouds) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      for (let L = 0; L < layers; L++) {
        const s = 1 - L * 0.13;
        const t = L / (layers - 1);
        const color = t < 0.5 ? mix(p.primary, p.secondary, t * 2) : mix(p.secondary, p.accent, (t - 0.5) * 2);
        ctx.beginPath();
        for (const [dx, dy, r] of blobs) {
          ctx.moveTo(dx * R * 0.55 * s + r * R * 0.6 * s, dy * R * 0.55 * s);
          ctx.arc(dx * R * 0.55 * s, dy * R * 0.55 * s, r * R * 0.6 * s, 0, Math.PI * 2);
        }
        ctx.fillStyle = color;
        ctx.fill('nonzero');
      }
      ctx.restore();
    }
  });
};

const truntum: Draw = (ctx, p) => {
  fillBg(ctx, p.bg);
  const step = 64;
  tiled(ctx, () => {
    for (let j = 0; j < S / step; j++) {
      for (let i = 0; i < S / step; i++) {
        const x = i * step + (j % 2) * (step / 2) + step / 4;
        const y = j * step + step / 2;
        const r = 18;
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * Math.PI * 2;
          ellipse(ctx, x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.7, r * 0.42, r * 0.18, a);
          ctx.fillStyle = p.primary;
          ctx.fill();
        }
        circle(ctx, x, y, 3.2);
        ctx.fillStyle = p.secondary;
        ctx.fill();
        // percikan kecil
        const sx = x + step / 2;
        const sy = y;
        for (let k = 0; k < 4; k++) {
          const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
          circle(ctx, sx + Math.cos(a) * 5, sy + Math.sin(a) * 5, 1.6);
          ctx.fillStyle = p.accent;
          ctx.fill();
        }
      }
    }
  });
};

const ceplok: Draw = (ctx, p) => {
  fillBg(ctx, p.bg);
  cecek(ctx, alpha(p.secondary, 0.3), 16, 1.2);
  const c = S / 4;
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      const cx = (i + 0.5) * c;
      const cy = (j + 0.5) * c;
      circle(ctx, cx, cy, c * 0.42);
      ctx.strokeStyle = p.secondary;
      ctx.lineWidth = 3;
      ctx.stroke();
      circle(ctx, cx, cy, c * 0.36);
      ctx.setLineDash([2, 5]);
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]);
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        ellipse(ctx, cx + Math.cos(a) * c * 0.2, cy + Math.sin(a) * c * 0.2, c * 0.16, c * 0.065, a);
        ctx.fillStyle = k % 2 ? p.primary : p.secondary;
        ctx.fill();
      }
      circle(ctx, cx, cy, c * 0.08);
      ctx.fillStyle = p.accent;
      ctx.fill();
    }
  }
  for (let i = 0; i <= 4; i++) {
    for (let j = 0; j <= 4; j++) {
      ctx.save();
      ctx.translate(i * c, j * c);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = p.primary;
      ctx.fillRect(-c * 0.09, -c * 0.09, c * 0.18, c * 0.18);
      ctx.fillStyle = p.bg;
      ctx.fillRect(-c * 0.035, -c * 0.035, c * 0.07, c * 0.07);
      ctx.restore();
    }
  }
};

const nitik: Draw = (ctx, p) => {
  fillBg(ctx, p.bg);
  const c = 64;
  const dot = (x: number, y: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(x - 2.6, y - 2.6, 5.2, 5.2);
  };
  for (let i = 0; i < S / c; i++) {
    for (let j = 0; j < S / c; j++) {
      const cx = (i + 0.5) * c;
      const cy = (j + 0.5) * c;
      const col = (i + j) % 2 === 0 ? p.primary : p.secondary;
      const r = c * 0.38;
      const n = 6;
      for (let e = 0; e < 4; e++) {
        const a0 = (e * Math.PI) / 2;
        const a1 = a0 + Math.PI / 2;
        const x0 = cx + Math.cos(a0) * r;
        const y0 = cy + Math.sin(a0) * r;
        const x1 = cx + Math.cos(a1) * r;
        const y1 = cy + Math.sin(a1) * r;
        for (let t = 0; t < n; t++) dot(x0 + ((x1 - x0) * t) / n, y0 + ((y1 - y0) * t) / n, col);
      }
      for (let t = -2; t <= 2; t++) {
        dot(cx + t * 6.5, cy, p.accent);
        if (t !== 0) dot(cx, cy + t * 6.5, p.accent);
      }
      // titik pojok sel
      dot(i * c, j * c, col);
    }
  }
};

const sidomukti: Draw = (ctx, p) => {
  fillBg(ctx, p.bg);
  cecek(ctx, alpha(p.primary, 0.25), 12, 1);
  const D = S / 4;
  ctx.lineCap = 'butt';
  for (let k = -8; k <= 8; k++) {
    for (const dir of [1, -1]) {
      ctx.beginPath();
      if (dir === 1) {
        // garis x + y = k*D
        ctx.moveTo(k * D + S, -S);
        ctx.lineTo(k * D - 2 * S, 2 * S);
      } else {
        ctx.moveTo(k * D - S, -S);
        ctx.lineTo(k * D + 2 * S, 2 * S);
      }
      ctx.strokeStyle = p.secondary;
      ctx.lineWidth = 9;
      ctx.stroke();
      ctx.strokeStyle = p.accent;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
  for (let u = 0; u <= 8; u++) {
    for (let v = 0; v <= 8; v++) {
      if ((u + v) % 2 === 0) continue;
      const x = u * 64;
      const y = v * 64;
      ctx.save();
      ctx.translate(x, y);
      if (u % 2 === 0) {
        // sayap (lar) berpasangan
        for (const m of [1, -1]) {
          ctx.save();
          ctx.scale(m, 1);
          ctx.beginPath();
          ctx.moveTo(2, 10);
          ctx.bezierCurveTo(10, -6, 26, -18, 34, -6);
          ctx.bezierCurveTo(26, -4, 20, 4, 24, 12);
          ctx.bezierCurveTo(16, 8, 8, 14, 2, 10);
          ctx.fillStyle = p.primary;
          ctx.fill();
          ctx.restore();
        }
        circle(ctx, 0, 6, 4);
        ctx.fillStyle = p.accent;
        ctx.fill();
      } else {
        flower(ctx, 0, 0, 20, 4, p.primary, p.accent, Math.PI / 4);
        for (let k = 0; k < 4; k++) {
          circle(ctx, Math.cos((k * Math.PI) / 2) * 26, Math.sin((k * Math.PI) / 2) * 26, 2.5);
          ctx.fillStyle = p.primary;
          ctx.fill();
        }
      }
      ctx.restore();
    }
  }
};

const jlamprang: Draw = (ctx, p) => {
  fillBg(ctx, p.bg);
  const c = S / 4;
  const star = (x: number, y: number, r: number, color: string) => {
    ctx.beginPath();
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2 - Math.PI / 2;
      const rr = k % 2 === 0 ? r : r * 0.62;
      const px = x + Math.cos(a) * rr;
      const py = y + Math.sin(a) * rr;
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  };
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      const cx = (i + 0.5) * c;
      const cy = (j + 0.5) * c;
      circle(ctx, cx, cy, c * 0.45);
      ctx.fillStyle = p.primary;
      ctx.fill();
      circle(ctx, cx, cy, c * 0.4);
      ctx.strokeStyle = p.bg;
      ctx.setLineDash([3, 4]);
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]);
      star(cx, cy, c * 0.32, p.accent);
      circle(ctx, cx, cy, c * 0.14);
      ctx.fillStyle = p.secondary;
      ctx.fill();
      circle(ctx, cx, cy, c * 0.05);
      ctx.fillStyle = p.bg;
      ctx.fill();
    }
  }
  for (let i = 0; i <= 4; i++) {
    for (let j = 0; j <= 4; j++) {
      star(i * c, j * c, c * 0.13, p.secondary);
      circle(ctx, i * c, j * c, c * 0.04);
      ctx.fillStyle = p.accent;
      ctx.fill();
    }
  }
};

const latohan: Draw = (ctx, p, rand) => {
  fillBg(ctx, p.bg);
  const clusters: { x: number; y: number; a: number; n: number; seed: number }[] = [];
  const c = S / 4;
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      clusters.push({ x: (i + 0.2 + rand() * 0.6) * c, y: (j + 0.2 + rand() * 0.6) * c, a: rand() * Math.PI * 2, n: 7 + Math.floor(rand() * 6), seed: rand() * 1000 });
    }
  }
  tiled(ctx, () => {
    for (const cl of clusters) {
      const r2 = mulberry32(Math.floor(cl.seed));
      ctx.save();
      ctx.translate(cl.x, cl.y);
      ctx.rotate(cl.a);
      ctx.beginPath();
      ctx.moveTo(-40, 0);
      ctx.bezierCurveTo(-15, -25, 15, 25, 40, 0);
      ctx.strokeStyle = p.secondary;
      ctx.lineWidth = 3;
      ctx.stroke();
      for (let k = 0; k < cl.n; k++) {
        const t = k / (cl.n - 1);
        const x = -40 + 80 * t;
        const y = Math.sin(t * Math.PI * 2) * -12 + (r2() - 0.5) * 18;
        circle(ctx, x, y, 4.5 + r2() * 4.5);
        ctx.fillStyle = p.primary;
        ctx.fill();
        ctx.strokeStyle = p.secondary;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
      ctx.restore();
    }
  });
  cecek(ctx, alpha(p.accent, 0.55), 32, 1.6, 8);
};

const kricak: Draw = (ctx, p, rand) => {
  fillBg(ctx, p.bg);
  const n = 6;
  const c = S / n;
  const J: [number, number][][] = [];
  for (let i = 0; i < n; i++) {
    J.push([]);
    for (let j = 0; j < n; j++) J[i].push([(rand() - 0.5) * c * 0.45, (rand() - 0.5) * c * 0.45]);
  }
  const mod = (a: number) => ((a % n) + n) % n;
  const P = (i: number, j: number): [number, number] => [i * c + J[mod(i)][mod(j)][0], j * c + J[mod(i)][mod(j)][1]];
  for (let i = -1; i <= n; i++) {
    for (let j = -1; j <= n; j++) {
      const q = [P(i, j), P(i + 1, j), P(i + 1, j + 1), P(i, j + 1)];
      const mx = (q[0][0] + q[1][0] + q[2][0] + q[3][0]) / 4;
      const my = (q[0][1] + q[1][1] + q[2][1] + q[3][1]) / 4;
      const shrink = 0.82;
      ctx.beginPath();
      q.forEach(([x, y], idx) => {
        const sx = mx + (x - mx) * shrink;
        const sy = my + (y - my) * shrink;
        if (idx === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      });
      ctx.closePath();
      ctx.fillStyle = (mod(i) * 7 + mod(j) * 3) % 5 === 0 ? p.secondary : p.primary;
      ctx.fill();
      // retakan & cecek di dalam batu
      ctx.beginPath();
      ctx.moveTo(mx - c * 0.12, my - c * 0.05);
      ctx.lineTo(mx + c * 0.02, my + c * 0.02);
      ctx.lineTo(mx + c * 0.1, my - c * 0.08);
      ctx.strokeStyle = p.accent;
      ctx.lineWidth = 1.6;
      ctx.stroke();
      circle(ctx, mx - c * 0.1, my + c * 0.12, 1.8);
      ctx.fillStyle = p.accent;
      ctx.fill();
    }
  }
};

const gentongan: Draw = (ctx, p, rand) => {
  fillBg(ctx, p.bg);
  cecek(ctx, alpha(p.accent, 0.35), 20, 1.4);
  const items: { x: number; y: number; r: number; rot: number }[] = [];
  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < 2; j++) {
      items.push({ x: (i + 0.5) * 256 + (rand() - 0.5) * 40, y: (j + 0.5) * 256 + (rand() - 0.5) * 40, r: 62, rot: rand() * Math.PI });
      items.push({ x: i * 256 + (rand() - 0.5) * 30, y: j * 256 + (rand() - 0.5) * 30, r: 30, rot: rand() * Math.PI });
    }
  }
  tiled(ctx, () => {
    for (const it of items) {
      for (let k = 0; k < 5; k++) {
        const a = it.rot + (k / 5) * Math.PI * 2 + Math.PI / 5;
        leaf(ctx, it.x + Math.cos(a) * it.r * 0.7, it.y + Math.sin(a) * it.r * 0.7, it.r * 0.9, a, p.secondary, p.accent);
      }
      flower(ctx, it.x, it.y, it.r, 6, p.primary, p.accent, it.rot, p.accent);
      circle(ctx, it.x, it.y, it.r * 0.1);
      ctx.fillStyle = p.bg;
      ctx.fill();
    }
  });
};

const gedog: Draw = (ctx, p) => {
  fillBg(ctx, p.bg);
  const h = S / 4;
  for (let row = 0; row < 4; row++) {
    const y = row * h;
    // pita zig-zag
    ctx.beginPath();
    for (let x = 0; x <= S; x += 16) {
      const yy = y + ((x / 16) % 2 === 0 ? 0 : 10);
      if (x === 0) ctx.moveTo(x, yy);
      else ctx.lineTo(x, yy);
    }
    ctx.strokeStyle = p.primary;
    ctx.lineWidth = 3;
    ctx.stroke();
    for (let i = 0; i < 4; i++) {
      const cx = (i + (row % 2) * 0.5 + 0.25) * (S / 4);
      const cy = y + h * 0.55;
      for (const ox of [-S, 0, S]) {
        ctx.save();
        ctx.translate(cx + ox, cy);
        ctx.rotate(Math.PI / 4);
        ctx.strokeStyle = p.primary;
        ctx.lineWidth = 3;
        ctx.strokeRect(-20, -20, 40, 40);
        ctx.fillStyle = p.secondary;
        ctx.fillRect(-9, -9, 18, 18);
        ctx.restore();
        circle(ctx, cx + ox, cy, 4);
        ctx.fillStyle = p.accent;
        ctx.fill();
        // burung kecil
        ctx.beginPath();
        const bx = cx + ox + S / 8;
        const by = cy - 18;
        ctx.moveTo(bx - 10, by);
        ctx.quadraticCurveTo(bx - 5, by - 8, bx, by);
        ctx.quadraticCurveTo(bx + 5, by - 8, bx + 10, by);
        ctx.strokeStyle = p.secondary;
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }
    }
  }
};

const gajaholing: Draw = (ctx, p) => {
  fillBg(ctx, p.bg);
  cecek(ctx, alpha(p.primary, 0.2), 16, 1.1);
  const c = S / 4;
  const hook = (x: number, y: number, flip: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(flip, 1);
    ctx.beginPath();
    ctx.arc(0, -14, 22, Math.PI * 1.05, Math.PI * 0.45, false);
    ctx.quadraticCurveTo(-4, 24, 2, 40);
    ctx.lineCap = 'round';
    ctx.strokeStyle = p.primary;
    ctx.lineWidth = 11;
    ctx.stroke();
    ctx.strokeStyle = p.bg;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    circle(ctx, -14, -24, 4.5);
    ctx.fillStyle = p.secondary;
    ctx.fill();
    ctx.restore();
  };
  tiled(ctx, () => {
    for (let j = 0; j < 4; j++) {
      for (let i = 0; i < 4; i++) {
        const x = (i + 0.5 + (j % 2) * 0.5) * c;
        const y = (j + 0.45) * c;
        hook(x, y, (i + j) % 2 ? 1 : -1);
        flower(ctx, x + c * 0.5, y + c * 0.08, 12, 4, p.secondary, p.accent, Math.PI / 4);
        leaf(ctx, x - c * 0.32, y + c * 0.25, 22, -0.6, p.accent);
      }
    }
  });
};

const tumpal: Draw = (ctx, p) => {
  fillBg(ctx, p.bg);
  const h = S / 4;
  const w = S / 8;
  for (let row = 0; row < 4; row++) {
    const y0 = row * h;
    if (row % 2 === 0) {
      ctx.fillStyle = alpha(p.secondary, 0.15);
      ctx.fillRect(0, y0, S, h);
      for (let i = 0; i < 8; i++) {
        const x = i * w;
        ctx.beginPath();
        ctx.moveTo(x + 2, y0 + h - 6);
        ctx.lineTo(x + w / 2, y0 + 8);
        ctx.lineTo(x + w - 2, y0 + h - 6);
        ctx.closePath();
        ctx.fillStyle = p.primary;
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x + 14, y0 + h - 14);
        ctx.lineTo(x + w / 2, y0 + 34);
        ctx.lineTo(x + w - 14, y0 + h - 14);
        ctx.closePath();
        ctx.fillStyle = p.accent;
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x + w / 2, y0 + 40);
        ctx.lineTo(x + w / 2, y0 + h - 16);
        ctx.strokeStyle = p.secondary;
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      ctx.fillStyle = p.secondary;
      ctx.fillRect(0, y0 + h - 6, S, 6);
    } else {
      for (let i = 0; i < 8; i++) {
        const x = (i + 0.5) * w;
        flower(ctx, x, y0 + h / 2, 22, 5, p.primary, p.accent, i * 0.4);
        leaf(ctx, x + w / 2, y0 + h / 2, 16, -0.5, p.secondary);
        leaf(ctx, x + w / 2, y0 + h / 2, 16, Math.PI + 0.5, p.secondary);
      }
    }
  }
};

const lereng: Draw = (ctx, p) => {
  fillBg(ctx, p.bg);
  const d = S / 8;
  ctx.lineCap = 'butt';
  for (let k = -10; k <= 18; k++) {
    // garis x - y = k*d
    const line = (off: number) => {
      ctx.beginPath();
      ctx.moveTo(k * d + off - S, -S);
      ctx.lineTo(k * d + off + 2 * S, 2 * S);
    };
    line(0);
    ctx.strokeStyle = p.primary;
    ctx.lineWidth = d * 0.32;
    ctx.stroke();
    line(d * 0.3);
    ctx.strokeStyle = p.secondary;
    ctx.lineWidth = 3;
    ctx.stroke();
    // titik-titik di tengah jarak antar pita
    const spacing = (S * Math.SQRT2) / 24;
    for (let t = -40; t < 80; t++) {
      const s = t * spacing;
      const x = k * d + d * 0.62 + s / Math.SQRT2;
      const y = s / Math.SQRT2;
      if (x < -6 || x > S + 6 || y < -6 || y > S + 6) continue;
      circle(ctx, x, y, 2.6);
      ctx.fillStyle = p.accent;
      ctx.fill();
    }
  }
};

const floral: Draw = (ctx, p, rand) => {
  fillBg(ctx, p.bg);
  cecek(ctx, alpha(p.secondary, 0.25), 18, 1.2);
  const c = S / 3;
  const items: { x: number; y: number; r: number; rot: number; petals: number }[] = [];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      items.push({ x: (i + 0.25 + rand() * 0.5) * c, y: (j + 0.25 + rand() * 0.5) * c, r: 26 + rand() * 14, rot: rand() * Math.PI, petals: 5 + Math.floor(rand() * 2) });
    }
  }
  tiled(ctx, () => {
    for (const it of items) {
      ctx.beginPath();
      ctx.moveTo(it.x, it.y);
      ctx.bezierCurveTo(it.x + 30, it.y + 40, it.x + 70, it.y + 10, it.x + 90, it.y + 55);
      ctx.strokeStyle = p.secondary;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      leaf(ctx, it.x + 40, it.y + 30, it.r * 0.9, 0.6, p.secondary, p.bg);
      leaf(ctx, it.x + 62, it.y + 22, it.r * 0.8, -0.9, p.secondary, p.bg);
      flower(ctx, it.x, it.y, it.r, it.petals, p.primary, p.accent, it.rot);
      circle(ctx, it.x + 90, it.y + 55, 5);
      ctx.fillStyle = p.accent;
      ctx.fill();
    }
  });
};

const GENERATORS: Record<PatternKind, Draw> = {
  kawung,
  parang,
  megamendung,
  truntum,
  ceplok,
  nitik,
  sidomukti,
  jlamprang,
  latohan,
  kricak,
  gentongan,
  gedog,
  gajaholing,
  tumpal,
  lereng,
  floral,
};

/** Kerapatan bawaan: berapa kali ubin diulang selebar bahu. */
export const DEFAULT_DENSITY: Record<PatternKind, number> = {
  kawung: 1.3,
  parang: 1.2,
  megamendung: 1.0,
  truntum: 1.4,
  ceplok: 1.2,
  nitik: 1.4,
  sidomukti: 1.2,
  jlamprang: 1.2,
  latohan: 1.1,
  kricak: 1.2,
  gentongan: 0.9,
  gedog: 1.1,
  gajaholing: 1.1,
  tumpal: 1.0,
  lereng: 1.2,
  floral: 1.0,
};

/**
 * Sentuhan "batik tulis": retakan lilin (remukan), warna celup yang tidak rata,
 * dan tekstur serat kain. Membuat motif prosedural terasa lebih abstrak & organik.
 */
function batikify(ctx: Ctx, p: Palette, rand: () => number) {
  // 1. celupan tidak rata: bercak besar terang/gelap yang sangat halus
  const blobs = Array.from({ length: 26 }, () => ({ x: rand() * S, y: rand() * S, r: 60 + rand() * 140, dark: rand() > 0.5, a: 0.04 + rand() * 0.06 }));
  tiled(ctx, () => {
    for (const b of blobs) {
      const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
      const c = b.dark ? '0,0,0' : '255,248,235';
      g.addColorStop(0, `rgba(${c},${b.a})`);
      g.addColorStop(1, `rgba(${c},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
    }
  });
  // 2. remukan: retakan lilin tipis berwarna gelap
  const cracks: [number, number][][] = [];
  for (let i = 0; i < 70; i++) {
    let x = rand() * S;
    let y = rand() * S;
    let a = rand() * Math.PI * 2;
    const pts: [number, number][] = [[x, y]];
    const n = 4 + Math.floor(rand() * 10);
    for (let k = 0; k < n; k++) {
      a += (rand() - 0.5) * 1.4;
      const len = 6 + rand() * 18;
      x += Math.cos(a) * len;
      y += Math.sin(a) * len;
      pts.push([x, y]);
    }
    cracks.push(pts);
  }
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.strokeStyle = alpha(p.primary, 0.32);
  ctx.lineCap = 'round';
  tiled(ctx, () => {
    cracks.forEach((pts, i) => {
      ctx.lineWidth = 0.6 + (i % 3) * 0.35;
      ctx.beginPath();
      pts.forEach(([x, y], k) => (k === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
      ctx.stroke();
    });
  });
  ctx.restore();
  // 3. serat kain (tenunan halus)
  ctx.fillStyle = 'rgba(0,0,0,0.035)';
  for (let y = 0; y < S; y += 3) ctx.fillRect(0, y, S, 1);
  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  for (let x = 0; x < S; x += 3) ctx.fillRect(x, 0, 1, S);
}

export function drawMotif(ctx: CanvasRenderingContext2D, motif: Motif) {
  const rand = mulberry32(hashString(motif.id));
  ctx.save();
  ctx.clearRect(0, 0, S, S);
  ctx.beginPath();
  ctx.rect(0, 0, S, S);
  ctx.clip();
  GENERATORS[motif.kind](ctx, motif.palette, rand);
  batikify(ctx, motif.palette, mulberry32(hashString(motif.id + ':batik')));
  ctx.restore();
}

function luminance(hex: string) {
  const [r, g, b] = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

/** Warna palet yang paling kontras terhadap latar. */
function contrastColor(p: Palette) {
  const bl = luminance(p.bg);
  return [p.primary, p.secondary, p.accent].sort((a, b) => Math.abs(luminance(b) - bl) - Math.abs(luminance(a) - bl))[0];
}

export function trimColor(motif: Motif): [number, number, number] {
  const [r, g, b] = hexToRgb(contrastColor(motif.palette));
  return [r / 255, g / 255, b / 255];
}

/**
 * Ornamen besar di dada (gaya "sawat/lar" seperti kemeja batik modern):
 * sepasang sayap bulu, lingkaran tengah, mahkota, dan ekor kipas. Latar transparan.
 */
export function drawOrnament(ctx: CanvasRenderingContext2D, motif: Motif) {
  const p = motif.palette;
  const fc = contrastColor(p);
  const second = fc === p.secondary ? p.primary : p.secondary;
  const cx = S / 2;
  const cy = S / 2;
  ctx.clearRect(0, 0, S, S);

  // lingkaran lembut agar ornamen terbaca di atas pola
  const halo = ctx.createRadialGradient(cx, cy, 120, cx, cy, 250);
  halo.addColorStop(0, alpha(p.bg, 0.92));
  halo.addColorStop(0.75, alpha(p.bg, 0.6));
  halo.addColorStop(1, alpha(p.bg, 0));
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, S, S);

  const feather = (x: number, y: number, ang: number, len: number, w: number, fill: string, vein: string) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(len * 0.45, -w, len, 0);
    ctx.quadraticCurveTo(len * 0.45, w, 0, 0);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = vein;
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(len * 0.08, 0);
    ctx.lineTo(len * 0.9, 0);
    ctx.lineWidth = 1.4;
    ctx.stroke();
    // cecek di bulu
    for (let t = 0.25; t < 0.85; t += 0.15) {
      ctx.beginPath();
      ctx.arc(len * t, w * 0.28, 1.6, 0, Math.PI * 2);
      ctx.arc(len * t, -w * 0.28, 1.6, 0, Math.PI * 2);
      ctx.fillStyle = vein;
      ctx.fill();
    }
    ctx.restore();
  };

  // sayap kiri & kanan (dua lapis), mengembang ke samping seperti lar/sawat
  for (const side of [-1, 1]) {
    const n = 12;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const deg = -48 + t * 100;
      const a = side === 1 ? (deg * Math.PI) / 180 : Math.PI - (deg * Math.PI) / 180;
      const len = 105 + Math.sin(t * Math.PI * 0.9 + 0.2) * 85;
      feather(cx + Math.cos(a) * 60, cy + Math.sin(a) * 60, a, len, 16, fc, p.bg);
    }
    for (let i = 0; i < 8; i++) {
      const t = i / 7;
      const deg = -38 + t * 80;
      const a = side === 1 ? (deg * Math.PI) / 180 : Math.PI - (deg * Math.PI) / 180;
      feather(cx + Math.cos(a) * 58, cy + Math.sin(a) * 58, a, 62 + Math.sin(t * Math.PI) * 28, 11, second, p.bg);
    }
  }
  // mahkota atas & ekor bawah
  for (let i = -2; i <= 2; i++) feather(cx, cy - 58, -Math.PI / 2 + i * 0.2, 62 - Math.abs(i) * 9, 10, fc, p.bg);
  for (let i = -3; i <= 3; i++) feather(cx, cy + 58, Math.PI / 2 + i * 0.17, 110 - Math.abs(i) * 12, 12, fc, p.bg);

  // badan tengah
  circle(ctx, cx, cy, 64);
  ctx.fillStyle = p.bg;
  ctx.fill();
  circle(ctx, cx, cy, 58);
  ctx.fillStyle = fc;
  ctx.fill();
  for (let k = 0; k < 20; k++) {
    const a = (k / 20) * Math.PI * 2;
    circle(ctx, cx + Math.cos(a) * 48, cy + Math.sin(a) * 48, 3);
    ctx.fillStyle = p.bg;
    ctx.fill();
  }
  flower(ctx, cx, cy, 34, 8, second, p.accent, 0, p.bg);
  circle(ctx, cx, cy, 7);
  ctx.fillStyle = p.bg;
  ctx.fill();
}
