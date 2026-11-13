import { useEffect, useRef, useState, type CSSProperties, type MouseEvent as RMouseEvent } from 'react';
import type { Motif } from '../types';
import { CITY_LANDMARK } from './Landmarks';
import type { ProvinceId } from '../types';
import { PROVINCES, citiesOf, cityById, motifsOfCity, provinceById } from '../data/regions';
import { getMotifThumb } from '../motifs/textures';
import type { HoverInfo, MapMode } from './MapScene';

interface Props {
  mode: MapMode;
  provinceId: ProvinceId | null;
  cityId: string | null;
  hover: HoverInfo | null;
  geoFailed: boolean;
  onSelectProvince: (id: ProvinceId) => void;
  onSelectCity: (id: string) => void;
  onBack: () => void;
  onTryOn: (motifId: string) => void;
}

export default function MapOverlay(p: Props) {
  const province = provinceById(p.provinceId);
  const city = cityById(p.cityId);
  return (
    <div className="map-overlay">
      {p.mode === 'indonesia' && <IndonesiaPanel onSelect={p.onSelectProvince} geoFailed={p.geoFailed} />}
      {p.mode === 'province' && province && (
        <aside className="side-panel" key={province.id}>
          <button className="link-back" onClick={p.onBack}>
            ← Peta Indonesia
          </button>
          <span className="eyebrow">Provinsi</span>
          <h2>{province.name}</h2>
          <p>{province.blurb}</p>
          <div className="music-tag">♪ Iringan: {province.musicLabel}</div>
          <h3>Pilih kota</h3>
          <div className="city-list">
            {citiesOf(province.id).map((c) => {
              const ms = motifsOfCity(c.id);
              return (
                <button key={c.id} className="city-card" onClick={() => p.onSelectCity(c.id)}>
                  <div className="city-thumbs">
                    {ms.slice(0, 3).map((m) => (
                      <img key={m.id} src={getMotifThumb(m, 64)} alt="" />
                    ))}
                  </div>
                  <div>
                    <strong>{c.name}</strong>
                    <span>{c.blurb}</span>
                    <em>{ms.length} motif</em>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>
      )}
      {p.mode === 'city' && province && city && (
        <aside className="side-panel" key={city.id}>
          <button className="link-back" onClick={p.onBack}>
            ← {province.name}
          </button>
          <span className="eyebrow">Kota</span>
          <h2>{city.name}</h2>
          <p>{city.blurb}</p>
          {CITY_LANDMARK[city.id] && <div className="music-tag">★ Ikon kota: {CITY_LANDMARK[city.id].name}</div>}
          <h3>Pilih batik untuk dicoba</h3>
          <div className="motif-list">
            {motifsOfCity(city.id).map((m, i) => (
              <MotifCard key={m.id} motif={m} index={i} onTry={() => p.onTryOn(m.id)} />
            ))}
          </div>
          <p className="footnote">Motif di versi ini masih gambar placeholder buatan kode; foto motif asli dari dataset menyusul.</p>
        </aside>
      )}
      <Tooltip hover={p.hover} />
    </div>
  );
}

function IndonesiaPanel({ onSelect, geoFailed }: { onSelect: (id: ProvinceId) => void; geoFailed: boolean }) {
  return (
    <aside className="intro-card">
      <span className="eyebrow">Jelajah Nusantara</span>
      <h2>Pilih provinsi</h2>
      <p>Untuk saat ini, batik dari 6 provinsi di Pulau Jawa sudah bisa dicoba. Provinsi lain segera hadir.</p>
      <div className="prov-buttons">
        {PROVINCES.map((pr) => (
          <button key={pr.id} onClick={() => onSelect(pr.id)} style={{ '--c': pr.color } as CSSProperties}>
            <i />
            {pr.name}
          </button>
        ))}
      </div>
      <div className="legend">
        <span>
          <i className="dot on" /> Tersedia
        </span>
        <span>
          <i className="dot off" /> Segera hadir
        </span>
      </div>
      {geoFailed && <p className="footnote">Data batas provinsi belum terunduh, jadi peta memakai tampilan sederhana. Jalankan <code>npm run fetch-geo</code>.</p>}
    </aside>
  );
}

function Tooltip({ hover }: { hover: HoverInfo | null }) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const onMove = (e: MouseEvent) => setPos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);
  if (!hover) return null;
  return (
    <div className="tooltip" style={{ left: pos.x + 14, top: pos.y + 14 }}>
      <strong>{hover.name}</strong>
      <span className={hover.active ? 'ok' : 'soon'}>{hover.active ? 'Klik untuk masuk' : 'Segera hadir'}</span>
    </div>
  );
}

/** Kartu motif 3D: miring mengikuti kursor, kain "berkibar", dan kilau menyapu. */
function MotifCard({ motif, index, onTry }: { motif: Motif; index: number; onTry: () => void }) {
  const ref = useRef<HTMLElement>(null);
  const move = (e: RMouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.setProperty('--rx', `${(0.5 - y) * 10}deg`);
    el.style.setProperty('--ry', `${(x - 0.5) * 14}deg`);
    el.style.setProperty('--mx', `${x * 100}%`);
  };
  const leave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
  };
  return (
    <article ref={ref} className="motif-card tilt" style={{ animationDelay: `${index * 0.08}s` }} onMouseMove={move} onMouseLeave={leave}>
      <div className="cloth">
        <img src={getMotifThumb(motif, 160)} alt={`Motif ${motif.name}`} />
      </div>
      <div>
        <strong>{motif.name}</strong>
        <p>{motif.meaning}</p>
        <button className="btn btn-primary btn-sm" onClick={onTry}>
          Coba di badan →
        </button>
      </div>
      <span className="sheen" />
    </article>
  );
}
