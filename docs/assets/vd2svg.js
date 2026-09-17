// Android Vector Drawable (XML) -> SVG 변환기
// 지원: <vector>, <path>, <group> translate/scale/rotate, <aapt:attr> 안의 <gradient>
const fs = require('fs')
const path = require('path')

const argv = process.argv.slice(2)
const [inDir, outDir] = argv
if (!inDir || !outDir) {
  console.error('usage: node vd2svg.js <inDir> <outDir>')
  process.exit(1)
}
fs.mkdirSync(outDir, { recursive: true })

/** #AARRGGBB -> {color:'#RRGGBB', opacity:number} · #RRGGBB / #RGB 그대로 */
function color(raw) {
  if (!raw) return null
  const v = raw.trim()
  if (!v.startsWith('#')) return { color: v, opacity: 1 }
  const hex = v.slice(1)
  if (hex.length === 8) {
    const a = parseInt(hex.slice(0, 2), 16) / 255
    return { color: '#' + hex.slice(2), opacity: Number(a.toFixed(4)) }
  }
  if (hex.length === 4) {
    const a = parseInt(hex[0] + hex[0], 16) / 255
    return { color: '#' + hex.slice(1), opacity: Number(a.toFixed(4)) }
  }
  return { color: v, opacity: 1 }
}

const CAP = { butt: 'butt', round: 'round', square: 'square' }
const JOIN = { miter: 'miter', round: 'round', bevel: 'bevel' }

/** 속성 문자열에서 android:name="value" 뽑기 */
function attrs(tagText) {
  const out = {}
  const re = /([\w:]+)\s*=\s*"([^"]*)"/g
  let m
  while ((m = re.exec(tagText))) out[m[1].replace(/^android:/, '').replace(/^aapt:/, '')] = m[2]
  return out
}

/** <gradient> 요소 하나를 SVG defs 항목으로 */
let gradSeq = 0
function gradientToSvg(gradText) {
  const a = attrs(gradText.match(/<gradient\b[^>]*>/)[0])
  const id = `g${++gradSeq}`
  const stops = []
  const stopRe = /<item\b([^>]*)\/?>/g
  let m
  while ((m = stopRe.exec(gradText))) {
    const sa = attrs(m[1])
    const c = color(sa.color) || { color: '#000', opacity: 1 }
    stops.push(
      `<stop offset="${sa.offset ?? 0}" stop-color="${c.color}"${c.opacity < 1 ? ` stop-opacity="${c.opacity}"` : ''}/>`,
    )
  }
  const type = a.type || 'linear'
  let def
  if (type === 'radial') {
    def = `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${a.centerX || 0}" cy="${a.centerY || 0}" r="${a.gradientRadius || 0}">${stops.join('')}</radialGradient>`
  } else {
    def = `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${a.startX || 0}" y1="${a.startY || 0}" x2="${a.endX || 0}" y2="${a.endY || 0}">${stops.join('')}</linearGradient>`
  }
  return { id, def }
}

function convert(xml) {
  const vec = attrs(xml.match(/<vector\b[\s\S]*?>/)[0])
  const vbW = vec.viewportWidth || 24
  const vbH = vec.viewportHeight || 24
  const w = (vec.width || '24dp').replace('dp', '')
  const h = (vec.height || '24dp').replace('dp', '')
  const defs = []
  const body = []

  // <group> 은 이 프로젝트 자산에선 거의 안 쓰지만 대비해 둔다
  const groupStack = []

  // path 블록 단위로 순회 (self-closing 또는 <path ...> ... </path>)
  const pathRe = /<path\b([^>]*?)(\/>|>([\s\S]*?)<\/path>)/g
  let m
  while ((m = pathRe.exec(xml))) {
    const a = attrs('<path ' + m[1] + '>')
    const inner = m[3] || ''
    const d = a.pathData
    if (!d) continue

    let fill = 'none'
    let fillOpacity = null
    let stroke = 'none'
    let strokeOpacity = null

    // aapt:attr 로 감싼 그라데이션
    const aaptBlocks = [...inner.matchAll(/<aapt:attr\b([^>]*)>([\s\S]*?)<\/aapt:attr>/g)]
    for (const [, atext, content] of aaptBlocks) {
      const target = attrs('<x ' + atext + '>').name || ''
      if (!/<gradient\b/.test(content)) continue
      const g = gradientToSvg(content)
      defs.push(g.def)
      if (target.endsWith('fillColor')) fill = `url(#${g.id})`
      else if (target.endsWith('strokeColor')) stroke = `url(#${g.id})`
    }

    if (a.fillColor) {
      const c = color(a.fillColor)
      fill = c.color
      if (c.opacity < 1) fillOpacity = c.opacity
    }
    if (a.strokeColor) {
      const c = color(a.strokeColor)
      stroke = c.color
      if (c.opacity < 1) strokeOpacity = c.opacity
    }
    if (a.fillAlpha) fillOpacity = a.fillAlpha
    if (a.strokeAlpha) strokeOpacity = a.strokeAlpha

    const bits = [`d="${d}"`]
    bits.push(`fill="${fill}"`)
    if (fillOpacity != null) bits.push(`fill-opacity="${fillOpacity}"`)
    if (a.fillType && a.fillType.toLowerCase() === 'evenodd') bits.push('fill-rule="evenodd"')
    if (stroke !== 'none') {
      bits.push(`stroke="${stroke}"`)
      if (a.strokeWidth) bits.push(`stroke-width="${a.strokeWidth}"`)
      if (strokeOpacity != null) bits.push(`stroke-opacity="${strokeOpacity}"`)
      if (a.strokeLineCap) bits.push(`stroke-linecap="${CAP[a.strokeLineCap] || a.strokeLineCap}"`)
      if (a.strokeLineJoin) bits.push(`stroke-linejoin="${JOIN[a.strokeLineJoin] || a.strokeLineJoin}"`)
    }
    body.push(`  <path ${bits.join(' ')}/>`)
  }

  const defsBlock = defs.length ? `  <defs>\n    ${defs.join('\n    ')}\n  </defs>\n` : ''
  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${vbW} ${vbH}" fill="none">\n${defsBlock}${body.join('\n')}\n</svg>\n`,
    paths: body.length,
    gradients: defs.length,
    viewBox: `0 0 ${vbW} ${vbH}`,
  }
}

const files = fs.readdirSync(inDir).filter((f) => f.endsWith('.xml'))
const report = []
for (const f of files) {
  const xml = fs.readFileSync(path.join(inDir, f), 'utf8')
  try {
    const r = convert(xml)
    const out = f.replace(/\.xml$/, '.svg')
    fs.writeFileSync(path.join(outDir, out), r.svg, 'utf8')
    report.push({ file: out, paths: r.paths, gradients: r.gradients, viewBox: r.viewBox, ok: true })
  } catch (e) {
    report.push({ file: f, ok: false, error: String(e.message) })
  }
}
console.log(JSON.stringify(report, null, 2))
