import { describe, expect, it } from 'vitest'
import { buildSeanAssetTrendRows } from './assetTrend'

describe('buildSeanAssetTrendRows', () => {
  it('places the latest month first and calculates monthly changes', () => {
    const rows = buildSeanAssetTrendRows({ multi_currency: false, series: [
      { bucket: '2026-06', net_worth: 80, assets: 100, liabilities: -20 },
      { bucket: '2026-07', net_worth: 100, assets: 140, liabilities: -40 },
    ] })
    expect(rows.map((row) => row.bucket)).toEqual(['2026-07', '2026-06'])
    expect(rows[0]).toMatchObject({ netWorthChange: 20, assetsChange: 40, liabilitiesChange: 20 })
    expect(rows[1].netWorthChange).toBeNull()
  })
})
