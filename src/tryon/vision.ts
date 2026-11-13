import { FilesetResolver, ImageSegmenter, PoseLandmarker } from '@mediapipe/tasks-vision';

/**
 * Model computer vision yang berjalan sepenuhnya di browser:
 *  - Selfie Multiclass Segmentation → piksel mana yang "pakaian" (kelas 4)
 *  - Pose Landmarker (lite) → titik bahu & pinggul untuk menambatkan motif ke badan
 * Versi WASM harus sama dengan versi paket di package.json.
 */
const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
const SEG_MODEL = 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite';
const POSE_MODEL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

export const BACKGROUND_CLASS = 0;
export const CLOTHES_CLASS = 4;
export const BODY_SKIN_CLASS = 2;
export const FACE_SKIN_CLASS = 3;

export interface Landmark {
  x: number;
  y: number;
  visibility?: number;
}

export interface VisionFrame {
  /** RGBA per piksel: R = pakaian, G = kulit badan, B = kulit wajah, A = orang (bukan latar). Baris pertama = atas gambar. */
  mask: Uint8Array | null;
  maskW: number;
  maskH: number;
  landmarks: Landmark[] | null;
  /** semua orang yang terdeteksi (maks. 2) */
  poses: Landmark[][];
}

export class Vision {
  private segmenter: ImageSegmenter | null = null;
  private pose: PoseLandmarker | null = null;
  private lastTs = 0;
  private frame = 0;
  private maskBuf: Uint8Array | null = null;
  private lastLandmarks: Landmark[] | null = null;
  private lastPoses: Landmark[][] = [];
  delegate: 'GPU' | 'CPU' = 'GPU';

  async init(onProgress?: (msg: string) => void) {
    onProgress?.('Memuat mesin penglihatan…');
    const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
    onProgress?.('Memuat model segmentasi pakaian…');
    const makeSeg = (delegate: 'GPU' | 'CPU') =>
      ImageSegmenter.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: SEG_MODEL, delegate },
        runningMode: 'VIDEO',
        outputCategoryMask: false,
        outputConfidenceMasks: true,
      });
    const makePose = (delegate: 'GPU' | 'CPU') =>
      PoseLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: POSE_MODEL, delegate },
        runningMode: 'VIDEO',
        numPoses: 2,
      });
    try {
      this.segmenter = await makeSeg('GPU');
    } catch {
      this.delegate = 'CPU';
      this.segmenter = await makeSeg('CPU');
    }
    onProgress?.('Memuat model pose tubuh…');
    try {
      this.pose = await makePose(this.delegate);
    } catch {
      this.pose = await makePose('CPU');
    }
  }

  /** Proses satu frame video. Pose dijalankan selang-seling supaya lebih ringan. */
  process(video: HTMLVideoElement): VisionFrame {
    let ts = performance.now();
    if (ts <= this.lastTs) ts = this.lastTs + 1;
    this.lastTs = ts;
    this.frame++;
    const out: VisionFrame = { mask: null, maskW: 0, maskH: 0, landmarks: this.lastLandmarks, poses: this.lastPoses };

    if (this.segmenter) {
      this.segmenter.segmentForVideo(video, ts, (result) => {
        const masks = result.confidenceMasks;
        const cl = masks?.[CLOTHES_CLASS];
        if (!masks || !cl) return;
        const fc = cl.getAsFloat32Array();
        const fb = masks[BODY_SKIN_CLASS]?.getAsFloat32Array();
        const ff = masks[FACE_SKIN_CLASS]?.getAsFloat32Array();
        const fbg = masks[BACKGROUND_CLASS]?.getAsFloat32Array();
        const n = fc.length;
        if (!this.maskBuf || this.maskBuf.length !== n * 4) this.maskBuf = new Uint8Array(n * 4);
        const buf = this.maskBuf;
        for (let i = 0, j = 0; i < n; i++, j += 4) {
          buf[j] = fc[i] * 255;
          buf[j + 1] = fb ? fb[i] * 255 : 0;
          buf[j + 2] = ff ? ff[i] * 255 : 0;
          buf[j + 3] = fbg ? (1 - fbg[i]) * 255 : 255;
        }
        out.mask = buf;
        out.maskW = cl.width;
        out.maskH = cl.height;
      });
    }
    if (this.pose && this.frame % 2 === 0) {
      const res = this.pose.detectForVideo(video, ts);
      this.lastPoses = res.landmarks ?? [];
      // orang utama = yang bahunya paling lebar (paling dekat ke kamera)
      const width = (l: Landmark[]) => (l[11] && l[12] ? Math.abs(l[11].x - l[12].x) : 0);
      this.lastLandmarks = this.lastPoses.length ? [...this.lastPoses].sort((a, b) => width(b) - width(a))[0] : null;
      out.landmarks = this.lastLandmarks;
      out.poses = this.lastPoses;
    }
    return out;
  }

  close() {
    this.segmenter?.close();
    this.pose?.close();
    this.segmenter = null;
    this.pose = null;
  }
}

// ---------- satu instance bersama, bisa dipra-muat saat pengguna masih di peta ----------

let shared: Promise<Vision> | null = null;
let progressCb: ((msg: string) => void) | null = null;
let ready = false;

export function getVision(onProgress?: (msg: string) => void): Promise<Vision> {
  progressCb = onProgress ?? progressCb;
  if (!shared) {
    const v = new Vision();
    shared = v
      .init((m) => progressCb?.(m))
      .then(() => {
        ready = true;
        return v;
      })
      .catch((err) => {
        shared = null;
        throw err;
      });
  }
  return shared;
}

/** Mulai memuat model di latar belakang (dipanggil saat pengguna masuk ke peta). */
export function preloadVision() {
  getVision().catch(() => undefined);
}

export function visionIsReady() {
  return ready;
}
