/** 진입 온보딩(`/`) 의 계측.
 *
 * 이 문서는 주소를 바꾸지 않는다 — 스플래시와 안내 판이 한 문서 안에서 갈린다. 그래서 열린
 * 것 한 번만 센다. 시연 앱으로 넘어가면 그쪽 문서가 `/app/…` 으로 따로 센다.
 *
 * 두 숫자의 차이가 이 페이지가 답해야 할 것이다 — 링크를 연 사람 중 몇이 실제로 앱까지 갔나.
 */
import { inject } from '@vercel/analytics'
import { capture, capturePageview, startPostHog } from './lib/analytics'

inject()

startPostHog()
/* 이 문서는 한 장이다. 열린 것 한 번만 센다 — 스플래시와 안내 판은 주소가 같다. */
capturePageview('/', '/')

/* 시연 앱으로 넘어가는 걸음.
 *
 * 이 페이지가 답해야 할 질문이 이거다 — 링크를 연 사람 중 몇이 실제로 앱까지 갔나. 그리고
 * **안내 판을 읽고 갔는지 바로 눌렀는지.** 스플래시에서 바로 누르면 안내가 길거나 버튼이
 * 너무 일찍 보이는 것이다.
 *
 * 문서가 이 스크립트를 모르므로 여기서 붙인다 — 진입 HTML 은 손대지 않는다.
 */
document.addEventListener(
  'click',
  (e) => {
    const link = (e.target as Element | null)?.closest?.('a[href]')
    if (!link || !/app\/?$/.test(link.getAttribute('href') ?? '')) return
    const steps = [...document.querySelectorAll('.step')]
    const at = steps.findIndex((el) => el.classList.contains('is-active'))
    capture('intro_demo_clicked', { step_index: at, step_id: steps[at]?.id ?? '?' })
  },
  true,
)
