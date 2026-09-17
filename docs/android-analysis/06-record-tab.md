# 기록 탭 · 기록 상세 (1j, 1j-3)

## 웹앱 구현 메모

- 모바일 폭 고정 안 함. 기준 폭 360px에 좌우 거터 20px, 콘텐츠는 Fill이다(`MedicalMateSize.gutter = 20dp`, `screenWidth = 360dp`는 "고정하지 말 것"이라고 소스에 명시). 데스크톱은 `max-width: 440px` 중앙 정렬 컨테이너를 권장.
- 애니메이션은 두 군데뿐이다. ① 카드 펼침/접힘 높이 트랜지션 320ms `cubic-bezier(0.4, 0, 0.2, 1)`(FastOutSlowInEasing) → CSS `grid-template-rows: 0fr → 1fr` 또는 JS 높이 측정. ② 펼친 뒤 해당 블록으로 스크롤 이동(`scrollIntoView({block:'nearest'})`), **반드시 트랜지션이 끝난 뒤** 실행(소스가 `finishedListener`에서 호출).
- 제스처는 안드로이드 가장자리 스와이프 뒤로가기뿐이다. 웹에서는 브라우저 뒤로가기 + 상단 `<` 버튼으로 대체하면 된다. 목록 행에 스와이프 삭제는 없다 — 삭제는 `편집` 모드 + 체크박스 + 하단 삭제 버튼이다.
- 타임라인 세로선은 Compose가 `drawBehind`로 단계마다 따로 그린다(마지막 단계는 안 그림). 웹에서는 `.step:not(:last-child)::before { left:4px; top:9px; bottom:0; width:2px; }`로 1:1 대응된다.
- 상단 NavBar는 기록 상세에서 Glass(불투명도 0.82 + blur 24px)다. `backdrop-filter` 미지원 브라우저는 불투명 `bg/surface`로 내린다(안드로이드도 API 31 미만은 동일하게 내림).

---

## 0. 읽은 소스 파일

| 파일 | 역할 |
| -- | -- |
| `app/src/main/java/com/mist/medicalmate/card/ui/RecordScreen.kt` | 기록 탭 화면 뼈대, 콜백, 빈/실패/편집 상태 |
| `.../card/ui/RecordList.kt` | 월별 묶음 머리 + 기록 한 줄 렌더링 |
| `.../card/ui/RecordStatus.kt` | 상태 배지 문구/색 매핑 |
| `.../card/ui/RecordUiState.kt` | 기록 탭 상태 모델 |
| `.../card/ui/RecordViewModel.kt` | 목록 로드, 월별 그룹핑, 편집/삭제 |
| `.../card/ui/RecordDestination.kt` | 라우트 + 나가는 길 |
| `.../card/ui/RecordDetailScreen.kt` | 상세 화면 뼈대, 머리글, 타임라인 |
| `.../card/ui/RecordDetailStep.kt` | 타임라인 한 단계(블록/예정), 펼침 줄 |
| `.../card/ui/RecordDetailUiState.kt` | 상세 상태 모델 |
| `.../card/ui/RecordDetailViewModel.kt` | 3개 API 조합 → 타임라인 조립, 펼침 상태 |
| `.../card/ui/RecordDetailFixtures.kt` | 상세 목데이터 5건 |
| `.../card/ui/RecordDetailDestination.kt` | 상세 라우트 |
| `.../visit/data/VisitApi.kt`, `VisitRepository.kt`, `VisitMapping.kt` | 기록 API 계약과 도메인 매핑 |
| `.../navigation/MedicalMateNavGraphs.kt`, `MedicalMateNavHost.kt` | 네비게이션 배선 |
| `app/src/main/res/values/strings.xml` | 화면 문구 원문 |
| 디자인 시스템: `Badge.kt`, `EmptyState.kt`, `NavBar.kt`, `Rows.kt`, `Notice.kt`, `QuoteBlock.kt`, `SeverityReadout.kt`, `Callout.kt`, `Selection.kt`, `BottomCtaBar.kt`, `TabBar.kt`, `Dialog.kt`, `Loading.kt`, `Button.kt` | 컴포넌트 규격 |
| 토큰: `Dimens.kt`, `Elevation.kt`, `MedicalMateRadius.kt`, `MedicalMateColors.kt`, `Palette.kt`, `Type.kt`, `MedicalMateSeverity.kt` | 값 |

---

# 1. 기록 탭 (1j-1 / 1j-2 / 1j-1-D)

## 1.1 Figma 화면 id

| 상태 | 와이어프레임 | Figma node |
| -- | -- | -- |
| 목록 있음 | `1j-1` | `406:2569` |
| 빈 상태 | `1j-2` | `406:2646` |
| 편집 모드 | `1j-1-D` | `1121:4527` |
| 편집 중 2건 선택 | `1j-1-D2` | (Preview `RecordScreenEditingPreview`에만 명시, node 없음) |
| 목록 마스터 행 | `List Row` | `335:1114` |
| 묶음 머리 마스터 | `Section Header` | `334:1156` |

`RecordScreen.kt` KDoc: `와이어프레임 1j-1과 1j-2. Figma 406:2569, 406:2646.`
`RecordList.kt` KDoc: `기록 목록의 묶음 머리와 줄. Figma 1j-1 406:2569, 1j-1-D 1121:4527.`

## 1.2 라우트

- 라우트 객체: `RecordDestination` — `@Serializable internal data object`, 파라미터 없음. 웹 경로 제안: **`/record`**
- 1Depth 탭 화면이라 **뒤로가기 없음**(`MedicalMateNavLeading.NONE`). 탭으로 들어오는 화면이라 돌아갈 곳이 없다고 소스가 명시.
- 진입 시 `LaunchedEffect(Unit) { viewModel.load() }` — **이 composable이 컴포지션에 들어올 때 한 번** 부른다. 소스가 보증하는 것은 여기까지다.
  - 탭 이동은 `popUpTo(graph.startDestination) { saveState = true } + launchSingleTop + restoreState = true`라(`MedicalMateNavHost.selectTab`) ViewModel 인스턴스와 스크롤 위치가 보존된다.
  - ⚠️ **(추정)** 다만 돌아올 때 composable이 다시 구성되면 `LaunchedEffect(Unit)`이 한 번 더 돌아 `load()`가 다시 불릴 수 있다. `load()`는 첫 줄에서 상태를 `Loading`으로 되돌리므로, 그 경우 **편집 모드와 고른 항목이 초기화된다.** Navigation Compose의 상태 복원 동작에 달린 문제라 소스만으로는 단정할 수 없다 — 실기기 확인 필요. 웹에서는 "탭 복귀 시 재조회 여부"를 명시적으로 정해서 구현할 것.

### 라우트 배선 (`RecordDestination.kt` → `RecordRoute`)

```kotlin
internal fun NavGraphBuilder.recordDestination(
    onItemClick: (String) -> Unit,        // recordId 문자열을 그대로 넘긴다
    onStartIntakeClick: () -> Unit,
    onTabSelect: (MedicalMateTab) -> Unit,
)
```

`RecordRoute`가 ViewModel을 붙이고(`hiltViewModel()`) `collectAsStateWithLifecycle()`로 `uiState` 하나만 구독한다. 목록 화면은 상세와 달리 **별도 StateFlow가 없다**(펼침 상태 같은 것이 없음).
`onItemClick = { item -> onItemClick(item.id) }` — 화면은 `RecordItem` 전체를 주지만 라우트는 **id만** 꺼내 쓴다. `cardId`·`clinic`은 이동에 쓰이지 않는다.

## 1.3 화면 레이아웃 (위 → 아래)

```
┌──────────────────────────────────────────────┐
│ [NavBar] 높이 min 56, 배경 bg/surface, 하단 1px │
│   좌측 슬롯 48 (비어 있음, 자리는 유지)          │
│   가운데 "기록"  Heading/S 17 SemiBold           │
│   우측 텍스트 액션 "편집" / "취소" / (없음)       │
│     Body/L Strong 17, fg/primary #2E3E9E        │
├──────────────────────────────────────────────┤
│ [본문] weight(1f) — 세로 남은 높이 전부           │
│   Loading  → 중앙 스피너                        │
│   Failed   → Empty State (NO_RESULT)           │
│   Content + groups 비어 있음 → Empty State (NO_RECORD) │
│   Content + groups 있음 → LazyColumn            │
│     contentPadding: 좌우 20 / 위 12 / 아래 16    │
│     항목 간격 10                                │
│                                                │
│     ┌ [Section Header] 2026년 9월      3건 ┐    │
│     │  padding-top 24, padding-bottom 10  │    │
│     └─────────────────────────────────────┘    │
│     ┌ [Record Row] ─────────────────────┐      │
│     │ 제목 [배지]                        │      │
│     │ meta                          >   │      │
│     │ detail                             │      │
│     │ resumeLabel                        │      │
│     └────────────────────────────────────┘      │
│     ... (행 반복) ...                            │
│     ┌ [Section Header] 2026년 7월      1건 ┐    │
│     └─────────────────────────────────────┘    │
├──────────────────────────────────────────────┤
│ [하단]                                         │
│   편집 아님 → Tab Bar (높이 79)                 │
│               캘린더 · 홈 · 기록                 │
│   편집 중   → Bottom CTA Bar + DANGER 버튼       │
└──────────────────────────────────────────────┘
```

편집 중에는 **탭바 자리에 삭제 버튼이 선다**. 소스 주석: "시안이 그 상태의 탭바를 감췄다. 고르는 중에 다른 탭으로 나갈 수 있으면 고른 것이 어떻게 되는지 설명할 수 없다."

**화면 루트의 배경은 `bg/surface` `#FFFFFF`다.** `RecordScreen`의 바깥 `Column`이 `.fillMaxSize().background(MedicalMateTheme.colors.bgSurface)`다. 목록 뒤가 회색 캔버스가 아니라 **흰 바탕**이고, 흰 행 카드가 그림자만으로 떠 보인다. 웹에서 목록 배경을 회색으로 깔면 안 된다. (기록 상세도 같다.)

**하단 전환의 판정 기준은 `content?.editing == true` 하나다.** `state`가 `Loading`이나 `Failed`면 `content`가 null이라 `editing = false` → 탭바가 선다. 즉 **로딩·실패 화면에서도 하단은 탭바**다.

## 1.4 상태 모델 — `RecordUiState`

```kotlin
sealed interface RecordUiState {
    data object Loading
    data object Failed
    data class Content(groups, selectedIds, deleteRequested)
}
```

### `RecordUiState.Content` 전체 필드

| 필드 | Kotlin 타입 | 기본값 | 설명 |
| -- | -- | -- | -- |
| `groups` | `List<RecordGroup>` | (필수) | 월별 묶음. 비어 있으면 화면이 빈 상태(1j-2)가 된다 |
| `selectedIds` | `Set<String>?` | `null` | `null`이 아니면 편집 중(1j-1-D). **빈 집합과 null을 나눠 쓴다** — 빈 집합은 "편집에 들어와 아무것도 안 고름"(삭제 버튼 표시), null은 "편집 아님"(탭바 표시) |
| `deleteRequested` | `Boolean` | `false` | 삭제 확인 다이얼로그 표시 여부 |
| `editing` (파생) | `Boolean` (get) | — | `selectedIds != null` |
| `selectedCount` (파생) | `Int` (get) | — | `selectedIds?.size ?: 0` |

### `RecordGroup`

| 필드 | Kotlin 타입 | 기본값 | 설명 |
| -- | -- | -- | -- |
| `monthLabel` | `String` | (필수) | `"2026년 9월"` 형식. LazyColumn의 item key로도 쓴다 |
| `items` | `List<RecordItem>` | (필수) | 그 달의 줄. 개수는 `items.size`로 센다(`count` 필드 없음) |

### `RecordItem`

| 필드 | Kotlin 타입 | 기본값 | 설명 |
| -- | -- | -- | -- |
| `id` | `String` | (필수) | 기록(visit) id. 선택/삭제/상세 이동의 열쇠. LazyColumn item key |
| `cardId` | `String?` | `null` | 이 기록이 매달린 카드. 응답이 null을 줄 수 있어 선택 |
| `title` | `String` | (필수) | 카드 제목 |
| `status` | `RecordItem.Status` | (필수) | `DRAFT` / `BEFORE_VISIT` / `CONFIRMED` |
| `clinic` | `String?` | `null` | 병원 이름. `meta`에도 들어 있지만 카드를 열 때 따로 넘겨야 해서 값으로도 든다 |
| `meta` | `String` | (필수) | 둘째 줄. 날짜+병원을 합친 **표시용 문자열** |
| `detail` | `String?` | `null` | 셋째 줄. 상태마다 담는 말이 다르다(화면이 조립하지 않음) |
| `resumeLabel` | `String?` | `null` | 넷째 줄. **작성 중(DRAFT)인 카드에만** 있다. 경고색 |

> ⚠️ **`clinic`은 현재 아무도 채우지 않는다.** `VisitListItem.toRow()`가 `id`·`cardId`·`title`·`status`·`meta` 다섯 개만 세우고 `clinic`을 넘기지 않으며, Preview 목데이터(`previewRecordGroups`)도 비워 둔다. 병원 이름은 `meta` 문자열 안에만 존재한다. 필드의 KDoc이 설명하는 용도("카드를 열 때 그 이름을 함께 넘겨야 해서")는 **현재 코드 경로에 구현되어 있지 않다.** 웹에서는 지금 당장 쓰이지 않는 필드로 두거나, 서버 계약이 확정될 때까지 생략해도 된다.

> ⚠️ **`cardId`의 KDoc은 낡았다.** 원문은 "목록에서 지우면 서버가 지우는 것이 카드다. 기록만 지우는 API가 없다"라고 적혀 있지만, 같은 파일 묶음의 `RecordViewModel.onDeleteConfirm` KDoc이 "**지우는 것은 기록이다.** `DELETE /api/visits/{visitId}`이고 카드는 남는다. 전에는 이 자리가 없어 카드 삭제로 나갔고…"(#178)로 뒤집었다. **뒤쪽이 현행이다.** 이 문서는 현행(기록만 삭제, 카드 존치)을 따른다.

```ts
// TypeScript 대응
type RecordStatus = 'DRAFT' | 'BEFORE_VISIT' | 'CONFIRMED';

interface RecordItem {
  id: string;
  cardId?: string | null;
  title: string;
  status: RecordStatus;
  clinic?: string | null;
  meta: string;
  detail?: string | null;
  resumeLabel?: string | null;
}

interface RecordGroup {
  monthLabel: string;
  items: RecordItem[];
}

type RecordUiState =
  | { kind: 'loading' }
  | { kind: 'failed' }
  | {
      kind: 'content';
      groups: RecordGroup[];
      selectedIds: Set<string> | null; // null = 편집 아님
      deleteRequested: boolean;
    };
// editing = selectedIds !== null
// selectedCount = selectedIds?.size ?? 0
```

### 화면 콜백 전체 — `RecordCallbacks`

`RecordScreen(state, callbacks, modifier)` 두 개만 받는다. 조작은 전부 이 하나의 `data class`에 모여 있고 **열 개 전부 기본값이 no-op**이라 Preview가 빈 채로 그릴 수 있다.

| 콜백 | 시그니처 | 어디서 불리나 | 라우트에서 무엇에 연결되나 |
| -- | -- | -- | -- |
| `onItemClick` | `(RecordItem) -> Unit` | 행 탭 (편집 아닐 때) | `navigate(RecordDetailDestination(item.id))` |
| `onStartIntakeClick` | `() -> Unit` | 빈 상태 행동 버튼 | `navigate(IntakeDestination())` |
| `onRetryClick` | `() -> Unit` | 실패 상태 `다시 시도` | `viewModel::load` |
| `onTabSelect` | `(MedicalMateTab) -> Unit` | 하단 탭바 | `navController::selectTab` |
| `onEditStart` | `() -> Unit` | NavBar 우측 (편집 아닐 때) | `viewModel::onEditStart` |
| `onEditCancel` | `() -> Unit` | NavBar 우측 (편집 중) | `viewModel::onEditCancel` |
| `onSelectChange` | `(String, Boolean) -> Unit` | 행 탭·체크박스 (편집 중) | `viewModel::onSelectChange` |
| `onDeleteClick` | `() -> Unit` | 하단 삭제 버튼 | `viewModel::onDeleteClick` |
| `onDeleteConfirm` | `() -> Unit` | 다이얼로그 `삭제` | `viewModel::onDeleteConfirm` |
| `onDeleteDismiss` | `() -> Unit` | 다이얼로그 `취소`·바깥 탭 | `viewModel::onDeleteDismiss` |

**NavBar 우측 버튼은 하나의 슬롯이고 핸들러가 갈린다**: `onActionClick = if (editing) callbacks.onEditCancel else callbacks.onEditStart`. 웹에서도 버튼 하나에 조건부 핸들러를 물리면 된다.

## 1.5 상태 배지 — 전체 종류와 색

`RecordStatus.kt`가 단일 소스다. **목록(1j-1)과 상세(1j-3)가 같은 배지를 쓴다.**

| `RecordItem.Status` | 배지 문구 (원문) | `MedicalMateBadgeTone` | 배경 토큰 | 배경 hex | 글자 토큰 | 글자 hex |
| -- | -- | -- | -- | -- | -- | -- |
| `DRAFT` | **작성 중** | `WARNING` | `bg/warning` = Amber50 | `#FFF4D6` | `fg/warning` = Amber700 | `#8A5A0B` |
| `BEFORE_VISIT` | **진료 전** | `BRAND` | `bg/primary-subtle` = Primary100 | `#E3E7FC` | `fg/primary` = Primary700 | `#2E3E9E` |
| `CONFIRMED` | **진료 완료** | `SUCCESS` | `bg/success` = Green50 | `#E4F7ED` | `fg/success` = Green700 | `#0E7A4A` |

배지 규격(`Badge.kt`): radius **8px**(`MedicalMateRadius.xs`, pill 아님 — Chip과 구분하려고 문서가 정함), 좌우 패딩 8, 최소 높이(`BadgeHeight`), 글자 `Label/S` = 11px / line-height 16 / Medium 500 / letter-spacing 2%. **누를 수 없다.**

> 상세 화면에서는 `RecordDetail.badge`가 있으면 그 문자열이 배지 문구를 **덮는다**(색은 여전히 `status` 기준). 재방문이 쌓이면 `"진료 2회"`가 SUCCESS 색으로 뜬다.

## 1.6 월별 그룹핑 규칙 (`RecordViewModel.toGroups`)

```kotlin
private fun List<VisitListItem>.toGroups(): List<RecordGroup> =
    groupBy { it.visitedOn.format(MONTH_LABEL) }
        .map { (label, items) -> RecordGroup(monthLabel = label, items = items.map { it.toRow() }) }

private val MONTH_LABEL = DateTimeFormatter.ofPattern("yyyy년 M월", Locale.KOREAN)
```

- **서버가 최근 진료일 순으로 준다. 앱은 다시 정렬하지 않는다.** `groupBy`가 최초 등장 순서를 보존하므로 묶음 순서도 최신 달이 위다. → 웹에서도 응답 배열 순서를 그대로 유지하며 `reduce`로 묶어야 한다. `Object.keys()` 정렬에 의존하면 안 된다.
- 월 라벨 포맷: `yyyy년 M월` — **월은 0-padding 없음**. `"2026년 9월"`, `"2026년 7월"`.
- 묶는 일을 화면이 아니라 ViewModel이 한다는 이유: "묶는 일이 화면이 아니라 여기 있어야 JVM에서 확인할 수 있다."
- 브리핑 카드는 여기 섞지 않는다. 카드 목록(1j-4)은 별도 화면.

### 한 줄 만들기 (`VisitListItem.toRow`)

```kotlin
private fun VisitListItem.toRow() = RecordItem(
    id = id,
    cardId = cardId?.toString(),
    title = cardTitle,
    status = RecordItem.Status.CONFIRMED,   // 서버 응답은 항상 진료 완료
    meta = listOfNotNull(visitedOn.format(VISITED_ON) + " 진료", clinic).joinToString(" · "),
)
private val VISITED_ON = DateTimeFormatter.ofPattern("MM.dd", Locale.KOREAN)
```

- **실제 서버 데이터의 status는 언제나 `CONFIRMED`다.** "기록이 있다는 것은 진료를 다녀왔다는 뜻이라 상태가 하나다."
- `detail`, `resumeLabel`은 서버 목록 응답에 원문이 없어 **항상 비운다**. 작성 중·진료 전이 섞인 목록은 Preview(`previewRecordGroups`)에서만 볼 수 있다.
- `meta` 예시: 병원 있음 → `"09.12 진료 · 서울OO병원 내과"`, 병원 없음 → `"09.12 진료"`.

### Preview 목데이터 `previewRecordGroups` (1j-1 시안 그대로, 4건)

| 묶음 | id | title | status | meta | detail | resumeLabel |
| -- | -- | -- | -- | -- | -- | -- |
| 2026년 9월 | `card-3` | 무릎 통증 | DRAFT | `오늘 · 증상 문답 4단계 중 2단계` | — | `이어서 정리하기` |
| 2026년 9월 | `card-2` | 두통 · 잦은 어지러움 | BEFORE_VISIT | `08.21 작성 · 병원 미정` | `묻고 싶은 것 3개 · 통증 2단계` | — |
| 2026년 9월 | `card-1` | 복부 통증 · 3주 | CONFIRMED | `09.12 진료 · 서울OO병원 내과` | `위염 초기 · 2주 약 · 09.26 재방문` | — |
| 2026년 7월 | `card-0` | 목 통증 · 삼킬 때 아픔 | CONFIRMED | `07.18 진료 · OO이비인후과` | `인후염 · 5일 약 · 재방문 없음` | — |

## 1.7 묶음 머리 (`GroupHeader` → `MedicalMateSectionHeader`)

- 좌: `group.monthLabel`, `Heading/M`, `fg/default` `#131722`
- 우: 캡션(**누를 수 없는 표시**), `Body/M Strong` 15px SemiBold, `fg/subtle` `#585F73`
  - 편집 아님 → `R.string.record_count` = **`%1$d건`** (예: `3건`)
  - 편집 중 → `R.string.record_selected` = **`%1$d건 선택됨`** (그 달에서 고른 수, 예: `1건 선택됨`)
- Row: `justify-content: space-between`, `align-items: center`, `padding: 24px 0 10px`
- 구현 주의: `GroupList`는 기록(1j-1)과 브리핑 카드 전체(1j-4)가 함께 쓰는 공용 컴포넌트다. 세는 단위만 다르다 — **기록은 "건", 카드는 "장"**. 웹에서도 `countLabel`/`selectedLabel`을 props로 받도록 만들 것.

## 1.8 기록 한 줄 (`RecordRow`)

디자인 시스템의 `MedicalMateListRow`를 **쓰지 않는다**. 그 컴포넌트는 메타 한 줄까지인데 이 화면은 메타가 두 줄 + 이어하기 줄이 더 붙는다. 마스터 `List Row`(`335:1114`)의 겉모양만 여기서 직접 그린다. `MedicalMateCard`도 쓰지 않는다(#229) — Card는 최소 높이 116 + 패딩 20 강제인데 이 줄은 104(편집 시 80)라 아래가 빈다.

### 컨테이너

| 속성 | 값 |
| -- | -- |
| 폭 | `fill` |
| 그림자 | `Elevation/Card` = 3dp. Figma 원본 `#1B255A14 0 3 blur 10` + `#1B255A0D 0 1 blur 2`. **CSS**: `box-shadow: 0 3px 10px rgba(27,37,90,0.08), 0 1px 2px rgba(27,37,90,0.05)` |
| 배경 | `bg/surface` `#FFFFFF` |
| radius | `md` = **16px** |
| 패딩 | 좌 **18** / 우 **14** / 위아래 **16** (오른쪽이 좁은 이유: chevron·체크가 48 영역을 갖고 있어서) |
| 선택됨 테두리 | **1.5px** `border/focus` = Primary500 `#5566D2` (브리핑 카드 편집 1e-1-E와 같은 굵기) |
| 높이 | 평시 104, 편집 중 80 (시안 값. 내용으로 자연히 결정됨) |
| 클릭 | 전체 행이 클릭 영역 |

### 내부 Row (`gap: 8px`, `align-items: center`)

1. **(편집 중에만)** `MedicalMateCheckbox` — `label = null`, `margin-right: 4`. 체크 박스 크기 `BoxSize`, radius 8(`xs`), 체크 시 배경 `bg/primary` `#5566D2`, 미체크 시 `bg/surface`. 최소 높이 `SelectionRowHeight`, 좌우 패딩 4, `role=checkbox`
2. **글자 묶음** (`flex: 1`) — 아래 표
3. **(편집 아닐 때만)** `ChevronRight` 아이콘, tint `fg/muted` `#7C8397`
   - 편집 중에는 chevron을 **뺀다**. "누르면 고르는 것이지 들어가는 것이 아니다."

### 글자 묶음 (`RowText`) — Column `gap: 4px`

| 순서 | 내용 | 타이포 | 색 | 조건 |
| -- | -- | -- | -- | -- |
| 1 | Row(`gap: 6px`, center): `item.title` + 상태 배지 | `Heading/S` 17px/24 SemiBold, ls -1% | `fg/default` `#131722` | 항상 |
| 2 | `item.meta` | `Body/S` 13px/20 Regular | `fg/subtle` `#585F73` | 항상 |
| 3 | `item.detail` | `Body/S` | `fg/subtle` | 편집 아님 **&&** detail != null |
| 4 | `item.resumeLabel` | `Body/S` | **`fg/warning` `#8A5A0B`** | 편집 아님 **&&** resumeLabel != null |

편집 중에는 3·4줄을 감춘다(`if (editing) return@Column`). 소스 주석: "이어서 하라는 안내도 들은 내용도 고르는 동안에는 할 일이 아니다. 시안이 편집에서 줄 높이를 104에서 80으로 낮춘 것이 이 한 줄만큼이다."

제목과 배지 사이 6px는 마스터 `Title Row` 값이다. "목록마다 다르면 같은 칩이 화면마다 다른 거리에 선다."

### 행 클릭 동작

```kotlin
onClick = { if (selected == null) onItemClick(item) else onSelectChange(item.id, !selected) }
```

- 편집 아님 → 상세로 이동
- 편집 중 → 선택 토글 (체크박스를 눌러도 같은 `onClick`이 돈다)

## 1.9 편집 모드 (1j-1-D)

### 들어가기 / 나오기

| 트리거 | 동작 |
| -- | -- |
| NavBar 우측 **`편집`** | `onEditStart()` → `selectedIds = emptySet()` |
| NavBar 우측 **`취소`** | `onEditCancel()` → `selectedIds = null`, `deleteRequested = false`. **고른 것은 버린다. 취소가 실행 취소를 대신한다.** |

NavBar 우측 라벨 규칙(`navActionLabel`):

```kotlin
content == null || content.groups.isEmpty() -> null   // 로딩·실패·빈 목록에는 액션 없음
content.editing                             -> "취소"
else                                        -> "편집"
```

이유: "지울 것이 없는데 편집으로 들어갈 수 있으면 빈 화면에 삭제 버튼만 서게 된다. 문서의 CRUD 규칙대로 한 자리에서 이름만 바뀐다."

**상단 왼쪽은 편집 중에도 비운다.** 시안에는 뒤로가기가 있지만 탭 화면이라 돌아갈 곳이 없다. 편집을 빠져나가는 길은 오른쪽 `취소`뿐이다.

### 하단 삭제 바 (`DeleteBar`)

- `MedicalMateBottomCtaBar`(배경 `bg/surface`, `Elevation/Float` 4dp 그림자 — 화면 맨 아래라 위쪽 ambient만 보임) 안에 풀폭 버튼
- 버튼 타입 `DANGER` → 컨테이너 `bg/danger` Red50 `#FFEDEB`, 글자 `fg/danger` Red700 `#C4302B`, 테두리 없음
- 버튼 높이 56 / radius 16(L 사이즈) / 라벨 `Label/L`
- 라벨:
  - 0건 선택 → **`삭제`** (`record_delete`)
  - n건 선택 → **`%1$d건 삭제`** (`record_delete_count`, 예: `2건 삭제`)
- `enabled = count > 0`

소스 주석: "고른 건수가 버튼 글자에 들어간다. 시안이 `Select Bar`를 지우고 건수를 이 자리로 옮겼다. 줄 하나를 더 쓰지 않고도 몇 건인지가 누르기 직전에 보인다."

### ViewModel 쪽 가드 (웹에서도 그대로 옮길 것)

`RecordViewModel`의 편집 조작은 전부 `updateContent`를 통과한다.

```kotlin
private fun updateContent(change: (Content) -> Content) {
    val content = mutableUiState.value as? RecordUiState.Content ?: return  // ①
    mutableUiState.value = change(content)
}
```

| # | 가드 | 코드 | 뜻 |
| -- | -- | -- | -- |
| ① | 상태가 `Content`가 아니면 **전부 무시** | `as? Content ?: return` | 로딩·실패 화면에서 들어온 편집/선택/삭제 조작은 아무 일도 하지 않는다 |
| ② | 편집이 아니면 선택 변경 무시 | `onSelectChange`: `val ids = content.selectedIds ?: return@updateContent content` | `selectedIds == null`인데 토글이 들어오면 상태를 그대로 돌려준다 |
| ③ | **0건이면 다이얼로그를 열지 않는다** | `onDeleteClick`: `if (it.selectedCount == 0) it else it.copy(deleteRequested = true)` | 버튼이 `enabled = count > 0`이라 눌리지 않지만, ViewModel이 한 번 더 막는다 |
| ④ | 0건이면 삭제를 실행하지 않는다 | `onDeleteConfirm`: `if (ids.isEmpty()) return` | 서버를 부르기 전에 끊는다 |

③·④는 같은 규칙의 이중 방어다. 웹에서 버튼 `disabled`만 걸고 상태 함수의 가드를 빼면, 키보드·스크립트 경로로 빈 삭제가 들어갈 수 있다.

### 삭제 확인 다이얼로그 (`content.deleteRequested == true`)

`MedicalMateDialog` (radius 24 `xl`, 폭 `DialogWidth`, 배경 `bg/surface`, 패딩 좌우 20 / 위 `TopPadding` / 아래 16, 내부 `gap: 10`, 가운데 정렬, 상단에 DANGER 톤 아이콘 배지)

| 슬롯 | 문구 (원문) | 리소스 |
| -- | -- | -- |
| 제목 | **`기록 %1$d건을 삭제할까요?`** | `record_delete_title` |
| 본문 | **`선택한 기록이 사라지고 되돌릴 수 없어요.`** | `record_delete_body` |
| 확인 | **`삭제`** | `record_delete_confirm` |
| 취소 | **`취소`** | `record_edit_cancel` |

`%1$d`에는 `content.selectedCount`가 들어간다. 예: `기록 2건을 삭제할까요?`

### 삭제 실행 흐름 (`onDeleteConfirm`)

```kotlin
val ids = selectedIds.orEmpty()
if (ids.isEmpty()) return
deleteRequested = false            // 다이얼로그 먼저 닫음
val gone = repository.deleteAll(ids)   // 한 건씩 DELETE, 성공한 id만 돌려받음
state.without(gone).copy(selectedIds = null)  // 지워진 것만 목록에서 빼고 편집 종료
```

`without(ids)`:
```kotlin
groups.map { it.copy(items = it.items.filterNot { row -> row.id in ids }) }
      .filter { it.items.isNotEmpty() }   // 묶음이 비면 그 달 헤더도 사라진다
```

**중요 규칙 3가지 (웹에서 반드시 재현):**
1. 여러 건을 한 번에 지우는 API가 없다. `DELETE /api/visits/{id}`를 **한 건씩** 부른다.
2. **일부가 실패해도 나머지는 계속 지운다.** 실패한 id는 목록에 **남긴다** — "실패한 것을 함께 빼면 지워지지 않은 기록이 지워진 것처럼 보이고, 다시 열었을 때 되살아난 것으로 읽힌다."
3. 지운 뒤 편집에서 **빠져나온다**(`selectedIds = null`). 전부 지워 `groups`가 비면 그대로 빈 상태(1j-2)가 된다.
4. 지우는 것은 **기록(visit)**이고 **카드는 남는다**(#178, #157).

## 1.10 로딩 / 빈 상태 / 에러

### 로딩 (`RecordUiState.Loading`)

- `MedicalMateLoadingSpinner`가 본문 영역(`weight(1f)`) 전체를 차지
- 내부: 세로·가로 가운데 정렬, 최소 높이 `LoadingMinHeight`, 패딩 20
- 스피너: `CircularProgressIndicator`, 색 `bg/primary` `#5566D2`, 크기 `iconLg` **24px**
- **메시지 없음** (`message = null`)
- NavBar는 그대로, 우측 `편집` **없음**, 하단 탭바는 그대로 보임

### 빈 상태 (`Content` + `groups.isEmpty()`) — 1j-2

`MedicalMateEmptyState(type = NO_RECORD, ...)`, `Modifier.weight(1f).padding(horizontal = 20)`

| 슬롯 | 값 (원문) | 리소스 |
| -- | -- | -- |
| 아이콘 | `MedicalMateIcons.EmptyBox` (NO_RECORD 기본) | — |
| 제목 | **`아직 진료 기록이 없어요`** | `record_empty_title` |
| 설명 | **`증상을 정리해두면 진료실에서 바로 보여줄 수 있어요`** | `record_empty_description` |
| 행동 | **`증상 정리하기`** | `record_empty_action` |

빈 상태 컴포넌트 규격:
- 세로 가운데 정렬 (`justify-center`). 본문 남은 높이를 전부 받아 그 안에서 가운데. 소스 주석: "시안이 677 안에 282를 y=193.5에 뒀는데 가운데(197.5)와 4 차이다. 위쪽에 붙여 두면 아래가 통째로 빈다."
- 아이콘 원: **72px** 원, 배경 `bg/primary-faint` Primary50 `#F2F4FE`, 아이콘 **32px**, tint `fg/primary` `#2E3E9E`
- 바깥 세로 패딩 40, 요소 간격 12
- 글 묶음은 원과 `12 + 4` 떨어지고 제목-설명 사이는 6
- 제목 `Heading/M`, `fg/default`. 설명 `Body/M` 15/24, `fg/subtle`. 둘 다 가운데 정렬
- 행동 버튼은 **채움 없는 글자**: 높이 48, radius 14(`buttonM`), 좌우 패딩 20, `Label/L`, 색 `fg/link` Primary700 `#2E3E9E`. (마스터는 Tonal 알약이지만 1j-2 인스턴스가 채움을 지웠다)

빈 상태에서도 **하단 탭바는 보인다**. NavBar 우측 `편집`은 **없다**.

### 에러 (`RecordUiState.Failed`)

시안에 없는 화면이다(소스 주석: "시안에 이 화면은 없다"). 빈 상태와 **같은 자리**에 둔다.

`MedicalMateEmptyState(type = NO_RESULT, ...)`, `weight(1f).padding(horizontal = 20)`

| 슬롯 | 값 (원문) | 리소스 |
| -- | -- | -- |
| 아이콘 | `MedicalMateIcons.SearchOff` (NO_RESULT 기본) | — |
| 제목 | **`기록을 불러오지 못했어요`** | `record_failed_title` |
| 설명 | **`인터넷 연결을 확인하고 다시 시도해주세요`** | `record_failed_description` |
| 행동 | **`다시 시도`** | `record_retry` → `viewModel.load()` |

`ApiResult.Rejected`(HTTP 오류)와 `ApiResult.NetworkUnavailable`(연결 없음)을 **구분하지 않고 둘 다 `Failed`**로 처리한다.

```kotlin
fun load() {
    mutableUiState.value = RecordUiState.Loading      // ← 먼저 Loading으로 되돌린다
    viewModelScope.launch {
        mutableUiState.value = when (val result = repository.visits()) {
            is ApiResult.Success -> RecordUiState.Content(groups = result.value.toGroups())
            is ApiResult.Rejected, is ApiResult.NetworkUnavailable -> RecordUiState.Failed
        }
    }
}
```

**`load()`는 상태를 통째로 갈아 끼운다.** `Content(groups = …)`를 **기본값으로 새로 만들기** 때문에 `selectedIds`는 `null`, `deleteRequested`는 `false`로 돌아간다. 즉 재조회가 일어나면 **편집 모드와 고른 항목이 사라진다.** 진입 시 로드와 `다시 시도`가 같은 함수라 규칙도 같다. 웹에서 재조회를 하면서 선택을 유지하도록 만들면 안드로이드와 동작이 갈린다.

## 1.11 네비게이션 — 이 화면에서 나가는 모든 경로

| # | 트리거 | 목적지 | 방식 | 소스 |
| -- | -- | -- | -- | -- |
| 1 | 기록 행 탭 (편집 아닐 때) | `RecordDetailDestination(recordId = item.id)` → `/record/:recordId` | `navigate` (스택 push) | `MedicalMateNavGraphs.kt:297` |
| 2 | 빈 상태 `증상 정리하기` | `IntakeDestination()` (증상 문답) | `navigate` | `MedicalMateNavGraphs.kt:298` |
| 3 | 하단 탭 `캘린더` | `CalendarDestination` | `selectTab` — `popUpTo(start, saveState=true)` + `launchSingleTop` + `restoreState` | `MedicalMateNavHost.kt:200` |
| 4 | 하단 탭 `홈` | `HomeDestination` | 동일 | 동일 |
| 5 | 하단 탭 `기록` (자기 자신) | `RecordDestination` | `launchSingleTop`으로 중복 스택 방지 | 동일 |

**나가지 않는 조작**: 편집 진입/취소, 체크 토글, 삭제 버튼, 다이얼로그 확인/취소, 다시 시도.

**전환 애니메이션**: 탭 ↔ 탭은 `EnterTransition.None` / `ExitTransition.None`(즉시 전환). 탭 → 상세는 가로 슬라이드 + 페이드, **320ms**, `FastOutSlowInEasing`, 물러나는 화면은 1/4만 이동(parallax 4). 웹에서는 탭 전환은 애니메이션 없이, 상세 진입만 슬라이드로.

## 1.12 이 화면이 쓰는 디자인 시스템 컴포넌트

| 컴포넌트 | 용도 | variant/props |
| -- | -- | -- |
| `MedicalMateNavBar` | 상단 바 | `title="기록"`, `leading = NONE`, `actionLabel = 편집/취소/null`, `surface = OPAQUE` |
| `MedicalMateNavLeading` | leading enum | `NONE` |
| `MedicalMateLoadingSpinner` | 로딩 | `message = null` |
| `MedicalMateEmptyState` | 빈/실패 | `NO_RECORD`(빈), `NO_RESULT`(실패) |
| `MedicalMateEmptyStateType` | 타입 enum | `NO_RECORD`, `NO_RESULT`, (미사용: `OFFLINE`, `MIC_DENIED`) |
| `MedicalMateSectionHeader` | 월 묶음 머리 | `title`, `caption` (action 아님) |
| `MedicalMateBadge` | 상태 배지 | `tone = WARNING / BRAND / SUCCESS` |
| `MedicalMateBadgeTone` | 톤 enum | 위 3개 사용 (`NEUTRAL`, `DANGER`는 미사용) |
| `MedicalMateCheckbox` | 편집 선택 | `label = null` |
| `MedicalMateBottomCtaBar` | 편집 하단 바 | `surface = OPAQUE` |
| `MedicalMateButton` | 삭제 버튼 | `type = DANGER`, `fillMaxWidth`, `enabled = count > 0` |
| `MedicalMateButtonType` | 버튼 타입 enum | `DANGER` |
| `MedicalMateDialog` | 삭제 확인 | 기본 `tone = DANGER` |
| `MedicalMateTabBar` | 하단 탭 | `selected = MedicalMateTab.RECORD` |
| `MedicalMateTab` | 탭 enum | `CALENDAR("캘린더")`, `HOME("홈")`, `RECORD("기록")` — **이 순서로 왼쪽부터** |

직접 그린 것(공용 컴포넌트 아님): `RecordRow`(면+radius 16+그림자+좌18/우14/상하16), `RowText`.

## 1.13 기록 탭 문구 전체 (strings.xml 원문 그대로)

| 리소스 키 | 원문 |
| -- | -- |
| `record_title` | `기록` |
| `record_count` | `%1$d건` |
| `record_selected` | `%1$d건 선택됨` |
| `record_status_draft` | `작성 중` |
| `record_status_before_visit` | `진료 전` |
| `record_status_confirmed` | `진료 완료` |
| `record_edit` | `편집` |
| `record_edit_cancel` | `취소` |
| `record_select` | `%1$s 선택` — **선언되어 있으나 코드에서 참조하는 곳이 없다.** 체크박스 접근성 라벨로 의도된 듯하나 `RecordRow`가 `label = null`을 넘긴다 (7장 4번 참고) |
| `record_delete` | `삭제` |
| `record_delete_count` | `%1$d건 삭제` |
| `record_delete_title` | `기록 %1$d건을 삭제할까요?` |
| `record_delete_body` | `선택한 기록이 사라지고 되돌릴 수 없어요.` |
| `record_delete_confirm` | `삭제` |
| `record_empty_title` | `아직 진료 기록이 없어요` |
| `record_empty_description` | `증상을 정리해두면 진료실에서 바로 보여줄 수 있어요` |
| `record_empty_action` | `증상 정리하기` |
| `record_failed_title` | `기록을 불러오지 못했어요` |
| `record_failed_description` | `인터넷 연결을 확인하고 다시 시도해주세요` |
| `record_retry` | `다시 시도` |
| `tab_calendar` / `tab_home` / `tab_record` | `캘린더` / `홈` / `기록` |

## 1.14 기록 탭 Preview 목록 (`RecordScreen.kt`)

`@MedicalMateScreenPreviews`가 붙은 것 **세 개**뿐이다. 웹의 스토리북 스토리를 이 셋에 1:1로 맞추면 안드로이드가 시각 검증한 상태와 같아진다.

| Preview 함수 | 상태 | 대응 |
| -- | -- | -- |
| `RecordScreenPreview` | `Content(groups = previewRecordGroups)` | 1j-1 (목록 있음) |
| `RecordScreenEditingPreview` | `Content(groups = previewRecordGroups, selectedIds = setOf("card-3", "card-1"))` | 1j-1-D2 (2건 선택) — 고른 둘이 **같은 달(2026년 9월)**이라 그 달 머리가 `2건 선택됨`, 7월 머리는 `0건 선택됨`, 하단 버튼은 `2건 삭제` |
| `RecordScreenEmptyPreview` | `Content(groups = emptyList())` | 1j-2 (빈 상태) |

**`Loading`과 `Failed`에는 Preview가 없다.** 두 상태는 소스에 구현되어 있지만 시각 검증 대상이 아니다(실패 화면은 "시안에 이 화면은 없다"). 편집 진입 직후(`selectedIds = emptySet()`, 0건 선택 → 삭제 버튼 비활성) 상태도 Preview가 없다 — 웹에서 이 상태를 만들려면 직접 조합해야 한다.

---

# 2. 기록 상세 (1j-3)

## 2.1 Figma 화면 id

| 상태 | 와이어프레임 | Figma node |
| -- | -- | -- |
| 기본 | `1j-3` | `735:3829` |
| 머리글(제목·상태·병원) | — | `735:3837` |
| 타임라인 컨테이너 | — | `735:3843` |
| 단계 블록 | — | `735:3850` |
| 펼침 줄 (접힘 상태) | — | `735:3864` |
| 카드 펼친 상태 | `1j-3-X` | `1038:2768` |
| 재방문 누적 | `1j-3-R` | `1039:2799` |
| 예정 알림 인스턴스 | — | `1076:4047` |

## 2.2 라우트 / 진입·이탈

- 라우트: `RecordDetailDestination(recordId: String)`. 웹 경로 제안: **`/record/:recordId`**
- 진입: 기록 목록의 행 탭 (유일한 경로)
- `LaunchedEffect(recordId) { viewModel.load(recordId) }`
- **나가는 길은 뒤로가기 하나뿐이다.** NavBar 왼쪽 `<` → `popBackStack()`
  - 소스 주석: "전에는 카드 단계에서 브리핑 카드 화면으로 건너갔다. 시안 1j-3-X가 그 자리에서 펴 보는 것으로 바꿔서 나갈 일이 없어졌다. 다른 두 단계의 여는 줄도 목적지가 없어 데이터에 넣지 않았다. **눌러도 아무 일이 없는 줄을 두지 않는다**(#79)."
- 하단 탭바 **없음** (흐름 안의 화면)
- 뒤로가기 전환: 가로 슬라이드 + 페이드 320ms. 안드로이드 가장자리 스와이프(predictive back)도 같은 전환을 쓴다.
- 라우트 객체는 `@Serializable internal data class RecordDetailDestination(val recordId: String)` — **id가 문자열이다.** 숫자 변환은 ViewModel이 한다(2.11 참고).
- 화면 루트 배경도 기록 탭과 같은 `bg/surface` `#FFFFFF`다.

### 화면 시그니처 — 상태가 둘로 나뉘어 들어온다

```kotlin
@Composable
fun RecordDetailScreen(
    state: RecordDetailUiState,        // Loading / Failed / Content(detail)
    onBackClick: () -> Unit,
    expandedSteps: Set<Int>,           // ← UiState 밖. 별도 StateFlow다
    onExpandToggle: (Int) -> Unit,
    onRetryClick: () -> Unit,
    modifier: Modifier = Modifier,
)
```

목록 화면과 달리 콜백을 `data class`로 묶지 않고 **개별 파라미터**로 받는다(조작이 셋뿐이라). `RecordDetailRoute`가 `uiState`와 `expandedSteps` **두 개의 StateFlow를 각각** `collectAsStateWithLifecycle()`로 구독하고, `onRetryClick = { viewModel.load(recordId) }`로 같은 id를 다시 읽는다.

## 2.3 화면 레이아웃 (위 → 아래)

```
┌──────────────────────────────────────────────┐
│ [NavBar] GLASS (bg/surface 알파 0.82, blur 24) │
│   좌: < ChevronLeft (48 슬롯)                  │
│   가운데: "기록 상세" Heading/S 17              │
│   우: 액션 없음                                │
├──────────────────────────────────────────────┤
│ [스크롤 영역] weight(1f), verticalScroll        │
│   padding: 좌우 20 / 위 16 / 아래 28            │
│                                              │
│   ┌ Head (margin-bottom 18, gap 6) ────────┐  │
│   │ Row(gap 6): 제목 Heading/L 24  [배지]   │  │
│   │ clinicLine  Body/M 15  fg/subtle       │  │
│   └────────────────────────────────────────┘  │
│                                              │
│   ┌ Timeline ──────────────────────────────┐  │
│   │ ● 09.26 예정            ← WhenRow      │  │
│   │ │  ┌ Notice(BRAND) ─────────────┐      │  │
│   │ │  │ ⓘ 다음 진료가 예약돼 있어요   │      │  │
│   │ │  │   9월 26일 (토) 오전 10:30  │      │  │
│   │ │  └────────────────────────────┘      │  │
│   │ │  (아래 16 간격, 세로선이 이 구간 덮음)  │  │
│   │ ● 09.12 · 진료 후 기록                  │  │
│   │ │  ┌ Block ─────────────────────┐      │  │
│   │ │  │ 진료 후 기록  Heading/S      │      │  │
│   │ │  │ 소견   위염 초기 소견         │      │  │
│   │ │  │ 검사   혈액검사 시행 · …      │      │  │
│   │ │  │ 약     2주분 처방 · …        │      │  │
│   │ │  │ 재방문 2주 뒤 (9월 26일 전후) │      │  │
│   │ │  └────────────────────────────┘      │  │
│   │ ● 09.04 작성            ← 마지막(선 없음) │  │
│   │    ┌ Block + 펼침 ───────────────┐      │  │
│   │    │ 브리핑 카드                  │      │  │
│   │    │ 부위 / 기간 / 양상 (접힘 3줄) │      │  │
│   │    │ ───────── Divider ────────  │      │  │
│   │    │ 카드 전체 보기            ⌄  │      │  │
│   │    └────────────────────────────┘      │  │
│   └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

## 2.4 상태 모델 — `RecordDetailUiState`

```kotlin
sealed interface RecordDetailUiState {
    data object Loading
    data object Failed
    data class Content(val detail: RecordDetail)
}
```

펼침 상태는 UiState **밖**에 있다. ViewModel이 별도 `StateFlow<Set<Int>>`로 든다.

### `RecordDetail` 전체 필드

| 필드 | Kotlin 타입 | 기본값 | 설명 |
| -- | -- | -- | -- |
| `id` | `String` | (필수) | `visits.first().id` — **서버가 준 목록의 첫 항목**(= 최근 진료일 순의 맨 앞)이다. 날짜를 다시 비교해 고르지 않는다 |
| `title` | `String` | (필수) | 머리 제목. **브리핑 카드의 제목**. 없으면 목록이 든 제목, 그것도 없으면 병원 이름 |
| `status` | `RecordItem.Status` | (필수) | 배지 **색**을 정한다. 서버 경로에서는 언제나 `CONFIRMED` |
| `clinicLine` | `String` | (필수) | 둘째 줄. 어디서 언제 받았는지를 **데이터가 문장으로 만든다** |
| `steps` | `List<RecordStep>` | (필수) | 타임라인. **최신순으로 온다. 화면은 받은 순서대로 그린다** |
| `badge` | `String?` | `null` | 있으면 배지 **문구**를 덮는다. 재방문이 쌓이면 `"진료 2회"` |

> ⚠️ **소스에 "최신"이 두 개 있고 계산식이 다르다. 웹에서 하나로 합치면 안 된다.**
>
> | 이름 | 계산 | 쓰이는 곳 |
> | -- | -- | -- |
> | `newest` | `visits.first()` — **목록 순서**의 첫 항목 | `RecordDetail.id`, `title` 폴백의 `newest.clinic` |
> | `latest` | `visits.maxByOrNull { it.visitedOn ?: LocalDate.MIN } ?: visit` — **날짜 최댓값** | 예정 단계의 기준일(`latestOn`), `nextVisit(cardId, latest.visitedOn)`, `latest.followUp` |
>
> 서버가 최근 진료일 순으로 주므로 보통 둘이 같다. 그러나 `visitedOn`이 null인 기록이 섞이거나 서버 정렬이 어긋나면 갈린다. `latest` 쪽이 null을 `LocalDate.MIN`으로 낮춰 잡는 것까지 그대로 옮길 것.

### `RecordStep` (sealed) — 공통 `at: String`

`at`은 점 옆에 붙는 "때" 문자열이다. 날짜와 종류를 화면이 이어 붙이지 않는다 — 단계마다 문장이 다르기 때문.

#### `RecordStep.Block`

| 필드 | Kotlin 타입 | 기본값 | 설명 |
| -- | -- | -- | -- |
| `at` | `String` | (필수) | 점 옆 라벨. 예 `09.12 · 진료 후 기록`, `09.04 작성` |
| `title` | `String` | (필수) | 블록 제목. `진료 후 기록` / `브리핑 카드` |
| `items` | `List<RecordDetailItem>` | (필수) | 키-값 줄 |
| `quote` | `RecordQuote?` | `null` | 환자 원문 인용. **현재 ViewModel은 절대 채우지 않는다**(테스트 `원문은 담지 않는다`가 보증). Fixture에도 없음 |
| `card` | `RecordStepCard?` | `null` | **있으면 접었다 펼 수 있다.** 브리핑 카드 단계만 가진다 |

#### `RecordStep.Pending`

| 필드 | Kotlin 타입 | 기본값 | 설명 |
| -- | -- | -- | -- |
| `at` | `String` | (필수) | 예 `09.26 예정`, `진료 예정`, `카드 예정` |
| `message` | `String` | (필수) | Notice 제목 |
| `detail` | `String?` | `null` | Notice 본문(둘째 줄). 있을 때만 나온다 |

#### `RecordDetailItem`

| 필드 | Kotlin 타입 | 기본값 | 설명 |
| -- | -- | -- | -- |
| `key` | `String` | (필수) | 왼쪽 이름. 폭 **52px 고정** |
| `value` | `String` | (필수) | 오른쪽 값. `\n` 줄바꿈이 들어올 수 있다(fixture `card-4` 참고) |
| `tone` | `Tone` | `DEFAULT` | 값 색. `DEFAULT` / `WARNING` / `LINK` |

| `Tone` | 색 토큰 | hex | 쓰이는 곳 |
| -- | -- | -- | -- |
| `DEFAULT` | `fg/default` | `#131722` | 대부분 |
| `WARNING` | `fg/warning` | `#8A5A0B` | 알러지 등 (fixture에는 사용 예 없음) |
| `LINK` | `fg/primary` | `#2E3E9E` | `기간`, `재방문` 날짜 — **목데이터에서만** |

> ⚠️ **실제 서버 경로는 `tone`을 한 번도 지정하지 않는다.** `Visit.toRecordStep`은 `RecordDetailItem(key = it.label, value = it.value)`, `BriefCard.toStep`은 `RecordDetailItem(key = it.key, value = it.value)`로 만들어 **전부 기본값 `DEFAULT`**다. `LINK`(기간·재방문)와 `WARNING`(알러지)이 붙은 줄은 `RecordDetailFixtures`에만 존재한다. 모델과 렌더링(`itemValueColor`)은 완비되어 있으니 웹에서도 필드는 남기되, **서버 데이터로는 색이 안 나온다**는 것을 알고 있을 것. (7장 10번)

#### `RecordQuote`

| 필드 | Kotlin 타입 | 설명 |
| -- | -- | -- |
| `label` | `String` | 인용 블록 상단 라벨 |
| `text` | `String` | 원문 |

#### `RecordStepCard` (펼침 가능한 브리핑 카드)

| 필드 | Kotlin 타입 | 기본값 | 설명 |
| -- | -- | -- | -- |
| `collapsedItemCount` | `Int` | (필수) | 접혀 있을 때 보이는 줄 수. **항상 3** (`COLLAPSED_ITEMS`/`COLLAPSED_CARD_ITEMS`). 시안이 부위·기간·양상 셋을 남긴다 |
| `severity` | `MedicalMateSeverity?` | `null` | 통증 단계 1~5 |
| `allergies` | `List<String>` | `emptyList()` | 알러지 |
| `questions` | `List<String>` | `emptyList()` | 환자가 묻고 싶어 하는 것 |

"어느 줄을 남길지가 아니라 **몇 줄을 남길지**로 받는 이유는, 카드의 줄 순서를 데이터가 정하고 앞쪽이 늘 더 중요한 값이기 때문이다."

```ts
// TypeScript 대응
type ItemTone = 'DEFAULT' | 'WARNING' | 'LINK';
type Severity = 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3' | 'LEVEL_4' | 'LEVEL_5';

interface RecordDetailItem { key: string; value: string; tone?: ItemTone; }
interface RecordQuote { label: string; text: string; }
interface RecordStepCard {
  collapsedItemCount: number;      // 항상 3
  severity?: Severity | null;
  allergies?: string[];
  questions?: string[];
}
type RecordStep =
  | { kind: 'block'; at: string; title: string; items: RecordDetailItem[];
      quote?: RecordQuote | null; card?: RecordStepCard | null; }
  | { kind: 'pending'; at: string; message: string; detail?: string | null; };

interface RecordDetail {
  id: string;
  title: string;
  status: RecordStatus;   // 색 결정
  clinicLine: string;
  steps: RecordStep[];    // 최신이 [0]
  badge?: string | null;  // 있으면 문구를 덮음
}

type RecordDetailUiState =
  | { kind: 'loading' }
  | { kind: 'failed' }
  | { kind: 'content'; detail: RecordDetail };

// 펼침 상태는 별도: expandedSteps: Set<number> (steps 배열의 index)
```

## 2.5 머리글 `Head` (Figma `735:3837`)

- Column, `margin-bottom: 18px`, `gap: 6px`
- 1줄: Row(`gap: 6px`, `align-items: center`)
  - `detail.title` — `Heading/L` **24px / line-height 34 / Bold 700 / letter-spacing -2%**, `fg/default` `#131722`
  - `MedicalMateBadge(label = detail.badge ?: recordStatusLabel(detail.status), tone = recordStatusTone(detail.status))`
    - **문구는 `badge`가 덮고, 색은 언제나 `status`가 정한다.** `"진료 2회"`도 SUCCESS(초록) 배지다.
- 2줄: `detail.clinicLine` — `Body/M` 15/24 Regular, `fg/subtle` `#585F73`

### `clinicLine` 조립 규칙 (`RecordDetailViewModel.clinicLine`)

**병원이 앞, 날짜가 뒤다.**

```
clinic = 기록들 중 비어 있지 않은 첫 병원 이름
1건  → "{clinic} · {MM.dd} 진료"
n건  → "{clinic} · {oldest MM.dd} 초진 · {다음 MM.dd} 재방문 · ..."
```

- 여러 번인 쪽은 **오래된 순**이다. 타임라인은 최신이 위인데 이 줄만 반대인 이유: "여기가 흘러온 순서를 한 줄로 읽는 자리이기 때문이다."
- 병원은 `visits.firstNotNullOfOrNull { it.clinic?.takeIf { s -> s.isNotBlank() } }` — **공백만 있는 문자열도 없는 것으로 친다.** 여러 기록 중 이름이 있는 첫 건에서 가져온다.
- 날짜가 없으면 그 조각을 빼고 `" · "`로 잇는다 → 병원만 남을 수 있다.
- ⚠️ **병원도 날짜도 없으면 `clinicLine`이 빈 문자열 `""`이 된다.** `(listOfNotNull(clinic) + days).joinToString(" · ")`이라 방어가 없다. 그때 머리글 둘째 줄은 **빈 `Text`**로 그려진다(높이만 차지). 웹에서는 빈 문자열이면 요소 자체를 렌더하지 않는 편이 낫지만, **안드로이드와 여백이 달라진다**는 점을 알고 정할 것.
- 예시:
  - `서울OO병원 내과 · 09.12 진료`
  - `서울OO병원 내과 · 09.12 초진 · 09.26 재방문`
  - `08.21 작성 · 병원 미정` (진료 전 fixture — 이건 데이터가 통째로 만든 문장)

### `badge` 조립

```kotlin
badge = if (visits.size > 1) "진료 ${visits.size}회" else null
```

## 2.6 타임라인 (Figma `735:3843`)

### 세로선(Rail)

- 단계마다 `Modifier.drawBehind`로 **따로** 그린다. `trailing = index != steps.lastIndex`일 때만.
- 시작 y = **9px** (점 지름 10의 가운데. `When Row` 높이 18 안에서 점이 4부터 시작)
- x = **4px** (`RailOffset` = 점 반지름 5 − 선 두께 절반 1)
- 폭 = **2px**
- 아래 끝 = 그 단계 Column의 바닥 (아래 여백 16px 구간까지 덮음 → 다음 단계의 선과 이어진다)
- 색 = `border/subtle` Neutral200 `#DEE1EB`
- **마지막 단계는 그리지 않는다.** Figma의 `Rail Line`도 첫 점 가운데에서 마지막 점 가운데까지만 있다.
- 한 겹으로 감싸지 않은 이유: "아래에서 잘라낼 높이가 마지막 단계 높이에 따라 달라져 고정값으로 둘 수 없기 때문이다."

**CSS 대응**
```css
.step { position: relative; display: flex; flex-direction: column; gap: 6px; }
.step:not(:last-child) { padding-bottom: 16px; }
.step:not(:last-child)::before {
  content: ''; position: absolute; left: 4px; top: 9px; bottom: 0;
  width: 2px; background: var(--border-subtle);
}
```

### 단계 하나의 구조

```
Column(gap: 6px, padding-bottom: trailing ? 16 : 0)
 ├ WhenRow: Row(gap: 10, align-items: center)
 │    ├ 점: 10×10 원
 │    └ step.at : Label/M 13px/18 SemiBold, fg/subtle #585F73
 └ Box(padding-left: 20px)   ← IndentStart
      └ Block 또는 Pending
```

### 점 색 (지난 단계 vs 오지 않은 단계)

| 단계 종류 | 색 토큰 | hex |
| -- | -- | -- |
| `RecordStep.Block` | `bg/primary` Primary500 | `#5566D2` |
| `RecordStep.Pending` | `border/strong` Neutral500 | `#7C8397` |

소스 주석: "Figma는 앞의 셋에 `bg/primary`를, 재방문 예정에 `border/strong`을 썼다."

## 2.7 단계 블록 `RecordStepBlock` (Figma `735:3850`)

`Card` 컴포넌트를 **쓰지 않는다**. Card는 radius 20 / 패딩 20 / 최소 높이 116인데 이 블록은 radius 16 / 패딩 16이고 두 줄로 끝나는 것도 있다.

| 속성 | 값 |
| -- | -- |
| 폭 | fill |
| 그림자 | `Elevation/Card` 3dp (Row와 동일) — **크기 애니메이션보다 바깥에** 둔다. 안쪽에 두면 애니메이션이 그림자를 잘라 카드 좌우가 칼로 벤 것처럼 보인다 |
| 배경 | `bg/surface` `#FFFFFF` |
| radius | 16 (`md`) |
| 패딩 | 16 전면 |
| 내부 간격 | 8 |

### 내용 순서 (위 → 아래)

1. **`step.title`** — `Heading/S` 17/24 SemiBold, `fg/default`
2. **항목 줄들** — `shown = (step.card == null || expanded) ? items : items.take(collapsedItemCount)`
   - `StepItemRow`: Row `padding: 2px 0`, `gap: 14px`
     - key: `Body/S` 13/20, `fg/subtle`, **width 52px 고정**
     - value: `Body/M` 15/24, tone별 색, `flex: 1`
   - 브리핑 카드 화면(1e-1)의 `KV Row`(키 폭 72, 값 `Body/L`)를 **쓰지 않는다**. "블록 안 요약이라 키 폭 52에 값이 `Body/M`으로 한 단계 작다."
3. **`step.quote`** (있을 때만) — `MedicalMateQuoteBlock(label, text)`
   - radius `sm` 12, 패딩 12, 내부 간격 4
   - label: `Label/S` 11, `fg/primary`
   - text: `Body/S` 13, `fg/default`
   - **현재 데이터 경로에서는 절대 나오지 않는다**
4. **`step.card`** (있을 때만)
   - `expanded == true`면 `ExpandedCard(card)` 먼저
   - 그 다음 항상 `StepExpandRow`

### `ExpandedCard` — 펼쳤을 때만 나오는 것들

브리핑 카드 화면(1e-1)과 **같은 컴포넌트**를 쓴다. "같은 카드를 다른 자리에서 보는 것이라 모양이 갈리면 안 된다."

| 순서 | 조건 | 컴포넌트 | 내용 |
| -- | -- | -- | -- |
| 1 | `severity != null` | `MedicalMateSeverityReadout` | Row(`gap: 12`, 최소 높이 `ReadoutHeight`): 단계 칩(정사각 `LevelChipSize`, radius 8, 배경 severity base 색, 숫자 `Body/M Strong`, 글자 `fg/default`) + 낱말 `Body/L Strong` `fg/default` (flex 1) + `NRS %1$d–%2$d` `Body/S` `fg/subtle` |
| 2 | `allergies.isNotEmpty()` | `AllergyNotice` → `MedicalMateNotice(tone = WARNING)` | 제목 **`알러지 · {목록을 " · "로 join}`**, 본문 **`처방 전에 꼭 확인해 주세요`** |
| 3 | `questions.isNotEmpty()` | `QuestionsCallout` → `MedicalMateCallout` | 제목 **`환자가 묻고 싶어 하는 것`**. radius 20(`lg`), 배경 `bg/primary-subtle` `#E3E7FC`, 패딩 16, 내부 간격 12. 질문 한 줄 = 알약(radius 12, 배경 `bg/surface` 반투명) 안에 번호 원(`bg/primary`, `Label/S` 흰 숫자) + 질문 `Body/M` |

`MedicalMateSeverity` 값:

| enum | level | 라벨 (원문) | NRS | base 색 hex |
| -- | -- | -- | -- | -- |
| `LEVEL_1` | 1 | `조금 불편해요` | 1–2 | `#FFE3A8` |
| `LEVEL_2` | 2 | `은근히 아파요` | 3–4 | `#FFC79B` |
| `LEVEL_3` | 3 | `꽤 아파요` | 5–6 | `#FFA894` |
| `LEVEL_4` | 4 | `많이 아파요` | 7–8 | `#F58079` |
| `LEVEL_5` | 5 | `견디기 힘들어요` | 9–10 | `#DC5A55` |

NRS 표기: `NRS %1$d–%2$d` (en dash `–`, `–`). 접근성 이름: `%1$d단계, %2$s` (예: `3단계, 꽤 아파요`). NRS는 의료진용 표기라 스크린리더가 읽지 않는다.

## 2.8 "카드 전체 보기" 펼침 동작 (1j-3-X)

### 펼침 줄 `StepExpandRow` (Figma `735:3864` 접힘 / `1038:2768` 펼침)

```
─────────── Divider (1px, border/subtle #DEE1EB) ───────────
[ 카드 전체 보기                                      ⌄ ]
  Body/M Strong 15 SemiBold, fg/primary #2E3E9E     아이콘 fg/primary
  padding: 11px 0, role="button", 전체 폭 클릭 가능
```

| 상태 | 라벨 (원문) | 리소스 | 아이콘 |
| -- | -- | -- | -- |
| 접힘 | **`카드 전체 보기`** | `record_detail_expand` | `ChevronDown` |
| 펼침 | **`접기`** | `record_detail_collapse` | `ChevronUp` |

- `Button` 컴포넌트를 **쓰지 않는다**. "그쪽은 높이 56에 반경 16인 화면의 주 행동이다."
- 전에는 "가운데 정렬한 옅은 면의 줄"이었는데 시안이 구분선 + 좌측 글자 + 우측 화살표로 바꿨다. "누르면 화면을 옮기는 것이 아니라 이 자리가 늘어나는 조작이라, 면을 채운 버튼보다 접기·펴기로 읽히는 모양이 맞는다."

### 펼침 상태 보관

```kotlin
private val mutableExpanded = MutableStateFlow<Set<Int>>(emptySet())
val expandedSteps: StateFlow<Set<Int>> = mutableExpanded.asStateFlow()

fun onExpandToggle(index: Int) {
    mutableExpanded.value = mutableExpanded.value.let { if (index in it) it - index else it + index }
}
```

- **키는 `steps` 배열의 자리 번호(index)**다. 단계에 id가 없어서.
- ViewModel이 든다. "단계 안에 두면 목록이 다시 만들어질 때마다 접힌다."
- `load(recordId)` 호출 시 **`emptySet()`으로 초기화** → 다른 건을 열거나 재시도하면 모두 접힌다.
- 여러 단계를 동시에 펼칠 수 있다(Set이므로). 실제로는 `card != null`인 단계가 하나뿐이라 하나만 펼쳐진다.

### 펼칠 때 일어나는 일 (순서대로)

1. `expanded`가 true로 바뀐다 → `shown` 항목이 3줄 → 전체 줄로 늘고, `ExpandedCard`(강도/알러지/질문)가 삽입된다.
2. **높이 애니메이션**: `animateContentSize(tween(320, FastOutSlowInEasing))`
   - `EXPAND_DURATION = 320` — "화면 전환과 같은 Material 표준 값"
   - 이유(#243): "줄이 몇 개 더 붙고 통증 눈금·알러지·질문 블록까지 들어오는데 한 프레임에 튀면 무엇이 늘어난 것인지 눈이 따라가지 못한다."
   - **기기에서 애니메이션을 껐으면 즉시 바뀐다** → 웹에서도 `@media (prefers-reduced-motion: reduce)`에서 트랜지션 제거
3. **애니메이션이 끝난 뒤** `BringIntoViewRequester.bringIntoView()`로 그 블록을 화면 안으로 스크롤
   - `finishedListener`에서 카운터를 올리고 `LaunchedEffect(settled)`가 `settled > 0 && expanded`일 때만 호출
   - 이유: "브리핑 카드는 타임라인의 마지막 단계라 화면 아래쪽에 있고, 펼치면 새로 나온 내용이 화면 밖으로 나간다. 높이가 자라는 동안이 아니라 **자리를 잡은 뒤에** 옮긴다 — 자라는 중에 부르면 옛 높이를 기준으로 서서 아래가 다시 잘린다."
   - 접을 때는 스크롤 이동을 하지 않는다(`expanded` 조건).

**웹 구현 제안**
```js
// 펼침
setExpanded(true);
// 트랜지션 끝난 뒤
el.addEventListener('transitionend', () => {
  if (expanded) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}, { once: true });
```
그림자는 반드시 애니메이션되는 요소의 **바깥 래퍼**에 걸 것(`overflow: hidden`이 그림자를 자르지 않게).

## 2.9 예정 단계 `RecordStepPending`

```kotlin
MedicalMateNotice(title = step.message, body = step.detail, tone = MedicalMateNoticeTone.BRAND)
```

점선 테두리가 아니다. 소스 주석: "점선 테두리로 그리던 것을 `MedicalMateNotice`로 바꿨다. 시안 `1j-3`이 여기에 ⓘ 아이콘이 있는 옅은 브랜드 면을 쓴다. 점선은 '입력할 자리'로 읽혀 뜻이 달랐다."

`BRAND` 톤은 마스터(`292:668`)에 없는 톤이다. 1j-3의 예정 알림 인스턴스(`1076:4047`)가 면을 `bg/primary`로, 글자를 `fg/on-primary`로 덮어 그려서 톤으로 올렸다.

| 속성 | 값 |
| -- | -- |
| 배경 | `bg/primary` Primary500 **`#5566D2`** (채운 면) |
| radius | 16 (`md`) |
| 패딩 | 좌 14 / 우 16 / 위아래 14 |
| 아이콘 배지 | **32px 흰 원** + `Info` 아이콘 20px, 아이콘 색은 브랜드색 그대로 |
| 아이콘-글자 간격 | 12 |
| 글 묶음 | `padding-top: 4` (배지 세로 가운데에 첫 줄이 오게), 줄 간격 **3px** |
| 제목 | `Body/M Strong` 15 SemiBold, `fg/on-primary` **`#FFFFFF`** |
| 본문 | `Body/S` 13, `fg/on-primary` **`#FFFFFF`** (채운 면에서는 `fg/subtle`이 읽히지 않아 둘 다 흰색) |

타임라인의 다른 블록이 흰 카드라 **앞으로 갈 일 하나만 색으로 선다.**

### 예정 단계가 어디서 오는가 (2갈래)

`RecordDetailViewModel.load`:
```kotlin
pending = nextVisit(cardId, latest.visitedOn)?.toPending()
          ?: latest.followUp?.takeIf { it.date > latestOn }?.toPending()
```

| 출처 | at | message | detail |
| -- | -- | -- | -- |
| **잡아 둔 일정** (`Appointment`) | `MM.dd 예정` | **`다음 진료가 예약돼 있어요`** | `M월 d일 (E)` + `" "` + `a h:mm` → 예 `9월 26일 (토) 오전 10:30`. **시각이 없으면 날짜만**(#202) |
| **기록의 재방문 날짜** (`VisitFollowUp`) | `MM.dd 예정` | **`재방문 예정이에요`** | `M월 d일` + (`approximate`면 `" 전후"`) → 예 `9월 27일 전후` |
| 둘 다 없음 | — | 예정 단계를 **두지 않는다** | "시안의 점선 블록은 다음이 잡혔을 때 나오는 것이고, 안 잡힌 상태를 알리는 자리가 아니다" |

`nextVisit`의 필터 조건 (`GET /api/me/appointments/upcoming`에서 고름):
0. **`cardId == null`이면 API를 부르지도 않고 `null`을 돌려준다.** 카드 없는 기록에는 예정 단계가 붙지 않는다.
0'. 호출이 `ApiResult.Success`가 아니면 그대로 `null` — 일정을 못 읽어도 화면은 그린다(예정 단계만 빠짐).
1. `appointment.cards`에 이 `cardId`가 있음 (`appointment.cards.any { it.id == cardId }`)
2. `appointment.status != CANCELED`
3. `after == null || appointment.on > after` — **이 진료 자체의 일정은 다음이 아니다.** 서버의 "앞으로의 일정"이 오늘 것을 하루 종일 담아서(Backend#123) 진료한 날 열면 그 날 일정이 예정으로 섰다. ⚠️ **`after`(= 최신 기록의 `visitedOn`)가 null이면 이 조건을 통과시킨다** — 진료일을 모르는 기록에서는 날짜로 거르지 않는다.
4. 조건을 만족하는 **첫 항목**(`firstOrNull`). 서버가 가까운 순으로 주므로 가장 이른 일정이 잡힌다. 다시 정렬하지 않는다.

폴백(`?:`)으로 넘어가는 `latest.followUp`은 조건이 하나다: `it.date > latestOn`. 여기서 `latestOn`은 `latest.visitedOn ?: LocalDate.MIN`이라 **진료일을 모르면 어떤 재방문 날짜든 통과한다.**

`after`는 **열어 본 기록이 아니라 가장 최근 기록**의 날짜다(#251). "첫 기록에서 열어도 상세는 그 카드의 기록을 모두 세우므로, 이미 다녀온 재방문 일정이 예정으로 서면 안 된다."

날짜 포맷 상수:
```kotlin
PENDING_AT   = "MM.dd 예정"      // 점 옆 라벨
PENDING_DATE = "M월 d일 (E)"     // 예: 9월 26일 (토)
PENDING_TIME = "a h:mm"          // 예: 오전 10:30
VISITED_ON   = "MM.dd"
```

## 2.10 타임라인 조립 규칙 (`recordDetail`)

```kotlin
steps = listOfNotNull(pending) + records + listOfNotNull(card?.toStep())
```

**최신이 위다: 예정 → 진료 후 기록(최신순) → 브리핑 카드.**

소스 주석: "시안 `1j-3`은 카드가 위이고 `1j-3-R`(재방문 누적)은 최신이 위인데, 디자인 피드백이 '최신 기록이 맨 위로 가는게 멘탈 모델'이라고 적어 둔 쪽을 따랐다."

**증상 정리 단계는 넣지 않는다.** "문답에서 답한 내용은 브리핑 카드에 담기므로 카드 위에 같은 값을 한 번 더 보여주는 자리가 된다."

### 진료 후 기록 단계 (`Visit.toRecordStep`)

```kotlin
at    = listOfNotNull(visitedOn?.format("MM.dd"), "진료 후 기록", kind).joinToString(" · ")
title = "진료 후 기록"
items = items.map { RecordDetailItem(key = it.label, value = it.value) }   // tone은 전부 DEFAULT
```

`kind` (`visitKind(count, index)`, index는 최신이 0):
- 기록이 1건 → `null` (붙이지 않음)
- 가장 오래된 것(`index == count - 1`) → `"초진"`
- 나머지 → `"재방문"`

결과 예: `09.12 · 진료 후 기록` / `09.26 · 진료 후 기록 · 재방문` / `09.12 · 진료 후 기록 · 초진`

**원문 인용을 담지 않는다.** "시안의 진료 후 기록 단계에는 저장된 항목만 있다. 원문은 1q-1에서 확인하고 저장하는 값이고, 여기는 나중에 다시 읽는 자리다."

### 브리핑 카드 단계 (`BriefCard.toStep`)

```kotlin
at    = writtenOn?.format("MM.dd")?.let { "$it 작성" } ?: "브리핑 카드"
title = "브리핑 카드"
items = (items + health).map { RecordDetailItem(key = it.key, value = it.value) }
card  = RecordStepCard(collapsedItemCount = 3, severity, allergies, questions)
```

- 시점 줄은 `09.04 작성`. 시안은 뒤에 `09.12 진료실에서 보여줌`을 잇지만 그 날짜는 바로 위 진료 후 기록 단계가 이미 적고 있어서 같은 날이 두 줄에 서게 돼 뺐다(#243).
- 작성일이 없으면 `at = "브리핑 카드"`.
- `items + health` — 증상 항목 뒤에 건강 정보(복용약·기저질환)가 붙는다. **건강 정보가 카드에서 온다**(#181): "여기는 지난 진료를 다시 읽는 자리라 오늘의 프로필을 얹으면 그때 먹던 약이 아니게 된다."

### 항목(axis) → 줄 매핑 (`VisitMapping.kt`)

| 서버 axis id | 화면 이름 |
| -- | -- |
| `findings` | `소견` |
| `tests` | `검사` |
| `medication_instructions` | `약` |
| `follow_up` | `재방문` |
| 그 외 | **axis id를 그대로 쓴다** ("빈 이름으로 두면 값만 떠 있는 줄이 된다") |

순서: 위 4개를 이 순서로 먼저, **모르는 축은 뒤에 응답의 키 순서대로** 붙인다. "항목 이름이 닫힌 목록이 아니라 AI가 늘릴 수 있고, 아는 것만 그리면 환자가 적은 줄이 사라진다."

**값이 비었거나 키가 없으면 줄을 만들지 않는다.** "환자가 적지 않은 것을 빈 줄로 남기면 무엇을 안 적었는지가 아니라 무엇이 비었는지로 읽힌다."

**재방문 줄에는 날짜를 덧붙인다**: `follow_up` 값 뒤에 `"(M월 d일[ 전후])"`를 붙여 `2주 뒤 (9월 27일 전후)`가 된다. 이미 붙어 있으면 다시 붙이지 않는다(#245).

### 제목 폴백

```kotlin
title = card?.title?.takeIf { it.isNotBlank() } ?: cardTitle ?: newest.clinic.orEmpty()
```
카드 응답 제목 → 목록이 든 제목(`cardVisits`의 첫 non-blank `cardTitle`) → 병원 이름 순. "병원은 둘째 줄이 적는 값이라 제목에 서면 같은 말이 두 줄에 이어 나온다."

## 2.11 데이터 로딩 — 3개 API를 엮는다

```
load(recordId)
 ├ recordId.toLongOrNull() == null → 즉시 Failed (서버를 부르지 않음)
 ├ uiState = Loading, expandedSteps = emptySet()
 ├ GET /api/visits/{visitId}                  ← 실패하면 Failed (필수)
 ├ GET /api/cards/{cardId}                    ← 실패하면 카드 단계만 빠짐 (선택)
 ├ GET /api/cards/{cardId}/visits             ← 이 카드에 쌓인 기록 목록 (선택)
 │    └ 결과가 2건 이상이면 각각 GET /api/visits/{id}로 한 번씩 더 읽는다
 │       (읽지 못한 기록은 빼고 그린다)
 └ GET /api/me/appointments/upcoming          ← 예정 단계 (선택)
```

- **기록을 못 읽으면 실패다. 카드와 일정은 못 읽어도 그 단계만 빠진다.** "기록 상세를 여는 사람이 보려는 것은 진료에서 들은 말이고, 준비물이 없다고 그것까지 감출 이유가 없다."
- **목록을 `cardId`로 거르지 않는다**(Backend#121). 재방문 전에 카드를 고치면 첫 기록과 두 번째 기록이 서로 다른 카드 행에 붙고, 목록의 `cardId`는 최신 버전이라 묶을 열쇠가 되지 못한다. 서버의 `/api/cards/{cardId}/visits`가 문답 단위로 모아 준다.
- `summaries.size <= 1`이면 열어 본 기록 하나만 그린다(추가 호출 없음).
- 모으지 못하면(호출 실패) 역시 열어 본 기록 하나만.
- 숫자가 아닌 id는 부르기 전에 Failed. "목록에서 들어오는 경로만 있어서 지금은 나지 않지만, 지워진 기록의 링크로 들어오는 경우가 이 상태가 된다."

## 2.12 로딩 / 에러 / 빈 상태

### 로딩
`MedicalMateLoadingSpinner(modifier = Modifier.weight(1f))` — 기록 탭과 동일(24px 스피너, `bg/primary` 색, 메시지 없음, 세로 가운데). NavBar는 그대로 보인다.

### 에러 (`RecordDetailUiState.Failed`)
Column(`fillMaxWidth`, 패딩 20, 세로·가로 가운데) 안에 `MedicalMateEmptyState(type = NO_RESULT)`

| 슬롯 | 값 (원문) | 리소스 |
| -- | -- | -- |
| 제목 | **`기록을 불러오지 못했어요`** | `record_detail_failed_title` |
| 설명 | **`인터넷 연결을 확인하고 다시 시도해주세요`** | `record_detail_failed_description` |
| 행동 | **`다시 시도`** | `record_detail_retry` → `viewModel.load(recordId)` |

(문구는 목록의 실패 상태와 같지만 **리소스 키가 다르다**. 웹에서도 분리해 둘 것.)

### 빈 상태
**없다.** `steps`는 최소 1개(진료 후 기록)를 늘 갖는다. `records`는 로드된 `visit`이 있어야만 도달하는 경로라 비지 않는다. 별도 빈 화면을 만들 필요 없음.

> ⚠️ **한 가지 예외가 코드에 열려 있다.** `history(summaries, opened)`는
> ```kotlin
> summaries.mapNotNull { summary ->
>     if (summary.id == opened.id) opened
>     else summary.id.toLongOrNull()?.let { (repository.visit(it) as? ApiResult.Success)?.value }
> }
> ```
> 이므로, `summaries`가 2건 이상이면서 **(a) 어느 것도 열어 본 기록의 id와 같지 않고 (b) 추가 조회가 전부 실패하면** 빈 리스트가 된다. 그러면 바로 뒤의 `recordDetail()`이 `visits.first()`에서 `NoSuchElementException`으로 터진다(`Failed`로 떨어지지 않는다). 서버가 `/api/cards/{cardId}/visits`에 열어 본 기록을 반드시 포함시켜 주는 한 나지 않는 경로지만, **웹에서는 `visits`가 비면 열어 본 기록 하나로 되돌리는 방어를 넣을 것.** (7장 9번)

### 상세 Preview 목록 (`RecordDetailScreen.kt`)

역시 세 개다. `Loading`·`Failed` Preview는 없다.

| Preview 함수 | 상태 | 대응 |
| -- | -- | -- |
| `RecordDetailScreenPreview` | `Content(previewRecordDetail)`, `expandedSteps = emptySet()` | 1j-3 (기본, 카드 접힘) |
| `RecordDetailExpandedPreview` | `Content(previewRecordDetail)`, **`expandedSteps = setOf(2)`** | 1j-3-X (카드 펼침) — index 2가 브리핑 카드 단계다 |
| `RecordDetailRevisitedPreview` | `Content(recordDetailFixtures.getValue("card-4"))`, `expandedSteps = emptySet()` | 1j-3-R (재방문 누적) |

`expandedSteps`를 화면 바깥에서 주입하므로 **펼친 상태를 상태 주입만으로 스냅샷할 수 있다.** 웹의 스토리북도 같은 구조(펼침 집합을 prop으로)로 만들면 시각 회귀 테스트가 쉬워진다.

## 2.13 네비게이션 — 이 화면에서 나가는 모든 경로

| # | 트리거 | 목적지 | 방식 |
| -- | -- | -- | -- |
| 1 | NavBar 좌측 `<` | 이전 화면(기록 목록) | `popBackStack()` |
| 2 | 안드로이드 뒤로가기 / 가장자리 스와이프 | 동일 | 동일 전환 애니메이션 |

**그 외 나가는 길 없음.** `카드 전체 보기`도, 예정 알림도 화면을 옮기지 않는다.

## 2.14 이 화면이 쓰는 디자인 시스템 컴포넌트

| 컴포넌트 | 용도 | variant/props |
| -- | -- | -- |
| `MedicalMateNavBar` | 상단 바 | `title="기록 상세"`, `leading = BACK`(기본), `surface = GLASS` |
| `MedicalMateSurfaceStyle` | 표면 스타일 | `GLASS` (알파 0.82 + blur 24, API 31 미만은 Opaque) |
| `MedicalMateLoadingSpinner` | 로딩 | `message = null` |
| `MedicalMateEmptyState` / `MedicalMateEmptyStateType` | 에러 | `NO_RESULT` |
| `MedicalMateBadge` / `MedicalMateBadgeTone` | 머리글 배지 | `WARNING` / `BRAND` / `SUCCESS` |
| `MedicalMateDivider` | 펼침 줄 위 구분선 | 1px `border/subtle` |
| `MedicalMateNotice` / `MedicalMateNoticeTone` | 예정 단계 | **`BRAND`** |
| `MedicalMateQuoteBlock` | 원문 인용 (현재 미사용) | `label`, `text` |
| `MedicalMateSeverityReadout` | 통증 강도 (펼침) | `severity` |
| `MedicalMateCallout` (via `QuestionsCallout`) | 질문 (펼침) | `title = "환자가 묻고 싶어 하는 것"` |
| `MedicalMateNotice` (via `AllergyNotice`) | 알러지 (펼침) | `tone = WARNING` |
| `MedicalMateSeverity` | 통증 단계 enum | `LEVEL_1`~`LEVEL_5` |

직접 그린 것: 타임라인 세로선(`drawBehind`), 점(10px 원), `StepItemRow`(키 52 + 값), `StepExpandRow`.

## 2.15 기록 상세 문구 전체

| 리소스 키 | 원문 |
| -- | -- |
| `record_detail_title` | `기록 상세` |
| `record_detail_expand` | `카드 전체 보기` |
| `record_detail_collapse` | `접기` |
| `record_detail_failed_title` | `기록을 불러오지 못했어요` |
| `record_detail_failed_description` | `인터넷 연결을 확인하고 다시 시도해주세요` |
| `record_detail_retry` | `다시 시도` |
| `brief_card_allergy` | `알러지 · %1$s` |
| `brief_card_allergy_body` | `처방 전에 꼭 확인해 주세요` |
| `brief_card_questions` | `환자가 묻고 싶어 하는 것` |
| `severity_nrs` | `NRS %1$d–%2$d` |
| `severity_level_content_description` | `%1$d단계, %2$s` |

코드에 **하드코딩된** 한국어 문자열 (strings.xml 아님 — `RecordDetailViewModel.kt`):

| 문자열 | 위치 |
| -- | -- |
| `진료 후 기록` | 블록 제목 + `at`의 가운데 조각 |
| `브리핑 카드` | 블록 제목 + 작성일 없을 때의 `at` |
| `초진` / `재방문` | `visitKind`, `clinicLine` |
| `진료 %d회` | `badge` |
| `다음 진료가 예약돼 있어요` | `Appointment.toPending()` |
| `재방문 예정이에요` | `VisitFollowUp.toPending()` |
| `전후` | `VisitFollowUp.toPending()`, `VisitMapping.revisitNote()` |
| `작성` | `BriefCard.toStep()`의 `at` 접미 |
| `진료` | `clinicLine`, `RecordViewModel.toRow()`의 `meta` |
| `소견` / `검사` / `약` / `재방문` | `VisitMapping.axisLabel()` |

---

# 3. `RecordDetailFixtures` — 목데이터 전부

`internal val recordDetailFixtures: Map<String, RecordDetail>` — id로 찾는 5건. **서버 연동 시 이 파일을 삭제한다**고 명시되어 있으나, 웹앱의 목데이터/스토리북 픽스처로는 그대로 쓸 수 있다.

공통 상수:
- `private const val COLLAPSED_CARD_ITEMS = 3` — 같은 값이 `RecordDetailViewModel.kt`에도 `private const val COLLAPSED_ITEMS = 3`으로 따로 선언되어 있다. **두 파일이 각자 상수를 든다**(공유하지 않음). 웹에서는 하나로 합쳐도 되지만, 값이 3으로 같다는 것만 확인하면 된다.
- `abdomenCardItems` (5줄) — `card-1`과 `card-4`의 브리핑 카드 단계가 **같은 리스트 인스턴스를 공유**한다
- `abdomenCard` (`RecordStepCard`) — 역시 `card-1`과 `card-4`가 공유

**가시성**: `previewRecordDetail`만 `internal`(`RecordDetailScreen`의 Preview가 직접 참조), 나머지 넷은 `private`이라 **`recordDetailFixtures` 맵을 통해서만** 닿는다.

**맵 선언 순서**(`listOf(...).associateBy { it.id }`): `previewRecordDetail`(card-1) → `beforeVisitRecordDetail`(card-2) → `draftRecordDetail`(card-3) → `closedRecordDetail`(card-0) → `revisitedRecordDetail`(card-4). 키 순서가 `card-1, card-2, card-3, card-0, card-4`로 정렬되어 있지 않다. 웹에서 이 맵을 배열로 옮길 때 순서에 의미를 두지 말 것 — 조회는 id로만 한다.

> 소스 주석: "위의 픽스처들을 참조하므로 파일 끝에 둔다. 최상위 프로퍼티는 선언 순서대로 초기화된다." — 맵이 파일 맨 아래 있는 이유다.

## 3.1 `card-1` — `previewRecordDetail` (1j-3 기본, Figma `735:3829`)

| 필드 | 값 |
| -- | -- |
| `id` | `card-1` |
| `title` | `복부 통증 · 3주` |
| `status` | `CONFIRMED` |
| `badge` | `null` → 배지 문구 `진료 완료` (SUCCESS) |
| `clinicLine` | `서울OO병원 내과 · 09.12 진료` |
| `steps` | 3단계 |

**steps[0]** — `RecordStep.Pending`
| at | message | detail |
| -- | -- | -- |
| `09.26 예정` | `다음 진료가 예약돼 있어요` | `9월 26일 (토) 오전 10:30` |

**steps[1]** — `RecordStep.Block` (at `09.12 · 진료 후 기록`, title `진료 후 기록`, card 없음 → 펼침 줄 없음)
| key | value | tone |
| -- | -- | -- |
| 소견 | `위염 초기 소견` | DEFAULT |
| 검사 | `혈액검사 시행 · 다음 방문 때 확인` | DEFAULT |
| 약 | `2주분 처방 · 커피·매운 음식 줄이기` | DEFAULT |
| 재방문 | `2주 뒤 (9월 26일 전후)` | **LINK** |

**steps[2]** — `RecordStep.Block` (at `09.04 작성`, title `브리핑 카드`, `card = abdomenCard`)

`items` = `abdomenCardItems`:
| # | key | value | tone | 접힘 시 보임 |
| -- | -- | -- | -- | -- |
| 1 | 부위 | `복부 (명치 아래 · 배꼽 위)` | DEFAULT | ✅ |
| 2 | 기간 | `3주 전 시작 · 최근 악화` | **LINK** | ✅ |
| 3 | 양상 | `식후 30분 뒤 쓰림 · 밤에 심해짐` | DEFAULT | ✅ |
| 4 | 복용약 | `혈압약 · 진통제(증상 시)` | DEFAULT | ❌ (펼쳐야) |
| 5 | 기저질환 | `고혈압` | DEFAULT | ❌ (펼쳐야) |

`card = abdomenCard`:
| 필드 | 값 |
| -- | -- |
| `collapsedItemCount` | `3` |
| `severity` | `LEVEL_3` → `꽤 아파요`, NRS 5–6, `#FFA894` |
| `allergies` | `["페니실린"]` → `알러지 · 페니실린` / `처방 전에 꼭 확인해 주세요` |
| `questions` | `["검사를 받아야 하나요?", "지금 진통제 계속 먹어도 되나요?", "어떤 증상이면 바로 다시 와야 하나요?"]` |

## 3.2 `card-2` — `beforeVisitRecordDetail` (진료 전)

| 필드 | 값 |
| -- | -- |
| `id` | `card-2` |
| `title` | `두통 · 잦은 어지러움` |
| `status` | `BEFORE_VISIT` → 배지 `진료 전` (BRAND) |
| `badge` | `null` |
| `clinicLine` | `08.21 작성 · 병원 미정` |

**steps[0]** — `Pending`: at `진료 예정`, message `병원을 정하면 진료 일정이 여기에 표시돼요`, **detail 없음**(둘째 줄 안 나옴)

**steps[1]** — `Block`: at `08.21 작성`, title `브리핑 카드`
| # | key | value | tone | 접힘 시 |
| -- | -- | -- | -- | -- |
| 1 | 부위 | `머리 (관자놀이 양쪽)` | DEFAULT | ✅ |
| 2 | 기간 | `2주 전 시작 · 잦아짐` | DEFAULT | ✅ |
| 3 | 양상 | `일어설 때 핑 돌고 욱신거림` | DEFAULT | ✅ |
| 4 | 복용약 | `혈압약` | DEFAULT | ❌ |
| 5 | 기저질환 | `고혈압` | DEFAULT | ❌ |

card: `collapsedItemCount = 3`, `severity = LEVEL_2` (`은근히 아파요`, NRS 3–4, `#FFC79B`), `allergies = ["페니실린"]`, `questions = ["혈압약과 관련이 있나요?", "검사를 받아야 하나요?", "어떤 증상이면 바로 다시 와야 하나요?"]`

**진료 후 기록 단계가 없다.**

## 3.3 `card-3` — `draftRecordDetail` (작성 중)

| 필드 | 값 |
| -- | -- |
| `id` | `card-3` |
| `title` | `무릎 통증` |
| `status` | `DRAFT` → 배지 `작성 중` (WARNING) |
| `badge` | `null` |
| `clinicLine` | `오늘 작성 중 · 4단계 중 2단계` |

**steps** — 단 1개
| kind | at | message | detail |
| -- | -- | -- | -- |
| `Pending` | `카드 예정` | `증상 정리를 마치면 브리핑 카드가 만들어져요` | 없음 |

"카드가 없으니 열 것도 없다. 타임라인에 예정 한 단계만 남는다." → **점 하나 + 세로선 없음**(마지막 단계라).

## 3.4 `card-4` — `revisitedRecordDetail` (1j-3-R, Figma `1039:2799`)

| 필드 | 값 |
| -- | -- |
| `id` | `card-4` |
| `title` | `복부 통증 · 3주` |
| `status` | `CONFIRMED` |
| `badge` | **`진료 2회`** ← 배지 문구를 덮음, 색은 SUCCESS |
| `clinicLine` | `서울OO병원 내과 · 09.12 초진 · 09.26 재방문` |
| `steps` | 3단계, **예정 단계 없음** |

**steps[0]** — `Block`: at `09.26 · 진료 후 기록 · 재방문`, title `진료 후 기록`
| key | value | tone |
| -- | -- | -- |
| 소견 | `염증 호전 · 경과 양호` | DEFAULT |
| 검사 | `혈액검사 정상 범위` | DEFAULT |
| 약 | `1주분 추가 처방` | DEFAULT |
| 재방문 | `증상 재발 시에만` | DEFAULT |

**steps[1]** — `Block`: at `09.12 · 진료 후 기록 · 초진`, title `진료 후 기록`
| key | value | tone |
| -- | -- | -- |
| 소견 | `위염 초기 소견` | DEFAULT |
| 검사 | `혈액검사 시행 · 다음 방문 때 확인` | DEFAULT |
| 약 | `2주분 처방\n커피·매운 음식 줄이기` ← **줄바꿈 포함** | DEFAULT |
| 재방문 | `2주 뒤 (9월 26일 전후)` | **LINK** |

**steps[2]** — `Block`: at `09.04 작성`, title `브리핑 카드`, items = `abdomenCardItems`, card = `abdomenCard` (3.1과 동일)

> ⚠️ `약` 값에 `\n`이 들어 있다. 웹에서 `white-space: pre-line`(또는 `pre-wrap`)을 걸어야 재현된다.

## 3.5 `card-0` — `closedRecordDetail` (재방문 없이 종료)

| 필드 | 값 |
| -- | -- |
| `id` | `card-0` |
| `title` | `목 통증 · 삼킬 때 아픔` |
| `status` | `CONFIRMED` → `진료 완료` |
| `badge` | `null` |
| `clinicLine` | `OO이비인후과 · 07.18 진료` |
| `steps` | 2단계, **예정 단계 없음** |

**steps[0]** — `Block`: at `07.18 · 진료 후 기록`, title `진료 후 기록`
| key | value | tone |
| -- | -- | -- |
| 소견 | `인후염` | DEFAULT |
| 약 | `5일분 처방` | DEFAULT |
| 재방문 | `없음 · 안 나으면 다시 오기` | DEFAULT |

(검사 줄이 **없다** — 값이 없으면 줄을 만들지 않는 규칙의 예시)

**steps[1]** — `Block`: at `07.17 작성`, title `브리핑 카드`
| # | key | value | 접힘 시 |
| -- | -- | -- | -- |
| 1 | 부위 | `목 (삼킬 때 안쪽)` | ✅ |
| 2 | 기간 | `3일 전 시작` | ✅ |
| 3 | 양상 | `삼킬 때 찌르듯 아픔` | ✅ |
| 4 | 복용약 | `없음` | ❌ |
| 5 | 기저질환 | `고혈압` | ❌ |

card: `collapsedItemCount = 3`, `severity = LEVEL_2`(`은근히 아파요`, NRS 3–4, `#FFC79B`), `allergies = ["페니실린"]`, `questions = ["며칠이면 나아요?", "항생제를 꼭 먹어야 하나요?"]` — **질문이 2개뿐**인 유일한 픽스처다(다른 넷은 3개).

**`card-0`의 두 블록은 항목 tone이 전부 `DEFAULT`다.** `기간` 줄이 LINK인 것은 `abdomenCardItems`(= `card-1`·`card-4`)뿐이고, `재방문` 줄이 LINK인 것도 `2주 뒤 (9월 26일 전후)` 값을 가진 두 건뿐이다. **tone은 값 자체가 아니라 픽스처가 직접 지정한 것**이고, 실제 서버 경로(`Visit.toRecordStep`, `BriefCard.toStep`)는 **tone을 아예 넘기지 않아 전부 `DEFAULT`가 된다.** 즉 LINK·WARNING 색은 **목데이터에서만 보인다**(2.4의 `Tone` 표 참고).

`card = RecordStepCard(...)`를 여기서 **새로 만든다** — `abdomenCard`를 공유하지 않는다.

## 3.6 목록 ↔ 상세 대응

| 목록(`previewRecordGroups`) id | 상세 fixture | 비고 |
| -- | -- | -- |
| `card-3` (작성 중) | `draftRecordDetail` | 예정 1단계 |
| `card-2` (진료 전) | `beforeVisitRecordDetail` | 예정 + 카드 |
| `card-1` (진료 완료) | `previewRecordDetail` | 예정 + 기록 + 카드 |
| `card-0` (진료 완료) | `closedRecordDetail` | 기록 + 카드, 예정 없음 |
| — | `revisitedRecordDetail` (`card-4`) | **목록에 대응 줄이 없다.** 1j-3-R을 확인할 길이 필요해서 넣음 |

**다섯 건 모두 최신 날짜가 위다.**

---

# 4. API

기록 탭·상세가 부르는 엔드포인트 전부.

## 4.1 `GET /api/me/visits` — 기록 목록 (기록 탭)

응답: `List<VisitSummaryResponse>`. **최근 진료일 순**. `rawNote`는 담기지 않는다("증상·복용약이 섞인 긴 글이라 목록마다 실어 나를 이유가 없다").

| 필드 | 타입 | 필수 | 설명 |
| -- | -- | -- | -- |
| `visitId` | `Long` | ✅ | → `RecordItem.id` (문자열로 변환) |
| `cardId` | `Long?` | | → `RecordItem.cardId`. 카드를 지워도 기록은 남아 null이 될 수 있다 |
| `cardTitle` | `String?` | | → `RecordItem.title` (null이면 빈 문자열) |
| `clinicName` | `String?` | | → `RecordItem.clinic`, `meta`의 뒷조각 |
| `visitedOn` | `String` | ✅ | ISO `yyyy-MM-dd`. 월 묶음과 `meta` 앞조각의 근거 |
| `followUp` | `FollowUpResponse?` | | 재방문. 상세와 같은 모양(Backend#101) |

`FollowUpResponse`: `{ date: String?, text: String?, approximate: Boolean = false }`

## 4.2 `GET /api/visits/{visitId}` — 기록 하나 (기록 상세)

응답: `VisitResponse`

| 필드 | 타입 | 필수 | 설명 |
| -- | -- | -- | -- |
| `visitId` | `Long` | ✅ | |
| `cardId` | `Long?` | | 카드·기록목록·일정 조회의 열쇠 |
| `clinicName` | `String?` | | `clinicLine`의 앞조각 |
| `visitedOn` | `String?` | | ISO 날짜 |
| `axes` | `Map<String, VisitAxisResponse>` | 기본 `{}` | **항목이 가변이다**(#178). 못 찾은 항목은 빈 값이 아니라 **키가 없다** |
| `followUp` | `FollowUpResponse?` | | 재방문 |
| `patientNotes` | `List<String>` | 기본 `[]` | 어느 항목에도 안 들어간 문장. **기록 상세는 쓰지 않는다** |
| `rawNote` | `String?` | | 환자 원문. 상세에만 온다. **기록 상세는 쓰지 않는다**(인용 블록 없음) |

`VisitAxisResponse`: `{ axis: String?, status: String?, value: String?, evidence: List<String> = [], source: String? }`
→ 상세는 `value`만 읽는다(비어 있으면 줄을 안 만든다).

## 4.3 `GET /api/cards/{cardId}/visits` — 한 카드의 기록 전부 (기록 상세)

응답: `List<VisitSummaryResponse>` (4.1과 동일 모양). **최근 진료일 순.**
- 체인의 아무 카드 id나 받는다. 재방문 전에 카드를 고치면 기록들이 서로 다른 카드 행에 붙는데 서버가 문답 단위로 모아 준다(Backend#121).
- 이 목록에는 **축이 없어서**, 2건 이상이면 기록마다 4.2를 한 번씩 더 부른다.

## 4.4 `GET /api/cards/{cardId}` — 브리핑 카드 (기록 상세)

응답: `CardResponse` — 상세가 읽는 필드만:

| 필드 | 타입 | 상세에서의 쓰임 |
| -- | -- | -- |
| `cardId` | `Long` | |
| `title` | `String?` | 머리 제목 1순위 |
| `axes` | `Map<String, AxisResponse>` | 카드 단계의 항목 줄 |
| `questions` | `List<String>` | 펼침 시 `환자가 묻고 싶어 하는 것` |
| `createdAt` | `String?` | → `writtenOn` → `at = "MM.dd 작성"` |
| (건강 정보) | | `BriefCard.health` (복용약·기저질환) — 카드 응답이 실어 준다(#181) |
| (통증 강도) | | `BriefCard.severity` → 펼침 시 Severity Readout |
| (알러지) | | `BriefCard.allergies` → 펼침 시 경고 Notice |

> 카드를 못 읽어도 상세는 그린다. 카드 단계만 빠진다.

## 4.5 `GET /api/me/appointments/upcoming` — 앞으로의 일정 (기록 상세, 예정 단계)

응답: `List<AppointmentResponse>`. "아직 안 지났고 취소되지 않은 것만 가까운 순으로."

| 필드 | 타입 | 상세에서의 쓰임 |
| -- | -- | -- |
| `appointmentId` | `Long` | |
| `scheduledOn` | `String` ✅ | → `at = "MM.dd 예정"`, `detail`의 `M월 d일 (E)` |
| `scheduledTime` | `String?` | → `detail`의 `a h:mm`. 없으면 날짜만(#202) |
| `status` | `String?` | `CANCELED`는 거른다 |
| `cards` | `List<{cardId, title?}>` | 이 카드가 걸린 일정만 고른다 |
| `clinicName`, `department`, `purpose`, `origin`, `todos` | | **상세는 쓰지 않는다** (병원은 머리글 둘째 줄이 이미 말함) |

## 4.6 `DELETE /api/visits/{visitId}` — 기록 삭제 (기록 탭 편집)

- 요청 본문 없음, 응답 본문 없음
- **카드는 남는다.** 전에는 이 자리가 없어 기록 삭제가 카드 삭제로 나갔고, 기록 한 건을 지우려던 사람이 카드와 문답까지 잃었다(#157)
- 일괄 삭제 API **없음**. 선택한 id마다 한 번씩 부른다
- 성공한 id만 목록에서 제거

## 4.7 웹 구현 시 API 요약

```
GET    /api/me/visits                  → 기록 탭 목록
GET    /api/visits/{visitId}           → 상세 (필수)
GET    /api/cards/{cardId}/visits      → 같은 카드의 기록 전부 (선택)
GET    /api/cards/{cardId}             → 브리핑 카드 (선택)
GET    /api/me/appointments/upcoming   → 예정 단계 (선택)
DELETE /api/visits/{visitId}           → 기록 삭제 (건별)
```

---

# 5. 디자인 토큰 (이 두 화면에 쓰이는 것만)

## 5.1 색

| 토큰 | 원시 | hex | 쓰이는 곳 |
| -- | -- | -- | -- |
| `bg/surface` | Neutral0 | `#FFFFFF` | 화면 배경, 카드/행/블록 면 |
| `bg/subtle` | Neutral100 | `#EDEFF5` | (NEUTRAL 배지 — 미사용) |
| `bg/primary` | Primary500 | `#5566D2` | 타임라인 점(Block), 예정 Notice 면, 체크박스 체크, 질문 번호 원, 스피너 |
| `bg/primary-subtle` | Primary100 | `#E3E7FC` | BRAND 배지 면, 질문 Callout 면 |
| `bg/primary-faint` | Primary50 | `#F2F4FE` | 빈 상태 아이콘 원 |
| `bg/success` | Green50 | `#E4F7ED` | `진료 완료` 배지 면 |
| `bg/warning` | Amber50 | `#FFF4D6` | `작성 중` 배지 면, 알러지 Notice 면 |
| `bg/danger` | Red50 | `#FFEDEB` | 삭제 버튼 면 |
| `fg/default` | Neutral900 | `#131722` | 제목, 항목 값(DEFAULT) |
| `fg/subtle` | Neutral600 | `#585F73` | meta, detail, 항목 키, `at` 라벨, clinicLine, 캡션 |
| `fg/muted` | Neutral500 | `#7C8397` | chevron 아이콘, 비활성 액션 |
| `fg/primary` | Primary700 | `#2E3E9E` | NavBar 액션, `카드 전체 보기`, LINK 톤 값, 빈 상태 아이콘 |
| `fg/link` | Primary700 | `#2E3E9E` | 빈 상태 행동 버튼, Section Header 액션 |
| `fg/on-primary` | Neutral0 | `#FFFFFF` | 예정 Notice 글자 |
| `fg/success` | Green700 | `#0E7A4A` | `진료 완료` 배지 글자 |
| `fg/warning` | Amber700 | `#8A5A0B` | `작성 중` 배지 글자, `resumeLabel`, WARNING 톤 값 |
| `fg/danger` | Red700 | `#C4302B` | 삭제 버튼 글자 |
| `border/subtle` | Neutral200 | `#DEE1EB` | 타임라인 세로선, Divider, NavBar 하단선 |
| `border/strong` | Neutral500 | `#7C8397` | 타임라인 점(Pending) |
| `border/focus` | Primary500 | `#5566D2` | 선택된 행 테두리(1.5px) |
| severity 1~5 | — | `#FFE3A8` `#FFC79B` `#FFA894` `#F58079` `#DC5A55` | 단계 칩 배경 |
| 그림자 틴트 | — | `#1B255A` | `rgba(27,37,90,α)` |

## 5.2 타이포 (Pretendard, SIL OFL 1.1)

| 토큰 | size / line-height / weight / letter-spacing | 쓰이는 곳 |
| -- | -- | -- |
| `Heading/L` | 24 / 34 / Bold 700 / **-2%** | 상세 머리 제목 |
| `Heading/M` | (Section Header·Empty State 제목) | 월 라벨, 빈 상태 제목 |
| `Heading/S` | 17 / 24 / SemiBold 600 / **-1%** | NavBar 제목, 행 제목, 블록 제목 |
| `Body/L Strong` | (17) SemiBold | NavBar 우측 액션, Severity 낱말 |
| `Body/M` | 15 / 24 / Regular 400 | clinicLine, 항목 값, 빈 상태 설명, 질문 |
| `Body/M Strong` | 15 / 24 / SemiBold 600 | Section Header 캡션, `카드 전체 보기`, Notice 제목 |
| `Body/S` | 13 / 20 / Regular 400 | meta/detail/resumeLabel, 항목 키, NRS, Notice 본문, QuoteBlock 본문 |
| `Label/M` | 13 / 18 / SemiBold 600 / 0 | 타임라인 `at` 라벨 |
| `Label/S` | 11 / 16 / Medium 500 / **+2%** | 배지, QuoteBlock 라벨, 질문 번호 |

**웹 대응**: Pretendard 웹폰트(`Pretendard-Regular/Medium/SemiBold/Bold`) 4종을 self-host. Google Fonts에 없다. 무게 4종이 실물로 있으므로 `font-synthesis: none`을 걸어 합성 굵기를 막는다.
letter-spacing은 `em` 단위(-2% → `-0.02em`).

## 5.3 간격 / 크기 / radius / 그림자

| 토큰 | 값 |
| -- | -- |
| 간격 스케일 | 2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 32, 40 |
| `gutter` | **20** (화면 좌우) |
| `screenWidth` | 360 (기준일 뿐, 고정하지 않음) |
| `contentWidth` | 320 |
| `navBarHeight` | **56** |
| `tabBarHeight` | **79** |
| `touchMin` | 48 |
| `iconLg` | 24 |
| radius `xs` | **8** (배지, 체크박스) |
| radius `sm` | **12** (질문 알약, QuoteBlock) |
| radius `md` | **16** (행, 블록, Notice) |
| radius `lg` | **20** (Callout) |
| radius `xl` | **24** (Dialog) |
| radius `buttonM` | 14 |
| `Elevation/Card` | 3dp → `0 3px 10px rgba(27,37,90,.08), 0 1px 2px rgba(27,37,90,.05)` |
| `Elevation/Float` | 4dp → `0 4px 14px rgba(27,37,90,.09), 0 1px 3px rgba(27,37,90,.06)` |
| `Elevation/Sheet` | 8dp → `0 -4px 24px rgba(27,37,90,.10), 0 0 2px rgba(27,37,90,.05)` |
| Glass blur | 24px, NavBar 알파 0.82 / BottomCta 0.78 / TabBar 0.86 |

---

# 6. 웹 포팅 시 주의점 (화면별)

## 6.1 기록 탭

1. **가상 스크롤 불필요, 하지만 순서 보존이 필수.** `groupBy`의 삽입 순서를 그대로 살려야 최신 달이 위에 온다. JS `Map`을 쓰거나 배열 reduce로 구현.
2. **`selectedIds`는 `null`과 빈 `Set`을 반드시 구분**해야 한다. `[]`로 뭉개면 "편집 진입 직후"와 "편집 아님"이 같아져 탭바/삭제바가 뒤바뀐다.
3. **행 전체가 클릭 타깃**이고 편집 중에는 같은 클릭이 선택 토글이 된다. 체크박스에 `stopPropagation`을 걸면 안 된다(Compose는 둘 다 같은 `onClick`을 부른다).
4. **삭제는 건별 DELETE + 부분 실패 허용.** `Promise.allSettled`로 부르고 성공한 id만 제거해야 한다. `Promise.all`로 만들면 한 건 실패에 전체가 날아간다.
5. **묶음이 비면 월 헤더도 사라진다.** 삭제 후 `groups.filter(g => g.items.length > 0)`를 빼먹지 말 것.
6. 편집 중 `Heading` 캡션이 "그 달에서 고른 수"로 바뀐다(전체 수가 아님). 하단 버튼은 전체 선택 수를 든다.
7. **빈/실패 상태에서는 NavBar 우측 액션이 사라진다.** 조건을 `groups.length === 0`까지 포함해야 한다.
8. 행 그림자가 겹치지 않도록 항목 간격 10px을 유지. `border` 대신 `box-shadow`가 층을 만든다.
9. **재조회(`load()`)는 상태를 기본값으로 갈아 끼운다.** `selectedIds → null`, `deleteRequested → false`. 편집 중에 새로고침이 일어나면 편집이 풀린다. 웹에서 "선택 유지 리페치"를 만들면 동작이 갈린다(1.10 참고).
10. **버튼 `disabled`만으로 끝내지 말 것.** 상태 함수 쪽에도 0건 가드가 있다(`onDeleteClick`, `onDeleteConfirm`). 1.9의 가드 표 네 개를 그대로 옮길 것.
11. **목록 배경은 흰색이다.** 회색 캔버스 + 흰 카드 패턴이 아니라 흰 바탕 + 그림자로 뜬 흰 카드다(1.3 참고).
12. **`clinic` 필드는 지금 아무도 채우지 않는다.** 병원 이름은 `meta` 문자열 안에만 있다. 행을 그릴 때 `clinic`을 참조하는 코드를 쓰면 항상 빈 값이다(1.4 참고).

## 6.2 기록 상세

1. **타임라인 세로선을 한 개의 absolute 선으로 그리면 안 된다.** 마지막 단계 높이만큼 삐져나온다. 단계마다 `:not(:last-child)::before`로 그릴 것.
2. **펼침 높이 애니메이션**: Compose `animateContentSize`는 auto→auto 전환이다. CSS `height: auto`는 트랜지션되지 않으므로 `grid-template-rows: 0fr/1fr` 기법이나 `max-height` + `ResizeObserver`, 또는 JS로 실제 높이를 측정해 설정한다. 320ms / `cubic-bezier(0.4, 0, 0.2, 1)`.
3. **그림자를 애니메이션 요소 바깥에 둘 것.** 소스가 명시적으로 지적한 문제(안쪽에 두면 좌우가 잘림). 래퍼에 `box-shadow`, 안쪽에 `overflow: hidden`.
4. **`scrollIntoView`는 트랜지션 종료 후**에만. 진행 중에 부르면 옛 높이 기준으로 서서 아래가 잘린다.
5. **`prefers-reduced-motion`에서 즉시 전환**(안드로이드도 애니메이션을 끄면 즉시 바뀐다).
6. **펼침 키가 배열 index다.** 데이터가 다시 로드되면 index가 어긋날 수 있으므로 **로드 시 반드시 초기화**해야 한다(안드로이드도 그렇게 한다).
7. **항목 값의 `\n`** — `white-space: pre-line` 필요(`card-4`의 `약` 값).
8. **키 열 52px 고정.** 긴 키(예: `기저질환` 4글자)도 52px에 들어가야 한다. `flex-shrink: 0` 필수.
9. **배지 문구는 `badge ?? statusLabel`, 색은 항상 `status`.** 둘을 같이 묶으면 `진료 2회`가 잘못된 색으로 나온다.
10. **Glass NavBar**: `backdrop-filter: blur(24px)` + `background: rgba(255,255,255,0.82)`. 미지원 시 `@supports not (backdrop-filter: blur(1px))`로 불투명 흰색.
11. 예정 단계는 **채운 브랜드 면 + 흰 글자 + 흰 원 안의 브랜드색 ⓘ 아이콘**이다. 파스텔 톤(INFO/WARNING)과 색 대비 규칙이 다르다.
12. **상세에는 빈 상태가 없다.** 구현하지 말 것. 다만 `visits`가 비는 극단 경로에서 안드로이드가 크래시하므로, 웹에서는 **빈 배열이면 열어 본 기록 하나로 되돌리는 방어**를 넣을 것(2.12 참고).
13. **`clinicLine`이 빈 문자열일 수 있다.** 병원도 날짜도 없으면 `""`가 오고 안드로이드는 빈 `Text`를 그린다. 웹에서 요소를 숨기면 머리글 높이가 달라진다 — 어느 쪽으로 할지 정해서 일관되게(2.5 참고).
14. **`tone`은 서버 데이터로는 항상 `DEFAULT`다.** `기간`·`재방문`의 브랜드색은 목데이터에만 있다. 색 분기를 값 문자열로 추측해서 구현하지 말 것(2.4 참고).
15. **"최신"이 두 가지 계산이다.** `id`·제목 폴백은 `visits.first()`(목록 순서), 예정 단계 기준일은 `maxByOrNull { visitedOn }`(날짜 최댓값). 하나로 합치지 말 것(2.4 참고).

## 6.3 공통

- 월/일 포맷에 **0-padding 규칙이 섞여 있다**: 월 라벨은 `M월`(padding 없음), 날짜는 `MM.dd`(padding 있음), 예정 본문은 `M월 d일`(padding 없음). `Intl.DateTimeFormat`으로 일괄 처리하면 어긋난다 — 포맷별로 나눠 쓸 것.
- 요일은 `(E)` = `(토)` 한 글자. `Intl`의 `weekday: 'short'`가 ko-KR에서 `토`를 준다.
- 오전/오후는 `a h:mm` = `오전 10:30` (12시간제, 시 0-padding 없음).
- 구분자는 전부 **가운데점 `·` (U+00B7) + 양쪽 공백**이다. 하이픈이나 슬래시가 아니다.
- 색만으로 상태를 전달하지 않는다는 규칙(D11)을 지킨다 — 배지는 문구를 함께 갖고, 통증 단계는 숫자+낱말+NRS를 함께 보여준다.

---

# 7. 열린 질문 / 확인 필요

1. **`RecordQuote`가 죽은 코드인지.** 모델과 렌더링(`MedicalMateQuoteBlock`)은 있지만 ViewModel도 Fixture도 채우지 않는다. 테스트가 "원문은 담지 않는다"로 못박고 있어 웹에서는 구현을 미뤄도 되는지 확인 필요.
2. **`RecordItem.detail` / `resumeLabel`을 서버가 언제 채우는지.** 현재 `GET /api/me/visits` 응답에 근거가 없어 항상 비어 있고, 값이 있는 상태는 Preview에서만 볼 수 있다. 웹에서 이 두 줄을 구현할지, 서버 계약이 바뀔 때까지 보류할지.
3. **목록의 `status`가 항상 `CONFIRMED`인 문제.** `작성 중`·`진료 전` 배지는 실제 서버 데이터로는 나타나지 않는다. 웹에서 브리핑 카드 목록(1j-4)과 합치는 계획이 있는지 확인 필요.
4. **`record_select`(`%1$s 선택`) 문자열이 사용처 없음.** 체크박스 접근성 라벨로 의도된 듯하나 `label = null`로 넘어간다. 웹에서 `aria-label`로 살릴지 결정 필요.
5. **`RecordDetail.badge`의 상한.** `진료 2회`, `진료 3회`... 자릿수가 늘면 배지 폭이 커진다. 시안에 몇 회까지 검증했는지 불명.
6. **Empty State 행동 버튼의 정본.** 소스 주석이 "마스터는 Tonal 알약이지만 시안의 인스턴스가 전부 채움을 지웠다. 어느 쪽이 정본인지는 디자인 트랙 확인 대기"라고 적어 뒀다.
7. **`Notice`의 `BRAND` 톤**은 마스터에 없는 톤이다. "마스터에 변이로 올려 달라고 디자인 트랙에 넘길 항목"이라고 적혀 있어, 웹 디자인 시스템에서도 정식 토큰으로 올릴지 결정 필요.
8. **1j-3와 1j-3-R의 타임라인 순서가 시안에서 엇갈린다.** `1j-3`은 카드가 위, `1j-3-R`은 최신이 위인데 구현은 디자인 피드백("최신 기록이 맨 위로 가는게 멘탈 모델")을 따라 **최신이 위**로 통일했다. 웹도 동일하게 갈지 재확인 권장.
9. **`history()`가 빈 리스트를 돌려줄 때 상세가 크래시한다.** `summaries.size >= 2`이면서 열어 본 기록의 id가 목록에 없고 추가 조회가 전부 실패하면 `visits`가 비고, `recordDetail()`의 `visits.first()`가 던진다(2.12 참고). 서버 계약상 나지 않아야 하지만 방어가 없다 — **안드로이드 쪽 버그로 올릴지, 웹만 방어할지** 결정 필요.
10. **`RecordDetailItem.Tone`이 서버 경로에서 죽어 있다.** `LINK`·`WARNING`을 지정하는 코드가 픽스처뿐이다(2.4 참고). 시안은 `기간`·`재방문`을 브랜드색으로 세우는데, 그 판단을 **서버가 할지(axis별 tone 필드) 클라이언트가 할지**(예: axis id가 `follow_up`이면 LINK) 계약이 없다. 웹 구현 전에 정해야 한다.
11. **`clinic` 필드가 목록 모델에 있는데 아무도 채우지 않는다**(1.4 참고). KDoc이 설명하는 "카드를 열 때 병원 이름을 함께 넘긴다"는 경로가 현재 코드에 없다. 카드 상세로 가는 길이 이 화면에서 사라졌기 때문으로 보이는데(1j-3-X가 그 자리에서 펴 보게 바꿈), **필드를 지울지 되살릴지** 확인 필요.
12. **탭 복귀 시 재조회 여부가 소스만으로 확정되지 않는다**(1.2 참고). `LaunchedEffect(Unit)` + `saveState/restoreState` 조합이 재구성 때 `load()`를 다시 부르는지가 갈리고, 부르면 편집 상태가 초기화된다. 실기기 확인 후 웹 동작을 맞출 것.
13. **상세 `Loading`·`Failed`, 목록 `Loading`·`Failed`·"편집 진입 직후 0건" 상태에 Preview가 없다.** 시각 검증을 안 거친 상태들이라 웹에서 만들 때 기준 이미지가 없다. 필요하면 안드로이드 쪽에 Preview 추가를 요청할 것.
