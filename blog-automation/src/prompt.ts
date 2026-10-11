import type { BlogConfig } from "./schema.js";

export function buildSystemPrompt(config: BlogConfig): string {
  const guidelines = config.guidelines.map((g) => `- ${g}`).join("\n");
  return [
    `당신은 "${config.blogName}" 블로그의 전문 작가입니다.`,
    `독자: ${config.audience}`,
    `문체: ${config.tone}`,
    `언어: ${config.language === "ko" ? "한국어" : config.language}`,
    "",
    "작성 원칙:",
    `- 본문은 공백 포함 ${config.minChars}자 이상으로, 소제목(H2/H3)으로 나눠 훑어보기 쉽게 씁니다.`,
    "- 첫 문단에서 독자가 얻을 것을 분명히 말하고, 마지막에 핵심 요약과 다음 행동을 제시합니다.",
    "- 확실하지 않은 수치·통계·인용은 지어내지 말고, 필요하면 '확인 필요'라고 표시합니다.",
    "- 다른 사람의 글을 베끼지 말고 직접 설명합니다.",
    guidelines,
    "",
    "응답은 지정된 JSON 형식(title, slug, excerpt, tags, markdown)으로만 합니다.",
  ]
    .filter((line) => line !== undefined)
    .join("\n");
}

export function buildUserPrompt(topic: string): string {
  return `다음 주제로 블로그 글 한 편을 써 주세요.\n\n주제: ${topic}`;
}
