import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { completeOnboarding, signup, uniqueName } from "./helpers";

/** 접근성 자동 검사 (WCAG 2.1 A/AA). 심각/중대한 위반이 없어야 한다. */
async function audit(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const serious = result.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  const summary = serious.map((v) => `${v.id} (${v.impact}): ${v.help} → ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`);
  expect(summary, `${path} 접근성 위반`).toEqual([]);
}

test("비로그인 화면 접근성", async ({ page }) => {
  for (const path of ["/", "/login", "/signup", "/forgot-password", "/terms", "/privacy"]) await audit(page, path);
});

test("로그인 화면 접근성", async ({ page }) => {
  const u = uniqueName("a11y");
  await signup(page, u, "접근성");
  await completeOnboarding(page);
  for (const path of ["/", "/explore", `/@${u}`, `/@${u}/guestbook`, `/@${u}/diary`, `/@${u}/photos`, "/friends", "/messages", "/notifications", "/town", "/town/shop", "/town/closet", "/town/room", "/settings", "/settings/space", "/settings/privacy", "/write", "/write/diary"]) {
    await audit(page, path);
  }
});

test.describe("다크 모드", () => {
  test.use({ colorScheme: "dark" });
  test("다크 모드 주요 화면 접근성", async ({ page }) => {
    for (const path of ["/", "/login", "/signup"]) await audit(page, path);
    const u = uniqueName("a11yd");
    await signup(page, u, "다크");
    await completeOnboarding(page);
    for (const path of ["/", `/@${u}`, `/@${u}/guestbook`, "/town", "/town/shop", "/settings/privacy", "/write"]) await audit(page, path);
  });
});
