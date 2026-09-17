# 아이콘 · 로고 SVG 변환표

`C:/Claude/MedicalMate/app/src/main/res/drawable/*.xml` 60개를 **파서로 전수 읽어**
`android:pathData` 를 뽑고 SVG 문자열로 옮긴 결과다. 아래 `d` 값은 전부 원본 파일에서
그대로 복사된 것이고 손으로 다듬은 좌표가 하나도 없다. `viewBox` 도 원본의
`android:viewportWidth` / `android:viewportHeight` 를 그대로 썼다.

| | 개수 |
|---|---|
| **변환 완료** | **52** — 아이콘 46 + 로고 5 + 카카오 심볼 1 |
| 변환 보류 | 8 — `<gradient>` 6 (로고 1 · 런처 배경 1 · 온보딩 일러스트 4) · `<group>` 1 · `<shape>` 1 |
| 합계 | 60 |

> 원본 파일 주석: *"drawable 파일은 Figma 에서 내보낸 것이다. **손으로 고치지 말고
> 원본에서 다시 내보낸다.**"* — 아래 SVG 도 같다. 모양을 고쳐야 하면 Figma 에서
> 다시 내보내고 이 표를 재생성한다.

---

## 0. 변환 규칙

| Vector Drawable | SVG | 비고 |
|---|---|---|
| `android:viewportWidth="24" viewportHeight="24"` | `viewBox="0 0 24 24"` | |
| `android:width="24dp" android:height="24dp"` | **버린다** | 크기는 CSS 가 준다 (`--mm-size-icon-*`) |
| `android:pathData` | `d` | 문법이 동일하다. M/L/H/V/C/A/Z 그대로 |
| `android:strokeColor="#131722"` | `stroke="currentColor"` | tint 를 받으려고 바꾼다 |
| `android:strokeWidth="1.75"` | `stroke-width="1.75"` | |
| `android:strokeLineCap="round"` | `stroke-linecap="round"` | |
| `android:strokeLineJoin="round"` | `stroke-linejoin="round"` | |
| `android:fillColor="#131722"` | `fill="currentColor"` | 단색일 때만. 다색 로고는 원본 HEX 유지 |
| `android:fillColor="#FF000000"` | `fill="#000000"` | 앞 `FF` 는 알파다 |
| `android:fillType="evenOdd"` | `fill-rule="evenodd"` | `ic_user_filled` 하나뿐 |
| `fillColor` 없음 (= 미채움) | **`fill="none"` 필수** | ← 유일한 함정 |

**함정은 마지막 줄 하나다.** Vector Drawable 은 `fillColor` 를 안 쓰면 채우지 않지만,
SVG `path` 의 `fill` 초기값은 `black` 이다. 그대로 옮기면 획형 아이콘 42종이 전부
검은 덩어리가 된다. 아래 SVG 는 전부 루트에 `fill="none"` 을 박아 뒀다.

### 파서가 확인한 공통 규격 (46/46)

| 항목 | 값 | 예외 |
|---|---|---|
| `viewportWidth` / `Height` | `24` / `24` | 없음 |
| `android:width` / `height` | `24dp` | 없음 |
| 색 | `#131722` (= `fg/default`) | 없음 |
| `strokeWidth` | `1.75` | **`ic_more_horizontal` 만 `2.6`** |
| `strokeLineCap` / `LineJoin` | `round` / `round` | 획형 42종 전부 |
| `<group>` · `clip-path` · `trimPath` · `<gradient>` | **0개** | 없음 |
| `fillType` | 미지정 (= nonZero) | **`ic_user_filled` 만 `evenOdd`** |
| 획형 : 채움형 | **42 : 4** | 채움형은 탭 활성 4종뿐 |

즉 46개 변환에 조건 분기가 필요한 곳은 `more-horizontal` 의 획 굵기와
`user-filled` 의 `fill-rule` **두 곳뿐**이다.

### 쓰는 법

`tokens.css` 의 `.mm-icon` 이 획 규격을 이미 공통으로 걸어 둔다. 그래서 아래 SVG 를
컴포넌트에 넣을 때 루트 속성을 지우고 `class="mm-icon"` 만 붙여도 된다.

```html
<svg class="mm-icon mm-icon--md" viewBox="0 0 24 24" aria-hidden="true">
  <path d="M4.8 12.6 L9.6 17.4 L19.2 6.8"/>
</svg>
```

- 라벨 없는 아이콘 버튼에는 접근성 이름을 반드시 준다. 장식이면 `aria-hidden="true"`.
- **16 이하로 줄이지 않는다.** 획이 뭉개진다.
- 채움형(`*-filled`)은 **탭 활성 전용**이다. 색만 바뀌면 색각 이상에서 상태가 전달되지 않는다.

---

## 1. 변환 완료 — 아이콘 46종 (`viewBox="0 0 24 24"`)

### 1.1 목록

| # | Kotlin | Figma `Icon/` | drawable | node | 그룹 | path | 획/채움 | 쓰이는 곳 |
|---|---|---|---|---|---|---|---|---|
| 1 | `Mic` | `mic` | `ic_mic.xml` | `302:698` | 음성 입력 | 3 | 획 1.75 | VoiceInput, Fab, IntakeChat, VisitNoteScreen |
| 2 | `MicListening` | `mic-listening` | `ic_mic_listening.xml` | `302:705` | 음성 입력 | 5 | 획 1.75 | 호출부 없음 |
| 3 | `MicOff` | `mic-off` | `ic_mic_off.xml` | `302:712` | 음성 입력 | 5 | 획 1.75 | VoiceInput, EmptyState(MicDenied) |
| 4 | `Waveform` | `waveform` | `ic_waveform.xml` | `302:719` | 음성 입력 | 5 | 획 1.75 | VoiceInput |
| 5 | `ChevronLeft` | `chevron-left` | `ic_chevron_left.xml` | `302:722` | 내비게이션 | 1 | 획 1.75 | NavBar(Back), CalendarMonthScreen, ScheduleAddSheets |
| 6 | `ChevronRight` | `chevron-right` | `ic_chevron_right.xml` | `302:725` | 내비게이션 | 1 | 획 1.75 | PickerField, Rows, RecordList, CalendarMonthScreen |
| 7 | `ChevronUp` | `chevron-up` | `ic_chevron_up.xml` | `302:731` | 내비게이션 | 1 | 획 1.75 | RecordDetailStep(접기/펼치기) |
| 8 | `ChevronDown` | `chevron-down` | `ic_chevron_down.xml` | `302:728` | 내비게이션 | 1 | 획 1.75 | RecordDetailStep(접기/펼치기) |
| 9 | `ArrowRight` | `arrow-right` | `ic_arrow_right.xml` | `302:735` | 내비게이션 | 2 | 획 1.75 | 호출부 없음 |
| 10 | `ArrowUp` | `arrow-up` | `ic_arrow_up.xml` | `623:6017` | 내비게이션 | 2 | 획 1.75 | IntakeChat(보내기) |
| 11 | `Close` | `close` | `ic_close.xml` | `302:739` | 내비게이션 | 2 | 획 1.75 | NavBar(Close), SearchField, Callout, Rows(KV ×), TodoRow |
| 12 | `Plus` | `plus` | `ic_plus.xml` | `302:743` | 내비게이션 | 2 | 획 1.75 | AddRow, CalendarMonthScreen, HealthEditScreen, IntakeSteps |
| 13 | `Minus` | `minus` | `ic_minus.xml` | `302:746` | 내비게이션 | 1 | 획 1.75 | 호출부 없음 |
| 14 | `MoreHorizontal` | `more-horizontal` | `ic_more_horizontal.xml` | `305:1026` | 내비게이션 | 3 | **획 2.6** | 호출부 없음 |
| 15 | `Info` | `info` | `ic_info.xml` | `302:773` | 상태 | 3 | 획 1.75 | Notice(Info), Toast(Info), TooltipTrigger |
| 16 | `Check` | `check` | `ic_check.xml` | `302:754` | 상태 | 1 | 획 1.75 | Selection(체크박스), CardPick, HospitalPickScreen |
| 17 | `CheckCircle` | `check-circle` | `ic_check_circle.xml` | `302:758` | 상태 | 2 | 획 1.75 | Notice(Success), Toast(Success), IntakeDoneScreen |
| 18 | `AlertCircle` | `alert-circle` | `ic_alert_circle.xml` | `302:763` | 상태 | 3 | 획 1.75 | Notice(Danger), Toast(Danger), Dialog |
| 19 | `AlertTriangle` | `alert-triangle` | `ic_alert_triangle.xml` | `302:768` | 상태 | 3 | 획 1.75 | Notice(Warning), Toast(Warning) |
| 20 | `Spinner` | `spinner` | `ic_spinner.xml` | `305:1029` | 상태 | 1 | 획 1.75 | 호출부 없음 — Loading.kt 는 M3 CircularProgressIndicator 를 쓴다 |
| 21 | `Home` | `home` | `ic_home.xml` | `303:697` | 하단 탭·구조 | 2 | 획 1.75 | TabBar(비활성) |
| 22 | `Note` | `note` | `ic_note.xml` | `303:703` | 하단 탭·구조 | 4 | 획 1.75 | TabBar(비활성) |
| 23 | `Calendar` | `calendar` | `ic_calendar.xml` | `303:712` | 하단 탭·구조 | 7 | 획 1.75 | TabBar(비활성), ScheduleAddScreen |
| 24 | `User` | `user` | `ic_user.xml` | `303:716` | 하단 탭·구조 | 2 | 획 1.75 | 호출부 없음 — Tab Bar v2 가 4탭→3탭이라 내 정보 탭이 빠졌다 |
| 25 | `HomeFilled` | `home-filled` | `ic_home_filled.xml` | `353:1294` | 하단 탭 활성 | 1 | 채움 | TabBar(활성) |
| 26 | `NoteFilled` | `note-filled` | `ic_note_filled.xml` | `352:1269` | 하단 탭 활성 | 1 | 채움 | TabBar(활성) |
| 27 | `CalendarFilled` | `calendar-filled` | `ic_calendar_filled.xml` | `349:1272` | 하단 탭 활성 | 3 | 채움 | TabBar(활성) |
| 28 | `UserFilled` | `user-filled` | `ic_user_filled.xml` | `318:928` | 하단 탭 활성 | 1 | 채움 · `evenOdd` | 호출부 없음 (3탭 전환) |
| 29 | `Stethoscope` | `stethoscope` | `ic_stethoscope.xml` | `303:723` | 임상 | 5 | 획 1.75 | HomeComponents |
| 30 | `Pill` | `pill` | `ic_pill.xml` | `305:1039` | 임상 | 2 | 획 1.75 | 호출부 없음 |
| 31 | `HeartPulse` | `heart-pulse` | `ic_heart_pulse.xml` | `305:1043` | 임상 | 2 | 획 1.75 | 호출부 없음 |
| 32 | `BodyPoint` | `body-point` | `ic_body_point.xml` | `305:1048` | 임상 | 3 | 획 1.75 | 호출부 없음 |
| 33 | `Hospital` | `hospital` | `ic_hospital.xml` | `305:1035` | 임상 | 4 | 획 1.75 | HospitalCard, HospitalPickScreen, VisitNoteScreen |
| 34 | `Edit` | `edit` | `ic_edit.xml` | `303:749` | 액션 | 2 | 획 1.75 | SourceQuote |
| 35 | `Share` | `share` | `ic_share.xml` | `303:754` | 액션 | 3 | 획 1.75 | 호출부 없음 |
| 36 | `Copy` | `copy` | `ic_copy.xml` | `303:758` | 액션 | 2 | 획 1.75 | 호출부 없음 |
| 37 | `Trash` | `trash` | `ic_trash.xml` | `303:765` | 액션 | 5 | 획 1.75 | Dialog(삭제 확인) |
| 38 | `Search` | `search` | `ic_search.xml` | `303:769` | 액션 | 2 | 획 1.75 | SearchField |
| 39 | `Bell` | `bell` | `ic_bell.xml` | `303:773` | 액션 | 2 | 획 1.75 | HomeComponents |
| 40 | `Clock` | `clock` | `ic_clock.xml` | `303:777` | 액션 | 2 | 획 1.75 | ScheduleAddScreen, CalendarDayScreen |
| 41 | `Camera` | `camera` | `ic_camera.xml` | `303:781` | 액션 | 2 | 획 1.75 | 호출부 없음 |
| 42 | `Chat` | `chat` | `ic_chat.xml` | `303:784` | 액션 | 1 | 획 1.75 | Callout |
| 43 | `Lock` | `lock` | `ic_lock.xml` | `303:789` | 액션 | 3 | 획 1.75 | 호출부 없음 |
| 44 | `EmptyBox` | `empty-box` | `ic_empty_box.xml` | `303:794` | 빈 상태 | 3 | 획 1.75 | EmptyState(NoRecord) |
| 45 | `SearchOff` | `search-off` | `ic_search_off.xml` | `305:1054` | 빈 상태 | 4 | 획 1.75 | EmptyState(NoResult) |
| 46 | `WifiOff` | `wifi-off` | `ic_wifi_off.xml` | `305:1063` | 빈 상태 | 7 | 획 1.75 | EmptyState(Offline) |

미사용 14종 — `MicListening` `ArrowRight` `Minus` `MoreHorizontal` `Spinner` `User`
`UserFilled` `Pill` `HeartPulse` `BodyPoint` `Share` `Copy` `Camera` `Lock`.
웹 초기 번들에서 빼도 화면이 비지 않지만 Figma 마스터에 있는 자산이라 남겨 둔다.

### 1.2 SVG 문자열

#### 음성 입력

##### `mic` — `Mic` · Figma `302:698`

```html
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12 3.2002 C12.368 3.2002 12.732 3.2726 13.071 3.4133 C13.411 3.554 13.72 3.7603 13.98 4.0203 C14.24 4.2803 14.446 4.589 14.587 4.9287 C14.728 5.2684 14.8 5.6325 14.8 6.0002 V11.0002 C14.8 11.7428 14.505 12.455 13.98 12.9801 C13.455 13.5052 12.743 13.8002 12 13.8002 C11.257 13.8002 10.545 13.5052 10.02 12.9801 C9.495 12.455 9.2 11.7428 9.2 11.0002 V6.0002 C9.2 5.2576 9.495 4.5454 10.02 4.0203 C10.545 3.4952 11.257 3.2002 12 3.2002 Z"/>
  <path d="M5.8 11.2002 C5.8 12.8445 6.4533 14.4215 7.616 15.584 C8.779 16.747 10.356 17.4 12 17.4 C13.644 17.4 15.221 16.747 16.384 15.584 C17.547 14.4215 18.2 12.8445 18.2 11.2002"/>
  <path d="M12 17.4 V20.8"/>
</svg>
```

##### `mic-listening` — `MicListening` · Figma `302:705`

```html
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12 3.2002 C12.368 3.2002 12.732 3.2726 13.071 3.4133 C13.411 3.554 13.72 3.7603 13.98 4.0203 C14.24 4.2803 14.446 4.589 14.587 4.9287 C14.728 5.2684 14.8 5.6325 14.8 6.0002 V11.0002 C14.8 11.7428 14.505 12.455 13.98 12.9801 C13.455 13.5052 12.743 13.8002 12 13.8002 C11.257 13.8002 10.545 13.5052 10.02 12.9801 C9.495 12.455 9.2 11.7428 9.2 11.0002 V6.0002 C9.2 5.2576 9.495 4.5454 10.02 4.0203 C10.545 3.4952 11.257 3.2002 12 3.2002 Z"/>
  <path d="M5.8 11.2002 C5.8 12.8445 6.453 14.4215 7.616 15.584 C8.779 16.747 10.356 17.4 12 17.4 C13.644 17.4 15.221 16.747 16.384 15.584 C17.547 14.4215 18.2 12.8445 18.2 11.2002"/>
  <path d="M12 17.4 V20.8"/>
  <path d="M2.6 9.5996 V14.3996"/>
  <path d="M21.4 9.5996 V14.3996"/>
</svg>
```

##### `mic-off` — `MicOff` · Figma `302:712`

```html
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
  <path d="M9.2 6.4002 V6.0002 C9.2 5.2576 9.495 4.5454 10.02 4.0203 C10.545 3.4952 11.257 3.2002 12 3.2002 C12.743 3.2002 13.455 3.4952 13.98 4.0203 C14.505 4.5454 14.8 5.2576 14.8 6.0002 V11.0002 C14.8 11.5002 14.67 11.9702 14.44 12.3802"/>
  <path d="M11 13.6996 C10.47 13.4969 10.014 13.1377 9.692 12.6698 C9.371 12.2019 9.199 11.6473 9.2 11.0796 V9.5996"/>
  <path d="M5.8 11.2002 C5.803 12.3271 6.114 13.4319 6.698 14.3957 C7.282 15.359 8.117 16.146 9.115 16.67 C10.112 17.195 11.234 17.437 12.359 17.372 C13.484 17.307 14.57 16.936 15.5 16.3"/>
  <path d="M12 17.4 V20.8"/>
  <path d="M4 4 L20 20"/>
</svg>
```

##### `waveform` — `Waveform` · Figma `302:719`

```html
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
  <path d="M4 10.2002 V13.8002"/>
  <path d="M8 6.7998 V17.2"/>
  <path d="M12 4.2002 V19.8"/>
  <path d="M16 6.7998 V17.2"/>
  <path d="M20 10.2002 V13.8002"/>
</svg>
```

#### 내비게이션

##### `chevron-left` — `ChevronLeft` · Figma `302:722`

```html
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
  <path d="M14.8 5.2002 L8 12.0002 L14.8 18.8"/>
</svg>
```

##### `chevron-right` — `ChevronRight` · Figma `302:725`

```html
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
  <path d="M9.2 5.2002 L16 12.0002 L9.2 18.8"/>
</svg>
```

##### `chevron-up` — `ChevronUp` · Figma `302:731`

```html
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
  <path d="M5.2 14.8 L12 8 L18.8 14.8"/>
</svg>
```

##### `chevron-down` — `ChevronDown` · Figma `302:728`

```html
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
  <path d="M5.2 9.2002 L12 16 L18.8 9.2002"/>
</svg>
```

##### `arrow-right` — `ArrowRight` · Figma `302:735`

```html
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
  <path d="M4.4 12 H19.6"/>
  <path d="M13.4 5.7998 L19.6 11.9998 L13.4 18.2"/>
</svg>
```

##### `arrow-up` — `ArrowUp` · Figma `623:6017`

```html
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12 19.6L12 4.40001"/>
  <path d="M5.79999 10.6L12 4.40001L18.2 10.6"/>
</svg>
```

##### `close` — `Close` · Figma `302:739`

```html
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
  <path d="M6.2 6.2002 L17.8 17.8"/>
  <path d="M17.8 6.2002 L6.2 17.8"/>
</svg>
```

##### `plus` — `Plus` · Figma `302:743`

```html
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12 4.8 V19.2"/>
  <path d="M4.8 12 H19.2"/>
</svg>
```

##### `minus` — `Minus` · Figma `302:746`

```html
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
  <path d="M4.8 12 H19.2"/>
</svg>
```

##### `more-horizontal` — `MoreHorizontal` · Figma `305:1026`

> **획 굵기가 2.6 다** (다른 45종은 1.75). `.mm-icon--dots` 를 함께 건다

```html
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
  <path d="M6 12 H6.01"/>
  <path d="M12 12 H12.01"/>
  <path d="M18 12 H18.01"/>
</svg>
```

#### 상태

##### `info` — `Info` · Figma `302:773`

```html
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12 3.2 C14.334 3.2 16.572 4.127 18.222 5.778 C19.873 7.428 20.8 9.666 20.8 12 C20.8 14.334 19.873 16.572 18.222 18.223 C16.572 19.873 14.334 20.8 12 20.8 C9.666 20.8 7.428 19.873 5.777 18.223 C4.127 16.572 3.2 14.334 3.2 12 C3.2 9.666 4.127 7.428 5.777 5.778 C7.428 4.127 9.666 3.2 12 3.2 Z"/>
  <path d="M12 11.4 V16.4"/>
  <path d="M12 7.8 H12.01"/>
</svg>
```

##### `check` — `Check` · Figma `302:754`

```html
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
  <path d="M4.8 12.6 L9.6 17.4 L19.2 6.8"/>
</svg>
```

##### `check-circle` — `CheckCircle` · Figma `302:758`

```html
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12 3.2 C14.334 3.2 16.572 4.127 18.222 5.778 C19.873 7.428 20.8 9.666 20.8 12 C20.8 14.334 19.873 16.572 18.222 18.223 C16.572 19.873 14.334 20.8 12 20.8 C9.666 20.8 7.428 19.873 5.777 18.223 C4.127 16.572 3.2 14.334 3.2 12 C3.2 9.666 4.127 7.428 5.777 5.778 C7.428 4.127 9.666 3.2 12 3.2 Z"/>
  <path d="M8.2 12.2 L10.9 14.9 L15.9 9.4"/>
</svg>
```

##### `alert-circle` — `AlertCircle` · Figma `302:763`

```html
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12 3.2 C14.334 3.2 16.572 4.127 18.222 5.778 C19.873 7.428 20.8 9.666 20.8 12 C20.8 14.334 19.873 16.572 18.222 18.223 C16.572 19.873 14.334 20.8 12 20.8 C9.666 20.8 7.428 19.873 5.777 18.223 C4.127 16.572 3.2 14.334 3.2 12 C3.2 9.666 4.127 7.428 5.777 5.778 C7.428 4.127 9.666 3.2 12 3.2 Z"/>
  <path d="M12 7.6 V12.6"/>
  <path d="M12 16.2 H12.01"/>
</svg>
```

##### `alert-triangle` — `AlertTriangle` · Figma `302:768`

```html
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
  <path d="M10.6 4.1 L2.9 17.4 C2.759 17.644 2.685 17.921 2.686 18.203 C2.686 18.486 2.761 18.762 2.904 19.006 C3.046 19.25 3.25 19.451 3.495 19.591 C3.74 19.73 4.018 19.802 4.3 19.8 H19.7 C19.982 19.802 20.26 19.73 20.505 19.591 C20.75 19.451 20.954 19.25 21.096 19.006 C21.239 18.762 21.314 18.486 21.314 18.203 C21.315 17.921 21.241 17.644 21.1 17.4 L13.4 4.1 C13.262 3.85 13.059 3.641 12.813 3.496 C12.566 3.351 12.286 3.274 12 3.274 C11.714 3.274 11.434 3.351 11.187 3.496 C10.941 3.641 10.738 3.85 10.6 4.1 Z"/>
  <path d="M12 9.4 V13.4"/>
  <path d="M12 16.6 H12.01"/>
</svg>
```

##### `spinner` — `Spinner` · Figma `305:1029`

> 열린 호 1개라 `.mm-icon--spin` 만 걸면 그대로 로딩 스피너가 된다

```html
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
  <path d="M20.4 12 C20.4 13.944 19.726 15.827 18.493 17.329 C17.26 18.831 15.544 19.859 13.638 20.238 C11.732 20.617 9.754 20.324 8.04 19.408 C6.326 18.491 4.983 17.009 4.239 15.214 C3.496 13.418 3.398 11.42 3.962 9.561 C4.526 7.701 5.718 6.095 7.334 5.015 C8.95 3.935 10.89 3.45 12.824 3.64 C14.758 3.831 16.566 4.686 17.94 6.06"/>
</svg>
```

#### 하단 탭·구조

##### `home` — `Home` · Figma `303:697`

```html
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
  <path d="M3.6 10.6 L12 3.8 L20.4 10.6 V18.8 C20.4 19.01 20.359 19.218 20.278 19.412 C20.198 19.606 20.08 19.783 19.931 19.931 C19.783 20.08 19.606 20.198 19.412 20.278 C19.218 20.358 19.01 20.4 18.8 20.4 H5.2 C4.99 20.4 4.782 20.358 4.588 20.278 C4.394 20.198 4.217 20.08 4.069 19.931 C3.92 19.783 3.802 19.606 3.722 19.412 C3.641 19.218 3.6 19.01 3.6 18.8 V10.6 Z"/>
  <path d="M9.6 20.4 V14.4 H14.4 V20.4"/>
</svg>
```

##### `note` — `Note` · Figma `303:703`

```html
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
  <path d="M6 3.4 H15.2 L19.6 7.8 V18.8 C19.6 19.037 19.553 19.271 19.463 19.489 C19.372 19.708 19.24 19.906 19.073 20.073 C18.906 20.24 18.707 20.373 18.489 20.463 C18.27 20.554 18.036 20.6 17.8 20.6 H6 C5.7636 20.6 5.5295 20.554 5.3111 20.463 C5.0927 20.373 4.8943 20.24 4.7272 20.073 C4.56 19.906 4.4274 19.708 4.337 19.489 C4.2465 19.271 4.2 19.037 4.2 18.8 V5.2 C4.2 4.723 4.3896 4.265 4.7272 3.928 C5.0647 3.59 5.5226 3.4 6 3.4 Z"/>
  <path d="M14.8 3.6 V8 H19.4"/>
  <path d="M8.4 13 H15.6"/>
  <path d="M8.4 16.6 H13.2"/>
</svg>
```

##### `calendar` — `Calendar` · Figma `303:712`

```html
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
  <path d="M5.6 5.4 H18.4 C18.824 5.4 19.231 5.569 19.531 5.869 C19.831 6.169 20 6.576 20 7 V18.4 C20 18.825 19.831 19.232 19.531 19.532 C19.231 19.832 18.824 20 18.4 20 H5.6 C5.176 20 4.769 19.832 4.469 19.532 C4.169 19.232 4 18.825 4 18.4 V7 C4 6.576 4.169 6.169 4.469 5.869 C4.769 5.569 5.176 5.4 5.6 5.4 Z"/>
  <path d="M4 9.8 H20"/>
  <path d="M8.4 3.4 V6.8"/>
  <path d="M15.6 3.4 V6.8"/>
  <path d="M8.6 13.6 H8.61"/>
  <path d="M12 13.6 H12.01"/>
  <path d="M15.4 13.6 H15.41"/>
</svg>
```

##### `user` — `User` · Figma `303:716`

```html
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12 11.6 C12.486 11.6 12.967 11.504 13.416 11.319 C13.865 11.133 14.273 10.86 14.616 10.516 C14.96 10.173 15.232 9.765 15.418 9.316 C15.604 8.867 15.7 8.386 15.7 7.9 C15.7 7.414 15.604 6.933 15.418 6.484 C15.232 6.035 14.96 5.627 14.616 5.284 C14.273 4.94 13.865 4.668 13.416 4.482 C12.967 4.296 12.486 4.2 12 4.2 C11.019 4.2 10.078 4.59 9.384 5.284 C8.69 5.978 8.3 6.919 8.3 7.9 C8.3 8.881 8.69 9.823 9.384 10.516 C10.078 11.21 11.019 11.6 12 11.6 Z"/>
  <path d="M4.6 20.4 C4.6 16.8 7.9 14.4 12 14.4 C16.1 14.4 19.4 16.8 19.4 20.4"/>
</svg>
```

#### 하단 탭 활성

##### `home-filled` — `HomeFilled` · Figma `353:1294`

> 채움형이다. `.mm-icon--filled` 를 건다 (`fill: currentColor; stroke: none`)

```html
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
  <path d="M21.28 10.52 C21.444 10.656 21.575 10.828 21.665 11.021 C21.755 11.215 21.801 11.426 21.8 11.64 V18.85 C21.8 19.393 21.584 19.915 21.2 20.3 C20.816 20.684 20.293 20.9 19.75 20.9 H14.45 V14.75 C14.45 14.604 14.392 14.464 14.289 14.361 C14.186 14.258 14.046 14.2 13.9 14.2 H10.1 C9.954 14.2 9.814 14.258 9.711 14.361 C9.608 14.464 9.55 14.604 9.55 14.75 V20.9 H4.2498 C3.7062 20.9 3.1849 20.684 2.8006 20.3 C2.4161 19.915 2.2 19.393 2.2 18.85 V11.64 C2.1989 11.426 2.2449 11.215 2.3347 11.021 C2.4246 10.828 2.5558 10.656 2.7195 10.52 L12 3 L21.28 10.52 Z"/>
</svg>
```

##### `note-filled` — `NoteFilled` · Figma `352:1269`

> 채움형이다. `.mm-icon--filled` 를 건다 (`fill: currentColor; stroke: none`)

```html
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
  <path d="M14.15 3.3 C14.336 3.299 14.52 3.334 14.691 3.404 C14.863 3.475 15.019 3.579 15.15 3.71 L19.39 7.95 C19.521 8.081 19.625 8.237 19.695 8.408 C19.765 8.58 19.801 8.765 19.8 8.95 V18.8 C19.8 19.304 19.6 19.787 19.244 20.144 C18.888 20.5 18.404 20.7 17.9 20.7 H6.1 C5.597 20.7 5.113 20.5 4.757 20.144 C4.4 19.787 4.2 19.304 4.2 18.8 V5.2 C4.2 4.696 4.4 4.213 4.757 3.856 C5.113 3.5 5.596 3.3 6.1 3.3 H14.15 ZM8.1 15.45 V17.05 H13.3 V15.45 H8.1 ZM8.1 13.55 H15.9 V11.95 H8.1 V13.55 ZM14.55 7.1 C14.55 7.497 14.708 7.879 14.989 8.16 C15.27 8.441 15.652 8.6 16.05 8.6 H19.1 L17.75 7.25 H16.05 C16.023 7.25 15.998 7.239 15.979 7.221 C15.96 7.202 15.95 7.176 15.95 7.149 V5.45 L14.55 4.05 V7.1 Z"/>
</svg>
```

##### `calendar-filled` — `CalendarFilled` · Figma `349:1272`

> 채움형이다. `.mm-icon--filled` 를 건다 (`fill: currentColor; stroke: none`)

```html
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
  <path d="M8.2 2.5 C8.479 2.5 8.746 2.611 8.942 2.808 C9.139 3.004 9.25 3.272 9.25 3.55 V4.7 C9.25 4.838 9.223 4.974 9.17 5.102 C9.117 5.229 9.04 5.345 8.942 5.442 C8.845 5.54 8.729 5.617 8.602 5.67 C8.474 5.723 8.338 5.75 8.2 5.75 C8.062 5.75 7.926 5.723 7.798 5.67 C7.671 5.617 7.555 5.54 7.458 5.442 C7.36 5.345 7.283 5.229 7.23 5.102 C7.177 4.974 7.15 4.838 7.15 4.7 V3.55 C7.15 3.272 7.261 3.004 7.458 2.808 C7.654 2.611 7.922 2.5 8.2 2.5 Z"/>
  <path d="M15.8 2.5 C16.078 2.5 16.346 2.611 16.542 2.808 C16.739 3.004 16.85 3.272 16.85 3.55 V4.7 C16.85 4.838 16.823 4.974 16.77 5.102 C16.717 5.229 16.64 5.345 16.542 5.442 C16.445 5.54 16.329 5.617 16.202 5.67 C16.074 5.723 15.938 5.75 15.8 5.75 C15.662 5.75 15.526 5.723 15.398 5.67 C15.271 5.617 15.155 5.54 15.058 5.442 C14.96 5.345 14.883 5.229 14.83 5.102 C14.777 4.974 14.75 4.838 14.75 4.7 V3.55 C14.75 3.272 14.861 3.004 15.058 2.808 C15.254 2.611 15.522 2.5 15.8 2.5 Z"/>
  <path d="M18.2 5.9 C18.704 5.9 19.187 6.101 19.544 6.457 C19.9 6.813 20.1 7.297 20.1 7.801 V18.7 C20.1 19.204 19.9 19.688 19.544 20.044 C19.187 20.4 18.704 20.601 18.2 20.601 H5.8 C5.297 20.601 4.813 20.4 4.457 20.044 C4.1 19.688 3.9 19.204 3.9 18.7 V7.801 C3.9 7.297 4.1 6.813 4.457 6.457 C4.813 6.101 5.297 5.9 5.8 5.9 H18.2 ZM8.15 13.9 C7.845 13.9 7.552 14.022 7.337 14.237 C7.121 14.453 7 14.746 7 15.051 C7 15.356 7.121 15.648 7.337 15.863 C7.552 16.079 7.845 16.2 8.15 16.2 C8.301 16.2 8.451 16.171 8.59 16.113 C8.73 16.055 8.857 15.97 8.964 15.863 C9.07 15.757 9.155 15.63 9.213 15.49 C9.27 15.351 9.3 15.202 9.3 15.051 C9.3 14.9 9.27 14.75 9.213 14.61 C9.155 14.471 9.07 14.344 8.964 14.237 C8.857 14.131 8.73 14.046 8.59 13.988 C8.451 13.93 8.301 13.9 8.15 13.9 ZM12 13.9 C11.695 13.9 11.403 14.022 11.187 14.237 C10.971 14.453 10.85 14.746 10.85 15.051 C10.85 15.356 10.972 15.648 11.187 15.863 C11.403 16.079 11.695 16.2 12 16.2 C12.151 16.2 12.301 16.171 12.44 16.113 C12.58 16.055 12.706 15.97 12.813 15.863 C12.92 15.757 13.004 15.63 13.062 15.49 C13.12 15.351 13.15 15.202 13.15 15.051 C13.15 14.9 13.12 14.75 13.062 14.61 C13.004 14.471 12.92 14.344 12.813 14.237 C12.706 14.131 12.58 14.046 12.44 13.988 C12.301 13.93 12.151 13.9 12 13.9 ZM15.85 13.9 C15.545 13.9 15.252 14.022 15.037 14.237 C14.821 14.453 14.7 14.746 14.7 15.051 C14.7 15.356 14.821 15.648 15.037 15.863 C15.252 16.079 15.545 16.2 15.85 16.2 C16.001 16.2 16.15 16.171 16.29 16.113 C16.429 16.056 16.556 15.97 16.663 15.863 C16.77 15.756 16.855 15.63 16.913 15.49 C16.97 15.351 17 15.202 17 15.051 C17 14.9 16.97 14.75 16.913 14.61 C16.855 14.471 16.77 14.344 16.663 14.237 C16.556 14.131 16.429 14.046 16.29 13.988 C16.15 13.931 16.001 13.9 15.85 13.9 ZM4.6 11.051 H19.4 V9.9 H4.6 V11.051 Z"/>
</svg>
```

##### `user-filled` — `UserFilled` · Figma `318:928`

> **`fill-rule="evenodd"` 가 필수다.** 빼면 안쪽 구멍이 메워진다

> 채움형이다. `.mm-icon--filled` 를 건다 (`fill: currentColor; stroke: none`)

```html
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
  <path fill-rule="evenodd" d="M12 11.9 C12.519 11.9 13.032 11.798 13.512 11.599 C13.991 11.401 14.426 11.11 14.793 10.743 C15.16 10.376 15.451 9.941 15.649 9.462 C15.848 8.982 15.95 8.469 15.95 7.95 C15.95 7.431 15.848 6.918 15.649 6.438 C15.451 5.959 15.16 5.524 14.793 5.157 C14.426 4.79 13.991 4.499 13.512 4.301 C13.032 4.102 12.519 4 12 4 C10.952 4 9.948 4.416 9.207 5.157 C8.466 5.898 8.05 6.902 8.05 7.95 C8.05 8.998 8.466 10.002 9.207 10.743 C9.948 11.484 10.952 11.9 12 11.9 ZM4.3 20.55 C4.3 16.7 7.75 14.1 12 14.1 C16.25 14.1 19.7 16.7 19.7 20.55 C19.7 20.775 19.61 20.992 19.451 21.151 C19.292 21.31 19.075 21.4 18.85 21.4 H5.15 C4.925 21.4 4.708 21.31 4.549 21.151 C4.39 20.992 4.3 20.775 4.3 20.55 Z"/>
</svg>
```

#### 임상

##### `stethoscope` — `Stethoscope` · Figma `303:723`

```html
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
  <path d="M6.2 3.6 V8.2 C6.2 9.314 6.642 10.382 7.43 11.169 C8.218 11.957 9.286 12.4 10.4 12.4 C11.514 12.4 12.582 11.957 13.37 11.169 C14.157 10.382 14.6 9.314 14.6 8.2 V3.6"/>
  <path d="M4.4 3.6 H7"/>
  <path d="M13.8 3.6 H16.4"/>
  <path d="M10.4 12.2 V15.4 C10.4 16.567 10.864 17.686 11.689 18.511 C12.514 19.337 13.633 19.8 14.8 19.8 C15.967 19.8 17.086 19.337 17.911 18.511 C18.736 17.686 19.2 16.567 19.2 15.4 V13.8"/>
  <path d="M19.2 10.2 C18.964 10.2 18.73 10.247 18.511 10.337 C18.293 10.428 18.094 10.56 17.927 10.727 C17.76 10.895 17.627 11.093 17.537 11.311 C17.447 11.53 17.4 11.764 17.4 12 C17.4 12.237 17.447 12.471 17.537 12.689 C17.627 12.907 17.76 13.106 17.927 13.273 C18.094 13.44 18.293 13.573 18.511 13.663 C18.73 13.754 18.964 13.8 19.2 13.8 C19.677 13.8 20.135 13.611 20.473 13.273 C20.81 12.935 21 12.478 21 12 C21 11.523 20.81 11.065 20.473 10.727 C20.135 10.39 19.677 10.2 19.2 10.2 Z"/>
</svg>
```

##### `pill` — `Pill` · Figma `305:1039`

```html
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
  <path d="M14.6 4.2 C15.504 3.488 16.637 3.133 17.785 3.202 C18.933 3.27 20.016 3.757 20.83 4.57 C21.643 5.383 22.13 6.466 22.198 7.614 C22.266 8.763 21.911 9.896 21.2 10.8 L10.8 21.2 C9.896 21.911 8.763 22.266 7.615 22.198 C6.467 22.129 5.384 21.643 4.57 20.829 C3.757 20.016 3.27 18.933 3.202 17.785 C3.134 16.637 3.489 15.504 4.2 14.6 L14.6 4.2 Z"/>
  <path d="M9.4 9.4 L15 15"/>
</svg>
```

##### `heart-pulse` — `HeartPulse` · Figma `305:1043`

```html
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12 20.4 L4.5 13 C4.032 12.007 3.927 10.882 4.202 9.819 C4.477 8.757 5.115 7.824 6.006 7.183 C6.896 6.541 7.983 6.232 9.078 6.308 C10.173 6.384 11.207 6.841 12 7.6 C12.793 6.841 13.827 6.384 14.922 6.308 C16.017 6.232 17.104 6.541 17.994 7.183 C18.885 7.824 19.523 8.757 19.798 9.819 C20.073 10.882 19.968 12.007 19.5 13 L12 20.4 Z"/>
  <path d="M7.4 12.6 H9.5 L10.8 10.2 L12.5 14.6 L13.7 12.6 H16.6"/>
</svg>
```

##### `body-point` — `BodyPoint` · Figma `305:1048`

```html
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12 3.2 C12.557 3.2 13.091 3.421 13.485 3.815 C13.879 4.209 14.1 4.743 14.1 5.3 C14.1 5.857 13.879 6.391 13.485 6.785 C13.091 7.179 12.557 7.4 12 7.4 C11.443 7.4 10.909 7.179 10.515 6.785 C10.121 6.391 9.9 5.857 9.9 5.3 C9.9 4.743 10.121 4.209 10.515 3.815 C10.909 3.421 11.443 3.2 12 3.2 Z"/>
  <path d="M8.2 9.2 H15.8 V15.2 H13.6 V20.8 H10.4 V15.2 H8.2 V9.2 Z"/>
  <path d="M12 12.4 H12.01"/>
</svg>
```

##### `hospital` — `Hospital` · Figma `305:1035`

```html
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
  <path d="M4.8 20.4 V6.8 C4.8 6.376 4.969 5.969 5.269 5.669 C5.569 5.369 5.976 5.2 6.4 5.2 H17.6 C18.024 5.2 18.431 5.369 18.731 5.669 C19.031 5.969 19.2 6.376 19.2 6.8 V20.4"/>
  <path d="M3.2 20.4 H20.8"/>
  <path d="M12 8.8 V14.2"/>
  <path d="M9.3 11.5 H14.7"/>
</svg>
```

#### 액션

##### `edit` — `Edit` · Figma `303:749`

```html
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
  <path d="M15.6 4.6 C16.038 4.163 16.631 3.917 17.25 3.917 C17.869 3.917 18.462 4.163 18.9 4.6 C19.338 5.038 19.583 5.632 19.583 6.25 C19.583 6.869 19.338 7.463 18.9 7.9 L9.2 17.6 L4.9 18.6 L5.9 14.3 L15.6 4.6 Z"/>
  <path d="M14.2 6 L18 9.8"/>
</svg>
```

##### `share` — `Share` · Figma `303:754`

```html
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12 15.6 V4.2"/>
  <path d="M8 8.2 L12 4.2 L16 8.2"/>
  <path d="M5.2 13.4 V18.8 C5.2 19.225 5.369 19.632 5.669 19.932 C5.969 20.232 6.376 20.4 6.8 20.4 H17.2 C17.41 20.4 17.618 20.359 17.812 20.279 C18.006 20.198 18.183 20.08 18.331 19.932 C18.48 19.783 18.598 19.607 18.678 19.413 C18.759 19.219 18.8 19.011 18.8 18.8 V13.4"/>
</svg>
```

##### `copy` — `Copy` · Figma `303:758`

```html
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
  <path d="M9.4 8.6 H18 C18.424 8.6 18.831 8.768 19.131 9.068 C19.431 9.368 19.6 9.775 19.6 10.2 V18.8 C19.6 19.01 19.559 19.218 19.478 19.412 C19.398 19.606 19.28 19.782 19.131 19.931 C18.983 20.08 18.806 20.197 18.612 20.278 C18.418 20.358 18.21 20.4 18 20.4 H9.4 C9.19 20.4 8.982 20.358 8.788 20.278 C8.594 20.197 8.417 20.08 8.269 19.931 C8.12 19.782 8.002 19.606 7.9218 19.412 C7.8414 19.218 7.8 19.01 7.8 18.8 V10.2 C7.8 9.775 7.9686 9.368 8.269 9.068 C8.569 8.768 8.976 8.6 9.4 8.6 Z"/>
  <path d="M4.8 15.4 C4.4645 15.313 4.1662 15.12 3.9498 14.85 C3.7334 14.579 3.6107 14.246 3.6 13.9 V5.2 C3.6 4.775 3.7685 4.368 4.0686 4.068 C4.3687 3.768 4.7756 3.6 5.2 3.6 H13.9 C14.62 3.7 15.2 4.15 15.4 4.8"/>
</svg>
```

##### `trash` — `Trash` · Figma `303:765`

```html
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
  <path d="M4.4 6.8 H19.6"/>
  <path d="M9.6 6.8 V4.9 C9.6 4.729 9.634 4.56 9.699 4.402 C9.764 4.244 9.86 4.101 9.981 3.98 C10.101 3.86 10.245 3.764 10.402 3.699 C10.56 3.633 10.729 3.6 10.9 3.6 H13.1 C13.445 3.6 13.775 3.737 14.019 3.98 C14.263 4.224 14.4 4.555 14.4 4.9 V6.8"/>
  <path d="M6.4 6.8 L7.3 18.9 C7.325 19.307 7.505 19.688 7.803 19.967 C8.1 20.246 8.492 20.401 8.9 20.4 H15.1 C15.508 20.401 15.9 20.246 16.197 19.967 C16.495 19.688 16.675 19.307 16.7 18.9 L17.6 6.8"/>
  <path d="M10.2 10.6 V16.6"/>
  <path d="M13.8 10.6 V16.6"/>
</svg>
```

##### `search` — `Search` · Figma `303:769`

```html
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
  <path d="M10.8 4.2 C12.55 4.2 14.229 4.896 15.467 6.133 C16.705 7.371 17.4 9.05 17.4 10.8 C17.4 12.551 16.705 14.229 15.467 15.467 C14.229 16.705 12.55 17.4 10.8 17.4 C9.05 17.4 7.371 16.705 6.133 15.467 C4.895 14.229 4.2 12.551 4.2 10.8 C4.2 9.05 4.895 7.371 6.133 6.133 C7.371 4.896 9.05 4.2 10.8 4.2 Z"/>
  <path d="M15.6 15.6 L20 20"/>
</svg>
```

##### `bell` — `Bell` · Figma `303:773`

```html
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12 3.6 C12.735 3.6 13.464 3.744 14.143 4.026 C14.822 4.307 15.44 4.72 15.96 5.24 C16.48 5.76 16.892 6.377 17.174 7.057 C17.455 7.736 17.6 8.464 17.6 9.2 C17.6 13.4 19 14.8 19 14.8 H5 C5 14.8 6.4 13.4 6.4 9.2 C6.4 7.714 6.99 6.29 8.04 5.24 C9.09 4.19 10.515 3.6 12 3.6 Z"/>
  <path d="M10.2 18 C10.364 18.338 10.619 18.623 10.938 18.823 C11.256 19.022 11.624 19.128 12 19.128 C12.376 19.128 12.744 19.022 13.062 18.823 C13.38 18.623 13.636 18.338 13.8 18"/>
</svg>
```

##### `clock` — `Clock` · Figma `303:777`

```html
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12 3.4 C13.129 3.4 14.248 3.623 15.291 4.055 C16.335 4.487 17.283 5.121 18.081 5.919 C18.88 6.718 19.513 7.666 19.945 8.709 C20.378 9.753 20.6 10.871 20.6 12 C20.6 13.13 20.378 14.248 19.945 15.291 C19.513 16.335 18.88 17.283 18.081 18.082 C17.283 18.88 16.335 19.514 15.291 19.946 C14.248 20.378 13.129 20.6 12 20.6 C9.719 20.6 7.532 19.694 5.919 18.082 C4.306 16.469 3.4 14.281 3.4 12 C3.4 9.72 4.306 7.532 5.919 5.919 C7.532 4.306 9.719 3.4 12 3.4 Z"/>
  <path d="M12 7.4 V12 L15.2 13.9"/>
</svg>
```

##### `camera` — `Camera` · Figma `303:781`

```html
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
  <path d="M6.2 7.4 H8.4 L9.7 5.2 H14.3 L15.6 7.4 H17.8 C18.277 7.4 18.735 7.59 19.073 7.927 C19.41 8.265 19.6 8.723 19.6 9.2 V17.4 C19.6 17.878 19.41 18.335 19.073 18.673 C18.735 19.011 18.277 19.2 17.8 19.2 H6.2 C5.723 19.2 5.265 19.011 4.927 18.673 C4.59 18.335 4.4 17.878 4.4 17.4 V9.2 C4.4 8.723 4.59 8.265 4.927 7.927 C5.265 7.59 5.723 7.4 6.2 7.4 Z"/>
  <path d="M12 10.4 C12.849 10.4 13.663 10.738 14.263 11.338 C14.863 11.938 15.2 12.752 15.2 13.6 C15.2 14.449 14.863 15.263 14.263 15.863 C13.663 16.463 12.849 16.8 12 16.8 C11.151 16.8 10.337 16.463 9.737 15.863 C9.137 15.263 8.8 14.449 8.8 13.6 C8.8 12.752 9.137 11.938 9.737 11.338 C10.337 10.738 11.151 10.4 12 10.4 Z"/>
</svg>
```

##### `chat` — `Chat` · Figma `303:784`

```html
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
  <path d="M4.4 6.2 C4.4 5.723 4.59 5.265 4.927 4.928 C5.265 4.59 5.723 4.4 6.2 4.4 H17.8 C18.277 4.4 18.735 4.59 19.073 4.928 C19.41 5.265 19.6 5.723 19.6 6.2 V14.2 C19.6 14.678 19.41 15.136 19.073 15.473 C18.735 15.811 18.277 16 17.8 16 H9.6 L5.4 19.6 C5.313 19.678 5.205 19.729 5.089 19.747 C4.974 19.764 4.855 19.747 4.749 19.698 C4.643 19.65 4.553 19.571 4.491 19.472 C4.429 19.372 4.398 19.257 4.4 19.14 V6.2 Z"/>
</svg>
```

##### `lock` — `Lock` · Figma `303:789`

```html
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
  <path d="M6.6 10.4 H17.4 C17.824 10.4 18.231 10.569 18.531 10.869 C18.831 11.169 19 11.576 19 12 V18.8 C19 19.225 18.831 19.632 18.531 19.932 C18.231 20.232 17.824 20.4 17.4 20.4 H6.6 C6.176 20.4 5.769 20.232 5.469 19.932 C5.169 19.632 5 19.225 5 18.8 V12 C5 11.576 5.169 11.169 5.469 10.869 C5.769 10.569 6.176 10.4 6.6 10.4 Z"/>
  <path d="M8.2 10.4 V7.8 C8.2 6.792 8.6 5.826 9.313 5.113 C10.026 4.4 10.992 4 12 4 C13.008 4 13.974 4.4 14.687 5.113 C15.4 5.826 15.8 6.792 15.8 7.8 V10.4"/>
  <path d="M12 14.4 V16.8"/>
</svg>
```

#### 빈 상태

##### `empty-box` — `EmptyBox` · Figma `303:794`

```html
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
  <path d="M3.8 8.6 L12 4.4 L20.2 8.6 V16.2 L12 20.4 L3.8 16.2 V8.6 Z"/>
  <path d="M3.8 8.6 L12 12.8 L20.2 8.6"/>
  <path d="M12 12.8 V20.4"/>
</svg>
```

##### `search-off` — `SearchOff` · Figma `305:1054`

```html
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
  <path d="M10.8 4.2 C12.55 4.2 14.229 4.896 15.467 6.133 C16.705 7.371 17.4 9.05 17.4 10.8 C17.4 12.551 16.705 14.229 15.467 15.467 C14.229 16.705 12.55 17.4 10.8 17.4 C9.05 17.4 7.371 16.705 6.133 15.467 C4.895 14.229 4.2 12.551 4.2 10.8 C4.2 9.05 4.895 7.371 6.133 6.133 C7.371 4.896 9.05 4.2 10.8 4.2 Z"/>
  <path d="M15.9 15.9 L20 20"/>
  <path d="M8.4 8.4 L13.2 13.2"/>
  <path d="M13.2 8.4 L8.4 13.2"/>
</svg>
```

##### `wifi-off` — `WifiOff` · Figma `305:1063`

```html
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
  <path d="M3.4 8.9 C4.991 7.509 6.8687 6.485 8.9 5.9"/>
  <path d="M13.8 5.6 C16.32 6.074 18.668 7.214 20.6 8.9"/>
  <path d="M6.9 12.9 C7.8165 12.143 8.868 11.566 10 11.2"/>
  <path d="M14.6 11.6 C15.494 11.905 16.337 12.343 17.1 12.9"/>
  <path d="M9.6 16.6 C10.292 16.081 11.134 15.8 12 15.8 C12.865 15.8 13.708 16.081 14.4 16.6"/>
  <path d="M12 20.2 H12.01"/>
  <path d="M3.6 3.6 L20.4 20.4"/>
</svg>
```

---

## 2. 변환 완료 — 로고 · 브랜드 자산 6종

아이콘 규격 밖이다. `viewBox` 가 제각각이고 전부 채움형이며 획이 없다.
**`--mm-icon-stroke` 를 적용하면 안 된다.**

| 파일 | Figma | viewBox | path | 색 | currentColor 가능 |
|---|---|---|---|---|---|
| `ic_logo_symbol.xml` | LogoSymbol / Style=Flat | `0 0 48 48` | 3 | `#3B4FC0` `#FFFFFF` | **불가 (다색)** |
| `ic_logo_mark.xml` | LogoSymbol / Style=Mark | `0 0 48 48` | 2 | `#2E3E9E` | 가능 (단색) |
| `ic_logo_mark_upper.xml` | Logo Mark (upper) | `0 0 48 48` | 1 | `#2E3E9E` | 가능 (단색) |
| `ic_logo_mark_lower.xml` | Logo Mark (lower) | `0 0 48 48` | 1 | `#2E3E9E` | 가능 (단색) |
| `ic_logo_lockup.xml` | Logo Lockup | `0 0 139 36` | 4 | `#131722` `#3B4FC0` `#FFFFFF` | **불가 (다색)** |
| `ic_kakao_symbol.xml` | Social Login / Kakao 말풍선 | `0 0 20 18.6667` | 1 | `#000000` | 가능 (단색) |

다색인 `ic_logo_symbol` · `ic_logo_lockup` 은 원본 HEX 를 그대로 유지했다.
`currentColor` 로 바꾸면 심볼의 흰 획이 배경과 같은 색이 되어 마크가 사라진다.

### `ic_logo_symbol.xml` — LogoSymbol / Style=Flat

UI 안 기본형 · `0 0 48 48`

```html
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
  <path fill="#3B4FC0" d="M16,0 H32 A16,16 0 0 1 48,16 V32 A16,16 0 0 1 32,48 H16 A16,16 0 0 1 0,32 V16 A16,16 0 0 1 16,0 Z"/>
  <path fill="#FFFFFF" d="M20.4019 10.5263C21.5502 9.33972 22.8134 9.30144 24.0383 10.488L26.6411 13.1675C27.8278 14.3923 28.0574 15.6938 26.8325 16.8804C26.3349 17.3397 25.6077 17.7225 24.8421 18.1818L21.1292 20.4785C20.0957 21.1292 19.6746 21.8947 20.0191 22.7751C20.2105 23.311 20.6699 23.6555 21.2823 24.1148L22.9665 25.4163C24.1914 26.3349 24.2297 27.4067 22.9665 28.3254L17.4545 31.6172C16.3445 32.3828 15.3493 32.0766 14.4306 31.1579L12.0574 28.7847C9.41627 26.1818 9.33971 23.1962 10.9474 20.5167C11.5215 19.5215 12.2488 18.6794 13.0909 17.8756L20.4019 10.5263Z"/>
  <path fill="#FFFFFF" d="M30.0096 17.2632C31.1196 16.4593 32.1148 16.5742 33.1483 17.4545L36.0957 20.4019C38.9665 23.2727 38.622 26.3732 36.4402 28.8612C35.8277 29.5885 35.0622 30.3541 34.2966 31.1196L26.756 38.5072C25.6459 39.5789 24.4976 39.6172 23.3876 38.5837L21.0526 36.2488C19.9426 35.1388 19.9043 33.9904 20.8995 32.9952C21.3206 32.5359 21.933 32.1531 22.5837 31.7321L26.4115 29.1292C27.4832 28.4019 27.9426 27.4833 27.4832 26.5646C27.2536 25.9904 26.756 25.5311 26.1818 25.0718L24.3828 23.6938C23.4258 22.89 23.4258 22.0096 24.1531 21.2057C24.5359 20.7847 25.0335 20.4785 25.6077 20.0957L30.0096 17.2632Z"/>
</svg>
```

### `ic_logo_mark.xml` — LogoSymbol / Style=Mark

배경 없는 마크. tint 로 Mono Light 를 대신한다 · `0 0 48 48`

```html
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="currentColor">
  <path d="M20.4019 10.5263C21.5502 9.33972 22.8134 9.30144 24.0383 10.488L26.6411 13.1675C27.8278 14.3923 28.0574 15.6938 26.8325 16.8804C26.3349 17.3397 25.6077 17.7225 24.8421 18.1818L21.1292 20.4785C20.0957 21.1292 19.6746 21.8947 20.0191 22.7751C20.2105 23.311 20.6699 23.6555 21.2823 24.1148L22.9665 25.4163C24.1914 26.3349 24.2297 27.4067 22.9665 28.3254L17.4545 31.6172C16.3445 32.3828 15.3493 32.0766 14.4306 31.1579L12.0574 28.7847C9.41627 26.1818 9.33971 23.1962 10.9474 20.5167C11.5215 19.5215 12.2488 18.6794 13.0909 17.8756L20.4019 10.5263Z"/>
  <path d="M30.0096 17.2632C31.1196 16.4593 32.1148 16.5742 33.1483 17.4545L36.0957 20.4019C38.9665 23.2727 38.622 26.3732 36.4402 28.8612C35.8277 29.5885 35.0622 30.3541 34.2966 31.1196L26.756 38.5072C25.6459 39.5789 24.4976 39.6172 23.3876 38.5837L21.0526 36.2488C19.9426 35.1388 19.9043 33.9904 20.8995 32.9952C21.3206 32.5359 21.933 32.1531 22.5837 31.7321L26.4115 29.1292C27.4832 28.4019 27.9426 27.4833 27.4832 26.5646C27.2536 25.9904 26.756 25.5311 26.1818 25.0718L24.3828 23.6938C23.4258 22.89 23.4258 22.0096 24.1531 21.2057C24.5359 20.7847 25.0335 20.4785 25.6077 20.0957L30.0096 17.2632Z"/>
</svg>
```

### `ic_logo_mark_upper.xml` — Logo Mark (upper)

마크 상단 획만 · `0 0 48 48`

```html
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="currentColor">
  <path d="M20.4019 10.5263C21.5502 9.33972 22.8134 9.30144 24.0383 10.488L26.6411 13.1675C27.8278 14.3923 28.0574 15.6938 26.8325 16.8804C26.3349 17.3397 25.6077 17.7225 24.8421 18.1818L21.1292 20.4785C20.0957 21.1292 19.6746 21.8947 20.0191 22.7751C20.2105 23.311 20.6699 23.6555 21.2823 24.1148L22.9665 25.4163C24.1914 26.3349 24.2297 27.4067 22.9665 28.3254L17.4545 31.6172C16.3445 32.3828 15.3493 32.0766 14.4306 31.1579L12.0574 28.7847C9.41627 26.1818 9.33971 23.1962 10.9474 20.5167C11.5215 19.5215 12.2488 18.6794 13.0909 17.8756L20.4019 10.5263Z"/>
</svg>
```

### `ic_logo_mark_lower.xml` — Logo Mark (lower)

마크 하단 획만 · `0 0 48 48`

```html
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="currentColor">
  <path d="M30.0096 17.2632C31.1196 16.4593 32.1148 16.5742 33.1483 17.4545L36.0957 20.4019C38.9665 23.2727 38.622 26.3732 36.4402 28.8612C35.8277 29.5885 35.0622 30.3541 34.2966 31.1196L26.756 38.5072C25.6459 39.5789 24.4976 39.6172 23.3876 38.5837L21.0526 36.2488C19.9426 35.1388 19.9043 33.9904 20.8995 32.9952C21.3206 32.5359 21.933 32.1531 22.5837 31.7321L26.4115 29.1292C27.4832 28.4019 27.9426 27.4833 27.4832 26.5646C27.2536 25.9904 26.756 25.5311 26.1818 25.0718L24.3828 23.6938C23.4258 22.89 23.4258 22.0096 24.1531 21.2057C24.5359 20.7847 25.0335 20.4785 25.6077 20.0957L30.0096 17.2632Z"/>
</svg>
```

### `ic_logo_lockup.xml` — Logo Lockup

심볼 + 워드마크 · `0 0 139 36`

```html
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 139 36">
  <path fill="#3B4FC0" d="M12,0 H24 A12,12 0 0 1 36,12 V24 A12,12 0 0 1 24,36 H12 A12,12 0 0 1 0,24 V12 A12,12 0 0 1 12,0 Z"/>
  <path fill="#FFFFFF" d="M15.3014 7.89474C16.1627 7.00479 17.1101 6.97608 18.0287 7.86603L19.9809 9.8756C20.8708 10.7943 21.0431 11.7703 20.1244 12.6603C19.7512 13.0048 19.2057 13.2919 18.6316 13.6364L15.8469 15.3589C15.0718 15.8469 14.756 16.4211 15.0144 17.0813C15.1579 17.4833 15.5024 17.7416 15.9617 18.0861L17.2249 19.0622C18.1435 19.7512 18.1723 20.555 17.2249 21.244L13.0909 23.7129C12.2584 24.2871 11.512 24.0574 10.823 23.3684L9.04307 21.5885C7.06221 19.6364 7.00479 17.3971 8.21053 15.3876C8.64116 14.6411 9.18661 14.0096 9.81819 13.4067L15.3014 7.89474Z"/>
  <path fill="#FFFFFF" d="M22.5072 12.9474C23.3397 12.3445 24.0861 12.4306 24.8612 13.0909L27.0718 15.3014C29.2249 17.4545 28.9665 19.7799 27.3301 21.6459C26.8708 22.1914 26.2967 22.7655 25.7225 23.3397L20.067 28.8804C19.2345 29.6842 18.3732 29.7129 17.5407 28.9378L15.7895 27.1866C14.9569 26.3541 14.9282 25.4928 15.6746 24.7464C15.9904 24.4019 16.4498 24.1148 16.9378 23.799L19.8086 21.8469C20.6124 21.3014 20.9569 20.6124 20.6124 19.9234C20.4402 19.4928 20.067 19.1483 19.6364 18.8038L18.2871 17.7703C17.5694 17.1675 17.5694 16.5072 18.1148 15.9043C18.4019 15.5885 18.7751 15.3589 19.2057 15.0718L22.5072 12.9474Z"/>
  <path fill="#131722" d="M54.207 12.293C54.207 14.6348 55.6465 17.0195 58.8691 17.9863L57.4727 20.1348C55.2812 19.4473 53.7344 18.04 52.8535 16.2676C51.9619 18.1904 50.3721 19.7373 48.084 20.5L46.666 18.3516C49.9102 17.2988 51.4141 14.7637 51.4141 12.293V12.0137H47.3965V9.82227H58.1387V12.0137H54.207V12.293ZM62.9512 8.44727V22.584H60.2012V8.44727H62.9512ZM63.4668 25.4414V27.6328H49.8457V21.2949H52.6172V25.4414H63.4668ZM82.8302 23.5508V25.8066H64.9338V23.5508H69.5099V20.5645H66.9963V13.9902H78.0607V11.8848H66.9748V9.69336H80.7677V16.1816H69.7463V18.3516H81.2189V20.5645H78.4474V23.5508H82.8302ZM72.174 23.5508H75.7619V20.5645H72.174V23.5508ZM91.6234 10.4453V15.5371H93.5784V8.70508H96.1566V27.0742H93.5784V17.7285H91.6234V23.0566H83.846V10.4453H91.6234ZM86.4027 12.6152V20.9082H89.0667V12.6152H86.4027ZM100.239 8.42578V27.9766H97.6175V8.42578H100.239ZM118.012 8.42578V28.0195H115.241V8.42578H118.012ZM107.399 9.80078C110.342 9.80078 112.534 12.5078 112.534 16.7617C112.534 21.0586 110.342 23.7441 107.399 23.7441C104.391 23.7441 102.2 21.0586 102.221 16.7617C102.2 12.5078 104.391 9.80078 107.399 9.80078ZM107.399 12.2715C105.874 12.2715 104.864 13.8613 104.864 16.7617C104.864 19.6836 105.874 21.252 107.399 21.252C108.881 21.252 109.891 19.6836 109.891 16.7617C109.891 13.8613 108.881 12.2715 107.399 12.2715ZM135.936 18.5234V20.6934H122.1V9.86523H135.786V12.0781H124.893V14.1406H135.335V16.2891H124.893V18.5234H135.936ZM137.891 23.4648V25.6992H119.995V23.4648H137.891Z"/>
</svg>
```

### `ic_kakao_symbol.xml` — Social Login / Kakao 말풍선

카카오 가이드 고정 심볼 · `0 0 20 18.6667`

> 원본 주석: *"카카오 디자인 가이드가 정한 심볼이라 **모양을 바꾸지 말 것**."*
> 24 격자에 억지로 맞추거나 `currentColor` 로 바꾸면 가이드 위반이다.
> `viewBox` 가 정사각이 아니다(20 × 18.6667). 비율을 고정해서 쓴다.
> 색은 `--mm-kakao-symbol` 고정.

```html
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 18.6667">
  <path fill="#000000" d="M10.0001 0C4.47688 0 0 3.45884 0 7.72476C0 10.3778 1.73157 12.7166 4.36838 14.1077L3.25893 18.1606C3.16091 18.5187 3.57047 18.8041 3.88498 18.5966L8.74819 15.3869C9.1586 15.4265 9.57568 15.4496 10.0001 15.4496C15.5228 15.4496 20 11.9909 20 7.72476C20 3.45884 15.5228 0 10.0001 0"/>
</svg>
```

---

## 3. 변환 보류 8종 — 이유와 대안

전부 **그라디언트 또는 벡터가 아닌 자산**이다. 아이콘 46종 중에 보류는 **0건**이다.

| 파일 | viewBox | 막는 것 | 왜 자동 변환을 안 했나 | 대안 |
|---|---|---|---|---|
| `ic_logo_symbol_gradient.xml` | `0 0 48 48` | `<aapt:attr>` + `<gradient>` 1 | Android 의 `<gradient>` 는 SVG `<linearGradient>` 로 **수동 매핑**해야 한다. 좌표계(`startX/Y`·`endX/Y`)가 `gradientUnits="userSpaceOnUse"` 에 대응하고 `<item offset>` 이 `<stop offset>` 에 대응한다 | §3.1 에 손으로 옮긴 SVG 를 실었다 |
| `ic_launcher_background.xml` | `0 0 108 108` | 〃 1 | 같은 그라디언트를 108 캔버스로 2.25배 확대한 것 | 웹에는 런처 아이콘이 없다. PWA `icon-512.png` 로 **래스터 내보내기** |
| `ic_launcher_foreground.xml` | `0 0 108 108` | `<group>` 1 (translate 18,18 · scale 1.5) | `<g transform="translate(18,18) scale(1.5)">` 로 옮길 수 있지만, 런처 전용이라 웹에서 쓸 데가 없다 | 〃 |
| `splash_icon_none.xml` | — | 루트가 `<shape>` 다 (vector 가 아니다) | 투명 사각형 한 장. 시스템 스플래시의 아이콘 자리를 **비우려고** 둔 자산이다 | 웹에서는 **아무것도 만들지 않는다.** PWA 스플래시 아이콘을 비우거나 첫 화면과 같은 위치·크기의 락업으로 맞춘다 |
| `img_onboarding_card.xml` | `0 0 352 290.4` | `<aapt:attr>` 그라디언트 1 · path 22 | 일러스트다. **획 굵기가 1.87~2.86 으로 흩어져 있어** 아이콘 규격(1.75)을 적용하면 안 된다 | Figma 에서 **SVG 로 직접 내보낸다.** 자동 변환 대상이 아니다 |
| `img_onboarding_follow.xml` | `0 0 352 290.4` | 그라디언트 2 · path 21 | 획 1.76~2.86 | 〃 |
| `img_onboarding_point.xml` | `0 0 352 290.4` | 그라디언트 1 · path 19 | 획 1.65~3.3 | 〃 |
| `img_onboarding_prepare.xml` | `0 0 352 290.4` | 그라디언트 3 · path 29 | 획 1.76~3.08 | 〃 |

온보딩 일러스트 4종은 종횡비만 토큰으로 잡아 두면 된다 —
`--mm-illustration-ratio: 352 / 290.4`.

### 3.1 `ic_logo_symbol_gradient` — 손으로 옮긴 SVG

그라디언트 정의는 원본 XML 의 값 그대로다:
`type="linear"` · `startX=0 startY=0` · `endX=34.2857 endY=34.2857` ·
stop `0 → #5566D2`, `0.55 → #3B4FC0`, `1 → #2E3E9E`.

```html
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
  <defs>
    <linearGradient id="mm-logo-gradient" gradientUnits="userSpaceOnUse"
                    x1="0" y1="0" x2="34.2857" y2="34.2857">
      <stop offset="0" stop-color="#5566D2"/>
      <stop offset="0.55" stop-color="#3B4FC0"/>
      <stop offset="1" stop-color="#2E3E9E"/>
    </linearGradient>
  </defs>
  <path fill="url(#mm-logo-gradient)" d="M16,0 H32 A16,16 0 0 1 48,16 V32 A16,16 0 0 1 32,48 H16 A16,16 0 0 1 0,32 V16 A16,16 0 0 1 16,0 Z"/>
  <path fill="#FFFFFF" d="M20.4019 10.5263C21.5502 9.33972 22.8134 9.30144 24.0383 10.488L26.6411 13.1675C27.8278 14.3923 28.0574 15.6938 26.8325 16.8804C26.3349 17.3397 25.6077 17.7225 24.8421 18.1818L21.1292 20.4785C20.0957 21.1292 19.6746 21.8947 20.0191 22.7751C20.2105 23.311 20.6699 23.6555 21.2823 24.1148L22.9665 25.4163C24.1914 26.3349 24.2297 27.4067 22.9665 28.3254L17.4545 31.6172C16.3445 32.3828 15.3493 32.0766 14.4306 31.1579L12.0574 28.7847C9.41627 26.1818 9.33971 23.1962 10.9474 20.5167C11.5215 19.5215 12.2488 18.6794 13.0909 17.8756L20.4019 10.5263Z"/>
  <path fill="#FFFFFF" d="M30.0096 17.2632C31.1196 16.4593 32.1148 16.5742 33.1483 17.4545L36.0957 20.4019C38.9665 23.2727 38.622 26.3732 36.4402 28.8612C35.8277 29.5885 35.0622 30.3541 34.2966 31.1196L26.756 38.5072C25.6459 39.5789 24.4976 39.6172 23.3876 38.5837L21.0526 36.2488C19.9426 35.1388 19.9043 33.9904 20.8995 32.9952C21.3206 32.5359 21.933 32.1531 22.5837 31.7321L26.4115 29.1292C27.4832 28.4019 27.9426 27.4833 27.4832 26.5646C27.2536 25.9904 26.756 25.5311 26.1818 25.0718L24.3828 23.6938C23.4258 22.89 23.4258 22.0096 24.1531 21.2057C24.5359 20.7847 25.0335 20.4785 25.6077 20.0957L30.0096 17.2632Z"/>
</svg>
```

> **`id` 충돌 주의.** 한 페이지에 이 SVG 를 두 번 이상 인라인하면 `mm-logo-gradient`
> 가 중복된다. 컴포넌트에서 `useId()` 로 접미사를 붙이거나 스프라이트에 한 번만 넣는다.

이 그라디언트는 **앱 아이콘·스플래시 전용**이다(DESIGN.md §7.1). UI 안에서는
`ic_logo_symbol`(Flat)을 쓴다.

---

## 4. 부록 — 스프라이트로 묶기

46종을 개별 인라인하면 같은 path 가 화면마다 중복된다. 한 번만 넣고 `<use>` 로
참조한다. 아래 스크립트가 이 문서와 **같은 파서**로 스프라이트를 만든다.

```js
// node build-sprite.mjs > public/icons.svg
import { readdirSync, readFileSync } from 'node:fs';

const SRC = 'C:/Claude/MedicalMate/app/src/main/res/drawable';
const files = readdirSync(SRC).filter(
  (f) => f.startsWith('ic_') && f.endsWith('.xml')
    && !f.startsWith('ic_logo') && !f.startsWith('ic_launcher') && f !== 'ic_kakao_symbol.xml'
);

const symbols = files.map((f) => {
  const xml = readFileSync(`${SRC}/${f}`, 'utf8');
  const id = f.slice(3, -4).replace(/_/g, '-');
  const filled = xml.includes('android:fillColor');
  const sw = (xml.match(/android:strokeWidth="([\d.]+)"/) || [, '1.75'])[1];
  const evenOdd = xml.includes('android:fillType="evenOdd"');
  const ds = [...xml.matchAll(/android:pathData="([^"]+)"/g)].map((m) => m[1]);
  const attrs = filled
    ? 'fill="currentColor"'
    : `fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"`;
  const body = ds
    .map((d) => `<path${evenOdd ? ' fill-rule="evenodd"' : ''} d="${d}"/>`)
    .join('');
  return `<symbol id="mm-${id}" viewBox="0 0 24 24" ${attrs}>${body}</symbol>`;
});

process.stdout.write(
  `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">${symbols.join('')}</svg>`
);
```

```html
<svg class="mm-icon mm-icon--md" aria-hidden="true"><use href="/icons.svg#mm-check"/></svg>
```

> `<use href="외부파일#id">` 는 **같은 오리진**에서만 동작하고, 외부 스프라이트에는
> `currentColor` 가 상속되지 않는 브라우저가 있다. 아이콘이 검게 나오면 스프라이트를
> 문서에 인라인하는 쪽으로 바꾼다.

### 아이콘 크기는 아이콘이 아니라 **상자**가 정한다

| Size | 상자 | 아이콘 | 쓰는 곳 |
|---|---|---|---|
| L | 48 | **24** | 화면 단위 액션 — Nav Bar · 필드 안 지우기 |
| M | 40 | **20** | 중간 컨트롤 |
| S | 32 | **18** | 항목 안 보조 액션 — KV 행 × · 질문 pill × |

이 짝은 `Icon Button` 컴포넌트가 이미 강제한다. **상자를 직접 만들지 않는다.**
텍스트 옆 인라인 아이콘만 예외로, 옆에 붙는 글자 크기를 따른다 —
`Body/L` 17 → 20, `Body/M` 15 → 18, `Body/S` 13 → 16(하한).

