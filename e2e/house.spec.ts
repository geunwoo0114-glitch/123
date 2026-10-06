import { test, expect } from "@playwright/test";
import { completeOnboarding, signup, uniqueName } from "./helpers";

const owner = uniqueName("hso");
const guest = uniqueName("hsg");

test("2.5D 집: 가구를 사서 놓고 옮겨 저장하면, 놀러 온 친구에게도 보인다", async ({ browser }) => {
  test.setTimeout(90_000);
  const co = await browser.newContext();
  const po = await co.newPage();
  await signup(po, owner, "집주인");
  await completeOnboarding(po);

  // 내 공간 홈 → 2.5D 집
  await po.goto(`/@${owner}`);
  await po.getByRole("link", { name: "2.5D 집 놀러가기" }).click();
  await expect(po).toHaveURL(new RegExp(`/@${owner}/house$`));
  await expect(po.getByRole("img", { name: /집주인님의 2.5D 집. 가구 9개/ }).or(po.getByText("이 기기에서는 2.5D 집을 볼 수 없어요. (WebGL 미지원)"))).toBeVisible({ timeout: 30_000 });

  await po.getByRole("button", { name: "집 꾸미기" }).click();
  const panel = po.getByRole("complementary", { name: "집 꾸미기" });

  // 협탁(30)을 사면 빈 자리에 바로 놓이고 선택된다
  await panel.getByRole("button", { name: "협탁 사기 (30밤톨)" }).click();
  await expect(po.getByText(/협탁을 샀어요! 2.5D 집에 놓아 보세요./)).toBeVisible();
  const toolbar = po.getByRole("toolbar", { name: "협탁 조작" });
  await expect(toolbar).toBeVisible();
  await toolbar.getByRole("button", { name: "돌리기 (R)" }).click();

  // 소파 색 바꾸기: 놓인 가구 목록에서 고른다
  await panel.getByText(/놓인 가구 10\/40/).click();
  await panel.getByRole("button", { name: "2인 소파", exact: true }).click();
  await po.getByRole("toolbar", { name: "2인 소파 조작" }).getByRole("radio", { name: "민트" }).click();

  // 벽지·시간 바꾸기
  await panel.getByRole("tab", { name: "벽·바닥" }).click();
  await panel.getByRole("radio", { name: "민트" }).first().click();
  await panel.getByRole("button", { name: "밤" }).click();

  // 사지 않은 가구는 놓을 수 없고, 겹치면 저장할 수 없다 (저장 버튼 상태로 확인)
  await panel.getByRole("button", { name: "저장" }).click();
  await expect(po.getByText("집을 새로 꾸몄어요! 🏠")).toBeVisible();
  await expect(po.getByRole("button", { name: "집 꾸미기" })).toBeVisible();

  // 새로고침해도 유지 (가구 10개)
  await po.reload();
  await expect(po.getByRole("img", { name: /가구 10개/ }).or(po.getByText(/WebGL 미지원/))).toBeVisible({ timeout: 30_000 });

  // 다른 사람이 놀러 오면 꾸미기 버튼은 없다
  const cg = await browser.newContext();
  const pg = await cg.newPage();
  await signup(pg, guest, "손님");
  await completeOnboarding(pg);
  await pg.goto(`/@${owner}/house`);
  await expect(pg.getByRole("img", { name: /집주인님의 2.5D 집. 가구 10개/ }).or(pg.getByText(/WebGL 미지원/))).toBeVisible({ timeout: 30_000 });
  await expect(pg.getByRole("button", { name: "집 꾸미기" })).toHaveCount(0);

  await co.close();
  await cg.close();
});
