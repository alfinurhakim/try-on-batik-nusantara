import type { Landmark } from './vision';

/**
 * Deteksi gestur dari landmark pose MediaPipe (tanpa model tangan tambahan):
 *  - lambaian tangan kiri/kanan → ganti motif
 *  - kacak pinggang ATAU angkat kedua tangan, ditahan sebentar → foto otomatis
 * Koordinat landmark: x,y ternormalisasi terhadap gambar kamera (belum dicerminkan).
 */

interface Sample {
  t: number;
  x: number;
  y: number;
}

export interface GestureState {
  hist: [Sample[], Sample[]];
  swipeCooldownUntil: number;
  poseSince: number;
  photoCooldownUntil: number;
}

export function createGestureState(): GestureState {
  return { hist: [[], []], swipeCooldownUntil: 0, poseSince: 0, photoCooldownUntil: 0 };
}

const vis = (p: Landmark | undefined, min: number) => !!p && (p.visibility ?? 1) > min;

/** -1 = motif sebelumnya, 1 = motif berikutnya, 0 = tidak ada lambaian. */
export function detectSwipe(st: GestureState, lms: Landmark[], now: number, aspect: number, scale: number): -1 | 0 | 1 {
  const ls = lms[11];
  const rs = lms[12];
  if (!vis(ls, 0.5) || !vis(rs, 0.5)) return 0;
  const shoulderY = (ls.y + rs.y) / 2;
  let result: -1 | 0 | 1 = 0;
  [15, 16].forEach((idx, side) => {
    const w = lms[idx];
    const h = st.hist[side];
    // hanya hitung saat tangan diangkat setinggi dada ke atas
    if (!vis(w, 0.6) || w.y > shoulderY + scale * 0.75) {
      h.length = 0;
      return;
    }
    h.push({ t: now, x: w.x, y: w.y });
    while (h.length && now - h[0].t > 450) h.shift();
    if (result || now < st.swipeCooldownUntil || h.length < 3) return;
    const first = h[0];
    // x layar = 1 - x kamera (tampilan dicerminkan)
    const dxScreen = -(w.x - first.x) * aspect;
    const dy = Math.abs(w.y - first.y);
    if (Math.abs(dxScreen) > scale * 0.55 && dy < scale * 0.45) {
      result = dxScreen < 0 ? 1 : -1;
    }
  });
  if (result) {
    st.swipeCooldownUntil = now + 1000;
    st.hist[0].length = 0;
    st.hist[1].length = 0;
  }
  return result;
}

/** holding: 0..1 (berapa lama pose sudah ditahan), fire: saatnya mulai hitung mundur. */
export function detectPhotoPose(st: GestureState, lms: Landmark[], now: number, aspect: number, scale: number): { holding: number; fire: boolean } {
  const nose = lms[0];
  const ls = lms[11];
  const rs = lms[12];
  const le = lms[13];
  const re = lms[14];
  const lw = lms[15];
  const rw = lms[16];
  const lh = lms[23];
  const rh = lms[24];
  let posing = false;
  if (vis(lw, 0.5) && vis(rw, 0.5) && vis(nose, 0.5)) {
    // kedua tangan diangkat di atas kepala
    if (lw.y < nose.y - scale * 0.1 && rw.y < nose.y - scale * 0.1) posing = true;
  }
  if (!posing && vis(ls, 0.5) && vis(rs, 0.5) && vis(lh, 0.3) && vis(rh, 0.3) && vis(le, 0.4) && vis(re, 0.4) && vis(lw, 0.3) && vis(rw, 0.3)) {
    // kacak pinggang: pergelangan dekat pinggul, siku keluar
    const d = (a: Landmark, b: Landmark) => Math.hypot((a.x - b.x) * aspect, a.y - b.y);
    const midX = (ls.x + rs.x) / 2;
    const near = d(lw, lh) < scale * 0.5 && d(rw, rh) < scale * 0.5;
    const out = Math.abs(le.x - midX) * aspect > scale * 0.62 && Math.abs(re.x - midX) * aspect > scale * 0.62;
    posing = near && out;
  }
  if (!posing || now < st.photoCooldownUntil) {
    st.poseSince = 0;
    return { holding: 0, fire: false };
  }
  if (!st.poseSince) st.poseSince = now;
  const holding = Math.min(1, (now - st.poseSince) / 900);
  if (holding >= 1) {
    st.poseSince = 0;
    st.photoCooldownUntil = now + 7000;
    return { holding: 1, fire: true };
  }
  return { holding, fire: false };
}
