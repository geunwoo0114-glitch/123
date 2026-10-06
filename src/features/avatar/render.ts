import "server-only";
import { createAvatar } from "@dicebear/core";
import * as notionists from "@dicebear/notionists";
import type { AvatarConfig, Slot } from "./schema";

type Options = notionists.Options;
type Enum<K extends keyof Options> = NonNullable<Options[K]> extends (infer U)[] ? U : never;

/** 에셋 schema의 variant 목록 (오름차순으로 정렬해 인덱스를 안정적으로 유지) */
function variants<K extends keyof Options>(key: K): Enum<K>[] {
  const prop = notionists.schema.properties?.[key as string] as { items?: { enum?: string[] } } | undefined;
  const list = [...(prop?.items?.enum ?? [])];
  // "hat"처럼 이름 있는 항목은 앞으로, variantNN은 번호순
  return list.sort((a, b) => {
    const na = /^variant\d+$/.test(a) ? Number(a.slice(7)) : -1;
    const nb = /^variant\d+$/.test(b) ? Number(b.slice(7)) : -1;
    return na - nb || a.localeCompare(b);
  }) as Enum<K>[];
}

const V = {
  hair: variants("hair"),
  body: variants("body"),
  glasses: variants("glasses"),
  gesture: variants("gesture"),
  beard: variants("beard"),
  bodyIcon: variants("bodyIcon"),
  brows: variants("brows"),
  eyes: variants("eyes"),
  lips: variants("lips"),
  nose: variants("nose"),
};

const optional = (list: string[], i: number) => (i > 0 ? [list[i - 1]] : [list[0]]);

/** 미니미 SVG 문자열 (배경 투명). 입력은 검증된 인덱스만 받는다. */
export function renderMinimiSvg(c: AvatarConfig): string {
  const opts: Options = {
    hair: [V.hair[c.hair]],
    body: [V.body[c.body]],
    glasses: optional(V.glasses, c.glasses) as Options["glasses"],
    glassesProbability: c.glasses > 0 ? 100 : 0,
    gesture: optional(V.gesture, c.gesture) as Options["gesture"],
    gestureProbability: c.gesture > 0 ? 100 : 0,
    beard: optional(V.beard, c.beard) as Options["beard"],
    beardProbability: c.beard > 0 ? 100 : 0,
    bodyIcon: optional(V.bodyIcon, c.bodyIcon) as Options["bodyIcon"],
    bodyIconProbability: c.bodyIcon > 0 ? 100 : 0,
    brows: [V.brows[c.brows]],
    eyes: [V.eyes[c.eyes]],
    lips: [V.lips[c.lips]],
    nose: [V.nose[c.nose]],
  };
  return createAvatar(notionists, { ...opts, seed: "darak" }).toString();
}

export const variantCounts: Partial<Record<Slot, number>> = Object.fromEntries(Object.entries(V).map(([k, v]) => [k, v.length]));
