import { S, fmt } from '../data/strings'

/** 도메인 모델
 *
 * 안드로이드 앱의 UiState / DTO를 웹앱용으로 옮긴 것이다.
 * 백엔드를 쓰지 않으므로 서버 DTO가 아니라 **로컬 저장 스키마**가 정본이다.
 * 대응 관계는 docs/android-analysis/12-api-contract.md 참고.
 */

export type Severity = 1 | 2 | 3 | 4 | 5

/**
 * 건강 정보 한 갈래의 상한. 원본 `HealthProfileRepository` 가 보낼 때 자르는 값이다 —
 * 항목 하나 50자, 갈래마다 20개, 직접 적는 칸 200자.
 */
export const HEALTH_ITEM_MAX_LENGTH = 50
export const HEALTH_ITEM_MAX_COUNT = 20
export const HEALTH_TEXT_MAX_LENGTH = 200

/** 사용자 기본 정보. 데모에서는 고정값을 쓴다. */
export interface UserProfile {
  name: string
  age: number
  sex: 'M' | 'F'
}

/** 신상정보 등록(1b)에서 고른 값. 브리핑 카드가 이 값을 얹는다. */
export interface HealthProfile {
  medications: string[]
  conditions: string[]
  allergies: string[]
}

/** 카드 한 줄. Figma `KV Row`. */
export interface CardItem {
  key: string
  value: string
  emphasized?: boolean
}

export interface CardHospital {
  name: string
  address?: string | null
}

/** 브리핑 카드(1e). */
export interface BriefCard {
  id: string
  title: string
  /** 작성일 YYYY-MM-DD */
  writtenOn: string
  items: CardItem[]
  severity: Severity | null
  /** 복용약·기저질환. 프로필에서 얹는 값이라 편집 대상이 아니다. */
  health: CardItem[]
  allergies: string[]
  questions: string[]
  hospital: CardHospital | null
  /** 진료 기록이 붙었는지. 상태(status)와 다른 축이다. */
  visited: boolean
  status: 'BEFORE_VISIT' | 'CONFIRMED'
  intakeId?: string
}

export interface Todo {
  id: string
  text: string
  done: boolean
}

/** 진료 일정(1r-4). */
export interface Appointment {
  id: string
  /** YYYY-MM-DD */
  date: string
  /** HH:mm · null이면 "시간 미정" */
  time: string | null
  hospitalName: string | null
  cardId: string | null
  todos: Todo[]
  /** 진료 후 기록에서 자동으로 만들어진 재방문인지 */
  followUp: boolean
  /** 재방문 일정의 시간이 확정됐는지 */
  confirmed: boolean
}

/** 서버 축 id. 원본 `VisitMapping.kt` 의 AXIS_* 상수와 같다. */
export const AXIS_FINDINGS = 'findings'
export const AXIS_TESTS = 'tests'
export const AXIS_MEDICATION = 'medication_instructions'
export const AXIS_FOLLOW_UP = 'follow_up'

/** 시안 1q-1이 그리는 차례. 모르는 축은 뒤에 그 순서대로 붙는다. */
export const AXIS_ORDER = [AXIS_FINDINGS, AXIS_TESTS, AXIS_MEDICATION, AXIS_FOLLOW_UP]

/** 일자 상세의 기록 한 줄에 쓰는 축. `RECORD_META_AXES` 와 같다. */
export const RECORD_META_AXES = [AXIS_FINDINGS, AXIS_MEDICATION, AXIS_FOLLOW_UP]

export function axisLabel(axis: string): string {
  if (axis === AXIS_FINDINGS) return '소견'
  if (axis === AXIS_TESTS) return '검사'
  if (axis === AXIS_MEDICATION) return '약'
  if (axis === AXIS_FOLLOW_UP) return '재방문'
  /* 모르는 축은 id 를 그대로 쓴다. 빈 이름으로 두면 값만 떠 있는 줄이 된다. */
  return axis
}

/**
 * 분류 결과의 한 줄.
 *
 * `tone: 'link'` 는 값을 브랜드색으로 세운다 — 재방문 날짜가 그렇다.
 */
export interface VisitItem {
  axis: string
  key: string
  value: string
  tone?: 'link'
}

/** 재방문 날짜. `approximate` 면 화면에 "전후"가 붙는다. */
export interface VisitFollowUp {
  /** YYYY-MM-DD */
  date: string
  /** "일주일 뒤"처럼 범위로 말한 것인지. 정확한 날짜를 말했으면 false. */
  approximate: boolean
}

/**
 * 진료 후 기록(1q).
 *
 * **항목 수를 고정하지 않는다.** AI가 못 찾은 축은 키가 없고, 값이 빈 것은 환자가 지운
 * 것이다. 어느 쪽이든 그릴 줄이 아니라서 `items` 에 담기지 않는다(`VisitMapping.toItems`).
 */
export interface VisitRecord {
  id: string
  cardId: string | null
  cardTitle: string
  clinic: string
  /** YYYY-MM-DD */
  visitedOn: string
  /** 값이 있는 축만. 차례는 AXIS_ORDER. */
  items: VisitItem[]
  followUp: VisitFollowUp | null
  /** 어느 항목에도 들어가지 않은 문장 */
  patientNotes: string[]
  /** 사용자가 적은 원문 */
  rawMemo: string
  createdAt: string
}

export type ChatRole = 'ai' | 'user'

export interface ChatTurn {
  role: ChatRole
  text: string
}

export interface PickedBodyPart {
  anchorId: string
  anchorLabel: string
  zoneId: string | null
  /** 화면과 카드에 쓰는 최종 표시명. 예: 오른쪽 윗배(명치) */
  label: string
}

/**
 * 증상 정리의 단계 수. Figma 의 진행 표시가 `증상 문답 n / 4`다.
 *
 * 홈의 "이어서 하기"도 이 값을 쓴다(`IntakeStep.total`). 양쪽이 각자 숫자를 들면
 * 단계가 바뀔 때 한쪽만 고쳐진다.
 */
export const INTAKE_STEPS = 4

/** 증상 정리 세션(1l~1i). 완료 전까지 "이어서 하기"로 홈에 뜬다. */
export interface IntakeSession {
  id: string
  /** 1: 부위 · 2: 문답 · 3: 통증 · 4: 추가 질문 */
  step: 1 | 2 | 3 | 4
  bodyPart: PickedBodyPart | null
  turns: ChatTurn[]
  severity: Severity | null
  questions: string[]
  /** AI 추천 질문 캐시 */
  suggested: string[]
  completed: boolean
  createdAt: string
  /**
   * 서버 AI 문답의 상태. 없으면 이 문답은 대본(`ai.ts` 의 SCRIPT)으로 흘러간 것이다.
   *
   * `POST /api/demo/previsit/*` 는 서버가 세션을 들고 있지 않고 `state` 를 돌려준다. 브라우저가
   * 보관했다가 다음 턴에 그대로 실어 보낸다(백엔드 문서). 그래서 세션에 함께 저장한다.
   */
  ai?: IntakeAi | null
}

/** 서버 AI 가 돌려준 것. [state] 는 열어 보지 않고 되보내는 값이라 형을 두지 않는다. */
export interface IntakeAi {
  state: unknown
  /** 문답이 끝났을 때 AI 가 만든 카드. 끝나기 전에는 null. */
  card: AiCard | null
}

/**
 * AI 문답이 끝나며 준 카드. 원본 `CardResponse` 의 축 부분과 같다 — 축 id 마다 상태와 값.
 * 상태는 `not_asked · filled · unknown · skipped · ambiguous`.
 */
export interface AiCard {
  title: string | null
  axes: Record<string, { status: string; value: string | null }>
  /** 의사에게 물어볼 것 후보. rank 가 낮을수록 먼저. */
  questionCandidates: { text: string; rank: number }[]
}

export interface Hospital {
  name: string
  address: string
}

/** 앱 전체 상태. 그대로 localStorage에 직렬화된다. */
export interface AppState {
  version: number
  authed: boolean
  onboardingDone: boolean
  profile: UserProfile
  health: HealthProfile
  cards: BriefCard[]
  appointments: Appointment[]
  records: VisitRecord[]
  /** 진행 중인 증상 정리. 완료하면 null로 돌아간다. */
  intake: IntakeSession | null
}

/**
 * 목록에 찍는 카드 상태. 원본 `BriefCardListViewModel.toRow()` 의 세 갈래다.
 *
 *   visited        → CONFIRMED  진료 완료
 *   status 확정    → BEFORE_VISIT 진료 전
 *   그 외          → DRAFT      작성 중
 *
 * 확정(status)과 진료 완료(visited)는 다른 축이다. 저장하기가 카드를 확정하므로,
 * 확정으로 진료 완료를 판단하면 진료 전에 "진료 완료"가 뜬다.
 */
export type CardRowStatus = 'DRAFT' | 'BEFORE_VISIT' | 'CONFIRMED'

export function cardRowStatus(card: { visited: boolean; status: string }): CardRowStatus {
  if (card.visited) return 'CONFIRMED'
  if (card.status === 'CONFIRMED') return 'BEFORE_VISIT'
  return 'DRAFT'
}

/**
 * 브리핑 카드에 담을 수 있는 질문 수.
 * 원본: core/model/BriefCardQuestions.kt 의 MAX_BRIEF_CARD_QUESTIONS (#264).
 * 문답 4단계와 카드 편집이 같은 상한을 쓴다.
 */
export const MAX_BRIEF_CARD_QUESTIONS = 5

/* 통증 강도 5단계.
 * 라벨·설명은 strings.xml, NRS 등가는 MedicalMateSeverity.kt 의 nrsFirst/nrsLast 다.
 * 문구를 여기서 새로 쓰지 말고 strings.ts 에서 꺼낸다. */

export const SEVERITY_LABELS: Record<Severity, string> = {
  1: S.severity_1_label,
  2: S.severity_2_label,
  3: S.severity_3_label,
  4: S.severity_4_label,
  5: S.severity_5_label,
}

export const SEVERITY_DESCRIPTIONS: Record<Severity, string> = {
  1: S.severity_1_description,
  2: S.severity_2_description,
  3: S.severity_3_description,
  4: S.severity_4_description,
  5: S.severity_5_description,
}

/** NRS 등가. 문서에 없고 Figma Severity Readout 마스터에서 온 값이다. */
export const SEVERITY_NRS_RANGE: Record<Severity, [number, number]> = {
  1: [1, 2],
  2: [3, 4],
  3: [5, 6],
  4: [7, 8],
  5: [9, 10],
}

export const SEVERITY_NRS: Record<Severity, string> = {
  1: fmt(S.severity_nrs, 1, 2),
  2: fmt(S.severity_nrs, 3, 4),
  3: fmt(S.severity_nrs, 5, 6),
  4: fmt(S.severity_nrs, 7, 8),
  5: fmt(S.severity_nrs, 9, 10),
}

export const SEVERITY_COLOR: Record<Severity, string> = {
  1: 'var(--mm-severity-1)',
  2: 'var(--mm-severity-2)',
  3: 'var(--mm-severity-3)',
  4: 'var(--mm-severity-4)',
  5: 'var(--mm-severity-5)',
}
