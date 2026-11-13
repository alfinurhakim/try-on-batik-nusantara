import { useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Miniatur landmark ikonik per kota (low-poly prosedural, tanpa file model).
 * Muncul dengan animasi "tumbuh memantul" saat kota dipilih.
 */

import { CITY_LANDMARK, type LandmarkKind as Kind } from '../data/landmarks';

export { CITY_LANDMARK };

const M = {
  white: '#f4efe6',
  stone: '#d8ccb6',
  gold: '#d9a441',
  brick: '#a5482c',
  wood: '#7a4a26',
  roof: '#6b3a22',
  green: '#4f7a5a',
  red: '#b5352d',
};

function Mat({ c, e = 0 }: { c: string; e?: number }) {
  return <meshStandardMaterial color={c} roughness={0.7} emissive={e ? c : '#000000'} emissiveIntensity={e} flatShading />;
}

function Box({ p, s, c, r = [0, 0, 0] }: { p: [number, number, number]; s: [number, number, number]; c: string; r?: [number, number, number] }) {
  return (
    <mesh position={p} rotation={r} castShadow receiveShadow>
      <boxGeometry args={s} />
      <Mat c={c} />
    </mesh>
  );
}

function Cyl({ p, rt, rb, h, c, seg = 12, e = 0, r = [0, 0, 0] }: { p: [number, number, number]; rt: number; rb: number; h: number; c: string; seg?: number; e?: number; r?: [number, number, number] }) {
  return (
    <mesh position={p} rotation={r} castShadow receiveShadow>
      <cylinderGeometry args={[rt, rb, h, seg]} />
      <Mat c={c} e={e} />
    </mesh>
  );
}

function Sph({ p, r, c, e = 0, s = [1, 1, 1] }: { p: [number, number, number]; r: number; c: string; e?: number; s?: [number, number, number] }) {
  return (
    <mesh position={p} scale={s} castShadow>
      <sphereGeometry args={[r, 16, 12]} />
      <Mat c={c} e={e} />
    </mesh>
  );
}

function Model({ kind }: { kind: Kind }) {
  switch (kind) {
    case 'monas':
      return (
        <>
          <Box p={[0, 0.01, 0]} s={[0.13, 0.02, 0.13]} c={M.stone} />
          <Cyl p={[0, 0.035, 0]} rt={0.055} rb={0.035} h={0.03} c={M.white} seg={4} r={[0, Math.PI / 4, 0]} />
          <Cyl p={[0, 0.15, 0]} rt={0.011} rb={0.019} h={0.2} c={M.white} seg={4} r={[0, Math.PI / 4, 0]} />
          <Cyl p={[0, 0.255, 0]} rt={0.016} rb={0.012} h={0.012} c={M.gold} seg={8} />
          <mesh position={[0, 0.278, 0]}>
            <coneGeometry args={[0.011, 0.035, 8]} />
            <Mat c={M.gold} e={0.8} />
          </mesh>
        </>
      );
    case 'tugu':
      return (
        <>
          <Box p={[0, 0.015, 0]} s={[0.05, 0.03, 0.05]} c={M.white} />
          <Cyl p={[0, 0.09, 0]} rt={0.01} rb={0.014} h={0.12} c={M.white} seg={8} />
          <Cyl p={[0, 0.16, 0]} rt={0.016} rb={0.011} h={0.02} c={M.gold} seg={8} />
          <mesh position={[0, 0.19, 0]}>
            <coneGeometry args={[0.012, 0.045, 8]} />
            <Mat c={M.gold} e={0.3} />
          </mesh>
        </>
      );
    case 'joglo':
      return (
        <>
          <Box p={[0, 0.008, 0]} s={[0.15, 0.016, 0.13]} c={M.stone} />
          {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z]) => (
            <Cyl key={`${x}${z}`} p={[x * 0.045, 0.04, z * 0.035]} rt={0.004} rb={0.004} h={0.05} c={M.wood} seg={6} />
          ))}
          <Cyl p={[0, 0.08, 0]} rt={0.04} rb={0.115} h={0.035} c={M.roof} seg={4} r={[0, Math.PI / 4, 0]} />
          <Cyl p={[0, 0.125, 0]} rt={0.008} rb={0.045} h={0.06} c={M.roof} seg={4} r={[0, Math.PI / 4, 0]} />
          <Sph p={[0, 0.16, 0]} r={0.008} c={M.gold} e={0.5} />
        </>
      );
    case 'menara':
      return (
        <>
          <Cyl p={[0, 0.09, 0]} rt={0.02} rb={0.03} h={0.18} c={M.white} seg={8} />
          {[0.06, 0.12].map((y) => (
            <Cyl key={y} p={[0, y, 0]} rt={0.032} rb={0.032} h={0.008} c={M.brick} seg={8} />
          ))}
          <Cyl p={[0, 0.19, 0]} rt={0.022} rb={0.022} h={0.02} c={M.white} seg={8} />
          <Sph p={[0, 0.205, 0]} r={0.02} c={M.green} s={[1, 0.8, 1]} />
        </>
      );
    case 'candiBentar':
      return (
        <>
          {[-1, 1].map((side) => (
            <group key={side} position={[side * 0.045, 0, 0]}>
              {[0, 1, 2, 3, 4].map((k) => (
                <Box key={k} p={[side * 0.004 * k, 0.015 + k * 0.03, 0]} s={[0.06 - k * 0.01, 0.03, 0.05 - k * 0.006]} c={k % 2 ? '#8f3b22' : M.brick} />
              ))}
            </group>
          ))}
        </>
      );
    case 'volcano':
    case 'ijen':
      return (
        <>
          <mesh position={[0, 0.07, 0]} castShadow receiveShadow>
            <coneGeometry args={[0.17, 0.14, 14, 1, true]} />
            <Mat c={kind === 'ijen' ? '#8a7a66' : '#6f8a5a'} />
          </mesh>
          <Cyl p={[0, 0.13, 0]} rt={0.035} rb={0.03} h={0.012} c={kind === 'ijen' ? '#5fb3c9' : '#5a4636'} seg={14} e={kind === 'ijen' ? 0.6 : 0} />
          {kind === 'ijen' && (
            <mesh position={[0, 0.155, 0]}>
              <coneGeometry args={[0.018, 0.05, 8]} />
              <meshStandardMaterial color="#4fa3ff" emissive="#2f7bff" emissiveIntensity={2.2} transparent opacity={0.85} />
            </mesh>
          )}
        </>
      );
    case 'payung':
      return (
        <>
          <Cyl p={[0, 0.07, 0]} rt={0.004} rb={0.004} h={0.14} c={M.wood} seg={6} />
          <mesh position={[0, 0.15, 0]} castShadow>
            <coneGeometry args={[0.1, 0.045, 16]} />
            <Mat c="#d2557a" />
          </mesh>
          <Cyl p={[0, 0.128, 0]} rt={0.1} rb={0.1} h={0.004} c={M.gold} seg={16} />
          <Sph p={[0, 0.178, 0]} r={0.008} c={M.gold} />
        </>
      );
    case 'klenteng':
      return (
        <>
          <Box p={[0, 0.03, 0]} s={[0.12, 0.06, 0.07]} c={M.red} />
          <Box p={[0, 0.07, 0]} s={[0.15, 0.015, 0.09]} c="#2f5a45" />
          <Box p={[-0.075, 0.08, 0]} s={[0.03, 0.01, 0.09]} c="#2f5a45" r={[0, 0, 0.5]} />
          <Box p={[0.075, 0.08, 0]} s={[0.03, 0.01, 0.09]} c="#2f5a45" r={[0, 0, -0.5]} />
          <Sph p={[-0.04, 0.05, 0.045]} r={0.01} c="#ff4a3a" e={0.8} />
          <Sph p={[0.04, 0.05, 0.045]} r={0.01} c="#ff4a3a" e={0.8} />
        </>
      );
    case 'suramadu':
      return (
        <group rotation={[0, 0.6, 0]}>
          <Box p={[0, 0.045, 0]} s={[0.5, 0.008, 0.03]} c={M.stone} />
          {[-0.1, 0.1].map((x) => (
            <group key={x}>
              <Box p={[x, 0.08, 0]} s={[0.012, 0.16, 0.035]} c={M.white} />
              {[-0.09, -0.05, 0.05, 0.09].map((dx) => {
                const len = Math.hypot(dx, 0.11);
                return <Cyl key={dx} p={[x + dx / 2, 0.105, 0]} rt={0.0012} rb={0.0012} h={len} c="#e8e2d6" seg={4} r={[0, 0, Math.atan2(dx, 0.11)]} />;
              })}
            </group>
          ))}
        </group>
      );
    case 'masjid':
      return (
        <>
          <Box p={[0, 0.03, 0]} s={[0.1, 0.06, 0.1]} c={M.white} />
          <Sph p={[0, 0.07, 0]} r={0.04} c={M.green} s={[1, 0.85, 1]} />
          <Sph p={[0, 0.11, 0]} r={0.006} c={M.gold} e={0.5} />
          <Cyl p={[0.075, 0.075, 0.04]} rt={0.008} rb={0.01} h={0.15} c={M.white} seg={8} />
          <Sph p={[0.075, 0.155, 0.04]} r={0.01} c={M.green} />
        </>
      );
    case 'canting':
      return (
        <group rotation={[0, 0, -0.5]} position={[0, 0.06, 0]}>
          <Cyl p={[-0.06, 0, 0]} rt={0.008} rb={0.008} h={0.16} c="#c9a36a" seg={8} r={[0, 0, Math.PI / 2]} />
          <Sph p={[0.035, 0, 0]} r={0.028} c="#b87333" s={[1, 0.8, 1]} />
          <Cyl p={[0.06, -0.025, 0]} rt={0.003} rb={0.004} h={0.04} c="#b87333" seg={6} r={[0, 0, 0.6]} />
          <Sph p={[0.072, -0.045, 0]} r={0.005} c="#2d1f14" />
        </group>
      );
    case 'rumahSunda':
      return (
        <>
          <Box p={[0, 0.03, 0]} s={[0.1, 0.05, 0.07]} c="#d9c09a" />
          <Cyl p={[0, 0.08, 0]} rt={0.045} rb={0.045} h={0.12} c="#3b2a1e" seg={3} r={[0, 0, Math.PI / 2]} />
          {[-1, 1].map((s) => (
            <Box key={s} p={[s * 0.065, 0.105, 0]} s={[0.02, 0.006, 0.02]} c="#3b2a1e" r={[0, 0, s * 0.8]} />
          ))}
        </>
      );
    case 'megamendung':
      return (
        <group position={[0, 0.06, 0]}>
          {['#1f3c6e', '#3f66a0', '#7aa6d1', '#d6e4f2'].map((c, i) => (
            <group key={c} scale={1 - i * 0.2}>
              <Sph p={[0, 0, 0]} r={0.05} c={c} s={[1, 0.6, 0.5]} />
              <Sph p={[0.05, -0.01, 0]} r={0.035} c={c} s={[1, 0.6, 0.5]} />
              <Sph p={[-0.05, -0.008, 0]} r={0.035} c={c} s={[1, 0.6, 0.5]} />
            </group>
          ))}
        </group>
      );
  }
}

export default function Landmark({ cityId, children }: { cityId: string; children?: ReactNode }) {
  const def = CITY_LANDMARK[cityId];
  const ref = useRef<THREE.Group>(null);
  const t0 = useRef<number | null>(null);
  useFrame((s) => {
    const g = ref.current;
    if (!g) return;
    if (t0.current === null) t0.current = s.clock.elapsedTime;
    const t = Math.max(0, s.clock.elapsedTime - t0.current - 0.5);
    // pegas: tumbuh dengan sedikit memantul
    const k = t <= 0 ? 0 : 1 - Math.exp(-t * 5) * Math.cos(t * 11);
    g.scale.setScalar(Math.max(0.0001, k));
    g.rotation.y = (1 - Math.min(1, t)) * 1.5;
  });
  if (!def) return null;
  return (
    <group ref={ref} position={[-0.09, 0, 0.03]}>
      <Model kind={def.kind} />
      {children}
    </group>
  );
}
