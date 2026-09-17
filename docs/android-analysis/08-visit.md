# 병원 찾기 · 병원 확인 · 진료 후 메모 · 기록 (1m, 1m-12, 1p, 1q)

## 웹앱 구현 메모

- 모바일 폭 고정: 안드로이드가 `screenWidth 360 / gutter 20 / contentWidth 320`을 기준으로만 쓰고 폭을 고정하지 않는다. 웹도 `max-width: 420px` 중앙 정렬 + 좌우 패딩 20px 컨테이너 하나로 잡고, 안쪽은 전부 Fill로 둔다(데스크톱에서 카드가 늘어지지 않게 하는 용도이지 기기 폭 재현이 아니다).
- 애니메이션: 이 4개 화면에는 자체 애니메이션이 없다. 화면 전환(`MedicalMateNavTransitions`)만 있고, 음성 파형도 "지금 파형은 정지 막대이고 애니메이션은 넣지 않았다"고 소스가 명시한다 → 웹에서는 라우트 전환 fade/slide 하나면 충분하다.
- 제스처: 스와이프·드래그·롱프레스가 전혀 없다. 유일한 플랫폼 의존은 (1) 1p의 키보드(IME) 높이에 맞춘 `bringIntoView` 자동 스크롤과 (2) 음성 입력(`SpeechToText`)이다. 전자는 `scrollIntoView({block:'nearest'})` + `visualViewport` 리스너로, 후자는 Web Speech API로 대체하되 **미지원 브라우저에서는 마이크 버튼을 아예 그리지 않는다**(안드로이드도 `voiceAvailable=false`면 FAB을 안 그린다).
- 대체 방안: 하단 CTA 바는 `position: sticky; bottom: 0` + `padding-bottom: env(safe-area-inset-bottom)`, 툴팁은 클릭 토글 팝오버(안드로이드도 hover가 아니라 클릭 토글이다), 삭제 확인은 `<dialog>`.
- 라우트 파라미터로 본문(`note`)을 나르는 구조라 URL 쿼리에 300자가 실린다. 웹에서는 쿼리 대신 라우터 state 또는 세션 스토리지에 담고, 새로고침 복구까지 고려한다(→ 10장 위험 목록).

---

## 0. 이 문서가 다루는 화면과 소스

| # | 화면 | Figma id | 안드로이드 route(직렬화 클래스) | 소스 파일 |
|---|---|---|---|---|
| 1 | 병원 찾기 (진료 후) | **1m** `489:5447` | `HospitalPickDestination(purpose=AFTER_VISIT, …)` | `visit/ui/HospitalPickScreen.kt` |
| 2 | 병원 찾기 (진료 전) | **1m-B** `1041:3687` (입력 전 프레임 `1092:3858`, 빈 상태 `1092:3919`) | `HospitalPickDestination(purpose=BEFORE_VISIT, …)` | 같은 화면 |
| 3 | 병원 찾기 (일정 추가에서) | 1m-B와 같은 문구 | `HospitalPickDestination(purpose=SCHEDULE)` | 같은 화면 |
| 4 | 병원 확인 | **1m-12** `1576:8517` (병원 줄 인스턴스 `I1576:8525;335:1110`) | `ClinicConfirmDestination` | `visit/ui/ClinicConfirmScreen.kt` |
| 5 | 진료 후 메모 | **1p** `1185:12667` (상태 KDoc에는 `405:1926`) | `VisitNoteDestination` | `visit/ui/VisitNoteScreen.kt` |
| 6 | 자동 분류 결과 | **1q-1** `405:2193` | `VisitRecordDestination` | `visit/ui/VisitRecordScreen.kt` |
| 7 | 자동 분류 결과 · 전체 수정 | **1q-1-E** `636:3675` (분류 카드 `587:3134`) | 같은 목적지의 편집 모드 | `visit/ui/VisitRecordCard.kt` |
| 8 | 삭제 확인 대화상자 | **1q-1-DC** | 같은 화면 위의 다이얼로그 | `VisitRecordScreen.kt` |
| 9 | 진료 후 기록 상세(저장본) | 1q-1과 같은 카드 | `VisitDetailDestination(visitId)` | `visit/ui/VisitDetailScreen.kt` |

관련 소스(전부 읽고 작성함):

```
app/src/main/java/com/mist/medicalmate/visit/
├─ data/
│  ├─ HospitalApi.kt          GET /api/hospitals
│  ├─ HospitalRepository.kt   HospitalSearchResult, PAGE_SIZE=20
│  ├─ HospitalModule.kt       Hilt
│  ├─ VisitApi.kt             DTO 전부 + 6개 엔드포인트
│  ├─ VisitMapping.kt         DTO → 화면 값, 축 이름, 재방문 날짜 부착/제거
│  ├─ VisitRepository.kt      도메인 모델(Visit, NewVisit, VisitFollowUp …)
│  └─ VisitModule.kt          Hilt
└─ ui/
   ├─ VisitUiState.kt         이 도메인의 모든 UiState
   ├─ HospitalPickScreen.kt / HospitalPickViewModel.kt
   ├─ ClinicConfirmScreen.kt
   ├─ VisitNoteScreen.kt / VisitNoteViewModel.kt
   ├─ VisitRecordScreen.kt / VisitRecordCard.kt / VisitRecordEditActions.kt / VisitRecordViewModel.kt
   ├─ VisitDetailScreen.kt / VisitDetailViewModel.kt / VisitDetailDestination.kt
   ├─ VisitDestination.kt     1m·1m-12·1p·1q의 라우트와 Route 컴포저블
   └─ VisitFixtures.kt        Preview 픽스처
```

문구는 전부 `app/src/main/res/values/strings.xml` 71~129행.
네비게이션 연결은 `navigation/MedicalMateNavGraphs.kt`(`visitDestinations`, `calendarDestinations`, `clinicConfirmFlow`)와 `navigation/MedicalMateNavHost.kt`.

---

## 1. 전체 흐름

```
캘린더 일자(1r-2) "이 날 기록" 영역
   └─ 빈 상태 버튼 "진료 후 기록하기"  (calendar_day_record_empty_action)
        │
        ├─ 일정에 등록한 병원이 있으면 ──► 1m-12 병원 확인
        │                                   ├─ "이 병원이 맞아요" ──► 1p
        │                                   └─ "다른 병원이에요" ──► 1m
        └─ 병원이 없거나 공백이면 ─────────► 1m 병원 찾기 ── "완료" ──► 1p
                                                                        │
                                                        1p 진료 후 메모  ─ "저장하기" / "AI로 정리하기"
                                                                        ▼
                                                        1q-1 자동 분류 결과
                                                          ├─ "저장하기" 성공 ──► 캘린더 일자로 pop
                                                          ├─ 편집 모드(1q-1-E) → "진료 후 기록 삭제" → 1q-1-DC
                                                          └─ 삭제 확정 ──► 캘린더 일자로 pop

캘린더 일자 "이 날 기록"의 저장된 줄 클릭 ──► 진료 후 기록 상세(VisitDetailScreen)
```

핵심 성질 4가지:

1. **세 화면이 ViewModel을 공유하지 않는다.** 목적지가 각각이라 앞 화면에서 정한 값이 전부 라우트 파라미터로 따라간다(`clinic`, `cardId`, `cardTitle`, `note`, `visitedOn`).
2. **저장은 마지막 화면에서 딱 한 번**이다. `POST /api/cards/{cardId}/visit` 한 방이고, 그 요청에 들어갈 값이 세 화면에 흩어져 있다.
3. **`visitedOn`은 "오늘"이 아니라 흐름이 시작된 캘린더 일자다.** 어제 진료를 오늘 적을 수 있고, 오늘로 박으면 그 일자 화면에 영영 안 나온다. 라우트가 `null`이면 그때만 오늘로 둔다.
4. **병원에 id가 없다.** 서버가 심평원 데이터를 그대로 넘기면서 id를 매기지 않는다. 이름 문자열(`clinicName`)이 곧 식별자다.

---

## 2. 1m / 1m-B 병원 찾기 (`HospitalPickScreen`)

### 2.1 상태 — `HospitalPickUiState`

| 필드 | 타입 | 기본값 | 의미 |
|---|---|---|---|
| `query` | `String` | `""` | 검색창에 친 글자 그대로(트림 전) |
| `results` | `List<Hospital>` | `emptyList()` | 화면에 그리는 결과. 서버 응답 또는 앱이 먼저 좁힌 부분집합 |
| `selected` | `Hospital?` | `null` | 고른 한 곳. 여러 개 고를 수 없다 |
| `purpose` | `HospitalPickPurpose` | `AFTER_VISIT` | 이 화면이 열린 목적. 문구·CTA·필수 여부가 갈린다 |
| `forExistingCard` | `Boolean` | `false` | 이미 있는 카드의 `변경`에서 왔는지. CTA 라벨만 바꾼다 |
| `searching` | `Boolean` | `false` | 서버 요청이 나가 있는 동안 |
| `total` | `Int` | `0` | 조건에 맞는 **전체** 건수. `results.size`보다 클 수 있다 |
| `failed` | `Boolean` | `false` | 서버에 닿지 못했는지. "못 찾은 것"과 구분한다 |

파생값(계산 프로퍼티, 저장하지 않는다):

| 이름 | 식 | 뜻 |
|---|---|---|
| `canSubmit` | `selected != null \|\| purpose != AFTER_VISIT` | 하단 CTA 활성 여부. 진료 후(1m)에만 선택이 필수 |
| `showSubmit` | `results.isNotEmpty()` | **하단 CTA 바를 그릴지.** 결과가 없으면 바를 비활성이 아니라 아예 없앤다 |
| `truncated` | `total > results.size` | 받은 것보다 더 있는지 |

```ts
type HospitalPickPurpose = 'AFTER_VISIT' | 'BEFORE_VISIT' | 'SCHEDULE';

interface Hospital {
  name: string;            // id 없음. 이름이 곧 식별자
  address?: string | null; // 심평원에 없는 곳은 비어 있음 → 줄을 그리지 않음
}

interface HospitalPickUiState {
  query: string;
  results: Hospital[];
  selected: Hospital | null;
  purpose: HospitalPickPurpose;
  forExistingCard: boolean;
  searching: boolean;
  total: number;
  failed: boolean;
}

const canSubmit = (s: HospitalPickUiState) =>
  s.selected !== null || s.purpose !== 'AFTER_VISIT';
const showSubmit = (s: HospitalPickUiState) => s.results.length > 0;
const truncated = (s: HospitalPickUiState) => s.total > s.results.length;
```

> `results`가 비면 `selected`도 항상 비어 있다(검색어가 바뀔 때 결과에서 빠진 선택을 지우기 때문). 그래서 `showSubmit`은 선택 여부를 따로 보지 않는다.

### 2.2 `HospitalPickPurpose` — 한 화면 세 자리

| | `AFTER_VISIT` (1m) | `BEFORE_VISIT` (1m-B) | `SCHEDULE` |
|---|---|---|---|
| 언제 | 진료를 받고 나서 어디서 받았는지 고른다 | 증상 정리를 마치고 진료받을 병원을 미리 찾는다 | 일정 추가(1r-4)의 병원 필드에서 |
| 제목 | `진료받은 병원을 찾아주세요` | `진료받을 병원을 찾아주세요` | BEFORE_VISIT과 동일 |
| 설명 | `병원 이름으로 검색해 주세요.` | `아직 정하지 않았다면 건너뛰어도 돼요.\n진료 후에 등록할 수 있어요.` | BEFORE_VISIT과 동일 |
| CTA 라벨 | `완료` | `브리핑 카드 만들기` (단, `forExistingCard=true`면 `완료`) | `완료` |
| 선택 필수 | **필수** (`canSubmit`이 선택 없으면 false) | 아님 | 아님 |
| 나가는 곳 | 1p(`VisitNoteDestination`) | `cardId==null` → 브리핑 카드 생성 / `cardId!=null` → 결과만 들고 pop | 결과(이름만) 들고 pop |

소스의 CTA 라벨 결정식(`HospitalPickScreen.kt`):

```
purpose != BEFORE_VISIT            -> hospital_pick_submit          ("완료")
purpose == BEFORE_VISIT && forExistingCard -> hospital_pick_submit  ("완료")
else                               -> hospital_pick_submit_before   ("브리핑 카드 만들기")
```

내부 헬퍼 `HospitalPickPurpose.beforeVisit == (this != AFTER_VISIT)` 가 문구 분기를 담당한다. 즉 **문구는 2갈래(진료 후 / 그 외), CTA는 3갈래**다.

### 2.3 레이아웃 (위 → 아래)

```
┌ NavBar  (MedicalMateNavBar, surface=GLASS, 높이 min 56)
│   leading: 뒤로가기만.  ※ 우측 액션 없음 — "건너뛰기"는 #228에서 제거됨
│   title:   "병원 찾기"
├ 본문  Column
│   padding: horizontal 20(gutter) / vertical 12,  자식 간격 20
│   결과가 없으면 스크롤 안 함(빈 상태가 남은 높이를 받아야 하므로), 있으면 세로 스크롤
│
│  ① 제목 블록 (Column, 간격 8)
│       - 질문      Heading/L (24/34, Bold),  색 fg/default
│       - 설명      Body/M   (15/24),          색 fg/subtle
│  ② MedicalMateSearchField
│       - 배경 bg/subtle, radius 16(md), 높이 min 56(controlLg)
│       - 좌측 padding 20 / 우측 4, 요소 간격 12
│       - 좌: 검색 아이콘 20px (fg/subtle)
│       - 중: 입력(Body/L 17). placeholder "병원 이름 검색" 을 입력 위에 겹쳐 그림
│       - 우: 값이 있을 때만 × (GHOST IconButton, aria-label "검색어 지우기")
│       - IME 액션 = Search. 값이 바뀔 때마다 좁혀지므로 onSearch 콜백은 안 넘김
│  ③ 결과 라벨   Label/M, 색 fg/subtle    ← 5갈래 문구(2.4)
│  ④ 결과 목록 또는 빈 상태
│       - 결과 있음: 행 사이에 Divider, 행 전체가 클릭 영역
│       - 결과 없음: MedicalMateEmptyState 가 weight(1)로 남은 높이 전부를 받고
│                    그 안에서 세로 가운데 정렬 (시안 높이 496 = 검색창 아래 전부)
└ 하단 CTA 바  (showSubmit == true 일 때만 렌더)
    MedicalMateBottomCtaBar: 배경 bg/surface, 위로 떨어지는 그림자,
      padding top 12 / 좌우 20 / bottom 24(safeBottom)
    MedicalMateButton (fillMaxWidth), enabled = canSubmit
```

### 2.4 결과 라벨 5갈래 (`resultLabel`) — 우선순위 순서 그대로

| 조건 | 문구(문자 그대로) |
|---|---|
| `searching` | `찾는 중이에요` |
| `failed` | `지금은 찾지 못했어요. 잠시 뒤 다시 해주세요.` |
| `results.isEmpty()` | `검색 결과 없음` |
| `truncated` | `%1$d곳 중 %2$d곳이에요. 이름을 더 적으면 좁혀져요.` → `total`, `results.size` 순 |
| 그 외 | `검색 결과 %1$d곳` → `results.size` |

> 못 닿은 것(`failed`)과 못 찾은 것을 한 문구로 뭉개면 사용자가 병원 이름을 계속 고쳐 친다 — 소스 주석의 근거.

### 2.5 결과 카드(행) 구조 — `ResultRow`

`List Row` 디자인 컴포넌트를 **쓰지 않는다.** 선택 상태(제목 브랜드색 + 우측 체크)가 그 컴포넌트에 없기 때문이고, 시안도 `List Row` 인스턴스 옆에 체크를 따로 얹어 뒀다.

```
Row  (fillMaxWidth, vertical padding 16, 요소 간격 8, 세로 가운데)
  role = radio  (selectable, selected 상태를 접근성에 노출)
  ├ Column (weight 1, 간격 4)
  │    ├ 병원 이름   Heading/S (17/24 SemiBold)
  │    │             색: 선택됨 → fg/primary, 아니면 fg/default
  │    └ 주소        Body/S (13/20), 색 fg/subtle
  │                  ※ address 가 null 이거나 blank 면 이 줄 자체를 그리지 않는다
  │                     (빈 줄이 남으면 "주소가 없는 병원"이 아니라 "주소가 빈 병원"으로 읽힘)
  └ 체크 아이콘 24px (fg/default)  — 선택됐을 때만
행 사이: MedicalMateDivider (index > 0 일 때)
```

행 전체가 hit area다. 체크만 누를 수 있으면 접근성 최소 48dp에 못 미친다.
웹에서는 `<ul>` + `<li>` 안에 `role="radio"` 버튼, 또는 `<input type=radio>` + `<label>` 전체 클릭으로 재현한다.

### 2.6 검색 동작 (`HospitalPickViewModel`) — 웹에서 그대로 옮겨야 하는 5가지

1. **디바운스 300ms.** `DEBOUNCE_MILLIS = 300L`. 한글은 한 글자에 두세 번 값이 바뀌고, 조합이 끝나기를 기다리는 값이기도 하다. 앞선 요청은 `searchJob.cancel()`로 취소한다(늦게 온 답이 새 검색어 결과를 덮으면 화면과 검색어가 어긋난다).
2. **기다리는 동안 화면에서 먼저 좁힌다(`narrow`).** 서버가 이름 부분 일치이므로 앱도 `name.contains(keyword, ignoreCase=true)`로 현재 `results`를 즉시 줄이고 `total`도 그 크기로 맞춘다. 기기 측정 왕복이 1.3~3.3초(중앙값 1.6초)라 그동안 목록이 그대로면 친 글자가 아무 일도 안 하는 것처럼 보인다.
   - **좁혀서 0건이 되면 그대로 둔다.** 한글 조합 중간 상태("서울ㅂ")에서 비는데 그때 지우면 글자마다 깜빡인다.
3. **응답 0건이면 직전 결과를 남긴다.** `results = result.value.hospitals.ifEmpty { state.results }`. 같은 이유(한글 조합 중간 상태).
4. **검색어 캐시.** 화면 단위 `Map<검색어(trim), HospitalSearchResult>`. **`Success`일 때만 담는다.** 같은 검색어를 다시 치면 서버를 부르지 않고 `apply(Success(cached))`로 즉시 적용하며, 이때는 디바운스도 `narrow`도 `searching=true`도 거치지 않는다. **화면을 다시 열면(`load`) 캐시를 비운다** — 개원·폐원이 계속 생기는 데이터라 오래 들고 있을 값이 아니다.
5. **빈 검색어는 서버를 부르지 않는다.** `query.trim().isEmpty()`면 `results=[] selected=null searching=false total=0 failed=false`로 즉시 리셋하고 종료.

`onQueryChange(query)` 한 번의 실행 순서(소스 그대로):

```
searchJob.cancel()
query 를 상태에 즉시 반영            ← 입력은 항상 화면에 먼저 보인다
keyword = query.trim()
keyword 가 비었으면 → 전체 리셋하고 return
cache[keyword] 가 있으면 → apply(Success(cached)) 하고 return
narrow(keyword)                      ← 여기서 먼저 좁힌다 (delay 앞)
launch {
  delay(300)
  searching = true, failed = false    ← failed 는 이 시점에 걷힌다
  result = repository.search(keyword)
  Success 면 cache[keyword] = result
  apply(result)
}
```

선택 유지 규칙:

- `onHospitalClick(name)` → `selected = results.firstOrNull { it.name == name }`
- 응답 적용 시 `selected = state.selected?.takeIf { it in result.value.hospitals }` — 고른 병원이 새 결과에 없으면 선택을 지운다. 보이지 않는 것이 골라져 있으면 완료를 눌렀을 때 무엇이 저장되는지 알 수 없다.

응답 갈래:

| `ApiResult` | 상태 반영 |
|---|---|
| `Success` | `results`(0건이면 직전 유지), `selected` 재검증, `total`, `searching=false`. **`failed`는 건드리지 않는다** |
| `Rejected` / `NetworkUnavailable` | `searching=false, failed=true` (results·selected는 건드리지 않음) |

> **`failed`가 걷히는 시점은 두 곳뿐이다** — ① 검색어를 비웠을 때, ② 디바운스가 끝나고 새 요청이 나가기 직전(`searching=true, failed=false`). `apply()`의 `Success` 갈래는 `failed`를 지우지 않으므로, **한 번 실패한 뒤 캐시에 있는 검색어로 되돌아가면 결과는 들어오는데 라벨은 `지금은 찾지 못했어요.`로 남는다.** 소스에서 직접 읽히는 동작이고 테스트에 고정돼 있지는 않다. 웹으로 옮길 때 그대로 둘지 결정할 것(→ 11장).
>
> `Success`에 0건이 와서 `results`를 직전 값으로 유지하는 경우에도 `selected`는 `it in result.value.hospitals`(= 빈 목록)로 판정되어 **항상 지워진다.** 목록은 남고 선택만 풀리는 상태가 잠깐 생긴다.

`load(purpose, forExistingCard)`는 진행 중 검색 취소 + 캐시 비우기 + 상태 전체 초기화다(`HospitalPickUiState(purpose, forExistingCard)`로 통째 교체 — `query`도 함께 비워진다).

### 2.7 로딩 / 빈 상태 / 에러

| 상태 | 화면 |
|---|---|
| 로딩(`searching=true`) | **스피너 없음.** 결과 라벨만 `찾는 중이에요`로 바뀌고 목록은 직전 값(또는 앱이 좁힌 값)이 그대로 보인다 |
| 빈 상태(검색 전 / 결과 0건) | `MedicalMateEmptyState(type=NO_RESULT, icon=Hospital)` — 아이콘을 `search-off` 대신 **병원 아이콘**으로 갈아 끼운다(#228, 시안 인스턴스가 그렇게 돼 있음). 남은 높이 전부를 받아 세로 가운데. 제목 `아직 검색 기록이 없어요`, 설명 `병원 명을 입력하면 진료받을 병원을 찾을 수 있어요`. **이때 하단 CTA 바가 통째로 사라진다** |
| 에러(`failed=true`) | 전용 화면 없음. 결과 라벨만 `지금은 찾지 못했어요. 잠시 뒤 다시 해주세요.` 재시도 버튼 없음 — 다시 타이핑해서 **새 요청이 나가는 순간**(디바운스 300ms 뒤)이나 검색어를 비웠을 때 `failed=false`로 걷힌다. 캐시에 있는 검색어로 돌아간 경우에는 걷히지 않는다(2.6) |

> 빈 상태 컴포넌트 자체: 세로 padding 40, 아이콘 원 → (상단 여백 4) → 제목/설명 블록(간격 6), 가운데 정렬. `actionLabel`을 주지 않아 이 화면에서는 버튼이 없다.

### 2.8 네비게이션 — 들어오는 길

| 출발 | 트리거 | 넘기는 라우트 |
|---|---|---|
| 캘린더 일자(1r-2) | "진료 후 기록하기" 눌렀는데 **일정에 병원이 없거나 공백** | `HospitalPickDestination(cardId, cardTitle, visitedOn)` — purpose 기본값 `AFTER_VISIT` |
| 1m-12 병원 확인 | `다른 병원이에요` | `HospitalPickDestination(cardId, cardTitle, visitedOn)` |
| 증상 문답 완료(1d/IntakeDone) | 병원 찾기 버튼 | `HospitalPickDestination(purpose=BEFORE_VISIT, sessionId)` |
| 브리핑 카드(1e-1) | 병원 `변경` | `HospitalPickDestination(purpose=BEFORE_VISIT, cardId)` → `forExistingCard=true` |
| 일정 추가(1r-4) | 병원 필드 | `HospitalPickDestination(purpose=SCHEDULE)` |

`HospitalPickDestination` 파라미터:

| 필드 | 타입 | 채워지는 경우 |
|---|---|---|
| `purpose` | `HospitalPickPurpose` | 항상(기본 `AFTER_VISIT`) |
| `cardId` | `String?` | 진료 후: 기록을 붙일 카드 / 진료 전: 카드의 `변경`에서 온 경우 |
| `cardTitle` | `String?` | 진료 후(1m)에서만. 1p 머리말에 쓰려고 나르기만 한다 |
| `sessionId` | `Long?` | 진료 전(1m-B)에서만. 그 문답으로 카드를 만들려고 |
| `visitedOn` | `String?` | ISO `yyyy-MM-dd`. 흐름이 시작된 캘린더 일자 |

**`forExistingCard`는 라우트 필드가 아니다.** `HospitalPickRoute`가 파생시킨다:

```
LaunchedEffect(purpose, cardId) { viewModel.load(purpose, forExistingCard = cardId != null) }
```

즉 **목적과 무관하게 `cardId != null`이면 true**다. 진료 후(1m)도 `cardId`를 들고 오므로 거기서도 true가 되지만, CTA 라벨 분기가 `purpose == BEFORE_VISIT`을 먼저 보기 때문에 결과는 달라지지 않는다. `purpose`나 `cardId`가 바뀌면 `load`가 다시 불려 **검색어·결과·선택이 전부 리셋된다.**

### 2.9 네비게이션 — 나가는 길 (전부)

| 트리거 | 조건 | 결과 |
|---|---|---|
| NavBar 뒤로가기 | — | `popBackStack()` |
| 하단 CTA | `purpose == AFTER_VISIT` (선택 필수) | `VisitNoteDestination(clinic = selected.name, cardId, cardTitle, visitedOn)` |
| 하단 CTA | `BEFORE_VISIT` && `cardId == null` | `BriefCardDestination(sessionId, hospitalName = selected?.name, hospitalAddress = selected?.address)` — 선택 없이도 이동 |
| 하단 CTA | `BEFORE_VISIT` && `cardId != null` | `popWithResult(result.hospitalName, result.hospitalAddress)` — 카드 화면으로 값만 돌려준다. **엔트리를 갈아치우면 그 화면이 편집 중이던 값을 잃으므로 navigate가 아니라 pop이다** |
| 하단 CTA | `SCHEDULE` | `popWithResult(result.hospitalName)` — 이름만 |

`AFTER_VISIT`의 분기만 `selected?.let { … }`로 감싸여 있다. `canSubmit`이 이미 막고 있어 도달하지 않지만, **선택이 없으면 CTA를 눌러도 아무 일도 하지 않는 것이 소스의 최종 방어선**이다. `BEFORE_VISIT`·`SCHEDULE`은 `selected`가 null이어도 그대로 나간다(`hospital?.name` → null).

`popWithResult`가 넘기는 키는 `NavResult.HOSPITAL_NAME`, `NavResult.HOSPITAL_ADDRESS` 둘이다(`navigation/` 쪽 상수).

### 2.10 쓰는 디자인 시스템 컴포넌트

`MedicalMateNavBar(GLASS)`, `MedicalMateSearchField`, `MedicalMateDivider`, `MedicalMateEmptyState(NO_RESULT, icon=MedicalMateIcons.Hospital)`, `MedicalMateBottomCtaBar`, `MedicalMateButton`, `MedicalMateIconButton(GHOST)`(SearchField 내부의 ×), `MedicalMateIcons.Check` / `.Hospital` / `.Search` / `.Close`.

---

## 3. 1m-12 병원 확인 (`ClinicConfirmScreen`)

### 3.1 왜 있는가

일정 상세의 "진료 후 기록하기"를 누르면 **먼저** 오는 화면이다(#246). 병원은 일정을 추가할 때 이미 등록해 두고, 진료 후 기록은 그 일정에서만 쓸 수 있는데, 전에는 그 병원을 아는 채로 1m을 첫 화면으로 띄워 매번 다시 찾게 했다.

### 3.2 상태

**UiState 데이터 클래스가 없다.** ViewModel도 없고, 라우트 파라미터 4+1개를 그대로 그리는 순수 화면이다.

| `ClinicConfirmDestination` 필드 | 타입 | 필수 | 비고 |
|---|---|---|---|
| `clinic` | `String` | 필수 | 일정에 등록한 병원 이름 |
| `address` | `String?` | 선택 | **일정 응답에는 주소가 없어 카드에 남은 것을 받는다.** 없으면 이름만 |
| `cardId` | `String` | 필수 | |
| `cardTitle` | `String` | 필수 | |
| `visitedOn` | `String` | 필수 | ISO `yyyy-MM-dd`. 화면에서 `LocalDate.parse` 후 `M월 d일`로 포맷 |

컴포저블 시그니처: `ClinicConfirmScreen(clinic, scheduledOn: LocalDate, onConfirmClick, onOtherClick, onBackClick, modifier, address: String? = null)`

```ts
interface ClinicConfirmParams {
  clinic: string;
  address?: string | null;
  cardId: string;
  cardTitle: string;
  visitedOn: string; // 'YYYY-MM-DD'
}
```

### 3.3 레이아웃 (위 → 아래)

```
┌ NavBar (GLASS, 뒤로가기만)  title = "진료 후 기록"   ← 1p와 같은 문자열(visit_note_title)
├ 본문 Column (좌우 20 / 상하 12, 자식 간격 20, 세로 스크롤)
│  ① 제목 블록 (위 padding 8 추가, 내부 간격 8)
│       - "진료 받은 병원이 맞나요?"                      Heading/L, fg/default
│       - "{9월 12일} 일정에 등록해둔 병원이에요.\n다른 곳에서 진료받았다면 바꿀 수 있어요."
│                                                        Body/M, fg/subtle
│  ② 병원 줄 + 구분선   (눌리지 않는다 — 고르는 자리가 아니라 확인하는 자리)
│       Column (fillMaxWidth, 상하 padding 16, 간격 4)
│         - 병원 이름   Body/L Strong (17 SemiBold), 색 fg/primary   ← 1m의 "선택된" 줄과 같은 모양
│         - 주소       Body/S, fg/subtle   (blank면 줄 자체를 그리지 않음)
│       MedicalMateDivider
│  ③ "다른 병원이에요"  MedicalMateButton(type=GHOST, size=M)
│       왼쪽으로 -20 offset — 시안에서 글자가 콘텐츠 왼쪽 끝에 붙는다.
│       버튼의 좌우 여백 20을 그만큼 물려 글자를 그 자리에 두고 터치 영역은 유지
└ 하단 CTA 바 (항상 있음)
     MedicalMateButton(fillMaxWidth) "이 병원이 맞아요"   ← enabled 조건 없음, 늘 활성
```

두 버튼의 무게 차이가 설계 의도다 — 보통은 맞는 병원이고 바꾸는 쪽이 예외라서, "다른 병원이에요"는 채움 없는 Ghost로 본문 안에 두고 확인만 하단 Primary CTA로 세운다.

### 3.4 문구 전량

| 위치 | 문자열 리소스 | 값(문자 그대로) |
|---|---|---|
| NavBar 제목 | `visit_note_title` | `진료 후 기록` |
| 질문 | `clinic_confirm_question` | `진료 받은 병원이 맞나요?` |
| 설명 | `clinic_confirm_description` | `%1$s 일정에 등록해둔 병원이에요.\n다른 곳에서 진료받았다면 바꿀 수 있어요.` (`%1$s` = `M월 d일`, 예: `9월 12일`) |
| 본문 버튼 | `clinic_confirm_other` | `다른 병원이에요` |
| 하단 CTA | `clinic_confirm_submit` | `이 병원이 맞아요` |

날짜 포맷: `DateTimeFormatter.ofPattern("M월 d일", Locale.KOREAN)` → 한 자리 월/일에 0을 붙이지 않는다(`9월 5일`).

### 3.5 로딩 / 빈 상태 / 에러

**셋 다 없다.** 서버 호출이 없고 라우트 값만 그린다. 유일한 조건부는 `address`가 blank면 주소 줄을 안 그리는 것.

### 3.6 네비게이션

| 방향 | 트리거 | 목적지 |
|---|---|---|
| 들어옴 | 캘린더 일자 "진료 후 기록하기" + 일정에 병원 있음 | `ClinicConfirmDestination(clinic, address, cardId, cardTitle, visitedOn)` |
| 나감 | `이 병원이 맞아요` | `VisitNoteDestination(clinic, cardId, cardTitle, visitedOn)` — 1m을 건너뛴다 |
| 나감 | `다른 병원이에요` | `HospitalPickDestination(cardId, cardTitle, visitedOn)` (purpose = AFTER_VISIT) |
| 나감 | NavBar 뒤로가기 | `popBackStack()` |

### 3.7 DS 컴포넌트

`MedicalMateNavBar(GLASS)`, `MedicalMateDivider`, `MedicalMateButton(GHOST, size=M)`, `MedicalMateBottomCtaBar`, `MedicalMateButton`(기본 = Primary L).

---

## 4. 1p 진료 후 메모 (`VisitNoteScreen`)

### 4.1 상태 — `VisitNoteUiState`

| 필드 | 타입 | 기본값 | 의미 |
|---|---|---|---|
| `visit` | `VisitHeadline` | **필수(기본값 없음)** | 무엇을 받은 진료인지. 맨 위 카드의 재료 |
| `note` | `String` | `""` | 환자가 적은 원문. **뒤 화면까지 그대로 따라간다** |
| `voice` | `MedicalMateVoiceState?` | `null` | 음성 패널이 열렸는지. **꺼져 있으면 `IDLE`이 아니라 `null`** |
| `voiceAvailable` | `Boolean` | `false` | 이 기기에서 음성을 쓸 수 있는지. false면 마이크를 아예 안 그린다 |

파생값: `canSave = note.isNotBlank()` — 공백만 적으면 저장 불가.

`VisitHeadline`:

| 필드 | 타입 | 기본값 | 의미 |
|---|---|---|---|
| `visitedOn` | `LocalDate` | 필수 | 진료받은 날 |
| `clinic` | `String?` | `null` | 1m/1m-12에서 확정된 병원 이름. **null이면 카드 블록 전체를 안 그린다** |
| `cardTitle` | `String?` | `null` | 이 기록이 붙을 브리핑 카드 제목. null이면 그 줄만 안 그린다 |
| `today` | `Boolean` | `true` | 진료가 오늘이었는지. `"오늘 진료"` / `"그 날 진료"`를 가른다 |

```ts
type MedicalMateVoiceState = 'IDLE' | 'LISTENING' | 'PROCESSING' | 'DENIED';

interface VisitHeadline {
  visitedOn: string;         // 'YYYY-MM-DD'
  clinic?: string | null;
  cardTitle?: string | null;
  today: boolean;
}

interface VisitNoteUiState {
  visit: VisitHeadline;
  note: string;
  voice: MedicalMateVoiceState | null; // null = 패널 닫힘
  voiceAvailable: boolean;
}
const canSave = (s: VisitNoteUiState) => s.note.trim().length > 0;
```

> 증상 문답(1c-2 vs 1c-3)은 글 입력과 음성이 **자리를 번갈아 차지**하지만, 1p는 적던 글이 그대로 남고 음성 패널이 그 **아래에 선다.** 그래서 "지금 음성인가"를 별도 필드로 든다.

화면이 받는 조작은 `VisitNoteCallbacks` 한 덩어리다(전부 기본값 `{}`):

| 콜백 | 붙는 자리 | Route가 연결하는 곳 |
|---|---|---|
| `onBackClick` | NavBar 뒤로가기 | `onExit` → `popBackStack()` |
| `onNoteChange` | TextArea | `viewModel::onNoteChange` |
| `onVoiceClick` | 떠 있는 FAB | `rememberMicPermission(onGranted = viewModel::onVoiceClick, onDenied = viewModel::onMicDenied)` |
| `onMicClick` | 음성 패널 안 마이크 | `rememberMicPermission(onGranted = viewModel::onMicClick, onDenied = viewModel::onMicDenied)` |
| `onTypeInsteadClick` | `직접 입력할게요` | `viewModel::onTypeInsteadClick` |
| `onSaveClick` | 하단 `저장하기` **와** `AI로 정리하기` 칩 | `{ onSaved(state.note) }` → 1q-1로 이동 |

**마이크 권한은 FAB과 패널 마이크 양쪽에서 매번 묻는다.** 화면을 열 때는 묻지 않고(`checkVoice()`만 돈다), 누를 때 묻는다.

### 4.2 레이아웃 (위 → 아래)

```
┌ NavBar (GLASS, 뒤로가기만)  title = "진료 후 기록"
├ Box (weight 1) ─ 본문 + 떠 있는 마이크
│   본문 Column (fillMaxSize, 세로 스크롤, 좌우 20 / 상하 12, 자식 간격 16)
│     ① Heading (Column, 간격 6)
│          - "진료실에서 들은 말을\n그대로 남겨두세요"     Heading/L, fg/default  ← \n 강제 줄바꿈
│          - "기억나는 대로 편하게 적어주세요."           Body/M, fg/subtle
│     ② VisitCard  ─ visit.clinic 이 null 이면 통째로 생략
│          MedicalMateCard(emphasis = QUIET)  배경 bg/subtle, radius 20, padding 20, 자식 간격 6
│          ├ Row (간격 12, 상단 정렬)
│          │   ├ 아이콘 상자 48×48, 배경 bg/surface, radius 14
│          │   │     └ 병원 아이콘 24px, tint fg/primary
│          │   └ Column (간격 2)
│          │        ├ 병원 이름            Body/L Strong, fg/default
│          │        └ "{복부 통증 · 3주} 브리핑 카드로 진료받았어요"
│          │                                Body/S, fg/subtle   (cardTitle 없으면 생략)
│          ├ MedicalMateDivider
│          └ Row (간격 4)
│               ├ "오늘 진료" | "그 날 진료"   Body/S Strong, fg/primary
│               └ "· {9월 12일}"               Body/S, fg/subtle
│     ③ MedicalMateTextArea
│          placeholder "3일치 약 처방을 받았어요",  maxLength 300
│          최소 높이 있음, 글에 따라 자란다.  우측 하단 카운터 "71 / 300" 형식
│          카운터 색: 한도 초과 시 fg/danger (입력을 막지는 않는다 — 색이 유일한 신호)
│          테두리: 비었으면 bg/subtle 무테, 채워지면 bg/surface + border/default,
│                  포커스면 bg/surface + border/focus 2px
│     ④ OrganizeRow  (Row, SpaceBetween, 세로 가운데)
│          ├ MedicalMateChip "AI로 정리하기"  selected=false, enabled = canSave
│          └ MedicalMateTooltip (트리거 아이콘, 클릭 토글)
│               말풍선: "적은 내용을 소견·검사·약·재방문으로 나눠드려요"
│               트리거 aria-label: "AI 정리 설명"
│     ⑤ MedicalMateVoiceInput   ─ voice != null 일 때만, 적던 글 아래에 선다
│   ※ 떠 있는 FAB: voice == null && voiceAvailable 일 때만
│        Alignment.BottomEnd, padding 20(gutter), 48×48 원형, bg/primary,
│        마이크 아이콘 24px, aria-label "음성으로 적기"
└ 하단 CTA 바
     MedicalMateButton "저장하기" (fillMaxWidth), enabled = canSave
```

### 4.3 문구 전량

| 위치 | 리소스 | 값(문자 그대로) |
|---|---|---|
| NavBar 제목 | `visit_note_title` | `진료 후 기록` |
| 제목 | `visit_note_heading` | `진료실에서 들은 말을\n그대로 남겨두세요` |
| 설명 | `visit_note_description` | `기억나는 대로 편하게 적어주세요.` |
| 카드 · 오늘 | `visit_note_headline_label` | `오늘 진료` |
| 카드 · 과거 | `visit_note_headline_label_past` | `그 날 진료` |
| 카드 · 카드줄 | `visit_note_headline_card` | `%1$s 브리핑 카드로 진료받았어요` |
| 카드 · 날짜 | `visit_note_headline_date` | `· %1$s` (`%1$s` = `M월 d일`) |
| 입력 플레이스홀더 | `visit_note_placeholder` | `3일치 약 처방을 받았어요` ← **지시문이 아니라 예시 문장이다**(주석 명시) |
| 칩 | `visit_note_organize` | `AI로 정리하기` |
| 툴팁 본문 | `visit_note_organize_tooltip` | `적은 내용을 소견·검사·약·재방문으로 나눠드려요` |
| 툴팁 접근성 이름 | `visit_note_organize_tooltip_label` | `AI 정리 설명` |
| FAB 접근성 이름 | `visit_note_voice` | `음성으로 적기` |
| 하단 CTA | `visit_note_save` | `저장하기` |
| 카운터 | `text_area_counter` | `%1$d / %2$d` |

### 4.4 "AI로 정리하기" 버튼과 로딩 표현 — 중요

- **칩과 하단 `저장하기`는 정확히 같은 동작이다.** 소스: `OrganizeRow(state, onOrganizeClick = callbacks.onSaveClick)`. 둘 다 1q-1로 이동하고, `enabled`도 둘 다 `canSave`다. 테스트에도 `정리하기 칩은 저장하기와 같은 자리로 간다`가 있다.
- **이 화면에서는 AI를 부르지 않는다.** `POST /api/visits/classify`는 결과를 그리는 1q-1이 부른다(#183). 축 맵을 라우트에 실어 나르지 않아도 되게 하려는 것.
- 따라서 **1p에는 AI 로딩 표현이 없다.** 누르면 즉시 라우팅되고, 로딩(스피너)은 다음 화면(1q-1의 `Loading` 상태)에서 보인다. 웹에서도 칩에 스피너를 넣지 말 것 — 다음 화면 스피너와 이중으로 뜬다.
- 칩은 `selected=false`로 고정. 눌러도 화면이 바뀌지 않으므로 선택 상태가 아니라 "누르는 조작"으로 쓴다.

### 4.5 음성 입력 (`MedicalMateVoiceInput`)

4가지 상태와 문구(전부 `strings.xml`):

| `MedicalMateVoiceState` | 제목 | 설명 |
|---|---|---|
| `IDLE` | `말씀해 주세요` | `편하게 말씀하시면 제가 정리할게요` |
| `LISTENING` | `듣고 있어요` | `다 말씀하시면 버튼을 다시 눌러주세요` |
| `PROCESSING` | `정리하는 중이에요` | `잠시만 기다려 주세요` |
| `DENIED` | `마이크를 쓸 수 없어요` | `설정에서 마이크 권한을 켜주세요` (설명이 fg/danger) |

패널 구조(세로 가운데 정렬, 간격 12): 마이크 버튼(지름 88) → 제목 `Heading/S` → 설명 `Body/S` → Ghost S 버튼 `직접 입력할게요`.
`PROCESSING`에서는 마이크 버튼이 **비활성**. `LISTENING`에서만 테두리 링 + 정지 막대 파형(애니메이션 없음).

동작(`VisitNoteViewModel` + `core/speech/Dictation`):

| 조작 | 결과 |
|---|---|
| FAB 마이크 | 권한 확인 → `voice = IDLE`로 패널 열고 `dictation.start(현재 note)`로 **바로 듣기 시작**. 패널이 뜨자마자 말하는 사람을 위해서 |
| 패널 안 마이크 | **권한 확인을 한 번 더 거친 뒤** `dictation.toggle(현재 note)` — 듣는 중이면 멈춤, 아니면 다시 듣기 |
| 권한 거부 | `viewModel.onMicDenied()` → `dictation.onDenied()` → `voice = DENIED` (패널은 열어 둔 채 왜 안 되는지 적는다) |
| `직접 입력할게요` | `dictation.stop()` + `voice = null` (적던 글은 그대로) |
| 화면 진입 | `LaunchedEffect(Unit) { checkVoice() }` → `speech.available()` → `voiceAvailable`. **권한은 여기서 묻지 않는다** |
| 받아쓰기 결과 | `onDictated { note, _ -> state.note = note }` — 인식된 글이 그대로 `note`를 덮는다 |

받아쓰기 규칙: **누를 때의 글을 기준으로 뒤에 붙인다.** 부분 결과(`Partial`)는 기준 글 + 현재 인식문, 확정 발화(`Final`)는 기준 글 자체를 갱신한다(말이 끊겼다 이어져도 앞말이 남게). 이을 때 한 칸을 넣되 이미 공백으로 끝나면 넣지 않는다.

> **FAB과 패널 마이크는 동시에 존재하지 않는다.** `voice == null && voiceAvailable`일 때만 FAB을 그린다 — 같은 조작이 화면에 둘 있으면 어느 것을 눌러야 멈추는지 알 수 없다.

### 4.6 키보드(IME) 대응

```
bringIntoViewRequester 를 OrganizeRow(= 입력창 바로 아래 줄)에 건다.
LaunchedEffect(state.note, imeBottom) { if (imeBottom > 0) bottomOfBox.bringIntoView() }
```

입력창 자체가 아니라 **바로 아래 줄**을 시야로 부른다. 입력창을 부르면 칸이 화면보다 길어졌을 때 윗변에 맞춰져 커서가 도로 가린다(#183). 웹에서는 `visualViewport.resize` + 칩 행에 `scrollIntoView({block:'nearest'})`로 같은 효과를 낸다.

### 4.7 로딩 / 빈 상태 / 에러

- 로딩: 없음. 서버를 부르지 않는다.
- 빈 상태: 별도 화면 없음. `note`가 비면 플레이스홀더가 보이고 칩·하단 CTA가 비활성(`canSave=false`)일 뿐.
- 에러: 없음. 저장 실패는 다음 화면(1q-1)에서 다룬다.

### 4.8 네비게이션

| 방향 | 트리거 | 목적지 / 값 |
|---|---|---|
| 들어옴 | 1m `완료` | `VisitNoteDestination(clinic = 고른 병원 이름, cardId, cardTitle, visitedOn)` |
| 들어옴 | 1m-12 `이 병원이 맞아요` | 같은 목적지 |
| 나감 | `저장하기` 또는 `AI로 정리하기` | `VisitRecordDestination(clinic, cardId, note = state.note, visitedOn)` |
| 나감 | NavBar 뒤로가기 | `popBackStack()` |

`VisitNoteDestination` 필드: `clinic: String?`, `cardId: String?`, `cardTitle: String?`, `visitedOn: String?` (전부 nullable).

`load(clinic, cardTitle, visitedOn)`은 **적던 글을 건드리지 않는다.** 화면이 다시 조합돼 한 번 더 불려도 `note`는 남아야 한다. `today = (visitedOn ?: 오늘) == 오늘`로 계산한다.

### 4.9 DS 컴포넌트

`MedicalMateNavBar(GLASS)`, `MedicalMateCard(QUIET)`, `MedicalMateDivider`, `MedicalMateTextArea`, `MedicalMateChip`, `MedicalMateTooltip`, `MedicalMateVoiceInput`, `MedicalMateFab`, `MedicalMateBottomCtaBar`, `MedicalMateButton`, `MedicalMateIcons.Hospital` / `.Mic`.

---

## 5. 1q-1 / 1q-1-E 자동 분류 결과 (`VisitRecordScreen` + `VisitRecordCard`)

### 5.1 상태 — `VisitRecordUiState` (sealed)

```
VisitRecordUiState
├─ Loading   (object)
├─ Failed    (object)
└─ Content(record, draft, deleteRequested, saveFailure)
```

`Content` 필드:

| 필드 | 타입 | 기본값 | 의미 |
|---|---|---|---|
| `record` | `VisitRecord` | 필수 | 원본. 편집 중에도 그대로 있다 |
| `draft` | `VisitRecordDraft?` | `null` | **있으면 편집 모드다.** 취소가 있으므로 사본을 따로 둔다 |
| `deleteRequested` | `Boolean` | `false` | 삭제 확인 대화상자(1q-1-DC)가 떠 있는지. 편집 상태와 분리 — 삭제를 취소해도 편집 모드는 남아야 한다 |
| `saveFailure` | `VisitSaveFailure?` | `null` | 저장 실패 갈래. 화면은 그대로 두고 알리기만 한다 |

> **`saving`은 UiState에 없다.** ViewModel의 private `var`이고 화면으로 나가지 않는다. 그래서 **저장 중 표현이 아예 없다** — 버튼 라벨도 그대로, 비활성도 안 되고, 스피너도 없다. 중복 저장은 눌림 자체를 막는 게 아니라 두 번째 호출이 `return`으로 빠지는 방식으로 막는다. 웹에서 버튼을 disable하면 안드로이드와 보이는 것이 달라진다(→ 11장 판단 필요).

파생값:

| 이름 | 식 |
|---|---|
| `editing` | `draft != null` |
| `items` | `draft?.items ?: record.items` (그릴 항목) |
| `changed` | `draft != null && draft.items != record.items` (Nav 우측이 `취소`→`확인`으로 바뀌는 기준) |

`VisitRecordDraft`: `items: List<VisitRecordItem>` **한 필드뿐.** 원문 메모는 담지 않는다 — "AI 정리는 고치되 환자가 적은 말은 남는다"는 P2 원칙이라 편집 모드에서도 메모 블록에는 ×도 입력도 없다.

`VisitSaveFailure`: `RETRYABLE` | `REJECTED`. 둘을 한 문구로 묶으면 영영 안 되는 실패에도 "다시 눌러주세요"가 나오고, 실제로 기기에서 같은 400을 다섯 번 누르게 됐다(#220).

- `RETRYABLE` = 서버에 닿지 못했거나 서버가 **잠시** 받지 못한 경우.
- `REJECTED` = 이 요청 자체를 받지 않는 경우. **소스 KDoc 기준으로 서버가 이 자리에서 거절하는 것은 `확정하지 않은 카드`뿐이다** — "카드에 기록이 이미 있는 경우"는 재방문마다 따로 남게 되면서 사라졌다(Backend#121). 문구(`브리핑 카드를 먼저 저장해야 기록을 남길 수 있어요`)도 그 하나를 가리킨다.
  > 테스트 주석에는 아직 "카드에 이미 기록이 있으면 400"(Backend#119)이 남아 있다. **UiState의 KDoc이 더 최신이고 문구와도 맞으므로 그쪽을 따랐다.**

`VisitRecord`:

| 필드 | 타입 | 기본값 | 의미 |
|---|---|---|---|
| `id` | `String` | 필수 | 1q-1에서 새로 만들 때는 `""` (아직 서버 id가 없다) |
| `clinic` | `String?` | 필수 | 병원 **이름만**. 저장 요청의 `clinicName` |
| `clinicLine` | `String` | 필수 | 화면에 그리는 머리줄 `서울OO병원 내과 · 2026.09.12` |
| `items` | `List<VisitRecordItem>` | 필수 | 나눈 줄. **개수 고정 아님** |
| `memo` | `String` | 필수 | 원문 메모(1p에서 적은 글) |
| `classifiedCount` | `Int?` | `null` | AI가 몇 가지로 나눴는지. **null이면 캡션 줄을 안 그린다** |
| `patientNotes` | `List<String>` | `emptyList()` | 어느 항목에도 안 들어간 문장. 저장 요청에 그대로 실린다 |
| `followUp` | `VisitFollowUp?` | `null` | AI가 뽑은 재방문 날짜. 저장되면 이 날짜로 일정이 만들어진다(#245) |

`VisitRecordItem`:

| 필드 | 타입 | 기본값 | 의미 |
|---|---|---|---|
| `key` | `String` | 필수 | 화면에 적는 이름(`소견`/`검사`/`약`/`재방문`, 모르는 축이면 축 id 그대로) |
| `value` | `String` | 필수 | 값. 여러 줄(`\n`) 가능 |
| `tone` | `Tone` | `DEFAULT` | `DEFAULT` \| `LINK`. `LINK`는 브랜드색(`fg/link`) |
| `axis` | `String` | `""` | **서버 축 id.** 표시와 저장을 분리하려고 따로 든다(#178) |

```ts
type Tone = 'DEFAULT' | 'LINK';

interface VisitRecordItem { key: string; value: string; tone: Tone; axis: string; }
interface VisitFollowUp { date: string; text?: string | null; approximate: boolean; }

interface VisitRecord {
  id: string;
  clinic: string | null;
  clinicLine: string;
  items: VisitRecordItem[];
  memo: string;
  classifiedCount: number | null;
  patientNotes: string[];
  followUp: VisitFollowUp | null;
}

type VisitSaveFailure = 'RETRYABLE' | 'REJECTED';

type VisitRecordUiState =
  | { kind: 'Loading' }
  | { kind: 'Failed' }
  | {
      kind: 'Content';
      record: VisitRecord;
      draft: { items: VisitRecordItem[] } | null;
      deleteRequested: boolean;
      saveFailure: VisitSaveFailure | null;
    };
```

### 5.2 "4칸(소견·검사·약·재방문)"의 정확한 의미 — 주의

시안 표현은 4칸이지만 **구현은 고정 4칸이 아니다.**

- `classifiedItems()`는 AI가 찾은 축만 그 차례대로 줄로 만든다. **못 찾은 항목은 빈 줄이 아니라 없는 줄이다** — 서버도 키 자체를 보내지 않는다.
- **하나도 못 나눴으면 줄이 아예 없고** 카드에는 머리줄 + 원문 메모만 남는다. 전에는 빈 네 자리를 열었는데 "네 항목을 묻고는 아무 답도 못 내놓는 모양"이라 걷어냈다.
- **AI가 축을 늘리면 그 줄도 그린다.** 아는 축(`AXIS_ORDER`)을 먼저 그 순서대로, 모르는 축을 뒤에 응답 순서대로 붙인다. 모르는 축의 이름은 축 id 그대로 쓴다(테스트: `referral` 축이 `큰 병원 가보래요`로 그대로 선다).
- 편집은 **있는 줄을 고치고 ×로 지우기만 한다. 줄을 새로 만들 수 없다**(그 자리는 #184로 열려 있음). 그래서 분류 실패 시 손으로 채울 자리가 없다.

축 정의(`VisitMapping.kt`):

| 축 id (`axis`) | 화면 이름 (`key`) | 그리는 차례 |
|---|---|---|
| `findings` | `소견` | 1 |
| `tests` | `검사` | 2 |
| `medication_instructions` | `약` | 3 |
| `follow_up` | `재방문` | 4 (유일하게 `Tone.LINK`) |
| 그 외 | 축 id 그대로 | 5부터, 응답 순서 |

**1q-1이 `VisitRecord`를 만드는 식(`newRecord`) 전량:**

```
id              = ""                                   ← 아직 서버 id가 없다
clinic          = 라우트의 clinic (그대로)
clinicLine      = listOfNotNull(clinic, visitedOn.format("yyyy.MM.dd")).joinToString(" · ")
                  ※ clinic 이 null 이면 "2026.09.12" 한 조각만 남는다(테스트 고정)
items           = classifiedItems(classified)          ← AI가 찾은 축만
memo            = 라우트의 note (1p 원문)
classifiedCount = classified?.items?.size?.takeIf { it > 0 }
                  ※ 캡션의 수 = 그린 줄의 수다. 별도 집계가 아니다
patientNotes    = classified?.patientNotes.orEmpty()
followUp        = classified?.followUp
```

**화면을 열 때(`VisitRecordViewModel.load`) 도는 것 — 전량:**

```
visitedOn = 라우트 값 ?: 오늘            ← 라우트가 null일 때만 오늘
state = Loading                          ← 동기적으로 먼저 바뀐다
launch {
  classified =
     note.isBlank() ? null               ← **빈 메모면 classify를 아예 부르지 않는다**
                    : (repository.classify(note, visitedOn, clinic, labels) as? Success)?.value
                      ※ Rejected/NetworkUnavailable 이면 null. 실패해도 예외가 아니다
  labels = classified?.labels ?: labels   ← 실패하면 **직전 labels를 그대로 들고 있는다**
  state = Content(record = newRecord(...))
}
```

- `labels`는 ViewModel의 private 필드이고 화면에 나가지 않는다. 다시 나눌 때(`다시 시도`) 함께 보내 AI 모델 호출을 아끼는 용도다. 비어 있으면 요청에서 통째로 빠진다(`takeIf { it.isNotEmpty() }`).
- **어떤 갈래로도 `Failed`가 되지 않는다**(5.9의 주의 참고).

### 5.3 레이아웃 (위 → 아래)

```
┌ NavBar (GLASS)  title = "진료 후 기록"
│    우측 액션(Content일 때만):
│      !editing            → "편집"   → onEditClick
│      editing && changed  → "확인"   → onEditDoneClick
│      editing && !changed → "취소"   → onCancelClick
├ 본문
│   Loading  → MedicalMateLoadingSpinner (weight 1, 세로 가운데, 24px 원형, bg/primary, 메시지 없음)
│   Failed   → MedicalMateEmptyState(NO_RESULT) + "다시 시도" 버튼 (weight 1, 가운데)
│   Content  → 세로 스크롤 Column (좌우 20 / 상하 12) 안에 VisitRecordCard 한 장
└ 하단 CTA 바 (Content일 때만)
     editing  → MedicalMateButton(type = DANGER, fillMaxWidth) "진료 후 기록 삭제"
     !editing → (saveFailure 있으면) 경고 문구 Body/S · fg/danger
                MedicalMateButton(fillMaxWidth) "저장하기"    ← enabled 조건 없음
```

`VisitRecordCard` 내부(Figma `587:3134`):

```
MedicalMateCard (기본 emphasis = DEFAULT: bg/surface + 카드 그림자, radius 20, padding 20, 자식 간격 6)
  편집 중이면 카드 전체에 2dp border/focus 테두리를 두른다.
  (값마다 밑줄이 생기지만 밑줄만으로는 몇 줄이 열렸는지 안 보인다 — 1e-1-E와 같은 처리)

 ① Head
     - "진료 후 기록"     Heading/S, fg/default, fillMaxWidth
     - clinicLine        Body/S, fg/subtle       예: "서울OO병원 내과 · 2026.09.12"
     ※ 카드 안에 연필(편집 진입)이 없다. Nav 우측 "편집" 한 자리로 옮겼다
 ② MedicalMateDivider
 ③ 항목 줄들 (items 순서대로)
     읽기 모드:  MedicalMateKvRow(key, value, type)
        type =  LINK    (item.tone == LINK, 즉 재방문)
                DEFAULT (그 외)
        구조: Row(min 높이 54, 요소 간격 16)
              ├ key   폭 고정 72dp, Body/M, fg/subtle
              └ value Body/L, 색 = LINK면 fg/link, 아니면 fg/default
     편집 모드:  MedicalMateEditingKvRow(key, value, onValueChange, delete)
        구조: Row
              ├ KvRow(type = EDITING, weight 1)  ← 값이 그 자리에서 입력이 되고 아래에 border/strong 밑줄
              └ × IconButton (size = S: 32 상자 / 18 아이콘)
                  aria-label = "{key} 항목 삭제"
 ④ 원문 메모  ─ record.memo 가 blank 면 통째로 생략(저장된 기록에 원문이 없을 수 있다, #256)
     - items 가 하나라도 있으면 그 앞에 MedicalMateDivider
     - "진료 메모"                Label/S, fg/subtle
     - MedicalMateQuoteBlock
         배경 bg/primary-subtle(= 환자 버블과 같은 색), radius 12, padding 12, 간격 4
         ├ 라벨 "내가 적은 그대로"   Label/S, fg/primary
         └ 본문 memo                Body/S, fg/default
     ※ 편집 모드에서도 이 블록은 입력도 ×도 없다
 ⑤ 캡션  ─ classifiedCount != null && !editing 일 때만
     Row(SpaceBetween, 세로 가운데)
       ├ "AI가 메모를 {4}가지로 나눴어요"   Body/S, fg/subtle
       └ MedicalMateTooltip
            본문: "소견·검사·약·재방문으로 나눴어요. 원문 메모도 함께 남아요"
            트리거 aria-label: "분류 기준 설명"
```

화면이 받는 조작은 `VisitRecordCallbacks` 한 덩어리다(전부 기본값 `{}` / 빈 `VisitRecordEditActions`):

| 콜백 | 붙는 자리 |
|---|---|
| `onBackClick` | NavBar 뒤로가기 |
| `onEditClick` / `onEditDoneClick` / `onCancelClick` | NavBar 우측 한 자리(상태에 따라 셋 중 하나) |
| `edit: VisitRecordEditActions` | 항목 줄의 값 입력과 × |
| `onSaveClick` | 하단 `저장하기` (읽기 모드) |
| `onDeleteClick` | 하단 `진료 후 기록 삭제` (편집 모드) |
| `onDeleteDismiss` / `onDeleteConfirm` | 삭제 대화상자의 `취소` / `삭제` |
| `onRetryClick` | `Failed` 화면의 `다시 시도` |

`VisitDetailScreen`은 이 객체를 **빈 채로**(`VisitRecordCallbacks()`) 같은 카드에 넘긴다 — 그래서 편집 줄도 ×도 열리지 않는다.

> **읽기 모드에서 일정 등록 체크박스가 없다.** 시안에서 빠졌고(#170), 저장 요청에 재방문 날짜를 실을 자리가 없어 눌러도 아무 일이 없던 자리였다. 재방문이 캘린더로 이어지는 길은 일자 화면의 "다음 일정"(1r-2-A)과 저장 직후의 `FollowUpScheduler`가 맡는다.

### 5.4 문구 전량

| 위치 | 리소스 | 값(문자 그대로) |
|---|---|---|
| NavBar 제목 | `visit_record_title` | `진료 후 기록` |
| 카드 제목 | `visit_record_card_title` | `진료 후 기록` |
| Nav 우측 | `visit_record_edit` | `편집` |
| Nav 우측 | `visit_record_edit_done` | `확인` |
| Nav 우측 / 대화상자 | `visit_record_cancel` | `취소` |
| 메모 라벨 | `visit_record_memo` | `진료 메모` |
| 인용 라벨 | `visit_record_memo_quote` | `내가 적은 그대로` |
| 캡션 | `visit_record_caption` | `AI가 메모를 %1$d가지로 나눴어요` |
| 캡션 툴팁 | `visit_record_caption_tooltip` | `소견·검사·약·재방문으로 나눴어요. 원문 메모도 함께 남아요` |
| 캡션 툴팁 이름 | `visit_record_caption_tooltip_label` | `분류 기준 설명` |
| 항목 × 접근성 | `visit_record_item_delete` | `%1$s 항목 삭제` |
| 하단(읽기) | `visit_record_save` | `저장하기` |
| 하단(편집) | `visit_record_delete` | `진료 후 기록 삭제` |
| 대화상자 제목 | `visit_record_delete_title` | `이 진료 후 기록을 삭제할까요?` |
| 대화상자 본문 | `visit_record_delete_body` | `원문 메모까지 사라지고 되돌릴 수 없어요.` |
| 대화상자 확인 | `visit_record_delete_confirm` | `삭제` |
| 실패 화면 제목 | `visit_record_failed_title` | `기록을 정리하지 못했어요` |
| 실패 화면 설명 | `visit_record_failed_description` | `인터넷 연결을 확인하고 다시 시도해주세요` |
| 실패 화면 버튼 | `visit_record_retry` | `다시 시도` |
| 저장 실패(재시도 가능) | `visit_record_save_failed` | `저장하지 못했어요. 다시 눌러주세요.` |
| 저장 실패(거절) | `visit_record_save_rejected` | `다시 눌러도 저장되지 않아요. 브리핑 카드를 먼저 저장해야 기록을 남길 수 있어요.` |

### 5.5 편집 모드 (1q-1-E) 동작

| 조작 | 결과 |
|---|---|
| Nav `편집` | `draft = VisitRecordDraft.of(record)` — 카드 안 모든 값이 한 번에 열린다 |
| 값 입력 | `editActions.onItemValueChange(index, value)` — **사본만** 바뀐다. 범위 밖 index는 무시 |
| 줄 × | `editActions.onItemDeleteClick(index)` — 사본에서 해당 줄 제거. **확인 대화상자 없음** (개체가 아니라 안의 항목이고, `취소`가 실행 취소를 대신한다) |
| Nav `확인`(changed일 때) | `record = record.copy(items = draft.items)`, `draft = null`. **서버 저장은 아직 없다** |
| Nav `취소`(변경 없음) | `draft = null` — 사본을 버린다 |
| 하단 `진료 후 기록 삭제` | `deleteRequested = true` (대화상자만 띄운다) |

편집 모드에서 **하단 `저장하기`가 없다.** 그 자리는 삭제이고, 사본을 옮기는 것은 Nav 우측 `확인`이 한다 — 둘을 함께 두면 같은 일이 두 번이 된다.

`VisitRecordEditActions`는 별도 클래스다. 화면 조작이 이미 여덟 가지라 사본 조작까지 ViewModel에 얹으면 한 클래스가 열 가지를 넘어서다. **원문 메모를 고치는 조작은 존재하지 않는다.**

### 5.6 삭제 흐름 (1q-1-DC)

```
편집 모드 하단 "진료 후 기록 삭제"
   → deleteRequested = true
   → MedicalMateDialog (radius 24, 폭 고정, 가운데 정렬, tone = DANGER)
        제목  "이 진료 후 기록을 삭제할까요?"
        본문  "원문 메모까지 사라지고 되돌릴 수 없어요."
        확인  "삭제"    → onDeleteConfirm
        취소  "취소"    → onDeleteDismiss
   취소 → deleteRequested = false (편집 모드는 남는다)
   삭제 → ViewModel: deleteRequested = false, draft = null
          그리고 Route가 onDeleted() 호출 → 캘린더 일자까지 popBackStack
```

> **서버 삭제는 아직 붙어 있지 않다.** `VisitRecordViewModel.onDeleteConfirm()`은 대화상자를 닫고 편집 모드를 내리기만 한다. API(`DELETE /api/visits/{visitId}`)와 `VisitRepository.delete/deleteAll`은 이미 있으나 이 화면이 부르지 않는다(1q-1은 아직 저장 전 상태라 지울 id가 없기도 하다). 웹에서는 **"삭제 = 이 흐름을 버리고 캘린더로 돌아가기"** 로 구현하는 것이 현재 동작과 같다.
> 한 단계만 pop하지 않는 이유: 방금 적은 메모 화면(1p)으로 돌아가면 거기서 저장할 때 지운 것을 다시 만든다.

### 5.7 저장 흐름 (`onSaveClick`)

```
전제: content != null && cardId?.toLongOrNull() != null && !saving
      (하나라도 어긋나면 아무 일도 하지 않는다 — 버튼은 눌리지만 무반응)
1) saving = true, saveFailure = null   ← 다시 누르면 실패 표시부터 지운다
2) POST /api/cards/{cardId}/visit  with record.toNewVisit(visitedOn)
3) 성공이면 재방문 일정 생성 시도 (5.8)
4) saving = false
5) 결과:
   Success             → onSaved() → 캘린더 일자(CalendarDayDestination)까지 popBackStack
   NetworkUnavailable  → saveFailure = RETRYABLE
   Rejected(retryable=true)  → saveFailure = RETRYABLE
   Rejected(retryable=false) → saveFailure = REJECTED
```

`saving` 가드가 중복 저장을 막는다 — 저장하기를 두 번 누르면 기록이 두 개 생긴다.

**요청 본문을 만드는 규칙(`VisitRecord.toNewVisit`)** — 웹에서 그대로 옮겨야 한다:

```
clinicName   = record.clinic
visitedOn    = 흐름이 시작된 캘린더 일자 (오늘이 아님)
items        = record.items 중 axis 가 blank 가 아니고 value 도 blank 가 아닌 것만
               → NewVisitItem(axis, value)
               ※ 지운 줄과 비운 줄은 보내지 않는다. "안 적은 것"과 "빈 문자열"은 다르고,
                 빈 줄을 보내면 서버가 UNKNOWN으로 박는다
followUp     = record.followUp
patientNotes = record.patientNotes
rawNote      = record.memo
status / source 는 보내지 않는다 — 서버가 정한다(값 있으면 FILLED, 출처는 PATIENT_EDIT)
```

추가로 Repository 단계에서 **재방문 줄의 값에서 화면이 붙인 날짜를 뗀다**(5.8).

테스트가 고정한 실제 페이로드 예:

```
cardId = 3
clinicName = "서울OO병원 내과"
visitedOn  = 2026-09-12
items = [ findings→"위염 초기 소견", tests→"혈액검사 시행",
          medication_instructions→"2주분 처방", follow_up→"2주 뒤" ]
rawNote = (1p에서 적은 원문)
```

### 5.8 재방문 날짜 자동 추출 — 전체 경로

이 도메인에서 가장 헷갈리는 부분이라 순서대로 적는다.

**① 서버가 뽑는다.** `POST /api/visits/classify` 응답의 `followUp: { date, text, approximate }`.
`approximate = true`는 환자가 "2주 뒤"처럼 **범위로** 말한 것이다.

**② 화면 값으로 옮기면서 재방문 줄에 날짜를 덧붙인다** (`withRevisitDate`):

```
note = "(" + date.format("M월 d일") + (approximate ? " 전후" : "") + ")"
axis == "follow_up" 인 줄의 value 뒤에 " " + note 를 붙인다
```

| 입력 | 출력 |
|---|---|
| value `2주 뒤`, followUp `2026-09-27`, approximate=false | `2주 뒤 (9월 27일)` |
| value `2주 뒤`, followUp `2026-09-27`, approximate=true | `2주 뒤 (9월 27일 전후)` |
| value `2주 뒤`, followUp = null | `2주 뒤` (그대로) |
| value `2주 뒤 (9월 27일 전후)` (이미 붙어 있음) | 그대로 — **두 번 붙이지 않는다**(#245) |
| `findings` 같은 다른 축 | 절대 붙이지 않는다 |

축의 값만으로는 달력의 어느 날인지 알 수 없고, 날짜만 적으면 환자가 한 말이 사라진다. 둘을 함께 적는다.

**③ 저장할 때 다시 뗀다** (`String.withoutRevisitNote`, Repository 안):

```
value.removeSuffix(" " + note).removeSuffix(note)
```

서버에는 환자가 말한 값만 간다. 날짜는 `followUp` 필드가 따로 나르고, 값에 박아 보내면 다시 읽을 때 붙이는 날짜와 겹친다.

**④ 저장에 성공하면 앱이 일정을 만든다**(`FollowUpScheduler`, #245):

```
on = record.followUp?.date  (없으면 아무것도 안 함)
if (!on.isAfter(visitedOn)) return   ← 지난 날짜는 예정이 아니다
followUpScheduler.schedule(record.clinic, on, cardId)
```

- 서버는 기록에서 일정을 만들지 않는다. 문서가 "환자가 보고 등록하는 흐름"으로 못 박았고, AI가 날짜를 잘못 뽑아도 조용히 일정이 생기면 안 된다. **1q-1의 재방문 줄에 날짜가 보이고 고칠 수 있으니 저장이 곧 확인**이라는 논리로 앱이 만든다.
- `clinic`이 없으면 만들지 않는다(서버가 일정에 병원을 요구).
- **실패해도 저장은 성공이다.** 기록이 본체고 일정은 덧붙이는 것이라 구현이 실패를 삼킨다.
- 만들어진 일정은 돌아가는 캘린더 일자 화면의 "다음 일정"에 바로 선다.

### 5.9 로딩 / 빈 상태 / 에러

| 상태 | 화면 |
|---|---|
| `Loading` | `MedicalMateLoadingSpinner`가 NavBar 아래 남은 높이 전부를 받아 세로 가운데. 24px 원형 인디케이터(bg/primary), **메시지 문구 없음**. 하단 CTA 바도 없다 |
| `Failed` | `MedicalMateEmptyState(NO_RESULT)` + 제목 `기록을 정리하지 못했어요` / 설명 `인터넷 연결을 확인하고 다시 시도해주세요` / 버튼 `다시 시도`. 하단 CTA 바 없음 |
| 분류 0건(빈 결과) | **`Failed`가 아니다.** `Content`로 열리되 항목 줄이 하나도 없고, 카드에는 머리줄 + 원문 메모만 남는다. 캡션 줄도 없다(`classifiedCount = null`) |
| 메모가 blank | classify를 부르지 않고 바로 `Content`. 위와 같은 모양이 되고, 원문 블록마저 없어 카드에 머리줄만 남는다 |
| **저장 중** | **표현 없음.** `saving`이 UiState 밖이라 버튼은 그대로 활성이고 스피너도 없다. 사용자가 보기에 아무 일도 일어나지 않는 구간이 왕복만큼 있다 |
| 저장 실패 | 화면 유지 + 하단 버튼 **위에** 경고 문구 한 줄(Body/S, fg/danger). 토스트·대화상자 아님. 다시 누르면 문구부터 지워진다 |

> **주의: 현재 `VisitRecordViewModel.load()`는 절대 `Failed`를 만들지 않는다.** classify가 실패해도 `classified = null`로 두고 `Content`를 연다("나누지 못해도 화면은 연다" — 환자가 방금 적은 메모를 잃으면 안 되므로). 그래서 1q-1에서 `Failed`/`다시 시도`는 사실상 도달하지 않는 분기이고, 실제로 쓰이는 곳은 **기록 상세**(6장)다. 웹에서도 같은 판단을 유지할 것.

### 5.10 네비게이션

| 방향 | 트리거 | 목적지 |
|---|---|---|
| 들어옴 | 1p `저장하기` / `AI로 정리하기` | `VisitRecordDestination(clinic, cardId, note, visitedOn)` |
| 나감 | `저장하기` **성공** | `popBackStack<CalendarDayDestination>(inclusive = false)` — 흐름이 시작된 캘린더 일자로. 그 화면이 다시 읽으면서 방금 남긴 기록이 "이 날 기록"으로 선다 |
| 나감 | 대화상자 `삭제` | 같은 곳(캘린더 일자)까지 pop |
| 나감 | NavBar 뒤로가기 | `popBackStack()` — 1p로. **편집 중에도 막지 않는다.** `onLeadingClick`에 조건이 없어 사본(`draft`)이 확인 없이 버려진다 |
| 화면 안 | `편집` / `확인` / `취소` / 줄 × / 값 수정 | **이동 없음.** 같은 목적지의 모드 전환 |
| 화면 안 | `다시 시도` | `viewModel.load(...)` 재호출 |

`VisitRecordDestination` 필드: `clinic: String?`, `cardId: String?`, `note: String = ""`, `visitedOn: String?`.
`note`를 라우트로 나르는 이유: 이 화면이 그 글을 그대로 아래에 보여주고 저장 때 `rawNote`로 함께 보낸다. 흐름을 한 목적지로 합치면 1p에서 뒤로 갈 자리가 사라진다.

### 5.11 DS 컴포넌트

`MedicalMateNavBar(GLASS, actionLabel)`, `MedicalMateCard`, `MedicalMateDivider`, `MedicalMateKvRow(DEFAULT/LINK/EDITING)`, `MedicalMateEditingKvRow` + `MedicalMateRowDelete`, `MedicalMateIconButton(size=S)`, `MedicalMateQuoteBlock`, `MedicalMateTooltip`, `MedicalMateLoadingSpinner`, `MedicalMateEmptyState(NO_RESULT)`, `MedicalMateDialog`, `MedicalMateBottomCtaBar`, `MedicalMateButton`(기본 / `DANGER`).

---

## 6. 진료 후 기록 상세 (`VisitDetailScreen`)

### 6.1 무엇이 다른가

저장한 진료 후 기록 **하나**를 id로 읽어 1q-1과 **같은 카드**를 그린다. 다른 점은 셋뿐:

1. NavBar 우측에 `편집`이 **없다** (→ 편집 모드로 들어갈 길이 화면에 없다)
2. 하단 CTA 바가 **없다** (저장도 삭제도 없다)
3. `classifiedCount`를 채우지 않아 **캡션 줄이 없다** — "AI가 메모를 4가지로 나눴어요"는 나눈 그 자리에서 하는 말이고, 저장한 뒤 다시 보는 자리에서는 항목이 곧 결과다

> **저장한 기록은 고치지 않는다**(#235). 그래서 `VisitRecordViewModel`을 재사용하지 않고 `VisitDetailViewModel`을 따로 뒀다.

카드 컴포저블에 콜백을 하나도 넘기지 않는다(`VisitRecordCallbacks()` 빈 객체) — 사본이 없어 편집 줄이 열리지 않고 ×도 붙지 않는다.

### 6.2 상태

`VisitRecordUiState`를 **그대로 공유**한다. `Content`에 `draft`가 늘 `null`이라 항상 읽기 모드다.

### 6.3 레이아웃

```
┌ NavBar (GLASS, 뒤로가기만)  title = "진료 후 기록" (visit_record_title)  ※ 우측 액션 없음
└ 본문
    Loading → MedicalMateLoadingSpinner (weight 1)
    Failed  → MedicalMateEmptyState(NO_RESULT)
                제목 "기록을 불러오지 못했어요"   ← 1q-1과 다른 문자열(visit_detail_failed_title)
                설명 "인터넷 연결을 확인하고 다시 시도해주세요"
                버튼 "다시 시도"
    Content → 세로 스크롤 Column(좌우 20 / 상하 12) 안에 VisitRecordCard 한 장
   (하단 CTA 바 없음)
```

### 6.4 서버 → 카드 매핑 (`Visit.toRecord()`)

| `VisitRecord` 필드 | 값 |
|---|---|
| `id` | `visit.id` |
| `clinic` | `visit.clinic` |
| `clinicLine` | `listOfNotNull(clinic, visitedOn?.format("yyyy.MM.dd")).joinToString(" · ")` |
| `items` | `visit.items` 를 `VisitRecordItem(key = label, value, tone = axis=="follow_up" ? LINK : DEFAULT, axis)` 로. **값에는 `VisitMapping.withRevisitDate`가 이미 `(9월 27일 전후)`를 붙여 두었다** — 이 함수는 붙이지 않는다 |
| `memo` | `visit.rawNote ?: ""` — **비면 카드가 원문 블록을 안 그린다**(#256) |
| `classifiedCount` | 채우지 않음(null) |
| `patientNotes` | `visit.patientNotes` |
| `followUp` | `visit.followUp` |

로드 규칙: `visitId.toLongOrNull()`이 null이면 서버를 부르지 않고 바로 `Failed`. 성공이면 `Content`, 그 외(`Rejected`/`NetworkUnavailable`) 전부 `Failed`.

### 6.5 네비게이션

| 방향 | 트리거 | 목적지 |
|---|---|---|
| 들어옴 | 캘린더 일자의 "이 날 기록" 줄 클릭 | `VisitDetailDestination(visitId)` |
| 나감 | 뒤로가기 | `popBackStack()` |
| 화면 안 | `다시 시도` | `viewModel.load(visitId)` |

> 기록 탭의 상세(1j-3, `RecordDetailDestination`)와는 다른 화면이다. 1j-3은 카드·기록·예정을 타임라인으로 모아 보이는 자리고, 이쪽은 그 날의 기록 **하나**를 보는 자리다.

---

## 7. API 계약

### 7.1 엔드포인트 (`VisitApi`, `HospitalApi`)

| 메서드 | 경로 | 이 문서의 화면에서 쓰는 곳 |
|---|---|---|
| `GET` | `/api/hospitals?q={query}&size={size}` | 1m 병원 검색 (`size` 고정 20) |
| `POST` | `/api/visits/classify` | 1q-1 진입 시 메모 분류 (저장하지 않음) |
| `POST` | `/api/cards/{cardId}/visit` | 1q-1 `저장하기` |
| `GET` | `/api/visits/{visitId}` | 진료 후 기록 상세 |
| `GET` | `/api/me/visits` | (기록 목록 — 이 문서 범위 밖이지만 같은 Api) |
| `GET` | `/api/cards/{cardId}/visits` | (카드별 기록 — 범위 밖) |
| `DELETE` | `/api/visits/{visitId}` | Repository에는 있으나 **1q-1은 아직 부르지 않는다** |

> 녹음은 저장하지 않는다. 오디오 컬럼 자체가 없고, 음성으로 적어도 변환한 글만 간다.

### 7.2 `GET /api/hospitals`

요청 쿼리:

| 이름 | 타입 | 값 |
|---|---|---|
| `q` | string | 검색어(trim한 값). **빈 값으로는 부르지 않는다** — 서버 필수이고 부분 일치라 수천 건이 온다 |
| `size` | int | `20` 고정 (`PAGE_SIZE`) |

응답 `HospitalSearchResponse`:

| 필드 | 타입 | 기본 | 비고 |
|---|---|---|---|
| `hospitals` | `HospitalResponse[]` | `[]` | |
| `totalCount` | int | `0` | 조건에 맞는 전체 건수. 받은 목록보다 클 수 있다 |

`HospitalResponse`: `{ name: string, address?: string|null }` — **id 없음.** 원천이 심평원 병원정보서비스이고 서버가 목록을 들고 있지 않다. `address`는 우리가 요청해서 홈페이지 자리를 대신한 필드(Backend#80)로, 같은 이름의 다른 지점을 구별할 수 있는 유일한 값이다.

### 7.3 `POST /api/visits/classify`

요청 `ClassifyMemoRequest`:

| 필드 | 타입 | 비고 |
|---|---|---|
| `memo` | string | 1p에서 적은 원문 |
| `visitedOn` | string? | ISO `yyyy-MM-dd` |
| `clinicName` | string? | 병원 이름 |
| `labels` | `Map<string,string>?` | **직전 응답의 분류. 있으면 반드시 함께 보낸다.** 안 보내면 AI 모델 호출이 다시 나가고 비용이 서버 크레딧과 같은 주머니에서 빠진다. 보내면 모델을 부르지 않고 재조립만 한다. 비어 있으면 아예 안 보낸다(`takeIf { it.isNotEmpty() }`) |

응답 `ClassifyMemoResponse`:

| 필드 | 타입 | 기본 | 비고 |
|---|---|---|---|
| `axes` | `Map<string, VisitAxisResponse>` | `{}` | 축 id → 축. **못 찾은 항목은 빈 값이 아니라 키 자체가 없다** |
| `sentences` | `string[]` | `[]` | 메모를 문장으로 나눈 것. 인덱스가 `labels`의 키 |
| `labels` | `Map<string,string>` | `{}` | 다음 요청에 돌려보낼 분류 |
| `patientNotes` | `string[]` | `[]` | 어느 항목에도 안 들어간 문장 |
| `followUp` | `FollowUpResponse?` | `null` | |

`VisitAxisResponse`: `{ axis?: string, status?: string, value?: string, evidence: string[], source?: string }`
→ 화면은 `value`만 쓴다. **`value`가 blank인 축은 줄로 만들지 않는다.**

`FollowUpResponse`: `{ date?: string, text?: string, approximate: boolean = false }`
→ `date`가 없으면 `VisitFollowUp` 자체를 만들지 않는다(= 날짜 부착도, 일정 생성도 없음).

### 7.4 `POST /api/cards/{cardId}/visit`

경로: `cardId` (Long). **확정한 카드에만** 남길 수 있고 카드 하나에 기록 하나다.

요청 `CreateVisitRequest`:

| 필드 | 타입 | 기본 | 비고 |
|---|---|---|---|
| `clinicName` | string? | null | |
| `visitedOn` | string? | null | ISO `yyyy-MM-dd` |
| `axes` | `VisitAxisRequest[]` | `[]` | `{ axis: string, value: string }`. 값이 있는 줄만 |
| `followUp` | `FollowUpRequest?` | null | `{ date?: string, text?: string, approximate: boolean }` |
| `patientNotes` | `string[]` | `[]` | |
| `rawNote` | string? | null | 원문 메모 |

**`status`와 `source`를 보내지 않는다.** 값이 있으면 `FILLED`, 비었으면 `UNKNOWN`이고 출처는 서버가 `PATIENT_EDIT`로 박는다. 앱이 "AI가 뽑았다"고 주장할 수 있으면 의사 화면의 출처 표시가 의미를 잃는다.

**모든 항목이 선택이라 `rawNote`만 적어도 저장된다.** 병원을 막 나온 사람에게 필수 입력을 요구하면 아무것도 안 남는다.

응답: `VisitResponse`.

### 7.5 `GET /api/visits/{visitId}` → `VisitResponse`

| 필드 | 타입 | 기본 | 비고 |
|---|---|---|---|
| `visitId` | long | 필수 | |
| `cardId` | long? | null | 카드를 지워도 기록은 남고 연결만 끊긴다 |
| `clinicName` | string? | null | |
| `visitedOn` | string? | null | |
| `axes` | `Map<string, VisitAxisResponse>` | `{}` | **가변**(#178). 전에는 `whatWasDone`/`result`/`prescription` 셋 고정이었다 |
| `followUp` | `FollowUpResponse?` | null | |
| `patientNotes` | `string[]` | `[]` | |
| `rawNote` | string? | null | **상세에만 온다.** 목록에는 없다 |

### 7.6 `GET /api/me/visits` · `GET /api/cards/{cardId}/visits` → `VisitSummaryResponse[]`

| 필드 | 타입 | 비고 |
|---|---|---|
| `visitId` | long | |
| `cardId` | long? | |
| `cardTitle` | string? | 카드를 만들 때 박아둔 값이라 연결이 끊겨도 남는다 |
| `clinicName` | string? | |
| `visitedOn` | string | 필수 |
| `followUp` | `FollowUpResponse?` | 상세와 같은 모양(Backend#101) |

최근 진료일 순. 원문(`rawNote`)이 담기지 않는다.
`cardVisits`는 체인의 아무 카드 id나 받는다 — 재방문 전에 카드를 고치면 기록들이 서로 다른 카드 행에 붙는데 서버가 문답 단위로 모아 준다(Backend#121). **`/api/me/visits`를 `cardId`로 걸러 대신 쓰면 안 된다.**

### 7.7 `VisitMapping` — DTO ↔ 화면 값 대응 (한곳에 모인 이유)

서버가 계약을 바꾸면 고칠 곳이 여기 하나가 되도록 모은다. 실제로 2026-09-13에 고정 세 필드가 축 맵으로 바뀌었고(#178) 그때 화면과 ViewModel은 손대지 않았다.

| 함수 | 입력 → 출력 | 규칙 |
|---|---|---|
| `VisitResponse.toVisit()` | DTO → `Visit` | `id = visitId.toString()`, `items = axes.toItems().withRevisitDate(followUp)` |
| `ClassifyMemoResponse.toClassification()` | DTO → `VisitClassification` | 같은 `toItems` + `withRevisitDate`, `labels` 보관 |
| `VisitSummaryResponse.toListItem()` | DTO → `VisitListItem` | `cardTitle`은 `orEmpty()` |
| `Map<String, VisitAxisResponse>.toItems()` | 맵 → `List<VisitItem>` | ① `value`가 blank/없으면 **버린다** ② 아는 축(`AXIS_ORDER`)을 그 순서대로 먼저 ③ 모르는 축을 뒤에 응답 순서대로 ④ 이름은 `axisLabel(axis)`, 모르면 축 id 그대로 |
| `withRevisitDate(followUp)` | 줄 목록 → 줄 목록 | `follow_up` 줄에만 `(M월 d일[ 전후])`를 뒤에 붙인다. 이미 붙어 있으면 다시 안 붙임 |
| `VisitFollowUp.revisitNote()` | → `String` | `"(" + M월 d일 + (approximate ? " 전후" : "") + ")"` |
| `String.withoutRevisitNote(followUp)` | 저장 값 정리 | `removeSuffix(" $note").removeSuffix(note)` |

도메인 모델(웹 TS로 옮길 대상):

```ts
interface VisitItem { axis: string; label: string; value: string; }

interface Visit {
  id: string; cardId: number | null; clinic: string | null;
  visitedOn: string | null; items: VisitItem[];
  followUp: VisitFollowUp | null; patientNotes: string[]; rawNote: string | null;
}

interface VisitListItem {
  id: string; cardId: number | null; cardTitle: string;
  clinic: string | null; visitedOn: string; followUp: VisitFollowUp | null;
}

interface VisitClassification {
  items: VisitItem[]; followUp: VisitFollowUp | null;
  patientNotes: string[]; labels: Record<string, string>;
}

interface NewVisit {
  clinicName: string | null; visitedOn: string | null;
  items: { axis: string; value: string }[];
  followUp: VisitFollowUp | null; patientNotes: string[]; rawNote: string | null;
}

interface HospitalSearchResult { hospitals: Hospital[]; total: number; }
```

### 7.8 에러 모델 (`ApiResult`)

```
Success(value)
Rejected(code, message, requestId, retryable, details?)   ← 서버가 에러 봉투로 응답
NetworkUnavailable(cause)                                 ← 서버에 닿지 못함
```

**`retryable` 플래그가 1q-1의 저장 실패 문구를 가른다.** 같은 400이라도 상류가 죽어 잠시 받지 못하는 경우는 `retryable=true`(→ `RETRYABLE`), 요청 자체를 받지 않는 경우(= 확정하지 않은 카드)는 `retryable=false`(→ `REJECTED`). 앱은 코드를 보지 않고 **이 플래그만** 본다 — 웹 API 클라이언트도 반드시 그대로 노출할 것.

`NetworkUnavailable`은 플래그를 보지 않고 무조건 `RETRYABLE`이다.

---

## 8. `VisitFixtures` — Preview 픽스처 값 (그대로 기록)

파일: `visit/ui/VisitFixtures.kt`. 헤더 주석에 **"서버·AI 연동 시 이 파일을 삭제한다"**라고 적혀 있다. Figma 1m·1p·1q-1의 내용을 그대로 옮긴 값이고 Preview와 ViewModel이 함께 쓴다.

```kotlin
previewVisitHeadline = VisitHeadline(
    visitedOn = LocalDate.of(2026, 9, 12),
    clinic    = "서울OO병원 내과",
    cardTitle = "복부 통증 · 3주",
)

PREVIEW_VISIT_NOTE =
    "위염 초기라고 하셨고, 2주 약 먹고 다시 오라고 했어요. 커피랑 매운 거 줄이라고. " +
    "피검사는 다음에 결과 보자고 하셨음."

previewVisitRecord = VisitRecord(
    id         = "visit-1",
    clinic     = "서울OO병원 내과",
    clinicLine = "서울OO병원 내과 · 2026.09.12",
    items = listOf(
        VisitRecordItem(key = "소견", value = "위염 초기 소견"),
        VisitRecordItem(key = "검사", value = "혈액검사 시행\n결과는 다음 방문 때 확인"),
        VisitRecordItem(key = "약",   value = "2주분 처방\n커피·매운 음식 줄이기"),
        VisitRecordItem(key = "재방문", value = "2주 뒤 재방문 (9월 26일 전후)",
                        tone = VisitRecordItem.Tone.LINK),
    ),
    memo = PREVIEW_VISIT_NOTE,
    classifiedCount = 4,
)
```

주의점 3가지:

1. `PREVIEW_VISIT_NOTE`는 1p의 메모와 1q-1의 원문 인용이 **같은 문장이어야 흐름이 이어진다**는 이유로 상수 하나로 공유한다.
2. 픽스처의 `items`에는 `axis`가 비어 있다(`""`). 즉 **이 값으로는 저장이 안 된다**(빈 axis는 요청에서 제외). Preview 전용이라는 뜻.
3. `1m` 화면의 Preview 병원 목록은 `HospitalPickScreen.kt` 안의 `previewHospitals`이고 **주소가 없다**(서버가 이름만 준다는 당시 가정):
   `서울OO병원 내과`, `서울OO병원 이비인후과`, `OO이비인후과의원`, `OO정형외과의원`.
   `ClinicConfirmScreen`의 Preview 주소는 `서울 관악구 남부순환로 1820, 3층`.

웹에서는 **목업 데이터로만** 쓰고 실제 저장 경로에 절대 흘리지 말 것 — "듣지 않은 소견이 기록에 남으면 안 된다"는 이유로 안드로이드도 ViewModel에 픽스처 문장을 넣지 않았다.

---

## 9. 디자인 토큰 요약 (이 4개 화면이 쓰는 값만)

| 종류 | 토큰 | 값 |
|---|---|---|
| 레이아웃 | `gutter` | 20 |
| | `screenWidth` / `contentWidth` | 360 / 320 (고정하지 않음) |
| | `navBarHeight` | 56 |
| | `safeBottom` | 24 (CTA 바 하단 패딩) |
| 간격 | `s2 s4 s6 s8 s10 s12 s14 s16 s20 s24 s32 s40` | 2·4·6·8·10·12·14·16·20·24·32·40 |
| 크기 | `touchMin` / `iconSm` / `iconMd` / `iconLg` | 48 / 18 / 20 / 24 |
| | `controlSm` / `controlMd` / `controlLg` / `mic` | 40 / 48 / 56 / 88 |
| 반경 | `xs sm md lg xl full` | 8 / 12(원문 블록) / 16 / 20(카드) / 24(다이얼로그) / pill |
| 타이포 | `headingL` | 24 / 34, Bold, 자간 -2% |
| | `headingS` | 17 / 24, SemiBold, -1% |
| | `bodyL` / `bodyLStrong` | 17 / 26, Regular / SemiBold |
| | `bodyM` / `bodyMStrong` | 15 / 24 |
| | `bodyS` / `bodySStrong` | 13 / 20 |
| | `labelM` / `labelS` | 15 / 20, 13 / 18(SemiBold 계열) |
| 색(역할명) | `bgSurface` `bgSubtle` `bgPrimary` `bgPrimarySubtle` `bgPrimaryFaint` | |
| | `fgDefault` `fgSubtle` `fgPrimary` `fgLink` `fgDanger` `fgDisabled` `fgOnPrimary` | |
| | `borderSubtle` `borderDefault` `borderStrong` `borderFocus` | |
| 기타 | KV Row key 열 폭 | **72 고정** (값 세로 정렬이 깨지면 훑는 속도가 떨어진다) |
| | KV Row 최소 높이 | 54 |
| | 카드 최소 높이 / 내부 패딩 | 116 / 20 |
| | 편집 모드 카드 테두리 | 2dp `borderFocus` |

폰트는 Pretendard(Regular 400 / Medium 500 / SemiBold 600 / Bold 700). 줄바꿈 규칙은 제목·라벨에 `Balanced+Phrase`, 본문에 `Paragraph` — 웹에서는 `word-break: keep-all` + `text-wrap: balance`(제목) / `pretty`(본문)로 근사한다. **한국어가 어절 중간에서 끊기면 안 된다**는 것이 요구사항이다.

---

## 10. 웹 포팅 시 어려운 지점

1. **라우트로 나르는 300자 원문.** `VisitRecordDestination.note`가 쿼리 문자열이 된다. 웹에서 URL에 넣으면 길이·인코딩·새로고침 노출이 문제다. 라우터 state 또는 `sessionStorage` 키 하나로 바꾸되, **새로고침으로 값이 날아가면 1p로 되돌리는 폴백**을 넣어야 한다(안드로이드는 프로세스 종료 시에도 라우트가 복원되므로 이 문제가 없다).
2. **`popBackStack<CalendarDayDestination>(inclusive=false)`.** 저장/삭제 후 "흐름이 시작된 캘린더 일자까지" 되돌리는 동작이다. 웹 history에는 타입 기반 pop이 없으므로, 흐름 시작 시 돌아갈 경로를 명시적으로 들고 다니다가 `router.replace(그 경로)`로 대체하고, 중간 화면들이 뒤로가기로 다시 밟히지 않게 `replace`를 쓴다. **한 단계만 뒤로 가면 안 된다** — 1p로 돌아가 다시 저장하면 지운 기록이 되살아나거나 중복 저장된다.
3. **`popWithResult` (1m → 카드/일정 추가).** navigate가 아니라 "값만 돌려주는 pop"이다. 이유가 명확하다 — 목적지를 갈아치우면 그 화면이 편집 중이던 값(일정 추가의 날짜·시간·할 일)을 잃는다. 웹에서는 모달/드로어로 병원 찾기를 띄우고 `onPick(hospital)` 콜백으로 값만 돌려주는 편이 안전하다. 단 `AFTER_VISIT`은 진짜 라우팅이므로 **같은 컴포넌트를 모달과 페이지 두 모드로 쓸 수 있어야 한다.**
4. **한글 IME 조합 중간 상태 대응.** 디바운스 300ms, "좁혀서 0건이면 목록 유지", "응답 0건이면 직전 결과 유지" 세 규칙이 전부 한글 조합 때문이다. 웹은 `compositionstart`/`compositionend`를 쓸 수 있으니 오히려 유리하지만, **`composing` 중에는 서버 요청을 아예 보내지 않는 쪽**으로 구현하고 나머지 두 규칙은 그대로 옮겨야 한다.
5. **하단 CTA 바가 조건부로 사라지는 레이아웃**(1m). 바가 없을 때 빈 상태가 남은 높이를 전부 받아 세로 가운데 정렬돼야 한다. `flex: 1` + `display:flex; align-items:center`로 되지만, **결과가 없을 땐 스크롤을 끄고 있을 땐 켜는** 동작도 함께 옮겨야 시안과 같아진다(`overflow-y: auto | hidden` 토글).
6. **키보드 대응(1p).** 안드로이드는 IME inset을 읽어 입력창 **바로 아래 줄**을 시야로 부른다. iOS Safari에는 `WindowInsets.ime` 대응물이 없어 `visualViewport` + 하단 고정 바 보정을 직접 짜야 한다. 하단 CTA가 키보드에 가리거나 키보드 위에 떠야 하는지 디자인 확인 필요(→ 11장).
7. **음성 입력.** `SpeechToText`는 온디바이스 모델을 받는 `PROCESSING` 상태까지 모델링돼 있는데, Web Speech API에는 그 단계가 없다. 상태 4개 중 `PROCESSING`을 쓸지, 쓴다면 어느 시점에 띄울지 결정해야 한다. 부분 결과 누적 규칙(기준 글 + 확정 발화 갱신, 공백 자동 삽입)은 그대로 이식 가능.
8. **값 안의 `\n`.** `VisitRecordItem.value`가 여러 줄이다(픽스처의 `혈액검사 시행\n결과는 다음 방문 때 확인`). KV Row는 값 열이 좁으므로(전체 폭 - 72 - 16) `white-space: pre-wrap`을 반드시 걸어야 하고, 편집 모드에서도 **multiline 입력**이어야 한다(안드로이드 `KvValue`는 여러 줄을 허용).
9. **재방문 날짜 문자열 부착/제거의 왕복.** 화면 값과 저장 값이 다르다는 점이 버그의 온상이다(#245에서 실제로 `(9월 17일 전후) (9월 17일 전후)`가 났다). 웹에서는 **표시용 파생값을 만들되 상태에는 원값만 두는 쪽**으로 바꾸는 편이 안전하지만, 그러면 "환자가 그 줄을 직접 고친 경우"를 잃는다. 안드로이드는 붙인 값을 상태에 두고 저장 직전에 suffix를 떼는 방식이므로, **그대로 옮기려면 `removeSuffix` 로직과 "이미 붙어 있으면 다시 안 붙임" 검사 둘 다 이식**해야 한다.
10. **툴팁 위치.** 안드로이드는 트리거의 hit area(48) 아래, 오른쪽 정렬로 띄운다. 웹에서 popover/anchor positioning을 쓰면 브라우저 지원이 갈리므로 폴백(절대 위치 + 우측 정렬)이 필요하다. **hover가 아니라 클릭 토글**이라는 점을 반드시 지킬 것(터치 기기가 주 대상).
11. **`classifiedCount` 캡션이 편집 중에는 사라진다**(`takeIf { !state.editing }`). 이 한 줄이 없으면 편집 화면에 "AI가 4가지로 나눴어요"가 남아 방금 지운 줄과 숫자가 어긋난다.
12. **삭제가 아직 서버로 안 나간다**(5.6). 웹에서 `DELETE /api/visits/{id}`를 "친절하게" 붙이면 안드로이드와 동작이 갈린다. 1q-1은 저장 전 상태라 지울 id가 없다는 것이 근본 이유다.

---

## 11. 열린 질문 (소스가 "확인 필요"라고 적어 둔 것 + 포팅 판단 필요)

1. **1m-B에서 결과가 없을 때 앞으로 갈 길.** 시안이 `건너뛰기` 문구를 지웠고 상단 액션도 없앴는데(#228), 결과가 없으면 하단 CTA 바까지 사라져 **앞으로 갈 길이 뒤로가기뿐**이다. `HospitalPickUiState.showSubmit` KDoc이 "#119에 올린 확인 대기 항목"이라고 적어 뒀다. 웹도 같게 둘지, 빈 상태에 "건너뛰기"를 둘지 결정 필요.
2. **1m이 후보 목록 없이 빈 상태로 열린다.** 시안(1m)은 진료 후에 후보 네 곳을 먼저 보여주는데 그것이 픽스처였고, 서버 검색은 질의가 있어야 답이 온다. 지금은 1m도 1m-B와 같은 입력 전 상태로 열린다 — **시안과 어긋나는 지점이라 디자인 트랙에 올라가 있다(#155).**
3. **빈 상태 문구가 진료 후(1m)에도 그대로 쓰인다.** `아직 검색 기록이 없어요` / `병원 명을 입력하면 진료받을 병원을 찾을 수 있어요` — 뒷문장이 "진료받을"이라 진료 후 맥락과 어긋난다. 목적별 문구 분기가 없다(문자열 리소스도 하나뿐).
4. **1q-1의 `Failed` 상태에 도달하는 경로가 없다**(5.9). 분류 실패도 `Content`로 열린다. `기록을 정리하지 못했어요` + `다시 시도`를 웹에서 만들지 말지, 만든다면 어떤 조건인지 확인 필요.
5. **`VisitRecordViewModel.onEditDoneClick()`이 서버로 나가지 않는다.** 주석: "서버 저장은 아직 없다. AI 분류 결과를 저장하는 API를 붙이면 여기서 호출한다." 현재는 `저장하기`가 유일한 서버 쓰기다.
6. **분류 결과가 0건일 때 손으로 채울 자리가 없다.** 편집은 있는 줄을 고치고 ×로 지우기만 하고 줄을 새로 만들지 못한다. 그 자리는 **#184**로 열려 있다 — 웹 1차 구현에 "항목 추가"를 넣을지 결정 필요.
7. **재방문 일정 생성 실패를 사용자에게 알리지 않는다.** `FollowUpScheduler`는 결과를 돌려주지 않고 구현이 실패를 삼킨다. 웹도 같게 둘지(저장 성공 토스트만) 확인 필요.
8. **1p의 하단 CTA가 키보드 위에 떠야 하는지.** 안드로이드는 IME가 올라오면 CTA 바가 함께 밀려 올라간다. 웹(특히 iOS Safari)에서 같은 동작을 낼지, 키보드 중에는 CTA를 숨길지 디자인 결정 필요.
9. **`AI로 정리하기` 칩과 `저장하기`가 완전히 같은 동작**이라는 점을 웹에서도 유지할지. 사용자에게는 두 버튼이 다른 일을 할 것처럼 보이는데 실제로는 동일하다(#183의 결론).
10. **저장 중 표현이 없다**(5.1·5.9). `saving`이 UiState 밖이라 버튼이 비활성되지도, 스피너가 뜨지도 않는다. 왕복 동안 화면이 아무 말도 하지 않는데, 웹에서 버튼을 disable하거나 스피너를 넣으면 안드로이드와 보이는 것이 갈린다. 그대로 둘지 결정 필요.
11. **편집 중 뒤로가기가 사본을 확인 없이 버린다**(5.10). NavBar 뒤로가기에 조건이 없다. 웹에서 `beforeunload`/이탈 확인을 붙일지 판단 필요.
12. **한 번 실패한 뒤 캐시된 검색어로 돌아가면 `failed`가 걷히지 않는다**(2.6). 결과는 보이는데 라벨은 `지금은 찾지 못했어요.`로 남는다. 소스에서 직접 읽히는 동작이고 테스트에는 없다. 웹에서 고칠지(= 캐시 적용 시에도 `failed=false`) 그대로 옮길지 결정 필요.
13. **`address`의 출처가 화면마다 다르다.** 1m은 검색 응답에서, 1m-12는 "일정 응답에 없어 카드에 남은 것"에서 받는다. 웹에서 일정/카드 API가 주소를 어떻게 주는지 확인해야 1m-12의 주소 줄이 채워진다.
