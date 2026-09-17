# 인증 · 세션 (1o 로그인, 1a-1 스플래시)

> 이 문서는 `C:/Claude/MedicalMate` 안드로이드 프로젝트의 실제 Kotlin 소스를 읽고 작성했다.
> 근거 파일은 각 절 머리에 경로로 밝힌다. 화면 문구는 `app/src/main/res/values/strings.xml`의
> 값을 글자 그대로 옮겼다(`\n`은 소스의 줄바꿈 이스케이프 그대로다).

---

## 웹앱 구현 메모

- 모바일 폭 고정: 하지 않는다. `MedicalMateSize.screenWidth`(360dp)는 기준값일 뿐 "이 값으로 레이아웃을 고정하지 않는다"가 소스 주석이고, 좌우 거터 20px을 유지한 채 콘텐츠를 Fill 하는 방식을 그대로 옮긴다(데스크톱에서는 `max-width: 480px` + 가운데 정렬 컨테이너 권장).
- 카카오 로그인은 네이티브 SDK(Activity Context 필요)라 웹에서 재현 불가 → 데모 모드로 대체한다. 웹은 "카카오로 시작하기" 클릭 시 `InProgress`(가짜 SDK 지연) → `ExchangingToken` → 성공/실패를 흉내 내고, 서버 교환 부분만 실제 `POST /api/auth/kakao` 자리로 남겨 둔다.
- 스플래시는 애니메이션이 없다(진행 표시 없음). 다만 최소 2초/최대 6초 타이밍 규칙은 반드시 옮겨야 한다 — 이 타이밍이 `RestoreFailed` 문구 분기를 만든다.
- 화면 전환은 가로 슬라이드 320ms `FastOutSlowInEasing` + 페이드, 물러나는 화면은 1/4만 이동(패럴랙스). 안드로이드의 가장자리 스와이프 뒤로가기(predictive back)는 웹에서 브라우저 뒤로가기로 대체하고 제스처 재현은 포기한다.
- 토큰은 안드로이드에서 평문 DataStore에 있다. 웹에서는 `localStorage` 대신 메모리 + `sessionStorage` 조합을 쓰고, 데모라면 토큰을 아예 저장하지 않는 편이 낫다. 다크 모드는 없다(`values-night` 없음, DESIGN.md 11.7).

---

## 0. 이 도메인이 다루는 것

| 항목 | 값 |
| --- | --- |
| 패키지 | `com.mist.medicalmate.auth` (`data/`, `ui/`) + `MainActivity.kt`, `MedicalMateApplication.kt` |
| 화면 | 스플래시(1a-1 → V2 `1320:4553`), 로그인(1o → V2 `1320:4558`) |
| 백엔드 | `BuildConfig.BACKEND_BASE_URL` — 기본값 `https://d3f36x6ccm838d.cloudfront.net/`, OpenAPI 출처는 `https://jinryomate-backend.onrender.com/v3/api-docs` |
| 소셜 로그인 | 카카오 단독. 백엔드 `User` 식별자가 `kakaoId` 단독이라 다른 제공사는 눌러도 실패한다 |
| 다크 모드 | 없음 (`values-night` 미생성) |
| 최소 SDK | 26 / `applicationId = com.mist.medicalmate` |

### 파일 지도

```
auth/data/
  AuthApi.kt              Retrofit 인터페이스 + DTO (KakaoLoginRequest / RefreshRequest / TokenResponse)
  AuthModule.kt           Hilt 모듈 둘. `AuthApiModule`(일반 AuthApi + @AuthFree AuthApi 제공),
                          `AuthRepositoryModule`(AuthRepository←DefaultAuthRepository,
                          AccessTokenProvider←TokenStore, TokenRefresher←DefaultTokenRefresher 바인딩)
  AuthRepository.kt       Session / AuthResult / AuthRepository / DefaultAuthRepository
  DefaultTokenRefresher.kt  401 재발급 구현 (AuthFree 경로)
  KakaoLoginClient.kt     카카오 SDK 래퍼 (login / logout)
  KakaoLoginResult.kt     Success / Cancelled / Failure
  TokenStore.kt           DataStore("auth")에 access/refresh 토큰 보관
auth/ui/
  LoginDestination.kt     @Serializable data object LoginDestination + loginDestination()
  LoginRoute.kt           상태 있는 진입점, 카카오 SDK 호출 담당
  LoginScreen.kt          상태 없는 화면 (Hero / Actions)
  LoginUiState.kt         LoginUiState, isBusy(), LoginFailure
  LoginViewModel.kt       로그인 상태 전이
  SessionViewModel.kt     SessionUiState, AccountActionState, 스플래시 타이밍
  SplashScreen.kt         1a-1 브랜드 화면
core/network/
  AccessTokenProvider.kt, TokenRefresher.kt   core→auth 역참조 방지 인터페이스
  AuthInterceptor.kt      Authorization: Bearer 부착
  TokenAuthenticator.kt   401 → 재발급 → 1회 재전송 (mutex)
  ApiCall.kt / ApiResult.kt / ApiError.kt     실패를 값으로 다루는 결과 타입
  AuthFree.kt             인증 없는 네트워크 경로 Qualifier
  NetworkModule.kt        OkHttp/Retrofit 조립, 타임아웃
```

---

## 1. 화면: 스플래시 (1a-1)

**소스**: `auth/ui/SplashScreen.kt`
**Figma**: `V2 · 스플래시` = `1320:4553`. 옛 `1a-1`(`397:1179`)이 삭제되고 이 프레임이 그 자리다(내용 동일).
**언제 보이나**: `SessionUiState.Checking`이거나 온보딩 기록(`OnboardingGateViewModel.completed`)이 `null`인 동안. `MainActivity`가 `MedicalMateNavHost`를 세우기 전에 `return`으로 잡는다.

### 레이아웃 (위 → 아래)

| 순서 | 요소 | 규격 |
| --- | --- | --- |
| 전체 | `Column(fillMaxSize)` | 배경 `colors.bgPrimary` = `#5566D2` (Primary500) — 화면 끝까지 닿는다 |
| 1 | 콘텐츠 `Column(fillMaxWidth, weight 1f)` | padding: 좌우 `gutter` 20dp / 상하 `s16` 16dp, `spacedBy(20dp, Alignment.CenterVertically)`, 가로 가운데 정렬 |
| 1-1 | Mono Light 락업 `Row` | `spacedBy(14dp)`, 세로 가운데 정렬 |
| 1-1-a | 심볼 이미지 `MedicalMateLogo.Mark` (`ic_logo_mark`) | 50.4dp 정사각, `ColorFilter.tint(colors.fgOnPrimary)` = 흰색, `contentDescription = null` |
| 1-1-b | 워드마크 `Text(app_name)` | Pretendard **Bold**, fontSize 30.8dp→sp, lineHeight 39.2dp→sp, letterSpacing **-3%**(`-0.03em`), 색 `fgOnPrimary`(#FFFFFF) |
| 1-2 | 태그라인 `Text(splash_tagline)` | `typography.bodyM`(Normal 15/24, 자간 0), 색 `fgOnPrimary`, `TextAlign.Center`, `fillMaxWidth` |
| 2 | `Box(height = safeBottom 24dp)` | 하단 시각 여백 |

### 화면 문구 (그대로 옮길 것)

| 리소스 | 문자열 |
| --- | --- |
| `app_name` | `진료메이트` |
| `splash_tagline` | `진료실에서 하고 싶은 말, 미리 정리해요` |

### 로고 락업 규칙 (웹에서 그대로 지킬 것)

- `ic_logo_lockup`(139x36 한 장짜리)을 **쓰지 않는다**. 워드마크 먹색과 심볼 판까지 색이 박혀 있어 tint를 주면 세 색이 흰색 하나로 뭉개진다. 마크만 흰색으로 칠하고 워드마크는 **글자로 얹는다**. Figma 락업 컴포넌트(`351:1303`의 Mono Light 변형)도 심볼 인스턴스 + 텍스트 노드 두 개다.
- 크기는 마스터(심볼 36 · 워드마크 22 · 간격 10)의 **1.4배**다: 50.4 / 30.8 / 14. 반올림하지 않는다.
- 워드마크는 `dp`를 그 시점 밀도로 `sp`로 바꿔 **글꼴 배율에서 떼어낸다**(로고는 문장이 아니라 그림이므로 비율 고정). 태그라인은 문장이므로 배율을 따른다.
  → 웹 대응: 워드마크는 `px` 고정, 태그라인은 `rem`.

### 디자인 시스템 컴포넌트

`MedicalMateTheme`(colors/typography), `MedicalMateSize.gutter/safeBottom`, `MedicalMateSpace.s16/s20`, `MedicalMateLogo.Mark`, `MedicalMateFontFamily`, `MedicalMateScreenPreviews`(프리뷰 어노테이션).
**전용 컴포넌트는 없다.** 로컬 `MonoLightLockup()`만 있다.

### 로딩 / 빈 / 에러

- **진행 표시(스피너)를 넣지 않았다.** Figma에 없다. 복구는 보통 한 프레임 안에 끝나고 그때 스피너는 깜빡임으로만 남는다.
- 빈 상태·에러 상태가 없다. 복구 실패는 이 화면이 아니라 로그인 화면의 문구로 드러난다.
- `windowBackground`도 `@color/bg_primary`(#5566D2)로 맞춰 Compose 첫 프레임 전 번쩍임을 없앴다(`res/values/themes.xml`, `Theme.MedicalMate.Base` parent = `android:Theme.Material.Light.NoActionBar`).
- API 31+는 `values-v31/themes.xml`이 시스템 스플래시까지 같은 면으로 맞춘다: `android:windowSplashScreenBackground = @color/bg_primary` + **`android:windowSplashScreenAnimatedIcon = @drawable/splash_icon_none`으로 아이콘을 비운다.** 시스템이 아이콘을 창 가운데에 놓는데 우리 화면은 락업+태그라인을 묶어 가운데를 잡아서, 흰 마크를 두면 눈에 보이게 튄다.
  → 웹 대응: `<body>` 초기 배경을 `#5566D2`로. 시스템 스플래시에 대응하는 것은 없다.

### 주의: 주석과 실제 동작이 어긋난다

`SplashScreen.kt` KDoc은 "최소 노출 시간을 두는 문제는 디자인 트랙에 물어야 해서 지금은 인위적인 지연을 넣지 않았다(#63)"고 적혀 있지만, **실제 지연은 `SessionViewModel`이 갖고 있다**(`MIN_SPLASH_MILLIS = 2_000L`). 주석이 낡았다. 웹은 `SessionViewModel` 쪽 값을 따라야 한다.

---

## 2. 화면: 로그인 (1o)

**소스**: `auth/ui/LoginScreen.kt`, `auth/ui/LoginRoute.kt`, `auth/ui/LoginDestination.kt`
**Figma**: `V2 · 로그인` = `1320:4558`. 옛 `1o`(`397:1192`)가 삭제되고 이 프레임이 그 자리다 — 문구와 구조는 그대로.
서브 프레임: `Hero` = `1320:4561` (320x192, 요소 간격 20), `Actions` = `1320:4566` (320x116, 간격 20), `Logo Lockup` 139x36.

### 레이아웃 (위 → 아래)

```
Column(fillMaxSize, padding horizontal = gutter 20dp)
├─ Spacer(height = s24 = 24dp)          ← 상단 고정 여백
├─ Spacer(weight = 1f)                   ← Figma의 Spacer 244를 weight로 옮김
├─ Hero            (왼쪽 정렬, spacedBy 20dp)
│   ├─ Image  ic_logo_lockup            height 36dp, 폭은 비율대로(139x36)
│   │                                    contentDescription = "진료메이트"(app_name)
│   ├─ Text   login_title                headingL / fgDefault
│   └─ Text   login_subtitle             bodyM / fgSubtle
├─ Spacer(weight = 1f)
├─ Actions         (fillMaxWidth, spacedBy 20dp)
│   ├─ [조건부] Text 안내 문구            bodyM / fgDanger   ← Figma에 없는 기능상 추가분
│   ├─ MedicalMateSocialLoginButton(KAKAO)
│   └─ Text   login_disclaimer           bodyS / fgSubtle
└─ Spacer(height = safeBottom = 24dp)
```

레이아웃 결정의 근거(주석 그대로):

- **위아래 여백이 같은 세 덩어리.** Figma에서 Spacer가 244로 둘 다 같아 `weight(1f)`로 옮겼다. 고정값으로 두면 화면 높이가 다른 기기에서 아래가 잘린다. → 웹: `flex: 1` 스페이서 두 개.
- **왼쪽 정렬이다.** 제목이 두 줄이라 가운데 정렬하면 줄 끝이 들쭉날쭉해진다.
- **카카오만 노출한다.** 백엔드 `User` 식별자가 `kakaoId` 단독이라 다른 제공사는 눌러도 실패한다. `Social Login Stack`을 쓰지 않고 버튼 하나를 직접 둔 이유도 같다.
- **Figma에는 로그인 실패 안내 자리가 없다.** 기능상 필요해서 버튼 위에 유지한다.
- `restoreFailed`도 **같은 자리**에 문구를 얹는다. 자리를 따로 만들지 않았고, 왜 다시 로그인해야 하는지는 알려줘야 한다.

### 화면 문구 (그대로 옮길 것)

| 리소스 | 문자열 | 쓰임 |
| --- | --- | --- |
| `app_name` | `진료메이트` | 로고 이미지의 대체 텍스트 |
| `login_title` | `진료실에서 하고 싶은 말,\n미리 정리해요` | Hero 제목 (두 줄 고정) |
| `login_subtitle` | `증상을 기억하지 못해도, 말이 잘 안 나와도 괜찮아요.\nAI와 대화하면 진료 전에 정리해드려요.` | Hero 설명 (두 줄 고정) |
| `login_kakao` | `카카오로 시작하기` | 버튼 라벨 |
| `login_kakao_content_description` | `카카오로 로그인` | 버튼 `aria-label` (라벨과 다름 — 동작이 드러나는 문장) |
| `login_disclaimer` | `진료메이트가 정리한 내용은 진료를 돕기 위한 참고 자료예요.\n진단이나 처방이 아니니 최종 판단은 의료진과 상의해 주세요.` | 하단 법적 고지 (두 줄 고정) |
| `login_failed_kakao` | `카카오 로그인에 실패했어요. 다시 시도해주세요` | `LoginFailure.KAKAO` |
| `login_failed_network` | `인터넷 연결을 확인해주세요` | `LoginFailure.NETWORK` |
| `login_failed_server` | `로그인에 실패했어요. 잠시 후 다시 시도해주세요` | `LoginFailure.SERVER` |
| `login_restore_failed` | `자동 로그인을 확인하지 못했어요. 다시 로그인해주세요` | `restoreFailed = true` |

문구 출처 주석: 카카오 가이드는 "기본 레이블은 … 완성형과 축약형으로 사용할 수 있습니다"라는 **허용문**이고 금지 조항이 없어 다른 문구를 막지 않는다. 색상 쪽은 금지문이라 어투가 다르다 → **색은 가이드를 그대로 따르고 문구는 디자인을 따른다.**
`login_disclaimer`는 이전에 있던 약관·개인정보 동의 안내를 대체한 것이고, 둘 다 필요할 수 있어 이슈 #55에 남아 있다(법무 판단 대기).

### 안내 문구 우선순위 (중요)

두 문구가 **같은 자리**를 쓰므로 하나만 띄운다.

```kotlin
val noticeRes = when {
    state is LoginUiState.Failed -> state.reason.messageRes()  // 1순위
    restoreFailed                -> R.string.login_restore_failed  // 2순위
    else                         -> null
}
```

근거: "눌러본 결과가 있으면 그것이 먼저다. 자동 로그인 실패는 이미 지나간 일이고, 방금 누른 버튼의 결과를 먼저 알려야 한다."
문구가 없으면 `Text` 자체를 그리지 않는다 → **Actions 블록의 높이가 줄어든다**(버튼이 아래로 내려오지 않고 `weight` 스페이서가 흡수). 웹에서 자리를 미리 비워 두면 안 된다.

### 디자인 시스템 컴포넌트

| 컴포넌트 | 비고 |
| --- | --- |
| `MedicalMateSocialLoginButton` | `provider = MedicalMateSocialProvider.KAKAO`, `label`, `contentDescription`, `onClick`, `enabled = !state.isBusy()`, `inProgress = state.isBusy()` |
| `MedicalMateSocialProvider.KAKAO` | container `#FEE500`, label `#191600`, symbol 드로어블 `ic_kakao_symbol`(tint는 label 색 `#191600`), border 없음. `BrandColor.kt`의 `KakaoSymbol = Color.Black`은 정의만 있고 버튼이 쓰지 않는다 |
| `MedicalMateSocialProvider` 나머지 | `NAVER`/`APPLE`/`GOOGLE`도 enum에 있다. **셋 다 `symbol = null`이라 라벨만 그려진다**(공식 키트 아이콘이 아직 없다). `GOOGLE`만 `border = GoogleBorder`로 1dp 테두리. 이 화면은 셋 다 쓰지 않는다 |
| `MedicalMateTheme` | `typography.headingL/bodyM/bodyS`, `colors.fgDefault/fgSubtle/fgDanger` |
| `MedicalMateSize` | `gutter`(20), `safeBottom`(24), `controlLg`(56), `iconMd`(20) |
| `MedicalMateSpace` | `s10`(10), `s16`(16), `s20`(20), `s24`(24) |
| `MedicalMateLogo.Lockup` | `ic_logo_lockup`, 139x36 |
| `MedicalMateRadius.md` | 16dp — 소셜 버튼 모서리 |
| `MedicalMateScreenPreviews` | 프리뷰 어노테이션(구현 대상 아님) |

**`MedicalMateSocialLoginStack`은 이 화면에서 쓰지 않는다.** 정의는 있지만 카카오 하나뿐이라 버튼을 직접 놓았다.

#### MedicalMateSocialLoginButton 상세 (`core/designsystem/component/SocialLoginButton.kt`)

- 규격: **350x56, radius 16**. 화면에서는 `fillMaxWidth` + `heightIn(min = controlLg 56dp)`.
  카카오 가이드는 radius 12를 적지만 DESIGN.md 컴포넌트 규격이 **16**으로 정했고 같은 항목을 브랜드 가이드 예외로 표시했다(#39에서 문서 값으로 결정).
- 내부: `Row(padding horizontal = 16dp, spacedBy(10dp, CenterHorizontally), 세로 가운데)`.
- `inProgress = true`이면 **심볼과 라벨을 모두 치우고** `CircularProgressIndicator`만 그린다 — 크기 `iconMd` 20dp, strokeWidth 2dp, 색 = `provider.label`(`#191600`).
- `inProgress = false`이면 심볼 아이콘(20 x 18.67dp, 가로세로가 달라 `size` 하나로 못 쓴다) + 라벨(`typography.labelL` = SemiBold 15/20).
- `enabled = enabled && !inProgress` — `inProgress`만으로도 클릭이 막힌다.
- `contentDescription`을 라벨과 따로 받아 `semantics`에 건다.
- 심볼은 각 사 **공식 키트에서 받은 것만** 넣는다. 임의로 그리면 가이드 위반. 카카오 말풍선은 디자인 시스템 `Provider=Kakao` 마스터(`383:1290`)에서 내보냈다.
- 카카오 색은 **변경 금지**다. 시맨틱 토큰이나 `colorScheme`에 넣지 않으며 다크 모드에 따라 바뀌면 안 된다.

### 로딩 / 빈 / 에러 상태

| 상태 | 보이는 모습 |
| --- | --- |
| `Idle` | 안내 문구 없음(단, `restoreFailed`면 `login_restore_failed`가 붉게). 버튼 활성, 라벨 `카카오로 시작하기` + 카카오 심볼 |
| `InProgress` (카카오 SDK 진행) | 버튼이 **스피너만** 표시, 비활성 |
| `ExchangingToken` (서버 교환) | 위와 **완전히 동일**. 사용자는 두 단계를 구분할 수 없다 |
| `Failed(KAKAO/NETWORK/SERVER)` | 버튼 위에 해당 문구가 `fgDanger`(#C4302B) `bodyM`으로. 버튼은 다시 활성 |
| `Authenticated` | 화면에 그려지지 않는다. `LaunchedEffect`가 즉시 소비하고 네비게이션이 일어난다 |
| 빈 상태 | **없다.** 이 화면에는 목록이 없다 |
| 전체 화면 로딩 | **없다.** 로딩은 버튼 안에서만 표현된다 |
| 편집 모드 | **없다.** 입력 필드가 하나도 없는 화면이다 |

취소(`KakaoLoginResult.Cancelled`)는 **에러가 아니다** — `Idle`로 되돌아가고 문구를 띄우지 않는다. "사용자가 스스로 닫은 것은 오류가 아니므로 화면에 오류 문구를 띄우면 안 된다."

**실패 문구는 스스로 사라지지 않는다.** `LoginViewModel.onFailureAcknowledged()`(→ `Failed`일 때만 `Idle`로)가 정의돼 있고 테스트도 있지만 **`LoginRoute`·`LoginScreen` 어디에서도 부르지 않는다**(전체 main 소스 grep 결과 호출부 0). 그래서 실제 동작은 "실패 문구가 화면에 남아 있다가, 사용자가 버튼을 다시 눌러 `onLoginStarted()`가 `InProgress`로 바꿀 때 사라진다"이다. 닫기 버튼이나 자동 소멸(타이머)이 없다.
→ 웹 대응: 같은 동작이면 문구에 dismiss를 달지 않는다. 달고 싶다면 이 미사용 함수가 그 자리다.

**이 화면의 Preview가 덮는 분기**(`LoginScreen.kt` 하단): `Idle` / `ExchangingToken` / `Failed(NETWORK)` / `Failed(SERVER)` / `Idle + restoreFailed=true` 다섯. `InProgress`와 `Failed(KAKAO)` 전용 프리뷰는 없다(`InProgress`는 `ExchangingToken`과 픽셀이 같고, `Failed(KAKAO)`는 문구만 다르다). `Idle`과 `restoreFailed`만 `@MedicalMateScreenPreviews`(다중 기기)이고 나머지 셋은 `@Preview(390x844)` 단일이다.

**코루틴 범위가 둘로 갈린다** — 웹에서 재현할 것: 카카오 SDK 호출은 `LoginRoute`의 `rememberCoroutineScope()`(= 컴포지션 스코프, 화면이 사라지면 취소)에서 돌고, 서버 토큰 교환은 `LoginViewModel.viewModelScope`(= Activity 스코프, 화면을 떠나도 계속)에서 돈다. 즉 **`InProgress` 중에 화면이 사라지면 카카오 호출이 끊기고, `ExchangingToken` 중에 사라지면 교환은 끝까지 간다.**

---

## 3. 상태 타입 전체 (TypeScript로 바로 옮길 수 있게)

### 3.1 `LoginUiState` (`auth/ui/LoginUiState.kt`)

| 변형 | 필드 | 타입 | 의미 |
| --- | --- | --- | --- |
| `Idle` | — | — | 처음 상태. 초기값 |
| `InProgress` | — | — | 카카오 SDK 로그인 진행 중 |
| `ExchangingToken` | — | — | 카카오 토큰을 서버 JWT로 교환하는 중 |
| `Authenticated` | `onboardingRequired` | `Boolean` | 로그인 완료. 소비 후 `Idle`로 되돌린다 |
| `Failed` | `reason` | `LoginFailure` | 실패. 갈래별 문구를 띄운다 |

파생 함수:

```kotlin
fun LoginUiState.isBusy(): Boolean =
    this == LoginUiState.InProgress || this == LoginUiState.ExchangingToken
```

TypeScript 옮김 예:

```ts
type LoginUiState =
  | { kind: 'Idle' }
  | { kind: 'InProgress' }
  | { kind: 'ExchangingToken' }
  | { kind: 'Authenticated'; onboardingRequired: boolean }
  | { kind: 'Failed'; reason: LoginFailure };

const isBusy = (s: LoginUiState) => s.kind === 'InProgress' || s.kind === 'ExchangingToken';
```

#### `LoginViewModel` 공개 API와 전이 (전부)

| 메서드 | 전이 | 부르는 곳 |
| --- | --- | --- |
| `onLoginStarted()` | 무조건 `InProgress` (가드 없음 — 어떤 상태에서 불러도 덮는다) | `LoginRoute`의 버튼 `onClick` |
| `onLoginResult(KakaoLoginResult)` | `Success` → `ExchangingToken` → (서버) `Authenticated` \| `Failed(NETWORK)` \| `Failed(SERVER)` / `Cancelled` → `Idle` / `Failure` → `Failed(KAKAO)` | `LoginRoute`의 `scope.launch` |
| `onAuthenticationHandled()` | **`Authenticated`일 때만** `Idle`. 다른 상태면 아무것도 안 한다 | `LoginRoute`의 `LaunchedEffect` |
| `onFailureAcknowledged()` | **`Failed`일 때만** `Idle` | **호출부 없음** (테스트에서만 부른다) |

`exchangeToken()`은 `private`이고 `onLoginResult`를 거쳐야만 들어간다. 초기값은 `Idle`.

### 3.2 `LoginFailure` (enum)

| 값 | 의미 | 문구 |
| --- | --- | --- |
| `KAKAO` | 카카오 로그인 단계에서 실패. **키 해시 미등록도 여기로 온다** | `login_failed_kakao` |
| `NETWORK` | 서버에 닿지 못함 | `login_failed_network` |
| `SERVER` | 서버가 거절함. 카카오 토큰 검증 실패나 앱 ID 불일치가 여기로 | `login_failed_server` |

매핑 규칙(`LoginViewModel.kt`):

```kotlin
private fun AuthResult.Rejected.toFailure(): LoginFailure = when (code) {
    ApiErrorCode.UPSTREAM_ERROR, ApiErrorCode.UPSTREAM_TIMEOUT -> LoginFailure.NETWORK
    else -> LoginFailure.SERVER
}
```

근거: 서버가 상위 서비스(카카오/AI)에 **닿지 못한** 경우는 사용자가 할 일이 "잠시 후 다시"라서 네트워크 갈래로 묶는다.

### 3.3 `SessionUiState` (`auth/ui/SessionViewModel.kt`) — 4가지

| 변형 | 필드 | 타입 | 의미 | 가는 화면 |
| --- | --- | --- | --- | --- |
| `Checking` | — | — | 저장된 토큰으로 세션을 복구하는 중. **초기값** | 스플래시(1a-1) |
| `SignedOut` | — | — | 로그인되지 않음 | 로그인(1o), 문구 없음 |
| `SignedIn` | `onboardingRequired` | `Boolean` | 로그인됨 | 온보딩 인트로(1a-2) 또는 홈 |
| `RestoreFailed` | — | — | **서버에 물어보지 못해 로그인 여부를 모른다** | 로그인(1o), `login_restore_failed` 문구 |

`RestoreFailed`를 따로 두는 이유(클래스 주석 그대로): 가는 곳은 `SignedOut`과 같은 로그인 화면이다. 홈으로 보내면 로그인되지 않았을 수도 있는 사람에게 자기 기록인 척하는 화면을 보여주게 된다. 그래도 상태를 나눠 두는 이유는 **"스스로 로그아웃한 사람과 자동 로그인이 실패한 사람은 같은 화면에서 다른 것을 알아야"** 하기 때문이다.

```ts
type SessionUiState =
  | { kind: 'Checking' }
  | { kind: 'SignedOut' }
  | { kind: 'SignedIn'; onboardingRequired: boolean }
  | { kind: 'RestoreFailed' };
```

#### `SessionViewModel` 공개 API (전부)

`SessionUiState` 초기값은 `Checking`, `AccountActionState` 초기값은 `Idle`. `init { restore(); observeSession() }` — **생성되는 순간 복구가 시작된다.**

| 멤버 | 하는 일 | 부르는 곳 |
| --- | --- | --- |
| `uiState: StateFlow<SessionUiState>` | 세션 상태 | `MainActivity` |
| `accountAction: StateFlow<AccountActionState>` | 로그아웃·탈퇴 진행 상태 | `MainActivity` |
| `onSignedIn(onboardingRequired)` | 무조건 `SignedIn(onboardingRequired)` (가드 없음) | `MainActivity`가 `MedicalMateNavHost(onAuthenticated = ...)`로 내려보내고, `LoginRoute.onAuthenticated`가 부른다 |
| `onOnboardingCompleted()` | **현재가 `SignedIn`일 때만** `SignedIn(onboardingRequired = false)`. 아니면 아무것도 안 한다 — **"이 메서드로 로그인이 되어서는 안 된다"** | `MainActivity` → `profileCompleteDestination.onFinished` |
| `logout()` | `InProgress` → (repo.logout 완료) `Idle` + `SignedOut` | `AccountActionCallbacks.onLogoutClick` |
| `withdraw()` | `InProgress` → 성공 `Idle`+`SignedOut` / 실패 `WithdrawFailed`(세션 유지) | `AccountActionCallbacks.onWithdrawClick` |
| `onAccountActionFailureAcknowledged()` | 무조건 `AccountActionState.Idle` | `WithdrawFailedDialog(onDismiss = ...)` |
| `private restore()` | §6 | `init` |
| `private observeSession()` | §6 끝 | `init` |

> 온보딩 완료 표시 위치는 **아직 제자리가 아니다**(소스 주석): "지금은 온보딩 인트로(1a-2)의 시작하기가 부르지만, 신상정보 입력(1b-1~1b-4)이 생기면 그 흐름의 끝으로 옮겨야 한다. 인트로만 보고 넘어간 사람은 아직 신상정보를 넣지 않았다." 실제 코드에서는 `profileCompleteDestination.onFinished`가 부른다.

### 3.4 `AccountActionState` (로그아웃·탈퇴 진행 상태)

| 변형 | 필드 | 의미 |
| --- | --- | --- |
| `Idle` | — | 아무 동작 없음. 초기값 |
| `InProgress` | — | 로그아웃 또는 탈퇴 진행 중 → 버튼 비활성(`AccountActionCallbacks.enabled = accountAction != InProgress`) |
| `WithdrawFailed` | — | 탈퇴가 실패했다. **계정은 그대로 남아 있다.** `onAccountActionFailureAcknowledged()`로만 `Idle`로 돌아간다 |

세션 상태와 **분리한** 이유: 탈퇴가 실패하면 로그인 상태는 그대로 유지되어야 하고 실패 사실만 따로 알려야 한다. 한 상태에 섞으면 "로그인됨 + 탈퇴 실패"를 표현할 수 없다.

**로그아웃 실패라는 상태는 없다.** `logout()`은 결과를 보지 않으므로 `InProgress` 다음은 항상 `Idle` + `SignedOut`이다.

### 3.5 도메인/결과 타입 (`auth/data/`)

**`AuthRepository` 인터페이스 (전부 — 웹의 auth 서비스가 가져야 할 표면)**

| 멤버 | 반환 | 비고 |
| --- | --- | --- |
| `hasSession` | `Flow<Boolean>` | `TokenStore.hasSession()`을 그대로 흘린다. 화면 밖에서 세션이 끝나는 경로 때문에 흐름이다 |
| `loginWithKakao(kakaoAccessToken)` | `AuthResult` | 교환 성공 시 **저장까지 여기서 한다** |
| `restoreSession()` | `AuthResult?` | 저장된 refresh 토큰이 없으면 `null` — 실패(`Rejected`/`NetworkUnavailable`)와 **다른 값**이다 |
| `logout()` | `Unit` | 결과 없음 |
| `withdraw()` | `AuthResult` | 실패를 그대로 알린다 |
| `clearSession()` | `Unit` | `tokenStore.clear()`만 한다. **main 소스에 호출부가 없다**(테스트 가짜 구현에만 있다). 인터페이스에 남아 있는 미사용 API이므로 웹으로 옮길 필요는 없다 |

**`Session`**

| 필드 | 타입 | 비고 |
| --- | --- | --- |
| `onboardingRequired` | `Boolean` | `refresh` 경로에서는 서버가 항상 `false`를 주므로 **신뢰할 수 없다** |

**`AuthResult`** (sealed)

| 변형 | 필드 | 타입 | 의미 |
| --- | --- | --- | --- |
| `Success` | `session` | `Session` | 성공 |
| `NetworkUnavailable` | — | — | 서버에 닿지 못했다. **토큰은 그대로 두고 다시 시도할 수 있다** |
| `Rejected` | `code` | `ApiErrorCode` | 서버가 거절했다 |
| | `requestId` | `String?` | 서버 로그와 이어붙이는 열쇠. 장애 문의 때 쓴다 |

`ApiResult.Rejected` → `AuthResult.Rejected`로 옮길 때 **`message`·`retryable`·`details`는 버린다**(`DefaultAuthRepository.toAuthResult()`가 `code`와 `requestId`만 옮긴다). 화면 문구는 `strings.xml`이 정하므로 서버 메시지를 쓰지 않는다는 규칙과 짝이다. `AuthResult.NetworkUnavailable`은 `data object`라 `ApiResult.NetworkUnavailable.cause: IOException`도 여기서 사라진다.

**`KakaoLoginResult`** (sealed)

| 변형 | 필드 | 타입 | 의미 |
| --- | --- | --- | --- |
| `Success` | `accessToken` | `String` | 서버에 그대로 넘길 카카오 액세스 토큰. **앱은 저장하지 않는다** |
| `Cancelled` | — | — | 사용자가 스스로 닫음. 오류가 아님 |
| `Failure` | `cause` | `Throwable` | 그 밖의 실패 |

**`ApiResult<T>`** (`core/network/ApiResult.kt`)

| 변형 | 필드 | 타입 |
| --- | --- | --- |
| `Success<T>` | `value` | `T` |
| `Rejected` | `code` | `ApiErrorCode` |
| | `message` | `String?` |
| | `requestId` | `String?` |
| | `retryable` | `Boolean` |
| | `details` | `JsonObject?` (기본 `null`) |
| `NetworkUnavailable` | `cause` | `IOException` |

**`ApiErrorCode`** (enum): `INVALID_REQUEST`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CARD_ALREADY_EDITED`, `UPSTREAM_ERROR`, `UPSTREAM_TIMEOUT`, `INTERNAL`, `UNKNOWN`.
목록 밖의 값은 `UNKNOWN`으로 접는다. **인증 실패와 토큰 만료가 똑같이 `UNAUTHORIZED`로 내려오므로 코드만으로는 구분할 수 없다** — 어느 엔드포인트를 불렀는지로 판단해야 한다.

---

## 4. API

베이스 URL: `BuildConfig.BACKEND_BASE_URL` (기본 `https://d3f36x6ccm838d.cloudfront.net/`).
타임아웃: connect **10초**, read **60초**. 읽기 60초인 이유는 Render 무료 티어 인스턴스가 잠들어 첫 요청의 **응답**이 수십 초 걸리기 때문이다. 연결은 되거나 안 되거나이므로 10초.
JSON: `ignoreUnknownKeys = true`, `explicitNulls = false`.
로깅: 디버그 빌드만 `BASIC`, 릴리즈는 `NONE`. **본문을 절대 찍지 않는다**(증상·복용약·기저질환·알레르기가 요청 본문에 실린다).

| 메서드 | 경로 | 인증 | 요청 | 응답 |
| --- | --- | --- | --- | --- |
| `POST` | `api/auth/kakao` | 불필요 | `KakaoLoginRequest` | `TokenResponse` |
| `POST` | `api/auth/refresh` | 불필요 | `RefreshRequest` | `TokenResponse` |
| `POST` | `api/auth/logout` | **필요** (`Bearer`) | 없음 | 없음 |
| `DELETE` | `api/me` | **필요** (`Bearer`) | 없음 | 없음 |

`loginWithKakao`와 `refresh`는 서버 `SecurityConfig`에서 열려 있다. `logout`과 `withdraw`는 `Authorization: Bearer`가 없으면 401이 온다. 헤더는 `AuthInterceptor`가 붙인다.

### 요청 본문

```jsonc
// POST api/auth/kakao
{ "kakaoAccessToken": "<카카오 SDK가 준 액세스 토큰>" }

// POST api/auth/refresh
{ "refreshToken": "<TokenStore에 저장된 refresh 토큰>" }
```

### 응답 본문 — `TokenResponse`

| 필드 | 타입 | 비고 |
| --- | --- | --- |
| `accessToken` | `String` | `TokenStore`에 저장 |
| `refreshToken` | `String` | `TokenStore`에 저장. **서버가 회전시킨다** |
| `accessExpiresInSeconds` | `Long` | 파싱은 하지만 **앱에서 아무 데도 쓰지 않는다**(만료는 401로만 감지) |
| `onboardingRequired` | `Boolean` | **로그인 응답에서만 믿을 수 있다** |

> `onboardingRequired` 주석 원문: "로그인 응답에서는 서버가 실제 프로필 완료 여부로 계산한다. 다만 `refresh` 응답에서는 서버가 `false`로 하드코딩하므로 자동 로그인 경로에서 이 값을 신뢰할 수 없다. 온보딩 판단은 프로필 조회로 옮겨야 한다."

### 공통 에러 봉투 (`core/network/ApiError.kt`)

OpenAPI 스키마 목록에는 없고 실제 응답으로 확인한 형태다.

```json
{
  "error": { "code": "UNAUTHORIZED", "message": "...", "retryable": false, "details": null },
  "meta": { "requestId": "req_61c3205bdfee" }
}
```

`error.details`는 오류마다 다른 값이 오는 자리(Backend#117). 없으면 `null`.
실제 시그니처는 `internal suspend fun <T> apiCall(json: Json, block: suspend () -> T): ApiResult<T>`로 **`Json`을 첫 인자로 받는다**(에러 봉투를 직접 파싱하므로). 이 문서의 다른 코드 조각에서 `apiCall { ... }`로 줄여 쓴 곳은 모두 `apiCall(json) { ... }`이다.
봉투 파싱은 `runCatching`으로 감싸 실패하면 `null`이 되고, 그러면 `code = UNKNOWN` / `message = null` / `requestId = null` / `retryable = false` / `details = null`인 `Rejected`가 된다 — **본문이 봉투 형식이 아닌 401/500도 예외가 아니라 `Rejected`로 내려온다.**
`apiCall()`은 `HttpException`과 `IOException` **둘만** 잡는다. 그 밖(직렬화 실패 등)은 그대로 올린다 — "계약이 어긋났다는 뜻이고 사용자에게 '다시 시도해주세요'를 띄워 감출 문제가 아니다."
응답 본문을 결과에 담지 않는다(민감정보가 로그·크래시 리포트로 새지 않게).

---

## 5. 카카오 로그인 흐름 전체

### 5.1 초기화

`MedicalMateApplication.onCreate()`에서 `KakaoSdk.init(this, BuildConfig.KAKAO_NATIVE_APP_KEY)`.
매니페스트에 `com.kakao.sdk.auth.AuthCodeHandlerActivity`를 `kakao${KAKAO_NATIVE_APP_KEY}://oauth` 스킴으로 다시 선언한다(AAR 선언에 `exported`와 `intent-filter`가 없어 병합용). 이것이 **카카오톡에서 인증을 마치고 앱으로 돌아오는 지점**이다.
→ 웹 포팅: 이 딥링크 왕복은 웹에 대응물이 없다. 카카오 JavaScript SDK를 쓰면 팝업/리다이렉트 방식이고, 데모라면 이 단계를 통째로 흉내 낸다.

### 5.2 호출 순서

```
LoginScreen "카카오로 시작하기" 클릭 (enabled = !state.isBusy())
  └─ LoginRoute.onKakaoLoginClick
       ├─ viewModel.onLoginStarted()                    → LoginUiState.InProgress
       └─ scope.launch {                                  (rememberCoroutineScope = 화면 스코프)
            val r = kakaoLoginClient.login(context)
            ├─ UserApiClient.instance.isKakaoTalkLoginAvailable(context) == false
            │     → loginWithKakaoAccount(context)      (카카오계정 웹로그인)
            └─ true
                  → loginWithKakaoTalk(context)
                     └─ Failure 이면 loginWithKakaoAccount(context) 로 한 번 더
                        (Success·Cancelled 는 그대로 통과 — 재시도하지 않는다)

            viewModel.onLoginResult(r)                    (같은 launch 안에서 이어서)
            ├─ Success(accessToken) → exchangeToken(accessToken)
            │      → LoginUiState.ExchangingToken
            │      → viewModelScope.launch {              (Activity 스코프로 넘어간다)
            │           authRepository.loginWithKakao(accessToken)
            │             → apiCall(json) { POST api/auth/kakao { kakaoAccessToken } }
            │             → TokenResponse
            │             → TokenStore.save(accessToken, refreshToken)   ← Repository가 저장
            │             → AuthResult.Success(Session(onboardingRequired))
            │        }
            │      → LoginUiState.Authenticated(onboardingRequired)
            │        | AuthResult.NetworkUnavailable → Failed(NETWORK)
            │        | AuthResult.Rejected(UPSTREAM_ERROR|UPSTREAM_TIMEOUT) → Failed(NETWORK)
            │        | AuthResult.Rejected(그 밖)   → Failed(SERVER)
            ├─ Cancelled → LoginUiState.Idle           (오류 문구 없음)
            └─ Failure  → LoginUiState.Failed(KAKAO)
          }
```

**웹앱이 실제로 주고받는 것 (데모 대체 시 이 계약만 지키면 된다)**

| 단계 | 안드로이드 | 웹 데모에서 |
| --- | --- | --- |
| ① 카카오 자격증명 취득 | 네이티브 SDK가 `OAuthToken.accessToken`(String)을 준다. **앱은 저장하지 않는다** | 가짜 문자열 하나를 만들어 다음 단계에 넘긴다 |
| ② 서버 교환 | `POST {BACKEND_BASE_URL}api/auth/kakao`, 본문 `{"kakaoAccessToken": "<①>"}`, 인증 헤더 없음 | 같은 자리를 남겨 둔다 |
| ③ 응답 | `{accessToken, refreshToken, accessExpiresInSeconds, onboardingRequired}` | 네 필드를 그대로 흉내 낸다 |
| ④ 저장 | `accessToken`/`refreshToken` 둘을 `TokenStore`에 함께 쓴다. `accessExpiresInSeconds`는 파싱만 하고 **버린다** | 같음 |
| ⑤ UI로 올리는 값 | **`onboardingRequired: Boolean` 하나뿐.** 토큰은 UI 콜백으로 올라가지 않는다 | 같음 |

`KakaoLoginClient.toResult()`의 분기:

```kotlin
error is ClientError && error.reason == ClientErrorCause.Cancelled -> Cancelled
error != null  -> Failure(error)
token != null  -> Success(token.accessToken)
else           -> Failure(IllegalStateException("토큰과 오류가 모두 비어 있습니다"))
```

### 5.3 계층 분리 규칙 (웹에서도 지킬 만한 것)

- `KakaoLoginClient`는 로그인 시 **Context를 주입받지 않고 호출 시점에 받는다**(SDK가 Activity Context를 요구). 로그아웃은 Context가 없어도 되어 Repository가 바로 부른다.
- 덕분에 `LoginViewModel`은 Context를 들지 않고 상태 로직을 JVM에서 검증할 수 있다.
- `LoginRoute`의 `onAuthenticated`는 **토큰을 넘기지 않는다**. 넘기는 것은 `onboardingRequired` 하나뿐. "서버 JWT는 ViewModel과 저장소가 다루고, 자격증명을 UI 콜백으로 올려보낼 이유가 없다."
- `KakaoLoginClient`는 **`@Singleton` + `@Inject constructor()`로 Hilt 그래프에 있고 `DefaultAuthRepository`가 로그아웃용으로 주입받는다.** 다만 `LoginRoute`는 주입하지 않고 `remember { KakaoLoginClient() }`로 **자기 인스턴스를 따로 만든다.** 즉 앱에는 두 인스턴스가 있다 — 상태가 없는 래퍼라 문제가 되지 않지만, "Hilt 주입이 아니다"라고 단정하면 틀리다.
  → 웹 대응: 로그인용/로그아웃용을 한 모듈로 합쳐도 무방하다.

### 5.4 `Authenticated` 소비 순서 (버그 방지 — 반드시 옮길 것)

```kotlin
LaunchedEffect(state) {
    val current = state
    if (current is LoginUiState.Authenticated) {
        viewModel.onAuthenticationHandled()   // ① 소비 표시 먼저
        onAuthenticated(current.onboardingRequired)  // ② 그 다음 이동
    }
}
```

순서가 바뀌면: `onAuthenticated`가 화면을 홈으로 바꾸면서 이 효과가 취소되고 상태가 `Authenticated`로 남는다 → **다음 로그아웃 때 로그인 화면이 열리자마자 다시 홈으로 튕긴다.**
`LoginViewModel`이 Activity 스코프라 로그인 화면을 떠나도 살아 있기 때문이다.
→ 웹 대응: 전역 로그인 스토어를 쓴다면 라우팅 전에 상태를 `Idle`로 되돌린다.

### 5.5 로그아웃

`DefaultAuthRepository.logout()` — **결과를 돌려주지 않는다.**

```kotlin
withTimeoutOrNull(SERVER_LOGOUT_TIMEOUT_MS = 10_000) { apiCall(json) { api.logout() } }  // 결과 무시
withTimeoutOrNull(KAKAO_LOGOUT_TIMEOUT_MS =  5_000) { kakaoLoginClient.logout() }        // 카카오 세션
tokenStore.clear()                                   // 반드시 실행
```

셋은 **순차**다(두 `withTimeoutOrNull`이 병렬이 아니다). 최악의 경우 로그아웃은 15초 걸린다. 그동안 `AccountActionState.InProgress`라 로그아웃·탈퇴 버튼이 잠겨 있다.
`kakaoLoginClient.logout()`은 `UserApiClient.instance.logout { ... }` 콜백을 `suspendCancellableCoroutine`으로 감싼 것이고 **성공/실패를 구분하지 않는다**(콜백이 오면 `Unit`).

- 서버 호출이 실패해도 로컬 토큰과 카카오 세션은 **반드시** 지운다. "사용자의 의도는 '이 기기에서 나가겠다'이고, 서버가 거절했다고 기기에 토큰을 남겨두면 의도와 반대가 된다."
- 서버 타임아웃 10초 / 카카오 타임아웃 5초. 시간을 넘기면 서버의 refresh 토큰이 남지만 이 기기에는 사본이 없어 쓸 수 없다.
- **카카오 세션을 끊지 않으면** 로그아웃 뒤 로그인 버튼을 눌렀을 때 계정 선택 없이 이전 계정으로 바로 들어간다. 기기를 나눠 쓰는 상황에서 실제 문제가 된다. 카카오 로그아웃 실패는 알리지 않는다.
- 서버는 **자기 refresh 토큰만 폐기하고 카카오 세션은 건드리지 않는다.**

`SessionViewModel.logout()`은 `AccountActionState.InProgress` → (완료) `Idle` + `SessionUiState.SignedOut`.

### 5.6 회원탈퇴

`DefaultAuthRepository.withdraw()` — **실패를 그대로 알린다.** 로그아웃과 다르다.

```
DELETE api/me
  ├─ Success → tokenStore.clear(); AuthResult.Success(Session(onboardingRequired = false))
  ├─ Rejected → AuthResult.Rejected(code, requestId)   ← 로컬 토큰 안 지움
  └─ NetworkUnavailable → AuthResult.NetworkUnavailable ← 로컬 토큰 안 지움
```

- `DELETE api/me`는 **인증이 필요한 경로**라 일반(인증 붙는) OkHttp 클라이언트로 나간다. 액세스 토큰이 만료돼 401이 오면 `TokenAuthenticator`가 먼저 재발급하고 한 번 더 보낸다(§8). 그래도 401이면 `Rejected(UNAUTHORIZED)` → `WithdrawFailed`다. 로그아웃도 같다.
- 카카오 **연결 끊기(unlink)는 서버가 어드민 키로 대신 부른다.** 앱이 또 부르면 중복 호출이라 로컬 정리만 한다. **앱은 탈퇴 시 카카오 로그아웃도 부르지 않는다** — 로그아웃 경로에만 있다.
- "서버 호출이 실패하면 계정이 남아 있는데 로컬만 지우고 성공한 척하면 사용자는 탈퇴됐다고 믿게 된다."
- `SessionViewModel.withdraw()`: 성공 → `Idle` + `SignedOut`. 실패(거절/오프라인 모두) → `AccountActionState.WithdrawFailed`이고 **세션 상태는 그대로 `SignedIn` 유지**.

관련 문구(`profile/ui/AccountActions.kt` · Figma 1s-1 하단):

| 리소스 | 문자열 |
| --- | --- |
| `account_logout` | `로그아웃` |
| `account_withdraw` | `회원탈퇴` |
| `account_withdraw_confirm_title` | `정말 탈퇴하시겠어요?` |
| `account_withdraw_confirm_message` | `저장된 브리핑 카드와 진료 기록이 모두 삭제되고 되돌릴 수 없어요` |
| `account_withdraw_confirm` | `탈퇴하기` (색 `fgDanger`) |
| `account_cancel` | `취소` |
| `account_withdraw_failed` | `탈퇴하지 못했어요. 계정은 그대로 있어요` |
| `account_confirm` | `확인` |

`WithdrawFailedDialog`는 `MainActivity`가 `Scaffold` 바깥에서 `accountAction == WithdrawFailed`일 때 띄운다.

---

## 6. 스플래시 대기 · 타임아웃 (`SessionViewModel.restore()`)

### 상수

| 상수 | 값 | 이유 (주석 원문 요약) |
| --- | --- | --- |
| `MIN_SPLASH_MILLIS` | `2_000L` | Figma에 값이 없어 정했다. 브랜드 스플래시 통상 범위 1~2초에서 위쪽. 태그라인을 읽는 데만 1초 가까이 걸리고, 읽고 나서도 로고가 남아 있는 편이 진입으로 자연스럽다. 2초를 넘기면 앱이 느리다는 인상이 생긴다 |
| `MAX_SPLASH_MILLIS` | `6_000L` | **응답 시간에 맞춰 정한 값이 아니다.** 실기기에서 `POST /api/auth/refresh`를 재보니 깨어 있는 서버가 9.2초, 잠든 서버는 90초에도 답이 없었다. 답을 덮으려면 스플래시가 10초를 넘어야 해서 택하지 않았다. 6초는 브랜드 화면을 보여줄 수 있는 한계 |

### 알고리즘

```kotlin
val restored = async { authRepository.restoreSession() }   // ① 복구를 먼저 띄운다
delay(MIN_SPLASH_MILLIS)                                    // ② 최소 2초는 무조건 대기

val outcome = withTimeoutOrNull(MAX_SPLASH_MILLIS - MIN_SPLASH_MILLIS) {  // ③ 남은 4초만 더
    RestoreOutcome(restored.await())
}

val next = when {
    outcome == null        -> { restored.cancel(); SessionUiState.RestoreFailed }  // 시간 초과
    outcome.result == null -> SessionUiState.SignedOut          // 저장된 토큰 없음
    else                   -> outcome.result.toSessionState()
}

if (mutableUiState.value == SessionUiState.Checking) {       // ④ 늦게 도착한 결과는 버린다
    mutableUiState.value = next
}
```

핵심 네 가지:

1. **복구와 대기를 동시에 돌린다.** 그래서 걸리는 시간은 둘 중 긴 쪽이다. 순서대로 하면 복구가 느린 날에 스플래시가 2초 더 길어진다. → 웹: `await Promise.all([restore(), sleep(2000)])`이 아니라, restore를 먼저 시작해 두고 `sleep(2000)` 후 남은 4초를 `Promise.race`로 기다린다.
2. **대기를 두는 이유**는 저장된 토큰이 없을 때 복구가 즉시 끝나 스플래시가 한 프레임만 스쳤다 사라지기 때문이다. 화면이 번쩍인 것으로 읽힌다.
3. **기다리기를 그만두면 요청도 끊는다**(`restored.cancel()`). 그대로 두면 응답이 읽기 제한(60초)까지 살아 있어서, 그 사이 사용자가 카카오 로그인을 마치면 재발급 응답이 뒤늦게 도착해 **방금 받은 토큰을 덮는다.** 서버가 refresh 토큰을 회전시키므로 어느 쪽이 살아남는지도 서버 구현에 달렸다. → 웹: `AbortController`로 fetch를 실제로 중단해야 한다.
4. **늦게 도착한 결과는 버린다**(④의 `Checking` 확인). 화면을 보고 있는 사람을 갑자기 다른 곳으로 옮기면 그 사이에 한 일과 부딪힌다.

`RestoreOutcome`이라는 껍데기를 두는 이유: `restoreSession()`은 저장된 토큰이 없으면 `null`을 주고 `withTimeoutOrNull`도 시간이 다 되면 `null`을 준다. 감싸지 않으면 두 `null`이 같은 값이 되는데 **가는 곳이 서로 다르다**(`SignedOut` vs `RestoreFailed`).

### 복구 결과 → 세션 상태 매핑

```kotlin
private fun AuthResult.toSessionState(): SessionUiState = when (this) {
    is AuthResult.Success    -> SessionUiState.SignedIn(session.onboardingRequired)
    AuthResult.NetworkUnavailable -> SessionUiState.RestoreFailed   // 연결 안 된 것을 로그아웃으로 읽지 않는다
    is AuthResult.Rejected   -> SessionUiState.SignedOut            // 서버가 거절했다
}
```

### `restoreSession()`의 토큰 정리 규칙 (`DefaultAuthRepository`)

```kotlin
val refreshToken = tokenStore.readRefreshToken() ?: return null   // 저장된 토큰이 없으면 null
val result = apiCall(json) { api.refresh(RefreshRequest(refreshToken)) }.toAuthResult()
// toAuthResult()가 Success일 때 TokenStore.save(accessToken, refreshToken)까지 한다 —
// 즉 복구에 성공하면 회전된 새 토큰 쌍으로 갈아 끼워진다.

if (result is AuthResult.Rejected && result.code == ApiErrorCode.UNAUTHORIZED) {
    tokenStore.clear()
}
```

- `UNAUTHORIZED`로 거절되면 **회전으로 이미 폐기된 토큰**이라 지운다. 남겨두면 다음 실행에서 같은 실패를 반복한다.
- 네트워크 문제라면 **지우지 않는다.** 토큰은 아직 쓸 수 있고, 지우면 연결이 돌아온 뒤에도 재로그인이다.

### 테스트가 못 박은 동작 (`SessionViewModelTest.kt` 23개 전부)

복구·스플래시 타이밍:

| 시나리오 | 기대 상태 |
| --- | --- |
| 저장된 토큰이 없으면 | `SignedOut` |
| 복구에 성공하면 | `SignedIn(onboardingRequired = false)` |
| 복구가 상한(6초)을 넘기면 | `RestoreFailed` (기다리지 않는다) |
| 상한 전에는 | `Checking` 유지 (스플래시 유지) |
| 최소 노출 시간(2초)이 지나기 전에는 | `Checking` — 복구가 즉시 끝나도 넘어가지 않는다 |
| 상한 안에 늦게 도착한 복구는 | 반영된다 → `SignedIn(onboardingRequired = true)` |
| 상한을 넘긴 뒤 도착한 성공은 | 화면을 흔들지 않는다 → `RestoreFailed` 유지 |
| 복구가 늦게 끝나도 | 그 사이 옮겨간 상태를 덮지 않는다 → `SignedIn` 유지 |
| 토큰이 거절되면 | `SignedOut` |
| 오프라인이면 | `RestoreFailed` |
| 상한을 넘기면 | 진행 중인 복구를 끊는다 (`restoreCallCount = 1`, `restoreCompletedCount = 0`) |
| 온보딩이 필요한 로그인은 | 그 표시를 들고 있다 → `SignedIn(onboardingRequired = true)` |

세션이 화면 밖에서 끝날 때(`observeSession`):

| 시나리오 | 기대 상태 |
| --- | --- |
| 실패 문구를 띄운 뒤 토큰이 지워지면 | 문구를 내린다 → `RestoreFailed` → `SignedOut` |
| `SignedIn` 중에 세션이 비면 | 로그인 화면으로 → `SignedOut` |
| **복구 중(`Checking`)에 세션이 비어 있어도** | 상태를 바꾸지 않는다 → `Checking` 유지 |

로그인·로그아웃·탈퇴·온보딩:

| 시나리오 | 기대 상태 |
| --- | --- |
| 로그인을 마치면(`onSignedIn(true)`) | `SignedIn(onboardingRequired = true)` |
| 로그아웃하면 | `SignedOut` + `AccountActionState.Idle`, `repository.logout()`이 불린다 |
| 탈퇴에 성공하면 | `SignedOut` + `Idle` |
| 탈퇴가 거절되면 | `SignedIn` **유지** + `WithdrawFailed` |
| 오프라인에서 탈퇴하면 | `SignedIn` **유지** + `WithdrawFailed` |
| 탈퇴 실패를 확인하면 | `AccountActionState.Idle`로 돌아간다(세션은 그대로) |
| 온보딩을 마치면 | 로그인 상태는 그대로 두고 표시만 내린다 → `SignedIn(false)` |
| **로그인 상태가 아닐 때** 온보딩 완료를 부르면 | 아무것도 바꾸지 않는다 → `SignedOut` 유지 |

`LoginViewModelTest.kt`가 추가로 못 박은 것: 초기값 `Idle` / 취소는 `Idle` / 카카오 실패는 `Failed(KAKAO)` / 교환에 넘기는 값이 **카카오 액세스 토큰 그대로**인지 / `UNAUTHORIZED` 거절은 `Failed(SERVER)` / `UPSTREAM_TIMEOUT`은 `Failed(NETWORK)` / `onFailureAcknowledged()`는 `Idle` / **소비하지 않으면 `Authenticated`가 그대로 남는다**(웹에서 재현될 버그) / `Idle`에서 `onAuthenticationHandled()`를 불러도 안 바뀐다.

### 세션이 화면 밖에서 끝날 때 (`observeSession()`)

```kotlin
authRepository.hasSession.collect { hasSession ->
    if (hasSession) return@collect
    val current = mutableUiState.value
    if (current is SessionUiState.SignedIn || current == SessionUiState.RestoreFailed) {
        mutableUiState.value = SessionUiState.SignedOut
    }
}
```

- 토큰 재발급이 거절되면 `DefaultTokenRefresher`가 `TokenStore`를 지운다. 그 자리는 **OkHttp 스레드**라 화면을 옮길 수 없어서, **저장소가 비는 것을 신호로 삼는다.**
- `RestoreFailed`도 함께 본다: 토큰이 남아 있다고 보고 안내 문구를 띄우는 상태인데 저장소가 비었다면 전제가 깨진 것이다. 문구를 내리고 평범한 로그인 화면으로 돌린다.
- **`Checking` 중에는 움직이지 않는다.** 저장된 토큰이 없는 것이 정상인 시점이라 여기서 옮기면 복구 결과보다 먼저 화면을 정해버린다.

`TokenStore.hasSession()`은 **refresh 토큰을 기준**으로 본다(`distinctUntilChanged()`). 액세스 토큰은 만료돼도 재발급으로 이어갈 수 있어 세션이 끝난 것이 아니다.
→ 웹 대응: 토큰 저장소를 옵저버블(Zustand/Signal 등)로 만들고 같은 3분기 규칙을 그대로 옮긴다.

---

## 7. 토큰 저장 (`TokenStore`)

DataStore Preferences, 파일 이름 `"auth"`. 키는 `access_token`, `refresh_token`.

| 메서드 | 동작 |
| --- | --- |
| `hasSession(): Flow<Boolean>` | `data.map { it[refresh_token].isNullOrBlank().not() }` + `distinctUntilChanged()`. **공백 문자열도 없는 것으로 친다** |
| `readRefreshToken(): String?` | `data.first()[refresh_token]` — 현재 값 하나 |
| `accessToken(): String?` | `data.first()[access_token]`. `AccessTokenProvider` 구현이고 `AuthInterceptor`·`TokenAuthenticator`가 부른다 |
| `save(accessToken, refreshToken)` | **`edit {}` 한 번에 두 키를 함께 쓴다**(원자적). 반쪽만 갱신되는 상태가 없다 |
| `clear()` | `edit { it.clear() }` — `"auth"` DataStore 전체 삭제 |

`TokenStore`는 `@Singleton`이고 `AuthRepositoryModule`이 `AccessTokenProvider`로도 바인딩한다. `core/network`는 `auth`를 직접 참조하지 않고 이 인터페이스만 본다.

- **카카오 토큰은 여기 넣지 않는다.** SDK가 자체 저장소에 갖고 있고 서버도 저장하지 않기로 했다. "같은 자격증명을 세 곳에 두면 처리 범위만 늘어난다."
- 평문 DataStore다. 매니페스트에서 백업(`allowBackup="false"`)과 기기 간 전송을 막았다. 루팅 기기까지 막으려면 AndroidKeyStore 암호화가 필요한데 지금은 재로그인 한 번 비용이라 미뤘다.
- → 웹 포팅 판단: `localStorage`는 XSS에 노출된다. 데모라면 **메모리 + `sessionStorage`**, 실서비스라면 refresh 토큰은 `HttpOnly` 쿠키로 옮기는 것이 맞다.

---

## 8. 토큰 재발급 흐름 (401 → 재발급 → 재전송)

### 8.1 요청에 헤더 붙이기 — `AuthInterceptor`

```kotlin
val accessToken = runBlocking { accessTokenProvider.accessToken() }
if (accessToken.isNullOrBlank()) chain.request()
else chain.request().newBuilder().header("Authorization", "Bearer $accessToken").build()
```

토큰이 없으면 **헤더 없이 그대로 보낸다**(로그인·재발급은 인증이 필요 없다).

### 8.2 401 처리 — `TokenAuthenticator`

OkHttp가 401 응답을 받으면 이것을 부르고, 여기서 돌려준 요청으로 다시 보낸다. `null`이면 포기하고 401이 호출자에게 그대로 간다.

```
authenticate(route, response)
 ├─ failedHeader = response.refreshableHeader()   // 두 가드를 한 식으로 합쳤다
 │    = response.request.header("Authorization")?.takeIf { retryCount() < MAX_RETRY(1) }
 │    ├─ 헤더가 없으면 → null (대상 아님)
 │    │     "토큰 없이 보낸 요청은 대상이 아니다. 로그인처럼 인증이 필요 없는 경로가 401을
 │    │      주면 자격증명 문제가 아니라 서버의 거절이다."
 │    └─ retryCount() >= 1 이면 → null
 │          "이미 다시 보낸 요청이 또 401이면 재발급으로 풀릴 문제가 아니다.
 │           멈추지 않으면 OkHttp가 자체 상한까지 같은 왕복을 반복한다."
 └─ runBlocking { mutex.withLock {           // Authenticator가 블로킹 API라 runBlocking
        token = validTokenOrRefresh(failedHeader)
          ├─ stored = accessTokenProvider.accessToken()
          ├─ if (stored 가 null/공백이 아니고 "Bearer $stored" != failedHeader) → stored
          │     // 잠금을 기다리는 동안 남이 이미 갱신했다
          └─ else → tokenRefresher.refresh()?.takeIf { it.isNotBlank() }
                    // 빈 문자열을 받으면 없는 것으로 친다
        token == null → null (포기, 401이 호출자에게 그대로 간다)
        token != null → response.request 를 그대로 두고 Authorization 헤더만
                        "Bearer $token" 으로 갈아끼운 새 요청을 돌려준다
    } }
```

`runBlocking`은 OkHttp 자체 스레드에서 돌기 때문에 메인 스레드를 막지 않는다(`AuthInterceptor`도 같은 사정). 웹에는 이 제약 자체가 없다.

**재발급은 한 번만 돈다.** 화면 하나가 여러 API를 동시에 부르면 401도 동시에 온다. 그때 각자 재발급하면 서버가 refresh 토큰을 회전시키므로 뒤에 도착한 요청이 이미 폐기된 토큰을 들고 가서 실패한다. `Mutex`로 하나만 통과시키고, 잠금을 얻은 뒤 저장된 토큰을 다시 읽어 이미 갈렸으면 그것으로 보낸다.
`retryCount()`는 `response.priorResponse` 체인을 거슬러 세는 방식이다.

### 8.3 실제 재발급 — `DefaultTokenRefresher`

```kotlin
val refreshToken = tokenStore.readRefreshToken() ?: return null

when (apiCall(json) { api.refresh(RefreshRequest(refreshToken)) }) {
    is Success -> { tokenStore.save(value.accessToken, value.refreshToken); value.accessToken }
    is Rejected -> { if (code == UNAUTHORIZED) tokenStore.clear(); null }
    is NetworkUnavailable -> null   // 토큰 안 지움
}
```

- **`@AuthFree` API를 쓴다.** 같은 Retrofit을 쓰면 이 호출이 `TokenAuthenticator`를 타고 그 401이 다시 재발급을 부른다(무한 루프). 조립 순서도 이 경로가 있어야 풀린다 — `OkHttpClient`가 `TokenAuthenticator`를 받고 그것이 재발급 API를 받는데, 그 API를 같은 `Retrofit`에서 만들면 순환이 된다.
- `@AuthFree` OkHttp 클라이언트에는 **인터셉터도 Authenticator도 없다.**
- 서버가 `UNAUTHORIZED`로 거절하면 저장된 토큰을 지운다. 네트워크 문제라면 지우지 않는다(`restoreSession`과 같은 판단).
- 토큰을 지우면 `TokenStore.hasSession`이 `false`를 흘리고 `SessionViewModel.observeSession()`이 그것을 보고 로그인 화면으로 보낸다. "재발급이 실패한 자리에서 화면을 옮길 방법이 없어서 그렇게 뒀다. 여기는 OkHttp 스레드이고 어느 화면이 떠 있는지 모른다."

### 8.4 웹 대응 요약

```
fetch wrapper
 ├─ 요청 전: 메모리의 accessToken이 있으면 Authorization 헤더 부착
 ├─ 401 && 요청에 Authorization 헤더가 있었음 && 아직 재시도 안 함
 │    └─ 전역 단일 refresh Promise (동시 401을 하나로 합침 = mutex 대체)
 │         ├─ 성공 → 새 토큰 저장 → 원 요청 1회 재전송
 │         └─ 401 → 토큰 전체 삭제 → 세션 스토어가 SignedOut 방출 → 로그인 화면
 │         └─ 네트워크 오류 → 토큰 유지, 그냥 실패시킴
 └─ 그 외 401 → 그대로 호출자에게
```

---

## 9. 네비게이션

### 9.1 그래프 조립 (`navigation/MedicalMateNavHost.kt`, `MedicalMateNavGraphs.kt`)

- **세션 확인이 끝나기 전에는 그래프를 세우지 않는다.** `NavHost`의 `startDestination`은 첫 조합에서만 읽히므로, 복구 중에 그래프를 세우면 시작 목적지를 로그인으로 잡아놓고 복구 성공 후 홈으로 옮기게 되어 **자동 로그인에서 로그인 화면이 한 번 스쳐 보인다.**
- 그래프를 로그인/본문으로 **쪼개지 않는다.** 세션 상태로 `NavHost` 자체를 갈아치우면 목적지별 `ViewModelStore`가 정리되지 않고 쌓인다. 경계 이동은 `resetTo()`의 `popUpTo(graph.id) { inclusive = true }`로 처리한다.

### 9.2 시작 목적지 결정

```kotlin
private fun SessionUiState.destination(onboardingCompleted: Boolean): Any = when (this) {
    Checking, RestoreFailed, SignedOut -> LoginDestination
    is SignedIn ->
        if (onboardingRequired && !onboardingCompleted) OnboardingIntroDestination
        else HomeDestination
}
```

> **주의: 소스 주석이 사실과 다르다.** `MedicalMateNavHost.kt`의 KDoc은 "`Checking`과 `RestoreFailed`는 `MainActivity`가 스플래시로 잡아서 여기까지 오지 않는다"고 적었지만, `MainActivity`의 실제 조건은 `session == SessionUiState.Checking || onboardingCompleted == null` 하나뿐이다. **`RestoreFailed`는 스플래시에 걸리지 않고 그대로 여기로 와서 `LoginDestination`이 된다.** 오히려 그래야 `login_restore_failed` 문구가 나온다 — 스플래시가 잡아버리면 §9.3·§9.5의 분기가 성립하지 않는다. 주석 쪽이 낡았다.

실제로 여기까지 오지 않는 것은 `Checking` 하나다. 그래도 `when`에 넣어 둔 것은 분기를 하나 더 만들지 않으려는 것이고, 그래도 온다면 **인증이 필요한 화면을 열지 않는 쪽이 안전하다.**

### 9.3 스플래시(1a-1)에서 나가는 경로

| 트리거 | 조건 | 가는 곳 |
| --- | --- | --- |
| 복구 완료 | `SignedIn(onboardingRequired = true)` && 기기 온보딩 기록 없음 | 온보딩 인트로 `OnboardingIntroDestination` (1a-2) |
| 복구 완료 | `SignedIn`이고 위 조건이 아님 | 홈 `HomeDestination` |
| 복구 완료 | `SignedOut` (저장된 토큰 없음 / 서버가 거절) | 로그인 `LoginDestination`, **문구 없음** |
| 6초 타임아웃 또는 오프라인 | `RestoreFailed` | 로그인 `LoginDestination`, **`login_restore_failed` 문구** |

스플래시에는 사용자가 누를 것이 **하나도 없다.** 자동 전이뿐이다.

### 9.4 로그인(1o)에서 나가는 경로

| 트리거 | 가는 곳 | 방식 |
| --- | --- | --- |
| `LoginUiState.Authenticated` 발생 (카카오 버튼 → 서버 교환 성공) | `onAuthenticated(onboardingRequired)` → `SessionViewModel.onSignedIn()` → `SessionUiState.SignedIn` | `SessionBoundarySync`가 `resetTo(destination)` — 백스택 전부 비움 |
| └ `onboardingRequired = true` && 온보딩 기록 없음 | 온보딩 인트로 (1a-2) | 위와 동일 |
| └ 그 외 | 홈 | 위와 동일 |
| 시스템 뒤로가기 | **나갈 곳 없음**(백스택이 비어 있어 앱 종료) | — |

로그인 화면에는 그 밖의 링크·버튼이 없다. 약관/개인정보 링크도 없다(`login_disclaimer`는 순수 텍스트).

### 9.5 로그인 화면으로 **들어오는** 경로

| 출처 | 결과 상태 | 로그인 화면 문구 |
| --- | --- | --- |
| 앱 최초 실행, 저장된 토큰 없음 | `SignedOut` | 없음 |
| 자동 로그인 시도 → 서버가 `UNAUTHORIZED`로 거절 | `SignedOut` | 없음 |
| 자동 로그인 시도 → 6초 초과 | `RestoreFailed` | `자동 로그인을 확인하지 못했어요. 다시 로그인해주세요` |
| 자동 로그인 시도 → 오프라인(`NetworkUnavailable`) | `RestoreFailed` | 위와 같음 |
| 사용자가 로그아웃 | `SignedOut` | 없음 |
| 탈퇴 성공 | `SignedOut` | 없음 |
| 앱 사용 중 재발급 거절 → `TokenStore` 비워짐 | `SignedOut` (`observeSession`) | 없음 |
| `RestoreFailed` 상태에서 토큰이 지워짐 | `SignedOut`으로 내려감 | **문구가 사라진다** |

`restoreFailed`는 **라우트 인자가 아니다.** 목적지의 정체성이 아니라 세션 상태이기 때문이다. "인자로 두면 같은 화면이 값이 다른 두 목적지가 되고, 로그아웃으로 들어올 때와 복구 실패로 들어올 때 백스택이 갈린다."

값이 만들어지는 자리는 `navigation/MedicalMateNavGraphs.kt`의 `entryDestinations()`다:

```kotlin
loginDestination(
    restoreFailed = session == SessionUiState.RestoreFailed,
    onAuthenticated = onAuthenticated,
)
```

즉 `NavHost`가 그래프를 만들 때 세션 상태에서 계산해 `LoginRoute(restoreFailed = ...)`로 내려간다. `entryDestinations`가 `session`을 받는 유일한 이유가 이것이다(소스 주석: "`session`을 받는 곳은 로그인 화면 하나다").
→ 웹 대응: `/login?restoreFailed=1` 같은 쿼리로 두지 말고 **전역 세션 상태를 구독해서 파생**시킨다. 그래야 위 표 마지막 줄(토큰이 지워져 `RestoreFailed` → `SignedOut`이 되면 문구가 사라진다)이 다시 렌더로 이어진다.

### 9.6 세션 경계 동기화 (`SessionBoundarySync`)

```kotlin
snapshotFlow { currentSession is SessionUiState.SignedIn }
    .drop(1)                      // 최초 값은 startDestination이 이미 반영
    .collect { navController.resetTo(currentSession.destination(currentOnboardingCompleted)) }
```

- **로그인 여부만 관찰한다.** 목적지 전체를 관찰하면 온보딩을 마치는 순간에도 이동이 한 번 더 나가서, 그래프가 처리한 등록 완료 토스트를 뒤늦은 재설정이 덮어써 토스트가 사라진다.
- `resetTo()`는 `popUpTo(graph.id) { inclusive = true }` + `launchSingleTop = true`. **로그인·로그아웃은 되돌아갈 수 없어야 한다.** 뒤로 가기로 로그아웃 전 화면이 나오면 인증이 끝난 화면을 인증 없이 보게 된다.
  → 웹 대응: `router.push`가 아니라 `router.replace` + 히스토리 정리.

### 9.7 화면 전환 애니메이션 (`MedicalMateNavTransitions.kt`)

| 항목 | 값 |
| --- | --- |
| 지속 시간 | `320ms` (navigation-compose 기본 700은 길다) |
| Easing | `FastOutSlowInEasing` — CSS `cubic-bezier(0.4, 0.0, 0.2, 1)` |
| enter | 오른쪽에서 슬라이드 인(`+100%`) + 페이드 인 |
| exit | 왼쪽으로 `-1/4` 만큼만 이동 + 페이드 아웃 (패럴랙스 4) |
| popEnter | 왼쪽에서 `-1/4` 지점에서 들어옴 + 페이드 인 |
| popExit | 오른쪽으로 `+100%` + 페이드 아웃 |
| 탭 간 이동 | **전환 없음**(`EnterTransition.None`) — 세 탭은 형제이고 백스택에 쌓이지 않는다 |
| 가장자리 스와이프(predictive back) | popEnter/popExit과 **똑같은 전환**을 쓴다. "돌아가는 길이 하나여야 한다." 기본값의 축소 효과는 걷어냈다 |

디자인 문서에 화면 전환 규격이 없다. 시간과 easing은 Material의 표준 값이다.
→ 웹 포팅: 스플래시→로그인, 로그인→홈은 `resetTo`(백스택 비움)라 위 전환이 그대로 적용된다. 가장자리 스와이프는 웹에서 재현하지 말고 브라우저 뒤로가기로 대체한다.

---

## 10. `MainActivity` 조립 순서 (웹의 App 루트에 해당)

`MainActivity.onCreate()`는 `enableEdgeToEdge()` → `setContent { MedicalMateTheme { MedicalMateApp() } }` 가 전부다. 테마가 **가장 바깥**이라 스플래시도 테마 안에서 그려진다.

```kotlin
val session by sessionViewModel.uiState            // SessionUiState
val accountAction by sessionViewModel.accountAction // AccountActionState
val onboardingCompleted by onboardingGateViewModel.completed  // Boolean?

if (session == Checking || onboardingCompleted == null) {
    SplashScreen(fillMaxSize)
    return
}

Scaffold(contentWindowInsets = WindowInsets.safeDrawing) { innerPadding ->
    MedicalMateNavHost(
        session, onboardingCompleted == true,
        onAuthenticated = sessionViewModel::onSignedIn,
        onOnboardingCompleted = { sessionViewModel.onOnboardingCompleted(); onboardingGateViewModel.markCompleted() },
        accountActions = AccountActionCallbacks(
            enabled = accountAction != InProgress,
            onLogoutClick = sessionViewModel::logout,
            onWithdrawClick = sessionViewModel::withdraw,
        ),
        modifier = Modifier.padding(innerPadding),
    )
}

if (accountAction == WithdrawFailed) {
    WithdrawFailedDialog(onDismiss = sessionViewModel::onAccountActionFailureAcknowledged)
}
```

- **스플래시 조건은 `session == Checking || onboardingCompleted == null` 둘뿐이다.** `RestoreFailed`는 여기 걸리지 않는다(§9.2 참고).

- `onboardingCompleted`가 `null`인 동안에도 **스플래시를 유지한다.** 기본값을 정해 두고 시작하면 이미 마친 사람에게 온보딩이 한 프레임 스친다.
- **스플래시는 `Scaffold` 밖에서 그린다.** 브랜드 면이 화면 끝까지 닿아야 하는데 `innerPadding`을 받으면 상태바 자리에 흰 띠가 남는다. 나머지 화면은 시스템 바를 피해야 해서 `Scaffold`를 유지한다.
  → 웹: 스플래시는 `100dvh` 풀블리드, 나머지는 `env(safe-area-inset-*)` 패딩 컨테이너.
- `SessionViewModel`과 `OnboardingGateViewModel`만 **Activity 스코프**(= 웹의 전역 스토어). 화면 ViewModel은 목적지 스코프(= 라우트 언마운트 시 폐기).
- 인셋을 한 곳에서 합친다. `safeDrawing`이 시스템 바 + 키보드 + 컷아웃의 합집합이다. 화면마다 `imePadding`과 safe-area를 각각 두면 키보드 위에 여백이 두 겹으로 남는다.
- `windowSoftInputMode="adjustResize"`.

### 온보딩 게이트 (`OnboardingStore`) — `onboardingRequired`를 그대로 믿으면 안 되는 이유

기기 DataStore(`"profile"`, 키 `onboarding_completed`)에 마쳤다는 기록을 남기고 **서버 값과 함께 본다. 둘 중 하나라도 마쳤다고 하면 다시 보여주지 않는다.**

1. `refresh` 응답이 `onboardingRequired`를 **항상 `false`**로 준다 → 자동 로그인으로 들어오면 온보딩이 필요한 사람도 필요 없다고 나온다.
2. 반대 방향: 프로필을 서버에 저장하기 전까지 로그인 응답은 계속 `true`라서, 온보딩을 마치고 로그아웃했다 들어오면 또 나온다.

`PUT /api/me/health-profile`을 연결하면 서버의 `onboardingCompleted`가 정본이 되고 이 기록은 빠른 길로만 남는다.
로그아웃과 탈퇴에서 **지우지 않는다.** 지우면 같은 사람이 다시 들어올 때 또 나온다. 탈퇴 후 재가입한 경우에는 온보딩이 건너뛰어지는데, 서버 값이 정본이 되면 사라지는 문제라 그대로 뒀다.

---

## 11. 디자인 토큰 (이 도메인에서 쓰는 것만)

| 토큰 | 값 |
| --- | --- |
| `colors.bgPrimary` | `#5566D2` (Primary500) — 스플래시 배경, `windowBackground` |
| `colors.fgOnPrimary` | `#FFFFFF` (Neutral0) — 스플래시 로고·태그라인 |
| `colors.fgDefault` | `#131722` (Neutral900) — 로그인 제목 |
| `colors.fgSubtle` | `#585F73` (Neutral600) — 로그인 설명, 하단 고지 |
| `colors.fgDanger` | `#C4302B` (Red700) — 로그인 실패/복구 실패 문구, 탈퇴 확인 버튼 |
| `KakaoContainer` | `#FEE500` |
| `KakaoLabel` | `#191600` |
| `KakaoSymbol` | `#000000` |
| `typography.headingL` | Pretendard Bold, 24 / 34, letterSpacing **-2%**(`-0.02em`) |
| `typography.bodyM` | Pretendard Normal, 15 / 24, letterSpacing 0, `LineBreak.Paragraph` |
| `typography.bodyS` | Pretendard Normal, 13 / 20, letterSpacing 0, `LineBreak.Paragraph` |
| `typography.labelL` | Pretendard SemiBold, 15 / 20, letterSpacing 0 |
| 워드마크(스플래시 전용) | Pretendard Bold, 30.8px / 39.2px, letterSpacing **-3%** |
| `MedicalMateSize.gutter` | 20dp |
| `MedicalMateSize.safeBottom` | 24dp (Figma 컴포넌트 내부 시각 여백 — 기기 inset과 **중복 적용 금지**) |
| `MedicalMateSize.controlLg` | 56dp (소셜 버튼 높이) |
| `MedicalMateSize.iconMd` | 20dp (버튼 안 스피너) |
| `MedicalMateSize.touchMin` | 48dp (접근성 최소 터치 영역) |
| `MedicalMateSize.screenWidth` / `contentWidth` | 360 / 320dp — **레이아웃을 이 값으로 고정하지 않는다** |
| `MedicalMateRadius.md` | 16dp |
| `MedicalMateSpace` | s2·s4·s6·s8·s10·s12·s14·s16·s20·s24·s32·s40 (임의 간격값 금지) |

폰트: Pretendard (Regular/Medium/SemiBold/Bold 4종).
`lineHeightStyle = Trim.None` + 글자 세로 가운데 정렬 + `includeFontPadding = false` — Figma의 행간을 그대로 재현하려는 설정이다. 웹에서는 기본 동작이 이와 가까우므로 `line-height`를 px로 그대로 넣으면 된다.

---

## 12. 웹 포팅 시 위험 지점

1. **카카오 네이티브 SDK 전체가 대체 불가.** `isKakaoTalkLoginAvailable` → 카카오톡 앱 → 실패 시 카카오계정 폴백, `kakao{앱키}://oauth` 딥링크 복귀. 웹에는 대응물이 없다. 데모에서는 버튼 클릭 → 400~800ms 가짜 `InProgress` → `ExchangingToken` → 성공/취소/실패를 골라 흉내 내는 편이 낫다. **취소를 실패와 구분하는 규칙(문구 없이 `Idle` 복귀)은 반드시 남길 것.**
2. **`restored.cancel()` = `AbortController`.** 6초 초과 시 재발급 요청을 실제로 끊지 않으면, 뒤늦은 응답이 방금 로그인으로 받은 토큰을 덮는다. 원본이 명시적으로 경고한 버그다.
3. **`onAuthenticationHandled()` 순서.** 이동 전에 상태를 소비하지 않으면 로그아웃 후 로그인 화면이 즉시 홈으로 튕긴다. 전역 스토어를 쓰는 웹에서 더 쉽게 재현되는 버그다.
4. **동시 401의 단일 재발급.** `Mutex` 대신 모듈 레벨 단일 Promise로 합쳐야 한다. 각자 재발급하면 서버의 refresh 회전 때문에 뒤에 온 요청이 폐기된 토큰을 쓴다.
5. **`onboardingRequired`는 refresh 응답에서 항상 `false`.** 이 한 가지 때문에 기기 측 `onboardingCompleted` 기록이 존재한다. 웹도 같은 2중 판단이 필요하다(또는 프로필 조회로 대체).
6. **6초 타임아웃과 60초 read 타임아웃의 차이.** Render 무료 티어가 잠들면 `POST /api/auth/refresh`가 90초에도 답이 없다(실측: 깨어 있으면 9.2초). 데모 백엔드가 없다면 이 지연을 흉내 내는 토글을 두면 화면 분기를 다 볼 수 있다.
7. **안내 문구가 한 자리를 공유한다.** 자리를 미리 비워 두면 Figma 레이아웃(Actions 320x116)이 깨진다. 조건부 렌더 + `gap: 20px`로 간격을 관리할 것.
8. **`Spacer(weight 1f)` 두 개 = `flex: 1` 두 개.** 고정 244px로 옮기면 작은 화면에서 하단이 잘린다.
9. **`safeBottom` 24dp는 Figma 내부 여백**이지 기기 inset이 아니다. `env(safe-area-inset-bottom)`과 **더하지 말 것**.
10. **카카오 브랜드 색과 심볼은 변경 금지.** 다크 모드에 따라 바뀌면 가이드 위반. 앱에 다크 모드가 아예 없으므로 웹도 라이트 단일 테마로 가는 것이 안전하다.
11. **워드마크 자간 -3% / 제목 자간 -2%**를 빠뜨리면 한글 로고의 무게중심이 오른쪽으로 쏠린다.
12. **로그아웃은 결과를 보지 않는다.** 웹에서도 서버 호출 실패와 무관하게 로컬 토큰을 지우고 로그인 화면으로 보내야 한다. 반대로 **탈퇴는 실패를 그대로 알려야** 한다(계정이 남아 있으므로).
13. **실패 문구에 닫기가 없다.** `onFailureAcknowledged()`가 호출되지 않아 문구는 다음 로그인 시도 전까지 남는다(§2). 웹에서 습관적으로 토스트/자동 소멸을 붙이면 원본과 달라진다.
14. **`restoreFailed`는 세션 상태에서 매번 파생돼야 한다.** 안드로이드는 그래프를 만들 때 `session == RestoreFailed`로 계산한다(§9.5). 웹에서 마운트 시점에 한 번만 읽어 로컬 state에 복사해 두면, 토큰이 지워져 `SignedOut`으로 내려갈 때 문구가 남는다.
15. **`InProgress`와 `ExchangingToken`의 취소 범위가 다르다**(§2). 화면을 떠나면 카카오 단계는 끊기고 서버 교환은 계속된다. 웹에서 둘을 같은 `AbortController`로 묶으면 원본과 달라진다.
16. **로그아웃이 순차라 최악 15초**(서버 10 + 카카오 5). 웹에서 이 둘을 병렬로 바꾸면 체감이 달라지므로 의도한 변경인지 정할 것(§5.5).

---

## 13. 열린 질문

1. `SplashScreen.kt` KDoc이 "인위적인 지연을 넣지 않았다(#63)"고 하는데 `SessionViewModel`에는 `MIN_SPLASH_MILLIS = 2_000L`이 있다. 주석이 낡은 것으로 보이나, 웹에서 2초 대기를 그대로 둘지 확인 필요.
2. `login_disclaimer`가 약관·개인정보 동의 안내를 대체했다(#55, 법무 판단 대기). 웹앱에서 동의 절차가 필요한지 결정 필요.
3. `TokenResponse.accessExpiresInSeconds`를 앱이 전혀 쓰지 않는다. 웹에서 선제적 갱신에 쓸지, 안드로이드처럼 401 기반으로만 갈지.
4. 회원탈퇴는 Figma 1s-1 시안에 없다(#85에서 자리 미정). 웹앱에 포함할지.
5. `POST /api/auth/logout`과 `DELETE /api/me`의 성공 응답 본문 형태가 소스에 없다(`suspend fun`의 반환 타입이 `Unit`). 실제 상태 코드 확인 필요.
6. 데모용 대체 로그인이 어떤 화면 분기까지 노출해야 하는지(취소/카카오 실패/네트워크 실패/서버 실패/복구 실패 5가지를 다 보여줄 수단이 필요한지).
7. `LoginViewModel.onFailureAcknowledged()`에 호출부가 없다(§2). 실패 문구를 사용자가 닫을 수 있어야 하는지, 아니면 다음 시도까지 그대로 두는 지금 동작이 의도인지.
8. `AuthRepository.clearSession()`에 호출부가 없다(§3.5). 웹으로 옮길 때 빼도 되는지 — 아니면 안드로이드 쪽에 붙일 자리(예: 토큰 손상 감지)가 남아 있는지.
9. `MedicalMateNavHost.kt` KDoc이 "`RestoreFailed`는 스플래시가 잡는다"고 적었지만 실제 `MainActivity`는 `Checking`만 잡는다(§9.2). 주석을 고칠지, 아니면 `RestoreFailed`도 스플래시로 잡는 것이 원래 의도였는지 — **후자라면 `login_restore_failed` 문구는 영영 보이지 않게 된다.**
10. `LoginRoute`가 `KakaoLoginClient`를 주입받지 않고 따로 만들어 앱에 인스턴스가 둘이다(§5.3). 지금은 무상태라 문제가 없지만 웹에서는 하나로 합칠지.
