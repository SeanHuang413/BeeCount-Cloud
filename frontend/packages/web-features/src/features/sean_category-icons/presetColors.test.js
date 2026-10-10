import { afterEach, describe, expect, it, vi } from 'vitest'
import { categoryPresetPalette, colorPresetSvg, presetPalette, presetPreviewSource } from './presetColors'

afterEach(() => vi.unstubAllGlobals())

describe('preset income and expense palettes', () => {
  it('reads the selected type from theme variables without assuming red or green', () => {
    vi.stubGlobal('document', { documentElement: {} })
    vi.stubGlobal('getComputedStyle', () => ({ getPropertyValue: name => name === '--income-rgb' ? '120 80 240' : '30 160 200' }))
    expect(categoryPresetPalette('income').outline).toBe('rgb(120,80,240)')
    expect(categoryPresetPalette('expense').outline).toBe('rgb(30,160,200)')
    expect(categoryPresetPalette('transfer')).toBeUndefined()
  })
  it('swaps both colors without rewriting the source geometry', () => {
    const svg = '<svg><path stroke="#496A88" fill="#C7DAE8" d="M1 2L3 4"/></svg>'
    const colored = colorPresetSvg(svg, presetPalette('30 100 200'))
    expect(colored).toContain('stroke="rgb(30,100,200)"')
    expect(colored).toContain('fill="rgb(206,221,243)"')
    expect(colored).toContain('d="M1 2L3 4"')
    expect(svg).toContain('#496A88')
  })
  it('rejects missing or unsafe theme values', () => {
    for (const rgb of ['', '256 0 0', '-1 0 0', 'red', '1 2', '1 2 3;"/>']) expect(presetPalette(rgb)).toBeUndefined()
  })
  it('shares vector sources for different palette previews, including original PNG icons', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => '<svg fill="#C7DAE8" stroke="#496A88"/>' })
    vi.stubGlobal('fetch', fetchMock)
    const preset = { id: 'preview-test', src: '/original.png', colorSrc: '/preview-test.svg', sourceKind: 'png' }
    expect(await presetPreviewSource(preset)).toBe('/original.png')
    const income = await presetPreviewSource(preset, presetPalette('10 20 30'))
    const expense = await presetPreviewSource(preset, presetPalette('30 20 10'))
    expect(decodeURIComponent(income)).toContain('rgb(10,20,30)')
    expect(decodeURIComponent(expense)).toContain('rgb(30,20,10)')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith('/preview-test.svg')
  })
})
