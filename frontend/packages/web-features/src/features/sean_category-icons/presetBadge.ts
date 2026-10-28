import type { PresetPalette } from './presetColors'

/** The packaged pastel family uses a 64px viewBox; the artwork stays untouched. */
export function addPresetKindBadge(svg: string, palette: PresetPalette): string {
  if (palette.badgeKind !== 'income' && palette.badgeKind !== 'expense') return svg
  const vertical = palette.badgeKind === 'income' ? '<path d="M54 50v8"/>' : ''
  const badge = `<g data-preset-kind="${palette.badgeKind}" stroke="${palette.outline}" stroke-width="2" stroke-linecap="round" fill="none"><circle cx="54" cy="54" r="9" fill="${palette.fill}"/><path d="M50 54h8"/>${vertical}</g>`
  return svg.replace(/<\/svg>\s*$/, `${badge}</svg>`)
}
