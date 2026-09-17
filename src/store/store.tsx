/** 앱 상태 · localStorage 저장소
 *
 * 백엔드를 쓰지 않는다. 모든 기록은 이 파일이 브라우저 localStorage 에 넣고 뺀다.
 * 서버로 바꾸려면 persist/load 두 함수만 교체하면 된다.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type {
  Appointment,
  AppState,
  BriefCard,
  HealthProfile,
  IntakeSession,
  Todo,
  VisitRecord,
} from '../lib/types'

const STORAGE_KEY = 'medicalmate.v1'
const VERSION = 1

/** 데모 페르소나. 카카오 로그인을 흉내 내는 자리라 값을 고정해 둔다. */
const DEFAULT_STATE: AppState = {
  version: VERSION,
  authed: false,
  onboardingDone: false,
  profile: { name: '고OO', age: 34, sex: 'M' },
  health: { medications: [], conditions: [], allergies: [] },
  cards: [],
  appointments: [],
  records: [],
  intake: null,
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_STATE }
    const parsed = JSON.parse(raw) as AppState
    if (parsed.version !== VERSION) return { ...DEFAULT_STATE }
    // 필드가 빠진 예전 저장본을 대비해 기본값 위에 얹는다
    return { ...DEFAULT_STATE, ...parsed }
  } catch {
    return { ...DEFAULT_STATE }
  }
}

function persist(state: AppState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* 사생활 보호 모드 등에서 실패할 수 있다. 데모는 메모리 상태로 계속 간다. */
  }
}

export function newId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`
}

interface StoreValue {
  state: AppState
  /* 세션 */
  signIn: () => void
  signOut: () => void
  completeOnboarding: () => void
  resetAll: () => void
  /* 건강 정보 */
  setHealth: (health: HealthProfile) => void
  /* 증상 정리 */
  startIntake: () => IntakeSession
  updateIntake: (patch: Partial<IntakeSession>) => void
  clearIntake: () => void
  /* 브리핑 카드 */
  addCard: (card: BriefCard) => void
  updateCard: (id: string, patch: Partial<BriefCard>) => void
  /** 카드 여러 장을 지운다. 연결된 진료 기록은 남는다(1j-4 삭제 안내). */
  deleteCards: (ids: string[]) => void
  /* 일정 */
  addAppointment: (appt: Appointment) => void
  updateAppointment: (id: string, patch: Partial<Appointment>) => void
  deleteAppointment: (id: string) => void
  toggleTodo: (apptId: string, todoId: string) => void
  setTodos: (apptId: string, todos: Todo[]) => void
  /* 진료 후 기록 */
  addRecord: (record: VisitRecord) => void
  /**
   * 기록 여러 건을 지운다. **그 기록이 매달린 카드도 함께 지운다** — 원본은 기록만 지우는
   * API 가 없어 목록에서 지우면 서버가 카드를 지운다(`RecordItem.cardId` 주석).
   */
  deleteRecords: (ids: string[]) => void
  /* 토스트 */
  toast: string | null
  showToast: (message: string) => void
}

const StoreContext = createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => load())
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    persist(state)
  }, [state])

  useEffect(() => () => window.clearTimeout(toastTimer.current), [])

  const showToast = useCallback((message: string) => {
    setToast(message)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2200)
  }, [])

  const value = useMemo<StoreValue>(() => {
    const patch = (fn: (s: AppState) => AppState) => setState(fn)

    return {
      state,
      toast,
      showToast,

      signIn: () => patch((s) => ({ ...s, authed: true })),
      signOut: () => patch((s) => ({ ...s, authed: false })),
      completeOnboarding: () => patch((s) => ({ ...s, onboardingDone: true })),
      resetAll: () => {
        localStorage.removeItem(STORAGE_KEY)
        setState({ ...DEFAULT_STATE })
      },

      setHealth: (health) => patch((s) => ({ ...s, health })),

      startIntake: () => {
        const session: IntakeSession = {
          id: newId('itk'),
          step: 1,
          bodyPart: null,
          turns: [],
          severity: null,
          questions: [],
          suggested: [],
          completed: false,
          createdAt: new Date().toISOString(),
        }
        patch((s) => ({ ...s, intake: session }))
        return session
      },
      updateIntake: (p) => patch((s) => (s.intake ? { ...s, intake: { ...s.intake, ...p } } : s)),
      clearIntake: () => patch((s) => ({ ...s, intake: null })),

      addCard: (card) => patch((s) => ({ ...s, cards: [card, ...s.cards] })),
      updateCard: (id, p) =>
        patch((s) => ({ ...s, cards: s.cards.map((c) => (c.id === id ? { ...c, ...p } : c)) })),
      deleteCards: (ids) => patch((s) => ({ ...s, cards: s.cards.filter((c) => !ids.includes(c.id)) })),

      addAppointment: (appt) =>
        patch((s) => ({
          ...s,
          appointments: [...s.appointments, appt].sort((a, b) => a.date.localeCompare(b.date)),
        })),
      updateAppointment: (id, p) =>
        patch((s) => ({
          ...s,
          appointments: s.appointments.map((a) => (a.id === id ? { ...a, ...p } : a)),
        })),
      deleteAppointment: (id) => patch((s) => ({ ...s, appointments: s.appointments.filter((a) => a.id !== id) })),
      toggleTodo: (apptId, todoId) =>
        patch((s) => ({
          ...s,
          appointments: s.appointments.map((a) =>
            a.id === apptId
              ? { ...a, todos: a.todos.map((t) => (t.id === todoId ? { ...t, done: !t.done } : t)) }
              : a,
          ),
        })),
      setTodos: (apptId, todos) =>
        patch((s) => ({
          ...s,
          appointments: s.appointments.map((a) => (a.id === apptId ? { ...a, todos } : a)),
        })),

      addRecord: (record) => patch((s) => ({ ...s, records: [record, ...s.records] })),
      deleteRecords: (ids) =>
        patch((s) => {
          const cardIds = new Set(s.records.filter((r) => ids.includes(r.id)).map((r) => r.cardId))
          return {
            ...s,
            records: s.records.filter((r) => !ids.includes(r.id)),
            cards: s.cards.filter((c) => !cardIds.has(c.id)),
          }
        }),
    }
  }, [state, toast, showToast])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('StoreProvider 안에서 써야 합니다.')
  return ctx
}

/* ── 파생 조회 ─────────────────────────────────────────────────── */

export function cardById(state: AppState, id: string | null | undefined): BriefCard | undefined {
  if (!id) return undefined
  return state.cards.find((c) => c.id === id)
}

export function appointmentsOn(state: AppState, dateKey: string): Appointment[] {
  return state.appointments.filter((a) => a.date === dateKey)
}

export function recordsOn(state: AppState, dateKey: string): VisitRecord[] {
  return state.records.filter((r) => r.visitedOn === dateKey)
}

export function cardsOn(state: AppState, dateKey: string): BriefCard[] {
  return state.cards.filter((c) => c.writtenOn === dateKey)
}
