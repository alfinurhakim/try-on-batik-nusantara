import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { City, Province, ProvinceId } from '../types';
import { CITIES, PROVINCES, citiesOf, motifsOfProvince, provinceById } from '../data/regions';
import { getMotifTile } from '../motifs/textures';
import { gamelan } from '../audio/gamelan';
import Ambient from './Ambient';
import Landmark from './Landmarks';
import { ORIGIN_LAT, ORIGIN_LON, project, type GeoProvince } from '../geo/geo';

export type MapMode = 'intro' | 'indonesia' | 'province' | 'city';

export interface HoverInfo {
  name: string;
  active: boolean;
}

interface MapSceneProps {
  geo: GeoProvince[] | null;
  geoFailed: boolean;
  mode: MapMode;
  paused?: boolean;
  provinceId: ProvinceId | null;
  cityId: string | null;
  onHover: (info: HoverInfo | null) => void;
  onSelectProvince: (id: ProvinceId) => void;
  onSelectCity: (id: string) => void;
  onInactiveClick: (name: string) => void;
}

const LAND_TOP_ACTIVE = 0.32;
const LAND_TOP_INACTIVE = 0.14;
const SAND = '#e9dfc8';
const SAND_DIM = '#efe7d6';
const BG = '#f5dfc2'; // langit senja (golden hour)

export default function MapScene(props: MapSceneProps) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      frameloop={props.paused ? 'never' : 'always'}
      camera={{ fov: 36, near: 0.05, far: 400, position: [0, 60, 50] }}
      gl={{ antialias: true }}
      onPointerMissed={() => props.onHover(null)}
    >
      <color attach="background" args={[BG]} />
      <fog attach="fog" args={[BG, 70, 160]} />
      <hemisphereLight args={['#ffe6c4', '#8fbfc4', 0.85]} />
      <directionalLight
        position={[-30, 20, 14]}
        intensity={2.1}
        color="#ffcf94"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-34}
        shadow-camera-right={34}
        shadow-camera-top={22}
        shadow-camera-bottom={-22}
        shadow-camera-near={1}
        shadow-camera-far={90}
        shadow-bias={-0.0004}
      />
      <ambientLight intensity={0.22} color="#ffe2bd" />
      <Ocean />
      <Ambient />
      {props.geo
        ? props.geo.map((p) => (
            <ProvinceMesh key={p.key} p={p} {...props} />
          ))
        : props.geoFailed && <FallbackJava {...props} />}
      {props.mode === 'indonesia' && <ProvinceChips onSelect={props.onSelectProvince} />}
      {props.provinceId && (props.mode === 'province' || props.mode === 'city') && (
        <CityPins provinceId={props.provinceId} cityId={props.cityId} onSelectCity={props.onSelectCity} />
      )}
      <CameraRig mode={props.mode} provinceId={props.provinceId} cityId={props.cityId} />
    </Canvas>
  );
}

// ---------------- laut ----------------

const oceanVert = /* glsl */ `
varying vec3 vWorld;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const oceanFrag = /* glsl */ `
uniform float uTime;
uniform vec3 uDeep;
uniform vec3 uShallow;
uniform vec3 uFog;
varying vec3 vWorld;
void main() {
  vec2 p = vWorld.xz;
  float d = length(p * vec2(0.8, 1.4));
  vec3 col = mix(uShallow, uDeep, smoothstep(4.0, 30.0, d));
  float r = sin(p.x * 1.7 + uTime * 0.6) * sin(p.y * 1.3 - uTime * 0.45)
          + 0.5 * sin(p.x * 4.1 - p.y * 3.3 + uTime * 1.1);
  col += r * 0.012;
  // kilau matahari senja di permukaan laut
  float band = exp(-pow((p.y * 0.9 + p.x * 0.45 + 4.0) * 0.18, 2.0));
  float glint = pow(max(0.0, sin(p.x * 3.1 + uTime * 1.3) * sin(p.y * 2.7 - uTime * 1.1) * sin(p.x * 1.3 - p.y * 1.7 + uTime * 0.7)), 10.0);
  col = mix(col, vec3(1.0, 0.86, 0.6), glint * band * 0.9 + band * 0.08);
  col = mix(col, uFog, smoothstep(34.0, 90.0, length(p)));
  gl_FragColor = vec4(col, 1.0);
}`;

function Ocean() {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uDeep: { value: new THREE.Color('#7fb0bb') },
          uShallow: { value: new THREE.Color('#bfdcd3') },
          uFog: { value: new THREE.Color(BG) },
        },
        vertexShader: oceanVert,
        fragmentShader: oceanFrag,
      }),
    [],
  );
  useFrame((s) => {
    mat.uniforms.uTime.value = s.clock.elapsedTime;
  });
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.02, 0]} material={mat}>
        <planeGeometry args={[400, 400]} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.001, 0]} receiveShadow>
        <planeGeometry args={[120, 80]} />
        <shadowMaterial transparent opacity={0.12} />
      </mesh>
    </group>
  );
}

// ---------------- provinsi ----------------

function buildGeometry(p: GeoProvince, depth: number) {
  const shapes: THREE.Shape[] = [];
  for (const poly of p.polygons) {
    const [outer, ...holes] = poly;
    const shape = new THREE.Shape(outer.map(([lon, lat]) => new THREE.Vector2(lon - ORIGIN_LON, lat - ORIGIN_LAT)));
    for (const h of holes) shape.holes.push(new THREE.Path(h.map(([lon, lat]) => new THREE.Vector2(lon - ORIGIN_LON, lat - ORIGIN_LAT))));
    shapes.push(shape);
  }
  const geom = new THREE.ExtrudeGeometry(shapes, { depth, bevelEnabled: false, curveSegments: 1 });
  // bentuk dibuat di bidang XY → putar supaya rebah di XZ dengan ketebalan ke atas
  geom.rotateX(-Math.PI / 2);
  geom.computeVertexNormals();
  return geom;
}

/**
 * Material permukaan provinsi dengan efek "pewarna menyebar": motif batik
 * merembes dari tengah provinsi ke tepi dengan tepi tidak rata seperti kain dicelup.
 */
function makeDyeMaterial(color: string, tex: THREE.Texture, center: [number, number]) {
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.62, map: tex });
  const uniforms = { uSpread: { value: 0 }, uCenter: { value: new THREE.Vector2(center[0], center[1]) } };
  mat.userData.uniforms = uniforms;
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vWXZ;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWXZ = (modelMatrix * vec4(transformed, 1.0)).xz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vWXZ;\nuniform float uSpread;\nuniform vec2 uCenter;')
      .replace(
        '#include <map_fragment>',
        `#ifdef USE_MAP
          vec4 dyeTex = texture2D(map, vMapUv);
          float dd = length(vWXZ - uCenter);
          float wob = sin(vWXZ.x * 9.0) * sin(vWXZ.y * 7.0) * 0.09 + sin(vWXZ.x * 23.0 + vWXZ.y * 17.0) * 0.04;
          float spread = (1.0 - smoothstep(uSpread - 0.22, uSpread, dd + wob)) * step(0.001, uSpread);
          float rim = smoothstep(uSpread - 0.3, uSpread - 0.04, dd + wob) * spread;
          diffuseColor.rgb = mix(diffuseColor.rgb, dyeTex.rgb, spread);
          diffuseColor.rgb *= 1.0 - rim * 0.35;
        #endif`,
      );
  };
  return mat;
}

function ProvinceMesh({ p, mode, provinceId, onHover, onSelectProvince, onInactiveClick }: { p: GeoProvince } & MapSceneProps) {
  const active = !!p.provinceId;
  const province = provinceById(p.provinceId);
  const geometry = useMemo(() => buildGeometry(p, active ? LAND_TOP_ACTIVE : LAND_TOP_INACTIVE), [p, active]);
  const mats = useMemo(() => {
    if (!active || !province) {
      const m = new THREE.MeshStandardMaterial({ color: SAND, roughness: 0.9 });
      return { top: m, side: m, dye: null as THREE.MeshStandardMaterial | null };
    }
    const tex = new THREE.CanvasTexture(getMotifTile(motifsOfProvince(province.id)[0]));
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 3);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    const [cx, cz] = project(province.center[0], province.center[1]);
    const top = makeDyeMaterial(province.color, tex, [cx, cz]);
    const side = new THREE.MeshStandardMaterial({ color: province.color, roughness: 0.75 });
    return { top, side, dye: top };
  }, [active, province]);
  useEffect(
    () => () => {
      geometry.dispose();
      mats.top.map?.dispose();
      mats.top.dispose();
      mats.side.dispose();
    },
    [geometry, mats],
  );
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const target = useMemo(() => new THREE.Color(), []);
  const sideTarget = useMemo(() => new THREE.Color(), []);

  const focused = mode === 'province' || mode === 'city';
  const isSelected = focused && provinceId === p.provinceId;

  useFrame((_, dt) => {
    const k = 1 - Math.exp(-dt * 6);
    const mesh = meshRef.current;
    if (!mesh) return;
    let base = active ? province!.color : SAND;
    if (focused && !isSelected) base = active ? mixHex(province!.color, SAND_DIM, 0.65) : SAND_DIM;
    target.set(base);
    if (hovered && !isSelected) target.lerp(new THREE.Color('#ffffff'), active ? 0.18 : 0.25);
    mats.top.color.lerp(target, k);
    if (mats.side !== mats.top) {
      sideTarget.copy(target).multiplyScalar(0.72);
      mats.side.color.lerp(sideTarget, k);
    }
    const lift = hovered && active && !isSelected ? 0.12 : isSelected ? 0.04 : 0;
    mesh.position.y += (lift - mesh.position.y) * k;
    // pewarna menyebar saat disorot / dipilih, surut saat ditinggalkan
    if (mats.dye && province) {
      const u = mats.dye.userData.uniforms as { uSpread: { value: number } };
      const goal = isSelected ? province.span * 1.6 : hovered && !focused ? province.span * 0.75 : 0;
      const rate = goal > u.uSpread.value ? 1.4 : 3.5;
      u.uSpread.value += (goal - u.uSpread.value) * (1 - Math.exp(-dt * rate));
      if (u.uSpread.value < 0.002) u.uSpread.value = 0;
    }
  });

  const over = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (!hovered && active && mode === 'indonesia') gamelan.sfx('tick');
    setHovered(true);
    document.body.style.cursor = 'pointer';
    onHover({ name: province?.name ?? p.name, active });
  };
  const out = () => {
    setHovered(false);
    document.body.style.cursor = '';
    onHover(null);
  };
  const click = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (mode === 'intro') return;
    if (active && p.provinceId) onSelectProvince(p.provinceId);
    else onInactiveClick(p.name);
  };

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={mats.top === mats.side ? mats.top : [mats.top, mats.side]}
      castShadow
      receiveShadow
      onPointerOver={over}
      onPointerOut={out}
      onClick={click}
    />
  );
}

function mixHex(a: string, b: string, t: number) {
  return '#' + new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString();
}

/** Tampilan cadangan kalau data batas provinsi gagal dimuat: lempeng bulat per provinsi Jawa. */
function FallbackJava({ mode, onHover, onSelectProvince }: MapSceneProps) {
  return (
    <group>
      {PROVINCES.map((pr) => {
        const [x, z] = project(pr.center[0], pr.center[1]);
        return (
          <mesh
            key={pr.id}
            position={[x, LAND_TOP_ACTIVE / 2, z]}
            castShadow
            onPointerOver={(e) => {
              e.stopPropagation();
              onHover({ name: pr.name, active: true });
            }}
            onPointerOut={() => onHover(null)}
            onClick={(e) => {
              e.stopPropagation();
              if (mode !== 'intro') onSelectProvince(pr.id);
            }}
          >
            <cylinderGeometry args={[Math.max(0.25, pr.span * 0.32), Math.max(0.25, pr.span * 0.32), LAND_TOP_ACTIVE, 40]} />
            <meshStandardMaterial color={pr.color} roughness={0.6} />
          </mesh>
        );
      })}
    </group>
  );
}

function ProvinceChips({ onSelect }: { onSelect: (id: ProvinceId) => void }) {
  return (
    <group>
      {PROVINCES.map((pr) => {
        const [x, z] = project(pr.center[0], pr.center[1]);
        return (
          <Html key={pr.id} position={[x, 0.6, z]} center zIndexRange={[20, 0]}>
            <button className="prov-chip" style={{ '--c': pr.color } as CSSProperties} onClick={() => onSelect(pr.id)}>
              {pr.name}
            </button>
          </Html>
        );
      })}
    </group>
  );
}

// ---------------- kota ----------------

function CityPins({ provinceId, cityId, onSelectCity }: { provinceId: ProvinceId; cityId: string | null; onSelectCity: (id: string) => void }) {
  return (
    <group>
      {citiesOf(provinceId).map((c) => (
        <CityPin key={c.id} city={c} selected={c.id === cityId} onSelect={() => onSelectCity(c.id)} />
      ))}
    </group>
  );
}

function CityPin({ city, selected, onSelect }: { city: City; selected: boolean; onSelect: () => void }) {
  const [x, z] = project(city.lon, city.lat);
  const head = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  useFrame((s) => {
    if (!head.current) return;
    const bob = Math.sin(s.clock.elapsedTime * 2 + x) * 0.012;
    head.current.position.y = 0.27 + bob;
    const sc = hovered || selected ? 1.35 : 1;
    head.current.scale.setScalar(head.current.scale.x + (sc - head.current.scale.x) * 0.15);
  });
  return (
    <group position={[x, LAND_TOP_ACTIVE + 0.04, z]}>
      <mesh position-y={0.13} castShadow>
        <cylinderGeometry args={[0.007, 0.007, 0.26, 8]} />
        <meshStandardMaterial color="#3b2a1e" />
      </mesh>
      <mesh
        ref={head}
        castShadow
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = '';
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
      >
        <sphereGeometry args={[0.04, 20, 20]} />
        <meshStandardMaterial color={selected ? '#b5542c' : '#c99a3b'} emissive={selected ? '#7a2a10' : '#000000'} emissiveIntensity={0.4} roughness={0.4} />
      </mesh>
      <Html position={[0, 0.4, 0]} center zIndexRange={[30, 0]}>
        <button className={`city-label${selected ? ' is-selected' : ''}`} onClick={onSelect}>
          {city.name}
        </button>
      </Html>
      {selected && <CityBlocks seed={x * 1000 + z} />}
      {selected && <Landmark cityId={city.id} />}
    </group>
  );
}

/** "Masuk ke perkotaan": deretan bangunan kecil yang tumbuh di sekitar kota terpilih. */
function CityBlocks({ seed }: { seed: number }) {
  const count = 90;
  const ref = useRef<THREE.InstancedMesh>(null);
  const group = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    let s = Math.abs(Math.floor(seed)) + 1;
    const rand = () => {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    };
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const palette = ['#f1e6d2', '#e7d3b5', '#c77b4a', '#b5542c', '#efe2c8', '#d9c4a3'].map((c) => new THREE.Color(c));
    for (let i = 0; i < count; i++) {
      let a = rand() * Math.PI * 2;
      let r = 0.07 + Math.pow(rand(), 0.7) * 0.32;
      // beri ruang untuk landmark di (-0.09, 0.03)
      for (let tries = 0; tries < 6 && Math.hypot(Math.cos(a) * r + 0.09, Math.sin(a) * r - 0.03) < 0.13; tries++) {
        a = rand() * Math.PI * 2;
        r = 0.12 + rand() * 0.27;
      }
      const w = 0.012 + rand() * 0.022;
      const h = (0.015 + rand() * 0.07) * (1.3 - r * 1.8);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * Math.PI);
      m.compose(new THREE.Vector3(Math.cos(a) * r, h / 2, Math.sin(a) * r), q, new THREE.Vector3(w, Math.max(0.01, h), w * (0.7 + rand() * 0.6)));
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, palette[Math.floor(rand() * palette.length)]);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [seed]);
  useFrame((_, dt) => {
    if (!group.current) return;
    const sy = group.current.scale.y;
    group.current.scale.y = sy + (1 - sy) * (1 - Math.exp(-dt * 2.2));
  });
  return (
    <group ref={group} scale={[1, 0.001, 1]}>
      <instancedMesh ref={ref} args={[undefined, undefined, count]} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.8} />
      </instancedMesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.002} receiveShadow>
        <circleGeometry args={[0.05, 32]} />
        <meshStandardMaterial color="#7f9c6a" roughness={1} />
      </mesh>
    </group>
  );
}

// ---------------- kamera sinematik ----------------

function CameraRig({ mode, provinceId, cityId }: { mode: MapMode; provinceId: ProvinceId | null; cityId: string | null }) {
  const { camera, size } = useThree();
  const look = useRef(new THREE.Vector3(0, 0, 0));
  const desired = useMemo(() => new THREE.Vector3(), []);
  const tgt = useMemo(() => new THREE.Vector3(), []);
  const dir = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, dt) => {
    const aspect = size.width / Math.max(1, size.height);
    const narrow = Math.max(1, 1.6 / aspect);
    const t = state.clock.elapsedTime;
    let dist: number;
    let speed = 1.6;
    const province: Province | null = provinceById(provinceId);
    const city = CITIES.find((c) => c.id === cityId) ?? null;

    if (mode === 'intro') {
      tgt.set(-1, 0, 1);
      const a = t * 0.05;
      dir.set(Math.sin(a) * 0.5, 1.1, Math.cos(a) * 0.9);
      dist = 52 * narrow;
      speed = 0.8;
    } else if (mode === 'indonesia' || !province) {
      tgt.set(-2.5, 0, 1.8);
      dir.set(0, 1, 0.62);
      dist = 36 * narrow;
    } else if (mode === 'city' && city) {
      const [x, z] = project(city.lon, city.lat);
      tgt.set(x, LAND_TOP_ACTIVE, z);
      dir.set(-0.15, 0.62, 1);
      dist = 1.25 * narrow;
      speed = 1.3;
    } else {
      const [x, z] = project(province.center[0], province.center[1]);
      tgt.set(x, LAND_TOP_ACTIVE, z);
      dir.set(0, 1, 0.85);
      dist = (province.span * 1.55 + 1.2) * narrow;
    }
    // geser fokus ke kanan supaya objek tidak tertutup panel samping
    if (mode === 'province' || mode === 'city') tgt.x += dist * 0.2;

    desired.copy(dir.normalize()).multiplyScalar(dist).add(tgt);
    desired.x += state.pointer.x * dist * 0.025;
    desired.y += state.pointer.y * dist * 0.02;

    const k = 1 - Math.exp(-dt * speed);
    // target pandang bergerak lebih cepat dari posisi kamera → efek menukik
    look.current.lerp(tgt, Math.min(1, k * 1.6));
    camera.position.lerp(desired, k);
    camera.lookAt(look.current);
  });
  return null;
}

