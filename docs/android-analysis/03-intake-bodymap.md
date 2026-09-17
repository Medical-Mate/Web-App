# 인체도 부위 선택 (1l)

> 출처: `C:/Claude/MedicalMate/app/src/main/java/com/mist/medicalmate/intake/ui/BodyMap*.kt`,
> `BodyPartSearch.kt`, `IntakeScreen.kt`, `IntakeViewModel.kt`, `IntakeSessionActions.kt`,
> `IntakeDestination.kt`, `core/model/IntakeStep.kt`, `core/designsystem/Dimens.kt`,
> `res/values/strings.xml`, `intake/data/SessionApi.kt`, `PORTFOLIO.md` 22장, `CLAUDE.md`.
> 이 문서의 모든 수치·문구는 위 파일에서 직접 읽은 값이다.

---

## 웹앱 구현 메모

1. **3D는 포팅하지 않는다.** 안드로이드 기본 경로는 Filament 3D(`byMap3d = true`)지만, 웹에서는 같은 온톨로지·같은 `BodyMapSelection` 값을 내는 **SVG 2D 인체도**로 대체한다 — 2D 코드(좌표표·확대·좌우반전·목록·검색)가 이미 완결돼 있어 그대로 옮기면 값이 100% 동일하다.
2. **모바일 폭 고정(max-width 420px, content 320px, gutter 20px)을 유지한다.** 판 높이 505dp가 좌표 기반 계산값이라 폭을 넓히면 점 히트박스 계산(48px 비겹침)이 무의미해진다. 데스크톱은 가운데 정렬 + 좌우 여백.
3. **래스터 WebP 9장 대신 SVG `<path>` 실루엣을 쓰고, 점은 SVG `<circle>` + `<button>`으로 얹는다.** 좌표가 이미 0..1 정규화라 `viewBox="0 0 1000 1000"` 기준 `cx=x*1000 cy=y*1000`으로 바로 옮겨진다.
4. **확대 애니메이션은 CSS `transform-origin` + `scale`로 재현한다**(240ms, 전신 1.6배 밀어내기 / 확대 1.12배 들어오기). `prefers-reduced-motion: reduce`면 즉시 전환 — 안드로이드도 `ANIMATOR_DURATION_SCALE == 0`을 같은 뜻으로 읽는다.
5. **제스처(끌어 돌리기·핀치 확대)는 전부 버린다.** 2D 경로에는 제스처가 없고 탭만 있다. 대신 앞/뒤 세그먼트 토글 + 부위 확대 + 목록/검색 3경로를 반드시 모두 살린다(목록은 접근성 대체 경로라 빠지면 흐름 전체가 막힌다).

---

## 1. 화면 정체성

| 항목 | 값 |
| --- | --- |
| Figma 화면 id | `1l-1`(앞면 앵커) · `1l-3`(뒷면 앵커) · `1l-2`(세부 구역) |
| 관련 Figma 프레임 | `1c · 증상 문답 · 아픈부위 선택` = `1074:7302` / 판 컴포넌트 `Body Map` = `387:4164`(266x396) / 점 마스터 `Point` 22x22, 내부 `Core` 14x14 |
| 3D 화면 Figma id | **없음.** `BodyMap3dStep.kt` 주석: "시안에 없는 화면이다"(#211) |
| 안드로이드 라우트 | `IntakeDestination(sessionId: Long? = null)` — 증상 정리 4단계 전체가 **목적지 하나**다 |
| 단계 | `IntakeStep.BODY_PART` (1 / 4). 진행 표시 라벨 `증상 정리` |
| 상단 내비 제목 | `기록` (`R.string.intake_title`) |
| 화면 진입점 | 홈의 "증상 정리 시작하기"(`sessionId = null`) / "이어서 하기"(`sessionId != null` → 이 단계를 **건너뛰고** 문답으로 복원됨) |
| 파일 | `BodyMapStep.kt`(2D 진입) · `BodyMap3dStep.kt`(3D 진입) · `BodyMapPartList.kt`(목록/검색) |

### 웹 라우트 제안

증상 정리 4단계가 한 목적지이므로 웹도 한 라우트에 단계 상태를 두는 편이 안전하다.

```
/intake                       // step 상태로 4단계 전환 (권장, 안드로이드와 동일)
/intake?session=123           // 이어서 하기
```

단계별 URL을 쓰고 싶다면 `/intake/body-part`로 두되, 새로고침 시 `selection`이 날아가므로 `sessionStorage` 복구가 필요하다.

---

## 2. 2D냐 3D냐 — 판별 결과

**결론: 현재 안드로이드 앱에서 화면에 실제로 뜨는 것은 3D다. 다만 3D는 시안에 없는 테스트 화면이고, 2D 코드가 유일한 시안 기준이다. 웹은 2D 구조를 기준으로 구현한다.**

근거는 셋이 서로 다른 말을 하고 있어서 시점을 나눠 읽어야 한다.

| 출처 | 내용 | 시점 |
| --- | --- | --- |
| `PORTFOLIO.md` 22장 "인체도를 3D로 만들지 않은 판단" | GLB 68MB · `SurfaceView`가 접근성 트리에 아무것도 안 내놓음 → **3D를 쓰지 않고** 미리 렌더한 WebP 9장 + 정규화 좌표표로 간다 | 초기 판단 (**현재 코드와 어긋남**) |
| `CLAUDE.md` `3D 인체도` 행 | "2D 인체도 옆에 **시험용으로** 붙어 있다(#211). **화면 위 버튼으로 갈아 끼우고** 고른 값은 양쪽이 같다" | 중간 (**현재 코드와 어긋남** — 갈아 끼우는 버튼은 UI에 없다) |
| `CLAUDE.md` 481행 `아픈 부위(1l)` 행 | **"3D로 확정됐다(#235). 부위 선택이 3D로 열리고 2D로 넘어가는 길을 두지 않는다. 2D 코드와 이미지는 지우지 않는다. 목록에서 고르기는 3D 줄로 옮겼다"** | 최신 |
| `BodyMapUiState.kt` `byMap3d` 기본값 | `val byMap3d: Boolean = true` + 주석 "**3D로 확정됐다**(#235). 기본이 3D이고 화면에서 2D로 넘어가는 길을 두지 않는다" | 최신 (코드) |

> `CLAUDE.md` 안에서 두 행이 서로 다른 말을 한다. `3D 인체도` 행은 #211 시절(2D가 기본, 버튼으로 전환)의 서술이 남아 있고 `아픈 부위(1l)` 행이 #235 이후다. **뒤엣것이 코드와 맞는다.**

#### 코드로 확인한 도달 가능성

`BodyMapUiState.screen` 계산 순서:

```kotlin
val screen: BodyMapScreen
    get() = when {
        byList  -> BodyMapScreen.LIST
        byMap3d -> BodyMapScreen.MAP_3D
        pickingZone -> BodyMapScreen.ZONE
        else -> BodyMapScreen.ANCHOR
    }
```

- `byMap3d`를 끄는 조작은 `BodyMapActions.onMap3dToggle()` 하나뿐이고, 그 콜백(`onBodyMap3dToggle`)은 `IntakeCallbacks`에 선언돼 `IntakeDestination.kt:124`에서 ViewModel에 연결돼 있지만 **어떤 Composable도 호출하지 않는다**(grep 결과: UI 호출부 0건).
- `onListModeToggle()`은 목록을 닫을 때 `byMap3d = !toList`로 되돌리므로 목록에서 나오면 다시 3D다(#239).
- 따라서 **`BodyMapScreen.ANCHOR` / `ZONE`(= 2D `ImagePicker`)은 실행 중인 앱에서 도달 불가**다. 살아 있는 화면은 `MAP_3D`와 `LIST` 둘이다.
- Preview로도 안 뜬다. `IntakeScreen.kt`의 `IntakeBodyAnchorPreview`·`IntakeBodyZonePreview`가 기본 `BodyMapUiState()`(= `byMap3d = true`)를 넘겨서 **이름과 달리 둘 다 3D 화면을 그린다.** `IntakeBodyListPreview`만 `byList = true`라 의도한 화면이 나온다. 2D 앵커·확대 화면을 눈으로 보려면 Preview 상태에 `byMap3d = false`를 직접 넣어야 한다.
- 그럼에도 2D 코드를 지우지 않은 이유는 코드 주석이 밝힌다: "되돌릴 판단이 남아 있고, 좌표·온톨로지·검색이 그쪽에 묶여 있어 지우면 함께 흔들린다."

#### 3D 자산 실측

| 파일 | 경로 | 크기 | 용도 |
| --- | --- | --- | --- |
| `body.glb` | `app/src/main/assets/body3d/body.glb` | 514,000 B (0.49MB) | Filament 렌더용 Draco 압축 glTF |
| `body_collision.bin` | `app/src/main/assets/body3d/body_collision.bin` | 418,776 B (0.40MB) | 짚기 판정용 축소 충돌 메시(46,000 삼각형, 16bit 양자화) |

`PORTFOLIO.md`가 말한 68MB GLB는 축소·압축돼 0.49MB가 됐고 그래서 3D가 살아났다. 렌더러는 `SurfaceView`가 아니라 **`TextureView`**를 쓴다(`BodyMap3dRenderer.kt`: "`SurfaceView`의 표면은 창 뒤에 놓이고… `TextureView`는 뷰 계층 안에서 합성돼 배경 위·점 아래에 그대로 놓인다"). 다만 접근성은 여전히 없다 — `BodyMap3dBoard`가 `clearAndSetSemantics { }`로 트리를 비운다.

#### 웹 판단

3D를 웹으로 옮기려면 three.js + Draco 로더 + Möller–Trumbore 레이캐스트를 다시 짜야 하고, 얻는 것은 "돌려볼 수 있음"뿐이다. 저장되는 값은 2D와 완전히 동일한 `{anchorId, zoneId, side}`다(`BodyMap3dPoint.toSelection()`이 일부러 2D 갈래에서 값을 고른다). **SVG 2D로 대체하면 데이터 손실이 0이다.**

---

## 3. 상태 — `BodyMapUiState` 전체 필드

`BodyMapUiState.kt`. 이 객체는 `IntakeUiState.bodyMap`에 통째로 들어 있다.

### 3.1 저장 필드

| 필드 | 코틀린 타입 | 기본값 | TypeScript | 뜻 |
| --- | --- | --- | --- | --- |
| `view` | `BodyMapView` | `FRONT` | `'FRONT' \| 'BACK'` | 전신 이미지의 면. 앞/뒤 세그먼트 토글이 바꾼다 |
| `focus` | `BodyMapSelection?` | `null` | `BodyMapSelection \| null` | **확대해서 보고 있는 앵커.** 고른 부위와 별개 |
| `selection` | `BodyMapSelection?` | `null` | `BodyMapSelection \| null` | **고른 부위 한 곳.** 이 값이 있어야 다음으로 간다 |
| `byList` | `Boolean` | `false` | `boolean` | 목록에서 고르는 길인지 |
| `byMap3d` | `Boolean` | **`true`** | `boolean` | 3D 인체도로 짚는 중인지. 웹에서는 이 필드를 **제거**하거나 항상 `false`로 고정 |
| `search` | `String` | `""` | `string` | 목록 검색어. **잘리지 않고 친 그대로 들어간다** — `onSearchChange`가 `search = query`로 넣는다. 300자 절단은 `searchBodyParts()`가 찾을 때만 하고(`query.take(300)`) 입력칸에 보이는 글자는 그대로다 |
| `searchResults` | `List<BodyPartMatch>` | `emptyList()` | `BodyPartMatch[]` | **마지막으로 결과가 있었던** 검색 결과. 0건이면 직전 결과를 유지한다 |

> `focus`와 `selection`을 나눈 이유(주석 원문 요지): 하나로 두면 구역을 고르는 순간 값이 구역을 가리키게 되고, 화면이 앵커 단계가 끝난 것으로 읽어 앵커 화면으로 돌아간다. 고른 점이 브랜드색으로 바뀌는 것을 한 번도 볼 수 없다. 또 확대 화면의 제목과 좌우 반전이 **앵커의** 좌우를 봐야 하는데, 값이 하나면 "머리에서 왼쪽 눈"을 고른 뒤 제목이 `왼쪽 머리 어디가 아프세요?`가 된다.

> `searchResults`가 0건에서 직전 결과를 유지하는 이유(주석 원문 요지): 한글은 마지막 글자가 조합되는 동안 중간 상태("옆 → 옆ㄱ → 옆구")가 되어 한 글자마다 찾으면 목록이 깜빡인다. **웹에서는 IME `compositionstart`/`compositionend`로도 같은 문제가 나므로 이 규칙을 그대로 옮긴다.**

### 3.2 파생 값 (getter)

| 이름 | 타입 | 계산식 | 뜻 |
| --- | --- | --- | --- |
| `searching` | `Boolean` | `byList && search.isNotBlank()` | 검색 중인지 |
| `pickingZone` | `Boolean` | `focus != null && zones.isNotEmpty()` | 구역을 고르는 중인지 |
| `screen` | `BodyMapScreen` | 위 2장의 `when` 블록 | 지금 그릴 화면 |
| `anchor` | `BodyMapAnchorGeometry?` | `focus?.let { bodyMapAnchorOf(it.anchorId) }` | 확대한 앵커의 좌표 묶음 |
| `zones` | `List<BodyMapZoneGeometry>` | `anchor?.zones.orEmpty()` | 그 앵커의 구역들 |
| `bodyImage` | `BodyMapImage` | `if (view == BACK) bodyMapBack else bodyMapFront` | 지금 전신 이미지 |
| `focusPoint` | `BodyMapPoint?` | `focus?.let { f -> bodyMapAnchorOf(f.anchorId).points.firstOrNull { it.side == f.side } }` | 확대 애니메이션의 축. 팔·다리는 짚은 쪽 점을 골라야 한다 |

### 3.3 상위 상태에서 이 화면이 쓰는 값 (`IntakeUiState`)

| 필드/getter | 타입 | 이 화면에서의 역할 |
| --- | --- | --- |
| `step` | `IntakeStep` | `BODY_PART`일 때만 이 화면. 진행 표시 `1 / 4` |
| `bodyMap` | `BodyMapUiState` | 본문 |
| `bodyPart` | `String?` | 다음으로 갈 때 `selection.title()`이 여기 담긴다 |
| `canGoBack` | `Boolean` | `step != BODY_PART \|\| bodyMap.focus != null` |
| **`canLeaveBodyPart`** | `Boolean` | **`bodyMap.selection != null`** — 하단 "다음" 버튼 활성화 조건 |
| `sessionId` | `Long?` | 다음을 누를 때 `POST /api/sessions` 응답으로 채워진다 |
| `restoring` | `Boolean` | "이어서 하기"로 들어와 `GET /api/sessions/{id}`를 기다리는 중. **이 화면에 서 있는 동안 참일 수 있는데 어떤 UI도 이 값을 읽지 않는다**(아래 주) |
| `restoreFailed` | `Boolean` | 복원 실패. 같은 이유로 **화면에 나오지 않는다** |

> **`restoring` / `restoreFailed`는 어디에서도 그려지지 않는다.** `intake/ui` 전체를 grep하면 `IntakeUiState.kt`(선언)와 `IntakeSessionActions.kt`(대입) 말고 참조가 0건이다. `IntakeSessionActions.restore()`는 실패했을 때 `step`을 바꾸지 않으므로 상태는 `BODY_PART`에 그대로 남는다 — 즉 **홈에서 "이어서 하기"를 눌렀는데 복원이 실패하면, 사용자는 아무 안내 없이 이 부위 선택 화면에 서게 된다.** 불러오는 동안(`restoring = true`)에도 스피너 없이 이 화면이 그대로 보인다. 웹으로 옮길 때 그대로 따라 하면 같은 구멍이 생긴다 — 최소한 실패 안내 한 줄은 두는 편이 낫고, 그것은 안드로이드에 없는 것을 더하는 결정이다.

---

## 4. 타입 정의 — TypeScript 이식용

```ts
type BodyMapView = 'FRONT' | 'BACK';

/** CENTER = 좌우 없음, LEFT/RIGHT = 본인 기준, BASE = 좌우 공용 이미지의 기준점 */
type BodyMapSide = 'CENTER' | 'LEFT' | 'RIGHT' | 'BASE';

type BodyMapScreen = 'ANCHOR' | 'ZONE' | 'LIST' | 'MAP_3D';

interface BodyMapImage {
  res: string;        // 안드로이드 @DrawableRes → 웹은 SVG id 또는 이미지 경로
  widthPx: number;    // 원본 픽셀 (좌표표 대조용)
  heightPx: number;
  view: BodyMapView;
  mirrored: boolean;  // true면 본인 오른쪽만 그린 한 장. 왼쪽은 좌우 뒤집어 쓴다
  // aspectRatio = widthPx / heightPx
}

/** 이미지 위의 한 점. x, y는 0..1 정규화 */
interface BodyMapPoint { side: BodyMapSide; x: number; y: number; }

interface BodyMapZoneGeometry { id: string; points: BodyMapPoint[]; }

interface BodyMapAnchorGeometry {
  id: string;
  view: BodyMapView | null;   // null이면 인체도에 자리가 없는 앵커(전신·피부)
  points: BodyMapPoint[];
  detail: BodyMapImage | null;
  zones: BodyMapZoneGeometry[];
}

/** 화면에 그릴 점. 좌우 반전이 이미 반영된 좌표 */
interface BodyMapDot { id: string; label: string; x: number; y: number; selected: boolean; }

/** 부위 하나를 가리키는 값. 서버에도 이 값으로 간다 */
interface BodyMapSelection {
  anchorId: string;          // "ANC:001"
  zoneId?: string | null;    // "SUR:002" — null이면 앵커까지만
  side: BodyMapSide;         // 기본 'CENTER'
}

/** 온톨로지 노드 */
interface BodyPart { id: string; label: string; aliases: string[]; }
interface BodyPartGroup { anchor: BodyPart; zones: BodyPart[]; }

/** 검색 결과 한 줄. score 0 = 앵커에 딸려 온 구역 */
interface BodyPartMatch { id: string; matched: string; score: number; }

interface BodyMapUiState {
  view: BodyMapView;
  focus: BodyMapSelection | null;
  selection: BodyMapSelection | null;
  byList: boolean;
  search: string;
  searchResults: BodyPartMatch[];
  // byMap3d는 웹에서 제외
}
```

### 4.1 값 계산 함수 (그대로 옮겨야 하는 것)

```ts
/** 알약(캡션)용 이름. "무릎(왼쪽)" — Figma `Selected Label` 형식 */
function label(s: BodyMapSelection): string {
  const base = ontology[s.zoneId ?? s.anchorId] ?? (s.zoneId ?? s.anchorId);
  if (s.side === 'LEFT')  return `${base}(왼쪽)`;
  if (s.side === 'RIGHT') return `${base}(오른쪽)`;
  return base;
}

/** 문장·제목·스크린리더용 이름. "왼쪽 무릎" */
function title(s: BodyMapSelection): string {
  const base = ontology[s.zoneId ?? s.anchorId] ?? (s.zoneId ?? s.anchorId);
  if (s.side === 'LEFT')  return `왼쪽 ${base}`;
  if (s.side === 'RIGHT') return `오른쪽 ${base}`;
  return base;
}

/** 이 선택이 anchorId·side로 열리는 확대 화면에 속하는지 */
function belongsTo(s: BodyMapSelection, anchorId: string, side: BodyMapSide): boolean {
  if (s.anchorId !== anchorId) return false;
  const sharedImage = anchorOf(anchorId).detail?.mirrored === true; // 팔·다리만 true
  return !sharedImage || s.side === side;
}

/** 점 id. 온톨로지 id 하나로는 좌우 두 점을 못 가른다 */
const dotId = (ontologyId: string, side: BodyMapSide) => `${ontologyId}@${side}`;
const parseDotId = (id: string) => { const [a, b] = id.split('@'); return [a, b as BodyMapSide] as const; };

/** 서버로 보낼 부위 코드. 구역까지 골랐으면 그것이 더 자세하다 */
const siteCode = (s: BodyMapSelection) => s.zoneId ?? s.anchorId;

/** 구역이 속한 앵커. 검색 결과는 id만 주는데 선택에는 앵커가 필요하다 (bodyMapAnchorIdOfZone) */
const anchorIdOfZone = (zoneId: string): string | null =>
  groups.find(g => g.zones.some(z => z.id === zoneId))?.anchor.id ?? null;
// ↑ null이면 그 id는 구역이 아니라 앵커다. `SearchRows`가 이 null 여부로 줄 모양을 가른다.

/** 인체도에 자리가 없는 앵커(전신·피부). view === null인 것들 (bodyMapSideAnchors) */
const sideAnchors = () => anchors.filter(a => a.view === null);

/** 지금 면에 있는 앵커들 (bodyMapAnchorsOn) */
const anchorsOn = (view: BodyMapView) => anchors.filter(a => a.view === view);

/** 확대한 앵커에서 고를 수 있는 값들. 점과 목록 줄이 같은 함수를 쓴다 (bodyMapZoneChoices) */
const zoneChoices = (anchor, side: BodyMapSide): BodyMapSelection[] =>
  anchor.zones.flatMap(z => z.points.map(p =>
    ({ anchorId: anchor.id, zoneId: z.id, side: zoneSideOf(p, side) })));

/** 검색에서 구역 하나를 고를 수 있는 갈래. 팔·다리는 좌우 두 줄 (bodyMapChoicesForZone) */
const choicesForZone = (anchorId: string, zoneId: string): BodyMapSelection[] => {
  const anchor = anchorOf(anchorId);
  const sides: BodyMapSide[] = anchor.detail?.mirrored ? ['LEFT', 'RIGHT'] : ['CENTER'];
  return distinct(sides.flatMap(s => zoneChoices(anchor, s)).filter(c => c.zoneId === zoneId));
};
```

---

## 5. 온톨로지 — 부위 계층 전체

`BodyMapOntology.kt`. **AI 트랙의 `docs/examples/body-map.json`에서 생성한 파일이라 손으로 고치지 않는다.**
스냅샷 `f848848baea4` · 앵커 9 · 구역 25 · 별칭 122.
`bodyMapGroups`의 배열 순서 = 목록/사이드 칩 노출 순서 = 검색 순회 순서다. 그대로 유지할 것.

### 5.1 앵커 9개

| # | 앵커 id | 한국어 명칭 | 별칭 | 인체도 면 | 구역 수 |
| --- | --- | --- | --- | --- | --- |
| 1 | `ANC:001` | 머리 | 두부, 머리통, 머리 전체 | FRONT | 5 |
| 2 | `ANC:002` | 목 | (없음) | FRONT | 2 |
| 3 | `ANC:003` | 가슴 | 흉부, 가슴팍, 앞가슴 | FRONT | 2 |
| 4 | `ANC:004` | 배 | 복부, 뱃속, 배 전체, 배꼽 | FRONT | 2 |
| 5 | `ANC:013` | 팔 | 상지, 팔 전체 | FRONT (좌우 2점) | 6 |
| 6 | `ANC:014` | 다리 | 하지, 다리 전체 | FRONT (좌우 2점) | 5 |
| 7 | `ANC:012` | 허리·엉덩이 | 요추, 등허리 | **BACK** | 3 |
| 8 | `ANC:010` | 전신 | 온몸, 몸 전체, 전체, 특정 부위 없음 | **null (칩)** | 0 |
| 9 | `ANC:011` | 피부 | 살, 피부 표면, 겉 | **null (칩)** | 0 |

> 주의: `bodyMapGroups`(온톨로지)의 순서는 위 1~9번 그대로다. 그런데 **`bodyMapAnchors`(좌표표)의 순서는 다르다** — `ANC:010`, `ANC:011`이 맨 앞이고 그다음 `ANC:001, 002, 003, 004, 013, 014, 012`다. 목록 화면(`AnchorRows`)은 **좌표표 순서**를 쓰므로 목록 맨 위에 `전신`·`피부`가 온다. 웹도 동일하게 할 것.

### 5.2 구역 25개 (부위 → 세부 구역 2단계)

| 앵커 | 구역 id | 한국어 명칭 | 별칭 | 좌표 점 수 / 좌우 |
| --- | --- | --- | --- | --- |
| 머리 `ANC:001` | `SUR:001` | 머리 전체·이마 | 이마, 앞머리, 뒤통수, 정수리, 옆머리, 관자놀이 | 1 / CENTER |
| | `SUR:002` | 눈 | 안구, 눈알, 눈꺼풀, 눈두덩 | 2 / RIGHT·LEFT |
| | `SUR:003` | 귀 | 귓속, 귓바퀴, 귀 안, 귀 뒤 | 2 / RIGHT·LEFT |
| | `SUR:004` | 코 | 콧속, 콧등, 비강 | 1 / CENTER |
| | `SUR:005` | 입 | 입안, 구강, 입술, 혀, 잇몸, 치아, 이빨 | 1 / CENTER |
| 목 `ANC:002` | `SUR:011` | 목 안(목구멍) | 목구멍, 인후, 편도, 목 안쪽, 목 속 | 1 / CENTER |
| | `SUR:012` | 목 뒤·옆 | 뒷목, 목덜미, 옆목, 목 옆, 경추, 목뼈 | 2 / RIGHT·LEFT |
| 가슴 `ANC:003` | `SUR:021` | 가슴 가운데 | 가슴뼈, 흉골, 가슴 중앙, 심장 쪽 | 1 / CENTER |
| | `SUR:022` | 가슴 옆(갈비) | 갈비뼈, 늑골, 옆가슴, 갈비 | 2 / RIGHT·LEFT |
| 배 `ANC:004` | `SUR:031` | 윗배(명치) | 명치, 상복부, 윗배, 명치끝, 배 위쪽 | 2 / RIGHT·LEFT |
| | `SUR:032` | 아랫배 | 하복부, 배 아래쪽, 골반, 배꼽 아래 | 2 / RIGHT·LEFT |
| 팔 `ANC:013` | `SUR:051` | 어깨 | 어깻죽지, 견관절, 어깨 앞, 어깨 뒤 | 1 / BASE |
| | `SUR:055` | 위팔 | 윗팔, 상완, 팔 위쪽 | 1 / BASE |
| | `SUR:061` | 팔꿈치 | 팔굽, 주관절 | 1 / BASE |
| | `SUR:065` | 아래팔 | 아랫팔, 전완, 팔 아래쪽 | 1 / BASE |
| | `SUR:071` | 손목 | 손목 관절 | 1 / BASE |
| | `SUR:072` | 손 | 손가락, 손바닥, 손등, 엄지, 검지 | 1 / BASE |
| 다리 `ANC:014` | `SUR:090` | 허벅지 | 대퇴, 넓적다리, 허벅다리 | 1 / BASE |
| | `SUR:091` | 무릎 | 슬관절, 무릎 앞, 무릎 뒤, 오금 | 1 / BASE |
| | `SUR:097` | 종아리 | 장딴지, 정강이, 정강이뼈 | 1 / BASE |
| | `SUR:101` | 발목 | 발목 관절, 아킬레스 | 1 / BASE |
| | `SUR:102` | 발 | 발가락, 발바닥, 발등, 발뒤꿈치, 뒤꿈치 | 1 / BASE |
| 허리·엉덩이 `ANC:012` | `SUR:041` | 허리 가운데 | 허리, 허리 중앙, 꼬리뼈, 척추 아래, 등 아래 | 1 / CENTER |
| | `SUR:042` | 허리 옆 | 옆구리, 옆허리, 갈비뼈 아래 옆 | 2 / LEFT·RIGHT |
| | `SUR:081` | 엉덩이 | 둔부, 고관절, 엉치, 꽁무니 | 2 / LEFT·RIGHT |

### 5.3 실제로 고를 수 있는 값의 총 개수

`bodyMapZoneChoices(anchor, side)`가 만드는 갈래 기준.

| 앵커 | 확대 화면 수 | 화면당 선택 갈래 | 합 |
| --- | --- | --- | --- |
| 머리 | 1 (CENTER) | 7 (`SUR:001`, `SUR:002`×2, `SUR:003`×2, `SUR:004`, `SUR:005`) | 7 |
| 목 | 1 | 3 | 3 |
| 가슴 | 1 | 3 | 3 |
| 배 | 1 | 4 | 4 |
| 팔 | 2 (LEFT / RIGHT) | 6 | 12 |
| 다리 | 2 (LEFT / RIGHT) | 5 | 10 |
| 허리·엉덩이 | 1 | 5 | 5 |
| 전신 / 피부 | 0 (칩이 곧 선택) | 1씩 | 2 |
| **합계** | | | **46가지 선택값** |

> `BodyMapPartList.kt` 주석이 "25개 구역을 좌우까지 펼치면 44줄"이라고 적었다(전신·피부 2 제외 = 44).

### 5.4 온톨로지 id → 이름 맵

```ts
// bodyMapOntology: Map<String, String>
// bodyMapGroups를 flatMap(anchor + zones)해서 id → label로 만든 것.
// 없는 id가 오면 id를 그대로 화면에 보여준다 (bodyMapLabelOf).
```

---

## 6. 2D 좌표표 — SVG 이식용

`BodyMapGeometry.kt`. 원본 `humanmap_coords.json` schema `humanmap-coords/3.0`, 3차(발가락 리터치).
모델: `Hi3D_스타일화된 근육질 남성 해부 베이스 3D 모델_allparts_20260909_171130.glb`.
**손으로 고치지 않는다.** 좌표는 전부 0..1 정규화.

### 6.1 이미지 9장

| 용도 | 리소스 | 원본 px | 종횡비(w/h) | view | mirrored | 파일 크기 |
| --- | --- | --- | --- | --- | --- | --- |
| 전신 앞면 | `bodymap_front` | 1080 × 2480 | 0.435484 | FRONT | false | 73,662 B |
| 전신 뒷면 | `bodymap_back` | 1080 × 2480 | 0.435484 | BACK | false | 102,674 B |
| 머리 확대 | `bodymap_head` | 1080 × 1591 | 0.678818 | FRONT | false | 59,360 B |
| 목 확대 | `bodymap_neck` | 1080 × 792 | 1.363636 | FRONT | false | 27,006 B |
| 가슴 확대 | `bodymap_chest` | 1080 × 694 | 1.556196 | FRONT | false | 26,116 B |
| 배 확대 | `bodymap_abdomen` | 1080 × 1080 | 1.000000 | FRONT | false | 35,400 B |
| 팔 확대 | `bodymap_arm` | 1080 × 2850 | 0.378947 | FRONT | **true** | 70,598 B |
| 다리 확대 | `bodymap_leg` | 1080 × 2795 | 0.386404 | FRONT | **true** | 49,504 B |
| 허리·엉덩이 확대 | `bodymap_lower_back_hip` | 1080 × 1360 | 0.794118 | BACK | false | 122,992 B |

위치: `app/src/main/res/drawable-nodpi/*.webp`. 합계 **567,312 B (0.554MB)** — 파일 9개를 실제로 잰 값이다(`PORTFOLIO.md` 22장은 0.54MB로 적었다).
웹에서 SVG로 대체한다면 `viewBox`를 위 원본 px와 같게 두면 좌표 변환이 `x*width`, `y*height`로 끝난다.

> **2D 좌표 점은 모두 42개다** — 앵커 9개(앞면 8 + 뒷면 1) + 구역 33개(머리 7 · 목 3 · 가슴 3 · 배 4 · 팔 6 · 다리 5 · 허리엉덩이 5). `PORTFOLIO.md` 22장이 "좌표는 42개 점"이라고 적은 값이 이것이다. 웹 자료를 만들 때 이 개수를 세는 테스트를 두면 좌표표가 잘렸는지 바로 잡힌다(안드로이드는 `BodyMapGeometryTest`의 `앵커 9개와 구역 25개다` · `앞면에 앵커 6종 여덟 점 뒷면에 한 점이 있다`가 그 역할이다).

### 6.2 앵커 좌표 (전신 이미지 기준)

| 앵커 id | 이름 | view | side | x (0..1) | y (0..1) | px (1080×2480) |
| --- | --- | --- | --- | --- | --- | --- |
| `ANC:010` | 전신 | — | — | (좌표 없음 · 칩) | | |
| `ANC:011` | 피부 | — | — | (좌표 없음 · 칩) | | |
| `ANC:001` | 머리 | FRONT | CENTER | 0.5000 | 0.0450 | 540.0, 111.6 |
| `ANC:002` | 목 | FRONT | CENTER | 0.5000 | 0.1550 | 540.0, 384.4 |
| `ANC:003` | 가슴 | FRONT | CENTER | 0.5000 | 0.2500 | 540.0, 620.0 |
| `ANC:004` | 배 | FRONT | CENTER | 0.5000 | 0.4200 | 540.0, 1041.6 |
| `ANC:013` | 팔 | FRONT | RIGHT | 0.1372 | 0.3800 | 148.2, 942.4 |
| `ANC:013` | 팔 | FRONT | LEFT | 0.8628 | 0.3800 | 931.8, 942.4 |
| `ANC:014` | 다리 | FRONT | RIGHT | 0.3507 | 0.7500 | 378.8, 1860.0 |
| `ANC:014` | 다리 | FRONT | LEFT | 0.6493 | 0.7500 | 701.2, 1860.0 |
| `ANC:012` | 허리·엉덩이 | **BACK** | CENTER | 0.5000 | 0.4300 | 540.0, 1066.4 |

> 앞면에 앵커 6종(점 8개), 뒷면에 앵커 1종(점 1개). 나머지 2종은 이미지 밖 칩.
> **앞면은 화면 왼쪽이 본인의 오른쪽**이다(마주 선 사람). RIGHT의 x가 0.5보다 작은 이유.

### 6.3 구역 좌표 (각 확대 이미지 기준)

#### 머리 `ANC:001` — `bodymap_head` 1080×1591

| 구역 id | 이름 | side | x | y | px |
| --- | --- | --- | --- | --- | --- |
| `SUR:001` | 머리 전체·이마 | CENTER | 0.5000 | 0.2727 | 540.0, 433.9 |
| `SUR:002` | 눈 | RIGHT | 0.3411 | 0.4400 | 368.4, 700.0 |
| `SUR:002` | 눈 | LEFT | 0.6589 | 0.4400 | 711.6, 700.0 |
| `SUR:003` | 귀 | RIGHT | 0.0804 | 0.4903 | 86.8, 780.1 |
| `SUR:003` | 귀 | LEFT | 0.9196 | 0.4903 | 993.2, 780.1 |
| `SUR:004` | 코 | CENTER | 0.5000 | 0.5842 | 540.0, 929.5 |
| `SUR:005` | 입 | CENTER | 0.5000 | 0.7230 | 540.0, 1150.3 |

#### 목 `ANC:002` — `bodymap_neck` 1080×792

| 구역 id | 이름 | side | x | y | px |
| --- | --- | --- | --- | --- | --- |
| `SUR:011` | 목 안(목구멍) | CENTER | 0.5000 | 0.5273 | 540.0, 417.6 |
| `SUR:012` | 목 뒤·옆 | RIGHT | 0.3267 | 0.2455 | 352.8, 194.4 |
| `SUR:012` | 목 뒤·옆 | LEFT | 0.6733 | 0.2455 | 727.2, 194.4 |

#### 가슴 `ANC:003` — `bodymap_chest` 1080×694

| 구역 id | 이름 | side | x | y | px |
| --- | --- | --- | --- | --- | --- |
| `SUR:021` | 가슴 가운데 | CENTER | 0.5000 | 0.3611 | 540.0, 250.6 |
| `SUR:022` | 가슴 옆(갈비) | RIGHT | 0.2429 | 0.7778 | 262.3, 539.8 |
| `SUR:022` | 가슴 옆(갈비) | LEFT | 0.7571 | 0.7778 | 817.7, 539.8 |

#### 배 `ANC:004` — `bodymap_abdomen` 1080×1080

| 구역 id | 이름 | side | x | y | px |
| --- | --- | --- | --- | --- | --- |
| `SUR:031` | 윗배(명치) | RIGHT | 0.3286 | 0.2143 | 354.9, 231.4 |
| `SUR:031` | 윗배(명치) | LEFT | 0.6714 | 0.2143 | 725.1, 231.4 |
| `SUR:032` | 아랫배 | RIGHT | 0.3464 | 0.5714 | 374.1, 617.1 |
| `SUR:032` | 아랫배 | LEFT | 0.6536 | 0.5714 | 705.9, 617.1 |

#### 팔 `ANC:013` — `bodymap_arm` 1080×2850, **mirrored = true**

본인 **오른쪽** 팔 기준 한 장. 왼쪽은 이미지를 `scaleX(-1)`하고 좌표를 `1 - x`로 뒤집는다.

| 구역 id | 이름 | side | x (오른쪽) | x (왼쪽 = 1−x) | y | px (오른쪽) |
| --- | --- | --- | --- | --- | --- | --- |
| `SUR:051` | 어깨 | BASE | 0.5556 | 0.4444 | 0.0947 | 600.0, 269.9 |
| `SUR:055` | 위팔 | BASE | 0.4611 | 0.5389 | 0.2842 | 498.0, 809.9 |
| `SUR:061` | 팔꿈치 | BASE | 0.4278 | 0.5722 | 0.4737 | 462.0, 1350.0 |
| `SUR:065` | 아래팔 | BASE | 0.3944 | 0.6056 | 0.6000 | 426.0, 1710.0 |
| `SUR:071` | 손목 | BASE | 0.3333 | 0.6667 | 0.7158 | 360.0, 2040.0 |
| `SUR:072` | 손 | BASE | 0.3611 | 0.6389 | 0.8737 | 390.0, 2490.0 |

#### 다리 `ANC:014` — `bodymap_leg` 1080×2795, **mirrored = true**

| 구역 id | 이름 | side | x (오른쪽) | x (왼쪽 = 1−x) | y | px (오른쪽) |
| --- | --- | --- | --- | --- | --- | --- |
| `SUR:090` | 허벅지 | BASE | 0.4882 | 0.5118 | 0.1818 | 527.3, 508.1 |
| `SUR:091` | 무릎 | BASE | 0.4794 | 0.5206 | 0.3409 | 517.8, 952.8 |
| `SUR:097` | 종아리 | BASE | 0.4000 | 0.6000 | 0.5454 | 432.0, 1524.4 |
| `SUR:101` | 발목 | BASE | 0.4177 | 0.5823 | 0.7955 | 451.1, 2223.4 |
| `SUR:102` | 발 | BASE | 0.3706 | 0.6294 | 0.9318 | 400.2, 2604.4 |

#### 허리·엉덩이 `ANC:012` — `bodymap_lower_back_hip` 1080×1360 (뒷면)

뒷면은 화면 방향과 본인 좌우가 **같다.** 그래서 LEFT의 x가 0.5보다 작다.

| 구역 id | 이름 | side | x | y | px |
| --- | --- | --- | --- | --- | --- |
| `SUR:041` | 허리 가운데 | CENTER | 0.5000 | 0.2647 | 540.0, 360.0 |
| `SUR:042` | 허리 옆 | LEFT | 0.2704 | 0.1471 | 292.0, 200.1 |
| `SUR:042` | 허리 옆 | RIGHT | 0.7296 | 0.1471 | 788.0, 200.1 |
| `SUR:081` | 엉덩이 | LEFT | 0.2222 | 0.5588 | 240.0, 760.0 |
| `SUR:081` | 엉덩이 | RIGHT | 0.7778 | 0.5588 | 840.0, 760.0 |

> **미해결 데이터 이슈** (`CLAUDE.md` 474행): `SUR:041 허리 가운데`가 천골 위치(신장 58%)에 있다. 허리 옆(62%)과 같은 높이로 올려달라고 디자인 트랙에 넘긴 상태. 데이터만 교체하면 되는 건.

### 6.4 좌우 반전 규칙 (SVG로 옮길 때 반드시 지킬 것)

`BodyMapCanvas.kt` / `BodyMapUiState.kt` / `PORTFOLIO.md` 22장.

- **뒤집는 것은 이미지뿐이다.** 컨테이너째 `scaleX(-1)`하면 점의 접근성 라벨 글자까지 반전된다.
- 점 좌표는 `x → 1 - x`로 **계산**한다. 좌표표에 미러 열을 담지 않는다(같은 값을 두 곳에 두면 한쪽만 갱신된다).
- 적용 조건: `anchor.detail.mirrored == true && focus.side == LEFT` (팔·다리만).
- 웹 구현: `<image transform="scale(-1,1) translate(-W,0)">` 또는 CSS `transform: scaleX(-1)`을 **이미지 요소에만** 걸고, 점 `<g>`는 건드리지 않는다.

### 6.5 점(dot) 생성 규칙

```ts
// 앵커 화면
function anchorDots(view: BodyMapView, selection: BodyMapSelection | null): BodyMapDot[] {
  return anchorsOn(view).flatMap(anchor =>
    anchor.points.map(p => ({
      id: dotId(anchor.id, p.side),
      label: title({ anchorId: anchor.id, side: p.side }),  // "왼쪽 팔"
      x: p.x, y: p.y,
      selected: selection ? belongsTo(selection, anchor.id, p.side) : false,
    })));
}

// 구역 화면. side는 '확대한 앵커의' 좌우다 (고른 구역의 좌우가 아니다)
function zoneDots(anchor, side: BodyMapSide, selection): BodyMapDot[] {
  const flip = anchor.detail?.mirrored === true && side === 'LEFT';
  return anchor.zones.flatMap(zone =>
    zone.points.map(p => {
      const candidate = { anchorId: anchor.id, zoneId: zone.id, side: zoneSideOf(p, side) };
      return {
        id: dotId(zone.id, candidate.side),
        label: title(candidate),
        x: flip ? 1 - p.x : p.x,
        y: p.y,
        selected: equals(selection, candidate),
      };
    }));
}

/** 좌우 공용 이미지의 기준점(BASE)은 확대한 쪽을 따르고, 좌우가 갈린 점은 자기 값을 쓴다 */
const zoneSideOf = (p: BodyMapPoint, anchorSide: BodyMapSide) =>
  p.side === 'BASE' ? anchorSide : p.side;
```

---

## 7. 판 치수 계산 — 좌표에서 나오는 값

`BodyMapLayout.kt`. **시안에서 받아 적지 않고 좌표에서 계산한다.** 이유: 점 조작 영역이 48dp 정사각형이고 좌표표는 그 크기로 서로 겹치지 않게 배치돼 있는데, 그 보장이 표시 크기에 달려 있기 때문이다. 이미지를 줄이면 점 사이 거리도 줄어 어느 지점부터 두 조작 영역이 겹치고, **겹치면 짚은 곳과 골라진 부위가 달라진다.**

### 7.1 계산식

```ts
const TOUCH_MIN = 48; // px (안드로이드 dp). MedicalMateSize.touchMin

/** 정사각형 둘은 x·y 어느 한쪽만 48 이상 떨어져도 겹치지 않는다 → 유클리드가 아니라 축별 max */
const separation = (a: Dot, b: Dot, aspect: number) =>
  Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y) / aspect);

const tightest = (dots, aspect) => dots.length < 2 ? null
  : Math.min(...allPairs(dots).map(([a, b]) => separation(a, b, aspect)));

const minWidth  = (dots, aspect) => { const t = tightest(dots, aspect); return t === null ? 0 : TOUCH_MIN / t; };
const minHeight = (dots, aspect) => minWidth(dots, aspect) / aspect;

const CONTENT_WIDTH = 320; // MedicalMateSize.contentWidth

/** 전신 판 높이. 앞뒤가 같은 값이라 면을 바꿔도 판이 튀지 않는다 */
const bodyHeight = () => Math.max(
  minHeight(anchorDots('FRONT', null), FRONT_ASPECT),
  minHeight(anchorDots('BACK',  null), BACK_ASPECT),   // 뒷면은 점 1개 → 0
); // = 505.2

/** 확대 판 높이. 콘텐츠 폭을 채우되 최소치 아래로 안 가고 전신 판보다 안 커진다 */
const cardHeight = (dots, image) => {
  const minimum = minHeight(dots, image.aspect);
  const atContentWidth = CONTENT_WIDTH / image.aspect;
  return clamp(atContentWidth, minimum, Math.max(bodyHeight(), minimum));
};
```

### 7.2 계산 결과 (재계산으로 검증함)

`BodyMapLayoutTest.kt`가 **전신 `220.0` / `505.2`뿐 아니라 확대 7장의 최소 폭도 전부 단언한다.** 기대값 맵이 그대로 소스에 있다(허용 오차 `CSV_TOLERANCE = 0.1` — 디자인 트랙의 `touch_48dp_check.csv`가 소수 한 자리로 반올림해 왔기 때문).

```kotlin
// BodyMapLayoutTest.`확대 화면의 최소 폭이 좌표표의 값과 같다`
"ANC:001" to 234.8, "ANC:002" to 232.3, "ANC:003" to 179.3, "ANC:004" to 156.2,
"ANC:013" to 157.1, "ANC:014" to 136.0, "ANC:012" to 209.0,
```

아래 표의 "최소 폭"은 식으로 다시 계산한 **정확값**이고, 괄호 안이 위 테스트의 기대값이다(0.1 이내라 둘 다 통과한다).

| 화면 | 가장 가까운 두 점 | 최소 분리값 | 최소 폭 (테스트 기대값) | 최소 높이 | **실제 판 높이** |
| --- | --- | --- | --- | --- | --- |
| 전신 앞면 | `ANC:002`↔`ANC:003` (목↔가슴, dy 0.095) | 0.21815 | **220.0** (220.0) | **505.2** | **505.2** |
| 전신 뒷면 | 점 1개 → 겹칠 상대 없음 | — | 0 | 0 | 505.2 (앞면값 사용) |
| 머리 확대 | `SUR:004`↔`SUR:005` (코↔입) | 0.20447 | 234.74 (234.8) | 345.8 | **471.4** |
| 목 확대 | `SUR:011`↔`SUR:012` | 0.20665 | 232.28 (232.3) | 170.3 | **234.7** |
| 가슴 확대 | `SUR:021`↔`SUR:022` | 0.26777 | 179.26 (179.3) | 115.2 | **205.6** |
| 배 확대 | `SUR:032` 좌↔우 | 0.30720 | 156.25 (156.2) | 156.25 | **320.0** |
| 팔 확대 | `SUR:065`↔`SUR:071` | 0.30558 | 157.08 (157.1) | 414.5 | **505.2** (전신값으로 상한 걸림) |
| 다리 확대 | `SUR:101`↔`SUR:102` | 0.35274 | 136.07 (136.0) | 352.1 | **505.2** (상한 걸림) |
| 허리·엉덩이 확대 | `SUR:041`↔`SUR:042` | 0.22960 | 209.06 (209.0) | 263.3 | **403.0** |

> 팔 이미지는 1 : 2.64로 아주 길어서 폭 320을 채우면 높이가 844가 된다. 그래서 전신 판(505.2)으로 위를 막는다.

> 확대 최소 폭은 전부 **`side = RIGHT`로 계산한 값**이다(테스트도 그렇게 부른다). 팔·다리는 `side = LEFT`면 좌표가 `1 - x`로 뒤집히는데, 반전은 두 점의 x 간격을 바꾸지 않아 분리값이 같다. 웹에서도 어느 쪽으로 재든 같은 높이가 나와야 한다.

> `BodyMapLayoutTest`가 함께 잠그는 것 넷: ① 가장 좁은 곳이 앞면의 목↔가슴이고 그 간격이 정확히 48dp, ② 계산한 높이에서 **모든 쌍**이 48dp 이상 떨어짐, ③ 뒷면은 점 1개라 최소 폭 0dp, ④ 확대 판 높이가 항상 `[최소치, 전신 판]` 안이고 폭이 320을 넘지 않음. 웹 포팅 시 이 넷을 그대로 옮기면 된다.

### 7.3 웹에서의 의미

- 판이 505px인데 iPhone 기준 뷰포트가 약 812px이고, 여기서 상태바 24 / 상단 내비 56 / 하단 CTA 72 / 제스처바 24를 빼면 **판 위에 쓸 수 있는 높이가 131px뿐**이다(`PORTFOLIO.md` 22장 실측). 진행 표시 + 제목만으로도 이 값을 넘는다.
- **그래서 판은 화면에 다 안 들어오고 본문이 스크롤된다.** 이건 버그가 아니라 의도된 트레이드오프다(줄이면 히트박스가 겹친다).
- 웹에서 인체도를 SVG로 그리면 히트 영역을 `<circle r="24">` 대신 `<path>` 영역 판정으로 넓힐 수 있으므로, **48px 비겹침 제약을 풀고 판을 화면에 맞춰 줄이는 선택도 가능하다.** 다만 그 순간 위 최소 높이 표는 무효가 되고, 대신 "점끼리 시각적으로 안 겹치는지"를 별도로 검증해야 한다.
- 안전한 초기 포팅: **505px 고정 + 세로 스크롤**로 안드로이드와 같게 가고, 추후 SVG 영역 판정으로 넘어가면서 줄인다.

---

## 8. 3D 좌표 자료 (참고 — 웹 포팅 대상 아님)

`BodyMap3dGeometry.kt`. 원본 `anchors3d.json` schema `humanmap-3d-anchors/2.0`.
좌표계: **Y 업 · 신장 1.0 · 원점이 발바닥과 정수리의 가운데(y는 −0.5~+0.5) · 앞면이 +Z.**
구역 점 46개(25종) · 앵커 점 9개 · 카메라 프레임 7개. 전신·피부는 3D 판정과 무관해 빠져 있다.

채택 문턱 `BODY_3D_PICK_MAX_DISTANCE = 0.1f` (신장의 10%). 이 거리를 넘으면 구역을 채택하지 않는다.

### 8.1 앵커 카메라 프레임 7개

| anchorId | back | oneSide | zoneCount | target (x, y, z) | span |
| --- | --- | --- | --- | --- | --- |
| `ANC:001` 머리 | false | false | 5 | 0.0, 0.4279, 0.0387 | 0.094 |
| `ANC:002` 목 | false | false | 2 | 0.0, 0.3575, 0.0187 | 0.052 |
| `ANC:003` 가슴 | false | false | 2 | 0.0, 0.2375, 0.0453 | 0.144 |
| `ANC:004` 배 | false | false | 2 | 0.0, 0.1100, 0.0618 | 0.100 |
| `ANC:013` 팔 | false | **true** | 6 | −0.1515, 0.1150, 0.0165 | 0.370 |
| `ANC:014` 다리 | false | **true** | 5 | −0.0670, −0.3150, 0.0289 | 0.330 |
| `ANC:012` 허리·엉덩이 | **true** | false | 3 | 0.0, 0.0500, −0.0517 | 0.150 |

카메라 거리 = `max(span * 3.4 + 0.12, 0.55)`, 보는 깊이는 `target.z * 0.5`.
전신 기본: `distance = 2.3`, `target = (0, 0.02, 0)`, 세로 FOV `28°`, pitch 한계 `±1.2`, 거리 범위 `0.45 ~ 2.6`.

### 8.2 3D 앵커 점 9개

| id | side | x | y | z |
| --- | --- | --- | --- | --- |
| `ANC:001` | CENTER | 0.0 | 0.455 | 0.06152 |
| `ANC:002` | CENTER | 0.0 | 0.345 | 0.02455 |
| `ANC:003` | CENTER | 0.0 | 0.250 | 0.05649 |
| `ANC:004` | CENTER | 0.0 | 0.080 | 0.06919 |
| `ANC:013` | RIGHT | −0.154 | 0.120 | 0.00479 |
| `ANC:013` | LEFT | 0.154 | 0.120 | 0.00537 |
| `ANC:014` | RIGHT | −0.065 | −0.250 | 0.01083 |
| `ANC:014` | LEFT | 0.065 | −0.250 | 0.01151 |
| `ANC:012` | CENTER | 0.0 | 0.070 | −0.05490 |

### 8.3 3D 구역 점 46개 (요약)

점 수를 실제로 세면 이렇다. **`SUR:042`(허리 옆) 하나만 좌우 각각 앞/뒤 두 점씩 = 4점**이고, `SUR:081`(엉덩이)은 좌우 1점씩 = 2점이다.

| 점 수 | 구역 | 개수 |
| --- | --- | --- |
| 1점 (CENTER) | `SUR:001` `SUR:004` `SUR:005` `SUR:011` `SUR:021` `SUR:041` | 6종 → 6점 |
| 2점 (좌·우) | 위 6종과 `SUR:042`를 뺀 나머지 전부 | 18종 → 36점 |
| **4점 (좌 앞뒤 · 우 앞뒤)** | **`SUR:042`** | 1종 → 4점 |
| | | **25종 · 46점** |

여기에 앵커 점 9개를 더해 `BodyMap3dGeometry.kt`에 `BodyMap3dPoint`가 **55개** 들어 있다.

| 구역 | 점 좌표 (x, y, z) |
| --- | --- |
| `SUR:001` C | 0.0, 0.465, 0.05684 |
| `SUR:002` R/L | ∓0.0178, 0.4374, 0.0519 |
| `SUR:003` R/L | ∓0.047, 0.4291, −0.0104 / −0.0111 |
| `SUR:004` C | 0.0, 0.4136, 0.07106 |
| `SUR:005` C | 0.0, 0.3907, 0.06047 |
| `SUR:011` C | 0.0, 0.342, 0.02388 |
| `SUR:012` R/L | ∓0.026, 0.373, 0.0160 |
| `SUR:021` C | 0.0, 0.275, 0.04534 |
| `SUR:022` R/L | ∓0.072, 0.200, 0.0453 |
| `SUR:031` R/L | ∓0.048, 0.160, 0.0626~0.0631 |
| `SUR:032` R/L | ∓0.043, 0.060, 0.0608 |
| `SUR:051` R/L | ∓0.128, 0.300, −0.0051 / −0.0060 |
| `SUR:055` R/L | ∓0.142, 0.210, −0.0136 / −0.0130 |
| `SUR:061` R/L | ∓0.154, 0.120, 0.0048 / 0.0054 |
| `SUR:065` R/L | ∓0.164, 0.060, 0.0133 |
| `SUR:071` R/L | ∓0.175, 0.005, 0.0403 / 0.0400 |
| `SUR:072` R/L | ∓0.170, −0.070, 0.0593 / 0.0590 |
| `SUR:090` R/L | ∓0.057, −0.150, 0.0410 |
| `SUR:091` R/L | ∓0.0585, −0.220, 0.0248 / 0.0251 |
| `SUR:097` R/L | ∓0.072, −0.310, 0.0056 / 0.0057 |
| `SUR:101` R/L | ∓0.069, −0.420, −0.0019 / −0.0020 |
| `SUR:102` R/L | ∓0.077, −0.480, 0.0752 / 0.0733 |
| `SUR:041` C | 0.0, 0.080, −0.05174 |
| `SUR:042` R×2 | −0.062, 0.120, 0.04966 / −0.04237 |
| `SUR:042` L×2 | 0.062, 0.120, 0.04943 / −0.04222 |
| `SUR:081` R/L | ∓0.075, −0.020, −0.0614 / −0.0609 |

(각 점은 표면 노멀 `nx, ny, nz`도 함께 들고 있다. 노멀은 **판정에 쓰지 않고** 카메라 반대쪽 점을 숨기는 데만 쓴다 — 뒷면 점이 허리·엉덩이뿐이라 노멀로 거르면 뒤에서 짚은 것이 전부 그쪽으로 빨려 들어간다. 숨김 문턱 `FACING_LIMIT = -0.12`.)

### 8.4 3D에서 고른 값이 2D 값이 되는 규칙 (`BodyMap3dPick.kt`)

3D는 **앵커 점으로 판정하지 않는다.** 전신에서도 후보는 구역 점 46개 전부이고, 가장 가까운 구역을 찾은 다음 그 구역의 앵커로 들어간다. 앵커 점 9개로 판정하면 발끝처럼 앵커에서 먼 자리가 채택 문턱(0.1)을 넘기기 때문이다.

| 함수 | 규칙 |
| --- | --- |
| `bodyMap3dCandidates(focus)` | `focus == null` → 구역 점 **전부**. `focus != null` → 그 앵커의 구역만, 그리고 한쪽만 담는 앵커(팔·다리)면 **보고 있는 쪽만** |
| `bodyMap3dNearest(hit, candidates)` | 유클리드 거리 최소. 노멀은 안 본다. 늘 가장 가까운 점을 돌려주고 `distance > 0.1`이면 `accepted = false` |
| `BodyMap3dPoint.toFocus()` | 확대해 들어갈 앵커. **좌우는 `oneSide` 앵커(팔·다리)에서만 물고 가고 나머지는 `CENTER`다** — 눈을 짚었다고 제목이 "왼쪽 머리 어디가 아프세요?"가 되면 안 된다 |
| `BodyMap3dPoint.toSelection()` | **3D 좌표의 좌우를 그대로 쓰지 않는다.** `bodyMapChoicesForZone(anchorId, zoneId)`(= 2D 갈래)에서 같은 `side`를 고르고, 없으면 첫 갈래, 그것도 없으면 3D 값 그대로. 두 자료가 어긋나도 저장 값이 2D 집합을 벗어나지 않게 막는 장치다 |

`BodyMap3dPickTest`가 이 일치를 붙잡는다 — `3D의 좌우가 2D의 갈래에 그대로 있다` · `3D 구역이 모두 온톨로지에 있다` · `3D 구역이 2D 구역을 모두 덮는다`.

---

## 9. 화면 레이아웃 (위 → 아래)

공통 껍데기는 `IntakeScreen.kt` + `StepContent`(`IntakeSteps.kt`).

```
┌───────────────────────────────────────────┐
│ MedicalMateNavBar  (GLASS)                │  높이 56, 제목 "기록", 좌측 뒤로가기
├───────────────────────────────────────────┤
│  ▼ 본문 (세로 스크롤, gutter 20, 자식 간격 14)│  top 12 / bottom 16
│  MedicalMateProgressIndicator             │  "증상 정리" · 1 / 4
│  ... 화면별 내용 (아래 9.1~9.5) ...          │
├───────────────────────────────────────────┤
│ MedicalMateBottomCtaBar                   │  gutter 20, 하단 안전여백 24, 자식 간격 10
│   [ 다음 ]  전체 폭, enabled = selection≠null │
└───────────────────────────────────────────┘
```

> 본문 스크롤 상태는 `scrollKey = bodyMap.screen`이다. **화면이 갈릴 때마다 스크롤이 맨 위로 돌아간다.** 이유: 아래로 내려 부위를 짚은 뒤 확대 화면이 그 위치로 열리면 제목이 잘린다. 웹도 화면 전환 시 `scrollTo(0,0)` 할 것.

### 9.1 `MAP_3D` — 3D 인체도 (현재 안드로이드 기본 화면)

`BodyMap3dStep.kt`. **Figma id 없음.**

| 순서 | 요소 | 내용 |
| --- | --- | --- |
| 1 | 진행 표시 | `증상 정리` 1 / 4 |
| 2 | 제목 `headingL` | 확대 전: **`어디가 아프세요?`** / 확대 중: **`{왼쪽 무릎} 어디가 아프세요?`** |
| 3 | 설명 `bodyM/fgSubtle` | 확대 전: **`아픈 곳을 짚으면 그 부위로 들어가요. 끌면 돌고 오므리면 커져요.`** / 확대 중: **`더 짚어주시면 문답이 짧아져요. 애매하면 가까운 곳으로 고르셔도 괜찮아요.`** |
| 4a | **확대 전** 조작 | `MedicalMateSegmentedControl` [`앞면`, `뒷면`] — 선택 인덱스를 **카메라 각도에서 읽는다**(손으로 돌려 둔 상태도 반영) |
| 4b | | `SideAnchorRow`: `MedicalMateChip` **`전신`** · **`피부`** + `Spacer(weight 1)` + `MedicalMateButton(GHOST, S)` **`목록에서 고르기`** |
| 4c | **확대 중** 조작 | `Row(간격 8)`: `MedicalMateButton(OUTLINE, M, weight 1)` **`다른 부위 보기`** + (팔·다리일 때만) `MedicalMateButton(OUTLINE, M, weight 1)` **`반대쪽 보기`** |
| 5 | 판 `BodyMapCard` | 높이 505.2, `bgSubtle`, radius `md`, `orientationLabels = false` |
| 5-1 | 판 안 | `TextureView`(Filament) + 구역/앵커 점 Canvas + (selection 있을 때) 우상단 `MedicalMateIconButton(TONAL, M, Close)` — contentDescription **`고른 부위 지우기`**, 모서리에서 8 띄움 |
| 5-2 | 판 하단 중앙 | `SelectionCaption` 알약 — `bgInverse` 바탕, `labelM/fgOnInverse`, 좌우 12 · 상하 6 padding, 판 안쪽 아래 12. 텍스트는 `selection.label()` (예: `무릎(왼쪽)`) |
| 6 | 판정 실패 안내 `bodyM/fgSubtle` | 몸 밖: **`몸 바깥을 짚었어요. 몸 위를 짚어주세요.`** / 너무 멂: **`여기가 어디인지 알기 어려워요. 조금 더 가운데를 짚어주세요.`** |
| 7 | 하단 CTA | **`다음`**, `enabled = selection != null` |

3D 전용 동작:
- `LaunchedEffect(focus, resets)` — 부위가 바뀌면 카메라가 460ms `FastOutSlowInEasing`으로 미끄러진다. 순간이동시키면 어디로 들어갔는지 알 수 없다.
- `BringIntoViewRequester` — 열 때 / 부위 바꿀 때 / 손 댈 때 판 전체를 화면 안으로 끌어온다.
- 제스처: 끌기 = 회전(yaw = −panX/width·2π, pitch = panY/height·π), 핀치 = 확대, 탭 = 짚기.
- 탭 판정은 `Dispatchers.Default`에서 한다(삼각형 46,000개를 도는 일이라 프레임을 밀지 않으려고).

### 9.2 `ANCHOR` — 2D 전신 앵커 화면 (1l-1 앞면 / 1l-3 뒷면)

`BodyMapStep.kt` `ImagePicker` + `AnchorCard`. **웹 포팅의 기준 화면.**

| 순서 | 요소 | 내용 |
| --- | --- | --- |
| 1 | 진행 표시 | `증상 정리` 1 / 4 |
| 2 | 제목 `headingL/fgDefault` | **`어디가 아프세요?`** |
| 3 | (설명 없음) | **의도적으로 뺐다.** `intake_body_part_description`(`가장 불편한 곳 하나를 짚어주세요. 나머지는 문답에서 여쭤볼게요.`)이 리소스에 있지만 앵커 화면에서 쓰지 않는다 — 두 줄을 쓰면 그만큼 판이 내려가 다리 점이 하단 버튼 뒤로 들어간다. 시안에 있는 문구를 지운 것이라 디자인 트랙에 남겼다 |
| 4 | `MedicalMateSegmentedControl` | [**`앞면`**, **`뒷면`**], `selectedIndex = view.ordinal` |
| 5 | `SideAnchorRow` | `MedicalMateChip` **`전신`**(`ANC:010`) · **`피부`**(`ANC:011`) + Spacer + `MedicalMateButton(GHOST, S)` **`목록에서 고르기`** |
| 6 | 판 `BodyMapCard` | 높이 505.2, radius `md` clip, `bgSubtle`. `orientationLabels = true`(앞면일 때) |
| 6-1 | 판 좌상단 / 우상단 | `OrientationLabel` **`오른쪽`** / **`왼쪽`** — `labelS/fgMuted`, `bgSurface` 바탕, radius `xs`, 좌우 6·상하 2 padding, 판 안쪽 12. **스크린 리더에서는 읽히지 않게 한다**(`clearAndSetSemantics {}`) |
| 6-2 | 판 안 | 전신 이미지(종횡비 유지, 가운데 정렬) + 앵커 점 8개(앞면) / 1개(뒷면) |
| 6-3 | 판 하단 중앙 | `SelectionCaption` — `selection?.label()`이 있을 때만 |
| 7 | 하단 CTA | **`다음`**, `enabled = selection != null` |

> 뒷면은 화면 방향과 본인 좌우가 같아서 `오른쪽`/`왼쪽` 라벨을 붙이지 않는다.

### 9.3 `ZONE` — 2D 구역 확대 화면 (1l-2)

`BodyMapStep.kt` `ImagePicker` + `ZoneCard`.

| 순서 | 요소 | 내용 |
| --- | --- | --- |
| 1 | 진행 표시 | `증상 정리` 1 / 4 |
| 2 | 제목 `headingL` | **`{부위} 어디가 아프세요?`** — `{부위}`는 `focus.title()`. 예: `왼쪽 다리 어디가 아프세요?`, `머리 어디가 아프세요?` |
| 3 | 설명 `bodyM/fgSubtle` | **`더 짚어주시면 문답이 짧아져요. 애매하면 가까운 곳으로 고르셔도 괜찮아요.`** (확대 화면은 판이 짧아 여유가 있어 남겼다) |
| 4 | `MedicalMateButton(OUTLINE, M, fillMaxWidth)` | **`다른 부위 보기`** — 세그먼트 토글과 **같은 자리, 같은 높이**를 쓴다. 하나가 사라지고 다른 것이 나타나면 확대 애니메이션 중에 판이 위아래로 튄다 |
| 5 | 판 `BodyMapCard` | 높이 = 7.2절 표의 부위별 값. `orientationLabels = detail.view == FRONT && !detail.mirrored` → **머리·목·가슴·배만 좌우 라벨을 단다**(팔·다리는 mirrored, 허리·엉덩이는 BACK) |
| 5-1 | 판 안 | 확대 이미지(`mirrored && focus.side == LEFT`면 `scaleX(-1)`) + 구역 점 |
| 5-2 | 판 하단 | `SelectionCaption` — `selection`이 **이 확대 화면에 속할 때만**(`belongsTo(focus.anchorId, focus.side)`) |
| 6 | 하단 CTA | **`다음`**, `enabled = selection != null` |

> **고른 뒤에도 이 화면에 머문다.** 고른 점이 브랜드색으로 바뀌고 아래 알약에 이름이 나오는데, 곧바로 앵커 화면으로 돌아가면 그 둘을 볼 수 없다.

### 9.4 `LIST` — 목록에서 고르기

`BodyMapPartList.kt`. 인체도를 못 쓰는 사람을 위한 **대체 경로**. 이유(주석 원문 요지): 이미지 위 좌표 조작은 스크린 리더로 쓸 수 없고, 확대해도 손이 떨리면 짚기 어렵고, 그림이 벗은 몸이라 사람 앞에서 열기 부담스러울 수 있다.

| 순서 | 요소 | 내용 |
| --- | --- | --- |
| 1 | 진행 표시 | `증상 정리` 1 / 4 |
| 2 | 제목 `headingL` | **`아픈 부위를 골라주세요`** (인체도 화면과 문구가 다르다) |
| 3 | `Row(정렬 End)` | `MedicalMateButton(GHOST, S)` **`인체도에서 고르기`** — 인체도 쪽 전환 버튼과 **같은 무게(GHOST, S)**로 맞춘다. 전체 폭 Outline로 두면 같은 일이 다른 크기로 보이고 목록 한 줄을 통째로 먹는다 |
| 4 | `MedicalMateSearchField` | placeholder **`부위 이름으로 찾기`**, 지우기 버튼 contentDescription **`검색어 지우기`** |
| 5 | 본문 (아래 세 갈래 중 하나) | `searching` → 검색 결과 / `pickingZone` → 구역 목록 / 그 외 → 앵커 목록 |
| 6 | 하단 CTA | **`다음`**, `enabled = selection != null` |

#### 5-A. 앵커 목록 (`AnchorRows`) — 기본

`bodyMapAnchors` 순서(= 전신, 피부, 머리, 목, 가슴, 배, 팔, 다리, 허리·엉덩이)로 그린다.
줄 사이는 **여백 없이** `MedicalMateDivider`(둘째 줄부터 위에)로만 가른다. 단계 본문의 자식 간격 14가 줄에 걸리면 목록이 아니라 흩어진 버튼처럼 보인다.

| 앵커 | 줄 수 | 컴포넌트 | 라벨 |
| --- | --- | --- | --- |
| 전신 `ANC:010` | 1 | `MedicalMateRadio` | `전신` |
| 피부 `ANC:011` | 1 | `MedicalMateRadio` | `피부` |
| 머리 `ANC:001` | 1 | `MedicalMateListRow`(chevron) | `머리` |
| 목 `ANC:002` | 1 | `MedicalMateListRow` | `목` |
| 가슴 `ANC:003` | 1 | `MedicalMateListRow` | `가슴` |
| 배 `ANC:004` | 1 | `MedicalMateListRow` | `배` |
| 팔 `ANC:013` | **2** | `MedicalMateListRow` ×2 | `오른쪽 팔` / `왼쪽 팔` |
| 다리 `ANC:014` | **2** | `MedicalMateListRow` ×2 | `오른쪽 다리` / `왼쪽 다리` |
| 허리·엉덩이 `ANC:012` | 1 | `MedicalMateListRow` | `허리·엉덩이` |
| **합계** | **11줄** | | |

- 구역이 있는 앵커 줄은 **고르는 것이 아니라 하위 목록으로 들어가는 이동**이다 → chevron 있는 `List Row`.
- 그 앵커 안에서 고른 부위가 있으면 보조 텍스트(meta)에 **`고른 부위: {무릎(왼쪽)}`** 를 적는다(`R.string.body_map_list_picked` = `고른 부위: %1$s`). 들어가지 않고도 무엇이 골라졌는지 보여야 하고, 앵커 이름만으로는 "다리"까지만 알 수 있다.
- 전신·피부는 구역이 없어 **그 줄이 곧 선택** → `MedicalMateRadio`. 라디오를 쓴 이유: 역할과 선택 상태를 시맨틱에 실어 스크린 리더가 "선택됨"을 읽는다. 배지는 텍스트로 읽히긴 해도 선택이라는 **상태**로 전달되지 않는다.

#### 5-B. 구역 목록 (`ZoneRows`) — 앵커 줄을 누른 뒤

| 순서 | 요소 | 내용 |
| --- | --- | --- |
| 1 | `MedicalMateSectionHeader` | `title = focus.title()` (예: `왼쪽 다리`). 화면 제목이 `아픈 부위를 골라주세요`로 같아서 지금 무엇의 하위 목록인지가 드러나지 않기 때문 |
| 2 | 목록 | `bodyMapZoneChoices(anchor, focus.side)` 각각 `MedicalMateRadio`, 라벨 `choice.title()` |
| 3 | `MedicalMateButton(OUTLINE, M, fillMaxWidth)` | **`다른 부위 보기`** |

줄 수 예: `왼쪽 다리` → `왼쪽 허벅지`, `왼쪽 무릎`, `왼쪽 종아리`, `왼쪽 발목`, `왼쪽 발` (5줄).
`머리` → `머리 전체·이마`, `오른쪽 눈`, `왼쪽 눈`, `오른쪽 귀`, `왼쪽 귀`, `코`, `입` (7줄).

#### 5-C. 검색 결과 (`SearchRows`)

- 줄의 모양은 목록과 **같다**. 검색이 하는 일은 찾는 것까지이고 고르는 방식까지 바꾸면 두 길이 다르게 동작한다. 갈래는 **셋**이다(`SearchRows` / `AnchorResultRows`):

  | 걸린 것 | 판별 | 줄 | 누르면 |
  | --- | --- | --- | --- |
  | 구역 (`SUR:*`) | `bodyMapAnchorIdOfZone(id) != null` | `MedicalMateRadio` × `bodyMapChoicesForZone()` 갈래 수 | `onBodyPartSelect(choice)` |
  | 구역이 있는 앵커 (머리·목·가슴·배·팔·다리·허리엉덩이) | `anchor.zones.isNotEmpty()` | `MedicalMateListRow`(chevron), 앵커의 **점 수만큼** (팔·다리는 2줄) | `onBodyAnchorFocus(entry)` → 구역 목록 |
  | **구역이 없는 앵커 (전신 `ANC:010` · 피부 `ANC:011`)** | `anchor.zones.isEmpty()` | **`MedicalMateRadio`** (`List Row`가 아니다) | **`onBodySideAnchorClick(anchorId)`** — 다시 누르면 풀린다 |

  즉 `전신`·`피부`는 검색 결과에서도 앵커 목록에서와 똑같이 **라디오 한 줄이 곧 선택**이다. 문서 초안이 "앵커는 전부 `List Row`"로 적으면 이 두 줄이 틀린다.
- 점수 0으로 딸려 온 구역도 **그냥 이어 붙인다** — 사용자가 보기에 "다리"를 쳐서 나온 무릎과 "무릎"을 쳐서 나온 무릎이 다른 줄일 이유가 없다.
- 결과의 구역이 좌우로 갈리면 **두 줄**이 된다(`bodyMapChoicesForZone`). 팔·다리 구역은 목록에선 어느 쪽 팔로 들어왔는지로 정해지지만 검색은 그 단계를 건너뛰므로 양쪽을 다 만들어 준다.
- 결과 0건이면 목록 대신 안내 한 줄: **`그런 부위는 없어요. 다른 이름으로 찾아보세요.`** (`bodyM/fgSubtle`)

---

## 10. 화면 문구 — 원문 그대로

`app/src/main/res/values/strings.xml` 263~289행. **웹앱에서 이 글자 그대로 재현할 것.**

| 리소스 키 | 문구 | 쓰이는 곳 |
| --- | --- | --- |
| `intake_title` | `기록` | 상단 내비 제목 |
| `intake_progress_label` | `증상 정리` | 진행 표시 라벨 (`증상 정리` 1 / 4) |
| `intake_next` | `다음` | 하단 CTA |
| `intake_body_part_question` | `어디가 아프세요?` | 앵커 화면 / 3D 전신 화면 제목 |
| `intake_body_part_description` | `가장 불편한 곳 하나를 짚어주세요. 나머지는 문답에서 여쭤볼게요.` | **현재 코드에서 사용하지 않음** (앵커 화면에서 뺐다) |
| `body_map_view_front` | `앞면` | 세그먼트 컨트롤 |
| `body_map_view_back` | `뒷면` | 세그먼트 컨트롤 |
| `body_map_orientation_right` | `오른쪽` | 판 좌상단 좌우 안내 (앞면만) |
| `body_map_orientation_left` | `왼쪽` | 판 우상단 좌우 안내 (앞면만) |
| `body_map_zone_question` | `%1$s 어디가 아프세요?` | 확대 화면 제목. `%1$s` = `focus.title()` |
| `body_map_zone_description` | `더 짚어주시면 문답이 짧아져요. 애매하면 가까운 곳으로 고르셔도 괜찮아요.` | 확대 화면 설명 |
| `body_map_other_anchor` | `다른 부위 보기` | 확대 화면 되돌아가기 (2D·3D·목록 공통) |
| `body_map_list_picked` | `고른 부위: %1$s` | 목록 앵커 줄의 보조 텍스트. `%1$s` = `selection.label()` |
| `body_map_use_list` | `목록에서 고르기` | 인체도 → 목록 |
| `body_map_use_image` | `인체도에서 고르기` | 목록 → 인체도 |
| `body_map_3d_description` | `아픈 곳을 짚으면 그 부위로 들어가요. 끌면 돌고 오므리면 커져요.` | 3D 전신 화면 설명 |
| `body_map_3d_flip_side` | `반대쪽 보기` | 3D 확대 화면 (팔·다리만) |
| `body_map_3d_reset` | `고른 부위 지우기` | 3D 판 우상단 아이콘 버튼의 접근성 이름 |
| `body_map_3d_off_body` | `몸 바깥을 짚었어요. 몸 위를 짚어주세요.` | 3D 판정 실패 (레이가 몸에 안 닿음) |
| `body_map_3d_too_far` | `여기가 어디인지 알기 어려워요. 조금 더 가운데를 짚어주세요.` | 3D 판정 실패 (거리 > 0.1) |
| `body_map_search_placeholder` | `부위 이름으로 찾기` | 검색 입력 placeholder |
| `body_map_search_clear` | `검색어 지우기` | 검색 지우기 버튼 접근성 이름 |
| `body_map_search_empty` | `그런 부위는 없어요. 다른 이름으로 찾아보세요.` | 검색 0건 안내 |
| `body_map_list_question` | `아픈 부위를 골라주세요` | 목록 화면 제목 |

### 10.1 동적으로 만들어지는 문구

| 형식 | 규칙 | 예 |
| --- | --- | --- |
| `label()` — 알약 | `{이름}` + `(왼쪽)` / `(오른쪽)`, CENTER·BASE면 접미 없음 | `무릎(왼쪽)`, `가슴 가운데` |
| `title()` — 제목·라디오 라벨·접근성 | `왼쪽 ` / `오른쪽 ` + `{이름}` | `왼쪽 무릎`, `머리 전체·이마` |
| 확대 제목 | `{title()} 어디가 아프세요?` | `왼쪽 다리 어디가 아프세요?` |
| 목록 앵커 meta | `고른 부위: {label()}` | `고른 부위: 무릎(왼쪽)` |
| **다음 단계로 넘어갈 때** | `bodyPart = selection.title()` → 3단계 물음에서 `withSubjectParticle()`로 조사가 붙는다 | `왼쪽 무릎` → `왼쪽 무릎이 얼마나 아프세요?` |

> **조사 규칙(`withSubjectParticle`)** — 문구는 리소스에 두고 조사는 상태가 계산한다. 이름 끝에 괄호가 붙는 것이 있어(`가슴 옆(갈비)`) **마지막 한글 음절**을 찾아서 종성 유무를 본다. 종성 있으면 `이`, 없으면 `가`. 한글 음절 영역 `0xAC00~0xD7A3`, 종성 개수 28.
> 웹 구현: `const hasJong = (code - 0xAC00) % 28 !== 0;`

---

## 11. 디자인 시스템 컴포넌트 — 화면별

| 화면 | 사용 컴포넌트 |
| --- | --- |
| 공통 껍데기 | `MedicalMateNavBar`(`MedicalMateSurfaceStyle.GLASS`), `MedicalMateProgressIndicator`, `MedicalMateBottomCtaBar`, `MedicalMateButton` |
| `ANCHOR` (1l-1 / 1l-3) | `MedicalMateSegmentedControl`, `MedicalMateChip` ×2, `MedicalMateButton`(GHOST, S), `BodyMapCard`(내부: `MedicalMateRadius.md`, `colors.bgSubtle`, `typography.labelS/labelM`, `colors.fgMuted`/`fgOnInverse`/`bgInverse`/`bgSurface`) |
| `ZONE` (1l-2) | `MedicalMateButton`(OUTLINE, M), `BodyMapCard` |
| `MAP_3D` | `MedicalMateSegmentedControl`, `MedicalMateChip` ×2, `MedicalMateButton`(GHOST S / OUTLINE M), `MedicalMateIconButton`(TONAL, M, `MedicalMateIcons.Close`), `BodyMapCard` |
| `LIST` | `MedicalMateSearchField`, `MedicalMateSectionHeader`, `MedicalMateListRow`, `MedicalMateRadio`, `MedicalMateDivider`, `MedicalMateButton`(GHOST S / OUTLINE M) |

### 11.1 토큰

| 토큰 | 값 | 쓰임 |
| --- | --- | --- |
| `MedicalMateSize.touchMin` | 48dp | 점 조작 영역, 좌표 비겹침 기준 |
| `MedicalMateSize.gutter` | 20dp | 본문 좌우 여백 |
| `MedicalMateSize.contentWidth` | 320dp | 확대 판 폭 계산 기준 |
| `MedicalMateSize.screenWidth` | 360dp | 기준 화면 폭 (고정하지 않음) |
| `MedicalMateSize.safeBottom` | 24dp | CTA 바 하단 |
| `MedicalMateSize.navBarHeight` | 56dp | 상단 내비 |
| `MedicalMateSpace` | **이 화면이 쓰는 것**: s2(2) / s6(6) / s8(8) / s12(12) / s14(14) / s16(16). 컴포넌트가 안에서 쓰는 것: s10(10, CTA 자식 간격) · s24(24) | 토큰 전체는 s2·s4·s6·s8·s10·s12·s14·s16·s20·s24·s32·s40 |
| `MedicalMateRadius` | `xs`(좌우 라벨), `md`(판·알약) | |
| 색 | `bgSubtle`(판 바탕), `bgSurface`(라벨 바탕·점 흰 테), `bgInverse`/`fgOnInverse`(알약), `bgPrimary`(고른 점), `fgDefault`(점 코어), `fgMuted`(좌우 라벨), `fgSubtle`(설명·안내) | |
| 타이포 | `headingL`(제목), `bodyM`(설명·안내), `labelS`(좌우 라벨), `labelM`(알약) | |

### 11.2 점(dot) 시각 규격

| 항목 | 2D 인체도 | 3D 인체도 |
| --- | --- | --- |
| 조작 영역 | 48dp 정사각(원형 clip) | 몸 표면 전체(레이캐스트) |
| 고른 점 halo / core | 22dp `bgSurface` / 14dp `bgPrimary` | 22dp `bgSurface` / 14dp `bgPrimary` (동일) |
| 안 고른 점 halo / core | 22dp `fgDefault @ 10%` / 14dp `fgDefault @ 28%` | **16dp `bgSurface` / 9dp `fgDefault`** (한 치수 작고 흰 테는 불투명) |
| Figma 출처 | `Point` 마스터 22×22, `Core` 14×14, `ink-10` / `ink-28` | — |
| 좌표 | `offset(x = fitted.width * dot.x - 24, y = fitted.height * dot.y - 24)` | 카메라 투영 |

> 3D에서 점을 다르게 그린 이유: 2D는 흰 판 위라 흐린 회색으로도 보이는데, 3D는 점이 살갗 위에 얹히고 그 살갗이 빛에 따라 밝기가 변해서 회색만으로는 묻힌다.

---

## 12. 검색 — `BodyPartSearch.kt` 알고리즘 전체

AI 트랙의 `docs/android-body-search.md`를 옮긴 것. **서버를 부르지 않는다.**
(같은 규칙의 `GET /v1/ontology/search`가 있지만 한 글자마다 왕복하게 된다. 앵커 9 · 구역 25 · 별칭 122 = 한 번 찾는 데 문자열 비교 156회. 색인 없이 전수로 충분하다.)

### 12.1 정규화

```ts
const SEPARATORS = '·()（）,.';
const normalize = (v: string) =>
  [...v].filter(c => !/\s/.test(c) && !SEPARATORS.includes(c)).join('').toLowerCase();
```

`허리 옆(옆구리)` → `허리옆옆구리` → 질의 `옆구리`로도 걸린다.

### 12.2 점수

| 조건 | 점수 |
| --- | --- |
| `candidate === query` | `3` (SCORE_EXACT) |
| `candidate.startsWith(query) \|\| query.startsWith(candidate)` | `2` (SCORE_PREFIX) |
| `candidate.includes(query) \|\| query.includes(candidate)` | `1` (SCORE_CONTAINS) |
| 그 외 | `0` (제외) |

**양방향으로 본다.** 질의가 후보보다 길 수 있다 — "왼쪽 아랫배가 아파요"처럼 문장을 넣으면 후보 `아랫배`가 질의 안에 들어 있다.

### 12.3 노드 한 개의 점수

이름과 별칭을 **모두 후보로 보고 가장 높은 점수 하나만** 쓴다. 같은 점수가 여럿이면 **먼저 나온 후보**가 걸린 것으로 둔다(이름이 별칭보다 앞, 별칭은 응답 차례). 서버가 그렇게 하고 있어서 `matched`가 갈린다 — `목`이 `손목`에 걸릴 때 별칭 `손목 관절`이 아니라 이름 `손목`이 나온다.

### 12.4 정렬

```
1. score 내림차순
2. matched.length 내림차순     ← 구체적인 쪽을 앞에. "왼쪽 아랫배가 아파요"는 "아랫배"와 "배"에 다 걸린다
3. isAnchor 내림차순           ← 앵커 우선
4. id 오름차순
```

### 12.5 앵커 펼치기

걸린 앵커의 구역을 뒤에 붙인다(점수 0). 목록에서 "다리"를 치면 무릎·종아리도 후보로 보여야 한다.

**점수 1(부분 포함)인 앵커는 펼치지 않는다.** AI 트랙이 여기서 한 번 틀렸다 — "전체"가 "머리 전체"·"팔 전체"에 스쳐 앵커 넷이 펼쳐졌고, 23건이 되어 상한에서 잘리는 바람에 정작 눈·귀만 남았다.

조건: `isAnchor && score >= SCORE_PREFIX(2)`. 이미 결과에 있는 구역 id는 건너뛴다.

### 12.6 상한

| 상수 | 값 |
| --- | --- |
| `RESULT_LIMIT` | `8` (지금 데이터에서 8건을 넘는 질의는 없다) |
| `QUERY_MAX_LENGTH` | `300` (발화 상한과 같음. 거절하지 않고 자른다) |

### 12.7 의도적으로 안 하는 것

- **한/영 자판 오타 복원 없음.** 서버는 `qo`를 "배"로 고쳐 주지만 두벌식 조합 오토마타를 옮기는 비용이 얻는 것보다 크다고 AI 트랙과 정했다(2026-09-11). **앱과 서버 결과가 이 지점에서 갈린다. 사고가 아니라 결정이다.** 웹도 같게 둘 것.
- **증상·병명은 걸리지 않는다.** 데이터에 부위 이름과 별칭만 있어서 저절로 그렇게 된다. `감기`나 `무릅`(오타)이 0건인 것이 **맞는 동작**이다.
- 검증: `BodyPartSearchTest`가 165케이스를 **순서까지** 대조한다. 웹 포팅 시 이 테스트 벡터를 그대로 옮기는 것을 강력히 권한다.
  - 벡터 파일: **`app/src/test/resources/ontology/body-search-vectors.json`** (테스트 상수 `VECTORS = "/ontology/body-search-vectors.json"`). AI 트랙이 만들어 준 것이라 앱이 손대지 않는다.
  - 기대값 형식은 `"{id}|{matched}|{score}"` 문자열 목록이고 **차례가 곧 기대값**이다.
  - 케이스 구성(테스트 주석): 이름·별칭 **156개 전부** + 문장 3개 + 여러 앵커에 걸치는 질의 + 0건 케이스.
  - 함께 단언하는 것: 케이스가 정확히 165개인지, 모든 기대 결과가 **8건 이하**인지(`RESULT_LIMIT`).
- 상태 규칙은 `BodyMapSearchStateTest`가 따로 본다 — 조합 중간 상태에서 결과 유지, 검색어를 비우면 결과도 비움, 검색 결과에서 앵커를 누르면 검색이 닫히고 구역 목록으로 감, 인체도로 돌아가면 검색이 닫힘, 좌우가 갈리는 구역은 두 갈래.

---

## 13. 조작 — `BodyMapActions` 전체

`BodyMapActions.kt`. 상태를 갖지 않고 `update((BodyMapUiState) -> BodyMapUiState)` 창구로만 고친다.

| 함수 | 트리거 | 상태 변화 |
| --- | --- | --- |
| `onViewChange(view)` | 앞/뒤 세그먼트 | `view = view`. **고른 부위는 지우지 않는다** (반대 면을 보다가 돌아올 수 있다) |
| `onDotClick(dotId)` | 인체도 점 탭 | 먼저 `parseDotId`로 `id@SIDE`를 가른다. 판별은 **`ANC:` 접두사 하나뿐**이다(`ANCHOR_ID_PREFIX`) — `SUR:`를 보지 않고 "`ANC:`가 아니면 구역"으로 다룬다.<br>**`ANC:`가 아님** → `selection = {focus.anchorId, id, side}`. `focus`가 `null`이면 **상태를 그대로 돌려주고 아무 일도 하지 않는다**.<br>**`ANC:`로 시작** → 구역이 있으면 `focus = {id, side}`(확대, **고르는 것이 아님**, `selection`은 건드리지 않는다), 구역이 없으면(전신·피부) `focus = null, selection = {id, side}` |
| `onSideAnchorSelect(anchorId)` | 전신·피부 칩 | `focus = null`, `selection = (기존과 같으면 **null**, 아니면 {anchorId})`. **고른 칩을 다시 누르면 풀린다**(#235) — 잘못 눌렀을 때 되돌릴 길 |
| `onAnchorFocus(selection)` | 목록 앵커 줄 / 3D 앵커 짚기 / 3D 반대쪽 보기 | `focus = selection`, `search = ""`, `searchResults = []`. **검색을 함께 닫는다** — 검색 결과에서 앵커를 누르면 그 앵커의 구역 목록으로 가야 하는데 검색어가 남으면 계속 결과를 그려 아무 일도 안 한 것처럼 보인다 |
| `onPartSelect(selection)` | 목록 구역 라디오 / 3D 구역 짚기 | `selection = selection` |
| `onFocusClear()` | `다른 부위 보기` / 뒤로가기(확대 중) | `focus = null`. **고른 부위는 남는다** — 확대를 닫는 것과 고른 것을 버리는 것은 다른 일이다 |
| `onReset()` | 3D 판 우상단 X | `focus = null, selection = null`. **검색어는 건드리지 않는다** |
| `onListModeToggle()` | `목록에서 고르기` / `인체도에서 고르기` | `byList = !byList`, `byMap3d = !byList'`, `search = ""`, `searchResults = []`. **목록을 닫으면 3D로 돌아간다**(#239) |
| `onMap3dToggle()` | (**UI 호출부 없음**) | `byMap3d = !byMap3d, byList = false, search = "", searchResults = []` |
| `onSearchChange(query)` | 검색 입력 | `search = query` (**자르지 않고 그대로**); `searchResults =` query가 공백 → `[]`, 찾은 게 0건 → **직전 결과 유지**, 그 외 → 찾은 결과. 300자 절단은 `searchBodyParts` 안에서만 일어난다 |

### 13.1 웹 상태 머신 요약

```
[전신 화면]                    focus=null, selection=?
  ├─ 앞/뒤 토글 ──────────────→ view 변경 (같은 화면)
  ├─ 앵커 점 탭 (구역 有) ─────→ [확대 화면] focus={anchorId, side}
  ├─ 전신/피부 칩 탭 ─────────→ selection 토글 (같은 화면)
  └─ "목록에서 고르기" ────────→ [목록 화면]

[확대 화면]                    focus≠null
  ├─ 구역 점 탭 ──────────────→ selection 설정 (화면 유지, 알약·브랜드색 표시)
  ├─ "다른 부위 보기" ────────→ [전신 화면] (selection 유지)
  └─ 뒤로가기 ───────────────→ [전신 화면] (selection 유지)

[목록 화면]                    byList=true, focus=null
  ├─ 앵커 줄 탭 ──────────────→ [목록-구역] focus 설정 + 검색 초기화
  ├─ 전신/피부 라디오 ────────→ selection 토글 (같은 화면)
  ├─ 검색어 입력 ─────────────→ [목록-검색결과]
  ├─ "인체도에서 고르기" ─────→ [전신 화면(안드로이드는 3D)] + 검색 초기화
  └─ 뒤로가기 ───────────────→ ★ 홈으로 나감 (인체도로 돌아가지 않는다)

[목록-구역]                    byList=true, focus≠null
  ├─ 구역 라디오 ─────────────→ selection 설정 (화면 유지)
  ├─ "다른 부위 보기" ────────→ [목록] (focus=null)
  └─ 뒤로가기 ───────────────→ [목록] (focus=null, byList 유지)

[목록-검색결과]                byList=true, search≠""
  ├─ 구역 라디오 ─────────────→ selection 설정 (결과 유지)
  ├─ 앵커 줄 탭 ──────────────→ [목록-구역] + 검색 닫힘
  ├─ 전신/피부 라디오 ────────→ selection 토글 (결과 유지)
  └─ 검색어 비움 ─────────────→ [목록 화면]
```

> `selection`은 **어느 경로로 가도 지워지지 않는다.** 지우는 것은 두 가지뿐이다 — 3D 판의 X(`onReset`), 그리고 이미 고른 전신·피부 칩/라디오를 다시 누르는 것(`onSideAnchorSelect`의 토글).

---

## 14. 네비게이션 — 이 화면에서 나가는 모든 경로

### 14.1 화면 바깥으로 나가는 길 (목적지를 떠남)

| # | 트리거 | 조건 | 도착 | 부수 효과 |
| --- | --- | --- | --- | --- |
| 1 | 하단 **`다음`** 버튼 | `bodyMap.selection != null` (`canLeaveBodyPart`) | `IntakeStep.SYMPTOM_CHAT` (같은 목적지의 2단계, 1c) | `bodyPart = selection.title()`, `messages = []`, `awaitingReply = true`, 그리고 **`POST /api/sessions` 호출**(15장) |
| 2 | 상단 내비 뒤로가기 | `bodyMap.focus == null` (확대 안 한 상태) | **`onExit()` — 증상 정리 흐름 전체를 벗어난다** (홈으로) | 없음. 세션이 아직 없으므로 서버에 남는 것도 없다 |

> `IntakeUiState.canGoBack = step != IntakeStep.entries.first() || bodyMap.focus != null`.
> `IntakeRoute`: `onBackClick = { if (state.canGoBack) viewModel.onBack() else onExit() }`.
> 그리고 `IntakeViewModel.onBack()`은 `step == BODY_PART`일 때 **`focus != null`이면 `onFocusClear()`만 하고 아무 데도 안 간다.**

> **조건이 `focus`뿐이고 `byList`를 보지 않는다.** 그래서 뒤로가기는 화면이 아니라 `focus`만 본다:
>
> | 지금 화면 | `focus` | 뒤로가기 결과 |
> | --- | --- | --- |
> | 3D 전신 / 2D 앵커 | `null` | **홈으로 나간다** (`onExit`) |
> | 3D 확대 / 2D 확대 | 있음 | `onFocusClear()` → 전신 화면 (selection 유지) |
> | **목록 (앵커 목록)** | `null` | **홈으로 나간다** — 목록에서 인체도로 돌아가지 않고 흐름을 통째로 벗어난다. `byList`는 그대로 `true`로 남지만 목적지가 사라지므로 상태도 함께 사라진다 |
> | **목록 (구역 목록)** | 있음 | `onFocusClear()` → **목록의 앵커 목록** (`byList`는 유지). 화면이 목록에서 목록으로 얕아진다 |
>
> 웹에서 브라우저 뒤로가기에 이 흐름을 얹을 때, **"목록 → 뒤로 → 인체도"가 아니라 "목록 → 뒤로 → 홈"** 이라는 점을 놓치기 쉽다. 안드로이드와 같게 가려면 그렇게 두고, 고치려면 그것은 안드로이드에 없는 동작을 더하는 결정이다.

### 14.2 화면 안에서의 이동 (목적지를 떠나지 않음)

| 트리거 | 이동 |
| --- | --- |
| 세그먼트 `앞면` / `뒷면` | `view` 전환. 2D는 이미지 교체, 3D는 카메라 회전(가장 가까운 각으로) |
| 앵커 점 탭 (구역 有) | → 확대 화면. 2D는 짚은 점을 축으로 확대 애니메이션, 3D는 460ms 카메라 글라이드 |
| 전신 / 피부 칩 | 확대 없이 즉시 선택 (`focus = null`). 다시 누르면 해제 |
| `다른 부위 보기` | → 전신 화면 |
| `반대쪽 보기` (3D, 팔·다리만) | `focus.side` 반전 → 카메라가 반대쪽으로 글라이드 |
| `목록에서 고르기` | → 목록 화면 |
| `인체도에서 고르기` | → 인체도 화면 (안드로이드는 3D로 복귀) |
| 목록 앵커 줄 | → 그 앵커의 구역 목록 |
| 검색어 입력 | → 검색 결과 목록 |
| 3D 판 우상단 X | 선택·확대 초기화 → 전신 화면 |
| 뒤로가기 (확대 중) | → 전신 화면 (선택 유지) |

### 14.3 이 화면으로 들어오는 길

| 출발 | 조건 | 상태 |
| --- | --- | --- |
| 홈 "증상 정리 시작하기" | — | `IntakeDestination(sessionId = null)` → `BODY_PART`부터 |
| 홈 "이어서 하기" | `sessionId != null` | **성공하면 이 화면을 건너뛴다.** `session.restore(sessionId)`가 `leftAt()`으로 `step`을 정한다 — `severityLevel != null` → `QUESTIONS`, 문답이 끝났으면(`status != IN_PROGRESS`) `SEVERITY`, 아니면 `SYMPTOM_CHAT`. 부위를 다시 고르게 하지 않는다 — 세션이 있다는 건 그 단계를 이미 지났다는 뜻이고 서버가 `siteText`를 들고 있다 |
| 홈 "이어서 하기" (**실패**) | `sessionId != null` + 응답 실패 | **이 화면에 그대로 선다.** `step`이 `BODY_PART` 기본값에서 안 바뀌고 `restoreFailed = true`만 세워진다. 그 값을 읽는 화면이 없어서 **이유가 아무 데도 안 보인다**(16장) |
| 2단계(문답)에서 뒤로 | — | `step`이 `BODY_PART`로 내려온다. `bodyMap` 상태는 **그대로 남아 있다**(같은 `IntakeUiState`) |

---

## 15. API

이 화면 자체는 **화면을 그리는 동안 서버를 부르지 않는다.** 온톨로지·좌표·검색이 전부 앱 안에 있다.
서버 호출은 **`다음`을 눌러 이 단계를 떠날 때 딱 한 번** 일어난다.

### 15.1 `POST /api/sessions` — 짚은 부위로 문답 세션 열기

`SessionApi.kt` / `IntakeSessionActions.start()`.

**요청 `StartSessionRequest`**

| 필드 | 타입 | 값 |
| --- | --- | --- |
| `siteCodes` | `string[]` | **원소 1개.** `selection.zoneId ?? selection.anchorId` — 구역까지 골랐으면 `SUR:*`, 앵커까지면 `ANC:*` |
| `siteText` | `string \| null` | `selection.title()` — 사람이 읽는 표현. **문답 첫 문장에 그대로 들어간다** (예: `왼쪽 무릎`) |

```json
{ "siteCodes": ["SUR:091"], "siteText": "왼쪽 무릎" }
```

**응답 `SessionResponse`**

| 필드 | 타입 | 기본 | 비고 |
| --- | --- | --- | --- |
| `sessionId` | `number` | — | 임시저장의 열쇠 |
| `status` | `string?` | `null` | |
| `siteCodes` | `string[]` | `[]` | |
| `siteText` | `string?` | `null` | |
| `progress` | `{ current: number, total: number }?` | `null` | **문답 안의 물음 수이지 우리 4단계가 아니다** |
| `messages` | `{ seq: number, role: 'AI'\|'USER', text: string }[]` | `[]` | **첫 AI 질문이 여기 실려 온다**(#259) |
| `severity` | `{ level: number, label?: string }?` | `null` | |
| `questions` | `string[]` | `[]` | 환자가 확정한 질문 |
| `questionCandidates` | `{ text: string, source?: string, rank: number }[]` | `[]` | AI 제안. `rank` 낮을수록 먼저 |

**에러 처리** — `400`: 나이나 성별이 없으면 400이다(의사용 카드 헤더에 반드시 찍혀서). `canStartIntake`(`GET /api/me/health-profile` 응답 필드)로 미리 확인한다.

**실패해도 문답은 진행한다.** 세션 id가 없으면 임시저장이 안 될 뿐이고, 여기서 막으면 답하던 사람이 아무것도 못 한다.

**앱이 만든 첫 물음이 서는 조건은 둘이다** — 코드가 `result.value.toMessages().ifEmpty { state.openingFor(siteText) }`라서:

| 결과 | `sessionId` | 첫 마디 |
| --- | --- | --- |
| 성공 + `messages` 있음 | 채워짐 | **서버의 첫 AI 질문**(#259) |
| **성공 + `messages` 빈 배열** | 채워짐 | **앱이 만든 `intakeOpeningLine`** |
| 실패(`Rejected` / `NetworkUnavailable`) | `null` 그대로 | 앱이 만든 `intakeOpeningLine` |

어느 쪽이든 `awaitingReply = false`로 내려온다. 같은 규칙이 복원에도 걸린다 — `restoredWith`가 `restored.ifEmpty { openingFor(session.siteText) }`다.

```ts
const intakeOpeningLine = (part: string) =>
  `${withSubjectParticle(part)} 불편하시군요. 언제부터 그러셨어요? 정확하지 않아도 괜찮아요.`;
// 예: "왼쪽 무릎이 불편하시군요. 언제부터 그러셨어요? 정확하지 않아도 괜찮아요."
```

### 15.2 이 화면과 무관하지만 같은 흐름의 API (참고)

| 메서드 · 경로 | 시점 |
| --- | --- |
| `GET /api/sessions/{sessionId}` | 홈 "이어서 하기"로 복원 |
| `POST /api/sessions/{sessionId}/messages` | 2단계 문답 발화 |
| `PUT /api/sessions/{sessionId}/severity` | 3단계를 **떠날 때** |
| `PUT /api/sessions/{sessionId}/questions` | 4단계를 **떠날 때** |

### 15.3 쓰지 않는 API

`GET /v1/ontology/search` — 같은 규칙의 부위 검색이 서버에 있지만 **부르지 않는다.** 데이터가 작고 한 글자마다 왕복하게 되기 때문. 웹도 클라이언트에서 검색할 것.

---

## 16. 로딩 / 빈 상태 / 에러 상태

| 상황 | 화면 |
| --- | --- |
| **로딩 (2D)** | **없다.** 이미지가 앱 안의 drawable이고 좌표·온톨로지가 전부 컴파일 상수라 로딩 상태 자체가 존재하지 않는다. 웹도 SVG를 인라인하면 로딩이 없다 |
| **로딩 (3D)** | `ready` 플래그가 설 때까지 `TextureView`를 **붙이지 않는다.** 붙여 두면 첫 프레임이 나갈 때까지 **검은 판**이 판 자리를 덮는다. 그동안 판은 `bgSubtle` 단색이고 스피너·스켈레톤은 없다. **다만 점은 그 위에 이미 그려진다** — `BodyMap3dDots`를 담은 `Box`가 `if (ready)` 블록 **밖**에 있어서, 몸이 나타나기 전에 회색 바탕 위에 점만 떠 있는 프레임이 잠깐 지나간다 |
| **로딩 중 조작** | 끌기·오므리기는 **먹는다**(카메라만 움직이므로). 탭은 `mesh`가 아직 `null`이라 `detectTapGestures`가 그 자리에서 빠져나가 **아무 일도 일어나지 않고 안내도 안 나온다**(`noticeOf`까지 가지 않는다). 짚어도 반응이 없는 짧은 구간이 있다는 뜻이다 |
| **인체도 빈 상태** | 없다. 점은 늘 있다 |
| **선택 없음** | 판 하단 알약(`SelectionCaption`)이 **없다**. 하단 `다음` 버튼이 **비활성**. 점은 흐린 회색(`fgDefault` 10%/28%) |
| **목록 빈 상태** | 없다. 앵커 11줄은 항상 있다 |
| **검색 0건** | 목록 대신 한 줄: **`그런 부위는 없어요. 다른 이름으로 찾아보세요.`** (`bodyM/fgSubtle`). **단, 이 화면이 나오려면 `searchResults`가 정말 빈 상태여야 한다** — 직전에 결과가 있었다면 그 결과가 유지되므로 이 안내는 "처음부터 한 번도 안 걸린 질의"에서만 나온다 |
| **3D 판정 실패 — 몸 밖** | 판 **아래**에 `bodyM/fgSubtle` 한 줄: **`몸 바깥을 짚었어요. 몸 위를 짚어주세요.`** 다음 짚기·부위 변경 시 사라진다 |
| **3D 판정 실패 — 너무 멂** | **`여기가 어디인지 알기 어려워요. 조금 더 가운데를 짚어주세요.`** (거리 > 신장의 10%). 둘을 "다시 짚어주세요"로 묶지 않은 이유: 앞은 몸을 짚으면 되고 뒤는 같은 몸에서 조금 옮기면 된다 |
| **네트워크 에러** | 이 화면에는 **없다.** `POST /api/sessions` 실패는 다음 화면(문답)에서 드러나고, 실패해도 흐름은 진행된다 |
| **복원 중 (`restoring = true`)** | **그려지지 않는다.** "이어서 하기"로 들어오면 `restore()`가 도는 동안 `step`은 아직 기본값 `BODY_PART`라 **이 화면이 그대로 보인다.** 스피너도, 조작을 막는 것도 없어서 그 사이에 부위를 짚고 "다음"을 누를 수도 있다(그러면 응답이 도착해 `step`을 덮어쓴다) |
| **복원 실패 (`restoreFailed = true`)** | **그려지지 않는다.** `restore()` 실패 갈래는 `step`을 바꾸지 않으므로 사용자는 **아무 안내 없이 이 부위 선택 화면에 남는다.** `restoreFailed`를 읽는 Composable이 `intake/ui` 전체에 0건이다 — 누락이지 의도가 아닐 가능성이 크다. **웹에서는 이 자리에 실패 안내를 두는 것을 권한다**(안드로이드에 없는 것을 더하는 결정이므로 기획 확인 필요) |
| **`sendFailed`** | 이 화면과 무관(2단계 문답). 참고로 이 값도 화면에 그려지는 곳이 없다 |

---

## 17. 애니메이션 / 모션

### 17.1 2D 확대 전환 (`BodyMapTransition.kt`) — 웹 포팅 대상

전신 이미지와 확대 이미지가 서로 다른 파일이라 이어 확대할 수 없다. 대신 **짚은 점을 축으로 전신을 밀어내고** 확대 이미지를 조금 큰 상태에서 제자리로 들여보낸다. 카메라가 그 점으로 들어가는 것처럼 읽힌다.

| 값 | 상수 |
| --- | --- |
| 지속 시간 | `240ms`, `tween` (linear-ish easing) |
| 들어갈 때(ANCHOR → ZONE) | 나가는 전신: `fadeOut + scaleOut(target = 1.6, origin = zoomOrigin)` / 들어오는 확대: `fadeIn + scaleIn(initial = 1.12)` |
| 나올 때(ZONE → ANCHOR) | 들어오는 전신: `fadeIn + scaleIn(initial = 1.6, origin = zoomOrigin)` / 나가는 확대: `fadeOut + scaleOut(target = 1.12)` |
| 그 외 전환 | 단순 크로스페이드 |
| 크기 | **애니메이션하지 않는다** (`SizeTransform snap`). 판 높이가 부위마다 달라서, 높이까지 움직이면 아래 여백이 함께 늘었다 줄어든다 |
| 축(`transform-origin`) | 짚은 점. **가운데를 축으로 하면 어느 부위를 짚어도 같은 움직임이 나와 확대라기보다 화면 교체로 보인다** |

**축 계산** — 이미지는 판 안에 종횡비를 지켜 가운데 놓이므로 남는 폭이 있다. 그 여백을 더해야 한다.

```ts
function zoomOrigin(point: BodyMapPoint | null, imageWidth: number, cardWidth: number) {
  if (!point || cardWidth <= 0) return { x: 0.5, y: 0.5 };
  const inset = (cardWidth - imageWidth) / 2;
  return { x: (inset + imageWidth * point.x) / cardWidth, y: point.y };
}
// CSS: transform-origin: `${x*100}% ${y*100}%`
```

**감소 모션** — 안드로이드는 `Settings.Global.ANIMATOR_DURATION_SCALE == 0`이면 `snap()`으로 즉시 전환한다(`prefers-reduced-motion`에 해당하는 API가 없어서). 웹은 그대로 `@media (prefers-reduced-motion: reduce)`로 옮긴다. 멀미나 주의력 문제로 끄는 설정이고 그 뜻을 화면이 무시하면 안 된다.

### 17.2 3D 카메라 (참고, 포팅 대상 아님)

- 부위 전환 글라이드 `460ms` `FastOutSlowInEasing` (자료가 적어 둔 값).
- 각도(yaw/pitch/distance)와 타깃(x/y/z)을 `Animatable` **둘로 나눠** 든다 — Compose 애니메이션 벡터가 4차원까지라 여섯을 한 값으로 못 묶는다. 늘 같은 시간으로 함께 움직인다.
- 회전각은 0..2π로 접지 않고 쌓아 둔다. 면을 바꿀 때 `yawNear()`로 가장 가까운 등가각을 잡아 왔던 길을 되감는다.

---

## 18. 접근성 — 웹에서 반드시 지킬 것

| 요소 | 안드로이드 구현 | 웹 대응 |
| --- | --- | --- |
| 인체도 이미지 | `contentDescription = null` (장식) | `<img alt="">` 또는 SVG `aria-hidden="true"` |
| 점 | `clearAndSetSemantics { contentDescription = dot.label; role = Button; selected = dot.selected }` — **점 하나하나가 부위 이름을 라벨로 가진 선택 가능한 버튼** | `<button role="radio" aria-checked aria-label="왼쪽 무릎">` 또는 SVG `<a>` 대신 `<button>` 오버레이 |
| 좌우 안내 `오른쪽`/`왼쪽` | `clearAndSetSemantics { }` — **읽히지 않게 한다.** 점마다 좌우가 이름에 들어 있어 이 라벨은 눈으로 보는 사람에게만 필요 | `aria-hidden="true"` |
| 3D 판 | `clearAndSetSemantics { }` — 전체를 비운다. **스크린 리더로는 쓸 수 없는 판이다** | (해당 없음) |
| 목록 구역 줄 | `MedicalMateRadio` — 역할과 선택 상태를 시맨틱에 싣는다 | `<input type="radio">` 또는 `role="radio"` + `aria-checked` |
| 목록 앵커 줄 | `MedicalMateListRow`(chevron) — 고르는 것이 아니라 **이동**이다 | `<button>` 또는 `<a>`, `aria-expanded` 쓰지 말 것(하위 화면으로 이동이지 펼침이 아님) |
| 검색 지우기 | contentDescription `검색어 지우기` | `aria-label="검색어 지우기"` |
| 3D 초기화 | contentDescription `고른 부위 지우기` | (해당 없음) |

> **목록 경로는 선택이 아니라 필수다.** `PORTFOLIO.md` 22장: 부위를 고르지 못하면 문답 전체를 시작할 수 없어서, 화면 하나가 아니라 **흐름 전체가 막힌다.**

---

## 19. 웹 SVG 대체 설계 제안

### 19.1 구조

```
<div class="body-map-card">            <!-- 505px, bg-subtle, radius md, overflow hidden -->
  <span class="orientation left">오른쪽</span>   <!-- aria-hidden, 앞면만 -->
  <span class="orientation right">왼쪽</span>
  <svg viewBox="0 0 1080 2480" class="body-svg">
    <g class="silhouette" aria-hidden="true"> ... 인체 실루엣 path ... </g>
  </svg>
  <div class="dots">                    <!-- 절대 배치, 이미지 실제 표시 크기 기준 -->
    <button class="dot" style="--x:.5; --y:.045" aria-label="머리" aria-pressed="false">…</button>
    …
  </div>
  <div class="caption" aria-live="polite">무릎(왼쪽)</div>
</div>
```

### 19.2 좌표 → 화면 변환 (안드로이드 `BodyMapCanvas.fitInside`와 동일)

```ts
/** 종횡비 유지 + 가운데 정렬. 인체도는 세로로 길어 대개 높이가 먼저 차지만 가슴처럼 납작한 것도 있다 */
function fitInside(aspect: number, maxW: number, maxH: number) {
  const wAtFullH = maxH * aspect;
  return wAtFullH <= maxW ? { w: wAtFullH, h: maxH } : { w: maxW, h: maxW / aspect };
}

// 점 위치 (좌상단 기준, 히트박스 48)
const left = fitted.w * dot.x - 48 / 2;
const top  = fitted.h * dot.y - 48 / 2;
```

### 19.3 SVG 실루엣을 만들 때의 주의

- **좌표를 건드리지 말 것.** 실루엣 path만 새로 그리고 점 좌표는 `BodyMapGeometry.kt` 값을 그대로 쓴다. 좌표는 원본 3D 모델(`Hi3D_...glb`)을 렌더한 WebP 기준이므로, SVG 실루엣의 비율이 원본 WebP와 다르면 점이 몸에서 벗어난다. **기존 `bodymap_*.webp` 9장을 배경에 깔고 그 위에 path를 트레이싱하는 방식**을 권한다.
- 확대 이미지 7장(머리·목·가슴·배·팔·다리·허리엉덩이)도 각각 다른 종횡비다. `viewBox`를 표 6.1의 원본 px와 같게 둘 것.
- 팔·다리는 **오른쪽 기준 한 장**만 만들고 왼쪽은 `scaleX(-1)` + `x → 1-x`로 만든다. 두 장을 만들면 한쪽만 갱신된다.

### 19.4 SVG 영역 히트(선택지 B)

점 대신 부위별 `<path>`를 클릭 영역으로 쓰면 판을 화면에 맞춰 줄일 수 있다. 그 경우:

- 7장의 좌표표는 **점의 시각 위치**로만 남기고(고른 표시·알약을 얹을 자리), 히트는 path에 맡긴다.
- 7.2절의 "최소 높이" 제약이 사라진다 → 판을 `min(505, 사용 가능 높이)`로 줄일 수 있다.
- 대신 path 25개(+좌우 분리) 를 새로 그려야 하고, 온톨로지 id와 1:1로 묶는 검증 테스트가 필요하다.
- **권장: 1차는 점 방식(안드로이드와 동일, 리스크 0), 2차에 path 방식으로 승격.**

### 19.5 데이터 파일 구성 제안

안드로이드가 생성 파일로 두고 "손으로 고치지 않는다"고 못 박은 자료는 웹에서도 같은 규칙을 지킬 것.

| 웹 파일 | 안드로이드 출처 | 원천 |
| --- | --- | --- |
| `src/data/bodyMapOntology.ts` | `BodyMapOntology.kt` | AI 트랙 `docs/examples/body-map.json` (스냅샷 `f848848baea4`) |
| `src/data/bodyMapGeometry.ts` | `BodyMapGeometry.kt` | 디자인 트랙 `humanmap_coords.json` (schema `humanmap-coords/3.0`) |
| `src/lib/bodyPartSearch.ts` | `BodyPartSearch.kt` | AI 트랙 `docs/android-body-search.md` |
| (선택) `src/data/bodyMap3d.ts` | `BodyMap3dGeometry.kt` | `anchors3d.json` (schema `humanmap-3d-anchors/2.0`) |

**두 자료의 id 집합이 같은지 세는 테스트를 반드시 둘 것.** 좌표는 디자인 트랙, 이름은 AI 트랙에서 오므로 한쪽만 갱신되면 화면에 `SUR:041`이 그대로 나오거나 짚을 수 없는 부위가 생긴다(안드로이드는 `BodyMapGeometryTest`가 잡는다).

---

## 20. 웹 포팅 시 어려운 지점 / 판단이 필요한 곳

1. **3D를 버리는 결정.** 안드로이드 현재 기본 화면이 3D인데 웹은 2D SVG로 간다 → 두 플랫폼의 UI가 달라진다. 저장 값은 동일하므로 데이터 리스크는 없지만, 기획·디자인 승인이 필요하다.
2. **판 505px vs 뷰포트.** 모바일에서 판이 화면에 다 안 들어온다. 안드로이드는 스크롤로 해결했고(의도적), 웹도 같게 가면 "스크롤해야 다리가 보인다". `overscroll-behavior`와 sticky 헤더 조합을 신경 쓸 것.
3. **한글 IME 조합 중 검색 깜빡임.** 안드로이드는 "0건이면 직전 결과 유지"로 풀었다. 웹은 `compositionstart`/`compositionend` + 같은 규칙을 **둘 다** 적용하는 편이 안전하다.
4. **좌우 반전 시 라벨 반전.** CSS `transform: scaleX(-1)`을 컨테이너에 걸면 점 안의 텍스트·툴팁까지 뒤집힌다. 이미지/실루엣 요소에만 걸고 점은 별도 레이어에 둘 것.
5. **48px 히트박스 비겹침 제약.** 웹에서 판을 줄이면 점이 겹치고 짚은 곳과 골라진 부위가 달라진다. 7.1절 계산식을 그대로 옮기고 단위 테스트로 잠글 것(안드로이드 `BodyMapLayoutTest` 대응).
6. **`SUR:041` 좌표 이슈.** 허리 가운데가 천골 위치(신장 58%)에 있어 허리 옆(62%)과 어긋난다. 데이터 교체 대기 중 — 웹 자료를 만들 때 동일 이슈가 따라온다.
7. **3D/2D 좌우 값 일치.** 3D를 안 쓰면 문제가 없지만, 나중에 3D를 붙이면 `BodyMap3dPoint.toSelection()`이 하듯 **2D 갈래에서 값을 고르는** 방식을 유지해야 저장 값이 갈리지 않는다.
8. **Figma 시안 부재.** `CLAUDE.md` 481행: "시안의 Wireframe 섹션에 이 화면이 없다. 지워진 것이 아니라 아직 안 그린 것이다. **지금 구현이 이 화면의 유일한 기준이므로 지우지 않는다.**" → 웹 구현도 이 문서와 코드를 기준으로 삼고, 나중에 시안이 나오면 대조할 것.
9. **복원 실패가 안 보이는 것.** "이어서 하기"가 실패하면 이 화면에 그대로 남는데 `restoreFailed`를 그리는 곳이 없다(16장). 웹에서 그대로 옮기면 사용자는 "이어서 하기를 눌렀더니 처음부터네"가 된다. 안내 한 줄을 더할지 기획 확인이 필요하고, 더하면 **안드로이드에 없는 화면 문구**가 하나 생긴다.
10. **목록에서 뒤로가기가 홈으로 나간다.** `canGoBack`이 `byList`를 보지 않아서다(14.1). 브라우저 뒤로가기에 그대로 얹으면 같은 동작이 되는데, 웹 사용자는 "목록 → 인체도"를 기대하기 쉽다. 같게 갈지 고칠지 정할 것.
11. **3D 로딩 중 탭이 먹통.** `mesh`를 다 읽기 전 탭은 안내도 없이 무시된다(16장). 웹은 3D를 안 쓰니 해당 없지만, SVG 인라인이 아니라 이미지 9장을 `fetch`하는 구조로 가면 같은 성격의 구간이 생긴다 — 그래서 **SVG 인라인을 권한다.**

---

## 21. 부록 — 화면별 체크리스트

### 전신 화면
- [ ] 제목 `어디가 아프세요?` (설명 문구 **없음**)
- [ ] 세그먼트 `앞면` / `뒷면`, 면 전환 시 선택 유지
- [ ] 칩 `전신` `피부` — 다시 누르면 해제
- [ ] `목록에서 고르기` GHOST S, 칩 줄 오른쪽 끝 (weight 주지 말 것)
- [ ] 판 505px, 좌우 안내 `오른쪽`/`왼쪽` (앞면만, aria-hidden)
- [ ] 앞면 점 8개 / 뒷면 점 1개
- [ ] 선택 시 하단 알약 `label()` 표시
- [ ] `다음` 버튼 `selection != null`일 때만 활성

### 확대 화면
- [ ] 제목 `{focus.title()} 어디가 아프세요?`
- [ ] 설명 `더 짚어주시면 문답이 짧아져요. 애매하면 가까운 곳으로 고르셔도 괜찮아요.`
- [ ] `다른 부위 보기` OUTLINE M 전체 폭 — 세그먼트와 **같은 높이**
- [ ] 좌우 라벨: 머리·목·가슴·배만 표시
- [ ] 팔·다리 LEFT는 이미지 반전 + `x → 1-x`
- [ ] **고른 뒤에도 이 화면에 머문다**
- [ ] 알약은 `belongsTo(focus)`일 때만
- [ ] 확대 애니메이션 240ms, origin = 짚은 점, reduced-motion 존중

### 목록 화면
- [ ] 제목 `아픈 부위를 골라주세요`
- [ ] `인체도에서 고르기` GHOST S, 오른쪽 정렬
- [ ] 검색 필드 placeholder `부위 이름으로 찾기`
- [ ] 앵커 11줄 (전신·피부 라디오, 나머지 ListRow, 팔·다리 각 2줄)
- [ ] 앵커 줄 meta `고른 부위: {label()}`
- [ ] 줄 사이 여백 0 + 구분선 (둘째 줄부터)
- [ ] 구역 목록에 `SectionHeader({focus.title()})`
- [ ] 검색 0건 → `그런 부위는 없어요. 다른 이름으로 찾아보세요.`
- [ ] 검색 결과 0건이면 **직전 결과 유지** (지웠을 때만 비움)
- [ ] 검색 상한 8건, 찾을 때만 질의 300자 절단 (**입력칸 글자는 자르지 않는다**)
- [ ] 검색 결과의 `전신`·`피부`는 `List Row`가 아니라 **라디오** (다시 누르면 해제)
- [ ] 검색 결과의 팔·다리 구역은 **좌우 두 줄**
- [ ] 구역 목록에서 뒤로가기 → 앵커 목록 / 앵커 목록에서 뒤로가기 → **홈으로 나감**

### 공통 (화면 무관)

- [ ] `다음`은 `selection != null`일 때만 활성, 누르면 `bodyPart = selection.title()` + `POST /api/sessions`
- [ ] 화면(`screen`)이 갈릴 때마다 스크롤 맨 위로
- [ ] 앞/뒤를 바꿔도 `selection`은 유지
- [ ] `다른 부위 보기`는 `focus`만 비우고 `selection`은 남긴다
- [ ] "이어서 하기" 복원 중 / 실패 상태를 어떻게 그릴지 정했는가 (안드로이드는 **둘 다 안 그린다**)
