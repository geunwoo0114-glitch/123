import { z } from "zod";
import { appConfig } from "@/config/app";

/** 방명록 메모지 스티커 (토큰) */
export const guestbookStickers = [
  { id: "tulip", emoji: "🌷", paper: "#FDEBEF" },
  { id: "coffee", emoji: "☕", paper: "#F5EADF" },
  { id: "music", emoji: "🎵", paper: "#E8EEFB" },
  { id: "star", emoji: "⭐", paper: "#FCF3D6" },
  { id: "clover", emoji: "🍀", paper: "#E3F3E6" },
  { id: "cat", emoji: "🐱", paper: "#F1ECE4" },
  { id: "heart", emoji: "💌", paper: "#FCE6E1" },
  { id: "moon", emoji: "🌙", paper: "#ECE8F7" },
] as const;
export const stickerIds = guestbookStickers.map((s) => s.id) as [string, ...string[]];
export const stickerById = (id: string | null | undefined) => guestbookStickers.find((s) => s.id === id) ?? guestbookStickers[5];

export const guestbookInputSchema = z.object({
  hostId: z.string().min(1).max(40),
  body: z.string().trim().min(1, "남길 말을 적어 주세요.").max(appConfig.limits.guestbookBody, `${appConfig.limits.guestbookBody}자까지 쓸 수 있어요.`),
  isSecret: z.boolean().default(false),
  sticker: z.enum(stickerIds).default("cat"),
});

export const guestbookReplySchema = z.object({
  entryId: z.string().min(1).max(40),
  reply: z.string().trim().max(appConfig.limits.guestbookBody),
});
