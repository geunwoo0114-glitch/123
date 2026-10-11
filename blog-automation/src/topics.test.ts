import { describe, expect, it } from "vitest";
import { normalizeSlug } from "./post-file.js";
import { markDone, nextTopic } from "./topics.js";

const md = `# 글감\n\n- [x] 끝난 주제 → a.md\n- [ ] 첫 주제\n- [ ] 둘째 주제\n`;

describe("topics", () => {
  it("picks the first unchecked topic", () => {
    expect(nextTopic(md)).toBe("첫 주제");
    expect(nextTopic("- [x] 끝")).toBeNull();
  });

  it("marks only the written topic as done", () => {
    const out = markDone(md, "첫 주제", "2026-10-11-first.md");
    expect(out).toContain("- [x] 첫 주제 → 2026-10-11-first.md");
    expect(nextTopic(out)).toBe("둘째 주제");
  });
});

describe("normalizeSlug", () => {
  it("keeps url-safe lowercase slugs", () => {
    expect(normalizeSlug("Daily Diary -- Habit!", "x")).toBe("daily-diary-habit");
    expect(normalizeSlug("다이어리", "post-1")).toBe("post-1");
  });
});
