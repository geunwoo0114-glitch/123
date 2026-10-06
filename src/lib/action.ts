import type { z } from "zod";

/** 모든 Server Action의 공통 응답 형식 */
export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export const initialActionState: ActionResult<never> | null = null;

export function ok<T>(data?: T, message?: string): ActionResult<T> {
  return { ok: true, data, message };
}

export function fail(error: string, fieldErrors?: Record<string, string>): { ok: false; error: string; fieldErrors?: Record<string, string> } {
  return { ok: false, error, fieldErrors };
}

/** zod 오류를 필드별 첫 메시지로 변환 */
export function fromZodError(error: z.ZodError): { ok: false; error: string; fieldErrors: Record<string, string> } {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    fieldErrors[key] ??= issue.message;
  }
  return { ok: false, error: Object.values(fieldErrors)[0] ?? "입력값을 확인해 주세요.", fieldErrors };
}

export const messages = {
  unauthorized: "로그인이 필요해요.",
  forbidden: "권한이 없어요.",
  notFound: "찾을 수 없어요. 삭제되었거나 볼 수 없는 콘텐츠예요.",
  rateLimited: "잠시 후에 다시 시도해 주세요. 요청이 너무 많아요.",
  unknown: "문제가 생겼어요. 잠시 후 다시 시도해 주세요.",
  blocked: "이 사용자와는 상호작용할 수 없어요.",
} as const;
