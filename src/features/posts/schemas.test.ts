import { describe, expect, it } from "vitest";
import { extractTags, postInputSchema } from "./schemas";

describe("extractTags", () => {
  it("한글/영문 태그를 소문자로 중복 없이 추출", () => {
    expect(extractTags("오늘 #카페 #Cafe #cafe 다녀옴 #여행_기록")).toEqual(["카페", "cafe", "여행_기록"]);
  });
});

describe("postInputSchema", () => {
  it("내용과 사진이 모두 없으면 거부", () => {
    expect(postInputSchema.safeParse({ body: "  " }).success).toBe(false);
  });
  it("사진만 있어도 허용", () => {
    expect(postInputSchema.safeParse({ body: "", mediaIds: ["m1"] }).success).toBe(true);
  });
  it("javascript: 링크 거부", () => {
    expect(postInputSchema.safeParse({ body: "hi", linkUrl: "javascript:alert(1)" }).success).toBe(false);
  });
  it("알 수 없는 공개 범위 거부", () => {
    expect(postInputSchema.safeParse({ body: "hi", visibility: "EVERYONE" }).success).toBe(false);
  });
});
