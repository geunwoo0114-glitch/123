import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, MapPin } from "lucide-react";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/session";
import { formatDay } from "@/lib/dates";
import { getSpace } from "@/features/space/queries";
import { getDiaryForViewer } from "@/features/diary/queries";
import { moodById } from "@/features/posts/schemas";
import { weatherById } from "@/features/diary/schemas";
import { visibilityLabels } from "@/features/privacy/policy";
import { Badge, Tag } from "@/components/ui/misc";
import { PostPhotos } from "@/components/media/photo-grid";
import { DiaryOwnerActions } from "@/components/space/diary-owner-actions";

export async function generateMetadata({ params }: PageProps<"/u/[username]/diary/[id]">): Promise<Metadata> {
  const { id } = await params;
  const viewer = await getCurrentUser();
  const d = await getDiaryForViewer(id, viewer?.id ?? null);
  return d ? { title: d.title, robots: d.visibility === "PUBLIC" ? undefined : { index: false } } : { title: "일기" };
}

export default async function DiaryDetail({ params }: PageProps<"/u/[username]/diary/[id]">) {
  const { username, id } = await params;
  const viewer = await getCurrentUser();
  const space = await getSpace(username, viewer?.id ?? null);
  if (!space || !space.canView) notFound();
  const d = await getDiaryForViewer(id, viewer?.id ?? null);
  if (!d || d.authorId !== space.owner.id) notFound();
  const mood = moodById(d.mood);
  const weather = weatherById(d.weather);
  const isOwner = viewer?.id === d.authorId;
  return (
    <article className="space-card p-5 sm:p-8">
      <Link href={`/@${space.owner.username}/diary`} className="mb-4 inline-flex items-center text-caption font-medium text-fg-muted hover:text-fg">
        <ChevronLeft className="size-4" /> 다이어리
      </Link>
      <header className="mb-6 border-b border-dashed border-line-strong pb-5">
        <p className="text-caption font-semibold text-accent">{formatDay(d.date, { withYear: true, weekday: true })}</p>
        <h1 className="mt-1 text-heading font-bold">{d.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-caption text-fg-muted">
          {weather && <Badge>{weather.emoji} {weather.label}</Badge>}
          {mood && <Badge>{mood.emoji} {mood.label}</Badge>}
          {d.place && (
            <Badge>
              <MapPin className="size-3" /> {d.place}
            </Badge>
          )}
          {isOwner && <Badge tone="accent">{visibilityLabels[d.visibility]}</Badge>}
        </div>
      </header>
      <p className="text-[1.0625rem] leading-[1.9] whitespace-pre-wrap text-fg">{d.body}</p>
      {d.images.length > 0 && (
        <div className="mt-6">
          <PostPhotos images={d.images} label={d.title} />
        </div>
      )}
      {d.tags.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-1.5">
          {d.tags.map((t) => (
            <Tag key={t}>{t}</Tag>
          ))}
        </div>
      )}
      {isOwner && <DiaryOwnerActions id={d.id} username={space.owner.username} />}
    </article>
  );
}
