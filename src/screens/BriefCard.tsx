/** 1e 브리핑 카드 · 1j-4 카드 목록 */
import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Pad, Screen } from '../components/Screen'
import {
  Badge,
  BottomCta,
  Button,
  Callout,
  Card,
  Dialog,
  EmptyState,
  GroupRow,
  HospitalCard,
  InfoTooltip,
  KvRow,
  QuestionBlock,
  SectionHeader,
  SeverityReadout,
} from '../components/ui'
import { S, fmt } from '../data/strings'
import { buildCard, patientLine } from '../data/ai'
import { capture } from '../lib/analytics'
import { markFlowStart, popPast, popTo, resetTo } from '../lib/flow'
import { useStore } from '../store/store'
import { MAX_BRIEF_CARD_QUESTIONS, SEVERITY_LABELS, SEVERITY_NRS, cardRowStatus } from '../lib/types'
import type { BriefCard as BriefCardModel, CardHospital, CardItem } from '../lib/types'
import { formatShort, fromKey } from '../lib/date'

/* ── 카드 본문 (신규·상세가 같은 모양) ────────────────────────── */

/**
 * 편집 중인 사본. 원본 `BriefCardDraft`.
 *
 * 원본을 그대로 고치지 않는 이유는 취소가 있기 때문이다. 값만 담지 않고 목록째로 담는다 —
 * 항목과 질문을 지우고 더할 수 있어서 순번을 열쇠로 쓰면 두 번째를 지울 때 뒤가 밀린다.
 */
interface CardDraft {
  items: CardItem[]
  questions: string[]
}

/** 편집 모드에서 본체가 받는 조작. 원본 `BriefCardEditActions`. */
interface CardEdit {
  draft: CardDraft
  onItemChange: (index: number, value: string) => void
  onItemDelete: (index: number) => void
  onQuestionChange: (index: number, value: string) => void
  onQuestionDelete: (index: number) => void
  onQuestionAdd: () => void
}

/**
 * 브리핑 카드 본체. Figma `404:1711`.
 *
 * 1e-1 읽기와 1e-1-E 수정이 같은 블록을 쓴다. 두 화면이 각자 그리면 의사가 보는 카드와
 * 환자가 고치는 카드가 어긋난다.
 *
 * 알러지 경고와 질문 블록은 **카드 밖**이다. 알러지는 처방 전에 확인해야 하는 값이라
 * 카드 안에 섞으면 훑어 읽을 때 다른 항목과 같은 무게로 지나간다.
 *
 * 편집 중에는
 *  - 카드 전체를 브랜드 테두리로 감싼다. 값마다 밑줄이 생기지만 밑줄만으로는 몇 줄이
 *    열렸는지가 보이지 않는다(1e-1-E).
 *  - 항목마다 값이 입력이 되고 오른쫽에 ×(S)가 붙는다. 복용약·기저질환은 프로필에서 온
 *    사실이라 열리지 않는다 — 고칠 자리는 1s-2 다.
 *  - 알러지 경고는 감춘다. 지울 수 없는 항목이라 ×가 없는데, ×가 없는 블록이 편집 화면에
 *    남아 있으면 왜 이것만 못 고치는지가 설명되지 않는다.
 *  - AI 캡션은 감춘다. 고치는 동안에는 누가 썼는지가 아니라 무엇을 고치는지가 화면의 일이다.
 *  - 질문은 비어 있어도 블록을 둔다. `+ 질문 추가` 가 그 안에 있다.
 */
function CardBody({
  card,
  profile,
  edit,
}: {
  card: BriefCardModel
  profile: { name: string; age: number; sex: 'M' | 'F' }
  edit?: CardEdit
}) {
  const items = edit ? edit.draft.items : card.items
  const questions = edit ? edit.draft.questions : card.questions
  return (
    <>
      <Card className={`mm-card--stack${edit ? ' mm-card--editing' : ''}`}>
        {/* 제목 · 상태 배지 · 환자 줄(`596:3160`).
            배지는 카드 상태가 아니라 진료를 마쳤는지로 가른다 — 저장하기가 카드를
            확정하므로 확정으로 판단하면 진료 전에 "진료 완료"가 뜬다. */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mm-s4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h2 className="mm-heading-m" style={{ flex: 1, minWidth: 0 }}>
              {card.title}
            </h2>
            {card.visited ? (
              <Badge tone="success">{S.brief_card_status_confirmed}</Badge>
            ) : (
              <Badge>{S.brief_card_status_before_visit}</Badge>
            )}
          </div>
          <p className="mm-body-s" style={{ color: 'var(--mm-fg-subtle)' }}>
            {patientLine(profile, card.writtenOn)}
          </p>
        </div>

        <hr className="mm-divider" />

        {items.map((item, i) =>
          edit ? (
            <KvRow
              key={`${item.key}-${i}`}
              label={item.key}
              value={item.value}
              edit={{
                onChange: (v) => edit.onItemChange(i, v),
                onDelete: () => edit.onItemDelete(i),
                deleteLabel: fmt(S.brief_card_item_delete, item.key),
              }}
            />
          ) : (
            <KvRow key={item.key} label={item.key} value={item.value} tone={item.emphasized ? 'emphasis' : undefined} />
          ),
        )}
        {/* 복용약과 기저질환은 프로필에서 온 사실이라 편집에서 열리지 않는다. */}
        {card.health.map((item) => (
          <KvRow key={item.key} label={item.key} value={item.value} />
        ))}

        {card.severity && (
          <SeverityReadout
            level={card.severity}
            label={SEVERITY_LABELS[card.severity]}
            nrs={SEVERITY_NRS[card.severity]}
          />
        )}

        {/* 이 카드가 AI 가 정리한 것이라는 사실을 밝힌다. */}
        {!edit && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              paddingTop: 'var(--mm-s10)',
            }}
          >
            <span className="mm-body-s" style={{ flex: 1, color: 'var(--mm-fg-subtle)' }}>
              {S.brief_card_ai_caption}
            </span>
            <InfoTooltip text={S.brief_card_ai_tooltip} label={S.brief_card_ai_tooltip_open} />
          </div>
        )}
      </Card>

      {!edit && card.allergies.length > 0 && (
        <Callout title={fmt(S.brief_card_allergy, card.allergies.join(' · '))} body={S.brief_card_allergy_body} />
      )}

      {/* 읽을 때 질문이 없으면 두지 않는다. 편집 중에는 비어 있어도 둔다. */}
      {(edit || questions.length > 0) && (
        <QuestionBlock
          title={S.brief_card_questions}
          questions={questions}
          edit={
            edit && {
              placeholder: S.brief_card_question_placeholder,
              addLabel: S.brief_card_question_add,
              /* 상한(#264)에 닿으면 `질문 추가` 줄을 감춘다. 문답 4단계와 같은 수다. */
              canAdd: questions.length < MAX_BRIEF_CARD_QUESTIONS,
              deleteLabel: (n) => fmt(S.brief_card_question_delete, n),
              onChange: edit.onQuestionChange,
              onDelete: edit.onQuestionDelete,
              onAdd: edit.onQuestionAdd,
            }
          }
        />
      )}
    </>
  )
}

/* ── 1e-1 카드 화면 (신규 저장 · 기존 보기 · 편집) ────────────── */

/**
 * 와이어프레임 1e-1 · 1e-1-E · 1e-1-DC.
 *
 * 읽기와 편집이 같은 화면의 두 모드다. **편집 상태는 Nav 우측 한 자리에서 이름만 바뀐다** —
 * 평소 `편집`, 편집 중 `취소`, 무엇이든 바꾸면 `확인`. 아무것도 안 건드렸는데 `확인`이 떠
 * 있으면 뭘 확인하라는 건지 알 수 없다(문서의 CRUD 규칙).
 *
 * 하단도 모드에 따라 갈린다. 읽을 때는 저장하기(아직 저장하지 않은 카드만), 편집 중에는
 * `브리핑 카드 삭제`다. 개체를 통째로 지우는 것이라 하단 Danger CTA 와 확인 대화상자를 거친다.
 */
export function BriefCardScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { state, addCard, clearIntake, updateCard, deleteCards } = useStore()

  const isNew = id === 'new'
  const nav = location.state as { hospital?: CardHospital; edit?: boolean } | null
  const hospitalFromNav = nav?.hospital ?? null

  /* 아직 저장하지 않은 카드에서 `확인`한 것. 새 카드는 화면을 열 때마다 문답에서 다시
     조립되므로, 고친 것을 조립 위에 얹어 둔다. 저장하면 이 값이 카드가 된다. */
  const [override, setOverride] = useState<CardDraft | null>(null)
  /* 있으면 편집 모드다. 모드를 따로 두지 않는다 — 편집 중이라면서 사본이 없는 상태를 만들 수 없어야 한다.
   *
   * **편집 상태로 바로 열 수 있다**(`state.edit`). 일자 상세가 편집 중일 때 브리핑 카드 줄을
   * 누르면 여기로 온다 — 고치러 왔으니 `편집`을 한 번 더 누르게 하지 않는다. 사본은 그때
   * 한 번만 뜬다(초기값). 저장하지 않은 카드(`new`)는 조립이 끝나기 전이라 받지 않는다. */
  const [draft, setDraft] = useState<CardDraft | null>(() => {
    if (!nav?.edit || isNew) return null
    const c = state.cards.find((x) => x.id === id)
    return c ? { items: c.items, questions: c.questions } : null
  })
  /* 삭제 확인 대화상자(1e-1-DC). 편집 상태와 분리한다 — 삭제를 취소하면 편집 모드는 그대로 남는다. */
  const [deleteOpen, setDeleteOpen] = useState(false)

  const built = useMemo<BriefCardModel | null>(() => {
    if (!isNew) return state.cards.find((c) => c.id === id) ?? null
    if (!state.intake) return null
    return buildCard(state.intake, state.health, state.profile, hospitalFromNav)
    // 새로 만드는 카드는 화면을 열 때마다 다시 조립한다. 저장 전까지는 어디에도 남지 않는다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isNew, state.cards, state.intake, state.health, hospitalFromNav])
  const card = built && isNew && override ? { ...built, ...override } : built

  /* 조립이 끝난 카드의 모양. `source` 가 `local` 로 기울면 AI 가 항목을 못 채우고 있다는
     뜻이다 — 화면은 그래도 카드를 그려서 티가 안 난다.
     **이펙트에 둔다.** 조립은 `useMemo` 인데 그 안에서 보내면 두 가지가 어긋난다. 개발
     모드의 StrictMode 가 두 번 부르고, 저장해서 `state.cards` 가 바뀌면 다시 조립되어 또
     보낸다. 한 카드는 한 번만 세어야 `card_saved` 와의 낙차가 이탈률이 된다. */
  const builtSent = useRef(false)
  useEffect(() => {
    if (!isNew || !built || builtSent.current) return
    builtSent.current = true
    capture('card_built', {
      item_count: built.items.length,
      question_count: built.questions.length,
      source: state.intake?.ai?.card ? 'server' : 'local',
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNew, built])

  /* 병원 찾기에서 고르고 돌아온 것을 **저장된 카드에 쓴다.**
   *
   * 새 카드는 조립이 이 값을 받아 가지만(`buildCard`), 저장된 카드는 스토어에서 그대로
   * 읽어 오므로 고른 것이 그냥 버려졌다 — `변경`을 눌러 병원을 고르고 와도 화면이 그대로였다.
   *
   * 편집 모드의 사본에 담지 않는다. 병원은 `변경`이라는 제 문이 있고 그 문은 편집 모드 밖에도
   * 서 있다. 사본에 담으면 `확인`을 눌러야 반영되는데, 그 버튼은 이 흐름에 없다. */
  useEffect(() => {
    if (!hospitalFromNav || isNew || !built) return
    const now = built.hospital
    if (now?.name === hospitalFromNav.name && now?.address === hospitalFromNav.address) return
    updateCard(built.id, { hospital: hospitalFromNav })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hospitalFromNav, isNew, built])

  if (!card) {
    return (
      <Screen title={S.brief_card_title} onBack={() => navigate('/home')} surface>
        <EmptyState
          icon="search_off"
          title={S.brief_card_failed_title}
          body={S.brief_card_failed_description}
          action={S.brief_card_retry}
          onAction={() => navigate('/home')}
        />
      </Screen>
    )
  }

  const editing = draft !== null
  const changed =
    draft !== null &&
    JSON.stringify(draft) !== JSON.stringify({ items: card.items, questions: card.questions })

  /** Nav 우측. 한 자리에서 셋으로 갈린다. */
  const navAction = !editing ? S.brief_card_edit : changed ? S.brief_card_edit_done : S.brief_card_cancel
  const onNavAction = () => {
    if (!editing) {
      setDraft({ items: card.items, questions: card.questions })
      return
    }
    if (changed && draft) {
      /* 사본을 옮긴다. 저장한 카드는 그 자리에서 고쳐지고, 아직 저장하지 않은 카드는 저장할 때 함께 간다. */
      if (isNew) setOverride(draft)
      else updateCard(card.id, { items: draft.items, questions: draft.questions })
    }
    setDraft(null)
  }

  const update = (fn: (d: CardDraft) => CardDraft) => setDraft((d) => (d ? fn(d) : d))
  const edit: CardEdit | undefined = draft
    ? {
        draft,
        onItemChange: (i, v) => {
          /* **항목의 이름만 보낸다.** 어느 칸이 자주 고쳐지는지가 AI 추출이 약한 자리이고,
             고친 내용은 증상 그 자체라 보내지 않는다. */
          capture('card_item_edited', { field: draft.items[i]?.key ?? '?', action: 'edit' })
          update((d) => ({ ...d, items: d.items.map((it, at) => (at === i ? { ...it, value: v } : it)) }))
        },
        /* 항목 줄의 ×. 확인을 붙이지 않는다 — 개체가 아니라 안의 항목이고 취소가 되돌린다. */
        onItemDelete: (i) => {
          capture('card_item_edited', { field: draft.items[i]?.key ?? '?', action: 'delete' })
          update((d) => ({ ...d, items: d.items.filter((_, at) => at !== i) }))
        },
        onQuestionChange: (i, v) =>
          update((d) => ({ ...d, questions: d.questions.map((q, at) => (at === i ? v : q)) })),
        onQuestionDelete: (i) => update((d) => ({ ...d, questions: d.questions.filter((_, at) => at !== i) })),
        /* `+ 질문 추가`. 입력 필드를 따로 띄우지 않고 목록 끝에 빈 질문을 하나 더한다. 적으면 그대로 항목이 된다. */
        onQuestionAdd: () =>
          update((d) => (d.questions.length >= MAX_BRIEF_CARD_QUESTIONS ? d : { ...d, questions: [...d.questions, ''] })),
      }
    : undefined

  const save = () => {
    /* 빈 질문은 담지 않는다. 더해 놓고 안 적은 줄이다. */
    const questions = card.questions.filter((q) => q.trim())
    /* 이 흐름의 마지막 걸음. `card_built` 과의 낙차가 카드를 보고 달아난 비율이다. */
    capture('card_saved', {
      item_count: card.items.length,
      question_count: questions.length,
      was_edited: override !== null,
      has_hospital: card.hospital !== null,
    })
    /* 저장하기는 카드를 **확정**한다(원본 `repository.confirm`). 새 카드는 목록에 더하고,
       이미 저장된 카드는 그 자리에서 상태만 바꾼다 — 다시 더하면 같은 카드가 두 장 된다. */
    if (isNew) addCard({ ...card, status: 'CONFIRMED', questions })
    else updateCard(card.id, { status: 'CONFIRMED', questions })
    clearIntake()
    /* 저장이 끝난 흐름을 뒤로 가기로 다시 밟으면 같은 문답으로 카드를 한 번 더 만들게
       된다. 원본은 `resetTo(HomeDestination)` 으로 백스택을 비운다. */
    resetTo(navigate, '/home')
  }

  /**
   * 삭제. 지운 카드의 화면에 남을 수 없다 — 시안이 카드 목록으로 보낸다(1e-1-DC).
   * 원본은 홈까지 걷어내고 목록을 얹어서, 뒤로 가면 홈이 나오고 목록이 두 장 쌓이지 않게 한다.
   */
  const confirmDelete = () => {
    setDeleteOpen(false)
    setDraft(null)
    if (isNew) clearIntake()
    else deleteCards([card.id])
    popTo(navigate, '/home', '/cards')
  }

  return (
    <Screen
      title={S.brief_card_title}
      /* 병원을 바꾸러 다녀오면 이 화면도 두 자리에 선다(`replace`). 한 장만 되돌리면
         같은 화면에 그대로 서고, 저장 전 카드는 고친 것까지 사라진다. */
      onBack={() => popPast(navigate, location.pathname)}
      action={navAction}
      onAction={onNavAction}
      surface
      bottom={
        editing ? (
          /* 편집 중 하단은 삭제 하나다. 사본을 옮기는 것은 Nav 우측 `확인`이 하고, 되돌리는
             것은 `취소`가 한다. 저장하기를 함께 두면 확인과 저장이 같은 일을 두 번 한다. */
          <BottomCta>
            <Button variant="danger" onClick={() => setDeleteOpen(true)}>
              {S.brief_card_delete}
            </Button>
          </BottomCta>
        ) : card.status === 'CONFIRMED' ? (
          /* 앱의 Footer 는 확정된 카드에는 아예 서지 않는다. 홈이나 기록에서 여는 카드는 다시
             보는 자리인데 저장하기가 서 있으면 아직 저장이 안 된 것으로 읽힌다. */
          undefined
        ) : (
          <BottomCta>
            <Button onClick={save}>{S.brief_card_save}</Button>
          </BottomCta>
        )
      }
    >
      <Pad
        style={{
          paddingTop: 12,
          paddingBottom: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--mm-s14)',
        }}
      >
        <CardBody card={card} profile={state.profile} edit={edit} />

        {/* **안 정했어도 섹션을 둔다.** 비어 있다고 감추면 정할 길이 사라진다 —
            `변경`이 이 섹션 안에 있다. 비었을 때의 낱말은 목록과 맞춘다. */}
        <div>
          <SectionHeader
            title={S.brief_card_hospital_section}
            action={S.brief_card_hospital_change}
            onAction={() =>
              navigate('/hospital?purpose=before', {
                state: { returnTo: isNew ? '/card/new' : `/card/${card.id}` },
              })
            }
          />
          <HospitalCard
            name={card.hospital?.name ?? S.brief_card_hospital_unset}
            address={card.hospital?.address}
          />
        </div>
      </Pad>

      <Dialog
        open={deleteOpen}
        title={S.brief_card_delete_title}
        body={S.brief_card_delete_body}
        confirmText={S.brief_card_delete_confirm}
        cancelText={S.brief_card_cancel}
        danger
        onCancel={() => setDeleteOpen(false)}
        onConfirm={confirmDelete}
      />
    </Screen>
  )
}

/* ── 1j-4 브리핑 카드 목록 ───────────────────────────────────────
 * 원본 `BriefCardListViewModel` · `BriefCardListScreen`.
 *
 *  - 월별로 묶는다(`yyyy년 M월`). 기록 탭과 같은 짜임이다.
 *  - 상태는 세 갈래다 — 작성 중 / 진료 전 / 진료 완료(`toRow()`).
 *  - 아래 줄은 `MM.dd 작성 · 병원명` 이고, 병원을 안 정했으면 "병원 미정"이다(Backend#101).
 *  - 보조 줄(detail)은 비워 둔다. 목록 응답에 본문이 없어 카드가 무엇을 담았는지 모른다.
 *
 * 편집(1j-4-D)은 기록 목록과 같은 CRUD 규칙이다 — Nav 우측 `편집 → 취소`, 줄마다 체크,
 * 묶음 머리에 그 달에서 고른 수, 하단 Danger 에 전체 수. 세는 단위가 "장"이다.
 */

export function BriefCardListScreen() {
  const navigate = useNavigate()
  const { state, startIntake, deleteCards } = useStore()

  /* null 이 아니면 편집 중이다. 빈 집합과 null 을 나눠 쓴다 — 편집에 막 들어와 아무것도 고르지
     않은 상태와 편집이 아닌 상태는 화면이 다르다. */
  const [selected, setSelected] = useState<Set<string> | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const editing = selected !== null
  const count = selected?.size ?? 0

  /* 월별 묶음. 카드는 작성일 기준이다. */
  const groups = useMemo(() => {
    const map = new Map<string, BriefCardModel[]>()
    state.cards.forEach((c) => {
      const key = c.writtenOn.slice(0, 7)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(c)
    })
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  }, [state.cards])

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
      title={S.brief_card_list_title}
      onBack={() => navigate(-1)}
      /* 목록이 비어 있으면 편집을 두지 않는다. 지울 것이 없는데 들어갈 수 있으면 안 된다. */
      action={state.cards.length ? (editing ? S.brief_card_list_edit_cancel : S.brief_card_list_edit) : undefined}
      onAction={() => setSelected(editing ? null : new Set())}
      surface
      bottom={
        editing ? (
          <BottomCta>
            <Button variant="danger" disabled={count === 0} onClick={() => setDeleteOpen(true)}>
              {count === 0 ? S.brief_card_list_delete : fmt(S.brief_card_list_delete_count, count)}
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
        {state.cards.length === 0 ? (
          <div style={{ flex: 1, display: 'flex' }}>
            <EmptyState
              icon="note"
              title={S.brief_card_list_empty_title}
              body={S.brief_card_list_empty_description}
              action={S.brief_card_list_empty_action}
              onAction={() => {
                startIntake()
                markFlowStart()
                navigate('/intake')
              }}
            />
          </div>
        ) : (
          groups.map(([month, cards]) => {
            const d = fromKey(`${month}-01`)
            const picked = selected ? cards.filter((c) => selected.has(c.id)).length : null
            return (
              <Fragment key={month}>
                {/* 묶음 머리에 개수를 함께 둔다. 편집 중에는 그 달에서 고른 수다(1j-4-D2). */}
                <SectionHeader
                  title={`${d.getFullYear()}년 ${d.getMonth() + 1}월`}
                  count={
                    picked === null
                      ? fmt(S.brief_card_list_count, cards.length)
                      : fmt(S.brief_card_list_selected, picked)
                  }
                />
                {cards.map((c) => (
                  <GroupRow
                    key={c.id}
                    title={c.title}
                    badge={<CardStatusBadge card={c} />}
                    meta={`${formatShort(c.writtenOn)} 작성 · ${c.hospital?.name ?? S.brief_card_hospital_unset}`}
                    selected={selected ? selected.has(c.id) : undefined}
                    onClick={() => (selected ? toggle(c.id) : navigate(`/card/${c.id}`))}
                  />
                ))}
              </Fragment>
            )
          })
        )}
      </Pad>

      <Dialog
        open={deleteOpen}
        title={fmt(S.brief_card_list_delete_title, count)}
        body={S.brief_card_list_delete_body}
        confirmText={S.brief_card_list_delete_confirm}
        cancelText={S.brief_card_list_edit_cancel}
        danger
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => {
          setDeleteOpen(false)
          deleteCards([...(selected ?? [])])
          setSelected(null)
        }}
      />
    </Screen>
  )
}

/** 목록·캘린더가 함께 쓰는 상태 뱃지. 세 갈래를 한 자리에서 고른다. */
export function CardStatusBadge({ card }: { card: { visited: boolean; status: string } }) {
  const status = cardRowStatus(card)
  if (status === 'CONFIRMED') return <Badge tone="success">{S.record_status_confirmed}</Badge>
  if (status === 'BEFORE_VISIT') return <Badge>{S.record_status_before_visit}</Badge>
  return <Badge tone="primary">{S.record_status_draft}</Badge>
}

export { CardBody }
