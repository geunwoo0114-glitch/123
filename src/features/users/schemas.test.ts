import { describe, expect, it } from "vitest";
import { passwordSchema, signupSchema, usernameSchema } from "./schemas";

describe("usernameSchema", () => {
  it("소문자로 정규화한다", () => {
    expect(usernameSchema.parse("  Hello_World ")).toBe("hello_world");
  });
  it.each(["ab", "a".repeat(21), "한글아이디", "bad name", "_start", "end.", "a..b", "admin", "settings"])("%s 는 거부", (v) => {
    expect(usernameSchema.safeParse(v).success).toBe(false);
  });
  it.each(["minji", "minji.kim", "min_99"])("%s 는 허용", (v) => {
    expect(usernameSchema.safeParse(v).success).toBe(true);
  });
});

describe("passwordSchema", () => {
  it("영문+숫자 8자 이상", () => {
    expect(passwordSchema.safeParse("abcdefgh").success).toBe(false);
    expect(passwordSchema.safeParse("12345678").success).toBe(false);
    expect(passwordSchema.safeParse("abcd1234").success).toBe(true);
  });
});

describe("signupSchema", () => {
  it("이메일을 정규화하고 잘못된 값은 필드 오류를 낸다", () => {
    const ok = signupSchema.safeParse({ email: " A@B.com ", username: "minji", displayName: "민지", password: "abcd1234" });
    expect(ok.success && ok.data.email).toBe("a@b.com");
    const bad = signupSchema.safeParse({ email: "nope", username: "x", displayName: "", password: "1" });
    expect(bad.success).toBe(false);
    if (!bad.success) expect(new Set(bad.error.issues.map((i) => i.path[0]))).toEqual(new Set(["email", "username", "displayName", "password"]));
  });
});
