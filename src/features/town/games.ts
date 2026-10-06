/**
 * 미니게임 정의 (클라이언트/서버 공용).
 * 서버는 시작 시각을 기록하고, 종료 시 '그 시간 안에 가능한 점수인지'를 검증한다.
 */
export type GameId = "memory" | "catch";

export type GameDef = {
  id: GameId;
  name: string;
  emoji: string;
  description: string;
  /** 이보다 빨리 끝낼 수 없음 (초) */
  minSeconds: number;
  maxSeconds: number;
  maxScore: number;
  reward: (score: number) => number;
};

export const games: Record<GameId, GameDef> = {
  memory: {
    id: "memory",
    name: "짝꿍 찾기",
    emoji: "🃏",
    description: "같은 그림 카드 8쌍을 찾아요. 적게 뒤집을수록 점수가 높아요.",
    minSeconds: 8,
    maxSeconds: 600,
    maxScore: 100,
    reward: (score) => 5 + Math.floor(Math.max(0, Math.min(100, score)) / 5),
  },
  catch: {
    id: "catch",
    name: "밤톨 줍기",
    emoji: "🧺",
    description: "30초 동안 떨어지는 밤톨을 바구니로 받아요. 벌레는 피하세요!",
    minSeconds: 29,
    maxSeconds: 120,
    maxScore: 80,
    reward: (score) => Math.floor(Math.max(0, Math.min(80, score)) / 2),
  },
};

export const gameIds = Object.keys(games) as GameId[];

/** 하루 미니게임 보상 상한 / 출석 보상 / 가입 보상 */
export const economy = {
  dailyGameCap: 200,
  attendance: 30,
  attendanceStreakBonus: 50,
  streakDays: 7,
  signupBonus: 100,
} as const;

/** 짝꿍 찾기 점수: 최소 8번(완벽) 뒤집기 기준 감점 */
export function memoryScore(moves: number): number {
  return Math.max(10, 100 - Math.max(0, moves - 8) * 5);
}
