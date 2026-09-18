/** 1m 병원 찾기 · 1m-12 병원 확인 · 1p 진료 후 메모 · 1q 자동 분류 결과 · 기록 상세 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Pad, Screen } from '../components/Screen'
import {
  BottomCta,
  Button,
  Card,
  Chip,
  Dialog,
  EmptyState,
  HospitalCard,
  Icon,
  InfoTooltip,
  KvRow,
  Loading,
  QuoteBlock,
} from '../components/ui'
import { S, fmt } from '../data/strings'
import { fetchHospitals, hospitalKey, sameHospital, searchHospitals } from '../data/hospitals'
import { apiAvailable } from '../data/api'
import type { SearchResult } from '../data/hospitals'
import { classifyMemo } from '../data/ai'
import type { MemoClassification } from '../data/ai'
import { newId, useStore } from '../store/store'
import type { Hospital, VisitItem, VisitRecord } from '../lib/types'
import { formatDot, formatMonthDay, todayKey } from '../lib/date'

/* ── 1m 병원 찾기 ──────────────────────────────────────────────── */

interface PickState {
  returnTo?: string
  cardId?: string | null
  cardTitle?: string
  visitedOn?: string
  draft?: unknown
  /**
   * 고치는 중인 일정. 일정 추가 화면에서 병원을 바꾸러 올 때 함께 오고, 그대로 돌려준다.
   * 잃어버리면 돌아간 화면이 **새 일정을 만드는 것으로 알고** 같은 날에 일정이 하나 더 생긴다.
   */
  appointmentId?: string
  depth?: number
}

/**
 * 진료 후 기록 흐름이 캘린더 일자 위에 쌓은 화면 수.
 *
 * 저장하고 나면 이만큼 되감아 **흐름이 시작된 일자 화면으로 돌아간다**(원본
 * `popBackStack<CalendarDayDestination>(inclusive = false)`). 한 칸만 되돌리면 방금 적은
 * 메모 화면(1p)으로 돌아가는데, 거기서 저장하면 같은 기록이 두 번 생긴다.
 *
 * 길이 둘이라 숫자를 세어 나른다 — 병원이 등록돼 있으면 `1m-12 → 1p → 1q-1` 이고, 없으면
 * `1m → 1p → 1q-1` 이며, 확인 화면에서 "다른 곳"을 누르면 한 장이 더 붙는다. 밀어낸
 * 화면(`replace`)은 세지 않는다.
 */
const nextDepth = (depth: number | undefined, fallback: number) => (depth ?? fallback) + 1

/**
 * 와이어프레임 1m · 1m-B. Figma `489:5447`, `1041:3687`.
 *
 * 이름으로 찾으면 주소가 함께 등록돼서 환자가 주소를 따로 적을 일이 없다. 하나만 고른다 —
 * 진료 한 건에 병원이 둘일 수 없다.
 *
 * **한 화면이 두 자리에서 쓰인다.** 진료 후(1m)와 진료 전(1m-B)이다. 검색과 목록과 선택이
 * 같고 문구와 CTA 만 목적에 따라 갈린다.
 *
 * **상단 바에는 뒤로가기만 둔다.** 진료 전에 병원 없이 넘어가는 건너뛰기가 있었는데 시안의
 * 1m-B 에 그 자리가 없다. 나가는 길은 뒤로가기다.
 */
export function HospitalPickScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const purpose = (params.get('purpose') ?? 'before') as 'before' | 'after' | 'schedule'
  const nav = (location.state as PickState | null) ?? {}

  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState<Hospital | null>(null)
  const { result, searching, failed } = useHospitalSearch(query)

  /* 고른 병원이 결과에서 빠지면 선택을 지운다. 보이지 않는 것이 골라져 있으면 완료를 눌렀을
     때 무엇이 저장되는지 알 수 없다(원본 `apply`). */
  useEffect(() => {
    if (picked && !result.items.some((h) => sameHospital(h, picked))) setPicked(null)
  }, [result, picked])

  /* 아직 진료를 받지 않은 병원을 찾는 자리인지. 1m-B 와 일정 추가가 여기 해당한다. */
  const before = purpose !== 'after'
  /* 카드 안에서 병원만 바꾸러 온 것이면 만들 카드가 없다 — CTA 가 "완료"다. */
  const forExistingCard = Boolean(nav.returnTo?.startsWith('/card/') && nav.returnTo !== '/card/new')
  const submitLabel =
    purpose === 'before' && !forExistingCard ? S.hospital_pick_submit_before : S.hospital_pick_submit

  /* 시안은 결과가 없는 동안 하단 바를 비활성으로 두지 않고 아예 없앤다. 그 자리를 빈
     상태가 늘어 채운다(`showSubmit`). */
  const showSubmit = result.items.length > 0

  const submit = () => {
    if (purpose === 'after') {
      navigate('/visit/note', {
        state: {
          clinic: picked?.name ?? '',
          cardId: nav.cardId ?? null,
          cardTitle: nav.cardTitle ?? '',
          visitedOn: nav.visitedOn ?? todayKey(),
          /* 병원 찾기 자리를 메모가 대신 차지한다. 쌓인 장수는 그대로다. */
          depth: nav.depth,
        },
        replace: true,
      })
      return
    }
    if (purpose === 'schedule') {
      navigate(nav.returnTo ?? '/schedule/new', {
        state: { draft: nav.draft, hospitalName: picked?.name ?? null, appointmentId: nav.appointmentId },
        replace: true,
      })
      return
    }
    navigate(nav.returnTo ?? '/card/new', {
      state: { hospital: picked ? { name: picked.name, address: picked.address } : null },
      replace: true,
    })
  }

  /* 결과 줄의 문구. 못 찾은 것과 받은 것보다 많은 것을 가른다 — 후자에 필요한 것은
     목록을 더 보는 것이 아니라 검색어를 좁히는 것이다. */
  const resultLabel = failed && !result.items.length
    ? S.hospital_pick_result_failed
    : searching && !result.items.length
      ? S.hospital_pick_result_searching
      : !result.items.length
    ? S.hospital_pick_result_none
    : result.truncated
      ? fmt(S.hospital_pick_result_truncated, result.total, result.items.length)
      : fmt(S.hospital_pick_result_count, result.items.length)

  return (
    <Screen
      title={S.hospital_pick_title}
      onBack={() => navigate(-1)}
      surface
      bottom={
        showSubmit ? (
          <BottomCta>
            <Button onClick={submit} disabled={!before && !picked}>
              {submitLabel}
            </Button>
          </BottomCta>
        ) : undefined
      }
    >
      <Pad
        style={{
          minHeight: '100%',
          paddingTop: 12,
          paddingBottom: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--mm-s20)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mm-s8)' }}>
          <h2 className="mm-heading-l">
            {before ? S.hospital_pick_question_before : S.hospital_pick_question}
          </h2>
          <p className="mm-body-m" style={{ color: 'var(--mm-fg-subtle)', whiteSpace: 'pre-line' }}>
            {before ? S.hospital_pick_description_before : S.hospital_pick_description}
          </p>
        </div>

        <div className="mm-search">
          <span className="mm-search__icon">
            <Icon name="search" size="md" />
          </span>
          <input
            className="mm-search__input"
            placeholder={S.hospital_pick_search_placeholder}
            value={query}
            /* 고른 병원은 결과에서 빠질 때만 지운다(원본 `apply`). 글자를 고쳐도 아직 목록에 있으면 남는다. */
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              className="mm-iconbtn mm-iconbtn--sm"
              onClick={() => {
                setQuery('')
                setPicked(null)
              }}
              aria-label={S.hospital_pick_search_clear}
            >
              <Icon name="close" size="md" style={{ color: 'var(--mm-fg-muted)' }} />
            </button>
          )}
        </div>

        <div className="mm-label-m" style={{ color: 'var(--mm-fg-subtle)' }}>
          {resultLabel}
        </div>

        {result.items.length === 0 ? (
          /* 찾은 것이 없을 때. 1m-B 의 입력 전 상태이고 검색해서 안 나온 경우도 같은
             자리다. **병원 아이콘이다** — 시안의 인스턴스가 `search-off` 를 갈아 끼웠다.
             남은 높이를 받아 그 안에서 가운데에 선다. */
          <div style={{ flex: 1, display: 'flex' }}>
            <EmptyState
              icon="hospital"
              title={S.hospital_pick_empty_title}
              body={S.hospital_pick_empty_description}
            />
          </div>
        ) : (
          <div>
            {result.items.map((h, i) => (
              <ResultRow
                key={`${hospitalKey(h)}#${i}`}
                hospital={h}
                selected={sameHospital(h, picked)}
                onClick={() => setPicked(h)}
              />
            ))}
          </div>
        )}
      </Pad>
    </Screen>
  )
}

const EMPTY: SearchResult = { items: [], total: 0, truncated: false }

/**
 * 검색어가 멎으면 서버에 묻는다. 원본 `HospitalPickViewModel` 을 그대로 옮겼다.
 *
 * - **300ms 디바운스.** 한글은 한 글자에 두세 번 바뀐다. 조합이 끝나기를 기다리는 값이다.
 * - **같은 검색어는 다시 묻지 않는다.** 화면이 살아 있는 동안만 기억한다.
 * - **기다리는 동안 보이는 목록에서 먼저 좁힌다.** 좁혀서 비면 그대로 둔다 — 보이는 20곳에
 *   없다고 전국에 없는 것이 아니고, 조합 중간 상태("서울ㅂ")에서 목록을 지우면 글자마다 깜빡인다.
 * - **0건이면 직전 결과를 남긴다.** 같은 이유다.
 * - **못 닿은 것과 못 찾은 것을 가른다.** 앞은 `failed`, 뒤는 빈 목록.
 *
 * 웹만의 예외: 서버 주소가 없거나 닿지 못하면 로컬 목록(`searchHospitals`)으로 대신한다.
 * 시연은 서버가 꺼져 있어도 이어져야 한다. 한 번 닿지 못하면 `api.ts` 가 한동안 묻지
 * 않는다 — 글자마다 실패를 기다리면 목록이 한 박자 늦게 나와 고장처럼 보인다. 답을 기다리는
 * 동안 보여줄 것이 없으면 로컬 결과를 먼저 깔아 두고, 서버가 답하면 그것으로 바꾼다.
 * `failed` 는 올리되, 대신 보여줄 것이 있으면 화면은 실패 문구 대신 결과 수를 적는다.
 */
function useHospitalSearch(query: string): { result: SearchResult; searching: boolean; failed: boolean } {
  const [result, setResult] = useState<SearchResult>(EMPTY)
  const [searching, setSearching] = useState(false)
  const [failed, setFailed] = useState(false)
  const cache = useRef(new Map<string, SearchResult>())

  useEffect(() => {
    const keyword = query.trim()
    if (!keyword) {
      setResult(EMPTY)
      setSearching(false)
      setFailed(false)
      return
    }
    if (!apiAvailable()) {
      setResult(searchHospitals(keyword))
      /* 여기 오는 것은 최근에 서버에 닿지 못해 쉬는 중이라는 뜻이다. */
      setFailed(true)
      return
    }
    const cached = cache.current.get(keyword)
    if (cached) {
      setResult((prev) => (cached.items.length ? cached : { ...prev, total: cached.total }))
      setFailed(false)
      return
    }
    /* 답을 기다리는 동안 보이는 목록에서 먼저 좁힌다. 보이는 것이 없으면 로컬 결과를 깔아 둔다. */
    setResult((prev) => {
      const narrowed = prev.items.filter((h) => h.name.toLowerCase().includes(keyword.toLowerCase()))
      if (narrowed.length) return { items: narrowed, total: narrowed.length, truncated: false }
      return prev.items.length ? prev : searchHospitals(keyword)
    })
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setSearching(true)
      setFailed(false)
      try {
        const fresh = await fetchHospitals(keyword, controller.signal)
        cache.current.set(keyword, fresh)
        setResult((prev) => (fresh.items.length ? fresh : { ...prev, total: fresh.total, truncated: false }))
      } catch {
        if (controller.signal.aborted) return
        setFailed(true)
        setResult(searchHospitals(keyword))
      } finally {
        if (!controller.signal.aborted) setSearching(false)
      }
    }, SEARCH_DEBOUNCE_MS)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  return { result, searching, failed }
}

/** 검색어가 멎었다고 보는 시간. 원본 `DEBOUNCE_MILLIS`. */
const SEARCH_DEBOUNCE_MS = 300

function ResultRow({
  hospital,
  selected,
  onClick,
}: {
  hospital: Hospital
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      className={`mm-hosrow${selected ? ' mm-hosrow--on' : ''}`}
      onClick={onClick}
      role="radio"
      aria-checked={selected}
    >
      <span style={{ flex: 1, minWidth: 0 }}>
        <span className="mm-hosrow__name" style={{ display: 'block' }}>
          {hospital.name}
        </span>
        {hospital.address && (
          <span className="mm-hosrow__addr" style={{ display: 'block' }}>
            {hospital.address}
          </span>
        )}
      </span>
      {selected && <Icon name="check" />}
    </button>
  )
}

/* ── 1m-12 병원 확인 ───────────────────────────────────────────── */

export function ClinicConfirmScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const nav = (location.state as {
    clinic: string
    address?: string | null
    cardId?: string | null
    cardTitle?: string
    visitedOn?: string
    depth?: number
  } | null) ?? { clinic: '' }

  useEffect(() => {
    if (!nav.clinic) navigate('/calendar', { replace: true })
  }, [nav.clinic, navigate])

  const toNote = (clinic: string) =>
    navigate('/visit/note', {
      state: {
        clinic,
        cardId: nav.cardId ?? null,
        cardTitle: nav.cardTitle ?? '',
        visitedOn: nav.visitedOn ?? todayKey(),
        depth: nextDepth(nav.depth, 1),
      },
    })

  return (
    <Screen
      title={S.visit_note_title}
      onBack={() => navigate(-1)}
      surface
      bottom={
        <BottomCta>
          <Button onClick={() => toNote(nav.clinic)}>{S.clinic_confirm_submit}</Button>
        </BottomCta>
      }
    >
      <Pad
        style={{
          paddingTop: 12,
          paddingBottom: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--mm-s20)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mm-s8)', paddingTop: 8 }}>
          <h2 className="mm-heading-l">{S.clinic_confirm_question}</h2>
          <p className="mm-body-m" style={{ color: 'var(--mm-fg-subtle)', whiteSpace: 'pre-line' }}>
            {fmt(S.clinic_confirm_description, nav.visitedOn ? formatMonthDay(nav.visitedOn) : '')}
          </p>
        </div>

        {/* 1m 의 고른 결과 줄이다. 눌리지 않는다 — 고르는 자리가 아니라 확인하는 자리라
            아래 버튼 둘이 답이다. */}
        <div>
          <div className="mm-hosrow" style={{ display: 'block' }}>
            <div className="mm-body-l-strong" style={{ color: 'var(--mm-fg-primary)' }}>
              {nav.clinic}
            </div>
            {nav.address && <div className="mm-hosrow__addr">{nav.address}</div>}
          </div>
          <hr className="mm-divider" />
        </div>

        {/* 시안은 글자가 콘텐츠 왼쪽 끝에 붙고, 구분선에서 20 아래에 선다.
            버튼의 안쪽 여백만큼 위와 왼쪽으로 물려서 **글자를 그 자리에 두고** 누르는 자리는
            48 로 남긴다 — 위로 물리는 값은 (버튼 높이 − 글줄 20) / 2 다. */}
        <div style={{ display: 'flex' }}>
          <Button
            variant="ghost"
            size="m"
            style={{
              width: 'auto',
              marginLeft: 'calc(-1 * var(--mm-s20))',
              marginTop: 'calc((var(--mm-control-md) - 20px) / -2)',
            }}
            onClick={() =>
              navigate('/hospital?purpose=after', {
                state: {
                  cardId: nav.cardId,
                  cardTitle: nav.cardTitle,
                  visitedOn: nav.visitedOn,
                  depth: nextDepth(nav.depth, 1),
                },
              })
            }
          >
            {S.clinic_confirm_other}
          </Button>
        </div>
      </Pad>
    </Screen>
  )
}

/* ── 1p 진료 후 메모 ───────────────────────────────────────────── */

const MEMO_MAX = 300

export function VisitNoteScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const nav = (location.state as {
    clinic: string
    cardId: string | null
    cardTitle: string
    visitedOn: string
    depth?: number
  } | null) ?? { clinic: '', cardId: null, cardTitle: '', visitedOn: todayKey() }

  const [memo, setMemo] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!nav.clinic) navigate('/calendar', { replace: true })
  }, [nav.clinic, navigate])

  const organize = () => {
    if (!memo.trim() || busy) return
    setBusy(true)
    classifyMemo(memo, nav.visitedOn, nav.clinic).then((result) => {
      setBusy(false)
      navigate('/visit/record', { state: { ...nav, memo, result, depth: nextDepth(nav.depth, 1) } })
    })
  }

  const isToday = nav.visitedOn === todayKey()

  return (
    <Screen
      title={S.visit_note_title}
      onBack={() => navigate(-1)}
      surface
      bottom={
        <BottomCta>
          <Button onClick={organize} disabled={!memo.trim() || busy}>
            {busy ? 'AI가 정리하는 중이에요' : S.visit_note_save}
          </Button>
        </BottomCta>
      }
    >
      <Pad
        style={{
          paddingTop: 12,
          paddingBottom: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--mm-s16)',
        }}
      >
        {/* 앱은 제목이 먼저고 병원 카드가 그 아래다(`NoteContent`: Heading → VisitCard). */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mm-s6)' }}>
          <h2 className="mm-heading-l" style={{ whiteSpace: 'pre-line' }}>
            {S.visit_note_heading}
          </h2>
          <p className="mm-body-m" style={{ color: 'var(--mm-fg-subtle)' }}>
            {S.visit_note_description}
          </p>
        </div>

        {/* 어떤 진료를 적는 것인지. **`Hospital Card` 가 아니다** — 그쪽은 흰 면에
            그림자이고 아래가 칩 pill 인데, 여기는 조용한 면에 평평한 글줄이다. */}
        <Card variant="quiet" className="mm-card--stack">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--mm-s12)' }}>
            <span className="mm-visithead__mark">
              <Icon name="hospital" />
            </span>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div className="mm-body-l-strong">{nav.clinic}</div>
              {nav.cardTitle && (
                <div className="mm-body-s" style={{ color: 'var(--mm-fg-subtle)' }}>
                  {fmt(S.visit_note_headline_card, nav.cardTitle)}
                </div>
              )}
            </div>
          </div>
          <hr className="mm-divider" />
          <div style={{ display: 'flex', gap: 'var(--mm-s4)' }}>
            <span className="mm-body-s-strong" style={{ color: 'var(--mm-fg-primary)' }}>
              {isToday ? S.visit_note_headline_label : S.visit_note_headline_label_past}
            </span>
            <span className="mm-body-s" style={{ color: 'var(--mm-fg-subtle)' }}>
              {fmt(S.visit_note_headline_date, formatMonthDay(nav.visitedOn))}
            </span>
          </div>
        </Card>

        {/* 글자 수는 **입력 칸 안**이다. 원본 `MedicalMateTextArea` 가 `FieldSurface` 안에
            `Column { FieldText, Counter }` 로 쌓는다. 칸 밖에 두면 칸 높이(최소 120)에 셈줄이
            더해져 아래 칩 줄이 시안보다 한참 내려간다. */}
        <div className={`mm-textarea${memo ? ' mm-textarea--filled' : ''}`}>
          <textarea
            className="mm-textarea__input"
            placeholder={S.visit_note_placeholder}
            value={memo}
            maxLength={MEMO_MAX}
            onChange={(e) => setMemo(e.target.value)}
          />
          <div className={`mm-field__count${memo.length > MEMO_MAX ? ' mm-field__count--over' : ''}`}>
            {fmt(S.text_area_counter, memo.length, MEMO_MAX)}
          </div>
        </div>

        {/* 칩으로 둔다. 화면의 주 행동은 저장하기이고 이것은 적은 글을 다듬는 보조
            조작이다. 툴팁 트리거는 줄의 오른쪽 끝이다. */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          {/* 적은 글이 없으면 잠긴다(원본 `enabled = canSave`). 글이 들어오면 브랜드색으로
              열려서 다음에 누를 것이 무엇인지 보인다. */}
          <Chip tone="primary" disabled={!memo.trim() || busy} onClick={organize}>
            {S.visit_note_organize}
          </Chip>
          <InfoTooltip text={S.visit_note_organize_tooltip} label={S.visit_note_organize_tooltip_label} />
        </div>

        {busy && <Loading text="메모를 소견 · 검사 · 약 · 재방문으로 나누고 있어요" />}
      </Pad>
    </Screen>
  )
}

/* ── 진료 후 기록 카드 (1q-1 · 상세가 같은 카드) ─────────────── */

/**
 * 분류 결과 카드. Figma `587:3134`.
 *
 * 나눈 항목과 원문 메모를 한 장에 담는다. 나눈 것이 틀렸을 때 대조할 것이 원문뿐이다.
 *
 * [count] 는 AI 가 몇 가지로 나눴는지다. 저장한 기록을 다시 볼 때는 비운다 — "AI가
 * 나눴어요"는 방금 나눈 결과를 확인하는 자리의 말이다(`VisitDetailViewModel`).
 */
function VisitRecordCard({
  clinicLine,
  items,
  memo,
  count,
  edit,
}: {
  clinicLine: string
  items: VisitItem[]
  memo: string
  count?: number
  /** 편집 모드(1q-1-E). 모든 행이 입력이 되고 ×가 붙는다. 캡션은 감춘다. */
  edit?: { onChange: (index: number, value: string) => void; onDelete: (index: number) => void }
}) {
  return (
    <Card className={`mm-card--stack${edit ? ' mm-card--editing' : ''}`}>
      <div>
        <h2 className="mm-heading-s">{S.visit_record_card_title}</h2>
        <p className="mm-body-s" style={{ color: 'var(--mm-fg-subtle)', marginTop: 2 }}>
          {clinicLine}
        </p>
      </div>

      <hr className="mm-divider" />

      {/* 값이 있는 축만 그린다. 못 찾은 항목은 줄 자체가 없다 — 빈 칸을 "—" 로 채우면
          AI 가 찾았는데 값이 비었다는 뜻으로 읽힌다. */}
      {items.map((item, i) =>
        edit ? (
          <KvRow
            key={item.axis}
            label={item.key}
            value={item.value}
            edit={{
              onChange: (v) => edit.onChange(i, v),
              onDelete: () => edit.onDelete(i),
              deleteLabel: fmt(S.visit_record_item_delete, item.key),
            }}
          />
        ) : (
          <KvRow key={item.axis} label={item.key} value={item.value} tone={item.tone} />
        ),
      )}

      {/* 저장한 기록에는 원문이 없을 수 있다. 빈 인용을 세우면 적지 않은 말이 있는
          것으로 읽힌다. 항목이 하나도 없으면 앞 구분선도 뺀다. */}
      {memo.trim() && (
        <>
          {items.length > 0 && <hr className="mm-divider" />}
          <div className="mm-label-s" style={{ color: 'var(--mm-fg-subtle)' }}>
            {S.visit_record_memo}
          </div>
          <QuoteBlock label={S.visit_record_memo_quote} text={memo} />
        </>
      )}

      {!edit && count != null && count > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <span className="mm-body-s" style={{ color: 'var(--mm-fg-subtle)' }}>
            {fmt(S.visit_record_caption, count)}
          </span>
          <InfoTooltip
            text={S.visit_record_caption_tooltip}
            label={S.visit_record_caption_tooltip_label}
          />
        </div>
      )}
    </Card>
  )
}

/* ── 1q 자동 분류 결과 ─────────────────────────────────────────── */

export function VisitRecordScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const { state, addRecord, addAppointment, updateCard } = useStore()
  const nav = location.state as {
    clinic: string
    cardId: string | null
    cardTitle: string
    visitedOn: string
    memo: string
    result: MemoClassification
    depth?: number
  } | null

  /* 화면에 남을 항목. AI 가 나눈 것으로 시작하고, 편집에서 `확인`하면 사본이 이것을 갈아 끼운다. */
  const [items, setItems] = useState<VisitItem[] | null>(null)
  /* 있으면 편집 모드다. 원본을 바로 고치지 않는 이유는 취소가 있기 때문이다(`VisitRecordDraft`). */
  const [draft, setDraft] = useState<VisitItem[] | null>(null)
  /* 삭제 확인(1q-1-DC). 삭제를 취소하면 편집 모드는 그대로 남는다. */
  const [deleteOpen, setDeleteOpen] = useState(false)

  useEffect(() => {
    if (!nav) navigate('/calendar', { replace: true })
  }, [nav, navigate])
  if (!nav) return null

  const { result } = nav
  const shown = items ?? result.items
  const editing = draft !== null
  const changed = draft !== null && JSON.stringify(draft) !== JSON.stringify(shown)

  /** Nav 우측. 브리핑 카드와 같은 규칙 — `편집 → 취소 → 확인`. */
  const navAction = !editing ? S.visit_record_edit : changed ? S.visit_record_edit_done : S.visit_record_cancel
  const onNavAction = () => {
    if (!editing) {
      setDraft(shown)
      return
    }
    if (changed && draft) setItems(draft)
    setDraft(null)
  }

  /** 흐름이 시작된 캘린더 일자로 되감는다. 저장도 삭제도 같은 곳으로 나간다. */
  const leave = () => {
    if (nav.depth) navigate(-nav.depth)
    else navigate(`/calendar/${nav.visitedOn}`, { replace: true })
  }

  const save = () => {
    const record: VisitRecord = {
      id: newId('rec'),
      cardId: nav.cardId,
      cardTitle: nav.cardTitle,
      clinic: nav.clinic,
      visitedOn: nav.visitedOn,
      items: shown,
      followUp: result.followUp,
      patientNotes: result.patientNotes,
      rawMemo: result.raw,
      createdAt: new Date().toISOString(),
    }
    addRecord(record)
    if (nav.cardId) updateCard(nav.cardId, { visited: true, status: 'CONFIRMED' })

    /* 재방문 날짜가 잡혔으면 시간 미정 일정으로 캘린더에 얹는다. 시간은 일자 상세에서 확정한다.
     *
     * 앱의 `FollowUpAppointmentScheduler` 와 같은 두 가지 가드를 둔다.
     *   - 병원 이름이 비어 있으면 만들지 않는다. 어디로 가는 일정인지 없이 날짜만 남는다.
     *   - 그 날에 같은 카드가 걸린 일정이 이미 있으면 만들지 않는다. 기록을 두 번 저장해도
     *     같은 재방문이 두 줄 생기지 않는다. */
    const clinicName = nav.clinic.trim()
    const followUpDate = result.followUp?.date ?? null
    const alreadyBooked = state.appointments.some(
      (a) => a.date === followUpDate && a.cardId != null && a.cardId === nav.cardId,
    )
    if (followUpDate && clinicName && !alreadyBooked) {
      addAppointment({
        id: newId('appt'),
        date: followUpDate,
        time: null,
        hospitalName: clinicName,
        cardId: nav.cardId,
        todos: [],
        followUp: true,
        confirmed: false,
      })
    }

    /* 흐름이 시작된 캘린더 일자로 되감는다. 그 화면이 다시 읽으면서 방금 남긴 기록이
       "이 날 기록"으로 선다(1r-2-A). 되감을 깊이를 모르면(주소로 바로 들어온 경우) 그
       날짜를 밀어 넣는 것으로 대신한다. */
    leave()
  }

  return (
    <Screen
      title={S.visit_record_title}
      onBack={() => navigate(-1)}
      action={navAction}
      onAction={onNavAction}
      surface
      bottom={
        <BottomCta>
          {editing ? (
            /* 편집 중에는 `진료 후 기록 삭제` 하나다. 사본을 옮기는 것은 Nav 우측 `확인`이 하므로
               저장하기를 함께 두면 같은 일이 두 번이 된다. */
            <Button variant="danger" onClick={() => setDeleteOpen(true)}>
              {S.visit_record_delete}
            </Button>
          ) : (
            <Button onClick={save}>{S.visit_record_save}</Button>
          )}
        </BottomCta>
      }
    >
      <Pad style={{ paddingTop: 12, paddingBottom: 12 }}>
        <VisitRecordCard
          clinicLine={`${nav.clinic} · ${formatDot(nav.visitedOn)}`}
          items={draft ?? shown}
          memo={result.raw}
          count={shown.length}
          edit={
            draft
              ? {
                  onChange: (i, v) =>
                    setDraft((d) => (d ? d.map((it, at) => (at === i ? { ...it, value: v } : it)) : d)),
                  /* 항목 줄의 ×. 확인을 붙이지 않는다 — 개체가 아니라 안의 항목이고 취소가 되돌린다. */
                  onDelete: (i) => setDraft((d) => (d ? d.filter((_, at) => at !== i) : d)),
                }
              : undefined
          }
        />
      </Pad>

      {/* 아직 저장하지 않은 기록이다. 지우면 적은 것을 버리고 흐름이 시작된 일자로 돌아간다 —
          지운 기록의 화면에 남을 수 없고, 한 단계만 되돌리면 메모 화면에서 다시 저장할 수 있다. */}
      <Dialog
        open={deleteOpen}
        title={S.visit_record_delete_title}
        body={S.visit_record_delete_body}
        confirmText={S.visit_record_delete_confirm}
        cancelText={S.visit_record_cancel}
        danger
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => {
          setDeleteOpen(false)
          setDraft(null)
          leave()
        }}
      />
    </Screen>
  )
}

/* ── 진료 후 기록 상세 ─────────────────────────────────────────── */

export function VisitDetailScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { state } = useStore()
  const record = state.records.find((r) => r.id === id)

  if (!record) {
    return (
      <Screen title={S.visit_record_title} onBack={() => navigate(-1)} surface>
        <EmptyState icon="search_off" title={S.visit_detail_failed_title} body={S.visit_record_failed_description} />
      </Screen>
    )
  }

  return (
    <Screen
      title={S.visit_record_title}
      onBack={() => navigate(-1)}
      surface
    >
      <Pad style={{ paddingTop: 12, paddingBottom: 12 }}>
        {/* 카드는 1q-1 과 같다. 다른 것은 위의 `편집` 과 아래 저장하기가 없다는 것뿐이다. */}
        <VisitRecordCard
          clinicLine={`${record.clinic} · ${formatDot(record.visitedOn)}`}
          items={record.items}
          memo={record.rawMemo}
        />
      </Pad>
    </Screen>
  )
}
