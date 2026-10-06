import { storage, isValidKey } from "@/lib/media/storage";
import { getCurrentUser } from "@/lib/auth/session";
import { mediaAccess } from "@/features/media/access";

const notFound = () => new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });

/**
 * 업로드 이미지 제공. 이미지가 쓰인 콘텐츠의 공개 범위를 검사한다.
 * - 전체 공개 이미지는 공유 캐시(CDN) 허용
 * - 친구/친한 친구/나만 보기 이미지는 브라우저 캐시만 (Vary: Cookie)
 */
export async function GET(_req: Request, ctx: RouteContext<"/media/[...key]">) {
  const { key: parts } = await ctx.params;
  const key = parts.join("/");
  if (!isValidKey(key)) return notFound();
  const viewer = await getCurrentUser();
  const access = await mediaAccess(key, viewer ? { id: viewer.id, role: viewer.role } : null);
  if (!access) return notFound();
  const data = await storage.get(key);
  if (!data) return notFound();
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": access === "public" ? "public, max-age=31536000, immutable" : "private, max-age=3600",
      Vary: "Cookie",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'",
    },
  });
}
