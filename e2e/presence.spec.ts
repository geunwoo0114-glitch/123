import { test, expect } from "@playwright/test";
import { completeOnboarding, signup, uniqueName } from "./helpers";

const host = uniqueName("pth");
const guest = uniqueName("ptg");

test("같은 공간에 있는 사람이 방에 함께 보이고, 떠나면 사라진다", async ({ browser }) => {
  test.setTimeout(90_000);
  const ch = await browser.newContext();
  const ph = await ch.newPage();
  await signup(ph, host, "방주인");
  await completeOnboarding(ph);

  const cg = await browser.newContext();
  const pg = await cg.newPage();
  await signup(pg, guest, "놀러온손님");
  await completeOnboarding(pg);

  await ph.goto(`/@${host}`);
  // 혼자 있을 때는 표시하지 않는다
  await expect(ph.getByText(/명이 함께 있어요/)).toHaveCount(0);

  await pg.goto(`/@${host}`);
  const guestView = pg.getByRole("list", { name: "지금 함께 있는 사람" });
  await expect(guestView.getByRole("link", { name: /방주인/ })).toBeVisible();
  await expect(pg.getByText("지금 1명이 함께 있어요")).toBeVisible();

  // 주인 화면에는 다음 신호(15초) 안에 손님이 나타난다
  const hostView = ph.getByRole("list", { name: "지금 함께 있는 사람" });
  await expect(hostView.getByRole("link", { name: /놀러온손님/ })).toBeVisible({ timeout: 25_000 });

  // 손님이 다른 곳으로 가면 사라진다
  await pg.goto("/explore");
  await expect(hostView).toHaveCount(0, { timeout: 25_000 });

  // 방문 흔적을 끈 손님은 보이지 않는다
  await pg.goto("/settings/privacy");
  await pg.getByRole("switch", { name: "다른 공간에 방문 흔적 남기기" }).click();
  await pg.getByRole("button", { name: /저장/ }).click();
  await expect(pg.getByText("설정을 저장했어요.")).toBeVisible();
  await pg.goto(`/@${host}`);
  await expect(pg.getByText("지금 1명이 함께 있어요")).toBeVisible();
  await ph.waitForTimeout(16_000);
  await expect(hostView).toHaveCount(0);

  await ch.close();
  await cg.close();
});
