import { decodeAvatar } from "@/features/avatar/schema";
import { renderMinimiSvg } from "@/features/avatar/render";

/** 미니미 SVG. 코드가 같으면 그림도 같으므로 영구 캐시한다. */
export async function GET(_req: Request, ctx: RouteContext<"/minimi/[code]">) {
  const { code } = await ctx.params;
  const config = decodeAvatar(code);
  if (!config) return new Response("Not found", { status: 404 });
  return new Response(renderMinimiSvg(config), {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'",
    },
  });
}
