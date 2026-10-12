/**
 * Meta 공식 Threads API(graph.threads.net)만 쓴다. 웹 화면 자동 조작(스크래핑·매크로)은 약관 위반 소지가 있어 쓰지 않는다.
 * 게시는 2단계: ① 미디어 컨테이너 만들기(POST /{user-id}/threads) ② 발행(POST /{user-id}/threads_publish).
 * Threads API에는 '예약 시간' 매개변수가 없으므로, 예약은 이 프로그램이 정해진 시간에 위 두 단계를 실행하는 방식이다.
 */

const GRAPH = "https://graph.threads.net";
const VERSION = "v1.0";

export class ThreadsError extends Error {
  constructor(
    message: string,
    /** 잠시 뒤 다시 하면 될 수 있는 오류(네트워크·서버·한도) */
    public transient: boolean,
    public status?: number,
  ) {
    super(message);
  }
}

type Fetch = typeof fetch;

interface GraphError {
  error?: { message?: string; code?: number; error_subcode?: number; error_user_msg?: string };
}

export class ThreadsClient {
  constructor(
    private token: string,
    private fetchImpl: Fetch = fetch,
  ) {
    if (!token) throw new ThreadsError("Threads 액세스 토큰이 없습니다. 설정에서 넣어 주세요.", false);
  }

  private async call<T>(method: "GET" | "POST", pathname: string, params: Record<string, string> = {}, versioned = true): Promise<T> {
    const url = new URL(`${GRAPH}${versioned ? `/${VERSION}` : ""}${pathname}`);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    url.searchParams.set("access_token", this.token);

    let res: Response;
    try {
      res = await this.fetchImpl(url, { method, signal: AbortSignal.timeout(30_000) });
    } catch {
      throw new ThreadsError("Threads 서버에 연결하지 못했습니다. 인터넷 연결을 확인하세요.", true);
    }
    const json = (await res.json().catch(() => ({}))) as T & GraphError;
    if (!res.ok || json.error) {
      const e = json.error ?? {};
      const detail = e.error_user_msg || e.message || `HTTP ${res.status}`;
      // 190: 토큰 만료·무효. 4/17/32/613: 호출 한도.
      if (e.code === 190 || res.status === 401) {
        throw new ThreadsError(`Threads 토큰이 만료되었거나 올바르지 않습니다. 설정에서 새 토큰을 넣어 주세요. (${detail})`, false, res.status);
      }
      const rateLimited = res.status === 429 || [4, 17, 32, 613].includes(e.code ?? -1);
      throw new ThreadsError(`Threads 오류: ${detail}`, rateLimited || res.status >= 500, res.status);
    }
    return json;
  }

  me() {
    return this.call<{ id: string; username?: string }>("GET", "/me", { fields: "id,username" });
  }

  /** 장기 토큰(60일)을 다시 60일로 연장한다. 발급 24시간 이후, 만료 전에만 된다. */
  refreshToken() {
    return this.call<{ access_token: string; expires_in: number }>(
      "GET",
      "/refresh_access_token",
      { grant_type: "th_refresh_token" },
      false,
    );
  }

  /** 최근 24시간 동안 API로 올린 수와 한도 */
  async publishingLimit(userId: string): Promise<{ used: number; total: number } | null> {
    const res = await this.call<{ data?: { quota_usage?: number; config?: { quota_total?: number } }[] }>(
      "GET",
      `/${userId}/threads_publishing_limit`,
      { fields: "quota_usage,config" },
    );
    const row = res.data?.[0];
    if (!row || row.quota_usage === undefined || row.config?.quota_total === undefined) return null;
    return { used: row.quota_usage, total: row.config.quota_total };
  }

  async createTextContainer(userId: string, text: string, linkUrl?: string): Promise<string> {
    const params: Record<string, string> = { media_type: "TEXT", text };
    if (linkUrl) params.link_attachment = linkUrl;
    const res = await this.call<{ id: string }>("POST", `/${userId}/threads`, params);
    return res.id;
  }

  /** IN_PROGRESS · FINISHED · PUBLISHED · ERROR · EXPIRED */
  async containerStatus(containerId: string): Promise<{ status: string; errorMessage?: string }> {
    const res = await this.call<{ status?: string; error_message?: string }>("GET", `/${containerId}`, { fields: "status,error_message" });
    return { status: res.status ?? "UNKNOWN", errorMessage: res.error_message };
  }

  async publish(userId: string, containerId: string): Promise<string> {
    const res = await this.call<{ id: string }>("POST", `/${userId}/threads_publish`, { creation_id: containerId });
    return res.id;
  }

  async permalink(mediaId: string): Promise<string | null> {
    const res = await this.call<{ permalink?: string }>("GET", `/${mediaId}`, { fields: "permalink" });
    return res.permalink ?? null;
  }
}
