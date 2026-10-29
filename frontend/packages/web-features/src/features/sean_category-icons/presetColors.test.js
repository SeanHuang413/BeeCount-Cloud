import { afterEach, describe, expect, it, vi } from 'vitest'
import { categoryPresetPalette, colorPresetSvg, presetPalette, presetPreviewSource } from './presetColors'

afterEach(() => vi.unstubAllGlobals())

describe('preset income and expense palettes', () => {
  it('preserves multicolor sources under both income and expense themes', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const preset = { id: 'pastel-test', colorMode: 'multicolor', src: '/pastel.svg', colorSrc: '/pastel.svg', sourceKind: 'svg' }
    for (const rgb of ['200 30 30', '30 180 80']) {
      expect(await presetPreviewSource(preset, presetPalette(rgb))).toBe('/pastel.svg')
    }
    expect(fetchMock).not.toHaveBeenCalled()
  })
  it('reads the selected type from theme variables without assuming red or green', () => {
    vi.stubGlobal('document', { documentElement: {} })
    vi.stubGlobal('getComputedStyle', () => ({ getPropertyValue: name => ({ '--income-rgb': '120 80 240', '--expense-rgb': '30 160 200', '--transfer-rgb': '99 102 190' })[name] || '' }))
    expect(categoryPresetPalette('income').outline).toBe('rgb(120,80,240)')
    expect(categoryPresetPalette('income').badgeKind).toBe('income')
    expect(categoryPresetPalette('expense').outline).toBe('rgb(30,160,200)')
    expect(categoryPresetPalette('expense').badgeKind).toBe('expense')
    expect(categoryPresetPalette('transfer')).toEqual({ ...presetPalette('99 102 190'), badgeKind: 'transfer' })
    expect(categoryPresetPalette('unknown')).toBeUndefined()
  })
  it('adds distinct income and expense badges without recoloring the illustration', async () => {
    const original = '<svg viewBox="0 0 64 64"><path fill="#A9D3F5" stroke="#40566F" d="M10 10h20v20Z"/></svg>'
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => original })
    vi.stubGlobal('fetch', fetchMock)
    const preset = { id: 'badge-test', colorMode: 'multicolor', sourceKind: 'svg', src: '/badge-test.svg', colorSrc: '/unused.svg' }
    const palette = presetPalette('120 80 240')
    const income = decodeURIComponent(await presetPreviewSource(preset, { ...palette, badgeKind: 'income' }))
    const expense = decodeURIComponent(await presetPreviewSource(preset, { ...palette, badgeKind: 'expense' }))
    for (const source of [income, expense]) {
      expect(source).toContain(original.replace('</svg>', ''))
      expect(source).toContain('stroke="rgb(120,80,240)"')
      expect(source).toContain('<circle')
    }
    expect(income).toContain('data-preset-kind="income"')
    expect(income).toContain('M54 50v8')
    expect(expense).toContain('data-preset-kind="expense"')
    expect(expense).not.toContain('M54 50v8')
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock).toHaveBeenCalledWith(preset.src)
  })
  it('keeps all kind markers when theme RGB is missing', () => {
    vi.stubGlobal('document', { documentElement: {} })
    vi.stubGlobal('getComputedStyle', () => ({ getPropertyValue: () => '' }))
    expect(categoryPresetPalette('income').badgeKind).toBe('income')
    expect(categoryPresetPalette('expense').outline).toBe('rgb(64,86,111)')
    expect(categoryPresetPalette('transfer').badgeKind).toBe('transfer')
    expect(categoryPresetPalette('unknown')).toBeUndefined()
  })
  it('uses a double-arrow transfer badge while preserving the artwork', async () => {
    const original = '<svg viewBox="0 0 64 64"><path fill="#AFE3D1"/></svg>'
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => original }))
    const preset = { id: 'transfer-badge-test', colorMode: 'multicolor', src: '/transfer-badge-test.svg', colorSrc: '/transfer-badge-test.svg', sourceKind: 'svg' }
    const source = decodeURIComponent(await presetPreviewSource(preset, { ...presetPalette('99 102 190'), badgeKind: 'transfer' }))
    expect(source).toContain(original.replace('</svg>', ''))
    expect(source).toContain('data-preset-kind="transfer"')
    expect(source).toContain('stroke="rgb(99,102,190)"')
    expect(source).toContain('M49 51h9')
    expect(source).toContain('M58 57h-9')
    expect(source).not.toContain('M50 54h8')
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
