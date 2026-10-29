import type { PresetPalette } from './presetColors'

/** The packaged pastel family uses a 64px viewBox; the artwork stays untouched. */
export function addPresetKindBadge(svg: string, palette: PresetPalette): string {
  if (palette.badgeKind !== 'income' && palette.badgeKind !== 'expense' && palette.badgeKind !== 'transfer') return svg
  const vertical = palette.badgeKind === 'income' ? '<path d="M54 50v8"/>' : ''
  const symbol = palette.badgeKind === 'transfer'
    ? '<path d="M49 51h9l-3-3m3 3-3 3M58 57h-9l3-3m-3 3 3 3" stroke-width="1.6"/>'
    : `<path d="M50 54h8"/>${vertical}`
  const badge = `<g data-preset-kind="${palette.badgeKind}" stroke="${palette.outline}" stroke-width="2" stroke-linecap="round" fill="none"><circle cx="54" cy="54" r="9" fill="${palette.fill}"/>${symbol}</g>`
  return svg.replace(/<\/svg>\s*$/, `${badge}</svg>`)
}
