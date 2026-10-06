"use client";

import { useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Billboard, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { RoomConfig } from "@/features/room/schema";

/**
 * 3D 미니룸 (React Three Fiber).
 * 2D 미니룸과 같은 RoomConfig(슬롯 → 아이템 인덱스)를 그대로 3D로 그린다.
 * 가구는 가벼운 기본 도형으로 만들어 모바일에서도 부드럽게 돌아가게 했다.
 * 향후 glTF 가구 모델/자유 배치/친구 아바타 방문(멀티플레이)으로 확장하는 자리.
 */
type Colors = { accent: string; soft: string };

const W = 6; // 방 한 변
const H = 3.4; // 벽 높이

function canvasTexture(draw: (ctx: CanvasRenderingContext2D, size: number) => void, repeat = 1) {
  const size = 256;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  draw(ctx, size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function mix(a: string, b: string, t: number) {
  return "#" + new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString();
}

function useWallMaterial(v: number, c: Colors) {
  return useMemo(() => {
    switch (v) {
      case 1:
        return { map: canvasTexture((x, s) => { x.fillStyle = "#FBF6EE"; x.fillRect(0, 0, s, s); x.fillStyle = mix(c.accent, "#ffffff", 0.75); for (let i = 0; i < s; i += 32) x.fillRect(i, 0, 16, s); }, 3) };
      case 2:
        return { color: "#F6EFE3" };
      case 3:
        return { map: canvasTexture((x, s) => { x.fillStyle = "#B8664A"; x.fillRect(0, 0, s, s); x.fillStyle = "#D98A6C"; for (let r = 0; r < 8; r++) for (let k = -1; k < 5; k++) x.fillRect(k * 64 + (r % 2 ? 32 : 0) + 2, r * 32 + 2, 60, 28); }, 2) };
      case 4:
        return { map: canvasTexture((x, s) => { x.fillStyle = "#22264A"; x.fillRect(0, 0, s, s); x.fillStyle = "#FFF4C2"; for (let i = 0; i < 40; i++) { x.beginPath(); x.arc((i * 97) % s, (i * 57) % s, i % 4 ? 1.5 : 2.6, 0, Math.PI * 2); x.fill(); } }, 2) };
      case 5:
        return { map: canvasTexture((x, s) => { x.fillStyle = "#FDF3F1"; x.fillRect(0, 0, s, s); x.fillStyle = mix(c.accent, "#ffffff", 0.55); for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) { x.beginPath(); x.arc(k * 64 + (r % 2 ? 32 : 0) + 16, r * 64 + 32, 9, 0, Math.PI * 2); x.fill(); } }, 3) };
      default:
        return { color: c.soft };
    }
  }, [v, c.accent, c.soft]);
}

function useFloorMaterial(v: number, c: Colors) {
  return useMemo(() => {
    switch (v) {
      case 1:
        return { map: canvasTexture((x, s) => { x.fillStyle = "#C99A6B"; x.fillRect(0, 0, s, s); x.strokeStyle = "#A9794C"; x.lineWidth = 3; for (let i = 0; i <= s; i += 42) { x.beginPath(); x.moveTo(0, i); x.lineTo(s, i); x.stroke(); } }, 2) };
      case 2:
        return { map: canvasTexture((x) => { for (let r = 0; r < 8; r++) for (let k = 0; k < 8; k++) { x.fillStyle = (r + k) % 2 ? "#2E2A26" : "#F4EFE6"; x.fillRect(k * 32, r * 32, 32, 32); } }, 2) };
      case 3:
        return { color: "#7FA77A" };
      case 4:
        return { color: "#EDEAE6", roughness: 0.25 };
      default:
        return { color: mix(c.accent, "#ffffff", 0.7) };
    }
  }, [v, c.accent]);
}

function Box(props: { args: [number, number, number]; position: [number, number, number]; color: string; rotation?: [number, number, number] }) {
  return (
    <mesh position={props.position} rotation={props.rotation} castShadow receiveShadow>
      <boxGeometry args={props.args} />
      <meshStandardMaterial color={props.color} />
    </mesh>
  );
}

function Window({ v }: { v: number }) {
  const sky = ["#BFE0F5", "#2B3166", "#F6B48C", "#9AA7B5"][v] ?? "#BFE0F5";
  return (
    <group position={[-1.4, 2, -W / 2 + 0.02]}>
      <Box args={[1.5, 1.2, 0.06]} position={[0, 0, 0]} color="#ffffff" />
      <mesh position={[0, 0, 0.04]}>
        <planeGeometry args={[1.32, 1.02]} />
        <meshBasicMaterial color={sky} />
      </mesh>
      {v === 1 && (
        <mesh position={[0.35, 0.25, 0.05]}>
          <circleGeometry args={[0.12, 24]} />
          <meshBasicMaterial color="#FFF4C2" />
        </mesh>
      )}
      {v !== 1 && v !== 3 && (
        <mesh position={[0.35, 0.25, 0.05]}>
          <circleGeometry args={[0.13, 24]} />
          <meshBasicMaterial color={v === 2 ? "#FF8A5B" : "#FFE29A"} />
        </mesh>
      )}
      <Box args={[0.05, 1.05, 0.08]} position={[0, 0, 0.05]} color="#ffffff" />
      <Box args={[1.35, 0.05, 0.08]} position={[0, 0, 0.05]} color="#ffffff" />
    </group>
  );
}

function Shelf({ v, c }: { v: number; c: Colors }) {
  const books = ["#2E2A26", c.accent, "#E3B23C", "#5E8C6A", "#2F78C4"];
  return (
    <group position={[1.4, 2.1, -W / 2 + 0.2]}>
      <Box args={[1.6, 0.06, 0.35]} position={[0, 0, 0]} color="#B98B62" />
      {v === 0 && books.slice(1, 4).map((col, i) => <Box key={i} args={[0.14, 0.42 - i * 0.05, 0.25]} position={[-0.6 + i * 0.18, 0.24 - i * 0.025, 0]} color={col} />)}
      {v === 0 && <Box args={[0.45, 0.4, 0.04]} position={[0.4, 0.23, -0.05]} color="#ffffff" />}
      {v === 1 && (
        <>
          {books.map((col, i) => <Box key={i} args={[0.04, 0.38, 0.32]} position={[-0.7 + i * 0.06, 0.22, 0]} color={col} />)}
          <Box args={[0.35, 0.5, 0.3]} position={[0.4, 0.28, 0]} color="#3B3632" />
        </>
      )}
      {v === 2 && [-0.5, 0, 0.5].map((x) => (
        <group key={x} position={[x, 0.2, 0]}>
          <mesh castShadow><cylinderGeometry args={[0.12, 0.05, 0.22, 16]} /><meshStandardMaterial color="#E3B23C" metalness={0.6} roughness={0.3} /></mesh>
          <Box args={[0.18, 0.06, 0.18]} position={[0, -0.14, 0]} color="#8C5A35" />
        </group>
      ))}
      {v === 3 && [-0.5, 0, 0.5].map((x, i) => (
        <group key={x} position={[x, 0.15, 0]}>
          <mesh castShadow><cylinderGeometry args={[0.1, 0.08, 0.2, 16]} /><meshStandardMaterial color={["#C98A5E", "#E9E3DA", c.accent][i]} /></mesh>
          <mesh position={[0, 0.2, 0]} castShadow><sphereGeometry args={[0.14, 16, 16]} /><meshStandardMaterial color="#5E8C6A" /></mesh>
        </group>
      ))}
    </group>
  );
}

function Deco({ v, c }: { v: number; c: Colors }) {
  const x = -W / 2 + 0.03;
  switch (v) {
    case 1:
      return (
        <group position={[x, 2.2, 0.6]} rotation={[0, Math.PI / 2, 0]}>
          <mesh><cylinderGeometry args={[0.3, 0.3, 0.05, 32]} /><meshStandardMaterial color="#ffffff" /></mesh>
          <Box args={[0.03, 0.2, 0.02]} position={[0, 0.08, 0.04]} color="#2E2A26" rotation={[Math.PI / 2, 0, 0]} />
        </group>
      );
    case 2:
      return (
        <mesh position={[x, 2, 0.6]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[0.9, 1.2]} />
          <meshStandardMaterial color={c.accent} />
        </mesh>
      );
    case 3:
      return (
        <group>
          {Array.from({ length: 14 }, (_, i) => (
            <mesh key={i} position={[-W / 2 + 0.3 + i * 0.4, H - 0.25 - Math.sin((i / 13) * Math.PI) * 0.18, -W / 2 + 0.08]}>
              <sphereGeometry args={[0.06, 12, 12]} />
              <meshStandardMaterial color={["#FFD166", "#EF8A62", "#7FC8A9", "#A5B4FC"][i % 4]} emissive={["#FFD166", "#EF8A62", "#7FC8A9", "#A5B4FC"][i % 4]} emissiveIntensity={0.6} />
            </mesh>
          ))}
        </group>
      );
    case 4:
      return (
        <group position={[x, 2, 0.6]} rotation={[0, Math.PI / 2, 0]}>
          <Box args={[0.8, 0.8, 0.05]} position={[0, 0, 0]} color="#B98B62" />
          <mesh position={[0, 0, 0.03]}><planeGeometry args={[0.62, 0.62]} /><meshStandardMaterial color={c.soft} /></mesh>
        </group>
      );
    default:
      return null;
  }
}

function Corner({ v, c }: { v: number; c: Colors }) {
  const p: [number, number, number] = [-2.3, 0, -1.8];
  switch (v) {
    case 1:
      return (
        <group position={p}>
          <mesh position={[0, 0.9, 0]} castShadow><cylinderGeometry args={[0.03, 0.03, 1.8, 8]} /><meshStandardMaterial color="#6A625A" /></mesh>
          <mesh position={[0, 1.85, 0]}><coneGeometry args={[0.28, 0.3, 24, 1, true]} /><meshStandardMaterial color="#F6E7B8" side={THREE.DoubleSide} emissive="#FFE9A8" emissiveIntensity={0.4} /></mesh>
          <pointLight position={[0, 1.7, 0]} intensity={1.2} distance={4} color="#FFE2A6" />
        </group>
      );
    case 2:
      return (
        <group position={p} rotation={[0, 0.5, -0.25]}>
          <mesh position={[0, 0.35, 0]} scale={[1, 1.2, 0.4]} castShadow><sphereGeometry args={[0.3, 20, 20]} /><meshStandardMaterial color="#C98A5E" /></mesh>
          <mesh position={[0, 0.75, 0]} scale={[1, 1, 0.4]} castShadow><sphereGeometry args={[0.22, 20, 20]} /><meshStandardMaterial color="#C98A5E" /></mesh>
          <Box args={[0.07, 0.8, 0.05]} position={[0, 1.3, 0]} color="#8C5A35" />
        </group>
      );
    case 3:
      return (
        <group position={[-1.8, 0, 0.6]}>
          <mesh position={[0, 0.25, 0]} scale={[1.3, 0.8, 0.9]} castShadow><sphereGeometry args={[0.3, 20, 20]} /><meshStandardMaterial color="#F2B880" /></mesh>
          <mesh position={[0.33, 0.48, 0]} castShadow><sphereGeometry args={[0.2, 20, 20]} /><meshStandardMaterial color="#F2B880" /></mesh>
          {[-0.08, 0.08].map((z) => (
            <mesh key={z} position={[0.38, 0.68, z]} rotation={[0, 0, -0.2]}><coneGeometry args={[0.06, 0.14, 8]} /><meshStandardMaterial color="#F2B880" /></mesh>
          ))}
          <mesh position={[-0.15, 0.03, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.5, 0.5, 0.04, 24]} /><meshStandardMaterial color={c.accent} /></mesh>
        </group>
      );
    case 4:
      return (
        <group position={[-2.6, 0, -1.2]}>
          <Box args={[0.5, 2.2, 1.2]} position={[0, 1.1, 0]} color="#B98B62" />
          {[0.5, 1.2, 1.9].map((y, r) =>
            [0, 1, 2, 3, 4].map((i) => <Box key={`${r}-${i}`} args={[0.3, 0.42 - (i % 2) * 0.08, 0.12]} position={[0.12, y + 0.05, -0.4 + i * 0.2]} color={[c.accent, "#E3B23C", "#5E8C6A", "#2F78C4", "#CF4D72"][(i + r) % 5]} />),
          )}
        </group>
      );
    case 5:
      return null;
    default:
      return (
        <group position={p}>
          <mesh position={[0, 0.25, 0]} castShadow><cylinderGeometry args={[0.25, 0.2, 0.5, 20]} /><meshStandardMaterial color="#C98A5E" /></mesh>
          {[[0, 0.85, 0], [0.2, 0.7, 0.1], [-0.2, 0.75, -0.05], [0.05, 1.05, -0.15]].map((pos, i) => (
            <mesh key={i} position={pos as [number, number, number]} castShadow><sphereGeometry args={[0.28, 16, 16]} /><meshStandardMaterial color="#4F8A5B" /></mesh>
          ))}
        </group>
      );
  }
}

function Rug({ v, c }: { v: number; c: Colors }) {
  if (v === 3) return null;
  const rings = v === 2 ? ["#EF8A62", "#FFD166", "#7FC8A9", "#A5B4FC"] : v === 1 ? ["#ffffff", c.accent, "#ffffff"] : [mix(c.accent, "#ffffff", 0.45)];
  return (
    <group position={[0.2, 0.01, 0.6]}>
      {rings.map((col, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, i * 0.002, 0]} receiveShadow>
          <circleGeometry args={[1.8 - i * 0.35, 48]} />
          <meshStandardMaterial color={col} />
        </mesh>
      ))}
    </group>
  );
}

function Desk({ v }: { v: number }) {
  const [top, legs] = ([["#D6AE84", "#B98B62"], ["#F4F1EC", "#D9D3CA"], ["#4A3F36", "#2E2722"], ["#F6C6CF", "#E6A3B1"]] as const)[v] ?? ["#D6AE84", "#B98B62"];
  return (
    <group position={[0.2, 0, 0.3]}>
      <Box args={[2.2, 0.08, 0.9]} position={[0, 0.85, 0]} color={top} />
      {[[-1, -0.38], [1, -0.38], [-1, 0.38], [1, 0.38]].map(([x, z], i) => <Box key={i} args={[0.07, 0.85, 0.07]} position={[x, 0.42, z]} color={legs} />)}
      {v === 0 && <mesh position={[0.75, 0.97, 0.15]} castShadow><cylinderGeometry args={[0.08, 0.07, 0.16, 16]} /><meshStandardMaterial color="#ffffff" /></mesh>}
      {v === 1 && (
        <group position={[0.6, 0.9, 0.1]}>
          <Box args={[0.6, 0.02, 0.4]} position={[0, 0, 0]} color="#B9BEC6" />
          <Box args={[0.6, 0.38, 0.02]} position={[0, 0.19, -0.2]} color="#B9BEC6" rotation={[-0.2, 0, 0]} />
        </group>
      )}
      {v === 2 && (
        <group position={[0.7, 0.97, 0.15]}>
          <mesh castShadow><cylinderGeometry args={[0.18, 0.18, 0.16, 24]} /><meshStandardMaterial color="#FBE4EB" /></mesh>
          <mesh position={[0, 0.14, 0]}><cylinderGeometry args={[0.01, 0.01, 0.12, 8]} /><meshStandardMaterial color="#F2C14E" emissive="#EF8A62" emissiveIntensity={0.8} /></mesh>
        </group>
      )}
      {v === 3 && (
        <group position={[0.7, 0.89, 0.15]}>
          <mesh position={[0, 0.12, 0]} castShadow><cylinderGeometry args={[0.07, 0.1, 0.24, 16]} /><meshStandardMaterial color="#ffffff" /></mesh>
          {[[-0.06, 0.32, 0], [0.06, 0.35, 0.03], [0, 0.3, -0.06]].map((pp, i) => (
            <mesh key={i} position={pp as [number, number, number]}><sphereGeometry args={[0.07, 12, 12]} /><meshStandardMaterial color={i === 1 ? "#F2C14E" : "#F6A6B6"} /></mesh>
          ))}
        </group>
      )}
    </group>
  );
}

function Minimi({ url }: { url: string }) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    let alive = true;
    new THREE.TextureLoader().load(url, (t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      if (alive) setTexture(t);
    });
    return () => {
      alive = false;
    };
  }, [url]);
  if (!texture) return null;
  return (
    <Billboard position={[0.2, 1.35, -0.35]} lockX lockZ>
      <mesh>
        <planeGeometry args={[1.7, 1.7]} />
        <meshBasicMaterial map={texture} transparent alphaTest={0.05} />
      </mesh>
    </Billboard>
  );
}

function Room({ room, colors, minimiUrl }: { room: RoomConfig; colors: Colors; minimiUrl: string | null }) {
  const wall = useWallMaterial(room.wall, colors);
  const floor = useFloorMaterial(room.floor, colors);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[W, W]} />
        <meshStandardMaterial {...floor} />
      </mesh>
      <mesh position={[0, H / 2, -W / 2]} receiveShadow>
        <planeGeometry args={[W, H]} />
        <meshStandardMaterial {...wall} />
      </mesh>
      <mesh position={[-W / 2, H / 2, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[W, H]} />
        <meshStandardMaterial {...wall} />
      </mesh>
      <Window v={room.window} />
      <Shelf v={room.shelf} c={colors} />
      <Deco v={room.deco} c={colors} />
      <Rug v={room.rug} c={colors} />
      <Corner v={room.corner} c={colors} />
      {minimiUrl && <Minimi url={minimiUrl} />}
      <Desk v={room.desk} />
    </group>
  );
}

export default function Room3D({ room, colors, minimiUrl, label }: { room: RoomConfig; colors: Colors; minimiUrl: string | null; label: string }) {
  const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      frameloop="demand"
      camera={{ position: [5.2, 4.2, 6.2], fov: 38 }}
      aria-label={label}
      role="img"
      gl={{ antialias: true, preserveDrawingBuffer: false }}
    >
      <color attach="background" args={[mix(colors.soft, "#ffffff", 0.3)]} />
      <ambientLight intensity={0.55} />
      <hemisphereLight args={["#ffffff", "#d9cbb8", 0.9]} />
      <directionalLight position={[4, 7, 5]} intensity={1.4} castShadow shadow-mapSize={[1024, 1024]} />
      <Room room={room} colors={colors} minimiUrl={minimiUrl} />
      <OrbitControls
        target={[0, 1.2, 0]}
        enablePan={false}
        minDistance={5}
        maxDistance={11}
        minPolarAngle={0.5}
        maxPolarAngle={1.35}
        minAzimuthAngle={-0.15}
        maxAzimuthAngle={1.35}
        autoRotate={!reduced}
        autoRotateSpeed={0.4}
        enableDamping
      />
    </Canvas>
  );
}
