import { describe, expect, it } from "vitest";
import { josa } from "./josa";

describe("josa", () => {
  it("받침 유무에 따라 조사를 고른다", () => {
    expect(josa("다락", "을", "를")).toBe("다락을");
    expect(josa("하루", "을", "를")).toBe("하루를");
    expect(josa("밤톨", "이", "가")).toBe("밤톨이");
  });
});
