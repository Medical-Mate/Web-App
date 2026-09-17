/** 한글 조사 붙이기
 *
 * 원본: intake/ui/IntakeUiState.kt 의 `withSubjectParticle`.
 * 마지막 한글 음절에 받침이 있으면 "이", 없으면 "가"를 붙인다.
 * "복부가 얼마나 아프세요?" · "명치가 얼마나 아프세요?" 처럼 쓴다.
 */

const HANGUL_FIRST = 0xac00
const HANGUL_LAST = 0xd7a3
const HANGUL_FINAL_COUNT = 28

/** 주격 조사(이/가)를 붙인다. */
export function withSubjectParticle(word: string): string {
  const syllable = [...word].reverse().find((c) => {
    const code = c.codePointAt(0) ?? 0
    return code >= HANGUL_FIRST && code <= HANGUL_LAST
  })
  if (!syllable) return `${word}이`
  const hasFinalConsonant = ((syllable.codePointAt(0) as number) - HANGUL_FIRST) % HANGUL_FINAL_COUNT !== 0
  return hasFinalConsonant ? `${word}이` : `${word}가`
}
