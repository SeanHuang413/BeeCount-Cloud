import { describe, expect, it } from 'vitest'
import { buildFilteredAssetSummary } from './filteredAssetSummary'
import { buildSeanAssetCenterSummary } from './assetCenter'

const account = (name, balance, account_type = 'bank_card', currency = 'CNY') => ({
  id: name, name, balance, account_type, currency, initial_balance: 0, last_change_id: 1,
})
const build = (rows, base = 'CNY', rates = null) => buildFilteredAssetSummary(rows, base, rates, [])

describe('asset overview excluding social protection and insurance', () => {
  it('excludes the two groups and retains valuations, hidden accounts and signed liabilities', () => {
    const rows = [account('社保', 300, 'social_fund'), account('保险', 200, 'insurance'),
      { ...account('隐藏储蓄卡', 1000), hidden: true }, account('房产', 4000, 'real_estate'),
      account('车辆', 500, 'vehicle'), account('投资', 800, 'investment'),
      account('信用卡', -120, 'credit_card'), account('溢缴信用卡', 20, 'credit_card'),
      account('贷款', -1000, 'loan')]
    const result = build(rows)
    expect(result.summary.converted).toMatchObject({ assetTotal: 6300, liabilityTotal: -1100, netWorth: 5200 })
    expect(result.excluded.map((item) => item.summary.converted.assetTotal)).toEqual([300, 200])
    const complete = buildSeanAssetCenterSummary(rows, 'CNY', null, [])
    expect(complete.converted.netWorth - result.summary.converted.netWorth).toBe(500)
    expect(rows[0].account_type).toBe('social_fund')
  })

  it('prefers official types and falls back to the existing display classifier', () => {
    const result = build([account('社保工资卡', 100, 'bank_card'), account('医保账户', 30, null),
      account('公积金', 50, null), account('商业保险', 20, null), account('未知账户', 10, null)])
    expect(result.summary.assets.map((row) => row.name)).toEqual(['社保工资卡', '未知账户'])
    expect(result.summary.unknownTypeAccounts).toHaveLength(1)
    expect(result.excluded.map((item) => item.summary.converted.assetTotal)).toEqual([80, 20])
  })

  it('keeps currencies separate and flags missing exchange rates', () => {
    const rows = [account('现金', 100), account('美元投资', 10, 'investment', 'USD'), account('美元保险', 20, 'insurance', 'USD')]
    expect(build(rows, '').summary.converted).toBeNull()
    expect(build(rows, '').summary.buckets).toHaveLength(2)
    const missing = build(rows)
    expect(missing.summary.converted).toMatchObject({ netWorth: 100, missingCurrencies: ['USD'] })
    expect(missing.excluded[1].summary.buckets[0]).toMatchObject({ currency: 'USD', assetTotal: 20 })
    const rates = { base: 'CNY', rates: { USD: '0.125' } }
    expect(build(rows, 'CNY', rates).summary.converted.netWorth).toBe(180)
  })

  it('handles empty and fully excluded account sets', () => {
    expect(build([]).summary.buckets).toEqual([])
    const result = build([account('社保', 300, 'social_fund'), account('保险', 200, 'insurance')])
    expect(result.summary.buckets).toEqual([])
    expect(result.summary.assets).toEqual([])
    expect(result.excluded.map((item) => item.summary.converted.netWorth)).toEqual([300, 200])
  })
})
