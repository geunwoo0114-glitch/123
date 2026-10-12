import { describe, expect, it } from "vitest";
import { checkPost, composeText, countChars } from "./compliance.js";
import { DEFAULT_DISCLOSURE } from "./schema.js";

const disclosure = { text: DEFAULT_DISCLOSURE, position: "top" as const };
const link = "https://link.coupang.com/a/abc123";
const errors = (r: ReturnType<typeof checkPost>) => r.issues.filter((i) => i.level === "error").map((i) => i.message);

describe("composeText", () => {
  it("광고 문구를 맨 위에 본문과 구분해 붙인다", () => {
    expect(composeText("본문", link, disclosure)).toBe(`${DEFAULT_DISCLOSURE}\n\n본문\n\n${link}`);
  });
  it("아래 위치도 고를 수 있다", () => {
    expect(composeText("본문", link, { ...disclosure, position: "bottom" })).toBe(`본문\n\n${link}\n\n${DEFAULT_DISCLOSURE}`);
  });
});

describe("countChars", () => {
  it("이모지와 한글을 한 글자로 센다", () => {
    expect(countChars("가나👍🏽")).toBe(3);
  });
});

describe("checkPost", () => {
  it("정상 글은 통과", () => {
    const r = checkPost("수납이 부족한 원룸에 맞는 접이식 선반입니다.", link, { disclosure });
    expect(r.ok).toBe(true);
    expect(r.issues).toEqual([]);
  });

  it("광고 문구가 없으면 막는다", () => {
    expect(checkPost("본문", link, { disclosure: { text: " ", position: "top" } }).ok).toBe(false);
  });

  it("모호한 영어 표기는 막는다", () => {
    const r = checkPost("본문", link, { disclosure: { text: "#sponsored", position: "top" } });
    expect(errors(r).join()).toContain("모호한");
  });

  it("500자를 넘으면 막는다", () => {
    const r = checkPost("가".repeat(500), link, { disclosure });
    expect(r.ok).toBe(false);
    expect(r.length).toBeGreaterThan(500);
  });

  it("링크가 없거나 이상하면 막는다", () => {
    expect(checkPost("본문", "", { disclosure }).ok).toBe(false);
    expect(checkPost("본문", "javascript:alert(1)", { disclosure }).ok).toBe(false);
  });

  it("쿠팡이 아닌 링크·일반 상품 주소는 경고만", () => {
    const other = checkPost("본문", "https://example.com/x", { disclosure });
    expect(other.ok).toBe(true);
    expect(other.issues[0].level).toBe("warning");
    expect(checkPost("본문", "https://www.coupang.com/vp/products/1", { disclosure }).issues[0].message).toContain("파트너스");
  });

  it("링크 6개 이상은 막는다", () => {
    const body = [1, 2, 3, 4, 5].map((n) => `https://e.com/${n}`).join(" ");
    expect(checkPost(body, link, { disclosure }).ok).toBe(false);
  });

  it("제휴 글에 '내돈내산'은 막고, 단정 표현은 경고한다", () => {
    expect(checkPost("내돈내산 후기", link, { disclosure }).ok).toBe(false);
    const r = checkPost("최저가 무조건 사세요", link, { disclosure });
    expect(r.ok).toBe(true);
    expect(r.issues.length).toBe(2);
  });
});
