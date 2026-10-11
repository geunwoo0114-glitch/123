import { describe, expect, it } from "vitest";
import { fromMarkdownFile, toMarkdownFile } from "./post-file.js";
import { merge } from "./settings.js";

describe("post file", () => {
  it("round-trips a post through front matter", () => {
    const post = { title: '따옴표 "제목": 콜론', slug: "a-b", excerpt: "요약", tags: ["가", "나"], markdown: "## 소제목\n\n본문 --- 줄" };
    const meta = { date: "2026-10-12", provider: "claude", topic: "주제" };
    expect(fromMarkdownFile(toMarkdownFile(post, meta))).toEqual({ post, meta });
  });
});

describe("settings merge", () => {
  it("lets later layers win and keeps sibling keys", () => {
    expect(merge({ claude: { apiKey: "env", model: "m" } }, { claude: { apiKey: "file" } })).toEqual({
      claude: { apiKey: "file", model: "m" },
    });
  });
});
