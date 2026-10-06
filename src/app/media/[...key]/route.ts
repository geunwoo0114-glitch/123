import { storage, isValidKey } from "@/lib/media/storage";

/**
 * 업로드 이미지 제공. key는 추측 불가능한 랜덤 값이며 내용이 바뀌지 않으므로 영구 캐시한다.
 * (프로덕션에서는 CDN/오브젝트 스토리지가 이 역할을 대신한다)
 */
export async function GET(_req: Request, ctx: RouteContext<"/media/[...key]">) {
  const { key: parts } = await ctx.params;
  const key = parts.join("/");
  if (!isValidKey(key)) return new Response("Not found", { status: 404 });
  const data = await storage.get(key);
  if (!data) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'",
    },
  });
}
