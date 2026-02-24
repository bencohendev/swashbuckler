type RGB = [number, number, number]
type HSL = [number, number, number]

export function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '')
  const full = h.length === 3
    ? h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
    : h
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ]
}

export function rgbToHex([r, g, b]: RGB): string {
  return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('')
}

export function rgbToHsl([r, g, b]: RGB): HSL {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2

  if (max === min) return [0, 0, l * 100]

  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0

  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6
  else if (max === gn) h = ((bn - rn) / d + 2) / 6
  else h = ((rn - gn) / d + 4) / 6

  return [h * 360, s * 100, l * 100]
}

export function hslToRgb([h, s, l]: HSL): RGB {
  const sn = s / 100
  const ln = l / 100

  if (sn === 0) {
    const v = Math.round(ln * 255)
    return [v, v, v]
  }

  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t
    if (tt < 0) tt += 1
    if (tt > 1) tt -= 1
    if (tt < 1 / 6) return p + (q - p) * 6 * tt
    if (tt < 1 / 2) return q
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6
    return p
  }

  const q = ln < 0.5 ? ln * (1 + sn) : ln + sn - ln * sn
  const p = 2 * ln - q
  const hn = h / 360

  return [
    Math.round(hue2rgb(p, q, hn + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, hn) * 255),
    Math.round(hue2rgb(p, q, hn - 1 / 3) * 255),
  ]
}

export function lighten(hex: string, amount: number): string {
  const hsl = rgbToHsl(hexToRgb(hex))
  hsl[2] = Math.min(100, hsl[2] + amount)
  return rgbToHex(hslToRgb(hsl))
}

export function darken(hex: string, amount: number): string {
  const hsl = rgbToHsl(hexToRgb(hex))
  hsl[2] = Math.max(0, hsl[2] - amount)
  return rgbToHex(hslToRgb(hsl))
}

export function mix(hex1: string, hex2: string, weight: number): string {
  const [r1, g1, b1] = hexToRgb(hex1)
  const [r2, g2, b2] = hexToRgb(hex2)
  const w = Math.max(0, Math.min(1, weight))
  return rgbToHex([
    Math.round(r1 * (1 - w) + r2 * w),
    Math.round(g1 * (1 - w) + g2 * w),
    Math.round(b1 * (1 - w) + b2 * w),
  ])
}

function relativeLuminance([r, g, b]: RGB): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

export function contrastForeground(backgroundHex: string): string {
  return relativeLuminance(hexToRgb(backgroundHex)) < 0.5 ? '#ffffff' : '#000000'
}

export function shiftHue(hex: string, degrees: number): string {
  const hsl = rgbToHsl(hexToRgb(hex))
  hsl[0] = ((hsl[0] + degrees) % 360 + 360) % 360
  return rgbToHex(hslToRgb(hsl))
}
