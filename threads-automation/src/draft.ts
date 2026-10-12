import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { composeText, countChars, THREADS_MAX_CHARS } from "./compliance.js";
import { DraftsSchema, type Product, type Settings } from "./schema.js";

/** 광고 문구·링크·줄바꿈을 빼고 본문에 쓸 수 있는 글자 수(20자는 여유) */
export function bodyBudget(product: Pick<Product, "affiliateUrl">, settings: Pick<Settings, "disclosure">): number {
  return THREADS_MAX_CHARS - countChars(composeText("", product.affiliateUrl, settings.disclosure)) - 2 - 20;
}

export function buildPrompt(product: Product, settings: Settings, count: number, request: string) {
  const budget = bodyBudget(product, settings);
  const system = [
    `너는 Threads에 상품을 소개하는 글을 쓰는 사람이다. 계정 성격: ${settings.writing.persona}. 말투: ${settings.writing.tone}.`,
    "반드시 지킬 것:",
    `- 본문은 공백 포함 ${budget}자 이내. 광고 표시 문구와 링크는 프로그램이 따로 붙이므로 본문에 넣지 않는다.`,
    "- 아래 '확인된 정보'와 '내 사용 경험'에 있는 내용만 사실처럼 쓴다. 가격·할인율·순위·판매량·성분 효과처럼 주어지지 않은 정보는 지어내지 않는다.",
    "- '내 사용 경험'이 비어 있으면 직접 써 본 것처럼 쓰지 않는다(후기·사용감·'써보니' 금지). 대신 고르는 기준, 이런 사람에게 맞다 같은 정보형으로 쓴다.",
    "- '최저가', '100%', '무조건', '효과 보장', 치료·효능 표현, '내돈내산'은 쓰지 않는다.",
    "- 첫 줄은 스크롤을 멈추게 하는 구체적인 문장으로. 해시태그는 넣지 않거나 1개만.",
    ...settings.writing.guidelines.map((g) => `- ${g}`),
  ].join("\n");

  const user = [
    `상품 이름: ${product.name}`,
    product.category ? `분류: ${product.category}` : "",
    `확인된 정보:\n${product.facts || "(없음 — 이름에서 알 수 있는 것 외에는 단정하지 말 것)"}`,
    `내 사용 경험:\n${product.experience || "(없음)"}`,
    request ? `추가 요청: ${request}` : "",
    `서로 다른 접근으로 초안 ${count}개를 써 줘.`,
  ]
    .filter(Boolean)
    .join("\n\n");
  return { system, user, budget };
}

export async function generateDrafts(product: Product, settings: Settings, count: number, request = "") {
  const { system, user, budget } = buildPrompt(product, settings, count, request);
  if (budget < 60) throw new Error("광고 문구와 링크가 너무 길어 본문 자리가 거의 없습니다. 짧은 링크(link.coupang.com)를 쓰거나 광고 문구를 줄이세요.");

  const client = new Anthropic(settings.claude.apiKey ? { apiKey: settings.claude.apiKey } : {});
  let response;
  try {
    response = await client.beta.messages.parse({
      model: settings.claude.model || "claude-opus-5-5",
      max_tokens: 16000,
      output_config: { effort: "medium", format: betaZodOutputFormat(DraftsSchema) },
      // 안전 분류기가 거절하면 서버가 다른 모델로 이어서 처리한다.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system,
      messages: [{ role: "user", content: user }],
    });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) throw new Error("Claude API 키가 올바르지 않습니다. 설정에서 키를 확인하세요.");
    if (err instanceof Anthropic.RateLimitError) throw new Error("Claude 사용량 한도에 걸렸습니다. 잠시 뒤 다시 시도하세요.");
    if (err instanceof Anthropic.APIConnectionError) throw new Error("Claude 서버에 연결하지 못했습니다. 인터넷 연결을 확인하세요.");
    if (err instanceof Anthropic.APIError) throw new Error(`Claude 오류 (${err.status}): ${err.message}`);
    if (err instanceof Error && /api key|apiKey|authentication/i.test(err.message)) {
      throw new Error("Claude API 키가 없습니다. 설정에서 키를 넣어 주세요.");
    }
    throw err;
  }
  if (response.stop_reason === "refusal") {
    throw new Error(`Claude가 요청을 거절했습니다: ${response.stop_details?.explanation ?? "사유 없음"}`);
  }
  if (!response.parsed_output) throw new Error("Claude 응답을 초안 형식으로 해석하지 못했습니다. 다시 시도하세요.");
  return response.parsed_output.drafts.slice(0, count);
}

export async function testClaude(settings: Settings["claude"]): Promise<string> {
  const client = new Anthropic(settings.apiKey ? { apiKey: settings.apiKey } : {});
  try {
    const model = await client.models.retrieve(settings.model || "claude-opus-5-5");
    return `Claude 연결 성공 (${model.display_name})`;
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) throw new Error("Claude API 키가 올바르지 않습니다.");
    if (err instanceof Anthropic.NotFoundError) throw new Error(`'${settings.model}' 모델을 찾을 수 없습니다.`);
    if (err instanceof Anthropic.APIConnectionError) throw new Error("Claude 서버에 연결하지 못했습니다.");
    if (err instanceof Anthropic.APIError) throw new Error(`Claude 오류 (${err.status}): ${err.message}`);
    throw new Error("Claude API 키가 없습니다. 키를 넣어 주세요.");
  }
}
