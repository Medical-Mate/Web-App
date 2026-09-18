/** 흐름을 마치고 백스택을 비우는 일
 *
 * 원본 `MedicalMateNavHost.resetTo`:
 *
 * ```kotlin
 * internal fun NavHostController.resetTo(destination: Any) {
 *     navigate(destination) {
 *         popUpTo(graph.id) { inclusive = true }
 *         launchSingleTop = true
 *     }
 * }
 * ```
 *
 * 카드를 저장하면 여기로 온다. 저장이 끝난 흐름을 뒤로 가기로 다시 밟으면 같은 문답으로
 * 카드를 한 번 더 만들게 된다.
 */
import type { NavigateFunction } from 'react-router-dom'

/**
 * 지금 히스토리 자리 번호.
 *
 * React Router 가 항목마다 `history.state.idx` 를 넣어 둔다. 화면마다 깊이를 손으로 세어
 * 나르는 것보다 낫다 — 갈래가 늘 때마다 세는 자리를 하나씩 더해야 하고, 하나를 빠뜨리면
 * 엉뚱한 곳으로 되감긴다.
 */
function historyIndex(): number | null {
  const idx = (window.history.state as { idx?: number } | null)?.idx
  return typeof idx === 'number' ? idx : null
}

/** 흐름이 시작되기 **직전**의 자리. 흐름 밖이면 null 이다. */
let flowStart: number | null = null

/**
 * 이 세션이 밟아 온 화면. 자리 번호(`idx`)마다 경로다.
 *
 * 브라우저는 히스토리의 내용을 읽어 주지 않아서 우리가 적어 둔다. 원본의 `popUpTo<Home>` 처럼
 * "홈까지 걷어내라"를 하려면 홈이 몇 장 아래에 있는지 알아야 한다. 새로고침하면 비어서, 그때는
 * 한 장만 되돌아가는 것으로 대신한다.
 */
const visited: string[] = []

/** 라우터가 위치가 바뀔 때마다 부른다. 앞으로 갔던 항목은 새 항목이 밀어낸다. */
export function trackLocation(pathname: string): void {
  const idx = historyIndex()
  if (idx === null) return
  visited.length = Math.min(visited.length, idx)
  visited[idx] = pathname
}

/** 되감기가 도착한 뒤 한 번 부른다. popstate 가 오지 않아도 상한 뒤에는 부른다. */
function afterLanding(fn: () => void): void {
  const land = () => {
    window.removeEventListener('popstate', land)
    clearTimeout(timer)
    fn()
  }
  const timer = setTimeout(land, LANDING_TIMEOUT)
  window.addEventListener('popstate', land)
}

/**
 * 백스택을 비우고 [to] 하나만 남긴다. 원본 `NavHostController.resetTo`.
 *
 * 로그인 · 로그아웃 · 탈퇴 · 온보딩 완료는 되돌아갈 수 없어야 한다 — 뒤로 가기로 로그아웃 전
 * 화면이 나오면 인증이 끝난 화면을 인증 없이 보게 된다. 세션의 첫 자리까지 되감고 그 자리를
 * [to] 로 바꾼다. 앞으로 가기로는 옛 화면에 닿을 수 있지만 목업에는 앞으로 가기가 없다.
 *
 * 상태를 바꾸는 쪽보다 **먼저** 불러야 한다. 순서가 바뀌면 지금 화면의 `Guard` 가 먼저 길을 정한다.
 */
export function resetStack(navigate: NavigateFunction, to: string): void {
  flowStart = null
  const idx = historyIndex()
  if (idx === null || idx <= 0) {
    navigate(to, { replace: true })
    return
  }
  afterLanding(() => navigate(to, { replace: true }))
  navigate(-idx)
}

/**
 * 이미 밟아 온 [to] 로 되돌아간다. 그 위에 쌓인 것은 모두 걷어낸다.
 * 원본 `popBackStack(route, inclusive = false)`.
 *
 * 한 장만 되돌리는 것(`navigate(-1)`)으로는 모자라다. 사이에 들른 화면이 제자리에서 바뀌면
 * (병원 찾기가 일정 추가로 `replace` 하는 것처럼) 같은 화면이 두 장 쌓여서, 한 장 되돌려도
 * 같은 화면에 그대로 선다. 밟아 온 자리에 [to] 가 없으면 그 자리를 [to] 로 바꾼다.
 */
export function popBackTo(navigate: NavigateFunction, to: string): void {
  const idx = historyIndex()
  const at = idx === null ? -1 : visited.lastIndexOf(to, idx)
  if (idx === null || at < 0) {
    navigate(to, { replace: true })
    return
  }
  if (at === idx) return
  navigate(-(idx - at))
}

/**
 * **이 화면을 떠난다.** [pathname] 이 잇달아 놓인 자리를 한꺼번에 걷어낸다.
 *
 * 한 장만 되돌리는 것(`navigate(-1)`)으로는 닫히지 않는다. 병원 찾기가 제자리에서 부르던
 * 화면으로 바뀌기 때문에(`replace`) 같은 화면이 두 자리에 서고, 한 장 되돌리면 **아래쪽
 * 사본**에 그대로 선다. 그 사본은 자리마다 따로 그려지는 판이라(App 의 `key={loc.key}`)
 * 다시 세워지고, 적어 둔 것이 없는 자리에서 세워지므로 **적은 값이 사라진 것처럼 보인다.**
 *
 * 그래서 지금 자리부터 아래로 같은 경로가 이어지는 만큼 세어 한 번에 되감는다. 병원을 두 번
 * 다녀와도 마찬가지다. 적어 둔 것이 없으면(새로고침 뒤) 한 장만 되돌린다.
 */
export function popPast(navigate: NavigateFunction, pathname: string): void {
  const idx = historyIndex()
  if (idx === null) {
    navigate(-1)
    return
  }
  let back = 0
  while (idx - back >= 0 && visited[idx - back] === pathname) back += 1
  navigate(-Math.max(back, 1))
}

/**
 * [base] 가 나올 때까지 되감고 그 위에 [to] 를 얹는다. 원본의
 * `navigate(to) { popUpTo<base>(inclusive = false); launchSingleTop }`.
 *
 * 밟아 온 자리에 [base] 가 없으면(새로고침 뒤 등) 한 장만 되돌아가는 [backThen] 으로 대신한다.
 */
export function popTo(navigate: NavigateFunction, base: string, to: string): void {
  const idx = historyIndex()
  const at = idx === null ? -1 : visited.lastIndexOf(base, idx)
  if (idx === null || at < 0) {
    backThen(navigate, to)
    return
  }
  if (at === idx) {
    navigate(to)
    return
  }
  afterLanding(() => {
    if (window.location.hash.replace(/^#/, '') !== to) navigate(to)
  })
  navigate(-(idx - at))
}

/**
 * 흐름에 들어가기 직전에 부른다. 지금 자리를 돌아올 지점으로 적어 둔다.
 *
 * `navigate` 보다 먼저 불러야 한다 — 부르고 나면 자리가 한 칸 앞이다.
 */
export function markFlowStart(): void {
  flowStart = historyIndex()
}

/** 되감기가 도착하지 않을 때를 위한 상한. popstate 가 오지 않아도 화면이 멎지 않는다. */
const LANDING_TIMEOUT = 400

/**
 * 한 장 되돌아가고, 도착한 곳이 [to] 가 아니면 [to] 를 얹는다.
 *
 * 원본의 `navigate(X) { popUpTo<Home>(inclusive = false); launchSingleTop }` 에 가장 가까운
 * 것이다 — 카드를 지우면 지운 카드의 화면에 남을 수 없어 목록으로 가는데, 목록에서 왔으면
 * 그 목록이 두 장 쌓이지 않아야 한다.
 */
export function backThen(navigate: NavigateFunction, to: string): void {
  const now = historyIndex()
  if (now === null || now <= 0) {
    navigate(to, { replace: true })
    return
  }
  const land = () => {
    window.removeEventListener('popstate', land)
    clearTimeout(timer)
    if (window.location.hash.replace(/^#/, '') !== to) navigate(to)
  }
  const timer = setTimeout(land, LANDING_TIMEOUT)
  window.addEventListener('popstate', land)
  navigate(-1)
}

/**
 * 흐름이 쌓은 화면을 걷어내고 [to] 로 간다.
 *
 * 브라우저는 히스토리에서 가운데 항목을 뽑을 수 없다. 대신 흐름이 시작되기 직전 자리까지
 * **되감고** 그 자리를 [to] 로 바꾼다. 앞으로 가기로는 걷어낸 화면에 닿을 수 있지만
 * 목업에는 앞으로 가기가 없고, 뒤로 가기로는 닿지 않는다.
 *
 * 되감기는 브라우저가 나중에 처리한다. 먼저 자리를 바꾸면 아직 떠나지 않은 항목을
 * 덮어쓰므로 `popstate` 로 도착을 기다린 뒤에 바꾼다.
 *
 * 도착한 곳이 이미 [to] 면 그대로 둔다. 홈에서 시작한 흐름이 그렇고, 그때는 되감기 한
 * 번으로 끝나서 화면이 한 번만 움직인다.
 *
 * 시작 자리를 모르면(새로고침 등) 되감지 않고 지금 자리를 바꾸기만 한다. 앱과 다르지만,
 * 어디로 되감을지 모르는 채 움직이는 것보다 낫다.
 */
export function resetTo(navigate: NavigateFunction, to: string): void {
  const start = flowStart
  flowStart = null

  const now = historyIndex()
  const back = start !== null && now !== null ? now - start : 0
  if (back <= 0) {
    navigate(to, { replace: true })
    return
  }

  const land = () => {
    window.removeEventListener('popstate', land)
    clearTimeout(timer)
    if (window.location.hash.replace(/^#/, '') !== to) navigate(to, { replace: true })
  }
  const timer = setTimeout(land, LANDING_TIMEOUT)
  window.addEventListener('popstate', land)
  navigate(-back)
}
