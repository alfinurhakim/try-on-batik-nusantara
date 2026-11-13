import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { Motif, Province } from '../types';
import { gununganArt, megaCloudArt, puffArt } from './art';
import { StampSeal } from '../passport/PassportModal';

// ---------------- tirai awan Mega Mendung (pembuka) ----------------

export type CloudCurtainState = 'cover' | 'peek' | 'open' | 'gone';

export function CloudCurtain({ state }: { state: CloudCurtainState }) {
  const left = useMemo(() => megaCloudArt(3, false), []);
  const right = useMemo(() => megaCloudArt(9, true), []);
  if (state === 'gone') return null;
  return (
    <div className={`cloud-curtain is-${state}`} aria-hidden>
      <div className="cloud-side left" style={{ backgroundImage: `url(${left})` }} />
      <div className="cloud-side right" style={{ backgroundImage: `url(${right})` }} />
    </div>
  );
}

// ---------------- terbang menembus awan ----------------

/** Setiap kali `trigger` berubah, awan-awan melesat dari tengah layar ke tepi. */
export function CloudRush({ trigger, strength = 1 }: { trigger: number; strength?: number }) {
  const puff = useMemo(() => puffArt(), []);
  const [active, setActive] = useState(0);
  useEffect(() => {
    if (!trigger) return;
    setActive(trigger);
    const id = window.setTimeout(() => setActive(0), 1700);
    return () => window.clearTimeout(id);
  }, [trigger]);
  const puffs = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const a = (i / 14) * Math.PI * 2 + (i % 3) * 0.3;
        return { dx: Math.cos(a) * 70, dy: Math.sin(a) * 55, rot: (i * 47) % 360, delay: (i % 5) * 0.07, size: 40 + (i % 4) * 14 };
      }),
    [],
  );
  if (!active) return null;
  return (
    <div className="cloud-rush" key={active} style={{ '--k': strength } as CSSProperties} aria-hidden>
      <div className="rush-veil" />
      {puffs.map((p, i) => (
        <img
          key={i}
          src={puff}
          alt=""
          style={{ '--dx': `${p.dx}vw`, '--dy': `${p.dy}vh`, '--rot': `${p.rot}deg`, '--size': `${p.size}vmax`, animationDelay: `${p.delay}s` } as CSSProperties}
        />
      ))}
    </div>
  );
}

// ---------------- gunungan wayang (transisi ke kamera) ----------------

export type GununganState = 'idle' | 'closing' | 'opening';

export function GununganTransition({ state, motif }: { state: GununganState; motif: Motif }) {
  const art = useMemo(() => gununganArt(motif), [motif]);
  if (state === 'idle') return null;
  return (
    <div className={`gunungan-fx is-${state}`} aria-hidden>
      <div className="kelir" />
      <img className="gunungan" src={art} alt="" />
      <div className="blencong" />
    </div>
  );
}

// ---------------- kilat kamera ----------------

export function Flash({ trigger }: { trigger: number }) {
  if (!trigger) return null;
  return <div className="flash" key={trigger} aria-hidden />;
}

// ---------------- konfeti potongan motif ----------------

export function Confetti({ trigger, colors }: { trigger: number; colors: string[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const colorsRef = useRef(colors);
  colorsRef.current = colors;
  useEffect(() => {
    if (!trigger) return;
    const palette = colorsRef.current;
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    c.width = window.innerWidth;
    c.height = window.innerHeight;
    const parts = Array.from({ length: 160 }, () => ({
      x: c.width / 2 + (Math.random() - 0.5) * 200,
      y: c.height * 0.45,
      vx: (Math.random() - 0.5) * 16,
      vy: -8 - Math.random() * 12,
      r: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      w: 8 + Math.random() * 10,
      h: 5 + Math.random() * 8,
      color: palette[Math.floor(Math.random() * palette.length)],
      shape: Math.random() < 0.3 ? 'circle' : Math.random() < 0.5 ? 'diamond' : 'rect',
    }));
    let raf = 0;
    const start = performance.now();
    const tick = () => {
      const t = performance.now() - start;
      ctx.clearRect(0, 0, c.width, c.height);
      for (const p of parts) {
        p.vy += 0.35;
        p.vx *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.r += p.vr;
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - t / 3200);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.fillStyle = p.color;
        ctx.scale(1, Math.abs(Math.cos(p.r * 2)) + 0.2);
        if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.shape === 'diamond') {
          ctx.rotate(Math.PI / 4);
          ctx.fillRect(-p.w / 3, -p.w / 3, (p.w * 2) / 3, (p.w * 2) / 3);
        } else ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (t < 3300) raf = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, c.width, c.height);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [trigger]);
  return <canvas ref={ref} className="confetti" aria-hidden />;
}

// ---------------- stempel paspor baru ----------------

export function StampToast({ province, motifId, onDone }: { province: Province; motifId: string; onDone: () => void }) {
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  useEffect(() => {
    const id = window.setTimeout(() => doneRef.current(), 3200);
    return () => window.clearTimeout(id);
  }, []);
  return (
    <div className="stamp-toast" role="status">
      <div className="stamp-thunk">
        <StampSeal province={province} earned size={150} rotate={-10} motifId={motifId} />
      </div>
      <div className="stamp-text">
        <span className="eyebrow">Stempel baru!</span>
        <strong>{province.name}</strong>
        <span>tercap di Paspor Batik Anda</span>
      </div>
    </div>
  );
}

// ---------------- filter SVG "kain berkibar" ----------------

export function ClothFilterDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
      <defs>
        <filter id="kain-berkibar" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.012 0.03" numOctaves="2" seed="3" result="noise">
            <animate attributeName="baseFrequency" dur="4s" values="0.012 0.03;0.016 0.026;0.012 0.03" repeatCount="indefinite" />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="9" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
  );
}
