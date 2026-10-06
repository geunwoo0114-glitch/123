import { ButtonLink } from "@/components/ui/button";
import { LogoMark } from "@/components/brand/logo";

export default function NotFound() {
  return (
    <main id="main" className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <LogoMark className="size-14" />
      <h1 className="text-heading font-bold">이 방은 비어 있어요</h1>
      <p className="max-w-sm text-fg-muted">주소가 바뀌었거나, 삭제되었거나, 볼 수 없는 공간이에요.</p>
      <ButtonLink href="/">홈으로</ButtonLink>
    </main>
  );
}
