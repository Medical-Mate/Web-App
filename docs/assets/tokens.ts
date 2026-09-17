/**
 * 진료메이트 (MedicalMate) — 디자인 토큰 (TypeScript)
 *
 * tokens.css 와 같은 값의 JS 런타임 사본이다. 캔버스·차트·인라인 스타일처럼
 * CSS 변수를 못 읽는 자리에서 쓴다. 평소 컴포넌트 스타일링은 tokens.css 의
 * `var(--mm-*)` 를 쓰는 쪽이 낫다 — 다크 모드 전환이 공짜로 따라온다.
 *
 * 값 출처 (전부 소스에서 읽었다. 추정값이 없다):
 *   팔레트 43        core/designsystem/Palette.kt
 *   시맨틱 41        core/designsystem/MedicalMateColors.kt (LightMedicalMateColors)
 *   타이포 15        core/designsystem/Type.kt (DefaultMedicalMateTypography)
 *   간격 12·크기 14  core/designsystem/Dimens.kt
 *   반경 10          core/designsystem/MedicalMateRadius.kt
 *   고도 3·Glass     core/designsystem/Elevation.kt
 *   브랜드색 10      core/designsystem/BrandColor.kt
 *   통증 5단계       core/designsystem/MedicalMateSeverity.kt + res/values/strings.xml
 *   스크림·Loading   component/OverlayScrim.kt, component/Loading.kt
 *
 * 규칙: 컴포넌트는 `colors.light.bg*` / `fg*` / `border*` / `severity*` 만 본다.
 *       `palette` 를 컴포넌트에서 직접 집지 않는다 (Palette.kt 의 43개 상수가
 *       전부 internal 인 것과 같은 규칙).
 */

/* ===========================================================================
   1계층 — 원시 팔레트 43개
   =========================================================================== */

export const palette = {
  // primary — 인디고 231°
  primary50: '#F2F4FE',
  primary100: '#E3E7FC',
  primary200: '#C7CFF8',
  primary300: '#A3AFF1',
  primary400: '#7484E3',
  primary500: '#5566D2',
  primary600: '#3B4FC0',
  primary700: '#2E3E9E',
  primary800: '#242F79',
  primary900: '#1A2154',

  // neutral — 11단계. neutral/800 은 존재하지 않는다
  neutral0: '#FFFFFF',
  neutral25: '#FAFBFD',
  neutral50: '#F5F6FA',
  neutral100: '#EDEFF5',
  neutral200: '#DEE1EB',
  neutral300: '#C6CAD8',
  neutral400: '#989EB1',
  neutral500: '#7C8397',
  neutral600: '#585F73',
  neutral700: '#3A4053',
  neutral900: '#131722',

  // amber / green / red — 각 4개
  amber50: '#FFF4D6',
  amber100: '#FFE9B3',
  amber500: '#E0A227',
  amber700: '#8A5A0B',
  green50: '#E4F7ED',
  green100: '#C6F0DC',
  green500: '#12A05F',
  green700: '#0E7A4A',
  red50: '#FFEDEB',
  red100: '#FFD8D4',
  red500: '#E5504A',
  red700: '#C4302B',

  // severity — base 5 + tint 5
  severity1Base: '#FFE3A8',
  severity2Base: '#FFC79B',
  severity3Base: '#FFA894',
  severity4Base: '#F58079',
  severity5Base: '#DC5A55',
  severity1TintBase: '#FFF6E4',
  severity2TintBase: '#FFEFE4',
  severity3TintBase: '#FFE9E3',
  severity4TintBase: '#FDE4E2',
  severity5TintBase: '#F9DEDD',
} as const;

/* ===========================================================================
   2계층 — 시맨틱 41개
   =========================================================================== */

const light = {
  // 배경 14
  bgCanvas: palette.neutral50,          // #F5F6FA 화면 바탕
  bgSurface: palette.neutral0,          // #FFFFFF 카드·시트
  bgSubtle: palette.neutral100,         // #EDEFF5 입력 필드·보조 블록
  bgPrimary: palette.primary500,        // #5566D2 주 버튼·행동 유도 블록
  bgPrimaryPressed: palette.primary600, // #3B4FC0 눌림
  bgPrimarySubtle: palette.primary100,  // #E3E7FC Callout·환자 발화
  bgPrimaryFaint: palette.primary50,    // #F2F4FE Notice/Info·일정 카드
  bgInfo: palette.primary50,            // #F2F4FE bgPrimaryFaint 와 같은 값, 별도 토큰
  bgSuccess: palette.green50,           // #E4F7ED
  bgWarning: palette.amber50,           // #FFF4D6 알러지 경고
  bgDanger: palette.red50,              // #FFEDEB 삭제 버튼
  bgInverse: palette.neutral900,        // #131722 Toast
  bgInverseSoft: palette.neutral700,    // #3A4053 Tooltip Bubble
  bgScrim: palette.neutral900,          // #131722 · 알파는 scrim.alpha

  // 전경 12 — 주석의 숫자는 흰 배경 대비
  fgDefault: palette.neutral900,   // #131722 17.90 본문 기본
  fgSubtle: palette.neutral600,    // #585F73  6.36 보조·플레이스홀더 하한
  fgMuted: palette.neutral500,     // #7C8397  3.78 본문 금지. 비활성 아이콘·장식 획 전용
  fgDisabled: palette.neutral300,  // #C6CAD8
  fgOnPrimary: palette.neutral0,   // #FFFFFF
  fgOnInverse: palette.neutral0,   // #FFFFFF
  fgPrimary: palette.primary700,   // #2E3E9E  9.13
  fgLink: palette.primary700,      // #2E3E9E  fgPrimary 와 같은 값, 별도 토큰
  fgInfo: palette.primary700,      // #2E3E9E  〃
  fgSuccess: palette.green700,     // #0E7A4A  4.98
  fgWarning: palette.amber700,     // #8A5A0B  5.40
  fgDanger: palette.red700,        // #C4302B  5.28

  // 테두리 5
  borderSubtle: palette.neutral200,  // #DEE1EB 목록 구분선·입력 밑줄
  borderDefault: palette.neutral300, // #C6CAD8
  borderStrong: palette.neutral500,  // #7C8397 입력 필드 테두리(비어 있음)
  borderFocus: palette.primary500,   // #5566D2 포커스
  borderPrimary: palette.primary500, // #5566D2 〃 같은 값, 별도 토큰
  // 예외: 선택 완료된 필드의 테두리는 fgDefault 를 쓴다 (PickerField.kt)

  // 통증 10
  severity1: palette.severity1Base,
  severity2: palette.severity2Base,
  severity3: palette.severity3Base,
  severity4: palette.severity4Base,
  severity5: palette.severity5Base,
  severity1Tint: palette.severity1TintBase,
  severity2Tint: palette.severity2TintBase,
  severity3Tint: palette.severity3TintBase,
  severity4Tint: palette.severity4TintBase,
  severity5Tint: palette.severity5TintBase,
} as const;

/**
 * 다크 모드 값은 소스에 존재하지 않는다.
 *
 * MedicalMateColors.kt / Theme.kt / res/values/themes.xml 세 군데가 같은 말을
 * 한다: "DESIGN.md 에 다크 모드 값이 없다. 값이 정해지고 컴포넌트 QA 가 끝나기
 * 전까지 다크를 지원 대상으로 표시하지 않는다." res/values-night 폴더도 없다.
 *
 * 그래서 키 구조만 열어 두고 값은 라이트와 동일하게 둔다. 색을 추측해 채우면
 * DESIGN.md §11-3(대비 통과)을 검증할 수 없다. 디자인이 확정되면 이 객체만
 * 실제 값으로 교체한다 — 타입은 이미 라이트와 동일하게 강제돼 있다.
 */
const dark: typeof light = light;

export const colors = { light, dark } as const;

/** 브랜드 고정색 — 테마 밖. 다크 모드에도 바뀌지 않는다. 각 사 가이드가 변경을 금지한다. */
export const brandColors = {
  kakaoContainer: '#FEE500',
  kakaoSymbol: '#000000',   // Kotlin 은 Color.Black
  kakaoLabel: '#191600',
  naverContainer: '#03C75A', // 흰 글자와 2.2:1 — DESIGN.md §9 의 유일한 대비 예외
  naverLabel: '#FFFFFF',
  appleContainer: '#000000',
  appleLabel: '#FFFFFF',
  googleContainer: '#FFFFFF',
  googleLabel: '#1F1F1F',
  googleBorder: '#747775',
} as const;

/** 플랫폼 창 배경 (res/values/colors.xml). manifest.json 의 background_color/theme_color 에 쓴다. */
export const platformColors = {
  bgCanvas: '#F5F6FA',
  bgPrimary: '#5566D2',
} as const;

/* ===========================================================================
   타이포 15종
   sp → px 1:1. 자간은 소스가 (letterSpacingPercent / 100).em 이라 퍼센트/100 이
   곧 em 이다. lineHeight 는 unitless ratio 가 아니라 px 절대값이어야 한다.
   =========================================================================== */

export const fontFamily =
  'Pretendard, -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", ' +
  '"Noto Sans KR", "Malgun Gothic", system-ui, sans-serif';

export const fontWeight = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

/**
 * Compose 의 LineBreak.
 *  - `heading`   = Balanced + Loose + Phrase → CSS `text-wrap: balance`
 *  - `paragraph` = 긴 글 가독성 우선        → CSS `text-wrap: pretty`
 * 둘 다 `word-break: keep-all` 과 함께 쓴다. 이게 없으면 "몰라도 괜찮 / 아요" 가 나온다.
 */
export const typography = {
  displayM:    { fontSize: 30, lineHeight: 40, fontWeight: 700, letterSpacing: '-0.02em',  textWrap: 'balance' },
  headingL:    { fontSize: 24, lineHeight: 34, fontWeight: 700, letterSpacing: '-0.02em',  textWrap: 'balance' },
  headingM:    { fontSize: 20, lineHeight: 28, fontWeight: 600, letterSpacing: '-0.015em', textWrap: 'balance' },
  headingS:    { fontSize: 17, lineHeight: 24, fontWeight: 600, letterSpacing: '-0.01em',  textWrap: 'balance' },
  bodyL:       { fontSize: 17, lineHeight: 26, fontWeight: 400, letterSpacing: '0',        textWrap: 'pretty'  },
  bodyLStrong: { fontSize: 17, lineHeight: 26, fontWeight: 600, letterSpacing: '0',        textWrap: 'pretty'  },
  bodyM:       { fontSize: 15, lineHeight: 24, fontWeight: 400, letterSpacing: '0',        textWrap: 'pretty'  },
  bodyMStrong: { fontSize: 15, lineHeight: 24, fontWeight: 600, letterSpacing: '0',        textWrap: 'pretty'  },
  bodyS:       { fontSize: 13, lineHeight: 20, fontWeight: 400, letterSpacing: '0',        textWrap: 'pretty'  },
  bodySStrong: { fontSize: 13, lineHeight: 20, fontWeight: 600, letterSpacing: '0',        textWrap: 'pretty'  },
  labelL:      { fontSize: 15, lineHeight: 20, fontWeight: 600, letterSpacing: '0',        textWrap: 'balance' },
  labelM:      { fontSize: 13, lineHeight: 18, fontWeight: 600, letterSpacing: '0',        textWrap: 'balance' },
  labelS:      { fontSize: 11, lineHeight: 16, fontWeight: 500, letterSpacing: '0.02em',   textWrap: 'balance' },
  numericL:    { fontSize: 24, lineHeight: 30, fontWeight: 700, letterSpacing: '-0.015em', textWrap: 'balance' },
  numericM:    { fontSize: 17, lineHeight: 22, fontWeight: 600, letterSpacing: '-0.01em',  textWrap: 'balance' },
} as const;

/**
 * 본문 기본은 bodyL(17)이다. 진료실에서 소리 내어 읽을 문장이라 15로는 부족하다.
 * 브라우저 기본 16 을 그대로 두면 앱보다 작아진다. 웹에서 15로 내리지 않는다.
 */
export const baseTextStyle = typography.bodyL;

/* ===========================================================================
   치수
   =========================================================================== */

/**
 * 간격 12개. 4의 배수 스케일이 아니다 — 2·6·10·14 가 섞여 있다.
 * Tailwind 기본 spacing(0.25rem 배수)에 매핑하지 말고 전용 스케일로 덮어쓴다.
 * 임의의 간격값을 쓰지 않는다. 새 값이 필요하면 여기에 추가할지 먼저 검토한다.
 */
export const space = {
  s2: 2,
  s4: 4,
  s6: 6,
  s8: 8,
  s10: 10,
  s12: 12,
  s14: 14,
  s16: 16,
  s20: 20,
  s24: 24,
  s32: 32,
  s40: 40,
} as const;

/** 크기 8개 */
export const size = {
  touchMin: 48,  // 접근성 하한. 시각 규격이 더 작은 컨트롤은 hit area 를 따로 넓힌다
  iconSm: 18,
  iconMd: 20,
  iconLg: 24,
  controlSm: 40,
  controlMd: 48,
  controlLg: 56,
  mic: 88,       // 주 음성 입력 버튼
} as const;

/** 레이아웃 6개 + 화면 최소 높이 */
export const layout = {
  screenWidth: 360,   // 기준 폭. 이 값으로 레이아웃을 고정하지 않는다
  gutter: 20,         // 좌우 여백 — 이것만 고정한다
  contentWidth: 320,  // 360 기준 콘텐츠 폭. 모든 기기에서 강제하지 않는다
  safeBottom: 24,     // 컴포넌트 내부 시각 여백. env(safe-area-inset-bottom) 과 중복 적용 금지
  navBarHeight: 56,   // 고정이 아니라 min-height (NavBar.kt heightIn)
  tabBarHeight: 79,   // 82 아님. DESIGN.md 3.0 이 79 로 확정했다
  screenMinHeight: 812,
} as const;

/**
 * 토큰은 아니지만 소스가 상수로 들고 있는 조립 치수.
 * 크롬 높이는 매직 넘버가 아니라 다른 토큰의 합이다. 이 합을 그대로 쌓으면
 * 79 / 92 가 저절로 나온다.
 */
export const chrome = {
  tabBarHairline: 1,          // Tab Bar 상단 경계선
  tabBarRowHeight: 54,        // = space.s8 8 + 탭 46.  1 + 54 + 24 = 79
  bottomCtaHeight: 92,        // = space.s12 12 + size.controlLg 56 + layout.safeBottom 24
  bottomCtaChildGap: 10,      // 자식이 둘 이상이면 10씩 벌린다
  navBarTitleInset: 60,       // = space.s8 8 + size.touchMin 48 + space.s4 4
  navBarTitleInsetAction: 88, // 텍스트 액션이 있을 때
  iconBoxL: 48,               // = size.controlMd
  iconBoxM: 40,               // = size.controlSm
  iconBoxS: 32,               // 토큰이 없다. IconButton.kt 가 32.dp 를 직접 쓴다
  avatar: 44,                 // DESIGN.md §5 고정 규격
  dateCell: 42,
  dateCellSheet: 34,          // 시트 안
} as const;

/**
 * 반경 10개. 같은 화면에서 반경 단계를 두 단계 이상 건너뛰지 않는다.
 * buttonM(14) / dateCell(13) 은 스케일 밖 중간값이다. 없애지 말 것 —
 * dateCell 13 은 캘린더 한 주 7칸을 나란히 놓을 때 차이가 눈에 띈다고
 * 소스가 명시했다.
 */
export const radius = {
  xs: 8,        // Badge, Checkbox, Skeleton 줄
  sm: 12,       // S Button, 원문 블록, 질문 pill
  md: 16,       // L Button, Notice, 입력 필드
  lg: 20,       // Card, Callout
  xl: 24,       // Dialog
  xxl: 28,      // Bottom Sheet
  full: 9999,   // Chip, Avatar, pill, Icon Button L/M/S 전부
  buttonM: 14,  // M Button 전용 — 스케일 밖
  dateCell: 13, // Date Cell 전용 — 스케일 밖
  /** Bottom Sheet 는 위쪽 두 각만 28 (sheetTop: topStart=28, topEnd=28) */
  sheetTop: '28px 28px 0 0',
} as const;

/* ===========================================================================
   고도 · Glass
   Figma 원본 2단 값 그대로. Compose 는 Modifier.shadow 의 한계로 근사값만 썼다.
   CSS box-shadow 는 2단·음수 offset 을 그대로 받으므로 웹이 시안에 더 가깝다.
   그림자는 브랜드 틴트다. 흰 화면 위의 검정 그림자는 회색 때처럼 보인다.
   =========================================================================== */

/** #1B255A. Elevation.kt 가 ambientColor/spotColor 에 함께 넘기는 값 */
export const shadowTint = { hex: '#1B255A', rgb: [27, 37, 90] } as const;

export const elevation = {
  card: '0 3px 10px rgba(27, 37, 90, .08), 0 1px 2px rgba(27, 37, 90, .05)',
  float: '0 4px 14px rgba(27, 37, 90, .09), 0 1px 3px rgba(27, 37, 90, .06)',
  /** Bottom Sheet 전용. 위로 뜨는 y−4 다. Bottom CTA Bar 에 이걸 얹지 말 것 — 거기는 float 다 */
  sheet: '0 -4px 24px rgba(27, 37, 90, .10), 0 0 2px rgba(27, 37, 90, .05)',
  /** Compose 가 쓴 dp 근사값. 웹에는 필요 없고 안드로이드와 대조할 때만 본다 */
  composeDp: { card: 3, float: 4, sheet: 8 },
} as const;

/**
 * Glass. 콘텐츠 위에 겹치는 크롬 전용 — Nav Bar · Tab Bar · Bottom CTA Bar.
 *
 * 주의: 안드로이드는 이 블러를 화면에 한 번도 그린 적이 없다. compose-ui 에
 * backdrop 블러 API 가 없어서 세 크롬 전부 기본값이 OPAQUE 다. 웹의 Glass 는
 * "이식"이 아니라 첫 구현이고, 웹에서는 GLASS 를 기본으로 두는 쪽이
 * DESIGN.md §4.2 원칙에 더 맞다.
 *
 * 블러가 걸리면 그림자를 빼고, 안 걸리면 elevation.float 를 얹는 것이 마스터 규격이다.
 */
export const glass = {
  blur: 24,
  alphaBottomCta: 0.78,
  alphaNav: 0.82,
  alphaTab: 0.86,
} as const;

/** 선 — 목록 구분·선택·포커스·접근성 경계에만. 테두리 대신 고도로 위계를 만든다 */
export const borderWidth = { hairline: 1 } as const;

/** Overlay Scrim. DESIGN.md 는 40~50% 라 적었고 코드는 50% 를 쓴다 */
export const scrim = { color: light.bgScrim, alpha: 0.5 } as const;

/**
 * Loading. 스켈레톤에 shimmer 를 일부러 넣지 않았다 —
 * "정지 상태로 두면 두 경우가 같아진다" (Loading.kt KDoc).
 */
export const loading = {
  minHeight: 116,
  skeletonLineHeight: 16,
  skeletonLineWidths: [0.6, 1.0, 0.8], // 제목 한 줄 + 본문 두 줄
  skeletonLineRadius: radius.xs,
  skeletonLineColor: light.bgSubtle,
  spinnerColor: light.bgPrimary,
  spinnerSize: size.iconLg,
  padding: space.s20,
  gap: space.s12,
} as const;

/** 아이콘 규격 (res/drawable/ic_*.xml 46종 전수 확인) */
export const icon = {
  viewBox: '0 0 24 24',
  strokeWidth: 1.75,
  strokeWidthDots: 2.6, // more-horizontal 하나만
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  /** 16 이하로 줄이지 않는다. 획이 뭉개진다 */
  minSize: 16,
  /** 크기는 아이콘이 아니라 상자가 정한다. L=48/24 · M=40/20 · S=32/18 */
  box: { l: { box: 48, icon: 24 }, m: { box: 40, icon: 20 }, s: { box: 32, icon: 18 } },
  /** 인라인 아이콘은 옆에 붙는 글자 크기를 따른다 */
  inline: { bodyL: 20, bodyM: 18, bodyS: 16 },
} as const;

/* ===========================================================================
   통증 5단계 (MedicalMateSeverity + res/values/strings.xml)
   색·라벨·설명·NRS 구간이 한 묶음이다. 네 컴포넌트(Slider·Scale·Select·Readout)가
   같은 정의를 따로 들면 문구나 색이 갈린다.

   단계를 색만으로 전달하지 않는다 (DESIGN.md D11). 숫자·라벨·설명 중
   최소 하나를 항상 색과 함께 그린다. 색 배경만 렌더링하는 구현은 금지.

   nrsFirst/nrsLast 는 DESIGN.md 에 없다. Figma 의 Severity Readout 마스터
   (333:1126)에서 읽은 값이고, 임상 척도라서 추정하지 않았다.
   =========================================================================== */

export type SeverityLevel = 1 | 2 | 3 | 4 | 5;

export const severity = {
  1: {
    level: 1,
    base: palette.severity1Base,
    tint: palette.severity1TintBase,
    nrsFirst: 1,
    nrsLast: 2,
    label: '조금 불편해요',
    description: '신경 쓰이지만 하던 일은 계속할 수 있어요',
  },
  2: {
    level: 2,
    base: palette.severity2Base,
    tint: palette.severity2TintBase,
    nrsFirst: 3,
    nrsLast: 4,
    label: '은근히 아파요',
    description: '자꾸 생각나고 집중이 잘 안 돼요',
  },
  3: {
    level: 3,
    base: palette.severity3Base,
    tint: palette.severity3TintBase,
    nrsFirst: 5,
    nrsLast: 6,
    label: '꽤 아파요',
    description: '하던 일을 멈추게 될 때가 있어요',
  },
  4: {
    level: 4,
    base: palette.severity4Base,
    tint: palette.severity4TintBase,
    nrsFirst: 7,
    nrsLast: 8,
    label: '많이 아파요',
    description: '일상생활이 어렵고 참기 힘들어요',
  },
  5: {
    level: 5,
    base: palette.severity5Base,
    tint: palette.severity5TintBase,
    nrsFirst: 9,
    nrsLast: 10,
    label: '견디기 힘들어요',
    description: '잠도 못 자고 아무것도 못 하겠어요',
  },
} as const;

/** 통증 단계와 함께 쓰는 화면 문구 (res/values/strings.xml 원문) */
export const severityStrings = {
  /** `NRS %1$d–%2$d` — 구분자는 en dash(U+2013)다. 하이픈이 아니다 */
  nrs: (first: number, last: number) => `NRS ${first}–${last}`,
  /** `%1$d단계, %2$s` — 스크린리더용 */
  contentDescription: (level: number, label: string) => `${level}단계, ${label}`,
  scaleLow: '가벼운 불편',
  scaleHigh: '매우 심함',
} as const;

/**
 * Kotlin 의 `ofLevel()` 은 1~5 밖이면 예외를 던진다. 웹에서는 예외 대신
 * 폴백을 두는 편이 낫다 — 상위에서 검증하고 여기서는 조용히 1로 내린다.
 */
export function severityOf(level: number) {
  const n = Math.round(level);
  return severity[(n >= 1 && n <= 5 ? n : 1) as SeverityLevel];
}

/* ===========================================================================
   타입
   =========================================================================== */

/** MedicalMateColors.kt 의 41개 필드와 1:1 */
export type MedicalMateColors = typeof light;
export type ColorToken = keyof MedicalMateColors;
export type ThemeMode = keyof typeof colors;
export type TypographyToken = keyof typeof typography;
export type SpaceToken = keyof typeof space;
export type SizeToken = keyof typeof size;
export type RadiusToken = keyof typeof radius;
export type ElevationToken = 'card' | 'float' | 'sheet';
export type Severity = (typeof severity)[SeverityLevel];
export type BrandColorToken = keyof typeof brandColors;

/** 전부 한 덩어리로 받고 싶을 때 */
export const tokens = {
  palette,
  colors,
  brandColors,
  platformColors,
  fontFamily,
  fontWeight,
  typography,
  space,
  size,
  layout,
  chrome,
  radius,
  elevation,
  shadowTint,
  glass,
  borderWidth,
  scrim,
  loading,
  icon,
  severity,
  severityStrings,
} as const;

export default tokens;
