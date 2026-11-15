import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ProvinceId } from './types';
import { MOTIFS, cityById, motifById, provinceById } from './data/regions';
import { loadGeo, type GeoProvince } from './geo/geo';
import MapScene, { type HoverInfo, type MapMode } from './map/MapScene';
import MapOverlay from './map/MapOverlay';
import TryOnView from './tryon/TryOnView';
import AboutPage from './about/AboutPage';
import { gamelan, MUSIC_LABELS } from './audio/gamelan';
import { getMotifThumb } from './motifs/textures';
import { preloadVision } from './tryon/vision';
import { CloudCurtain, CloudRush, ClothFilterDefs, GununganTransition, StampToast, type CloudCurtainState } from './fx/Effects';
import PassportModal from './passport/PassportModal';
import { loadPassport, recordTry, resetPassport, type Passport } from './passport/passport';

type Stage = 'intro' | 'map' | 'tryon' | 'about';
type Curtain = 'idle' | 'closing' | 'opening';

const Scene = memo(MapScene);
const PROVINCES_COUNT = (p: Passport) => Object.keys(p).length;

export default function App() {
  const [stage, setStage] = useState<Stage>('intro');
  const [provinceId, setProvinceId] = useState<ProvinceId | null>(null);
  const [cityId, setCityId] = useState<string | null>(null);
  const [motifId, setMotifId] = useState<string | null>(null);
  const [geo, setGeo] = useState<GeoProvince[] | null>(null);
  const [geoFailed, setGeoFailed] = useState(false);
  const [hover, setHover] = useState<HoverInfo | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [curtain, setCurtain] = useState<Curtain>('idle');
  const [clouds, setClouds] = useState<CloudCurtainState>('cover');
  const [rush, setRush] = useState(0);
  const [passport, setPassport] = useState<Passport>(() => loadPassport());
  const passportRef = useRef(passport);
  const [showPassport, setShowPassport] = useState(false);
  const [stampToast, setStampToast] = useState<{ provinceId: ProvinceId; motifId: string } | null>(null);

  // awan Mega Mendung tersibak sedikit saat halaman dibuka
  useEffect(() => {
    const id = window.setTimeout(() => setClouds('peek'), 250);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    loadGeo().then((g) => (g ? setGeo(g) : setGeoFailed(true)));
  }, []);

  const province = provinceById(provinceId);
  const musicId = province ? province.music : 'ambient';
  useEffect(() => {
    if (gamelan.started) gamelan.setStyle(musicId);
  }, [musicId]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(id);
  }, [toast]);

  const [aboutFrom, setAboutFrom] = useState<Stage>('intro');
  const openAbout = () => {
    setAboutFrom(stage);
    setStage('about');
  };
  const leaveAbout = async (toMap: boolean) => {
    if (toMap || aboutFrom === 'map') {
      if (!gamelan.started) {
        try {
          await gamelan.start('ambient');
        } catch {
          /* audio tidak wajib */
        }
      }
      setClouds('gone');
      preloadVision();
      setStage('map');
    } else setStage(aboutFrom === 'about' ? 'intro' : aboutFrom);
  };

  const mode: MapMode = stage === 'intro' || stage === 'about' ? 'intro' : cityId ? 'city' : provinceId ? 'province' : 'indonesia';

  const start = async () => {
    try {
      await gamelan.start('ambient');
      gamelan.sfx('gong');
      gamelan.sfx('wind');
    } catch {
      /* audio tidak wajib */
    }
    setClouds('open');
    window.setTimeout(() => setClouds('gone'), 2400);
    preloadVision();
    setStage('map');
  };

  const provRef = useRef(provinceId);
  provRef.current = provinceId;
  const cityRef = useRef(cityId);
  cityRef.current = cityId;
  const selectProvince = useCallback((id: ProvinceId) => {
    if (provRef.current !== id) {
      // terbang menembus awan, gong berbunyi saat "mendarat"
      setRush((n) => n + 1);
      gamelan.sfx('wind');
      window.setTimeout(() => gamelan.sfx('gong'), 1300);
    }
    setProvinceId(id);
    setCityId(null);
    setHover(null);
  }, []);
  const selectCity = useCallback((id: string) => {
    if (cityRef.current !== id) {
      gamelan.sfx('whoosh');
      window.setTimeout(() => gamelan.sfx('kenong'), 600);
    }
    setCityId(id);
  }, []);
  const inactiveClick = useCallback((name: string) => setToast(`${name}: segera hadir`), []);

  const back = useCallback(() => {
    if (cityId) setCityId(null);
    else if (provinceId) setProvinceId(null);
  }, [cityId, provinceId]);

  useEffect(() => {
    if (stage !== 'map') return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && back();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [stage, back]);

  /** Tirai batik menutup → ganti layar → tirai membuka. */
  const withCurtain = (fn: () => void) => {
    setCurtain('closing');
    gamelan.sfx('wind');
    window.setTimeout(() => gamelan.sfx('gong'), 600);
    window.setTimeout(() => {
      fn();
      setCurtain('opening');
      window.setTimeout(() => setCurtain('idle'), 1100);
    }, 1000);
  };

  const tryOn = (id: string) => {
    setMotifId(id);
    withCurtain(() => setStage('tryon'));
  };
  const backToMap = useCallback(() => withCurtain(() => setStage('map')), []);
  const onMotifChange = useCallback((id: string) => {
    setMotifId(id);
    const m = motifById(id);
    if (m) setCityId(m.cityId);
  }, []);

  const toggleMute = () => {
    const m = !muted;
    setMuted(m);
    gamelan.setMuted(m);
  };

  const curtainMotif = useMemo(() => motifById(motifId) ?? MOTIFS[0], [motifId]);

  const onTried = useCallback(
    (id: string) => {
      if (!provinceId) return;
      const r = recordTry(passportRef.current, provinceId, id);
      if (r.passport !== passportRef.current) {
        passportRef.current = r.passport;
        setPassport(r.passport);
      }
      if (r.isNewStamp) {
        setStampToast({ provinceId, motifId: id });
        window.setTimeout(() => gamelan.sfx('stamp'), 350);
      }
    },
    [provinceId],
  );
  const stampCount = PROVINCES_COUNT(passport);
  const city = cityById(cityId);

  return (
    <div className={`app stage-${stage}`}>
      <div className={`map-layer${stage === 'tryon' || stage === 'about' ? ' is-hidden' : ''}`}>
        <Scene
          geo={geo}
          geoFailed={geoFailed}
          mode={mode}
          provinceId={provinceId}
          cityId={cityId}
          paused={stage === 'tryon' || stage === 'about'}
          onHover={setHover}
          onSelectProvince={selectProvince}
          onSelectCity={selectCity}
          onInactiveClick={inactiveClick}
        />
      </div>

      {stage !== 'tryon' && stage !== 'about' && (
        <header className="topbar">
          <div className="brand">
            <span className="brand-mark" style={{ backgroundImage: `url(${getMotifThumb(MOTIFS[15], 64)})` }} />
            <span>
              Try On <b>Batik Nusantara</b>
            </span>
          </div>
          {stage === 'map' && (
            <nav className="crumbs">
              <button onClick={() => { setProvinceId(null); setCityId(null); }} disabled={!provinceId}>
                Indonesia
              </button>
              {province && (
                <>
                  <span>›</span>
                  <button onClick={() => setCityId(null)} disabled={!cityId}>
                    {province.name}
                  </button>
                </>
              )}
              {city && (
                <>
                  <span>›</span>
                  <button disabled>{city.name}</button>
                </>
              )}
            </nav>
          )}
          <div className="topbar-right">
            {stage === 'map' && <span className="now-playing">♪ {MUSIC_LABELS[musicId]}</span>}
            <button className="btn btn-glass" onClick={openAbout}>
              ⚙ Di balik layar
            </button>
            {stage === 'map' && (
              <button className="btn btn-glass passport-btn" onClick={() => setShowPassport(true)}>
                📘 Paspor <b>{stampCount}/6</b>
              </button>
            )}
            <button className="btn btn-glass" onClick={toggleMute} aria-label={muted ? 'Nyalakan musik' : 'Matikan musik'}>
              {muted ? '🔇 Musik mati' : '🔊 Musik'}
            </button>
          </div>
        </header>
      )}

      {stage === 'tryon' && (
        <button className="btn btn-glass mute-float" onClick={toggleMute} aria-label={muted ? 'Nyalakan musik' : 'Matikan musik'}>
          {muted ? '🔇' : '🔊'}
        </button>
      )}

      {stage === 'intro' && <Intro onStart={start} onAbout={openAbout} />}
      {stage === 'about' && <AboutPage onBack={() => leaveAbout(false)} onTry={() => leaveAbout(true)} />}

      {stage === 'map' && (
        <MapOverlay
          mode={mode}
          provinceId={provinceId}
          cityId={cityId}
          hover={hover}
          geoFailed={geoFailed}
          onSelectProvince={selectProvince}
          onSelectCity={selectCity}
          onBack={back}
          onTryOn={tryOn}
        />
      )}

      {stage === 'tryon' && provinceId && motifId && (
        <TryOnView provinceId={provinceId} motifId={motifId} onMotifChange={onMotifChange} onBack={backToMap} onTried={onTried} />
      )}

      {toast && <div className="toast">{toast}</div>}

      <CloudRush trigger={rush} />
      <CloudCurtain state={clouds} />
      <GununganTransition state={curtain} motif={curtainMotif} />
      <ClothFilterDefs />
      {stampToast && provinceById(stampToast.provinceId) && (
        <StampToast province={provinceById(stampToast.provinceId)!} motifId={stampToast.motifId} onDone={() => setStampToast(null)} />
      )}
      {showPassport && (
        <PassportModal
          passport={passport}
          onClose={() => setShowPassport(false)}
          onReset={() => {
            const p = resetPassport();
            passportRef.current = p;
            setPassport(p);
          }}
        />
      )}
    </div>
  );
}

function Intro({ onStart, onAbout }: { onStart: () => void; onAbout: () => void }) {
  const strip = useMemo(() => [MOTIFS[4], MOTIFS[15], MOTIFS[11], MOTIFS[19], MOTIFS[13], MOTIFS[21]].map((m) => getMotifThumb(m, 120)), []);
  return (
    <div className="intro">
      <div className="intro-box">
        <div className="intro-strip">
          {strip.map((src, i) => (
            <img key={i} src={src} alt="" />
          ))}
        </div>
        <h1>
          Coba batik <em>Nusantara</em>
          <br />
          langsung di badanmu.
        </h1>
        <p>Pilih provinsi di peta, terbang ke kotanya, lalu nyalakan kamera. Motif batik khas daerah akan menempel di bajumu secara real-time, diiringi gamelan setempat.</p>
        <div className="row">
          <button className="btn btn-primary btn-lg" onClick={onStart}>
            Mulai jelajah
          </button>
          <button className="btn btn-lg btn-ghost" onClick={onAbout}>
            Lihat cara kerjanya
          </button>
        </div>
        <p className="muted small">Paling nyaman di laptop dengan webcam. Musik akan diputar; semua video diproses di perangkatmu dan tidak dikirim ke mana pun.</p>
      </div>
    </div>
  );
}
