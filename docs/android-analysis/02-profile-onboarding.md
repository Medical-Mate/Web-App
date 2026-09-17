# 온보딩 · 신상정보 · 내 정보 (ONB, 1b, 1s)

## 웹앱 구현 메모

- 모바일 폭 고정: 기준 폭 360dp / 콘텐츠 320dp이지만 안드로이드는 폭을 고정하지 않고 거터 20px만 유지한 채 콘텐츠를 늘린다. 웹은 `max-width: 480px` + `margin: 0 auto` 센터링 컨테이너를 쓰되, 좌우 패딩 20px를 전역 규칙으로 고정하면 동일한 결과가 나온다. 단, 온보딩 일러스트만 거터를 무시하고 화면 폭을 쓰되 `max-width: 352px`로 멈춘다.
- 애니메이션: 온보딩 장 전환(320ms 슬라이드+페이드, 물러나는 장은 1/4만 이동)은 CSS transform + transition으로 1:1 재현 가능. 완료 화면(1b-4)의 스프링 반동(ζ=0.30, stiffness=900)은 CSS만으로는 못 낸다 — Web Animations API의 keyframe 근사(진입 220ms `cubic-bezier(0.4,0,1,1)` → 오버슈트 +4px → 반동 −1.5px → 정지, 총 660ms)로 대체하라. `prefers-reduced-motion`에서는 전부 끄고 정지 상태만 그린다.
- 제스처: 온보딩 좌우 스와이프(임계 56px)는 pointer 이벤트로 구현해야 한다. 안드로이드도 끄는 동안 화면이 따라오지 않고 손을 뗄 때만 전환하므로, 웹도 드래그 누적값만 재고 `pointerup`에서 판정하면 된다. 안드로이드 하드웨어 뒤로가기(첫 장에서는 무시)는 웹에서 브라우저 뒤로가기 대신 화면 내 상태로만 처리하고, 첫 장에서는 history를 건드리지 않는다.
- 대체 방안: `DataStore`(온보딩 완료 기록·기기 설정 2개)는 `localStorage`로 대체한다. 알러지 툴팁의 Popup(별도 레이어)은 `position: fixed` + 포털로 띄워야 한다 — 인라인으로 두면 아래 칩들이 밀린다(안드로이드에서 실제로 터진 버그 #71).

---

## 0. 이 문서가 다루는 파일

읽은 소스는 전부 아래에 있다. 이 문서의 모든 문구·필드·수치는 이 파일들에서 그대로 옮겼다.

| 경로 | 역할 |
| --- | --- |
| `app/src/main/java/com/mist/medicalmate/profile/ui/OnboardingPage.kt` | 온보딩 4장의 문구·이미지 enum |
| `.../profile/ui/OnboardingScreen.kt` | 온보딩 화면 레이아웃·전환·스와이프 |
| `.../profile/ui/OnboardingIntroDestination.kt` | 온보딩 라우트와 장 인덱스 상태 |
| `.../profile/ui/OnboardingGateViewModel.kt` | 온보딩 완료 여부 게이트 |
| `.../profile/ui/ProfileSetupScreen.kt` | 신상정보 3단계 화면 |
| `.../profile/ui/ProfileSetupUiState.kt` | 3단계 enum + UiState |
| `.../profile/ui/ProfileSetupViewModel.kt` | 3단계 상태·저장 |
| `.../profile/ui/ProfileSetupDestination.kt` | 1b-1~1b-3, 1b-4 라우트 |
| `.../profile/ui/ProfileCompleteScreen.kt` | 완료 화면 + 모션 |
| `.../profile/ui/MyProfileScreen.kt` | 내 정보(1s-1) 화면 |
| `.../profile/ui/MyProfileUiState.kt` | 내 정보·건강수정 UiState |
| `.../profile/ui/MyProfileViewModel.kt` | 내 정보 로드·설정 토글 |
| `.../profile/ui/MyProfileDestination.kt` | 1s-1, 1s-2 라우트 |
| `.../profile/ui/HealthEditScreen.kt` | 건강 정보 수정(1s-2) 화면 |
| `.../profile/ui/HealthEditViewModel.kt` | 1s-2 상태·저장 |
| `.../profile/ui/AccountActions.kt` | 로그아웃·회원탈퇴 버튼과 다이얼로그 |
| `.../profile/data/HealthProfileApi.kt` | `GET`/`PUT /api/me/health-profile` |
| `.../profile/data/HealthProfileRepository.kt` | 도메인 모델 변환·저장 |
| `.../profile/data/SettingsApi.kt` | `GET`/`PATCH /api/me/settings` |
| `.../profile/data/SettingsRepository.kt` | 알림 설정 |
| `.../profile/data/OnboardingStore.kt` | 온보딩 완료 기록(DataStore) |
| `.../profile/data/LocalSettingsStore.kt` | 기기 전용 설정 2개(DataStore) |
| `.../profile/data/ProfileModule.kt` | Hilt 바인딩 |
| `app/src/main/res/values/strings.xml` (312~416, 507~514, 534~536행) | 모든 화면 문구 |
| `.../navigation/MedicalMateNavGraphs.kt` (55~131행) | 이 도메인의 네비게이션 연결 |
| `.../navigation/MedicalMateNavHost.kt` (52~167행) | 시작 목적지 판정 · 세션 경계 `resetTo` |
| `.../MainActivity.kt` | 스플래시 게이트 + 계정 동작 연결 |

이 문서가 치수를 인용한 디자인 시스템 컴포넌트(`core/designsystem/component/`)는 아래와 같다. 값은 전부 이 파일들에서 읽었다.

| 파일 | 이 문서에서 쓰는 곳 |
| --- | --- |
| `OnboardingProgress.kt` | §2.4 온보딩 점 |
| `ProgressIndicator.kt` | §3.5 `1 / 3` 진행 표시 |
| `Tooltip.kt` · `TooltipTrigger.kt` · `TooltipBubble.kt` | §3.6 알러지 툴팁 |
| `Chip.kt` | §3.13 칩 |
| `Rows.kt` | §5.4 KvRow · 구역 머리 |
| `Selection.kt` | §5.5 토글 |
| `Avatar.kt` · `Notice.kt` · `Loading.kt` · `NavBar.kt` · `BottomCtaBar.kt` | §5.3 · §6.11 · §9.4 · §9.5 |

---

## 1. 전체 흐름

```
스플래시(1a-1)
  └ 세션 확인 중 or 온보딩 기록 읽는 중이면 스플래시 유지
       ↓
로그인(1o)
       ↓  onAuthenticated(onboardingRequired)
   onboardingRequired && !기기의 온보딩완료기록
       ├ true  → 온보딩 인트로 4장 (ONB / V2-00~V2-03)
       └ false → 홈
       ↓ "시작하기"(마지막 장) 또는 "건너뛰기"(모든 장)
신상정보 1b-1 복용약 → 1b-2 기저질환 → 1b-3 알러지
       ↓ "완료" → PUT /api/me/health-profile 성공해야만
신상정보 완료 1b-4 (2초 머문 뒤 자동 이동)
       ↓ onOnboardingCompleted() + navController.resetTo(홈)
홈(1n)
       ↓ 헤더 아바타 탭
내 정보 1s-1
       ↓ "건강 정보" 구역의 "수정"
건강 정보 수정 1s-2
       ↓ "저장하기" 성공 → popBackStack() → 1s-1
```

`MedicalMateNavGraphs.kt:61~84`(진입/온보딩), `:118~131`(내 정보) 참고.

**로그인 → 온보딩은 화면이 `navigate`하는 것이 아니다.** 로그인 화면은 `onAuthenticated(onboardingRequired)`로 세션 상태만 바꾸고, 그래프가 두 곳에서 목적지를 정한다(`MedicalMateNavHost.kt:65`, `:126~134`, `:146~167`):

1. `startDestination = session.destination(onboardingCompleted)` — 앱이 처음 그려질 때.
2. `SessionBoundarySync` — **로그인 여부가 바뀌는 순간에만** `navController.resetTo(session.destination(...))`. `snapshotFlow { currentSession is SignedIn }.drop(1)`이라 최초 값은 건너뛰고(시작 목적지가 이미 반영했다), **온보딩을 마치는 순간에는 이동이 나가지 않는다** — 목적지 전체를 관찰하면 1b-4가 하는 `resetTo(홈)`을 뒤늦은 재설정이 덮어쓴다.

판정식은 둘 다 같다: `if (onboardingRequired && !onboardingCompleted) OnboardingIntroDestination else HomeDestination`.

`resetTo`는 `popUpTo(inclusive)`로 백스택을 비운다. **`NavHost` 자체를 세션 상태로 갈아치우지 않는 이유**는 그렇게 하면 목적지별 ViewModel이 정리되지 않고 쌓이기 때문이다(`NavHost`는 `onDispose {}`로 아무것도 정리하지 않는다). 백스택에서 pop될 때만 확실히 정리된다 — 로그아웃하면 홈 엔트리가 pop되면서 `HomeViewModel`도 사라지고 다음 계정에 이전 계정 데이터가 남지 않는다. 웹에서는 라우터 `replace` + **화면 단위 상태를 언마운트에서 반드시 버리는 것**으로 같은 보장을 만들어야 한다.

---

## 2. 온보딩 (ONB / Figma `V2-00`~`V2-03`)

Figma 노드 id: `1320:4570`(V2-00) · `1320:4605`(V2-01) · `1320:4635`(V2-02) · `1320:4675`(V2-03).
소스 주석에 위 4개가 그대로 적혀 있다(`OnboardingPage.kt:9`, `OnboardingScreen.kt:50`).

### 2.1 라우트와 상태

- 라우트 객체: `OnboardingIntroDestination` (파라미터 없음). 웹 경로 제안: `/onboarding`.
- **4장이 한 목적지 안에서 넘어간다.** 장마다 라우트를 두지 않는다 — 백스택이 4겹 쌓이고, 신상정보로 나간 뒤에도 4장이 뒤에 남기 때문(`OnboardingIntroDestination.kt:21~25`).
- ViewModel이 없다. 화면 로컬 상태 2개뿐이다.

| 상태 | 타입 | 초기값 | 설명 |
| --- | --- | --- | --- |
| `index` | `Int` (rememberSaveable) | `0` | 현재 장의 인덱스(0..3) |
| `forward` | `Boolean` (rememberSaveable) | `true` | 전환 방향. 앞으로면 true, 되짚으면 false |

웹에서는 `useState` 2개 + `sessionStorage` 복원으로 충분하다.

### 2.2 `OnboardingPage` enum — 4장 전문

`OnboardingPage.kt:20~60`. 각 장은 제목 1개, 설명 1개, 일러스트 1개를 갖는다.
`\n`은 소스의 실제 줄바꿈이다. **웹에서도 이 지점에서 정확히 줄을 바꿔야 한다.**

| # | enum | 제목 (`title`) | 설명 (`description`) | 일러스트 |
| --- | --- | --- | --- | --- |
| 1 | `PREPARE` | `말하기 어려웠던 증상,`<br>`함께 준비해요.` | `아픈 곳을 짚고, 증상을 말해 주세요.`<br>`진료 전에 보여줄 카드부터`<br>`진료 후 기록까지 함께 정리해요.` | `img_onboarding_prepare` |
| 2 | `POINT` | `짚어요.` | `정확한 의학 용어를 몰라도 괜찮아요.`<br>`아픈 부위를 먼저 고르고,`<br>`이어지는 질문에 편하게 답해 주세요.` | `img_onboarding_point` |
| 3 | `CARD` | `정리해요.` | `말한 증상은 AI가 한 장으로 정리해요.`<br>`직접 확인하고 고친 뒤,`<br>`진료실에서 의료진에게 보여 주세요.` | `img_onboarding_card` |
| 4 | `FOLLOW` | `이어가요.` | `진료에서 들은 말과 처방을 기록해요.`<br>`다음 진료 일정까지 한곳에서,`<br>`다시 준비할 때 꺼내 볼 수 있어요.` | `img_onboarding_follow` |

파생 값:

| 이름 | 계산 | 용도 |
| --- | --- | --- |
| `step` | `ordinal + 1` (1..4) | 진행 표시의 현재 단계 |
| `isLast` | `this == entries.last()` | 마지막 장 여부 |
| `ctaLabel` | `isLast ? onboarding_start : onboarding_next` | 하단 버튼 문구 |
| `total` | `entries.size` = 4 | 진행 표시의 총 단계 |

공통 문구 3개:

| 리소스 | 문구 | 위치 |
| --- | --- | --- |
| `onboarding_next` | `다음` | 1~3장 하단 버튼 |
| `onboarding_start` | `시작하기` | 4장 하단 버튼 |
| `onboarding_skip` | `건너뛰기` | 상단 우측. **4장 모두에 있다** |

일러스트는 `res/drawable/img_onboarding_*.xml` 4개(벡터 드로어블). 웹 포팅 시 SVG로 내보내야 한다. 그림 안에 글자가 없어 통째로 내보냈고, **tint를 씌우지 않는다** — 그라디언트가 한 색으로 눌리고 선이 세 가지 색으로 나뉘어 있기 때문(`OnboardingScreen.kt:236`).

### 2.3 레이아웃 (위 → 아래)

```
┌─ Column (fillMaxSize, background = bgSurface) ────────────┐
│ ① TopBar          height 56, padding-x 20                 │
│    [Spacer weight 1] [진행표시] [Box weight 1 → 건너뛰기]  │
│                                                            │
│ ② PageContent     weight 1 (남는 높이 전부)                │
│    ├ 글 블록  padding-x 20, padding-y 16                   │
│    │    제목   Heading/L  fg/default                       │
│    │    (top 24)                                           │
│    │    설명   Body/M     fg/subtle                        │
│    ├ Spacer weight 1  ← 높이 차이를 여기서 흡수            │
│    ├ 일러스트 블록  height 304, 거터 없음(화면 폭 사용)     │
│    │    이미지: top 6.8, max-width 352, aspect 352/290.4   │
│    └ Spacer height 80                                      │
│                                                            │
│ ③ MedicalMateBottomCtaBar                                  │
│    버튼(PRIMARY, fillMaxWidth) — "다음" 또는 "시작하기"     │
└────────────────────────────────────────────────────────────┘
```

세부 규칙:

- **상단 바에 뒤로가기(Nav Bar)가 없다.** 뒤로 갈 곳이 로그인이라 돌아가면 로그아웃처럼 읽힌다(`OnboardingScreen.kt:52`). 앞으로 가는 길과 건너뛰는 길만 둔다.
- 진행 표시는 **좌우에 같은 weight를 준 Spacer 사이**에 놓아 화면 가운데에 세운다. 건너뛰기 폭을 59로 박지 않았다 — 글꼴 배율이 커져도 진행 표시가 한쪽으로 밀리지 않게.
- 건너뛰기는 Button 컴포넌트가 아니라 `Text` + `clickable(role = Role.Button)`이다. Ghost 버튼 라벨이 15/13px인데 시안은 `Body/L Strong` 17px이라서. 대신 `heightIn(min = 48)` 터치 영역과 버튼 role을 얹었다. 색은 `fg/subtle`, radius는 `sm`(12px).
- **글이 그림보다 위다.** v1은 그림이 먼저였는데 시안이 순서를 바꿨다(`OnboardingScreen.kt:63`).
- 일러스트 블록만 좌우 거터를 받지 않는다. 시안의 그림이 352 폭이라 콘텐츠 320을 넘어 좌우로 16씩 빠져나간다. `widthIn(max = 352)`가 `fillMaxWidth`보다 **앞에** 와야 한다(뒤에 두면 상한이 무시된다).
- 1장만 제목이 두 줄이라 Copy 높이가 182, 나머지가 142다. 그 차이를 `Spacer(weight 1)`가 흡수한다. 글꼴 배율이 커지면 이 빈 칸이 먼저 줄고, 그다음 그림 아래 여백 80이 줄어 160 넘게 흡수한다.

### 2.4 진행 표시 — `MedicalMateOnboardingProgress`

Figma `1155:854`. `component/OnboardingProgress.kt`.

- 점 4개. **현재 점만 알약(pill)으로 가로로 늘어난다.**
- **지나온 점을 채우지 않는다.** 숫자도 없다. 읽고 넘기는 소개 화면에 진행률을 붙이면 남은 분량을 재촉하는 것으로 읽힌다(`OnboardingProgress.kt:29~33`). 신상정보의 `MedicalMateProgressIndicator`와 역할이 다르다.
- 점 크기 6x6, **활성 점은 20x6**(`ActiveDotWidth = 20.dp`, 높이는 그대로 6), 간격 8, radius `full`. 활성 점 색 `bg/primary`(#5566D2), 비활성 `bg/subtle`(#EDEFF5).
- 컨테이너는 `heightIn(min = 24)`(`TrackHeight`) — 점이 6이고 나머지는 위아래 여백이다. 웹도 줄 높이를 24로 잡아야 상단 바 56 안에서 시안과 같은 자리에 선다.
- 늘어나는 것은 `animateDpAsState`로 잇는다. 끊어지면 어느 점이 현재인지 눈으로 못 따라간다. **기기에서 애니메이션을 끄면 배율이 0이 되어 즉시 바뀐다** — 웹의 `prefers-reduced-motion`이 같은 자리다.
- `require(current in 1..total)` 가드가 있다. 범위를 벗어난 값을 넘기면 던진다(웹은 개발 모드 경고로 옮기면 된다).
- `total`의 기본값이 `4`다(`DEFAULT_STEPS`). 온보딩 화면은 `OnboardingPage.total`을 명시해 넘긴다.
- 접근성 트리에서는 `"2/4 단계"`(`progress_step` = `%1$d/%2$d 단계`)로 **한 번만** 읽는다. 점을 하나씩 읽으면 소리만 길어지고 점 자체는 조작할 수 없다. 웹에서는 `aria-label`을 컨테이너에 주고 점들은 `aria-hidden`.

### 2.5 장 전환 애니메이션 (#227)

`OnboardingScreen.kt:159~218`.

| 항목 | 값 |
| --- | --- |
| 지속 시간 | `320ms` (`PAGE_DURATION`) — 화면 전환(`MedicalMateNavTransitions`)과 같은 값 |
| easing | `FastOutSlowInEasing` (CSS `cubic-bezier(0.4, 0.0, 0.2, 1)`) |
| 들어오는 장 | `slideInHorizontally { width -> direction * width }` + `fadeIn` |
| 나가는 장 | `slideOutHorizontally { width -> -direction * width / 4 }` + `fadeOut` |
| `direction` | 앞으로 갈 때 `+1`, 되짚을 때 `-1` |
| 패럴랙스 | `PAGE_PARALLAX = 4` — **들어오는 장이 나가는 장보다 4배 더 움직인다** |

**상단 바와 하단 버튼은 함께 밀리지 않는다.** 진행 표시가 같이 밀리면 몇 번째 장인지가 눈에서 사라지고, 버튼은 자리가 고정이라 손가락이 따라다니지 않아도 된다. 전환 대상은 `PageContent`(글+그림)뿐이다.

전에는 글과 그림이 제자리에서 즉시 갈렸다. 넘긴 것인지 화면이 바뀐 것인지 구별되지 않고 되짚어 온 것인지도 알 수 없어서 방향 전환을 넣었다.

### 2.6 스와이프 제스처 (#239)

- `detectHorizontalDragGestures`로 가로 드래그 누적값만 잰다.
- 임계값 `SwipeThreshold = 56dp`. 이보다 짧으면 "넘기려던 것이 아니라 스쳤다"고 본다.
- `onDragEnd`에서 판정: `dragged <= -56 && !page.isLast` → 다음 장 / `dragged >= +56` → 이전 장.
- **끌리는 동안 화면이 따라오지 않는다.** `AnimatedContent`가 장을 통째로 갈아 끼우는 구조라 중간 상태가 없고, 손을 떼는 순간 같은 전환이 돈다. 웹도 동일하게 만들면 된다(따라오게 만들면 오히려 안드로이드와 달라진다).
- 마지막 장에서 왼쪽으로 밀어도 다음으로 가지 않는다(`!page.isLast` 가드). "시작하기" 버튼을 눌러야 나간다.

### 2.7 뒤로가기

`BackHandler { toPrevious() }`.

- `index > 0`이면 `forward = false`로 두고 `index -= 1`.
- **첫 장에서는 아무 일도 하지 않는다.** 그냥 두면 로그인 화면으로 나가는데, 이미 로그인한 사람을 로그인 화면에 세우는 것이라 로그아웃된 것으로 읽힌다(`OnboardingIntroDestination.kt:49~51`).
- 웹 포팅: 브라우저 뒤로가기를 가로채기보다, 온보딩 진입 시 `history.pushState`를 4번 쌓지 말고 화면 내 상태로만 다루고 `popstate`에서 첫 장이면 `pushState`로 되돌리는 방어가 필요하다.

### 2.8 나가는 경로

| 트리거 | 가는 곳 |
| --- | --- |
| 마지막 장에서 "시작하기" | `ProfileSetupDestination` (1b-1) |
| 아무 장에서 "건너뛰기" | `ProfileSetupDestination` (1b-1) — 동일 |
| 1~3장에서 "다음" / 왼쪽 스와이프 | 다음 장 (화면 내) |
| 뒤로가기 / 오른쪽 스와이프 (2~4장) | 이전 장 (화면 내) |
| 뒤로가기 / 오른쪽 스와이프 (1장) | 아무 일 없음 |

**건너뛰기도 시작하기와 같은 자리로 나간다.** 건너뛰는 것은 소개 4장이지 그다음 신상정보가 아니다(`OnboardingIntroDestination.kt:24~25`).

### 2.9 로딩 / 빈 상태 / 에러

**없다.** 네트워크 호출이 전혀 없고 문구·이미지가 전부 로컬 리소스다. 비어 있을 수 있는 값도 없다.

### 2.10 사용하는 디자인 시스템 컴포넌트

- `MedicalMateOnboardingProgress`
- `MedicalMateBottomCtaBar`
- `MedicalMateButton` (기본 `PRIMARY`, size `L`)
- 토큰: `MedicalMateTheme.colors.bgSurface / fgDefault / fgSubtle`, `MedicalMateTheme.typography.headingL / bodyM / bodyLStrong`, `MedicalMateSize.gutter(20) / touchMin(48)`, `MedicalMateSpace.s16 / s24`, `MedicalMateRadius.sm(12)`

---

## 3. 신상정보 입력 3단계 (1b-1 · 1b-2 · 1b-3)

Figma 노드 id: `398:1225`(1b-1) · `398:1285`(1b-2) · `398:1341`(1b-3).
부분 노드: 질문 블록 `398:1244`, 칩 영역 `398:1247`, 하단 버튼 `398:1275`.

### 3.1 화면 하나가 3단계를 그린다

세 화면이 같은 레이아웃에 **문구와 칩 목록만 다르다**. 화면을 3개 만들지 않고 `ProfileSetupStep` enum이 차이를 들고 한 화면이 그린다(`ProfileSetupUiState.kt:8~19`). 웹에서도 컴포넌트 하나 + step 데이터로 가는 것을 권장한다.

라우트: `ProfileSetupDestination` (파라미터 없음). 웹 경로 제안: `/profile-setup` (단계는 쿼리나 내부 상태).

### 3.2 `ProfileSetupStep` enum

| # | enum | `questionRes`(질문) | `descriptionRes`(설명) | `labelRes`(짧은 이름, 1s-2에서 사용) | `optionsRes` |
| --- | --- | --- | --- | --- | --- |
| 1 | `MEDICATIONS` | `지금 드시는 약이 있나요?` | `처방약, 영양제, 한약 모두 포함해요. 여러 개 골라도 돼요.` | `복용 중인 약` | `profile_setup_medications_options` |
| 2 | `CONDITIONS` | `진단받은 병이 있나요?` | `지금 치료 중이거나 꾸준히 관리하는 것을 알려주세요.` | `기저질환` | `profile_setup_conditions_options` |
| 3 | `ALLERGIES` | `알러지가 있나요?` | `약이나 음식에 반응이 있었다면 꼭 알려주세요.` | `알러지` | `profile_setup_allergies_options` |

파생: `number = ordinal + 1` (화면의 `1 / 3`), `isLast`, `total = 3`.

### 3.3 기본 제공 칩 목록 — 전체

`strings.xml:376~412`. **아래가 전부다. 순서도 그대로다.**

**복용약 (`profile_setup_medications_options`) — 8개**

1. `혈압약`
2. `당뇨약`
3. `진통제`
4. `위장약`
5. `영양제`
6. `한약`
7. `피임약`
8. `수면제`

**기저질환 (`profile_setup_conditions_options`) — 8개**

1. `고혈압`
2. `당뇨`
3. `고지혈증`
4. `천식`
5. `갑상선`
6. `위염·역류`
7. `관절염`
8. `우울·불안`

**알러지 (`profile_setup_allergies_options`) — 7개**

1. `페니실린`
2. `아스피린`
3. `조개·갑각류`
4. `땅콩`
5. `계란`
6. `꽃가루`
7. `먼지·진드기`

가운뎃점은 U+00B7 `·`이다(`위염·역류`, `조개·갑각류`, `먼지·진드기`, `우울·불안`).

**이 배열은 1s-2(건강 정보 수정)에서도 같은 리소스를 쓴다.** 두 화면의 목록이 갈리면 1b에서 고른 것이 1s-2에 없는 일이 생긴다(`MyProfileUiState.kt:95~97`). 웹에서도 단일 상수 모듈로 공유하라.

### 3.4 레이아웃 (위 → 아래)

```
┌─ Column (fillMaxSize, background = bgSurface) ────────────┐
│ ① MedicalMateNavBar                                        │
│     title = "내 정보 등록", leading = BACK,                │
│     surface = GLASS                                        │
│                                                            │
│ ② 본문 Column  weight 1, verticalScroll,                   │
│    padding(start 20, end 20, top 12, bottom 16),           │
│    항목 간격 20                                            │
│    ├ MedicalMateProgressIndicator                          │
│    │     current = step.number, total = 3,                 │
│    │     label = "내 정보 등록"                            │
│    ├ Question  (padding-top 8, 내부 간격 8)                │
│    │    Row: 질문(Heading/L, weight 1)                     │
│    │         + [ALLERGIES 단계만] 툴팁 트리거              │
│    │    설명(Body/M, fg/subtle)                            │
│    ├ Options  FlowRow, 가로/세로 간격 8                    │
│    │    기본 칩들만 (직접 추가 칩 없음)                    │
│    └ MedicalMateTextField                                  │
│         label       = "직접 입력"                          │
│         placeholder = "목록에 없으면 여기에 적어주세요"     │
│         helperText  = "정확한 이름을 몰라도 괜찮아요"       │
│                                                            │
│ ③ Footer  padding(start 20, end 20, top 12, bottom 8),     │
│           항목 간격 8, background = bgSurface              │
│    ├ [saveFailed일 때만] "저장하지 못했어요. 다시 눌러주세요." │
│    │     Body/S, fg/danger                                 │
│    └ MedicalMateButton (fillMaxWidth)                      │
│         label = isLast ? "완료" : "다음"                   │
│         enabled = !saving                                  │
└────────────────────────────────────────────────────────────┘
```

주의: Footer는 `MedicalMateBottomCtaBar`가 **아니다**. 직접 만든 `Column`이고 하단 패딩이 8이다(BottomCtaBar는 top 12 / bottom 24 / 간격 10).

**본문에 스크롤을 준다.** 칩이 여러 줄로 흐르고 그 아래 입력 칸까지 있어서 좁은 화면이나 큰 글꼴에서 넘친다(`ProfileSetupScreen.kt:40~41`).

### 3.5 진행 표시 — `MedicalMateProgressIndicator` (label 변형)

Figma `334:1139`의 `Meta` 슬롯을 켠 모습. 온보딩의 점과 **다른 컴포넌트**다.

```
┌──────────────────────────────────────────┐
│ 내 정보 등록                      1 / 3  │   ← Row, 간격 8 아래
│ ▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │   ← SegmentedBar, 칸 사이 4
└──────────────────────────────────────────┘
```

- 왼쪽 라벨: `내 정보 등록` (`profile_setup_title`), `Body/S`, `fg/subtle`, `weight 1`.
- 오른쪽 숫자: `progress_step_count` = `%1$d / %2$d` → **화면 표기는 `1 / 3`** (공백 포함). `Body/S Strong`, `fg/primary`.
- 막대: 총 6칸 이하이므로 `SegmentedBar`. 3칸을 `weight 1`씩, 간격 4, **칸 높이 6**(`TrackHeight`), radius `full`. `index < current`인 칸이 채워진다(= 지나온 칸도 채워진다 — 온보딩 점과 반대).
- `total`이 **6을 넘으면**(`SEGMENT_LIMIT = 6`) 칸을 나누지 않고 `ContinuousBar`(채움/남음을 `weight`로 나눈 연속 막대)로 바뀐다. 이 도메인은 3이라 항상 `SegmentedBar`지만, 웹 컴포넌트를 공용으로 만들 거면 이 분기를 같이 옮겨야 다른 도메인에서 어긋나지 않는다.
- 라벨 행과 막대 사이 간격 8(`Column`의 `spacedBy(s8)`). 라벨 없는 변형(`label = null`)은 **막대와 숫자가 한 줄**(간격 12, 숫자 `Label/M` `fg/subtle`, 최소 높이 34)로 바뀐다 — 이 도메인에서는 쓰지 않는다.
- 접근성: 컨테이너에 `"내 정보 등록, 1/3 단계"` 한 번(`"$label, $spoken"`, `progress_step` = `%1$d/%2$d 단계`). 칸은 개별로 읽지 않는다(`clearAndSetSemantics`).

### 3.6 알러지 툴팁 (ALLERGIES 단계 전용)

`ProfileSetupScreen.kt:122~127`.

| 항목 | 값 |
| --- | --- |
| 말풍선 문구 (`profile_setup_allergies_tooltip`) | `브리핑 카드 맨 위에 항상 표시돼요` |
| 트리거 접근성 이름 (`profile_setup_allergies_tooltip_open`) | `알러지를 왜 묻는지 보기` |

- **알러지 단계에만 붙는다.** 왜 묻는지가 그 단계에서만 설명이 필요하다 — 브리핑 카드 맨 위에 항상 표시되는 항목이라서.
- 질문 텍스트 오른쪽, 같은 `Row`에서 `verticalAlignment = CenterVertically`.
- 트리거: `MedicalMateTooltipTrigger` — 히트 영역 48x48, Active 채움 32x32(`bg/primary-faint` #F2F4FE), 아이콘 24. 아이콘 색은 Idle/Active 둘 다 `fg/default`(Active에서 글자색이 바뀌지 않는 점이 IconButton Tonal과 다르다).
- **말풍선은 `Popup`으로 별도 창에 띄운다.** 같은 레이아웃에서 겹치면 감싸는 상자가 말풍선 높이만큼 커져서 아래 칩들이 밀려 내려간다 — 실제로 터진 버그다(#71). 웹은 포털 + `position: fixed` 필수.
- 말풍선 규격(Figma `575:1287`): **폭은 고정 180이 아니라 `widthIn(max = 180)` 상한**이다(`BubbleMaxWidth`) — 글이 짧으면 그만큼 줄고 길면 180에서 줄바꿈해 높이가 는다. 시안의 36은 한 줄일 때의 높이다. 좌우 패딩 12, 위아래 10, radius 10(`BubbleCornerRadius` — `radius/full`을 주면 높이 36에서 18이 되어 알약이 되므로 이 컴포넌트만 예외다), 꼬리 16x10(`ArrowWidth`/`ArrowHeight`), **꼬리 중심이 오른쪽 끝에서 24**(`DefaultArrowOffsetFromEnd`). 면 색 `bg/inverse-soft`(#3A4053), 글자 `fg/on-inverse`(#FFFFFF). 꼬리는 별도 요소가 아니라 `Shape`에 포함(따로 얹으면 이음선이 생긴다) — 웹은 `clip-path` 또는 `::after` 삼각형 대신 단일 SVG/`clip-path`를 권한다.
- 배치: 트리거 아래, **오른쪽 정렬**. 꼬리가 끝에서 24이므로 오른쪽을 맞추면 꼬리가 트리거를 가리킨다.
- **위치 계산 전문**(`Tooltip.kt:69~95`의 `PopupPositionProvider`) — 웹 포털도 이 식을 그대로 옮겨야 한다:

  ```
  x = clamp(anchor.right - bubbleWidth,  20,  windowWidth - bubbleWidth - 20)
  y = anchor.bottom + 2
  ```

  | 상수 | 값 | 뜻 |
  | --- | --- | --- |
  | `TooltipGap` | `2.dp` | 트리거 **히트 영역(48)의 아래 끝**에서 말풍선까지. 채움(32)이 아니라 히트 영역 기준이다 |
  | `TooltipMargin` | `20.dp` | 화면 좌우에 남기는 최소 여백. 본문 거터와 같은 값 |

  왼쪽 하한이 오른쪽 상한보다 커지는 경우(말풍선이 화면보다 넓을 때)를 대비해 상한에 `coerceAtLeast(margin)`이 한 번 더 걸려 있다. 트리거가 화면 끝에 붙어 있으면 오른쪽 맞춤만으로는 말풍선이 밖으로 나가므로 **clamp가 필수다.**
- 여닫기: 트리거 탭으로 토글(`open = !open`), 말풍선 **밖을 누르면 닫힌다**(`Popup`의 `onDismissRequest`). 열림 상태는 화면이 아니라 `MedicalMateTooltip` 내부의 `remember { mutableStateOf(false) }`다 — **`ProfileSetupUiState`에 없다.** 웹도 컴포넌트 로컬 상태로 두면 된다. 열림 여부는 `expand`/`collapse` semantics 액션으로 알린다(웹은 `aria-expanded` + 버튼).

### 3.7 직접 입력 방식 (1b 전용 — 1s-2와 다르다)

`MedicalMateTextField` 한 칸. 칩 아래에 **항상** 보인다(버튼을 눌러야 열리는 1s-2와 다르다).

| 슬롯 | 문구 |
| --- | --- |
| `label` | `직접 입력` |
| `placeholder` | `목록에 없으면 여기에 적어주세요` |
| `helperText` | `정확한 이름을 몰라도 괜찮아요` |

**쉼표로 나눈다.** `ProfileSetupViewModel.kt:114~118`:

```kotlin
val written = answer.note.split(",").map(String::trim).filter(String::isNotEmpty)
return HealthField((answer.chosen + written).toList())
```

`"혈압약, 아스피린"`을 한 항목으로 두면 목록에서 약 하나로 세어진다. 읽어 올 때도 같은 규칙으로 되돌린다. 입력 칸은 단계별로 각각 보관된다(`answers[step].note`).

### 3.8 UiState 전체 필드

**`ProfileSetupUiState`** (`ProfileSetupUiState.kt:73~90`)

| 필드 | 타입 | 기본값 | TS 타입 제안 | 설명 |
| --- | --- | --- | --- | --- |
| `step` | `ProfileSetupStep` | `MEDICATIONS` | `'MEDICATIONS' \| 'CONDITIONS' \| 'ALLERGIES'` | 현재 단계 |
| `answers` | `Map<ProfileSetupStep, ProfileSetupAnswer>` | `emptyMap()` | `Partial<Record<ProfileSetupStep, ProfileSetupAnswer>>` | 3단계의 답을 한 곳에. 단계를 오갈 때 이전 답이 남아야 하고 마지막에 한 번에 저장 |
| `completed` | `Boolean` | `false` | `boolean` | 저장 성공. **성공해야만 선다** |
| `saving` | `Boolean` | `false` | `boolean` | 저장 중. 버튼 비활성 |
| `saveFailed` | `Boolean` | `false` | `boolean` | 저장 실패. 하단에 한 줄. **시안에 없는 문구다** |

파생(계산 속성):

| 이름 | 타입 | 계산 |
| --- | --- | --- |
| `answer` | `ProfileSetupAnswer` | `answers[step] ?: ProfileSetupAnswer()` |
| `canGoBack` | `Boolean` | `step != MEDICATIONS` |

**`ProfileSetupAnswer`** (`ProfileSetupUiState.kt:65`)

| 필드 | 타입 | 기본값 | TS 타입 |
| --- | --- | --- | --- |
| `chosen` | `Set<String>` | `emptySet()` | `Set<string>` 또는 `string[]` |
| `note` | `String` | `""` | `string` |

**"없다"를 따로 두지 않는다.** 고를 것이 없으면 아무것도 고르지 않고 넘어간다. 그리고 **빈 답을 "없다"로 보내지 않는다** — 서버는 `NONE`("없다")과 `UNKNOWN`("모른다")을 가르는데 아무것도 고르지 않고 넘어간 것이 둘 중 어느 쪽인지 화면이 알 수 없다. 그래서 빈 답은 `UNKNOWN`으로 나간다.

### 3.9 동작 (ViewModel)

`ProfileSetupViewModel.kt`.

| 함수 | 동작 |
| --- | --- |
| `onOptionToggle(option)` | 현재 단계의 `chosen`에서 토글. 있으면 빼고 없으면 넣는다 |
| `onNoteChange(note)` | 현재 단계의 `note` 교체 |
| `onNext()` | 마지막 단계면 `complete()`, 아니면 `step = entries[ordinal + 1]` |
| `onBack()` | `canGoBack`이면 `step = entries[ordinal - 1]`, 아니면 아무 일 없음(화면을 벗어나는 것은 호출자 몫) |
| `complete()` (private) | `saving` 중이면 무시 → `saving = true, saveFailed = false` → `save()` → `saving = false, completed = saved, saveFailed = !saved` |
| `save()` (private) | `repository.profile()` **먼저 읽고**(Success 아니면 false) → `repository.save(profile, toHealthEdit())` → Success면 true |

**저장이 통째로 덮어쓰기라 먼저 읽는다.** 이름·출생연도·성별을 그대로 되돌려 보내야 하는데 그 셋은 카카오에서 오고 이 화면이 묻지 않는다.

**단계마다 보내지 않는다.** 서버가 부분 갱신을 주지 않고, 이 흐름은 중간에 나가면 아무것도 남지 않는 자리다. **다른 화면과 달리 임시저장이 없다.**

`onOptionToggle`·`onNoteChange`는 `updateAnswer`를 거친다. 현재 단계의 답이 `answers`에 없으면 `ProfileSetupAnswer()`에서 시작해 새로 만들어 넣는다(`answers + (step to next)`). 웹도 맵을 미리 채우지 말고 같은 lazy 방식으로 두면 "건드린 단계"와 "안 건드린 단계"가 구별된다.

> **소스 주석 주의**: `ProfileSetupViewModel`의 KDoc에 "**서버 저장은 아직 없다.** `complete`가 상태만 바꾼다"라고 적혀 있는데 **지금 코드와 맞지 않는다.** `complete()`는 실제로 `save()`를 부르고 `PUT`까지 나간다(`ProfileSetupViewModel.kt:76~91`). 오래된 주석이므로 구현을 기준으로 읽어라.

### 3.10 로딩 / 빈 상태 / 에러

| 상태 | 화면 |
| --- | --- |
| 로딩 | 전용 로딩 화면 **없음**. 저장 중(`saving = true`)에는 하단 버튼만 `enabled = false`로 흐려진다. 스피너 없음 |
| 빈 상태 | **없음**. 칩 목록이 로컬 상수라 비는 경우가 없다. 아무것도 안 골라도 정상 흐름 |
| 에러 | `saveFailed = true`일 때 하단 버튼 **위에** `저장하지 못했어요. 다시 눌러주세요.` (`Body/S`, `fg/danger` #C4302B). 마지막 단계에는 다음 화면이 없어서 조용히 실패하면 버튼이 죽은 것으로 보인다 |

### 3.11 나가는 경로

| 트리거 | 가는 곳 |
| --- | --- |
| 1b-1에서 NavBar 뒤로가기 | `popBackStack()` → 온보딩 목적지. **마지막 장이 아니라 "나올 때 보던 장"이다** — 온보딩의 `index`가 `rememberSaveable`이고 목적지가 백스택에 그대로 남아 있어 그 값이 복원된다. 1장에서 "건너뛰기"로 나왔다면 1장으로 돌아온다 |
| 1b-2 / 1b-3에서 NavBar 뒤로가기 | 이전 단계 (화면 내) |
| "다음" (1b-1, 1b-2) | 다음 단계 (화면 내) |
| "완료" (1b-3) + 저장 성공 | `ProfileCompleteDestination` (1b-4) |
| "완료" (1b-3) + 저장 실패 | 화면에 머문다. 에러 한 줄 표시 |

`onBackClick = { if (state.canGoBack) viewModel.onBack() else onExit() }` (`ProfileSetupDestination.kt:64`).

완료 신호는 `LaunchedEffect(state.completed)`로 한 번만 흘려보낸다. 목적지 스코프라 화면을 떠나면 ViewModel도 사라지므로 소비 표시를 따로 두지 않는다.

### 3.12 시안과 어긋나는 지점 (웹도 동일하게 갈지 판단 필요)

**Figma에는 "잘 모르겠어요 · 없어요" 보조 버튼이 하단에 하나 더 있는데 넣지 않았다**(`ProfileSetupScreen.kt:158~164`). 고를 것이 없으면 아무것도 고르지 않고 다음을 누르면 되고, 같은 뜻의 길이 두 개면 어느 쪽을 눌러야 하는지 고민하게 된다. 디자인 트랙 이슈 #67.

그 판단을 다시 봐야 한다: 서버가 "없다"(`NONE`)와 "모른다"(`UNKNOWN`)를 다른 값으로 받는데 지금은 구별할 자리가 없어 빈 답을 모두 `UNKNOWN`으로 보낸다. 시안의 보조 버튼도 한 개에 두 뜻을 묶어 둬서 그대로 넣어서는 갈리지 않는다(#150).

### 3.13 사용하는 디자인 시스템 컴포넌트

- `MedicalMateNavBar` (leading `BACK`, surface `GLASS`)
- `MedicalMateProgressIndicator` (label 변형)
- `MedicalMateTooltip` (= `MedicalMateTooltipTrigger` + `MedicalMateTooltipBubble`)
- `MedicalMateChip`
- `MedicalMateTextField`
- `MedicalMateButton`
- `MedicalMateSurfaceStyle.GLASS`

**`MedicalMateChip` 스펙**(`component/Chip.kt`): 높이 40(`controlSm`), radius `full`, 최소 폭 64, 좌우 패딩 16, 글자 `Label/M`(SemiBold 13/18).

| 상태 | 면 | 글자 | 테두리 |
| --- | --- | --- | --- |
| 미선택 | `bg/surface` #FFFFFF | `fg/default` #131722 | 1px `border/default` #C6CAD8 |
| 선택 | `bg/primary-subtle` #E3E7FC | `fg/primary` | **1.5px** `border/primary` #5566D2 |
| 비활성 | `bg/subtle` #EDEFF5 | `fg/disabled` | 없음 |

선택 여부는 `semantics { selected = ... }`로 따로 알린다(웹: `aria-pressed` 또는 `role="checkbox" aria-checked`). 최소 폭 64는 `전신`처럼 두 글자짜리가 좌우 여백을 더해도 64에 못 미쳐 폭이 들쭉날쭉해지는 것을 막는다.

---

## 4. 신상정보 완료 (1b-4 / Figma `676:2519`)

### 4.1 개요

라우트: `ProfileCompleteDestination` (파라미터 없음). 웹 경로 제안: `/profile-setup/done`.

**버튼이 없다.** 머문 뒤 스스로 다음으로 넘어간다.

| 상수 | 값 | 설명 |
| --- | --- | --- |
| `DWELL_MILLIS` | `2_000L` (2초) | 화면에 머무는 시간. 모션 660ms가 끝나고 문구를 읽을 만큼 남는다. 스플래시와 같은 값. **Figma에 값이 없어서 정한 것** |

### 4.2 레이아웃 (위 → 아래)

```
┌─ Column (fillMaxSize, background = bg/primary #5566D2) ───┐
│                                                            │
│  Column  weight 1, padding-x 20, padding-y 16,             │
│          간격 20, 세로 가운데 정렬, 가로 가운데 정렬        │
│                                                            │
│      [ 로고 마크 두 조각 106x106 ]   ← 가로로 날아와 충돌   │
│                  (간격 20)                                  │
│      "내 정보가 등록되었어요"                               │
│          Heading/L, fg/on-primary(#FFFFFF), 가운데 정렬     │
│                  (간격 20)                                  │
│      "복용약 · 기저질환 · 알러지를 카드에 담았어요"          │
│          Body/M, fg/on-primary, 가운데 정렬, alpha 0.85     │
│                                                            │
│  Box height 24 (safeBottom)                                │
└────────────────────────────────────────────────────────────┘
```

문구 2개:

| 리소스 | 문구 |
| --- | --- |
| `profile_complete_title` | `내 정보가 등록되었어요` |
| `profile_complete_description` | `복용약 · 기저질환 · 알러지를 카드에 담았어요` |

**배경이 브랜드 면(`bg/primary`)이다.** 이 도메인에서 유일하게 `bgSurface`가 아닌 화면.

### 4.3 완료 모션 — 정확한 키프레임

Figma 프로토타입 전용 섹션 `704:3251`의 세 프레임이 키프레임이다.

| 상태 | 왼쪽 조각 x | 오른쪽 조각 x | 제목 alpha | 부제 alpha |
| --- | --- | --- | --- | --- |
| M1 진입 | `−148.5` | `+148.5` | `0` | `0` |
| M2 충돌 | `+4.0` | `−4.0` | `0.35` | `0.12` |
| M3 반동 | `−1.5` | `+1.5` | `0.80` | `0.55` |
| 1b-4 정지 | `0` | `0` | `1.0` | `0.85` |

두 조각이 화면 밖에서 서로를 향해 날아와 **지나쳐 부딪히고 되튕긴 뒤** 제자리에 선다. 네 프레임의 y가 모두 같아서 **가로 이동만 있다.** 조각은 항상 대칭이라 값 하나로 둘을 움직인다(오른쪽은 부호만 뒤집는다).

구현 상수:

| 상수 | 값 | 의미 |
| --- | --- | --- |
| `MarkSize` | `106.dp` | Figma 1b-4 인스턴스 크기 |
| `ENTRY_TRAVEL` | `148.5f` | M1의 조각 위치. 마크 폭보다 멀어 화면 밖에서 들어온다 |
| `OVERSHOOT` | `4f` | M2에서 서로를 지나친 거리 |
| `ENTRY_DURATION_MS` | `220` | 진입 구간 |
| `REBOUND_DAMPING_RATIO` | `0.30f` | 스프링 감쇠비 ζ |
| `REBOUND_STIFFNESS` | `900f` | 스프링 강성. 반주기 110ms |
| `CONTACT_MS` | `220` (= 진입 끝) | 충돌 시점 |
| `REBOUND_MS` | `330` | 반동 정점 (충돌 + 반주기 110) |
| `REST_MS` | `660` | 정지 시점 = 전체 모션 길이 |
| `SUB_REST_ALPHA` | `0.85f` | 부제는 정지 상태에서도 완전 불투명이 아니다 (Figma `677:4017`) |

2구간으로 나눈 이유(`ProfileCompleteScreen.kt:97~104`):

> 스프링 하나로는 두 번의 흔들림을 낼 수 없다. 감쇠 진동의 첫 오버슈트 비율은 `exp(-πζ/√(1-ζ²))`인데, 148.5에서 출발해 4.0만 지나치려면 ζ가 0.76이어야 하고 그러면 두 번째 흔들림이 0.1도 안 남아 M3가 사라진다. 반대로 4.0 → 1.5 비율(0.375)에 ζ를 맞추면 0.30이고, 그 값으로 148.5에서 출발하면 55를 지나쳐 버린다.

그래서:

1. **진입**: `tween(220ms, FastOutLinearInEasing)`으로 `−148.5 → +4.0`. **끝에서 가속해야 부딪히는 것으로 읽힌다.** CSS `cubic-bezier(0.4, 0.0, 1.0, 1.0)`.
2. **반동**: `spring(ζ=0.30, stiffness=900)`으로 `+4.0 → 0`. ζ=0.30이면 첫 반동이 `4.0 × exp(-π×0.3/√0.91) = 1.49`로 M3와 맞는다.

문구 2개는 같은 시간선 위의 `keyframes`다(이동과 물리적으로 얽혀 있지 않고 네 상태의 불투명도만 지나가면 된다):

```
durationMillis = 660
0     at 0
contact at 220     // 제목 0.35 / 부제 0.12
rebound at 330     // 제목 0.80 / 부제 0.55
rest    at 660     // 제목 1.00 / 부제 0.85
```

**웹 포팅**: CSS transition만으로는 2구간 + 스프링을 못 낸다. Web Animations API로

```js
markUpper.animate([
  { transform: 'translateX(-148.5px)', easing: 'cubic-bezier(0.4,0,1,1)' },
  { transform: 'translateX(4px)',      offset: 220/660, easing: 'cubic-bezier(0.34,1.56,0.64,1)' },
  { transform: 'translateX(-1.5px)',   offset: 330/660 },
  { transform: 'translateX(0px)' },
], { duration: 660, fill: 'forwards' });
```
정도로 근사하고, 오른쪽 조각은 부호를 뒤집는다. 제목/부제는 별도 `animate`로 위 alpha 키프레임 그대로.

### 4.4 로고 조각

`MedicalMateLogo.MarkUpper` = `ic_logo_mark_upper` (왼쪽 위 조각), `MedicalMateLogo.MarkLower` = `ic_logo_mark_lower` (오른쪽 아래 조각). 겹쳐 놓으면 `MedicalMateLogo.Mark`와 같다. 신상정보 완료 화면의 모션이 두 조각을 각각 가로로 움직여서 나눠 뒀다 — 한 장으로는 조각별 이동을 만들 수 없다. **정지 상태를 그릴 때는 `Mark`를 쓴다**(`prefers-reduced-motion` 대응에 그대로 쓰면 된다).

둘 다 `ColorFilter.tint(fg/on-primary)` = 흰색으로 칠한다. **둘 다 장식이라 접근성 이름을 주지 않는다**(`contentDescription = null`). 화면의 뜻은 아래 제목이 전한다. 웹에서는 `aria-hidden="true"`.

`remember { Animatable(...) }`로 들고 있어 **화면이 다시 조합돼도 모션이 다시 돌지 않는다.**

### 4.5 나가는 경로

| 트리거 | 동작 |
| --- | --- |
| 2초 경과(자동, `LaunchedEffect`) | `onOnboardingCompleted()` 호출 + `navController.resetTo(HomeDestination)` |

`onOnboardingCompleted()`는 `MainActivity.kt:87~90`에서
`sessionViewModel.onOnboardingCompleted()` (세션의 `onboardingRequired`를 false로) +
`onboardingGateViewModel.markCompleted()` (DataStore에 기록) 둘 다 부른다.

`resetTo(HomeDestination)`이라 **백스택이 비워진다** — 홈에서 뒤로가기로 온보딩에 돌아갈 수 없다. 웹은 `history.replaceState` 또는 라우터의 `replace`.

**참고**: 소스 주석에 "다음은 `1b-4 · 홈 · 등록 완료 토스트`다"라고 적혀 있으나, **홈에 등록 완료 토스트를 띄우는 코드는 현재 없다**(`home/` 전체에 Toast 호출 없음). 웹 포팅 시 구현 여부를 확인하라.

### 4.6 로딩 / 빈 상태 / 에러

**전부 없다.** 네트워크 호출이 없다(저장은 이전 화면에서 이미 성공했다). 정지 화면 하나뿐.

### 4.7 사용하는 디자인 시스템 컴포넌트

- `MedicalMateLogo.MarkUpper` / `MedicalMateLogo.MarkLower`
- 토큰: `colors.bgPrimary`, `colors.fgOnPrimary`, `typography.headingL / bodyM`, `MedicalMateSize.gutter(20) / safeBottom(24)`, `MedicalMateSpace.s16 / s20`

(NavBar도 BottomCtaBar도 Button도 없다.)

---

## 5. 내 정보 (1s-1 / Figma `407:2375`)

### 5.1 개요

라우트: `MyProfileDestination` (파라미터 없음). 웹 경로 제안: `/me`.

**홈 헤더의 아바타에서 들어온다.** 하단 탭에 두지 않았다 — 세 탭이 기록·홈·캘린더로 확정됐기 때문(Tab Bar v2).

건강 정보는 **요약만 보여주고 고치는 것은 1s-2로 넘긴다.** 진료 때 보여줄 값이라 실수로 바뀌면 안 되고, 이 화면은 확인하는 자리다.

### 5.2 레이아웃 (위 → 아래)

```
┌─ Column (fillMaxSize, background = bgSurface) ────────────┐
│ ① MedicalMateNavBar                                        │
│     title = "내 정보", leading = BACK, surface = GLASS     │
│                                                            │
│ ② 본문 Column  weight 1, verticalScroll,                   │
│    padding(start 20, end 20, top 8, bottom 32)             │
│                                                            │
│  ┌ ProfileCard — MedicalMateCard ──────────────────┐       │
│  │  Row(간격 14, 세로 가운데)                       │       │
│  │   [Avatar 56]  Column(간격 2)                    │       │
│  │                  이름       Heading/M fg/default │       │
│  │                  "1994년생 · 여"  Body/S fg/subtle│      │
│  │                  "카카오로 로그인" Label/S fg/subtle│    │
│  └──────────────────────────────────────────────────┘       │
│                                                            │
│  MedicalMateSectionHeader(top 24, bottom 10)               │
│     "건강 정보"                              "수정" →      │
│                                                            │
│  ┌ HealthCard — RowCard (직접 만든 카드) ──────────┐       │
│  │  KvRow  "복용약"   값                            │       │
│  │  KvRow  "기저질환" 값                            │       │
│  │  KvRow  "알러지"   값  ← type = LINK (브랜드색)  │       │
│  └──────────────────────────────────────────────────┘       │
│                                                            │
│  MedicalMateSectionHeader  "설정"  (액션 없음)             │
│                                                            │
│  ┌ SettingsCard — RowCard ─────────────────────────┐       │
│  │  Toggle  "진료 하루 전 알림"          [ ○—]     │       │
│  │  Toggle  "브리핑 카드 자동 저장"      [ ○—]     │       │
│  │  Toggle  "진료실 화면 밝기 최대"      [—○ ]     │       │
│  └──────────────────────────────────────────────────┘       │
│                                                            │
│  AccountActions (padding-top 24, 간격 4)                   │
│     [ 로그아웃 ]      OUTLINE, fillMaxWidth                │
│     [ 회원탈퇴 ]      GHOST,   fillMaxWidth                │
└────────────────────────────────────────────────────────────┘
```

하단 CTA 바가 없다. 본문 스크롤 안에 계정 버튼까지 들어간다.

### 5.3 프로필 카드

- `MedicalMateAvatar(initial = profile.initial, size = 56, contentDescription = null)`.
  **이 화면에서만 56이다. 홈 헤더는 44다.** 원형, 면 `bg/primary-subtle`(#E3E7FC), 글자 `fg/primary`, `Body/L Strong`. `initial.take(1)` 한 글자만 그린다. `contentDescription = null`이라 접근성 트리에서 지워진다(`clearAndSetSemantics {}`).
- 이름(`profile.name`)이 null이면 **그 줄을 그리지 않는다.**
- 메타 줄은 생년과 성별을 `" · "`로 잇는다:
  - 생년: `my_profile_birth_year` = `%1$d년생` → `1994년생`
  - 성별: `my_profile_sex_female` = `여` / `my_profile_sex_male` = `남`
  - 예: `1994년생 · 여`
  - **둘 다 없으면 null이고 그 줄을 그리지 않는다.** 카카오 동의를 거부한 계정이 그렇다.
- 로그인 수단 줄은 고정 문구 `카카오로 로그인` (`my_profile_login_kakao`). 서버의 사용자 식별자가 `kakaoId` 단독이라 카카오 하나뿐이다. `Label/S`(Medium 11/16, letter-spacing 2.0).

**시안에는 오른쪽에 chevron이 있는데 넣지 않았다.** 가리키는 화면이 없다 — 이름·생년·성별은 카카오에서 오는 값이고 와이어프레임에 그것을 고치는 화면이 없다. 신상정보 입력(1b)은 온보딩 흐름이라 끝나면 홈으로 나가므로 수정 진입으로 재사용할 수 없다. 눌러도 아무 일이 없는데 chevron이 있으면 사용자가 눌러본다(`MyProfileScreen.kt:113~122`).

### 5.4 건강 정보 카드

`MedicalMateSectionHeader(title = "건강 정보", actionLabel = "수정", onActionClick = → 1s-2)`.

- 구역 머리: 제목 `Heading/M` `fg/default`, 액션 `Body/M Strong` `fg/link`(#2E3E9E). 액션은 버튼이 아니라 **글자**다(위아래 패딩 8로 터치 높이 40). `SpaceBetween`, 세로 가운데 정렬, padding(top 24, bottom 10).

3줄 모두 `MedicalMateKvRow`:

| 키 문구 | 리소스 | `type` |
| --- | --- | --- |
| `복용약` | `my_profile_health_medications` | `DEFAULT` |
| `기저질환` | `my_profile_health_conditions` | `DEFAULT` |
| `알러지` | `my_profile_health_allergies` | **`LINK`** |

**알러지만 브랜드색(`fg/link`)으로 세운다. 진료 때 먼저 전해야 하는 값이다.** 링크지만 `onClick`을 주지 않아 누를 수 없다(색만 다르다).

`MedicalMateKvRow` 스펙(`component/Rows.kt:114~160`, `:422~433`): 최소 높이 **54**(`RowHeightSm`), 키/값 간격 16, 키는 **고정 폭 72**(`KeyColumnWidth`) `Body/M` `fg/subtle`, 값은 `Body/L` (`LINK`면 `fg/link`, 아니면 `fg/default`). 키 폭을 고정하는 이유는 세 줄의 값이 같은 x에서 시작해야 눈으로 훑을 수 있어서다 — 웹도 `grid-template-columns: 72px 1fr`로 두고 키 칸을 줄바꿈시키지 마라.

**값 문구 결정 규칙** (`MyProfileScreen.kt:200~204`):

| `field.status` | 표시 |
| --- | --- |
| `KNOWN` | `field.items.joinToString(" · ")` → 예: `혈압약 · 진통제(증상 시)` |
| `NONE` | `없어요` (`my_profile_health_none`) |
| `UNKNOWN` | `잘 모르겠어요` (`my_profile_health_unknown`) |

**"없어요"와 "잘 모르겠어요"를 가른다.** 알러지에서 둘은 처방이 달라지는 값이라 같은 말로 뭉뚱그리면 안 된다. 다만 지금 화면에는 "없어요"를 말할 자리가 없어서 **서버가 그렇게 들고 있을 때만 나온다**(#150).

### 5.5 설정 카드

`MedicalMateSectionHeader(title = "설정")` — 액션 없음.

`AppSetting.entries` 순서대로 `MedicalMateToggle` 3개:

| # | enum | 라벨 문구 | 초기값 | 저장 위치 |
| --- | --- | --- | --- | --- |
| 1 | `VISIT_REMINDER` | `진료 하루 전 알림` | `true` | **계정** (`GET`/`PATCH /api/me/settings`) |
| 2 | `CARD_AUTO_SAVE` | `브리핑 카드 자동 저장` | `true` | **이 기기** (`DataStore`) |
| 3 | `HANDOFF_BRIGHTNESS` | `진료실 화면 밝기 최대` | `false` | **이 기기** (`DataStore`) |

`DefaultSettings`(`MyProfileUiState.kt:27~32`)가 위 초기값이고, 시안 1s-1이 그린 대로다. 읽어 오기 전까지만 쓰인다. 서버의 기본값도 켜짐이라 알림은 값이 같다.

**알림 하나만 계정에 붙는 이유**(#187, `MyProfileViewModel.kt:34~39`): 받을지 말지가 기기 취향이 아니라 **그 사람의 선택**이라서. 기기를 바꾸거나 앱을 다시 깔면 "안 받겠다"고 한 사람에게 알림이 다시 간다. 나머지 둘은 이 기기에서 어떻게 보일지의 문제다. **알림을 예약하는 것은 여전히 앱이다** — 이 값은 예약할지 말지를 정한다.

> **소스 주석 주의**: `MyProfileScreen`의 `SettingsCard` KDoc에 "**아직 저장되지 않는다.** 화면 안에서 켜고 끄는 것까지가 지금 범위"라고 적혀 있는데 **지금 코드와 맞지 않는다.** `MyProfileViewModel.onSettingChange`가 알림은 `PATCH /api/me/settings`로, 나머지 둘은 `DataStore`로 실제 저장한다(`MyProfileViewModel.kt:109~123`). #85 당시의 주석이 남은 것이다.

`MedicalMateToggle` 스펙(`component/Selection.kt:179~230`): 최소 높이 54(`SelectionRowHeight`), 좌우 패딩 4, `SpaceBetween`. 라벨 `Body/L` `fg/default`. Switch: 켜짐 thumb `fg/on-primary`(흰색) / track `bg/primary`, 꺼짐 thumb `bg/surface` / track·border `border/strong`. **행 전체가 `toggleable`이고 Switch 자체는 `onCheckedChange = null`** — 둘 다 반응하면 한 번 눌렀는데 두 번 바뀔 수 있다. `role = Role.Switch`.

**낙관적 갱신**: 토글을 누르면 **화면을 먼저 바꾸고 저장을 보낸다.** 왕복을 기다리면 누른 뒤에 잠깐 안 바뀐 것처럼 보인다. 알림(계정)은 **실패하면 되돌린다** — 안 받겠다고 한 것이 서버에 안 남았는데 화면만 꺼져 있으면 알림이 계속 온다. 나머지 둘은 이 기기에만 쓰는 값이라 되돌릴 실패가 없다.

### 5.6 RowCard — Card 컴포넌트를 쓰지 않는 이유

`MyProfileScreen.kt:225~248`. 건강 카드와 설정 카드는 `MedicalMateCard`가 **아니다.**

`MedicalMateCard`는 안쪽 여백 20에 자식 사이 간격 6인데, 이 두 카드는 행 자체가 높이 54~56에 여백을 갖고 있어서 카드가 위아래로 4만 남긴다. 그대로 Card에 넣으면 **시안보다 44 높아진다.**

직접 만든 `RowCard` 스펙:
- `shadow(elevation = MedicalMateElevation.card = 3dp, shape = radius/lg = 20dp, ambient/spot = ShadowTint)`
- `background(bg/surface, radius/lg)`
- `padding(horizontal = 20, vertical = 4)`

(프로필 카드만 진짜 `MedicalMateCard`를 쓴다.)

시안의 Health Card는 위아래 4, Settings는 6인데 코드는 둘 다 4로 통일했다.

### 5.7 로그아웃 · 회원탈퇴

`AccountActions.kt`. Figma 1s-1의 하단.

```
Column(fillMaxWidth, 간격 4, padding-top 24)
  [ 로그아웃 ]   MedicalMateButton, type = OUTLINE, fillMaxWidth
  [ 회원탈퇴 ]   MedicalMateButton, type = GHOST,   fillMaxWidth
```

| 리소스 | 문구 |
| --- | --- |
| `account_logout` | `로그아웃` |
| `account_withdraw` | `회원탈퇴` |

**회원탈퇴는 시안에 없다.** 1s-1 하단에는 로그아웃만 있다. 그렇다고 홈에 남겨 두면 로그아웃과 탈퇴가 다른 화면에 흩어지므로 로그아웃 아래에 텍스트(GHOST) 버튼으로 뒀다. 자리를 정하면 그대로 옮긴다(#85).

두 버튼 모두 `enabled = accountActions.enabled`. **로그아웃이나 탈퇴가 진행 중일 때 꺼진다** — 두 번 눌러 요청이 두 번 나가면 두 번째가 이미 없는 토큰으로 나간다.

**`AccountActionCallbacks`** (`AccountActions.kt:76~80`) — 이 화면의 상태가 아니라 **위에서 내려오는 묶음**이다. `MyProfileUiState`에 없다.

| 필드 | 타입 | 기본값 | 실제로 주입되는 값 (`MainActivity.kt:91~96`) |
| --- | --- | --- | --- |
| `enabled` | `Boolean` | `true` | `accountAction != AccountActionState.InProgress` |
| `onLogoutClick` | `() -> Unit` | `{}` | `sessionViewModel::logout` |
| `onWithdrawClick` | `() -> Unit` | `{}` | `sessionViewModel::withdraw` |

`MainActivity` → `MedicalMateNavHost` → `profileDestinations` → `myProfileDestination` → `MyProfileScreen` → `AccountActions`로 그대로 내려간다. 웹에서는 세션 스토어를 컴포넌트에서 직접 구독해도 되지만, **버튼 비활성의 근거가 세션 쪽 진행 상태라는 점**은 같아야 한다.

`confirmingWithdraw`는 `AccountActions` 내부의 `remember { mutableStateOf(false) }`다 — **`MyProfileUiState`에도 ViewModel에도 없다.** 화면을 벗어나면 사라진다.

**로그아웃은 확인 없이 즉시 실행된다.** 다이얼로그가 없다. `SessionViewModel.logout()`이 서버 호출 결과와 무관하게 로그인 화면으로 보내고, Repository가 로컬 토큰과 카카오 세션을 반드시 정리한다.

#### 탈퇴 확인 다이얼로그 (`WithdrawConfirmDialog`)

회원탈퇴를 누르면 로컬 상태 `confirmingWithdraw = true`가 되고 `AlertDialog`가 뜬다.

| 슬롯 | 리소스 | 문구 |
| --- | --- | --- |
| `title` | `account_withdraw_confirm_title` | `정말 탈퇴하시겠어요?` |
| `text` | `account_withdraw_confirm_message` | `저장된 브리핑 카드와 진료 기록이 모두 삭제되고 되돌릴 수 없어요` |
| `confirmButton` | `account_withdraw_confirm` | `탈퇴하기` — **글자색 `fg/danger`(#C4302B)** |
| `dismissButton` | `account_cancel` | `취소` |

`onDismissRequest`(바깥 탭 / 뒤로가기)도 취소와 같다. 확인을 누르면 `confirmingWithdraw = false` 후 `onWithdrawClick()`.

**탈퇴는 되돌릴 수 없어 확인 대화상자를 거친다.** 실수로 한 번 눌러서 계정이 사라지면 복구 수단이 없다.

M3 `AlertDialog`라 타이포는 `headlineSmall = Heading/M`, `bodyMedium = Body/M`, 버튼은 `labelLarge = Label/L`이 적용된다.

#### 탈퇴 실패 다이얼로그 (`WithdrawFailedDialog`)

**이 다이얼로그는 화면이 아니라 `MainActivity`가 띄운다**(`MainActivity.kt:101~103`). `sessionViewModel.accountAction == AccountActionState.WithdrawFailed`일 때.

| 슬롯 | 리소스 | 문구 |
| --- | --- | --- |
| `title` | — | **없음** |
| `text` | `account_withdraw_failed` | `탈퇴하지 못했어요. 계정은 그대로 있어요` |
| `confirmButton` | `account_confirm` | `확인` |

**계정이 그대로 남아 있다는 사실을 분명히 알린다.** `withdraw()`가 `NetworkUnavailable` 또는 `Rejected`를 받으면 로그인 상태를 유지한 채 이 다이얼로그를 띄운다(`SessionViewModel.kt`).

### 5.8 UiState 전체 필드

**`MyProfileUiState`** (`MyProfileUiState.kt:13~19`)

| 필드 | 타입 | 기본값 | TS 타입 제안 |
| --- | --- | --- | --- |
| `profile` | `MyProfile` | `MyProfile()` | `MyProfile` |
| `health` | `HealthSummary` | `HealthSummary()` | `HealthSummary` |
| `settings` | `Map<AppSetting, Boolean>` | `DefaultSettings` | `Record<AppSetting, boolean>` |

파생: `isOn(setting): Boolean = settings[setting] == true`

**`MyProfile`** (`MyProfileUiState.kt:48~53`)

| 필드 | 타입 | 기본값 | TS 타입 | 설명 |
| --- | --- | --- | --- | --- |
| `initial` | `String` | `""` | `string` | 아바타 한 글자. **자르는 규칙은 ViewModel에 있다** — 서버가 이름을 마스킹해서 줄 수 있고(`김OO`) 형식이 바뀌면 고칠 곳이 여럿이 된다. 홈 헤더 아바타도 같은 규칙 |
| `name` | `String?` | `null` | `string \| null` | null이면 그 줄을 안 그린다 |
| `birthYear` | `Int?` | `null` | `number \| null` | |
| `sex` | `ProfileSex?` | `null` | `'FEMALE' \| 'MALE' \| null` | 서버의 `UNSPECIFIED`와 모르는 값은 **null** |

**"1994년생 · 여" 같은 완성된 문장을 담지 않는다.** 앞말과 뒷말은 문자열 리소스에 있고 조립은 화면이 한다.

**`ProfileSex`** enum: `FEMALE`(라벨 `여`), `MALE`(라벨 `남`). **"밝히지 않음"을 적을 자리가 시안에 없고, 적어도 환자에게 쓸모가 없다.**

**`HealthSummary`** (`MyProfileUiState.kt:72~76`)

| 필드 | 타입 | 기본값 | TS 타입 |
| --- | --- | --- | --- |
| `medications` | `HealthField` | `HealthField()` | `HealthField` |
| `conditions` | `HealthField` | `HealthField()` | `HealthField` |
| `allergies` | `HealthField` | `HealthField()` | `HealthField` |

**문구가 아니라 값을 담는다.** "없어요"/"잘 모르겠어요"는 문자열 리소스에 있고 화면이 고른다. 상태가 문구를 들면 지금이 어느 상태인지 코드가 알 수 없다.

**`AppSetting`** enum: `VISIT_REMINDER`, `CARD_AUTO_SAVE`, `HANDOFF_BRIGHTNESS` — 각각 위 표의 라벨 리소스. **문구를 상태에 담지 않고 리소스 id로 둔다.** 문자열을 들면 지금이 어느 설정인지 코드가 알 수 없고, 문구를 다듬을 때마다 테스트가 깨진다.

**이 화면 상태에 없는 것 3가지** (웹에서 UiState에 끌어올리지 마라):
- 탈퇴 확인 다이얼로그 열림 여부 → `AccountActions`의 로컬 `remember`
- 로그아웃·탈퇴 진행 여부 → `AccountActionCallbacks.enabled`로 위에서 내려온다(세션 소유)
- 탈퇴 실패 다이얼로그 → `MainActivity`가 `SessionViewModel.accountAction`을 보고 띄운다

**Preview 데이터**(웹 목업에 그대로 쓸 수 있다): `previewMyProfile`(`MyProfileViewModel.kt:151~161`) = 프로필 `initial "김"` / `name "김OO"` / `birthYear 1994` / `sex FEMALE`, 건강 요약 복용약 `혈압약`·`진통제(증상 시)`, 기저질환 `고혈압`, 알러지 `페니실린`. 설정은 기본값 그대로다. **`name`이 `"김OO"`인 것은 서버가 이름을 마스킹해 줄 수 있다는 뜻이고**, 그래서 아바타 글자를 화면이 아니라 ViewModel에서 자른다.

### 5.9 데이터 로드

`LifecycleEventEffect(Lifecycle.Event.ON_RESUME) { viewModel.load() }` — **들어올 때 한 번이 아니라 보일 때마다 읽는다.** 1s-2에서 고치고 돌아오는 자리라, 한 번만 읽으면 방금 고친 값 대신 들어올 때 읽은 값이 남는다.

웹 포팅: 1s-2에서 돌아올 때(라우터 focus / `visibilitychange` / navigation 이벤트) 재조회하도록 걸어야 한다.

`load()` 순서(`MyProfileViewModel.kt:61~77`):

1. `loadSettings()` — 토글 3개를 각자의 자리에서 읽는다.
   - `settings.visitReminder()` (API). **못 읽으면 그 토글만 지금 값으로 둔다** — 화면 전체를 막을 값이 아니다.
   - `localSettings.cardAutoSave.first()` (DataStore)
   - `localSettings.handoffBrightness.first()` (DataStore)
2. `repository.profile()` (`GET /api/me/health-profile`). **Success가 아니면 `return@launch`** — 화면을 비우지 않고 그대로 둔다. 돌아올 때마다 부르는 호출이라, 잠깐 끊긴 것으로 적어 둔 값이 사라지면 지워진 것으로 보인다.
3. 성공하면 `profile`과 `health` 갱신.

**두 호출이 직렬이다.** `loadSettings()`를 `await`한 뒤에 건강 프로필을 부른다(같은 `launch` 안에서 순서대로). 화면에 보일 때마다 도는 흐름이라 **왕복이 두 번 쌓인다.** 웹에서는 `Promise.all`로 묶어도 화면 결과가 같다 — 두 값이 서로를 필요로 하지 않는다. 안드로이드가 직렬인 것은 의도라기보다 그렇게 쓰인 것에 가깝다.

또 `loadSettings()`는 기존 맵에 **덮어쓰기(`state.settings + listOfNotNull(...)`)**라, 알림을 못 읽으면 그 키를 아예 넣지 않아 직전 값(첫 로드면 기본 `true`)이 남는다. 기기 설정 둘은 `DataStore`라 실패가 없어 항상 들어간다.

`initial` 계산: `name?.take(1).orEmpty()`. **이름이 없으면 아바타 글자도 없다** — 빈 동그라미가 그려진다. 아무 글자나 채우면 그것이 이름의 첫 자로 읽힌다.

### 5.10 로딩 / 빈 상태 / 에러

| 상태 | 화면 |
| --- | --- |
| 로딩 | **전용 로딩 UI가 없다.** `MyProfileUiState()` 기본값(빈 프로필 + 빈 건강요약 3줄 + 기본 설정)이 그대로 보인다. 건강 3줄은 `HealthField()` 기본이 `status = UNKNOWN`이므로 **`잘 모르겠어요`가 3줄 뜬다**. 프로필은 이름·메타 줄이 빠지고 빈 아바타 + `카카오로 로그인`만 |
| 빈 상태 | 위와 같다. 별도 EmptyState 컴포넌트 없음 |
| 에러 (프로필 조회 실패) | **아무것도 안 보여주지 않는다.** 직전 값을 그대로 둔다. 에러 메시지·토스트 없음 |
| 에러 (알림 설정 조회 실패) | 그 토글만 현재(기본 `true`) 값 유지. 나머지는 정상 |
| 에러 (알림 설정 저장 실패) | 토글이 **되돌아간다**(원래 값으로). 에러 메시지 없음 |

웹 포팅 시 주의: 로딩 중에 `잘 모르겠어요`가 3줄 뜨는 것은 사용자에게 오해를 줄 수 있다. 안드로이드가 그렇게 동작하므로 그대로 갈지, 스켈레톤을 넣을지 판단이 필요하다(현재 `HealthEditScreen`에는 스피너가 있는데 이 화면에는 없다).

### 5.11 나가는 경로

| 트리거 | 가는 곳 |
| --- | --- |
| NavBar 뒤로가기 | `popBackStack()` → 홈 |
| "건강 정보" 구역의 `수정` | `HealthEditDestination` (1s-2) |
| `로그아웃` | 즉시 `sessionViewModel.logout()` → 로그인 화면(세션 경계 감시가 `resetTo(LoginDestination)`) |
| `회원탈퇴` → `탈퇴하기` | `sessionViewModel.withdraw()` → 성공 시 로그인 화면 / 실패 시 실패 다이얼로그 후 이 화면 유지 |
| `회원탈퇴` → `취소` / 바깥 탭 | 다이얼로그 닫힘, 이 화면 유지 |

### 5.12 사용하는 디자인 시스템 컴포넌트

- `MedicalMateNavBar` (leading `BACK`, surface `GLASS`)
- `MedicalMateAvatar` (size 56)
- `MedicalMateCard` (프로필 카드만)
- `MedicalMateSectionHeader` (액션 있음 / 없음 두 가지)
- `MedicalMateKvRow` + `MedicalMateKvRowType` (`DEFAULT`, `LINK`)
- `MedicalMateToggle`
- `MedicalMateButton` (`OUTLINE`, `GHOST`)
- `MedicalMateSurfaceStyle.GLASS`
- `MedicalMateElevation.card` + `ShadowTint` (직접 만든 RowCard)
- M3 `AlertDialog` + `TextButton` (탈퇴 다이얼로그 2종)

---

## 6. 건강 정보 수정 (1s-2 / Figma `407:2650`)

### 6.1 개요

라우트: `HealthEditDestination` (파라미터 없음). 웹 경로 제안: `/me/health`.

복용약·기저질환·알러지를 다시 고른다. **세 갈래를 한 화면에 두는 것이 1b와 다른 점이다.** 처음 등록할 때는 한 번에 하나씩 물어야 하지만, 고칠 때는 무엇이 들어 있는지 한눈에 보이는 쪽이 낫다.

**뒤로가 아니라 닫기(`CLOSE`)다.** 흐름을 한 단계 되돌리는 것이 아니라 수정 자체를 그만두는 것이다.

**읽는 시점은 `LaunchedEffect(Unit) { viewModel.load() }` — 들어올 때 한 번뿐이다**(`MyProfileDestination.kt:76`). 1s-1의 `ON_RESUME`과 다르다. 이 화면은 고치는 자리라 뒤에서 값이 바뀔 일이 없고, 보일 때마다 다시 읽으면 **고치던 선택이 서버 값으로 덮인다.** 웹도 마운트 1회로 두고, 포커스 복귀나 `visibilitychange`에 재조회를 걸지 마라.

### 6.2 레이아웃 (위 → 아래)

```
┌─ Column (fillMaxSize, background = bgSurface) ────────────┐
│ ① MedicalMateNavBar                                        │
│     title = "건강 정보 수정", leading = CLOSE,             │
│     surface = GLASS                                        │
│                                                            │
│ ② 본문 — loading이면 MedicalMateLoadingSpinner(weight 1)   │
│    아니면 EditContent:                                     │
│    Column weight 1, verticalScroll,                        │
│    padding-x 20, padding-y 12, 항목 간격 24                │
│                                                            │
│    ├ MedicalMateNotice (INFO)                              │
│    │    title = "바꾸면 다음 브리핑 카드부터 반영돼요"      │
│    │    body  = "이미 만든 카드는 그대로 남고,\n           │
│    │             새로 만드는 카드에 적용됩니다."            │
│    │                                                       │
│    ├ EditGroup(MEDICATIONS)  Column, 간격 10               │
│    │    "복용 중인 약"   Heading/S  fg/default             │
│    │    FlowRow(간격 8/8): 기본칩... + extras... + "+ 직접 추가" │
│    │    [adding == 이 갈래면] 입력 칸                       │
│    ├ EditGroup(CONDITIONS)   "기저질환"                    │
│    └ EditGroup(ALLERGIES)    "알러지"                      │
│                                                            │
│ ③ MedicalMateBottomCtaBar (간격 10, padding top12/x20/bot24)│
│    ├ [saveFailed일 때만] "저장하지 못했어요. 다시 눌러주세요."│
│    │      Body/S, fg/danger                                │
│    ├ [ 저장하기 ]  PRIMARY, fillMaxWidth,                  │
│    │      enabled = !loading && !saving                    │
│    └ [ 취소 ]      GHOST,   fillMaxWidth                   │
└────────────────────────────────────────────────────────────┘
```

**하단 CTA 바는 `loading`일 때도 그려진다** (본문만 스피너로 바뀐다). 저장 버튼만 비활성.

**`취소` 버튼에는 `enabled` 가드가 없다**(`HealthEditScreen.kt:81~86`). 읽는 중에도 저장 중에도 누를 수 있고 그 자리에서 `popBackStack()`이 나간다 — 저장 요청이 날아가는 중에 화면을 닫으면 결과를 못 본다(요청 자체는 `viewModelScope`에서 계속되지만 성공/실패가 어디에도 표시되지 않는다). NavBar의 닫기(`CLOSE`)도 같은 콜백이라 같다. **웹에서 `saving` 중 취소를 막을지는 판단이 필요한 지점이다**(안드로이드는 막지 않는다).

### 6.3 문구 전체

| 리소스 | 문구 | 위치 |
| --- | --- | --- |
| `health_edit_title` | `건강 정보 수정` | NavBar 제목 |
| `health_edit_notice_title` | `바꾸면 다음 브리핑 카드부터 반영돼요` | Notice 제목 |
| `health_edit_notice_body` | `이미 만든 카드는 그대로 남고,`<br>`새로 만드는 카드에 적용됩니다.` | Notice 본문 (`\n` 줄바꿈) |
| `profile_setup_medications_label` | `복용 중인 약` | 1번 그룹 제목 |
| `profile_setup_conditions_label` | `기저질환` | 2번 그룹 제목 |
| `profile_setup_allergies_label` | `알러지` | 3번 그룹 제목 |
| `health_edit_add` | `+ 직접 추가` | 각 그룹 마지막 칩 |
| `health_edit_add_placeholder` | `직접 적어주세요` | 추가 입력 칸 placeholder |
| `health_edit_add_submit` | `추가` | + 아이콘 버튼의 접근성 이름 |
| `health_edit_save` | `저장하기` | 하단 주 버튼 |
| `health_edit_cancel` | `취소` | 하단 보조 버튼 |
| `profile_setup_save_failed` | `저장하지 못했어요. 다시 눌러주세요.` | 저장 실패 (1b와 **같은 리소스 재사용**) |

**그룹 제목은 1b의 질문 문장이 아니라 짧은 이름(`labelRes`)이다.** 그 화면은 세 갈래를 한 번에 보여줘서 질문 문장이 아니라 이름이 붙는다.

Notice 맨 위 안내가 "다음 브리핑 카드부터 반영된다"고 알린다. **이미 진료실에서 보여준 카드가 바뀌면 의사가 본 내용과 기록이 달라진다.**

### 6.4 칩 목록 합성 규칙

`HealthEditScreen.kt:127`:

```kotlin
val options = (stringArrayResource(step.optionsRes).toList() + state.extrasIn(step)).distinct()
```

기본 목록(§3.3의 그대로) + 서버에서 읽어 온/직접 추가한 값(`extras`)을 이어 붙이고 **`distinct()`로 중복 제거**. 겹치면 같은 칩이 두 번 그려지고 어느 쪽이 골라졌는지 알 수 없다.

그 뒤에 `+ 직접 추가` 칩이 **항상 마지막에** 붙는다(`selected = false` 고정).

### 6.5 직접 추가 방식 (1b와 다르다)

- `+ 직접 추가` 칩을 누르면 그 그룹 아래에 `MedicalMateTextField`가 **펼쳐진다**(`state.adding == step`일 때만).
- 입력 칸 `placeholder` = `직접 적어주세요`, `trailing` = `MedicalMateIconButton(icon = Plus, contentDescription = "추가", enabled = state.canAddDraft)`.
- `canAddDraft = draft.isNotBlank()` — 빈 값이면 + 버튼이 비활성.
- **한 번에 한 갈래만 열린다.** `adding`이 단일 값이라 다른 갈래의 `+ 직접 추가`를 누르면 이전 것이 닫히고 `draft`가 비워진다.
- **이미 열려 있던 갈래를 다시 누르면 닫힌다.** 열어 둔 것을 닫을 방법이 없으면 적다 만 입력 칸이 화면에 남는다.
- `onDraftSubmit()`: `trim()` → 비었으면 무시 / 이미 `extras`에 있으면 `draft`만 비움 / 아니면 `extras[step] += value` **동시에** `chosen[step] += value`.
  **넣는 동시에 고른 것으로 표시한다.** 적어 넣고 다시 눌러야 선택되는 것은 한 번에 두 번 시키는 일이다.
- 입력 칸은 추가 후에도 **닫히지 않는다**(`adding`은 그대로, `draft`만 비워진다). 연속 추가 가능.
- **1b와 달리 쉼표 분리가 없다.** 한 번에 한 항목씩 + 버튼으로 넣는다.

시안에는 `+ 직접 추가` 칩만 있고 누른 뒤가 그려져 있지 않다. 추가 질문(1i)이 입력 칸과 더하기 버튼으로 목록을 늘리므로 같은 방식으로 뒀다 — 같은 일을 하는 두 화면이 다르게 동작하면 익힐 것이 늘어난다.

### 6.6 UiState 전체 필드

**`HealthEditUiState`** (`MyProfileUiState.kt:100~115`)

| 필드 | 타입 | 기본값 | TS 타입 제안 | 설명 |
| --- | --- | --- | --- | --- |
| `chosen` | `Map<ProfileSetupStep, Set<String>>` | `emptyMap()` | `Partial<Record<ProfileSetupStep, Set<string>>>` | 갈래별 선택된 항목 |
| `extras` | `Map<ProfileSetupStep, List<String>>` | `emptyMap()` | `Partial<Record<ProfileSetupStep, string[]>>` | 기본 목록에 없던 값. 서버에서 읽어 온 값 전부 + 직접 추가한 값 |
| `adding` | `ProfileSetupStep?` | `null` | `ProfileSetupStep \| null` | "직접 추가"를 누른 갈래. null이면 아무 입력 칸도 안 열려 있다 |
| `draft` | `String` | `""` | `string` | 추가 입력 칸의 현재 값 |
| `loading` | `Boolean` | `false` | `boolean` | 읽는 중. 본문이 스피너로 바뀐다 |
| `saving` | `Boolean` | `false` | `boolean` | 저장 중. 저장 버튼 비활성 |
| `saveFailed` | `Boolean` | `false` | `boolean` | 저장 실패. 하단에 한 줄. **시안에 없는 문구다** |

파생:

| 이름 | 타입 | 계산 |
| --- | --- | --- |
| `chosenIn(step)` | `Set<String>` | `chosen[step].orEmpty()` |
| `extrasIn(step)` | `List<String>` | `extras[step].orEmpty()` |
| `canAddDraft` | `Boolean` | `draft.isNotBlank()` |

**ViewModel의 private 필드**: `profile: HealthProfile?` — 읽어 온 이름·출생연도·성별. 저장이 통째로 덮어쓰기라 그대로 되돌려 보내야 한다. **화면이 쓰지 않는 값이라 상태에 두지 않는다.** 웹에서도 UiState 밖(ref/클로저)에 두는 것을 권장.

**`HealthEditCallbacks`** (`HealthEditScreen.kt:92~99`) — 이 화면의 조작 6개를 한 묶음으로 받는다. 파라미터를 여섯 개 늘어놓지 않으려는 것이고, 전부 기본값 `{}`라 Preview가 그대로 쓴다.

| 필드 | 시그니처 | 연결되는 곳 |
| --- | --- | --- |
| `onCloseClick` | `() -> Unit` | NavBar 닫기 **와** 하단 `취소` — 같은 콜백이다 |
| `onOptionClick` | `(ProfileSetupStep, String) -> Unit` | 칩 토글. **갈래를 함께 넘긴다**(한 화면에 세 갈래라 현재 단계 개념이 없다) |
| `onAddClick` | `(ProfileSetupStep) -> Unit` | `+ 직접 추가` 칩 |
| `onDraftChange` | `(String) -> Unit` | 추가 입력 칸 |
| `onDraftSubmit` | `() -> Unit` | + 아이콘 버튼. **갈래를 안 넘긴다** — `adding`이 이미 어느 갈래인지 알고 있다 |
| `onSaveClick` | `() -> Unit` | 하단 `저장하기`. 목적지에서 `{ viewModel.onSaveClick(onSaved) }`로 감싼다 |

**Preview 데이터**(웹 목업에 그대로 쓸 수 있다): `previewHealthEdit` = `chosen`만 채운 상태 — 복용약 `혈압약`·`진통제`, 기저질환 `고혈압`, 알러지 `페니실린`(`HealthEditViewModel.kt:147~155`, Figma 1s-2에서 골라져 있는 값). `extras`가 비어 있어 기본 칩만 그려진다.

### 6.7 로드 매핑 규칙

`HealthEditViewModel.kt:46~53`, `124~137`.

```
load():
  loading = true, saveFailed = false
  result = repository.profile()
  profile = (성공이면) result.value
  uiState = result.value?.health.toUiState()     // ← 실패면 HealthEdit() 빈 값으로
```

`toUiState()`:
- `chosen[step] = items.toSet()` — **읽어 온 값은 전부 선택된 상태로 시작한다.**
- `extras[step] = items` — **읽어 온 값을 전부 `extras`에 넣는다.**
- `loading = false`

**주의: 대입이 `update`가 아니라 `mutableUiState.value = ...` 통째 교체다**(`HealthEditViewModel.kt:51`). 그래서 로드가 끝나면 `adding`·`draft`·`saving`·`saveFailed`가 **전부 기본값으로 초기화된다.** 실제로는 `load()`가 진입 직후 한 번뿐이라 문제가 되지 않지만, 웹에서 재조회 버튼 같은 것을 붙인다면 그 순간 열려 있던 입력 칸과 적던 글자가 사라진다는 뜻이다. 재조회를 넣을 거면 `chosen`/`extras`만 덮도록 바꿔라.

`load()` 시작 시점에 `loading = true, saveFailed = false`가 먼저 서고, 그 사이 본문은 스피너다.

**읽어 온 값을 전부 `extras`에 넣는 이유**(`HealthEditViewModel.kt:116~123`): 기본 목록(`optionsRes`)에 있는지 ViewModel에서 가릴 수 없다 — `Context`가 없어 문자열 배열을 읽지 못한다. 목록에 없다고 버리면 환자가 1b에서 적어 넣은 것이 화면에서 사라진 채 저장돼 지워진다. 기본 목록과 겹치는 값은 **화면이 `distinct()`로 한 번만 그린다.**

웹에서는 이 제약이 없지만(상수 배열에 바로 접근 가능), **동작 결과는 같으므로 그대로 옮겨도 무방**하다. 단, 웹에서 굳이 흉내낼 필요 없이 `extras = items.filter(x => !DEFAULT_OPTIONS[step].includes(x))`로 정리해도 화면 결과는 동일하다.

**로드 실패 시**: `profile = null`이 되고 `uiState`는 빈 `HealthEditUiState(loading = false)`가 된다. 즉 **모든 칩이 선택 해제된 상태**로 보이고, 이때 저장을 누르면 `onSaveClick`의 `val base = profile ?: return`에서 **아무 일도 일어나지 않는다**(에러 표시도 없다). 웹 포팅 시 이 조합은 실질적인 데드엔드이므로 로드 실패 안내를 추가할지 검토 필요.

### 6.8 저장

`onSaveClick(onSaved)`:

1. `profile`(읽어 온 base)이 null이면 **즉시 return** — 아무 일도 안 한다.
2. `saving` 중이면 return.
3. `saving = true, saveFailed = false`
4. `repository.save(base, toHealthEdit())` — `PUT /api/me/health-profile`
5. `saving = false, saveFailed = (결과 != Success)`
6. Success면 `onSaved()` → `popBackStack()` → 1s-1

`toHealthEdit()`는 **`chosen`만** 보낸다(`extras` 중 선택 해제된 것은 안 나간다):

```kotlin
HealthEdit(
  medications = HealthField(chosenIn(MEDICATIONS).toList()),
  conditions  = HealthField(chosenIn(CONDITIONS).toList()),
  allergies   = HealthField(chosenIn(ALLERGIES).toList()),
)
```

**실패하면 화면에 남는다.** 나가 버리면 고친 것이 사라지고 무엇이 저장됐는지 알 수 없다.

### 6.9 로딩 / 빈 상태 / 에러

| 상태 | 화면 |
| --- | --- |
| 로딩 (`loading = true`) | 본문 자리에 `MedicalMateLoadingSpinner(modifier = weight(1f))`. 스피너만(`message = null`이라 문구 없음), `CircularProgressIndicator` 24px, 색 `bg/primary`, 최소 높이 **116**(`LoadingMinHeight`), 패딩 20, 가로·세로 가운데. NavBar와 하단 CTA 바는 그대로 보이고 **저장 버튼은 비활성**, **취소는 그대로 눌린다** |
| 빈 상태 | **없음.** 기본 칩 목록이 항상 있어 빈 화면이 나오지 않는다 |
| 에러 (로드 실패) | **아무 안내가 없다.** 모든 칩이 선택 해제된 상태로 보이고 저장이 무반응. (§6.7 참고 — 개선 후보) |
| 에러 (저장 실패) | 하단 CTA 바 안, 저장 버튼 **위에** `저장하지 못했어요. 다시 눌러주세요.` (`Body/S`, `fg/danger`). 화면에 그대로 머문다 |

### 6.10 나가는 경로

| 트리거 | 가는 곳 |
| --- | --- |
| NavBar 닫기(`CLOSE`) | `popBackStack()` → 1s-1 |
| `취소` (하단 GHOST) | `popBackStack()` → 1s-1 (닫기와 같은 콜백) |
| `저장하기` + 성공 | `popBackStack()` → 1s-1 (1s-1이 `ON_RESUME`에서 재조회) |
| `저장하기` + 실패 | 화면에 머문다. 에러 한 줄 |
| `저장하기` + base 없음(로드 실패) | 아무 일도 없다 |

### 6.11 사용하는 디자인 시스템 컴포넌트

- `MedicalMateNavBar` (leading **`CLOSE`**, surface `GLASS`)
- `MedicalMateNotice` (tone `INFO` 기본)
- `MedicalMateChip`
- `MedicalMateTextField` (trailing 슬롯)
- `MedicalMateIconButton` (icon `MedicalMateIcons.Plus`)
- `MedicalMateLoadingSpinner`
- `MedicalMateBottomCtaBar`
- `MedicalMateButton` (`PRIMARY`, `GHOST`)
- `MedicalMateSurfaceStyle.GLASS`

**`MedicalMateNotice` 스펙**: radius `md`(16), padding(start 14, end 16, top 14, bottom 14), 아이콘 배지와 텍스트 사이 간격 12, `verticalAlignment = Top`. 배지는 **32 원형**(`IconBadgeSize`) `bg/surface` 면에 아이콘 20(`iconMd`). 텍스트 칸은 `padding-top 4`, 제목과 본문 사이 **3**(`TextGap`), 제목 `Body/M Strong`, 본문 `Body/S`.

---

## 7. 기기 저장소 (DataStore) — 웹의 localStorage 대체 대상

안드로이드는 `profileDataStore`(Preferences DataStore, 파일 이름 **`"profile"`**) 하나를 `OnboardingStore`와 `LocalSettingsStore`가 공유한다. 둘 다 이 기기의 프로필에 딸린 값이고, 파일을 나누면 읽는 곳만 늘어난다(`LocalSettingsStore.kt:19~21`).

### 7.1 저장하는 키 전부 (3개)

| 키 | 타입 | 기본값 | 소유 | 의미 |
| --- | --- | --- | --- | --- |
| `onboarding_completed` | `Boolean` | `false` | `OnboardingStore` | 온보딩 4장 + 신상정보 3단계를 마쳤는지 |
| `card_auto_save` | `Boolean` | **`true`** | `LocalSettingsStore` | 브리핑 카드 자동 저장 |
| `handoff_brightness` | `Boolean` | **`false`** | `LocalSettingsStore` | 진료실 화면 밝기 최대 |

웹 제안: `localStorage['mm.profile.onboardingCompleted' | 'mm.profile.cardAutoSave' | 'mm.profile.handoffBrightness']`.

### 7.2 `OnboardingStore` — 왜 서버만 믿지 않는가

`OnboardingStore.kt:17~37`. **웹에서도 같은 함정에 빠지므로 그대로 옮겨야 한다.**

온보딩은 가입하고 한 번만 나와야 한다. 서버의 `onboardingRequired`만 보면 그렇게 되지 않는다. 두 가지 이유:

1. **`refresh` 응답이 이 값을 항상 `false`로 준다.** 자동 로그인으로 들어오면 온보딩이 필요한 사람도 필요 없다고 나온다.
2. **프로필을 서버에 저장하기 전까지 로그인 응답은 계속 `true`다.** 온보딩을 마치고 로그아웃했다 들어오면 또 나온다.

그래서 기기에 마쳤다는 사실을 남기고 서버 값과 **함께** 본다. **둘 중 하나라도 마쳤다고 하면 다시 보여주지 않는다.**

판정식(`MedicalMateNavHost.kt:126~134`):

```kotlin
if (onboardingRequired && !onboardingCompleted) OnboardingIntroDestination else HomeDestination
```

- API: `completed: Flow<Boolean>`, `suspend markCompleted()`.
- **로그아웃과 탈퇴에서 지우지 않는다.** 지우면 같은 사람이 다시 들어올 때 또 나오는데 그게 지금 막으려는 것이다. 탈퇴하고 새로 가입한 경우에는 온보딩이 건너뛰어진다 — 서버 값이 정본이 되면 사라지는 문제라 그대로 뒀다.
- `PUT /api/me/health-profile`을 연결하면 서버의 `onboardingCompleted`가 정본이 된다. 이 기록은 서버에 묻기 전에 답을 아는 빠른 길로 남는다.

### 7.3 `OnboardingGateViewModel` — 스플래시 유지

`OnboardingGateViewModel.kt`.

| 필드 | 타입 | 초기값 | 의미 |
| --- | --- | --- | --- |
| `completed` | `StateFlow<Boolean?>` | `null` | **`null`은 아직 읽는 중이라는 뜻** |

- `init`에서 `onboardingStore.completed.first()`를 한 번 읽어 채운다.
- **`false`로 시작하면 온보딩을 마친 사람도 한 프레임 동안 온보딩 대상이 되어 화면이 잠깐 스친다.** 호출자는 `null`인 동안 스플래시를 유지한다(`MainActivity.kt:71~74`):

  ```kotlin
  if (session == SessionUiState.Checking || onboardingCompleted == null) {
      SplashScreen(...); return
  }
  ```

- `markCompleted()`: **메모리 값을 먼저 `true`로 올리고** 저장은 이어서 한다. 기록이 저장되기 전에 화면을 옮기면 다시 온보딩으로 돌아갈 수 있다.
- 화면에 붙지 않고 앱 전체의 판단에 쓰이므로 `MainActivity`에서 Activity 스코프로 둔다. 세션과 같은 성격이다.

**웹 포팅**: `localStorage`는 동기라 이 3상태(`null`/`true`/`false`)가 불필요해 보이지만, SSR/hydration 환경에서는 동일한 문제가 생긴다. 초기 렌더에서 `undefined`를 유지하고 스플래시를 그리는 편이 안전하다.

### 7.4 `LocalSettingsStore`

```kotlin
interface LocalSettingsStore {
    val cardAutoSave: Flow<Boolean>          // 기본 true
    val handoffBrightness: Flow<Boolean>     // 기본 false
    suspend fun setCardAutoSave(enabled: Boolean)
    suspend fun setHandoffBrightness(enabled: Boolean)
}
```

브리핑 카드 자동 저장과 진료실 화면 밝기 최대 둘이다. **이 기기에서 어떻게 보일지의 문제라 서버가 읽을 일이 없다**는 것이 백엔드와 정한 것(Backend#85). 계정에 붙는 것은 진료 하루 전 알림 하나뿐이고 그쪽은 `SettingsApi`다.

---

## 8. API

### 8.1 `GET /api/me/health-profile`

건강 프로필 조회. `/v3/api-docs` 기준. **프로필이 없어도 404가 아니라 빈 값이 온다.**

**응답 (`HealthProfileResponse`)**

| 필드 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `name` | `String?` | `null` | 카카오에서 받은 값이 채워져 온다. 사용자가 넣은 값이면 `sources`가 알려준다 |
| `birthYear` | `Int?` | `null` | |
| `birthMonthDay` | `String?` | `null` | |
| `age` | `Int?` | `null` | 이 도메인 화면에서 쓰지 않음 |
| `sex` | `String?` | `null` | `"FEMALE"` / `"MALE"` / `"UNSPECIFIED"` |
| `medications` | `ListFieldResponse?` | `null` | |
| `conditions` | `ListFieldResponse?` | `null` | |
| `allergies` | `TextFieldResponse?` | `null` | **알러지만 텍스트 한 줄** |
| `sources` | `SourcesResponse?` | `null` | 값이 카카오에서 온 것인지 사용자가 넣은 것인지 |
| `onboardingCompleted` | `Boolean` | `false` | 온보딩을 실제로 마쳤는지. 카카오 값이 채워진 것만으로는 false |
| `canStartIntake` | `Boolean` | `false` | 문답을 시작할 수 있는지. **나이와 성별이 있어야 true.** 없이 `POST /api/sessions`를 부르면 400 |

**`ListFieldResponse`**: `status: String?` (기본 null), `items: List<String>` (기본 `[]`)
**`TextFieldResponse`**: `status: String?` (기본 null), `text: String?` (기본 null)
**`SourcesResponse`**: `name: String?`, `birthYear: String?`, `sex: String?` — 각각 `"KAKAO"` 또는 `"SELF_INPUT"`

### 8.2 `PUT /api/me/health-profile`

**통째로 덮어쓴다. 단계별 저장이 없다.** 서버 문서가 "온보딩 5단계를 모아 한 번에 저장합니다"라고 적었고, 요청도 부분 갱신이 아니라 여섯 필드를 모두 요구한다. 1b/1s-2가 묻지 않는 이름·출생연도·성별은 **읽어 온 값을 그대로 되돌려 보낸다.**

**요청 (`HealthProfileRequest`) — 여섯 필드가 모두 필수. null을 보내면 400.**

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `name` | `String` | Y | `GET`에서 읽은 값 그대로 |
| `birthYear` | `Int` | Y | `GET`에서 읽은 값 그대로 |
| `birthMonthDay` | `String?` | N | `GET`에서 읽은 값 그대로 |
| `sex` | `String` | Y | `GET`에서 읽은 값 그대로 |
| `medications` | `ListFieldRequest` | Y | `{ status, items }` |
| `conditions` | `ListFieldRequest` | Y | `{ status, items }` |
| `allergies` | `TextFieldRequest` | Y | `{ status, text }` |

**`ListFieldRequest`**: `status: String`, `items: List<String>` (기본 `[]`). `status`가 `NONE`이면 `items`는 비어 있어야 의미가 맞는다(서버가 강제하지는 않는다).
**`TextFieldRequest`**: `status: String`, `text: String` (기본 `""`)

**응답**: `HealthProfileResponse` (조회와 같은 모양)

**클라이언트가 자르는 길이 제한** (`HealthProfileRepository.kt:165~170`) — 서버가 막는 길이라 **넘겨 보내면 400이라 잘라서 보낸다**:

| 상수 | 값 | 적용 |
| --- | --- | --- |
| `ITEM_MAX_LENGTH` | `50` | 리스트 각 항목 문자열 길이 (`items.map { it.take(50) }`) |
| `ITEM_MAX_COUNT` | `20` | 리스트 항목 개수 (`.take(20)`) |
| `TEXT_MAX_LENGTH` | `200` | 알러지 텍스트 전체 (`joinToString(", ").take(200)`) |

**알러지 직렬화**: 화면은 셋 다 칩으로 받는데 서버가 알러지만 문자열 하나를 받는다. 고른 것을 **`", "`(쉼표+공백)로 잇는다**. 읽어 올 때는 `","`로 나누고 `trim()` 후 빈 것을 버려 다시 칩으로 만든다.

**호출 전 가드** (`HealthProfileRepository.kt:47~52`): `name`, `birthYear`, `sex` 중 하나라도 null이면 **부르지 않고 `null`을 돌려준다.** 서버가 셋을 필수로 두고 있어 없는 채로 보내면 400이고, 그 셋은 카카오에서 채워져 오는 값이라 화면에서 받을 자리가 없다. `ApiResult.Rejected`가 아닌 이유는 **서버에 물어보지도 않았기 때문**이다.

호출자(ViewModel)는 `saved is ApiResult.Success`만 보므로, `null`은 저장 실패로 처리된다 → `saveFailed = true`.

### 8.2-1 도메인 모델 — 화면이 실제로 주고받는 모양

`HealthProfileRepository.kt:72~115`. 응답 DTO가 아니라 **이 모델이 ViewModel까지 올라온다.** 웹에서도 API 응답을 이 모양으로 한 번 접어서 화면에 주는 것을 권한다.

**`HealthProfile`** — `GET`의 결과이자 `PUT`의 base

| 필드 | 타입 | 화면이 쓰는가 |
| --- | --- | --- |
| `name` | `String?` | 1s-1 이름 줄, 아바타 글자 |
| `birthYear` | `Int?` | 1s-1 메타 줄 |
| `birthMonthDay` | `String?` | **안 쓴다.** 저장할 때 되돌려 보내기만 한다 |
| `sex` | `String?` | 1s-1 메타 줄 (`"FEMALE"`/`"MALE"`/그 외 → null) |
| `health` | `HealthEdit` | 1s-1 요약 3줄, 1s-2 초기값 |
| `onboardingCompleted` | `Boolean` | **이 도메인 화면은 안 쓴다.** 온보딩 게이트는 기기 기록(`OnboardingStore`)과 세션 값을 본다 |
| `canStartIntake` | `Boolean` | **이 도메인 화면은 안 쓴다.** 문답 진입 판단용 |

**`HealthEdit`** = `medications` / `conditions` / `allergies` 세 `HealthField`. 1b와 1s-2가 저장할 때 만드는 것이 이 모양이고, `repository.save(base, edit)`가 `base`의 이름·생년·성별과 합쳐 요청을 만든다.

**`HealthField`** = `items: List<String>` + `status: HealthStatus`(기본값은 `items`에서 가늠 — §8.5).

**`DefaultHealthProfileRepository`는 `core.model.CurrentUserProvider`도 함께 구현한다**(`ProfileModule.kt:30~32`). 홈이 이름·아바타를 그릴 때 `profile` 패키지를 직접 참조하지 않도록 `core`의 인터페이스로 연결한 것이다. **즉 이 도메인의 저장소가 홈 헤더 아바타의 출처이기도 하다** — 웹에서 프로필을 화면 로컬 상태로만 들면 홈과 1s-1이 서로 다른 값을 보게 된다. 사용자 정보는 전역 스토어 하나에 두고 두 화면이 같이 읽어라.

### 8.3 `GET /api/me/settings`

**응답 (`SettingsResponse`)**

| 필드 | 타입 | 기본값 |
| --- | --- | --- |
| `visitReminderEnabled` | `Boolean` | `true` |

**값이 하나뿐이다.** 진료 하루 전 알림을 받을지다.

### 8.4 `PATCH /api/me/settings`

**요청 (`SettingsRequest`)**

| 필드 | 타입 | 필수 |
| --- | --- | --- |
| `visitReminderEnabled` | `Boolean` | Y |

**응답**: `SettingsResponse`

### 8.5 `HealthStatus` — `NONE` vs `UNKNOWN` (웹에서 반드시 지켜야 할 규칙)

`HealthProfileRepository.kt:90~115`.

```kotlin
enum class HealthStatus { KNOWN, NONE, UNKNOWN }

data class HealthField(
    val items: List<String> = emptyList(),
    val status: HealthStatus = if (items.isEmpty()) HealthStatus.UNKNOWN else HealthStatus.KNOWN,
)
```

**비어 있는 것을 "없다"로 보지 않는다.** 서버는 `NONE`("없다")과 `UNKNOWN`("모른다")을 가르는데 화면에는 그 둘을 말할 칩이 없다. 아무것도 고르지 않고 넘어간 것이 "없어요"인지 "그냥 넘겼어요"인지 알 수 없어서 **`UNKNOWN`으로 보낸다.** 알러지에서 "없음"과 "모름"은 처방이 달라지는 값이라 단정하면 안 된다.

**읽을 때의 상태 추론**(`statusOf`): 서버가 준 `status` 문자열이 enum에 있으면 그대로, 없거나 null이면 `items.isEmpty() ? UNKNOWN : KNOWN`.

**알려진 부작용**: 서버에 `NONE`으로 있던 갈래를 손대지 않고 저장하면 `UNKNOWN`으로 내려간다. 화면에 "없어요"를 말할 자리가 없어서 생기는 일이고, 그 자리를 만드는 것이 #150의 디자인 확인 대기 항목이다. **웹에서도 같은 부작용이 생긴다 — 그대로 갈지 판단 필요.**

### 8.6 `ApiResult` — 실패를 값으로 다룬다

`core/network/ApiResult.kt`. 웹의 `Result<T, E>` 패턴으로 그대로 옮기면 된다.

```kotlin
sealed interface ApiResult<out T> {
    data class Success<out T>(val value: T)
    data class Rejected(code: ApiErrorCode, message: String?, requestId: String?,
                        retryable: Boolean, details: JsonObject?)   // 서버가 에러 봉투로 응답
    data class NetworkUnavailable(cause: IOException)                // 서버에 닿지 못함
}
```

`requestId`는 서버 로그와 이어붙이는 유일한 열쇠다. 장애 추적에 쓴다.

**이 도메인의 모든 화면은 `Rejected`와 `NetworkUnavailable`을 구별하지 않는다.** 둘 다 "저장하지 못했어요. 다시 눌러주세요."로 뭉뚱그린다. 웹에서 개선할 여지.

---

## 9. 디자인 토큰 요약 (이 도메인에서 쓰는 것만)

### 9.1 색

| 토큰 | Hex | 쓰이는 곳 |
| --- | --- | --- |
| `bgSurface` | `#FFFFFF` | 온보딩·1b·1s-1·1s-2 배경, 카드 면, 미선택 칩 면 |
| `bgSubtle` | `#EDEFF5` | 진행 표시 비활성 점, 비활성 칩 |
| `bgPrimary` | `#5566D2` | **1b-4 배경**, 진행 표시 활성 점, 주 버튼, 켜진 토글 track |
| `bgPrimarySubtle` | `#E3E7FC` | 선택된 칩 면, 아바타 면 |
| `bgPrimaryFaint` | `#F2F4FE` | 툴팁 트리거 Active 채움 |
| `bgInverseSoft` | `#3A4053` | 툴팁 말풍선 면 |
| `fgDefault` | `#131722` | 제목, 미선택 칩 글자, 토글 라벨, KvRow 값 |
| `fgSubtle` | `#585F73` | 설명, 건너뛰기, KvRow 키, 로그인 수단 줄 |
| `fgOnPrimary` | `#FFFFFF` | 1b-4 문구·로고 tint, 켜진 토글 thumb |
| `fgOnInverse` | `#FFFFFF` | 툴팁 말풍선 글자 |
| `fgLink` | `#2E3E9E` | 구역 머리 액션(`수정`), 알러지 KvRow(`LINK`) |
| `fgDanger` | `#C4302B` | 저장 실패 문구, `탈퇴하기` 버튼 글자 |
| `borderDefault` | `#C6CAD8` | 미선택 칩 1px 테두리 |
| `borderPrimary` | `#5566D2` | 선택 칩 1.5px 테두리 |

### 9.2 타이포 (이 도메인에서 쓰는 것)

| 토큰 | weight / size / line-height / letter-spacing(%) | 쓰이는 곳 |
| --- | --- | --- |
| `headingL` | Bold 24 / 34 / −2.0 | 온보딩 제목, 1b 질문, 1b-4 제목 |
| `headingM` | SemiBold 20 / 28 / −1.5 | 1s-1 이름, 구역 머리 제목 |
| `headingS` | SemiBold 17 / 24 / −1.0 | 1s-2 그룹 제목 |
| `bodyL` | Normal 17 / 26 / 0 | KvRow 값, 토글 라벨 |
| `bodyLStrong` | SemiBold 17 / 26 / 0 | 건너뛰기, 아바타 글자 |
| `bodyM` | Normal 15 / 24 / 0 | 온보딩 설명, 1b 설명, 1b-4 부제, KvRow 키 |
| `bodyMStrong` | SemiBold 15 / 24 / 0 | 구역 머리 액션, Notice 제목 |
| `bodyS` | Normal 13 / 20 / 0 | 1s-1 메타 줄, 저장 실패 문구, 진행 라벨, Notice 본문 |
| `bodySStrong` | SemiBold 13 / 20 / 0 | 진행 표시의 `1 / 3` |
| `labelM` | SemiBold 13 / 18 / 0 | 칩 글자 |
| `labelS` | Medium 11 / 16 / **+2.0** | `카카오로 로그인` |

letter-spacing은 Compose의 백분율 값이다. 웹은 `letter-spacing: -0.02em` 같은 식으로 환산.

### 9.3 간격 · 크기 · 반경 · 그림자

- `MedicalMateSpace`: s2=2, s4=4, s6=6, s8=8, s10=10, s12=12, s14=14, s16=16, s20=20, s24=24, s32=32, s40=40 (px)
- `MedicalMateSize`: `touchMin`=48, `iconSm`=18, `iconMd`=20, `iconLg`=24, `controlSm`=40, `controlMd`=48, `controlLg`=56, `screenWidth`=360, `gutter`=**20**, `contentWidth`=320, `safeBottom`=24, `navBarHeight`=56, `tabBarHeight`=79
- `MedicalMateRadius`: xs=8, sm=12, md=16, lg=20, xl=24, full=원형
- `MedicalMateElevation`: `card`=3, `float`=4

**`gutter` 20이 이 도메인의 모든 본문 좌우 패딩이다** (온보딩 일러스트 블록만 예외).

### 9.4 `MedicalMateNavBar` 스펙

높이 56, 좌우 slot 각 48, 바깥 8, slot 사이 4 → **아이콘 왼쪽 끝이 화면에서 20에 온다**(8 + 슬롯 48 안의 12).
**제목은 바의 가운데다**(#226) — 남은 폭의 가운데가 아니다.
`surface = GLASS`이면 면이 `bgSurface`에 `MedicalMateGlass.NAV_BAR_ALPHA` 알파(반투명, 웹은 `backdrop-filter: blur()` + `rgba()`), `OPAQUE`이면 불투명 + 그림자.
`leading`: `BACK`(1b, 1s-1) / `CLOSE`(1s-2) / `NONE`.

### 9.5 `MedicalMateBottomCtaBar` 스펙

`padding(top 12, start 20, end 20, bottom 24)`, 자식 간격 10, `fillMaxWidth`.
`OPAQUE`이면 `elevation = float(4)` 그림자(ambient만 남는다 — 아래로 떨어지는 그림자는 화면 끝에서 잘린다), `GLASS`이면 그림자 없음.
**Glass에 테두리를 추가하지 않는다. 불투명 변형에도 테두리를 두지 않는다.**

---

## 10. 웹 포팅 시 위험 지점 정리

| # | 지점 | 왜 어려운가 | 대응 |
| --- | --- | --- | --- |
| 1 | 1b-4 스프링 모션 | CSS transition은 2구간 물리 근사가 불가. ζ=0.30/stiffness=900은 구체 수치라 눈대중이면 티가 난다 | Web Animations API 키프레임 4개(0 / 220 / 330 / 660ms)로 근사. `prefers-reduced-motion`이면 `Mark` 정지 이미지 |
| 2 | 온보딩 스와이프 + 뒤로가기 | 안드로이드는 첫 장에서 뒤로가기를 **무시**한다. 브라우저 뒤로가기는 무시할 수 없다 | 온보딩 4장을 history에 쌓지 말고 상태로만 관리. `popstate`에서 첫 장이면 `pushState`로 되돌리거나, 로그인 화면이 history에 없도록 `replace`로 진입 |
| 3 | 알러지 툴팁 레이아웃 붕괴 (#71) | 인라인으로 두면 아래 칩들이 밀린다 — 안드로이드에서 실제로 터진 버그 | 포털 + `position: fixed`. 트리거 아래 **오른쪽 정렬**, 꼬리 중심이 오른쪽 끝에서 24 |
| 4 | 온보딩 일러스트 폭 | 거터를 무시하고 화면 폭을 쓰되 352에서 멈춰야 한다. 안 멈추면 넓은 화면에서 그림이 함께 커진다(SM-S928N 411dp에서 1.15배 → 304 칸을 29 넘김) | 래퍼에 `width: 100%; max-width: 352px; margin: 0 auto; aspect-ratio: 352/290.4` |
| 5 | 1s-1의 `ON_RESUME` 재조회 | 웹에는 대응 라이프사이클이 없다. 1s-2에서 저장하고 돌아왔는데 옛 값이 남으면 "저장 안 됨"으로 읽힌다 | 라우터의 뒤로가기 이벤트 또는 `visibilitychange` + 화면 마운트 시 재조회. 저장 성공 시 전역 캐시 무효화가 더 확실 |
| 6 | 로딩 중 `잘 모르겠어요` 3줄 (1s-1) | `HealthField()` 기본 status가 `UNKNOWN`이라 로드 전에 "잘 모르겠어요"가 3줄 뜬다. 사용자가 실제 데이터로 오해할 수 있다 | 안드로이드와 동일하게 갈지, 스켈레톤을 넣을지 결정 필요. 1s-2에는 스피너가 있는데 1s-1에는 없다(불일치) |
| 7 | 1s-2 로드 실패 시 데드엔드 | `profile`이 null이면 저장 버튼이 **아무 반응도 없다**(에러 표시조차 없다) | 로드 실패 상태를 UiState에 추가하고 재시도 버튼을 넣는 것을 권장 |
| 8 | `NONE` / `UNKNOWN` 손실 (#150) | 서버에 `NONE`으로 있던 갈래를 손대지 않고 저장하면 `UNKNOWN`으로 내려간다 | 웹에서는 로드한 `status`를 UiState에 보관했다가, 해당 갈래의 `chosen`이 변하지 않았으면 원래 status를 되돌려 보내는 방식으로 고칠 수 있다(안드로이드보다 개선) |
| 9 | 1b의 쉼표 분리 vs 1s-2의 + 버튼 | 같은 "직접 입력"인데 두 화면의 규칙이 다르다 | 웹도 그대로 옮기되, 1b 헬퍼 문구에 쉼표 규칙을 명시할지 검토 |
| 10 | 온보딩 완료 판정 3상태 | `null`(읽는 중) 동안 스플래시 유지가 필수. `false`로 시작하면 마친 사람에게 온보딩이 한 프레임 스친다 | SSR/hydration에서 `undefined` 상태를 명시적으로 두고 스플래시 렌더 |
| 11 | `PUT`이 전체 덮어쓰기 | 저장 전에 반드시 `GET`으로 이름·출생연도·성별을 읽어야 한다. 안 그러면 400 | 저장 직전 `GET` → `PUT` 2단계를 그대로 옮기거나, 이름/생년/성별을 전역 사용자 스토어에 캐시 |
| 12 | 칩 목록 공유 | 1b와 1s-2가 같은 배열을 써야 한다. 갈리면 1b에서 고른 것이 1s-2에 없다 | 단일 상수 모듈(`PROFILE_OPTIONS`)로 두고 두 화면이 import |
| 13 | 회원탈퇴가 시안에 없음 | Figma 1s-1 하단에는 로그아웃만 있다. 위치가 확정되지 않았다(#85) | 안드로이드와 같은 자리(로그아웃 아래 GHOST)로 두고, 확정되면 옮긴다 |
| 14 | 홈 등록 완료 토스트 | 소스 주석에는 있는데 구현이 없다 | 기획 확인 필요. 넣는다면 1b-4 → 홈 이동 시점 |
| 15 | NavBar / BottomCtaBar의 GLASS | `backdrop-filter`는 구형 브라우저·일부 안드로이드 WebView에서 미지원 | `@supports (backdrop-filter: blur(1px))` 폴백으로 불투명 면 + 그림자 |
| 16 | 1b-1 뒤로가기가 돌아가는 장 | 안드로이드는 온보딩 목적지가 백스택에 남아 있고 `index`가 `rememberSaveable`이라 **나올 때 보던 장**으로 돌아간다. 웹에서 온보딩을 상태로만 관리하면(위험 #2의 대응) 되돌아왔을 때 장 번호가 0으로 초기화되기 쉽다 | 온보딩 장 번호를 `sessionStorage`나 라우터 state에 얹어 두고 복귀 시 복원 |
| 17 | 1s-2의 `취소`가 저장 중에도 눌린다 | 안드로이드는 `enabled` 가드가 없어 `saving` 중에 닫을 수 있고, 그러면 성공·실패를 아무도 못 본다 | 그대로 옮기든 막든 **의식적으로 정하라.** 막는다면 `취소`와 NavBar 닫기 둘 다 같은 가드를 받아야 한다(같은 콜백이다) |
| 18 | 1s-1이 화면에 보일 때마다 왕복 2회 | `GET /api/me/settings` → `GET /api/me/health-profile`을 **직렬로** 부른다. 홈↔내 정보를 오갈 때마다 두 번씩 쌓인다 | 웹은 병렬로 묶고(`Promise.all`) 저장 성공 시 캐시 무효화로 재조회 횟수를 줄여라 — 화면 결과는 동일하다 |

---

## 11. 미확정 · 디자인 대기 항목 (소스에 명시된 것)

| 이슈 | 내용 | 관련 파일 |
| --- | --- | --- |
| #67 | 1b 하단의 "잘 모르겠어요 · 없어요" 보조 버튼을 뺀 판단. 다시 봐야 한다 | `ProfileSetupScreen.kt:158~164` |
| #71 | 알러지 툴팁을 인라인으로 두면 칩이 밀린다 → `Popup`으로 해결 (이미 적용됨) | `Tooltip.kt:28~31` |
| #85 | 회원탈퇴의 최종 위치. 설정 화면이 생기면 옮긴다. 설정 토글의 저장도 원래 미구현이었다 | `AccountActions.kt:28~31`, `MyProfileScreen.kt:206~211` |
| #150 | `NONE`("없어요")과 `UNKNOWN`("잘 모르겠어요")을 화면에서 가를 자리가 없다. 시안의 보조 버튼도 한 개에 두 뜻을 묶어 둬서 그대로 넣어서는 안 갈린다 | `HealthProfileRepository.kt:93~100`, `MyProfileScreen.kt:192~198` |
| #187 | 설정 토글 3개 중 알림만 계정, 나머지 둘은 기기 | `MyProfileViewModel.kt:34~39` |
| #226 | NavBar 제목이 바의 가운데 (남은 폭의 가운데가 아님) | `NavBar.kt:46` |
| #227 | 온보딩 장이 밀려서 바뀐다 (방향 있는 전환) | `OnboardingScreen.kt:54` |
| #235 | 구역 머리가 가운데 맞춤 | `Rows.kt:315` |
| #239 | 온보딩 좌우 스와이프 | `OnboardingScreen.kt:175` |
| — | 1s-1 프로필 카드의 chevron: 가리킬 수정 화면이 없어 비워 둠. 수정 화면이 정해지면 chevron과 함께 붙인다 | `MyProfileScreen.kt:113~122` |
| — | 1b-4 머무는 시간 2초: **Figma에 값이 없어서 정한 것** | `ProfileCompleteScreen.kt:50` |
| — | 1s-2 "직접 추가"를 누른 뒤의 UI: 시안에 없어 1i의 방식(입력 칸 + 더하기)을 따름 | `HealthEditScreen.kt:158~164` |
