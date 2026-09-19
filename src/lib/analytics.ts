/** 계측 — 어느 화면이 얼마나 열렸고, 백엔드가 얼마나 걸렸는지
 *
 * 두 곳으로 보낸다. **Vercel Web Analytics** 는 트래픽과 유입 경로를 보고, **PostHog** 는
 * 흐름과 이탈 구간을 본다. 겹치는 값(페이지뷰)이 있지만 둘 다 공짜고, 답해 주는 질문이 다르다 —
 * Vercel 은 "몇 명이 어디서 왔나", PostHog 는 "그 사람이 어디서 멈췄나" 다.
 *
 * ## 아래는 Vercel 쪽 이야기다
 *
 * 켜는 것은 Vercel 대시보드의 Analytics 탭이다. 켜야 `/_vercel/insights/*` 가 생기고, 그 전에는
 * 스크립트가 404 라 아무것도 보내지 않는다. 배포한 곳에서만 돈다 — 로컬에서는 개발 모드로
 * 콘솔에만 찍는다.
 *
 * **경로를 손으로 넘긴다.** 이 앱은 `HashRouter` 라 화면이 바뀌어도 주소의 경로는 언제나
 * `/app/` 이고 `#/home` 처럼 해시만 바뀐다. 스크립트가 알아서 세는 값은 그래서 전부 `/app/`
 * 한 줄로 뭉친다. `path` 로 해시를 얹은 경로를 넘겨 화면을 가른다.
 *
 * `route` 는 자리표시자를 남긴 꼴이다. 카드 · 일자 · 기록처럼 id 가 붙는 주소를 그대로 두면
 * 줄이 id 수만큼 늘어난다. 무엇이 많이 열렸는지 보려면 묶인 쪽이 필요하다.
 */

import type { BeforeSend } from '@vercel/analytics'
import posthog from 'posthog-js'

/** id 가 붙는 주소를 자리표시자로 바꾼다. `/card/card_demo` → `/card/:id` */
const PATTERNS: [RegExp, string][] = [
  [/^\/card\/(?!new$)[^/]+$/, '/card/:id'],
  [/^\/record\/[^/]+$/, '/record/:id'],
  [/^\/calendar\/\d{4}-\d{2}-\d{2}$/, '/calendar/:date'],
]

/** 시연 앱의 화면 경로. 진입 온보딩(`/`)과 섞이지 않도록 앞에 `/app` 을 둔다. */
export function analyticsPath(pathname: string): string {
  return `/app${pathname === '/' ? '' : pathname}`
}

/** 같은 화면을 한 줄로 묶는 꼴. */
export function analyticsRoute(pathname: string): string {
  const hit = PATTERNS.find(([re]) => re.test(pathname))
  return analyticsPath(hit ? hit[1] : pathname)
}

/**
 * 보내는 주소에서 해시를 뗀다.
 *
 * 스크립트가 주소를 만드는 방식이 `location.href` 에서 경로만 갈아 끼우는 것이라, 넘긴
 * `path` 를 얹어도 해시가 뒤에 남는다 — `…/app/home#/home` 처럼 같은 화면이 두 번 적힌다.
 * 대시보드에 한 가지 꼴로만 보이도록 여기서 떼어 낸다.
 */
export const stripHash: BeforeSend = (event) => ({ ...event, url: event.url.split('#')[0] })


/* ── PostHog ─────────────────────────────────────────────────────
 * 흐름과 이탈 구간을 보는 쪽. Vercel 이 못 주는 것이 여기 있다 — 방문자 식별이 하루보다
 * 오래 가서 화면을 잇는 퍼널이 만들어진다.
 */

/**
 * 프로젝트 토큰.
 *
 * **비밀이 아니다.** 브라우저 코드에 들어가도록 만든 공개 키라, 어차피 빌드 결과에 그대로
 * 보인다. 그래서 백엔드 주소와 같이 기본값을 여기 둔다 — 받아서 바로 띄울 수 있어야 하고,
 * 배포할 때 환경 변수를 넣지 않아도 돈다. `.env` 의 `VITE_POSTHOG_KEY` 로 바꿀 수 있고,
 * 빈 값으로 두면 아무것도 보내지 않는다.
 *
 * 비밀인 쪽은 `phx_` 로 시작하는 Personal API key 다. 그건 서버용이고 여기 쓰지 않는다.
 */
const POSTHOG_KEY = String(
  import.meta.env.VITE_POSTHOG_KEY ?? 'phc_vEHX2WM4E73bqz2GprgqBF5TeKvhwuGrUZG25VQJiTgh',
).trim()
const POSTHOG_HOST = String(import.meta.env.VITE_POSTHOG_HOST ?? 'https://us.i.posthog.com').trim()

let started = false

/**
 * 한 번만 부른다. 문서마다 한 번이다(진입 `/` 와 시연 앱 `/app/`).
 *
 * **글자를 보내지 않는다**(`mask_all_text` · `mask_all_element_attributes`). 자동 수집은
 * 누른 요소의 글자를 함께 담는데, 이 앱의 글자는 대부분 건강 정보다 — 브리핑 카드의 부위 ·
 * 복용약 · 알러지, 문답 말풍선, 메모 분류 결과. 지우는 버튼의 `aria-label` 에도 카드 제목이
 * 들어 있다. 무엇을 눌렀는지는 요소의 종류와 자리로 알 수 있고, 그 글자까지 밖으로 보낼
 * 이유가 없다.
 *
 * **페이지뷰도 직접 쏜다**(`capture_pageview: false`). `HashRouter` 라 화면이 바뀌어도 주소의
 * 경로는 언제나 `/app/` 이고 해시만 바뀐다. 알아서 세게 두면 화면 스무 장이 한 줄로 뭉친다.
 *
 * **세션 리플레이는 글자를 통째로 가린다**(`maskTextSelector: '*'`). 리플레이의 기본값은
 * 입력칸만 가리고 화면에 그려진 글자는 그대로 녹화하는 것인데, 이 앱에서 문제인 쪽이 바로
 * 그 그려진 글자다. 블록마다 `ph-no-capture` 를 다는 길도 있지만 그러면 새 화면을 만들 때
 * 빠뜨릴 수 있고, 그 블록 안의 누름까지 함께 안 잡힌다. 통째로 가리는 편이 빠뜨릴 데가 없다.
 *
 * 가려도 리플레이가 답해야 할 것은 남는다 — 어느 화면에서, 어디를 누르고, 얼마나 머뭇거리다,
 * 되돌아갔는지. "무엇을 썼는지"는 애초에 우리가 볼 것이 아니다.
 *
 * 리플레이를 켜는 것은 대시보드 쪽 스위치다. 이 설정은 켜기 전에 들어가 있어야 한다 —
 * 켠 뒤에 넣으면 그 사이에 찍힌 것은 지워지지 않는다.
 */
export function startPostHog(): void {
  if (started || !POSTHOG_KEY) return
  started = true
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    defaults: '2026-05-30',
    capture_pageview: false,
    mask_all_text: true,
    mask_all_element_attributes: true,
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: '*',
    },
  })
}

/**
 * 다음 화면 이동이 **안내 대본에서 건너뛴 것**인지.
 *
 * 옆의 시연 대본은 서른 줄 어디로든 곧장 보낸다 — 로그인을 대신 해 주고 문답 상태까지 얹는다.
 * 그 이동을 사람이 밟은 것과 같이 세면 퍼널이 거짓말을 한다. 부위 선택과 문답을 건너뛴 채
 * 카드 화면에 선 사람이 "카드까지 도달한 사람"으로 잡힌다.
 *
 * 대본이 `navigate` 직전에 세우고, 페이지뷰가 한 번 읽고 지운다.
 */
let jumped = false

/** 안내 대본이 다음 이동 직전에 부른다. */
export function markGuidedJump(): void {
  jumped = true
  if (started) posthog.register_for_session({ guided_session: true })
}

/**
 * 이 세션이 **시연용**임을 표시한다. 주소에 `?demo=1` · `?nosplash=1` 이 붙은 방문이다.
 *
 * 시연 데이터를 심고 스플래시를 건너뛴 채 들어온 것이라, 처음 쓰는 사람의 흐름이 아니다.
 * 세션 단위로 붙여서 퍼널에서 통째로 걸러낸다 — 대본을 한 번이라도 누른 사람은 그 뒤의
 * 이동도 이미 답을 알고 움직이는 것이라 유기적인 흐름이 아니다.
 */
export function markDemoSession(search: string): void {
  if (!started) return
  const q = new URLSearchParams(search)
  if (q.get('demo') !== null || q.get('nosplash') === '1') {
    posthog.register_for_session({ demo_session: true })
  }
}

/**
 * 화면 하나가 열렸다.
 *
 * **주소까지 갈아 끼운다.** 그냥 두면 `$current_url` 이 `…/app/#/home` 이고 `$pathname` 은
 * `/app/` 이라, 대시보드가 화면을 가르지 못한다. 경로에 화면을 얹고 해시는 뗀다 — Vercel 쪽에
 * `stripHash` 로 한 것과 같은 모양으로 맞춰서, 두 대시보드의 줄 이름이 같아진다.
 *
 * `route` 는 id 를 자리표시자로 바꾼 꼴이다(`/app/card/:id`). 카드 · 일자 · 기록이 id 수만큼
 * 줄을 늘리지 않도록 이걸로 묶어 본다.
 */
export function capturePageview(path: string, route: string): void {
  if (!started) return
  const source = jumped ? 'guide' : 'app'
  jumped = false
  posthog.capture('$pageview', {
    $current_url: `${location.origin}${path}`,
    $pathname: path,
    route,
    /* 사람이 앱을 써서 온 것인지, 대본으로 건너뛴 것인지. 퍼널은 `app` 만 센다. */
    nav_source: source,
  })
}

/** 이름 붙인 사건 하나. 건강 정보가 담기지 않는 값만 넘긴다. */
export function capture(event: string, props?: Record<string, string | number | boolean | null>): void {
  if (!started) return
  posthog.capture(event, props)
}

/**
 * 증상 정리를 시작한 시각. `intake_completed` 가 총 소요를 셈하는 데 쓴다.
 *
 * 모듈에 둔다 — 화면이 여럿을 지나가고 새로고침이면 사라지는 편이 맞다. 없으면 총 소요를
 * 빼고 보낸다. 한 세션에 두 번 시작하면 뒤엣것이 이긴다.
 */
let intakeStartedAt: number | null = null

export function markIntakeStart(): void {
  intakeStartedAt = Date.now()
}

/** 시작 시각을 알면 지금까지 걸린 ms, 모르면 null. */
export function intakeElapsed(): number | null {
  return intakeStartedAt === null ? null : Date.now() - intakeStartedAt
}
