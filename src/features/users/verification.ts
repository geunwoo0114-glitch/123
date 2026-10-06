import "server-only";
import { issueAuthToken } from "@/lib/auth/tokens";
import { appUrl, sendMail } from "@/lib/mail";
import { brand } from "@/config/brand";

// 서버 내부 전용 (Server Action으로 노출하지 않는다: 임의 주소로 메일 발송 악용 방지)
/** 이메일 인증 메일 (가입 직후 / 다시 보내기) */
export async function sendVerificationMail(userId: string, email: string, displayName: string) {
  const token = await issueAuthToken(userId, "EMAIL_VERIFY");
  await sendMail({
    to: email,
    subject: `[${brand.name}] 이메일 주소를 확인해 주세요`,
    text: `${displayName}님, ${brand.name}에 오신 걸 환영해요!\n\n아래 링크를 눌러 이메일 주소를 확인해 주세요. (3일 동안 유효)\n${appUrl(`/verify-email?token=${token}`)}\n\n직접 가입하지 않았다면 이 메일은 무시해 주세요.`,
  });
}

