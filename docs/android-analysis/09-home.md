# 홈 (1n)

## 웹앱 구현 메모

- 모바일 폭(390 기준)으로 고정하지 말고 **거터 20px만 유지하고 콘텐츠는 Fill** 한다(안드로이드 토큰 `MedicalMateSize.gutter = 20`, `contentWidth = 320`은 360 기준 참고값일 뿐 강제하지 않음). 데스크톱에서는 `max-width: 480px; margin: 0 auto`로 감싸는 것을 권장한다.
- 스크롤 영역은 **본문만**이고 하단 탭바(높이 79px)는 화면 하단에 고정된다. 안드로이드는 `Column { Body(weight 1f); TabBar }` 구조 — 웹은 `height: 100dvh` + `flex-column` + 본문 `overflow-y:auto`로 옮긴다.
- 제스처: 가장자리 스와이프 뒤로가기(predictive back)는 웹에서 재현하지 않는다. **탭 간 이동은 애니메이션 없음**(안드로이드도 `EnterTransition.None`), 탭이 아닌 화면으로 들어갈 때만 가로 슬라이드 320ms `cubic-bezier(0.4, 0, 0.2, 1)` + 페이드(뒤 화면은 1/4 거리 역방향 패럴랙스).
- "기록 없음(1n-2)"은 **스크롤하지 않는 한 화면**이고 빈 상태가 남은 높이를 전부 받아 그 안에서 세로 중앙에 선다 → 웹에서 `flex:1` + `justify-content:center`. "기록 있음(1n-1)"만 스크롤 목록이다.
- 날짜·시각 문자열 포맷(`M월 d일 (E)`, `오전 10:30`)은 서버가 주지 않고 **클라이언트가 만든다**. 웹도 `Intl.DateTimeFormat('ko-KR', ...)`로 직접 조립해야 하며 로케일을 `ko-KR`로 고정해야 한다(안드로이드도 `Locale.KOREAN` 고정).

---

## 1. 화면 개요

로그인 이후의 **시작 목적지**이자 1Depth 화면. 하단 탭바가 붙는 세 화면(홈 1n · 기록 1j · 캘린더 1r) 중 하나다.

### 1.1 Figma 화면 id

| Figma id | Figma 노드 | 뜻 | 언제 |
| --- | --- | --- | --- |
| `1n-1` | `399:1339` | 기록 있음 | `savedCards`나 `upcoming` 중 하나라도 비어 있지 않을 때 |
| `1n-2` | `399:1720` | 기록 없음 | `savedCards`와 `upcoming`이 **둘 다** 비었을 때 |

두 화면은 **별도 상태가 아니라 같은 `HomeUiState.Content`의 두 갈래**다. 헤더 · 오늘의 한 줄 카드 · 시작 버튼 · 이어서 하기 카드까지는 완전히 동일하고, 그 아래가 목록이냐 빈 상태냐만 갈린다.

### 1.2 구성 요소별 Figma 노드 id

| 조각 | Figma 노드 | 크기 | 출처 |
| --- | --- | --- | --- |
| Header | `399:1342` | 350 × 52 | `HomeComponents.kt` `HomeHeader` |
| "오늘의 한 줄" 카드 | `399:1634` | 350 × 140 | `HomeComponents.kt` `TodayLineCard` |
| "이어서 하기" 카드 | `399:1642` | 350 × 116 | `HomeComponents.kt` `ResumeCard` |
| 시작 버튼 | `399:1741` | 320 × 56 | `HomeComponents.kt` `StartIntakeButton` |
| Section Header 마스터 | `334:1156` | — | `Rows.kt` `MedicalMateSectionHeader` |
| Tab Bar 마스터 | `319:1026` | 높이 79 | `TabBar.kt` `MedicalMateTabBar` |

### 1.3 소스 파일

| 파일 | 역할 |
| --- | --- |
| `app/src/main/java/com/mist/medicalmate/home/ui/HomeScreen.kt` | 화면 뼈대, 상태 분기, 섹션 조립, `HomeCallbacks` |
| `.../home/ui/HomeComponents.kt` | 헤더 · 카드 · 버튼 · 행 조각, `daysUntil` |
| `.../home/ui/HomeUiState.kt` | 상태 모델 전부 |
| `.../home/ui/HomeTodayCopy.kt` | "오늘의 한 줄" 9갈래 → 문구 조립 |
| `.../home/ui/HomeViewModel.kt` | `refresh()`, `Clock` 주입 |
| `.../home/ui/HomeRoute.kt` | 상태 있는 진입점, `today` 고정 |
| `.../home/ui/HomeDestination.kt` | 네비게이션 그래프 등록 |
| `.../home/ui/HomePreviews.kt` | Preview 픽스처 |
| `.../home/data/HomeApi.kt` | `GET /api/me/home` DTO |
| `.../home/data/HomeRepository.kt` | 응답 → 화면 값 변환, 오늘의 한 줄 선택 규칙, `HomeSnapshot` 선언(2.2a) |
| `.../home/data/HomeModule.kt` | Hilt 바인딩 |
| `app/src/main/res/values/strings.xml` (419–504행) | 홈 문구 전량 |
| `app/src/test/java/.../home/data/HomeRepositoryTest.kt` | 26건 |
| `app/src/test/java/.../home/ui/HomeViewModelTest.kt` | 7건 |
| `app/src/test/java/.../home/ui/HomeScheduleTest.kt` | 4건 (D-day 계산) |

---

## 2. 상태 모델 (TypeScript 이식표)

### 2.1 `HomeUiState` — 3갈래 sealed interface

| 갈래 | 종류 | 뜻 |
| --- | --- | --- |
| `Loading` | `data object` | 최초 진입 + `refresh()` 호출 직후 |
| `Content` | `data class` | 아래 표의 6필드를 가짐 |
| `Failed` | `data object` | `Rejected` 또는 `NetworkUnavailable` |

```ts
type HomeUiState =
  | { kind: 'loading' }
  | { kind: 'content'; ... }
  | { kind: 'failed' };
```

### 2.2 `HomeUiState.Content` — 전 필드

| 필드 | Kotlin 타입 | TS 타입 | null 허용 | 설명 |
| --- | --- | --- | --- | --- |
| `userInitial` | `String` | `string` | 아니오(빈 문자열 가능) | 이름 첫 글자. 이름을 못 받으면 `""` |
| `hasUnreadNotification` | `Boolean` | `boolean` | 아니오 | **현재 항상 `false`로 고정**(2.7 참고. `HomeSnapshot`에는 이 필드가 아예 없고 ViewModel이 채운다 → 2.2a) |
| `todayLine` | `HomeTodayLine` | 아래 union | 아니오 | 오늘의 한 줄 카드 내용(9갈래) |
| `resume` | `HomeResume?` | `HomeResume \| null` | 예 | 작성 중이던 증상 정리. 없으면 카드를 그리지 않음 |
| `savedCards` | `List<SavedCardSummary>` | `SavedCardSummary[]` | 아니오(빈 배열 가능) | 최근 브리핑 카드 |
| `upcoming` | `List<HomeSchedule>` | `HomeSchedule[]` | 아니오(빈 배열 가능) | 다가오는 일정. 서버가 하나만 주므로 길이 0 또는 1 |

### 2.2a `HomeSnapshot` — 저장소가 돌려주는 중간 모델

`HomeRepository.load()`의 반환형은 `HomeUiState.Content`가 **아니라** `HomeSnapshot`이다(`HomeRepository.kt`에 선언). 필드가 **5개**로, `hasUnreadNotification`만 없다.

| 필드 | 타입 |
| --- | --- |
| `userInitial` | `String` |
| `todayLine` | `HomeTodayLine` |
| `resume` | `HomeResume?` |
| `savedCards` | `List<SavedCardSummary>` |
| `upcoming` | `List<HomeSchedule>` |

`HomeViewModel`의 `private fun HomeSnapshot.toContent()`가 여기에 `hasUnreadNotification = false`를 얹어 `Content`를 만든다. 즉 **알림 플래그는 데이터 계층에 아예 존재하지 않는다.** 웹에서도 fetch 결과 타입과 화면 상태 타입을 이렇게 갈라 두면 알림이 생겼을 때 고칠 곳이 한 군데다.

### 2.3 `HomeTodayLine` — 9갈래 sealed interface

`HomeRepository`가 고르고 `HomeTodayCopy`가 글로 옮긴다.

> **선언 순서 = 우선순위가 아니다.** `FirstVisit`은 sealed interface에서 맨 처음 선언되지만 고르는 규칙(7.3)에서는 **아무것도 맞지 않을 때의 마지막 fallback**이다. 나머지 8갈래는 선언 순서와 우선순위가 같다. KDoc이 "차례가 곧 우선순위다"라고 적은 것은 `HomeRepository.todayLine()`의 `?:` 사슬 차례를 말한다.

| # | 갈래 | Kotlin 타입 | 필드 | 뜻 |
| --- | --- | --- | --- | --- |
| — | `FirstVisit` | `data object` | 없음 | 진료도 카드도 일정도 없는 첫 방문. 1n-2 |
| ①-a | `TodayAhead` | `data class` | `clinic: String?`, `time: LocalTime?` | 오늘 진료가 있고 아직 시각 전 |
| ①-b | `TodayDone` | `data object` | 없음 | 오늘 진료 시각이 지났는데 기록 없음 |
| ①-c | `TodayRecorded` | `data object` | 없음 | 오늘 진료를 기록해 뒀음 |
| ② | `RecordMissing` | `data class` | `on: LocalDate` | 지난 일정에 기록이 없음 |
| ③-a | `NextTomorrow` | `data class` | `clinic: String?`, `time: LocalTime?` | 다음 진료가 내일 |
| ③-b | `NextInDays` | `data class` | `days: Int`, `on: LocalDate`, `clinic: String?` | 다음 진료가 `days`일 남음. **2 이상일 때만** |
| ④-a | `LastYesterday` | `data object` | 없음 | 어제 진료를 다녀옴 |
| ④-b | `LastDaysAgo` | `data class` | `days: Int` | 지난 진료 이후 `days`일 경과. **2 이상일 때만** |
| ⑤ | `CardReady` | `data object` | 없음 | 카드만 있고 일정도 기록도 없음 |

```ts
type HomeTodayLine =
  | { kind: 'firstVisit' }
  | { kind: 'todayAhead'; clinic: string | null; time: string | null }   // time: "HH:mm"
  | { kind: 'todayDone' }
  | { kind: 'todayRecorded' }
  | { kind: 'recordMissing'; on: string }                                 // "yyyy-MM-dd"
  | { kind: 'nextTomorrow'; clinic: string | null; time: string | null }
  | { kind: 'nextInDays'; days: number; on: string; clinic: string | null }
  | { kind: 'lastYesterday' }
  | { kind: 'lastDaysAgo'; days: number }
  | { kind: 'cardReady' };
```

> 규칙 둘이 경계를 정한다. `LastDaysAgo`(지났어요)는 **기록이 저장된 진료**에만 이틀 이상일 때 쓰고, `NextInDays`(남았어요)는 **내일 이후 일정**에만 이틀 이상일 때 쓴다. 하루는 `LastYesterday`·`NextTomorrow`, 0일은 오늘 갈래(①)다. 앞날 진료에 경과일을 적어 음수가 나오던 버그(#224)가 이 규칙으로 사라졌다.

### 2.4 `HomeResume`

| 필드 | Kotlin 타입 | TS 타입 | 설명 |
| --- | --- | --- | --- |
| `intakeId` | `String` | `string` | 서버 `sessionId`(Long)를 문자열로 담음 |
| `symptomTitle` | `String` | `string` | 서버 `siteText`. null이면 `""` |
| `step` | `IntakeStep` | `IntakeStep` | 어디까지 답했는지 |

`IntakeStep` (= `core/model/IntakeStep.kt`):

| enum | `number` (ordinal+1) | 뜻 |
| --- | --- | --- |
| `BODY_PART` | 1 | 아픈 부위(인체도) |
| `SYMPTOM_CHAT` | 2 | 증상 문답 |
| `SEVERITY` | 3 | 강도 |
| `QUESTIONS` | 4 | 질문 |

`IntakeStep.total = 4`, `isLast = (this == QUESTIONS)`.

### 2.5 `SavedCardSummary`

| 필드 | Kotlin 타입 | TS 타입 | 설명 |
| --- | --- | --- | --- |
| `id` | `String` | `string` | 서버 `cardId`(Long)를 문자열로 |
| `title` | `String` | `string` | null이면 `""` |
| `visited` | `Boolean` | `boolean` | **"진료 완료" 배지의 유일한 기준.** 카드의 확정 여부(`DRAFT`/`CONFIRMED`)와 다른 축이다 |
| `writtenOn` | `LocalDate` | `string` (`yyyy-MM-dd`) | 서버 `createdAt`(OffsetDateTime)의 날짜 부분 |
| `clinic` | `String?` | `string \| null` | "서울OO병원 내과"처럼 병원+진료과를 합친 표시용. **선택 입력이라 진료를 마쳤어도 비어 있을 수 있어 진료 여부 판단에 쓰면 안 된다** |

### 2.6 `HomeSchedule`

| 필드 | Kotlin 타입 | TS 타입 | 기본값 | 설명 |
| --- | --- | --- | --- | --- |
| `id` | `String` | `string` | — | 서버 `appointmentId`(Long)를 문자열로 |
| `title` | `String` | `string` | — | `clinicName + " " + department`. 둘 다 비면 첫 카드 제목 |
| `date` | `LocalDate` | `string` (`yyyy-MM-dd`) | — | D-day를 **화면이 열린 날 기준으로 매번 계산**하므로 문자열로 미리 만들지 않는다 |
| `time` | `String?` | `string \| null` | — | **이미 포맷된 문자열**("오전 10:30"). null이면 시간 미정 |
| `followUp` | `Boolean` | `boolean` | `false` | 서버 `origin == "VISIT_FOLLOW_UP"`이면 true → 제목 뒤에 "재진", 아니면 "초진" |

> 주의: `HomeTodayLine.TodayAhead.time`은 `LocalTime`(원시값)인데 `HomeSchedule.time`은 **이미 포맷된 문자열**이다. 비대칭이므로 웹 타입에서도 이 차이를 유지하거나, 한쪽으로 통일하려면 포맷 위치를 함께 옮겨야 한다.

### 2.7 고정값 / 미구현

- `hasUnreadNotification`은 `HomeViewModel.toContent()`에서 **하드코딩 `false`**다. 서버 응답에 대응 필드가 없고 알림 목록 API도 없다(`POST /api/me/devices`는 문서상 "현재 미사용"). 테스트 `읽지 않은 알림은 늘 꺼져 있다`가 이를 고정한다.
- `HomeHeader`는 `hasUnreadNotification`이 true여도 **아이콘 위에 점을 그리지 않는다.** 바뀌는 것은 접근성 이름뿐이다(`알림` → `알림, 읽지 않은 알림 있음`). 웹에서 시각적 점을 넣으려면 새 구현이다.

**홈에 없는 상태 — 웹에서도 만들지 말 것 (소스 확인 결과)**

| 없는 것 | 확인 근거 |
| --- | --- |
| **편집 모드 / 선택 모드 / 삭제** | `HomeUiState`가 3갈래뿐이고 `HomeCallbacks`에 편집·삭제 콜백이 없다. 카드 삭제는 카드 화면(1e)의 몫 |
| **당겨서 새로고침(pull-to-refresh)** | `HomeContent`의 `LazyColumn`에 `PullToRefreshBox`가 없다. 재조회 진입점은 `HomeRoute`의 최초 1회 `LaunchedEffect`와 실패 화면의 "다시 시도"뿐 |
| **토스트 / 스낵바** | `HomeBody`의 KDoc이 "토스트가 그 위에 얹힌다"고 적고 `Box`로 감싸 두었으나 **토스트를 그리는 코드는 없다.** 주석만 남은 자리다 — 웹으로 옮기지 말 것 |
| **부분 로딩 / 스켈레톤** | `Loading`은 화면 전체가 스피너 하나다(10.1) |
| **`Rejected`와 `NetworkUnavailable` 구분** | 둘 다 `HomeUiState.Failed` 하나로 접힌다(10.2) |

---

## 3. 화면 레이아웃 (위 → 아래)

### 3.0 최상위 뼈대 (`HomeScreen`)

```
Column (전체 높이)
├─ HomeBody = Box      (weight 1f — 남은 높이 전부)
│   ├─ Loading  → LoadingContent
│   ├─ Failed   → FailedContent(onRetryClick = callbacks.onRetryClick)
│   └─ Content  → HomeContent
│                 └─ savedCards·upcoming이 둘 다 비면 EmptyHomeContent로 위임하고 return
└─ MedicalMateTabBar(selected = HOME, onSelect = onTabSelect)   (높이 79, 고정)
```

- `HomeScreen`의 인자는 `state`, `today`, `callbacks`, `modifier`, `onTabSelect` 다섯이다. `today`를 밖에서 받는 이유는 D-day를 화면이 열린 날 기준으로 계산해야 하고, 기본값을 `LocalDate.now()`로 두면 Preview와 테스트에서 값을 고정할 수 없기 때문이다.
- **1n-1 / 1n-2 분기는 `HomeContent` 안에 있다.** 호출부가 고르지 않는다 — `savedCards.isEmpty() && upcoming.isEmpty()`면 `EmptyHomeContent`를 그리고 즉시 `return`한다.
- 화면 바닥색: `bg/surface` = `#FFFFFF` (테마가 M3 `background`를 `bgSurface`로 재바인딩함).
- 앱 최상위는 `Scaffold(contentWindowInsets = WindowInsets.safeDrawing)`이라 상태바·홈 인디케이터·키보드 인셋이 한 곳에서 처리된다. 웹은 `env(safe-area-inset-*)`로 대응.

### 3.1 기록 있음 — `1n-1` (`HomeContent`, LazyColumn)

조건: `savedCards`가 비어 있지 않거나 `upcoming`이 비어 있지 않다.

컨테이너: `LazyColumn`
- `contentPadding` = `start 20, end 20, top 8, bottom 20`
- 항목 사이 간격 = **16** (전부 동일, `Arrangement.spacedBy(s16)`)
- `Section Header`는 자체 여백(위 24 / 아래 10)을 가지므로 추가 간격을 주지 않는다
- 목록 항목은 **`key`를 준다** — 카드는 `key = { it.id }`, 일정도 `key = { it.id }`. 헤더·오늘의 한 줄·버튼·이어서 하기·구역 헤더는 단일 `item {}`이라 key가 없다. 웹 리스트의 `key` prop을 같은 기준(`id`)으로 맞출 것

위에서 아래로:

| 순서 | 블록 | 조건 | 컴포넌트 |
| --- | --- | --- | --- |
| 1 | **Header** | 항상 | `HomeHeader` |
| 2 | **오늘의 한 줄 카드** | 항상 | `TodayLineCard` |
| 3 | **주 CTA "증상 정리 시작하기"** | 항상 | `StartIntakeButton` |
| 4 | **이어서 하기 카드** | `resume != null` | `ResumeCard` |
| 5a | Section Header "최근 브리핑 카드" + "전체 보기" | `savedCards`가 비어 있지 않을 때 | `MedicalMateSectionHeader` |
| 5b | 카드 행 N개 | 위와 같은 조건 | `SavedCardRow` × N |
| 5c | *(대체)* 빈 상태 "아직 진료 기록이 없어요" + 행동 "증상 정리하기" | `savedCards`가 비었는데 `upcoming`은 있을 때 | `MedicalMateEmptyState(NO_RECORD)` — **헤더 없이 빈 상태만** |
| 6a | Section Header "다가오는 일정" + "캘린더" | `upcoming`이 비어 있지 않을 때 | `MedicalMateSectionHeader` |
| 6b | 일정 행 N개 | 위와 같은 조건 | `ScheduleRow` × N |
| — | *(일정 없음)* | `upcoming`이 비면 **구역 자체를 그리지 않는다** | — |

### 3.2 기록 없음 — `1n-2` (`EmptyHomeContent`, 일반 Column)

조건: `savedCards.isEmpty() && upcoming.isEmpty()`

컨테이너: `Column` (스크롤 없음)
- `padding` = `start 20, end 20, top 8, bottom 20`
- 항목 사이 간격 = **16**

| 순서 | 블록 | 조건 |
| --- | --- | --- |
| 1 | Header | 항상 |
| 2 | 오늘의 한 줄 카드 | 항상 (대개 `FirstVisit` 갈래) |
| 3 | 주 CTA "증상 정리 시작하기" | 항상 |
| 4 | 이어서 하기 카드 | `resume != null` |
| 5 | 빈 상태 `NO_RECORD` — **`weight(1f)`로 남은 높이를 전부 받고 그 안에서 세로 중앙** | 항상 |

빈 상태 세부:
- 제목 `아직 진료 기록이 없어요`
- 설명 `증상을 정리해두면 진료실에서 바로 보여줄 수 있어요`
- **행동 버튼 없음.** 바로 위에 "증상 정리 시작하기"가 있어 같은 곳으로 가는 버튼이 한 화면에 둘이 되기 때문. Figma 인스턴스도 그 슬롯을 꺼 뒀다.
- Figma 기준 빈 상태 박스 320 × 409.

> **스크롤을 걸지 않는다.** "남은 높이를 나눠 갖기"와 스크롤은 같이 쓸 수 없다. 글꼴을 키우면 빈 상태가 먼저 줄어든다. 웹에서도 `overflow` 대신 `flex:1; min-height:0`로 옮긴다.

### 3.3 두 화면의 차이 요약

| 항목 | 1n-1 | 1n-2 |
| --- | --- | --- |
| 컨테이너 | `LazyColumn` (스크롤 O) | `Column` (스크롤 X) |
| 헤더 / 오늘의 한 줄 / CTA / 이어서 하기 | 동일 | 동일 |
| 최근 브리핑 카드 구역 | 있음 (또는 빈 상태로 대체) | 없음 |
| 다가오는 일정 구역 | 있음 | 없음 |
| 빈 상태 | 카드만 없을 때, 행동 버튼 **있음**("증상 정리하기") | 항상, 행동 버튼 **없음** |
| 빈 상태 세로 중앙 정렬 | 아니오(목록 흐름 안) | 예(`weight(1f)`) |

---

## 4. 화면 문구 전량 (strings.xml 원문 그대로)

> 웹앱에서 **글자 그대로** 재현할 것. `\n`은 실제 줄바꿈이다.

### 4.1 헤더 / 접근성

| key | 문구 | 쓰임 |
| --- | --- | --- |
| `app_name` | `진료메이트` | 로고 이미지의 대체 텍스트 |
| `home_notification` | `알림` | 벨 아이콘 접근성 이름 (읽지 않은 알림 없음) |
| `home_notification_unread` | `알림, 읽지 않은 알림 있음` | 벨 아이콘 접근성 이름 (있음) |
| `home_profile` | `내 정보` | 아바타 접근성 이름 |

### 4.2 오늘의 한 줄 — 라벨(작은 글씨, 카드 첫 줄)

| key | 문구 | 언제 |
| --- | --- | --- |
| `home_today_first_label` | `처음 오셨네요` | `FirstVisit`일 때만 |
| `home_today_label` | `오늘의 한 줄` | 나머지 8갈래 전부 |

### 4.3 오늘의 한 줄 — 제목 + 본문 (갈래별 전량)

| 갈래 | 제목 (`Heading/S`) | 본문 줄들 (`Body/M`, `fg/subtle`) |
| --- | --- | --- |
| `FirstVisit` | `아픈 곳을 말로 편하게 알려주세요` | `언제부터, 얼마나 아픈지 하나씩 물어볼게요.`<br>`답변은 진료실에서 보여줄 카드로 정리돼요.` *(한 문자열 안의 `\n`)* |
| `TodayAhead` | `오늘 진료가 있어요` | ① 시각·병원 줄(4.4 참고, 없으면 생략)<br>② `브리핑 카드를 진료실에서 그대로 보여주세요.` |
| `TodayDone` | `오늘 진료는 어떠셨어요?` | ① `들은 말을 잊기 전에 남겨두세요.`<br>② `캘린더에서 오늘 일정을 누르면 기록할 수 있어요.` |
| `TodayRecorded` | `오늘 진료를 기록해두셨어요` | ① `다음 방문이 정해졌으면 캘린더에 등록해두세요.`<br>② `약이나 검사 일정도 함께 남기면 좋아요.` |
| `RecordMissing` | `%1$s 진료, 기록이 아직 없어요` → `%1$s` = `on`을 `M월 d일`로 포맷 (예: `9월 8일 진료, 기록이 아직 없어요`) | ① `기억나는 대로 몇 줄이면 충분해요.`<br>② `캘린더에서 그 날을 누르면 적을 수 있어요.` |
| `NextTomorrow` | `내일 진료가 있어요` | ① 시각·병원 줄(없으면 생략)<br>② `달라진 점이 있으면 카드를 오늘 손봐두세요.` |
| `NextInDays` | `다음 진료가 %1$d일 남았어요` → `%1$d` = `days` | ① 날짜·병원 줄(항상 있음)<br>② `달라진 점이 있으면 카드를 미리 손봐두세요.` |
| `LastYesterday` | `어제 진료 다녀오셨네요` | ① `처방받은 약은 시간 맞춰 챙기세요.`<br>② `다음 방문이 정해지면 캘린더에 등록해두세요.` |
| `LastDaysAgo` | `지난 진료 후 %1$d일이 지났어요` → `%1$d` = `days` | ① `달라진 점이 있으면 새 증상 정리를 시작해두세요.`<br>② `다음 방문이 정해지면 캘린더에 등록해두세요.` |
| `CardReady` | `브리핑 카드가 준비돼 있어요` | ① `진료 날짜가 정해지면 캘린더에 등록해두세요.`<br>② `진료실에서는 이 카드를 그대로 보여주면 돼요.` |

### 4.4 오늘의 한 줄 — 시각/날짜 줄 조립

`TodayAhead` · `NextTomorrow`가 쓰는 `atLine(time, clinic)`:

| 조건 | 템플릿 | 결과 예 |
| --- | --- | --- |
| 시각 O, 병원 O | `home_today_at_clinic` = `%1$s %2$s예요.` | `오전 10:30 서울OO병원 내과예요.` |
| 시각 O, 병원 X | `home_today_at` = `%1$s예요.` | `오전 10:30예요.` |
| 시각 X, 병원 O | `home_today_at` = `%1$s예요.` (병원명을 `%1$s`에 넣음) | `서울OO병원 내과예요.` |
| 둘 다 X | **null → 줄 자체를 그리지 않음** | 본문이 한 줄만 |

`NextInDays`가 쓰는 `onLine(on, clinic)`:

| 조건 | 템플릿 | 결과 예 |
| --- | --- | --- |
| 병원 O | `home_today_on_clinic` = `%1$s %2$s예요.` | `9월 16일 서울OO병원 내과예요.` |
| 병원 X | `home_today_on` = `%1$s 진료예요.` | `9월 16일 진료예요.` |

### 4.5 주 CTA · 이어서 하기

| key | 문구 |
| --- | --- |
| `home_start_intake` | `증상 정리 시작하기` |
| `home_resume_label` | `이어서 하기` |
| `home_resume_title` | `작성 중이던 증상 정리가 있어요` |
| `home_resume_progress` | `%1$s · %2$d단계 중 %3$d단계까지 답했어요` |

`home_resume_progress` 인자 순서 주의: `%1$s` = `resume.symptomTitle`, `%2$d` = `IntakeStep.total`(항상 **4**), `%3$d` = `resume.step.number`.
예: `복부 통증 · 4단계 중 2단계까지 답했어요`

### 4.6 최근 브리핑 카드

| key | 문구 |
| --- | --- |
| `home_saved_cards` | `최근 브리핑 카드` |
| `home_saved_cards_all` | `전체 보기` |
| `home_card_confirmed` | `진료 완료` (배지) |
| `home_card_meta` | `%1$s · %2$s` → 작성일 · 병원 |
| `home_card_meta_draft` | `%1$s · 카드만 작성됨` → 작성일만 |

메타 예: `2026.09.04 · 서울OO병원 내과` / `2026.08.21 · 카드만 작성됨`

### 4.7 다가오는 일정

| key | 문구 |
| --- | --- |
| `home_upcoming` | `다가오는 일정` |
| `home_calendar` | `캘린더` (구역 헤더 오른쪽 링크) |
| `home_schedule_title` | `%1$s %2$s` → 제목 + 초진/재진 |
| `home_schedule_first` | `초진` |
| `home_schedule_follow_up` | `재진` |
| `home_schedule_meta` | `%1$s %2$s` → 날짜 + 시각 |
| `home_schedule_dday` | `D-%1$d` |
| `calendar_time_unset` | `시간 미정` (일정에 `time`이 없을 때 그 자리에 들어감) |

행 예: 제목 `서울OO병원 내과 재진`, 메타 `9월 12일 (금) 오전 10:30`, 배지 `D-4`
시간 미정 예: 메타 `9월 12일 (금) 시간 미정`

### 4.8 빈 상태 / 에러 / 탭

| key | 문구 |
| --- | --- |
| `home_empty_title` | `아직 진료 기록이 없어요` |
| `home_empty_description` | `증상을 정리해두면 진료실에서 바로 보여줄 수 있어요` |
| `home_empty_action` | `증상 정리하기` |
| `home_failed_title` | `불러오지 못했어요` |
| `home_failed_description` | `인터넷 연결을 확인하고 다시 시도해주세요` |
| `home_retry` | `다시 시도` |
| `tab_calendar` | `캘린더` |
| `tab_home` | `홈` |
| `tab_record` | `기록` |

---

## 5. 구성 요소 상세

### 5.1 `HomeHeader` (Figma `399:1342`, 350 × 52)

> **인사 문구는 헤더에 없다.** 헤더 왼쪽은 로고 락업이고, "처음 오셨네요" 같은 문구는 **오늘의 한 줄 카드의 라벨**이다.

```
Row (fillMaxWidth, height 52, 세로 중앙)
├─ Image  로고 락업 (height 28.8, 마스터 139×36의 0.8배) — alt "진료메이트"
├─ Box (weight 1f)        // Spacer가 아니라 빈 Box다. 웹에서는 margin-left:auto로 대체
├─ MedicalMateIconButton  아이콘 Bell(ic_bell), GHOST, size L
│     시각 박스 48 원형 / 아이콘 24 / hit area 48
│     접근성 이름 = hasUnreadNotification ? "알림, 읽지 않은 알림 있음" : "알림"
└─ Box (min 48×48, 가운데 정렬)
      └─ MedicalMateAvatar  initial = userInitial, size 36, 원형
            면 bg/primary-subtle(#E3E7FC), 글자 fg/primary(#2E3E9E), Body/L Strong
            접근성 이름 "내 정보"
```

- 로고 높이 `28.8`은 Figma 인스턴스 축소값이라 반올림하지 않았다.
- 아바타 시각 크기 36이라 터치 목표 48은 **바깥 Box가** 확보한다.
- `userInitial`은 `initial.take(1)`로 첫 글자만 그린다. 빈 문자열이면 빈 원.

### 5.2 `TodayLineCard` (Figma `399:1634`, 350 × 140)

```
MedicalMateCard(emphasis = BRAND)
  면 bg/primary-faint(#F2F4FE), radius 20, 그림자 없음
  padding 20, 자식 간격 6, min-height 116, fillMaxWidth
├─ Text  라벨        style Label/S (Medium 11 / 행간 16 / 자간 +2%), color fg/subtle(#585F73)
├─ Text  제목        style Heading/S (SemiBold 17 / 24 / -1%), color fg/default(#131722)
└─ Text  본문 줄 N개  style Body/M (Regular 15 / 24), color fg/subtle
```

- 본문은 `List<String>`이라 1줄 또는 2줄. `TodayAhead`/`NextTomorrow`에서 시각·병원이 둘 다 없으면 1줄.
- 눌러도 반응 없음(`onClick` 미지정).

### 5.3 `StartIntakeButton` (Figma `399:1741`, 320 × 56) — 주 CTA

```
MedicalMateButton(
  label = "증상 정리 시작하기",
  leadingIcon = ic_stethoscope,   // 청진기 (#227에서 마이크→청진기로 교체)
  type = PRIMARY (기본), size = L (기본),
  modifier = fillMaxWidth
)
```

시각 규격(Size L):
- min-height **56**, radius **16**(`MedicalMateRadius.md`)
- 좌우 padding 20, 아이콘–라벨 간격 **6**, 아이콘 **20**
- 라벨 `Label/L` (SemiBold 15 / 행간 20)
- 면 `bg/primary` = **#5566D2**, 눌림 `bg/primary-pressed` = **#3B4FC0**, 글자 `fg/on-primary` = **#FFFFFF**
- 비활성: 면 `bg/subtle`(#EDEFF5), 글자 `fg/disabled`

### 5.4 `ResumeCard` (Figma `399:1642`, 350 × 116)

```
MedicalMateCard(onClick = ...)        // emphasis DEFAULT
  면 bg/surface(#FFFFFF), radius 20, 그림자 Elevation/Card, padding 20, 간격 6
├─ Text  "이어서 하기"                      Label/S,   fg/subtle
├─ Text  "작성 중이던 증상 정리가 있어요"    Heading/S, fg/default
└─ Text  "복부 통증 · 4단계 중 2단계까지 답했어요"  Body/M, fg/subtle
```

- 카드 전체가 클릭 영역. 누르면 `onResumeClick(resume.intakeId)`.
- `Elevation/Card` = `y3 blur10 8% + y1 blur2 5%`, 그림자 색 **#1B255A**(브랜드 틴트).
  - CSS: `box-shadow: 0 3px 10px rgba(27,37,90,.08), 0 1px 2px rgba(27,37,90,.05);`

### 5.5 `SavedCardRow`

```
MedicalMateListRow(
  title     = card.title,
  meta      = clinic != null ? "{작성일} · {clinic}" : "{작성일} · 카드만 작성됨",
  badge     = visited ? "진료 완료" : null,
  badgeTone = SUCCESS,
  type      = visited ? BADGE : DEFAULT,
  onClick   = { onSavedCardClick(card.id) },
)
```

- 작성일 포맷: `yyyy.MM.dd` (예 `2026.09.04`)
- **배지는 `visited`로만 갈린다.** 카드 `status`(DRAFT/CONFIRMED)는 보지 않는다. 확정만 하고 안 다녀온 카드에 "진료 완료"가 붙으면 안 된다(테스트 2건이 고정).

### 5.6 `ScheduleRow`

```
MedicalMateListRow(
  title     = "{schedule.title} {초진|재진}",
  meta      = "{M월 d일 (E)} {time ?: "시간 미정"}",
  badge     = "D-{daysUntil(today, schedule.date)}",
  badgeTone = BRAND,
  type      = BADGE,
  onClick   = { onScheduleClick(schedule.date, schedule.id) },
)
```

- `daysUntil(today, date) = ChronoUnit.DAYS.between(today, date)` → `Long`.
  - 테스트: 오늘 = `0`, 나흘 뒤 = `4`, 달 넘김도 실제 일수(`9/8 → 10/1` = `23`), **지난 일정은 음수(`-1`)**.
  - 음수면 화면에 `D--1`로 찍힌다. 서버가 과거 일정을 `nextAppointment`로 주지 않는다는 전제에 기대고 있다.
- 날짜 포맷 `M월 d일 (E)`는 **로케일을 고정하지 않았다**(`DateTimeFormatter.ofPattern("M월 d일 (E)")`). 기기 로케일이 한국어가 아니면 요일이 `Fri`로 나온다. 웹에서는 `ko-KR`로 고정할 것.

### 5.7 `MedicalMateListRow` 시각 규격 (5.5·5.6 공통)

```
Surface  면 bg/surface(#FFFFFF), radius 16, 그림자 Elevation/Card, fillMaxWidth
└─ Row  min-height 79, padding-left 18, padding-right 14, 자식 간격 12, 세로 중앙
    ├─ Column (weight 1f, 간격 4)
    │   ├─ Row (간격 6, 세로 중앙)
    │   │   ├─ Text  title   Heading/S (SemiBold 17/24), fg/default
    │   │   └─ Badge         type == BADGE && badge != null 일 때만
    │   └─ Text  meta        Body/S (Regular 13/20), fg/subtle
    └─ Icon  chevron_right   20, fg/muted(#7C8397)   // type != PLAIN && onClick != null
```

**배지는 제목 오른쪽 끝이 아니라 제목 바로 옆**에 붙는다(#227). 오른쪽 끝에 두면 chevron과 나란히 서서 누르는 것으로 보인다.

`MedicalMateBadge` 규격: radius **8**(pill 아님), min-height 26, 좌우 padding 8, `Label/S`.

| tone | 면 | 글자 |
| --- | --- | --- |
| `SUCCESS` ("진료 완료") | `bg/success` = #E4F7ED | `fg/success` = #0E7A4A |
| `BRAND` ("D-4") | `bg/primary-subtle` = #E3E7FC | `fg/primary` = #2E3E9E |

### 5.8 `MedicalMateSectionHeader` (마스터 `334:1156`)

```
Row  fillMaxWidth, padding-top 24, padding-bottom 10, space-between, 세로 중앙
├─ Text  title        Heading/M (SemiBold 20 / 28 / -1.5%), fg/default
└─ Text  actionLabel  Body/M Strong (SemiBold 15 / 24), fg/link(#2E3E9E)
        clickable(role=Button) + padding-vertical 8  → 터치 높이 40
```

홈에서 쓰는 두 인스턴스:

| 제목 | 오른쪽 액션 | 동작 |
| --- | --- | --- |
| `최근 브리핑 카드` | `전체 보기` | `onAllCardsClick` → 카드 목록 |
| `다가오는 일정` | `캘린더` | `onCalendarClick` → **캘린더 탭으로 이동**(백스택에 쌓지 않음) |

액션은 **버튼이 아니라 글자**다. Ghost 버튼을 쓰면 좌우 여백 때문에 오른쪽 끝이 콘텐츠 가장자리에서 안으로 들어간다.

### 5.9 `MedicalMateTabBar` (마스터 `319:1026`)

```
Column  fillMaxWidth, 면 bg/surface(#FFFFFF)
├─ 1px 선   border/subtle (#DEE1EB)
├─ Row  height 54, padding-top 8, 세 탭이 weight 1f씩
│    └─ TabItem × 3 (아이콘 24 → 간격 4 → 라벨 Label/S)
└─ 높이 24 여백 (Figma 컴포넌트 안쪽 여백; 기기 홈 인디케이터 inset과 중복 적용 금지)
전체 높이 79 = 1 + 8 + 46 + 24
```

**표시 순서는 왼쪽부터 `캘린더 · 홈 · 기록`이고 홈이 가운데다**(enum `MedicalMateTab` 선언 순서 = 화면 순서). 홈 화면에서는 `selected = HOME`.

| 탭 | 라벨 | 아이콘 (비활성 / 활성) | 목적지 |
| --- | --- | --- | --- |
| `CALENDAR` | `캘린더` | `ic_calendar` / `ic_calendar_filled` | `CalendarDestination` |
| `HOME` | `홈` | `ic_home` / `ic_home_filled` | `HomeDestination` |
| `RECORD` | `기록` | `ic_note` / `ic_note_filled` | `RecordDestination` |

활성 표시를 **세 가지로 함께** 한다 — 채움 아이콘 + 브랜드 색(`fg/primary` #2E3E9E) + 라벨 SemiBold. 비활성은 `fg/subtle`(#585F73), 라벨 굵기 기본. 색만 바꾸면 색각 이상에서 구별되지 않는다.

접근성: 각 탭은 `role = Tab` + `selected` 상태. 웹은 `role="tab"` + `aria-selected`.

---

## 6. 디자인 시스템 컴포넌트 (홈에서 쓰는 것 전부)

| 컴포넌트 | 쓰는 자리 | variant / 인자 |
| --- | --- | --- |
| `MedicalMateTabBar` | 하단 고정 | `selected = MedicalMateTab.HOME`, `surface = OPAQUE`(기본) |
| `MedicalMateIconButton` | 헤더 알림 | `icon = Bell`, `style = GHOST`(기본), `size = L`(기본) |
| `MedicalMateAvatar` | 헤더 프로필 | `type = PATIENT`(기본), `size = 36`, `onClick` 있음 |
| `MedicalMateCard` | 오늘의 한 줄 | `emphasis = BRAND`, `onClick` 없음 |
| `MedicalMateCard` | 이어서 하기 | `emphasis = DEFAULT`, `onClick` 있음 |
| `MedicalMateButton` | 주 CTA | `type = PRIMARY`, `size = L`, `leadingIcon = Stethoscope`, `fillMaxWidth` |
| `MedicalMateSectionHeader` | 카드 구역 / 일정 구역 | `title` + `actionLabel` + `onActionClick` |
| `MedicalMateListRow` | 카드 행 | `type = BADGE`(visited) 또는 `DEFAULT`, `badgeTone = SUCCESS` |
| `MedicalMateListRow` | 일정 행 | `type = BADGE`, `badgeTone = BRAND` |
| `MedicalMateBadge` | 위 두 행 내부 | `SUCCESS` / `BRAND` |
| `MedicalMateEmptyState` | 기록 없음 / 카드 없음 / 실패 | `NO_RECORD` 또는 `NO_RESULT` |
| `CircularProgressIndicator` (M3 기본) | 로딩 | 디자인 시스템 컴포넌트 아님 |
| `MedicalMateLogo.Lockup` | 헤더 로고 | 마스터 139×36, 홈은 높이 28.8 |
| `MedicalMateIcons` | Bell / Stethoscope / ChevronRight / Home / HomeFilled / Calendar / CalendarFilled / Note / NoteFilled / EmptyBox / SearchOff | — |

### 6.1 홈이 쓰는 토큰 값 (라이트 테마)

| 토큰 | 값 | 쓰임 |
| --- | --- | --- |
| `bg/surface` | `#FFFFFF` | 화면 바닥, 카드 DEFAULT, 행, 탭바 |
| `bg/canvas` | `#F5F6FA` | (홈에서는 직접 쓰지 않음 — 테마가 background를 surface로 재바인딩) |
| `bg/subtle` | `#EDEFF5` | 배지 NEUTRAL, 비활성 버튼 |
| `bg/primary` | `#5566D2` | PRIMARY 버튼 면 |
| `bg/primary-pressed` | `#3B4FC0` | PRIMARY 버튼 눌림 |
| `bg/primary-subtle` | `#E3E7FC` | 아바타 면, BRAND 배지 |
| `bg/primary-faint` | `#F2F4FE` | 오늘의 한 줄 카드 면, 빈 상태 아이콘 원 |
| `bg/success` | `#E4F7ED` | "진료 완료" 배지 면 |
| `fg/default` | `#131722` | 제목 |
| `fg/subtle` | `#585F73` | 라벨·메타·본문 |
| `fg/muted` | `#7C8397` | chevron |
| `fg/primary` | `#2E3E9E` | 아바타 글자, 활성 탭, 빈 상태 아이콘 |
| `fg/link` | `#2E3E9E` | "전체 보기", "캘린더", 빈 상태 행동 |
| `fg/on-primary` | `#FFFFFF` | PRIMARY 버튼 글자 |
| `fg/success` | `#0E7A4A` | "진료 완료" 배지 글자 |
| `border/subtle` | `#DEE1EB` | 탭바 위 1px 선 |
| `ShadowTint` | `#1B255A` | 카드·행 그림자 색 |

간격: `s2 2 / s4 4 / s6 6 / s8 8 / s10 10 / s12 12 / s14 14 / s16 16 / s20 20 / s24 24 / s32 32 / s40 40`
크기: `touchMin 48 / iconSm 18 / iconMd 20 / iconLg 24 / controlSm 40 / controlMd 48 / controlLg 56 / gutter 20 / screenWidth 360 / contentWidth 320 / safeBottom 24 / tabBarHeight 79`
반경: `xs 8 / sm 12 / md 16 / lg 20 / xl 24 / xxl 28 / buttonM 14 / full 원`

### 6.2 타이포 (Pretendard, 홈에서 쓰는 것만)

| 이름 | 무게 | 크기 | 행간 | 자간 |
| --- | --- | --- | --- | --- |
| `Heading/M` | SemiBold | 20 | 28 | -1.5% |
| `Heading/S` | SemiBold | 17 | 24 | -1.0% |
| `Body/L Strong` | SemiBold | 17 | 26 | 0 |
| `Body/M` | Regular | 15 | 24 | 0 |
| `Body/M Strong` | SemiBold | 15 | 24 | 0 |
| `Body/S` | Regular | 13 | 20 | 0 |
| `Label/L` | SemiBold | 15 | 20 | 0 |
| `Label/S` | Medium | 11 | 16 | **+2%** |

> **`Body/*` 계열만 `LineBreak.Paragraph`를 쓴다**(`Type.kt`). `Heading/*`·`Label/*`에는 없다. 한국어 문장을 어절 단위로 끊어 주는 설정이라, 오늘의 한 줄 본문과 행 메타 같은 긴 문장의 줄바꿈 모양이 제목과 다르다. 웹에서 가장 가까운 것은 `word-break: keep-all`(+ 필요하면 `text-wrap: pretty`)이고, **본문 계열에만** 걸어야 안드로이드와 같아진다.

---

## 7. 데이터 계층 — `HomeRepository`가 조합하는 것

### 7.1 API

| 메서드 | 경로 | 인증 |
| --- | --- | --- |
| `GET` | `/api/me/home` | 필요 (Authorization 헤더) |
| `GET` | `/api/me/health-profile` | 필요 — 사람 이름을 얻으려고 **병렬로** 함께 부름 |

요청 본문 없음(둘 다 GET).

`GET /api/me/home` 응답 (`HomeResponse`):

| 필드 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `lastVisitedOn` | `String?` (`yyyy-MM-dd`) | `null` | 마지막 진료일. 없으면 아직 진료 기록이 없는 사람 |
| `nextAppointment` | `AppointmentResponse?` | `null` | 다음 일정 **하나만** |
| `pendingRecordOn` | `String?` (`yyyy-MM-dd`) | `null` | 진료 후 기록이 아직 없는 지난 일정 중 가장 최근 날. 서버가 **14일까지만** 거슬러 찾고 취소한 일정은 세지 않음 (Backend#123) |
| `inProgressSession` | `InProgressSessionResponse?` | `null` | 작성 중이던 문답 |
| `recentCards` | `CardSummaryResponse[]` | `[]` | 최근 브리핑 카드 |

`AppointmentResponse`:

| 필드 | 타입 | 기본값 |
| --- | --- | --- |
| `appointmentId` | `Long` | (필수) |
| `clinicName` | `String?` | `null` |
| `department` | `String?` | `null` |
| `purpose` | `String?` | `null` — **앱이 쓰지 않음** |
| `scheduledOn` | `String` (`yyyy-MM-dd`) | (필수) |
| `scheduledTime` | `String?` (`HH:mm:ss`) | `null` → 시간 미정 |
| `status` | `String?` | `null` — 홈에서 쓰지 않음 |
| `origin` | `String?` | `null` — `"VISIT_FOLLOW_UP"`이면 재진 |
| `cards` | `LinkedCardResponse[]` | `[]` — `{ cardId: Long, title: String? }` |

`InProgressSessionResponse`: `{ sessionId: Long, siteText: String?, progressCurrent: Int, progressTotal: Int }`

`CardSummaryResponse`: `{ cardId: Long, title: String?, status: String?, visited: Boolean = false, clinicName: String?, createdAt: String (OffsetDateTime) }`

> **신규 사용자는 404가 아니라 전부 `null`과 빈 배열이다.** 그것이 1n-2 화면이다.
> **문구와 D-day는 서버가 만들지 않는다.** 날짜와 숫자만 온다.

### 7.2 두 호출의 조합 규칙

```
load(today, now):
  nameCall = async { currentUser.displayName() }     // GET /api/me/health-profile
  home     = apiCall { GET /api/me/home }            // 동시에 시작

  if home is Success:
      name = (nameCall.await() as? Success)?.value   // 실패면 조용히 null
      return Success(home.toSnapshot(name, today, now))
  else:
      return home   // Rejected / NetworkUnavailable 그대로
```

- **둘을 나란히 보낸다.** 이어 부르면 화면이 두 번 기다린다.
- **이름을 못 받아도 홈은 그린다.** 아바타 한 글자 때문에 화면 전체를 실패로 만들지 않는다 → `userInitial = ""`.
- **홈 본문이 실패한 경우만 실패다.**
- `displayName()`은 `health-profile`의 `name`을 `trim()`하고 빈 문자열이면 `null`로 만든다. `userInitial = name?.take(1).orEmpty()`.

### 7.3 `todayLine` 선택 알고리즘 (규칙 #235)

**차례가 곧 우선순위다.** 먼저 맞는 갈래에서 멈춘다.

```
todayLine(today, now):
  last   = lastVisitedOn?.toLocalDate()
  visit  = { on: nextAppointment?.scheduledOn, at: nextAppointment?.scheduledTime, clinic: nextAppointment?.clinicName.takeIf{ isNotBlank } }

  // ① 오늘
  if last == today                           -> TodayRecorded
  else if visit.on == today:
      if visit.at == null || visit.at >= now -> TodayAhead(visit.clinic, visit.at)
      else                                   -> TodayDone

  // ② 기록이 빠진 지난 일정
  else if pendingRecordOn != null            -> RecordMissing(pendingRecordOn)

  // ③ 다음 진료 (지난 진료를 이긴다)
  else if visit.on != null && visit.on > today:
      days = visit.on - today
      if days == 1                           -> NextTomorrow(visit.clinic, visit.at)
      else                                   -> NextInDays(days, visit.on, visit.clinic)

  // ④ 지난 진료
  else if last != null && last < today:
      days = today - last
      if days == 1                           -> LastYesterday
      else                                   -> LastDaysAgo(days)

  // ⑤ 나머지
  else if recentCards.isNotEmpty()           -> CardReady
  else                                       -> FirstVisit
```

경계 규칙 요약:

| 규칙 | 근거 |
| --- | --- |
| **오늘 기록이 있으면 시각도 다음 일정도 보지 않는다.** 오늘 남긴 것이 가장 최근의 일 | 테스트 `오늘 기록이 있으면 다른 것보다 앞선다` |
| **시각이 없는 오늘 일정은 "앞둔 것"으로 본다.** 시간 미정이라 지났다고 말할 근거가 없다 | `visit.at == null` 분기 |
| **다음 진료가 지난 진료를 이긴다.** 앞으로 할 일이 지나간 일보다 급하다 | 테스트 `다음 진료가 지난 진료를 이긴다` |
| **경과일/남은 날은 2 이상일 때만 숫자로 적는다.** 1은 "어제"/"내일", 0은 오늘 갈래 | #224 회귀 방지 |
| **앞날 진료에 경과일을 적지 않는다.** `last > today`면 ④ 갈래가 `null`을 돌려줌 | 테스트 `앞날 진료에 경과일을 적지 않는다` |
| **`pendingRecordOn`이 없으면 ② 갈래를 건너뛴다.** 어느 일정에 기록이 남았는지는 서버가 가림 | Backend#123 |

### 7.4 `resume` 매핑

```
InProgressSessionResponse -> HomeResume(
  intakeId     = sessionId.toString(),
  symptomTitle = siteText ?: "",
  step         = progressCurrent > 0 ? SYMPTOM_CHAT : BODY_PART
)
```

**서버의 왕복 수를 단계로 쓰지 않는다**(#176). 서버 `progressCurrent / progressTotal`은 문답 왕복이고 상한이 20이다. 그대로 찍으면 "20단계 중 0단계까지 답했어요"가 된다. 환자가 보는 단계는 **네 단계**다.

- 부위를 짚어야 세션이 생기므로 왕복 0이어도 1단계(`BODY_PART`)는 끝난 것.
- 문답에 한 마디라도 답했으면 2단계(`SYMPTOM_CHAT`).
- **응답에 강도도 질문도 없어서 3·4단계는 여기서 가려낼 수 없다.** (열린 질문)

### 7.5 `upcoming` 매핑

```
nextAppointment -> [HomeSchedule(
  id       = appointmentId.toString(),
  title    = [clinicName, department].filter{ isNotBlank }.joinToString(" ")
               .ifEmpty { cards.firstOrNull()?.title ?: "" },
  date     = scheduledOn,
  time     = scheduledTime?.let{ LocalTime.parse(it) }?.format("a h:mm", ko) ,   // 파싱 실패 시 null
  followUp = (origin == "VISIT_FOLLOW_UP"),
)]
또는 []
```

- **서버는 다음 일정 하나만 준다.** 화면은 목록으로 받으므로 길이가 0 또는 1이다.
- `purpose`는 앱이 채우지 않으므로 제목에 합치지 않는다.
- **시각 파싱이 실패하면 시간 미정으로 본다.** `parseTime()`이 `runCatching { LocalTime.parse(...) }.getOrNull()`이다. 일정 하나 때문에 홈 전체가 죽는 것보다 낫다.
- **날짜(`scheduledOn`)에는 같은 방어가 없다.** `toSnapshot()`이 `LocalDate.parse(it.scheduledOn)`을 그대로 부르므로 형식이 깨지면 예외가 나고 홈 전체가 죽는다. 시각과 날짜의 방어 수준이 다르다 — 웹으로 옮길 때 날짜 쪽도 방어할지는 별도 판단이 필요하고, 그대로 옮기면 안드로이드와 동작이 같아진다.
- `upcoming()`이 `listOfNotNull { nextAppointment?.let { on?.let { ... } } }` 이중 null 체크를 하지만, 위 이유로 `on`이 null인 경우는 `nextAppointment`가 null일 때뿐이다.
- 시각 포맷은 `Locale.KOREAN` 고정 — 기기 언어가 한국어가 아니면 `a`가 AM/PM으로 나와 한 줄 안에서 언어가 갈린다.

### 7.6 `savedCards` 매핑

```
CardSummaryResponse -> SavedCardSummary(
  id        = cardId.toString(),
  title     = title ?: "",
  visited   = visited,                                  // status를 쓰지 않는다
  writtenOn = OffsetDateTime.parse(createdAt).toLocalDate(),
  clinic    = clinicName,                               // null 그대로
)
```

- 정렬·개수 제한은 앱이 하지 않는다. **서버가 준 순서 그대로** 그린다.
- 포맷은 화면 몫이다. 서버가 만든 문자열을 그대로 쓰면 날짜 계산을 다시 할 수 없다.

### 7.7 `HomeRepositoryTest` 26건 — 규칙 표

| # | 테스트 이름 | 고정하는 규칙 |
| --- | --- | --- |
| 1 | 마지막 진료일이 없으면 첫 방문이다 | 빈 응답 → `FirstVisit` (404 아님) |
| 2 | 카드만 있으면 날짜를 잡으라고 한다 | `recentCards`만 있으면 `CardReady` |
| 3 | 오늘 일정은 시각 전이면 앞두고 있는 것이다 | 9/11 09:00, 일정 10:30 → `TodayAhead("서울OO병원 내과", 10:30)` |
| 4 | 오늘 일정의 시각이 지났는데 기록이 없으면 묻는다 | 9/11 14:00, 일정 10:30 → `TodayDone` |
| 5 | 오늘 기록이 있으면 다른 것보다 앞선다 | `lastVisitedOn == today` → `TodayRecorded` (시각·다음 일정 무시) |
| 6 | 다음 진료가 내일이면 날수를 적지 않는다 | +1일 → `NextTomorrow` |
| 7 | 다음 진료가 이틀 이상 남으면 날수를 적는다 | 9/11→9/16 → `NextInDays(5, 9/16, clinic)` |
| 8 | 다음 진료가 지난 진료를 이긴다 | last 8/30 + next 9/16 → `NextInDays` |
| 9 | 어제 다녀왔으면 날수를 적지 않는다 | last 9/10, today 9/11 → `LastYesterday` |
| 10 | 지난 진료가 이틀 이상 지나면 날수를 적는다 | last 8/30, today 9/11 → `LastDaysAgo(12)` |
| 11 | 앞날 진료에 경과일을 적지 않는다 | last 9/16 > today 9/14 → `LastDaysAgo` 아님 |
| 12 | 기록이 빠진 지난 일정이 있으면 그 날을 알린다 | `pendingRecordOn = 9/8` → `RecordMissing(9/8)` |
| 13 | 기록이 빠진 지난 일정이 없으면 지난 진료를 적는다 | `pendingRecordOn = null`, last 9/8 → `LastDaysAgo(3)` |
| 14 | 작성 중이던 문답이 이어서 하기가 된다 | id "7", title "복부", step `SYMPTOM_CHAT` |
| 15 | 서버의 왕복 수를 단계로 쓰지 않는다 | `total == 4`, `step.number == 2` (서버 total 20 무시) |
| 16 | 한 마디도 answer 안 했으면 부위까지만 답한 것이다 | `progressCurrent == 0` → `BODY_PART` |
| 17 | 작성 중이던 문답이 없으면 이어서 하기도 없다 | `resume == null` |
| 18 | 진료 완료 배지는 확정이 아니라 다녀왔는지로 갈린다 | `visited` = `[true, false]` |
| 19 | 확정했지만 안 다녀온 카드는 배지가 없다 | `status="CONFIRMED", visited=false` → `visited=false` |
| 20 | 확정 전 카드에는 병원이 없다 | draft 카드 `clinic == null` |
| 21 | 카드 작성일은 날짜 타입으로 옮긴다 | `2026-09-04T09:00:00+09:00` → `2026-09-04` |
| 22 | 다음 일정은 날짜와 시각으로 갈라 담는다 | id "1", date 9/12, time `"오전 10:30"` |
| 23 | 다음 일정이 없으면 목록이 빈다 | `upcoming == []` |
| 24 | 이름 첫 글자를 아바타에 쓴다 | "김지훈" → "김" |
| 25 | 이름을 못 받아도 홈은 그린다 | 이름 호출 실패 → `Success`, `userInitial == ""` |
| 26 | 홈 본문이 실패하면 실패다 | `/api/me/home` IOException → `NetworkUnavailable` |

---

## 8. ViewModel / 생명주기

`HomeViewModel(repository, clock)`:

```kotlin
uiState: StateFlow<HomeUiState>   // 초기값 HomeUiState.Loading

fun refresh() {
    uiState.value = HomeUiState.Loading
    launch {
        uiState.value = when (repository.load(LocalDate.now(clock), LocalTime.now(clock))) {
            is Success              -> result.value.toContent()
            is Rejected,
            is NetworkUnavailable   -> HomeUiState.Failed
        }
    }
}
```

- **`Clock`을 주입받는다.** D-day와 "N일이 지났어요"가 오늘 날짜에 달려 있어 시스템 시계를 직접 읽으면 테스트할 수 없다.
- **`refresh()`는 매번 `Loading`을 거친다.** 화면으로 돌아올 때마다 부르는데 옛 값이 남아 있으면 바뀐 진행도가 늦게 보인다.
- `HomeRoute`가 `LaunchedEffect(Unit) { viewModel.refresh() }`로 **최초 1회만** 호출한다. 다른 화면에서 돌아올 때 자동 재조회하는 코드는 지금 없다(`LaunchedEffect(Unit)`은 컴포지션이 유지되면 다시 돌지 않는다).
- `HomeRoute`는 `today = remember { LocalDate.now() }`로 **날짜를 한 번만 읽는다.** 조합마다 다시 읽으면 D-day가 화면이 살아 있는 동안 바뀔 수 있다. **자정을 넘겨 값이 달라지는 것은 지금 다루지 않는다.**
- `onRetryClick`은 `HomeRoute`가 `callbacks.copy(onRetryClick = viewModel::refresh)`로 **덮어쓴다.** 그래프에서 넘긴 값은 무시된다.

**웹 이식 시**: `refresh()`에 해당하는 것은 React Query/SWR의 `refetch`. `Loading` 상태로 되돌아가는 동작(기존 데이터를 지우고 스피너로 대체)을 그대로 재현하려면 `keepPreviousData: false`가 필요하다.

### 8.1 `HomeViewModelTest` 7건 — 고정된 규칙

| # | 테스트 이름 | 고정하는 규칙 |
| --- | --- | --- |
| 1 | 처음 상태는 Loading이다 | `MutableStateFlow`의 초기값이 `Loading` |
| 2 | refresh하면 받은 값이 Content가 된다 | `Success` → `Content` |
| 3 | 읽지 않은 알림은 늘 꺼져 있다 | `hasUnreadNotification == false` 하드코딩(2.7) |
| 4 | 오늘 날짜를 저장소에 넘긴다 | `repository.load(LocalDate.now(clock), LocalTime.now(clock))` — 주입한 `Clock`을 쓴다 |
| 5 | 서버가 거절하면 Failed가 된다 | `Rejected` → `Failed` |
| 6 | 연결이 없으면 Failed가 된다 | `NetworkUnavailable` → `Failed` |
| 7 | 다시 부르면 Loading을 거쳐 간다 | `refresh()`가 매번 `Loading`을 먼저 세운다 |

### 8.2 `HomePreviews` — Preview 픽스처 (웹 목업 데이터로 그대로 쓸 것)

`previewToday = 2026-09-07` 고정. `LocalDate.now()`를 쓰면 D-day가 Preview를 여는 날마다 달라져 Figma와 비교할 수 없다.

`previewContent` (`HomeUiState.Content`):

| 필드 | 값 |
| --- | --- |
| `userInitial` | `"김"` |
| `hasUnreadNotification` | **`true`** (그래도 화면에는 아무 변화가 없다 — 2.7) |
| `todayLine` | `NextInDays(days = 2, on = 2026-09-16, clinic = "서울OO병원 내과")` |
| `resume` | `HomeResume("intake-1", "복부 통증", SYMPTOM_CHAT)` |
| `savedCards` | `[("card-1", "복부 통증 · 3주", visited=true, 2026-09-04, "서울OO병원 내과"), ("card-2", "두통 · 잦은 어지러움", visited=false, 2026-08-21, clinic=null)]` |
| `upcoming` | `[("visit-1", "서울OO병원 내과 재진", 2026-09-12, "오전 10:30")]` — `followUp`은 기본값 `false` |

Preview 함수는 **4개**다:

| Preview | 상태 | 비고 |
| --- | --- | --- |
| `HomeScreenContentPreview` | `previewContent` | `@MedicalMateScreenPreviews` (여러 기기 크기) |
| `HomeScreenEmptyPreview` | `previewContent.copy(todayLine = FirstVisit, resume = null, savedCards = [], upcoming = [])` | 1n-2. 390×844 |
| `HomeScreenFailedPreview` | `HomeUiState.Failed` | 390×844 |
| `StartIntakeButtonPreview` | — | 시작 버튼 + `size = M` 버튼 비교용 |

- **`Loading` Preview는 없다.** 10.1의 스피너 화면은 Preview로 확인하지 않는다.
- `StartIntakeButtonPreview`의 KDoc이 아직 "마이크 아이콘"이라고 적혀 있으나 **코드는 `Stethoscope`다**(#227에서 교체). 주석만 남은 것이니 웹에서 마이크로 그리지 말 것.
- 1n-2 Preview가 `resume = null`이라 시안에는 이어서 하기 카드가 없지만, **상태 자체는 1n-2에서도 `resume != null`이 될 수 있다**(3.2의 4번 줄).

---

## 9. 네비게이션 — 이 화면에서 나가는 모든 경로

`HomeCallbacks`는 **9개 필드짜리 `data class`이고 전부 기본값이 빈 동작(`{}`)이다.** 목적지가 없는 콜백은 호출자가 그냥 두면 아무 일도 일어나지 않는다.

```kotlin
data class HomeCallbacks(
    val onStartIntakeClick: () -> Unit = {},
    val onResumeClick: (String?) -> Unit = {},                 // 인자가 nullable String이다
    val onSavedCardClick: (cardId: String) -> Unit = {},
    val onAllCardsClick: () -> Unit = {},
    val onScheduleClick: (date: LocalDate, appointmentId: String) -> Unit = { _, _ -> },
    val onCalendarClick: () -> Unit = {},
    val onNotificationClick: () -> Unit = {},
    val onProfileClick: () -> Unit = {},
    val onRetryClick: () -> Unit = {},
)
```

> **타입 변환은 화면이 아니라 `MedicalMateNavHost`가 한다.** 화면은 `String`·`LocalDate`로 넘기고, NavHost가 `toLongOrNull()`·`date.toString()`(ISO `yyyy-MM-dd`)으로 목적지 인자를 만든다. 웹에서도 라우팅 직전까지 도메인 타입을 유지하는 편이 안전하다.

`MedicalMateNavHost.homeCallbacks()`의 실제 연결:

| # | 콜백 | 트리거 (사용자 동작) | 목적지 | 인자 | 백스택 |
| --- | --- | --- | --- | --- | --- |
| 1 | `onStartIntakeClick` | **"증상 정리 시작하기" 버튼** 탭 | `IntakeDestination` (1l) | `sessionId = null` | push |
| 2 | `onStartIntakeClick` | **빈 상태 "증상 정리하기"** 탭 (카드 없음 + 일정 있음일 때만 존재) | 위와 동일 | `sessionId = null` | push |
| 3 | `onResumeClick(intakeId)` | **"이어서 하기" 카드** 전체 탭 | `IntakeDestination` (1l) | `sessionId = intakeId.toLongOrNull()` | push |
| 4 | `onSavedCardClick(cardId)` | **최근 브리핑 카드 행** 탭 | `BriefCardDestination` (1e-1) | `cardId: String` | push |
| 5 | `onAllCardsClick` | 구역 헤더 **"전체 보기"** 탭 | `BriefCardListDestination` (1j-4) | 없음 | push |
| 6 | `onScheduleClick(date, id)` | **다가오는 일정 행** 탭 | `CalendarDayDestination` (1r-2) | 화면이 넘기는 값 `(LocalDate, String)` → 목적지 인자 `date: String("yyyy-MM-dd")`(= `date.toString()`), `appointmentId: Long?`(= `toLongOrNull()`) | push |
| 7 | `onCalendarClick` | 구역 헤더 **"캘린더"** 탭 | `CalendarDestination` (1r) | 없음 | **탭 이동** (아래 규칙) |
| 8 | `onProfileClick` | **헤더 아바타** 탭 | `MyProfileDestination` | 없음 | push |
| 9 | `onNotificationClick` | **헤더 벨 아이콘** 탭 | **미연결 — 아무 일도 일어나지 않음** | — | — |
| 10 | `onRetryClick` | 실패 화면 **"다시 시도"** 탭 | 이동 없음, `viewModel.refresh()` | — | — |

> `homeCallbacks()`가 실제로 채우는 것은 **7개**다(`onStartIntakeClick` · `onResumeClick` · `onSavedCardClick` · `onAllCardsClick` · `onScheduleClick` · `onCalendarClick` · `onProfileClick`). `onNotificationClick`은 채우지 않아 기본 빈 동작이 남고, `onRetryClick`은 `HomeRoute`가 `callbacks.copy(onRetryClick = viewModel::refresh)`로 덮어쓴다(8절). 그래서 표의 행은 10개인데 콜백은 9개다 — 1·2번이 같은 `onStartIntakeClick`이다.

하단 탭 이동 (`onTabSelect` → `NavHostController.selectTab`):

| 탭 | 목적지 | 옵션 |
| --- | --- | --- |
| `CALENDAR` | `CalendarDestination` | `popUpTo(startDestination){ saveState = true }` + `launchSingleTop` + `restoreState` |
| `HOME` | `HomeDestination` | 동일 (같은 탭 재선택 시 `launchSingleTop`으로 중복 방지) |
| `RECORD` | `RecordDestination` | 동일 |

> 탭은 서로의 형제다. 탭을 옮길 때마다 백스택에 쌓으면 뒤로 가기가 탭 방문 이력을 되짚는다. **시작 목적지까지 pop하고 상태를 저장·복원**해서 탭을 오갔다 돌아오면 스크롤과 고른 날이 남아 있게 한다.

**목적지 등록**(`HomeDestination.kt`): `@Serializable internal data object HomeDestination` — **인자가 없다.** `internal fun NavGraphBuilder.homeDestination(callbacks: HomeCallbacks, onTabSelect: (MedicalMateTab) -> Unit)`이 `composable<HomeDestination> { HomeRoute(callbacks, onTabSelect) }` 하나만 등록한다. 나가는 길을 하나씩 받지 않고 `HomeCallbacks`를 통째로 넘기는 구조다. 웹 라우트도 `/`(또는 `/home`)에 파라미터 없이 두면 된다.

**들어오는 경로**(참고): `SessionUiState.destination()`이 `SignedIn`이고 온보딩이 끝났으면 `HomeDestination`을 고르므로, 홈은 **NavHost의 `startDestination`**이 된다(탭 이동의 `popUpTo(startDestination)`이 홈까지 pop한다는 뜻이다). 로그인 완료 · 온보딩 완료 시 `resetTo(HomeDestination)`(백스택 전체 비움). 브리핑 카드 저장 완료(`onSaved`)도 `resetTo(HomeDestination)`. 카드 삭제 시 `popUpTo<HomeDestination>{ inclusive = false }` + 카드 목록 push → 뒤로 가면 홈이 나온다.

**화면 전환 애니메이션**(`MedicalMateNavTransitions`):
- 탭 ↔ 탭: **`EnterTransition.None` / `ExitTransition.None`** (아무것도 하지 않음)
- 그 외: 들어올 때 `slideInHorizontally(+full)` + `fadeIn`, 물러날 때 `slideOutHorizontally(-full/4)` + `fadeOut`, 되돌아올 때 반대. `tween(320ms, FastOutSlowInEasing)`
- 가장자리 스와이프 뒤로가기(predictive back)도 같은 전환을 재사용

---

## 10. 로딩 / 빈 상태 / 에러

### 10.1 Loading (`HomeUiState.Loading`)

```
Column(fillMaxSize, 세로·가로 중앙)
└─ CircularProgressIndicator()     // Material3 기본, 커스텀 없음
```

- **하단 탭바는 그대로 보인다**(`HomeScreen`의 Column 구조상 `HomeBody`만 갈린다).
- 헤더도 오늘의 한 줄 카드도 그리지 않는다. 화면 전체가 스피너 하나다.
- 스켈레톤 UI 없음.

### 10.2 Failed (`HomeUiState.Failed`)

```
Column(fillMaxSize, padding 20, 세로·가로 중앙)
└─ MedicalMateEmptyState(
     type        = NO_RESULT,            // 아이콘 ic_search_off
     title       = "불러오지 못했어요",
     description = "인터넷 연결을 확인하고 다시 시도해주세요",
     actionLabel = "다시 시도",
     onActionClick = viewModel::refresh,
   )
```

- 하단 탭바는 그대로 보인다.
- **서버 거절(`Rejected`)과 네트워크 없음(`NetworkUnavailable`)을 구분하지 않는다.** 둘 다 같은 화면. `ApiResult.Rejected`의 `code`·`message`·`requestId`·`retryable`은 홈에서 쓰지 않는다.
- 토스트나 스낵바 없음.

### 10.3 빈 상태 A — 1n-2 (카드도 일정도 없음)

```
MedicalMateEmptyState(
  type        = NO_RECORD,               // 아이콘 ic_empty_box
  title       = "아직 진료 기록이 없어요",
  description = "증상을 정리해두면 진료실에서 바로 보여줄 수 있어요",
  // actionLabel 없음 — 위에 "증상 정리 시작하기"가 있으므로
  modifier    = Modifier.weight(1f),     // 남은 높이를 전부 받아 그 안에서 중앙
)
```

### 10.4 빈 상태 B — 카드만 없고 일정은 있음 (1n-1 안)

```
MedicalMateEmptyState(
  type          = NO_RECORD,
  title         = "아직 진료 기록이 없어요",
  description   = "증상을 정리해두면 진료실에서 바로 보여줄 수 있어요",
  actionLabel   = "증상 정리하기",        // ← 이쪽에는 있음
  onActionClick = onStartIntakeClick,
)
```

- **"최근 브리핑 카드" 헤더를 그리지 않는다.** 제목만 남기고 빈 목록을 두면 무엇을 해야 하는지 알 수 없다.
- 그 아래에 "다가오는 일정" 구역이 정상적으로 이어진다.

### 10.5 빈 상태 C — 일정만 없음

**구역 자체를 그리지 않는다.** "다가오는 일정" 헤더도 없고 빈 상태도 없다.

### 10.6 `MedicalMateEmptyState` 시각 규격

```
Column  fillMaxWidth, padding-vertical 40, 가로 중앙, 세로 중앙(간격 12)
├─ 원 72 (bg/primary-faint #F2F4FE, 완전 원형)
│    └─ Icon 32 (fg/primary #2E3E9E)
├─ Column (padding-top 4, 간격 6, 가로 중앙)
│    ├─ note?   Body/M Strong, fg/primary   // 홈에서는 안 씀
│    ├─ title   Heading/M, fg/default, 가운데 정렬
│    └─ desc    Body/M, fg/subtle, 가운데 정렬
└─ action?  높이 48, radius 14, 좌우 padding 20
        Label/L, fg/link(#2E3E9E), **면 없음**(마스터의 Tonal 알약이 아니라 글자만)
```

| type | 아이콘 |
| --- | --- |
| `NO_RECORD` | `ic_empty_box` |
| `NO_RESULT` | `ic_search_off` |
| `OFFLINE` | `ic_wifi_off` (홈에서 안 씀) |
| `MIC_DENIED` | `ic_mic_off` (홈에서 안 씀) |

---

## 11. 웹 포팅 시 위험 지점

| # | 지점 | 내용 | 대응 |
| --- | --- | --- | --- |
| 1 | **빈 상태의 `weight(1f)`** | 1n-2에서 빈 상태가 "남은 높이 전부"를 받고 그 안에서 중앙 정렬된다. 스크롤과 병행 불가. | `display:flex; flex-direction:column; height:100%` + 빈 상태에 `flex:1; min-height:0; justify-content:center`. `overflow` 금지. |
| 2 | **두 컨테이너 구조가 다름** | 1n-1은 `LazyColumn`(가상 스크롤), 1n-2는 일반 `Column`. 같은 컴포넌트를 두 레이아웃으로 렌더해야 한다. | 조건부 컨테이너 하나로 감싸되 스크롤 여부를 클래스로 토글. 항목 수가 적으므로 가상화는 불필요. |
| 3 | **간격 규칙이 두 겹** | 항목 간 16은 컨테이너의 `gap`인데 Section Header만 자체 `margin`(위 24 / 아래 10)을 갖는다. CSS `gap`과 `margin`이 합산되어 24+16이 된다. | 컨테이너 `gap:16`을 쓰고 Section Header는 `margin-top: 8px`(24-16)로 보정하거나, `gap` 대신 각 항목에 `margin-bottom:16`을 주고 헤더만 예외 처리. **원본 Compose에서는 합산된다**(spacedBy 16 + padding 24) — 즉 헤더 위 실제 간격은 40이다. 이 합산을 그대로 재현할 것. |
| 4 | **로고 높이 28.8px** | 소수점 dp. 브라우저는 서브픽셀 렌더링으로 처리하지만 SVG여야 흐려지지 않는다. | 로고를 SVG로 내보내고 `height: 28.8px`(또는 `1.8rem`)로 지정. |
| 5 | **그림자 색이 검정이 아님** | `Elevation/Card` = 브랜드 틴트 #1B255A. Compose는 API 28 미만에서 검정으로 떨어지지만 웹은 항상 틴트를 쓸 수 있다. | `box-shadow: 0 3px 10px rgba(27,37,90,.08), 0 1px 2px rgba(27,37,90,.05)` |
| 6 | **날짜 요일 로케일 미고정** | `ScheduleRow`의 `M월 d일 (E)`가 기기 로케일을 따른다(안드로이드 버그성). 웹에서 그대로 옮기면 브라우저 로케일에 따라 `Fri`가 나온다. | `Intl.DateTimeFormat('ko-KR', {month:'numeric', day:'numeric', weekday:'short'})`로 **ko-KR 고정**. |
| 7 | **오전/오후 포맷** | `a h:mm` + `Locale.KOREAN` → `오전 10:30`. `Intl`의 `hour12:true`는 `오전 10:30`을 주지만 `dayPeriod` 위치와 공백이 다를 수 있다. | 직접 조립 권장: `${h<12?'오전':'오후'} ${((h+11)%12)+1}:${String(m).padStart(2,'0')}` |
| 8 | **D-day 음수** | `daysUntil`이 음수를 그대로 찍어 `D--1`이 될 수 있다(테스트가 음수를 명시적으로 허용). 서버가 과거 일정을 주지 않는다는 전제. | 웹에서도 동일 동작을 유지하되, 음수 방어가 필요하면 별도 티켓. 임의로 `D+1`로 바꾸면 안드로이드와 갈린다. |
| 9 | **`hasUnreadNotification`이 시각적으로 아무것도 안 함** | 접근성 이름만 바뀐다. 시안에는 점이 있는 것처럼 주석이 적혀 있으나 코드에는 없다. | 안드로이드와 맞추려면 점을 그리지 않는다. 그리려면 디자인 트랙 확인 후 양쪽 동시 적용. |
| 10 | **탭바 하단 24px 여백** | Figma 컴포넌트 **안쪽** 여백이라 기기 홈 인디케이터 inset과 **중복 적용 금지**. | 웹: `padding-bottom: max(24px, env(safe-area-inset-bottom))`. 더하지 말고 `max`를 쓸 것. |
| 11 | **탭 순서** | 코드 순서는 `캘린더 · 홈 · 기록`이다(홈이 가운데). 기획 문서에 `기록 · 홈 · 캘린더`로 적힌 곳이 있으나 **소스가 정답**. | enum 선언 순서를 그대로 옮긴다. |
| 12 | **탭 상태 보존** | 안드로이드는 `saveState`/`restoreState`로 탭별 스크롤 위치와 선택 날짜를 유지한다. | 웹 라우터에서 탭 화면을 언마운트하지 말고 `display:none`으로 숨기거나, 스크롤 위치를 별도 저장. |
| 13 | **탭 이동에는 전환 없음** | 탭끼리는 애니메이션 0, 그 외에는 320ms 슬라이드. | 라우터 전환에서 "형제 탭 여부"를 판별해 애니메이션을 끄는 분기가 필요하다. |
| 14 | **두 API 병렬 호출** | `/api/me/home`과 `/api/me/health-profile`을 동시에 부르고, 후자의 실패는 무시한다. | `Promise.allSettled` 또는 이름만 별도 쿼리로 두고 `isError`를 무시. 순차 호출하면 체감 대기가 두 배. |
| 15 | **문구 조립을 서버가 안 함** | 9갈래 × (라벨/제목/본문 1~2줄)을 클라이언트가 조립한다. | i18n 리소스로 `%1$s` 자리를 그대로 옮기고, 갈래 선택 로직(7.3)을 TS로 이식. **테스트 26건도 함께 옮길 것.** |
| 16 | **`Label/S`의 자간 +2%** | 오늘의 한 줄 라벨과 배지, 탭 라벨이 쓴다. CSS `letter-spacing`은 em 단위. | `letter-spacing: 0.02em` |
| 17 | **Pretendard 폰트** | Google Fonts에 없어 앱이 OTF를 동봉한다(SIL OFL 1.1). | 웹폰트로 자가 호스팅하거나 `cdn.jsdelivr.net`의 `pretendard` 패키지. 라이선스 표기 필요. |
| 18 | **`refresh()`가 `Loading`으로 되돌아감** | 재조회 때 화면 전체가 스피너로 바뀐다(기존 데이터 유지 안 함). | React Query 기본값(`keepPreviousData`)과 반대. 의도적으로 맞출지 개선할지 결정 필요. |
| 19 | **한국어 줄바꿈 전략** | `Body/*` 스타일만 `LineBreak.Paragraph`다(6.2). 웹 기본 줄바꿈은 어절을 중간에서 끊어 "브리핑 카"처럼 보인다. | 본문 계열 클래스에만 `word-break: keep-all`. 제목·라벨에는 걸지 않는다. |
| 20 | **`scheduledOn` 파싱에 방어가 없음** | 시각은 `runCatching`으로 감싸 실패하면 "시간 미정"이 되지만, 날짜는 `LocalDate.parse`를 그대로 불러 예외가 나면 홈 전체가 죽는다(7.5). | 그대로 옮기면 동작이 같다. 웹에서 방어하려면 안드로이드와 함께 고칠 것 — 한쪽만 고치면 같은 응답에서 화면이 갈린다. |
| 21 | **홈에는 편집 모드도 당겨서 새로고침도 없다** | `HomeUiState`가 3갈래뿐이고 재조회 진입점이 최초 진입과 "다시 시도"뿐이다(2.7). | 웹에서 pull-to-refresh를 "당연히 있어야 할 것"으로 넣지 말 것. 넣으려면 안드로이드에 없는 기능이라는 합의가 먼저다. |

---

## 12. 열린 질문

| # | 질문 | 근거 |
| --- | --- | --- |
| 1 | `inProgressSession`이 항상 문답 중(`IN_PROGRESS`)인 세션만 담기는가? | `HomeRepository.toResume()` 주석: "어느 쪽인지 백엔드에 확인 중". 아니라면 3·4단계를 가릴 수 없어 진행률이 틀린다. |
| 2 | `MedicalMateEmptyState`의 행동 버튼이 Tonal 알약인가 글자인가? | 마스터는 Tonal 알약, 시안 인스턴스는 전부 채움을 지웠다. 코드는 시안을 따랐고 "디자인 트랙 확인 대기". |
| 3 | 알림(벨) 아이콘의 목적지는? 읽지 않은 알림 표시(점)는 그리는가? | 알림 목록 API가 없고 `onNotificationClick`이 미연결. `hasUnreadNotification`은 하드코딩 `false`. |
| 4 | `nextAppointment`가 과거 날짜로 올 수 있는가? | `daysUntil`이 음수를 허용하고 `D--1`이 찍힌다. 서버 계약 확인 필요. |
| 5 | `recentCards`의 개수 상한과 정렬 기준은? | 앱이 자르지 않고 서버 순서를 그대로 쓴다. "최근"의 정의가 서버 몫. |
| 6 | 자정을 넘긴 뒤 D-day 갱신 정책은? | `HomeRoute`가 `remember { LocalDate.now() }`로 고정하고 "지금 다루지 않는다"고 명시. 웹에서도 같은 제약을 둘지 결정 필요. |
| 7 | `HomePreviews`의 일정 픽스처가 `title = "서울OO병원 내과 재진"`인데 `followUp = false`(기본값)라, 실제로는 `"서울OO병원 내과 재진 초진"`으로 렌더된다. | Preview 픽스처만의 문제인지, `HomeSchedule.title`에 방문 유형을 넣는 규약이 흔들린 것인지 확인 필요. Repository는 제목에 방문 유형을 넣지 않는다. |
