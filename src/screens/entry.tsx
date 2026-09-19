/** 진입 흐름 — 스플래시 · 로그인 · 온보딩(V2-00~03) · 내 정보 등록(1b-1~3) · 완료(1b-4) */
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Screen, Pad } from '../components/Screen'
import { BottomCta, Button, Chip, Dots, Icon, Illustration, InfoTooltip, Logo, StepProgress } from '../components/ui'
import { A, S } from '../data/strings'
import { capture } from '../lib/analytics'
import { resetStack } from '../lib/flow'
import { HEALTH_ITEM_MAX_COUNT, HEALTH_ITEM_MAX_LENGTH, HEALTH_TEXT_MAX_LENGTH } from '../lib/types'
import { useStore } from '../store/store'

/* ── 스플래시 ──────────────────────────────────────────────────── */

/**
 * Figma `V2 · 스플래시`(`1320:4553`).
 *
 * 앱에서는 저장된 토큰으로 세션을 복구하는 동안 보이는 화면이고, 진행 표시를 두지
 * 않는다(시안에 없다). 웹앱은 복구할 것이 없어서 머무는 시간만 준다.
 */
/**
 * 시안의 `Safe Bottom`. 글이 가운데 오는 화면(스플래시 · 1b-4)은 이 높이를 뺀 자리에서
 * 가운데를 잡는다 — 아트보드 812 가 아니라 `Content` 788 의 가운데다.
 */
const SAFE_BOTTOM = 24

export function SplashScreen() {
  const navigate = useNavigate()
  const { state } = useStore()

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!state.authed) navigate('/login', { replace: true })
      else if (!state.onboardingDone) navigate('/onboarding', { replace: true })
      else navigate('/home', { replace: true })
    }, 1500)
    return () => clearTimeout(timer)
  }, [navigate, state.authed, state.onboardingDone])

  return (
    <div
      className="mm-screen"
      style={{
        background: 'var(--mm-bg-primary)',
        alignItems: 'center',
        justifyContent: 'center',
        /* 시안은 락업과 문구 사이가 10 이다(락업 아래 402.2 · 문구 위 412.2). */
        gap: 'var(--mm-s10)',
        /* 시안의 `Safe Bottom` 24 를 셈에서 뺀다. 그래야 덩이가 `Content` 788 의 가운데에 서고
           락업 위가 351.8 이 된다. 812 전체로 가운데를 잡으면 12 내려간다. */
        padding: `0 var(--mm-gutter) ${SAFE_BOTTOM}px`,
        color: 'var(--mm-fg-on-primary)',
      }}
    >
      <MonoLightLockup />
      <p
        className="mm-body-m"
        style={{
          textAlign: 'center',
          /* 문구는 **락업의 보이는 가운데**에 맞춘다.
           *
           * 로고 마크의 그림은 48 viewBox 안에서 그보다 작아, 50.4 상자 안에 좌우 10.3 씩
           * 여백이 남는다. 워드마크는 글자가 상자를 꽉 채우니 락업의 잉크는 왼쪽만 10.3
           * 들어가 있고, 그래서 상자 가운데(180)와 보이는 가운데(185.1)가 5 어긋난다.
           * 그냥 가운데로 두면 문구가 로고보다 왼쪽으로 밀린 것으로 보인다.
           *
           * 락업은 시안이 둔 자리(상자 가운데)에 그대로 두고 이 줄만 옮긴다. 옮기는 값은
           * 마크 여백의 절반이고, 간격을 바꿔도 달라지지 않는다 — 간격은 상자 가운데와
           * 잉크 가운데를 똑같이 밀기 때문이다. */
          transform: 'translateX(5px)',
        }}
      >
        {S.splash_tagline}
      </p>
    </div>
  )
}

/** 어두운 면 위의 로고 락업. 마크만 흰색으로 칠하고 워드마크는 글자로 얹는다. */
function MonoLightLockup() {
  return (
    <div className="mm-lockup" style={{ animation: 'mm-fade-up 600ms ease-out' }}>
      <Icon name="logo_mark" size={50.4} />
      <span className="mm-lockup__word">{S.app_name}</span>
    </div>
  )
}

/* ── 로그인 ────────────────────────────────────────────────────── */

/**
 * Figma `V2 · 로그인`(`1320:4558`).
 *
 * 위아래 여백이 같은 세 덩어리다. Hero(로고·제목·설명)와 Actions(버튼·고지) 사이가
 * 같은 크기의 빈 칸이다. 왼쪽 정렬이다 — 제목이 두 줄이라 가운데로 두면 줄 끝이
 * 들쭉날쭉해진다.
 *
 * **그림을 두지 않는다.** 시안의 로그인에는 없다.
 */
export function LoginScreen() {
  const navigate = useNavigate()
  const { signIn, state } = useStore()

  /* 데모용 — 실제 카카오 인증을 하지 않는다. 흐름만 보여주고 다음 화면으로 넘긴다. */
  const start = () => {
    capture('login_started', { returning: state.onboardingDone })
    /* 로그인은 되돌아갈 수 없어야 한다. 백스택을 비우고 다음 화면 하나만 남긴다(원본 `resetTo`). */
    resetStack(navigate, state.onboardingDone ? '/home' : '/onboarding')
    signIn()
  }

  return (
    <Screen noNav surface>
      <div
        style={{
          minHeight: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: 'var(--mm-s24) var(--mm-gutter) var(--mm-safe-bottom)',
        }}
      >
        <div style={{ flex: 1 }} />

        {/* Hero(`1320:4561`) — 세 요소 사이 간격 20 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mm-s20)' }}>
          <Logo height={36} />
          <h1 className="mm-heading-l" style={{ whiteSpace: 'pre-line' }}>
            {S.login_title}
          </h1>
          <p className="mm-body-m" style={{ color: 'var(--mm-fg-subtle)', whiteSpace: 'pre-line' }}>
            {S.login_subtitle}
          </p>
        </div>

        <div style={{ flex: 1 }} />

        {/* Actions(`1320:4566`) — 사이 간격 20 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mm-s20)' }}>
          <Button variant="kakao" onClick={start} icon="kakao_symbol">
            {S.login_kakao}
          </Button>
          <p className="mm-body-s" style={{ color: 'var(--mm-fg-subtle)', whiteSpace: 'pre-line' }}>
            {S.login_disclaimer}
          </p>
        </div>
      </div>
    </Screen>
  )
}

/* ── 온보딩 4장 ────────────────────────────────────────────────── */

/**
 * 온보딩 네 장. Figma `V2-00`~`V2-03`.
 *
 * 장마다 자리가 같고 들어가는 글자만 달라서 문구를 표로 든다. 화면이 장 번호로
 * 분기하면 같은 `when` 이 자리마다 하나씩 생긴다.
 */
const PAGES = [
  { title: S.onboarding_prepare_title, body: S.onboarding_prepare_description, img: 'prepare' as const },
  { title: S.onboarding_point_title, body: S.onboarding_point_description, img: 'point' as const },
  { title: S.onboarding_card_title, body: S.onboarding_card_description, img: 'card' as const },
  { title: S.onboarding_follow_title, body: S.onboarding_follow_description, img: 'follow' as const },
]

/** 장이 넘어가는 최소 거리. 이보다 짧으면 넘기려던 것이 아니라 스쳤다고 본다. */
const SWIPE_THRESHOLD = 56

/**
 * 로그인 뒤 한 번 지나간다.
 *
 * **상단 바에 뒤로가기를 두지 않는다.** 뒤로 갈 곳이 로그인이라 돌아가면 로그아웃처럼
 * 읽힌다. 앞으로 가는 길과 건너뛰는 길만 둔다.
 *
 * 장이 밀려서 바뀐다. 앞으로 갈 때는 오른쪽에서, 되짚을 때는 왼쪽에서 들어온다.
 * 손가락으로 넘기고 되짚을 수도 있다.
 *
 * 글이 그림보다 위다. 시안이 순서를 그렇게 바꿨다.
 */
export function OnboardingScreen() {
  const navigate = useNavigate()
  /* 화면 안내가 "온보딩 마지막" 처럼 특정 장으로 보낼 때 `state.page` 를 준다. 앱에는 없는 입구다. */
  const startPage = (useLocation().state as { page?: number } | null)?.page ?? 0
  const [page, setPage] = useState(Math.min(Math.max(startPage, 0), PAGES.length - 1))
  const [forward, setForward] = useState(true)
  const dragged = useRef(0)
  const last = page === PAGES.length - 1
  const current = PAGES[page]

  const go = (to: number) => {
    if (to < 0 || to >= PAGES.length) return
    /* 어느 장이 한 번에 안 읽히는지. `direction=back` 이 잦은 장이 그 자리다. */
    capture('onboarding_slide_viewed', {
      index: to,
      total: PAGES.length,
      direction: to > page ? 'next' : 'back',
    })
    setForward(to > page)
    setPage(to)
  }
  const next = () => {
    if (!last) return go(page + 1)
    capture('onboarding_completed', { slides_seen: PAGES.length })
    navigate('/profile-setup')
  }

  return (
    <Screen
      noNav
      surface
      bottom={
        <BottomCta>
          <Button onClick={next}>{last ? S.onboarding_start : S.onboarding_next}</Button>
        </BottomCta>
      }
    >
      {/* 목록이 아니라 한 화면이다. 그림이 남는 높이를 받아 아래에 고정된다. */}
      <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Top Bar 56. 건너뛰기 폭과 같은 빈 칸을 왼쪽에 둬서 진행 표시를 가운데에 세운다.
          마지막 장에도 건너뛰기를 둔다 — 시안 네 장이 모두 그렇다. */}
      <Pad style={{ display: 'flex', alignItems: 'center', height: 56, flex: '0 0 auto' }}>
        <span style={{ flex: 1 }} />
        <Dots current={page} total={PAGES.length} />
        <span style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
          {/* Ghost 버튼이 아니다. 라벨이 `Body/L Strong` 이고 터치 영역만 48을 확보한다. */}
          <button
            className="mm-body-l-strong"
            style={{ color: 'var(--mm-fg-subtle)', minHeight: 'var(--mm-touch-min)' }}
            onClick={() => {
              capture('onboarding_skipped', { at_index: page, total: PAGES.length })
              navigate('/profile-setup')
            }}
          >
            {S.onboarding_skip}
          </button>
        </span>
      </Pad>

      <div
        key={page}
        className={`mm-onb ${forward ? 'mm-onb--fwd' : 'mm-onb--back'}`}
        onPointerDown={(e) => {
          dragged.current = e.clientX
        }}
        onPointerUp={(e) => {
          const moved = e.clientX - dragged.current
          if (moved <= -SWIPE_THRESHOLD) go(page + 1)
          else if (moved >= SWIPE_THRESHOLD) go(page - 1)
        }}
      >
        <Pad style={{ paddingTop: 16, paddingBottom: 16 }}>
          <h1 className="mm-heading-l" style={{ whiteSpace: 'pre-line' }}>
            {current.title}
          </h1>
          <p
            className="mm-body-m"
            style={{ marginTop: 24, color: 'var(--mm-fg-subtle)', whiteSpace: 'pre-line' }}
          >
            {current.body}
          </p>
        </Pad>

        {/* 시안이 그림을 아래에 고정해 두고 글 아래 여백으로 높이 차이를 받는다. */}
        <div style={{ flex: 1 }} />
        <div className="mm-onb__art">
          {/* 폭을 352에서 멈춘다. 화면 폭을 그대로 채우게 두면 넓은 기기에서 그림이
              함께 커진다. 352보다 좁은 기기에서만 비율대로 줄어든다. */}
          <Illustration name={current.img} style={{ maxWidth: 352 }} />
        </div>
        <div style={{ height: 80, flex: '0 0 auto' }} />
      </div>
      </div>
    </Screen>
  )
}

/* ── 1b-1·1b-2·1b-3 내 정보 등록 ───────────────────────────────── */

/**
 * 신상정보 입력의 세 단계.
 *
 * 세 화면이 같은 배치에 문구와 칩 목록만 다르다. 단계를 값으로 두고 한 화면이 그린다.
 * 칩 목록은 앱과 같은 `<string-array>` 에서 꺼낸다 — 손으로 옮겨 적으면 갈린다.
 */
const SETUP_STEPS = [
  {
    key: 'medications' as const,
    question: S.profile_setup_medications_question,
    description: S.profile_setup_medications_description,
    options: A.profile_setup_medications_options,
    tooltip: null as string | null,
  },
  {
    key: 'conditions' as const,
    question: S.profile_setup_conditions_question,
    description: S.profile_setup_conditions_description,
    options: A.profile_setup_conditions_options,
    tooltip: null as string | null,
  },
  {
    key: 'allergies' as const,
    question: S.profile_setup_allergies_question,
    description: S.profile_setup_allergies_description,
    options: A.profile_setup_allergies_options,
    tooltip: S.profile_setup_allergies_tooltip as string | null,
  },
]

type SetupKey = (typeof SETUP_STEPS)[number]['key']

/** 고른 칩과 직접 적은 것을 한 목록으로. 직접 입력 칸은 쉼표로 나눈다. */
function mergeAnswer(chosen: string[], note: string): string[] {
  const written = note
    .split(',')
    .map((v) => v.trim().slice(0, HEALTH_ITEM_MAX_LENGTH))
    .filter(Boolean)
  const out = [...chosen]
  written.forEach((v) => {
    if (!out.includes(v)) out.push(v)
  })
  /* 갈래마다 20개까지. 원본이 보낼 때 자르는 값과 같다. */
  return out.slice(0, HEALTH_ITEM_MAX_COUNT)
}

export function ProfileSetupScreen() {
  const navigate = useNavigate()
  const { state, setHealth } = useStore()
  /* 화면 안내가 약·기저질환·알러지 중 한 단계로 바로 보낼 때 `state.step` 을 준다. */
  const startStep = (useLocation().state as { step?: number } | null)?.step ?? 0
  const [step, setStep] = useState(Math.min(Math.max(startStep, 0), SETUP_STEPS.length - 1))
  const [chosen, setChosen] = useState<Record<SetupKey, string[]>>({
    medications: state.health.medications,
    conditions: state.health.conditions,
    allergies: state.health.allergies,
  })
  /* 직접 입력은 단계마다 따로 든다. 칩 목록에 섞어 두면 고른 것과 적은 것이 구별되지
     않고, 단계를 오갈 때 적던 글이 사라진다(`ProfileSetupAnswer`). */
  const [notes, setNotes] = useState<Record<SetupKey, string>>({
    medications: '',
    conditions: '',
    allergies: '',
  })

  const current = SETUP_STEPS[step]
  const picked = chosen[current.key]
  const last = step === SETUP_STEPS.length - 1

  const toggle = (value: string) =>
    setChosen((c) => ({
      ...c,
      [current.key]: picked.includes(value) ? picked.filter((v) => v !== value) : [...picked, value],
    }))

  const goNext = () => {
    if (!last) {
      setStep((s) => s + 1)
      return
    }
    /* **값이 아니라 있는지 여부만 보낸다.** 복용약 · 기저질환 · 알러지는 건강 정보 그 자체라
       내용을 밖으로 내지 않는다. 세 개가 모두 false 로 쌓이면 이 단계를 사실상 건너뛰고
       있다는 신호이고, 그러면 카드의 그 칸들이 비게 된다. */
    const health = {
      medications: mergeAnswer(chosen.medications, notes.medications),
      conditions: mergeAnswer(chosen.conditions, notes.conditions),
      allergies: mergeAnswer(chosen.allergies, notes.allergies),
    }
    capture('profile_saved', {
      has_medications: health.medications.length > 0,
      has_conditions: health.conditions.length > 0,
      has_allergies: health.allergies.length > 0,
    })
    setHealth(health)
    navigate('/profile-complete', { replace: true })
  }

  const goBack = () => (step === 0 ? navigate(-1) : setStep((s) => s - 1))

  return (
    <Screen
      title={S.profile_setup_title}
      onBack={goBack}
      surface
      bottom={
        <BottomCta>
          <Button onClick={goNext}>{last ? S.profile_setup_done : S.profile_setup_next}</Button>
        </BottomCta>
      }
    >
      <Pad
        style={{
          paddingTop: 12,
          paddingBottom: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--mm-s20)',
        }}
      >
        <StepProgress label={S.profile_setup_title} current={step + 1} total={SETUP_STEPS.length} />

        {/* 질문과 설명(`398:1244`). 알러지 단계에만 툴팁이 붙는다 — 브리핑 카드 맨 위에
            늘 표시되는 항목이라 왜 묻는지가 그 단계에서만 설명이 필요하다. */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mm-s8)', paddingTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h2 className="mm-heading-l" style={{ flex: 1 }}>
              {current.question}
            </h2>
            {current.tooltip && (
              <InfoTooltip text={current.tooltip} label={S.profile_setup_allergies_tooltip_open} />
            )}
          </div>
          <p className="mm-body-m" style={{ color: 'var(--mm-fg-subtle)' }}>
            {current.description}
          </p>
        </div>

        <div className="mm-chip-group">
          {current.options.map((o) => (
            <Chip key={o} selected={picked.includes(o)} onClick={() => toggle(o)}>
              {o}
            </Chip>
          ))}
        </div>

        <div>
          <div className="mm-field__label">{S.profile_setup_other_label}</div>
          <div className={`mm-field__box mm-field__box--plain${notes[current.key] ? ' mm-field__box--filled' : ''}`}>
            <input
              className="mm-field__input"
              placeholder={S.profile_setup_other_placeholder}
              value={notes[current.key]}
              maxLength={HEALTH_TEXT_MAX_LENGTH}
              onChange={(e) => setNotes((n) => ({ ...n, [current.key]: e.target.value }))}
            />
          </div>
          <div className="mm-field__hint">{S.profile_setup_other_helper}</div>
        </div>
      </Pad>
    </Screen>
  )
}

/* ── 1b-4 등록 완료 ────────────────────────────────────────────── */

/** 화면에 머무는 시간. 모션 660ms 가 끝나고 문구를 읽을 만큼 남는다. */
const COMPLETE_DWELL_MS = 2000

/**
 * Figma `676:2519`.
 *
 * 버튼이 없어서 머문 뒤 스스로 홈으로 간다. 들어올 때 마크의 두 조각이 화면 밖에서
 * 서로를 향해 날아와 부딪히고 되튕긴 뒤 제자리에 선다(`.mm-complete__mark`).
 */
export function ProfileCompleteScreen() {
  const navigate = useNavigate()
  const { completeOnboarding } = useStore()

  useEffect(() => {
    const timer = setTimeout(() => {
      /* 등록이 끝난 흐름을 뒤로 가기로 다시 밟지 않는다. 홈 하나만 남긴다(원본 `resetTo(Home)`). */
      resetStack(navigate, '/home')
      completeOnboarding()
    }, COMPLETE_DWELL_MS)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      className="mm-screen"
      style={{
        background: 'var(--mm-bg-primary)',
        alignItems: 'center',
        justifyContent: 'center',
        /* 1b-4 는 마크 · 제목 · 본문 사이가 둘 다 10 이다(408→418, 452→462). */
        gap: 'var(--mm-s10)',
        padding: `0 var(--mm-gutter) ${SAFE_BOTTOM}px`,
        color: 'var(--mm-fg-on-primary)',
        textAlign: 'center',
      }}
    >
      {/* 조각을 겹쳐 두면 원래 마크가 된다. 둘 다 장식이라 이름을 주지 않는다. */}
      <div className="mm-complete__mark" aria-hidden="true">
        <Icon name="logo_mark_upper" size={106} />
        <Icon name="logo_mark_lower" size={106} />
      </div>
      <h1 className="mm-heading-l mm-complete__title">{S.profile_complete_title}</h1>
      <p className="mm-body-m mm-complete__sub">{S.profile_complete_description}</p>
    </div>
  )
}
