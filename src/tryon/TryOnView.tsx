import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import type { ProvinceId } from '../types';
import { cityById, motifsOfProvince, provinceById } from '../data/regions';
import { getMotifThumb, getMotifTile, getOrnament, motifDensity, trimColor } from '../motifs/textures';
import type { Motif } from '../types';
import { TryOnRenderer } from './renderer';
import { CLOTHES_CLASS, getVision, type Landmark, type Vision } from './vision';
import { buildShareCard, type ShareCard } from './shareCard';
import ShareModal from './ShareModal';
import { createGestureState, detectPhotoPose, detectSwipe } from './gestures';
import { gamelan } from '../audio/gamelan';
import { Flash } from '../fx/Effects';
import { cityBackdrop } from '../fx/art';
import { speak, stopSpeaking, canSpeak } from '../audio/narrator';

interface Props {
  provinceId: ProvinceId;
  motifId: string;
  onMotifChange: (id: string) => void;
  onBack: () => void;
  /** dipanggil setiap motif benar-benar dicoba (kamera siap) — untuk Paspor Batik */
  onTried: (motifId: string) => void;
}

type Status = 'camera' | 'model' | 'ready' | 'error';

const TRANSITION_MS = 1100;
const SIZE_MUL = { kecil: 1.35, sedang: 1, besar: 0.72 } as const;
type SizeKey = keyof typeof SIZE_MUL;

const FOLD = { mati: 0, halus: 0.35, kuat: 0.75 } as const;
type FoldKey = keyof typeof FOLD;

type Hand = [number, number, number];
const NO_HAND: Hand = [0, 0, 0];

/** Lingkaran yang menutupi telapak tangan (pergelangan, kelingking, telunjuk, jempol). */
function handCircle(lms: Landmark[], ids: number[], aspect: number, scale: number): Hand {
  const w = lms[ids[0]];
  if (!w || (w.visibility ?? 1) < 0.5) return NO_HAND;
  const pts = ids.map((i) => lms[i]).filter((p): p is Landmark => !!p);
  const cx = pts.reduce((a, p) => a + p.x, 0) / pts.length;
  const cy = pts.reduce((a, p) => a + p.y, 0) / pts.length;
  const far = Math.max(...pts.map((p) => Math.hypot((p.x - cx) * aspect, p.y - cy)));
  return [cx, cy, Math.max(scale * 0.1, far * 1.5)];
}

const motifTex = (m: Motif) => ({ tile: getMotifTile(m), ornament: getOrnament(m), trim: trimColor(m) });

interface Body {
  cx: number;
  cy: number;
  angle: number;
  scale: number;
  found: boolean;
}

export default function TryOnView({ provinceId, motifId, onMotifChange, onBack, onTried }: Props) {
  const province = provinceById(provinceId)!;
  const motifs = useMemo(() => motifsOfProvince(provinceId), [provinceId]);
  const startIndex = Math.max(0, motifs.findIndex((m) => m.id === motifId));
  const [index, setIndex] = useState(startIndex);
  const motif = motifs[index];
  const city = cityById(motif.cityId)!;

  const [status, setStatus] = useState<Status>('camera');
  const [statusMsg, setStatusMsg] = useState('Menyalakan kamera…');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dev, setDev] = useState(false);
  const [fps, setFps] = useState(0);
  const [hint, setHint] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [card, setCard] = useState<ShareCard | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [collar, setCollar] = useState(true);
  const [ornament, setOrnament] = useState(true);
  const [size, setSize] = useState<SizeKey>('sedang');
  const [sleeve, setSleeve] = useState(false);
  const [fold, setFold] = useState<FoldKey>('halus');
  const [collarY, setCollarY] = useState(0);
  const [panelOpen, setPanelOpen] = useState(true);
  const [bgOn, setBgOn] = useState(false);
  const [duo, setDuo] = useState(false);
  const [sparkOn, setSparkOn] = useState(true);
  const [split, setSplit] = useState<{ screen: number; canvas: number } | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [duoHint, setDuoHint] = useState(false);
  const styleRef = useRef({ collar, ornament, mul: SIZE_MUL[size], sleeve, fold: FOLD[fold], collarY, bgOn, duo, sparkOn, split: split?.canvas ?? 0 });
  styleRef.current = { collar, ornament, mul: SIZE_MUL[size], sleeve, fold: FOLD[fold], collarY, bgOn, duo, sparkOn, split: split?.canvas ?? 0 };
  const [gestureOn, setGestureOn] = useState(true);
  const [autoPhoto, setAutoPhoto] = useState(true);
  const [gestureFx, setGestureFx] = useState<{ dir: number; n: number } | null>(null);
  const [poseHold, setPoseHold] = useState(0);
  const [flash, setFlash] = useState(0);
  const flagsRef = useRef({ gestureOn, autoPhoto, busy: false });
  flagsRef.current = { gestureOn, autoPhoto, busy: countdown !== null || card !== null };
  const goRef = useRef<(d: number) => void>(() => undefined);
  const startCountdownRef = useRef<() => void>(() => undefined);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<TryOnRenderer | null>(null);
  const devRef = useRef(dev);
  devRef.current = dev;

  // status transisi motif, disimpan di ref agar loop render tidak perlu re-render React
  const trans = useRef({ densityA: motifDensity(motif), densityB: motifDensity(motif), start: 0, active: false, shownIndex: startIndex });

  // ---------- kamera + model + loop render ----------
  useEffect(() => {
    let cancelled = false;
    let raf = 0;
    let stream: MediaStream | null = null;
    let vision: Vision | null = null;
    let visionReady = false;
    const body: Body = { cx: 0.5, cy: 0.42, angle: 0, scale: 0.3, found: false };
    const body2: Body = { cx: 0.5, cy: 0.42, angle: 0, scale: 0.3, found: false };
    let hands: Hand[] = [];
    let poses: Landmark[][] = [];
    let duoMissingSince = 0;
    // debu emas yang keluar dari ujung jari
    const sparks: { x: number; y: number; vx: number; vy: number; life: number; size: number }[] = [];
    const lastTips = new Map<string, { x: number; y: number }>();
    let refLum = 0.5;
    let frame = 0;
    let lastFpsT = performance.now();
    let fpsFrames = 0;
    let lowCoverageSince = 0;
    let lastMask: Uint8Array | null = null;
    let maskW = 0;
    let maskH = 0;
    const lumCanvas = document.createElement('canvas');
    lumCanvas.width = 64;
    lumCanvas.height = 36;
    const lumCtx = lumCanvas.getContext('2d', { willReadFrequently: true });
    const gst = createGestureState();
    let lastHold = 0;

    async function setup() {
      setStatus('camera');
      setErrorMsg(null);
      setStatusMsg('Menyalakan kamera…');
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }, audio: false });
      } catch (err) {
        const name = (err as DOMException)?.name;
        setErrorMsg(
          name === 'NotAllowedError'
            ? 'Izin kamera ditolak. Izinkan akses kamera di pengaturan browser (ikon gembok di samping alamat), lalu coba lagi.'
            : name === 'NotFoundError'
              ? 'Kamera tidak ditemukan. Pastikan webcam terpasang dan tidak sedang dipakai aplikasi lain.'
              : 'Kamera tidak bisa dinyalakan. Pastikan halaman dibuka lewat http://localhost atau https.',
        );
        setStatus('error');
        return;
      }
      if (cancelled) {
        stream.getTracks().forEach((tr) => tr.stop());
        return;
      }
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play().catch(() => undefined);
      await new Promise<void>((res) => (video.readyState >= 2 ? res() : video.addEventListener('loadeddata', () => res(), { once: true })));
      if (cancelled) return;

      try {
        const r = new TryOnRenderer(canvasRef.current!);
        r.setMotif('A', motifTex(motifs[trans.current.shownIndex]));
        trans.current.active = false;
        trans.current.densityA = motifDensity(motifs[trans.current.shownIndex]);
        rendererRef.current = r;
      } catch (err) {
        setErrorMsg((err as Error).message);
        setStatus('error');
        return;
      }
      raf = requestAnimationFrame(loop);

      setStatus('model');
      try {
        vision = await getVision((m) => !cancelled && setStatusMsg(m));
        if (cancelled) return;
        visionReady = true;
        setStatus('ready');
      } catch (err) {
        if (cancelled) return;
        console.error(err);
        setErrorMsg('Model AI gagal dimuat. Periksa koneksi internet (model diunduh dari Google & jsDelivr), lalu coba lagi.');
        setStatus('error');
      }
    }

    function updateBody(body: Body, lms: Landmark[] | null, aspect: number) {
      const ls = lms?.[11];
      const rs = lms?.[12];
      const ok = !!ls && !!rs && (ls.visibility ?? 1) > 0.5 && (rs.visibility ?? 1) > 0.5;
      body.found = ok;
      let tx = 0.5;
      let ty = 0.42;
      let ta = 0;
      let tsc = 0.3;
      if (ok) {
        const dx = (ls!.x - rs!.x) * aspect;
        const dy = ls!.y - rs!.y;
        tsc = Math.max(0.08, Math.hypot(dx, dy));
        ta = Math.atan2(dy, dx);
        tx = (ls!.x + rs!.x) / 2;
        // jangkar = pangkal leher (tengah kedua bahu)
        ty = (ls!.y + rs!.y) / 2;
      }
      const k = ok ? 0.35 : 0.05;
      body.cx += (tx - body.cx) * k;
      body.cy += (ty - body.cy) * k;
      body.angle += (ta - body.angle) * k;
      body.scale += (tsc - body.scale) * k;
    }

    function updateRefLum(video: HTMLVideoElement) {
      if (!lumCtx || !lastMask) return;
      lumCtx.drawImage(video, 0, 0, 64, 36);
      const px = lumCtx.getImageData(0, 0, 64, 36).data;
      let sum = 0;
      let n = 0;
      for (let y = 0; y < 36; y++) {
        for (let x = 0; x < 64; x++) {
          const mx = Math.floor((x / 64) * maskW);
          const my = Math.floor((y / 36) * maskH);
          if (lastMask[(my * maskW + mx) * 4] > 150) {
            const i = (y * 64 + x) * 4;
            sum += (0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]) / 255;
            n++;
          }
        }
      }
      if (n > 25) refLum += (sum / n - refLum) * 0.5;
      // pakaian terlihat cukup luas?
      const coverage = n / (64 * 36);
      const now = performance.now();
      if (coverage < 0.04) {
        if (!lowCoverageSince) lowCoverageSince = now;
        if (now - lowCoverageSince > 1500) setHint('Mundur sedikit supaya badan terlihat sampai pinggang.');
      } else {
        lowCoverageSince = 0;
        setHint(null);
      }
    }

    function drawOverlay(list: Landmark[][], sparkOn: boolean) {
      const oc = overlayRef.current;
      if (!oc) return;
      const ctx = oc.getContext('2d');
      if (!ctx) return;
      if (oc.width !== canvasRef.current!.width) {
        oc.width = canvasRef.current!.width;
        oc.height = canvasRef.current!.height;
      }
      const W = oc.width;
      const H = oc.height;
      ctx.clearRect(0, 0, W, H);

      // debu emas: muncul dari ujung telunjuk, makin banyak saat tangan bergerak cepat
      if (sparkOn) {
        list.forEach((lms, pi) => {
          for (const tip of [19, 20]) {
            const p = lms[tip];
            if (!p || (p.visibility ?? 1) < 0.5) continue;
            const key = `${pi}-${tip}`;
            const x = p.x * W;
            const y = p.y * H;
            const prev = lastTips.get(key);
            lastTips.set(key, { x, y });
            const speed = prev ? Math.hypot(x - prev.x, y - prev.y) : 0;
            const n = speed > 3 ? Math.min(7, Math.floor(speed / 5) + 1) : frame % 4 === 0 ? 1 : 0;
            for (let i = 0; i < n; i++) {
              const t = i / Math.max(1, n);
              sparks.push({
                x: prev ? prev.x + (x - prev.x) * t : x,
                y: prev ? prev.y + (y - prev.y) * t : y,
                vx: (Math.random() - 0.5) * 1.6,
                vy: -0.4 - Math.random() * 1.2,
                life: 1,
                size: 2 + Math.random() * 4,
              });
            }
          }
        });
      }
      if (sparks.length) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (let i = sparks.length - 1; i >= 0; i--) {
          const sp = sparks[i];
          sp.x += sp.vx;
          sp.y += sp.vy;
          sp.vy -= 0.015;
          sp.vx *= 0.98;
          sp.life -= 0.018;
          if (sp.life <= 0) {
            sparks.splice(i, 1);
            continue;
          }
          const rad = sp.size * (0.6 + sp.life);
          const g = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, rad * 2.2);
          g.addColorStop(0, `rgba(255,240,190,${sp.life})`);
          g.addColorStop(0.35, `rgba(255,196,90,${sp.life * 0.7})`);
          g.addColorStop(1, 'rgba(255,170,60,0)');
          ctx.fillStyle = g;
          ctx.fillRect(sp.x - rad * 2.2, sp.y - rad * 2.2, rad * 4.4, rad * 4.4);
        }
        ctx.restore();
        if (sparks.length > 600) sparks.splice(0, sparks.length - 600);
      }

      if (!devRef.current) return;
      for (const lms of list) {
        ctx.fillStyle = '#ffd166';
        for (const i of [0, 11, 12, 13, 14, 15, 16, 19, 20, 23, 24]) {
          const p = lms[i];
          if (!p) continue;
          ctx.beginPath();
          ctx.arc(p.x * W, p.y * H, 6, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.strokeStyle = '#ffd166';
        ctx.lineWidth = 3;
        for (const [a, b] of [[11, 12], [11, 23], [12, 24], [23, 24], [11, 13], [13, 15], [12, 14], [14, 16]]) {
          if (!lms[a] || !lms[b]) continue;
          ctx.beginPath();
          ctx.moveTo(lms[a].x * W, lms[a].y * H);
          ctx.lineTo(lms[b].x * W, lms[b].y * H);
          ctx.stroke();
        }
      }
      // jangkar motif
      ctx.strokeStyle = '#ff4f8b';
      for (const bd of body2.found ? [body, body2] : [body]) {
        ctx.beginPath();
        ctx.arc(bd.cx * W, bd.cy * H, bd.scale * H * 0.5, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    function loop() {
      raf = requestAnimationFrame(loop);
      const video = videoRef.current;
      const r = rendererRef.current;
      if (!video || !r || video.readyState < 2) return;
      const w = video.videoWidth;
      const h = video.videoHeight;
      r.resize(w, h);
      frame++;

      let lms: Landmark[] | null = null;
      if (visionReady && vision) {
        const res = vision.process(video);
        if (res.mask) {
          r.updateMask(res.mask, res.maskW, res.maskH);
          lastMask = res.mask;
          maskW = res.maskW;
          maskH = res.maskH;
        }
        lms = res.landmarks;
        updateBody(body, lms, w / h);
        poses = res.poses;
        const st0 = styleRef.current;
        // mode berdua: orang kedua = pose lain selain orang utama
        const second = st0.duo ? poses.find((p) => p !== lms) ?? null : null;
        if (second) updateBody(body2, second, w / h);
        else body2.found = false;
        if (st0.duo && !second) {
          if (!duoMissingSince) duoMissingSince = performance.now();
          if (performance.now() - duoMissingSince > 1200) setDuoHint(true);
        } else {
          duoMissingSince = 0;
          setDuoHint(false);
        }
        hands = [];
        for (const [pl, sc] of [[lms, body.scale], [second, body2.scale]] as const) {
          if (!pl) continue;
          hands.push(handCircle(pl, [15, 17, 19, 21], w / h, sc), handCircle(pl, [16, 18, 20, 22], w / h, sc));
        }
        if (frame % 10 === 0) updateRefLum(video);
        // gestur tangan
        const fl = flagsRef.current;
        if (lms && body.found) {
          const now = performance.now();
          if (fl.gestureOn && !fl.busy) {
            const dir = detectSwipe(gst, lms, now, w / h, body.scale);
            if (dir) {
              goRef.current(dir);
              gamelan.sfx('whoosh');
              setGestureFx({ dir, n: now });
            }
          }
          if (fl.autoPhoto && !fl.busy) {
            const pose = detectPhotoPose(gst, lms, now, w / h, body.scale);
            const hold = Math.round(pose.holding * 10) / 10;
            if (hold !== lastHold) {
              lastHold = hold;
              setPoseHold(hold);
            }
            if (pose.fire) {
              setPoseHold(0);
              lastHold = 0;
              startCountdownRef.current();
            }
          } else if (lastHold) {
            lastHold = 0;
            setPoseHold(0);
          }
        }
      }

      // transisi motif
      const t = trans.current;
      let mixV = 0;
      if (t.active) {
        mixV = Math.min(1, (performance.now() - t.start) / TRANSITION_MS);
        if (mixV >= 1) {
          r.swapMotifs();
          t.densityA = t.densityB;
          t.active = false;
          mixV = 0;
        }
      }

      const st = styleRef.current;
      const frameOf = (bd: Body) => ({ neck: [bd.cx, bd.cy] as [number, number], angle: bd.angle, scale: bd.scale });
      r.render(video, {
        bodies: st.duo && body2.found ? [frameOf(body), frameOf(body2)] : [frameOf(body)],
        bg: st.bgOn,
        split: st.split,
        densityA: t.densityA * st.mul,
        densityB: t.densityB * st.mul,
        mix: mixV,
        refLum,
        dev: devRef.current,
        collar: st.collar,
        ornament: st.ornament,
        collarY: st.collarY,
        fold: st.fold,
        sleeve: st.sleeve,
        hands: hands.length ? hands : [NO_HAND],
      });
      drawOverlay(poses.length ? poses : lms ? [lms] : [], st.sparkOn);

      fpsFrames++;
      const now = performance.now();
      if (now - lastFpsT > 1000) {
        setFps(Math.round((fpsFrames * 1000) / (now - lastFpsT)));
        fpsFrames = 0;
        lastFpsT = now;
      }
    }

    setup();
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((tr) => tr.stop());
      rendererRef.current?.dispose();
      rendererRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryKey]);

  // ---------- ganti motif ----------
  useEffect(() => {
    const r = rendererRef.current;
    const t = trans.current;
    if (t.shownIndex === index) return;
    const next = motifs[index];
    if (r) {
      if (t.active) {
        // transisi sebelumnya belum selesai: selesaikan dulu
        r.swapMotifs();
        t.densityA = t.densityB;
      }
      r.setMotif('B', motifTex(next));
      t.densityB = motifDensity(next);
      t.start = performance.now();
      t.active = true;
    } else {
      t.densityA = motifDensity(next);
    }
    t.shownIndex = index;
    onMotifChange(next.id);
  }, [index, motifs, onMotifChange]);

  const go = useCallback((delta: number) => setIndex((i) => (i + delta + motifs.length) % motifs.length), [motifs.length]);
  goRef.current = go;

  // latar kota virtual mengikuti kota asal motif
  useEffect(() => {
    rendererRef.current?.setBackground(cityBackdrop(city.id, motif));
  }, [city.id, motif, status]);

  // narasi suara
  const narrate = useCallback(() => {
    const ok = speak(`Batik ${motif.name}, dari ${city.name}. ${motif.meaning}`, () => setSpeaking(false));
    setSpeaking(ok);
  }, [motif, city]);
  const speakingRef = useRef(speaking);
  speakingRef.current = speaking;
  useEffect(() => {
    if (speakingRef.current) narrate();
  }, [narrate]);
  useEffect(() => () => stopSpeaking(), []);

  // slider sebelum/sesudah
  const stageRef = useRef<HTMLDivElement>(null);
  const toCanvasFrac = (f: number) => {
    const el = stageRef.current;
    const cv = canvasRef.current;
    if (!el || !cv || !cv.width) return f;
    const rect = el.getBoundingClientRect();
    const ca = cv.width / cv.height;
    const cc = rect.width / rect.height;
    if (ca <= cc) return f;
    const wd = rect.height * ca;
    return ((wd - rect.width) / 2 + f * rect.width) / wd;
  };
  const setSplitAt = (f: number) => {
    const fs = Math.min(0.98, Math.max(0.02, f));
    setSplit({ screen: fs, canvas: toCanvasFrac(fs) });
  };
  const dragSplit = (e: RPointerEvent) => {
    e.stopPropagation();
    const el = stageRef.current;
    if (!el) return;
    const move = (ev: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      setSplitAt((ev.clientX - rect.left) / rect.width);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  // bunyi bonang setiap ganti motif + catat ke Paspor Batik
  const firstIndex = useRef(true);
  useEffect(() => {
    if (firstIndex.current) {
      firstIndex.current = false;
      return;
    }
    gamelan.sfx('bonang');
  }, [index]);
  useEffect(() => {
    if (status === 'ready') onTried(motifs[index].id);
  }, [status, index, motifs, onTried]);

  // ---------- foto ----------
  const capture = useCallback(async () => {
    const src = canvasRef.current;
    if (!src) return;
    const photo = document.createElement('canvas');
    photo.width = src.width;
    photo.height = src.height;
    const ctx = photo.getContext('2d')!;
    // tampilan di layar dicerminkan, jadi foto juga dicerminkan
    ctx.translate(photo.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(src, 0, 0);
    if (!devRef.current && overlayRef.current) ctx.drawImage(overlayRef.current, 0, 0);
    gamelan.sfx('shutter');
    setFlash((f) => f + 1);
    const m = motifs[trans.current.shownIndex];
    const built = await buildShareCard(photo, m, cityById(m.cityId)!, province);
    window.setTimeout(() => {
      setCard(built);
      gamelan.sfx('chime');
    }, 450);
  }, [motifs, province]);

  const startCountdown = useCallback(() => {
    if (countdown !== null || status !== 'ready') return;
    let n = 3;
    setCountdown(n);
    gamelan.sfx('tick');
    const id = window.setInterval(() => {
      n--;
      if (n === 0) {
        window.clearInterval(id);
        setCountdown(null);
        capture();
      } else {
        setCountdown(n);
        gamelan.sfx('tick');
      }
    }, 800);
  }, [capture, countdown, status]);
  startCountdownRef.current = startCountdown;

  useEffect(() => {
    if (card) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'Escape') onBack();
      else if (e.key.toLowerCase() === 'd') setDev((d) => !d);
      else if (e.key === ' ') {
        e.preventDefault();
        startCountdown();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [card, go, onBack, startCountdown]);

  useEffect(() => () => {
    if (card) URL.revokeObjectURL(card.url);
  }, [card]);

  // ---------- geser (swipe) ----------
  const swipe = useRef<{ x: number; t: number } | null>(null);
  const onPointerDown = (e: RPointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    swipe.current = { x: e.clientX, t: performance.now() };
  };
  const onPointerUp = (e: RPointerEvent) => {
    const s = swipe.current;
    swipe.current = null;
    if (!s) return;
    const dx = e.clientX - s.x;
    if (Math.abs(dx) > 60 && performance.now() - s.t < 900) go(dx < 0 ? 1 : -1);
  };

  return (
    <div className="tryon" onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
      <video ref={videoRef} className="tryon-video" playsInline muted />
      <div className="tryon-stage" ref={stageRef}>
        <canvas ref={canvasRef} className="tryon-canvas" />
        <canvas ref={overlayRef} className="tryon-canvas tryon-overlay" />
      </div>

      <header className="tryon-top">
        <button className="btn btn-glass" onClick={onBack}>
          ← Kembali ke peta
        </button>
        <div className="tryon-place">
          <span>{province.name}</span>
          <strong>{city.name}</strong>
        </div>
        <div className="tryon-top-right">
          <button className={`btn btn-glass${dev ? ' is-on' : ''}`} onClick={() => setDev((d) => !d)} title="Tampilkan mask segmentasi & titik pose (tombol D)">
            Mode developer
          </button>
        </div>
      </header>

      <div className={`style-panel${panelOpen ? '' : ' is-closed'}`}>
        <button className="style-toggle" onClick={() => setPanelOpen((v) => !v)}>
          Gaya kemeja <span>{panelOpen ? '▾' : '▸'}</span>
        </button>
        {panelOpen && (
          <div className="style-body">
            <button className={`chip${collar ? ' is-on' : ''}`} onClick={() => setCollar((v) => !v)}>
              Kerah &amp; kancing
            </button>
            <button className={`chip${sleeve ? ' is-on' : ''}`} onClick={() => setSleeve((v) => !v)}>
              Lengan panjang
            </button>
            <button className={`chip${ornament ? ' is-on' : ''}`} onClick={() => setOrnament((v) => !v)}>
              Ornamen dada
            </button>
            <span className="style-label">Efek</span>
            <button className={`chip${bgOn ? ' is-on' : ''}`} onClick={() => setBgOn((v) => !v)}>
              Latar kota virtual
            </button>
            <button className={`chip${sparkOn ? ' is-on' : ''}`} onClick={() => setSparkOn((v) => !v)}>
              Debu emas di jari
            </button>
            <button className={`chip${duo ? ' is-on' : ''}`} onClick={() => setDuo((v) => !v)}>
              Mode berdua (sarimbit)
            </button>
            <button className={`chip${split ? ' is-on' : ''}`} onClick={() => (split ? setSplit(null) : setSplitAt(0.5))}>
              Sebelum / sesudah
            </button>
            <span className="style-label">Posisi kerah</span>
            <div className="range-row">
              <span>Naik</span>
              <input type="range" min={-0.15} max={0.15} step={0.01} value={collarY} onChange={(e) => setCollarY(Number(e.target.value))} />
              <span>Turun</span>
            </div>
            <span className="style-label">Lipatan kain asli</span>
            <div className="seg">
              {(Object.keys(FOLD) as FoldKey[]).map((k) => (
                <button key={k} className={fold === k ? 'is-on' : ''} onClick={() => setFold(k)}>
                  {k.charAt(0).toUpperCase() + k.slice(1)}
                </button>
              ))}
            </div>
            <span className="style-label">Ukuran motif</span>
            <div className="seg">
              {(Object.keys(SIZE_MUL) as SizeKey[]).map((k) => (
                <button key={k} className={size === k ? 'is-on' : ''} onClick={() => setSize(k)}>
                  {k.charAt(0).toUpperCase() + k.slice(1)}
                </button>
              ))}
            </div>
            <span className="style-label">Gestur</span>
            <button className={`chip${gestureOn ? ' is-on' : ''}`} onClick={() => setGestureOn((v) => !v)} title="Lambaikan tangan ke kiri/kanan setinggi dada">
              Lambaian ganti motif
            </button>
            <button className={`chip${autoPhoto ? ' is-on' : ''}`} onClick={() => setAutoPhoto((v) => !v)} title="Kacak pinggang atau angkat kedua tangan">
              Auto-foto saat berpose
            </button>
          </div>
        )}
      </div>

      {dev && (
        <div className="dev-panel">
          <div>FPS: {fps}</div>
          <div>Model: segmentasi multikelas (kelas {CLOTHES_CLASS} = pakaian) + pose lite</div>
          <div>Status: {status}</div>
        </div>
      )}

      {status !== 'ready' && status !== 'error' && (
        <div className="tryon-status">
          <div className="spinner" />
          <p>{statusMsg}</p>
          {status === 'model' && <p className="muted small">Pertama kali dimuat butuh beberapa detik.</p>}
        </div>
      )}

      {status === 'error' && (
        <div className="tryon-status is-error">
          <p>{errorMsg}</p>
          <div className="row">
            <button className="btn btn-primary" onClick={() => setRetryKey((k) => k + 1)}>
              Coba lagi
            </button>
            <button className="btn" onClick={onBack}>
              Kembali ke peta
            </button>
          </div>
        </div>
      )}

      {hint && status === 'ready' && <div className="tryon-hint">{hint}</div>}
      {duo && duoHint && status === 'ready' && !hint && <div className="tryon-hint">Ajak satu orang lagi masuk ke kamera untuk batik sarimbit 👫</div>}
      {split && (
        <div className="split-line" style={{ left: `${split.screen * 100}%` }}>
          <span className="split-tag before">Sebelum</span>
          <button className="split-knob" onPointerDown={dragSplit} aria-label="Geser pembanding sebelum/sesudah">
            ⇔
          </button>
          <span className="split-tag after">Sesudah</span>
        </div>
      )}
      {countdown !== null && <div className="countdown" key={countdown}>{countdown}</div>}
      {gestureFx && (
        <div className={`gesture-fx ${gestureFx.dir > 0 ? 'to-left' : 'to-right'}`} key={gestureFx.n} aria-hidden>
          <span>{gestureFx.dir > 0 ? '‹‹‹' : '›››'}</span>
          <em>👋</em>
        </div>
      )}
      {poseHold > 0 && countdown === null && (
        <div className="pose-hold" >
          <svg viewBox="0 0 44 44">
            <circle cx="22" cy="22" r="19" />
            <circle cx="22" cy="22" r="19" className="fg" style={{ strokeDashoffset: 120 - 120 * poseHold }} />
          </svg>
          <span>Tahan pose…</span>
        </div>
      )}
      <Flash trigger={flash} />


      <section className="motif-info" key={motif.id}>
        <span className="eyebrow">
          {city.name} · {index + 1}/{motifs.length}
        </span>
        <h2>{motif.name}</h2>
        <p>{motif.meaning}</p>
        {canSpeak() && (
          <button
            className={`listen${speaking ? ' is-on' : ''}`}
            onClick={() => {
              if (speaking) {
                stopSpeaking();
                setSpeaking(false);
              } else narrate();
            }}
          >
            {speaking ? '■ Berhenti' : '🔊 Dengarkan makna'}
            {speaking && (
              <span className="eq">
                <i />
                <i />
                <i />
              </span>
            )}
          </button>
        )}
      </section>

      <footer className="tryon-bottom">
        <button className="nav-arrow" onClick={() => go(-1)} aria-label="Motif sebelumnya">
          ‹
        </button>
        <div className="carousel">
          {motifs.map((m, i) => (
            <button key={m.id} className={`thumb${i === index ? ' is-active' : ''}`} onClick={() => setIndex(i)} title={`${m.name} (${cityById(m.cityId)?.name})`}>
              <img src={getMotifThumb(m, 96)} alt="" />
              <span>{m.name}</span>
            </button>
          ))}
        </div>
        <button className="nav-arrow" onClick={() => go(1)} aria-label="Motif berikutnya">
          ›
        </button>
        <button className="shutter" onClick={startCountdown} disabled={status !== 'ready'} aria-label="Ambil foto">
          <span />
        </button>
      </footer>
      <p className="tryon-keys">Lambaikan tangan, geser layar, atau tekan ← → untuk ganti motif · Kacak pinggang / angkat kedua tangan atau Spasi untuk foto</p>

      {card && <ShareModal card={card} colors={Object.values(motif.palette)} onClose={() => setCard(null)} />}
    </div>
  );
}
