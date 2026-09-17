# 증상 문답 · 통증 강도 · 추가 질문 (1c, 1d, 1i, 1c-5)

## 웹앱 구현 메모

- 모바일 폭 고정(콘텐츠 폭 360~420px, 좌우 gutter 20px)을 권한다. 말풍선 최대 폭 280px, 마이크 88px, 하단 CTA 바 높이 92px가 전부 모바일 절대값이라 데스크톱으로 늘리면 레이아웃이 깨진다.
- 1c/1d/1i는 **한 화면(한 라우트)**의 4단계다. 웹에서도 `/intake` 하나에 `step` 상태를 두고, 진행 표시를 본문 첫 줄에 넣어 함께 스크롤시켜야 안드로이드와 같아진다.
- 애니메이션은 두 개뿐이다 — 대기 점 셋(900ms 주기, 3등분 offset)과 슬라이더 thumb 추종. 둘 다 `prefers-reduced-motion`으로 끄면 된다(안드로이드도 `ANIMATOR_DURATION_SCALE == 0`이면 멈춘다).
- STT는 안드로이드가 ML Kit GenAI(기기 내 처리, 오디오 외부 전송 없음)다. 웹에는 동등한 것이 없다 — Web Speech API는 브라우저에 따라 서버로 오디오를 보내므로 **개인정보 경계가 달라진다**. `voiceAvailable=false` 경로(마이크 버튼 미표시 + 텍스트 입력만)를 기본으로 두고 음성은 옵션으로 붙이는 것이 안전하다.
- 제스처는 슬라이더 드래그 하나. 나머지는 전부 탭이라 클릭으로 그대로 옮겨진다. IME(키보드) 인셋 대응은 웹에서 `visualViewport` 이벤트로 대체한다.

---

## 1. 이 영역이 무엇인가

`IntakeScreen` 하나가 **증상 정리 4단계**를 전부 그린다. 상단 내비바와 진행 표시, 하단 CTA 영역이 4단계 공통이고, 가운데 본문만 단계에 따라 바뀐다.

| 단계 | `IntakeStep` | 와이어프레임 | 본문 Composable | 이 문서 담당 |
|---|---|---|---|---|
| 1/4 아픈 부위 | `BODY_PART` | 1l (1l-1·1l-2·1l-3) | `BodyPartStep` | ✗ (인체도 문서) |
| 2/4 증상 문답 | `SYMPTOM_CHAT` | 1c (1c-1·1c-2·1c-3·1c-4) | `ChatStep` | ✓ |
| 3/4 통증 강도 | `SEVERITY` | 1d | `SeverityStep` | ✓ |
| 4/4 추가 질문 | `QUESTIONS` | 1i | `QuestionsStep` | ✓ |
| (끝) 정리 완료 | — (별도 라우트) | 1c-5 | `IntakeDoneScreen` | ✓ |

> 출처: `intake/ui/IntakeScreen.kt` 주석 "와이어프레임 1l·1c·1d·1i. 증상 정리 네 단계를 한 화면이 그린다.", `core/model/IntakeStep.kt`

### Figma 화면 id (소스 주석에 적힌 값 그대로)

| 화면 | Figma id | 출처 파일 |
|---|---|---|
| 1c-1 증상 문답(첫 진입) | `402:1629` | `IntakeChat.kt` `ChatStep` KDoc |
| 1c-2 증상 문답(글 입력) | `402:1506` | `IntakeChat.kt` `ChatStep` KDoc |
| 1c-3 · 1c-4 음성 입력 | (id 없음, 이름만) | `IntakeUiState.kt` `IntakeInputMode`, `SpeechToText.kt` |
| 짚은 부위 칩 영역 | `402:1651` | `IntakeChat.kt` `BodyPartContext` KDoc |
| 말풍선(Bubble) 마스터 | `313:999` | `IntakeUiState.kt` `IntakeMessage` KDoc |
| Voice Input 마스터 | `313:993` | `VoiceInput.kt` `MedicalMateVoiceState` KDoc |
| 1d 통증 강도 | `402:1934` | `IntakeSteps.kt` `SeverityStep` KDoc |
| Severity Slider 마스터 | `339:1293` | `SeverityInputs.kt` |
| Severity Readout 마스터 | `333:1126` | `MedicalMateSeverity.kt` |
| 1i 추가 질문 | `489:5606` | `IntakeSteps.kt` `QuestionsStep` KDoc |
| Progress Indicator(라벨형) | `334:1139` | `ProgressIndicator.kt` `LabeledProgress` KDoc |
| 1c-5 정리 완료 | `1041:3655` | `IntakeDoneScreen.kt` KDoc |
| 1c-5 아이콘 원 | `1041:3663` | `IntakeDoneScreen.kt` |
| Bottom CTA Bar 마스터 | `294:652` | `BottomCtaBar.kt` |
| Notice 마스터 | `292:668` | `Notice.kt` |

---

## 2. 상태 (UiState) — TypeScript로 그대로 옮길 표

### 2-1. `IntakeUiState` (`intake/ui/IntakeUiState.kt`) — 모든 필드

| 필드 | Kotlin 타입 | 기본값 | 의미 (소스 주석 근거) |
|---|---|---|---|
| `step` | `IntakeStep` | `BODY_PART` | 현재 단계. 4단계가 한 상태에 모여 있다 |
| `bodyPart` | `String?` | `null` | 1단계에서 고른 부위의 사람이 읽는 이름. 문답 첫 마디와 3단계 질문 문장에 들어간다 |
| `bodyMap` | `BodyMapUiState` | `BodyMapUiState()` | 인체도 단계의 하위 상태 (2-4절 참고) |
| `messages` | `List<IntakeMessage>` | `emptyList()` | 문답 말풍선 목록 |
| `draft` | `String` | `""` | 입력 중인 글. 글 입력과 음성 받아쓰기가 같은 칸을 쓴다 |
| `inputMode` | `IntakeInputMode` | `TEXT` | 글(1c-2) / 음성(1c-3·1c-4) |
| `voice` | `MedicalMateVoiceState` | `IDLE` | 음성 패널 상태 |
| `voiceAvailable` | `Boolean` | `false` | 이 기기에서 음성을 쓸 수 있는지. **false면 입력칸의 마이크를 아예 그리지 않는다** — "이 기기에서는 안 돼요" 문구는 시안에 없다 |
| `awaitingReply` | `Boolean` | `false` | 서버 응답 대기. 1c-4의 점 세 개가 이 상태다 |
| `severity` | `MedicalMateSeverity` | `LEVEL_3` | 3단계에서 고른 통증 강도 |
| `questionDraft` | `String` | `""` | 4단계 질문 입력칸의 글 |
| `questions` | `List<String>` | `emptyList()` | 적어둔 질문. AI 추천 후보도 여기 채워진다 |
| `chatFinished` | `Boolean` | `false` | 문답이 끝났는지(서버의 `ended`). 서면 하단에 "다음" 버튼이 함께 나온다 |
| `completed` | `Boolean` | `false` | 4단계까지 마쳤는지. 서면 1c-5로 이동 |
| `sessionId` | `Long?` | `null` | 서버 문답 세션 id. 임시저장의 열쇠. **세션 생성이 실패해도 문답은 진행하므로 `null`일 수 있다** |
| `restoring` | `Boolean` | `false` | 홈의 "이어서 하기"로 들어와 서버에서 불러오는 중인지 |
| `restoreFailed` | `Boolean` | `false` | 불러오지 못했는지 |
| `sendFailed` | `Boolean` | `false` | 보낸 말이 서버에 닿지 못했는지. **보낸 말은 화면에 남긴다. 다시 보내는 조작은 아직 없다** |

### 2-2. `IntakeUiState`의 파생 값 (getter) — 전부 옮겨야 함

| 이름 | 타입 | 계산식 (소스 그대로) |
|---|---|---|
| `canGoBack` | `Boolean` | `step != IntakeStep.entries.first() \|\| bodyMap.focus != null` |
| `canLeaveBodyPart` | `Boolean` | `bodyMap.selection != null` |
| `bodyPartSubject` | `String` | `bodyPart?.let { withSubjectParticle(it) }.orEmpty()` — 주격 조사를 붙인 부위 이름 |
| `canSend` | `Boolean` | `draft.isNotBlank() && !awaitingReply` |
| `speaking` | `String?` | `draft.takeIf { inputMode == VOICE && it.isNotBlank() }` — 말하는 중인 글 |
| `canAddQuestion` | `Boolean` | `questionDraft.isNotBlank()` |

### 2-3. 조사 계산 `withSubjectParticle` — 웹에도 그대로 필요

부위 이름이 25가지라 조사를 문자열에 박아 두면 "무릎가"가 된다. 문구는 리소스에 두고 조사는 상태가 계산한다.

```kotlin
internal fun withSubjectParticle(word: String): String {
    val syllable = word.lastOrNull { it.code in 0xAC00..0xD7A3 } ?: return "${word}이"
    val hasFinalConsonant = (syllable.code - 0xAC00) % 28 != 0
    return if (hasFinalConsonant) "${word}이" else "${word}가"
}
```

TypeScript 이식:

```ts
function withSubjectParticle(word: string): string {
  const syllables = [...word].filter(c => c.charCodeAt(0) >= 0xac00 && c.charCodeAt(0) <= 0xd7a3);
  const last = syllables[syllables.length - 1];
  if (!last) return `${word}이`;
  return (last.charCodeAt(0) - 0xac00) % 28 !== 0 ? `${word}이` : `${word}가`;
}
```

> 주의: 이름 끝에 괄호가 붙는 부위가 있어("가슴 옆(갈비)") **마지막 한글 음절**을 찾아서 본다. 단순히 `word[word.length-1]`을 보면 안 된다.

### 2-4. 참조 타입

```kotlin
data class IntakeMessage(val id: Long, val sender: Sender, val text: String) {
    enum class Sender { AI, PATIENT }
}

enum class IntakeInputMode { TEXT, VOICE }

enum class IntakeStep { BODY_PART, SYMPTOM_CHAT, SEVERITY, QUESTIONS }
// step.number = ordinal + 1, step.isLast = (step == QUESTIONS), IntakeStep.total = 4

enum class MedicalMateVoiceState { IDLE, LISTENING, PROCESSING, DENIED }

enum class MedicalMateSeverity(level, labelRes, descriptionRes, nrsFirst, nrsLast) {
    LEVEL_1(1, ..., 1, 2), LEVEL_2(2, ..., 3, 4), LEVEL_3(3, ..., 5, 6),
    LEVEL_4(4, ..., 7, 8), LEVEL_5(5, ..., 9, 10)
}
```

`BodyMapUiState`(1단계용, 이 문서 범위 밖이지만 `IntakeUiState`가 들고 있음):

| 필드 | 타입 | 기본값 |
|---|---|---|
| `view` | `BodyMapView` (`FRONT`/`BACK`) | `FRONT` |
| `focus` | `BodyMapSelection?` | `null` |
| `selection` | `BodyMapSelection?` | `null` |
| `byList` | `Boolean` | `false` |
| `byMap3d` | `Boolean` | `true` |
| `search` | `String` | `""` |
| `searchResults` | `List<BodyPartMatch>` | `emptyList()` |

`BodyMapSelection(anchorId: String, zoneId: String? = null, side: BodyMapSide = CENTER)`,
`BodyMapSide { CENTER, LEFT, RIGHT, BASE }`

### 2-5. TypeScript 타입 (그대로 붙여 쓸 수 있는 형태)

```ts
type IntakeStep = 'BODY_PART' | 'SYMPTOM_CHAT' | 'SEVERITY' | 'QUESTIONS';
type IntakeInputMode = 'TEXT' | 'VOICE';
type VoiceState = 'IDLE' | 'LISTENING' | 'PROCESSING' | 'DENIED';
type SeverityLevel = 1 | 2 | 3 | 4 | 5;

interface IntakeMessage { id: number; sender: 'AI' | 'PATIENT'; text: string; }

interface IntakeUiState {
  step: IntakeStep;
  bodyPart: string | null;
  bodyMap: BodyMapUiState;
  messages: IntakeMessage[];
  draft: string;
  inputMode: IntakeInputMode;
  voice: VoiceState;
  voiceAvailable: boolean;
  awaitingReply: boolean;
  severity: SeverityLevel;
  questionDraft: string;
  questions: string[];
  chatFinished: boolean;
  completed: boolean;
  sessionId: number | null;
  restoring: boolean;
  restoreFailed: boolean;
  sendFailed: boolean;
}
```

### 2-6. `IntakeCallbacks` (`intake/ui/IntakeScreen.kt`) — 화면이 밖으로 내보내는 조작 전부

상태와 짝을 이루는 콜백 묶음이다. **21개 전부**가 한 data class에 있고 기본값은 모두 `{}`(아무 일도 안 함)라 Preview에서 빈 것으로 넘긴다. 웹에서도 하나의 핸들러 객체로 내려보내는 편이 안드로이드와 같아진다.

| 콜백 | 시그니처 | 이 문서 범위 | 화면에서 연결되는 곳 (`IntakeDestination.kt`) |
|---|---|---|---|
| `onBackClick` | `() -> Unit` | ✓ | `if (state.canGoBack) viewModel.onBack() else onExit()` |
| `onNextClick` | `() -> Unit` | ✓ | `viewModel.onNext(severityLabel)` |
| `onBodyViewChange` | `(BodyMapView) -> Unit` | ✗ (1l) | `bodyMap::onViewChange` |
| `onBodyDotClick` | `(String) -> Unit` | ✗ | `bodyMap::onDotClick` |
| `onBodySideAnchorClick` | `(String) -> Unit` | ✗ | `bodyMap::onSideAnchorSelect` |
| `onBodyPartSelect` | `(BodyMapSelection) -> Unit` | ✗ | `bodyMap::onPartSelect` |
| `onBodyAnchorFocus` | `(BodyMapSelection) -> Unit` | ✗ | `bodyMap::onAnchorFocus` |
| `onBodyFocusClear` | `() -> Unit` | ✗ | `bodyMap::onFocusClear` |
| `onBodyListModeToggle` | `() -> Unit` | ✗ | `bodyMap::onListModeToggle` |
| `onBodyMap3dToggle` | `() -> Unit` | ✗ | `bodyMap::onMap3dToggle` |
| `onBodyReset` | `() -> Unit` | ✗ | `bodyMap::onReset` |
| `onBodySearchChange` | `(String) -> Unit` | ✗ | `bodyMap::onSearchChange` |
| `onDraftChange` | `(String) -> Unit` | ✓ | `viewModel::onDraftChange` |
| `onSendClick` | `() -> Unit` | ✓ | `viewModel::onSend` |
| `onVoiceClick` | `() -> Unit` | ✓ | `askVoiceMode` (권한 launcher) |
| `onMicClick` | `() -> Unit` | ✓ | `askMic` (권한 launcher) |
| `onTypeInsteadClick` | `() -> Unit` | ✓ | `{ viewModel.onInputModeChange(TEXT) }` |
| `onSeverityChange` | `(MedicalMateSeverity) -> Unit` | ✓ | `viewModel::onSeverityChange` |
| `onQuestionDraftChange` | `(String) -> Unit` | ✓ | `question::onDraftChange` |
| `onAddQuestionClick` | `() -> Unit` | ✓ | `question::onAdd` |
| `onRemoveQuestionClick` | `(Int) -> Unit` | ✓ | `question::onRemove` |

> 주석 근거: "파라미터로 하나씩 받으면 열 개가 넘는다. 단계마다 쓰는 것이 다르고 화면 하나가 전부를 들고 있어야 해서 한 덩어리로 묶었다."

- **`onVoiceClick`과 `onMicClick`은 ViewModel로 바로 가지 않는다.** 둘 다 권한 launcher를 거친다(5-5절).
- `IntakeScreen`은 `IntakeUiState` + `IntakeCallbacks` 둘만 받는 순수 Composable이다. 상태 보유자(`IntakeViewModel`)는 `IntakeRoute`가 들고 있고 화면은 모른다 → 웹에서도 프레젠테이션 컴포넌트와 컨테이너를 같은 선으로 나누면 된다.

---

## 3. 공통 껍데기 (4단계 전부)

위 → 아래 순서:

1. **NavBar** — `MedicalMateNavBar(title = "기록", onLeadingClick = onBackClick, surface = GLASS)`
   - 제목 문구: `기록`
   - leading 기본값은 `MedicalMateNavLeading.BACK`
2. **본문 영역** (`Box(weight = 1f)`) — 단계별 Composable
   - 본문 맨 위 첫 줄이 **진행 표시**다. 껍데기가 아니라 본문 안에 있어서 스크롤되면 함께 올라간다. (Figma가 각 화면의 `Content` 첫 줄에 뒀다)
3. **하단 CTA 영역** — `MedicalMateBottomCtaBar`

### 3-1. 진행 표시 `IntakeProgress`

```kotlin
MedicalMateProgressIndicator(
    current = step.number,       // 1..4
    total = IntakeStep.total,    // 4
    label = stringResource(R.string.intake_progress_label),  // "증상 정리"
)
```

`label`이 있으므로 `LabeledProgress` 변형(Figma `334:1139`)이 그려진다. 구조:

```
[Column, 간격 8]
  [Row, 세로 가운데]
     "증상 정리"            (bodyS, fg/subtle, weight 1)
     "2 / 4"               (bodySStrong, fg/primary)   ← progress_step_count = "%1$d / %2$d"
  [SegmentedBar]           ← total(4) ≤ 6이므로 칸 4개, 간격 4, 높이 6, radius full
     채운 칸: bg/primary (index < current)
     빈 칸:   bg/subtle
```

- 스크린리더는 `"증상 정리, 2/4 단계"` 한 번만 읽는다 (`progress_step` = `"%1$d/%2$d 단계"`).
  - 정확히는 `clearAndSetSemantics { contentDescription = "$label, $spoken" }` — **라벨과 단계 문구를 쉼표+공백으로 이어 붙인다.** 하위 노드(칸 4개, 숫자)의 접근성은 전부 지운다. "칸을 하나씩 읽으면 소리만 길어진다."
- 보이는 표기는 `"2 / 4"`(공백 있음), 읽는 문구는 `"2/4 단계"`(공백 없음)로 **서로 다르다**.
- **입력 검증이 있다.** `require(current in 1..total)`로, 범위를 벗어나면 그리지 않고 예외를 던진다(`"현재 단계는 1..4 범위여야 합니다. 받은 값: %d"`). 웹에서는 예외 대신 clamp 하더라도 같은 조건을 두는 편이 낫다.
- **`total > 6`이면 칸을 나누지 않고 연속 막대(`ContinuousBar`)로 바뀐다.** 증상 정리는 `total = 4`라 항상 `SegmentedBar`지만, 컴포넌트를 옮길 때는 이 분기도 함께 옮겨야 다른 화면에서 같은 것을 쓸 수 있다. (`SEGMENT_LIMIT = 6`)
- 라벨 없는 변형(`label == null`)은 **한 줄**이다 — `[막대(weight 1)] [간격 12] ["2/4 단계" labelM, fg/subtle]`, 최소 높이 34. 증상 정리는 이 변형을 쓰지 않는다.

### 3-2. 하단 CTA `IntakeFooter`

```kotlin
MedicalMateBottomCtaBar {
    when (state.step) {
        SYMPTOM_CHAT -> {
            if (state.chatFinished) { NextButton(onClick = onNextClick) }   // 위
            ChatInput(state, callbacks)                                      // 아래
        }
        BODY_PART -> NextButton(onClick = onNextClick, enabled = state.canLeaveBodyPart)
        else -> NextButton(onClick = onNextClick)      // SEVERITY, QUESTIONS
    }
}
```

- "다음" 버튼 라벨: `다음` (`intake_next`)
- **문답 단계만 특별하다.** 평소에는 입력칸(또는 음성 패널)만, 문답이 끝나면(`chatFinished`) **"다음" 버튼이 입력칸 위에 추가로** 나온다.
- 주석: "**시안에 문답을 끝내는 조작이 없다.** 그대로 두면 통증 강도로 갈 방법이 없어서 넣었고 디자인 트랙에 남겼다(#69)."

`MedicalMateBottomCtaBar` 규격 (웹 CSS로 옮길 값):

| 속성 | 값 |
|---|---|
| 높이 | 92 (= 위 여백 12 + L 버튼 56 + 아래 안전 여백 24) |
| padding | top 12, left/right 20(gutter), bottom 24(safeBottom) |
| 자식 간 간격 | 10 (1c-5의 두 버튼이 시안에서 10 떨어져 있다) |
| 배경 | `bg/surface` 불투명 + `Elevation/Float` 그림자 (기본 `OPAQUE`) |
| 테두리 | 없음 |

> 주석: GLASS(블러)는 compose-ui 1.10.5에 backdrop blur API가 없어 기본값을 불투명으로 뒀다. **웹은 `backdrop-filter: blur()`가 있으므로 원래 디자인 의도(Glass)를 되살릴 수 있다** — 판단 필요.

---

## 4. 2/4 증상 문답 (1c) — `ChatStep`

### 4-1. 레이아웃 (위 → 아래)

`LazyColumn` 하나다. contentPadding: 좌우 20(gutter), 위 12, 아래 16. 항목 간 간격 14.

```
[NavBar "기록"]                                       ← 공통
[LazyColumn — 스크롤 영역]
  1. IntakeProgress            key="progress"        ← "증상 정리  2 / 4"
  2. BodyPartContext           key="context"         ← bodyPart != null 일 때만
       [Row, 간격 8, 세로 가운데]
          "짚은 부위"  (bodyS, fg/subtle)
          MedicalMateChip(label = bodyPart, selected = true, onClick = {})
  3. 메시지들                  key=message.id
       AI    → 왼쪽 정렬, 면 없음, 위에 "AI" 라벨, 폭 fillMaxWidth
       환자  → 오른쪽 정렬, bg/primary-subtle 면, 라벨 없음
  4. 말하는 중인 글            key="speaking"        ← state.speaking != null 일 때만
       환자 말풍선과 같은 모양(오른쪽, 유색 면). 아직 id가 없다
  5. 대기 점 세 개             key="typing"          ← state.awaitingReply 일 때만
[BottomCtaBar]
  (chatFinished면) "다음" 버튼
  ChatInput — TEXT면 입력칸, VOICE면 음성 패널
```

### 4-2. 자동 스크롤 (웹에서 반드시 재현해야 함)

```kotlin
LaunchedEffect(state.messages.size, state.awaitingReply, state.speaking, state.inputMode, imeBottom) {
    val last = listState.layoutInfo.totalItemsCount - 1
    if (last >= 0) listState.animateScrollToItem(last)
}
```

트리거 5개: **메시지 수 / 대기 여부 / 말하는 중인 글 / 입력 모드 / 키보드(IME) 높이**.

주석 근거:
- "마디가 붙으면 끝으로 보낸다(#176). 그러지 않으면 방금 보낸 말과 AI의 답이 입력창 뒤에 남는다."
- "키보드 높이를 함께 보는 이유는, 마디가 늘지 않아도 키보드가 올라오면 보이는 높이가 줄어 마지막 마디가 가리기 때문이다."
- "말로 할 때도 같다(#190). 말하는 중인 글은 마디 수를 늘리지 않고 자라기만 하고, 음성 패널은 키보드보다 높아서 입력칸일 때보다 더 가린다."

→ 웹에서는 `window.visualViewport`의 `resize`를 `imeBottom` 대신 구독한다.

### 4-3. 말풍선 `MedicalMateBubble` (Figma `313:999`)

| | AI | 환자(PATIENT) |
|---|---|---|
| 정렬 | 왼쪽 (`Arrangement.Start`) | 오른쪽 (`Arrangement.End`) |
| 면 | **없음** (배경/테두리 둘 다 없음) | `bg/primary-subtle`, radius `md` |
| 발화자 라벨 | 위에 `"AI"` (labelS, fg/muted) | 없음 |
| 본문 typography | `bodyL`, `fg/default` | `bodyL`, `fg/default` |
| padding | 없음 (라벨-본문 간격 4) | 좌우 16, 위아래 12 |
| 최대 폭 | 280 | 280 |
| Row 폭 | `fillMaxWidth()` | 내용 폭 |

원칙(소스 주석): "환자의 말을 가장 강하게 보여준다(문서의 P5). 화면에서 유색 큰 면을 가진 유일한 요소가 환자의 말이다." / "AI를 브랜드 색으로 강조하지 않는다."

> 꼬리(tail): 문서는 환자 버블에 꼬리를 쓴다고 적었지만 **Figma 마스터에는 꼬리가 없다**. 구현은 마스터를 따라 모서리만 둥근 면으로 뒀다. → 웹도 꼬리 없이.
> 단, `IntakeChat.kt`·`IntakeUiState.kt`의 KDoc은 아직 "환자는 유색 면에 우하 꼬리다"라고 적고 있다. **주석이 오래된 것이고 실제 컴포넌트(`Bubble.kt`)에 꼬리가 없다.** 소스가 맞다.

구현 세부 (소스 그대로):

- 환자: `Surface(shape = MedicalMateRadius.md, color = bgPrimarySubtle, contentColor = fgDefault)` 안에 `Text(bodyL)` + `padding(horizontal = 16, vertical = 12)`. 바깥 `Modifier.widthIn(max = 280.dp)`.
- AI: `Column(spacedBy 4)` — `senderLabel`이 있을 때만 라벨 `Text(labelS, fgMuted)`를 먼저 그리고 그 아래 본문 `Text(bodyL, fgDefault)`. **Surface가 없다.** 역시 `widthIn(max = 280.dp)`.
- `senderLabel`은 컴포넌트 기본값이 `null`이다. 화면(`IntakeChat.MessageRow`)이 AI일 때만 `stringResource(R.string.intake_chat_ai)`를 넘긴다 — 환자에는 `null`.
- 최대 폭 주석: "AI 280x72, Patient 280x50이라 최대 폭이 같다."

> 소스 흠집: `IntakeChat.kt` 파일 맨 끝(290줄)에 `/** Figma 환자 버블의 반경과 같다. */` 주석만 남고 선언이 없다. 버블 반경은 `Bubble.kt`가 `MedicalMateRadius.md`로 들고 있다. 웹으로 옮길 때 이 파일에서 반경 상수를 찾지 말 것.

### 4-4. 대기 표시 `TypingRow` (1c-4의 점 세 개)

```
[Row, 왼쪽 정렬]          ← AI의 말이 설 자리. 면 없음
  [Row, padding vertical 14, 점 간격 4]
     점 × 3   크기 8dp, 원형, 색 fg/primary
```

애니메이션 규격(소스 상수 그대로):

| 상수 | 값 |
|---|---|
| `TYPING_DOTS` | 3 |
| `TypingDotSize` | 8.dp |
| `TypingDotLift` | 4.dp (위로 떠오르는 높이) |
| `TYPING_DOT_REST` | 0.4f (쉴 때 alpha) |
| `TYPING_CYCLE_MILLIS` | 900 |

keyframes: `0f at 0` → `1f at 900/6(=150ms)` → `0f at 900/3(=300ms)`, 나머지 600ms는 0 유지.
점마다 시작 offset = `900 / 3 * index` = 0ms, 300ms, 600ms.
`offset.y = -4dp * lift`, `alpha = 0.4 + 0.6 * lift`.

- **기기에서 애니메이션을 껐으면 움직이지 않는다**(`Settings.Global.ANIMATOR_DURATION_SCALE == 0`) → 웹은 `prefers-reduced-motion: reduce`.
- 접근성 이름: `답변을 준비하고 있어요` (`intake_chat_waiting`) — 점만으로는 스크린리더에 아무것도 전달되지 않아 `contentDescription`으로 붙인다.
- **AI 자리(왼쪽)에 둔다.** 오른쪽에 두면 "방금 보낸 것이 아직 안 갔다"로 읽힌다.

### 4-5. 하단 입력 `ChatInput`

#### TEXT 모드 (1c-2)

```kotlin
MedicalMateTextField(
    value = state.draft,
    onValueChange = onDraftChange,
    placeholder = "메시지 입력",
    onSend = onSendClick,                 // 키보드 엔터 = 보내기
    trailing = {
        Row(간격 4) {
            if (state.voiceAvailable) {
                IconButton(icon = Mic, contentDescription = "음성으로 답하기", onClick = onVoiceClick)
            }
            IconButton(icon = ArrowUp, contentDescription = "보내기",
                       style = GHOST, enabled = state.canSend, onClick = onSendClick)
        }
    },
)
```

- 필드 높이는 **고정 56이 아니라 `minHeight = controlLg(56)`**이다. 글자 크기 확대에서 잘리지 않게 늘어난다 → 웹도 `min-height`로.
- padding: 왼쪽 20 / 오른쪽 **4 (trailing이 있을 때만, 없으면 20)** / 위아래 4.
  - 주석: "오른쪽에 버튼이 붙으면 그 자리를 여백으로 두지 않는다. Actions 슬롯이 필드 안쪽 끝에 4만 남기고 붙어 있다." / "위아래 4는 48 버튼이 56 필드 안에 들어가고 남는 자리다."
- 본문과 trailing 사이 간격은 **12**(`Row(spacedBy s12)`), trailing 안쪽 버튼끼리는 4.
- 상태를 파라미터로 받지 않는다. **focus는 `interactionSource`, filled는 `value`, disabled는 `enabled`, error는 `errorText`가 각각 결정한다.** "상태를 따로 받으면 실제 값과 어긋날 수 있다." → 웹도 `state="focus"` 같은 prop을 두지 말 것.
- 기본 상태는 테두리 없는 `bg/subtle` 면. focus·filled면 `bg/surface` 면 + 테두리.
- 문답 입력칸은 `label` / `helperText` / `errorText`를 **하나도 쓰지 않는다.** 즉 에러 문구가 뜨는 자리가 없다.
- 엔터 키 IME 동작은 **적을 것이 없을 때도 그 자리를 지킨다** — "적는 동안 IME 동작이 바뀌면 키보드가 다시 뜨고 한글 조합이 끊긴다"(#176). 보낼 수 있는지는 받는 쪽(`onSend` 안의 `canSend`)이 판단한다.
- `voiceAvailable == false`면 마이크 아이콘 자체를 그리지 않는다.

#### VOICE 모드 (1c-3 · 1c-4)

```kotlin
MedicalMateVoiceInput(
    state = state.voice,
    onMicClick = onMicClick,
    onTypeInsteadClick = onTypeInsteadClick,
    description = "\"다음\"이라고 말하거나 버튼을 눌러주세요".takeIf { state.chatFinished },
)
```

구조 (위 → 아래, 가운데 정렬, 간격 12):

```
[Column, 가로 가운데 정렬, 세로 간격 12, fillMaxWidth]   ← 마스터 콘텐츠 폭 350
[마이크 버튼 — 지름 88(MedicalMateSize.mic), 원형 Surface(onClick)]
   IDLE/LISTENING → 면 bg/primary,  콘텐츠 fg/on-primary
   PROCESSING     → 면 bg/subtle,   콘텐츠 fg/muted, CircularProgressIndicator(iconLg=24), enabled = false
   DENIED         → 면 bg/danger,   콘텐츠 fg/danger, 아이콘 MicOff
   LISTENING일 때  → 6dp 브랜드 링(테두리 bg/primary-subtle), 아이콘이 Waveform으로 바뀜
   아이콘 크기는 세 상태 모두 iconLg(24)
[제목  headingS, fg/default, 가운데 정렬]
[설명  bodyS, fg/subtle  (DENIED일 때만 fg/danger), 가운데 정렬]
[Ghost S 버튼 "직접 입력할게요"]
```

- **`PROCESSING`에서만 버튼이 꺼진다**(`enabled = state != PROCESSING`). "정리 중에 다시 눌러 녹음이 겹치면 어느 말이 반영됐는지 알 수 없다." `DENIED`에서는 **눌린다** — 권한을 다시 물을 수 있어야 해서다.
- 파형은 원 **안에** 들어간다. "마스터가 그렇게 그린다. 원 위에 따로 띄우면 무엇을 누르면 멈추는지가 흐려지고, 듣는 중이라는 신호가 두 군데로 갈린다."

상태별 문구 (`MedicalMateVoiceState`가 들고 있다, Figma `313:993`):

| 상태 | 제목 | 설명 |
|---|---|---|
| `IDLE` | `말씀해 주세요` | `편하게 말씀하시면 제가 정리할게요` |
| `LISTENING` | `듣고 있어요` | `다 말씀하시면 버튼을 다시 눌러주세요` |
| `PROCESSING` | `정리하는 중이에요` | `잠시만 기다려 주세요` |
| `DENIED` | `마이크를 쓸 수 없어요` | `설정에서 마이크 권한을 켜주세요` |

- 문답이 끝나면(`chatFinished`) 설명 줄만 `"다음"이라고 말하거나 버튼을 눌러주세요`로 교체된다. **시안에 없는 문구라 디자인 트랙 확인 필요**라고 주석에 적혀 있다(#190).
- 마이크 버튼 접근성 이름: `LISTENING`이면 `말하기 끝내기`, 나머지는 `말하기 시작`.
- 파형은 `LISTENING`에서만, **정지 막대이고 애니메이션은 없다**.
- **모든 상태에 "직접 입력할게요"가 같은 자리에 남는다.** "조용한 곳이 아니거나 목소리가 잘 안 나오는 환자에게 음성만 남기면 앱을 쓸 수 없다."

---

## 5. 음성 입력(STT) 처리 — `IntakeVoiceActions` + `Dictation` + `SpeechToText`

### 5-1. 엔진

`core/speech/SpeechToText.kt` — **ML Kit GenAI SpeechRecognition**이다. Android 기본 `SpeechRecognizer`가 아니다.

- 이유(주석): "**오디오가 기기 밖으로 나가지 않는다.** 진료에서 들은 말을 다루는 앱이라 그 점이 이 선택의 이유다."
- locale `Locale.KOREA`, mode `MODE_BASIC` (Advanced는 일부 기기 전용).
- 사용 가능 조건: `Build.VERSION.SDK_INT >= 31(S)` **그리고** `checkStatus()`가 `AVAILABLE / DOWNLOADABLE / DOWNLOADING` 중 하나.
- 모델이 없으면 **처음 쓸 때 한 번** 다운로드한다 → 그동안 `SpeechChunk.Preparing` → 화면은 `PROCESSING`. "화면을 열 때가 아니라 여기서 받는 이유는, 미리 받으면 쓰지도 않을 사람의 데이터를 쓰기 때문이다."
- 마이크를 직접 잡지 않고 `AudioSource.fromMic()`에 맡긴다.

`SpeechChunk` 4종:

| | 의미 | 화면 반응 |
|---|---|---|
| `Preparing` | 모델 받는 중 | `voice = PROCESSING` |
| `Partial(text)` | 말하는 중 갱신값. **앞선 것을 갈아끼워야 한다** | `voice = LISTENING`, draft = committed + text |
| `Final(text)` | 확정된 발화 | `voice = LISTENING`, committed += text, draft = committed |
| `Failed` | 못 알아들었거나 기기가 거절 | `voice = IDLE`, **적던 글은 그대로 둔다** |

`listen()`이 `Failed`를 내는 경우는 세 가지다 (전부 같은 화면 반응 — `IDLE`로 되돌아갈 뿐 아무 문구도 뜨지 않는다):

1. `Build.VERSION.SDK_INT < 31` — `available()`을 이미 봤지만 "그 확인과 이 호출 사이가 벌어져 있고, 막지 않으면 API 31 미만에서 없는 것을 부른다."
2. 모델 다운로드 실패 (`Preparing` → `download()`가 `DownloadCompleted`를 못 받음)
3. 인식기가 `ErrorResponse`를 냄

`Preparing`은 **`checkStatus() == AVAILABLE`이 아닐 때만** 나온다. 이미 받아 둔 기기에서는 한 번도 안 나온다.
`stop()`은 `recognizer?.stopRecognition()`을 `runCatching`으로 감싼다 — 실패해도 조용하다.

### 5-2. 이어붙이기 규칙 (`Dictation`)

- 듣기 시작할 때의 글(`base`)을 `committed`에 기억하고 그 뒤에 붙인다. "부분 결과는 말하는 중에 계속 갱신되는 값이라 이어 붙이면 같은 말이 여러 번 쌓인다."
- `Final`이 오면 `committed`를 옮긴다. "말이 끊겼다 이어져도 앞말이 남는다. 인식기는 잠깐 멈추면 그 발화를 확정하고 다음 발화를 처음부터 다시 센다."
- 붙일 때 공백 처리:
  ```kotlin
  fun String.join(next: String) = when {
      isEmpty() -> next
      next.isEmpty() -> this
      last().isWhitespace() -> this + next
      else -> "$this $next"
  }
  ```
  이유: "발화가 끊기면 인식기가 앞뒤를 붙여 주지 않아 '위염이래요약을받았어요'가 된다."
- `listening`은 `voice` 상태가 아니라 **코루틴 Job이 살아 있는지**(`job?.isActive == true`)로 판단한다. "IDLE이어도 듣고 있을 수 있다."
- IDLE = "아직 아무것도 못 들었다", LISTENING = "말소리가 들어오기 시작했다".

`Dictation`의 수명 (웹에서 그대로 옮겨야 하는 순서):

| 함수 | 하는 일 (소스 순서 그대로) |
|---|---|
| `start(base)` | ① **이미 듣는 중이면 아무 일도 하지 않고 돌아간다**(`if (listening) return`) — 중복 시작 방지 ② `committed = base` ③ `voice = IDLE` ④ `speech.listen()` 수집 시작 ⑤ **흐름이 끝나면 다시 `voice = IDLE`** |
| `stop()` | `job.cancel()` → `job = null` → `speech.stop()`(별도 코루틴) → `voice = IDLE` |
| `onDenied()` | `voice = DENIED`만. **듣던 Job은 건드리지 않는다** |
| `toggle(base)` | 듣는 중이면 `stop()`, 아니면 `start(base)`. **문답 화면은 이것을 쓰지 않는다** — `IntakeVoiceActions.onMicClick`이 "멈추고 보내기"까지 해야 해서 직접 갈랐다. 진료 후 메모(1p)가 쓴다 |

- `onDictated(text, latest)`는 **두 값을 함께 준다** — 화면에 넣을 글 전체(`text`)와 방금 들어온 발화(`latest`). 명령 판정은 `latest`만 본다(5-4절).

### 5-3. 음성 대화 한 바퀴 (`IntakeVoiceActions`)

| 조작 | 동작 |
|---|---|
| 입력칸의 마이크 (`onVoiceMode`) | `inputMode = VOICE`, `voice = IDLE`로 바꾸고 **즉시 듣기 시작**. "패널이 뜨자마자 말한다. 한 번 더 눌러야 듣기 시작하면 그 사이에 한 말이 사라진다." |
| 패널 안의 마이크 (`onMicClick`) | 듣는 중이면 **멈추고 그 자리에서 보낸다**(`VoiceCommand.SEND`). 듣는 중이 아니면 다시 듣는다 |
| AI가 답했을 때 (`onReplied`) | **`inputMode == VOICE`면 무조건 다시 듣기 시작**(`start("")`). 글 모드면 아무 일도 하지 않는다. `start("")`라 **받아쓰기 기준이 빈 글로 리셋된다** — 이미 보낸 뒤라 이어 붙일 앞말이 없다 |
| 권한 거부 (`onDenied`) | `voice = DENIED`. 패널은 열어 두고 왜 안 되는지를 적는다. **듣던 Job은 멈추지 않는다** |
| "직접 입력할게요" | `onInputModeChange(TEXT)` → `voice.stop()` 먼저, 그 다음 `inputMode = TEXT` + `voice = IDLE` (ViewModel이 두 단계로 한다) |
| 화면 진입 (`check`) | `speech.available()`을 물어 `voiceAvailable` 갱신 |

> **소스 대조 결과 — 주석과 코드가 어긋난다.** `onReplied`의 KDoc은 "글로 답하는 중이거나 **문답이 끝났으면** 다시 듣지 않는다 — 끝난 뒤에도 켜 두면 다음 화면으로 가는 동안 녹음이 남는다"라고 적었지만, 실제 코드에는 `chatFinished` 검사가 **없다**:
>
> ```kotlin
> fun onReplied() {
>     if (state().inputMode != IntakeInputMode.VOICE) return
>     dictation.start("")
> }
> ```
>
> 그리고 **없는 것이 맞다.** 문답이 끝난 뒤에도 계속 들어야 "다음" 음성 명령(5-4절)이 들어온다. 끊으면 `voice_next_hint`("\"다음\"이라고 말하거나 버튼을 눌러주세요")가 거짓말이 된다. 듣기를 실제로 끊는 자리는 `isNextCommand()`가 걸렸을 때의 `dictation.stop()`과 "직접 입력할게요"뿐이다.
> → **웹에서는 코드 쪽을 따라라.** 주석은 오래된 것이다. (18절 미확인 목록에 추가)

### 5-4. 음성 명령 "다음"

문답이 끝난 뒤(`chatFinished`)에만 듣는다. **방금 들어온 발화(`latest`)만** 본다 — "이어 붙인 글로 보면 앞에 다른 말을 한 뒤에는 '다음'이라고 해도 걸리지 않는다."

```kotlin
private fun String.isNextCommand(): Boolean {
    val word = filterNot { it.isWhitespace() || it in ".,!?" }
    return word.startsWith("다음") && word.length <= 6
}
```

- 공백과 `.,!?`를 제거한 뒤 `"다음"`으로 시작하고 길이 6자 이하일 때만 명령으로 본다.
- 통과 예: `다음`, `다음이요`, `다음으로`. 불통과 예: `다음 주에 다시 올게요`("그냥 포함 여부로 보면 걸린다").
- 걸리면 `dictation.stop()` 후 `VoiceCommand.NEXT` → `onNext("")`.
- 그 밖의 말은 "적히기만 하고 아무 일도 하지 않는다."

### 5-5. 권한

`rememberMicPermission`으로 감싼다. **화면을 열자마자 묻지 않고 마이크를 누를 때 묻는다.** 두 개의 permission launcher가 있다:

- `askMic` → granted면 `voice.onMicClick`
- `askVoiceMode` → granted면 `voice.onVoiceMode`
- 둘 다 denied면 `voice.onDenied`

동작 (`core/speech/MicPermission.kt`):

```kotlin
val already = ContextCompat.checkSelfPermission(context, RECORD_AUDIO) == PERMISSION_GRANTED
if (already) onGranted() else launcher.launch(RECORD_AUDIO)
```

- **이미 허용돼 있으면 시스템 대화상자를 띄우지 않고 곧바로 `onGranted()`를 부른다.** 즉 두 번째부터는 마이크 탭 한 번에 바로 듣기가 시작된다. 웹의 `getUserMedia`도 두 번째부터는 프롬프트 없이 통과하므로 같은 모양이 된다.
- 권한 요청은 Activity가 필요해 **화면이 맡는다**. ViewModel은 `Context`를 모른다 → 웹에서도 권한 호출을 상태 계층이 아니라 컴포넌트 계층에 두면 경계가 같아진다.
- 요청하는 권한은 `android.permission.RECORD_AUDIO` 하나다.
- 두 launcher를 나눈 이유: granted 뒤에 할 일이 다르다(패널을 새로 여는 것 vs 패널 안에서 듣기 토글).

> **웹 포팅**: `navigator.mediaDevices.getUserMedia({audio:true})`가 권한 프롬프트를 겸한다. 브라우저 권한 API에는 "denied 상태 유지"가 있으므로 `DENIED` 패널 상태를 그대로 쓸 수 있다.

---

## 6. 3/4 통증 강도 (1d) — `SeverityStep`

### 6-1. 레이아웃 (위 → 아래)

`StepContent` 껍데기: 세로 스크롤, padding 좌우 20 / 위 12 / 아래 16, 항목 간격 14.

```
[NavBar "기록"]
[스크롤 본문]
  1. IntakeProgress                                  ← "증상 정리  3 / 4"
  2. 제목   "{부위}가 얼마나 아프세요?"   headingL, fg/default
  3. 설명   "지금 느끼는 정도를 골라주세요.
            정확한 숫자가 아니어도 괜찮아요."        bodyM, fg/subtle
  4. MedicalMateSeveritySlider
       [판독 카드]  면 = severity.tint
          [숫자 칩 28×28, 면 = severity.base, radius xs, labelM, fg/default]
          [라벨  bodyLStrong]
          [상황 설명  bodyS, fg/subtle]
          (showNrs=true일 때만 "NRS 5–6")  ← 화면에서는 기본값 false라 안 나옴
       [슬라이더]  트랙 10, 정지점 6개 아니고 5개, thumb 28 + 브랜드 링 4
       [Row SpaceBetween]  "가벼운 불편"        "매우 심함"
  5. MedicalMateNotice(INFO)
       제목  "숫자는 진료실에서 의사가 읽어요"
       본문  "환자분은 낱말로 고르시면 돼요.
             카드에는 NRS 등가로 함께 표시됩니다."
[BottomCtaBar]  "다음"
```

제목 문자열은 `intake_severity_question` = `"%1$s 얼마나 아프세요?"`이고 `%1$s`에 `state.bodyPartSubject`(= 조사 붙은 부위)가 들어간다. 즉 화면 표시는 `복부가 얼마나 아프세요?` / `무릎이 얼마나 아프세요?`.

> `MedicalMateSeverityReadout`을 **따로 얹지 않는다.** 판독 카드는 슬라이더가 안에 그린다. "함께 두면 같은 수치가 두 곳에 나온다."

`MedicalMateSeveritySlider` 내부 구조 (소스 그대로, 웹 CSS로 옮길 값):

```
[Column, fillMaxWidth, 세로 간격 14]
  [판독 카드 Surface]  shape = radius buttonM, color = severity.tint, contentColor = fg/default
     [Row, padding 12(사방), 가로 간격 12]
        [숫자 칩]  28×28 Surface, shape = radius xs, color = severity.base,
                   contentColor = fg/default(고정), 가운데 Text(labelM)
        [Column, weight 1, 세로 간격 2]
           라벨        bodyLStrong
           상황 설명   bodyS, fg/subtle
        [NRS]  showNrs일 때만, bodyS·fg/subtle — **같은 Row의 오른쪽 끝**(별도 줄이 아니다)
  [Slider]  Material3, valueRange 1f..5f
  [Row SpaceBetween]  "가벼운 불편"(bodyS, fg/subtle)   "매우 심함"(bodyS, fg/subtle)
```

- 숫자 칩 글자색을 `fg/default`로 **고정**하는 이유: "severity base가 옅은 1~2단계에서 흰 글자를 쓰면 대비가 무너진다."
- 슬라이더에는 `enabled` 파라미터가 있지만(기본 `true`) 1d 화면은 넘기지 않는다 → 항상 켜져 있다. **비활성 상태가 이 화면에 없다.**

### 6-2. 통증 강도 5단계 라벨 전체 (소스 그대로)

| level | 라벨 | 상황 설명 | NRS 등가 |
|---|---|---|---|
| 1 | `조금 불편해요` | `신경 쓰이지만 하던 일은 계속할 수 있어요` | 1–2 |
| 2 | `은근히 아파요` | `자꾸 생각나고 집중이 잘 안 돼요` | 3–4 |
| 3 | `꽤 아파요` | `하던 일을 멈추게 될 때가 있어요` | 5–6 |
| 4 | `많이 아파요` | `일상생활이 어렵고 참기 힘들어요` | 7–8 |
| 5 | `견디기 힘들어요` | `잠도 못 자고 아무것도 못 하겠어요` | 9–10 |

- 척도 양 끝 라벨: 왼쪽 `가벼운 불편`, 오른쪽 `매우 심함`
- NRS 표기 포맷: `NRS %1$d–%2$d` (en dash `–`)
- 접근성(stateDescription): `%1$d단계, %2$s` → 예 `3단계, 꽤 아파요`
- 기본 선택값은 `LEVEL_3`
- NRS 값은 문서에 없고 Figma Severity Readout 마스터(`333:1126`)에서 읽었다. "임상 척도라서 추정하지 않았다."

### 6-3. 슬라이더 동작

- `valueRange = 1f..5f`, Material3 `Slider` 위에 커스텀 track/thumb.
- **끄는 동안에는 손가락을 그대로 따라가고 놓을 때 단계로 붙는다**(#228). 내부 `position`은 연속값, `severity`는 `raw.roundToInt()`로 계산해 바뀔 때만 콜백. 드래그 중에는 `position`을 단계값으로 되돌리지 않는다.
- 트랙: 높이 10, radius full. 바탕 `bg/subtle`, 채움 `severity.base`.
- 정지점 5개, 크기 6. **채움 위에 오면 `bg/surface`(흰색), 밖이면 `border/default`.** "채움과 같은 색으로 두면 지나온 정지점이 사라진다."
- 정지점 x 좌표: `inset + travel * index / 4`, `inset = thumb(28)/2`, `travel = width - inset*2`. 즉 **thumb이 오갈 수 있는 폭만 쓴다.**
- thumb: 28 원, `bg/surface` 면 + `border/primary` 4dp 테두리.
- 키보드 ←/→, Home/End는 Material3가 처리 → 웹은 `<input type=range>`가 동일하게 처리.
- 드래그 상태 판정은 `interactionSource.collectIsDraggedAsState()`이고, 되붙이는 곳은 딱 하나다:
  ```kotlin
  LaunchedEffect(severity, dragging) { if (!dragging) position = severity.level.toFloat() }
  ```
  즉 **드래그가 끝나는 순간과 바깥에서 값이 바뀔 때(복원 등)만** thumb이 단계에 스냅한다.
- 트랙 채움 비율은 `(position - 1f) / 4f` — **연속값**이다. 색만 `severity.base`(반올림된 단계)라서 드래그 중에는 길이가 부드럽게, 색이 계단식으로 바뀐다.
- `MedicalMateSeverity.ofLevel(level)`은 1~5 밖이면 **예외를 던진다**(`error("통증 단계는 1~5입니다...")`). 슬라이더는 `roundToInt()`가 범위 안이라 안전하고, 서버 복원 경로는 예외 대신 `null`을 주는 별도 함수(`severityOf`)를 쓴다(12절).

### 6-4. 값 저장 시점

**고를 때마다 보내지 않는다.** 3단계를 **떠날 때**(다음 버튼) `session.saveSeverity`가 나간다. "고를 때마다 보내면 슬라이더를 끄는 동안 요청이 줄줄이 나간다."

---

## 7. 4/4 추가 질문 (1i) — `QuestionsStep`

### 7-1. 레이아웃 (위 → 아래)

```
[NavBar "기록"]
[스크롤 본문 — padding 좌우 20/위 12/아래 16, 간격 14]
  1. IntakeProgress                                   ← "증상 정리  4 / 4"
  2. 제목  "의사에게 물어볼 것을 적어두세요"  headingL, fg/default
  3. 설명  "진료실에서 잊지 않고 꺼낼 수 있게
           브리핑 카드 맨 아래에 함께 담아드려요."   bodyM, fg/subtle
  4. MedicalMateTextField
       placeholder "정밀 검사를 받아야 하나요?"
       trailing = IconButton(Plus, "질문 추가", enabled = canAddQuestion)
       ← onSend를 넘기지 않는다. **키보드 엔터로는 추가되지 않는다** (문답 입력칸과 다르다)
  5. SavedQuestions  ← questions가 비어 있으면 이 블록 전체를 그리지 않는다
       [SectionHeader]  제목 "적어둔 질문"   caption "3개"
       [힌트]  "AI가 추천하는 질문이에요"   bodyS, fg/subtle
       [질문 줄 × N]   ← 마지막 줄에만 BringIntoViewRequester가 붙는다
[BottomCtaBar]  "다음"
```

- 3단계·4단계 본문은 같은 껍데기 `StepContent`를 쓴다 — `Column(verticalScroll)` + `padding(좌우 gutter 20, 위 12, 아래 16)` + `spacedBy(14)`, 첫 줄이 `IntakeProgress`.
  `StepContent(scrollKey)`가 바뀌면 스크롤이 맨 위로 돌아가는데 **3·4단계는 기본값(`Unit`)이라 절대 리셋되지 않는다.** 쓰는 곳은 1단계 인체도뿐이다(앵커↔확대↔목록 전환).
- **키보드 엔터의 동작이 2단계와 4단계에서 다르다.** 2단계 문답은 엔터 = 보내기(`onSend` 전달), 4단계 질문은 엔터에 아무 동작이 없다. 웹에서 습관적으로 form submit을 붙이면 안드로이드와 달라진다.

### 7-2. 질문 한 줄 `QuestionRow`

```
[Row]  배경 bg/primary-faint, radius sm
       padding 왼쪽 12 / 오른쪽 4 / 위아래 4, 항목 간격 10, 세로 가운데
  [번호 원]  22×22, 면 bg/primary, radius full
       숫자  labelS, fg/on-primary
  [질문 본문]  bodyM, fg/default, weight 1
  [IconButton Close]  contentDescription = "{n}번째 질문 지우기"
```

- 번호는 1부터. "진료실에서 순서대로 꺼내는 목록이라 몇 번째인지가 보여야 한다."
- 번호 원 22는 Figma 1i 값.
- 지우기 접근성 문구: `%1$d번째 질문 지우기` → 예 `2번째 질문 지우기`

### 7-3. 개수 caption

`intake_questions_count` = `%1$d개` → `3개`. `MedicalMateSectionHeader(title, caption)` 형태다.

```
[Row, fillMaxWidth, padding 위 24 / 아래 10, SpaceBetween, 세로 가운데]
   "적어둔 질문"   headingM, fg/default
   "3개"          bodyMStrong, fg/subtle
```

- **caption은 `fg/subtle`이지 `fg/link`가 아니다.** 같은 자리에 들어갈 수 있는 `actionLabel`(누르는 링크)은 `bodyMStrong` + `fg/link`인데, 1i는 `caption` 쪽을 쓴다. 주석: "누를 수 없는 글자를 링크 색으로 두면 눌러 보게 된다."
- `actionLabel`과 `caption`을 **함께 주지 않는다**. "한 자리라 뒤에 오는 것이 앞을 덮는다." 1i는 caption만 준다 → **"전체 삭제" 같은 액션이 이 화면에 없다.**
- 세로 가운데 맞춤이다(#235). "아래 맞춤으로 두면 제목이 `Heading/M` 28이고 액션이 `Body/M Strong` 24라 액션이 위로 떠 보인다."

### 7-4. AI 추천 질문 처리 — 경계가 중요

| | 출처 | 동작 |
|---|---|---|
| 서버 `questions` | 환자가 **확정**해 저장한 질문 | 있으면 그대로 쓴다 |
| 서버 `questionCandidates` | AI가 고른 **제안** | `questions`가 비었을 때만 `rank` 오름차순으로 정렬해 채운다 |

```kotlin
// SessionRepository.kt — SessionResponse.toSession()
questions = questions.ifEmpty { questionCandidates.sortedBy { it.rank }.map { it.text } }
```

- "환자가 아직 아무것도 적지 않았으면 AI 후보를 채워 둔다. 시안 1i가 추천 질문 셋을 목록에 넣어 두고 ×로 지우게 한다. 한 번이라도 손댔으면 그 결과가 정본이다 — 후보로 덮으면 지운 질문이 되살아난다."
- `rank`는 "낮을수록 먼저 보여줄 것. 서버가 정렬해 주지만 순서를 믿지 않는다."
- **후보가 도착하는 시점은 3단계를 떠날 때**다. `saveSeverity` 응답(`PUT /severity` → `SessionResponse`)에 후보가 실려 오고, 그 호출이 4단계 직전 마지막 왕복이라 "그 화면이 열릴 때 목록이 차 있다."
- 이때도 이미 적은 것이 있으면 덮지 않는다:
  ```kotlin
  update { current -> if (current.questions.isNotEmpty()) current else current.copy(questions = result.value.questions) }
  ```
- 화면에는 AI 추천과 직접 입력이 **구분되지 않는다.** 한 목록에 섞이고, 목록 위에 `AI가 추천하는 질문이에요` 한 줄만 붙는다. (목록이 비어 있지 않으면 **항상** 이 문구가 나온다 — 전부 직접 적은 질문이어도 나온다. → **미확인 사항**으로 18절에 기록)

### 7-5. 직접 질문 추가 / 삭제 (`IntakeQuestionActions`)

```kotlin
fun onAdd() = update { state ->
    if (!state.canAddQuestion) state
    else state.copy(questions = state.questions + state.questionDraft.trim(), questionDraft = "")
}

fun onRemove(index: Int) = update { state ->
    if (index !in state.questions.indices) state
    else state.copy(questions = state.questions.filterIndexed { i, _ -> i != index })
}
```

- 추가 시 `trim()`하고 입력칸을 비운다. 공백만이면 `canAddQuestion == false`라 아무 일도 안 한다.
- **편집은 없다.** 지우고 다시 적는다.
- 개수 상한은 UI에 없다. (단 `IntakeSession.questions` 주석은 "최대 셋이다"라고 적고 있다 → 18절 미확인 사항)

### 7-6. 방금 더한 질문을 보이는 자리로 (#228)

```kotlin
val lastQuestion = remember { BringIntoViewRequester() }
var added by remember { mutableStateOf(false) }
LaunchedEffect(state.questions.size) {
    if (added) { lastQuestion.bringIntoView(); added = false }
}
// + 버튼 onClick = { added = true; callbacks.onAddQuestionClick() }
```

- "입력칸은 위에 있고 적은 질문은 그 아래로 쌓이는데, 키보드가 올라와 있으면 방금 더한 줄이 그 뒤에 선다."
- **목록이 늘어난 것만으로는 판단하지 않는다.** 화면이 열릴 때 AI 후보가 채워지는데 "그것까지 따라가면 입력칸이 화면 밖으로 밀린다. 누른 뒤의 한 번만 따라간다."
- 웹: `element.scrollIntoView({block:'nearest'})`를 **버튼을 누른 뒤에만** 호출하는 플래그 방식으로 그대로 옮긴다.

### 7-7. 값 저장 시점

4단계를 떠날 때(다음 버튼) `session.saveQuestions` — **목록을 통째로** 보낸다. "추가·삭제·순서가 한 번에 처리된다."

---

## 8. 문답 완료 화면 (1c-5) — `IntakeDoneScreen`

**별도 라우트**다(`IntakeDoneDestination(sessionId: Long?)`). 4단계 화면과 다른 목적지.

### 8-1. 레이아웃 (위 → 아래)

```
[NavBar]  title "기록", surface GLASS, leading = 뒤로
[가운데 영역 — weight 1, 세로 가운데 정렬, 가로 가운데, 간격 16, 좌우 padding 20]
   [원 80×80]  면 bg/primary-faint, radius full
       [아이콘 CheckCircle 38, tint fg/primary]
   [제목]  "증상 정리가 끝났어요"                headingL, fg/default, 가운데 정렬
   [설명]  "말씀하신 내용을 진료실에서 보여줄
            카드로 만들 준비가 됐어요"          bodyM, fg/subtle, 가운데 정렬
           ← 소스에 \n이 박혀 있다. 2줄 고정
[BottomCtaBar — 자식 간격 10]
   [Primary 버튼]  "브리핑 카드 만들기"          fillMaxWidth
   [Outline 버튼]  "진료받을 병원 먼저 찾기"     fillMaxWidth
```

### 8-2. 두 갈래 버튼 문구 (요청 항목)

| 순서 | 라벨 (그대로) | 타입 | 이동 |
|---|---|---|---|
| 위 | `브리핑 카드 만들기` | Primary (기본) | `BriefCardDestination(sessionId)` |
| 아래 | `진료받을 병원 먼저 찾기` | `MedicalMateButtonType.OUTLINE` | `HospitalPickDestination(purpose = BEFORE_VISIT, sessionId)` |

주석 근거: "병원 찾기가 보조 버튼이다. 시안이 카드 만들기를 Primary로 뒀다. 병원은 진료 후에도 등록할 수 있어서 여기서 반드시 정해야 하는 값이 아니다."

### 8-3. 이 화면이 존재하는 이유 (그대로 옮길 판단)

- "전에는 마지막 단계에서 곧바로 카드로 넘어갔다. 그러면 병원을 고르는 길이 없고, 네 단계를 답한 것이 끝났다는 것도 알려주지 않는다."
- **진행 표시를 두지 않는다.** "문답이 아니라 문답이 끝난 뒤의 화면이라 `5 / 4`가 될 곳이 없다."
- 카드를 여기서 만들지 않는다. "만들 문답만 넘기고 카드 화면이 만든다. 병원을 먼저 찾고 오는 길과 한 자리에서 만나게 하려는 것이다."
- `sessionId == null`이면 **화면 자체를 그리지 않는다**(`?: return@composable`). "문답 없이 이 화면에 올 길이 없다. 세션이 없으면 만들 카드도 고를 병원도 없어서 두 버튼이 아무 일도 하지 않는다."

### 8-4. 상수

| 값 | 크기 |
|---|---|
| 아이콘 원 | 80.dp (Figma `1041:3663`) |
| 아이콘 | 38.dp — "38은 아이콘 크기 토큰에 없는 값이다" |

---

## 9. 네비게이션 — 이 화면에서 나가는 모든 경로

### 9-1. 들어오는 길

| 출발 | 경로 |
|---|---|
| 홈 "증상 정리 시작하기" | `IntakeDestination(sessionId = null)` |
| 홈 "이어서 하기" | `IntakeDestination(sessionId = <재개할 세션>)` |
| 브리핑 카드 목록의 "새로 만들기" | `IntakeDestination()` |

### 9-2. 나가는 길

| 트리거 | 조건 | 결과 |
|---|---|---|
| NavBar 뒤로 | `state.canGoBack == true` | `viewModel.onBack()` — 단계를 하나 내린다 |
| NavBar 뒤로 | `canGoBack == false` (1단계이고 focus 없음) | `onExit()` → `popBackStack()` — **흐름 이탈** |
| 뒤로 (1단계 확대 상태) | `step == BODY_PART && bodyMap.focus != null` | 단계를 내리지 않고 `bodyMap.onFocusClear()` — 앵커 화면으로 |
| 하단 "다음" (1단계) | `canLeaveBodyPart` | `bodyPart = part`, `messages = []`, `awaitingReply = true`, `step = SYMPTOM_CHAT` → 그 다음 `session.start()` |
| 하단 "다음" (2단계, chatFinished일 때만 보임) | — | `step = SEVERITY` (서버 호출 없음) |
| 하단 "다음" (3단계) | — | `session.saveSeverity(state, severityLabel)`를 **띄우고 응답을 기다리지 않은 채** 곧바로 `step = QUESTIONS` |
| 하단 "다음" (4단계) | `step.isLast` | `session.saveQuestions(state)`를 띄우고 `completed = true` |
| 음성으로 "다음" | `chatFinished && latest.isNextCommand()` | `onNext("")` — 위와 같은 경로 |
| `completed == true` | `LaunchedEffect` | `onCompleted(state.sessionId)` → `IntakeDoneDestination(sessionId)` |
| 1c-5 "브리핑 카드 만들기" | — | `BriefCardDestination(sessionId = sessionId)` |
| 1c-5 "진료받을 병원 먼저 찾기" | — | `HospitalPickDestination(purpose = BEFORE_VISIT, sessionId)` |
| 1c-5 뒤로 | — | `popBackStack()` |

`onNext(severityLabel)` 한 함수가 위 네 줄을 전부 처리한다. 순서가 중요하다 — **저장이 먼저, 단계 이동이 나중**이다. 저장 호출이 떠날 때의 `state`는 아직 그 단계의 값이다.

```kotlin
fun onNext(severityLabel: String) {
    val state = mutableUiState.value
    when (state.step) {                       // ① 떠나는 단계의 값을 서버에 남긴다
        SEVERITY  -> session.saveSeverity(state, severityLabel)
        QUESTIONS -> session.saveQuestions(state)
        else -> Unit
    }
    when {                                    // ② 단계를 옮긴다
        state.step == BODY_PART -> { ...부위 확정 + session.start()... }
        state.step.isLast       -> completed = true
        else                    -> step = IntakeStep.entries[step.ordinal + 1]
    }
}
```

- **`severityLabel`은 화면이 풀어서 넘긴다.** `IntakeRoute`가 `stringResource(state.severity.labelRes)`로 읽어 `onNextClick`에 실어 준다. "강도의 표시 문구는 문자열 리소스라 ViewModel이 읽을 수 없다." 3단계가 아닐 때도 값은 계산돼 넘어가지만 쓰이지 않는다.
- 음성 "다음"으로 들어오는 경로는 `onNext("")` — **빈 라벨**이다. 주석: "강도 라벨은 이 단계에서 쓰지 않는다. 단계를 떠날 때 값을 남기는 것은 강도와 질문 단계뿐이다." 음성 명령은 2단계(문답)에서만 나오므로 문제가 없다.
- 1단계에서 `selection`이나 `part`가 `null`이면 **아무 일도 일어나지 않는다**(단계도 안 넘어간다). 화면의 "다음" 버튼도 `canLeaveBodyPart`로 꺼져 있어 보통은 도달하지 않는다.

### 9-3. 화면 진입 시 도는 효과 (`IntakeRoute`) — 전부

| 효과 | 키 | 하는 일 |
|---|---|---|
| `LaunchedEffect(sessionId)` | 라우트 인자 | `sessionId != null`이면 `session.restore(sessionId)` — 홈의 "이어서 하기" 경로 |
| `LaunchedEffect(state.completed)` | 상태 | `completed`면 `onCompleted(state.sessionId)` |
| `LaunchedEffect(Unit)` | 1회 | `voice.check()` — `speech.available()`로 `voiceAvailable` 갱신 |
| `stringResource(state.severity.labelRes)` | 매 컴포지션 | 3단계 저장에 실어 보낼 라벨을 미리 푼다 |
| `rememberMicPermission` × 2 | — | `askMic`, `askVoiceMode` (5-5절) |

주석: "목적지 스코프라 화면을 떠나면 ViewModel도 사라진다. 다시 들어오면 다시 불러온다." → 웹에서는 이 세 효과의 **정리(cleanup)** 를 직접 적어야 한다. 특히 `voiceAvailable`과 `completed`.

### 9-4. 완료 신호 처리

```kotlin
LaunchedEffect(state.completed) { if (state.completed) onCompleted(state.sessionId) }
```

"목적지 스코프라 화면을 떠나면 ViewModel도 사라지므로 소비 표시를 따로 두지 않는다."

→ **웹 포팅 주의**: 웹에서는 라우트를 떠나도 전역 store가 살아 있으면 `completed`가 남아 재진입 시 즉시 다시 이동한다. 언마운트 시 상태를 버리거나 `completed`를 소비 후 false로 되돌려야 한다.

---

## 10. 로딩 / 빈 상태 / 에러 상태

### 10-1. 로딩

| 자리 | 표시 |
|---|---|
| 세션 생성 중 (1단계 → 2단계 직후) | `awaitingReply = true`, `messages = emptyList()` → 화면에 **대기 점 셋만** 뜬다. 입력칸의 보내기 버튼은 `canSend == false`로 꺼진다 |
| 답 보내는 중 | `awaitingReply = true` → 보낸 말풍선 + 대기 점 셋 |
| 음성 모델 다운로드 중 | `voice = PROCESSING` → 마이크 원 안에 `CircularProgressIndicator`, "정리하는 중이에요 / 잠시만 기다려 주세요", 마이크 클릭 불가 |
| 세션 복원 중 (`restoring = true`) | **화면에 아무 표시가 없다.** 상태 필드만 있고 어떤 Composable도 읽지 않는다 |

첫 질문 대기 로직 (#259):

> "첫 질문은 서버가 세션을 만들면서 준다. 오기 전까지는 답을 기다리는 점 셋만 두고 보내기를 막는다. 앱 문장을 먼저 세우면 응답이 올 때 바뀐다."

### 10-2. 빈 상태

| 자리 | 동작 |
|---|---|
| `messages`가 비었을 때 | 별도 빈 상태 문구 없음. 진행 표시 + 짚은 부위 칩만 남는다 (세션 생성 대기 중에는 점 셋이 함께) |
| `questions`가 비었을 때 (1i) | `SavedQuestions`가 **`if (state.questions.isEmpty()) return`** — 섹션 헤더·힌트·목록이 전부 사라진다. 빈 상태 일러스트나 문구가 **없다** |
| 서버 메시지가 비어 응답했을 때 | 앱이 만든 첫 물음을 세운다 (아래) |

앱이 만드는 대체 첫 물음:

```kotlin
internal fun intakeOpeningLine(part: String): String =
    "${withSubjectParticle(part)} 불편하시군요. 언제부터 그러셨어요? 정확하지 않아도 괜찮아요."
```

→ 화면 표시 예: `복부가 불편하시군요. 언제부터 그러셨어요? 정확하지 않아도 괜찮아요.`

쓰이는 경우는 세 가지다: ① 세션 생성 실패(`Rejected`/`NetworkUnavailable`), ② 성공했는데 `messages`가 비어 있을 때, ③ **세션 복원(`restore`) 결과의 `messages`가 비어 있을 때**. "서버 마디가 있으면 이 문장은 화면에 나오지 않는다."

```kotlin
private fun IntakeUiState.openingFor(siteText: String?): List<IntakeMessage> =
    siteText?.let { listOf(newMessage(AI, intakeOpeningLine(it))) }.orEmpty()
```

- **`siteText`가 `null`이면 빈 목록이다.** 즉 부위 이름이 없고 서버 마디도 없으면 **대화가 완전히 비어 있는 화면**이 된다 — 진행 표시만 남고 부위 칩도, 말풍선도, 안내 문구도 없다. 새로 시작하는 흐름에서는 1단계가 부위를 강제하므로 도달하지 않지만, **복원 경로에서 서버가 `siteText`를 `null`로 주면 실제로 생긴다.**
- id는 `newMessage()`가 매긴다 — 기존 목록의 최대 id + 1. 빈 목록이면 1이다.

### 10-3. 에러 상태 — **여기가 가장 중요한 공백**

| 실패 | 상태 필드 | 화면 표시 |
|---|---|---|
| 세션 생성 실패 | (필드 없음) | `messages`에 앱이 만든 첫 물음을 세우고 **그대로 진행**. `sessionId`가 `null`로 남아 이후 모든 서버 호출이 조용히 스킵된다 |
| 메시지 전송 실패 | `sendFailed = true` | **화면 어디에도 표시되지 않는다.** `awaitingReply`만 꺼지고 보낸 말풍선은 남는다. 재전송 조작 없음 |
| 세션 복원 실패 | `restoreFailed = true` | **화면 어디에도 표시되지 않는다** |
| `saveSeverity` 실패 | (무시) | `if (result !is ApiResult.Success) return@launch` — 아무 일도 안 일어나고 다음 단계로 간다. "다음 단계로 못 가게 하는 것이 더 나쁘다" |
| `saveQuestions` 실패 | (무시) | 결과를 아예 받지 않는다 (`scope.launch { repository.setQuestions(...) }`) |
| STT 실패 | `voice = IDLE` | "적던 글은 그대로 두고 상태만 되돌린다. 못 알아들었다고 적은 것을 지우지 않는다" |
| 마이크 권한 거부 | `voice = DENIED` | 패널은 열린 채 `마이크를 쓸 수 없어요 / 설정에서 마이크 권한을 켜주세요`, 아이콘 `MicOff`, 면 `bg/danger`, 설명 글자색 `fg/danger` |

> **검증 결과**(2026-09-15 재확인): `sendFailed`, `restoreFailed`, `restoring` 세 필드를 전체 소스에서 grep하면 `IntakeUiState.kt` / `IntakeViewModel.kt` / `IntakeSessionActions.kt`와 단위 테스트(`IntakeSessionActionsTest.kt`) 밖에서는 **쓰이는 곳이 없다.** 어떤 Composable도 읽지 않는다 — 안드로이드에도 이 에러 UI가 아직 없다. 웹에서 새로 디자인해야 하는 자리다.
>
> grep 주의: `auth/ui/LoginScreen.kt`에도 `restoreFailed`가 있는데 **전혀 다른 것**이다(자동 로그인 실패). 그쪽은 화면에 문구가 뜬다(`login_restore_failed`).

**되돌리는 길이 없는 플래그 두 개** — 웹으로 옮길 때 같이 옮기면 버그가 된다:

- `sendFailed`는 `true`로만 바뀐다. **`false`로 되돌리는 코드가 아무 데도 없다.** 안드로이드에서는 ViewModel이 화면과 함께 죽어서 문제가 드러나지 않지만, 웹의 전역 store에서는 한 번 실패하면 세션 내내 남는다. 다음 전송이 성공할 때 꺼 주는 편이 맞다.
- `restoreFailed`는 `restoredWith()`(복원 성공) 안에서만 `false`가 된다. 실패 후 다시 시도할 조작이 화면에 없으므로 사실상 한 방향이다.
- 반대로 `restoring`은 `restore()` 시작에서 `true`, 성공·실패 양쪽에서 `false`로 제대로 닫힌다.

`ApiResult` 갈래 (웹의 에러 타입도 같은 모양으로):

```kotlin
sealed interface ApiResult<out T> {
    data class Success<out T>(val value: T)
    data class Rejected(code: ApiErrorCode, message: String?, requestId: String?, retryable: Boolean, details: JsonObject?)
    data class NetworkUnavailable(cause: IOException)
}
```

---

## 11. 서버 API

Base: Retrofit `SessionApi`, `/v3/api-docs`의 `/api/sessions` 기준.

### 11-1. 문답 세션 생성

```
POST /api/sessions
```

요청 `StartSessionRequest`:

| 필드 | 타입 | 설명 |
|---|---|---|
| `siteCodes` | `List<String>` | 온톨로지 id. 구역까지 골랐으면 `SUR:*`, 앵커까지면 `ANC:*`. 앱은 **항상 하나만** 보낸다 (`zoneId ?: anchorId`) |
| `siteText` | `String?` | 사람이 읽는 표현. 문답 첫 문장에 그대로 들어간다 |

응답: `SessionResponse` (11-6 참고)

- 주석: "나이나 성별이 없으면 400이다. 둘은 의사용 카드 헤더에 반드시 찍혀서, 없으면 문답을 다 해도 카드가 성립하지 않는다. `canStartIntake`로 미리 확인한다."
- **첫 AI 질문이 이 응답의 `messages`에 실려 온다**(#259).

### 11-2. 세션 조회 (이어서 하기)

```
GET /api/sessions/{sessionId}
```

응답: `SessionResponse`

### 11-3. 턴 전송 (환자 발화 → 다음 질문)

```
POST /api/sessions/{sessionId}/messages
```

요청 `SendMessageRequest`:

| 필드 | 타입 | 값 |
|---|---|---|
| `text` | `String` | `draft.trim()` |
| `inputMethod` | `String` | `"STT"` (음성) 또는 `"TEXT"` (글) |

> "음성으로 말했어도 오디오를 보내지 않는다. 앱이 변환한 글만 간다. `STT`는 음성이었다는 사실만 남기고 녹음은 저장되지 않는다."

응답 `TurnResponse`:

| 필드 | 타입 | 기본값 | 설명 |
|---|---|---|---|
| `sessionId` | `Long` | — | |
| `status` | `String?` | `null` | |
| `reply` | `String?` | `null` | AI의 다음 질문 (**앱은 이 필드를 쓰지 않는다** — `messages`를 쓴다) |
| `ended` | `Boolean` | `false` | 문답이 끝났는지 → `chatFinished` |
| `endReason` | `String?` | `null` | (앱 미사용) |
| `progress` | `ProgressResponse?` | `null` | `{ current: Int, total: Int }` |
| `messages` | `List<MessageResponse>` | `[]` | **대화 전체** |

- "한 번에 대화가 두 줄 쌓인다. 보낸 말과 AI의 다음 질문이다. 응답의 `messages`에 대화 전체가 들어 있어 화면을 다시 그릴 때 세션을 또 조회하지 않아도 된다."
- "끝난 뒤에 또 보내도 오류가 아니다. 마지막 문장만 돌아오고 상태는 그대로다."

### 11-4. 통증 강도 저장

```
PUT /api/sessions/{sessionId}/severity
```

요청 `SeverityRequest`:

| 필드 | 타입 | 설명 |
|---|---|---|
| `level` | `Int` | **1~5 서열척도다. NRS 0~10이 아니다** |
| `label` | `String` | `"꽤 아파요"` 같은 표시 문구. **앱이 보낸다** — "서버가 들고 있으면 문구를 바꿀 때마다 배포해야 하고, 이것은 디자인 카피라 서버 것이 아니다" |

응답: `SessionResponse` — **여기에 `questionCandidates`가 실려 온다.**

- "끝난 문답에도 보낼 수 있고 다시 고르면 덮어쓴다."
- `label`은 Composable에서 `stringResource(state.severity.labelRes)`로 풀어 `onNext(severityLabel)`로 넘긴다. "강도의 표시 문구는 문자열 리소스라 ViewModel이 읽을 수 없다."

### 11-5. 추가 질문 저장

```
PUT /api/sessions/{sessionId}/questions
```

요청 `QuestionsRequest`: `{ questions: List<String> }`

응답: `SessionResponse`

- "목록을 통째로 보낸다. 추가·편집·삭제·순서가 한 번에 처리된다."

### 11-6. `SessionResponse` 전체 필드

| 필드 | 타입 | 기본값 |
|---|---|---|
| `sessionId` | `Long` | — |
| `status` | `String?` | `null` |
| `siteCodes` | `List<String>` | `[]` |
| `siteText` | `String?` | `null` |
| `progress` | `ProgressResponse?` | `null` |
| `messages` | `List<MessageResponse>` | `[]` |
| `severity` | `SeverityResponse?` | `null` |
| `questions` | `List<String>` | `[]` |
| `questionCandidates` | `List<QuestionCandidateResponse>` | `[]` |

하위 타입:

```kotlin
MessageResponse(seq: Long, role: String, text: String)       // role = "AI" | "USER"
SeverityResponse(level: Int, label: String? = null)
ProgressResponse(current: Int, total: Int)
QuestionCandidateResponse(text: String, source: String? = null, rank: Int = 0)
```

### 11-6a. 도메인 모델 (`SessionRepository.kt`) — 화면과 전선 사이의 한 겹

Repository가 wire 타입(`SessionResponse`/`TurnResponse`)을 이 셋으로 바꿔서 넘긴다. ViewModel은 wire 타입을 모른다.

```kotlin
data class IntakeSession(
    val id: Long,
    val status: IntakeSessionStatus,          // IN_PROGRESS / COMPLETED / ABANDONED
    val siteCodes: List<String>,
    val siteText: String?,
    val answered: Int,                        // = progress.current ?: 0
    val total: Int,                           // = progress.total ?: 0
    val messages: List<IntakeSessionMessage>,
    val severityLevel: Int? = null,           // = severity?.level
    val questions: List<String> = emptyList(),  // 주석: "최대 셋이다"
)

data class IntakeTurn(
    val ended: Boolean,
    val messages: List<IntakeSessionMessage>,
    val answered: Int,
    val total: Int,
)

data class IntakeSessionMessage(val seq: Long, val fromPatient: Boolean, val text: String)

enum class IntakeSessionStatus { IN_PROGRESS, COMPLETED, ABANDONED }
```

- **`role: String`이 여기서 `fromPatient: Boolean`으로 바뀐다** (`role == "USER"`). 화면까지 문자열을 끌고 가지 않는다.
- `severity.label`(서버가 돌려주는 문구)은 **버려진다.** 도메인에 `severityLevel`만 남는다 — 문구는 앱의 문자열 리소스가 정본이다.
- `siteCodes`는 도메인까지 오지만 **화면이 읽지 않는다.** 화면이 쓰는 것은 `siteText`뿐이다.
- `answered`/`total`은 도메인까지 오지만 **어떤 Composable도 읽지 않는다**(18절 6번).
- `IntakeTurn`에는 `sessionId`·`status`·`reply`·`endReason`이 **없다.** Repository가 매핑에서 떨군다.

### 11-7. 매핑 규칙 (Repository)

```kotlin
// 말풍선 id = 서버의 seq. "세션 안에서 유일하고, 이어 붙는 마디와 겹치지 않는다."
IntakeMessage(id = seq, sender = if (role == "USER") PATIENT else AI, text = text)

// status 파싱 — 모르는 값은 진행 중으로 본다
"COMPLETED" -> COMPLETED
"ABANDONED" -> ABANDONED
else        -> IN_PROGRESS   // "임시저장을 잃는 것이 더 큰 손해다"

// questions 합성
questions = questions.ifEmpty { questionCandidates.sortedBy { it.rank }.map { it.text } }
```

### 11-8. 새 메시지 id 생성 (낙관적 추가)

```kotlin
internal fun newMessage(sender, text) =
    IntakeMessage(id = (messages.maxOfOrNull { it.id } ?: 0L) + 1, sender = sender, text = text)
```

"세는 값을 따로 들면 서버에서 불러온 마디와 겹친다. 불러온 마디의 id는 서버가 매긴 `seq`라 0부터 시작하지 않고, 이어 답한 마디가 같은 번호를 받으면 목록의 key가 겹쳐 화면이 엉뚱한 줄을 다시 쓴다."

### 11-9. 전송 흐름 (낙관적 UI)

```kotlin
fun onSend() {
    if (!canSend || sessionId == null) return          // 세션 없으면 보내지 않는다
    val text = draft.trim()
    val byVoice = (inputMode == VOICE)
    // 1) 보낸 말을 먼저 붙인다 — "기다렸다 한꺼번에 그리면 방금 누른 것이 사라진 것처럼 보인다"
    messages += newMessage(PATIENT, text); draft = ""; awaitingReply = true
    // 2) 서버 왕복
    when (repository.send(sessionId, text, byVoice)) {
        Success -> {
            messages = result.messages.map { it.toMessage() }   // 대화 전체로 갈아 끼운다
            awaitingReply = false
            chatFinished = result.ended
            voice.onReplied()                                   // 음성이면 다시 듣기
        }
        Rejected, NetworkUnavailable -> { awaitingReply = false; sendFailed = true }
    }
}
```

---

## 12. 세션 복원 (홈 "이어서 하기")

`IntakeSessionActions.restore(sessionId)` → `GET /api/sessions/{id}` → `restoredWith()`

```kotlin
copy(
    step = session.leftAt(),
    sessionId = session.id,
    bodyPart = session.siteText,
    messages = restored.ifEmpty { openingFor(session.siteText) },
    chatFinished = session.status != IN_PROGRESS,
    severity = session.severityLevel?.let(::severityOf) ?: severity,
    questions = session.questions.ifEmpty { questions },
    restoring = false,
    restoreFailed = false,
)
```

돌아갈 단계 판정:

```kotlin
private fun IntakeSession.leftAt(): IntakeStep = when {
    severityLevel != null              -> QUESTIONS
    status != IN_PROGRESS              -> SEVERITY
    else                               -> SYMPTOM_CHAT
}
```

근거(주석 그대로): "강도는 3단계에서 4단계로 넘어갈 때 저장한다. 그래서 강도가 있으면 4단계까지 갔던 것이고, 강도 없이 문답만 끝났으면 3단계다. 질문으로는 가릴 수 없다 — 적어 둔 것이 없어도 AI 후보가 들어 있어서 환자가 그 단계를 봤는지 알 수 없다."

- **부위 선택 단계(1단계)로는 절대 돌아가지 않는다.** "세션이 있다는 것은 그 단계를 이미 지났다는 뜻이고, 서버가 `siteText`를 들고 있다."
- 서버의 `progress`는 **문답 안의 물음 수**이지 우리 네 단계가 아니다. 단계 판정에 쓰지 않는다.
- 범위 밖 `severityLevel`이 오면 화면 기본값(`LEVEL_3`)을 그대로 둔다.

---

## 13. 온디바이스 추출 vs 서버 — 경계

### 13-1. 결론부터: **지금 문답은 100% 서버가 한다**

전체 소스 grep 결과 `OnDeviceExtractor` / `extractTurn` / `labelMemo`는 `intake/ondevice/` 패키지 밖에서 **한 번도 등장하지 않는다.** `OnDeviceEngine`은 `MedicalMateApplication`에서 **앱 시작 시 로그만 남긴다**. 즉:

- 현재 실제 동작: 환자 발화 → `POST /api/sessions/{id}/messages` → **서버가** 다음 질문을 만들고 대화를 돌려준다.
- 온디바이스 코드는 **엔진이 붙기 전의 스캐폴딩**이다. 주석: "추론은 아직 없다.", "인터페이스를 먼저 두는 이유는 엔진이 아직 없기 때문이다. llama.cpp Snapdragon 빌드에 도커 툴체인이 필요한데 지금 개발 환경에 없다(#142)."
- `UnavailableOnDeviceExtractor`(언제나 `OnDeviceResult.Unavailable`)가 유일한 구현이지만, **Hilt 바인딩조차 없다.** `intake/data/IntakeModule.kt`는 `SessionApi`와 `SessionRepository`만 묶는다. 즉 "서버로 폴백되는 경로"가 아니라 **아직 아무도 부르지 않는 코드**다. 폴백은 코드가 아니라 설계 문서에만 있다.
- `MedicalMateApplication`이 로그로 남기는 것도 `OnDeviceEngineState`(`Unavailable` 또는 `Ready(version, npuReady)`)뿐이고, 그 값을 읽어 분기하는 화면은 하나도 없다.

→ **웹앱은 온디바이스를 구현할 필요가 없다.** 서버 API 3개(생성/턴/완료)만 붙이면 문답이 완성된다.

### 13-2. 그래도 경계를 적는 이유 (설계 의도)

아래 표에서 "폰" 칸은 **설계 의도**이고 현재 동작이 아니다. 지금은 ✓ 표시된 칸만 실제로 돈다(전부 서버).

| 하는 일 | 폰(온디바이스) | 서버 |
|---|---|---|
| 환자 발화 **원문** | 폰 밖으로 나가지 않는 것이 설계 목표 | ✓ (현재는 원문이 그대로 `POST /messages`로 간다) |
| 한 턴에서 SOCRATES 축 추출 | `OnDeviceExtractor.extractTurn(user)` → `TurnExtraction` | 폴백 |
| 다음 질문 생성 | ✗ | ✓ |
| 문답 종료 판정(`ended`) | ✗ | ✓ |
| 진행도(`progress`) | ✗ | ✓ |
| 통증 강도 저장 | ✗ | ✓ |
| AI 추천 질문 후보 생성 | ✗ | ✓ (`questionCandidates`) |
| 진료 후 메모 **문장 분리** | ✗ | ✓ |
| 진료 후 메모 **문장별 라벨링** | `labelMemo(sentences)` | 폴백 |
| 메모 조립·날짜 계산 | ✗ | ✓ |

핵심 주석: "**발화 원문은 폰을 떠나지 않는다. 이 인터페이스가 그 경계다.** 여기로 들어간 말은 밖으로 나가지 않고 뽑은 결과만 서버로 간다."
그리고 메모 쪽: "**폰은 문장에 라벨만 붙인다. 분리·조립·날짜 계산은 서버가 한다.** 문장을 나누는 것도 서버라 폰과 서버가 같은 번호를 가리킨다."

### 13-3. `TurnExtraction` 스키마 (AI 트랙이 고정, 앱이 못 바꿈)

```kotlin
data class TurnExtraction(
    @SerialName("chief_complaint") val chiefComplaint: String? = null,
    val updates: List<AxisUpdate> = emptyList(),     // maxItems 4
    val notes: List<String> = emptyList(),           // maxItems 3
    @SerialName("wants_to_stop") val wantsToStop: Boolean = false,
)

data class AxisUpdate(
    val axis: ExtractionAxis,
    val status: FieldStatus,
    val value: String,      // filled면 정리한 값, 아니면 빈 문자열
    val evidence: String,   // minLength 1. 환자가 실제로 한 말 (글자 그대로 복사)
)
```

`ExtractionAxis` — 진료 전 SOCRATES 8축 + 진료 후 6축을 한 enum에 담았다(스키마가 `anyOf`라 값이 섞여 온다):

| wire 값 | 상수 | 구분 |
|---|---|---|
| `site` | `SITE` | 진료 전 |
| `onset` | `ONSET` | 진료 전 |
| `character` | `CHARACTER` | 진료 전 |
| `radiation` | `RADIATION` | 진료 전 |
| `associated` | `ASSOCIATED` | 진료 전 |
| `time_course` | `TIME_COURSE` | 진료 전 |
| `exacerbating_relieving` | `EXACERBATING_RELIEVING` | 진료 전 |
| `severity` | `SEVERITY` | 진료 전 |
| `heard_diagnosis` | `HEARD_DIAGNOSIS` | 진료 후 |
| `medication` | `MEDICATION` | 진료 후 |
| `tests_procedures` | `TESTS_PROCEDURES` | 진료 후 |
| `follow_up` | `FOLLOW_UP` | 진료 후 |
| `instructions` | `INSTRUCTIONS` | 진료 후 |
| `open_questions` | `OPEN_QUESTIONS` | 진료 후 |

`FieldStatus`: `not_asked` / `filled` / `unknown` / `skipped` / `ambiguous`

> "`unknown`('잘 모르겠다')과 `skipped`('넘어간다')를 같게 다루지 않는다. 앞은 환자가 답을 못 한 것이고 뒤는 묻지 않기로 한 것이다. **카드에 적히는 말이 달라진다.**"

`MemoLabel`: `findings` / `tests` / `medication_instructions` / `follow_up` / `none`

### 13-4. 고정 묶음 (`OnDeviceBundle`)

| 항목 | 값 |
|---|---|
| 모델 | `Qwen3-1.7B-Q4_0.gguf` (`unsloth/Qwen3-1.7B-GGUF`의 Q4_0) |
| 모델 크기 | 약 1,000,000,000 bytes |
| 진료 전 프롬프트 | `ondevice/prompt-small-v4.system.txt` |
| 진료 전 스키마 | `ondevice/turn_extraction.small.schema.json` |
| 진료 후 프롬프트 | `ondevice/prompt-memo-small-v4.system.txt` |
| 진료 후 스키마 | `ondevice/memo_labels.schema.json` |
| 묶음 버전 | `Qwen3-1.7B-Q4_0 · extract-small-v4 · memo-small-v4 (2026-09-09)` |

추론 설정 `OnDeviceSettings`: `temperature = 0.0`, `seed = 42`, `maxTokens = 1024`, `reasoning = false`, `contextSize = 4096`, `threads = 6`.
"온도 0과 시드 42가 일치 확인의 전제다. 하나라도 흔들면 88개 비교가 의미를 잃는다." → 화면/사용자 설정으로 바꿀 수 없다.

JSON 파싱: `ignoreUnknownKeys = false` — "스키마가 `additionalProperties: false`로 모델이 `diagnosis` 같은 필드를 덧붙이는 것을 막고 있어서, 앱도 그것을 통과시키면 안 된다."

메모 라벨 스키마는 **파일이 아니라 요청마다 만든다.** `memoLabelsSchema(sentenceCount)`가 키 `"0"`~`"N-1"`을 전부 `required`로 넣고 `additionalProperties: false`를 붙인다. 이유: "파일(`memo_labels.schema.json`)은 N=4 예시일 뿐이다. 4개짜리 스키마를 그대로 쓰면 문장이 다섯인 메모에서 다섯 번째 라벨이 강제되지 않는다."

파싱 두 함수 (둘 다 실패를 예외가 아니라 `Malformed`로 돌려준다):

| 함수 | 계약 위반으로 보는 것 |
|---|---|
| `parseTurnExtraction(raw)` | 스키마 밖 키, 타입 불일치 (`ignoreUnknownKeys = false`) |
| `parseMemoLabels(raw, sentenceCount)` | 번호가 비었을 때(`"$index 번 라벨이 없다"`), 모르는 라벨 이름, **개수 불일치**(`"문장 N개인데 라벨 M개"`) |

`MemoLabel`은 enum 이름과 wire 이름이 달라 `wireName` 확장 프로퍼티로 따로 매핑한다(`FINDINGS` → `"findings"` 등).

`OnDeviceResult` 3갈래:
- `Success(value)`
- `Unavailable` — "미지원 기기·모델 미다운로드·시간 초과가 모두 여기다. **앱은 실패 판단만 하고 이유를 화면에 적지 않는다. 사용자가 고를 수 있는 것이 아니다.**" → 서버 추출로 폴백
- `Malformed(raw, cause)` — "이것은 폴백이 아니라 계약 위반이다." AI 트랙에 알릴 일이라 따로 나눈다

### 13-5. `OnDeviceEngine` — 하는 일

추론이 아니라 **"이 기기에서 백엔드(NPU)가 실제로 잡히는지"** 확인만 한다.

- `System.loadLibrary("OpenCL")`, `System.loadLibrary("cdsprpc")` (벤더 lib, 실패해도 로그만)
- `System.loadLibrary("medicalmate_ondevice")` — 실패하면 `Unavailable`. "라이브러리가 없는 것은 고장이 아니다. 엔진 없이 빌드했거나 arm64가 아닌 기기다."
- HTP 이미지를 `assets/ondevice/htp` → `filesDir/ondevice/htp`로 푼다. "DSP 로더가 `ADSP_LIBRARY_PATH` 아래에서 **파일**을 찾아가고 APK 안의 자산은 그 경로로 보이지 않는다."
- `nativeDevices()`로 장치 목록을 읽어 `type == "ACCEL"`이 있으면 `npuReady = true`.
- 왜 필요한가: "NPU가 안 잡히면 에러 없이 CPU로 떨어지고, 그 차이가 첫 호출에서 **1.7초와 14.9초**다."

→ 웹앱에는 대응물이 없다. **이 절 전체를 무시해도 웹 구현에 지장이 없다.**

---

## 14. 화면별 디자인 시스템 컴포넌트 목록

### 2/4 증상 문답 (1c)

- `MedicalMateNavBar` (surface = GLASS)
- `MedicalMateProgressIndicator` (label 변형)
- `MedicalMateChip` (selected = true)
- `MedicalMateBubble` + `MedicalMateBubbleSender` (AI / PATIENT)
- `MedicalMateBottomCtaBar`
- `MedicalMateButton` ("다음", chatFinished일 때만)
- `MedicalMateTextField` (TEXT 모드)
- `MedicalMateIconButton` + `MedicalMateIconButtonStyle.GHOST` (마이크 / 보내기)
- `MedicalMateVoiceInput` + `MedicalMateVoiceState` (VOICE 모드)
- 아이콘: `MedicalMateIcons.Mic`, `.ArrowUp`, `.Waveform`, `.MicOff`
- 커스텀(컴포넌트 아님): `TypingRow` 점 세 개

### 3/4 통증 강도 (1d)

- `MedicalMateNavBar`
- `MedicalMateProgressIndicator`
- `MedicalMateSeveritySlider` (내부에 판독 카드 + `SeverityLevelChip` 포함)
- `MedicalMateNotice` (tone = INFO 기본)
- `MedicalMateBottomCtaBar` + `MedicalMateButton`
- 쓰지 **않는** 것: `MedicalMateSeverityReadout`, `MedicalMateSeveritySelect`

### 4/4 추가 질문 (1i)

- `MedicalMateNavBar`
- `MedicalMateProgressIndicator`
- `MedicalMateTextField` (trailing = 추가 버튼)
- `MedicalMateIconButton` (`MedicalMateIcons.Plus`, `.Close`)
- `MedicalMateSectionHeader` (title + caption)
- `MedicalMateBottomCtaBar` + `MedicalMateButton`
- 커스텀: `QuestionRow` (번호 원 22 + 본문 + 지우기)

### 정리 완료 (1c-5)

- `MedicalMateNavBar` (surface = GLASS)
- `MedicalMateBottomCtaBar`
- `MedicalMateButton` × 2 (기본 / `MedicalMateButtonType.OUTLINE`)
- 아이콘: `MedicalMateIcons.CheckCircle`
- 진행 표시 **없음**

---

## 15. 화면 문구 전체 (웹에서 그대로 재현)

| 리소스 키 | 문구 (그대로) | 쓰이는 곳 |
|---|---|---|
| `intake_title` | `기록` | NavBar 제목 (1c/1d/1i/1c-5 공통) |
| `intake_progress_label` | `증상 정리` | 진행 표시 라벨 |
| `intake_next` | `다음` | 하단 CTA |
| `progress_step_count` | `%1$d / %2$d` | 진행 표시 숫자(보이는 값) |
| `progress_step` | `%1$d/%2$d 단계` | 진행 표시 접근성(읽는 값) |
| `intake_chat_context` | `짚은 부위` | 1c 부위 칩 앞 라벨 |
| `intake_chat_ai` | `AI` | AI 말풍선 발화자 라벨 |
| `intake_chat_placeholder` | `메시지 입력` | 1c 입력칸 placeholder |
| `intake_chat_send` | `보내기` | 보내기 버튼 접근성 |
| `intake_chat_voice` | `음성으로 답하기` | 마이크 버튼 접근성 |
| `intake_chat_waiting` | `답변을 준비하고 있어요` | 대기 점 세 개 접근성 |
| `voice_idle_title` | `말씀해 주세요` | 음성 패널 |
| `voice_idle_description` | `편하게 말씀하시면 제가 정리할게요` | 음성 패널 |
| `voice_listening_title` | `듣고 있어요` | 음성 패널 |
| `voice_listening_description` | `다 말씀하시면 버튼을 다시 눌러주세요` | 음성 패널 |
| `voice_processing_title` | `정리하는 중이에요` | 음성 패널 |
| `voice_processing_description` | `잠시만 기다려 주세요` | 음성 패널 |
| `voice_denied_title` | `마이크를 쓸 수 없어요` | 음성 패널 |
| `voice_denied_description` | `설정에서 마이크 권한을 켜주세요` | 음성 패널 |
| `voice_next_hint` | `"다음"이라고 말하거나 버튼을 눌러주세요` | 문답 종료 후 음성 패널 설명 |
| `voice_type_instead` | `직접 입력할게요` | 음성 패널 하단 버튼 |
| `voice_mic_start` | `말하기 시작` | 마이크 접근성 (IDLE/PROCESSING/DENIED) |
| `voice_mic_stop` | `말하기 끝내기` | 마이크 접근성 (LISTENING) |
| `intake_severity_question` | `%1$s 얼마나 아프세요?` | 1d 제목 (`%1$s` = 조사 붙은 부위) |
| `intake_severity_description` | `지금 느끼는 정도를 골라주세요.`<br>`정확한 숫자가 아니어도 괜찮아요.` | 1d 설명 (`\n` 포함) |
| `intake_severity_notice_title` | `숫자는 진료실에서 의사가 읽어요` | 1d Notice 제목 |
| `intake_severity_notice_body` | `환자분은 낱말로 고르시면 돼요.`<br>`카드에는 NRS 등가로 함께 표시됩니다.` | 1d Notice 본문 (`\n` 포함) |
| `severity_1_label` | `조금 불편해요` | 통증 1단계 |
| `severity_1_description` | `신경 쓰이지만 하던 일은 계속할 수 있어요` | 통증 1단계 |
| `severity_2_label` | `은근히 아파요` | 통증 2단계 |
| `severity_2_description` | `자꾸 생각나고 집중이 잘 안 돼요` | 통증 2단계 |
| `severity_3_label` | `꽤 아파요` | 통증 3단계 |
| `severity_3_description` | `하던 일을 멈추게 될 때가 있어요` | 통증 3단계 |
| `severity_4_label` | `많이 아파요` | 통증 4단계 |
| `severity_4_description` | `일상생활이 어렵고 참기 힘들어요` | 통증 4단계 |
| `severity_5_label` | `견디기 힘들어요` | 통증 5단계 |
| `severity_5_description` | `잠도 못 자고 아무것도 못 하겠어요` | 통증 5단계 |
| `severity_scale_low` | `가벼운 불편` | 슬라이더 왼쪽 끝 |
| `severity_scale_high` | `매우 심함` | 슬라이더 오른쪽 끝 |
| `severity_nrs` | `NRS %1$d–%2$d` | showNrs일 때만 (화면 기본 false) |
| `severity_level_content_description` | `%1$d단계, %2$s` | 슬라이더 접근성 |
| `intake_questions_question` | `의사에게 물어볼 것을 적어두세요` | 1i 제목 |
| `intake_questions_description` | `진료실에서 잊지 않고 꺼낼 수 있게`<br>`브리핑 카드 맨 아래에 함께 담아드려요.` | 1i 설명 (`\n` 포함) |
| `intake_questions_placeholder` | `정밀 검사를 받아야 하나요?` | 1i 입력칸 placeholder |
| `intake_questions_add` | `질문 추가` | + 버튼 접근성 |
| `intake_questions_saved` | `적어둔 질문` | 1i 섹션 헤더 |
| `intake_questions_ai_hint` | `AI가 추천하는 질문이에요` | 1i 목록 위 한 줄 |
| `intake_questions_count` | `%1$d개` | 1i 섹션 헤더 caption |
| `intake_questions_remove` | `%1$d번째 질문 지우기` | × 버튼 접근성 |
| `intake_done_title` | `증상 정리가 끝났어요` | 1c-5 제목 |
| `intake_done_description` | `말씀하신 내용을 진료실에서 보여줄`<br>`카드로 만들 준비가 됐어요` | 1c-5 설명 (`\n` 포함) |
| `intake_done_card` | `브리핑 카드 만들기` | 1c-5 Primary 버튼 |
| `intake_done_hospital` | `진료받을 병원 먼저 찾기` | 1c-5 Outline 버튼 |

코드에 하드코딩된 문장 (리소스 아님):

| 문장 | 위치 |
|---|---|
| `{부위조사} 불편하시군요. 언제부터 그러셨어요? 정확하지 않아도 괜찮아요.` | `IntakeViewModel.intakeOpeningLine()` — 세션 생성 실패 시에만 |
| `다음` (음성 명령 인식어) | `IntakeVoiceActions.NEXT_WORD` |

---

## 16. 디자인 토큰 수치 (웹 CSS 매핑용)

| 토큰 | 값 |
|---|---|
| `MedicalMateSize.gutter` | 20dp (화면 좌우 여백) |
| `MedicalMateSize.safeBottom` | 24dp |
| `MedicalMateSize.controlLg` | 56dp (TextField·L 버튼 높이) |
| `MedicalMateSize.mic` | 88dp |
| `MedicalMateSize.iconMd` | 20dp |
| `MedicalMateSize.iconLg` | 24dp |
| `MedicalMateSpace` | s2=2, s4=4, s6=6, s8=8, s10=10, s12=12, s14=14, s16=16, s20=20, s24=24 |
| 말풍선 최대 폭 | 280dp |
| 진행 표시 트랙 높이 | 6dp, 칸 간격 4dp |
| 진행 표시 전체 최소 높이 (라벨 없는 변형) | 34dp |
| 슬라이더 트랙 / 정지점 / thumb / thumb 테두리 | 10 / 6 / 28 / 4 |
| 통증 숫자 칩 | 28×28, radius `xs` |
| 질문 번호 원 | 22×22, radius full |
| Notice 아이콘 배지 | 32 원, 아이콘 20, padding 왼쪽 14·오른쪽 16·위아래 14, 제목-본문 간격 3 |
| 1c-5 아이콘 원 / 아이콘 | 80 / 38 |
| 대기 점 | 8dp, 간격 4, 상하 padding 14 |
| 음성 LISTENING 링 | 6dp |

---

## 17. 웹 포팅 시 위험 지점 (상세)

1. **IME(키보드) 인셋 → `visualViewport`**
   안드로이드는 `WindowInsets.ime`를 자동 스크롤 트리거에 넣는다. 웹은 iOS Safari에서 키보드가 올라와도 `window.innerHeight`가 안 바뀌므로 `visualViewport.height`를 구독해야 같은 동작이 난다. 이걸 놓치면 마지막 말풍선이 입력창 뒤에 숨는다.

2. **STT 개인정보 경계가 달라진다**
   ML Kit GenAI는 오디오가 기기 밖으로 안 나간다. Web Speech API(Chrome)는 **서버로 오디오를 보낸다.** 의료 문답 앱에서 이 차이는 기능 차이가 아니라 정책 차이다. 기본을 `voiceAvailable = false`로 두고 별도 결정을 받는 편이 안전하다.

3. **"다음" 음성 명령의 한글 처리**
   `filterNot { it.isWhitespace() || it in ".,!?" }` 후 `startsWith("다음") && length <= 6`. JS `String.prototype.trim()`으로는 안 되고 정규식 `/[\s.,!?]/g` 제거로 옮겨야 한다. 길이 판정이 **코드 유닛 수**라 한글은 문제없지만 이모지가 섞이면 `[...str].length`를 써야 한다.

4. **조사 계산을 UI에서 하지 말고 상태에서 하라**
   `bodyPartSubject`는 파생 getter다. 웹에서 템플릿에 `{bodyPart}가`로 박으면 "무릎가"가 나온다. 부위 25개 중 받침 있는 것과 없는 것이 섞여 있다.

5. **`completed` 플래그의 재진입**
   Compose는 목적지를 떠나면 ViewModel이 죽어 자동으로 초기화된다. 웹 전역 store는 살아남으므로 1c-5에서 뒤로 왔을 때 `completed === true`가 남아 무한 리다이렉트가 난다. 언마운트 시 reset 필요.

6. **말풍선 key = 서버 `seq`**
   낙관적으로 붙인 말풍선의 임시 id(`max+1`)와 서버 `seq`가 섞인다. 서버 응답이 오면 **목록 전체를 갈아 끼우므로** React `key`가 통째로 바뀐다. 애니메이션을 붙이면 전부 다시 마운트된다 — key 전략을 별도로 생각해야 한다.

7. **에러 UI가 아예 없다**
   `sendFailed`, `restoreFailed`, `restoring` 세 상태가 안드로이드에서 렌더링되지 않는다. 웹에서 새로 만들어야 하고, 특히 "보낸 말은 화면에 남기고 재전송 조작은 없다"는 현재 동작이 웹에서 그대로면 사용자가 멈춘다. 재전송 버튼 추가를 권한다.

8. **`sessionId == null`인 채로 문답이 진행될 수 있다**
   세션 생성이 실패해도 앱은 문답을 계속한다. 그 상태에서는 `onSend`가 조용히 `return`하고, `saveSeverity`/`saveQuestions`도 `?: return`으로 빠진다. **즉 4단계를 다 해도 아무것도 저장되지 않고 1c-5에서 두 버튼이 동작하지 않는다.** 웹에서는 이 경우를 명시적으로 알려야 한다.

9. **하단 CTA 바 Glass**
   안드로이드는 backdrop blur API가 없어 불투명으로 후퇴했다. 웹은 `backdrop-filter`가 있으니 원래 디자인(Glass, `bg/surface` 78%)을 되살릴 수 있다 — 하지만 두 플랫폼이 달라 보이게 된다. 어느 쪽에 맞출지 결정 필요.

10. **슬라이더 드래그 추종**
    `<input type=range step=1>`로 만들면 안드로이드의 "끄는 동안 손가락을 따라가고 놓을 때 붙는" 동작이 안 난다. `step="any"` + `onChange`에서 `Math.round()`로 단계를 계산하고, 시각적 thumb 위치는 연속값으로 그려야 같아진다.

11. **진행 표시가 스크롤된다**
    껍데기에 sticky로 붙이면 Figma 의도와 달라진다. 본문 첫 요소로 넣어 함께 스크롤시켜야 한다.

12. **`\n`이 박힌 문자열 5개**
    `intake_severity_description`, `intake_severity_notice_body`, `intake_questions_description`, `intake_done_description`이 줄바꿈을 문자열에 갖고 있다. 웹에서 `white-space: pre-line`을 주거나 `<br>`로 나눠야 시안과 줄이 같다.

---

## 18. 미확인 / 결정 필요 사항

1. **"AI가 추천하는 질문이에요" 문구가 항상 나온다.** `SavedQuestions`는 `questions`가 비어 있지 않으면 무조건 이 힌트를 그린다 — 환자가 직접 적은 질문만 있어도 나온다. AI 후보와 직접 입력을 구분하는 플래그가 `IntakeUiState`에 없다. 의도인지 버그인지 확인 필요.
2. **질문 개수 상한.** `IntakeSession.questions` 주석은 "최대 셋이다"라고 적었지만 UI에는 상한이 없다(`onAdd`가 무제한 추가). 서버 `PUT /questions`가 4개 이상을 어떻게 처리하는지 미확인.
3. **문답을 끝내는 조작이 시안에 없다**(#69). 현재 구현은 `chatFinished`일 때 하단에 "다음"을 추가로 띄우는 임시안이고 디자인 트랙에 남아 있다.
4. **`voice_next_hint`("다음"이라고 말하거나 버튼을 눌러주세요)는 시안에 없는 문구**다(#190). 디자인 확인 필요.
5. **환자 말풍선 꼬리.** 문서는 꼬리가 있다고 적었고 Figma 마스터에는 없다. 구현은 마스터를 따랐다.
6. **`TurnResponse.reply`, `endReason`, `progress`를 앱이 안 쓴다.** `progress`는 `IntakeTurn.answered/total`로 매핑만 되고 화면에 안 나온다. 웹에서 "문답 n번째 질문" 표시를 넣을 여지가 있는지 결정 필요.
7. **`Rejected`의 `ApiErrorCode` 목록**을 확인하지 않았다. 문답 관련 에러 코드(세션 만료, 나이/성별 미입력 400 등)의 정확한 값은 `core/network/ApiErrorCode`와 서버 문서를 봐야 한다.
8. **`onReplied`의 주석과 코드가 어긋난다** (5-3절). KDoc은 "문답이 끝났으면 다시 듣지 않는다"인데 코드에 `chatFinished` 검사가 없다. 음성 "다음" 명령이 성립하려면 코드 쪽이 맞아야 하므로 **주석이 오래된 것으로 판단**했다. 안드로이드 쪽에서 주석을 고칠지, 아니면 실제로 끊을 의도였는지 확인 필요 — 후자라면 `voice_next_hint` 문구도 함께 빠져야 한다.
9. **`siteText`가 `null`인 채로 복원되면 대화가 완전히 빈다** (10-2절). 서버가 그 값을 비워 줄 수 있는지 확인 필요. 웹에서는 최소한 대체 문구를 둘지 결정해야 한다.
10. **음성 인식 중 화면을 떠날 때의 정리**가 명시적이지 않다. `Dictation.stop()`을 부르는 곳은 "직접 입력할게요"·음성 명령 인식·`onInputModeChange(TEXT)`뿐이고, 목적지를 떠날 때는 ViewModel(과 `viewModelScope`)이 사라지면서 Job이 취소되는 것에 기댄다. **웹에는 그 자동 취소가 없다** — 언마운트 훅에서 직접 끊어야 한다.
11. **`IntakeDoneScreen`의 `sessionId == null` 경로가 빈 화면이다.** `return@composable`이라 NavBar조차 그려지지 않고, 사용자는 아무것도 없는 목적지에 남는다(뒤로는 눌러야 한다 — 시스템 뒤로만 가능). 웹에서는 이 경우를 라우트 가드로 돌려보내는 편이 낫다.
