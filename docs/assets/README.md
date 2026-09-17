# 웹앱에서 바로 쓸 수 있는 원본 에셋

안드로이드 앱(`C:/Claude/MedicalMate`)에서 추출·변환한 것들이다.
**전부 원본이다.** 새로 그리거나 비슷한 것으로 대체한 것이 없다.

---

## 1. 폰트 — `fonts/`

| 파일 | weight |
| -- | -- |
| `pretendard_regular.otf` | 400 |
| `pretendard_medium.otf` | 500 |
| `pretendard_semibold.otf` | 600 |
| `pretendard_bold.otf` | 700 |

앱이 쓰는 것과 **같은 파일**이다. 웹폰트 CDN을 쓰면 렌더링이 미세하게 달라지므로
동일성이 중요하면 이 파일을 `public/fonts/`에 넣고 `@font-face`로 직접 붙인다.

```css
@font-face{font-family:Pretendard;src:url(/fonts/pretendard_regular.otf) format('opentype');font-weight:400;font-display:swap}
@font-face{font-family:Pretendard;src:url(/fonts/pretendard_medium.otf)  format('opentype');font-weight:500;font-display:swap}
@font-face{font-family:Pretendard;src:url(/fonts/pretendard_semibold.otf)format('opentype');font-weight:600;font-display:swap}
@font-face{font-family:Pretendard;src:url(/fonts/pretendard_bold.otf)    format('opentype');font-weight:700;font-display:swap}
```

용량이 부담되면(4종 합 6MB) CDN 대안:
`https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard-dynamic-subset.css`
— 한글 서브셋이라 훨씬 가볍고 자형은 같다.

---

## 2. 인체도 — `bodymap/`

3D 렌더 결과를 구운 **webp 이미지**다. 웹에서 3D를 재현할 필요가 없다.

| 파일 | 크기 | 용도 |
| -- | -- | -- |
| `bodymap_front.webp` | 1080×2480 | 1단계 · 전신 앞면 |
| `bodymap_back.webp` | 1080×2480 | 1단계 · 전신 뒷면 |
| `bodymap_head.webp` | 1080×1080 | 2단계 · 머리 |
| `bodymap_neck.webp` | 1080×1080 | 2단계 · 목 |
| `bodymap_chest.webp` | 1080×1080 | 2단계 · 가슴 |
| `bodymap_abdomen.webp` | 1080×1080 | 2단계 · 배 **(시연에 쓰인 것)** |
| `bodymap_arm.webp` | 1080×1080 | 2단계 · 팔 |
| `bodymap_leg.webp` | 1080×1080 | 2단계 · 다리 |
| `bodymap_lower_back_hip.webp` | 1080×1080 | 2단계 · 허리·엉덩이 |

원본은 베이지색이다. 앱 화면의 회색 톤은 런타임 필터다.

```css
.mm-bodymap img { filter: grayscale(1) contrast(0.95) brightness(1.04); }
```

**핫스팟 배치**: `<img>`를 `position:relative` 컨테이너에 넣고 버튼을 `%` 좌표로 얹는다.
좌표 원본은 `BodyMapGeometry.kt` · `BodyMapLayout.kt` (유닛 테스트 17건·10건이 값을 고정).

---

## 3. 아이콘 — `icons/` (55개, SVG)

Android vector drawable을 SVG로 변환했다. `_preview.html`을 브라우저로 열면 전부 확인된다.

**UI 아이콘 46종**
`alert_circle` `alert_triangle` `arrow_right` `arrow_up` `bell` `body_point` `calendar`
`calendar_filled` `camera` `chat` `check` `check_circle` `chevron_down` `chevron_left`
`chevron_right` `chevron_up` `clock` `close` `copy` `edit` `empty_box` `heart_pulse`
`home` `home_filled` `hospital` `info` `lock` `mic` `mic_listening` `mic_off` `minus`
`more_horizontal` `note` `note_filled` `pill` `plus` `search` `search_off` `share`
`spinner` `stethoscope` `trash` `user` `user_filled` `waveform` `wifi_off`

**브랜드**
`logo_symbol` `logo_symbol_gradient` `logo_lockup` `logo_mark` `logo_mark_lower`
`logo_mark_upper` `kakao_symbol`

**앱 아이콘(웹에서 불필요)** `launcher_background` `launcher_foreground`

대부분 `fill="none"` + `stroke` 구조라 `currentColor`로 바꾸면 색을 CSS로 제어할 수 있다:

```bash
# stroke 색을 currentColor로 일괄 치환하고 싶을 때
sed -i 's/stroke="#[0-9A-Fa-f]\{6\}"/stroke="currentColor"/g' icons/ic_*.svg
```

단, `logo_symbol_gradient`·`kakao_symbol`은 **브랜드 고정색**이라 건드리면 안 된다
(카카오 디자인 가이드가 변경을 금지).

변환 실패 1건: `splash_icon_none.xml` — 빈 스플래시 아이콘이라 웹에 불필요.

---

## 4. 온보딩 일러스트 — `illustration/svg/` (4개)

| 파일 | Figma | 온보딩 순서 |
| -- | -- | -- |
| `img_onboarding_prepare.svg` | 1345:4714 (V2-00) | 1장 — "말하기 어려웠던 증상, 함께 준비해요." |
| `img_onboarding_point.svg` | 1345:4737 (V2-01) | 2장 |
| `img_onboarding_card.svg` | 1345:4754 (V2-02) | 3장 |
| `img_onboarding_follow.svg` | 1345:4773 (V2-03) | 4장 |

전부 `viewBox="0 0 352 290.4"`, 그라데이션 포함. 브라우저 렌더 결과가 앱과 동일함을 확인했다.
원본 `.xml`(Android vector)도 같은 폴더에 남겨 뒀다.

---

## 5. 시연 영상 프레임 — `frames/` (117장)

`medicalmate-demo-full.mp4`에서 2초 간격으로 뽑은 360px 폭 JPG.
화면별 대응은 `docs/android-analysis/00-video-observations.md` 참고.

| 구간 | 프레임 | 내용 |
| -- | -- | -- |
| A | f001~f020 | 스플래시 · 로그인 · 온보딩 · 내 정보 3단계 · 등록 완료 |
| B | f021~f064 | 인체도 · 문답 7턴 · 통증 강도 · 추가 질문 · 병원 찾기 · 브리핑 카드 |
| C | f065~f085 | 캘린더 월 · 바텀시트 · 일정 추가 · 일자 상세(진료 전) |
| D | f086~f117 | 병원 확인 · 진료 후 메모 · AI 분류 · 재방문 확정 · 기록 탭 · 기록 상세 |

---

## 6. 변환 도구

Android vector drawable → SVG 변환기를 직접 만들어 썼다.
그라데이션(`aapt:attr`), `#AARRGGBB` 알파, stroke 속성까지 처리한다.

```bash
node vd2svg.js <입력폴더> <출력폴더>
```

스크립트 위치: 세션 스크래치패드
(`.../scratchpad/vd2svg.js`). 재사용하려면 웹앱 저장소로 옮겨 둘 것.
