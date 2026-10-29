import { describe, expect, it, vi, afterEach } from 'vitest'
import { CATEGORY_ICON_PRESETS, filterCategoryIconPresets } from './catalog'
import { categoryPresetFile } from './presetFile'
import { readFileSync } from 'node:fs'

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe('category icon presets', () => {
  it('finds shared subjects by the actual category names', () => {
    expect(filterCategoryIconPresets('天然气-2').map(p => p.id)).toEqual(['gas'])
    expect(filterCategoryIconPresets('金鹅下蛋').map(p => p.id)).toEqual(['salary'])
    expect(filterCategoryIconPresets('山姆超市').map(p => p.id)).toEqual(['merchant-sams'])
    expect(filterCategoryIconPresets('淘宝购物').map(p => p.id)).toEqual(['merchant-taobao'])
    expect(filterCategoryIconPresets('京东电商').map(p => p.id)).toEqual(['merchant-jd'])
    expect(filterCategoryIconPresets('沃尔玛超市').map(p => p.id)).toEqual(['merchant-walmart'])
    expect(filterCategoryIconPresets('i茅台').map(p => p.id)).toEqual(['liquor-trade'])
    expect(filterCategoryIconPresets('不存在的分类')).toEqual([])
  })
  it('has distinct preset IDs and only packaged sources', () => {
    expect(new Set(CATEGORY_ICON_PRESETS.map(p => p.id)).size).toBe(141)
    expect(CATEGORY_ICON_PRESETS.every(p => p.src && !p.src.startsWith('https://'))).toBe(true)
  })
  it('provides a dedicated account transfer preset alongside red-envelope transfers', () => {
    expect(filterCategoryIconPresets('账户转账').map(p => p.id)).toEqual(['account-transfer'])
    expect(filterCategoryIconPresets('资金调拨').map(p => p.id)).toEqual(['account-transfer'])
    expect(filterCategoryIconPresets('红包转账').map(p => p.id)).toContain('transfer')
  })
  it('packages the same shopping subjects that are available for independent upload', () => {
    expect(filterCategoryIconPresets('小象超市').map(p => p.id)).toEqual(['merchant-xiaoxiang'])
    expect(filterCategoryIconPresets('叮咚买菜').map(p => p.id)).toEqual(['merchant-dingdong'])
    expect(filterCategoryIconPresets('沙井老店').map(p => p.id)).toEqual(['payment'])
    for (const id of ['merchant-xiaoxiang', 'merchant-dingdong']) {
      expect(filterCategoryIconPresets('精品购物', 'supermarket').map(p => p.id)).toContain(id)
    }
  })
  it('finds the additional expense and reimbursement subjects by their category names', () => {
    const expected = { '飞哥结婚': 'feige-wedding', '喜酒': 'wedding-banquet', '平账': 'balance-adjustment', '鞋子': 'shoes', '衣服': 'everyday-clothes', '包包': 'handbag', '其他报销': 'other-reimbursement', '拼多多': 'merchant-pinduoduo' }
    for (const [name, id] of Object.entries(expected)) {
      expect(filterCategoryIconPresets(name).map(p => p.id)).toEqual([id])
    }
    expect(filterCategoryIconPresets('居家生活').map(p => p.id)).toEqual(['home-living', 'shoes', 'everyday-clothes', 'handbag'])
    expect(filterCategoryIconPresets('人情来往').map(p => p.id)).toContain('wedding-banquet')
    expect(filterCategoryIconPresets('幸福报销').map(p => p.id)).toContain('other-reimbursement')
    expect(filterCategoryIconPresets('精品购物').map(p => p.id)).toContain('merchant-pinduoduo')
  })
  it('ships every multicolor illustration with an editable, self-contained source', () => {
    for (const preset of CATEGORY_ICON_PRESETS) {
      expect(preset.colorMode).toBe('multicolor')
      expect(preset.sourceKind).toBe('svg')
      const svg = readFileSync(new URL(`./assets/pastel-vector-v2/${preset.id}.svg`, import.meta.url), 'utf8')
      expect(svg).toContain('viewBox="0 0 64 64"')
      expect(svg).not.toMatch(/<script|<image|https?:\/\/(?!www.w3.org)/)
    }
  })
  it('separates online stores, supermarkets and convenience stores', () => {
    expect(filterCategoryIconPresets('', 'ecommerce')).toHaveLength(12)
    expect(filterCategoryIconPresets('', 'supermarket')).toHaveLength(16)
    expect(filterCategoryIconPresets('', 'convenience')).toHaveLength(4)
    expect(filterCategoryIconPresets('山姆', 'ecommerce')).toEqual([])
    expect(filterCategoryIconPresets('711', 'convenience').map(p => p.id)).toEqual(['merchant-seven-eleven'])
    expect(filterCategoryIconPresets('jd', 'ecommerce').map(p => p.id)).toEqual(['merchant-jd'])
  })
  it('does not upload an HTTP error page as an icon', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    await expect(categoryPresetFile(CATEGORY_ICON_PRESETS[0])).rejects.toThrow('Unable to load')
  })
  it('rejects empty preset data', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, blob: async () => ({ size: 0 }) }))
    await expect(categoryPresetFile(CATEGORY_ICON_PRESETS[0])).rejects.toThrow('empty')
  })
  it('exports vector presets as 512px PNGs and releases the temporary image URL', async () => {
    const svg = new Blob(['<svg/>'], { type: 'image/svg+xml' })
    const png = new Blob(['encoded png'], { type: 'image/png' })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, blob: async () => svg }))
    vi.stubGlobal('File', class extends Blob { constructor(parts, name, options) { super(parts, options); this.name = name } })
    vi.stubGlobal('Image', class { async decode() {} })
    const drawImage = vi.fn()
    const canvas = { getContext: () => ({ drawImage }), toBlob: callback => callback(png) }
    vi.stubGlobal('document', { createElement: () => canvas })
    const revoke = vi.spyOn(URL, 'revokeObjectURL')
    const file = await categoryPresetFile(CATEGORY_ICON_PRESETS.find(p => p.id === 'gas'))
    expect(file.name).toBe('gas.png')
    expect(file.type).toBe('image/png')
    expect(canvas.width).toBe(512)
    expect(canvas.height).toBe(512)
    expect(drawImage.mock.calls[0].slice(1)).toEqual([0, 0, 512, 512])
    expect(revoke).toHaveBeenCalledOnce()
  })
  it('releases the temporary image URL when SVG decoding fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, blob: async () => new Blob(['svg']) }))
    vi.stubGlobal('Image', class { async decode() { throw new Error('decode failed') } })
    const revoke = vi.spyOn(URL, 'revokeObjectURL')
    await expect(categoryPresetFile(CATEGORY_ICON_PRESETS.find(p => p.id === 'gas'))).rejects.toThrow('decode failed')
    expect(revoke).toHaveBeenCalledOnce()
  })
  it('uses the colored vector source when exporting a PNG preset in income colors', async () => {
    const preset = { id: 'colored-png-test', src: '/original.png', colorSrc: '/colored-png-test.svg', sourceKind: 'png' }
    const fetchMock = vi.fn(async url => url === preset.colorSrc
      ? { ok: true, text: async () => '<svg stroke="#496A88" fill="#C7DAE8"/>' }
      : { ok: true, blob: async () => new Blob(['svg'], { type: 'image/svg+xml' }) })
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('File', class extends Blob { constructor(parts, name, options) { super(parts, options); this.name = name } })
    vi.stubGlobal('Image', class { async decode() {} })
    const drawImage = vi.fn()
    vi.stubGlobal('document', { createElement: () => ({ getContext: () => ({ drawImage }), toBlob: callback => callback(new Blob(['png'])) }) })
    const result = await categoryPresetFile(preset, { outline: 'rgb(120,80,240)', fill: 'rgb(225,217,252)' })
    expect(result.type).toBe('image/png')
    expect(result.name).toBe('colored-png-test.png')
    expect(fetchMock.mock.calls[0][0]).toBe(preset.colorSrc)
    expect(decodeURIComponent(fetchMock.mock.calls[1][0])).toContain('rgb(120,80,240)')
    expect(drawImage).toHaveBeenCalledOnce()
  })
  it.each(['expense', 'transfer'])('exports the same marked multicolor source shown for %s', async (kind) => {
    const preset = { id: `marked-${kind}-test`, colorMode: 'multicolor', sourceKind: 'svg', src: `/marked-${kind}-test.svg`, colorSrc: `/marked-${kind}-test.svg` }
    const fetchMock = vi.fn(async url => url === preset.src
      ? { ok: true, text: async () => '<svg viewBox="0 0 64 64"><path fill="#A9D3F5"/></svg>' }
      : { ok: true, blob: async () => new Blob(['marked svg'], { type: 'image/svg+xml' }) })
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('File', class extends Blob { constructor(parts, name, options) { super(parts, options); this.name = name } })
    vi.stubGlobal('Image', class { async decode() {} })
    const drawImage = vi.fn()
    const canvas = { getContext: () => ({ drawImage }), toBlob: callback => callback(new Blob(['png'])) }
    vi.stubGlobal('document', { createElement: () => canvas })
    const file = await categoryPresetFile(preset, { outline: 'rgb(30,160,200)', fill: 'rgb(206,234,243)', badgeKind: kind })
    expect(file.name).toBe(`${preset.id}.png`)
    const source = decodeURIComponent(fetchMock.mock.calls[1][0])
    expect(source).toContain(`data-preset-kind="${kind}"`)
    expect(source).toContain('fill="#A9D3F5"')
    expect(canvas.width).toBe(512)
    expect(drawImage).toHaveBeenCalledOnce()
  })
})
