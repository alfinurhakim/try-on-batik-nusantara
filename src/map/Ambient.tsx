import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { project } from '../geo/geo';

/** Suasana peta: debu emas melayang, awan berbayang, dan perahu pinisi berlayar. */
export default function Ambient() {
  return (
    <group>
      <GoldDust />
      <Clouds />
      <Pinisi lon={110.2} lat={-5.1} rx={3.2} rz={0.55} speed={0.05} phase={0} />
      <Pinisi lon={118.2} lat={-1.6} rx={0.6} rz={2.2} speed={0.06} phase={2} />
      <Pinisi lon={110.5} lat={-9.6} rx={5} rz={0.5} speed={0.035} phase={4} />
      <Pinisi lon={127.5} lat={-6} rx={2.5} rz={1.2} speed={0.045} phase={1} />
      <Pinisi lon={106.2} lat={-5.7} rx={0.8} rz={0.25} speed={0.09} phase={3} />
      <Pinisi lon={113.6} lat={-6.6} rx={0.7} rz={0.2} speed={0.08} phase={5} />
    </group>
  );
}

// ---------------- debu emas ----------------

const dustVert = /* glsl */ `
attribute float aSeed;
uniform float uTime;
uniform float uPixelRatio;
varying float vAlpha;
void main() {
  vec3 p = position;
  p.y = mod(p.y + uTime * 0.12 * (0.4 + aSeed), 6.0) + 0.25;
  p.x += sin(uTime * 0.25 + aSeed * 12.0) * 0.4;
  p.z += cos(uTime * 0.2 + aSeed * 7.0) * 0.3;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = min(22.0, (34.0 * (0.4 + aSeed)) * uPixelRatio / -mv.z);
  vAlpha = (0.45 + 0.55 * sin(uTime * 1.7 + aSeed * 40.0)) * smoothstep(0.25, 1.0, p.y) * (1.0 - smoothstep(4.5, 6.2, p.y));
}`;

const dustFrag = /* glsl */ `
varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d) * vAlpha;
  gl_FragColor = vec4(vec3(1.0, 0.8, 0.42) * (1.0 + smoothstep(0.2, 0.0, d)), a * 0.85);
}`;

function GoldDust({ count = 900 }: { count?: number }) {
  const { gl } = useThree();
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      // lebih rapat di sekitar Jawa
      const nearJava = i < count * 0.55;
      pos[i * 3] = nearJava ? -8 + (Math.random() - 0.5) * 16 : (Math.random() - 0.5) * 60;
      pos[i * 3 + 1] = Math.random() * 6;
      pos[i * 3 + 2] = nearJava ? 5 + (Math.random() - 0.5) * 5 : (Math.random() - 0.5) * 30;
      seed[i] = Math.random();
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    return g;
  }, [count]);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uPixelRatio: { value: Math.min(2, gl.getPixelRatio()) } },
        vertexShader: dustVert,
        fragmentShader: dustFrag,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [gl],
  );
  useFrame((s) => {
    mat.uniforms.uTime.value = s.clock.elapsedTime;
  });
  return <points geometry={geom} material={mat} frustumCulled={false} />;
}

// ---------------- awan ----------------

interface CloudDef {
  x: number;
  y: number;
  z: number;
  s: number;
  speed: number;
  puffs: [number, number, number, number][];
}

function Clouds() {
  const defs = useMemo<CloudDef[]>(() => {
    let seed = 7;
    const r = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    return Array.from({ length: 14 }, (_, i) => ({
      x: -32 + (i / 14) * 64 + r() * 4,
      y: 2.4 + r() * 1.6,
      z: -10 + r() * 22,
      s: 0.8 + r() * 1.1,
      speed: 0.12 + r() * 0.12,
      puffs: Array.from({ length: 5 + Math.floor(r() * 4) }, (_, k) => [(k - 3) * 0.55 + (r() - 0.5) * 0.4, (r() - 0.3) * 0.25, (r() - 0.5) * 0.7, 0.45 + r() * 0.45] as [number, number, number, number]),
    }));
  }, []);
  return (
    <group>
      {defs.map((d, i) => (
        <Cloud key={i} d={d} />
      ))}
    </group>
  );
}

const puffGeom = new THREE.IcosahedronGeometry(1, 1);

function Cloud({ d }: { d: CloudDef }) {
  const ref = useRef<THREE.Group>(null);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#fff7ec', roughness: 1, flatShading: true, transparent: true, opacity: 0.92, emissive: '#ffd9a8', emissiveIntensity: 0.12 }), []);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  useFrame((s, dt) => {
    const g = ref.current;
    if (!g) return;
    g.position.x += d.speed * dt;
    if (g.position.x > 34) g.position.x = -34;
    // memudar saat kamera mendekat → terasa terbang menembus awan
    g.getWorldPosition(tmp);
    const dist = tmp.distanceTo(s.camera.position);
    const o = THREE.MathUtils.smoothstep(dist, 1.2, 4.5);
    mat.opacity = 0.92 * o;
    g.visible = o > 0.02;
  });
  return (
    <group ref={ref} position={[d.x, d.y, d.z]} scale={[d.s, d.s * 0.55, d.s]}>
      {d.puffs.map(([x, y, z, r], i) => (
        <mesh key={i} geometry={puffGeom} material={mat} position={[x, y, z]} scale={r} castShadow />
      ))}
    </group>
  );
}

// ---------------- perahu pinisi ----------------

function Pinisi({ lon, lat, rx, rz, speed, phase }: { lon: number; lat: number; rx: number; rz: number; speed: number; phase: number }) {
  const [cx, cz] = project(lon, lat);
  const ref = useRef<THREE.Group>(null);
  const sail = useRef<THREE.Group>(null);
  useFrame((s) => {
    const g = ref.current;
    if (!g) return;
    const t = s.clock.elapsedTime * speed + phase;
    const x = cx + Math.cos(t) * rx;
    const z = cz + Math.sin(t) * rz;
    const dx = -Math.sin(t) * rx;
    const dz = Math.cos(t) * rz;
    g.position.set(x, 0.02 + Math.sin(s.clock.elapsedTime * 2 + phase) * 0.012, z);
    g.rotation.y = Math.atan2(-dz, dx);
    g.rotation.z = Math.sin(s.clock.elapsedTime * 1.6 + phase) * 0.05;
    if (sail.current) sail.current.scale.z = 1 + Math.sin(s.clock.elapsedTime * 3 + phase) * 0.08;
  });
  return (
    <group ref={ref} scale={0.9}>
      {/* lambung */}
      <mesh position={[0, 0.025, 0]} castShadow>
        <boxGeometry args={[0.3, 0.05, 0.08]} />
        <meshStandardMaterial color="#7a4a26" roughness={0.8} />
      </mesh>
      <mesh position={[0.17, 0.045, 0]} rotation={[0, 0, 0.5]} castShadow>
        <boxGeometry args={[0.1, 0.03, 0.06]} />
        <meshStandardMaterial color="#7a4a26" roughness={0.8} />
      </mesh>
      <mesh position={[-0.15, 0.06, 0]} castShadow>
        <boxGeometry args={[0.07, 0.05, 0.075]} />
        <meshStandardMaterial color="#5c3519" roughness={0.8} />
      </mesh>
      {/* tiang */}
      {[0.06, -0.06].map((x) => (
        <mesh key={x} position={[x, 0.16, 0]}>
          <cylinderGeometry args={[0.004, 0.005, 0.24, 5]} />
          <meshStandardMaterial color="#3b2a1e" />
        </mesh>
      ))}
      {/* layar */}
      <group ref={sail}>
        {[0.06, -0.06].map((x, i) => (
          <mesh key={x} position={[x + 0.04, 0.17, 0.004]} castShadow>
            <planeGeometry args={[0.08, 0.17]} />
            <meshStandardMaterial color={i ? '#f3e7d3' : '#e9d3b0'} side={THREE.DoubleSide} roughness={0.9} />
          </mesh>
        ))}
        <mesh position={[0.2, 0.12, 0.004]} rotation={[0, 0, -0.35]}>
          <planeGeometry args={[0.06, 0.12]} />
          <meshStandardMaterial color="#c77b4a" side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  );
}
