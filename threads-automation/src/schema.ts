import { z } from "zod";

/**
 * 공정위 「추천·보증 등에 관한 표시·광고 심사지침」은 '광고'처럼 명확한 표현을 게시물 첫 부분(또는 끝 부분)에
 * 본문과 구분해 적도록 안내한다. 문구는 설정에서 바꿀 수 있다.
 */
export const DEFAULT_DISCLOSURE = "[광고] 이 게시물은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.";

export const SettingsSchema = z.object({
  claude: z
    .object({ apiKey: z.string().default(""), model: z.string().default("claude-opus-5-5") })
    .default({ apiKey: "", model: "claude-opus-5-5" }),
  threads: z
    .object({
      accessToken: z.string().default(""),
      userId: z.string().default(""),
      username: z.string().default(""),
      tokenCheckedAt: z.string().default(""),
    })
    .default({ accessToken: "", userId: "", username: "", tokenCheckedAt: "" }),
  disclosure: z
    .object({
      text: z.string().default(DEFAULT_DISCLOSURE),
      position: z.enum(["top", "bottom"]).default("top"),
    })
    .default({ text: DEFAULT_DISCLOSURE, position: "top" }),
  writing: z
    .object({
      persona: z.string().default("생활용품을 꼼꼼히 비교해 소개하는 계정"),
      tone: z.string().default("친근하지만 담백한 존댓말, 과장 없이 구체적으로"),
      guidelines: z.array(z.string()).default([]),
    })
    .default({ persona: "생활용품을 꼼꼼히 비교해 소개하는 계정", tone: "친근하지만 담백한 존댓말, 과장 없이 구체적으로", guidelines: [] }),
  schedule: z
    .object({
      /** Meta 한도(24시간 250개)보다 훨씬 낮게 두는 내 한도. 같은 링크 글을 몰아 올리면 스팸으로 보일 수 있다. */
      maxPerDay: z.number().int().min(1).max(250).default(8),
      minGapMinutes: z.number().int().min(0).max(1440).default(60),
      /** 프로그램이 꺼져 있어 예약 시간을 이만큼 넘기면 자동 발행하지 않고 '놓침'으로 남긴다. */
      missedGraceMinutes: z.number().int().min(1).max(1440).default(60),
    })
    .default({ maxPerDay: 8, minGapMinutes: 60, missedGraceMinutes: 60 }),
});

export type Settings = z.infer<typeof SettingsSchema>;

export const ProductInputSchema = z.object({
  name: z.string().trim().min(1, "상품 이름을 적어 주세요").max(200),
  affiliateUrl: z.string().trim().url("제휴 링크가 올바른 주소가 아닙니다"),
  category: z.string().trim().max(50).default(""),
  /** 사용자가 직접 확인해 적은 정보만 AI에게 넘긴다(가격은 바뀌므로 비워 두기를 권장). */
  facts: z.string().trim().max(2000).default(""),
  /** 내가 실제로 써 본 경험. 비어 있으면 AI가 사용 후기처럼 쓰지 않는다. */
  experience: z.string().trim().max(2000).default(""),
});

export type ProductInput = z.infer<typeof ProductInputSchema>;
export type Product = ProductInput & { id: string; createdAt: string; updatedAt: string };

export const POST_STATUSES = ["draft", "scheduled", "publishing", "published", "failed", "canceled"] as const;
export type PostStatus = (typeof POST_STATUSES)[number];

export interface PostLog {
  at: string;
  level: "info" | "error";
  message: string;
}

export interface Post {
  id: string;
  productId: string | null;
  /** 본문만. 광고 문구와 링크는 발행할 때 설정대로 붙인다. */
  body: string;
  linkUrl: string;
  status: PostStatus;
  /** 사람이 확인하고 예약한 순간의 최종 글. 예약 뒤 설정이 바뀌어도 확인한 글 그대로 올라간다. */
  approvedText: string | null;
  approvedAt: string | null;
  scheduledAt: string | null;
  attempts: number;
  nextAttemptAt: string | null;
  containerId: string | null;
  mediaId: string | null;
  permalink: string | null;
  publishedAt: string | null;
  lastError: string | null;
  log: PostLog[];
  createdAt: string;
  updatedAt: string;
}

export interface Data {
  products: Product[];
  posts: Post[];
}

/** Claude가 돌려줘야 하는 초안 묶음 */
export const DraftsSchema = z.object({
  drafts: z
    .array(
      z.object({
        body: z.string().describe("Threads 본문. 광고 문구와 링크는 넣지 않는다"),
        angle: z.string().describe("이 초안의 접근 방식을 10자 안팎으로"),
      }),
    )
    .describe("서로 다른 접근의 초안들"),
});

export type Drafts = z.infer<typeof DraftsSchema>;
