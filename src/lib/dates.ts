import { appConfig } from "@/config/app";

const tz = appConfig.serviceTimezone;

/** 서비스 타임존 기준 YYYY-MM-DD */
export function serviceDay(date: Date = new Date(), timeZone: string = tz): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** YYYY-MM-DD → UTC 자정 Date (DB @db.Date 저장용) */
export function dayToDate(day: string): Date {
  return new Date(`${day}T00:00:00.000Z`);
}

/** DB @db.Date → YYYY-MM-DD */
export function dateToDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function isValidDay(day: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const d = dayToDate(day);
  return !Number.isNaN(d.getTime()) && dateToDay(d) === day;
}

const rtf = new Intl.RelativeTimeFormat("ko", { numeric: "auto" });

/** "방금 전", "3분 전", "어제", "9월 12일" */
export function relativeTime(date: Date | string, now: Date = new Date()): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diffSec = Math.round((d.getTime() - now.getTime()) / 1000);
  const abs = Math.abs(diffSec);
  if (abs < 45) return "방금 전";
  if (abs < 60 * 60) return rtf.format(Math.round(diffSec / 60), "minute");
  if (abs < 60 * 60 * 24) return rtf.format(Math.round(diffSec / 3600), "hour");
  if (abs < 60 * 60 * 24 * 7) return rtf.format(Math.round(diffSec / 86400), "day");
  return formatDate(d, { withYear: d.getFullYear() !== now.getFullYear() });
}

export function formatDate(date: Date | string, opts: { withYear?: boolean; weekday?: boolean } = {}): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: tz,
    year: opts.withYear ? "numeric" : undefined,
    month: "long",
    day: "numeric",
    weekday: opts.weekday ? "short" : undefined,
  }).format(d);
}

/** YYYY-MM-DD 를 사람이 읽는 형태로 (타임존 변환 없이) */
export function formatDay(day: string, opts: { withYear?: boolean; weekday?: boolean } = {}): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "UTC",
    year: opts.withYear ? "numeric" : undefined,
    month: "long",
    day: "numeric",
    weekday: opts.weekday ? "short" : undefined,
  }).format(dayToDate(day));
}
