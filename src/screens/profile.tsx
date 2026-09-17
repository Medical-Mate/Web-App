/** 1s-1 내 정보 · 1s-2 건강 정보 수정 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Pad, Screen } from '../components/Screen'
import { BottomCta, Button, Card, Chip, Dialog, Icon, KvRow, Notice, SectionHeader } from '../components/ui'
import { A, S, fmt } from '../data/strings'
import { resetStack } from '../lib/flow'
import { HEALTH_ITEM_MAX_COUNT, HEALTH_ITEM_MAX_LENGTH } from '../lib/types'
import { useStore } from '../store/store'

/* ── 1s-1 내 정보 ──────────────────────────────────────────────── */

/**
 * 설정 세 개.
 *
 * 아직 저장되지 않는다. 화면 안에서 켜고 끄는 것까지가 앱에서도 지금 범위다 —
 * 기기에 남기려면 저장소가, 계정에 남기려면 API 가 필요하다.
 */
const SETTINGS = [
  S.my_profile_setting_visit_reminder,
  S.my_profile_setting_card_auto_save,
  S.my_profile_setting_handoff_brightness,
]

/** 시안 1s-1 이 그린 초기값. */
const SETTING_DEFAULTS = [true, true, false]

/**
 * 건강 정보 요약 한 줄.
 *
 * **비어 있는 것을 "없어요"로 보지 않는다.** 아무것도 고르지 않고 넘어간 것이 "없어요"인지
 * "그냥 넘겼어요"인지 화면이 알 수 없어서 "잘 모르겠어요"로 적는다. 알러지에서 없음과
 * 모름은 처방이 달라지는 값이라 단정하면 안 된다(`HealthField`).
 */
function summaryText(items: string[]): string {
  return items.length ? items.join(' · ') : S.my_profile_health_unknown
}

/**
 * 와이어프레임 1s-1. Figma `407:2375`.
 *
 * 홈 헤더의 아바타에서 들어온다. 건강 정보는 요약만 보여주고 고치는 것은 1s-2 로 넘긴다 —
 * 진료 때 보여줄 값이라 실수로 바뀌면 안 되고, 이 화면은 확인하는 자리다.
 */
export function MyProfileScreen() {
  const navigate = useNavigate()
  const { state, signOut, resetAll } = useStore()
  const [withdraw, setWithdraw] = useState(false)
  const [toggles, setToggles] = useState(SETTING_DEFAULTS)

  const birthYear = new Date().getFullYear() - state.profile.age + 1
  const health = state.health

  return (
    <Screen title={S.my_profile_title} onBack={() => navigate(-1)} surface>
      <Pad style={{ paddingTop: 8, paddingBottom: 32 }}>
        {/* 프로필 카드.
            시안에는 오른쪽에 chevron 이 있는데 가리키는 화면이 없다. 이름·생년·성별은
            카카오에서 오는 값이고 그것을 고치는 화면이 와이어프레임에 없다. 눌러도
            아무 일이 없는데 chevron 이 있으면 사용자가 눌러본다. */}
        <Card className="mm-card--stack">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span className="mm-avatar mm-body-l-strong" style={{ width: 56, height: 56 }}>
              {state.profile.name.slice(0, 1)}
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div className="mm-heading-m">{state.profile.name}</div>
              <div className="mm-body-s" style={{ color: 'var(--mm-fg-subtle)' }}>
                {fmt(S.my_profile_birth_year, birthYear)} ·{' '}
                {state.profile.sex === 'M' ? S.my_profile_sex_male : S.my_profile_sex_female}
              </div>
              <div className="mm-label-s" style={{ color: 'var(--mm-fg-subtle)' }}>
                {S.my_profile_login_kakao}
              </div>
            </div>
          </div>
        </Card>

        <SectionHeader
          title={S.my_profile_health}
          action={S.my_profile_health_edit}
          onAction={() => navigate('/me/health')}
        />
        {/* 알러지만 링크색으로 세운다. 진료 때 먼저 전해야 하는 값이다. */}
        <div className="mm-rowcard">
          <KvRow label={S.my_profile_health_medications} value={summaryText(health.medications)} />
          <KvRow label={S.my_profile_health_conditions} value={summaryText(health.conditions)} />
          <KvRow label={S.my_profile_health_allergies} value={summaryText(health.allergies)} tone="link" />
        </div>

        <SectionHeader title={S.my_profile_settings} />
        <div className="mm-rowcard mm-rowcard--settings">
          {SETTINGS.map((label, i) => (
            <button
              key={label}
              className={`mm-switch${toggles[i] ? ' mm-switch--on' : ''}`}
              role="switch"
              aria-checked={toggles[i]}
              onClick={() => setToggles((t) => t.map((v, j) => (j === i ? !v : v)))}
            >
              <span className="mm-switch__label">{label}</span>
              <span className="mm-switch__track">
                <span className="mm-switch__thumb" />
              </span>
            </button>
          ))}
        </div>

        {/* 계정에서 나가는 두 가지.
            회원탈퇴는 시안에 없다. 그렇다고 다른 화면에 흩어 두면 로그아웃과 탈퇴가
            갈라지므로 로그아웃 아래에 Ghost 로 뒀다. 탈퇴는 되돌릴 수 없어 확인을 거친다. */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--mm-s4)',
            marginTop: 'var(--mm-s24)',
          }}
        >
          <Button
            variant="outline"
            onClick={() => {
              /* 먼저 옮기고 끊는다. 순서가 바뀌면 이 화면의 `Guard` 가 먼저 길을 정한다. */
              resetStack(navigate, '/login')
              signOut()
            }}
          >
            {S.account_logout}
          </Button>
          <Button variant="ghost" onClick={() => setWithdraw(true)}>
            {S.account_withdraw}
          </Button>
        </div>
      </Pad>

      <Dialog
        open={withdraw}
        title={S.account_withdraw_confirm_title}
        body={S.account_withdraw_confirm_message}
        confirmText={S.account_withdraw_confirm}
        cancelText={S.account_cancel}
        danger
        onCancel={() => setWithdraw(false)}
        onConfirm={() => {
          resetStack(navigate, '/login')
          resetAll()
        }}
      />
    </Screen>
  )
}

/* ── 1s-2 건강 정보 수정 ───────────────────────────────────────── */

/**
 * 세 갈래를 한 화면에서 고친다. 1b 와 다른 점이다 — 처음 등록할 때는 하나씩 물어야
 * 하지만, 고칠 때는 무엇이 들어 있는지 한눈에 보이는 쪽이 낫다.
 *
 * 고를 수 있는 항목은 1b 와 **같은 배열**을 쓴다. 두 화면의 목록이 갈리면 1b 에서 고른
 * 것이 여기에 없는 일이 생긴다.
 */
const EDIT_SECTIONS = [
  {
    key: 'medications' as const,
    label: S.profile_setup_medications_label,
    options: A.profile_setup_medications_options,
  },
  {
    key: 'conditions' as const,
    label: S.profile_setup_conditions_label,
    options: A.profile_setup_conditions_options,
  },
  {
    key: 'allergies' as const,
    label: S.profile_setup_allergies_label,
    options: A.profile_setup_allergies_options,
  },
]

type EditKey = (typeof EDIT_SECTIONS)[number]['key']

export function HealthEditScreen() {
  const navigate = useNavigate()
  const { state, setHealth } = useStore()
  const [draft, setDraft] = useState({ ...state.health })
  const [adding, setAdding] = useState<EditKey | null>(null)
  const [text, setText] = useState('')

  const toggle = (key: EditKey, value: string) =>
    setDraft((d) => ({
      ...d,
      [key]: d[key].includes(value) ? d[key].filter((v) => v !== value) : [...d[key], value],
    }))

  /** 적은 것을 고른 상태로 더한다. 빈 칸이면 아무 일도 하지 않는다. */
  const submit = (key: EditKey) => {
    const value = text.trim().slice(0, HEALTH_ITEM_MAX_LENGTH)
    if (!value) return
    /* 갈래마다 20개까지 — 원본이 보낼 때 자르는 값. 넘치면 더하지 않는다. */
    setDraft((d) =>
      d[key].includes(value) || d[key].length >= HEALTH_ITEM_MAX_COUNT ? d : { ...d, [key]: [...d[key], value] },
    )
    setText('')
  }

  const close = () => navigate(-1)

  return (
    <Screen
      title={S.health_edit_title}
      /* 뒤로가 아니라 닫기다. 흐름을 한 단계 되돌리는 것이 아니라 수정 자체를 그만둔다. */
      backIcon="close"
      onBack={close}
      surface
      bottom={
        <BottomCta>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mm-s8)' }}>
            <Button
              onClick={() => {
                setHealth(draft)
                close()
              }}
            >
              {S.health_edit_save}
            </Button>
            <Button variant="ghost" onClick={close}>
              {S.health_edit_cancel}
            </Button>
          </div>
        </BottomCta>
      }
    >
      <Pad
        style={{
          paddingTop: 12,
          paddingBottom: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--mm-s24)',
        }}
      >
        {/* 이미 진료실에서 보여준 카드가 바뀌면 의사가 본 내용과 기록이 달라진다. */}
        <Notice title={S.health_edit_notice_title} body={S.health_edit_notice_body} />

        {EDIT_SECTIONS.map((section) => {
          const chosen = draft[section.key]
          /* 읽어 온 값에는 기본 목록에 있는 것도 섞여 있다. 겹치면 같은 칩이 두 번
             그려지고 어느 쪽이 골라졌는지 알 수 없다. */
          const options = [...new Set([...section.options, ...chosen])]
          return (
            <div
              key={section.key}
              style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mm-s10)' }}
            >
              <h3 className="mm-heading-s">{section.label}</h3>
              <div className="mm-chip-group">
                {options.map((o) => (
                  <Chip key={o} selected={chosen.includes(o)} onClick={() => toggle(section.key, o)}>
                    {o}
                  </Chip>
                ))}
                {/* 시안에는 이 칩만 있고 누른 뒤가 그려져 있지 않다. 추가 질문(1i)이
                    입력 칸과 더하기 버튼으로 목록을 늘리므로 같은 방식으로 뒀다. */}
                <Chip
                  onClick={() => {
                    setAdding(adding === section.key ? null : section.key)
                    setText('')
                  }}
                >
                  {S.health_edit_add}
                </Chip>
              </div>

              {adding === section.key && (
                <div className={`mm-field__box${text ? ' mm-field__box--filled' : ''}`}>
                  <input
                    className="mm-field__input"
                    placeholder={S.health_edit_add_placeholder}
                    maxLength={HEALTH_ITEM_MAX_LENGTH}
                    value={text}
                    autoFocus
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') submit(section.key)
                    }}
                  />
                  <button
                    className="mm-iconbtn mm-iconbtn--sm"
                    onClick={() => submit(section.key)}
                    disabled={!text.trim()}
                    aria-label={S.health_edit_add_submit}
                  >
                    <Icon name="plus" size="md" />
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </Pad>
    </Screen>
  )
}
