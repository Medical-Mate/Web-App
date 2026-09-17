/** 병원 검색
 *
 * 백엔드 `GET /api/demo/hospitals?q=&size=20` 을 부른다. 앱이 쓰는 인증 경로
 * `GET /api/hospitals`(`HospitalApi.kt`)와 같은 것을 내고, 브라우저 데모용으로 인증 없이
 * 열어 둔 문이다. 원천은 심평원 병원정보서비스라 서버도 목록을 들고 있지 않고, 그래서
 * 여기서도 캐시하지 않는다.
 *
 * 서버 주소가 없거나 닿지 못하면(`api.ts`) 아래 로컬 목록으로 대신한다 — 시연은 서버가
 * 꺼져 있어도 이어져야 한다. 시연에 쓰인 두 곳은 실제 화면에 나온 이름·주소 그대로다.
 */
import type { Hospital } from '../lib/types'
import { apiFetch } from './api'

/** `/v3/api-docs` 의 `HospitalSearchResponse`. `address` 는 심평원에 없는 곳이면 비어 있다. */
interface HospitalSearchResponse {
  hospitals?: { name: string; address?: string | null }[]
  totalCount?: number
}

/**
 * 서버에서 이름으로 찾는다. 원본 `DefaultHospitalRepository.search` — 부분 일치라
 * "서울" 이면 4천 건이 넘고, 그때 필요한 것은 더 받는 것이 아니라 검색어를 좁히는 것이다.
 *
 * 빈 검색어로는 부르지 않는다(서버가 `q` 를 필수로 둔다). 실패하면 던진다 — 못 닿은 것과
 * 못 찾은 것은 화면이 다르게 알려야 해서 여기서 삼키지 않는다.
 */
export async function fetchHospitals(query: string, signal?: AbortSignal): Promise<SearchResult> {
  /* 서버가 `q` 를 60자까지 받는다. */
  const q = query.trim().slice(0, 60)
  if (!q) return { items: [], total: 0, truncated: false }
  const body = await apiFetch<HospitalSearchResponse>(
    `/api/demo/hospitals?q=${encodeURIComponent(q)}&size=${SEARCH_LIMIT}`,
    { signal },
  )
  const items = (body.hospitals ?? []).map((h) => ({ name: h.name, address: h.address ?? '' }))
  const total = body.totalCount ?? items.length
  return { items, total, truncated: total > items.length }
}

/** 검색 결과에 한 번에 보여줄 최대 개수. 앱과 같은 20. */
export const SEARCH_LIMIT = 20

export const HOSPITALS: Hospital[] = [
  { name: '서울삼성내과의원', address: '서울특별시 용산구 이촌로 206, 국민은행 3~4층 (이촌동)' },
  { name: '강동서울삼성내과의원', address: '서울특별시 강동구 풍성로 116, 2층 (성내동, 청구아파트상가)' },
  { name: '삼성서울내과의원', address: '서울특별시 강남구 테헤란로 152, 5층 (역삼동)' },
  { name: '서울삼성이비인후과의원', address: '서울특별시 마포구 양화로 45, 3층 (서교동)' },
  { name: '삼성연세내과의원', address: '서울특별시 송파구 올림픽로 300, 6층 (신천동)' },
  { name: '서울속편한내과의원', address: '서울특별시 용산구 한강대로 100, 2층 (한강로2가)' },
  { name: '이촌연세내과의원', address: '서울특별시 용산구 이촌로 312, 1층 (이촌동)' },
  { name: '한강내과의원', address: '서울특별시 용산구 원효로 89, 4층 (원효로1가)' },
  { name: '용산우리내과의원', address: '서울특별시 용산구 백범로 341, 3층 (효창동)' },
  { name: '강남세브란스속내과', address: '서울특별시 강남구 논현로 508, 7층 (역삼동)' },
  { name: '더편한위장내과의원', address: '서울특별시 서초구 강남대로 341, 8층 (서초동)' },
  { name: '미래내과의원', address: '서울특별시 마포구 월드컵북로 21, 2층 (서교동)' },
  { name: '연세본내과의원', address: '서울특별시 성동구 왕십리로 315, 5층 (행당동)' },
  { name: '참편한내과의원', address: '서울특별시 광진구 아차산로 272, 3층 (자양동)' },
  { name: '고려내과의원', address: '서울특별시 동대문구 왕산로 214, 2층 (제기동)' },
  { name: '서울맑은가정의학과의원', address: '서울특별시 중구 을지로 100, 6층 (을지로2가)' },
  { name: '정담은내과의원', address: '서울특별시 노원구 동일로 1414, 4층 (상계동)' },
  { name: '365열린가정의학과의원', address: '서울특별시 은평구 통일로 855, 2층 (대조동)' },
  { name: '위앤장내과의원', address: '서울특별시 강서구 화곡로 302, 5층 (화곡동)' },
  { name: '속시원한내과의원', address: '서울특별시 관악구 남부순환로 1820, 3층 (봉천동)' },
  { name: '우리家정의학과의원', address: '서울특별시 구로구 디지털로 300, 9층 (구로동)' },
  { name: '한마음내과의원', address: '경기도 성남시 분당구 판교역로 235, 4층 (삼평동)' },
  { name: '분당서울내과의원', address: '경기도 성남시 분당구 황새울로 335, 3층 (서현동)' },
  { name: '일산백내과의원', address: '경기도 고양시 일산동구 중앙로 1275, 6층 (장항동)' },
  { name: '수원삼성속내과의원', address: '경기도 수원시 영통구 광교중앙로 145, 2층 (이의동)' },
  { name: '인천속편한내과의원', address: '인천광역시 남동구 구월로 200, 5층 (구월동)' },
  { name: '부산해운대내과의원', address: '부산광역시 해운대구 센텀중앙로 97, 8층 (우동)' },
  { name: '대전둔산내과의원', address: '대전광역시 서구 둔산로 100, 3층 (둔산동)' },
  { name: '광주첨단내과의원', address: '광주광역시 광산구 임방울대로 1090, 4층 (수완동)' },
  { name: '대구수성내과의원', address: '대구광역시 수성구 달구벌대로 2400, 5층 (범어동)' },
  { name: '제주한라내과의원', address: '제주특별자치도 제주시 연동 312-4, 2층' },
  { name: '울산남구속내과의원', address: '울산광역시 남구 삼산로 200, 3층 (삼산동)' },
  { name: '천안불당내과의원', address: '충청남도 천안시 서북구 불당25로 176, 4층 (불당동)' },
  { name: '청주율량내과의원', address: '충청북도 청주시 청원구 율봉로 200, 2층 (율량동)' },
  { name: '전주완산내과의원', address: '전라북도 전주시 완산구 홍산로 245, 3층 (효자동)' },
  { name: '창원상남내과의원', address: '경상남도 창원시 성산구 상남로 100, 5층 (상남동)' },
  { name: '김해내외내과의원', address: '경상남도 김해시 김해대로 2352, 2층 (외동)' },
  { name: '포항중앙내과의원', address: '경상북도 포항시 북구 중앙로 300, 4층 (죽도동)' },
  { name: '원주무실내과의원', address: '강원특별자치도 원주시 무실로 100, 3층 (무실동)' },
  { name: '세종나성내과의원', address: '세종특별자치시 나성동 470, 5층' },
]

/**
 * 같은 병원인지.
 *
 * **이름만으로 가르지 않는다.** 같은 이름의 다른 지점이 흔하다 — 검색 결과에 주소만 다른
 * 줄이 여럿 온다. 이름만 맞대면 한 줄을 골랐을 때 이름이 같은 줄이 모두 골라진 것으로 보인다.
 * 주소는 서로 다른 지점을 가를 수 있는 유일한 값이다(Backend#80).
 */
export function sameHospital(a: Hospital | null | undefined, b: Hospital | null | undefined): boolean {
  return a != null && b != null && a.name === b.name && a.address === b.address
}

/** 목록에서 한 줄을 가리키는 열쇠. */
export function hospitalKey(h: Hospital): string {
  return `${h.name}|${h.address}`
}

export interface SearchResult {
  items: Hospital[]
  total: number
  truncated: boolean
}

/** 질의를 2글자씩 끊어 만든 조각. 부분 일치 점수에 쓴다. */
function bigrams(s: string): string[] {
  const out: string[] = []
  for (let i = 0; i < s.length - 1; i++) out.push(s.slice(i, i + 2))
  return out
}

/**
 * 이름으로 찾는다. 공백은 무시한다.
 *
 * 서버 검색이 그랬듯 **부분 일치까지 걸린다**. "서울삼성내과"를 치면 그 이름이 통째로
 * 들어간 곳이 맨 위에 서고, "내과"만 겹치는 곳도 아래에 남는다. 그래서 결과가 20곳을
 * 넘고 "N곳 중 20곳이에요" 안내가 뜬다.
 */
export function searchHospitals(query: string): SearchResult {
  const q = query.replace(/\s+/g, '')
  if (!q) return { items: [], total: 0, truncated: false }

  const grams = bigrams(q)
  const scored = HOSPITALS.map((h) => {
    const name = h.name.replace(/\s+/g, '')
    let score = 0
    if (name.includes(q)) score = 100 + (q.length - Math.abs(name.length - q.length)) // 통째로 일치
    else if (q.length > 2 && name.includes(q.slice(0, -1))) score = 60
    else if (q.length > 2 && name.includes(q.slice(1))) score = 55
    else {
      const overlap = grams.filter((g) => name.includes(g)).length
      if (overlap > 0) score = 10 + overlap
    }
    return { hospital: h, score }
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.hospital.name.length - b.hospital.name.length)

  return {
    items: scored.slice(0, SEARCH_LIMIT).map((x) => x.hospital),
    total: scored.length,
    truncated: scored.length > SEARCH_LIMIT,
  }
}
