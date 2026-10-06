import { test, expect, type APIRequestContext } from "@playwright/test";
import { completeOnboarding, login, PASSWORD, signup, uniqueName } from "./helpers";

test.describe.configure({ mode: "serial" });

const user = uniqueName("acct");
const email = `${user}@e2e.test`;
const NEW_PASSWORD = "newpass456";

/** 개발 서버의 메일 보관함에서 링크 추출 */
async function mailLink(request: APIRequestContext, path: string) {
  await expect.poll(async () => (await request.get(`/api/dev/mail?to=${encodeURIComponent(email)}`)).status(), { timeout: 10_000 }).toBe(200);
  const { text } = await (await request.get(`/api/dev/mail?to=${encodeURIComponent(email)}`)).json();
  const url = (text as string).match(new RegExp(`https?://\\S+${path}\\?token=\\S+`))?.[0];
  expect(url).toBeTruthy();
  return new URL(url!).pathname + new URL(url!).search;
}

test("가입하면 인증 메일이 오고, 링크로 인증하면 안내가 사라진다", async ({ page, request }) => {
  await signup(page, user, "계정테스트");
  await completeOnboarding(page);
  await page.goto("/");
  await expect(page.getByText("이메일 인증이 아직이에요")).toBeVisible();
  await page.goto(await mailLink(request, "/verify-email"));
  await page.getByRole("button", { name: "이메일 인증하기" }).click();
  await expect(page.getByText("이메일 인증이 끝났어요!")).toBeVisible();
  await page.goto("/");
  await expect(page.getByText("이메일 인증이 아직이에요")).toHaveCount(0);
});

test("비밀번호 찾기: 재설정 링크로 새 비밀번호를 정하면 예전 비밀번호는 안 된다", async ({ page, request }) => {
  await page.goto("/forgot-password");
  await page.getByLabel("이메일").fill(email);
  await page.getByRole("button", { name: "재설정 링크 받기" }).click();
  await expect(page.getByText(/재설정 링크를 보냈어요/)).toBeVisible();

  const link = await mailLink(request, "/reset-password");
  await page.goto(link);
  await page.getByLabel("새 비밀번호").fill(NEW_PASSWORD);
  await page.getByRole("button", { name: "비밀번호 바꾸기" }).click();
  await expect(page.getByText(/새 비밀번호로 바꿨어요/)).toBeVisible();

  // 같은 링크는 다시 쓸 수 없다
  await page.goto(link);
  await expect(page.getByText("링크가 만료되었거나 이미 사용되었어요.")).toBeVisible();

  // 예전 비밀번호 실패, 새 비밀번호 성공
  await page.goto("/login");
  await page.getByLabel("이메일 또는 아이디").fill(user);
  await page.getByLabel("비밀번호").fill(PASSWORD);
  await page.getByRole("button", { name: "로그인" }).click();
  await expect(page.getByText("이메일(아이디) 또는 비밀번호가 맞지 않아요.")).toBeVisible();
  await login(page, user, NEW_PASSWORD);
});

test("없는 이메일로 비밀번호 찾기를 해도 같은 안내 (가입 여부 노출 없음)", async ({ page }) => {
  await page.goto("/forgot-password");
  await page.getByLabel("이메일").fill(`nobody-${user}@e2e.test`);
  await page.getByRole("button", { name: "재설정 링크 받기" }).click();
  await expect(page.getByText(/가입된 이메일이라면 비밀번호 재설정 링크를 보냈어요/)).toBeVisible();
});

test("설정에서 비밀번호 변경 (현재 비밀번호 확인)", async ({ page }) => {
  await login(page, user, NEW_PASSWORD);
  await page.goto("/settings");
  await page.getByLabel("현재 비밀번호").fill("wrongpass1");
  await page.getByLabel("새 비밀번호").fill("another789");
  await page.getByRole("button", { name: "비밀번호 바꾸기" }).click();
  await expect(page.getByText("현재 비밀번호가 맞지 않아요.").first()).toBeVisible();
  await page.getByLabel("현재 비밀번호").fill(NEW_PASSWORD);
  await page.getByRole("button", { name: "비밀번호 바꾸기" }).click();
  await expect(page.getByText(/비밀번호를 바꿨어요/)).toBeVisible();
});

test("회원 탈퇴: 비밀번호 확인 후 모든 정보가 지워지고 다시 로그인할 수 없다", async ({ page }) => {
  await login(page, user, "another789");
  await page.goto("/settings");
  await page.getByRole("button", { name: "탈퇴하기" }).click();
  await page.getByLabel("비밀번호", { exact: true }).fill("another789");
  await page.getByLabel(/탈퇴'라고 입력/).fill("탈퇴");
  await page.getByRole("button", { name: "영구 삭제" }).click();
  await expect(page).toHaveURL(/\/$/);
  // 공간이 사라지고, 로그인도 안 된다
  const res = await page.goto(`/@${user}`);
  await expect(page.getByRole("heading", { name: "이 방은 비어 있어요" })).toBeVisible();
  void res;
  await page.goto("/login");
  await page.getByLabel("이메일 또는 아이디").fill(user);
  await page.getByLabel("비밀번호").fill("another789");
  await page.getByRole("button", { name: "로그인" }).click();
  await expect(page.getByText("이메일(아이디) 또는 비밀번호가 맞지 않아요.")).toBeVisible();
});

test("약관과 개인정보처리방침 페이지가 열린다", async ({ page }) => {
  await page.goto("/terms");
  await expect(page.getByRole("heading", { name: /이용약관/ })).toBeVisible();
  await page.goto("/privacy");
  await expect(page.getByRole("heading", { name: "개인정보처리방침" })).toBeVisible();
});
