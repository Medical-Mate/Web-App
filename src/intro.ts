/** 진입 온보딩(`/`) 의 계측.
 *
 * 이 문서는 주소를 바꾸지 않는다 — 스플래시와 안내 판이 한 문서 안에서 갈린다. 그래서 열린
 * 것 한 번만 센다. 시연 앱으로 넘어가면 그쪽 문서가 `/app/…` 으로 따로 센다.
 *
 * 두 숫자의 차이가 이 페이지가 답해야 할 것이다 — 링크를 연 사람 중 몇이 실제로 앱까지 갔나.
 */
import { inject } from '@vercel/analytics'
import { capturePageview, startPostHog } from './lib/analytics'

inject()

startPostHog()
/* 이 문서는 한 장이다. 열린 것 한 번만 센다 — 스플래시와 안내 판은 주소가 같다. */
capturePageview('/', '/')
