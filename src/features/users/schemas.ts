import { z } from "zod";
import { appConfig } from "@/config/app";

const { username: u, limits } = appConfig;

/** 라우트/시스템 경로와 겹치거나 사칭 위험이 있는 username */
export const RESERVED_USERNAMES = new Set([
  "admin", "administrator", "root", "system", "support", "help", "darak", "official", "staff", "moderator",
  "api", "app", "login", "logout", "signup", "settings", "explore", "friends", "notifications", "write",
  "onboarding", "media", "static", "about", "terms", "privacy", "search", "u", "p", "me", "null", "undefined",
]);

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(u.min, `아이디는 ${u.min}자 이상이어야 해요.`)
  .max(u.max, `아이디는 ${u.max}자 이하여야 해요.`)
  .regex(/^[a-z0-9_.]+$/, "영문 소문자, 숫자, 밑줄(_), 마침표(.)만 쓸 수 있어요.")
  .refine((v) => !/^[._]|[._]$/.test(v) && !/\.\./.test(v), "마침표/밑줄로 시작하거나 끝날 수 없어요.")
  .refine((v) => !RESERVED_USERNAMES.has(v), "사용할 수 없는 아이디예요.");

export const passwordSchema = z
  .string()
  .min(8, "비밀번호는 8자 이상이어야 해요.")
  .max(128, "비밀번호가 너무 길어요.")
  .refine((v) => /[a-zA-Z]/.test(v) && /\d/.test(v), "영문과 숫자를 함께 써 주세요.");

export const emailSchema = z.string().trim().toLowerCase().email("올바른 이메일을 입력해 주세요.").max(254);

export const signupSchema = z.object({
  email: emailSchema,
  username: usernameSchema,
  displayName: z.string().trim().min(1, "이름을 입력해 주세요.").max(limits.displayName, `이름은 ${limits.displayName}자 이하로 적어 주세요.`),
  password: passwordSchema,
});

export const loginSchema = z.object({
  identifier: z.string().trim().toLowerCase().min(1, "이메일 또는 아이디를 입력해 주세요.").max(254),
  password: z.string().min(1, "비밀번호를 입력해 주세요.").max(128),
});

const optionalText = (max: number, msg: string) => z.string().trim().max(max, msg).default("");

export const profileSchema = z.object({
  displayName: z.string().trim().min(1, "이름을 입력해 주세요.").max(limits.displayName),
  bio: optionalText(limits.bio, `소개는 ${limits.bio}자 이하로 적어 주세요.`),
  statusMessage: optionalText(limits.statusMessage, `상태 메시지는 ${limits.statusMessage}자 이하로 적어 주세요.`),
  statusEmoji: z.string().trim().max(8).default(""),
  interests: z
    .array(z.string().trim().min(1).max(16))
    .max(limits.interests, `관심사는 ${limits.interests}개까지 고를 수 있어요.`)
    .default([]),
  avatarMediaId: z.string().max(40).nullable().optional(),
  coverMediaId: z.string().max(40).nullable().optional(),
});

/** 온보딩/프로필에서 고를 수 있는 관심사 (자유 입력도 허용) */
export const interestSuggestions = [
  "카페", "여행", "사진", "음악", "영화", "독서", "운동", "요리", "게임", "그림",
  "패션", "반려동물", "드라마", "아이돌", "캠핑", "맛집", "공부", "코딩", "식물", "산책",
];
