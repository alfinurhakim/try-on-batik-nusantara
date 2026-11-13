/**
 * "Manekin" sintetis untuk demo interaktif di halaman Di balik layar:
 * gambar orang berkaos putih + mask segmentasi buatan, supaya shader try-on
 * bisa didemokan tanpa kamera.
 */

export const MANNEQUIN_W = 960;
export const MANNEQUIN_H = 540;
export const MASK_SIZE = 256;

/** Titik jangkar tubuh (setara landmark bahu MediaPipe). */
export const MANNEQUIN_BODY = { neck: [0.5, 0.64] as [number, number], angle: 0, scale: (0.28 * MANNEQUIN_W) / MANNEQUIN_H };
export const MANNEQUIN_HANDS: [number, number, number][] = [
  [0.27, 0.965, 0.06],
  [0.73, 0.965, 0.06],
];

type Shape = (c: CanvasRenderingContext2D, W: number, H: number) => void;

const shirt: Shape = (c, W, H) => {
  c.beginPath();
  c.moveTo(0.37 * W, 0.6 * H);
  c.quadraticCurveTo(0.5 * W, 0.57 * H, 0.63 * W, 0.6 * H);
  c.lineTo(0.7 * W, 0.66 * H);
  c.lineTo(0.72 * W, H);
  c.lineTo(0.28 * W, H);
  c.lineTo(0.3 * W, 0.66 * H);
  c.closePath();
  c.fill();
};
const vneck: Shape = (c, W, H) => {
  c.beginPath();
  c.moveTo(0.465 * W, 0.585 * H);
  c.lineTo(0.535 * W, 0.585 * H);
  c.lineTo(0.5 * W, 0.74 * H);
  c.closePath();
  c.fill();
};
const neck: Shape = (c, W, H) => c.fillRect(0.465 * W, 0.46 * H, 0.07 * W, 0.14 * H);
const arms: Shape = (c, W, H) => {
  c.fillRect(0.235 * W, 0.68 * H, 0.07 * W, 0.32 * H);
  c.fillRect(0.695 * W, 0.68 * H, 0.07 * W, 0.32 * H);
};
const hands: Shape = (c, W, H) => {
  c.beginPath();
  c.arc(0.27 * W, 0.97 * H, 0.035 * W, 0, Math.PI * 2);
  c.arc(0.73 * W, 0.97 * H, 0.035 * W, 0, Math.PI * 2);
  c.fill();
};
const head: Shape = (c, W, H) => {
  c.beginPath();
  c.ellipse(0.5 * W, 0.33 * H, 0.07 * W, 0.17 * H, 0, 0, Math.PI * 2);
  c.fill();
};
const hair: Shape = (c, W, H) => {
  c.beginPath();
  c.ellipse(0.5 * W, 0.22 * H, 0.074 * W, 0.09 * H, 0, Math.PI, 0);
  c.fill();
};

export function buildMannequin() {
  const W = MANNEQUIN_W;
  const H = MANNEQUIN_H;
  const video = document.createElement('canvas');
  video.width = W;
  video.height = H;
  const c = video.getContext('2d')!;
  const wall = c.createLinearGradient(0, 0, W, 0);
  wall.addColorStop(0, '#cfcac2');
  wall.addColorStop(0.5, '#e4e0d8');
  wall.addColorStop(1, '#c9c3ba');
  c.fillStyle = wall;
  c.fillRect(0, 0, W, H);
  c.fillStyle = '#ecebe7';
  shirt(c, W, H);
  // lipatan & bayangan kaos
  c.save();
  c.globalCompositeOperation = 'source-atop';
  const fold = c.createLinearGradient(0.3 * W, 0, 0.7 * W, 0);
  fold.addColorStop(0, 'rgba(0,0,0,0.22)');
  fold.addColorStop(0.5, 'rgba(0,0,0,0)');
  fold.addColorStop(1, 'rgba(0,0,0,0.22)');
  c.fillStyle = fold;
  c.fillRect(0, 0, W, H);
  c.restore();
  c.fillStyle = '#c99a7a';
  [neck, vneck, arms, hands].forEach((f) => f(c, W, H));
  c.fillStyle = '#d4a582';
  head(c, W, H);
  c.fillStyle = '#2d221c';
  hair(c, W, H);
  // grain kamera
  const id = c.getImageData(0, 0, W, H);
  for (let i = 0; i < id.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 22;
    id.data[i] += n;
    id.data[i + 1] += n;
    id.data[i + 2] += n;
  }
  c.putImageData(id, 0, 0);

  // mask buatan: R pakaian, G kulit badan, B wajah, A orang
  const M = MASK_SIZE;
  const layer = (fns: Shape[]) => {
    const cv = document.createElement('canvas');
    cv.width = M;
    cv.height = M;
    const x = cv.getContext('2d')!;
    x.fillStyle = '#fff';
    fns.forEach((f) => f(x, M, M));
    return x.getImageData(0, 0, M, M).data;
  };
  const cl = layer([shirt]);
  const vn = layer([vneck]);
  const sk = layer([neck, vneck, arms, hands]);
  const fa = layer([head]);
  const pe = layer([shirt, neck, arms, hands, head, hair]);
  const mask = new Uint8Array(M * M * 4);
  for (let i = 0; i < M * M; i++) {
    mask[i * 4] = vn[i * 4] > 0 ? 0 : cl[i * 4];
    mask[i * 4 + 1] = sk[i * 4];
    mask[i * 4 + 2] = fa[i * 4];
    mask[i * 4 + 3] = pe[i * 4];
  }
  return { video, mask };
}
