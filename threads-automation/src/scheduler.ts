import type { Post, Settings } from "./schema.js";
import { addLog, nowIso, type Store } from "./store.js";
import { ThreadsClient, ThreadsError } from "./threads.js";

const RETRY_DELAYS_MIN = [2, 10, 30];
const MAX_ATTEMPTS = RETRY_DELAYS_MIN.length + 1;

const DAY_MS = 24 * 60 * 60 * 1000;
const time = (iso: string | null) => (iso ? Date.parse(iso) : NaN);

export interface Plan {
  /** 프로그램이 꺼져 있어서 예약 시간을 너무 넘긴 글: 자동으로 올리지 않는다 */
  missed: string[];
  /** 지금 올릴 글(한 번에 하나) */
  next: string | null;
  /** 올릴 글이 있는데 내 한도 때문에 기다리는 이유 */
  waiting: string | null;
}

/**
 * 지금 무엇을 해야 하는지 정한다. 순수 함수라 시험하기 쉽다.
 * startedAt: 프로그램이 켜진 시각. 켜지기 전에 예약 시간이 지나 버린 글만 '놓침'이 될 수 있다
 * (켜져 있는 동안 내 한도 때문에 기다린 글은 놓친 것이 아니다).
 */
export function plan(posts: Post[], now: Date, schedule: Settings["schedule"], startedAt: Date = now): Plan {
  const t = now.getTime();
  const missed: string[] = [];
  const due: Post[] = [];

  for (const p of posts) {
    if (p.status !== "scheduled") continue;
    const at = time(p.scheduledAt);
    if (Number.isNaN(at) || at > t) continue;
    if (p.nextAttemptAt && time(p.nextAttemptAt) > t) continue;
    if (p.attempts === 0 && startedAt.getTime() - at > schedule.missedGraceMinutes * 60_000) missed.push(p.id);
    else due.push(p);
  }
  due.sort((a, b) => time(a.scheduledAt) - time(b.scheduledAt));
  if (due.length === 0) return { missed, next: null, waiting: null };

  const published = posts.map((p) => time(p.publishedAt)).filter((x) => !Number.isNaN(x) && t - x < DAY_MS);
  if (published.length >= schedule.maxPerDay) {
    return { missed, next: null, waiting: `최근 24시간 동안 ${published.length}개를 올려 내 한도(${schedule.maxPerDay}개)에 닿았습니다.` };
  }
  const last = Math.max(-Infinity, ...published);
  const gapMs = schedule.minGapMinutes * 60_000;
  if (t - last < gapMs) {
    return { missed, next: null, waiting: `글 사이 최소 간격(${schedule.minGapMinutes}분)을 지키려고 기다립니다.` };
  }
  return { missed, next: due[0].id, waiting: null };
}

export interface PublishDeps {
  store: Store;
  settings: Settings;
  client: ThreadsClient;
  now?: () => Date;
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function patch(store: Store, id: string, fn: (post: Post) => void): Promise<Post> {
  return store.update((data) => {
    const post = data.posts.find((p) => p.id === id);
    if (!post) throw new Error("글을 찾을 수 없습니다.");
    fn(post);
    return structuredClone(post);
  });
}

/**
 * 글 하나를 실제로 올린다. 단계마다 상태를 저장해서, 중간에 꺼져도 무엇까지 했는지 남는다.
 * 컨테이너 ID를 먼저 저장해 두므로 같은 글을 두 번 만들지 않는다.
 */
export async function publishPost(id: string, deps: PublishDeps): Promise<Post> {
  const now = deps.now ?? (() => new Date());
  const sleep = deps.sleep ?? defaultSleep;
  const { store, client } = deps;
  const userId = deps.settings.threads.userId;

  const post = await patch(store, id, (p) => {
    if (p.status !== "scheduled") throw new Error("예약 상태인 글만 올릴 수 있습니다.");
    if (!p.approvedText) throw new Error("확인(승인)되지 않은 글입니다.");
    p.status = "publishing";
    p.attempts += 1;
    p.nextAttemptAt = null;
    addLog(p, "info", `발행 시작 (${p.attempts}번째 시도)`, now());
  });

  try {
    if (!userId) throw new ThreadsError("Threads 계정이 확인되지 않았습니다. 설정에서 '연결 확인'을 눌러 주세요.", false);

    const limit = await client.publishingLimit(userId).catch(() => null);
    if (limit && limit.used >= limit.total) {
      throw new ThreadsError(`Meta 발행 한도(24시간 ${limit.total}개)에 닿았습니다.`, true);
    }

    let containerId = post.containerId;
    if (!containerId) {
      containerId = await client.createTextContainer(userId, post.approvedText!, post.linkUrl || undefined);
      const saved = containerId;
      await patch(store, id, (p) => {
        p.containerId = saved;
        addLog(p, "info", "Threads 컨테이너 생성", now());
      });
    }

    // 텍스트 글은 보통 금방 준비되지만, Meta는 발행 전 상태 확인을 권장한다.
    let status = "IN_PROGRESS";
    for (let i = 0; i < 12; i++) {
      const s = await client.containerStatus(containerId);
      status = s.status;
      if (status === "FINISHED" || status === "PUBLISHED") break;
      if (status === "ERROR") {
        await patch(store, id, (p) => (p.containerId = null));
        throw new ThreadsError(`Threads가 글을 거절했습니다: ${s.errorMessage ?? "사유 없음"}`, false);
      }
      if (status === "EXPIRED") {
        await patch(store, id, (p) => (p.containerId = null));
        throw new ThreadsError("컨테이너가 만료되었습니다. 다시 만듭니다.", true);
      }
      await sleep(5_000);
    }

    let mediaId: string | null = null;
    if (status === "PUBLISHED") {
      // 앞선 시도에서 이미 올라갔다(발행 직후 꺼진 경우). 다시 올리지 않는다.
    } else if (status === "FINISHED") {
      mediaId = await client.publish(userId, containerId);
    } else {
      throw new ThreadsError("Threads가 글을 아직 준비 중입니다. 잠시 뒤 다시 시도합니다.", true);
    }
    const permalink = mediaId ? await client.permalink(mediaId).catch(() => null) : null;

    return await patch(store, id, (p) => {
      p.status = "published";
      p.mediaId = mediaId;
      p.permalink = permalink;
      p.publishedAt = nowIso(now());
      p.lastError = null;
      addLog(p, "info", mediaId ? "발행 완료" : "이미 발행된 것을 확인", now());
    });
  } catch (err) {
    const transient = err instanceof ThreadsError ? err.transient : false;
    const message = err instanceof Error ? err.message : String(err);
    return await patch(store, id, (p) => {
      p.lastError = message;
      if (transient && p.attempts < MAX_ATTEMPTS) {
        const delay = RETRY_DELAYS_MIN[p.attempts - 1];
        p.status = "scheduled";
        p.nextAttemptAt = nowIso(new Date(now().getTime() + delay * 60_000));
        addLog(p, "error", `${message} → ${delay}분 뒤 다시 시도`, now());
      } else {
        p.status = "failed";
        addLog(p, "error", message, now());
      }
    });
  }
}

/** 발행 도중 프로그램이 꺼졌던 글: 자동으로 다시 올리지 않고(중복 위험) 확인을 요청한다. */
export async function recoverInterrupted(store: Store, client: ThreadsClient | null, now = new Date()) {
  const stuck = (await store.read()).posts.filter((p) => p.status === "publishing");
  for (const s of stuck) {
    let published = false;
    if (client && s.containerId) {
      published = (await client.containerStatus(s.containerId).catch(() => null))?.status === "PUBLISHED";
    }
    await patch(store, s.id, (p) => {
      if (published) {
        p.status = "published";
        p.publishedAt = nowIso(now);
        addLog(p, "info", "발행 중 꺼졌지만 Threads에 올라간 것을 확인", now);
      } else {
        p.status = "failed";
        p.lastError = "발행 도중 프로그램이 꺼졌습니다. Threads에 올라갔는지 확인한 뒤 필요하면 다시 예약하세요.";
        addLog(p, "error", p.lastError, now);
      }
    });
  }
}

export class Scheduler {
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private startedAt = new Date();
  lastTick: { at: string; message: string } | null = null;

  constructor(
    private store: Store,
    private getSettings: () => Promise<Settings>,
  ) {}

  start(intervalMs = 30_000) {
    if (this.timer) return;
    this.timer = setInterval(() => void this.tick(), intervalMs);
    void this.tick();
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  async tick(now = new Date()) {
    if (this.running) return;
    this.running = true;
    try {
      const settings = await this.getSettings();
      const data = await this.store.read();
      const p = plan(data.posts, now, settings.schedule, this.startedAt);

      for (const id of p.missed) {
        await patch(this.store, id, (post) => {
          post.status = "failed";
          post.lastError = `프로그램이 꺼져 있어 예약 시간을 ${settings.schedule.missedGraceMinutes}분 넘게 놓쳤습니다. 다시 예약하세요.`;
          addLog(post, "error", post.lastError, now);
        });
      }
      if (!p.next) {
        this.lastTick = { at: nowIso(now), message: p.waiting ?? "올릴 글 없음" };
        return;
      }
      if (!settings.threads.accessToken) {
        this.lastTick = { at: nowIso(now), message: "Threads 토큰이 없어 발행을 미루는 중" };
        return;
      }
      const result = await publishPost(p.next, { store: this.store, settings, client: new ThreadsClient(settings.threads.accessToken) });
      this.lastTick = { at: nowIso(), message: result.status === "published" ? "글 1개 발행" : `발행 실패: ${result.lastError}` };
    } catch (err) {
      console.error(err);
      this.lastTick = { at: nowIso(), message: err instanceof Error ? err.message : String(err) };
    } finally {
      this.running = false;
    }
  }
}
