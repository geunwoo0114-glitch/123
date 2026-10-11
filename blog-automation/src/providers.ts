import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { PostSchema, type Post, type Settings } from "./schema.js";

export interface GenerateInput {
  system: string;
  user: string;
}

/** Claude API. 설정의 API 키가 비어 있으면 ANTHROPIC_API_KEY·ant auth login 프로필을 쓴다. */
export async function generateWithClaude(settings: Settings["claude"], input: GenerateInput): Promise<Post> {
  const client = new Anthropic(settings.apiKey ? { apiKey: settings.apiKey } : {});
  let response;
  try {
    response = await client.beta.messages.parse({
      model: settings.model || "claude-opus-5-5",
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
  if (response.stop_reason === "max_tokens") {
    throw new Error("글이 너무 길어 중간에 잘렸습니다. 최소 글자 수를 줄이거나 다시 시도하세요.");
  }
  if (!response.parsed_output) {
    throw new Error("Claude 응답을 글 형식으로 해석하지 못했습니다. 다시 시도하세요.");
  }
  return response.parsed_output;
}

function ollamaBase(host: string): string {
  return (host || "http://127.0.0.1:11434").replace(/\/$/, "");
}

/** 로컬 AI(Ollama) */
export async function generateWithOllama(settings: Settings["ollama"], input: GenerateInput): Promise<Post> {
  let res: Response;
  try {
    res = await fetch(`${ollamaBase(settings.host)}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: settings.model,
        stream: false,
        format: z.toJSONSchema(PostSchema),
        options: { temperature: 0.7, num_ctx: 16384 },
        messages: [
          { role: "system", content: input.system },
          { role: "user", content: input.user },
        ],
      }),
    });
  } catch {
    throw new Error("Ollama에 연결하지 못했습니다. Ollama 앱이 켜져 있는지 확인하세요.");
  }
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 404 && /not found/i.test(text)) {
      throw new Error(`Ollama에 '${settings.model}' 모델이 없습니다. 터미널에서 'ollama pull ${settings.model}'을 실행하세요.`);
    }
    throw new Error(`Ollama 요청 실패 (${res.status}): ${text}`);
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

/** 이 컴퓨터의 Ollama에 받아 둔 모델 목록. 연결이 안 되면 null. */
export async function listOllamaModels(host: string): Promise<string[] | null> {
  try {
    const res = await fetch(`${ollamaBase(host)}/api/tags`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    const data = (await res.json()) as { models?: { name: string }[] };
    return (data.models ?? []).map((m) => m.name);
  } catch {
    return null;
  }
}

/** 설정 화면의 "연결 확인" 버튼. 모델 정보만 조회하므로 글쓰기 비용이 들지 않는다. */
export async function testClaude(settings: Settings["claude"]): Promise<string> {
  const client = new Anthropic(settings.apiKey ? { apiKey: settings.apiKey } : {});
  try {
    const model = await client.models.retrieve(settings.model || "claude-opus-5-5");
    return `Claude 연결 성공 (${model.display_name})`;
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) throw new Error("Claude API 키가 올바르지 않습니다.");
    if (err instanceof Anthropic.NotFoundError) throw new Error(`'${settings.model}' 모델을 찾을 수 없습니다.`);
    if (err instanceof Anthropic.APIConnectionError) throw new Error("Claude 서버에 연결하지 못했습니다. 인터넷 연결을 확인하세요.");
    if (err instanceof Anthropic.APIError) throw new Error(`Claude 오류 (${err.status}): ${err.message}`);
    throw new Error("Claude API 키가 없습니다. 키를 넣어 주세요.");
  }
}

export function generate(settings: Settings, input: GenerateInput): Promise<Post> {
  return settings.provider === "claude"
    ? generateWithClaude(settings.claude, input)
    : generateWithOllama(settings.ollama, input);
}
