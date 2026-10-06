import { z } from "zod";
import { appConfig } from "@/config/app";

const { limits } = appConfig;

export const visibilitySchema = z.enum(["PUBLIC", "FRIENDS", "CLOSE_FRIENDS", "PRIVATE"]);

/** 본문에서 #태그 추출 (한글/영문/숫자/_) */
export function extractTags(text: string): string[] {
  const tags = new Set<string>();
  for (const m of text.matchAll(/#([\p{L}\p{N}_]{1,20})/gu)) {
    tags.add(m[1].toLowerCase());
    if (tags.size >= limits.tags) break;
  }
  return [...tags];
}

export const moods = [
  { id: "happy", emoji: "😊", label: "행복해요" },
  { id: "calm", emoji: "🌿", label: "평온해요" },
  { id: "excited", emoji: "🤩", label: "설레요" },
  { id: "tired", emoji: "😪", label: "피곤해요" },
  { id: "sad", emoji: "🥲", label: "울적해요" },
  { id: "angry", emoji: "😤", label: "화나요" },
  { id: "love", emoji: "🥰", label: "사랑해요" },
  { id: "thinking", emoji: "🤔", label: "생각 중" },
] as const;
export const moodIds = moods.map((m) => m.id) as [string, ...string[]];
export const moodById = (id: string | null | undefined) => moods.find((m) => m.id === id);

export const postInputSchema = z
  .object({
    body: z.string().trim().max(limits.postBody, `${limits.postBody}자까지 쓸 수 있어요.`),
    mood: z.enum(moodIds).nullable().default(null),
    visibility: visibilitySchema.default("FRIENDS"),
    mediaIds: z.array(z.string().max(40)).max(limits.imagesPerPost, `사진은 ${limits.imagesPerPost}장까지 올릴 수 있어요.`).default([]),
    linkUrl: z
      .string()
      .trim()
      .max(500)
      .optional()
      .transform((v) => v || null)
      .refine((v) => v === null || /^https?:\/\//i.test(v), "http(s) 링크만 붙일 수 있어요."),
  })
  .refine((v) => v.body.length > 0 || v.mediaIds.length > 0, { message: "내용이나 사진을 남겨 주세요.", path: ["body"] });

export const commentInputSchema = z.object({
  postId: z.string().min(1).max(40),
  parentId: z.string().max(40).nullable().default(null),
  body: z.string().trim().min(1, "댓글을 입력해 주세요.").max(limits.commentBody, `${limits.commentBody}자까지 쓸 수 있어요.`),
});
