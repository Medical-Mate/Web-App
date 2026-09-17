# 브리핑 카드 · 카드 목록 (1e, 1j-4)

## 웹앱 구현 메모

- 모바일 폭 고정: `MedicalMateSize.screenWidth = 360dp` / `contentWidth = 320dp` / `gutter = 20dp`. 앱은 폭을 고정하지 않고 거터만 유지하며 콘텐츠를 fill 하므로, 웹은 `max-width: 420px` 컨테이너 + 좌우 20px 패딩으로 두고 데스크톱에서는 가운데 정렬만 한다.
- 애니메이션: 이 두 화면 자체에는 전용 애니메이션이 없다. 화면 전환(`MedicalMateNavTransitions`)만 있으므로 웹에서는 라우트 전환 fade/slide 한 종류로 충분하고 생략해도 기능 손실이 없다.
- 제스처: 스와이프·드래그가 없다. 유일한 안드로이드 고유 제스처는 시스템 뒤로가기이고 `onExit → popBackStack`과 같으므로 브라우저 `history.back()`으로 1:1 치환된다.
- 대체 방안: 툴팁(`MedicalMateTooltip`)이 Compose `Popup`으로 별도 창에 그려져 레이아웃을 밀지 않는다. 웹은 `position: absolute` + portal(또는 `popover` API)로 같은 성질을 만들고 바깥 클릭 시 닫는다.
- 편집 모드는 라우트가 아니라 한 화면의 두 모드(1e-1 / 1e-1-E)다. URL을 나누지 말고 `editing` 상태 하나로 처리해야 취소 시 카드가 그대로 남는 원 동작이 유지된다.

---

## 0. 이 문서가 읽은 소스

| 경로 | 역할 |
|---|---|
| `app/src/main/java/com/mist/medicalmate/card/ui/BriefCardScreen.kt` | 1e-1 / 1e-1-E 화면 뼈대, 하단 CTA, 병원 섹션, 삭제 대화상자 |
| `.../card/ui/BriefCardBlock.kt` | 카드 본체(제목·배지·환자줄·항목·건강정보·강도·AI 캡션), 알러지 경고, 질문 콜아웃 |
| `.../card/ui/BriefCardUiState.kt` | `BriefCard`, `BriefCardItem`, `BriefCardHospital`, `BriefCardDraft`, `BriefCardUiState` |
| `.../card/ui/BriefCardEditActions.kt` | 편집 사본 조작 5가지 |
| `.../card/ui/BriefCardViewModel.kt` | 열기·편집·확인·취소·저장(확정)·삭제·병원 변경 |
| `.../card/ui/BriefCardDestination.kt` | 1e-1 라우트 파라미터와 결과 수신 |
| `.../card/ui/BriefCardListScreen.kt` | 1j-4 화면 뼈대 |
| `.../card/ui/BriefCardListUiState.kt` | 1j-4 상태 |
| `.../card/ui/BriefCardListViewModel.kt` | 목록 로드·월 묶음·선택·삭제 |
| `.../card/ui/BriefCardListDestination.kt` | 1j-4 라우트 |
| `.../card/ui/RecordList.kt` | 1j-4가 재사용하는 묶음 머리 + 행 |
| `.../card/ui/RecordUiState.kt` | `RecordGroup`, `RecordItem` |
| `.../card/ui/RecordStatus.kt` | 행 배지 문구·톤 |
| `.../card/data/CardApi.kt` | Retrofit 인터페이스 + 서버 DTO 전부 |
| `.../card/data/CardMapping.kt` | `CardResponse → BriefCard` |
| `.../card/data/CardHealth.kt` | `PatientResponse → 복용약/기저질환/알러지` |
| `.../card/data/CardRepository.kt` | 호출 래핑, `CardSummaryResponse → CardListItem`, 409 복구 |
| `.../card/data/CardModule.kt` | Hilt 바인딩 (웹 무관) |
| `app/src/main/res/values/strings.xml` | 화면 문구 원본 |

Figma 노드 id는 소스 주석에 적힌 것을 그대로 옮겼다.

| 화면/블록 | 와이어프레임 id | Figma 노드 |
|---|---|---|
| 브리핑 카드 읽기 | 1e-1 | `404:1679` |
| 브리핑 카드 편집 | 1e-1-E | `597:4804` |
| 삭제 확인 대화상자 | 1e-1-DC | (주석에 노드 id 없음) |
| 카드 본체 블록 | — | `404:1711` |
| 카드 머리(제목·배지·환자줄) | — | `596:3160` |
| AI 캡션 줄 | — | `605:6276` |
| 알러지 경고 | — | `404:1699` |
| 질문 콜아웃 | — | `293:657` |
| 브리핑 카드 전체(목록) | 1j-4 | `1122:4830` |
| 목록 편집(2장 선택) | 1j-4-D2 | (주석에 노드 id 없음) |
| 목록 행 마스터 | — | `335:1114` |
| KV Row 편집 variant | — | `597:4800` |
| Hospital Card 마스터 | — | `1129:9195` |
| Add Row 마스터 | — | `1129:9199` |
| Severity Readout 마스터 | — | `333:1126` |
| Section Header 마스터 | — | `334:1156` |

---

## 1. 화면 1e-1 / 1e-1-E — 무엇을 하는 화면인가

문답(1c)을 마치면 AI가 정리한 브리핑 카드가 여기 나온다. 읽기(1e-1)와 편집(1e-1-E)이 **같은 화면의 두 모드**다. 라우트를 나누지 않는다.

핵심 설계 세 가지를 웹에서도 그대로 지켜야 한다.

1. **카드 본문은 고정 필드가 아니라 목록이다.** 부위·기간·양상을 타입에 박아 두면 AI가 다른 축을 보내거나 어떤 축을 빼는 순간 화면이 못 그린다. `items: BriefCardItem[]`로 받는다.
2. **강도·질문·알러지는 목록에서 빼서 따로 받는다.** 각각 모양이 정해져 있다 — 강도는 색 칩 + 낱말 + NRS 등가, 질문은 번호 pill, 알러지는 경고 면. `items`에 섞으면 그 모양을 잃는다.
3. **`health`(복용약·기저질환)와 `allergies`는 AI 산출물이 아니다.** 신상정보 등록(1b-3)에서 환자가 고른 값이 서버 카드 응답의 `patient`에 실려 온다. 그래서 **편집 모드에서 열리지 않는다.** 고치는 자리는 1s-2(건강 정보 수정)다.

---

## 2. 상태 모델 — TypeScript로 그대로 옮길 수 있는 표

### 2.1 `BriefCard` (카드 한 장)

`BriefCardUiState.kt` L31~70.

| 필드 | Kotlin 타입 | 기본값 | TS 타입 | 설명 |
|---|---|---|---|---|
| `id` | `String` | — | `string` | 서버 id는 숫자지만 화면은 문자열로 들고 다닌다. 서버 호출 직전에 `toLongOrNull()`로 바꾸고, 못 바꾸면 그 동작을 **조용히 건너뛴다**. |
| `title` | `String` | — | `string` | 카드 제목. 서버 `title`이 아직 null이라 `chiefComplaint`가 대신 온다. |
| `status` | `BriefCard.Status` | — | `'BEFORE_VISIT' \| 'CONFIRMED'` | 서버 `DRAFT`/`CONFIRMED`에 대응. **화면에 그리지 않는다.** 확정을 한 번만 부르려고, 그리고 하단 저장 버튼을 숨기려고 드는 값이다. |
| `patientLine` | `String` | — | `string` | "김OO · 32세 여 · 2026.09.04 작성" 형태의 완성된 한 줄. 화면이 조립하지 않는다. |
| `items` | `List<BriefCardItem>` | — | `BriefCardItem[]` | 증상 항목 줄들(축에서 온 것). |
| `severity` | `MedicalMateSeverity?` | — | `1 \| 2 \| 3 \| 4 \| 5 \| null` | 통증 강도 눈금. null이면 눈금 줄 자체를 그리지 않는다. |
| `health` | `List<BriefCardItem>` | `emptyList()` | `BriefCardItem[]` | 복용약·기저질환. 편집에서 열리지 않는다. |
| `allergies` | `List<String>` | — | `string[]` | 알러지 항목. 비면 경고 블록을 그리지 않는다. |
| `questions` | `List<String>` | — | `string[]` | 환자가 묻고 싶어 하는 것. |
| `hospital` | `BriefCardHospital?` | `null` | `BriefCardHospital \| null` | 진료받을 병원. 안 고른 카드가 정상 상태다(1m-B에 건너뛰기가 있다). |
| `visited` | `Boolean` | `false` | `boolean` | **진료를 마쳤는지.** 카드 머리 배지가 읽는 값. `status`와 **다른 축**이다. 상세 응답(`CardResponse`)에 이 값이 없어서 **1e-1에서는 늘 false → 배지가 항상 `진료 전`**이다. 목록(1j-4)에서만 갈린다. |
| `writtenOn` | `LocalDate?` | `null` | `string \| null` (ISO date) | 카드를 쓴 날. 캘린더 카드 줄이 "2026.09.04 · 5항목"으로 쓴다. |

```ts
type BriefCardStatus = 'BEFORE_VISIT' | 'CONFIRMED';
type SeverityLevel = 1 | 2 | 3 | 4 | 5;

interface BriefCard {
  id: string;
  title: string;
  status: BriefCardStatus;
  patientLine: string;
  items: BriefCardItem[];
  severity: SeverityLevel | null;
  health: BriefCardItem[];
  allergies: string[];
  questions: string[];
  hospital: BriefCardHospital | null;
  visited: boolean;
  writtenOn: string | null;
}
```

### 2.2 `BriefCardItem` (KV Row 한 줄)

| 필드 | Kotlin 타입 | 기본값 | TS 타입 | 설명 |
|---|---|---|---|---|
| `key` | `String` | — | `string` | 줄 이름("부위"·"복용약"). 축 id를 한국어로 옮긴 표시용 이름이다. |
| `value` | `String` | — | `string` | 값. |
| `emphasized` | `Boolean` | `false` | `boolean` | 그 진료에서 가장 중요한 한 항목. **카드당 최대 하나**(컴포넌트 규격). 어느 것을 세울지는 AI가 정한다. 전부 강조하면 아무것도 강조되지 않는다. |
| `axis` | `String?` | `null` | `string \| null` | 서버 축 id(`onset`·`site` 등). 고친 값을 PATCH로 보낼 때 어느 축인지 알아야 한다. 줄 이름으로는 못 찾는다. **축에서 오지 않은 줄(복용약·기저질환)은 null이고 고쳐도 보낼 곳이 없다.** |

### 2.3 `BriefCardHospital`

| 필드 | Kotlin 타입 | 기본값 | TS 타입 | 설명 |
|---|---|---|---|---|
| `name` | `String` | — | `string` | 병원 이름. |
| `address` | `String?` | `null` | `string \| null` | 병원 찾기(1m-B)에서 고른 경우에만 있다. 홈·목록에서 누른 줄을 타고 들어온 카드는 이름뿐이다(`CardSummary`에 주소가 없다). **값이 없으면 주소 줄을 그리지 않는다.** |

### 2.4 `BriefCardDraft` (편집 중인 사본)

| 필드 | Kotlin 타입 | TS 타입 | 설명 |
|---|---|---|---|
| `items` | `List<BriefCardItem>` | `BriefCardItem[]` | 사본의 항목. |
| `questions` | `List<String>` | `string[]` | 사본의 질문. |

- 생성자: `BriefCardDraft.of(card) = BriefCardDraft(items = card.items, questions = card.questions)`.
- **값만이 아니라 목록째로 담는다.** 항목·질문을 지우고 더할 수 있게 되면서 순번을 열쇠로 쓰는 방식이 깨졌다. 두 번째를 지우면 뒤 순번이 하나씩 밀린다.
- **원본을 직접 고치지 않는 이유는 취소가 있기 때문이다.**
- `health`·`allergies`·`hospital`·`severity`는 사본에 없다 → 편집 대상이 아니다.

### 2.5 `BriefCardUiState`

```
sealed interface BriefCardUiState {
  data object Loading
  data object Failed
  data class Content(card, draft?, deleteRequested, saveFailed)
}
```

| 갈래 | 필드 | 타입 | 기본값 | 설명 |
|---|---|---|---|---|
| `Loading` | — | — | — | 초기값. 카드를 읽거나 만드는 중. |
| `Failed` | — | — | — | 못 읽음/못 만듦. 다시 시도 버튼이 있는 빈 상태. |
| `Content` | `card` | `BriefCard` | — | 원본 카드. |
| | `draft` | `BriefCardDraft?` | `null` | **null이 아니면 편집 모드다.** 모드 플래그를 따로 두지 않는다 — 둘이 어긋나는 상태를 만들 수 없어야 한다. |
| | `deleteRequested` | `Boolean` | `false` | 삭제 확인 대화상자(1e-1-DC)가 떠 있는지. **편집 상태와 분리**한다. 삭제를 취소하면 편집 모드는 그대로 남는다. |
| | `saveFailed` | `Boolean` | `false` | 확인/저장/병원 변경이 서버에서 거절됐다. **편집 모드를 닫지 않는다** — 닫아 버리면 방금 고친 것이 사라진다. 다만 실제로 문구가 보이는 경우는 좁다 → 바로 아래 참조. |

**`saveFailed`가 화면에 보이는 조건 (소스 확인 — 세 곳 중 한 곳에서만 보인다)**

`saveFailed` 문구는 `Footer`의 **읽기 분기 안에만** 있다(`BriefCardScreen.kt` `Footer`). 그래서:

| `saveFailed`를 켜는 곳 | 그 시점의 모드 | 문구가 보이는가 |
|---|---|---|
| `onSaveClick` 실패(확정) | 읽기 + `status != CONFIRMED` | **보인다** (`저장하지 못했어요. 다시 눌러주세요.`) |
| `onEditDoneClick` 실패(`확인` PATCH) | 편집 — 하단이 `브리핑 카드 삭제` 하나다 | **안 보인다** (조용히 실패) |
| `onHospitalPicked` 실패(병원 변경) | 읽기지만 `status == CONFIRMED`이면 하단 자체가 없다 | **조건부** — 확정 전 카드에서만 보인다 |

즉 **편집 중 `확인`이 거절되면 사용자에게 아무 표시가 없다.** 상태만 바뀌고 화면은 그대로다. 웹으로 옮길 때 이 구멍을 그대로 재현할 이유는 없다 — Nav 액션 옆이나 카드 위에 한 줄을 띄우는 것이 보완 후보다(§21 열린 질문).

파생값(모두 `Content`의 계산 프로퍼티):

| 이름 | 계산식 | 용도 |
|---|---|---|
| `editing` | `draft != null` | 모드 판정 |
| `items` | `draft?.items ?: card.items` | 화면에 그릴 항목 |
| `questions` | `draft?.questions ?: card.questions` | 화면에 그릴 질문 |
| `changed` | `draft != null && draft != BriefCardDraft.of(card)` | Nav 우측이 `취소`인지 `확인`인지 |
| `changedAxes()` | 원본 items의 `axis→value` 맵을 만들고, 사본 items 중 `axis != null` 이면서 값이 달라진 것만 `AxisEdit(axis, value)`로 | PATCH 본문 |

`changedAxes()`는 **자리(index)가 아니라 축 id로 맞춰 비교**한다. 차례가 같아도 줄이 지워질 수 있기 때문이다. 웹도 반드시 같은 방식으로 구현한다.

```ts
function changedAxes(card: BriefCard, draft: BriefCardDraft): AxisEdit[] {
  const before = new Map(card.items.filter(i => i.axis).map(i => [i.axis!, i.value]));
  return draft.items
    .filter(i => i.axis != null && before.get(i.axis) !== i.value)
    .map(i => ({ axis: i.axis!, value: i.value }));
}
```

### 2.6 `BriefCardCallbacks` (화면이 바깥에 요청하는 것 전부)

| 콜백 | 시그니처 | 트리거 |
|---|---|---|
| `onBackClick` | `() -> Unit` | Nav 좌측 뒤로 |
| `onEditClick` | `() -> Unit` | Nav 우측 `편집` |
| `onEditDoneClick` | `() -> Unit` | Nav 우측 `확인` |
| `onCancelClick` | `() -> Unit` | Nav 우측 `취소` |
| `edit` | `BriefCardEditActions` | 카드 안 값/질문 조작 5가지 |
| `onSaveClick` | `() -> Unit` | 하단 `저장하기` |
| `onHospitalChangeClick` | `() -> Unit` | 병원 섹션 헤더의 `변경` |
| `onDeleteClick` | `() -> Unit` | 편집 중 하단 `브리핑 카드 삭제` |
| `onDeleteDismiss` | `() -> Unit` | 대화상자 `취소` 또는 바깥 누름 |
| `onDeleteConfirm` | `() -> Unit` | 대화상자 `삭제` |
| `onRetryClick` | `() -> Unit` | 실패 화면 `다시 시도` |

---

## 3. 1e-1 레이아웃 — 위에서 아래로

```
┌─ Column (fillMaxSize, background = bg/surface) ────────────────┐
│ [1] MedicalMateNavBar  (GLASS, height 56)                      │
│     leading: 뒤로  │  title: "브리핑 카드"  │  action: 편집/취소/확인 │
├────────────────────────────────────────────────────────────────┤
│ [2] 본문 Column  weight(1) · verticalScroll                     │
│     padding: start/end = gutter 20, top 12, bottom 16           │
│     verticalArrangement = spacedBy(14)                          │
│                                                                 │
│   [2-1] BriefCardBlock  (MedicalMateCard)                       │
│         편집 중에는 이 카드 전체를 border/focus 2dp로 두른다      │
│   [2-2] AllergyNotice   ← 읽기 모드에서만, allergies 비면 생략   │
│   [2-3] QuestionsCallout                                        │
│   [2-4] SectionHeader "진료받을 병원" + "변경"                   │
│         MedicalMateHospitalCard                                 │
├────────────────────────────────────────────────────────────────┤
│ [3] Footer  (스크롤 밖 고정)                                     │
│     읽기 & status==CONFIRMED  → 아예 그리지 않는다               │
│     읽기 & status!=CONFIRMED  → (saveFailed 문구) + [저장하기]   │
│     편집                      → [브리핑 카드 삭제]  (DANGER)     │
└────────────────────────────────────────────────────────────────┘
  + deleteRequested 이면 MedicalMateDialog 오버레이
```

Footer 여백: `start/end = gutter 20, top 12, bottom 8`, 자식 간격 12. (하단 CTA용 `MedicalMateBottomCtaBar`를 쓰지 않는다 — 이 화면은 직접 Column을 짠다.)

### 3.1 NavBar 상세

- 제목: `브리핑 카드` (`Heading/S` 17 SemiBold), **바의 가운데**(남은 폭의 가운데가 아님). 액션이 있으면 좌우에서 88씩 비우고 그 안에서 가운데, 없으면 60씩.
- 표면: `MedicalMateSurfaceStyle.GLASS` → `bg/surface` 알파 0.82. (블러는 Compose 한계로 안 걸린다. 웹은 `backdrop-filter: blur(24px)`로 원래 의도를 살릴 수 있다.)
- 하단 1px `border/subtle` 경계선.
- 좌측 슬롯 48, 우측 액션은 버튼이 아니라 글자(`Body/L Strong` 17, `fg/link`)에 최소 높이 48.
- **액션은 `Content` 상태일 때만 보인다.** Loading·Failed에서는 우측이 비어 있다.

### 3.2 Nav 우측 액션 — 한 자리에서 셋으로 갈린다

`navActionLabel(content)`:

| 조건 | 라벨 | 동작 |
|---|---|---|
| `!editing` | `편집` | `onEditClick` → `draft = BriefCardDraft.of(card)` |
| `editing && changed` | `확인` | `onEditDoneClick` → PATCH 후 편집 닫기 |
| `editing && !changed` | `취소` | `onCancelClick` → `draft = null` |

아무것도 안 건드렸는데 `확인`이 떠 있으면 뭘 확인하라는 건지 알 수 없다 — 그래서 `changed`일 때만 `확인`이다. **웹에서도 이 3단 전환을 그대로 구현한다.**

---

## 4. 카드 본체(`BriefCardBlock`) — 모든 블록을 위에서 아래로

컨테이너는 `MedicalMateCard`: 반경 20(`radius/lg`), 안쪽 여백 20, 최소 높이 116, 자식 간격 6, `Elevation/Card` 3dp 그림자(`ShadowTint #1B255A`), 면 `bg/surface`.

`BriefCardBlock`의 파라미터 — **웹 컴포넌트 계약을 그대로 옮긴다.**

| 파라미터 | 타입 | 기본값 | 뜻 |
|---|---|---|---|
| `card` | `BriefCard` | — | 제목·배지·환자줄·`health`·`severity`를 여기서 읽는다 |
| `modifier` | `Modifier` | `Modifier` | 편집 중 `border/focus` 2dp 테두리를 화면이 여기로 넣는다(블록이 스스로 두르지 않는다) |
| `items` | `List<BriefCardItem>` | `card.items` | **따로 받는다.** 편집 중에는 사본의 항목이고 원본과 길이가 다를 수 있다 |
| `editing` | `Boolean` | `false` | 값 줄을 입력 상태로. AI 캡션을 감추는 조건에도 쓰인다 |
| `onItemValueChange` | `(Int, String) -> Unit` | no-op | 항목 값 변경 |
| `onItemDeleteClick` | `((Int) -> Unit)?` | `null` | **null이면 × 를 아예 그리지 않는다.** 화면은 `if (editing) ... else null`로 넘긴다 |
| `showAiCaption` | `Boolean` | `true` | 진료실 화면(1f-1)을 위해 남겨 둔 자리. **지금 이 값을 넘기는 호출자가 없다** |

`items` / `card.items`를 나눠 받는 이유는 편집 사본 때문이다. **웹에서도 표시용 항목 배열을 prop으로 받고, 카드 객체에서 꺼내 쓰지 않는다.** 꺼내 쓰면 편집 중 화면이 원본을 그린다.

| # | 블록 | 컴포넌트 | 소스 필드 | 조건 | 편집 모드에서 |
|---|---|---|---|---|---|
| 1 | **제목 + 상태 배지** | `CardHead` → `Text` + `MedicalMateBadge` | `card.title`, `card.visited` | 항상 | 그대로(제목은 고칠 수 없다) |
| 2 | **환자 요약줄** | `Text` | `card.patientLine` | 항상 | 그대로 |
| 3 | **구분선** | `MedicalMateDivider` | — | 항상 | 그대로 |
| 4 | **증상 항목 표** | `KvLine` × N | `state.items` (편집 중이면 사본) | 항목 수만큼 | **전부 입력 상태 + 각 줄 오른쪽에 ×** |
| 5 | **복용약** | `KvLine` | `card.health[0]` | 적어 둔 값이 있을 때만 | **열리지 않는다** (읽기 그대로, × 없음) |
| 6 | **기저질환** | `KvLine` | `card.health[1]` | 적어 둔 값이 있을 때만 | **열리지 않는다** |
| 7 | **통증 강도** | `MedicalMateSeverityReadout` | `card.severity` | null이 아닐 때만 | 그대로(고칠 수 없다) |
| 8 | **AI 캡션 + 툴팁** | `AiCaption` | 고정 문구 | `showAiCaption && !editing` | **감춘다** |

> `card.health`는 `listOfNotNull(medications, conditions)` 순서로 만들어지므로 **복용약이 먼저, 기저질환이 나중**이다. 하나만 있으면 그 하나만 줄이 된다.

카드 **밖**으로 이어지는 블록(`CardContent`에 있음):

| # | 블록 | 컴포넌트 | 소스 필드 | 조건 | 편집 모드에서 |
|---|---|---|---|---|---|
| 9 | **알러지 경고** | `AllergyNotice` → `MedicalMateNotice(WARNING)` | `card.allergies` | 비어 있지 않을 때 | **통째로 감춘다** |
| 10 | **묻고 싶은 것** | `QuestionsCallout` → `MedicalMateCallout` | `state.questions` | 읽기: 비면 생략 / 편집: 비어도 표시 | 각 질문 입력 + × + `질문 추가` |
| 11 | **진료받을 병원** | `MedicalMateSectionHeader` + `MedicalMateHospitalCard` | `card.hospital` | **항상 표시**(비어도) | 그대로(카드 테두리 밖) |

### 4.1 제목 + 상태 배지 (블록 1)

```
Row(fillMaxWidth, spacedBy 8, CenterVertically)
 └ Column(weight 1, spacedBy 4)
    ├ Row(spacedBy 8, CenterVertically)
    │   ├ Text(card.title)  Heading/M 20 SemiBold, fg/default, weight(1)
    │   └ MedicalMateBadge(label, tone)
    └ Text(card.patientLine)  Body/S 13, fg/subtle
```

배지 문구·톤:

| `card.visited` | 문구 | tone | 색 |
|---|---|---|---|
| `false` | `진료 전` | `NEUTRAL` | 면 `bg/subtle` #EDEFF5, 글자 `fg/subtle` #585F73 |
| `true` | `진료 완료` | `SUCCESS` | 면 `bg/success` #E4F7ED, 글자 `fg/success` #0E7A4A |

배지 규격: 최소 높이 26, 반경 8(`radius/xs`), 좌우 여백 8, `Label/S` 11 Medium 자간 +2%.

**주의 — 배지는 `status`가 아니라 `visited`로 갈린다.** 저장하기가 카드를 확정(`CONFIRMED`)하게 되면서, 확정으로 판단하면 진료를 받기도 전에 "진료 완료"가 뜬다. 그리고 상세 응답에 `visited`가 없어서 **1e-1에서는 실질적으로 늘 `진료 전`**이다. 웹 목데이터도 상세에서는 `visited: false`로 두는 게 현재 앱과 같은 그림이다.

**카드 안에 연필(편집 진입)이 없다.** Nav 우측 `편집`으로 옮겼다 — 진입이 두 곳이 되면 안 된다.

### 4.2 증상 항목 줄 (블록 4~6)

`MedicalMateKvRow` 규격:
- Row 최소 높이 54, 키와 값 사이 간격 16.
- **키 열 폭 72로 고정** → 값이 세로로 정렬된다. 의사가 훑어보는 자리라 정렬이 깨지면 읽는 속도가 떨어진다. 웹에서도 `grid-template-columns: 72px 1fr` 같은 고정 열로 간다.
- 키: `Body/M` 15, `fg/subtle`.
- 값 스타일은 type에 따라:

| `MedicalMateKvRowType` | 언제 | 값 스타일 | 추가 |
|---|---|---|---|
| `DEFAULT` | 읽기, `emphasized = false` | `Body/L` 17 Regular, `fg/default` | — |
| `EMPHASIS` | 읽기, `emphasized = true` | `Body/L Strong` 17 SemiBold, `fg/default` | 카드당 최대 1개 |
| `LINK` | 이 화면에서 안 씀 | `fg/link` | — |
| `EDITING` | 편집 모드의 `items` 줄 | `Body/L` 17 | 값 **아래쪽만** 1dp `border/strong`(#7C8397) 밑줄, 인라인 입력(`BasicTextField`), 커서 색 `border/focus` |

편집 중 줄은 `MedicalMateEditingKvRow`로 감싸진다:

```
Row(fillMaxWidth, CenterVertically)
 ├ MedicalMateKvRow(type = EDITING, weight 1)
 └ MedicalMateIconButton(Close, size = S)   ← 상자 32 · 아이콘 18
      contentDescription = "{key} 항목 삭제"
```

× 를 KvRow 안에 넣지 않는다 — 키 열 72 고정이 값 정렬을 맡고 있는데 오른쪽에 버튼이 들어가면 값 폭이 행마다 달라진다. 그래서 행을 감싸 바깥에 둔다. 밑줄은 그만큼 짧아지고, 시안도 그렇게 그려져 있다.

× 크기는 **S(32 상자 · 18 아이콘)**. 문서가 "항목 안의 삭제는 S, 화면·필드 단위 삭제는 L"로 못 박았다. 크기 차이가 곧 위계다.

**복용약·기저질환 줄에는 × 가 붙지 않는다.** `BriefCardBlock`이 `card.health.forEach { KvLine(item, editing = false, onValueChange = {}) }`로 부르기 때문이다(`onDeleteClick` 인자를 아예 넘기지 않는다).

### 4.3 통증 강도 (블록 7)

`MedicalMateSeverityReadout(severity)` — **출력 전용**이다. 고르는 자리는 문답(1c)의 Severity Slider/Scale/Select다.

```
Row(fillMaxWidth, minHeight 32, spacedBy 12, CenterVertically)
 ├ LevelChip   28×28, 반경 8(radius/xs), 면 = severity.base, 글자 = fg/default, Body/M Strong 15
 ├ Text(label) Body/L Strong 17, fg/default, weight(1)
 └ Text("NRS %d–%d") Body/S 13, fg/subtle
```

5단계 값(문자열 리소스 원문 그대로):

| level | 면 색(`base`) | 낱말(`labelRes`) | NRS | 설명(`descriptionRes`, 이 화면에서는 안 씀) |
|---|---|---|---|---|
| 1 | `#FFE3A8` | `조금 불편해요` | NRS 1–2 | `신경 쓰이지만 하던 일은 계속할 수 있어요` |
| 2 | `#FFC79B` | `은근히 아파요` | NRS 3–4 | `자꾸 생각나고 집중이 잘 안 돼요` |
| 3 | `#FFA894` | `꽤 아파요` | NRS 5–6 | `하던 일을 멈추게 될 때가 있어요` |
| 4 | `#F58079` | `많이 아파요` | NRS 7–8 | `일상생활이 어렵고 참기 힘들어요` |
| 5 | `#DC5A55` | `견디기 힘들어요` | NRS 9–10 | `잠도 못 자고 아무것도 못 하겠어요` |

- NRS 포맷 문자열: `NRS %1$d–%2$d` (en dash `\u2013`).
- 접근성 이름은 `%1$d단계, %2$s` 한 덩어리로 읽는다(예: "3단계, 꽤 아파요"). NRS는 의료진용이라 읽지 않는다. 웹은 `aria-label`에 같은 문자열을 넣고 나머지를 `aria-hidden` 처리한다.
- **색만으로 단계를 전달하지 않는다**(접근성 D11). 숫자 + 낱말 + NRS가 함께 있어야 한다.
- 칩 글자색은 5단계 모두 `fg/default`다. 옅은 1~2단계에서 흰 글자를 쓰면 대비가 무너진다.

### 4.4 AI 캡션 (블록 8)

```
Row(fillMaxWidth, padding top 10, CenterVertically)
 ├ Text("AI가 말씀하신 내용을 정리했어요")  Body/S 13, fg/subtle, weight(1)
 └ MedicalMateTooltip
      text = "말씀하신 내용을 항목별로 정리했어요. 원문도 함께 남아요"
      contentDescription = "AI가 어떻게 정리했는지 보기"
```

- 툴팁은 트리거 **아래에 오른쪽을 맞춰** 붙는다. 말풍선 꼬리가 끝에서 24 지점에 있어 오른쪽을 맞추면 꼬리가 트리거를 가리킨다.
- 말풍선은 `Popup`(별도 레이어)이라 아래 내용의 자리를 밀지 않는다. 밖을 누르면 닫힌다.
- **편집 중에는 이 줄을 감춘다.** 고치는 동안에는 누가 썼는지가 아니라 무엇을 고치는지가 화면의 일이다.

### 4.5 알러지 경고 (블록 9)

`MedicalMateNotice(tone = WARNING)`:

| 슬롯 | 값 |
|---|---|
| title | `알러지 · %1$s` — `%1$s`는 `allergies.joinToString(" · ")` → 예: `알러지 · 페니실린`, `알러지 · 페니실린 · 아스피린` |
| body | `처방 전에 꼭 확인해 주세요` |

규격: 반경 16(`radius/md`), 면 `bg/warning` #FFF4D6, 여백 좌 14 / 우 16 / 위아래 14, 아이콘 32 흰 원 배지 + 20 `AlertTriangle` 아이콘(`fg/warning` #8A5A0B), 글 묶음은 위 4를 띄우고 제목/본문 간격 3. 제목 `Body/M Strong` 15 `fg/warning`, 본문 `Body/S` 13 `fg/subtle`.

동작 규칙:
- `allergies.isEmpty()` → **아무것도 그리지 않는다**(return).
- **편집 모드에서는 통째로 감춘다.** 지울 수 없는 항목이라 × 가 붙지 않는데, × 없는 블록이 편집 화면에 남아 있으면 왜 이것만 못 고치는지 설명되지 않는다.
- **카드 밖에 둔다.** 처방을 바꾸는 값이라 카드 안에 섞으면 훑어 읽을 때 다른 항목과 같은 무게로 지나간다.

### 4.6 묻고 싶은 것 (블록 10)

`MedicalMateCallout`:

```
Surface(반경 20 radius/lg, 면 = bg/primary-subtle #E3E7FC)
 └ Column(padding 16, spacedBy 12)
    ├ Row(spacedBy 6): Chat 아이콘 18(fg/primary) + Text("환자가 묻고 싶어 하는 것") Label/S 11, fg/primary
    ├ QuestionPill × N
    └ [편집 중] MedicalMateAddRow("질문 추가")
```

QuestionPill:
```
Surface(반경 12 radius/sm, 면 = bg/surface 75% 알파)
 └ Row(padding 12, spacedBy 12, CenterVertically)
    ├ 번호 원  24×24, 반경 full, 면 bg/primary #5566D2, 글자 fg/on-primary, Label/S 11
    ├ 읽기: Text(question) Body/M 15
    │ 편집: BasicTextField(weight 1) + placeholder "물어볼 것을 적어주세요" (fg/subtle)
    └ 편집: IconButton(Close, GHOST, S)  contentDescription = "%1$d번 질문 삭제"
```

- 번호는 **목록 순서**(index + 1)가 정한다. 질문을 지우면 뒤 질문의 번호가 밀린다(테스트로 고정돼 있음).
- 읽기 모드에서 `questions`가 비면 **콜아웃 자체를 그리지 않는다**. 편집 모드에서는 비어도 그린다 — `질문 추가`가 그 안에 있어서 감추면 질문을 하나도 안 적은 사람이 더할 방법을 잃는다.
- `질문 추가` 줄(`MedicalMateAddRow`): 최소 높이 48, 테두리·면색 없음, Plus 아이콘 18 + 라벨 `Body/L Strong` 17, 둘 다 `fg/primary`. 버튼처럼 보이지 않아야 한다.
- 접근성 이름 포맷 `%1$d번 질문 삭제`의 `%1$d` 자리는 화면이 한 번 받아 두고 실제 번호로 치환한다(`stringResource`를 반복 호출할 수 없어서). 웹은 그냥 템플릿 함수로 만든다.

### 4.7 진료받을 병원 (블록 11)

```
MedicalMateSectionHeader(title = "진료받을 병원", actionLabel = "변경", onActionClick)
MedicalMateHospitalCard(name = hospital?.name ?: "병원 미정", address = hospital?.address)
```

- **병원을 안 정했어도 섹션을 둔다.** 전에는 비면 통째로 감췄는데, `변경`이 이 섹션 안에 있어서 감추면 정할 길이 사라진다. 1m-B에 건너뛰기가 있어 안 정한 카드가 정상 상태다.
- 비었을 때 이름 자리는 `병원 미정`(목록의 낱말과 맞춘 것).
- **편집 모드에서도 그대로 보인다**(감추지 않는다). 카드 테두리 밖이라 브랜드 테두리에 포함되지 않는다.
- `SectionHeader` 규격: 위 여백 24, 아래 10, 제목 `Heading/M` 20, 액션 `Body/M Strong` 15 `fg/link`(#2E3E9E) + 세로 여백 8(터치 높이 40).
- `HospitalCard` 규격: 반경 20, 그림자 `Elevation/Card`, 면 `bg/surface`, 안쪽 여백 18(아래만 14), 아이콘 상자 48×48 반경 14(`bg/primary-faint` #F2F4FE) + Hospital 아이콘 24(`fg/primary`), 아이콘-글자 간격 13, 이름 `Body/L Strong` 17, 주소 `Body/S` 13 `fg/subtle`, 이름-주소 간격 3.
- 이 화면에서는 **날짜 칩을 넘기지 않는다**(`chips = emptyList()`). 진료 날짜는 캘린더 일정이 들고 있고 카드가 정하는 값이 아니다. 칩이 없으면 카드 안 구분선도 안 그려진다.
- **주소가 없으면 주소 줄 자체를 그리지 않는다.** 빈 줄을 남기면 이름 아래가 비어 카드가 잘린 것처럼 보인다.

> 디자인 미확정: 병원이 없을 때 그 자리의 액션이 `변경`이 맞는지는 시안에 없다(소스 주석의 디자인 트랙 확인 항목).

---

## 5. 데모 큐카드 기대 출력과의 대조

기준 문서: `C:/Users/user/Downloads/진료메이트-시연녹화-큐카드-Astra-통합판.md` 5절 "브리핑 카드 (15번)".

큐카드가 적은 기대 출력:

```
복부 통증 · 3주                              진료 전
고OO · 34세 남 · 2026.09.15 작성
부위      명치
시작      3주 전부터 서서히
느낌      쓰리고 타는 것 같은 느낌
경과      처음보다 심해졌어요
악화      밥 먹고 30분쯤 지나면 제일 쓰리고, 밤에 누우면 더 심해요
퍼짐      그 자리에만 있어요
동반      속이 더부룩하고 트림이 자주 나요
복용약    혈압약 · 진통제
기저질환  고혈압
3  꽤 아파요
⚠ 알러지 · 페니실린
환자가 묻고 싶어 하는 것
 1 (AI 추천 1)
 2 (AI 추천 2)
 3 지금 먹는 진통제를 계속 먹어도 되나요?
진료받을 병원   서울삼성내과의원
```

블록 단위 대조 — **코드에 빠진 블록은 없다.**

| 큐카드 줄 | 코드의 블록 | 판정 |
|---|---|---|
| 제목 + `진료 전` | 블록 1 `card.title` + `visitedLabel(false)` | 일치 |
| 환자 요약줄 | 블록 2 `card.patientLine` | 일치 (`patientLine()`이 이름·나이+성별·작성일을 ` · `로 잇는다) |
| 부위/시작/느낌/경과/악화/퍼짐/동반 7줄 | 블록 4 `items` (축 7개) | **줄 이름과 차례가 다름 — 아래 참조** |
| 복용약 | 블록 5 `card.health[0]` | 일치 |
| 기저질환 | 블록 6 `card.health[1]` | 일치 |
| `3  꽤 아파요` | 블록 7 `MedicalMateSeverityReadout` | 일치 + **코드는 오른쪽에 `NRS 5–6`을 더 그린다**(큐카드 표기 생략) |
| `⚠ 알러지 · 페니실린` | 블록 9 | 일치 + **코드는 본문 `처방 전에 꼭 확인해 주세요`를 더 그린다** |
| `환자가 묻고 싶어 하는 것` 1·2·3 | 블록 10 | 일치 |
| `진료받을 병원  서울삼성내과의원` | 블록 11 | 일치 |
| (큐카드에 없음) | 블록 3 구분선 | 코드에만 있음 |
| (큐카드에 없음) | 블록 8 AI 캡션 + 툴팁 | **코드에만 있음** — 큐카드가 누락한 실제 화면 요소 |
| (큐카드에 없음) | 하단 `저장하기` | 큐카드 15번 지시문에는 있음("맨 아래 `저장하기`") |

**큐카드 내부의 순서 불일치 (코드가 정본이다)**

큐카드 15번 지시문은 스크롤 순서를 `알러지 → 증상 항목 → 통증 → 묻고 싶은 것 → 진료받을 병원`으로 적는다. **알러지가 맨 앞이다.** 그런데 같은 큐카드의 기대 출력 블록(위 코드블록)은 알러지를 기저질환·강도 **뒤에** 둔다.

코드는 후자와 같다 — `CardContent`가 `BriefCardBlock`(제목~강도~AI 캡션) → `AllergyNotice` → `QuestionsCallout` → 병원 순으로 쌓는다. 알러지는 **카드 상자 밖 아래**다. 15번 지시문의 나열 순서는 촬영 메모의 실수로 보이며, **웹은 코드 순서를 따른다.**

**축 이름·차례 불일치 (웹 구현 시 소스를 따른다)**

| 큐카드 표기 | 실제 `axisLabel()` | 서버 축 id |
|---|---|---|
| 부위 | `부위` | `site` |
| 시작 | `시작` | `onset` |
| 느낌 | **`양상`** | `character` |
| 경과 | `경과` | `time_course` |
| 악화 | **`심해질 때`** | `exacerbating_relieving` |
| 퍼짐 | **`뻗치는 곳`** | `radiation` |
| 동반 | **`동반증상`** | `associated` |
| — | `강도` | `severity` (줄이 아니라 눈금으로 감) |

차례도 다르다. 코드의 `AXIS_ORDER`는
`site → onset → character → radiation → associated → time_course → exacerbating_relieving`
= **부위 → 시작 → 양상 → 뻗치는 곳 → 동반증상 → 경과 → 심해질 때**
이고, 큐카드는 부위 → 시작 → 느낌 → 경과 → 악화 → 퍼짐 → 동반이다. 큐카드가 촬영용 축약 메모라서 생긴 차이로 보이며, **정본은 `CardMapping.kt`의 `axisLabel()`과 `AXIS_ORDER`다.**

또 하나: 코드의 preview 픽스처(`previewBriefCard`)는 축이 아니라 손으로 적은 항목이라 `부위 / 기간 / 양상 / 복용약 / 기저질환`을 쓴다. `기간`은 `axisLabel()`에 없는 이름이다 — 픽스처 전용이므로 웹 목데이터는 픽스처가 아니라 축 매핑을 따라야 한다.

---

## 6. 편집 모드 (1e-1-E)

### 6.1 진입과 종료

| 조작 | 상태 변화 | 서버 |
|---|---|---|
| Nav `편집` | `draft = BriefCardDraft.of(card)` | 없음 |
| Nav `취소` | `draft = null` (사본 버림) | 없음 |
| Nav `확인` | PATCH 후 `Content(card = 응답카드.copy(items = draft.items, hospital = 기존 hospital))` | `PATCH /api/cards/{id}` |
| 하단 `브리핑 카드 삭제` | `deleteRequested = true` | 없음 (대화상자만) |

### 6.2 편집 모드의 시각적 차이

| 요소 | 읽기(1e-1) | 편집(1e-1-E) |
|---|---|---|
| 카드 블록 테두리 | 없음 | **2dp `border/focus`(#5566D2), 반경 20** — 카드째로 두른다 |
| `items` 줄 | 읽기 텍스트 | 밑줄 + 인라인 입력, 오른쪽 × (S) |
| `health` 줄(복용약·기저질환) | 읽기 텍스트 | **그대로 읽기** (× 없음) |
| 통증 강도 | 표시 | 표시(고칠 수 없음) |
| AI 캡션 | 표시 | **숨김** |
| 알러지 경고 | 표시 | **숨김** |
| 질문 콜아웃 | 비면 숨김 | 비어도 표시, 각 질문 입력 + × , 하단 `질문 추가` |
| 병원 섹션 | 표시 | 표시 |
| 하단 | `저장하기`(확정 안 된 카드만) | `브리핑 카드 삭제` (DANGER) |
| Nav 우측 | `편집` | `취소` / `확인` |

값마다 밑줄이 생기지만 밑줄만으로는 몇 줄이 열렸는지 보이지 않는다 — 그래서 카드 전체를 브랜드 테두리로 감싼다.

편집 중 하단에 저장하기를 함께 두지 않는다. 사본을 옮기는 것은 Nav `확인`이 하고 되돌리는 것은 `취소`가 한다 — 같이 두면 확인과 저장이 같은 일을 두 번 한다.

### 6.3 `BriefCardEditActions` — 사본 조작 5가지

`class BriefCardEditActions(private val update: ((BriefCardDraft) -> BriefCardDraft) -> Unit)`

상태를 갖지 않는다. `update` 창구로 `BriefCardDraft`만 고친다. ViewModel은 `update`를 이렇게 연결한다: `Content`가 아니거나 `draft == null`이면 **아무것도 하지 않는다.**

| 메서드 | 시그니처 | 동작 | 범위 밖 index |
|---|---|---|---|
| `onItemValueChange` | `(index: Int, value: String)` | `draft.items[index].value = value` (copy) | 그대로 반환 |
| `onItemDeleteClick` | `(index: Int)` | `draft.items`에서 그 자리만 제거 | 그대로 반환 |
| `onQuestionChange` | `(index: Int, value: String)` | `draft.questions[index] = value` | 그대로 반환 |
| `onQuestionDeleteClick` | `(index: Int)` | `draft.questions`에서 그 자리만 제거 | 그대로 반환 |
| `onQuestionAddClick` | `()` | `draft.questions + ""` (목록 끝에 **빈 질문**) | — |
| (없음) | — | 항목 추가는 없다 — 카드 항목은 AI가 정한 것이라 사람이 새 축을 만들지 않는다 | — |

> 소스 KDoc은 "사본 조작만 여섯 가지"라고 적지만 **실제 공개 메서드는 다섯 개**다(주석이 낡았다). 정본은 코드다.

규칙:
- **값이 빈 항목을 자동으로 지우지 않는다.** 글자를 다 지우는 것과 항목을 없애는 것은 다른 일이고, 없애는 조작은 × 로 따로 있다.
- 항목 줄의 × 에는 확인 대화상자를 붙이지 않는다. 개체가 아니라 안의 항목이고 `취소`가 되돌린다.
- `질문 추가`는 입력 필드를 따로 띄우지 않고 **목록 끝에 빈 질문 하나**를 더한다. 적으면 그대로 항목이 된다. 3개였으면 새 질문이 4번이다.
- 목록 조작은 전부 `withoutAt(index)` = `filterIndexed { at, _ -> at != index }`로 **새 목록을 만든다**(제자리 수정 없음). 웹에서도 불변 배열로 간다.

**항목 삭제는 서버에 전달되지 않는다 (실제 동작, 버그처럼 보이는 정상).**

`changedAxes()`가 **사본에 남아 있는 줄만** 훑기 때문에, 지운 줄은 `AxisEdit`를 만들지 않는다. 테스트가 이를 고정해 두었다 — `BriefCardViewModelTest`의 `줄을 지워도 남은 축의 자리가 밀리지 않는다`가 첫 줄을 지운 뒤 `updatedAxes == emptyList()`를 단언한다.

결과:
1. `확인`을 누르면 서버에는 **아무 축도 안 나간다**(질문만 나간다).
2. 화면은 `result.value.copy(items = draft.items)`로 갈아타므로 **그 자리에서는 줄이 사라진 것처럼 보인다**.
3. 카드를 다시 열면(`GET`) 서버의 축이 그대로라 **지운 줄이 되살아난다**.

웹으로 옮길 때 선택지는 둘이다 — 앱과 똑같이 두거나(현 상태 재현), 지운 축을 빈 값(`value: ""`)으로 보내 서버에서도 비우거나. **어느 쪽이든 의도를 코드에 남긴다.** 목데이터만 쓰는 단계에서는 2번까지만 구현하면 앱과 같은 그림이 된다.

### 6.4 `확인`(저장) 동작 상세

```
onEditDoneClick():
  state = Content 아니면 return
  draft == null 또는 card.id.toLongOrNull() == null 이면 return
  result = patch(cardId, state.changedAxes(), draft.questions)     // clinic 없음
  Success  → Content(card = result.value.copy(items = draft.items, hospital = state.card.hospital))
  Rejected/NetworkUnavailable → state.copy(saveFailed = true)      // 편집 모드 유지
```

세 가지가 중요하다.

1. **바뀐 축만 보낸다.** PATCH라 보낸 것만 바뀌는데, 손대지 않은 축까지 실어 보내면 서버가 그것도 환자가 고친 값(`PATIENT_EDIT`)으로 남긴다.
2. **응답으로 온 카드로 갈아탄다.** 확정된 카드를 고치면 서버가 **새 버전을 만들고 `cardId`가 달라진다.** 옛 id를 들고 있으면 다음 수정이 엉뚱한 카드로 간다.
3. **응답 카드에 `items`와 `hospital`을 덮어씌운다.** 응답의 `axes`는 서버가 다시 만든 것이라 화면이 방금 그린 줄과 다를 수 있고, 상세 응답에 병원이 없는 경로가 있어 `hospital`을 잃을 수 있다.

성공하면 `draft`가 들어 있지 않은 새 `Content`를 만들므로 편집 모드가 닫힌다.

실패하면 `saveFailed = true`가 되지만 **편집 모드의 하단에는 그 문구를 그릴 자리가 없다**(§2.5의 표 참조). 앱에서는 아무 반응 없이 편집 화면이 그대로 남는다.

### 6.5 409 `CARD_ALREADY_EDITED` 복구 (웹도 그대로 필요)

```
private suspend fun patch(cardId, axes, questions, clinic?):
  first = repository.update(cardId, axes, questions, clinic)
  latest = (first as? Rejected)?.latestCardId() ?: return first
  return repository.update(latest, axes, questions, clinic)   // 딱 한 번만 더
```

- `latestCardId()`는 `code == ApiErrorCode.CARD_ALREADY_EDITED`일 때만 `details.latestCardId`(JSON number)를 읽는다. 다른 코드면 null.
- **한 번만 따라간다.** 두 번째도 막히면 그대로 실패로 알린다 — 계속 따라가면 어디서 멈출지 알 수 없고, 다른 사람이 동시에 고치고 있다면 덮어쓰기를 반복하게 된다.
- 이유: 확정된 카드를 고치면 새 버전이 생기고 옛 id는 자식을 갖는다. 그 옛 id로 또 고치면 버전이 가지를 치는데, 가지에 넣은 편집은 목록이 최신 한 장만 내면서 어느 화면에도 나오지 않는다.

---

## 7. 삭제 흐름

```
[편집 모드 하단] "브리핑 카드 삭제" (DANGER, fillMaxWidth)
        │ onDeleteClick
        ▼
  deleteRequested = true
        │
        ▼
┌ MedicalMateDialog (tone = DANGER 기본) ────────────────┐
│  상단 원형 배지 48 (bg/danger #FFEDEB + Trash 24 fg/danger) │
│  제목    이 브리핑 카드를 삭제할까요?                      │
│  본문    연결된 진료 기록은 남고 이 카드는 사라져요.        │
│  [취소 (TONAL, M)]      [삭제 (DANGER, M)]               │
└──────────────────────────────────────────────────────┘
   취소/바깥 누름 → onDeleteDismiss → deleteRequested = false (편집 모드는 남는다)
   삭제           → onDeleteConfirm
```

대화상자 슬롯과 리소스 키:

| 슬롯 | 리소스 키 | 문구 |
|---|---|---|
| title | `brief_card_delete_title` | `이 브리핑 카드를 삭제할까요?` |
| message | `brief_card_delete_body` | `연결된 진료 기록은 남고 이 카드는 사라져요.` |
| confirmLabel | `brief_card_delete_confirm` | `삭제` |
| dismissLabel | `brief_card_cancel` (**Nav `취소`와 같은 키를 재사용**) | `취소` |

`onDeleteConfirm(onDeleted)`:
1. `cardId = card.id.toLongOrNull()` 를 먼저 읽어 둔다.
2. 상태를 `copy(deleteRequested = false, draft = null)`로 바꾼다 (대화상자 닫고 편집도 닫음).
3. `cardId == null`이면 여기서 끝 (서버 호출 없음, 화면도 안 나감).
4. `DELETE /api/cards/{cardId}` → **성공일 때만** `onDeleted()`를 부른다. 실패하면 화면에 그대로 있는다 — 나가 버리면 안 지워진 카드를 지운 것으로 알게 된다.

> 실패 시 사용자에게 보이는 피드백이 **없다**(토스트도 `saveFailed`도 안 켠다). 웹으로 옮길 때 보완 후보다.

삭제 후 이동: `onDeleted` → `navigate(BriefCardListDestination) { popUpTo<HomeDestination>(inclusive = false); launchSingleTop = true }`. 지운 카드의 화면에 남을 수 없고, 시안(1e-1-DC)이 카드 목록으로 보낸다. 홈까지만 걷어내서 뒤로 가면 홈이 나오고 목록이 두 장 쌓이지 않는다.

**서버 삭제의 파급(다이얼로그 본문보다 넓다).** `CardApi.delete` 주석: 문답과 진료 기록은 **함께 지워지고**, 일정은 남고 연결만 끊긴다. 같은 문답에서 나온 카드는 **버전을 가리지 않고 전부** 지워진다. 확정·전달한 카드도 지울 수 있고 **되돌릴 수 없다.**

대화상자 규격: 반경 24(`radius/xl`), 면 `bg/surface`, 여백 좌우 20 / 위 `TopPadding` / 아래 16, 자식 간격 10, 버튼 두 개가 `weight(1)`로 **좌우 균등**(취소 왼쪽, 실행 오른쪽), 버튼 사이 8, M 크기(높이 48, 반경 14).

---

## 8. 병원 변경 흐름

```
[진료받을 병원] 섹션 헤더의 "변경"
   │ onHospitalChangeClick = { content?.card?.id?.let(onHospitalChange) }
   ▼
navigate(HospitalPickDestination(purpose = BEFORE_VISIT, cardId = 카드 id))   // 1m-B
   │ 병원 고름
   ▼
navController.popWithResult(HOSPITAL_NAME to name, HOSPITAL_ADDRESS to address)
   │  ← 엔트리를 갈아치우지 않는다. 그래야 편집 중이던 값이 남는다.
   ▼
entry.ConsumeResult(NavResult.HOSPITAL_NAME, NavResult.HOSPITAL_ADDRESS, viewModel::onHospitalPicked)
```

`onHospitalPicked(name: String?, address: String?)`:
1. `Content`가 아니면 return.
2. `cardId = card.id.toLongOrNull()?.takeIf { !name.isNullOrBlank() }` — 고른 게 없거나 id를 못 바꾸면 **화면 그대로 두고 return**.
3. `picked = BriefCardHospital(name = name.orEmpty(), address = address?.takeIf { it.isNotBlank() })` — 빈 주소는 null로.
4. `patch(cardId, axes = emptyList(), questions = state.card.questions, clinic = picked)`
   - 축은 안 보내고, **질문은 원본 그대로 다시 보낸다**(PATCH 본문에 `questions`가 항상 들어간다).
5. 성공 → `Content(card = 응답카드)` 로 **통째로 교체** (여기서는 `items`/`hospital` 덮어쓰기를 하지 않는다. 응답의 `clinic`이 방금 고른 병원이다). 이때 `draft`가 사라지므로 **편집 중이었다면 편집 모드가 닫힌다.**
6. 실패 → `state.copy(saveFailed = true)`. 카드는 그대로 둔다 — 화면에만 바꿔 두면 다시 열었을 때 되돌아가 있다.

주소를 함께 보내는 이유: 같은 이름의 다른 지점을 가르는 값이라 이름만 남기면 어느 곳을 골랐는지 알 수 없다. 심평원에 주소가 없는 곳은 비어 있고, 그때는 블록이 이름만 그린다.

---

## 9. 저장하기(확정) 흐름

하단 `저장하기` → `onSaveClick(onSaved)`:

```
state = Content 아니면 return
cardId = card.id.toLongOrNull()?.takeIf { card.status != CONFIRMED }
if (cardId == null) { onSaved(); return }          // 이미 확정했거나 부를 수 없는 id → 나가기만
POST /api/cards/{cardId}/confirm
  Success → Content(card = 응답카드.copy(hospital = 기존 hospital)) ; onSaved()
  실패    → state.copy(saveFailed = true)          // 화면에 남는다
```

- **확정하지 않으면 진료 후 기록을 남길 수 없다.** 서버가 `POST /api/cards/{cardId}/visit`을 확정한 카드에만 받는다. 카드는 `DRAFT`로 만들어지고, 확정을 부르던 진료실 전달 버튼이 시안에서 빠지면서 확정이 아예 일어나지 않게 됐다(기기에서 400 확인).
- **이미 확정한 카드는 다시 부르지 않는다.** 두 번 확정하면 400.
- 실패하면 `onSaved()`를 부르지 않는다 — 나가 버리면 저장되지 않은 것을 저장된 것으로 알게 된다.
- 이동: `onSaved` → `navController.resetTo(HomeDestination)` (백스택 리셋, 홈 · 최근 브리핑 카드로).
- 응답 카드에 `hospital`을 덮어씌운다(상세 응답 경로에 병원이 없을 수 있어서).

### 9.1 하단 Footer 규칙 (세 가지 갈래)

| 조건 | 하단 |
|---|---|
| `editing` | `브리핑 카드 삭제` (DANGER, fillMaxWidth, L) |
| `!editing && status == CONFIRMED` | **하단 자체를 그리지 않는다** (`return`) |
| `!editing && status != CONFIRMED` | (`saveFailed`면 빨간 안내 한 줄) + `저장하기` (PRIMARY, fillMaxWidth, L) |

- **이미 저장한 카드에는 하단이 없다.** 홈이나 기록에서 여는 카드는 다시 보는 자리인데 저장하기가 서 있으면 아직 저장이 안 된 것으로 읽힌다.
- 아직 확정하지 않은 카드에는 남긴다. 저장 자리를 통째로 없애면 그 카드를 되살릴 길이 사라진다.
- `saveFailed` 문구: `저장하지 못했어요. 다시 눌러주세요.` — `Body/S` 13, `fg/danger`(#C4302B). **버튼은 살려 둔다.** 아무 말도 하지 않으면 버튼이 안 먹는 것으로 읽고 계속 누르게 된다(기기에서 실제로 그랬다).
- `saveFailed`는 한 번 켜지면 스스로 꺼지지 않는다. 다음 성공으로 상태가 통째로 교체될 때만 사라진다.
- **"진료실에서 보여주기" 버튼은 없다.** IA가 진료실 전달을 1e-1로 대체하면서 사라졌다.

---

## 10. 로딩 / 실패 / 빈 상태 (1e-1)

| 상태 | 보이는 것 |
|---|---|
| `Loading` | NavBar(우측 액션 없음) + `MedicalMateLoadingSpinner`가 남은 높이 전부(`weight(1)`) 차지. 스피너는 `CircularProgressIndicator` 24dp, 색 `bg/primary`(#5566D2), 가운데 정렬, 메시지 없음(이 화면은 `message`를 넘기지 않는다), 컨테이너 여백 20. |
| `Failed` | NavBar(우측 액션 없음) + `MedicalMateEmptyState(type = NO_RESULT)`를 가운데 정렬. 컨테이너 패딩 = gutter 20. |
| 빈 카드 | **없다.** 카드가 없으면 `Failed`다. 개별 블록만 조건부로 빠진다(알러지 없음 / 질문 없음 / 강도 없음 / 병원 미정). |

`Failed` 화면 문구(원문 그대로):

| 슬롯 | 문구 |
|---|---|
| title | `카드를 불러오지 못했어요` |
| description | `인터넷 연결을 확인하고 다시 시도해주세요` |
| actionLabel | `다시 시도` |

`MedicalMateEmptyState` 구성: 72 원(옅은 면) 안에 32 아이콘(`NO_RESULT` → `SearchOff`), 그 아래 글 묶음(위 4 띄움, 제목/설명 간격 6), 제목 `Heading/M` 20 `fg/default` 가운데, 설명 `Body/M` 15 `fg/subtle` 가운데, 그 아래 액션(채움 없는 글자, 터치 48). 바깥 세로 여백 40, 자식 간격 12, 세로 가운데 정렬.

`다시 시도` → `onRetryClick` → `viewModel.open(cardId, sessionId, hospital)` (라우트가 들고 온 값으로 다시).

---

## 11. 1e-1 네비게이션 — 들어오는 길과 나가는 길

### 11.1 라우트 파라미터 (`BriefCardDestination`)

| 파라미터 | 타입 | 설명 |
|---|---|---|
| `cardId` | `String?` | 이미 있는 카드를 열 때. 라우트는 문자열로 들고 다니고 목적지 진입 시 `toLongOrNull()`로 바꾼다. |
| `sessionId` | `Long?` | 아직 카드가 없을 때 그 카드를 만들 문답 id. |
| `hospitalName` | `String?` | 카드를 **만들 때만** 함께 보낼 병원 이름(1m-B에서 고른 것). |
| `hospitalAddress` | `String?` | 위와 짝. `hospitalName`이 없으면 병원이 없는 것으로 본다. |

`open(cardId, sessionId, hospital)` 분기:
- `cardId != null` → `GET /api/cards/{cardId}`
- `cardId == null && sessionId != null` → `POST /api/sessions/{sessionId}/card` (병원 동봉)
- 둘 다 null → `Failed`
- 결과가 성공이 아니면 `Failed`

**한 번 연 카드는 다시 읽지 않는다**: `if (mutableUiState.value is BriefCardUiState.Content) return`. 병원을 고르러 갔다 오면 조합이 다시 시작되면서 이 호출이 한 번 더 온다. id 비교로 막으면 모자란다 — 카드를 고치면 서버가 새 버전을 만들어 id가 달라지는데 라우트는 누를 때의 옛 id를 그대로 들고 있어서, 비교하면 옛 버전을 다시 읽어 오고 거기서 또 고치면 버전이 가지를 친다. 웹에서는 **라우트 키로 마운트된 인스턴스가 살아 있는 동안 재조회 금지**로 옮긴다.

`open()`을 부르는 자리는 `LaunchedEffect(cardId, sessionId, hospital)`이다 — 세 값이 바뀔 때마다 다시 부르지만, 함수 첫 줄의 `Content` 가드가 두 번째 호출부터 막는다. **웹의 `useEffect` 의존성 배열이 같은 모양이 되더라도 가드가 있으면 안전하다. 가드를 빼면 안 된다.**

### 11.1-a 라우트 → 병원 변환 (`briefCardHospital`)

```
hospitalName == null              → null (병원 없음)
hospitalName != null              → BriefCardHospital(name = hospitalName, address = hospitalAddress)
```

- **이름만 보고 가른다.** 주소는 있으면 그대로 싣고 없으면 null이다.
- 소스 KDoc은 "이름만 있고 주소가 없는 경우는 만들지 않는다"라고 적지만 **코드는 그렇게 하지 않는다**(주소가 null이어도 객체를 만든다). 정본은 코드다.
- 이 병원은 **카드를 만들 때만** `GenerateCardRequest.clinic`으로 나간다. 이미 있는 카드를 열 때는 라우트가 비어 있고 병원은 응답의 `clinic`에서 온다.

### 11.1-b 목적지 함수의 나가는 콜백 (`briefCardDestination`)

화면은 목적지를 모른다. 그래프(`MedicalMateNavHost.kt`)가 네 개를 꽂아 준다.

| 콜백 | 그래프가 연결한 동작 |
|---|---|
| `onSaved` | `navController.resetTo(HomeDestination)` |
| `onDeleted` | `navigate(BriefCardListDestination) { popUpTo<HomeDestination>(inclusive = false); launchSingleTop = true }` |
| `onHospitalChange(cardId)` | `navigate(HospitalPickDestination(purpose = BEFORE_VISIT, cardId))` |
| `onExit` | `popBackStack()` |

화면 쪽 `BriefCardCallbacks`와의 연결(`BriefCardRoute`):

| 화면 콜백 | 연결 |
|---|---|
| `onBackClick` | `onExit` |
| `onEditClick` / `onEditDoneClick` / `onCancelClick` | 같은 이름의 ViewModel 메서드 |
| `edit` | `viewModel.editActions` |
| `onSaveClick` | `viewModel.onSaveClick(onSaved)` |
| `onDeleteClick` / `onDeleteDismiss` | ViewModel 메서드 |
| `onDeleteConfirm` | `viewModel.onDeleteConfirm(onDeleted)` |
| `onHospitalChangeClick` | `content?.card?.id?.let(onHospitalChange)` — **`Content`가 아니면 아무 일도 안 한다** |
| `onRetryClick` | `viewModel.open(cardId, sessionId, hospital)` (라우트가 들고 온 값 그대로) |

### 11.2 들어오는 길

| 출발 화면 | 트리거 | 넘기는 값 |
|---|---|---|
| 1c-5 증상 정리 완료 | `브리핑 카드 만들기` | `sessionId` |
| 1m-B 병원 찾기(진료 전, `cardId == null`) | 병원 고름 | `sessionId` + `hospitalName` + `hospitalAddress` |
| 홈 · 최근 브리핑 카드 줄 | 줄 누름 | `cardId` |
| 1j-4 브리핑 카드 전체 | 행 누름(편집 아닐 때) | `cardId` |
| 1r-1 캘린더 월 | 카드 열기 | `cardId` |
| 1r-2 캘린더 일자 | 카드 열기 | `cardId` |

### 11.3 나가는 길

| 트리거 | 목적지 | 비고 |
|---|---|---|
| Nav 좌측 뒤로 / 시스템 뒤로 | `popBackStack()` | 편집 중이어도 확인 없이 나간다 |
| 하단 `저장하기` 성공 | `resetTo(HomeDestination)` | 백스택 리셋 |
| 대화상자 `삭제` 성공 | `BriefCardListDestination` (`popUpTo<Home>` 유지 + `launchSingleTop`) | 1j-4 |
| 병원 섹션 `변경` | `HospitalPickDestination(purpose = BEFORE_VISIT, cardId)` | 결과를 받아 **돌아온다**(엔트리 유지) |
| `편집` / `확인` / `취소` | **이동 없음** | 같은 화면의 모드 전환 |

---

## 12. 1j-4 브리핑 카드 전체(목록)

홈의 "최근 브리핑 카드 · 전체 보기"에서 **밀려 들어오는 화면**이다. 탭이 아니므로 상단 왼쪽에 뒤로가기가 있고 **하단 탭바를 두지 않는다**(시안도 그 상태의 탭바를 감췄다).

기록 탭(1j-1)이 카드와 진료 기록을 함께 보여주는 것과 달리 **여기는 카드만** 모은다.

### 12.1 상태 `BriefCardListUiState`

| 갈래 | 필드 | 타입 | 기본값 | 설명 |
|---|---|---|---|---|
| `Loading` | — | — | — | 초기값 |
| `Failed` | — | — | — | 목록 못 불러옴 |
| `Content` | `groups` | `List<RecordGroup>` | — | 월별 묶음. **비어 있으면 빈 상태 화면** |
| | `selectedIds` | `Set<String>?` | `null` | **null이 아니면 편집 중**(1j-4-D). 빈 집합과 null을 나눠 쓴다 — 편집에 막 들어와 아무것도 고르지 않은 상태와 편집이 아닌 상태는 화면이 다르다 |
| | `deleteRequested` | `Boolean` | `false` | 삭제 확인 대화상자 표시 |

파생값: `editing = selectedIds != null`, `selectedCount = selectedIds?.size ?: 0`.

```ts
interface BriefCardListContent {
  groups: RecordGroup[];
  selectedIds: string[] | null;   // null = 편집 아님, [] = 편집 중 0개 선택
  deleteRequested: boolean;
}
```

### 12.2 `RecordGroup` / `RecordItem` (1j-1과 공유하는 타입)

`RecordGroup`

| 필드 | 타입 | 설명 |
|---|---|---|
| `monthLabel` | `String` | `"2026년 9월"` 형태. `LazyColumn`의 item key로도 쓰인다 |
| `items` | `List<RecordItem>` | 개수는 `items.size`로 센다(별도 count 필드 없음) |

`RecordItem`

| 필드 | Kotlin 타입 | 기본값 | TS 타입 | 1j-4에서 |
|---|---|---|---|---|
| `id` | `String` | — | `string` | 카드 id. 선택·삭제·이동의 열쇠 |
| `cardId` | `String?` | `null` | `string \| null` | 기록이 매달린 카드. **1j-4는 채우지 않는다**(행 자체가 카드라서) |
| `title` | `String` | — | `string` | 카드 제목(24자 초과 시 잘림) |
| `status` | `RecordItem.Status` | — | `'DRAFT' \| 'BEFORE_VISIT' \| 'CONFIRMED'` | 배지 |
| `clinic` | `String?` | `null` | `string \| null` | 진료받을 병원 이름. `meta`에도 들어가지만 값으로도 든다 |
| `meta` | `String` | — | `string` | 완성된 한 줄. 예: `09.04 작성 · 서울OO병원 내과` |
| `detail` | `String?` | `null` | `string \| null` | 보조 한 줄. **1j-4 실제 데이터에서는 항상 null** — 목록 응답에 본문이 없어서 카드가 무엇을 담았는지 알 수 없다 |
| `resumeLabel` | `String?` | `null` | `string \| null` | 작성 중인 카드에만. **1j-4 실제 데이터에서는 항상 null** |

### 12.2-a `BriefCardListCallbacks` (1j-4 화면이 바깥에 요청하는 것 전부)

1e-1의 `BriefCardCallbacks`(§2.6)에 대응하는 목록 쪽 계약이다. 전부 기본값 no-op이라 Preview가 인자 없이 화면을 그릴 수 있다.

| 콜백 | 시그니처 | 트리거 | 라우트가 연결한 것 |
|---|---|---|---|
| `onBackClick` | `() -> Unit` | Nav 좌측 뒤로 | `onExit` → `popBackStack()` |
| `onCardClick` | `(RecordItem) -> Unit` | 행 누름(읽기 모드) | `navigate(BriefCardDestination(cardId = item.id))` — **`RecordItem` 통째로 넘기고 그래프에서 `item.id`만 꺼낸다** |
| `onStartIntakeClick` | `() -> Unit` | 빈 상태 `증상 정리하기` | `navigate(IntakeDestination())` |
| `onEditStart` | `() -> Unit` | Nav 우측 `편집` | `viewModel::onEditStart` |
| `onEditCancel` | `() -> Unit` | Nav 우측 `취소` | `viewModel::onEditCancel` |
| `onSelectChange` | `(String, Boolean) -> Unit` | 행 누름(편집 모드) · 체크박스 | `viewModel::onSelectChange` |
| `onDeleteClick` | `() -> Unit` | 하단 `삭제` / `N장 삭제` | `viewModel::onDeleteClick` |
| `onDeleteConfirm` | `() -> Unit` | 대화상자 `삭제` | `viewModel::onDeleteConfirm` |
| `onDeleteDismiss` | `() -> Unit` | 대화상자 `취소` / 바깥 누름 | `viewModel::onDeleteDismiss` |
| `onRetryClick` | `() -> Unit` | 실패 화면 `다시 시도` | `viewModel::load` |

목적지 함수(`briefCardListDestination`)가 그래프에서 받는 것은 셋뿐이다 — `onCardClick(cardId: String)` · `onStartIntakeClick` · `onExit`. 나머지 일곱은 화면 안에서 ViewModel로 닫힌다.

**주의 — `onActionClick`은 Loading·Failed·빈 목록에서도 넘어간다.** 화면이 `onActionClick = if (editing) onEditCancel else onEditStart`를 **무조건** 넘기고, 액션이 안 보이는 것은 `actionLabel`이 null이기 때문이다(`navActionLabel`). 웹에서 라벨과 핸들러를 따로 두면 라벨 없이 눌리는 영역이 생길 수 있다 — **라벨이 null이면 버튼 자체를 그리지 않는다.**

### 12.3 레이아웃 (위→아래)

```
┌─ Column (fillMaxSize, bg/surface) ────────────────────────────┐
│ [1] MedicalMateNavBar (OPAQUE 기본)                            │
│     leading: 뒤로 │ title: "브리핑 카드" │ action: 편집/취소     │
├───────────────────────────────────────────────────────────────┤
│ [2] 본문 weight(1)                                             │
│   Loading  → MedicalMateLoadingSpinner                        │
│   Failed   → EmptyState(NO_RESULT) + "다시 시도"               │
│   Content & groups.isEmpty() → EmptyState(NO_RECORD) + "증상 정리하기" │
│   Content & 아니면 → GroupList (LazyColumn)                    │
├───────────────────────────────────────────────────────────────┤
│ [3] 편집 중일 때만 DeleteBar (MedicalMateBottomCtaBar)          │
│     [삭제] 또는 [N장 삭제]  DANGER, enabled = count > 0        │
└───────────────────────────────────────────────────────────────┘
  + deleteRequested 이면 MedicalMateDialog 오버레이
```

`LazyColumn` contentPadding: `start/end = gutter 20, top 12, bottom 16`, 항목 간격 10.

`MedicalMateBottomCtaBar` 규격: 위 12 + L 버튼 56 + 아래 안전 여백 24 = 높이 92, 좌우 gutter 20, 자식 간격 10, 표면 OPAQUE(`bg/surface`) + `Elevation/Float` 4dp 그림자.

### 12.4 Nav 우측 액션

| 조건 | 라벨 | 동작 |
|---|---|---|
| `content == null` (Loading/Failed) 또는 `groups.isEmpty()` | **없음(null)** | 목록이 비면 편집을 두지 않는다 — 지울 것이 없는데 들어갈 수 있으면 안 된다 |
| `editing` | `취소` | `onEditCancel` |
| 그 외 | `편집` | `onEditStart` |

### 12.5 묶음 머리(`GroupHeader`)

`MedicalMateSectionHeader(title = group.monthLabel, caption = ...)` — **캡션은 누를 수 없는 표시**라 `actionLabel`이 아니라 `caption` 슬롯(`Body/M Strong` 15, `fg/subtle`)을 쓴다.

| 모드 | 캡션 |
|---|---|
| 읽기 | `%1$d장` — `group.items.size` (예: `2장`) |
| 편집 | `%1$d장 선택됨` — **그 달에서 고른 수** (예: `1장 선택됨`) |

시안 1j-4-D2가 묶음 머리에 "1장 선택됨"을 두고 하단 버튼이 전체 수("2장 삭제")를 든다. **목록 위에 `Select Bar`를 두지 않는다** — 그 줄이 시안에 없고, 같은 수를 세 곳에서 말하게 된다.

> 기록(1j-1)은 "건", 카드(1j-4)는 "장"으로 센다. 기록 쪽은 하단 버튼 글자에만 적어서 두 화면이 같은 조작을 다르게 알리고 있고, 소스 주석이 이를 디자인 트랙 확인 항목으로 남겼다.

### 12.6 행 구조 (`RecordRow`)

**`MedicalMateListRow`도 `MedicalMateCard`도 쓰지 않는다.** 마스터 `List Row`(`335:1114`)의 겉모양을 직접 그린다.

- 겉: `fillMaxWidth` + 그림자 `Elevation/Card` 3dp(`ShadowTint`) + 면 `bg/surface` + 반경 16(`radius/md`) + clip + clickable.
- 안쪽 여백: **좌 18 / 우 14 / 위아래 16**. 오른쪽이 더 좁은 이유는 chevron·체크가 48 영역을 갖고 있어서다.
- 선택된 줄에는 **1.5dp `border/focus`** 테두리. 체크 표시 하나만으로는 목록을 훑을 때 눈에 안 들어온다.
- 시안 높이: 읽기 104, 편집 80. (`MedicalMateCard`를 쓰면 최소 높이 116 + 여백 20이 강제돼서 글 아래가 비어 한 줄 빠진 것처럼 보인다 — 그래서 안 쓴다.)

```
Row(fillMaxWidth, spacedBy 8, CenterVertically)
 ├ [편집 중] MedicalMateCheckbox(checked, label = null, padding end 4)
 ├ RowText(weight 1)
 │   ├ Row(spacedBy 6, CenterVertically)
 │   │    ├ Text(item.title)  Heading/S 17 SemiBold, fg/default
 │   │    └ MedicalMateBadge(라벨/톤은 status)
 │   ├ Text(item.meta)   Body/S 13, fg/subtle
 │   ├ [읽기만] item.detail?      Body/S 13, fg/subtle
 │   └ [읽기만] item.resumeLabel? Body/S 13, fg/warning
 └ [읽기만] Icon(ChevronRight, fg/muted)
```

- 제목과 배지는 간격 **6**으로 한 줄에 묶는다(마스터 `Title Row`). 오른쪽 끝에 두지 않는다 — chevron과 나란히 서면 누르는 것으로 보이고, 제목이 길어지면 어느 줄의 상태인지 흐려진다.
- 글자 묶음 안쪽 간격은 4.
- **편집 중에는 마지막 줄(detail / resumeLabel)을 감춘다.** 시안이 편집에서 줄 높이를 104→80으로 낮춘 것이 이 한 줄만큼이다. 고르는 동안에는 어느 기록인지만 알아보면 된다.
- **편집 중에는 chevron을 빼고 체크만 둔다.** 누르면 고르는 것이지 들어가는 것이 아니다.
- 체크박스: 24 상자, 반경 8, 미선택은 1.5dp `border/strong` 테두리, 선택은 `bg/primary` 채움. **`label = null`이라 행 전체가 hit area가 아니고 상자만 토글 가능** — 대신 행 자체의 `clickable`이 같은 `onClick`을 부르므로 실사용은 행 전체가 먹는다.

행 클릭 동작:

```
onClick = { if (selected == null) onItemClick(item) else onSelectChange(item.id, !selected) }
```

즉 읽기 모드면 이동, 편집 모드면 선택 토글. 체크박스의 `onCheckedChange`도 **같은 `onClick`을 부른다**(별도 핸들러가 아니다) — 상자를 눌러도 행을 눌러도 결과가 같다.

소스에서 추가로 확인한 것:

- `selected`는 `Boolean?`이다. `selectedIds == null` → `selected == null` → **편집이 아님**. `selectedIds != null`이면 `contains` 결과가 들어가 `true`/`false`가 된다. 웹도 3상태(`null` / `false` / `true`)로 두는 편이 분기가 한 겹 줄어든다.
- `LazyColumn` 키: 묶음 머리는 `item(key = group.monthLabel)`, 행은 `items(key = { it.id })`. 웹의 `key` prop도 **월 라벨과 카드 id**로 맞춘다 — 삭제 후 재정렬에서 행이 뒤섞이지 않는다.
- 제목 `Text`에는 `weight(1f)`도 `maxLines`도 **없다**. 제목이 길면 배지가 밀린다. 목록 제목은 매핑에서 24자로 잘려 오므로(§14.4) 실제로는 잘 드러나지 않지만, 웹에서 잘림 규칙을 빼면 바로 드러난다.
- `RowText`의 편집 분기는 `if (editing) return@Column` — **`detail`과 `resumeLabel` 두 줄을 한꺼번에** 끊는다.

### 12.7 행 배지 문구·톤

| `RecordItem.Status` | 문구 | tone | 색 |
|---|---|---|---|
| `DRAFT` | `작성 중` | `WARNING` | 면 `bg/warning` #FFF4D6, 글자 `fg/warning` #8A5A0B |
| `BEFORE_VISIT` | `진료 전` | `BRAND` | 면 `bg/primary-subtle` #E3E7FC, 글자 `fg/primary` #2E3E9E |
| `CONFIRMED` | `진료 완료` | `SUCCESS` | 면 `bg/success` #E4F7ED, 글자 `fg/success` #0E7A4A |

> 1e-1의 카드 머리 배지는 2갈래(`진료 전` NEUTRAL / `진료 완료` SUCCESS)이고 1j-4 행 배지는 3갈래다. **같은 문구 `진료 전`이 두 화면에서 다른 톤**(NEUTRAL vs BRAND)이라는 점에 주의.

### 12.8 편집·선택·삭제 흐름

| 조작 | 상태 변화 | 서버 |
|---|---|---|
| Nav `편집` | `selectedIds = emptySet()` | — |
| Nav `취소` | `selectedIds = null, deleteRequested = false` | — |
| 행 누름(편집 중) | `selectedIds`에서 추가/제거 (`selectedIds == null`이면 아무 일 없음) | — |
| 하단 `삭제`/`N장 삭제` | `selectedCount == 0`이면 **아무 일 없음**, 아니면 `deleteRequested = true` | — |
| 대화상자 `취소` | `deleteRequested = false` (고른 것은 남는다) | — |
| 대화상자 `삭제` | 아래 참조 | `DELETE /api/cards/{id}` × N |

`onDeleteConfirm()`:
1. `ids = selectedIds`. 비어 있으면 return.
2. `deleteRequested = false`.
3. `repository.deleteAll(ids)` — **한 번에 지우는 API가 없어 한 장씩 부른다.** 일부가 실패해도 나머지는 계속 지운다. 반환값은 **실제로 지워진 id만**.
4. `content.without(gone).copy(selectedIds = null)` — 지워진 것만 각 묶음에서 제거하고, **항목이 비게 된 묶음은 함께 사라지고**, 편집 모드에서 빠져나온다.

안 지워진 것은 목록에 남긴다. 실패한 것을 함께 빼면 지워지지 않은 카드가 지워진 것처럼 보이고, 다시 열었을 때 되살아난 것으로 읽힌다.

> 실패한 장수에 대한 사용자 피드백이 **없다**. 웹 보완 후보.

하단 버튼 라벨:

| `selectedCount` | 라벨 | enabled |
|---|---|---|
| 0 | `삭제` | `false` |
| N > 0 | `%1$d장 삭제` (예: `2장 삭제`) | `true` |

삭제 확인 대화상자 문구:

| 슬롯 | 문구 |
|---|---|
| title | `브리핑 카드 %1$d장을 삭제할까요?` (`selectedCount`) |
| message | `연결된 진료 기록은 남고 선택한 카드는 사라져요.` |
| confirmLabel | `삭제` |
| dismissLabel | `취소` (`brief_card_list_edit_cancel` 재사용) |

### 12.9 1j-4 로딩 / 빈 / 실패 상태

| 상태 | 보이는 것 | 문구 |
|---|---|---|
| `Loading` | `MedicalMateLoadingSpinner` (weight 1) | — |
| `Failed` | `MedicalMateEmptyState(NO_RESULT)` + 액션 | title `카드를 불러오지 못했어요` / desc `인터넷 연결을 확인하고 다시 시도해주세요` / action `다시 시도` → `load()` |
| `Content` & `groups.isEmpty()` | `MedicalMateEmptyState(NO_RECORD)` + 액션 | title `아직 브리핑 카드가 없어요` / desc `증상을 정리해두면 진료실에서 바로 보여줄 수 있어요` / action `증상 정리하기` → `IntakeDestination()` |

빈/실패 컨테이너: `fillMaxWidth().weight(1f).padding(horizontal = gutter 20)`, 가로 가운데 정렬.

- 빈 상태와 실패 상태를 **분리**한다. 실패에만 `다시 시도`가 있고, 빈 상태는 다음 행동(`증상 정리하기`)을 준다.
- 빈 상태·실패 상태에서는 Nav 우측 편집 액션이 **없다**.
- 아이콘: `NO_RECORD` → `EmptyBox`, `NO_RESULT` → `SearchOff`.

### 12.10 월 묶음과 날짜 포맷

```
GET /api/me/cards  (서버가 최근 작성 순으로 준다)
  → groupBy { writtenOn.format("yyyy년 M월") }        // Locale.KOREAN
  → RecordGroup(monthLabel, items.map { toRow() })
```

- **서버 순서를 다시 세우지 않는다.** 같은 달끼리 이어 붙이기만 한다. 월별 묶기는 화면이 한다(서버가 묶어 주면 기준을 바꿀 때마다 배포해야 한다).
- 월 라벨 포맷: `yyyy년 M월` (월은 앞 0 없음 → `2026년 9월`).
- 행 메타의 날짜 포맷: `MM.dd` (앞 0 있음 → `09.04`).
- 메타 조립: `listOf("{MM.dd} 작성", clinic ?: "병원 미정").joinToString(" · ")` → `09.04 작성 · 서울OO병원 내과` 또는 `08.21 작성 · 병원 미정`.

### 12.11 1j-4 네비게이션

| 방향 | 트리거 | 목적지 |
|---|---|---|
| 들어옴 | 홈 · "최근 브리핑 카드 · 전체 보기" | `BriefCardListDestination` |
| 들어옴 | 1e-1에서 카드 삭제 성공 | `BriefCardListDestination` (`popUpTo<Home>` 유지) |
| 나감 | Nav 좌측 뒤로 | `popBackStack()` |
| 나감 | 행 누름(편집 아닐 때) | `BriefCardDestination(cardId = item.id)` |
| 나감 | 빈 상태 `증상 정리하기` | `IntakeDestination()` |
| 이동 없음 | 편집 / 취소 / 선택 / 삭제 | 화면 안에서 처리 |

라우트 파라미터 **없음**(`data object BriefCardListDestination`). 진입 시 `LaunchedEffect(Unit) { viewModel.load() }` — 즉 **화면에 들어올 때마다 새로 읽는다**(1e-1과 반대).

---

## 13. API — 메서드 · 경로 · 요청 · 응답

`CardApi.kt` 기준. base는 `/v3/api-docs`의 `/api/cards`, `/api/me/cards`.

| # | 메서드 | 경로 | 요청 본문 | 응답 | 부르는 곳 |
|---|---|---|---|---|---|
| 1 | `POST` | `/api/sessions/{sessionId}/card` | `GenerateCardRequest` | `CardResponse` | 1e-1 진입 시 `cardId == null && sessionId != null` |
| 2 | `GET` | `/api/me/cards` | — | `List<CardSummaryResponse>` | 1j-4 `load()` |
| 3 | `GET` | `/api/cards/{cardId}` | — | `CardResponse` | 1e-1 진입 시 `cardId != null` |
| 4 | `PATCH` | `/api/cards/{cardId}` | `UpdateCardRequest` | `CardResponse` | `확인`, 병원 `변경` |
| 5 | `DELETE` | `/api/cards/{cardId}` | — | (본문 없음) | 1e-1 삭제, 1j-4 일괄 삭제 |
| 6 | `POST` | `/api/cards/{cardId}/confirm` | — | `CardResponse` | 하단 `저장하기` |

### 13.1 요청 DTO

`GenerateCardRequest`

| 필드 | 타입 | 기본값 | 설명 |
|---|---|---|---|
| `clinic` | `ClinicRequest?` | `null` | 1m-B에서 골랐으면 동봉, 건너뛰었으면 **빈 본문**. 안 보내면 병원 없이 만들어진다 |

`UpdateCardRequest` — **보낸 필드만 바뀐다. 건드리지 않은 것은 `null`로 두어 직렬화에서 빠지게 한다.**

| 필드 | 타입 | 기본값 | 앱이 실제로 보내는지 |
|---|---|---|---|
| `chiefComplaint` | `String?` | `null` | **안 보낸다** (제목은 고칠 수 없다 — 서버가 받지 않는다) |
| `axes` | `List<AxisEditRequest>?` | `null` | 바뀐 축만. 빈 목록이면 `takeIf { it.isNotEmpty() }`로 **null 처리해 아예 안 보낸다** |
| `questions` | `List<String>?` | `null` | **항상 보낸다** (편집이든 병원 변경이든) |
| `patientNotes` | `List<String>?` | `null` | **안 보낸다** |
| `clinic` | `ClinicRequest?` | `null` | 병원 `변경`일 때만 |

`ClinicRequest`

| 필드 | 타입 | 설명 |
|---|---|---|
| `name` | `String` | 필수 |
| `address` | `String?` | 선택 |

`AxisEditRequest`

| 필드 | 타입 | 예 |
|---|---|---|
| `axis` | `String` | `"onset"` |
| `value` | `String` | `"3주 전"` |

서버가 받는 모양: `{"axes":[{"axis":"onset","value":"3주 전"}]}`

### 13.2 응답 DTO

`CardResponse` (상세)

| 필드 | 타입 | 기본값 | 설명 |
|---|---|---|---|
| `cardId` | `Long` | — | 필수 |
| `status` | `String?` | `null` | `DRAFT` / `CONFIRMED` |
| `version` | `Int` | `1` | 확정 뒤 수정할 때마다 오른다 |
| `parentCardId` | `Long?` | `null` | 이어받은 앞 카드 |
| `sessionId` | `Long?` | `null` | |
| `patient` | `PatientResponse?` | `null` | 카드 머리의 환자 + 건강 정보 |
| `title` | `String?` | `null` | **아직 서버가 내려주지 않는다** |
| `chiefComplaint` | `String?` | `null` | 환자가 말한 원문. 제목 자리를 대신한다 |
| `axes` | `Map<String, AxisResponse>` | `emptyMap()` | **8축이 늘 자리를 차지한다** |
| `redFlags` | `List<String>` | `emptyList()` | **카드 화면에서 안 씀** |
| `patientNotes` | `List<String>` | `emptyList()` | **카드 화면에서 안 씀** |
| `questions` | `List<String>` | `emptyList()` | 묻고 싶은 것 |
| `departmentGuidance` | `DepartmentGuidanceResponse?` | `null` | **카드 화면에서 안 씀** |
| `completeness` | `Double?` | `null` | 안 씀 |
| `minimallyComplete` | `Boolean` | `false` | 안 씀 |
| `rejectedFields` | `List<String>` | `emptyList()` | 검증에 걸려 저장되지 않은 필드 이름. **만들기 자체는 성공한다** |
| `createdAt` | `String?` | `null` | ISO offset. `writtenOn`·`patientLine`이 읽는다 |
| `confirmedAt` | `String?` | `null` | 안 씀 |
| `clinic` | `ClinicResponse?` | `null` | **진료받을 병원. 응답에 병원이 셋인데 이것만 쓴다** (`appointment`=일정의 병원, `visit`=진료받은 병원) |
| (없음) | `visited` | — | **상세 응답에는 없다.** 그래서 `BriefCard.visited`가 늘 false |

`CardSummaryResponse` (목록) — **본문이 없다.**

| 필드 | 타입 | 기본값 | 설명 |
|---|---|---|---|
| `cardId` | `Long` | — | |
| `clinic` | `ClinicResponse?` | `null` | 진료받을 병원 |
| `title` | `String?` | `null` | **아직 null.** 목록 제목은 `chiefComplaint`를 쓴다 |
| `chiefComplaint` | `String?` | `null` | 환자가 말한 원문이라 길 수 있다 |
| `status` | `String?` | `null` | `CONFIRMED` 비교용 |
| `visited` | `Boolean` | `false` | **진료 완료 배지의 기준** |
| `clinicName` | `String?` | `null` | 진료를 **받은** 병원(진료 기록에서 옴). `clinic`과 다른 축 |
| `createdAt` | `String` | — | 필수. ISO offset |
| (없음) | 주소 | — | `CardSummary`에 주소가 없어 여기서 연 카드는 병원 이름뿐 |

`ClinicResponse`: `name: String?` / `address: String?` (둘 다 nullable)

`AxisResponse`

| 필드 | 타입 | 기본값 | 설명 |
|---|---|---|---|
| `axis` | `String?` | `null` | |
| `status` | `String?` | `null` | `NOT_ASKED` · `FILLED` · `UNKNOWN` · `SKIPPED` · `AMBIGUOUS`. 1턴째는 대부분 `NOT_ASKED` |
| `value` | `String?` | `null` | |
| `evidence` | `List<String>` | `emptyList()` | 환자가 실제로 한 말. **카드 화면에서 안 씀** |
| `source` | `String?` | `null` | 안 씀 |

`PatientResponse`

| 필드 | 타입 | 기본값 |
|---|---|---|
| `name` | `String?` | `null` |
| `age` | `Int?` | `null` |
| `sex` | `String?` | `null` (`"FEMALE"` / `"MALE"`) |
| `allergies` | `CardTextFieldResponse?` | `null` |
| `medications` | `CardListFieldResponse?` | `null` |
| `conditions` | `CardListFieldResponse?` | `null` |

`CardTextFieldResponse`: `status: String?` / `text: String?` — `KNOWN`일 때만 값이 있다. `NONE`은 없다고 답한 것, `UNKNOWN`은 모른다는 것.
`CardListFieldResponse`: `status: String?` / `items: List<String> = emptyList()`

`DepartmentGuidanceResponse`: `departments: List<String>` / `source: String?` — 이 화면에서는 안 쓰지만, 쓰게 되면 `source`("의료인 자문 확인 전")를 함께 보여야 하고 "추천"이라는 말은 쓰지 않는다.

### 13.3 오류 처리

`ApiResult` 3갈래: `Success(value)` / `Rejected(code, message, requestId, retryable, details)` / `NetworkUnavailable(cause)`.

카드 화면은 `Rejected`와 `NetworkUnavailable`을 **구분하지 않는다** — 둘 다 `saveFailed = true` 또는 `Failed`다. 유일한 예외가 `ApiErrorCode.CARD_ALREADY_EDITED`(409)이고, `details.latestCardId`(JSON number)를 읽어 한 번 재시도한다.

---

## 14. CardMapping — 서버 DTO ↔ UI 모델 필드 대응표

**웹앱 목데이터 설계의 기준이 되는 표다.** 이 파일만 갈아 끼우면 서버 계약 변화를 흡수하도록 한 곳에 모여 있다(실제로 2026-09-11에 서버가 고정 필드에서 `axes` 맵으로 바뀌었을 때 이 파일만 고쳤다).

### 14.1 `CardResponse` → `BriefCard`

| `BriefCard` 필드 | 소스 | 변환 규칙 |
|---|---|---|
| `id` | `cardId` | `cardId.toString()` |
| `title` | `title` → `chiefComplaint` | `title ?: chiefComplaint.orEmpty()` (둘 다 없으면 `""`) |
| `status` | `status` | `== "CONFIRMED"` → `CONFIRMED`, 그 외(`DRAFT`·null 포함) → `BEFORE_VISIT` |
| `patientLine` | `patient.name`, `patient.age`, `patient.sex`, `createdAt` | `listOfNotNull(name, "${age}세 ${성별}".trim(), "${createdAt→yyyy.MM.dd} 작성").joinToString(" · ")` — **null인 조각은 빠지고 구분자도 함께 빠진다** |
| `items` | `axes` | §14.2 |
| `severity` | `axes["severity"]` | §14.3 |
| `health` | `patient.medications`, `patient.conditions` | §15 |
| `allergies` | `patient.allergies` | §15 |
| `questions` | `questions` | 그대로 |
| `hospital` | `clinic` | `name`이 blank가 아니면 `BriefCardHospital(name, address?.takeIf{ notBlank })`, 아니면 `null` |
| `writtenOn` | `createdAt` | `OffsetDateTime.parse(createdAt).toLocalDate()`, `createdAt`이 null이면 null |
| `visited` | — | **매핑 없음 → 기본값 `false`** (상세 응답에 필드가 없다) |

성별 라벨: `"FEMALE"` → `여`, `"MALE"` → `남`, 그 외/null → `""`(그래서 `"32세 "`가 되지 않도록 `.trim()`이 붙어 있다).

작성일 포맷: `yyyy.MM.dd` (Locale.KOREAN) → `2026.09.04 작성`.

### 14.2 `axes: Map<String, AxisResponse>` → `items: List<BriefCardItem>`

차례는 **서버가 준 순서가 아니라 `AXIS_ORDER`**다(맵이라 순서가 보장되지 않고, 카드에서 부위가 먼저 오는 것은 읽는 차례의 문제).

| 순서 | 축 id | `key`(줄 이름) |
|---|---|---|
| 1 | `site` | `부위` |
| 2 | `onset` | `시작` |
| 3 | `character` | `양상` |
| 4 | `radiation` | `뻗치는 곳` |
| 5 | `associated` | `동반증상` |
| 6 | `time_course` | `경과` |
| 7 | `exacerbating_relieving` | `심해질 때` |
| (제외) | `severity` | `강도` — 줄이 아니라 눈금으로 간다 |
| (그 외) | 모르는 축 id | 축 id 그대로 |

값 변환 (`AxisResponse.status` 기준):

| `status` | `value` | 결과 |
|---|---|---|
| `FILLED` | 있음 | `value` 그대로 (null이면 `""`) |
| `UNKNOWN` | — | **`잘 모르겠어요`** (고정 문구) |
| `AMBIGUOUS` | 있음 | `"{value} (확실하지 않아요)"` |
| `AMBIGUOUS` | 없음 | `잘 모르겠어요` |
| `NOT_ASKED` · `SKIPPED` · 그 외 · null | — | **줄을 만들지 않는다** |
| (맵에 축 자체가 없음) | — | **줄을 만들지 않는다** |

- **아직 묻지 않은 축은 줄을 만들지 않는다.** 8축이 늘 자리를 차지하고 1턴째는 대부분 `NOT_ASKED`라, 그대로 그리면 빈 줄 여덟 개가 먼저 보인다.
- **건너뛴 축도 같다.** 환자가 넘어가기로 한 것을 카드에 남길 이유가 없다.
- **`UNKNOWN`은 남긴다.** 확인하지 못했다는 것이 의사에게는 정보다.
- 만들어진 `BriefCardItem`의 `axis`에는 축 id가 그대로 들어간다. `emphasized`는 **매핑에서 설정하지 않는다 → 항상 false**. (강조는 AI가 정한다고 문서에 적혀 있지만 현재 매핑 코드는 이를 채우지 않는다. 웹 목데이터에서는 필요하면 수동으로 한 줄만 true로 둔다.)

### 14.3 `axes["severity"]` → `severity: MedicalMateSeverity?`

```
if (status != "FILLED") return null
level = Regex("\\d+").find(value ?: "")?.value?.toIntOrNull()
return MedicalMateSeverity.entries.firstOrNull { it.level == level }   // 1~5 밖이면 null
```

- 값이 `"3 (꽤 아파요)"`처럼 숫자와 낱말이 함께 온다. **앞의 숫자만 읽는다.** 낱말은 화면이 단계 정의에서 가져온다 — 문자열을 맞춰 보면 서버가 표현을 바꿀 때마다 갈린다.
- 1~5 밖이거나 숫자가 없으면 그리지 않는다. 눈금은 다섯 단계뿐이고, 모르는 값을 억지로 한 단계에 끼우면 환자가 고른 것과 다른 색이 나온다.

### 14.4 `CardSummaryResponse` → `CardListItem`

| `CardListItem` 필드 | 소스 | 규칙 |
|---|---|---|
| `id` | `cardId` | `cardId.toString()` |
| `title` | `title` → `chiefComplaint` | `(title ?: chiefComplaint)?.shorten().orEmpty()` — **24자 초과 시 `take(24).trimEnd() + "…"`** |
| `confirmed` | `status` | `status == "CONFIRMED"` |
| `visited` | `visited` | 그대로 |
| `clinic` | `clinic.name` → `clinicName` | `clinic?.name?.takeIf { it.isNotBlank() } ?: clinicName` — **`clinic`(진료받을 병원) 우선**, 없으면 `clinicName`(진료받은 병원) |
| `writtenOn` | `createdAt` | `OffsetDateTime.parse(createdAt).toLocalDate()` (필수 필드라 null 처리 없음) |

목록 제목을 줄이는 이유: 목록의 줄은 한 줄짜리라 넘치면 잘리기만 하고 무엇인지 알 수 없게 된다. `TITLE_MAX = 24`.

### 14.5 `CardListItem` → `RecordItem` (1j-4 행)

| `RecordItem` 필드 | 규칙 |
|---|---|
| `id` | `id` |
| `cardId` | 설정 안 함 → `null` |
| `title` | `title` |
| `status` | `visited` → `CONFIRMED` / `confirmed` → `BEFORE_VISIT` / 그 외 → `DRAFT` (**우선순위 순서 그대로**) |
| `clinic` | `clinic` |
| `meta` | `"{writtenOn→MM.dd} 작성" + " · " + (clinic ?: "병원 미정")` |
| `detail` | 설정 안 함 → `null` (목록 응답에 본문이 없다) |
| `resumeLabel` | 설정 안 함 → `null` |

---

## 15. CardHealth — 건강 정보 변환 규칙

`PatientResponse` → 카드 안의 복용약·기저질환 줄 + 카드 밖 알러지 목록.

```
PatientResponse?.toHealthRows(): List<BriefCardItem> =
  listOfNotNull(medications.toRow("복용약"), conditions.toRow("기저질환"))
```

| 소스 | 만들어지는 `BriefCardItem` | 조건 |
|---|---|---|
| `patient.medications: CardListFieldResponse?` | `key = "복용약"`, `value = items.joinToString(" · ")`, `axis = null`, `emphasized = false` | `known(status, items.isNotEmpty())` 이고 `items`가 비지 않았을 때 |
| `patient.conditions: CardListFieldResponse?` | `key = "기저질환"`, 같은 방식 | 같음 |

```
CardTextFieldResponse?.toAllergies(): List<String> =
  text.orEmpty().split(",").map(String::trim).filter(String::isNotEmpty)
    .let { if (known(status, it.isNotEmpty())) it else emptyList() }
```

`known(status, hasValue)` 판정:

| `status` | 결과 |
|---|---|
| `null` (서버가 상태를 빼고 보냄) | **값이 있으면 있는 것으로 본다** |
| `"KNOWN"` | true |
| `"NONE"` · `"UNKNOWN"` · 그 외 | false |

- 서버가 `"medications":{"items":[]}`처럼 `status` 없이 보내는 것을 기기 로그에서 확인했다. 그때 상태만 보고 자르면 값이 있는데도 줄이 사라진다.
- **적은 것이 없으면 줄을 만들지 않는다.** "없어요"와 "잘 모르겠어요"를 카드에 적지 않는다 — 진료실에서 읽는 사람에게 필요한 것은 무엇을 먹고 있느냐이고, 비어 있다는 사실은 그 자리에 아무것도 없는 것으로 충분히 전해진다.
- 알러지는 저장할 때 쉼표로 이어 보낸 그대로 오므로 쉼표로 나눈다. 복용약·기저질환은 이미 배열이고 화면에서는 ` · `로 합친다.
- **알러지만 카드 밖 경고로 나가고 나머지 둘은 카드 안 줄이다.** 처방을 바꾸는 값이라 다른 정보와 같은 무게로 두지 않는다.

---

## 16. 화면별 디자인 시스템 컴포넌트 목록

### 16.1 `BriefCardScreen` (1e-1 / 1e-1-E)

| 컴포넌트 | 어디에 |
|---|---|
| `MedicalMateNavBar` | 상단 (surface = `GLASS`) |
| `MedicalMateSurfaceStyle` | NavBar 표면 지정 |
| `MedicalMateLoadingSpinner` | `Loading` |
| `MedicalMateEmptyState` + `MedicalMateEmptyStateType.NO_RESULT` | `Failed` |
| `MedicalMateCard` | 카드 본체 컨테이너 (`BriefCardBlock`) |
| `MedicalMateDivider` | 카드 머리 아래 |
| `MedicalMateBadge` + `MedicalMateBadgeTone` | 카드 머리 상태 배지 |
| `MedicalMateKvRow` + `MedicalMateKvRowType` | 항목·건강 정보 줄 |
| `MedicalMateEditingKvRow` + `MedicalMateRowDelete` | 편집 모드 항목 줄 |
| `MedicalMateSeverityReadout` + `MedicalMateSeverity` | 통증 강도 |
| `MedicalMateTooltip` | AI 캡션 옆 |
| `MedicalMateNotice` + `MedicalMateNoticeTone.WARNING` | 알러지 경고 |
| `MedicalMateCallout` + `MedicalMateCalloutEdit` | 묻고 싶은 것 |
| `MedicalMateAddRow` | (Callout 내부) `질문 추가` |
| `MedicalMateIconButton` + `MedicalMateIconButtonSize.S` | (내부) 항목·질문 삭제 × |
| `MedicalMateSectionHeader` | `진료받을 병원` + `변경` |
| `MedicalMateHospitalCard` | 병원 표시 |
| `MedicalMateButton` + `MedicalMateButtonType.DANGER` / 기본(PRIMARY) | 하단 CTA |
| `MedicalMateDialog` | 삭제 확인 |
| 토큰: `MedicalMateTheme`, `MedicalMateRadius`, `MedicalMateSize`, `MedicalMateSpace` | 전반 |

### 16.2 `BriefCardListScreen` (1j-4)

| 컴포넌트 | 어디에 |
|---|---|
| `MedicalMateNavBar` | 상단 (surface 기본 `OPAQUE`) |
| `MedicalMateLoadingSpinner` | `Loading` |
| `MedicalMateEmptyState` + `NO_RESULT` / `NO_RECORD` | 실패 / 빈 목록 |
| `MedicalMateSectionHeader` | 묶음 머리(월 + 개수 캡션) |
| `MedicalMateBadge` + `MedicalMateBadgeTone` | 행 상태 배지 |
| `MedicalMateCheckbox` | 편집 중 행 선택 |
| `MedicalMateBottomCtaBar` | 편집 중 하단 |
| `MedicalMateButton` + `MedicalMateButtonType.DANGER` | `삭제` / `N장 삭제` |
| `MedicalMateDialog` | 삭제 확인 |
| 토큰: `MedicalMateElevation`, `MedicalMateIcons.ChevronRight`, `MedicalMateRadius`, `ShadowTint` | 행 겉모양 |

### 16.3 참고 — 같은 블록을 쓰는 다른 화면

`AllergyNotice`와 `QuestionsCallout`, `MedicalMateSeverityReadout`은 **기록 상세(1j-3)의 `카드 전체 보기` 펼침**(`RecordDetailStep.kt`의 `ExpandedCard`)에서도 쓰인다. 같은 카드를 다른 자리에서 보는 것이라 모양이 갈리면 안 된다. `BriefCardBlock` 자체는 `BriefCardScreen`만 쓴다(`showAiCaption` 파라미터는 진료실 화면 1f-1을 위한 자리였고 현재 호출자가 없다).

주의: 기록 상세의 요약 줄은 `MedicalMateKvRow`를 **쓰지 않는다** — 그쪽은 키 폭 52에 값이 `Body/M`이고, 브리핑 카드는 키 폭 72에 값이 `Body/L`이다.

---

## 17. 디자인 토큰 (웹 CSS 변수로 옮길 값)

### 17.1 이 두 화면에 쓰이는 색 (Light)

| 토큰 | HEX | 쓰이는 곳 |
|---|---|---|
| `bg/surface` | `#FFFFFF` | 화면 바탕, 카드 면, 행 면, NavBar |
| `bg/canvas` | `#F5F6FA` | (이 화면은 안 씀 — 참고) |
| `bg/subtle` | `#EDEFF5` | NEUTRAL 배지 면 |
| `bg/primary` | `#5566D2` | 질문 번호 원, 체크박스 채움, 스피너 |
| `bg/primary-subtle` | `#E3E7FC` | Callout 면, BRAND 배지 면 |
| `bg/primary-faint` | `#F2F4FE` | HospitalCard 아이콘 상자 |
| `bg/success` | `#E4F7ED` | SUCCESS 배지 면 |
| `bg/warning` | `#FFF4D6` | 알러지 Notice 면, WARNING 배지 면 |
| `bg/danger` | `#FFEDEB` | Dialog 아이콘 배지 |
| `fg/default` | `#131722` | 제목·값 |
| `fg/subtle` | `#585F73` | 환자줄, 키, 메타, 본문 |
| `fg/muted` | `#7C8397` | chevron |
| `fg/on-primary` | `#FFFFFF` | 질문 번호 글자 |
| `fg/primary` | `#2E3E9E` | Callout 헤더, `질문 추가`, 병원 아이콘 |
| `fg/link` | `#2E3E9E` | SectionHeader `변경` |
| `fg/success` | `#0E7A4A` | `진료 완료` |
| `fg/warning` | `#8A5A0B` | 알러지 아이콘·제목, `작성 중` |
| `fg/danger` | `#C4302B` | `저장하지 못했어요...` |
| `border/subtle` | `#DEE1EB` | Divider, NavBar 하단선 |
| `border/strong` | `#7C8397` | 편집 밑줄, 체크박스 미선택 테두리 |
| `border/focus` | `#5566D2` | 편집 카드 테두리(2dp), 선택 행 테두리(1.5dp), 커서 |
| severity 1~5 | `#FFE3A8` `#FFC79B` `#FFA894` `#F58079` `#DC5A55` | 강도 칩 |
| ShadowTint | `#1B255A` | 카드·행 그림자 |

### 17.2 타이포그래피 (Pretendard)

| 스타일 | 크기/굵기/행간/자간 | 이 화면에서 |
|---|---|---|
| `Heading/M` | 20 SemiBold / 28 / -1.5% | 카드 제목, SectionHeader 제목, EmptyState 제목 |
| `Heading/S` | 17 SemiBold / 24 / -1.0% | NavBar 제목, 목록 행 제목 |
| `Body/L` | 17 Regular / 26 / 0 | KV 값(기본·편집) |
| `Body/L Strong` | 17 SemiBold / 26 / 0 | KV 값(강조), 강도 낱말, 병원 이름, NavBar 액션, `질문 추가` |
| `Body/M` | 15 Regular / 24 / 0 | KV 키, 질문 본문, EmptyState 설명 |
| `Body/M Strong` | 15 SemiBold / 24 / 0 | SectionHeader 액션·캡션, Notice 제목, 강도 칩 숫자 |
| `Body/S` | 13 Regular / 20 / 0 | 환자줄, 메타, AI 캡션, NRS, 주소, Notice 본문, `저장하지 못했어요...` |
| `Label/S` | 11 Medium / 16 / +2% | 배지, Callout 헤더, 질문 번호 |

### 17.3 간격·크기·반경

- 간격 스케일: 2 / 4 / 6 / 8 / 10 / 12 / 14 / 16 / 20 / 24 / 32 / 40.
- 반경: xs 8(배지·체크박스) / sm 12(질문 pill) / md 16(Notice·행) / lg 20(카드·Callout·HospitalCard) / xl 24(Dialog) / full(pill) / buttonM 14 / 아이콘 상자 14.
- 크기: touch-min 48 / icon 18·20·24 / control 40·48·56 / navbar 56 / tabbar 79 / gutter 20 / safeBottom 24.
- 그림자: `Elevation/Card` 3dp(카드·행·HospitalCard), `Elevation/Float` 4dp(BottomCtaBar).
- 유리 표면 알파: NavBar 0.82 / BottomCtaBar 0.78 / TabBar 0.86, 블러 반경 24(안드로이드에서는 실제 블러 미적용).

---

## 18. 문구 전체 목록 (웹에서 그대로 재현)

### 18.1 브리핑 카드 (1e-1 / 1e-1-E)

| 리소스 키 | 문구 |
|---|---|
| `brief_card_title` | `브리핑 카드` |
| `brief_card_status_before_visit` | `진료 전` |
| `brief_card_status_confirmed` | `진료 완료` |
| `brief_card_edit` | `편집` |
| `brief_card_edit_done` | `확인` |
| `brief_card_cancel` | `취소` |
| `brief_card_ai_caption` | `AI가 말씀하신 내용을 정리했어요` |
| `brief_card_ai_tooltip` | `말씀하신 내용을 항목별로 정리했어요. 원문도 함께 남아요` |
| `brief_card_ai_tooltip_open` | `AI가 어떻게 정리했는지 보기` |
| `brief_card_allergy` | `알러지 · %1$s` |
| `brief_card_allergy_body` | `처방 전에 꼭 확인해 주세요` |
| `brief_card_questions` | `환자가 묻고 싶어 하는 것` |
| `brief_card_question_add` | `질문 추가` |
| `brief_card_question_delete` | `%1$d번 질문 삭제` |
| `brief_card_question_placeholder` | `물어볼 것을 적어주세요` |
| `brief_card_item_delete` | `%1$s 항목 삭제` |
| `brief_card_hospital_section` | `진료받을 병원` |
| `brief_card_hospital_change` | `변경` |
| `brief_card_hospital_unset` | `병원 미정` |
| `brief_card_save` | `저장하기` |
| `brief_card_save_failed` | `저장하지 못했어요. 다시 눌러주세요.` |
| `brief_card_delete` | `브리핑 카드 삭제` |
| `brief_card_delete_title` | `이 브리핑 카드를 삭제할까요?` |
| `brief_card_delete_body` | `연결된 진료 기록은 남고 이 카드는 사라져요.` |
| `brief_card_delete_confirm` | `삭제` |
| `brief_card_failed_title` | `카드를 불러오지 못했어요` |
| `brief_card_failed_description` | `인터넷 연결을 확인하고 다시 시도해주세요` |
| `brief_card_retry` | `다시 시도` |

### 18.2 카드 목록 (1j-4)

| 리소스 키 | 문구 |
|---|---|
| `brief_card_list_title` | `브리핑 카드` |
| `brief_card_list_count` | `%1$d장` |
| `brief_card_list_selected` | `%1$d장 선택됨` |
| `brief_card_list_edit` | `편집` |
| `brief_card_list_edit_cancel` | `취소` |
| `brief_card_list_delete` | `삭제` |
| `brief_card_list_delete_count` | `%1$d장 삭제` |
| `brief_card_list_delete_title` | `브리핑 카드 %1$d장을 삭제할까요?` |
| `brief_card_list_delete_body` | `연결된 진료 기록은 남고 선택한 카드는 사라져요.` |
| `brief_card_list_delete_confirm` | `삭제` |
| `brief_card_list_failed_title` | `카드를 불러오지 못했어요` |
| `brief_card_list_failed_description` | `인터넷 연결을 확인하고 다시 시도해주세요` |
| `brief_card_list_retry` | `다시 시도` |
| `brief_card_list_empty_title` | `아직 브리핑 카드가 없어요` |
| `brief_card_list_empty_description` | `증상을 정리해두면 진료실에서 바로 보여줄 수 있어요` |
| `brief_card_list_empty_action` | `증상 정리하기` |

### 18.3 공용 (행 배지 · 강도 · 매핑 고정 문구)

| 키/출처 | 문구 |
|---|---|
| `record_status_draft` | `작성 중` |
| `record_status_before_visit` | `진료 전` |
| `record_status_confirmed` | `진료 완료` |
| `severity_1_label` ~ `severity_5_label` | `조금 불편해요` / `은근히 아파요` / `꽤 아파요` / `많이 아파요` / `견디기 힘들어요` |
| `severity_nrs` | `NRS %1$d–%2$d` |
| `severity_level_content_description` | `%1$d단계, %2$s` |
| `CardMapping.UNKNOWN_LABEL` | `잘 모르겠어요` |
| `CardMapping.AMBIGUOUS_SUFFIX` | `(확실하지 않아요)` |
| `BriefCardListViewModel` 인라인 | `병원 미정` |
| `BriefCardListViewModel` 인라인 | `작성` (메타의 `MM.dd 작성`) |
| `CardMapping` 인라인 | `여` / `남` |

---

## 19. 웹 목데이터 (소스의 Preview 픽스처 그대로)

### 19.1 1e-1 카드 (`previewBriefCard`, `BriefCardScreen.kt` L320~344)

```ts
const previewBriefCard: BriefCard = {
  id: 'card-1',
  title: '복부 통증 · 3주',
  status: 'BEFORE_VISIT',
  patientLine: '김OO · 32세 여 · 2026.09.04 작성',
  items: [
    { key: '부위',     value: '복부 (명치 아래 · 배꼽 위)',    emphasized: false, axis: null },
    { key: '기간',     value: '3주 전 시작 · 최근 악화',        emphasized: true,  axis: null },
    { key: '양상',     value: '식후 30분 뒤 쓰림 · 밤에 심해짐', emphasized: false, axis: null },
    { key: '복용약',   value: '혈압약 · 진통제(증상 시)',       emphasized: false, axis: null },
    { key: '기저질환', value: '고혈압',                        emphasized: false, axis: null },
  ],
  severity: 3,
  health: [],
  allergies: ['페니실린'],
  questions: [
    '검사를 받아야 하나요?',
    '지금 진통제 계속 먹어도 되나요?',
    '어떤 증상이면 바로 다시 와야 하나요?',
  ],
  hospital: { name: '서울OO병원 내과', address: null },
  visited: false,
  writtenOn: null,
};
```

> 이 픽스처는 복용약·기저질환을 `items`에 넣고 `health`를 비워 뒀다. **실제 서버 경로와 다르다** — 진짜 데이터에서는 그 둘이 `health`로 가고 `items`는 축에서만 온다. 웹 목데이터는 §14.2 축 표를 따라 다시 만드는 편이 낫다.

### 19.2 1j-4 목록 (`previewBriefCardGroups`, `BriefCardListViewModel.kt` L144~179)

```ts
const previewBriefCardGroups: RecordGroup[] = [
  {
    monthLabel: '2026년 9월',
    items: [
      { id: 'card-1', title: '복부 통증 · 3주', status: 'CONFIRMED',
        meta: '09.04 작성 · 서울OO병원 내과',
        detail: '부위 · 기간 · 양상 · 복용약 · 기저질환',
        resumeLabel: null, cardId: null, clinic: null },
      { id: 'card-3', title: '무릎 통증', status: 'DRAFT',
        meta: '오늘 · 4단계 중 2단계',
        detail: null, resumeLabel: '이어서 정리하기', cardId: null, clinic: null },
    ],
  },
  {
    monthLabel: '2026년 8월',
    items: [
      { id: 'card-2', title: '두통 · 잦은 어지러움', status: 'BEFORE_VISIT',
        meta: '08.21 작성 · 병원 미정',
        detail: '부위 · 기간 · 양상 · 질문 3개',
        resumeLabel: null, cardId: null, clinic: null },
    ],
  },
];
```

> 픽스처에는 `detail`·`resumeLabel`이 들어 있지만 **실제 1j-4 데이터에서는 둘 다 항상 null**이다(목록 응답에 본문이 없어서). 실제 화면을 재현하려면 둘을 비우고, 시안에 가까운 모습을 보려면 픽스처 그대로 쓴다. 어느 쪽을 택했는지 웹 코드에 주석으로 남기는 것을 권한다.

### 19.3 데모 시나리오 카드 (큐카드 15번 기준, 축 매핑 적용)

```ts
const demoBriefCard: BriefCard = {
  id: '1',
  title: '복부 통증 · 3주',
  status: 'BEFORE_VISIT',
  patientLine: '고OO · 34세 남 · 2026.09.15 작성',
  items: [
    { key: '부위',       value: '명치',                                              axis: 'site',                   emphasized: false },
    { key: '시작',       value: '3주 전부터 서서히',                                  axis: 'onset',                  emphasized: false },
    { key: '양상',       value: '쓰리고 타는 것 같은 느낌',                            axis: 'character',              emphasized: false },
    { key: '뻗치는 곳',  value: '그 자리에만 있어요',                                  axis: 'radiation',              emphasized: false },
    { key: '동반증상',   value: '속이 더부룩하고 트림이 자주 나요',                     axis: 'associated',             emphasized: false },
    { key: '경과',       value: '처음보다 심해졌어요',                                 axis: 'time_course',            emphasized: true  },
    { key: '심해질 때',  value: '밥 먹고 30분쯤 지나면 제일 쓰리고, 밤에 누우면 더 심해요', axis: 'exacerbating_relieving', emphasized: false },
  ],
  severity: 3,
  health: [
    { key: '복용약',   value: '혈압약 · 진통제', axis: null, emphasized: false },
    { key: '기저질환', value: '고혈압',          axis: null, emphasized: false },
  ],
  allergies: ['페니실린'],
  questions: ['(AI 추천 1)', '(AI 추천 2)', '지금 먹는 진통제를 계속 먹어도 되나요?'],
  hospital: { name: '서울삼성내과의원', address: null },
  visited: false,
  writtenOn: '2026-09-15',
};
```

---

## 20. 웹 포팅 시 주의할 지점

1. **편집 사본을 반드시 별도 객체로 둔다.** 원본을 직접 고치면 `취소`가 동작하지 않고 `changed` 판정(Nav 우측 라벨 전환)도 만들 수 없다. `draft === null`이 곧 읽기 모드다.
2. **PATCH는 바뀐 축만 보낸다.** 전체를 보내면 서버가 손대지 않은 값까지 "환자가 고친 값"으로 기록한다. 축 id 기준 diff(§2.5)를 그대로 옮긴다.
3. **PATCH 응답의 `cardId`가 바뀔 수 있다.** 확정된 카드를 고치면 새 버전이 생긴다. 응답 카드로 갈아타야 하고, 라우트에 박힌 옛 id로 재조회하면 안 된다. 앱은 "한 번 연 카드는 다시 읽지 않는다"로 막았다 — 웹의 `useEffect` 의존성 배열이 재조회를 유발하지 않게 주의.
4. **409 `CARD_ALREADY_EDITED` 1회 재시도**를 빼먹지 말 것. 빼면 편집이 조용히 사라지는 버그가 난다.
5. **일괄 삭제는 단건 DELETE의 반복**이고 부분 실패를 허용한다. 성공한 id만 목록에서 빼고, 빈 월 묶음은 제거한다.
6. **`visited`와 `status`는 다른 축**이다. 배지는 `visited`, 하단 저장 버튼 유무는 `status`. 상세 응답에 `visited`가 없으므로 1e-1 배지는 현재 늘 `진료 전`이다 — 이 "버그처럼 보이는 정상"을 웹에서도 유지할지 결정해야 한다.
7. **강도·알러지·질문을 `items`에 섞지 말 것.** 각자 모양이 다르고, 섞는 순간 그 모양을 잃는다.
8. **복용약·기저질환·알러지는 편집 대상이 아니다.** 편집 UI에 열리면 안 되고, 고치는 자리는 건강 정보 수정(1s-2)이다.
9. **키 열 72px 고정**이 카드 가독성의 핵심이다. 반응형으로 늘였다 줄였다 하면 값 정렬이 깨진다.
10. **툴팁은 레이아웃을 밀지 않아야 한다.** 인라인으로 넣으면 아래 내용이 밀린다(안드로이드에서 실제로 났던 문제). portal/absolute로 띄운다.
11. **모바일 폭 고정 여부**: 앱은 폭을 고정하지 않고 거터 20만 유지한다. 웹에서 `max-width`를 걸 경우 360~412 사이 어디서도 깨지지 않게 하고, 데스크톱에서는 가운데 정렬만 한다.
12. **`MedicalMateCard`의 최소 높이 116**이 목록 행에는 적용되면 안 된다(행은 104/80). 웹에서 카드 스타일을 한 클래스로 공유하다가 이 차이를 잃기 쉽다.
13. **편집 중 `확인` 실패는 앱에서 아무 표시도 없다**(§2.5). `saveFailed` 문구가 읽기 모드 하단에만 있어서다. 웹에서 그대로 재현하면 사용자는 버튼이 안 먹는 줄 안다 — 편집 모드에도 표시 자리를 만드는 쪽을 권한다. **재현하든 보완하든 결정을 코드에 남긴다.**
14. **항목 줄을 지워도 서버에는 나가지 않는다**(§6.3). 화면에서만 사라지고 다시 열면 돌아온다. 테스트로 고정된 현재 동작이다.
15. **표시용 항목 배열을 카드 객체에서 꺼내 쓰지 않는다**(§4의 `BriefCardBlock` 계약). 편집 중에는 사본 배열을 prop으로 받아야 한다.
16. **목록 행의 라벨과 핸들러를 분리하지 않는다**(§12.2-a). 앱은 핸들러를 늘 넘기고 라벨 null로 액션을 감춘다. 웹에서 그대로 옮기면 라벨 없이 눌리는 영역이 생긴다 — 라벨이 없으면 버튼을 그리지 않는다.

---

## 21. 열린 질문 (소스에 남아 있는 미확정 사항)

1. 병원을 안 정한 카드의 병원 섹션에서 액션 이름이 `변경`이 맞는지 — 시안에 없다(소스 주석의 디자인 트랙 확인 항목). `선택`이 맞을 수도 있다.
2. 1j-1(기록)은 선택 수를 하단 버튼에만 적고 1j-4(카드)는 묶음 머리에도 적는다. 두 화면이 같은 조작을 다르게 알리는 셈 — 통일할지 결정 필요.
3. 카드 삭제 실패, 일괄 삭제 부분 실패에 대한 사용자 피드백이 없다. 토스트를 붙일지.
3-a. 편집 중 `확인`(PATCH) 실패도 마찬가지로 표시가 없다(§2.5). `saveFailed` 자리를 편집 모드 하단이나 카드 위로 올릴지.
3-b. 편집에서 지운 항목 줄을 서버에도 반영할지(현재는 화면에서만 사라진다, §6.3). 빈 값 PATCH로 비울지, 서버에 삭제 계약을 요청할지.
4. `BriefCard.emphasized`를 실제로 채우는 매핑이 없다(항상 false). 서버가 강조 축을 내려줄 계획인지, 아니면 프런트가 규칙으로 정할지.
5. 상세 응답에 `visited`가 언제 추가되는지(Backend#101 관련). 추가 전까지 1e-1 배지는 `진료 전` 고정.
6. `CardResponse`의 `redFlags` · `patientNotes` · `departmentGuidance` · `rejectedFields`를 카드 화면에서 쓸 계획이 있는지 — 현재 전부 미사용이다.
7. 큐카드의 축 이름(느낌·악화·퍼짐·동반)과 코드의 축 이름(양상·심해질 때·뻗치는 곳·동반증상) 중 무엇이 제품 최종본인지.
