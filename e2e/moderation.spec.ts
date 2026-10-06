import { test, expect } from "@playwright/test";
import { execSync } from "node:child_process";
import { completeOnboarding, PASSWORD, signup, uniqueName } from "./helpers";

test.describe.configure({ mode: "serial" });

const host = uniqueName("modh");
const troll = uniqueName("modt");
const admin = uniqueName("moda");
const spam = `광고! 지금 바로 클릭 ${troll}`;

test("신고 → 운영자가 숨김 + 계정 정지 → 콘텐츠가 사라지고 로그인 불가", async ({ browser }) => {
  // 준비: 공간 주인, 악성 방명록 작성자, 운영자
  const ch = await browser.newContext();
  const h = await ch.newPage();
  await signup(h, host, "주인");
  await completeOnboarding(h);

  const ct = await browser.newContext();
  const t = await ct.newPage();
  await signup(t, troll, "악플러");
  await completeOnboarding(t);
  await t.goto(`/@${host}/guestbook`);
  await t.getByLabel("방명록 내용").fill(spam);
  await t.getByRole("button", { name: "남기기", exact: true }).click();
  await expect(t.getByText(spam)).toBeVisible();

  // 주인이 신고
  await h.goto(`/@${host}/guestbook`);
  const note = h.locator("li", { hasText: spam });
  await note.getByRole("button", { name: "더보기" }).click();
  await h.getByRole("menuitem", { name: "신고" }).click();
  await h.getByRole("radio", { name: "스팸/광고" }).click();
  await h.getByRole("button", { name: "신고하기" }).last().click();
  await expect(h.getByText(/신고가 접수됐어요/)).toBeVisible();

  // 일반 사용자는 운영 화면을 볼 수 없다
  await h.goto("/admin");
  await expect(h.getByRole("heading", { name: "이 방은 비어 있어요" })).toBeVisible();

  // 운영자 계정 (테스트 DB에서 역할 부여)
  const ca = await browser.newContext();
  const a = await ca.newPage();
  await signup(a, admin, "운영자");
  await completeOnboarding(a);
  execSync(`psql "${process.env.DATABASE_URL ?? "postgresql://darak:darak@localhost:5432/darak"}" -c "UPDATE \\"User\\" SET role='ADMIN' WHERE username='${admin}'"`);
  await a.goto("/admin");
  const card = a.locator("article", { hasText: spam });
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "숨기고 계정 정지" }).click();
  await a.getByRole("button", { name: "확인" }).click();
  await expect(a.getByText("조치를 완료했어요.")).toBeVisible();

  // 방명록에서 사라지고, 정지된 계정은 로그인할 수 없다
  await h.goto(`/@${host}/guestbook`);
  await expect(h.getByText(spam)).toHaveCount(0);
  const cx = await browser.newContext();
  const x = await cx.newPage();
  await x.goto("/login");
  await x.getByLabel("이메일 또는 아이디").fill(troll);
  await x.getByLabel("비밀번호").fill(PASSWORD);
  await x.getByRole("button", { name: "로그인" }).click();
  await expect(x.getByText("이용이 제한된 계정이에요. 고객센터에 문의해 주세요.")).toBeVisible();

  for (const c of [ch, ct, ca, cx]) await c.close();
});
