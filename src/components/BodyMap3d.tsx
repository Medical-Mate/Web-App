/** 3D 인체도
 *
 * 안드로이드는 Filament 로 `assets/body3d/body.glb` 를 그린다. 웹에서는 three.js 로
 * **같은 glb 파일**을 그린다. 좌표·카메라 규격·판정 규칙도 앱과 같은 값을 쓴다
 * (`data/bodyMap3d.ts` — BodyMap3dGeometry.kt / BodyMap3dCamera.kt 에서 뽑았다).
 *
 * 앱과 맞춘 것
 *   - 카메라: yaw·pitch·distance 로 도는 궤도 카메라. FOV 28°, 홈 거리 2.3
 *   - 조작: 끌어서 돌리고, 휠·오므려서 확대(0.45 ~ 2.6)
 *   - 판정: 화면을 짚으면 메시에 반직선을 쏘고, 닿은 자리에서 가장 가까운 구역 점을 고른다.
 *           신장의 10%를 넘으면 채택하지 않는다.
 *   - 카메라를 등진 점은 감춘다(법선 · 시선 < -0.12)
 *
 * WebGL 을 못 쓰는 환경이면 이 컴포넌트를 올리지 않고 이미지 인체도로 되돌린다.
 * 판단은 부모(IntakeBodyMapScreen)가 한다.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import bodyGlbUrl from '../assets/body3d/body.glb?url'
import {
  BODY3D_ANCHORS,
  BODY3D_ZONES,
  DOT_IDLE,
  DOT_ON,
  FACING_LIMIT,
  FOV_DEGREES,
  GLIDE_MS,
  HOME_DISTANCE,
  HOME_TARGET,
  MAX_DISTANCE,
  MIN_DISTANCE,
  PICK_MAX_DISTANCE,
  PITCH_LIMIT,
  frameOf,
} from '../data/bodyMap3d'
import type { Body3dPoint } from '../data/bodyMap3d'
import type { BodySide, BodyView } from '../data/bodyMap'

/**
 * 부위 점 텍스처. 스프라이트에 맵을 주지 않으면 사각형이 그려진다.
 *
 * 앱의 마커와 같은 모양이다 — 짙은 원에 흰 테. 흰 테가 있어야 몸 위에서 점이 읽힌다.
 * 색마다 한 장씩 미리 굽는다. `material.color` 로 물들이면 테까지 함께 물든다.
 */
function makeDotTexture(fill: string): THREE.Texture {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const c = size / 2

  ctx.beginPath()
  ctx.arc(c, c, size * 0.42, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,255,255,0.92)'
  ctx.fill()

  ctx.beginPath()
  ctx.arc(c, c, size * 0.3, 0, Math.PI * 2)
  ctx.fillStyle = fill
  ctx.fill()

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

interface Camera {
  yaw: number
  pitch: number
  distance: number
  target: THREE.Vector3
}

function eyeOf(c: Camera): THREE.Vector3 {
  return new THREE.Vector3(
    c.distance * Math.sin(c.yaw) * Math.cos(c.pitch),
    c.distance * Math.sin(c.pitch),
    c.distance * Math.cos(c.yaw) * Math.cos(c.pitch),
  ).add(c.target)
}

/** 목표 각으로 갈 때 지금 각에서 가장 가까운 한 바퀴를 고른다. */
function yawNear(current: number, angle: number): number {
  const turns = Math.round((current - angle) / (2 * Math.PI))
  return angle + turns * 2 * Math.PI
}

export interface Body3dSelection {
  anchorId: string
  zoneId: string
  side: BodySide
}

export function BodyMap3d({
  /** null 이면 전신에서 앵커를 고르는 중, 값이 있으면 그 앵커를 확대해 구역을 고르는 중 */
  focusAnchorId,
  focusSide,
  selectedZoneId,
  selectedSide,
  onPickAnchor,
  onPickZone,
  onMiss,
  view,
  onViewChange,
  onReady,
}: {
  focusAnchorId: string | null
  focusSide: BodySide
  selectedZoneId: string | null
  selectedSide: BodySide | null
  onPickAnchor: (anchorId: string, side: BodySide) => void
  /** 몸 바깥을 짚었거나(`off`) 어느 점과도 멀어 가늠할 수 없을 때(`far`). 앱의 `noticeOf`. */
  onMiss?: (reason: 'off' | 'far') => void
  onPickZone: (zoneId: string, side: BodySide) => void
  /**
   * 앞·뒤 세그먼트가 고른 면. 바뀌면 카메라가 그 면으로 돈다(앱 `camera.glideTo(facing(view))`).
   * 확대 중에는 무시한다 — 그때의 방향은 앵커 프레임이 정한다.
   */
  view?: BodyView
  /** 카메라가 보는 면이 바뀌었을 때. 끌어서 돌려도 세그먼트가 따라온다(앱 `camera.value.view()`). */
  onViewChange?: (view: BodyView) => void
  onReady?: () => void
}) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  /* three.js 객체는 리렌더와 무관하게 살아 있어야 해서 ref 에 둔다 */
  const sceneRef = useRef<{
    renderer: THREE.WebGLRenderer
    scene: THREE.Scene
    camera: THREE.PerspectiveCamera
    mesh: THREE.Mesh | null
    markers: THREE.Group
    dotIdle: THREE.Texture
    dotOn: THREE.Texture
    cam: Camera
    glide: { from: Camera; to: Camera; start: number } | null
    /** 다음 프레임에 다시 그려야 하는지. 카메라 · 마커 · 크기 · 모델이 바뀔 때 세운다. */
    dirty: boolean
  } | null>(null)

  /* 콜백은 매 렌더 바뀌므로 ref 로 최신 것을 본다 */
  const handlers = useRef({ onPickAnchor, onPickZone, onMiss, onViewChange })
  handlers.current = { onPickAnchor, onPickZone, onMiss, onViewChange }
  /** 마지막으로 알린 면. 매 프레임 같은 값을 다시 알리지 않는다. */
  const reportedView = useRef<BodyView | null>(null)
  const focus = useRef({ focusAnchorId, focusSide, selectedZoneId, selectedSide })
  focus.current = { focusAnchorId, focusSide, selectedZoneId, selectedSide }

  /* ── 씬 만들기 (한 번) ─────────────────────────────────────── */
  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    let disposed = false
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(FOV_DEGREES, 1, 0.01, 10)

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    } catch {
      setFailed(true)
      return
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    host.appendChild(renderer.domElement)
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'
    renderer.domElement.style.display = 'block'
    renderer.domElement.style.touchAction = 'none'

    /* 앱의 무광 회색 인체. 색을 덧입히지 않고 재질로 만든다. */
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0xd7d9e2,
      roughness: 0.82,
      metalness: 0.02,
    })

    scene.add(new THREE.HemisphereLight(0xffffff, 0xb8bcc9, 1.15))
    const key = new THREE.DirectionalLight(0xffffff, 1.35)
    key.position.set(0.6, 1.2, 1.4)
    scene.add(key)
    const fill = new THREE.DirectionalLight(0xffffff, 0.5)
    fill.position.set(-1.0, 0.4, 0.8)
    scene.add(fill)

    const markers = new THREE.Group()
    scene.add(markers)

    const dotIdle = makeDotTexture('#131722')
    const dotOn = makeDotTexture('#5566d2')

    const state = {
      renderer,
      scene,
      camera,
      mesh: null as THREE.Mesh | null,
      markers,
      dotIdle,
      dotOn,
      cam: {
        yaw: 0,
        pitch: 0,
        distance: HOME_DISTANCE,
        target: new THREE.Vector3(HOME_TARGET.x, HOME_TARGET.y, HOME_TARGET.z),
      } as Camera,
      glide: null as { from: Camera; to: Camera; start: number } | null,
      dirty: true,
    }
    sceneRef.current = state

    /* ── 모델 읽기 ─────────────────────────────────────────── */
    const draco = new DRACOLoader()
    // 디코더는 public/draco 에 있다. BASE_URL 을 붙여야 하위 경로 배포에서도 찾는다.
    draco.setDecoderPath(`${import.meta.env.BASE_URL}draco/`)
    const loader = new GLTFLoader()
    loader.setDRACOLoader(draco)

    loader.load(
      bodyGlbUrl,
      (gltf) => {
        if (disposed) return
        gltf.scene.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh
            mesh.material = bodyMaterial
            state.mesh = mesh
          }
        })
        scene.add(gltf.scene)
        state.dirty = true
        setLoading(false)
        onReady?.()
      },
      undefined,
      () => {
        if (!disposed) setFailed(true)
      },
    )

    /* ── 크기 맞추기 ───────────────────────────────────────── */
    const resize = () => {
      const w = host.clientWidth
      const h = host.clientHeight
      if (!w || !h) return
      renderer.setSize(w, h, false)
      state.dirty = true
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(host)

    /* ── 매 프레임 ─────────────────────────────────────────── */
    let raf = 0
    const tick = () => {
      raf = requestAnimationFrame(tick)

      // 확대해 들어가는 활강
      if (state.glide) {
        const t = Math.min(1, (performance.now() - state.glide.start) / GLIDE_MS)
        // ease-out cubic — 앱의 감속과 비슷하게
        const e = 1 - Math.pow(1 - t, 3)
        const { from, to } = state.glide
        state.cam = {
          yaw: from.yaw + (to.yaw - from.yaw) * e,
          pitch: from.pitch + (to.pitch - from.pitch) * e,
          distance: from.distance + (to.distance - from.distance) * e,
          target: from.target.clone().lerp(to.target, e),
        }
        if (t >= 1) state.glide = null
      }

      /* **바뀐 것이 없으면 그리지 않는다.** 화면에 머무는 동안 매 프레임 GPU 를 돌리면 약한 기기가
         느려지고 배터리가 준다. 활강 중이거나 누가 `dirty` 를 세웠을 때만 그린다. */
      if (!state.dirty && !state.glide) return
      state.dirty = false

      const eye = eyeOf(state.cam)
      camera.position.copy(eye)
      camera.lookAt(state.cam.target)

      // 보는 면. yaw 0 이 앞면, π 가 뒷면이다(앱 `BodyMap3dCamera.view()`).
      const facingNow: BodyView = Math.cos(state.cam.yaw) >= 0 ? 'FRONT' : 'BACK'
      if (facingNow !== reportedView.current) {
        reportedView.current = facingNow
        handlers.current.onViewChange?.(facingNow)
      }

      // 마커 갱신
      syncMarkers(state, eye)

      renderer.render(scene, camera)
    }
    tick()

    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      observer.disconnect()
      draco.dispose()
      /* GPU 쪽도 비운다. 모델 지오메트리 · 마커 스프라이트 · 렌더 목록. `renderer.dispose()` 는
         자원 캐시만 비우고 지오메트리는 그대로 두므로 하나씩 부른다. */
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh
        if (mesh.geometry) mesh.geometry.dispose()
        const mat = (obj as THREE.Sprite).material as THREE.Material | undefined
        if (mat && mat !== bodyMaterial) mat.dispose()
      })
      scene.clear()
      renderer.renderLists.dispose()
      renderer.dispose()
      /* **컨텍스트를 바로 잃게 한다.** 브라우저는 활성 WebGL 컨텍스트를 16개 안팎만 두고, 넘치면
         가장 오래된 것을 강제로 잃게 하면서 경고를 낸다. `dispose()` 만으로는 컨텍스트가 GC 될 때까지
         살아 있어서, 이 화면을 여러 번 오가면 컨텍스트가 쌓여 전체가 느려지다 멈춘다. */
      renderer.forceContextLoss()
      bodyMaterial.dispose()
      dotIdle.dispose()
      dotOn.dispose()
      if (renderer.domElement.parentElement === host) host.removeChild(renderer.domElement)
      sceneRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ── 지금 보여줄 점들 ─────────────────────────────────────── */
  const visiblePoints = useCallback((): Body3dPoint[] => {
    const f = focus.current
    if (!f.focusAnchorId) return BODY3D_ANCHORS
    return BODY3D_ZONES.filter((p) => p.anchorId === f.focusAnchorId)
  }, [])

  /** 마커 스프라이트를 상태에 맞춰 다시 만든다. */
  const syncMarkers = (
    state: NonNullable<typeof sceneRef.current>,
    eye: THREE.Vector3,
  ) => {
    const points = visiblePoints()
    const f = focus.current

    // 개수가 다르면 다시 만든다
    if (state.markers.children.length !== points.length) {
      state.markers.clear()
      points.forEach(() => {
        const sprite = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: state.dotIdle,
            sizeAttenuation: false,
            depthTest: false,
            transparent: true,
          }),
        )
        sprite.scale.set(DOT_IDLE, DOT_IDLE, 1)
        state.markers.add(sprite)
      })
    }

    points.forEach((p, i) => {
      const sprite = state.markers.children[i] as THREE.Sprite
      // 표면에서 살짝 띄운다. 파묻히면 몸에 가려 안 보인다.
      sprite.position.set(p.x + p.nx * 0.008, p.y + p.ny * 0.008, p.z + p.nz * 0.008)

      // 카메라를 등진 점은 감춘다
      const toEye = eye.clone().sub(new THREE.Vector3(p.x, p.y, p.z)).normalize()
      const facing = toEye.dot(new THREE.Vector3(p.nx, p.ny, p.nz))
      sprite.visible = facing > FACING_LIMIT

      const on = f.focusAnchorId
        ? p.zoneId === f.selectedZoneId && p.side === f.selectedSide
        : p.anchorId === f.selectedZoneId
      const mat = sprite.material as THREE.SpriteMaterial
      const wanted = on ? state.dotOn : state.dotIdle
      if (mat.map !== wanted) {
        mat.map = wanted
        mat.needsUpdate = true
      }
      const size = on ? DOT_ON : DOT_IDLE
      sprite.scale.set(size, size, 1)
    })
  }

  /* 짚은 점 · 확대 대상이 바뀌면 마커를 다시 그려야 한다. */
  useEffect(() => {
    const state = sceneRef.current
    if (state) state.dirty = true
  }, [focusAnchorId, focusSide, selectedZoneId, selectedSide])

  /* ── 확대·복귀 ─────────────────────────────────────────────── */
  useEffect(() => {
    const state = sceneRef.current
    if (!state) return

    const from = { ...state.cam, target: state.cam.target.clone() }
    let to: Camera

    if (focusAnchorId) {
      const frame = frameOf(focusAnchorId)
      if (!frame) return
      const flip = frame.oneSide && focusSide === 'LEFT' ? -1 : 1
      // 보는 깊이를 절반만 쓴다. 구역 점이 표면 위라 그대로 보면 카메라가 몸에 붙는다.
      const target = new THREE.Vector3(frame.target.x * flip, frame.target.y, frame.target.z * 0.5)
      // span 이 화면에 꽉 차도록 거리를 잡는다
      const half = Math.tan((FOV_DEGREES / 2) * (Math.PI / 180))
      const distance = Math.min(
        MAX_DISTANCE,
        Math.max(MIN_DISTANCE, (frame.span * 0.75) / half),
      )
      to = {
        yaw: yawNear(state.cam.yaw, frame.back ? Math.PI : 0),
        pitch: 0,
        distance,
        target,
      }
    } else {
      to = {
        yaw: yawNear(state.cam.yaw, Math.cos(state.cam.yaw) >= 0 ? 0 : Math.PI),
        pitch: 0,
        distance: HOME_DISTANCE,
        target: new THREE.Vector3(HOME_TARGET.x, HOME_TARGET.y, HOME_TARGET.z),
      }
    }

    state.glide = { from, to, start: performance.now() }
  }, [focusAnchorId, focusSide])

  /* ── 앞·뒤 전환 ─────────────────────────────────────────────
   * 확대 중이 아닐 때만. 이미 그 면을 보고 있으면(끌어서 돌린 뒤 세그먼트가 따라온 경우) 가만히 둔다.
   */
  useEffect(() => {
    const state = sceneRef.current
    if (!state || !view || focusAnchorId) return
    const current: BodyView = Math.cos(state.cam.yaw) >= 0 ? 'FRONT' : 'BACK'
    if (current === view) return
    const from = { ...state.cam, target: state.cam.target.clone() }
    state.glide = {
      from,
      to: { ...from, yaw: yawNear(state.cam.yaw, view === 'BACK' ? Math.PI : 0), pitch: 0 },
      start: performance.now(),
    }
  }, [view, focusAnchorId])

  /* ── 조작 ──────────────────────────────────────────────────── */
  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    let dragging = false
    let moved = 0
    let lastX = 0
    let lastY = 0
    const pointers = new Map<number, { x: number; y: number }>()
    let pinchStart = 0

    const down = (e: PointerEvent) => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (pointers.size === 1) {
        dragging = true
        moved = 0
        lastX = e.clientX
        lastY = e.clientY
        host.setPointerCapture(e.pointerId)
      } else if (pointers.size === 2) {
        const [a, b] = [...pointers.values()]
        pinchStart = Math.hypot(a.x - b.x, a.y - b.y)
      }
    }

    const move = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
      const state = sceneRef.current
      if (!state) return

      if (pointers.size >= 2) {
        const [a, b] = [...pointers.values()]
        const d = Math.hypot(a.x - b.x, a.y - b.y)
        if (pinchStart > 0) {
          zoom(state, d / pinchStart)
          pinchStart = d
        }
        moved = 999
        return
      }
      if (!dragging) return
      const dx = e.clientX - lastX
      const dy = e.clientY - lastY
      lastX = e.clientX
      lastY = e.clientY
      moved += Math.abs(dx) + Math.abs(dy)
      state.glide = null
      state.dirty = true
      // 화면 폭만큼 끌면 한 바퀴 조금 못 되게 돈다
      state.cam = {
        ...state.cam,
        yaw: state.cam.yaw - (dx / host.clientWidth) * Math.PI * 2,
        pitch: Math.max(
          -PITCH_LIMIT,
          Math.min(PITCH_LIMIT, state.cam.pitch + (dy / host.clientHeight) * Math.PI),
        ),
      }
    }

    const up = (e: PointerEvent) => {
      const wasDragging = dragging && pointers.size === 1
      pointers.delete(e.pointerId)
      if (pointers.size < 2) pinchStart = 0
      if (!wasDragging) {
        dragging = false
        return
      }
      dragging = false
      // 거의 안 움직였으면 탭으로 본다
      if (moved < 8) pick(e.clientX, e.clientY)
    }

    const wheel = (e: WheelEvent) => {
      e.preventDefault()
      const state = sceneRef.current
      if (!state) return
      zoom(state, e.deltaY > 0 ? 0.9 : 1.1)
    }

    const zoom = (state: NonNullable<typeof sceneRef.current>, scale: number) => {
      state.glide = null
      state.dirty = true
      state.cam = {
        ...state.cam,
        distance: Math.max(MIN_DISTANCE, Math.min(MAX_DISTANCE, state.cam.distance / scale)),
      }
    }

    /** 화면을 짚은 자리에서 반직선을 쏴 가장 가까운 점을 고른다. */
    const pick = (clientX: number, clientY: number) => {
      const state = sceneRef.current
      if (!state || !state.mesh) return
      const rect = host.getBoundingClientRect()
      const ndc = new THREE.Vector2(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1,
      )
      const raycaster = new THREE.Raycaster()
      raycaster.setFromCamera(ndc, state.camera)
      const hits = raycaster.intersectObject(state.mesh, false)
      if (!hits.length) {
        handlers.current.onMiss?.('off')
        return
      }
      const at = hits[0].point

      const f = focus.current
      const candidates = f.focusAnchorId
        ? BODY3D_ZONES.filter((p) => p.anchorId === f.focusAnchorId)
        : BODY3D_ANCHORS

      let best: Body3dPoint | null = null
      let bestDistance = Infinity
      for (const p of candidates) {
        const d = at.distanceTo(new THREE.Vector3(p.x, p.y, p.z))
        if (d < bestDistance) {
          bestDistance = d
          best = p
        }
      }
      if (!best || bestDistance > PICK_MAX_DISTANCE) {
        handlers.current.onMiss?.('far')
        return
      }

      if (f.focusAnchorId) handlers.current.onPickZone(best.zoneId, best.side)
      else handlers.current.onPickAnchor(best.anchorId, best.side)
    }

    host.addEventListener('pointerdown', down)
    host.addEventListener('pointermove', move)
    host.addEventListener('pointerup', up)
    host.addEventListener('pointercancel', up)
    host.addEventListener('wheel', wheel, { passive: false })
    return () => {
      host.removeEventListener('pointerdown', down)
      host.removeEventListener('pointermove', move)
      host.removeEventListener('pointerup', up)
      host.removeEventListener('pointercancel', up)
      host.removeEventListener('wheel', wheel)
    }
  }, [])

  if (failed) {
    return (
      <div className="mm-body3d__fallback">
        3D 인체도를 열지 못했어요. <br />
        아래 <strong>목록에서 고르기</strong>로 부위를 골라주세요.
      </div>
    )
  }

  return (
    <div className="mm-body3d" ref={hostRef}>
      {loading && (
        <div className="mm-body3d__loading">
          <span className="mm-spinner" />
          <span>인체도를 불러오는 중이에요</span>
        </div>
      )}
    </div>
  )
}

export default BodyMap3d
