import Link from "next/link";
import { brand } from "@/config/brand";
import { Minimi } from "@/features/avatar/minimi";
import { randomAvatar } from "@/features/avatar/schema";
import { Logo } from "@/components/brand/logo";

const crowd = ["haru", "sena", "doyun", "mina", "jun"].map((s) => randomAvatar(s));

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(440px,520px)]">
      <aside className="space-bg space-bg-dots relative hidden flex-col justify-between p-12 lg:flex" style={{ ["--space-tint" as string]: "#fbf0e8" }}>
        <Link href="/" aria-label={`${brand.name} 홈`}>
          <Logo />
        </Link>
        <div className="max-w-md">
          <div className="mb-8 flex items-end gap-1">
            {crowd.map((c, i) => (
              <div key={i} className="size-20 overflow-hidden rounded-full border-4 border-white shadow-2" style={{ transform: `translateY(${i % 2 ? -10 : 0}px)` }}>
                <Minimi config={c} withBg className="size-full translate-y-[4%] scale-105" />
              </div>
            ))}
          </div>
          <h1 className="text-[2.5rem] leading-tight font-bold tracking-tight text-fg">
            피드 말고,
            <br />
            친구네 놀러 가요.
          </h1>
          <p className="mt-4 text-title text-fg-muted">{brand.description}</p>
        </div>
        <p className="text-caption text-fg-subtle">© {new Date().getFullYear()} {brand.name}</p>
      </aside>
      <main id="main" className="flex flex-col justify-center bg-surface px-5 py-10 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <Link href="/" className="mb-10 inline-block lg:hidden" aria-label={`${brand.name} 홈`}>
            <Logo />
          </Link>
          {children}
        </div>
      </main>
    </div>
  );
}
