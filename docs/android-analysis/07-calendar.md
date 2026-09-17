# 캘린더 월 · 일자 · 일정 추가 (1r-1, 1r-2, 1r-4)

> 출처: `C:/Claude/MedicalMate/app/src/main/java/com/mist/medicalmate/calendar/**` 전체 + `app/src/main/res/values/strings.xml` + 사용 중인 디자인 시스템 컴포넌트 소스.
> 이 문서의 한국어 문구는 모두 `strings.xml` 또는 Kotlin 리터럴에서 **글자 그대로** 옮긴 것이다.

---

## 웹앱 구현 메모

- 모바일 폭 고정(360px 기준 콘텐츠, gutter 20px)을 유지한다. 월 격자가 7열 × 42px 셀로 콘텐츠 폭 320을 정확히 나눠 쓰는 구조라 폭이 늘면 셀만 늘리고 셀 크기는 유지하는 편이 안전하다.
- 바텀시트 3종(카드 시트 1r-1-S / 날짜 1r-4-D / 시간 1r-4-T)은 Radix Dialog·Vaul 같은 드로어로 대체하고, 드래그로 닫기·스크림·ESC 닫기를 반드시 넣는다. 시트 안에서 고른 값은 **`확인`을 눌러야 화면 상태로 올라간다**(끌어내려 닫으면 버려진다).
- 시간 선택 휠은 웹에서 가장 비싼 부분이다. CSS `scroll-snap-type: y mandatory` + `IntersectionObserver`(또는 스크롤 정지 디바운스)로 재현하고, 휠 값 클릭도 함께 지원해야 한다(안드로이드도 클릭 선택을 지원한다).
- 안드로이드가 `BringIntoViewRequester` + IME 높이로 "할 일 추가" 줄을 키보드 위로 끌어올리는데, 웹에서는 `visualViewport` resize 후 `scrollIntoView({block:'nearest'})`로 대체한다.
- 달력 날짜 셀의 hit area는 컴포넌트(42px)가 아니라 **그리드 칸 전체**가 받는다. 웹에서도 `<button>`을 칸 크기로 두고 시각 요소만 42px로 그린다.

---

## 0. 파일 지도

| 역할 | 파일 |
| --- | --- |
| 월 화면 (1r-1) | `calendar/ui/CalendarMonthScreen.kt` |
| 월 상태 보유자 | `calendar/ui/CalendarViewModel.kt` |
| 일자 화면 (1r-2) | `calendar/ui/CalendarDayScreen.kt` |
| 일자 상태 보유자 | `calendar/ui/CalendarDayViewModel.kt` |
| 일자 할 일 조작 | `calendar/ui/CalendarDayTodoActions.kt` |
| 월·일자 상태 타입 | `calendar/ui/CalendarUiState.kt` |
| 월·일자 라우트 | `calendar/ui/CalendarDestination.kt` |
| 일정 추가 화면 (1r-4) | `calendar/ui/ScheduleAddScreen.kt` |
| 일정 추가 시트 (1r-4-D/1r-4-T) | `calendar/ui/ScheduleAddSheets.kt` |
| 일정 추가 상태 타입 | `calendar/ui/ScheduleAddUiState.kt` |
| 일정 추가 상태 보유자 | `calendar/ui/ScheduleAddViewModel.kt` |
| 일정 추가 할 일 조작 | `calendar/ui/ScheduleAddTodoActions.kt` |
| 일정 추가 라우트 | `calendar/ui/ScheduleAddDestination.kt` |
| 일정 API | `calendar/data/AppointmentApi.kt` |
| 일정 Repository·도메인 모델 | `calendar/data/AppointmentRepository.kt` |
| 재방문 → 일정 자동 생성 | `calendar/data/FollowUpAppointmentScheduler.kt` |
| DI 바인딩 | `calendar/data/CalendarModule.kt` |
| Preview 픽스처 | `calendar/ui/CalendarFixtures.kt` |
| 일자 Preview | `calendar/ui/CalendarDayPreviews.kt` |
| 네비게이션 연결 | `navigation/MedicalMateNavGraphs.kt` (`calendarDestinations`) |

---

## 1. 화면 1r-1 — 캘린더 월 (Figma `406:2310`)

### 1.1 상태 (UiState)

#### `CalendarUiState` — `CalendarUiState.kt:31`

| 필드 | 타입 | 기본값 | 의미 |
| --- | --- | --- | --- |
| `month` | `YearMonth` | — | 보고 있는 달. 헤더 "2026년 9월"과 격자를 만든다. |
| `today` | `LocalDate` | — | 오늘. 셀 테두리 표시와 D-day 기준. `loadMonth` 때마다 다시 읽는다. |
| `selected` | `LocalDate` | — | 고른 날. 채운 셀 + 하단 섹션 제목. 초기값은 오늘. |
| `recordDays` | `Set<Int>` | `emptySet()` | **채운 점**을 찍을 일(day of month). |
| `plannedDays` | `Set<Int>` | `emptySet()` | **빈 원**을 찍을 일(day of month). |
| `schedules` | `List<CalendarSchedule>` | `emptyList()` | 고른 날의 일정 줄들. |
| `cardSheet` | `DayCard?` | `null` | 있으면 카드만 있는 날 시트(1r-1-S)가 떠 있다. |
| `appointments` | `List<Appointment>` | `emptyList()` | 그 달 일정 원본(취소 제외). 날을 바꿔도 서버를 다시 부르지 않으려고 들고 있는다. |
| `cards` | `List<CardListItem>` | `emptyList()` | 그 달에 작성된 브리핑 카드. |

TypeScript 변환:

```ts
type CalendarUiState = {
  month: string;            // "2026-09" (YearMonth)
  today: string;            // "2026-09-15" (LocalDate)
  selected: string;         // LocalDate
  recordDays: number[];     // Set<Int> → 1..31
  plannedDays: number[];
  schedules: CalendarSchedule[];
  cardSheet: DayCard | null;
  appointments: Appointment[];
  cards: CardListItem[];
};
```

#### `CalendarSchedule` — `CalendarUiState.kt:54`

| 필드 | 타입 | 기본값 | 의미 |
| --- | --- | --- | --- |
| `id` | `String` | — | 서버 `appointmentId`를 문자열로 담은 값. |
| `title` | `String` | — | "서울OO병원 내과" 처럼 병원+과+목적을 합친 문자열. |
| `time` | `String?` | — | "오전 10:30". `null`이면 시간 미정. |
| `detail` | `String` | — | 가져갈 카드 제목. 카드가 없으면 빈 문자열. |
| `dday` | `Long` | — | `on - today` 일수. 지난 일정은 음수. |
| `followUp` | `Boolean` | `false` | 서버 `origin == VISIT_FOLLOW_UP`이면 true → "재진". |

> **주의 — 월 화면에서는 `followUp`이 항상 `false`다.** 월 화면의 매퍼 `Appointment.toSchedule()`(`CalendarViewModel.kt:202`)은 이 필드를 아예 채우지 않아 기본값 `false`가 남는다. `origin`을 읽어 채우는 곳은 일자 화면의 `Appointment.toDaySchedule()`(`CalendarDayViewModel.kt:288`) 하나뿐이다. 월 화면이 초진/재진을 그리지 않기 때문에 화면상 차이는 없지만, 웹에서 월 목록에도 "재진"을 적으려면 **월 매퍼에도 `origin`을 넣어야 한다**(현 앱은 안 넣는다).

#### `DayCard` — `CalendarUiState.kt:127`

| 필드 | 타입 | 기본값 | 의미 |
| --- | --- | --- | --- |
| `id` | `String` | — | 서버 카드 id. 카드 상세로 가는 길. |
| `title` | `String` | — | 카드 제목. |
| `writtenOn` | `LocalDate?` | `null` | 카드 작성일. 줄 보조 문구 앞부분. |
| `itemCount` | `Int?` | `null` | 카드 항목 수. **카드 상세를 따로 읽어야 나온다.** |
| `visited` | `Boolean` | `false` | 이 카드로 진료를 마쳤는지. 배지가 읽는 값(`confirmed`가 아니다). |
| `clinicAddress` | `String?` | `null` | 카드에 남은 병원 주소. 진료 후 기록 흐름(1m-12)에 넘긴다. |
| `scheduledOn` | `LocalDate?` | `null` | 이 카드로 이미 만들어진 일정이 선 날. **그 달 안에서만 찾는다.** |

#### `MedicalMateDateMarker` (enum) — `component/DateCell.kt:30`

```
NONE | RECORD | PLANNED
```

### 1.2 레이아웃 (위 → 아래)

```
┌─────────────────────────────────────────┐
│ NavBar                                  │  title="캘린더", leading=NONE (뒤로 없음)
├─────────────────────────────────────────┤
│ [스크롤 영역] padding: h=20, v=12, gap=14│
│                                         │
│  ① MonthHeader                          │
│     [‹]  "2026년 9월"  [›]              │
│                                         │
│  ② MonthGrid  (MedicalMateCard 안)      │
│     일 월 화 수 목 금 토                 │
│     □ □ □ 1 2 3 4                       │
│     5 6 7 8 9 10 11                     │
│     ... (셀 42x42, radius 13)           │
│     ── 범례 ──                          │
│     ● 기록 있음   ○ 예정                 │
│                                         │
│  ③ SectionHeader "9월 12일 (금)"         │
│  ④ ListRow × N (고른 날의 일정)          │
│                                         │
│                            ┌────┐       │
│                            │ +  │ FAB   │  BottomEnd, padding 20
│                            └────┘       │
├─────────────────────────────────────────┤
│ TabBar (CALENDAR 선택)                   │  1Depth 화면이므로 하단 탭 있음
└─────────────────────────────────────────┘
```

- `CalendarMonthScreen.kt:88` — `MedicalMateNavBar(title = "캘린더", leading = NONE)`
- `CalendarMonthScreen.kt:100` — `MedicalMateFab(icon = Plus, contentDescription = "일정 추가")`, `Alignment.BottomEnd` + `padding(20)`
- `CalendarMonthScreen.kt:110` — `MedicalMateTabBar(selected = CALENDAR)`
- 본문 Column: `padding(horizontal = 20, vertical = 12)`, `spacedBy(14)`
- FAB은 격자 위에 뜬다. **일자 화면(1r-2)에는 FAB이 없다.**

### 1.3 월 헤더

`CalendarMonthScreen.kt:221`

| 요소 | 값 |
| --- | --- |
| 왼쪽 아이콘 버튼 | `ChevronLeft`, contentDescription **"지난달"** → `month - 1` 로드 |
| 가운데 텍스트 | `"%1$d년 %2$d월"` → **"2026년 9월"**, `headingS`, `fgDefault`, 가운데 정렬, `weight(1f)` |
| 오른쪽 아이콘 버튼 | `ChevronRight`, contentDescription **"다음달"** → `month + 1` 로드 |

달을 넘기면 그 달을 서버에서 **다시 읽는다**(`loadMonth`).

### 1.4 월 격자 — 점 표시 규칙 (핵심)

`CalendarMonthScreen.kt:255`, `component/DateCell.kt`

**구조**
- `MedicalMateCard`(bgSurface, radius 20, padding 20, 자식 간 gap 6) 안에 넣는다.
- 요일 머리글 행: `R.array.calendar_weekdays` = `일 · 월 · 화 · 수 · 목 · 금 · 토` (**일요일 시작**). 스타일 `labelS`, `fgSubtle`, 각 `weight(1f)` 가운데 정렬.
- 첫 주 빈 칸 수 = `month.atDay(1).dayOfWeek.value % 7` (월=1 … 일=7 → `%7` 하면 일요일이 0).
- 주 단위로 `Row`를 만들고 7칸을 채운다. 달 밖 칸은 **빈 Box를 같은 크기로 둔다**(요일 어긋남 방지).
- 마지막에 범례 행.

**날짜 셀 시각 규격** (`MedicalMateDateCell`)

| 속성 | 값 |
| --- | --- |
| 크기 | `42dp` (`MedicalMateDateCellSize`) / 시트용 `34dp` (`MedicalMateDateCellSizeCompact`) |
| 모서리 | `RoundedCornerShape(13.dp)` (`MedicalMateRadius.dateCell`) |
| 숫자 | `bodyMStrong` |
| 숫자 ↔ 점 간격 | `3dp` |
| 점 크기 | `5dp` |
| 빈 원 테두리 | `1dp` |
| 오늘 테두리 | `1dp`, `borderPrimary` |

**세 가지 상태는 서로 다른 방식으로 그린다** (겹칠 수 있다):

| 상태 | 배경 | 글자색 | 비고 |
| --- | --- | --- | --- |
| `selected` (고른 날) | `bgPrimary` **채움** | `fgOnPrimary` | 가장 강함 |
| `isToday` (오늘, 고르지 않음) | `bgPrimaryFaint` **옅은 면** + `1dp borderPrimary` 테두리 | `fgDefault` | "오늘은 상태이지 선택이 아니다" |
| 둘 다 아님 | `bgSurface` | `fgDefault` | |
| `enabled = false` | `bgSurface` | `fgDisabled` | 월 화면에서는 안 쓴다 |

> 고른 칸에서는 오늘 테두리를 **생략한다**(`todayBorder`가 `isToday && !selected`일 때만 그린다).

**점(marker) 두 종류** — `markerOn(day)` (`CalendarUiState.kt:212`)

```kotlin
when (day) {
    in recordDays  -> RECORD   // 기록이 예정보다 앞선다
    in plannedDays -> PLANNED
    else           -> NONE
}
```

| marker | 모양 | 색 |
| --- | --- | --- |
| `RECORD` (기록 있음) | **채운 점** 5px 원 | `selected ? fgOnPrimary : bgPrimary` |
| `PLANNED` (예정) | **빈 원** 5px, 테두리 1px | 같은 tint |

**한 날짜에 둘 다 해당하면 RECORD가 이긴다.** ("이미 지난 일은 사실이고 예정은 계획이다")

**두 집합이 각각 어디서 오는가** — `CalendarViewModel.kt:126`, `:160`

```
recordDays  (채운 점) = ( 그 달에 작성된 브리핑 카드의 writtenOn )
                      + ( 진료 후 기록(visit)의 visitedOn )
                      → 그 달에 속하는 것만 → dayOfMonth 집합

plannedDays (빈 원)   = ( 취소되지 않은 일정의 on )
                      + ( 진료 후 기록의 followUp.date — 아직 확정 안 한 재방문 )
                      → date >= today 인 것만 → 그 달에 속하는 것만 → dayOfMonth 집합
```

- 취소된 일정(`status == CANCELED`)은 아예 제외된다(`withMonth`에서 먼저 거른다).
- 카드는 `YearMonth.from(writtenOn) == month`로 그 달 것만 남긴다.
- 아직 확정하지 않은 재방문도 **예정 점**을 찍는다. 그래야 환자가 확정하러 들어갈 길이 생긴다.
- 지난 날의 일정은 `plannedDays`에서 빠진다(`it >= today`).

**접근성 이름** (`dateCellDescription`): `"12"`, `"12, 오늘"`, `"12, 기록 있음"`, `"12, 오늘, 예정"` 형태로 조립한다. 쓰이는 문구는 `date_cell_today="오늘"`, `date_cell_has_record="기록 있음"`, `date_cell_planned="예정"`.

### 1.5 범례

`CalendarMonthScreen.kt:309` — 격자와 **같은 카드 안** 맨 아래, `padding(top = 8)`, 항목 간 `12`, 점↔라벨 `4`.

| 표시 | 라벨 |
| --- | --- |
| 5px 채운 원 (`bgPrimary`) | **기록 있음** |
| 5px 빈 원 (1px `bgPrimary` 테두리) | **예정** |

라벨 스타일 `labelS`, `fgSubtle`.

### 1.6 고른 날 섹션

`CalendarMonthScreen.kt:366`

- `MedicalMateSectionHeader(title = selected.format("M월 d일 (E)"))` → **"9월 12일 (금)"**
- 일정이 하나도 없으면 **헤더만 두고 아래를 비운다.** "일정이 없어요" 같은 빈 상태 문구를 두지 않는다(아래 + 버튼이 이미 다음 행동을 말하고 있음, 시안 `1185:13797`).
- 일정이 있으면 `MedicalMateListRow`를 일정 수만큼:

| 슬롯 | 값 |
| --- | --- |
| `title` | `schedule.title` (여기서는 "초진/재진"을 붙이지 **않는다**. 붙이는 곳은 일자 화면뿐) |
| `meta` | `[time ?: "시간 미정", detail(비어있지 않으면)]`을 `" · "`로 이음 → `"오전 10:30 · 복부 통증 · 3주"` |
| `badge` | `dday >= 0` 일 때만 `"D-%1$d"` → **"D-5"** |
| `badgeTone` | `BRAND` |
| `type` | `dday >= 0 ? BADGE : DEFAULT` |
| `onClick` | 일자 화면으로 이동 |

`MedicalMateListRow` 규격: 최소 높이 `RowHeightLg`, 면 `bgSurface`, radius 16, `Elevation.card` 그림자, 제목 `headingS`, 배지는 **제목 바로 옆**(gap 6), 메타 `bodyS`/`fgSubtle`, 오른쪽에 `chevron-right` 20px(`onClick`이 있고 `type != PLAIN`일 때만).

### 1.7 날짜를 탭했을 때 — 시트가 뜨는 조건

`CalendarViewModel.onDaySelect` (`CalendarViewModel.kt:69`)

```
날짜 탭
 ├─ 그 날 (취소 제외) 일정이 1건 이상  → selected 갱신 + 하단 목록 갱신, 시트 없음
 │                                      (일정 줄을 눌러야 일자 화면 1r-2로 이동)
 └─ 그 날 일정이 0건
     ├─ 그 날 작성된 카드가 있다        → 카드만 있는 날 시트(1r-1-S) 표시
     └─ 카드도 없다                      → 아무것도 안 뜬다(섹션 헤더만 날짜가 바뀜)
```

- 서버를 다시 부르지 않는다. 이미 읽어 둔 `appointments` / `cards`에서 거른다.
- 시트가 뜨면 곧바로 **카드 상세를 한 장만 추가 호출**해 `itemCount`(+`writtenOn`)를 채운다(`fillCardItemCount`). 못 읽으면 항목 수 없이 날짜만 적는다.
- **화면을 열자마자** 오늘이 "카드만 있는 날"이면 누르지 않아도 시트가 뜬다(`withMonth`가 `cardSheet`를 세운다).
- 같은 날 카드가 여럿이면 **첫 장만** 보여준다.

### 1.8 카드만 있는 날 시트 (1r-1-S, Figma `1226:4669`)

`CalendarMonthScreen.kt:143`

```
┌── BottomSheet (grabber 40x4, 위 모서리 28, padding h=20 bottom=24, 자식 gap 12) ──┐
│                                                                                  │
│  [Column — 아래 셋은 붙여 둔다]                                                    │
│    "9월 4일 (토)"                      headingS / fgDefault                       │
│    SectionHeader "작성한 브리핑 카드"                                              │
│    ListRow(title=카드 제목, meta="2026.09.04 · 5항목", badge="진료 전", BADGE)      │
│      ※ badgeTone을 넘기지 않는다 → 기본값 NEUTRAL                                  │
│                                                                                  │
│  안내 문구 (bodyS / fgSubtle)                                                     │
│  Button (full width)                                                             │
└──────────────────────────────────────────────────────────────────────────────────┘
```

**두 변이 — `card.scheduledOn` 으로 갈린다**

| `scheduledOn` | 안내 문구 | 버튼 라벨 | 버튼 동작 |
| --- | --- | --- | --- |
| `null` (아직 일정 없음) | **"이 카드를 가져갈 일정을 만들 수 있어요"** | **"이 카드로 일정 만들기"** | 일정 추가(1r-4)로 이동. `date = state.selected`, `cardId = card.id` 를 실어서 **그 카드가 이미 골라진 채로** 연다 |
| 날짜 있음 | **"이 카드로 만들어진 일정이 있어요"** | **"일정 보러가기"** | 그 `scheduledOn` 날짜의 일자 화면(1r-2)으로 이동 |

- 날짜 텍스트 형식: `"M월 d일 (E)"`.
- 카드 줄을 누르면 브리핑 카드 상세(1e-1)로 간다.
- 시트를 닫으면 `cardSheet = null`.
- `scheduledOn`은 **보고 있는 달의 일정 안에서만** 찾는다. 다른 달로 만든 일정은 못 찾아서 "만들기"로 남는다(알려진 한계).
- 찾는 방식은 `appointments.firstOrNull { it.cards.any { c -> c.id == cardId } }?.on` (`CalendarViewModel.kt:183`). **가장 가까운 날이 아니라 목록 순서상 첫 건**이다(서버가 준 순서). 한 카드가 여러 일정에 걸려 있으면 그중 첫 건의 날로 간다.
- 카드 줄의 `badgeTone`은 **넘기지 않는다** → `MedicalMateListRow`의 기본값인 `NEUTRAL`이 쓰인다 (`Rows.kt:207`).

카드 줄 보조 문구 규칙 (`dayCardMeta`, `CalendarUiState.kt:233`):

| 조건 | 결과 |
| --- | --- |
| `writtenOn == null` | 메타 줄 **없음**(null) |
| `writtenOn` 있고 `itemCount == null` | `"2026.09.04"` |
| 둘 다 있음 | `"%1$s · %2$d항목"` → **"2026.09.04 · 5항목"** |

카드 줄 배지 (`dayCardStatus`): `visited ? "진료 완료" : "진료 전"` — **확정 여부가 아니라 방문 여부로 가른다.**

### 1.9 월 화면 로딩 / 빈 / 에러

| 상태 | 화면 |
| --- | --- |
| 로딩 | **전용 로딩 UI가 없다.** 초기 상태(`emptyState(today)`)로 오늘이 속한 달의 격자를 점 없이 그려 두고, 응답이 오면 점·목록이 채워진다. |
| 빈 (그 달에 아무것도 없음) | 격자만 점 없이 보인다. 범례는 그대로. 고른 날 섹션은 날짜 헤더만. |
| 에러 | **전용 에러 UI가 없다.** `(repository.month(...) as? ApiResult.Success)?.value.orEmpty()` 로 실패를 빈 목록으로 삼킨다. 카드·기록 호출도 같다. 사용자에게는 "아무 일정도 없는 달"로 보인다. → **웹에서는 에러 토스트/재시도를 붙이는 것을 권장한다(현 앱 동작과 다른 개선점).** |

### 1.10 월 화면에서 나가는 모든 경로

| 트리거 | 목적지 | 넘기는 값 |
| --- | --- | --- |
| 고른 날의 일정 줄 탭 | 일자 화면 1r-2 | `date = state.selected`, `appointmentId = 줄의 id` |
| 카드 시트의 카드 줄 탭 | 브리핑 카드 상세 1e-1 | `cardId` |
| 카드 시트 `이 카드로 일정 만들기` | 일정 추가 1r-4 | `date = state.selected`, `cardId` |
| 카드 시트 `일정 보러가기` | 일자 화면 1r-2 | `date = card.scheduledOn`, `appointmentId = null` |
| FAB `+` | 일정 추가 1r-4 | `date = state.selected` **단, 고른 날이 보고 있는 달에 속할 때만.** 다른 달로 넘겨 놓은 상태면 `date = null` (`CalendarDestination.kt:116`) |
| 하단 탭 | 홈 / 기록 / 프로필 등 | — |

---

## 2. 화면 1r-2 — 캘린더 일자 (Figma `406:2514`, 1r-2-A `1060:2879`, 1r-2-A2 `1060:2998`, 1r-2-E 편집)

### 2.1 상태 (UiState)

#### `CalendarDayUiState` — `CalendarUiState.kt:79`

| 필드 | 타입 | 기본값 | 의미 |
| --- | --- | --- | --- |
| `date` | `LocalDate` | — | 이 화면의 날짜. NavBar 제목. |
| `schedule` | `CalendarSchedule?` | — | 이 날 일정 1건. 없으면 일정 섹션 통째로 숨김. |
| `card` | `DayCard?` | — | 가져갈 브리핑 카드 1장. 없으면 카드 섹션 숨김. |
| `todos` | `List<DayTodo>` | `emptyList()` | 진료 전 할 일(원본). |
| `records` | `List<DayRecord>` | `emptyList()` | 그 날 남긴 진료 후 기록. **여럿일 수 있다.** |
| `nextEvent` | `DayNextEvent?` | `null` | 다음 일정 블록. |
| `todoDraft` | `List<DayTodo>?` | `null` | 편집 중 사본. `null`이 아니면 편집 상태(1r-2-E). |
| `deleteRequested` | `Boolean` | `false` | 일정 삭제 확인 대화상자 표시 여부. |

**파생값 (computed)**

| 이름 | 계산식 | 의미 |
| --- | --- | --- |
| `visited` | `records.isNotEmpty()` | 다녀온 날인지. 화면 변이를 가르는 값. |
| `editing` | `todoDraft != null` | 편집 중인지. |
| `shownTodos` | `todoDraft ?: todos` | 화면에 그릴 할 일. |
| `changed` | `todoDraft != null && todoDraft.size != todos.size` | 편집에서 **줄이 지워졌는지**. 체크 토글은 세지 않는다. |

```ts
type CalendarDayUiState = {
  date: string;                 // LocalDate
  schedule: CalendarSchedule | null;
  card: DayCard | null;
  todos: DayTodo[];
  records: DayRecord[];
  nextEvent: DayNextEvent | null;
  todoDraft: DayTodo[] | null;
  deleteRequested: boolean;
};
// 파생
const visited = s.records.length > 0;
const editing = s.todoDraft !== null;
const shownTodos = s.todoDraft ?? s.todos;
const changed = s.todoDraft !== null && s.todoDraft.length !== s.todos.length;
```

#### `DayTodo` — `CalendarUiState.kt:162`

| 필드 | 타입 | 의미 |
| --- | --- | --- |
| `id` | `String` | `"todo-1"`, `"todo-2"` … 서버가 id를 안 주므로 **인덱스로 만든다**(같은 글이 두 줄일 수 있어 글을 key로 못 쓴다). |
| `label` | `String` | 할 일 문구. |
| `done` | `Boolean` | 체크 여부. |

#### `DayRecord` — `CalendarUiState.kt:165`

| 필드 | 타입 | 의미 |
| --- | --- | --- |
| `id` | `String` | 서버 `visitId`. 누르면 진료 후 기록 상세로. |
| `title` | `String` | 항상 리터럴 **`"진료 후 기록"`** (`CalendarDayViewModel.kt:243`). |
| `meta` | `String` | 처음엔 병원 이름, 상세를 읽고 나면 소견·약·재방문을 `" · "`로 이은 한 줄. |

#### `DayNextEvent` — `CalendarUiState.kt:177`

| 필드 | 타입 | 기본값 | 의미 |
| --- | --- | --- | --- |
| `chip` | `String` | — | 흰 알약 안의 글자. **확정 전엔 날짜("9월 26일 (토)"), 확정 후엔 D-day("D-14")** — 종류가 달라서 데이터가 문장을 정한다. |
| `title` | `String` | — | 굵은 제목. |
| `cardId` | `String?` | `null` | 그 진료를 준비한 카드. 확정하러 갈 때 미리 골라 둔다. |
| `followUp` | `Boolean` | `false` | 진료 후 기록의 재방문에서 나온 것인지. 확정 시 `origin = VISIT_FOLLOW_UP`. |
| `on` | `LocalDate` | — | 그 일정이 선 날. **이 화면의 날짜가 아니다.** |
| `at` | `String?` | `null` | `null`이면 시간 미정(1r-2-A), 있으면 "9월 26일 (토) 오전 10:30"(1r-2-A2). |
| `appointmentId` | `Long?` | `null` | 이미 만들어진 일정의 id. 있으면 **새로 만들지 않고 고치러** 간다. |
| `clinic` | `String?` | `null` | 재방문할 병원. 일정 추가(1r-4-B)의 병원 필드를 채운다. |

### 2.1.1 `load(date, appointmentId)` — 어느 일정을 여는가 (문서에 빠져 있던 규칙)

`CalendarDayViewModel.load` — `CalendarDayViewModel.kt:73`

```
1) GET /api/me/appointments?date={date}
2) status == CANCELED 인 것을 먼저 버린다  → live
3) appointment = live.firstOrNull { it.id == appointmentId } ?: live.firstOrNull()
   ★ 라우트로 받은 appointmentId가 그 날에 없으면(예: 지운 일정으로 되돌아온 경우)
     조용히 그 날 첫 건을 연다. 오류를 띄우지 않는다.
4) records = GET /api/me/visits 중 visitedOn == date 인 것 전부
5) nextEvent = records.firstOrNull() 하나로만 따진다 (§2.5)
```

> **하루에 일정이 둘 이상이어도 화면은 한 건만 그린다.** 둘 이상일 때의 시안이 없어 디자인 트랙에 열려 있는 상태다(소스 KDoc `#189`). 그래서 월 화면이 **누른 일정의 id를 들고 온다** — 날짜만으로 열면 늘 첫 건이 나와서 누른 것과 열린 것이 달랐다(`#179`). 웹에서도 이 인자를 반드시 실어야 한다.
>
> `CalendarDayDestination` — `CalendarDestination.kt:32` : `{ date: String(ISO), appointmentId: Long? = null }`

**화면 각 값이 어디서 오는가**

| 화면 값 | 출처 |
| --- | --- |
| `schedule` | 위에서 고른 `appointment` 한 건 (`toDaySchedule`) |
| `card` | **그 일정에 걸린 카드 중 첫 장만** (`appointment.cards.firstOrNull()`, `CalendarDayViewModel.kt:230`). 카드가 없으면 `null` → 카드 섹션 통째로 숨김 |
| `todos` | **서버 일정의 `todos`** (`appointment.todos`). 단 `records`가 비어 있지 않으면 `emptyList()`. id는 `"todo-{index+1}"`로 앱이 매긴다 |
| `records` | `GET /api/me/visits` 중 `visitedOn == date` |
| `nextEvent` | `records.firstOrNull()` 기준 (§2.5) |
| `todoDraft` / `deleteRequested` | 항상 초기값(`null` / `false`) — 다시 읽으면 편집 상태가 풀린다 |

> 소스 KDoc에 "진료 전 할 일만 아직 픽스처다"라고 적힌 줄이 남아 있는데 **코드는 이미 서버 일정의 `todos`를 쓴다**(`CalendarDayViewModel.kt:89`). 주석이 낡은 것이다.

**카드 줄 보조값 채우기** (`DayCard.filled()`, `CalendarDayViewModel.kt:110`) — 목록과 상세를 **동시에**(`async`) 부른다.

| 필드 | 출처 |
| --- | --- |
| `writtenOn` | 상세의 `writtenOn`, 없으면 **목록의 `writtenOn`으로 대체** |
| `visited` | **목록**에서만 (`listed?.visited == true`). 상세 응답에 없다 |
| `itemCount` | 상세의 `items.size` |
| `clinicAddress` | 상세의 `hospital.address` |

- `card.id`가 `Long`으로 파싱되지 않으면 아무것도 채우지 않고 그대로 둔다.
- 카드를 고치면 서버가 새 id를 주는데(Backend#114) 일정에 걸린 것은 옛 id다. 그 경우 **목록에서 못 찾아 `visited`가 `false`로 남아 배지가 "진료 전"으로 보인다**(알려진 한계).

### 2.2 레이아웃 (위 → 아래) — 공통 골격

```
┌─────────────────────────────────────────┐
│ NavBar                                  │  leading=BACK(‹) → 뒤로
│  title = "9월 12일 (금)"                 │  action = "편집" | "취소" | "확인"
├─────────────────────────────────────────┤
│ [스크롤 영역] padding h=20 v=12, gap=8   │
│                                         │
│  ① 이 날 일정        (schedule 있을 때)  │
│  ② 가져갈 브리핑 카드 (card 있을 때)      │
│  ③ 진료 전 할 일     (할 일 있을 때)      │
│  ④ 이 날 기록        (항상)              │
│  ⑤ 다음 일정        (nextEvent 있을 때)  │
│  ⑥ [일정 삭제]      (편집 중일 때만)      │
│                                         │
└─────────────────────────────────────────┘
        2Depth 화면 — 하단 탭 없음, FAB 없음
```

`⑥ 일정 삭제`는 **하단 고정이 아니라 본문 맨 끝**에 둔다(`padding(top = 12)`, `MedicalMateButtonType.DANGER`, full width). 고정하면 편집 진입 순간 마지막 섹션(다녀온 날엔 다음 일정 카드)을 잘라 먹기 때문.

### 2.3 NavBar 우측 액션 — 한 자리에서 셋으로 갈린다

`CalendarDayScreen.kt:103`

| 조건 | 라벨 | 동작 |
| --- | --- | --- |
| `!editing` | **"편집"** | `onEditStart` → `todoDraft = todos` |
| `editing && changed` | **"확인"** | `onEditDone` → `todos = draft`, `draft = null`, **서버 저장** |
| `editing && !changed` | **"취소"** | `onEditCancel` → `draft = null`, `deleteRequested = false` |

> `changed`는 **줄이 지워졌을 때만** true다. 체크 토글은 편집 밖에서도 할 수 있는 조작이라 "편집으로 바꾼 것"으로 세지 않는다.

- 이 액션은 **조건 없이 늘 뜬다.** 일정도 할 일도 없는 빈 날에도 "편집"이 보이고, 눌러 들어가면 지울 줄이 없는 편집 상태에 `일정 삭제` 버튼만 선다. 그 상태에서 삭제를 눌러도 `onScheduleDeleteConfirm`이 `schedule?.id`가 없어 **아무 일도 하지 않는다**(`CalendarDayViewModel.kt:209`). 웹에서는 `schedule == null && todos.isEmpty()`일 때 액션을 숨기는 편이 낫다(현 앱 동작과 다른 개선점).
- 라벨 세 개의 리소스는 `calendar_day_edit`("편집") / `calendar_day_edit_done`("확인") / `calendar_day_edit_cancel`("취소")다. 삭제 대화상자의 취소 버튼도 **같은 `calendar_day_edit_cancel`을 재사용**한다.

### 2.4 변이 A — 진료 전 (기본 1r-2)

조건: `records.isEmpty()` → `visited == false`

#### ① 이 날 일정 (`calendar_day_schedule` = **"이 날 일정"**)

컨테이너: `bgPrimaryFaint` 면, radius `lg`(20), `padding 16`, 자식 gap 4.

섹션 헤더 `MedicalMateSectionHeader("이 날 일정")`가 블록 위에 먼저 선다.

| 줄 | 내용 |
| --- | --- |
| 1 | **세 갈래 `when`** (`CalendarDayScreen.kt:205`): ① `visited` → **"진료 완료"** (`labelS` / `fgSuccess`) — dday와 무관하게 **먼저** 이긴다 ② `!visited && dday >= 0` → **"D-5"** (`"D-%1$d"`), `labelS` / `fgSubtle` ③ `!visited && dday < 0` → **이 줄 자체가 없다** |
| 2 | 제목 = `"%1$s %2$s"` (= `home_schedule_title`) → **`{title} 초진`** 또는 **`{title} 재진`**. `headingS` / `fgDefault` |
| 3 | `time ?: "시간 미정"`, `bodyM` / `fgSubtle` |
| 4 | `detail`이 비어있지 않을 때만: `"%1$s 브리핑 카드를 가져가요"` → **"복부 통증 · 3주 브리핑 카드를 가져가요"**, `bodyM` / `fgSubtle` |

- 초진/재진: `followUp ? "재진" : "초진"` (`home_schedule_follow_up` / `home_schedule_first`). 가르는 값은 서버 `origin`.
- **블록 전체가 눌리는 조건은 둘을 모두 만족할 때다** (`CalendarDayScreen.kt:183`):
  ```kotlin
  val edit = schedule.id.toLongOrNull()?.takeIf { schedule.time == null }
  ```
  ① `id`가 `Long`으로 파싱되고 ② `time == null`. 둘 중 하나라도 어긋나면 `clickable`을 **아예 붙이지 않는다**(비활성 클릭이 아니라 클릭 자체가 없다).
- 눌렀을 때 `onClickLabel = "시간 정하기"`, `Role.Button`. 일정 추가 화면이 **그 일정을 고치는 모드**로 열린다. 시각이 정해진 일정은 누를 수 없다(고칠 것이 없는 화면이 뜨는 걸 막기 위함).

#### ② 가져갈 브리핑 카드

| 조건 | 섹션 제목 |
| --- | --- |
| `!visited` | **"가져갈 브리핑 카드"** |
| `visited` | **"브리핑 카드"** (가져갈 일이 끝났으므로) |

`MedicalMateListRow(title = card.title, meta = dayCardMeta(card), badge = dayCardStatus(card), badgeTone = NEUTRAL, type = BADGE)` → 누르면 카드 상세.

- 메타/배지 규칙은 §1.8과 동일.
- 배지 톤은 `NEUTRAL`을 **명시적으로** 넘긴다. **월 화면 카드 시트와 결과가 같다** — 그쪽은 넘기지 않아 기본값 `NEUTRAL`이 되기 때문이다. (두 화면의 배지 톤이 다르다고 읽지 말 것.)
- 고른 날 섹션의 일정 줄(§1.6)만 `BRAND` 톤이다.

#### ③ 진료 전 할 일 (`calendar_day_todo` = **"진료 전 할 일"**)

- `shownTodos`가 비면 **섹션 헤더까지 통째로 숨긴다.**
- 줄 = `MedicalMateTodoRow` (체크박스 24, radius 8, 간격 12, 행 높이 54, 행 전체가 hit area)
- 체크는 편집 중이 아니어도 그 자리에서 켜고 끈다.
- **삭제 ×는 편집 상태(1r-2-E)에만 붙는다.** 아이콘 버튼 `GHOST` / `L`(48 상자, 24 아이콘), contentDescription = `"%1$s 지우기"` → **"복용 중인 약 챙기기 지우기"**
- **이 화면에는 할 일 "추가"가 없다.** 추가는 일정 추가 화면(1r-4)에만 있다.

#### ④ 이 날 기록 (`calendar_day_record` = **"이 날 기록"**) — 빈 상태

섹션 헤더는 **항상** 그린다. `records`가 비면 빈 상태:

```
MedicalMateEmptyState(
  type        = NO_RECORD,                            // 기본 아이콘: EmptyBox, 옅은 브랜드 원 안
  title       = "아직 진료 전이에요",
  description = "진료가 끝나면 들은 내용을 여기에 기록할 수 있어요",
  actionLabel = card != null ? "진료 후 기록하기" : null,
  onActionClick = card != null ? { ... } : null,
)
```

**"진료 후 기록하기" CTA 조건 (중요)**

> `state.card != null` 일 때만 버튼이 나온다. 카드가 없으면 **버튼 자체를 두지 않고** 제목·설명만 남긴다.
> 이유: 서버가 "확정한 카드 하나에 기록 하나"를 받는 구조라, 카드 없이 그 흐름에 들어가면 마지막 저장이 아무 일도 하지 않는다. 비활성 버튼을 두는 대신 아예 없앤다.

빈 상태는 `fillMaxWidth` + `horizontalAlignment = CenterHorizontally` Column으로 한 번 더 감싸 **가운데 정렬**된다(`CalendarDayScreen.kt:323`). `MedicalMateEmptyState` 자체도 `padding(vertical = 40)`, 자식 간 `12`, 제목↔설명 `6`, 아이콘 원 아래 `+4`를 갖는다.

버튼 시각: 채움 없는 글자 버튼(높이 48, radius 14, `Label/L`, `fg/link`). 마스터는 Tonal 알약이지만 시안 인스턴스가 전부 채움을 지웠다.

누르면 넘기는 값: `(cardId = card.id, cardTitle = card.title, visitedOn = 이 화면의 date, clinic = schedule?.title, address = card.clinicAddress)`

#### ⑤ 다음 일정 — 진료 전에는 **없다**

`nextEvent`는 `records.firstOrNull()`이 있을 때만 만든다. 즉 **기록이 있는 날에만 붙는다.** 아직 오지 않은 날에 붙이면 "이 날 일정"과 "다음 일정"이 나란히 서서 어느 쪽이 오늘 갈 곳인지 흐려지기 때문.

### 2.5 변이 B — 진료 완료 (1r-2-A / 1r-2-A2)

조건: `records.isNotEmpty()` → `visited == true`

진료 전 대비 달라지는 것:

| 섹션 | 진료 전 | 진료 완료 |
| --- | --- | --- |
| 일정 카드 첫 줄 | `"D-5"` (`labelS` / `fgSubtle`) | **"진료 완료"** (`labelS` / **`fgSuccess`**) — D-day 표기를 **완전히 대체한다** |
| 카드 섹션 제목 | "가져갈 브리핑 카드" | **"브리핑 카드"** |
| 카드 배지 | "진료 전" | "진료 완료" (`card.visited`가 true가 된 경우) |
| 진료 전 할 일 | 있음 | **없음** — `load()`가 `records.isNotEmpty()`면 `todos = emptyList()`로 만든다 |
| 이 날 기록 | 빈 상태 + CTA | **ListRow 목록** |
| 다음 일정 | 없음 | **있음** |

#### 기록 줄

기록 건수만큼 `MedicalMateListRow(title = "진료 후 기록", meta = ..., onClick = 기록 상세)`.

메타 만드는 법 (`DayRecord.filled()`, `CalendarDayViewModel.kt:136`):
1. 목록 응답에는 병원 이름뿐 → 일단 `meta = clinic`
2. `GET /api/visits/{visitId}`로 상세를 읽어 **소견 → 약 → 재방문** 세 축만 **그 순서로** 뽑는다
   (`AXIS_FINDINGS = "findings"`, `AXIS_MEDICATION = "medication_instructions"`, `AXIS_FOLLOW_UP = "follow_up"`)
3. 각 값의 **첫 줄만** `trim()` 해서 쓰고, 빈 값은 뺀다
4. `" · "`로 이음 → **"위염 초기 · 2주 약 · 09.26 재방문"**
5. 셋이 다 없으면 병원 이름이 그대로 남는다

> 검사(`tests`) 축이나 AI가 늘린 축은 **넣지 않는다**(한 줄 메타가 넘침).

하루에 진료를 두 번 받으면 **기록도 두 줄**이다. 카드와 일정은 초진에 묶이고 기록만 진료마다 쌓인다.

#### ⑤ 다음 일정 (`calendar_day_next` = **"다음 일정"**)

컨테이너: **`bgPrimary` 채움**, radius `lg`(20), `padding 16`, 자식 gap 4.
(한 화면에서 채운 면은 여기 하나뿐 — 나머지는 다 지난 일이고 이것만 앞으로 올 일이라 무게가 다르다.)

```
┌───────────────── bgPrimary ─────────────────┐
│ ( 9월 26일 (토) )  ← 흰 알약 chip           │  bgSurface / radius full / padding h10 v4
│                                             │  labelS / fgPrimary
│ 서울OO병원 내과 재방문                        │  headingS / fgOnPrimary
│                                             │
│ ── at == null (1r-2-A) ──                   │
│ 진료 후 기록에서 자동으로 만들었어요            │  bodyS / fgOnPrimary
│ 시간을 정하면 하루 전에 알려드려요              │  bodyS / fgOnPrimary
│ ┌─────────────────────────────────────────┐ │
│ │ 🕐 시간 정하고 확정하기                   │ │  TONAL / M / leadingIcon=Clock
│ └─────────────────────────────────────────┘ │  full width, padding top 8
│                                             │
│ ── at != null (1r-2-A2) ──                  │
│ 9월 26일 (토) 오전 10:30                     │  bodyM / fgOnPrimary
└─────────────────────────────────────────────┘
```

**두 변이 요약**

| | 1r-2-A (시간 미정) | 1r-2-A2 (확정) |
| --- | --- | --- |
| `at` | `null` | `"9월 26일 (토) 오전 10:30"` |
| chip | 날짜 `"9월 26일 (토)"` (+ 대략이면 `" 전후"`) | D-day `"D-14"` |
| 안내 문구 2줄 | 있음 | 없음 |
| 버튼 | **"시간 정하고 확정하기"** | 없음 (대신 `at` 텍스트) |

#### `nextEvent` 결정 규칙 (`CalendarDayViewModel.kt:162`)

```
records가 비어 있으면 → null (다음 일정 섹션 없음)
그 날의 첫 기록 하나로 아래를 따진다:

1) GET /api/me/appointments/upcoming 에서
   status != CANCELED 이고 on > 이 화면의 날짜 인 첫 건
   → 있으면 그것으로 만든다 (확정한 것이 뽑아 둔 것보다 정확하다)
      chip          = "D-" + (on - today)
      title         = appointment.title
      on            = appointment.on
      at            = time != null ? on.atTime(time).format("M월 d일 (E) a h:mm") : null
      appointmentId = appointment.id
      clinic        = appointment.title     ← 제목을 그대로 병원으로 쓴다
      cardId        = null
      followUp      = false

2) 없으면 record.followUp 중 followUp.date > 이 화면의 날짜 인 것
   → 확정 전 재방문으로 만든다
      chip          = followUp.date.format("M월 d일 (E)") + (approximate ? " 전후" : "")
      title         = clinic != null ? "{clinic} 재방문" : "재방문 예정"
      on            = followUp.date
      at            = null                  ← 그래서 1r-2-A 상태
      appointmentId = null                  ← 아직 일정이 아니다
      clinic        = record.clinic
      cardId        = record.cardId
      followUp      = true

3) 둘 다 없으면 null
```

> `approximate`는 환자가 "2주 뒤"처럼 범위로 말한 경우. 정확한 날짜처럼 그리면 "그날이 아니면 안 된다"로 읽혀서 **" 전후"**를 붙인다. → chip 예: **"9월 26일 (토) 전후"**

#### "시간 정하고 확정하기" 흐름

```
클릭 → onScheduleConfirm(clinic, on, appointmentId, cardId, followUp)
     → ScheduleAddDestination(
           hospitalName  = next.clinic,      // 병원 칸이 이미 채워진 1r-4-B 상태로 열린다
           date          = next.on,          // ★ 이 화면의 날짜가 아니라 '다음 진료의 날'
           appointmentId = next.appointmentId, // 있으면 새로 만들지 않고 그 일정을 고친다
           cardId        = next.cardId,      // 가져갈 카드로 미리 골라 둔다
           followUp      = next.followUp,    // true면 저장 시 origin = VISIT_FOLLOW_UP
       )
```

- `appointmentId`를 반드시 들고 간다. 안 그러면 **같은 재방문 일정이 둘** 생긴다.
- `followUp`을 들고 가야 만들어진 일정이 홈·일자 화면에서 **"재진"**으로 적힌다. 안 그러면 캘린더에 점만 찍히고 무엇 하러 가는 날인지가 남지 않는다.

### 2.6 변이 C — 편집 (1r-2-E)

`todoDraft != null`

| 달라지는 것 | 내용 |
| --- | --- |
| NavBar 우측 | "편집" → "취소"(변경 없음) / "확인"(줄을 지웠음) |
| 할 일 줄 | 오른쪽에 **×** 버튼이 붙는다 |
| 본문 맨 끝 | **`일정 삭제`** DANGER 버튼 (full width, 위 여백 12) |
| 나머지 섹션 | 변화 없음 |

#### 진료 전 할 일 CRUD 전체

`CalendarDayTodoActions.kt`

| 조작 | 편집 중 | 편집 아님 |
| --- | --- | --- |
| **체크 토글** `onToggle(id, done)` | `todoDraft`의 해당 줄만 바꾼다. **서버로 안 보낸다** | `todos`의 해당 줄을 바꾸고 **즉시 서버 저장** |
| **삭제 ×** `onDelete(id)` | `todoDraft`에서 그 줄을 뺀다. 확인 대화상자 **없음** | 버튼 자체가 없음 |
| **편집 시작** `onEditStart()` | — | `todoDraft = todos` |
| **취소** `onEditCancel()` | `todoDraft = null`, `deleteRequested = false` → 사본을 버리면 본값이 그대로 남는다 | — |
| **확인** `onEditDone()` | `todos = todoDraft`, `todoDraft = null`, **서버 저장** | — |
| **추가** | **없음** (이 화면에는 추가 UI가 없다) | 없음 |

> **편집 중에는 저장하지 않는다.** 취소가 실행 취소를 대신하는데 이미 보냈으면 되돌릴 것이 없다. 편집을 마칠 때 한 번 보낸다.

서버 저장 (`saveTodos`, `CalendarDayViewModel.kt:187`):
- 일정이 없으면(`schedule?.id`가 없으면) 보낼 곳이 없어 아무것도 안 한다.
- `PATCH /api/me/appointments/{id}` 에 `todos = 화면의 전체 목록`을 **통째로** 보낸다(부분 갱신이 아니다. 지운 줄이 남지 않으려면 전부 보내야 한다).

#### 일정 삭제 흐름

```
[편집 상태] 본문 끝 "일정 삭제" (DANGER)
   ↓
deleteRequested = true → MedicalMateDialog (tone = DANGER, 폭 고정)
   제목:   "이 일정을 삭제할까요?"
   본문:   "캘린더와 하루 전 알림이 함께 사라져요"
   확인:   "삭제"        → DELETE /api/me/appointments/{id}
   취소:   "취소"        → deleteRequested = false
   ↓
성공 → deleteRequested = false, 화면을 떠남(popBackStack → 캘린더)
실패 → 아무 일도 일어나지 않는다 (화면에 그대로 남는다).
       지워지지 않았는데 닫으면 캘린더에 그 일정이 그대로 있어서 혼란스럽다.
```

### 2.7 일자 화면 로딩 / 빈 / 에러

| 상태 | 화면 |
| --- | --- |
| **로딩** | `uiState`가 `null`인 동안 `CalendarDayRoute`가 `state ?: return` 으로 **아무것도 그리지 않는다** (NavBar조차 없는 완전 빈 화면). → 웹에서는 스켈레톤이나 최소한 NavBar를 먼저 그리는 편이 낫다. |
| **일정 없는 날** | 일정/카드 섹션이 통째로 사라지고, **"이 날 기록" 헤더 + 빈 상태**만 남는다. 카드도 없으므로 "진료 후 기록하기" 버튼도 없다. |
| **에러** | **전용 에러 UI 없음.** 일정/기록/카드 호출 모두 실패를 `orEmpty()` / `?: return` 으로 삼킨다. 빈 날처럼 보인다. 삭제 실패만 조용히 무시된다. |

### 2.8 일자 화면에서 나가는 모든 경로

| 트리거 | 목적지 | 넘기는 값 |
| --- | --- | --- |
| NavBar `‹` | 뒤로 (캘린더) | — |
| 카드 줄 탭 | 브리핑 카드 상세 1e-1 | `cardId` |
| 시각 미정 일정 카드 탭 | 일정 추가 1r-4 (고치기 모드) | `clinic = null`, `date = 이 화면의 날짜`, `appointmentId`, `cardId = null`, `followUp = false` |
| 빈 상태 `진료 후 기록하기` | **병원이 있으면** 병원 확인 1m-12 (`ClinicConfirmDestination`) / **없으면** 병원 찾기 1m-B (`HospitalPickDestination`) | `clinic`(=schedule.title), `address`(=card.clinicAddress), `cardId`, `cardTitle`, `visitedOn`(=이 화면의 날짜) |
| 기록 줄 탭 | 진료 후 기록 상세 (`VisitDetailDestination`) | `recordId` |
| `시간 정하고 확정하기` | 일정 추가 1r-4-B | `hospitalName`, `date = next.on`, `appointmentId`, `cardId`, `followUp` |
| `일정 삭제` → `삭제` 성공 | 뒤로 (캘린더) | — |

> `visitedOn`은 **오늘이 아니라 이 화면의 날짜**다. 어제 진료를 오늘 적어도 기록은 그 날에 남는다.

---

## 3. 화면 1r-4 — 일정 추가 (Figma `1062:3031`)

변이: `1r-4`(빈 폼) · `1r-4-B`(병원 미리 채워짐) · `1r-4-C`(다 채워진 상태) · `1r-4-D`(날짜 시트 `1063:3131`) · `1r-4-T`(시간 시트 `1063:3372`)

### 3.1 상태 (UiState)

#### `ScheduleAddUiState` — `ScheduleAddUiState.kt:19`

| 필드 | 타입 | 기본값 | 의미 |
| --- | --- | --- | --- |
| `appointmentId` | `Long?` | `null` | 있으면 **새로 만들지 않고 그 일정을 고친다**. 시간 미정 일정에 시각을 채우러 들어오는 길. |
| `followUp` | `Boolean` | `false` | 재방문 확정으로 들어왔는지. 저장 시 `origin`이 된다. |
| `cards` | `List<ScheduleAddCard>` | `emptyList()` | 가져갈 카드 후보 전체. |
| `todos` | `List<ScheduleAddTodo>` | `emptyList()` | 이 일정에 딸린 할 일. |
| `hospital` | `String?` | `null` | 병원 이름. **필수.** |
| `date` | `LocalDate?` | `null` | 날짜. **필수.** |
| `time` | `LocalTime?` | `null` | 시각. **선택** — 안 고르면 "시간 미정"으로 저장된다. |
| `showErrors` | `Boolean` | `false` | 저장을 누른 뒤부터 true. 화면을 열자마자 붉히지 않는다. |
| `sheet` | `ScheduleAddSheet` | `NONE` | 떠 있는 시트. `NONE | DATE | TIME`. |

**파생값**

| 이름 | 계산식 |
| --- | --- |
| `pickedCardCount` | `cards.count { it.picked }` |
| `canSave` | `hospital != null && date != null` |
| `hospitalMissing` | `showErrors && hospital == null` |
| `dateMissing` | `showErrors && date == null` |

#### `ScheduleAddCard` — `ScheduleAddUiState.kt:60`

| 필드 | 타입 | 기본값 | 의미 |
| --- | --- | --- | --- |
| `id` | `String` | — | 서버 카드 id. |
| `title` | `String` | — | 카드 제목 (예: "복부 통증 · 3주"). |
| `meta` | `String` | — | `"{MM.dd} 작성 · {병원}"` → **"09.04 작성 · 서울OO병원 내과"**. 병원이 없으면 **"09.04 작성 · 병원 미정"**. |
| `clinic` | `String?` | `null` | 그 카드로 갈 병원. 카드를 고르면 병원 칸을 이 값으로 채운다. |
| `picked` | `Boolean` | `false` | 골랐는지. |

#### `ScheduleAddTodo` — `ScheduleAddUiState.kt:75`

| 필드 | 타입 | 기본값 | 의미 |
| --- | --- | --- | --- |
| `id` | `String` | — | 기존 줄은 `"todo-1"…`, 새 줄은 `"todo-new-1"…`(카운터 증가). |
| `label` | `String` | — | 할 일 문구. |
| `done` | `Boolean` | `false` | 체크 여부. |
| `editing` | `Boolean` | `false` | true면 그 자리에서 글자를 받는 입력 상태. |

#### `ScheduleAddSheet` (enum)

```
NONE | DATE | TIME
```

### 3.2 레이아웃 (위 → 아래)

```
┌─────────────────────────────────────────┐
│ NavBar  title="일정 추가"  leading=CLOSE(×)│  ← 흐름 중간이 아니라 따로 열리는 폼이라 ×
├─────────────────────────────────────────┤
│ [스크롤 영역] padding h=20 v=8            │
│                                         │
│  "병원"                    ← FieldLabel  │  bodyS/fgSubtle, padding top16 bottom6
│  ┌─────────────────────────────────┐    │
│  │ 진료받을 병원을 찾아주세요      › │    │  PickerField (높이 56, radius 16)
│  └─────────────────────────────────┘    │
│  (병원을 골라주세요)       ← 오류 시      │  bodyS / fgDanger, 위 gap 8
│                                         │
│  "날짜 · 시간"             ← FieldLabel  │
│  ┌──────────────┐ ┌──────────────┐     │  Row, gap 10, 각 weight(1f)
│  │ 날짜      📅 │ │ 시간      🕐 │     │
│  └──────────────┘ └──────────────┘     │
│  (날짜를 골라주세요)                     │
│                                         │
│  SectionHeader                          │
│    "가져갈 브리핑 카드"      "선택 안 함" │  caption (bodyMStrong / fgSubtle)
│  ┌─────────────────────────────────┐    │  Column gap 10
│  │ ☑ 복부 통증 · 3주                │    │  CardPick (320x84)
│  │   09.04 작성 · 서울OO병원 내과    │    │
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │ ☐ 두통 · 잦은 어지러움           │    │
│  │   08.21 작성 · 병원 미정         │    │
│  └─────────────────────────────────┘    │
│  ＋ 새 카드 만들기            ← AddRow   │  높이 48, 아이콘 18, fgPrimary
│                                         │
│  SectionHeader "진료 전 할 일"           │
│  ☑ 달라진 증상 있으면 카드 수정      ×   │  TodoRow (높이 54) + 삭제 ×(항상)
│  ☐ 복용 중인 약 챙기기               ×   │
│  ＋ 할 일 추가                 ← AddRow  │
│                                         │
├─────────────────────────────────────────┤
│ BottomCtaBar                            │
│  ┌─────────────────────────────────┐    │
│  │            저장하기              │    │  full width, 늘 활성
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

### 3.3 필드별 상세

#### 병원 (필수)

| 항목 | 값 |
| --- | --- |
| 라벨 | **"병원"** |
| 플레이스홀더 | **"진료받을 병원을 찾아주세요"** |
| trailing 아이콘 | `chevron-right` (기본값) |
| 동작 | 병원 찾기 화면(1m-B, `HospitalPickDestination(purpose = SCHEDULE)`)으로 이동 |
| 오류 문구 | **"병원을 골라주세요"** (`showErrors && hospital == null`) |

`MedicalMatePickerField` 시각 규격: 높이 최소 56, radius 16, `padding(start=20, end=16)`, 텍스트 `bodyL`.
테두리 색: `!enabled → borderSubtle` / `error → fgDanger` / `채워짐 → fgDefault` / **`비었음 → borderStrong`**.
값 색: `채워짐 → fgDefault` / `비었음 → fgSubtle`.

**병원 값이 채워지는 다섯 경로** (우선순위는 `load()`의 `state.hospital ?: editing?.title ?: picks.pickedClinic()`, `ScheduleAddViewModel.kt:69`)

1. 라우트 인자 `hospitalName` — 1r-4-B로 바로 열리는 경우(재방문 확정, 다음 일정에서 진입). `LaunchedEffect(hospitalName) { onHospitalPicked(hospitalName) }`로 들어간다
2. 병원 찾기에서 고르고 돌아오기 — **라우트가 아니라 `NavResult.HOSPITAL_NAME`(SavedStateHandle)로 받는다.** 화면 엔트리가 그대로 살아 있어서 적어 둔 날짜·시간·할 일이 보존된다
3. **고치기 모드(`appointmentId` 있음)** — 서버에서 읽어 온 그 일정의 **`title`을 통째로 병원 칸에 넣는다**(`editing?.title`). `title`은 `clinicName + department + purpose`를 이어 만든 문자열이라 **"서울OO병원 내과 재진"처럼 과·목적까지 병원 칸에 들어간다**(알려진 한계 — 그 값은 PATCH로 나가지 않아 서버에는 영향이 없다)
4. **라우트 `cardId`로 미리 골라진 카드의 `clinic`** — `load()`가 목록을 채운 뒤 `picks.pickedClinic()`(골라진 첫 카드의 `clinic`)으로 넣는다
5. 화면에서 카드를 손으로 고를 때 그 카드의 `clinic`으로 자동 채움 (아래 `onCardPickChange`)

> 1·2번(`onHospitalPicked`)은 **이미 값이 있어도 덮어쓴다**. 3·4·5번은 `state.hospital ?: …`라 **비어 있을 때만** 채운다. 그래서 병원 찾기에서 고른 값이 늘 이긴다.

#### 날짜 (필수) · 시간 (선택)

| 항목 | 날짜 | 시간 |
| --- | --- | --- |
| 라벨(공통) | **"날짜 · 시간"** (두 필드 위에 하나) | |
| 플레이스홀더 | **"날짜"** | **"시간"** |
| 아이콘 | `Calendar` | `Clock` |
| 값 형식 | `"M월 d일 (E)"` → **"9월 26일 (토)"** | `"%1$s %2$d:%3$02d"` → **"오전 10:30"** |
| 오류 문구 | **"날짜를 골라주세요"** | 없음 (필수 아님) |
| 동작 | `sheet = DATE` | `sheet = TIME` |

시간 라벨 만드는 법 (`ScheduleAddScreen.kt:272`):
```
meridiem = time.hour < 12 ? "오전" : "오후"
hour     = time.hour % 12 ; if (hour == 0) hour = 12
label    = `${meridiem} ${hour}:${String(minute).padStart(2,'0')}`
```
> `DateTimeFormatter`의 `a`를 쓰지 않는다 — 오전/오후가 기기 로케일에서 와 번역 대상이 아니게 되기 때문.

#### 가져갈 브리핑 카드

- 섹션 헤더 제목: **"가져갈 브리핑 카드"**
- 헤더 오른쪽 **caption**(누를 수 없는 표시, `bodyMStrong` / `fgSubtle`):
  - 고른 게 0장 → **"선택 안 함"**
  - 1장 이상 → `"%1$d개"` → **"1개"**
- 후보 목록 = `GET /api/me/cards` 전체 (그 달 필터 없음)
- 줄 = `MedicalMateCardPick` — 흰 면 + `Elevation.card` 그림자, radius 20, `padding(h = 18, v = 16)`, 제목↔메타 간격 2
  - 고르면 **두 가지가 함께 바뀐다**: 체크 상자 채움 + 1.5px `bgPrimary` 테두리 (색만으로 구분하지 않는다)
  - **행 전체가 hit area** (`Role.Checkbox`)
- 목록 끝 `MedicalMateAddRow` **"새 카드 만들기"** → 증상 문답(`IntakeDestination`)으로 이동

**카드를 고르면 병원 칸이 자동으로 채워진다** (`onCardPickChange`, `ScheduleAddViewModel.kt:142`)
```
cards[id].picked = picked
clinic = (그 id가 지금 picked이고 clinic이 비어있지 않으면) 그 clinic
hospital = hospital ?? clinic          // 이미 적힌 병원은 덮지 않는다
```
- 손으로 고른 병원이 카드에 적힌 것보다 나중의 뜻이므로 **덮어쓰지 않는다.**
- **카드를 풀어도 병원을 지우지 않는다** (잘못 눌렀다 되돌린 사람의 병원까지 사라지는 걸 막음).

#### 진료 전 할 일

- 섹션 헤더: **"진료 전 할 일"** (caption 없음)
- 줄 = `MedicalMateTodoRow`
  - 삭제 × 는 **항상** 붙는다 (일자 화면과 달리 편집 모드가 없다). contentDescription = `"%1$s 삭제"` → **"복용 중인 약 챙기기 삭제"**. 라벨이 비었으면 플레이스홀더 문구를 대신 넣는다 → **"챙길 것을 적어주세요 삭제"**
  - `editing == true`인 줄은 체크박스 옆이 **밑줄 있는 인라인 입력**이 된다(1px `borderStrong` 밑줄, 글자 `bodyL`, `ImeAction.Done`)
  - 빈 줄의 플레이스홀더: **"챙길 것을 적어주세요"**
- 목록 끝 `MedicalMateAddRow` **"할 일 추가"**

**할 일 CRUD 전체** (`ScheduleAddTodoActions.kt`)

| 조작 | 동작 |
| --- | --- |
| `onAddClick()` | 목록 **끝에** `{id: nextId(), label: "", editing: true}` 를 붙인다. 새 입력 필드를 따로 띄우지 않는다 |
| `onLabelChange(id, label)` | 그 줄의 `label` 갱신 |
| `onEditDone(id)` | 라벨이 **공백뿐이면 그 줄을 지운다**, 아니면 `editing = false`. 키보드 완료 또는 포커스 이탈로 호출 |
| `onToggle(id, done)` | 그 줄의 `done` 갱신 |
| `onDeleteClick(id)` | 그 줄 제거. **확인 대화상자 없음** (개체가 아니라 안의 항목) |

- 새 줄의 id는 `"todo-new-{n}"` 카운터로 만든다. 시간 기반이면 같은 밀리초에 두 번 누를 때 겹치고, 목록 크기 기반이면 지운 뒤 추가할 때 살아 있는 항목과 부딪친다.
- 새 줄이 생기면 **자동으로 포커스 + 키보드**가 올라오고, 화면을 그 줄로 스크롤한다.
- 그 뒤 **"할 일 추가" 줄까지 화면 안으로 끌어올린다.** 키보드 높이가 멎을 때까지(`IME_SETTLE_MS = 120ms` 디바운스) 기다렸다가 옮긴다 — 한 번만 옮기면 뒤에 올라온 키보드가 다시 가린다.

#### 하단 CTA

- `MedicalMateBottomCtaBar` (면 `bgSurface`) 안에 `MedicalMateButton(label = "저장하기")`, full width.
- **항상 누를 수 있다.** 비활성으로 막지 않는다 — "눌러야 무엇이 비었는지 알 수 있다".

### 3.4 날짜 선택 시트 (1r-4-D, Figma `1063:3131`)

`ScheduleAddSheets.kt:92`

```
┌── BottomSheet (자식 gap 12) ──────────────┐
│           날짜 선택                        │  bodyLStrong, 가운데 정렬
│   [‹]    2026년 9월    [›]                │  IconButton size=S
│   일 월 화 수 목 금 토                      │  labelS / fgSubtle
│   □ □ □  1  2  3  4                       │  DateCell 34px (compact)
│   5  6  7  8  9 10 11                     │  marker 없음
│  ...                                      │
│   ┌────────────────────────────────────┐  │
│   │              확인                   │  │  full width
│   └────────────────────────────────────┘  │
└───────────────────────────────────────────┘
```

| 규칙 | 값 |
| --- | --- |
| 초기 선택 | `state.date ?: today` |
| 초기 표시 월 | `YearMonth.from(picked)` |
| 셀 크기 | **34px** (`MedicalMateDateCellSizeCompact`) — 시트 안이라 42로는 한 달이 안 들어간다 |
| 기록/예정 점 | **찍지 않는다** (앞으로의 날을 고르는 자리라 지난 기록은 판단에 쓰이지 않는다) |
| 오늘 표시 | 그대로 있음 (`isToday`) |
| 과거 날짜 막기 | **없음** — 과거도 고를 수 있다 |
| 주 시작 | 일요일 (월 화면과 동일한 `firstDayOffset` 계산) |
| 확정 | **"확인"** 버튼을 눌러야 `state.date`에 반영되고 시트가 닫힌다 |
| 취소 | 끌어내리기 / 스크림 탭 → 고른 값 **버려짐** |
| "오늘" 기준 | 이 시트만 주입 `Clock`이 아니라 `remember { LocalDate.now() }`로 **시스템 시계를 직접** 읽는다(`ScheduleAddSheets.kt:93`). 나머지 화면은 모두 주입된 `Clock`을 쓴다 |
| 달 이동 | 시트 안 상태(`month`)만 바꾼다. 고른 날(`picked`)은 **그대로 남아** 다른 달로 넘겨도 `확인`을 누르면 원래 고른 날이 확정된다 |

### 3.5 시간 선택 시트 (1r-4-T, Figma `1063:3372`)

`ScheduleAddSheets.kt:197`

```
┌── BottomSheet ────────────────────────────┐
│           시간 선택                        │  bodyLStrong, 가운데
│  ┌──────────────────────────────────────┐ │  높이 156
│  │        (위쪽 값들, 흐림)              │ │
│  │ ▓▓▓ 오전 ▓▓ 10 ▓▓ 30 ▓▓▓             │ │  ← 가운데 밴드 48px
│  │        (아래쪽 값들, 흐림)            │ │     bgPrimaryFaint, radius sm(12)
│  └──────────────────────────────────────┘ │
│   ┌────────────────────────────────────┐  │
│   │              확인                   │  │
│   └────────────────────────────────────┘  │
└───────────────────────────────────────────┘
```

**세 열의 값**

| 열 | 값 | 비고 |
| --- | --- | --- |
| 오전/오후 | **"오전"**, **"오후"** | 2개. 초기 선택은 `time.hour >= 12` |
| 시 | **`12, 1, 2, … , 11`** (이 순서 그대로) | `(0 until 12).map { if (it == 0) 12 else it }` — **12가 맨 앞이다**(0시 자리에 12를 그린다). 고를 때 `hours[index] % 12`로 되돌린다. `LocalTime` 시가 0~23이라 그쪽에 맞춤 |
| 분 | `00, 10, 20, 30, 40, 50` | **10분 단위** (`MINUTE_STEP = 10`). 시안 휠에는 00/30만 그려져 있지만 그건 3줄만 보이는 상태를 그린 것이고, 예약이 10분 단위인 병원이 있어 이 눈금으로 연다 |

**규격**

| 항목 | 값 |
| --- | --- |
| 휠 전체 높이 | `156dp` (3칸이 보인다) |
| 항목 높이 | `52dp` |
| 가운데 밴드 높이 | `48dp` (항목보다 낮아 위아래 항목이 밴드 밖으로 나온다) |
| 위아래 여백 | `contentPadding(vertical = 52dp)` — 첫/마지막 항목도 가운데 밴드에 올 수 있게 |
| 고른 항목 스타일 | `bodyLStrong` / `fgDefault` |
| 나머지 | `bodyL` / `fgSubtle` |
| 기본값 | `10:00` (`DefaultTime`) — `state.time`이 있으면 그 값 |
| 분 스냅 | 초기값은 `minute / 10 * 10` 으로 내림 |

**동작**

1. **굴려서 고른다** — `rememberSnapFlingBehavior` 스냅. 스크롤이 **멈춘 뒤** 가운데 항목을 고른 값으로 올린다(스크롤 중에 올리면 목록이 스스로 되감긴다).
2. **밴드 밖의 값도 눌러서 고른다** — 그 항목으로 애니메이션 스크롤한 뒤 멈춘 자리가 고른 값이 된다. (값이 둘뿐인 열에서 굴리는 것만으로는 얼마나 움직여야 하는지 안 보이고, 보이는 글자를 눌렀는데 아무 일도 안 일어나면 안 되기 때문. 스크린 리더도 이 경로로 지나간다.)
3. **휠 스크롤이 시트에 전달되지 않게 막는다** — `NestedScrollConnection`의 `onPostScroll`/`onPostFling`에서 남은 세로 스크롤을 전부 삼킨다. 안 막으면 맨 위 값에서 아래로 끌 때 목록이 아니라 **시트가 내려가 닫힌다**(고르려던 동작이 취소로 읽힘).
   → **웹에서는 휠 컨테이너에 `overscroll-behavior: contain`을 주고, 드로어의 드래그 핸들 영역을 휠 밖으로 빼라.**
4. **"확인"** 을 눌러야 값이 확정된다: `LocalTime.of(hour % 12 + (afternoon ? 12 : 0), minute)`

### 3.6 저장 규칙 (`onSaveClick`, `ScheduleAddViewModel.kt:179`)

```
1) canSave == false  (hospital == null || date == null)
   → showErrors = true, 서버로 안 나감, 그 칸 아래에 오류 문구가 뜬다. 끝.

2) saving 플래그가 서 있으면 무시 (두 번 눌러 일정이 둘 생기는 것을 막는다)

3) cardIds = 고른 카드들의 id 중 Long으로 파싱되는 것
   todos   = 라벨이 공백이 아닌 줄만 → { text, done }   ← 빈 줄은 뺀다

4-A) appointmentId != null  →  PATCH /api/me/appointments/{id}
     {
       scheduledOn:   date,
       scheduledTime: clearTime ? 생략 : time,
       clearTime:     (time == null) ? true : 생략,
       cardIds:       [...],          // 통째로 갈아끼움
       todos:         [...],          // 통째로 갈아끼움
     }
     ★ clinicName(병원)은 보내지 않는다 — 서버 수정 요청에 병원 자리가 없다.
       고치러 들어온 화면에서 병원을 바꿔도 그 값은 나가지 않는다.

4-B) appointmentId == null  →  POST /api/me/appointments
     {
       clinicName: hospital,
       scheduledOn: date,
       scheduledTime: time,           // null이면 시간 미정
       cardIds: [...],
       origin: followUp ? "VISIT_FOLLOW_UP" : (MANUAL이면 필드 자체를 생략),
       todos: [...],
     }

5) saving = false  (성공·실패 상관없이 푼다 → 실패해도 다시 누를 수 있다)
   성공 → onSaved() → popBackStack (앞 화면으로)
   실패 → 아무 일도 일어나지 않는다. (에러 UI 없음)
```

보충:

- `canSave`가 false면 **`showErrors = true`만 세우고 끝난다.** `saving` 가드(2단계)에 걸려 되돌아가는 경우에는 `showErrors`를 건드리지 않는다.
- 4-A의 `clearTime`은 `state.time == null`로 **항상 계산되어** `AppointmentEdit`에 들어가고, 실제로 JSON에 실릴지는 Repository가 정한다: `clearTime = true.takeIf { edit.clearTime }`(false면 `null` → 생략), `scheduledTime = edit.time?.format(...).takeUnless { edit.clearTime }`. 그래서 **둘이 동시에 나가는 일이 없다**(`AppointmentRepository.kt:72`).
- 4-A가 실제로 보내는 필드는 **`scheduledOn` · `scheduledTime`/`clearTime` · `cardIds` · `todos` 넷뿐**이다. `AppointmentEdit`에 `clinicName`·`department`·`status` 자리가 아예 없어 Repository도 그 셋을 만들지 않는다.
- 4-B의 `origin`은 ViewModel이 `MANUAL`/`VISIT_FOLLOW_UP` enum으로 늘 넘기고, Repository가 `origin.takeIf { it != MANUAL }?.name`으로 **MANUAL일 때만 필드를 지운다**(`AppointmentRepository.kt:59`).
- 4-B는 `department` · `purpose`를 보내지 않는다(`NewAppointment`의 기본값 `null`). 이 화면에 그 두 칸이 없다.

### 3.7 로딩 / 빈 / 에러

| 상태 | 화면 |
| --- | --- |
| 로딩 | 전용 UI 없음. 빈 폼이 먼저 그려지고 카드 목록이 나중에 채워진다. |
| 카드 0장 | 카드 섹션에 `새 카드 만들기` 한 줄만 남고 caption은 "선택 안 함". |
| 할 일 0줄 | `할 일 추가` 한 줄만 남는다. |
| 필수 미입력 | 저장 클릭 후 해당 PickerField 테두리 `fgDanger` + 아래 문구. |
| 네트워크 에러 | **에러 UI 없음.** 저장 버튼을 눌러도 화면이 그대로 남는다(닫히지 않는 것으로만 알 수 있다). → 웹에서는 토스트를 붙이는 것을 권장. |

### 3.8 일정 추가 화면에서 나가는 모든 경로

| 트리거 | 목적지 | 비고 |
| --- | --- | --- |
| NavBar `×` | 뒤로 (popBackStack) | 적은 내용은 버려진다 |
| 병원 필드 | 병원 찾기 1m-B (`purpose = SCHEDULE`) | 결과는 `NavResult.HOSPITAL_NAME`로 돌아온다(엔트리 유지) |
| `새 카드 만들기` | 증상 문답 `IntakeDestination` | |
| `저장하기` 성공 | 뒤로 (popBackStack) | |
| 날짜/시간 필드 | 시트 (화면 이동 아님) | |

### 3.9 들어오는 경로 (라우트 인자)

`ScheduleAddDestination` — `ScheduleAddDestination.kt:33`

| 인자 | 타입 | 채워지는 경우 |
| --- | --- | --- |
| `hospitalName` | `String?` | 1r-4-B — 다음 일정 확정으로 들어온 경우 |
| `date` | `String?` (ISO) | 캘린더에서 그 달의 날을 골라 들어왔거나, 일자 화면에서 온 경우. **없으면 이 화면에서 고른다(1r-4-D)** |
| `appointmentId` | `Long?` | 있으면 고치기 모드 |
| `cardId` | `String?` | "이 카드로 일정 만들기"로 들어온 경우 — 그 카드가 **이미 골라진 채로** 열린다 |
| `followUp` | `Boolean` | 재방문 확정으로 들어온 경우 |

**`load()`가 상태에 채우는 값 전부** (`ScheduleAddViewModel.kt:54`)

```
editing = (state.appointmentId == null) ? 서버에서 그 일정 읽기 : null
cards   = GET /api/me/cards  (전체)

picked  = editing != null ? editing.cards 의 id 집합        ← ★ 고치기 모드에서는
                          : (지금 골라 둔 것) + 라우트 cardId    라우트 cardId를 무시한다

appointmentId = editing?.id ?: state.appointmentId
followUp      = state.followUp || followUp        ← 한 번 서면 내려가지 않는다
hospital      = state.hospital ?: editing?.title ?: picks.pickedClinic()
date          = state.date ?: editing?.on
time          = state.time ?: editing?.time
cards         = 서버 카드 전체, 위 picked 집합으로 picked 플래그만 얹음
todos         = editing?.todos?.toDrafts() ?: state.todos   ← id는 "todo-{index+1}"
```

- `date` / `time` / `hospital` 모두 **`state.?:` 로 감싸 이미 적힌 값을 덮지 않는다.** 화면이 다시 조합돼도 사용자가 시트에서 고친 값이 살아남는다.
- `todos`만 예외로 **고치기 모드에서는 서버 값이 화면 값을 덮는다**(`editing?.todos?.toDrafts() ?: state.todos`). 다만 `editing`은 `appointmentId`가 아직 없을 때 한 번만 만들어지므로 실제로 덮이는 것은 첫 로드뿐이다.

`load()`의 중요 규칙:
- 이 함수는 **화면이 조합될 때마다** 온다(병원 고르러 나갔다 돌아오면 또 온다).
- **골라 둔 카드를 지우지 않는다.** 목록을 통째로 갈아끼우면 골라 둔 카드가 조용히 풀리고, 그대로 저장하면 카드가 안 걸린 일정이 되어 나중에 그 일정으로 진료 후 기록을 남길 수 없다.
- `appointmentId`가 이미 상태에 있으면 서버에서 다시 읽지 않는다(고치는 중 입력을 덮어쓰지 않으려고).
- 고치러 들어온 일정을 찾는 방법: **id로 읽는 서버 경로가 없어서** `GET /api/me/appointments?date={date}`로 그 날 목록을 받아 id로 고른다.
- `onDatePrefilled`: 이미 날짜가 들어 있으면 **덮지 않는다**(병원 고르러 갔다 오는 길에 시트에서 고친 날이 처음 값으로 되돌아가는 것을 막음).

---

## 4. `FollowUpAppointmentScheduler` — 재방문 → 일정 자동 생성 규칙

`calendar/data/FollowUpAppointmentScheduler.kt` (인터페이스는 `core/model/FollowUpScheduler.kt`)

### 4.1 누가 부르는가

진료 후 기록(`VisitRecordViewModel.onSave`)이 **저장에 성공한 직후** 부른다. 서버가 자동으로 만들지 않는다 — "환자가 보고 등록하는 흐름"으로 못 박혀 있고, AI가 날짜를 잘못 뽑아도 조용히 일정이 생기면 안 되기 때문. 확인은 1q-1 화면이 한다(재방문 줄의 날짜를 보고 고칠 수 있고, 그 화면의 저장이 곧 확인이다).

### 4.2 날짜 판정 규칙 (2단 게이트)

**1단 — 호출부 (`VisitRecordViewModel.scheduleFollowUp`, `:174`)**

```kotlin
val on = record.followUp?.date ?: return          // 재방문 날짜가 없으면 아무것도 안 한다
if (!on.isAfter(visitedOn)) return                // ★ 재방문 날짜가 '진료일'보다 뒤여야 한다
followUpScheduler.schedule(record.clinic, on, cardId)
```

- 비교 기준은 **오늘이 아니라 `visitedOn`(그 진료를 받은 날)** 이다. 어제 진료를 오늘 적어도 기준은 어제다.
- `on == visitedOn` 도 만들지 않는다(엄격한 `isAfter`).

**2단 — 스케줄러 (`FollowUpAppointmentScheduler.schedule`)**

```kotlin
val clinicName = clinic?.takeIf { it.isNotBlank() } ?: return
   // ① 병원 이름이 없거나 공백이면 만들지 않는다 (서버가 일정에 병원을 요구한다)

val existing = GET /api/me/appointments?date={on}
val booked = existing.any { it.status != CANCELED && it.cards.any { c -> c.id == cardId } }
if (booked) return
   // ② 그 날 '같은 카드'로 걸린 일정이 이미 있으면 만들지 않는다
   //    (기록을 다시 저장하거나 같은 진료의 재방문을 두 번 남겨도 일정이 둘 되지 않게)
   //    ★ 취소(CANCELED)된 일정은 세지 않는다 — 취소는 '안 간 것'이라 그 자리에 다시 잡을 수 있어야 한다

POST /api/me/appointments {
    clinicName = clinicName,
    scheduledOn = on,
    scheduledTime = null,    // ③ 시각은 비운다 → "시간 미정"
    cardIds = [cardId],
    origin = "VISIT_FOLLOW_UP",
}
```

### 4.3 결과 규칙 요약

| 규칙 | 값 |
| --- | --- |
| 날짜 | `record.followUp.date` 그대로. 앱이 날짜를 계산하지 않는다(AI 분류 결과). |
| 날짜 유효 조건 | `followUp.date > visitedOn` |
| 병원 | `record.clinic`. **없으면 일정을 만들지 않는다.** |
| 시각 | **항상 비운다** → 일자 화면에 "시간 미정"으로 뜨고, 거기서 눌러 채운다(1r-2 → 1r-4 고치기). |
| 카드 | 그 진료의 브리핑 카드 1장 (`cardIds = [cardId]`) |
| `origin` | `VISIT_FOLLOW_UP` → 홈·일자 화면이 **"재진"**으로 적는다 |
| 중복 방지 | 그 날 + 같은 카드 + 취소 아님 → 스킵 |
| 할 일 | **보내지 않는다** (`NewAppointment.todos` 기본값 빈 목록). 자동 생성된 일정에는 진료 전 할 일이 하나도 없다 |
| 진료과 · 목적 | **보내지 않는다** (`department` · `purpose` 기본값 `null`) |
| 반환 타입 | `suspend fun schedule(clinic: String?, on: LocalDate, cardId: Long)` — **`Unit`**. 만들어진 일정의 id조차 호출부로 돌아가지 않는다 |
| 실패 처리 | **결과를 돌려주지 않는다.** 일정을 못 만들어도 기록 저장은 성공이다. 실패를 조용히 삼킨다. |
| 중복 확인 호출 실패 | `(repository.day(on) as? Success)?.value.orEmpty()` — 조회가 실패하면 빈 목록이 되어 **중복 검사를 통과하고 일정이 하나 더 생긴다**(알려진 한계) |

### 4.4 `VisitFollowUp` 모델

| 필드 | 타입 | 기본값 | 의미 |
| --- | --- | --- | --- |
| `date` | `LocalDate` | — | 다시 오라고 들은 날 |
| `text` | `String?` | `null` | 원문 ("2주 뒤" 등) |
| `approximate` | `Boolean` | `false` | 범위로 말한 것. 화면이 **" 전후"**를 붙인다 |

> 이 값 자체로는 일정이 생기지 않는다. 캘린더의 **예정 점**(빈 원)만 먼저 찍히고, 환자가 1r-2-A의 "시간 정하고 확정하기"로 확정하거나, 기록 저장 직후 위 스케줄러가 만든다.

---

## 5. API 전체

### 5.1 일정 (`AppointmentApi.kt`) — base `/api/me/appointments`

| 메서드 | 경로 | 쿼리/바디 | 응답 | 쓰는 곳 |
| --- | --- | --- | --- | --- |
| `GET` | `/api/me/appointments` | `year`, `month` | `AppointmentResponse[]` | 월 화면 로드 |
| `GET` | `/api/me/appointments` | `date=YYYY-MM-DD` | `AppointmentResponse[]` | 일자 화면 로드 / 일정 추가 고치기 모드 / 재방문 중복 확인 |
| `GET` | `/api/me/appointments/upcoming` | — | `AppointmentResponse[]` (안 지났고 취소 안 된 것, 가까운 순) | 일자 화면 "다음 일정" |
| `POST` | `/api/me/appointments` | `CreateAppointmentRequest` | `AppointmentResponse` | 일정 추가 저장 / 재방문 자동 생성 |
| `PATCH` | `/api/me/appointments/{appointmentId}` | `UpdateAppointmentRequest` | `AppointmentResponse` | 일정 고치기 / 할 일 저장 |
| `DELETE` | `/api/me/appointments/{appointmentId}` | — | (없음) | 일정 삭제 |

#### `AppointmentResponse`

| 필드 | 타입 | 기본값 | 비고 |
| --- | --- | --- | --- |
| `appointmentId` | `Long` | — | |
| `clinicName` | `String?` | `null` | |
| `department` | `String?` | `null` | 진료과 |
| `purpose` | `String?` | `null` | "재진" 같은 목적 |
| `scheduledOn` | `String` | — | `"2026-09-26"` (필수) |
| `scheduledTime` | `String?` | `null` | `"10:30:00"`. **없으면 시간 미정** |
| `status` | `String?` | `null` | `SCHEDULED` / `DONE` / `CANCELED` |
| `origin` | `String?` | `null` | `VISIT_FOLLOW_UP` 이면 재진 |
| `cards` | `LinkedCardResponse[]` | `[]` | `{ cardId: Long, title: String? }` |
| `todos` | `TodoResponse[]` | `[]` | `{ text: String, done: Boolean = false }` |

#### `CreateAppointmentRequest`

`clinicName?`, `department?`, `purpose?`, **`scheduledOn`(필수)**, `scheduledTime?`, `cardIds: Long[] = []`, `origin?`, `todos: TodoResponse[] = []`

#### `UpdateAppointmentRequest` — 보낸 필드만 바뀐다

`clinicName?`, `department?`, `purpose?`, `scheduledOn?`, `scheduledTime?`, **`clearTime?: Boolean`**, `status?`, `cardIds?: Long[]`, `todos?: TodoResponse[]`

> **DTO에는 9칸이 있지만 앱이 실제로 채우는 것은 6칸뿐이다.** 앱의 편집 모델 `AppointmentEdit`은 `on` · `time` · `clearTime` · `purpose` · `cardIds` · `todos`만 들고, Repository가 그 여섯만 요청으로 옮긴다(`AppointmentRepository.kt:65`). **`clinicName` · `department` · `status`는 앱 어디서도 PATCH로 나가지 않는다** — 일정의 병원을 고치거나 상태를 `CANCELED`로 바꾸는 길이 앱에 없다는 뜻이다. (`purpose`도 자리는 있지만 이 화면들에서 채우는 곳이 없어 늘 `null`이다.)

- **`clearTime`가 시각을 미정으로 되돌리는 유일한 방법.** `scheduledTime = null`은 "안 바꿈"이라 null을 두 뜻으로 쓸 수 없어서 플래그를 따로 뒀다. 둘을 **함께 보내지 않는다** (`clearTime`을 세울 때 `scheduledTime`은 생략).
- `cardIds`: `null` = 안 바꿈, `[]` = 전부 뗌, 값이 있으면 통째로 교체.
- `todos`: 통째로 교체. 지운 줄이 남지 않으려면 화면에 있는 것을 전부 보내야 한다.
- **`scheduledOn`은 지울 수 없다.** 날짜 없는 일정은 캘린더에 그릴 자리가 없다.

#### 응답 → 도메인 매핑 (`toAppointment`)

| 도메인 | 계산식 |
| --- | --- |
| `title` | `[clinicName, department, purpose]` 중 null 아닌 것을 `" "`로 이음. **비면** `cards[0].title` |
| `on` | `LocalDate.parse(scheduledOn)` |
| `time` | `LocalTime.parse(scheduledTime)` — **파싱 실패 시 null(시간 미정)로 본다.** 일정 하나 때문에 캘린더 전체가 죽지 않게 |
| `status` | `"DONE"`→DONE, `"CANCELED"`→CANCELED, **그 외/모르는 값 → SCHEDULED** (숨기는 것보다 보여주는 편이 낫다) |
| `origin` | `"VISIT_FOLLOW_UP"`이면 VISIT_FOLLOW_UP, **그 외 → MANUAL** |
| `cards` | `LinkedCardResponse[]` → `AppointmentCard(id = cardId, title = title)` 그대로 |
| `todos` | `TodoResponse[]` → `AppointmentTodo(text, done)` 그대로. 일자 화면이 여기서 "진료 전 할 일"을 만든다 |

#### 보낼 때 형식

- 시각: `"HH:mm:ss"` — **초를 항상 적는다** (`10:00:00`). `LocalTime.toString()`은 초가 0이면 생략해서 정각 일정만 다른 모양으로 나간다.
- 시간대 정보는 붙이지 않는다. 날짜와 시각이 둘 다 **지역 값**이다.
- `origin`: MANUAL이면 **필드 자체를 생략**하고, VISIT_FOLLOW_UP일 때만 보낸다.

### 5.2 함께 쓰는 다른 도메인 API

| 메서드 | 경로 | 목적 | 이 도메인에서 꺼내 쓰는 필드 |
| --- | --- | --- | --- |
| `GET` | `/api/me/cards` | 카드 목록 | `id`, `title`, `visited`, `clinic`, `writtenOn` |
| `GET` | `/api/cards/{cardId}` | 카드 상세 | `items.length` (→ 항목 수), `writtenOn`, `hospital.address` |
| `GET` | `/api/me/visits` | 기록 목록 | `id`, `cardId`, `clinic`, `visitedOn`, `followUp {date, text, approximate}` |
| `GET` | `/api/visits/{visitId}` | 기록 상세 | `items[axis, value]` → 메타 한 줄 |

**왜 카드 상세를 따로 읽는가**
일정 응답의 카드는 `{cardId, title}` 뿐이다. 작성일·항목 수는 **상세**에서, 진료 완료 여부는 **목록**에서 온다. 그리고 카드를 고치면 서버가 새 버전을 만들면서 **id를 바꾸는데**(Backend#114) 일정에 걸린 것은 고치기 전 id다. 목록은 최신 버전만 들고 있어 그 id로는 못 찾지만 **상세는 그 id로 그대로 열린다.** 그래서 작성일을 목록이 아니라 상세에서 받는다. 못 읽은 값은 비운 채 그린다.

### 5.3 호출 시점 정리

| 화면/조작 | 나가는 호출 |
| --- | --- |
| 월 화면 진입 / 달 이동 | `GET appointments?year&month` + `GET /api/me/cards` + `GET /api/me/visits` (순차) |
| 카드 시트가 서는 순간 | `GET /api/cards/{id}` (시트에 선 **한 장만**) |
| 일자 화면 진입 | `GET appointments?date` → `GET /api/me/visits` → 카드 채우기(`GET /api/me/cards` + `GET /api/cards/{id}` **병렬**) → 기록마다 `GET /api/visits/{id}` → 다음 일정용 `GET appointments/upcoming` |
| 할 일 체크(편집 밖) / 편집 확인 | `PATCH appointments/{id}` (todos 전체) |
| 일정 삭제 확인 | `DELETE appointments/{id}` |
| 일정 추가 화면 진입 | `GET /api/me/cards` (+ 고치기 모드면 `GET appointments?date`) |
| 저장하기 | `POST appointments` 또는 `PATCH appointments/{id}` |
| 진료 후 기록 저장 직후 | `GET appointments?date={재방문일}` → 중복 없으면 `POST appointments` |

---

## 6. 화면별 디자인 시스템 컴포넌트 목록

### 1r-1 캘린더 월

| 컴포넌트 | 쓰임 |
| --- | --- |
| `MedicalMateNavBar` | 제목 "캘린더", `leading = NONE` |
| `MedicalMateIconButton` | 월 이동 `‹` `›` |
| `MedicalMateCard` | 월 격자를 감싸는 판 |
| `MedicalMateDateCell` + `MedicalMateDateMarker` | 날짜 칸 (42px) |
| `MedicalMateSectionHeader` | "9월 12일 (금)" / "작성한 브리핑 카드" |
| `MedicalMateListRow` + `MedicalMateListRowType` + `MedicalMateBadgeTone` | 일정 줄, 카드 줄 |
| `MedicalMateFab` | 우하단 `+` |
| `MedicalMateTabBar` + `MedicalMateTab` | 하단 탭 |
| `MedicalMateBottomSheet` | 카드만 있는 날 시트 (1r-1-S) |
| `MedicalMateButton` | 시트 하단 CTA |
| `MedicalMateTheme` / `MedicalMateRadius` / `MedicalMateSpace` / `MedicalMateSize` / `MedicalMateIcons` | 토큰 |

### 1r-2 캘린더 일자

| 컴포넌트 | 쓰임 |
| --- | --- |
| `MedicalMateNavBar` | 날짜 제목 + 우측 편집/취소/확인 |
| `MedicalMateSectionHeader` | 5개 섹션 머리 |
| `MedicalMateListRow` + `MedicalMateListRowType` + `MedicalMateBadgeTone` | 카드 줄, 기록 줄 |
| `MedicalMateTodoRow` + `MedicalMateRowDelete` | 진료 전 할 일 |
| `MedicalMateEmptyState` + `MedicalMateEmptyStateType.NO_RECORD` | "이 날 기록" 빈 상태 |
| `MedicalMateButton` + `MedicalMateButtonType.TONAL` / `.DANGER` + `MedicalMateButtonSize.M` | "시간 정하고 확정하기", "일정 삭제" |
| `MedicalMateDialog` | 일정 삭제 확인 |
| `MedicalMateIcons.Clock` | 확정 버튼 leading 아이콘 |
| 원시 `Column` + `background(bgPrimaryFaint / bgPrimary, radius lg)` | 일정 블록 / 다음 일정 블록 (전용 컴포넌트 없음) |

### 1r-4 일정 추가

| 컴포넌트 | 쓰임 |
| --- | --- |
| `MedicalMateNavBar` + `MedicalMateNavLeading.CLOSE` | 제목 "일정 추가" + `×` |
| `MedicalMatePickerField` | 병원 · 날짜 · 시간 (3개) |
| `MedicalMateSectionHeader` (`caption` 슬롯) | "가져갈 브리핑 카드" + "선택 안 함"/"1개", "진료 전 할 일" |
| `MedicalMateCardPick` | 카드 후보 줄 |
| `MedicalMateAddRow` | "새 카드 만들기", "할 일 추가" |
| `MedicalMateTodoRow` + `MedicalMateRowDelete` | 할 일 줄 (인라인 입력 포함) |
| `MedicalMateBottomCtaBar` + `MedicalMateButton` | "저장하기" |
| `MedicalMateBottomSheet` | 날짜 시트 · 시간 시트 |
| `MedicalMateDateCell` (`MedicalMateDateCellSizeCompact` 34) | 날짜 시트 격자 |
| `MedicalMateIconButton` (`MedicalMateIconButtonSize.S`) | 시트 안 월 이동 |
| `MedicalMateIcons.Calendar` / `.Clock` / `.Plus` | 필드·줄 아이콘 |

---

## 7. 웹 포팅 시 주의할 계산식 모음

| 이름 | 계산식 |
| --- | --- |
| **D-day (월 화면 배지)** | `on.toEpochDay() - today.toEpochDay()`. `>= 0`일 때만 `"D-{n}"` 배지를 그리고, 음수면 배지 없이 `type = DEFAULT` |
| **D-day (일자 화면 일정 블록)** | 같은 식. 단 `visited == true`면 **"진료 완료"가 D-day를 대체**하고, `visited == false && dday < 0`이면 첫 줄 자체가 없다 |
| **D-day (다음 일정 chip)** | `"D-" + (nextEvent.on.toEpochDay() - today.toEpochDay())` — 확정된 일정일 때만 |
| **첫 주 빈 칸 수** | `month.atDay(1).dayOfWeek.value % 7` (JS: `new Date(y, m-1, 1).getDay()` 가 그대로 같은 값) |
| **주 반복 시작값** | `day = 1 - firstDayOffset`, `day <= lastDay` 동안 `day += 7` |
| **점 우선순위** | `RECORD` > `PLANNED` > `NONE` |
| **시간 라벨** | `hour % 12 || 12` + `":"` + `minute.padStart(2,'0')`, 접두사 `hour < 12 ? "오전" : "오후"` |
| **날짜 라벨** | `"M월 d일 (E)"` — 예: `"9월 26일 (토)"` |
| **카드 메타 날짜** | `"yyyy.MM.dd"` — 예: `"2026.09.04"` |
| **카드 후보 메타 날짜** | `"MM.dd"` + `" 작성 · "` + `clinic ?? "병원 미정"` |
| **다음 일정 at** | `"M월 d일 (E) a h:mm"` — 예: `"9월 26일 (토) 오전 10:30"` |
| **서버 전송 시각** | `"HH:mm:ss"` (초 항상 포함) |
| **서버 전송 날짜** | ISO `"yyyy-MM-dd"` |

---

## 8. 화면 문구 전수 목록 (그대로 옮길 것)

### 월 화면 (1r-1) / 카드 시트 (1r-1-S)

| 키 | 문구 |
| --- | --- |
| `calendar_title` | 캘린더 |
| `calendar_previous_month` | 지난달 *(a11y)* |
| `calendar_next_month` | 다음달 *(a11y)* |
| `calendar_month` | `%1$d년 %2$d월` |
| `calendar_add_schedule` | 일정 추가 *(FAB a11y)* |
| `calendar_time_unset` | 시간 미정 |
| `calendar_legend_record` | 기록 있음 |
| `calendar_legend_planned` | 예정 |
| `calendar_weekdays` | 일 · 월 · 화 · 수 · 목 · 금 · 토 |
| `calendar_card_sheet_section` | 작성한 브리핑 카드 |
| `calendar_card_sheet_hint` | 이 카드를 가져갈 일정을 만들 수 있어요 |
| `calendar_card_sheet_hint_scheduled` | 이 카드로 만들어진 일정이 있어요 |
| `calendar_card_sheet_open` | 일정 보러가기 |
| `calendar_card_sheet_schedule` | 이 카드로 일정 만들기 |
| `calendar_day_dday` | `D-%1$d` |
| `calendar_day_card_meta` | `%1$s · %2$d항목` |
| `brief_card_status_before_visit` | 진료 전 |
| `brief_card_status_confirmed` | 진료 완료 |
| `date_cell_today` | 오늘 *(a11y)* |
| `date_cell_has_record` | 기록 있음 *(a11y)* |
| `date_cell_planned` | 예정 *(a11y)* |

### 일자 화면 (1r-2 / -A / -A2 / -E)

| 키 | 문구 |
| --- | --- |
| `calendar_day_schedule` | 이 날 일정 |
| `calendar_day_visited` | 진료 완료 |
| `calendar_day_dday` | `D-%1$d` |
| `home_schedule_title` | `%1$s %2$s` |
| `home_schedule_first` | 초진 |
| `home_schedule_follow_up` | 재진 |
| `calendar_time_unset` | 시간 미정 |
| `calendar_day_schedule_card` | `%1$s 브리핑 카드를 가져가요` |
| `calendar_day_schedule_edit` | 시간 정하기 *(클릭 라벨)* |
| `calendar_day_card` | 가져갈 브리핑 카드 |
| `calendar_day_card_done` | 브리핑 카드 |
| `calendar_day_todo` | 진료 전 할 일 |
| `calendar_day_todo_delete` | `%1$s 지우기` *(a11y)* |
| `calendar_day_record` | 이 날 기록 |
| `calendar_day_record_empty_title` | 아직 진료 전이에요 |
| `calendar_day_record_empty_description` | 진료가 끝나면 들은 내용을 여기에 기록할 수 있어요 |
| `calendar_day_record_empty_action` | 진료 후 기록하기 |
| (리터럴) | 진료 후 기록 *(기록 줄 제목)* |
| `calendar_day_next` | 다음 일정 |
| `calendar_day_next_auto` | 진료 후 기록에서 자동으로 만들었어요 |
| `calendar_day_next_hint` | 시간을 정하면 하루 전에 알려드려요 |
| `calendar_day_next_confirm` | 시간 정하고 확정하기 |
| (리터럴) | `{병원} 재방문` / 재방문 예정 *(다음 일정 제목)* |
| (리터럴) | ` 전후` *(approximate일 때 chip 뒤)* |
| `calendar_day_edit` | 편집 |
| `calendar_day_edit_cancel` | 취소 |
| `calendar_day_edit_done` | 확인 |
| `calendar_day_schedule_delete` | 일정 삭제 |
| `calendar_day_schedule_delete_title` | 이 일정을 삭제할까요? |
| `calendar_day_schedule_delete_body` | 캘린더와 하루 전 알림이 함께 사라져요 |
| `calendar_day_schedule_delete_confirm` | 삭제 |

### 일정 추가 (1r-4 / -B / -C / -D / -T)

| 키 | 문구 |
| --- | --- |
| `schedule_add_title` | 일정 추가 |
| `schedule_add_hospital` | 병원 |
| `schedule_add_hospital_placeholder` | 진료받을 병원을 찾아주세요 |
| `schedule_add_hospital_required` | 병원을 골라주세요 |
| `schedule_add_datetime` | 날짜 · 시간 |
| `schedule_add_date_placeholder` | 날짜 |
| `schedule_add_date_required` | 날짜를 골라주세요 |
| `schedule_add_time_placeholder` | 시간 |
| `schedule_add_cards` | 가져갈 브리핑 카드 |
| `schedule_add_cards_none` | 선택 안 함 |
| `schedule_add_cards_count` | `%1$d개` |
| `schedule_add_card_new` | 새 카드 만들기 |
| `schedule_add_todo` | 진료 전 할 일 |
| `schedule_add_todo_add` | 할 일 추가 |
| `schedule_add_todo_placeholder` | 챙길 것을 적어주세요 |
| `schedule_add_todo_delete` | `%1$s 삭제` *(a11y)* |
| `schedule_add_save` | 저장하기 |
| `schedule_add_date_sheet` | 날짜 선택 |
| `schedule_add_time_sheet` | 시간 선택 |
| `schedule_add_sheet_confirm` | 확인 |
| `schedule_add_time_am` | 오전 |
| `schedule_add_time_pm` | 오후 |
| `schedule_add_time_value` | `%1$s %2$d:%3$02d` |
| (리터럴) | 병원 미정 *(카드 후보 메타)* |

---

## 9. 디자인 토큰 (이 도메인에서 쓰는 값)

| 토큰 | 값 |
| --- | --- |
| `MedicalMateSize.gutter` | 20dp (화면 좌우 여백) |
| `MedicalMateSize.screenWidth` | 360dp (재단 기준) |
| `MedicalMateSize.touchMin` | 48dp |
| `MedicalMateSize.controlMd` / `controlLg` | 48dp / 56dp (FAB / PickerField 높이) |
| `MedicalMateSize.iconSm` / `iconMd` | 18dp / 20dp |
| `MedicalMateSize.safeBottom` | 24dp (시트 하단) |
| `MedicalMateSpace` | s2=2, s4=4, s6=6, s8=8, s10=10, s12=12, s14=14, s16=16, s20=20, s24=24, s32=32, s40=40 |
| `MedicalMateRadius.sm / md / lg / xl` | 12 / 16 / 20 / 24 |
| `MedicalMateRadius.dateCell` | 13 |
| `MedicalMateRadius.full` | 원 |
| 바텀시트 상단 모서리 | 28 |
| 시트 grabber | 40×4 |
| 날짜 셀 | 42 (월) / 34 (시트), 점 5, 숫자↔점 3, 오늘 테두리 1 |
| 시간 휠 | 전체 156, 항목 52, 밴드 48, 분 단위 10 |
| `MedicalMateCard` | radius 20, padding 20, 최소 높이 116, 자식 gap 6 |
| `MedicalMateListRow` | radius 16, `Elevation.card` 그림자, 제목↔배지 6, 제목↔메타 4 |
| `MedicalMateCardPick` | radius 20, padding h18 v16, 선택 테두리 1.5 |
| `MedicalMateTodoRow` | 행 54, 체크 24 / radius 8, 간격 12, 삭제 × 48 상자 / 24 아이콘 |
| `MedicalMateAddRow` | 최소 높이 48, 아이콘 18, gap 8 |
| `MedicalMateSectionHeader` | padding top 24 bottom 10, 제목 `headingM`, caption `bodyMStrong`/`fgSubtle` |

주요 색 토큰: `bgSurface`, `bgPrimary`, `bgPrimaryFaint`, `bgSubtle`, `bgScrim`, `fgDefault`, `fgSubtle`, `fgMuted`, `fgPrimary`, `fgOnPrimary`, `fgLink`, `fgSuccess`, `fgDanger`, `fgDisabled`, `borderPrimary`, `borderStrong`, `borderSubtle`, `borderFocus`.

---

## 10. 열린 질문 / 현 앱의 알려진 한계

1. **하루에 일정이 둘 이상일 때 일자 화면이 한 건만 그린다.** 어떻게 보일지 시안에 없어 디자인 트랙 대기(#189). 월 화면 목록은 여러 줄을 그리고, 누른 일정의 `appointmentId`를 실어 보내 그 건이 열린다.
2. **`scheduledOn`(카드로 만든 일정 찾기)은 보고 있는 달 안에서만 찾는다.** 달을 넘어간 일정은 못 찾아 시트가 여전히 "이 카드로 일정 만들기"로 뜬다.
3. **일정 고치기에서 병원을 바꿔도 서버로 안 나간다.** `UpdateAppointmentRequest`에 병원 자리가 없다.
4. **에러 UI가 전혀 없다.** 월/일자/일정 추가 셋 다 실패를 빈 데이터나 무반응으로 삼킨다. 웹에서는 최소한 토스트 + 재시도를 붙이는 것을 권장.
5. **일자 화면 로딩 중 화면이 완전히 비어 있다** (`state ?: return`). 웹에서는 스켈레톤 권장.
6. `MedicalMateEmptyState`의 액션이 마스터에서는 Tonal 알약인데 시안 인스턴스가 채움을 지워 글자 버튼이다. 어느 쪽이 정본인지 디자인 트랙 확인 대기.
7. 일정 추가 상단 leading이 시안 네 장 중 셋은 `×`, `1r-4-C` 한 장만 `‹`. 코드는 `×`를 따랐고 디자인 확인 대기.
8. `PLANNED`(빈 원) 변이는 `Date Cell` 마스터에 없다. 시안 1r-1이 그렇게 쓰고 범례까지 둬서 화면을 따랐다.
9. 날짜 선택 시트에서 **과거 날짜를 막지 않는다.** 의도인지 확인 필요.
