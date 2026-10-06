import { test, expect } from "@playwright/test";
import { completeOnboarding, signup, uniqueName } from "./helpers";

const host = uniqueName("lvh");
const guest = uniqueName("lvg");

test("2.5D 집: 같은 집에 있으면 서로의 움직임이 실시간으로 보인다", async ({ browser }) => {
  test.setTimeout(90_000);
  const ch = await browser.newContext();
  const ph = await ch.newPage();
  await signup(ph, host, "집주인");
  await completeOnboarding(ph);

  const cg = await browser.newContext();
  const pg = await cg.newPage();
  await signup(pg, guest, "산책손님");
  await completeOnboarding(pg);

  await ph.goto(`/@${host}/house`);
  const hostList = ph.getByRole("list", { name: "집 안에 있는 사람" });
  await expect(hostList.getByText(/집주인 집주인 \(나\)/)).toBeAttached();

  // 손님이 들어오면 주인 화면에 바로 나타난다 (들어옴 이벤트)
  await pg.goto(`/@${host}/house`);
  await expect(hostList.getByText(/산책손님/)).toBeAttached({ timeout: 10_000 });

  // 손님이 걸어가면 주인 화면에서도 같은 자리로 바뀐다 (움직임 이벤트)
  const guestList = pg.getByRole("list", { name: "집 안에 있는 사람" });
  const spotOf = async (list: typeof hostList, name: RegExp) => ((await list.getByText(name).textContent()) ?? "").split("—")[1]?.trim() ?? "";
  const before = await spotOf(guestList, /산책손님 \(나\)/);
  const pad = pg.getByRole("group", { name: "내 미니미 걷기" });
  for (let i = 0; i < 5; i++) {
    await pad.getByRole("button", { name: "왼쪽으로 걷기" }).click();
    await pad.getByRole("button", { name: "아래로 걷기" }).click();
  }
  await expect.poll(() => spotOf(guestList, /산책손님 \(나\)/)).not.toBe(before);
  const after = await spotOf(guestList, /산책손님 \(나\)/);
  await expect.poll(() => spotOf(hostList, /산책손님/), { timeout: 10_000 }).toBe(after);

  // 손님이 나가면 주인 화면에서 바로 사라진다 (나감 이벤트)
  await pg.goto("/explore");
  await expect(hostList.getByText(/산책손님/)).toHaveCount(0, { timeout: 10_000 });

  await ch.close();
  await cg.close();
});
