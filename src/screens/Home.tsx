/** 와이어프레임 1n 홈. Figma `399:1339`(기록 있음)과 `399:1720`(기록 없음)을 옮겼다.
 *
 * 두 화면이 같은 상태의 두 갈래다. 헤더 · 오늘의 한 줄 · 시작 버튼 · 이어서 하기까지
 * 같고 그 아래가 목록이거나 빈 상태다. 카드도 일정도 없으면 목록이 아니라 한 화면이
 * 된다 — 목록으로 두면 빈 상태가 버튼 바로 밑에 붙고 그 아래가 통째로 빈다.
 *
 * 블록 사이 간격이 모두 16이다(`.mm-homelist`). 구역 머리는 자체 여백(위 24 아래 10)을
 * 갖고 있어 추가 간격을 주지 않는다.
 */
import { useNavigate } from 'react-router-dom'
import { Pad, Screen } from '../components/Screen'
import { Badge, Button, Card, EmptyState, ListRow, Logo, SectionHeader } from '../components/ui'
import { S, fmt } from '../data/strings'
import { markFlowStart } from '../lib/flow'
import { useStore } from '../store/store'
import type { Appointment, AppState } from '../lib/types'
import { INTAKE_STEPS } from '../lib/types'
import { addDays, daysBetween, formatDot, formatFullDate, formatMonthDay, formatTime, todayKey } from '../lib/date'

/** 앱은 서버가 준 `recentCards`를 자르지 않는다. 서버가 없는 웹앱에서는 "최근"을
 *  최신 3장으로 본다. 시안 `1n-1`도 두 줄을 그린다. */
const RECENT_CARDS = 3

/** 서버가 `pendingRecordOn`을 찾을 때 거슬러 보는 날 수(Backend#123). */
const PENDING_RECORD_DAYS = 14

/* ── 오늘의 한 줄 ──────────────────────────────────────────────────
 * `HomeTodayLine`의 아홉 갈래와 `HomeRepository.todayLine()`의 고르는 규칙을 옮겼다.
 *
 * **차례가 곧 우선순위다.** 오늘 일정이 가장 세고, 그다음이 기록이 빠진 지난 일정,
 * 다음 진료, 지난 진료, 카드만 있는 상태다. 지난 진료와 다음 진료가 둘 다 있으면 다음
 * 진료가 이긴다 — 앞으로 할 일이 지나간 일보다 급하다.
 *
 * **경과일과 남은 날은 이틀 이상일 때만 숫자로 적는다.** 하루는 "어제"·"내일"이고
 * 0일은 오늘 갈래다.
 */
interface TodayLine {
  label: string
  title: string
  /** 본문 두 줄. 적을 것이 없는 자리는 줄 자체를 버린다. */
  body: string[]
}

/** "오전 10:30 서울OO병원예요." 시각이나 병원이 없으면 있는 것만 적는다. */
function atLine(time: string | null, clinic: string | null): string | null {
  const at = formatTime(time)
  if (at && clinic) return fmt(S.home_today_at_clinic, at, clinic)
  if (at) return fmt(S.home_today_at, at)
  if (clinic) return fmt(S.home_today_at, clinic)
  return null
}

/** "9월 16일 서울OO병원예요." 병원이 없으면 "9월 16일 진료예요."다. */
function onLine(on: string, clinic: string | null): string {
  const date = formatMonthDay(on)
  return clinic ? fmt(S.home_today_on_clinic, date, clinic) : fmt(S.home_today_on, date)
}

/** 'HH:mm' 로 본 지금. 일정 시각과 문자열로 견주려고 같은 모양으로 만든다. */
function nowHm(): string {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

/**
 * ① 오늘.
 *
 * 기록이 있으면 끝난 것이고, 없으면 시각이 지났는지로 갈린다. 시각이 없는 일정은 아직
 * 앞둔 것으로 본다 — 시간 미정이라 지났다고 말할 근거가 없다.
 *
 * 기록 여부를 일정보다 먼저 본다. 오늘 일정을 캘린더에 넣지 않고 다녀와 기록만 남긴
 * 경우에도 "오늘 진료를 기록해두셨어요"가 맞다.
 */
function todayVisit(today: string, last: string | null, next: Appointment | null): TodayLine | null {
  if (last === today) {
    return {
      label: S.home_today_label,
      title: S.home_today_recorded_title,
      body: [S.home_today_recorded_lead, S.home_today_recorded_body],
    }
  }
  if (!next || next.date !== today) return null
  if (next.time == null || next.time >= nowHm()) {
    return {
      label: S.home_today_label,
      title: S.home_today_ahead_title,
      body: [atLine(next.time, next.hospitalName), S.home_today_ahead_body].filter(
        (l): l is string => Boolean(l),
      ),
    }
  }
  return {
    label: S.home_today_label,
    title: S.home_today_done_title,
    body: [S.home_today_done_lead, S.home_today_done_body],
  }
}

/**
 * ② 기록이 빠진 지난 일정.
 *
 * 서버는 일정 날짜로 남긴 기록이 있는지를 보고 14일까지만 거슬러 찾는다. 일정과 기록을
 * 잇는 열쇠가 없어서 — 기록은 카드에 붙는데 일정은 카드 없이도 만들 수 있다 — 날짜로
 * 견주는 것이 할 수 있는 전부다.
 */
function recordMissing(today: string, state: AppState): TodayLine | null {
  const from = addDays(today, -PENDING_RECORD_DAYS)
  const on = state.appointments
    .filter((a) => a.date < today && a.date >= from)
    .filter((a) => !state.records.some((r) => r.visitedOn === a.date))
    .map((a) => a.date)
    .sort()
    .at(-1)
  if (!on) return null
  return {
    label: S.home_today_label,
    title: fmt(S.home_today_missing_title, formatMonthDay(on)),
    body: [S.home_today_missing_lead, S.home_today_missing_body],
  }
}

/** ③ 다음 진료. 지난 진료와 둘 다 있으면 이쪽이 이긴다 — 앞으로 할 일이 급하다. */
function nextVisit(today: string, next: Appointment | null): TodayLine | null {
  if (!next || next.date <= today) return null
  const days = daysBetween(today, next.date)
  if (days === 1) {
    return {
      label: S.home_today_label,
      title: S.home_today_tomorrow_title,
      body: [atLine(next.time, next.hospitalName), S.home_today_tomorrow_body].filter(
        (l): l is string => Boolean(l),
      ),
    }
  }
  return {
    label: S.home_today_label,
    title: fmt(S.home_today_next_title, days),
    body: [onLine(next.date, next.hospitalName), S.home_today_next_body],
  }
}

/** ④ 지난 진료. 경과일은 기록이 저장된 진료에만 적는다. */
function lastVisit(today: string, last: string | null): TodayLine | null {
  if (!last || last >= today) return null
  const days = daysBetween(last, today)
  if (days === 1) {
    return {
      label: S.home_today_label,
      title: S.home_today_yesterday_title,
      body: [S.home_today_yesterday_lead, S.home_today_last_body],
    }
  }
  return {
    label: S.home_today_label,
    title: fmt(S.home_today_since_title, days),
    body: [S.home_today_since_lead, S.home_today_last_body],
  }
}

function todayLine(state: AppState, today: string, next: Appointment | null): TodayLine {
  /* 서버가 주던 `lastVisitedOn` · `nextAppointment` 를 로컬 상태에서 만든다. */
  const last = state.records.map((r) => r.visitedOn).sort().at(-1) ?? null

  return (
    todayVisit(today, last, next) ??
    recordMissing(today, state) ??
    nextVisit(today, next) ??
    lastVisit(today, last) ??
    (state.cards.length
      ? {
          label: S.home_today_label,
          title: S.home_today_card_title,
          body: [S.home_today_card_lead, S.home_today_card_body],
        }
      : /* 진료도 카드도 일정도 없는 사용자. 시안 `1n-2`의 "처음 오셨네요". */
        {
          label: S.home_today_first_label,
          title: S.home_today_first_title,
          body: [S.home_today_first_body],
        })
  )
}

/* ── 화면 ──────────────────────────────────────────────────────── */

export function HomeScreen() {
  const navigate = useNavigate()
  const { state, startIntake } = useStore()
  const today = todayKey()

  /* 서버는 다음 일정 하나만 준다. 화면은 목록으로 받으므로 0개나 1개다. */
  const next =
    state.appointments
      .filter((a) => a.date >= today)
      .sort((a, b) =>
        a.date === b.date ? (a.time ?? '').localeCompare(b.time ?? '') : a.date.localeCompare(b.date),
      )[0] ?? null
  const upcoming = next ? [next] : []

  const savedCards = [...state.cards]
    .sort((a, b) => b.writtenOn.localeCompare(a.writtenOn))
    .slice(0, RECENT_CARDS)
  const resume = state.intake && !state.intake.completed ? state.intake : null
  const line = todayLine(state, today, next)

  /* 카드도 일정도 없으면 목록이 아니라 한 화면이다(1n-2). */
  const isEmpty = savedCards.length === 0 && upcoming.length === 0

  const beginIntake = () => {
    startIntake()
    /* 흐름에 들어간다. 카드를 저장하면 여기까지 걷어낸다. */
    markFlowStart()
    navigate('/intake')
  }

  const cardTitle = (id: string | null) => state.cards.find((c) => c.id === id)?.title ?? ''

  return (
    <Screen noNav tab="home">
      <Pad
        className={`mm-homelist${isEmpty ? ' mm-homelist--empty' : ''}`}
        style={{ paddingTop: 8, paddingBottom: 20 }}
      >
        {/* Figma Header(`399:1342`). 로고가 마스터의 0.8배라 28.8이다.
            **알림 아이콘을 두지 않는다.** 이 데모에는 알림이 없다 — 서버가 주지 않고 원본도
            누르면 아무 일이 없다(`onNotificationClick = {}`). 눌리는 모양으로 서 있으면
            사람은 누른다. 눌러도 아무 일이 없는 자리는 고장으로 읽힌다. */}
        <header className="mm-homehead">
          <Logo height={28.8} />
          <span style={{ flex: 1 }} />
          <span className="mm-homehead__avatar">
            <button
              className="mm-avatar mm-body-l-strong"
              style={{ width: 36, height: 36 }}
              aria-label={S.home_profile}
              onClick={() => navigate('/me')}
            >
              {state.profile.name.slice(0, 1)}
            </button>
          </span>
        </header>

        {/* 오늘의 한 줄(`399:1634`). Card 의 Brand 강조를 쓴다. */}
        <Card variant="tint" className="mm-card--stack">
          <div className="mm-label-s" style={{ color: 'var(--mm-fg-subtle)' }}>
            {line.label}
          </div>
          <h1 className="mm-heading-s">{line.title}</h1>
          {line.body.map((text) => (
            <p key={text} className="mm-body-m" style={{ color: 'var(--mm-fg-subtle)', whiteSpace: 'pre-line' }}>
              {text}
            </p>
          ))}
        </Card>

        {/* 시작 버튼(`399:1741`). 청진기 아이콘이다 — 말은 증상 정리의 한 가지 방법일 뿐이라
            마이크를 앞세우지 않는다. */}
        <Button onClick={beginIntake} icon="stethoscope">
          {S.home_start_intake}
        </Button>

        {/* 이어서 하기(`399:1642`). 눌러서 이어 쓸 수 있으므로 카드에 동작을 준다. */}
        {resume && (
          <Card
            className="mm-card--stack"
            onClick={() => {
              markFlowStart()
              navigate(resume.step === 1 ? '/intake' : '/intake/chat')
            }}
          >
            <div className="mm-label-s" style={{ color: 'var(--mm-fg-subtle)' }}>
              {S.home_resume_label}
            </div>
            <div className="mm-heading-s">{S.home_resume_title}</div>
            <div className="mm-body-m" style={{ color: 'var(--mm-fg-subtle)' }}>
              {fmt(S.home_resume_progress, resume.bodyPart?.label ?? '', INTAKE_STEPS, resume.step)}
            </div>
          </Card>
        )}

        {isEmpty ? (
          /* 1n-2. **행동 버튼을 두지 않는다** — 바로 위에 "증상 정리 시작하기"가 있어서
             같은 곳으로 가는 버튼이 한 화면에 둘이 된다. 시안의 인스턴스도 꺼 뒀다. */
          <EmptyState title={S.home_empty_title} body={S.home_empty_description} />
        ) : (
          <>
            {/* 최근 브리핑 카드 */}
            {savedCards.length === 0 ? (
              /* 카드가 없는데 일정은 있는 경우다. 제목만 남기고 빈 목록을 두면 무엇을
                 해야 하는지 알 수 없어서 빈 상태를 둔다. */
              <EmptyState
                title={S.home_empty_title}
                body={S.home_empty_description}
                action={S.home_empty_action}
                onAction={beginIntake}
              />
            ) : (
              <>
                <SectionHeader
                  title={S.home_saved_cards}
                  action={S.home_saved_cards_all}
                  onAction={() => navigate('/cards')}
                />
                {savedCards.map((c) => (
                  <ListRow
                    key={c.id}
                    title={c.title}
                    sub={
                      c.hospital?.name
                        ? fmt(S.home_card_meta, formatDot(c.writtenOn), c.hospital.name)
                        : fmt(S.home_card_meta_draft, formatDot(c.writtenOn))
                    }
                    /* 배지는 카드의 확정 여부가 아니라 진료를 다녀왔는지로 붙인다.
                       확정만 하고 아직 안 간 카드에 "진료 완료"가 붙으면 안 된다. */
                    badge={c.visited ? <Badge tone="success">{S.home_card_confirmed}</Badge> : undefined}
                    onClick={() => navigate(`/card/${c.id}`)}
                  />
                ))}
              </>
            )}

            {/* 다가오는 일정. 없으면 구역 자체를 두지 않는다(시안 `1n-2`). */}
            {upcoming.length > 0 && (
              <>
                <SectionHeader
                  title={S.home_upcoming}
                  action={S.home_calendar}
                  /* 구역의 "캘린더"는 형제 탭으로 옮기는 것이지 한 단계 들어가는 것이 아니다.
             쌓아 두면 뒤로 가기가 탭 방문 이력을 되짚는다(`onCalendarClick = selectTab`). */
          onAction={() => navigate('/calendar', { replace: true })}
                />
                {upcoming.map((a) => (
                  <ListRow
                    key={a.id}
                    /* 시안 1n-1의 줄 제목이 "서울OO병원 내과 재진"이다. 병원 뒤에 초진인지
                       재진인지를 붙여 같은 병원의 일정 둘을 목록에서 가를 수 있게 한다. */
                    title={fmt(
                      S.home_schedule_title,
                      a.hospitalName?.trim() || cardTitle(a.cardId),
                      a.followUp ? S.home_schedule_follow_up : S.home_schedule_first,
                    ).trim()}
                    sub={fmt(
                      S.home_schedule_meta,
                      formatFullDate(a.date),
                      formatTime(a.time) ?? S.calendar_time_unset,
                    )}
                    badge={<Badge tone="primary">{fmt(S.home_schedule_dday, daysBetween(today, a.date))}</Badge>}
                    onClick={() => navigate(`/calendar/${a.date}`, { state: { appointmentId: a.id } })}
                  />
                ))}
              </>
            )}
          </>
        )}
      </Pad>
    </Screen>
  )
}

export { ListRow }
