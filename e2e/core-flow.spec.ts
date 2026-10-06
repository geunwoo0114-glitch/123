import { test, expect } from "@playwright/test";
import { completeOnboarding, login, signup, testImage, uniqueName } from "./helpers";

test.describe.configure({ mode: "serial" });

const host = uniqueName("host");
const guest = uniqueName("guest");

test("가입 → 온보딩 → 사진과 함께 소식 남기기 → 내 공간에서 확인", async ({ page }) => {
  await signup(page, host, "호스트");
  await completeOnboarding(page, "놀러와요 🏠");

  await page.goto("/write");
  await page.getByLabel("내용").fill("첫 소식이에요 #테스트");
  await page.locator('input[type="file"]').setInputFiles({ name: "photo.jpg", mimeType: "image/jpeg", buffer: await testImage() });
  await expect(page.getByAltText("첨부 사진 1")).toBeVisible();
  await page.getByRole("radio", { name: "전체 공개" }).click();
  await page.getByRole("button", { name: "남기기", exact: true }).click();

  await expect(page).toHaveURL(new RegExp(`/@${host}$`));
  await expect(page.getByText("첫 소식이에요")).toBeVisible();
  await expect(page.getByText("놀러와요 🏠").first()).toBeVisible();
});

test("다른 사용자가 공간에 방문해 방명록을 남기고 친구 신청 → 수락", async ({ browser }) => {
  const guestCtx = await browser.newContext();
  const g = await guestCtx.newPage();
  await signup(g, guest, "게스트");
  await completeOnboarding(g);

  await g.goto(`/@${host}`);
  await expect(g.getByRole("heading", { name: "호스트" })).toBeVisible();
  await g.getByRole("link", { name: /방명록/ }).first().click();
  await g.getByLabel("방명록 내용").fill("놀러 왔어요! 방 예쁘다");
  await g.getByRole("button", { name: "남기기", exact: true }).click();
  await expect(g.getByText("놀러 왔어요! 방 예쁘다")).toBeVisible();

  // 모바일에서는 하위 탭에서 프로필 액션이 접히므로 공간 홈으로 돌아가 신청한다
  await g.goto(`/@${host}`);
  await g.getByRole("button", { name: "친구 신청" }).click();
  await g.getByLabel("우리 사이 이름 (선택)").fill("테스트메이트");
  await g.getByRole("button", { name: "신청 보내기" }).click();
  await expect(g.getByRole("button", { name: "신청 취소" })).toBeVisible();

  const hostCtx = await browser.newContext();
  const h = await hostCtx.newPage();
  await login(h, host);
  await h.goto("/notifications");
  await expect(h.getByText("님이 내 방명록에 흔적을 남겼어요")).toBeVisible();
  await h.goto("/friends");
  await h.getByRole("button", { name: "수락", exact: true }).click();
  await expect(h.getByText(/내 친구 1/)).toBeVisible();

  await g.goto(`/@${host}`);
  await expect(g.getByText("내 테스트메이트")).toBeVisible();
  await guestCtx.close();
  await hostCtx.close();
});

test("미니게임 타운: 출석 보상 → 상점 구매 → 옷장에서 착용", async ({ page }) => {
  await login(page, host);
  await page.goto("/town");
  const before = Number((await page.getByRole("link", { name: /보유 밤톨/ }).innerText()).replace(/\D/g, ""));
  await page.getByRole("button", { name: "출석하고 받기" }).click();
  await expect(page.getByRole("button", { name: /오늘 출석 완료/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /보유 밤톨/ })).toContainText(String(before + 30));

  await page.goto("/town/shop");
  await page.getByRole("button", { name: /^🌰 40$/ }).first().click();
  await expect(page.getByText(/을\(를\) 샀어요/)).toBeVisible();

  await page.goto("/town/closet");
  await page.getByRole("button", { name: "4번 선택", exact: true }).click();
  await page.getByRole("button", { name: "이대로 입기" }).click();
  await expect(page.getByText("미니미를 새로 꾸몄어요!")).toBeVisible();
});

test("미니룸: 벽지를 사서 방에 붙이면 내 공간에 보인다", async ({ page }) => {
  await login(page, host);
  await page.goto("/town/shop?tab=room");
  // 줄무늬 벽지(일반, 40)를 산다
  await page.getByRole("button", { name: "줄무늬 놓아보기" }).click();
  await page.locator("li", { hasText: "줄무늬" }).getByRole("button", { name: /^🌰 40$/ }).click();
  await expect(page.getByText(/미니룸에 놓아 보세요/)).toBeVisible();

  await page.goto("/town/room");
  await page.getByRole("button", { name: "줄무늬", exact: true }).click();
  await page.getByRole("button", { name: "이대로 꾸미기" }).click();
  await expect(page.getByText("미니룸을 새로 꾸몄어요!")).toBeVisible();

  // 사지 않은 아이템(밤하늘 벽지)은 고를 수 없다
  await expect(page.getByRole("button", { name: "밤하늘 (상점에서 구매 필요)" })).toBeDisabled();
});

test("권한: 비로그인 방문자는 친구 공개 글을 볼 수 없고, 남의 글은 수정할 수 없다", async ({ page, browser }) => {
  const ctx = await browser.newContext();
  const h = await ctx.newPage();
  await login(h, host);
  await h.goto("/write");
  await h.getByLabel("내용").fill("친구에게만 보이는 비밀 이야기");
  await h.getByRole("radio", { name: "친구 공개" }).click();
  await h.getByRole("button", { name: "남기기", exact: true }).click();
  await expect(h).toHaveURL(new RegExp(`/@${host}$`));
  await h.goto(`/@${host}/posts`);
  const postHref = await h.locator("article", { hasText: "친구에게만 보이는 비밀 이야기" }).locator('a[href^="/p/"]').first().getAttribute("href");
  expect(postHref).toMatch(/^\/p\//);
  await ctx.close();

  await page.goto(`/@${host}`);
  await expect(page.getByText("첫 소식이에요")).toBeVisible();
  await expect(page.getByText("친구에게만 보이는 비밀 이야기")).toHaveCount(0);

  await login(page, guest);
  // 친구(게스트)는 친구 공개 글을 볼 수는 있지만 수정 페이지에는 접근할 수 없다
  await page.goto(postHref!);
  await expect(page.getByText("친구에게만 보이는 비밀 이야기")).toBeVisible();
  // (loading.tsx 스트리밍 때문에 상태 코드는 200일 수 있어 화면 내용으로 검증한다)
  await page.goto(`${postHref}/edit`);
  await expect(page.getByRole("heading", { name: "이 방은 비어 있어요" })).toBeVisible();
  await expect(page.getByRole("button", { name: "수정 완료" })).toHaveCount(0);
});
