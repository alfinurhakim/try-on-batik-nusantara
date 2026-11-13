import { useEffect } from 'react';
import type { Province } from '../types';
import { MOTIFS, PROVINCES, motifById, motifsOfProvince } from '../data/regions';
import { getMotifThumb } from '../motifs/textures';
import type { Passport } from './passport';

const TOTAL_PROVINCES = 38;

export function StampSeal({ province, earned, size = 120, rotate = 0, motifId }: { province: Province; earned: boolean; size?: number; rotate?: number; motifId?: string }) {
  const motif = motifById(motifId) ?? motifsOfProvince(province.id)[0];
  const id = `arc-${province.id}-${size}`;
  const color = earned ? province.color : '#b9ab96';
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" className={`seal${earned ? ' is-earned' : ''}`} style={{ transform: `rotate(${rotate}deg)` }}>
      <defs>
        <path id={id} d="M 60,60 m -44,0 a 44,44 0 1,1 88,0 a 44,44 0 1,1 -88,0" />
        <clipPath id={`${id}-clip`}>
          <circle cx="60" cy="60" r="27" />
        </clipPath>
      </defs>
      <circle cx="60" cy="60" r="56" fill="none" stroke={color} strokeWidth="3" strokeDasharray={earned ? undefined : '5 5'} />
      <circle cx="60" cy="60" r="50" fill="none" stroke={color} strokeWidth="1.2" />
      <text fill={color} fontSize="10.5" fontWeight="700" letterSpacing="2.2" fontFamily="Plus Jakarta Sans, sans-serif">
        <textPath href={`#${id}`} startOffset="2%">
          {`${province.name.toUpperCase()} · BATIK NUSANTARA ·`}
        </textPath>
      </text>
      {earned && motif ? (
        <>
          <image href={getMotifThumb(motif, 96)} x="33" y="33" width="54" height="54" clipPath={`url(#${id}-clip)`} />
          <circle cx="60" cy="60" r="27" fill="none" stroke={color} strokeWidth="2" />
        </>
      ) : (
        <text x="60" y="65" textAnchor="middle" fill={color} fontSize="13" fontWeight="700" fontFamily="Plus Jakarta Sans, sans-serif">
          ?
        </text>
      )}
    </svg>
  );
}

export default function PassportModal({ passport, onClose, onReset }: { passport: Passport; onClose: () => void; onReset: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const earned = PROVINCES.filter((p) => passport[p.id]);
  const motifCount = Object.values(passport).reduce((n, s) => n + (s?.motifs.length ?? 0), 0);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal passport" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Paspor Batik">
        <div className="passport-cover">
          <span className="eyebrow">Republik Batik</span>
          <h2>Paspor Batik Nusantara</h2>
          <p>Kumpulkan stempel dengan mencoba batik dari setiap provinsi.</p>
          <div className="passport-stats">
            <div>
              <strong>{earned.length}</strong>
              <span>/ {PROVINCES.length} provinsi Jawa</span>
            </div>
            <div>
              <strong>{motifCount}</strong>
              <span>/ {MOTIFS.length} motif dicoba</span>
            </div>
            <div>
              <strong>{TOTAL_PROVINCES - PROVINCES.length}</strong>
              <span>provinsi segera hadir</span>
            </div>
          </div>
          <div className="passport-actions">
            <button className="btn btn-primary" onClick={onClose}>
              Tutup
            </button>
            <button className="btn btn-ghost btn-sm" onClick={onReset}>
              Kosongkan paspor
            </button>
          </div>
        </div>
        <div className="passport-page">
          {PROVINCES.map((p, i) => {
            const st = passport[p.id];
            return (
              <div key={p.id} className="passport-slot">
                <StampSeal province={p} earned={!!st} rotate={st ? ((i * 37) % 24) - 12 : 0} motifId={st?.motifs[0]} />
                <span className="slot-name">{p.name}</span>
                <span className="slot-date">{st ? `${new Date(st.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} · ${st.motifs.length} motif` : 'Belum dicap'}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
