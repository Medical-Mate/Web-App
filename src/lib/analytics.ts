/** Vercel Web Analytics — 어느 주소가 얼마나 열렸는지
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
