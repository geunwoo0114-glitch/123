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

export const ConfigSchema = z.object({
  blogName: z.string(),
  language: z.string().default("ko"),
  audience: z.string(),
  tone: z.string(),
  minChars: z.number().int().positive().default(2500),
  guidelines: z.array(z.string()).default([]),
  wordpress: z
    .object({
      status: z.enum(["draft", "publish", "pending", "private"]).default("draft"),
      categoryIds: z.array(z.number().int()).default([]),
    })
    .default({ status: "draft", categoryIds: [] }),
});

export type BlogConfig = z.infer<typeof ConfigSchema>;
