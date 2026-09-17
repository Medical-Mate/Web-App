/** 화면 뼈대 — 앱바 + 스크롤 영역 + 하단 고정 영역 */
import { useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Icon, NavBar } from './ui'
import { S } from '../data/strings'

export type TabKey = 'calendar' | 'home' | 'record'

/**
 * 탭을 떠날 때의 스크롤 위치.
 *
 * 원본은 탭 이동에 `saveState = true` · `restoreState = true` 를 걸어서 탭을 오갔다 돌아오면
 * 스크롤이 남아 있다. 웹은 화면이 매번 새로 마운트되므로 화면 밖에 둔다. 새로고침하면 비는데,
 * 앱도 탭 엔트리가 pop 되면 사라지는 값이다.
 */
const TAB_SCROLL: Partial<Record<TabKey, number>> = {}

export function Screen({
  title,
  onBack,
  backIcon,
  action,
  onAction,
  children,
  bottom,
  tab,
  noNav,
  /** 배경을 bg/surface(흰색)로. 앱의 캘린더 화면이 그렇다. */
  surface,
  /** 스크롤 영역을 바깥에서 잡고 싶을 때. 문답이 마디를 끝으로 보낼 때 쓴다. */
  scrollRef,
}: {
  title?: string
  onBack?: () => void
  backIcon?: 'chevron_left' | 'close'
  action?: string
  onAction?: () => void
  children: ReactNode
  /** 하단 고정 영역 (BottomCta 등) */
  bottom?: ReactNode
  /** 탭 루트 화면이면 탭 키 */
  tab?: TabKey
  /** 앱바를 아예 두지 않는 화면 (스플래시·로그인·완료) */
  noNav?: boolean
  surface?: boolean
  scrollRef?: React.MutableRefObject<HTMLDivElement | null>
}) {
  const [scrolled, setScrolled] = useState(false)
  const ownRef = useRef<HTMLDivElement | null>(null)
  const ref = scrollRef ?? ownRef

  /* 탭 루트만. 들어올 때 마지막 위치로 돌리고, 나갈 때(전환이 끝나 지워질 때) 위치를 적어 둔다. */
  useLayoutEffect(() => {
    if (!tab) return
    const el = ref.current
    if (!el) return
    el.scrollTop = TAB_SCROLL[tab] ?? 0
    return () => {
      TAB_SCROLL[tab] = el.scrollTop
    }
  }, [tab, ref])

  return (
    <div className={`mm-screen${surface ? ' mm-screen--surface' : ''}`}>
      {!noNav && (
        <NavBar
          title={title}
          onBack={onBack}
          backIcon={backIcon}
          action={action}
          onAction={onAction}
          scrolled={scrolled}
        />
      )}
      <div
        className="mm-scroll"
        ref={ref}
        onScroll={(e) => setScrolled((e.target as HTMLDivElement).scrollTop > 4)}
      >
        {children}
      </div>
      {bottom}
      {tab && <TabBar current={tab} />}
    </div>
  )
}

const TABS: { key: TabKey; label: string; icon: 'calendar' | 'home' | 'note'; path: string }[] = [
  { key: 'calendar', label: S.tab_calendar, icon: 'calendar', path: '/calendar' },
  { key: 'home', label: S.tab_home, icon: 'home', path: '/home' },
  { key: 'record', label: S.tab_record, icon: 'note', path: '/record' },
]

export function TabBar({ current }: { current: TabKey }) {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <nav className="mm-tabbar" aria-label="주요 화면">
      {TABS.map((t) => {
        const active = t.key === current
        return (
          <button
            key={t.key}
            className={`mm-tab${active ? ' mm-tab--active' : ''}`}
            onClick={() => {
              if (location.pathname !== t.path) navigate(t.path, { replace: true })
            }}
            aria-current={active ? 'page' : undefined}
          >
            <Icon name={active ? (`${t.icon}_filled` as 'home_filled') : t.icon} />
            <span className="mm-tab__label">{t.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

/** 화면 좌우 여백을 준 블록 */
export function Pad({
  children,
  style,
  className,
}: {
  children: ReactNode
  style?: React.CSSProperties
  className?: string
}) {
  return (
    <div className={className ? `mm-pad ${className}` : 'mm-pad'} style={style}>
      {children}
    </div>
  )
}
