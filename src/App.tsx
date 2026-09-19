import { createContext, useContext, useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigationType } from 'react-router-dom'
import type { Location } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import { StoreProvider, useStore } from './store/store'
import { analyticsPath, analyticsRoute, capturePageview, stripHash } from './lib/analytics'
import { trackLocation } from './lib/flow'
import { Toast } from './components/ui'
import { PhoneStage, PunchHole, StatusBar } from './components/PhoneFrame'
import {
  LoginScreen,
  OnboardingScreen,
  ProfileCompleteScreen,
  ProfileSetupScreen,
  SplashScreen,
} from './screens/entry'
import { HomeScreen } from './screens/Home'
import { IntakeBodyMapScreen } from './screens/IntakeBodyMap'
import { IntakeChatScreen, IntakeDoneScreen } from './screens/IntakeChat'
import { BriefCardListScreen, BriefCardScreen } from './screens/BriefCard'
import { CalendarDayScreen, CalendarScreen, ScheduleAddScreen } from './screens/calendar'
import {
  ClinicConfirmScreen,
  HospitalPickScreen,
  VisitDetailScreen,
  VisitNoteScreen,
  VisitRecordScreen,
} from './screens/visit'
import { RecordDetailScreen, RecordScreen } from './screens/record'
import { HealthEditScreen, MyProfileScreen } from './screens/profile'

/** 전환하는 동안 미끄러져 나가는 화면인지. 그 화면은 더 이상 길을 정하지 않는다. */
const LeavingContext = createContext(false)

/**
 * 로그인하지 않았으면 로그인 화면으로 돌린다.
 *
 * **나가는 화면에서는 돌리지 않는다.** 로그아웃·초기화 직후 320ms 동안 이전 화면이 함께 그려지는데,
 * 그 화면의 이 컴포넌트가 먼저 로그인으로 보내 버리면 스플래시를 건너뛴다.
 */
function Guard({ children }: { children: React.ReactNode }) {
  const { state } = useStore()
  const leaving = useContext(LeavingContext)
  if (!state.authed) return leaving ? null : <Navigate to="/login" replace />
  return <>{children}</>
}

/** 경로표. 나가는 화면과 들어오는 화면이 각자의 위치로 이 표를 읽는다. */
function Screens({ location }: { location: Location }) {
  return (
    <Routes location={location}>
      <Route path="/" element={<SplashScreen />} />
      <Route path="/login" element={<LoginScreen />} />
      <Route path="/onboarding" element={<Guard><OnboardingScreen /></Guard>} />
      <Route path="/profile-setup" element={<Guard><ProfileSetupScreen /></Guard>} />
      <Route path="/profile-complete" element={<Guard><ProfileCompleteScreen /></Guard>} />

      <Route path="/home" element={<Guard><HomeScreen /></Guard>} />

      <Route path="/intake" element={<Guard><IntakeBodyMapScreen /></Guard>} />
      <Route path="/intake/chat" element={<Guard><IntakeChatScreen /></Guard>} />
      <Route path="/intake/done" element={<Guard><IntakeDoneScreen /></Guard>} />

      <Route path="/card/:id" element={<Guard><BriefCardScreen /></Guard>} />
      <Route path="/cards" element={<Guard><BriefCardListScreen /></Guard>} />

      <Route path="/calendar" element={<Guard><CalendarScreen /></Guard>} />
      <Route path="/calendar/:date" element={<Guard><CalendarDayScreen /></Guard>} />
      <Route path="/schedule/new" element={<Guard><ScheduleAddScreen /></Guard>} />

      <Route path="/hospital" element={<Guard><HospitalPickScreen /></Guard>} />
      <Route path="/clinic-confirm" element={<Guard><ClinicConfirmScreen /></Guard>} />
      <Route path="/visit/note" element={<Guard><VisitNoteScreen /></Guard>} />
      <Route path="/visit/record" element={<Guard><VisitRecordScreen /></Guard>} />
      <Route path="/visit/:id" element={<Guard><VisitDetailScreen /></Guard>} />

      <Route path="/record" element={<Guard><RecordScreen /></Guard>} />
      <Route path="/record/:id" element={<Guard><RecordDetailScreen /></Guard>} />

      <Route path="/me" element={<Guard><MyProfileScreen /></Guard>} />
      <Route path="/me/health" element={<Guard><HealthEditScreen /></Guard>} />

      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  )
}

/**
 * 화면 전환. 원본 `MedicalMateNavTransitions`.
 *
 * 가로로 민다. 새 화면이 오른쪽에서 들어오고 물러나는 화면은 반대쪽으로 1/4만 움직인다.
 * 둘이 같은 거리를 움직이면 두 장이 나란히 흐르는 것으로 보이고, 뒤에 있는 것이 덜
 * 움직여야 앞뒤가 읽힌다. 되돌아올 때는 그대로 뒤집는다.
 *
 * **탭끼리 오갈 때는 아무것도 하지 않는다.** 세 탭은 서로의 형제이고 백스택에도 쌓이지
 * 않는다. 미는 전환은 들어가고 나오는 깊이를 말하는 것이라, 같은 층을 옮기는 데 쓰면
 * 캘린더에서 기록으로 가는 것이 한 단계 들어가는 것처럼 보인다.
 */
const NAV_DURATION = 320

/** 탭 루트. 원본의 `isTab()` 과 같은 셋이다. */
const TAB_PATHS = ['/home', '/calendar', '/record']

function isTab(path: string): boolean {
  return TAB_PATHS.includes(path)
}

interface Phase {
  current: Location
  /** 전환하는 동안만 남는 이전 화면. */
  leaving: Location | null
  pop: boolean
}

function Router() {
  const location = useLocation()
  const navType = useNavigationType()
  const { toast } = useStore()

  const [phase, setPhase] = useState<Phase>({ current: location, leaving: null, pop: false })

  /* 어느 쪽으로 가는지는 **그리는 중에** 정한다. 이펙트로 미루면 새 화면이 제자리에 한 번
     그려진 뒤 오른쪽 끝으로 튀었다가 들어와서, 첫 프레임이 깜빡인다. */
  /* 경로가 바뀌어야 화면을 넘긴 것이다. 항목만 갈린 것(같은 경로로의 `replace`)은 그
     자리에서 값이 바뀐 것이라 밀지 않는다 — 흐름을 걷어내고 홈으로 갈 때가 그렇다. */
  const movedTo = phase.current.pathname !== location.pathname
  if (movedTo || phase.current.key !== location.key) {
    const from = phase.current
    const between = isTab(from.pathname) && isTab(location.pathname)
    setPhase({
      current: location,
      leaving: movedTo && !between ? from : null,
      pop: navType === 'POP',
    })
  }

  /* 브랜드색이 전면에 깔린 화면. 그 위에 서는 상태바가 같은 색이 된다. 원본이
     `enableEdgeToEdge` 라 앱 배경이 상태바 뒤까지 이어진다. */
  const onBrandSurface = location.pathname === '/' || location.pathname === '/profile-complete'

  /* 어느 자리에 어느 화면이 있는지 적어 둔다. 홈까지 걷어내는 되감기(`popTo`)가 읽는다. */
  useEffect(() => {
    trackLocation(location.pathname)
  }, [location])

  /* 화면 하나가 열렸다고 알린다. 이 한 줄이 흐름의 뼈대다 — 진입 → 로그인 → 온보딩 → 홈 →
     부위 → 문답 → 카드 로 줄어드는 수가 곧 이탈 구간이다. `location.key` 로 세면 같은 화면을
     다시 열었을 때도 센다(카드를 고치고 돌아오는 경우). */
  useEffect(() => {
    capturePageview(analyticsPath(location.pathname), analyticsRoute(location.pathname))
  }, [location.key, location.pathname])

  /* 나가는 화면은 전환이 끝나면 지운다. 남겨 두면 화면이 쌓인다. */
  useEffect(() => {
    if (!phase.leaving) return
    const timer = setTimeout(() => setPhase((p) => ({ ...p, leaving: null })), NAV_DURATION)
    return () => clearTimeout(timer)
  }, [phase])

  /* 나가는 화면이 앞이다 — 나중에 그린 것이 위로 온다. 들어오는 화면이 투명한 상태로
     시작하므로 그 아래로 나가는 화면이 비친다. 원본의 겹침 차례와 같다.
     배열로 그려야 나가는 화면이 **같은 DOM 마디를 지킨다**. 자리로 갈라 두면 React 가
     다시 붙여서 스크롤 위치가 맨 위로 튄다. */
  const pages = phase.leaving ? [phase.leaving, location] : [location]

  return (
    <div className={`mm-phone${onBrandSurface ? ' mm-phone--brand' : ''}`}>
      {/* 브랜드색이 전면에 깔린 화면은 상태바까지 그 색이다(원본은 `enableEdgeToEdge`).
          해당하는 것은 스플래시와 등록 완료 둘이다. */}
      <StatusBar dark={onBrandSurface} />
      <PunchHole />
      <div className="mm-viewport">
        {pages.map((loc, i) => {
          const entering = i === pages.length - 1
          const anim =
            pages.length === 1
              ? ''
              : entering
                ? phase.pop
                  ? ' mm-page--pop-enter'
                  : ' mm-page--enter'
                : phase.pop
                  ? ' mm-page--pop-exit'
                  : ' mm-page--exit'
          return (
            <div key={loc.key} className={`mm-page${anim}`} aria-hidden={entering ? undefined : true}>
              <LeavingContext.Provider value={!entering}>
                <Screens location={loc} />
              </LeavingContext.Provider>
            </div>
          )
        })}
        {toast && <Toast message={toast} />}
      </div>
      {/* 어느 화면이 얼마나 열렸는지. 경로를 손으로 넘기는 까닭은 `lib/analytics.ts` 에 적었다 —
          `HashRouter` 라 그냥 두면 전부 `/app/` 한 줄로 뭉친다. */}
      <Analytics
        path={analyticsPath(location.pathname)}
        route={analyticsRoute(location.pathname)}
        beforeSend={stripHash}
      />
    </div>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <PhoneStage>
        <Router />
      </PhoneStage>
    </StoreProvider>
  )
}
