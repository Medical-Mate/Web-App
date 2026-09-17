/** 1j 기록 탭 · 1j-3 기록 상세 */
import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Pad, Screen } from '../components/Screen'
import {
  Badge,
  BottomCta,
  Button,
  Callout,
  Dialog,
  Divider,
  EmptyState,
  GroupRow,
  Icon,
  Notice,
  QuestionBlock,
  SectionHeader,
  SeverityReadout,
} from '../components/ui'
import { S, fmt } from '../data/strings'
import { markFlowStart } from '../lib/flow'
import { useStore } from '../store/store'
import { SEVERITY_LABELS, SEVERITY_NRS } from '../lib/types'
import type { Appointment, BriefCard, Severity, VisitFollowUp, VisitRecord } from '../lib/types'
import { formatFullDate, formatShort, formatTime, fromKey } from '../lib/date'

/* ── 1j 기록 목록 ────────────────────────────────────────────────
 * 원본 `RecordViewModel`.
 *
 *  - 나열하는 것은 **진료 후 기록(visits)** 이다. 카드가 아니다. 진료를 다녀오지 않은
 *    카드는 여기 오지 않는다 — 그것은 브리핑 카드 목록(1j-4)의 일이다.
 *  - "기록이 있다는 것은 진료를 다녀왔다는 뜻이라 상태가 하나다"(소스 주석). 줄마다
 *    진료 완료 뱃지가 붙는다.
 *  - 월별로 묶는 기준은 **진료일**이다.
 *  - 아래 줄은 `MM.dd 진료 · 병원` 이다.
 */

export function RecordScreen() {
  const navigate = useNavigate()
  const { state, startIntake, deleteRecords } = useStore()

  /* null 이 아니면 편집 중이다(1j-1-D). 빈 집합과 null 을 나눠 쓴다 — 편집에 막 들어와 아무것도
     고르지 않은 상태와 편집이 아닌 상태는 화면이 다르다. 앞은 탭바 대신 삭제 버튼이 서고, 뒤는
     탭바가 선다. */
  const [selected, setSelected] = useState<Set<string> | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const editing = selected !== null
  const count = selected?.size ?? 0

  const groups = (() => {
    const map = new Map<string, VisitRecord[]>()
    state.records.forEach((r) => {
      const key = r.visitedOn.slice(0, 7)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(r)
    })
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  })()

  const toggle = (id: string) =>
    setSelected((s) => {
      if (!s) return s
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <Screen
      title={S.record_title}
      /* 편집 중에는 탭바 자리에 삭제 버튼이 선다. 고르는 중에 다른 탭으로 나갈 수 있으면 고른
         것이 어떻게 되는지 설명할 수 없다. */
      tab={editing ? undefined : 'record'}
      /* 목록이 비어 있으면 편집을 두지 않는다. 지울 것이 없는데 편집으로 들어갈 수 있으면 빈
         화면에 삭제 버튼만 서게 된다. 한 자리에서 `편집 → 취소` 로 이름만 바뀐다. */
      action={state.records.length ? (editing ? S.record_edit_cancel : S.record_edit) : undefined}
      onAction={() => setSelected(editing ? null : new Set())}
      surface
      bottom={
        editing ? (
          /* 고른 건수가 버튼 글자에 들어간다. 시안이 `Select Bar` 를 지우고 건수를 이 자리로 옮겼다. */
          <BottomCta>
            <Button variant="danger" disabled={count === 0} onClick={() => setDeleteOpen(true)}>
              {count === 0 ? S.record_delete : fmt(S.record_delete_count, count)}
            </Button>
          </BottomCta>
        ) : undefined
      }
    >
      <Pad
        style={{
          minHeight: '100%',
          paddingTop: 12,
          paddingBottom: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--mm-s10)',
        }}
      >
        {state.records.length === 0 ? (
          <div style={{ flex: 1, display: 'flex' }}>
            <EmptyState
              icon="note"
              title={S.record_empty_title}
              body={S.record_empty_description}
              action={S.record_empty_action}
              onAction={() => {
                startIntake()
                markFlowStart()
                navigate('/intake')
              }}
            />
          </div>
        ) : (
          groups.map(([month, list]) => {
            const d = fromKey(`${month}-01`)
            const picked = selected ? list.filter((r) => selected.has(r.id)).length : null
            return (
              <Fragment key={month}>
                {/* 편집 중에는 묶음 머리의 개수가 그 달에서 고른 수로 바뀐다(1j-4-D2). */}
                <SectionHeader
                  title={`${d.getFullYear()}년 ${d.getMonth() + 1}월`}
                  count={picked === null ? fmt(S.record_count, list.length) : fmt(S.record_selected, picked)}
                />
                {list.map((r) => (
                  <GroupRow
                    key={r.id}
                    title={r.cardTitle}
                    badge={<Badge tone="success">{S.record_status_confirmed}</Badge>}
                    meta={[`${formatShort(r.visitedOn)} 진료`, r.clinic].filter(Boolean).join(' · ')}
                    selected={selected ? selected.has(r.id) : undefined}
                    onClick={() => (selected ? toggle(r.id) : navigate(`/record/${r.id}`))}
                  />
                ))}
              </Fragment>
            )
          })
        )}
      </Pad>

      <Dialog
        open={deleteOpen}
        title={fmt(S.record_delete_title, count)}
        body={S.record_delete_body}
        confirmText={S.record_delete_confirm}
        cancelText={S.record_edit_cancel}
        danger
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => {
          setDeleteOpen(false)
          deleteRecords([...(selected ?? [])])
          setSelected(null)
        }}
      />
    </Screen>
  )
}

/* ── 1j-3 기록 상세 (타임라인) ─────────────────────────────────────
 * 원본 `RecordDetailScreen` · `RecordDetailStep` · `RecordDetailViewModel`.
 *
 * 증상을 정리하고, 카드를 만들어 진료실에서 보여주고, 진료 후 들은 것을 적고, 재방문이
 * 잡히는 과정이 한 줄로 이어져야 무엇이 어떻게 흘러왔는지 읽힌다. 왼쪽 세로선이 그
 * 이어짐을 만든다 — 점만 두면 단계가 따로 떨어진 카드로 보인다.
 *
 * **최신이 위다.** 예정 · 진료 후 기록 · 브리핑 카드 순이다. 시안 `1j-3`은 카드가 위이고
 * `1j-3-R`(재방문 누적)은 최신이 위인데, 디자인 피드백이 "최신 기록이 맨 위로 가는게 멘탈
 * 모델"이라고 적어 둔 쪽을 따랐다.
 */

/** 블록 안 요약 한 줄. 원본 `RecordDetailItem`. */
interface StepItem {
  key: string
  value: string
  tone?: 'warning' | 'link'
}

/** 펼쳤을 때 줄 아래 붙는 것들. 원본 `RecordStepCard`. */
interface StepCard {
  collapsed: number
  severity: Severity | null
  allergies: string[]
  questions: string[]
}

interface BlockStep {
  kind: 'block'
  at: string
  title: string
  items: StepItem[]
  card?: StepCard
}

type Step = BlockStep | { kind: 'pending'; at: string; message: string; detail: string }

/** 접힌 카드에 보이는 줄 수. 시안이 부위 · 기간 · 양상 셋을 보여준다. */
const COLLAPSED_ITEMS = 3

/**
 * 머리글 둘째 줄.
 *
 * **병원이 앞이고 날짜가 뒤다.** 한 번이면 `서울OO병원 내과 · 09.12 진료`로 시안 `1j-3`
 * 그대로이고, 여러 번이면 `서울OO병원 내과 · 09.12 초진 · 09.26 재방문`으로 `1j-3-R`을 따른다.
 *
 * 여러 번인 쪽은 **오래된 차례**다. 타임라인은 최신이 위인데 이 줄만 반대인 이유는, 여기가
 * 흘러온 순서를 한 줄로 읽는 자리이기 때문이다.
 */
function clinicLine(visits: VisitRecord[]): string {
  const clinic = visits.find((v) => v.clinic)?.clinic
  const days =
    visits.length === 1
      ? [`${formatShort(visits[0].visitedOn)} 진료`]
      : [...visits].reverse().map((v, i) => `${formatShort(v.visitedOn)} ${i === 0 ? '초진' : '재방문'}`)
  return [clinic, ...days].filter(Boolean).join(' · ')
}

/** 몇 번째 진료인지. 한 건이면 붙이지 않는다. `index` 는 최신이 0 이라 가장 오래된 것이 초진이다. */
function visitKind(count: number, index: number): string | null {
  if (count <= 1) return null
  return index === count - 1 ? '초진' : '재방문'
}

/**
 * 기록 하나를 타임라인 단계로.
 *
 * **원문 인용을 담지 않는다.** 시안의 진료 후 기록 단계에는 저장된 항목만 있다. 원문은
 * 1q-1 에서 확인하고 저장하는 값이고, 여기는 나중에 다시 읽는 자리다.
 */
function visitStep(visit: VisitRecord, kind: string | null): BlockStep {
  return {
    kind: 'block',
    at: [formatShort(visit.visitedOn), S.visit_record_card_title, kind].filter(Boolean).join(' · '),
    /* 블록 제목은 시점 줄과 같은 말이다. 다른 이름을 붙이면 같은 것을 두 이름으로 부르게 된다. */
    title: S.visit_record_card_title,
    items: visit.items.map((it) => ({ key: it.key, value: it.value, tone: it.tone })),
  }
}

/**
 * 브리핑 카드를 타임라인 단계로.
 *
 * 접으면 앞 세 줄, 펴면 나머지 줄과 강도 · 알러지 · 질문까지 나온다(1j-3-X).
 *
 * **건강 정보가 카드에서 온다.** 여기는 지난 진료를 다시 읽는 자리라 오늘의 프로필을 얹으면
 * 그때 먹던 약이 아니게 된다. 카드가 만들어질 때 박힌 값을 그대로 편다.
 */
function cardStep(card: BriefCard): BlockStep {
  return {
    kind: 'block',
    /* 시안은 뒤에 `09.12 진료실에서 보여줌`을 잇지만 그 날짜는 바로 위 진료 후 기록 단계가
       이미 적고 있어서 같은 날이 두 줄에 서게 돼 뺐다. 작성일이 없을 때만 이름을 적는다. */
    at: card.writtenOn ? `${formatShort(card.writtenOn)} 작성` : S.brief_card_title,
    title: S.brief_card_title,
    items: [...card.items, ...card.health].map((it) => ({ key: it.key, value: it.value })),
    card: {
      collapsed: COLLAPSED_ITEMS,
      severity: card.severity,
      allergies: card.allergies,
      questions: card.questions,
    },
  }
}

/**
 * 다음 일정을 예정 단계로.
 *
 * 시안(`1j-3`)의 알림 블록이다. 병원은 적지 않는다 — 머리글 둘째 줄이 이미 말하고 있고,
 * 같은 카드의 재방문이라 다른 곳일 리가 없다.
 */
function appointmentStep(next: Appointment): Step {
  return {
    kind: 'pending',
    at: `${formatShort(next.date)} 예정`,
    message: '다음 진료가 예약돼 있어요',
    /* 시각이 없으면 날짜만 적는다. 시간 미정인 일정이다. */
    detail: [formatFullDate(next.date), formatTime(next.time)].filter(Boolean).join(' '),
  }
}

/**
 * 아직 일정으로 잡지 않은 재방문을 예정 단계로.
 *
 * 기록에 "일주일 뒤"라고 남긴 날짜다. 캘린더가 같은 값으로 점을 찍는데 상세에만 없으면
 * 달력과 상세가 다른 날을 가리킨다. 잡아 둔 일정이 아니라 예약됐다고 적지 않고, 범위로 말한
 * 것이면 "전후"를 붙인다.
 */
function followUpStep(followUp: VisitFollowUp): Step {
  return {
    kind: 'pending',
    at: `${formatShort(followUp.date)} 예정`,
    message: '재방문 예정이에요',
    detail: formatFullDate(followUp.date) + (followUp.approximate ? ' 전후' : ''),
  }
}

/** 와이어프레임 1j-3. Figma `735:3829`. */
export function RecordDetailScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { state } = useStore()

  /* 펼친 단계의 자리 번호. 단계에 id 가 없어서 번호로 가리킨다. */
  const [expanded, setExpanded] = useState<number[]>([])

  const opened = state.records.find((r) => r.id === id) ?? null

  /**
   * 이 카드에 쌓인 기록 전부. 최근 진료일이 앞이다.
   *
   * 앱은 카드를 고치면 기록이 서로 다른 카드 행에 붙어서 문답 단위로 서버가 모아 주는데,
   * 웹은 기록이 `cardId` 를 들고 있고 재방문에 카드를 새로 만들지 않아 그 값이 열쇠가 된다.
   */
  const visits = useMemo(() => {
    if (!opened) return []
    const all = opened.cardId ? state.records.filter((r) => r.cardId === opened.cardId) : [opened]
    return [...all].sort((a, b) => b.visitedOn.localeCompare(a.visitedOn))
  }, [opened, state.records])

  if (!opened) {
    return (
      <Screen title={S.record_detail_title} onBack={() => navigate(-1)} surface>
        <EmptyState
          icon="search_off"
          title={S.record_detail_failed_title}
          body={S.record_detail_failed_description}
        />
      </Screen>
    )
  }

  const card = state.cards.find((c) => c.id === opened.cardId) ?? null
  const latest = visits[0]

  /* 예정은 열어 본 기록이 아니라 **가장 최근 기록**보다 뒤의 것이다. 첫 기록에서 열어도
     상세는 그 카드의 기록을 모두 세우므로, 이미 다녀온 재방문이 예정으로 서면 안 된다.
     잡아 둔 일정이 있으면 그것, 없으면 최신 기록의 재방문 날짜다 — 캘린더가 점을 찍는 값과 같다. */
  const next =
    opened.cardId == null
      ? null
      : state.appointments
          .filter((a) => a.cardId === opened.cardId && a.date > latest.visitedOn)
          .sort((a, b) => a.date.localeCompare(b.date))[0] ?? null
  const pending = next
    ? appointmentStep(next)
    : latest.followUp && latest.followUp.date > latest.visitedOn
      ? followUpStep(latest.followUp)
      : null

  const steps: Step[] = [
    ...(pending ? [pending] : []),
    ...visits.map((v, i) => visitStep(v, visitKind(visits.length, i))),
    ...(card ? [cardStep(card)] : []),
  ]

  /* 머리 제목은 시안대로 브리핑 카드의 제목이다. 비면 목록이 든 제목으로, 그것도 없으면
     병원으로 받친다 — 병원은 둘째 줄이 적는 값이라 제목에 서면 같은 말이 두 줄에 이어 나온다. */
  const title = card?.title || latest.cardTitle || latest.clinic

  return (
    <Screen title={S.record_detail_title} onBack={() => navigate(-1)} surface>
      <Pad style={{ paddingTop: 16, paddingBottom: 28 }}>
        <div className="mm-rd__head">
          <div className="mm-rd__title">
            <h2 className="mm-heading-l">{title}</h2>
            {/* 재방문이 쌓이면 "진료 완료" 대신 "진료 2회"가 온다. 몇 번인지는 상태가 아니라
                세어 봐야 아는 값이다. 톤은 상태가 정하므로 그대로 둔다. */}
            <Badge tone="success">
              {visits.length > 1 ? `진료 ${visits.length}회` : S.record_status_confirmed}
            </Badge>
          </div>
          <p className="mm-rd__clinic mm-body-m">{clinicLine(visits)}</p>
        </div>

        {steps.map((step, i) => {
          const trailing = i !== steps.length - 1
          return (
            <div key={`${step.at}-${i}`} className={`mm-rd__step${trailing ? ' mm-rd__step--rail' : ''}`}>
              <div className="mm-rd__when mm-label-m">
                <span className={`mm-rd__dot${step.kind === 'pending' ? ' mm-rd__dot--pending' : ''}`} />
                {step.at}
              </div>
              <div className="mm-rd__body">
                {step.kind === 'pending' ? (
                  /* 앞으로 올 일을 알리는 자리다. 타임라인의 다른 블록이 흰 카드라 이 하나만
                     색으로 선다. 점선 테두리는 "입력할 자리"로 읽혀 뜻이 달랐다. */
                  <Notice title={step.message} body={step.detail} tone="brand" />
                ) : (
                  <StepBlock
                    step={step}
                    expanded={expanded.includes(i)}
                    onToggle={() =>
                      setExpanded((e) => (e.includes(i) ? e.filter((v) => v !== i) : [...e, i]))
                    }
                  />
                )}
              </div>
            </div>
          )
        })}
      </Pad>
    </Screen>
  )
}

/** 타임라인 한 단계의 내용. Figma `735:3850`. */
function StepBlock({
  step,
  expanded,
  onToggle,
}: {
  step: BlockStep
  expanded: boolean
  onToggle: () => void
}) {
  const shown = !step.card || expanded ? step.items : step.items.slice(0, step.card.collapsed)
  const ref = useRef<HTMLDivElement>(null)

  /* **펼친 뒤에는 그 블록으로 화면을 옮긴다.** 브리핑 카드는 타임라인의 마지막 단계라 화면
     아래쪽에 있고, 펼치면 새로 나온 내용이 화면 밖으로 나간다. `nearest` 는 필요한 만큼만
     움직인다 — 이미 다 보이면 그대로 둔다. */
  useEffect(() => {
    if (expanded) ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [expanded])

  return (
    <div className="mm-rd__block" ref={ref}>
      <h3 className="mm-heading-s">{step.title}</h3>
      {shown.map((item, i) => (
        <div className="mm-rd__item" key={`${item.key}-${i}`}>
          <span className="mm-rd__k mm-body-s">{item.key}</span>
          <span className={`mm-rd__v mm-body-m${item.tone ? ` mm-rd__v--${item.tone}` : ''}`}>
            {item.value}
          </span>
        </div>
      ))}

      {/* 통증 강도 · 알러지 · 질문은 브리핑 카드 화면(1e-1)과 같은 컴포넌트다. 같은 카드를
          다른 자리에서 보는 것이라 모양이 갈리면 안 된다. */}
      {step.card && expanded && (
        <>
          {step.card.severity && (
            <SeverityReadout
              level={step.card.severity}
              label={SEVERITY_LABELS[step.card.severity]}
              nrs={SEVERITY_NRS[step.card.severity]}
            />
          )}
          {step.card.allergies.length > 0 && (
            <Callout
              title={fmt(S.brief_card_allergy, step.card.allergies.join(' · '))}
              body={S.brief_card_allergy_body}
            />
          )}
          {step.card.questions.length > 0 && (
            <QuestionBlock title={S.brief_card_questions} questions={step.card.questions} />
          )}
        </>
      )}

      {step.card && (
        <>
          <Divider />
          <button className="mm-rd__open mm-body-m-strong" onClick={onToggle} aria-expanded={expanded}>
            <span>{expanded ? S.record_detail_collapse : S.record_detail_expand}</span>
            <Icon name={expanded ? 'chevron_up' : 'chevron_down'} size="md" />
          </button>
        </>
      )}
    </div>
  )
}
