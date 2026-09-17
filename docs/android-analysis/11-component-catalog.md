# 디자인 시스템 컴포넌트 58종 → 웹 매핑

## 웹앱 구현 메모

- **모바일 폭 고정은 하지 않는다.** 안드로이드 원본이 `screenWidth 360`을 "레이아웃을 고정하지 않는다"고 못박았다(`Dimens.kt`). 웹도 `max-width: 480px` 정도의 중앙 정렬 컨테이너에 좌우 거터 20px을 고정하고 콘텐츠는 `width: 100%`로 흘린다.
- **그림자는 웹이 더 정확하다.** `Elevation.kt`가 "Compose로 Figma 2단 그림자를 그대로 옮길 수 없다"고 적었지만 CSS `box-shadow`는 2단·음수 offset을 그대로 받는다. Figma 원본 값(`#1B255A14 0 3px 10px` 등)을 그대로 쓰면 안드로이드보다 시안에 가깝다.
- **Glass도 웹이 더 쉽다.** `MedicalMateGlass`가 minSdk 24 때문에 Opaque를 기본으로 내렸는데, 웹은 `backdrop-filter: blur(24px)`가 널리 지원된다. `@supports`로 감싸고 미지원 시 불투명 폴백을 둔다.
- **제스처 두 개만 대체가 필요하다.** BottomSheet 끌어내리기와 Severity Slider drag다. 시트는 `<dialog>` + 스크림 클릭 + ESC로, 슬라이더는 `<input type="range">` + pointer 이벤트로 옮긴다.
- **애니메이션은 두 곳뿐이다.** OnboardingProgress의 점→pill(`animateDpAsState`)과 Slider 스냅이다. 나머지는 정지 상태다(Loading Skeleton도 반짝임을 일부러 뺐다). `prefers-reduced-motion`으로 끈다.

---

## 0. 이 문서 읽는 법

- 원본: `C:/Claude/MedicalMate/app/src/main/java/com/mist/medicalmate/core/designsystem/component/` 54개 컴포저블 + `MedicalMateLogo` 2종 + 토큰 파일.
- Figma 노드 id는 `COMPONENT_MAP.md`(파일 키 `cG6lz8nwzp75bfAXCnMqxx`)에서 가져왔다. 노드 URL은 `https://www.figma.com/design/cG6lz8nwzp75bfAXCnMqxx/AX-해커톤?node-id=<콜론을 하이픈으로>`.
- 표의 "치수·색"은 Kotlin 소스에 실제로 적힌 값이다. DESIGN.md와 소스가 다르면 **소스를 적고 차이를 명시**했다.
- 코드 스케치는 React + 순수 CSS(클래스 접두사 `mm-`)다. 토큰은 전부 CSS 변수로 뽑아 쓴다.
- **"쓰이는 화면"은 소스 `grep` 결과다.** 영역 이름은 파일 경로(`app/src/main/java/com/mist/medicalmate/<영역>/ui/`)를 따른다 — 화면 이름이 아니라 경로가 기준이다. 호출처가 없으면 `—`로 적었고 §8.1에 모아 뒀다.
- **KDoc 주석과 실제 코드가 어긋나는 자리가 몇 군데 있다**(IconButton hit area, Fab 그림자, DateCell compact). 그때는 **코드를 적고 주석이 낡았다고 명시**했다.
- 앞선 판이 소스와 어긋났던 24곳은 **§8.2 대조표**에 남겼다.

---

## 1. 토큰 레이어 — 컴포넌트보다 먼저 옮긴다

58종 전부가 이 변수만 참조한다. 이 블록을 `tokens.css`로 먼저 깔아야 아래 컴포넌트가 전부 동작한다.

### 1.1 색 — Palette 43 (원시, 화면에서 직접 쓰지 않는다)

```css
:root {
  /* primary */
  --p-50:#F2F4FE; --p-100:#E3E7FC; --p-200:#C7CFF8; --p-300:#A3AFF1; --p-400:#7484E3;
  --p-500:#5566D2; --p-600:#3B4FC0; --p-700:#2E3E9E; --p-800:#242F79; --p-900:#1A2154;
  /* neutral */
  --n-0:#FFFFFF; --n-25:#FAFBFD; --n-50:#F5F6FA; --n-100:#EDEFF5; --n-200:#DEE1EB;
  --n-300:#C6CAD8; --n-400:#989EB1; --n-500:#7C8397; --n-600:#585F73; --n-700:#3A4053; --n-900:#131722;
  /* status */
  --amber-50:#FFF4D6; --amber-100:#FFE9B3; --amber-500:#E0A227; --amber-700:#8A5A0B;
  --green-50:#E4F7ED; --green-100:#C6F0DC; --green-500:#12A05F; --green-700:#0E7A4A;
  --red-50:#FFEDEB;   --red-100:#FFD8D4;   --red-500:#E5504A;   --red-700:#C4302B;
  /* severity 1~5 + tint */
  --sev-1:#FFE3A8; --sev-2:#FFC79B; --sev-3:#FFA894; --sev-4:#F58079; --sev-5:#DC5A55;
  --sev-1-tint:#FFF6E4; --sev-2-tint:#FFEFE4; --sev-3-tint:#FFE9E3; --sev-4-tint:#FDE4E2; --sev-5-tint:#F9DEDD;
}
```

### 1.2 색 — Semantic (화면에서 쓰는 것은 이것뿐)

Kotlin 프로퍼티 이름(`MedicalMateColors.kt`)과 1:1로 맞춰 둔다. 포팅할 때 이름 검색이 바로 된다.

| Kotlin | CSS 변수 | 값 | 쓰임 |
|---|---|---|---|
| `bgCanvas` | `--bg-canvas` | `#F5F6FA` | 화면 바탕 |
| `bgSurface` | `--bg-surface` | `#FFFFFF` | 카드 · 시트 |
| `bgSubtle` | `--bg-subtle` | `#EDEFF5` | 입력 필드 · 보조 블록 |
| `bgPrimary` | `--bg-primary` | `#5566D2` | 주 버튼 |
| `bgPrimaryPressed` | `--bg-primary-pressed` | `#3B4FC0` | 눌림 |
| `bgPrimarySubtle` | `--bg-primary-subtle` | `#E3E7FC` | Callout · 환자 발화 |
| `bgPrimaryFaint` | `--bg-primary-faint` | `#F2F4FE` | Notice/Info · 일정 카드 |
| `bgInfo` | `--bg-info` | `#F2F4FE` | Notice Info 면 |
| `bgSuccess` | `--bg-success` | `#E4F7ED` | |
| `bgWarning` | `--bg-warning` | `#FFF4D6` | 알러지 경고 |
| `bgDanger` | `--bg-danger` | `#FFEDEB` | 삭제 · 오류 필드 |
| `bgInverse` | `--bg-inverse` | `#131722` | Toast |
| `bgInverseSoft` | `--bg-inverse-soft` | `#3A4053` | Tooltip Bubble |
| `bgScrim` | `--bg-scrim` | `#131722` | 오버레이 (alpha 0.5) |
| `fgDefault` | `--fg-default` | `#131722` | 본문 |
| `fgSubtle` | `--fg-subtle` | `#585F73` | 보조 · **플레이스홀더** |
| `fgMuted` | `--fg-muted` | `#7C8397` | **본문 금지** (3.78:1) |
| `fgDisabled` | `--fg-disabled` | `#C6CAD8` | |
| `fgOnPrimary` | `--fg-on-primary` | `#FFFFFF` | |
| `fgOnInverse` | `--fg-on-inverse` | `#FFFFFF` | |
| `fgPrimary` · `fgLink` · `fgInfo` | `--fg-primary` `--fg-link` `--fg-info` | `#2E3E9E` | |
| `fgSuccess` | `--fg-success` | `#0E7A4A` | |
| `fgWarning` | `--fg-warning` | `#8A5A0B` | |
| `fgDanger` | `--fg-danger` | `#C4302B` | |
| `borderSubtle` | `--border-subtle` | `#DEE1EB` | 목록 구분선 |
| `borderDefault` | `--border-default` | `#C6CAD8` | |
| `borderStrong` | `--border-strong` | `#7C8397` | 빈 입력 테두리 · 편집 밑줄 |
| `borderFocus` · `borderPrimary` | `--border-focus` `--border-primary` | `#5566D2` | 포커스 · 선택 |

> **선택 완료된 필드의 테두리는 `--fg-default`다.** PickerField가 이 규칙을 그대로 쓴다(`PickerField.kt`).

### 1.3 타이포 15종 (`Type.kt` 실제 값)

폰트는 Pretendard. Regular 400 / Medium 500 / SemiBold 600 / Bold 700만 쓴다.

| Kotlin | CSS 클래스 | size / weight / line-height / letter-spacing |
|---|---|---|
| `displayM` | `.t-display-m` | 30 / 700 / 40 / −0.02em |
| `headingL` | `.t-heading-l` | 24 / 700 / 34 / −0.02em |
| `headingM` | `.t-heading-m` | 20 / 600 / 28 / −0.015em |
| `headingS` | `.t-heading-s` | 17 / 600 / 24 / −0.01em |
| `bodyL` | `.t-body-l` | 17 / 400 / 26 / 0 |
| `bodyLStrong` | `.t-body-l-strong` | 17 / 600 / 26 / 0 |
| `bodyM` | `.t-body-m` | 15 / 400 / 24 / 0 |
| `bodyMStrong` | `.t-body-m-strong` | 15 / 600 / 24 / 0 |
| `bodyS` | `.t-body-s` | 13 / 400 / 20 / 0 |
| `bodySStrong` | `.t-body-s-strong` | 13 / 600 / 20 / 0 |
| `labelL` | `.t-label-l` | 15 / 600 / 20 / 0 |
| `labelM` | `.t-label-m` | 13 / 600 / 18 / 0 |
| `labelS` | `.t-label-s` | 11 / 500 / 16 / +0.02em |
| `numericL` | `.t-numeric-l` | 24 / 700 / 30 / −0.015em |
| `numericM` | `.t-numeric-m` | 17 / 600 / 22 / −0.01em |

```css
.t-body-l { font: 400 17px/26px Pretendard, -apple-system, system-ui, sans-serif; letter-spacing: 0; }
/* 헤딩만 자간을 조인다. 한글 본문은 자간을 조이면 판독이 떨어진다. */
.t-heading-m { font: 600 20px/28px Pretendard, sans-serif; letter-spacing: -0.015em; }
```

**본문 기본은 `bodyL`(17)이다.** 진료실에서 소리 내어 읽을 문장이라 15로는 부족하다는 것이 원본 판단이다. 웹에서 15로 내리지 않는다.

### 1.4 반경 · 간격 · 치수 · 고도

```css
:root {
  /* radius — MedicalMateRadius.kt */
  --r-xs: 8px;    /* Badge, Checkbox */
  --r-sm: 12px;   /* S Button, 원문 블록, 질문 pill, SelectBar */
  --r-md: 16px;   /* L Button, Notice, 입력 필드, List Row */
  --r-lg: 20px;   /* Card, Callout, HospitalCard, CardPick */
  --r-xl: 24px;   /* Dialog */
  --r-2xl: 28px;  /* Bottom Sheet 상단 */
  --r-full: 999px;/* Chip, Avatar, Icon Button */
  --r-button-m: 14px; /* M Button 전용 — 스케일 밖 값 */
  --r-date-cell: 13px;/* Date Cell 전용 — 스케일 밖 값 */

  /* space — MedicalMateSpace.kt (12개, 임의값 금지) */
  --s-2:2px; --s-4:4px; --s-6:6px; --s-8:8px; --s-10:10px; --s-12:12px;
  --s-14:14px; --s-16:16px; --s-20:20px; --s-24:24px; --s-32:32px; --s-40:40px;

  /* size — MedicalMateSize.kt */
  --touch-min: 48px;
  --icon-sm: 18px; --icon-md: 20px; --icon-lg: 24px;
  --control-sm: 40px; --control-md: 48px; --control-lg: 56px;
  --mic: 88px;
  --screen-w: 360px; --gutter: 20px; --content-w: 320px;
  --safe-bottom: 24px; --nav-h: 56px; --tabbar-h: 79px;

  /* elevation — Figma 원본값 그대로. CSS는 2단 그림자를 지원한다. */
  --e-card:  0 3px 10px rgba(27,37,90,.08), 0 1px 2px rgba(27,37,90,.05);
  --e-float: 0 4px 14px rgba(27,37,90,.09), 0 1px 3px rgba(27,37,90,.06);
  --e-sheet: 0 -4px 24px rgba(27,37,90,.10), 0 0 2px rgba(27,37,90,.05);

  /* glass */
  --glass-blur: 24px;
  --glass-cta: .78; --glass-nav: .82; --glass-tab: .86;
}
```

> **테두리 대신 고도로 위계를 만든다.** 선은 목록 구분 · 선택 · 포커스 · 접근성 경계에만 쓴다. 웹에서 습관적으로 `border: 1px solid #eee`를 붙이지 않는다.

### 1.5 화면 셸

```css
.mm-app {            /* 모든 화면의 바깥 */
  max-width: 480px; margin-inline: auto; min-height: 100dvh;
  background: var(--bg-canvas); color: var(--fg-default);
}
.mm-content { padding-inline: var(--gutter); }  /* 콘텐츠 폭 = 화면 − 40 */
```

---

## 2. 액션 계열

### 2.1 `MedicalMateButton` — Figma `291:670`

`component/Button.kt`

**변이·상태**

| 축 | 값 |
|---|---|
| `type` | `PRIMARY` `TONAL` `OUTLINE` `GHOST` `DANGER` |
| `size` | `L`(56) `M`(48) `S`(40) |
| 상태 | Default / Pressed / Disabled — **파라미터로 받지 않는다.** `enabled`와 press interaction이 결정한다 |

**파라미터 → TypeScript**

```ts
interface MMButtonProps {
  onClick: () => void;
  label: string;                        // 라벨은 필수. 아이콘만 쓰는 자리는 IconButton
  type?: 'primary'|'tonal'|'outline'|'ghost'|'danger';  // 기본 primary
  size?: 'l'|'m'|'s';                   // 기본 l
  enabled?: boolean;                    // 기본 true
  leadingIcon?: string;                 // 아이콘 이름. contentDescription 주지 않는다
  trailingIcon?: string;
}
```

**치수 · 색**

| size | 높이 | radius | 라벨 | 아이콘 |
|---|---|---|---|---|
| L | `--control-lg` 56 | `--r-md` 16 | `labelL` 15/600 | 20 |
| M | `--control-md` 48 | `--r-button-m` 14 | `labelM` 13/600 | 20 |
| S | `--control-sm` 40 | `--r-sm` 12 | `labelM` 13/600 | 18 |

좌우 여백 20 고정, 아이콘·라벨 간격 6, 가운데 정렬.

| type | container | content | border |
|---|---|---|---|
| PRIMARY | `--bg-primary` (pressed `--bg-primary-pressed`) | `--fg-on-primary` | 없음 |
| TONAL | `--bg-primary-subtle` | `--fg-primary` | 없음 |
| OUTLINE | transparent | `--fg-default` | 1px `--border-default` |
| GHOST | transparent | **`--fg-subtle`** | 없음 |
| DANGER | `--bg-danger` | `--fg-danger` | 없음 |
| disabled (채움 계열 = PRIMARY · TONAL) | `--bg-subtle` | `--fg-disabled` | — |
| disabled (Outline) | transparent | `--fg-disabled` | 1px `--border-subtle` |
| disabled (GHOST · DANGER) | **transparent** | `--fg-disabled` | 없음 |

> `buttonColors()`의 `filled` 판정이 `PRIMARY || TONAL`이다. **DANGER는 disabled에서 danger 면을 잃고 완전히 투명해진다** — 웹 CSS에서 `.mm-btn--danger:disabled`에 배경을 남기면 안드로이드와 갈린다.

> Ghost의 글자색이 `--fg-subtle`인 이유가 코드 주석에 있다. 브랜드색으로 두면 링크와 구별되지 않는다. 웹에서 "ghost는 브랜드색"이라는 관습을 따르지 않는다.
> DANGER는 채움이 아니다. `red/500`급 시맨틱 토큰이 없고, 파괴 동작의 최종 확인은 Dialog가 맡기 때문이다.

**쓰이는 화면** — `calendar` `card` `home` `intake` `profile` `visit` 전 영역. 사실상 모든 화면.

**웹 구현**

```tsx
export function MMButton({
  label, onClick, type = 'primary', size = 'l',
  enabled = true, leadingIcon, trailingIcon,
}: MMButtonProps) {
  return (
    <button
      className={`mm-btn mm-btn--${type} mm-btn--${size}`}
      onClick={onClick}
      disabled={!enabled}
      type="button"
    >
      {leadingIcon && <Icon name={leadingIcon} className="mm-btn__icon" aria-hidden />}
      <span className="mm-btn__label">{label}</span>
      {trailingIcon && <Icon name={trailingIcon} className="mm-btn__icon" aria-hidden />}
    </button>
  );
}
```

```css
.mm-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: var(--s-6);
  padding-inline: var(--s-20); border: 0; cursor: pointer;
  width: 100%;                      /* 호출부에서 auto로 되돌린다 (Compose는 modifier가 결정) */
  font-family: Pretendard, system-ui, sans-serif;
}
.mm-btn--l { min-height: var(--control-lg); border-radius: var(--r-md);
             font: 600 15px/20px inherit; }
.mm-btn--m { min-height: var(--control-md); border-radius: var(--r-button-m);
             font: 600 13px/18px inherit; }
.mm-btn--s { min-height: var(--control-sm); border-radius: var(--r-sm);
             font: 600 13px/18px inherit; }
.mm-btn__icon { width: 20px; height: 20px; }
.mm-btn--s .mm-btn__icon { width: 18px; height: 18px; }

.mm-btn--primary { background: var(--bg-primary); color: var(--fg-on-primary); }
.mm-btn--primary:active:not(:disabled) { background: var(--bg-primary-pressed); }
.mm-btn--tonal   { background: var(--bg-primary-subtle); color: var(--fg-primary); }
.mm-btn--outline { background: transparent; color: var(--fg-default);
                   box-shadow: inset 0 0 0 1px var(--border-default); }
.mm-btn--ghost   { background: transparent; color: var(--fg-subtle); }
.mm-btn--danger  { background: var(--bg-danger); color: var(--fg-danger); }

.mm-btn:disabled { color: var(--fg-disabled); cursor: default; }
.mm-btn--primary:disabled, .mm-btn--tonal:disabled { background: var(--bg-subtle); }
.mm-btn--outline:disabled { box-shadow: inset 0 0 0 1px var(--border-subtle); }
.mm-btn--ghost:disabled, .mm-btn--danger:disabled { background: transparent; } /* 소스와 동일 */
.mm-btn:focus-visible { outline: 2px solid var(--border-focus); outline-offset: 2px; }
```

**두 개 나란히 둘 때** — 왼쪽 Outline, 오른쪽 Primary. `BottomSheet.kt`의 `SheetActions(NEUTRAL)`이 이 규칙을 쓴다.
**`Dialog.kt`는 이 규칙을 쓰지 않는다** — 왼쪽 **Tonal/M**, 오른쪽 **Danger/M**이다(§4.5). 문서 이전 판이 Dialog도 같은 규칙이라고 적었으나 소스가 다르다.

---

### 2.2 `MedicalMateIconButton` — Figma `298:715`

`component/IconButton.kt`

**모든 삭제 × 는 이 컴포넌트를 쓴다.** 상자를 직접 만들지 않는다.

| `style` | container | content |
|---|---|---|
| `GHOST` | transparent | `--fg-default` |
| `TONAL` | `--bg-primary-subtle` | `--fg-primary` |
| `SOLID` | `--bg-primary` | `--fg-on-primary` |
| `OUTLINE` | transparent + 1px `--border-default` | `--fg-default` |

| `size` | 시각 상자 | 아이콘 | hit area |
|---|---|---|---|
| `L` | 48 | 24 | 48 |
| `M` | 40 | 20 | 48 (자리만) |
| `S` | 32 | 18 | 48 (자리만) |

> **소스 실제 동작 — 웹이 더 낫게 만들 수 있는 지점.** KDoc은 "시각 상자가 48보다 작아도 hit area는 48을 유지한다"고 적었지만, 실제 코드는 바깥 `Box`에 `sizeIn(min 48)`으로 **자리만 확보**하고 `onClick`은 그 안의 `Surface(Modifier.size(size.box))`에 걸려 있다. 즉 M(40)·S(32)의 **실제 클릭 영역은 시각 상자 크기 그대로**다. 웹의 `::after` 확장은 진짜 48을 만들므로 안드로이드보다 접근성이 좋아진다. 아래 CSS를 그대로 쓴다.

**disabled 규칙이 Button과 다르다** — `iconButtonColors()`의 채움 판정이 `SOLID` 하나뿐이다.

| style | disabled container |
|---|---|
| `SOLID` | `--bg-subtle` |
| `GHOST` · **`TONAL`** · `OUTLINE` | transparent (OUTLINE만 1px `--border-subtle`) |

Button은 `TONAL`도 disabled에서 `bg/subtle`을 갖는데 IconButton의 `TONAL`은 투명해진다. 두 컴포넌트를 같은 CSS로 묶지 않는다.

**× 배치 기준** (DESIGN.md 6.2 — 크기 차이가 곧 위계)

| 위치 | Size |
|---|---|
| Nav Bar 닫기 · 검색 필드 지우기 · 진료 전 할 일 × | **L** (48/24) |
| 브리핑 카드 KV 행 × · 질문 pill × · 진료 후 기록 KV 행 × | **S** (32/18) |

```ts
interface MMIconButtonProps {
  onClick: () => void;
  icon: string;
  contentDescription: string;   // 필수. 기본값을 두지 않는다 (빠뜨리기 쉬워서)
  style?: 'ghost'|'tonal'|'solid'|'outline';
  size?: 'l'|'m'|'s';
  enabled?: boolean;
}
```

```tsx
export function MMIconButton({ icon, contentDescription, onClick,
  style = 'ghost', size = 'l', enabled = true }: MMIconButtonProps) {
  return (
    <button type="button" onClick={onClick} disabled={!enabled}
      aria-label={contentDescription}
      className={`mm-iconbtn mm-iconbtn--${style} mm-iconbtn--${size}`}>
      <Icon name={icon} aria-hidden />
    </button>
  );
}
```

```css
.mm-iconbtn {
  position: relative; display: inline-grid; place-items: center;
  border: 0; border-radius: var(--r-full); background: transparent; cursor: pointer;
}
/* hit area 48 — 시각 크기와 분리한다 */
.mm-iconbtn::after {
  content: ''; position: absolute; inset: 50% auto auto 50%;
  width: var(--touch-min); height: var(--touch-min); transform: translate(-50%, -50%);
}
.mm-iconbtn--l { width: 48px; height: 48px; }
.mm-iconbtn--m { width: 40px; height: 40px; }
.mm-iconbtn--s { width: 32px; height: 32px; }
.mm-iconbtn--l svg { width: 24px; height: 24px; }
.mm-iconbtn--m svg { width: 20px; height: 20px; }
.mm-iconbtn--s svg { width: 18px; height: 18px; }

.mm-iconbtn--ghost   { color: var(--fg-default); }
.mm-iconbtn--tonal   { background: var(--bg-primary-subtle); color: var(--fg-primary); }
.mm-iconbtn--solid   { background: var(--bg-primary); color: var(--fg-on-primary); }
.mm-iconbtn--outline { color: var(--fg-default); box-shadow: inset 0 0 0 1px var(--border-default); }
.mm-iconbtn:disabled { color: var(--fg-disabled); }
.mm-iconbtn--solid:disabled { background: var(--bg-subtle); }
/* TONAL은 disabled에서 면을 잃는다 — Button의 TONAL과 다르다 */
.mm-iconbtn--tonal:disabled { background: transparent; }
.mm-iconbtn--outline:disabled { box-shadow: inset 0 0 0 1px var(--border-subtle); }
```

**아이콘 46종** — 24 격자 · 라이브 20 · 획 **1.75** · 라운드 캡/조인 · 단일 색. 16 이하로 줄이지 않는다.
`chevron-left/right/up/down` `arrow-right` `arrow-up` / `plus` `minus` `close` `check` `edit` `trash` `copy` `share` `search` `more-horizontal` / `check-circle` `alert-circle` `alert-triangle` `info` `lock` `spinner` / `home` `home-filled` `note` `note-filled` `calendar` `calendar-filled` `user` `user-filled` / `mic` `mic-listening` `mic-off` `waveform` / `hospital` `stethoscope` `pill` `heart-pulse` `body-point` / `bell` `chat` `clock` `camera` `empty-box` `search-off` `wifi-off`.

웹에서는 SVG 스프라이트 하나로 묶고 `stroke-width: 1.75; stroke-linecap: round; stroke-linejoin: round; fill: none; stroke: currentColor`를 공통으로 건다. 채움형(`*-filled`)은 탭 활성 전용이다.

---

### 2.3 `MedicalMateCard` — Figma `293:656`

`component/Card.kt`

| `emphasis` | 면 | 그림자 |
|---|---|---|
| `DEFAULT` | `--bg-surface` | **`--e-card`** |
| `BRAND` | `--bg-primary-faint` | 없음 |
| `QUIET` | `--bg-subtle` | 없음 |

radius `--r-lg` 20 · 안쪽 여백 20 · 자식 간격 6 · **최소 높이 116** · 폭 100%.
`onClick`을 주면 누를 수 있는 카드가 된다. **들어갈 상세가 있을 때만 준다.**

> 큰 유색 면은 환자 콘텐츠에만 쓴다(P5). 시스템 안내나 목록 배경으로 `BRAND`를 쓰지 않는다.

**쓰이는 화면** — `calendar` `card` `home` `profile` `visit`.

```tsx
export function MMCard({ emphasis = 'default', onClick, children }: {
  emphasis?: 'default'|'brand'|'quiet'; onClick?: () => void; children: React.ReactNode;
}) {
  const cls = `mm-card mm-card--${emphasis}`;
  return onClick
    ? <button type="button" className={cls} onClick={onClick}>{children}</button>
    : <div className={cls}>{children}</div>;
}
```

```css
.mm-card {
  display: flex; flex-direction: column; gap: var(--s-6);
  width: 100%; min-height: 116px; padding: var(--s-20);
  border: 0; border-radius: var(--r-lg); text-align: left;
  color: var(--fg-default);
}
.mm-card--default { background: var(--bg-surface); box-shadow: var(--e-card); }
.mm-card--brand   { background: var(--bg-primary-faint); }
.mm-card--quiet   { background: var(--bg-subtle); }
button.mm-card { cursor: pointer; }
```

---

### 2.4 `MedicalMateChip` — Figma `311:823`

`component/Chip.kt`

짧은 증상과 부위를 고르는 자리. **6개를 넘으면 칩 대신 세로 목록을 검토한다.**

| 상태 | container | content | border |
|---|---|---|---|
| default | `--bg-surface` | `--fg-default` | **1px** `--border-default` |
| selected | `--bg-primary-subtle` | `--fg-primary` | **1.5px** `--border-primary` |
| disabled | `--bg-subtle` | `--fg-disabled` | 없음 |

높이 min 40(`--control-sm`) · radius full · **min-width 64** · 좌우 여백 16 · 라벨 `labelM`.

> **소스 vs 주석 차이(웹 구현 시 결정 필요)** — KDoc은 "tint 면 · 1.5dp 브랜드 경계 · check 아이콘 **세 가지**를 함께 쓴다"고 적었지만, 실제 `Chip.kt`의 `Row`에는 `Text`만 있고 **check 아이콘을 그리지 않는다.** 웹에서는 D11(색만으로 구분하지 않는다)을 지키려면 아이콘을 넣는 쪽이 맞고, 안드로이드와 화면을 맞추려면 빼는 쪽이 맞다. 아래 스케치는 소스대로 아이콘 없이 두고 자리만 열어 뒀다.
> `min-width: 64px`의 이유도 주석에 있다. "전신"처럼 두 글자짜리를 여러 개 늘어놓으면 폭이 들쭉날쭉해진다.
> Figma의 `State=Pressed`는 파라미터로 받지 않는다. 대응하는 색 토큰이 없어 press indication에 맡긴다.

**쓰이는 화면** — `intake` `profile` `visit`.

```tsx
export function MMChip({ label, selected, onClick, enabled = true }: {
  label: string; selected: boolean; onClick: () => void; enabled?: boolean;
}) {
  return (
    <button type="button" role="option" aria-selected={selected}
      disabled={!enabled} onClick={onClick}
      className={`mm-chip${selected ? ' is-selected' : ''}`}>
      {label}
    </button>
  );
}
```

```css
.mm-chip {
  display: inline-flex; align-items: center; justify-content: center;
  min-height: var(--control-sm); min-width: 64px; padding-inline: var(--s-16);
  border-radius: var(--r-full); font: 600 13px/18px Pretendard, sans-serif; cursor: pointer;
  background: var(--bg-surface); color: var(--fg-default);
  border: 1px solid var(--border-default);
}
.mm-chip.is-selected {
  background: var(--bg-primary-subtle); color: var(--fg-primary);
  border: 1.5px solid var(--border-primary);
}
.mm-chip:disabled { background: var(--bg-subtle); color: var(--fg-disabled); border-color: transparent; }
```

---

### 2.5 `MedicalMateBadge` — Figma `311:834`

`component/Badge.kt`

**누를 수 없다.** 누르는 선택지는 Chip이다. pill을 쓰지 않고 radius 8을 쓰는 것도 Chip과 구분하려는 것이다.

| `tone` | container | content |
|---|---|---|
| `BRAND` | `--bg-primary-subtle` | `--fg-primary` |
| `NEUTRAL`(기본) | `--bg-subtle` | `--fg-subtle` |
| `SUCCESS` | `--bg-success` | `--fg-success` |
| `WARNING` | `--bg-warning` | `--fg-warning` |
| `DANGER` | `--bg-danger` | `--fg-danger` |

radius `--r-xs` 8 · **min-height 26** · 좌우 여백 8 · `labelS` 11/500/+2%.

**쓰이는 화면** — `card` (브리핑 카드). `ListRow` · `SourceQuote` · `DoctorCard`가 내부에서 조립해 쓴다.

```tsx
export const MMBadge = ({ label, tone = 'neutral' }: { label: string; tone?: BadgeTone }) =>
  <span className={`mm-badge mm-badge--${tone}`}>{label}</span>;
```

```css
.mm-badge {
  display: inline-flex; align-items: center; min-height: 26px;
  padding-inline: var(--s-8); border-radius: var(--r-xs);
  font: 500 11px/16px Pretendard, sans-serif; letter-spacing: .02em;
}
.mm-badge--brand   { background: var(--bg-primary-subtle); color: var(--fg-primary); }
.mm-badge--neutral { background: var(--bg-subtle);         color: var(--fg-subtle); }
.mm-badge--success { background: var(--bg-success);        color: var(--fg-success); }
.mm-badge--warning { background: var(--bg-warning);        color: var(--fg-warning); }
.mm-badge--danger  { background: var(--bg-danger);         color: var(--fg-danger); }
```

---

### 2.6 `MedicalMateAddRow` 🆕 — Figma `1129:9199` (320×48)

`component/AddRow.kt`

목록 끝에 붙어 항목을 하나 더 만드는 줄. **테두리도 면색도 없다.** 새 입력 필드를 띄우는 대신 목록에 빈 항목이 하나 생기는 것이 이 앱의 추가 방식이라, 이 줄은 버튼처럼 보이지 않아야 한다.

- 높이 min 48 (= 터치 하한). 글꼴 배율이 커지면 늘어난다.
- `plus` 아이콘 **18** (`--icon-sm`), 색 `--fg-primary`. 간격 8.
- 라벨 `bodyLStrong` 17/600, 색 `--fg-primary`.

> 아이콘 18은 마스터 값이다. DESIGN.md의 인라인 규칙(`Body/L` 17 옆에 20)과 어긋나지만 Figma가 정본이라 마스터를 따랐다고 소스에 적혀 있다.

**쓰이는 화면** — `calendar`(일정 추가의 할 일 목록), `Callout` 편집 모드 내부.

```css
.mm-addrow {
  display: flex; align-items: center; gap: var(--s-8);
  width: 100%; min-height: var(--touch-min);
  background: none; border: 0; cursor: pointer;
  color: var(--fg-primary); font: 600 17px/26px Pretendard, sans-serif;
}
.mm-addrow svg { width: 18px; height: 18px; }
```

---

### 2.7 `MedicalMateFab` — Figma의 `FAB`

`component/Fab.kt`

48 원형(`--control-md`) · `--bg-primary` 채움 · `--fg-on-primary` 아이콘 24(`--icon-lg`) · 그림자.
`IconButton`의 `SOLID`와 크기·색이 같지만 **그림자가 있다.** 본문 위에 떠서 글을 가리므로 층을 알린다.

파라미터는 `onClick` · `icon` · `contentDescription`(필수) 셋뿐이다. **style/size/enabled가 없다.**

> **그림자 값 주의.** 소스의 `FabElevation = 6.dp`는 `MedicalMateElevation.card`(3)나 `float`(4) 어느 쪽과도 다른 **파일 지역 상수**다. `Fab.kt`의 KDoc은 "`Elevation/Card`와 같은 값을 쓴다"고 적었지만 코드는 6이라 **주석과 코드가 어긋나 있다.** 웹에서는 `--e-float`를 쓰는 쪽을 권장하되(시안에 FAB 전용 고도가 없다), 안드로이드와 정확히 맞춰야 하면 별도 값으로 뺀다.
> 같은 KDoc의 "`SOLID`와 크기·색이 같지만 **그림자가 없다**"도 소스의 오타다. 그림자가 있는 쪽이 FAB다.

**쓰이는 화면** — `CalendarMonthScreen.kt`(`calendar`, 일정 추가), `VisitNoteScreen.kt`(`visit`, 마이크). preview의 contentDescription은 `"음성으로 적기"`이고 **실제 화면 문구는 호출부가 정한다.**

```css
.mm-fab {
  width: 48px; height: 48px; border-radius: var(--r-full); border: 0;
  display: grid; place-items: center; cursor: pointer;
  background: var(--bg-primary); color: var(--fg-on-primary); box-shadow: var(--e-float);
}
.mm-fab svg { width: 24px; height: 24px; }
```

---
## 3. 입력 계열

### 3.1 `MedicalMateTextField` — Figma `295:692` (v2)

`component/TextFields.kt`

**상태를 파라미터로 받지 않는다.** Focus는 포커스가, Filled는 `value`가, Disabled는 `enabled`가, Error는 `errorText`가 결정한다.

**상태 우선순위** (소스의 `fieldStyle`): `disabled > error > focus > filled > default`. 오류가 난 칸에 포커스가 있으면 오류를 먼저 보여준다.

| 상태 | container | border |
|---|---|---|
| Default (빈 칸) | `--bg-subtle` | **없음** |
| Focus | `--bg-surface` | **2px** `--border-focus` |
| Filled | `--bg-surface` | 1px `--border-default` |
| Error | `--bg-danger` | **2px** `--fg-danger` |
| Disabled | `--bg-subtle` | 없음 |

```ts
interface MMTextFieldProps {
  value: string;
  onValueChange: (v: string) => void;
  label?: string;          // bodyS 13, fg/subtle (disabled면 fg/disabled)
  placeholder?: string;    // bodyL 17, fg/subtle — fg/muted 금지
  helperText?: string;
  errorText?: string;      // 있으면 helperText를 대신한다. 둘을 함께 보여주지 않는다
  enabled?: boolean;
  keyboardType?: 'text'|'number'|'phone'|'email';
  onSend?: () => void;     // 주면 엔터가 '보내기'가 된다
  trailing?: React.ReactNode; // Figma의 Actions 슬롯 — 필드 안쪽 끝에 붙는다
}
```

라벨 색은 `enabled`를 따라간다 — 켜짐 `--fg-subtle`, 꺼짐 `--fg-disabled`. 보조 문구(`helperText`/`errorText`)는 `enabled`와 무관하다.

**치수** — 높이 min 56(`--control-lg`) · radius `--r-md` 16 · 라벨↔필드 간격 6.
안쪽 여백: 왼쪽 20, 오른쪽 **trailing 없으면 20 / 있으면 4**, 위아래 4(48 버튼이 56 필드 안에 들어가고 남는 자리).
본문 `bodyL` 17, 커서 색 `--border-focus`.

> radius 16의 이유 — "56 높이 입력 = 16 · 그 안 48 버튼 = 12"라는 동심원 규칙이다. 바깥에서 여백만큼 뺀 값이 안쪽 반경이 된다.
> `errorText`는 무엇이 잘못됐는지가 아니라 **어떻게 고치는지**를 적는다.
> `onSend`는 적을 것이 없을 때도 자리를 지킨다. 적는 동안 IME 동작이 바뀌면 키보드가 다시 뜨고 한글 조합이 끊긴다. → **웹에서도 같은 함정이 있다.** `enterkeyhint`를 값에 따라 토글하지 말고 고정한다.

**쓰이는 화면** — `intake` `profile`.

```tsx
export function MMTextField(p: MMTextFieldProps) {
  const state = !p.enabled ? 'disabled'
    : p.errorText ? 'error'
    : p.value ? 'filled' : 'default';
  const support = p.errorText ?? p.helperText;
  return (
    <div className="mm-field">
      {p.label && <label className="mm-field__label">{p.label}</label>}
      <div className={`mm-field__box mm-field__box--${state}${p.trailing ? ' has-trailing' : ''}`}>
        <input
          className="mm-field__input"
          value={p.value}
          onChange={(e) => p.onValueChange(e.target.value)}
          placeholder={p.placeholder}
          disabled={p.enabled === false}
          enterKeyHint={p.onSend ? 'send' : undefined}   /* 값에 따라 바꾸지 않는다 */
          onKeyDown={(e) => { if (e.key === 'Enter' && p.onSend) p.onSend(); }}
          aria-invalid={!!p.errorText}
        />
        {p.trailing}
      </div>
      {support && (
        <p className={`mm-field__support${p.errorText ? ' is-error' : ''}`}>{support}</p>
      )}
    </div>
  );
}
```

```css
.mm-field { display: flex; flex-direction: column; gap: var(--s-6); width: 100%; }
.mm-field__label   { font: 400 13px/20px Pretendard, sans-serif; color: var(--fg-subtle); }
.mm-field--disabled .mm-field__label { color: var(--fg-disabled); }
.mm-field__support { font: 400 13px/20px Pretendard, sans-serif; color: var(--fg-subtle); margin: 0; }
.mm-field__support.is-error { color: var(--fg-danger); }

.mm-field__box {
  display: flex; align-items: center; gap: var(--s-12);
  min-height: var(--control-lg); border-radius: var(--r-md);
  padding: var(--s-4) var(--s-20);
  background: var(--bg-subtle);
}
.mm-field__box.has-trailing { padding-right: var(--s-4); }
.mm-field__box--filled  { background: var(--bg-surface); box-shadow: inset 0 0 0 1px var(--border-default); }
.mm-field__box--focus,
.mm-field__box:focus-within { background: var(--bg-surface); box-shadow: inset 0 0 0 2px var(--border-focus); }
.mm-field__box--error,
.mm-field__box--error:focus-within { background: var(--bg-danger); box-shadow: inset 0 0 0 2px var(--fg-danger); }

.mm-field__input {
  flex: 1; min-width: 0; border: 0; background: none; outline: none;
  font: 400 17px/26px Pretendard, sans-serif; color: var(--fg-default); caret-color: var(--border-focus);
}
.mm-field__input::placeholder { color: var(--fg-subtle); }  /* fg/muted 금지 */
.mm-field__input:disabled { color: var(--fg-disabled); }
```

---

### 3.2 `MedicalMateTextArea` — Figma `334:1102` (v2)

같은 파일. 자유 서술용.

**파라미터는 다섯 개뿐이다** — `value` · `onValueChange` · `placeholder` · `enabled` · `maxLength`.
**`label` · `helperText` · `errorText` · `onSend` · `trailing`이 없다.** TextField의 props를 그대로 물려주면 안 된다.

> **오류 상태가 없다.** 소스가 `fieldStyle(..., hasError = false, ...)`로 고정 호출한다. 위 §3.1의 상태표에서 Error 행은 TextArea에 해당하지 않고, 남는 상태는 **Default / Focus / Filled / Disabled 넷**이다. 한도를 넘겼을 때도 면·테두리는 그대로고 **카운터 글자색만 바뀐다**(아래).
> 본문 정렬이 `Alignment.TopStart`다(한 줄 필드는 `CenterStart`). 웹에서 `align-items: center`를 상속시키지 않는다.

- **최소 높이 120**, 고정 높이를 주지 않는다(글자 확대에서 잘리면 안 됨). → 웹은 `min-height: 120px` + `field-sizing: content` 또는 JS auto-grow.
- 안쪽 여백 좌우 16 / 위아래 14. (한 줄 필드와 다르다 — 첫 줄이 위에 붙어야 해서)
- 본문 `bodyL` 17, placeholder `--fg-subtle`.
- `maxLength`를 주면 아래에 **오른쪽 정렬** 카운터가 붙는다. 문자열은 `"%1$d / %2$d"` (`text_area_counter`).
  - 색: 기본 `--fg-subtle`, **초과 시 `--fg-danger`**, disabled `--fg-disabled`.
  - **넘겨도 입력을 막지 않는다.** 적다가 잘리면 무엇이 사라졌는지 알 수 없어서, 남은 양만 알린다. → 웹에서 `maxlength` 속성을 쓰면 안 된다. 직접 세서 표시만 한다.
- 면·테두리 규칙은 TextField와 **오류를 뺀 나머지**가 동일(`fieldStyle` 공유).

**쓰이는 화면** — `VisitNoteScreen.kt` (`visit`, 진료 후 메모).

```tsx
<div className={`mm-textarea mm-textarea--${state}`}>
  <textarea className="mm-textarea__input" value={value} placeholder={placeholder}
            onChange={(e) => onValueChange(e.target.value)} />
  {maxLength != null && (
    <span className={`mm-textarea__counter${value.length > maxLength ? ' is-over' : ''}`}>
      {value.length} / {maxLength}
    </span>
  )}
</div>
```

```css
.mm-textarea { display: flex; flex-direction: column; gap: var(--s-8);
  width: 100%; min-height: 120px; padding: var(--s-14) var(--s-16);
  border-radius: var(--r-md); background: var(--bg-subtle); }
.mm-textarea__input { border: 0; background: none; outline: none; resize: none;
  font: 400 17px/26px Pretendard, sans-serif; color: var(--fg-default); }
.mm-textarea__counter { align-self: stretch; text-align: right;
  font: 400 13px/20px Pretendard, sans-serif; color: var(--fg-subtle); }
.mm-textarea__counter.is-over { color: var(--fg-danger); }
```

---

### 3.3 `MedicalMatePickerField` 🆕 — Figma `1129:9196` (320×56)

`component/PickerField.kt`

병원 · 날짜 · 시간처럼 **직접 적지 않고 골라 채우는** 필드. 눌러서 시트나 검색 화면을 열고 그 결과가 여기 표시된다. **키보드를 띄우지 않는다.**

| 상태 | 테두리 | 값 글자 |
|---|---|---|
| 비어 있음 | 1px `--border-strong` | placeholder, `--fg-subtle` |
| 채워짐 | **1px `--fg-default`** | `--fg-default` |
| 오류 | 1px `--fg-danger` | — |
| disabled | 1px `--border-subtle` | `--fg-disabled` |

높이 min 56 · radius `--r-md` 16 · 여백 왼쪽 20 · 오른쪽 16 · 글자↔아이콘 간격 10 · 아이콘 **20**(`--icon-md`).
테두리는 채워져도 **굵어지지 않는다**(1px 고정).

```ts
interface MMPickerFieldProps {
  value: string | null;
  placeholder: string;
  onClick: () => void;
  enabled?: boolean;
  trailingIcon?: string;   // 기본 chevron-right. 1r-4가 병원/달력/시계 셋을 다르게 쓴다
  errorText?: string;      // 필수인데 비워 둔 채 넘어가려 할 때
}
```

> **웹 포팅 포인트** — `<button>`으로 만들고 `<input readonly>`를 쓰지 않는다. readonly input은 모바일 사파리에서 키보드를 띄우는 경우가 있다.
> 오른쪽 아이콘은 장식이 아니라 "눌러서 고른다"는 표시다. 어디로 가는지가 아이콘으로 먼저 읽힌다.

**쓰이는 화면** — `ScheduleAddScreen.kt` (`calendar`).

```tsx
export function MMPickerField({ value, placeholder, onClick, enabled = true,
  trailingIcon = 'chevron-right', errorText }: MMPickerFieldProps) {
  const filled = !!value?.trim();
  return (
    <div className="mm-picker">
      <button type="button" onClick={onClick} disabled={!enabled}
        className={`mm-picker__row${filled ? ' is-filled' : ''}${errorText ? ' is-error' : ''}`}>
        <span className="mm-picker__value">{filled ? value : placeholder}</span>
        <Icon name={trailingIcon} aria-hidden />
      </button>
      {errorText && <p className="mm-picker__error">{errorText}</p>}
    </div>
  );
}
```

```css
.mm-picker { display: flex; flex-direction: column; gap: var(--s-8); }
.mm-picker__row {
  display: flex; align-items: center; gap: var(--s-10); width: 100%;
  min-height: var(--control-lg); padding: 0 var(--s-16) 0 var(--s-20);
  border: 1px solid var(--border-strong); border-radius: var(--r-md);
  background: none; cursor: pointer; text-align: left;
}
.mm-picker__row.is-filled { border-color: var(--fg-default); }
.mm-picker__row.is-error  { border-color: var(--fg-danger); }
.mm-picker__row:disabled  { border-color: var(--border-subtle); color: var(--fg-disabled); }
.mm-picker__value { flex: 1; font: 400 17px/26px Pretendard, sans-serif; color: var(--fg-subtle); }
.mm-picker__row.is-filled .mm-picker__value { color: var(--fg-default); }
.mm-picker__row svg { width: 20px; height: 20px; color: var(--fg-default); }
.mm-picker__error { margin: 0; font: 400 13px/20px Pretendard, sans-serif; color: var(--fg-danger); }
```

---

### 3.4 `MedicalMateSearchField` — Figma `590:1307`

`component/SearchField.kt`

**TextField와 달리 테두리가 없다.** 검색은 값을 남기는 입력이 아니라 목록을 좁히는 조작이라, 채워져도 면 색(`--bg-subtle`)만 유지한다.

- 높이 min 56 · radius `--r-md` 16 · 면 `--bg-subtle` 고정.
- 여백 왼쪽 20 / 오른쪽 **4** · 요소 간격 12.
- 왼쪽 `search` 아이콘 20, tint `--fg-subtle`.
- 값이 있으면 오른쪽에 **Ghost / Size L** IconButton(`close`)이 붙는다. 누르면 `onValueChange("")`.
- IME action = Search. `onSearch`를 주지 않으면 키보드 검색 키가 아무 일도 하지 않는다(값이 바뀔 때마다 좁혀지는 화면).

```ts
interface MMSearchFieldProps {
  value: string;
  onValueChange: (v: string) => void;
  placeholder: string;               // 필수
  clearContentDescription: string;   // 필수 — 지우기 버튼 접근성 이름
  onSearch?: () => void;
}
```

**쓰이는 화면** — `HospitalPickScreen.kt`(**`visit`** — `card`가 아니다. 파일 경로가 `visit/ui/`다), `BodyMapPartList.kt`(`intake`).

```tsx
<div className="mm-search">
  <Icon name="search" aria-hidden />
  <input type="search" className="mm-search__input" value={value} placeholder={placeholder}
         enterKeyHint="search"
         onChange={(e) => onValueChange(e.target.value)}
         onKeyDown={(e) => { if (e.key === 'Enter') onSearch?.(); }} />
  {value && (
    <MMIconButton icon="close" size="l" style="ghost"
      contentDescription={clearContentDescription}
      onClick={() => onValueChange('')} />
  )}
</div>
```

```css
.mm-search {
  display: flex; align-items: center; gap: var(--s-12); width: 100%;
  min-height: var(--control-lg); padding: 0 var(--s-4) 0 var(--s-20);
  border-radius: var(--r-md); background: var(--bg-subtle);
}
.mm-search > svg:first-child { width: 20px; height: 20px; color: var(--fg-subtle); flex: none; }
.mm-search__input { flex: 1; min-width: 0; border: 0; background: none; outline: none;
  font: 400 17px/26px Pretendard, sans-serif; color: var(--fg-default); }
.mm-search__input::placeholder { color: var(--fg-subtle); }
.mm-search__input::-webkit-search-cancel-button { display: none; } /* 자체 지우기 버튼을 쓴다 */
```

---

### 3.5 `MedicalMateSegmentedControl` — Figma `334:1150` (v2)

`component/SegmentedControl.kt`

**화면 전체의 뷰를 바꾸는 자리에만 쓴다.** 부분 필터는 Chip이 맡는다. **칸은 2~4개**(넘으면 `require` 예외).

| | 트랙 | 칸(선택) | 칸(비선택) |
|---|---|---|---|
| 면 | `--bg-subtle` | `--bg-surface` | `--bg-subtle` |
| 글자 | — | `--fg-default` · `labelL` 15/600 | `--fg-subtle` · `bodyM` 15/400 |
| 테두리 | — | **1px `--border-strong`** (v2 추가) | 없음 |
| radius | `--r-button-m` 14 | `--r-sm` 12 | — |

트랙 안쪽 여백 4, 칸 사이 간격 4, 칸 높이 min 40(`--control-sm`).

> v2가 테두리를 더한 이유 — 흰 면만으로는 회색 트랙과의 대비가 3:1에 못 미쳐서 고른 칸의 경계가 보이지 않았다.
> **높이를 칸이 든다.** 트랙에 높이를 걸지 않는다(Compose에서 깨졌던 부분이고, 웹에서도 칸에 `min-height`를 주는 쪽이 안전하다).

`selectedIndex`가 범위를 벗어나도 `require` 예외다(`selectedIndex in options.indices`).

**쓰이는 화면** — `BodyMapStep.kt` · `BodyMap3dStep.kt` (`intake`).
**실제 용도는 인체도 앞/뒤 전환이다.** 칸은 `bodyMapViewOptions()`가 주는 **두 개**(`앞` / `뒤`, `body_map_view_front` · `body_map_view_back`)뿐이다. DESIGN.md가 예로 든 "진료 전/후 전환"은 이 컴포넌트를 쓰는 자리가 **아니다**(앱에 그런 화면이 없다). 웹에서도 2칸 기준으로 옮긴다.

```tsx
export function MMSegmented({ options, selectedIndex, onSelect }: {
  options: string[]; selectedIndex: number; onSelect: (i: number) => void;
}) {
  return (
    <div className="mm-seg" role="tablist">
      {options.map((o, i) => (
        <button key={o} role="tab" aria-selected={i === selectedIndex}
          className={`mm-seg__item${i === selectedIndex ? ' is-on' : ''}`}
          onClick={() => onSelect(i)}>{o}</button>
      ))}
    </div>
  );
}
```

```css
.mm-seg { display: flex; gap: var(--s-4); width: 100%; padding: var(--s-4);
  border-radius: var(--r-button-m); background: var(--bg-subtle); }
.mm-seg__item { flex: 1; min-height: var(--control-sm); border: 0; border-radius: var(--r-sm);
  background: var(--bg-subtle); color: var(--fg-subtle); cursor: pointer;
  font: 400 15px/24px Pretendard, sans-serif; }
.mm-seg__item.is-on { background: var(--bg-surface); color: var(--fg-default);
  font-weight: 600; font-size: 15px; line-height: 20px;
  box-shadow: inset 0 0 0 1px var(--border-strong); }
```

---

### 3.6 선택 컨트롤 3종 — `Checkbox` `311:851` · `Radio` `311:858` · `Toggle` `334:1155`

`component/Selection.kt` — 셋 다 **행 전체가 hit area**다. 24 상자만 누를 수 있으면 접근성 기준 48에 못 미치고, 손이 떨리는 환자가 맞추기 어렵다.

공통: 행 높이 min **54** · 좌우 여백 4 · 요소 간격 12 · 라벨 `bodyL` 17.

**Checkbox**

| 상태 | 상자 |
|---|---|
| unchecked | `--bg-surface` + **1.5px** `--border-strong`, radius `--r-xs` 8 |
| checked | `--bg-primary` 채움, 테두리 없음, `check` 아이콘 18 `--fg-on-primary` |
| disabled (unchecked) | `--bg-surface` + 1.5px `--border-subtle`, 라벨 `--fg-disabled` |
| **disabled (checked)** | **면은 채워지지 않는다** — `--bg-surface` + 1.5px `--border-subtle`에 `check` 아이콘만 `--fg-disabled` |

> 채움 조건이 `checked && enabled`다. 웹에서 `:checked:disabled`를 `:checked`와 같게 두면 안드로이드와 갈린다.

상자 24×24. `label`에 `null`을 주면 상자만 그리고 행이 폭을 차지하지 않는다(TodoRow의 편집 모드에서 쓴다).

> 미선택 테두리가 1.5인 이유 — 비텍스트 경계 3:1 대비 기준. `border/default`는 흰 배경에서 미달.

**Radio**

- 상자 24 원형. 미선택 1.5px `--border-strong`, **선택 시 7px ring `--border-primary`**(채움이 아니라 두꺼운 테두리), disabled `--border-subtle`.
- 항목이 5개를 넘으면 세로 카드 목록을 검토한다.

**Toggle**

- 라벨 왼쪽 / 스위치 오른쪽(`space-between`). 스위치 52×32.
- 켜짐: 트랙 `--bg-primary`, 손잡이 `--fg-on-primary`.
- 꺼짐: 트랙·테두리 **`--border-strong`을 면으로**, 손잡이 `--bg-surface`. (옅은 면에 테두리를 두르면 꺼진 것과 비활성이 구분되지 않는다)
- **누르는 즉시 적용되는 설정에만 쓴다.** 저장 버튼이 있는 폼에서는 쓰지 않는다.
- 스위치 자체는 클릭을 받지 않는다(행이 받는다). 웹에서도 `pointer-events: none`을 스위치에 주고 라벨 전체를 `<label>`로 감싼다.

**쓰이는 화면** — Checkbox `RecordList.kt`(`card`) · `TodoRow` 내부, Radio `BodyMapPartList.kt`(`intake`), Toggle `MyProfileScreen.kt`(`profile`). 셋 다 호출처가 한 곳씩뿐이다.

```tsx
export const MMCheckbox = ({ checked, onCheckedChange, label, enabled = true }: {
  checked: boolean; onCheckedChange: (v: boolean) => void; label: string | null; enabled?: boolean;
}) => (
  <label className={`mm-check${label === null ? ' mm-check--boxonly' : ''}`}>
    <input type="checkbox" checked={checked} disabled={!enabled}
           onChange={(e) => onCheckedChange(e.target.checked)} />
    <span className="mm-check__box" aria-hidden><Icon name="check" /></span>
    {label !== null && <span className="mm-check__label">{label}</span>}
  </label>
);
```

```css
.mm-check { display: flex; align-items: center; gap: var(--s-12);
  width: 100%; min-height: 54px; padding-inline: var(--s-4); cursor: pointer; }
.mm-check--boxonly { width: auto; }
.mm-check input { position: absolute; opacity: 0; width: 0; height: 0; }
.mm-check__box { display: grid; place-items: center; width: 24px; height: 24px; flex: none;
  border-radius: var(--r-xs); background: var(--bg-surface);
  box-shadow: inset 0 0 0 1.5px var(--border-strong); }
.mm-check__box svg { width: 18px; height: 18px; opacity: 0; color: var(--fg-on-primary); }
.mm-check input:checked + .mm-check__box { background: var(--bg-primary); box-shadow: none; }
.mm-check input:checked + .mm-check__box svg { opacity: 1; }
/* disabled는 checked여도 채우지 않는다 (소스: checked && enabled) */
.mm-check input:disabled + .mm-check__box { background: var(--bg-surface);
  box-shadow: inset 0 0 0 1.5px var(--border-subtle); }
.mm-check input:disabled + .mm-check__box svg { color: var(--fg-disabled); }
.mm-check__label { font: 400 17px/26px Pretendard, sans-serif; color: var(--fg-default); }
.mm-check input:disabled ~ .mm-check__label { color: var(--fg-disabled); }

.mm-radio__box { width: 24px; height: 24px; border-radius: var(--r-full);
  box-shadow: inset 0 0 0 1.5px var(--border-strong); }
.mm-radio input:checked + .mm-radio__box { box-shadow: inset 0 0 0 7px var(--border-primary); }
```

---

### 3.7 `MedicalMateTodoRow` 🆕 — Figma `1129:9197` (320×54)

`component/TodoRow.kt`

진료 전 할 일 한 줄. **읽기 모드와 편집 모드 두 가지 모양이 한 컴포넌트에 있다.**

```ts
interface MMTodoRowProps {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  label: string;
  enabled?: boolean;
  delete?: { contentDescription: string; onClick: () => void };  // Kotlin은 MedicalMateRowDelete 데이터 클래스. EditingKvRow와 공유한다
  onLabelChange?: (v: string) => void;   // 주면 라벨이 그 자리에서 받는 입력이 된다
  onEditDone?: () => void;               // 키보드 완료 or 포커스 이탈
  labelPlaceholder?: string;             // 기본 ""
}
```

**읽기 모드** (`onLabelChange` 없음) — `MedicalMateCheckbox`를 그대로 쓴다. 행 높이 54, 상자 24, 간격 12.

**편집 모드** (`onLabelChange` 있음)
- 체크박스는 **상자만**(라벨 null). 라벨을 주면 행 전체 hit area가 글자를 먹어서 커서가 아니라 체크가 바뀐다.
- 오른쪽에 밑줄 입력. 밑줄은 **글자 아래에만** 그린다(1px `--border-strong`), 바깥 상자는 높이 48을 지킨다.
- 들어가는 즉시 `bringIntoView()` → `requestFocus()`. **목록 끝에 생긴 줄이 키보드 뒤에 있으면 안 된다.**
- placeholder 색 `--fg-subtle`, `bodyL` 17.
- 포커스를 한 번이라도 받은 뒤 잃으면 `onEditDone()`. (처음 한 번은 초점이 오기 전이라 끝난 것이 아니다)

**삭제 ×** — `Ghost` / **Size L**(48/24). **`enabled`를 행과 함께 받는다**(`enabled = enabled`) — 행이 꺼지면 ×도 함께 꺼진다. 목록 안 항목이지만 DESIGN.md 6.2가 진료 전 할 일을 L로 못박았다. **확인 대화상자를 붙이지 않는다** — 개체가 아니라 안의 항목이고, 편집 모드를 벗어나기 전이면 취소가 실행 취소를 대신한다.

**쓰이는 화면** — `CalendarDayScreen.kt` · `ScheduleAddScreen.kt` (`calendar`).

```tsx
export function MMTodoRow(p: MMTodoRowProps) {
  const editing = !!p.onLabelChange;
  const ref = useRef<HTMLInputElement>(null);
  const everFocused = useRef(false);
  useEffect(() => {
    if (editing) { ref.current?.scrollIntoView({ block: 'nearest' }); ref.current?.focus(); }
  }, [editing]);

  return (
    <div className="mm-todo">
      {editing ? (
        <div className="mm-todo__edit">
          <MMCheckbox checked={p.checked} onCheckedChange={p.onCheckedChange} label={null} />
          <div className="mm-todo__underline">
            <input ref={ref} value={p.label} placeholder={p.labelPlaceholder ?? ''}
              enterKeyHint="done"
              onChange={(e) => p.onLabelChange!(e.target.value)}
              onFocus={() => { everFocused.current = true; }}
              onBlur={() => { if (everFocused.current) p.onEditDone?.(); }}
              onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLElement).blur(); }} />
          </div>
        </div>
      ) : (
        <MMCheckbox checked={p.checked} onCheckedChange={p.onCheckedChange} label={p.label} />
      )}
      {p.delete && (
        <MMIconButton icon="close" style="ghost" size="l" enabled={p.enabled ?? true}
          contentDescription={p.delete.contentDescription} onClick={p.delete.onClick} />
      )}
    </div>
  );
}
```

```css
.mm-todo { display: flex; align-items: center; width: 100%; }
.mm-todo > :first-child { flex: 1; }
.mm-todo__edit { display: flex; align-items: center; gap: var(--s-12); flex: 1; }
.mm-todo__underline { flex: 1; display: flex; align-items: center;
  min-height: var(--touch-min); }
.mm-todo__underline input { width: 100%; border: 0; border-bottom: 1px solid var(--border-strong);
  background: none; outline: none; padding-bottom: var(--s-2);
  font: 400 17px/26px Pretendard, sans-serif; color: var(--fg-default);
  caret-color: var(--border-focus); }
.mm-todo__underline input::placeholder { color: var(--fg-subtle); }
```

---

### 3.8 `MedicalMateCardPick` 🆕 — Figma `1129:9198` (320×84)

`component/CardPick.kt`

일정에 붙일 브리핑 카드를 고르는 행. **카드 모양이지만 읽는 카드가 아니라 고르는 컨트롤이다.**

- radius `--r-lg` 20 · 면 `--bg-surface` · 그림자 `--e-card`.
- 여백 좌우 **18** / 위아래 16. 요소 간격 10.
- 고른 표시가 **둘**: 체크 상자가 채워지고 + 테두리가 **1.5px `--bg-primary`**로 생긴다. 미선택에는 테두리가 없다.
- 체크 상자 24 · radius `--r-xs` 8 · 미선택 1.5px `--border-strong` · 선택 `--bg-primary` + `check` 18.
- **행 전체가 hit area**, `role="checkbox"`. 상자에 조작을 걸지 않는다.
- 제목 `bodyLStrong` 17, 메타 `bodyS` 13 `--fg-subtle`, 둘 사이 간격 **2**.

**쓰이는 화면** — `ScheduleAddScreen.kt` (`calendar`).

```css
.mm-cardpick { display: flex; align-items: center; gap: var(--s-10); width: 100%;
  padding: var(--s-16) 18px; border: 0; border-radius: var(--r-lg);
  background: var(--bg-surface); box-shadow: var(--e-card); cursor: pointer; text-align: left; }
.mm-cardpick.is-on { box-shadow: var(--e-card), inset 0 0 0 1.5px var(--bg-primary); }
.mm-cardpick__title { font: 600 17px/26px Pretendard, sans-serif; color: var(--fg-default); }
.mm-cardpick__meta  { font: 400 13px/20px Pretendard, sans-serif; color: var(--fg-subtle); margin-top: 2px; }
```

---

### 3.9 통증 입력 3종 + 판독 1종

`component/SeverityInputs.kt` · `component/SeverityReadout.kt` · `MedicalMateSeverity.kt`

**5단계 정의 — 문구는 소스 그대로 옮긴다** (`strings.xml`)

| level | label | description | NRS |
|---|---|---|---|
| 1 | `조금 불편해요` | `신경 쓰이지만 하던 일은 계속할 수 있어요` | 1–2 |
| 2 | `은근히 아파요` | `자꾸 생각나고 집중이 잘 안 돼요` | 3–4 |
| 3 | `꽤 아파요` | `하던 일을 멈추게 될 때가 있어요` | 5–6 |
| 4 | `많이 아파요` | `일상생활이 어렵고 참기 힘들어요` | 7–8 |
| 5 | `견디기 힘들어요` | `잠도 못 자고 아무것도 못 하겠어요` | 9–10 |

- NRS 표기 문자열: `NRS 1–2` (en dash `–`, `severity_nrs` = `"NRS %1$d–%2$d"`).
- 스크린 리더 문구: `"3단계, 꽤 아파요"` (`severity_level_content_description` = `"%1$d단계, %2$s"`). 기본 슬라이더 값은 "3.0"으로 읽혀 무엇을 고른 것인지 알 수 없다.
- 슬라이더 양 끝 라벨: 왼쪽 `가벼운 불편`, 오른쪽 `매우 심함`.
- 색: `base`(칩·트랙 채움) = `--sev-N`, `tint`(판독 면) = `--sev-N-tint`.

#### `MedicalMateSeveritySlider` — Figma `339:1293`

파라미터 — `severity`(필수, non-null) · `onSeverityChange` · `showNrs`(기본 false) · **`enabled`(기본 true)**.
`enabled = false`면 M3 `Slider`가 통째로 비활성이 되지만 **판독 카드와 양 끝 라벨의 색은 그대로다**(소스가 따로 낮추지 않는다). 웹에서 disabled 전체를 흐리게 만들면 안드로이드와 갈린다.

구성(위→아래): **판독 카드 → 슬라이더 → 양 끝 라벨**. 세로 간격 14.

- 판독 카드: radius `--r-button-m` 14 · 면 `severity.tint` · 여백 12 · 요소 간격 12.
  - 왼쪽 단계 칩 28×28 · radius `--r-xs` 8 · 면 `severity.base` · 글자 `--fg-default` `labelM`.
    (**글자색을 `--fg-default`로 고정한다.** base가 옅은 1~2단계에서 흰 글자를 쓰면 대비가 무너진다.)
  - 가운데 label `bodyLStrong` / description `bodyS` `--fg-subtle`, 둘 사이 간격 2.
  - `showNrs`가 켜지면 오른쪽에 NRS(`bodyS`, `--fg-subtle`). **기본은 꺼짐 — 의료진용 표기다.**
- 트랙 높이 **10** · 정지점 **6** · 손잡이 **28** 흰 원 + **4px** `--border-primary` 링.
  - 정지점 색: 채움 위에 오면 `--bg-surface`(흰색), 밖이면 `--border-default`. **같은 색으로 두면 지나온 정지점이 사라진다.**
  - 트랙 바탕 `--bg-subtle`, 채움 `severity.base`.
  - 손잡이 이동 폭은 트랙 폭에서 좌우 14(손잡이 반지름)를 뺀 구간이다. 정지점도 손잡이가 서는 자리에 찍는다.
- **끄는 동안에는 손가락을 그대로 따라가고 놓을 때 단계로 붙는다.** 끄는 중에도 다섯 지점으로만 뛰면 손가락과 손잡이가 따로 논다. 값은 다섯 그대로다.
- 키보드 ←/→, Home/End 지원(Material3가 처리). → **웹은 `<input type="range">`가 기본 제공한다.**

```tsx
// drag 중에는 연속값, 놓으면 스냅. input[type=range]로는 연속 추종이 안 되므로
// 트랙을 직접 그리고 pointer 이벤트로 position(연속)과 severity(정수)를 분리한다.
const [position, setPosition] = useState(severity);      // 1..5 연속
useEffect(() => { if (!dragging) setPosition(severity); }, [severity, dragging]);
```

```css
.mm-sev__readout { display: flex; gap: var(--s-12); padding: var(--s-12);
  border-radius: var(--r-button-m); background: var(--sev-3-tint); }
.mm-sev__chip { width: 28px; height: 28px; display: grid; place-items: center; flex: none;
  border-radius: var(--r-xs); background: var(--sev-3); color: var(--fg-default);
  font: 600 13px/18px Pretendard, sans-serif; }
.mm-sev__track { position: relative; height: 10px; border-radius: 5px; background: var(--bg-subtle); }
.mm-sev__fill  { position: absolute; inset: 0 auto 0 0; border-radius: 5px; background: var(--sev-3); }
.mm-sev__stop  { position: absolute; top: 50%; width: 6px; height: 6px; border-radius: 50%;
  transform: translate(-50%, -50%); background: var(--border-default); }
.mm-sev__stop.is-passed { background: var(--bg-surface); }
.mm-sev__thumb { position: absolute; top: 50%; width: 28px; height: 28px; transform: translate(-50%, -50%);
  border-radius: 50%; background: var(--bg-surface); box-shadow: inset 0 0 0 4px var(--border-primary); }
.mm-sev__ends { display: flex; justify-content: space-between;
  font: 400 13px/20px Pretendard, sans-serif; color: var(--fg-subtle); }
```

#### `MedicalMateSeveritySelect` — Figma `295:898`

설명을 모두 펼친 **세로 카드 5장**. 카드 사이 간격 8.
- 카드: radius `--r-button-m` 14 · 여백 12 · 요소 간격 12.
- 선택: 면 `severity.tint` + **1.5px** `--border-primary`. 미선택: 면 `--bg-subtle`, 테두리 없음.
- 단계 칩 + label(`bodyLStrong`) + description(`bodyS`, `--fg-subtle`). 칩 글자는 Slider와 같은 `labelM` 13.
- **`severity`가 nullable이다** (`MedicalMateSeverity?`). Slider와 달리 **아무것도 고르지 않은 상태를 표현할 수 있다** — 그때는 다섯 장 모두 미선택(`--bg-subtle`, 테두리 없음)이다. 웹 props도 `severity: 1|2|3|4|5 | null`로 연다.
- **단독 화면에 배치한다.** 다섯 단계 설명을 한 번에 읽는 방식이라 다른 입력과 같은 화면에 두면 화면이 이것만으로 찬다.
- 현재 앱 화면에서는 쓰이지 않는다(대안 입력 경로).

#### `MedicalMateSeverityReadout` — Figma `333:1126`

**출력 전용.** 고르는 자리는 Slider/Select다.

- 한 줄: 단계 칩 28 → label(`bodyLStrong`, `flex:1`) → NRS(`bodyS`, `--fg-subtle`). 간격 12, 행 높이 min **32**.
- 칩 글자는 여기선 `bodyMStrong` **15**다(Slider 판독의 `labelM` 13과 다르다 — 마스터 값).
- 접근성: 행 전체를 `"3단계, 꽤 아파요"` 하나로 읽는다. **NRS는 읽지 않는다**(의료진용).
- **`showNrs`가 없다.** 파라미터는 `severity` 하나뿐이고 NRS는 **항상 표시된다.** Slider의 `showNrs`(기본 꺼짐)와 반대이므로 웹에서 토글을 만들지 않는다.

**쓰이는 화면** — `BriefCardBlock.kt` · `RecordDetailStep.kt`(둘 다 **`card`** — `RecordDetailStep.kt`의 경로가 `card/ui/`다), `IntakeSteps.kt`(`intake`).

---

### 3.10 `MedicalMateVoiceInput` — Figma `313:993`

`component/VoiceInput.kt`

문답의 주 입력. 마이크 지름 **88**(`--mic`). 구성(위→아래): 마이크 → 제목 → 설명 → `직접 입력할게요` Ghost/S 버튼. 세로 간격 12, 가운데 정렬.

**상태별 문구는 컴포넌트가 들고 있다** (`strings.xml` 그대로)

| state | 제목 (`headingS`) | 설명 (`bodyS`) | 마이크 면 / 아이콘 |
|---|---|---|---|
| `IDLE` | `말씀해 주세요` | `편하게 말씀하시면 제가 정리할게요` | `--bg-primary` / `mic` |
| `LISTENING` | `듣고 있어요` | `다 말씀하시면 버튼을 다시 눌러주세요` | `--bg-primary` / **`waveform`** + 6px `--bg-primary-subtle` 링 |
| `PROCESSING` | `정리하는 중이에요` | `잠시만 기다려 주세요` | `--bg-subtle` / 스피너, **누를 수 없음** |
| `DENIED` | `마이크를 쓸 수 없어요` | `설정에서 마이크 권한을 켜주세요` | `--bg-danger` / `mic-off`, 설명 색 **`--fg-danger`** |

- 대안 버튼 라벨: `직접 입력할게요` (`voice_type_instead`). **모든 상태에 같은 자리에 둔다.** 위치가 상태마다 움직이면 말하기 어려운 사용자가 매번 찾아야 한다.
- 마이크 접근성 이름: 듣는 중 `말하기 끝내기`, 그 외 `말하기 시작`.
- `description`으로 둘째 줄을 갈아 끼울 수 있다. 문답이 끝난 뒤 쓰는 문구가 `"다음"이라고 말하거나 버튼을 눌러주세요`(`voice_next_hint`) — **시안에 없는 문구라 디자인 트랙 확인 대기**.
- 듣는 중 파형은 **정지 막대**다. 애니메이션을 넣지 않았다.

**쓰이는 화면** — `IntakeChat.kt`(`intake`), `VisitNoteScreen.kt`(`visit`).

> **웹 포팅 리스크** — Web Speech API(`SpeechRecognition`)는 Chromium 계열만 안정적이고 iOS Safari는 제한적이다. `DENIED`가 아니라 **`UNSUPPORTED` 상태를 하나 더 만들어야 할 가능성이 크다.** 문구는 디자인 확인 필요.

```css
.mm-voice { display: flex; flex-direction: column; align-items: center; gap: var(--s-12); width: 100%; }
.mm-voice__mic { width: 88px; height: 88px; border-radius: var(--r-full); border: 0;
  display: grid; place-items: center; cursor: pointer;
  background: var(--bg-primary); color: var(--fg-on-primary); }
.mm-voice__mic.is-listening { box-shadow: inset 0 0 0 6px var(--bg-primary-subtle); }
.mm-voice__mic.is-processing { background: var(--bg-subtle); color: var(--fg-muted); cursor: default; }
.mm-voice__mic.is-denied { background: var(--bg-danger); color: var(--fg-danger); }
.mm-voice__mic svg { width: 24px; height: 24px; }
.mm-voice__title { font: 600 17px/24px Pretendard, sans-serif; letter-spacing: -.01em;
  color: var(--fg-default); text-align: center; }
.mm-voice__desc { font: 400 13px/20px Pretendard, sans-serif; color: var(--fg-subtle); text-align: center; }
.mm-voice__desc.is-danger { color: var(--fg-danger); }
```

---
## 4. 구조 계열 — 크롬

### 4.1 `MedicalMateNavBar` — Figma `298:739` (v2)

`component/NavBar.kt`

```ts
interface MMNavBarProps {
  title: string;
  leading?: 'back'|'close'|'none';   // 기본 back
  onLeadingClick?: () => void;
  actionLabel?: string;              // 우측은 아이콘이 아니라 텍스트다
  onActionClick?: () => void;
  actionEnabled?: boolean;           // 기본 true
  surface?: 'opaque'|'glass';        // 기본 opaque
}
```

**레이아웃 (위→아래는 한 줄, 좌→우)**

```
[ 8 ][ leading slot 48 ]   …   [ action slot ][ 8 ]
                 제목 — 바 전체의 가운데 (남은 폭의 가운데가 아니다)
──────────────────────────────────────────────  1px border/subtle
```

- 높이 min **56**(`--nav-h`), 면 `--bg-surface`(glass면 alpha **0.82**), **하단 1px `--border-subtle`**(v2 추가).
- 좌우 바깥 여백 8, leading 슬롯 48 고정(비어 있어도 자리를 지킨다).
- **제목은 `position: absolute`로 바 전체 가운데에 둔다.** 좌우에 같은 값을 비우고 그 안에서 가운데 — 액션이 없으면 **60**, 텍스트 액션이 있으면 **88**. 화면을 넘길 때마다 제목이 자리를 지켜야 한다.
- 제목 `headingS` 17/600, 1줄 말줄임.
- leading: `back` → `chevron-left`(접근성 이름 `뒤로`), `close` → `close`(`닫기`). **IconButton Size L**(48/24).
- 액션: `Button`이 아니다. `bodyLStrong` **17**에 `--fg-primary`(비활성 `--fg-muted`), 높이 48, radius full, 여백 왼쪽 8 / 오른쪽 12.
  - Ghost 버튼의 라벨은 15·13이라 같은 자리의 글자가 화면마다 다른 크기로 서게 된다.
- **`back`과 `close`는 뜻이 다르다.** 뒤로는 흐름을 한 단계 되돌리고, 닫기는 흐름 전체를 벗어난다. 문답 중간에서 닫기를 누르면 작성 내용을 어떻게 할지 물어야 한다.

**쓰이는 화면** — `calendar` `card` `intake` `profile` `visit` (2Depth 이상 전부).

```tsx
export function MMNavBar({ title, leading = 'back', onLeadingClick,
  actionLabel, onActionClick, actionEnabled = true, surface = 'opaque' }: MMNavBarProps) {
  const hasAction = !!(actionLabel && onActionClick);
  return (
    <header className={`mm-nav mm-nav--${surface}`}>
      <div className="mm-nav__slot">
        {leading !== 'none' && onLeadingClick && (
          <MMIconButton size="l" style="ghost"
            icon={leading === 'back' ? 'chevron-left' : 'close'}
            contentDescription={leading === 'back' ? '뒤로' : '닫기'}
            onClick={onLeadingClick} />
        )}
      </div>
      <h1 className={`mm-nav__title${hasAction ? ' has-action' : ''}`}>{title}</h1>
      <div className="mm-nav__slot mm-nav__slot--end">
        {hasAction && (
          <button type="button" className="mm-nav__action"
            disabled={!actionEnabled} onClick={onActionClick}>{actionLabel}</button>
        )}
      </div>
    </header>
  );
}
```

```css
.mm-nav { position: relative; display: flex; align-items: center; justify-content: space-between;
  min-height: var(--nav-h); padding-inline: var(--s-8);
  background: var(--bg-surface); border-bottom: 1px solid var(--border-subtle); }
.mm-nav--glass { background: rgb(255 255 255 / .82); }
@supports (backdrop-filter: blur(1px)) {
  .mm-nav--glass { backdrop-filter: blur(var(--glass-blur)); }
}
.mm-nav__slot { width: 48px; min-height: 48px; display: grid; place-items: center; flex: none; }
.mm-nav__slot--end { width: auto; min-width: 48px; }
.mm-nav__title { position: absolute; inset-inline: 60px; text-align: center; margin: 0;
  font: 600 17px/24px Pretendard, sans-serif; letter-spacing: -.01em; color: var(--fg-default);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; pointer-events: none; }
.mm-nav__title.has-action { inset-inline: 88px; }
.mm-nav__action { min-height: 48px; padding: 0 var(--s-12) 0 var(--s-8);
  border: 0; border-radius: var(--r-full); background: none; cursor: pointer;
  font: 600 17px/26px Pretendard, sans-serif; color: var(--fg-primary); }
.mm-nav__action:disabled { color: var(--fg-muted); }
```

---

### 4.2 `MedicalMateTabBar` — Figma `319:1026` (v2, 4탭→3탭)

`component/TabBar.kt`

**탭은 세 개다.** 선언 순서가 화면 순서 — `캘린더 · 홈 · 기록`이고 **홈이 가운데**다.

| enum | 라벨 | 아이콘 (비활성 / 활성) |
|---|---|---|
| `CALENDAR` | `캘린더` | `calendar` / `calendar-filled` |
| `HOME` | `홈` | `home` / `home-filled` |
| `RECORD` | `기록` | `note` / `note-filled` |

> DESIGN.md가 `내 정보`를 넣어 넷으로 적은 것은 **문서 오류**라고 소스에 명시돼 있다. `user`/`user-filled` 아이콘은 세트에 있지만 탭에 쓰이지 않는다.
> 마스터의 네 번째 variant(`Active=Active4`, `1223:14193`)는 **네 번째 탭이 아니라 아무 탭도 활성이 아닌 상태**다. 쓰는 화면이 없어 열지 않았다. → 웹에서도 `selected`를 nullable로 만들지 않는다.

**치수** — 전체 높이 **79** = 1(경계선) + 8(위 여백) + 46(탭) + 24(safe bottom).
소스 구조: `1px hairline` + `height 54, padding-top 8` 행 + `height 24` 스페이서.

**활성 표시 세 가지를 함께 쓴다** (색만 바꾸면 색각 이상에서 전달되지 않는다)
1. 채움 아이콘으로 교체, 2. 색 `--fg-primary`(비활성 **`--fg-subtle`**), 3. 라벨 굵기 SemiBold.

아이콘 24(`--icon-lg`), 라벨 `labelS` 11/500(+2%), 아이콘↔라벨 간격 4.
**1Depth에서만 노출한다.** 문답이나 카드 작성처럼 흐름 안에 들어간 화면에서는 감춘다.

**쓰이는 화면** — `home`(1n) · `card`(1j) · `calendar`(1r).

```tsx
const TABS = [
  { id: 'calendar', label: '캘린더', icon: 'calendar' },
  { id: 'home',     label: '홈',     icon: 'home' },
  { id: 'record',   label: '기록',   icon: 'note' },
] as const;

export const MMTabBar = ({ selected, onSelect, surface = 'opaque' }: {
  selected: 'calendar'|'home'|'record'; onSelect: (t: typeof TABS[number]['id']) => void;
  surface?: 'opaque'|'glass';
}) => (
  <nav className={`mm-tabbar mm-tabbar--${surface}`} role="tablist">
    <div className="mm-tabbar__row">
      {TABS.map((t) => {
        const on = t.id === selected;
        return (
          <button key={t.id} role="tab" aria-selected={on}
            className={`mm-tabbar__item${on ? ' is-on' : ''}`} onClick={() => onSelect(t.id)}>
            <Icon name={on ? `${t.icon}-filled` : t.icon} aria-hidden />
            <span>{t.label}</span>
          </button>
        );
      })}
    </div>
    <div className="mm-tabbar__safe" />
  </nav>
);
```

```css
.mm-tabbar { position: sticky; bottom: 0; width: 100%;
  background: var(--bg-surface); border-top: 1px solid var(--border-subtle); }
.mm-tabbar--glass { background: rgb(255 255 255 / .86); backdrop-filter: blur(var(--glass-blur)); }
.mm-tabbar__row { display: flex; height: 54px; padding-top: var(--s-8); }
.mm-tabbar__safe { height: var(--safe-bottom); }  /* env(safe-area-inset-bottom)과 중복 적용 주의 */
.mm-tabbar__item { flex: 1; display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: var(--s-4); border: 0; background: none; cursor: pointer;
  color: var(--fg-subtle); font: 500 11px/16px Pretendard, sans-serif; letter-spacing: .02em; }
.mm-tabbar__item.is-on { color: var(--fg-primary); font-weight: 600; }
.mm-tabbar__item svg { width: 24px; height: 24px; }
```

---

### 4.3 `MedicalMateBottomCtaBar` — Figma `294:652`

`component/BottomCtaBar.kt`

한 손으로 누를 주 액션을 화면 아래에 고정한다. **높이 92** = 위 여백 12 + L 버튼 56 + 아래 안전 여백 24.

- 좌우 여백 `--gutter` 20. **자식이 둘 이상이면 세로 간격 10.**
- `surface`: **기본이 `OPAQUE`**다. `GLASS`는 alpha **0.78**.
- **불투명 변형에만 `--e-float` 그림자가 걸린다.** 블러가 없는 쪽은 그림자가 층을 만들어야 한다.
- 테두리를 두지 않는다(Glass·Opaque 모두).

> **웹에서는 기본값을 뒤집을 수 있다.** 안드로이드가 Opaque를 기본으로 둔 이유는 compose-ui 1.10.5에 배경 블러 API가 없고 `RenderEffect`가 API 31+라서다. 웹은 `backdrop-filter`가 널리 지원되므로 `@supports` 안에서 Glass를, 밖에서 Opaque + 그림자를 쓰면 시안에 더 가깝다.

**쓰이는 화면** — `calendar` `card` `intake` `profile` `visit`.

```css
.mm-cta { position: sticky; bottom: 0; display: flex; flex-direction: column; gap: var(--s-10);
  width: 100%; padding: var(--s-12) var(--gutter) var(--safe-bottom);
  background: var(--bg-surface); box-shadow: var(--e-float); }
@supports (backdrop-filter: blur(1px)) {
  .mm-cta--glass { background: rgb(255 255 255 / .78); backdrop-filter: blur(var(--glass-blur));
                   box-shadow: none; }
}
```

---

### 4.4 `MedicalMateBottomSheet` + `MedicalMateSheetActions` — Figma `294:681`

`component/BottomSheet.kt`

**시트 본체**
- 위쪽 두 각만 **28**(`--r-2xl`). 면 `--bg-surface`.
- grabber **40×4**, `--border-default`, radius full, 위아래 여백 12. **접근성 트리에서 지운다**(`aria-hidden`).
- 본문 여백: 좌우 `--gutter` 20, 아래 `--safe-bottom` 24. 자식 간격 12.
- 스크림 alpha **0.5** (`--bg-scrim`).
- **한 화면에서 떠 있는 층은 최대 두 단계.** 시트 위에 시트나 대화상자를 다시 띄우지 않는다.

**행동 영역 `MedicalMateSheetActions` — `action` variant 3종**

| action | 배치 | 버튼 |
|---|---|---|
| `STRONG` | 세로, 간격 8 | 위 Primary / 아래 **Ghost** |
| `NEUTRAL` | 가로, 간격 12, 1:1 | 왼쪽 **Outline** / 오른쪽 Primary |
| `CANCEL` | 단일, 폭 100% | **Outline** 하나 |

세로 배치에서는 위가 먼저 읽히므로 `STRONG`은 주 행동을 위에 둔다.

**파라미터 — 보조 버튼은 선택이다**

```ts
interface MMSheetActionsProps {
  action: 'strong'|'neutral'|'cancel';
  primaryLabel: string; onPrimaryClick: () => void;   // 필수
  secondaryLabel?: string; onSecondaryClick?: () => void;  // 둘 다 있어야 렌더된다
}
```

- `secondaryLabel`과 `onSecondaryClick` **둘 다** 있어야 보조 버튼이 그려진다(`hasSecondary`). 하나만 주면 조용히 사라진다.
- 보조가 없으면 `STRONG`은 Primary 한 장, `NEUTRAL`은 **Primary 하나가 `flex:1`로 폭을 다 먹는다.**
- `CANCEL`은 `secondary*`를 **무시한다.** primary 라벨 하나를 Outline으로 그린다.

**쓰이는 화면** — `CalendarMonthScreen.kt` · `ScheduleAddSheets.kt` (`calendar`).

```tsx
export function MMBottomSheet({ open, onDismissRequest, children }: {
  open: boolean; onDismissRequest: () => void; children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { open ? ref.current?.showModal() : ref.current?.close(); }, [open]);
  return (
    <dialog ref={ref} className="mm-sheet" onCancel={onDismissRequest}
      onClick={(e) => { if (e.target === ref.current) onDismissRequest(); }}>
      <div className="mm-sheet__grabber" aria-hidden><i /></div>
      <div className="mm-sheet__body">{children}</div>
    </dialog>
  );
}
```

```css
.mm-sheet { width: min(480px, 100%); margin: auto auto 0; padding: 0; border: 0;
  border-radius: var(--r-2xl) var(--r-2xl) 0 0;
  background: var(--bg-surface); color: var(--fg-default); box-shadow: var(--e-sheet); }
.mm-sheet::backdrop { background: rgb(19 23 34 / .5); }
.mm-sheet__grabber { display: grid; place-items: center; padding-block: var(--s-12); }
.mm-sheet__grabber i { width: 40px; height: 4px; border-radius: var(--r-full);
  background: var(--border-default); display: block; }
.mm-sheet__body { display: flex; flex-direction: column; gap: var(--s-12);
  padding: 0 var(--gutter) var(--safe-bottom); }

.mm-sheet-actions--strong  { display: flex; flex-direction: column; gap: var(--s-8); }
.mm-sheet-actions--neutral { display: flex; gap: var(--s-12); }
.mm-sheet-actions--neutral > * { flex: 1; }
```

> **제스처 대체** — 끌어내리기는 `<dialog>`가 주지 않는다. ESC(`onCancel`) + 스크림 클릭 + grabber 드래그(pointer 이벤트 20~30줄)로 메운다. 스크린 리더 사용자는 원래 끌어내리기를 쓰지 않으므로 필수는 아니다.

---

### 4.5 `MedicalMateDialog` — Figma `312:845`

`component/Dialog.kt`

**되돌릴 수 없는 동작을 확인받는 자리.** 되돌릴 수 있는 동작은 Toast의 action으로 충분하다. 남발하면 사용자가 읽지 않고 누른다.

**구성 (위→아래)**
1. 원형 아이콘 배지 **48** (`--control-md`), 아이콘 24
2. 제목 `headingM` 20/600, 가운데
3. 본문 `bodyS` 13 `--fg-subtle`, 가운데 — **"무엇을 잃는지"를 말한다**
4. 버튼 두 개, 좌우 **1:1 균등**

| `tone` | 배지 면 | 아이콘 | 아이콘 색 |
|---|---|---|---|
| `DANGER`(기본) | `--bg-danger` | `trash` | `--fg-danger` |
| `NEUTRAL` | `--bg-primary-faint` | `alert-circle` | `--fg-primary` |

> **`tone`은 배지만 바꾼다.** 확인 버튼은 `NEUTRAL`에서도 **항상 `DANGER` 타입**이다(소스가 `type = MedicalMateButtonType.DANGER`로 고정). 웹에서 tone에 따라 확인 버튼 색을 바꾸면 안드로이드와 갈린다. 되돌릴 수 있는 확인에 붉은 버튼이 나오는 셈이라 **디자인 확인이 필요한 지점**으로 남긴다.

- 폭 **320 고정**, 높이는 내용에 따라. radius `--r-xl` 24.
- 여백: 위 **28**, 좌우 20, 아래 16. 블록 간격 10. **제목↔본문만 4**(한 덩어리로 읽혀야 한다).
- 버튼: 왼쪽 **Tonal / M**(취소 = `onDismissRequest`), 오른쪽 **Danger / M**(실행 = `onConfirm`). 둘 다 `weight(1f)`. 간격 8, 버튼 줄 위 여백 4.
  - **§4.4 시트의 `NEUTRAL`(왼쪽 Outline / 오른쪽 Primary)과 규칙이 다르다.** 대화상자는 Tonal + Danger다. §2.1의 "두 개 나란히 둘 때 왼쪽 Outline, 오른쪽 Primary"는 **시트에만** 적용된다.
- `onDismissRequest`는 바깥을 눌렀을 때도 불린다. **되돌릴 수 없는 선택 중에는 호출자가 빈 함수를 주고 취소 버튼만 남긴다.**

```ts
interface MMDialogProps {
  title: string; message: string;
  confirmLabel: string; onConfirm: () => void;
  dismissLabel: string; onDismissRequest: () => void;
  tone?: 'danger'|'neutral';   // 기본 danger
}
```

**쓰이는 화면** — `BriefCardListScreen.kt` `BriefCardScreen.kt` `RecordScreen.kt`(`card`), `CalendarDayScreen.kt`(`calendar`), `VisitRecordScreen.kt`(`visit`).

```css
.mm-dialog { width: 320px; padding: 28px var(--s-20) var(--s-16); border: 0;
  border-radius: var(--r-xl); background: var(--bg-surface); box-shadow: var(--e-sheet);
  display: flex; flex-direction: column; align-items: center; gap: var(--s-10); }
.mm-dialog::backdrop { background: rgb(19 23 34 / .5); }
.mm-dialog__badge { width: 48px; height: 48px; border-radius: var(--r-full);
  display: grid; place-items: center; }
.mm-dialog__badge--danger  { background: var(--bg-danger); color: var(--fg-danger); }
.mm-dialog__badge--neutral { background: var(--bg-primary-faint); color: var(--fg-primary); }
.mm-dialog__badge svg { width: 24px; height: 24px; }
.mm-dialog__copy { display: flex; flex-direction: column; gap: var(--s-4); text-align: center; }
.mm-dialog__title { font: 600 20px/28px Pretendard, sans-serif; letter-spacing: -.015em; margin: 0; }
.mm-dialog__msg { font: 400 13px/20px Pretendard, sans-serif; color: var(--fg-subtle); margin: 0; }
.mm-dialog__actions { display: flex; gap: var(--s-8); width: 100%; margin-top: var(--s-4); }
.mm-dialog__actions > * { flex: 1; }
```

---

### 4.6 `MedicalMateToast` — Figma `312:844` (v2)

`component/Toast.kt`

**행동 직후 사라지는 피드백.** 화면에 남아야 하는 안내는 `Notice`다.
**이 컴포넌트는 모양만 그린다.** 띄우고 없애는 것은 호출자가 정한다.

| `tone` | 아이콘 | 강조색 (원시 팔레트) |
|---|---|---|
| `NORMAL` | `info` | `--p-300` `#A3AFF1` |
| `POSITIVE` | `check-circle` | `--green-100` `#C6F0DC` |
| `CAUTIONARY` | `alert-triangle` | `--amber-100` `#FFE9B3` |
| `NEGATIVE` | `alert-circle` | `--red-100` `#FFD8D4` |

> 강조색만 시맨틱이 아니라 **원시 팔레트**를 직접 쓴다. inverse 면 위에서 쓸 상태색이 시맨틱 41개에 없다.

- 면 `--bg-inverse` `#131722`, 글자 `--fg-on-inverse`.
- radius **18** (스케일 밖 값). 높이 min **56**. 여백 왼쪽 16 / 오른쪽 8. 요소 간격 12.
- 메시지 `bodyM` 15, **최대 2줄 말줄임.** 두 줄에 담기지 않는 내용은 Toast가 아니라 화면에 남을 안내다.
- 액션: Ghost 버튼을 쓰지 않는다(`--fg-primary`가 inverse 면에서 안 읽힌다). **아이콘과 같은 강조색**, `labelM`, 최소 48×48, radius `--r-sm`.
- `actionLabel`은 **되돌릴 수 있는 파괴 동작에만** 붙인다.

**위치 우선순위** — Bottom CTA Bar 바로 위 → 없으면 Tab Bar 위 20 → 둘 다 없으면 safe area 위 20.

**현재 어느 화면에서도 호출되지 않는다** (컴포넌트만 존재).

```css
.mm-toast { display: flex; align-items: center; gap: var(--s-12); width: 100%;
  min-height: 56px; padding: 0 var(--s-8) 0 var(--s-16); border-radius: 18px;
  background: var(--bg-inverse); color: var(--fg-on-inverse); box-shadow: var(--e-float); }
.mm-toast svg { width: 20px; height: 20px; flex: none; }
.mm-toast__msg { flex: 1; font: 400 15px/24px Pretendard, sans-serif;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.mm-toast__action { min-width: 48px; min-height: 48px; padding-inline: var(--s-8);
  border: 0; border-radius: var(--r-sm); background: none; cursor: pointer;
  font: 600 13px/18px Pretendard, sans-serif; color: inherit; }
.mm-toast--normal     { --toast-accent: #A3AFF1; }
.mm-toast--positive   { --toast-accent: #C6F0DC; }
.mm-toast--cautionary { --toast-accent: #FFE9B3; }
.mm-toast--negative   { --toast-accent: #FFD8D4; }
.mm-toast svg, .mm-toast__action { color: var(--toast-accent); }
```

> 접근성: 웹은 `role="status"`(NORMAL/POSITIVE) 또는 `role="alert"`(CAUTIONARY/NEGATIVE)로 감싼다. 안드로이드에는 없던 결정이다.

---

### 4.7 `MedicalMateOverlayScrim` — Figma `335:1189`

`component/OverlayScrim.kt`

- `--bg-scrim` `#131722` alpha **0.5**, 화면 전체.
- `onDismiss`가 없으면 눌러도 닫히지 않는다. **그 경우에도 터치를 삼킨다** — 시각적으로만 덮고 터치를 흘려보내면 사용자가 보이지 않는 버튼을 누르게 된다.
- 눌림 표시(ripple)를 주지 않는다. 누르는 대상이 아니라 닫는 자리다.
- `BottomSheet`는 자체 스크림이 있으므로 직접 만든 오버레이에만 쓴다.

**현재 어느 화면에서도 직접 호출되지 않는다.**

```css
.mm-scrim { position: fixed; inset: 0; background: rgb(19 23 34 / .5); }
.mm-scrim--locked { cursor: default; }  /* onDismiss 없음 — 클릭은 받되 아무 일도 안 함 */
```

---

## 5. 표시 계열

### 5.1 `MedicalMateNotice` — Figma `292:668`

`component/Notice.kt`

**화면에 남는 인라인 안내.**

| `tone` | 면 | 아이콘 | 강조·제목 색 |
|---|---|---|---|
| `INFO`(기본) | `--bg-info` `#F2F4FE` | `info` | `--fg-info` |
| `SUCCESS` | `--bg-success` | `check-circle` | `--fg-success` |
| `WARNING` | `--bg-warning` | `alert-triangle` | `--fg-warning` |
| `DANGER` | `--bg-danger` | `alert-circle` | `--fg-danger` |
| **`BRAND`** | `--bg-primary` 채움 | `info` | 제목·본문 모두 `--fg-on-primary`, 아이콘은 흰 배지 위라 `--bg-primary` |

> `BRAND`는 **마스터에 없는 톤**이다. 기록 상세(`1j-3`)의 예정 알림 인스턴스(`1076:4047`)가 면을 `bg/primary`로 덮어 그려서 톤으로 올렸다. Figma 반영 대기.

**레이아웃** — 가로 한 줄, 위 정렬.
- radius `--r-md` 16. 여백 왼쪽 **14** / 오른쪽 16 / 위아래 14. 배지↔글 간격 12.
- **아이콘은 흰 원형 배지 위에 놓는다** — 배지 **32**, 아이콘 20. 파스텔 면에 아이콘을 바로 놓으면 대비가 낮아 묻힌다.
- 글 묶음은 위 **4**를 띄워 배지의 세로 가운데에 첫 줄이 온다.
- 제목 `bodyMStrong` 15/600(tone 색), 본문 `bodyS` 13 `--fg-subtle`. **둘 사이 간격 3**(토큰 2·4 사이의 마스터 값).
- **`body`는 선택이다** (`body: String? = null`). 제목 한 줄짜리 Notice가 가능하고, 그때 글 묶음은 제목만 그린다. 웹 props도 `body?`로 연다. 파라미터는 `title`(필수) · `body` · `tone` 셋뿐 — **아이콘·액션·닫기 버튼 슬롯이 없다.**
- `BRAND`에서 아이콘 색만 `--bg-primary`로 남는 이유는 아이콘이 **흰 배지 위**에 있기 때문이다. 배지 면은 tone과 무관하게 항상 `--bg-surface`다.

**쓰이는 화면** — `BriefCardBlock.kt` · `RecordDetailStep.kt`(둘 다 `card`), `IntakeSteps.kt`(`intake`), `HealthEditScreen.kt`(`profile`).
실제 문구(`intake`, `strings.xml` 그대로): 제목 `숫자는 진료실에서 의사가 읽어요`(`intake_severity_notice_title`) / 본문 `환자분은 낱말로 고르시면 돼요.\n카드에는 NRS 등가로 함께 표시됩니다.`(`intake_severity_notice_body`)

```css
.mm-notice { display: flex; align-items: flex-start; gap: var(--s-12); width: 100%;
  padding: var(--s-14) var(--s-16) var(--s-14) var(--s-14); border-radius: var(--r-md); }
.mm-notice__badge { width: 32px; height: 32px; flex: none; display: grid; place-items: center;
  border-radius: var(--r-full); background: var(--bg-surface); }
.mm-notice__badge svg { width: 20px; height: 20px; }
.mm-notice__text { display: flex; flex-direction: column; gap: 3px; padding-top: var(--s-4); }
.mm-notice__title { font: 600 15px/24px Pretendard, sans-serif; margin: 0; }
.mm-notice__body  { font: 400 13px/20px Pretendard, sans-serif; color: var(--fg-subtle); margin: 0;
                    white-space: pre-line; }
.mm-notice--info    { background: var(--bg-info); }
.mm-notice--info    .mm-notice__title, .mm-notice--info    .mm-notice__badge svg { color: var(--fg-info); }
.mm-notice--success { background: var(--bg-success); }
.mm-notice--success .mm-notice__title, .mm-notice--success .mm-notice__badge svg { color: var(--fg-success); }
.mm-notice--warning { background: var(--bg-warning); }
.mm-notice--warning .mm-notice__title, .mm-notice--warning .mm-notice__badge svg { color: var(--fg-warning); }
.mm-notice--danger  { background: var(--bg-danger); }
.mm-notice--danger  .mm-notice__title, .mm-notice--danger  .mm-notice__badge svg { color: var(--fg-danger); }
.mm-notice--brand   { background: var(--bg-primary); }
.mm-notice--brand   .mm-notice__title, .mm-notice--brand .mm-notice__body { color: var(--fg-on-primary); }
.mm-notice--brand   .mm-notice__badge svg { color: var(--bg-primary); }
```

---

### 5.2 `MedicalMateCallout` — Figma `293:657`

`component/Callout.kt`

브리핑 카드에서 **"환자가 묻고 싶어 하는 것"을 한 번만** 보여준다. 화면에 두 번 이상 두면 무엇이 환자의 질문인지 흐려진다(D5).

**레이아웃 (위→아래)**
1. 헤더: `chat` 아이콘 **18**(`--fg-primary`) + 제목 `labelS` 11 `--fg-primary`. 간격 6.
2. 질문 pill N개
3. (편집 모드) `MedicalMateAddRow`

- 바깥: radius `--r-lg` 20 · 면 `--bg-primary-subtle` · 여백 16 · 자식 간격 12.
- 질문 pill: radius `--r-sm` 12 · 면 **흰색 75%**(`rgb(255 255 255 / .75)`) · 여백 12 · 요소 간격 12.
  - 번호 원 **24** · radius full · `--bg-primary` / `--fg-on-primary` · `labelS`.
  - 질문 본문 `bodyM` 15 `--fg-default`.
- **주인공은 질문이다.** 헤더 라벨은 `Label/S` + `fg/primary`로 가라앉히고 질문 본문을 `fg/default`로 세운다.

**편집 모드 (`edit` 객체를 주면 켜진다)**

```ts
interface MMCalloutEdit {
  addLabel: string;                           // AddRow 라벨
  deleteContentDescription: (n: number) => string;  // %1$d에 질문 번호
  placeholder: string;
  onQuestionChange: (index: number, value: string) => void;
  onQuestionDelete: (index: number) => void;
  onQuestionAdd: () => void;
}
```
- 셋을 한 값으로 묶는 이유 — 따로 받으면 지우기만 되고 고치지는 못하는 반쪽 편집 모드가 생긴다.
- 편집 시 질문이 인라인 입력이 된다. **`TextField`를 쓰지 않는다** — 면을 채우고 테두리를 두르면 pill 안에 또 하나의 필드가 생겨 번호와 글자의 정렬이 어긋난다.
- 삭제 × 는 **Ghost / Size S**(32/18).

**쓰이는 화면** — `BriefCardBlock.kt` (`card`).

```css
.mm-callout { border-radius: var(--r-lg); background: var(--bg-primary-subtle);
  padding: var(--s-16); display: flex; flex-direction: column; gap: var(--s-12); }
.mm-callout__head { display: flex; align-items: center; gap: var(--s-6);
  color: var(--fg-primary); font: 500 11px/16px Pretendard, sans-serif; letter-spacing: .02em; }
.mm-callout__head svg { width: 18px; height: 18px; }
.mm-callout__q { display: flex; align-items: center; gap: var(--s-12); padding: var(--s-12);
  border-radius: var(--r-sm); background: rgb(255 255 255 / .75); }
.mm-callout__n { width: 24px; height: 24px; flex: none; display: grid; place-items: center;
  border-radius: var(--r-full); background: var(--bg-primary); color: var(--fg-on-primary);
  font: 500 11px/16px Pretendard, sans-serif; }
.mm-callout__text { flex: 1; font: 400 15px/24px Pretendard, sans-serif; color: var(--fg-default);
  border: 0; background: none; outline: none; }
```

---

### 5.3 `MedicalMateEmptyState` — Figma `335:1166`

`component/EmptyState.kt`

**사과보다 다음 행동을 제시한다.** "죄송합니다"로 시작하면 사용자는 무엇을 해야 할지 모른 채 화면을 떠난다.

> **⚠ 소스 확인 결과 — `type`이 정하는 것은 아이콘 하나뿐이다.**
> `EmptyState.kt`의 `when(type)`은 **기본 아이콘만 고른다.** `title` · `description`은 **필수 파라미터**이고, `actionLabel` · `onActionClick` · `note` · `icon`은 선택 파라미터다. **컴포넌트 안에 제목·본문·액션 문구가 하나도 들어 있지 않다.**
> 아래 두 표를 분리한 이유가 이것이다. 첫째 표는 **DESIGN.md 7.4-2의 규정값**(웹에서 프리셋으로 재현할 수 있지만 소스에는 없다), 둘째 표는 **실제 화면이 넘기는 문구**(`strings.xml` 원문)다. **둘이 어긋나는 자리에서는 둘째 표가 맞다.**

**(1) 4변이 — `type`이 실제로 정하는 값 + DESIGN.md 규정 문구**

| `type` | 아이콘 (**소스가 정하는 유일한 값**) | DESIGN.md 제목 | DESIGN.md 본문 | DESIGN.md 액션 | 높이 |
|---|---|---|---|---|---|
| `NO_RECORD` | `empty-box` | `아직 진료 기록이 없어요` | `증상을 정리해두면 진료실에서 바로 보여줄 수 있어요` | `증상 정리하기` | 286 |
| `NO_RESULT` | `search-off` | `찾는 기록이 없어요` | `다른 날짜나 증상으로 다시 찾아보세요` | `전체 보기` | 286 |
| `OFFLINE` | `wifi-off` | `연결이 끊어졌어요` | `작성한 내용은 이 기기에 남아 있어요.`<br>`연결되면 이어서 저장할게요.` | `다시 시도` | **310** |
| `MIC_DENIED` | `mic-off` | `마이크를 쓸 수 없어요` | `설정에서 마이크 권한을 켜면 말로 입력할 수 있어요` | `직접 입력하기` | 286 |

- 높이 286/310은 **Figma 마스터 값이고 소스에 없다.** 컴포저블은 위아래 여백 40에 내용 높이를 따르고 `verticalArrangement`가 `CenterVertically`라 **호출자가 남은 높이를 줘야 세로 가운데 정렬이 드러난다**(실제 호출부가 전부 `fillMaxSize`/`Column(Arrangement.Center)`로 감싼다). 웹에서 `height: 286px`를 박지 않는다.
- `Offline`만 본문이 2줄이라 24 높다. **한 줄로 붙이지 않는다.**

> **`OFFLINE`과 `MIC_DENIED`는 어느 화면에서도 호출되지 않는다.** 전체 소스에서 쓰이는 `type`은 **`NO_RECORD`와 `NO_RESULT` 둘뿐**이다. `note` 파라미터도 호출처가 없다(= OFFLINE 전용으로 만든 슬롯이 아직 죽어 있다). 웹에서 4변이를 다 만들 필요가 없고, 프리셋을 만든다면 둘만 먼저 만든다.
> 마이크 거부는 이 컴포넌트가 아니라 **`VoiceInput`의 `DENIED` 상태**(§3.10)가 처리한다.

**(2) 실제 화면이 넘기는 문구** — `strings.xml` 원문. 제목까지 화면마다 다르다.

| 화면 | `type` | 제목 | 본문 | 액션 |
|---|---|---|---|---|
| `HomeScreen.kt` (`1n-2`) | `NO_RECORD` | `아직 진료 기록이 없어요` | `증상을 정리해두면 진료실에서 바로 보여줄 수 있어요` | `증상 정리하기` |
| `RecordScreen.kt` | `NO_RECORD` | `아직 진료 기록이 없어요` | `증상을 정리해두면 진료실에서 바로 보여줄 수 있어요` | `증상 정리하기` |
| `BriefCardListScreen.kt` (`1j-2`) | `NO_RECORD` | **`아직 브리핑 카드가 없어요`** | `증상을 정리해두면 진료실에서 바로 보여줄 수 있어요` | `증상 정리하기` |
| `CalendarDayScreen.kt` (`1r-2` 계열) | `NO_RECORD` | **`아직 진료 전이에요`** | `진료가 끝나면 들은 내용을 여기에 기록할 수 있어요` | **`진료 후 기록하기`** |
| `HospitalPickScreen.kt` (`1m-B`) | `NO_RESULT` | **`아직 검색 기록이 없어요`** | `병원 명을 입력하면 진료받을 병원을 찾을 수 있어요` | 없음 |

> 이전 판의 "본문만 화면마다 갈아 끼운다"는 **틀렸다.** 제목·액션도 화면마다 다르다. 그리고 `1r-2-C`의 `병원 갈 날짜를 정하면 여기에 표시돼요`는 **`strings.xml`에 존재하지 않는다** — 근거가 없어 삭제했다.

**(3) 에러 상태는 별도 컴포넌트가 없다** — `EmptyState(NO_RESULT)` + 재시도 액션으로 만든다

빈 상태와 실패 상태가 **같은 컴포넌트·같은 아이콘(`search-off`)** 을 쓴다. 웹에서도 따로 만들지 말고 같은 컴포넌트에 문구만 바꿔 넘긴다.

| 화면 | 제목 | 본문 | 액션 |
|---|---|---|---|
| `HomeScreen.kt` | `불러오지 못했어요` | `인터넷 연결을 확인하고 다시 시도해주세요` | `다시 시도` |
| `RecordScreen.kt` | `기록을 불러오지 못했어요` | 〃 | `다시 시도` |
| `RecordDetailScreen.kt` | `기록을 불러오지 못했어요` | 〃 | `다시 시도` |
| `BriefCardListScreen.kt` | `카드를 불러오지 못했어요` | 〃 | `다시 시도` |
| `BriefCardScreen.kt` | `카드를 불러오지 못했어요` | 〃 | `다시 시도` |
| `VisitDetailScreen.kt` | `기록을 불러오지 못했어요` | 〃 | `다시 시도` |
| `VisitRecordScreen.kt` | **`기록을 정리하지 못했어요`** | 〃 | `다시 시도` |

> 실패 아이콘이 `wifi-off`가 아니라 `search-off`인 것은 **의도가 아니라 `NO_RESULT`를 재사용한 결과**로 보인다. 웹에서 `OFFLINE`(`wifi-off`)으로 바꿀지는 디자인 확인 필요.

**레이아웃 (위→아래, 가운데 정렬, 세로 가운데 배치)**
1. **옅은 브랜드 원 72** (`--bg-primary-faint`, radius full) 안에 아이콘 **32** (`--fg-primary`)
2. (선택) `note` — `bodyMStrong` 15 **`--fg-primary`**, **제목보다 위**
3. 제목 `headingM` 20/600 `--fg-default`
4. 본문 `bodyM` 15 `--fg-subtle`
5. (선택) 액션

- 바깥 위아래 여백 40, 블록 간격 12. 글 묶음은 위 4를 띄우고 내부 간격 6.
- **액션은 채움 없는 글자다.** 높이 48 · radius `--r-button-m` 14 · `labelL` 15/600 · **`--fg-link`** · 좌우 여백 20.
  - 마스터는 Tonal 알약이지만 **시안의 인스턴스가 전부 채움을 지웠다.** 화면에 그려진 쪽을 따랐고 어느 쪽이 정본인지는 디자인 확인 대기.
  - **없을 수도 있다** — 화면에 이미 같은 행동을 부르는 버튼이 있으면 시안이 그 자리를 꺼 둔다(홈의 `1n-2`).
- `icon`으로 그림을 갈아 끼울 수 있다(선택 파라미터, 기본은 `type`이 정한다). 시안에서 실제로 갈아 낀 자리는 `1m-B`의 병원 아이콘이다.
- `note`가 먼저 나오도록 설계한 이유 — `OFFLINE`에서는 작성 내용이 남아 있다는 사실을 가장 먼저 알려야 한다. **다만 현재 `note`를 넘기는 화면은 없다.**
- 액션은 `actionLabel`과 `onActionClick`이 **둘 다** 있을 때만 그려진다. 하나만 주면 조용히 사라진다.

**쓰이는 화면** — `HomeScreen.kt`(`home`), `RecordScreen.kt` · `RecordDetailScreen.kt` · `BriefCardListScreen.kt` · `BriefCardScreen.kt`(`card`), `CalendarDayScreen.kt`(`calendar`), `HospitalPickScreen.kt` · `VisitDetailScreen.kt` · `VisitRecordScreen.kt`(`visit`). 9개 화면 — 이 카탈로그에서 가장 많이 쓰이는 표시 컴포넌트다.

```tsx
// 아이콘 기본값만 type이 정한다. 아래 문구 프리셋은 웹 편의용이고 Kotlin 소스에는 없다.
const EMPTY_ICON = {
  no_record: 'empty-box', no_result: 'search-off',
  offline: 'wifi-off', mic_denied: 'mic-off',
} as const;

export function MMEmptyState({ type, title, description, note, actionLabel, onActionClick, icon }: {
  type: keyof typeof EMPTY_ICON; title: string; description: string;   // title·description은 필수
  note?: string; actionLabel?: string; onActionClick?: () => void; icon?: string;
}) {
  return (
    <div className="mm-empty">
      <div className="mm-empty__circle"><Icon name={icon ?? EMPTY_ICON[type]} aria-hidden /></div>
      <div className="mm-empty__text">
        {note && <p className="mm-empty__note">{note}</p>}
        <h2 className="mm-empty__title">{title}</h2>
        <p className="mm-empty__desc">{description}</p>
      </div>
      {actionLabel && onActionClick && (
        <button type="button" className="mm-empty__action" onClick={onActionClick}>{actionLabel}</button>
      )}
    </div>
  );
}
```

```css
.mm-empty { display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: var(--s-12); width: 100%; padding-block: var(--s-40); text-align: center; }
.mm-empty__circle { width: 72px; height: 72px; display: grid; place-items: center;
  border-radius: var(--r-full); background: var(--bg-primary-faint); color: var(--fg-primary); }
.mm-empty__circle svg { width: 32px; height: 32px; }
.mm-empty__text { display: flex; flex-direction: column; gap: var(--s-6); padding-top: var(--s-4); }
.mm-empty__note  { margin: 0; font: 600 15px/24px Pretendard, sans-serif; color: var(--fg-primary); }
.mm-empty__title { margin: 0; font: 600 20px/28px Pretendard, sans-serif; letter-spacing: -.015em;
                   color: var(--fg-default); }
.mm-empty__desc  { margin: 0; font: 400 15px/24px Pretendard, sans-serif; color: var(--fg-subtle);
                   white-space: pre-line; }
.mm-empty__action { height: 48px; padding-inline: var(--s-20); border: 0; border-radius: var(--r-button-m);
  background: none; cursor: pointer; font: 600 15px/20px Pretendard, sans-serif; color: var(--fg-link); }
```

---

### 5.4 `MedicalMateBubble` — Figma `313:999`

`component/Bubble.kt`

**환자의 말을 가장 강하게 보여준다는 원칙(P5)이 가장 잘 드러나는 컴포넌트.**

| `sender` | 면 | 모양 |
|---|---|---|
| `AI`(기본) | **없음** | 위에 발화 주체 라벨(`labelS` 11 `--fg-muted`) + 본문(`bodyL` 17 `--fg-default`), 간격 4 |
| `PATIENT` | `--bg-primary-subtle` | radius `--r-md` 16, 여백 좌우 16 / 위아래 12, 본문 `bodyL` |

파라미터 — `text` · `sender`(기본 `AI`) · **`senderLabel: String? = null`**.

- **발화 주체 라벨은 컴포넌트가 들고 있지 않다.** `senderLabel`을 넘겨야 그려지고, 안 넘기면 AI 버블도 본문만 남는다. `"AI"`라는 문자열은 소스 어디에도 없다 — 호출부(`IntakeChat.kt`)가 정한다.
- `PATIENT`는 **`senderLabel`을 무시한다.** 환자 버블에는 라벨 자리가 없다.
- 최대 폭 **280** (AI 280×72, Patient 280×50이라 같다). `widthIn(max)`라 내용이 짧으면 그만큼만 차지한다.
- **AI를 브랜드 색으로 강조하지 않는다**(D4). 면색 없이 본문 + "AI" 라벨.
- **꼬리를 그리지 않는다.** 문서는 환자 버블에 꼬리를 쓴다고 적었지만 Figma 마스터에는 꼬리가 없다. 마스터를 따랐고 디자인 확인 대기.
- AI에 라벨을 붙이는 이유 — 누가 한 말인지 구분되지 않으면 환자가 AI의 정리를 자기 말로 착각한다.

**쓰이는 화면** — `IntakeChat.kt` (`intake`).

```css
.mm-bubble { max-width: 280px; }
.mm-bubble--ai { display: flex; flex-direction: column; gap: var(--s-4); }
.mm-bubble__sender { font: 500 11px/16px Pretendard, sans-serif; letter-spacing: .02em;
  color: var(--fg-muted); }
.mm-bubble--ai .mm-bubble__text { font: 400 17px/26px Pretendard, sans-serif; color: var(--fg-default); }
.mm-bubble--patient { border-radius: var(--r-md); background: var(--bg-primary-subtle);
  padding: var(--s-12) var(--s-16); font: 400 17px/26px Pretendard, sans-serif; color: var(--fg-default); }
```

---

### 5.5 `MedicalMateSourceQuote` — Figma `313:1022`

`component/SourceQuote.kt`

AI가 정리한 값 아래에 환자 원문과 수정 진입점을 **항상** 함께 둔다(P2).
정리된 문장만 보여주면 환자는 자기 말이 어떻게 바뀌었는지 확인할 수 없고, 진료실에서 틀린 내용을 그대로 의사에게 건네게 된다.

**레이아웃 (위→아래)**
1. 헤더 한 줄: `fieldLabel`(`bodyS` `--fg-subtle`, `flex:1`) + (선택) Badge **BRAND** + **Edit IconButton Size S**
2. `summary` — `headingS` 17/600
3. 원문 블록: radius `--r-sm` 12 · 면 `--bg-primary-subtle` · 여백 12 · 라벨(`labelS` `--fg-primary`) + 인용(`bodyM` 15), 간격 4

- 바깥 radius `--r-lg` 20 · 면 `--bg-surface` · 여백 16 · 간격 8.
- `editedBadge`를 주면 **1.5px `--border-primary`** 테두리가 생긴다. 의사가 AI 정리와 환자 수정을 구분할 수 있어야 한다.
- 원문 면색을 Bubble의 환자 버블과 **같은 색**으로 둔다. 화면이 달라도 "이건 내가 한 말"이라는 신호가 같아야 한다.

**현재 어느 화면에서도 호출되지 않는다** (실제 화면은 `QuoteBlock`을 쓴다).

---

### 5.6 `MedicalMateQuoteBlock`

`component/QuoteBlock.kt` — Figma 인스턴스 `735:3861`(1j-3) · `617:2744`(1q-1)

`SourceQuote` 안의 원문 블록과 **규격이 다르다.** 그쪽은 항목 하나를 감싸는 카드의 일부라 본문이 `bodyM` 15, 이쪽은 카드 안에 들어가는 인용이라 **`bodyS` 13**이다.

- radius `--r-sm` 12 · 면 `--bg-primary-subtle` · 여백 12 · 간격 4.
- 라벨 `labelS` 11 `--fg-primary` / 본문 `bodyS` 13 `--fg-default`.

**쓰이는 화면** — `card` `visit`.

```css
.mm-quote { border-radius: var(--r-sm); background: var(--bg-primary-subtle);
  padding: var(--s-12); display: flex; flex-direction: column; gap: var(--s-4); }
.mm-quote__label { font: 500 11px/16px Pretendard, sans-serif; letter-spacing: .02em; color: var(--fg-primary); }
.mm-quote__text  { font: 400 13px/20px Pretendard, sans-serif; color: var(--fg-default); }
```

---

### 5.7 `MedicalMateHospitalCard` 🆕 — Figma `1129:9195` (320×141)

`component/HospitalCard.kt`

**`MedicalMateCard`를 쓰지 않는다.** 그쪽은 여백 20에 한 덩어리인데, 이 카드는 위(정보)와 아래(칩)를 **구분선으로 나누고** 여백도 18/14/18로 다르다.

**레이아웃 (위→아래)**
1. Info: 아이콘 상자 **48** (`--bg-primary-faint`, **radius 14**) + `hospital` 아이콘 24 `--fg-primary` / 오른쪽에 이름·주소
2. `MedicalMateDivider` (좌우 여백 18)
3. Chips: 날짜 칩 N개, 간격 8

- 바깥: radius `--r-lg` 20 · 면 `--bg-surface` · 그림자 `--e-card`.
- 여백 — 위/좌우/아래 끝 **18**, Info 아래 14, Chips 위 14. 아이콘↔글 간격 **13**(스케일 밖 값).
- 이름 `bodyLStrong` 17/600 (**`headingS` 아님** — 같은 17이지만 자간 −1이라 병원 이름이 좁아 보인다).
- 주소 `bodyS` 13 `--fg-subtle`. 이름↔주소 간격 **3**.
- **주소가 없으면 그 줄을 그리지 않는다.** 병원 검색이 서버로 옮겨지면서 주소를 받을 수 없게 됐다(#155). 빈 줄을 남기면 카드가 잘린 것처럼 보인다.

**날짜 칩** (카드 안에만 있는 읽기 전용 칩. `MedicalMateChip`과 규격이 다르다 — 높이 28)

| tone | 면 | 글자 | 문구 |
|---|---|---|---|
| `PAST` | `--bg-subtle` | `--fg-subtle` | "진료" |
| `PLANNED` | `--bg-primary-subtle` | `--fg-primary` | "재방문" |

radius full · `labelM` 13/600 · 여백 좌우 10 / 위아래 **5**.
**지난 것과 예정된 것을 색으로만 나누지 않는다** — 칩의 글자가 다르다. `MedicalMateHospitalChip(label, tone)` 데이터 클래스 목록으로 받고, **문구는 호출자가 정한다**("진료"·"재방문"은 시안의 예시다).

> **칩이 없으면 구분선도 없다.** 소스가 `if (chips.isNotEmpty())`로 `Divider`와 칩 줄을 **함께** 건너뛴다. 이때 카드는 Info 한 덩어리만 남고 아래 여백은 14로 끝난다(18이 아니다). 웹에서 구분선을 항상 그리면 빈 꼬리가 생긴다.
> `address`도 `null`이거나 공백이면 줄 자체를 그리지 않는다(`isNullOrBlank`).

**쓰이는 화면** — `BriefCardScreen.kt` (`card`) **한 곳뿐이다.** 1m-B(`HospitalPickScreen.kt`)는 이 카드를 쓰지 않고 `SearchField` + `EmptyState`로 구성돼 있다 — 이전 판의 "1m-B 계열"은 근거가 없어 지웠다.

```css
.mm-hcard { border-radius: var(--r-lg); background: var(--bg-surface); box-shadow: var(--e-card);
  overflow: hidden; }
.mm-hcard__info { display: flex; align-items: flex-start; gap: 13px;
  padding: 18px 18px var(--s-14); }
.mm-hcard__icon { width: 48px; height: 48px; flex: none; display: grid; place-items: center;
  border-radius: 14px; background: var(--bg-primary-faint); color: var(--fg-primary); }
.mm-hcard__icon svg { width: 24px; height: 24px; }
.mm-hcard__name { font: 600 17px/26px Pretendard, sans-serif; color: var(--fg-default); }
.mm-hcard__addr { margin-top: 3px; font: 400 13px/20px Pretendard, sans-serif; color: var(--fg-subtle); }
.mm-hcard__sep  { height: 1px; margin-inline: 18px; background: var(--border-subtle); }
.mm-hcard__chips { display: flex; gap: var(--s-8); padding: var(--s-14) 18px 18px; }
.mm-hcard__chip { border-radius: var(--r-full); padding: 5px var(--s-10);
  font: 600 13px/18px Pretendard, sans-serif; }
.mm-hcard__chip--past    { background: var(--bg-subtle);         color: var(--fg-subtle); }
.mm-hcard__chip--planned { background: var(--bg-primary-subtle); color: var(--fg-primary); }
```

---

### 5.8 `MedicalMateDoctorCard` — Figma `333:1155`

`component/DoctorCard.kt`

`MedicalMateCard`(**`onClick` 파라미터를 그대로 넘긴다** — 주면 누를 수 있는 카드) 안에 가로 한 줄로 조립한다.
따라서 바깥 규격은 Card 그대로다 — radius 20 · `--bg-surface` · `--e-card` · 여백 20 · **최소 높이 116**.

`Avatar(DOCTOR)` → `[이름 / 진료과 / 가능시각]` → `Badge`. 간격 12, 세로 가운데 맞춤, 글 묶음 내부 간격 4.

아바타에는 **`name`을 통째로 넘긴다**(`initial = name`). 첫 글자만 잘라내는 것은 Avatar 쪽 일이다(`initial.take(1)`).
파라미터 — `name` · `specialty` · `hours` · `statusLabel`(넷 다 필수) · `state`(기본 `AVAILABLE`) · `onClick`.

| | 스타일 | AVAILABLE | CLOSED |
|---|---|---|---|
| 이름 | `headingS` 17 | `--fg-default` | 그대로 |
| 진료과 | `bodyM` 15 | `--fg-subtle` | 그대로 |
| 가능시각 | `bodyS` 13 | **`--fg-success`** | **`--fg-muted`** |
| Badge | — | `SUCCESS` | `NEUTRAL` |

**닫힘 상태에서도 정보는 그대로 유지하고 가능 시각 줄만 가라앉힌다.** 이름과 진료과를 함께 흐리면 환자가 어느 병원을 봤는지 기억하지 못한다.
`statusLabel`을 따로 받는 이유 — 색만 바뀌면 D11 위반이라 낱말로도 상태를 알린다.

**현재 어느 화면에서도 호출되지 않는다.**

---

### 5.9 `MedicalMateAvatar` — Figma `311:839`

`component/Avatar.kt`

- **44 원형**(기본). `size`로 바꿀 수 있다 — Figma 홈 헤더 인스턴스가 **36**이라 파라미터로 열었다.
- `initial`은 이름의 첫 글자 1자(`initial.take(1)`). 글자 `bodyLStrong` 17/600.

| `type` | 면 | 글자 |
|---|---|---|
| `PATIENT`(기본) | `--bg-primary-subtle` | `--fg-primary` |
| `DOCTOR` | `--bg-subtle` | `--fg-subtle` |

- `contentDescription`을 주지 않으면 **접근성 트리에서 지운다**(`aria-hidden`). 이름이 옆에 함께 나오는 자리에서 같은 이름을 두 번 읽으면 소리만 길어진다.
- **`onClick`을 받는다**(`onClick: (() -> Unit)? = null`). 주면 누를 수 있는 `Surface`가 되고, 없으면 정적 면이다 — Card와 같은 구조다. 이전 판이 빠뜨린 파라미터다. 웹에서도 `onClick` 유무로 `<button>` / `<div>`를 가른다.
- 44는 48보다 작다. **터치 목표는 호출자가 바깥에서 확보한다.** `onClick`을 줘도 컴포넌트가 hit area를 넓히지 않는다 — 아바타 자체가 넓히면 헤더 배치가 어긋난다.
- 사진이 들어오면 여기에 이미지 슬롯을 추가한다(현재는 이니셜만).

**쓰이는 화면** — `HomeComponents.kt`(`home`), `MyProfileScreen.kt`(`profile`).

```css
.mm-avatar { width: 44px; height: 44px; border-radius: var(--r-full);
  display: grid; place-items: center; font: 600 17px/26px Pretendard, sans-serif; }
.mm-avatar--patient { background: var(--bg-primary-subtle); color: var(--fg-primary); }
.mm-avatar--doctor  { background: var(--bg-subtle);         color: var(--fg-subtle); }
```

---

### 5.10 `MedicalMateDateCell` — Figma `335:1188` (v2, 46→42)

`component/DateCell.kt`

7열 캘린더의 한 칸. **원이 아니라 radius 13의 둥근 사각형.**

**세 가지가 서로 다른 뜻이라 표시 방법도 다르다**

| 축 | 표시 |
|---|---|
| `selected` | **채움** `--bg-primary`, 글자 `--fg-on-primary` |
| `isToday` | **옅은 면** `--bg-primary-faint` + **1px `--border-primary`** 테두리. 채움이 아니다 |
| `marker=RECORD` | 숫자 아래 **채운 점 5px** |
| `marker=PLANNED` | 숫자 아래 **빈 원 5px**(1px ring) |
| disabled | 면 `--bg-surface`, 글자 `--fg-disabled` |

- 셋이 겹칠 수 있다. `selected`면 today 테두리는 생략한다(채움이 이미 그 칸을 가리킨다).
- **`enabled = false`가 selected·today를 모두 덮는다.** 소스의 `cellBackground`는 `selected && enabled` → `isToday && enabled` → `bgSurface` 순이고 `todayBorder`도 `isToday && !selected && enabled`다. 즉 **꺼진 칸은 고른 칸이어도 흰 면에 `--fg-disabled` 글자**만 남는다. 웹 CSS에서 `:disabled`를 `.is-selected`보다 **뒤에** 선언해야 한다.
- 점 색: 선택 칸에서는 `--fg-on-primary`, 아니면 `--bg-primary`. **`enabled`는 점 색에 반영되지 않는다**(꺼진 칸에도 브랜드색 점이 남는다 — 소스 그대로).
- 크기 **42**(`MedicalMateDateCellSize`), 시트 안 **34**(`MedicalMateDateCellSizeCompact`). 둘 다 `public`이고 **격자의 빈 칸도 같은 값으로 `Box`를 채워 요일을 맞춘다**(`CalendarMonthScreen.kt:291`, `ScheduleAddSheets.kt:179`). 웹에서도 빈 칸에 같은 크기의 placeholder를 둔다.
  - `DateCell.kt`의 KDoc은 "시트 34는 아직 그 자리가 없다"고 적었지만 **`ScheduleAddSheets.kt:175`가 실제로 쓰고 있다.** 주석이 오래됐고 코드가 맞다.
- 숫자 `bodyMStrong` 15/600. 숫자↔점 간격 **3**.
- **42는 48보다 작다.** 7열 캘린더에서 칸마다 48을 넣으면 360 폭에 들어가지 않는다. 이 컴포넌트는 **시각 크기만 담당하고 hit test는 그리드가 칸 사이 여백까지 포함해 처리한다.**
  → 웹에서는 그리드 셀(`1fr`)에 클릭을 걸고 안쪽에 42px 박스를 가운데 두는 방식으로 옮긴다.
- 접근성 이름: `"12, 오늘, 기록 있음"` 형태로 한 번에 읽는다. 문구는 `오늘` / `기록 있음` / `예정`.

> **빈 원(PLANNED)은 Date Cell 마스터에 없다.** 시안 `1r-1`이 그렇게 쓰고 범례까지 두고 있어 화면을 따랐다. variant 추가는 디자인 트랙 대기.

**쓰이는 화면** — `CalendarMonthScreen.kt` · `ScheduleAddSheets.kt` (`calendar`).

```tsx
export function MMDateCell({ day, selected, isToday, marker = 'none', enabled = true, onClick, size = 42 }: {
  day: number; selected: boolean; isToday?: boolean;
  marker?: 'none'|'record'|'planned'; enabled?: boolean; onClick: () => void; size?: 42|34;
}) {
  const label = [day, isToday && '오늘',
    marker === 'record' ? '기록 있음' : marker === 'planned' ? '예정' : null]
    .filter(Boolean).join(', ');
  return (
    <button type="button" onClick={onClick} disabled={!enabled} aria-label={label}
      aria-pressed={selected} style={{ '--cell': `${size}px` } as React.CSSProperties}
      className={`mm-datecell${selected ? ' is-selected' : ''}${isToday ? ' is-today' : ''}`}>
      <span className="mm-datecell__n">{day}</span>
      {marker !== 'none' && <i className={`mm-datecell__dot mm-datecell__dot--${marker}`} />}
    </button>
  );
}
```

```css
/* 그리드가 hit area를 든다 */
.mm-calendar__grid { display: grid; grid-template-columns: repeat(7, 1fr); }
.mm-calendar__grid > * { justify-self: center; }

.mm-datecell { width: var(--cell, 42px); height: var(--cell, 42px);
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px;
  border: 0; border-radius: var(--r-date-cell); background: var(--bg-surface);
  color: var(--fg-default); cursor: pointer; }
.mm-datecell__n { font: 600 15px/24px Pretendard, sans-serif; }
.mm-datecell.is-today { background: var(--bg-primary-faint);
  box-shadow: inset 0 0 0 1px var(--border-primary); }
.mm-datecell.is-selected { background: var(--bg-primary); color: var(--fg-on-primary);
  box-shadow: none; }
/* disabled가 selected·today를 모두 덮는다 — 반드시 뒤에 선언한다 */
.mm-datecell:disabled { background: var(--bg-surface); color: var(--fg-disabled);
  box-shadow: none; }
.mm-datecell__dot { width: 5px; height: 5px; border-radius: 50%; background: var(--bg-primary); }
.mm-datecell__dot--planned { background: none; box-shadow: inset 0 0 0 1px var(--bg-primary); }
.mm-datecell.is-selected .mm-datecell__dot { background: var(--fg-on-primary); }
.mm-datecell.is-selected .mm-datecell__dot--planned { background: none;
  box-shadow: inset 0 0 0 1px var(--fg-on-primary); }
```

---

### 5.11 행 계열 — `KV Row` `333:1100` · `List Row` `335:1114` · `Section Header` `334:1156` · `Divider` `333:1088`

`component/Rows.kt`

#### `MedicalMateKvRow`

의사가 훑어보는 자리. **key 열을 72로 고정해서 값이 세로로 정렬된다.** 정렬이 깨지면 여러 행을 눈으로 훑는 속도가 떨어진다.

| `type` | 값 스타일 | 값 색 | 추가 |
|---|---|---|---|
| `DEFAULT` | `bodyL` 17 | `--fg-default` | — |
| `EMPHASIS` | `bodyLStrong` 17/600 | `--fg-default` | **카드당 최대 하나** |
| `LINK` | `bodyL` | `--fg-link` | — |
| `EDITING` | `bodyL` | `--fg-default` | 값 아래 **1px `--border-strong`** 밑줄 |

- 행 높이 min **54**. key↔value 간격 16. key는 `bodyM` 15 `--fg-subtle`, 폭 **72 고정**.
- `EDITING`은 밑줄만 그린 읽기 값일 수도 있고(`onValueChange` 없음), 그 자리에서 고치는 입력일 수도 있다.

**이전 판이 빠뜨린 파라미터 두 가지**

```ts
interface MMKvRowProps {
  key: string; value: string;
  type?: 'default'|'emphasis'|'link'|'editing';   // 기본 default
  onClick?: () => void;        // ← 누락돼 있던 것. 주면 행 전체가 눌린다
  onValueChange?: (v: string) => void;
}
```

- **`onClick`** — 주면 행이 `Surface(onClick)`으로 감싸이고 **면이 `--bg-surface`로 칠해진다.** 안 주면 면이 없는 `Box`다. 즉 누를 수 있는 KV 행만 흰 면을 갖는다. 웹에서 `onClick` 유무로 `<button class="mm-kvrow is-clickable">` / `<div class="mm-kvrow">`를 가르고 배경도 함께 건다.
- **`onValueChange`는 `type === 'editing'`일 때만 적용된다.** 소스가 `onValueChange.takeIf { type == EDITING }`으로 거른다. `DEFAULT`에 콜백을 넘겨도 입력이 되지 않고 조용히 읽기 텍스트로 남는다. 웹에서도 같은 게이트를 넣어 두 곳이 갈리지 않게 한다.
- 밑줄(`--border-strong` 1px)도 `EDITING`에서만 그려진다. 밑줄은 **값 칸 폭 전체**(`fillMaxWidth`)에 걸린다.
- 인라인 편집에서 `Text Field`를 쓰지 않는다 — 면을 채우면 행 높이가 늘어나 다른 KV Row와 정렬이 어긋난다.
- **읽기/편집 두 경우의 글자 모양이 같아야 한다.** 수정으로 열릴 때 글자가 움직이면 무엇이 바뀐 것인지 알기 어렵다.

#### `MedicalMateEditingKvRow`

편집 모드 행 = `KvRow(EDITING, flex:1)` + **삭제 × (Size S, 32/18)**.
× 를 `KvRow` 안에 넣지 않는다 — 그 컴포넌트는 key 열 72 고정이 일이고, 오른쪽에 버튼이 들어가면 값 폭이 행마다 달라진다. **값의 밑줄은 그만큼 짧아지고 시안도 그렇게 그려져 있다.**
**쓰이는 화면** — `card`(1e-1-E), `visit`(1q-1-E).

#### `MedicalMateListRow`

| `type` | chevron | badge |
|---|---|---|
| `DEFAULT` | `onClick` 있으면 표시 | 없음 |
| `BADGE` | 있으면 표시 | **제목 바로 옆** |
| `PLAIN` | **없음** | 없음 |

- **줄이 카드 모양으로 뜬다** — radius `--r-md` 16 · 면 `--bg-surface` · 그림자 `--e-card`.
- 행 높이 min **79**. 여백 왼쪽 **18** / 오른쪽 **14**. 요소 간격 12.
- 제목 `headingS` 17/600(`bodyL`은 같은 17이지만 Regular라 제목이 메타와 같은 무게로 읽힌다).
- 제목↔배지 간격 **6**, 같은 줄. **오른쪽 끝에 두지 않는다** — chevron과 나란히 서면 누르는 것으로 보이고, 제목이 길어질 때 어느 줄의 상태인지 흐려진다.
- 메타 `bodyS` 13 `--fg-subtle`, 제목과 간격 4.
- chevron `chevron-right` 20, tint **`--fg-muted`**. 조건은 `type !== 'plain' && onClick != null` **둘 다**다 — `DEFAULT`여도 `onClick`이 없으면 chevron이 없다.
- 배지는 `type === 'badge' && badge != null`일 때만 그려진다. `DEFAULT`에 `badge`를 넘기면 무시된다(위 표의 "BADGE | 있으면 표시"는 `type`이 `BADGE`일 때 이야기다).
- 면·그림자(`--bg-surface` + `--e-card`)는 **`onClick` 유무와 무관하게 항상** 걸린다. KvRow와 다른 점이다.
- `meta`는 선택이다(`meta: String? = null`). 없으면 제목 한 줄만 그리고 행 높이 79는 유지된다.
- `badgeTone`: 완료는 `SUCCESS`, 남은 일수처럼 브랜드 정보는 `BRAND`, 기본 `NEUTRAL`.

**쓰이는 화면** — `calendar` `card` `home` `intake`.

```css
.mm-listrow { display: flex; align-items: center; gap: var(--s-12); width: 100%;
  min-height: 79px; padding: 0 14px 0 18px; border: 0; border-radius: var(--r-md);
  background: var(--bg-surface); box-shadow: var(--e-card); text-align: left; }
.mm-listrow__title { display: flex; align-items: center; gap: var(--s-6);
  font: 600 17px/24px Pretendard, sans-serif; letter-spacing: -.01em; color: var(--fg-default); }
.mm-listrow__meta { margin-top: var(--s-4); font: 400 13px/20px Pretendard, sans-serif;
  color: var(--fg-subtle); }
.mm-listrow > svg { width: 20px; height: 20px; color: var(--fg-muted); flex: none; }
```

#### `MedicalMateSectionHeader`

제목 + 우측 슬롯 한 줄. **위 여백 24, 아래 10.** 세로 가운데 맞춤.

- 제목 `headingM` 20/600 `--fg-default`.
- 오른쪽은 **두 갈래다**:
  - `actionLabel` — 누르는 링크. `bodyMStrong` 15/600 **`--fg-link`**, 위아래 여백 8(터치 높이 40).
  - `caption` — 읽기만 하는 표시. 같은 스타일에 **`--fg-subtle`**. 1r-4가 "선택 안 함"·"1개"를 이렇게 적는다.
- **둘을 함께 주지 않는다.** 한 자리라 뒤에 오는 것이 앞을 덮는다.
- 액션은 버튼이 아니라 글자다. Ghost 버튼을 쓰면 좌우 여백이 붙어 오른쪽 끝이 콘텐츠 가장자리에서 안으로 들어간다.

**쓰이는 화면** — `calendar` `card` `home` `intake` `profile`.

#### `MedicalMateDivider`

1px `--border-subtle`, 폭 100%.
**고밀도 목록 사이에만 쓴다.** 목록 구분은 우선 여백으로 해결하고, 인터랙션 행의 경계에는 쓰지 않는다.
**쓰이는 화면** — `card` `intake` `visit`, `HospitalCard` 내부.

---

### 5.12 `MedicalMateSelectBar` 🆕 — Figma `1129:9200` (320×40)

`component/SelectBar.kt`

편집 모드에서 몇 건을 골랐는지 알리는 줄. 목록 위에 놓인다.

- 면 `--bg-primary-faint` · radius `--r-sm` 12 · 여백 좌우 14 / 위아래 10 · 폭 100%.
- 글자 `bodySStrong` 13/600 `--fg-primary`.
- **개수를 문장으로 받는다.** 세는 규칙이 화면마다 다르고(카드는 "장", 기록은 "건") 복수형도 없어서, 컴포넌트가 숫자를 문장으로 만들면 문구를 여기서 정하게 된다.

> 마스터에는 채움이 묶여 있지 않은데 `1j-4-D2`(`1122:5033`) 인스턴스가 `#F2F4FE`로 칠해져 있어 토큰으로 넣었다.

**현재 어느 화면에서도 호출되지 않는다.**

```css
.mm-selectbar { width: 100%; padding: var(--s-10) var(--s-14); border-radius: var(--r-sm);
  background: var(--bg-primary-faint); color: var(--fg-primary);
  font: 600 13px/20px Pretendard, sans-serif; }
```

---

## 6. 진행 · 로딩 · 툴팁

### 6.1 `MedicalMateOnboardingProgress` 🆕 — Figma `1155:854`

`component/OnboardingProgress.kt`

**점 4개 중 현재 것만 알약으로 늘어난다.** 온보딩 **화면 넘김**을 알린다.

| 요소 | 값 |
|---|---|
| 점 | **6 × 6** · radius full · `--bg-subtle` |
| 현재 점 | **20 × 6** · `--bg-primary` |
| 간격 | 8 |
| 전체 | 72 × **24** |

- **지나온 점도 채우지 않는다.** 작업 진행률이 아니라 몇 번째 화면인지를 알린다. 되돌아갈 수 있다.
- 숫자도 없다. 읽고 넘기는 소개 화면에 진행률을 붙이면 남은 분량을 재촉하는 것으로 읽힌다.
- 접근성: `"2/4 단계"`로 한 번만 읽는다(`progress_step` = `"%1$d/%2$d 단계"`). 점을 하나씩 읽지 않는다.
- **늘어나는 것은 애니메이션으로 잇는다.** 끊어지면 어느 점이 현재인지 눈으로 따라가지 못한다. 기기에서 애니메이션을 끄면 즉시 바뀐다.

**쓰이는 화면** — `OnboardingScreen.kt` (`profile`).

```tsx
export const MMOnboardingProgress = ({ current, total = 4 }: { current: number; total?: number }) => (
  <div className="mm-onb" role="img" aria-label={`${current}/${total} 단계`}>
    {Array.from({ length: total }, (_, i) => (
      <i key={i} className={`mm-onb__dot${i + 1 === current ? ' is-on' : ''}`} />
    ))}
  </div>
);
```

```css
.mm-onb { display: flex; align-items: center; gap: var(--s-8); min-height: 24px; }
.mm-onb__dot { width: 6px; height: 6px; border-radius: var(--r-full); background: var(--bg-subtle);
  transition: width .2s ease, background-color .2s ease; }
.mm-onb__dot.is-on { width: 20px; background: var(--bg-primary); }
@media (prefers-reduced-motion: reduce) { .mm-onb__dot { transition: none; } }
```

---

### 6.2 `MedicalMateProgressIndicator` — Figma `334:1139`

`component/ProgressIndicator.kt`

`OnboardingProgress`와 **역할이 다르다.** 이쪽은 **작업 진행률**이라 지나온 칸이 채워지고 `n/총` 숫자가 붙는다.

| | Progress Indicator | Onboarding Progress |
|---|---|---|
| 형태 | 가로 막대 | 점 4개 |
| 현재 위치 | 채워진 길이 | 현재 점만 pill |
| 쓰임 | 신상정보 · 문답 등 작업 진행 | 온보딩 화면 넘김 |

**기본형** — 막대(`flex:1`) + 숫자(`labelM` 13 `--fg-subtle`), 간격 12, 높이 min 34.
> 기본형에서 **눈에 보이는 글자가 `"3/4 단계"`다.** 소스가 접근성 문자열(`progress_step`)을 그대로 화면에도 쓴다. 라벨형의 `"1 / 3"`(`progress_step_count`)과 다른 문자열이니 웹에서 하나로 합치지 않는다.
> 라벨형에는 **`min-height: 34px`가 걸리지 않는다**(기본형에만 있다).

**라벨형** (`label`을 주면) — 위 줄에 `label`(`bodyS` `--fg-subtle`, `flex:1`) + `"1 / 3"`(`bodySStrong` **`--fg-primary`**), 아래에 막대. 세로 간격 8.
> 보이는 표기는 `"1 / 3"`(`progress_step_count`), 읽어주는 문구는 `"1/3 단계"`(`progress_step`). 눈으로는 숫자만 있으면 되고, 소리로는 무엇의 숫자인지가 필요하다.

**막대** — 트랙 높이 **6**, radius full. 채움 `--bg-primary`, 빈 칸 `--bg-subtle`.
- `total ≤ 6`이면 **칸 분할**(간격 4), `total > 6`이면 **연속 막대**. 칸이 잘게 쪼개지면 콘텐츠 폭 320에서 진행이 보이지 않는다.
- 칸 분할에서 채워지는 조건은 `index < current`다 — **`current`번째 칸까지 채운다**(0-base 아님).
- 기본 `total = 4`. `current`가 `1..total` 밖이면 `require` 예외다.
- 접근성: `"3/4 단계"`로 한 번만 읽는다. 라벨형은 `"신상정보, 3/4 단계"`(라벨 + `, ` + 단계).

**쓰이는 화면** — `IntakeScreen.kt`(`intake`), `ProfileSetupScreen.kt`(`profile`).

```css
.mm-progress { display: flex; align-items: center; gap: var(--s-12); min-height: 34px; }
.mm-progress__bar { display: flex; gap: var(--s-4); flex: 1; }
.mm-progress__seg { flex: 1; height: 6px; border-radius: var(--r-full); background: var(--bg-subtle); }
.mm-progress__seg.is-filled { background: var(--bg-primary); }
.mm-progress__count { font: 600 13px/18px Pretendard, sans-serif; color: var(--fg-subtle); }
```

---

### 6.3 `MedicalMateLoadingSpinner` / `MedicalMateLoadingSkeleton` — Figma `335:1175`

`component/Loading.kt`

**Spinner**
- 원 24(`--icon-lg`), 색 `--bg-primary`. 최소 높이 **116**, 여백 20, 가운데 정렬, 메시지와 간격 12.
- **2초 이상 걸릴 것 같으면 `message`에 무슨 일을 하는 중인지 적는다.** 돌아가는 원만 보이면 앱이 멈춘 것인지 판단할 근거가 없다. 메시지는 `bodyM` 15 `--fg-subtle`.
- 실패 시 복구 행동은 호출자 몫. 이 컴포넌트는 진행 중만 그린다.

**Skeleton**
- 줄 높이 **16**, radius `--r-xs` 8, 면 `--bg-subtle`, 줄 간격 12. 최소 높이 116, 여백 20.
- 기본 줄 폭 비율 `[0.6, 1.0, 0.8]` (제목 한 줄 + 본문 두 줄).
- `lineWidthFractions`에 **실제로 들어올 줄의 폭 비율**을 준다. 뼈대와 실제 내용의 모양이 다르면 로딩이 끝나는 순간 화면이 덜컥 움직인다.
- **반짝임(shimmer)을 넣지 않았다.** 움직임 축소 설정을 읽어 끄는 처리가 추가로 필요해서 정지 상태로 뒀다. → 웹에서 shimmer를 넣고 싶다면 반드시 `prefers-reduced-motion` 분기를 함께 만든다.
- 접근성: **`loadingDescription`이 필수 파라미터다.** `"불러오는 중"`은 컴포넌트가 들고 있는 문구가 아니라 호출자가 넘기는 문자열이고, 그 값으로 `clearAndSetSemantics`를 건다(= 내부 막대는 전부 읽히지 않는다). 웹은 `aria-label={loadingDescription}` + 내부 `aria-hidden`.
- Spinner 쪽은 반대로 `message`가 **선택**이다. 없으면 원만 그린다.

**쓰이는 화면** — Spinner: `BriefCardListScreen.kt` · `BriefCardScreen.kt` · `RecordDetailScreen.kt` · `RecordScreen.kt`(`card`), `HealthEditScreen.kt`(`profile`), `VisitDetailScreen.kt` · `VisitRecordScreen.kt`(`visit`) — 7개 화면.
Skeleton은 **현재 호출되지 않는다.**

```css
.mm-skeleton { display: flex; flex-direction: column; gap: var(--s-12);
  min-height: 116px; padding: var(--s-20); }
.mm-skeleton i { height: 16px; border-radius: var(--r-xs); background: var(--bg-subtle); display: block; }
```

---

### 6.4 툴팁 3종 — `Tooltip` `542:1295` · `Tooltip Bubble` `575:1287` · `TooltipTrigger`

`component/Tooltip.kt` · `TooltipBubble.kt` · `TooltipTrigger.kt`

**트리거(48 고정)와 말풍선을 분리했다.** 트리거가 레이아웃을 밀지 않아야 한다.

#### `MedicalMateTooltipTrigger`
- hit area **48**, Active 채움 **32**(`--bg-primary-faint`), 아이콘 `info` **24**.
- 아이콘 색은 **두 상태 모두 `--fg-default`**다. Active에서 글자색이 바뀌지 않는 점이 IconButton Tonal과 다르다.
- 열림 여부를 `expand`/`collapse` semantics로 알린다 → 웹은 `aria-expanded`.

#### `MedicalMateTooltipBubble`
- 본문 **180×36** (최대 폭 180, 넘으면 줄바꿈). radius **10**(스케일 밖). 면 **`--bg-inverse-soft` `#3A4053`**(Toast보다 옅다). 글자 `--fg-on-inverse` `labelS` 11.
- 여백 좌우 12 / 아래 10 / 위 = **꼬리 높이 10 + 10**.
- 꼬리 **16×10**, 위를 가리키고 **중심이 오른쪽 끝에서 24**.
- 꼬리를 별도 요소로 얹지 않고 도형에 넣었다(같은 색 요소를 겹치면 경계에 얇은 선이 보인다). → 웹은 `clip-path` 또는 `::after` + 같은 배경색 회전 사각형으로 만든다.

#### `MedicalMateTooltip` (묶음)
- 트리거 **아래에 오른쪽을 맞춰** 붙인다. 꼬리가 끝에서 24 지점에 있어서 오른쪽을 맞추면 꼬리가 트리거를 가리킨다.
- 트리거 하단에서 간격 **2**, 화면 오른쪽 끝에서 최소 **20** 남긴다.
- **말풍선을 Popup(별도 레이어)으로 띄운다.** 같은 레이아웃 안에서 겹치면 감싸는 상자가 말풍선 높이만큼 커져서 아래 내용이 밀린다(#71, 신상정보 알러지 단계에서 칩이 내려갔다).
  → **웹에서는 `position: absolute` + `overflow: visible`이면 같은 문제가 없다.** Popover API나 floating-ui를 쓰면 화면 밖 넘침 처리까지 함께 해결된다.
- 말풍선 밖을 누르면 닫힌다. 열어 둔 채로 화면을 계속 쓰는 안내가 아니다.

**쓰이는 화면** — `BriefCardBlock.kt`(`card`), `ProfileSetupScreen.kt`(`profile`), `VisitRecordCard.kt` · `VisitNoteScreen.kt`(**둘 다 `visit`** — `VisitRecordCard.kt`의 경로가 `visit/ui/`다).

> **`MedicalMateTooltip`(묶음)의 파라미터는 `text`·`contentDescription` 둘뿐이다.** 열림 상태를 안에서 `remember`로 들고 있어 호출자가 제어할 수 없다(비제어 컴포넌트). `arrowOffsetFromEnd`도 묶음 쪽에서 넘기지 않아 **항상 기본 24**다. 웹에서도 `open`을 props로 올리지 말고 내부 상태로 두는 쪽이 안드로이드와 같다.
> `TooltipTrigger`도 IconButton과 같은 구조적 함정이 있다 — 바깥 `Box`가 48을 **자리만** 잡고 실제 클릭은 32 `Surface`가 받는다. 웹에서는 `::after` 확장으로 진짜 48을 만든다.

```css
.mm-tooltip { position: relative; display: inline-block; }
.mm-tooltip__trigger { width: 48px; height: 48px; display: grid; place-items: center;
  border: 0; background: none; cursor: pointer; color: var(--fg-default); }
.mm-tooltip__trigger svg { width: 24px; height: 24px; }  /* icon/lg — 두 상태 모두 fg/default */
.mm-tooltip__trigger i { width: 32px; height: 32px; display: grid; place-items: center;
  border-radius: var(--r-full); }
.mm-tooltip__trigger[aria-expanded="true"] i { background: var(--bg-primary-faint); }
.mm-tooltip__bubble { position: absolute; top: calc(100% + 2px); right: 0; z-index: 10;
  max-width: 180px; padding: 20px var(--s-12) var(--s-10); border-radius: 10px;
  background: var(--bg-inverse-soft); color: var(--fg-on-inverse);
  font: 500 11px/16px Pretendard, sans-serif; letter-spacing: .02em; }
.mm-tooltip__bubble::before { content: ''; position: absolute; top: 0; right: 24px;
  width: 16px; height: 10px; transform: translateX(50%);
  background: var(--bg-inverse-soft); clip-path: polygon(50% 0, 100% 100%, 0 100%); }
```

---

## 7. 로그인 · 로고

### 7.1 `MedicalMateSocialLoginButton` / `Stack` — Figma `383:1302` / `383:1303`

`component/SocialLoginButton.kt` · `BrandColor.kt`

**색은 각 사 공식 브랜드 가이드가 정한 값이고 변경이 금지된다.** 디자인 시스템의 브랜드 가이드 예외다.

| provider | container | label | border |
|---|---|---|---|
| `KAKAO` | `#FEE500` | `#191600` | 없음 |
| `NAVER` | `#03C75A` | `#FFFFFF` | 없음 |
| `APPLE` | `#000000` | `#FFFFFF` | 없음 |
| `GOOGLE` | `#FFFFFF` | `#1F1F1F` | 1px `#747775` |

```ts
interface MMSocialLoginButtonProps {
  provider: 'kakao'|'naver'|'apple'|'google';
  label: string;               // 필수 — 문구를 컴포넌트가 들지 않는다
  contentDescription: string;  // 필수 — 라벨과 다른 문장을 준다
  onClick: () => void;
  enabled?: boolean;           // 기본 true
  inProgress?: boolean;        // 기본 false. true면 enabled와 무관하게 눌리지 않는다
}
```

- 컨테이너 폭은 `fillMaxWidth` + 높이 min 56(`--control-lg`)다. **Figma의 350은 콘텐츠 폭이지 고정 폭이 아니다** — 웹에서 `width: 350px`를 박지 않는다. radius `--r-md` **16**, 라벨 `labelL` 15/600, 가운데 정렬, 좌우 여백 16, 간격 10.
  - 카카오 가이드는 radius 12를 적지만 **DESIGN.md가 16으로 정했고 #39에서 문서 값으로 결정**했다.
- 카카오 심볼만 공식 키트에서 받아 넣었다(**20 × 18.67**, 가로세로가 달라 `size` 하나로 못 쓴다). 나머지 셋은 라벨만.
- `inProgress`면 심볼·라벨 대신 스피너 20(stroke 2), 버튼 비활성.
- `contentDescription`을 따로 받는다. 라벨이 "카카오 로그인"이어도 스크린 리더에는 "카카오로 로그인"처럼 동작이 드러나는 문장이 낫다.
- **Naver 조합(`#03C75A` 면에 흰 글자)은 WCAG 대비 기준을 벗어난다.** 공식 규격 때문이며, 다른 안내 요소는 기준을 지킨다.

- `inProgress`면 심볼·라벨이 **함께 사라지고** 스피너 20(stroke 2)만 남는다. 라벨이 없어지므로 **접근성 이름은 `contentDescription`이 유일한 단서**가 된다 — 웹에서 `aria-label`을 `inProgress`에도 그대로 유지한다.
- 심볼은 `provider.symbol`이 있을 때만 그린다. 현재 **카카오만 있다**(`ic_kakao_symbol`). 나머지 셋은 라벨만.

**Stack** — 카카오 → 네이버 → Apple 세로 순서, 간격 **10**, 폭 Fill에 좌우 거터 20.
`providers`를 받는 이유 — **백엔드가 지금 카카오만 지원한다**(`User` 식별자가 `kakaoId` 단독). 동작하지 않는 버튼을 그려두면 사용자가 눌러보고 실패한다.

> **✅ 정정 — 이 컴포넌트는 실제로 쓰인다.** 이전 판이 "어느 화면에서도 호출되지 않는다(로그인 화면 구현 전)"고 적었지만 **`auth/ui/LoginScreen.kt:119`가 `MedicalMateSocialLoginButton(provider = MedicalMateSocialProvider.KAKAO, ...)`로 호출한다.** 로그인 화면은 구현돼 있다.
> 다만 **`MedicalMateSocialLoginStack`은 여전히 호출되지 않는다** — 화면이 Stack을 거치지 않고 카카오 버튼 하나를 직접 놓는다. 웹에서도 Stack을 먼저 만들 이유가 없다.

**쓰이는 화면** — Button: `LoginScreen.kt` (`auth` — 이 카탈로그가 다루지 않던 여섯 번째 영역이다). Stack: 없음.

```css
.mm-social { display: flex; align-items: center; justify-content: center; gap: var(--s-10);
  width: 100%; min-height: var(--control-lg); padding-inline: var(--s-16);
  border: 0; border-radius: var(--r-md); cursor: pointer;
  font: 600 15px/20px Pretendard, sans-serif; }
.mm-social--kakao  { background: #FEE500; color: #191600; }
.mm-social--naver  { background: #03C75A; color: #FFFFFF; }
.mm-social--apple  { background: #000000; color: #FFFFFF; }
.mm-social--google { background: #FFFFFF; color: #1F1F1F; border: 1px solid #747775; }
.mm-social__symbol { width: 20px; height: 18.67px; }
.mm-social-stack { display: flex; flex-direction: column; gap: var(--s-10); width: 100%; }
```

---

### 7.2 `MedicalMateLogo.Symbol` `351:1281` / `MedicalMateLogo.Lockup` `351:1303`

`MedicalMateLogo.kt` — 컴포저블이 아니라 drawable 상수 묶음이다.

| 키 | 리소스 | 쓰임 |
|---|---|---|
| `Symbol` | `ic_logo_symbol` | UI 안 기본형. `primary/600` 면에 흰 마크 |
| `SymbolGradient` | `ic_logo_symbol_gradient` | **앱 아이콘과 스플래시 전용** |
| `Mark` | `ic_logo_mark` | 배경 없는 마크. 원본 색 `--fg-primary`, tint로 바꾼다 |
| `Lockup` | `ic_logo_lockup` | 심볼 36 + 워드마크. **139×36** |
| `MarkUpper` / `MarkLower` | `ic_logo_mark_upper` / `_lower` | 신상정보 완료(`1b-4`) 모션용 두 조각 |

- 기본 크기 심볼 48, **최소 24**. 보호 여백은 심볼 높이의 1/4을 사방에.
- 비율 고정. 찌그러뜨리거나 회전하지 않는다. 락업은 **가로 조합만**.
- `Subtle`(옅은 면 위) = `bg/primary-subtle` 면에 `fg/primary` 마크. `Mono Light`(어두운 면 위) = 흰 마크. 별도 자산을 두지 않고 `Mark` + tint로 만든다.
- 웹에서는 SVG 6개로 내보내고 `Mark`만 `fill: currentColor`로 바꿔 tint를 쓴다.

**금지 시각 요소** — 십자 · 알약 · 체온계 · 웃는 얼굴 캐릭터.

---

## 8. 58종 전체 인덱스

`✓` = 코드 스케치 있음. `—` = 현재 화면에서 호출되지 않음(컴포넌트만 존재).

| # | 컴포넌트 | Figma | 소스 | 핵심 변이 | 쓰이는 영역 | 코드 |
|---|---|---|---|---|---|---|
| 1 | `MedicalMateButton` | `291:670` | `Button.kt` | type 5 × size 3 | 전 영역 | ✓ |
| 2 | `MedicalMateIconButton` | `298:715` | `IconButton.kt` | style 4 × size 3 | calendar home intake profile | ✓ |
| 3 | `MedicalMateBottomCtaBar` | `294:652` | `BottomCtaBar.kt` | Glass / Opaque | calendar card intake profile visit | ✓ |
| 4 | `MedicalMateChip` | `311:823` | `Chip.kt` | selected / disabled | intake profile visit | ✓ |
| 5 | `MedicalMateAddRow` 🆕 | `1129:9199` | `AddRow.kt` | — | calendar, Callout 내부 | ✓ |
| 6 | `MedicalMateTextField` | `295:692` | `TextFields.kt` | 상태 5(파생) | intake profile | ✓ |
| 7 | `MedicalMateTextArea` | `334:1102` | `TextFields.kt` | 상태 3 + 카운터 | visit | ✓ |
| 8 | `MedicalMateCheckbox` | `311:851` | `Selection.kt` | checked / disabled | card | ✓ |
| 9 | `MedicalMateRadio` | `311:858` | `Selection.kt` | selected | intake | ✓ |
| 10 | `MedicalMateToggle` | `334:1155` | `Selection.kt` | on / off | profile | ✓ |
| 11 | `MedicalMateSegmentedControl` | `334:1150` | `SegmentedControl.kt` | 2~4칸 (실사용 2칸) | intake | ✓ |
| 12 | `MedicalMateVoiceInput` | `313:993` | `VoiceInput.kt` | state 4 | intake visit | ✓ |
| 13 | `MedicalMateSeveritySlider` | `339:1293` | `SeverityInputs.kt` | 5단계 스냅 · showNrs | intake | ✓ |
| 14 | `MedicalMateSeveritySelect` | `295:898` | `SeverityInputs.kt` | 5카드 · 미선택(null) 허용 | — | ✓ |
| 15 | `MedicalMatePickerField` 🆕 | `1129:9196` | `PickerField.kt` | 채움 / 오류 | calendar | ✓ |
| 16 | `MedicalMateTodoRow` 🆕 | `1129:9197` | `TodoRow.kt` | 읽기 / 편집 / 삭제 | calendar | ✓ |
| 17 | `MedicalMateCardPick` 🆕 | `1129:9198` | `CardPick.kt` | selected | calendar | ✓ |
| 18 | `MedicalMateCard` | `293:656` | `Card.kt` | emphasis 3 | calendar card home profile visit | ✓ |
| 19 | `MedicalMateNotice` | `292:668` | `Notice.kt` | tone **5**(BRAND 추가) | card intake profile | ✓ |
| 20 | `MedicalMateCallout` | `293:657` | `Callout.kt` | editing | card | ✓ |
| 21 | `MedicalMateBadge` | `311:834` | `Badge.kt` | tone 5 | card | ✓ |
| 22 | `MedicalMateKvRow` | `333:1100` | `Rows.kt` | type 4 | card profile visit | ✓ |
| 23 | `MedicalMateEditingKvRow` | `597:4800` | `Rows.kt` | KvRow + 삭제 S | card visit | ✓ |
| 24 | `MedicalMateListRow` | `335:1114` | `Rows.kt` | type 3 + badge | calendar card home intake | ✓ |
| 25 | `MedicalMateSeverityReadout` | `333:1126` | `SeverityReadout.kt` | level 1~5 (NRS 항상 표시) | card intake | ✓ |
| 26 | `MedicalMateSourceQuote` | `313:1022` | `SourceQuote.kt` | AI / Edited | — | 설명 |
| 27 | `MedicalMateQuoteBlock` | `735:3861` | `QuoteBlock.kt` | — | card visit | ✓ |
| 28 | `MedicalMateBubble` | `313:999` | `Bubble.kt` | sender 2 | intake | ✓ |
| 29 | `MedicalMateDoctorCard` | `333:1155` | `DoctorCard.kt` | state 2 | — | 설명 |
| 30 | `MedicalMateAvatar` | `311:839` | `Avatar.kt` | type 2 · size | home profile | ✓ |
| 31 | `MedicalMateDivider` | `333:1088` | `Rows.kt` | — | card intake visit | ✓ |
| 32 | `MedicalMateDateCell` | `335:1188` | `DateCell.kt` | selected/today/marker | calendar | ✓ |
| 33 | `MedicalMateHospitalCard` 🆕 | `1129:9195` | `HospitalCard.kt` | chip tone 2 | card | ✓ |
| 34 | `MedicalMateSelectBar` 🆕 | `1129:9200` | `SelectBar.kt` | — | — | ✓ |
| 35 | `MedicalMateNavBar` | `298:739` | `NavBar.kt` | leading 3 · action | calendar card intake profile visit | ✓ |
| 36 | `MedicalMateTabBar` | `319:1026` | `TabBar.kt` | tab **3** | calendar card home | ✓ |
| 37 | `MedicalMateSectionHeader` | `334:1156` | `Rows.kt` | action / caption | 5개 영역 | 설명 |
| 38 | `MedicalMateProgressIndicator` | `334:1139` | `ProgressIndicator.kt` | step · label · 연속막대 | intake profile | ✓ |
| 39 | `MedicalMateOnboardingProgress` 🆕 | `1155:854` | `OnboardingProgress.kt` | step 1/4~4/4 | profile | ✓ |
| 40 | `MedicalMateBottomSheet` | `294:681` | `BottomSheet.kt` | — | calendar | ✓ |
| 41 | `MedicalMateSheetActions` | `294:681` | `BottomSheet.kt` | action 3 | calendar | ✓ |
| 42 | `MedicalMateDialog` | `312:845` | `Dialog.kt` | tone 2 | calendar card visit | ✓ |
| 43 | `MedicalMateOverlayScrim` | `335:1189` | `OverlayScrim.kt` | dismissable 여부 | — | ✓ |
| 44 | `MedicalMateToast` | `312:844` | `Toast.kt` | tone 4 · action | — | ✓ |
| 45 | `MedicalMateLoadingSpinner` | `335:1175` | `Loading.kt` | message | card profile visit | ✓ |
| 46 | `MedicalMateLoadingSkeleton` | `335:1175` | `Loading.kt` | 줄 폭 비율 | — | ✓ |
| 47 | `MedicalMateEmptyState` | `335:1166` | `EmptyState.kt` | type 4 (**실사용 2**: NO_RECORD · NO_RESULT) | home card calendar visit (9화면) | ✓ |
| 48 | `MedicalMateLogo.Symbol` | `351:1281` | `MedicalMateLogo.kt` | Gradient/Flat/Mark | 앱 아이콘 · 스플래시 | 설명 |
| 49 | `MedicalMateLogo.Lockup` | `351:1303` | `MedicalMateLogo.kt` | 139×36 | 스플래시 · 로그인 | 설명 |
| 50 | `MedicalMateSocialLoginButton` | `383:1302` | `SocialLoginButton.kt` | provider 4 (실사용 KAKAO) | **auth** (`LoginScreen.kt`) | ✓ |
| 51 | `MedicalMateSocialLoginStack` | `383:1303` | `SocialLoginButton.kt` | providers | — | ✓ |
| 52 | `MedicalMateTooltip` | `542:1295` | `Tooltip.kt` | open (비제어 · 내부 상태) | card profile visit | ✓ |
| 53 | `MedicalMateTooltipTrigger` | `542:1295` | `TooltipTrigger.kt` | active | Tooltip 내부 | ✓ |
| 54 | `MedicalMateTooltipBubble` | `575:1287` | `TooltipBubble.kt` | arrowOffset | Tooltip 내부 | ✓ |
| 55 | `MedicalMateSearchField` | `590:1307` | `SearchField.kt` | 채움 여부 | intake visit | ✓ |
| 56 | `MedicalMateFab` | (FAB) | `Fab.kt` | — | calendar visit | ✓ |
| 57 | `MedicalMateSurfaceStyle` | — | `MedicalMateSurfaceStyle.kt` | Opaque / Glass (공유 enum) | NavBar TabBar CTA | ✓ |
| 58 | `MedicalMateSeverity` | — | `MedicalMateSeverity.kt` | level 1~5 (공유 enum) | 통증 입력 4종 | ✓ |

**대기 중** — `Body Map` `387:4164` (`intake/ui/BodyMapCanvas.kt` · `BodyMapCard.kt`). 디자인 시스템 컴포넌트가 아니라 feature 내부 구현이라 이 문서 범위 밖이다. **웹 포팅에서 가장 큰 미지수다**(인체도 탭 → 부위 좌표).

### 8.1 호출되지 않는 컴포넌트 (웹 1차 구현에서 뺄 수 있는 것)

소스 전체를 `grep`으로 확인한 결과다. **8종이 컴포넌트로만 존재하고 어느 화면에서도 호출되지 않는다.**

| 컴포넌트 | 대신 쓰이는 것 |
|---|---|
| `MedicalMateToast` | 없음 — 앱에 토스트 피드백 자체가 없다 |
| `MedicalMateOverlayScrim` | `BottomSheet`·`Dialog`의 자체 스크림 |
| `MedicalMateSourceQuote` | `MedicalMateQuoteBlock` (규격이 다르다, §5.6) |
| `MedicalMateDoctorCard` | 없음 |
| `MedicalMateSelectBar` | 없음 |
| `MedicalMateSeveritySelect` | `MedicalMateSeveritySlider` |
| `MedicalMateLoadingSkeleton` | `MedicalMateLoadingSpinner` |
| `MedicalMateSocialLoginStack` | `SocialLoginButton` 직접 호출 (`LoginScreen.kt`) |

변이 단위로도 죽어 있는 것이 있다 — `EmptyState`의 `OFFLINE` · `MIC_DENIED`와 `note` 슬롯, `TabBar`의 `Active4`, 모든 크롬의 `GLASS` 표면(호출부가 전부 기본 `OPAQUE`).

---

### 8.2 이 판에서 소스 대조로 고친 것

앞선 판이 소스와 어긋났던 지점을 남겨 둔다. 웹 구현 중 같은 실수를 되풀이하지 않기 위해서다.

| # | 위치 | 이전 판 | 소스 확인 결과 |
|---|---|---|---|
| C1 | §5.3 EmptyState | `type`이 제목·본문·액션을 정한다 | **`type`은 아이콘만 정한다.** `title`·`description`은 필수 파라미터. 4변이 문구표는 DESIGN.md 규정이지 코드가 아니다 |
| C2 | §5.3 EmptyState | 4변이 전부 사용 | **`NO_RECORD`·`NO_RESULT` 둘만 사용.** `OFFLINE`·`MIC_DENIED`·`note` 호출처 없음 |
| C3 | §5.3 EmptyState | 에러 상태 언급 없음 | **에러 전용 컴포넌트가 없다.** 7개 화면이 `NO_RESULT` + 재시도로 실패를 그린다 (문구표 추가) |
| C4 | §5.3 EmptyState | `1r-2-C` 본문 `병원 갈 날짜를 정하면…` | `strings.xml`에 **없는 문구**. 삭제 |
| C5 | §7.1 SocialLogin | "어느 화면에서도 호출되지 않는다" | **`LoginScreen.kt:119`가 KAKAO로 호출한다.** Stack만 미사용 |
| C6 | §2.1 Button | disabled 채움/Outline 두 줄만 | **GHOST·DANGER disabled는 투명.** DANGER가 danger 면을 잃는다 |
| C7 | §2.2 IconButton | "hit area는 항상 48" | 바깥 Box가 **자리만** 48. 클릭은 시각 상자(32/40/48)가 받는다. TONAL disabled도 투명(Button과 다름) |
| C8 | §3.2 TextArea | TextField와 상태 규칙 동일 | **오류 상태가 없다**(`hasError=false` 고정). 파라미터도 5개뿐 |
| C9 | §3.5 Segmented | "진료 전/후 전환 계열" | 실제는 **인체도 앞/뒤 2칸**(`body_map_view_front/back`) |
| C10 | §4.5 Dialog | 왼쪽 Outline / 오른쪽 Primary | **Tonal/M + Danger/M.** `tone=NEUTRAL`에서도 확인 버튼은 DANGER |
| C11 | §5.11 KvRow | `onClick` 누락 | `onClick`이 있고, 주면 면이 `bg/surface`로 칠해진다. `onValueChange`는 `EDITING`에서만 동작 |
| C12 | §5.9 Avatar | `onClick` 누락 | `onClick` 파라미터가 있다 |
| C13 | §5.4 Bubble | "AI 라벨을 붙인다" | `senderLabel`이 nullable 파라미터. `"AI"` 문자열은 소스에 없다 |
| C14 | §5.10 DateCell | disabled 규칙 부분 기재 | **`enabled=false`가 selected·today를 모두 덮는다** |
| C15 | §3.6 Checkbox | disabled = 테두리만 바뀜 | **checked+disabled는 면을 채우지 않는다**(`checked && enabled`) |
| C16 | §6.3 Skeleton | `"불러오는 중"`이 고정 문구 | `loadingDescription` **필수 파라미터** |
| C17 | §3.9 SeverityReadout | `showNrs` 있는 것처럼 | **파라미터는 `severity` 하나.** NRS 항상 표시 |
| C18 | §3.9 SeveritySelect | `severity` non-null 전제 | **nullable** — 미선택 상태를 표현한다 |
| C19 | §5.7 HospitalCard | 구분선 항상 있음 / `1m-B` 계열 | 칩이 없으면 **구분선도 없다.** 호출처는 `BriefCardScreen.kt` 한 곳 |
| C20 | §2.7 Fab | 그림자 = `Elevation/Card` | 소스는 **지역 상수 6dp** (card 3 · float 4 어느 쪽도 아니다). KDoc과 코드가 어긋남 |
| C21 | 영역 표기 | `HospitalPickScreen`=card, `RecordDetailStep`=intake, `VisitRecordCard`=card | 각각 **visit · card · visit** (파일 경로 기준) |
| C22 | §4.4 SheetActions | 파라미터 미기재 | 보조 버튼은 `secondaryLabel`+`onSecondaryClick` **둘 다** 있어야 그려진다. `CANCEL`은 보조를 무시 |
| C23 | §6.2 Progress | 기본형 숫자 문자열 불명확 | 기본형은 화면에도 `"3/4 단계"`를 그대로 쓴다(라벨형만 `"1 / 3"`) |
| C24 | §5.10 DateCell | 34 compact "자리 없음"(KDoc) | `ScheduleAddSheets.kt:175`가 **실제로 쓴다.** KDoc이 낡았다 |

---

## 9. 웹 포팅 리스크

| # | 지점 | 안드로이드 | 웹에서의 문제 · 대응 |
|---|---|---|---|
| R1 | **Body Map** | Canvas에 인체도 그리고 탭 좌표로 부위 판정 | 디자인 시스템 밖 구현. SVG `<path>` + `pointer-events`로 다시 만들어야 한다. 좌표계를 새로 정의해야 하므로 별도 스파이크 필요 |
| R2 | **Severity Slider drag** | 끄는 중 연속 추종 → 놓을 때 스냅 | `<input type="range" step="1">`으로는 연속 추종이 안 된다. 트랙을 직접 그리고 pointer 이벤트로 구현. 단 **키보드 ←/→·Home/End를 잃으므로** 시각 트랙 뒤에 투명 `range`를 겹쳐 두는 하이브리드가 안전하다 |
| R3 | **Bottom Sheet 끌어내리기** | `ModalBottomSheet` 기본 제공 | `<dialog>`에 없다. ESC + 스크림 클릭으로 대체하고 grabber 드래그는 직접 구현 |
| R4 | **Voice Input** | Android SpeechRecognizer | Web Speech API가 iOS Safari에서 불안정. `UNSUPPORTED` 상태와 문구를 새로 정해야 한다 |
| R5 | **Glass 블러** | minSdk 24라 **Opaque가 기본** | 웹은 `backdrop-filter`가 되므로 오히려 시안대로 갈 수 있다. 단 기본값이 뒤바뀌므로 디자인과 합의 필요 |
| R6 | **Date Cell hit area** | 42 시각 크기 + 그리드가 hit test | 웹도 같은 구조가 필요하다. 셀 버튼을 42로 만들면 터치 하한 48 미달 |
| R7 | **`fg/muted` 금지 규칙** | 코드 주석으로만 강제 | 웹에서 placeholder 기본색이 `fg/muted`급으로 흐려지기 쉽다. `::placeholder`에 `--fg-subtle`을 명시적으로 지정해야 한다 |
| R8 | **TextArea `maxLength`** | 넘겨도 막지 않고 색만 바꾼다 | HTML `maxlength` 속성을 쓰면 잘려서 규칙 위반. 반드시 직접 카운트 |
| R9 | **`onSend` IME 고정** | 값에 따라 `imeAction`을 바꾸지 않는다 | `enterkeyhint`도 같은 이유로 값에 따라 토글하면 안 된다 |
| R10 | **그림자 틴트** | API 28+에서만 `#1B255A` 적용 | 웹은 전부 적용된다. **안드로이드보다 결과가 좋다** |
| R11 | **스케일 밖 값 6개** | `radius 10/13/14/18`, `gap 3/13`, `padding 5/18` | Figma 마스터 값이라 그대로 옮긴다. 토큰화하지 말고 컴포넌트 지역 상수로 둔다 |
| R12 | **접근성 이름 조립** | `contentDescription`을 한 문장으로 만든다 | 웹은 `aria-label`로 옮기되, 내부 자식에 `aria-hidden`을 반드시 함께 건다(중복 읽힘) |
| R13 | **Tab Bar safe bottom 24** | Figma 컴포넌트 내부 여백 | `env(safe-area-inset-bottom)`과 **중복 적용하지 않는다.** `max(24px, env(...))`로 처리 |
| R14 | **Toast 위치** | 호출자가 정함 | 웹에서 포털 + `role="status"`/`"alert"` 결정이 추가로 필요하다. 단 **안드로이드에 Toast 호출처가 없어** 웹 1차에서 뺄 수 있다 |
| R15 | **에러 상태에 전용 컴포넌트가 없다** | 7개 화면이 `EmptyState(NO_RESULT)` + 재시도로 실패를 그린다. 아이콘이 `search-off`로 남는다 | 웹도 같은 컴포넌트를 재사용하면 안드로이드와 일치한다. `wifi-off`로 바꾸려면 **디자인 확인이 먼저다** — 지금 바꾸면 두 플랫폼이 갈린다 |
| R16 | **hit area 주석과 코드 불일치** | IconButton(M/S)·TooltipTrigger가 48을 "자리만" 잡고 실제 클릭은 32/40 | 웹은 `::after` 확장으로 진짜 48을 만든다 → **접근성이 안드로이드보다 좋아진다.** QA가 "안드로이드와 다르다"고 잡지 않도록 미리 적어 둔다 |
| R17 | **문구가 컴포넌트가 아니라 화면에 있다** | `EmptyState` · `Callout` · `SelectBar` · `HospitalCard 칩` · `Bubble senderLabel`이 전부 문자열을 파라미터로 받는다 | 웹에서 컴포넌트에 기본 문구를 심으면 화면별 문구가 사라진다. **문구는 `strings.xml` → i18n 사전으로 옮기고 컴포넌트는 비워 둔다** |
| R18 | **죽은 변이 8종 + 변이 단위 사각지대** | §8.1 표 참조 (`GLASS` 표면 전부 포함) | 웹 1차 범위에서 뺀다. 특히 `GLASS`는 R5와 맞물려 **기본값 결정 전까지 만들 필요가 없다** |
