# 진료메이트 웹앱 (해커톤 데모용)

코틀린 안드로이드 앱 **진료메이트**를 웹으로 옮긴 시연용 복제본이다. 화면 · 문구 · 간격은
원본 ViewModel 과 Figma 와이어프레임에 맞췄다.

**저장은 브라우저 localStorage 에만 남는다.** 카드 · 일정 · 기록 · 프로필이 모두 그렇다.
서버는 백엔드가 브라우저용으로 낸 **인증 없는 데모 경로(`/api/demo/*`)만** 부른다 — 부위 마스터,
병원 검색, AI 증상 문답, 진료 후 메모 정리. 닿지 못하면 대본과 로컬 병원 목록으로 대신해서
시연이 끊기지 않는다.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # dist/ 에 정적 파일 생성
npm run preview  # 빌드 결과를 배포처럼 확인 (http://localhost:4173)
```

`dist/` 는 그대로 어디에나 올릴 수 있는 정적 사이트다. HashRouter 를 쓰므로 서버
리라이트 설정이 필요 없고, 하위 경로(`example.com/medicalmate/`)에 올려도 그대로 뜬다.

**에셋은 전부 번들 안에 있다.** 아이콘 53개와 일러스트 4종은 코드에 인라인 SVG 로 들어
있고, 폰트와 인체도 이미지는 번들러가 경로를 다시 써 준다. 외부 파일을 절대 경로로
참조하는 곳이 없어서, 배포 위치가 바뀌어도 아이콘이나 그림이 사라지지 않는다.

### 시연 데이터 미리 채우기

| 주소 | 하는 일 |
| -- | -- |
| `?demo=1` | 시연용 데이터 한 벌을 넣고 시작한다(카드 1장 · 일정 2건 · 진료 후 기록 1건) |
| `?demo=0` | 저장된 것을 모두 지우고 로그인 화면부터 시작한다 |

날짜는 여는 날 기준으로 계산한다 — 진료는 이틀 뒤, 재방문은 그 일주일 뒤라서 언제
열어도 D-day 표기가 자연스럽다.

```
http://localhost:5173/?demo=1#/home
```

---

## 1. 요구사항 반영

| 요구 | 구현 |
| -- | -- |
| 백엔드는 데모 경로만 | 백엔드가 브라우저용으로 낸 인증 없는 `/api/demo/*` 만 부른다 — 부위 마스터(이름·별칭), 병원 검색, 증상 문답(AI), 추천 질문, 진료 후 메모 정리(AI). 주소는 `.env` 의 `VITE_BACKEND_BASE_URL`. 서버가 없거나 닿지 못하면 로컬 목록과 대본으로 대신한다. 저장은 전부 `src/store/store.tsx` 가 localStorage 로 읽고 쓴다 |
| 모든 기록 로컬 저장 | 키 `medicalmate.v1` 하나에 앱 상태 전체를 JSON 으로 넣는다. 새로고침·재방문에도 남는다 |
| 수정·삭제 버튼은 있되 동작 안 함 | 아래 표 참고. 버튼은 앱과 같은 자리에 같은 문구로 있고 `onClick` 이 비어 있다 |
| 로그인은 화면 전환만 | `카카오로 시작하기` 를 누르면 인증 없이 `signIn()` 만 하고 온보딩으로 넘어간다 |
| AI 는 서버 + 대본 | `src/data/ai.ts` 한 파일. 서버(`/api/demo/previsit/*` · `/api/demo/postvisit/memo`)가 있으면 서버 AI, 닿지 못하면 규칙 기반 대본 |

### 동작하지 않는 버튼 (의도적)

| 화면 | 버튼 | 문구 |
| -- | -- | -- |
| 브리핑 카드 (1e) | 앱바 우측 | `편집` |
| 브리핑 카드 (1e) | 하단 | `브리핑 카드 삭제` |
| 브리핑 카드 목록 (1j-4) | 앱바 우측 | `편집` |
| 기록 탭 (1j) | 앱바 우측 | `편집` |
| 캘린더 일자 상세 (1r-2) | 앱바 우측 | `편집` |
| 진료 후 기록 (1q · 상세) | 앱바 우측 | `편집` |
| 진료 후 기록 상세 | 하단 | `진료 후 기록 삭제` |

**동작하는 것**과 헷갈리지 않게 적어 둔다 — 진료 전 할 일 체크박스, 할 일 추가·삭제(작성 중),
건강 정보 수정(1s-2), 로그아웃, 회원탈퇴는 실제로 동작한다. 기록 자체의 수정·삭제만 막았다.

**데모를 처음부터 다시 돌리려면** 내 정보 → `회원탈퇴` 를 누른다. localStorage 를 비우고
로그인 화면으로 돌아간다.

---

## 2. 화면 (23개)

| 경로 | Figma | 화면 |
| -- | -- | -- |
| `/` | 1a-1 | 스플래시 (1.5초 후 자동 전이) |
| `/login` | 1o | 로그인 |
| `/onboarding` | ONB | 온보딩 4장 |
| `/profile-setup` | 1b-1~3 | 내 정보 등록 3단계 |
| `/profile-complete` | 1b-4 | 등록 완료 |
| `/home` | 1n | 홈 · 탭 |
| `/intake` | 1l | 인체도 부위 선택 (1/4) |
| `/intake/chat` | 1c · 1d · 1i | 증상 문답 · 통증 강도 · 추가 질문 (2~4/4) |
| `/intake/done` | 1c-5 | 증상 정리 완료 |
| `/card/new` | 1e-1 | 브리핑 카드 (저장 전) |
| `/card/:id` | 1e-1 | 브리핑 카드 |
| `/cards` | 1j-4 | 브리핑 카드 목록 |
| `/calendar` | 1r-1 | 캘린더 월 · 탭 |
| `/calendar/:date` | 1r-2 | 일자 상세 (진료 전 / 진료 완료) |
| `/schedule/new` | 1r-4 | 일정 추가 |
| `/hospital` | 1m | 병원 찾기 (`?purpose=before\|after\|schedule`) |
| `/clinic-confirm` | 1m-12 | 병원 확인 |
| `/visit/note` | 1p | 진료 후 메모 |
| `/visit/record` | 1q | AI 자동 분류 결과 |
| `/visit/:id` | — | 진료 후 기록 상세 |
| `/record` | 1j | 기록 탭 |
| `/record/:id` | 1j-3 | 기록 상세 (타임라인) |
| `/me` | 1s-1 | 내 정보 |
| `/me/health` | 1s-2 | 건강 정보 수정 |

하단 탭은 왼쪽부터 **캘린더 · 홈 · 기록** 3개다.

---

## 3. 원본과 같은 것

문구와 값을 새로 지어내지 않았다.

| 항목 | 출처 |
| -- | -- |
| 화면 문구 399개 | `res/values/strings.xml` → `src/data/strings.ts` 로 기계 변환 |
| 색 · 타이포 · 간격 · 반경 · 고도 | `core/designsystem/*.kt` → `src/styles/tokens.css` |
| 폰트 Pretendard 4종 | `res/font/*.otf` 원본 파일 그대로 |
| 아이콘 53개 | `res/drawable/ic_*.xml` → SVG 변환 → `src/data/icons.ts` 에 인라인 |
| 온보딩 일러스트 4종 | `res/drawable/img_onboarding_*.xml` → `src/data/illustrations.ts` 에 인라인 |
| 인체도 (3D) | `assets/body3d/body.glb` 원본 모델을 three.js 로 그린다 |
| 인체도 (대체) | `res/drawable-nodpi/bodymap_*.webp` 원본 이미지 9장 |
| 3D 좌표 · 카메라 | `BodyMap3dGeometry.kt` · `BodyMap3dCamera.kt` → `src/data/bodyMap3d.ts` |
| 인체도 좌표 · 부위 25종 | `BodyMapGeometry.kt` · `BodyMapOntology.kt` → `src/data/bodyMap.ts` |
| 통증 5단계 라벨 · NRS | `MedicalMateSeverity.kt` + `strings.xml` |
| 홈 "오늘의 한 줄" 9갈래 | `HomeUiState.kt` 의 우선순위 규칙 |
| 신상정보 칩 목록 | `strings.xml` 의 `string-array` 3개 |

---

## 3-1. 주소 두 개 — 진입 온보딩과 시연 앱

| 주소 | 문서 | 무엇 |
|---|---|---|
| `/` | `index.html` | 진입 온보딩. 스플래시와 두 장의 안내, `직접 시연해보기` 가 아래로 보낸다 |
| `/app/` | `app/index.html` | 시연 앱. 여기가 원본을 옮긴 화면 전부다 |

온보딩이 가리키는 곳은 그 문서의 `DEMO_URL` 한 줄이다(`./app/`). 주소에 `?demo=https://…`
를 붙이면 그때만 다른 곳으로 보낸다.

## 3-2. 배포 (Vercel)

프레임워크 **Vite**, 빌드 `npm run build`, 출력 `dist` — `vercel.json` 에 적혀 있어서 따로 고를 것이 없다.

**`/api` 는 Vercel 이 대신 부른다.** `vercel.json` 의 rewrites 가 `/api/*` 를 백엔드로 넘긴다.
브라우저가 백엔드를 직접 부르면 다른 출처라 사전 요청이 먼저 가는데 그 서버가 403 을 낸다.
넘겨 주는 것이 없으면 404 가 오고, 앱은 대본과 로컬 병원 목록으로 대신한다 — 화면은 끊기지 않는다.

**심사자가 그냥 열 수 있어야 한다.** Vercel 프로젝트의 Settings → Deployment Protection 에서
Vercel Authentication 과 Password Protection 을 모두 **Disabled** 로 둔다. 켜져 있으면 주소를
열었을 때 Vercel 로그인 벽이 먼저 나온다.

앱의 첫 화면은 스플래시 뒤 로그인이지만 **계정이 필요 없다** — `카카오로 시작하기` 는 화면을
넘기기만 한다.

## 4. AI — 서버와 대본

`src/data/ai.ts` 하나에 모여 있다. 지금은 전부 규칙 기반이다.

| 함수 | 지금 하는 일 | 실제 AI로 바꿀 때 |
| -- | -- | -- |
| `askNext(session)` | 7턴 대본을 순서대로 반환 (부위 이름만 끼워 넣음) | 대화 맥락을 넘기고 다음 질문을 받는다 |
| `suggestQuestions(session, health)` | 기저질환·복용약·마지막 답변으로 질문 3개 조립 | 문답 전체를 넘기고 추천 질문을 받는다 |
| `buildCard(session, health, profile, hospital)` | 답변을 축(부위·시작·양상…)에 대응시키고 말끝을 다듬음 | 문답을 넘기고 카드 항목을 받는다 |
| `classifyMemo(text, visitedOn)` | 문장을 나눠 키워드로 소견·검사·약·재방문 분류, 재방문 날짜 추출 | 메모를 넘기고 4칸을 받는다 |

응답 지연(`THINK_MS` 900ms, `CLASSIFY_MS` 1800ms)도 이 파일 맨 위에 있다. 실제 호출로
바꾸면 지우면 된다. **화면 코드는 한 줄도 고칠 필요가 없다.**

---

## 4-1. 3D 인체도

앱과 **같은 모델 파일**을 쓴다. 안드로이드는 Filament, 웹은 three.js 로 그릴 뿐이다.

| 항목 | 값 | 출처 |
| -- | -- | -- |
| 모델 | `body.glb` 514KB · Draco 압축 | 앱 `assets/body3d/` 그대로 |
| 카메라 | FOV 28° · 홈 거리 2.3 · 확대 0.45~2.6 · 피치 ±1.2 | `BodyMap3dCamera.kt` |
| 구역 점 | 46개 (구역 25종) | `BodyMap3dGeometry.kt` |
| 앵커 점 | 9개 | 〃 |
| 확대 프레임 | 7개 (앵커마다 target · span) | 〃 |
| 판정 | 반직선을 쏴 닿은 자리에서 가장 가까운 점. 신장의 10% 초과면 기각 | 〃 |
| 등진 점 숨김 | 법선 · 시선 < −0.12 | 〃 |

조작도 앱과 같다 — **끌면 돌고, 휠·오므리면 커진다.** 앵커를 짚으면 그 부위로 활강해
들어가고(460ms), `다른 부위 보기`로 전신으로 돌아온다.

Draco 디코더는 `public/draco/` 에 있고 `import.meta.env.BASE_URL` 을 붙여 찾으므로 하위
경로 배포에서도 동작한다.

---

## 5. 폴더 구조

```
src/
├── main.tsx              진입점 (HashRouter)
├── App.tsx               라우팅 · 로그인 가드
├── styles/
│   ├── tokens.css        디자인 토큰 (원본 1:1)
│   ├── global.css        리셋 · 폰 프레임 · 화면 전환
│   └── components.css    디자인 시스템 컴포넌트
├── components/
│   ├── ui.tsx            버튼 · 카드 · 칩 · 바텀시트 · 다이얼로그 등 25종
│   ├── BodyMap3d.tsx     3D 인체도 (three.js · 지연 로딩)
│   └── Screen.tsx        화면 뼈대 (앱바 + 스크롤 + 하단 고정 + 탭바)
├── screens/              화면 23개
├── assets/               폰트 4종 · 인체도 webp 9장 · body.glb (번들에 포함)
├── store/store.tsx       앱 상태 + localStorage
├── data/
│   ├── strings.ts        화면 문구 399개
│   ├── ai.ts             AI — 서버 호출 + 대본 대체
│   ├── icons.ts          아이콘 53개 (인라인 SVG)
│   ├── illustrations.ts  온보딩 일러스트 4종 (인라인 SVG)
│   ├── bodyMap.ts        인체도 좌표 · 부위 온톨로지 (2D 대체용)
│   ├── bodyMap3d.ts      3D 구역 점 46개 · 앵커 9개 · 카메라 프레임 7개
│   ├── api.ts            백엔드 호출 공통(주소 · 토큰 · 실패 뒤 쉬기)
│   ├── hospitals.ts      병원 검색 — `GET /api/demo/hospitals` + 로컬 목록 40곳(대체)
│   └── demoSeed.ts       ?demo=1 로 들어갈 시연 데이터
└── lib/
    ├── types.ts          도메인 모델
    └── date.ts           날짜 · 시간 유틸
docs/                     안드로이드 분석 명세 14종 + 원본 에셋 + 시연 시나리오
```

---

## 6. 데스크톱에서의 모습

브라우저 폭이 **480px 초과**면 가운데에 360×780 폰 목업 프레임으로 보여준다.
480px 이하면 프레임 없이 전체 화면을 쓴다. 심사위원이 노트북으로 열어도 앱처럼 보이고,
휴대폰으로 열면 그냥 앱처럼 동작한다.

---

## 7. 알아 둘 것

- **오늘 날짜는 실제 시스템 날짜를 쓴다.** 데모를 특정 날짜로 고정하려면
  `src/lib/date.ts` 의 `FIXED_TODAY` 에 `'2026-09-15'` 같은 값을 넣는다.
- **음성 입력(STT)은 버튼만 있고 동작하지 않는다.** 시연 큐카드도 전부 텍스트 입력이다.
- **인체도는 3D가 기본이다.** WebGL 을 못 쓰는 환경에서만 이미지 인체도로 되돌아간다.
  3D 모듈(three.js · gzip 약 150KB)은 증상 정리 화면에 들어갈 때만 내려받는다.
- 알림(벨 아이콘)은 토스트만 띄운다. 원본에도 알림 화면이 없다.
- 브라우저 사생활 보호 모드에서는 localStorage 가 막힐 수 있다. 그때는 메모리 상태로
  동작하고 새로고침하면 초기화된다.
