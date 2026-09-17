/** 목업 프레임 — 갤럭시 S26
 *
 * 데스크톱에서만 보인다. 실제 휴대폰으로 열면 프레임과 상태바를 함께 벗는다
 * (`@media (max-width: 480px)`) — 그때는 기기가 자기 상태바를 그린다.
 *
 * **상태바는 기기 쪽이다.** 앱 화면(360×812)은 그 아래에서 시작한다. 시안의 아트보드도
 * 앱바가 y=0 이라 상태바를 담지 않는다. 그래서 기기 화면은 24 + 812 이다.
 *
 * **화면 크기는 기기를 따르지 않는다.** S26 의 실제 해상도로 바꾸면 360 으로 그린 시안이
 * 어긋난다. 바뀌는 것은 껍데기다 — 베젤 두께, 모서리, 펀치홀, 제스처 바.
 */
import { useEffect, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { DemoGuide } from './DemoGuide'

/** 앱 화면 높이. 피그마 아트보드와 같은 812 다. */
const SCREEN_HEIGHT = 812

/**
 * 상태바 높이.
 *
 * 24 는 옛 안드로이드 값이다. 펀치홀이 있는 요즘 기기는 그보다 높고, 24 로 두면 글자가
 * 화면 모서리 곡선에 걸려 눌린 것처럼 보인다.
 */
const STATUS_HEIGHT = 32

/** 베젤. `--mm-bezel` 과 같은 값이다. 무대 배율을 재는 데만 쓴다. */
const BEZEL = 8

/** 기기 바깥 높이. 무대에 들어가는지 재는 값이라 베젤까지 센다. */
const PHONE_HEIGHT = SCREEN_HEIGHT + STATUS_HEIGHT + BEZEL * 2

/** 무대 위아래 여백(`.mm-stage` 의 padding 20 둘). */
const STAGE_PADDING = 40

/**
 * 목업을 놓는 자리.
 *
 * 창이 낮으면 기기를 통째로 줄인다. 높이만 깎으면 360x812 로 그린 화면이 눌려서
 * 노트북마다 다른 앱처럼 보인다. 배율은 CSS 로 잴 수 없어서(길이를 무단위 수로 나눌 수
 * 없다) 여기서 재고 변수로 넘긴다.
 */
export function PhoneStage({ children }: { children: ReactNode }) {
  const [fit, setFit] = useState(1)

  useEffect(() => {
    const measure = () => setFit(Math.min(1, (window.innerHeight - STAGE_PADDING) / PHONE_HEIGHT))
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  return (
    <div className="mm-stage" style={{ '--mm-fit': fit } as CSSProperties}>
      {/* 안내는 프레임 밖 오른쪽이다. 프레임 안은 앱 화면만 있어야 한다. */}
      <div className="mm-device">{children}</div>
      <DemoGuide />
    </div>
  )
}

/**
 * 기기 상태바. 시계 · 신호 · 와이파이 · 배터리.
 *
 * **시계는 실제 시각이다.** 박아 둔 시각은 스크린샷마다 같은 거짓말이 되고, 시연 중에 누가
 * 보면 멈춘 것으로 읽힌다. 1분마다 맞춘다.
 *
 * 아이콘은 안드로이드 모양을 따른다 — 신호는 채운 삼각, 와이파이는 부채, 배터리는 세로 막대다.
 * 배터리 수치는 기기가 주지 않으므로 그리지 않고 가득 찬 모양만 둔다.
 *
 * [dark] 는 **뒤에 어두운 면이 있는 화면**이다. 원본은 `enableEdgeToEdge()` 로 앱이 상태바
 * 뒤까지 그려서, 스플래시처럼 브랜드색이 깔린 화면에서는 상태바도 그 색이고 글자가 밝아진다.
 */
export function StatusBar({ dark = false }: { dark?: boolean }) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    /* 다음 분이 시작할 때 맞추고, 그 뒤로는 1분마다. */
    let interval = 0
    const align = window.setTimeout(() => {
      setNow(new Date())
      interval = window.setInterval(() => setNow(new Date()), 60_000)
    }, (60 - now.getSeconds()) * 1000)
    return () => {
      window.clearTimeout(align)
      window.clearInterval(interval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const hour = now.getHours() % 12 === 0 ? 12 : now.getHours() % 12
  const time = `${hour}:${String(now.getMinutes()).padStart(2, '0')}`

  return (
    <div className={`mm-statusbar${dark ? ' mm-statusbar--dark' : ''}`} aria-hidden="true">
      <span className="mm-statusbar__time">{time}</span>
      <span className="mm-statusbar__icons">
        {/* 신호 — 채운 삼각. 안드로이드 모양이다. */}
        <svg width="13" height="13" viewBox="0 0 14 14" fill="currentColor" role="presentation">
          <path d="M12.4 1.3v10.9a.8.8 0 0 1-.8.8H2a.75.75 0 0 1-.53-1.28L11.1.77a.75.75 0 0 1 1.3.53Z" />
        </svg>
        {/* 와이파이 — 부채 두 겹과 점 */}
        <svg width="15" height="12" viewBox="0 0 16 12" role="presentation">
          <g fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
            <path d="M1.9 4.3a9.4 9.4 0 0 1 12.2 0" />
            <path d="M4.5 7.1a5.8 5.8 0 0 1 7 0" />
          </g>
          <circle cx="8" cy="10.1" r="1.2" fill="currentColor" />
        </svg>
        {/* 배터리 — 꼭지가 가운데인 세로 막대 */}
        <svg width="11" height="14" viewBox="0 0 12 14" fill="currentColor" role="presentation">
          <path d="M4.7 0.8h2.6a.7.7 0 0 1 .7.7v1.4H4V1.5a.7.7 0 0 1 .7-.7Z" />
          <rect x="2" y="2.6" width="8" height="10.6" rx="1.7" />
        </svg>
      </span>
    </div>
  )
}

/** 앞 카메라 펀치홀. 상태바 가운데의 빈자리에 놓인다. */
export function PunchHole() {
  return <span className="mm-punchhole" aria-hidden="true" />
}
