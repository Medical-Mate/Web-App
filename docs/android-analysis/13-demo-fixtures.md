# 데모용 픽스처 · 프리뷰 데이터 추출

## 웹앱 구현 메모

- **모바일 폭 고정한다.** 안드로이드 Preview 매트릭스가 360 / 390 / 412dp 셋뿐이라 웹도 `max-width: 430px` 컬럼을 가운데 세우고 그 안에서만 반응형을 잡는다. 데스크톱 전용 레이아웃은 만들지 않는다.
- **데모는 서버 없이 돈다.** `docs/assets/demo-data.json` 하나를 읽어 화면 상태를 갈아 끼우는 방식으로 30단계를 재현한다. API는 지연(`delayMs`)만 흉내 낸다.
- **애니메이션은 두 곳만 진짜로 만든다** — AI 정리 로딩(24→25, 약 2.2초 스피너)과 카드 펼침(29, height auto 트랜지션). 나머지는 200ms 크로스페이드로 충분하다.
- **제스처는 전부 탭으로 대체한다.** 인체도 회전·핀치줌(3D BodyMap), 통증 슬라이더 드래그, 바텀시트 스와이프는 웹에서 정지점 탭 / 버튼 / 백드롭 클릭으로 낮춘다(시나리오 11번도 "정지점 탭"이다).
- **날짜는 `today = 2026-09-15` 고정**이다. `new Date()`를 쓰면 D-day와 "3일 남았어요"가 시연 때마다 달라진다.

---

## 0. 이 문서의 범위 · 읽은 파일

담당 영역은 **앱 안에 이미 들어 있는 샘플 데이터를 전부 그대로 꺼내는 일**과, 그것을 재료로 **해커톤 시연 30단계를 웹앱에서 돌릴 완성 목데이터를 설계하는 일** 둘이다.

실제로 연 파일(전부 절대경로):

| 분류 | 파일 |
|---|---|
| 픽스처 | `C:\Claude\MedicalMate\app\src\main\java\com\mist\medicalmate\calendar\ui\CalendarFixtures.kt` |
| 픽스처 | `C:\Claude\MedicalMate\app\src\main\java\com\mist\medicalmate\visit\ui\VisitFixtures.kt` |
| 픽스처 | `C:\Claude\MedicalMate\app\src\main\java\com\mist\medicalmate\card\ui\RecordDetailFixtures.kt` |
| Preview | `C:\Claude\MedicalMate\app\src\main\java\com\mist\medicalmate\home\ui\HomePreviews.kt` |
| Preview | `C:\Claude\MedicalMate\app\src\main\java\com\mist\medicalmate\calendar\ui\CalendarDayPreviews.kt` |
| Preview 애노테이션 | `C:\Claude\MedicalMate\app\src\main\java\com\mist\medicalmate\core\designsystem\MedicalMateScreenPreviews.kt` |
| Preview 데이터 | `...\card\ui\BriefCardScreen.kt` · `...\card\ui\RecordViewModel.kt` · `...\card\ui\BriefCardListViewModel.kt` · `...\calendar\ui\ScheduleAddViewModel.kt` · `...\intake\ui\IntakeScreen.kt` · `...\visit\ui\HospitalPickScreen.kt` · `...\visit\ui\ClinicConfirmScreen.kt` · `...\profile\ui\MyProfileViewModel.kt` · `...\profile\ui\HealthEditViewModel.kt` · `...\profile\ui\ProfileSetupScreen.kt` |
| 컴포넌트 Preview | `...\core\designsystem\component\{Action,AddedComponent,Content,Feedback,Input,InputControl,Navigation}Previews.kt` |
| 상태 정의 | `...\calendar\ui\CalendarUiState.kt` · `...\calendar\ui\ScheduleAddUiState.kt` · `...\card\ui\RecordUiState.kt` · `...\card\ui\RecordDetailUiState.kt` · `...\card\ui\BriefCardUiState.kt` · `...\home\ui\HomeUiState.kt` · `...\visit\ui\VisitUiState.kt` · `...\intake\ui\IntakeUiState.kt` · `...\profile\ui\MyProfileUiState.kt` · `...\profile\ui\ProfileSetupUiState.kt` |
| 매핑 규칙 | `...\card\data\CardMapping.kt` · `...\card\data\CardHealth.kt` · `...\visit\data\VisitMapping.kt` · `...\calendar\ui\CalendarDayViewModel.kt` |
| 문자열 | `C:\Claude\MedicalMate\app\src\main\res\values\strings.xml` (577줄 전체) |
| 테스트 | `C:\Claude\MedicalMate\app\src\test\java\com\mist\medicalmate\card\ui\RecordDetailFixturesTest.kt` |
| 시나리오 | `C:\Claude\MedicalMateWebApp\docs\DEMO-SCENARIO-30steps.md` |

산출물:

- 문서 — `C:\Claude\MedicalMateWebApp\docs\android-analysis\13-demo-fixtures.md` (이 파일)
- 목데이터 — `C:\Claude\MedicalMateWebApp\docs\assets\demo-data.json`

> **원칙 하나.** 아래 표의 한국어 문구는 전부 소스에서 글자 그대로 옮긴 것이다. 내가 만든 값은 `생성` 표시를 붙였고, 붙어 있지 않으면 소스에 그 글자가 있다는 뜻이다.

---

## 1. 픽스처가 어디에 흩어져 있나

안드로이드 앱은 "픽스처"를 세 군데에 나눠 두었다. 웹앱은 이걸 **JSON 하나로 합친다**.

| 종류 | 위치 | 성격 | 삭제 예정 |
|---|---|---|---|
| 전용 픽스처 파일 3개 | `CalendarFixtures.kt` · `VisitFixtures.kt` · `RecordDetailFixtures.kt` | ViewModel과 Preview가 **함께** 쓴다. 서버가 안 붙은 화면이 실제로 이 값을 그린다 | 파일 주석에 "서버 연동 시 이 파일을 삭제한다" |
| ViewModel 안의 `internal val preview*` | `RecordViewModel.kt` · `BriefCardListViewModel.kt` · `ScheduleAddViewModel.kt` · `MyProfileViewModel.kt` · `HealthEditViewModel.kt` | Preview 전용. 서버 응답으로는 못 만드는 상태(작성 중·진료 전이 섞인 목록)를 보기 위해 남김 | `RecordViewModel`·`BriefCardListViewModel`은 "서버 연동 시 삭제" |
| 화면 파일 안의 `private val preview*` / 인라인 값 | `BriefCardScreen.kt` · `IntakeScreen.kt` · `HospitalPickScreen.kt` · `ClinicConfirmScreen.kt` · `HomePreviews.kt` | 그 화면 Preview에서만 쓴다 | — |

**정합성 규칙 — `RecordDetailFixturesTest.kt`가 지키는 것 전부(테스트 12개)**

문서 앞 판에는 두 개만 적혀 있었다. 실제로는 열둘이고, 웹 목데이터도 같은 규칙을 지켜야 화면이 시안대로 나온다.

| # | 테스트 이름 | 규칙 | 웹에서 깨지면 |
|---|---|---|---|
| 1 | `목록의 네 건이 모두 픽스처에 있다` | `previewRecordGroups`의 모든 `id`가 `recordDetailFixtures`에 있어야 한다 | 목록 줄을 눌렀는데 빈 화면 |
| 2 | `상세의 상태와 제목은 목록과 같다` | 목록의 `title`/`status` = 상세의 `title`/`status` | 목록과 상세에 다른 제목·배지 |
| 3 | `브리핑 카드 단계만 펼 수 있다` | `card != null`인 Block은 `title == "브리핑 카드"` **하나뿐**. 다른 Block은 전부 `card == null` | `진료 후 기록`에 `카드 전체 보기`가 뜸 |
| 4 | `접혀 있을 때는 앞 세 줄만 보인다` | `card-1` 카드 Block의 `items.size == 5`, `collapsedItemCount == 3`, 앞 3줄의 `key`가 `["부위","기간","양상"]` | 접힘 줄 수가 시안과 다름 |
| 5 | `알러지는 카드를 펼쳤을 때 경고 블록으로 나온다` | `card.allergies == ["페니실린"]`이고 `card.severity != null`. **알러지는 KV 줄이 아니라 경고 블록** | 알러지가 다른 값과 같은 무게로 묻힘 |
| 6 | `재방문까지 간 건은 배지와 병원 줄이 다르다` | `card-4`의 `badge == "진료 2회"`, `clinicLine == "서울OO병원 내과 · 09.12 초진 · 09.26 재방문"`, Block title이 `[진료 후 기록, 진료 후 기록, 브리핑 카드]` | 1j-3-R이 1j-3과 구별되지 않음 |
| 7 | `재방문 건에는 예정 단계가 없다` | `card-4`에 `Pending`이 **하나도 없다** | 이미 끝난 건에 "다음 진료 예약" 줄 |
| 8 | `진료 전 건은 첫 단계가 예정이다` | `card-2`의 `steps.first()`가 `Pending`이고 `Pending`이 **정확히 하나** | 최신순이 깨짐 |
| 9 | `작성 중인 건은 예정 한 단계뿐이다` | `card-3`은 `steps.size == 1`이고 그 하나가 `Pending` | 카드가 없는데 카드 블록이 뜸 |
| 10 | `재방문이 없는 건은 예정 단계가 없다` | `card-0`에 `Pending`이 없다 | 끝난 건에 예정 줄 |
| 11 | `타임라인에 증상 정리 단계를 넣지 않는다` | 모든 Block title의 집합이 **`{브리핑 카드, 진료 후 기록}` 딱 둘**. `"내가 입력한 증상"`은 없다 | 카드와 같은 값이 위아래로 두 번 |
| 12 | `타임라인은 최신 날짜가 위다` | `card-1`의 `at` 차례가 `["09.26 예정", "09.12 · 진료 후 기록", "09.04 작성"]` | 오래된 것이 위로 |

> 테스트 파일 주석이 이 파일을 서버 연동 뒤에도 남기는 이유를 밝힌다: *"`GET /api/visits/{id}`가 주는 것은 진료 후 기록 한 단계뿐이라 시안의 카드 펼침(1j-3-X)과 재방문 누적(1j-3-R)을 화면에서 볼 수 있는 자리가 Preview뿐이다."* → **웹앱에서도 29번(카드 펼침)을 그릴 재료는 목데이터에만 있다.**

---

## 2. `CalendarFixtures.kt` — 값 전부

파일 주석: *"캘린더 픽스처. 서버 연동 시 이 파일을 삭제한다. 월 화면과 일자 화면이 함께 쓴다."*

### 2.1 날짜 상수

| 상수 | 값 | 요일 | 소스 주석 |
|---|---|---|---|
| `VisitDate` | 2026-09-12 | 토 | "Figma가 그린 진료 예정일" |
| `CardDate` | 2026-09-04 | 금 | "Figma가 그린 카드 작성일. 1r-1-S가 이 날의 시트다" |
| `PastVisitDate` | 2026-09-02 | 수 | "이미 다녀온 진료일. 1r-2-A가 이 날의 화면이다. 시안에 날짜가 없어 9월 2일로 잡았다" |
| `RecordDays` | `setOf(2, 4)` | — | "기록이 있는 날. 2일에 다녀왔고 4일에 브리핑 카드를 썼다" |
| `PlannedDays` | `setOf(12, 26)` | — | "앞으로 일정이 있는 날. 12일 진료, 26일 재방문이다" |
| `previewCalendarState.today` | 2026-09-07 | 월 | Preview 고정 오늘 |

### 2.2 값 객체

**`fixtureCard: DayCard`**

| 필드 | 값 |
|---|---|
| `id` | `"card-1"` |
| `title` | `복부 통증 · 3주` |
| `writtenOn` | 2026-09-04 |
| `itemCount` | 5 |
| `visited` | false |

**`fixtureVisitedCard`** = 위와 동일 + `visited = true`. 주석: *"다녀온 뒤의 같은 카드. 같은 줄인데 배지만 '진료 완료'로 바뀐다."*

**`fixtureRecord: DayRecord`**

| 필드 | 값 |
|---|---|
| `id` | `"card-1"` |
| `title` | `진료 후 기록` |
| `meta` | `위염 초기 · 2주 약 · 09.26 재방문` |

**`fixtureNextEvent: DayNextEvent`** — 주석: *"시간이 아직 정해지지 않은 재방문. 확정하면 칩이 D-day로 바뀐다(1r-2-A2)."*

| 필드 | 값 |
|---|---|
| `chip` | `9월 26일 (토)` |
| `title` | `재방문 예정` |
| `on` | 2026-09-26 |
| `clinic` | `서울OO병원 내과` |
| `at` | null |

**`fixtureTodos: List<DayTodo>`** — 주석: *"Preview에서만 쓰는 진료 전 할 일. 서버에 붙은 뒤로 화면은 일정의 것을 그린다(#187)."*

| id | label | done |
|---|---|---|
| `todo-1` | `달라진 증상 있으면 카드 수정` | true |
| `todo-2` | `복용 중인 약 챙기기` | false |
| `todo-3` | `지난 검사 결과 사진 준비` | false |

**`schedulesOn(date, today)` — 날짜별 일정** (인자가 **둘**이다. `today`를 받아 `dday`를 그 자리에서 계산한다)

| 날짜 | id | title | time | detail |
|---|---|---|---|---|
| 2026-09-12 | `visit-1` | `서울OO병원 내과 재진` | `오전 10:30` | `복부 통증 브리핑 카드를 가져가요` |
| 2026-09-02 | `visit-0` | `서울OO병원 내과 초진` | `오전 9:30` | `복부 통증 브리핑 카드를 가져갔어요` |
| 그 밖 | — | (빈 목록) | | |

`dday`는 저장하지 않고 `ChronoUnit.DAYS.between(today, date)`로 매번 계산한다. **웹에서도 계산값이어야 한다.**
두 일정 모두 `followUp`을 넘기지 않아 기본값 `false`다 — 그래서 픽스처 안에서는 title에 박힌 `재진`/`초진` 글자와 `followUp` 플래그가 서로 어긋나 있다(실제 화면은 `home_schedule_title` = `%1$s %2$s`로 조립한다). **웹 목데이터는 title에 글자를 박지 말고 `followUp`으로 조립해야 한다.**

**`cardOn(date): DayCard?`** — 주석: *"그 날에 걸린 카드. 쓴 날과 가져갈 날 양쪽에서 같은 카드가 나온다."*

```
date == CardDate(09-04) || date == VisitDate(09-12) → fixtureCard
그 외 → null
```

→ **한 카드가 두 날짜에 걸린다.** 웹 데모에서도 카드 작성일(09-15)과 진료일(09-18) 양쪽에서 같은 `card-1`이 나와야 한다(시나리오 17번의 "카드만 있는 날 시트"와 21번의 "가져갈 브리핑 카드"가 같은 카드다).

**`initialState(): CalendarUiState`** — 월 화면의 시작값. `month = YearMonth.from(VisitDate)`(2026-09), `today = LocalDate.now()`, `selected = VisitDate`, `recordDays`/`plannedDays`/`schedules` 그대로.

> **`LocalDate.now()` 함정.** `initialState()`와 `dayState()`는 `LocalDate.now()`를 부른다. 그래서 `previewCalendarDayState`의 `dday`는 **Preview를 여는 날마다 달라진다**. 고정된 것은 `previewCalendarState`(today를 2026-09-07로 박아 넘김)뿐이다. `HomePreviews`가 `previewToday`를 고정한 것과 대비되는 자리고, **웹앱이 `today`를 목데이터에 박아야 하는 이유가 바로 이것이다**(문서 맨 위 규칙).

### 2.3 Preview 상태 4종 (Figma id 포함)

| Preview 변수 | Figma 화면 id | 무엇을 보는가 | 차이 |
|---|---|---|---|
| `previewCalendarDayState` | 1r-2 (`406:2514`) | 진료 전 일자 | 일정 + 가져갈 카드 + 진료 전 할 일 3개 + 빈 기록 |
| `previewCalendarDayVisitedState` | 1r-2-A (`1060:2879`) | 다녀온 날 | 할 일이 **사라지고** 기록 1건 + 다음 일정(시간 미정) |
| `previewCalendarDayConfirmedState` | 1r-2-A2 (`1060:2998`) | 다음 일정 확정 | `nextEvent`를 **통째로 새로 만든다** — `chip = "D-14"`, `title = "서울OO병원 내과 재방문"`, `on = 2026-09-26`, `at = "9월 26일 (토) 오전 10:30"`. **`clinic`을 넘기지 않아 null로 떨어진다**(확정 전 `fixtureNextEvent`에는 `서울OO병원 내과`가 있었다). 확정하면서 병원이 사라지는 것은 픽스처의 실수로 보이고, 웹에서는 `clinic`을 유지해야 한다 |
| `previewCalendarDayEditingState` | 1r-2-E | 편집 | `todoDraft = todos`. 할 일 줄에 ×가 붙고 하단에 `일정 삭제`가 선다 |
| `previewCalendarState` | 1r-1 (`406:2310`) | 월 화면 | `month = 2026-09`, `today = 2026-09-07`, `selected = 2026-09-12` |

`dayState(date)`의 분기 규칙(웹에서 그대로 옮길 것):

```
date == PastVisitDate → schedule + visitedCard + records[1] + nextEvent   (할 일 없음)
date == VisitDate     → schedule + card + todos[3]                        (기록 없음)
그 외                  → schedule=null, card=null                          (빈 일자)
```

주석이 못 박은 것: *"진료를 다녀왔는지로 화면이 갈린다(1r-2-A). 서버가 붙으면 그 날의 기록 유무가 이 판단을 대신한다."* → 웹에서는 `records.length > 0`이 `visited`다.

---

## 3. `VisitFixtures.kt` — 값 전부

파일 주석: *"진료 후 기록 플로우의 픽스처. 서버·AI 연동 시 이 파일을 삭제한다. Figma 1m·1p·1q-1의 내용을 그대로 옮겼다."*

**`previewVisitHeadline: VisitHeadline`**

| 필드 | 값 |
|---|---|
| `visitedOn` | 2026-09-12 |
| `clinic` | `서울OO병원 내과` |
| `cardTitle` | `복부 통증 · 3주` |
| `today` | true (기본값) |

**`PREVIEW_VISIT_NOTE`** (1p에 적힌 메모, 1q-1의 원문 인용과 **같은 문장이어야 한다**):

```
위염 초기라고 하셨고, 2주 약 먹고 다시 오라고 했어요. 커피랑 매운 거 줄이라고. 피검사는 다음에 결과 보자고 하셨음.
```

**`previewVisitRecord: VisitRecord`**

| 필드 | 값 |
|---|---|
| `id` | `"visit-1"` |
| `clinic` | `서울OO병원 내과` |
| `clinicLine` | `서울OO병원 내과 · 2026.09.12` |
| `memo` | 위 `PREVIEW_VISIT_NOTE` 그대로 |
| `classifiedCount` | 4 |

`items` (순서 그대로 — 1q-1이 그리는 차례):

| # | key | value | tone |
|---|---|---|---|
| 1 | `소견` | `위염 초기 소견` | DEFAULT |
| 2 | `검사` | `혈액검사 시행\n결과는 다음 방문 때 확인` | DEFAULT |
| 3 | `약` | `2주분 처방\n커피·매운 음식 줄이기` | DEFAULT |
| 4 | `재방문` | `2주 뒤 재방문 (9월 26일 전후)` | **LINK** (브랜드색) |

> 값에 `\n`이 들어 있다. 웹에서는 `white-space: pre-line`으로 두 줄을 살려야 시안과 같다.

---

## 4. `RecordDetailFixtures.kt` — 5건 전부

파일 주석: *"Figma 1j-3(`735:3829`)의 내용. 재방문 예정 → 진료 후 기록 → 브리핑 카드가 다 있는 건이다. **최신 날짜가 위로 온다.**"*
상수 `COLLAPSED_CARD_ITEMS = 3` — *"접혀 있을 때 보이는 줄 수. 시안이 부위·기간·양상 셋을 남긴다."*

### 4.1 공용 카드 재료

**`abdomenCardItems`** (1j-3의 카드 다섯 줄, 시안 `1038:2768`이 펼쳤을 때 보여주는 그대로)

| key | value | tone |
|---|---|---|
| `부위` | `복부 (명치 아래 · 배꼽 위)` | DEFAULT |
| `기간` | `3주 전 시작 · 최근 악화` | **LINK** |
| `양상` | `식후 30분 뒤 쓰림 · 밤에 심해짐` | DEFAULT |
| `복용약` | `혈압약 · 진통제(증상 시)` | DEFAULT |
| `기저질환` | `고혈압` | DEFAULT |

**`abdomenCard: RecordStepCard`** — `collapsedItemCount = 3`, `severity = LEVEL_3`, `allergies = ["페니실린"]`,
`questions = ["검사를 받아야 하나요?", "지금 진통제 계속 먹어도 되나요?", "어떤 증상이면 바로 다시 와야 하나요?"]`

### 4.2 `card-1` — `previewRecordDetail` (기본, 1j-3)

`title` `복부 통증 · 3주` · `status` CONFIRMED · `clinicLine` `서울OO병원 내과 · 09.12 진료`

| # | 단계 | `at` | 내용 |
|---|---|---|---|
| 1 | Pending | `09.26 예정` | message `다음 진료가 예약돼 있어요` / detail `9월 26일 (토) 오전 10:30` |
| 2 | Block | `09.12 · 진료 후 기록` | title `진료 후 기록` · 아래 4줄 |
| 3 | Block | `09.04 작성` | title `브리핑 카드` · `abdomenCardItems` + `abdomenCard` |

2번 Block의 items:

| key | value | tone |
|---|---|---|
| `소견` | `위염 초기 소견` | DEFAULT |
| `검사` | `혈액검사 시행 · 다음 방문 때 확인` | DEFAULT |
| `약` | `2주분 처방 · 커피·매운 음식 줄이기` | DEFAULT |
| `재방문` | `2주 뒤 (9월 26일 전후)` | **LINK** |

### 4.3 `card-2` — `beforeVisitRecordDetail` (카드만 만들고 진료 전)

`title` `두통 · 잦은 어지러움` · `status` BEFORE_VISIT · `clinicLine` `08.21 작성 · 병원 미정`

| # | 단계 | `at` | 내용 |
|---|---|---|---|
| 1 | Pending | `진료 예정` | `병원을 정하면 진료 일정이 여기에 표시돼요` (detail 없음) |
| 2 | Block | `08.21 작성` | title `브리핑 카드` |

카드 items:

| key | value |
|---|---|
| `부위` | `머리 (관자놀이 양쪽)` |
| `기간` | `2주 전 시작 · 잦아짐` |
| `양상` | `일어설 때 핑 돌고 욱신거림` |
| `복용약` | `혈압약` |
| `기저질환` | `고혈압` |

`RecordStepCard`: `severity = LEVEL_2`, `allergies = ["페니실린"]`,
`questions = ["혈압약과 관련이 있나요?", "검사를 받아야 하나요?", "어떤 증상이면 바로 다시 와야 하나요?"]`

### 4.4 `card-3` — `draftRecordDetail` (문답 중단)

`title` `무릎 통증` · `status` DRAFT · `clinicLine` `오늘 작성 중 · 4단계 중 2단계`
단계 **하나뿐**: Pending `카드 예정` / `증상 정리를 마치면 브리핑 카드가 만들어져요`

### 4.5 `card-0` — `closedRecordDetail` (재방문 없이 끝)

`title` `목 통증 · 삼킬 때 아픔` · `status` CONFIRMED · `clinicLine` `OO이비인후과 · 07.18 진료`
**Pending 단계가 없다.**

| 단계 | `at` | items |
|---|---|---|
| Block | `07.18 · 진료 후 기록` | `소견` `인후염` / `약` `5일분 처방` / `재방문` `없음 · 안 나으면 다시 오기` |
| Block | `07.17 작성` | `부위` `목 (삼킬 때 안쪽)` / `기간` `3일 전 시작` / `양상` `삼킬 때 찌르듯 아픔` / `복용약` `없음` / `기저질환` `고혈압` |

`RecordStepCard`: `severity = LEVEL_2`, `allergies = ["페니실린"]`, `questions = ["며칠이면 나아요?", "항생제를 꼭 먹어야 하나요?"]`

### 4.6 `card-4` — `revisitedRecordDetail` (1j-3-R `1039:2799`)

`title` `복부 통증 · 3주` · `status` CONFIRMED · **`badge` `진료 2회`** · `clinicLine` `서울OO병원 내과 · 09.12 초진 · 09.26 재방문`
**Pending 단계가 없고 Block이 셋이다.** 목록(1j-1)에 대응하는 줄이 없는 건 — 1j-3-R을 화면에서 확인할 자리가 필요해서 넣었다.

| 단계 | `at` | items |
|---|---|---|
| Block | `09.26 · 진료 후 기록 · 재방문` | `소견` `염증 호전 · 경과 양호` / `검사` `혈액검사 정상 범위` / `약` `1주분 추가 처방` / `재방문` `증상 재발 시에만` |
| Block | `09.12 · 진료 후 기록 · 초진` | `소견` `위염 초기 소견` / `검사` `혈액검사 시행 · 다음 방문 때 확인` / `약` `2주분 처방\n커피·매운 음식 줄이기` / `재방문` `2주 뒤 (9월 26일 전후)` (LINK) |
| Block | `09.04 작성` | `브리핑 카드` — `abdomenCardItems` + `abdomenCard` |

---

## 5. `HomePreviews.kt`

`previewToday = 2026-09-07` — 주석: *"`LocalDate.now()`를 쓰면 D-day가 Preview를 여는 날마다 달라져 Figma와 비교할 수 없다."* **웹앱도 이 이유로 today를 고정한다.**

**`previewContent: HomeUiState.Content`**

| 필드 | 값 |
|---|---|
| `userInitial` | `김` |
| `hasUnreadNotification` | true |
| `todayLine` | `HomeTodayLine.NextInDays(days = 2, on = 2026-09-16, clinic = "서울OO병원 내과")` |
| `resume` | `HomeResume(intakeId = "intake-1", symptomTitle = "복부 통증", step = SYMPTOM_CHAT)` |

`savedCards`:

| id | title | visited | writtenOn | clinic |
|---|---|---|---|---|
| `card-1` | `복부 통증 · 3주` | true | 2026-09-04 | `서울OO병원 내과` |
| `card-2` | `두통 · 잦은 어지러움` | false | 2026-08-21 | null |

`upcoming`: `HomeSchedule(id = "visit-1", title = "서울OO병원 내과 재진", date = 2026-09-12, time = "오전 10:30")` — `followUp`은 넘기지 않아 기본값 `false`.

> **이 픽스처는 내부적으로 날짜가 어긋나 있다.** `previewToday = 09-07`인데 `NextInDays(days = 2, on = 09-16)`는 9일 차이고, `upcoming`의 일정일은 또 09-12(5일 차)다. 셋이 서로 맞지 않는다. Figma 프레임을 눈으로 재현하려고 각 값을 따로 박은 결과이고 **규칙이 아니다.** 웹 목데이터는 `today` 하나에서 `days`를 계산해야 한다 — 그대로 옮기면 "2일 남았어요" 아래에 D-5 일정이 서는 화면이 나온다.

**Preview 4종** — 붙은 애노테이션이 서로 다르다.

| Preview | 애노테이션 | Figma id | 상태 |
|---|---|---|---|
| `HomeScreenContentPreview` | `@MedicalMateScreenPreviews` (**4뷰포트**) | 1n-1 | 위 `previewContent` |
| `HomeScreenEmptyPreview` | `@Preview` 단일 390×844 | **1n-2 기록 없음** | `previewContent.copy(todayLine = FirstVisit, resume = null, savedCards = [], upcoming = [])` |
| `HomeScreenFailedPreview` | `@Preview` 단일 390×844 | (시안 없음) | `HomeUiState.Failed` — Preview 이름이 `"불러오지 못함"` |
| `StartIntakeButtonPreview` | `@Preview` 390(높이 없음) | — | 시작 버튼 + `home_retry` 버튼만. 주석: *"마이크 아이콘과 라벨 간격이 문서의 gap 6인지 확인한다"* |

> **빠진 상태 변이**: `HomeUiState`는 `Loading | Content | Failed` 셋인데 **`Loading`에는 Preview가 없다.** 웹앱이 홈 스켈레톤을 그리려면 시안이 아니라 `MedicalMateLoadingSkeleton`(접근성 문구 `카드를 불러오는 중`, §13.1)에서 가져와야 한다. 빈 상태도 별도 `HomeUiState`가 아니라 `Content`의 한 갈래다 — `savedCards`와 `upcoming`이 비면 빈 화면이 된다(`HomeUiState.Content` 주석: *"별도 상태로 두지 않는 이유는 헤더와 오늘의 한 줄, 시작 버튼이 두 화면에서 같기 때문이다"*). **웹에서도 `home.empty`를 별도 타입으로 만들지 말 것.**

---

## 6. `CalendarDayPreviews.kt`

파일이 존재하는 이유가 주석에 있다: *"`CalendarDayScreen`에서 나눴다. 상태가 넷(진료 전 · 편집 · 다녀온 날 · 다음 일정 확정)이 되면서 한 파일에 함수가 열둘이 됐고 detekt의 파일당 상한에 닿았다."*

| Preview 함수 | Figma id | 상태 변수 |
|---|---|---|
| `CalendarDayScreenPreview` | 1r-2 | `previewCalendarDayState` |
| `CalendarDayVisitedPreview` | **1r-2-A** | `previewCalendarDayVisitedState` |
| `CalendarDayEditingPreview` | **1r-2-E** | `previewCalendarDayEditingState` |
| `CalendarDayConfirmedPreview` | **1r-2-A2** | `previewCalendarDayConfirmedState` |

---

## 7. 그 밖의 `@Preview` 픽스처 — 값 전부

### 7.1 `BriefCardScreen.kt` · `previewBriefCard` (Figma 1e-1 `404:1679`)

주석: *"Preview용 카드. AI가 넘겨줄 모양을 Figma 1e-1의 내용으로 채운 것이다."*

| 필드 | 값 |
|---|---|
| `id` | `card-1` |
| `title` | `복부 통증 · 3주` |
| `status` | `BEFORE_VISIT` |
| `patientLine` | **`김OO · 32세 여 · 2026.09.04 작성`** |
| `severity` | `LEVEL_3` |
| `allergies` | `["페니실린"]` |
| `hospital` | `BriefCardHospital(name = "서울OO병원 내과")` (주소 없음) |

`items`:

| key | value | emphasized |
|---|---|---|
| `부위` | `복부 (명치 아래 · 배꼽 위)` | false |
| `기간` | `3주 전 시작 · 최근 악화` | **true** |
| `양상` | `식후 30분 뒤 쓰림 · 밤에 심해짐` | false |
| `복용약` | `혈압약 · 진통제(증상 시)` | false |
| `기저질환` | `고혈압` | false |

`questions`: `검사를 받아야 하나요?` / `지금 진통제 계속 먹어도 되나요?` / `어떤 증상이면 바로 다시 와야 하나요?`

Preview 2종 — 읽기(1e-1), 편집(1e-1-E `597:4804`, `draft = BriefCardDraft.of(card)`).

> **강조는 카드마다 하나를 넘기지 않는다**(`BriefCardItem.emphasized` 주석: *"전부 강조하면 아무것도 강조되지 않는다"*). 웹 목데이터도 `emphasized: true`가 배열에 하나만 있어야 한다.

### 7.2 `IntakeScreen.kt` · `previewChatState` (Figma 1c-1)

`step = SYMPTOM_CHAT`, `bodyPart = "복부"`

| id | sender | text |
|---|---|---|
| 0 | AI | `복부가 불편하시군요. 언제부터 그러셨어요? 정확하지 않아도 괜찮아요.` |
| 1 | PATIENT | `한 3주쯤 됐어요. 요즘 더 아파요.` |
| 2 | AI | `3주 전부터 점점 심해지셨네요. 어떨 때 더 아프세요?` |
| 3 | PATIENT | `밥 먹고 30분쯤 지나면 명치가 쓰려요.` |
| 4 | AI | `명치가 얼마나 아프세요?` |

Preview 파생 6종:

| Preview | 상태 |
|---|---|
| `IntakeChatPreview` | 위 그대로(2/4) |
| `IntakeSeverityPreview` | `step = SEVERITY` (3/4) |
| `IntakeQuestionsPreview` | `step = QUESTIONS` + `questions = ["검사를 받아야 하나요?", "지금 진통제 계속 먹어도 되나요?", "어떤 증상이면 바로 다시 와야 하나요?"]` |
| `IntakeBodyAnchorPreview` | `IntakeUiState(step = BODY_PART)` — 빈 인체도 |
| `IntakeBodyZonePreview` | `focus = BodyMapSelection("ANC:014", side = LEFT)`, `selection = BodyMapSelection("ANC:014", "SUR:091", LEFT)` — 주석: *"무릎을 짚기 직전. 다리 앵커를 왼쪽으로 골라 확대한 상태다"* |
| `IntakeBodyListPreview` | `bodyMap = BodyMapUiState(byList = true)` — 목록에서 고르기 |

### 7.3 `HospitalPickScreen.kt` · `previewHospitals` (Figma 1m `489:5447` / 1m-B `1041:3687`)

주석: *"Preview에서만 쓰는 결과. 서버가 이름만 주므로 이름뿐이다."*

`query = "서울OO병원"`, `selected = 첫 줄`

1. `서울OO병원 내과`
2. `서울OO병원 이비인후과`
3. `OO이비인후과의원`
4. `OO정형외과의원`

### 7.4 `ClinicConfirmScreen.kt` (Figma 1m-12 `1576:8517`)

| 인자 | 값 |
|---|---|
| `clinic` | `서울OO병원 내과` |
| `address` | **`서울 관악구 남부순환로 1820, 3층`** |
| `scheduledOn` | 2026-09-12 |

### 7.5 `ScheduleAddViewModel.kt` · `previewScheduleAddState` (Figma 1r-4-C)

| 필드 | 값 |
|---|---|
| `hospital` | `서울OO병원 내과` |
| `date` | 2026-09-26 |
| `time` | 10:30 |

`cards`:

| id | title | meta | picked |
|---|---|---|---|
| `card-1` | `복부 통증 · 3주` | `09.04 작성 · 서울OO병원 내과` | **true** |
| `card-2` | `두통 · 잦은 어지러움` | `08.21 작성 · 병원 미정` | false |

`todos`: `todo-1` `달라진 증상 있으면 카드 수정` (done) · `todo-2` `복용 중인 약 챙기기`

병원 미정 문구는 상수다 — `CLINIC_UNSET = "병원 미정"`, meta 포맷 `"MM.dd 작성 · {병원|병원 미정}"`.

### 7.6 `RecordViewModel.kt` · `previewRecordGroups` (Figma 1j-1 `406:2569`)

주석: *"서버 응답으로는 진료를 다녀온 건만 와서 상태가 하나다. 작성 중·진료 전까지 섞인 목록을 볼 수 있는 자리가 Preview뿐이라 남긴다."*

**2026년 9월**

| id | title | status | meta | detail / resumeLabel |
|---|---|---|---|---|
| `card-3` | `무릎 통증` | DRAFT | `오늘 · 증상 문답 4단계 중 2단계` | resumeLabel `이어서 정리하기` |
| `card-2` | `두통 · 잦은 어지러움` | BEFORE_VISIT | `08.21 작성 · 병원 미정` | detail `묻고 싶은 것 3개 · 통증 2단계` |
| `card-1` | `복부 통증 · 3주` | CONFIRMED | `09.12 진료 · 서울OO병원 내과` | detail `위염 초기 · 2주 약 · 09.26 재방문` |

**2026년 7월**

| id | title | status | meta | detail |
|---|---|---|---|---|
| `card-0` | `목 통증 · 삼킬 때 아픔` | CONFIRMED | `07.18 진료 · OO이비인후과` | `인후염 · 5일 약 · 재방문 없음` |

편집 Preview(1j-1-D2)는 `selectedIds = setOf("card-3", "card-1")` — 두 건 선택.

### 7.7 `BriefCardListViewModel.kt` · `previewBriefCardGroups` (Figma 1j-4 `1122:4830`)

주석: *"1j-1과 같은 카드인데 보조 줄이 다르다. 기록은 진료에서 들은 것을 적고 여기는 카드가 담은 항목을 적는다."*

**2026년 9월**

| id | title | status | meta | detail / resumeLabel |
|---|---|---|---|---|
| `card-1` | `복부 통증 · 3주` | CONFIRMED | `09.04 작성 · 서울OO병원 내과` | `부위 · 기간 · 양상 · 복용약 · 기저질환` |
| `card-3` | `무릎 통증` | DRAFT | `오늘 · 4단계 중 2단계` | resumeLabel `이어서 정리하기` |

**2026년 8월**

| id | title | status | meta | detail |
|---|---|---|---|---|
| `card-2` | `두통 · 잦은 어지러움` | BEFORE_VISIT | `08.21 작성 · 병원 미정` | `부위 · 기간 · 양상 · 질문 3개` |

편집 Preview(1j-4-D2)는 `selectedIds = setOf("card-1", "card-2")`. **기록은 "건", 카드는 "장"으로 센다**(strings.xml 주석).

### 7.8 `MyProfileViewModel.kt` · `previewMyProfile` (Figma 1s-1 `407:2375`)

| 필드 | 값 |
|---|---|
| `profile.initial` | `김` |
| `profile.name` | `김OO` |
| `profile.birthYear` | 1994 → 화면 `1994년생` |
| `profile.sex` | FEMALE → 화면 `여` |
| `health.medications` | `["혈압약", "진통제(증상 시)"]` |
| `health.conditions` | `["고혈압"]` |
| `health.allergies` | `["페니실린"]` |
| `settings` 기본값 | `VISIT_REMINDER = true`, `CARD_AUTO_SAVE = true`, `HANDOFF_BRIGHTNESS = false` |

### 7.9 `HealthEditViewModel.kt` · `previewHealthEdit` (Figma 1s-2 `407:2650`)

`MEDICATIONS = {혈압약, 진통제}` · `CONDITIONS = {고혈압}` · `ALLERGIES = {페니실린}`

### 7.10 `ProfileSetupScreen.kt` Preview (Figma 1b-1)

`step = MEDICATIONS`, `answers[MEDICATIONS].chosen = {혈압약, 진통제}`

### 7.11 신상정보 칩 목록 (strings.xml `string-array`) — 전부

| 단계 | 칩 |
|---|---|
| 복용 중인 약 | `혈압약` `당뇨약` `진통제` `위장약` `영양제` `한약` `피임약` `수면제` |
| 기저질환 | `고혈압` `당뇨` `고지혈증` `천식` `갑상선` `위염·역류` `관절염` `우울·불안` |
| 알러지 | `페니실린` `아스피린` `조개·갑각류` `땅콩` `계란` `꽃가루` `먼지·진드기` |

데모 시나리오 5·6·7번이 여기서 `혈압약` `진통제` `고혈압` `페니실린`을 탭한다 — **네 칩 모두 기본 목록에 있으므로 "직접 입력" 분기는 데모에서 필요 없다.**

---

## 7-A. 화면 Preview 전수 목록 — 어느 상태 변이가 실제로 그려져 있나

앞 판 문서는 `HomePreviews` · `CalendarDayPreviews` · §7의 픽스처만 훑어서 **다른 화면의 상태 변이가 빠져 있었다.** 화면 단위 `@Preview` 함수를 전부 세면 **22개 파일 43개**다. 웹앱이 "이 상태가 시안에 있나"를 물을 때 여기를 본다.

| 파일 | Preview | 상태 | 뷰포트 |
|---|---|---|---|
| `IntakeScreen.kt` | `IntakeChatPreview` | `previewChatState` (2/4) | 4종 |
| | `IntakeSeverityPreview` | `.copy(step = SEVERITY)` | 4종 |
| | `IntakeQuestionsPreview` | `.copy(step = QUESTIONS, questions = [3개])` | 4종 |
| | `IntakeBodyAnchorPreview` | `IntakeUiState(step = BODY_PART)` — 빈 인체도 | 4종 |
| | `IntakeBodyZonePreview` | 다리 앵커 확대 (`ANC:014` / `SUR:091` / LEFT) | 4종 |
| | `IntakeBodyListPreview` | `bodyMap.byList = true` — 목록에서 고르기 | 4종 |
| `LoginScreen.kt` | `LoginScreenIdlePreview` | `LoginUiState.Idle` | **4종** |
| | `LoginScreenExchangingPreview` | `ExchangingToken` — **로딩** | 390 |
| | `LoginScreenNetworkFailedPreview` | `Failed(LoginFailure.NETWORK)` | 390 |
| | `LoginScreenServerFailedPreview` | `Failed(LoginFailure.SERVER)` | 390 |
| | `LoginScreenRestoreFailedPreview` | `Idle` + `restoreFailed = true` | 390 |
| `OnboardingScreen.kt` | 4개 | 온보딩 4장 | — |
| `HomePreviews.kt` | 4개 | §5 | 혼합 |
| `CalendarDayPreviews.kt` | 4개 | §6 | 4종 |
| `RecordScreen.kt` | `RecordScreenPreview` | `Content(groups = previewRecordGroups)` | 4종 |
| | `RecordScreenEditingPreview` | **1j-1-D2** `selectedIds = {card-3, card-1}` — **편집** | 4종 |
| | `RecordScreenEmptyPreview` | `Content(groups = [])` — **빈 상태** | 4종 |
| `RecordDetailScreen.kt` | `RecordDetailScreenPreview` | `card-1` · `expandedSteps = {}` (접힘) | 4종 |
| | `RecordDetailExpandedPreview` | **1j-3-X** `expandedSteps = setOf(2)` — **펼침** | 4종 |
| | `RecordDetailRevisitedPreview` | **1j-3-R** `card-4` | 4종 |
| `BriefCardListScreen.kt` | `BriefCardListScreenPreview` | `previewBriefCardGroups` | 4종 |
| | `BriefCardListEditingPreview` | **1j-4-D2** `selectedIds = {card-1, card-2}` — **편집** | 4종 |
| `BriefCardScreen.kt` | `BriefCardScreenPreview` | 읽기 (1e-1) | 4종 |
| | `BriefCardEditingPreview` | **1e-1-E** `draft = BriefCardDraft.of(card)` — **편집** | 4종 |
| `VisitRecordScreen.kt` | `VisitRecordScreenPreview` | `Content(record = previewVisitRecord)` | 4종 |
| | `VisitRecordScreenEditingPreview` | **1q-1-E** `draft = VisitRecordDraft.of(record)` — **편집** | 4종 |
| `VisitNoteScreen.kt` · `VisitDetailScreen.kt` · `HospitalPickScreen.kt` · `ClinicConfirmScreen.kt` · `ScheduleAddScreen.kt` · `CalendarMonthScreen.kt` · `IntakeDoneScreen.kt` · `ProfileSetupScreen.kt` · `ProfileCompleteScreen.kt` · `MyProfileScreen.kt` · `HealthEditScreen.kt` · `SplashScreen.kt` | 각 1개 | 기본 상태만 | 대개 4종 |

**여기서 읽어야 할 것 셋:**

1. **편집 모드는 네 화면에 Preview가 있다** — 기록 목록(1j-1-D2) · 카드 목록(1j-4-D2) · 브리핑 카드(1e-1-E) · 진료 후 기록(1q-1-E). 넷 다 **"사본 존재"로 편집을 표현한다**(§16-9). 데모는 편집을 안 보여주지만(시나리오 금지 항목) 웹 컴포넌트는 이 네 곳에서 같은 패턴을 써야 한다.
2. **빈 상태 Preview는 세 곳뿐이다** — 홈(1n-2) · 기록 탭(`RecordScreenEmptyPreview`) · 병원 찾기 입력 전. 카드 목록·일자 화면의 빈 상태는 **Preview 없이 문자열만 있다**(§13.2). 웹에서 그 둘을 그릴 때 참고할 프레임이 없다는 뜻이다.
3. **로딩·실패 Preview는 로그인 화면에만 제대로 있다**(4갈래). 홈은 `Failed`만 있고 `Loading`이 없으며, 나머지 화면은 로딩·실패 Preview가 아예 없다. §13.1·13.3의 문자열 표가 그 자리를 대신하는 유일한 근거다.

---

## 8. `MedicalMateScreenPreviews.kt` — 뷰포트 매트릭스

화면 Preview에 붙는 공용 애노테이션. **웹앱의 반응형 체크 기준을 여기서 그대로 가져온다.**

| 이름 | width | height | fontScale |
|---|---|---|---|
| `390 · 기준` | 390 | 844 | 1 |
| `360 · 좁은 기기` | 360 | 780 | 1 |
| `412 · 넓은 기기` | 412 | 892 | 1 |
| `360 · 글꼴 200%` | 360 | **1400** | **2** |

주석이 밝힌 근거: *"360은 갤럭시 A 계열… 412는 픽셀 계열이다. 그 사이(390·393·411)는 두 끝이 통과하면 함께 통과한다. 글꼴 배율은 200%만 본다. 접근성 설정의 상한이고, 여기서 견디면 중간 배율은 문제가 없다."*

**웹 대응** — 360 / 390 / 412 세 폭과 `font-size: 200%`(루트 폰트 32px 상당)에서 깨지지 않게 잡는다. 컴포넌트 단위 Preview에는 이 애노테이션을 붙이지 않는다(*"조각 하나를 네 번 그리면 확인할 것이 늘지 않는다"*) — 웹 Storybook도 같은 규칙으로 가면 된다.

---

## 9. 디자인 시스템 컴포넌트 Preview의 샘플 문구 (Storybook 이식용)

`core/designsystem/component/*Previews.kt`에 들어 있는 값이다. 데모에는 안 쓰지만 웹 컴포넌트 카탈로그를 만들 때 그대로 복사하면 시안과 같은 그림이 나온다.

### `ContentPreviews.kt`

| 컴포넌트 | 샘플 |
|---|---|
| `MedicalMateCard` | `카드 본문이 들어간다. 최소 높이 116을 지킨다.` |
| `MedicalMateQuestionList` | title `환자가 묻고 싶어 하는 것` + 질문 3개(브리핑 카드와 동일) |
| `MedicalMateKvRow` | `기간` / `3주 전 시작` · `가장 아픈 곳` / `오른쪽 손가락 관절` · `복용 약` / `타이레놀 500mg` |
| `MedicalMateListRow` | `손가락 경직·부종` `06.20 작성` / `재방문·검사 결과` `09.01 작성` badge `이어서 작성` / `누를 수 없는 행` `chevron 없음` |
| `MedicalMateDoctorRow` | `김민수` `정형외과` `오늘 18:00까지` `진료 중` · `이서연` `내과` `내일 09:00 진료 시작` `진료 종료` |
| `MedicalMateBubble` | AI `언제부터 그러셨어요? 정확하지 않아도 괜찮아요.` / 환자 `한 3주쯤 됐어요. 요즘 더 아파요.` |
| `MedicalMateCalloutEdit` | fieldLabel `기간`, summary `3주 전 시작 · 최근 악화`, quoteLabel `내가 말한 것`, originalQuote `"한 3주쯤 됐나... 요즘 더 아파요"`, editContentDescription `기간 수정`, editedBadge `직접 고침` |
| `MedicalMateAvatar` | `서연` / `김`(DOCTOR) |
| `MedicalMateSectionHeader` | `저장된 브리핑 카드` + `전체 보기` |

### `FeedbackPreviews.kt`

| 컴포넌트 | 샘플 |
|---|---|
| `MedicalMateNotice` | `9/3 검사 결과 확인일이에요` · `브리핑 카드를 저장했어요` / `홈에서 다시 열 수 있어요` · `아직 답하지 않은 항목이 있어요` / `빈 칸이 있으면 의사가 물어볼 내용이 늘어나요` · `저장하지 못했어요` / `인터넷 연결을 확인해주세요` · `다음 진료가 예약돼 있어요` / `9월 26일 (토) 오전 10:30` |
| `MedicalMateToast` | `카드를 삭제했어요` + action `실행 취소`. 두 줄 초과 시 잘림 확인용 긴 문장 있음 |
| `MedicalMateEmptyState` | `아직 저장된 카드가 없어요` / `진료 준비를 시작하면 여기에 쌓여요` / `새 진료 준비하기` · `연결이 끊겼어요` / `다시 연결되면 이어서 저장할게요` / `다시 시도` (note `작성하던 내용은 그대로 있어요`) · `마이크를 쓸 수 없어요` / `설정에서 권한을 켜거나 직접 입력할 수 있어요` / `직접 입력하기` |
| `MedicalMateLoadingSpinner` | message `증상을 정리하고 있어요` |
| `MedicalMateLoadingSkeleton` | loadingDescription `카드를 불러오는 중` |
| `MedicalMateDialog` | `정말 탈퇴하시겠어요?` / `저장된 브리핑 카드와 진료 기록이 모두 삭제되고 되돌릴 수 없어요` / `탈퇴하기` / `취소` |

### `AddedComponentPreviews.kt`

| 컴포넌트 | 샘플 |
|---|---|
| `MedicalMateAddRow` | `할 일 추가` · `질문 추가` |
| `MedicalMateSelectBar` | `2건 선택됨` |
| `MedicalMateTodoRow` | `달라진 증상 있으면 카드 수정`(체크됨) · `복용 중인 약 사진 찍기` · `편집 모드에서는 지울 수 있다` + 삭제 |
| `MedicalMatePickerField` | placeholder `병원을 골라주세요`, value `서울OO병원 내과` |
| `MedicalMateCardPick` | `복부 통증 · 3주` / `09.04 작성 · 서울OO병원 내과` · `두통 · 잦은 어지러움` / `08.21 작성 · 카드만 작성됨` |
| `MedicalMateHospitalCard` | `서울OO병원 내과` / `서울 관악구 남부순환로 1820, 3층` + 칩 `09.12 진료`(PAST) `09.26 재방문`(PLANNED) |

### `InputPreviews.kt` · `InputControlPreviews.kt` · `ActionPreviews.kt` · `NavigationPreviews.kt`

| 컴포넌트 | 샘플 |
|---|---|
| `MedicalMateTextField` | label `복용 중인 약`, placeholder `약 이름을 적어주세요`, helper `여러 개면 쉼표로 구분해요`, value `타이레놀 500mg`, error `약 이름을 두 글자 이상 적어주세요`, disabled value `수정할 수 없어요` |
| `MedicalMateTextArea` | placeholder `의사에게 더 말하고 싶은 내용이 있으면 적어주세요`, value `3주 전부터 오른쪽 손가락이 아침에 잘 안 펴져요. 요즘은 저녁에도 그래요.` |
| `MedicalMateCheckbox` | `이용약관에 동의해요` · `마케팅 수신에 동의해요` · `선택할 수 없어요` |
| `MedicalMateRadio` | `오른쪽` · `왼쪽` |
| `MedicalMateToggle` | `복약 알림 받기` · `가족에게 공유하기` |
| `MedicalMateSegmented` | `진료 전` / `진료 후` · `전체` / `확정` / `작성 중` / `지난 것` |
| `MedicalMateChip` | `두통`(미선택) · `복통`(선택) · `발열`(비활성) |
| `MedicalMateButton` | `증상 정리 시작 (사이즈)` · `취소` / `확인` |
| `MedicalMateNavBar` | `증상 정리` · `브리핑 카드` + `저장` · `leading 없음` · 말줄임 확인용 긴 제목 |
| `MedicalMateBottomSheet` | `이어서 작성` / `새로 시작` · `확인` / `취소` · `닫기` · 스크림 50% |
| `MedicalMateTooltipBubble` | `여기에 짧은 설명이 들어갑니다` · `꼬리를 왼쪽으로` |
| `MedicalMateVoiceInput` | 상태 4종 문구는 §13 표 참고 |

---

## 10. 픽스처가 채우는 상태 클래스 — 전 필드 TypeScript 대응표

웹앱에서 그대로 `types.ts`로 옮길 수 있게 **모든 필드**를 적었다. `?`는 nullable/optional이다.

### 10.1 `CalendarUiState` (Figma 1r-1 `406:2310`)

| 필드 | Kotlin | TypeScript | 기본값 | 뜻 |
|---|---|---|---|---|
| `month` | `YearMonth` | `string` (`"2026-09"`) | — | 보고 있는 달 |
| `today` | `LocalDate` | `string` (ISO) | — | 오늘. 옅은 테두리 |
| `selected` | `LocalDate` | `string` | — | 고른 날. 채움 |
| `recordDays` | `Set<Int>` | `number[]` | `[]` | 기록 있는 **일자 숫자**. 채운 점 |
| `plannedDays` | `Set<Int>` | `number[]` | `[]` | 앞으로 일정 있는 일자. 빈 원 |
| `schedules` | `List<CalendarSchedule>` | `CalendarSchedule[]` | `[]` | 고른 날의 일정만 |
| `cardSheet` | `DayCard?` | `DayCard \| null` | `null` | 있으면 1r-1-S 시트가 떠 있음 |
| `appointments` | `List<Appointment>` | `Appointment[]` | `[]` | 그 달 원본. 날을 바꿔도 재요청 안 하려고 보유 |
| `cards` | `List<CardListItem>` | `CardListItem[]` | `[]` | 카드 목록 원본 |

### 10.2 `CalendarSchedule`

| 필드 | Kotlin | TS | 기본 | 뜻 |
|---|---|---|---|---|
| `id` | `String` | `string` | — | |
| `title` | `String` | `string` | — | 병원명(+진료과+목적) |
| `time` | `String?` | `string \| null` | — | `"오전 10:30"`. null이면 `시간 미정` |
| `detail` | `String` | `string` | — | 카드 제목. 화면이 `%s 브리핑 카드를 가져가요`로 감쌈 |
| `dday` | `Long` | `number` | — | `today`와의 일수 차. 음수면 표시 감춤 |
| `followUp` | `Boolean` | `boolean` | `false` | true면 `재진`, false면 `초진` |

### 10.3 `CalendarDayUiState` (1r-2 / 1r-2-A / 1r-2-A2 / 1r-2-E)

| 필드 | Kotlin | TS | 기본 | 뜻 |
|---|---|---|---|---|
| `date` | `LocalDate` | `string` | — | |
| `schedule` | `CalendarSchedule?` | `… \| null` | — | |
| `card` | `DayCard?` | `… \| null` | — | 가져갈 브리핑 카드 |
| `todos` | `List<DayTodo>` | `DayTodo[]` | `[]` | 진료 전 할 일 |
| `records` | `List<DayRecord>` | `DayRecord[]` | `[]` | 그 날 기록. **하루 두 번 진료면 2건**(#235) |
| `nextEvent` | `DayNextEvent?` | `… \| null` | `null` | |
| `todoDraft` | `List<DayTodo>?` | `… \| null` | `null` | **있으면 편집 중** |
| `deleteRequested` | `Boolean` | `boolean` | `false` | 일정 삭제 대화상자 |
| *(파생)* `visited` | `Boolean` | getter | — | `records.isNotEmpty()` |
| *(파생)* `editing` | `Boolean` | getter | — | `todoDraft != null` |
| *(파생)* `shownTodos` | `List<DayTodo>` | getter | — | `todoDraft ?: todos` |
| *(파생)* `changed` | `Boolean` | getter | — | `todoDraft != null && todoDraft.size != todos.size` — **체크는 세지 않는다** |

### 10.4 `DayCard`

| 필드 | Kotlin | TS | 기본 | 뜻 |
|---|---|---|---|---|
| `id` | `String` | `string` | — | 서버 카드 id |
| `title` | `String` | `string` | — | |
| `writtenOn` | `LocalDate?` | `string \| null` | `null` | |
| `itemCount` | `Int?` | `number \| null` | `null` | 상세를 읽어야 나옴 |
| `visited` | `Boolean` | `boolean` | `false` | **배지 기준은 `status`가 아니라 이 값** |
| `clinicAddress` | `String?` | `string \| null` | `null` | 1m-12가 이름 아래 적음 |
| `scheduledOn` | `LocalDate?` | `string \| null` | `null` | 있으면 시트가 "만들기"→"보러가기" |

### 10.5 `DayTodo` / `DayRecord` / `DayNextEvent`

`DayTodo`: `id: string` · `label: string` · `done: boolean`
`DayRecord`: `id: string` · `title: string` · `meta: string`

`DayNextEvent`:

| 필드 | Kotlin | TS | 기본 | 뜻 |
|---|---|---|---|---|
| `chip` | `String` | `string` | — | 확정 전 `9월 26일 (토)`, 확정 후 `D-14` |
| `title` | `String` | `string` | — | |
| `cardId` | `String?` | `string \| null` | `null` | 확정하러 갈 때 미리 고를 카드 |
| `followUp` | `Boolean` | `boolean` | `false` | |
| `on` | `LocalDate` | `string` | — | **이 화면 날짜가 아니다** |
| `at` | `String?` | `string \| null` | `null` | **null이면 시간 미정 → 확정 버튼** |
| `appointmentId` | `Long?` | `number \| null` | `null` | 있으면 수정, 없으면 새로 만들기 |
| `clinic` | `String?` | `string \| null` | `null` | |

### 10.6 `VisitRecord` / `VisitRecordItem` / `VisitHeadline` / `VisitNoteUiState`

**`VisitRecord`**

| 필드 | Kotlin | TS | 기본 |
|---|---|---|---|
| `id` | `String` | `string` | — |
| `clinic` | `String?` | `string \| null` | — |
| `clinicLine` | `String` | `string` | — |
| `items` | `List<VisitRecordItem>` | `VisitRecordItem[]` | — |
| `memo` | `String` | `string` | — |
| `classifiedCount` | `Int?` | `number \| null` | `null` |
| `patientNotes` | `List<String>` | `string[]` | `[]` |
| `followUp` | `VisitFollowUp?` | `{date, text?, approximate} \| null` | `null` |

**`VisitRecordItem`**: `key: string` · `value: string` · `tone: "DEFAULT" | "LINK"` (기본 DEFAULT) · `axis: string` (기본 `""`)

**`VisitHeadline`**: `visitedOn: string` · `clinic?: string` · `cardTitle?: string` · `today: boolean` (기본 true)

**`VisitNoteUiState`**: `visit: VisitHeadline` · `note: string`(기본 `""`) · `voice: VoiceState | null`(기본 null) · `voiceAvailable: boolean`(기본 false) · 파생 `canSave = note.trim() !== ""`

**`VisitRecordUiState`**: `Loading` | `Failed` | `Content { record, draft?, deleteRequested=false, saveFailure?: "RETRYABLE"|"REJECTED" }`
파생 — `editing = draft != null`, `items = draft?.items ?? record.items`, `changed = draft != null && draft.items != record.items`

### 10.7 `RecordDetail` / `RecordStep` / `RecordDetailItem` / `RecordStepCard`

**`RecordDetail`**: `id: string` · `title: string` · `status: "DRAFT"|"BEFORE_VISIT"|"CONFIRMED"` · `clinicLine: string` · `steps: RecordStep[]` · `badge?: string`(기본 null)

**`RecordStep`** = 합타입
- `Block { at: string; title: string; items: RecordDetailItem[]; quote?: RecordQuote; card?: RecordStepCard }`
- `Pending { at: string; message: string; detail?: string }`

**`RecordDetailItem`**: `key: string` · `value: string` · `tone: "DEFAULT"|"WARNING"|"LINK"`(기본 DEFAULT)
**`RecordQuote`**: `label: string` · `text: string`
**`RecordStepCard`**: `collapsedItemCount: number` · `severity?: 1..5` · `allergies: string[]`(기본 `[]`) · `questions: string[]`(기본 `[]`)

### 10.8 `RecordItem` / `RecordGroup` / `RecordUiState`

**`RecordGroup`**: `monthLabel: string` · `items: RecordItem[]`
**`RecordItem`**: `id: string` · `cardId?: string` · `title: string` · `status: Status` · `clinic?: string` · `meta: string` · `detail?: string` · `resumeLabel?: string`
**`RecordUiState.Content`**: `groups: RecordGroup[]` · `selectedIds: string[] | null`(**null=편집 아님, []=편집 중 아무것도 안 고름**) · `deleteRequested: boolean`

### 10.9 `BriefCard` / `BriefCardItem` / `BriefCardHospital`

**`BriefCard`**

| 필드 | Kotlin | TS | 기본 |
|---|---|---|---|
| `id` | `String` | `string` | — |
| `title` | `String` | `string` | — |
| `status` | `Status` | `"BEFORE_VISIT"\|"CONFIRMED"` | — |
| `patientLine` | `String` | `string` | — |
| `items` | `List<BriefCardItem>` | `BriefCardItem[]` | — |
| `severity` | `MedicalMateSeverity?` | `1..5 \| null` | — |
| `health` | `List<BriefCardItem>` | `BriefCardItem[]` | `[]` |
| `allergies` | `List<String>` | `string[]` | — |
| `questions` | `List<String>` | `string[]` | — |
| `hospital` | `BriefCardHospital?` | `{name, address?} \| null` | `null` |
| `visited` | `Boolean` | `boolean` | `false` |
| `writtenOn` | `LocalDate?` | `string \| null` | `null` |

**`BriefCardItem`**: `key: string` · `value: string` · `emphasized: boolean`(기본 false) · `axis?: string`

### 10.10 `HomeUiState.Content` / `HomeTodayLine` / `SavedCardSummary` / `HomeSchedule` / `HomeResume`

**`HomeUiState`** = `Loading` | `Content { … }` | `Failed` — 셋뿐이고 **빈 상태는 `Content`의 한 갈래**다(위 §5 참고).

**`Content`**: `userInitial: string` · `hasUnreadNotification: boolean` · `todayLine: HomeTodayLine` · `resume: HomeResume | null` · `savedCards: SavedCardSummary[]` · `upcoming: HomeSchedule[]`

**`HomeTodayLine`** — **열 갈래. 차례가 곧 우선순위다.**

> **소스 주석의 숫자가 틀렸다.** `HomeUiState.kt`는 *"**아홉 갈래다**(#235). 디자인 트랙이 여덟 상태와 고르는 규칙을 확정했다"*라고 적었는데, 실제 서브타입을 세면 **열이다**(아래 표 그대로). 주석이 갈래가 늘 때 따라오지 못한 것으로 보인다. 웹 타입도 **열 갈래**로 만든다.

| 갈래 | 페이로드 | 문구(strings.xml) |
|---|---|---|
| `FirstVisit` | — | 라벨 `처음 오셨네요` / 제목 `아픈 곳을 말로 편하게 알려주세요` / 본문 `언제부터, 얼마나 아픈지 하나씩 물어볼게요.\n답변은 진료실에서 보여줄 카드로 정리돼요.` |
| `TodayAhead` | `clinic?`, `time?` | `오늘 진료가 있어요` / `브리핑 카드를 진료실에서 그대로 보여주세요.` |
| `TodayDone` | — | `오늘 진료는 어떠셨어요?` / `들은 말을 잊기 전에 남겨두세요.` / `캘린더에서 오늘 일정을 누르면 기록할 수 있어요.` |
| `TodayRecorded` | — | `오늘 진료를 기록해두셨어요` / `다음 방문이 정해졌으면 캘린더에 등록해두세요.` / `약이나 검사 일정도 함께 남기면 좋아요.` |
| `RecordMissing` | `on` | `%s 진료, 기록이 아직 없어요` / `기억나는 대로 몇 줄이면 충분해요.` / `캘린더에서 그 날을 누르면 적을 수 있어요.` |
| `NextTomorrow` | `clinic?`, `time?` | `내일 진료가 있어요` / `달라진 점이 있으면 카드를 오늘 손봐두세요.` |
| `NextInDays` | `days`, `on`, `clinic?` | `다음 진료가 %d일 남았어요` / `달라진 점이 있으면 카드를 미리 손봐두세요.` |
| `LastYesterday` | — | `어제 진료 다녀오셨네요` / `처방받은 약은 시간 맞춰 챙기세요.` / `다음 방문이 정해지면 캘린더에 등록해두세요.` |
| `LastDaysAgo` | `days` | `지난 진료 후 %d일이 지났어요` / `달라진 점이 있으면 새 증상 정리를 시작해두세요.` |
| `CardReady` | — | `브리핑 카드가 준비돼 있어요` / `진료 날짜가 정해지면 캘린더에 등록해두세요.` / `진료실에서는 이 카드를 그대로 보여주면 돼요.` |

> 경계 규칙: *"지났어요"는 기록이 저장된 진료에만 이틀 이상일 때, "남았어요"는 내일 이후 일정에만 이틀 이상일 때. 하루는 "어제"·"내일", 0일은 오늘 갈래.* 이 규칙으로 "앞날 진료에 경과일을 적어 음수가 나오던 것"이 사라졌다(#224).

`TodayAhead` / `NextTomorrow`의 `time`은 **`LocalTime?`이지 문자열이 아니다**(`오전 10:30`으로 굳어 있지 않다). 밑줄 문구는 화면이 조립한다:

| string | 값 | 쓰는 곳 |
|---|---|---|
| `home_today_at_clinic` | `%1$s %2$s예요.` | 오늘/내일 + 병원 + 시각 |
| `home_today_at` | `%1$s예요.` | 시각만 |
| `home_today_on_clinic` | `%1$s %2$s예요.` | 병원 + 날짜 |
| `home_today_on` | `%1$s 진료예요.` | 날짜만 |

→ **병원과 시각이 있는 만큼만 적는다.** 웹도 네 가지를 조립해야 하고, 한 문장으로 굳히면 병원 이름이 빈 계정에서 `" 예요."`가 나온다.

**`SavedCardSummary`**: `id` · `title` · `visited: boolean` · `writtenOn: string` · `clinic: string | null`
**`HomeSchedule`**: `id` · `title` · `date: string` · `time: string | null` · `followUp: boolean`(기본 false)
**`HomeResume`**: `intakeId: string` · `symptomTitle: string` · `step: IntakeStep`

### 10.11 `ScheduleAddUiState` / `ScheduleAddCard` / `ScheduleAddTodo`

| 필드 | Kotlin | TS | 기본 |
|---|---|---|---|
| `appointmentId` | `Long?` | `number \| null` | `null` (있으면 수정) |
| `followUp` | `Boolean` | `boolean` | `false` |
| `cards` | `List<ScheduleAddCard>` | `[]` | |
| `todos` | `List<ScheduleAddTodo>` | `[]` | |
| `hospital` | `String?` | `string \| null` | `null` **필수** |
| `date` | `LocalDate?` | `string \| null` | `null` **필수** |
| `time` | `LocalTime?` | `string \| null` | `null` (선택. 미지정이면 `시간 미정`) |
| `showErrors` | `Boolean` | `boolean` | `false` (저장 누른 뒤부터) |
| `sheet` | `ScheduleAddSheet` | `"NONE"\|"DATE"\|"TIME"` | `NONE` |
| *(파생)* `pickedCardCount` | | `cards.filter(c=>c.picked).length` | |
| *(파생)* `canSave` | | `hospital != null && date != null` | |
| *(파생)* `hospitalMissing` / `dateMissing` | | `showErrors && 값 없음` | |

`ScheduleAddCard`: `id` · `title` · `meta` · `clinic?` · `picked: boolean`(기본 false)
`ScheduleAddTodo`: `id` · `label` · `done: boolean`(기본 false) · `editing: boolean`(기본 false)

### 10.12 `IntakeUiState` (데모 재현에 필요한 부분 전부)

| 필드 | TS | 기본 |
|---|---|---|
| `step` | `"BODY_PART"\|"SYMPTOM_CHAT"\|"SEVERITY"\|"QUESTIONS"` | `BODY_PART` |
| `bodyPart` | `string \| null` | `null` |
| `bodyMap` | `BodyMapUiState` | `{}` |
| `messages` | `IntakeMessage[]` | `[]` |
| `draft` | `string` | `""` |
| `inputMode` | `"TEXT"\|"VOICE"` | `TEXT` |
| `voice` | `VoiceState` | `IDLE` |
| `voiceAvailable` | `boolean` | `false` |
| `awaitingReply` | `boolean` | `false` |
| `severity` | `1..5` | **`3`** |
| `questionDraft` | `string` | `""` |
| `questions` | `string[]` | `[]` |
| `chatFinished` | `boolean` | `false` |
| `completed` | `boolean` | `false` |
| `sessionId` | `number \| null` | `null` |
| `restoring` / `restoreFailed` / `sendFailed` | `boolean` | `false` |
| *(파생)* `canGoBack` | | 첫 단계가 아니거나 인체도가 확대돼 있으면 true |
| *(파생)* `canLeaveBodyPart` | | `bodyMap.selection != null` |
| *(파생)* `bodyPartSubject` | | 받침 있으면 `+이`, 없으면 `+가` |
| *(파생)* `canSend` | | `draft.trim() !== "" && !awaitingReply` |
| *(파생)* `canAddQuestion` | | `questionDraft.trim() !== ""` |

`IntakeMessage`: `id: number` · `sender: "AI"|"PATIENT"` · `text: string`

> **조사 붙이기를 웹에도 옮겨야 한다.** `withSubjectParticle()`이 마지막 한글 음절의 종성 유무로 `이`/`가`를 고른다. `복부` → `복부가`, `무릎` → `무릎이`. 하드코딩하면 "무릎가"가 나온다.

### 10.13 `MyProfileUiState` / `HealthEditUiState` / `ProfileSetupUiState`

`MyProfileUiState`: `profile: MyProfile` · `health: HealthSummary` · `settings: Record<AppSetting, boolean>`
`MyProfile`: `initial: string`(기본 `""`) · `name?: string` · `birthYear?: number` · `sex?: "FEMALE"|"MALE"`
`HealthSummary`: `medications / conditions / allergies: HealthField`
`HealthEditUiState`: `chosen: Record<Step, string[]>` · `extras: Record<Step, string[]>` · `adding?: Step` · `draft: string` · `loading/saving/saveFailed: boolean`
`ProfileSetupUiState`: `step: "MEDICATIONS"|"CONDITIONS"|"ALLERGIES"` · `answers: Record<Step, {chosen: string[]; note: string}>` · `completed/saving: boolean`

### 10.14 `HospitalPickUiState`

| 필드 | TS | 기본 | 뜻 |
|---|---|---|---|
| `query` | `string` | `""` | |
| `results` | `Hospital[]` | `[]` | `{name, address?}` — **id가 없다. 이름이 곧 식별자** |
| `selected` | `Hospital \| null` | `null` | |
| `purpose` | `"AFTER_VISIT"\|"BEFORE_VISIT"\|"SCHEDULE"` | `AFTER_VISIT` | 문구·CTA만 갈림 |
| `forExistingCard` | `boolean` | `false` | 카드에서 병원만 바꾸러 왔는지 |
| `searching` | `boolean` | `false` | |
| `total` | `number` | `0` | 전체 건수. `results`보다 클 수 있음 |
| `failed` | `boolean` | `false` | 서버에 못 닿음 ≠ 못 찾음 |
| *(파생)* `canSubmit` | | `selected != null \|\| purpose !== "AFTER_VISIT"` | |
| *(파생)* `showSubmit` | | `results.length > 0` — **결과 없으면 하단 바 자체가 없다** | |
| *(파생)* `truncated` | | `total > results.length` | |

### 10.15 `MedicalMateSeverity` (통증 5단계) — 전 값

| level | label | description | NRS |
|---|---|---|---|
| 1 | `조금 불편해요` | `신경 쓰이지만 하던 일은 계속할 수 있어요` | NRS 1–2 |
| 2 | `은근히 아파요` | `자꾸 생각나고 집중이 잘 안 돼요` | NRS 3–4 |
| 3 | `꽤 아파요` | `하던 일을 멈추게 될 때가 있어요` | NRS 5–6 |
| 4 | `많이 아파요` | `일상생활이 어렵고 참기 힘들어요` | NRS 7–8 |
| 5 | `견디기 힘들어요` | `잠도 못 자고 아무것도 못 하겠어요` | NRS 9–10 |

슬라이더 양끝: `가벼운 불편` / `매우 심함`. 접근성 문구 `%d단계, %s`.

### 10.16 축(axis) id ↔ 화면 라벨 — 웹 목데이터의 뼈대

**브리핑 카드**(`CardMapping.kt`, SOCRATES 8축, `AXIS_ORDER` 순서 그대로):

| 순서 | axis | 라벨 |
|---|---|---|
| 1 | `site` | `부위` |
| 2 | `onset` | `시작` |
| 3 | `character` | `양상` |
| 4 | `radiation` | `뻗치는 곳` |
| 5 | `associated` | `동반증상` |
| 6 | `time_course` | `경과` |
| 7 | `exacerbating_relieving` | `심해질 때` |
| — | `severity` | `강도` — **KV 줄이 아니라 눈금으로 그려서 AXIS_ORDER에 없다**. 값은 `"3 (꽤 아파요)"`처럼 오고 앞 숫자만 읽는다 |

건강 정보 줄(`CardHealth.kt`)은 축이 아니라 프로필에서 온다: `복용약`, `기저질환`. 값은 `" · "`로 잇는다. **비어 있으면 줄을 만들지 않는다**("없어요"/"잘 모르겠어요"를 카드에 적지 않는다). 알러지만 카드 밖 경고로 나간다.

값 상태 처리: `FILLED`→값 그대로, `UNKNOWN`→`잘 모르겠어요`, `AMBIGUOUS`→`값 + (확실하지 않아요)`, `NOT_ASKED`/`SKIPPED`→**줄 자체를 만들지 않음**.

**진료 후 기록**(`VisitMapping.kt`, `AXIS_ORDER` 순서):

| 순서 | axis | 라벨 |
|---|---|---|
| 1 | `findings` | `소견` |
| 2 | `tests` | `검사` |
| 3 | `medication_instructions` | `약` |
| 4 | `follow_up` | `재방문` (tone LINK) |

**브리핑 카드와 달리 진료 후 기록은 모르는 축을 버리지 않는다**(`VisitMapping.toItems()`):

```
known = AXIS_ORDER 중 응답에 있는 것 (그 차례로)
rest  = AXIS_ORDER에 없는 키 (응답에 온 차례 그대로)
items = (known + rest) 중 value가 blank가 아닌 것
```

주석: *"모르는 축은 뒤에 그 순서대로 붙인다 — 항목 이름이 닫힌 목록이 아니라 AI가 늘릴 수 있고, 아는 것만 그리면 환자가 적은 줄이 사라진다."* 라벨이 없는 축은 **axis 문자열이 그대로 라벨**이 된다(`else -> axis`). 카드(`CardMapping`)는 반대로 `AXIS_ORDER`에 없는 축을 버린다 — **두 화면의 규칙이 다르다.** 데모는 4축만 쓰므로 갈리지 않지만 웹 구현에서 한 함수로 합치면 안 된다.

재방문 줄에 날짜를 덧붙이는 규칙(`revisitNote()`): `"(" + M월 d일 + (approximate ? " 전후" : "") + ")"` — 괄호까지 포함하고 값과 **공백 하나로** 잇는다.
→ `일주일 뒤 재방문` + `(9월 25일 전후)`. **이미 붙어 있으면 다시 붙이지 않는다**(#245 — *"그것을 읽을 때 또 붙이면 `(9월 17일 전후) (9월 17일 전후)`가 된다"*).

**저장할 때는 붙인 날짜를 다시 뗀다**(`String.withoutRevisitNote()`): `removeSuffix(" $note").removeSuffix(note)`. 서버에는 환자가 말한 값(`일주일 뒤 재방문`)만 가고 날짜는 `followUp`이 따로 나른다. **웹 데모도 화면에 그리는 값과 저장 페이로드의 값을 갈라 둬야 한다** — JSON의 `visitRecord.items[3].value`(붙은 것)와 `classifyResponse.axes.follow_up.value`(안 붙은 것)가 그 두 자리다.

**일자 화면 기록 줄의 meta**(`CalendarDayViewModel.DayRecord.filled()`):

```
RECORD_META_AXES = [findings, medication_instructions, follow_up]   ← 검사(tests)는 뺀다
→ 각 축의 값에서 첫 줄만 (value.lineSequence().first().trim())
→ blank 제거 → " · "로 잇기
→ 셋 다 없으면 meta를 바꾸지 않고 목록의 병원 이름이 그대로 남는다
```

주석(#262): *"소견·약·재방문 셋만 그 차례로 잇는다. … 검사처럼 결과가 다음에 나오는 항목이나 AI가 늘린 축까지 붙이면 한 줄 메타가 넘친다. **값의 첫 줄만 쓴다** — 두 줄로 적힌 값을 통째로 넣으면 마찬가지다."*

> **검사 축이 빠지는 것과 첫 줄만 쓰는 것, 둘 다 앞 판 문서에 없었다.** 데모에서 이 규칙이 실제로 물린다 — §11.8을 보라.

---

## 11. 데모 시나리오 30단계 → 목데이터 매핑

`docs/DEMO-SCENARIO-30steps.md`를 **그대로** 재현하기 위한 상태 전환표다. JSON의 `stepStates` 배열이 같은 내용을 기계가 읽을 수 있게 담고 있다.

| # | 화면 | JSON 경로 | 화면에 보여야 하는 값 |
|---|---|---|---|
| 1 | 스플래시 | `auth.splashTagline` | `진료실에서 하고 싶은 말, 미리 정리해요` · 1.5초 |
| 2 | 로그인 | `auth` | 버튼 `카카오로 시작하기` |
| 3 | 온보딩 1~3 | `onboarding.pages[0..2]` | `다음` × 3 |
| 4 | 온보딩 4 | `onboarding.pages[3]` | `시작하기` |
| 5 | 복용 중인 약 | `profileSetup.steps[0]` | `혈압약` `진통제` 선택 → 2개 |
| 6 | 기저질환 | `profileSetup.steps[1]` | `고혈압` → 1개 |
| 7 | 알러지 | `profileSetup.steps[2]` → `profileSetup.complete` | `페니실린` + 툴팁 `브리핑 카드 맨 위에 항상 표시돼요` → `내 정보가 등록되었어요` |
| 8 | 홈(기록 없음) | `home.empty` | `처음 오셨네요` + `증상 정리 시작하기` |
| 9 | 1/4 부위 | `intake.step1` | 앞면 → 복부 → 칩 `짚은 부위 · 복부` |
| 10 | 2/4 문답 | `intake.step2` | 7턴 + 마무리 `말씀해 주신 내용을 정리해서 진료 때 보실 수 있게 준비했어요.` |
| 11 | 3/4 통증 | `intake.step3` | `3 (꽤 아파요)` |
| 12 | 4/4 질문 | `intake.step4` | AI 추천 2개 + 직접 입력 1개 = 3개 |
| 13 | 정리 완료 | `intake.done` | `진료받을 병원 먼저 찾기` |
| 14 | 병원 찾기 | `hospitalSearch` | `서울삼성내과` → `서울삼성내과의원` 선택 → `브리핑 카드 만들기` |
| 15 | 브리핑 카드 | `briefCard` → `home.afterCardSaved` | 제목 `복부 통증 · 3주` |
| 16 | 캘린더 월 | `calendar.snapshots.afterCardSaved` | 15일에 카드 점 |
| 17 | 카드만 있는 날 시트 | `calendar.cardOnlyDaySheet` | `이 카드를 가져갈 일정을 만들 수 있어요` |
| 18 | 일정 추가 | `appointment.form` | 병원 `서울삼성내과의원` 자동 입력 |
| 19 | 날짜·시간 | `appointment` | `9월 18일 (금)` / `오전 10:30` |
| 20 | 진료 전 할 일 | `appointment.todos` → `calendar.snapshots.afterScheduleSaved` | 3개 입력 → 18일에 일정 점 |
| 21 | 일자 상세(진료 전) | `calendarDay.beforeVisit` | `D-3` · 가져갈 카드 · 할 일 3개 |
| 22 | 진료 후 기록하기 | `clinicConfirm` | `서울삼성내과의원` 표시 |
| 23 | 병원 확인 | `clinicConfirm.primary` | `이 병원이 맞아요` |
| 24 | 진료 후 메모 | `visitNote.note` → `classifyResponse` | 4문장 → 로딩 2.2초 |
| 25 | 자동 분류 | `visitRecord` → `calendarDay.afterVisitUnconfirmed` | 4칸 + `내가 적은 그대로` |
| 26 | 다음 일정 확정 | `followUpAppointment` → `calendarDay.afterVisitConfirmed` | `9월 25일 (금) 오전 10:30` |
| 27 | 기록 탭 | `recordList` | `2026년 9월` · `복부 통증 · 3주` · `진료 완료` |
| 28 | 기록 상세 | `recordDetail` (접힘) | 카드 요약 + 진료 후 기록 |
| 29 | 카드 펼침 | `recordDetail` (`카드 전체 보기`) | 알러지·묻고 싶은 것까지 |
| 30 | 뒤로 → 기록 목록 | `recordList` | 끝 |

### 11.1 페르소나

| 축 | 값 | 출처 |
|---|---|---|
| 이름 | `고OO` | 시나리오 §0 |
| 나이 | 34세 남 | 시나리오 §0 |
| 생년 | 1992 | **생성** — 시나리오에 없어 만 나이로 역산 |
| 기저질환 | `고혈압` | 시나리오 §0 · 칩 목록에 있음 |
| 복용약 | `혈압약` `진통제` | 시나리오 §0 · 칩 목록에 있음 |
| 알러지 | `페니실린` | 시나리오 §0 · 칩 목록에 있음 |
| 병원 | `서울삼성내과의원` | 시나리오 §0 |
| 진료일 | 2026-09-18 (금) 오전 10:30 | 시나리오 §0 |
| 재방문 | 2026-09-25 (금) 오전 10:30 | 시나리오 §0 |
| 아바타 이니셜 | `고` | `MyProfileViewModel.toProfile()` = `name.take(1)` |
| 환자 줄 | `고OO · 34세 남 · 2026.09.15 작성` | 시나리오 §5 기대 산출물 |

> 앱 픽스처의 페르소나는 **`김OO · 32세 여`**(`previewBriefCard`)이고 데모는 **`고OO · 34세 남`**이다. 두 값을 섞지 않는다. JSON에서 앞은 `appFixtures.*`, 뒤는 최상위 섹션이다.

### 11.2 문답 7턴 (시나리오 §2 · 글자 그대로)

| # | AI 질문 | 환자 답 | 매핑 축 |
|---|---|---|---|
| 1 | `복부 쪽이 어떻게 불편하신지 편하게 말씀해 주세요.` | `명치가 불편해요.` | `site` |
| 2 | `언제부터 그러셨어요? 갑자기 시작됐나요, 서서히 시작됐나요?` | `3주 전부터 서서히 시작됐어요.` | `onset` |
| 3 | `어떤 느낌인가요? 예를 들면 욱신거리는지, 찌르는 것 같은지, 조이는 것 같은지요.` | `쓰리고 타는 것 같은 느낌이에요.` | `character` |
| 4 | `처음보다 지금은 어떤가요? 심해졌는지, 비슷한지, 나아졌는지요.` | `처음보다 심해졌어요.` | `time_course` |
| 5 | `어떤 때 더 심해지나요?` | `밥 먹고 30분쯤 지나면 제일 쓰리고, 밤에 누우면 더 심해요.` | `exacerbating_relieving` |
| 6 | `그 불편함이 다른 곳으로 퍼지기도 하나요?` | `아니요, 그 자리에만 있어요.` | `radiation` |
| 7 | `같이 나타나는 다른 증상이 있나요?` | `속이 더부룩하고 트림이 자주 나요.` | `associated` |

마무리 AI 한 마디: `말씀해 주신 내용을 정리해서 진료 때 보실 수 있게 준비했어요.`
되묻기 문구(안 쓰면 좋지만 대비): `조금만 더 말씀해 주실 수 있을까요?`

### 11.3 AI 추천 질문 2개 — **소스에서 찾았다. 생성 아님**

시나리오는 "AI 추천 목록 위에서 두 개를 문구 상관없이 탭"이라고만 하고 문구를 주지 않는다. 앱 소스에는 AI 추천 질문 세 개가 **네 군데에 같은 순서로** 박혀 있다 — `RecordDetailFixtures.kt` `abdomenCard.questions`, `BriefCardScreen.kt` `previewBriefCard.questions`, `IntakeScreen.kt` `IntakeQuestionsPreview`, `ContentPreviews.kt` `MedicalMateQuestionList`. 그 목록의 1번과 3번을 쓴다.

| 순서 | 문구 | 출처 | 데모에서 |
|---|---|---|---|
| 1 | `검사를 받아야 하나요?` | 위 4곳 | **탭한다** |
| 2 | `지금 진통제 계속 먹어도 되나요?` | 위 4곳 | **탭하지 않는다** — 직접 입력할 3번과 뜻이 겹친다 |
| 3 | `어떤 증상이면 바로 다시 와야 하나요?` | 위 4곳 | **탭한다** |

직접 입력(시나리오 12번, 글자 그대로): `지금 먹는 진통제를 계속 먹어도 되나요?`

최종 3개 (브리핑 카드 `환자가 묻고 싶어 하는 것` 블록에 번호 pill과 함께):

1. `검사를 받아야 하나요?`
2. `어떤 증상이면 바로 다시 와야 하나요?`
3. `지금 먹는 진통제를 계속 먹어도 되나요?`

> 시나리오는 AI 목록의 **위 두 개**를 탭하라고 한다. 웹 목데이터에서는 추천 목록의 표시 순서를 `["검사를 받아야 하나요?", "어떤 증상이면 바로 다시 와야 하나요?", "지금 진통제 계속 먹어도 되나요?"]`로 두면 "위에서 두 개"가 자동으로 위 결과가 된다. JSON의 `intake.step4.aiSuggested`가 그 순서다.

### 11.4 브리핑 카드 완성본 (15번)

**헤더**

```
복부 통증 · 3주                              [진료 전]
고OO · 34세 남 · 2026.09.15 작성
AI가 말씀하신 내용을 정리했어요  (ⓘ 말씀하신 내용을 항목별로 정리했어요. 원문도 함께 남아요)
```

**알러지 경고**(카드 맨 위, 노란 경고 면)

```
⚠ 알러지 · 페니실린
   처방 전에 꼭 확인해 주세요
```

**항목 줄**(앱 `AXIS_ORDER` 순서 · 앱 라벨 기준. 시나리오 표의 라벨은 오른쪽에 대조용으로 적었다)

| axis | 앱 라벨 | 값 | 시나리오 라벨 | 강조 |
|---|---|---|---|---|
| `site` | `부위` | `명치` | 부위 | |
| `onset` | `시작` | `3주 전부터 서서히` | 시작 | **●** |
| `character` | `양상` | `쓰리고 타는 것 같은 느낌` | 느낌 | |
| `radiation` | `뻗치는 곳` | `그 자리에만 있어요` | 퍼짐 | |
| `associated` | `동반증상` | `속이 더부룩하고 트림이 자주 나요` | 동반 | |
| `time_course` | `경과` | `처음보다 심해졌어요` | 경과 | |
| `exacerbating_relieving` | `심해질 때` | `밥 먹고 30분쯤 지나면 제일 쓰리고, 밤에 누우면 더 심해요` | 악화 | |
| (health) | `복용약` | `혈압약 · 진통제` | 복용약 | |
| (health) | `기저질환` | `고혈압` | 기저질환 | |

**통증**: `3` `꽤 아파요` (NRS 5–6) — 5단계 눈금

**질문 블록**: 헤더 `환자가 묻고 싶어 하는 것` + 번호 1·2·3 (§11.3)

**병원 블록**: 헤더 `진료받을 병원` + `서울삼성내과의원` + 주소(**생성 플레이스홀더**) + 오른쪽 `변경`

**하단 CTA**: `저장하기`

> 시나리오 §5는 줄 순서를 `부위 · 시작 · 느낌 · 경과 · 악화 · 퍼짐 · 동반`으로, 라벨도 다르게 적었다. 앱 소스의 `AXIS_ORDER`와 `axisLabel()`이 실제로 그리는 것은 위 표다. **§17 열린 질문 1번**에 올려 뒀다.

### 11.5 병원 검색 결과 (14번) — 5곳

검색어 `서울삼성내과` · 폴백 `삼성내과` · `검색 결과 5곳` · `totalCount = 5`(잘림 없음)

| # | 이름 | 주소 | 비고 |
|---|---|---|---|
| 1 | **`서울삼성내과의원`** | 서울 강남구 테헤란로 152, 3층 | **탭할 대상**. 이름은 시나리오, 주소는 **생성 플레이스홀더** |
| 2 | `서울삼성이비인후과의원` | 서울 강남구 테헤란로 152, 5층 | **생성** |
| 3 | `삼성서울내과의원` | 서울 서초구 서초대로 301, 2층 | **생성** |
| 4 | `서울삼성정형외과의원` | 서울 송파구 올림픽로 240, 4층 | **생성** |
| 5 | `삼성내과의원` | 서울 마포구 양화로 45, 6층 | **생성** |

> **주소는 전부 플레이스홀더다.** 실제 심평원 값이 아니고, 실 서비스에 그대로 실으면 안 된다. JSON에 `"addressSource": "generated-placeholder"`로 표시해 뒀다. 데모에서 주소가 보이는 자리는 결과 줄과 1m-12(병원 확인) 두 곳뿐이라 필요하면 빈 문자열로 두고 줄을 지워도 시나리오는 그대로 흐른다(`Hospital.address`가 비면 앱은 줄을 그리지 않는다).

검색 결과가 0곳일 때 문구는 `검색 결과 없음`, 입력 전 빈 상태는 `아직 검색 기록이 없어요` / `병원 명을 입력하면 진료받을 병원을 찾을 수 있어요` + **병원 아이콘**(search-off 아님).

### 11.6 일정 (18~20번)

| 필드 | 값 |
|---|---|
| `clinicName` | `서울삼성내과의원` |
| `on` | 2026-09-18 (금) |
| `time` | 10:30 → `오전 10:30` |
| `cards` | `card-1` `복부 통증 · 3주` |
| `origin` | `MANUAL` → 화면에 `초진` |
| `title`(조립) | `서울삼성내과의원` (진료과·목적 없음) |
| 렌더 | `서울삼성내과의원 초진` (`home_schedule_title` = `%1$s %2$s`) |

일자 화면의 일정 카드 마지막 줄: `복부 통증 · 3주 브리핑 카드를 가져가요` (`calendar_day_schedule_card`).

### 11.7 진료 전 할 일 3개 (20번 · 시나리오 §3 글자 그대로)

| # | label | done |
|---|---|---|
| 1 | `아침 공복으로 가기 (피검사 할 수 있어서)` | false |
| 2 | `먹고 있는 약 사진 찍어두기` | false |
| 3 | `밤에 깬 날짜 메모해 가기` | false |

> 시나리오는 "앱에 기본 할 일이 이미 있으면 손대지 않고 위 3개만 추가한다"고 한다. **실제 앱에는 기본 할 일이 없다** — `CalendarFixtures.fixtureTodos`는 주석대로 Preview 전용이고 화면은 일정에 붙은 것만 그린다(#187). 그러니 웹 목데이터의 `defaultTodos`는 빈 배열이고, 데모에서는 이 3개만 보인다. 빈 줄 안내 문구는 `챙길 것을 적어주세요`.

### 11.8 진료 후 메모 4문장과 4칸 분류 (24~25번)

**입력(한 덩어리로 붙여넣기, 글자 그대로)**

```
위염 초기라고 하셨어요. 피검사 했다고 하셨어요. 위산약 2주 처방. 일주일 뒤 재방문이라고 하셨어요.
```

**`POST /api/visits/classify` 응답 모양으로 만든 목데이터**

| 문장 idx | 문장 | label(axis) | 축 값 |
|---|---|---|---|
| 0 | `위염 초기라고 하셨어요.` | `findings` | `위염 초기` |
| 1 | `피검사 했다고 하셨어요.` | `tests` | `피검사 했다` |
| 2 | `위산약 2주 처방.` | `medication_instructions` | `위산약 2주` |
| 3 | `일주일 뒤 재방문이라고 하셨어요.` | `follow_up` | `일주일 뒤 재방문` |

`followUp = { date: "2026-09-25", text: "일주일 뒤", approximate: true }` · `patientNotes = []`

**화면(1q-1)에 그려지는 4칸**

| key | value | tone |
|---|---|---|
| `소견` | `위염 초기` | DEFAULT |
| `검사` | `피검사 했다` | DEFAULT |
| `약` | `위산약 2주` | DEFAULT |
| `재방문` | `일주일 뒤 재방문 (9월 25일 전후)` | **LINK** |

캡션: `AI가 메모를 4가지로 나눴어요` — **문자열은 포맷이다**: `visit_record_caption` = `AI가 메모를 %1$d가지로 나눴어요`, 인자는 `VisitRecord.classifiedCount`. 웹도 4를 박지 말고 칸 수에서 뽑는다.
툴팁: `visit_record_caption_tooltip` = `소견·검사·약·재방문으로 나눴어요. 원문 메모도 함께 남아요` (툴팁 라벨 `분류 기준 설명`)
원문 블록: 섹션 `진료 메모`(`visit_record_memo`) / 인용 라벨 `내가 적은 그대로`(`visit_record_memo_quote`) / 본문 = 위 4문장 그대로
하단 CTA: `저장하기`

**저장 직후 일자 화면(진료 완료)의 기록 줄**

앞 판 문서는 여기에 `위염 초기 · 위산약 2주 · 09.25 재방문`을 적고 *"= `RECORD_META_AXES`를 `" · "`로 이은 값"*이라고 했는데, **그 값은 규칙이 만들어 내지 않는다.** §10.16의 규칙을 이 데이터에 실제로 돌리면 이렇게 된다:

| 단계 | 값 |
|---|---|
| `findings` 첫 줄 | `위염 초기` |
| `medication_instructions` 첫 줄 | `위산약 2주` |
| `follow_up` 첫 줄 | `일주일 뒤 재방문 (9월 25일 전후)` ← `withRevisitDate()`가 붙인 뒤의 값 |
| `" · "`로 이음 | **`위염 초기 · 위산약 2주 · 일주일 뒤 재방문 (9월 25일 전후)`** |

```
진료 후 기록
위염 초기 · 위산약 2주 · 일주일 뒤 재방문 (9월 25일 전후)     ← 규칙이 실제로 만드는 값
위염 초기 · 위산약 2주 · 09.25 재방문                          ← 시안이 그리는 짧은 꼴(생성)
```

`RECORD_META_AXES`는 축의 값을 **자르지도 다시 쓰지도 않는다.** `09.25 재방문`이 나오려면 누군가 값을 줄여야 하는데 그 코드가 없다. 앱 픽스처 `fixtureRecord.meta`(`위염 초기 · 2주 약 · 09.26 재방문`)도 같은 사정이다 — 그것은 Figma 프레임을 그대로 옮긴 **손으로 적은 값**이지 규칙의 산출물이 아니다(축 값은 `위염 초기 소견` / `2주분 처방` / `2주 뒤 (9월 26일 전후)`이므로 규칙대로면 `위염 초기 소견 · 2주분 처방 · 2주 뒤 (9월 26일 전후)`가 나온다).

→ **JSON에는 둘 다 넣었다**: `meta`(규칙이 만드는 값)와 `metaShorthand`(시안의 짧은 꼴, `generated`). 어느 쪽을 그릴지는 §17 열린 질문 9번이다. 한 줄이 넘칠 것 같으면 `text-overflow: ellipsis`로 자르는 쪽이 앱과 같다.

**다음 일정(시간 미정)**

```
[9월 25일 (금) 전후]  서울삼성내과의원 재방문
진료 후 기록에서 자동으로 만들었어요
시간을 정하면 하루 전에 알려드려요
[ 시간 정하고 확정하기 ]
```

**확정 뒤(26번)**: 칩이 D-day로, 그 자리에 `9월 25일 (금) 오전 10:30`.

### 11.9 기록 목록 · 기록 상세 (27~29번)

**목록** — 묶음 `2026년 9월` / `1건`

| id | title | 배지 | meta | detail |
|---|---|---|---|---|
| `visit-1` | `복부 통증 · 3주` | `진료 완료` | `09.18 진료 · 서울삼성내과의원` | `위염 초기 · 위산약 2주 · 09.25 재방문` (**생성** — §11.8의 짧은 꼴) |

배지 문구는 `status`가 아니라 **`visited`**가 읽는다(§16-8). 세 배지 문구: `작성 중`(DRAFT) / `진료 전`(BEFORE_VISIT) / `진료 완료`(`record_status_confirmed`).

> 실제 서버 응답(`VisitSummaryResponse`)에는 `detail`에 해당하는 값이 없어 `RecordViewModel.toRow()`가 보조 줄을 비운다. 시나리오 28번이 목록에서 내용을 보게 하려면 detail을 채워야 하므로 **웹 목데이터는 detail을 넣는다**. 서버를 붙일 때 이 줄이 사라진다는 것만 기억하면 된다.
> `detail`이 서버에 없는 값이므로 여기에는 §11.8의 규칙이 적용되지 않는다 — **무엇을 적든 우리가 정하는 값**이고, 일자 화면의 기록 줄(meta, 규칙이 만드는 값)과 서로 다를 수 있다는 것만 알고 쓰면 된다.

**상세** — `서울삼성내과의원 · 09.18 진료` · 배지 `진료 완료` · **최신이 위**

| 단계 | at | 내용 |
|---|---|---|
| Pending | `09.25 예정` | `다음 진료가 예약돼 있어요` / `9월 25일 (금) 오전 10:30` |
| Block | `09.18 · 진료 후 기록` | 4칸(§11.8) |
| Block | `09.15 작성` | `브리핑 카드` — 9줄 + `collapsedItemCount: 3` + severity 3 + 알러지 + 질문 3개 |

접힘/펼침 버튼: `카드 전체 보기` ↔ `접기`
접혔을 때 보이는 3줄: `부위` `시작` `양상` (앞에서 세 개. 테스트가 `["부위","기간","양상"]`을 고정하지만 그건 앱 픽스처의 라벨이고, 규칙 자체는 "앞 3줄"이다)

---

## 12. 목데이터 JSON 구조

파일: `C:\Claude\MedicalMateWebApp\docs\assets\demo-data.json` (JSON 파싱 검증 완료, 최상위 21 키, `meta.version = 1.1.0`)

`meta.review`에 이 문서의 소스 대조 검수 기록이 들어 있다 — 실제로 연 파일 목록(`meta.review.against` 24개), 고친 값(`corrections`), 소스와 글자 그대로 일치함을 확인한 범위(`verifiedUnchanged`).

| 최상위 키 | 담은 것 |
|---|---|
| `meta` | 시나리오·today·읽은 소스 목록·**생성한 값 목록** |
| `profile` | 고OO 프로필 + 건강 정보 + 설정 3종 |
| `profileSetup` | 3단계 질문·설명·칩 목록 전부 + 데모에서 고를 값 |
| `onboarding` | 4장 제목·본문(strings.xml 그대로) |
| `auth` | 스플래시·로그인 문구 |
| `intake` | step1~4 + 7턴 + 통증 5단계 + AI 추천 질문 + 완료 화면 |
| `hospitalSearch` | 검색어·결과 5곳·빈 상태 문구·CTA 라벨 |
| `briefCard` | 완성 카드 한 장(항목 7 + 건강 2 + 통증 + 알러지 + 질문 3 + 병원) |
| `appointment` | 9/18 일정 + 할 일 3개 + 일정 추가 폼 문구 |
| `followUpAppointment` | 9/25 재방문 일정(`origin: VISIT_FOLLOW_UP`) |
| `clinicConfirm` | 1m-12 문구 + 병원/주소 |
| `visitNote` | 1p 문구 + 메모 원문 + 로딩 시간 |
| `classifyResponse` | `POST /api/visits/classify` 응답 모양 그대로 |
| `visitRecord` | 1q-1 4칸 + 원문 블록 |
| `calendar` | 월 화면 스냅샷 3개(16·20·26단계) + 카드만 있는 날 시트 |
| `calendarDay` | 일자 화면 3상태(진료 전 / 진료 후 미확정 / 확정) |
| `home` | 홈 3상태(빈 / 카드 저장 후 / 일정 저장 후) |
| `recordList` | 기록 탭 목록 |
| `recordDetail` | 기록 상세 타임라인 3단계 |
| `stepStates` | **30단계 ↔ 상태 경로 매핑 배열** |
| `appFixtures` | **안드로이드 원본 픽스처 전부**(캘린더·visit·카드·홈·문답·병원·일정추가·목록 2종·상세 5건·내 정보·건강수정·디자인시스템 샘플·Preview 뷰포트) |

사용법 제안:

```ts
import demo from "@/docs/assets/demo-data.json";

const TODAY = demo.meta.today;                 // "2026-09-15" — new Date() 금지
const step  = demo.stepStates.find(s => s.step === 21);
const day   = demo.calendarDay.beforeVisit;    // D-3 일자 상세
```

`appFixtures`는 데모 흐름에 쓰지 않는다. 컴포넌트 카탈로그와 빈/실패 상태 확인용이다.

---

## 13. 로딩 / 빈 상태 / 에러 — 화면별 문구 전부

### 13.1 로딩

| 자리 | 컴포넌트 | 문구 |
|---|---|---|
| 기록 탭 · 카드 목록 · 기록 상세 · 브리핑 카드 · 진료 후 기록 | `MedicalMateLoadingSpinner` | (문구 없음, 스피너만) |
| AI 정리(24→25) | 스피너 | Preview 샘플 `증상을 정리하고 있어요` — **데모에서 이 자리가 가장 오래 보인다. 자르지 말 것** |
| 스켈레톤 | `MedicalMateLoadingSkeleton` | 접근성 `카드를 불러오는 중` |
| 문답 응답 대기 | 인라인 | `답변을 준비하고 있어요` |
| 병원 검색 중 | 결과 라벨 | `찾는 중이에요` |
| 음성 처리 | `MedicalMateVoiceInput` | `정리하는 중이에요` / `잠시만 기다려 주세요` |

### 13.2 빈 상태

| 화면 | 타입 | 제목 | 설명 | 액션 |
|---|---|---|---|---|
| 홈(1n-2) | — | `아직 진료 기록이 없어요` | `증상을 정리해두면 진료실에서 바로 보여줄 수 있어요` | `증상 정리하기` |
| 기록 탭(1j-2) | `NO_RECORD` | `아직 진료 기록이 없어요` | `증상을 정리해두면 진료실에서 바로 보여줄 수 있어요` | `증상 정리하기` |
| 카드 목록(1j-4) | `NO_RECORD` | `아직 브리핑 카드가 없어요` | `증상을 정리해두면 진료실에서 바로 보여줄 수 있어요` | `증상 정리하기` |
| 병원 찾기(1m-B 입력 전) | `NO_RESULT` + **병원 아이콘** | `아직 검색 기록이 없어요` | `병원 명을 입력하면 진료받을 병원을 찾을 수 있어요` | — |
| 일자 화면 · 진료 전 기록 자리 | — | `아직 진료 전이에요` | `진료가 끝나면 들은 내용을 여기에 기록할 수 있어요` | `진료 후 기록하기` |
| 부위 검색 | — | `그런 부위는 없어요. 다른 이름으로 찾아보세요.` | | |

빈 상태는 **남은 높이를 전부 받아 그 안에서 가운데에 선다**(시안 496 / 677 안의 282 근거). 목록 첫 줄 자리에 글이 뜬 것이 아니라 한 화면이다. 웹에서는 `flex: 1` + `place-items: center`.

### 13.3 에러 · 실패

| 화면 | 제목 | 설명 | 액션 |
|---|---|---|---|
| 홈 | `불러오지 못했어요` | `인터넷 연결을 확인하고 다시 시도해주세요` | `다시 시도` |
| 기록 탭 | `기록을 불러오지 못했어요` | 〃 | `다시 시도` |
| 카드 목록 | `카드를 불러오지 못했어요` | 〃 | `다시 시도` |
| 브리핑 카드 | `카드를 불러오지 못했어요` | 〃 | `다시 시도` |
| 기록 상세 | `기록을 불러오지 못했어요` | 〃 | `다시 시도` |
| 진료 후 기록(정리 실패) | `기록을 정리하지 못했어요` | 〃 | `다시 시도` |
| 진료 후 기록(불러오기 실패) | `기록을 불러오지 못했어요` | 〃 | `다시 시도` |
| 병원 검색 실패 | 결과 라벨 `지금은 찾지 못했어요. 잠시 뒤 다시 해주세요.` | | |
| 병원 결과 잘림 | `%1$d곳 중 %2$d곳이에요. 이름을 더 적으면 좁혀져요.` | | |
| 카드 저장 실패 | `저장하지 못했어요. 다시 눌러주세요.` | | |
| 기록 저장 실패(재시도 가능) | `저장하지 못했어요. 다시 눌러주세요.` | | |
| 기록 저장 거절(재시도 불가) | `다시 눌러도 저장되지 않아요. 브리핑 카드를 먼저 저장해야 기록을 남길 수 있어요.` | | |
| 내 정보 저장 실패 | `저장하지 못했어요. 다시 눌러주세요.` | | |
| 로그인 실패 | `카카오 로그인에 실패했어요. 다시 시도해주세요` / `인터넷 연결을 확인해주세요` / `로그인에 실패했어요. 잠시 후 다시 시도해주세요` / `자동 로그인을 확인하지 못했어요. 다시 로그인해주세요` | | |
| 일정 필수 칸 | `병원을 골라주세요` / `날짜를 골라주세요` (저장을 누른 뒤부터 표시) | | |
| 인체도 | `몸 바깥을 짚었어요. 몸 위를 짚어주세요.` / `여기가 어디인지 알기 어려워요. 조금 더 가운데를 짚어주세요.` | | |
| 마이크 | `마이크를 쓸 수 없어요` / `설정에서 마이크 권한을 켜주세요` + `직접 입력할게요` | | |

**실패 문구의 갈래를 지켜야 한다**: 병원 검색은 "못 닿은 것"(`지금은 찾지 못했어요…`)과 "못 찾은 것"(`검색 결과 없음`)을 가른다. 저장은 "다시 눌러 풀리는 것"(RETRYABLE)과 "아닌 것"(REJECTED)을 가른다. 한 문구로 뭉개면 안 되는 것에 "다시 눌러주세요"가 뜬다(#220 — 실제로 같은 400을 다섯 번 눌렀다).

### 13.4 삭제 확인 대화상자

| 대상 | 제목 | 본문 | 확인 |
|---|---|---|---|
| 기록 N건 | `기록 %1$d건을 삭제할까요?` | `선택한 기록이 사라지고 되돌릴 수 없어요.` | `삭제` |
| 카드 N장 | `브리핑 카드 %1$d장을 삭제할까요?` | `연결된 진료 기록은 남고 선택한 카드는 사라져요.` | `삭제` |
| 브리핑 카드 1장 | `이 브리핑 카드를 삭제할까요?` | `연결된 진료 기록은 남고 이 카드는 사라져요.` | `삭제` |
| 진료 후 기록 | `이 진료 후 기록을 삭제할까요?` | `원문 메모까지 사라지고 되돌릴 수 없어요.` | `삭제` |
| 일정 | `이 일정을 삭제할까요?` | `캘린더와 하루 전 알림이 함께 사라져요` | `삭제` |
| 탈퇴 | `정말 탈퇴하시겠어요?` | `저장된 브리핑 카드와 진료 기록이 모두 삭제되고 되돌릴 수 없어요` | `탈퇴하기` |

> **데모에서는 삭제·편집을 보여주지 않는다**(시나리오 "금지" 항목). 문구는 웹앱 완성도를 위해 옮겨 두되 데모 경로에서는 진입점을 숨겨도 된다.

---

## 14. API — 데모에서 흉내 낼 계약

목데이터가 어떤 응답을 대신하는지다. 웹앱은 이 경로로 `fetch`하는 대신 JSON에서 꺼내면 된다.

| 메서드 · 경로 | 요청 | 응답(핵심 필드) | 데모 대응 |
|---|---|---|---|
| `POST /api/auth/kakao` | `KakaoLoginRequest` | `TokenResponse` | 2번 — 즉시 성공 |
| `POST /api/auth/refresh` | `RefreshRequest` | `TokenResponse` | 미사용 |
| `POST /api/auth/logout` | — | — | 미사용 |
| `DELETE /api/me` | — | — | 미사용(탈퇴) |
| `GET /api/me/health-profile` | — | `HealthProfileResponse` | `profile.health` |
| `PUT /api/me/health-profile` | `HealthProfileRequest{medications, conditions, allergies}` | `HealthProfileResponse` | 5~7번 저장 |
| `GET /api/me/settings` | — | `SettingsResponse` | `profile.settings` |
| `PATCH /api/me/settings` | `SettingsRequest` | `SettingsResponse` | 미사용 |
| `GET /api/me/home` | — | `HomeResponse` | `home.*` 세 스냅샷 |
| `POST /api/sessions` | `StartSessionRequest` | `SessionResponse{sessionId,…}` | 9번 |
| `GET /api/sessions/{sessionId}` | — | `SessionResponse` | 이어서 하기(데모 미사용) |
| `POST /api/sessions/{sessionId}/messages` | `SendMessageRequest{text}` | `TurnResponse` | 10번 7턴 |
| `PUT /api/sessions/{sessionId}/severity` | `SeverityRequest{level}` | `SessionResponse` | 11번 |
| `PUT /api/sessions/{sessionId}/questions` | `QuestionsRequest{questions[]}` | `SessionResponse` | 12번 |
| `POST /api/sessions/{sessionId}/card` | `GenerateCardRequest` | `CardResponse` | 15번 카드 생성 |
| `GET /api/me/cards` | — | `List<CardSummaryResponse>` | `appFixtures.briefCardGroups` |
| `GET /api/cards/{cardId}` | — | `CardResponse{axes, patient, allergies, hospital,…}` | `briefCard` |
| `PATCH /api/cards/{cardId}` | `UpdateCardRequest{axes:[{axis,value}]}` | `CardResponse` | 편집(데모 미사용) |
| `POST /api/cards/{cardId}/confirm` | — | `CardResponse` | 15번 `저장하기` |
| `DELETE /api/cards/{cardId}` | — | — | 데모 미사용 |
| `GET /api/hospitals?q=&size=` | 쿼리 | `HospitalSearchResponse{hospitals:[{name,address?}], totalCount}` | 14번 — **부분 일치. "서울"이면 4천 건** |
| `GET /api/me/appointments?…` | 월 범위 | `List<AppointmentResponse>` | `calendar.snapshots.*` |
| `GET /api/me/appointments/upcoming` | — | `List<AppointmentResponse>` | `home.*.upcoming` |
| `POST /api/me/appointments` | `CreateAppointmentRequest{clinicName, scheduledOn, scheduledTime?, cardIds[], todos[], origin}` | `AppointmentResponse` | 20번 |
| `PATCH /api/me/appointments/{id}` | 부분 수정 | `AppointmentResponse` | 26번 — **시각만 채운다. 새로 만들면 재방문이 둘이 된다** |
| `DELETE /api/me/appointments/{id}` | — | — | 데모 미사용 |
| `POST /api/visits/classify` | `ClassifyMemoRequest{memo, visitedOn?, clinicName?, labels?}` | `ClassifyMemoResponse{axes, sentences, labels, patientNotes, followUp}` | **24번. 저장하지 않는다** |
| `POST /api/cards/{cardId}/visit` | `CreateVisitRequest{clinicName?, visitedOn?, axes:[{axis,value}], followUp?, patientNotes[], rawNote?}` | `VisitResponse` | 25번 `저장하기`. **확정한 카드에만** |
| `GET /api/me/visits` | — | `List<VisitSummaryResponse>` | `recordList` |
| `GET /api/visits/{visitId}` | — | `VisitResponse{axes, rawNote, followUp, patientNotes}` | `visitRecord` |
| `GET /api/cards/{cardId}/visits` | — | `List<VisitSummaryResponse>` | 재방문 누적(데모 미사용) |
| `DELETE /api/visits/{visitId}` | — | — | 데모 미사용. **카드는 남는다** |

계약에서 놓치기 쉬운 것 셋:

1. `classify`는 **저장하지 않는다.** 결과를 그대로 `create` 요청으로 옮긴다. 즉 24→25는 클라이언트 상태 이동일 뿐이다.
2. `classify`에 **`labels`를 반드시 되돌려 보낸다.** 안 보내면 줄 하나를 옮길 때마다 모델 호출이 나간다(주석: *"그 비용이 서버 크레딧과 같은 주머니에서 빠진다"*).
3. `CreateVisitRequest`에 **`status`와 `source`를 보내지 않는다.** 서버가 `PATIENT_EDIT`로 박는다.

---

## 15. 이 문서가 다루는 화면(Preview 단위) · Figma id · 디자인 시스템 컴포넌트 · 나가는 길

픽스처가 실제로 그리는 화면 목록이다. 각 화면의 자세한 레이아웃은 도메인별 문서가 맡고, 여기서는 **어떤 픽스처가 어느 화면을 채우는가**를 잇는다.

### 15.1 캘린더 일자 (`CalendarDayScreen`)

- Figma: **1r-2 `406:2514`** / 1r-2-A `1060:2879` / 1r-2-A2 `1060:2998` / 1r-2-E
- 픽스처: `previewCalendarDayState` 외 3종
- 위→아래: NavBar(날짜 + 우측 `편집`/`취소`/`확인`) → `이 날 일정` 카드(배지 D-day 또는 `진료 완료`) → `가져갈 브리핑 카드` 줄 → **진료 전이면** `진료 전 할 일` 체크 목록 + `이 날 기록` 빈 상태 / **다녀왔으면** `이 날 기록` 줄 + `다음 일정` 카드 → (편집 중) 하단 `일정 삭제` Danger
- DS 컴포넌트: `MedicalMateNavBar` · `MedicalMateSectionHeader` · `MedicalMateListRow`(+`MedicalMateListRowType`) · `MedicalMateTodoRow` · `MedicalMateRowDelete` · `MedicalMateBadgeTone` · `MedicalMateEmptyState`(+`Type`) · `MedicalMateButton`(+`Size`, `Type`) · `MedicalMateDialog`
- 나가는 길: 뒤로 → 캘린더 월 / 카드 줄 탭 → 브리핑 카드(1e-1) / `진료 후 기록하기` → 병원 확인(1m-12) / 기록 줄 탭 → 기록 상세(1j-3) / `시간 정하고 확정하기` → 일정 추가(1r-4-B) / `일정 삭제` 확인 → 캘린더 월

### 15.2 캘린더 월 (`CalendarMonthScreen`)

- Figma: **1r-1 `406:2310`**, 카드만 있는 날 시트 **1r-1-S `1226:4669`**
- 픽스처: `previewCalendarState`
- 위→아래: NavBar(`캘린더`, leading 없음) → 월 이동 헤더(`2026년 9월` + `지난달`/`다음달`) → 요일 머리(일~토) → 날짜 격자(채운 점=기록, 빈 원=예정, 테두리=오늘, 채움=선택) → 범례(`기록 있음`/`예정`) → 고른 날 일정 목록 → FAB `일정 추가` → 하단 탭바
- DS 컴포넌트: `MedicalMateNavBar`(+`NavLeading`) · `MedicalMateDateCell`(+`Size`, `DateMarker`) · `MedicalMateSectionHeader` · `MedicalMateListRow`(+`Type`) · `MedicalMateCard` · `MedicalMateIconButton` · `MedicalMateFab` · `MedicalMateBottomSheet` · `MedicalMateButton` · `MedicalMateBadgeTone` · `MedicalMateTabBar`(+`Tab`)
- 나가는 길: 날짜 탭(일정 있음) → 일자 화면 / 날짜 탭(카드만) → **바텀 시트**(`이 카드로 일정 만들기` 또는 `일정 보러가기`) / FAB → 일정 추가 / 탭바 → 홈·기록

### 15.3 홈 (`HomeScreen`)

- Figma: **1n-1 `399:1339`**, 빈 상태 **1n-2 `399:1720`**
- 픽스처: `previewContent`
- 위→아래: 헤더(로고 + 알림 + 아바타) → `오늘의 한 줄` 카드(9갈래) → `증상 정리 시작하기`(마이크 아이콘 + 라벨, gap 6) → (있으면) `이어서 하기` 카드 → `최근 브리핑 카드` + `전체 보기` → `다가오는 일정` → 하단 탭바
- DS 컴포넌트: `MedicalMateLogo` · `MedicalMateAvatar` · `MedicalMateIconButton` · `MedicalMateCard`(+`CardEmphasis`) · `MedicalMateSectionHeader` · `MedicalMateListRow`(+`Type`) · `MedicalMateBadgeTone` · `MedicalMateButton` · `MedicalMateEmptyState`(+`Type`) · `MedicalMateTabBar`(+`Tab`)
- 나가는 길: 시작 버튼 → 증상 정리 1/4 / 이어서 하기 → 문답 복원 / 카드 줄 → 브리핑 카드 / `전체 보기` → 카드 목록(1j-4) / 일정 줄 → 캘린더 일자 / 아바타 → 내 정보(1s-1) / 탭바 → 기록·캘린더

### 15.4 브리핑 카드 (`BriefCardScreen`)

- Figma: **1e-1 `404:1679`**, 편집 **1e-1-E `597:4804`**, 삭제 확인 1e-1-DC
- 픽스처: `previewBriefCard`
- 위→아래: NavBar(`브리핑 카드` + 우측 `편집`/`확인`) → 제목 + 상태 배지 → 환자 줄 → AI 캡션 + 툴팁 → **알러지 경고** → 항목 KV 줄 → 통증 눈금 → `환자가 묻고 싶어 하는 것` → `진료받을 병원`(+`변경`) → 하단 `저장하기`
- DS 컴포넌트: `MedicalMateNavBar`(+`SurfaceStyle`) · `MedicalMateSectionHeader` · `MedicalMateCalloutEdit` · `MedicalMateHospitalCard` · `MedicalMateSeverity` · `MedicalMateButton`(+`Type`) · `MedicalMateDialog` · `MedicalMateEmptyState`(+`Type`) · `MedicalMateLoadingSpinner`
- 나가는 길: 뒤로 → 앞 화면 / `변경` → 병원 찾기(1m-B, `forExistingCard=true`) / `저장하기` → 홈 / 삭제 → 목록

### 15.5 진료 후 메모 (`VisitNoteScreen`)

- Figma: **1p `405:1926`**
- 픽스처: `previewVisitHeadline` + `PREVIEW_VISIT_NOTE`
- 위→아래: NavBar(`진료 후 기록`) → 머리말 칩(`오늘 진료`/`그 날 진료` + `· 9월 18일`) → `%s 브리핑 카드로 진료받았어요` → 제목 `진료실에서 들은 말을\n그대로 남겨두세요` → 설명 → 큰 입력창(placeholder `3일치 약 처방을 받았어요`) → (음성 가능하면) 마이크 FAB → 하단 `AI로 정리하기` + 툴팁
- DS 컴포넌트: `MedicalMateNavBar`(+`SurfaceStyle`) · `MedicalMateChip` · `MedicalMateCard`(+`Emphasis`) · `MedicalMateDivider` · `MedicalMateTextArea` · `MedicalMateVoiceInput` · `MedicalMateFab` · `MedicalMateTooltip` · `MedicalMateBottomCtaBar` · `MedicalMateButton`
- 나가는 길: 뒤로 → 병원 확인 / `AI로 정리하기` → 자동 분류 결과(1q-1)

### 15.6 자동 분류 결과 (`VisitRecordScreen`) · 기록 상세(`VisitDetailScreen`)

- Figma: **1q-1 `405:2193`**, 편집 **1q-1-E `636:3675`**, 삭제 확인 1q-1-DC
- 픽스처: `previewVisitRecord`
- 위→아래: NavBar(`진료 후 기록` + 우측 `편집`/`확인`) → 병원 줄(`서울삼성내과의원 · 2026.09.18`) → 캡션 `AI가 메모를 4가지로 나눴어요` + 툴팁 → 4칸 KV(재방문은 브랜드색) → `진료 메모` · `내가 적은 그대로` 원문 블록 → 하단 `저장하기` (편집 중엔 `진료 후 기록 삭제`)
- DS 컴포넌트: `MedicalMateNavBar`(+`SurfaceStyle`) · `MedicalMateBottomCtaBar` · `MedicalMateButton`(+`Type`) · `MedicalMateDialog` · `MedicalMateEmptyState`(+`Type`) · `MedicalMateLoadingSpinner`
- 나가는 길: 저장 → 캘린더 일자(진료 완료) / 삭제 → 앞 화면

### 15.7 병원 찾기 (`HospitalPickScreen`)

- Figma: **1m `489:5447`**(진료 후) / **1m-B `1041:3687`**(진료 전) / 입력 전 `1092:3858`·`1092:3919`
- 픽스처: `previewHospitals`
- 위→아래: NavBar(`병원 찾기`, **뒤로가기만**) → 질문 + 설명(목적별로 갈림) → 검색창 → 결과 라벨 → 결과 줄(이름 + 주소, 고른 줄은 브랜드색 + 체크) 또는 빈 상태 → 하단 CTA(`브리핑 카드 만들기` / `완료`)
- DS 컴포넌트: `MedicalMateNavBar`(+`SurfaceStyle`) · `MedicalMateSearchField` · `MedicalMateDivider` · `MedicalMateEmptyState`(+`Type`) · `MedicalMateBottomCtaBar` · `MedicalMateButton`
- 나가는 길: 뒤로 → 앞 화면 / CTA(BEFORE_VISIT) → 브리핑 카드 / CTA(AFTER_VISIT) → 진료 후 메모 / CTA(SCHEDULE) → 일정 추가로 값 반환
- **결과가 비면 하단 CTA 바 자체가 없다**(시안 `1092:3858`에 Footer가 없음). `showSubmit = results.isNotEmpty()`이고, *"[results]가 비면 [selected]도 항상 비어 있다 — 검색어가 바뀔 때 결과에서 빠진 선택을 지우기 때문"*이라 고른 것이 있는지 따로 보지 않는다. **웹도 검색어를 고치면 선택을 지워야 한다.**
- **목적별로 갈리는 문구 전부**(데모 14번은 `BEFORE_VISIT` 쪽이다):

| 자리 | `AFTER_VISIT` (1m) | `BEFORE_VISIT` · `SCHEDULE` (1m-B) |
|---|---|---|
| 질문 | `진료받은 병원을 찾아주세요` | `진료받을 병원을 찾아주세요` |
| 설명 | `병원 이름으로 검색해 주세요.` | `아직 정하지 않았다면 건너뛰어도 돼요.\n진료 후에 등록할 수 있어요.` |
| 하단 CTA | `완료` | `브리핑 카드 만들기` (단, `forExistingCard = true`면 `완료` — #229) |

  공통: NavBar `병원 찾기` · 검색창 placeholder `병원 이름 검색` · 지우기 `검색어 지우기` · 결과 라벨 `검색 결과 %1$d곳` / `찾는 중이에요` / `검색 결과 없음` / `지금은 찾지 못했어요. 잠시 뒤 다시 해주세요.` / `%1$d곳 중 %2$d곳이에요. 이름을 더 적으면 좁혀져요.`
- `Hospital`에 **id가 없다**. 주석: *"서버가 심평원에서 가져오면서 id를 매기지 않는다. 이름이 곧 식별자이고, 일정 등록의 `clinicName`에 그 값을 그대로 넣는다."* 주소는 *"같은 이름의 다른 지점을 구별할 수 있는 유일한 값"*이라 결과 줄에 함께 적고, **없으면 줄을 그리지 않는다**.

### 15.8 병원 확인 (`ClinicConfirmScreen`)

- Figma: **1m-12 `1576:8517`**
- 픽스처: 인라인 (`서울OO병원 내과` / `서울 관악구 남부순환로 1820, 3층` / 2026-09-12)
- 위→아래: NavBar → 질문 `진료 받은 병원이 맞나요?` → 설명 `%s 일정에 등록해둔 병원이에요.\n다른 곳에서 진료받았다면 바꿀 수 있어요.` → 병원 이름 + 주소 → 하단 `이 병원이 맞아요`(주) / `다른 병원이에요`(보조)
- DS 컴포넌트: `MedicalMateNavBar`(+`SurfaceStyle`) · `MedicalMateDivider` · `MedicalMateBottomCtaBar` · `MedicalMateButton`(+`Size`, `Type`)
- 나가는 길: 주 버튼 → 진료 후 메모(1p) / 보조 → 병원 찾기(1m)

### 15.9 증상 정리 (`IntakeScreen` + `IntakeSteps`)

- Figma: 1l(부위) / **1c-1**(문답) / 1c-2·1c-3·1c-4 / 1i(추가 질문) / **1c-5**(완료)
- 픽스처: `previewChatState` 및 파생 5종
- 위→아래: NavBar(`기록`) → 진행 표시(`1 / 4`) → 단계별 본문 → 하단(문답이면 입력칸, 나머지는 `다음`)
- DS 컴포넌트: `MedicalMateNavBar`(+`SurfaceStyle`) · `MedicalMateProgressIndicator` · `MedicalMateBubble` · `MedicalMateTextField` · `MedicalMateIconButton` · `MedicalMateNotice` · `MedicalMateSectionHeader` · `MedicalMateSeveritySlider` · `MedicalMateSeverityReadout` · `MedicalMateBottomCtaBar` · `MedicalMateButton` · `MedicalMateVoiceInput`
- 나가는 길: 뒤로(첫 단계면 흐름 이탈, 인체도 확대 중이면 앵커로) / `다음` × 4 → 완료(1c-5) → `브리핑 카드 만들기` 또는 `진료받을 병원 먼저 찾기`
- **시안에 문답을 끝내는 조작이 없다.** `chatFinished`가 서면 입력칸 위에 `다음`이 함께 뜨는 것으로 넣었다(#69).

### 15.10 일정 추가 (`ScheduleAddScreen`)

- Figma: **1r-4 `1062:3031`** / 1r-4-B(병원 채워짐) / 1r-4-C / 1r-4-D(날짜 시트) / 1r-4-T(시간 시트)
- 픽스처: `previewScheduleAddState`
- 위→아래: NavBar(`일정 추가`) → `병원` PickerField → `날짜 · 시간` 두 칸 → `가져갈 브리핑 카드`(고른 수) + `새 카드 만들기` → `진료 전 할 일` + `할 일 추가` → 하단 `저장하기`
- DS 컴포넌트: `MedicalMateNavBar`(+`NavLeading`) · `MedicalMatePickerField` · `MedicalMateSectionHeader` · `MedicalMateCardPick` · `MedicalMateTodoRow` · `MedicalMateAddRow` · `MedicalMateRowDelete` · `MedicalMateBottomCtaBar` · `MedicalMateButton`
- 나가는 길: 뒤로 → 앞 화면 / 병원 칸 → 병원 찾기(SCHEDULE) / 날짜·시간 칸 → 바텀 시트 / `새 카드 만들기` → 증상 정리 / 저장 → 캘린더 월

### 15.11 기록 탭 · 카드 목록 · 기록 상세

| 화면 | Figma | 픽스처 | 주요 DS 컴포넌트 |
|---|---|---|---|
| 기록 탭 | **1j-1 `406:2569`**, 빈 **1j-2 `406:2646`**, 편집 1j-1-D·D2 | `previewRecordGroups` | `MedicalMateNavBar`(+`NavLeading`) · `MedicalMateTabBar`(+`Tab`) · `MedicalMateBottomCtaBar` · `MedicalMateButton`(DANGER) · `MedicalMateDialog` · `MedicalMateEmptyState`(+`Type`) · `MedicalMateLoadingSpinner` |
| 카드 목록 | **1j-4 `1122:4830`**, 편집 1j-4-D2 | `previewBriefCardGroups` | 위와 동일 계열 |
| 기록 상세 | **1j-3 `735:3829`**, 펼침 **1j-3-X `1038:2768`**, 재방문 **1j-3-R `1039:2799`** | `recordDetailFixtures` 5건 | `MedicalMateNavBar`(+`SurfaceStyle`) · `MedicalMateBadge` · `MedicalMateEmptyState`(+`Type`) · `MedicalMateLoadingSpinner` |

기록 탭 나가는 길: 줄 탭 → 기록 상세 / `이어서 정리하기` → 문답 복원 / 탭바 → 홈·캘린더 / 편집 → 삭제 확인
기록 상세 나가는 길: 뒤로 → 목록 / `카드 전체 보기` ↔ `접기`(**화면을 옮기지 않는다** — 훑다가 카드를 확인하는 일이라 이동하면 보던 자리를 잃는다)

### 15.12 내 정보 · 건강 정보 수정 · 신상정보 등록 · 온보딩 · 로그인 · 스플래시

| 화면 | Figma | 픽스처 |
|---|---|---|
| 내 정보 | **1s-1 `407:2375`** | `previewMyProfile` |
| 건강 정보 수정 | **1s-2 `407:2650`** | `previewHealthEdit` |
| 신상정보 등록 | **1b-1 `398:1225`** / 1b-2 `398:1285` / 1b-3 `398:1341` | `ProfileSetupScreenPreview` 인라인 |
| 신상정보 완료 | **1b-4 `676:2519`** | 인자 없음 |
| 온보딩 4장 | **V2-00 `1320:4570` ~ V2-03 `1320:4675`** | `OnboardingPage` enum |
| 로그인 | **V2 `1320:4558`**(Hero), 1o(버튼·Legal) | `LoginUiState` 5종 |
| 스플래시 | **V2 `1320:4553`** | 인자 없음 |

---

## 16. 웹 포팅에서 어려운 지점

1. **3D 인체도(`BodyMap3d*` 9개 파일)가 통째로 안 넘어온다.** 앵커/서피스 ID(`ANC:014`, `SUR:091`)로 도는 자체 렌더러 + 피킹 + 카메라다. 데모 9번은 "앞면 → 복부 점 탭"뿐이라 **SVG 인체 실루엣 + 절대위치 핫스팟 몇 개**로 충분하다. 목록에서 고르기(`body_map_use_list`)를 기본 대안으로 살려 두면 실패해도 시연이 안 끊긴다.
2. **`MedicalMateScreenPreviews`의 fontScale 2.0이 웹에 그대로 없다.** 안드로이드는 sp가 시스템 배율을 따르지만 웹은 rem/브라우저 확대다. 컨테이너 고정폭 + `rem` 단위 + `min-height` 대신 `min-block-size: auto`로 두고, 360폭 × 200% 확대에서 하단 CTA가 안 잘리는지 수동 확인해야 한다.
3. **날짜·요일·오전/오후 포맷이 `java.time` + `Locale.KOREAN`에 묶여 있다.** `M월 d일 (E)` → `9월 26일 (토)`, `a h:mm` → `오전 10:30`, `yyyy년 M월`, `MM.dd`, `yyyy.MM.dd` 다섯 가지를 웹에서 만들어야 한다. `Intl.DateTimeFormat("ko-KR")`이 `오전 10:30`은 주지만 `(토)` 괄호 요일은 직접 조립해야 한다. **포맷 함수를 한 파일에 모아 두고 목데이터에는 이미 만들어진 문자열(`onLabel`, `timeLabel`)도 함께 넣어 뒀다.**
4. **한글 조사 규칙(`withSubjectParticle`)을 옮겨야 한다.** `복부가` / `무릎이`를 종성 유무로 고른다. 문구 하드코딩으로 넘기면 부위가 25가지로 늘 때 깨진다.
5. **`\n`이 박힌 문자열이 많다.** `login_title`, `onboarding_*_description`, `visit_note_heading`, `intake_severity_description`, `hospital_pick_description_before`, 그리고 `VisitRecordItem.value` 안에도 있다. 전역 `white-space: pre-line` 규칙을 잡아야 한다.
6. **바텀시트·툴팁·토스트가 안드로이드 관례다.** 카드만 있는 날 시트(1r-1-S), 날짜/시간 시트(1r-4-D/T), 알러지 툴팁(1b-3), 실행 취소 토스트. 웹에서는 `<dialog>` + backdrop / 하단 슬라이드 패널로 낮추되, **툴팁은 hover가 아니라 탭으로 열고 닫아야 한다**(시나리오 7번이 "한 번 열고 닫기"를 요구한다).
7. **음성 입력(`MedicalMateVoiceInput`, 4상태)은 데모에서 안 쓴다**(시나리오가 "전부 텍스트 입력, STT 미사용"). 하지만 화면에 마이크 자리가 있으므로 `voiceAvailable = false`로 두고 버튼을 아예 안 그리는 게 맞다 — 앱 주석도 "눌러 봐야 안 되는 버튼을 두는 것보다 낫다"고 한다.
8. **상태 이름이 화면마다 미묘하게 다르다.** `status`(DRAFT/BEFORE_VISIT/CONFIRMED)와 `visited`가 **다른 축**이고, 배지는 `visited`가 읽는다. 카드 확정(`CONFIRMED`)인데 `visited=false`면 배지는 `진료 전`이다. 웹에서 한 필드로 합치면 "진료 전에 진료 완료 배지"가 뜬다.
9. **편집 상태를 "사본 존재"로 표현한다.** `todoDraft != null`, `draft != null`, `selectedIds != null`. 별도 `isEditing` 불리언을 두면 "편집 중인데 사본이 없는" 상태를 만들 수 있다. React에서도 `draft: T | null` 패턴을 유지하는 게 안전하다.
10. **`RecordItem.detail`이 서버에 없다.** 웹 목데이터가 채워 넣는 값이므로, 나중에 API를 붙이면 그 줄이 사라진다. 데모용이라는 주석을 코드에 남겨야 한다.

---

## 17. 열린 질문

1. **브리핑 카드 줄 이름을 어느 쪽으로 쓸 것인가.** 앱 `CardMapping.axisLabel()`은 `부위 / 시작 / 양상 / 뻗치는 곳 / 동반증상 / 경과 / 심해질 때`이고 순서도 `AXIS_ORDER`다. 시나리오 §5는 `부위 / 시작 / 느낌 / 경과 / 악화 / 퍼짐 / 동반` 순서다. 목데이터는 앱 라벨을 `key`, 시나리오 라벨을 `scenarioLabel`로 둘 다 실었다. **어느 쪽을 화면에 그릴지 결정 필요.**
2. **26번 D-day가 D-7인가 D-10인가.** 앱은 `today(2026-09-15)`와 일정일(2026-09-25)의 차 = **D-10**을 그린다. 시나리오는 D-7(진료일 09-18 기준)로 적혀 있다. 21번의 D-3은 today 기준이라 앱 계산과 일치하므로, 26번 쪽이 오기일 가능성이 높다. 목데이터에 `chip: "D-10"` / `chipScenario: "D-7"` 둘 다 넣어 뒀다.
3. **병원 주소를 실제 값으로 채울 것인가.** 지금은 5곳 모두 플레이스홀더다. 실제 심평원 주소를 쓰려면 `GET /api/hospitals`를 한 번 호출해 받아 박아야 한다. 안 쓸 거면 `address`를 빈 문자열로 두면 앱 규칙대로 주소 줄이 사라진다.
4. **`고OO`의 생년을 몇으로 고정할 것인가.** 34세만 주어져 1992로 잡았다. 내 정보 화면에 `1992년생`이 뜨는데 데모에서 내 정보 탭은 안 보여주므로 영향 범위는 작다.
5. **브리핑 카드의 `강조(emphasized)` 줄을 무엇으로 할 것인가.** 앱 픽스처는 `기간`(= `onset`)을 강조한다. 데모 카드도 `시작`을 강조하도록 뒀는데, "3주 · 악화"가 이 진료의 핵심이라는 판단이다. 다르게 볼 여지가 있다.
6. **AI 추천 질문 문구를 앱 픽스처 그대로 쓸지, 이번 증상에 맞춰 새로 쓸지.** 지금은 소스에 있는 세 개 중 둘을 그대로 썼다. "위염 의심"에 더 맞는 문구(예: 내시경 관련)가 필요하면 새로 만들어야 하고, 그러면 소스 근거가 없어진다.
7. **`진료 전 할 일` 기본값이 정말 없는 게 맞는가.** `CalendarFixtures.fixtureTodos` 3개가 Preview 전용이라는 주석은 명확한데, 서버가 일정 생성 시 기본 할 일을 내려주는지는 `CreateAppointmentRequest`만으로 확정할 수 없다. 데모는 빈 상태에서 3개를 추가하는 것으로 잡았다.
8. **기록 목록의 보조 줄(detail)을 데모에서 보여줄 것인가.** 서버 응답에 없는 값이다. 28번 "기록 목록 · `복부 통증 · 진료 완료`"만 요구하므로 detail을 지워도 시나리오는 통과한다. 화면이 허전해 보이는 쪽과 실제 앱과 달라지는 쪽 중 선택이다.
9. **일자 화면 기록 줄에 규칙값을 쓸 것인가 시안값을 쓸 것인가**(§11.8 · 검수에서 새로 나온 항목). `RECORD_META_AXES`가 만드는 값은 `위염 초기 · 위산약 2주 · 일주일 뒤 재방문 (9월 25일 전후)`이고 시안이 그리는 꼴은 `위염 초기 · 위산약 2주 · 09.25 재방문`이다. 앱 픽스처도 시안 쪽을 손으로 적어 뒀다. 규칙값을 쓰면 앱 로직과 같지만 한 줄이 길고, 시안값을 쓰면 짧지만 코드로 만들어 낼 근거가 없다. JSON은 `meta`(규칙) / `metaShorthand`(시안) 둘 다 들고 있다.
10. **`previewCalendarDayConfirmedState`에서 `clinic`이 사라지는 것이 의도인가**(§2.3 · 검수 항목). 확정 전 `fixtureNextEvent`에는 `서울OO병원 내과`가 있는데 확정본에는 없다. 픽스처의 실수로 보고 웹에서는 유지하기로 뒀지만, 시안 1r-2-A2가 병원 이름을 안 그리는 것일 수도 있다. 프레임 확인이 필요하다.
