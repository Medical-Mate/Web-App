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
  })
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
  posthog.capture('$pageview', {
    $current_url: `${location.origin}${path}`,
    $pathname: path,
    route,
  })
}

/** 이름 붙인 사건 하나. 건강 정보가 담기지 않는 값만 넘긴다. */
export function capture(event: string, props?: Record<string, string | number | boolean | null>): void {
  if (!started) return
  posthog.capture(event, props)
}
