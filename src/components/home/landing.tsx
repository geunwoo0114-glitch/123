import Link from "next/link";
import { BookHeart, DoorOpen, MessageSquareHeart, Palette, Gamepad2, NotebookPen } from "lucide-react";
import { brand } from "@/config/brand";
import { ButtonLink } from "@/components/ui/button";
import { randomAvatar, minimiUrl } from "@/features/avatar/schema";
import { isFreeItem } from "@/features/town/catalog";

const people = [
  { name: "하루", status: "☕ 카페 투어 중", seed: "haru" },
  { name: "세나", status: "✈️ 오사카 여행!", seed: "sena2" },
  { name: "도윤", status: "📚 시험기간 잠수", seed: "doyun" },
  { name: "민아", status: "🎧 새 플레이리스트", seed: "mina" },
];

const features = [
  { icon: BookHeart, title: "나만의 공간", desc: "프로필 페이지가 아니라 내 방. 테마, 배경, 위젯 배치로 나답게 꾸며요." },
  { icon: DoorOpen, title: "친구네 놀러 가기", desc: "피드는 거들 뿐. 친구의 공간에 들어가 둘러보고, 오늘의 방문자가 되어요." },
  { icon: MessageSquareHeart, title: "방명록", desc: "댓글 말고 메모지. 스티커를 붙여 친구의 공간에 흔적을 남겨요." },
  { icon: NotebookPen, title: "다이어리 & 사진첩", desc: "피드에 흘러가지 않는 기록. 캘린더로 모아 보고, 1년 전 오늘을 다시 만나요." },
  { icon: Palette, title: "미니미", desc: "웹툰풍 캐릭터로 나를 표현해요. 헤어, 옷, 안경까지 내 마음대로." },
  { icon: Gamepad2, title: brand.townName, desc: `무료 미니게임으로 ${brand.currency.name}을 모아 미니미 아이템을 사요.` },
];

/** 비로그인 첫 화면: 과한 히어로 대신 '사람'과 '공간'을 바로 보여준다 */
export function Landing() {
  return (
    <div className="mx-auto max-w-5xl px-4 pb-20">
      <section className="grid items-center gap-10 py-12 md:grid-cols-2 md:py-20">
        <div>
          <p className="mb-3 inline-flex rounded-full bg-primary-soft px-3 py-1 text-caption font-semibold text-primary">사람의 공간을 방문하는 SNS</p>
          <h1 className="text-[2.25rem] leading-tight font-extrabold tracking-tight sm:text-[2.75rem]">
            피드 말고,
            <br />
            친구네 놀러 가요.
          </h1>
          <p className="mt-4 max-w-md text-title text-fg-muted">{brand.description}</p>
          <div className="mt-8 flex flex-wrap gap-2">
            <ButtonLink href="/signup" size="lg">
              내 {brand.spaceNoun} 만들기
            </ButtonLink>
            <ButtonLink href="/login" size="lg" variant="secondary">
              로그인
            </ButtonLink>
          </div>
        </div>
        <ul className="grid grid-cols-2 gap-3" aria-label="다락 사람들 예시">
          {people.map((p, i) => (
            <li key={p.name} className="space-card p-4 text-center" style={{ transform: `rotate(${[-2, 1.5, 1, -1.5][i]}deg)` }}>
              <div className="mx-auto size-24 overflow-hidden rounded-full bg-[#fde9e1]">
                {/* eslint-disable-next-line @next/next/no-img-element -- 예시 미니미 */}
                <img src={minimiUrl(randomAvatar(p.seed, isFreeItem))} alt="" className="size-full translate-y-[4%]" />
              </div>
              <p className="mt-2 font-bold">{p.name}</p>
              <p className="text-caption text-fg-muted">{p.status}</p>
              <p className="mt-2 text-label font-semibold tracking-wide text-fg-subtle">TODAY {[12, 7, 31, 4][i]} · TOTAL {[1204, 389, 4521, 97][i]}</p>
            </li>
          ))}
        </ul>
      </section>
      <section aria-label="다락의 특징" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <div key={f.title} className="rounded-lg border border-line bg-surface p-5">
            <f.icon className="size-6 text-primary" />
            <h2 className="mt-3 text-title font-bold">{f.title}</h2>
            <p className="mt-1 text-caption text-fg-muted">{f.desc}</p>
          </div>
        ))}
      </section>
      <p className="mt-12 text-center text-caption text-fg-subtle">
        <Link href="/terms" className="underline">이용약관</Link> · <Link href="/privacy" className="font-semibold underline">개인정보처리방침</Link>
        <br />
        이미 친구가 다락에 있나요? 친구에게 받은 <b>/@아이디</b> 링크로 바로 놀러 갈 수 있어요. ·{" "}
        <Link href="/explore" className="underline">
          둘러보기
        </Link>
      </p>
    </div>
  );
}
