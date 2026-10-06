"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useThree, type ThreeEvent } from "@react-three/fiber";
import { Billboard, OrthographicCamera, useGLTF, useTexture } from "@react-three/drei";
import * as THREE from "three";
import {
  CELL,
  GRID,
  ROOM_SIZE,
  WALL_HEIGHT,
  collides,
  elevationOf,
  floorStyles,
  footprint,
  furnitureByKind,
  tintColors,
  wallStyles,
  type HouseConfig,
  type LightMode,
  type Placement,
} from "@/features/house/schema";

/**
 * 2.5D 집 (아이소메트릭 정사영 카메라 + Kenney 가구 glTF).
 * - 보기: 90°씩 돌려 볼 수 있고, 카메라 쪽 벽 두 면은 숨겨 방 안이 보이게 한다.
 * - 편집: 가구를 눌러 고르고 끌어서 옮긴다(칸 단위로 붙음). 겹치는 자리로는 움직이지 않는다.
 */

export type Person = { id: string; name: string; minimiUrl: string | null; isHost?: boolean };

export type SceneProps = {
  house: HouseConfig;
  /** 0~3: 카메라가 방을 바라보는 방향 */
  view: number;
  owner: Person | null;
  visitors?: Person[];
  editable?: boolean;
  selected?: number | null;
  onSelect?: (index: number | null) => void;
  onMove?: (index: number, x: number, z: number) => void;
  label: string;
};

const HALF = ROOM_SIZE / 2;
const MODEL = (kind: string) => `/house/models/${kind}.glb`;

const lighting: Record<LightMode, { sky: string; ground: string; hemi: number; sun: string; sunI: number; window: [string, string]; lamp: number; bg: string }> = {
  day: { sky: "#ffffff", ground: "#d9cfc4", hemi: 1.6, sun: "#fff6e6", sunI: 1.9, window: ["#8cc8ff", "#e3f3ff"], lamp: 0.2, bg: "#f1edfb" },
  sunset: { sky: "#fff0e2", ground: "#c9b2b0", hemi: 1.35, sun: "#ffc18f", sunI: 1.7, window: ["#ff9f73", "#ffe0b5"], lamp: 0.9, bg: "#f4ecf6" },
  night: { sky: "#9aa0dc", ground: "#3a3550", hemi: 0.95, sun: "#a9b8ff", sunI: 0.35, window: ["#141a46", "#343c86"], lamp: 2.2, bg: "#1f1d33" },
};

/** 칸 좌표 → 월드 좌표 (가구 중심) */
function centerOf(p: Placement) {
  const def = furnitureByKind.get(p.k)!;
  const f = footprint(def, p.r);
  return { x: -HALF + (p.x + f.w / 2) * CELL, z: -HALF + (p.z + f.d / 2) * CELL, w: f.w * CELL, d: f.d * CELL };
}

function plankTexture(base: string, line: string, herringbone: boolean) {
  const size = 512;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const x = c.getContext("2d")!;
  x.fillStyle = base;
  x.fillRect(0, 0, size, size);
  const rand = (i: number) => ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1;
  if (herringbone) {
    for (let r = 0; r < 16; r++)
      for (let k = 0; k < 8; k++) {
        x.save();
        x.translate(k * 64 + (r % 2) * 32, r * 32);
        x.rotate(r % 2 ? Math.PI / 4 : -Math.PI / 4);
        x.fillStyle = `rgba(0,0,0,${0.04 + rand(r * 9 + k) * 0.06})`;
        x.fillRect(0, 0, 44, 14);
        x.restore();
      }
  } else {
    const rows = 8;
    for (let r = 0; r < rows; r++) {
      const y = (r * size) / rows;
      x.fillStyle = rand(r) > 0.5 ? `rgba(255,255,255,${rand(r) * 0.14})` : `rgba(0,0,0,${rand(r) * 0.08})`;
      x.fillRect(0, y, size, size / rows);
      x.strokeStyle = line;
      x.lineWidth = 4;
      x.beginPath();
      x.moveTo(0, y);
      x.lineTo(size, y);
      x.stroke();
      const off = rand(r + 3) * size;
      x.beginPath();
      x.moveTo(off, y);
      x.lineTo(off, y + size / rows);
      x.stroke();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2, 2);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/* ───────── 방 껍데기 ───────── */

function Room({ house, view }: { house: HouseConfig; view: number }) {
  const wall = wallStyles[house.wall];
  const floor = floorStyles[house.floor];
  const L = lighting[house.light];
  const floorTex = useMemo(() => plankTexture(floor.base, floor.line, house.floor === 4), [floor.base, floor.line, house.floor]);
  useEffect(() => () => floorTex.dispose(), [floorTex]);

  // 벽: 0=북(-z), 1=동(+x), 2=남(+z), 3=서(-x). 카메라 반대편 두 면만 보인다.
  const visibleWalls = [[0, 3], [0, 1], [1, 2], [2, 3]][view];
  const walls = [
    { id: 0, pos: [0, WALL_HEIGHT / 2, -HALF] as const, rot: 0 },
    { id: 1, pos: [HALF, WALL_HEIGHT / 2, 0] as const, rot: -Math.PI / 2 },
    { id: 2, pos: [0, WALL_HEIGHT / 2, HALF] as const, rot: Math.PI },
    { id: 3, pos: [-HALF, WALL_HEIGHT / 2, 0] as const, rot: Math.PI / 2 },
  ];
  // 창문은 보이는 벽 중 왼쪽 벽에 둔다
  const windowWall = visibleWalls[1];

  return (
    <group>
      {/* 바닥 + 두께 */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[ROOM_SIZE, ROOM_SIZE]} />
        <meshStandardMaterial map={floorTex} roughness={0.75} />
      </mesh>
      <mesh position={[0, -0.08, 0]}>
        <boxGeometry args={[ROOM_SIZE + 0.16, 0.16, ROOM_SIZE + 0.16]} />
        <meshStandardMaterial color={wall.trim} />
      </mesh>
      {walls
        .filter((w) => visibleWalls.includes(w.id))
        .map((w) => (
          <group key={w.id} position={w.pos as unknown as THREE.Vector3Tuple} rotation-y={w.rot}>
            <mesh position={[0, 0, -0.04]} receiveShadow>
              <boxGeometry args={[ROOM_SIZE + 0.16, WALL_HEIGHT, 0.08]} />
              <meshStandardMaterial color={wall.color} roughness={0.95} />
            </mesh>
            {/* 걸레받이 */}
            <mesh position={[0, -WALL_HEIGHT / 2 + 0.05, 0.005]}>
              <boxGeometry args={[ROOM_SIZE, 0.1, 0.02]} />
              <meshStandardMaterial color={wall.trim} />
            </mesh>
            {/* 벽 윗면 마감 */}
            <mesh position={[0, WALL_HEIGHT / 2 + 0.02, -0.04]}>
              <boxGeometry args={[ROOM_SIZE + 0.2, 0.04, 0.12]} />
              <meshStandardMaterial color={wall.trim} />
            </mesh>
            {w.id === windowWall ? <Window colors={L.window} /> : <WallDecor accent={wall.trim} />}
          </group>
        ))}
    </group>
  );
}

function Window({ colors }: { colors: [string, string] }) {
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 128;
    const x = c.getContext("2d")!;
    const g = x.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, colors[0]);
    g.addColorStop(1, colors[1]);
    x.fillStyle = g;
    x.fillRect(0, 0, 64, 128);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [colors]);
  useEffect(() => () => tex.dispose(), [tex]);
  return (
    <group position={[0.35, 0.1, 0.01]}>
      <mesh>
        <boxGeometry args={[0.95, 0.8, 0.03]} />
        <meshStandardMaterial color="#fbfaf7" />
      </mesh>
      <mesh position={[0, 0, 0.02]}>
        <planeGeometry args={[0.85, 0.68]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, 0.03]}>
        <boxGeometry args={[0.03, 0.68, 0.02]} />
        <meshStandardMaterial color="#fbfaf7" />
      </mesh>
      <mesh position={[0, 0, 0.03]}>
        <boxGeometry args={[0.85, 0.03, 0.02]} />
        <meshStandardMaterial color="#fbfaf7" />
      </mesh>
      {/* 창틀 받침 */}
      <mesh position={[0, -0.42, 0.05]}>
        <boxGeometry args={[1.05, 0.04, 0.1]} />
        <meshStandardMaterial color="#fbfaf7" />
      </mesh>
    </group>
  );
}

/** 창문이 없는 벽: 액자 두 개와 작은 선반 */
function WallDecor({ accent }: { accent: string }) {
  const frames: { x: number; y: number; w: number; h: number; art: string }[] = [
    { x: -0.55, y: 0.25, w: 0.42, h: 0.52, art: "#f2b8a2" },
    { x: -0.05, y: 0.33, w: 0.32, h: 0.32, art: "#a9c8e8" },
  ];
  return (
    <group>
      {frames.map((f) => (
        <group key={f.x} position={[f.x, f.y, 0.02]}>
          <mesh castShadow>
            <boxGeometry args={[f.w, f.h, 0.03]} />
            <meshStandardMaterial color="#8a5d3b" />
          </mesh>
          <mesh position={[0, 0, 0.017]}>
            <planeGeometry args={[f.w - 0.07, f.h - 0.07]} />
            <meshStandardMaterial color="#fffaf2" />
          </mesh>
          <mesh position={[0, -f.h * 0.08, 0.019]}>
            <circleGeometry args={[Math.min(f.w, f.h) * 0.22, 24]} />
            <meshStandardMaterial color={f.art} />
          </mesh>
        </group>
      ))}
      {/* 벽 선반 */}
      <mesh position={[0.75, 0.18, 0.08]} castShadow>
        <boxGeometry args={[0.7, 0.04, 0.16]} />
        <meshStandardMaterial color="#b98a5e" />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0.52 + i * 0.07, 0.29, 0.08]} castShadow>
          <boxGeometry args={[0.05, 0.18 - i * 0.02, 0.12]} />
          <meshStandardMaterial color={["#7c5cff", "#f0a35e", accent][i]} />
        </mesh>
      ))}
      <mesh position={[0.92, 0.26, 0.08]} castShadow>
        <cylinderGeometry args={[0.05, 0.04, 0.1, 16]} />
        <meshStandardMaterial color="#e9e4dc" />
      </mesh>
      <mesh position={[0.92, 0.36, 0.08]} castShadow>
        <sphereGeometry args={[0.07, 16, 12]} />
        <meshStandardMaterial color="#6fa36b" />
      </mesh>
    </group>
  );
}

/* ───────── 가구 ───────── */

function Furniture({ p, index, items, selected, editable, onSelect, onDragStart, lampI }: { p: Placement; index: number; items: Placement[]; selected: boolean; editable: boolean; onSelect?: (i: number) => void; onDragStart?: (i: number, e: ThreeEvent<PointerEvent>) => void; lampI: number }) {
  const def = furnitureByKind.get(p.k)!;
  const { scene } = useGLTF(MODEL(p.k), false);
  const tint = tintColors[p.c]?.color ?? null;

  // 모델마다 원점이 달라서, 발자국 중심·바닥(y=0)에 맞춰 놓는다
  const { object, offset } = useMemo(() => {
    const o = scene.clone(true);
    o.traverse((n) => {
      const m = n as THREE.Mesh;
      if (!m.isMesh) return;
      m.castShadow = true;
      m.receiveShadow = true;
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      const next = mats.map((mat) => {
        const c = (mat as THREE.MeshStandardMaterial).clone();
        if (tint && def.tint?.includes(mat.name)) {
          c.color = new THREE.Color(tint);
          if (mat.name.endsWith("Darker")) c.color.multiplyScalar(0.82);
        }
        if (mat.name === "lamp") {
          c.emissive = new THREE.Color("#ffd59a");
          c.emissiveIntensity = lampI;
        }
        return c;
      });
      m.material = Array.isArray(m.material) ? next : next[0];
    });
    const box = new THREE.Box3().setFromObject(o);
    const center = box.getCenter(new THREE.Vector3());
    return { object: o, offset: new THREE.Vector3(-center.x, -box.min.y, -center.z) };
  }, [scene, tint, def.tint, lampI]);

  const c = centerOf(p);
  const y = elevationOf(items, index);
  return (
    <group
      position={[c.x, y, c.z]}
      onClick={
        editable
          ? (e) => {
              e.stopPropagation();
              onSelect?.(index);
            }
          : undefined
      }
      onPointerDown={editable && selected ? (e) => onDragStart?.(index, e) : undefined}
    >
      <group rotation-y={(-p.r * Math.PI) / 2}>
        <primitive object={object} position={offset} />
      </group>
      {def.light && <pointLight position={[0, def.light.y, 0]} color={def.light.color} intensity={lampI} distance={2.6} decay={1.6} />}
    </group>
  );
}

function SelectionMark({ items, index }: { items: Placement[]; index: number }) {
  const p = items[index];
  const c = centerOf(p);
  const bad = collides(items, index);
  return (
    <mesh position={[c.x, elevationOf(items, index) + 0.012, c.z]} rotation-x={-Math.PI / 2}>
      <planeGeometry args={[c.w, c.d]} />
      <meshBasicMaterial color={bad ? "#e5484d" : "#7c5cff"} transparent opacity={0.35} depthWrite={false} />
    </mesh>
  );
}

/* ───────── 사람 (미니미) ───────── */

function MinimiSprite({ url }: { url: string }) {
  const tex = useTexture(url, (t) => {
    t.colorSpace = THREE.SRGBColorSpace;
  });
  return (
    <mesh position={[0, 0.35, 0]}>
      <planeGeometry args={[0.7, 0.7]} />
      <meshBasicMaterial map={tex} transparent alphaTest={0.05} toneMapped={false} />
    </mesh>
  );
}

/** 이름표: 캔버스로 그린 텍스처 (별도 DOM/폰트 다운로드 없이) */
function NameTag({ text }: { text: string }) {
  const { tex, aspect } = useMemo(() => {
    const scale = 4;
    const c = document.createElement("canvas");
    const x = c.getContext("2d")!;
    const font = `700 ${13 * scale}px system-ui, -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif`;
    x.font = font;
    const w = Math.ceil(x.measureText(text).width) + 20 * scale;
    const h = 24 * scale;
    c.width = w;
    c.height = h;
    x.font = font;
    x.fillStyle = "rgba(255,255,255,0.94)";
    x.beginPath();
    x.roundRect(0, 0, w, h, h / 2);
    x.fill();
    x.fillStyle = "#2b2540";
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.fillText(text, w / 2, h / 2 + scale);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return { tex: t, aspect: w / h };
  }, [text]);
  useEffect(() => () => tex.dispose(), [tex]);
  const h = 0.16;
  return (
    <mesh position={[0, 0.8, 0]} renderOrder={10}>
      <planeGeometry args={[h * aspect, h]} />
      <meshBasicMaterial map={tex} transparent depthTest={false} toneMapped={false} />
    </mesh>
  );
}

function PersonFigure({ person, position }: { person: Person; position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* 발밑 그림자 */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.01, 0]}>
        <circleGeometry args={[0.16, 24]} />
        <meshBasicMaterial color="#000" transparent opacity={0.18} depthWrite={false} />
      </mesh>
      <Billboard>
        {person.minimiUrl ? (
          <Suspense fallback={null}>
            <MinimiSprite url={person.minimiUrl} />
          </Suspense>
        ) : (
          <mesh position={[0, 0.35, 0]}>
            <sphereGeometry args={[0.18, 24, 16]} />
            <meshStandardMaterial color="#c8b8ff" />
          </mesh>
        )}
        <NameTag text={`${person.isHost ? "🏠 " : ""}${person.name}`} />
      </Billboard>
    </group>
  );
}

/** 사람이 설 자리: 가구가 없는 칸 중 방 앞쪽 가운데에서 가까운 곳부터 */
function standingSpots(items: Placement[], count: number): [number, number, number][] {
  const taken = new Set<string>();
  items.forEach((p) => {
    const def = furnitureByKind.get(p.k);
    if (!def || def.layer === "rug") return;
    const f = footprint(def, p.r);
    for (let dx = -1; dx <= f.w; dx++) for (let dz = -1; dz <= f.d; dz++) taken.add(`${p.x + dx},${p.z + dz}`);
  });
  const cells: [number, number][] = [];
  for (let z = 1; z < GRID - 1; z += 2) for (let x = 1; x < GRID - 1; x += 2) if (!taken.has(`${x},${z}`) && !taken.has(`${x + 1},${z + 1}`)) cells.push([x, z]);
  const target = [GRID / 2, GRID * 0.7];
  cells.sort((a, b) => Math.hypot(a[0] - target[0], a[1] - target[1]) - Math.hypot(b[0] - target[0], b[1] - target[1]));
  const out: [number, number, number][] = [];
  for (const [x, z] of cells) {
    if (out.length >= count) break;
    const wx = -HALF + (x + 1) * CELL;
    const wz = -HALF + (z + 1) * CELL;
    if (out.some(([ox, , oz]) => Math.hypot(ox - wx, oz - wz) < 0.55)) continue;
    out.push([wx, 0, wz]);
  }
  return out;
}

/* ───────── 카메라 ───────── */

function IsoCamera({ view }: { view: number }) {
  const size = useThree((s) => s.size);
  const angle = Math.PI / 4 + (view * Math.PI) / 2;
  const d = 12;
  // 방 전체가 화면에 들어오도록 확대율 조정
  const zoom = Math.min(size.width / (ROOM_SIZE * 1.5), size.height / (ROOM_SIZE * 1.18));
  return (
    <OrthographicCamera
      makeDefault
      position={[Math.sin(angle) * d, d * 0.82, Math.cos(angle) * d]}
      zoom={zoom}
      near={-50}
      far={100}
      onUpdate={(c) => {
        c.lookAt(0, 0.35, 0);
        c.updateProjectionMatrix();
      }}
    />
  );
}

/* ───────── 장면 ───────── */

function World({ house, view, owner, visitors = [], editable = false, selected = null, onSelect, onMove }: SceneProps) {
  const L = lighting[house.light];
  const drag = useRef<{ index: number; dx: number; dz: number } | null>(null);
  const lampI = house.items.some((p) => furnitureByKind.get(p.k)?.light) ? L.lamp : 0;
  const people = useMemo(() => [owner, ...visitors].filter((p): p is Person => !!p).slice(0, 8), [owner, visitors]);
  const spots = useMemo(() => standingSpots(house.items, people.length), [house.items, people.length]);
  // 해는 창문 쪽(보이는 왼쪽 벽 바깥)에서 들어온다
  const sunAngle = Math.PI / 4 + (view * Math.PI) / 2 + Math.PI / 2.2;

  function toCell(point: THREE.Vector3) {
    return { cx: Math.floor((point.x + HALF) / CELL), cz: Math.floor((point.z + HALF) / CELL) };
  }

  function startDrag(index: number, e: ThreeEvent<PointerEvent>) {
    e.stopPropagation();
    const p = house.items[index];
    const { cx, cz } = toCell(e.point);
    drag.current = { index, dx: cx - p.x, dz: cz - p.z };
    (e.target as Element | null)?.setPointerCapture?.(e.pointerId);
  }

  function dragMove(e: ThreeEvent<PointerEvent>) {
    const d = drag.current;
    if (!d) return;
    const p = house.items[d.index];
    const { cx, cz } = toCell(e.point);
    const nx = cx - d.dx;
    const nz = cz - d.dz;
    if (nx !== p.x || nz !== p.z) onMove?.(d.index, nx, nz);
  }

  return (
    <>
      <color attach="background" args={[L.bg]} />
      <IsoCamera view={view} />
      <ambientLight color={L.sky} intensity={L.hemi * 0.55} />
      <hemisphereLight args={[L.sky, L.ground, L.hemi]} />
      <directionalLight
        position={[Math.sin(sunAngle) * 6, 7, Math.cos(sunAngle) * 6]}
        color={L.sun}
        intensity={L.sunI}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-4}
        shadow-camera-right={4}
        shadow-camera-top={4}
        shadow-camera-bottom={-4}
      />
      <Room house={house} view={view} />
      {/* 끌어서 옮길 때 포인터 위치를 읽는 보이지 않는 바닥 */}
      <mesh
        rotation-x={-Math.PI / 2}
        position={[0, 0.001, 0]}
        onPointerMove={editable ? dragMove : undefined}
        onPointerUp={() => (drag.current = null)}
        onPointerLeave={() => (drag.current = null)}
        onClick={editable ? () => onSelect?.(null) : undefined}
      >
        <planeGeometry args={[ROOM_SIZE * 3, ROOM_SIZE * 3]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {house.items.map((p, i) => (
        <Suspense key={`${i}-${p.k}`} fallback={null}>
          <Furniture p={p} index={i} items={house.items} selected={selected === i} editable={editable} onSelect={onSelect} onDragStart={startDrag} lampI={lampI} />
        </Suspense>
      ))}
      {editable && selected !== null && house.items[selected] && <SelectionMark items={house.items} index={selected} />}
      {!editable && people.map((person, i) => spots[i] && <PersonFigure key={person.id} person={person} position={spots[i]} />)}
    </>
  );
}

export default function HouseScene(props: SceneProps) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      frameloop="demand"
      gl={{ antialias: true, toneMapping: THREE.NeutralToneMapping }}
      aria-label={props.label}
      role="img"
      onPointerMissed={props.editable ? () => props.onSelect?.(null) : undefined}
    >
      <World {...props} />
    </Canvas>
  );
}

export function preloadFurniture(kinds: string[]) {
  for (const k of new Set(kinds)) useGLTF.preload(MODEL(k), false);
}
