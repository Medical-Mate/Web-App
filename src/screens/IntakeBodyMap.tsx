/** 1l 인체도 부위 선택 — 증상 정리 1/4
 *
 * 앱의 기본값(`byMap3d = true`)과 같이 **3D 인체도**를 먼저 쓴다. 같은 `body.glb` 를
 * three.js 로 그리고, 좌표·카메라·판정 규칙도 앱에서 뽑은 값을 그대로 쓴다.
 *
 * WebGL 을 못 쓰는 환경에서는 앱의 비3D 경로와 같은 **이미지 + 좌표 핫스팟**으로
 * 되돌린다(`bodymap_*.webp`). 두 길 모두 같은 부위 온톨로지를 쓴다.
 */
import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Pad, Screen } from '../components/Screen'
import { BottomCta, Button, Chip, Icon, ListRow, Radio, Segmented, StepProgress } from '../components/ui'
import { S, fmt } from '../data/strings'
import {
  BODY_ANCHORS,
  syncBodyMapFromServer,
  BODY_BACK,
  BODY_FRONT,
  choicesForZone,
  isMirrored,
  zoneChoices,
  zoneLabel,
} from '../data/bodyMap'
import type { BodyAnchor, BodySide, BodyView, BodyZone } from '../data/bodyMap'
import { frameOf } from '../data/bodyMap3d'
import { useStore } from '../store/store'
import { supportsWebGl } from '../lib/webgl'
import './bodymap.css'

/* 3D 인체도는 three.js 를 끌고 온다(gzip 약 160KB). 이 화면에 들어올 때만 받는다.
   나머지 화면의 첫 로딩에는 영향이 없다. */
const BodyMap3d = lazy(() => import('../components/BodyMap3d'))

/** map3d: 3D 인체도 · image: 이미지 인체도(비3D 대체) · list: 목록에서 고르기 */
type Mode = 'map3d' | 'image' | 'list'

/** WebGL 여부는 한 번만 본다. 렌더마다 캔버스를 만들 이유가 없다. */
const WEBGL = supportsWebGl()

export function IntakeBodyMapScreen() {
  const navigate = useNavigate()
  const { state, updateIntake, startIntake } = useStore()
  const session = state.intake

  const [view, setView] = useState<BodyView>('FRONT')
  const [mode, setMode] = useState<Mode>(WEBGL ? 'map3d' : 'image')
  const [anchor, setAnchor] = useState<BodyAnchor | null>(null)
  /* 확대에서 빠져나가는 동안 그 판을 마저 그리려고 든다. `anchor` 가 null 이 된 뒤에도
     나가는 층이 그려져야 해서 따로 남긴다. */
  const [lastAnchor, setLastAnchor] = useState<BodyAnchor | null>(null)
  /** 확대의 축. 짚은 점이 없으면(칩·목록으로 들어오면) 가운데다. */
  const [zoomOrigin, setZoomOrigin] = useState<{ x: number; y: number } | null>(null)
  /** 3D 판을 잘못 짚었을 때의 안내. 다음 짚기나 확대가 바뀌면 지운다(`BodyMap3dStep.notice`). */
  const [notice3d, setNotice3d] = useState<string | null>(null)

  /* 제목 아래 설명. 확대 중이면 구역 설명, 3D 판이면 다루는 법이다. 이미지 앵커 모드와 목록에는
     없다 — 원본 `ImagePicker` 가 `if (zooming)` 에서만 설명을 그린다. */
  const description =
    mode === 'list'
      ? null
      : anchor
        ? S.body_map_zone_description
        : mode === 'map3d'
          ? S.body_map_3d_description
          : null
  const [picked, setPicked] = useState<{ anchor: BodyAnchor; zone: BodyZone | null; side: BodySide } | null>(
    null,
  )
  const [query, setQuery] = useState('')

  /* 새로고침 등으로 세션이 없으면 새로 시작한다.
   * 렌더 중에 부르면 StrictMode 에서 두 번 실행되므로 이펙트로 뺀다. */
  useEffect(() => {
    if (!session) startIntake()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

  /* 서버 부위 마스터로 이름·별칭을 맞춘다. 바뀐 것이 있으면 목록과 검색이 새 이름으로 다시 그려진다. */
  const [, setBodyMapVersion] = useState(0)
  useEffect(() => {
    let alive = true
    syncBodyMapFromServer().then((changed) => {
      if (alive && changed) setBodyMapVersion((v) => v + 1)
    })
    return () => {
      alive = false
    }
  }, [])

  const label = picked
    ? picked.zone
      ? zoneLabel(picked.zone, picked.side)
      : picked.anchor.label
    : null

  const goNext = () => {
    if (!picked || !label) return
    updateIntake({
      step: 2,
      bodyPart: {
        anchorId: picked.anchor.id,
        anchorLabel: picked.anchor.label,
        zoneId: picked.zone?.id ?? null,
        label,
      },
      turns: [],
    })
    navigate('/intake/chat')
  }

  /** 전신·피부처럼 세부 구역이 없는 앵커는 한 번에 확정된다. */
  const pickAnchor = (a: BodyAnchor, side: BodySide, point?: { x: number; y: number }) => {
    if (!a.zones.length) {
      setPicked({ anchor: a, zone: null, side: 'CENTER' })
      setAnchor(null)
      return
    }
    setZoomOrigin(point ?? null)
    setLastAnchor(a)
    setAnchor(a)
    setPicked(null)
    // 팔·다리처럼 좌우가 있는 앵커는 짚은 쪽을 기억한다
    setPendingSide(side)
  }
  const [pendingSide, setPendingSide] = useState<BodySide>('CENTER')

  useEffect(() => {
    setNotice3d(null)
  }, [anchor, pendingSide])

  const results = useMemo(() => search(query), [query])

  const isPicked = (a: BodyAnchor, z: BodyZone, side: BodySide) =>
    picked?.anchor.id === a.id && picked.zone?.id === z.id && picked.side === side

  /**
   * 목록의 앵커 줄.
   *
   * 구역이 있는 앵커는 눌러도 골라지지 않고 그 앵커의 구역 목록으로 들어간다. 그 안에서
   * 고른 부위 이름을 줄의 보조 텍스트에 적는다 — 들어가지 않고도 무엇이 골라져 있는지
   * 보여야 하고, 앵커 이름만으로는 "다리"까지만 알 수 있다.
   *
   * 전신·피부는 구역이 없어서 그 줄이 곧 선택이다. 라디오로 두고, 고른 것을 다시 누르면
   * 풀린다 — 한 곳만 고르는 화면이라 잘못 눌렀을 때 되돌릴 길이 있어야 한다.
   */
  const anchorRows = (a: BodyAnchor) => {
    if (!a.zones.length) {
      const on = picked?.anchor.id === a.id && !picked.zone
      return [
        <Radio
          key={a.id}
          label={a.label}
          selected={on}
          onSelect={() => {
            setAnchor(null)
            setPicked(on ? null : { anchor: a, zone: null, side: 'CENTER' })
          }}
        />,
      ]
    }
    const points = a.points.length ? a.points : [{ side: 'CENTER' as BodySide, x: 0, y: 0 }]
    return points.map((p) => {
      /* 좌우 공용 이미지를 쓰는 앵커(팔·다리)는 왼쪽과 오른쪽이 서로 다른 목록이라
         좌우까지 봐야 한다. 나머지 앵커는 한 이미지에 좌우 구역이 함께 있어서 앵커만
         맞으면 된다. */
      const mine = picked?.anchor.id === a.id && (!isMirrored(a) || picked.side === p.side)
      return (
        <ListRow
          key={`${a.id}:${p.side}`}
          title={zoneLabel(a, p.side)}
          sub={mine && label ? fmt(S.body_map_list_picked, label) : undefined}
          /* 검색을 함께 닫는다. 검색어가 남아 있으면 화면이 계속 결과를 그려서
             누른 것이 아무 일도 안 한 것처럼 보인다(`onAnchorFocus`). */
          onClick={() => {
            setAnchor(a)
            setPendingSide(p.side)
            setQuery('')
          }}
        />
      )
    })
  }

  return (
    <Screen
      title={S.intake_title}
      onBack={() => navigate('/home')}
      bottom={
        <BottomCta plain>
          <Button onClick={goNext} disabled={!picked}>
            {S.intake_next}
          </Button>
        </BottomCta>
      }
    >
      <Pad style={{ paddingTop: 8, paddingBottom: 16 }}>
        <StepProgress label={S.intake_progress_label} current={1} total={4} />

        <h2 className="mm-heading-l" style={{ marginTop: 24 }}>
          {mode === 'list'
            ? S.body_map_list_question
            : anchor
              ? fmt(S.body_map_zone_question, anchor.label)
              : S.intake_body_part_question}
        </h2>
        {description && (
          <p className="mm-body-m mm-bodymap__desc">{description}</p>
        )}

        {mode === 'map3d' ? (
          <>
            {/* 앱 `AnchorActions`: 앞·뒤 세그먼트가 카메라를 그 면으로 돌리고, 끌어서 돌리면
                세그먼트가 따라온다. 확대 중에는 없다. */}
            {!anchor && (
              <div style={{ marginTop: 20 }}>
                <Segmented
                  value={view}
                  onChange={(v) => setView(v)}
                  options={[
                    { value: 'FRONT', label: S.body_map_view_front },
                    { value: 'BACK', label: S.body_map_view_back },
                  ]}
                />
              </div>
            )}
            {anchor ? (
              /* 확대 중에는 다른 부위로 나가는 Outline M 버튼만 있다. 목록으로 가는 길과 앞·뒤
                 전환은 전신을 보는 동안의 일이다(`ImagePicker` · `ZoneActions`). 확대를 닫는
                 것과 고른 것을 버리는 것은 다른 일이라 고른 것은 남긴다(`onFocusClear`). */
              <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                <Button variant="outline" size="m" style={{ flex: 1 }} onClick={() => setAnchor(null)}>
                  {S.body_map_other_anchor}
                </Button>
                {/* 팔·다리처럼 한쪽만 담는 앵커는 반대쪽으로 넘어가는 길이 있다(`oneSide`). */}
                {frameOf(anchor.id)?.oneSide && (
                  <Button
                    variant="outline"
                    size="m"
                    style={{ flex: 1 }}
                    onClick={() => setPendingSide((side) => (side === 'LEFT' ? 'RIGHT' : 'LEFT'))}
                  >
                    {S.body_map_3d_flip_side}
                  </Button>
                )}
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  marginTop: 20,
                }}
              >
                <div style={{ display: 'flex', gap: 8 }}>
                  {BODY_ANCHORS.filter((a) => !a.view).map((a) => (
                    <Chip
                      key={a.id}
                      size="sm"
                      selected={picked?.anchor.id === a.id}
                      onClick={() => pickAnchor(a, 'CENTER')}
                    >
                      {a.label}
                    </Chip>
                  ))}
                </div>
                <button className="mm-section__action" onClick={() => setMode('list')}>
                  {S.body_map_use_list}
                </button>
              </div>
            )}

            <div className="mm-bodymap-frame" style={{ height: 380 }}>
              <Suspense
                fallback={
                  <div className="mm-body3d__loading">
                    <span className="mm-spinner" />
                    <span>인체도를 불러오는 중이에요</span>
                  </div>
                }
              >
                <BodyMap3d
                view={view}
                onViewChange={setView}
                focusAnchorId={anchor?.id ?? null}
                focusSide={pendingSide}
                selectedZoneId={picked?.zone?.id ?? picked?.anchor.id ?? null}
                selectedSide={picked?.side ?? null}
                onMiss={(reason) =>
                  setNotice3d(reason === 'off' ? S.body_map_3d_off_body : S.body_map_3d_too_far)
                }
                onPickAnchor={(anchorId, side) => {
                  setNotice3d(null)
                  const a = BODY_ANCHORS.find((x) => x.id === anchorId)
                  if (a) pickAnchor(a, side)
                }}
                onPickZone={(zoneId, side) => {
                  setNotice3d(null)
                  if (!anchor) return
                  const z = anchor.zones.find((x) => x.id === zoneId)
                  if (z) setPicked({ anchor, zone: z, side })
                  }}
                />
              </Suspense>
              {label && <span className="mm-bodymap__caption">{label}</span>}
              {picked && (
                <button
                  className="mm-iconbtn mm-iconbtn--m mm-iconbtn--tonal mm-bodymap__reset"
                  aria-label={S.body_map_3d_reset}
                  onClick={() => setPicked(null)}
                >
                  <Icon name="close" size="md" />
                </button>
              )}
            </div>
            {notice3d && (
              <p className="mm-body-m" style={{ color: 'var(--mm-fg-subtle)', marginTop: 14 }}>
                {notice3d}
              </p>
            )}
            <p className="mm-body-s mm-bodymap__guide">{S.body_map_3d_description}</p>
          </>
        ) : mode === 'image' ? (
          <>
            {!anchor && (
              <div style={{ marginTop: 20 }}>
                <Segmented
                  value={view}
                  onChange={(v) => setView(v)}
                  options={[
                    { value: 'FRONT', label: S.body_map_view_front },
                    { value: 'BACK', label: S.body_map_view_back },
                  ]}
                />
              </div>
            )}

            {anchor ? (
              /* 확대 중에는 다른 부위로 나가는 Outline M 버튼만 있다. 목록으로 가는 길과 앞·뒤
                 전환은 전신을 보는 동안의 일이다(`ImagePicker` · `ZoneActions`). 확대를 닫는
                 것과 고른 것을 버리는 것은 다른 일이라 고른 것은 남긴다(`onFocusClear`). */
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <Button variant="outline" size="m" style={{ flex: 1 }} onClick={() => setAnchor(null)}>
                  {S.body_map_other_anchor}
                </Button>
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  marginTop: 14,
                }}
              >
                <div style={{ display: 'flex', gap: 8 }}>
                  {BODY_ANCHORS.filter((a) => !a.view).map((a) => (
                    <Chip
                      key={a.id}
                      size="sm"
                      selected={picked?.anchor.id === a.id}
                      onClick={() => pickAnchor(a, 'CENTER')}
                    >
                      {a.label}
                    </Chip>
                  ))}
                </div>
                <button className="mm-section__action" onClick={() => setMode('list')}>
                  {S.body_map_use_list}
                </button>
              </div>
            )}

            <BodyMapCardTransition screen={anchor ? 'ZONE' : 'ANCHOR'} origin={zoomOrigin}>
              {(layer) => {
                const board = layer === 'ZONE' ? (anchor ?? lastAnchor) : null
                return board ? (
                  <ZonePicker
                    anchor={board}
                    side={pendingSide}
                    caption={
                      picked && picked.anchor.id === board.id && (!isMirrored(board) || picked.side === pendingSide)
                        ? label
                        : null
                    }
                    pickedZoneId={picked?.zone?.id ?? null}
                    pickedSide={picked?.side ?? null}
                    onPick={(zone, side) => setPicked({ anchor: board, zone, side })}
                  />
                ) : (
                  <AnchorPicker view={view} pickedId={picked?.anchor.id ?? null} caption={label} onPick={pickAnchor} />
                )
              }}
            </BodyMapCardTransition>
          </>
        ) : (
          /* 목록에서 고르기. `BodyMapPartList` 를 옮겼다.
           *
           * 인체도는 이미지 위의 좌표를 짚는 조작이라 스크린 리더로는 쓸 수 없다. 확대해도
           * 손이 떨리면 짚기 어렵고, 그림이 벗은 몸이라 사람 앞에서 열기 부담스러울 수도
           * 있다. 어느 이유든 같은 부위를 고를 수 있어야 한다.
           *
           * 목록도 인체도와 같은 두 단계다. 25개 구역을 좌우까지 펼치면 44줄이 되고, 그
           * 안에서 찾는 것이 그림에서 짚는 것보다 어렵다.
           */
          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* 모드 전환은 두 화면에서 같은 동작이라 같은 무게로 둔다. 인체도 쪽이 칩 줄
                오른쪽의 Ghost S 라 여기만 전체 폭 버튼이면 같은 일이 다르게 보인다. */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="ghost"
                size="s"
                onClick={() => {
                  setQuery('')
                  setMode(WEBGL ? 'map3d' : 'image')
                }}
              >
                {S.body_map_use_image}
              </Button>
            </div>

            <div className="mm-search">
              <span className="mm-search__icon">
                <Icon name="search" size="md" />
              </span>
              <input
                className="mm-search__input"
                placeholder={S.body_map_search_placeholder}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button
                  className="mm-iconbtn mm-iconbtn--sm"
                  onClick={() => setQuery('')}
                  aria-label={S.body_map_search_clear}
                >
                  <Icon name="close" size="md" style={{ color: 'var(--mm-fg-muted)' }} />
                </button>
              )}
            </div>

            {query ? (
              results.length === 0 ? (
                /* 검색어가 부위 이름이 아닐 때다("감기"). 그때만 안내를 둔다. */
                <p className="mm-body-m" style={{ color: 'var(--mm-fg-subtle)' }}>
                  {S.body_map_search_empty}
                </p>
              ) : (
                /* 줄의 모양은 목록과 같다. 구역은 고르는 줄이고 앵커는 들어가는 줄이다.
                   검색이 하는 일은 찾는 것까지이고, 고르는 방식까지 바꾸면 두 길이 다르게
                   동작한다. */
                <div className="mm-partlist">
                  {results.flatMap((hit) =>
                    hit.zone
                      ? choicesForZone(hit.anchor, hit.zone).map((c) => (
                          <Radio
                            key={`${hit.anchor.id}:${c.zone.id}:${c.side}`}
                            label={zoneLabel(c.zone, c.side)}
                            selected={isPicked(hit.anchor, c.zone, c.side)}
                            onSelect={() => setPicked({ anchor: hit.anchor, zone: c.zone, side: c.side })}
                          />
                        ))
                      : anchorRows(hit.anchor),
                  )}
                </div>
              )
            ) : anchor ? (
              /* 고른 앵커의 구역들. 좌우가 갈리는 구역은 두 줄이다.
                 원본은 여기 구역 머리에 앵커 이름을 두는데, 웹앱은 화면 제목이 이미
                 "○○ 어디가 아프세요?" 라 같은 말을 두 번 적지 않는다. */
              <>
                <div className="mm-partlist">
                  {zoneChoices(anchor, pendingSide).map((c) => (
                    <Radio
                      key={`${c.zone.id}:${c.side}`}
                      label={zoneLabel(c.zone, c.side)}
                      selected={isPicked(anchor, c.zone, c.side)}
                      onSelect={() => setPicked({ anchor, zone: c.zone, side: c.side })}
                    />
                  ))}
                </div>
                <Button variant="outline" size="m" onClick={() => setAnchor(null)}>
                  {S.body_map_other_anchor}
                </Button>
              </>
            ) : (
              <div className="mm-partlist">{BODY_ANCHORS.flatMap((a) => anchorRows(a))}</div>
            )}
          </div>
        )}
      </Pad>
    </Screen>
  )
}

/* ── 전신에서 앵커 고르기 ──────────────────────────────────────── */

type BodyMapLayer = 'ANCHOR' | 'ZONE'

/** 확대가 도는 시간. 원본 `BodyMapTransition` 의 240 이다. */
const ZOOM_DURATION = 240

/**
 * 앵커에서 구역으로 넘어갈 때의 확대. 원본 `BodyMapCardTransition`.
 *
 * 전신 이미지와 확대 이미지는 서로 다른 파일이라 하나에서 다른 하나로 이어 확대할 수 없다.
 * 대신 **짚은 점을 축으로 전신을 밀어내고** 확대 이미지를 조금 큰 상태에서 제자리로
 * 들여보낸다. 카메라가 그 점으로 들어가는 것처럼 읽힌다.
 *
 * 두 층을 함께 그린다. 나가는 층이 띄워져 있어서 판 높이는 들어오는 층을 따라 즉시 바뀐다 —
 * 부위마다 판 높이가 달라서 높이까지 움직이면 아래 여백이 늘었다 줄어든다.
 */
function BodyMapCardTransition({
  screen,
  origin,
  children,
}: {
  screen: BodyMapLayer
  origin: { x: number; y: number } | null
  children: (layer: BodyMapLayer) => ReactNode
}) {
  const [phase, setPhase] = useState<{ screen: BodyMapLayer; leaving: BodyMapLayer | null }>({
    screen,
    leaving: null,
  })

  /* 어느 쪽으로 도는지는 그리는 중에 정한다. 이펙트로 미루면 새 판이 제자리에 한 번 그려진
     뒤에 커졌다가 돌아온다. */
  if (phase.screen !== screen) setPhase({ screen, leaving: phase.screen })

  useEffect(() => {
    if (!phase.leaving) return
    const timer = setTimeout(() => setPhase((p) => ({ ...p, leaving: null })), ZOOM_DURATION)
    return () => clearTimeout(timer)
  }, [phase])

  const zoomingIn = phase.leaving === 'ANCHOR'
  const style = origin
    ? ({ '--mm-zoom-origin': `${origin.x * 100}% ${origin.y * 100}%` } as CSSProperties)
    : undefined

  return (
    <div className="mm-bodyzoom" style={style}>
      {phase.leaving && (
        <div
          className={`mm-bodyzoom__layer mm-bodyzoom__layer--out mm-bodyzoom__layer--${
            zoomingIn ? 'body-exit' : 'detail-exit'
          }`}
          aria-hidden
        >
          {children(phase.leaving)}
        </div>
      )}
      <div
        className={
          phase.leaving
            ? `mm-bodyzoom__layer mm-bodyzoom__layer--in mm-bodyzoom__layer--${
                zoomingIn ? 'detail-enter' : 'body-enter'
              }`
            : 'mm-bodyzoom__layer'
        }
      >
        {children(screen)}
      </div>
    </div>
  )
}

/**
 * 좌우 안내. 원본 `OrientationLabel`.
 *
 * 앞면은 화면 왼쪽이 본인의 오른쪽이라 반대로 읽힌다. 그 혼동을 막는 것이 이 라벨의 유일한
 * 목적이다 — 뒷면은 방향이 같아서, 좌우가 갈린 확대 판은 한쪽만 담아서 붙이지 않는다.
 * 점마다 이름에 왼쪽·오른쪽이 들어 있어 스크린 리더에는 읽히지 않게 한다.
 */
function OrientationLabels() {
  return (
    <>
      <span className="mm-bodymap__orient mm-bodymap__orient--start" aria-hidden>
        {S.body_map_orientation_right}
      </span>
      <span className="mm-bodymap__orient mm-bodymap__orient--end" aria-hidden>
        {S.body_map_orientation_left}
      </span>
    </>
  )
}

function AnchorPicker({
  view,
  pickedId,
  caption,
  onPick,
}: {
  view: BodyView
  pickedId: string | null
  caption: string | null
  onPick: (a: BodyAnchor, side: BodySide, point?: { x: number; y: number }) => void
}) {
  const image = view === 'FRONT' ? BODY_FRONT : BODY_BACK
  const anchors = BODY_ANCHORS.filter((a) => a.view === view)

  return (
    <div className="mm-bodymap-frame" style={{ height: 380 }}>
      {view === 'FRONT' && <OrientationLabels />}
      {caption && <span className="mm-bodymap__caption">{caption}</span>}
      <div className="mm-bodymap" style={{ aspectRatio: `${image.w} / ${image.h}` }}>
      <img src={image.src} alt="" draggable={false} />
      {anchors.map((a) =>
        a.points.map((p, i) => (
          <button
            key={`${a.id}-${i}`}
            className={`mm-bodydot${pickedId === a.id ? ' mm-bodydot--on' : ''}`}
            style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
            /* 짚은 점이 확대의 축이 된다. */
            onClick={() => onPick(a, p.side, p)}
            aria-label={a.label}
          />
        )),
      )}
      </div>
    </div>
  )
}

/* ── 세부 구역 고르기 ──────────────────────────────────────────── */

function ZonePicker({
  anchor,
  pickedZoneId,
  pickedSide,
  caption,
  onPick,
}: {
  anchor: BodyAnchor
  side: BodySide
  /** 이 판에 속한 선택일 때만 온다(앱 `belongsTo`). 다른 앵커의 선택은 여기 적지 않는다. */
  caption: string | null
  pickedZoneId: string | null
  pickedSide: BodySide | null
  onPick: (zone: BodyZone, side: BodySide) => void
}) {
  if (!anchor.detailImage) return null
  return (
    <div className="mm-bodymap-frame" style={{ height: 300 }}>
      {anchor.view === 'FRONT' && !isMirrored(anchor) && <OrientationLabels />}
      {caption && <span className="mm-bodymap__caption">{caption}</span>}
      <div className="mm-bodymap" style={{ aspectRatio: anchor.detailRatio ?? 1 }}>
      <img src={anchor.detailImage} alt="" draggable={false} />
      {anchor.zones.map((z) =>
        z.points.map((p, i) => (
          <button
            key={`${z.id}-${i}`}
            className={`mm-bodydot${pickedZoneId === z.id && pickedSide === p.side ? ' mm-bodydot--on' : ''}`}
            style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
            onClick={() => onPick(z, p.side)}
            aria-label={zoneLabel(z, p.side)}
          />
        )),
      )}
      </div>
    </div>
  )
}

/* ── 부위 검색 ─────────────────────────────────────────────────── */

interface Hit {
  anchor: BodyAnchor
  zone: BodyZone | null
}

function flatten(): Hit[] {
  const out: Hit[] = []
  BODY_ANCHORS.forEach((a) => {
    /* 앵커 이름도 찾는다. "팔"을 쳤을 때 팔 목록으로 들어가는 줄이 나와야 한다. */
    out.push({ anchor: a, zone: null })
    a.zones.forEach((z) => out.push({ anchor: a, zone: z }))
  })
  return out
}

/** 원본 `BodyPartSearch` — 검색어는 300자까지 보고, 결과는 8개까지 낸다. */
const QUERY_MAX_LENGTH = 300
const RESULT_LIMIT = 8

/** 이름과 별칭을 함께 본다. 별칭은 화면에 드러나지 않고 검색에서만 쓴다. */
function search(query: string): Hit[] {
  const q = query.slice(0, QUERY_MAX_LENGTH).replace(/\s+/g, '')
  if (!q) return []
  const match = (label: string, aliases: string[]) => {
    const target = [label, ...aliases].map((s) => s.replace(/\s+/g, ''))
    return target.some((t) => t.includes(q) || q.includes(t))
  }
  return flatten()
    .filter((h) => (h.zone ? match(h.zone.label, h.zone.aliases) : match(h.anchor.label, h.anchor.aliases)))
    .slice(0, RESULT_LIMIT)
}
