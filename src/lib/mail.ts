import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { brand } from "@/config/brand";

/**
 * 메일 발송. SMTP_URL이 있으면 실제로 보내고,
 * 없으면 개발 환경에서는 DevMail 테이블과 서버 로그에 남긴다 (production에서는 보내지 못했다고 기록만).
 */
let transporter: Transporter | null = null;
function smtp() {
  if (!process.env.SMTP_URL) return null;
  transporter ??= nodemailer.createTransport(process.env.SMTP_URL);
  return transporter;
}

export type Mail = { to: string; subject: string; text: string };

export async function sendMail(mail: Mail): Promise<void> {
  const t = smtp();
  try {
    if (t) {
      await t.sendMail({ from: process.env.MAIL_FROM ?? `${brand.name} <no-reply@darak.app>`, ...mail });
      return;
    }
    if (process.env.NODE_ENV === "production") {
      logger.error("SMTP_URL이 설정되지 않아 메일을 보내지 못했어요", { subject: mail.subject });
      return;
    }
    await db.devMail.create({ data: mail });
    logger.info(`[dev mail] to=${mail.to} subject=${mail.subject}\n${mail.text}`);
  } catch (err) {
    logger.error("sendMail failed", { err, subject: mail.subject });
  }
}

export function appUrl(path: string) {
  return new URL(path, process.env.APP_URL ?? "http://localhost:3000").toString();
}
