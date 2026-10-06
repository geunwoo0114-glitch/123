import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { brand } from "@/config/brand";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl px-5 py-8">
      <Link href="/" aria-label={`${brand.name} 홈`}>
        <Logo />
      </Link>
      <main id="main" className="legal mt-8">
        {children}
      </main>
    </div>
  );
}
