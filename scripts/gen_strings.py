"""strings.xml → src/data/strings.ts

셸 이스케이프에 걸리지 않게 파일로 둔다. 안드로이드 문구가 바뀌면 이 스크립트를 다시 돌린다.
"""
import html
import json
import pathlib
import re

SRC = pathlib.Path('C:/Claude/MedicalMate/app/src/main/res/values/strings.xml')
OUT = pathlib.Path('C:/Claude/MedicalMateWebApp/src/data/strings.ts')

xml = SRC.read_text(encoding='utf-8')

strings: dict[str, str] = {}
for m in re.finditer(r'<string name="([^"]+)"[^>]*>([\s\S]*?)</string>', xml):
    key, raw = m.group(1), m.group(2)
    # <b> 같은 인라인 태그 제거
    v = re.sub(r'</?[^>]+>', '', raw)
    # 안드로이드 이스케이프
    v = v.replace('\\n', '\n').replace("\\'", "'").replace('\\"', '"')
    v = re.sub(r'\\u([0-9a-fA-F]{4})', lambda mm: chr(int(mm.group(1), 16)), v)
    v = html.unescape(v)
    strings[key] = v.strip()

arrays: dict[str, list[str]] = {}
for m in re.finditer(r'<string-array name="([^"]+)"[^>]*>([\s\S]*?)</string-array>', xml):
    items = [html.unescape(i).strip() for i in re.findall(r'<item>([\s\S]*?)</item>', m.group(2))]
    arrays[m.group(1)] = items

body = json.dumps(strings, ensure_ascii=False, indent=2)
array_body = json.dumps(arrays, ensure_ascii=False, indent=2)

ts = f'''/** 화면 문구 {len(strings)}개.
 *
 * 출처: MedicalMate/app/src/main/res/values/strings.xml 를 그대로 옮긴 것이다.
 * 문구를 새로 지어내지 말고 여기서 꺼내 쓴다. 앱과 한 글자라도 달라지면 안 된다.
 *
 * 다시 만들려면: python scripts/gen_strings.py
 */

export const S = {body} as const

export type StringKey = keyof typeof S

/** `<string-array>` {len(arrays)}개. 칩 목록처럼 여러 화면이 나눠 쓰는 것들이다. */
export const A = {array_body} as const

export type StringArrayKey = keyof typeof A

/** %1$s · %1$d · %2$s 형태의 자리표시자를 순서대로 채운다. */
export function fmt(template: string, ...args: (string | number)[]): string {{
  return template.replace(/%(\\d+)\\$[sd]/g, (_, i) => String(args[Number(i) - 1] ?? ''))
}}

/** 문구를 키로 꺼내면서 자리표시자까지 채운다. */
export function t(key: StringKey, ...args: (string | number)[]): string {{
  return fmt(S[key], ...args)
}}
'''

OUT.write_text(ts, encoding='utf-8')
print('strings:', len(strings), '· arrays:', len(arrays))
for k in ('login_title', 'intake_questions_count', 'intake_questions_full'):
    print(k, '=', json.dumps(strings.get(k), ensure_ascii=False))
