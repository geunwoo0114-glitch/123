import { describe, expect, it } from "vitest";
import { economy, games, memoryScore } from "./games";

describe("mini games", () => {
  it("짝꿍 찾기 점수: 8번이면 만점, 뒤집을수록 감점, 최저 10점", () => {
    expect(memoryScore(8)).toBe(100);
    expect(memoryScore(12)).toBe(80);
    expect(memoryScore(100)).toBe(10);
  });
  it("보상은 점수 상한을 넘지 않는다 (조작된 점수 방어)", () => {
    expect(games.memory.reward(999)).toBe(games.memory.reward(100));
    expect(games.catch.reward(10_000)).toBe(40);
    expect(games.catch.reward(-5)).toBe(0);
  });
  it("한 판 최대 보상은 하루 상한보다 작다", () => {
    for (const g of Object.values(games)) expect(g.reward(g.maxScore)).toBeLessThan(economy.dailyGameCap);
  });
});
