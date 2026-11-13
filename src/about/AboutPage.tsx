import { useEffect, useMemo, useRef, useState } from 'react';
import { CITIES, MOTIFS, PROVINCES, cityById } from '../data/regions';
import { CITY_LANDMARK } from '../data/landmarks';
import { getMotifThumb, getMotifTile, getOrnament, motifDensity, trimColor } from '../motifs/textures';
import { TryOnRenderer } from '../tryon/renderer';
import { cityBackdrop } from '../fx/art';
import { gamelan } from '../audio/gamelan';
import { MANNEQUIN_BODY, MANNEQUIN_H, MANNEQUIN_HANDS, MANNEQUIN_W, MASK_SIZE, buildMannequin } from './mannequin';

/** Halaman portofolio "Di balik layar": cara kerja Try On Batik Nusantara, dengan demo interaktif. */
export default function AboutPage({ onBack, onTry }: { onBack: () => void; onTry: () => void }) {
  return (
    <div className="about">
      <header className="about-top">
        <button className="btn btn-glass" onClick={onBack}>
          ← Kembali
        </button>
        <span className="brand-small">Try On Batik Nusantara · Di balik layar</span>
        <button className="btn btn-primary" onClick={onTry}>
          Coba sekarang
        </button>
      </header>

      <section className="about-hero">
        <span className="eyebrow">Studi kasus portofolio</span>
        <h1>
          Kamera biasa, <em>kemeja batik</em>
          <br />
          dalam hitungan milidetik.
        </h1>
        <p>
          Seluruh proses berjalan di browser: dua model AI membaca tubuh dari webcam, lalu shader WebGL2 buatan sendiri &quot;menjahit&quot; kemeja batik lengkap dengan kerah, kancing, dan lengan, sekitar 30 kali per detik. Tidak ada video yang dikirim ke server.
        </p>
        <div className="stat-row">
          {[
            ['0', 'server untuk video'],
            ['2', 'model AI di browser'],
            [`${MOTIFS.length}`, 'motif prosedural'],
            [`${Object.keys(CITY_LANDMARK).length}`, 'landmark 3D'],
            [`${PROVINCES.length}/38`, 'provinsi aktif'],
          ].map(([n, l]) => (
            <div key={l} className="stat">
              <strong>{n}</strong>
              <span>{l}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="about-section">
        <h2>Alur pemrosesan setiap frame</h2>
        <Pipeline />
      </section>

      <section className="about-section">
        <h2>Coba shader-nya langsung</h2>
        <p className="lead">Tanpa kamera: ini manekin buatan dengan mask segmentasi sintetis, dirender oleh shader yang sama persis dengan layar try-on.</p>
        <LiveDemo />
      </section>

      <section className="about-section">
        <h2>Lima trik yang membuatnya terasa nyata</h2>
        <div className="trick-grid">
          {TRICKS.map((t, i) => (
            <article key={t.title} className="trick">
              <span className="trick-no">{String(i + 1).padStart(2, '0')}</span>
              <h3>{t.title}</h3>
              <p>{t.body}</p>
              <code>{t.code}</code>
            </article>
          ))}
        </div>
      </section>

      <section className="about-section two-col">
        <div>
          <h2>Peta 3D & suara</h2>
          <ul className="bullets">
            <li>Batas provinsi dari GeoJSON diekstrusi menjadi pulau 3D dengan Three.js (React Three Fiber).</li>
            <li>Motif batik &quot;tercelup&quot; di permukaan provinsi lewat shader material yang disisipkan (onBeforeCompile).</li>
            <li>{Object.keys(CITY_LANDMARK).length} landmark dibangun dari primitif (silinder, kerucut, kotak), tanpa file model.</li>
            <li>Gamelan disintesis dengan Web Audio: parsial inharmonis saron, gong berdenyut (ombak), kendang dari noise; tangga nada slendro, pelog, degung.</li>
          </ul>
          <div className="row left">
            <button className="btn" onClick={() => playDemo('gong')}>
              ▶ Gong
            </button>
            <button className="btn" onClick={() => playDemo('bonang')}>
              ▶ Bonang
            </button>
            <button className="btn" onClick={() => playDemo('chime')}>
              ▶ Saron
            </button>
          </div>
        </div>
        <div>
          <h2>Generator motif</h2>
          <p className="lead">16 pola dasar ditulis dengan Canvas 2D lalu diberi retakan lilin (remukan), celupan tidak rata, dan serat kain.</p>
          <div className="motif-gallery">
            {MOTIFS.map((m) => (
              <figure key={m.id}>
                <img src={getMotifThumb(m, 96)} alt="" />
                <figcaption>{m.name}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="about-section">
        <h2>Teknologi & kredit</h2>
        <div className="chips">
          {['React 18', 'TypeScript', 'Vite', 'Three.js', 'React Three Fiber', 'MediaPipe Tasks Vision', 'WebGL2 / GLSL ES 3.0', 'Web Audio API', 'Web Speech API', 'Canvas 2D'].map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
        <ul className="bullets small">
          <li>Model: MediaPipe Selfie Multiclass Segmentation & Pose Landmarker Lite (Google, Apache 2.0).</li>
          <li>Batas provinsi: peta-indonesia-geojson (MIT).</li>
          <li>Rencana dataset motif asli: Batik Nitik 960 (CC BY 4.0), Batik-Indonesia, koleksi Batik Lasem.</li>
          <li>Makna motif ditulis ringkas untuk edukasi; motif di versi ini masih buatan kode.</li>
        </ul>
      </section>

      <section className="about-cta">
        <h2>Siap mencoba?</h2>
        <button className="btn btn-primary btn-lg" onClick={onTry}>
          Jelajahi peta Nusantara →
        </button>
      </section>
    </div>
  );
}

async function playDemo(name: 'gong' | 'bonang' | 'chime') {
  try {
    if (!gamelan.started) {
      await gamelan.start('ambient');
      gamelan.setMuted(false);
    }
    gamelan.sfx(name);
  } catch {
    /* abaikan */
  }
}

const TRICKS = [
  {
    title: 'Koordinat tubuh',
    body: 'Titik bahu dari model pose menjadi sistem koordinat: titik nol di pangkal leher, satu unit = lebar bahu, ikut miring. Semua pola, kerah, dan kancing digambar di ruang ini, jadi ikut bergerak bersama badan.',
    code: 'b = rotate(uv − neck, −angle) / shoulderWidth',
  },
  {
    title: 'Kerah dari geometri',
    body: 'Kerah adalah segi empat cembung yang diuji per piksel dengan jarak bertanda (signed distance). Jarak yang sama dipakai untuk pinggiran, jahitan, dan bayangan di bawah kerah.',
    code: 'd = min(edge(C0,C1), edge(C1,C2), …)',
  },
  {
    title: 'Badan melengkung',
    body: 'Koordinat horizontal dipetakan ke busur silinder (arcsin), sehingga pola memadat di sisi tubuh, dan sisi badan sedikit digelapkan.',
    code: 's = R · asin(x / R)',
  },
  {
    title: 'Menutup penuh, tetap bervolume',
    body: 'Mask dipertegas dan sedikit dilebarkan agar tidak tembus. Hanya bayangan besar dari video (blur lebar) yang dipakai, sehingga lipatan terasa tanpa tekstur baju asli ikut terlihat.',
    code: 'shade = clamp(blur(lum) / ref, 0.72, 1.12)',
  },
  {
    title: 'Transisi pewarna',
    body: 'Ganti motif = lingkaran yang membesar dari dada dengan tepi bergerigi (value noise) dan kilau emas, seperti kain dicelup pewarna.',
    code: 'k = 1 − smoothstep(r − ε, r, |b − chest| + noise)',
  },
];

function Pipeline() {
  const steps = [
    ['📷', 'Kamera', 'webcam 1280×720'],
    ['🧩', 'Segmentasi', 'pakaian · kulit · wajah · latar'],
    ['🦴', 'Pose', '33 titik tubuh, 2 orang'],
    ['📐', 'Koordinat tubuh', 'leher · sudut · skala'],
    ['🎨', 'Shader WebGL2', 'pola · kerah · lengan · cahaya'],
    ['✨', 'Layar', '+ debu emas & gestur'],
  ];
  return (
    <div className="pipeline">
      {steps.map(([icon, title, sub], i) => (
        <div key={title} className="pipe-step" style={{ animationDelay: `${i * 0.12}s` }}>
          <span className="pipe-icon">{icon}</span>
          <strong>{title}</strong>
          <span>{sub}</span>
          {i < steps.length - 1 && <i className="pipe-arrow" />}
        </div>
      ))}
    </div>
  );
}

function LiveDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<TryOnRenderer | null>(null);
  const mannequin = useMemo(() => buildMannequin(), []);
  const [motifIdx, setMotifIdx] = useState(15);
  const [prevIdx, setPrevIdx] = useState(15);
  const [mix, setMix] = useState(0);
  const [collar, setCollar] = useState(true);
  const [sleeve, setSleeve] = useState(true);
  const [ornament, setOrnament] = useState(true);
  const [bg, setBg] = useState(false);
  const [split, setSplit] = useState(false);
  const [dev, setDev] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    try {
      const r = new TryOnRenderer(cv);
      r.resize(MANNEQUIN_W, MANNEQUIN_H);
      r.updateMask(mannequin.mask, MASK_SIZE, MASK_SIZE);
      rendererRef.current = r;
    } catch (e) {
      setError((e as Error).message);
    }
    return () => {
      rendererRef.current?.dispose();
      rendererRef.current = null;
    };
  }, [mannequin]);

  const motif = MOTIFS[motifIdx];
  const prev = MOTIFS[prevIdx];

  useEffect(() => {
    const r = rendererRef.current;
    if (!r) return;
    const tex = (m: typeof motif) => ({ tile: getMotifTile(m), ornament: getOrnament(m), trim: trimColor(m) });
    r.setMotif('A', tex(prev));
    r.setMotif('B', tex(motif));
    const city = cityById(motif.cityId) ?? CITIES[0];
    r.setBackground(cityBackdrop(city.id, motif));
    r.render(mannequin.video, {
      bodies: [MANNEQUIN_BODY],
      densityA: motifDensity(prev),
      densityB: motifDensity(motif),
      mix,
      refLum: 0.8,
      dev,
      collar,
      ornament,
      collarY: 0,
      fold: 0.35,
      sleeve,
      hands: MANNEQUIN_HANDS,
      bg,
      split: split ? 0.5 : 0,
    });
  }, [mannequin, motif, prev, mix, collar, sleeve, ornament, bg, split, dev]);

  const pick = (i: number) => {
    if (i === motifIdx) return;
    setPrevIdx(motifIdx);
    setMotifIdx(i);
    // putar transisi pewarna
    const start = performance.now();
    const tick = () => {
      const t = Math.min(1, (performance.now() - start) / 1100);
      setMix(t);
      if (t < 1) requestAnimationFrame(tick);
    };
    setMix(0);
    requestAnimationFrame(tick);
  };

  return (
    <div className="live-demo">
      <div className="demo-stage">
        {error ? <p className="muted">WebGL2 tidak tersedia: {error}</p> : <canvas ref={canvasRef} className="demo-canvas" />}
        <span className="demo-badge">Shader yang sama dengan layar try-on</span>
      </div>
      <div className="demo-controls">
        <span className="style-label">Pilih motif (lihat transisi pewarna)</span>
        <div className="demo-motifs">
          {MOTIFS.map((m, i) => (
            <button key={m.id} className={i === motifIdx ? 'is-on' : ''} onClick={() => pick(i)} title={m.name}>
              <img src={getMotifThumb(m, 64)} alt={m.name} />
            </button>
          ))}
        </div>
        <span className="style-label">Lapisan</span>
        <div className="chip-row">
          {(
            [
              ['Kerah & kancing', collar, setCollar],
              ['Lengan panjang', sleeve, setSleeve],
              ['Ornamen dada', ornament, setOrnament],
              ['Latar kota', bg, setBg],
              ['Sebelum/sesudah', split, setSplit],
              ['Tampilkan mask', dev, setDev],
            ] as const
          ).map(([label, on, set]) => (
            <button key={label} className={`chip${on ? ' is-on' : ''}`} onClick={() => set(!on)}>
              {label}
            </button>
          ))}
        </div>
        <span className="style-label">Transisi manual</span>
        <input type="range" min={0} max={1} step={0.01} value={mix} onChange={(e) => setMix(Number(e.target.value))} />
        <p className="muted small">
          Motif: <b>{motif.name}</b> · {cityById(motif.cityId)?.name}
        </p>
      </div>
    </div>
  );
}
