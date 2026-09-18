/** 디자인 시스템 컴포넌트
 * 원본: core/designsystem/component/*.kt · 스타일은 styles/components.css
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { ICONS } from '../data/icons'
import type { IconName } from '../data/icons'
import { ILLUSTRATIONS } from '../data/illustrations'
import type { IllustrationName } from '../data/illustrations'

/* ── Icon ──────────────────────────────────────────────────────── */

export type { IconName }

/**
 * 인라인 SVG 아이콘.
 *
 * 외부 파일(<img> · CSS mask)을 쓰지 않는다. 배포 경로가 루트가 아니면 조용히
 * 사라지기 때문이다. 색은 `currentColor` 라 부모의 color 를 따른다.
 */
export function Icon({
  name,
  size = 'lg',
  style,
  className = '',
}: {
  name: IconName
  size?: 'sm' | 'md' | 'lg' | number
  style?: CSSProperties
  className?: string
}) {
  const def = ICONS[name]
  if (!def) return null
  const px = typeof size === 'number' ? size : undefined
  const cls = ['mm-icon', typeof size === 'string' ? `mm-icon--${size}` : '', className]
    .filter(Boolean)
    .join(' ')
  return (
    <svg
      className={cls}
      viewBox={def.viewBox}
      aria-hidden="true"
      focusable="false"
      style={px ? { width: px, height: px, ...style } : style}
      dangerouslySetInnerHTML={{ __html: def.body }}
    />
  )
}

/**
 * 온보딩·로그인 일러스트. 인라인 SVG다.
 *
 * **`height: auto` 만으로는 안 된다.** 인라인 `<svg>` 는 `<img>` 와 달리 고유 높이가
 * 없어서, 플렉스 안이나 블록 안에서 높이가 0 으로 접히고 그림이 통째로 사라진다.
 * viewBox 에서 뽑은 `aspect-ratio` 로 높이를 고정하고 `flex: 0 0 auto` 로 줄어들지
 * 않게 막는다.
 */
export function Illustration({
  name,
  style,
}: {
  name: IllustrationName
  style?: CSSProperties
}) {
  const def = ILLUSTRATIONS[name]
  const [, , w, h] = def.viewBox.split(/\s+/).map(Number)
  return (
    <svg
      viewBox={def.viewBox}
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="xMidYMid meet"
      style={{
        width: '100%',
        aspectRatio: `${w} / ${h}`,
        height: 'auto',
        flex: '0 0 auto',
        display: 'block',
        ...style,
      }}
      dangerouslySetInnerHTML={{ __html: def.body }}
    />
  )
}

/** 로고 마크. 단색이라 color 로 물들일 수 있다(스플래시·완료 화면의 흰색). */
export function LogoMark({ size = 48, style }: { size?: number; style?: CSSProperties }) {
  return <Icon name="logo_mark" size={size} style={style} />
}

/** 로고 락업(심볼 + 워드마크). 139:36 이라 세로 높이만 정하고 가로는 비율로 둔다. */
export function Logo({ height = 24, style }: { height?: number; style?: CSSProperties }) {
  const def = ICONS.logo_lockup
  return (
    <svg
      viewBox={def.viewBox}
      role="img"
      aria-label="진료메이트"
      style={{ height, width: height * def.ratio, display: 'block', flex: '0 0 auto', ...style }}
      dangerouslySetInnerHTML={{ __html: def.body }}
    />
  )
}

/* ── Nav Bar ───────────────────────────────────────────────────── */

export function NavBar({
  title,
  onBack,
  backIcon = 'chevron_left',
  action,
  onAction,
  scrolled,
}: {
  title?: string
  onBack?: () => void
  backIcon?: 'chevron_left' | 'close'
  action?: string
  onAction?: () => void
  scrolled?: boolean
}) {
  return (
    <header
      className={`mm-navbar${action ? ' mm-navbar--action' : ''}${scrolled ? ' mm-navbar--scrolled' : ''}`}
    >
      <div className="mm-navbar__side mm-navbar__side--start">
        {onBack && (
          <button className="mm-iconbtn" onClick={onBack} aria-label={backIcon === 'close' ? '닫기' : '뒤로'}>
            <Icon name={backIcon} />
          </button>
        )}
      </div>
      <h1 className="mm-navbar__title">{title}</h1>
      <div className="mm-navbar__side mm-navbar__side--end">
        {action && (
          <button className="mm-navbar__action" onClick={onAction}>
            {action}
          </button>
        )}
      </div>
    </header>
  )
}

/* ── Button ────────────────────────────────────────────────────── */

/* Figma 디자인 시스템의 Button Type 과 이름을 맞춘다. secondary 는 tonal 의 옛 이름. */
type ButtonVariant = 'primary' | 'tonal' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'kakao'

export function Button({
  children,
  onClick,
  variant = 'primary',
  size,
  disabled,
  style,
  icon,
}: {
  children: ReactNode
  onClick?: () => void
  variant?: ButtonVariant
  size?: 'm' | 's' | 'pill'
  disabled?: boolean
  style?: CSSProperties
  icon?: IconName
}) {
  return (
    <button
      className={`mm-btn mm-btn--${variant}${size ? ` mm-btn--${size}` : ''}`}
      onClick={onClick}
      disabled={disabled}
      style={style}
    >
      {icon && <Icon name={icon} size="md" />}
      {children}
    </button>
  )
}

/** 하단 고정 CTA */
export function BottomCta({ children, plain }: { children: ReactNode; plain?: boolean }) {
  return <div className={`mm-cta${plain ? ' mm-cta--plain' : ''}`}>{children}</div>
}

/* ── Card ──────────────────────────────────────────────────────── */

export function Card({
  children,
  onClick,
  variant,
  selected,
  style,
  className = '',
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'flat' | 'primary' | 'tint' | 'quiet'
  selected?: boolean
  style?: CSSProperties
  className?: string
}) {
  const cls = [
    'mm-card',
    variant ? `mm-card--${variant}` : '',
    onClick ? 'mm-card--tap' : '',
    selected ? 'mm-card--selected' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')
  if (onClick) {
    return (
      <button className={cls} onClick={onClick} style={style}>
        {children}
      </button>
    )
  }
  return (
    <div className={cls} style={style}>
      {children}
    </div>
  )
}

/* ── Chip ──────────────────────────────────────────────────────── */

export function Chip({
  children,
  selected,
  onClick,
  size,
  tone,
  disabled,
}: {
  children: ReactNode
  selected?: boolean
  onClick?: () => void
  size?: 'sm'
  /**
   * `primary` 는 고르는 칩이 아니라 **누르면 일이 일어나는 칩**이다(진료 후 메모의
   * `AI로 정리하기`). 면은 그대로 두고 테두리와 글자만 브랜드색이라, 고른 칩(`selected`,
   * 면이 옅은 브랜드색)과 한눈에 갈린다.
   */
  tone?: 'primary'
  /** 잠긴 칩. 원본이 `enabled` 로 막는 자리다 — 아직 할 수 없는 일임을 색으로 알린다. */
  disabled?: boolean
}) {
  const variant = disabled ? '' : selected ? ' mm-chip--selected' : tone === 'primary' ? ' mm-chip--primary' : ''
  return (
    <button
      className={`mm-chip${variant}${size ? ` mm-chip--${size}` : ''}`}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
    >
      {children}
    </button>
  )
}

/* ── Badge ─────────────────────────────────────────────────────── */

export function Badge({
  children,
  tone = 'default',
}: {
  children: ReactNode
  tone?: 'default' | 'success' | 'warning' | 'primary' | 'onprimary'
}) {
  return <span className={`mm-badge${tone !== 'default' ? ` mm-badge--${tone}` : ''}`}>{children}</span>
}

/* ── Rows ──────────────────────────────────────────────────────── */

/**
 * DESIGN.md 의 `KV Row`.
 *
 * `emphasis` 는 카드당 최대 하나만 쓴다. 둘 이상이면 강조가 사라진다. `link` 는 다른
 * 축이다 — 굵기는 그대로 두고 색만 바꾼다.
 */
/**
 * 그 자리에서 고치는 입력. **내용이 길면 줄을 늘린다.**
 *
 * 한 줄 입력(`<input>`)으로 두면 긴 값이 오른쪽에서 잘려 무엇을 고치는지 보이지 않는다.
 * 시안도 편집 중에 KV 행이 54 에서 80 으로 자란다(`1e-1-E` 의 KV Row 높이). 읽는 상태에서
 * 두 줄로 접히던 값은 편집 중에도 두 줄이어야 같은 값으로 읽힌다.
 *
 * `textarea` 지만 줄바꿈은 받지 않는다 — 항목 하나가 여러 줄이 되면 카드에 담길 때 줄이
 * 늘어난 것인지 항목이 늘어난 것인지 알 수 없다.
 */
export function GrowInput({
  className,
  value,
  placeholder,
  autoFocus,
  maxLength,
  ariaLabel,
  onChange,
  onBlur,
  onEnter,
}: {
  className: string
  value: string
  placeholder?: string
  autoFocus?: boolean
  maxLength?: number
  ariaLabel?: string
  onChange: (value: string) => void
  onBlur?: () => void
  /** 엔터로 적기를 마치는 자리(할 일 줄). 줄바꿈은 넣지 않는다. */
  onEnter?: () => void
}) {
  const ref = useRef<HTMLTextAreaElement | null>(null)

  /* 그린 뒤 바로 높이를 맞춘다. 이펙트로 미루면 첫 프레임이 한 줄로 보이고 튄다. */
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = '0px'
    el.style.height = `${el.scrollHeight}px`
  }, [value])

  return (
    <textarea
      ref={ref}
      rows={1}
      className={className}
      value={value}
      placeholder={placeholder}
      autoFocus={autoFocus}
      maxLength={maxLength}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      onKeyDown={(e) => {
        if (e.key !== 'Enter') return
        e.preventDefault()
        onEnter?.()
      }}
    />
  )
}

export function KvRow({
  label,
  value,
  tone,
  edit,
}: {
  label: string
  value: string
  tone?: 'emphasis' | 'link'
  /**
   * 편집 모드(`Editing KV Row`). 값이 입력이 되고 아래에 `border/strong` 밑줄, 오른쪽에 ×(S,
   * 32 상자 · 18 아이콘)가 붙는다. ×는 행 **밖**이다 — 키 열 72 를 고정해 값의 정렬을 맞추는 것이
   * 이 행의 일이고, 안에 버튼이 들어가면 값 폭이 행마다 달라진다. 밑줄은 그만큼 짧아진다.
   */
  edit?: { onChange: (value: string) => void; onDelete: () => void; deleteLabel: string }
}) {
  if (edit) {
    return (
      <div className="mm-kv-edit">
        <div className="mm-kv mm-kv--editing">
          <div className="mm-kv__k">{label}</div>
          <GrowInput className="mm-kv__input" value={value} ariaLabel={label} onChange={edit.onChange} />
        </div>
        <button className="mm-iconbtn mm-iconbtn--sm" onClick={edit.onDelete} aria-label={edit.deleteLabel}>
          <Icon name="close" size="sm" />
        </button>
      </div>
    )
  }
  const cls = tone === 'emphasis' ? ' mm-kv__v--em' : tone === 'link' ? ' mm-kv__v--link' : ''
  return (
    <div className="mm-kv">
      <div className="mm-kv__k">{label}</div>
      <div className={`mm-kv__v${cls}`}>{value}</div>
    </div>
  )
}

export function ListRow({
  title,
  sub,
  badge,
  onClick,
  leading,
  plain,
}: {
  title: ReactNode
  sub?: ReactNode
  badge?: ReactNode
  onClick?: () => void
  leading?: ReactNode
  /** 면을 벗긴 줄. 목록이 곧 본문인 자리(부위 목록)에 쓴다 — 카드가 겹쳐 보이지 않는다. */
  plain?: boolean
}) {
  const inner = (
    <>
      {leading}
      <div className="mm-listrow__body">
        <div className="mm-listrow__title">
          {title}
          {badge}
        </div>
        {sub && <div className="mm-listrow__sub">{sub}</div>}
      </div>
      {onClick && <Icon name="chevron_right" size="md" style={{ color: 'var(--mm-fg-muted)' }} />}
    </>
  )
  const cls = `mm-listrow${plain ? ' mm-listrow--plain' : ''}`
  return onClick ? (
    <button className={cls} onClick={onClick}>
      {inner}
    </button>
  ) : (
    <div className={cls}>{inner}</div>
  )
}

/**
 * DESIGN.md 의 `Radio`.
 *
 * 단일 선택이다. 한 곳만 고르는 목록에 쓴다 — `List Row` 로 두면 무엇이 골라져 있는지
 * 화면으로도 스크린 리더로도 알 수 없다. 행 전체가 hit area 다.
 */
export function Radio({
  label,
  selected,
  onSelect,
}: {
  label: ReactNode
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button className="mm-radio" role="radio" aria-checked={selected} onClick={onSelect}>
      <span className={`mm-radio__box${selected ? ' mm-radio__box--on' : ''}`} />
      <span className="mm-radio__label">{label}</span>
    </button>
  )
}

export function SectionHeader({
  title,
  action,
  onAction,
  count,
}: {
  title: string
  action?: string
  onAction?: () => void
  count?: string
}) {
  return (
    <div className="mm-section">
      <h2 className="mm-section__title">{title}</h2>
      {action && (
        <button className="mm-section__action" onClick={onAction}>
          {action}
        </button>
      )}
      {count && <span className="mm-section__count">{count}</span>}
    </div>
  )
}

export function Divider({ style }: { style?: CSSProperties }) {
  return <hr className="mm-divider" style={style} />
}

/* ── Progress ──────────────────────────────────────────────────── */

export function StepProgress({ label, current, total }: { label: string; current: number; total: number }) {
  return (
    <div>
      <div className="mm-steps">
        <span className="mm-steps__label">{label}</span>
        <span className="mm-steps__count">
          {current} / {total}
        </span>
      </div>
      <div className="mm-progress">
        {Array.from({ length: total }, (_, i) => (
          <div key={i} className={`mm-progress__seg${i < current ? ' mm-progress__seg--on' : ''}`} />
        ))}
      </div>
    </div>
  )
}

export function Dots({ current, total }: { current: number; total: number }) {
  return (
    <div className="mm-dots">
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`mm-dots__d${i === current ? ' mm-dots__d--on' : ''}`} />
      ))}
    </div>
  )
}

/* ── Empty State ───────────────────────────────────────────────── */

export function EmptyState({
  icon = 'empty_box',
  title,
  body,
  action,
  onAction,
}: {
  icon?: IconName
  title: string
  body?: string
  action?: string
  onAction?: () => void
}) {
  return (
    <div className="mm-empty">
      <span className="mm-empty__icon">
        <Icon name={icon} />
      </span>
      <div className="mm-empty__text">
        <div className="mm-empty__title">{title}</div>
        {body && <div className="mm-empty__body">{body}</div>}
      </div>
      {action && (
        <button className="mm-empty__action" onClick={onAction}>
          {action}
        </button>
      )}
    </div>
  )
}

/* ── Callout / Notice ──────────────────────────────────────────── */

/**
 * DESIGN.md 의 `Notice`.
 *
 * 갈래는 색과 아이콘만 다르다 — 같은 컴포넌트다. 아이콘이 흰 배지 안에 들어간다.
 */
export function Notice({
  title,
  body,
  tone = 'info',
}: {
  title: string
  body?: string
  /** `brand` 는 채운 면이다. 앞으로 올 일 하나를 색으로 세울 때 쓴다(1j-3 의 예정 단계). */
  tone?: 'info' | 'warning' | 'brand'
}) {
  return (
    <div className={`mm-notice${tone !== 'info' ? ` mm-notice--${tone}` : ''}`}>
      <span className="mm-notice__badge">
        <Icon name={tone === 'warning' ? 'alert_triangle' : 'info'} size="md" />
      </span>
      <div className="mm-notice__body">
        <div className="mm-notice__title">{title}</div>
        {body && <div className="mm-notice__text">{body}</div>}
      </div>
    </div>
  )
}

/** 경고 갈래. 부르는 곳이 많아 이름을 남겨 둔다. */
export function Callout({ title, body }: { title: string; body?: string }) {
  return <Notice title={title} body={body} tone="warning" />
}


/* ── Bottom Sheet ──────────────────────────────────────────────── */

export function BottomSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}) {
  if (!open) return null
  return (
    <>
      <div className="mm-scrim" onClick={onClose} />
      <div className="mm-sheet" role="dialog" aria-modal="true">
        <div className="mm-sheet__handle" />
        {title && <div className="mm-sheet__title">{title}</div>}
        <div className="mm-sheet__body">{children}</div>
      </div>
    </>
  )
}

/* ── Dialog ────────────────────────────────────────────────────── */

export function Dialog({
  open,
  title,
  body,
  confirmText = '확인',
  cancelText = '취소',
  onConfirm,
  onCancel,
  danger,
}: {
  open: boolean
  title: string
  body?: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
  danger?: boolean
}) {
  if (!open) return null
  return (
    <>
      <div className="mm-scrim" onClick={onCancel} />
      <div className="mm-dialog-wrap">
        <div className="mm-dialog" role="dialog" aria-modal="true">
          {/* 위에서부터 원형 아이콘 배지 · 제목 · 본문 · 버튼 둘이다. */}
          <span className={`mm-dialog__badge${danger ? ' mm-dialog__badge--danger' : ''}`}>
            <Icon name={danger ? 'trash' : 'alert_circle'} />
          </span>
          <div className="mm-dialog__copy">
            <div className="mm-dialog__title">{title}</div>
            {body && <div className="mm-dialog__body">{body}</div>}
          </div>
          <div className="mm-dialog__actions">
            <Button variant="outline" size="m" onClick={onCancel}>
              {cancelText}
            </Button>
            <Button variant={danger ? 'danger' : 'primary'} size="m" onClick={onConfirm}>
              {confirmText}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

/* ── Tooltip (누르면 열리는 말풍선) ────────────────────────────── */

/**
 * DESIGN.md 의 `Tooltip`. 트리거와 말풍선이 따로인 컴포넌트를 한 자리에서 묶는다.
 *
 * 말풍선은 흐름 밖에 띄운다 — 같은 자리에서 겹치면 감싸는 상자가 말풍선 높이만큼 커져서
 * 아래 내용이 밀린다. 신상정보 등록의 알러지 단계에서 칩이 내려가던 것이 그 경우다.
 *
 * 트리거 아래에 오른쪽을 맞춰 붙인다. 꼬리가 끝에서 24 지점에 있어서 오른쪽을 맞추면
 * 꼬리가 트리거를 가리킨다. 밖을 누르면 닫힌다 — 열어 둔 채로 쓰는 안내가 아니라 읽고
 * 지우는 짧은 설명이다.
 */
export function InfoTooltip({ text, label }: { text: string; label?: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        className={`mm-tiptrigger${open ? ' mm-tiptrigger--on' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-label={label ?? '설명 보기'}
        aria-expanded={open}
      >
        <span className="mm-tiptrigger__fill">
          <Icon name="info" />
        </span>
      </button>
      {open && (
        <div className="mm-tooltip" style={{ top: 'calc(100% + 2px)', right: 0 }} role="note">
          {text}
        </div>
      )}
    </div>
  )
}

/* ── Loading ───────────────────────────────────────────────────── */

export function Spinner() {
  return <span className="mm-spinner" aria-hidden="true" />
}

export function Loading({ text }: { text?: string }) {
  return (
    <div className="mm-loading">
      <Spinner />
      {text && <span>{text}</span>}
    </div>
  )
}

/* ── Avatar ────────────────────────────────────────────────────── */

export function Avatar({ initial, onClick }: { initial: string; onClick?: () => void }) {
  const el = <span className="mm-avatar">{initial}</span>
  return onClick ? (
    <button onClick={onClick} aria-label="내 정보">
      {el}
    </button>
  ) : (
    el
  )
}

/* ── Segmented Control ─────────────────────────────────────────── */

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="mm-segmented" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={o.value === value}
          className={`mm-segmented__item${o.value === value ? ' mm-segmented__item--on' : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* ── Hospital Card ─────────────────────────────────────────────── */

/** 카드 아래에 놓는 날짜 칩. 지난 진료와 예정된 재방문을 색만으로 나누지 않는다. */
export interface HospitalChip {
  label: string
  tone?: 'past' | 'planned'
}

/**
 * Figma `Hospital Card`(`1129:9195`).
 *
 * `Card` 를 쓰지 않는다 — 그쪽은 여백 20에 한 덩어리인데 이 카드는 위(정보)와 아래(칩)를
 * 구분선으로 나누고 여백도 18/14/18 로 다르다.
 */
export function HospitalCard({
  name,
  address,
  chips,
  onClick,
  selected,
}: {
  name: string
  address?: ReactNode
  chips?: HospitalChip[]
  onClick?: () => void
  selected?: boolean
}) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag className={`mm-hospital${selected ? ' mm-hospital--on' : ''}`} onClick={onClick}>
      <div className="mm-hospital__info">
        <span className="mm-hospital__mark">
          <Icon name="hospital" />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="mm-hospital__name">{name}</div>
          {address && <div className="mm-hospital__addr">{address}</div>}
        </div>
      </div>
      {chips && chips.length > 0 && (
        <>
          <hr className="mm-hospital__divider" />
          <div className="mm-hospital__chips">
            {chips.map((c) => (
              <span
                key={c.label}
                className={`mm-hospital__chip${c.tone === 'planned' ? ' mm-hospital__chip--planned' : ''}`}
              >
                {c.label}
              </span>
            ))}
          </div>
        </>
      )}
    </Tag>
  )
}

/* ── 묻고 싶은 것 블록 (Figma 1e-1) ────────────────────────────── */

/**
 * DESIGN.md 의 `Severity Readout`. 출력 전용이다 — 고르는 자리는 Severity Slider 다.
 *
 * 단계 숫자, 환자가 고른 낱말, NRS 등가를 함께 보여준다. 색을 지워도 단계를 알 수
 * 있어야 한다.
 */
export function SeverityReadout({
  level,
  label,
  nrs,
}: {
  level: number
  label: string
  nrs: string
}) {
  return (
    <div className="mm-sevreadout" aria-label={`${level}단계, ${label}`}>
      <span className="mm-sevreadout__num" style={{ background: `var(--mm-severity-${level})` }}>
        {level}
      </span>
      <span className="mm-sevreadout__label">{label}</span>
      <span className="mm-sevreadout__nrs">{nrs}</span>
    </div>
  )
}

/**
 * 월별 묶음 목록의 한 줄(1j-1 · 1j-4).
 *
 * `List Row` 를 쓰지 않는다. 그 컴포넌트는 메타 한 줄까지인데 이 목록은 메타 아래에
 * 보조 줄이 더 붙는다. 겉모양만 같게 그린다.
 */
export function GroupRow({
  title,
  badge,
  meta,
  detail,
  selected,
  onClick,
}: {
  title: string
  badge?: ReactNode
  meta: string
  detail?: string
  /**
   * 값이 있으면 편집(선택) 모드다. 왼쪽에 체크, 오른쪽 화살표는 뺀다 — 누르면 고르는 것이지
   * 들어가는 것이 아니다. 고른 줄은 1.5 `border/focus` 테두리(1j-1-D2).
   */
  selected?: boolean
  onClick: () => void
}) {
  const selecting = selected !== undefined
  return (
    <button
      className={`mm-grouprow${selecting ? ' mm-grouprow--select' : ''}${selected ? ' mm-grouprow--selected' : ''}`}
      onClick={onClick}
      role={selecting ? 'checkbox' : undefined}
      aria-checked={selecting ? selected : undefined}
    >
      {selecting && (
        <span className={`mm-todo__box mm-grouprow__check${selected ? ' mm-todo__box--on' : ''}`}>
          <Icon name="check" size="sm" />
        </span>
      )}
      <span className="mm-grouprow__body">
        <span className="mm-grouprow__title">
          {title}
          {badge}
        </span>
        <span className="mm-grouprow__meta">{meta}</span>
        {!selecting && detail && <span className="mm-grouprow__meta">{detail}</span>}
      </span>
      {!selecting && <Icon name="chevron_right" size="md" style={{ color: 'var(--mm-fg-muted)' }} />}
    </button>
  )
}

/**
 * DESIGN.md 의 `Quote Block`.
 *
 * AI 가 정리한 값 아래에 원문을 그대로 남긴다. 진료실에서 틀린 내용을 그대로 의사에게
 * 건네지 않으려면 대조할 것이 있어야 한다.
 */
export function QuoteBlock({ label, text }: { label: string; text: string }) {
  return (
    <div className="mm-quote">
      <div className="mm-quote__label">{label}</div>
      <p className="mm-quote__text">{text}</p>
    </div>
  )
}

/** `Callout` 의 `Editing` variant 가 받는 조작. 셋을 한 값으로 묶는다 — 따로 받으면 지우기만 되고 고치지는 못하는 반쪽 편집이 생긴다. */
export interface QuestionEdit {
  placeholder: string
  addLabel: string
  /** 더할 자리가 남았는지. 상한에 닿으면 `질문 추가` 줄을 그리지 않는다. */
  canAdd: boolean
  deleteLabel: (number: number) => string
  onChange: (index: number, value: string) => void
  onDelete: (index: number) => void
  onAdd: () => void
}

export function QuestionBlock({
  title,
  questions,
  edit,
}: {
  title: string
  questions: string[]
  edit?: QuestionEdit
}) {
  return (
    <div className="mm-qblock">
      <div className="mm-qblock__head">
        <Icon name="chat" size="sm" />
        <span className="mm-label-s">{title}</span>
      </div>
      <ol className="mm-qblock__list">
        {questions.map((q, i) => (
          <li className="mm-qblock__item" key={edit ? i : `${q}-${i}`}>
            <span className="mm-qblock__no mm-label-s">{i + 1}</span>
            {edit ? (
              <>
                {/* `Text Field` 를 쓰지 않는다. 면을 채우고 테두리를 두르면 pill 안에 또 하나의
                    필드가 생겨 번호와 글자의 정렬이 어긋난다. 빈 질문에는 안내 문구를 겹쳐 둔다. */}
                <GrowInput
                  className="mm-qblock__input mm-body-m"
                  value={q}
                  placeholder={edit.placeholder}
                  autoFocus={q === '' && i === questions.length - 1}
                  onChange={(v) => edit.onChange(i, v)}
                />
                <button
                  className="mm-iconbtn mm-iconbtn--sm"
                  onClick={() => edit.onDelete(i)}
                  aria-label={edit.deleteLabel(i + 1)}
                >
                  <Icon name="close" size="sm" />
                </button>
              </>
            ) : (
              <span className="mm-qblock__text mm-body-m">{q}</span>
            )}
          </li>
        ))}
      </ol>
      {edit?.canAdd && (
        <button className="mm-addrow" onClick={edit.onAdd}>
          <Icon name="plus" size="sm" />
          {edit.addLabel}
        </button>
      )}
    </div>
  )
}

/* ── 통증 강도 슬라이더 (Figma 1d) ─────────────────────────────── */

/**
 * 5단계 서열척도. 정지점을 누르거나 손잡이를 끌어 고른다.
 *
 * 시안이 슬라이더다. 값이 다섯뿐이라 연속 슬라이더가 아니라 **정지점이 있는** 형태로
 * 두고, 스크린리더에는 숫자가 아니라 "3단계, 꽤 아파요"로 읽히게 한다.
 */
/**
 * DESIGN.md 의 `Severity Slider`.
 *
 * **판독 카드를 안에 그린다.** 화면이 따로 얹으면 같은 수치가 두 곳에 나온다. 단계를
 * 색만으로 전달하지 않으려고 숫자·낱말·상황 설명을 함께 둔다.
 */
export function SeveritySlider({
  value,
  onChange,
  labels,
  descriptions,
  lowCaption,
  highCaption,
}: {
  value: number | null
  onChange: (v: 1 | 2 | 3 | 4 | 5) => void
  labels: Record<number, string>
  descriptions: Record<number, string>
  lowCaption: string
  highCaption: string
}) {
  const steps = [1, 2, 3, 4, 5] as const
  const pct = (v: number) => ((v - 1) / 4) * 100
  const current = value ?? 1

  const pickFrom = (clientX: number, el: HTMLElement) => {
    const rect = el.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    onChange((Math.round(ratio * 4) + 1) as 1 | 2 | 3 | 4 | 5)
  }

  const shown = value ?? 1

  return (
    <>
      <div className="mm-sev" style={{ background: `var(--mm-severity-${shown}-tint)` }}>
        <span className="mm-sev__num" style={{ background: `var(--mm-severity-${shown})` }}>
          {shown}
        </span>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div className="mm-sev__label">{labels[shown]}</div>
          <div className="mm-body-s" style={{ color: 'var(--mm-fg-subtle)' }}>
            {descriptions[shown]}
          </div>
        </div>
      </div>
      <div
        className="mm-sevslider"
        role="slider"
        aria-valuemin={1}
        aria-valuemax={5}
        aria-valuenow={value ?? undefined}
        aria-valuetext={value ? `${value}단계, ${labels[value]}` : undefined}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight' || e.key === 'ArrowUp') onChange(Math.min(5, current + 1) as 1)
          if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') onChange(Math.max(1, current - 1) as 1)
        }}
      >
        <div className="mm-sevslider__track" />
        {value && (
          <div
            className="mm-sevslider__fill"
            style={{ width: `${pct(value)}%`, background: `var(--mm-severity-${value})` }}
          />
        )}
        {steps.map((s) => (
          <span
            key={s}
            className={`mm-sevslider__stop${value != null && s <= value ? ' mm-sevslider__stop--on' : ''}`}
            style={{ left: `${pct(s)}%` }}
          />
        ))}
        <span className="mm-sevslider__thumb" style={{ left: `${pct(current)}%` }} />
        <button
          className="mm-sevslider__hit"
          aria-label="통증 강도 고르기"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId)
            pickFrom(e.clientX, e.currentTarget)
          }}
          onPointerMove={(e) => {
            if (e.buttons === 1) pickFrom(e.clientX, e.currentTarget)
          }}
        />
      </div>
      <div className="mm-sevscale-caps mm-body-s">
        <span>{lowCaption}</span>
        <span>{highCaption}</span>
      </div>
    </>
  )
}

/* ── Toast ─────────────────────────────────────────────────────── */

/**
 * DESIGN.md 의 `Toast`. 뒤집힌 면에 갈래별 아이콘이 왼쪽에 선다.
 *
 * 되돌릴 수 있는 동작은 여기서 알린다. 확인 대화상자는 되돌릴 수 없는 것만 쓴다.
 */
export function Toast({ message }: { message: string }) {
  return (
    <div className="mm-toast" role="status">
      <Icon name="check_circle" size="md" style={{ color: 'var(--mm-green-100)', flex: '0 0 auto' }} />
      <span style={{ flex: 1, minWidth: 0 }}>{message}</span>
    </div>
  )
}
