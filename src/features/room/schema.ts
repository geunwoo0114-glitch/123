import { z } from "zod";

/**
 * 미니룸 구성. 정해진 자리(슬롯)마다 아이템 variant 인덱스만 저장한다.
 * - 0번은 항상 기본(무료) 아이템
 * - 향후 자유 배치/3D로 확장할 때도 "슬롯 → 아이템" 매핑은 그대로 재사용한다.
 */
export const roomSlots = [
  { slot: "wall", label: "벽지", count: 6 },
  { slot: "floor", label: "바닥", count: 5 },
  { slot: "window", label: "창문", count: 4 },
  { slot: "shelf", label: "선반", count: 5 },
  { slot: "deco", label: "벽 장식", count: 5 },
  { slot: "corner", label: "소품", count: 6 },
  { slot: "desk", label: "책상", count: 4 },
  { slot: "rug", label: "러그", count: 4 },
] as const;

export type RoomSlot = (typeof roomSlots)[number]["slot"];
export type RoomConfig = Record<RoomSlot, number>;

export const roomItemNames: Record<RoomSlot, string[]> = {
  wall: ["테마 도트", "줄무늬", "크림", "벽돌", "밤하늘", "꽃무늬"],
  floor: ["테마 바닥", "원목", "체크 타일", "초록 카펫", "대리석"],
  window: ["맑은 낮", "달밤", "노을", "비 오는 날"],
  shelf: ["책과 액자", "LP와 스피커", "트로피", "작은 화분들", "빈 선반"],
  deco: ["없음", "벽시계", "포스터", "전구 가랜드", "사진 액자"],
  corner: ["몬스테라", "스탠드 조명", "기타", "고양이", "책장", "없음"],
  desk: ["원목 책상", "화이트 책상", "다크 책상", "핑크 책상"],
  rug: ["테마 러그", "줄무늬 러그", "무지개 러그", "없음"],
};

const idx = (count: number) => z.number().int().min(0).max(count - 1);

export const roomSchema = z.object(
  Object.fromEntries(roomSlots.map((s) => [s.slot, idx(s.count)])) as { [K in RoomSlot]: ReturnType<typeof idx> },
);

export const defaultRoom: RoomConfig = { wall: 0, floor: 0, window: 0, shelf: 0, deco: 0, corner: 0, desk: 0, rug: 0 };

/** DB JSON → 검증된 구성. 잘못되었거나 없으면 기본 방 */
export function parseRoom(raw: unknown): RoomConfig {
  const r = roomSchema.safeParse(raw);
  return r.success ? r.data : defaultRoom;
}
