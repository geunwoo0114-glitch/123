import { z } from "zod";
import { appConfig } from "@/config/app";
import { visibilitySchema } from "@/features/posts/schemas";

const { limits } = appConfig;

export const albumInputSchema = z.object({
  title: z.string().trim().min(1, "앨범 이름을 입력해 주세요.").max(limits.albumTitle),
  description: z.string().trim().max(limits.albumDescription).default(""),
  visibility: visibilitySchema.default("FRIENDS"),
});

export const addPhotosSchema = z.object({
  albumId: z.string().min(1).max(40),
  mediaIds: z.array(z.string().max(40)).min(1, "사진을 골라 주세요.").max(limits.photosPerUpload, `한 번에 ${limits.photosPerUpload}장까지 올릴 수 있어요.`),
  caption: z.string().trim().max(limits.photoCaption).default(""),
});

export const albumPresets = ["일상", "여행", "친구", "음식", "취미", "추억"];
