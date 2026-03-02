import { describe, it, expect } from 'vitest'
import {
  hexToRgb,
  rgbToHex,
  rgbToHsl,
  hslToRgb,
  lighten,
  darken,
  mix,
  relativeLuminance,
  contrastForeground,
  shiftHue,
} from '@/features/theme-builder/lib/colorUtils'

describe('hexToRgb', () => {
  it('converts 6-digit hex', () => {
    expect(hexToRgb('#ff0000')).toEqual([255, 0, 0])
    expect(hexToRgb('#00ff00')).toEqual([0, 255, 0])
    expect(hexToRgb('#0000ff')).toEqual([0, 0, 255])
    expect(hexToRgb('#000000')).toEqual([0, 0, 0])
    expect(hexToRgb('#ffffff')).toEqual([255, 255, 255])
  })

  it('converts 3-digit shorthand hex', () => {
    expect(hexToRgb('#f00')).toEqual([255, 0, 0])
    expect(hexToRgb('#fff')).toEqual([255, 255, 255])
    expect(hexToRgb('#000')).toEqual([0, 0, 0])
  })

  it('handles hex without #', () => {
    expect(hexToRgb('ff0000')).toEqual([255, 0, 0])
  })
})

describe('rgbToHex', () => {
  it('converts RGB to hex', () => {
    expect(rgbToHex([255, 0, 0])).toBe('#ff0000')
    expect(rgbToHex([0, 255, 0])).toBe('#00ff00')
    expect(rgbToHex([0, 0, 255])).toBe('#0000ff')
    expect(rgbToHex([0, 0, 0])).toBe('#000000')
    expect(rgbToHex([255, 255, 255])).toBe('#ffffff')
  })

  it('pads single-digit hex values', () => {
    expect(rgbToHex([1, 2, 3])).toBe('#010203')
  })
})

describe('hexToRgb / rgbToHex roundtrip', () => {
  it('roundtrips correctly', () => {
    const colors = ['#ff0000', '#336699', '#abcdef', '#000000', '#ffffff']
    for (const hex of colors) {
      expect(rgbToHex(hexToRgb(hex))).toBe(hex)
    }
  })
})

describe('rgbToHsl', () => {
  it('converts pure red', () => {
    const [h, s, l] = rgbToHsl([255, 0, 0])
    expect(h).toBeCloseTo(0, 0)
    expect(s).toBeCloseTo(100, 0)
    expect(l).toBeCloseTo(50, 0)
  })

  it('converts pure green', () => {
    const [h, s, l] = rgbToHsl([0, 255, 0])
    expect(h).toBeCloseTo(120, 0)
    expect(s).toBeCloseTo(100, 0)
    expect(l).toBeCloseTo(50, 0)
  })

  it('converts pure blue', () => {
    const [h, s, l] = rgbToHsl([0, 0, 255])
    expect(h).toBeCloseTo(240, 0)
    expect(s).toBeCloseTo(100, 0)
    expect(l).toBeCloseTo(50, 0)
  })

  it('converts achromatic (gray)', () => {
    const [h, s, l] = rgbToHsl([128, 128, 128])
    expect(h).toBe(0)
    expect(s).toBe(0)
    expect(l).toBeCloseTo(50.2, 0)
  })

  it('converts black', () => {
    expect(rgbToHsl([0, 0, 0])).toEqual([0, 0, 0])
  })

  it('converts white', () => {
    const [h, s, l] = rgbToHsl([255, 255, 255])
    expect(h).toBe(0)
    expect(s).toBe(0)
    expect(l).toBeCloseTo(100, 0)
  })
})

describe('hslToRgb', () => {
  it('converts pure red', () => {
    expect(hslToRgb([0, 100, 50])).toEqual([255, 0, 0])
  })

  it('converts pure green', () => {
    expect(hslToRgb([120, 100, 50])).toEqual([0, 255, 0])
  })

  it('converts pure blue', () => {
    expect(hslToRgb([240, 100, 50])).toEqual([0, 0, 255])
  })

  it('converts achromatic (gray)', () => {
    const [r, g, b] = hslToRgb([0, 0, 50])
    expect(r).toBe(g)
    expect(g).toBe(b)
    expect(r).toBe(128)
  })

  it('converts black', () => {
    expect(hslToRgb([0, 0, 0])).toEqual([0, 0, 0])
  })

  it('converts white', () => {
    expect(hslToRgb([0, 0, 100])).toEqual([255, 255, 255])
  })
})

describe('rgbToHsl / hslToRgb roundtrip', () => {
  it('roundtrips primary colors', () => {
    const colors: [number, number, number][] = [
      [255, 0, 0],
      [0, 255, 0],
      [0, 0, 255],
      [255, 255, 0],
      [0, 255, 255],
      [255, 0, 255],
    ]
    for (const rgb of colors) {
      const hsl = rgbToHsl(rgb)
      const result = hslToRgb(hsl)
      expect(result[0]).toBeCloseTo(rgb[0], 0)
      expect(result[1]).toBeCloseTo(rgb[1], 0)
      expect(result[2]).toBeCloseTo(rgb[2], 0)
    }
  })
})

describe('lighten', () => {
  it('increases lightness', () => {
    const result = lighten('#000000', 50)
    const [, , l] = rgbToHsl(hexToRgb(result))
    expect(l).toBeCloseTo(50, 0)
  })

  it('clamps at 100', () => {
    const result = lighten('#ffffff', 50)
    const [, , l] = rgbToHsl(hexToRgb(result))
    expect(l).toBeCloseTo(100, 0)
  })

  it('returns a lighter shade', () => {
    const original = relativeLuminance(hexToRgb('#336699'))
    const lightened = relativeLuminance(hexToRgb(lighten('#336699', 20)))
    expect(lightened).toBeGreaterThan(original)
  })
})

describe('darken', () => {
  it('decreases lightness', () => {
    const result = darken('#ffffff', 50)
    const [, , l] = rgbToHsl(hexToRgb(result))
    expect(l).toBeCloseTo(50, 0)
  })

  it('clamps at 0', () => {
    const result = darken('#000000', 50)
    const [, , l] = rgbToHsl(hexToRgb(result))
    expect(l).toBeCloseTo(0, 0)
  })

  it('returns a darker shade', () => {
    const original = relativeLuminance(hexToRgb('#336699'))
    const darkened = relativeLuminance(hexToRgb(darken('#336699', 20)))
    expect(darkened).toBeLessThan(original)
  })
})

describe('mix', () => {
  it('returns first color at weight 0', () => {
    expect(mix('#ff0000', '#0000ff', 0)).toBe('#ff0000')
  })

  it('returns second color at weight 1', () => {
    expect(mix('#ff0000', '#0000ff', 1)).toBe('#0000ff')
  })

  it('blends 50/50', () => {
    const result = hexToRgb(mix('#ff0000', '#0000ff', 0.5))
    expect(result[0]).toBe(128)
    expect(result[1]).toBe(0)
    expect(result[2]).toBe(128)
  })

  it('clamps weight below 0', () => {
    expect(mix('#ff0000', '#0000ff', -1)).toBe('#ff0000')
  })

  it('clamps weight above 1', () => {
    expect(mix('#ff0000', '#0000ff', 2)).toBe('#0000ff')
  })
})

describe('relativeLuminance', () => {
  it('returns 0 for black', () => {
    expect(relativeLuminance([0, 0, 0])).toBe(0)
  })

  it('returns 1 for white', () => {
    expect(relativeLuminance([255, 255, 255])).toBeCloseTo(1, 3)
  })

  it('computes WCAG luminance for mid-gray', () => {
    const lum = relativeLuminance([128, 128, 128])
    expect(lum).toBeGreaterThan(0.2)
    expect(lum).toBeLessThan(0.3)
  })
})

describe('contrastForeground', () => {
  it('returns white for dark backgrounds', () => {
    expect(contrastForeground('#000000')).toBe('#ffffff')
    expect(contrastForeground('#333333')).toBe('#ffffff')
    expect(contrastForeground('#1a1a2e')).toBe('#ffffff')
  })

  it('returns black for light backgrounds', () => {
    expect(contrastForeground('#ffffff')).toBe('#000000')
    expect(contrastForeground('#f0f0f0')).toBe('#000000')
    expect(contrastForeground('#ffff00')).toBe('#000000')
  })
})

describe('shiftHue', () => {
  it('shifts hue by positive degrees', () => {
    // Red (0°) shifted by 120° → green (120°)
    const result = shiftHue('#ff0000', 120)
    const [h] = rgbToHsl(hexToRgb(result))
    expect(h).toBeCloseTo(120, 0)
  })

  it('shifts hue by negative degrees', () => {
    // Green (120°) shifted by -120° → red (0°)
    const result = shiftHue('#00ff00', -120)
    const [h] = rgbToHsl(hexToRgb(result))
    expect(h).toBeCloseTo(0, 0)
  })

  it('wraps around 360', () => {
    // Red (0°) shifted by 480° → green (120°)
    const result = shiftHue('#ff0000', 480)
    const [h] = rgbToHsl(hexToRgb(result))
    expect(h).toBeCloseTo(120, 0)
  })

  it('preserves saturation and lightness', () => {
    const original = rgbToHsl(hexToRgb('#ff0000'))
    const shifted = rgbToHsl(hexToRgb(shiftHue('#ff0000', 60)))
    expect(shifted[1]).toBeCloseTo(original[1], 0)
    expect(shifted[2]).toBeCloseTo(original[2], 0)
  })
})
