/** 화면 안내
 *
 * 목업 프레임 **바깥**에 선다. 프레임 안은 처음부터 끝까지 앱 화면이어야 해서, 심사자에게
 * 하는 말은 여기 둔다. 화면마다 무엇을 하는 곳인지만 적고, 무엇을 누르라는 시나리오는
 * 두지 않는다. 지금 보고 있는 화면이 어느 줄인지 주소와 문답 진행으로 짚어 준다.
 *
 * 데스크톱에서만 보인다. 프레임 옆이 좁으면 접고, 휴대폰으로 열면 프레임과 함께 사라진다.
 */
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { classifyMemo } from '../data/ai'
import { useStore } from '../store/store'
import type { AppState, IntakeSession } from '../lib/types'

/** 줄을 눌렀을 때 갈 곳. 경로만이거나, 화면이 읽는 `location.state` 를 함께 준다. */
type Target = string | { to: string; state?: unknown }

/** 갈 곳을 정할 때 쓰는 것. 저장된 상태를 읽고, 문답 화면이 요구하는 세션을 만든다. */
interface GoContext {
  state: AppState
  startIntake: () => IntakeSession
  updateIntake: (patch: Partial<IntakeSession>) => void
}

interface Step {
  /** 어느 화면인지 */
  screen: string
  /** 그 화면이 하는 일 */
  about: string
  /** 누르면 갈 곳. 화면이 상태를 요구하면 여기서 채운다. */
  go: (ctx: GoContext) => Target | Promise<Target>
}

/* 시연 데이터가 없을 때 문답 화면에 넣는 부위. `bodyMap.ts` 의 배 › 윗배(명치). */
const DEMO_BODY_PART = { anchorId: 'ANC:004', anchorLabel: '배', zoneId: 'SUR:031', label: '윗배(명치)' }

/* 자동 분류 화면에 넣을 메모. 진료 후 기록 화면은 메모와 분류 결과를 state 로 받는다. */
const DEMO_MEMO = '위염 초기라고 하셨어요. 피검사 했다고 하셨어요. 위산약 2주 처방. 일주일 뒤 재방문이라고 하셨어요.'

/**
 * 문답 화면(`/intake/chat`)은 세션이 그 단계 이상이어야 열린다. 세션이 없으면 만들고,
 * 부위가 없으면 시연용 부위를 넣고, 단계가 낮으면 올린다. 이미 그 단계를 지났으면 그대로 둔다.
 */
function intakeAt(ctx: GoContext, step: IntakeSession['step']): void {
  const session = ctx.state.intake ?? ctx.startIntake()
  const patch: Partial<IntakeSession> = {}
  if (!session.bodyPart && step >= 2) patch.bodyPart = DEMO_BODY_PART
  if (session.step < step) patch.step = step
  if (Object.keys(patch).length) ctx.updateIntake(patch)
}

/** 진료 후 흐름(병원 확인 → 메모 → 분류)이 읽는 state. 첫 일정과 그 카드에서 채운다. */
function visitState(state: AppState) {
  const appt = state.appointments[0]
  const card = state.cards.find((c) => c.id === appt?.cardId) ?? state.cards[0]
  return {
    clinic: appt?.hospitalName ?? card?.hospital?.name ?? '서울삼성내과의원',
    cardId: card?.id ?? null,
    cardTitle: card?.title ?? '',
    visitedOn: appt?.date ?? todayKey(),
  }
}

function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 일자 상세. 기록이 붙은 날이 있으면 그 날, 없으면 첫 일정의 날, 그것도 없으면 캘린더. */
function dayOf(state: AppState, visited: boolean): string {
  const rec = state.records[0]
  if (visited && rec) return `/calendar/${rec.visitedOn}`
  const appt = state.appointments.find((a) => !state.records.some((r) => r.visitedOn === a.date)) ?? state.appointments[0]
  return appt ? `/calendar/${appt.date}` : rec ? `/calendar/${rec.visitedOn}` : '/calendar'
}

/** 묶음 머리를 맨 위로 올릴 때 남겨 두는 윗 여백. 0 이면 글자가 판 끝에 붙는다. */
const PART_TOP_GAP = 8

interface Part {
  title: string
  steps: Step[]
}

/* 무엇을 누르라는 시나리오가 아니라, 화면마다 무엇을 하는 곳인지 적는다. 지금 보고 있는
   화면의 줄이 표시된다. */
const PARTS: Part[] = [
  {
    title: 'A · 진입 · 내 정보',
    steps: [
      { screen: '스플래시', about: '앱 로고를 잠깐 보이고 로그인으로 넘어가요.', go: () => '/' },
      { screen: '로그인', about: '카카오 계정으로 시작해요. 데모에서는 화면 전환만 일어나요.', go: () => '/login' },
      { screen: '온보딩', about: '증상 정리 → 브리핑 카드 → 일정 → 진료 후 기록, 네 장으로 앱의 흐름을 소개해요.', go: () => '/onboarding' },
      { screen: '온보딩 마지막', about: '내 건강 정보 등록으로 이어져요.', go: () => ({ to: '/onboarding', state: { page: 3 } }) },
      { screen: '복용 중인 약', about: '먹고 있는 약을 칩으로 고르거나 직접 적어요. 브리핑 카드에 함께 실려요.', go: () => ({ to: '/profile-setup', state: { step: 0 } }) },
      { screen: '기저질환', about: '앓고 있는 병을 등록해요. 의사가 먼저 알아야 하는 정보예요.', go: () => ({ to: '/profile-setup', state: { step: 1 } }) },
      { screen: '알러지', about: '약·음식 알러지를 등록해요. ⓘ 로 왜 필요한지 설명을 볼 수 있어요.', go: () => ({ to: '/profile-setup', state: { step: 2 } }) },
    ],
  },
  {
    title: 'B · 증상 정리 · 브리핑 카드',
    steps: [
      { screen: '홈(기록 없음)', about: '오늘의 한 줄과 증상 정리 시작 버튼이 있어요. 아직 카드가 없으면 빈 상태를 보여요.', go: () => '/home' },
      { screen: '1/4 부위 선택', about: '3D 인체도를 돌려 아픈 부위를 짚어요. 앞·뒤 전환, 확대, 목록 검색도 있어요.', go: (ctx) => {
          intakeAt(ctx, 1)
          return '/intake'
        } },
      { screen: '2/4 증상 문답', about: 'AI가 시작 시점·양상·변화·심해지는 때·번짐·동반 증상을 차례로 물어요. 서버 AI가 답을 읽고 다음 질문을 정해요.', go: (ctx) => {
          intakeAt(ctx, 2)
          return '/intake/chat'
        } },
      { screen: '3/4 통증 강도', about: '슬라이더의 다섯 정지점으로 아픈 정도를 골라요. NRS 숫자로 바꿔 카드에 실려요.', go: (ctx) => {
          intakeAt(ctx, 3)
          return '/intake/chat'
        } },
      { screen: '4/4 추가 질문', about: '의사에게 물어볼 것을 AI 추천에서 담거나 직접 적어요.', go: (ctx) => {
          intakeAt(ctx, 4)
          return '/intake/chat'
        } },
      { screen: '증상 정리 완료', about: '병원을 먼저 찾을지, 바로 카드를 만들지 골라요.', go: (ctx) => {
          intakeAt(ctx, 4)
          return '/intake/done'
        } },
      { screen: '병원 찾기', about: '이름으로 병원을 검색해요. 심평원 병원정보 기반 서버 검색이고, 서버가 없으면 로컬 목록으로 대신해요.', go: () => ({ to: '/hospital?purpose=before', state: { returnTo: '/card/new' } }) },
      { screen: '브리핑 카드', about: '문답을 의사가 읽는 순서로 정리한 카드예요. 부위·시작·양상·강도·동반 증상·복용약·기저질환·알러지·질문이 한 장에 있어요.', go: (ctx) => {
          if (ctx.state.cards[0]) return `/card/${ctx.state.cards[0].id}`
          intakeAt(ctx, 4)
          return '/card/new'
        } },
    ],
  },
  {
    title: 'C · 캘린더 · 일정',
    steps: [
      { screen: '홈(기록 있음)', about: '저장한 카드와 다가오는 일정이 홈에 보여요. 하단 탭으로 캘린더·기록에 가요.', go: () => '/home' },
      { screen: '캘린더', about: '월 달력에 카드 만든 날과 진료 일정이 점으로 찍혀요.', go: () => '/calendar' },
      { screen: '바텀 시트', about: '카드가 있는 날을 누르면 그 카드로 일정을 만들 수 있어요. 병원이 카드에서 채워져요.', go: (ctx) => ({ to: '/calendar', state: { selectDate: ctx.state.cards[0]?.writtenOn ?? todayKey() } }) },
      { screen: '일정 추가', about: '병원·날짜·시간을 고르고, 가져갈 카드를 골라요.', go: (ctx) => ({ to: '/schedule/new', state: { draft: { cardId: ctx.state.cards[0]?.id ?? null } } }) },
      { screen: '진료 전 할 일', about: '진료 가기 전에 챙길 일을 체크리스트로 적어요. 일정과 함께 저장돼요.', go: (ctx) => ({ to: '/schedule/new', state: { draft: { cardId: ctx.state.cards[0]?.id ?? null } } }) },
      { screen: '캘린더', about: '만든 일정이 진료일에 점으로 표시돼요.', go: () => '/calendar' },
    ],
  },
  {
    title: 'D · 진료 후 기록 · 기록 탭',
    steps: [
      { screen: '일자 상세(진료 전)', about: '그날의 일정, 할 일, 가져갈 카드를 한 화면에서 봐요. 진료 후 기록으로 이어져요.', go: (ctx) => dayOf(ctx.state, false) },
      { screen: '병원 확인', about: '일정에 적힌 병원이 맞는지 확인해요. 다르면 다시 찾을 수 있어요.', go: (ctx) => ({ to: '/clinic-confirm', state: visitState(ctx.state) }) },
      { screen: '진료 후 메모', about: '의사가 한 말을 들은 대로 적어요. AI가 정리해 줘요.', go: (ctx) => ({ to: '/visit/note', state: visitState(ctx.state) }) },
      { screen: '자동 분류 결과', about: '메모를 소견·검사·약·재방문 네 칸으로 나눠요. 원문도 그대로 남아요. 칸을 고치거나 지울 수 있어요.', go: async (ctx) => {
          const base = visitState(ctx.state)
          const result = await classifyMemo(DEMO_MEMO, base.visitedOn)
          return { to: '/visit/record', state: { ...base, memo: DEMO_MEMO, result } }
        } },
      { screen: '일자 상세(진료 완료)', about: '기록이 붙고, 재방문이 있으면 다음 일정을 제안해요. 시간만 정하면 확정돼요.', go: (ctx) => dayOf(ctx.state, true) },
      { screen: '일자 상세', about: '할 일, 일정, 기록을 편집·삭제할 수 있어요.', go: (ctx) => dayOf(ctx.state, true) },
      { screen: '기록 목록', about: '진료 기록을 시간순으로 모아요. 편집 모드로 여러 건을 골라 지울 수 있어요.', go: () => '/record' },
      { screen: '기록 상세', about: '한 번의 진료를 증상 정리 → 카드 → 일정 → 진료 → 재방문 타임라인으로 보여요.', go: (ctx) => (ctx.state.records[0] ? `/record/${ctx.state.records[0].id}` : '/record') },
      { screen: '카드 펼침', about: '기록에 연결된 브리핑 카드를 그때 상태 그대로 다시 봐요.', go: (ctx) => {
          const rec = ctx.state.records[0]
          const cardId = rec?.cardId ?? ctx.state.cards[0]?.id
          return cardId ? `/card/${cardId}` : '/cards'
        } },
    ],
  },
]

/**
 * 지금 화면이 어느 단계인지. 1부터 30. 모르면 0.
 *
 * 주소만으로 갈리지 않는 곳은 저장된 상태로 가른다 — 문답은 진행 단계로, 홈은 카드가 있는지로,
 * 일자 상세는 그 날 기록이 있는지로.
 */
function currentStep(pathname: string, search: string, state: ReturnType<typeof useStore>['state']): number {
  const hasCards = state.cards.length > 0
  if (pathname === '/') return 1
  if (pathname === '/login') return 2
  if (pathname === '/onboarding') return 3
  if (pathname === '/profile-setup') return 5
  if (pathname === '/profile-complete') return 7
  if (pathname === '/home') return hasCards ? 16 : 8
  if (pathname === '/intake') return 9
  if (pathname === '/intake/chat') return ({ 2: 10, 3: 11, 4: 12 } as Record<number, number>)[state.intake?.step ?? 2] ?? 10
  if (pathname === '/intake/done') return 13
  if (pathname === '/hospital') return search.includes('purpose=after') ? 23 : 14
  if (pathname === '/card/new' || pathname === '/cards') return 15
  if (pathname.startsWith('/card/')) return 15
  if (pathname === '/calendar') return state.appointments.length ? 21 : 17
  if (pathname === '/schedule/new') return 19
  if (pathname.startsWith('/calendar/')) {
    const date = pathname.slice('/calendar/'.length)
    return state.records.some((r) => r.visitedOn === date) ? 26 : 22
  }
  if (pathname === '/clinic-confirm') return 23
  if (pathname === '/visit/note') return 24
  if (pathname === '/visit/record') return 25
  if (pathname === '/record') return 27
  if (pathname.startsWith('/record/')) return 28
  return 0
}

export function DemoGuide() {
  const location = useLocation()
  const navigate = useNavigate()
  const { state, resetAll, signIn, startIntake, updateIntake } = useStore()
  const mapped = currentStep(location.pathname, location.search, state)

  /* 같은 주소를 쓰는 줄이 여럿이다(온보딩 3·4, 등록 5·6·7, 캘린더 17·18·21, 일정 추가 19·20,
     일자 상세 26·27, 카드 15·30). 주소만으로는 첫 줄이 켜지므로, 안내에서 눌러 간 줄은 그
     주소에 있는 동안 그 줄을 켠다. 다른 주소로 옮기면 다시 주소로 가른다. */
  const [picked, setPicked] = useState<{ step: number; at: string } | null>(null)
  const here = location.pathname + location.search
  const current = picked && picked.at === here ? picked.step : mapped

  /* 줄을 누르면 그 화면으로. 로그인 뒤 화면인데 아직 로그인 전이면 먼저 로그인한다 — 안 그러면
     `Guard` 가 로그인으로 돌려보낸다. 스플래시와 로그인 줄은 그대로 둔다. */
  const goTo = async (step: Step, n: number) => {
    const target = await step.go({ state, startIntake, updateIntake })
    const { to, state: navState } = typeof target === 'string' ? { to: target, state: undefined } : target
    if (!state.authed && to !== '/' && to !== '/login') signIn()
    const [path, query = ''] = to.split('?')
    setPicked({ step: n, at: path + (query ? `?${query}` : '') })
    navigate(to, { state: navState })
  }

  /* 저장된 것을 모두 지우고 스플래시부터 다시 시작한다. 시연을 처음부터 다시 돌릴 때 쓴다.
     `?demo=1` 로 넣은 시연 데이터도 함께 사라진다 — 다시 넣으려면 주소에 `?demo=1` 을 붙인다. */
  const reset = () => {
    if (!window.confirm('저장된 데이터를 모두 지우고 처음부터 시작할까요?')) return
    /* 먼저 스플래시로 옮기고 지운다. 순서를 바꾸면 지금 화면의 `Guard` 가 로그아웃을 먼저 보고
       로그인으로 보내 버려서 스플래시를 건너뛴다. */
    navigate('/', { replace: true })
    resetAll()
  }
  const panelRef = useRef<HTMLElement | null>(null)
  const activeRef = useRef<HTMLLIElement | null>(null)
  const partRefs = useRef<(HTMLElement | null)[]>([])

  /** 지금 단계가 속한 묶음. 못 찾으면 -1. */
  const partIndex = PARTS.findIndex((part, i) => {
    const start = PARTS.slice(0, i).reduce((sum, x) => sum + x.steps.length, 0)
    return current > start && current <= start + part.steps.length
  })

  /* 묶음이 바뀌면 그 머리를 패널 맨 위로 올린다. A 를 다 보고 B 로 넘어가면 B 가 위에 선다.
     같은 묶음 안에서 단계만 옮길 때는 줄이 보이는 만큼만 움직인다 — 매번 위로 끌어올리면
     읽던 자리가 흔들린다. */
  const lastPart = useRef<number | null>(null)
  useEffect(() => {
    const panel = panelRef.current
    const moved = partIndex >= 0 && lastPart.current !== null && lastPart.current !== partIndex
    if (partIndex >= 0) lastPart.current = partIndex
    if (!panel) return
    if (moved) {
      const head = partRefs.current[partIndex]
      if (head) {
        /* 자리 계산은 화면 좌표로 한다. `offsetTop` 은 자리잡은 조상이 무엇이냐에 따라 달라진다. */
        const delta = head.getBoundingClientRect().top - panel.getBoundingClientRect().top
        panel.scrollTo({ top: panel.scrollTop + delta - PART_TOP_GAP, behavior: 'smooth' })
        return
      }
    }
    activeRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [current, partIndex])

  let n = 0
  return (
    <aside className="mm-guide" aria-label="화면 안내" ref={panelRef}>
      <div className="mm-guide__head">
        <div className="mm-guide__title">화면 안내</div>
        <p className="mm-guide__lead">
          화면마다 무엇을 하는 곳인지 적었어요. 줄을 누르면 그 화면으로 가고, 지금 보고 있는 화면이 표시됩니다.
        </p>
      </div>
      {PARTS.map((part, pi) => (
        <section
          key={part.title}
          className="mm-guide__part"
          ref={(el) => {
            partRefs.current[pi] = el
          }}
        >
          <h3 className="mm-guide__part-title">{part.title}</h3>
          <ol className="mm-guide__list">
            {part.steps.map((step) => {
              n += 1
              /* 닫힘(onClick)이 붙잡는 값. `n` 은 계속 바뀌는 변수라 그대로 잡으면 모두 마지막 번호가 된다. */
              const no = n
              const active = no === current
              return (
                <li key={no} ref={active ? activeRef : undefined}>
                  <button
                    type="button"
                    className={`mm-guide__step${active ? ' mm-guide__step--on' : ''}`}
                    aria-current={active ? 'step' : undefined}
                    onClick={() => void goTo(step, no)}
                  >
                    <span className="mm-guide__no">{no}</span>
                    <span className="mm-guide__body">
                      <span className="mm-guide__screen">{step.screen}</span>
                      <span className="mm-guide__action">{step.about}</span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>
        </section>
      ))}
      <p className="mm-guide__note">
        음성 입력은 이 데모에 없어요. AI 문답·정리는 서버가 하고, 서버에 닿지 못하면 정해진 대본으로 흘러갑니다.
      </p>
      <button className="mm-guide__reset" onClick={reset}>
        데이터 초기화
      </button>
      <p className="mm-guide__note" style={{ marginTop: 6 }}>
        저장된 것을 모두 지우고 스플래시부터 다시 시작해요.
      </p>
    </aside>
  )
}
