/** 1r-1 캘린더 월 · 1r-2 일자 상세 · 1r-4 일정 추가 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Pad, Screen } from '../components/Screen'
import {
  Badge,
  BottomCta,
  BottomSheet,
  Button,
  Card,
  Dialog,
  GrowInput,
  Icon,
  ListRow,
  SectionHeader,
} from '../components/ui'
import { S, fmt } from '../data/strings'
import { recordSummary } from '../data/ai'
import { markFlowStart, popBackTo } from '../lib/flow'
import { appointmentsOn, cardsOn, newId, recordsOn, useStore } from '../store/store'
import type { Appointment, Todo } from '../lib/types'
import {
  addDays,
  daysBetween,
  formatDot,
  formatFullDate,
  formatTime,
  fromKey,
  monthGrid,
  timeOptions,
  todayKey,
} from '../lib/date'

const DOW = ['일', '월', '화', '수', '목', '금', '토']

/* ── 1r-1 월 화면 ──────────────────────────────────────────────────
 * 안드로이드 `CalendarViewModel` · `CalendarMonthScreen` 과 규칙을 맞췄다.
 *
 *  - 마커는 **한 날에 하나**다. 기록이 우선이고, 아니면 예정이다(`markerOn`).
 *  - "기록 있음"은 카드를 쓴 날 + 진료 후 기록을 남긴 날이다(#251).
 *  - "예정"은 **오늘 이후**의 일정과 아직 확정하지 않은 재방문뿐이다. 지난 일정은 안 찍는다.
 *  - 화면을 열면 오늘이 골라져 있다(`emptyState(selected = today)`).
 *  - 고른 날 아래에는 **일정만** 편다. 카드·기록 줄은 여기 나오지 않는다.
 *  - 일정이 없는 날은 제목만 두고 아래를 비운다. "없어요"를 적지 않는다(시안 1185:13797).
 *  - 일정이 없고 **카드만 쓴 날**은 갈 화면이 없어서 그 자리에서 시트로 보여준다(1r-1-S).
 */

/**
 * 탭을 떠날 때 들고 있던 날.
 *
 * 원본은 탭 이동에 `saveState = true` · `restoreState = true` 를 걸어서, 탭을 오갔다
 * 돌아오면 고른 날이 남아 있다. 웹은 화면이 매번 새로 마운트되므로 화면 밖에 둔다.
 * 새로고침하면 오늘로 돌아간다 — 앱도 탭 엔트리가 pop 되면 사라지는 값이다.
 *
 * 스크롤 위치는 아직 복원하지 않는다.
 */
let lastSelected: string | null = null

export function CalendarScreen() {
  const navigate = useNavigate()
  const { state } = useStore()
  const today = todayKey()
  /* 화면 안내가 "바텀 시트" 로 보낼 때 카드가 있는 날을 `state.selectDate` 로 준다. 앱에는 없는 입구다. */
  const selectDate = (useLocation().state as { selectDate?: string } | null)?.selectDate ?? null
  const [cursor, setCursor] = useState(() => {
    const d = fromKey(selectDate ?? lastSelected ?? today)
    return { year: d.getFullYear(), month: d.getMonth() + 1 }
  })
  /* 앱과 같이 처음부터 오늘이 골라져 있다. 다만 탭을 오갔다 돌아온 것이면 그때 보던 날이다. */
  const [selected, setSelected] = useState<string>(selectDate ?? lastSelected ?? today)
  const [sheetOpen, setSheetOpen] = useState(true)

  useEffect(() => {
    lastSelected = selected
  }, [selected])

  const cells = useMemo(() => monthGrid(cursor.year, cursor.month), [cursor])

  const move = (delta: number) => {
    setCursor((c) => {
      const m = c.month + delta
      if (m < 1) return { year: c.year - 1, month: 12 }
      if (m > 12) return { year: c.year + 1, month: 1 }
      return { year: c.year, month: m }
    })
  }

  /** 기록 있음 — 카드를 쓴 날과 진료 후 기록을 남긴 날 */
  const recordDays = useMemo(() => {
    const days = new Set<string>()
    state.cards.forEach((c) => days.add(c.writtenOn))
    state.records.forEach((r) => days.add(r.visitedOn))
    return days
  }, [state.cards, state.records])

  /** 예정 — 오늘 이후의 일정과 확정 안 된 재방문만 */
  const plannedDays = useMemo(() => {
    const days = new Set<string>()
    state.appointments.forEach((a) => {
      if (a.date >= today) days.add(a.date)
    })
    state.records.forEach((r) => {
      if (r.followUp && r.followUp.date >= today) days.add(r.followUp.date)
    })
    return days
  }, [state.appointments, state.records, today])

  const daySchedules = appointmentsOn(state, selected)
  /* 일정이 없는 날에만 카드 시트가 뜬다 */
  const sheetCard = daySchedules.length === 0 ? cardsOn(state, selected)[0] : undefined
  /* 그 카드로 이미 만든 일정이 있으면 시트가 그리로 보낸다 */
  const sheetCardScheduledOn = sheetCard
    ? (state.appointments.find((a) => a.cardId === sheetCard.id)?.date ?? null)
    : null

  const cardTitle = (id: string | null) => (id ? (state.cards.find((c) => c.id === id)?.title ?? '') : '')

  const pickDay = (key: string) => {
    setSelected(key)
    setSheetOpen(true)
  }

  return (
    <Screen title={S.calendar_title} tab="calendar" surface>
      <Pad
        style={{
          paddingTop: 12,
          paddingBottom: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--mm-s14)',
        }}
      >
        <div className="mm-cal__month">
          <button className="mm-iconbtn" onClick={() => move(-1)} aria-label={S.calendar_previous_month}>
            <Icon name="chevron_left" />
          </button>
          <h2>{fmt(S.calendar_month, cursor.year, cursor.month)}</h2>
          <button className="mm-iconbtn" onClick={() => move(1)} aria-label={S.calendar_next_month}>
            <Icon name="chevron_right" />
          </button>
        </div>

        <div className="mm-cal">
          <div className="mm-cal__head">
            {DOW.map((d) => (
              <div key={d} className="mm-cal__dow">
                {d}
              </div>
            ))}
          </div>
          <div className="mm-cal__grid">
            {cells.map((cell) => {
              /* 달 밖의 칸은 빈 자리다. 자리는 차지해야 요일이 어긋나지 않지만 날짜를
                 적지 않는다 — 원본 격자가 그 자리에 빈 상자를 둔다. */
              if (!cell.inMonth) return <span key={cell.key} className="mm-datecell" aria-hidden="true" />
              /* 한 날에 마커는 하나다. 기록이 예정보다 앞선다. */
              const marker = recordDays.has(cell.key)
                ? 'record'
                : plannedDays.has(cell.key)
                  ? 'plan'
                  : null
              const isSelected = selected === cell.key
              return (
                <button
                  key={cell.key}
                  className={[
                    'mm-datecell',
                    cell.key === today && !isSelected ? 'mm-datecell--today' : '',
                    isSelected ? 'mm-datecell--selected' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => pickDay(cell.key)}
                  aria-current={cell.key === today ? 'date' : undefined}
                >
                  <span>{cell.day}</span>
                  <span className="mm-datecell__dots">
                    {marker && <i className={`mm-dot mm-dot--${marker}`} />}
                  </span>
                </button>
              )
            })}
          </div>
          <div className="mm-cal__legend mm-body-s">
            <span>
              <i className="mm-dot mm-dot--record" /> {S.calendar_legend_record}
            </span>
            <span>
              <i className="mm-dot mm-dot--plan" /> {S.calendar_legend_planned}
            </span>
          </div>
        </div>

        {/* 고른 날의 일정. 없으면 제목만 두고 비운다 — 그 날 무엇을 할지는 아래
            + 버튼이 이미 말하고 있다. */}
        <section>
          <SectionHeader title={formatFullDate(selected)} />
          {daySchedules.length > 0 && (
            <div style={{ display: 'grid', gap: 'var(--mm-s8)' }}>
              {daySchedules.map((a) => {
                const dday = daysBetween(today, a.date)
                const meta = [formatTime(a.time) ?? S.calendar_time_unset, cardTitle(a.cardId)]
                  .filter(Boolean)
                  .join(' · ')
                return (
                  <ListRow
                    key={a.id}
                    title={a.hospitalName ?? '병원 미정'}
                    sub={meta}
                    /* 지난 일정에는 D-day 를 붙이지 않는다 */
                    badge={
                      dday >= 0 ? <Badge tone="primary">{fmt(S.calendar_day_dday, dday)}</Badge> : undefined
                    }
                    onClick={() => navigate(`/calendar/${a.date}`, { state: { appointmentId: a.id } })}
                  />
                )
              })}
            </div>
          )}
        </section>
      </Pad>

      <button
        className="mm-fab-add"
        aria-label={S.calendar_add_schedule}
        onClick={() => navigate('/schedule/new', { state: { draft: { date: selected } } })}
      >
        <Icon name="plus" />
      </button>

      {/* 1r-1-S · 카드만 있는 날 시트 */}
      <BottomSheet
        open={sheetCard != null && sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={formatFullDate(selected)}
      >
        {sheetCard && (
          <>
            <SectionHeader title={S.calendar_card_sheet_section} />
            {/* 카드 줄의 배지는 중립이다. 확정이 아니라 진료를 다녀왔는지로 가르고,
                그 사실이 완료를 알리는 색을 쓸 만큼 센 소식은 아니다. */}
            <ListRow
              title={sheetCard.title}
              sub={fmt(S.calendar_day_card_meta, formatDot(sheetCard.writtenOn), sheetCard.items.length)}
              badge={
                <Badge>
                  {sheetCard.visited ? S.brief_card_status_confirmed : S.brief_card_status_before_visit}
                </Badge>
              }
              onClick={() => navigate(`/card/${sheetCard.id}`)}
            />

            <p
              className="mm-body-s"
              style={{ color: 'var(--mm-fg-muted)', margin: 'var(--mm-s10) 0 var(--mm-s14)' }}
            >
              {sheetCardScheduledOn ? S.calendar_card_sheet_hint_scheduled : S.calendar_card_sheet_hint}
            </p>
            <Button
              onClick={() =>
                sheetCardScheduledOn
                  ? navigate(`/calendar/${sheetCardScheduledOn}`)
                  : navigate('/schedule/new', {
                      state: {
                        draft: {
                          date: selected,
                          cardId: sheetCard.id,
                          hospitalName: sheetCard.hospital?.name ?? null,
                        },
                      },
                    })
              }
            >
              {sheetCardScheduledOn ? S.calendar_card_sheet_open : S.calendar_card_sheet_schedule}
            </Button>
          </>
        )}
      </BottomSheet>
    </Screen>
  )
}

/* ── 1r-2 일자 상세 ────────────────────────────────────────────── */

export function CalendarDayScreen() {
  const { date = todayKey() } = useParams()
  /* 누른 일정. 하루에 둘 이상일 수 있어 날짜만으로는 첫 건이 열린다. */
  const openedId = (useLocation().state as { appointmentId?: string } | null)?.appointmentId ?? null
  const navigate = useNavigate()
  const { state, toggleTodo, setTodos, deleteAppointment } = useStore()
  const today = todayKey()

  /* 있으면 편집 중이다(1r-2-E). 문서의 CRUD 규칙대로 사본을 고치고 취소하면 버린다. 지울 수 있는
     것은 할 일 줄과 이 날 일정 자체 둘이고, 일정 삭제는 Danger 버튼과 확인 대화상자를 거친다. */
  const [todoDraft, setTodoDraft] = useState<Todo[] | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const appts = appointmentsOn(state, date)
  const records = recordsOn(state, date)
  const dayCards = cardsOn(state, date)
  const appt = appts.find((a) => a.id === openedId) ?? appts[0]
  const card = appt?.cardId ? state.cards.find((c) => c.id === appt.cardId) : dayCards[0]
  const visited = records.length > 0

  const editing = todoDraft !== null
  /* 화면에 그릴 할 일. 편집 중이면 사본, 아니면 본값. 바뀐 것은 줄 수로 안다 — 편집에서 할 수 있는
     조작이 지우기뿐이다(`CalendarDayUiState.changed`). */
  const todos = appt?.todos ?? []
  const shownTodos = todoDraft ?? todos
  const changed = todoDraft !== null && todoDraft.length !== todos.length
  const navAction = !editing ? S.calendar_day_edit : changed ? S.calendar_day_edit_done : S.calendar_day_edit_cancel
  const onNavAction = () => {
    if (!editing) {
      setTodoDraft(todos)
      return
    }
    /* 통째로 갈아끼운다. 지운 줄이 남지 않으려면 화면에 있는 것을 전부 보내야 한다. */
    if (changed && appt && todoDraft) setTodos(appt.id, todoDraft)
    setTodoDraft(null)
  }
  /* 일정 카드는 **편집 중에만** 누른다.
   *
   * 읽는 중에는 이 판이 보여 주기만 한다. 원본은 시각이 없는 일정에 한해 읽는 중에도 눌러서
   * 고치러 갔는데(#230), 웹에서는 그것을 접었다 — Nav 우측에 `편집`이 있는 화면이라 읽는
   * 중에 누르는 자리가 섞이면 무엇이 눌리는 판인지 알 수 없다. 고치는 길은 한 문으로 모은다.
   *
   * 편집 중에는 일정이 있으면 늘 누를 수 있다. 병원 · 날짜 · 시각을 바꿀 자리가 여기밖에
   * 없어서다 — 일정 추가 화면이 병원 · 날짜 · 시간 · 가져갈 카드 · 할 일을 한 번에 들고 있다. */
  const scheduleTappable = editing && Boolean(appt)
  const editSchedule = () => appt && navigate('/schedule/new', { state: { appointmentId: appt.id } })

  /* 다음 일정.
   *
   * 앱(`CalendarDayViewModel.nextEvent`)은 **그 날 기록이 있을 때만** 이 구역을 만든다.
   * 그리고 재방문 플래그가 붙은 것만 찾지 않는다 — 그 날짜 **이후의 일정** 중 가장 이른
   * 것을 먼저 보고, 없으면 기록에 적힌 재방문 날짜를 쓴다. */
  const next = visited
    ? state.appointments
        .filter((a) => a.date > date)
        .sort((a, b) => a.date.localeCompare(b.date))[0]
    : undefined

  const startRecord = () => {
    const payload = {
      cardId: card?.id ?? null,
      cardTitle: card?.title ?? '',
      visitedOn: date,
    }
    /* `depth` 는 이 화면 위에 쌓이는 장수를 센다. 1q-1 이 저장하고 여기까지 되감는다. */
    if (appt?.hospitalName) {
      navigate('/clinic-confirm', {
        state: {
          ...payload,
          clinic: appt.hospitalName,
          address: card?.hospital?.address ?? null,
          depth: 1,
        },
      })
    } else {
      navigate('/hospital?purpose=after', { state: { ...payload, depth: 1 } })
    }
  }

  /* 원본 `CalendarDayViewModel`: 잡아 둔 일정(`toNextEvent`)은 "D-n" 칩에 병원 이름이고,
     기록에 적힌 재방문 날짜(`toRevisit`)는 날짜 칩("전후"까지)에 "{병원} 재방문" / 병원이 없으면
     "재방문 예정"이다. 웹은 재방문 날짜도 미확정 일정으로 들고 있어서 `followUp && !confirmed`
     가 그 갈래다. */
  const revisit = next ? next.followUp && !next.confirmed : false
  const approximate =
    next && revisit
      ? state.records.some(
          (r) => r.cardId === next.cardId && r.followUp?.date === next.date && r.followUp.approximate,
        )
      : false
  const nextChip = next
    ? revisit
      ? formatFullDate(next.date) + (approximate ? ' 전후' : '')
      : fmt(S.calendar_day_dday, daysBetween(today, next.date))
    : ''
  const nextTitle = next
    ? revisit
      ? next.hospitalName
        ? `${next.hospitalName} 재방문`
        : '재방문 예정'
      : next.hospitalName
    : ''

  return (
    <Screen
      title={formatFullDate(date)}
      onBack={() => navigate('/calendar')}
      action={navAction}
      onAction={onNavAction}
    >
      <Pad
        style={{
          paddingTop: 12,
          paddingBottom: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--mm-s8)',
        }}
      >
        {/* 이 날 일정. 흰 카드가 아니라 옅은 브랜드 면이고, 상태는 배지가 아니라
            `Label/S` 한 줄이다. */}
        {appt && (
          <>
            <SectionHeader title={S.calendar_day_schedule} />
            <div
              className={`mm-dayschedule${scheduleTappable ? ' mm-dayschedule--tap' : ''}`}
              role={scheduleTappable ? 'button' : undefined}
              tabIndex={scheduleTappable ? 0 : undefined}
              aria-label={scheduleTappable ? S.calendar_day_schedule_modify : undefined}
              onClick={scheduleTappable ? editSchedule : undefined}
              onKeyDown={(e) => {
                if (!scheduleTappable) return
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  editSchedule()
                }
              }}
            >
              {/* 편집 중에는 누르면 다른 화면이 열린다는 것을 표시한다. 아래 브리핑 카드 줄과
                  같은 꺾쇠다 — 같은 뜻이면 같은 모양이어야 한다. */}
              {editing && (
                <span className="mm-dayschedule__go">
                  <Icon name="chevron_right" size="md" />
                </span>
              )}
              {visited ? (
                <span className="mm-label-s" style={{ color: 'var(--mm-fg-success)' }}>
                  {S.calendar_day_visited}
                </span>
              ) : (
                daysBetween(today, date) >= 0 && (
                  <span className="mm-label-s" style={{ color: 'var(--mm-fg-subtle)' }}>
                    {fmt(S.calendar_day_dday, daysBetween(today, date))}
                  </span>
                )
              )}
              <div className="mm-heading-s">
                {fmt(
                  S.home_schedule_title,
                  appt.hospitalName ?? '병원 미정',
                  appt.followUp ? S.home_schedule_follow_up : S.home_schedule_first,
                )}
              </div>
              <div className="mm-body-m" style={{ color: 'var(--mm-fg-subtle)' }}>
                {formatTime(appt.time) ?? S.calendar_time_unset}
              </div>
              {card && (
                <div className="mm-body-m" style={{ color: 'var(--mm-fg-subtle)' }}>
                  {fmt(S.calendar_day_schedule_card, card.title)}
                </div>
              )}
            </div>
          </>
        )}

        {/* 가져갈 브리핑 카드 */}
        {card && (
          <>
            <SectionHeader title={visited ? S.calendar_day_card_done : S.calendar_day_card} />
            {/* 편집 중이면 **카드의 편집 상태로 바로** 연다. 고치려고 들어왔는데 원본이 먼저
                뜨고 거기서 다시 `편집`을 눌러야 하는 것은 한 걸음이 남는 것이다. 읽는 중에는
                그대로 카드를 본다. */}
            <ListRow
              title={card.title}
              sub={fmt(S.calendar_day_card_meta, formatDot(card.writtenOn), card.items.length)}
              badge={
                <Badge>{card.visited ? S.brief_card_status_confirmed : S.brief_card_status_before_visit}</Badge>
              }
              onClick={() => navigate(`/card/${card.id}`, editing ? { state: { edit: true } } : undefined)}
            />
          </>
        )}

        {/* 진료 전 할 일 */}
        {/* 진료가 끝난 날에는 진료 전 할 일을 두지 않는다. 시안 1r-2-A 도 그렇다.
            (`CalendarDayViewModel`: todos = if (records.isEmpty()) ... else emptyList()) */}
        {appt && shownTodos.length > 0 && !visited && (
          <>
            <SectionHeader title={S.calendar_day_todo} />
            <div>
              {shownTodos.map((t) => (
                <div className="mm-todo" key={t.id}>
                  <button
                    className={`mm-todo__box${t.done ? ' mm-todo__box--on' : ''}`}
                    onClick={() => toggleTodo(appt.id, t.id)}
                    aria-pressed={t.done}
                    aria-label={t.text}
                  >
                    <Icon name="check" size="sm" />
                  </button>
                  <span className={`mm-todo__text${t.done ? ' mm-todo__text--done' : ''}`}>{t.text}</span>
                  {/* 삭제 ×는 편집 상태(1r-2-E)에만 붙는다. 사본에서만 지우고 `확인`이 옮긴다. */}
                  {editing && (
                    <button
                      className="mm-iconbtn"
                      onClick={() => setTodoDraft((d) => (d ? d.filter((x) => x.id !== t.id) : d))}
                      aria-label={fmt(S.calendar_day_todo_delete, t.text)}
                    >
                      <Icon name="close" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* 이 날 기록 */}
        <SectionHeader title={S.calendar_day_record} />
        {records.length === 0 ? (
          <div className="mm-empty" style={{ paddingTop: 24 }}>
            <span className="mm-empty__icon">
              <Icon name="empty_box" />
            </span>
            <div className="mm-empty__text">
              <div className="mm-empty__title">{S.calendar_day_record_empty_title}</div>
              <div className="mm-empty__body">{S.calendar_day_record_empty_description}</div>
            </div>
            {/* 앱은 붙일 카드가 있을 때만 이 버튼을 준다(`actionLabel = card?.let { ... }`).
                카드가 없으면 기록을 어느 카드에 달지 정할 수 없다. */}
            {card && (
              <button className="mm-empty__action" onClick={startRecord}>
                {S.calendar_day_record_empty_action}
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {records.map((r) => (
              <ListRow
                key={r.id}
                title={S.visit_record_card_title}
                sub={recordSummary(r)}
                onClick={() => navigate(`/visit/${r.id}`)}
              />
            ))}
          </div>
        )}

        {/* 다음 일정 */}
        {next && (
          <>
            <SectionHeader title={S.calendar_day_next} />
            <Card variant="primary">
              {/* 칩 · 제목(Heading/S) · 줄들이 4 씩 떨어진다(`spacedBy(s4)`). 확정 버튼은 위 8 을 더 띈다. */}
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 'var(--mm-s4)' }}>
                <span className="mm-nextchip" style={{ alignSelf: 'flex-start' }}>
                  {nextChip}
                </span>
                <div className="mm-heading-s">{nextTitle}</div>
                {next.confirmed || next.time ? (
                  <div className="mm-body-m">
                    {formatFullDate(next.date)} {formatTime(next.time)}
                  </div>
                ) : (
                  <>
                    <div className="mm-body-s">{S.calendar_day_next_auto}</div>
                    <div className="mm-body-s">{S.calendar_day_next_hint}</div>
                    {/* 확정하러 가면 병원이 이미 채워진 일정 추가(1r-4-B)가 열린다. Tonal M, 위 8. */}
                    <div style={{ marginTop: 'var(--mm-s8)' }}>
                      <Button
                        variant="tonal"
                        size="m"
                        onClick={() => navigate('/schedule/new', { state: { appointmentId: next.id } })}
                      >
                        <Icon name="clock" size="md" />
                        {S.calendar_day_next_confirm}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </Card>
          </>
        )}

        {/* 일정 삭제. **하단에 고정하지 않고 본문 끝에 둔다.** 고정하면 편집을 누르는 순간 본문 위로
            들어서면서 마지막 요소를 자른다. 앞 섹션과 한 칸(12) 더 띄운다 — 본문의 마지막 줄이 아니라
            따로 선 동작이다. */}
        {editing && appt && (
          <div style={{ marginTop: 'var(--mm-s12)' }}>
            <Button variant="danger" onClick={() => setDeleteOpen(true)}>
              {S.calendar_day_schedule_delete}
            </Button>
          </div>
        )}
      </Pad>

      <Dialog
        open={deleteOpen}
        title={S.calendar_day_schedule_delete_title}
        body={S.calendar_day_schedule_delete_body}
        confirmText={S.calendar_day_schedule_delete_confirm}
        cancelText={S.calendar_day_edit_cancel}
        danger
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => {
          if (!appt) return
          setDeleteOpen(false)
          setTodoDraft(null)
          deleteAppointment(appt.id)
          /* 지워진 일정의 화면에 남을 수 없다. 캘린더로 돌아간다(원본 `onDeleted` → popBackStack). */
          navigate('/calendar', { replace: true })
        }}
      />
    </Screen>
  )
}

/* ── 1r-4 일정 추가 ────────────────────────────────────────────── */

interface Draft {
  date: string | null
  time: string | null
  hospitalName: string | null
  cardId: string | null
  todos: Todo[]
}

export function ScheduleAddScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const { state, addAppointment, updateAppointment, startIntake } = useStore()
  const nav =
    (location.state as {
      draft?: Partial<Draft>
      hospitalName?: string | null
      /** 있으면 그 일정을 고치는 것이다(1r-4-B). 병원·날짜·시간·카드·할 일이 채워져 열린다. */
      appointmentId?: string
    } | null) ?? {}
  const editing = nav.appointmentId ? state.appointments.find((a) => a.id === nav.appointmentId) : undefined

  const [draft, setDraft] = useState<Draft>(() => ({
    date: nav.draft?.date ?? editing?.date ?? null,
    time: nav.draft?.time ?? editing?.time ?? null,
    hospitalName: nav.hospitalName ?? nav.draft?.hospitalName ?? editing?.hospitalName ?? null,
    cardId: nav.draft?.cardId ?? editing?.cardId ?? null,
    todos: nav.draft?.todos ?? editing?.todos ?? [],
  }))
  const [sheet, setSheet] = useState<'date' | 'time' | null>(null)
  /** 그 자리에서 받는 줄. 빈 채로 끝내면 줄이 사라진다. */
  const [editingTodo, setEditingTodo] = useState<string | null>(null)

  /* 병원 찾기에서 돌아오면 고른 이름을 얹는다 */
  useEffect(() => {
    if (nav.hospitalName) setDraft((d) => ({ ...d, hospitalName: nav.hospitalName ?? d.hospitalName }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nav.hospitalName])

  const addTodo = () => {
    const id = newId('todo')
    setDraft((d) => ({ ...d, todos: [...d.todos, { id, text: '', done: false }] }))
    setEditingTodo(id)
  }

  /** 다 적었으면 줄을 닫는다. 아무것도 안 적었으면 그 줄을 버린다. */
  const finishTodo = (id: string) => {
    setDraft((d) => ({ ...d, todos: d.todos.filter((t) => t.id !== id || t.text.trim()) }))
    setEditingTodo(null)
  }

  /* **버튼을 비활성으로 막지 않는다.** 눌러야 무엇이 비었는지 알 수 있다. 비면 그 칸
     아래에 안내가 붙는다(문서: 비활성만으로 필요한 행동을 숨기지 말 것). */
  const [showErrors, setShowErrors] = useState(false)
  const hospitalMissing = showErrors && !draft.hospitalName
  const dateMissing = showErrors && !draft.date

  const save = () => {
    if (!draft.hospitalName || !draft.date) {
      setShowErrors(true)
      return
    }
    if (editing) {
      /* 고치는 것이면 그 일정을 갈아 끼우고 왔던 화면으로 돌아간다(원본 `onSaved = popBackStack`). */
      updateAppointment(editing.id, {
        date: draft.date,
        time: draft.time,
        hospitalName: draft.hospitalName,
        cardId: draft.cardId,
        todos: draft.todos,
        confirmed: draft.time != null,
      })
      /* 왔던 일자 화면으로 돌아간다(원본 `onSaved = popBackStack`). 한 장만 되돌리면,
         병원을 바꾸러 다녀온 경우 같은 화면이 두 장 쌓여 있어 제자리에 선다. */
      popBackTo(navigate, `/calendar/${draft.date}`)
      return
    }
    addAppointment({
      id: newId('appt'),
      date: draft.date,
      time: draft.time,
      hospitalName: draft.hospitalName,
      cardId: draft.cardId,
      todos: draft.todos,
      followUp: false,
      confirmed: draft.time != null,
    })
    navigate('/calendar', { replace: true })
  }

  return (
    <Screen
      title={S.schedule_add_title}
      onBack={() => navigate(-1)}
      backIcon="close"
      bottom={
        <BottomCta>
          <Button onClick={save}>{S.schedule_add_save}</Button>
        </BottomCta>
      }
    >
      <Pad style={{ paddingTop: 8, paddingBottom: 8 }}>
        {/* 병원 */}
        <div className="mm-field__label" style={{ marginTop: 16 }}>
          {S.schedule_add_hospital}
        </div>
        <button
          className={`mm-picker${draft.hospitalName ? '' : ' mm-picker--empty'}${
            hospitalMissing ? ' mm-picker--error' : ''
          }`}
          onClick={() =>
            navigate('/hospital?purpose=schedule', {
              /* 고치는 중이면 그 일정 id 를 함께 보낸다. 돌아왔을 때 이것이 없으면 새 일정을
                 만드는 화면이 되어, 저장할 때 같은 날에 일정이 하나 더 생긴다. */
              state: { returnTo: '/schedule/new', draft, appointmentId: nav.appointmentId },
            })
          }
        >
          <span>{draft.hospitalName ?? S.schedule_add_hospital_placeholder}</span>
          <span className="mm-picker__icon">
            <Icon name="chevron_right" size="md" />
          </span>
        </button>
        {hospitalMissing && <div className="mm-picker__error">{S.schedule_add_hospital_required}</div>}

        {/* 날짜 · 시간. 아이콘이 다르다 — 글자가 비었을 때 어느 쪽이 무엇인지 아이콘으로
            먼저 읽힌다. */}
        <div className="mm-field__label" style={{ marginTop: 16 }}>
          {S.schedule_add_datetime}
        </div>
        <div className="mm-picker-row">
          <div>
            <button
              className={`mm-picker${draft.date ? '' : ' mm-picker--empty'}${
                dateMissing ? ' mm-picker--error' : ''
              }`}
              onClick={() => setSheet('date')}
            >
              <span>{draft.date ? formatFullDate(draft.date) : S.schedule_add_date_placeholder}</span>
              <span className="mm-picker__icon">
                <Icon name="calendar" size="md" />
              </span>
            </button>
            {dateMissing && <div className="mm-picker__error">{S.schedule_add_date_required}</div>}
          </div>
          <button
            className={`mm-picker${draft.time ? '' : ' mm-picker--empty'}`}
            onClick={() => setSheet('time')}
          >
            <span>{formatTime(draft.time) ?? S.schedule_add_time_placeholder}</span>
            <span className="mm-picker__icon">
              <Icon name="clock" size="md" />
            </span>
          </button>
        </div>

        {/* 가져갈 브리핑 카드. 머리 오른쪽의 고른 수는 누르는 링크가 아니라 읽기만
            하는 표시라 캡션 자리다. */}
        <SectionHeader
          title={S.schedule_add_cards}
          count={draft.cardId ? fmt(S.schedule_add_cards_count, 1) : S.schedule_add_cards_none}
        />
        <div style={{ display: 'grid', gap: 'var(--mm-s10)' }}>
          {state.cards.map((c) => {
            const on = draft.cardId === c.id
            return (
              <button
                key={c.id}
                className={`mm-cardpick${on ? ' mm-cardpick--on' : ''}`}
                role="checkbox"
                aria-checked={on}
                onClick={() => setDraft((d) => ({ ...d, cardId: on ? null : c.id }))}
              >
                <span className={`mm-todo__box${on ? ' mm-todo__box--on' : ''}`}>
                  <Icon name="check" size="sm" />
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="mm-cardpick__title" style={{ display: 'block' }}>
                    {c.title}
                  </span>
                  <span className="mm-cardpick__meta" style={{ display: 'block' }}>
                    {formatDot(c.writtenOn).slice(5)} 작성
                    {c.hospital?.name ? ` · ${c.hospital.name}` : ''}
                  </span>
                </span>
              </button>
            )
          })}
          <button
            className="mm-addrow"
            onClick={() => {
              startIntake()
              /* 흐름에 들어간다. 카드를 저장하면 여기까지 걷어낸다. */
              markFlowStart()
              navigate('/intake')
            }}
          >
            <Icon name="plus" size="sm" />
            {S.schedule_add_card_new}
          </button>
        </div>

        {/* 진료 전 할 일. **추가를 누르면 목록 끝에 빈 줄이 하나 생기고 그 자리에서
            받는다.** 입력 필드를 따로 띄우지 않는 것이 문서의 추가 방식이다. */}
        <SectionHeader title={S.schedule_add_todo} />
        {draft.todos.map((t) => (
          <div className="mm-todo" key={t.id}>
            <span className="mm-todo__box" />
            {editingTodo === t.id ? (
              <GrowInput
                className="mm-todo__input"
                placeholder={S.schedule_add_todo_placeholder}
                value={t.text}
                autoFocus
                onChange={(text) =>
                  setDraft((d) => ({
                    ...d,
                    todos: d.todos.map((x) => (x.id === t.id ? { ...x, text } : x)),
                  }))
                }
                onBlur={() => finishTodo(t.id)}
                onEnter={() => finishTodo(t.id)}
              />
            ) : (
              <span className="mm-todo__text">{t.text}</span>
            )}
            <button
              className="mm-iconbtn"
              onClick={() => setDraft((d) => ({ ...d, todos: d.todos.filter((x) => x.id !== t.id) }))}
              aria-label={fmt(S.schedule_add_todo_delete, t.text || S.schedule_add_todo_placeholder)}
              style={{ color: 'var(--mm-fg-muted)' }}
            >
              <Icon name="close" />
            </button>
          </div>
        ))}
        <button className="mm-addrow" onClick={addTodo}>
          <Icon name="plus" size="sm" />
          {S.schedule_add_todo_add}
        </button>
      </Pad>

      <BottomSheet open={sheet === 'date'} onClose={() => setSheet(null)} title={S.schedule_add_date_sheet}>
        <DateGrid value={draft.date} onPick={(d) => setDraft((prev) => ({ ...prev, date: d }))} />
        <div style={{ marginTop: 16 }}>
          <Button onClick={() => setSheet(null)}>{S.schedule_add_sheet_confirm}</Button>
        </div>
      </BottomSheet>

      <BottomSheet open={sheet === 'time'} onClose={() => setSheet(null)} title={S.schedule_add_time_sheet}>
        <TimeWheel value={draft.time ?? '10:30'} onChange={(t) => setDraft((prev) => ({ ...prev, time: t }))} />
        <div style={{ marginTop: 16 }}>
          {/* 휠을 돌리지 않고 확인해도 보이는 값이 담긴다. 앱의 `onTimePicked(time)` 이 휠의 현재 값을 넘긴다. */}
          <Button
            onClick={() => {
              setDraft((prev) => ({ ...prev, time: prev.time ?? '10:30' }))
              setSheet(null)
            }}
          >
            {S.schedule_add_sheet_confirm}
          </Button>
        </div>
      </BottomSheet>
    </Screen>
  )
}

/* ── 피커 목록 ─────────────────────────────────────────────────── */

/**
 * 날짜 시트의 월 격자. 월 화면과 같은 칸인데 크기가 34다.
 *
 * 기록·예정 점은 찍지 않는다. 여기서는 앞으로의 날을 고르는 것이고, 지난 기록이
 * 있는지는 이 판단에 쓰이지 않는다.
 */
function DateGrid({ value, onPick }: { value: string | null; onPick: (d: string) => void }) {
  const today = todayKey()
  const base = fromKey(value ?? today)
  const [cursor, setCursor] = useState({ year: base.getFullYear(), month: base.getMonth() + 1 })
  const cells = monthGrid(cursor.year, cursor.month)

  const move = (step: number) =>
    setCursor((c) => {
      const m = c.month + step
      if (m < 1) return { year: c.year - 1, month: 12 }
      if (m > 12) return { year: c.year + 1, month: 1 }
      return { year: c.year, month: m }
    })

  return (
    <div>
      {/* 월 화면과 같은 짜임인데 화살표가 S다. 시트 안이라 32 줄에 들어간다. */}
      <div className="mm-cal__month mm-cal__month--sheet" style={{ marginBottom: 'var(--mm-s8)' }}>
        <button className="mm-iconbtn mm-iconbtn--sm" onClick={() => move(-1)} aria-label={S.calendar_previous_month}>
          <Icon name="chevron_left" size="md" />
        </button>
        <h2>{fmt(S.calendar_month, cursor.year, cursor.month)}</h2>
        <button className="mm-iconbtn mm-iconbtn--sm" onClick={() => move(1)} aria-label={S.calendar_next_month}>
          <Icon name="chevron_right" size="md" />
        </button>
      </div>
      <div className="mm-cal mm-cal--sheet">
        <div className="mm-cal__head">
          {DOW.map((d) => (
            <div key={d} className="mm-cal__dow">
              {d}
            </div>
          ))}
        </div>
        <div className="mm-cal__grid">
          {cells.map((cell) =>
            cell.inMonth ? (
              <button
                key={cell.key}
                className={[
                  'mm-datecell',
                  cell.key === today && cell.key !== value ? 'mm-datecell--today' : '',
                  cell.key === value ? 'mm-datecell--selected' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => onPick(cell.key)}
              >
                <span>{cell.day}</span>
              </button>
            ) : (
              <span key={cell.key} className="mm-datecell" aria-hidden="true" />
            ),
          )}
        </div>
      </div>
    </div>
  )
}

/** 휠 한 열. 멈춘 자리의 값을 고르고, 밴드 밖의 값은 눌러서도 고른다. */
function WheelColumn({
  labels,
  selected,
  onSelect,
}: {
  labels: string[]
  selected: number
  onSelect: (index: number) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const settle = useRef<number | undefined>(undefined)

  /* 고른 값이 밖에서 바뀌면 그 자리로 굴린다. */
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const top = selected * WHEEL_ITEM
    if (Math.abs(el.scrollTop - top) > 2) el.scrollTo({ top })
  }, [selected])

  return (
    <div
      className="mm-wheel__col"
      ref={ref}
      onScroll={() => {
        window.clearTimeout(settle.current)
        /* 지나가는 값마다 상태가 바뀌면 목록이 스스로 되감긴다. 멈춘 뒤에 한 번만 올린다. */
        settle.current = window.setTimeout(() => {
          const el = ref.current
          if (!el) return
          const index = Math.round(el.scrollTop / WHEEL_ITEM)
          if (index !== selected && labels[index] != null) onSelect(index)
        }, 120)
      }}
    >
      {labels.map((label, i) => (
        <button
          key={label}
          className={`mm-wheel__item${i === selected ? ' mm-wheel__item--on' : ''}`}
          onClick={() => onSelect(i)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

/** 휠의 한 칸 높이. */
const WHEEL_ITEM = 52

/** 오전·오후 / 시 / 분 세 열. 분은 10분 단위다. */
function TimeWheel({ value, onChange }: { value: string; onChange: (t: string) => void }) {
  const [h, m] = value.split(':').map(Number)
  const afternoon = h >= 12
  const hours = [12, ...Array.from({ length: 11 }, (_, i) => i + 1)]
  const minutes = Array.from({ length: 6 }, (_, i) => i * 10)
  const hour12 = h % 12 === 0 ? 12 : h % 12

  const emit = (pm: boolean, hh: number, mm: number) => {
    const base = hh % 12
    const hour24 = pm ? base + 12 : base
    onChange(`${String(hour24).padStart(2, '0')}:${String(mm).padStart(2, '0')}`)
  }

  return (
    <div className="mm-wheel">
      <span className="mm-wheel__band" />
      <WheelColumn
        labels={[S.schedule_add_time_am, S.schedule_add_time_pm]}
        selected={afternoon ? 1 : 0}
        onSelect={(i) => emit(i === 1, hour12, m)}
      />
      <WheelColumn
        labels={hours.map(String)}
        selected={hours.indexOf(hour12)}
        onSelect={(i) => emit(afternoon, hours[i], m)}
      />
      <WheelColumn
        labels={minutes.map((v) => String(v).padStart(2, '0'))}
        selected={Math.max(0, minutes.indexOf(Math.round(m / 10) * 10))}
        onSelect={(i) => emit(afternoon, hour12, minutes[i])}
      />
    </div>
  )
}
