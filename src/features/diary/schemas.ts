import { z } from "zod";
import { appConfig } from "@/config/app";
import { isValidDay } from "@/lib/dates";
import { moodIds, visibilitySchema } from "@/features/posts/schemas";

const { limits } = appConfig;

export const weathers = [
  { id: "sunny", emoji: "☀️", label: "맑음" },
  { id: "cloudy", emoji: "☁️", label: "흐림" },
  { id: "rainy", emoji: "🌧️", label: "비" },
  { id: "snowy", emoji: "❄️", label: "눈" },
  { id: "windy", emoji: "🍃", label: "바람" },
  { id: "night", emoji: "🌙", label: "밤하늘" },
] as const;
export const weatherIds = weathers.map((w) => w.id) as [string, ...string[]];
export const weatherById = (id: string | null | undefined) => weathers.find((w) => w.id === id);

export const diaryInputSchema = z.object({
  date: z.string().refine(isValidDay, "날짜를 확인해 주세요."),
  title: z.string().trim().min(1, "제목을 입력해 주세요.").max(limits.diaryTitle, `제목은 ${limits.diaryTitle}자까지예요.`),
  body: z.string().trim().min(1, "내용을 입력해 주세요.").max(limits.diaryBody),
  mood: z.enum(moodIds).nullable().default(null),
  weather: z.enum(weatherIds).nullable().default(null),
  place: z.string().trim().max(40).optional().transform((v) => v || null),
  tags: z.array(z.string().trim().min(1).max(20)).max(limits.tags).default([]),
  // 다이어리는 기본 비공개: 기록 공간이 먼저, 공유는 선택
  visibility: visibilitySchema.default("PRIVATE"),
  mediaIds: z.array(z.string().max(40)).max(limits.imagesPerDiary).default([]),
});

/** 일기 작성 문턱을 낮추는 오늘의 질문 (날짜로 순환) */
export const dailyPrompts = [
  "오늘 가장 오래 머문 장소는 어디였나요?",
  "오늘 나를 웃게 한 작은 일은?",
  "요즘 자주 듣는 노래와 그 이유는?",
  "오늘 먹은 것 중 최고는?",
  "지금 가장 보고 싶은 사람은 누구인가요?",
  "이번 주의 나에게 한마디 해준다면?",
  "최근에 새로 알게 된 것이 있나요?",
  "오늘 하늘은 어떤 색이었나요?",
  "요즘 나를 설레게 하는 계획은?",
  "1년 전 오늘의 나는 무엇을 하고 있었을까요?",
  "오늘 고마웠던 사람이 있나요?",
  "지금 내 방에서 가장 좋아하는 물건은?",
];

export function promptForDay(day: string): string {
  const n = day.split("-").reduce((acc, part) => acc * 31 + Number(part), 7);
  return dailyPrompts[n % dailyPrompts.length];
}
