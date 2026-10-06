import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { checkLimit } from "@/lib/rate-limit";
import { appConfig } from "@/config/app";
import { createMediaFromUpload } from "@/features/media/service";
import { ImageProcessingError } from "@/lib/media/process";
import { logger } from "@/lib/logger";
import { messages } from "@/lib/action";

function error(status: number, message: string) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

/** 같은 출처에서 온 요청인지 확인 (CSRF 방어 - SameSite 쿠키에 더한 이중 방어) */
function sameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return error(403, messages.forbidden);
  const user = await getCurrentUser();
  if (!user) return error(401, messages.unauthorized);
  if (!(await checkLimit("upload", user.id))) return error(429, messages.rateLimited);

  const length = Number(req.headers.get("content-length") ?? 0);
  if (length > appConfig.upload.maxBytes + 64 * 1024) return error(413, "사진은 12MB 이하만 올릴 수 있어요.");

  let file: FormDataEntryValue | null;
  try {
    file = (await req.formData()).get("file");
  } catch {
    return error(400, "업로드 요청이 올바르지 않아요.");
  }
  if (!(file instanceof File)) return error(400, "파일을 선택해 주세요.");
  if (file.size > appConfig.upload.maxBytes) return error(413, "사진은 12MB 이하만 올릴 수 있어요.");
  if (file.type && !(appConfig.upload.allowedMime as readonly string[]).includes(file.type)) {
    return error(415, "JPG, PNG, WEBP, GIF 사진만 올릴 수 있어요.");
  }

  try {
    const media = await createMediaFromUpload(user.id, Buffer.from(await file.arrayBuffer()));
    return NextResponse.json({ ok: true, media });
  } catch (err) {
    if (err instanceof ImageProcessingError) return error(415, err.message);
    logger.error("upload failed", { err, userId: user.id });
    return error(500, messages.unknown);
  }
}
