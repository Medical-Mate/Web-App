# 서버 API 계약 전체 · DTO

> 근거 파일 (모두 실제로 열어서 옮겨 적음)
>
> - `C:/Claude/MedicalMate/app/build.gradle.kts` (BACKEND_BASE_URL)
> - `C:/Claude/MedicalMate/app/src/main/java/com/mist/medicalmate/core/network/` 전체 9개 파일
>   (`AccessTokenProvider.kt` · `ApiCall.kt` · `ApiError.kt` · `ApiResult.kt` · `AuthFree.kt` ·
>   `AuthInterceptor.kt` · `NetworkModule.kt` · `TokenAuthenticator.kt` · `TokenRefresher.kt`)
> - `auth/data/AuthApi.kt` · `AuthRepository.kt` · `TokenStore.kt` · `DefaultTokenRefresher.kt` · `AuthModule.kt`
> - `home/data/HomeApi.kt` · `HomeRepository.kt`
> - `intake/data/SessionApi.kt` · `SessionRepository.kt`
> - `card/data/CardApi.kt` · `CardRepository.kt` · `CardMapping.kt` · `CardHealth.kt`
> - `visit/data/VisitApi.kt` · `VisitRepository.kt` · `VisitMapping.kt` · `HospitalApi.kt` · `HospitalRepository.kt`
> - `calendar/data/AppointmentApi.kt` · `AppointmentRepository.kt` · `FollowUpAppointmentScheduler.kt`
> - `profile/data/HealthProfileApi.kt` · `HealthProfileRepository.kt` · `SettingsApi.kt` · `SettingsRepository.kt`
> - `core/model/CurrentUserProvider.kt` · `core/model/FollowUpScheduler.kt`
> - `app/src/main/res/values/strings.xml` (화면에 뜨는 에러 문구 원문)
> - `app/src/test/java/com/mist/medicalmate/core/network/TokenAuthenticatorTest.kt`

---

## 웹앱 구현 메모

- 이 문서는 화면이 아니라 **네트워크 계층 전체**다. 웹앱에서는 `src/lib/api/` 한 폴더로 옮기고, 화면은 이 폴더만 부르게 한다 — 안드로이드도 응답 DTO를 화면 타입으로 옮기는 자리(`CardMapping.kt` · `VisitMapping.kt`)를 한 파일에 몰아 두고 서버 계약이 바뀔 때 그 파일만 고쳤다.
- **`Authorization: Bearer` + refresh 회전을 그대로 옮기면 웹에서는 XSS로 토큰이 샌다.** 안드로이드는 평문 DataStore에 두지만 웹은 `localStorage`를 피하고 httpOnly 쿠키 또는 메모리+silent refresh로 바꿔야 한다(리스크 항목 참고). 401 → refresh → 원요청 1회 재시도 + **동시 401을 뮤텍스로 한 번만 재발급**하는 규칙은 반드시 옮긴다.
- 실패를 예외가 아니라 값(`ApiResult`)으로 다루는 구조를 유지한다. TS의 discriminated union으로 그대로 표현되고, `switch`가 빠진 갈래를 컴파일 시점에 잡아 준다.
- 서버 base URL이 앱과 다른 오리진이라 웹은 **CORS·프리플라이트가 새로 생긴다.** 개발은 Vite proxy, 배포는 같은 도메인 뒤로 리버스 프록시를 두는 편이 토큰 쿠키 전략과도 맞는다.
- 응답 본문에 증상·복용약·알레르기가 실린다. 안드로이드는 로그 레벨을 `BASIC`으로 막고 릴리즈에서 껐다 — 웹도 **응답 본문을 콘솔·Sentry에 찍지 않는다.**

---

## 1. 베이스 URL과 공통 규약

### 1.1 베이스 URL

`app/build.gradle.kts`

```kotlin
.getOrElse("https://d3f36x6ccm838d.cloudfront.net/")
...
buildConfigField("String", "BACKEND_BASE_URL", "\"$backendBaseUrl\"")
```

| 항목 | 값 |
| --- | --- |
| 기본 base URL | `https://d3f36x6ccm838d.cloudfront.net/` |
| 덮어쓰기 ① | 루트 `local.properties`의 `BACKEND_BASE_URL=` 줄 |
| 덮어쓰기 ② | 환경변수 `BACKEND_BASE_URL` |
| OpenAPI 문서 | `https://jinryomate-backend.onrender.com/v3/api-docs` (`AuthApi.kt` 주석) |
| 경로 결합 | Retrofit `baseUrl` + 상대경로. 모든 `@GET`/`@POST` 경로가 **슬래시 없이 `api/...`로 시작**한다 |

웹앱 환산: `BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL ?? 'https://d3f36x6ccm838d.cloudfront.net/'`, 요청 경로는 `new URL('api/me/home', BASE_URL)`.

### 1.2 직렬화 설정 (`NetworkModule.provideJson`)

```kotlin
Json {
    // 서버가 필드를 추가해도 앱이 깨지지 않게 한다.
    ignoreUnknownKeys = true
    explicitNulls = false
}
```

| 설정 | 뜻 | 웹앱에서 의미 |
| --- | --- | --- |
| `ignoreUnknownKeys = true` | 모르는 필드는 버린다 | zod를 쓴다면 `.passthrough()` 또는 non-strict. strict로 두면 서버가 필드를 늘릴 때 앱이 깨진다 |
| `explicitNulls = false` | **`null`인 필드는 직렬화에서 빠진다** | `JSON.stringify`가 `undefined`를 빼는 것과 같다. 요청 DTO를 만들 때 `null` 대신 키를 아예 빼라 |
| `encodeDefaults`(기본 false) | **기본값과 같은 필드도 빠진다** | `axes: []`, `done: false` 같은 값은 요청에 실리지 않는다 |

이 두 가지가 PATCH 계약의 핵심이다. `UpdateCardRequest` · `UpdateAppointmentRequest`는 **보낸 필드만 바뀌고**, `null`은 "안 바꿈"이다.

### 1.3 HTTP 클라이언트 설정 (`NetworkModule`)

| 항목 | 값 | 이유(주석 그대로) |
| --- | --- | --- |
| `connectTimeout` | 10초 | "연결은 되거나 안 되거나이고 오래 걸릴 이유가 없다" |
| `readTimeout` | 60초 | "Render 무료 티어는 인스턴스가 잠들어 첫 요청의 **응답**이 수십 초 걸린다" |
| 로깅 | 디버그 `BASIC` / 릴리즈 `NONE` | "본문을 절대 찍지 않는다. 증상·복용약·기저질환·알레르기가 요청 본문에 실리고" |
| Content-Type | `application/json` | `json.asConverterFactory("application/json".toMediaType())` |

**웹앱 주의**: 첫 요청이 60초까지 걸릴 수 있다는 전제가 그대로 살아 있다. `fetch` 타임아웃을 30초로 잡으면 잠든 서버를 깨우는 첫 호출이 항상 실패한다. 로딩 스피너도 60초를 버티는 문구가 필요하다.

### 1.4 클라이언트가 두 벌이다 (`AuthFree`)

`AuthFree.kt` 주석:

> 토큰 재발급이 이것을 쓴다. 재발급 호출이 `AuthInterceptor`와 `TokenAuthenticator`를 타면 두 가지가 어긋난다. 만료된 토큰을 헤더로 달고 나가고, 그 호출이 401을 받으면 다시 재발급을 부르려 든다.

| 클라이언트 | 인터셉터 | Authenticator | 쓰는 곳 |
| --- | --- | --- | --- |
| 기본 | `AuthInterceptor` O | `TokenAuthenticator` O | 나머지 전부 |
| `@AuthFree` | X | X | `DefaultTokenRefresher.refresh()`의 `POST api/auth/refresh` **하나뿐** |

Hilt 배선(`AuthModule.kt`)이 `AuthApi`를 **두 벌** 만든다.

```kotlin
@Provides @Singleton
fun provideAuthApi(retrofit: Retrofit): AuthApi = retrofit.create(AuthApi::class.java)          // 기본

@Provides @Singleton @AuthFree
fun provideAuthFreeAuthApi(@AuthFree retrofit: Retrofit): AuthApi = ...                          // AuthFree
```

> ⚠️ **`POST api/auth/refresh`를 부르는 자리가 둘이고, 둘이 서로 다른 클라이언트로 나간다.**
>
> | 부르는 곳 | 클라이언트 | Authorization 헤더 | 401을 받으면 |
> | --- | --- | --- | --- |
> | `DefaultTokenRefresher.refresh()` (401 복구) | **`@AuthFree`** | 안 붙는다 | 그냥 실패 → `UNAUTHORIZED`면 `tokenStore.clear()` |
> | `DefaultAuthRepository.restoreSession()` (앱 시작 자동 로그인) | **기본** | **저장된 access 토큰이 있으면 붙는다** | `TokenAuthenticator`가 걸려 `DefaultTokenRefresher.refresh()`를 한 번 더 부른다 |
>
> `DefaultAuthRepository`의 생성자 인자가 `private val api: AuthApi`로 **`@AuthFree`가 없다.** 그래서 자동 로그인 경로의 재발급은 인터셉터와 Authenticator를 **탄다.** 만료된 access 토큰이 헤더로 나가고(서버가 무시한다), 그 호출이 401을 받으면 재발급이 **두 번** 도는 셈이다(무한 루프는 아니다 — `MAX_RETRY = 1`이 막는다).
>
> **웹앱**: `apiClient`(인터셉터 있음)와 `rawClient`(순수 fetch) 두 개를 만들고, **refresh는 두 자리 모두 `rawClient`로 부른다.** 안드로이드의 이 비대칭을 그대로 옮길 이유가 없다 — 자동 로그인 refresh까지 `rawClient`로 보내면 왕복이 하나 줄고, 401 → refresh → 401 → refresh 루프 가능성도 사라진다.

---

## 2. 엔드포인트 전체 표

> 인증 O = `Authorization: Bearer <accessToken>` 필요. `AuthInterceptor`가 토큰이 있으면 무조건 붙이므로,
> 인증 X 항목도 토큰이 있으면 헤더가 실려 나간다(서버가 무시한다).

| # | 메서드 | 경로 | 인증 | 요청 DTO | 응답 DTO | 정의 파일 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | POST | `api/auth/kakao` | X | `KakaoLoginRequest` | `TokenResponse` | `auth/data/AuthApi.kt` |
| 2 | POST | `api/auth/refresh` | X (서버가 열어 둠) | `RefreshRequest` | `TokenResponse` | `auth/data/AuthApi.kt` |
| 3 | POST | `api/auth/logout` | O | 없음 | 없음(Unit) | `auth/data/AuthApi.kt` |
| 4 | DELETE | `api/me` | O | 없음 | 없음(Unit) | `auth/data/AuthApi.kt` |
| 5 | GET | `api/me/home` | O | 없음 | `HomeResponse` | `home/data/HomeApi.kt` |
| 6 | POST | `api/sessions` | O | `StartSessionRequest` | `SessionResponse` | `intake/data/SessionApi.kt` |
| 7 | GET | `api/sessions/{sessionId}` | O | 없음 | `SessionResponse` | `intake/data/SessionApi.kt` |
| 8 | POST | `api/sessions/{sessionId}/messages` | O | `SendMessageRequest` | `TurnResponse` | `intake/data/SessionApi.kt` |
| 9 | PUT | `api/sessions/{sessionId}/severity` | O | `SeverityRequest` | `SessionResponse` | `intake/data/SessionApi.kt` |
| 10 | PUT | `api/sessions/{sessionId}/questions` | O | `QuestionsRequest` | `SessionResponse` | `intake/data/SessionApi.kt` |
| 11 | POST | `api/sessions/{sessionId}/card` | O | `GenerateCardRequest` | `CardResponse` | `card/data/CardApi.kt` |
| 12 | GET | `api/me/cards` | O | 없음 | `CardSummaryResponse[]` | `card/data/CardApi.kt` |
| 13 | GET | `api/cards/{cardId}` | O | 없음 | `CardResponse` | `card/data/CardApi.kt` |
| 14 | PATCH | `api/cards/{cardId}` | O | `UpdateCardRequest` | `CardResponse` | `card/data/CardApi.kt` |
| 15 | DELETE | `api/cards/{cardId}` | O | 없음 | 없음(Unit) | `card/data/CardApi.kt` |
| 16 | POST | `api/cards/{cardId}/confirm` | O | 없음 | `CardResponse` | `card/data/CardApi.kt` |
| 17 | GET | `api/me/visits` | O | 없음 | `VisitSummaryResponse[]` | `visit/data/VisitApi.kt` |
| 18 | GET | `api/visits/{visitId}` | O | 없음 | `VisitResponse` | `visit/data/VisitApi.kt` |
| 19 | GET | `api/cards/{cardId}/visits` | O | 없음 | `VisitSummaryResponse[]` | `visit/data/VisitApi.kt` |
| 20 | POST | `api/cards/{cardId}/visit` | O | `CreateVisitRequest` | `VisitResponse` | `visit/data/VisitApi.kt` |
| 21 | DELETE | `api/visits/{visitId}` | O | 없음 | 없음(Unit) | `visit/data/VisitApi.kt` |
| 22 | POST | `api/visits/classify` | O | `ClassifyMemoRequest` | `ClassifyMemoResponse` | `visit/data/VisitApi.kt` |
| 23 | GET | `api/hospitals?q=&size=` | O | 쿼리 파라미터 | `HospitalSearchResponse` | `visit/data/HospitalApi.kt` |
| 24 | GET | `api/me/appointments?year=&month=&date=` | O | 쿼리 파라미터 | `AppointmentResponse[]` | `calendar/data/AppointmentApi.kt` |
| 25 | GET | `api/me/appointments/upcoming` | O | 없음 | `AppointmentResponse[]` | `calendar/data/AppointmentApi.kt` |
| 26 | POST | `api/me/appointments` | O | `CreateAppointmentRequest` | `AppointmentResponse` | `calendar/data/AppointmentApi.kt` |
| 27 | PATCH | `api/me/appointments/{appointmentId}` | O | `UpdateAppointmentRequest` | `AppointmentResponse` | `calendar/data/AppointmentApi.kt` |
| 28 | DELETE | `api/me/appointments/{appointmentId}` | O | 없음 | 없음(Unit) | `calendar/data/AppointmentApi.kt` |
| 29 | GET | `api/me/health-profile` | O | 없음 | `HealthProfileResponse` | `profile/data/HealthProfileApi.kt` |
| 30 | PUT | `api/me/health-profile` | O | `HealthProfileRequest` | `HealthProfileResponse` | `profile/data/HealthProfileApi.kt` |
| 31 | GET | `api/me/settings` | O | 없음 | `SettingsResponse` | `profile/data/SettingsApi.kt` |
| 32 | PATCH | `api/me/settings` | O | `SettingsRequest` | `SettingsResponse` | `profile/data/SettingsApi.kt` |

**32개. 이것이 전부다.** 앱이 부르는 경로는 `grep -rn "\"api/"`로 확인했고 위 목록 밖의 경로는 없다.

---

## 3. 인증 도메인 — `auth/data/AuthApi.kt`

```kotlin
internal interface AuthApi {
    @POST("api/auth/kakao")
    suspend fun loginWithKakao(@Body request: KakaoLoginRequest): TokenResponse

    @POST("api/auth/refresh")
    suspend fun refresh(@Body request: RefreshRequest): TokenResponse

    /** 서버의 refresh 토큰만 폐기한다. 카카오 세션은 건드리지 않는다. */
    @POST("api/auth/logout")
    suspend fun logout()

    /** 탈퇴. 서버가 어드민 키로 카카오 연결 끊기까지 대신 호출한다. */
    @DELETE("api/me")
    suspend fun withdraw()
}
```

파일 상단 주석: *"`loginWithKakao`와 `refresh`는 인증이 필요 없다(서버 `SecurityConfig`에서 열려 있음). `logout`과 `withdraw`는 `Authorization: Bearer`가 필요하며, 없으면 401이 온다."*

### 3.1 `POST api/auth/kakao`

요청 `KakaoLoginRequest`

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `kakaoAccessToken` | String | 필수 | 카카오 SDK가 준 액세스 토큰. 서버가 이것을 서버 JWT로 교환한다 |

응답 `TokenResponse`

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `accessToken` | String | 필수 | `Authorization: Bearer`에 붙일 값 |
| `refreshToken` | String | 필수 | 재발급용. 회전한다(쓰면 폐기) |
| `accessExpiresInSeconds` | Long | 필수 | 액세스 토큰 수명(초) |
| `onboardingRequired` | Boolean | 필수 | 온보딩이 필요한지 |

> `TokenResponse` 주석 — **`refresh` 응답의 `onboardingRequired`는 믿을 수 없다.**
> *"로그인 응답에서는 서버가 실제 프로필 완료 여부로 계산한다. 다만 `refresh` 응답에서는 서버가 `false`로 하드코딩하므로 자동 로그인 경로에서 이 값을 신뢰할 수 없다. 온보딩 판단은 프로필 조회로 옮겨야 한다."*
>
> **웹앱**: 자동 로그인(새로고침 복구) 경로에서는 `GET api/me/health-profile`의 `onboardingCompleted`로 판단하라.

### 3.2 `POST api/auth/refresh`

요청 `RefreshRequest`

| 필드 | 타입 | 필수 |
| --- | --- | --- |
| `refreshToken` | String | 필수 |

응답: `TokenResponse` (위와 같음)

**부르는 자리가 둘이고 클라이언트가 갈린다**(§1.4 표 참고):

| 부르는 곳 | 클라이언트 | 언제 |
| --- | --- | --- |
| `DefaultTokenRefresher.refresh()` | **`@AuthFree`** — 인터셉터도 Authenticator도 없다 | 아무 호출이나 401을 받았을 때 |
| `DefaultAuthRepository.restoreSession()` | **기본** — 인터셉터·Authenticator가 붙는다 | 앱 시작 자동 로그인 |

둘 다 실패 처리는 **같다**: `Rejected` + `UNAUTHORIZED`면 `tokenStore.clear()`, 그 밖에는 토큰을 남긴다(§15.1·§15.3).

### 3.3 `POST api/auth/logout`

- 요청 본문 없음. 응답 본문 없음.
- `DefaultAuthRepository.logout()`은 **결과를 보지 않는다.**

```kotlin
override suspend fun logout() {
    withTimeoutOrNull(SERVER_LOGOUT_TIMEOUT_MS) { apiCall(json) { api.logout() } }   // 10_000L
    withTimeoutOrNull(KAKAO_LOGOUT_TIMEOUT_MS) { kakaoLoginClient.logout() }         // 5_000L
    tokenStore.clear()
}
```

주석: *"사용자의 의도는 '이 기기에서 나가겠다'이고, 서버가 거절했다고 기기에 토큰을 남겨두면 의도와 반대가 된다. 그래서 결과를 돌려주지 않는다."*

**웹앱**: 로그아웃은 서버 응답을 10초까지만 기다리고, 성공·실패와 무관하게 로컬 토큰을 지우고 로그인 화면으로 보낸다.

### 3.4 `DELETE api/me` (회원탈퇴)

- 요청 본문 없음. 응답 본문 없음.
- 로그아웃과 달리 **실패를 그대로 알린다.** `AuthRepository.withdraw()` 주석: *"서버 호출이 실패하면 계정이 남아 있는데 로컬만 지우고 성공한 척하면 사용자는 탈퇴됐다고 믿게 된다."*
- 성공 시 `tokenStore.clear()`만 한다. **카카오 `unlink()`를 앱이 다시 부르지 않는다** — 서버가 어드민 키로 대신 부른다.
- 실패 문구: `account_withdraw_failed` = `탈퇴하지 못했어요. 계정은 그대로 있어요`

---

## 4. 홈 도메인 — `home/data/HomeApi.kt`

### 4.1 `GET api/me/home`

파일 주석:

> 홈에 필요한 네 덩어리를 한 번에 준다. 문서가 "문구와 D-day는 서버가 만들지 않습니다"라고 적었고 실제로 날짜와 숫자만 온다. (…)
> **신규 사용자는 404가 아니라 전부 `null`과 빈 배열이다. 그것이 1n-2 화면이다.**

응답 `HomeResponse`

| 필드 | 타입 | 필수 | 기본값 | 설명 |
| --- | --- | --- | --- | --- |
| `lastVisitedOn` | String? (`yyyy-MM-dd`) | 선택 | null | 마지막 진료일. 없으면 아직 진료 기록이 없는 사람 |
| `nextAppointment` | `HomeAppointmentResponse?` | 선택 | null | 다음 일정 **하나** |
| `pendingRecordOn` | String? (`yyyy-MM-dd`) | 선택 | null | 진료 후 기록이 아직 없는 지난 일정 가운데 가장 최근 날 |
| `inProgressSession` | `InProgressSessionResponse?` | 선택 | null | 작성 중이던 문답. "이어서 하기"가 이것 하나로 그려진다 |
| `recentCards` | `HomeCardSummaryResponse[]` | 선택 | `[]` | 최근 카드 |

> `pendingRecordOn` 주석(Backend#123): *"서버가 일정 날짜로 남긴 기록이 있는지를 보고 14일까지만 거슬러 찾으며, 취소한 일정은 세지 않는다. 일정과 기록을 잇는 열쇠가 없어서 — 기록은 카드에 붙는데 일정은 카드 없이도 만들 수 있다 — 날짜로 견주는 것이 서버가 할 수 있는 전부다."*

`HomeResponse.nextAppointment` (홈 도메인 전용 `AppointmentResponse`)

| 필드 | 타입 | 필수 | 기본값 |
| --- | --- | --- | --- |
| `appointmentId` | Long | **필수** | — |
| `clinicName` | String? | 선택 | null |
| `department` | String? | 선택 | null |
| `purpose` | String? | 선택 | null |
| `scheduledOn` | String (`yyyy-MM-dd`) | **필수** | — |
| `scheduledTime` | String? (`HH:mm:ss`) | 선택 | null — **없으면 시간 미정** |
| `status` | String? | 선택 | null |
| `origin` | String? | 선택 | null |
| `cards` | `LinkedCardResponse[]` | 선택 | `[]` |

> ⚠️ **캘린더 도메인의 `AppointmentResponse`와 이름은 같지만 타입이 다르다.**
> 홈 쪽에는 `todos`가 없다. TypeScript로 옮길 때 `HomeAppointment`와 `Appointment`로 이름을 갈라야 한다.
>
> 주석(#202): *"날짜와 시각이 따로 온다. (…) 전에는 `scheduledAt` 하나와 `cardId`·`cardTitle`이었고, 서버가 모양을 바꾸면서 홈에서 앱이 죽었다."*

`LinkedCardResponse`

| 필드 | 타입 | 필수 | 기본값 |
| --- | --- | --- | --- |
| `cardId` | Long | **필수** | — |
| `title` | String? | 선택 | null |

`InProgressSessionResponse`

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `sessionId` | Long | **필수** | |
| `siteText` | String? | 선택 | 사람이 읽는 부위 표현 |
| `progressCurrent` | Int | **필수** | 문답 왕복 수 |
| `progressTotal` | Int | **필수** | 상한. **20이다** |

> `HomeRepository` 주석(#176) — **서버 진행도를 그대로 쓰면 안 된다.**
> *"`progressCurrent` / `progressTotal`은 문답 왕복을 센 것이고 상한이 20이다. 그대로 찍으면 '20단계 중 0단계까지 답했어요'가 되는데 환자가 보는 증상 정리는 네 단계다."*
> 앱의 환산: `progressCurrent > 0`이면 2단계(`SYMPTOM_CHAT`), 아니면 1단계(`BODY_PART`).

`HomeResponse.recentCards[]` (홈 도메인 전용 `CardSummaryResponse`)

| 필드 | 타입 | 필수 | 기본값 |
| --- | --- | --- | --- |
| `cardId` | Long | **필수** | — |
| `title` | String? | 선택 | null |
| `status` | String? | 선택 | null |
| `visited` | Boolean | 선택 | `false` |
| `clinicName` | String? | 선택 | null |
| `createdAt` | String (ISO-8601 offset) | **필수** | — |

> ⚠️ **카드 도메인의 `CardSummaryResponse`와 필드가 다르다.** 카드 쪽에는 `clinic`(객체)과 `chiefComplaint`가 더 있다. 홈 쪽에는 없다.
>
> `createdAt`은 `OffsetDateTime.parse(createdAt)`로 읽는다 → **오프셋이 붙은 ISO-8601**이어야 한다(`2026-09-04T10:22:31+09:00` 꼴). 여기서 파싱이 깨지면 `apiCall`이 잡지 않아 앱이 죽는다.
>
> ⚠️ **홈의 카드 제목은 지금 늘 빈 문자열이다.** `HomeRepository.toSummary()`가 `title = title.orEmpty()`로만 읽고, 홈 DTO에는 대체할 `chiefComplaint`가 없다(카드 목록은 `title ?: chiefComplaint`로 대신한다). 서버가 `title`을 채워 주기 전까지 홈의 "최근 카드" 줄에는 제목 자리가 비어 있다. **웹앱에서 고칠 기회가 있는 알려진 결함이다** — 홈 응답에 `chiefComplaint`를 추가해 달라고 요청하거나, 목록 API를 한 번 더 부르는 수밖에 없다.

### 4.2 홈이 서버 대신 계산하는 것

| 화면 값 | 어디서 | 규칙 |
| --- | --- | --- |
| 아바타 첫 글자 | **다른 API** — `CurrentUserProvider.displayName()` → `GET api/me/health-profile`의 `name` | 홈 응답에 이름이 없다. 두 호출을 `async`로 **나란히** 보낸다. 이름 실패는 홈 실패가 아니다 |
| D-day / 경과일 | 앱 | 서버가 세지 않는다(시간대 어긋남) |
| "오늘의 한 줄" | 앱 | 우선순위: 오늘 일정 > 기록 빠진 지난 일정 > 다음 진료 > 지난 진료 > 카드만 있음 > 첫 방문 |
| 일정 제목 | 앱 | `listOfNotNull(clinicName, department).filter { it.isNotBlank() }.joinToString(" ")` (`purpose`는 홈에서 합치지 않는다). 결과가 비면 `cards[0].title` |
| 시각 표기 | 앱 | `DateTimeFormatter.ofPattern("a h:mm", Locale.KOREAN)` → `오전 10:30`. 못 읽는 시각은 `runCatching`으로 삼키고 **시간 미정**으로 본다 |

> ⚠️ **홈과 캘린더의 제목 조립 규칙이 미묘하게 다르다.** 홈은 `filter { it.isNotBlank() }`로 빈 문자열을 버리고 둘(`clinicName`·`department`)만 합친다. 캘린더(§9.3)는 필터 없이 셋(`clinicName`·`department`·`purpose`)을 합치므로, 서버가 빈 문자열을 주면 캘린더 쪽에만 공백이 겹친 제목이 나온다. **웹앱은 한 함수로 합치되 홈/캘린더가 각각 어느 필드를 쓰는지만 달리하는 편이 낫다.**

`origin == "VISIT_FOLLOW_UP"`이면 홈 일정 줄이 "재진"으로 표시된다.

또 하나: `CurrentUserProvider.displayName()`의 구현은 `HealthProfileRepository`이고 `profile().map { it.name?.trim()?.takeIf(String::isNotEmpty) }`다. **이름을 공백만으로 받으면 null로 접어** 아바타를 비운다.

---

## 5. 문답 세션 도메인 — `intake/data/SessionApi.kt`

파일 주석: *"임시저장이 여기에 있다. `start`로 만든 세션을 서버가 들고 있고, `session`이 대화와 진행도를 돌려준다. 문서가 '앱을 껐다 켜도 이어서 답할 수 있도록'이라고 적었다."*

### 5.1 `POST api/sessions` — 문답 시작

> 주석: *"나이나 성별이 없으면 400이다. 둘은 의사용 카드 헤더에 반드시 찍혀서, 없으면 문답을 다 해도 카드가 성립하지 않는다. `canStartIntake`로 미리 확인한다."*

요청 `StartSessionRequest`

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `siteCodes` | String[] | **필수** | 온톨로지 id. 구역까지 골랐으면 `SUR:*`, 앵커까지면 `ANC:*`. 앱은 **한 개만** 넣는다 |
| `siteText` | String? | 선택(null이면 키 자체가 빠짐) | 사람이 읽는 표현. 문답 첫 문장에 그대로 들어간다 |

응답: `SessionResponse` (5.5)

### 5.2 `GET api/sessions/{sessionId}`

- 경로 파라미터 `sessionId`: Long
- 응답: `SessionResponse`

### 5.3 `POST api/sessions/{sessionId}/messages` — 한 턴

> 주석: *"한 번에 대화가 두 줄 쌓인다. 보낸 말과 AI의 다음 질문이다. 응답의 `messages`에 대화 전체가 들어 있어 화면을 다시 그릴 때 세션을 또 조회하지 않아도 된다."*
> *"끝난 뒤에 또 보내도 오류가 아니다. 마지막 문장만 돌아오고 상태는 그대로다. 네트워크가 끊긴 사이에 끝났을 수 있어서 앱이 종료 시점을 정확히 몰라도 되게 서버가 열어 뒀다."*

요청 `SendMessageRequest`

| 필드 | 타입 | 필수 | 값 |
| --- | --- | --- | --- |
| `text` | String | **필수** | 환자 발화(음성이어도 **변환한 글만** 간다) |
| `inputMethod` | String | **필수** | `"STT"` (음성) 또는 `"TEXT"` — `SessionRepository`: `if (byVoice) "STT" else "TEXT"` |

> 주석: *"음성으로 말했어도 오디오를 보내지 않는다. 앱이 변환한 글만 간다. `STT`는 음성이었다는 사실만 남기고 녹음은 저장되지 않는다."*

응답 `TurnResponse`

| 필드 | 타입 | 필수 | 기본값 | 설명 |
| --- | --- | --- | --- | --- |
| `sessionId` | Long | **필수** | — | |
| `status` | String? | 선택 | null | |
| `reply` | String? | 선택 | null | AI의 다음 질문 |
| `ended` | Boolean | 선택 | `false` | 문답이 끝났는지 |
| `endReason` | String? | 선택 | null | |
| `progress` | `ProgressResponse?` | 선택 | null | |
| `messages` | `MessageResponse[]` | 선택 | `[]` | **대화 전체** |

### 5.4 `PUT api/sessions/{sessionId}/severity` · `PUT .../questions`

`SeverityRequest` (3단계 / Figma `1d`)

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `level` | Int | **필수** | **1~5 서열척도. NRS 0~10이 아니다** |
| `label` | String | **필수** | `"꽤 아파요"` 같은 표시 문구. **앱이 보낸다** |

> 주석: *"서버가 들고 있으면 문구를 바꿀 때마다 배포해야 하고, 이것은 디자인 카피라 서버 것이 아니다."*
> *"끝난 문답에도 보낼 수 있고 다시 고르면 덮어쓴다."*

`QuestionsRequest` (4단계 / Figma `1i`)

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `questions` | String[] | **필수** | **목록을 통째로 보낸다.** 추가·편집·삭제·순서가 한 번에 처리된다 |

둘 다 응답은 `SessionResponse`.

### 5.5 `SessionResponse` 전체 필드

| 필드 | 타입 | 필수 | 기본값 | 설명 |
| --- | --- | --- | --- | --- |
| `sessionId` | Long | **필수** | — | |
| `status` | String? | 선택 | null | `IN_PROGRESS` / `COMPLETED` / `ABANDONED` |
| `siteCodes` | String[] | 선택 | `[]` | |
| `siteText` | String? | 선택 | null | |
| `progress` | `ProgressResponse?` | 선택 | null | |
| `messages` | `MessageResponse[]` | 선택 | `[]` | |
| `severity` | `SeverityResponse?` | 선택 | null | |
| `questions` | String[] | 선택 | `[]` | **환자가 확정한** 질문 |
| `questionCandidates` | `QuestionCandidateResponse[]` | 선택 | `[]` | **AI 제안**. 확정과 다른 축 |

> `questionCandidates` 주석: *"환자가 적어 둔 `questions`와 다르다. 이쪽은 제안이고 저쪽은 확정이다. 4단계(1i)가 후보를 목록에 채워 두고 환자가 지우거나 더한다."*
>
> `SessionRepository`의 합성 규칙:
> ```kotlin
> questions = questions.ifEmpty { questionCandidates.sortedBy { it.rank }.map { it.text } }
> ```
> *"환자가 아직 아무것도 적지 않았으면 AI 후보를 채워 둔다. 한 번이라도 손댔으면 그 결과가 정본이다 — 후보로 덮으면 지운 질문이 되살아난다."*

`ProgressResponse`

| 필드 | 타입 | 필수 |
| --- | --- | --- |
| `current` | Int | **필수** |
| `total` | Int | **필수** |

`MessageResponse`

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `seq` | Long | **필수** | 세션 안에서 유일. **화면 목록의 key로 그대로 쓴다** |
| `role` | String | **필수** | `"AI"` 또는 `"USER"` |
| `text` | String | **필수** | |

`SeverityResponse`

| 필드 | 타입 | 필수 | 기본값 |
| --- | --- | --- | --- |
| `level` | Int | **필수** | — |
| `label` | String? | 선택 | null |

`QuestionCandidateResponse`

| 필드 | 타입 | 필수 | 기본값 | 설명 |
| --- | --- | --- | --- | --- |
| `text` | String | **필수** | — | |
| `source` | String? | 선택 | null | |
| `rank` | Int | 선택 | `0` | **낮을수록 먼저.** 주석: "서버가 정렬해 주지만 순서를 믿지 않는다" |

### 5.6 상태 해석 규칙 (앱이 정한 것)

```kotlin
private fun statusOf(value: String?): IntakeSessionStatus = when (value) {
    "COMPLETED" -> IntakeSessionStatus.COMPLETED
    "ABANDONED" -> IntakeSessionStatus.ABANDONED
    else -> IntakeSessionStatus.IN_PROGRESS   // 모르는 값은 진행 중
}
```

주석: *"서버가 상태를 늘렸을 때 세션을 못 여는 것보다, 열어 두고 진행도로 판단하는 쪽이 낫다. 임시저장을 잃는 것이 더 큰 손해다."*

---

## 6. 브리핑 카드 도메인 — `card/data/CardApi.kt`

파일 주석: *"카드는 `DRAFT`로 만들어지고 `confirm`이 따로 있다. 그것이 이 도메인의 임시저장이다."*

### 6.1 `POST api/sessions/{sessionId}/card` — 문답을 카드로

> 주석: *"본문 전체가 선택이다. 1m-B에서 병원을 골랐으면 함께 보내고, 건너뛰었으면 빈 본문을 보낸다. 안 보내면 병원 없이 만들어진다."*
> *"검증에 걸린 필드는 `UNKNOWN`으로 저장되고 이름이 온다."*(→ 응답 `rejectedFields`)

요청 `GenerateCardRequest`

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `clinic` | `ClinicRequest?` | 선택 | null이면 키 자체가 빠진다(= `{}` 를 보낸다) |

`ClinicRequest`

| 필드 | 타입 | 필수 |
| --- | --- | --- |
| `name` | String | **필수** |
| `address` | String? | 선택 |

### 6.2 `GET api/me/cards` — 카드 목록

> 주석: *"목록에는 본문이 없다. 상세는 `card`로 본다."*

응답 `CardSummaryResponse[]` (카드 도메인 전용)

| 필드 | 타입 | 필수 | 기본값 | 설명 |
| --- | --- | --- | --- | --- |
| `cardId` | Long | **필수** | — | |
| `clinic` | `ClinicResponse?` | 선택 | null | **진료받을 병원.** 카드가 드는 값 |
| `title` | String? | 선택 | null | **아직 항상 null이다.** 목록 제목은 `chiefComplaint`를 쓴다 |
| `chiefComplaint` | String? | 선택 | null | 환자가 말한 원문이라 길 수 있다 |
| `status` | String? | 선택 | null | `"CONFIRMED"`인지만 본다 |
| `visited` | Boolean | 선택 | `false` | **"진료 완료" 배지는 이 값으로 판단한다** |
| `clinicName` | String? | 선택 | null | 진료를 **받은** 병원. 진료 전 카드는 비어 있다 |
| `createdAt` | String (ISO offset) | **필수** | — | |

> `clinic` vs `clinicName` 주석: *"`clinicName`과 다른 축이다. 그쪽은 진료를 **받은** 병원이라 진료 기록에서 오고, 진료 전 카드는 비어 있다."*
>
> 앱의 목록 줄 병원 선택(Backend#101): `clinic?.name?.takeIf { it.isNotBlank() } ?: clinicName`
> 앱의 목록 제목: `(title ?: chiefComplaint)` 을 **24자에서 자르고 `…`을 붙인다**(`TITLE_MAX = 24`).

### 6.3 `GET api/cards/{cardId}` / `POST api/cards/{cardId}/confirm`

- `confirm`: 요청 본문 없음. **"이미 확정한 카드를 다시 확정하면 400이다."**
- 둘 다 응답은 `CardResponse`.

### 6.4 `PATCH api/cards/{cardId}` — 수정

> **가장 까다로운 계약이다.**
> 주석: *"보낸 필드만 바뀐다. 확정된 카드는 고치지 않고 이어받은 새 버전이 만들어진다. 응답의 `cardId`와 `version`이 달라지므로 호출자가 그 값으로 갈아타야 한다. 의사가 이미 본 카드가 뒤바뀌면 안 된다."*

요청 `UpdateCardRequest` — **전부 nullable, null은 "안 바꿈"(직렬화에서 빠짐)**

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `chiefComplaint` | String? | 선택 | |
| `axes` | `AxisEditRequest[]?` | 선택 | 앱은 `takeIf { it.isNotEmpty() }`로 빈 목록이면 아예 안 보낸다 |
| `questions` | String[]? | 선택 | |
| `patientNotes` | String[]? | 선택 | |
| `clinic` | `ClinicRequest?` | 선택 | 1e-1의 `변경`으로 고른 병원 |

> 주석: **"제목과 진료과는 고칠 수 없다. 서버가 받지 않는다."**

`AxisEditRequest`

| 필드 | 타입 | 필수 | 예시 |
| --- | --- | --- | --- |
| `axis` | String | **필수** | `"onset"` |
| `value` | String | **필수** | `"3주 전"` |

서버가 받는 모양: `{"axis":"onset","value":"3주 전"}`

> ⚠️ **DTO에 있는 필드와 앱이 실제로 보내는 필드가 다르다.** `DefaultCardRepository.update()`는 세 개만 채운다:
>
> ```kotlin
> UpdateCardRequest(
>     axes = axes.map { AxisEditRequest(axis = it.axis, value = it.value) }.takeIf { it.isNotEmpty() },
>     questions = questions,
>     clinic = clinic.toRequest(),
> )
> ```
>
> | 필드 | 앱이 보내는가 | 결과 |
> | --- | --- | --- |
> | `axes` | 비어 있지 않을 때만 | 빈 목록이면 키가 빠져 "안 바꿈" |
> | `questions` | **늘 보낸다** | 빈 목록이면 `[]`가 나가 **질문이 전부 지워진다.** "안 바꿈"이 아니다 |
> | `clinic` | 골랐을 때만 | null이면 키가 빠져 "안 바꿈" |
> | `chiefComplaint` | **한 번도 안 보낸다** | DTO에는 있으나 호출자가 없다. 서버가 받는지 앱 코드로는 확인되지 않음 |
> | `patientNotes` | **한 번도 안 보낸다** | 〃 |
>
> **웹앱 주의**: `axes`와 `questions`가 서로 다른 규칙이라 그대로 옮겨야 한다. 축은 "빈 목록 = 안 바꿈", 질문은 "빈 목록 = 전부 삭제"다. 이 둘을 같은 헬퍼로 뭉개면 축 편집을 취소했을 때 질문이 날아가거나 그 반대가 된다.

### 6.5 `DELETE api/cards/{cardId}` — 삭제

> 주석 전문(웹앱 확인 다이얼로그 문구의 근거):
> *"**딸린 것이 갈린다.** 문답과 진료 기록은 함께 지워지고, 일정은 남고 연결만 끊긴다. (…)
> 같은 문답에서 나온 카드는 버전을 가리지 않고 전부 지워진다. 환자에게는 한 장이고 버전은 서버 사정이다. 확정·전달한 카드도 지울 수 있고 **되돌릴 수 없다.**"*

화면 문구(원문 그대로):

| 리소스 | 문구 |
| --- | --- |
| `brief_card_delete_title` | `이 브리핑 카드를 삭제할까요?` |
| `brief_card_delete_body` | `연결된 진료 기록은 남고 이 카드는 사라져요.` |
| `brief_card_delete_confirm` | `삭제` |
| `brief_card_list_delete_title` | `브리핑 카드 %1$d장을 삭제할까요?` |
| `brief_card_list_delete_body` | `연결된 진료 기록은 남고 선택한 카드는 사라져요.` |
| `brief_card_list_delete_count` | `%1$d장 삭제` |

**일괄 삭제 API가 없다.** `CardRepository.deleteAll`이 한 장씩 부르고 **실제로 지워진 id만** 돌려준다.
주석: *"일부가 실패해도 나머지는 계속 지운다. 하나 실패했다고 멈추면 이미 지운 것과 화면이 어긋나고, 다시 누르면 지운 것을 또 부르게 된다."*

### 6.6 `CardResponse` 전체 필드

| 필드 | 타입 | 필수 | 기본값 | 설명 |
| --- | --- | --- | --- | --- |
| `cardId` | Long | **필수** | — | 수정 후 **달라진다** |
| `status` | String? | 선택 | null | `"CONFIRMED"` / 그 외(=`DRAFT`) |
| `version` | Int | 선택 | `1` | 확정 뒤 수정할 때마다 오른다 |
| `parentCardId` | Long? | 선택 | null | 이어받은 앞 카드 |
| `sessionId` | Long? | 선택 | null | |
| `patient` | `PatientResponse?` | 선택 | null | 카드 머리의 환자 |
| `title` | String? | 선택 | null | **아직 서버가 내려주지 않는다** |
| `chiefComplaint` | String? | 선택 | null | 제목 자리를 대신한다 |
| `axes` | `Record<String, AxisResponse>` | 선택 | `{}` | **8축이 늘 자리를 차지한다** |
| `redFlags` | String[] | 선택 | `[]` | |
| `patientNotes` | String[] | 선택 | `[]` | |
| `questions` | String[] | 선택 | `[]` | |
| `departmentGuidance` | `DepartmentGuidanceResponse?` | 선택 | null | |
| `completeness` | Double? | 선택 | null | |
| `minimallyComplete` | Boolean | 선택 | `false` | |
| `rejectedFields` | String[] | 선택 | `[]` | 검증에 걸려 저장되지 않은 필드 이름 |
| `createdAt` | String? (ISO offset) | 선택 | null | |
| `confirmedAt` | String? (ISO offset) | 선택 | null | |
| `clinic` | `ClinicResponse?` | 선택 | null | **진료받을 병원** |

> `clinic` 주석: *"**응답에 병원이 셋이고 이것만 쓴다.** `appointment`는 연결된 일정의 병원이고 `visit`은 진료를 받은 병원이라 셋이 다 다를 수 있다. 시안 1e-1의 '진료받을 병원'은 이 값이다. 안 골랐으면 없다 — 1m-B에 건너뛰기가 있어서 정상 상태다."*
>
> `rejectedFields` 주석: *"카드 만들기 자체는 성공한다. 통째로 실패시키면 환자가 답한 문답이 날아간다."*

`AxisResponse`

| 필드 | 타입 | 필수 | 기본값 | 설명 |
| --- | --- | --- | --- | --- |
| `axis` | String? | 선택 | null | |
| `status` | String? | 선택 | null | `NOT_ASKED` · `FILLED` · `UNKNOWN` · `SKIPPED` · `AMBIGUOUS` |
| `value` | String? | 선택 | null | |
| `evidence` | String[] | 선택 | `[]` | **환자가 실제로 한 말.** "지어낸 값과 들은 값을 가르는 자리" |
| `source` | String? | 선택 | null | |

`ClinicResponse`

| 필드 | 타입 | 필수 |
| --- | --- | --- |
| `name` | String? | 선택 |
| `address` | String? | 선택 |

> 앱 규칙: `name`이 비면 병원이 없는 것으로 본다. *"안 골랐을 때 서버가 빈 객체를 줄 수 있고, 이름 없는 병원 블록은 그릴 것이 없다."*

`DepartmentGuidanceResponse`

| 필드 | 타입 | 필수 | 기본값 |
| --- | --- | --- | --- |
| `departments` | String[] | 선택 | `[]` |
| `source` | String? | 선택 | null |

> 주석: *"배열이다. 하나로 좁히지 않는다. 비어 있으면 줄을 숨긴다. `source`("의료인 자문 확인 전")를 화면에 함께 보여야 하고 **"추천"이라는 말은 쓰지 않는다**."*

`PatientResponse`

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `name` | String? | 선택 | |
| `age` | Int? | 선택 | |
| `sex` | String? | 선택 | `"MALE"` / `"FEMALE"` (`CardMapping.sexLabel`) |
| `allergies` | `CardTextFieldResponse?` | 선택 | 한 줄 |
| `medications` | `CardListFieldResponse?` | 선택 | 목록 |
| `conditions` | `CardListFieldResponse?` | 선택 | 목록 |

> 주석(Backend#84): *"전에는 없어서 화면이 `GET /api/me/health-profile`에서 읽어 얹었고, 카드를 만든 시점이 아니라 **보는 시점의 프로필**이 찍히는 것이 한계였다. 서버가 카드에 박아 주면서 그 우회를 걷어냈다."*

`CardTextFieldResponse` / `CardListFieldResponse`

| 필드 | 타입 | 필수 | 기본값 | 설명 |
| --- | --- | --- | --- | --- |
| `status` | String? | 선택 | null | `KNOWN` / `NONE` / `UNKNOWN` |
| `text` | String? (Text 쪽) | 선택 | null | `KNOWN`일 때만 값이 있다 |
| `items` | String[] (List 쪽) | 선택 | `[]` | |

> **서버가 `status`를 빼고 보낼 때가 있다.** `CardHealth.kt` 주석: *"기기 로그에서 `"medications":{"items":[]}`처럼 `status` 없이 오는 것을 봤다. 그때 상태만 보고 자르면 값이 있는데도 줄이 사라진다. 값이 있으면 있는 것으로 본다."*
>
> 앱 규칙: `if (status == null) hasValue else status == "KNOWN"`

### 6.7 카드 축(axis) id와 화면 라벨 (`CardMapping.kt`)

| axis id | 화면 라벨 | 비고 |
| --- | --- | --- |
| `site` | 부위 | |
| `onset` | 시작 | |
| `character` | 양상 | |
| `radiation` | 뻗치는 곳 | |
| `associated` | 동반증상 | |
| `time_course` | 경과 | |
| `exacerbating_relieving` | 심해질 때 | |
| `severity` | 강도 | **KV 줄이 아니라 눈금.** `AXIS_ORDER`에서 빠져 있다 |
| 그 외 | **axis id를 그대로 쓴다** | `axisLabel`의 `else -> axis`. 다만 카드 쪽은 `AXIS_ORDER`만 훑으므로 모르는 축은 화면에 서지 않는다(기록 쪽과 다르다 — §7.6) |

읽는 차례(`AXIS_ORDER`)는 `site → onset → character → radiation → associated → time_course → exacerbating_relieving`. 맵이라 **서버 순서를 믿지 않는다.**

`status`별 화면 값:

| status | 화면 값 |
| --- | --- |
| `FILLED` | `value` 그대로 |
| `UNKNOWN` | `잘 모르겠어요` |
| `AMBIGUOUS` | `{value} (확실하지 않아요)` — value가 없으면 `잘 모르겠어요` |
| `NOT_ASKED` / `SKIPPED` | **줄을 만들지 않는다** |

> *"8축이 늘 자리를 차지하고 1턴째는 대부분 `NOT_ASKED`라, 그대로 그리면 빈 줄 여덟 개가 먼저 보인다."*

`severity` 축의 값은 `"3 (꽤 아파요)"`처럼 온다. 앱의 읽는 순서(`CardMapping.toSeverity`):

1. **`status != "FILLED"`이면 즉시 포기한다** — `UNKNOWN`·`AMBIGUOUS`여도 눈금을 그리지 않는다. KV 줄과 규칙이 다르다.
2. 값에서 `Regex("\\d+")`로 **앞의 숫자 하나만** 읽는다. 괄호 안의 낱말은 쓰지 않는다 — *"문자열을 맞춰 보면 서버가 표현을 바꿀 때마다 갈린다."*
3. 그 숫자가 1~5 눈금에 없으면(또는 숫자가 없으면) 그리지 않는다.

환자 줄: `김OO · 32세 여 · 2026.09.04 작성` — `patient.name` · `"{age}세 {여|남}"` · `createdAt`을 `yyyy.MM.dd`로 포맷한 것을 ` · `로 잇는다.

---

## 7. 진료 후 기록 도메인 — `visit/data/VisitApi.kt`

파일 주석: *"녹음은 저장하지 않는다. 오디오 컬럼 자체가 없다. 음성으로 적어도 변환한 글만 간다."*

### 7.1 `GET api/me/visits` · `GET api/cards/{cardId}/visits`

응답 `VisitSummaryResponse[]` (최근 진료일 순)

| 필드 | 타입 | 필수 | 기본값 | 설명 |
| --- | --- | --- | --- | --- |
| `visitId` | Long | **필수** | — | |
| `cardId` | Long? | 선택 | null | **없을 수 있다** — 카드를 지워도 기록은 남고 연결만 끊긴다 |
| `cardTitle` | String? | 선택 | null | 카드를 만들 때 박아둔 값이라 연결이 끊겨도 남는다 |
| `clinicName` | String? | 선택 | null | |
| `visitedOn` | String (`yyyy-MM-dd`) | **필수** | — | |
| `followUp` | `FollowUpResponse?` | 선택 | null | 재방문 |

> 목록에는 `rawNote`가 없다. *"증상·복용약이 섞인 긴 글이라 목록마다 실어 나를 이유가 없다. 월별 묶음은 앱이 만든다."*
>
> `GET api/cards/{cardId}/visits` 주석(Backend#121): *"체인의 아무 카드 id나 받는다. 재방문 전에 카드를 고치면 첫 기록과 두 번째 기록이 서로 다른 카드 행에 붙는데 서버가 문답 단위로 모아 준다."*
> **`VisitRepository` 경고: "`visits()`를 `cardId`로 거르면 안 된다."** 목록이 주는 `cardId`는 최신 버전이라 묶을 열쇠가 못 된다.

### 7.2 `GET api/visits/{visitId}`

응답 `VisitResponse`

| 필드 | 타입 | 필수 | 기본값 | 설명 |
| --- | --- | --- | --- | --- |
| `visitId` | Long | **필수** | — | |
| `cardId` | Long? | 선택 | null | |
| `clinicName` | String? | 선택 | null | |
| `visitedOn` | String? (`yyyy-MM-dd`) | 선택 | null | |
| `axes` | `Record<String, VisitAxisResponse>` | 선택 | `{}` | **항목이 가변이다** |
| `followUp` | `FollowUpResponse?` | 선택 | null | |
| `patientNotes` | String[] | 선택 | `[]` | |
| `rawNote` | String? | 선택 | null | 환자가 적은 원문. **상세에만 온다** |

> 주석(#178): *"전에는 `whatWasDone`·`result`·`prescription` 셋으로 고정이었다. 지금은 브리핑 카드와 같은 모양의 축 맵이고 AI가 축을 늘려도 실린다. **못 찾은 항목은 빈 값이 아니라 키가 없다.**"*

`VisitAxisResponse` — 카드의 `AxisResponse`와 **모양은 같지만 타입을 같이 쓰지 않는다.**

| 필드 | 타입 | 필수 | 기본값 |
| --- | --- | --- | --- |
| `axis` | String? | 선택 | null |
| `status` | String? | 선택 | null |
| `value` | String? | 선택 | null |
| `evidence` | String[] | 선택 | `[]` |
| `source` | String? | 선택 | null |

주석: *"한 도메인이 다른 도메인을 참조하지 않고, 두 계약이 지금 같아 보여도 같이 움직인다는 보장이 없다."* → **TS에서도 `CardAxis`와 `VisitAxis`를 따로 둔다.**

`FollowUpResponse`

| 필드 | 타입 | 필수 | 기본값 | 설명 |
| --- | --- | --- | --- | --- |
| `date` | String? (`yyyy-MM-dd`) | 선택 | null | |
| `text` | String? | 선택 | null | 환자가 말한 표현("2주 뒤") |
| `approximate` | Boolean | 선택 | `false` | **"2주 뒤"처럼 범위로 말한 것. 화면이 "전후"를 붙인다** |

### 7.3 `POST api/cards/{cardId}/visit` — 기록 남기기

> 주석: *"**확정한 카드에만** 남길 수 있고 카드 하나에 기록 하나다. 모든 항목이 선택이라 `rawNote`만 적어도 저장된다. 병원을 막 나온 사람에게 필수 입력을 요구하면 아무것도 안 남는다."*

요청 `CreateVisitRequest`

| 필드 | 타입 | 필수 | 기본값 | 설명 |
| --- | --- | --- | --- | --- |
| `clinicName` | String? | 선택 | null | |
| `visitedOn` | String? (`yyyy-MM-dd`) | 선택 | null | |
| `axes` | `VisitAxisRequest[]` | 선택 | `[]` | |
| `followUp` | `FollowUpRequest?` | 선택 | null | |
| `patientNotes` | String[] | 선택 | `[]` | 어느 항목에도 들어가지 않은 문장 |
| `rawNote` | String? | 선택 | null | |

> 주석: **"`status`와 `source`를 보내지 않는다."** *"값이 있으면 `FILLED`, 비었으면 `UNKNOWN`이고 출처는 서버가 `PATIENT_EDIT`로 박는다. 앱이 'AI가 뽑았다'고 주장할 수 있으면 의사 화면의 출처 표시가 의미를 잃는다."*

`VisitAxisRequest`

| 필드 | 타입 | 필수 |
| --- | --- | --- |
| `axis` | String | **필수** |
| `value` | String | **필수** |

`FollowUpRequest`

| 필드 | 타입 | 필수 | 기본값 |
| --- | --- | --- | --- |
| `date` | String? | 선택 | null |
| `text` | String? | 선택 | null |
| `approximate` | Boolean | 선택 | `false` |

> ⚠️ **날짜 없는 재방문은 앱이 통째로 버린다.** 계약상 `FollowUpResponse.date`는 nullable인데, 읽는 쪽(`VisitMapping.toFollowUp`)이 이렇게 돼 있다:
>
> ```kotlin
> private fun FollowUpResponse.toFollowUp(): VisitFollowUp? {
>     val day = date?.let(LocalDate::parse) ?: return null   // 날짜가 없으면 followUp 자체가 없는 것
>     return VisitFollowUp(date = day, text = text, approximate = approximate)
> }
> ```
>
> 서버가 `{"text":"2주 뒤","approximate":true}`처럼 **날짜 없이 `text`만** 주면 그 재방문은 화면에서 사라진다(줄도, 캘린더 점도, 자동 일정도 없다). 반대로 보낼 때는 `VisitFollowUp.date`가 non-null이라 `date`가 **늘 채워져 나간다.**
>
> **웹앱**: 옮기기 전에 서버가 날짜 없는 `followUp`을 실제로 주는지 확인하고, 준다면 `text`만 있는 재방문도 줄로 보여줄지 결정하라(§19에 확인 항목으로 올려 둔다).

**보내기 전 문자열 손질이 하나 있다** (`VisitMapping.withoutRevisitNote`, #245):
화면의 재방문 줄은 `2주 뒤 (9월 27일 전후)`처럼 앱이 날짜를 덧붙여 놓은 값이다. 저장할 때 `follow_up` 축의 값에서 `" (9월 27일 전후)"` 꼬리를 떼고 보낸다. 날짜는 `followUp`이 따로 나른다.
읽을 때는 `withRevisitDate`가 다시 붙이되, **이미 붙어 있으면 또 붙이지 않는다** — 그러지 않으면 `(9월 17일 전후) (9월 17일 전후)`가 된다.

### 7.4 `DELETE api/visits/{visitId}`

> 주석: *"기록 하나를 지운다. 카드는 남는다. 전에는 이 자리가 없어서 기록 삭제가 카드 삭제로 나갔고, 기록 한 건을 지우려던 사람이 카드와 문답까지 잃었다(#157)."*

화면 문구: `visit_record_delete_title` = `이 진료 후 기록을 삭제할까요?` / `visit_record_delete_body` = `원문 메모까지 사라지고 되돌릴 수 없어요.` / `visit_record_delete` = `진료 후 기록 삭제`

일괄 삭제는 카드와 마찬가지로 앱이 한 건씩 돌린다(`deleteAll`).

### 7.5 `POST api/visits/classify` — 메모 자동 분류

> **가장 중요한 비용 계약이다.**
> 주석: *"**저장하지 않는다.** 카드에도 매이지 않아서 저장 전에 부를 수 있다. 나눈 결과를 그대로 `create`의 요청으로 옮기면 된다."*

요청 `ClassifyMemoRequest`

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `memo` | String | **필수** | 환자가 적은 원문 |
| `visitedOn` | String? (`yyyy-MM-dd`) | 선택 | |
| `clinicName` | String? | 선택 | |
| `labels` | `Record<String,String>?` | 선택 | **직전 응답의 분류.** 있으면 반드시 함께 보낸다 |

> `labels` 주석: *"**있으면 반드시 함께 보낸다.** 안 보내면 줄 하나를 옮길 때마다 AI 모델 호출이 나가고, 그 비용이 서버 크레딧과 같은 주머니에서 빠진다. 보내면 모델을 부르지 않고 재조립만 한다."*
>
> `VisitRecordViewModel`은 `labels`를 필드로 들고 있다가 다시 부를 때 되돌려 보낸다. 앱은 비어 있으면(`isEmpty`) 아예 안 보낸다.

응답 `ClassifyMemoResponse`

| 필드 | 타입 | 필수 | 기본값 | 설명 |
| --- | --- | --- | --- | --- |
| `axes` | `Record<String, VisitAxisResponse>` | 선택 | `{}` | |
| `sentences` | String[] | 선택 | `[]` | 메모를 문장으로 나눈 것. **인덱스가 `labels`의 키다** |
| `labels` | `Record<String,String>` | 선택 | `{}` | |
| `patientNotes` | String[] | 선택 | `[]` | 어느 항목에도 안 들어간 문장 |
| `followUp` | `FollowUpResponse?` | 선택 | null | |

> **실패해도 화면은 연다.** `VisitRecordViewModel.load` 주석: *"환자는 방금 메모를 적었고 그것이 이 흐름에서 잃으면 안 되는 값이다. AI가 답하지 않았다고 화면 전체를 실패로 두면 손으로 적어 저장할 길까지 막힌다. 그때는 빈 네 줄이 열리고 캡션이 붙지 않는다."*
> 코드도 `as? ApiResult.Success`로 **실패를 조용히 null 처리**한다.

### 7.6 기록 축(axis) id와 라벨 (`VisitMapping.kt`)

| axis id | 화면 라벨 |
| --- | --- |
| `findings` | 소견 |
| `tests` | 검사 |
| `medication_instructions` | 약 |
| `follow_up` | 재방문 |
| 그 외 | **axis id를 그대로 쓴다** |

> *"**모르는 축은 뒤에 그 순서대로 붙인다** — 항목 이름이 닫힌 목록이 아니라 AI가 늘릴 수 있고, 아는 것만 그리면 환자가 적은 줄이 사라진다."*
> *"**값이 있는 축만 남긴다.** 서버가 못 찾은 항목은 빈 값이 아니라 키가 없고, 값이 비었다는 것은 환자가 지웠다는 뜻이다."*

재방문 줄 꼬리: `"(" + date("M월 d일") + (approximate ? " 전후" : "") + ")"` → `(9월 27일 전후)`

---

## 8. 병원 검색 — `visit/data/HospitalApi.kt`

### 8.1 `GET api/hospitals`

```kotlin
@GET("api/hospitals")
suspend fun hospitals(@Query("q") query: String, @Query("size") size: Int): HospitalSearchResponse
```

| 쿼리 | 타입 | 필수 | 앱이 보내는 값 |
| --- | --- | --- | --- |
| `q` | String | **필수** | 검색어(앱이 `trim()`) |
| `size` | Int | **필수** | **20** (`PAGE_SIZE`) |

응답 `HospitalSearchResponse`

| 필드 | 타입 | 필수 | 기본값 | 설명 |
| --- | --- | --- | --- | --- |
| `hospitals` | `HospitalResponse[]` | 선택 | `[]` | |
| `totalCount` | Int | 선택 | `0` | **조건에 맞는 전체 건수.** 받은 목록보다 클 수 있다 |

`HospitalResponse`

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `name` | String | **필수** | |
| `address` | String? | 선택 | **같은 이름의 다른 지점을 구별할 수 있는 유일한 값.** 심평원에 없는 곳은 비어 있을 수 있다(Backend#80) |

### 8.2 검색 동작 규칙 (`HospitalRepository` · `HospitalPickViewModel`)

| 규칙 | 내용 |
| --- | --- |
| 원천 | 심평원 병원정보서비스. **서버가 목록을 들고 있지 않다** → *"복사해 두면 바로 낡는다"* → **앱도 캐시하지 않는다**(세션 내 메모리 캐시만) |
| 매칭 | **부분 일치. "서울"로 4천 건이 넘게 나온다** |
| 빈 검색어 | **부르지 않는다.** `q`가 필수이고 무엇이든 받으면 수천 건이 온다 |
| 디바운스 | `DEBOUNCE_MILLIS = 300L` — **300ms** 후 호출. 주석: *"한글은 한 글자에 두세 번 바뀐다. 조합이 끝나기를 기다리는 값이기도 하다."* 기다리는 동안 **보이는 목록에서 먼저 좁힌다**(`name.contains(keyword, ignoreCase = true)`, 서버 결과의 부분집합이라 없던 병원이 나타나지 않는다) |
| 로컬 좁히기 0건 | **목록을 그대로 둔다**(`if (narrowed.isEmpty()) state else …`). *"보이는 20곳에 없다고 전국에 없는 것이 아니다."* |
| 서버 0건 처리 | **직전 결과를 남긴다**(`result.value.hospitals.ifEmpty { state.results }`). *"한글은 마지막 글자가 조합되는 동안 중간 상태가 되어 한 글자마다 목록이 비었다 찼다 한다"*. 이때 `total`은 **서버 값으로 갈아끼운다** — 목록은 옛것, 건수는 새것이 된다 |
| 선택 유지 | 새 결과에 고른 병원이 없으면 선택을 푼다(`state.selected?.takeIf { it in result.value.hospitals }`) |
| 캐시 | 검색어 → 결과의 **메모리 맵**(`cache[keyword]`). 맞으면 디바운스도 요청도 건너뛴다. ViewModel이 살아 있는 동안만이다 |
| 빈 검색어 | 요청 없이 `results = []`, `selected = null`, `total = 0`, `failed = false`로 되돌린다 |
| 잘림 표시 | `total > hospitals.size`이면 안내 문구를 띄운다 |

화면 문구(원문):

| 리소스 | 문구 |
| --- | --- |
| `hospital_pick_result_searching` | `찾는 중이에요` |
| `hospital_pick_result_none` | `검색 결과 없음` |
| `hospital_pick_result_failed` | `지금은 찾지 못했어요. 잠시 뒤 다시 해주세요.` |
| `hospital_pick_result_truncated` | `%1$d곳 중 %2$d곳이에요. 이름을 더 적으면 좁혀져요.` |
| `hospital_pick_empty_title` | `아직 검색 기록이 없어요` |
| `hospital_pick_empty_description` | `병원 명을 입력하면 진료받을 병원을 찾을 수 있어요` |
| `hospital_pick_description_before` | `아직 정하지 않았다면 건너뛰어도 돼요.\n진료 후에 등록할 수 있어요.` |
| `hospital_pick_submit_before` | `브리핑 카드 만들기` |

> **웹앱 주의**: 한글 IME 조합 중 검색이 튀는 문제는 웹에서도 똑같이 난다. `compositionstart`/`compositionend`를 보고 조합 중에는 요청을 보내지 않거나, 안드로이드처럼 "0건이면 직전 결과 유지" 규칙을 그대로 쓴다.

---

## 9. 캘린더 일정 도메인 — `calendar/data/AppointmentApi.kt`

파일 주석:

> 날짜 경계는 서버가 한국 시각으로 자른다. UTC로 자르면 오전 9시 이전 일정이 전날로 밀린다.
> **D-day는 앱이 센다.** 문서가 "서버가 계산하면 사용자 시간대와 어긋날 때 하루 틀립니다"라고 적었고, 실제로 날짜만 오고 남은 날수는 오지 않는다.
> **날짜와 시각이 따로 온다**(#202). (…) `scheduledTime`이 없으면 시간 미정이다.

### 9.1 `GET api/me/appointments`

| 쿼리 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `year` | Int? | 선택 | `month`와 함께 주면 그 달 |
| `month` | Int? | 선택 | 1~12 (`YearMonth.monthValue`) |
| `date` | String? (`yyyy-MM-dd`) | 선택 | 주면 그 하루 |

주석: *"`date`를 주면 그 하루, `year`·`month`를 주면 그 달이다."* — 앱은 둘을 섞어 보내지 않는다(`month()`는 year+month만, `day()`는 date만).

응답: `AppointmentResponse[]`

### 9.2 `GET api/me/appointments/upcoming`

> 주석: *"아직 안 지났고 취소되지 않은 것만 가까운 순으로 온다."*

응답: `AppointmentResponse[]`

### 9.3 `AppointmentResponse` (캘린더 도메인)

| 필드 | 타입 | 필수 | 기본값 | 설명 |
| --- | --- | --- | --- | --- |
| `appointmentId` | Long | **필수** | — | |
| `clinicName` | String? | 선택 | null | |
| `department` | String? | 선택 | null | |
| `purpose` | String? | 선택 | null | `"재진"`처럼 무엇 하러 가는지 |
| `scheduledOn` | String (`yyyy-MM-dd`) | **필수** | — | |
| `scheduledTime` | String? (`HH:mm:ss`) | 선택 | null | **없으면 시간 미정** |
| `status` | String? | 선택 | null | `SCHEDULED` / `DONE` / `CANCELED` |
| `origin` | String? | 선택 | null | `VISIT_FOLLOW_UP`이면 진료 후 기록에서 생긴 것 |
| `cards` | `LinkedCardResponse[]` | 선택 | `[]` | 가져갈 카드. **여러 장 붙을 수 있다** |
| `todos` | `TodoResponse[]` | 선택 | `[]` | **홈 도메인 타입에는 없는 필드** |

`TodoResponse` — 진료 전 할 일 한 줄

| 필드 | 타입 | 필수 | 기본값 |
| --- | --- | --- | --- |
| `text` | String | **필수** | — |
| `done` | Boolean | 선택 | `false` |

> **서버가 todo에 id를 매기지 않는다.** *"화면의 key는 앱이 차례로 만든다 — 같은 글이 두 줄 있을 수 있어 글을 key로 쓸 수 없다."*

일정 제목은 서버가 주지 않는다. 앱이 `listOfNotNull(clinicName, department, purpose).joinToString(" ")`로 만들고, 비면 `cards[0].title`을 쓴다. → `서울OO병원 내과 재진`

### 9.4 `POST api/me/appointments`

요청 `CreateAppointmentRequest`

| 필드 | 타입 | 필수 | 기본값 | 설명 |
| --- | --- | --- | --- | --- |
| `clinicName` | String? | 선택 | null | |
| `department` | String? | 선택 | null | |
| `purpose` | String? | 선택 | null | |
| `scheduledOn` | String (`yyyy-MM-dd`) | **필수** | — | **이것만 필수다** |
| `scheduledTime` | String? (`HH:mm:ss`) | 선택 | null | 빼면 "시간 미정"으로 만들어진다 |
| `cardIds` | Long[] | 선택 | `[]` | 카드 연결은 선택 |
| `origin` | String? | 선택 | null | 앱은 `MANUAL`이면 **안 보낸다** |
| `todos` | `TodoResponse[]` | 선택 | `[]` | |

> 앱 규칙: `origin = appointment.origin.takeIf { it != AppointmentOrigin.MANUAL }?.name`
> → 보내는 값은 `"VISIT_FOLLOW_UP"` 하나뿐이다.
>
> 시각 포맷: `DateTimeFormatter.ofPattern("HH:mm:ss")`. 주석: *"초를 늘 적는다. `LocalTime.toString()`은 초가 0이면 생략해서 `10:00`을 만드는데, 정각으로 잡은 일정만 다른 모양으로 나가는 것이 좋지 않다."* → **웹앱도 `padStart`로 `HH:mm:ss`를 고정하라.**

### 9.5 `PATCH api/me/appointments/{appointmentId}`

> **`clearTime` 플래그가 이 계약의 핵심이다.**
> 주석: *"**시각을 다시 미정으로 되돌리려면 `clearTime`을 세운다.** `scheduledTime = null`은 '안 바꿈'이다. null을 두 뜻으로 쓰면 시각을 지울 방법이 없어서 서버가 플래그를 따로 뒀다."*
> *"**날짜는 지울 수 없다.** 날짜 없는 일정은 캘린더에 그릴 자리가 없다."*

요청 `UpdateAppointmentRequest` — **전부 nullable, null = "안 바꿈"**

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `clinicName` | String? | 선택 | |
| `department` | String? | 선택 | |
| `purpose` | String? | 선택 | |
| `scheduledOn` | String? | 선택 | 지울 수 없다 |
| `scheduledTime` | String? | 선택 | |
| `clearTime` | Boolean? | 선택 | `true`면 시각을 미정으로 되돌린다 |
| `status` | String? | 선택 | |
| `cardIds` | Long[]? | 선택 | **통째로 갈아끼운다.** `null`=안 바꿈, `[]`=전부 뗌 |
| `todos` | `TodoResponse[]?` | 선택 | **통째로 갈아끼운다.** 화면에 있는 것을 전부 보내야 한다 |

앱의 배타 처리(`AppointmentRepository.update`):

```kotlin
// 시각을 지우는 요청에는 시각을 싣지 않는다. 서버가 둘을 함께 받으면 어느 쪽인지 모른다.
scheduledTime = edit.time?.format(SERVER_TIME).takeUnless { edit.clearTime },
clearTime = true.takeIf { edit.clearTime },
```

→ **`scheduledTime`과 `clearTime`을 절대 같이 보내지 않는다.**

> ⚠️ **DTO에 있는 필드와 앱이 실제로 보내는 필드가 다르다.** `DefaultAppointmentRepository.update()`가 채우는 것은 여섯뿐이다 — `purpose` · `scheduledOn` · `scheduledTime` · `clearTime` · `cardIds` · `todos`.
>
> | 필드 | 앱이 보내는가 | 비고 |
> | --- | --- | --- |
> | `purpose` · `scheduledOn` · `scheduledTime` · `clearTime` · `cardIds` · `todos` | O | 화면의 `AppointmentEdit`에 자리가 있다 |
> | `clinicName` | **X** | `AppointmentEdit`에 필드 자체가 없다 — **일정을 만든 뒤에는 병원을 고칠 수 없다** |
> | `department` | **X** | 〃 |
> | `status` | **X** | 〃 — **앱에 일정을 "완료"·"취소"로 바꾸는 경로가 없다.** 서버가 받는 필드이지만 앱은 읽기만 한다(§9.7) |
>
> **웹앱**: 계약은 셋을 다 받으므로, 안드로이드에 없던 "병원 바꾸기"·"일정 취소"를 웹에서 새로 열 수 있다. 다만 서버가 그 값을 실제로 반영하는지는 **앱 코드로 확인되지 않은 자리**다(§19).

### 9.6 `DELETE api/me/appointments/{appointmentId}`

요청·응답 본문 없음.

### 9.7 앱이 정한 해석 규칙

```kotlin
private fun statusOf(value: String?) = when (value) {
    "DONE" -> DONE
    "CANCELED" -> CANCELED
    else -> SCHEDULED          // 모르는 값은 예정
}
private fun originOf(value: String?) =
    if (value == "VISIT_FOLLOW_UP") VISIT_FOLLOW_UP else MANUAL   // 모르는 값은 손으로 만든 것
```

주석: *"서버가 상태를 늘렸을 때 일정을 숨기는 것보다 보여주는 편이 낫다. 캘린더에서 사라지면 사용자가 일정을 잃었다고 본다."*

시각 파싱은 `runCatching { LocalTime.parse(value) }.getOrNull()` — **못 읽으면 시간 미정으로 본다.** *"일정 하나 때문에 캘린더 전체가 죽는 것보다 낫다."*

### 9.8 재방문 일정 자동 생성 (`FollowUpAppointmentScheduler`)

**서버가 하지 않고 앱이 한다.** `FollowUpScheduler` 주석: *"**서버는 기록에서 일정을 만들지 않는다.** 문서가 '환자가 보고 등록하는 흐름'으로 못 박았고, AI가 날짜를 잘못 뽑아도 조용히 일정이 생기지 않아야 한다."*

기록 저장(`POST api/cards/{cardId}/visit`)이 성공하면 앱이 이어서 — **판정이 두 파일에 갈려 있다:**

`VisitRecordViewModel.scheduleFollowUp` (저장 성공 직후, 부르기 전에 거른다)

1. `record.followUp?.date`가 없으면 **부르지 않는다**
2. **재방문 날짜가 진료일(`visitedOn`)보다 뒤가 아니면 부르지 않는다** — `if (!on.isAfter(visitedOn)) return`. 주석: *"지난 날짜는 예정이 아니다."*

`FollowUpAppointmentScheduler.schedule` (`calendar` 도메인)

3. `clinic`이 없거나 공백뿐이면 **만들지 않는다** (서버가 일정에 병원을 요구)
4. `GET api/me/appointments?date=<재방문일>`로 그 날 일정을 읽는다. **실패하면 빈 목록으로 본다**(`as? ApiResult.Success ... .orEmpty()`) → 그 경우 중복 검사가 통과해 일정이 둘이 될 수 있다
5. 취소되지 않은 일정(`status != CANCELED`) 중 **같은 cardId가 붙은 것이 이미 있으면 만들지 않는다** (중복 방지). 주석: *"취소는 안 간 것이라 그 자리에 다시 잡을 수 있어야 한다."*
6. 없으면 `POST api/me/appointments` — `clinicName`, `scheduledOn`, `cardIds=[cardId]`, `origin="VISIT_FOLLOW_UP"`, **시각은 비움**(`department`·`purpose`·`todos`도 안 보낸다)

**실패해도 기록 저장은 성공이다.** *"기록이 본체고 일정은 덧붙이는 것이라, 일정을 못 만들어도 저장은 성공이다. 구현이 실패를 삼킨다."*

---

## 10. 건강 프로필 — `profile/data/HealthProfileApi.kt`

파일 주석: *"프로필이 없어도 404가 아니라 빈 값이 온다."*

### 10.1 `GET api/me/health-profile`

응답 `HealthProfileResponse`

| 필드 | 타입 | 필수 | 기본값 | 설명 |
| --- | --- | --- | --- | --- |
| `name` | String? | 선택 | null | **카카오에서 받은 값이 채워져 온다** |
| `birthYear` | Int? | 선택 | null | |
| `birthMonthDay` | String? | 선택 | null | |
| `age` | Int? | 선택 | null | 서버가 계산 |
| `sex` | String? | 선택 | null | `MALE` / `FEMALE` |
| `medications` | `ListFieldResponse?` | 선택 | null | 복용약 |
| `conditions` | `ListFieldResponse?` | 선택 | null | 기저질환 |
| `allergies` | `TextFieldResponse?` | 선택 | null | 알레르기(**한 줄**) |
| `sources` | `SourcesResponse?` | 선택 | null | 값의 출처 |
| `onboardingCompleted` | Boolean | 선택 | `false` | **온보딩을 실제로 마쳤는지.** 카카오 값이 채워진 것만으로는 false |
| `canStartIntake` | Boolean | 선택 | `false` | **문답을 시작할 수 있는지.** 나이와 성별이 있어야 true |

> `canStartIntake` 주석: *"없이 `POST /api/sessions`를 부르면 400이 온다."*
> **웹앱**: 증상 정리 진입 버튼을 이 값으로 막아야 한다.

`ListFieldResponse`

| 필드 | 타입 | 필수 | 기본값 |
| --- | --- | --- | --- |
| `status` | String? | 선택 | null (`KNOWN` / `NONE` / `UNKNOWN`) |
| `items` | String[] | 선택 | `[]` |

`TextFieldResponse`

| 필드 | 타입 | 필수 | 기본값 |
| --- | --- | --- | --- |
| `status` | String? | 선택 | null |
| `text` | String? | 선택 | null |

`SourcesResponse` — 값이 카카오에서 온 것인지 사용자가 넣은 것인지

| 필드 | 타입 | 필수 | 값 |
| --- | --- | --- | --- |
| `name` | String? | 선택 | `KAKAO` 또는 `SELF_INPUT` |
| `birthYear` | String? | 선택 | 〃 |
| `sex` | String? | 선택 | 〃 |

### 10.2 `PUT api/me/health-profile` — 통째로 덮어쓰기

> 주석: *"**단계별 저장이 없다.** 서버 문서가 '온보딩 5단계를 모아 한 번에 저장합니다'라고 적었고, 요청도 부분 갱신이 아니라 여섯 필드를 모두 요구한다. 1b가 묻지 않는 이름·출생연도·성별은 읽어 온 값을 그대로 되돌려 보낸다."*
> *"여섯 필드가 모두 필수다. **null을 보내면 400이다.**"*

요청 `HealthProfileRequest`

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `name` | String | **필수** | 읽어 온 값을 되돌려 보낸다 |
| `birthYear` | Int | **필수** | 〃 |
| `birthMonthDay` | String? | 선택 | 유일하게 nullable |
| `sex` | String | **필수** | 〃 |
| `medications` | `ListFieldRequest` | **필수** | |
| `conditions` | `ListFieldRequest` | **필수** | |
| `allergies` | `TextFieldRequest` | **필수** | |

> ⚠️ **이름·출생연도·성별 중 하나라도 없으면 앱이 서버를 부르지 않는다.** `HealthProfileRepository.save`가 `ApiResult`가 아니라 **`ApiResult<HealthProfile>?`를 돌려주고 `null`을 낸다:**
>
> ```kotlin
> val name = base.name; val birthYear = base.birthYear; val sex = base.sex
> if (name == null || birthYear == null || sex == null) return null
> ```
>
> 주석: *"서버가 셋을 필수로 두고 있어 없는 채로 보내면 400이고, 그 셋은 카카오에서 채워져 오는 값이라 화면에서 받을 자리가 없다. `ApiResult.Rejected`가 아닌 이유는 서버에 물어보지도 않았기 때문이다."*
>
> **웹앱**: 성공·거절·네트워크 세 갈래 밖에 **"부르지 않음"이라는 네 번째 상태가 있다.** 이 갈래를 없애고 그냥 요청을 보내면 400을 받는다. 반대로 `Rejected`와 뭉개면 "다시 눌러주세요"가 뜨는데 몇 번을 눌러도 같은 일이 벌어진다. 프로필에 이름/출생연도/성별이 비어 있을 때 갈 화면(카카오 값 재동기화 또는 직접 입력)이 웹에서는 별도로 필요하다.

`ListFieldRequest`

| 필드 | 타입 | 필수 | 기본값 |
| --- | --- | --- | --- |
| `status` | String | **필수** | `KNOWN` / `NONE` / `UNKNOWN` |
| `items` | String[] | 선택 | `[]` |

> *"`status`가 `NONE`이면 `items`는 비어 있어야 의미가 맞는다. 서버가 강제하지는 않는다."*

`TextFieldRequest`

| 필드 | 타입 | 필수 | 기본값 |
| --- | --- | --- | --- |
| `status` | String | **필수** | |
| `text` | String | 선택 | `""` |

### 10.3 클라이언트가 지키는 길이 제한

`HealthProfileRepository` — *"서버가 막는 길이. 넘겨 보내면 400이라 잘라서 보낸다."*

| 상수 | 값 | 적용 |
| --- | --- | --- |
| `ITEM_MAX_LENGTH` | 50 | `medications`/`conditions`의 각 item |
| `ITEM_MAX_COUNT` | 20 | `medications`/`conditions`의 item 개수 |
| `TEXT_MAX_LENGTH` | 200 | `allergies.text` |

### 10.4 알레르기만 문자열 하나다

> *"화면은 셋 다 칩으로 받는데 서버가 알레르기만 문자열 하나를 받는다. 고른 것을 쉼표로 잇는다."*

- 보낼 때: `items.joinToString(", ")` → `"땅콩, 페니실린"`
- 읽을 때: `text.split(",").map(String::trim).filter(String::isNotEmpty)`

카드(`CardHealth.kt`)도 같은 규칙으로 나누지만 **함수를 공유하지 않는다** — *"한 도메인이 다른 도메인을 직접 참조하지 않고, 두 응답이 지금 같아 보여도 같이 움직인다는 보장이 없다."*

### 10.5 `status` 해석의 함정

```kotlin
private fun statusOf(status: String?, items: List<String>): HealthStatus =
    HealthStatus.entries.firstOrNull { it.name == status }
        ?: if (items.isEmpty()) HealthStatus.UNKNOWN else HealthStatus.KNOWN
```

- 서버가 `status`를 안 주면 값 유무로 가늠한다.
- **화면에 "없어요"를 고를 자리가 없다**(#67, #150). 그래서 아무것도 고르지 않고 넘기면 `UNKNOWN`으로 보낸다.
- 부작용: *"서버에 `NONE`으로 있던 갈래를 손대지 않고 저장하면 `UNKNOWN`으로 내려간다."* → **웹앱에서 고칠 기회가 있는 알려진 결함이다.**

화면 문구: `profile_setup_save_failed` = `저장하지 못했어요. 다시 눌러주세요.`

---

## 11. 계정 설정 — `profile/data/SettingsApi.kt`

> **값이 하나뿐이다.** 주석: *"진료 하루 전 알림을 받을지다. 나머지 토글 둘('브리핑 카드 자동 저장'·'진료실 화면 밝기 최대')은 이 기기에서 어떻게 보일지의 문제라 서버가 읽을 일이 없고 `DataStore`에 둔다(Backend#85)."*
> *"이 값만 계정에 붙는 이유는 받을지 말지가 기기 취향이 아니라 **그 사람의 선택**이기 때문이다. 기기를 바꾸거나 앱을 다시 깔면 '안 받겠다'고 한 사람에게 알림이 다시 간다."*
> *"**알림을 예약하는 것은 여전히 앱이다.** 이 값은 예약할지 말지를 정하는 값이다."*

`GET api/me/settings` 응답 / `PATCH api/me/settings` 응답 — `SettingsResponse`

| 필드 | 타입 | 필수 | 기본값 |
| --- | --- | --- | --- |
| `visitReminderEnabled` | Boolean | 선택 | `true` |

`PATCH` 요청 `SettingsRequest`

| 필드 | 타입 | 필수 |
| --- | --- | --- |
| `visitReminderEnabled` | Boolean | **필수** |

**웹앱**: 나머지 토글 둘은 서버에 없다. `localStorage`(안드로이드의 `LocalSettingsStore` 대응)로 옮긴다. 알림 예약 자체도 서버가 하지 않으므로, 웹에서는 Web Push + Service Worker를 직접 붙이거나 기능을 빼야 한다(리스크 항목 참고).

---

## 12. `ApiResult` — 실패를 값으로 다루기

### 12.1 세 갈래

`core/network/ApiResult.kt`

```kotlin
sealed interface ApiResult<out T> {
    data class Success<out T>(val value: T) : ApiResult<T>

    data class Rejected(
        val code: ApiErrorCode,
        val message: String?,
        val requestId: String?,
        val retryable: Boolean,
        val details: JsonObject? = null,
    ) : ApiResult<Nothing>

    data class NetworkUnavailable(val cause: IOException) : ApiResult<Nothing>
}
```

| 갈래 | 뜻 | 웹앱 대응 |
| --- | --- | --- |
| `Success<T>` | 2xx, 본문 파싱 성공 | `{ kind: 'success', value }` |
| `Rejected` | **서버가 에러 봉투로 응답** (HTTP 4xx/5xx) | `res.ok === false` |
| `NetworkUnavailable` | **서버에 닿지 못함.** 응답이 없으므로 에러 코드도 없다 | `fetch`가 reject (TypeError) / AbortError |

주석: *"예외로 계층을 넘기면 호출자가 어떤 예외를 잡아야 하는지 타입에 드러나지 않고, 결국 `catch (e: Exception)`으로 뭉개게 된다. 갈래를 타입으로 열어두면 `when`이 빠진 분기를 컴파일 시점에 알려준다."*

`Rejected.requestId` 주석: *"서버 로그와 이어붙이는 유일한 열쇠다. 장애를 추적할 때 쓴다."*

### 12.2 `apiCall` — 무엇을 잡고 무엇을 안 잡는가

`core/network/ApiCall.kt`

```kotlin
internal suspend fun <T> apiCall(json: Json, block: suspend () -> T): ApiResult<T> = try {
    ApiResult.Success(block())
} catch (e: HttpException) {
    e.toRejected(json)
} catch (e: IOException) {
    ApiResult.NetworkUnavailable(e)
}
```

> **⚠️ 직렬화 실패는 잡지 않는다.**
> 주석: *"잡는 예외는 `HttpException`과 `IOException` 둘뿐이다. 그 밖의 예외는 그대로 올린다. 직렬화 실패 같은 것은 계약이 어긋났다는 뜻이고, 사용자에게 '다시 시도해주세요'를 띄워 감출 문제가 아니다."*
>
> 즉 **응답에 필수 필드가 빠지면 앱이 죽는다.** 필수 필드 목록(위 표의 "필수" 열)이 곧 크래시 조건이다. 날짜 파싱(`OffsetDateTime.parse(createdAt)`, `LocalDate.parse(scheduledOn)`)도 `runCatching`으로 감싸지 않은 곳은 같다.
>
> **웹앱**: 이 판단을 그대로 옮길지 결정해야 한다. zod로 파싱하고 실패를 `Rejected`의 새 갈래(`ContractViolation`)로 만드는 편이 웹에서는 안전하다 — 웹앱은 죽어도 새로고침이지만 흰 화면이 남는다.

> **응답 본문을 결과에 담지 않는다.** 주석: *"증상·복용약 같은 민감정보가 로그나 크래시 리포트로 새지 않게 하려는 백엔드 규칙을 앱에서도 지킨다."*

### 12.3 에러 봉투 `ApiErrorEnvelope`

`core/network/ApiError.kt` — *"OpenAPI 스키마 목록에는 없고 실제 응답으로 확인한 형태다."*

```json
{"error":{"code":"UNAUTHORIZED","message":"...","retryable":false},
 "meta":{"requestId":"req_61c3205bdfee"}}
```

| 경로 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `error.code` | String? | null | 아래 코드 표 |
| `error.message` | String? | null | 서버 메시지. **앱은 화면에 직접 쓰지 않는다** |
| `error.retryable` | Boolean | `false` | 다시 눌러 볼 여지가 있는지 |
| `error.details` | JsonObject? | null | **오류마다 다른 값**(Backend#117) |
| `meta.requestId` | String? | null | 서버 로그 추적 키 |

> `details` 주석: *"도메인 필드를 봉투에 직접 박으면 오류 종류가 늘 때마다 봉투가 늘고 파싱이 갈린다. 없으면 null이다."*

봉투 파싱 실패는 삼킨다(`runCatching { ... }.getOrNull()`) → 그때는 `code = UNKNOWN`, 나머지는 null, `retryable = false`.

### 12.4 `ApiErrorCode` 전체 목록

```kotlin
enum class ApiErrorCode {
    INVALID_REQUEST, UNAUTHORIZED, FORBIDDEN, NOT_FOUND,
    CARD_ALREADY_EDITED,
    UPSTREAM_ERROR, UPSTREAM_TIMEOUT, INTERNAL, UNKNOWN,
}
```

| 코드 | 의미 | 앱이 하는 일 |
| --- | --- | --- |
| `INVALID_REQUEST` | 400 계열. 나이/성별 없이 세션 시작, 확정된 카드 재확정, 길이 초과 | 화면마다 저장 실패 문구 |
| `UNAUTHORIZED` | **인증 실패와 토큰 만료가 똑같이 이 코드로 온다** | 재발급 경로에서 받으면 `TokenStore.clear()` → 로그인 화면 |
| `FORBIDDEN` | 권한 없음 | 일반 거절 처리 |
| `NOT_FOUND` | 없는 리소스 | 일반 거절 처리 |
| `CARD_ALREADY_EDITED` | **이미 고친 카드를 또 고치려 했다**(409, Backend#117) | `details.latestCardId`로 갈아타고 **한 번만** 재시도 |
| `UPSTREAM_ERROR` | 서버가 카카오나 AI 서비스에 닿지 못했다 | **네트워크 갈래로 묶는다**(로그인) |
| `UPSTREAM_TIMEOUT` | 〃 (타임아웃) | 〃 |
| `INTERNAL` | 서버 내부 오류 | 일반 거절 처리 |
| `UNKNOWN` | **목록 밖의 값은 전부 여기로 접힌다** | 일반 거절 처리 |

```kotlin
fun from(raw: String?): ApiErrorCode = entries.firstOrNull { it.name == raw } ?: UNKNOWN
```

> **중요 주석**: *"인증 실패와 토큰 만료가 똑같이 `UNAUTHORIZED`로 내려오므로 코드만으로는 구분할 수 없다. **어느 엔드포인트를 불렀는지로 판단해야 한다.**"*

### 12.5 `CARD_ALREADY_EDITED` 처리 (`CardRepository.latestCardId`)

```kotlin
internal fun ApiResult.Rejected.latestCardId(): Long? {
    if (code != ApiErrorCode.CARD_ALREADY_EDITED) return null
    return (details?.get("latestCardId") as? JsonPrimitive)?.longOrNull
}
```

주석: *"확정된 카드를 고치면 새 버전이 생기고 옛 id는 자식을 갖는다. 그 옛 id로 또 고치면 버전이 가지를 치는데, 가지에 넣은 편집은 목록이 최신 한 장만 내면서 어느 화면에도 나오지 않는다. 그래서 서버가 409로 막고 갈아탈 id를 함께 준다."*

`BriefCardViewModel`: *"서버가 '이미 고친 카드'라고 막으면 최신 카드로 갈아타고 **한 번만** 다시 보낸다."*

→ **웹앱에서 반드시 구현해야 하는 재시도 로직.** `details.latestCardId`는 `PATCH api/cards/{id}` 하나에만 온다.

### 12.6 `map` — 성공 값만 바꾼다

```kotlin
inline fun <T, R> ApiResult<T>.map(transform: (T) -> R): ApiResult<R> = when (this) {
    is ApiResult.Success -> ApiResult.Success(transform(value))
    is ApiResult.Rejected -> this
    is ApiResult.NetworkUnavailable -> this
}
```

모든 Repository가 이 모양으로 DTO → 도메인 타입 변환을 한다. 주석: *"갈래마다 `when`을 다시 쓰면 실패를 옮겨 담다 한 갈래를 빠뜨린다."*

### 12.7 화면별 에러 처리 방식 (실제 코드)

| 화면 | `Rejected` | `NetworkUnavailable` | 근거 |
| --- | --- | --- | --- |
| 로그인 | `UPSTREAM_ERROR`·`UPSTREAM_TIMEOUT` → NETWORK 문구, 그 외 → SERVER 문구 | NETWORK 문구 | `LoginViewModel.toFailure()` |
| 홈 | 둘을 **합쳐서** `HomeUiState.Failed` | 〃 | `HomeViewModel` |
| 카드 상세 | 둘을 합쳐서 `saveFailed = true` | 〃 | `BriefCardViewModel` |
| 카드 목록 | 둘을 합쳐서 Failed | 〃 | `BriefCardListViewModel` |
| 병원 검색 | 둘을 합쳐서 `failed = true` | 〃 | `HospitalPickViewModel` |
| **진료 후 기록 저장** | **`retryable`로 갈린다** → `RETRYABLE` / `REJECTED` | 항상 `RETRYABLE` | `VisitRecordViewModel.onSaveClick` |
| 문답 시작/복구 | 둘을 합쳐서 `restoreFailed` | 〃 | `IntakeSessionActions` |
| 건강 정보 편집 — 읽기 | **실패를 조용히 삼킨다.** `(result as? ApiResult.Success)?.value?.health.toUiState()` → 실패하면 **빈 화면이 열린다**(에러 표시 없음) | 〃 | `HealthEditViewModel.load` |
| 건강 정보 편집 — 저장 | 둘을 합쳐서 `saveFailed = saved !is ApiResult.Success` | 〃 | `HealthEditViewModel.onSaveClick` |
| 메모 자동 분류 | **실패를 조용히 삼킨다**(`as? ApiResult.Success`). 빈 네 줄이 열리고 캡션이 붙지 않는다 | 〃 | `VisitRecordViewModel.load` |

> ⚠️ **건강 정보 저장의 `saveFailed`에는 갈래가 하나 더 숨어 있다.** `repository.save()`가 `null`(= 이름·출생연도·성별이 없어 **서버를 부르지도 않음**, §10.2)을 줄 때도 `saved !is ApiResult.Success`가 참이라 같은 문구가 뜬다. 그러면 `저장하지 못했어요. 다시 눌러주세요.`가 뜨는데 **몇 번을 눌러도 같은 자리에 머문다.** 웹앱에서 갈래를 갈라야 하는 자리다.
>
> ⚠️ **읽기 실패를 삼키는 두 화면(건강 정보 편집·메모 자동 분류)은 "빈 상태"와 "실패"가 화면에서 구별되지 않는다.** 건강 정보 쪽은 한 발 더 나간다 — 읽기가 실패하면 `profile`이 null이고, `onSaveClick`의 첫 줄이 `val base = profile ?: return`이라 **저장 버튼이 아무 반응도 하지 않는다.** 스피너도 에러 문구도 없다(`saving`조차 세우기 전에 반환한다). 웹앱에서는 읽기 실패를 실패로 그리고, 그 상태에서 저장 버튼을 눌리지 않게 막아야 한다.

**유일하게 `retryable`을 읽는 곳이 진료 후 기록 저장이다:**

```kotlin
is ApiResult.Rejected ->
    update { it.copy(saveFailure = if (result.retryable) VisitSaveFailure.RETRYABLE else VisitSaveFailure.REJECTED) }
```

| 갈래 | 문구(원문) |
| --- | --- |
| `RETRYABLE` | `저장하지 못했어요. 다시 눌러주세요.` |
| `REJECTED` | `다시 눌러도 저장되지 않아요. 브리핑 카드를 먼저 저장해야 기록을 남길 수 있어요.` |

---

## 13. `AuthInterceptor` — 헤더 붙이기

`core/network/AuthInterceptor.kt`

```kotlin
override fun intercept(chain: Interceptor.Chain): Response {
    val accessToken = runBlocking { accessTokenProvider.accessToken() }
    val request =
        if (accessToken.isNullOrBlank()) {
            chain.request()
        } else {
            chain.request().newBuilder()
                .header("Authorization", "Bearer $accessToken")
                .build()
        }
    return chain.proceed(request)
}
```

| 규칙 | 내용 |
| --- | --- |
| 헤더 이름 | `Authorization` |
| 값 | `Bearer {accessToken}` (공백 하나) |
| 토큰이 없거나 공백뿐 | **헤더 없이 그대로 보낸다** |
| 예외 경로 | 없음. 인터셉터가 경로를 가리지 않는다 — 로그인/재발급도 토큰이 있으면 헤더가 붙어 나가고, 서버가 무시한다 |
| 토큰 출처 | `AccessTokenProvider` 인터페이스 → 구현은 `auth/data/TokenStore`, Hilt가 연결 |

주석: *"`core`가 `auth` 도메인을 직접 참조하지 않게 하려고 둔 인터페이스다. (…) 반대로 두면 공용 계층이 특정 도메인에 묶여서 다른 도메인이 `core`를 쓸 때마다 `auth`가 따라온다."*

**웹앱**: fetch wrapper 하나가 같은 일을 한다. 토큰 저장소는 반드시 비동기(`await getAccessToken()`)로 두어야 IndexedDB/쿠키 기반으로 갈아탈 여지가 남는다.

---

## 14. `TokenAuthenticator` — 401 재발급

`core/network/TokenAuthenticator.kt`

### 14.1 동작 순서

```
요청 → 401 응답
  ├─ 실패한 요청에 Authorization 헤더가 없었다  → null (포기, 401을 그대로 올린다)
  ├─ 이미 한 번 재시도한 요청이다(priorResponse ≥ 1) → null (포기)
  └─ 뮤텍스 획득
       ├─ 저장된 토큰을 다시 읽는다
       ├─ 저장된 토큰이 있고 실패한 헤더와 **다르면** → 그 토큰으로 재요청 (재발급 안 함)
       └─ 같으면 → TokenRefresher.refresh()
              ├─ 새 토큰(공백 아님) → Authorization 갈아끼워 재요청
              └─ null 또는 공백    → null (포기)
```

### 14.2 규칙과 이유(주석 그대로)

| 규칙 | 코드 | 이유 |
| --- | --- | --- |
| **재발급은 한 번만 돈다** | `Mutex().withLock` | *"화면 하나가 여러 API를 동시에 부르면 401도 동시에 온다. 그때 각자 재발급하면 서버가 refresh 토큰을 회전시키므로 뒤에 도착한 요청이 이미 폐기된 토큰을 들고 가서 실패한다."* |
| **잠금을 얻은 뒤 저장소를 다시 읽는다** | `validTokenOrRefresh` | *"잠금을 기다리는 동안 다른 요청이 이미 재발급했을 수 있다. 저장된 토큰이 실패한 것과 다르면 그것을 쓴다."* |
| **토큰 없이 보낸 요청은 대상이 아니다** | `request.header(AUTHORIZATION)` null 체크 | *"로그인처럼 인증이 필요 없는 경로가 401을 주면 자격증명 문제가 아니라 서버의 거절이다."* |
| **재시도는 1회뿐** | `MAX_RETRY = 1`, `retryCount() < MAX_RETRY` | *"이미 다시 보낸 요청이 또 401이면 재발급으로 풀릴 문제가 아니다. 멈추지 않으면 OkHttp가 자체 상한까지 같은 왕복을 반복한다."* |
| **재발급은 AuthFree 경로로** | `@AuthFree AuthApi` | *"같은 클라이언트를 쓰면 그 호출의 401이 다시 여기로 들어온다."* |

`retryCount()`는 `priorResponse` 체인을 세어 재시도 횟수를 판단한다.

### 14.3 테스트가 보증하는 동작 (`TokenAuthenticatorTest`)

| 테스트 이름 | 결과 |
| --- | --- |
| `401을 받으면 새 토큰으로 다시 보낸다` | 헤더가 `Bearer fresh`로 바뀐다 |
| `재발급하지 못하면 포기한다` | `null` |
| `빈 토큰을 받으면 포기한다` | 재발급이 `"  "`를 주면 `null` |
| `토큰 없이 보낸 요청은 재발급하지 않는다` | refresh 호출 **0회** |
| `다시 보낸 요청이 또 401이면 멈춘다` | refresh 호출 **0회** |
| `이미 갈린 토큰이 있으면 재발급하지 않고 그것으로 보낸다` | refresh 호출 **0회**, `Bearer rotated` |
| `동시에 401을 받아도 재발급은 한 번만 돈다` | 동시 2건 → refresh 호출 **1회**, 둘 다 `Bearer fresh` |

**웹앱은 이 7가지를 그대로 테스트로 옮겨라.** 특히 마지막 항목(동시 401 → 재발급 1회)은 웹에서 Promise 하나를 공유하는 패턴(`let refreshPromise: Promise<string|null> | null`)으로 구현한다.

---

## 15. `TokenRefresher` / `TokenStore` — 토큰 수명 관리

### 15.1 `DefaultTokenRefresher`

```kotlin
override suspend fun refresh(): String? {
    val refreshToken = tokenStore.readRefreshToken() ?: return null
    return when (val result = apiCall(json) { api.refresh(RefreshRequest(refreshToken)) }) {
        is ApiResult.Success -> {
            tokenStore.save(accessToken = result.value.accessToken, refreshToken = result.value.refreshToken)
            result.value.accessToken
        }
        is ApiResult.Rejected -> {
            if (result.code == ApiErrorCode.UNAUTHORIZED) tokenStore.clear()
            null
        }
        is ApiResult.NetworkUnavailable -> null
    }
}
```

| 상황 | 토큰 저장소 | 이유 |
| --- | --- | --- |
| 성공 | **access와 refresh 둘 다 갈아끼운다** (refresh가 회전한다) | |
| `Rejected` + `UNAUTHORIZED` | **지운다** | *"회전으로 이미 폐기된 토큰이라서 남겨두면 다음 호출마다 같은 실패를 반복한다."* |
| `Rejected` + 그 외 코드 | 지우지 않는다 | |
| `NetworkUnavailable` | **지우지 않는다** | *"아직 쓸 수 있는 토큰이고 연결이 돌아오면 그대로 통한다."* |

→ 토큰이 지워지면 `TokenStore.hasSession()` 흐름이 `false`를 흘리고 `SessionViewModel`이 로그인 화면으로 보낸다.
주석: *"재발급이 실패한 자리에서 화면을 옮길 방법이 없어서 그렇게 뒀다. 여기는 OkHttp 스레드이고 어느 화면이 떠 있는지 모른다."*

### 15.2 `TokenStore` (`auth`)

| 항목 | 값 |
| --- | --- |
| 저장 매체 | DataStore Preferences, 파일명 `"auth"` |
| 키 | `access_token`, `refresh_token` |
| 세션 판정 | **refresh 토큰이 있는지**로 본다. *"액세스 토큰은 만료돼도 재발급으로 이어갈 수 있어서 세션이 끝난 것이 아니다."* |
| 관찰 | `hasSession(): Flow<Boolean>` — *"세션이 화면 밖에서도 끝날 수 있기 때문"* |
| 카카오 토큰 | **여기 넣지 않는다.** SDK 자체 저장소에 있고 서버도 저장하지 않는다 |
| 암호화 | **평문이다.** 매니페스트에서 백업·기기 간 전송을 막는 것으로 대신했다 |

주석: *"루팅된 기기까지 막으려면 AndroidKeyStore 기반 암호화가 필요한데, 설치 사용자가 없는 지금은 저장 방식을 바꾸는 비용이 재로그인 한 번이라 미뤘다."*

### 15.3 `restoreSession()` — 자동 로그인

`DefaultAuthRepository.restoreSession()`

```kotlin
val refreshToken = tokenStore.readRefreshToken() ?: return null   // 토큰이 없으면 null
val result = apiCall(json) { api.refresh(RefreshRequest(refreshToken)) }.toAuthResult()
if (result is AuthResult.Rejected && result.code == ApiErrorCode.UNAUTHORIZED) {
    tokenStore.clear()
}
```

`DefaultTokenRefresher`와 **같은 판단**이다(`UNAUTHORIZED`만 지운다). 실패 문구: `login_restore_failed` = `자동 로그인을 확인하지 못했어요. 다시 로그인해주세요`

> ⚠️ **다만 클라이언트가 다르다.** 이 호출은 `DefaultAuthRepository`가 든 **기본** `AuthApi`로 나가므로 `AuthInterceptor`와 `TokenAuthenticator`를 탄다(§1.4). 성공 시 `toAuthResult()`가 `tokenStore.save(access, refresh)`로 **둘 다 갈아끼운다** — `DefaultTokenRefresher`와 같다.
>
> 그리고 이 응답의 `onboardingRequired`는 **서버가 `false`로 하드코딩한다**(§3.1). 자동 로그인 뒤 온보딩 판단은 반드시 `GET api/me/health-profile`의 `onboardingCompleted`로 해야 한다.

---

## 16. 화면에 뜨는 에러·상태 문구 원문 (`strings.xml`)

**웹앱에서 글자 그대로 재현한다.**

### 16.1 로그인

| 리소스 | 문구 |
| --- | --- |
| `login_failed_kakao` | `카카오 로그인에 실패했어요. 다시 시도해주세요` |
| `login_failed_network` | `인터넷 연결을 확인해주세요` |
| `login_failed_server` | `로그인에 실패했어요. 잠시 후 다시 시도해주세요` |
| `login_restore_failed` | `자동 로그인을 확인하지 못했어요. 다시 로그인해주세요` |
| `login_disclaimer` | `진료메이트가 정리한 내용은 진료를 돕기 위한 참고 자료예요.\n진단이나 처방이 아니니 최종 판단은 의료진과 상의해 주세요.` |

### 16.2 로딩 실패 (제목 / 설명 / 재시도)

| 화면 | 제목 | 설명 | 버튼 |
| --- | --- | --- | --- |
| 홈 | `불러오지 못했어요` | `인터넷 연결을 확인하고 다시 시도해주세요` | `다시 시도` |
| 브리핑 카드 상세 | `카드를 불러오지 못했어요` | `인터넷 연결을 확인하고 다시 시도해주세요` | `다시 시도` |
| 브리핑 카드 목록 | `카드를 불러오지 못했어요` | `인터넷 연결을 확인하고 다시 시도해주세요` | `다시 시도` |
| 기록 목록 | `기록을 불러오지 못했어요` | `인터넷 연결을 확인하고 다시 시도해주세요` | `다시 시도` |
| 기록 상세 | `기록을 불러오지 못했어요` | `인터넷 연결을 확인하고 다시 시도해주세요` | `다시 시도` |
| 진료 후 기록 정리 | `기록을 정리하지 못했어요` | `인터넷 연결을 확인하고 다시 시도해주세요` | `다시 시도` |
| 진료 후 기록 상세 | `기록을 불러오지 못했어요` | — | — |

### 16.3 저장 실패

| 리소스 | 문구 |
| --- | --- |
| `brief_card_save_failed` | `저장하지 못했어요. 다시 눌러주세요.` |
| `visit_record_save_failed` | `저장하지 못했어요. 다시 눌러주세요.` |
| `visit_record_save_rejected` | `다시 눌러도 저장되지 않아요. 브리핑 카드를 먼저 저장해야 기록을 남길 수 있어요.` |
| `profile_setup_save_failed` | `저장하지 못했어요. 다시 눌러주세요.` |
| `account_withdraw_failed` | `탈퇴하지 못했어요. 계정은 그대로 있어요` |

### 16.4 빈 상태

| 리소스 | 문구 |
| --- | --- |
| `home_empty_title` | `아직 진료 기록이 없어요` |
| `home_empty_description` | `증상을 정리해두면 진료실에서 바로 보여줄 수 있어요` |
| `home_empty_action` | `증상 정리하기` |
| `record_empty_title` | `아직 진료 기록이 없어요` |
| `record_empty_description` | `증상을 정리해두면 진료실에서 바로 보여줄 수 있어요` |
| `record_empty_action` | `증상 정리하기` |
| `brief_card_list_empty_title` | `아직 브리핑 카드가 없어요` |
| `brief_card_list_empty_description` | `증상을 정리해두면 진료실에서 바로 보여줄 수 있어요` |
| `brief_card_list_empty_action` | `증상 정리하기` |
| `hospital_pick_empty_title` | `아직 검색 기록이 없어요` |
| `hospital_pick_empty_description` | `병원 명을 입력하면 진료받을 병원을 찾을 수 있어요` |

### 16.5 상태 배지·데이터 파생 문구

| 리소스 | 문구 | 서버 필드와의 관계 |
| --- | --- | --- |
| `record_status_draft` | `작성 중` | card `status` |
| `record_status_before_visit` | `진료 전` | card `status != "CONFIRMED"` |
| `record_status_confirmed` | `진료 완료` | **card `visited == true`로 판단한다**(`status` 아님) |
| `brief_card_hospital_section` | `진료받을 병원` | `CardResponse.clinic` |
| `brief_card_hospital_change` | `변경` | `UpdateCardRequest.clinic` |
| `brief_card_hospital_unset` | `병원 미정` | `clinic`이 없을 때(1m-B 건너뛰기라 정상 상태) |
| (`CardMapping`) | `잘 모르겠어요` | axis `status == "UNKNOWN"` |
| (`CardMapping`) | `(확실하지 않아요)` | axis `status == "AMBIGUOUS"` 뒤에 붙음 |
| (`VisitMapping`) | `전후` | `followUp.approximate == true`일 때 `(9월 27일 전후)` |
| `account_withdraw_confirm_message` | `저장된 브리핑 카드와 진료 기록이 모두 삭제되고 되돌릴 수 없어요` | `DELETE api/me` |

---

## 17. 웹앱용 TypeScript 타입 정의 전체

> 그대로 복사해서 `src/lib/api/types.ts`로 쓸 수 있다.
> **네이밍 규칙**: 안드로이드에서 도메인마다 같은 이름을 쓰던 타입은 접두사로 갈랐다
> (`HomeAppointment` vs `Appointment`, `HomeCardSummary` vs `CardSummary`, `CardAxis` vs `VisitAxis`).
> `?`가 붙은 필드는 서버가 생략할 수 있거나 `null`로 올 수 있다(Kotlin의 nullable + default).

```ts
// ---------------------------------------------------------------------------
// MedicalMate 서버 API 타입 정의
// 원본: Android 앱 com.mist.medicalmate 의 *Api.kt @Serializable 데이터 클래스 전체
// base URL: https://d3f36x6ccm838d.cloudfront.net/   (env VITE_BACKEND_BASE_URL로 덮어쓰기)
// OpenAPI: https://jinryomate-backend.onrender.com/v3/api-docs
// ---------------------------------------------------------------------------

/* =========================================================================
 * 0. 공통 원시 타입
 * ========================================================================= */

/** `yyyy-MM-dd` — LocalDate.parse로 읽는 값. 예: "2026-09-27" */
export type IsoDate = string;

/** `HH:mm:ss` — 앱은 항상 초까지 붙여 보낸다. 예: "10:30:00" */
export type IsoTime = string;

/** 오프셋이 붙은 ISO-8601 — OffsetDateTime.parse로 읽는다. 예: "2026-09-04T10:22:31+09:00" */
export type IsoOffsetDateTime = string;

/**
 * 서버 id. 안드로이드에서는 전부 Kotlin `Long`(64비트)이다.
 *
 * ⚠️ JS `number`는 2^53-1까지만 정확하다. 지금 값의 크기로는 문제가 없지만, id를 만들어 내거나
 *    비교할 때 문자열로 바꿔 두면 나중에 서버가 snowflake 같은 큰 id로 바꿔도 깨지지 않는다.
 *    안드로이드도 화면 값(CardListItem.id · VisitListItem.id · Visit.id)은 String으로 들고 있다.
 */
export type ServerId = number;

/* =========================================================================
 * 1. 에러 봉투 · ApiResult
 * ========================================================================= */

/** 서버가 정한 에러 코드. 목록 밖의 값은 UNKNOWN으로 접는다. */
export type ApiErrorCode =
  | 'INVALID_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  /** 이미 고친 카드를 또 고치려 했다. details.latestCardId에 갈아탈 카드가 온다. */
  | 'CARD_ALREADY_EDITED'
  /** 서버가 카카오나 AI 서비스에 닿지 못했다. 앱 잘못이 아니고 재시도 여지가 있다. */
  | 'UPSTREAM_ERROR'
  | 'UPSTREAM_TIMEOUT'
  | 'INTERNAL'
  | 'UNKNOWN';

export const API_ERROR_CODES: readonly ApiErrorCode[] = [
  'INVALID_REQUEST',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CARD_ALREADY_EDITED',
  'UPSTREAM_ERROR',
  'UPSTREAM_TIMEOUT',
  'INTERNAL',
  'UNKNOWN',
] as const;

export function toApiErrorCode(raw: string | null | undefined): ApiErrorCode {
  return API_ERROR_CODES.find((code) => code === raw) ?? 'UNKNOWN';
}

/**
 * 백엔드 공통 에러 봉투.
 * {"error":{"code":"UNAUTHORIZED","message":"...","retryable":false},
 *  "meta":{"requestId":"req_61c3205bdfee"}}
 */
export interface ApiErrorEnvelope {
  error?: {
    code?: string;
    message?: string;
    /** 기본 false */
    retryable?: boolean;
    /** 오류마다 다른 값. 무엇이 오는지는 코드마다 다르다. */
    details?: Record<string, unknown>;
  };
  meta?: { requestId?: string };
}

/** 서버가 에러 봉투로 응답한 경우. */
export interface ApiRejected {
  kind: 'rejected';
  code: ApiErrorCode;
  message: string | null;
  /** 서버 로그와 이어붙이는 유일한 열쇠. */
  requestId: string | null;
  retryable: boolean;
  details: Record<string, unknown> | null;
  /** 웹에서만 추가로 들고 있으면 유용한 값(안드로이드에는 없음). */
  httpStatus?: number;
}

/** 서버에 닿지 못한 경우. 응답이 없으므로 에러 코드가 없다. */
export interface ApiNetworkUnavailable {
  kind: 'networkUnavailable';
  cause: unknown;
}

export interface ApiSuccess<T> {
  kind: 'success';
  value: T;
}

/** API 호출 결과. 실패를 예외가 아니라 값으로 다룬다. */
export type ApiResult<T> = ApiSuccess<T> | ApiRejected | ApiNetworkUnavailable;

/** 성공 값만 바꾼다. 실패 갈래는 그대로 흘려보낸다. */
export function mapApiResult<T, R>(
  result: ApiResult<T>,
  transform: (value: T) => R,
): ApiResult<R> {
  return result.kind === 'success'
    ? { kind: 'success', value: transform(result.value) }
    : result;
}

/**
 * 서버가 "이미 고친 카드"라며 알려준 최신 카드 id. 그 오류가 아니면 null이다.
 * PATCH /api/cards/{cardId} 에서만 온다.
 */
export function latestCardId(rejected: ApiRejected): number | null {
  if (rejected.code !== 'CARD_ALREADY_EDITED') return null;
  const value = rejected.details?.['latestCardId'];
  return typeof value === 'number' ? value : null;
}

/* =========================================================================
 * 2. 열거형 (서버 문자열 값)
 * ========================================================================= */

/** 브리핑 카드 축의 상태. 1턴째는 대부분 NOT_ASKED다. */
export type AxisStatus = 'NOT_ASKED' | 'FILLED' | 'UNKNOWN' | 'SKIPPED' | 'AMBIGUOUS';

/** 건강 정보 칸의 상태. KNOWN 일 때만 값이 있다. */
export type HealthStatus = 'KNOWN' | 'NONE' | 'UNKNOWN';

/** 값이 카카오에서 온 것인지 사용자가 넣은 것인지. */
export type ValueSource = 'KAKAO' | 'SELF_INPUT';

export type Sex = 'MALE' | 'FEMALE';

/** 카드 상태. 앱은 "CONFIRMED"인지만 본다. */
export type CardStatus = 'DRAFT' | 'CONFIRMED' | (string & {});

/** 문답 세션 상태. 모르는 값은 IN_PROGRESS로 본다. */
export type SessionStatus = 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED' | (string & {});

/** 일정 상태. 모르는 값은 SCHEDULED로 본다. */
export type AppointmentStatus = 'SCHEDULED' | 'DONE' | 'CANCELED' | (string & {});

/** 일정 출처. 진료 후 기록의 재방문이면 VISIT_FOLLOW_UP. 모르는 값은 MANUAL로 본다. */
export type AppointmentOrigin = 'VISIT_FOLLOW_UP' | (string & {});

/** 문답 입력 방식. 음성이어도 오디오는 보내지 않고 변환한 글만 간다. */
export type InputMethod = 'STT' | 'TEXT';

/** 대화 한 줄의 화자. */
export type MessageRole = 'AI' | 'USER';

/* =========================================================================
 * 3. auth — POST /api/auth/kakao · /refresh · /logout, DELETE /api/me
 * ========================================================================= */

export interface KakaoLoginRequest {
  kakaoAccessToken: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  accessExpiresInSeconds: number;
  /**
   * 로그인 응답에서는 서버가 실제 프로필 완료 여부로 계산한다.
   * ⚠️ refresh 응답에서는 서버가 false로 하드코딩하므로 자동 로그인 경로에서 신뢰할 수 없다.
   *    온보딩 판단은 GET /api/me/health-profile 의 onboardingCompleted 로 한다.
   */
  onboardingRequired: boolean;
}

/* =========================================================================
 * 4. home — GET /api/me/home
 * ========================================================================= */

/** 홈 응답이 드는 일정. calendar의 Appointment와 달리 todos가 없다. */
export interface HomeAppointment {
  appointmentId: number;
  clinicName?: string | null;
  department?: string | null;
  purpose?: string | null;
  scheduledOn: IsoDate;
  /** 없으면 시간 미정. */
  scheduledTime?: IsoTime | null;
  status?: AppointmentStatus | null;
  origin?: AppointmentOrigin | null;
  cards?: LinkedCard[];
}

/** 일정에 붙은 카드. */
export interface LinkedCard {
  cardId: number;
  title?: string | null;
}

/** 임시저장된 문답. 진행도가 숫자 둘로 온다. */
export interface InProgressSession {
  sessionId: number;
  siteText?: string | null;
  /** ⚠️ 문답 왕복 수다. 상한이 20이라 화면의 4단계와 직접 대응하지 않는다. */
  progressCurrent: number;
  progressTotal: number;
}

/** 홈 응답의 카드 요약. card 도메인의 CardSummary와 필드가 다르다(clinic·chiefComplaint 없음). */
export interface HomeCardSummary {
  cardId: number;
  title?: string | null;
  status?: CardStatus | null;
  visited?: boolean;
  clinicName?: string | null;
  createdAt: IsoOffsetDateTime;
}

/** 신규 사용자는 404가 아니라 전부 null과 빈 배열이다. */
export interface HomeResponse {
  /** 마지막 진료일. 없으면 아직 진료 기록이 없는 사람이다. */
  lastVisitedOn?: IsoDate | null;
  nextAppointment?: HomeAppointment | null;
  /** 진료 후 기록이 아직 없는 지난 일정 가운데 가장 최근 날. 서버가 14일까지만 거슬러 찾는다. */
  pendingRecordOn?: IsoDate | null;
  inProgressSession?: InProgressSession | null;
  recentCards?: HomeCardSummary[];
}

/* =========================================================================
 * 5. intake(session) — /api/sessions
 * ========================================================================= */

export interface StartSessionRequest {
  /** 온톨로지 id. 구역까지 골랐으면 "SUR:*", 앵커까지면 "ANC:*". 앱은 한 개만 넣는다. */
  siteCodes: string[];
  /** 사람이 읽는 표현. 문답 첫 문장에 그대로 들어간다. null이면 키를 빼고 보낸다. */
  siteText?: string | null;
}

export interface SendMessageRequest {
  text: string;
  /** 음성으로 말했어도 오디오를 보내지 않는다. STT는 음성이었다는 사실만 남긴다. */
  inputMethod: InputMethod;
}

export interface SeverityRequest {
  /** 1~5 서열척도다. NRS 0~10이 아니다. */
  level: number;
  /** "꽤 아파요" 같은 표시 문구. 앱이 보낸다(서버가 카피를 들고 있지 않다). */
  label: string;
}

export interface QuestionsRequest {
  /** 목록을 통째로 보낸다. 추가·편집·삭제·순서가 한 번에 처리된다. */
  questions: string[];
}

export interface ProgressResponse {
  current: number;
  total: number;
}

export interface SessionMessage {
  /** 세션 안에서 유일하다. 화면 목록의 key로 그대로 쓴다. */
  seq: number;
  role: MessageRole;
  text: string;
}

export interface SeverityResponse {
  level: number;
  label?: string | null;
}

/** AI가 고른 질문 후보. 환자가 확정한 questions와 다른 축이다. */
export interface QuestionCandidate {
  text: string;
  source?: string | null;
  /** 낮을수록 먼저 보여줄 것. 서버가 정렬해 주지만 순서를 믿지 않는다. */
  rank?: number;
}

export interface SessionResponse {
  sessionId: number;
  status?: SessionStatus | null;
  siteCodes?: string[];
  siteText?: string | null;
  progress?: ProgressResponse | null;
  messages?: SessionMessage[];
  severity?: SeverityResponse | null;
  /** 환자가 확정한 질문. */
  questions?: string[];
  /** AI 제안. questions가 비었을 때만 rank 순으로 채워 쓴다. */
  questionCandidates?: QuestionCandidate[];
}

/** 한 턴의 결과. messages에 대화 전체가 들어 있다. */
export interface TurnResponse {
  sessionId: number;
  status?: SessionStatus | null;
  /** AI의 다음 질문. */
  reply?: string | null;
  /** 문답이 끝났는지. 끝난 뒤에 또 보내도 오류가 아니다. */
  ended?: boolean;
  endReason?: string | null;
  progress?: ProgressResponse | null;
  messages?: SessionMessage[];
}

/* =========================================================================
 * 6. card — /api/cards · /api/me/cards · /api/sessions/{id}/card
 * ========================================================================= */

/** 병원 이름과 주소. */
export interface Clinic {
  name?: string | null;
  address?: string | null;
}

/** 진료받을 병원. 병원 검색이 준 항목을 그대로 옮긴다. */
export interface ClinicRequest {
  name: string;
  address?: string | null;
}

/** 브리핑 카드의 축 하나. */
export interface CardAxis {
  axis?: string | null;
  status?: AxisStatus | null;
  value?: string | null;
  /** 환자가 실제로 한 말. 지어낸 값과 들은 값을 가르는 자리다. */
  evidence?: string[];
  source?: string | null;
}

/**
 * 진료과 안내. 배열이다 — 하나로 좁히지 않는다.
 * source("의료인 자문 확인 전")를 화면에 함께 보여야 하고 "추천"이라는 말은 쓰지 않는다.
 */
export interface DepartmentGuidance {
  departments?: string[];
  source?: string | null;
}

/** status가 KNOWN일 때만 값이 있다. NONE은 없다는 답, UNKNOWN은 모른다는 답. */
export interface CardTextField {
  status?: HealthStatus | null;
  text?: string | null;
}

export interface CardListField {
  status?: HealthStatus | null;
  items?: string[];
}

/** 카드 머리의 환자. 건강 정보가 카드를 만든 시점 그대로 박혀 있다. */
export interface CardPatient {
  name?: string | null;
  age?: number | null;
  sex?: Sex | null;
  /** 알레르기만 한 줄이다. 쉼표로 이어져 온다. */
  allergies?: CardTextField | null;
  medications?: CardListField | null;
  conditions?: CardListField | null;
}

/** 카드 목록 한 줄. 본문은 담기지 않는다. */
export interface CardSummary {
  cardId: number;
  /** 진료받을 병원. 카드가 드는 값이다. */
  clinic?: Clinic | null;
  /** 아직 항상 null이다. 목록 제목은 chiefComplaint를 쓴다. */
  title?: string | null;
  chiefComplaint?: string | null;
  status?: CardStatus | null;
  /** "진료 완료" 배지는 이 값으로 판단한다(status 아님). */
  visited?: boolean;
  /** 진료를 받은 병원. 진료 전 카드는 비어 있다. */
  clinicName?: string | null;
  createdAt: IsoOffsetDateTime;
}

export interface CardResponse {
  /** ⚠️ 확정된 카드를 PATCH하면 새 버전이 생겨 이 값이 달라진다. 응답 값으로 갈아타야 한다. */
  cardId: number;
  status?: CardStatus | null;
  /** 확정 뒤 수정할 때마다 오른다. 기본 1. */
  version?: number;
  /** 이어받은 앞 카드. */
  parentCardId?: number | null;
  sessionId?: number | null;
  patient?: CardPatient | null;
  /** 아직 서버가 내려주지 않는다. 카드 제목은 chiefComplaint를 쓴다. */
  title?: string | null;
  chiefComplaint?: string | null;
  /** 8축이 늘 자리를 차지한다. 없는 축을 만들지 않는다. */
  axes?: Record<string, CardAxis>;
  redFlags?: string[];
  patientNotes?: string[];
  questions?: string[];
  departmentGuidance?: DepartmentGuidance | null;
  completeness?: number | null;
  minimallyComplete?: boolean;
  /** 검증에 걸려 저장되지 않은 필드 이름. 카드 만들기 자체는 성공한다. */
  rejectedFields?: string[];
  createdAt?: IsoOffsetDateTime | null;
  confirmedAt?: IsoOffsetDateTime | null;
  /** 진료받을 병원. 응답에 병원이 셋이고 이것만 쓴다. */
  clinic?: Clinic | null;
}

/** POST /api/sessions/{sessionId}/card — 본문 전체가 선택. 건너뛰었으면 {} 를 보낸다. */
export interface GenerateCardRequest {
  clinic?: ClinicRequest | null;
}

export interface AxisEditRequest {
  /** 예: "onset" */
  axis: string;
  /** 예: "3주 전" */
  value: string;
}

/**
 * PATCH /api/cards/{cardId} — 보낸 필드만 바뀐다.
 * 건드리지 않은 것은 키를 빼고 보낸다(undefined).
 * ⚠️ 제목과 진료과는 고칠 수 없다. 서버가 받지 않는다.
 * ⚠️ 응답의 cardId·version이 달라진다. 호출자가 그 값으로 갈아타야 한다.
 *
 * 안드로이드가 실제로 채우는 것은 axes·questions·clinic 셋뿐이다:
 *   - axes    : 빈 목록이면 키를 뺀다      → [] 은 "안 바꿈"
 *   - questions: 늘 보낸다                → [] 은 "질문 전부 삭제". axes와 규칙이 다르다!
 *   - clinic  : 안 골랐으면 키를 뺀다      → undefined 는 "안 바꿈"
 * chiefComplaint·patientNotes 는 DTO에만 있고 앱에 호출자가 없다(서버 반영 여부 미확인).
 */
export interface UpdateCardRequest {
  chiefComplaint?: string;
  /** 빈 배열을 보내지 마라 — 안 바꿀 거면 키를 빼라. */
  axes?: AxisEditRequest[];
  /** ⚠️ 빈 배열 = 전부 삭제. 안 바꿀 거면 키를 빼라. */
  questions?: string[];
  patientNotes?: string[];
  clinic?: ClinicRequest;
}

/** 카드 축 id — SOCRATES 8축. */
export const CARD_AXIS_ORDER = [
  'site',
  'onset',
  'character',
  'radiation',
  'associated',
  'time_course',
  'exacerbating_relieving',
] as const;

/** 강도 축. KV 줄이 아니라 눈금으로 그려서 CARD_AXIS_ORDER에 없다. */
export const CARD_AXIS_SEVERITY = 'severity';

export const CARD_AXIS_LABELS: Record<string, string> = {
  site: '부위',
  onset: '시작',
  character: '양상',
  radiation: '뻗치는 곳',
  associated: '동반증상',
  time_course: '경과',
  exacerbating_relieving: '심해질 때',
  severity: '강도',
};

/** 화면에 적는 문구. 서버가 아니라 앱이 들고 있는 카피다. */
export const CARD_UNKNOWN_LABEL = '잘 모르겠어요';
export const CARD_AMBIGUOUS_SUFFIX = '(확실하지 않아요)';

/* =========================================================================
 * 7. visit — /api/me/visits · /api/visits · /api/cards/{id}/visit(s) · /classify
 * ========================================================================= */

/** 기록의 축 하나. 카드의 CardAxis와 모양이 같지만 타입을 함께 쓰지 않는다. */
export interface VisitAxis {
  axis?: string | null;
  status?: AxisStatus | null;
  value?: string | null;
  evidence?: string[];
  source?: string | null;
}

/**
 * 다시 오라고 들은 날. approximate면 화면이 "전후"를 붙인다.
 * ⚠️ 안드로이드는 date가 없으면 followUp 전체를 null로 접는다(text만 있는 재방문은 사라진다).
 *    보낼 때는 date가 늘 채워진다.
 */
export interface FollowUp {
  date?: IsoDate | null;
  /** 환자가 말한 표현("2주 뒤"). */
  text?: string | null;
  approximate?: boolean;
}

export interface VisitSummary {
  visitId: number;
  /** 없을 수 있다 — 카드를 지워도 기록은 남고 연결만 끊긴다. */
  cardId?: number | null;
  /** 카드를 만들 때 박아둔 값이라 연결이 끊겨도 남는다. */
  cardTitle?: string | null;
  clinicName?: string | null;
  visitedOn: IsoDate;
  followUp?: FollowUp | null;
}

/**
 * 기록 하나. 항목이 가변이다 — 브리핑 카드와 같은 모양의 축 맵이고
 * AI가 축을 늘려도 실린다. 못 찾은 항목은 빈 값이 아니라 키가 없다.
 */
export interface VisitResponse {
  visitId: number;
  cardId?: number | null;
  clinicName?: string | null;
  visitedOn?: IsoDate | null;
  axes?: Record<string, VisitAxis>;
  followUp?: FollowUp | null;
  patientNotes?: string[];
  /** 환자가 적은 원문. 상세에만 온다(목록에는 없다). */
  rawNote?: string | null;
}

export interface VisitAxisRequest {
  axis: string;
  value: string;
}

export interface FollowUpRequest {
  date?: string | null;
  text?: string | null;
  approximate?: boolean;
}

/**
 * POST /api/cards/{cardId}/visit — 남길 기록.
 * ⚠️ status와 source를 보내지 않는다. 값이 있으면 FILLED, 비었으면 UNKNOWN이고
 *    출처는 서버가 PATIENT_EDIT로 박는다.
 * 모든 항목이 선택이라 rawNote만 적어도 저장된다.
 */
export interface CreateVisitRequest {
  clinicName?: string | null;
  visitedOn?: IsoDate | null;
  axes?: VisitAxisRequest[];
  followUp?: FollowUpRequest | null;
  /** 어느 항목에도 들어가지 않은 문장. */
  patientNotes?: string[];
  rawNote?: string | null;
}

/**
 * POST /api/visits/classify — 저장하지 않는다. 카드에도 매이지 않는다.
 * ⚠️ labels는 직전 응답의 분류다. 있으면 반드시 함께 보낸다 —
 *    안 보내면 줄 하나를 옮길 때마다 AI 모델 호출이 나간다.
 */
export interface ClassifyMemoRequest {
  memo: string;
  visitedOn?: IsoDate | null;
  clinicName?: string | null;
  labels?: Record<string, string> | null;
}

export interface ClassifyMemoResponse {
  axes?: Record<string, VisitAxis>;
  /** 메모를 문장으로 나눈 것. 인덱스가 labels의 키다. */
  sentences?: string[];
  labels?: Record<string, string>;
  /** 어느 항목에도 들어가지 않은 문장. */
  patientNotes?: string[];
  followUp?: FollowUp | null;
}

/** 기록 축 id. AI가 늘릴 수 있으므로 닫힌 목록이 아니다. */
export const VISIT_AXIS_FINDINGS = 'findings';
export const VISIT_AXIS_TESTS = 'tests';
export const VISIT_AXIS_MEDICATION = 'medication_instructions';
export const VISIT_AXIS_FOLLOW_UP = 'follow_up';

export const VISIT_AXIS_ORDER = [
  VISIT_AXIS_FINDINGS,
  VISIT_AXIS_TESTS,
  VISIT_AXIS_MEDICATION,
  VISIT_AXIS_FOLLOW_UP,
] as const;

export const VISIT_AXIS_LABELS: Record<string, string> = {
  findings: '소견',
  tests: '검사',
  medication_instructions: '약',
  follow_up: '재방문',
};

/* =========================================================================
 * 8. hospital — GET /api/hospitals
 * ========================================================================= */

export interface HospitalSearchQuery {
  /** 필수. 부분 일치다 — "서울"로 4천 건이 넘게 나온다. 빈 값으로 부르지 않는다. */
  q: string;
  /** 필수. 앱은 20을 보낸다. */
  size: number;
}

export interface Hospital {
  name: string;
  /** 같은 이름의 다른 지점을 구별할 수 있는 유일한 값. 심평원에 없는 곳은 비어 있을 수 있다. */
  address?: string | null;
}

export interface HospitalSearchResponse {
  hospitals?: Hospital[];
  /** 조건에 맞는 전체 건수. 받은 목록보다 클 수 있다. */
  totalCount?: number;
}

/** 한 번에 받는 수. 고르는 화면이라 훑을 수 있는 만큼만 받는다. */
export const HOSPITAL_PAGE_SIZE = 20;

/* =========================================================================
 * 9. calendar(appointment) — /api/me/appointments
 * ========================================================================= */

/** 진료 전 할 일 한 줄. 서버가 id를 매기지 않는다 — 화면 key는 앱이 만든다. */
export interface Todo {
  text: string;
  done?: boolean;
}

/** 캘린더 일정. 홈 도메인의 HomeAppointment와 달리 todos가 있다. */
export interface Appointment {
  appointmentId: number;
  clinicName?: string | null;
  department?: string | null;
  /** "재진"처럼 무엇 하러 가는지. */
  purpose?: string | null;
  scheduledOn: IsoDate;
  /** 없으면 시간 미정. */
  scheduledTime?: IsoTime | null;
  status?: AppointmentStatus | null;
  origin?: AppointmentOrigin | null;
  /** 가져갈 카드. 여러 장 붙을 수 있다. */
  cards?: LinkedCard[];
  todos?: Todo[];
}

/** GET /api/me/appointments 쿼리. date를 주면 그 하루, year+month를 주면 그 달. */
export interface AppointmentQuery {
  year?: number;
  /** 1~12 */
  month?: number;
  date?: IsoDate;
}

/** scheduledOn만 필수다. 시각을 빼면 "시간 미정"으로 만들어진다. */
export interface CreateAppointmentRequest {
  clinicName?: string | null;
  department?: string | null;
  purpose?: string | null;
  scheduledOn: IsoDate;
  scheduledTime?: IsoTime | null;
  /** 카드 연결은 선택이다. 카드 없이 "다음 주 치과"만 적을 수 있다. */
  cardIds?: number[];
  /** 앱은 MANUAL이면 아예 보내지 않는다. 보내는 값은 "VISIT_FOLLOW_UP" 하나뿐. */
  origin?: AppointmentOrigin | null;
  todos?: Todo[];
}

/**
 * PATCH /api/me/appointments/{id} — 보낸 필드만 바뀐다(undefined = 안 바꿈).
 * ⚠️ 시각을 미정으로 되돌리려면 clearTime을 세운다. scheduledTime = null은 "안 바꿈"이다.
 *    scheduledTime과 clearTime을 절대 같이 보내지 않는다.
 * ⚠️ 날짜는 지울 수 없다.
 *
 * 안드로이드가 실제로 채우는 것은 purpose·scheduledOn·scheduledTime·clearTime·cardIds·todos 여섯뿐이다.
 * clinicName·department·status 는 DTO에만 있고 앱에 호출자가 없다 —
 * 즉 안드로이드에는 "일정의 병원/진료과 고치기"도 "일정 취소하기"도 없다.
 * 웹에서 새로 열 수 있으나 서버 반영 여부는 앱 코드로 확인되지 않았다.
 */
export interface UpdateAppointmentRequest {
  clinicName?: string;
  department?: string;
  purpose?: string;
  scheduledOn?: IsoDate;
  scheduledTime?: IsoTime;
  clearTime?: boolean;
  status?: AppointmentStatus;
  /** 통째로 갈아끼운다. undefined가 "안 바꿈", []가 "전부 뗌". */
  cardIds?: number[];
  /** 통째로 갈아끼운다. 지운 줄이 남지 않으려면 화면에 있는 것을 전부 보내야 한다. */
  todos?: Todo[];
}

/** 진료 후 기록에서 잡힌 재방문. 홈·일자 화면이 이 값으로 "재진"을 적는다. */
export const APPOINTMENT_ORIGIN_VISIT_FOLLOW_UP = 'VISIT_FOLLOW_UP';

/* =========================================================================
 * 10. profile — /api/me/health-profile · /api/me/settings
 * ========================================================================= */

export interface ListField {
  status?: HealthStatus | null;
  items?: string[];
}

export interface TextField {
  status?: HealthStatus | null;
  text?: string | null;
}

/** 값이 카카오에서 온 것인지 사용자가 넣은 것인지. */
export interface ProfileSources {
  name?: ValueSource | null;
  birthYear?: ValueSource | null;
  sex?: ValueSource | null;
}

/** 프로필이 없어도 404가 아니라 빈 값이 온다. */
export interface HealthProfileResponse {
  /** 카카오에서 받은 값이 채워져 온다. */
  name?: string | null;
  birthYear?: number | null;
  birthMonthDay?: string | null;
  /** 서버가 계산해서 준다. */
  age?: number | null;
  sex?: Sex | null;
  medications?: ListField | null;
  conditions?: ListField | null;
  /** 알레르기는 한 줄이다. 쉼표로 이어져 온다. */
  allergies?: TextField | null;
  sources?: ProfileSources | null;
  /** 온보딩을 실제로 마쳤는지. 카카오 값이 채워진 것만으로는 false다. */
  onboardingCompleted?: boolean;
  /** 문답을 시작할 수 있는지. 나이와 성별이 있어야 true. false면 POST /api/sessions가 400이다. */
  canStartIntake?: boolean;
}

export interface ListFieldRequest {
  status: HealthStatus;
  items?: string[];
}

export interface TextFieldRequest {
  status: HealthStatus;
  text?: string;
}

/**
 * PUT /api/me/health-profile — 통째로 덮어쓴다. 단계별 저장이 없다.
 * ⚠️ 여섯 필드가 모두 필수다. null을 보내면 400이다.
 *    화면이 묻지 않는 name·birthYear·sex는 읽어 온 값을 그대로 되돌려 보낸다.
 * ⚠️ 셋 중 하나라도 없으면 안드로이드는 아예 부르지 않고 null을 돌려준다
 *    (성공/거절/네트워크 밖의 네 번째 상태). 웹도 같은 갈래가 필요하다.
 */
export interface HealthProfileRequest {
  name: string;
  birthYear: number;
  birthMonthDay?: string | null;
  sex: Sex;
  medications: ListFieldRequest;
  conditions: ListFieldRequest;
  allergies: TextFieldRequest;
}

/** 서버가 막는 길이. 넘겨 보내면 400이라 잘라서 보낸다. */
export const HEALTH_ITEM_MAX_LENGTH = 50;
export const HEALTH_ITEM_MAX_COUNT = 20;
export const HEALTH_TEXT_MAX_LENGTH = 200;

/** 계정에 붙는 유일한 설정. 나머지 토글 둘은 서버에 없다(로컬 저장). */
export interface SettingsResponse {
  /** 기본 true. */
  visitReminderEnabled?: boolean;
}

export interface SettingsRequest {
  visitReminderEnabled: boolean;
}

/* =========================================================================
 * 11. 엔드포인트 카탈로그 (경로 조립 헬퍼)
 * ========================================================================= */

export const API_PATHS = {
  // auth
  kakaoLogin: () => 'api/auth/kakao',
  refresh: () => 'api/auth/refresh',
  logout: () => 'api/auth/logout',
  withdraw: () => 'api/me',

  // home
  home: () => 'api/me/home',

  // session
  startSession: () => 'api/sessions',
  session: (sessionId: number) => `api/sessions/${sessionId}`,
  sessionMessages: (sessionId: number) => `api/sessions/${sessionId}/messages`,
  sessionSeverity: (sessionId: number) => `api/sessions/${sessionId}/severity`,
  sessionQuestions: (sessionId: number) => `api/sessions/${sessionId}/questions`,

  // card
  createCard: (sessionId: number) => `api/sessions/${sessionId}/card`,
  cards: () => 'api/me/cards',
  card: (cardId: number) => `api/cards/${cardId}`,
  confirmCard: (cardId: number) => `api/cards/${cardId}/confirm`,

  // visit
  visits: () => 'api/me/visits',
  visit: (visitId: number) => `api/visits/${visitId}`,
  cardVisits: (cardId: number) => `api/cards/${cardId}/visits`,
  createVisit: (cardId: number) => `api/cards/${cardId}/visit`,
  classifyMemo: () => 'api/visits/classify',

  // hospital
  hospitals: () => 'api/hospitals',

  // appointment
  appointments: () => 'api/me/appointments',
  upcomingAppointments: () => 'api/me/appointments/upcoming',
  appointment: (appointmentId: number) => `api/me/appointments/${appointmentId}`,

  // profile
  healthProfile: () => 'api/me/health-profile',
  settings: () => 'api/me/settings',
} as const;
```

---

## 18. 웹 포팅 시 반드시 결정해야 하는 것

| # | 주제 | 안드로이드의 선택 | 웹에서 그대로 옮기면 생기는 일 | 대안 |
| --- | --- | --- | --- | --- |
| 1 | 토큰 저장 | 평문 DataStore (앱 샌드박스) | `localStorage`는 XSS 한 방에 access + refresh가 같이 샌다 | refresh는 httpOnly·Secure·SameSite 쿠키, access는 메모리 |
| 2 | CORS | 없음(네이티브) | 다른 오리진이라 프리플라이트와 `Access-Control-Allow-*` 헤더가 새로 필요 | 개발 Vite proxy, 배포 리버스 프록시 |
| 3 | 401 재발급 | `Mutex` 1회 | 동시 401 각각 재발급 → refresh 회전으로 **뒤 요청이 전부 죽는다** | 공유 Promise 한 개 |
| 4 | 직렬화 실패 | **잡지 않고 앱을 죽인다** | 흰 화면 | zod로 검증하고 `ContractViolation` 갈래 추가 |
| 5 | 60초 read timeout | 감내 | `fetch` 기본 타임아웃이 없어 영영 걸릴 수도, 30초로 자르면 잠든 서버가 항상 실패 | `AbortSignal.timeout(60_000)` |
| 6 | 알림 예약 | 앱이 로컬 알림 예약 | 브라우저에 대응물이 없다 | Web Push + Service Worker, 또는 기능 제외 |
| 7 | 음성 입력 | ML Kit GenAI STT (API 31+) | 서버에 `inputMethod: "STT"`만 보내면 되므로 계약은 같다 | Web Speech API로 대체 가능(사파리 제약 확인) |
| 8 | 일괄 삭제 | 카드·기록 모두 1건씩 N회 호출 | 30장 삭제면 30 요청 | 그대로 옮기되 `Promise.allSettled` + 성공 id만 화면에서 제거 |
| 9 | `classify` 비용 | `labels` 캐시로 AI 재호출 방지 | 상태를 컴포넌트 밖에 두지 않으면 **매 편집마다 AI 과금** | 훅 바깥 ref 또는 store에 `labels` 보관 |
| 10 | 로컬 전용 설정 둘 | DataStore | 서버에 없다 | `localStorage` |
| 11 | PATCH의 빈 배열 | 카드는 `axes` 빈 목록을 **빼고** `questions` 빈 목록을 **보낸다** | 한 헬퍼로 뭉개면 축 편집 취소가 질문을 지우거나 그 반대가 된다 | 필드마다 "빈 배열 = 삭제"인지 "빈 배열 = 안 바꿈"인지 타입 주석으로 못 박고 헬퍼를 나눈다 |
| 12 | 읽기 실패를 삼키는 화면 | 건강 정보 편집·메모 자동 분류가 실패를 null로 접는다 | "빈 상태"와 "실패"가 같은 화면이고, 건강 정보는 저장 버튼이 **무반응**이 된다 | 읽기 실패를 별도 상태로 그리고 저장을 막는다 |
| 13 | 서버를 안 부르는 실패 | `HealthProfileRepository.save`가 `null` 반환 | `Rejected`와 뭉개면 "다시 눌러주세요"가 영원히 풀리지 않는다 | `ApiResult` 밖의 네 번째 갈래(예: `{ kind: 'notAttempted', reason }`)를 만든다 |
| 14 | id 타입 | Kotlin `Long` | JS `number`는 2^53-1까지만 정확 | 지금은 안전하나, 화면 key는 `String`으로 들고 다닌다(안드로이드도 그렇게 한다) |

---

## 19. 이 문서에서 답하지 못한 것 (백엔드 확인 필요)

1. **`birthMonthDay`의 포맷.** 소스에 타입이 `String?`이라고만 있고 `MM-dd`인지 `MMdd`인지 주석에 없다. 파싱하는 코드도 없다(그대로 되돌려 보내기만 한다).
2. **`accessExpiresInSeconds`를 앱이 쓰지 않는다.** 저장도 하지 않고 401이 온 뒤에야 재발급한다. 웹에서 선제 갱신(만료 30초 전 refresh)을 하려면 이 값을 써야 하는데, 그 동작이 서버 회전 정책과 맞는지 확인이 필요하다.
3. **`CardResponse.title`이 언제 채워지는지.** 주석이 "아직 서버가 내려주지 않는다"고 적었다. 채워지기 시작하면 목록·상세 제목 규칙이 바뀐다.
4. **`InProgressSessionResponse.progressTotal`의 상한 20이 무엇을 세는지.** `HomeRepository` 주석이 "어느 쪽인지 백엔드에 확인 중이다"라고 남겨 두었다.
5. **에러 코드별 HTTP status 매핑.** `CARD_ALREADY_EDITED`만 409로 명시돼 있고 나머지는 소스에 없다. 웹에서 status 기반 분기를 넣으려면 확인이 필요하다.
6. **`error.details`에 들어오는 키 목록.** 앱이 읽는 것은 `latestCardId` 하나뿐이다.
7. **`GET /api/me/appointments`에 `year`·`month`·`date`를 함께 보내면** 어떻게 되는지. 앱은 섞어 보내지 않는다.
8. **`rejectedFields`에 담기는 필드 이름 목록.** 앱이 값을 화면에 쓰지 않아 실제 값을 확인한 코드가 없다.
9. **`PATCH /api/me/settings` 이외의 설정이 앞으로 서버로 올라가는지.** 지금은 값이 하나뿐이다.
10. **`AxisResponse.source`와 `VisitAxisResponse.source`에 오는 값 목록.** `PATIENT_EDIT` 하나만 주석에 나온다.
11. **`UpdateCardRequest.chiefComplaint`·`patientNotes`를 서버가 실제로 반영하는지.** DTO에는 있는데 앱에 호출자가 없어(§6.4) 한 번도 나가 본 적이 없는 필드다.
12. **`UpdateAppointmentRequest.clinicName`·`department`·`status`를 서버가 실제로 반영하는지.** 마찬가지로 앱이 보내지 않는다(§9.5). 특히 `status`로 일정을 `CANCELED`로 바꿀 수 있는지는 웹에서 "일정 취소"를 만들지 말지를 가른다.
13. **`UpdateCardRequest.questions = []`가 "질문 전부 삭제"가 맞는지.** 앱이 늘 보내는 필드라 빈 목록이 그대로 나가는데, 서버가 이것을 삭제로 읽는지 무시하는지 확인한 적이 없다.
14. **`FollowUpResponse`를 날짜 없이(`text`만) 주는 경우가 있는지.** 있다면 안드로이드는 그 재방문을 통째로 버리고 있다(§7.3).
15. **`GET /api/me/home`의 `recentCards`에 `chiefComplaint`를 실어 줄 수 있는지.** 지금은 `title`이 늘 null이라 홈의 카드 제목이 빈칸이다(§4.1).
