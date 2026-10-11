import { z } from "zod";

/** AI가 돌려줘야 하는 글 한 편의 형태. Claude·로컬 AI 모두 이 스키마로 검증한다. */
export const PostSchema = z.object({
  title: z.string().describe("검색에 잘 걸리는 40자 안팎의 제목"),
  slug: z.string().describe("영문 소문자·숫자·하이픈으로 된 URL 슬러그"),
  excerpt: z.string().describe("검색 결과/목록에 보일 120자 안팎의 요약"),
  tags: z.array(z.string()).describe("3~6개의 태그"),
  markdown: z.string().describe("본문 마크다운. 제목(H1)은 넣지 않고 H2부터 시작"),
});

export type Post = z.infer<typeof PostSchema>;

export const BlogProfileSchema = z.object({
  blogName: z.string().default("내 블로그"),
  language: z.string().default("ko"),
  audience: z.string().default("일반 독자"),
  tone: z.string().default("친근하지만 정확한 존댓말"),
  minChars: z.number().int().positive().default(2500),
  guidelines: z.array(z.string()).default([]),
});

export type BlogProfile = z.infer<typeof BlogProfileSchema>;

/**
 * 한 사람의 설정 전체. 프로그램 화면에서 저장하면 settings.json(각자 컴퓨터에만 있음)에 들어가고,
 * GitHub Actions에서는 같은 값을 환경 변수로 받는다.
 */
export const SettingsSchema = z.object({
  provider: z.enum(["claude", "ollama"]).default("claude"),
  claude: z
    .object({ apiKey: z.string().default(""), model: z.string().default("claude-opus-5-5") })
    .default({ apiKey: "", model: "claude-opus-5-5" }),
  ollama: z
    .object({ host: z.string().default("http://127.0.0.1:11434"), model: z.string().default("qwen2.5:7b") })
    .default({ host: "http://127.0.0.1:11434", model: "qwen2.5:7b" }),
  wordpress: z
    .object({
      url: z.string().default(""),
      username: z.string().default(""),
      appPassword: z.string().default(""),
      status: z.enum(["draft", "publish", "pending", "private"]).default("draft"),
      categoryIds: z.array(z.number().int()).default([]),
    })
    .default({ url: "", username: "", appPassword: "", status: "draft", categoryIds: [] }),
  webhookUrl: z.string().default(""),
  blog: BlogProfileSchema.default(BlogProfileSchema.parse({})),
});

export type Settings = z.infer<typeof SettingsSchema>;
export type ProviderName = Settings["provider"];
