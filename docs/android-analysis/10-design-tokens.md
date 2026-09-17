# 디자인 토큰 (색 · 타이포 · 치수 · 반경 · 고도 · 아이콘)

## 웹앱 구현 메모

1. **모바일 폭은 고정하지 않는다.** 360은 "최소 기준"이고 소스 주석이 `screenWidth`에 "이 값으로 레이아웃을 고정하지 않는다. 거터를 유지하고 콘텐츠를 Fill한다"라고 못 박았다. 웹에서는 좌우 패딩 20px만 고정하고 본문은 FILL, 데스크톱에서는 `max-width` 컨테이너를 중앙 정렬한다.
2. **다크 모드 값은 소스에 존재하지 않는다.** `MedicalMateColors.kt`에 Light 세트 하나뿐이고 `res/values-night`도 없다. CSS 변수 이중 레이어(`:root` / `[data-theme="dark"]`)는 깔되 다크 값은 디자인이 확정할 때까지 라이트와 동일 값으로 두고 임의로 만들지 않는다.
3. **안드로이드가 못 하던 것을 웹은 그대로 구현할 수 있다.** 2단 브랜드 틴트 그림자(Compose는 `Modifier.shadow`의 한계로 근사값만 썼다)와 Glass 블러 24는 CSS `box-shadow` 2겹과 `backdrop-filter`로 Figma 원본값을 100% 재현한다. Safari 접두사와 `@supports` opaque 폴백만 챙긴다. **Glass는 API 31 미만 미지원 수준이 아니라, 안드로이드가 버전과 무관하게 한 번도 그리지 않은 값이다**(compose-ui에 backdrop 블러 API가 없다 — §6.3.1). 그래서 웹의 Glass는 "이식"이 아니라 **첫 구현**이다.
4. **아이콘 46종 전부 SVG 1:1 변환 가능하다.** group·clip-path·trimPath·gradient가 하나도 없다. 단 stroke 전용 path 42종은 SVG에서 `fill="none"`을 명시해야 한다(안드로이드는 기본 미채움, SVG는 기본 검정 채움). 아이콘·로고 말고 **온보딩 일러스트 4종과 런처 자산 3종이 더 있다**(§8.9).
5. **Pretendard는 웹폰트로 교체한다.** 앱은 static OTF 4종(400/500/600/700)을 동봉했고, 웹은 `pretendard-dynamic-subset` + `font-display: swap`을 쓴다. 자간은 소스가 이미 `em`(퍼센트/100)이라 CSS `letter-spacing`에 그대로 들어간다.

---

## 0. 이 문서가 읽은 소스

| 파일 | 담은 것 |
|---|---|
| `C:\Claude\MedicalMate\app\src\main\java\com\mist\medicalmate\core\designsystem\Palette.kt` | 원시 팔레트 43개 |
| `.../core/designsystem/MedicalMateColors.kt` | 시맨틱 컬러 41개 + Light 바인딩 |
| `.../core/designsystem/Type.kt` | 폰트 패밀리, 타이포 15종, M3 슬롯 매핑 |
| `.../core/designsystem/Dimens.kt` | 간격 12개, 크기·레이아웃 14개 |
| `.../core/designsystem/MedicalMateRadius.kt` | 반경 10개 + M3 Shapes |
| `.../core/designsystem/Elevation.kt` | 고도 3단계, 그림자 틴트, Glass |
| `.../core/designsystem/MedicalMateSeverity.kt` | 통증 5단계 enum |
| `.../core/designsystem/BrandColor.kt` | 소셜 로그인 브랜드 고정색 |
| `.../core/designsystem/MedicalMateIcons.kt` | 아이콘 46종 |
| `.../core/designsystem/MedicalMateLogo.kt` | 로고 자산 6종 |
| `.../core/designsystem/Theme.kt` | 테마 진입점, M3 ColorScheme 바인딩 |
| `.../core/designsystem/component/OverlayScrim.kt` | 스크림 알파 0.5 |
| `.../core/designsystem/component/MedicalMateSurfaceStyle.kt` | Glass/Opaque 열거 |
| `.../core/designsystem/component/Loading.kt` | 스피너·스켈레톤 규격 |
| `.../core/designsystem/component/IconButton.kt` | 아이콘 버튼 상자·아이콘·반경의 **실제 구현값** (§8.5) |
| `.../core/designsystem/component/TabBar.kt`, `NavBar.kt`, `BottomCtaBar.kt` | Glass/Opaque의 **실제 구현**과 높이 내역 (§6.3, §4.2) |
| `C:\Claude\MedicalMate\app\src\main\res\drawable\ic_*.xml` | 아이콘 46종 + 로고 6종 + 카카오 심볼 1종 vector drawable |
| `C:\Claude\MedicalMate\app\src\main\res\drawable\img_onboarding_*.xml` | 온보딩 일러스트 4종 (§8.9) |
| `C:\Claude\MedicalMate\app\src\main\res\drawable\ic_launcher_*.xml`, `splash_icon_none.xml` | 런처 아이콘·시스템 스플래시 자산 (§8.9) |
| `C:\Claude\MedicalMate\app\src\main\res\font\pretendard_*.otf` | Pretendard static OTF 4종 (§3.1) |
| `C:\Claude\MedicalMate\app\src\main\res\values\strings.xml` | 통증 단계 한국어 문구 |
| `C:\Claude\MedicalMate\app\src\main\res\values\colors.xml`, `values\themes.xml` | 플랫폼 창 배경색 |
| `C:\Claude\MedicalMate\app\src\main\res\values-v31\themes.xml` | API 31+ 시스템 스플래시 면·아이콘 (§2.8) |
| `C:\Claude\MedicalMate\DESIGN.md` | 디자인 시스템 정본 사본 v3.0 (2026-09-09) |

`res/values-night`는 **존재하지 않는다**(§2.6). `res/` 아래 값 디렉터리는 `values`와 `values-v31` 둘뿐이다.

### 0.1 토큰 총량 (DESIGN.md §0 대조)

| 항목 | DESIGN.md | 실제 소스 | 비고 |
|---|---|---|---|
| Palette | 43 | 43 | 일치 |
| Semantic | 41 | 41 | `MedicalMateColors` 데이터 클래스 필드 수. KDoc은 "40개"라 적었는데, `bgInverseSoft`가 나중에 추가되어 41이 맞다 |
| Scale (간격·크기·반경) | 33 | 간격 12 + 크기/레이아웃 14 + 반경 7(+중간값 3) | |
| 텍스트 스타일 | 15 | 15 | 일치 |
| 아이콘 | 46 | 46 | `MedicalMateIcons` 프로퍼티 46개, `ic_*.xml` 46개 (로고 6·카카오 1·런처 2 제외) |
| 컴포넌트 | 58 | — | 이 문서 범위 밖 |

토큰 밖 자산 (DESIGN.md §0 표에 없다):

| 자산 | 개수 | 위치 |
|---|---|---|
| 로고 | 6 | `MedicalMateLogo` / `ic_logo_*.xml` (§8.7) |
| 카카오 심볼 | 1 | `ic_kakao_symbol.xml` (§8.7) |
| 온보딩 일러스트 | 4 | `img_onboarding_*.xml`, `OnboardingPage` enum (§8.9.1) |
| 런처 · 시스템 스플래시 | 3 | `ic_launcher_background/foreground.xml`, `splash_icon_none.xml` (§8.9.2) |
| Pretendard OTF | 4 | `res/font/` (§3.1) |

### 0.2 토큰 구조 — 2계층

```
Palette (원시 43)  →  Semantic (역할 41)  →  화면
```

`Palette.kt`의 43개 상수는 전부 `internal`이다. KDoc: *"화면 코드에서 직접 쓰지 않는다. 시맨틱 토큰을 정의하는 곳에서만 참조한다."*

**웹에서도 이 규칙을 그대로 유지한다.** CSS에서 `--mm-color-primary-500`을 컴포넌트가 직접 참조하면 나중에 색을 바꿀 때 어디를 고쳐야 할지 못 찾는다. 컴포넌트는 `--mm-bg-primary`만 본다. Tailwind 설정에서도 팔레트 계층은 `_palette` 같은 접두사로 숨기거나, 아예 semantic 이름만 노출하는 것을 권한다.

---

## 1. 색 — 1계층: 원시 팔레트 43개

`Palette.kt`. 값은 `Color(0xFFxxxxxx)` 형식이고 앞 `FF`는 알파(불투명)다. 아래 HEX는 알파를 뗀 RGB다.

### 1.1 primary (인디고 231°) — 10개

| Kotlin 상수 | Figma 토큰 | HEX | 시맨틱에서 쓰이는 곳 |
|---|---|---|---|
| `Primary50` | `primary/50` | `#F2F4FE` | `bg/primary-faint`, `bg/info` |
| `Primary100` | `primary/100` | `#E3E7FC` | `bg/primary-subtle` |
| `Primary200` | `primary/200` | `#C7CFF8` | (시맨틱 미사용) |
| `Primary300` | `primary/300` | `#A3AFF1` | M3 `inversePrimary`만 사용 |
| `Primary400` | `primary/400` | `#7484E3` | (시맨틱 미사용) |
| `Primary500` | `primary/500` | `#5566D2` | `bg/primary`, `border/focus`, `border/primary` |
| `Primary600` | `primary/600` | `#3B4FC0` | `bg/primary-pressed` |
| `Primary700` | `primary/700` | `#2E3E9E` | `fg/primary`, `fg/link`, `fg/info` |
| `Primary800` | `primary/800` | `#242F79` | (시맨틱 미사용) |
| `Primary900` | `primary/900` | `#1A2154` | (시맨틱 미사용) |

> DESIGN.md §2.2: *"색상 231°(인디고)로 흔한 파랑(210~215°)을 피했다. 위계는 색이 아니라 형태가 만든다."*

### 1.2 neutral — 11개

`neutral/800`이 없다. 팔레트가 0/25/50/100/200/300/400/500/600/700/900으로 11단계다.

| Kotlin 상수 | Figma 토큰 | HEX | 시맨틱에서 쓰이는 곳 |
|---|---|---|---|
| `Neutral0` | `neutral/0` | `#FFFFFF` | `bg/surface`, `fg/on-primary`, `fg/on-inverse` |
| `Neutral25` | `neutral/25` | `#FAFBFD` | (시맨틱 미사용) |
| `Neutral50` | `neutral/50` | `#F5F6FA` | `bg/canvas` |
| `Neutral100` | `neutral/100` | `#EDEFF5` | `bg/subtle` |
| `Neutral200` | `neutral/200` | `#DEE1EB` | `border/subtle` |
| `Neutral300` | `neutral/300` | `#C6CAD8` | `fg/disabled`, `border/default` |
| `Neutral400` | `neutral/400` | `#989EB1` | (시맨틱 미사용) |
| `Neutral500` | `neutral/500` | `#7C8397` | `fg/muted`, `border/strong` |
| `Neutral600` | `neutral/600` | `#585F73` | `fg/subtle` |
| `Neutral700` | `neutral/700` | `#3A4053` | `bg/inverse-soft` |
| `Neutral900` | `neutral/900` | `#131722` | `fg/default`, `bg/inverse`, `bg/scrim` |

### 1.3 amber / green / red — 각 4개

| Kotlin 상수 | Figma 토큰 | HEX | 시맨틱 |
|---|---|---|---|
| `Amber50` | `amber/50` | `#FFF4D6` | `bg/warning` |
| `Amber100` | `amber/100` | `#FFE9B3` | (시맨틱 미사용) |
| `Amber500` | `amber/500` | `#E0A227` | (시맨틱 미사용) |
| `Amber700` | `amber/700` | `#8A5A0B` | `fg/warning` |
| `Green50` | `green/50` | `#E4F7ED` | `bg/success` |
| `Green100` | `green/100` | `#C6F0DC` | (시맨틱 미사용) |
| `Green500` | `green/500` | `#12A05F` | (시맨틱 미사용) |
| `Green700` | `green/700` | `#0E7A4A` | `fg/success` |
| `Red50` | `red/50` | `#FFEDEB` | `bg/danger` |
| `Red100` | `red/100` | `#FFD8D4` | (시맨틱 미사용) |
| `Red500` | `red/500` | `#E5504A` | (시맨틱 미사용) |
| `Red700` | `red/700` | `#C4302B` | `fg/danger` |

### 1.4 severity — base 5 + tint 5 = 10개

| Kotlin 상수 | Figma 토큰 | HEX | 용도(KDoc 원문 기준) |
|---|---|---|---|
| `Severity1Base` | `severity/1` | `#FFE3A8` | 칩과 트랙 채움 |
| `Severity2Base` | `severity/2` | `#FFC79B` | 〃 |
| `Severity3Base` | `severity/3` | `#FFA894` | 〃 |
| `Severity4Base` | `severity/4` | `#F58079` | 〃 |
| `Severity5Base` | `severity/5` | `#DC5A55` | 〃 |
| `Severity1TintBase` | `severity/1-tint` | `#FFF6E4` | Severity Slider의 판독 영역 |
| `Severity2TintBase` | `severity/2-tint` | `#FFEFE4` | 〃 |
| `Severity3TintBase` | `severity/3-tint` | `#FFE9E3` | 〃 |
| `Severity4TintBase` | `severity/4-tint` | `#FDE4E2` | 〃 |
| `Severity5TintBase` | `severity/5-tint` | `#F9DEDD` | 〃 |

**팔레트 합계: 10 + 11 + 4 + 4 + 4 + 5 + 5 = 43개.**

---

## 2. 색 — 2계층: 시맨틱 토큰 41개

`MedicalMateColors.kt`의 `@Immutable data class MedicalMateColors`. 아래 표의 **모든 필드**가 TypeScript 타입으로 그대로 옮겨진다.

### 2.1 배경 — 14개

| Kotlin 필드 | Figma 토큰 | 팔레트 별칭 | **라이트 값** | **다크 값** | 쓰임 (소스 KDoc / DESIGN.md §2.3 원문) |
|---|---|---|---|---|---|
| `bgCanvas` | `bg/canvas` | neutral/50 | `#F5F6FA` | 미정의 | 화면 바탕 |
| `bgSurface` | `bg/surface` | neutral/0 | `#FFFFFF` | 미정의 | 카드 · 시트 |
| `bgSubtle` | `bg/subtle` | neutral/100 | `#EDEFF5` | 미정의 | 입력 필드 · 보조 블록 |
| `bgPrimary` | `bg/primary` | primary/500 | `#5566D2` | 미정의 | 주 버튼 · 행동 유도 블록 |
| `bgPrimaryPressed` | `bg/primary-pressed` | primary/600 | `#3B4FC0` | 미정의 | 눌림 |
| `bgPrimarySubtle` | `bg/primary-subtle` | primary/100 | `#E3E7FC` | 미정의 | Callout · 환자 발화 |
| `bgPrimaryFaint` | `bg/primary-faint` | primary/50 | `#F2F4FE` | 미정의 | Notice/Info · 일정 카드 |
| `bgInfo` | (DESIGN.md §2.3 표에 없음) | primary/50 | `#F2F4FE` | 미정의 | `bgPrimaryFaint`와 같은 값. Notice/Toast의 Info 톤 면 |
| `bgSuccess` | `bg/success` | green/50 | `#E4F7ED` | 미정의 | (DESIGN.md 쓰임 칸 비어 있음) |
| `bgWarning` | `bg/warning` | amber/50 | `#FFF4D6` | 미정의 | 알러지 경고 |
| `bgDanger` | `bg/danger` | red/50 | `#FFEDEB` | 미정의 | 삭제 버튼 |
| `bgInverse` | `bg/inverse` | neutral/900 | `#131722` | 미정의 | Toast |
| `bgInverseSoft` | `bg/inverse-soft` | neutral/700 | `#3A4053` | 미정의 | Tooltip Bubble의 면. `bg/inverse`보다 옅다 |
| `bgScrim` | `bg/scrim` | neutral/900 | `#131722` | 미정의 | Overlay Scrim. **컴포넌트에서 opacity 50%를 적용한다** |

`bgInverseSoft` KDoc 원문: *"Figma가 나중에 늘린 토큰이라 처음 옮긴 40개에 없었다. 화면에 겹쳐 뜨는 짧은 설명이라 Toast만큼 무겁지 않게 둔 것으로 보인다."*

### 2.2 전경 — 12개

| Kotlin 필드 | Figma 토큰 | 팔레트 별칭 | **라이트 값** | **다크 값** | 흰 배경 대비 | 주의 |
|---|---|---|---|---|---|---|
| `fgDefault` | `fg/default` | neutral/900 | `#131722` | 미정의 | 17.90 | 본문 기본 |
| `fgSubtle` | `fg/subtle` | neutral/600 | `#585F73` | 미정의 | 6.36 | 플레이스홀더 하한 |
| `fgMuted` | `fg/muted` | neutral/500 | `#7C8397` | 미정의 | 3.78 | **본문 금지.** 비활성 아이콘·장식 획 전용. 텍스트에 쓰지 않는다 |
| `fgDisabled` | `fg/disabled` | neutral/300 | `#C6CAD8` | 미정의 | — | |
| `fgOnPrimary` | `fg/on-primary` | neutral/0 | `#FFFFFF` | 미정의 | — | |
| `fgOnInverse` | `fg/on-inverse` | neutral/0 | `#FFFFFF` | 미정의 | — | |
| `fgPrimary` | `fg/primary` | primary/700 | `#2E3E9E` | 미정의 | 9.13 | |
| `fgLink` | `fg/link` | primary/700 | `#2E3E9E` | 미정의 | 9.13 | `fgPrimary`와 동일 값, 별도 토큰 |
| `fgInfo` | `fg/info` | primary/700 | `#2E3E9E` | 미정의 | 9.13 | 〃 |
| `fgSuccess` | `fg/success` | green/700 | `#0E7A4A` | 미정의 | 4.98 | |
| `fgWarning` | `fg/warning` | amber/700 | `#8A5A0B` | 미정의 | 5.40 | |
| `fgDanger` | `fg/danger` | red/700 | `#C4302B` | 미정의 | 5.28 | |

### 2.3 테두리 — 5개

| Kotlin 필드 | Figma 토큰 | 팔레트 별칭 | **라이트 값** | **다크 값** | 쓰임 |
|---|---|---|---|---|---|
| `borderSubtle` | `border/subtle` | neutral/200 | `#DEE1EB` | 미정의 | 목록 구분선 · **입력 밑줄** |
| `borderDefault` | `border/default` | neutral/300 | `#C6CAD8` | 미정의 | (DESIGN.md 쓰임 칸 비어 있음) |
| `borderStrong` | `border/strong` | neutral/500 | `#7C8397` | 미정의 | 입력 필드 테두리 (비어 있음) |
| `borderFocus` | `border/focus` | primary/500 | `#5566D2` | 미정의 | 포커스 |
| `borderPrimary` | `border/primary` | primary/500 | `#5566D2` | 미정의 | 〃 동일 값, 별도 토큰 |

> DESIGN.md §2.5 예외: **"선택 완료된 필드의 테두리는 `fg/default`를 쓴다.** 텍스트·아이콘·테두리가 함께 진해져야 '채워졌다'가 읽힌다." → 웹에서 `.is-filled` 상태의 border-color는 `--mm-fg-default`.

### 2.4 통증 단계 — 10개

| Kotlin 필드 | Figma 토큰 | 팔레트 별칭 | **라이트 값** | **다크 값** |
|---|---|---|---|---|
| `severity1` | `severity/1` | severity/1 | `#FFE3A8` | 미정의 |
| `severity2` | `severity/2` | severity/2 | `#FFC79B` | 미정의 |
| `severity3` | `severity/3` | severity/3 | `#FFA894` | 미정의 |
| `severity4` | `severity/4` | severity/4 | `#F58079` | 미정의 |
| `severity5` | `severity/5` | severity/5 | `#DC5A55` | 미정의 |
| `severity1Tint` | `severity/1-tint` | severity/1-tint | `#FFF6E4` | 미정의 |
| `severity2Tint` | `severity/2-tint` | severity/2-tint | `#FFEFE4` | 미정의 |
| `severity3Tint` | `severity/3-tint` | severity/3-tint | `#FFE9E3` | 미정의 |
| `severity4Tint` | `severity/4-tint` | severity/4-tint | `#FDE4E2` | 미정의 |
| `severity5Tint` | `severity/5-tint` | severity/5-tint | `#F9DEDD` | 미정의 |

**시맨틱 합계: 14 + 12 + 5 + 10 = 41개.**

### 2.5 TypeScript 타입

```ts
// MedicalMateColors.kt 의 41개 필드를 1:1로 옮긴 것
export interface MedicalMateColors {
  // 배경 14
  bgCanvas: string;
  bgSurface: string;
  bgSubtle: string;
  bgPrimary: string;
  bgPrimaryPressed: string;
  bgPrimarySubtle: string;
  bgPrimaryFaint: string;
  bgInfo: string;
  bgSuccess: string;
  bgWarning: string;
  bgDanger: string;
  bgInverse: string;
  bgInverseSoft: string;
  bgScrim: string;
  // 전경 12
  fgDefault: string;
  fgSubtle: string;
  fgMuted: string;
  fgDisabled: string;
  fgOnPrimary: string;
  fgOnInverse: string;
  fgPrimary: string;
  fgLink: string;
  fgInfo: string;
  fgSuccess: string;
  fgWarning: string;
  fgDanger: string;
  // 테두리 5
  borderSubtle: string;
  borderDefault: string;
  borderStrong: string;
  borderFocus: string;
  borderPrimary: string;
  // 통증 10
  severity1: string;
  severity2: string;
  severity3: string;
  severity4: string;
  severity5: string;
  severity1Tint: string;
  severity2Tint: string;
  severity3Tint: string;
  severity4Tint: string;
  severity5Tint: string;
}
```

### 2.6 다크 모드 — **소스에 값이 없다**

세 군데가 같은 사실을 말한다.

- `MedicalMateColors.kt` KDoc: *"Light 모드 값. DESIGN.md에 다크 모드 값이 없다. 값이 정해지고 컴포넌트 QA가 끝나기 전까지 다크를 지원 대상으로 표시하지 않는다."*
- `Theme.kt` KDoc: *"다크 스킴과 dynamic color는 두지 않는다. … 다크 모드는 DESIGN.md에 따라 값이 정해지기 전까지 지원하지 않는다."*
- `res/values/themes.xml` 주석: *"다크 모드 값이 없으므로 values-night를 만들지 않는다(DESIGN.md 11.7)."* — 실제로 `res/values-night` 폴더가 존재하지 않는다.

**웹 대응:** CSS 변수 구조는 라이트/다크 2레이어로 지금 깔아 두되, 다크 블록의 값은 라이트와 같은 값으로 채운다(§9의 `[data-theme="dark"]` 블록 참고). 색을 추측해서 채우면 검수 기준 §11-1("하드코딩 0")과 §11-3(대비 통과)을 검증할 수 없다. 디자인이 다크 값을 확정하면 그 블록만 교체한다.

### 2.7 브랜드 고정색 (`BrandColor.kt`) — 테마 밖

시맨틱 토큰이나 다크 모드의 영향을 **받지 않는다.** 각 사 공식 가이드가 색 변경을 금지한다.

| Kotlin 상수 | HEX | 설명 |
|---|---|---|
| `KakaoContainer` | `#FEE500` | 카카오 버튼 컨테이너 |
| `KakaoSymbol` | `#000000` (`Color.Black`) | 카카오 심볼 |
| `KakaoLabel` | `#191600` | 카카오 레이블 |
| `NaverContainer` | `#03C75A` | 네이버 컨테이너 |
| `NaverLabel` | `#FFFFFF` | 네이버 레이블 |
| `AppleContainer` | `#000000` | Apple 컨테이너 |
| `AppleLabel` | `#FFFFFF` | Apple 레이블 |
| `GoogleContainer` | `#FFFFFF` | Google 컨테이너 |
| `GoogleLabel` | `#1F1F1F` | Google 레이블 |
| `GoogleBorder` | `#747775` | Google 테두리 |

주의 두 가지가 KDoc에 그대로 적혀 있다.

- 네이버 조합(`#03C75A` 면 + 흰 글자 = 2.2:1)은 **공식 규격이라 WCAG 대비 기준을 벗어난다.** DESIGN.md §9의 유일한 예외 1건이다.
- *"백엔드가 지금 카카오만 지원하므로 화면에는 카카오만 노출한다. 값을 미리 둔 것은 컴포넌트가 variant를 다 갖추게 하려는 것이고, 버튼을 화면에 그리라는 뜻이 아니다."*

### 2.8 그림자 틴트 · 스크림 · 플랫폼 창 배경

| 이름 | 값 | 출처 |
|---|---|---|
| `ShadowTint` | `#1B255A` = `rgb(27, 37, 90)` | `Elevation.kt`. `ambientColor`/`spotColor`에 함께 넘긴다 |
| `SCRIM_ALPHA` | `0.5f` | `OverlayScrim.kt`. *"문서의 컴포넌트 규격이 지정한 불투명도 50%"*. DESIGN.md는 40~50%라 적었고 코드는 50%를 쓴다 |
| `@color/bg_canvas` | `#F5F6FA` | `res/values/colors.xml`. *"Compose 밖에서 필요한 색만 둔다. 정본은 `Palette.kt`다."* — 현재 어떤 테마도 참조하지 않는다 |
| `@color/bg_primary` | `#5566D2` | 〃. `values/themes.xml`의 `android:windowBackground`에 쓴다. 웹에서는 `<meta name="theme-color">`와 스플래시 배경에 대응 |

`values/themes.xml` 주석 원문: *"`windowBackground`은 Compose가 첫 프레임을 그리기 전에 보이는 면이다. 앱은 항상 스플래시(1a-1)로 시작하므로 그 화면과 같은 `bg/primary`로 맞춘다. **`bg/canvas`로 두면 회색에서 파란 면으로 한 번 번쩍인다.**"*

**API 31+ 시스템 스플래시 (`res/values-v31/themes.xml`)** — 문서가 빠뜨렸던 항목이다.

| 속성 | 값 | 이유 (주석 원문 요지) |
|---|---|---|
| `android:windowSplashScreenBackground` | `@color/bg_primary` `#5566D2` | 시스템 스플래시 면을 우리 스플래시(1a-1)와 같은 파란 면으로 맞춘다 |
| `android:windowSplashScreenAnimatedIcon` | `@drawable/splash_icon_none` | *"아이콘은 비운다."* 투명 `<shape>` 한 장이다. 시스템은 아이콘을 **창 가운데**에 놓는데 우리 화면은 락업과 태그라인을 묶어 가운데를 잡아서 마크가 눈에 보이게 튄다 |

→ **웹 대응:** `manifest.json`의 `background_color`/`theme_color`를 `#5566D2`로, PWA 스플래시 아이콘은 `SymbolGradient`가 아니라 **비우거나** 첫 화면과 정확히 같은 위치·크기의 락업으로 맞춘다. 안드로이드가 "면은 맞추고 아이콘은 비운다"를 택한 이유가 웹에서도 그대로 성립한다.

### 2.9 Material3 `ColorScheme` 매핑 (웹에서는 참고용)

`Theme.kt`가 41개 시맨틱 토큰을 M3 역할에 얹는다. 웹에 MUI/M3 계열 라이브러리를 쓰지 않으면 이 절은 무시해도 된다. 다만 **두 가지는 웹에도 영향이 있다.**

- `background = bgSurface` — 주석: *"Figma가 bg/canvas를 bg/surface로 전면 재바인딩해서 화면 바닥이 모두 흰색이 됐다."* → **화면 바닥의 기본 배경은 `#FFFFFF`이지 `bgCanvas`(`#F5F6FA`)가 아니다.** `bgCanvas`는 화면이 스스로 그릴 때만 쓴다.
- `secondary`/`tertiary` 계열을 전부 primary 값으로 채웠다. DESIGN.md에 secondary·tertiary 브랜드 단계가 없기 때문이다. → **웹 팔레트에 secondary 색을 만들지 않는다.**

| M3 역할 | 시맨틱 토큰 | 값 |
|---|---|---|
| `primary` / `secondary` / `tertiary` | `bgPrimary` | `#5566D2` |
| `onPrimary` / `onSecondary` / `onTertiary` / `onError` | `fgOnPrimary` | `#FFFFFF` |
| `primaryContainer` / `secondaryContainer` / `tertiaryContainer` | `bgPrimarySubtle` | `#E3E7FC` |
| `onPrimaryContainer` / `onSecondaryContainer` / `onTertiaryContainer` | `fgPrimary` | `#2E3E9E` |
| `inversePrimary` | `Primary300` (팔레트 직접 참조) | `#A3AFF1` |
| `background` / `surface` / `surfaceBright` / `surfaceContainerLowest` | `bgSurface` | `#FFFFFF` |
| `onBackground` / `onSurface` | `fgDefault` | `#131722` |
| `surfaceVariant` / `surfaceDim` / `surfaceContainer` / `surfaceContainerHigh` / `surfaceContainerHighest` | `bgSubtle` | `#EDEFF5` |
| `onSurfaceVariant` | `fgSubtle` | `#585F73` |
| `surfaceTint` | `bgPrimary` | `#5566D2` |
| `surfaceContainerLow` | `bgCanvas` | `#F5F6FA` |
| `inverseSurface` | `bgInverse` | `#131722` |
| `inverseOnSurface` | `fgOnInverse` | `#FFFFFF` |
| `error` / `onErrorContainer` | `fgDanger` | `#C4302B` |
| `errorContainer` | `bgDanger` | `#FFEDEB` |
| `outline` | `borderDefault` | `#C6CAD8` |
| `outlineVariant` | `borderSubtle` | `#DEE1EB` |
| `scrim` | `bgScrim` | `#131722` |

---

## 3. 타이포

### 3.1 폰트 — Pretendard

`Type.kt`의 `MedicalMateFontFamily`. 앱은 **Pretendard v1.3.9 static OTF**를 동봉한다. `res/font/`에 4개 파일이 있다.

| 리소스 | 파일 | Compose `FontWeight` | CSS `font-weight` |
|---|---|---|---|
| `R.font.pretendard_regular` | `pretendard_regular.otf` | `Normal` | 400 |
| `R.font.pretendard_medium` | `pretendard_medium.otf` | `Medium` | 500 |
| `R.font.pretendard_semibold` | `pretendard_semibold.otf` | `SemiBold` | 600 |
| `R.font.pretendard_bold` | `pretendard_bold.otf` | `Bold` | 700 |

KDoc 원문에서 옮길 사실:

- *"Google Fonts에 없어 Downloadable Fonts로는 받을 수 없다."* → 웹도 Google Fonts CDN으로 못 받는다. `cdn.jsdelivr.net/gh/orioncactus/pretendard` 계열의 dynamic-subset CSS를 쓰거나 폰트를 직접 호스팅한다.
- *"DESIGN.md가 쓰는 무게만 넣었다. … 무게가 모두 실물로 있으므로 `Strong` 스타일에 합성 굵기가 걸리지 않는다."* → 웹에서도 **400/500/600/700 네 웨이트를 전부 로드한다.** 합성 굵기(faux bold)를 쓰면 SemiBold 600 스타일이 Bold처럼 뭉개진다.
- *"라이선스는 SIL Open Font License 1.1이고 원문은 `licenses/Pretendard-OFL.txt`에 있다. 재배포 시 저작권 표시와 라이선스를 함께 배포해야 한다."* → **웹앱 정적 자산에 폰트를 올릴 때 OFL 고지를 함께 배포해야 한다.** 빌드 산출물에 라이선스 파일을 포함시킬 것.

### 3.2 텍스트 스타일 15종 — 전체 값

`Type.kt`의 `DefaultMedicalMateTypography`. 자간은 소스가 `(letterSpacingPercent / 100).em`으로 계산하므로 퍼센트를 100으로 나눈 값이 곧 CSS `em`이다.

| Kotlin 필드 | Figma 스타일 | 폰트 | 크기 | 굵기 (Compose) | CSS weight | 행간 | 자간 (%) | **CSS letter-spacing** | 줄바꿈 규칙 |
|---|---|---|---|---|---|---|---|---|---|
| `displayM` | `Display/M` | Pretendard | 30sp | Bold | 700 | 40sp | −2.0% | `-0.02em` | `LineBreak.Heading` |
| `headingL` | `Heading/L` | Pretendard | 24sp | Bold | 700 | 34sp | −2.0% | `-0.02em` | `LineBreak.Heading` |
| `headingM` | `Heading/M` | Pretendard | 20sp | SemiBold | 600 | 28sp | −1.5% | `-0.015em` | `LineBreak.Heading` |
| `headingS` | `Heading/S` | Pretendard | 17sp | SemiBold | 600 | 24sp | −1.0% | `-0.01em` | `LineBreak.Heading` |
| `bodyL` | `Body/L` | Pretendard | 17sp | Normal | 400 | 26sp | 0 | `0` | `LineBreak.Paragraph` |
| `bodyLStrong` | `Body/L Strong` | Pretendard | 17sp | SemiBold | 600 | 26sp | 0 | `0` | `LineBreak.Paragraph` |
| `bodyM` | `Body/M` | Pretendard | 15sp | Normal | 400 | 24sp | 0 | `0` | `LineBreak.Paragraph` |
| `bodyMStrong` | `Body/M Strong` | Pretendard | 15sp | SemiBold | 600 | 24sp | 0 | `0` | `LineBreak.Paragraph` |
| `bodyS` | `Body/S` | Pretendard | 13sp | Normal | 400 | 20sp | 0 | `0` | `LineBreak.Paragraph` |
| `bodySStrong` | `Body/S Strong` | Pretendard | 13sp | SemiBold | 600 | 20sp | 0 | `0` | `LineBreak.Paragraph` |
| `labelL` | `Label/L` | Pretendard | 15sp | SemiBold | 600 | 20sp | 0 | `0` | `LineBreak.Heading` |
| `labelM` | `Label/M` | Pretendard | 13sp | SemiBold | 600 | 18sp | 0 | `0` | `LineBreak.Heading` |
| `labelS` | `Label/S` | Pretendard | 11sp | Medium | 500 | 16sp | **+2.0%** | `0.02em` | `LineBreak.Heading` |
| `numericL` | `Numeric/L` | Pretendard | 24sp | Bold | 700 | 30sp | −1.5% | `-0.015em` | `LineBreak.Heading` |
| `numericM` | `Numeric/M` | Pretendard | 17sp | SemiBold | 600 | 22sp | −1.0% | `-0.01em` | `LineBreak.Heading` |

단위 환산: **sp → px 1:1**로 옮긴다(Android 기본 배율 1.0 기준). 행간은 unitless ratio가 아니라 **px 절대값**으로 넣어야 Figma와 어긋나지 않는다(예: `line-height: 26px`, `1.529`가 아니라).

DESIGN.md §3 규칙 두 줄:

> **본문 기본은 `Body/L`(17).** 진료실에서 소리 내어 읽을 문장이라 15로는 부족하다.
> 헤딩만 자간을 조인다. **한글 본문은 자간을 조이면 판독이 떨어진다.**

→ 웹 `body`의 기본 폰트 크기를 **17px**로 잡는다. 브라우저 기본 16px를 그대로 두면 앱보다 작아진다.

### 3.3 Compose 전용 설정 → 웹 대응

`mmTextStyle()`이 모든 스타일에 공통으로 거는 세 가지다.

| Compose 설정 | 목적 (KDoc 원문 요지) | 웹 대응 |
|---|---|---|
| `lineHeightStyle = LineHeightStyle(alignment = Center, trim = Trim.None)` | *"기본값은 행간 여백을 첫 줄 위와 마지막 줄 아래에도 넣어서 Figma의 텍스트 박스보다 높이가 커진다. `Trim.None`으로 두고 글자를 행 안에서 가운데 정렬한다."* | CSS `line-height`의 half-leading 동작이 이미 `Trim.None` + `Center`와 같다. **추가 설정 불필요.** |
| `platformStyle = PlatformTextStyle(includeFontPadding = false)` | 안드로이드가 글꼴 메트릭에 넣는 여분 패딩 제거 | 웹에는 해당 개념이 없다. **불필요.** 단 정밀 정렬이 필요하면 `text-box-trim`(신규 CSS) 또는 수동 보정을 검토 |
| `lineBreak = LineBreak.Heading` / `LineBreak.Paragraph` | *"규칙이 없으면 한국어가 어절 중간에서 끊긴다. '몰라도 괜찮 / 아요'처럼 읽힌다."* `Heading` = `Balanced + Loose + Phrase`(어절 단위 + 줄 길이 균등) | **아래 §3.4 참고. 웹에서 반드시 처리해야 하는 항목이다.** |

### 3.4 한국어 줄바꿈 — 웹에서 꼭 넣어야 할 CSS

소스가 이 문제에 긴 주석을 남겼다. 원문 요지: *"기기 폭은 360부터 412까지 갈리고 사용자가 글꼴 배율을 2배까지 올린다. Figma 캔버스는 390 하나라서, 한 줄에 맞춰 그린 문장이 실제 기기에서 넘어간다. 넘어가는 것을 막을 수는 없으니 어디서 끊길지를 정한다."*

| Compose `LineBreak` | 구성 | 적용 스타일 | 웹 CSS |
|---|---|---|---|
| `LineBreak.Heading` | `Balanced` + `Loose` + `Phrase` | Display, Heading L/M/S, Label L/M/S, Numeric L/M (9종) | `word-break: keep-all; text-wrap: balance;` |
| `LineBreak.Paragraph` | 긴 글 가독성 우선 | Body L/L Strong/M/M Strong/S/S Strong (6종) | `word-break: keep-all; text-wrap: pretty;` |

`word-break: keep-all`이 한국어 어절 단위 끊기(`WordBreak.Phrase`)에 대응한다. **이게 없으면 웹에서도 "몰라도 괜찮/아요"가 그대로 나온다.** `text-wrap: balance`는 Chrome 114+ / Safari 17.5+, `pretty`는 Chrome 117+이며 미지원 브라우저에서는 조용히 무시되므로 폴백이 필요 없다(안드로이드에서 `Phrase`가 API 33 미만에서 무시되는 것과 같은 상황).

### 3.5 M3 슬롯 매핑 (참고)

`Type.kt`의 `MaterialTypography`. M3 컴포넌트가 내부에서 읽는 15개 슬롯을 채운 것이다. 웹에서 M3 라이브러리를 안 쓰면 필요 없다. **`Numeric/L`·`Numeric/M`·`Body/M Strong`·`Body/S Strong`은 대응 M3 슬롯이 없다**는 사실만 기록한다.

| M3 슬롯 | 우리 스타일 |
|---|---|
| `displayLarge`, `displayMedium` | `displayM` |
| `displaySmall`, `headlineLarge` | `headingL` |
| `headlineMedium`, `headlineSmall`, `titleLarge` | `headingM` |
| `titleMedium` | `headingS` |
| `titleSmall` | `bodyLStrong` |
| `bodyLarge` | `bodyL` |
| `bodyMedium` | `bodyM` |
| `bodySmall` | `bodyS` |
| `labelLarge` | `labelL` |
| `labelMedium` | `labelM` |
| `labelSmall` | `labelS` |

---

## 4. 치수

### 4.1 간격 `MedicalMateSpace` — 12개

`Dimens.kt`. KDoc: *"임의의 간격값을 쓰지 않는다. 새 값이 필요하면 컴포넌트에 하드코딩하기 전에 여기에 추가할지 검토한다."*

| Kotlin | Figma 토큰 | 값 | CSS |
|---|---|---|---|
| `MedicalMateSpace.s2` | `space/2` | 2.dp | `2px` |
| `MedicalMateSpace.s4` | `space/4` | 4.dp | `4px` |
| `MedicalMateSpace.s6` | `space/6` | 6.dp | `6px` |
| `MedicalMateSpace.s8` | `space/8` | 8.dp | `8px` |
| `MedicalMateSpace.s10` | `space/10` | 10.dp | `10px` |
| `MedicalMateSpace.s12` | `space/12` | 12.dp | `12px` |
| `MedicalMateSpace.s14` | `space/14` | 14.dp | `14px` |
| `MedicalMateSpace.s16` | `space/16` | 16.dp | `16px` |
| `MedicalMateSpace.s20` | `space/20` | 20.dp | `20px` |
| `MedicalMateSpace.s24` | `space/24` | 24.dp | `24px` |
| `MedicalMateSpace.s32` | `space/32` | 32.dp | `32px` |
| `MedicalMateSpace.s40` | `space/40` | 40.dp | `40px` |

> 4의 배수 스케일이 아니다. 2 · 6 · 10 · 14가 섞여 있으므로 Tailwind 기본 spacing(0.25rem 배수)에 매핑하지 말고 **전용 스케일로 덮어쓴다.**

### 4.2 크기·레이아웃 `MedicalMateSize` — 14개

| Kotlin | Figma 토큰 | 값 | 소스 주석 / DESIGN.md 원문 |
|---|---|---|---|
| `touchMin` | `size/touch-min` | 48.dp | 접근성 기준. *"시각 규격이 더 작은 컨트롤(32 Icon Button, 42 Date Cell)은 hit area를 따로 넓혀 48을 맞춘다"* |
| `iconSm` | `size/icon-sm` | 18.dp | |
| `iconMd` | `size/icon-md` | 20.dp | |
| `iconLg` | `size/icon-lg` | 24.dp | |
| `controlSm` | `size/control-sm` | 40.dp | |
| `controlMd` | `size/control-md` | 48.dp | |
| `controlLg` | `size/control-lg` | 56.dp | |
| `mic` | `size/mic` | 88.dp | *"주 음성 입력 버튼."* |
| `screenWidth` | `layout/screen-w` | 360.dp | *"기준 화면 폭. **이 값으로 레이아웃을 고정하지 않는다.** 거터를 유지하고 콘텐츠를 Fill한다."* |
| `gutter` | `layout/gutter` | 20.dp | 좌우 여백 |
| `contentWidth` | `layout/content-w` | 320.dp | *"360 기준 콘텐츠 폭. **모든 기기에서 강제하지 않는다.**"* |
| `safeBottom` | `layout/safe-bottom` | 24.dp | *"Figma 컴포넌트 내부의 시각 여백이라 기기 inset과 중복 적용하지 않는다."* |
| `navBarHeight` | `layout/nav-h` | 56.dp | |
| `tabBarHeight` | `layout/tabbar-h` | **79.dp** | *"DESIGN.md 3.0이 `layout/tabbar-h`를 79로 확정했다. 2.0까지는 토큰이 82이고 Figma 마스터만 79여서 마스터를 따랐다."* → **82가 아니라 79다.** |

주석: *"OS 상태바와 홈 인디케이터 높이는 여기 두지 않는다. 플랫폼 safe-area를 쓴다."* → 웹은 `env(safe-area-inset-bottom)`으로 대응하고, `safeBottom` 24는 그것과 **별개로** 컴포넌트 내부 여백으로 유지한다(중복 적용 금지).

### 4.2.1 크롬 3종의 높이 내역 — 토큰이 어떻게 조립됐는가

`tabBarHeight` 79와 Bottom CTA Bar 92는 임의의 숫자가 아니라 다른 토큰의 합이다. 소스가 내역을 주석으로 남겼다. **웹에서 이 합을 그대로 쌓으면 79/92가 저절로 나온다.** 매직 넘버를 박지 말 것.

| 컴포넌트 | 총높이 | 내역 | 소스 |
|---|---|---|---|
| **Tab Bar** | **79** | 경계선 1 + 위 여백 `space/8` + 탭 46 + 아래 안전 여백 `layout/safe-bottom` 24 | `TabBar.kt`. `TabRowHeight = 54.dp`(= 8 + 46)가 실제 상수이고, hairline 1 + 54 + 24 = 79 |
| **Bottom CTA Bar** | **92** | 위 여백 `space/12` + L 버튼 `size/control-lg` 56 + 아래 안전 여백 `layout/safe-bottom` 24 | `BottomCtaBar.kt`. 좌우는 `layout/gutter` 20 |
| **Nav Bar** | **56 이상** | `heightIn(min = navBarHeight)` — **고정이 아니라 최소값이다.** 제목이 길면 늘어난다 | `NavBar.kt` |

두 가지가 더 있다.

- **Bottom CTA Bar의 자식 간격은 `space/10`이다.** KDoc: *"**자식이 둘 이상이면 10씩 벌린다.** 전에는 간격이 없어서 버튼 둘이나 체크박스와 버튼이 맞붙었다. 1c-5의 두 버튼이 시안에서 10 떨어져 있고(78 − 12 − 56), 하단에 나란히 놓이는 것들이 붙어 있어야 할 이유가 없다. 자식이 하나면 이 값은 보이지 않는다."* → 웹은 `display: flex; flex-direction: column; gap: var(--mm-space-10)`. `gap`은 자식이 하나면 자동으로 보이지 않으므로 조건 분기가 필요 없다.
- **Nav Bar 제목은 "남은 폭의 가운데"가 아니라 "바의 가운데"다.** KDoc: *"전에는 좌우 슬롯 사이에 제목을 끼워 넣어서, 오른쪽에 텍스트 액션이 붙으면 그 폭만큼 제목이 왼쪽으로 밀렸다. 마스터는 좌우에 같은 값을 비우고 그 안에서 가운데에 둔다 — **액션이 없으면 60, 텍스트 액션이 있으면 88**이다. 화면을 넘길 때마다 제목이 자리를 지켜야 눈이 따라가지 않는다."*

| Nav Bar 상수 | 값 | 내역 |
|---|---|---|
| `TitleInset` | 60 | 바깥 `space/8` + 슬롯 `size/touch-min` 48 + 간격 `space/4` |
| `TitleInsetWithAction` | 88 | 텍스트 액션이 있을 때. *"마스터가 88로 더 비운다"* |
| 좌우 슬롯 | 48 × 48 | `size/touch-min`. **비어 있어도 자리를 지킨다** — *"좌우 균형에 쓰인다"* |
| 우측 액션 라벨 | `Body/L Strong` 17 | *"저장이나 완료 같은 동작은 아이콘만으로 뜻이 전달되지 않는다. 버튼 컴포넌트의 S 라벨(13)로 두면 같은 자리의 글자가 화면마다 다른 크기로 선다."* |

→ 웹 구현: 제목을 flex 형제로 두지 말고 **`position: absolute; left: 60px; right: 60px; text-align: center`**(액션이 있으면 88)로 띄운다. flex `justify-content: space-between`에 제목을 끼우면 안드로이드가 고친 그 버그를 그대로 재현하게 된다.

### 4.3 사이징 규칙 (DESIGN.md §5)

> **높이는 내용이 정하고(HUG), 폭은 화면이 채운다(FILL).**

웹 번역: 컨테이너에 고정 `height`를 주지 않고 콘텐츠가 밀어내게 둔다(`height: auto`). 폭은 `width: 100%`.

고정 규격은 "규격이 곧 의미인 것"만 — 원문 열거: **Icon Button(정사각) · Avatar(원형 44) · Date Cell(42 · 시트 안에서는 34) · Nav Bar(56) · 컨트롤 높이(56/48/40).**

> **화면 프레임은 `Content`를 FILL로 두고 최소 812를 보장한다.** HUG로 두면 내용이 짧을 때 프레임이 같이 줄어든다.

→ 웹: 화면 루트에 `min-height: 100dvh`(안드로이드 812 대응). `100vh`는 모바일 브라우저 주소창 때문에 어긋난다.

### 4.4 Loading 컴포넌트 규격 (`Loading.kt`)

| 값 | 값 | 출처 |
|---|---|---|
| Spinner/Skeleton 최소 높이 | 116.dp | `LoadingMinHeight`. *"문서의 116/132를 아우르는 최소 높이"* |
| Skeleton 줄 높이 | 16.dp | `SkeletonLineHeight` |
| Skeleton 기본 줄 폭 비율 | `[0.6, 1.0, 0.8]` | *"제목 한 줄과 본문 두 줄. 목록이 아닌 카드 하나를 기다릴 때의 기본값"* |
| Skeleton 줄 색 / 반경 | `bgSubtle` `#EDEFF5` / `radius/xs` 8 | |
| Spinner 색 / 크기 | `bgPrimary` `#5566D2` / `iconLg` 24 | |
| Spinner·Skeleton 패딩 / 줄 간격 | `space/20` / `space/12` | |

**반짝임(shimmer)을 넣지 않았다.** KDoc 원문: *"문서의 접근성 기준이 움직임 축소 설정에서 움직임을 줄이라고 하는데, 애니메이션을 넣으면 그 설정을 읽어 끄는 처리가 함께 필요하다. 정지 상태로 두면 두 경우가 같아진다."* → **웹에서도 스켈레톤에 shimmer를 넣지 않는다.** 넣으려면 `prefers-reduced-motion` 처리를 함께 해야 한다.

---

## 5. 반경 `MedicalMateRadius` — 10개

`MedicalMateRadius.kt`. KDoc: *"같은 화면에서 반경 단계를 두 단계 이상 건너뛰지 않는다."*

### 5.1 표준 스케일 7개

| Kotlin | Figma 토큰 | 값 | 용도 (소스 KDoc / DESIGN.md §4.1) | CSS |
|---|---|---|---|---|
| `xs` | `radius/xs` | 8.dp | Badge, Checkbox / 배지 · 체크박스 | `border-radius: 8px` |
| `sm` | `radius/sm` | 12.dp | S Button, 원문 블록 / S 버튼 · 원문 블록 · 질문 pill | `12px` |
| `md` | `radius/md` | 16.dp | L Button, Notice / L 버튼 · Notice · 입력 필드 | `16px` |
| `lg` | `radius/lg` | 20.dp | Card, Callout | `20px` |
| `xl` | `radius/xl` | 24.dp | Dialog | `24px` |
| `xxl` | `radius/2xl` | 28.dp | Bottom Sheet 전체 반경. *"실제 시트는 위쪽만 둥글어 `sheetTop`을 쓴다"* | `28px` |
| `full` | `radius/full` | `CircleShape` (= 999) | Chip, Avatar, pill / Icon Button | `9999px` (원형 요소는 `50%`) |

### 5.2 스케일 밖 중간값 3개 — 소스가 이유까지 적어 두었다

| Kotlin | 값 | 소스 KDoc 원문 |
|---|---|---|
| `buttonM` | 14.dp | *"M Button 전용. 4.2 Scale에 없는 중간값이다."* 문서의 Button은 L/M/S에 16/14/12를 쓰는데 14는 Scale에 없다 |
| `dateCell` | 13.dp | *"Date Cell 전용. 4.2 Scale에 없는 값이다. 마스터(`335:1188`)가 42 칸에 13을 쓴다. 원(21)이 아니라 둥근 사각형이고, `sm`(12)이나 `buttonM`(14)으로 바꾸면 한 주 일곱 칸이 나란히 놓일 때 차이가 눈에 띈다."* |
| `sheetTop` | `topStart=28, topEnd=28` | Bottom Sheet. 위쪽 두 각만 28 → CSS `border-radius: 28px 28px 0 0` |

**웹에서도 이 3개를 없애지 말 것.** 특히 `dateCell` 13은 캘린더 한 주 7칸을 나란히 놓을 때 눈에 띈다고 소스가 명시했다.

### 5.3 M3 Shapes 매핑 (참고)

`MedicalMateShapes`. 슬롯이 5개라 7단계를 다 담지 못한다.

| M3 슬롯 | 우리 반경 |
|---|---|
| `extraSmall` | `xs` 8 |
| `small` | `sm` 12 |
| `medium` | `md` 16 |
| `large` | `lg` 20 |
| `extraLarge` | `xl` 24 |

`radius/full`과 중간값(`buttonM`, `dateCell`, `sheetTop`)은 M3 슬롯에 없다.

---

## 6. 고도 · 그림자

### 6.1 Figma 원본값 — **웹은 이걸 그대로 쓴다**

`Elevation.kt` KDoc이 2026-09-07 기준 Figma 원본을 그대로 적어 두었다.

```
Elevation/Card   #1B255A14 (0, 3)  blur 10  +  #1B255A0D (0, 1) blur 2
Elevation/Float  #1B255A17 (0, 4)  blur 14  +  #1B255A0F (0, 1) blur 3
Elevation/Sheet  #1B255A1A (0, -4) blur 24  +  #1B255A0D (0, 0) blur 2
```

알파 16진 → 소수 환산과 DESIGN.md §4.2 퍼센트 대조:

| 단계 | 레이어 1 | 레이어 2 | DESIGN.md 표기 | **CSS `box-shadow`** |
|---|---|---|---|---|
| Card | `#1B255A` α `0x14`=20/255≈**0.08**, y3, blur10 | α `0x0D`=13/255≈**0.05**, y1, blur2 | y3 blur10 8% + y1 blur2 5% | `0 3px 10px rgba(27,37,90,.08), 0 1px 2px rgba(27,37,90,.05)` |
| Float | α `0x17`=23/255≈**0.09**, y4, blur14 | α `0x0F`=15/255≈**0.06**, y1, blur3 | y4 blur14 9% + y1 blur3 6% | `0 4px 14px rgba(27,37,90,.09), 0 1px 3px rgba(27,37,90,.06)` |
| Sheet | α `0x1A`=26/255≈**0.10**, y**−4**, blur24 | α `0x0D`≈**0.05**, y0, blur2 | y−4 blur24 10% + y0 blur2 5% | `0 -4px 24px rgba(27,37,90,.10), 0 0 2px rgba(27,37,90,.05)` |

### 6.2 Compose 근사값 — 안드로이드만의 타협

`MedicalMateElevation`은 dp 3개뿐이다.

| Kotlin | 값 | 쓰임 (KDoc) |
|---|---|---|
| `MedicalMateElevation.card` | 3.dp | Card, 선택 행 |
| `MedicalMateElevation.float` | 4.dp | 하단 고정 바, Toast, 플로팅 |
| `MedicalMateElevation.sheet` | 8.dp | Bottom Sheet, Dialog |

KDoc 원문: ***"Compose로 이 값을 그대로 옮길 수 없다.** `Modifier.shadow`는 elevation dp와 shape만 받는다. offset과 blur를 따로 지정할 수 없고, 2단 그림자도 표현하지 못한다. Sheet의 위쪽(−4) 방향은 특히 재현할 수 없다."* 그리고 *"브랜드 틴트는 API 28부터 적용된다. minSdk 24라서 API 24~27에서는 그림자가 검정으로 나온다."*

**→ 웹은 이 제약이 전혀 없다.** 안드로이드 화면과 비교하면 웹 쪽이 더 정확해 보일 수 있는데, 그게 정상이다. §6.1의 CSS 값을 쓴다.

DESIGN.md §4.2 규칙: *"**테두리 대신 고도로 위계를 만든다.** 카드·필드·알림이 모두 1px 선을 두르면 화면이 선으로 가득 찬다. 선은 목록 구분과 포커스에만. 그림자는 브랜드 틴트. 흰 화면 위의 검정 그림자는 회색 때처럼 보인다."*

### 6.3 Glass `MedicalMateGlass`

| Kotlin | 값 | 설명 |
|---|---|---|
| `blurRadius` | 24.dp | `Surface/Glass` = background-blur 24 |
| `BOTTOM_CTA_ALPHA` | `0.78f` | Bottom CTA Bar 면 알파 |
| `NAV_BAR_ALPHA` | `0.82f` | Nav Bar 면 알파 |
| `TAB_BAR_ALPHA` | `0.86f` | Tab Bar 면 알파 |
| `MIN_BLUR_SDK` | `Build.VERSION_CODES.S` (31) | 블러가 걸리는 최소 SDK |
| `isBlurSupported` | `SDK_INT >= 31` | 런타임 판정 |

`MedicalMateSurfaceStyle` 열거는 `OPAQUE`, `GLASS` 두 값이다.

KDoc 원문: ***"Android에서 블러는 API 31부터다.** … minSdk 24라서 Android 7.0~11에서는 블러가 걸리지 않는다. 문서가 말하는 Opaque 변형은 선택이 아니라 필수 경로다. 저사양 기기와 절전 모드에서도 Opaque로 내린다. Opaque 변형은 같은 레이아웃과 대비를 유지해야 한다. 알파를 1로 올리는 것으로 끝내지 말고 뒤에 `bg/surface`를 깐다."*

#### 6.3.1 실제 구현은 블러를 한 번도 그리지 않는다

`MedicalMateGlass.MIN_BLUR_SDK`(31)만 보면 "API 31 이상에서는 블러가 걸린다"로 읽힌다. **호출부를 보면 아니다.** `BottomCtaBar.kt` KDoc 원문:

> *"**기본값이 `OPAQUE`다.** 문서의 고도 규칙은 스크롤 콘텐츠 위에 Glass를 쓰라고 하는데, 지금 구현에서 블러가 걸리지 않는다. **compose-ui 1.10.5에는 뒤 배경을 블러하는 API가 없다.** `Modifier.blur`는 자기 콘텐츠를 블러하는 것이고 클래스 목록에 `Backdrop` 계열이 없다. `RenderEffect`도 API 31부터라 minSdk 24에서는 절반이 넘는 지원 범위에서 쓸 수 없다.*
>
> *블러 없이 반투명만 주면 아래로 지나가는 글자가 버튼 라벨과 겹쳐 읽힌다. 블러가 하려던 일이 그것을 막는 것이라서, 대안이 생기기 전까지 기본값을 불투명으로 둔다. `GLASS`는 문서 값(`bg/surface` 78%)대로 남겨 뒀고 배경이 단순한 화면에서 쓸 수 있다."*

**즉 `MedicalMateGlass.blurRadius = 24.dp`는 화면에 한 번도 적용된 적이 없는 값이다.** `isBlurSupported`도 어느 컴포넌트에서도 호출되지 않는다. 안드로이드 스크린샷과 웹을 비교할 때 이 차이를 알고 봐야 한다.

세 크롬 컴포넌트가 모두 같다.

| 컴포넌트 | `surface` 기본값 | `GLASS`일 때 면 | `OPAQUE`일 때 면 | 그림자 |
|---|---|---|---|---|
| `MedicalMateNavBar` | **`OPAQUE`** | `bgSurface` α `0.82` | `bgSurface` | 없음. 대신 하단 1px 경계선 |
| `MedicalMateTabBar` | **`OPAQUE`** | `bgSurface` α `0.86` | `bgSurface` | 없음. 대신 상단 1px 경계선 |
| `MedicalMateBottomCtaBar` | **`OPAQUE`** | `bgSurface` α `0.78` | `bgSurface` | **`OPAQUE`에만** `Elevation/Float` (`ambientColor`/`spotColor` = `ShadowTint`). `GLASS`는 그림자 없음 |

`BottomCtaBar` KDoc이 그림자 분기의 이유를 적었다:

> *"**불투명 변형에는 `Elevation/Float`이 걸린다.** 마스터(`294:652`)의 `Surface=Opaque`가 그 그림자를 달고 있고 `Glass`는 블러만 있다. **블러가 없는 쪽은 그림자가 층을 만들어야 한다** — 없으면 스크롤되는 본문이 바 위에서 잘릴 때 위에 뜬 층이 아니라 본문이 잘린 것으로 읽힌다."*

그림자 방향에 대한 코드 주석 원문: *"마스터의 그림자는 y+4라 아래로 떨어진다. 화면 맨 아래에 붙는 바에서는 그쪽이 잘리고 위쪽 ambient만 남는데, 본문과 바를 가르는 데는 그 한 겹이면 된다."* — `BottomCtaBar`는 `Elevation/Sheet`(y−4)가 아니라 **`Elevation/Float`(y+4)**를 쓴다. 웹에서 `--mm-elevation-sheet`를 잘못 얹지 말 것.

> **웹에서는 이 "잘림"이 일어나지 않는다.** `box-shadow`는 뷰포트 밖으로 나가도 그려지지 않을 뿐 클리핑 규칙이 다르다. 화면 아래에 고정된 바에 `--mm-elevation-float`를 그대로 주면 y+4 레이어가 보이지 않고 위쪽으로 번지는 성분만 남아, 결과적으로 안드로이드와 같은 인상이 된다. 값을 바꾸지 말 것.

**→ 웹 판단 (안드로이드와 갈리는 지점):**

1. **웹은 Glass를 진짜로 쓸 수 있다.** `backdrop-filter: blur(24px)`가 안드로이드에 없던 backdrop 블러 그 자체다. 따라서 **웹의 기본값은 `GLASS`로 두는 것이 DESIGN.md §4.2 원칙("글래스는 콘텐츠 위에 겹치는 크롬 전용")에 더 맞다.** 안드로이드가 `OPAQUE`를 기본으로 둔 건 플랫폼 제약이지 디자인 의도가 아니다.
2. **그림자 분기는 그대로 옮긴다.** `@supports`로 블러가 안 걸리는 브라우저에서만 `--mm-elevation-float`를 얹는다. 블러가 걸리면 그림자를 빼는 것이 마스터 규격이다.
3. **TabBar의 1px 상단 선은 Glass에서도 유지한다.** 아래 6.3.2 참고.

#### 6.3.2 "Glass에 테두리를 두지 않는다"의 예외 2건

`Elevation.kt` KDoc이 *"Glass에는 테두리를 추가하지 않는다"*라고 적었지만, 실제 컴포넌트 둘이 명시적으로 예외를 둔다. 둘 다 KDoc에 이유가 적혀 있다.

| 컴포넌트 | 선 | 색 | 이유 (주석 원문 요지) |
|---|---|---|---|
| `TabBar` 상단 | 1dp (`HairlineHeight`) | `borderSubtle` `#DEE1EB` | *"문서의 고도 규칙이 Glass에 테두리를 두지 말라고 하지만, Tab Bar는 콘텐츠와 맞닿는 경계라 마스터에 1px 선이 있다. **목록 구분선과 같은 성격이다.**"* |
| `NavBar` 하단 | 1dp (`BottomBorderWidth`). `drawBehind`로 **아래 한 변만** | `borderSubtle` `#DEE1EB` (표면 방식과 무관하게 항상) | *"Nav Bar v2가 더한 선이다. 스크롤할 때 크롬과 콘텐츠의 경계를 잡아준다. **Glass 표면에서는 면이 반투명해서 선이 없으면 밑의 글이 바 안으로 흘러 들어온 것처럼 보인다.** … `Modifier.border`는 네 변을 다 두르므로 아래만 그린다."* |

`BottomCtaBar`는 예외가 아니다. KDoc이 못 박았다: *"문서는 Glass에 테두리를 추가하지 말라고 한다. **불투명 변형에도 테두리를 두지 않는다.**"* → 세 크롬 중 Bottom CTA Bar만 선이 없고 그림자로 층을 만든다.

→ 웹에서도 `.mm-glass`에 일괄 `border`를 걸지 말고, **Tab Bar는 `border-top`, Nav Bar는 `border-bottom` 한 변만, Bottom CTA Bar는 선 없이 `box-shadow`만** 준다. `Modifier.border`가 네 변을 다 두르는 문제는 CSS에서 `border-block-start`/`border-block-end` 한 변 지정으로 자연히 해결된다.

**웹 구현:**

```css
.mm-glass {
  background: rgb(255 255 255 / var(--mm-glass-alpha-nav));
  -webkit-backdrop-filter: blur(var(--mm-glass-blur));
  backdrop-filter: blur(var(--mm-glass-blur));
}
/* Opaque 폴백 — 알파만 1로 올리지 말고 bg/surface를 깐다 */
@supports not (backdrop-filter: blur(1px)) {
  .mm-glass { background: var(--mm-bg-surface); }
}
```

DESIGN.md §4.2: *"**글래스는 콘텐츠 위에 겹치는 크롬 전용** — Nav Bar · Tab Bar · 스크롤 위 Bottom CTA Bar. 불투명 폴백 변이를 함께 정의한다."* KDoc 추가: *"Glass에는 테두리를 추가하지 않는다. 한 화면에서 떠 있는 층은 최대 두 단계다."*

### 6.4 Overlay Scrim

`bgScrim` `#131722` + `SCRIM_ALPHA` `0.5f` → `background: rgb(19 23 34 / .5)`.

`OverlayScrim.kt` KDoc의 동작 규칙 두 가지가 웹에도 그대로 적용된다.

- *"`onDismiss`가 없으면 눌러도 닫히지 않는다. … 그 경우에도 터치는 삼켜서 뒤에 있는 화면이 눌리지 않게 한다. 스크림이 시각적으로만 덮고 터치를 흘려보내면 사용자는 보이지 않는 버튼을 누르게 된다."* → 웹에서 `pointer-events: none`을 스크림에 주면 안 된다.
- *"눌림 표시(ripple)를 주지 않는다. 스크림은 누르는 대상이 아니라 닫는 자리다."* → `:active` 배경 변화 없음, `cursor`도 기본값.

---

## 7. 통증 5단계 (`MedicalMateSeverity`)

색·라벨·설명·NRS 구간이 한 enum에 묶여 있다. KDoc: *"Severity Slider, Scale, Select, Readout이 함께 쓴다. 네 컴포넌트가 같은 단계 정의를 따로 들면 문구나 색이 갈린다."*

| `level` | `base` 색 | `tint` 색 | NRS 구간 | **라벨 (화면 문구 그대로)** | **설명 (화면 문구 그대로)** |
|---|---|---|---|---|---|
| 1 | `#FFE3A8` | `#FFF6E4` | 1–2 | `조금 불편해요` | `신경 쓰이지만 하던 일은 계속할 수 있어요` |
| 2 | `#FFC79B` | `#FFEFE4` | 3–4 | `은근히 아파요` | `자꾸 생각나고 집중이 잘 안 돼요` |
| 3 | `#FFA894` | `#FFE9E3` | 5–6 | `꽤 아파요` | `하던 일을 멈추게 될 때가 있어요` |
| 4 | `#F58079` | `#FDE4E2` | 7–8 | `많이 아파요` | `일상생활이 어렵고 참기 힘들어요` |
| 5 | `#DC5A55` | `#F9DEDD` | 9–10 | `견디기 힘들어요` | `잠도 못 자고 아무것도 못 하겠어요` |

관련 문구 (`res/values/strings.xml`, 화면에 그대로 나온다):

| string 이름 | 값 (원문 그대로) |
|---|---|
| `severity_nrs` | `NRS %1$d–%2$d` (구분자는 en dash `\u2013`) |
| `severity_level_content_description` | `%1$d단계, %2$s` — 스크린리더용 |
| `severity_scale_low` | `가벼운 불편` |
| `severity_scale_high` | `매우 심함` |

`nrsFirst`/`nrsLast` 출처에 대한 KDoc 원문: *"문서에 없다. Figma의 Severity Readout 마스터(`333:1126`)에서 읽은 값이다. **임상 척도라서 추정하지 않았다.**"*

### 7.1 색만으로 전달하지 않는다 — 웹에서 반드시 지킬 것

KDoc 원문: *"단계를 색만으로 전달하지 않는다. 문서의 D11과 9절이 숫자, 낱말, 상황 설명 중 하나 이상을 색과 함께 제공하라고 한다. 그래서 `labelRes`와 `descriptionRes`를 항상 함께 노출할 수 있게 묶어 뒀다."*

DESIGN.md §1 D11: *"색만으로 구분하지 않는다 — 반드시 형태·낱말과 겹친다."*

**→ 웹의 severity 칩/슬라이더에서 색상 배경만 렌더링하는 구현은 금지.** 숫자·라벨·설명 중 최소 하나를 항상 함께 그린다.

### 7.2 TypeScript 타입

```ts
export type MedicalMateSeverityLevel = 1 | 2 | 3 | 4 | 5;

export interface MedicalMateSeverity {
  level: MedicalMateSeverityLevel;
  label: string;        // labelRes
  description: string;  // descriptionRes
  nrsFirst: number;
  nrsLast: number;
  base: string;         // severity{n}
  tint: string;         // severity{n}Tint
}
```

범위 밖 값 처리: `ofLevel(level)`은 1~5가 아니면 예외를 던진다. 메시지 원문 `통증 단계는 1~5입니다. 받은 값: $level` — **이건 개발자용 예외 메시지이며 화면에 노출되지 않는다.** (같은 성격으로 `MedicalMateColors.kt`의 `MedicalMateColors를 찾을 수 없습니다. MedicalMateTheme으로 감싸세요.`도 개발자용이다.) 웹에서는 예외를 던지는 대신 상위에서 검증하고 폴백을 두는 편이 낫다.

---

## 8. 아이콘 46종

### 8.1 공통 규격 (전수 확인)

`res/drawable/ic_*.xml` 46개를 전부 열어 확인한 결과다.

| 항목 | 값 | 예외 |
|---|---|---|
| `android:width` / `height` | `24dp` | 없음 (46/46) |
| `viewportWidth` / `Height` | `24` / `24` → SVG `viewBox="0 0 24 24"` | 없음 (46/46) |
| 색 | `#131722` (= `fg/default`) | 없음 (46/46) |
| `strokeWidth` | `1.75` | **`ic_more_horizontal`만 `2.6`** (점 3개를 굵은 캡으로 찍기 때문) |
| `strokeLineCap` / `strokeLineJoin` | `round` / `round` | 획형 42종 전부 |
| `<group>` | 0개 | 없음 |
| `clip-path` / `trimPath` | 0개 | 없음 |
| `<gradient>` | 0개 | 없음 (로고 1종과 런처 배경 1종에만 있음, §8.7 / §8.9) |
| `fillType` | 미지정 (= nonZero) | **`ic_user_filled`만 `evenOdd`** |
| 획형 : 채움형 | **42 : 4** | 채움형 = `home-filled`, `note-filled`, `calendar-filled`, `user-filled` 넷뿐이다. 나머지 42종은 전부 `strokeColor`만 쓰고 `fillColor`가 없다 |

DESIGN.md §6: *"24×24 격자 · 라이브 20 · 획 **1.75** · 라운드 캡/조인 · 단일 색. **16 이하로 줄이지 않는다.** 획이 뭉개진다. 탭 활성은 채움형으로 전환 — 색만 바뀌면 색각 이상에서 상태가 전달되지 않는다."*

`MedicalMateIcons.kt` KDoc: *"기본 크기 24, 인라인 20, 좁은 자리 18이다. 16 이하로 줄이지 않는다. 원본 색은 `fg/default`이고 문맥에 따라 `Icon`의 tint로 바꾼다. 라벨 없는 아이콘 버튼에는 접근성 이름을 반드시 준다."* 그리고 *"drawable 파일은 Figma에서 내보낸 것이다. **손으로 고치지 말고 원본에서 다시 내보낸다.**"*

### 8.2 SVG 변환 가능 여부 — 결론: **46/46 전부 1:1 변환 가능**

group·clip-path·trimPath·pathData 애니메이션·gradient가 **하나도 없다.** 변환은 속성 이름 치환 수준이다.

| Vector Drawable 속성 | SVG 속성 |
|---|---|
| `android:viewportWidth="24" android:viewportHeight="24"` | `viewBox="0 0 24 24"` |
| `android:width="24dp" android:height="24dp"` | **버린다.** 크기는 CSS로 준다 (`width: 1em` 또는 `--mm-size-icon-*`) |
| `android:pathData` | `d` (문법이 동일하다. M/L/H/V/C/Z 그대로) |
| `android:strokeColor="#131722"` | `stroke="currentColor"` ← **tint를 위해 currentColor로 바꾼다** |
| `android:strokeWidth="1.75"` | `stroke-width="1.75"` |
| `android:strokeLineCap="round"` | `stroke-linecap="round"` |
| `android:strokeLineJoin="round"` | `stroke-linejoin="round"` |
| `android:fillColor="#131722"` | `fill="currentColor"` |
| `android:fillType="evenOdd"` | `fill-rule="evenodd"` |
| (`fillColor` 없음 = 미채움) | **`fill="none"` 을 반드시 명시** |

> **유일한 함정이 마지막 줄이다.** Vector Drawable은 `fillColor`를 안 쓰면 채우지 않지만, SVG `path`는 `fill`의 초기값이 `black`이다. 그대로 옮기면 획형 아이콘 42종이 전부 검은 덩어리가 된다. 획형 path마다 `fill="none"`을 넣거나, `<svg>` 루트에 `fill="none" stroke="currentColor"`를 걸고 채움형만 개별 지정한다.

권장 형태 (획형):

```html
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
     stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"
     width="24" height="24" aria-hidden="true">
  <path d="M4.8 12.6 L9.6 17.4 L19.2 6.8"/>
</svg>
```

권장 형태 (채움형):

```html
<svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24" aria-hidden="true">
  <path fill-rule="evenodd" d="..."/>
</svg>
```

일괄 변환 스크립트(Node)의 치환 규칙은 위 표 그대로면 된다. 46개 파일에 조건 분기가 필요한 곳은 `more-horizontal`의 `stroke-width`(2.6)와 `user-filled`의 `fill-rule`(evenodd) 두 곳뿐이다. 나머지 44개는 `viewBox` 고정(`0 0 24 24`) · `stroke-width` 고정(1.75) · 색 고정(`#131722`)이라 분기가 없다.

> 로고 6종과 카카오 심볼은 이 규칙 밖이다. `viewBox`가 제각각이고(48×48 / 139×36 / 20×18.6667), 전부 채움형이며, `ic_logo_symbol_gradient` 하나만 `aapt:attr` 그라디언트를 쓴다(§8.7). 온보딩 일러스트 4종은 `stroke-width`가 1.65~3.3으로 흩어져 있어 아이콘 규격을 적용하면 안 된다(§8.9).

### 8.3 46종 대응표

`용도` 열은 **실제 호출부를 grep해서 확인한 것**이다. 호출부가 없는 것은 그렇게 적었다. `그룹`은 `MedicalMateIcons.kt`의 주석 구획을 그대로 옮긴 것이다.

| # | Kotlin 이름 | Figma `Icon/{name}` | drawable | Figma node id | 그룹 | path 수 | 획/채움 | SVG 변환 | 실제 쓰이는 곳 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `Mic` | `mic` | `ic_mic.xml` | `302:698` | 음성 입력 | 3 | 획 1.75 | 단순 | `VoiceInput`, `Fab`, `IntakeChat`, `VisitNoteScreen`, `ActionPreviews` |
| 2 | `MicListening` | `mic-listening` | `ic_mic_listening.xml` | `302:705` | 음성 입력 | 5 | 획 1.75 | 단순 | **호출부 없음** (에셋만 등록) |
| 3 | `MicOff` | `mic-off` | `ic_mic_off.xml` | `302:712` | 음성 입력 | 5 | 획 1.75 | 단순 | `VoiceInput`, `EmptyState`(MicDenied) |
| 4 | `Waveform` | `waveform` | `ic_waveform.xml` | `302:719` | 음성 입력 | 5 | 획 1.75 | 단순 | `VoiceInput` |
| 5 | `ChevronLeft` | `chevron-left` | `ic_chevron_left.xml` | `302:722` | 내비게이션 | 1 | 획 1.75 | **가장 단순** | `NavBar`(Back), `CalendarMonthScreen`, `ScheduleAddSheets`, `ActionPreviews` |
| 6 | `ChevronRight` | `chevron-right` | `ic_chevron_right.xml` | `302:725` | 내비게이션 | 1 | 획 1.75 | **가장 단순** | `PickerField`, `Rows`, `RecordList`, `CalendarMonthScreen`, `ScheduleAddSheets` |
| 7 | `ChevronUp` | `chevron-up` | `ic_chevron_up.xml` | `302:731` | 내비게이션 | 1 | 획 1.75 | **가장 단순** | `RecordDetailStep`(접기/펼치기) |
| 8 | `ChevronDown` | `chevron-down` | `ic_chevron_down.xml` | `302:728` | 내비게이션 | 1 | 획 1.75 | **가장 단순** | `RecordDetailStep`(접기/펼치기) |
| 9 | `ArrowRight` | `arrow-right` | `ic_arrow_right.xml` | `302:735` | 내비게이션 | 2 | 획 1.75 | 단순 | **호출부 없음** |
| 10 | `ArrowUp` | `arrow-up` | `ic_arrow_up.xml` | `623:6017` | 내비게이션 | 2 | 획 1.75 | 단순 | `IntakeChat`(보내기). *DESIGN.md 45종에 없던, Figma가 나중에 더한 1종* |
| 11 | `Close` | `close` | `ic_close.xml` | `302:739` | 내비게이션 | 2 | 획 1.75 | **가장 단순** | `NavBar`(Close), `SearchField`(지우기), `Callout`, `Rows`(KV ×), `TodoRow`, `IntakeSteps`, `BodyMap3dStep` |
| 12 | `Plus` | `plus` | `ic_plus.xml` | `302:743` | 내비게이션 | 2 | 획 1.75 | **가장 단순** | `AddRow`, `CalendarMonthScreen`, `HealthEditScreen`, `IntakeSteps` |
| 13 | `Minus` | `minus` | `ic_minus.xml` | `302:746` | 내비게이션 | 1 | 획 1.75 | **가장 단순** | **호출부 없음** |
| 14 | `MoreHorizontal` | `more-horizontal` | `ic_more_horizontal.xml` | `305:1026` | 내비게이션 | 3 | **획 2.6** | 단순 (stroke-width 예외 주의) | **호출부 없음** |
| 15 | `Info` | `info` | `ic_info.xml` | `302:773` | 상태 | 3 | 획 1.75 | 단순 | `Notice`(Info), `Toast`(Info), `TooltipTrigger` |
| 16 | `Check` | `check` | `ic_check.xml` | `302:754` | 상태 | 1 | 획 1.75 | **가장 단순** | `Selection`(체크박스), `CardPick`, `HospitalPickScreen` |
| 17 | `CheckCircle` | `check-circle` | `ic_check_circle.xml` | `302:758` | 상태 | 2 | 획 1.75 | 단순 | `Notice`(Success), `Toast`(Success), `IntakeDoneScreen` |
| 18 | `AlertCircle` | `alert-circle` | `ic_alert_circle.xml` | `302:763` | 상태 | 3 | 획 1.75 | 단순 | `Notice`(Danger), `Toast`(Danger), `Dialog` |
| 19 | `AlertTriangle` | `alert-triangle` | `ic_alert_triangle.xml` | `302:768` | 상태 | 3 | 획 1.75 | 단순 | `Notice`(Warning), `Toast`(Warning) |
| 20 | `Spinner` | `spinner` | `ic_spinner.xml` | `305:1029` | 상태 | 1 | 획 1.75 | 단순 (열린 호 1개) | **호출부 없음** — `Loading.kt`가 M3 `CircularProgressIndicator`를 쓴다 |
| 21 | `Home` | `home` | `ic_home.xml` | `303:697` | 하단 탭·구조 | 2 | 획 1.75 | 단순 | `TabBar`(비활성) |
| 22 | `Note` | `note` | `ic_note.xml` | `303:703` | 하단 탭·구조 | 4 | 획 1.75 | 단순 | `TabBar`(비활성) |
| 23 | `Calendar` | `calendar` | `ic_calendar.xml` | `303:712` | 하단 탭·구조 | **7** | 획 1.75 | 보통 (path 7개) | `TabBar`(비활성), `ScheduleAddScreen` |
| 24 | `User` | `user` | `ic_user.xml` | `303:716` | 하단 탭·구조 | 2 | 획 1.75 | 단순 | **호출부 없음** — Tab Bar v2가 4탭→3탭이라 내 정보 탭이 빠졌다 |
| 25 | `HomeFilled` | `home-filled` | `ic_home_filled.xml` | `353:1294` | 하단 탭 활성 | 1 | **채움** | 단순 (compound path 1개) | `TabBar`(활성) |
| 26 | `NoteFilled` | `note-filled` | `ic_note_filled.xml` | `352:1269` | 하단 탭 활성 | 1 | **채움** | 단순 | `TabBar`(활성) |
| 27 | `CalendarFilled` | `calendar-filled` | `ic_calendar_filled.xml` | `349:1272` | 하단 탭 활성 | 3 | **채움** | 보통 (subpath 다수의 compound) | `TabBar`(활성) |
| 28 | `UserFilled` | `user-filled` | `ic_user_filled.xml` | `318:928` | 하단 탭 활성 | 1 | **채움 + `evenOdd`** | 보통 (**`fill-rule="evenodd"` 필수**) | **호출부 없음** (3탭 전환) |
| 29 | `Stethoscope` | `stethoscope` | `ic_stethoscope.xml` | `303:723` | 임상 | 5 | 획 1.75 | 보통 | `HomeComponents` |
| 30 | `Pill` | `pill` | `ic_pill.xml` | `305:1039` | 임상 | 2 | 획 1.75 | 단순 | **호출부 없음** |
| 31 | `HeartPulse` | `heart-pulse` | `ic_heart_pulse.xml` | `305:1043` | 임상 | 2 | 획 1.75 | 단순 | **호출부 없음** |
| 32 | `BodyPoint` | `body-point` | `ic_body_point.xml` | `305:1048` | 임상 | 3 | 획 1.75 | 단순 | **호출부 없음** |
| 33 | `Hospital` | `hospital` | `ic_hospital.xml` | `305:1035` | 임상 | 4 | 획 1.75 | 단순 | `HospitalCard`, `HospitalPickScreen`, `VisitNoteScreen` |
| 34 | `Edit` | `edit` | `ic_edit.xml` | `303:749` | 액션 | 2 | 획 1.75 | 단순 | `SourceQuote` |
| 35 | `Share` | `share` | `ic_share.xml` | `303:754` | 액션 | 3 | 획 1.75 | 단순 | **호출부 없음** |
| 36 | `Copy` | `copy` | `ic_copy.xml` | `303:758` | 액션 | 2 | 획 1.75 | 단순 | **호출부 없음** |
| 37 | `Trash` | `trash` | `ic_trash.xml` | `303:765` | 액션 | 5 | 획 1.75 | 보통 | `Dialog`(삭제 확인) |
| 38 | `Search` | `search` | `ic_search.xml` | `303:769` | 액션 | 2 | 획 1.75 | 단순 | `SearchField` |
| 39 | `Bell` | `bell` | `ic_bell.xml` | `303:773` | 액션 | 2 | 획 1.75 | 단순 | `HomeComponents` |
| 40 | `Clock` | `clock` | `ic_clock.xml` | `303:777` | 액션 | 2 | 획 1.75 | 단순 | `ScheduleAddScreen`, `CalendarDayScreen` |
| 41 | `Camera` | `camera` | `ic_camera.xml` | `303:781` | 액션 | 2 | 획 1.75 | 단순 | **호출부 없음** |
| 42 | `Chat` | `chat` | `ic_chat.xml` | `303:784` | 액션 | 1 | 획 1.75 | **가장 단순** | `Callout` |
| 43 | `Lock` | `lock` | `ic_lock.xml` | `303:789` | 액션 | 3 | 획 1.75 | 단순 | **호출부 없음** |
| 44 | `EmptyBox` | `empty-box` | `ic_empty_box.xml` | `303:794` | 빈 상태 | 3 | 획 1.75 | 단순 | `EmptyState`(NoRecord) |
| 45 | `SearchOff` | `search-off` | `ic_search_off.xml` | `305:1054` | 빈 상태 | 4 | 획 1.75 | 단순 | `EmptyState`(NoResult) |
| 46 | `WifiOff` | `wifi-off` | `ic_wifi_off.xml` | `305:1063` | 빈 상태 | **7** | 획 1.75 | 보통 (path 7개) | `EmptyState`(Offline) |

**"가장 단순"(path 1~2, 직선만) 9종, "단순"(path 1~5) 31종, "보통"(path 5~7 또는 compound/evenOdd) 6종 = 46. 변환 불가 0종.**

- **가장 단순 9종** — `chevron-left` `chevron-right` `chevron-up` `chevron-down` `close` `plus` `minus` `check` `chat`. 전부 직선 세그먼트만 쓴다(`M`/`L`/`H`/`V`). §8.4에 `d` 원문이 그대로 있다.
- **보통 6종** — `calendar`(path 7) · `wifi-off`(path 7) · `stethoscope`(path 5) · `trash`(path 5) · `calendar-filled`(채움 compound 3) · `user-filled`(채움 1 + **`evenOdd` 필수**).
- 나머지 31종이 "단순"이다. path 1~5에 직선·호·베지에가 섞여 있지만 변환에 분기가 없다.

> 앞선 판(11 / 29 / 6)은 합계가 맞지 않았다. 위 표의 "SVG 변환" 열을 실제로 세면 9 / 31 / 6이다.

미사용 14종: `MicListening` `ArrowRight` `Minus` `MoreHorizontal` `Spinner` `User` `UserFilled` `Pill` `HeartPulse` `BodyPoint` `Share` `Copy` `Camera` `Lock`. **웹 초기 번들에서는 이 14종을 빼도 화면이 비지 않는다.** 다만 Figma 마스터에 있는 자산이므로 에셋 폴더에는 남겨 둔다.

### 8.4 자주 쓰는 아이콘의 실제 path 데이터 (그대로 복사 가능)

`#131722` → `currentColor`로 바꾸고, 획형은 `fill="none"`을 잊지 말 것.

| 아이콘 | `d` (획형, stroke-width 1.75, round cap/join) |
|---|---|
| `check` | `M4.8 12.6 L9.6 17.4 L19.2 6.8` |
| `chevron-left` | `M14.8 5.2002 L8 12.0002 L14.8 18.8` |
| `close` (2 path) | `M6.2 6.2002 L17.8 17.8` / `M17.8 6.2002 L6.2 17.8` |
| `plus` (2 path) | `M12 4.8 V19.2` / `M4.8 12 H19.2` |
| `more-horizontal` (3 path, **stroke-width 2.6**) | `M6 12 H6.01` / `M12 12 H12.01` / `M18 12 H18.01` |
| `spinner` (열린 호 1개) | `M20.4 12 C20.4 13.944 19.726 15.827 18.493 17.329 C17.26 18.831 15.544 19.859 13.638 20.238 C11.732 20.617 9.754 20.324 8.04 19.408 C6.326 18.491 4.983 17.009 4.239 15.214 C3.496 13.418 3.398 11.42 3.962 9.561 C4.526 7.701 5.718 6.095 7.334 5.015 C8.95 3.935 10.89 3.45 12.824 3.64 C14.758 3.831 16.566 4.686 17.94 6.06` |
| `home` (2 path) | 바깥 집 윤곽 + `M9.6 20.4 V14.4 H14.4 V20.4` (문) |

`spinner`는 **열린 호**라서 웹에서 `animation: spin 1s linear infinite`만 걸면 그대로 로딩 스피너가 된다(`transform-origin: 50% 50%`). 단 §4.4대로 `prefers-reduced-motion: reduce`에서 회전을 멈추거나 느리게 한다.

### 8.5 아이콘 크기는 아이콘이 아니라 **상자**가 정한다 (DESIGN.md §6.1)

> 같은 `×`라도 화면마다 크기가 다른 건 정상이다. **어느 상자에 들어가느냐**가 크기를 결정한다.

| Size | 상자 | 아이콘 | 반경 (DESIGN.md §6.1) | 쓰는 곳 |
|---|---|---|---|---|
| **L** | 48 | **24** | full | 화면 단위 액션 — Nav Bar · 필드 안 지우기 · 목록 밖 액션 |
| **M** | 40 | **20** | full | 중간 컨트롤 |
| **S** | 32 | **18** | **16** | 항목 안 보조 액션 — KV 행 × · 질문 pill × |

DESIGN.md: *"이 짝은 **`Icon Button` 컴포넌트가 이미 강제한다.** 상자를 직접 만들지 말고 인스턴스를 쓴다."* → **웹에서도 `<MMIconButton size="L|M|S">` 하나만 만들고 개별 화면에서 박스 크기를 직접 쓰지 않는다.**

**소스 실제 구현 (`component/IconButton.kt`)** — 표와 한 곳이 다르다.

| 항목 | Kotlin 실제 값 |
|---|---|
| 상자 L / M / S | `MedicalMateSize.controlMd` 48 / `MedicalMateSize.controlSm` 40 / **`32.dp` 하드코딩** (32는 토큰이 없다) |
| 아이콘 L / M / S | `iconLg` 24 / `iconMd` 20 / `iconSm` 18 |
| 반경 | **세 사이즈 모두 `MedicalMateRadius.full`.** S에 16을 쓰지 않는다 |
| 터치 영역 | 바깥 `Box`에 `sizeIn(minWidth = touchMin, minHeight = touchMin)` = 48. 시각 상자(32)는 그 안에 가운데 정렬된다 |
| `Style` variant | `GHOST` / `TONAL` / `SOLID` / `OUTLINE` 4종. 기본값 `GHOST`, 기본 사이즈 `L` |
| `contentDescription` | **필수 인자다**(기본값 없음). KDoc: *"기본값을 두면 빠뜨리기 쉽다"* |

`Style`별 색 (모두 시맨틱 토큰):

| Style | 면 | 글자·아이콘 | 테두리 |
|---|---|---|---|
| `GHOST` | 투명 | `fgDefault` | — |
| `TONAL` | `bgPrimarySubtle` | `fgPrimary` | — |
| `SOLID` | `bgPrimary` | `fgOnPrimary` | — |
| `OUTLINE` | 투명 | `fgDefault` | `borderDefault` 1dp |
| 비활성(공통) | `SOLID`만 `bgSubtle`, 나머지 투명 | `fgDisabled` | `OUTLINE`만 `borderSubtle` |

→ **웹 판단:** 반경은 **`--mm-radius-full`로 통일한다.** 근거가 2:1이다 — DESIGN.md §4.1이 `radius/full` 용도에 "Chip · Avatar · **Icon Button**"을 적었고 Kotlin 구현도 `full`이다. S에 16을 적은 곳은 DESIGN.md §6.1 표 한 군데뿐이다. 다만 Figma 마스터가 정본이므로 디자인에 한 번 확인하고 확정한다(§11 항목 6).

터치 영역도 소스 방식을 그대로 옮기는 편이 낫다. `::before` 의사 요소보다, **48×48 래퍼 안에 시각 상자를 가운데 정렬**하는 쪽이 레이아웃 계산이 정직하다.

```css
.mm-icon-button { /* 래퍼 = 히트 영역 */
  display: inline-flex; align-items: center; justify-content: center;
  min-width: var(--mm-size-touch-min); min-height: var(--mm-size-touch-min);
  border: 0; background: none; padding: 0;
}
.mm-icon-button > .mm-icon-button__box {   /* 시각 상자 */
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: var(--mm-radius-full);
}
.mm-icon-button--l > .mm-icon-button__box { width: 48px; height: 48px; }
.mm-icon-button--m > .mm-icon-button__box { width: 40px; height: 40px; }
.mm-icon-button--s > .mm-icon-button__box { width: 32px; height: 32px; }
.mm-icon-button--l svg { width: var(--mm-size-icon-lg); height: var(--mm-size-icon-lg); }
.mm-icon-button--m svg { width: var(--mm-size-icon-md); height: var(--mm-size-icon-md); }
.mm-icon-button--s svg { width: var(--mm-size-icon-sm); height: var(--mm-size-icon-sm); }
```

삭제 × 배치 기준:

| 위치 | Size | 상자 / 아이콘 |
|---|---|---|
| Nav Bar 닫기 | L | 48 / 24 |
| 검색 필드 지우기 | L | 48 / 24 |
| 진료 전 할 일 × | L | 48 / 24 |
| 브리핑 카드 KV 행 × | S | 32 / 18 |
| 질문 pill × | S | 32 / 18 |
| 진료 후 기록 KV 행 × | S | 32 / 18 |

> **항목 안 × 는 S, 화면·필드 단위 × 는 L.** 크기 차이가 곧 위계다.

DESIGN.md §12 실측: `Icon/close`는 32/18(S) 77개, 48/24(L) 41개, 커스텀 아이콘 상자 0개.

**S 사이즈(32)와 Date Cell(42)은 터치 영역이 48에 못 미친다.** `Dimens.kt` 주석이 *"hit area를 따로 넓혀 48을 맞춘다"*라고 명시했다. 웹에서는 `::before`로 투명 히트 영역을 넓히거나 `padding` + `margin` 음수 조합으로 48×48을 확보한다.

### 8.6 인라인 아이콘 — 글자 크기를 따른다 (DESIGN.md §6.4)

버튼 상자가 아닌 텍스트 옆 아이콘은 **옆에 붙는 글자 크기를 따른다.**

| 글자 | 아이콘 |
|---|---|
| `Body/L` 17 | 20 |
| `Body/M` 15 | 18 |
| `Body/S` 13 | 16 — **하한** |

웹 구현: 인라인 아이콘 `<svg>`에 `width: 1.176em`(=20/17) 같은 상대값을 쓰지 말고, 텍스트 스타일 클래스마다 아이콘 크기를 명시한다. `em` 비율이 세 케이스에서 제각각(1.176 / 1.2 / 1.23)이라 상대값이 오히려 어긋난다.

### 8.7 로고 자산 6종 (`MedicalMateLogo`)

| Kotlin | drawable | Figma node | 크기 | 구성 | 색 | 실제 쓰이는 곳 |
|---|---|---|---|---|---|---|
| `Symbol` | `ic_logo_symbol.xml` | `351:1261` | 48×48 | 채움 path 3 | `#3B4FC0` + `#FFFFFF` | **호출부 없음.** *"UI 안 기본형. `primary/600` 면에 흰 마크."* |
| `SymbolGradient` | `ic_logo_symbol_gradient.xml` | `351:1256` | 48×48 | 채움 path 3 + **linear gradient 1** | 그라디언트 + `#FFFFFF` | **호출부 없음.** *"앱 아이콘과 스플래시 전용."* |
| `Mark` | `ic_logo_mark.xml` | `351:1271` | 48×48 | 채움 path 2 | `#2E3E9E` | `SplashScreen`. *"배경 없는 마크. 원본 색은 `fg/primary`이고 tint로 바꾼다."* |
| `Lockup` | `ic_logo_lockup.xml` | `351:1282` | **139×36** | 채움 path 4 | `#131722` `#3B4FC0` `#FFFFFF` | `LoginScreen`, `HomeComponents`. *"심볼 36 + 워드마크. 139x36."* |
| `MarkUpper` | `ic_logo_mark_upper.xml` | `351:1271` | 48×48 | 채움 path 1 | `#2E3E9E` | `ProfileCompleteScreen` |
| `MarkLower` | `ic_logo_mark_lower.xml` | `351:1271` | 48×48 | 채움 path 1 | `#2E3E9E` | `ProfileCompleteScreen` |

`MarkUpper`/`MarkLower` KDoc 원문: *"`Mark`의 왼쪽 위 조각. `MarkLower`와 겹쳐 놓으면 `Mark`와 같다. 신상정보 완료 화면(**1b-4**)의 모션이 두 조각을 각각 가로로 움직여서 나눠 뒀다. 한 장으로는 조각별 이동을 만들 수 없다. **정지 상태를 그릴 때는 `Mark`를 쓴다.**"*
drawable 주석이 결정적인 사실을 하나 더 적었다: *"`ic_logo_mark_upper` — Logo Mark의 **Upper-Left-Interlock** 조각. 완료 모션에서 두 조각을 따로 움직이려고 나눴다. **viewport는 48을 유지해 `ic_logo_mark_lower`와 겹치면 원래 마크가 된다.**"* (`ic_logo_mark_lower`는 **Lower-Right-Interlock**)

→ 두 조각의 `viewBox`가 **둘 다 `0 0 48 48`**이고 좌표계가 같다. 웹에서는 두 `<svg>`를 같은 자리에 겹쳐 놓기만 하면 정렬이 맞는다. 별도 offset 계산이 필요 없다.

```html
<div class="mm-logo-split" style="position:relative;width:48px;height:48px">
  <svg viewBox="0 0 48 48" style="position:absolute;inset:0"><!-- upper --></svg>
  <svg viewBox="0 0 48 48" style="position:absolute;inset:0"><!-- lower --></svg>
</div>
```

화면 `1b-4`의 로고 합체 모션은 두 SVG를 각각 `transform: translateX()`로 애니메이션한다. `prefers-reduced-motion`에서는 `Mark` 한 장으로 대체한다.

`SymbolGradient`의 그라디언트 정의 (vector drawable `aapt:attr` → CSS/SVG):

```
linear, startX=0 startY=0 → endX=34.2857 endY=34.2857 (48×48 viewport)
stop 0     #5566D2
stop 0.55  #3B4FC0
stop 1     #2E3E9E
```

CSS 환산: `linear-gradient(135deg, #5566D2 0%, #3B4FC0 55%, #2E3E9E 100%)` — 좌상단(0,0)에서 (34.2857, 34.2857)까지 45° 대각선이다. SVG로 옮기면 `<linearGradient x1="0" y1="0" x2="34.2857" y2="34.2857" gradientUnits="userSpaceOnUse">`.

로고 사용 규칙 (`MedicalMateLogo` KDoc):

- *"기본 크기는 심볼 48, 최소 24다. 보호 여백은 심볼 높이의 1/4을 사방에 확보한다. 비율을 고정하고 찌그러뜨리거나 회전하지 않는다."*
- *"락업은 가로 조합만 쓴다. 별도 레터링이나 세로 조합을 만들지 않는다."*
- *"Figma의 `Mark` 마스터에는 기존 로고 자산의 파란 gradient(`#1769F7` 계열)도 들어 있는데, **일반 UI에서 그 값을 새 브랜드 컬러처럼 재사용하지 않는다.**"*
- *"`Subtle`(옅은 면 위)과 `Mono Light`(어두운 면 위)는 따로 두지 않았다. `Mark`에 tint를 주고 뒤에 면을 깔면 같은 결과가 된다. Subtle은 `bg/primary-subtle` 면에 `fg/primary` 마크, Mono Light는 흰 마크다."*

카카오 심볼은 별도다: `ic_kakao_symbol.xml`, Figma `383:1290` (`Social Login Button / Provider=Kakao`), **20×18.6667** (정사각이 아니다), 채움 path 1, `android:fillColor="#FF000000"`(= `#000000`, 앞 `FF`는 알파). 호출부는 `SocialLoginButton`. 파일 주석 원문: *"Social Login Button / Provider=Kakao 의 말풍선. **카카오 디자인 가이드가 정한 심볼이라 모양을 바꾸지 말 것.**"* → 웹에서도 이 path를 비율 고정으로 쓰고 `viewBox="0 0 20 18.6667"`을 유지한다. 24 격자에 억지로 맞추거나 `currentColor`로 바꾸면 가이드 위반이다(색은 `--mm-kakao-symbol` 고정).

### 8.8 아이콘 접근성

`MedicalMateIcons.kt`: *"라벨 없는 아이콘 버튼에는 접근성 이름을 반드시 준다."*

웹 규칙:
- 장식용 아이콘(텍스트 옆에 붙는 것) → `aria-hidden="true"`, `focusable="false"`
- 라벨 없는 아이콘 버튼 → `<button aria-label="...">`. 한국어 레이블을 준다.
- 상태 전달은 채움형 전환으로 한다(DESIGN.md: *"색만 바뀌면 색각 이상에서 상태가 전달되지 않는다"*). Tab Bar 활성 탭은 `aria-current="page"` + 채움형 아이콘 두 가지를 모두 준다.

`IconButton.kt`가 이 규칙을 타입으로 강제한다. `contentDescription`이 **기본값 없는 필수 인자**다. → 웹에서도 `MMIconButton`의 `label` prop을 옵셔널로 두지 말 것. TypeScript에서 필수로 선언하면 같은 강제가 걸린다.

---

### 8.9 아이콘·로고 밖의 그림 자산 (문서가 빠뜨렸던 항목)

`res/drawable`에는 아이콘 46 · 로고 6 · 카카오 1 말고도 **자산 7개가 더 있다.** 웹 포팅에서 그대로 필요한 것들이다.

#### 8.9.1 온보딩 일러스트 4종

`profile/ui/OnboardingPage.kt`의 enum이 `R.drawable.img_onboarding_*`를 `illustration` 필드로 직접 들고 있다. `MedicalMateIcons`/`MedicalMateLogo` 어느 오브젝트에도 등록돼 있지 않아서 앞선 판이 통째로 놓쳤다.

| enum 상수 | drawable | Figma node | 크기 / viewBox | path 수 | 채움 색 | 획 색 | 획 두께 |
|---|---|---|---|---|---|---|---|
| `PREPARE` | `img_onboarding_prepare.xml` | `1345:4714` (`V2-00 Refined`) | **352 × 290.4** | 29 | `#F2F4FE` `#E3E7FC` `#FFFFFF` `#000000` | `#3A4053` `#5566D2` `#A3AFF1` | 1.76 / 1.87 / 2.42 / 3.08 |
| `POINT` | `img_onboarding_point.xml` | `1345:4737` (`V2-01 Refined`) | 352 × 290.4 | 19 | 〃 + `#5566D2` | 〃 + `#FFFFFF` | 1.65 / 1.76 / 1.98 / 2.2 / 2.42 / 3.3 |
| `CARD` | `img_onboarding_card.xml` | `1345:4754` (`V2-02 Refined`) | 352 × 290.4 | 22 | 〃 | 〃 | 1.87 / 1.98 / 2.09 / 2.42 / 2.86 |
| `FOLLOW` | `img_onboarding_follow.xml` | `1345:4773` (`V2-03 Refined`) | 352 × 290.4 | 21 | 〃 | 〃 | 1.76 / 1.87 / 1.98 / 2.09 / 2.42 / 2.86 |

네 파일 모두 같은 주석을 달았다: *"Figma SVG 내보내기를 옮긴 것이라 손으로 고치지 말고 원본에서 다시 내보낼 것."* → **웹은 Figma에서 SVG로 바로 내보내는 것이 정석 경로다.** vector drawable을 거꾸로 변환할 이유가 없다.

읽을 것:

- **아이콘 규격을 적용하면 안 된다.** 획이 1.65~3.3으로 흩어져 있고 색도 4~5가지다. §8.1의 "획 1.75 단일 색" 규칙은 `ic_*`에만 해당한다.
- 색은 **전부 팔레트 안의 값**이다 — `primary/50` `primary/100` `primary/300` `primary/500` `neutral/700` `neutral/0`. 하드코딩 색 0건(DESIGN.md §11-1)이 여기서도 지켜졌다. `currentColor`로 바꾸지 말고 **원본 색을 그대로 유지한다.** 단색 아이콘이 아니라 다색 일러스트다.
- `<group>` 0개 · `clip-path` 0개 · gradient 0개라 **SVG 1:1 변환은 아이콘과 똑같이 가능하다.** 다만 path가 19~29개로 많아 인라인보다 `<img src="...svg">` 또는 스프라이트가 낫다.
- 종횡비 352:290.4 = **1.2121:1**. 웹에서 `aspect-ratio: 352 / 290.4` + `max-width: 100%`로 두고 폭 고정을 하지 않는다.

#### 8.9.2 런처 아이콘 2종 · 시스템 스플래시 1종

| drawable | 크기 | 내용 |
|---|---|---|
| `ic_launcher_background.xml` | 108 × 108 | path 1장. `aapt:attr` **linear gradient** — `startX/Y=0`, `endX/Y=77.1429`, stop `#5566D2` 0 / `#3B4FC0` 0.55 / `#2E3E9E` 1. 주석: *"Gradient 심볼의 그라디언트를 108 캔버스로 2.25배 확대했다"* (34.2857 × 2.25 = 77.1429) |
| `ic_launcher_foreground.xml` | 108 × 108 | `<group translateX=18 translateY=18 scaleX=1.5 scaleY=1.5>` 안에 `#FFFFFF` 채움 path 2장. 주석: *"48 좌표의 마크를 1.5배 확대해 108 캔버스 가운데 72 안전 영역에 놓았다"* |
| `splash_icon_none.xml` | — | `<shape rectangle>` + `@android:color/transparent`. 투명 한 장. `windowSplashScreenAnimatedIcon`이 drawable만 받고 "비움" 값이 따로 없어서 만든 파일이다 |

`mipmap-anydpi-v26/ic_launcher.xml`과 `ic_launcher_round.xml`이 두 drawable을 `background`/`foreground`/`monochrome`에 얹는다. **`monochrome`에도 `ic_launcher_foreground`를 그대로 준다** — 테마 아이콘(Android 13+)에서 흰 마크가 단색으로 처리된다.

→ **웹 대응:** PWA 아이콘은 `ic_launcher_background`의 그라디언트 면 위에 마크를 올린 형태다. CSS로는 `linear-gradient(135deg, #5566D2 0%, #3B4FC0 55%, #2E3E9E 100%)`(§8.7의 심볼과 같은 정의)이고, 마크의 안전 영역 비율은 **108 캔버스 안 72**(= 2/3)다. maskable 아이콘의 안전 영역 권고(중앙 80%)보다 보수적이라 그대로 써도 잘린 곳이 없다.

---

## 9. 그대로 복사해 쓰는 CSS 커스텀 프로퍼티

`app/styles/tokens.css` 같은 파일에 통째로 넣는다. 접두사는 `mm-`.

```css
/* =========================================================================
   MedicalMate Design Tokens — DESIGN.md v3.0 (2026-09-09) / Figma cG6lz8nwzp75bfAXCnMqxx
   원본: app/src/main/java/com/mist/medicalmate/core/designsystem/*.kt
   규칙: 컴포넌트는 --mm-bg-* / --mm-fg-* / --mm-border-* / --mm-severity-* 만 쓴다.
         --mm-color-* (원시 팔레트)를 컴포넌트에서 직접 집지 않는다.
   ========================================================================= */

:root {
  /* ---------------------------------------------------------------------
     1계층 · 원시 팔레트 43 (Palette.kt) — 컴포넌트에서 직접 쓰지 말 것
     --------------------------------------------------------------------- */
  --mm-color-primary-50:  #F2F4FE;
  --mm-color-primary-100: #E3E7FC;
  --mm-color-primary-200: #C7CFF8;
  --mm-color-primary-300: #A3AFF1;
  --mm-color-primary-400: #7484E3;
  --mm-color-primary-500: #5566D2;
  --mm-color-primary-600: #3B4FC0;
  --mm-color-primary-700: #2E3E9E;
  --mm-color-primary-800: #242F79;
  --mm-color-primary-900: #1A2154;

  --mm-color-neutral-0:   #FFFFFF;
  --mm-color-neutral-25:  #FAFBFD;
  --mm-color-neutral-50:  #F5F6FA;
  --mm-color-neutral-100: #EDEFF5;
  --mm-color-neutral-200: #DEE1EB;
  --mm-color-neutral-300: #C6CAD8;
  --mm-color-neutral-400: #989EB1;
  --mm-color-neutral-500: #7C8397;
  --mm-color-neutral-600: #585F73;
  --mm-color-neutral-700: #3A4053;
  --mm-color-neutral-900: #131722;   /* neutral/800 은 존재하지 않는다 */

  --mm-color-amber-50:  #FFF4D6;
  --mm-color-amber-100: #FFE9B3;
  --mm-color-amber-500: #E0A227;
  --mm-color-amber-700: #8A5A0B;

  --mm-color-green-50:  #E4F7ED;
  --mm-color-green-100: #C6F0DC;
  --mm-color-green-500: #12A05F;
  --mm-color-green-700: #0E7A4A;

  --mm-color-red-50:  #FFEDEB;
  --mm-color-red-100: #FFD8D4;
  --mm-color-red-500: #E5504A;
  --mm-color-red-700: #C4302B;

  --mm-color-severity-1: #FFE3A8;
  --mm-color-severity-2: #FFC79B;
  --mm-color-severity-3: #FFA894;
  --mm-color-severity-4: #F58079;
  --mm-color-severity-5: #DC5A55;
  --mm-color-severity-1-tint: #FFF6E4;
  --mm-color-severity-2-tint: #FFEFE4;
  --mm-color-severity-3-tint: #FFE9E3;
  --mm-color-severity-4-tint: #FDE4E2;
  --mm-color-severity-5-tint: #F9DEDD;

  /* ---------------------------------------------------------------------
     2계층 · 시맨틱 41 (MedicalMateColors.kt / LightMedicalMateColors)
     --------------------------------------------------------------------- */
  /* 배경 14 */
  --mm-bg-canvas:          var(--mm-color-neutral-50);   /* #F5F6FA 화면 바탕 */
  --mm-bg-surface:         var(--mm-color-neutral-0);    /* #FFFFFF 카드·시트 */
  --mm-bg-subtle:          var(--mm-color-neutral-100);  /* #EDEFF5 입력 필드·보조 블록 */
  --mm-bg-primary:         var(--mm-color-primary-500);  /* #5566D2 주 버튼 */
  --mm-bg-primary-pressed: var(--mm-color-primary-600);  /* #3B4FC0 눌림 */
  --mm-bg-primary-subtle:  var(--mm-color-primary-100);  /* #E3E7FC Callout·환자 발화 */
  --mm-bg-primary-faint:   var(--mm-color-primary-50);   /* #F2F4FE Notice/Info·일정 카드 */
  --mm-bg-info:            var(--mm-color-primary-50);   /* #F2F4FE */
  --mm-bg-success:         var(--mm-color-green-50);     /* #E4F7ED */
  --mm-bg-warning:         var(--mm-color-amber-50);     /* #FFF4D6 알러지 경고 */
  --mm-bg-danger:          var(--mm-color-red-50);       /* #FFEDEB 삭제 버튼 */
  --mm-bg-inverse:         var(--mm-color-neutral-900);  /* #131722 Toast */
  --mm-bg-inverse-soft:    var(--mm-color-neutral-700);  /* #3A4053 Tooltip */
  --mm-bg-scrim:           var(--mm-color-neutral-900);  /* #131722 · alpha 는 --mm-scrim-alpha */

  /* 전경 12 */
  --mm-fg-default:    var(--mm-color-neutral-900);  /* #131722 대비 17.90 */
  --mm-fg-subtle:     var(--mm-color-neutral-600);  /* #585F73 대비 6.36 · 플레이스홀더 하한 */
  --mm-fg-muted:      var(--mm-color-neutral-500);  /* #7C8397 대비 3.78 · 본문 금지, 아이콘/장식 전용 */
  --mm-fg-disabled:   var(--mm-color-neutral-300);  /* #C6CAD8 */
  --mm-fg-on-primary: var(--mm-color-neutral-0);    /* #FFFFFF */
  --mm-fg-on-inverse: var(--mm-color-neutral-0);    /* #FFFFFF */
  --mm-fg-primary:    var(--mm-color-primary-700);  /* #2E3E9E 대비 9.13 */
  --mm-fg-link:       var(--mm-color-primary-700);  /* #2E3E9E */
  --mm-fg-info:       var(--mm-color-primary-700);  /* #2E3E9E */
  --mm-fg-success:    var(--mm-color-green-700);    /* #0E7A4A 대비 4.98 */
  --mm-fg-warning:    var(--mm-color-amber-700);    /* #8A5A0B 대비 5.40 */
  --mm-fg-danger:     var(--mm-color-red-700);      /* #C4302B 대비 5.28 */

  /* 테두리 5 */
  --mm-border-subtle:  var(--mm-color-neutral-200); /* #DEE1EB 목록 구분선·입력 밑줄 */
  --mm-border-default: var(--mm-color-neutral-300); /* #C6CAD8 */
  --mm-border-strong:  var(--mm-color-neutral-500); /* #7C8397 입력 필드 테두리(비어 있음) */
  --mm-border-focus:   var(--mm-color-primary-500); /* #5566D2 */
  --mm-border-primary: var(--mm-color-primary-500); /* #5566D2 */
  /* 선택 완료된 필드의 테두리는 --mm-fg-default 를 쓴다 (DESIGN.md 2.5) */

  /* 통증 10 */
  --mm-severity-1: var(--mm-color-severity-1);
  --mm-severity-2: var(--mm-color-severity-2);
  --mm-severity-3: var(--mm-color-severity-3);
  --mm-severity-4: var(--mm-color-severity-4);
  --mm-severity-5: var(--mm-color-severity-5);
  --mm-severity-1-tint: var(--mm-color-severity-1-tint);
  --mm-severity-2-tint: var(--mm-color-severity-2-tint);
  --mm-severity-3-tint: var(--mm-color-severity-3-tint);
  --mm-severity-4-tint: var(--mm-color-severity-4-tint);
  --mm-severity-5-tint: var(--mm-color-severity-5-tint);

  /* ---------------------------------------------------------------------
     브랜드 고정색 (BrandColor.kt) — 테마/다크에 따라 바뀌면 가이드 위반
     --------------------------------------------------------------------- */
  --mm-kakao-container: #FEE500;
  --mm-kakao-symbol:    #000000;
  --mm-kakao-label:     #191600;
  --mm-naver-container: #03C75A;  /* 흰 글자와 2.2:1 — 공식 규격 예외 */
  --mm-naver-label:     #FFFFFF;
  --mm-apple-container: #000000;
  --mm-apple-label:     #FFFFFF;
  --mm-google-container:#FFFFFF;
  --mm-google-label:    #1F1F1F;
  --mm-google-border:   #747775;

  /* ---------------------------------------------------------------------
     타이포 (Type.kt)
     --------------------------------------------------------------------- */
  --mm-font-sans: "Pretendard Variable", Pretendard, -apple-system,
                  BlinkMacSystemFont, "Apple SD Gothic Neo", "Noto Sans KR",
                  "Malgun Gothic", system-ui, sans-serif;
  --mm-font-weight-regular:  400;
  --mm-font-weight-medium:   500;
  --mm-font-weight-semibold: 600;
  --mm-font-weight-bold:     700;

  --mm-type-display-m-size: 30px;   --mm-type-display-m-line: 40px;   --mm-type-display-m-tracking: -0.02em;   --mm-type-display-m-weight: 700;
  --mm-type-heading-l-size: 24px;   --mm-type-heading-l-line: 34px;   --mm-type-heading-l-tracking: -0.02em;   --mm-type-heading-l-weight: 700;
  --mm-type-heading-m-size: 20px;   --mm-type-heading-m-line: 28px;   --mm-type-heading-m-tracking: -0.015em;  --mm-type-heading-m-weight: 600;
  --mm-type-heading-s-size: 17px;   --mm-type-heading-s-line: 24px;   --mm-type-heading-s-tracking: -0.01em;   --mm-type-heading-s-weight: 600;
  --mm-type-body-l-size: 17px;      --mm-type-body-l-line: 26px;      --mm-type-body-l-tracking: 0;            --mm-type-body-l-weight: 400;
  --mm-type-body-l-strong-weight: 600;
  --mm-type-body-m-size: 15px;      --mm-type-body-m-line: 24px;      --mm-type-body-m-tracking: 0;            --mm-type-body-m-weight: 400;
  --mm-type-body-m-strong-weight: 600;
  --mm-type-body-s-size: 13px;      --mm-type-body-s-line: 20px;      --mm-type-body-s-tracking: 0;            --mm-type-body-s-weight: 400;
  --mm-type-body-s-strong-weight: 600;
  --mm-type-label-l-size: 15px;     --mm-type-label-l-line: 20px;     --mm-type-label-l-tracking: 0;           --mm-type-label-l-weight: 600;
  --mm-type-label-m-size: 13px;     --mm-type-label-m-line: 18px;     --mm-type-label-m-tracking: 0;           --mm-type-label-m-weight: 600;
  --mm-type-label-s-size: 11px;     --mm-type-label-s-line: 16px;     --mm-type-label-s-tracking: 0.02em;      --mm-type-label-s-weight: 500;
  --mm-type-numeric-l-size: 24px;   --mm-type-numeric-l-line: 30px;   --mm-type-numeric-l-tracking: -0.015em;  --mm-type-numeric-l-weight: 700;
  --mm-type-numeric-m-size: 17px;   --mm-type-numeric-m-line: 22px;   --mm-type-numeric-m-tracking: -0.01em;   --mm-type-numeric-m-weight: 600;

  /* ---------------------------------------------------------------------
     간격 12 (MedicalMateSpace)
     --------------------------------------------------------------------- */
  --mm-space-2:  2px;
  --mm-space-4:  4px;
  --mm-space-6:  6px;
  --mm-space-8:  8px;
  --mm-space-10: 10px;
  --mm-space-12: 12px;
  --mm-space-14: 14px;
  --mm-space-16: 16px;
  --mm-space-20: 20px;
  --mm-space-24: 24px;
  --mm-space-32: 32px;
  --mm-space-40: 40px;

  /* ---------------------------------------------------------------------
     크기·레이아웃 14 (MedicalMateSize)
     --------------------------------------------------------------------- */
  --mm-size-touch-min:  48px;
  --mm-size-icon-sm:    18px;
  --mm-size-icon-md:    20px;
  --mm-size-icon-lg:    24px;
  --mm-size-control-sm: 40px;
  --mm-size-control-md: 48px;
  --mm-size-control-lg: 56px;
  --mm-size-mic:        88px;
  --mm-layout-screen-w:    360px;  /* 기준 폭. 레이아웃을 이 값으로 고정하지 않는다 */
  --mm-layout-gutter:      20px;
  --mm-layout-content-w:   320px;  /* 360 기준 콘텐츠 폭. 강제하지 않는다 */
  --mm-layout-safe-bottom: 24px;   /* 컴포넌트 내부 시각 여백. env(safe-area-inset-bottom) 과 별개 */
  --mm-layout-nav-h:       56px;   /* 고정이 아니라 min-height (NavBar.kt heightIn) */
  --mm-layout-tabbar-h:    79px;   /* 82 아님. = 1 + 8 + 46 + 24 (4.2.1) */
  --mm-layout-screen-min-h: 812px;

  /* 토큰은 아니지만 소스가 상수로 들고 있는 조립 치수 (4.2.1 / 8.5) */
  --mm-tabbar-hairline:  1px;   /* Tab Bar 상단 경계선 */
  --mm-tabbar-row-h:     54px;  /* = space/8 8 + 탭 46 */
  --mm-navbar-title-inset:        60px;  /* = 8 + 48 + 4 */
  --mm-navbar-title-inset-action: 88px;  /* 텍스트 액션이 있을 때 */
  --mm-bottom-cta-h:     92px;  /* = space/12 12 + control-lg 56 + safe-bottom 24 */
  --mm-iconbox-l: 48px;  /* = size/control-md */
  --mm-iconbox-m: 40px;  /* = size/control-sm */
  --mm-iconbox-s: 32px;  /* 토큰 없음. IconButton.kt 가 32.dp 를 직접 쓴다 */
  --mm-avatar:            44px;  /* DESIGN.md 5 고정 규격 */
  --mm-date-cell:         42px;
  --mm-date-cell-sheet:   34px;  /* 시트 안 */

  /* ---------------------------------------------------------------------
     반경 10 (MedicalMateRadius)
     --------------------------------------------------------------------- */
  --mm-radius-xs:   8px;    /* Badge, Checkbox, Skeleton 줄 */
  --mm-radius-sm:   12px;   /* S Button, 원문 블록, 질문 pill */
  --mm-radius-md:   16px;   /* L Button, Notice, 입력 필드 */
  --mm-radius-lg:   20px;   /* Card, Callout */
  --mm-radius-xl:   24px;   /* Dialog */
  --mm-radius-2xl:  28px;   /* Bottom Sheet */
  --mm-radius-full: 9999px; /* Chip, Avatar, pill, Icon Button L/M/S 전부 (IconButton.kt) */
  --mm-radius-button-m: 14px; /* M Button 전용 · 스케일 밖 중간값 */
  --mm-radius-date-cell: 13px; /* Date Cell 전용 · 스케일 밖 중간값 */
  /* Bottom Sheet 상단만: border-radius: var(--mm-radius-2xl) var(--mm-radius-2xl) 0 0 */
  /* DESIGN.md 6.1 표만 Icon Button S 반경을 16으로 적었다. Kotlin 구현과 DESIGN.md 4.1은
     둘 다 full 이다 → full 채택. 11절 항목 6 참고. */

  /* ---------------------------------------------------------------------
     고도·그림자 (Elevation.kt) — Figma 원본 2단 값 그대로
     --------------------------------------------------------------------- */
  --mm-shadow-tint: 27 37 90;  /* #1B255A */
  --mm-elevation-card:  0 3px 10px rgb(var(--mm-shadow-tint) / .08),
                        0 1px  2px rgb(var(--mm-shadow-tint) / .05);
  --mm-elevation-float: 0 4px 14px rgb(var(--mm-shadow-tint) / .09),
                        0 1px  3px rgb(var(--mm-shadow-tint) / .06);
  --mm-elevation-sheet: 0 -4px 24px rgb(var(--mm-shadow-tint) / .10),
                        0  0    2px rgb(var(--mm-shadow-tint) / .05);

  /* Glass (MedicalMateGlass)
     주의: 안드로이드는 이 블러를 한 번도 그리지 않는다(6.3.1). 웹은 실제로 건다. */
  --mm-glass-blur: 24px;
  --mm-glass-alpha-bottom-cta: 0.78;
  --mm-glass-alpha-nav:        0.82;
  --mm-glass-alpha-tab:        0.86;

  /* 선 — 목록 구분, 포커스, 크롬 경계에만. 4.2 의 "테두리 대신 고도" 규칙 */
  --mm-border-hairline: 1px;

  /* 아이콘 획 (res/drawable/ic_*.xml, 8.1) */
  --mm-icon-stroke:      1.75;
  --mm-icon-stroke-dots: 2.6;   /* more-horizontal 만 */

  /* 온보딩 일러스트 종횡비 (8.9.1) */
  --mm-illustration-ratio: 352 / 290.4;

  /* Overlay Scrim (OverlayScrim.kt) */
  --mm-scrim-alpha: 0.5;

  /* Loading (Loading.kt) */
  --mm-loading-min-h: 116px;
  --mm-skeleton-line-h: 16px;
  --mm-skeleton-gap:   var(--mm-space-12);
  --mm-skeleton-pad:   var(--mm-space-20);
}

/* =========================================================================
   다크 모드
   원본(MedicalMateColors.kt / Theme.kt / res/values/themes.xml)에 다크 값이
   존재하지 않는다. res/values-night 폴더도 없다. 값을 추측해 채우면
   DESIGN.md 11장의 대비 검수를 통과했는지 확인할 수 없으므로,
   디자인이 다크 팔레트를 확정하기 전까지 라이트와 동일 값을 유지한다.
   확정되면 아래 두 블록의 오른쪽 값만 교체하면 된다. (구조는 이미 완성)
   ========================================================================= */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    /* 배경 14 — TODO(design): 다크 값 확정 대기 */
    --mm-bg-canvas:          #F5F6FA;
    --mm-bg-surface:         #FFFFFF;
    --mm-bg-subtle:          #EDEFF5;
    --mm-bg-primary:         #5566D2;
    --mm-bg-primary-pressed: #3B4FC0;
    --mm-bg-primary-subtle:  #E3E7FC;
    --mm-bg-primary-faint:   #F2F4FE;
    --mm-bg-info:            #F2F4FE;
    --mm-bg-success:         #E4F7ED;
    --mm-bg-warning:         #FFF4D6;
    --mm-bg-danger:          #FFEDEB;
    --mm-bg-inverse:         #131722;
    --mm-bg-inverse-soft:    #3A4053;
    --mm-bg-scrim:           #131722;
    /* 전경 12 */
    --mm-fg-default:    #131722;
    --mm-fg-subtle:     #585F73;
    --mm-fg-muted:      #7C8397;
    --mm-fg-disabled:   #C6CAD8;
    --mm-fg-on-primary: #FFFFFF;
    --mm-fg-on-inverse: #FFFFFF;
    --mm-fg-primary:    #2E3E9E;
    --mm-fg-link:       #2E3E9E;
    --mm-fg-info:       #2E3E9E;
    --mm-fg-success:    #0E7A4A;
    --mm-fg-warning:    #8A5A0B;
    --mm-fg-danger:     #C4302B;
    /* 테두리 5 */
    --mm-border-subtle:  #DEE1EB;
    --mm-border-default: #C6CAD8;
    --mm-border-strong:  #7C8397;
    --mm-border-focus:   #5566D2;
    --mm-border-primary: #5566D2;
    /* 통증 10 — 임상 척도라 색 변경 시 디자인·기획 합의 필요 */
    --mm-severity-1: #FFE3A8;  --mm-severity-1-tint: #FFF6E4;
    --mm-severity-2: #FFC79B;  --mm-severity-2-tint: #FFEFE4;
    --mm-severity-3: #FFA894;  --mm-severity-3-tint: #FFE9E3;
    --mm-severity-4: #F58079;  --mm-severity-4-tint: #FDE4E2;
    --mm-severity-5: #DC5A55;  --mm-severity-5-tint: #F9DEDD;
  }
}

:root[data-theme="dark"] {
  /* 위 @media 블록과 동일한 목록. 토글이 OS 설정을 이기게 한다. */
  --mm-bg-canvas: #F5F6FA;          --mm-bg-surface: #FFFFFF;
  --mm-bg-subtle: #EDEFF5;          --mm-bg-primary: #5566D2;
  --mm-bg-primary-pressed: #3B4FC0; --mm-bg-primary-subtle: #E3E7FC;
  --mm-bg-primary-faint: #F2F4FE;   --mm-bg-info: #F2F4FE;
  --mm-bg-success: #E4F7ED;         --mm-bg-warning: #FFF4D6;
  --mm-bg-danger: #FFEDEB;          --mm-bg-inverse: #131722;
  --mm-bg-inverse-soft: #3A4053;    --mm-bg-scrim: #131722;
  --mm-fg-default: #131722;         --mm-fg-subtle: #585F73;
  --mm-fg-muted: #7C8397;           --mm-fg-disabled: #C6CAD8;
  --mm-fg-on-primary: #FFFFFF;      --mm-fg-on-inverse: #FFFFFF;
  --mm-fg-primary: #2E3E9E;         --mm-fg-link: #2E3E9E;
  --mm-fg-info: #2E3E9E;            --mm-fg-success: #0E7A4A;
  --mm-fg-warning: #8A5A0B;         --mm-fg-danger: #C4302B;
  --mm-border-subtle: #DEE1EB;      --mm-border-default: #C6CAD8;
  --mm-border-strong: #7C8397;      --mm-border-focus: #5566D2;
  --mm-border-primary: #5566D2;
  --mm-severity-1: #FFE3A8;  --mm-severity-1-tint: #FFF6E4;
  --mm-severity-2: #FFC79B;  --mm-severity-2-tint: #FFEFE4;
  --mm-severity-3: #FFA894;  --mm-severity-3-tint: #FFE9E3;
  --mm-severity-4: #F58079;  --mm-severity-4-tint: #FDE4E2;
  --mm-severity-5: #DC5A55;  --mm-severity-5-tint: #F9DEDD;
}
```

### 9.1 함께 넣을 베이스 스타일 · 텍스트 유틸리티

```css
html { color-scheme: light; }   /* 다크 값 확정 전까지 light 고정 */

body {
  margin: 0;
  background: var(--mm-bg-surface);  /* Theme.kt 의 background = bgSurface */
  color: var(--mm-fg-default);
  font-family: var(--mm-font-sans);
  /* 본문 기본은 Body/L 17 — 브라우저 기본 16 을 그대로 두면 앱보다 작다 */
  font-size: var(--mm-type-body-l-size);
  line-height: var(--mm-type-body-l-line);
  -webkit-font-smoothing: antialiased;
  word-break: keep-all;              /* 한국어 어절 단위 줄바꿈. 필수 */
}

/* 화면 프레임: 높이 HUG · 폭 FILL · 최소 812 (DESIGN.md 5) */
.mm-screen {
  min-height: 100dvh;                /* 100vh 아님 — 모바일 주소창 때문 */
  padding-inline: var(--mm-layout-gutter);
  background: var(--mm-bg-canvas);
}

/* 텍스트 스타일 15종 */
.mm-display-m   { font-size: var(--mm-type-display-m-size);  line-height: var(--mm-type-display-m-line);  letter-spacing: var(--mm-type-display-m-tracking);  font-weight: var(--mm-type-display-m-weight);  text-wrap: balance; }
.mm-heading-l   { font-size: var(--mm-type-heading-l-size);  line-height: var(--mm-type-heading-l-line);  letter-spacing: var(--mm-type-heading-l-tracking);  font-weight: var(--mm-type-heading-l-weight);  text-wrap: balance; }
.mm-heading-m   { font-size: var(--mm-type-heading-m-size);  line-height: var(--mm-type-heading-m-line);  letter-spacing: var(--mm-type-heading-m-tracking);  font-weight: var(--mm-type-heading-m-weight);  text-wrap: balance; }
.mm-heading-s   { font-size: var(--mm-type-heading-s-size);  line-height: var(--mm-type-heading-s-line);  letter-spacing: var(--mm-type-heading-s-tracking);  font-weight: var(--mm-type-heading-s-weight);  text-wrap: balance; }
.mm-body-l      { font-size: var(--mm-type-body-l-size);     line-height: var(--mm-type-body-l-line);     letter-spacing: 0; font-weight: 400; text-wrap: pretty; }
.mm-body-l-strong { composes: mm-body-l; font-weight: 600; }        /* 또는 .mm-body-l.is-strong */
.mm-body-m      { font-size: var(--mm-type-body-m-size);     line-height: var(--mm-type-body-m-line);     letter-spacing: 0; font-weight: 400; text-wrap: pretty; }
.mm-body-m-strong { font-size: var(--mm-type-body-m-size);   line-height: var(--mm-type-body-m-line);     letter-spacing: 0; font-weight: 600; text-wrap: pretty; }
.mm-body-s      { font-size: var(--mm-type-body-s-size);     line-height: var(--mm-type-body-s-line);     letter-spacing: 0; font-weight: 400; text-wrap: pretty; }
.mm-body-s-strong { font-size: var(--mm-type-body-s-size);   line-height: var(--mm-type-body-s-line);     letter-spacing: 0; font-weight: 600; text-wrap: pretty; }
.mm-label-l     { font-size: var(--mm-type-label-l-size);    line-height: var(--mm-type-label-l-line);    letter-spacing: 0; font-weight: 600; text-wrap: balance; }
.mm-label-m     { font-size: var(--mm-type-label-m-size);    line-height: var(--mm-type-label-m-line);    letter-spacing: 0; font-weight: 600; text-wrap: balance; }
.mm-label-s     { font-size: var(--mm-type-label-s-size);    line-height: var(--mm-type-label-s-line);    letter-spacing: var(--mm-type-label-s-tracking); font-weight: 500; text-wrap: balance; }
.mm-numeric-l   { font-size: var(--mm-type-numeric-l-size);  line-height: var(--mm-type-numeric-l-line);  letter-spacing: var(--mm-type-numeric-l-tracking); font-weight: 700; font-variant-numeric: tabular-nums; }
.mm-numeric-m   { font-size: var(--mm-type-numeric-m-size);  line-height: var(--mm-type-numeric-m-line);  letter-spacing: var(--mm-type-numeric-m-tracking); font-weight: 600; font-variant-numeric: tabular-nums; }

/* 고도 */
.mm-elev-card  { box-shadow: var(--mm-elevation-card); }
.mm-elev-float { box-shadow: var(--mm-elevation-float); }
.mm-elev-sheet { box-shadow: var(--mm-elevation-sheet); }

/* Glass — Nav Bar / Tab Bar / Bottom CTA Bar 전용.
   일괄 border 금지. 경계선은 아래처럼 컴포넌트별 한 변만 (6.3.2) */
.mm-glass { -webkit-backdrop-filter: blur(var(--mm-glass-blur)); backdrop-filter: blur(var(--mm-glass-blur)); }
.mm-glass--nav        { background: rgb(255 255 255 / var(--mm-glass-alpha-nav)); }
.mm-glass--tab        { background: rgb(255 255 255 / var(--mm-glass-alpha-tab)); }
.mm-glass--bottom-cta { background: rgb(255 255 255 / var(--mm-glass-alpha-bottom-cta)); }
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .mm-glass { background: var(--mm-bg-surface); }   /* 알파만 1로 올리지 않고 면을 깐다 */
  /* 블러가 없으면 그림자가 층을 만든다 — 마스터 294:652 의 Surface=Opaque 규격 */
  .mm-glass--bottom-cta { box-shadow: var(--mm-elevation-float); }
}

/* 크롬 경계선 — Glass/Opaque 무관하게 항상 (6.3.2) */
.mm-navbar { border-block-end: var(--mm-border-hairline) solid var(--mm-border-subtle); }
.mm-tabbar { border-block-start: var(--mm-border-hairline) solid var(--mm-border-subtle); }
/* Bottom CTA Bar 는 선을 두지 않는다. 층은 그림자가 만든다 */

/* 크롬 높이 — 매직 넘버 대신 토큰 합으로 쌓는다 (4.2.1) */
.mm-navbar     { min-height: var(--mm-layout-nav-h); }      /* 고정 height 아님 */
.mm-tabbar__row { height: var(--mm-tabbar-row-h); padding-block-start: var(--mm-space-8); }
.mm-tabbar__safe,
.mm-bottom-cta { padding-block-end: var(--mm-layout-safe-bottom); }
.mm-bottom-cta {
  display: flex; flex-direction: column; gap: var(--mm-space-10);  /* 자식 둘 이상일 때만 보인다 */
  padding-block-start: var(--mm-space-12);
  padding-inline: var(--mm-layout-gutter);
}
/* Nav Bar 제목은 "바의 가운데". 남은 폭의 가운데가 아니다 (4.2.1) */
.mm-navbar__title {
  position: absolute; inset-inline: var(--mm-navbar-title-inset); text-align: center;
}
.mm-navbar--has-action .mm-navbar__title { inset-inline: var(--mm-navbar-title-inset-action); }

/* Scrim */
.mm-scrim { position: fixed; inset: 0; background: rgb(19 23 34 / var(--mm-scrim-alpha)); }

/* 터치 영역 48 보장 — S(32) / Date Cell(42) 처럼 시각 규격이 작은 컨트롤용 */
.mm-hit-48 { position: relative; }
.mm-hit-48::before {
  content: ""; position: absolute; left: 50%; top: 50%;
  width: var(--mm-size-touch-min); height: var(--mm-size-touch-min);
  transform: translate(-50%, -50%);
}

/* 움직임 축소 — Loading 스켈레톤에 shimmer 를 넣지 않는 것이 원본 규칙 */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; }
}
```

---

## 10. Tailwind `theme.extend` JS 객체

`tailwind.config.js`(또는 `.ts`)에 그대로 붙인다. 값은 자립형(하드코딩)이라 §9 CSS 없이도 동작한다. §9를 함께 쓰면 각 값을 `var(--mm-*)`로 바꿔도 된다.

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  // 다크 값이 아직 없다 — 토글 구조만 열어 둔다
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        /* ---- 1계층 · 원시 팔레트 43 (컴포넌트에서 직접 쓰지 말 것) ---- */
        mmPalette: {
          primary: {
            50: '#F2F4FE', 100: '#E3E7FC', 200: '#C7CFF8', 300: '#A3AFF1', 400: '#7484E3',
            500: '#5566D2', 600: '#3B4FC0', 700: '#2E3E9E', 800: '#242F79', 900: '#1A2154',
          },
          neutral: {
            0: '#FFFFFF', 25: '#FAFBFD', 50: '#F5F6FA', 100: '#EDEFF5', 200: '#DEE1EB',
            300: '#C6CAD8', 400: '#989EB1', 500: '#7C8397', 600: '#585F73', 700: '#3A4053',
            900: '#131722', // neutral/800 은 존재하지 않는다
          },
          amber: { 50: '#FFF4D6', 100: '#FFE9B3', 500: '#E0A227', 700: '#8A5A0B' },
          green: { 50: '#E4F7ED', 100: '#C6F0DC', 500: '#12A05F', 700: '#0E7A4A' },
          red:   { 50: '#FFEDEB', 100: '#FFD8D4', 500: '#E5504A', 700: '#C4302B' },
          severity: {
            1: '#FFE3A8', 2: '#FFC79B', 3: '#FFA894', 4: '#F58079', 5: '#DC5A55',
            '1-tint': '#FFF6E4', '2-tint': '#FFEFE4', '3-tint': '#FFE9E3',
            '4-tint': '#FDE4E2', '5-tint': '#F9DEDD',
          },
        },

        /* ---- 2계층 · 시맨틱 41 (화면은 이것만 쓴다) ---- */
        mm: {
          bg: {
            canvas: '#F5F6FA',
            surface: '#FFFFFF',
            subtle: '#EDEFF5',
            primary: '#5566D2',
            'primary-pressed': '#3B4FC0',
            'primary-subtle': '#E3E7FC',
            'primary-faint': '#F2F4FE',
            info: '#F2F4FE',
            success: '#E4F7ED',
            warning: '#FFF4D6',
            danger: '#FFEDEB',
            inverse: '#131722',
            'inverse-soft': '#3A4053',
            scrim: '#131722',
          },
          fg: {
            DEFAULT: '#131722',
            subtle: '#585F73',
            muted: '#7C8397',      // 본문 금지 — 아이콘/장식 전용
            disabled: '#C6CAD8',
            'on-primary': '#FFFFFF',
            'on-inverse': '#FFFFFF',
            primary: '#2E3E9E',
            link: '#2E3E9E',
            info: '#2E3E9E',
            success: '#0E7A4A',
            warning: '#8A5A0B',
            danger: '#C4302B',
          },
          border: {
            subtle: '#DEE1EB',
            DEFAULT: '#C6CAD8',
            strong: '#7C8397',
            focus: '#5566D2',
            primary: '#5566D2',
          },
          severity: {
            1: '#FFE3A8', 2: '#FFC79B', 3: '#FFA894', 4: '#F58079', 5: '#DC5A55',
            '1-tint': '#FFF6E4', '2-tint': '#FFEFE4', '3-tint': '#FFE9E3',
            '4-tint': '#FDE4E2', '5-tint': '#F9DEDD',
          },
        },

        /* ---- 브랜드 고정색 — 다크/테마 영향 없음 ---- */
        mmBrand: {
          kakaoContainer: '#FEE500',
          kakaoSymbol: '#000000',
          kakaoLabel: '#191600',
          naverContainer: '#03C75A',
          naverLabel: '#FFFFFF',
          appleContainer: '#000000',
          appleLabel: '#FFFFFF',
          googleContainer: '#FFFFFF',
          googleLabel: '#1F1F1F',
          googleBorder: '#747775',
        },
      },

      fontFamily: {
        mm: [
          '"Pretendard Variable"', 'Pretendard', '-apple-system', 'BlinkMacSystemFont',
          '"Apple SD Gothic Neo"', '"Noto Sans KR"', '"Malgun Gothic"', 'system-ui', 'sans-serif',
        ],
      },

      /* Figma 스타일 15종. [size, { lineHeight, letterSpacing, fontWeight }] */
      fontSize: {
        'mm-display-m':     ['30px', { lineHeight: '40px', letterSpacing: '-0.02em',  fontWeight: '700' }],
        'mm-heading-l':     ['24px', { lineHeight: '34px', letterSpacing: '-0.02em',  fontWeight: '700' }],
        'mm-heading-m':     ['20px', { lineHeight: '28px', letterSpacing: '-0.015em', fontWeight: '600' }],
        'mm-heading-s':     ['17px', { lineHeight: '24px', letterSpacing: '-0.01em',  fontWeight: '600' }],
        'mm-body-l':        ['17px', { lineHeight: '26px', letterSpacing: '0',        fontWeight: '400' }],
        'mm-body-l-strong': ['17px', { lineHeight: '26px', letterSpacing: '0',        fontWeight: '600' }],
        'mm-body-m':        ['15px', { lineHeight: '24px', letterSpacing: '0',        fontWeight: '400' }],
        'mm-body-m-strong': ['15px', { lineHeight: '24px', letterSpacing: '0',        fontWeight: '600' }],
        'mm-body-s':        ['13px', { lineHeight: '20px', letterSpacing: '0',        fontWeight: '400' }],
        'mm-body-s-strong': ['13px', { lineHeight: '20px', letterSpacing: '0',        fontWeight: '600' }],
        'mm-label-l':       ['15px', { lineHeight: '20px', letterSpacing: '0',        fontWeight: '600' }],
        'mm-label-m':       ['13px', { lineHeight: '18px', letterSpacing: '0',        fontWeight: '600' }],
        'mm-label-s':       ['11px', { lineHeight: '16px', letterSpacing: '0.02em',   fontWeight: '500' }],
        'mm-numeric-l':     ['24px', { lineHeight: '30px', letterSpacing: '-0.015em', fontWeight: '700' }],
        'mm-numeric-m':     ['17px', { lineHeight: '22px', letterSpacing: '-0.01em',  fontWeight: '600' }],
      },

      /* 간격 12 — 4의 배수가 아니다(2·6·10·14 포함). 기본 스케일과 섞지 말 것 */
      spacing: {
        'mm-2': '2px',  'mm-4': '4px',  'mm-6': '6px',  'mm-8': '8px',
        'mm-10': '10px','mm-12': '12px','mm-14': '14px','mm-16': '16px',
        'mm-20': '20px','mm-24': '24px','mm-32': '32px','mm-40': '40px',
        // 크기·레이아웃
        'mm-touch-min': '48px',
        'mm-icon-sm': '18px', 'mm-icon-md': '20px', 'mm-icon-lg': '24px',
        'mm-control-sm': '40px', 'mm-control-md': '48px', 'mm-control-lg': '56px',
        'mm-mic': '88px',
        'mm-gutter': '20px',
        'mm-safe-bottom': '24px',
        'mm-nav-h': '56px',
        'mm-tabbar-h': '79px',        // = 1 + 8 + 46 + 24 (4.2.1)
        'mm-tabbar-row-h': '54px',    // = space/8 + 탭 46
        'mm-bottom-cta-h': '92px',    // = 12 + 56 + 24
        // Nav Bar 제목 인셋 — 제목은 "바의 가운데"다 (4.2.1)
        'mm-navbar-title-inset': '60px', 'mm-navbar-title-inset-action': '88px',
        // Icon Button 상자. 32 만 토큰이 없고 IconButton.kt 가 직접 쓴다
        'mm-iconbox-s': '32px', 'mm-iconbox-m': '40px', 'mm-iconbox-l': '48px',
        // Avatar / Date Cell (DESIGN.md 5 의 고정 규격)
        'mm-avatar': '44px', 'mm-date-cell': '42px', 'mm-date-cell-sheet': '34px',
      },

      width:     { 'mm-screen': '360px', 'mm-content': '320px', 'mm-logo-lockup': '139px' },
      maxWidth:  { 'mm-screen': '360px', 'mm-content': '320px' },
      minHeight: { 'mm-screen': '812px', 'mm-loading': '116px', 'mm-nav': '56px' },
      height:    { 'mm-logo-lockup': '36px', 'mm-logo-symbol': '48px', 'mm-skeleton-line': '16px' },

      /* 온보딩 일러스트 4종 (8.9.1). 폭 고정 금지 — 비율만 잡는다 */
      aspectRatio: { 'mm-illustration': '352 / 290.4' },

      borderRadius: {
        'mm-xs': '8px',
        'mm-sm': '12px',
        'mm-md': '16px',
        'mm-lg': '20px',
        'mm-xl': '24px',
        'mm-2xl': '28px',
        'mm-full': '9999px',
        'mm-button-m': '14px',   // 스케일 밖 · M Button 전용
        'mm-date-cell': '13px',  // 스케일 밖 · Date Cell 전용
      },

      borderWidth: { 'mm-hairline': '1px' },

      /* Figma 원본 2단 그림자 · 브랜드 틴트 #1B255A */
      boxShadow: {
        'mm-card':  '0 3px 10px rgba(27,37,90,0.08), 0 1px 2px rgba(27,37,90,0.05)',
        'mm-float': '0 4px 14px rgba(27,37,90,0.09), 0 1px 3px rgba(27,37,90,0.06)',
        'mm-sheet': '0 -4px 24px rgba(27,37,90,0.10), 0 0 2px rgba(27,37,90,0.05)',
      },

      backdropBlur: { mm: '24px' },

      opacity: {
        'mm-scrim': '0.5',
        'mm-glass-cta': '0.78',
        'mm-glass-nav': '0.82',
        'mm-glass-tab': '0.86',
      },

      /* 아이콘 획 두께 — stroke-[--] 대신 stroke-mm 으로 */
      strokeWidth: { mm: '1.75', 'mm-dots': '2.6' },

      keyframes: {
        'mm-spin': { from: { transform: 'rotate(0deg)' }, to: { transform: 'rotate(360deg)' } },
      },
      animation: { 'mm-spin': 'mm-spin 1s linear infinite' },
    },
  },
  plugins: [
    // 한국어 어절 줄바꿈은 전역 base 에서 word-break: keep-all 로 건다 (§9.1)
  ],
};
```

사용 예: `class="bg-mm-bg-surface text-mm-fg-default rounded-mm-lg shadow-mm-card p-mm-20"`.

---

## 11. 소스와 문서가 어긋나는 지점 (웹 구현 전 확인)

| # | 항목 | DESIGN.md | 실제 소스 | 웹에서 따를 값 |
|---|---|---|---|---|
| 1 | `layout/tabbar-h` | 3.0에서 79 확정 (2.0까지 82) | `tabBarHeight = 79.dp` | **79** |
| 2 | 시맨틱 개수 | §0 표 "41" / §2.3~2.5 표 합계 40 | 데이터 클래스 필드 41 | **41** (`bgInfo`가 문서 표에 빠져 있음) |
| 3 | `bg/info` | §2.3 표에 항목 없음 | `bgInfo = Primary50` | `#F2F4FE` (= `bgPrimaryFaint`와 동일 값) |
| 4 | Overlay Scrim 알파 | §4/§7.4 "40~50%" | `SCRIM_ALPHA = 0.5f` | **0.5** |
| 5 | 화면 바닥 색 | §2.3 `bg/canvas` = 화면 바탕 | `Theme.kt` `background = bgSurface`, 주석에 재바인딩 경위 | **`#FFFFFF`** (화면이 스스로 `bgCanvas`를 그릴 때만 `#F5F6FA`) |
| 6 | Icon Button S 반경 | **§6.1 표 "16"** / §4.1 `radius/full` 용도에 "Icon Button" | `IconButton.kt`가 L/M/S **전부 `MedicalMateRadius.full`** | **`full`** (2:1로 다수). §6.1 표 한 곳만 16이다. 디자인 확인은 하되 기본은 `full` |
| 7 | 아이콘 종수 표기 | §0·§6.3 모두 **"46종"**이고 목록에 `arrow-up` 포함 | `MedicalMateIcons` 46개. KDoc만 *"45종에 Figma가 나중에 더한 `arrow-up`을 합쳐 46종"*이라는 **연혁**을 적었다 | **46.** 문서와 소스가 일치한다 — 앞선 판이 KDoc의 연혁 서술을 DESIGN.md 본문으로 잘못 돌렸다 |
| 8 | Loading Spinner | `Icon/spinner` 자산 존재 | `Loading.kt`가 M3 `CircularProgressIndicator` 사용, `MedicalMateIcons.Spinner` 미사용 | 웹은 `ic_spinner` SVG + CSS 회전이 자연스럽다 |
| 9 | Glass 블러 | §4.2 `Surface/Glass` = background-blur 24 | `MedicalMateGlass.blurRadius` 24는 **선언만 되고 어디서도 호출되지 않는다.** 세 크롬 모두 기본값 `OPAQUE` (§6.3.1) | **웹은 블러를 실제로 건다.** 기본값을 `GLASS`로 두는 편이 §4.2 원칙에 맞다 |
| 10 | Glass 테두리 | §4.2 *"Glass에 테두리를 추가하지 않는다"* | `TabBar` 상단 1px, `NavBar` 하단 1px — 둘 다 KDoc에 예외 사유를 적었다 (§6.3.2) | **예외 2건을 그대로 옮긴다.** Bottom CTA Bar만 선이 없다 |
| 11 | Icon Button S 상자 32 | §6.1 표 "32" | `IconButton.kt`에 **`32.dp` 하드코딩.** `MedicalMateSize`에 대응 토큰이 없다 | 웹은 `--mm-iconbox-s: 32px`로 토큰화한다 |
| 12 | 온보딩 일러스트 4종 | 언급 없음 | `img_onboarding_*.xml` 4개, `OnboardingPage` enum이 참조 (§8.9.1) | **자산 목록에 포함시킨다.** 아이콘 규격(획 1.75 단색) 적용 금지 |

### 11.1 스케일 밖 값 현황 (DESIGN.md §12) — 웹에서 통일할지 결정 대상

Figma 실측. 색 토큰은 100% 바인딩됐지만 **Scale 33개는 바인딩 0건**이라 반경·간격·크기를 숫자로 직접 넣고 있다.

| 값 | 횟수 | 쓰인 곳 | DESIGN.md 통일안 |
|---|---|---|---|
| 반경 13 | 67 | 아이콘 상자 44 · 시트 날짜 셀 | `radius/sm` 12 |
| 반경 10 | 65 | 질문 번호 배지 · 작은 pill | `radius/full` |
| 반경 14 | 18 | 아이콘 상자 48 · 다음 일정 액션 | `radius/md` 16 |
| 간격 3 | 86 | 제목 + 보조 문구 사이 | `space/4` |
| 간격 5 | 28 | 다음 일정 카드 메타 | `space/6` |

**웹은 통일안(12 / full / 16 / 4 / 6)을 채택할 것을 권한다.** 단 `MedicalMateRadius.dateCell` 13은 Kotlin이 "바꾸면 한 주 일곱 칸이 나란히 놓일 때 차이가 눈에 띈다"라며 명시적으로 남긴 값이라 예외다.

### 11.2 검수 기준 (DESIGN.md §11) — 웹 번역

| # | 원문 | 웹에서의 뜻 |
|---|---|---|
| 1 | 모든 색이 Semantic 토큰에 바인딩 (하드코딩 0) | CSS/JSX에 리터럴 HEX 0건. Stylelint `declaration-property-value-allowed-list`로 강제 가능 |
| 2 | 모든 텍스트가 시스템 텍스트 스타일 적용 | `.mm-*` 유틸 또는 `text-mm-*` 없이 `font-size`를 직접 쓰는 곳 0건 |
| 3 | 대비 4.5 / 큰 글자 3 / 비텍스트 3 전부 통과 | `fg/muted`를 본문에 쓰면 3.78로 탈락. 아이콘·경계선은 **Lighthouse가 안 본다** — 직접 계산 |
| 4 | 오토레이아웃 넘침 0 | 가로 스크롤 0. flex/grid `min-width: 0` 누락 확인 |
| 5 | 높이 HUG · 폭 FILL · 최소 812 | `min-height: 100dvh`, 고정 `height` 금지 |
| 6 | 컴포넌트 인스턴스 사용, detach 없음 | 디자인 시스템 컴포넌트 재사용, 화면에서 스타일 복제 금지 |
| 7 | 한국어 카피가 실제 문장 | lorem/placeholder 0건 |
| 8 | 터치 영역 48 이상 | S(32)·Date Cell(42)은 히트 영역 확장 필수 |
| 9 | 스크린샷으로 렌더 확인 | 시각 회귀 테스트 |
| 10 | IA · 유저플로우의 화면 코드와 일치 | 라우트가 Figma 화면 코드(1a-1, 1b-4 …)와 대응 |

### 11.3 접근성 기준 (DESIGN.md §9) — 웹 번역

§11.2가 검수 기준 10개만 옮겨서 **접근성 표의 두 항목이 빠져 있었다.** 전체는 이렇다.

| 항목 | 기준 | 웹에서의 뜻 |
|---|---|---|
| 텍스트 대비 | 4.5:1 (큰 글자 3:1) | §2.2 대비 열이 계산값이다. `fg/muted` 3.78은 본문 금지 |
| 비텍스트 대비 | 3:1 — 아이콘 · 경계선 · 컨트롤 상태 | *"**Lighthouse는 텍스트 대비만 본다.** 아이콘·경계선은 디자인 단계에서 직접 계산한다."* |
| 터치 영역 | 최소 **48×48** | `--mm-size-touch-min`. §8.5의 래퍼 방식 |
| 색 단독 사용 | 금지 — 색 + 형태/낱말 | D11. severity 칩(§7.1), 탭 활성(채움형 전환) |
| **폰트 배율** | **130%까지 레이아웃 유지** | **빠져 있던 항목.** 아래 참고 |
| **플레이스홀더** | **`fg/subtle` 이상** | **빠져 있던 항목.** `--mm-fg-subtle` `#585F73`(6.36)가 하한이다. `--mm-fg-muted`를 플레이스홀더에 쓰면 탈락 |

**폰트 배율 130%가 웹에서 뜻하는 것.** 안드로이드는 시스템 글꼴 배율이고 웹은 두 가지가 겹친다.

1. **브라우저 최소 글꼴 크기 / 페이지 확대** — 문서 전역 배율. `px` 기반이어도 브라우저 확대에는 따라온다.
2. **사용자 기본 글꼴 크기 변경** — `px`로 고정하면 **따라오지 않는다.**

§3.2가 "sp → px 1:1"을 택했으므로 2번이 깨진다. 판단:

- **본문 텍스트는 `rem`으로 두는 것을 검토한다.** `--mm-type-body-l-size: 1.0625rem`(= 17/16)처럼 두면 사용자 설정을 따른다. 행간도 함께 `rem`으로 가야 비율이 유지된다.
- 다만 **크롬(Nav/Tab Bar)·아이콘 상자·터치 영역은 `px`로 둔다.** 이들은 안드로이드에서도 `dp`(배율 비영향)라서 `sp`와 다르게 취급된다. `rem`으로 두면 글꼴을 키웠을 때 탭 바가 화면을 잡아먹는다.
- 검수는 **브라우저 확대 130%에서 가로 스크롤 0 · 글자 잘림 0**으로 확인한다(§11.2의 4번과 같은 화면에서 본다).

> `Type.kt` 주석이 같은 문제를 먼저 적었다: *"기기 폭은 360부터 412까지 갈리고 **사용자가 글꼴 배율을 2배까지 올린다.** Figma 캔버스는 390 하나라서, 한 줄에 맞춰 그린 문장이 실제 기기에서 넘어간다. 넘어가는 것을 막을 수는 없으니 **어디서 끊길지를 정한다.**"* → 130%는 레이아웃 유지 기준이고, 그 위는 §3.4의 줄바꿈 규칙이 받는다.

---

## 12. 웹 포팅 시 주의점 요약

| 항목 | 안드로이드 | 웹 | 판단 |
|---|---|---|---|
| 화면 폭 | 360 기준, 고정 안 함 | `max-width` 컨테이너 + 거터 20 | **폭 고정 금지.** 소스가 "이 값으로 레이아웃을 고정하지 않는다"라고 명시 |
| 최소 높이 812 | 프레임 FILL | `min-height: 100dvh` | `100vh`는 모바일 주소창 때문에 어긋난다 |
| 다크 모드 | 미지원(값 없음) | 구조만 준비, 값은 라이트와 동일 | **색을 추측해 만들지 않는다** |
| 2단 그림자 | `Modifier.shadow` 한계로 근사 | `box-shadow` 2겹으로 원본 그대로 | 웹이 더 정확하다. §6.1 값 사용 |
| 그림자 틴트 | API 28+ | 항상 적용 | 제약 없음 |
| Glass 블러 24 | **한 번도 안 그림.** compose-ui에 backdrop 블러 API가 없어 세 크롬 모두 기본값 `OPAQUE` | `backdrop-filter` + `@supports` 폴백 | Safari 접두사 필요. 폴백은 알파 1이 아니라 `bg/surface` 깔기. **웹 기본값은 `GLASS`가 맞다**(§6.3.1) |
| Glass 테두리 | "추가하지 않는다"가 원칙이나 Tab Bar 상단·Nav Bar 하단 1px은 예외 | `border-block-start` / `border-block-end` 한 변만 | 일괄 `border` 금지. Bottom CTA Bar는 선 없이 그림자만 (§6.3.2) |
| 크롬 높이 79 / 92 | 토큰 합으로 조립 (1+8+46+24 / 12+56+24) | 같은 합을 CSS로 쌓는다 | 매직 넘버 금지 (§4.2.1) |
| Nav Bar 제목 | 바의 가운데. 인셋 60 / 액션 있으면 88 | `position: absolute; inset-inline: 60px` | flex 형제로 끼우면 액션 폭만큼 밀린다 (§4.2.1) |
| Icon Button 반경 | Kotlin은 L/M/S 전부 `full` | `--mm-radius-full` | DESIGN.md §6.1 표만 S를 16으로 적었다 (§8.5, §11 항목 6) |
| 폰트 배율 130% | 시스템 글꼴 배율 | 본문은 `rem`, 크롬·터치 영역은 `px` | 전부 `px`로 두면 사용자 글꼴 설정을 못 따른다 (§11.3) |
| 온보딩 일러스트 | vector drawable 4종, 352×290.4 다색 | Figma에서 SVG 직접 내보내기 | 아이콘 규격(획 1.75 단색) 적용 금지 (§8.9.1) |
| 시스템 스플래시 | `values-v31`: 면 `bg/primary` + 아이콘 비움 | `manifest.json` `background_color`/`theme_color` `#5566D2` | 아이콘을 넣으면 첫 화면 락업과 위치가 안 맞아 튄다 (§2.8) |
| 한국어 줄바꿈 | `LineBreak.Heading` / `Paragraph` | `word-break: keep-all` + `text-wrap: balance/pretty` | **`keep-all` 없으면 어절 중간에서 끊긴다** |
| 폰트 | static OTF 4종 동봉 | 웹폰트 4 웨이트, OFL 고지 동봉 | Google Fonts에 없다. 직접 호스팅 또는 jsDelivr |
| 아이콘 | Vector Drawable 46 | SVG 46 (1:1 변환) | **획형 path에 `fill="none"` 필수** |
| 스켈레톤 | shimmer 없음 (의도적) | shimmer 없음 유지 | 넣으려면 `prefers-reduced-motion` 처리 동반 |
| 터치 48 | hit area 확장 | `::before` 확장 | S(32) · Date Cell(42) 두 곳 |
| 로고 모션(1b-4) | `MarkUpper`/`MarkLower` 두 장 | SVG 2장 겹쳐 `translateX` | 정지 상태는 `Mark` 한 장 |
| 스크림 터치 | 닫기 없어도 터치를 삼킨다 | `pointer-events: none` 금지 | 뒤 버튼이 눌리면 안 된다 |
| 색 단독 사용 | 금지 (D11) | severity 칩에 숫자/낱말 병기 | 색 배경만 그리는 구현 금지 |
| dynamic color | 비활성(브랜드 색 보호) | 해당 없음 | — |
