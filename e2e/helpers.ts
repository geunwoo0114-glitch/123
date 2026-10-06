import { expect, type Page } from "@playwright/test";
import sharp from "sharp";

export const PASSWORD = "testpass123";

export function uniqueName(prefix: string) {
  return `${prefix}${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`.slice(0, 20);
}

export async function signup(page: Page, username: string, displayName: string) {
  await page.goto("/signup");
  await page.getByLabel("이메일").fill(`${username}@e2e.test`);
  await page.getByLabel("아이디").fill(username);
  await page.getByLabel("이름(닉네임)").fill(displayName);
  await page.getByLabel("비밀번호").fill(PASSWORD);
  await page.getByRole("button", { name: "내 다락 만들기" }).click();
  await expect(page).toHaveURL(/\/onboarding/);
}

export async function completeOnboarding(page: Page, status = "테스트 중 🧪") {
  await page.getByRole("button", { name: "다음", exact: true }).click();
  await page.getByLabel("상태 메시지 (선택)").fill(status);
  await page.getByRole("button", { name: "다음", exact: true }).click();
  await page.getByRole("button", { name: "카페" }).click();
  await page.getByRole("button", { name: "다음", exact: true }).click();
  await page.getByRole("radio", { name: /민트/ }).click();
  await page.getByRole("button", { name: /완성/ }).click();
  await expect(page).toHaveURL(/\/explore/);
}

export async function login(page: Page, identifier: string, password = PASSWORD) {
  await page.goto("/login");
  await page.getByLabel("이메일 또는 아이디").fill(identifier);
  await page.getByLabel("비밀번호").fill(password);
  await page.getByRole("button", { name: "로그인" }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

export async function testImage(): Promise<Buffer> {
  return sharp({ create: { width: 640, height: 480, channels: 3, background: "#f2a65a" } }).jpeg().toBuffer();
}
