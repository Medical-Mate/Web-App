/** 증상 정리 2/4~4/4 — 문답(1c) · 통증 강도(1d) · 추가 질문(1i) · 완료(1c-5)
 *
 * 네 단계가 상단 내비와 하단 영역을 공유한다. **진행 표시는 본문 안에 있다** — Figma 가
 * 각 화면의 `Content` 첫 줄에 뒀고, 본문이 스크롤되면 함께 올라간다.
 *
 * 단계 본문의 여백과 간격이 같다: 좌우 거터 · 위 12 · 아래 16 · 줄 사이 14(`StepContent`).
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Pad, Screen } from '../components/Screen'
import { BottomCta, Button, Chip, Icon, Notice, SectionHeader, SeveritySlider, StepProgress } from '../components/ui'
import { S, fmt } from '../data/strings'
import { askNext, suggestQuestions } from '../data/ai'
import { capture, intakeElapsed } from '../lib/analytics'
import { useStore } from '../store/store'
import { MAX_BRIEF_CARD_QUESTIONS, SEVERITY_DESCRIPTIONS, SEVERITY_LABELS } from '../lib/types'
import { withSubjectParticle } from '../lib/korean'
import type { Severity } from '../lib/types'

/** 단계 본문의 공통 여백과 간격. */
const STEP_PAD = {
  paddingTop: 12,
  paddingBottom: 16,
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--mm-s14)',
} as const

export function IntakeChatScreen() {
  const navigate = useNavigate()
  const { state } = useStore()
  const session = state.intake

  useEffect(() => {
    if (!session) navigate('/home', { replace: true })
    else if (session.step === 1) navigate('/intake', { replace: true })
  }, [session, navigate])

  if (!session) return null
  if (session.step === 3) return <SeverityStep />
  if (session.step === 4) return <QuestionsStep />
  return <ChatStep />
}

/* ── 2/4 증상 문답 ─────────────────────────────────────────────── */

/**
 * Figma 1c-1 `402:1629`, 1c-2 `402:1506`.
 *
 * AI 는 면색도 테두리도 없이 라벨과 본문만, 환자는 유색 면에 우하 꼬리다. 화면에서 유색
 * 큰 면을 가진 유일한 요소가 환자의 말이다.
 *
 * 진행 표시와 짚은 부위 칩이 **대화 목록 안에** 있다. 위에 고정해 두면 대화가 길어질 때
 * 자리만 차지한다 — 앱도 `LazyColumn` 의 첫 두 항목이다.
 */
function ChatStep() {
  const navigate = useNavigate()
  const { state, updateIntake } = useStore()
  const session = state.intake!
  const [draft, setDraft] = useState('')
  const [thinking, setThinking] = useState(false)
  const [closed, setClosed] = useState(false)
  const logRef = useRef<HTMLDivElement>(null)
  const started = useRef(false)

  /* 화면에 처음 들어오면 AI가 먼저 말을 건다 */
  useEffect(() => {
    if (started.current) return
    started.current = true
    if (session.turns.length > 0) {
      setClosed(session.turns[session.turns.length - 1].text.includes('준비했어요'))
      return
    }
    setThinking(true)
    askNext(session, state.health).then((q) => {
      setThinking(false)
      updateIntake({ turns: [{ role: 'ai', text: q.text }], ...(q.patch ?? {}) })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* 마디가 붙으면 끝으로 보낸다. 그러지 않으면 방금 보낸 말과 AI 의 답이 입력창 뒤에 남는다. */
  useLayoutEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' })
  }, [session.turns.length, thinking])

  const send = () => {
    const text = draft.trim()
    /* 앱의 `canSend` 는 답을 기다리는 중인지만 본다. 문답이 끝났어도 더 말할 수 있다. */
    if (!text || thinking) return
    const turns = [...session.turns, { role: 'user' as const, text }]
    /* **글자 수만 보낸다.** 답이 짧아지는 것이 지치는 신호라 길이는 필요하고, 내용은
       필요 없다. 몇 턴까지 길게 쓰다 어디서 한 줄로 줄어드는지가 문답 길이를 정하는 근거다. */
    capture('intake_turn_answered', {
      turn_index: turns.filter((t) => t.role === 'user').length - 1,
      answer_len: text.length,
    })
    updateIntake({ turns })
    setDraft('')
    setThinking(true)
    askNext({ ...session, turns }, state.health).then((q) => {
      setThinking(false)
      updateIntake({ turns: [...turns, { role: 'ai' as const, text: q.text }], ...(q.patch ?? {}) })
      if (q.closing) {
        /* **한 번만 센다.** 문답이 끝난 뒤에도 더 말할 수 있어서(`canSend` 는 답을 기다리는
           중인지만 본다) 그 뒤 턴마다 `closing` 이 다시 온다. 이미 끝난 것으로 세었으면
           넘어간다 — 완료 수가 부풀면 이탈률이 실제보다 좋아 보인다. */
        if (!closed) {
          const ms = intakeElapsed()
          capture('intake_completed', {
            turn_count: turns.filter((t) => t.role === 'user').length,
            ...(ms === null ? {} : { total_ms: ms }),
          })
        }
        setClosed(true)
      }
    })
  }

  return (
    <Screen
      title={S.intake_title}
      /* 되돌아간 자리를 센다. 어느 턴이 한 번에 안 읽히는지가 여기 남는다. */
      onBack={() => {
        capture('intake_back', { turn_index: session.turns.filter((t) => t.role === 'user').length })
        navigate(-1)
      }}
      surface
      scrollRef={logRef}
      bottom={
        /* 문답에서도 물어볼 것이 남지 않으면 다음 버튼이 함께 나온다. 시안에 문답을
           끝내는 조작이 없어서 넣은 것이다. 자식 사이 간격은 10이다. */
        <BottomCta>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mm-s10)' }}>
            {closed && <Button onClick={() => updateIntake({ step: 3 })}>{S.intake_next}</Button>}
            {/* 원본은 `MedicalMateTextField`(최소 56 · 반경 16 · 왼쪽 20 오른쪽 4)에 보내기
                아이콘 버튼(Ghost L)을 Actions 슬롯으로 넣는다. 같은 컴포넌트를 쓴다. */}
            {/* 적는 자리에서 한 번 더. 입력칸 바로 위라 손이 가기 전에 읽힌다. */}
            <p className="mm-body-s mm-input-note">{S.input_no_pii}</p>
            <div className={`mm-field__box${draft ? ' mm-field__box--filled' : ''}`}>
              <input
                className="mm-field__input"
                placeholder={S.intake_chat_placeholder}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') send()
                }}
              />
              {/* 앱은 음성을 쓸 수 없는 기기에서 마이크를 그리지 않는다. 웹앱은 음성
                  입력을 붙이지 않아 늘 그 경우다 — 눌러도 아무 일이 없는 버튼을 두지 않는다. */}
              <button
                className="mm-iconbtn"
                onClick={send}
                aria-label={S.intake_chat_send}
                disabled={!draft.trim() || thinking}
              >
                <Icon name="arrow_up" />
              </button>
            </div>
          </div>
        </BottomCta>
      }
    >
      <Pad style={STEP_PAD}>
        <StepProgress label={S.intake_progress_label} current={2} total={4} />

        {/* 짚은 부위(`402:1651`). 대화가 길어져도 무엇에 대한 문답인지 남아 있어야 한다. */}
        {session.bodyPart && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="mm-body-s" style={{ color: 'var(--mm-fg-subtle)' }}>
              {S.intake_chat_context}
            </span>
            <Chip selected>{session.bodyPart.label}</Chip>
          </div>
        )}

        {session.turns.map((turn, i) =>
          turn.role === 'ai' ? (
            <div className="mm-bubble-ai" key={i}>
              <div className="mm-bubble-ai__tag">{S.intake_chat_ai}</div>
              <div className="mm-bubble-ai__text">{turn.text}</div>
            </div>
          ) : (
            <div className="mm-bubble-user" key={i}>
              <div className="mm-bubble-user__text">{turn.text}</div>
            </div>
          ),
        )}

        {/* 점 세 개. AI 의 말이 설 자리에 서고 말풍선 면도 라벨도 없다. */}
        {thinking && (
          <div className="mm-typingrow">
            <div className="mm-typing" aria-label={S.intake_chat_waiting}>
              <span />
              <span />
              <span />
            </div>
          </div>
        )}
      </Pad>
    </Screen>
  )
}

/* ── 3/4 통증 강도 ─────────────────────────────────────────────── */

/**
 * Figma 1d `402:1934`.
 *
 * 판독 카드는 슬라이더가 안에 그린다. 화면에서 따로 얹지 않는다 — 같은 수치가 두 곳에
 * 나온다.
 */
function SeverityStep() {
  const { state, updateIntake } = useStore()
  const session = state.intake!
  /* 앱의 기본값은 LEVEL_3 이다(`IntakeUiState.severity`). 고르지 않은 상태가 없어서
     `다음`도 처음부터 눌린다. */
  const [level, setLevel] = useState<Severity>(session.severity ?? 3)

  return (
    <Screen
      title={S.intake_title}
      onBack={() => updateIntake({ step: 2 })}
      surface
      bottom={
        <BottomCta>
          <Button
            onClick={() => {
              capture('severity_set', { value: level })
              updateIntake({ severity: level, step: 4 })
            }}
          >
            {S.intake_next}
          </Button>
        </BottomCta>
      }
    >
      <Pad style={STEP_PAD}>
        <StepProgress label={S.intake_progress_label} current={3} total={4} />

        <h2 className="mm-heading-l">
          {fmt(S.intake_severity_question, withSubjectParticle(session.bodyPart?.label ?? ''))}
        </h2>
        <p className="mm-body-m" style={{ color: 'var(--mm-fg-subtle)', whiteSpace: 'pre-line' }}>
          {S.intake_severity_description}
        </p>

        <SeveritySlider
          value={level}
          onChange={(v) => setLevel(v)}
          labels={SEVERITY_LABELS}
          descriptions={SEVERITY_DESCRIPTIONS}
          lowCaption={S.severity_scale_low}
          highCaption={S.severity_scale_high}
        />

        {/* 숫자가 어디에 쓰이는지 알려준다. NRS 등가는 의사가 읽는 값이고 환자는
            낱말로 고르면 된다. */}
        <Notice title={S.intake_severity_notice_title} body={S.intake_severity_notice_body} />
      </Pad>
    </Screen>
  )
}

/* ── 4/4 의사에게 물어볼 것 ────────────────────────────────────── */

/**
 * Figma 1i `489:5606`.
 *
 * 적은 질문이 브리핑 카드 맨 아래에 함께 담긴다. 진료실에서 잊고 못 꺼내는 것을 막는
 * 자리다.
 */
function QuestionsStep() {
  const navigate = useNavigate()
  const { state, updateIntake } = useStore()
  const session = state.intake!
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const requested = useRef(false)

  /* 들어오면 AI가 질문 세 개를 추천해 자동으로 채운다 */
  useEffect(() => {
    if (requested.current || session.suggested.length || session.questions.length) return
    requested.current = true
    setLoading(true)
    suggestQuestions(session, state.health).then((qs) => {
      setLoading(false)
      updateIntake({ suggested: qs, questions: qs })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* 질문은 다섯 개까지다(MAX_BRIEF_CARD_QUESTIONS). 카드 편집도 같은 상한을 쓴다. */
  const canAdd = session.questions.length < MAX_BRIEF_CARD_QUESTIONS

  const add = () => {
    const text = draft.trim()
    if (!text || !canAdd) return
    updateIntake({ questions: [...session.questions, text] })
    setDraft('')
  }

  const remove = (index: number) =>
    updateIntake({ questions: session.questions.filter((_, i) => i !== index) })

  return (
    <Screen
      title={S.intake_title}
      onBack={() => updateIntake({ step: 3 })}
      surface
      bottom={
        <BottomCta>
          <Button
            onClick={() => {
              updateIntake({ completed: true })
              navigate('/intake/done')
            }}
          >
            {S.intake_next}
          </Button>
        </BottomCta>
      }
    >
      <Pad style={STEP_PAD}>
        <StepProgress label={S.intake_progress_label} current={4} total={4} />

        <h2 className="mm-heading-l">{S.intake_questions_question}</h2>
        <p className="mm-body-m" style={{ color: 'var(--mm-fg-subtle)', whiteSpace: 'pre-line' }}>
          {S.intake_questions_description}
        </p>

        {/* 상한에 닿아도 입력 줄은 남긴다. 왜 더 못 넣는지를 필드 아래에 적는다 —
            버튼만 꺼 두면 고장으로 읽힌다. */}
        <div>
          <div className={`mm-field__box${draft ? ' mm-field__box--filled' : ''}`}>
            <input
              className="mm-field__input"
              placeholder={S.intake_questions_placeholder}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') add()
              }}
            />
            <button
              className="mm-iconbtn"
              onClick={add}
              aria-label={S.intake_questions_add}
              disabled={!draft.trim() || !canAdd}
              style={{
                color: draft.trim() && canAdd ? 'var(--mm-fg-primary)' : 'var(--mm-fg-disabled)',
              }}
            >
              <Icon name="plus" size="md" />
            </button>
          </div>
          {!canAdd && (
            <div className="mm-field__hint">{fmt(S.intake_questions_full, MAX_BRIEF_CARD_QUESTIONS)}</div>
          )}
        </div>

        {loading && (
          <div className="mm-loading">
            <span className="mm-spinner" />
            <span>AI가 질문을 고르고 있어요</span>
          </div>
        )}

        {/* 적어 둔 질문이 없으면 구역 자체를 두지 않는다(`SavedQuestions`). */}
        {session.questions.length > 0 && (
          <>
            <SectionHeader
              title={S.intake_questions_saved}
              count={fmt(S.intake_questions_count, session.questions.length, MAX_BRIEF_CARD_QUESTIONS)}
            />
            {/* AI 후보와 직접 적은 것이 한 목록에 섞여 있어서 어디서 왔는지를 밝힌다. */}
            <p className="mm-body-s" style={{ color: 'var(--mm-fg-subtle)' }}>
              {S.intake_questions_ai_hint}
            </p>
            {session.questions.map((q, i) => (
              <div className="mm-qrow" key={`${q}-${i}`}>
                <span className="mm-qrow__num">{i + 1}</span>
                <span className="mm-body-m" style={{ flex: 1, wordBreak: 'keep-all' }}>
                  {q}
                </span>
                <button
                  className="mm-iconbtn"
                  onClick={() => remove(i)}
                  aria-label={fmt(S.intake_questions_remove, i + 1)}
                  style={{ color: 'var(--mm-fg-muted)' }}
                >
                  <Icon name="close" size="md" />
                </button>
              </div>
            ))}
          </>
        )}
      </Pad>
    </Screen>
  )
}

/* ── 1c-5 증상 정리 완료 ───────────────────────────────────────── */

/**
 * Figma `1041:3655`.
 *
 * 문답 네 단계를 마친 뒤 갈라지는 자리다. 바로 카드를 만들 수도 있고, 진료받을 병원을
 * 먼저 찾을 수도 있다.
 *
 * **진행 표시를 두지 않는다.** 문답이 아니라 문답이 끝난 뒤의 화면이라 `5 / 4` 가 될
 * 곳이 없다. 병원 찾기가 보조 버튼이다 — 진료 후에도 등록할 수 있어서 여기서 반드시
 * 정해야 하는 값이 아니다.
 */
export function IntakeDoneScreen() {
  const navigate = useNavigate()
  const { state } = useStore()
  const session = state.intake

  useEffect(() => {
    if (!session) navigate('/home', { replace: true })
  }, [session, navigate])

  return (
    <Screen
      title={S.intake_title}
      onBack={() => navigate(-1)}
      surface
      bottom={
        <BottomCta>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mm-s10)' }}>
            <Button onClick={() => navigate('/card/new')}>{S.intake_done_card}</Button>
            <Button variant="outline" onClick={() => navigate('/hospital?purpose=before')}>
              {S.intake_done_hospital}
            </Button>
          </div>
        </BottomCta>
      }
    >
      <div
        className="mm-anim-fade"
        style={{
          minHeight: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--mm-s16)',
          padding: '0 var(--mm-gutter)',
          textAlign: 'center',
        }}
      >
        <span
          className="mm-empty__icon"
          style={{ width: 80, height: 80, background: 'var(--mm-bg-primary-faint)' }}
        >
          <Icon name="check_circle" size={38} />
        </span>
        <h1 className="mm-heading-l">{S.intake_done_title}</h1>
        <p className="mm-body-m" style={{ color: 'var(--mm-fg-subtle)', whiteSpace: 'pre-line' }}>
          {S.intake_done_description}
        </p>
      </div>
    </Screen>
  )
}
