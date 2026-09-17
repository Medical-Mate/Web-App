/** 백엔드 호출의 공통 자리
 *
 * 원본 앱의 `NetworkModule` + `AuthInterceptor` 에 해당한다. 주소는 `.env` 의
 * `VITE_BACKEND_BASE_URL`, 토큰은 `VITE_BACKEND_ACCESS_TOKEN` 에서 온다.
 *
 * **토큰이 없으면 인증이 필요한 경로는 401 이다.** 원본은 카카오 로그인으로 서버 토큰을
 * 받는데(`POST /api/auth/kakao`), 이 웹 데모의 로그인은 화면 전환만 해서 토큰이 생기지
 * 않는다. 그래서 개발자가 받아 둔 액세스 토큰을 환경 변수로 넣는 길을 둔다.
 *
 * 호출이 실패하면 [ApiError] 를 던지고, 부르는 쪽(`ai.ts` · `hospitals.ts`)이 대본이나 로컬
 * 목록으로 대신한다. 한 번 닿지 못한 서버는 [RETRY_MS] 동안 다시 묻지 않는다 — 글자마다
 * 실패를 기다리면 화면이 한 박자씩 늦어 고장처럼 보인다.
 *
 * **과도한 요청을 여기서 막는다.** 같은 요청이 진행 중이면 합치고(중복 제거), 갈래마다 최소
 * 간격을 두고(스로틀), 429 를 받으면 쉰다. 화면 쪽 디바운스(병원 검색 300ms)와 진행 중 잠금
 * (문답 `thinking` · 메모 `busy`)은 그대로 두고, 그것을 뚫고 오는 것을 여기서 받는다.
 */

/**
 * 백엔드 주소.
 *
 * **앱이 직접 쓰지 않는다.** 부르는 곳은 언제나 같은 출처의 `/api` 이고, 이 값은 앞에 선 것이
 * 어디로 넘길지 정하는 데만 쓴다 — 개발은 `vite.config.ts`, 배포는 `vercel.json`. 그래서
 * 배포할 때 환경 변수를 넣지 않아도 서버가 붙는다.
 */
export const API_BASE = String(import.meta.env.VITE_BACKEND_BASE_URL ?? '').replace(/\/+$/, '')

/**
 * 실제로 부르는 앞부분. **언제나 같은 출처의 `/api` 다.**
 *
 * 브라우저가 백엔드를 직접 부르면 다른 출처라 사전 요청(preflight)이 먼저 가는데, 이 서버는
 * 거기에 403 을 낸다 — 안드로이드 앱만 부르던 곳이라 우리 출처를 허락할 이유가 없었다.
 * 그래서 앞에 선 것이 대신 부르게 한다: 개발은 vite 프록시, 배포는 `vercel.json` 의 rewrites.
 *
 * 프록시가 없는 데에 올리면 404 가 오고, 부르는 쪽이 대본과 로컬 목록으로 대신한다.
 */
const REQUEST_BASE = ''

const ACCESS_TOKEN = String(import.meta.env.VITE_BACKEND_ACCESS_TOKEN ?? '').trim()

/** 서버에 닿지 못한 뒤 다시 묻기까지. */
const RETRY_MS = 60_000

/** 429 를 받고 `Retry-After` 가 없을 때 쉬는 시간. */
const RATE_LIMIT_PAUSE_MS = 10_000

/** 이 시각까지는 서버가 죽은 것으로 본다. 화면을 오가도 남도록 모듈에 둔다. */
let downUntil = 0

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

/**
 * 지금 서버를 부를 수 있는지. 최근에 닿지 못했으면 false.
 *
 * 주소를 따지지 않는다. 같은 출처의 `/api` 라 앞에 선 것이 넘겨 주기만 하면 된다. 넘겨 주지
 * 않는 데에 올리면 첫 요청이 404(또는 JSON 이 아닌 답)로 돌아오고, 그때부터 한동안 쉰다.
 */
export function apiAvailable(): boolean {
  return Date.now() >= downUntil
}

/**
 * JSON 요청 하나. 2xx 가 아니면 [ApiError].
 *
 * 5xx 와 네트워크 오류는 서버가 죽은 것으로 보고 [RETRY_MS] 동안 쉰다. 4xx 는 이 요청의
 * 문제(토큰 없음 · 잘못된 입력)라 서버 상태로 치지 않는다 — 다만 401 은 토큰이 없다는 뜻이라
 * 같은 세션에서 계속 나올 것이므로 역시 쉰다.
 */
export async function apiFetch<T>(path: string, init: { method?: string; body?: unknown; signal?: AbortSignal } = {}): Promise<T> {
  if (!apiAvailable()) throw new ApiError(0, 'backend unavailable')
  const method = init.method ?? (init.body !== undefined ? 'POST' : 'GET')
  const key = `${method} ${path} ${init.body === undefined ? '' : JSON.stringify(init.body)}`
  /* 같은 요청이 아직 답을 기다리고 있으면 그 약속을 같이 쓴다. 버튼을 두 번 누르거나 StrictMode 가
     이펙트를 두 번 돌려도 요청은 한 번이다. */
  /* 취소 신호를 든 요청(병원 검색)은 합치지 않는다 — 앞 요청이 취소되면 뒤 요청까지 실패로 끝난다.
     그쪽은 화면이 디바운스와 취소로 이미 다스린다. */
  if (init.signal) {
    await throttle(path)
    return send<T>(path, method, init)
  }
  const running = inflight.get(key)
  if (running) return running as Promise<T>
  const task = (async () => {
    await throttle(path)
    return send<T>(path, method, init)
  })()
  inflight.set(key, task)
  try {
    return await task
  } finally {
    inflight.delete(key)
  }
}

/** 답을 기다리는 요청. 키는 메서드 · 경로 · 본문. */
const inflight = new Map<string, Promise<unknown>>()

/**
 * 경로마다 요청 사이의 최소 간격(ms). AI 경로는 한 번에 모델을 부르고 서버가 잦은 호출에 429 를
 * 내서 넉넉히 둔다. 병원 검색은 화면이 300ms 디바운스를 이미 걸어서 짧다. 부위 마스터는
 * 세션에 한 번이라 없다.
 */
const MIN_INTERVAL_MS: [prefix: string, ms: number][] = [
  ['/api/demo/previsit/', 800],
  ['/api/demo/postvisit/', 1500],
  ['/api/demo/hospitals', 300],
]

/** 경로 갈래마다 다음 요청을 보낼 수 있는 시각. */
const nextSlot = new Map<string, number>()

/**
 * 스로틀. 같은 갈래의 앞 요청에서 최소 간격이 지나지 않았으면 그때까지 기다린다. 버리지 않고
 * 미룬다 — 문답의 답은 하나라도 빠지면 대화가 어긋난다.
 */
async function throttle(path: string): Promise<void> {
  const rule = MIN_INTERVAL_MS.find(([prefix]) => path.startsWith(prefix))
  if (!rule) return
  const [prefix, ms] = rule
  const now = Date.now()
  const at = Math.max(now, nextSlot.get(prefix) ?? 0)
  nextSlot.set(prefix, at + ms)
  if (at > now) await new Promise((r) => setTimeout(r, at - now))
}

async function send<T>(path: string, method: string, init: { body?: unknown; signal?: AbortSignal }): Promise<T> {
  if (!apiAvailable()) throw new ApiError(0, 'backend unavailable')
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (init.body !== undefined) headers['Content-Type'] = 'application/json'
  if (ACCESS_TOKEN) headers.Authorization = `Bearer ${ACCESS_TOKEN}`
  let res: Response
  try {
    res = await fetch(`${REQUEST_BASE}${path}`, {
      method,
      headers,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      signal: init.signal,
    })
  } catch (e) {
    if (init.signal?.aborted) throw e
    downUntil = Date.now() + RETRY_MS
    throw new ApiError(0, 'network')
  }
  if (!res.ok) {
    /* 401 은 토큰이 없다는 뜻이고 403 · 404 는 앞에 선 것이 `/api` 를 넘겨주지 않는다는 뜻이다.
       셋 다 같은 세션에서 계속 나올 것이라, 글자마다 다시 묻지 않는다. */
    if (res.status >= 500 || res.status === 401 || res.status === 403 || res.status === 404) {
      downUntil = Date.now() + RETRY_MS
    }
    /* 429 는 "너무 잦다"다. 서버가 `Retry-After` 를 주면 그만큼, 없으면 잠깐 쉰다. */
    if (res.status === 429) {
      const retryAfter = Number(res.headers.get('Retry-After'))
      downUntil = Date.now() + (Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : RATE_LIMIT_PAUSE_MS)
    }
    throw new ApiError(res.status, `${path} ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  try {
    return (await res.json()) as T
  } catch {
    /* JSON 이 아니면 `/api` 를 넘겨 주는 것이 없다는 뜻이다 — 정적 호스트가 자기 페이지를
       돌려준 것이다. 글자마다 같은 답을 받지 않도록 쉰다. */
    downUntil = Date.now() + RETRY_MS
    throw new ApiError(0, `${path} not json`)
  }
}
