/** AI 기능 — 서버 + 대본
 *
 * 네 함수가 화면이 아는 전부다.
 *
 *   askNext(session, health)      문답 다음 질문
 *   suggestQuestions(session)     의사에게 물어볼 질문 추천
 *   buildCard(...)                문답 → 브리핑 카드
 *   classifyMemo(text, visitedOn) 진료 후 메모 → 소견·검사·약·재방문 4칸
 *
 * **서버가 있으면 서버 AI 를 부른다.** 백엔드가 브라우저 데모용으로 낸 `/api/demo/*` 다 —
 * 인증이 없고, 세션을 서버가 들지 않아 `state` 를 브라우저가 보관해 되보낸다. AI 계약은
 * 백엔드가 그대로 넘기는 `POST /v1/previsit/sessions` · `/v1/previsit/turns` · `/v1/postvisit/memo`.
 *
 * **서버에 닿지 못하면 대본으로 흘러간다.** 아래 SCRIPT 와 규칙 기반 분류다. 시연은 서버가
 * 꺼져 있어도 끊기지 않아야 한다. 한 문답 안에서는 한쪽만 쓴다 — 서버로 시작한 문답은
 * `session.ai` 가 있고, 대본으로 시작한 문답은 없다.
 *
 * 대본 문구는 시연 큐카드(docs/DEMO-SCENARIO-30steps.md)의 7턴을 그대로 쓴다.
 */
import type { AiCard, BriefCard, CardItem, HealthProfile, IntakeSession, Severity, UserProfile } from '../lib/types'
import { apiAvailable, apiFetch } from './api'
import {
  AXIS_FINDINGS,
  AXIS_FOLLOW_UP,
  AXIS_MEDICATION,
  AXIS_ORDER,
  AXIS_TESTS,
  MAX_BRIEF_CARD_QUESTIONS,
  RECORD_META_AXES,
  SEVERITY_LABELS,
  axisLabel,
} from '../lib/types'
import type { VisitFollowUp, VisitItem } from '../lib/types'
import { addDays, formatDot, formatMonthDay, todayKey } from '../lib/date'
import { newId } from '../store/store'

/** 진짜 호출처럼 보이게 하는 지연. 0으로 두면 즉시 답한다. */
const THINK_MS = 900
const CLASSIFY_MS = 1800

function delay<T>(value: T, ms: number): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

/* ── 1. 증상 문답 ──────────────────────────────────────────────── */

/**
 * 6턴 대본. %s 자리에 짚은 부위가 들어간다.
 *
 * 첫 말은 원본 `intakeOpeningLine` 그대로다 — 부위를 받아 주고 곧바로 언제부터인지 묻는다.
 * 조사는 부위 마지막 글자의 받침으로 고른다(`withSubjectParticle`).
 */
const SCRIPT: string[] = [
  '%s 불편하시군요. 언제부터 그러셨어요? 정확하지 않아도 괜찮아요.',
  '어떤 느낌인가요? 예를 들면 욱신거리는지, 찌르는 것 같은지, 조이는 것 같은지요.',
  '처음보다 지금은 어떤가요? 심해졌는지, 비슷한지, 나아졌는지요.',
  '어떤 때 더 심해지나요?',
  '그 불편함이 다른 곳으로 퍼지기도 하나요?',
  '같이 나타나는 다른 증상이 있나요?',
]

export const INTAKE_TURNS = SCRIPT.length

export const INTAKE_CLOSING = '말씀해 주신 내용을 정리해서 진료 때 보실 수 있게 준비했어요.'

export interface NextQuestion {
  text: string
  /** 마지막 마무리 멘트인지. true 면 입력을 닫고 `다음` 버튼을 띄운다. */
  closing: boolean
  /** 세션에 함께 저장할 것. 서버 AI 의 `state` 와 끝났을 때의 카드다. 부르는 쪽이 그대로 합친다. */
  patch?: Partial<IntakeSession>
}

/* AI 계약(`/v1/previsit`). 필드는 snake_case 다. */
interface PrevisitStart {
  reply: string
  state: unknown
}
interface PrevisitTurn {
  reply: string
  ended: boolean
  end_reason: string | null
  state: unknown
  card?: {
    title?: string | null
    axes?: Record<string, { status: string; value: string | null }>
    question_candidates?: { text: string; rank?: number }[] | null
  } | null
}

/** 표시명의 앞머리에서 좌우를 읽는다. AI 는 `side` 를 받아 부위 이름에 붙인다("오른쪽 윗배(명치)"). */
function sideOf(label: string | undefined): 'LEFT' | 'RIGHT' | 'BOTH' | null {
  if (!label) return null
  if (label.startsWith('왼쪽')) return 'LEFT'
  if (label.startsWith('오른쪽')) return 'RIGHT'
  if (label.startsWith('양쪽')) return 'BOTH'
  return null
}

function toAiCard(card: PrevisitTurn['card']): AiCard | null {
  if (!card) return null
  return {
    title: card.title ?? null,
    axes: Object.fromEntries(
      Object.entries(card.axes ?? {}).map(([axis, a]) => [axis, { status: a.status, value: a.value ?? null }]),
    ),
    questionCandidates: (card.question_candidates ?? [])
      .map((q, i) => ({ text: q.text, rank: q.rank ?? i + 1 }))
      .sort((a, b) => a.rank - b.rank),
  }
}

/**
 * 지금까지의 대화를 보고 다음 AI 발화를 만든다.
 *
 * 서버가 있고 이 문답이 서버로 시작했거나 아직 시작 전이면 서버에 묻는다. 첫 발화는
 * `POST /api/demo/previsit/sessions` 에 짚은 부위(`site_node_id`)를 보내 받고, 그 뒤는
 * `POST /api/demo/previsit/turns` 에 `state` 와 환자 발화(`utterance`)를 보낸다. 끝나는 턴에
 * `question_candidates: true` 를 얹어 4단계의 추천 질문을 함께 받고, 온보딩의 건강 정보를
 * `patient_profile` 로 싣는다(백엔드는 열어 보지 않고 넘긴다).
 *
 * 서버에 닿지 못하면 대본이다. 서버로 시작한 문답이 중간에 끊기면 그 턴만 대본으로 이어
 * 가되 `ai` 는 지워서, 그 뒤로는 대본이 맡는다.
 */
export async function askNext(session: IntakeSession, health?: HealthProfile): Promise<NextQuestion> {
  const answered = session.turns.filter((t) => t.role === 'user')
  const scripted = session.ai === null
  if (apiAvailable() && !scripted) {
    try {
      if (!session.ai && answered.length === 0) {
        const siteNodeId = session.bodyPart?.zoneId ?? session.bodyPart?.anchorId
        const side = sideOf(session.bodyPart?.label)
        const res = await apiFetch<PrevisitStart>('/api/demo/previsit/sessions', {
          body: siteNodeId ? { site_node_id: siteNodeId, ...(side ? { side } : {}) } : {},
        })
        return { text: res.reply, closing: false, patch: { ai: { state: res.state, card: null } } }
      }
      if (session.ai) {
        const res = await apiFetch<PrevisitTurn>('/api/demo/previsit/turns', {
          body: {
            state: session.ai.state,
            utterance: answered[answered.length - 1]?.text ?? '',
            question_candidates: true,
            ...(health
              ? {
                  patient_profile: {
                    medications: health.medications,
                    conditions: health.conditions,
                    allergies: health.allergies,
                  },
                }
              : {}),
          },
        })
        return {
          text: res.reply,
          closing: res.ended,
          patch: { ai: { state: res.state, card: res.ended ? toAiCard(res.card) : null } },
        }
      }
    } catch {
      /* 아래 대본으로. 서버로 시작한 문답이면 여기서 대본으로 넘어간다. */
    }
  }
  const fallback: Partial<IntakeSession> = session.ai === undefined || session.ai ? { ai: null } : {}
  if (answered.length >= SCRIPT.length) {
    return delay({ text: INTAKE_CLOSING, closing: true, patch: fallback }, THINK_MS)
  }
  const part = session.bodyPart?.label ?? '아픈 곳'
  return delay(
    { text: SCRIPT[answered.length].replace('%s', withSubjectParticle(part)), closing: false, patch: fallback },
    THINK_MS,
  )
}

/**
 * 주격 조사를 붙인다. 받침이 있으면 "이", 없으면 "가". 원본 `IntakeUiState.withSubjectParticle`.
 * 마지막 글자가 한글이 아니면(괄호 등) 그 앞의 한글을 본다. 없으면 "이"다.
 */
function withSubjectParticle(word: string): string {
  const syllable = [...word].reverse().find((ch) => ch >= '가' && ch <= '힣')
  if (!syllable) return `${word}이`
  const hasFinalConsonant = (syllable.charCodeAt(0) - 0xac00) % 28 !== 0
  return hasFinalConsonant ? `${word}이` : `${word}가`
}

/** 사용자 답변만 순서대로. 1번 답이 index 0. */
function answers(session: IntakeSession): string[] {
  return session.turns.filter((t) => t.role === 'user').map((t) => t.text.trim())
}

/* ── 2. 추천 질문 ──────────────────────────────────────────────── */

export function suggestQuestions(session: IntakeSession, health: HealthProfile): Promise<string[]> {
  /* 서버 AI 가 문답을 끝내며 준 후보. 원본 `SessionResponse.questionCandidates` 와 같은 자리다. */
  const candidates = session.ai?.card?.questionCandidates ?? []
  if (candidates.length) {
    return delay(
      candidates.map((q) => q.text).slice(0, MAX_BRIEF_CARD_QUESTIONS),
      0,
    )
  }
  const a = answers(session)
  const cond = health.conditions[0]
  const med = health.medications[0]
  const together = a[5]
  const sev = session.severity

  const q1 =
    cond && med
      ? `${cond} 때문에 복용 중인 ${med}이 이 증상과 관련이 있을까요?`
      : cond
        ? `${cond}이 이 증상과 관련이 있을까요?`
        : med
          ? `지금 복용 중인 ${med}이 이 증상과 관련이 있을까요?`
          : '이 증상이 다른 병과 관련이 있을 수 있나요?'

  const q2 = together
    ? `"${stripDot(together)}"라고 했는데, 어떤 상태인가요?`
    : '이 증상이 왜 생겼는지 알 수 있을까요?'

  const q3 = sev
    ? `지금은 "${SEVERITY_LABELS[sev]}" 정도인데, 검사를 받아야 할까요?`
    : '생활하면서 조심해야 할 것이 있을까요?'

  /* 추천도 상한 안에서만 준다. 카드가 담을 수 있는 수가 다섯이다. */
  return delay([q1, q2, q3].slice(0, MAX_BRIEF_CARD_QUESTIONS), THINK_MS)
}

/* ── 3. 브리핑 카드 만들기 ─────────────────────────────────────── */

/** 카드 제목 상한. 원본 `CardRepository.TITLE_MAX` — 넘치면 자르고 말줄임표를 붙인다. */
const TITLE_MAX = 24

function shorten(title: string): string {
  return title.length <= TITLE_MAX ? title : title.slice(0, TITLE_MAX).trimEnd() + '…'
}

/** 모른다는 답. 원본 서버가 `UNKNOWN` 으로 내리는 갈래를 스텁이 문장에서 가늠한다. */
const UNKNOWN_ANSWER = /모르|몰라|기억이?\s*안|글쎄/

/** 원본 `CardMapping.UNKNOWN_LABEL`. */
const UNKNOWN_LABEL = '잘 모르겠어요'

/** 말끝을 다듬는다. 카드에는 문장이 아니라 항목으로 들어간다. */
function tidy(raw: string | undefined): string {
  if (!raw) return ''
  let s = raw.trim()
  s = s.replace(/^(아니요|아뇨|네|예|응)[,\s]+/, '')
  s = s.replace(/^처음보다\s+/, '')
  s = s.replace(/\s*시작(됐|했)어요\.?$/, '')
  s = s.replace(/\s*(이에요|예요|이예요|입니다)\.?$/, '')
  // 쉼표로 이어진 긴 문장은 원문 그대로 둔다(앱도 그렇게 보였다)
  if (!s.includes(',')) s = s.replace(/[.]\s*$/, '')
  return s.trim()
}

function stripDot(raw: string): string {
  return raw.trim().replace(/[.]\s*$/, '')
}

/** "3주 전부터 서서히" 에서 "3주" 를 뽑는다. 카드 제목에 쓴다. */
function duration(raw: string | undefined): string | null {
  if (!raw) return null
  const m = raw.match(/(\d+)\s*(주일|주|개월|달|년|일)/)
  if (!m) return null
  const unit = m[2] === '주일' ? '주' : m[2]
  return `${m[1]}${unit}`
}

/** 부위 표시명. "오른쪽 윗배(명치)" → "명치" 처럼 괄호 안을 우선한다. */
function siteLabel(label: string | undefined): string {
  if (!label) return ''
  const inner = label.match(/\(([^)]+)\)/)
  if (inner) return inner[1]
  return label.replace(/^(왼쪽|오른쪽)\s*/, '')
}

/**
 * 카드 축의 차례와 이름. 원본 `CardMapping.AXIS_ORDER` · `axisLabel`. 강도(`severity`)는 KV 줄이
 * 아니라 눈금으로 그려서 여기 없다.
 */
const CARD_AXES: [axis: string, label: string][] = [
  ['site', '부위'],
  ['onset', '시작'],
  ['character', '양상'],
  ['radiation', '뻗치는 곳'],
  ['associated', '동반증상'],
  ['time_course', '경과'],
  ['exacerbating_relieving', '심해질 때'],
]

/**
 * 서버 AI 카드의 축을 줄로. 원본 `CardMapping.toItems` — 묻지 않은 축(`not_asked`)은 줄이 없고,
 * 물었는데 모른다고 한 축(`unknown`)은 "잘 모르겠어요"로 남긴다. 확인하지 못했다는 것이
 * 의사에게는 정보다.
 */
function itemsFromAiCard(card: AiCard): CardItem[] {
  const items: CardItem[] = []
  for (const [axis, key] of CARD_AXES) {
    const a = card.axes[axis]
    if (!a || a.status === 'not_asked') continue
    const value = a.status === 'unknown' || !a.value ? UNKNOWN_LABEL : a.value
    items.push({ key, value, ...(axis === 'onset' ? { emphasized: true } : {}) })
  }
  return items
}

export function buildCard(
  session: IntakeSession,
  health: HealthProfile,
  _profile: UserProfile,
  hospital: { name: string; address?: string | null } | null,
): BriefCard {
  const a = answers(session)
  const partLabel = session.bodyPart?.label ?? '증상'
  const dur = duration(a[0])

  /* 카드 항목 차례는 앱 화면과 같다: 부위 · 시작 · 양상 · 뻗치는 곳 · 동반증상 · 경과 · 심해질 때 */
  const items: CardItem[] = []
  const push = (key: string, value: string, emphasized = false) => {
    if (value) items.push({ key, value, ...(emphasized ? { emphasized: true } : {}) })
  }
  /* 묻지 않은 축은 줄을 만들지 않는다. 물었는데 모른다고 답한 축은 **"잘 모르겠어요"로 남긴다** —
     확인하지 못했다는 것이 의사에게는 정보다(원본 `CardMapping.toItems` 의 UNKNOWN). */
  const answer = (raw: string | undefined) => {
    if (raw === undefined) return ''
    const value = tidy(raw)
    return !value || UNKNOWN_ANSWER.test(raw) ? UNKNOWN_LABEL : value
  }
  const aiCard = session.ai?.card ?? null
  if (aiCard) {
    /* 서버 AI 가 답을 축으로 나눠 준 것을 그대로 쓴다. 원본 앱이 `CardResponse` 를 그리는 자리다. */
    items.push(...itemsFromAiCard(aiCard))
  } else {
    push('부위', siteLabel(session.bodyPart?.label))
    /* 카드마다 강조는 하나뿐이다(DESIGN.md 의 컴포넌트 규격). 시안 1e-1 은 기간을 세운다. */
    push('시작', answer(a[0]), true)
    push('양상', answer(a[1]))
    push('뻗치는 곳', answer(a[4]))
    push('동반증상', answer(a[5]))
    push('경과', answer(a[2]))
    push('심해질 때', answer(a[3]))
  }

  const healthItems: CardItem[] = []
  if (health.medications.length) healthItems.push({ key: '복용약', value: health.medications.join(' · ') })
  if (health.conditions.length) healthItems.push({ key: '기저질환', value: health.conditions.join(' · ') })

  return {
    id: newId('card'),
    title: shorten(aiCard?.title || (dur ? `${partLabel} · ${dur}` : partLabel)),
    writtenOn: todayKey(),
    items,
    severity: session.severity,
    health: healthItems,
    allergies: health.allergies,
    questions: session.questions,
    hospital,
    visited: false,
    status: 'BEFORE_VISIT',
    intakeId: session.id,
  }
}

/* ── 4. 진료 후 메모 자동 분류 ─────────────────────────────────── */

export interface MemoClassification {
  /** 값이 있는 축만. 못 찾은 축은 들어 있지 않다. */
  items: VisitItem[]
  followUp: VisitFollowUp | null
  /** 어느 축에도 들어가지 않은 문장 */
  patientNotes: string[]
  raw: string
}

const TEST_WORDS = ['검사', '피검사', '혈액', '소변', '엑스레이', 'x-ray', '초음파', '내시경', 'ct', 'mri', '촬영']
const MED_WORDS = ['약', '처방', '복용', '주사', '연고', '항생제', '진통', 'mg']
const REVISIT_WORDS = ['재방문', '다시 오', '또 오', '내원', '예약', '경과 보', '뒤에 오', '후에 오', '다음 진료']

/** 말끝의 "~라고 하셨어요" 류를 걷어내고 핵심만 남긴다.
 *
 * 문장부호를 **먼저** 떼야 한다. "위염 초기라고 하셨어요."에서 마침표를 남겨 두면
 * 어미 패턴이 문장 끝($)에 걸리지 않아 그대로 통과한다.
 */
function memoCore(sentence: string): string {
  let s = sentence.trim().replace(/[.!?·]+\s*$/, '')
  s = s.replace(/(이|가)?\s*라고\s*(하셨어요|하셨다|하셨음|했어요|들었어요|하시더라고요)$/, '')
  s = s.replace(/\s*고\s*(하셨어요|하셨다|하셨음|했어요|들었어요)$/, '')
  s = s.replace(/\s*(하셨어요|하셨다|하셨음|하셨습니다)$/, '')
  s = s.replace(/\s*처방(받았어요|받음|받았습니다|이에요|임)?$/, '')
  s = s.replace(/\s*(받았어요|받았습니다|했어요|했습니다)$/, '')
  return s.trim().replace(/[.!?·]+$/, '')
}

function hits(text: string, words: string[]): boolean {
  const lower = text.toLowerCase()
  return words.some((w) => lower.includes(w))
}

/**
 * "일주일 뒤" · "2주 뒤" · "9월 25일" 에서 날짜를 뽑는다.
 *
 * 정확한 날짜를 말했으면 `approximate: false` 다. "2주 뒤"처럼 범위로 말한 것만 "전후"가
 * 붙는다 — 날짜처럼 그리면 그날이 아니면 안 되는 것으로 읽힌다(`VisitMapping` 주석).
 */
function followUpFrom(text: string, visitedOn: string): VisitFollowUp | null {
  const explicit = text.match(/(\d{1,2})\s*월\s*(\d{1,2})\s*일/)
  if (explicit) {
    const year = Number(visitedOn.slice(0, 4))
    const m = String(Number(explicit[1])).padStart(2, '0')
    const d = String(Number(explicit[2])).padStart(2, '0')
    return { date: `${year}-${m}-${d}`, approximate: false }
  }
  const approx = (days: number): VisitFollowUp => ({ date: addDays(visitedOn, days), approximate: true })
  if (/일주일|1주/.test(text)) return approx(7)
  if (/열흘/.test(text)) return approx(10)
  if (/보름/.test(text)) return approx(15)
  if (/한\s*달|1개월|한달/.test(text)) return approx(30)
  const weeks = text.match(/(\d+)\s*주/)
  if (weeks) return approx(Number(weeks[1]) * 7)
  const months = text.match(/(\d+)\s*(개월|달)/)
  if (months) return approx(Number(months[1]) * 30)
  const days = text.match(/(\d+)\s*일\s*(뒤|후)/)
  if (days) return approx(Number(days[1]))
  return null
}

/** 재방문 줄에 덧붙이는 날짜. `(9월 25일 전후)` · 정확하면 `(9월 25일)` */
export function revisitNote(followUp: VisitFollowUp): string {
  return `(${formatMonthDay(followUp.date)}${followUp.approximate ? ' 전후' : ''})`
}

/* AI 계약(`/v1/postvisit/memo`) 응답. 필드는 snake_case 다. */
interface PostvisitMemo {
  card: {
    axes: Record<string, { status: string; value: string | null }>
    patient_notes?: string[]
    unsorted?: string[]
    follow_up_date?: { date: string | null; text?: string | null; approximate?: boolean } | null
  }
  sentences?: string[]
  labels?: Record<string, string>
  split_version?: string
}

/**
 * 진료 후 메모를 소견·검사·약·재방문으로 나눈다.
 *
 * 서버가 있으면 `POST /api/demo/postvisit/memo` 에 `{ memo, visit_date, clinic }` 을 보낸다.
 * 응답의 `card.axes` 가 축이고 `follow_up_date` 가 재방문 날짜다. 서버에 닿지 못하면 아래
 * 규칙 기반 분류다.
 */
export async function classifyMemo(text: string, visitedOn: string, clinic?: string | null): Promise<MemoClassification> {
  if (apiAvailable()) {
    try {
      const res = await apiFetch<PostvisitMemo>('/api/demo/postvisit/memo', {
        body: { memo: text.trim(), visit_date: visitedOn, ...(clinic ? { clinic } : {}) },
      })
      const fu = res.card.follow_up_date
      const followUp: VisitFollowUp | null = fu?.date ? { date: fu.date, approximate: fu.approximate ?? true } : null
      const items: VisitItem[] = AXIS_ORDER.flatMap((axis) => {
        const a = res.card.axes[axis]
        if (!a || a.status !== 'filled' || !a.value) return []
        if (axis === AXIS_FOLLOW_UP) {
          return [
            {
              axis,
              key: axisLabel(axis),
              value: followUp ? `${a.value} ${revisitNote(followUp)}` : a.value,
              tone: 'link' as const,
            },
          ]
        }
        return [{ axis, key: axisLabel(axis), value: a.value }]
      })
      return {
        items,
        followUp,
        patientNotes: [...(res.card.patient_notes ?? []), ...(res.card.unsorted ?? [])],
        raw: text.trim(),
      }
    } catch {
      /* 아래 규칙 기반으로. */
    }
  }
  return classifyMemoLocally(text, visitedOn)
}

function classifyMemoLocally(text: string, visitedOn: string): Promise<MemoClassification> {
  const sentences = text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean)

  const found = new Map<string, string>()
  const patientNotes: string[] = []
  let followUpRaw = ''

  for (const sentence of sentences) {
    const core = memoCore(sentence)
    if (!core) continue
    if (!found.has(AXIS_FOLLOW_UP) && hits(sentence, REVISIT_WORDS)) {
      followUpRaw = core
      found.set(AXIS_FOLLOW_UP, core.replace(/\s*재방문.*$/, '').trim() || core)
      continue
    }
    if (!found.has(AXIS_TESTS) && hits(sentence, TEST_WORDS)) {
      found.set(AXIS_TESTS, core)
      continue
    }
    if (!found.has(AXIS_MEDICATION) && hits(sentence, MED_WORDS)) {
      found.set(AXIS_MEDICATION, core)
      continue
    }
    if (!found.has(AXIS_FINDINGS)) {
      found.set(AXIS_FINDINGS, core)
      continue
    }
    /* 어느 축에도 못 넣은 문장은 버리지 않고 따로 든다. */
    patientNotes.push(core)
  }

  const followUp = followUpRaw ? followUpFrom(followUpRaw, visitedOn) : null

  /* 값이 있는 축만, AXIS_ORDER 차례로. 재방문 줄에는 날짜를 덧붙인다. */
  const items: VisitItem[] = AXIS_ORDER.filter((axis) => found.get(axis)).map((axis) => {
    const value = found.get(axis) as string
    if (axis === AXIS_FOLLOW_UP) {
      return {
        axis,
        key: axisLabel(axis),
        value: followUp ? `${value} ${revisitNote(followUp)}` : value,
        tone: 'link' as const,
      }
    }
    return { axis, key: axisLabel(axis), value }
  })

  return delay({ items, followUp, patientNotes, raw: text.trim() }, CLASSIFY_MS)
}

/**
 * 일자 상세의 기록 한 줄.
 * 소견 · 약 · 재방문만 쓴다(`RECORD_META_AXES`). 값의 첫 줄만 잘라 잇는다.
 */
export function recordSummary(record: { items: VisitItem[] }): string {
  return RECORD_META_AXES.map((axis) => record.items.find((i) => i.axis === axis))
    .filter((i): i is VisitItem => Boolean(i))
    .map((i) => i.value.split('\n')[0].trim())
    .filter(Boolean)
    .join(' · ')
}

/** 카드 머리의 환자 한 줄. "고OO · 34세 남 · 2026.09.15 작성" */
export function patientLine(profile: UserProfile, writtenOn: string): string {
  const sex = profile.sex === 'M' ? '남' : '여'
  return `${profile.name} · ${profile.age}세 ${sex} · ${formatDot(writtenOn)} 작성`
}

export type { Severity }
