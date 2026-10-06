import { z } from "zod";
import { josa } from "@/lib/josa";

/**
 * 2.5D 집 (아이소메트릭 방).
 * 방 바닥은 CELL 크기의 칸으로 나뉘고, 가구는 '차지하는 칸(발자국)'의 왼쪽 위 칸 좌표(x, z)로 저장한다.
 * 회전(r)은 90° 단위(0~3)이고, 1·3이면 발자국의 가로/세로가 바뀐다.
 *
 * 가구 층(layer)
 * - floor: 바닥에 놓는 큰 가구. 서로 겹칠 수 없다.
 * - rug:   러그. 다른 가구 밑에 깔 수 있고 러그끼리만 겹칠 수 없다.
 * - top:   작은 소품. 책상·테이블 같은 '받침(surface)' 위에 올리면 그 위에 놓이고, 아니면 바닥에 놓인다.
 *          소품끼리는 겹칠 수 없고, 받침이 아닌 큰 가구와도 겹칠 수 없다.
 *
 * 모델: Kenney Furniture Kit (CC0) — public/house/models/*.glb
 */

export const CELL = 0.25;
export const GRID = 14; // 14칸 × 0.25 = 3.5 (방 한 변)
export const ROOM_SIZE = GRID * CELL;
export const WALL_HEIGHT = 1.45;
export const MAX_ITEMS = 40;
/** 같은 가구를 몇 개까지 놓을 수 있나 (한 번 사면 이만큼) */
export const MAX_PER_KIND = 4;

export type Layer = "floor" | "rug" | "top";
export type FurnitureCategory = "bed" | "living" | "study" | "kitchen" | "deco";

export type FurnitureDef = {
  kind: string;
  name: string;
  category: FurnitureCategory;
  /** 모델 실제 크기 (가로 x, 높이 y, 세로 z) */
  size: [number, number, number];
  layer: Layer;
  /** 소품을 올려 둘 수 있는 받침 (높이 = size[1]) */
  surface?: boolean;
  /** 색을 바꿀 수 있는 재질 이름 (Kenney 모델의 'carpet' 계열) */
  tint?: string[];
  /** 스스로 빛나는 조명 */
  light?: { y: number; color: string };
  price: number;
};

const T = ["carpet", "carpetDarker"];

export const furniture: FurnitureDef[] = [
  // 침실
  { kind: "bedSingle", name: "싱글 침대", category: "bed", size: [1.62, 0.51, 1.89], layer: "floor", tint: T, price: 0 },
  { kind: "bedDouble", name: "더블 침대", category: "bed", size: [1.62, 0.51, 1.91], layer: "floor", tint: T, price: 120 },
  { kind: "bedBunk", name: "2층 침대", category: "bed", size: [1.62, 0.98, 1.89], layer: "floor", tint: T, price: 160 },
  { kind: "pillow", name: "쿠션", category: "bed", size: [0.23, 0.22, 0.09], layer: "top", tint: T, price: 20 },
  { kind: "bear", name: "곰인형", category: "bed", size: [0.39, 0.45, 0.25], layer: "top", price: 60 },
  { kind: "coatRackStanding", name: "옷걸이", category: "bed", size: [0.27, 0.77, 0.27], layer: "floor", price: 40 },
  // 거실
  { kind: "loungeSofa", name: "2인 소파", category: "living", size: [0.98, 0.46, 0.41], layer: "floor", tint: T, price: 0 },
  { kind: "loungeSofaLong", name: "코너 소파", category: "living", size: [0.98, 0.46, 0.82], layer: "floor", tint: T, price: 140 },
  { kind: "loungeDesignSofa", name: "디자인 소파", category: "living", size: [1.12, 0.4, 0.41], layer: "floor", tint: ["carpetBlue"], price: 150 },
  { kind: "loungeChair", name: "1인 라운지 체어", category: "living", size: [0.49, 0.46, 0.41], layer: "floor", tint: T, price: 60 },
  { kind: "tableCoffee", name: "커피 테이블", category: "living", size: [0.66, 0.23, 0.4], layer: "floor", surface: true, price: 0 },
  { kind: "tableRound", name: "원형 테이블", category: "living", size: [0.69, 0.37, 0.8], layer: "floor", surface: true, price: 70 },
  { kind: "sideTable", name: "협탁", category: "living", size: [0.53, 0.38, 0.22], layer: "floor", surface: true, price: 30 },
  { kind: "cabinetTelevision", name: "TV 장", category: "living", size: [0.8, 0.31, 0.25], layer: "floor", surface: true, price: 60 },
  { kind: "televisionModern", name: "TV", category: "living", size: [0.68, 0.45, 0.13], layer: "top", price: 110 },
  { kind: "rugRound", name: "원형 러그", category: "living", size: [0.92, 0.01, 0.92], layer: "rug", tint: T, price: 0 },
  { kind: "rugRectangle", name: "사각 러그", category: "living", size: [1.57, 0.01, 0.92], layer: "rug", tint: T, price: 50 },
  // 작업
  { kind: "desk", name: "책상", category: "study", size: [0.73, 0.38, 0.56], layer: "floor", surface: true, price: 0 },
  { kind: "deskCorner", name: "코너 책상", category: "study", size: [0.97, 0.38, 1.15], layer: "floor", surface: true, price: 90 },
  { kind: "chairDesk", name: "의자", category: "study", size: [0.48, 0.42, 0.44], layer: "floor", tint: T, price: 0 },
  { kind: "laptop", name: "노트북", category: "study", size: [0.6, 0.37, 0.55], layer: "top", price: 80 },
  { kind: "computerScreen", name: "모니터", category: "study", size: [0.39, 0.29, 0.1], layer: "top", price: 70 },
  { kind: "bookcaseOpen", name: "책장", category: "study", size: [0.4, 0.88, 0.25], layer: "floor", price: 0 },
  { kind: "bookcaseClosedWide", name: "넓은 수납장", category: "study", size: [0.8, 0.79, 0.25], layer: "floor", surface: true, price: 70 },
  { kind: "radio", name: "라디오", category: "study", size: [0.32, 0.23, 0.1], layer: "top", price: 40 },
  { kind: "speaker", name: "스피커", category: "study", size: [0.15, 0.64, 0.15], layer: "floor", price: 50 },
  // 주방·생활
  { kind: "kitchenFridge", name: "냉장고", category: "kitchen", size: [0.43, 0.92, 0.32], layer: "floor", price: 100 },
  { kind: "kitchenCoffeeMachine", name: "커피 머신", category: "kitchen", size: [0.27, 0.3, 0.33], layer: "top", price: 50 },
  { kind: "stoolBar", name: "바 스툴", category: "kitchen", size: [0.27, 0.43, 0.23], layer: "floor", tint: T, price: 30 },
  { kind: "washer", name: "세탁기", category: "kitchen", size: [0.39, 0.5, 0.48], layer: "floor", surface: true, price: 90 },
  { kind: "bathtub", name: "욕조", category: "kitchen", size: [1.19, 0.42, 0.56], layer: "floor", price: 130 },
  { kind: "trashcan", name: "휴지통", category: "kitchen", size: [0.5, 0.91, 0.44], layer: "floor", price: 20 },
  // 소품
  { kind: "pottedPlant", name: "화분", category: "deco", size: [0.25, 0.54, 0.29], layer: "floor", price: 0 },
  { kind: "plantSmall1", name: "작은 화분", category: "deco", size: [0.19, 0.28, 0.19], layer: "top", price: 20 },
  { kind: "plantSmall2", name: "다육이", category: "deco", size: [0.19, 0.28, 0.19], layer: "top", price: 20 },
  { kind: "lampRoundFloor", name: "스탠드 조명", category: "deco", size: [0.15, 0.86, 0.18], layer: "floor", light: { y: 0.8, color: "#ffd59a" }, price: 0 },
  { kind: "cardboardBoxOpen", name: "이삿짐 상자", category: "deco", size: [0.37, 0.28, 0.21], layer: "floor", price: 10 },
];

export const furnitureByKind = new Map(furniture.map((f) => [f.kind, f]));
export const categoryLabels: Record<FurnitureCategory, string> = { bed: "침실", living: "거실", study: "작업", kitchen: "주방·생활", deco: "소품" };

export const houseItemId = (kind: string) => `house.${kind}`;
export const isFreeFurniture = (kind: string) => furnitureByKind.get(kind)?.price === 0;

/* ───────── 벽·바닥·조명 ───────── */

export const wallStyles = [
  { name: "라벤더", color: "#e9e3fb", trim: "#cfc4f2" },
  { name: "크림", color: "#f6efe3", trim: "#e2d4bd" },
  { name: "민트", color: "#dff1ea", trim: "#b9ddcf" },
  { name: "피치", color: "#fbe6dc", trim: "#efc5b2" },
  { name: "하늘", color: "#e1eefb", trim: "#bdd5ef" },
  { name: "밤하늘", color: "#2c2f55", trim: "#1f2140" },
] as const;

export const floorStyles = [
  { name: "오크 원목", base: "#d7a873", line: "#b88552" },
  { name: "월넛 원목", base: "#8a5a3b", line: "#6d4329" },
  { name: "화이트 타일", base: "#f1eee9", line: "#d9d3ca" },
  { name: "핑크 카펫", base: "#f1cfd6", line: "#e6b9c2" },
  { name: "헤링본", base: "#c99467", line: "#a8744a" },
] as const;

export const lightModes = [
  { id: "day", name: "맑은 낮" },
  { id: "sunset", name: "노을" },
  { id: "night", name: "밤" },
] as const;
export type LightMode = (typeof lightModes)[number]["id"];

/** 러그·쿠션 등 천 재질 색 (0 = 원래 색) */
export const tintColors = [
  { name: "기본", color: null },
  { name: "라벤더", color: "#b9a6ee" },
  { name: "로즈", color: "#eda3b4" },
  { name: "민트", color: "#94d3bd" },
  { name: "버터", color: "#f3d98b" },
  { name: "스카이", color: "#9cc6ee" },
  { name: "차콜", color: "#55575f" },
] as const;

/* ───────── 구성 ───────── */

const placementSchema = z.object({
  k: z.string().max(40),
  x: z.number().int().min(0).max(GRID - 1),
  z: z.number().int().min(0).max(GRID - 1),
  r: z.number().int().min(0).max(3),
  c: z.number().int().min(0).max(tintColors.length - 1).default(0),
});
export type Placement = z.infer<typeof placementSchema>;

export const houseSchema = z.object({
  wall: z.number().int().min(0).max(wallStyles.length - 1),
  floor: z.number().int().min(0).max(floorStyles.length - 1),
  light: z.enum(["day", "sunset", "night"]),
  items: z.array(placementSchema).max(MAX_ITEMS),
});
export type HouseConfig = z.infer<typeof houseSchema>;

/** 처음 집: 무료 가구로 꾸민 아늑한 원룸 */
export const defaultHouse: HouseConfig = {
  wall: 0,
  floor: 0,
  light: "sunset",
  items: [
    { k: "bedSingle", x: 0, z: 0, r: 0, c: 1 },
    { k: "lampRoundFloor", x: 7, z: 0, r: 0, c: 0 },
    { k: "bookcaseOpen", x: 8, z: 0, r: 0, c: 0 },
    { k: "desk", x: 11, z: 0, r: 0, c: 0 },
    { k: "chairDesk", x: 11, z: 3, r: 2, c: 0 },
    { k: "pottedPlant", x: 13, z: 6, r: 0, c: 0 },
    { k: "rugRound", x: 6, z: 7, r: 0, c: 1 },
    { k: "tableCoffee", x: 7, z: 8, r: 0, c: 0 },
    { k: "loungeSofa", x: 6, z: 12, r: 2, c: 2 },
  ],
};

/** 회전을 반영한 발자국 (칸 수) */
export function footprint(def: Pick<FurnitureDef, "size">, r: number): { w: number; d: number } {
  const w = Math.max(1, Math.ceil(def.size[0] / CELL - 0.15));
  const d = Math.max(1, Math.ceil(def.size[2] / CELL - 0.15));
  return r % 2 === 0 ? { w, d } : { w: d, d: w };
}

type Rect = { x0: number; z0: number; x1: number; z1: number };
function rectOf(p: Placement, def: FurnitureDef): Rect {
  const f = footprint(def, p.r);
  return { x0: p.x, z0: p.z, x1: p.x + f.w, z1: p.z + f.d };
}
const overlaps = (a: Rect, b: Rect) => a.x0 < b.x1 && b.x0 < a.x1 && a.z0 < b.z1 && b.z0 < a.z1;

export function inBounds(p: Placement, def: FurnitureDef) {
  const r = rectOf(p, def);
  return r.x0 >= 0 && r.z0 >= 0 && r.x1 <= GRID && r.z1 <= GRID;
}

/** 소품이 올라갈 받침 (겹치는 받침 중 가장 높은 것) */
export function supportOf(items: Placement[], index: number): FurnitureDef | null {
  const p = items[index];
  const def = furnitureByKind.get(p.k);
  if (!def || def.layer !== "top") return null;
  const me = rectOf(p, def);
  let best: FurnitureDef | null = null;
  items.forEach((o, i) => {
    if (i === index) return;
    const od = furnitureByKind.get(o.k);
    if (!od?.surface || !overlaps(me, rectOf(o, od))) return;
    if (!best || od.size[1] > best.size[1]) best = od;
  });
  return best;
}

/** 가구의 바닥 높이 (받침 위 소품이면 받침 높이) */
export const elevationOf = (items: Placement[], index: number) => supportOf(items, index)?.size[1] ?? 0;

/** index번 가구가 다른 가구와 놓일 수 없게 겹치는지 */
export function collides(items: Placement[], index: number): boolean {
  const p = items[index];
  const def = furnitureByKind.get(p.k);
  if (!def) return true;
  const me = rectOf(p, def);
  return items.some((o, i) => {
    if (i === index) return false;
    const od = furnitureByKind.get(o.k);
    if (!od || !overlaps(me, rectOf(o, od))) return false;
    if (def.layer === "rug" || od.layer === "rug") return def.layer === od.layer;
    if (def.layer === "top" && od.layer === "top") return true;
    // 소품은 받침 위에만 겹칠 수 있다
    if (def.layer === "top") return !od.surface;
    if (od.layer === "top") return !def.surface;
    return true;
  });
}

/** 저장 전 검증. 문제가 있으면 사용자에게 보여줄 문장을 돌려준다. */
export function validateHouse(h: HouseConfig, owned: Set<string>): string | null {
  const counts = new Map<string, number>();
  for (let i = 0; i < h.items.length; i++) {
    const p = h.items[i];
    const def = furnitureByKind.get(p.k);
    if (!def) return "알 수 없는 가구가 있어요.";
    if (def.price > 0 && !owned.has(houseItemId(def.kind))) return `${josa(def.name, "은", "는")} 아직 갖고 있지 않아요. 먼저 구매해 주세요.`;
    if (p.c !== 0 && !def.tint) return `${josa(def.name, "은", "는")} 색을 바꿀 수 없어요.`;
    const n = (counts.get(p.k) ?? 0) + 1;
    if (n > MAX_PER_KIND) return `${josa(def.name, "은", "는")} ${MAX_PER_KIND}개까지 놓을 수 있어요.`;
    counts.set(p.k, n);
    if (!inBounds(p, def)) return `${josa(def.name, "이", "가")} 방 밖으로 나갔어요.`;
    if (collides(h.items, i)) return `${josa(def.name, "이", "가")} 다른 가구와 겹쳐요.`;
  }
  return null;
}

/** DB JSON → 검증된 구성. 잘못되었거나 없으면 기본 집 */
export function parseHouse(raw: unknown): HouseConfig {
  const r = houseSchema.safeParse(raw);
  if (!r.success) return defaultHouse;
  // 카탈로그에서 빠진 가구는 조용히 제외한다
  return { ...r.data, items: r.data.items.filter((p) => furnitureByKind.has(p.k)) };
}

/** 빈 자리 찾기 (새 가구를 놓을 때) */
export function findFreeSpot(items: Placement[], kind: string): Placement | null {
  const def = furnitureByKind.get(kind);
  if (!def) return null;
  for (let z = 0; z < GRID; z++)
    for (let x = 0; x < GRID; x++) {
      const p: Placement = { k: kind, x, z, r: 0, c: 0 };
      const next = [...items, p];
      if (inBounds(p, def) && !collides(next, next.length - 1)) return p;
    }
  return null;
}
