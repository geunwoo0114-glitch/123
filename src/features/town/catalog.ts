import { partCounts, type AvatarConfig, type Slot } from "@/features/avatar/schema";

/**
 * 미니미 상점 카탈로그.
 * - itemId = `${slot}:${index}`
 * - 얼굴 파트(눈/눈썹/입/코)와 배경색은 모두 무료 → 누구나 자기 얼굴은 자유롭게
 * - 헤어/의상/안경/손동작/수염/배지는 일부 무료 + 나머지는 밤톨로 구매
 * - 시즌/한정 아이템은 `limited`로 표시하고 판매 기간을 붙이면 된다(향후)
 * 실제 결제는 붙이지 않는다. 밤톨은 미니게임/출석으로만 모은다.
 */
export type ShopSlot = "hair" | "body" | "glasses" | "gesture" | "beard" | "bodyIcon";
export const shopSlots: { slot: ShopSlot; label: string; emoji: string }[] = [
  { slot: "hair", label: "헤어", emoji: "💇" },
  { slot: "body", label: "옷", emoji: "👕" },
  { slot: "glasses", label: "안경", emoji: "👓" },
  { slot: "gesture", label: "손동작", emoji: "👋" },
  { slot: "beard", label: "수염", emoji: "🧔" },
  { slot: "bodyIcon", label: "배지", emoji: "⚡" },
];

export const faceSlots: { slot: Slot; label: string }[] = [
  { slot: "eyes", label: "눈" },
  { slot: "brows", label: "눈썹" },
  { slot: "lips", label: "입" },
  { slot: "nose", label: "코" },
  { slot: "bg", label: "배경색" },
];

export type Rarity = "basic" | "common" | "rare" | "special";
export const rarityLabel: Record<Rarity, string> = { basic: "기본", common: "일반", rare: "레어", special: "스페셜" };
export const rarityPrice: Record<Rarity, number> = { basic: 0, common: 40, rare: 90, special: 180 };

/** 슬롯별 무료(기본) 아이템 인덱스. 0은 '없음'(선택 슬롯) */
const freeIndexes: Record<ShopSlot, number[]> = {
  hair: [1, 2, 3, 5, 8, 11, 14, 20],
  body: [1, 2, 3, 9],
  glasses: [0, 1],
  gesture: [0],
  beard: [0],
  bodyIcon: [0],
};

/** 고정 규칙으로 희귀도를 매겨 카탈로그가 결정적이도록 한다 */
function rarityOf(slot: ShopSlot, index: number): Rarity {
  if (freeIndexes[slot].includes(index)) return "basic";
  if (slot === "hair" && index === 0) return "special"; // 모자
  if (slot === "bodyIcon" || slot === "gesture") return index % 3 === 0 ? "special" : "rare";
  if (index % 7 === 0) return "special";
  if (index % 3 === 0) return "rare";
  return "common";
}

export type ShopItem = { id: string; slot: ShopSlot; index: number; name: string; rarity: Rarity; price: number };

function itemName(slot: ShopSlot, index: number) {
  const label = shopSlots.find((s) => s.slot === slot)!.label;
  if (slot === "hair" && index === 0) return "캡 모자";
  if (index === 0) return `${label} 없음`;
  if (slot === "bodyIcon") return ["", "번개 배지", "토성 배지", "은하 배지"][index];
  return `${label} No.${String(index).padStart(2, "0")}`;
}

export const catalog: ShopItem[] = shopSlots.flatMap(({ slot }) =>
  Array.from({ length: partCounts[slot] }, (_, index) => {
    const rarity = rarityOf(slot, index);
    return { id: `${slot}:${index}`, slot, index, name: itemName(slot, index), rarity, price: rarityPrice[rarity] };
  }),
);

export const itemById = (id: string) => catalog.find((i) => i.id === id);

export function isFreeItem(slot: Slot, index: number): boolean {
  if (!(slot in freeIndexes)) return true; // 얼굴 파트/배경
  return freeIndexes[slot as ShopSlot].includes(index);
}

/** 이 구성을 입을 수 있는지 (모든 유료 파트를 보유했는지) */
export function missingItems(config: AvatarConfig, owned: Set<string>): string[] {
  return shopSlots
    .map(({ slot }) => `${slot}:${config[slot]}`)
    .filter((id) => {
      const [slot, index] = id.split(":");
      return !isFreeItem(slot as Slot, Number(index)) && !owned.has(id);
    });
}
