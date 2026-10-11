import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { PostSchema, type Post } from "./schema.js";

export type ProviderName = "claude" | "ollama";

export interface GenerateInput {
  system: string;
  user: string;
}

/** Claude API. ANTHROPIC_API_KEY(또는 ant auth login 프로필)로 인증한다. */
export async function generateWithClaude(input: GenerateInput): Promise<Post> {
  const client = new Anthropic();
  const response = await client.beta.messages.parse({
    model: process.env.CLAUDE_MODEL ?? "claude-opus-5-5",
    max_tokens: 16000,
    output_config: {
      effort: "medium",
      format: betaZodOutputFormat(PostSchema),
    },
    // 안전 분류기가 거절하면 서버가 다른 모델로 이어서 처리한다.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: input.system,
    messages: [{ role: "user", content: input.user }],
  });

  if (response.stop_reason === "refusal") {
    throw new Error(`Claude가 요청을 거절했습니다: ${response.stop_details?.explanation ?? "사유 없음"}`);
  }
  if (response.stop_reason === "max_tokens") {
    throw new Error("글이 너무 길어 중간에 잘렸습니다. minChars를 줄이거나 다시 시도하세요.");
  }
  if (!response.parsed_output) {
    throw new Error("Claude 응답을 글 형식으로 해석하지 못했습니다.");
  }
  return response.parsed_output;
}

/** 로컬 AI(Ollama). OLLAMA_HOST, OLLAMA_MODEL로 서버와 모델을 고른다. */
export async function generateWithOllama(input: GenerateInput): Promise<Post> {
  const host = (process.env.OLLAMA_HOST ?? "http://127.0.0.1:11434").replace(/\/$/, "");
  const model = process.env.OLLAMA_MODEL ?? "qwen2.5:7b";

  const res = await fetch(`${host}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model,
      stream: false,
      format: z.toJSONSchema(PostSchema),
      options: { temperature: 0.7, num_ctx: 16384 },
      messages: [
        { role: "system", content: input.system },
        { role: "user", content: input.user },
      ],
    }),
  });
  if (!res.ok) {
    throw new Error(`Ollama 요청 실패 (${res.status}): ${await res.text()}`);
  }
  const data = (await res.json()) as { message?: { content?: string } };
  const content = data.message?.content;
  if (!content) throw new Error("Ollama 응답이 비어 있습니다.");

  let json: unknown;
  try {
    json = JSON.parse(content);
  } catch {
    throw new Error(`Ollama 응답이 JSON이 아닙니다: ${content.slice(0, 200)}`);
  }
  return PostSchema.parse(json);
}

export function generate(provider: ProviderName, input: GenerateInput): Promise<Post> {
  return provider === "claude" ? generateWithClaude(input) : generateWithOllama(input);
}
