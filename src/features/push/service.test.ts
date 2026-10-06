import { beforeEach, describe, expect, it, vi } from "vitest";

const sendNotification = vi.fn();
const db = {
  pushSubscription: { findMany: vi.fn(), deleteMany: vi.fn() },
  userSettings: { findUnique: vi.fn() },
};

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db }));
vi.mock("web-push", () => ({ default: { setVapidDetails: vi.fn(), sendNotification } }));

process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "test-public";
process.env.VAPID_PRIVATE_KEY = "test-private";

const { isQuietHour, sendPush } = await import("./service");

describe("isQuietHour (Asia/Seoul)", () => {
  it("밤 11시~아침 8시는 조용한 시간", () => {
    expect(isQuietHour(new Date("2026-10-06T14:30:00Z"))).toBe(true); // 23:30 KST
    expect(isQuietHour(new Date("2026-10-06T22:59:00Z"))).toBe(true); // 07:59 KST
  });
  it("낮 시간은 보낸다", () => {
    expect(isQuietHour(new Date("2026-10-06T23:00:00Z"))).toBe(false); // 08:00 KST
    expect(isQuietHour(new Date("2026-10-06T05:00:00Z"))).toBe(false); // 14:00 KST
  });
});

describe("sendPush", () => {
  const subs = [
    { id: "s1", endpoint: "https://push.example/1", p256dh: "k1", auth: "a1" },
    { id: "s2", endpoint: "https://push.example/2", p256dh: "k2", auth: "a2" },
  ];
  beforeEach(() => {
    vi.clearAllMocks();
    db.pushSubscription.findMany.mockResolvedValue(subs);
    db.userSettings.findUnique.mockResolvedValue({ pushQuietHours: false });
  });

  it("모든 기기로 보내고, 만료(410)된 구독은 지운다", async () => {
    sendNotification.mockResolvedValueOnce({}).mockRejectedValueOnce(Object.assign(new Error("gone"), { statusCode: 410 }));
    await sendPush("u1", { title: "t", body: "b", url: "/x" });
    expect(sendNotification).toHaveBeenCalledTimes(2);
    expect(JSON.parse(sendNotification.mock.calls[0][1])).toMatchObject({ title: "t", body: "b", url: "/x" });
    expect(db.pushSubscription.deleteMany).toHaveBeenCalledWith({ where: { id: "s2" } });
  });

  it("일시적 오류(500)는 구독을 지우지 않는다", async () => {
    sendNotification.mockRejectedValue(Object.assign(new Error("boom"), { statusCode: 500 }));
    await sendPush("u1", { title: "t", body: "b", url: "/x" });
    expect(db.pushSubscription.deleteMany).not.toHaveBeenCalled();
  });

  it("'밤에는 조용히'가 켜져 있으면 조용한 시간에 보내지 않는다", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-06T15:00:00Z")); // 자정 KST
    db.userSettings.findUnique.mockResolvedValue({ pushQuietHours: true });
    await sendPush("u1", { title: "t", body: "b", url: "/x" });
    expect(sendNotification).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("구독이 없으면 아무것도 보내지 않는다", async () => {
    db.pushSubscription.findMany.mockResolvedValue([]);
    await sendPush("u1", { title: "t", body: "b", url: "/x" });
    expect(sendNotification).not.toHaveBeenCalled();
  });
});
