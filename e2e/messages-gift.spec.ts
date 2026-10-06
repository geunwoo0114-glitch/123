import { test, expect } from "@playwright/test";
import { completeOnboarding, login, signup, uniqueName } from "./helpers";

test.describe.configure({ mode: "serial" });

const a = uniqueName("dma");
const b = uniqueName("dmb");

test("친구가 아니면 쪽지를 보낼 수 없고, 친구가 되면 주고받을 수 있다", async ({ browser }) => {
  const ca = await browser.newContext();
  const pa = await ca.newPage();
  await signup(pa, a, "쪽지에이");
  await completeOnboarding(pa);

  const cb = await browser.newContext();
  const pb = await cb.newPage();
  await signup(pb, b, "쪽지비");
  await completeOnboarding(pb);

  // 기본 정책은 '친구만'
  await pa.goto(`/messages/${b}`);
  await expect(pa.getByText("친구에게만 쪽지를 보낼 수 있어요.")).toBeVisible();
  await expect(pa.getByLabel("쪽지 내용")).toHaveCount(0);

  // 친구 맺기
  await pa.goto(`/@${b}`);
  await pa.getByRole("button", { name: "친구 신청" }).click();
  await pa.getByRole("button", { name: "신청 보내기" }).click();
  await expect(pa.getByRole("button", { name: "신청 취소" })).toBeVisible();
  await pb.goto("/friends");
  await pb.getByRole("button", { name: "수락", exact: true }).click();
  await expect(pb.getByText(/내 친구 1/)).toBeVisible();

  // 쪽지 보내기 (공간의 쪽지 버튼에서 진입)
  await pa.goto(`/@${b}`);
  await pa.getByRole("link", { name: /쪽지 보내기/ }).click();
  await pa.getByLabel("쪽지 내용").fill("안녕! 첫 쪽지야");
  await pa.getByLabel("쪽지 내용").press("Enter");
  await expect(pa.getByRole("log").getByText("안녕! 첫 쪽지야")).toBeVisible();
  // 낙관적 표시('보내는 중')가 끝나고 서버 저장이 완료될 때까지 기다린다
  await expect(pa.getByRole("log").getByText("보내는 중")).toHaveCount(0);

  // 실시간(SSE): 받는 사람 브라우저의 이벤트 스트림으로 쪽지가 즉시 도착한다
  await pb.goto("/");
  const received = pb.evaluate(
    () =>
      new Promise<string>((resolve, reject) => {
        const es = new EventSource("/api/events");
        const t = setTimeout(() => reject(new Error("timeout")), 8000);
        es.addEventListener("dm", (e) => {
          clearTimeout(t);
          es.close();
          resolve(JSON.parse((e as MessageEvent).data).message.body);
        });
        es.onopen = () => (window as unknown as { __sseOpen: boolean }).__sseOpen = true;
      }),
  );
  await pb.waitForFunction(() => (window as unknown as { __sseOpen?: boolean }).__sseOpen === true);
  await pa.getByLabel("쪽지 내용").fill("실시간으로 가나요?");
  await pa.getByLabel("쪽지 내용").press("Enter");
  expect(await received).toBe("실시간으로 가나요?");

  // 받은 사람 쪽지함에 안 읽은 대화로 보이고, 답장하면 폴링으로 전달된다
  await pb.goto("/messages");
  await expect(pb.getByLabel("안 읽은 쪽지")).toBeVisible();
  await pb.getByText("실시간으로 가나요?").click();
  await pb.getByLabel("쪽지 내용").fill("반가워 :)");
  await pb.getByRole("button", { name: "보내기" }).click();
  await expect(pa.getByRole("log").getByText("반가워 :)")).toBeVisible({ timeout: 10_000 });

  await ca.close();
  await cb.close();
});

test("친구에게 미니미 아이템을 선물하면 친구 옷장에 들어간다", async ({ browser }) => {
  const ca = await browser.newContext();
  const pa = await ca.newPage();
  await login(pa, a);
  await pa.goto("/town/shop");
  await pa.getByRole("button", { name: "헤어 No.04 친구에게 선물하기" }).click();
  await pa.getByRole("radio", { name: /쪽지비/ }).click();
  await pa.getByLabel("한마디 (선택)").fill("선물이야 🎁");
  await pa.getByRole("button", { name: "선물 보내기" }).click();
  await expect(pa.getByText(/선물했어요/)).toBeVisible();

  const cb = await browser.newContext();
  const pb = await cb.newPage();
  await login(pb, b);
  await pb.goto("/notifications");
  await expect(pb.getByText("님이 미니미 아이템을 선물했어요 🎁")).toBeVisible();
  await pb.goto("/town/closet");
  await expect(pb.getByText("선물이야 🎁")).toBeVisible();
  // 선물받은 헤어 No.04는 잠금 해제되어 선택할 수 있다
  await expect(pb.getByRole("button", { name: "4번 선택", exact: true })).toBeEnabled();
  await ca.close();
  await cb.close();
});
