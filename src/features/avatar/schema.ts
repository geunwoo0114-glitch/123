import { z } from "zod";

/**
 * 미니미(2D 캐릭터) 구성.
 * 그림 에셋: DiceBear "Notionists" (디자이너 Zoish, CC0 1.0) — 상업적 이용/수정 자유.
 * 각 파트는 에셋 variant의 '인덱스'만 저장한다(허용 범위 검증). 0 = 착용 안 함(선택 슬롯).
 *
 * 상점 아이템과 1:1로 대응한다: itemId = `${slot}:${index}` (catalog.ts)
 */
export const partCounts = {
  /** 64종 (0번 = 모자) */
  hair: 64,
  /** 25종 의상 */
  body: 25,
  /** 0=없음, 1~11 */
  glasses: 12,
  /** 0=없음, 1~10 손동작 */
  gesture: 11,
  /** 0=없음, 1~12 */
  beard: 13,
  /** 0=없음, 1~3 옷 배지 */
  bodyIcon: 4,
  brows: 13,
  eyes: 5,
  lips: 30,
  nose: 20,
  bg: 8,
} as const;

export type Slot = keyof typeof partCounts;
export const slots = Object.keys(partCounts) as Slot[];

/** 미니미 배경색 (공간 테마와 어울리는 파스텔) */
export const minimiBackgrounds = ["#FDE9E1", "#FBF0D2", "#DCF2EA", "#E0EDFA", "#ECE5F8", "#FBE4EB", "#E4EEDC", "#EFEAE3"];

const idx = (slot: Slot) => z.number().int().min(0).max(partCounts[slot] - 1);

export const avatarSchema = z.object(
  Object.fromEntries(slots.map((s) => [s, idx(s)])) as { [K in Slot]: ReturnType<typeof idx> },
);

export type AvatarConfig = Record<Slot, number>;

export const defaultAvatar: AvatarConfig = {
  hair: 1, body: 1, glasses: 0, gesture: 0, beard: 0, bodyIcon: 0, brows: 0, eyes: 0, lips: 0, nose: 0, bg: 0,
};

export function parseAvatar(raw: unknown): AvatarConfig | null {
  if (!raw) return null;
  const r = avatarSchema.safeParse(raw);
  return r.success ? r.data : null;
}

/** URL용 짧은 코드: "1-1-0-0-0-0-0-0-0-0-0" */
export function encodeAvatar(c: AvatarConfig): string {
  return slots.map((s) => c[s]).join("-");
}

export function decodeAvatar(code: string): AvatarConfig | null {
  const parts = code.split("-");
  if (parts.length !== slots.length || parts.some((p) => !/^\d{1,2}$/.test(p))) return null;
  return parseAvatar(Object.fromEntries(slots.map((s, i) => [s, Number(parts[i])])));
}

export function minimiUrl(c: AvatarConfig): string {
  return `/minimi/${encodeAvatar(c)}`;
}

/** 시드로 결정적인 랜덤 캐릭터 (가입 직후 기본 미니미 - 무료 아이템 안에서만 고른다) */
export function randomAvatar(seed: string, freeOnly: (slot: Slot, index: number) => boolean = () => true): AvatarConfig {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const next = () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
  const pick = (slot: Slot) => {
    const options = Array.from({ length: partCounts[slot] }, (_, i) => i).filter((i) => freeOnly(slot, i));
    return options[Math.floor(next() * options.length)] ?? 0;
  };
  return {
    hair: pick("hair"),
    body: pick("body"),
    glasses: next() < 0.25 ? pick("glasses") : 0,
    gesture: 0,
    beard: 0,
    bodyIcon: 0,
    brows: pick("brows"),
    eyes: pick("eyes"),
    lips: pick("lips"),
    nose: pick("nose"),
    bg: pick("bg"),
  };
}
