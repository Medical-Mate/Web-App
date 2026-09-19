import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { startPostHog } from './lib/analytics'
import { demoState } from './data/demoSeed'
import './styles/tokens.css'
import './styles/global.css'
import './styles/components.css'

/* 주소에 ?demo=1 을 붙이면 시연용 데이터로 시작하고, ?demo=0 이면 저장된 것을 지운다.
 * 시연 직전에 상태를 맞춰 놓을 때 쓴다. 일반 실행에는 영향이 없다. */
{
  const demo = new URLSearchParams(location.search).get('demo')
  if (demo === '1') localStorage.setItem('medicalmate.v1', JSON.stringify(demoState()))
  else if (demo === '0') localStorage.removeItem('medicalmate.v1')
}

/* **켤 때는 늘 스플래시부터다.** 앱은 콜드 스타트마다 스플래시에서 세션을 확인하고 갈라진다 —
 * 어느 화면에 있었든 새로 열면 처음부터다. 주소에 남은 해시는 지운다. 스플래시가 저장된
 * 상태를 보고 로그인 · 온보딩 · 홈으로 보낸다.
 *
 * `?nosplash=1` 은 계측 도구용 예외다. 화면 하나를 곧장 열어 재야 할 때만 쓴다. */
{
  const params = new URLSearchParams(location.search)
  if (params.get('nosplash') !== '1' && location.hash && location.hash !== '#/') {
    history.replaceState(null, '', `${location.pathname}${location.search}#/`)
  }
}

/* 계측을 먼저 켠다. 화면이 그려지기 전에 켜 두면 첫 화면의 페이지뷰도 빠지지 않는다. */
startPostHog()

/* HashRouter 를 쓰는 이유: 정적 호스팅(GitHub Pages·Netlify drop·로컬 file 열기)에서
 * 서버 리라이트 없이도 새로고침과 직접 링크가 동작한다. 해커톤 제출에 유리하다. */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)
