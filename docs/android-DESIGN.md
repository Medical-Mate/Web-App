# 진료메이트 디자인 시스템

**버전** 3.0 · **기준일** 2026-09-09 · **Figma** `cG6lz8nwzp75bfAXCnMqxx`
**대상** 팀 전체 (디자인 · 개발 · 기획)

> Figma가 정본이다. 이 문서는 사본이며, 둘이 다르면 Figma가 맞다.
> [디자인시스템 · 최종](https://www.figma.com/design/cG6lz8nwzp75bfAXCnMqxx/AX-%ED%95%B4%EC%BB%A4%ED%86%A4?node-id=291-636) · [IA · User-Flow · Wireframe](https://www.figma.com/design/cG6lz8nwzp75bfAXCnMqxx/AX-%ED%95%B4%EC%BB%A4%ED%86%A4?node-id=296-3042)

---

## 0. 한눈에

| 항목 | 값 |
|---|---|
| 화면 규격 | **360 × 812** (안드로이드 최소 기준) |
| 좌우 여백 | 20 · 콘텐츠 폭 **320** |
| 컴포넌트 | **58종** |
| 아이콘 | **46종** · 24 격자 · 획 1.75 |
| 색·수치 토큰 | Palette 43 · Semantic 41 · Scale 33 = **117** |
| 텍스트 스타일 | 15종 |
| 폰트 | Pretendard |

### 변경 이력

| 버전 | 날짜 | 내용 |
|---|---|---|
| 1.0 | 09-07 | 초판 — 토큰 · 타이포 · 컴포넌트 41종 |
| 2.0 | 09-08 | v2 컴포넌트 8종 · Tooltip 분리 |
| **3.0** | **09-09** | **360 전환 · CRUD 규칙 · 컴포넌트 신규 7종 · 수정 3종 · 아이콘 크기 규칙** |

---

## 1. 설계 원칙

| | 원칙 | 화면에서의 의미 |
|---|---|---|
| **P1** | AI는 진단하지 않는다 | "위염입니다" 금지 / "위염 초기라고 하셨어요"는 가능 |
| **P2** | AI 결과는 수정 가능 + **원문 병기** | 정리 결과는 고치되 환자가 적은 말은 남는다 |
| **P3** | 모르면 넘어갈 수 있다 | 모든 질문에 "잘 모르겠어요 · 없어요" |
| **P4** | 말 대신 부위 짚기로 시작 가능 | 첫 입력은 인체도 탭 |
| **P5** | 환자가 주인공 | 유색 큰 면은 환자의 말에만 |
| **D4** | AI에 브랜드 색을 주지 않는다 | 면색 없이 본문 + "AI" 라벨 |
| **D5** | 브리핑 카드 최강 블록 = 묻고 싶은 것 | |
| **D11** | 색만으로 구분하지 않는다 | 반드시 형태·낱말과 겹친다 |

**P5 예외** — 캘린더 `다음 일정`의 미확정 상태는 `bg/primary` 채움을 쓴다. 정보 표시가 아니라 **남은 행동**을 뜻하는 블록이라 예외로 둔다. 확정되면 연한 인디고로 내려간다.

**금지 시각 요소** — 십자 · 알약 · 체온계 · 웃는 얼굴 캐릭터

---
## 2. 색

### 2.1 2계층 구조

```
Palette (원시)  →  Semantic (역할)  →  화면
```

**화면에서는 Semantic만 쓴다.** 원시 팔레트를 직접 집으면 나중에 색을 바꿀 때 어디를 고쳐야 할지 못 찾는다.

### 2.2 Palette

| 그룹 | 토큰 | 값 |
|---|---|---|
| **primary** | 50 / 100 / 200 / 300 / 400 | `#F2F4FE` `#E3E7FC` `#C7CFF8` `#A3AFF1` `#7484E3` |
| | 500 / 600 / 700 / 800 / 900 | `#5566D2` `#3B4FC0` `#2E3E9E` `#242F79` `#1A2154` |
| **neutral** | 0 / 25 / 50 / 100 / 200 | `#FFFFFF` `#FAFBFD` `#F5F6FA` `#EDEFF5` `#DEE1EB` |
| | 300 / 400 / 500 / 600 / 700 / 900 | `#C6CAD8` `#989EB1` `#7C8397` `#585F73` `#3A4053` `#131722` |
| **amber** | 50 / 100 / 500 / 700 | `#FFF4D6` `#FFE9B3` `#E0A227` `#8A5A0B` |
| **green** | 50 / 100 / 500 / 700 | `#E4F7ED` `#C6F0DC` `#12A05F` `#0E7A4A` |
| **red** | 50 / 100 / 500 / 700 | `#FFEDEB` `#FFD8D4` `#E5504A` `#C4302B` |
| **severity** | 1 ~ 5 | `#FFE3A8` `#FFC79B` `#FFA894` `#F58079` `#DC5A55` |
| | 1-tint ~ 5-tint | `#FFF6E4` `#FFEFE4` `#FFE9E3` `#FDE4E2` `#F9DEDD` |

**단색 체계.** 색상 231°(인디고)로 흔한 파랑(210~215°)을 피했다. 위계는 색이 아니라 형태가 만든다.

### 2.3 Semantic — 배경

| 토큰 | 별칭 | 값 | 쓰임 |
|---|---|---|---|
| `bg/canvas` | neutral/50 | `#F5F6FA` | 화면 바탕 |
| `bg/surface` | neutral/0 | `#FFFFFF` | 카드 · 시트 |
| `bg/subtle` | neutral/100 | `#EDEFF5` | 입력 필드 · 보조 블록 |
| `bg/primary` | primary/500 | `#5566D2` | 주 버튼 · 행동 유도 블록 |
| `bg/primary-pressed` | primary/600 | `#3B4FC0` | 눌림 |
| `bg/primary-subtle` | primary/100 | `#E3E7FC` | Callout · 환자 발화 |
| `bg/primary-faint` | primary/50 | `#F2F4FE` | Notice/Info · 일정 카드 |
| `bg/success` | green/50 | `#E4F7ED` | |
| `bg/warning` | amber/50 | `#FFF4D6` | 알러지 경고 |
| `bg/danger` | red/50 | `#FFEDEB` | 삭제 버튼 |
| `bg/inverse` | neutral/900 | `#131722` | Toast |
| `bg/inverse-soft` | neutral/700 | `#3A4053` | Tooltip |
| `bg/scrim` | neutral/900 | `#131722` | 오버레이 (40~50%) |

### 2.4 Semantic — 전경

| 토큰 | 별칭 | 값 | 흰 배경 대비 |
|---|---|---|---|
| `fg/default` | neutral/900 | `#131722` | 17.90 |
| `fg/subtle` | neutral/600 | `#585F73` | 6.36 |
| `fg/muted` | neutral/500 | `#7C8397` | 3.78 — **본문 금지** |
| `fg/disabled` | neutral/300 | `#C6CAD8` | — |
| `fg/primary` · `fg/link` · `fg/info` | primary/700 | `#2E3E9E` | 9.13 |
| `fg/success` | green/700 | `#0E7A4A` | 4.98 |
| `fg/warning` | amber/700 | `#8A5A0B` | 5.40 |
| `fg/danger` | red/700 | `#C4302B` | 5.28 |
| `fg/on-primary` · `fg/on-inverse` | neutral/0 | `#FFFFFF` | — |

### 2.5 Semantic — 테두리

| 토큰 | 값 | 쓰임 |
|---|---|---|
| `border/subtle` | `#DEE1EB` | 목록 구분선 · **입력 밑줄** |
| `border/default` | `#C6CAD8` | |
| `border/strong` | `#7C8397` | 입력 필드 테두리 (비어 있음) |
| `border/focus` · `border/primary` | `#5566D2` | 포커스 |

**선택 완료된 필드의 테두리는 `fg/default`를 쓴다.** 텍스트·아이콘·테두리가 함께 진해져야 "채워졌다"가 읽힌다.

---

## 3. 타이포

폰트 **Pretendard**.

| 스타일 | 크기 | 굵기 | 행간 | 자간 |
|---|---|---|---|---|
| `Display/M` | 30 | Bold | 40 | −2% |
| `Heading/L` | 24 | Bold | 34 | −2% |
| `Heading/M` | 20 | SemiBold | 28 | −1.5% |
| `Heading/S` | 17 | SemiBold | 24 | −1% |
| `Body/L` | 17 | Regular | 26 | 0 |
| `Body/L Strong` | 17 | SemiBold | 26 | 0 |
| `Body/M` | 15 | Regular | 24 | 0 |
| `Body/M Strong` | 15 | SemiBold | 24 | 0 |
| `Body/S` | 13 | Regular | 20 | 0 |
| `Body/S Strong` | 13 | SemiBold | 20 | 0 |
| `Label/L` | 15 | SemiBold | 20 | 0 |
| `Label/M` | 13 | SemiBold | 18 | 0 |
| `Label/S` | 11 | Medium | 16 | +2% |
| `Numeric/L` | 24 | Bold | 30 | −1.5% |
| `Numeric/M` | 17 | SemiBold | 22 | −1% |

**본문 기본은 `Body/L`(17).** 진료실에서 소리 내어 읽을 문장이라 15로는 부족하다.
헤딩만 자간을 조인다. **한글 본문은 자간을 조이면 판독이 떨어진다.**

---

## 4. 형태 · 고도

### 4.1 반경

| 토큰 | 값 | 용도 |
|---|---|---|
| `radius/xs` | 8 | 배지 · 체크박스 |
| `radius/sm` | 12 | S 버튼 · 원문 블록 · 질문 pill |
| `radius/md` | 16 | L 버튼 · Notice · 입력 필드 |
| `radius/lg` | 20 | Card · Callout |
| `radius/xl` | 24 | Dialog |
| `radius/2xl` | 28 | Bottom Sheet 상단 |
| `radius/full` | 999 | Chip · Avatar · Icon Button |

### 4.2 그림자

| 스타일 | 값 |
|---|---|
| `Elevation/Card` | y3 blur10 8% + y1 blur2 5% |
| `Elevation/Float` | y4 blur14 9% + y1 blur3 6% |
| `Elevation/Sheet` | y−4 blur24 10% + y0 blur2 5% |
| `Surface/Glass` | background-blur 24 |

**테두리 대신 고도로 위계를 만든다.** 카드·필드·알림이 모두 1px 선을 두르면 화면이 선으로 가득 찬다. 선은 목록 구분과 포커스에만.

그림자는 브랜드 틴트. 흰 화면 위의 검정 그림자는 회색 때처럼 보인다.

**글래스는 콘텐츠 위에 겹치는 크롬 전용** — Nav Bar · Tab Bar · 스크롤 위 Bottom CTA Bar. 불투명 폴백 변이를 함께 정의한다.

---

## 5. 치수

| 토큰 | 값 |
|---|---|
| `layout/screen-w` | **360** |
| `layout/gutter` | 20 |
| `layout/content-w` | **320** |
| `layout/nav-h` | 56 |
| `layout/tabbar-h` | **79** |
| `layout/safe-bottom` | 24 |
| `size/touch-min` | **48** |
| `size/icon-sm` / `md` / `lg` | 18 / 20 / 24 |
| `size/control-sm` / `md` / `lg` | 40 / 48 / 56 |
| `size/mic` | 88 |

간격은 `space/2` ~ `space/40` (2 · 4 · 6 · 8 · 10 · 12 · 14 · 16 · 20 · 24 · 32 · 40).

### 사이징 규칙

**높이는 내용이 정하고(HUG), 폭은 화면이 채운다(FILL).**

고정은 규격이 곧 의미인 것만 — Icon Button(정사각) · Avatar(원형 44) · Date Cell(42 · 시트 안에서는 34) · Nav Bar(56) · 컨트롤 높이(56/48/40).

**화면 프레임은 `Content`를 FILL로 두고 최소 812를 보장한다.** HUG로 두면 내용이 짧을 때 프레임이 같이 줄어든다.

---

## 6. 아이콘

24×24 격자 · 라이브 20 · 획 **1.75** · 라운드 캡/조인 · 단일 색.

**16 이하로 줄이지 않는다.** 획이 뭉개진다.
탭 활성은 채움형으로 전환 — 색만 바뀌면 색각 이상에서 상태가 전달되지 않는다.

### 6.1 크기는 아이콘이 아니라 **상자**가 정한다

같은 `×`라도 화면마다 크기가 다른 건 정상이다. **어느 상자에 들어가느냐**가 크기를 결정한다.

| Size | 상자 | 아이콘 | 반경 | 쓰는 곳 |
|---|---|---|---|---|
| **L** | 48 | **24** | full | 화면 단위 액션 — Nav Bar · 필드 안 지우기 · 목록 밖 액션 |
| **M** | 40 | **20** | full | 중간 컨트롤 |
| **S** | 32 | **18** | 16 | 항목 안 보조 액션 — KV 행 × · 질문 pill × |

이 짝은 **`Icon Button` 컴포넌트가 이미 강제한다.** 상자를 직접 만들지 말고 인스턴스를 쓴다.

```
Icon Button / Style=Ghost / Size=S   →  32 상자 + 18 아이콘 자동
```

### 6.2 삭제 × 배치 기준

| 위치 | Size | 상자 / 아이콘 |
|---|---|---|
| Nav Bar 닫기 | L | 48 / 24 |
| 검색 필드 지우기 | L | 48 / 24 |
| 진료 전 할 일 × | L | 48 / 24 |
| 브리핑 카드 KV 행 × | S | 32 / 18 |
| 질문 pill × | S | 32 / 18 |
| 진료 후 기록 KV 행 × | S | 32 / 18 |

**항목 안 × 는 S, 화면·필드 단위 × 는 L.** 크기 차이가 곧 위계다.

### 6.3 아이콘 46종

| 그룹 | 아이콘 |
|---|---|
| 이동 | `chevron-left` `chevron-right` `chevron-up` `chevron-down` `arrow-right` `arrow-up` |
| 액션 | `plus` `minus` `close` `check` `edit` `trash` `copy` `share` `search` `more-horizontal` |
| 상태 | `check-circle` `alert-circle` `alert-triangle` `info` `lock` `spinner` |
| 탭 | `home` / `home-filled` · `note` / `note-filled` · `calendar` / `calendar-filled` · `user` / `user-filled` |
| 음성 | `mic` `mic-listening` `mic-off` `waveform` |
| 의료 | `hospital` `stethoscope` `pill` `heart-pulse` `body-point` |
| 기타 | `bell` `chat` `clock` `camera` `empty-box` `search-off` `wifi-off` |

**채움형은 탭 활성 상태 전용.** 색만 바뀌면 색각 이상에서 상태가 전달되지 않는다.

### 6.4 인라인 아이콘

버튼 상자가 아닌 텍스트 옆 아이콘은 **옆에 붙는 글자 크기를 따른다.**

| 글자 | 아이콘 |
|---|---|
| `Body/L` 17 | 20 |
| `Body/M` 15 | 18 |
| `Body/S` 13 | 16 — 하한 |

---
## 7. 컴포넌트 58종

### 7.1 액션

| 컴포넌트 | 변이 · 속성 |
|---|---|
| **Button** | `Type` Primary / Tonal / Outline / Ghost / **Danger** · `Size` L / M / S · `State` Default / Pressed / Disabled · `Label` 텍스트 · `Show Leading Icon` `Show Trailing Icon` |
| **Icon Button** | `Style` Ghost / Tonal / Solid / Outline · `Size` L(48/24) / M(40/20) / S(32/18)<br>**모든 삭제 × 는 이 컴포넌트를 쓴다.** 상자를 직접 만들지 않는다 |
| **Bottom CTA Bar** | `Surface` Glass / Opaque |
| **Chip** | `State` Default / Pressed / Selected |
| **Add Row** 🆕 | `+` 아이콘 + 라벨. 보더 없이 목록 끝에 붙는다 |

### 7.2 입력

| 컴포넌트 | 변이 · 속성 |
|---|---|
| **Text Field** | `State` Default / Focus / Filled / Error / Disabled |
| **Text Area** | `State` Empty / Filled / Focus · `Show Mic` |
| **Checkbox** | `State` Unchecked / Checked / Disabled |
| **Radio** | `State` Unselected / Selected |
| **Toggle** | `State` Off / On |
| **Segmented Control** | `Active` |
| **Voice Input** | `State` Idle / Listening / Processing / Denied |
| **Severity Slider** | 5단계 스냅 |
| **Severity Scale** · **Severity Select** | 대안 입력 |
| **Picker Field** 🆕 | 병원 · 날짜 · 시간 선택 필드 |
| **Todo Row** 🆕 | 체크박스 + 할 일 + 삭제 × |
| **Card Pick** 🆕 | 일정에 붙일 브리핑 카드 선택 행 |

### 7.3 표시

| 컴포넌트 | 변이 · 속성 |
|---|---|
| **Card** | `Emphasis` Default / Brand / Quiet |
| **Notice** | `Tone` Info / Success / Warning / Danger |
| **Callout** | `Editing` `Show Q4` — 질문 편집·추가 |
| **Badge** | `Tone` Brand / Neutral / Success / Warning / Danger |
| **KV Row** | `Type` Default / Emphasis / Link / **Editing** |
| **List Row** | `Type` Default / Badge / Plain · `Show Summary` · **`Show Select`** |
| **Severity Readout** | `Level` 1~5 |
| **Source Quote** | `State` AI / Edited |
| **Bubble** | `Sender` AI / Patient |
| **Doctor Card** | `State` Available / Closed |
| **Avatar** | `Type` Patient / Doctor |
| **Divider** | — |
| **Date Cell** | `State` Default / Today / Selected · 42 |
| **Hospital Card** 🆕 | 아이콘 + 이름 + 주소 + 날짜 칩 |
| **Select Bar** 🆕 | 편집 모드 선택 상태 안내 |

### 7.4 구조 · 피드백

| 컴포넌트 | 변이 · 속성 |
|---|---|
| **Nav Bar** | `Leading` Back / Close / None · `Trailing` Action / None / **Text** · **`Action`** 텍스트 |
| **Tab Bar** | `Active` 홈 / 기록 / 캘린더 |
| **Section Header** | 제목 + 우측 액션(선택) |
| **Progress Indicator** | `Step` 1~4 — 신상정보 3단계 등 상단 진행 표시 |
| **Onboarding Progress** 🆕 | `Step` 1/4 ~ 4/4 — 점 4개 중 현재만 pill(20×6)로 늘어난다 |
| **Bottom Sheet** | `Action` Strong / Neutral / Cancel |
| **Dialog** | `Show Action` · `Message` |
| **Overlay Scrim** | 40~50% |
| **Toast** | `Tone` 4종 · `Show Action` · `Show Timer` · `Message` |
| **Loading** | Spinner / Skeleton |
| **Empty State** | `Type` NoRecord / NoResult / Offline / MicDenied — 7.4-2 참조 |
| **Logo Symbol** · **Logo Lockup** | Gradient / Flat / Subtle / Mark / Mono Light |
| **Social Login Button** · **Social Login Stack** | 카카오 · 네이버 · Apple |

🆕 = 2026-09-09 신규

### 7.4-1 Onboarding Progress

온보딩 4단계 전용 표시기. `Progress Indicator`와 역할이 다르다.

| | Progress Indicator | Onboarding Progress |
|---|---|---|
| 형태 | 가로 막대 | **점 4개** |
| 현재 위치 | 채워진 길이 | **현재 점만 pill로 늘어남** (20×6, 나머지 6×6) |
| 쓰임 | 신상정보 · 문답 등 **작업 진행** | 온보딩 **화면 넘김** |

| 요소 | 값 |
|---|---|
| 점 | 6 × 6 · `radius/full` · `bg/subtle` |
| 현재 점 | **20 × 6** · `bg/primary` |
| 간격 | 8 |
| 전체 | 72 × 24 |

작업 진행률이 아니라 **몇 번째 화면인지**를 알린다. 되돌아갈 수 있으므로 지나온 점도 채우지 않는다.

### 7.4-2 Empty State 4변이

아이콘 · 제목 · 본문 · 액션이 한 벌이다. **높이는 본문 줄 수가 정한다.**

| 변이 | 아이콘 | 제목 | 본문 | 액션 | 높이 |
|---|---|---|---|---|---|
| `NoRecord` | `empty-box` | 아직 진료 기록이 없어요 | 증상을 정리해두면 진료실에서 바로 보여줄 수 있어요 | 증상 정리하기 | 286 |
| `NoResult` | `search-off` | 찾는 기록이 없어요 | 다른 날짜나 증상으로 다시 찾아보세요 | 전체 보기 | 286 |
| **`Offline`** | `wifi-off` | 연결이 끊어졌어요 | 작성한 내용은 이 기기에 남아 있어요.<br>연결되면 이어서 저장할게요. | 다시 시도 | **310** |
| `MicDenied` | `mic-off` | 마이크를 쓸 수 없어요 | 설정에서 마이크 권한을 켜면 말로 입력할 수 있어요 | 직접 입력하기 | 286 |

`Offline`만 본문이 **2줄**이라 24 높다. 걱정을 먼저 덜어주는 문장과 다음에 벌어질 일을 나눠 적었기 때문이다. 한 줄로 붙이면 "남아 있어요"에서 끊기지 않아 읽는 부담이 커진다.

**본문은 화면마다 갈아 끼운다.** 제목·아이콘·액션은 변이가 정하고, 본문만 그 자리에 맞게 쓴다.

| 화면 | 본문 |
|---|---|
| `1j-2` · `1n-2` | 증상을 정리해두면 진료실에서 바로 보여줄 수 있어요 |
| `1r-2` 계열 | 진료가 끝나면 들은 내용을 여기에 기록할 수 있어요 |
| `1r-2-C` | 병원 갈 날짜를 정하면 여기에 표시돼요 |
| `1m-B` | 병원 명을 입력하면 진료받을 병원을 찾을 수 있어요 |

### 7.5 v2 컴포넌트 8종

2일차에 원본을 수정하면서 **원본 옆에 v2를 나란히 등록**했다. 개발자가 이미 등록한 컴포넌트가 바뀌는 것보다, 안 쓰는 컴포넌트가 하나 느는 쪽이 낫다는 판단이다.

| v2 | 변경 성격 |
|---|---|
| `Text Field v2` · `Text Area v2` | 접근성 — 플레이스홀더 대비 |
| `Date Cell v2` | 46 → 42 (360 대응) |
| `Nav Bar v2` | 접근성 |
| `Segmented Control v2` | 접근성 |
| `List Row v2` | 요약 줄 추가 |
| `Toast v2` | 타이머 · 액션 |
| `Tab Bar v2` | 4탭 → 3탭 |

**원본은 되돌리지 않았다.** 개발자가 Figma 변경분을 자동 반영하고 있어 되돌리면 접근성 수정 4건이 원상 복귀되고, 인스턴스 125개 스왑에서 설정이 날아갈 위험이 더 컸다.

### 7.6 그 밖의 컴포넌트

| 컴포넌트 | 쓰임 |
|---|---|
| `Tooltip` · `Tooltip Bubble` | 트리거(48 고정)와 말풍선을 분리. 트리거가 레이아웃을 밀지 않는다 |
| `Search Field` | `1m` 병원 검색 |
| `Loading` | Spinner · Skeleton |
| `Overlay Scrim` | 40~50% |
| `Date Cell` | 42 · 시트 안 34 |

---

## 8. CRUD 규칙

### 8.1 편집 상태 — 한 자리에서 이름만 바뀐다

```
평소 · 편집  →  편집 모드 · 취소  →  변경 있음 · 확인
```

| 상태 | Nav 우측 | 화면 |
|---|---|---|
| 평소 | `편집` | 읽기만. × 없음, 값에 밑줄 없음 |
| 편집 · 변경 없음 | `취소` | 각 항목 우측 **×**, 값에 밑줄, 하단 **삭제 CTA** |
| 편집 · 변경 있음 | `확인` | 위와 같고 버튼 이름만 |

**목록 화면은 예외** — 고르는 것 자체가 변경이라 상단은 계속 `취소`. 확인 역할은 하단 삭제 버튼이 한다.

아무것도 안 건드렸는데 `확인`이 떠 있으면 뭘 확인하라는 건지 알 수 없다. 그래서 바꾼 게 있을 때만 확인이 뜬다.

### 8.2 삭제 — 두 갈래

| 대상 | 방식 | 확인 |
|---|---|---|
| **개체 통째로**<br>브리핑 카드 · 진료 후 기록 · 일정 | 편집 모드 **하단 Danger CTA** | **Dialog** 필수 |
| **안의 항목**<br>부위·기간·양상 · 소견·검사·약 · 질문 · 할 일 | 각 행 우측 **×** | 없음 |
| **목록 여러 건**<br>기록 목록 · 카드 목록 | Nav `편집` → **체크 다중 선택** | **Dialog** 필수 |

**토스트는 쓰지 않는다.** 편집 모드를 벗어나기 전이면 `취소`가 실행 취소를 대신한다.

**스와이프도 쓰지 않는다.** 화면에 단서가 없어 발견성이 낮고, 세로 스크롤이 긴 화면에서 오작동하며, 여러 건을 한 번에 못 지운다.

### 8.3 항목 추가

별도 입력 필드를 띄우지 않는다. **목록에 빈 항목이 하나 생기고** 값 자리에 `Divider`(`border/subtle`)가 붙는다. 적으면 그대로 항목이 된다.

브리핑 카드 질문은 번호가 자동으로 다음 번호가 된다 — 3개였으면 4번.

### 8.4 지울 수 없는 것

| 대상 | 이유 |
|---|---|
| 알러지 `Notice` | 진료실에서 반드시 전달돼야 한다. **편집 모드에서는 숨긴다** |
| 진료 메모 원문 | P2 — AI 정리는 고치되 환자가 적은 말은 남는다 |
| 카드 제목 · 메타 | 없으면 목록에서 식별이 안 된다 |

---

## 9. 접근성

| 항목 | 기준 |
|---|---|
| 텍스트 대비 | 4.5:1 (큰 글자 3:1) |
| 비텍스트 대비 | 3:1 — 아이콘 · 경계선 · 컨트롤 상태 |
| 터치 영역 | 최소 **48×48** |
| 색 단독 사용 | 금지 — 색 + 형태/낱말 |
| 폰트 배율 | 130%까지 레이아웃 유지 |
| 플레이스홀더 | `fg/subtle` 이상 |

**예외 1건** — 네이버 로그인 버튼(`#03C75A` + 흰 글자 = 2.2:1). 공식 규격이라 변경 불가.

**Lighthouse는 텍스트 대비만 본다.** 아이콘·경계선은 디자인 단계에서 직접 계산한다.

---

## 10. 콘텐츠 · 보이스

### 10.1 CTA 어휘 — 5개

| 어휘 | 쓰는 상황 |
|---|---|
| 다음 | 여러 단계 중 진행 |
| 완료 | 마지막 단계 마감 |
| 저장하기 | 산출물 확정 |
| 시작하기 | 진입 |
| 취소 | 되돌리기 |

보조는 `잘 모르겠어요 · 없어요`와 `취소` 두 갈래만.

### 10.2 어투

| 원칙 | 예 |
|---|---|
| 시키지 않고 함께 한다 | ✅ "편하게 말씀하시면 제가 정리할게요" / ❌ "증상을 입력하세요" |
| 실패를 사용자 탓으로 돌리지 않는다 | ✅ "두 글자 이상 적어주세요" / ❌ "형식이 올바르지 않습니다" |
| 빈 화면은 사과가 아니라 초대 | ✅ "증상을 정리해두면 진료실에서 바로 보여줄 수 있어요" (`Empty State/NoRecord`) |
| 권한은 요구하지 않고 대안을 준다 | ✅ "설정에서 마이크 권한을 켜면 말로 입력할 수 있어요" + 직접 입력 |

### 10.3 AI 표현

| 해도 되는 것 | 하면 안 되는 것 |
|---|---|
| "말씀하신 내용을 정리했어요" | "위염으로 보입니다" |
| "묻고 싶은 것을 뽑아봤어요" | "○○과에 가세요" |
| "소견·검사·약·재방문으로 나눴어요" | "응급입니다" |
| "틀린 곳이 있으면 고칠 수 있어요" | 원문 없이 정리 결과만 제시 |

---

## 11. 검수 기준

화면 하나를 완료로 볼 조건.

| # | 항목 |
|---|---|
| 1 | 모든 색이 Semantic 토큰에 바인딩 (하드코딩 0) |
| 2 | 모든 텍스트가 시스템 텍스트 스타일 적용 |
| 3 | 대비 4.5 / 큰 글자 3 / 비텍스트 3 전부 통과 |
| 4 | 오토레이아웃 넘침 0 |
| 5 | 높이 HUG · 폭 FILL · **최소 812** |
| 6 | 컴포넌트 인스턴스 사용, detach 없음 |
| 7 | 한국어 카피가 실제 문장 |
| 8 | 터치 영역 48 이상 |
| 9 | **스크린샷으로 렌더 확인** |
| 10 | IA · 유저플로우의 화면 코드와 일치 |

---

## 12. 현재 상태

2026-09-09 기준 실측값.

| 항목 | 값 |
|---|---|
| 화면 | **72장** · 전부 폭 360 |
| 최소 높이 812 | **72 / 72** |
| 좌우 여백 20 | **72 / 72** |
| 콘텐츠 폭 320 | **72 / 72** |
| Nav Bar 56 | **63 / 63** |
| Footer safe 24 | **49 / 49** |
| 버튼 높이 56 · 48 | **61 / 61** |
| 텍스트 스타일 미적용 | **0** |
| 하드코딩 색 | **0** |
| 오토레이아웃 넘침 | **0** |
| 커스텀 아이콘 상자 | **0** |

### 섹션별 화면 수

| 섹션 | 장수 |
|---|---|
| A · 진입 | 3 |
| B · 신상정보 | 4 |
| C · 홈 | 3 |
| D · 증상 문답 | 11 |
| E · 브리핑 카드 → 진료실 전달 | 9 |
| F · 진료 후 | 9 |
| G · 캘린더 · 기록 | 28 |
| H · 내 정보 | 2 |
| Z · 프로토타입 전용 | 3 |

### 아이콘 사용 현황

`Icon/close`는 두 가지 규격만 쓴다.

| 규격 | 개수 | 쓰이는 곳 |
|---|---|---|
| 32 / 18 (S) | 77 | 항목 안 보조 삭제 |
| 48 / 24 (L) | 41 | 화면 · 필드 단위 액션 |

전부 `Icon Button` 인스턴스다.

### Scale 토큰 바인딩 — 미완

색 토큰은 100% 바인딩돼 있지만 **Scale 33개는 바인딩 0건**이다. 반경·간격·크기를 숫자로 직접 넣고 있다.

값 자체는 규격을 지키고 있어 개발 전달에는 문제가 없다.

스케일에 없는 값이 쓰이는 곳.

| 값 | 횟수 | 쓰인 곳 | 통일안 |
|---|---|---|---|
| 반경 13 | 67 | 아이콘 상자 44 · 시트 날짜 셀 | `radius/sm` 12 |
| 반경 10 | 65 | 질문 번호 배지 · 작은 pill | `radius/full` |
| 반경 14 | 18 | 아이콘 상자 48 · 다음 일정 액션 | `radius/md` 16 |
| 간격 3 | 86 | 제목 + 보조 문구 사이 | `space/4` |
| 간격 5 | 28 | 다음 일정 카드 메타 | `space/6` |
