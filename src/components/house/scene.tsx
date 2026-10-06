"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Billboard, OrthographicCamera, useGLTF, useTexture } from "@react-three/drei";
import * as THREE from "three";
import {
  CELL,
  ROOM_SIZE,
  WALL_HEIGHT,
  WINDOW,
  collides,
  elevationOf,
  floorStyles,
  footprint,
  furnitureByKind,
  isWallItem,
  nearestWalkable,
  tintColors,
  wallStyles,
  type HouseConfig,
  type LightMode,
  type FurnitureDef,
  type Placement,
} from "@/features/house/schema";
import { WALL_ROTATIONS, visibleWallsFor } from "./wall-math";

/**
 * 2.5D 집 (아이소메트릭 정사영 카메라 + Kenney 가구 glTF).
 * - 보기: 90°씩 돌려 볼 수 있고, 카메라 쪽 벽 두 면은 숨겨 방 안이 보이게 한다.
 * - 편집: 가구를 눌러 고르고 끌어서 옮긴다(칸 단위로 붙음). 벽걸이 장식은 벽 위에서 끈다.
 * - 놀러 온 사람: 바닥을 누르면 내 미니미가 그 자리로 걸어가고, 같은 집 사람들 화면에도 보인다.
 */

export type Person = {
  id: string;
  name: string;
  minimiUrl: string | null;
  isHost?: boolean;
  isMe?: boolean;
  /** 서 있는 자리(월드 좌표). 없으면 그리지 않는다 */
  pos?: [number, number] | null;
};

export type SceneProps = {
  house: HouseConfig;
  /** 0~3: 카메라가 방을 바라보는 방향 */
  view: number;
  people: Person[];
  editable?: boolean;
  selected?: number | null;
  onSelect?: (index: number | null) => void;
  /** 가구 옮기기. 벽걸이 장식은 wl(벽 번호)도 함께 */
  onMove?: (index: number, x: number, z: number, wl?: number) => void;
  /** 바닥을 눌러 걷기 (월드 좌표) */
  onWalk?: (x: number, z: number) => void;
  label: string;
};

/** 벽: 0=북(-z), 1=동(+x), 2=남(+z), 3=서(-x) */
const WALLS = [
  { id: 0, pos: [0, WALL_HEIGHT / 2, -ROOM_SIZE / 2] as THREE.Vector3Tuple, rot: WALL_ROTATIONS[0] },
  { id: 1, pos: [ROOM_SIZE / 2, WALL_HEIGHT / 2, 0] as THREE.Vector3Tuple, rot: WALL_ROTATIONS[1] },
  { id: 2, pos: [0, WALL_HEIGHT / 2, ROOM_SIZE / 2] as THREE.Vector3Tuple, rot: WALL_ROTATIONS[2] },
  { id: 3, pos: [-ROOM_SIZE / 2, WALL_HEIGHT / 2, 0] as THREE.Vector3Tuple, rot: WALL_ROTATIONS[3] },
];

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

function Room({ house, view, wallChildren, onWallMove }: { house: HouseConfig; view: number; wallChildren: (wall: number) => React.ReactNode; onWallMove?: (wall: number, e: ThreeEvent<PointerEvent>) => void }) {
  const wall = wallStyles[house.wall];
  const floor = floorStyles[house.floor];
  const L = lighting[house.light];
  const floorTex = useMemo(() => plankTexture(floor.base, floor.line, house.floor === 4), [floor.base, floor.line, house.floor]);
  useEffect(() => () => floorTex.dispose(), [floorTex]);
  const visibleWalls = visibleWallsFor(view);

  return (
    <group>
      {/* 바닥 + 두께 */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[ROOM_SIZE, ROOM_SIZE]} />
        <meshStandardMaterial map={floorTex} roughness={0.75} />
      </mesh>
      {/* 받침의 윗면을 바닥보다 살짝 낮춰 바닥과 겹쳐 깜빡이지(z-fighting) 않게 한다 */}
      <mesh position={[0, -0.086, 0]}>
        <boxGeometry args={[ROOM_SIZE + 0.16, 0.16, ROOM_SIZE + 0.16]} />
        <meshStandardMaterial color={wall.trim} />
      </mesh>
      {WALLS.filter((w) => visibleWalls.includes(w.id)).map((w) => (
        <group key={w.id} position={w.pos} rotation-y={w.rot}>
          <mesh position={[0, 0, -0.04]} receiveShadow onPointerMove={onWallMove ? (e) => onWallMove(w.id, e) : undefined}>
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
          {w.id === WINDOW.wall && <Window colors={L.window} />}
          {wallChildren(w.id)}
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
    <group position={[-HALF + ((WINDOW.x0 + WINDOW.x1) / 2) * CELL, -WALL_HEIGHT / 2 + ((WINDOW.y0 + WINDOW.y1) / 2) * CELL - 0.02, 0.01]}>
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

/* ───────── 벽걸이 장식 (코드로 그린다) ───────── */

const ART_DEFAULT: Record<string, string> = {
  wallFrameSmall: "#a9c8e8",
  wallFrameLarge: "#f2b8a2",
  wallShelf: "#7c5cff",
  wallClock: "#f0a35e",
  wallPoster: "#b9a6ee",
};

function WallArt({ kind, w, h, art, glow }: { kind: string; w: number; h: number; art: string; glow: number }) {
  switch (kind) {
    case "wallFrameSmall":
    case "wallFrameLarge":
      return (
        <group>
          <mesh castShadow>
            <boxGeometry args={[w - 0.04, h - 0.04, 0.03]} />
            <meshStandardMaterial color="#8a5d3b" />
          </mesh>
          <mesh position={[0, 0, 0.017]}>
            <planeGeometry args={[w - 0.1, h - 0.1]} />
            <meshStandardMaterial color="#fffaf2" />
          </mesh>
          <mesh position={[0, h * 0.06, 0.019]}>
            <circleGeometry args={[Math.min(w, h) * 0.18, 24]} />
            <meshStandardMaterial color={art} />
          </mesh>
          <mesh position={[0, -h * 0.2, 0.019]}>
            <planeGeometry args={[w - 0.14, h * 0.18]} />
            <meshStandardMaterial color={new THREE.Color(art).lerp(new THREE.Color("#6fa36b"), 0.6).getStyle()} />
          </mesh>
        </group>
      );
    case "wallShelf":
      return (
        <group position={[0, -h / 2 + 0.03, 0]}>
          <mesh position={[0, 0, 0.08]} castShadow>
            <boxGeometry args={[w - 0.04, 0.04, 0.16]} />
            <meshStandardMaterial color="#b98a5e" />
          </mesh>
          {[0, 1, 2].map((i) => (
            <mesh key={i} position={[-w / 2 + 0.12 + i * 0.07, 0.1 - i * 0.01, 0.08]} castShadow>
              <boxGeometry args={[0.05, 0.16 - i * 0.02, 0.12]} />
              <meshStandardMaterial color={[art, "#f0a35e", "#8fb8a8"][i]} />
            </mesh>
          ))}
          <mesh position={[w / 2 - 0.14, 0.07, 0.08]} castShadow>
            <cylinderGeometry args={[0.05, 0.04, 0.1, 16]} />
            <meshStandardMaterial color="#e9e4dc" />
          </mesh>
          <mesh position={[w / 2 - 0.14, 0.17, 0.08]} castShadow>
            <sphereGeometry args={[0.07, 16, 12]} />
            <meshStandardMaterial color="#6fa36b" />
          </mesh>
        </group>
      );
    case "wallClock":
      return (
        <group>
          <mesh rotation-x={Math.PI / 2} position={[0, 0, 0.02]} castShadow>
            <cylinderGeometry args={[0.1, 0.1, 0.035, 32]} />
            <meshStandardMaterial color={art} />
          </mesh>
          <mesh position={[0, 0, 0.039]}>
            <circleGeometry args={[0.082, 32]} />
            <meshStandardMaterial color="#fffaf2" />
          </mesh>
          <mesh position={[0, 0.025, 0.042]}>
            <boxGeometry args={[0.008, 0.05, 0.004]} />
            <meshStandardMaterial color="#2b2540" />
          </mesh>
          <mesh position={[0.02, 0, 0.042]} rotation-z={-Math.PI / 2}>
            <boxGeometry args={[0.008, 0.04, 0.004]} />
            <meshStandardMaterial color="#2b2540" />
          </mesh>
        </group>
      );
    case "wallPoster":
      return (
        <group>
          <mesh position={[0, 0, 0.006]} castShadow>
            <boxGeometry args={[w - 0.06, h - 0.06, 0.008]} />
            <meshStandardMaterial color={art} />
          </mesh>
          <mesh position={[0, h * 0.08, 0.011]}>
            <circleGeometry args={[w * 0.22, 24]} />
            <meshStandardMaterial color="#fff4d6" />
          </mesh>
          {[0, 1].map((i) => (
            <mesh key={i} position={[0, -h * 0.22 - i * 0.05, 0.011]}>
              <planeGeometry args={[w * (0.6 - i * 0.2), 0.022]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
          ))}
        </group>
      );
    case "wallMirror":
      return (
        <group>
          <mesh position={[0, 0, 0.015]} castShadow>
            <boxGeometry args={[w - 0.06, h - 0.04, 0.03]} />
            <meshStandardMaterial color="#d8b46a" metalness={0.5} roughness={0.35} />
          </mesh>
          <mesh position={[0, 0, 0.031]}>
            <planeGeometry args={[w - 0.12, h - 0.1]} />
            <meshStandardMaterial color="#dfe9f2" metalness={0.9} roughness={0.08} />
          </mesh>
          <mesh position={[-w * 0.12, h * 0.15, 0.032]} rotation-z={0.5}>
            <planeGeometry args={[0.03, h * 0.35]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.55} />
          </mesh>
        </group>
      );
    case "wallGarland": {
      const n = 8;
      const colors = ["#ffd36e", "#ff9fb1", "#9fd6ff", "#b9ffb0"];
      return (
        <group>
          {Array.from({ length: n }, (_, i) => {
            const t = i / (n - 1);
            const x = -w / 2 + 0.08 + t * (w - 0.16);
            const y = 0.06 - Math.sin(t * Math.PI) * 0.08;
            return (
              <group key={i} position={[x, y, 0.03]}>
                <mesh>
                  <sphereGeometry args={[0.022, 12, 10]} />
                  <meshStandardMaterial color={colors[i % colors.length]} emissive={colors[i % colors.length]} emissiveIntensity={0.4 + glow} />
                </mesh>
              </group>
            );
          })}
          <mesh position={[0, 0.02, 0.025]}>
            <boxGeometry args={[w - 0.12, 0.005, 0.005]} />
            <meshStandardMaterial color="#5b5148" />
          </mesh>
        </group>
      );
    }
    case "wallPlant":
      return (
        <group position={[0, -0.04, 0.07]}>
          <mesh position={[0, -0.08, 0]} castShadow>
            <cylinderGeometry args={[0.07, 0.05, 0.1, 16]} />
            <meshStandardMaterial color="#e9e4dc" />
          </mesh>
          {[-0.05, 0, 0.05].map((x, i) => (
            <mesh key={i} position={[x, -0.04 - i * 0.03, 0.02]} castShadow>
              <sphereGeometry args={[0.055, 12, 10]} />
              <meshStandardMaterial color={["#6fa36b", "#5c9460", "#7fb37a"][i]} />
            </mesh>
          ))}
          <mesh position={[0, 0.06, -0.04]}>
            <boxGeometry args={[0.005, 0.2, 0.005]} />
            <meshStandardMaterial color="#8a7a68" />
          </mesh>
        </group>
      );
    default:
      return null;
  }
}

function WallItem({ p, index, def, selected, bad, editable, glow, onSelect, onDragStart }: { p: Placement; index: number; def: FurnitureDef; selected: boolean; bad: boolean; editable: boolean; glow: number; onSelect?: (i: number) => void; onDragStart?: (i: number, e: ThreeEvent<PointerEvent>) => void }) {
  const f = footprint(def, 0);
  const w = f.w * CELL;
  const h = f.d * CELL;
  const art = tintColors[p.c]?.color ?? ART_DEFAULT[p.k] ?? "#b9a6ee";
  return (
    <group
      position={[-HALF + (p.x + f.w / 2) * CELL, -WALL_HEIGHT / 2 + (p.z + f.d / 2) * CELL, 0]}
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
      {selected && (
        <mesh position={[0, 0, 0.004]}>
          <planeGeometry args={[w, h]} />
          <meshBasicMaterial color={bad ? "#e5484d" : "#7c5cff"} transparent opacity={0.3} depthWrite={false} />
        </mesh>
      )}
      <WallArt kind={p.k} w={w} h={h} art={art} glow={glow} />
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
function NameTag({ text, accent = false }: { text: string; accent?: boolean }) {
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
    x.fillStyle = accent ? "#6a47f0" : "rgba(255,255,255,0.94)";
    x.beginPath();
    x.roundRect(0, 0, w, h, h / 2);
    x.fill();
    x.fillStyle = accent ? "#ffffff" : "#2b2540";
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.fillText(text, w / 2, h / 2 + scale);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return { tex: t, aspect: w / h };
  }, [text, accent]);
  useEffect(() => () => tex.dispose(), [tex]);
  const h = 0.16;
  return (
    <mesh position={[0, 0.8, 0]} renderOrder={10}>
      <planeGeometry args={[h * aspect, h]} />
      <meshBasicMaterial map={tex} transparent depthTest={false} toneMapped={false} />
    </mesh>
  );
}

const WALK_SPEED = 1.4; // 초당 이동 거리

function PersonFigure({ person, pos }: { person: Person; pos: [number, number] }) {
  const ref = useRef<THREE.Group>(null);
  // 처음 자리만 prop으로 주고, 이후에는 useFrame에서 pos 쪽으로 걸어간다
  const [initial] = useState<THREE.Vector3Tuple>(() => [pos[0], 0, pos[1]]);
  const invalidate = useThree((s) => s.invalidate);
  const [tx, tz] = pos;
  useEffect(() => invalidate(), [tx, tz, invalidate]);
  useFrame((state, delta) => {
    const g = ref.current;
    if (!g) return;
    const dx = tx - g.position.x;
    const dz = tz - g.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.004) {
      if (g.position.y !== 0) {
        g.position.y = 0;
        state.invalidate();
      }
      return;
    }
    const step = Math.min(dist, Math.min(delta, 0.05) * WALK_SPEED);
    g.position.x += (dx / dist) * step;
    g.position.z += (dz / dist) * step;
    // 콩콩 걷는 느낌
    g.position.y = Math.abs(Math.sin(state.clock.elapsedTime * 14)) * 0.035;
    state.invalidate();
  });
  return (
    <group ref={ref} position={initial}>
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
        <NameTag text={`${person.isHost ? "🏠 " : ""}${person.name}${person.isMe ? " (나)" : ""}`} accent={!!person.isMe} />
      </Billboard>
    </group>
  );
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

function World({ house, view, people = [], editable = false, selected = null, onSelect, onMove, onWalk }: SceneProps) {
  const L = lighting[house.light];
  const drag = useRef<{ index: number; dx: number; dz: number; wall: boolean } | null>(null);
  const hasLamp = house.items.some((p) => furnitureByKind.get(p.k)?.light);
  const lampI = hasLamp ? L.lamp : 0;
  const shown = people.slice(0, 9);
  // 해는 창문 쪽(보이는 왼쪽 벽 바깥)에서 들어온다
  const sunAngle = Math.PI / 4 + (view * Math.PI) / 2 + Math.PI / 2.2;

  function toCell(point: THREE.Vector3) {
    return { cx: Math.floor((point.x + HALF) / CELL), cz: Math.floor((point.z + HALF) / CELL) };
  }

  function startDrag(index: number, e: ThreeEvent<PointerEvent>) {
    e.stopPropagation();
    const p = house.items[index];
    const def = furnitureByKind.get(p.k)!;
    if (isWallItem(def)) {
      // 벽걸이는 가운데를 잡고 끈다
      const f = footprint(def, 0);
      drag.current = { index, dx: Math.floor(f.w / 2), dz: Math.floor(f.d / 2), wall: true };
    } else {
      const { cx, cz } = toCell(e.point);
      drag.current = { index, dx: cx - p.x, dz: cz - p.z, wall: false };
    }
    (e.target as Element | null)?.setPointerCapture?.(e.pointerId);
  }

  function dragMove(e: ThreeEvent<PointerEvent>) {
    const d = drag.current;
    if (!d || d.wall) return;
    const p = house.items[d.index];
    const { cx, cz } = toCell(e.point);
    const nx = cx - d.dx;
    const nz = cz - d.dz;
    if (nx !== p.x || nz !== p.z) onMove?.(d.index, nx, nz);
  }

  function wallDragMove(wall: number, e: ThreeEvent<PointerEvent>) {
    const d = drag.current;
    if (!d?.wall) return;
    const local = e.object.parent!.worldToLocal(e.point.clone());
    const nx = Math.floor((local.x + HALF) / CELL) - d.dx;
    const nz = Math.floor((local.y + WALL_HEIGHT / 2) / CELL) - d.dz;
    const p = house.items[d.index];
    if (nx !== p.x || nz !== p.z || wall !== p.wl) onMove?.(d.index, nx, nz, wall);
  }

  const endDrag = () => (drag.current = null);

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
      <Room
        house={house}
        view={view}
        onWallMove={editable ? wallDragMove : undefined}
        wallChildren={(wall) =>
          house.items.map((p, i) => {
            const def = furnitureByKind.get(p.k);
            if (!def || !isWallItem(def) || p.wl !== wall) return null;
            return (
              <WallItem
                key={`${i}-${p.k}`}
                p={p}
                index={i}
                def={def}
                selected={editable && selected === i}
                bad={editable && selected === i && collides(house.items, i)}
                editable={editable}
                glow={house.light === "night" ? 1.6 : house.light === "sunset" ? 0.6 : 0}
                onSelect={onSelect}
                onDragStart={startDrag}
              />
            );
          })
        }
      />
      {/* 바닥 입력판: 편집 중에는 가구 끌기, 아니면 눌러서 걷기 */}
      <mesh
        rotation-x={-Math.PI / 2}
        position={[0, 0.001, 0]}
        onPointerMove={editable ? dragMove : undefined}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onClick={
          editable
            ? () => onSelect?.(null)
            : onWalk
              ? (e) => {
                  const spot = nearestWalkable(house.items, e.point.x, e.point.z);
                  if (spot) onWalk(spot[0], spot[1]);
                }
              : undefined
        }
      >
        <planeGeometry args={[ROOM_SIZE * 3, ROOM_SIZE * 3]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {house.items.map((p, i) =>
        isWallItem(furnitureByKind.get(p.k)) ? null : (
          <Suspense key={`${i}-${p.k}`} fallback={null}>
            <Furniture p={p} index={i} items={house.items} selected={selected === i} editable={editable} onSelect={onSelect} onDragStart={startDrag} lampI={lampI} />
          </Suspense>
        ),
      )}
      {editable && selected !== null && house.items[selected] && !isWallItem(furnitureByKind.get(house.items[selected].k)) && <SelectionMark items={house.items} index={selected} />}
      {!editable && shown.map((person) => person.pos && <PersonFigure key={person.id} person={person} pos={person.pos} />)}
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
