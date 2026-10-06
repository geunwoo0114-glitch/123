import { Skeleton } from "@/components/ui/misc";

export default function Loading() {
  return (
    <div className="mx-auto max-w-[600px] px-4 pt-6" aria-busy="true" aria-label="불러오는 중">
      <div className="flex gap-3">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="size-14 rounded-full" />
        ))}
      </div>
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="mt-4 rounded-lg border border-line bg-surface p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-full" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="mt-4 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-2/3" />
          <Skeleton className="mt-4 aspect-[4/3] w-full" />
        </div>
      ))}
    </div>
  );
}
