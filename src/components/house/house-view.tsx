"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Paintbrush, RotateCcw, RotateCw, Save, Trash2, X } from "lucide-react";
import {
  GRID,
  MAX_ITEMS,
  MAX_PER_KIND,
  categoryLabels,
  collides,
  findFreeSpot,
  floorStyles,
  footprint,
  furniture,
  furnitureByKind,
  houseItemId,
  inBounds,
  lightModes,
  tintColors,
  validateHouse,
  wallStyles,
  type FurnitureCategory,
  type HouseConfig,
  type Placement,
} from "@/features/house/schema";
import { buyItem, saveHouse } from "@/features/town/actions";
import { minimiUrl, type AvatarConfig } from "@/features/avatar/schema";
import { usePresence } from "@/components/space/presence";
import { Button, IconButton } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { brand } from "@/config/brand";
import { cn } from "@/lib/cn";
import type { Person } from "./scene";

// three.js 번들은 이 화면에서만 내려받는다
const HouseScene = dynamic(() => import("./scene"), {
  ssr: false,
  loading: () => (
    <div className="flex size-full items-center justify-center">
      <Spinner className="size-7 text-primary" label="집 불러오는 중" />
    </div>
  ),
});

type Owner = { username: string; displayName: string; minimi: AvatarConfig | null };

function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/** 화면 기준 방향키 → 칸 이동 (카메라가 돌아가 있으면 같이 돌린다) */
const arrowDirs: Record<string, [number, number]> = { ArrowUp: [0, -1], ArrowRight: [1, 0], ArrowDown: [0, 1], ArrowLeft: [-1, 0] };
function rotateDir([dx, dz]: [number, number], view: number): [number, number] {
  let v: [number, number] = [dx, dz];
  for (let i = 0; i < view; i++) v = [-v[1], v[0]];
  return v;
}

export function HouseView({
  initial,
  owner,
  isOwner,
  presence,
  owned = [],
  coins = 0,
}: {
  initial: HouseConfig;
  owner: Owner;
  isOwner: boolean;
  /** 로그인 사용자일 때 함께 있는 사람 표시 */
  presence: boolean;
  owned?: string[];
  coins?: number;
}) {
  const [house, setHouse] = useState(initial);
  const [view, setView] = useState(0);
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [panel, setPanel] = useState<FurnitureCategory | "room">("living");
  const [ownedSet, setOwnedSet] = useState(() => new Set(owned));
  const [balance, setBalance] = useState(coins);
  const [supported] = useState(() => typeof window === "undefined" || webglAvailable());
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const people = usePresence(presence ? owner.username : null);

  const ownerPerson: Person = useMemo(
    () => ({ id: "owner", name: owner.displayName, minimiUrl: owner.minimi ? minimiUrl(owner.minimi) : null, isHost: true }),
    [owner.displayName, owner.minimi],
  );
  // 주인이 지금 접속해 있으면 presence 목록에도 있으니 중복을 뺀다
  const visitors: Person[] = useMemo(
    () => people.filter((p) => !p.isHost).map((p) => ({ id: p.id, name: p.displayName, minimiUrl: p.minimi ? minimiUrl(p.minimi) : null })),
    [people],
  );
  const dirty = editing && JSON.stringify(house) !== JSON.stringify(initial);
  const problem = editing ? validateHouse(house, ownedSet) : null;
  const sel = selected !== null ? house.items[selected] : null;
  const selDef = sel ? furnitureByKind.get(sel.k) : null;

  /** 겹치지 않고 방 안일 때만 바뀐 배치를 돌려준다 */
  function placed(index: number, patch: Partial<Placement>): Placement[] | null {
    const next = house.items.map((p, i) => (i === index ? { ...p, ...patch } : p));
    const def = furnitureByKind.get(next[index].k)!;
    if (patch.r !== undefined) {
      // 회전으로 방 밖으로 나가면 안쪽으로 당겨 준다
      const f = footprint(def, next[index].r);
      next[index] = { ...next[index], x: Math.min(next[index].x, GRID - f.w), z: Math.min(next[index].z, GRID - f.d) };
    }
    if (!inBounds(next[index], def) || collides(next, index)) return null;
    return next;
  }

  function tryPlace(index: number, patch: Partial<Placement>) {
    const items = placed(index, patch);
    if (items) setHouse((h) => ({ ...h, items }));
    return !!items;
  }

  const onMove = (i: number, x: number, z: number) => void tryPlace(i, { x, z });

  function rotateSel() {
    if (selected === null || !sel) return;
    if (!tryPlace(selected, { r: (sel.r + 1) % 4 })) toast("돌릴 자리가 없어요. 조금 옮긴 뒤 돌려 보세요.");
  }

  function removeSel() {
    if (selected === null) return;
    setHouse((h) => ({ ...h, items: h.items.filter((_, i) => i !== selected) }));
    setSelected(null);
  }

  function nudge(dx: number, dz: number) {
    if (selected === null || !sel) return;
    const [rx, rz] = rotateDir([dx, dz], view);
    tryPlace(selected, { x: sel.x + rx, z: sel.z + rz });
  }

  function addItem(kind: string) {
    if (house.items.length >= MAX_ITEMS) return toast(`가구는 ${MAX_ITEMS}개까지 놓을 수 있어요.`, "error");
    if (house.items.filter((p) => p.k === kind).length >= MAX_PER_KIND) return toast(`같은 가구는 ${MAX_PER_KIND}개까지예요.`, "error");
    const spot = findFreeSpot(house.items, kind);
    if (!spot) return toast("빈 자리가 없어요. 가구를 조금 치워 보세요.", "error");
    setHouse((h) => ({ ...h, items: [...h.items, spot] }));
    setSelected(house.items.length);
  }

  function buy(kind: string) {
    start(async () => {
      const res = await buyItem(houseItemId(kind));
      if (!res.ok) return toast(res.error, "error");
      setOwnedSet((s) => new Set(s).add(houseItemId(kind)));
      if (res.data) setBalance(res.data.coins);
      toast(res.message ?? "샀어요!");
      addItem(kind);
    });
  }

  function save() {
    start(async () => {
      const res = await saveHouse(house);
      if (!res.ok) return toast(res.error, "error");
      toast(res.message ?? "저장했어요.");
      setEditing(false);
      setSelected(null);
      router.refresh();
    });
  }

  function cancel() {
    setHouse(initial);
    setEditing(false);
    setSelected(null);
  }

  // 편집 중 키보드: 방향키 이동, R 회전, Delete 삭제, Esc 선택 해제
  useEffect(() => {
    if (!editing) return;
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select")) return;
      if (selected === null) return;
      if (arrowDirs[e.key]) {
        e.preventDefault();
        nudge(...arrowDirs[e.key]);
      } else if (e.key === "r" || e.key === "R") rotateSel();
      else if (e.key === "Delete" || e.key === "Backspace") removeSel();
      else if (e.key === "Escape") setSelected(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // 저장하지 않고 떠나려 하면 확인
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const c = brand.currency;
  const label = `${owner.displayName}님의 2.5D 집. 가구 ${house.items.length}개${visitors.length ? `, 지금 ${visitors.length}명이 놀러 와 있어요` : ""}.`;

  return (
    <div className="flex flex-col gap-4">
      <section className="space-card relative overflow-hidden" aria-label="2.5D 집">
        <div className="relative aspect-[4/3] w-full touch-none select-none sm:aspect-[16/10]">
          {supported ? (
            <HouseScene house={house} view={view} owner={ownerPerson} visitors={visitors} editable={editing} selected={selected} onSelect={setSelected} onMove={onMove} label={label} />
          ) : (
            <p className="flex size-full items-center justify-center p-6 text-center text-body text-fg-muted">이 기기에서는 2.5D 집을 볼 수 없어요. (WebGL 미지원)</p>
          )}
        </div>

        {/* 보기 조작 */}
        <div className="absolute top-3 right-3 flex gap-1.5">
          <IconButton label="왼쪽으로 돌려 보기" onClick={() => setView((v) => (v + 3) % 4)} className="bg-surface/90 shadow-1 backdrop-blur">
            <RotateCcw className="size-4" />
          </IconButton>
          <IconButton label="오른쪽으로 돌려 보기" onClick={() => setView((v) => (v + 1) % 4)} className="bg-surface/90 shadow-1 backdrop-blur">
            <RotateCw className="size-4" />
          </IconButton>
        </div>
        {!editing && visitors.length > 0 && (
          <p className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-surface/90 px-3 py-1 text-label font-bold text-fg shadow-1" aria-live="polite">
            <span className="size-2 animate-pulse rounded-full bg-success" aria-hidden />
            지금 {visitors.length}명이 놀러 와 있어요
          </p>
        )}
        {isOwner && !editing && (
          <Button className="absolute right-3 bottom-3 shadow-2" icon={<Paintbrush className="size-4" />} onClick={() => setEditing(true)}>
            집 꾸미기
          </Button>
        )}

        {/* 선택한 가구 도구 */}
        {editing && sel && selDef && (
          <div className="absolute inset-x-3 bottom-3 flex flex-wrap items-center gap-1.5 rounded-lg bg-surface/95 p-2 shadow-2 backdrop-blur" role="toolbar" aria-label={`${selDef.name} 조작`}>
            <strong className="mr-auto px-1 text-caption">{selDef.name}</strong>
            <span className="hidden gap-1 sm:flex">
              <IconButton size="sm" label="위로" onClick={() => nudge(0, -1)}><ArrowUp className="size-4" /></IconButton>
              <IconButton size="sm" label="아래로" onClick={() => nudge(0, 1)}><ArrowDown className="size-4" /></IconButton>
              <IconButton size="sm" label="왼쪽으로" onClick={() => nudge(-1, 0)}><ArrowLeft className="size-4" /></IconButton>
              <IconButton size="sm" label="오른쪽으로" onClick={() => nudge(1, 0)}><ArrowRight className="size-4" /></IconButton>
            </span>
            <IconButton size="sm" label="돌리기 (R)" onClick={rotateSel}><RotateCw className="size-4" /></IconButton>
            <IconButton size="sm" label="치우기 (Delete)" onClick={removeSel}><Trash2 className="size-4" /></IconButton>
            {selDef.tint && (
              <span className="flex w-full gap-1 pt-1" role="radiogroup" aria-label="색">
                {tintColors.map((t, i) => (
                  <button
                    key={t.name}
                    type="button"
                    role="radio"
                    aria-checked={sel.c === i}
                    aria-label={t.name}
                    title={t.name}
                    onClick={() => selected !== null && tryPlace(selected, { c: i })}
                    className={cn("size-7 rounded-full border-2", sel.c === i ? "border-primary" : "border-line")}
                    style={{ background: t.color ?? "linear-gradient(135deg,#e9dfcf,#b99a7a)" }}
                  />
                ))}
              </span>
            )}
          </div>
        )}
      </section>

      {editing && (
        <aside className="space-card flex flex-col gap-3 p-4" aria-label="집 꾸미기">
          <div className="flex items-center justify-between">
            <h2 className="text-title font-bold">집 꾸미기</h2>
            <span className="text-caption font-semibold text-fg-muted">
              {c.emoji} {balance.toLocaleString()}
            </span>
          </div>
          <p className="text-label text-fg-subtle">가구를 눌러 고른 뒤 끌어서 옮겨요. 방향키로 한 칸씩, R로 돌리기, Delete로 치우기.</p>
          <div className="scrollbar-none -mx-1 flex gap-1 overflow-x-auto px-1" role="tablist" aria-label="분류">
            {(["living", "bed", "study", "kitchen", "deco", "room"] as const).map((k) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={panel === k}
                onClick={() => setPanel(k)}
                className={cn("h-8 shrink-0 rounded-full px-3 text-caption font-semibold", panel === k ? "bg-primary text-on-primary" : "bg-surface-muted text-fg-muted hover:text-fg")}
              >
                {k === "room" ? "벽·바닥" : categoryLabels[k]}
              </button>
            ))}
          </div>

          {panel === "room" ? (
            <div className="flex flex-col gap-4">
              <Swatches label="벽지" items={wallStyles.map((w) => ({ name: w.name, color: w.color }))} value={house.wall} onChange={(wall) => setHouse((h) => ({ ...h, wall }))} />
              <Swatches label="바닥" items={floorStyles.map((f) => ({ name: f.name, color: f.base }))} value={house.floor} onChange={(floor) => setHouse((h) => ({ ...h, floor }))} />
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 text-caption font-bold">시간</legend>
                <div className="flex gap-1.5">
                  {lightModes.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      aria-pressed={house.light === m.id}
                      onClick={() => setHouse((h) => ({ ...h, light: m.id }))}
                      className={cn("h-9 flex-1 rounded-md text-caption font-semibold", house.light === m.id ? "bg-primary text-on-primary" : "bg-surface-muted text-fg")}
                    >
                      {m.name}
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>
          ) : (
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4" role="tabpanel">
              {furniture
                .filter((f) => f.category === panel)
                .map((f) => {
                  const have = f.price === 0 || ownedSet.has(houseItemId(f.kind));
                  const placed = house.items.filter((p) => p.k === f.kind).length;
                  return (
                    <li key={f.kind} className="flex flex-col gap-1.5 rounded-md border border-line p-2.5">
                      <span className="text-caption font-semibold">{f.name}</span>
                      <span className="text-label text-fg-subtle">{have ? (placed ? `놓은 개수 ${placed}/${MAX_PER_KIND}` : f.price === 0 ? "기본 가구" : "보유") : `${c.emoji} ${f.price}`}</span>
                      {have ? (
                        <Button size="sm" variant="soft" onClick={() => addItem(f.kind)} disabled={placed >= MAX_PER_KIND} aria-label={`${f.name} 놓기`}>
                          놓기
                        </Button>
                      ) : (
                        <Button size="sm" variant="primary" onClick={() => buy(f.kind)} disabled={pending || balance < f.price} aria-label={`${f.name} 사기 (${f.price}${c.name})`}>
                          사기
                        </Button>
                      )}
                    </li>
                  );
                })}
            </ul>
          )}

          <details className="rounded-md bg-surface-muted px-3 py-2">
            <summary className="cursor-pointer text-caption font-semibold">놓인 가구 {house.items.length}/{MAX_ITEMS}</summary>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {house.items.map((p, i) => (
                <li key={`${i}-${p.k}`}>
                  <button type="button" aria-pressed={selected === i} onClick={() => setSelected(i)} className={cn("rounded-full px-2.5 py-1 text-label font-medium", selected === i ? "bg-primary text-on-primary" : "bg-surface text-fg")}>
                    {furnitureByKind.get(p.k)?.name}
                  </button>
                </li>
              ))}
            </ul>
          </details>

          {problem && <p className="text-caption font-medium text-danger" role="alert">{problem}</p>}
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" icon={<X className="size-4" />} onClick={cancel} disabled={pending}>
              취소
            </Button>
            <Button className="flex-1" icon={<Save className="size-4" />} onClick={save} loading={pending} disabled={!!problem || !dirty}>
              저장
            </Button>
          </div>
        </aside>
      )}
    </div>
  );
}

function Swatches({ label, items, value, onChange }: { label: string; items: { name: string; color: string }[]; value: number; onChange: (i: number) => void }) {
  return (
    <fieldset>
      <legend className="mb-2 text-caption font-bold">{label}</legend>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
        {items.map((it, i) => (
          <button
            key={it.name}
            type="button"
            role="radio"
            aria-checked={value === i}
            onClick={() => onChange(i)}
            className={cn("flex flex-col items-center gap-1 rounded-md p-1 text-label", value === i ? "bg-primary-soft font-bold text-fg" : "text-fg-muted")}
          >
            <span className={cn("size-9 rounded-md border-2", value === i ? "border-primary" : "border-line")} style={{ background: it.color }} />
            {it.name}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
