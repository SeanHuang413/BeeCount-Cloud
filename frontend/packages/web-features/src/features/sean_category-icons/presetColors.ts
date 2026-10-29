import type { CategoryIconPreset } from './catalog'
import { addPresetKindBadge } from './presetBadge'

export type PresetPalette = { outline: string; fill: string; badgeKind?: 'income' | 'expense' | 'transfer' }

/** Theme RGB values are parsed strictly before inserting them into a packaged SVG. */
export function presetPalette(rgb: string): PresetPalette | undefined {
  const parts = rgb.trim().split(/[\s,]+/)
  if (parts.length !== 3 || parts.some(p => !/^\d{1,3}$/.test(p))) return undefined
  const channels = parts.map(Number)
  if (channels.some(n => n > 255)) return undefined
  return {
    outline: `rgb(${channels.join(',')})`,
    fill: `rgb(${channels.map(n => Math.round(n * 0.22 + 255 * 0.78)).join(',')})`
  }
}

export function categoryPresetPalette(kind: string): PresetPalette | undefined {
  if (typeof document === 'undefined' || (kind !== 'income' && kind !== 'expense' && kind !== 'transfer')) return undefined
  const palette = presetPalette(getComputedStyle(document.documentElement).getPropertyValue(`--${kind}-rgb`))
    ?? presetPalette('64 86 111')!
  return { ...palette, badgeKind: kind }
}

export function colorPresetSvg(svg: string, palette: PresetPalette): string {
  return svg.split('#496A88').join(palette.outline).split('#C7DAE8').join(palette.fill)
}

const sources = new Map<string, Promise<string>>()

export async function presetPreviewSource(preset: CategoryIconPreset, palette?: PresetPalette): Promise<string> {
  if (!palette || (preset.colorMode === 'multicolor' && !palette.badgeKind)) return preset.src
  const sourceUrl = preset.colorMode === 'multicolor' ? preset.src : preset.colorSrc
  let source = sources.get(sourceUrl)
  if (!source) {
    source = fetch(sourceUrl).then(async response => {
      if (!response.ok) throw new Error('Unable to load category icon preset')
      const svg = await response.text()
      if (!svg.trim()) throw new Error('Category icon preset is empty')
      return svg
    }).catch(error => { sources.delete(sourceUrl); throw error })
    sources.set(sourceUrl, source)
  }
  const svg = preset.colorMode === 'multicolor'
    ? addPresetKindBadge(await source, palette)
    : colorPresetSvg(await source, palette)
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}
