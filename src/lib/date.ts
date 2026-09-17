/** 날짜 · 시간 유틸
 *
 * 앱은 java.time 을 쓰지만 웹앱은 문자열(YYYY-MM-DD / HH:mm)을 정본으로 둔다.
 * Date 객체를 저장하지 않는 이유는 localStorage 직렬화에서 타임존이 섞이기 때문이다.
 */

/** 데모를 특정 날짜로 고정하고 싶을 때 'YYYY-MM-DD' 를 넣는다. null 이면 실제 오늘. */
export const FIXED_TODAY: string | null = null

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토'] as const

export function todayKey(): string {
  if (FIXED_TODAY) return FIXED_TODAY
  return toKey(new Date())
}

/** Date → 'YYYY-MM-DD' (로컬 기준) */
export function toKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 'YYYY-MM-DD' → Date (로컬 정오 기준으로 만들어 DST 경계에서 날짜가 밀리지 않게 한다) */
export function fromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d, 12, 0, 0, 0)
}

export function addDays(key: string, days: number): string {
  const d = fromKey(key)
  d.setDate(d.getDate() + days)
  return toKey(d)
}

/** from 에서 to 까지 며칠인가. 미래면 양수. */
export function daysBetween(from: string, to: string): number {
  const a = fromKey(from).getTime()
  const b = fromKey(to).getTime()
  return Math.round((b - a) / 86400000)
}

/** 9월 18일 (금) */
export function formatFullDate(key: string): string {
  const d = fromKey(key)
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAY[d.getDay()]})`
}

/** 9월 18일 */
export function formatMonthDay(key: string): string {
  const d = fromKey(key)
  return `${d.getMonth() + 1}월 ${d.getDate()}일`
}

/** 2026.09.15 */
export function formatDot(key: string): string {
  return key.replace(/-/g, '.')
}

/** 09.18 */
export function formatShort(key: string): string {
  const [, m, d] = key.split('-')
  return `${m}.${d}`
}

/** 2026년 9월 */
export function formatYearMonth(year: number, month: number): string {
  return `${year}년 ${month}월`
}

export function weekdayOf(key: string): string {
  return WEEKDAY[fromKey(key).getDay()]
}

/** 'HH:mm' → 오전 10:30 */
export function formatTime(time: string | null): string | null {
  if (!time) return null
  const [hRaw, m] = time.split(':').map(Number)
  const ampm = hRaw < 12 ? '오전' : '오후'
  let h = hRaw % 12
  if (h === 0) h = 12
  return `${ampm} ${h}:${String(m).padStart(2, '0')}`
}

/** 달력 그리드용 — 그 달의 1일이 무슨 요일인지, 며칠까지인지 */
export function monthGrid(year: number, month: number): { key: string; day: number; inMonth: boolean }[] {
  const first = new Date(year, month - 1, 1)
  const lead = first.getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const cells: { key: string; day: number; inMonth: boolean }[] = []

  const prevDays = new Date(year, month - 1, 0).getDate()
  for (let i = lead - 1; i >= 0; i--) {
    const d = prevDays - i
    const pm = month === 1 ? 12 : month - 1
    const py = month === 1 ? year - 1 : year
    cells.push({ key: `${py}-${String(pm).padStart(2, '0')}-${String(d).padStart(2, '0')}`, day: d, inMonth: false })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      key: `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      day: d,
      inMonth: true,
    })
  }
  while (cells.length % 7 !== 0) {
    const d = cells.length - lead - daysInMonth + 1
    const nm = month === 12 ? 1 : month + 1
    const ny = month === 12 ? year + 1 : year
    cells.push({ key: `${ny}-${String(nm).padStart(2, '0')}-${String(d).padStart(2, '0')}`, day: d, inMonth: false })
  }
  return cells
}

/** 시간 선택지 — 30분 간격 (06:00 ~ 21:30) */
export function timeOptions(): string[] {
  const out: string[] = []
  for (let h = 6; h <= 21; h++) {
    out.push(`${String(h).padStart(2, '0')}:00`)
    out.push(`${String(h).padStart(2, '0')}:30`)
  }
  return out
}
